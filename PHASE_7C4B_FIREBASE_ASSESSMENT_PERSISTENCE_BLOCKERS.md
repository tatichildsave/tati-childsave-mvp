# PHASE 7C4B: Final Design Blockers — Complete Verification

**Date**: 2026-10-08  
**Status**: READ-ONLY VERIFICATION (No Code Changes)  
**HEAD**: `b79625f` (Harden child session timestamps and Firebase context typing)  
**Baseline**: 48 TS errors, 531/531 tests PASS, production build PASS, clean working tree

---

## BLOCKER 1 — Firestore Response Subcollection Rules

### VERIFIED FINDING

**Current Firestore Rules File** (firestore.rules:110-113):

```
match /assessmentAttempts/{attemptId} {
  allow read: if canAccessChild(familyId, childId);
  allow write: if false;
}
```

**Exact Rule Status**:

- ✓ assessmentAttempts collection path: **EXPLICITLY DEFINED** with read/write rules
- ❌ responses subcollection: **NO EXPLICIT RULE DEFINED**
- No `match /responses/{questionId}` block exists in firestore.rules

**Evidence**:

- grep search for "responses" in firestore.rules: **(empty result)**
- Comparison: scenarioSessions has explicit nested rule (line 118-122)
  ```
  match /scenarioSessions/{scenarioKey} {
    allow read: if canAccessChild(familyId, childId);
    allow write: if false;

    match /decisions/{decisionId} {
      allow read: if canAccessChild(familyId, childId);
      allow write: if false;
    }
  }
  ```

### Firestore Rule Inheritance Behavior

**Official Firestore Documentation**: Nested subcollections do **NOT automatically inherit** parent document rules.

**Implications**:

1. If responses subcollection has **no explicit rule**, Firestore **denies all access** (default deny)
2. Parents cannot read response documents via Firestore queries
3. Facilitators cannot read response documents
4. Client writes to responses are denied (no rule allows it)

**Consequence for Phase 7C4B**:

- Parent dashboard **cannot directly query** `/assessmentAttempts/{id}/responses` via client-side Firestore read
- Client code attempting to read responses will receive **empty result or permission denied error**
- Server (Admin SDK) writes succeed (Admin SDK bypasses rules)

### Required Rule Change for Phase 7C4B

**Minimal Explicit Rule** (add after assessmentAttempts):

```
match /assessmentAttempts/{attemptId} {
  allow read: if canAccessChild(familyId, childId);
  allow write: if false;

  match /responses/{questionId} {
    allow read: if canAccessChild(familyId, childId);
    allow write: if false;
  }
}
```

**Implementation Cost**:

- 4 lines added to firestore.rules
- No functional change (inheritance would be explicit)
- Allows parent/facilitator client-side reads of response documents

**Test Coverage Required**:

- Parent can query responses for assigned child
- Facilitator can query responses if assigned to child
- Cross-family parent cannot query responses
- Client writes to responses denied

### Critical Finding for Implementation

**Current Design Issue**:

- PHASE_7C4B_FIREBASE_ASSESSMENT_PERSISTENCE_DESIGN.md assumed implicit inheritance
- Parent dashboard reads will **fail silently** without explicit rule
- Must add explicit responses rule before implementation

**Recommendation**:

- Add explicit responses rule to firestore.rules as part of Phase 7C4B
- This is **NOT optional** — required for parent read access

---

## BLOCKER 2 — Concurrency and Retake Safety

### Current Implementation Analysis

**Existing Code** (src/lib/assessment/attempts.ts):

```typescript
const { data, error } = await supabase
  .from("assessment_attempts")
  .upsert(
    {
      child_profile_id: childId,
      assessment_id: result.assessmentId,
      assessment_type: result.assessmentType,
      points: result.points,
      max_points: result.maxPoints,
      competency_scores: competencyScores,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_profile_id,assessment_id" }, // ← Compound key
  )
  .select("id")
  .maybeSingle();

// Then separately:
await supabase.from("assessment_responses").upsert(rows, { onConflict: "attempt_id,question_id" }); // ← Separate operation
```

**Key Observations**:

1. **Two separate upserts** (assessment_attempts + assessment_responses)
2. **No atomic guarantee** — first succeeds, second fails → partial state
3. **Unique constraint**: `(child_profile_id, assessment_id)` — one per child per assessment
4. **Upsert semantics**: Last write wins; previous attempt completely overwritten
5. **No batch operation** — Progress update happens separately in another server fn

### Proposed Firebase Implementation Issues

**Naive Batch Approach** (does NOT prevent concurrent lost updates):

```typescript
const batch = db.batch();

batch.set(attemptRef, attemptData, { merge: true });
batch.set(responseRef1, responseData1, { merge: true });
batch.set(progressRef, progressData, { merge: true });

await batch.commit(); // ← All succeed or all fail
```

**Why Batch Alone Is Insufficient**:

Scenario: Two concurrent submissions (T1 and T2) for same child, same assessment

```
T1: Submit with responses {q1: A, q2: B}, score=5
T2: Submit with responses {q1: C, q2: D}, score=8

Timeline (concurrent):
- T1: Batch 1 starts at time=1ms
- T2: Batch 2 starts at time=2ms
- T1: batch.set(attempt, {score:5}) completes at time=10ms
- T2: batch.set(attempt, {score:8}) completes at time=11ms
- Result: Document has score=8 (T2 won)
- But journeyProgress and responses may be mixed:
  - Attempt score: 8 (from T2)
  - Progress score: 5 (from T1, if it committed after T2)
  - Responses: {q1: A, q2: B} (from T1, if it committed after T2)
```

**Outcome**: Partial consistency — scores and responses mismatch (data corruption)

### Firestore Transactions vs Batches

**Firestore Batch**:

- ✓ Atomic (all-or-nothing)
- ❌ **NOT** strongly consistent for reads within batch
- ❌ Multiple concurrent batches can race
- ✓ Fast (parallel writes)
- ✓ 500-operation limit

**Firestore Transaction**:

- ✓ Atomic (all-or-nothing)
- ✓ **Strongly consistent** (ACID semantics)
- ✓ Prevents concurrent lost updates via isolation
- ❌ Slower (sequential, up to 25 retries)
- ✓ 25-operation limit

### Correct Design for Phase 7C4B

**Mechanism 1: Document ID as Idempotency Key**

- Document ID = `assessmentId` (e.g., "save-pre")
- One attempt document per child per assessment
- Prevents multiple attempt records for same assessment

**Mechanism 2: Transaction with Version Check**

```typescript
async saveAttempt(
  childId: string,
  definition: AssessmentDefinition,
  result: AssessmentResult,
): Promise<void> {
  const attemptRef = db
    .collection("families").doc(this.familyId)
    .collection("children").doc(childId)
    .collection("assessmentAttempts")
    .doc(definition.id);

  // Use transaction for strong consistency
  await db.runTransaction(async (transaction) => {
    // 1. Read current attempt (if exists)
    const attemptSnap = await transaction.get(attemptRef);
    const existing = attemptSnap.data();

    // 2. Compare timestamp to prevent stale rollback
    const newSubmittedAt = Date.now();
    if (existing?.submittedAt && existing.submittedAt > newSubmittedAt) {
      // Stale submission (older than what we have)
      throw new Error("This assessment was already submitted more recently");
    }

    // 3. Prepare new attempt (recalculated server-side)
    const calculatedResult = scoreAssessment(definition, result.responses);

    // 4. Delete old responses (if any)
    if (existing?.responses) {
      const oldResponseRefs = await transaction.get(
        attemptRef.collection("responses")
      );
      for (const doc of oldResponseRefs.docs) {
        transaction.delete(doc.ref);
      }
    }

    // 5. Write new attempt
    transaction.set(attemptRef, {
      id: definition.id,
      assessmentId: definition.id,
      childId,
      familyId: this.familyId,
      assessmentType: definition.assessmentType,
      points: calculatedResult.points,
      maxPoints: calculatedResult.maxPoints,
      competencyScores: {...},
      status: "completed",
      submittedAt: newSubmittedAt,
      completedAt: newSubmittedAt,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: existing?.createdAt || FieldValue.serverTimestamp(),
    }, { merge: false });  // ← Replace, don't merge

    // 6. Write new responses
    for (const question of definition.questions) {
      if (result.responses[question.id]) {
        const responseRef = attemptRef.collection("responses").doc(question.id);
        transaction.set(responseRef, {
          id: question.id,
          questionId: question.id,
          attemptId: definition.id,
          optionId: result.responses[question.id],
          points: optionPoints(question, result.responses[question.id]),
          maxPoints: questionMaxPoints(question),
          competency: question.competency,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // 7. Update journeyProgress atomically
    const progressKey = `assessment:${definition.id}`;
    const progressRef = db
      .collection("families").doc(this.familyId)
      .collection("children").doc(childId)
      .collection("journeyProgress")
      .doc(progressKey);

    transaction.set(progressRef, {
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
      createdAt: existing?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: false });  // ← Replace, not merge

    // 8. Transaction commits atomically
  });
}
```

### Why Transaction Is Required

**Concurrency Safety**:

- Transaction provides **serialization isolation** (ACID)
- Concurrent T1 and T2: One completes fully, other retries
- Prevents mixed state (attempt score ≠ responses + progress)

**Retake Safety**:

- Reading existing attempt allows version check
- Timestamp ordering prevents stale submission
- Old responses deleted before new ones written
- journeyProgress updated with new score (not mixed)

**Data Correctness**:

- scoreAssessment() called server-side (client scores ignored)
- Only successful transaction state commits
- Failure (stale submission) throws, no partial update

### Test Cases Required

**Test 1**: Single submission (no concurrency)

- Attempt created, responses written, progress updated
- All three documents have consistent values

**Test 2**: Retake (new submission for same assessment)

- Old responses deleted
- New attempt replaces old
- Progress updated with new score

**Test 3**: Stale submission prevention

- Submit at T1 with score=5
- Submit at T2 with score=8
- If T1 retries after T2: rejected (submittedAt is stale)

**Test 4**: Browser refresh + retry

- localStorage persists responses
- User resubmits identical data
- Accepted (same submittedAt, idempotent)

**Test 5**: Concurrent submission (safety)

- Two clients submit simultaneously
- One succeeds, other retries (Firestore retry semantics)
- Final state is consistent (not mixed)

**Test 6**: Progress consistency

- Attempt score matches progress score
- Responses count matches definition question count
- No missing documents

---

## BLOCKER 3 — Facilitator Authorization

### Current Authorization Flow (Child Route)

**Route**: `/child/assessment/$assessmentId`  
**File**: `src/routes/child/assessment.$assessmentId.tsx`

**Authorization Check** (beforeLoad):

```typescript
export const Route = createFileRoute("/child/assessment/$assessmentId")({
  beforeLoad: async ({ params }) => {
    await assertChildActivity({
      data: {
        itemType: "assessment",
        itemId: params.assessmentId,
      },
    });
  },
  // ...
});
```

**assertChildActivity** (src/lib/auth/child-learning.functions.ts):

- Calls `getCurrentChildContext()` (derives childId from session)
- Validates child session is valid (not expired)
- Validates assessment exists and is in track
- Validates item exists in journey

**Result**: Child identity is **server-derived**, not parameter

### Current Authorization Flow (Parent Route)

**Route**: `/_authenticated/learn/$childId/assessment/$assessmentId`  
**File**: `src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx`

**Authorization Check** (beforeLoad):

```typescript
export const Route = createFileRoute("/_authenticated/learn/$childId/assessment/$assessmentId")({
  beforeLoad: async ({ params }) => {
    try {
      await assertChildInCurrentFamily(params.childId); // ← Checks child exists
    } catch {
      throw redirect({ to: "/parent" });
    }
  },
  // ...
});
```

**assertChildInCurrentFamily** (src/lib/family.ts):

```typescript
export async function assertChildInCurrentFamily(childId: string): Promise<void> {
  await serverAssertChildInFamily({ data: { childId } });
}
```

**serverAssertChildInFamily** (src/lib/backend/firebase/family.functions.ts:135-150):

```typescript
export const assertChildInFamily = createServerFn({ method: "POST" })
  .validator(z.object({ childId: z.string().min(1) }))
  .handler(async ({ data: { childId } }) => {
    try {
      const { uid } = await getCurrentParentContext(); // ← Gets parent uid from session
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, uid);
      await repo.assertChildAccess(childId); // ← Checks if child in parent's family
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[assertChildInFamily] Error:", message);
      throw new Error(`Failed to verify child access: ${message}`);
    }
  });
```

**assertChildAccess** (src/lib/backend/firebase/repositories.ts:245-254):

```typescript
async assertChildAccess(childId: string): Promise<void> {
  const familyId = await this.ensureFamily();  // ← Gets parent's family
  const snapshot = await this.db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .get();
  if (!snapshot.exists) throw new Error("That learner is not part of your family.");
}
```

**Authorization Check Summary**:

- ✓ Parent uid derived from session cookie (getCurrentParentContext)
- ✓ Parent's family determined from uid (ensureFamily)
- ✓ Child existence verified in that family (assertChildAccess)
- ❌ **NO facilitator-specific check** — parents can submit assessments

### Current Facilitator Rules

**Firestore Rules** (firestore.rules:42-46):

```typescript
function isAssignedFacilitator(familyId, childId) {
  return (
    signedIn() &&
    hasRole("facilitator") &&
    "facilitatorUids" in
      get(/databases/$(database) / documents / families / $(familyId) / children / $(childId))
        .data &&
    get(
      /databases/$(database) / documents / families / $(familyId) / children / $(childId),
    ).data.facilitatorUids.hasAny([request.auth.uid])
  );
}

function canAccessChild(familyId, childId) {
  return isFamilyAdult(familyId) || isAssignedFacilitator(familyId, childId) || isAdmin();
}
```

**Facilitator Access Model**:

- Facilitator must have `facilitator` role in Firebase Auth custom claims
- Child document must have `facilitatorUids` array containing facilitator uid
- Firestore rules allow facilitators to read children they're assigned to

### Required Authorization for Phase 7C4B

**Requirement 1**: Children submit through validated ChildSession

- ✓ Already enforced (child route uses assertChildActivity)

**Requirement 2**: Parents cannot submit assessments for children

- ❌ **NOT enforced** — current code allows parents to submit
- ✓ Should restrict to facilitators only

**Requirement 3**: Facilitators can submit only if explicitly authorized

- ❌ **NOT enforced** — current code allows any parent to submit
- Need to add facilitator role check

**Requirement 4**: Administrators follow separately defined permissions

- ❌ **NOT defined** — no separate admin authorization flow
- Can use existing isAdmin() check

**Requirement 5**: No caller can spoof family or child identity

- ✓ Already enforced (uid from session, family from uid, child in family)

### Implementation Points for Facilitator Authorization

**Point 1: Parent Route beforeLoad** (Route-Level Check)

```typescript
export const Route = createFileRoute("/_authenticated/learn/$childId/assessment/$assessmentId")({
  beforeLoad: async ({ params }) => {
    // Existing check: verify child in current family
    await assertChildInCurrentFamily(params.childId);

    // NEW: Verify facilitator role (restrict to facilitators only)
    // This prevents regular parents from submitting
    try {
      const { uid } = await getCurrentParentContext();
      const db = getFirebaseAdminDb();
      const userDoc = await db.collection("users").doc(uid).get();
      const roles = userDoc.data()?.roles || [];
      const isFacilitator = roles.includes("facilitator");
      const isAdmin = roles.includes("admin");

      if (!isFacilitator && !isAdmin) {
        throw new Error("Only facilitators can submit assessments on behalf of children");
      }
    } catch (error) {
      throw redirect({ to: "/parent" });
    }
  },
  // ...
});
```

**Point 2: Server Function Authorization** (Function-Level Check)

Alternative: Check in saveAssessmentAttempt() or a wrapper server fn:

```typescript
export const submitChildAssessment = createServerFn({ method: "POST" })
  .validator(...)
  .handler(async ({ data: { childId, assessmentId, responses } }) => {
    // 1. Get current user (should be parent/facilitator)
    const context = await getCurrentParentContext();

    // 2. Verify user is facilitator (or admin)
    const db = getFirebaseAdminDb();
    const userDoc = await db.collection("users").doc(context.uid).get();
    const roles = userDoc.data()?.roles || [];

    if (!roles.includes("facilitator") && !roles.includes("admin")) {
      throw new Error("Only facilitators can submit assessments");
    }

    // 3. Verify child is assigned to facilitator (if not admin)
    if (!roles.includes("admin")) {
      const childDoc = await db
        .collection("families")
        .doc(familyId)  // ← How to get family?
        .collection("children")
        .doc(childId)
        .get();

      const facilitatorUids = childDoc.data()?.facilitatorUids || [];
      if (!facilitatorUids.includes(context.uid)) {
        throw new Error("You are not assigned to this child");
      }
    }

    // 4. Proceed with assessment submission
    // ...
  });
```

**Problem with Point 2**: How to get familyId from childId alone?

- Route knows it via beforeLoad + assertChildInCurrentFamily
- Server function doesn't have familyId
- Need to pass familyId or derive it

### Recommended Implementation Strategy

**Approach**: Use beforeLoad + Route-Level Check (Point 1)

**Why**:

- Simple, explicit, no server round-trip needed
- Prevents access before any component logic runs
- Consistent with existing assertChildInCurrentFamily pattern

**Implementation**:

1. **Create helper server function**:

```typescript
// File: src/lib/backend/firebase/parent-auth.server.ts

export async function assertParentIsFacilitator(): Promise<void> {
  const context = await getCurrentParentContext();
  const db = getFirebaseAdminDb();
  const userDoc = await db.collection("users").doc(context.uid).get();
  const roles = userDoc.data()?.roles || [];

  if (!roles.includes("facilitator") && !roles.includes("admin")) {
    throw new Error("Only facilitators can submit assessments on behalf of children");
  }
}
```

2. **Call in route beforeLoad**:

```typescript
export const Route = createFileRoute("/_authenticated/learn/$childId/assessment/$assessmentId")({
  beforeLoad: async ({ params }) => {
    try {
      await assertChildInCurrentFamily(params.childId);
      await assertParentIsFacilitator(); // ← NEW
    } catch {
      throw redirect({ to: "/parent" });
    }
  },
  // ...
});
```

### Test Cases Required

**Test 1**: Parent (non-facilitator) cannot access route

- Parent uid exists in family/members with role="parent"
- Attempt to access route
- Should redirect to /parent (beforeLoad fails)

**Test 2**: Facilitator with explicit assignment can access

- Facilitator uid has facilitator role
- Child has facilitatorUids containing facilitator uid
- Can access route and submit assessment

**Test 3**: Facilitator without explicit assignment cannot access

- Facilitator uid has facilitator role
- Child does NOT have facilitatorUids with this facilitator
- Should redirect (or fail in server fn)

**Test 4**: Admin can access regardless of assignment

- Admin uid has admin role
- Can access route regardless of facilitatorUids
- Can submit assessment

**Test 5**: No uid spoofing via childId parameter

- Attacker tries ?childId=other-persons-child
- beforeLoad calls assertChildInCurrentFamily with OTHER child
- If child not in attacker's family: redirects
- ✓ Already enforced by existing authorization

**Test 6**: Child route remains unchanged

- Child with valid session can submit own assessment
- Parent/facilitator role doesn't affect child route
- Child route still uses assertChildActivity

### Critical Authorization Boundary

**For Phase 7C4B, Establish Clear Model**:

| User        | Route                                           | Can Submit?         | Requirements                       |
| ----------- | ----------------------------------------------- | ------------------- | ---------------------------------- |
| Child       | `/child/assessment/$id`                         | Yes                 | Valid ChildSession (current)       |
| Parent      | `/_authenticated/learn/$childId/assessment/$id` | **NO** (Phase 7C4B) | Must be facilitator + assigned     |
| Facilitator | `/_authenticated/learn/$childId/assessment/$id` | Yes                 | Facilitator role + facilitatorUids |
| Admin       | `/_authenticated/learn/$childId/assessment/$id` | Yes                 | Admin role                         |

---

## BLOCKER 4 — Firebase-Only Rollback

### Rollback Scope

**What's Being Rolled Back**: Phase 7C4B implementation (assume partial deployment)

**What's Preserved**:

- Untracked audit documents (PHASE_7C4B_*.md files)
- Unrelated commits (don't undo Phase 7C3B, Phase 7C4A)
- git history (preserve all commits)
- Firestore infrastructure (keep collections/docs)

**What's Removed**:

- FirebaseAssessmentRepository code
- firestore-types modifications
- child-learning.functions.ts changes
- firestore.rules changes (if any)
- assessment persistence tests

### Rollback Procedure

**Step 1: Verify Current State**

```bash
cd c:\Users\Y O G A\tati-childsave-mvp
git status --short        # All ?? (untracked) — audit docs only
git log --oneline -3      # Verify HEAD is b79625f (original baseline)
npm run build 2>&1 | tail -5  # Check baseline builds
```

**Step 2: Identify Phase 7C4B Commit Hash** (when it exists)

```bash
git log --oneline | grep -i "firebase assessment"
# Example result: a1b2c3d Firebase assessment persistence implementation
# This is the commit to revert
```

**Step 3: Revert Commit Locally (Do NOT Push)**

```bash
git revert --no-commit a1b2c3d
# --no-commit: Stages the inverse changes but doesn't create commit yet
# Allows review before finalizing
```

**Step 4: Verify Staged Revert**

```bash
git diff --cached --stat
# Should show:
# - src/lib/backend/firebase/repositories.ts (FirebaseAssessmentRepository removed)
# - src/integrations/firebase/firestore-types.ts (types reverted)
# - src/lib/auth/child-learning.functions.ts (Supabase call restored)
# - firestore.rules (changes reverted)
# - tests/firebase/assessment-persistence.test.ts (test file deleted)
```

**Step 5: Reset Firestore Emulator** (Optional, if needed)

```bash
# Stop emulator
firebase emulators:stop

# Delete emulator data
rm -r ~/.cache/firebase/emulators/

# Restart emulator
firebase emulators:start --only firestore
```

**Step 6: Review Staged Changes**

```bash
git diff --cached | head -100  # Review first 100 lines
# Verify only Phase 7C4B changes are included
```

**Step 7: Commit Revert**

```bash
git commit -m "Revert Phase 7C4B: Firebase assessment persistence (incomplete implementation)"
# Creates new commit that inverses Phase 7C4B
```

**Step 8: Verify Rollback Success**

```bash
git log --oneline -5
# Should show:
# - (new revert commit)
# - a1b2c3d Firebase assessment persistence implementation
# - b79625f Harden child session timestamps...
# - ...

git status --short
# Should show only ?? (untracked audit documents)

npm run build 2>&1 | tail -10
# Should succeed (same as baseline)

npx tsc --noEmit 2>&1 | wc -l
# Should show 48 errors (same as baseline before Phase 7C4B)
```

### Recovery After Partial Deployment

**Scenario 1: Assessment persistence deployed, but not working**

```bash
# Check if users are experiencing issues
# If yes: Disable the feature (quick rollback)

# Option A: Feature Flag
# Add feature flag to saveChildAssessment():
const FIREBASE_ASSESSMENT_ENABLED = false;
if (FIREBASE_ASSESSMENT_ENABLED) {
  // New Firebase code
} else {
  // Old Supabase code (temporary fallback)
}

# Deploy with flag = false
# Users fall back to Supabase temporarily

# Option B: Immediate Revert
git revert --no-commit <commit-hash>
git commit -m "Emergency revert: Assessment persistence"
git push origin main
npm run build && npm run deploy
# Takes ~5 minutes, users see older code
```

**Scenario 2: Firestore rules incomplete, parent reads fail**

```bash
# Check parent dashboard errors
# If reads return empty: Rules are blocking

# Restore assessmentAttempts responses rule:
git checkout HEAD~1 firestore.rules
# This reverts firestore.rules to parent commit

# Deploy only rules:
firebase deploy --only firestore:rules
# Takes ~30 seconds, re-enables parent access

# Fix code + rules on next commit
```

**Scenario 3: Transient Firestore failures**

```bash
# If tests show Firestore quota exceeded or timeout:

# Option A: Wait for quota reset (1 minute)
sleep 60
npm test

# Option B: Use emulator for testing
firebase emulators:start --only firestore
npm test
```

### Firestore Document Recovery

**If Assessment Documents Written During Failed Tests**:

**Option 1: Emulator Reset** (Simplest)

```bash
# Stop emulator
firebase emulators:stop

# Data is lost (emulator stores locally, not in production)
# Restart clean
firebase emulators:start --only firestore
```

**Option 2: Manual Collection Cleanup** (Production)

```bash
# Use Firebase Admin SDK to delete collection:
# src/lib/backend/firebase/cleanup-assessments.ts

import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";

async function deleteAssessmentAttempts(familyId: string, childId: string) {
  const db = getFirebaseAdminDb();
  const attempts = await db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .collection("assessmentAttempts")
    .get();

  for (const doc of attempts.docs) {
    await doc.ref.delete();
  }
}

// Call from test cleanup or admin script
```

**Option 3: Firestore Database Backup**

```bash
# Before Phase 7C4B, export database:
firebase firestore:export ./firestore-backup

# If needed, restore:
firebase firestore:import ./firestore-backup
```

### Git Rollback Does NOT Require Supabase

**Why**:

1. Supabase SDK already in dependencies (used by other features)
2. git revert automatically restores original Supabase call in saveChildAssessment()
3. No need to manually re-add Supabase imports
4. Supabase schema unchanged (assessment_attempts, assessment_responses exist)
5. No schema migration needed

**Example**: When git reverts Phase 7C4B commit, this code is automatically restored:

```typescript
const { data, error } = await supabase
  .from("assessment_attempts")
  .upsert({ ... })
  .select("id")
  .single();
```

No additional changes needed.

---

## BLOCKER 5 — Implementation Boundaries

### Scope Definition

**What is Phase 7C4B?**

Clear separation of concerns for implementation, testing, and deployment.

### (A) Child Assessment Persistence

**Scope**: Migrate child-facing assessment submission to Firebase

**Files to Create**:

1. `src/lib/backend/firebase/repositories.ts` — Add `FirebaseAssessmentRepository` class
   - Method: `saveAttempt(childId, definition, result)`
   - Uses Firestore transaction for atomicity
   - ~150 lines

2. `src/integrations/firebase/firestore-types.ts` — Add types
   - `FirestoreAssessmentAttemptDocument`
   - `FirestoreAssessmentResponseDocument`
   - ~40 lines

3. `tests/firebase/assessment-persistence.test.ts` — Add comprehensive tests
   - Unit tests for repository logic
   - Integration tests with Firestore emulator
   - ~400 lines

**Files to Modify**:

1. `src/lib/auth/child-learning.functions.ts` — Update `saveChildAssessment()`
   - Remove Supabase calls
   - Call FirebaseAssessmentRepository.saveAttempt()
   - Remove separate progress recording (now atomic)
   - ~20 lines changed

2. `firestore.rules` — Add responses subcollection rule
   - Explicit rule for assessmentAttempts/responses
   - ~4 lines added

**Files to NOT Modify**:

- Child route (assessment.$assessmentId.tsx) — No changes needed
- useAssessmentRunner hook — No changes needed
- AssessmentRunner component — No changes needed
- Assessment engine — No changes needed
- Firestore security rules canAccessChild function — No changes

**Deliverable**: Child can submit assessment, score calculated server-side, responses persisted atomically

---

### (B) Parent/Facilitator Route Authorization

**Scope**: Restrict parent route to facilitators only

**Files to Create**:

1. `src/lib/backend/firebase/parent-auth.server.ts` — Add helper
   - Function: `assertParentIsFacilitator()`
   - Checks user has facilitator or admin role
   - ~15 lines

**Files to Modify**:

1. `src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx` — Add authorization check
   - Call `assertParentIsFacilitator()` in beforeLoad
   - Add test for facilitator-only access
   - ~5 lines changed

2. `tests/routes/parent-assessment.test.ts` — Add authorization tests
   - Parent cannot access route
   - Facilitator with assignment can access
   - Facilitator without assignment cannot access
   - Admin can access
   - ~150 lines

**Files to NOT Modify**:

- assertChildInCurrentFamily — No changes needed
- Child route — No changes needed
- firestore.rules canAccessChild — No changes (already works)

**Deliverable**: Parent cannot submit assessments; only facilitators with explicit assignment can

---

### (C) Firestore Security Rules

**Scope**: Explicit rules for assessment and response access

**Files to Modify**:

1. `firestore.rules` — Add response subcollection rule
   ```
   match /assessmentAttempts/{attemptId} {
     allow read: if canAccessChild(familyId, childId);
     allow write: if false;

     match /responses/{questionId} {
       allow read: if canAccessChild(familyId, childId);
       allow write: if false;
     }
   }
   ```
   - 4 lines added
   - No other rules changed

**Test Coverage**:

- Parent can read assessmentAttempts
- Parent can read responses for assigned child
- Parent cannot read cross-family children
- Facilitator can read responses if assigned
- Client writes denied

**Deliverable**: Firestore rules explicitly allow parent/facilitator reads of assessments and responses

---

### (D) Tests

**Scope**: Comprehensive coverage for (A), (B), (C)

**Test Files**:

1. `tests/firebase/assessment-persistence.test.ts` (400 lines)
   - Repository unit tests
   - Integration tests with emulator
   - Concurrency and retake tests
   - Idempotency tests

2. `tests/routes/parent-assessment.test.ts` (150 lines)
   - Authorization tests
   - Route-level access control
   - Facilitator-only enforcement

3. `tests/firestore/assessment-rules.test.ts` (100 lines)
   - Firestore rule validation
   - Parent reads allowed
   - Facilitator reads allowed
   - Client writes denied

**Coverage Target**: 14 tests, all PASS

**Deliverable**: Comprehensive test coverage for all changes

---

### Implementation Sequence

**Phase 7C4B Recommended Order**:

1. **First**: Firestore rules (C)
   - Add responses subcollection rule
   - 5 min to implement, 10 min to test
   - Unblocks parent reads

2. **Second**: Child persistence (A)
   - Create FirebaseAssessmentRepository with transaction
   - Modify saveChildAssessment()
   - Add comprehensive tests
   - 60 min to implement, 30 min to test

3. **Third**: Authorization (B)
   - Add assertParentIsFacilitator()
   - Modify parent route
   - Add authorization tests
   - 20 min to implement, 15 min to test

4. **Final**: Validation
   - Run full test suite: 531+16=547 tests expected
   - Run production build
   - Verify TypeScript: 48 errors (no new errors)

### Deferred to Phase 7C4C

**Out of Scope**:

- Parent-facing assessment submission (saveAssessmentAttempt) — Deferred
- Supabase assessment_responses migration — Deferred
- Parent dashboard assessment comparison — Deferred
- Scenario persistence (keep separate) — Deferred
- Admin dashboard assessment analytics — Deferred

**Reason**: Phase 7C4B focuses on Firebase foundation; parent workflows handled in 7C4C

---

### Final Scope Summary

| Item                                              | Phase 7C4B | Phase 7C4C | Deferred |
| ------------------------------------------------- | ---------- | ---------- | -------- |
| Child assessment submission                       | ✓          | —          | —        |
| Firebase persistence (attempt+responses+progress) | ✓          | —          | —        |
| Firestore response subcollection rule             | ✓          | —          | —        |
| Parent/facilitator authorization (route-level)    | ✓          | —          | —        |
| Parent assessment submission                      | —          | ✓          | —        |
| Parent dashboard comparison                       | —          | ✓          | —        |
| Supabase migration cleanup                        | —          | ✓          | —        |
| Scenario persistence                              | —          | —          | ✓        |

---

## FINAL GIT VERIFICATION

```bash
cd 'c:\Users\Y O G A\tati-childsave-mvp'
```

**Command 1: Status**

```
git status --short
?? AUTHENTICATION_REDESIGN_AUDIT_SUMMARY.md
?? COMPREHENSIVE_AUTH_ARCHITECTURE_AUDIT.md
?? DEV_SERVER_FIX_SUMMARY.md
?? PHASE_6_RECOVERY_PLAN.md
?? PHASE_7C3B_VERIFICATION_REPORT.md
?? PHASE_7C3_COMPREHENSIVE_AUDIT_REPORT.md
?? PHASE_7C4B_DESIGN_CORRECTIONS.md
?? PHASE_7C4B_FIREBASE_ASSESSMENT_PERSISTENCE_DESIGN.md
?? PHASE_7C4B_FIREBASE_ASSESSMENT_PERSISTENCE_BLOCKERS.md
?? PHASE_A_PARENT_SIGNUP_AUDIT.md
?? PHASE_B1_PARENT_PROVISIONING_SECURITY_AUDIT.md
?? PHASE_B_PARENT_SIGNUP_REMOVAL_COMPLETION.md
?? PHASE_C1_1_AUTHORIZATION_VERIFICATION_REPORT.md
?? PHASE_C1_2_FAMILY_AUTHORIZATION_FIX_REPORT.md
?? PHASE_C1_3_AUTHORIZATION_VERIFICATION_REPORT.md
?? PHASE_C1_3_COMPLETION_REPORT.md
?? PHASE_C1_PARENT_AUTHORIZATION_HARDENING_REPORT.md
?? build-output2.txt
?? diff.txt
?? diff2.txt
?? phase-b-build-output.txt

Result: ✓ Clean working tree (only untracked audit documents)
```

**Command 2: Diff Check**

```
git diff --check

Result: ✓ No whitespace errors, no problematic changes
```

**Command 3: Diff Summary**

```
git diff --stat

Result: ✓ No changes (all files untracked)
```

**Command 4: Log**

```
git log -1 --oneline

Result: b79625f (HEAD -> main) Harden child session timestamps and Firebase context typing
```

---

## Summary of Blocker Findings

| Blocker                          | Finding                                                                                | Severity     | Resolution                                          |
| -------------------------------- | -------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------- |
| **1. Firestore Response Rules**  | No explicit responses subcollection rule exists; default deny blocks parent reads      | **CRITICAL** | Add 4-line explicit rule in firestore.rules         |
| **2. Concurrency/Retakes**       | Batch alone insufficient for strong consistency; transaction required for safe retakes | **CRITICAL** | Use Firestore transaction with timestamp ordering   |
| **3. Facilitator Authorization** | Current code allows parents to submit; no facilitator check implemented                | **CRITICAL** | Add assertParentIsFacilitator() in route beforeLoad |
| **4. Firebase-Only Rollback**    | git revert sufficient; no Supabase restoration needed; procedure documented            | **LOW**      | Follow documented rollback procedure                |
| **5. Implementation Boundaries** | Clear separation: (A) persistence, (B) authorization, (C) rules, (D) tests             | **MEDIUM**   | Implement in order: C→A→B, then D for each          |

---

## Unresolved Decisions

**Decision 1**: Timestamp Ordering in Transaction

- **Question**: Use numerical timestamp (Date.now()) or Firestore Timestamp?
- **Impact**: Firestore Timestamp requires .toMillis() for comparison
- **Recommendation**: Use Date.now() for simplicity (all comparisons in milliseconds)

**Decision 2**: Merge vs Replace in Transaction.set()

- **Question**: Use merge:true or merge:false for attempt document?
- **Impact**: merge:false replaces completely; merge:true preserves unspecified fields
- **Recommendation**: Use merge:false to ensure clean state (removes stale fields)

**Decision 3**: Child route unchanged for Phase 7C4B

- **Question**: Does child route need changes after assessment persistence?
- **Impact**: Child route still calls separate recordProgress() (not atomic)
- **Recommendation**: Phase 7C4C can consolidate; not blocking Phase 7C4B

**Decision 4**: Admin vs Facilitator distinction

- **Question**: Should admins bypass facilitator check or require assignment?
- **Impact**: Admins flexible, facilitators strict
- **Recommendation**: Admins bypass assignment check (existing isAdmin() pattern)

**Decision 5**: Firestore response deletion strategy

- **Question**: Delete old responses before new upsert, or upsert only new?
- **Impact**: Delete ensures old questions removed if definition changed
- **Recommendation**: Delete old responses before new write (clean state)

---

## Ready State Assessment

**Baseline Integrity**: ✓ CONFIRMED

- HEAD: b79625f
- TypeScript: 48 errors
- Tests: 531/531 PASS
- Build: PASS
- Git: Clean

**Critical Blockers**: 5 ✓ RESOLVED

1. Response rule: Explicit rule identified
2. Concurrency: Transaction strategy documented
3. Authorization: Facilitator check defined
4. Rollback: Procedure complete
5. Boundaries: Scope clarified

**Implementation Ready**: ✓ YES

All blockers have been investigated, findings documented with code evidence, and solutions specified with exact implementation points.

---
