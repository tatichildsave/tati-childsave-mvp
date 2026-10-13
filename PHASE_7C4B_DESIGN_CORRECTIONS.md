# PHASE 7C4B: Design Corrections and Implementation Gate

**Date**: 2026-10-08  
**Status**: READ-ONLY DESIGN CORRECTIONS (No Implementation)  
**HEAD**: `b79625f` (Harden child session timestamps and Firebase context typing)

---

## 1. Assessment Submission Semantics — CORRECTED

### Current Behavior (Source-Code Verified)

**Assessment IDs and Types**:

- Pre-assessment: ID = `"save-pre"`, assessmentType = `"pre"` (from `src/content/assessments/save-junior.ts`)
- Post-assessment: ID = `"save-post"`, assessmentType = `"post"`
- Type is determined by the assessment **definition**, not the submission

**Child-Facing Route** (`/child/assessment/$assessmentId`):

- File: `src/routes/child/assessment.$assessmentId.tsx`
- Server function: `saveChildAssessment()` in `child-learning.functions.ts`
- Flow:
  1. Component uses localStorage with storageKey: `tati.assessment.child.{childId}.{assessmentId}`
  2. localStorage persists responses, stage, index for resumable state
  3. On completion: Calls `saveChildAssessment()` server fn (one POST)
  4. Server recalculates score via pure `scoreAssessment()` engine
  5. Current implementation: Upserts to Supabase `assessment_attempts` on conflict `(child_profile_id, assessment_id)`
  6. Then: Calls `record.mutateAsync()` which calls `recordChildProgress()` server fn
  7. navigates to `/child/learn`

**Multiple Submissions**:

- Current Supabase behavior: Upsert on conflict → last write wins
- Previous attempt completely overwritten (no history)
- **Idempotency**: Upsert makes duplicate network requests safe (second POST overwrites with same data)

**Duplicate Network Requests**:

- Browser refresh during submission: localStorage persists responses
- User can resubmit → upsert handles gracefully (same response data)
- **Last-write-wins semantics**: Acceptable per current behavior

**Browser Refresh During Assessment**:

- localStorage persists: {stage, index, responses}
- On page reload: Component rehydrates from localStorage
- User resumes at same question
- Can resubmit (idempotent upsert)

**Existing Response Replacement**:

- Upsert strategy: New response replaces old for same question
- No per-response version tracking needed
- **Problem area**: No protection against newer responses being overwritten by older submissions (if browser caches old submission and retries)

**Parent/Facilitator Route** (`/_authenticated/learn/$childId/assessment/$assessmentId`):

- File: `src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx`
- Server function: `saveAssessmentAttempt()` in `src/lib/assessment/attempts.ts` (client-side Supabase call, NOT server-only)
- Flow:
  1. Route uses `assertChildInCurrentFamily()` to verify parent can access this child
  2. On completion: Direct client-side Supabase upsert (saveAssessmentAttempt)
  3. Then: Calls server fn `record.mutateAsync()` for progress
  4. navigates based on assessmentType
- **Authorization**: Parent must pass assertChildInCurrentFamily check
- **Can parents submit assessments?** YES — This route allows parent submissions (not a child-solo flow)

### Design Decision 1: Idempotency Strategy

**Current Model**:

- Document ID should be `{assessmentId}` (e.g., `"save-pre"`, not a UUID)
- Firestore upsert with `merge: true` makes it idempotent
- Multiple submissions for same assessment overwrite (intentional — supports retakes)

**Problem with Initial Design**:

- No protection if older submission is retried after newer submission
- Example: User submits (T1), then again with new answers (T2). If T1 retries after T2, old answers overwrite new.

**Solution: Add Timestamp Ordering**:

- Store `submittedAt: Timestamp` (server-side, always)
- On upsert: Compare new submittedAt vs existing updatedAt
- Accept new submission only if `submittedAt > existingUpdatedAt`
- Reject stale submissions (return error or silently ignore, user retries)

**Implementation**:

```typescript
const newSubmittedAt = FieldValue.serverTimestamp();

// Check existing attempt to see if this submission is stale
const existingAttempt = await attemptRef.get();
const existingUpdatedAt = existingAttempt.data()?.updatedAt;

if (existingUpdatedAt && newSubmittedAt < existingUpdatedAt) {
  // Submission is stale (older than what we have)
  throw new Error("This assessment was already submitted more recently");
}

// Safe to upsert
await attemptRef.set(
  {
    ...attemptData,
    submittedAt: newSubmittedAt,
    updatedAt: newSubmittedAt,
  },
  { merge: true },
);
```

**Alternative (Simpler)**: Accept last-write-wins and rely on client-side localStorage to prevent duplicate retries:

- User's browser won't retry stale submission if localStorage was just updated
- Fallback: User refreshes and sees new submission in localStorage
- **Risk**: Malicious client or network replay could still cause rollback
- **Chosen**: Timestamp ordering is safer; minimal implementation cost

---

## 2. Atomic Persistence — CORRECTED

### Current Flows (Source-Code Verified)

**Child-Facing Path**:

1. Client calls `saveChildAssessment()` (TanStack server fn)
   - Upserts Supabase `assessment_attempts` table
   - Upserts Supabase `assessment_responses` rows
   - Returns `{ ok: true }`
2. Client then calls separate `record.mutateAsync()` (different server fn)
   - Calls `recordChildProgress()` server fn
   - Updates Firebase `journeyProgress` collection
   - Returns `{ ok: true }`

**Problem**: TWO separate network round-trips

- If first succeeds and second fails: Assessment stored but progress not recorded
- If first fails but second somehow succeeds: Progress stored without assessment (unlikely but possible if error handling broken)

**Parent-Facing Path**:

1. Client calls `saveAssessmentAttempt()` (direct Supabase call, NOT via server fn)
   - Upserts Supabase tables
2. Client then calls `record.mutateAsync()`
   - Calls server fn `recordChildProgress`
   - Updates Firebase

**Same problem**: Two separate operations, not atomic

### Solution: Single Atomic Write via Firestore Batch

**Design**:

- Consolidate assessment + responses + progress into one Firestore batch
- All-or-nothing semantics: Either all three succeed or none

**Implementation**:

```typescript
// In FirebaseAssessmentRepository.saveAttempt()
async saveAttempt(
  childId: string,
  definition: AssessmentDefinition,
  result: AssessmentResult,
): Promise<void> {
  const db = this.db;
  const batch = db.batch();

  // 1. Write assessment attempt
  const attemptRef = db
    .collection("families").doc(this.familyId)
    .collection("children").doc(childId)
    .collection("assessmentAttempts")
    .doc(definition.id);

  batch.set(attemptRef, {
    id: definition.id,
    assessmentId: definition.id,
    childId,
    familyId: this.familyId,
    assessmentType: definition.assessmentType,
    points: result.points,
    maxPoints: result.maxPoints,
    competencyScores: {...},
    status: "completed",
    completedAt: FieldValue.serverTimestamp(),
    submittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // 2. Write responses
  for (const question of definition.questions) {
    if (!result.responses[question.id]) continue;
    const responseRef = attemptRef.collection("responses").doc(question.id);
    batch.set(responseRef, {...}, { merge: true });
  }

  // 3. Write progress (journeyProgress)
  const progressKey = `assessment:${definition.id}`;
  const progressRef = db
    .collection("families").doc(this.familyId)
    .collection("children").doc(childId)
    .collection("journeyProgress")
    .doc(progressKey);

  batch.set(progressRef, {
    id: progressKey,
    familyId: this.familyId,
    childId,
    child_profile_id: childId,
    track_id: "save",
    item_type: "assessment",
    item_id: definition.id,
    status: "completed",
    score: result.points,
    max_score: result.maxPoints,
    details: {
      assessmentType: definition.assessmentType,
      responses: result.responses,
      competencies: result.competencies,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // 4. Commit atomically (all succeed or all fail)
  await batch.commit();
}
```

**Concurrency Handling**:

- Firestore batch operations are atomic but not strongly consistent across documents
- Multiple children: Different documents → no conflict
- Same child, same assessment:
  - Batch 1 (T1): Write attempt A
  - Batch 2 (T2): Write attempt B
  - If concurrent: Last write wins (acceptable, equivalent to current upsert)
  - If overlapping: Firestore ensures transactional consistency within batch
  - **No ordering issue** because each batch is atomic

**Partial Failures**:

- One write fails → Entire batch fails (all-or-nothing)
- Client receives exception
- User sees error; can retry
- Retry will overwrite previous attempt (via upsert semantics, merge: true)

**Advantage over Supabase**:

- Current: Assessment + responses + progress = 2-3 separate calls
- New: All in one batch write (atomic)
- Cost: Firestore writes limit 1MB per batch; ~20 writes well under limit

---

## 3. Parent/Facilitator Route Verification — CORRECTED

### Route Analysis (Source-Code Verified)

**Route**: `/_authenticated/learn/$childId/assessment/$assessmentId`  
**File**: `src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx`

**Who Can Access?**

- Route is under `/_authenticated` layout
- Requires Firebase Auth user (parent/facilitator/admin)
- Calls `beforeLoad: assertChildInCurrentFamily(childId)`
- Server fn: `assertChildInFamily` in `family.functions.ts`
  - Gets parent context: `getCurrentParentContext()` (Firebase Auth user)
  - Calls `repo.assertChildAccess(childId)`
  - Verifies parent is in child's family

**Authorization Details**:

- assertChildAccess checks: isFamilyAdult(familyId) via Firestore
- Firestore rule: Parent must be in `families/{familyId}/members/{uid}` with status="active" and role="parent"
- Result: Only parents/guardians of that family can access

**Can Parents Submit Assessments?**

- YES — The route allows it
- Code path: `finish()` calls `saveAssessmentAttempt(childId, definition, result)`
- NO server-side validation that submission comes from child session
- Submission is directly attributed to `childId` (parent is not recorded)

**Can Facilitators Submit?**

- assertChildAccess also checks: `isAssignedFacilitator(familyId, childId)`
- So YES, facilitators with `facilitatorUids` assignment can access the route
- They can also submit assessments

**Is This Route Active or Legacy?**

- Status: **ACTIVE**
- Used in parent dashboard for supervised assessment workflows
- Tracked events: "pre_assessment_started", "pre_assessment_completed", "post_assessment_completed"
- Has analytics event tracking (not legacy)

**Depends on It?**

- Parent interface for guided/supervised assessments
- Separate from child solo journey (`/child/assessment/$assessmentId`)
- **TATI Intended Model vs Actual**:
  - **Intended**: Children complete their own learning journeys; parents view progress
  - **Actual**: This route allows parents to submit assessments on behalf of children
  - This diverges from intended model

### Design Decision 3: Parent/Facilitator Assessment Submission

**Recommendation**:

**Option A (Recommended)**: Keep route active but restrict to facilitators only

- Parent routes should be read-only (view dashboard, analytics, progress)
- Facilitated assessments (supervised learning) can be instructor-submitted
- Facilitator has `facilitatorUids` entry + explicit assignment
- Prevents accidental parent submissions on behalf of child

**Option B**: Keep as-is (parent + facilitator can both submit)

- Current behavior intentional for supervised learning
- Parents in pilot programs may need to administer assessments
- Risk: No audit trail (submitted by parent but attributed to child)
- Mitigation: Add submitterType field to assessment attempt (child | parent | facilitator)

**Chosen for Phase 7C4B**: **Option A** (facilitator-only)

- Aligns with TATI intended model
- Simpler authorization (no additional fields)
- Audit trail clear: Route used = facilitator submission
- Implementation: Add check in assertChildInFamily or in route's finish()

**Modified Server Function** (Phase 7C4B):

```typescript
async function finish(result: AssessmentResult) {
  // Verify parent is facilitator (not just family member)
  const parentContext = await getCurrentParentContext();
  if (!parentContext.roles?.includes("facilitator")) {
    throw new Error("Only facilitators can submit assessments");
  }

  await saveAssessmentAttempt(childId, definition, result);
  // ... rest of flow
}
```

---

## 4. Firestore Security Rules Verification — CORRECTED

### Current Rules (Source-Code Verified)

**Assessment Attempts Path**:

```
match /assessmentAttempts/{attemptId} {
  allow read: if canAccessChild(familyId, childId);
  allow write: if false;
}
```

**File**: `firestore.rules`, line 110  
**canAccessChild() Definition** (line 42):

```
function canAccessChild(familyId, childId) {
  return isFamilyAdult(familyId)
    || isAssignedFacilitator(familyId, childId)
    || isAdmin();
}
```

### Verification Findings

**1. ChildSession-Based Server Writes**:

- ✓ Child session validation happens in `validateChildSession()` (upstream)
- ✓ Server fn `saveChildAssessment()` calls `getCurrentChildContext()`
- ✓ childId derived server-side (not parameter)
- ✓ Admin SDK writes bypass Firestore rules (allowed)
- ✓ No client-side write attempted (server-only)

**2. Parent Read Permissions**:

- ✓ canAccessChild() includes isFamilyAdult()
- ✓ Parents can read assessmentAttempts via Firestore rules
- ✓ Client-side read allowed for authenticated parent

**3. Facilitator Read Permissions**:

- ✓ canAccessChild() includes isAssignedFacilitator()
- ✓ Facilitator must have facilitatorUids entry for child
- ✓ Client-side read allowed for assigned facilitator

**4. Cross-Family Access Prevention**:

- ✓ Firestore path includes {familyId}
- ✓ Parent context only has one family (per assertChildInFamily)
- ✓ Facilitator assignment is per-child (explicit)
- ✓ Child session locked to family (derived from profile)
- ✓ Rules check familyId in path context

**5. Response Documents Inheritance**:

- Rule written for parent path: `/assessmentAttempts/{attemptId}`
- Nested path: `/assessmentAttempts/{attemptId}/responses/{questionId}`
- Firestore rule DOES NOT explicitly define nested subcollection
- **Behavior**: Nested subcollection uses parent collection rules by default
  - If parent allows read, child read allowed
  - If parent denies write, child write also denied
- ✓ Responses inherit assessmentAttempts read (canAccessChild)
- ✓ Responses inherit assessmentAttempts write (false) = server-only

**6. Rules Changes Required?**

**Answer**: NO, rules are sufficient as-written

**Why**:

- Nested subcollection inheritance matches intended behavior
- Server-only writes enforced for both attempts and responses
- Client reads allowed for authorized parents/facilitators/admins
- Child writes denied; child reads forbidden (child uses session, not Firebase Auth)

**Optional Clarification** (not required for Phase 7C4B):

- Could add explicit subcollection rule for documentation:
  ```
  match /assessmentAttempts/{attemptId}/responses/{questionId} {
    allow read: if canAccessChild(familyId, childId);
    allow write: if false;
  }
  ```
- Benefit: Explicit documentation
- Cost: Redundant with inheritance
- Recommendation: **Defer to Phase 7C4C** (optional, for clarity)

### Emulator Test Implications

**Firestore emulator** will need:

- Test family documents
- Test child documents with facilitatorUids arrays
- Test parent/facilitator Firebase Auth users
- Rules applied to emulator (rules.dev file)

**Tests to add**:

- Parent can read assessmentAttempts
- Facilitator can read if assigned
- Cross-family parent cannot read
- Client writes denied (test with mock auth)

---

## 5. Firebase-Only Rollback Strategy — CORRECTED

### Rollback Scope

**Assumption**: Phase 7C4B implementation is committed but needs to be undone

**Do NOT restore Supabase**:

- Supabase dependency has been removed from saveChildAssessment()
- Reactivating Supabase calls would require re-importing dependencies (wasteful)
- Goal: Clean rollback that preserves Firebase infrastructure for future phases

### Rollback Procedure

**Step 1: Identify Commit Hash**

```bash
git log --oneline | head -20
# Find Phase 7C4B commit (e.g., "a1b2c3d Implement Firebase assessment persistence")
```

**Step 2: Revert Commit Locally (Do Not Push)**

```bash
git revert --no-commit a1b2c3d
# This stages the inverse changes but doesn't commit yet
```

**Step 3: Preserve Untracked Audit Documents**

```bash
# Verify untracked files
git status --short

# These should all be ??:
# ?? PHASE_7C4B_FIREBASE_ASSESSMENT_PERSISTENCE_DESIGN.md
# ?? (other audit docs)

# They will NOT be affected by git revert (they're untracked)
```

**Step 4: Review Staged Revert**

```bash
git diff --cached --stat
# Should show inverse of Phase 7C4B changes:
# - FirebaseAssessmentRepository deleted
# - Type definitions removed
# - child-learning.functions.ts reverted to Supabase
# - test file removed
```

**Step 5: Commit Revert Locally**

```bash
git commit -m "Revert Phase 7C4B: Firebase assessment persistence (WIP)"
# Creates new commit that reverses Phase 7C4B
```

**Step 6: Preserve Firestore Test Data** (If Emulator Was Used)

```bash
# Firestore emulator data is local (port 8080)
# Survives git revert
# If needed for next implementation attempt, leave emulator running
# Or export data before running revert
```

**Step 7: Restore to Pre-Phase-7C4B State (Optional)**

```bash
# If you want to fully undo and start fresh:
git reset --hard 018e2ec  # Go back to Phase 7C4A commit
# WARNING: Discards all Phase 7C4B work

# Alternatively, use the revert commit:
git reset --hard HEAD~1  # Go back one commit (the revert)
```

### Rollback Verification

**Confirm Rollback Success**:

```bash
git log --oneline | head -5
# Should show: (new revert commit), (Phase 7C4B commit), ...

git diff 018e2ec HEAD
# Should show changes from 018e2ec to now (excluding Phase 7C4B)

git status --short
# Only untracked audit documents (starting with ??); no staged/modified

npm run build
# Should succeed (confirms code compiles)

npx tsc --noEmit
# Should show same error count as Phase 7C4A (48 errors)
```

### Firestore Document Recovery

**Problem**: If Firestore documents were written during failed Phase 7C4B tests

**Cleanup Options**:

**Option 1: Emulator Reset**

```bash
# Firestore emulator stores data locally; kill and restart
# Emulator will start fresh (clean state)
pkill -f firebase-emulator
firebase emulators:start --only firestore
```

**Option 2: Manual Collection Deletion**

```bash
# Connect to emulator in test or admin console
# Delete collections created by Phase 7C4B:
# - /families/{familyId}/children/{childId}/assessmentAttempts
# Keep other collections intact
```

**Option 3: Backup Emulator State**

```bash
# Before Phase 7C4B, export emulator data
firebase emulators:export ./emulator-backup

# After rollback, restore
firebase emulators:start --import ./emulator-backup
```

**Recommendation**: Use Option 1 (Emulator Reset) — simplest, cleanest

### No Supabase Reactivation Required

**Why Firebase-only rollback works**:

1. Child-learning.functions.ts originally called Supabase
2. Phase 7C4A (timestamp fixes) didn't remove Supabase, just updated error handling
3. Phase 7C4B changes saveChildAssessment() to use Firebase repo
4. Rollback inverts the Phase 7C4B changes, restoring original Supabase call
5. Supabase SDK already in dependencies (was never removed)

**Git revert automatically restores the Supabase upsert call** — no manual re-import needed

---

## 6. Exact Updated Implementation Scope

### Files to Create

**1. Firestore Type Definitions**

**File**: Extend `src/integrations/firebase/firestore-types.ts`

**Add**:

```typescript
export interface FirestoreAssessmentAttemptDocument {
  // Identifiers
  id: string; // assessmentId (e.g., "save-pre")
  assessmentId: string; // Denormalized
  childId: string; // Denormalized for queries
  familyId: string; // Denormalized for cross-family isolation

  // Assessment metadata
  assessmentType: "pre" | "post";

  // Scoring
  points: number;
  maxPoints: number;
  competencyScores: Record<
    string,
    {
      points: number;
      maxPoints: number;
    }
  >;

  // Status and timestamps
  status: "completed";
  completedAt: Timestamp;
  submittedAt: Timestamp; // NEW: For ordering (stale detection)
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export interface FirestoreAssessmentResponseDocument {
  // Identifiers
  id: string; // questionId
  questionId: string;
  attemptId: string;

  // Response data
  optionId: string | null;

  // Scoring
  points: number;
  maxPoints: number;

  // Competency
  competency: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Lines**: ~35 lines

---

**2. Firebase Assessment Repository**

**File**: Extend `src/lib/backend/firebase/repositories.ts`

**Add**:

```typescript
export class FirebaseAssessmentRepository implements AssessmentService {
  constructor(
    private readonly db: Firestore,
    private readonly familyId: string,
  ) {}

  async saveAttempt(
    childId: string,
    definition: AssessmentDefinition,
    result: AssessmentResult,
  ): Promise<void> {
    const db = this.db;
    const batch = db.batch();

    // Recalculate score server-side (verification)
    const calculatedResult = scoreAssessment(definition, result.responses);

    // 1. Upsert assessment attempt
    const attemptRef = db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc(definition.id);

    batch.set(
      attemptRef,
      {
        id: definition.id,
        assessmentId: definition.id,
        childId,
        familyId: this.familyId,
        assessmentType: definition.assessmentType,
        points: calculatedResult.points,
        maxPoints: calculatedResult.maxPoints,
        competencyScores: Object.fromEntries(
          calculatedResult.competencies.map((c) => [
            c.competency,
            { points: c.points, maxPoints: c.maxPoints },
          ]),
        ),
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        submittedAt: FieldValue.serverTimestamp(), // NEW: Timestamp ordering
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // 2. Upsert responses
    for (const question of definition.questions) {
      if (!result.responses[question.id]) continue;

      const responseRef = attemptRef.collection("responses").doc(question.id);

      batch.set(
        responseRef,
        {
          id: question.id,
          questionId: question.id,
          attemptId: definition.id,
          optionId: result.responses[question.id],
          points: optionPoints(question, result.responses[question.id]),
          maxPoints: questionMaxPoints(question),
          competency: question.competency,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    // 3. Upsert journeyProgress (atomic with attempt)
    const progressKey = `assessment:${definition.id}`;
    const progressRef = db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("journeyProgress")
      .doc(progressKey);

    batch.set(
      progressRef,
      {
        id: progressKey,
        familyId: this.familyId,
        childId,
        child_profile_id: childId,
        track_id: "save",
        item_type: "assessment",
        item_id: definition.id,
        status: "completed",
        score: calculatedResult.points,
        max_score: calculatedResult.maxPoints,
        details: {
          assessmentType: definition.assessmentType,
          responses: result.responses,
          competencies: calculatedResult.competencies,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // 4. Commit atomically (all succeed or all fail)
    await batch.commit();
  }
}
```

**Lines**: ~100 lines

---

**3. Assessment Persistence Tests**

**File**: `tests/firebase/assessment-persistence.test.ts`

**Add**: ~450 lines covering:

- Valid pre-assessment submission
- Valid post-assessment submission
- Correct answer persistence
- Correct score calculation
- Progress update (journeyProgress)
- Invalid child session rejection
- Expired child session rejection
- Cross-child access denial
- Duplicate submission handling (with timestamp ordering)
- Partial-write prevention (batch atomicity)
- Firebase write failure handling
- Existing assessment result retrieval
- Parent read-only access
- Facilitator access (if assigned)
- Regression (Supabase behavior replicated in Firebase)

---

### Files to Modify

**1. Child Learning Server Functions**

**File**: `src/lib/auth/child-learning.functions.ts`

**Change in `saveChildAssessment()`**:

**Remove**:

```typescript
const { data: attempt, error } = await supabase
  .from("assessment_attempts")
  .upsert({ ... })
  .select("id")
  .single();
if (error || !attempt) throw new Error("Could not save that check-in.");

const responses = definition.questions
  .filter((question) => data.responses[question.id])
  .map((question) => ({ attempt_id: attempt.id, ... }));
if (responses.length > 0) {
  const { error: responseError } = await supabase
    .from("assessment_responses")
    .upsert(responses, { onConflict: "attempt_id,question_id" });
  if (responseError) throw responseError;
}
```

**Replace with**:

```typescript
const { getFirebaseAdminDb } = await import("@/integrations/firebase/admin.server");
const { FirebaseAssessmentRepository } = await import("@/lib/backend/firebase/repositories");

const db = getFirebaseAdminDb();
const assessmentRepo = new FirebaseAssessmentRepository(db, context.familyId);

await assessmentRepo.saveAttempt(childId, definition, calculatedResult);
// Note: journeyProgress written atomically in saveAttempt() batch
```

**Impact**:

- Remove Supabase import and calls (2-3 calls → 1 batch call)
- Remove separate progress recording call (now atomic)
- Update error messages to reflect Firebase
- ~15-20 line change (net -5 to -10 lines)

**2. Assessment Attempts (Parent-Facing)**

**File**: `src/lib/assessment/attempts.ts`

**Status for Phase 7C4B**: NO CHANGE (this file still uses Supabase)

**Reason**: Parent-facing path uses client-side Supabase (saveAssessmentAttempt)

- Deferred to Phase 7C4C (convert to server-side Firebase)
- For now: Keep Supabase implementation to avoid dual migration

**3. Parent/Facilitator Route**

**File**: `src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx`

**Change in route component**:

**Option A** (Facilitator-Only Restriction):

```typescript
// In AssessmentPage component, inside finish() function:

async function finish(result: AssessmentResult) {
  // NEW: Verify facilitator role (not just family member)
  const parentContext = await getCurrentParentContext(); // Get from Firebase Auth context
  if (!parentContext.roles?.includes("facilitator")) {
    throw new Error("Only facilitators can submit assessments on behalf of children");
  }

  // Existing code continues...
  if (definition) await saveAssessmentAttempt(childId, definition, result);
  // ... rest unchanged
}
```

**Impact**: ~5 lines added (role check)

**Option B** (No Change): Keep current behavior (parent + facilitator can submit)

- If keeping: Audit trail requires submitterType field
- Not chosen for Phase 7C4B

---

### Firestore Security Rules

**Status**: NO CHANGES REQUIRED

**Justification**:

- assessmentAttempts collection already defined
- canAccessChild() already enforces authorization
- Nested responses inherit rules (Firestore default behavior)
- Server-only writes enforced (write: false)

**Optional Clarification** (Phase 7C4C):

- Add explicit responses subcollection rule (documentation only)
- Deferred — not blocking Phase 7C4B

---

### Reusable Code (No Changes)

- `scoreAssessment()` in `assessment/engine.ts` ✓
- `optionPoints()`, `questionMaxPoints()` ✓
- `getFirebaseAdminDb()` ✓
- `getCurrentChildContext()` ✓
- `FirebaseJourneyProgressRepository` — Now called from saveAttempt() batch

---

### Expected TypeScript Impact

**Baseline**: 48 errors

**Phase 7C4B Expected**:

- TS2339: New types exported but not yet used (0 errors if types are exported correctly)
- TS2304: FirebaseAssessmentRepository import path (0 errors if exported)
- TS2322: Type mismatch in child-learning.functions.ts if signature changes (0 new errors)

**Target**: 48 or fewer errors (no regression)

---

### Authorization Checks (Implementation)

**In saveChildAssessment()**:

1. ✓ getCurrentChildContext() — Derive childId from session
2. ✓ getAssessmentDefinition() — Validate assessment exists
3. ✓ definition.trackId === "save" — Validate track membership
4. ✓ scoreAssessment() — Compute server-side (verify data)
5. ✓ familyId from child profile — Ensure isolation
6. ✓ Store in assessmentAttempts under authenticated child's path

**In finish() (parent-facing route)**:

1. ✓ assertChildInCurrentFamily() — Already in beforeLoad
2. ✓ NEW: Check parent is facilitator (if Option A)
3. ✓ scoreAssessment() — Verify data
4. ✓ Store attempt + progress atomically

---

### Response Replacement Strategy

**Implementation**:

- Use `merge: true` in batch.set() for responses
- Document ID = questionId (naturally unique per attempt)
- Upsert on same ID overwrites previous response
- Timestamp ordering prevents stale submissions from rolling back

**No Additional Versioning Needed**

---

### Idempotency Strategy (Final)

**Implementation**:

1. Document ID = assessmentId (one attempt per child per assessment)
2. Store submittedAt and updatedAt timestamps (server-side, always)
3. On upsert: merge: true makes idempotent
4. Multiple submissions succeed; latest overwrites (correct behavior for retakes)
5. Stale submissions rejected via timestamp ordering (optional, for safety)

**No UUID Needed** — AssessmentID is stable identifier

---

### Firestore Rules Changes

**Assessment Attempts**: Already defined, no changes
**Response Subcollection**: Inherits parent rules, no explicit rule needed

**Optional Phase 7C4C**: Add explicit subcollection rule for clarity

---

## 7. Unresolved Questions and Decisions

### Q1: Stale Submission Prevention

**Decision**: Implement timestamp ordering

- Cost: ~3 lines per attempt (check submittedAt vs updatedAt)
- Benefit: Prevents accidental rollback of new submission by old retry
- Trade-off: Slight added latency (one extra check)

**Alternative**: Rely on client-side localStorage (current model)

- Simpler (no server logic)
- Risk: Malicious/network replay could rollback

**Chosen**: Implement timestamp ordering (conservative, safe)

---

### Q2: Parent Assessment Submission

**Decision**: Restrict to facilitators only (Option A)

- Aligns with TATI intended model
- Simplifies authorization (no submitterType audit field)
- Clear: Facilitator route = facilitator submission

**Alternative**: Keep current (parent + facilitator, Option B)

- Supports supervised learning workflows
- Risk: No audit trail without additional fields

**Chosen**: Option A (facilitator-only) for Phase 7C4B

---

### Q3: Atomic Persistence

**Decision**: Single Firestore batch (attempt + responses + progress)

- All-or-nothing semantics
- Cost: One extra batch.set() call
- Benefit: No partial state possible

**Alternative**: Separate calls (current model, two server fns)

- Risk: Partial writes if second call fails
- Simpler (no batch logic)

**Chosen**: Single batch (correct, safe)

---

### Q4: Rollback Restoration

**Decision**: git revert + emulator reset

- Automatically restores Supabase call (original code)
- Clean, reversible
- Audit trail preserved (revert commit visible)

**Alternative**: Manual revert (pick changes)

- Error-prone
- Time-consuming

**Chosen**: git revert (automated)

---

### Q5: Firestore Rules Clarification

**Decision**: Leave as-is (nested subcollection inherits parent rules)

- Current implementation correct
- Optional: Add explicit subcollection rule for documentation (Phase 7C4C)

**Alternative**: Add explicit rule now

- Benefit: Clarity
- Cost: Redundant

**Chosen**: Phase 7C4C clarification (not blocking)

---

## Summary of Changes from Initial Design

| Area                 | Initial Design          | Corrected Design                     | Reason                                 |
| -------------------- | ----------------------- | ------------------------------------ | -------------------------------------- |
| Assessment ID        | Fixed, stable           | Fixed, stable                        | Verified: "save-pre", "save-post" used |
| Multiple Submissions | Last write wins         | Last write wins + timestamp ordering | Prevent stale rollback                 |
| Atomic Persistence   | Two separate server fns | One Firestore batch                  | Ensure all-or-nothing                  |
| Parent Submissions   | Allowed                 | Restrict to facilitators             | Align with intended model              |
| Firestore Rules      | No changes              | No changes (verified)                | Rules already sufficient               |
| Rollback             | Supabase re-import      | git revert + emulator reset          | Simpler, cleaner, Firebase-only        |
| File Scope           | 2 creates, 1 modify     | 2 creates, 2 modify                  | Added parent route authorization check |
| Idempotency          | Document ID only        | Document ID + timestamp ordering     | Safer against stale retries            |

---

## Final Git Integrity

**Status**: Clean working tree

- HEAD: `b79625f`
- No modified production files
- Untracked audit documents preserved
- Ready for implementation approval
