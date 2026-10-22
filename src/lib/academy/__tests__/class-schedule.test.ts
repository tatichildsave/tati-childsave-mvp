/**
 * Class schedule model (Stage C): validation, date handling and dashboard/schedule views.
 */

import { describe, expect, it } from "vitest";
import {
  classActivityOptions,
  combineLocalDateTime,
  localDayKey,
  nextClassToday,
  pastClasses,
  upcomingClasses,
  validateClassDraft,
  type AcademyClass,
  type ClassDraft,
} from "../class-schedule";
import { getTrack } from "@/lib/learning/track";

const COHORTS = new Set(["cohort-a"]);
const NOW = new Date(2030, 5, 10, 9, 0, 0); // 10 June 2030, 09:00 local
const FIRST_ACTIVITY = getTrack("save").sequence[0]!.id;

function draft(overrides: Partial<ClassDraft> = {}): ClassDraft {
  return {
    cohortId: "cohort-a",
    activityId: FIRST_ACTIVITY,
    date: "2030-06-12",
    time: "14:30",
    durationMinutes: 60,
    deliveryMode: "in-person",
    location: "Community hall",
    ...overrides,
  };
}

function classAt(id: string, when: Date, overrides: Partial<AcademyClass> = {}): AcademyClass {
  return {
    id,
    cohortId: "cohort-a",
    facilitatorUid: "fac-1",
    activityId: FIRST_ACTIVITY,
    scheduledAt: when,
    durationMinutes: 60,
    deliveryMode: "in-person",
    location: "Community hall",
    status: "scheduled",
    ...overrides,
  };
}

describe("class schedule validation", () => {
  it("accepts a valid draft and returns the combined local date", () => {
    const { errors, scheduledAt } = validateClassDraft(draft(), NOW, COHORTS);
    expect(errors).toEqual({});
    expect(scheduledAt?.getFullYear()).toBe(2030);
    expect(scheduledAt?.getHours()).toBe(14);
    expect(scheduledAt?.getMinutes()).toBe(30);
  });

  it("rejects a cohort the facilitator does not own", () => {
    const { errors, scheduledAt } = validateClassDraft(draft({ cohortId: "other" }), NOW, COHORTS);
    expect(errors.cohortId).toBeDefined();
    expect(scheduledAt).toBeNull();
  });

  it("rejects an unknown activity", () => {
    const { errors } = validateClassDraft(draft({ activityId: "not-real" }), NOW, COHORTS);
    expect(errors.activityId).toBeDefined();
  });

  it("rejects a time in the past", () => {
    const { errors } = validateClassDraft(draft({ date: "2030-06-10", time: "08:00" }), NOW, COHORTS);
    expect(errors.date).toMatch(/future/);
  });

  it("rejects impossible calendar dates such as 31 February", () => {
    expect(combineLocalDateTime("2030-02-31", "10:00")).toBeNull();
    const { errors } = validateClassDraft(draft({ date: "2030-02-31" }), NOW, COHORTS);
    expect(errors.date).toBeDefined();
  });

  it("requires a location and trims whitespace", () => {
    expect(validateClassDraft(draft({ location: "   " }), NOW, COHORTS).errors.location).toBeDefined();
    const ok = validateClassDraft(draft({ location: "  Hall  " }), NOW, COHORTS);
    expect(ok.errors.location).toBeUndefined();
  });

  it("rejects durations outside the allowed options", () => {
    const { errors } = validateClassDraft(draft({ durationMinutes: 500 }), NOW, COHORTS);
    expect(errors.durationMinutes).toBeDefined();
  });

  it("rejects an unknown delivery mode", () => {
    const { errors } = validateClassDraft(
      draft({ deliveryMode: "hybrid" as unknown as "virtual" }),
      NOW,
      COHORTS,
    );
    expect(errors.deliveryMode).toBeDefined();
  });

  it("exposes all 24 SAVE activities as options", () => {
    expect(classActivityOptions()).toHaveLength(24);
    expect(classActivityOptions()[0]?.label.startsWith("Activity 1:")).toBe(true);
  });
});

describe("class schedule views", () => {
  const today1 = classAt("today-early", new Date(2030, 5, 10, 8, 0));
  const todayLater = classAt("today-later", new Date(2030, 5, 10, 15, 0));
  const inProgress = classAt("in-progress", new Date(2030, 5, 10, 8, 30), { durationMinutes: 120 });
  const tomorrow = classAt("tomorrow", new Date(2030, 5, 11, 10, 0));
  const cancelledLater = classAt("cancelled", new Date(2030, 5, 10, 16, 0), { status: "cancelled" });
  const yesterday = classAt("yesterday", new Date(2030, 5, 9, 10, 0));
  const all = [todayLater, tomorrow, today1, yesterday, cancelledLater, inProgress];

  it("uses the local day key", () => {
    expect(localDayKey(NOW)).toBe("2030-06-10");
  });

  it("returns the first class today that has not yet ended, ignoring cancelled ones", () => {
    // today1 ends at 09:00 which equals NOW, so it still counts; inProgress overlaps and starts earlier
    expect(nextClassToday(all, NOW)?.id).toBe("today-early");
    const later = new Date(2030, 5, 10, 10, 0);
    expect(nextClassToday(all, later)?.id).toBe("in-progress");
  });

  it("returns null when nothing is left today", () => {
    const evening = new Date(2030, 5, 10, 23, 0);
    expect(nextClassToday(all, evening)).toBeNull();
  });

  it("lists upcoming scheduled classes soonest first, excluding the one shown today", () => {
    const upcoming = upcomingClasses(all, NOW, { exclude: todayLater, limit: 5 });
    expect(upcoming.map((c) => c.id)).toEqual(["tomorrow"]);
    expect(upcomingClasses(all, NOW).map((c) => c.id)).toEqual(["today-later", "tomorrow"]);
  });

  it("lists past and cancelled classes, most recent first", () => {
    const past = pastClasses(all, NOW);
    expect(past.map((c) => c.id)).toEqual(["cancelled", "yesterday"]);
  });
});
