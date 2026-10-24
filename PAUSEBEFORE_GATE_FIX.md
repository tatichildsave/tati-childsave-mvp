# TATI ChildSave — Journey Progression Fix (pauseBefore Gates)

## Problem

Child learners who completed the "set-a-goal" lesson were unable to proceed to "needs-vs-wants" lesson without completing all 14 days of the "kwame-request" decision story scenario first. This was incorrect behavior because:

1. **Lessons are interleaved with scenario chapters** — The track design specifically breaks scenario chapters into sessions (Days 1–2, Day 4, Days 6–7) to correspond with lessons between chapters
2. **pauseBefore gates were not implemented** — The `pauseBefore` field was defined in the data model but never actually used in the progression logic
3. **Gates should pause, not block indefinitely** — A scenario chapter with `pauseBefore: ["needs-vs-wants"]` should pause before that lesson, meaning the lesson becomes accessible once the chapter is done, not that the entire scenario must be completed

## Root Cause

The `computeProgressSnapshot` function in `src/lib/progress/snapshot.ts` calculated the `locked` state for each journey item using simple linear progression:

```typescript
locked: currentIndex !== -1 && index > currentIndex,
```

This only considers whether an item is beyond the current item in the sequence. It completely ignores the `pauseBefore` field that specifies which items should be gated by incomplete scenarios.

## Solution

Implemented the `pauseBefore` gate logic in the locked state calculation:

```typescript
let isPausedBefore = false;
for (let i = 0; i < index; i++) {
  const earlierItem = track.sequence[i];
  if (earlierItem.pauseBefore?.includes(item.id) && !eventOf(earlierItem)) {
    // An earlier scenario that pauses before this item is not yet done
    isPausedBefore = true;
    break;
  }
}

return {
  ...
  locked: isPausedBefore || (currentIndex !== -1 && index > currentIndex),
  ...
}
```

This checks: for each item, scan all earlier items in the sequence. If any earlier item has a `pauseBefore` array that includes this item's ID, AND that earlier item has not been completed, then this item is locked.

## Verification

Created unit tests in `tests/progress/pauseBefore.test.ts` with 6 test cases:

- ✅ Lesson is locked when earlier scenario with pauseBefore is incomplete
- ✅ Lesson is unlocked when earlier scenario with pauseBefore is complete  
- ✅ First items are not paused by later scenarios
- ✅ Multiple pauseBefore gates on same scenario work correctly
- ✅ Linear progression works when no pauseBefore gates exist
- ✅ Multiple scenarios with different pauseBefore gates work independently

All 6 tests pass.

## Impact

- Children can now progress through lessons and scenario chapters as intended by the track design
- Lessons interleaved with scenario chapters become accessible after those chapters complete
- The existing `pauseBefore` gates in save.ts now function correctly:
  - kwame-request scenario (ch1) pauses before: needs-vs-wants
  - kwame-request scenario (ch2) pauses before: decide-spending
  - etc.

## Files Modified

- **src/lib/progress/snapshot.ts** — Added pauseBefore gate logic (lines ~88–97)
- **tests/progress/pauseBefore.test.ts** — Added unit tests (new file)

## Branch

```
main @ 979d149 (Fix journey progression: implement pauseBefore gate logic)
```

## Next Steps for Pilot

1. Test child journey flow with actual data: pre-assessment → lesson 1 → scenario ch1 → lesson 2 → scenario ch2 → etc.
2. Verify each lesson becomes accessible after its corresponding scenario chapter
3. Confirm parent/facilitator can view updated progress correctly
4. Run full automated test suite to ensure no regressions
