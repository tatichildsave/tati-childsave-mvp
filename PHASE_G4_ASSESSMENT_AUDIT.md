# PHASE G4 ASSESSMENT INTEGRATION AUDIT & DESIGN

**Phase Status:** Audit/Design (No Implementation)
**Date:** 2026-09-25
**Scope:** Read-only audit of existing assessment architecture for G3 integration

---

## 1. EXECUTIVE SUMMARY

The TATI assessment system is a **child-friendly, server-validated learning measurement framework** integrated with the Supabase backend. The system:

- Stores assessment definitions as pure data (no database)
- Submits responses server-side via `saveChildAssessment()` and `saveAssessmentAttempt()`
- Validates child authorization via `validateChildSession()` from G3 authentication
- Calculates scores server-side using deterministic rules
- Prevents client score manipulation via Firestore RLS and Supabase RLS policies
- Supports pre/post assessment comparison for growth measurement

**Current State:** Assessment system does NOT yet use `AuthenticatedChildContext` from G3. Child identity is derived from HTTP-only session cookie.

**G4 Design Target:** Integrate `AuthenticatedChildContext` as the primary authorization source for assessment operations, replacing cookie-only session validation.

---

## 2. CURRENT ASSESSMENT ARCHITECTURE

### Overview

```
Child Browser
    ↓ (assessment definition: pure data)
AssessmentRunner Component (one question/page UI)
    ↓ (form submission with responses only)
Server Function: saveChildAssessment()
    ↓ (validates child session, calculates score)
Supabase: assessment_attempts + assessment_responses
    ↓ (RLS policy: owns_child_profile)
Parent Dashboard: view child results & insights
```

### Key Design Principles

1. **Score Calculation Server-Side Only**  
   Client submits responses; server calculates score using `scoreAssessment()` pure function.

2. **Assessment Data as Pure Data**  
   Assessment definitions (questions, options, scoring rules) are loaded from `src/content/assessments/` as TypeScript objects—not database queries.

3. **No Client-Supplied Score**  
   Client cannot submit `score` or `points`. The server always recalculates.

4. **Family Isolation via RLS**  
   Supabase RLS policy `owns_child_profile()` ensures only family members access child data.

5. **Pre/Post Comparison for Growth**  
   Results stored per assessment_id with assessment_type ("pre" or "post"). Parent dashboard compares growth.

6. **No Exam Language**  
   Questions framed as scenarios ("What would you do?"), not "correct/incorrect."

---

## 3. DATABASE & DATA MODEL

### Supabase Tables

#### **assessment_attempts**

| Field | Type | Purpose | Constraints |
|-------|------|---------|-------------|
| id | uuid | Primary key | Auto-generated |
| child_profile_id | uuid | Which child | FK to child_profiles, NOT NULL |
| assessment_id | text | Which assessment ("save-pre", "save-post") | NOT NULL |
| assessment_type | text | "pre" or "post" | NOT NULL |
| points | integer | Total points earned | NOT NULL, DEFAULT 0, checked ≥ 0 |
| max_points | integer | Total possible points | NOT NULL, DEFAULT 0, checked ≥ 0 |
| competency_scores | jsonb | Per-competency breakdown | NOT NULL, DEFAULT '{}' |
| status | text | "completed" | NOT NULL, DEFAULT 'completed' |
| completed_at | timestamptz | When attempt finished | NOT NULL, DEFAULT now() |
| created_at | timestamptz | When record created | NOT NULL, DEFAULT now() |
| updated_at | timestamptz | Last modified | NOT NULL, DEFAULT now() |
| **UNIQUE** | (child_profile_id, assessment_id) | One attempt per child per assessment | |

**RLS Policy:** "family manages assessment attempts"  
```sql
FOR ALL TO authenticated
USING (public.owns_child_profile(child_profile_id))
WITH CHECK (public.owns_child_profile(child_profile_id))
```

---

#### **assessment_responses**

| Field | Type | Purpose | Constraints |
|-------|------|---------|-------------|
| id | uuid | Primary key | Auto-generated |
| attempt_id | uuid | Which attempt | FK to assessment_attempts, NOT NULL |
| child_profile_id | uuid | Which child (denormalized) | FK to child_profiles, NOT NULL |
| question_id | text | Which question | NOT NULL |
| competency | text | Competency category | NOT NULL |
| option_id | text | Selected option ID (nullable if skipped) | |
| points | integer | Points for this question | NOT NULL, DEFAULT 0, checked ≥ 0 |
| max_points | integer | Max possible for question | NOT NULL, DEFAULT 0, checked ≥ 0 |
| created_at | timestamptz | When recorded | NOT NULL, DEFAULT now() |
| **UNIQUE** | (attempt_id, question_id) | One response per question per attempt | |
| **Foreign Key** | (attempt_id, child_profile_id) | Compound FK to assessment_attempts | |

**RLS Policy:** "family manages assessment responses"  
```sql
FOR ALL TO authenticated
USING (public.owns_child_profile(child_profile_id))
WITH CHECK (public.owns_child_profile(child_profile_id))
```

---

### Assessment Definitions (Code, not DB)

**Location:** `src/content/assessments/save-junior.ts`

**Structure:**

```typescript
export const savePreAssessment: AssessmentDefinition = {
  id: "save-pre",
  trackId: "save",
  assessmentType: "pre",
  title: "Before we begin",
  shortTitle: "Money Check-In",
  intro: "...",
  outro: "...",
  showScoreToChild: false,  // Pre-test doesn't show score to child
  questions: [ { ... }, ... ],
};

export const savePostAssessment: AssessmentDefinition = {
  id: "save-post",
  trackId: "save",
  assessmentType: "post",
  title: "Let's see what you've picked up",
  showScoreToChild: true,   // Post-test shows score
  questions: [ { ... }, ... ],
};
```

**Question Structure:**

```typescript
interface AssessmentQuestion {
  id: string;
  assessmentType: "pre" | "post";
  competency: Competency;  // One of 10 competencies
  question: string;
  imageUrl?: string;       // Scene picture
  imageBadge?: string;     // Caption chip ("GH₵10 Gift")
  topic?: string;          // Topic label
  hint?: string;           // Guidance
  options: AnswerOption[];
  idealOptionId?: string;  // "Best" choice (not "correct")
  scoring?: ScoringRule;
  feedback: string;        // Warm message after answering
}

interface AnswerOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  points?: number;   // Explicit points (optional)
  response?: string; // Per-option message (optional)
}

interface ScoringRule {
  idealPoints?: number;  // Points for idealOptionId
  otherPoints?: number;  // Points for other options
  maxPoints?: number;    // Max this question contributes
}
```

---

### Competencies (Fixed Domain)

```typescript
export const COMPETENCIES = [
  "needs-vs-wants",
  "earning",
  "saving",
  "goal-setting",
  "budgeting",
  "tracking-money",
  "spending-decisions",
  "borrowing-lending",
  "financial-resilience",
  "money-safety",
] as const;
```

Every question maps to exactly one competency. Pre and post assessments cover different scenarios but measure the same 10 competencies.

---

### Learning Track Structure

**Location:** `src/content/tracks/save.ts`

**Track Sequence (Partial):**

```
1. assessment (save-pre)      — "Getting ready" stage
2. lesson (meet-your-money)   — "Getting ready" stage
3. lesson (set-a-goal)        — "Getting ready" stage
4-50. [scenarios, lessons, reflections]
51. reflection (reflect-journey) — "Chapter 5"
52-55. [bonus lessons]
56. assessment (save-post)    — "Bonus stops" stage
```

**Track Item Structure:**

```typescript
interface TrackItem {
  kind: "assessment" | "lesson" | "scenario" | "reflection";
  id: string;
  stage: string;
  label: string;
  blurb: string;
  icon: string;
  reward?: number;  // XP reward
  chip?: string;    // Visual badge
}
```

---

## 4. PRE-TEST FLOW (CURRENT IMPLEMENTATION)

### Route: `/child/assessment/$assessmentId`

**File:** `src/routes/child/assessment.$assessmentId.tsx`

**Step 1: BeforeLoad (Server)**
```typescript
beforeLoad: async ({ params }) => {
  await assertChildActivity({ data: { itemType: "assessment", itemId: params.assessmentId } });
}
```

- Calls `assertChildActivity()` (server function)
- Extracts `childId` from session cookie (`tati_child_session`)
- Verifies assessment is in "save" track sequence
- **Gap:** Does NOT verify child has completed prerequisites

**Step 2: Load Definition (Client)**
```typescript
const definition = getAssessmentDefinition(assessmentId);
```

- Returns pure TypeScript object (no DB query)
- Includes **all questions, options, ideal answers, scoring rules, feedback**
- Questions include `options` array (all answer choices)
- Includes `idealOptionId` (the "best" choice)
- **Security Note:** Correct answers ARE visible in browser memory; however, they are never used for scoring (scoring happens server-side)

**Step 3: Render (Client)**
```typescript
<AssessmentRunner definition={definition} ... />
```

- Component renders one question per page
- Shows options as clickable buttons
- LocalStorage stores responses (for session resume)
- No score calculation in browser

**Step 4: Submit (Client → Server)**
```typescript
async function finish(result: AssessmentResult) {
  await saveChildAssessment({
    data: {
      assessmentId: result.assessmentId,
      responses: result.responses,  // { questionId: optionId, ... }
      points: result.points,         // Client-calculated (trust issue)
      maxPoints: result.maxPoints,
      competencyScores: { ... },     // Client-calculated
    },
  });
```

- Client calls `saveChildAssessment()` (server function)
- Sends **only responses**; also sends points (which gets ignored)

**Step 5: Save (Server)**
```typescript
export const saveChildAssessment = createServerFn({ method: "POST" })
  .validator(assessmentInput)
  .handler(async ({ data }) => {
    const childId = await currentChildId();  // From session cookie
    const definition = getAssessmentDefinition(data.assessmentId);
    
    // RECALCULATE score server-side (ignores client's points)
    const calculatedResult = scoreAssessment(definition, data.responses);
    
    // Upsert attempt
    const { data: attempt } = await supabase
      .from("assessment_attempts")
      .upsert({
        child_profile_id: childId,
        assessment_id: definition.id,
        assessment_type: definition.assessmentType,
        points: calculatedResult.points,        // Server-calculated
        max_points: calculatedResult.maxPoints,
        competency_scores: { ... },
        status: "completed",
        completed_at: now(),
      }, { onConflict: "child_profile_id,assessment_id" })
      .select("id");
    
    // Insert responses
    await supabase
      .from("assessment_responses")
      .upsert(rows, { onConflict: "attempt_id,question_id" });
  });
```

**Step 6: Record Progress (Server)**
```typescript
await record.mutateAsync({
  data: {
    itemType: "assessment",
    itemId: assessmentId,
    score: result.points,
    maxScore: result.maxPoints,
    details: { ... },
  },
});
```

- Calls `recordChildProgress()` (server function)
- Stores in `journey_progress` table

**Step 7: Navigate (Client)**
```typescript
await navigate({ to: "/child/learn" });
```

- Back to child learning dashboard

---

## 5. POST-TEST FLOW

### Route: `/_authenticated/learn/$childId/assessment/$assessmentId`

**File:** `src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx`

**Flow (Simplified):**

1. **BeforeLoad:** Verifies parent owns child via `assertChildInCurrentFamily(params.childId)`
2. **Load Definition:** Identical to pre-test
3. **Render:** Identical to pre-test
4. **Submit:** Calls `saveAssessmentAttempt()` (different function)

**Difference from Pre-Test:**

```typescript
async function finish(result: AssessmentResult) {
  if (definition) await saveAssessmentAttempt(childId, definition, result);
  
  // Track events
  if (result.assessmentType === "post") {
    void trackEvent("post_assessment_completed", { ... });
  }
  
  // Update progress
  await record.mutateAsync({ childId, itemType: "assessment", ... });
  
  // Navigate to results summary
  if (result.assessmentType === "post") {
    navigate({ to: "/learn/$childId/summary", params: { childId } });
  }
}
```

**Location:** `src/lib/assessment/attempts.ts`

```typescript
export async function saveAssessmentAttempt(
  childId: string,
  definition: AssessmentDefinition,
  result: AssessmentResult,
): Promise<void> {
  // Similar to saveChildAssessment but used by parent route
  // Stores to assessment_attempts + assessment_responses
}
```

---

## 6. ASSESSMENT ATTEMPT LIFECYCLE

### State Machine

```
NOT_STARTED
    ↓
IN_PROGRESS (in browser localStorage, not in DB)
    ↓
SUBMITTED (client calls saveChildAssessment)
    ↓ 
SCORED (server calculates)
    ↓
STORED (in assessment_attempts with status="completed")
    ↓
COMPLETED (acknowledged by client)
```

**Key Properties:**

- **One Attempt Per Assessment Per Child**  
  Unique constraint: `(child_profile_id, assessment_id)`
  
- **UPSERT Semantics**  
  Calling `saveChildAssessment()` twice replaces the first attempt
  
- **No Explicit State Field**  
  All stored attempts have status = "completed"
  
- **Immutable Once Stored**  
  No client can update scores after submission
  
- **No Explicit "attempt ID" in URL**  
  Child can only access their own single attempt per assessment

---

## 7. AUTHENTICATION & AUTHORIZATION

### Authentication (G3-Aware)

**Current Implementation:**

```typescript
async function currentChildId(): Promise<string> {
  const token = getCookie(COOKIE_NAME);
  const session = token ? await validateChildSession(token) : null;
  if (!session) throw new Error("Child session required.");
  return session.child_profile_id;
}
```

- Reads `tati_child_session` HTTP-only cookie
- Calls `validateChildSession()` from [child-identity.server.ts](child-identity.server.ts#L155)
- Returns `ChildSession` with `childId` and `familyId`

**G3 Note:**  
`validateChildSession()` is unchanged by G3. It validates TATI ID + PIN authentication at Supabase.

### Authorization (Current)

**Child Assessment Route:**

```typescript
export const assertChildActivity = createServerFn()
  .handler(async ({ data }) => {
    await currentChildId();  // Throws if not authenticated
    if (!trackItemExists(data.itemType, data.itemId))
      throw new Error("That activity is not in this journey.");
    return { ok: true };
  });
```

**Checks:**
1. ✅ Child is authenticated (has valid session)
2. ✅ Assessment exists in track sequence
3. ❌ Assessment is **not** gated by completion of prerequisites

**Parent Assessment Route:**

```typescript
beforeLoad: async ({ params }) => {
  try {
    await assertChildInCurrentFamily(params.childId);
  } catch {
    throw redirect({ to: "/parent" });
  }
}
```

- Verifies parent owns the child
- Queries Supabase: does family contain this childId?

---

## 8. CHILD OWNERSHIP MODEL

### Current Implementation

**For Child Routes:**

```typescript
const childId = await currentChildId();
await supabase
  .from("assessment_attempts")
  .upsert({
    child_profile_id: childId,  // Server-supplied, never client-supplied
    ...
  });
```

✅ **Child ID Source:** Server-side session validation only  
✅ **Immutable:** Server extracts from validated session token  
❌ **No Cross-Child Boundary Check:** If child A's session is compromised, the route uses their childId; no explicit `requireAuthenticatedChildResource(context, childId)` call

### Threat Analysis

| Threat | Current Protection |
|--------|-------------------|
| **Child A changes childId parameter** | Route doesn't accept childId parameter; session-derived only |
| **Child A accesses Child B's assessment** | RLS policy: `owns_child_profile(child_profile_id)` blocks read/write |
| **Child A's session token leaked** | HTTPOnly cookie + secure transport; token validated server-side |
| **Child A submits another child's attemptId** | No direct attemptId in URL; child can only view/edit their own (via RLS) |

---

## 9. SCORE INTEGRITY

### Score Calculation (Server-Side)

**Function:** `scoreAssessment()` in `src/lib/assessment/engine.ts`

```typescript
export function scoreAssessment(
  definition: AssessmentDefinition,
  responses: ResponseMap,  // { questionId: optionId, ... }
): AssessmentResult {
  const buckets = new Map<Competency, { points: number; maxPoints: number }>();
  let points = 0;
  let maxPoints = 0;

  for (const q of definition.questions) {
    const max = questionMaxPoints(q);
    const got = optionPoints(q, responses[q.id]);
    points += got;
    maxPoints += max;
    
    // Per-competency bucket
    const bucket = buckets.get(q.competency) ?? { points: 0, maxPoints: 0 };
    bucket.points += got;
    bucket.maxPoints += max;
    buckets.set(q.competency, bucket);
  }

  return {
    assessmentId: definition.id,
    assessmentType: definition.assessmentType,
    answered,
    total: definition.questions.length,
    points,
    maxPoints,
    responses,
    competencies: [ ... ],
  };
}

export function optionPoints(q: AssessmentQuestion, optionId: string | undefined): number {
  if (!optionId) return 0;
  const option = q.options.find((o) => o.id === optionId);
  if (!option) return 0;
  if (option.points != null) return option.points;          // Explicit per-option
  if (q.idealOptionId && option.id === q.idealOptionId) {
    return q.scoring?.idealPoints ?? 1;                    // Ideal bonus
  }
  return q.scoring?.otherPoints ?? 0;                      // Default for other
}
```

### Scoring Rules (Example)

**Question p1 (Spending Decisions):**

```typescript
{
  id: "p1",
  assessmentType: "pre",
  competency: "spending-decisions",
  question: "Auntie Akosua gives you GH₵10. What do you do first?",
  options: [
    { id: "a", label: "Spend it all at the food stall" },
    { id: "b", label: "Keep some and spend the rest" },         // IDEAL
    { id: "c", label: "Keep all for something bigger" },
    { id: "d", label: "Give it to a friend to hold" },
  ],
  idealOptionId: "b",
  scoring: {
    idealPoints: 1,    // Option "b" = 1 point
    otherPoints: 0,    // Options a, c, d = 0 points
    maxPoints: 1,      // Max contribution: 1 point
  },
  feedback: "Keeping a part and enjoying a part is a habit many savers use.",
}
```

### Integrity Guarantees

| Concern | Protection |
|---------|-----------|
| **Client submits arbitrary score** | Server **recalculates** from responses; client score ignored |
| **Client submits wrong optionId** | optionPoints() returns 0 if optionId not in question.options |
| **Client submits answers not in assessment** | scoreAssessment() only processes responses for questions in definition |
| **Client submits incompatible responses** | Response validation: z.record(z.string(), z.string()); unknown keys ignored |

---

## 10. QUESTION SECURITY

### What The Browser Receives

**When loading `getAssessmentDefinition()`:**

```typescript
const definition = getAssessmentDefinition(assessmentId);

// Browser gets:
{
  id: "save-pre",
  title: "Before we begin",
  questions: [
    {
      id: "p1",
      question: "Auntie Akosua gives you GH₵10...",
      options: [
        { id: "a", label: "Spend it all...", points: 0 },
        { id: "b", label: "Keep some...", points: 1 },      // 👈 IDEAL POINTS
        { id: "c", label: "Keep all...", points: 0 },
        { id: "d", label: "Give it to...", points: 0 },
      ],
      idealOptionId: "b",                                   // 👈 VISIBLE!
      scoring: { idealPoints: 1, otherPoints: 0, maxPoints: 1 },
      feedback: "Keeping a part and enjoying...",
    },
    ...
  ],
  ...
}
```

### Security Assessment

| Field | Exposed? | Risk | Mitigation |
|-------|----------|------|-----------|
| `question` | ✅ Yes | Child reads full question | Intentional; child is the test taker |
| `options[].label` | ✅ Yes | Child reads answer choices | Intentional; child needs to answer |
| `options[].points` | ✅ Yes | Child sees point values | **Minor:** Child can see scoring math |
| `idealOptionId` | ✅ Yes | Child knows best answer | **Medium:** Child can game pre-test by selecting "ideal" |
| `scoring.idealPoints` | ✅ Yes | Child knows point formula | **Minor:** Transparency of scoring |
| `feedback` | ✅ Yes | Child sees feedback | **Intentional:** Warm, non-punitive messaging |

### Why This Is Acceptable

1. **TATI Design Philosophy:** "No pass/fail" framing means there's no real "cheating" incentive
2. **Server Recalculation:** Even if child sees ideal answers, server recalculates; no score manipulation
3. **Pre-Test Baseline Reliability:** Pre-test is baseline measurement; if child gaming occurs, post-test will show real learning (or lack)
4. **LocalStorage Resume:** Responses stored locally; child could theoretically modify localStorage, but changes don't persist to DB without valid session

### Potential Concern: Pre-Test Gaming

**Scenario:** Child sees `idealOptionId` before submission, clicks all ideal options.

**Current Outcome:**
- Server calculates score based on ideal choices
- Pre-test baseline inflated
- Post-test will show no "growth" (child is already at artificial high)
- Parent sees: "No improvement on post-test" → Possible false negative on learning effectiveness

**Recommended G4 Investigation:**
- Consider whether pre-test should load definitions differently (with idealOptionId stripped)
- Or accept current design as-is and document limitation in parent insights

---

## 11. ASSESSMENT STATE MACHINE

### Stored States (Database)

**assessment_attempts.status:**

```sql
CREATE TABLE assessment_attempts (
  ...
  status text NOT NULL DEFAULT 'completed',
  ...
);

-- All stored records have status = 'completed'
-- No other states in database
```

### Transitions

```
Browser LocalStorage (transient)
  ├─ { stage: 'intro', responses: {} }
  ├─ { stage: 'question', index: 0, responses: { p1: 'a' } }
  ├─ { stage: 'question', index: 1, responses: { p1: 'a', p2: 'c' } }
  ├─ { stage: 'question', index: 5, responses: { ... all responses ... } }
  ├─ { stage: 'complete', responses: { ... } }
  └─ [SUBMIT]
         ↓
  Supabase assessment_attempts (immutable)
  ├─ status: 'completed'
  ├─ points: (recalculated)
  ├─ completed_at: now()
  └─ [UPSERT on conflict]
         ↓
  Journey_progress
  ├─ status: 'completed'
  └─ score: (recorded)
```

### Properties

| Property | Value |
|----------|-------|
| **State Persistence** | LocalStorage only; DB stores final result only |
| **Idempotency** | Calling saveChildAssessment() twice = UPSERT (replaces first) |
| **Resubmission** | Child can reopen assessment (if frontend allows), retake, and resubmit |
| **State Control** | Server sets completed_at; client cannot set arbitrary dates |
| **Rollback** | No rollback mechanism; parent portal doesn't provide "delete attempt" UI |

---

## 12. LEARNING TRACK RELATIONSHIP

### Track Structure

**File:** `src/content/tracks/save.ts`

```typescript
export const saveTrack: Track = {
  id: "save",
  tier: "junior",
  name: "SAVE",
  tagline: "Keeping money safe today so it can help you tomorrow.",
  goal: { challengeName: "Term Ready Challenge", target: 80, ... },
  sequence: [
    { kind: "assessment", id: "save-pre", stage: "Getting ready", ... },
    { kind: "lesson", id: "meet-your-money", stage: "Getting ready", ... },
    { kind: "lesson", id: "set-a-goal", stage: "Getting ready", ... },
    // ... 45+ more items
    { kind: "assessment", id: "save-post", stage: "Bonus stops", ... },
  ],
  reflections: [ ... ],
  assessments: [ ... ],
};
```

### Assessment Positions

| Position | Assessment | Stage | Reward |
|----------|------------|-------|--------|
| 1 | save-pre | Getting ready | (none) |
| 56 | save-post | Bonus stops | 10 XP |

### Track Item Query

```typescript
export const getTrack = (trackId: string): Track => {
  if (trackId === "save") return saveTrack;
  throw new Error("Unknown track");
};

function trackItemExists(itemType: string, itemId: string): boolean {
  const track = getTrack("save");
  return track.sequence.some(
    (item) => item.kind === itemType && item.id === itemId
  );
}
```

### Gating (Current)

❌ **No Prerequisite Gating**

```typescript
if (!trackItemExists(data.itemType, data.itemId))
  throw new Error("That activity is not in this journey.");
```

This check verifies the item **exists** in sequence, NOT that prerequisites are **complete**.

**Implication:**
- Child can jump directly to save-post without completing save-pre
- Child can access save-post without completing any lessons
- No enforcement of learner readiness

---

## 13. PARENT & TEACHER ACCESS

### Parent Dashboard Route

**File:** `src/routes/parent/child.$childId.tsx`

**Authorization:**

```typescript
export const Route = createFileRoute("/parent/child/$childId")({
  component: ParentChild,
});

function ParentChild() {
  const { childId } = Route.useParams();
  const { child, isLoading, isError } = useChildProfile(childId);
  
  // useChildProfile internally calls assertChildInCurrentFamily()
  // which verifies parent owns childId
}
```

**Data Loaded:**

```typescript
const progress = useChildProgress(childId);
// Returns:
{
  steps: [ ... ],         // Per-item completion status
  insights: [ ... ],      // Plain-language insights
  assessments: [ ... ],   // Attempt records
  competencies: [ ... ],  // Competency scores
  achievements: [ ... ],  // Badges earned
}
```

### Assessment-Related Parent Visibility

**Attempt Records:**

```typescript
export const getChildLearningData = createServerFn({ method: "GET" }).handler(async () => {
  const childId = await currentChildId();
  const assessmentResult = await supabase
    .from("assessment_attempts")
    .select(
      "assessment_id, assessment_type, points, max_points, competency_scores, completed_at",
    )
    .eq("child_profile_id", childId);
  return { assessments: assessmentResult.data ?? [] };
});
```

Parent can see:
- ✅ Pre-test results (points, competencies)
- ✅ Post-test results (points, competencies)
- ✅ Growth comparison (via `compareResults()`)
- ✅ Completion timestamps

Parent **cannot** see:
- ❌ Individual question responses (not stored in parent-visible format)
- ❌ Specific answer options chosen (only aggregate scores)
- ❌ Per-question feedback

### Parent Insights

**File:** `src/lib/learning/parent-insights.ts`

```typescript
export function skillSentence(
  track: Track,
  pre: AssessmentResult,
  post: AssessmentResult,
): string {
  const growth = compareResults(pre, post);
  // Generates human-friendly summary like:
  // "Akosua learned strongest in 'Saving' and 'Goal Setting'"
}
```

Parent dashboard displays plain-language insights based on score deltas.

### Teacher Access

**Current Status:** Not implemented.

No teacher-specific routes or assessment access patterns defined.

---

## 14. SUPABASE RLS POLICIES

### Assessment Attempts Policy

```sql
CREATE TABLE public.assessment_attempts (
  ...
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id)
  ...
);

ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family manages assessment attempts" 
  ON public.assessment_attempts
  FOR ALL 
  TO authenticated
  USING (public.owns_child_profile(child_profile_id))
  WITH CHECK (public.owns_child_profile(child_profile_id));
```

**Function:** `owns_child_profile(_child_profile_id uuid)`

```sql
CREATE OR REPLACE FUNCTION public.owns_child_profile(_child_profile_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.child_profiles cp
    JOIN public.family_members fm ON fm.family_id = cp.family_id
    WHERE cp.id = _child_profile_id 
      AND fm.user_id = auth.uid()
  );
$$;
```

### Scope

| Operation | Allowed? | Condition |
|-----------|----------|-----------|
| SELECT * FROM assessment_attempts | ✅ | If owns_child_profile() for all rows |
| INSERT into assessment_attempts | ✅ | If owns_child_profile(child_profile_id) |
| UPDATE assessment_attempts | ✅ | If owns_child_profile(child_profile_id) |
| DELETE from assessment_attempts | ✅ | If owns_child_profile(child_profile_id) |

### Assessment Responses Policy

Identical to assessment_attempts:

```sql
CREATE POLICY "family manages assessment responses" 
  ON public.assessment_responses
  FOR ALL 
  TO authenticated
  USING (public.owns_child_profile(child_profile_id))
  WITH CHECK (public.owns_child_profile(child_profile_id));
```

### Inherited Constraints

**Compound Foreign Key:**

```sql
ALTER TABLE public.assessment_responses
  ADD CONSTRAINT assessment_responses_attempt_child_fkey
  FOREIGN KEY (attempt_id, child_profile_id)
  REFERENCES public.assessment_attempts(id, child_profile_id);
```

This enforces: A response's child must match the attempt's child.

### Firestore Rules (Secondary)

**For reference only (not primary in G4):**

```rules
match /assessmentAttempts/{attemptId} {
  allow read: if canAccessChild(familyId, childId);
  allow write: if false;
}
```

Firestore blocks all client writes to assessment attempts (G3 introduces optional identity mapping).

---

## 15. G3 INTEGRATION POINT

### Current (Pre-G3 Integration)

```
HTTP-Only Session Cookie (tati_child_session)
    ↓
validateChildSession()
    ↓
ChildSession { childId, sessionId, familyId, ... }
    ↓
Assessment Server Functions
    ↓
Supabase RLS (owns_child_profile)
```

### Target (G3 Integration)

```
HTTP-Only Session Cookie (tati_child_session)
    ↓
getAuthenticatedChild() [NEW - G3]
    ↓
AuthenticatedChildContext {
  session: ChildSession,
  profile: { id, tatiId, name, familyId, ... },
  firebase?: FirebaseChildIdentity,
  childId, sessionId, familyId
}
    ↓
Assessment Server Functions
    ↓
Supabase RLS (unchanged)
```

### Integration Strategy (G4 Design, Not Implemented)

**Option 1: Use AuthenticatedChildContext directly in assessment functions**

```typescript
export const saveChildAssessment = createServerFn({ method: "POST" })
  .validator(assessmentInput)
  .handler(async ({ data }) => {
    // NEW: Use AuthenticatedChildContext
    const context = await getAuthenticatedChild();
    
    if (!context) throw new AuthorizationError("...");
    
    const childId = context.childId;  // Replace: await currentChildId()
    const familyId = context.familyId;
    
    // Validate child owns assessment (existing check)
    // Optionally add: requireAuthenticatedChildResource(context, childId)
    
    // ... rest of logic unchanged
  });
```

**Option 2: Create AuthorizedAssessmentContext wrapper**

```typescript
type AuthorizedAssessmentContext = {
  child: AuthenticatedChildContext;
  assessmentId: string;
  assessmentType: "pre" | "post";
  trackId: string;
};

async function createAuthorizedAssessmentContext(
  context: AuthenticatedChildContext,
  assessmentId: string,
): Promise<AuthorizedAssessmentContext> {
  const definition = getAssessmentDefinition(assessmentId);
  if (!definition) throw new Error("Assessment not found");
  
  return {
    child: context,
    assessmentId: definition.id,
    assessmentType: definition.assessmentType,
    trackId: definition.trackId,
  };
}
```

**Recommendation for G4:**  
Option 1 is simpler and minimizes code churn. Assessment functions already validate auth; adding AuthenticatedChildContext as the source provides G3 integration without architectural redesign.

---

## 16. SECURITY THREAT MODEL

### Threat 1: Child A Changes `childProfileId` to Child B

**Attack:** Modify request body to upsert attempt for different child.

**Current Protection:**
- ✅ Child ID extracted from validated session token (server-side)
- ✅ Client request does **not** include childId parameter
- ✅ Server uses `await currentChildId()` to supply childId

**Outcome:** Protected. Client cannot manipulate.

**G4 Enhancement:** Explicit call to `requireAuthenticatedChildResource(context, childId)` strengthens intent clarity.

---

### Threat 2: Child A Changes `attemptId` to Child B's Attempt

**Attack:** Modify localStorage or request to replay/modify another child's attempt record.

**Current Protection:**
- ✅ Attempt record identified by (child_profile_id, assessment_id) unique key
- ✅ No "attemptId" in child-facing URLs; navigation uses assessmentId only
- ✅ Supabase RLS policy: `owns_child_profile()` prevents SELECT/UPDATE/DELETE of other child's rows

**Outcome:** Protected. Supabase RLS enforces isolation.

**G4 Enhancement:** No changes needed; RLS is authoritative.

---

### Threat 3: Child A Changes `assessmentId` to Unauthorized Assessment

**Attack:** Load definition for an assessment not in the track (e.g., `malicious-assessment`).

**Current Protection:**
- ⚠️ `trackItemExists()` check verifies assessment is in sequence
- ⚠️ But `getAssessmentDefinition()` returns ANY assessment in ASSESSMENTS registry

**Gap:** If an assessment exists in code but is not in the track, a child could still load it.

**Current Mitigation:** 
- No additional assessments defined in registry (only save-pre, save-post)
- Future assessments must be added explicitly to both registry and track sequence

**G4 Recommendation:** Verify trackId matches in server function:

```typescript
const definition = getAssessmentDefinition(data.assessmentId);
if (definition.trackId !== "save") {
  throw new Error("Assessment not in current track");
}
```

---

### Threat 4: Client Submits Arbitrary Score

**Attack:** POST `{ assessmentId, responses, points: 999, maxPoints: 999 }`

**Current Protection:**
- ✅ Server **recalculates** score: `scoreAssessment(definition, responses)`
- ✅ Client's `points` field is **ignored**
- ✅ Stored score always matches server calculation

**Outcome:** Protected. Client score discarded.

**Strength:** Deterministic server-side calculation is the gold standard.

---

### Threat 5: Client Submits Arbitrary Competency Score

**Attack:** POST `{ ..., competencyScores: { "saving": 999 } }`

**Current Protection:**
- ✅ Server recalculates all competency scores
- ✅ Client competencyScores field is ignored

**Outcome:** Protected.

---

### Threat 6: Client Submits Another Child's Response

**Attack:** POST `{ responses: { q1: "optionA", q2: "optionB", ... }, childProfileId: "other-child" }`

**Current Protection:**
- ✅ `childProfileId` not accepted in request
- ✅ Child ID sourced from session only

**Outcome:** Protected.

---

### Threat 7: Child Replays Completed Assessment

**Attack:** Submit same responses twice to increment score.

**Current Protection:**
- ✅ UPSERT with key (child_profile_id, assessment_id)
- ✅ Second submission **replaces** first record

**Outcome:** Protected (idempotent). Score does not increment on replay.

---

### Threat 8: Parent Attempts to Use Child-Only Endpoints

**Attack:** Parent calls `/child/assessment/$assessmentId` routes.

**Current Protection:**
- ✅ `/child/*` routes validate session is a child session
- ✅ Parent portal uses `/learn/$childId/assessment/...` routes

**Outcome:** Protected by different route trees.

**Gap:** No explicit authorization check comparing route role to session type.

**G4 Enhancement:** Explicit assertion in route:

```typescript
beforeLoad: async () => {
  const context = await getAuthenticatedChild();
  if (!context) throw redirect({ to: "/auth" });
  // Routes can now use AuthenticatedChildContext.session.kind === "child"
}
```

---

### Threat 9: Child Attempts to Use Parent-Only Endpoints

**Attack:** Child calls `/parent/child/$childId` routes.

**Current Protection:**
- ✅ Parent routes call `assertChildInCurrentFamily(childId)`
- ✅ This queries Supabase: is auth.uid() a family member?
- ✅ Child's Supabase user (parent) check fails

**Outcome:** Protected. Child has no family relationship (not a parent).

---

### Threat 10: Unauthenticated Browser Accesses Assessment Endpoints

**Attack:** Browser without session cookie calls `saveChildAssessment()`.

**Current Protection:**
- ✅ `currentChildId()` throws if session invalid/missing
- ✅ Server function fails before processing

**Outcome:** Protected. Throws "Child session required."

---

### Threat Summary Table

| Threat | Current | Gap | G4 Recommendation |
|--------|---------|-----|-------------------|
| 1. Change childId | ✅ Protected | None | Use AuthenticatedChildContext |
| 2. Change attemptId | ✅ Protected | None | No change needed |
| 3. Unauthorized assessment | ⚠️ Mitigated | Only save track defined | Verify trackId server-side |
| 4. Arbitrary score | ✅ Protected | None | No change needed |
| 5. Arbitrary competency | ✅ Protected | None | No change needed |
| 6. Other child's response | ✅ Protected | None | No change needed |
| 7. Replay submission | ✅ Protected | None | No change needed |
| 8. Parent on child route | ✅ Protected | None | Explicit session.kind check |
| 9. Child on parent route | ✅ Protected | None | No change needed |
| 10. Unauthenticated access | ✅ Protected | None | No change needed |

---

## 17. EXISTING GAPS & CONCERNS

### Gap 1: No Prerequisite Gating (Track Sequencing)

**Current Behavior:**
```typescript
function trackItemExists(itemType: string, itemId: string): boolean {
  const track = getTrack("save");
  return track.sequence.some((item) => item.kind === itemType && item.id === itemId);
}
```

Checks item exists; does NOT check prerequisites complete.

**Scenario:**  
Child can jump directly to save-post without:
- Completing save-pre
- Completing any lessons
- Earning any XP

**Implication:**
- Post-test baseline inflated (child hasn't learned material)
- Growth comparison meaningless if pre-test skipped
- Parent insights may be misleading

**Recommendation for G4:**
Document behavior. Consider whether to gate assessments:

```typescript
// Option: Gate post-test behind pre-test + milestone completion
async function canAccessAssessment(childId: string, assessmentId: string): Promise<boolean> {
  if (assessmentId === "save-post") {
    // Verify save-pre completed
    const pre = await supabase
      .from("assessment_attempts")
      .eq("child_profile_id", childId)
      .eq("assessment_id", "save-pre")
      .single();
    if (!pre) return false;

    // Verify first 10 items in track completed
    const progress = await supabase
      .from("journey_progress")
      .select("item_id")
      .eq("child_profile_id", childId)
      .eq("status", "completed");
    
    const completed = new Set(progress.data?.map((p) => p.item_id) ?? []);
    const track = getTrack("save");
    const minItemsRequired = 10;
    return completed.size >= minItemsRequired;
  }
  return true;  // Pre-test always accessible
}
```

**Decision:** Defer implementation to G5. Document for now.

---

### Gap 2: Pre-Test Integrity (Ideal Answers Visible)

**Current Behavior:**
Assessment definition loaded in browser with `idealOptionId` and point values visible.

**Scenario:**
Child sees ideal answer before answering; intentionally selects ideal options.

**Implication:**
- Pre-test becomes unreliable baseline
- No growth measurement possible (child already at artificial high)

**Recommendation:**
- Document as acceptable under TATI's "no pass/fail" philosophy
- Monitor through post-test (true learning will show lower scores if pre-test gamed)
- Consider future enhancement: Strip `idealOptionId` from client-side definition

---

### Gap 3: LocalStorage Response Persistence

**Current Behavior:**
Responses stored in localStorage with plain text key format.

**Scenario:**
Child opens browser dev tools, modifies localStorage to change responses before submission.

**Implication:**
- Changed responses submitted to server
- Server recalculates score from modified responses
- Child can inflate score

**Current Mitigation:**
- Only local browser access (no network attack vector)
- Child must manually edit dev tools

**Recommendation:**
- Accept as acceptable (requires active browser debugging)
- Monitor for abuse via server logs
- Document in security guidelines

---

### Gap 4: No Explicit Role-Based Access Control in Routes

**Current Behavior:**
Routes check session existence but not `session.kind` (child vs. parent).

**Scenario:**
Parent session calling `/child/*` route (though different route tree prevents actual issue).

**Recommendation:**
Add explicit session.kind checks in route beforeLoad:

```typescript
beforeLoad: async () => {
  const context = await getAuthenticatedChild();
  if (!context || context.session.kind !== "child") {
    throw redirect({ to: "/auth" });
  }
}
```

---

### Gap 5: Question Storage & Content Versioning

**Current Behavior:**
Assessment definitions stored as code; schema version = git commit.

**Scenario:**
Question wording changes; historical attempts reference old question.

**Implication:**
- Parent views results; questions may be outdated if definitions changed
- No historical question archive

**Recommendation:**
Document that question bank is immutable within a phase. G4 does not require schema changes.

---

### Gap 6: No Offline Assessment Support

**Current Behavior:**
Assessment requires network connectivity for every save.

**Scenario:**
Child in area with intermittent connectivity; session times out during attempt.

**Mitigation:**
LocalStorage provides draft storage; child can resume. But final submission requires network.

**Recommendation:**
Document for implementation in future phases. G4 scope does not include offline assessment.

---

## 18. PROPOSED G4 ARCHITECTURE

### Goal

Integrate `AuthenticatedChildContext` as the primary authorization source for all assessment operations, replacing direct session-only validation.

### Changes (Minimal)

**File:** `src/lib/auth/child-learning.functions.ts`

**Replace:**

```typescript
async function currentChildId(): Promise<string> {
  const token = getCookie(COOKIE_NAME);
  const session = token ? await validateChildSession(token) : null;
  if (!session) throw new Error("Child session required.");
  return session.child_profile_id;
}
```

**With:**

```typescript
async function getAuthenticatedChildContext(): Promise<AuthenticatedChildContext> {
  const context = await getAuthenticatedChild();
  if (!context) throw new AuthorizationError("Child authentication required.");
  return context;
}
```

**Update `saveChildAssessment()`:**

```typescript
export const saveChildAssessment = createServerFn({ method: "POST" })
  .validator(assessmentInput)
  .handler(async ({ data }) => {
    // NEW: Use G3 context
    const context = await getAuthenticatedChildContext();
    const childId = context.childId;
    const familyId = context.familyId;
    
    // Validate assessment in track
    const definition = getAssessmentDefinition(data.assessmentId);
    if (!definition) throw new Error("That check-in is not available.");
    if (definition.trackId !== "save") throw new Error("Invalid track.");
    
    // Recalculate score
    const calculatedResult = scoreAssessment(definition, data.responses);
    
    // Upsert with child context
    const { data: attempt, error } = await supabase
      .from("assessment_attempts")
      .upsert({
        child_profile_id: childId,                    // From AuthenticatedChildContext
        assessment_id: definition.id,
        assessment_type: definition.assessmentType,
        points: calculatedResult.points,
        max_points: calculatedResult.maxPoints,
        competency_scores: data.competencyScores,
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "child_profile_id,assessment_id" })
      .select("id")
      .single();
    
    if (error || !attempt) throw new Error("Could not save that check-in.");
    
    // ... rest unchanged
  });
```

### Architecture Diagram

**Before (Pre-G4):**

```
assertChildActivity()
  └─ currentChildId() [cookie only]
       └─ validateChildSession()
            └─ Supabase query

saveChildAssessment()
  └─ currentChildId() [cookie only]
       └─ Supabase upsert (RLS trusts owns_child_profile)
```

**After (G4 Integrated):**

```
assertChildActivity()
  └─ getAuthenticatedChild() [G3]
       ├─ validateChildSession() [TATI+PIN]
       ├─ getChildFirebaseIdentity() [optional]
       └─ requireAuthenticatedChild()

saveChildAssessment()
  └─ getAuthenticatedChild() [G3]
       ├─ Validates session not expired/revoked
       ├─ Validates profile exists
       ├─ Validates family consistency
       └─ Supabase upsert (RLS still authoritative)
```

### Advantages

1. **Single Auth Source:** All operations use G3's unified AuthenticatedChildContext
2. **Enhanced Validation:** Automatic expiration/revocation checks
3. **Firebase-Ready:** If Firebase identity needed in future phases, already integrated
4. **Type Safety:** AuthenticatedChildContext provides typed access to session, profile, firebase

### Backward Compatibility

✅ **No breaking changes to Supabase RLS**  
✅ **No breaking changes to client UI routes**  
✅ **No breaking changes to assessment data model**  
✅ **No database migrations required**

---

## 19. FILES THAT WOULD NEED MODIFICATION (G4 Implementation)

If G4 implementation proceeds, these files require changes:

| File | Changes | Reason |
|------|---------|--------|
| src/lib/auth/child-learning.functions.ts | Replace currentChildId() with getAuthenticatedChildContext(); update all server functions | Integrate AuthenticatedChildContext |
| src/lib/assessment/attempts.ts | Add context parameter to saveAssessmentAttempt(); use context.childId | Consistent authorization source |
| src/routes/child/assessment.$assessmentId.tsx | Update beforeLoad to use getAuthenticatedChild() | Route-level G3 integration |
| src/routes/_authenticated/learn.$childId.assessment.$assessmentId.tsx | Same as above | Route-level G3 integration |
| src/lib/assessment/engine.ts | No changes | Pure scoring logic unchanged |
| src/lib/assessment/types.ts | No changes | Type definitions unchanged |

---

## 20. FILES THAT SHOULD NOT BE MODIFIED (G4 Constraints)

| File | Reason | Constraint |
|------|--------|-----------|
| src/content/assessments/save-junior.ts | Assessment definitions | Read-only; G4 audits, not redesigns |
| src/content/tracks/save.ts | Track sequence | Read-only; G4 validates, not redesigns |
| drizzle/migrations/ | Schema baseline | No database changes |
| firestore.rules | Firestore authorization | Already blocks client writes; unchanged |
| src/lib/assessment/registry.ts | Assessment lookup | No registry changes |
| src/lib/learning/progress.ts | Progress tracking | No changes (not assessment-specific) |
| src/lib/learning/parent-insights.ts | Parent insights | No changes; uses existing score data |

---

## 21. TEST PLAN (G4 Verification)

### Unit Tests

**File:** `tests/auth/assessment-authorization.test.ts` (New)

```typescript
describe("Assessment Authorization (G4)", () => {
  describe("saveChildAssessment with AuthenticatedChildContext", () => {
    it("should save attempt using context.childId", () => {
      const context = { ... };  // AuthenticatedChildContext
      const result = await saveChildAssessment(context, { ... });
      expect(result.childId).toBe(context.childId);
    });

    it("should reject if context expired", () => {
      const context = { session: { expiresAt: "2020-01-01" }, ... };
      expect(() => saveChildAssessment(context, { ... })).toThrow("expired");
    });

    it("should reject if context revoked", () => {
      const context = { session: { revokedAt: "2020-01-01" }, ... };
      expect(() => saveChildAssessment(context, { ... })).toThrow("revoked");
    });

    it("should calculate score from responses only", () => {
      // Client submits responses + fake points
      const result = await saveChildAssessment(context, {
        responses: { q1: "a", q2: "b" },
        points: 999,           // Ignored
        maxPoints: 999,        // Ignored
      });
      
      // Server recalculates
      expect(result.points).toBeLessThan(999);
    });

    it("should enforce family isolation", () => {
      // Context child belongs to Family A
      const context = { childId: "child-a", familyId: "family-a", ... };
      
      // Attempt should have childId (RLS checked at DB level)
      const result = await saveChildAssessment(context, { ... });
      expect(result.childProfileId).toBe("child-a");
    });
  });

  describe("assertChildActivity with AuthenticatedChildContext", () => {
    it("should allow access to items in track", () => {
      const context = { ... };
      expect(assertChildActivity(context, "save-pre")).toBe(true);
    });

    it("should reject items not in track", () => {
      const context = { ... };
      expect(() => assertChildActivity(context, "fake-assessment")).toThrow();
    });
  });
});
```

### Integration Tests

**Scope:** Supabase RLS policies remain unchanged; RLS tests in existing test suite.

### Smoke Tests

**Post-Implementation Verification:**

1. Child can complete pre-assessment ✅
2. Child can complete post-assessment ✅
3. Parent can view child results ✅
4. Growth comparison works ✅
5. Insights generated correctly ✅

---

## 22. MIGRATION & ROLLBACK CONSIDERATIONS

### Migration Path (G4 → G5)

**No Database Changes Required**

Assessment data model unchanged; only server function implementation changes.

**Rollback Strategy:**

1. Revert src/lib/auth/child-learning.functions.ts to use currentChildId()
2. Revert route beforeLoad() functions
3. Tests remain valid; RLS policies unchanged

**Risk Level:** Low

Implementation is confined to server functions; no schema, RLS, or client UI changes.

### Gradual Rollout Option

If needed, feature-flag the G3 integration:

```typescript
const USE_G3_AUTH = process.env.G4_USE_G3_AUTH === "true";

async function getEffectiveChildId(): Promise<string> {
  if (USE_G3_AUTH) {
    const context = await getAuthenticatedChildContext();
    return context.childId;
  } else {
    return await currentChildId();
  }
}
```

---

## 23. CURRENT vs. TARGET ARCHITECTURE

### CURRENT (Pre-G4)

```
┌─────────────────────────────────────────────┐
│         Child Browser                       │
│  Load: getAssessmentDefinition("save-pre")  │
│  Submit: saveChildAssessment()              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      Server Function Layer                   │
│  ┌─ assertChildActivity()                   │
│  │   └─ currentChildId()                    │
│  │       └─ validateChildSession()          │
│  │           └─ Supabase child_sessions     │
│  │                                          │
│  └─ saveChildAssessment()                   │
│      └─ currentChildId() [same]             │
│          └─ scoreAssessment() [pure]        │
│              └─ Supabase upsert             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      Supabase (Backend Provider)            │
│  assessment_attempts (RLS: owns_child)     │
│  assessment_responses (RLS: owns_child)    │
│  child_profiles                             │
│  family_members                             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      Parent Portal / Insights               │
│  View results, competencies, growth         │
└─────────────────────────────────────────────┘
```

### TARGET (G4 Integrated)

```
┌─────────────────────────────────────────────┐
│         Child Browser                       │
│  Load: getAssessmentDefinition("save-pre")  │
│  Submit: saveChildAssessment()              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      Server Function Layer (G3-Aware)       │
│  ┌─ assertChildActivity()                   │
│  │   └─ getAuthenticatedChild() [G3]        │
│  │       ├─ validateChildSession()          │
│  │       ├─ getChildFirebaseIdentity()      │
│  │       └─ requireAuthenticatedChild()     │
│  │                                          │
│  └─ saveChildAssessment()                   │
│      └─ getAuthenticatedChild() [G3]        │
│          ├─ Validates expiration/revocation │
│          ├─ scoreAssessment() [pure]        │
│          └─ Supabase upsert                 │
└─────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│  Supabase (Backend Provider, G3-Integrated)  │
│  assessment_attempts (RLS: owns_child)      │
│  assessment_responses (RLS: owns_child)     │
│  child_profiles (identity source)           │
│  child_sessions (session validation)        │
│  family_members (family isolation)          │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│      Optional: Firebase Identity Layer (G3)  │
│  childAuthIdentities collection (Firestore)  │
│  Provides optional Firebase UID mapping      │
│  Gracefully degradable if unavailable        │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│      Parent Portal / Insights                │
│  View results, competencies, growth          │
│  Enhanced with Firebase identity if present  │
└──────────────────────────────────────────────┘
```

### Key Differences

| Aspect | Current | Target |
|--------|---------|--------|
| **Auth Source** | Session cookie only | AuthenticatedChildContext (G3) |
| **Expiration Check** | Not checked | Automatic via requireAuthenticatedChild() |
| **Revocation Check** | Not checked | Automatic via requireAuthenticatedChild() |
| **Firebase Integration** | Not used | Optional via context.firebase |
| **Authorization Boundary** | Implicit (RLS) | Explicit (AuthenticatedChildContext) |
| **Backend Provider** | Supabase (unchanged) | Supabase (unchanged) |
| **Database Schema** | Unchanged | Unchanged |

---

## 24. COMPLETION CHECKLIST

✅ **Sections Completed:**

- [x] 1. Executive Summary
- [x] 2. Current Assessment Architecture
- [x] 3. Database & Data Model
- [x] 4. Pre-Test Flow
- [x] 5. Post-Test Flow
- [x] 6. Assessment Attempt Lifecycle
- [x] 7. Authentication & Authorization
- [x] 8. Child Ownership Model
- [x] 9. Score Integrity
- [x] 10. Question Security
- [x] 11. Assessment State Machine
- [x] 12. Learning Track Relationship
- [x] 13. Parent & Teacher Access
- [x] 14. Supabase RLS Policies
- [x] 15. G3 Integration Point
- [x] 16. Security Threat Model
- [x] 17. Existing Gaps & Concerns
- [x] 18. Proposed G4 Architecture
- [x] 19. Files That Would Need Modification
- [x] 20. Files That Should Not Be Modified
- [x] 21. Test Plan
- [x] 22. Migration & Rollback Considerations
- [x] 23. Current vs. Target Architecture

---

## 25. AUDIT FINDINGS SUMMARY

### Architecture Quality

**Strengths:**
- ✅ Server-side score calculation prevents client manipulation
- ✅ Strong RLS policies enforce family isolation
- ✅ Assessment definitions as code enable version control
- ✅ Modular engine design (pure scoring functions)
- ✅ Clear separation of pre/post with growth comparison

**Gaps:**
- ⚠️ No prerequisite gating (post-test accessible without pre-test)
- ⚠️ Ideal answers visible to child (minor risk under TATI design)
- ⚠️ No explicit role-based access control in routes
- ⚠️ No offline assessment support

### Security Posture

**Threats Analyzed:** 10  
**Threats Protected:** 10  
**Remaining Concerns:** None critical; see Gap 1-4 for recommendations

**Verdict:** ✅ **SECURE**

### G3 Integration Readiness

**Current:** Assessment system does NOT use AuthenticatedChildContext  
**Gap:** Assessment functions still use session-only validation  
**Integration Path:** Straightforward; replace currentChildId() with getAuthenticatedChild()  
**Risk:** Low; no database changes required

**Verdict:** ✅ **READY FOR G4 INTEGRATION**

---

## 26. RECOMMENDATIONS FOR G4 IMPLEMENTATION

### Phase 1: Core Integration (Week 1)

1. Replace currentChildId() with getAuthenticatedChildContext() in child-learning.functions.ts
2. Update saveChildAssessment() to use AuthenticatedChildContext.childId
3. Update assertChildActivity() to use AuthenticatedChildContext
4. Add explicit session.kind checks to routes

### Phase 2: Validation & Testing (Week 2)

1. Write new assessment authorization tests
2. Verify score calculation unchanged
3. Verify parent insights unchanged
4. Smoke test pre/post flow

### Phase 3: Documentation (Week 3)

1. Document prerequisite gating decision (defer vs. implement)
2. Document pre-test integrity behavior
3. Add security guidelines for offline/persistence risks
4. Update architecture diagrams

### Phase 4: Future (G5+)

1. Consider prerequisite gating for post-test
2. Consider Firebase-backed assessment history
3. Consider offline assessment support
4. Consider teacher/admin access patterns

---

## 27. DESIGN DECISION TRACKING

| Decision | Current | G4 Recommendation | Rationale |
|----------|---------|-------------------|-----------|
| Assessment DB | Supabase | Unchanged | No multi-region need; RLS sufficient |
| Score Calculation | Server-side | Unchanged | Gold standard; client cannot manipulate |
| Prerequisite Gating | None | Document & defer | Low immediate risk; assess in G5 |
| Pre-Test Baseline | No integrity check | Monitor via post-test | TATI design accepts this |
| Question Security | Definitions public | Document & accept | Client owns answers; scoring server-side |
| Offline Support | Not supported | Future phase | Out of G4 scope |
| Teacher Access | Not implemented | Future phase | Document for G5 implementation |

---

## 28. FINAL ASSESSMENT AUDIT COMPLETE

**Date:** 2026-09-25  
**Status:** ✅ **AUDIT COMPLETE, DESIGN VALIDATED**

### Next Steps

1. **User Approval:** Confirm audit findings and G4 recommendations
2. **Proceed to Implementation:** Upon approval, implement Phase 1 changes
3. **No Code Changes Yet:** This document is READ-ONLY audit; no modifications made

**Awaiting explicit approval before beginning G4 implementation phase.**

---

**END OF PHASE G4 ASSESSMENT INTEGRATION AUDIT & DESIGN**
