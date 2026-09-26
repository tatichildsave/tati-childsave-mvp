# PHASE_G5_SCENARIO_AUDIT.md

## READ-ONLY AUDIT: Scenario Engine Integration with G3/G4 Authentication

**Status:** Audit complete, no implementation changes made  
**Date:** 2026-09-25  
**Scope:** Comprehensive analysis of scenario architecture, security, and G3/G4 integration points  

---

## 1. EXECUTIVE SUMMARY

### Current State
The TATI ChildSave MVP implements a **branching decision-based scenario engine** with 14-day financial consequence simulation ("The School Reopening Challenge"). Scenarios are currently persisted using Supabase, with localStorage as an offline cache. The engine is **pure and reusable** across TATI Junior/Teen/Plus platforms.

### G3/G4 Context
- **G3 Integration (Partial):** `loadChildScenario()` and `saveChildScenario()` use `currentChildId()`, which now (post-G4) internally calls `getCurrentChildContext()`. This provides G3 authentication.
- **G4 Context (Partial):** Assessment scoring is server-authoritative. No explicit scenario scoring system exists yet (only state/money tracking).

### G5 Objective
Enhance scenario authorization to fully use `AuthenticatedChildContext` from G3, implement server-side validation of scenario state transitions, prevent cross-child/cross-family access, and establish decision integrity.

### Key Findings
1. ✅ RLS policies (`owns_child_profile()`) provide database-level isolation
2. ✅ Compound foreign keys prevent cross-child decision attachment
3. ⚠️ **No application-level validation** that submitted choices belong to current node
4. ⚠️ **No validation** that submitted node/day are reachable from start
5. ⚠️ **No replay protection** beyond idempotency (UPSERT on unique constraint)
6. ⚠️ **No explicit scenario eligibility check** (any child can load any scenario)
7. ✅ Server functions (`loadChildScenario`, `saveChildScenario`) used for persistence
8. ✅ Decisions are logged in `scenario_decisions` for audit trail

### Security Posture
**Current:** Moderate risk. Database-level RLS prevents cross-family access, but no application-level choice validation. Client can submit invalid choice IDs, which the engine silently ignores (treated as no-op).

**Recommended:** Add application-layer validation in server functions to:
- Verify choice belongs to current node
- Verify node is reachable in current game state
- Validate scenario state consistency before save
- Prevent node/day skipping

---

## 2. CURRENT SCENARIO ARCHITECTURE

### Components

#### 2.1 Type System (src/lib/scenario/types.ts)
```typescript
ScenarioState {
  scenarioId: string;
  day: number;                     // 1-based day counter
  available: number;               // GH₵ in pocket
  saved: number;                   // GH₵ in protected box
  goalTarget: number;              // GH₵80 (bag goal)
  competencies: Partial<Record<Competency, number>>;
  flags: Record<string, unknown>;  // Custom state flags
  scheduled: ScheduledEvent[];     // Delayed events (e.g., debt collection)
  nodeId: string;                  // Current story node ID
  nextNodeId?: string;             // Node shown after consequence
  phase: "intro" | "decision" | "consequence" | "complete";
  consequence?: ScenarioConsequence;
  decisions: ScenarioDecisionLog[];
  endingId?: string;
  totals: ScenarioTotals;          // earned, spent, movedToSavings
  updatedAt: string;               // ISO timestamp
}

ScenarioDefinition {
  id: string;                      // "kwame-request"
  track: string;                   // "save"
  title: string;
  totalDays: number;               // 14
  goalLabel: string;
  goalTarget: number;              // 80
  startingAvailable: number;       // 50
  startingSaved: number;           // 0
  startNodeId: string;             // "plan-the-money"
  nodes: ScenarioNode[];           // Full story map
  endings: ScenarioEnding[];
  competencies: Competency[];      // [goal-setting, saving, ...]
  intro: { title, body, image, cta };
  closingReflection: string;
}

ScenarioNode {
  id: string;                      // "plan-the-money"
  day?: number;                    // Explicit day override
  topic?: string;                  // "Making a plan"
  place?: string;                  // "Home veranda"
  title: string;
  situation: string;
  choices: ScenarioChoice[];       // Decision options
}

ScenarioChoice {
  id: string;                      // "save-40"
  label: string;                   // "Put GH₵40 in the box"
  effect?: ScenarioEffect;         // Money + competency deltas
  consequence: ScenarioConsequence; // Narrative + ledger
  next?: string;                   // Next node ID
  ending?: string;                 // Story ending ID
  schedule?: { inDays, nodeId, requiresFlag };
}
```

#### 2.2 Pure Engine (src/lib/scenario/engine.ts)
- **Purpose:** Financial consequence simulation + story branching
- **Key Functions:**
  - `createInitialState(scenario)` → Starting state
  - `applyChoice(scenario, state, choiceId)` → Apply decision + effects
  - `advance(scenario, state)` → Move to next node
  - `summarize(scenario, state)` → Results page data
- **No I/O:** All logic is pure functions; no database or HTTP calls

#### 2.3 Persistence Layer (src/lib/scenario/session.ts)
- **localStorage Cache:** `readCachedState()`, `writeCachedState()` for instant resume
- **Backend Storage:** 
  - `loadSession(childId, scenarioId)` → Fetch from `scenario_sessions`
  - `saveSession(childId, state)` → UPSERT to `scenario_sessions`
  - `recordDecision(childId, sessionId, state)` → Log to `scenario_decisions`

#### 2.4 React Hook (src/lib/scenario/useScenarioRunner.ts)
- Resume logic: Fetch backend, compare with cache, use newest by timestamp
- Callbacks: `start()`, `choose(choiceId)`, `continueOn()`, `restart()`
- Persistence adapter pattern allows dependency injection

#### 2.5 Components
- **ScenarioPlayer:** Renders any scenario + handles completion
- **ScenarioCard:** Thumbnail on journey page

#### 2.6 Server Functions (src/lib/auth/child-learning.functions.ts)
```typescript
loadChildScenario(scenario Id)  → GET session state
  ├─ Uses currentChildId() [post-G4: calls getCurrentChildContext()]
  ├─ Fetches from scenario_sessions
  └─ Returns { sessionId, state, definition }

saveChildScenario(state)  → POST full state + record last decision
  ├─ Uses currentChildId() [post-G4: calls getCurrentChildContext()]
  ├─ UPSERTs scenario_sessions
  ├─ Logs decision to scenario_decisions (last one in state.decisions)
  └─ Returns { sessionId }
```

---

## 3. SCENARIO DEFINITIONS

### Single Active Scenario: "The School Reopening Challenge"

**ID:** `kwame-request`  
**Track:** `save`  
**Duration:** 14 days  
**Goal:** Earn GH₵80 for school bag (starting capital: GH₵50)

#### Story Arc
```
Day 1: plan-the-money → Initial allocation decision
Day 1-2: earn-at-the-stall → Earning opportunity
Day 2-3: kwame-request → Lending dilemma (friend owes money)
Day 3-4: shop-trip → Temptation to spend
Day 4-5: earn-extra → Another earning chance
...
Day 12-14: Final days + completion
```

#### Competencies Tracked
1. goal-setting
2. saving
3. earning
4. needs-vs-wants
5. spending-decisions
6. borrowing-lending
7. money-safety
8. financial-resilience

#### Ending Conditions
- Reaches goal (GH₵80+) → Success ending
- Below goal → Alternative ending (still completes story)
- No failure state (every path is valid)

#### Content Structure
Each choice has:
- **Label & Description** → UI button text
- **Effect** → Modify available/saved/competencies/flags
- **Consequence** → Narrative + ledger (what happened)
- **Next** → Branching decision (which node next)
- **Schedule** → Delayed events (e.g., debt collection on day 8)

---

## 4. SCENARIO DATA MODEL

### Supabase Tables

#### scenario_sessions
```sql
id                 uuid PRIMARY KEY
child_profile_id   uuid NOT NULL FK→child_profiles
scenario_id        text NOT NULL  -- "kwame-request"
state              jsonb NOT NULL -- Full ScenarioState
current_node_id    text           -- Denormalized for queries
day_number         integer        -- Denormalized for sorting
status             text           -- "in_progress" | "completed"
completed_at       timestamptz    -- When scenario finished
created_at         timestamptz
updated_at         timestamptz

UNIQUE (child_profile_id, scenario_id)
CONSTRAINT scenario_sessions_id_child_key UNIQUE (id, child_profile_id)
RLS Policy: owns_child_profile(child_profile_id)
```

**Size Constraints:** State JSONB contains full decision history (max ~200 decisions = ~50KB)

#### scenario_decisions
```sql
id                 uuid PRIMARY KEY
session_id         uuid NOT NULL FK→scenario_sessions(id)
child_profile_id   uuid NOT NULL FK→child_profiles
node_id            text NOT NULL
choice_id          text NOT NULL
day_number         integer NOT NULL
details            jsonb          -- { nodeTitle, choiceLabel, availableAfter, savedAfter }
created_at         timestamptz

UNIQUE (session_id, node_id, day_number) ignoreDuplicates=true
CONSTRAINT scenario_decisions_session_child_fkey (session_id, child_profile_id)
  → (scenario_sessions.id, child_profile_id)
RLS Policy: owns_child_profile(child_profile_id)
```

**Idempotency:** UPSERT with duplicate ignore means submitting same decision twice → no duplicate row

#### journey_progress
```sql
id                 uuid PRIMARY KEY
child_profile_id   uuid NOT NULL
track_id           text DEFAULT "save"
item_type          text           -- "scenario", "lesson", "assessment"
item_id            text           -- "kwame-request"
status             text DEFAULT "completed"
score              integer        -- NULL for scenarios (no scoring yet)
max_score          integer
details            jsonb          -- { available, saved, decisions, chapter }
created_at         timestamptz
updated_at         timestamptz

UNIQUE (child_profile_id, item_type, item_id)
RLS Policy: owns_child_profile(child_profile_id)
```

Scenarios update `journey_progress` when completed, storing final state in `details`.

---

## 5. SCENARIO SESSION LIFECYCLE

### Complete Flow

```
1. DISCOVERY
   ├─ Parent navigates to /learn/$childId/scenario/kwame-request
   ├─ OR Child navigates to /child/scenario/kwame-request
   └─ Route beforeLoad calls assertChildActivity()
      └─ Validates G3 context ✓

2. LOAD
   ├─ ScenarioPlayer mounts
   ├─ useScenarioRunner hook initializes
   ├─ Check localStorage cache (readCachedState)
   ├─ If cache valid & recent: use it immediately
   ├─ Fetch from backend: loadChildScenario({ scenarioId: "kwame-request" })
   │  └─ Uses currentChildId() → G3 context ✓
   │  └─ Queries scenario_sessions WHERE (child_profile_id, scenario_id)
   │  └─ RLS enforces: owns_child_profile() ✓
   ├─ Compare cache vs backend (by updatedAt timestamp)
   ├─ Use newest version
   └─ writeCachedState() → update cache

3. RESUME vs START
   ├─ If state.phase === "intro"
   │  ├─ Show intro screen + "Start Story" button
   │  └─ User clicks → start() → applyChoice for phase transition
   └─ Else
      ├─ Show "Welcome back!" message
      └─ Display current node

4. DECISION LOOP
   ├─ Display node (question + choice buttons)
   ├─ User selects choice (e.g., "save-40")
   ├─ Client calls choose(choiceId)
   │  └─ Validates choiceId against current node? NO ⚠️
   ├─ Engine: applyChoice(scenario, state, "save-40")
   │  ├─ Find choice in node.choices
   │  ├─ If not found → return state unchanged (silent no-op) ⚠️
   │  ├─ Apply money effects
   │  ├─ Update competencies
   │  ├─ Queue scheduled events
   │  └─ Set phase = "consequence"
   ├─ State updated → triggers persist()
   │  ├─ setState(newState)
   │  ├─ writeCachedState(key, newState)
   │  ├─ saveChildScenario(newState) → POST to server
   │  │  └─ currentChildId() → G3 context ✓
   │  │  └─ UPSERT scenario_sessions
   │  │  └─ recordDecision → insert scenario_decisions
   │  │  └─ RLS enforces: owns_child_profile() ✓
   │  └─ If success → setStatus("ready")
   │  └─ If failure → setStatus("interrupted")
   └─ Display consequence (narrative + ledger)

5. ADVANCE
   ├─ User acknowledges consequence → "Continue" button
   ├─ Client calls continueOn()
   │  └─ advance(scenario, state)
   │     ├─ Check scheduled events (due today?)
   │     ├─ If scheduled event pending:
   │     │  └─ Insert event node into story flow
   │     ├─ Move to nextNodeId
   │     ├─ Increment day if needed
   │     └─ Set phase = "decision" (ready for next choice)
   ├─ persist(newState)
   └─ Display next node

6. COMPLETION
   ├─ If nextNodeId is undefined (reached ending)
   │  ├─ Set phase = "complete"
   │  ├─ Calculate ScenarioSummary (goals reached, strengths)
   │  ├─ persist(newState)
   │  └─ Show completion screen + results
   └─ User can view summary or exit to journey

7. JOURNEY UPDATE
   ├─ Parent/component calls recordChildProgress()
   │  └─ Updates journey_progress table
   │  └─ Sets status = "completed"
   │  └─ Stores final state in details.{available, saved, decisions}
   └─ Triggers celebration + next item unlock
```

### State Persistence Timing
- **Automatic:** After every decision (applyChoice) → saveChildScenario()
- **Cache + Backend:** localStorage updates immediately, backend upsert is async
- **Resume Safe:** Fetch backend state on next session load; cache acts as offline buffer

### Session Expiration
- ✅ Sessions never expire (always resumable)
- ⚠️ No explicit "abandon" mechanism (only parent can view completed state)

### Duplicate Submissions
- Client repeats same choice → POST saveChildScenario again
- Server UPSERT on (child_profile_id, scenario_id) → dedupes session
- Decision record UPSERT on (session_id, node_id, day_number) + ignoreDuplicates → only first recorded
- Result: Same decision submitted twice = no duplicate state, no double effect

---

## 6. DECISION LIFECYCLE

### Decision Submission

```
choiceId from client
         ↓
applyChoice(scenario, state, choiceId)
         ↓
node = getNode(scenario, state.nodeId)
choice = node?.choices.find(c => c.id === choiceId)
         ↓
NO VALIDATION that choiceId exists in current node ⚠️
         ↓
If choice found:
  ├─ Apply effects to state
  ├─ Log to state.decisions []
  └─ Return updated state
Else:
  └─ Return state unchanged (silent no-op)
         ↓
persist(newState)
         ↓
saveChildScenario({scenarioId, nodeId, decisions, ...}) 
         ↓
Server function:
  ├─ currentChildId() → G3 context
  ├─ NO VALIDATION that choice/node are valid ⚠️
  ├─ UPSERT scenario_sessions
  │  └─ RLS: owns_child_profile()
  ├─ recordDecision()
  │  └─ Extract last decision from state.decisions
  │  └─ Insert to scenario_decisions
  │  └─ RLS: owns_child_profile()
  └─ Return sessionId
```

### Decision Logging

**Where:** `scenario_decisions` table  
**What:** { session_id, child_profile_id, node_id, choice_id, day_number, details: {...} }  
**When:** Immediately after saveChildScenario  
**Idempotency:** UPSERT with ignoreDuplicates on (session_id, node_id, day_number)  
**Purpose:** Audit trail for parent dashboard + research

### Decision Audit Requirements
- ✅ Decisions persist durably
- ✅ Decisions logged with context (day, node, choice)
- ⚠️ No validation that decision was valid choice for node
- ⚠️ No validation that node was reachable from start
- ⚠️ No tamper detection if decision record modified post-hoc

---

## 7. BRANCHING MODEL

### Story Graph

The "School Reopening Challenge" is a **directed acyclic graph (DAG)** of story nodes:

```
START [plan-the-money]
  ├─choice 1→ [earn-at-the-stall]
  ├─choice 2→ [earn-at-the-stall]
  └─choice 3→ [earn-at-the-stall]

[earn-at-the-stall]
  ├─choice→ [kwame-request]
  ├─choice→ [kwame-request]
  └─choice→ [kwame-request]

[kwame-request] (lending dilemma)
  ├─choice (lend money)→ [earn-extra] + schedule debt collection
  ├─choice (don't lend)→ [earn-extra]
  └─choice (partial lend)→ [earn-extra]

[earn-extra] → ...
...
ENDS [ending-1-goal-reached | ending-2-below-goal]
```

### Branching Mechanics

#### Choice Effects
```typescript
effect: {
  available?: number;           // Pocket money delta (can be negative)
  saved?: number;               // Savings box delta
  transferToSaved?: number;     // Move from pocket to box
  transferAllToSaved?: boolean; // All pocket → box
  advanceDays?: number;         // Skip ahead (default 1)
  competencies?: {...};         // Hidden score changes
  flags?: {...};                // Custom flags (e.g., lentToKwame: 10)
}
```

#### Consequence Display
```typescript
consequence: {
  decisionChip?: string;   // "Decision: You lent Kwame GH₵10"
  headline: string;
  title: string;           // "Helping a friend costs"
  body: string;            // Narrative explanation
  ledgerNote?: string;     // "−GH₵10 for Kwame"
  debtNote?: string;       // "Kwame still owes GH₵5"
  laterHint?: string;      // "Something will happen day 8"
  reflection?: string;
}
```

#### Node Transitions
```typescript
choice: {
  next?: string;           // Next node ID (if any)
  ending?: string;         // Story ending (if this choice ends story)
  schedule?: {
    inDays: number;        // Days until scheduled node appears
    nodeId: string;        // Which node appears
    requiresFlag?: string; // Only show if flag set
  }
}
```

### Scheduled Events
**Use Case:** Day 1 choice → Day 8 consequence (debt collection appears)

**Implementation:**
```typescript
scheduled: [
  {
    dueDay: 8,
    nodeId: "kwame-debt-collection",
    requiresFlag: "lentToKwame"  // Only if child lent money
  }
]

// In advance():
// Check if any scheduled event dueDay === currentDay
// If yes & flag satisfied → insert event node into flow
```

---

## 8. CONSEQUENCE MODEL

### Consequence Structure

Not graded as "right/wrong" — instead, **all choices are valid** and show realistic consequences:

```
Save too much  →  Tight weekly budget
Save balanced  →  Comfortable spending
Save too little →  Easy to overspend
               ↓
         All consequences shown warmly
         "Here's what happened next"
```

### Money Ledger

Each consequence shows:
- **Pocket before & after:** "GH₵30 → GH₵20"
- **Savings before & after:** "GH₵20 → GH₵25"
- **Note:** "−GH₵10 for Kwame" or "+GH₵15 stall earnings"

### Competency Changes

Hidden (never shown as score):
```typescript
competencies: {
  "goal-setting": 2,
  "saving": 1,
  "borrowing-lending": 1
}
```

Server accumulates these across all choices; parent dashboard might show "You're strong at saving."

---

## 9. SCENARIO STATE MACHINE

### Phase Transitions

```
intro
  │ (user clicks "Start")
  ↓
decision  ←──────────────────┐
  │ (node displays choices)   │
  │                           │
  │ (user selects choice)     │
  ↓                           │
consequence                   │
  │ (display results)         │
  │                           │
  │ (user clicks "Continue")  │
  ├─→ schedule event?  YES → insert node into flow
  │   NO → move to next node
  └─────────────────────────┘

decision → complete
  (if choice has ending: true)
  
complete
  (terminal state)
  (parent can view summary)
```

### Node Validation

**Current:** ✅ None  
**Security Issue:** Client can submit any nodeId; server saves it without validation

```
choiceId from client (unknown validity)
         ↓
state.nodeId = client-supplied nodeId?
NO, applyChoice() only moves to choice.next
         ↓
But saveChildScenario() accepts full state, including nodeId
         ↓
NO VALIDATION that submitted nodeId is reachable ⚠️
```

### Day Validation

**Current:** ✅ Loose validation  
**Security Issue:** Client can submit any day number

```
choice.advanceDays (default 1)
         ↓
state.day += advanceDays
         ↓
No maximum day check ⚠️
No validation that day is consistent with story ⚠️
```

---

## 10. AUTHENTICATION

### Current Mechanism

```
Child navigates to /child/scenario/$scenarioId
         ↓
Route beforeLoad: assertChildActivity({ itemType: "scenario", itemId })
         ↓
assertChildActivity() internally calls:
  await getCurrentChildContext()
         ↓
getAuthenticatedChild() [G3 context]
  ├─ Validates session cookie
  ├─ Loads child profile
  ├─ Resolves Firebase identity (optional)
  └─ Returns AuthenticatedChildContext
         ↓
If valid: Continue to route
If invalid/expired: Throw error → redirect
```

### Server Function Authentication

```
loadChildScenario() / saveChildScenario()
         ↓
Calls currentChildId()
         ↓
currentChildId() → getAuthenticatedChild().childId
         ↓
Validates session + profile consistency
         ↓
Returns childId or throws AuthorizationError
```

### Firebase Identity (G3 Integration)

- Optional field in `AuthenticatedChildContext`
- If present: `context.firebase.familyId` must match `context.familyId`
- If mismatch: Throws AuthorizationError
- If unavailable: Continues without Firebase (graceful degradation)

### Current Assessment

- ✅ Session-level authentication working (G3)
- ✅ Server functions use G3 context via currentChildId()
- ✅ Route-level guards in place (assertChildActivity)
- ⚠️ **No explicit scenario eligibility check** (any child can try any scenario, but only scenarios in track are accessible via UI)

---

## 11. G3 INTEGRATION POINT

### Current State (Post-G4)

```
currentChildId() [in child-learning.functions.ts]
         ↓
Calls: const context = await getCurrentChildContext();
         ↓
Returns: context.childId
```

### What's Happening
- `currentChildId()` now internally uses `getCurrentChildContext()`
- This means `loadChildScenario()` and `saveChildScenario()` indirectly use G3 context
- But there's no explicit reference to full `AuthenticatedChildContext` in scenario functions

### Recommended G5 Enhancement

```
Instead of:
  const childId = await currentChildId();
  
Use explicitly:
  const context = await getCurrentChildContext();
  const childId = context.childId;
  const familyId = context.familyId;
  
Then validate:
  ├─ context.session.kind === "child"
  ├─ context.session not expired/revoked
  ├─ context.profile.id === childId
  ├─ Firebase identity (if present) familyId matches
  └─ Child belongs to allowed track/scenario
```

### Full G3 Context Access Needed

```typescript
AuthenticatedChildContext {
  session: ChildSession {
    kind: "child",
    childId: string,
    sessionId: string,
    createdAt: Date,
    expiresAt: Date,
    revokedAt?: Date
  },
  profile: ChildProfile {
    id: string,
    tatiId: string,
    name: string,
    age: number,
    avatar: string,
    tier: string,
    curriculum_level?: string,
    familyId: string
  },
  firebase?: FirebaseChildIdentity,
  childId: string,
  sessionId: string,
  familyId: string
}
```

---

## 12. CHILD AUTHORIZATION

### Current Model

```
Request to loadChildScenario / saveChildScenario
         ↓
Extract childId from session (via currentChildId())
         ↓
Query scenario_sessions WHERE (child_profile_id = childId, scenario_id = ?)
         ↓
RLS: owns_child_profile(child_profile_id)
         ↓
If owns_child_profile returns TRUE:
  └─ Row visible/writable
Else:
  └─ Row hidden (appears as not found)
```

### Ownership Determination

```
owns_child_profile(child_profile_id uuid) [function in Supabase]
         ↓
SELECT EXISTS (
  SELECT 1 FROM families f
  WHERE f.id IN (
    SELECT family_id FROM child_profiles c
    WHERE c.id = child_profile_id
  )
  AND EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.family_id = f.id
    AND fm.user_id = auth.uid()
  )
)
```

Translation: "Is this child in a family where the current user is a member?"

### Authorization Scenarios

#### Child A accessing own scenario session
```
Child A session
         ↓
currentChildId() → "child-a-uuid"
         ↓
Query scenario_sessions WHERE (child_profile_id = "child-a-uuid", scenario_id = "kwame-request")
         ↓
RLS: owns_child_profile("child-a-uuid")
  ├─ Child A is in family F
  ├─ User is member of family F
  └─ Returns TRUE ✓
         ↓
Row visible → Load/save ✓
```

#### Child A accessing Child B's scenario session (same family)
```
Child A session + Child B's scenario_id
         ↓
currentChildId() → "child-a-uuid" (from session)
         ↓
Query scenario_sessions WHERE (child_profile_id = "child-b-uuid", scenario_id = "kwame-request")
         ↓
RLS: owns_child_profile("child-b-uuid")
  ├─ Child B is in family F
  ├─ User logged in as: Child A (different child_profile_id)
  ├─ BUT: User (parent) is member of family F
  └─ Returns TRUE (parent can access) ✓
         ↓
BUT: Only parent routes call this; child routes always use currentChildId()
```

#### Parent accessing child's scenario session
```
Parent session + Child C's scenario_id
         ↓
Parent is in session: parent-user-id
         ↓
Query scenario_sessions WHERE (child_profile_id = "child-c-uuid", ...)
         ↓
RLS: owns_child_profile("child-c-uuid")
  ├─ Child C is in family F
  ├─ Parent (user) is member of family F
  └─ Returns TRUE ✓
         ↓
Row visible → Parent can view ✓
```

#### Child A accessing Child B's scenario session (different family)
```
Child A session [from Family F]
         ↓
currentChildId() → "child-a-uuid"
         ↓
Try to access: scenario_sessions WHERE (child_profile_id = "child-b-uuid" [from Family G])
         ↓
RLS: owns_child_profile("child-b-uuid")
  ├─ Child B is in family G
  ├─ User is in family F (different)
  └─ Returns FALSE ✗
         ↓
Row NOT visible; query returns empty ✓ (Cross-family blocked)
```

---

## 13. CROSS-CHILD ISOLATION

### Database Constraints

```sql
UNIQUE (child_profile_id, scenario_id)
CONSTRAINT scenario_sessions_id_child_key UNIQUE (id, child_profile_id)
```

This prevents multiple children from having session in same row.

```sql
CONSTRAINT scenario_decisions_session_child_fkey
  FOREIGN KEY (session_id, child_profile_id)
  REFERENCES scenario_sessions(id, child_profile_id)
```

**Compound FK:** Decision must reference session + child together. If attacker tries:
```
INSERT INTO scenario_decisions (session_id=child-b-session, child_profile_id=child-a)
         ↓
FK violation: (child-b-session, child-a) doesn't exist ✓
```

### Application-Level Safeguards

#### loadChildScenario()
```
currentChildId() → "child-a-uuid" (from session)
         ↓
Query: scenario_sessions WHERE child_profile_id = "child-a-uuid" AND scenario_id = ?
         ↓
If attacker spoofs scenario_id or childId in request:
  └─ currentChildId() returns authenticated childId (not request param) ✓
         ↓
RLS enforces: even if query runs, row hidden if user doesn't own it ✓
```

#### saveChildScenario()
```
currentChildId() → "child-a-uuid"
         ↓
UPSERT scenario_sessions (child_profile_id = "child-a-uuid", ...)
         ↓
RLS: owns_child_profile("child-a-uuid") must be TRUE
         ↓
If attacker tries to save with child_profile_id = "child-b-uuid":
  └─ UPSERT still uses server-derived childId ✓
  └─ Compound FK prevents decisions from attaching ✓
```

### Current Assessment

- ✅ Database constraints prevent cross-child FK violations
- ✅ RLS prevents unauthorized row access
- ✅ Server derives childId from session (not request params)
- ✅ Compound FK enforces session→decision relationship
- ✅ Cross-child access blocked at multiple layers

---

## 14. CROSS-FAMILY ISOLATION

### Implementation

```
owns_child_profile(child_profile_id)
         ↓
Checks: 
  1. Is this child in a family?
  2. Is the current user a member of that family?
         ↓
If BOTH true → Access granted
Else → Access denied
```

### Scenarios

#### Family A accessing Family B's child's data
```
Parent A (in family A)
         ↓
Request: /learn/child-b-id/scenario/kwame-request
         ↓
Route: assertChildInCurrentFamily(childId = "child-b-id")
         ↓
Checks: Is child-b in same family as parent A?
  └─ NO → Throw error, redirect to /parent
```

#### Malicious request from Family A to Family B's scenario session
```
Parent A + Child B scenario_id
         ↓
Query: scenario_sessions WHERE child_profile_id = child-b-uuid
         ↓
RLS: owns_child_profile(child-b-uuid)
  ├─ Child B is in family B
  ├─ Parent A is in family A
  └─ FALSE ✗
         ↓
Row hidden; query returns empty
```

### Current Assessment

- ✅ Route-level guard: `assertChildInCurrentFamily()`
- ✅ Database-level guard: `owns_child_profile()` RLS
- ✅ Compound FK prevents cross-family attachment
- ✅ Multi-layer defense (fail-closed)

---

## 15. REPLAY & IDEMPOTENCY

### Current Mechanism

#### Session Upsert
```
UPSERT scenario_sessions 
  ON (child_profile_id, scenario_id) 
  DO UPDATE SET state = ?, updated_at = now()
         ↓
Same child + same scenario: 1 row total (state updated)
Multiple submissions: Latest state wins (by updated_at in client logic)
```

#### Decision Upsert
```
UPSERT scenario_decisions
  ON (session_id, node_id, day_number)
  WITH ignoreDuplicates = true
         ↓
Same choice on same node same day: 0 duplicates
Multiple submissions: First one recorded, rest ignored
```

### Replay Scenarios

#### Scenario 1: Same decision submitted twice
```
Choice: "save-40" at node "plan-the-money" on day 1
         ↓
First submission:
  ├─ applyChoice() → state updated
  ├─ saveChildScenario(state) → UPSERT session
  ├─ recordDecision() → INSERT scenario_decisions
  └─ Result: 1 decision recorded, state saved

Second submission (duplicate):
  ├─ applyChoice() called again with same choiceId → same result
  ├─ saveChildScenario(state) → UPSERT session (state unchanged)
  ├─ recordDecision() → UPSERT scenario_decisions (duplicate ignore)
  └─ Result: No new decision, state unchanged
         ↓
Outcome: ✅ Idempotent (safe replay)
```

#### Scenario 2: Different choices on same node
```
User chooses "save-40" → applyChoice() → consequence shown
         ↓
User goes back (browser back button) → state reverts to pre-decision
         ↓
User chooses "save-30" instead → applyChoice() with different choiceId
         ↓
State is different (different money effect)
         ↓
saveChildScenario() with new state → UPSERT session
         ↓
Outcome: Session state reflects latest choice
NO: Previous decision not recorded in scenario_decisions (only last decision in state is extracted)
⚠️ ISSUE: If browser back button is used, decision history gets lost
```

#### Scenario 3: Offline changes + sync
```
User is offline (saveChildScenario fails)
         ↓
User continues making choices (state updates in localStorage)
         ↓
User goes online
         ↓
Each saveChildScenario now succeeds
         ↓
state.decisions contains full history
         ↓
Only LAST decision is recorded to scenario_decisions ⚠️
         ↓
Previous offline decisions missing from audit trail ⚠️
```

### Current Assessment

- ✅ Session state is fully idempotent (UPSERT)
- ✅ Decisions deduplicated on (session_id, node_id, day_number)
- ⚠️ Only last decision in state.decisions is recorded
- ⚠️ If user rewinds (browser back), historical decisions lost
- ⚠️ Offline sessions: intermediate decisions not captured in audit table

---

## 16. STATE INTEGRITY

### Current Validation

#### Input Validation (Zod)
```typescript
scenarioStateInput = z.object({
  scenarioId: z.string().min(1).max(128),
  nodeId: z.string().min(1).max(128),
  phase: z.string().min(1).max(32),
  day: z.number().int().min(1).max(366),
  available: z.number().min(0),
  saved: z.number().min(0),
  goalTarget: z.number().min(0),
  decisions: z.array(z.unknown()).max(200),
  updatedAt: z.string().datetime(),
}).passthrough();
```

**Assessment:**
- ✅ Basic type validation
- ✅ Bounds checking (day ≤ 366)
- ✅ No negative money
- ⚠️ No validation that nodeId exists in scenario
- ⚠️ No validation that phase is in ("intro", "decision", "consequence", "complete")
- ⚠️ No validation that day is consistent with story path
- ⚠️ No validation that goalTarget matches scenario definition

#### State Integrity Checks
```
saveChildScenario(state)
         ↓
const definition = getScenarioDefinition(data.scenarioId);
if (!definition) throw error;
         ↓
UPSERT without validating:
  ├─ nodeId exists in definition.nodes ⚠️
  ├─ submitted day is reachable from start ⚠️
  ├─ submitted money values make sense ⚠️
  ├─ decisions array matches decisions in state ⚠️
  └─ phase is valid ⚠️
```

### Potential Attacks

#### Attack 1: Jump to ending node
```
Client submits: { nodeId: "ending-goal-reached", phase: "complete", ... }
         ↓
saveChildScenario validates definition exists ✓
saveChildScenario does NOT validate nodeId is reachable ✗
         ↓
State saved with artificial completion ✓
Journey progress marked as completed ✓
Parent sees "Story completed" ✗
```

#### Attack 2: Manipulate money
```
Client submits: { available: 10000, saved: 50000, goalTarget: 80, ... }
         ↓
Zod validates: available ≥ 0 ✓
Zod validates: saved ≥ 0 ✓
No upper bound validation ✗
         ↓
State saved with unrealistic money ✓
Journey progress reflects artificial wealth ✗
```

#### Attack 3: Skip days
```
Client submits: { day: 14, nodeId: "final-node", phase: "complete", ... }
         ↓
Zod validates: day ≤ 366 ✓
No validation that day 14 is reached legitimately ✗
         ↓
State saved ✓
```

### Current Assessment

- ✅ Basic Zod validation prevents type errors
- ⚠️ **No scenario graph validation** (nodeId exists, path reachable)
- ⚠️ **No state consistency validation** (money totals, day progression)
- ⚠️ **No authentication replay check** (same state resubmitted multiple times)
- ⚠️ **No choice validation** (choiceId belonged to current node)

---

## 17. G4 ASSESSMENT INTEGRATION

### Current Relationship

```
Pre-Test / Post-Test (assessment_attempts table)
  ├─ Stored separately from scenarios
  └─ No direct link to scenario progress

Journey Progress (journey_progress table)
  ├─ Records completion of both assessments AND scenarios
  ├─ item_type: "assessment" | "scenario" | "lesson"
  └─ score/max_score: NULL for scenarios (no scoring yet)

Scenario-specific data
  ├─ Stored in scenario_sessions + scenario_decisions
  ├─ No competency scoring (unlike assessments)
  └─ No achievement system
```

### Scenario Competencies (Hidden)

```
ScenarioState {
  competencies: {
    "goal-setting": 3,
    "saving": 2,
    ...
  }
}
```

**Stored:** In scenario_sessions.state JSONB → not queryable without fetching full state  
**Displayed:** Never shown to child as scores; parent dashboard could extract  
**G4 Connection:** None currently; assessments have server-authoritative scoring, scenarios don't

### Potential G5 Enhancement

```
After scenario completion, could:
  ├─ Extract final competency scores from state
  ├─ Store in learner_competencies table (if created)
  ├─ Compare with assessment competencies
  └─ Show "You're strong at: saving, goal-setting"
```

**Current Status:** Out of scope for G5 (read-only audit)

### Current Assessment

- ✅ Assessments and scenarios tracked separately
- ✅ Both update journey_progress for journey tracking
- ✅ Competencies exist in scenario state but hidden
- ⚠️ No competency persistence table (competencies lost if state deleted)
- ⚠️ No achievement system connected to scenarios
- ⚠️ No scoring/ranking of scenario performance

---

## 18. JOURNEY/PROGRESS INTEGRATION

### journey_progress Table

```
id, child_profile_id, track_id, item_type, item_id, 
status, score, max_score, details, created_at, updated_at

item_type: "assessment" | "lesson" | "scenario" | "reflection"
item_id: "kwame-request" (scenario ID)
status: "completed"
score: NULL (for scenarios)
max_score: NULL (for scenarios)
details: { available, saved, decisions, chapter }
```

### Scenario Completion Flow

```
Scenario reaches completion (phase = "complete")
         ↓
Component calls: onComplete({ available, saved, decisions })
         ↓
Parent calls: recordChildProgress({
  childId,
  itemType: "scenario",
  itemId: "kwame-request",
  details: { available, saved, decisions }
})
         ↓
Server function recordChildProgress() [src/lib/progress/service.ts]
  ├─ currentChildId() ✓ (G3 context)
  ├─ UPSERT journey_progress
  │  (child_profile_id, item_type, item_id)
  ├─ RLS: owns_child_profile() ✓
  └─ Returns { id, status }

Progress tracking { available, saved, decisions }
  ├─ available: GH₵ on hand at completion
  ├─ saved: GH₵ in savings box
  └─ decisions: Full decision log
```

### Progression & Unlocking

```
Scenario "kwame-request" completed
         ↓
Next item in track.sequence = "lesson-budgeting"
         ↓
Parent dashboard checks:
  ├─ Is "kwame-request" in journey_progress?
  ├─ Is status = "completed"?
  └─ Show "Next: Lesson — Budgeting" ✓
```

### Scenario Can Be Restarted

```
User clicks "Restart" button
         ↓
clearSaved() → removes localStorage cache
restart() → createInitialState(scenario)
persist() → UPSERT scenario_sessions with new state
         ↓
Result: scenario_sessions row updated with fresh state
journey_progress still shows original completion (oldest by created_at)
OR record is updated if UPSERT on same (child, item_type, item_id) ⚠️
```

**Issue:** Unclear if replaying a scenario creates new journey_progress row or overwrites  
(Likely overwrites, which means replay progress is lost)

### Current Assessment

- ✅ Scenario completion tracked in journey_progress
- ✅ Details stored (available, saved, decisions)
- ✅ Next item can be discovered from track sequence
- ⚠️ Replaying a scenario might overwrite original progress record
- ⚠️ No achievement/milestone system triggered on completion

---

## 19. ACHIEVEMENT/REWARD INTEGRATION

### Current State

**No achievements implemented for scenarios.**

Firestore rules anticipate:
```
match /achievements/{achievementId}
```

But no Supabase table or logic to award achievements.

### Potential Future Implementation

```
Scenario completion could trigger:
  ├─ Goal reached (≥GH₵80) → "You reached your goal!"
  ├─ Perfect savings (saved all possible) → "Master saver"
  ├─ No borrowing → "Self-reliant"
  ├─ All competencies high → "Financial wise one"
  └─ Speed-run (< 8 days) → "Speed learner"
         ↓
Award achievement & celebrate
```

### Current Assessment

- ✅ No active achievement system (no risk of manipulation)
- ⚠️ No reward/badge system for scenarios
- ⚠️ Competency tracking exists but not exposed/leveraged
- ✅ Future-proof: Achievement infrastructure can be added in G6+

---

## 20. SUPABASE DATABASE ANALYSIS

### Schema

#### scenario_sessions
```
Primary Key:     id (uuid)
Ownership:       child_profile_id (FK → child_profiles)
Uniqueness:      UNIQUE(child_profile_id, scenario_id)
Compound Key:    UNIQUE(id, child_profile_id)
State:           state (JSONB, unlimited size ~50KB typical)
Denormalized:    current_node_id, day_number (for indexing)
Status:          status (in_progress | completed)
Timestamps:      created_at, updated_at (auto-managed)
RLS:             owns_child_profile(child_profile_id)
```

**Size Considerations:**
- 1 scenario session ≈ 30-50KB (full state + 200-decision history)
- 10,000 children × 1 scenario ≈ 300-500MB uncompressed
- JSONB compression in Postgres ≈ 40-60% of size

#### scenario_decisions
```
Primary Key:     id (uuid)
Ownership:       child_profile_id (FK → child_profiles)
Session Ref:     session_id (FK → scenario_sessions)
Compound FK:     (session_id, child_profile_id)
Uniqueness:      UNIQUE(session_id, node_id, day_number)
                 ignoreDuplicates = true
Audit Trail:     node_id, choice_id, day_number, details (JSONB)
Timestamp:       created_at (immutable)
RLS:             owns_child_profile(child_profile_id)
```

**Index Analysis:**
- idx_scenario_decisions_session (session_id) → Fast lookup by session
- idx_scenario_decisions_child (child_profile_id) → RLS enforcement
- Compound FK naturally indexed

### Constraints & Triggers

#### Constraints
```sql
UNIQUE (child_profile_id, scenario_id)  -- Only 1 active session per child
UNIQUE (session_id, node_id, day_number) -- Deduplicate decisions
scenario_sessions_id_child_key -- Compound uniqueness
scenario_decisions_session_child_fkey -- Compound FK
```

#### Triggers
```sql
scenario_sessions_set_updated_at -- auto-update updated_at on modification
```

### RLS Policies

```
"family manages scenario sessions"
  ├─ USING: owns_child_profile(child_profile_id)
  ├─ WITH CHECK: owns_child_profile(child_profile_id)
  └─ Applies to SELECT, INSERT, UPDATE, DELETE

"family manages scenario decisions"
  ├─ USING: owns_child_profile(child_profile_id)
  ├─ WITH CHECK: owns_child_profile(child_profile_id)
  └─ Applies to SELECT, INSERT, UPDATE, DELETE
```

### Query Patterns

#### Load scenario state
```sql
SELECT id, state FROM scenario_sessions
WHERE child_profile_id = $1 AND scenario_id = $2
LIMIT 1
-- RLS filters: only rows where owns_child_profile($1) = true
```

#### Save scenario state
```sql
UPSERT scenario_sessions 
  (child_profile_id, scenario_id, state, current_node_id, ...)
ON CONFLICT (child_profile_id, scenario_id) 
DO UPDATE SET state = ..., updated_at = now()
-- RLS enforces: WITH CHECK owns_child_profile($1)
```

#### Record decision (audit trail)
```sql
UPSERT scenario_decisions
  (session_id, child_profile_id, node_id, choice_id, day_number, ...)
ON CONFLICT (session_id, node_id, day_number) 
DO NOTHING
-- ignoreDuplicates + RLS: only first decision recorded
```

### Current Assessment

- ✅ Schema well-designed with compound keys & FKs
- ✅ Indexes support efficient queries
- ✅ Triggers maintain audit fields
- ✅ RLS policies comprehensive
- ✅ Constraints prevent data integrity violations
- ⚠️ No cascade delete protection (scenarios deleted → all sessions deleted)
- ⚠️ No archival/retention policy (old sessions accumulate)

---

## 21. RLS ANALYSIS

### Function: owns_child_profile()

```sql
CREATE FUNCTION public.owns_child_profile(_child_id uuid)
RETURNS boolean
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.families f
    WHERE f.id IN (
      SELECT family_id FROM public.child_profiles
      WHERE id = _child_id
    )
    AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = f.id
      AND fm.user_id = auth.uid()
    )
  )
$$
```

### Walkthrough

```
1. Get the family of the child (_child_id)
   └─ Assumes 1 child per family (true in MVP)

2. Check if current user (auth.uid()) is a family_member
   └─ If exists → TRUE (access granted)
   └─ If not exists → FALSE (access denied)
```

### RLS Application in Scenarios

#### SELECT scenario_sessions
```
Query: SELECT * FROM scenario_sessions WHERE child_profile_id = $1
         ↓
Postgres applies RLS USING clause:
  AND owns_child_profile(child_profile_id)
         ↓
If owns_child_profile($1) = FALSE:
  └─ No rows returned (secure exclusion)
```

#### INSERT scenario_decisions
```
Query: INSERT INTO scenario_decisions (child_profile_id, session_id, ...)
         ↓
Postgres applies RLS WITH CHECK clause:
  AND owns_child_profile(child_profile_id)
         ↓
If owns_child_profile(child_profile_id) = FALSE:
  └─ INSERT rejected with permission error
```

### Security Model Assumptions

1. **family_members table is authoritative** for family membership
2. **auth.uid() is trusted** (managed by Supabase Auth)
3. **Each child belongs to exactly 1 family** (enforced by FK in schema)
4. **Each family member is a real person** (no spoofed UIDs)

### Current Assessment

- ✅ RLS correctly implements family-scoped isolation
- ✅ Prevents cross-family row access
- ✅ Prevents cross-child access (via family membership)
- ✅ Applied to all scenario tables
- ✅ Fail-closed (default deny)
- ✅ No RLS bypass known (TanStack Start .server.ts isolation prevents privilege escalation)

---

## 22. FIREBASE READINESS

### Firestore Rules (Current)

```
match /families/{familyId}/children/{childId}/scenarioSessions/{scenarioKey} {
  allow read: if canAccessChild(familyId, childId);
  allow write: if false;
  
  match /decisions/{decisionId} {
    allow read: if canAccessChild(familyId, childId);
    allow write: if false;
  }
}
```

**Current Status:** Read-only from client; backend/admin writes only

### Firestore Structure (Future)

If Firebase becomes primary in G6+:
```
/families/{familyId}/
  /children/{childId}/
    /scenarioSessions/{scenarioKey}/
      state: { ... full ScenarioState JSONB ... }
      current_node_id, day_number, status, completed_at
      
    /scenarioSessions/{scenarioKey}/decisions/{decisionId}/
      session_id, node_id, choice_id, day_number, details
```

### Migration Path (Not in G5 scope)

```
If Firebase becomes active in future:
  ├─ Replicate scenario_sessions → Firestore on completion
  ├─ Replicate scenario_decisions → Firestore in real-time
  └─ Dual-write during transition period
```

### Current Assessment

- ✅ Firestore rules ready for read-only scenarios
- ✅ Client-side writes disabled (fail-closed)
- ✅ Collection structure matches Supabase schema
- ✅ Admin writes can be implemented when needed
- ⚠️ No current migration tooling (in G5 scope: out of scope)
- ⚠️ Firebase identity (Firebase UID) not connected to scenario sessions yet

---

## 23. TATI-SPECIFIC REQUIREMENTS

### Age Tiers

#### Junior (Age 8-12)
**Requirements:**
- ✅ Simple 14-day scenario (School Reopening)
- ✅ Visual money representation (GH₵ amounts, ledger)
- ✅ Clear choices (no moral ambiguity)
- ✅ Immediate consequences
- ✅ Final result comparison (goal reached vs not)

**Current Support:** ✅ Fully supported

#### Teen (Age 13-18)
**Requirements:**
- ✅ Multi-day scenarios (14+ days)
- ✅ Complex decisions (lending, investing, earning)
- ✅ Delayed consequences (debt collection day 8)
- ✅ Branching paths
- ✅ Competency tracking

**Current Support:** ✅ Fully supported (engine is agnostic to age)

### Mechanics

#### Earning
```
Scenario nodes: "earn-at-the-stall", "earn-extra"
Effect: available += 15
Real-world mapping: Child does chores/odd jobs
```
**Current Support:** ✅ Full

#### Saving
```
Choice: "transferToSaved: 40"
Effect: available -= 40, saved += 40
Real-world mapping: Move money to protected savings
```
**Current Support:** ✅ Full

#### Spending
```
Choice: "effect: { available: -15 }"
Effect: Pocket money goes down
Real-world mapping: Buy snacks, transport, etc.
```
**Current Support:** ✅ Full

#### Donating
**Current Support:** ⚠️ Not in School Reopening scenario; could add choice: "effect: {available: -X}"

#### Investing
**Current Support:** ⚠️ Not in School Reopening; could add scheduled returns: "schedule: {inDays: 7, nodeId: 'investment-returns'}"

#### Borrowing/Lending
```
Scenario: kwame-request → lend money to friend
Effect: available -= 10 (lent amount)
Schedule: day 8 → kwame-debt-collection (repayment)
Flag: lentToKwame (triggers debt node)
```
**Current Support:** ✅ Full

#### Budgeting
```
Implicit: Child allocates initial GH₵50 across days
No explicit budgeting UI; implicit in consequence narratives
```
**Current Support:** ⚠️ Implicit only (could add explicit budgeting mini-game)

#### Tracking Money
```
Ledger shown after each decision: "GH₵30 → GH₵20"
Totals on completion: earned, spent, saved
```
**Current Support:** ✅ Full

#### Ghana Cedi (GH₵)
```
All amounts in GH₵; no currency exchange
Scenario: GH₵50 start, GH₵80 goal
Ledger: Shows as GH₵X
```
**Current Support:** ✅ Full

#### Multi-Day Scenarios
```
14-day School Reopening
Day tracking: state.day
Scheduled events: appear on specific days
```
**Current Support:** ✅ Full

#### Consequence-Driven Learning
```
Every choice shows a consequence ("Here's what happened")
No right/wrong framing; all paths show consequences
Hidden competency tracking (not shown as scores)
```
**Current Support:** ✅ Full

### Summary Table

| Feature | Status | Notes |
|---------|--------|-------|
| Junior scenarios | ✅ | 14-day School Reopening fully supported |
| Teen scenarios | ✅ | Engine supports complexity; no Teen scenario defined yet |
| Earning | ✅ | +GH₵ effects in place |
| Saving | ✅ | transferToSaved, transferAllToSaved |
| Spending | ✅ | −GH₵ effects |
| Donating | ⚠️ | Possible via −GH₵ effect; not in current scenario |
| Investing | ⚠️ | Possible via schedule + flags; not in current scenario |
| Borrowing/Lending | ✅ | kwame-request scenario implements lending |
| Budgeting | ⚠️ | Implicit; could enhance with explicit allocation |
| Money tracking | ✅ | Ledger, totals, per-node history |
| Ghana cedi | ✅ | All amounts in GH₵ |
| Multi-day | ✅ | 14-day scenario with day transitions |
| Consequence-driven | ✅ | Full narrative + consequence system |

---

## 24. PERFORMANCE & CONCURRENCY

### Concurrent Request Handling

#### Scenario 1: Two tabs, same child, same scenario
```
Tab A: User chooses "save-40"
  └─ POST saveChildScenario(state-A)

Tab B: User chooses "save-20" (from resuming)
  └─ POST saveChildScenario(state-B)
         ↓
Race condition: Which state wins?
         ↓
UPSERT scenario_sessions ON (child_profile_id, scenario_id)
  └─ Whichever request completes last overwrites
  └─ Earlier state lost ✗
```

**Current Mitigation:** None (Last-write-wins)  
**Risk:** User loses work from one tab

#### Scenario 2: Double-click "Continue" button
```
User clicks "Continue" → POST advance()
User clicks again (impatient) → POST advance() again
         ↓
First request: advance(state-1) → state-2
  └─ saveChildScenario(state-2)
  
Second request: advance(state-1) → state-2 (same)
  └─ saveChildScenario(state-2) again
         ↓
UPSERT scenario_sessions → state-2 (idempotent) ✓
```

**Current Mitigation:** Zod validation + state immutability  
**Risk:** Low (UPSERT handles duplicate)

#### Scenario 3: Network retry after timeout
```
POST saveChildScenario → timeout (network stalls)
Client retries (auto or manual)
Server receives duplicate POST
         ↓
UPSERT scenario_sessions + UPSERT scenario_decisions (ignoreDuplicates)
  └─ Idempotent → no duplicate state or decision ✓
```

**Current Mitigation:** UPSERT idempotency  
**Risk:** Low (safe to retry)

### Performance Considerations

#### Query Performance
```
SELECT id, state FROM scenario_sessions
WHERE child_profile_id = $1 AND scenario_id = $2

Index: UNIQUE (child_profile_id, scenario_id)
  └─ B-tree index on both columns
  └─ O(log n) lookup ✓
```

#### JSONB Size
```
Average scenario state: 30-50KB
Complex scenario (200+ decisions): up to 100KB

JSONB in Postgres:
  ├─ Compressed binary format (~40% original)
  ├─ Efficient for storage
  └─ Slow to parse on every load ⚠️

Fetching state from Postgres:
  └─ Network transfer: 15-40KB for typical scenario ✓
```

#### Decision Recording
```
INSERT scenario_decisions (1 row per decision)
UPSERT on (session_id, node_id, day_number)
  ├─ Index lookup O(log n)
  ├─ No full-table scan
  └─ Fast ✓
```

#### Update Frequency
```
saveChildScenario called after every choice
  └─ Network latency: ~100-500ms
  └─ Postgres INSERT/UPSERT: ~1-10ms
  └─ Total: ~100-500ms per decision
  └─ Acceptable for user experience ✓
```

### Low-Bandwidth Considerations

TATI target: Children in low-bandwidth environments (Ghana, ~1-5 Mbps)

```
Initial load: definition (small, ~5KB)
State fetch: ~30-50KB compressed
State save: ~30-50KB POST body
Per-decision traffic: ~50KB round trip
         ↓
Over 14-day scenario (≈50 decisions):
  └─ Total: ~2.5MB network traffic
  └─ With mobile 1-5 Mbps: ~8-40 minutes continuous
  └─ Acceptable if user takes ~30min for scenario ✓
```

### Current Assessment

- ✅ Index-backed queries fast
- ✅ UPSERT idempotent (safe for retries)
- ✅ Compressed JSONB efficient
- ⚠️ **No optimistic locking** (concurrent tabs can overwrite)
- ⚠️ **No conflict resolution** (last-write-wins)
- ✅ Network-resilient (offline cache + retry)
- ✅ Low-bandwidth friendly (~50KB per decision)

---

## 25. SECURITY THREAT MODEL

### Authentication Threats

#### Threat: Unauthenticated scenario access
**Attack:** User without session tries to access /child/scenario/kwame-request  
**Current Defense:** Route beforeLoad: assertChildActivity() validates G3 context  
**Status:** ✅ Protected (throw → redirect to login)  
**Severity:** Critical  

#### Threat: Expired session
**Attack:** Session cookie expired; user tries to load scenario  
**Current Defense:** getCurrentChildContext() checks expiresAt; throws AuthorizationError  
**Status:** ✅ Protected (session revalidation on every request)  
**Severity:** Critical  

#### Threat: Revoked session (e.g., family member removed)
**Attack:** Parent removes child; child continues with old session  
**Current Defense:** session.revokedAt checked in requireAuthenticatedChild()  
**Status:** ✅ Protected (if revocation marks revokedAt)  
**Severity:** Critical  

#### Threat: Forged session cookie
**Attack:** Attacker crafts fake session cookie  
**Current Defense:** HTTP-only cookies + server-side validation (getCookie → validateChildSession)  
**Status:** ✅ Protected (HTTP-only prevents JS theft; server validates crypto)  
**Severity:** Critical  

### Authorization Threats

#### Threat: Cross-child access (Child A reads Child B's session)
**Attack:** Attacker navigates to /child/scenario/child-b-id  
**Current Defense:**  
- Route uses URL param `scenarioId` only (not childId for child routes)
- loadChildScenario() derives childId from authenticated session
- RLS enforces owns_child_profile() at database layer
**Status:** ✅ Protected (multi-layer defense)  
**Severity:** Critical  

#### Threat: Cross-family access (Family A views Family B child's progress)
**Attack:** Parent A tries /learn/child-b-id/scenario/  
**Current Defense:** assertChildInCurrentFamily() in route beforeLoad  
**Status:** ✅ Protected (explicit family validation)  
**Severity:** Critical  

#### Threat: Role escalation (Child escalates to parent)
**Attack:** Child tries to call parent-specific function  
**Current Defense:** Different routes for child vs parent; session type validation  
**Status:** ✅ Protected (route-level separation)  
**Severity:** High  

#### Threat: Session ID spoofing in recordDecision()
**Attack:** Attacker submits sessionId from different child's session  
**Current Defense:** Compound FK (session_id, child_profile_id) validated at DB  
**Status:** ✅ Protected (FK violation rejected)  
**Severity:** High  

### Input Manipulation Threats

#### Threat: Fake scenarioId
**Attack:** POST saveChildScenario({ scenarioId: "fake-scenario", ... })  
**Current Defense:** getScenarioDefinition(scenarioId) checks registry  
**Status:** ✅ Protected (throw if not found)  
**Severity:** Medium  

#### Threat: Fake sessionId
**Attack:** POST saveChildScenario({ sessionId: "attacker-uuid", ... })  
**Current Defense:** sessionId is server-generated from UPSERT; client doesn't submit it  
**Status:** ✅ Protected (sessionId only from server response)  
**Severity:** Low  

#### Threat: Fake nodeId
**Attack:** POST saveChildScenario({ nodeId: "ending-node", ... })  
**Current Defense:** No validation that nodeId exists in scenario ⚠️  
**Status:** ⚠️ **NOT PROTECTED** (state saved with invalid nodeId)  
**Severity:** **High**  
**Recommended Fix:** Validate nodeId in getScenarioDefinition() before save

#### Threat: Fake day
**Attack:** POST saveChildScenario({ day: 100, ... })  
**Current Defense:** Zod validates day ≤ 366; no max-day validation ⚠️  
**Status:** ⚠️ **PARTIALLY PROTECTED** (unrealistic but accepted)  
**Severity:** Medium  
**Recommended Fix:** Validate day ≤ scenario.totalDays

#### Threat: Fake choiceId
**Attack:** POST saveChildScenario with invalid choiceId in decisions  
**Current Defense:** applyChoice() silently ignores unknown choiceIds  
**Status:** ⚠️ **NOT PROTECTED** (state saved without choice validation)  
**Severity:** **High**  
**Recommended Fix:** Validate every choice in decisions[] against scenario

#### Threat: Negative money
**Attack:** POST with available: -1000  
**Current Defense:** Zod: z.number().min(0)  
**Status:** ✅ Protected (Zod validation)  
**Severity:** Medium  

#### Threat: Massive money
**Attack:** POST with available: 999999999  
**Current Defense:** No upper bound ⚠️  
**Status:** ⚠️ **NOT PROTECTED** (accepted by Zod)  
**Severity:** Low (data validity, not security)  
**Recommended Fix:** Add max value validation

### State Attacks

#### Threat: Node skipping (Jump from Day 1 to Day 14)
**Attack:** POST saveChildScenario({ nodeId: "final-node", day: 14, ... })  
**Current Defense:** No validation that day/nodeId path is reachable ⚠️  
**Status:** ⚠️ **NOT PROTECTED**  
**Severity:** **High**  
**Recommended Fix:** Graph-walk validation from start to reached node

#### Threat: Day skipping (Day 1 → Day 5)
**Attack:** applyChoice() with advanceDays: 100  
**Current Defense:** advanceDays from choice effect (not client-supplied)  
**Status:** ✅ Protected (effect comes from definition, not client)  
**Severity:** Low  

#### Threat: Replay (Submit same choice twice for double effect)
**Attack:** POST saveChildScenario twice with state.decisions[last] = "save-40"  
**Current Defense:** UPSERT on (session_id, node_id, day_number) + ignoreDuplicates  
**Status:** ✅ Protected (idempotent, decision deduped)  
**Severity:** Medium (if not protected)  

#### Threat: Session cloning (Restore from backup)
**Attack:** Attacker restores old localStorage state + tries to submit  
**Current Defense:** UPSERT scenario_sessions compares updatedAt timestamps  
**Status:** ⚠️ **PARTIALLY PROTECTED** (backend always wins; cache might be stale)  
**Severity:** Low (user loses work, doesn't gain it)  

#### Threat: Concurrent decisions (Two choices submitted simultaneously)
**Attack:** Tab A: choice-1, Tab B: choice-2 at same time  
**Current Defense:** UPSERT last-write-wins ⚠️  
**Status:** ⚠️ **PARTIALLY PROTECTED** (one state discarded silently)  
**Severity:** Medium (data loss)  
**Recommended Fix:** Optimistic locking or versioning

### Database Attacks

#### Threat: RLS bypass via direct query
**Attack:** SELECT * FROM scenario_sessions WHERE scenario_id = "any"  
**Current Defense:** Supabase Auth enforces RLS; direct queries go through RLS  
**Status:** ✅ Protected (Supabase RLS enforced)  
**Severity:** Critical (if not protected)  

#### Threat: Unauthorized UPDATE via supabase-js
**Attack:** supabase.from("scenario_sessions").update({...})  
**Current Defense:** RLS WITH CHECK enforces owns_child_profile()  
**Status:** ✅ Protected (RLS enforced on all operations)  
**Severity:** Critical (if not protected)  

#### Threat: Compound FK bypass
**Attack:** INSERT scenario_decisions (session_id=A, child_profile_id=B)  
**Current Defense:** Compound FK requires both to match existing session row  
**Status:** ✅ Protected (FK violation rejected)  
**Severity:** High (if not protected)  

### Firebase Threats

#### Threat: Firebase UID spoofing
**Attack:** Submit firebaseUid = "anyone's-uid"  
**Current Defense:** Firebase UID comes from Firebase Auth (Google's service)  
**Status:** ✅ Protected (Firebase verifies signature)  
**Severity:** Critical (if not protected)  

#### Threat: Firebase identity mismatch
**Attack:** Firebase UID from Family A + Session from Family B  
**Current Defense:** requireAuthenticatedChild() validates firebase.familyId === session.familyId  
**Status:** ✅ Protected (mismatch throws AuthorizationError)  
**Severity:** High (if not protected)  

#### Threat: Admin SDK exposure
**Attack:** firebase-admin credentials visible in browser  
**Current Defense:** .server.ts files only; TanStack Start build prevents client import  
**Status:** ✅ Protected (build-time enforcement)  
**Severity:** Critical (if exposed)  

### Summary Table

| Threat | Current Status | Severity | Recommended G5 Action |
|--------|---|---|---|
| **Unauthenticated access** | ✅ Protected | Critical | ✓ Maintain |
| **Expired session** | ✅ Protected | Critical | ✓ Maintain |
| **Revoked session** | ✅ Protected | Critical | ✓ Maintain |
| **Forged cookie** | ✅ Protected | Critical | ✓ Maintain |
| **Cross-child access** | ✅ Protected | Critical | ✓ Maintain |
| **Cross-family access** | ✅ Protected | Critical | ✓ Maintain |
| **Role escalation** | ✅ Protected | High | ✓ Maintain |
| **Session ID spoofing** | ✅ Protected | High | ✓ Maintain |
| **Fake scenarioId** | ✅ Protected | Medium | ✓ Maintain |
| **Fake sessionId** | ✅ Protected | Low | ✓ Maintain |
| **Fake nodeId** | ⚠️ NOT PROTECTED | **High** | 🔧 **ADD VALIDATION** |
| **Fake day** | ⚠️ PARTIAL | Medium | 🔧 Improve bounds |
| **Fake choiceId** | ⚠️ NOT PROTECTED | **High** | 🔧 **ADD VALIDATION** |
| **Negative money** | ✅ Protected | Medium | ✓ Maintain |
| **Massive money** | ⚠️ NOT PROTECTED | Low | 🔧 Add max bound |
| **Node skipping** | ⚠️ NOT PROTECTED | **High** | 🔧 **ADD REACHABILITY CHECK** |
| **Day skipping** | ✅ Protected | Low | ✓ Maintain |
| **Replay** | ✅ Protected | Medium | ✓ Maintain |
| **Session cloning** | ⚠️ PARTIAL | Low | ℹ️ Accept |
| **Concurrent decisions** | ⚠️ PARTIAL | Medium | 🔧 Consider optimistic lock |
| **RLS bypass** | ✅ Protected | Critical | ✓ Maintain |
| **Unauthorized UPDATE** | ✅ Protected | Critical | ✓ Maintain |
| **Compound FK bypass** | ✅ Protected | High | ✓ Maintain |
| **Firebase UID spoofing** | ✅ Protected | Critical | ✓ Maintain |
| **Firebase family mismatch** | ✅ Protected | High | ✓ Maintain |
| **Admin SDK exposure** | ✅ Protected | Critical | ✓ Maintain |

---

## 26. EXISTING GAPS

### Application-Level Validation Gaps

1. **Choice Validation (High)**
   - ⚠️ No validation that choiceId exists in current node
   - Impact: Invalid choices silently ignored (no-op)
   - Fix: Add `validateChoice(scenario, nodeId, choiceId)` in saveChildScenario

2. **Node Reachability (High)**
   - ⚠️ No validation that submitted nodeId is reachable from start
   - Impact: Client can jump to any node
   - Fix: Graph-walk to verify path from start → submitted node

3. **Day Consistency (Medium)**
   - ⚠️ No upper bound on day values
   - ⚠️ No validation that day progression matches node sequence
   - Impact: Unrealistic day values accepted
   - Fix: Validate day ≤ scenario.totalDays

4. **Money Bounds (Low)**
   - ⚠️ No maximum money validation
   - ⚠️ No validation that money changes match choices
   - Impact: Unrealistic wealth accepted
   - Fix: Add max bounds (e.g., available + saved ≤ 500)

5. **Competency Validation (Low)**
   - ⚠️ No validation that competency scores match choices
   - Impact: Arbitrary competency values accepted
   - Fix: Recalculate competencies from decisions, compare with submitted

6. **Scenario Eligibility (Medium)**
   - ⚠️ No validation that child is allowed to access scenario
   - Current workaround: UI doesn't show disallowed scenarios
   - Impact: No protection if URL navigated directly
   - Fix: Verify scenario in child's track sequence

### Database Gaps

1. **No Cascade Delete Policy**
   - ⚠️ Scenario definitions deleted → orphaned sessions remain
   - Fix: Add CASCADE DELETE or archive policy

2. **No Retention Policy**
   - ⚠️ Old sessions accumulate indefinitely
   - Fix: Add TTL or archive strategy (e.g., 1 year retention)

3. **No Data Archival**
   - ⚠️ No distinction between active and completed sessions
   - Fix: Add archival table for completed scenarios

### Concurrency Gaps

1. **No Optimistic Locking**
   - ⚠️ Concurrent updates cause last-write-wins data loss
   - Fix: Add version column + increment on update

2. **No Conflict Resolution**
   - ⚠️ No mechanism to merge concurrent decisions
   - Fix: Accept that concurrent edits are rare; acknowledge limitation

### Feature Gaps

1. **No Achievement System**
   - ⚠️ Scenarios don't trigger achievements
   - Out of scope for G5; defer to G6

2. **No Competency Persistence**
   - ⚠️ Competency scores exist in state but not separately queryable
   - Fix: Extract and store in learner_competencies table (if created)

3. **No Scenario Targeting/Gating**
   - ⚠️ No prerequisite validation (e.g., must complete lesson X first)
   - Out of scope for G5; defer to G6

4. **No Scenario Restart Handling**
   - ⚠️ Restarting a scenario overwrites journey_progress (loses original)
   - Fix: Clarify replay strategy (new row or overwrite?)

---

## 27. PROPOSED G5 ARCHITECTURE

### Authentication & Authorization

```
Child navigates to /child/scenario/$scenarioId
         ↓
Route beforeLoad: assertChildActivity()
  ├─ getCurrentChildContext() [G3]
  ├─ Validates session + profile consistency
  ├─ Validates scenario in track sequence
  └─ Returns context (explicit) or throws

Server functions (loadChildScenario, saveChildScenario):
  ├─ Use getCurrentChildContext() explicitly
  ├─ Extract childId, familyId, sessionId from context
  ├─ Validate context.session.kind === "child"
  └─ RLS enforces owns_child_profile() at database
```

### Choice & State Validation

```
saveChildScenario(state):
  ├─ Validate scenarioId exists
  ├─ Validate nodeId exists in scenario.nodes
  ├─ Validate day ≤ scenario.totalDays
  ├─ FOR EACH decision in state.decisions:
  │  ├─ Validate choiceId exists in node.choices
  │  ├─ Validate choice.effect matches calculated money change
  │  └─ Validate day progression consistent
  ├─ Validate money: 0 ≤ available, 0 ≤ saved
  ├─ Validate competencies only come from choice effects
  └─ UPSERT only if all validations pass
```

### Node Reachability

```
After loading definition, pre-compute reachability graph:
  ├─ Start from startNodeId
  ├─ Build adjacency list of all reachable nodes
  ├─ BFS/DFS to identify unreachable nodes
  ├─ Cache in memory or precompute in registry

On saveChildScenario:
  ├─ Verify submitted nodeId in reachable set
  ├─ OR: Verify decision path leads to submitted nodeId
  └─ Reject if unreachable
```

### Idempotency & Concurrency

```
Add version field to scenario_sessions:
  ├─ version: int (incremented on every save)
  ├─ Include version in UPSERT condition
  ├─ If version mismatch → conflict → return error

Client handles conflict:
  ├─ Fetch fresh state from server
  ├─ Prompt user: "Your story changed; reload?"
  └─ Refresh or force-save (with conflict resolution)
```

### Server Functions

```
loadChildScenario(scenarioId)
  ├─ context = await getCurrentChildContext() ✓
  ├─ Validate context
  ├─ Validate scenarioId exists ✓
  ├─ Query scenario_sessions (childId from context) ✓
  ├─ RLS: owns_child_profile() ✓
  └─ Return { sessionId, state, definition }

saveChildScenario(state)
  ├─ context = await getCurrentChildContext() ✓
  ├─ Validate context
  ├─ Validate state (choices, nodes, money, etc.) ← NEW
  ├─ Validate state path reachable from start ← NEW
  ├─ UPSERT scenario_sessions (childId from context) ✓
  ├─ Check for version conflict (if implementing) ← NEW
  ├─ RLS: owns_child_profile() ✓
  ├─ Extract + recordDecision() (audit trail) ✓
  └─ Return { sessionId }

recordDecision(sessionId, state) [internal]
  ├─ Extract last decision from state.decisions
  ├─ UPSERT scenario_decisions (session_id, child_profile_id)
  ├─ RLS: owns_child_profile() ✓
  └─ Return (void or id)
```

### Scenario Registry Enhancement

```
getScenarioDefinition(scenarioId)
  └─ Return definition with precomputed metadata:
      ├─ reachable_nodes: Set<string>
      ├─ node_index: Map<string, ScenarioNode>
      ├─ choice_index: Map<string, Map<string, ScenarioChoice>>
      └─ All nodes + choices indexed for O(1) validation

validateChoice(scenario, nodeId, choiceId)
  ├─ node = scenario.node_index[nodeId] ✓
  ├─ choice = scenario.choice_index[nodeId][choiceId] ✓
  └─ Return true or throw error

validateNodeReachability(scenario, nodeId)
  ├─ Check: nodeId in scenario.reachable_nodes ✓
  └─ Return true or throw error
```

### G3 Context Integration

```
In saveChildScenario:
  const context = await getCurrentChildContext();
  
  // Explicit use of full context:
  const childId = context.childId;
  const familyId = context.familyId;
  const sessionId = context.sessionId;
  
  // Validate context state:
  if (context.session.kind !== "child") throw new AuthorizationError(...);
  if (context.session.expiresAt < new Date()) throw new AuthorizationError(...);
  if (context.session.revokedAt) throw new AuthorizationError(...);
  
  // Firebase optional check:
  if (context.firebase) {
    if (context.firebase.familyId !== context.familyId) {
      throw new AuthorizationError("Firebase family mismatch");
    }
  }
  
  // Proceed with childId = context.childId (server-derived)
```

---

## 28. EXACT FILES TO MODIFY

### 1. Server Functions (MUST MODIFY)

**File:** `src/lib/auth/child-learning.functions.ts`

**Functions to update:**
- `loadChildScenario()` - Add explicit G3 context + scenario validation
- `saveChildScenario()` - Add state/choice/node validation + reachability check

**Changes:**
- Use `getCurrentChildContext()` explicitly (currently via currentChildId())
- Add `validateScenarioState()` function
- Add `validateChoices()` function
- Add `validateNodeReachability()` function
- Validate scenario eligibility

**Estimated lines:** +150-200 lines

---

### 2. Scenario Registry (SHOULD MODIFY)

**File:** `src/lib/scenario/registry.ts`

**Additions:**
- Precompute reachability graph per scenario
- Add index maps for O(1) node/choice lookups
- Return enhanced metadata with definitions

**Changes:**
- For each scenario, compute reachable_nodes Set
- Build node_index Map<nodeId, ScenarioNode>
- Build choice_index Map<nodeId, Map<choiceId, ScenarioChoice>>

**Estimated lines:** +50-100 lines

---

### 3. Scenario Types (MAY MODIFY)

**File:** `src/lib/scenario/types.ts`

**Additions:**
- Optional: `ScenarioDefinition` could include computed metadata

**Changes:**
- If precomputing in registry: No changes needed
- If storing metadata in definition: Add optional fields

**Estimated lines:** 0-30 lines

---

### 4. Engine (OPTIONAL HARDENING)

**File:** `src/lib/scenario/engine.ts`

**Additions:**
- Optional: Add validation mode to applyChoice()

**Changes:**
- Currently engine is pure; validation done by caller
- Could add assertions for debug builds

**Estimated lines:** 0-50 lines (optional)

---

### 5. RLS Policies (NO CHANGES NEEDED)

**File:** Firestore rules + Supabase migrations

**Status:** ✅ Already sufficient; no policy changes needed
- owns_child_profile() enforces family isolation
- Compound FK prevents cross-child attachment
- No new RLS policies required for G5

---

### 6. Database Schema (OPTIONAL)

**File:** `drizzle/migrations/00XX_g5_scenario_enhancements.sql`

**Optional additions:**
- Version column on scenario_sessions (for optimistic locking)
- Archived_at column (for retention policy)
- Competency tracking table (learner_competencies, if implementing)

**Estimated lines:** 20-50 lines (optional)

---

### 7. Tests (NEW)

**File:** `tests/auth/scenario-authorization.test.ts` (NEW)

**Test coverage:**
- Authentication: authenticated vs expired vs revoked
- Authorization: correct child, wrong child, cross-family
- Choice validation: valid choice, invalid choice
- Node reachability: valid path, impossible jump
- State integrity: valid money, negative money, inconsistent state
- Idempotency: duplicate decisions
- Competency tracking: correct scores
- Firebase: unavailable, mismatch, optional

**Estimated lines:** 200-400 lines

---

## 29. FILES NOT TO MODIFY

### 1. Scenario Definitions (DO NOT MODIFY)

**File:** `src/content/scenarios/school-reopening.ts`

**Status:** ✅ Read-only in G5
**Reason:** Scenario content is not changing; only validation logic around it

---

### 2. Scenario Engine (MINIMIZE CHANGES)

**File:** `src/lib/scenario/engine.ts`

**Status:** ✅ Keep pure and unchanged
**Reason:** Engine is domain logic; validation happens at boundary (server functions)

---

### 3. Persistence Layer (MINIMAL CHANGES)

**File:** `src/lib/scenario/session.ts`

**Status:** ✅ Keep unchanged
**Reason:** Persistence is abstracted; validation happens in server functions

---

### 4. React Hooks (DO NOT MODIFY)

**File:** `src/lib/scenario/useScenarioRunner.ts`

**Status:** ✅ Keep unchanged
**Reason:** Hook calls server functions; server functions validate

---

### 5. Components (DO NOT MODIFY)

**File:** `src/components/scenario/ScenarioPlayer.tsx`

**Status:** ✅ Keep unchanged
**Reason:** Components are UI-only; logic in hooks + server functions

---

### 6. Routes (MINIMAL CHANGES)

**Files:** 
- `src/routes/child/scenario.$scenarioId.tsx`
- `src/routes/_authenticated/learn.$childId.scenario.$scenarioId.tsx`

**Status:** ✅ Already have assertChildActivity() / assertChildInCurrentFamily()
**Changes needed:** None (authorization already in place)

---

### 7. Assessment System (DO NOT MODIFY)

**Files:** Assessment-related code

**Status:** ✅ Keep unchanged
**Reason:** G4 is complete; no scenario-assessment integration in G5

---

### 8. Journey Progress (DO NOT MODIFY)

**File:** `src/lib/progress/service.ts`

**Status:** ✅ Keep unchanged
**Reason:** Completion tracking works as-is; validation upstream

---

## 30. TEST PLAN

### Test File
`tests/auth/scenario-authorization.test.ts` (NEW)

### Test Categories

#### 1. Authentication (5 tests)
```
✅ Authenticated child can load/save scenarios
❌ Unauthenticated user blocked
❌ Expired session blocked
❌ Revoked session blocked
✅ Session consistency validated
```

#### 2. Authorization (6 tests)
```
✅ Child can access own scenario session
❌ Child A cannot access Child B's session (same family)
❌ Family A cannot access Family B's child
✅ Parent can access child's scenario
❌ Facilitator boundaries respected (if applicable)
✅ Role validation (child vs parent)
```

#### 3. Scenario Validity (5 tests)
```
✅ Valid scenario loads
❌ Invalid scenarioId rejected
❌ Scenario not in track rejected
✅ Scenario definition accessible
❌ Scenario mismatch with state rejected
```

#### 4. Choice Validation (6 tests)
```
✅ Valid choice applied
❌ Invalid choiceId rejected
❌ Choice not in current node rejected
✅ Choice effects calculated correctly
❌ Tampered choice rejected
✅ Multiple choices path validation
```

#### 5. Node/Day Validation (6 tests)
```
✅ Valid node progression
❌ Node jump attempted (day 1 → 14)
❌ Invalid nodeId rejected
✅ Day progression consistent
❌ Negative day rejected
✅ Day > scenario.totalDays rejected
```

#### 6. Money Validation (5 tests)
```
✅ Valid money changes applied
❌ Negative available rejected
❌ Negative saved rejected
✅ Money bounds validated
❌ Excessive money rejected (optional)
```

#### 7. State Integrity (5 tests)
```
✅ Full state validation
❌ Inconsistent state rejected
✅ Competencies from choices only
❌ Tampered competencies rejected
✅ Scheduled events preserved
```

#### 8. Idempotency (3 tests)
```
✅ Same decision submitted twice → no duplicate
✅ Replay from cache safe
✅ Concurrent decisions handled (gracefully)
```

#### 9. Firebase Integration (3 tests)
```
✅ Firebase unavailable → continues
✅ Firebase identity present → validates familyId match
❌ Firebase family mismatch → rejected
```

#### 10. Audit Trail (2 tests)
```
✅ Decisions recorded in scenario_decisions
✅ One decision per (session, node, day)
```

---

## 31. MIGRATION STRATEGY

### Phased Rollout

#### Phase 1: Deploy G5 Code (No Breaking Changes)
```
1. Deploy enhanced loadChildScenario() + saveChildScenario()
   ├─ New validation in server functions
   ├─ Old code continues working (existing sessions valid)
   └─ No data migration needed

2. Backward compatibility:
   ├─ Existing scenarios in progress continue
   ├─ Old session states remain readable
   └─ New validations apply only to new saves
```

#### Phase 2: Gradual Enforcement
```
1. Week 1: Log validation failures (no errors)
   └─ Identify any problematic existing sessions

2. Week 2: Soft errors (user prompt, allow continue)
   └─ Give users time to adapt

3. Week 3: Hard enforcement (reject invalid states)
   └─ Full validation active
```

#### Phase 3: Cleanup (Optional)
```
1. Archive old incomplete sessions (e.g., > 30 days inactive)
2. Validate all archived sessions compliance
3. Delete any sessions failing validation
```

---

## 32. ROLLBACK STRATEGY

### If G5 Introduction Causes Issues

#### Rollback Step 1: Disable New Validation
```
In loadChildScenario() + saveChildScenario():
  ├─ Remove state validation checks
  ├─ Keep G3 context usage (this is good)
  └─ Revert to old behavior (log only, no reject)
```

#### Rollback Step 2: Restore Previous Server Functions
```
If validation was buggy:
  ├─ Revert child-learning.functions.ts to pre-G5 version
  ├─ Existing sessions continue unaffected
  ├─ New submissions use old (unvalidated) path
  └─ No data loss
```

#### Rollback Step 3: Preserve Data
```
All scenario_sessions + scenario_decisions remain untouched
  ├─ No schema changes = no migration needed to revert
  ├─ Data integrity unaffected
  ├─ Can re-enable validation after fixes
  └─ No child progress lost
```

---

## 33. CURRENT VS TARGET ARCHITECTURE

### Before G5 (Current)

```
Client Scenario Request
         ↓
Route: assertChildActivity() (G3 context check) ✓
         ↓
Server Function: loadChildScenario()
  ├─ currentChildId() → session-only ⚠️
  ├─ No scenario validation
  ├─ No choice validation ⚠️
  └─ RLS: owns_child_profile() ✓
         ↓
Database: scenario_sessions + scenario_decisions
  ├─ State stored as JSONB
  ├─ Compound FK enforced ✓
  ├─ RLS enforced ✓
  └─ Idempotent UPSERT ✓
         ↓
Engine: applyChoice()
  ├─ Pure logic (no validation) ⚠️
  ├─ Silently ignores invalid choices ⚠️
  └─ Money + competency calculated
         ↓
Persist to Backend
  └─ No state validation ⚠️
```

**Gaps:** 5 critical gaps, 6 medium gaps

### After G5 (Target)

```
Client Scenario Request
         ↓
Route: assertChildActivity() (G3 context check) ✓
         ↓
Server Function: loadChildScenario()
  ├─ getCurrentChildContext() → full G3 ✅
  ├─ Validate context state ✅
  ├─ Validate scenario validity ✅
  ├─ Validate scenario in track ✅
  └─ RLS: owns_child_profile() ✓
         ↓
Server Function: saveChildScenario()
  ├─ getCurrentChildContext() → full G3 ✅
  ├─ Validate context state ✅
  ├─ Validate scenario validity ✅
  ├─ Validate all choices in decisions[] ✅
  ├─ Validate node reachability ✅
  ├─ Validate money bounds ✅
  ├─ Validate state consistency ✅
  ├─ Check for version conflict (optional) ✅
  └─ RLS: owns_child_profile() ✓
         ↓
Database: scenario_sessions + scenario_decisions
  ├─ State stored as JSONB ✓
  ├─ Compound FK enforced ✓
  ├─ RLS enforced ✓
  ├─ Idempotent UPSERT ✓
  └─ Version tracking (optional) ✅
         ↓
Engine: applyChoice()
  ├─ Pure logic (no validation) ✓
  ├─ Called only after validation ✅
  └─ Money + competency calculated ✓
         ↓
Persist to Backend
  └─ Only valid states persisted ✅
```

**Improvements:** All 5 critical gaps closed, 6 medium gaps addressed

---

## 34. G5 IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Confirm this audit is understood and approved
- [ ] All tests designed and ready
- [ ] Validation logic pseudocode reviewed
- [ ] No scope creep (only validation, no redesign)

### Implementation Phase 1: Core Validation
- [ ] Add `validateScenarioState()` function
- [ ] Add `validateChoice()` function
- [ ] Add `validateNodeReachability()` function
- [ ] Update `loadChildScenario()` with explicit G3 context
- [ ] Update `saveChildScenario()` with validation calls
- [ ] Enhance scenario registry with precomputed metadata

### Implementation Phase 2: Testing
- [ ] Write 40+ tests in `scenario-authorization.test.ts`
- [ ] Run test suite → all pass
- [ ] Manual QA: Test full scenario flow as child
- [ ] Manual QA: Test invalid choices (should reject)
- [ ] Manual QA: Test node skip (should reject)

### Implementation Phase 3: Deployment
- [ ] Deploy G5 code
- [ ] Monitor error logs
- [ ] Verify no regressions
- [ ] Run full suite: npm test -- --run
- [ ] TypeScript: npm exec -- tsc --noEmit
- [ ] ESLint: npm run lint
- [ ] Build: npm run build

### Implementation Phase 4: Documentation
- [ ] Update PHASE_G5_COMPLETION_REPORT.md
- [ ] Document all validation added
- [ ] Document security threats closed
- [ ] Document test results
- [ ] Confirm no test regressions

---

## 35. FINAL RECOMMENDATION

### G5 Scope: APPROVED ✅

**Recommendation:** Proceed with G5 implementation following this audit plan.

**Rationale:**
1. ✅ Architecture is sound (database constraints + RLS sufficient)
2. ✅ Security is moderate (multi-layer defense in place)
3. ⚠️ Application-level validation **critical gap** (choiceId, nodeId, day validation)
4. ✅ G3/G4 integration points clear (explicit context usage)
5. ✅ Test plan comprehensive (40+ tests)
6. ✅ Implementation is additive (no breaking changes)

**Key Threats Addressed by G5:**
- ❌ Fake choiceId → ✅ Validate choice in current node
- ❌ Node skipping → ✅ Validate path reachable from start
- ❌ Unrealistic day → ✅ Validate day ≤ scenario.totalDays
- ❌ Massive money → ✅ Add upper bounds
- ❌ Concurrent conflicts → ✅ Consider optimistic locking (optional)

**Non-Blockers (Defer to G6+):**
- Achievement system
- Competency persistence table
- Scenario prerequisites/gating
- Replaying scenarios (clarify strategy)
- Optimistic locking (nice-to-have)

---

## VERIFICATION

✅ **Audit Complete - No Application Code Modified**

This audit is **READ-ONLY**. No files changed:
- ✅ No src/ files modified
- ✅ No migrations added
- ✅ No RLS policies changed
- ✅ No scenario definitions changed
- ✅ No routes modified
- ✅ No application behavior altered

**Documentation Created:**
- ✅ PHASE_G5_SCENARIO_AUDIT.md (this file)
- ✅ SCENARIO_SYSTEM_INVENTORY.md (inventory of all scenario code)

**Ready for G5 Implementation Authorization**

---

