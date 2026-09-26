# PHASE H3.2.9 DISCOVERY REPORT

**Date:** 2026-09-26  
**Phase:** READ-ONLY Discovery & Architecture Audit  
**Scope:** Cohort Management for TATI Academy  
**Status:** DISCOVERY COMPLETE

---

## EXECUTIVE SUMMARY

### Current State
The TATI Academy MVP implements an **implicit cohort model**:
- Facilitator's assigned learners (via `facilitatorAssignments` collection) are treated as a cohort
- No separate `academyCohorts` collection exists in Firestore
- No school/organization collection exists
- Session persistence (H3.2.8) references facilitators + learnerIds, not cohorts
- UI routes exist (`/academy/cohorts`, `/academy/cohorts/$childId`) but operate on assignment data

### Key Question for H3.2.9
**Should H3.2.9 formalize cohorts as persistent Firestore entities, or enhance the existing implicit model?**

**Recommendation:** Formalize cohorts as persistent entities (Option A below) because:
1. Enables future school-management features without rearchitecting
2. Allows explicit cohort ownership and lifecycle management
3. Supports H3.2.8 sessions to reference cohorts (not required but cleaner)
4. Minimal breaking changes if designed carefully
5. Aligns with documented architecture (PHASE_H3_0_1_ACADEMY_PRODUCT_DATA_CONTRACT.md)

---

## SECTION 1: EXISTING COHORT ARCHITECTURE

### Current Implicit Cohort Model

```
Current Flow:
  Facilitator UID
      ↓
  Query facilitatorAssignments
      ↓
  Get {facilitatorUid, familyId, childId} records
      ↓
  Fetch children from families/{familyId}/children/{childId}
      ↓
  Display as "cohort" (facilitator's assigned learners)
```

**Observation:** This model works for the MVP but lacks explicit cohort identity. A cohort is a *dynamic view* of assignments, not a *persistent entity*.

### Current Firestore Collections

| Collection | Purpose | H3.2.9 Impact |
|------------|---------|---------------|
| `facilitatorAssignments` | Authorization index (H3.2.2) | Should be PRESERVED, not replaced |
| `academySessions` | Session persistence (H3.2.8) | Stores facilitatorUid + learnerIds; no cohortId |
| `families/{familyId}/children/{childId}` | Learner identity | Contains facilitatorUids array |
| `families/{familyId}/children/{childId}/journeyProgress` | Protected from facilitators | READ-only |
| `families/{familyId}/children/{childId}/assessmentAttempts` | Protected from facilitators | READ-only |
| `families/{familyId}/children/{childId}/parentInsights` | Protected from parents/facilitators | NOT accessible to facilitators |
| ✗ `academyCohorts` | Does NOT exist yet | H3.2.9 may create this |
| ✗ `academyOrganizations` | Does NOT exist yet | Deferred to H3.3+ |

### Current Routes

**Existing Academy Routes:**
```
/academy/login                          → Facilitator login
/academy/dashboard                      → Main dashboard
/academy/cohorts                        → List facilitator's assigned learners (implicit cohort)
/academy/cohorts/$childId               → Learner detail within cohort
/academy/profile                        → Facilitator profile
/academy/session/start?activityId=...   → Launch session
/academy/session/monitor?sessionId=...  → Monitor session (H3.2.8 persistence)
/academy/session/monitor?activityId=... → Monitor session (H3.2.7 legacy mode)
```

**No routes for:**
- Creating cohorts
- Editing cohort metadata
- Archiving cohorts
- Managing cohort membership
- Viewing cohort list (only facilitator's assigned children, not formal cohorts)

---

## SECTION 2: EXISTING AUTHORIZATION MODEL (H3.2.2)

### Data Model: `facilitatorAssignments` Collection

**Schema:**
```typescript
interface FacilitatorAssignment {
  facilitatorUid: string;    // Owner/operator of assignment
  familyId: string;          // Family context
  childId: string;           // Child/learner
  createdAt: Timestamp;      // Admin-set
  assignedBy: string;        // Admin UID who created assignment
}
```

**Access Control (Firestore Rules):**
```firestore
match /facilitatorAssignments/{assignmentId} {
  allow read: if signedIn() && hasRole('facilitator') 
    && resource.data.facilitatorUid == request.auth.uid;
  allow read: if isAdmin();
  allow create, update: if isAdmin();  // Only admins can assign
  allow delete: if isAdmin();
}
```

**Key Pattern:** Facilitators can READ only their own assignments; admin controls assignment creation/deletion.

### Authorization Helper: `isAssignedFacilitator()`

```firestore
function isAssignedFacilitator(familyId, childId) {
  return signedIn() && hasRole('facilitator')
    && 'facilitatorUids' in get(/families/{familyId}/children/{childId}).data
    && get(/families/{familyId}/children/{childId}).data.facilitatorUids.hasAny([request.auth.uid]);
}
```

**Pattern:** Checks if facilitator UID is in the child's facilitatorUids array. Used throughout rules for access control.

### Current Access Matrix

| Resource | Facilitator (Owner) | Facilitator (Other) | Admin | Parent | Learner |
|----------|-------------------|-------------------|-------|--------|---------|
| facilitatorAssignments (own) | READ ✓ | DENY | READ | DENY | DENY |
| child/learner data | READ ✓ | DENY | READ | READ | DENY |
| journeyProgress | READ ✓ | DENY | READ | READ | DENY |
| assessmentAttempts | READ ✓ | DENY | READ | READ | DENY |
| parentInsights | DENY | DENY | READ | READ | DENY |

**Enforcement Level:** FIRESTORE RULES + CLIENT-SIDE QUERIES

---

## SECTION 3: EXISTING SESSION DEPENDENCIES (H3.2.8)

### Session Schema: `academySessions/{sessionId}`

```typescript
interface AcademySession {
  id: string;                          // Document ID
  facilitatorUid: string;              // Owner (immutable)
  activityId: string;                  // Reference to lesson/scenario (immutable)
  activityKind: string;                // "lesson" | "scenario" | "assessment" | "reflection"
  activityTitle: string;               // Display name
  trackId: string;                     // Curriculum track ("save")
  startedAt: Timestamp;                // Server timestamp (immutable)
  endedAt: Timestamp | null;           // Populated on completion
  status: "active" | "completed";      // Lifecycle state
  learnerIds: string[];                // Snapshot of session participants (immutable)
  attendance: Record<string, "present" | "absent" | "unknown">; // Per-learner
  facilitatorNote: string | null;      // Facilitator observation (1000 chars)
  createdAt: Timestamp;                // Server timestamp (immutable)
  updatedAt: Timestamp;                // Updated on mutations
}
```

**CRITICAL FINDING:** Sessions store `learnerIds` as an array, NOT `cohortId`. 

**Impact on H3.2.9:**
- If H3.2.9 introduces `academyCohorts`, existing sessions remain valid
- Sessions capture a *snapshot* of learners at session creation (not dynamic reference)
- No migration required for sessions
- If H3.2.9 adds `cohortId` to sessions, it must be:
  - Optional (backward compatible)
  - Not used for authorization (learnerIds is primary)
  - Purely informational (for UI context only)

**Sessions Do NOT Reference Cohorts:** Current design is independent and safe.

---

## SECTION 4: EXISTING DATA ACCESS FUNCTIONS

### `getAssignedChildren(facilitatorUid)`

**Location:** `src/lib/academy/data-access.ts:190`

```typescript
async function getAssignedChildren(facilitatorUid: string): Promise<AssignedChild[]> {
  // 1. Query facilitatorAssignments (indexed by facilitatorUid)
  const assignmentsSnap = await getDocs(
    query(collection(db, "facilitatorAssignments"), 
          where("facilitatorUid", "==", facilitatorUid)),
  );

  // 2. For each assignment, fetch child metadata
  for (const assignmentDoc of assignmentsSnap.docs) {
    const { familyId, childId } = assignmentDoc.data();
    const childSnap = await getDoc(doc(db, "families", familyId, "children", childId));
    
    // 3. Verify facilitator is in facilitatorUids array (defense in depth)
    if (!childSnap.data().facilitatorUids.includes(facilitatorUid)) {
      console.warn("Facilitator not authorized");
      continue;
    }

    results.push({ id: childId, familyId, name, avatar, age, tatiId, facilitatorUids });
  }

  return results;
}
```

**Pattern:** Dual-layer authorization (facilitatorAssignments index + facilitatorUids array).

### `loadAcademyDashboard(facilitator)`

**Location:** `src/lib/academy/data-access.ts:470`

```typescript
async function loadAcademyDashboard(facilitator: AcademyFacilitatorProfile) {
  const assignedChildren = await getAssignedChildren(facilitator.uid);
  const progressSummaries = await Promise.all(
    assignedChildren.map(child => 
      getChildJourneyProgress(child.familyId, child.id)
    )
  );

  return {
    facilitator,
    assignedChildren,        // Implicit cohort
    progressSummaries,       // Cohort progress
    learnersSupportSignal,
    todayActivity,
  };
}
```

**Pattern:** Loads facilitator's assigned children and their progress. This data feeds the `/academy/cohorts` view.

### Hooks: `useAcademyDashboard()`, `useAssignedChildren()`

**Location:** `src/lib/academy/hooks.ts`

```typescript
export function useAcademyDashboard(facilitator) {
  return useQuery({
    queryKey: ["academy-dashboard", facilitator?.uid],
    queryFn: () => loadAcademyDashboard(facilitator),
    enabled: !!facilitator,
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}
```

**Pattern:** React Query caching with 5-minute staleTime for dashboard data.

---

## SECTION 5: EXISTING UI IMPLEMENTATION

### Route: `/academy/cohorts`

**Location:** `src/routes/academy/cohorts.tsx`

```typescript
function AcademyCohorts() {
  const { data: dashboardData } = useAcademyDashboard(facilitator);
  
  const learners = dashboardData?.progressSummaries || [];
  
  // Calculate "cohort-level" statistics
  const totalLearners = learners.length;
  const onTrackCount = learners.filter(l => l.supportSignal === "on-track").length;
  
  // Render learner cards
  return <LearnerRoster learners={learners} />;
}
```

**Current Behavior:** Displays facilitator's assigned children with progress signals.

**Current Limitations:**
- No cohort name/metadata display
- No cohort selection (only shows all assigned learners)
- No cohort creation/editing UI
- No formal cohort identity

### Route: `/academy/cohorts/$childId`

**Location:** `src/routes/academy/cohorts/$childId.tsx`

**Current Behavior:** Shows individual learner detail (progress, assessments, activity log).

---

## SECTION 6: EXISTING TYPES & INTERFACES

**Key Type:** `AssignedChild`

```typescript
export interface AssignedChild {
  id: string;              // childId
  familyId: string;
  name: string;
  avatar: string;
  age: number;
  tier: "junior";
  tatiId: string;          // TATI-XXXXXXXX (opaque identifier)
  facilitatorUids: string[]; // Array of assigned facilitators
}
```

**Key Type:** `ChildProgressSummary`

```typescript
export interface ChildProgressSummary {
  childId: string;
  childName: string;
  avatar: string;
  currentActivityType?: "lesson" | "scenario" | "assessment" | "reflection";
  currentActivityName?: string;
  journeyProgress: { completed: number; total: number };
  lastActivityAt?: Date;
  supportSignal?: "on-track" | "not-started" | "needs-support";
}
```

**No Existing Cohort Type:** H3.2.9 will need to define `AcademyCohort` or similar.

---

## SECTION 7: PROPOSED COHORT MODEL (MINIMAL)

### Option A: Formalize Cohorts as Persistent Entities (RECOMMENDED)

**New Collection:** `academyCohorts/{cohortId}`

```typescript
interface AcademyCohort {
  id: string;                    // Cohort ID (Firestore-generated)
  facilitatorUid: string;        // Owner (immutable after creation)
  name: string;                  // Cohort name (mutable, max 100 chars)
  description: string | null;    // Optional description (mutable, max 500 chars)
  learnerIds: string[];          // Array of childIds (mutable)
  status: "active" | "archived"; // Lifecycle state (mutable)
  createdAt: Timestamp;          // Server timestamp (immutable)
  updatedAt: Timestamp;          // Updated on mutations
}
```

**Storage Format:** Reference learners by `childId` only (not familyId + childId).

**Design Rationale:**
- Minimal schema (only operationally necessary fields)
- Facilitator ownership (single owner per cohort)
- Status-based lifecycle (archive instead of delete)
- No learner-profile duplication (references only)
- No parent data exposure
- No progress aggregation in the cohort (calculated at query time)

### Option B: UI-Only Enhancement (Implicit Model)

**What:** Enhance `/academy/cohorts` UI with cohort metadata without Firestore persistence.

**Limitations:**
- Cannot create multiple named cohorts
- Cannot persist cohort membership across sessions
- Cannot migrate to school-management system later
- Less future-proof

### Recommendation: IMPLEMENT OPTION A

Reasons:
1. **Forward Compatible:** Enables school-management features (H3.3+) without rearchitecting
2. **Explicit Ownership:** Clear facilitator ownership for authorization
3. **Minimal Schema:** Only necessary fields; no bloat
4. **Migration Path:** Existing sessions remain valid; cohortId is optional
5. **Matches Architecture Docs:** Aligns with PHASE_H3_0_1_ACADEMY_PRODUCT_DATA_CONTRACT.md

---

## SECTION 8: SECURITY ANALYSIS

### Authorization Model for Cohorts

```
Who may:
  ✓ Create cohorts    → Facilitators (owner of new cohort)
  ✓ Read cohorts      → Owner, members' facilitators if needed, admin
  ✓ Update cohorts    → Owner only (mutable fields)
  ✓ Archive cohorts   → Owner only
  ✗ Delete cohorts    → NO ONE (preserve history)
  
  ✓ Add learner       → Owner (if learner is in facilitatorAssignments)
  ✓ Remove learner    → Owner only
  ✗ Change owner      → NO ONE (ownership is immutable)
```

### Critical Security Requirements

1. **Facilitator Isolation:**
   - Facilitator A cannot read Facilitator B's cohorts
   - Firestore rule: `facilitatorUid == request.auth.uid`

2. **Learner Authorization:**
   - Can only add learners from `facilitatorAssignments`
   - Firestore rule: Check learner in facilitatorAssignments before write
   - (Mitigation: learnerIds immutable after creation)

3. **Ownership Immutability:**
   - Cannot transfer cohort ownership (no ownership-change endpoint)
   - Firestore rule: `facilitatorUid` field immutable in update

4. **Data Minimization:**
   - NO learner names/avatar in cohort (reference only)
   - NO parent data
   - NO assessment scores
   - NO behavioral labels
   - NO sensitive PII

5. **Protected Collections:**
   - Facilitators cannot modify:
     - journeyProgress ✓ (write: false in rules)
     - assessmentAttempts ✓ (write: false in rules)
     - scenarioSessions ✓ (write: false in rules)
     - competencies ✓ (write: false in rules)
     - parentInsights ✓ (not accessible)

---

## SECTION 9: FIRESTORE RULES FOR H3.2.9

### New Rules Block: `academyCohorts`

```firestore
match /academyCohorts/{cohortId} {
  // CREATE: Authenticated facilitators only
  allow create: if signedIn() && hasRole('facilitator')
    && request.resource.data.facilitatorUid == request.auth.uid
    && request.resource.data.status == 'active'
    && request.resource.data.name != null
    && request.resource.data.name.size() > 0
    && request.resource.data.name.size() <= 100;

  // READ: Owner or admin only
  allow read: if request.auth.uid == resource.data.facilitatorUid || isAdmin();

  // UPDATE: Owner only, with immutability checks
  allow update: if request.auth.uid == resource.data.facilitatorUid
    && request.resource.data.facilitatorUid == resource.data.facilitatorUid
    && request.resource.data.createdAt == resource.data.createdAt;

  // DELETE: Prevent deletion (archive instead)
  allow delete: if false;
}
```

**Optional Enhancement (Defense-in-Depth):**
```firestore
// Validate that all learnerIds are assigned to facilitator
// (Requires checking facilitatorAssignments — complex but possible)
// For MVP, this check is done at application level only.
```

---

## SECTION 10: MIGRATION STRATEGY

### Existing Sessions (H3.2.8)

**Current Session Schema:**
```typescript
{
  facilitatorUid: "fac-123",
  learnerIds: ["child-1", "child-2"],
  ...
}
```

**No Migration Required:** Sessions don't reference cohorts. If H3.2.9 adds optional `cohortId`:
```typescript
{
  facilitatorUid: "fac-123",
  cohortId: undefined,  // Optional, for UI context only
  learnerIds: ["child-1", "child-2"],
  ...
}
```

**Backward Compatibility:** ✓ PRESERVED

### Existing Assignments (H3.2.2)

**No Changes to facilitatorAssignments:** The collection remains the source-of-truth for authorization.

**Cohorts as UI Layer:** Cohorts are *user-facing groupings*, not the auth model.

**Backward Compatibility:** ✓ PRESERVED

### Existing Dashboard (`useAcademyDashboard()`)

**Current Behavior:** Returns facilitator's assigned children.

**After H3.2.9:** Can optionally include cohort metadata if facilitator has created cohorts.

**Backward Compatibility:** ✓ PRESERVED

---

## SECTION 11: BACKWARD COMPATIBILITY VERIFICATION

| System | Change | Backward Compatible? |
|--------|--------|---------------------|
| H3.2.1 Dashboard | Add cohort display | ✓ YES (optional UI enhancement) |
| H3.2.2 Authorization | Add cohort rules (new collection) | ✓ YES (no changes to existing rules) |
| H3.2.3 Learner Detail | Add cohort context link | ✓ YES (optional UI) |
| H3.2.4 Cohort Workflow | Formalize cohort entity | ✓ YES (currently implicit) |
| H3.2.5 Session Guide | Reference cohort (optional) | ✓ YES (learnerIds is primary) |
| H3.2.6 Activity Launch | Reference cohort (optional) | ✓ YES (learnerIds is primary) |
| H3.2.7 Session Monitor | Reference cohort (optional) | ✓ YES (learnerIds is primary) |
| H3.2.8 Session Persistence | Add optional cohortId | ✓ YES (immutable learnerIds is primary) |
| Junior Routes | No changes | ✓ YES (isolated from Academy) |
| Parent Routes | No changes | ✓ YES (isolated from Academy) |
| Firestore Rules | Add new collection block | ✓ YES (no changes to existing blocks) |

---

## SECTION 12: DEFERRED FUNCTIONALITY (OUT OF SCOPE FOR H3.2.9)

**H3.2.9 WILL NOT INCLUDE:**

### School/Organization Management
- ❌ academyOrganizations collection
- ❌ School CRUD
- ❌ Multi-school isolation
- ❌ School-level administration
- ❌ School onboarding

### Facilitator Management
- ❌ Facilitator invitations
- ❌ Facilitator role management
- ❌ Facilitator-to-school assignment
- ❌ Facilitator profile management (beyond what H3.2.1 provides)

### Advanced Cohort Features
- ❌ Cohort-level analytics dashboard
- ❌ Cohort-level progress reporting
- ❌ Cohort activity scheduling
- ❌ Batch learner enrollment
- ❌ Cohort messaging/announcements
- ❌ Cohort calendar/timeline

### Analytics & Reporting
- ❌ Cohort progress analytics
- ❌ Learner performance rankings
- ❌ Completion rate reporting
- ❌ Attendance aggregation
- ❌ Support signal trending

### Session Features
- ❌ Session scheduling per cohort
- ❌ Cohort-level session history
- ❌ Batch session management

### Integration Features
- ❌ Parent notifications about cohorts
- ❌ Parent cohort visibility
- ❌ School SIS integration

**All deferred features require explicit authorization in future phases.**

---

## SECTION 13: DISCOVERY ARTIFACTS

### Files Inspected (READ-ONLY)

| File | Purpose | Findings |
|------|---------|----------|
| `firestore.rules` | Security rules | No cohort rules exist; facilitatorAssignments rules confirmed |
| `src/lib/academy/data-access.ts` | Data access layer | getAssignedChildren() function documented; no cohort functions |
| `src/lib/academy/hooks.ts` | React Query hooks | useAcademyDashboard() uses facilitatorAssignments; no cohort hooks |
| `src/routes/academy/cohorts.tsx` | Cohorts UI (implicit) | Displays assigned children; no formal cohort entity |
| `src/routes/academy/cohorts/$childId.tsx` | Learner detail | Shows individual learner in cohort context |
| `drizzle/migrations/*.sql` | Supabase schema | No cohort tables; facilitator roles exist |
| `PHASE_H3_0_1_ACADEMY_PRODUCT_DATA_CONTRACT.md` | Architecture doc | Confirms cohort/facilitator/learner hierarchy needed |
| `PHASE_H3_2_2_SECURITY_DATA_FOUNDATION_COMPLETION_REPORT.md` | H3.2.2 details | Confirms facilitatorAssignments is proper authorization model |
| `PHASE_H3_2_8_FINAL_VERIFICATION_REPORT.md` | H3.2.8 details | Confirms sessions use learnerIds, not cohortId |

### Confirmations

✓ **No academyCohorts collection exists**  
✓ **facilitatorAssignments properly implements H3.2.2**  
✓ **H3.2.8 sessions are independent of cohorts**  
✓ **Current implicit cohort model works for MVP**  
✓ **Backward compatibility can be maintained**  
✓ **Proposed cohort model is compatible with all existing systems**

---

## SECTION 14: CONCLUSION

### Current State
- **Implicit Cohort Model:** Facilitator's assigned learners = cohort (no persistent entity)
- **Authorization:** Enforced via facilitatorAssignments + facilitatorUids
- **Sessions:** Reference learnerIds directly (not cohort-aware)
- **UI:** Displays assigned children as "cohorts" (no formal management)

### Recommendation
**Implement Option A: Formalize Cohorts as Persistent Entities**

**Rationale:**
1. Minimal breaking changes
2. Forward-compatible with H3.3 school-management
3. Proper ownership model for future features
4. Aligns with documented architecture
5. Enables cohort lifecycle management

### Proposed Implementation Approach
1. Create `academyCohorts` collection with minimal schema
2. Add Firestore security rules for cohort authorization
3. Create data-access functions: `createCohort()`, `getCohort()`, `updateCohort()`, `archiveCohort()`
4. Create React Query hooks: `useAcademyCohorts()`, `useAcademyCohort()`, etc.
5. Add UI for cohort management (CRUD)
6. Update /academy/cohorts route to display formal cohorts
7. Ensure H3.2.8 sessions remain compatible
8. Comprehensive security testing

### Backward Compatibility
**All existing systems remain functional:**
- ✓ H3.2.1-H3.2.8 routes work unchanged
- ✓ facilitatorAssignments untouched
- ✓ Session persistence unchanged
- ✓ Learner progress protected
- ✓ Parent privacy maintained

---

**Discovery Report Status:** ✅ **COMPLETE**

**Next Step:** Await explicit authorization to proceed with implementation.

---

*This discovery report documents the existing architecture, identifies the optimal cohort model, and confirms that Option A (persistent cohort entities) can be implemented safely with full backward compatibility.*
