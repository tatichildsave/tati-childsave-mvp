import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  childProfilesQuery,
  useChildProfiles,
  useCreateChildProfile,
  type ChildProfile,
} from "@/lib/family";

export interface ProgressEvent {
  id: string;
  child_profile_id: string;
  track_id: string;
  item_type: string;
  item_id: string;
  status: string;
  score: number | null;
  max_score: number | null;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type Child = ChildProfile;

export { childProfilesQuery as childrenQuery };

export function progressQuery(childId: string) {
  return {
    queryKey: ["progress", childId],
    queryFn: async (): Promise<ProgressEvent[]> => {
      const { data, error } = await supabase
        .from("journey_progress")
        .select("*")
        .eq("child_profile_id", childId);
      if (error) throw error;
      return (data ?? []) as unknown as ProgressEvent[];
    },
  };
}

export function useChildren() {
  return useChildProfiles();
}

export function useChild(childId: string) {
  const q = useChildren();
  return { ...q, child: q.data?.find((c) => c.id === childId) };
}

export function useProgress(childId: string) {
  return useQuery(progressQuery(childId));
}

// Recording progress lives in the Progress Service: @/lib/progress/service

/** Kept for the existing parent dashboard: adds a learner to the signed-in parent's family. */
export function useAddChild() {
  return useCreateChildProfile();
}

export function isDone(events: ProgressEvent[] | undefined, itemType: string, itemId: string) {
  return !!events?.some((e) => e.item_type === itemType && e.item_id === itemId);
}

export function findEvent(events: ProgressEvent[] | undefined, itemType: string, itemId: string) {
  return events?.find((e) => e.item_type === itemType && e.item_id === itemId);
}
