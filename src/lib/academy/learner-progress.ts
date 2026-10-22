/**
 * Facilitator learner progress — pure logic (no Firestore access).
 *
 * Uses the same shared calculation as the Parent Dashboard (computeProgressSnapshot)
 * so facilitators and parents always see the same numbers for a learner.
 */

import type { ProgressEvent } from "@/lib/learning/progress";
import { getTrack, itemTitle } from "@/lib/learning/track";
import { computeProgressSnapshot } from "@/lib/progress/snapshot";

export type SupportSignal = "on-track" | "not-started" | "needs-support" | "inactive" | "unknown";

/** A journeyProgress record as read from Firestore by the facilitator data layer. */
export interface FirestoreProgressEvent {
  id: string;
  kind: string;
  itemId: string;
  status: string;
  /** When the step was recorded. Null when the stored value is missing or unreadable. */
  completedAt: Date | null;
}

export interface LearnerIdentity {
  id: string;
  name: string;
  avatar: string;
}

export interface ChildProgressSummary {
  childId: string;
  childName: string;
  avatar: string;
  /** Item id of a step the learner has open but not finished (rare for journey steps). */
  currentActivityId?: string;
  /** Title of that open step. */
  currentActivityName?: string;
  currentActivityType?: "lesson" | "scenario" | "assessment" | "reflection";
  /** The learner's next step on the SAVE journey (what they will do next). */
  nextActivityId?: string;
  nextActivityTitle?: string;
  nextActivityNumber?: number;
  journeyProgress: {
    completed: number;
    total: number;
  };
  /** Rounded 0–100. */
  percentComplete: number;
  journeyComplete: boolean;
  /** Most recent reliable activity time; undefined when none can be determined. */
  lastActivityAt?: Date;
  supportSignal: SupportSignal;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days without activity before a started learner is shown as "Low activity". */
export const INACTIVE_AFTER_DAYS = 7;
/** Days without activity before an early-stage learner may need support. */
export const NEEDS_SUPPORT_AFTER_DAYS = 2;
/** Below this completion percentage a learner counts as early-stage. */
export const EARLY_STAGE_PERCENT = 30;

/**
 * Convert a Firestore value to a valid Date.
 * Handles Firestore Timestamps (client and Admin SDK), serialized {seconds}/{_seconds},
 * Dates, ISO strings and epoch milliseconds. Returns null for anything unreadable,
 * so callers never receive an "Invalid Date".
 */
export function toValidDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v["toDate"] === "function") {
      date = (v["toDate"] as () => Date).call(value);
    } else if (typeof v["seconds"] === "number") {
      date = new Date((v["seconds"] as number) * 1000 + Math.floor(((v["nanoseconds"] as number) ?? 0) / 1e6));
    } else if (typeof v["_seconds"] === "number") {
      date = new Date((v["_seconds"] as number) * 1000);
    }
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  }

  return date && !Number.isNaN(date.getTime()) ? date : null;
}

/** Map facilitator-layer records onto the shared ProgressEvent shape. Only completed steps count. */
export function toSharedProgressEvents(childId: string, events: FirestoreProgressEvent[]): ProgressEvent[] {
  return events
    .filter((e) => e.status === "completed" && e.kind && e.itemId)
    .map((e) => {
      const iso = e.completedAt ? e.completedAt.toISOString() : "";
      return {
        id: e.id,
        child_profile_id: childId,
        track_id: "save",
        item_type: e.kind,
        item_id: e.itemId,
        status: e.status,
        score: null,
        max_score: null,
        details: {},
        created_at: iso,
        updated_at: iso,
      };
    });
}

/**
 * Support signal — documented, deterministic rules. Neutral language; never a judgement.
 *
 * 1. "not-started"  — no SAVE journey steps completed yet.
 * 2. "on-track"     — journey complete.
 * 3. "unknown"      — steps completed but no reliable activity date exists.
 *                     A learner is NEVER flagged because a timestamp is missing.
 * 4. "inactive"     — no recorded activity for more than INACTIVE_AFTER_DAYS (shown as "Low activity").
 * 5. "needs-support"— below EARLY_STAGE_PERCENT complete and no activity for more than
 *                     NEEDS_SUPPORT_AFTER_DAYS (shown as "May need support").
 * 6. "on-track"     — everything else.
 */
export function deriveSupportSignal(input: {
  completed: number;
  total: number;
  journeyComplete: boolean;
  lastActivityAt: Date | undefined;
  now?: Date;
}): SupportSignal {
  if (input.completed === 0) return "not-started";
  if (input.journeyComplete) return "on-track";
  if (!input.lastActivityAt) return "unknown";

  const now = input.now ?? new Date();
  const daysSince = (now.getTime() - input.lastActivityAt.getTime()) / DAY_MS;
  const percent = input.total ? (input.completed / input.total) * 100 : 0;

  if (daysSince > INACTIVE_AFTER_DAYS) return "inactive";
  if (percent < EARLY_STAGE_PERCENT && daysSince > NEEDS_SUPPORT_AFTER_DAYS) return "needs-support";
  return "on-track";
}

/** Signals that should appear in "Learners needing support". */
export function needsAttention(signal: SupportSignal): boolean {
  return signal === "needs-support" || signal === "inactive";
}

/**
 * Build a facilitator progress summary from stored journey records using the shared
 * SAVE-track calculation (24 activities), real activity titles and reliable dates.
 */
export function computeChildProgressSummary(
  child: LearnerIdentity,
  progressEvents: FirestoreProgressEvent[],
  now: Date = new Date(),
): ChildProgressSummary {
  const track = getTrack("save");
  const shared = toSharedProgressEvents(child.id, progressEvents);
  const snapshot = computeProgressSnapshot(track, shared, child.id, child.name, now);

  const total = snapshot.steps.length;
  const completed = snapshot.steps.filter((s) => s.done).length;

  const dated = progressEvents.map((e) => e.completedAt).filter((d): d is Date => !!d);
  const lastActivityAt = dated.length ? new Date(Math.max(...dated.map((d) => d.getTime()))) : undefined;

  const open = progressEvents.find((e) => e.status !== "completed" && e.itemId);
  const openItem = open ? track.sequence.find((i) => i.id === open.itemId) : undefined;
  const next = snapshot.currentItem;
  const nextIndex = next ? track.sequence.indexOf(next) : -1;

  return {
    childId: child.id,
    childName: child.name,
    avatar: child.avatar,
    ...(open ? { currentActivityId: open.itemId } : {}),
    ...(open ? { currentActivityName: openItem ? itemTitle(track, openItem) : open.itemId } : {}),
    ...(openItem ? { currentActivityType: openItem.kind } : {}),
    ...(next ? { nextActivityId: next.id, nextActivityTitle: itemTitle(track, next), nextActivityNumber: nextIndex + 1 } : {}),
    journeyProgress: { completed, total },
    percentComplete: total ? Math.round((completed / total) * 100) : 0,
    journeyComplete: snapshot.journey.complete,
    ...(lastActivityAt ? { lastActivityAt } : {}),
    supportSignal: deriveSupportSignal({
      completed,
      total,
      journeyComplete: snapshot.journey.complete,
      lastActivityAt,
      now,
    }),
  };
}
