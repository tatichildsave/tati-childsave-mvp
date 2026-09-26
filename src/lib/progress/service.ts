// The TATI Progress Service.
// Every dashboard, journey map and summary reads progress through this module,
// so there is exactly one source of truth. Progress is persisted to the backend
// (journey_progress) and cached by React Query, so a browser refresh re-reads
// the saved rows instead of resetting anything.

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTrack } from "@/lib/learning/track";
import type { ProgressEvent } from "@/lib/learning/progress";
import { useChild } from "@/lib/learning/progress";
import { computeProgressSnapshot, type ProgressSnapshot } from "./snapshot";

export type { ProgressSnapshot, ItemProgress } from "./snapshot";

export const progressKey = (childId: string) => ["progress", childId] as const;
const pendingKey = (childId: string) => `tati.pending-progress.${childId}`;
const syncingChildren = new Set<string>();

function readPending(childId: string): ProgressEvent[] {
  try {
    const raw = localStorage.getItem(pendingKey(childId));
    return raw ? (JSON.parse(raw) as ProgressEvent[]) : [];
  } catch {
    return [];
  }
}

function writePending(childId: string, events: ProgressEvent[]) {
  try {
    localStorage.setItem(pendingKey(childId), JSON.stringify(events));
  } catch {
    /* storage unavailable; the current optimistic state still remains visible */
  }
}

async function syncPending(childId: string, events: ProgressEvent[]) {
  if (syncingChildren.has(childId)) return;
  syncingChildren.add(childId);
  const remaining: ProgressEvent[] = [];
  try {
    for (const event of events) {
      const { error } = await supabase.from("journey_progress").upsert(
        {
          child_profile_id: event.child_profile_id,
          track_id: event.track_id,
          item_type: event.item_type,
          item_id: event.item_id,
          status: event.status,
          score: event.score,
          max_score: event.max_score,
          details: event.details as never,
          updated_at: event.updated_at,
        },
        { onConflict: "child_profile_id,item_type,item_id" },
      );
      if (error) remaining.push(event);
    }
    if (remaining.length === 0) {
      try {
        localStorage.removeItem(pendingKey(childId));
      } catch {
        /* ignore storage cleanup failures */
      }
    } else {
      writePending(childId, remaining);
    }
  } finally {
    syncingChildren.delete(childId);
  }
}

export function progressQuery(childId: string) {
  return {
    queryKey: progressKey(childId),
    queryFn: async (): Promise<ProgressEvent[]> => {
      const pending = readPending(childId);
      const { data, error } = await supabase
        .from("journey_progress")
        .select("*")
        .eq("child_profile_id", childId);
      if (error) return pending;
      if (pending.length > 0) void syncPending(childId, pending);
      const serverEvents = (data ?? []) as unknown as ProgressEvent[];
      const pendingKeys = new Set(pending.map((event) => `${event.item_type}:${event.item_id}`));
      return [
        ...serverEvents.filter((event) => !pendingKeys.has(`${event.item_type}:${event.item_id}`)),
        ...pending,
      ];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  };
}

export function prefetchProgress(qc: QueryClient, childId: string) {
  return qc.prefetchQuery(progressQuery(childId));
}

export interface RecordProgressInput {
  childId: string;
  itemType: "assessment" | "lesson" | "scenario" | "reflection";
  itemId: string;
  score?: number;
  maxScore?: number;
  details?: Record<string, unknown>;
}

function optimisticEvent(input: RecordProgressInput): ProgressEvent {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${input.itemType}-${input.itemId}`,
    child_profile_id: input.childId,
    track_id: "save",
    item_type: input.itemType,
    item_id: input.itemId,
    status: "completed",
    score: input.score ?? null,
    max_score: input.maxScore ?? null,
    details: input.details ?? {},
    created_at: now,
    updated_at: now,
  };
}

/**
 * Records a completed stop. The cache is updated optimistically so XP, badges
 * and the journey map move immediately, then reconciled with the backend.
 */
export function useRecordProgress() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordProgressInput) => {
      const event = optimisticEvent(input);
      const { error } = await supabase.from("journey_progress").upsert(
        {
          child_profile_id: input.childId,
          track_id: "save",
          item_type: input.itemType,
          item_id: input.itemId,
          status: "completed",
          score: input.score ?? null,
          max_score: input.maxScore ?? null,
          details: (input.details ?? {}) as never,
          updated_at: event.updated_at,
        },
        { onConflict: "child_profile_id,item_type,item_id" },
      );
      if (error) {
        const pending = readPending(input.childId).filter(
          (item) => !(item.item_type === event.item_type && item.item_id === event.item_id),
        );
        writePending(input.childId, [...pending, event]);
      }
    },
    onMutate: async (input) => {
      const key = progressKey(input.childId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ProgressEvent[]>(key);
      const next = optimisticEvent(input);
      qc.setQueryData<ProgressEvent[]>(key, (old) => {
        const list = old ?? [];
        const existing = list.find(
          (e) => e.item_type === next.item_type && e.item_id === next.item_id,
        );
        if (!existing) return [...list, next];
        return list.map((e) =>
          e === existing
            ? { ...existing, ...next, id: existing.id, created_at: existing.created_at }
            : e,
        );
      });
      return { previous, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: (_d, _e, input) => {
      qc.invalidateQueries({ queryKey: progressKey(input.childId) });
    },
  });
}

export interface ChildProgressResult extends ProgressSnapshot {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** The one hook every screen uses to read a learner's progress. */
export function useChildProgress(childId: string, trackId = "save"): ChildProgressResult {
  const track = getTrack(trackId);
  const { child } = useChild(childId);
  const { data, isLoading, isError, refetch } = useQuery(progressQuery(childId));

  const snapshot = useMemo(
    () => computeProgressSnapshot(track, data, childId, child?.name ?? "Your child"),
    [track, data, childId, child?.name],
  );

  return { ...snapshot, isLoading, isError, refetch: () => void refetch() };
}
