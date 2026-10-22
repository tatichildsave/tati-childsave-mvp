/**
 * TATI Academy class schedule model.
 *
 * Pure helpers (no Firebase imports) for validating class drafts and deriving
 * "today", "upcoming" and "past" views. Firestore access lives in class-data.ts.
 */

import { getTrack, itemTitle } from "@/lib/learning/track";

export type AcademyClassDeliveryMode = "in-person" | "virtual";
export type AcademyClassStatus = "scheduled" | "cancelled";

export interface AcademyClass {
  id: string;
  cohortId: string;
  facilitatorUid: string;
  activityId: string;
  scheduledAt: Date;
  durationMinutes: number;
  deliveryMode: AcademyClassDeliveryMode;
  location: string;
  status: AcademyClassStatus;
}

export interface ClassDraft {
  cohortId: string;
  activityId: string;
  date: string; // YYYY-MM-DD (local)
  time: string; // HH:MM (local, 24-hour)
  durationMinutes: number;
  deliveryMode: AcademyClassDeliveryMode;
  location: string;
}

export type ClassDraftErrors = Partial<Record<keyof ClassDraft, string>>;

export const CLASS_DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;
export const CLASS_LOCATION_MAX = 200;
export const CLASS_DELIVERY_OPTIONS: { value: AcademyClassDeliveryMode; label: string }[] = [
  { value: "in-person", label: "In person" },
  { value: "virtual", label: "Virtual" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const track = getTrack("save");

export function classActivityOptions() {
  return track.sequence.map((item, index) => ({
    id: item.id,
    label: `Activity ${index + 1}: ${itemTitle(track, item)}`,
  }));
}

/** Combine a local YYYY-MM-DD date and HH:MM time into a Date. Returns null if invalid. */
export function combineLocalDateTime(date: string, time: string): Date | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const value = new Date(y, m - 1, d, hh, mm, 0, 0);
  // Reject dates that roll over (e.g. 2025-02-31).
  if (value.getFullYear() !== y || value.getMonth() !== m - 1 || value.getDate() !== d) return null;
  return value;
}

export function validateClassDraft(
  draft: ClassDraft,
  now: Date,
  cohortIds: ReadonlySet<string>,
): { errors: ClassDraftErrors; scheduledAt: Date | null } {
  const errors: ClassDraftErrors = {};

  if (!draft.cohortId || !cohortIds.has(draft.cohortId)) {
    errors.cohortId = "Choose one of your active cohorts.";
  }
  if (!track.sequence.some((item) => item.id === draft.activityId)) {
    errors.activityId = "Choose an activity from the SAVE journey.";
  }

  const scheduledAt = combineLocalDateTime(draft.date, draft.time);
  if (!draft.date) {
    errors.date = "Choose a date.";
  } else if (!scheduledAt) {
    errors.date = "Enter a valid date.";
  } else if (scheduledAt.getTime() < now.getTime()) {
    errors.date = "Choose a date and time in the future.";
  }
  if (!draft.time) {
    errors.time = "Choose a start time.";
  } else if (!TIME_RE.test(draft.time)) {
    errors.time = "Enter a valid time.";
  }

  if (!(CLASS_DURATION_OPTIONS as readonly number[]).includes(draft.durationMinutes)) {
    errors.durationMinutes = "Choose a duration.";
  }
  if (!CLASS_DELIVERY_OPTIONS.some((o) => o.value === draft.deliveryMode)) {
    errors.deliveryMode = "Choose in person or virtual.";
  }

  const location = draft.location.trim();
  if (!location) {
    errors.location = draft.deliveryMode === "virtual" ? "Add a meeting link or details." : "Add a venue.";
  } else if (location.length > CLASS_LOCATION_MAX) {
    errors.location = `Keep this under ${CLASS_LOCATION_MAX} characters.`;
  }

  const valid = Object.keys(errors).length === 0 && scheduledAt !== null;
  return { errors, scheduledAt: valid ? scheduledAt : null };
}

/** Local date key (YYYY-MM-DD) for a Date, used to compare calendar days. */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function classEndMs(c: AcademyClass) {
  return c.scheduledAt.getTime() + c.durationMinutes * 60 * 1000;
}

/**
 * The next scheduled class happening today that has not yet ended.
 * Cancelled classes are ignored.
 */
export function nextClassToday(classes: AcademyClass[], now: Date): AcademyClass | null {
  const today = localDayKey(now);
  return (
    classes
      .filter(
        (c) =>
          c.status === "scheduled" &&
          localDayKey(c.scheduledAt) === today &&
          classEndMs(c) >= now.getTime(),
      )
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null
  );
}

/** Scheduled classes starting after now, soonest first, excluding `exclude` (e.g. today's class). */
export function upcomingClasses(
  classes: AcademyClass[],
  now: Date,
  options: { exclude?: AcademyClass | null; limit?: number } = {},
): AcademyClass[] {
  const { exclude = null, limit = Number.POSITIVE_INFINITY } = options;
  return classes
    .filter((c) => c.status === "scheduled" && c.scheduledAt.getTime() > now.getTime() && c.id !== exclude?.id)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, limit);
}

/** Classes that have ended, or were cancelled, most recent first. */
export function pastClasses(classes: AcademyClass[], now: Date, limit = Number.POSITIVE_INFINITY): AcademyClass[] {
  return classes
    .filter((c) => c.status === "cancelled" || classEndMs(c) < now.getTime())
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
    .slice(0, limit);
}
