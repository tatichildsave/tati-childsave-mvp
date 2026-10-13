# PHASE 7C4B: Firebase Assessment Persistence Design Gate

**Date**: 2026-10-08  
**Status**: READ-ONLY DESIGN PHASE (No Implementation Yet)  
**HEAD**: `b79625f` (Harden child session timestamps and Firebase context typing)

---

## 1. Assessment Journey Trace

### 1.1 Pre-Assessment Entry (Child-Facing)

**Route**: `/child/assessment/$assessmentId`  
**File**: `src/routes/child/assessment.$assessmentId.tsx`

**Pre-Load Verification**:

```typescript
beforeLoad: async ({ params }) => {
  await assertChildActivity({
    data: { itemType: "assessment", itemId: params.assessmentId },
  });
};
```

**Function**: `assertChildActivity()` in `child-learning.functions.ts`

- Validates authenticated child session
- Checks assessment exists in current track
- Returns early if any check fails

**Flow**:

1. Get assessment definition from registry
2. Load child learning context (uses authenticated child session)
3. Render AssessmentRunner component
4. Component uses localStorage for resumable state: `tati.assessment.child.{childId}.{assessmentId}`

### 1.2 Assessment Question Loading

**Location**: Assessment definition registry  
**File**: `src/content/assessments/save-junior.ts`

**Pre-Assessment Definition**:

- ID: `save-pre`
- TrackID: `save`
- Type: `"pre"`
- Questions: Array of AssessmentQuestion objects
- Each question has:
  - id (string)
  - assessmentType ("pre" | "post")
  - competency (string: e.g., "spending-decisions")
  - question (string: scenario-style)
  - options: Array of AnswerOption
  - scoring: ScoringRule

**Post-Assessment Definition**:

- ID: `save-post` (assumed, must verify)
- TrackID: `save`
- Type: `"post"`
- showScoreToChild: true (assumed)

### 1.3 Answer Selection and Navigation

**Component**: `src/components/assessment/AssessmentRunner`

- Manages question state
- Handles option selection
- Saves responses to localStorage
- Supports navigation (next/previous)
- Calculates running score via pure engine: `scoreAssessment(definition, responses)`

**Data Structure** (localStorage):

```typescript
{
  "assessmentId": "save-pre",
  "responses": {
    "q1": "option-a",
    "q2": "option-b",
    "q3": "option-a"
  },
  "currentQuestionIndex": 2
}
```

### 1.4 Submission (Child-Facing)

**Function**: `saveChildAssessment()` in `child-learning.functions.ts`

**Server-Side Steps**:

1. Derive authenticated child from session: `getCurrentChildContext()`
2. Validate assessment definition exists
3. Validate assessment in "save" track
4. **Server-side score calculation** (client score ignored):
   - `scoreAssessment(definition, data.responses)`
   - Returns: {points, maxPoints, competencies}
5. Upsert to Supabase: `assessment_attempts` table
   - On conflict: `child_profile_id, assessment_id`
   - Fields: assessment_id, assessment_type, points, max_points, competency_scores, status, completed_at, updated_at
6. Upsert responses to Supabase: `assessment_responses` table
   - One row per question answered
   - Fields: attempt_id, question_id, option_id, points, competency, etc.

**Error Handling**:

```typescript
if (error || !attempt) throw new Error("Could not save that check-in.");
```

**Success Response**: `{ ok: true }`

### 1.5 Progress Recording

**Function**: `record.mutateAsync()` (called AFTER saveChildAssessment succeeds)

**Input** (from child-facing route):

```typescript
{
  itemType: "assessment",
  itemId: assessmentId,
  score: result.points,
  maxScore: result.maxPoints,
  details: { assessmentType: result.assessmentType }
}
```

**Server Function**: `recordProgress()` in `child-learning.functions.ts`

- Routes to Firebase via FirebaseJourneyProgressRepository
- Stores one document: `/families/{familyId}/children/{childId}/journeyProgress/{itemKey}`
  - itemKey: `assessment:{assessmentId}`
- Timestamp: `updatedAt: serverTimestamp()`

### 1.6 Post-Assessment Path (Parent/Facilitator)

**Route**: `/_authenticated/learn/$childId/assessment/$assessmentId`  
**File**: `src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx`

**Pre-Load**:

```typescript
beforeLoad: async ({ params }) => {
  try {
    await assertChildInCurrentFamily(params.childId);
  } catch {
    throw redirect({ to: "/parent" });
  }
};
```

**Events Tracked**:

- "pre_assessment_started" (for pre-assessment only)
- "pre_assessment_completed" (for pre-assessment)
- "post_assessment_completed" (for post-assessment)

**Submission Function**: `saveAssessmentAttempt()` in `attempts.ts`

**Server-Side Steps**:

1. **Client-side Supabase call** (NOT server-only yet)
   - Receives: childId, definition, result
   - Upserts to `assessment_attempts` (same schema as child-facing)
   - Upserts to `assessment_responses`
2. Server-side recordProgress() via server function
3. Show celebration animation
4. Navigate based on assessmentType:
   - Post-assessment: `/learn/{childId}/summary`
   - Pre-assessment: `/learn/{childId}`

### 1.7 Dashboard Progress Display

**Parent Dashboard**:

- Fetches `journeyProgress` via Firebase queries
- Groups by itemType (assessment, lesson, scenario, reflection)
- Shows completion status, score, date

**Child Dashboard** (`/child/learn`):

- Same progress display
- No score shown for pre-assessments

### 1.8 Summary View (Post-Assessment Only)

**Route**: `/_authenticated/learn/$childId/summary`

- Shows competency growth (pre vs post comparison)
- Uses assessment results in journeyProgress.details

### 1.9 Results Retrieval

**Parent Insights Path**:

- Queries `/families/{familyId}/children/{childId}/parentInsights/{insightId}`
- Computed from assessment attempts (pre vs post growth)

---

## 2. Legacy Behavior Inventory

### 2.1 Assessment Attempt Model (Supabase)

**Table**: `assessment_attempts`  
**Primary Key**: `id` (UUID)  
**Unique Constraint**: `(child_profile_id, assessment_id)`  
**Upsert Strategy**: On conflict, update existing attempt

**Fields**:

| Field             | Type       | Required | Behavior                          |
| ----------------- | ---------- | -------- | --------------------------------- |
| id                | UUID       | Yes      | Generated by DB                   |
| assessment_id     | string     | Yes      | "save-pre", "save-post"           |
| assessment_type   | string     | Yes      | "pre" or "post"                   |
| child_profile_id  | string     | Yes      | FK to child_profiles              |
| points            | number     | Yes      | Server-calculated                 |
| max_points        | number     | Yes      | Sum of question maxPoints         |
| competency_scores | JSON       | No       | {competency: {points, maxPoints}} |
| status            | string     | Yes      | Always "completed"                |
| completed_at      | ISO string | Yes      | new Date().toISOString()          |
| created_at        | ISO string | Yes      | Auto-set on insert                |
| updated_at        | ISO string | Yes      | Auto-set on insert/update         |

**Attempt Lifecycle**:

1. Child completes assessment → Upsert creates or updates attempt
2. If child retakes: Existing attempt updated with new score
3. Responses are upserted (old option for same question overwritten)
4. Status always "completed" (no "in-progress" state)

### 2.2 Assessment Response Model (Supabase)

**Table**: `assessment_responses`  
**Primary Key**: `id` (UUID)  
**Unique Constraint**: `(attempt_id, question_id)`  
**Purpose**: Store per-question details for growth analysis

**Fields**:

| Field            | Type       | Required | Behavior                     |
| ---------------- | ---------- | -------- | ---------------------------- |
| id               | UUID       | Yes      | Generated by DB              |
| attempt_id       | string     | Yes      | FK to assessment_attempts.id |
| child_profile_id | string     | Yes      | Denormalized for querying    |
| question_id      | string     | Yes      | Identifies question          |
| competency       | string     | Yes      | Denormalized for aggregation |
| option_id        | string     | No       | Selected answer (nullable)   |
| points           | number     | Yes      | Calculated by engine         |
| max_points       | number     | Yes      | Question's max score         |
| created_at       | ISO string | Yes      | Auto-set on insert           |

**Response Lifecycle**:

1. After attempt saved, filter questions with responses
2. For each question: Create/update response row
3. If child retakes: Old responses for same question are overwritten
4. No soft-delete; updates track score changes

### 2.3 Score Calculation

**Pure Engine**: `scoreAssessment(definition, responses)` in `assessment/engine.ts`

**Returns**:

```typescript
{
  points: number,
  maxPoints: number,
  competencies: Array<{
    competency: string,
    points: number,
    maxPoints: number
  }>
}
```

**Behavior**:

- Deterministic: Same responses → Same score
- Question points via `optionPoints(question, optionId)`
- Max points via `questionMaxPoints(question)`
- No DB lookups; pure calculation

**Security**: Child's submitted score is ignored; server recalculates always

### 2.4 Completion State

**No "in-progress" state**: Assessment only appears in DB after submission  
**Idempotent submission**: Multiple POSTs for same assessment → Last write wins  
**Timestamp tracking**: `completed_at` and `updated_at` track submission time

### 2.5 Retry Behavior

**Allowed Retries**: Child can retake assessment unlimited times  
**Previous Results**: Overwritten by latest attempt  
**History**: No historical record of previous attempts (only latest stored)  
**Growth Tracking**: Pre vs post used for progress measurement

### 2.6 Error Handling (Current)

**Client Submission Errors**:

```typescript
catch (error) {
  setSubmitError("We couldn't save your answers. Your answers are still here. Try again.");
  setIsSubmitting(false);
}
```

**Mechanism**: LocalStorage persists responses → Retry on connection restore  
**No Compensation**: No credit given for failed submissions  
**No Replay Logic**: User must resubmit manually

### 2.7 Return Values

**Child-Facing Success**: `{ ok: true }`  
**Parent-Facing Success**: `void` (saveAssessmentAttempt returns nothing)  
**Error**: Throws Error (caught by route handler)

---

## 3. Existing Firebase Infrastructure

### 3.1 Established Collections

**Families**:

```
/families/{familyId}
  - name (string)
  - createdBy (string: userId)
  - status ("active" | "disabled")
  - createdAt (Timestamp)
  - updatedAt (Timestamp)
```

**Children**:

```
/families/{familyId}/children/{childId}
  - tatiId (string)
  - name (string)
  - age (number)
  - avatar (string)
  - tier ("junior")
  - curriculumLevel (number | null)
  - familyId (string)
  - createdBy (string: userId)
  - facilitatorUids (array of strings)
  - createdAt (Timestamp)
  - updatedAt (Timestamp)
```

**Journey Progress** (ALREADY IN FIREBASE):

```
/families/{familyId}/children/{childId}/journeyProgress/{itemKey}
  - id (string: "itemType:itemId")
  - familyId (string)
  - childId (string)
  - child_profile_id (string)
  - track_id ("save")
  - item_type ("assessment" | "lesson" | "scenario" | "reflection")
  - item_id (string)
  - status ("completed")
  - score (number | null)
  - max_score (number | null)
  - details (JSON: {assessmentType, responses, competencies})
  - createdAt (Timestamp)
  - updatedAt (Timestamp)
```

**Competencies** (ALREADY IN FIREBASE):

```
/families/{familyId}/children/{childId}/competencies/{competencyId}
  - competencyId (string)
  - score (number)
  - level (string)
  - evidence (JSON)
  - updatedAt (Timestamp)
```

**Sessions** (Server-only, Firestore rules deny all client access):

```
/families/{familyId}/children/{childId}/sessions/{sessionId}
  - childId (string)
  - familyId (string)
  - tokenHash (string)
  - createdAt (Timestamp)
  - expiresAt (Timestamp)
  - revokedAt (Timestamp | null)
  - lastSeenAt (Timestamp | null)
```

### 3.2 Pre-Defined Assessment Paths

**Firestore Rules** (Line 143):

```
match /assessmentAttempts/{attemptId} {
  allow read: if canAccessChild(familyId, childId);
  allow write: if false;
}
```

**Status**: Path defined but NOT implemented in repositories or types

### 3.3 Authorization Functions (Firestore Rules)

```typescript
function canAccessChild(familyId, childId) {
  return isFamilyAdult(familyId)
    || isAssignedFacilitator(familyId, childId)
    || isAdmin();
}

function isFamilyAdult(familyId) {
  return isActiveFamilyMember(familyId)
    && get(memberPath(familyId)).data.role in ['parent', 'guardian'];
}

function isAssignedFacilitator(familyId, childId) {
  return signedIn()
    && hasRole('facilitator')
    && 'facilitatorUids' in get(/databases/.../children/{childId}).data
    && get(...).data.facilitatorUids.hasAny([request.auth.uid]);
}
```

### 3.4 Firebase Admin SDK Usage

**Bypass Rules**: Admin SDK bypasses Firestore Security Rules  
**Server-Only Enforcement**: Authorization must be independently enforced on server

**Current Repositories**:

- FirebaseFamilyRepository
- FirebaseChildProfileRepository
- FirebaseJourneyProgressRepository
- FirebaseCompetencyRepository
- FirebaseAchievementRepository

**Missing**: FirebaseAssessmentRepository (no assessment methods)

### 3.5 Existing Firestore Type Definitions

**File**: `src/integrations/firebase/firestore-types.ts`

Currently defined:

- FirestoreUserDocument
- FirestoreFamilyDocument
- FirestoreFamilyMemberDocument
- FirestoreChildDocument
- FirestoreJourneyProgressDocument
- FirestoreCompetencyDocument
- FirestoreAchievementDocument
- FirestoreChildCredentialDocument
- FirestoreChildSessionDocument
- FirestoreChildAuthIdentityDocument

**Missing**:

- FirestoreAssessmentAttemptDocument
- FirestoreAssessmentResponseDocument

---

## 4. Proposed Firestore Data Model

### 4.1 Assessment Attempt Document

**Path**: `/families/{familyId}/children/{childId}/assessmentAttempts/{attemptId}`  
**Unique Constraint**: Enforce via document ID = `{assessmentId}` (no UUID needed)

**Schema**:

```typescript
interface FirestoreAssessmentAttemptDocument {
  // Identifiers
  id: string; // Document ID = assessmentId (save-pre, save-post)
  assessmentId: string; // Denormalized (= id)
  childId: string; // Denormalized for query efficiency
  familyId: string; // Denormalized for query efficiency

  // Assessment metadata
  assessmentType: "pre" | "post"; // From definition

  // Scoring
  points: number; // Server-calculated total
  maxPoints: number; // Sum of question max scores
  competencyScores: Record<
    string,
    {
      // {competency: {points, maxPoints}}
      points: number;
      maxPoints: number;
    }
  >;

  // Status tracking
  status: "completed"; // Only "completed" state
  completedAt: Timestamp; // When submitted

  // Timestamps
  createdAt: Timestamp; // First attempt (for history if needed)
  updatedAt: Timestamp; // Latest update (for upsert detection)
}
```

**Rationale**:

- Document ID = assessmentId enforces uniqueness per child per assessment
- No UUID needed; assessment ID is stable identifier
- Denormalized familyId and childId for efficient queries
- Timestamp handling via strict type guards (Phase 7C4A security)

### 4.2 Assessment Response Document

**Path**: `/families/{familyId}/children/{childId}/assessmentAttempts/{attemptId}/responses/{questionId}`  
**Unique Constraint**: One response per question per attempt  
**Document ID**: `{questionId}` (stable, naturally unique)

**Schema**:

```typescript
interface FirestoreAssessmentResponseDocument {
  // Identifiers
  id: string; // Document ID = questionId
  questionId: string; // Denormalized
  attemptId: string; // Parent document ID (for cascade delete)

  // Response data
  optionId: string | null; // Selected answer (nullable if unanswered)

  // Scoring
  points: number; // Points earned for this question
  maxPoints: number; // Max possible for this question

  // Competency tracking
  competency: string; // denormalized from question definition

  // Timestamps
  createdAt: Timestamp; // When question answered
  updatedAt: Timestamp; // When response changed (retake)
}
```

**Rationale**:

- Nested under assessment attempt for logical grouping
- Allows per-question queries (e.g., "how many chose option A")
- Enables competency aggregation across responses
- Supports parent insights (growth by competency)

### 4.3 Alternative: Flat Response Storage

**Option Not Recommended**: Store responses in attempt document as array

- Reason: Firestore limits single document to 1MB; could exceed with many retakes
- Reason: Per-question queries would require full document read

**Chosen**: Nested subcollection (current schema above)

---

## 5. Repository Interface (Firebase)

### 5.1 FirebaseAssessmentRepository

**File**: Add to `src/lib/backend/firebase/repositories.ts`

**Interface** (from contracts):

```typescript
export interface AssessmentService {
  saveAttempt(
    childId: string,
    definition: AssessmentDefinition,
    result: AssessmentResult,
  ): Promise<void>;
}
```

**Implementation**:

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
    // Server-side score recalculation (verification)
    const calculatedResult = scoreAssessment(definition, result.responses);

    // Upsert assessment attempt
    const attemptRef = this.db
      .collection("families")
      .doc(this.familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc(definition.id); // Document ID = assessmentId

    const competencyScores = Object.fromEntries(
      calculatedResult.competencies.map((c) => [
        c.competency,
        { points: c.points, maxPoints: c.maxPoints },
      ]),
    );

    await attemptRef.set(
      {
        id: definition.id,
        assessmentId: definition.id,
        childId,
        familyId: this.familyId,
        assessmentType: definition.assessmentType,
        points: calculatedResult.points,
        maxPoints: calculatedResult.maxPoints,
        competencyScores,
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ); // Merge to preserve createdAt on upsert

    // Upsert responses
    const batch = this.db.batch();
    for (const question of definition.questions) {
      if (!result.responses[question.id]) continue; // Skip unanswered

      const responseRef = attemptRef.collection("responses").doc(question.id);

      batch.set(responseRef, {
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

    await batch.commit();
  }
}
```

### 5.2 Query Methods (Read)

**Not Yet Designed**: Parent dashboard queries TBD  
**Placeholder Methods**:

```typescript
async getAttempt(childId: string, assessmentId: string): Promise<AssessmentAttempt | null>;
async listAttempts(childId: string): Promise<AssessmentAttempt[]>;
async getResponses(childId: string, assessmentId: string): Promise<AssessmentResponse[]>;
```

**Decision**: Defer query methods to Phase 7C4C (parent dashboard)

---

## 6. Authorization Design

### 6.1 Child-Facing (Session-Based)

**Authenticated Context**: Derived from HTTP-only session cookie

```typescript
const context = await getCurrentChildContext();
// Returns: { childId, sessionId, createdAt, expiresAt, revokedAt }
```

**Enforcement**:

1. **Identity Derivation**: `getCurrentChildContext()` extracts childId from server-side session
2. **Immutability**: Caller cannot override childId (derived from session, not parameter)
3. **Expiration Check**: Session validated upstream; `validateChildSession()` rejects expired
4. **Revocation Check**: Revoked sessions rejected upstream
5. **Family Isolation**: familyId derived from child record; assessments only for that child

**Caller-Supplied Parameters**:

- assessmentId (validated against track)
- responses (recalculated on server)

**Child Cannot**:

- ✗ Submit another child's responses
- ✗ Override their own childId
- ✗ Access after session expiration
- ✗ Access after session revocation
- ✗ Use another child's assessment attempt

### 6.2 Parent/Facilitator (Firebase Auth)

**Authenticated Context**: Firebase Auth user (parent/facilitator/admin)

```typescript
await assertChildInCurrentFamily(childId);
// Verifies: (canAccessChild OR isAdmin)
```

**Enforcement** (via Firestore rules + server checks):

1. **Family Membership**: Parent must be in family that owns childId
2. **Role Verification**: Facilitator must have `facilitatorUids` entry for this child
3. **Admin Bypass**: Admins can access any child
4. **Read-Only Access**: Parent cannot modify assessment attempts (server-only writes)
5. **Integrity**: Cannot forge childId or familyId in requests

**Parent Cannot**:

- ✗ Modify child's assessment submission
- ✗ Edit scores or responses
- ✗ Access another family's child
- ✗ Override facilitator assignment

### 6.3 Firestore Security Rules

**Existing Rule** (already in firestore.rules):

```
match /assessmentAttempts/{attemptId} {
  allow read: if canAccessChild(familyId, childId);
  allow write: if false;  // Server-only (Admin SDK)
}
```

**No Changes Required**: Rule already enforces server-only writes

### 6.4 Server-Side Checks (Implementation)

**In saveChildAssessment()** (child-facing):

```typescript
// 1. Derive child from session
const context = await getCurrentChildContext();
const childId = context.childId;

// 2. Validate assessment definition
const definition = getAssessmentDefinition(data.assessmentId);
if (!definition) throw new AuthorizationError("Assessment not available");

// 3. Validate track membership
if (definition.trackId !== "save") throw new AuthorizationError("Assessment not in this track");

// 4. Validate familyId consistency (derived from child record)
const childRecord = await loadChildProfile(childId);
const familyId = childRecord.family_id;

// 5. Compute score (verify data integrity)
const calculatedResult = scoreAssessment(definition, data.responses);

// 6. Store in Firebase under authenticated child's path
await new FirebaseAssessmentRepository(db, familyId).saveAttempt(
  childId,
  definition,
  calculatedResult,
);
```

**In saveAssessmentAttempt()** (parent/facilitator, if converted to server-side):

```typescript
// Similar flow but derives parent context instead
const parentContext = await getAuthenticatedParent();

// Verify parent can access this child
await assertChildInCurrentFamily(childId);

// Then proceed with same scoring/storage logic
```

---

## 7. Scoring and Progress Design

### 7.1 Score Calculation

**Responsibility**: Server-side only  
**Engine**: `scoreAssessment(definition, responses)` in `assessment/engine.ts`

**Flow**:

1. Iterate through definition.questions
2. For each question with a response:
   - Look up option via `result.responses[question.id]`
   - Calculate points via `optionPoints(question, optionId)`
   - Sum into competency score
3. Return: {points, maxPoints, competencies}

**Immutability**: Client-supplied score ignored; recalculated always

### 7.2 Progress Recording

**Function**: `recordProgress()` in `child-learning.functions.ts`

**Current Flow** (via journeyProgress):

```typescript
const itemKey = `assessment:${assessmentId}`;
await db
  .collection("families")
  .doc(familyId)
  .collection("children")
  .doc(childId)
  .collection("journeyProgress")
  .doc(itemKey)
  .set(
    {
      score: result.points,
      maxScore: result.maxPoints,
      details: {
        assessmentType: result.assessmentType,
        responses: result.responses, // Stored but not displayed to child
        competencies: result.competencies,
      },
    },
    { merge: true },
  );
```

**Behavior**:

- One journeyProgress record per assessment (upsert)
- Timestamp: `updatedAt` tracks latest completion
- Details include competency breakdown

### 7.3 Competency Updates

**Not Yet Implemented**: Competency collection should reflect assessment results

**Future Design** (Phase 7C4C):

```typescript
// For each competency in assessment result:
for (const comp of result.competencies) {
  const competencyDoc = db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .collection("competencies")
    .doc(comp.competency);

  await competencyDoc.set({
    competencyId: comp.competency,
    score: comp.points,
    maxPoints: comp.maxPoints,
    level: deriveLevel(comp),  // e.g., "beginner" | "developing" | "proficient"
    evidence: { assessmentId, assessmentType, ... },
    updatedAt: serverTimestamp()
  }, { merge: true });
}
```

### 7.4 Growth Tracking (Parent Insights)

**Pre vs Post**: Stored as separate attempts (assessmentType distinguishes)

**Comparison** (Phase 7C4C):

```typescript
const preAttempt = await getAttempt(childId, "save-pre");
const postAttempt = await getAttempt(childId, "save-post");

if (preAttempt && postAttempt) {
  const growth = {
    initial: preAttempt.competencyScores,
    latest: postAttempt.competencyScores,
    improvement: computeImprovement(pre, post),
  };
}
```

---

## 8. Idempotency and Failure Handling

### 8.1 Duplicate Submissions

**Problem**: Browser could submit twice if:

- User clicks submit twice before response
- Network retry fires silently
- Refresh during submission

**Solution**: Document ID = assessmentId enforces idempotency

```typescript
// First POST: Creates document
// Second POST: merge: true overwrites with same data (idempotent)
```

**Cost**: Last write wins; older submission overwritten (acceptable per current behavior)

### 8.2 Browser Refresh During Assessment

**Current State**: LocalStorage persists responses

```typescript
storageKey={`tati.assessment.child.${data.profile.id}.${assessmentId}`}
```

**On Refresh**:

1. AssessmentRunner rehydrates from localStorage
2. User can resume answering
3. Submit again (will succeed via idempotent upsert)

**No Changes Needed**: Existing localStorage strategy sufficient

### 8.3 Interrupted Submissions

**Firestore Batch Writes**: Atomic attempt + responses

**Scenario**: Connection lost after attempt written, before responses complete

- Batch ensures all-or-nothing
- If batch fails: Exception caught; user sees error and can retry
- If batch partially succeeds: Batch semantics prevent this (atomic)

**Implementation** (in saveAttempt):

```typescript
const batch = this.db.batch();

// Write attempt
batch.set(attemptRef, attemptData, { merge: true });

// Write responses
for (const question of definition.questions) {
  if (!result.responses[question.id]) continue;
  batch.set(responseRef, responseData);
}

await batch.commit(); // All-or-nothing
```

### 8.4 Repeated Attempts

**Allowed**: Child can retake unlimited times  
**Storage**: Latest attempt stored (previous attempts not kept)

**Example Timeline**:

- T1: Child takes save-pre, scores 8/10, stored
- T2: Child takes save-pre again, scores 9/10, stored (T1 overwritten)
- journeyProgress updated with latest score

**Justification**: Matches current Supabase behavior (upsert)

### 8.5 Pre vs Post Separation

**Assessment IDs**: Different IDs ("save-pre", "save-post")

**Storage**: Separate documents

- `/assessmentAttempts/save-pre`
- `/assessmentAttempts/save-post`

**Separation Guaranteed**: By document ID

### 8.6 Scoring Consistency

**Server-Side Recalculation**: Eliminates client tampering

**Verification**:

1. Client submits responses
2. Server recalculates score via pure engine
3. Server stores recalculated score (client score ignored)
4. Stored score matches recalculation (if no code change)

**Audit Trail**: Not stored; recalculation on-demand possible if engine unchanged

### 8.7 Partial Writes

**Batch Semantics**: Firestore batches guarantee atomicity within 500 operations

- Attempt: 1 write
- Responses: 1-N writes (one per question)
- Total: ~10-20 writes (well under limit)

**Partial Writes Prevented**: Batch fails entirely if any operation fails

### 8.8 Firestore Write Failures

**Transient Failures** (network, throttling):

- Automatic retry via client SDK (exponential backoff)
- If persistent: Exception bubbles to error handler
- User sees: "We couldn't save your answers. Your answers are still here. Try again."

**Permanent Failures** (permission denied, invalid data):

- Exception caught; user informed
- LocalStorage persists; user can review and retry
- No automatic compensation

**Recovery Strategy**: User must retry manually (matches current behavior)

---

## 9. Test Plan

### 9.1 Unit Tests (Pure Logic)

**File**: `tests/firebase/assessment-scoring.test.ts`

1. **Score calculation accuracy**
   - Input: Definition + responses
   - Output: Correct points and competency breakdown
   - No DB calls needed

2. **Competency aggregation**
   - Multiple questions per competency
   - Correct max points per competency

### 9.2 Integration Tests (Firebase Emulator)

**File**: `tests/firebase/assessment-persistence.test.ts`

3. **Valid pre-assessment submission**
   - Setup: Child with session, pre-assessment definition
   - Action: Call saveChildAssessment() with valid responses
   - Assert: Document created at correct path
   - Assert: Responses subcollection populated
   - Assert: Score correct

4. **Valid post-assessment submission**
   - Same as above but assessmentType="post"

5. **Correct answer persistence**
   - Setup: Multiple responses to different questions
   - Action: Submit assessment
   - Assert: Each response stored correctly
   - Assert: optionId matches submission

6. **Correct score calculation**
   - Setup: Responses with known points
   - Action: Submit assessment
   - Assert: points = expected
   - Assert: maxPoints = expected
   - Assert: competencyScores correct per question

7. **Progress update**
   - Setup: Submit assessment
   - Action: Query journeyProgress collection
   - Assert: journeyProgress record created
   - Assert: score and details stored

8. **Invalid child session**
   - Setup: No session or invalid session
   - Action: Try to submit assessment
   - Assert: AuthorizationError thrown
   - Assert: No document written

9. **Expired child session**
   - Setup: Session past expiresAt
   - Action: Try to submit assessment
   - Assert: AuthorizationError thrown
   - Assert: Firestore rules deny write (if applicable)

10. **Cross-child access rejection**
    - Setup: Child A's session, Child B's assessment attempt query
    - Action: Try to read another child's assessment
    - Assert: Firestore rules deny read (client-side)
    - Assert: (Server-side: context.childId mismatch → error)

11. **Duplicate submission handling**
    - Setup: Submit assessment twice with same responses
    - Action: First submit, then second submit
    - Assert: First and second both succeed (idempotent)
    - Assert: Document updated, not duplicated
    - Assert: responses subcollection also idempotent

12. **Partial-write prevention**
    - Setup: Submission with many responses (simulated failure in batch)
    - Action: Inject Firestore failure in batch.commit()
    - Assert: Exception caught
    - Assert: No partial writes visible
    - (This may require mock; emulator may not support injection)

13. **Firebase write failure**
    - Setup: Network failure simulation
    - Action: Try to submit during failure
    - Assert: Exception caught
    - Assert: Error message shown to user
    - Assert: LocalStorage persists (can retry)

14. **Existing assessment result retrieval**
    - Setup: Submit assessment, store in Firebase
    - Action: Query assessmentAttempts collection
    - Assert: Can retrieve attempt
    - Assert: Responses queryable

15. **Parent read-only access**
    - Setup: Parent user, child assessment in Firebase
    - Action: Read assessment via parent session (browser)
    - Assert: Firestore rules allow read
    - Assert: Cannot write (rules deny client writes)

16. **Regression of existing assessment behavior**
    - Setup: Existing assessments in Supabase
    - Action: (Phase 7C4C) Migrate to Firebase
    - Assert: Scores match Supabase
    - Assert: Responses intact
    - Assert: No data loss

### 9.3 E2E Tests (Browser)

**Not in Scope for 7C4B**: Design phase only  
**Deferred to 7C4C**: Full browser assessment flow

---

## 10. Exact Implementation File Scope

### 10.1 Files to Create

1. **`src/integrations/firebase/firestore-types.ts` — Add Types**
   - FirestoreAssessmentAttemptDocument
   - FirestoreAssessmentResponseDocument

   ```typescript
   export interface FirestoreAssessmentAttemptDocument {
     id: string;
     assessmentId: string;
     childId: string;
     familyId: string;
     assessmentType: "pre" | "post";
     points: number;
     maxPoints: number;
     competencyScores: Record<string, { points: number; maxPoints: number }>;
     status: "completed";
     completedAt: Timestamp;
     createdAt: Timestamp;
     updatedAt: Timestamp;
   }

   export interface FirestoreAssessmentResponseDocument {
     id: string;
     questionId: string;
     attemptId: string;
     optionId: string | null;
     points: number;
     maxPoints: number;
     competency: string;
     createdAt: Timestamp;
     updatedAt: Timestamp;
   }
   ```

2. **`src/lib/backend/contracts.ts` — Update Interface**
   - Already has AssessmentService and AssessmentResponseService
   - No changes needed (methods already defined)

3. **`src/lib/backend/firebase/repositories.ts` — Add Class**
   - FirebaseAssessmentRepository (implements AssessmentService)
   - ~100 lines (see Section 5 for implementation)

4. **`tests/firebase/assessment-persistence.test.ts` — New Test File**
   - Comprehensive test suite (tests 1-14 from Section 9.2)
   - ~400-500 lines
   - Requires Firestore emulator

### 10.2 Files to Modify

1. **`src/lib/auth/child-learning.functions.ts`**
   - Update `saveChildAssessment()` handler
   - **Current**: Upserts to Supabase
   - **After 7C4B**: Replaces Supabase call with Firebase repo

   ```typescript
   // OLD (Phase 7C4A):
   const { data: attempt, error } = await supabase
     .from("assessment_attempts")
     .upsert({ ... });

   // NEW (Phase 7C4B):
   const assessmentRepo = new FirebaseAssessmentRepository(db, context.familyId);
   await assessmentRepo.saveAttempt(childId, definition, calculatedResult);
   ```
   - No other changes to function signature or authorization
   - Line count: ~20 line diff
   - Risk: Low (pure replacement, same interface)

2. **`src/routes/child/assessment.$assessmentId.tsx`**
   - **Change**: None (route already calls saveChildAssessment)
   - Verification: Confirm route still works with updated function

3. **`src/lib/assessment/attempts.ts`**
   - **Decision**: Keep Supabase version for parent-facing path (for now)
   - **Reason**: Parent path uses client-side Supabase (deferred server conversion)
   - **Change**: None in Phase 7C4B
   - **Future Phase 7C4C**: Convert to server-side Firebase call

4. **`src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx`**
   - **Decision**: Keep current implementation (client-side Supabase)
   - **Future Phase 7C4C**: Convert to server function + Firebase

### 10.3 Existing Code to Reuse

1. **scoreAssessment()** in `assessment/engine.ts`
   - No changes; already pure and server-safe
   - Used by both child-facing and parent-facing paths

2. **optionPoints() and questionMaxPoints()** in `assessment/engine.ts`
   - No changes; helper functions

3. **FirebaseJourneyProgressRepository**
   - Already handles journeyProgress updates
   - recordProgress() called after assessment save
   - No changes needed

4. **getCurrentChildContext()** in `child-session.server.ts`
   - Already provides authenticated childId and familyId
   - No changes needed

5. **getFirebaseAdminDb()** in `integrations/firebase/admin.server.ts`
   - Already provides Firestore instance
   - No changes needed

### 10.4 Expected TypeScript Errors Addressed

**Phase 7C4A Baseline**: 48 errors

**Phase 7C4B Expected**:

- TS2339: Firebase namespace expansion (if new types not exported)
- TS2304: Import paths (ensure FirebaseAssessmentRepository exported)
- TS2724: Child-learning.functions.ts type mismatch if repository signature changes

**Mitigation**:

- Export all new types from firestore-types.ts
- Export FirebaseAssessmentRepository from repositories.ts
- Verify imports in child-learning.functions.ts

**Target**: No new TypeScript errors; 48 errors or fewer

### 10.5 Tests to Add

1. **`tests/firebase/assessment-persistence.test.ts`** (NEW)
   - Comprehensive suite: tests 1-14 from Section 9.2
   - ~450 lines
   - Requires Firestore emulator (`FIRESTORE_EMULATOR_HOST`)

2. **No other new test files needed for Phase 7C4B**
   - Parent-facing tests deferred to Phase 7C4C
   - Regression tests (save-pre vs save-post) added to 7C4C

### 10.6 Risks and Mitigations

| Risk                                        | Severity | Mitigation                                                                               |
| ------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| Firestore write failure during submission   | Medium   | Batch semantics ensure atomicity; error handling matches current behavior (user retries) |
| Session validation timing                   | Low      | validateChildSession() already upstream; no change                                       |
| Wrong familyId used for storage             | High     | familyId derived from child record via loadChildProfile(); not user-supplied             |
| Timestamp serialization (Firestore vs JSON) | Low      | Phase 7C4A security corrections ensure strict validation                                 |
| Duplicate submission edge case              | Low      | Document ID = assessmentId enforces idempotency via upsert semantics                     |
| Partial batch write                         | Very Low | Firestore batch is atomic; tested in test suite                                          |
| Competency score mismatch                   | Medium   | Server-side recalculation via scoreAssessment() verifies integrity                       |
| Authorization bypass (child cross-access)   | Medium   | Firestore rules deny; server context.childId from session (not parameter)                |

### 10.7 Verification Commands

**Post-Implementation** (Phase 7C4B Completion):

```bash
# TypeScript check
npx tsc --noEmit

# Lint
npm run lint

# Unit tests (assessment scoring)
npx vitest run tests/firebase/assessment-scoring.test.ts

# Integration tests (Firebase emulator required)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx vitest run tests/firebase/assessment-persistence.test.ts

# Full test suite
npx vitest run --no-isolate

# Production build
npm run build

# Git diff check
git diff --check

# Expected state
git status --short
git diff --stat
```

**Expected Results**:

- TypeScript: 48 or fewer errors
- All assessment tests: 15+ PASS
- Full test suite: 531+ PASS (or +15 from new tests)
- Build: SUCCESS
- No whitespace errors

### 10.8 Rollback Strategy

**If Phase 7C4B Fails**:

1. **git revert** (if committed)

   ```bash
   git revert <commit-hash>
   ```

2. **Revert Supabase dependency** in child-learning.functions.ts

   ```typescript
   // Restore saveChildAssessment to original Supabase upsert
   ```

3. **Remove new files**:
   - Delete FirestoreAssessmentRepository
   - Delete new test files
   - Revert firestore-types.ts

4. **Verify**:
   - All tests pass (531/531)
   - No new TypeScript errors
   - No build issues

**Timeline**: <30 minutes (straightforward revert)

---

## 11. Git Integrity Confirmation

### 11.1 Current State (Pre-7C4B)

**HEAD**: `b79625f` (Harden child session timestamps and Firebase context typing)

```
git status --short
(output: only untracked audit documents, no modified production code)

git diff --check
(output: pass, no whitespace errors)

git diff --stat
(output: 0 insertions, 0 deletions – no uncommitted changes)
```

### 11.2 No Changes Made in Design Phase

**Verification**:

- ✓ No files modified
- ✓ No test files added
- ✓ No code committed
- ✓ Git history intact
- ✓ HEAD remains b79625f

### 11.3 Post-7C4B Expected Changes

**After Implementation** (Phase 7C4B):

```
Modified Files (3):
  - src/integrations/firebase/firestore-types.ts           +20, -0
  - src/lib/backend/firebase/repositories.ts              +100, -0
  - src/lib/auth/child-learning.functions.ts              +15, -10

New Files (2):
  - src/lib/backend/firebase/assessment.repository.ts     +100, -0
  - tests/firebase/assessment-persistence.test.ts         +450, -0

Total: 685 insertions(+), 10 deletions(-)
```

---

## Summary

### Assessment Journey (Complete Trace)

1. **Pre-Load**: Child authenticates; assertChildActivity checks assessment + track
2. **Load**: Definition from registry; component uses localStorage for resumable state
3. **Question Display**: Pure AssessmentRunner component; no DB calls during assessment
4. **Submission**: saveChildAssessment() server function
   - Derives childId from session
   - Recalculates score server-side
   - Upserts to Firebase assessmentAttempts
   - Upserts responses subcollection
5. **Progress**: recordProgress() stores to journeyProgress with score and details
6. **Navigation**: Redirect to dashboard or summary

### Legacy Behavior (Supabase Current)

- Assessment attempts stored in assessment_attempts table
- One row per child per assessment (upsert on re-attempt)
- Assessment responses stored in assessment_responses table
- One row per question per attempt
- Score calculated server-side; client score ignored
- Status always "completed" (no in-progress)
- Timestamps track submission time
- Error handling via localStorage retry

### Firebase Implementation

- **New Collections**: assessmentAttempts (with nested responses subcollection)
- **New Types**: FirestoreAssessmentAttemptDocument, FirestoreAssessmentResponseDocument
- **New Repository**: FirebaseAssessmentRepository (implements AssessmentService)
- **Authorization**: Session-derived childId (child-facing); family-based access (parent-facing)
- **Idempotency**: Document ID = assessmentId ensures duplicate submissions are no-op
- **Atomicity**: Firestore batch ensures attempt + responses written together

### Data Model

```
/families/{familyId}/children/{childId}/assessmentAttempts/{assessmentId}
  - id, assessmentId, childId, familyId
  - assessmentType, points, maxPoints, competencyScores
  - status, completedAt, createdAt, updatedAt
  /responses/{questionId}
    - id, questionId, attemptId, optionId
    - points, maxPoints, competency
    - createdAt, updatedAt
```

### Authorization

- **Child**: Authenticated via session; childId derived server-side (immutable)
- **Parent**: Authenticated via Firebase Auth; access verified via assertChildInCurrentFamily()
- **Firestore Rules**: canAccessChild(familyId, childId) enforces parent/facilitator/admin read; server-only writes
- **Server Checks**: Assessment definition validated; track membership verified; child context validated

### Test Coverage

- 14 integration tests covering all paths:
  1. Pre-assessment submission
  2. Post-assessment submission
  3. Answer persistence
  4. Score calculation
  5. Progress update
  6. Invalid session rejection
  7. Expired session rejection
  8. Cross-child access denial
  9. Duplicate submission handling
  10. Partial write prevention
  11. Firebase failure handling
  12. Result retrieval
  13. Parent read-only access
  14. Existing behavior regression

### Implementation Scope

- **Files to Create**: 2 (types extension, repository class, test file)
- **Files to Modify**: 1 (child-learning.functions.ts — minimal diff)
- **Reusable Code**: 5+ existing functions (scoreAssessment, auth, progress)
- **No Breaking Changes**: Child-facing route unchanged; function interface stable
- **Risk**: Low (targeted replacement, extensive testing)

---

**PHASE 7C4B DESIGN COMPLETE — AWAITING IMPLEMENTATION APPROVAL**

---

## APPENDIX: Firestore Rules Verification

**Current Rule** (firestore.rules, line 143):

```
match /assessmentAttempts/{attemptId} {
  allow read: if canAccessChild(familyId, childId);
  allow write: if false;
}
```

**Status**: ✓ No changes needed; already in place

**Enforcement**:

- Read: canAccessChild() allows family adults, assigned facilitators, admins
- Write: Denied to all clients; Admin SDK bypasses for server operations
- No nested rules needed (responses subcollection inherits parent rules)
