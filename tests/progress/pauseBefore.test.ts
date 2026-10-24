/**
 * Tests for pauseBefore gate logic in journey progression.
 * 
 * Ensures that lessons gated by pauseBefore are correctly locked
 * until the scenario chapters that precede them are completed.
 */

import { describe, it, expect } from "vitest";
import type { TrackItem } from "@/lib/learning/types";

/**
 * Unit test of the pauseBefore logic
 * This simulates the actual logic from computeProgressSnapshot
 */
function isPausedBefore(
  item: TrackItem,
  itemIndex: number,
  sequence: TrackItem[],
  completedItemIds: Set<string>
): boolean {
  // Check if this item is paused before by any earlier scenario
  for (let i = 0; i < itemIndex; i++) {
    const earlierItem = sequence[i];
    if (earlierItem.pauseBefore?.includes(item.id) && !completedItemIds.has(earlierItem.id)) {
      // An earlier scenario that pauses before this item is not yet done
      return true;
    }
  }
  return false;
}

describe("pauseBefore - Journey Progression Gates (Unit Tests)", () => {
  const createTestSequence = (): TrackItem[] => [
    { kind: "assessment", id: "test-pre" },
    { kind: "lesson", id: "lesson-1", label: "LESSON" },
    {
      kind: "scenario",
      id: "scenario-1-ch1",
      scenarioId: "scenario-1",
      label: "STORY",
      chapterTitle: "Chapter 1",
      stage: "Stage 1",
      pauseBefore: ["lesson-2"],
    },
    { kind: "lesson", id: "lesson-2", label: "LESSON" },
    { kind: "lesson", id: "lesson-3", label: "LESSON" },
  ];

  it("should report lesson as paused when earlier scenario has not completed", () => {
    const sequence = createTestSequence();
    const completed = new Set(["test-pre", "lesson-1"]);
    
    const lesson2 = sequence[3];
    const lesson2Index = 3;
    
    const paused = isPausedBefore(lesson2, lesson2Index, sequence, completed);
    expect(paused).toBe(true);
  });

  it("should report lesson as not paused when earlier scenario has completed", () => {
    const sequence = createTestSequence();
    const completed = new Set(["test-pre", "lesson-1", "scenario-1-ch1"]);
    
    const lesson2 = sequence[3];
    const lesson2Index = 3;
    
    const paused = isPausedBefore(lesson2, lesson2Index, sequence, completed);
    expect(paused).toBe(false);
  });

  it("should not pause first lesson even if scenario has pauseBefore", () => {
    const sequence = createTestSequence();
    const completed = new Set<string>();
    
    const lesson1 = sequence[1];
    const lesson1Index = 1;
    
    const paused = isPausedBefore(lesson1, lesson1Index, sequence, completed);
    expect(paused).toBe(false);
  });

  it("should handle multiple pauseBefore gates", () => {
    const sequence = createTestSequence();
    // Add multiple gates to scenario
    sequence[2].pauseBefore = ["lesson-2", "lesson-3"];
    
    const completed = new Set(["test-pre", "lesson-1"]);
    
    // Both lesson-2 and lesson-3 should be paused
    expect(isPausedBefore(sequence[3], 3, sequence, completed)).toBe(true);
    expect(isPausedBefore(sequence[4], 4, sequence, completed)).toBe(true);
    
    // After scenario completion, neither should be paused
    completed.add("scenario-1-ch1");
    expect(isPausedBefore(sequence[3], 3, sequence, completed)).toBe(false);
    expect(isPausedBefore(sequence[4], 4, sequence, completed)).toBe(false);
  });

  it("should allow linear progression when no pauseBefore gates exist", () => {
    const sequence = createTestSequence();
    sequence[2].pauseBefore = undefined;
    
    const completed = new Set(["test-pre"]);
    
    // lesson-1 should not be paused (it's the first item)
    expect(isPausedBefore(sequence[1], 1, sequence, completed)).toBe(false);
    
    // lesson-2 should not be paused (scenario has no pauseBefore)
    expect(isPausedBefore(sequence[3], 3, sequence, completed)).toBe(false);
  });

  it("should handle multiple scenarios with different pauseBefore gates", () => {
    // Create sequence with two scenarios that gate different lessons
    const sequence: TrackItem[] = [
      { kind: "assessment", id: "pre" },
      { kind: "lesson", id: "lesson-1" },
      {
        kind: "scenario",
        id: "scenario-1-ch1",
        scenarioId: "scenario-1",
        pauseBefore: ["lesson-2"],
      },
      { kind: "lesson", id: "lesson-2" },
      {
        kind: "scenario",
        id: "scenario-2-ch1",
        scenarioId: "scenario-2",
        pauseBefore: ["lesson-3"],
      },
      { kind: "lesson", id: "lesson-3" },
    ];
    
    const completed = new Set(["pre", "lesson-1"]);
    
    // lesson-2 is gated by incomplete scenario-1
    expect(isPausedBefore(sequence[3], 3, sequence, completed)).toBe(true);
    
    // lesson-3 IS paused by scenario-2 (even though it's after scenario-2 linearly)
    // because scenario-2 has pauseBefore: ["lesson-3"]
    expect(isPausedBefore(sequence[5], 5, sequence, completed)).toBe(true);
    
    // Complete scenario-1
    completed.add("scenario-1-ch1");
    expect(isPausedBefore(sequence[3], 3, sequence, completed)).toBe(false);
    
    // lesson-3 is still paused by incomplete scenario-2
    expect(isPausedBefore(sequence[5], 5, sequence, completed)).toBe(true);
    
    // Complete scenario-2
    completed.add("scenario-2-ch1");
    expect(isPausedBefore(sequence[5], 5, sequence, completed)).toBe(false);
  });
});
