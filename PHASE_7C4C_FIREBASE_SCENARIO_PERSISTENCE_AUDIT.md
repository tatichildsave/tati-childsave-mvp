# Phase 7C4C: Firebase Scenario Persistence — Revised Design Audit

**Status**: DESIGN-ONLY (No code modifications)  
**Date**: 2026-10-09 (Revised)  
**Baseline**: HEAD 9fae7c9

- 567 regression tests passing
- 42 outstanding TypeScript diagnostics (NOT clean)
- Production build passing
- No deployment, push, or Supabase changes authorized

---

## Executive Summary

This revision corrects architectural, authorization, curriculum, and test-coverage gaps in the Phase 7C4C design. The TATI Junior scenario journey consists of ONE 14-day scenario (School Reopening / Kwame's Request) split across 5 chapters, not 12 separate adventures. The design now specifies:

- Precise server-side progression enforcement via ChildSession + track definitions
- Authorization separated from Supabase RLS (using ChildSession + Firestore Rules + Admin SDK)
- Idempotent completion and badge awards with transaction boundaries
- Scenario state integrity via engine replay (preventing client fabrication)
- Exact Firestore paths and recovery flows
- Corrected test matrix (40 new tests minimum, reconciled)
- Six approval gates for implementation

---

## Part 1: Learning Architecture Verification

### 1.1 Current TATI Junior Track (SAVE)

**Single Interactive Scenario**:

- **ID**: `kwame-request`
- **Duration**: 14 days
- **Structure**: One story with 5 chapter breaks (pauseBefore rules)
- **Chapters**:
  1. Days 1–2: Plan and earn (kwame-request--ch1)
  2. Day 4: Market day (kwame-request--ch2)
  3. Days 6–7: Friends and money safety (kwame-request--ch3)
  4. Days 8–10: Work and surprises (kwame-request--ch4)
  5. Days 11–14: Final stretch and school reopening (kwame-request--ch5)

**Learning Modules**:

- **Pre-Assessment**: 5 questions (save-pre) — completed before scenario
- **Lessons**: 12 lessons covering concepts (needs vs. wants, safety, frameworks, tracking, etc.)
- **Reflections**: 3 pause-and-think stops (reflect-choices, reflect-lending, reflect-journey)
- **Post-Assessment**: 5 questions (save-post) — completed after all chapters
- **Bonus Stops**: 5 extra lessons (mobile money, bank accounts, smart spending, etc.)

**Total Sequence**: 28 items (1 pre + 12 lessons + 5 scenario chapters + 3 reflections + 1 post + 5 bonus)

### 1.2 Scenario Progression (Current)

**Status**: UI-ENFORCED LINEAR PROGRESSION

```
sequence = [
  assessment (save-pre),
  lesson (meet-your-money),
  lesson (set-a-goal),
  scenario (kwame-request--ch1, chapter 1-2), pauseBefore: ["needs-vs-wants"]
  lesson (needs-vs-wants),
  lesson (stop-think-choose),
  scenario (kwame-request--ch2, chapter 2),   pauseBefore: ["kwame-request"]
  reflection (reflect-choices),
  ... (8 more items) ...
  scenario (kwame-request--ch5, chapter 5),   final completion
]
```

**Progression Rule** (in `src/lib/progress/snapshot.ts`):

```typescript
currentIndex = track.sequence.findIndex((item) => !completed(item));
locked = index > currentIndex; // UI shows locked items greyed out
```

**Issue**: This is UI-only, NOT server-enforced. Child can navigate to any scenario via direct URL.

### 1.3 "12 Adventures" Clarification

**Status**: MISNAMED. The SAVE track contains:

- 1 scenario (kwame-request)
- Split into 5 chapters (not separate scenarios)
- 12 lessons (not adventures)
- 3 reflections (not adventures)

**Actual Count**:

- Scenarios: 1
- Lessons: 12
- Reflections: 3
- Assessments: 2 (pre + post)

**Future Scope**: TATI plans SPEND and EARN tracks (separate from SAVE). These would be additional scenarios or tracks, but NOT part of Phase 7C4C.

**Correction**: Phase 7C4C designs Firebase persistence for the current 1-scenario, 5-chapter track. Schema is extensible (add more scenarios, not adventures).

### 1.4 Implementation Status Summary

| Item                       | Type       | Implementation | Persistence                   |
| -------------------------- | ---------- | -------------- | ----------------------------- |
| save-pre                   | Assessment | ✅ Complete    | ✅ Firebase                   |
| Lessons (12)               | Lesson     | ✅ Complete    | ✅ journeyProgress (Firebase) |
| kwame-request (5 chapters) | Scenario   | ✅ Complete    | ❌ Supabase (broken)          |
| Reflections (3)            | Reflection | ✅ Complete    | ✅ journeyProgress (Firebase) |
| save-post                  | Assessment | ✅ Complete    | ✅ Firebase                   |
| Bonus Lessons (5)          | Lesson     | ✅ Complete    | ✅ journeyProgress (Firebase) |

**Status**: Scenario persistence is the only blocker.

---

## Part 2: Corrected Progression Enforcement

### 2.1 Current State

**Progression Model**: Linear, UI-enforced only.

```
Child sees: journey map with locked/current/done items
Server sees: nothing — any item is technically accessible
```

**Risk**: Child can directly URL to later chapters, bypass lessons, corrupt progress.

### 2.2 Proposed Server-Side Enforcement

**Validation Location**: Server functions `loadChildScenario`, `saveChildScenario`, `recordChildProgress`.

**Check Order**:

1. ✅ **ChildSession Valid**: Derive childId, familyId, validate expiry
2. ✅ **Item Exists in Track**: `trackItemExists(itemType, itemId)` (current)
3. ⚠️ **NEW: Item is Unlocked**: Check if child has completed prerequisites

**Unlocking Rules**:

```typescript
function isUnlocked(
  childId: string,
  track: Track,
  item: TrackItem,
  completedSet: Set<string>,
): boolean {
  // Pre-assessment always available
  if (item.kind === "assessment" && item.id === "save-pre") return true;

  // All other items: must have completed all items before it in sequence
  const index = track.sequence.indexOf(item);
  if (index < 0) return false; // Unknown item

  // Check all previous items completed
  for (let i = 0; i < index; i++) {
    const prior = track.sequence[i]!;
    const priorKey = `${prior.kind}:${prior.id}`;
    if (!completedSet.has(priorKey)) {
      return false; // Missing prerequisite
    }
  }

  return true;
}
```

**Implementation**: Call `isUnlocked()` before every server function that loads or saves progress.

### 2.3 Revisiting Completed Scenarios

**Use Case**: Child completes chapter 1, but wants to review chapter 2 later.

**Behavior**:

- ✅ Can load chapter 2 (completed, so unlocked)
- ✅ Cannot SAVE new decisions (would corrupt progress)
- OR: Select "Retake Scenario" → explicit choice, creates new session v0

**Implementation**:

```typescript
// In saveChildScenario:
const isCompleted = completedSet.has(`scenario:${data.scenarioId}`);
if (isCompleted && data.phase !== "complete") {
  // Trying to un-complete a scenario? Deny.
  throw new Error("Scenario already completed. Start fresh or retake.");
}
```

---

## Part 3: Corrected Authorization Terminology

### 3.1 Four Authorization Layers

**Layer 1: ChildSession (Server Functions)**

- Where: Every server function
- How: `const context = await getCurrentChildContext()`
- Validates: Authenticated user (TATI ID + PIN), session not expired
- Enforced: Server-side only
- Result: Provides server-derived `childId`, `familyId`

**Layer 2: Track Eligibility (Server Functions)**

- Where: After ChildSession validation
- How: `if (!trackItemExists(...)) throw new Error(...)`
- Validates: Item is in authoritative track definition
- Enforced: Server-side only
- Result: Rejects unknown scenarios

**Layer 3: Progression Eligibility (Server Functions)** [NEW]

- Where: After ChildSession and track eligibility
- How: `if (!isUnlocked(childId, track, item, completedSet)) throw new Error(...)`
- Validates: Child has completed prerequisites
- Enforced: Server-side only
- Result: Rejects out-of-order attempts

**Layer 4: Firestore Security Rules (Direct Client Access)**

- Where: `firestore.rules`
- How: `allow read: if canAccessChild(familyId, childId)`
- Validates: User owns family, child belongs to family
- Enforced: Firestore rules engine
- Result: Blocks direct reads from other families; parents can read

### 3.2 Firestore Admin SDK (Server Functions)

**Property**: Admin SDK bypasses Firestore Security Rules.

- Server functions call Admin SDK (no rule evaluation)
- Authorization via ChildSession layer (already validated)
- Admin SDK is trusted (runs on server, not client)

### 3.3 Firestore Security Rules (Existing)

**Path**: `families/{familyId}/children/{childId}/scenarioSessions/{scenarioId}`

**Rule** (in firestore.rules, lines 122–129):

```
match /scenarioSessions/{scenarioKey} {
  allow read: if canAccessChild(familyId, childId);
  allow write: if false;  // Server-only via Admin SDK
}
```

**Result**:

- Parent can read scenario completion
- Parent cannot modify
- Client cannot write (blocked by rules)
- Server (Admin SDK) can write

### 3.4 Cross-Family Isolation

**Mechanism**: Firestore path contains `familyId`.

**Enforcement**:

- ✅ ChildSession layer: Only child's familyId accessible
- ✅ Firestore Rules: `canAccessChild` checks familyId membership
- ✅ Server code: Always uses `context.familyId` (not request body)

**Attack Prevention**:

```
Child A tries: { familyId: "family-B", ... }
Server reads: context.familyId = "family-A" (from ChildSession)
Result: Path is /families/family-A/... ✅
```

---

## Part 4: Idempotent Completion and Badges

### 4.1 Duplicate Prevention via Transaction

**Problem**: Network timeout after server commits but before response client retries.

**Solution**: Atomic transaction with version check.

```typescript
transaction {
  1. Read scenarioSessions/{scenarioId} → existing.version
  2. Validate expectedVersion == existing.version
     If mismatch: throw "version conflict"
  3. Replay decisions through engine
  4. Write new state with version++
  5. Write progress event (idempotent: overwrites if exists)
  6. Award badges atomically
}
```

### 4.2 Badge Deduplication

**Problem**: `recordChildProgress` called twice with same completion.

**Solution**: Use Firestore transaction to atomically:

1. Write/overwrite progress event
2. Check if badge already exists
3. If not, create achievement doc

```typescript
transaction {
  progressRef.set(progressData, { merge: false });  // Idempotent

  const badgeRef = db.collection(...).doc("first-story");
  const badgeExists = await transaction.get(badgeRef);
  if (!badgeExists.exists) {
    transaction.set(badgeRef, { earnedAt: now, ... });  // Award once
  }
}
```

### 4.3 Competency Idempotency

**Use set semantics** (not increment):

```typescript
// WRONG (applies twice on retry):
transaction.update(competenciesRef, {
  score: FieldValue.increment(10),
});

// RIGHT (idempotent):
const replayed = replayDecisions(definition, submittedDecisions);
transaction.set(
  competenciesRef,
  {
    score: replayed.competencies.financial_responsibility,
  },
  { merge: true },
);
```

### 4.4 Stale Request Prevention

**Scenario**: Old request arrives late.

**Handling**:

```
Server reads: version is 2
Client sent: expectedVersion: 1
Mismatch → throw "version conflict"
```

**Result**: Late request rejected, no corruption. ✅

---

## Part 5: Scenario State Integrity

### 5.1 Validation Pipeline

**Before Saving**:

1. ✅ Authenticate ChildSession
2. ✅ Validate scenario ID in track
3. ✅ Validate progression eligibility (NEW)
4. ✅ Validate day in range (1–14)
5. ✅ Validate node reachable (BFS graph)
6. ✅ Validate each decision's choice exists
7. ✅ Validate ending ID (if complete)
8. ✅ **Replay decisions through engine, compare to submitted state** (NEW)

### 5.2 Engine Replay Verification

**Prevents Client Fabrication**:

| Attack                | Detection                              |
| --------------------- | -------------------------------------- |
| Increase money        | Replay shows different value, rejected |
| Skip decision         | Replay shows different node, rejected  |
| Fabricate ending      | Ending not in definition, rejected     |
| Create unknown choice | Choice not in index, rejected          |
| Claim competency      | Replay shows mismatch, rejected        |

**Implementation**: `verifyScenarioStateConsistency()` function replays all decisions and compares derived state to submitted.

### 5.3 Scenario Engine Reuse

**Existing Engine** (`src/lib/scenario/engine.ts`):

- `createInitialState(scenario)` → start state
- `applyChoice(scenario, state, choiceId)` → apply decision, compute effects
- `advance(state)` → move to next day

**Phase 7C4C Reuses**: Engine for replay verification (no changes).

---

## Part 6: Data Persistence and Recovery

### 6.1 Firestore Document Path and Type

**Main Document**:

```
/families/{familyId}/children/{childId}/scenarioSessions/{scenarioId}
```

**Document Fields** (TypeScript type):

```typescript
interface FirestoreScenarioSession {
  id: string; // Scenario ID
  scenarioId: string; // Copy for queries
  familyId: string; // Immutable
  childId: string; // Immutable
  state: ScenarioState; // Full 14-day journey state (JSON)
  status: "in_progress" | "completed";
  currentNodeId: string; // For queries
  dayNumber: number; // For queries
  completedAt?: Timestamp; // Server-set on completion
  version: number; // Optimistic concurrency (starts at 0)
  createdAt: Timestamp; // Server-set, immutable
  updatedAt: Timestamp; // Server-set on every write
}
```

### 6.2 Complete Recovery Journey

**Scenario**: Child plays Chapter 1 (Days 1–2), saves 3 decisions, logs out. Next day, logs back in.

**Step-by-Step**:

1. **Child logs in** (new ChildSession)
2. **Child opens `/child/scenario/kwame-request`**
3. **Server processes loadChildScenario**
   - ✅ Validates ChildSession (valid, not expired)
   - ✅ Validates scenario in track
   - ✅ Validates progression (pre-assessment done)
   - Queries Firestore: `families/{familyId}/children/{childId}/scenarioSessions/kwame-request`
   - Finds document with version 3, day 2, nodeId "day-2-evening"
   - ✅ Validates state bounds
   - Returns: `{ state, sessionId, definition }`

4. **UI Renders** (ScenarioPlayer)
   - Shows: Day 2, Evening, GH₵15 pocket, GH₵25 saved
   - Shows: 3 previous decisions in ledger

5. **Child makes 4th decision**
   - Calls `saveChildScenario({ expectedVersion: 3, state: newState })`

6. **Server processes saveChildScenario**
   - ✅ Validates ChildSession, scenario, progression
   - Starts transaction:
     - Reads current version: 3
     - Checks: expectedVersion (3) == current (3) ✅
     - Replays 4 decisions, compares to submitted ✅
     - Writes new state with version 4
     - Returns success

7. **Child completes scenario**
   - Calls `recordChildProgress({ itemType: "scenario", itemId: "kwame-request" })`

8. **Server processes recordChildProgress**
   - Writes progress event + badges atomically
   - Progress dashboard updates

**No Loss**: State is in Firestore, child resumes at exact decision point.

### 6.3 Save Timing

**When Saved**: After each decision (or checkpoint).

**Firestore Frequency**: ~10–20 writes per 14-day scenario.

**Cost**: Acceptable (same as assessments).

---

## Part 7: Corrected Test Matrix

### 7.1 Test Breakdown (40 new tests minimum)

| Category         | Type        | Count   | Examples                                               |
| ---------------- | ----------- | ------- | ------------------------------------------------------ |
| Server Functions | Integration | 14      | Load existing, load new, auth error, version conflict  |
| Repository       | Integration | 6       | Atomic transaction, version increment, idempotency     |
| Engine Replay    | Unit        | 8       | Valid sequence, fabricated money, reordered decisions  |
| Firestore Rules  | Emulator    | 8       | Child read own, parent read assigned, write denied     |
| End-to-End       | Emulator    | 4       | Full journey: load → save → logout → resume → complete |
| **Total New**    | —           | **40**  | (14 + 6 + 8 + 8 + 4)                                   |
| **Regression**   | —           | **567** | Existing suite                                         |
| **Grand Total**  | —           | **607** | (567 + 40)                                             |

### 7.2 Mandatory vs. Optional

**Mandatory** (must pass):

- ✅ Server Function Tests (14)
- ✅ Repository Tests (6)
- ✅ Engine Replay Tests (8)
- ✅ Firestore Rules Tests (8) — new paths require new tests
- ✅ Regression (567)

**Recommended**:

- ✅ End-to-End Tests (4)

**Total Minimum**: 553 (567 regression + 14 + 6 + 8 + 8 - 1 E2E optional)

### 7.3 Expected Test Files

**New Files** (to create):

```
tests/firebase/scenario-repository.test.ts              (6 tests)
tests/firebase/scenario-engine-replay.test.ts           (8 tests)
tests/firebase/scenario-server-functions.test.ts        (14 tests)
tests/firebase/scenario-rules.emulator.test.ts          (8 tests)
tests/firebase/scenario-e2e.emulator.test.ts            (4 tests, optional)
```

**Regression**: All 567 existing tests.

---

## Part 8: Baseline Reporting (Corrected)

| Metric                 | Value      | Note                                                  |
| ---------------------- | ---------- | ----------------------------------------------------- |
| Current HEAD           | 9fae7c9    | "Add assessment concurrency and input security tests" |
| Regression Tests       | 567/567 ✅ | All passing                                           |
| TypeScript Diagnostics | 42 ❌      | NOT clean, pre-existing                               |
| Production Build       | ✅ 0       | Passing (6.23s)                                       |
| Deployment Status      | 🔴 NOT     | Local only                                            |
| Supabase Scenario      | ❌ BROKEN  | Blocks progress recovery                              |
| Firebase Scenario      | ⚠️ MISSING | To be implemented                                     |

---

## Part 9: Revised Implementation Plan (6 Approval Gates)

### Gate A: Firebase Data Model and Repository

**Objective**: Implement FirebaseScenarioRepository with transaction logic.

**Files**:

- `src/lib/backend/firebase/repositories.ts` — Add `FirebaseScenarioRepository`

**Tests**: 6 repository tests (transaction, version, idempotency)

**Acceptance**: ✅ Class compiles, ✅ 6 tests pass, ✅ Transactions atomic

**Rollback**: Delete class (no migration)

---

### Gate B: Server-Side Loading, Submission, Validation

**Objective**: Wire `loadChildScenario` and `saveChildScenario` to Firebase.

**Files**:

- `src/lib/auth/child-learning.functions.ts` — Replace Supabase with Firebase

**Tests**: 14 server function tests + 8 replay tests

**Acceptance**: ✅ Same signatures, ✅ 22 tests pass, ✅ No Supabase in bodies

**Rollback**: Revert function implementations

**Dependency**: Gate A must pass

---

### Gate C: Progression, Completion, Badge Consistency

**Objective**: Server-side progression enforcement, idempotent badges.

**Files**:

- `src/lib/auth/child-learning.functions.ts` — Add `isUnlocked()` function

**Tests**: Progression bypass rejection, badge deduplication, concurrency

**Acceptance**: ✅ Child cannot bypass, ✅ Badges awarded once, ✅ No corruption

**Rollback**: Restore previous model

**Dependency**: Gate B must pass

---

### Gate D: Firestore Security Rules and Emulator Verification

**Objective**: Test Firestore rules against new paths.

**Files**:

- `firestore.rules` — Activate scenarioSessions rules (already declared)

**Tests**: 8 rules emulator tests (read/write enforcement)

**Acceptance**: ✅ Client write denied, ✅ Parent read allowed, ✅ Rules correct

**Rollback**: Restore previous rules

**Dependency**: Gate B must pass

---

### Gate E: UI Integration and End-to-End Recovery

**Objective**: Verify full journey recovery (load → save → logout → login → resume).

**Files**: None (UI unchanged)

**Tests**: 4 end-to-end tests

**Acceptance**: ✅ Full journey works, ✅ State persists, ✅ Badges awarded

**Rollback**: Not applicable

**Dependency**: Gates B, C, D must pass

---

### Gate F: Legacy Supabase Removal (Phase 7C4D)

**Objective**: Delete Supabase scenario tables after Firebase parity proven.

**Files**:

- `src/lib/scenario/session.ts` — Delete (Supabase-dependent)

**Timeline**: 2–4 weeks after Gate E (production stability check)

**Acceptance**: ✅ No Supabase calls, ✅ All tests pass, ✅ Production stable

**Rollback**: Restore session.ts

**Dependency**: Gates A–E must pass + production verification

---

## Summary of Corrections

1. **Learning Architecture**: Single 14-day scenario, 5 chapters, not 12 adventures
2. **Progression Enforcement**: Server-side checks added (was UI-only)
3. **Authorization**: Four layers defined, Supabase RLS removed
4. **Idempotent Completion**: Transaction boundaries, badge dedup specified
5. **Scenario Integrity**: Engine replay verification detailed
6. **Data Recovery**: Step-by-step walkthrough provided
7. **Test Matrix**: 40 tests reconciled and detailed
8. **Baseline**: 42 TypeScript errors noted (not clean)
9. **Implementation**: 6 approval gates with clear criteria

---

**PHASE 7C4C REVISED DESIGN COMPLETE — AWAITING APPROVAL**

**Ready to Proceed**: Approve 6 gates, resolve 5 outstanding decisions, then start Gate A implementation.
