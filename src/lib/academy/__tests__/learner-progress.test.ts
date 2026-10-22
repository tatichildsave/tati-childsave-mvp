/**
 * Facilitator learner progress — corrected calculations (Stage A).
 * Covers: 24-activity SAVE journey, Firestore Timestamp conversion, activity titles,
 * and support signals that never flag a learner because a timestamp is missing.
 */

import { describe, expect, it } from "vitest";
import { getTrack, itemTitle } from "@/lib/learning/track";
import {
  computeChildProgressSummary,
  deriveSupportSignal,
  needsAttention,
  toValidDate,
  type FirestoreProgressEvent,
} from "../learner-progress";
import { getActivityStatus } from "../activity-status";

const track = getTrack("save");
const NOW = new Date("2026-10-22T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
const child = { id: "child-1", name: "Test Learner", avatar: "kojo" };

function done(count: number, at: Date | null): FirestoreProgressEvent[] {
  return track.sequence.slice(0, count).map((item) => ({
    id: `${item.kind}:${item.id}`,
    kind: item.kind,
    itemId: item.id,
    status: "completed",
    completedAt: at,
  }));
}

describe("toValidDate", () => {
  it("converts Firestore Timestamp-like objects via toDate()", () => {
    const ts = { toDate: () => new Date("2026-10-20T10:00:00Z"), seconds: 0, nanoseconds: 0 };
    expect(toValidDate(ts)?.toISOString()).toBe("2026-10-20T10:00:00.000Z");
  });

  it("converts serialized {seconds} and {_seconds} timestamps", () => {
    expect(toValidDate({ seconds: 1_790_000_000, nanoseconds: 0 })?.getTime()).toBe(1_790_000_000_000);
    expect(toValidDate({ _seconds: 1_790_000_000 })?.getTime()).toBe(1_790_000_000_000);
  });

  it("returns null instead of an Invalid Date", () => {
    expect(toValidDate(undefined)).toBeNull();
    expect(toValidDate("not a date")).toBeNull();
    expect(toValidDate({ unrelated: true })).toBeNull();
  });
});

describe("computeChildProgressSummary", () => {
  it("uses the 24-activity SAVE journey, not a hardcoded 14", () => {
    const summary = computeChildProgressSummary(child, done(6, daysAgo(1)), NOW);
    expect(track.sequence.length).toBe(24);
    expect(summary.journeyProgress).toEqual({ completed: 6, total: 24 });
    expect(summary.percentComplete).toBe(25);
  });

  it("resolves the next activity title from the track", () => {
    const summary = computeChildProgressSummary(child, done(4, daysAgo(1)), NOW);
    const expected = track.sequence[4]!;
    expect(summary.nextActivityId).toBe(expected.id);
    expect(summary.nextActivityTitle).toBe(itemTitle(track, expected));
    expect(summary.nextActivityTitle).not.toBe(expected.id);
    expect(summary.nextActivityNumber).toBe(5);
  });

  it("ignores non-completed records when counting progress", () => {
    const events = [...done(2, daysAgo(1)), { id: "x", kind: "lesson", itemId: track.sequence[5]!.id, status: "in_progress", completedAt: daysAgo(1) }];
    expect(computeChildProgressSummary(child, events, NOW).journeyProgress.completed).toBe(2);
  });

  it("uses the most recent valid date as last activity", () => {
    const events = [...done(1, daysAgo(5)), ...done(2, daysAgo(1)).slice(1)];
    expect(computeChildProgressSummary(child, events, NOW).lastActivityAt?.getTime()).toBe(daysAgo(1).getTime());
  });
});

describe("support signals", () => {
  it("does not flag a learner when the activity timestamp is missing", () => {
    const summary = computeChildProgressSummary(child, done(3, null), NOW);
    expect(summary.lastActivityAt).toBeUndefined();
    expect(summary.supportSignal).toBe("unknown");
    expect(needsAttention(summary.supportSignal)).toBe(false);
  });

  it("follows the documented rules", () => {
    const base = { total: 24, journeyComplete: false, now: NOW };
    expect(deriveSupportSignal({ ...base, completed: 0, lastActivityAt: undefined })).toBe("not-started");
    expect(deriveSupportSignal({ ...base, completed: 24, journeyComplete: true, lastActivityAt: daysAgo(30) })).toBe("on-track");
    expect(deriveSupportSignal({ ...base, completed: 3, lastActivityAt: daysAgo(1) })).toBe("on-track");
    expect(deriveSupportSignal({ ...base, completed: 3, lastActivityAt: daysAgo(3) })).toBe("needs-support");
    expect(deriveSupportSignal({ ...base, completed: 12, lastActivityAt: daysAgo(3) })).toBe("on-track");
    expect(deriveSupportSignal({ ...base, completed: 12, lastActivityAt: daysAgo(8) })).toBe("inactive");
  });

  it("lists only needs-support and inactive learners as needing attention", () => {
    expect(needsAttention("needs-support")).toBe(true);
    expect(needsAttention("inactive")).toBe(true);
    expect(needsAttention("not-started")).toBe(false);
    expect(needsAttention("on-track")).toBe(false);
    expect(needsAttention("unknown")).toBe(false);
  });
});

describe("activity status (session monitor)", () => {
  it("compares activities by id, not by display title", () => {
    const target = track.sequence[2]!;
    const events = done(2, daysAgo(1));
    const summary = { ...computeChildProgressSummary(child, events, NOW), currentActivityId: target.id, currentActivityName: itemTitle(track, target) };
    expect(getActivityStatus(summary, target.id, events).status).toBe("in-progress");
    expect(getActivityStatus(summary, track.sequence[0]!.id, events).status).toBe("completed");
    expect(getActivityStatus(summary, track.sequence[10]!.id, events).status).toBe("not-started");
  });
});
