# TATI ChildSave Scenario System - Comprehensive Inventory

**Generated:** 2026-09-25  
**Scope:** Complete data flow from UI to database for branching scenario engine  
**Purpose:** Architecture reference - NO CODE MODIFICATIONS

---

## 1. SCENARIO CONTENT & DEFINITIONS

### Active Scenarios
| ID | Title | Track | File | Start Available | Start Saved | Goal | Days |
|---|---|---|---|---|---|---|---|
| `kwame-request` | The School Reopening Challenge | save | [src/content/scenarios/school-reopening.ts](src/content/scenarios/school-reopening.ts) | GH₵50 | GH₵0 | GH₵80 | 14 |

### Scenario Registry
**File:** [src/lib/scenario/registry.ts](src/lib/scenario/registry.ts)
- **Functions:**
  - `getScenarioDefinition(id: string)` - Returns ScenarioDefinition or undefined
  - `scenariosForTrack(trackId: string)` - Returns array of scenarios for a track
- **Data:** Single array `ALL: ScenarioDefinition[]` containing all available scenarios

---

## 2. CORE TYPE DEFINITIONS

**File:** [src/lib/scenario/types.ts](src/lib/scenario/types.ts)

### ScenarioState (Runtime State)
Persisted to `scenario_sessions.state` (JSONB)
```
- scenarioId: string
- day: number (1-based, current)
- available: number (pocket money in GH₵)
- saved: number (protected savings box in GH₵)
- goalTarget: number (savings goal in GH₵)
- competencies: Partial<Record<Competency, number>> (hidden scores)
- flags: Record<string, number | string | boolean> (conditional story logic)
- scheduled: ScheduledEvent[] (queued follow-up events)
- nodeId: string (current story location)
- nextNodeId?: string (node after current consequence)
- phase: "intro" | "decision" | "consequence" | "complete"
- consequence?: ScenarioConsequence (shown currently)
- decisions: ScenarioDecisionLog[] (history of choices)
- endingId?: string (ending reached)
- previousAvailable?: number (ledger history)
- previousSaved?: number (ledger history)
- totals: { earned, spent, movedToSavings }
- updatedAt: ISO timestamp
```

### ScenarioDefinition (Content Template)
```
- id: string
- track: string ("save")
- title: string
- subtitle?: string
- description: string
- totalDays: number
- goalLabel: string
- goalTarget: number
- startingAvailable: number
- startingSaved: number
- startNodeId: string
- competencies: Competency[] (addressed by scenario)
- closingReflection: string
- intro: { title, body, image?, cta? }
- nodes: ScenarioNode[]
- endings: ScenarioEnding[]
```

### ScenarioNode (Story Location)
```
- id: string
- day?: number
- topic?: string (chip label)
- place?: string (location label)
- title: string
- situation: string
- question?: string
- image?: string
- imageCaption?: string
- imageBadge?: string
- quote?: { speaker, text }
- tip?: string
- choices: ScenarioChoice[]
```

### ScenarioChoice (Decision Option)
```
- id: string
- label: string
- description?: string
- icon?: string
- effect?: ScenarioEffect (money + score changes)
- consequence: ScenarioConsequence (immediate outcome)
- next?: string (next node ID)
- schedule?: { inDays, nodeId, requiresFlag? }
- ending?: string (ending reached)
```

### ScenarioEffect (Choice Outcome)
```
- available?: number (change to pocket money)
- saved?: number (change to savings box)
- transferToSaved?: number (move from pocket to savings)
- transferAllToSaved?: boolean (move all pocket to savings)
- advanceDays?: number (extra days taken, default 1)
- competencies?: Partial<Record<Competency, number>>
- flags?: Record<string, number | string | boolean>
```

### ScenarioConsequence (Consequence Display)
```
- decisionChip?: string (e.g., "Decision: You lent Kwame GH₵10")
- headline: string
- title: string (warm narration title)
- body: string (outcome description)
- image?: string
- imageCaption?: string
- ledgerNote?: string (money ledger note)
- debtNote?: string (outstanding debt note)
- laterHint?: string (future-event hint)
- reflection?: string
```

### ScheduledEvent (Delayed Consequence)
```
- dueDay: number (story day to trigger on)
- nodeId: string (node to show)
- requiresFlag?: string (condition)
```

---

## 3. SCENARIO ENGINE (Pure Logic)

**File:** [src/lib/scenario/engine.ts](src/lib/scenario/engine.ts)

### Functions
| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `getNode(scenario, nodeId)` | ScenarioDefinition, string | ScenarioNode \| undefined | Lookup a node by ID |
| `createInitialState(scenario)` | ScenarioDefinition | ScenarioState | Create fresh story state |
| `beginScenario(state)` | ScenarioState | ScenarioState | Transition from intro to decision phase |
| `applyChoice(scenario, state, choiceId)` | ScenarioDefinition, ScenarioState, string | ScenarioState | Apply a choice: money changes, flags, scheduled events |
| `advance(scenario, state)` | ScenarioDefinition, ScenarioState | ScenarioState | Trigger scheduled events, move to next node |
| `summarize(scenario, state)` | ScenarioDefinition, ScenarioState | ScenarioSummary | Compute closing reflection scores |
| `dayProgressPercent(scenario, state)` | ScenarioDefinition, ScenarioState | number | Calculate % progress (0-100) |

**Key Property:** Pure functions with no I/O - reusable by TATI Teen and Plus

---

## 4. SCENARIO PERSISTENCE LAYER

**File:** [src/lib/scenario/session.ts](src/lib/scenario/session.ts)

### Functions

#### `scenarioCacheKey(childId: string, scenarioId: string) → string`
- Generates cache key: `tati.scenario.{childId}.{scenarioId}`
- Used for localStorage

#### `readCachedState(key: string) → ScenarioState | undefined`
- Reads from `window.localStorage`
- Returns parsed state or undefined if invalid

#### `writeCachedState(key: string, state: ScenarioState) → void`
- Writes to `window.localStorage` for instant offline resume
- Silently fails if storage unavailable

#### `clearCachedState(key: string) → void`
- Removes entry from `window.localStorage`

#### `loadSession(childId: string, scenarioId: string) → Promise<ScenarioState | undefined>`
- **Query:** SELECT state FROM scenario_sessions WHERE child_profile_id=? AND scenario_id=?
- Returns ScenarioState from JSONB column or undefined
- Validates structure before return (has "nodeId" property)

#### `saveSession(childId: string, state: ScenarioState) → Promise<string | undefined>`
- **Operation:** UPSERT into scenario_sessions on (child_profile_id, scenario_id)
- **Columns written:**
  - state: JSONB (full ScenarioState)
  - current_node_id: text
  - day_number: integer
  - status: "in_progress" | "completed"
  - completed_at: timestamp (if phase === "complete")
  - updated_at: timestamp
- Returns session.id or undefined on error

#### `recordDecision(childId: string, sessionId: string, state: ScenarioState) → Promise<void>`
- **Operation:** UPSERT into scenario_decisions on (session_id, node_id, day_number)
- **Extract from state.decisions[last]:**
  - node_id: string
  - choice_id: string
  - day_number: integer
  - details: JSONB (full decision object with nodeTitle, choiceLabel, availableAfter, savedAfter)
- **Deduplication:** ignoreDuplicates=true for same-node re-saves

---

## 5. REACT HOOK & RUNNER

**File:** [src/lib/scenario/useScenarioRunner.ts](src/lib/scenario/useScenarioRunner.ts)

### ScenarioPersistence Interface
```typescript
interface ScenarioPersistence {
  loadSession: (childId: string, scenarioId: string) => Promise<ScenarioState | undefined>;
  saveSession: (childId: string, state: ScenarioState) => Promise<string | undefined>;
  recordDecision: (childId: string, sessionId: string, state: ScenarioState) => Promise<void>;
}
```

### useScenarioRunner Hook

**Props:**
```typescript
useScenarioRunner(
  scenario: ScenarioDefinition,
  childId: string,
  persistence?: ScenarioPersistence
)
```

**Default Persistence:** Uses [src/lib/scenario/session.ts](src/lib/scenario/session.ts) functions

**State Returned:**
```
- status: "loading" | "ready" | "resumed" | "interrupted"
- state: ScenarioState (current)
- node: ScenarioNode | undefined (current node)
- summary: ScenarioSummary | undefined (if complete)
- start(): void (begin intro → decision)
- makeChoice(choiceId: string): void (apply choice, persist, record decision)
- pause(): void (save without recording decision)
```

**Resume Logic:**
1. Check localStorage (instant)
2. Query backend scenario_sessions in parallel
3. Use newest based on updatedAt timestamp
4. Sync to localStorage

**Persistence on Decision:**
1. Call `persist(nextState, isDecision=true)`
2. Call `saveSession()` → get sessionId
3. If isDecision, call `recordDecision()`

---

## 6. SERVER FUNCTIONS (RPC)

**File:** [src/lib/auth/child-learning.functions.ts](src/lib/auth/child-learning.functions.ts)

### loadChildScenario
```typescript
export const loadChildScenario = createServerFn({ method: "GET" })
  .validator(z.object({ scenarioId: z.string().min(1).max(128) }))
```

**Handler:**
1. Validate child is authenticated (getCurrentChildContext)
2. Validate scenario exists (getScenarioDefinition)
3. Query: `SELECT id, state FROM scenario_sessions WHERE child_profile_id = ? AND scenario_id = ?`
4. Return: `{ sessionId, state, definition }`

**Errors:** Throws if story unavailable, scenario not found, or child not authenticated

---

### saveChildScenario
```typescript
export const saveChildScenario = createServerFn({ method: "POST" })
  .validator(scenarioStateInput)
```

**Input Schema (scenarioStateInput):**
```typescript
z.object({
  scenarioId: z.string().min(1).max(128),
  nodeId: z.string().min(1).max(128),
  phase: z.string().min(1).max(32),
  day: z.number().int().min(1).max(366),
  available: z.number().min(0),
  saved: z.number().min(0),
  goalTarget: z.number().min(0),
  decisions: z.array(z.unknown()).max(200),
  updatedAt: z.string().datetime(),
}).passthrough()  // Allow additional fields
```

**Handler:**
1. Validate child is authenticated
2. Validate scenario exists (getScenarioDefinition)
3. UPSERT scenario_sessions on (child_profile_id, scenario_id):
   ```sql
   {
     child_profile_id: childId,
     scenario_id: data.scenarioId,
     state: data (full ScenarioState),
     current_node_id: data.nodeId,
     day_number: data.day,
     status: data.phase === "complete" ? "completed" : "in_progress",
     completed_at: data.phase === "complete" ? NOW() : null,
     updated_at: NOW()
   }
   ```
4. If last decision exists in data.decisions[], UPSERT scenario_decisions:
   ```sql
   {
     session_id: session.id,
     child_profile_id: childId,
     node_id: decision.nodeId,
     choice_id: decision.choiceId,
     day_number: decision.day,
     details: decision (full object)
   }
   ```
5. Return: `{ sessionId: session.id }`

**Errors:** Throws if scenario unavailable, save fails, or child not authenticated

---

## 7. COMPONENTS

### ScenarioPlayer
**File:** [src/components/scenario/ScenarioPlayer.tsx](src/components/scenario/ScenarioPlayer.tsx)

**Props:**
```typescript
interface Props {
  scenario: ScenarioDefinition;
  childId: string;
  onComplete: (payload: { available: number; saved: number; decisions: unknown[] }) => void;
  saving?: boolean;
  pauseBefore?: string[];  // Node IDs to pause at
  chapterTitle?: string;
  nextUpLabel?: string;
  onChapterPause?: (payload) => void;
  persistence?: ScenarioPersistence;
}
```

**Renders:**
- Header with scenario title, subtitle, progress %
- Day counter + money strip (pocket, saved, target)
- Goal card with visual progress
- Intro card with start button (phase="intro")
- Decision choices (phase="decision")
- Consequence card with ledger (phase="consequence")
- Chapter pause card (if atChapterEnd)
- Completion screen (phase="complete")

**Uses:** `useScenarioRunner()` hook

---

### ScenarioCard (Track View)
**File:** [src/components/tati/Cards.tsx](src/components/tati/Cards.tsx)

Displays scenario as a card in the learning track with:
- Scenario title
- Status badge
- Link to scenario route

---

## 8. ROUTES & ROUTE HANDLERS

### Child Scenario Route (Simple Child Interface)
**File:** [src/routes/child/scenario.$scenarioId.tsx](src/routes/child/scenario.$scenarioId.tsx)

**Route:** `/child/scenario/$scenarioId`

**beforeLoad:**
- Validates scenario is in track via `assertChildActivity()`

**Component:**
- Uses `useChildLearning()` to get child profile
- Calls `loadChildScenario()` server function
- Passes custom persistence with `saveChildScenario()`
- Renders `ScenarioPlayer`

**Persistence Adapter:**
```typescript
{
  loadSession: async (_childId, id) => {
    const result = await loadChildScenario({ data: { scenarioId: id } });
    return result.state as ScenarioState | undefined;
  },
  saveSession: async (_childId, state: ScenarioState) => {
    const result = await saveChildScenario({
      data: state as unknown as Parameters<typeof saveChildScenario>[0]["data"],
    });
    return result.sessionId;
  },
  recordDecision: async () => undefined,  // Disabled for simple child
}
```

**onComplete Callback:**
- Calls `record.mutateAsync()` with details: `{ saved, available, decisions }`
- Navigates to `/child/learn`

---

### Authenticated Scenario Route (Parent View)
**File:** [src/routes/_authenticated/learn.$childId.scenario.$scenarioId.tsx](src/routes/_authenticated/learn.$childId.scenario.$scenarioId.tsx)

**Route:** `/_authenticated/learn/$childId/scenario/$scenarioId`

**beforeLoad:**
- Validates child is in current family via `assertChildInCurrentFamily()`

**Component:**
- Gets track, scenario definition, chapter info
- Renders `ScenarioPlayer` with full persistence
- Supports chapter pause points via `pauseBefore` parameter
- Calls `record.mutateAsync()` with itemType="scenario"

**Callbacks:**
- `onChapterPause`: Record progress with chapter=true, show celebration
- `onComplete`: Record progress, navigate to parent dashboard

---

## 9. DATABASE SCHEMA

**Source:** [drizzle/migrations/0002_tati_progress_architecture.sql](drizzle/migrations/0002_tati_progress_architecture.sql)

### Table: scenario_sessions

```sql
CREATE TABLE public.scenario_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  scenario_id text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_node_id text,
  day_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'in_progress',  -- "in_progress" | "completed"
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_profile_id, scenario_id)
);
```

**Indexes:**
- `idx_scenario_sessions_child` on (child_profile_id)

**Triggers:**
- `scenario_sessions_set_updated_at` - Auto-updates updated_at on row changes

**Grants:**
- SELECT, INSERT, UPDATE, DELETE to authenticated role
- ALL to service_role

---

### Table: scenario_decisions

```sql
CREATE TABLE public.scenario_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES scenario_sessions(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  choice_id text NOT NULL,
  day_number integer NOT NULL DEFAULT 1,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Full decision object
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Indexes:**
- `idx_scenario_decisions_session` on (session_id)
- `idx_scenario_decisions_child` on (child_profile_id)

**Deduplication:** UPSERT uses `(session_id, node_id, day_number)` unique constraint with ignoreDuplicates=true

**Grants:**
- SELECT, INSERT, DELETE to authenticated role
- ALL to service_role

---

## 10. ROW LEVEL SECURITY (RLS) POLICIES

**File:** [firestore.rules](firestore.rules) (Firebase) + Supabase RLS

### scenario_sessions RLS Policies
```
Policy: "family manages scenario sessions"
Type: ALL (SELECT, INSERT, UPDATE, DELETE)
To: authenticated
USING: public.owns_child_profile(child_profile_id)
WITH CHECK: public.owns_child_profile(child_profile_id)
```

- Only family who owns the child can read/write their scenario sessions
- Enforced by `owns_child_profile()` SQL function

---

### scenario_decisions RLS Policies
```
Policy: "family manages scenario decisions"
Type: ALL (SELECT, INSERT, UPDATE, DELETE)
To: authenticated
USING: public.owns_child_profile(child_profile_id)
WITH CHECK: public.owns_child_profile(child_profile_id)
```

- Only family who owns the child can read/write their decisions
- Cascading delete on scenario_sessions deletion

---

### Firebase Firestore Rules
**File:** [firestore.rules](firestore.rules)

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

**Authorization:**
- `canAccessChild()` = isFamilyAdult OR isAssignedFacilitator OR isAdmin
- All writes blocked (backend only via service role)

---

## 11. IMPORTS & DEPENDENCIES

### Core Libraries
- **@tanstack/react-router** - Routing, file routes
- **@tanstack/react-start** - Server functions (createServerFn)
- **@supabase/supabase-js** - Database client
- **zod** - Input validation
- **React** - Hooks (useState, useEffect, useCallback, useRef)

### Internal Dependencies

**Scenario System:**
- `@/lib/scenario/types` - Type definitions
- `@/lib/scenario/engine` - Pure logic
- `@/lib/scenario/session` - Persistence
- `@/lib/scenario/useScenarioRunner` - Hook
- `@/lib/scenario/registry` - Scenario lookup

**Learning & Progress:**
- `@/lib/learning/track` - Track definitions, item lookup
- `@/lib/learning/types` - Scenario interfaces
- `@/lib/progress/service` - Record progress
- `@/lib/gamification/rules` - XP/badge definitions

**Auth & Security:**
- `@/lib/auth/child-learning.functions` - Server RPC
- `@/lib/auth/use-child-learning` - Child learning hook
- `@/lib/auth/authorization.server` - Auth checks
- `@/lib/family` - Family access checks

**Analytics:**
- `@/lib/analytics` - Event tracking (scenario_started, etc.)

**Database:**
- `@/integrations/supabase/client` - Client instance
- `@/integrations/supabase/client.server` - Admin/service role
- `@/integrations/supabase/types` - Generated types

**Content:**
- `@/content/scenarios/school-reopening` - Scenario definition
- `@/content/tracks/save` - Track with scenario items

---

## 12. ANALYTICS EVENTS

**File:** [src/lib/analytics.ts](src/lib/analytics.ts)

Events tracked for scenarios:
- `scenario_started` - User begins a scenario
- (Others derived from scenario event name enum)

**Event Structure:**
```typescript
{
  eventName: "scenario_started" | ... ,
  actorUid: string,
  childId: string,
  familyId: string,
  entityId: string,
  eventKey: string,
  occurredAt: ISO timestamp
}
```

---

## 13. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                      SCENARIO PLAYER (React)                      │
│  - Renders UI (decision choices, consequences, progress)         │
│  - Calls useScenarioRunner hook                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌──────────┐  ┌────────────┐  ┌──────────────┐
    │   Engine │  │   Runner   │  │ localStorage │
    │ (Pure)   │  │   (Hook)   │  │   (Cache)    │
    │          │  │            │  │              │
    │ applyChoice  useScenarioRunner readCachedState
    │ advance      persist()       writeCachedState
    │ summarize    makeChoice()    clearCachedState
    └────┬───────┘  └──────┬──────┘  └──────┬───────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                ┌──────────▼──────────┐
                │  Session.ts Module  │
                │  (Persistence RPC)  │
                │                     │
                │ loadSession()      │
                │ saveSession()      │
                │ recordDecision()   │
                └──────────┬─────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────────┐  ┌──────────────┐  ┌───────────────┐
   │   Route     │  │ Server Fn    │  │  Supabase     │
   │  Component  │  │  (RPC)       │  │  (Backend)    │
   │             │  │              │  │               │
   │ load/save   │→ │loadChildScenario  SELECT        │
   │ Scenario    │  │saveChildScenario  UPSERT        │
   │             │  │              │  │               │
   └─────────────┘  └──────────────┘  └───────┬───────┘
                                              │
                                    ┌─────────▼────────┐
                                    │  Database        │
                                    │  (PostgreSQL)    │
                                    │                  │
                                    │ scenario_sessions│
                                    │ scenario_decisions
                                    └──────────────────┘
```

---

## 14. VALIDATORS & INPUT SCHEMAS

**File:** [src/lib/auth/child-learning.functions.ts](src/lib/auth/child-learning.functions.ts)

### progressInput (journey_progress schema)
```typescript
z.object({
  itemType: z.enum(["assessment", "lesson", "scenario", "reflection"]),
  itemId: z.string().min(1).max(128),
  score: z.number().int().min(0).nullable().optional(),
  maxScore: z.number().int().min(0).nullable().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})
```

### scenarioStateInput (saveChildScenario)
```typescript
z.object({
  scenarioId: z.string().min(1).max(128),
  nodeId: z.string().min(1).max(128),
  phase: z.string().min(1).max(32),
  day: z.number().int().min(1).max(366),
  available: z.number().min(0),
  saved: z.number().min(0),
  goalTarget: z.number().min(0),
  decisions: z.array(z.unknown()).max(200),
  updatedAt: z.string().datetime(),
}).passthrough()  // Extra fields allowed (competencies, flags, etc.)
```

### assertChildActivity Input
```typescript
z.object({
  itemType: z.enum(["lesson", "scenario", "assessment", "reflection"]),
  itemId: z.string().min(1).max(128),
})
```

---

## 15. KEY SECURITY PATTERNS

1. **Server Function Validation:**
   - All scenario RPC calls validate input with Zod
   - Child authentication checked via `getCurrentChildContext()`
   - Scenario existence verified before processing

2. **RLS Protection:**
   - scenario_sessions: Only child's family can access
   - scenario_decisions: Cascading delete, owned by family
   - All writes blocked in Firestore (backend-only)

3. **Cache Coherence:**
   - localStorage is instant cache, backend is source of truth
   - Newest version (by updatedAt) wins on resume
   - Offline changes sync on reconnect via saveSession

4. **Immutable Ownership:**
   - child_profile_id never changes after creation
   - Unique constraint (child_profile_id, scenario_id) prevents duplicates

5. **Decision Idempotency:**
   - UPSERT on (session_id, node_id, day_number)
   - ignoreDuplicates=true prevents double-recording same decision

---

## 16. TESTING REFERENCES

**Files with Tests:**
- [tests/firebase/firestore.rules.test.ts](tests/firebase/firestore.rules.test.ts) - RLS validation
- [src/lib/auth/authorization.test.ts](src/lib/auth/authorization.test.ts) - Child access blocks

**Key Test Assertions:**
```
✓ allows parent/facilitator to read child's scenarioSessions
✓ rejects client write to scenarioSessions/session-server
✓ blocks child A from another child's scenario writes
```

---

## 17. MIGRATION HISTORY

| Migration | File | Changes |
|-----------|------|---------|
| 0002 | [drizzle/migrations/0002_tati_progress_architecture.sql](drizzle/migrations/0002_tati_progress_architecture.sql) | Initial scenario_sessions, scenario_decisions tables; RLS policies |
| 0003 | [drizzle/migrations/0003_tati_security_and_journey.sql](drizzle/migrations/0003_tati_security_and_journey.sql) | ALTER scenario_sessions (security adjustments) |
| 0006 | [drizzle/migrations/0006_tati_security_hardening.sql](drizzle/migrations/0006_tati_security_hardening.sql) | ALTER scenario_sessions (hardening updates) |
| 0007 | [drizzle/migrations/0007_tati_privacy_integrity.sql](drizzle/migrations/0007_tati_privacy_integrity.sql) | Make scenario decisions idempotent |

---

## 18. CONFIGURATION & ENVIRONMENT

**Drizzle Config:**
- [drizzle.config.ts](drizzle.config.ts)

**Supabase:**
- [supabase/config.toml](supabase/config.toml)

**Firebase:**
- [firestore.rules](firestore.rules)
- [firebase.json](firebase.json)

---

## 19. SUMMARY TABLE

| Component | Type | Location | Status |
|-----------|------|----------|--------|
| **Scenario Content** | Data | src/content/scenarios/ | 1 active (school-reopening) |
| **Scenario Registry** | Registry | src/lib/scenario/registry.ts | Active |
| **Core Engine** | Logic | src/lib/scenario/engine.ts | Pure, reusable |
| **Persistence** | RPC | src/lib/scenario/session.ts | Database reads/writes |
| **React Hook** | Hook | src/lib/scenario/useScenarioRunner.ts | Resume + cache logic |
| **Server Functions** | RPC | src/lib/auth/child-learning.functions.ts | loadChildScenario, saveChildScenario |
| **ScenarioPlayer** | Component | src/components/scenario/ScenarioPlayer.tsx | Full UI renderer |
| **Route (Child)** | Route | src/routes/child/scenario.$scenarioId.tsx | Simple interface |
| **Route (Parent)** | Route | src/routes/_authenticated/learn.$childId.scenario.$scenarioId.tsx | Full featured |
| **Database** | Schema | scenario_sessions, scenario_decisions | Persisted state + decisions |
| **Security** | RLS | Supabase + Firestore | Family-scoped access |
| **Types** | TypeScript | src/lib/scenario/types.ts | Full interface definitions |
| **Analytics** | Events | src/lib/analytics.ts | scenario_started event |

---

## 20. DOCUMENT METADATA

- **Completeness:** All scenario-related code paths documented
- **Data Flow:** UI → Hook → Engine → Persistence → Server → Database
- **No Modifications:** This is an inventory only, for architecture reference
- **Version:** TATI ChildSave MVP (Phase G4)
- **Last Verified:** 2026-09-25
