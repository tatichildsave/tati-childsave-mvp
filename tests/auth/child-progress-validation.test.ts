/**
 * Client-supplied child progress validation tests (Phase 0).
 *
 * Covers the input schemas for child progress and assessment submissions.
 * Scoring stays server-side; these bounds stop malformed or oversized payloads
 * from reaching Firestore.
 */

import { describe, it, expect } from "vitest";
import { progressInput, assessmentInput } from "@/lib/auth/child-learning.functions";

const validProgress = {
  itemType: "lesson" as const,
  itemId: "lesson-1",
  score: 3,
  maxScore: 5,
};

describe("progressInput", () => {
  it("accepts a well-formed progress record", () => {
    expect(progressInput.safeParse(validProgress).success).toBe(true);
    expect(progressInput.safeParse({ itemType: "scenario", itemId: "s-1" }).success).toBe(true);
  });

  it("rejects a score above the maximum score", () => {
    const result = progressInput.safeParse({ ...validProgress, score: 6, maxScore: 5 });
    expect(result.success).toBe(false);
  });

  it("rejects scores outside 0..100000 and non-integer scores", () => {
    expect(progressInput.safeParse({ ...validProgress, score: -1 }).success).toBe(false);
    expect(progressInput.safeParse({ ...validProgress, score: 100_001, maxScore: 100_001 }).success).toBe(false);
    expect(progressInput.safeParse({ ...validProgress, score: 1.5 }).success).toBe(false);
  });

  it("rejects an unknown item type", () => {
    expect(progressInput.safeParse({ ...validProgress, itemType: "quiz" }).success).toBe(false);
  });

  it("rejects details that exceed 4 KB of JSON", () => {
    const details = { note: "x".repeat(5000) };
    expect(progressInput.safeParse({ ...validProgress, details }).success).toBe(false);
  });

  it("rejects detail keys longer than 128 characters", () => {
    const details = { ["k".repeat(129)]: true };
    expect(progressInput.safeParse({ ...validProgress, details }).success).toBe(false);
  });

  it("rejects an item identifier that is empty or too long", () => {
    expect(progressInput.safeParse({ ...validProgress, itemId: "" }).success).toBe(false);
    expect(progressInput.safeParse({ ...validProgress, itemId: "i".repeat(129) }).success).toBe(false);
  });
});

const validAssessment = {
  assessmentId: "save-pre",
  responses: { q1: "a", q2: "b" },
  points: 4,
  maxPoints: 10,
  competencyScores: { saving: 2 },
};

describe("assessmentInput", () => {
  it("accepts a well-formed assessment submission", () => {
    expect(assessmentInput.safeParse(validAssessment).success).toBe(true);
  });

  it("rejects more than 200 responses", () => {
    const responses = Object.fromEntries(
      Array.from({ length: 201 }, (_, i) => [`q${i}`, "a"]),
    );
    expect(assessmentInput.safeParse({ ...validAssessment, responses }).success).toBe(false);
  });

  it("rejects a response longer than 2000 characters", () => {
    const responses = { q1: "a".repeat(2001) };
    expect(assessmentInput.safeParse({ ...validAssessment, responses }).success).toBe(false);
  });

  it("rejects client points above the cap", () => {
    expect(assessmentInput.safeParse({ ...validAssessment, points: 100_001 }).success).toBe(false);
    expect(assessmentInput.safeParse({ ...validAssessment, maxPoints: -1 }).success).toBe(false);
  });

  it("rejects competency scores larger than 4 KB", () => {
    const competencyScores = { saving: "x".repeat(5000) };
    expect(assessmentInput.safeParse({ ...validAssessment, competencyScores }).success).toBe(false);
  });
});
