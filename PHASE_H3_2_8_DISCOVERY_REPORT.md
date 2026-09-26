# PHASE H3.2.8 — SESSION PERSISTENCE & SESSION MANAGEMENT
## Discovery & Architecture Review Report

**Status:** ✅ DISCOVERY COMPLETE — Ready for implementation  
**Date:** January 2026

---

## A. EXISTING SESSION ARCHITECTURE

### Current State
✅ **NO existing facilitator session collection**

Search results:
- `childSessions` collection exists (learner entry sessions, blocked in Firestore rules)
- `scenarioSessions` collection exists (learner scenario state, read-only for facilitators)
- NO `academySessions` collection
- NO `facilitatorSessions` collection
- NO `attendance` collection
- NO `facilitatorNotes` collection

### Learner-Side Session Architecture (Must Protect)
```
families/{familyId}/children/{childId}
├─ journeyProgress/{itemKey}
│  ├─ item_type: "lesson" | "scenario" | "assessment" | "reflection"
│  ├─ item_id: activity ID
│  ├─ status: "not-started" | "in-progress" | "completed"
│  ├─ updatedAt: timestamp
│  └─ score, maxScore: null (immutable)
│
├─ scenarioSessions/{scenarioKey}
│  ├─ id, title, status, completedAt
│  └─ Firestore rule: write: false
│
├─ assessmentAttempts/{attemptId}
│  ├─ id, phase, title, score, maxScore, completedAt
│  └─ Firestore rule: write: false
│
└─ competencies/{competencyId}
   └─ Firestore rule: write: false
```

**Critical:** Facilitator session record must NOT touch these collections.

---

## B. EXISTING AUTHORIZATION MODEL

### H3.2.2 Facilitator Authorization
**Pattern:** Index-based assignment lookup + double-check

```firestore
// Firestore rule function
function isAssignedFacilitator(familyId, childId) {
  return signedIn() && hasRole('facilitator')
    && 'facilitatorUids' in get(.../children/$(childId)).data
    && get(.../children/$(childId)).data.facilitatorUids
         .hasAny([request.auth.uid]);
}

// Three-layer enforcement:
1. facilitatorAssignments index query (client-side)
2. facilitatorUids array check in child document (client-side)
3. Firestore rules enforce isAssignedFacilitator() at read time (server-side)
```

**Data Access Functions** (existing):
- `getAssignedChildren(facilitatorUid)` — Query facilitatorAssignments, verify facilitatorUids
- `getChildJourneyProgress(familyId, childId)` — Read-only Firestore query
- `computeChildProgressSummary()` — Aggregate progress

**Facilitator Profile** (existing):
```typescript
interface FacilitatorSession {
  uid: string;
  email: string;
  displayName: string;
  isFacilitator: boolean;
}
```

**Facilitator Identification:**
- Retrieved via `getFacilitatorSession()` (Supabase auth + Firestore role check)
- UID is the authoritative facilitator identity
- Firestore rules use `request.auth.uid` for enforcement

### Immutable Ownership Pattern (Existing)
Used for children:
```firestore
function immutableOwnership(existing, proposed) {
  return proposed.familyId == existing.familyId
    && proposed.id == existing.id
    && proposed.createdBy == existing.createdBy;
}
```
**Recommendation:** Use similar pattern for facilitator sessions to prevent ownership changes.

---

## C. EXISTING LEARNER PROGRESS MODEL

### Progress Tracking (Learner-Owned)
```
journeyProgress/{itemKey}
├─ id: string (unique event ID)
├─ kind: "lesson" | "scenario" | "assessment" | "reflection"
├─ item_id: string (activity ID)
├─ status: "not-started" | "in-progress" | "completed"
├─ completedAt: Date | null
├─ score: null (always, per Firestore rule)
└─ maxScore: null (always, per Firestore rule)
```

### Current Activity Determination (Existing)
```typescript
// From ChildProgressSummary
currentActivityType: (current_item?.kind as string) || undefined;
currentActivityName: current_item?.itemId;  // Last item with status != "completed"
journeyProgress: { completed: count, total: 14 }
lastActivityAt: last_event?.completedAt
```

**Source of Truth:** Learner owns their progress. Facilitation session records are observational only.

### Assessment Integrity (Firestore Rule Protected)
```firestore
match /assessmentAttempts/{attemptId} {
  allow write: if false;  // Immutable once recorded
}
```
**Implication for H3.2.8:** Facilitator sessions cannot modify assessments or scores.

---

## D. PROPOSED H3.2.8 DATA MODEL

### Minimum Session Collection Schema
**Collection:** `academySessions` (top-level, not nested in family)

**Reasoning:**
- Facilitator sessions are operational, not family-scoped
- One facilitator may facilitate for multiple families/cohorts
- Nesting in family would require complex queries
- Top-level with index on `facilitatorUid` allows efficient lookup

### Proposed Document Structure

```firestore
academySessions/{sessionId}
├─ sessionId: string                    // UUID or auto-generated ID
├─ facilitatorUid: string               // Owner facilitator (immutable)
├─ activityId: string                   // Activity being facilitated
├─ activityKind: "lesson" | "scenario" | "assessment" | "reflection"
├─ activityTitle: string                // For historical reference
├─ trackId: "save" (for MVP)            // For filtering/history
├─ startedAt: Timestamp (server)        // Session start time
├─ endedAt: Timestamp (server) | null   // Session end time (null while active)
├─ status: "active" | "completed"       // Lifecycle state
├─ learnerIds: string[]                 // Assigned learner child IDs (snapshot at session start)
├─ attendance: Record<childId, "present" | "absent"> | null
├─ facilitatorNote: string | null       // Optional observation (max 1000 chars)
├─ createdAt: Timestamp (server)        // Record creation time
├─ updatedAt: Timestamp (server)        // Record update time
```

### What NOT to Store
❌ Learner names/avatars (can be resolved via child ID)
❌ Learner progress snapshots (query live data)
❌ Assessment scores (immutable, stored elsewhere)
❌ Scenario outcomes (stored in scenarioSessions)
❌ Competency data (stored in competencies)
❌ Parent information (never expose)
❌ Family information (not in facilitator's data model)
❌ Facilitator's own details (except UID)

### Why This Minimal Schema
- **sessionId:** Unique identifier for this facilitation event
- **facilitatorUid:** Authorization boundary (can only access own sessions)
- **activityId/Kind/Title:** Operational context (what was being facilitated)
- **startedAt/endedAt:** Timing (when did facilitation occur)
- **status:** Lifecycle (active or completed)
- **learnerIds:** Session scope (which learners were part of this session)
- **attendance:** Optional observation (who was present)
- **facilitatorNote:** Optional observation (what did facilitator notice)

**Cost Consideration:** Small document size = efficient reads/writes = low Firebase cost.

---

## E. SESSION LIFECYCLE (MINIMAL STATE MACHINE)

```
START SESSION (user action)
    ↓
Create document with status="active"
    ↓
ACTIVE (facilitator can:)
  - View monitoring
  - Update attendance
  - Update facilitator note
  - END SESSION
    ↓
END SESSION (user action)
    ↓
Set status="completed"
Set endedAt=now
    ↓
COMPLETED (facilitator can:)
  - View session summary
  - Read session details
  - Resume if needed (edge case)
```

**Important:** No "planned" state in MVP (sessions created on-demand when started).

---

## F. DUPLICATE ACTIVE SESSION HANDLING

### Current Approach
**Prevent simultaneous active sessions for same facilitator + activity**

**Check Before Creating Session:**
```
Query academySessions
  where facilitatorUid == currentFacilitator.uid
  AND activityId == selectedActivity
  AND status == "active"

If found:
  → Offer "Resume session" instead of "Start new session"
If not found:
  → Create new session
```

**Implementation Note:**
- Client-side check for UX (show resume offer immediately)
- Firestore rules can add server-side validation if needed
- Simple approach: Last-write-wins (facilitator can close old session and start new if needed)

---

## G. AUTHORIZATION MODEL FOR H3.2.8

### Session Creation
**Who can create:**
- Authenticated facilitator only
- Must have facilitator role (Firestore rule: `hasRole('facilitator')`)
- Must have assigned learners (checked by client before showing Start button)

**Validation:**
- Activity ID must exist in curriculum
- Learner IDs must all be assigned to this facilitator
- No duplicate active session for same activity

### Session Read
**Who can read:**
- Session owner (facilitator who created it)
- Admin (if admin model exists)
- NOT: different facilitators, parents, learners

**Implementation:**
```firestore
match /academySessions/{sessionId} {
  allow read: if request.auth.uid == resource.data.facilitatorUid || isAdmin();
}
```

### Session Update
**Who can update:**
- Session owner only
- Only allowed fields: attendance, facilitatorNote, status (if transitioning to completed)
- Cannot change: facilitatorUid, activityId, learnerIds, startedAt

**Implementation:**
```firestore
allow update: if request.auth.uid == resource.data.facilitatorUid
  && immutableFields(resource, request)
  && onlyAllowedFieldsModified(['attendance', 'facilitatorNote', 'status', 'endedAt', 'updatedAt']);
```

### Session Completion
**Who can end:**
- Session owner only
- Can only end own active sessions
- Once completed, cannot be reopened (append-only history)

**Rule:**
```firestore
allow update: if request.auth.uid == resource.data.facilitatorUid
  && resource.data.status == 'active'
  && request.resource.data.status == 'completed'
  && request.resource.data.endedAt != null;
```

### Learner Privacy (Critical)
❌ **Facilitators CANNOT:**
- Access parent information
- Modify learner progress
- See another facilitator's sessions
- Edit learner-owned data

---

## H. PRIVACY & DATA MINIMIZATION

### What Facilitator Notes Can Contain
✅ Learning/facilitation observations only:
- "Learners engaged well with the activity"
- "Several learners wanted more examples"
- "Plan to revisit budgeting concept next session"
- "Good discussion about mobile money safety"

### What Facilitator Notes CANNOT Contain
❌ Personal information:
- Family circumstances
- Medical information
- Financial circumstances of family
- Behavioral labels ("lazy", "smart", "problem child")
- Grades or performance scores
- Parent details
- Sensitive family data

### UI Hint for Note Field
Display clear guidance:
> **Session observation** (learning and facilitation notes only, max 1000 characters)
> 
> Good examples: Learner questions, discussion points, follow-up topics
> 
> Do not record: Private family info, parent details, behavioral labels

### Access Control
- Only facilitator who created the session can read/edit notes
- Notes are facilitator-private (unlike curriculum content)
- If future parent dashboard exists, notes should NOT be exposed
- If analytics added later, notes should NOT be aggregated/exposed

---

## I. ATTENDANCE PRIVACY & AUTHORIZATION

### Attendance Data
```
attendance: {
  "child-id-1": "present",
  "child-id-2": "absent",
  "child-id-3": "present"
}
```

### Validation Required (Firestore Rules)
Before accepting attendance update:
```
1. For each childId in attendance:
   - Must be in session.learnerIds
   - Must be assigned to facilitatorUid
   - If either fails, reject entire update
```

**Cannot Trust Client:** Prevent malicious submission like:
```
attendance: {
   unrelated-child-id: "present"
}
```

### Implementation
**Option A (Recommended): Full validation in Firestore rules**
```firestore
allow update: if request.auth.uid == resource.data.facilitatorUid
  && request.resource.data.attendance.keys().all(childId => 
      childId in resource.data.learnerIds
  );
```

**Option B (If complex validation needed): Simpler schema**
Instead of record, use array of attendance records:
```
attendance: [
  { childId: "...", marked: "present", markedAt: timestamp }
]
```
This makes each record independently validateable.

---

## J. FIRESTORE RULES FOR H3.2.8

### Proposed Rules Block (Minimal)

```firestore
// ============================================================================
// ACADEMY SESSIONS (H3.2.8 — FACILITATOR SESSION PERSISTENCE)
// ============================================================================
// Facilitator sessions record the operational context of facilitated activities.
// Sessions are owned by facilitators, immutable after creation.
// Sessions do NOT modify learner progress.
// ============================================================================

match /academySessions/{sessionId} {
  // Create: Authenticated facilitator only
  allow create: if signedIn() && hasRole('facilitator')
    && request.resource.data.facilitatorUid == request.auth.uid
    && request.resource.data.status == 'active'
    && request.resource.data.startedAt != null
    && request.resource.data.endedAt == null;

  // Read: Owner or admin only
  allow read: if request.auth.uid == resource.data.facilitatorUid || isAdmin();

  // Update: Owner only, limited fields
  allow update: if request.auth.uid == resource.data.facilitatorUid
    && immutableOwnership(resource.data, request.resource.data)
    && request.resource.data.facilitatorUid == resource.data.facilitatorUid
    && request.resource.data.activityId == resource.data.activityId
    && request.resource.data.learnerIds == resource.data.learnerIds
    && request.resource.data.startedAt == resource.data.startedAt
    && request.resource.data.attendance.keys().all(childId =>
        childId in resource.data.learnerIds
    );

  // Delete: Prevent deletion of completed sessions (history preservation)
  allow delete: if false;
}
```

---

## K. SERVER TIMESTAMPS (CRITICAL)

### Use Firestore Server Timestamps
**Do NOT trust client for authoritative timing:**

```typescript
// Client sends this in request
startedAt: serverTimestamp()  // ← Firestore handles this
endedAt: serverTimestamp()
createdAt: serverTimestamp()
updatedAt: serverTimestamp()
```

**Why:**
- Client clock can be inaccurate
- Prevents backdating sessions
- Prevents timing attacks
- Authoritative record for auditing

---

## L. COST & PERFORMANCE ANALYSIS

### Firestore Operations per Session Lifecycle

**Session Creation:**
- 1 write (create academySessions document)
- Cost: ~0.06 per 100 ops

**Session Update (attendance/notes):**
- 1 write per update
- Typical session might have 2-5 updates (mark attendance, add note, end)
- Cost: ~0.06 per 100 ops per update

**Session Read (during monitoring):**
- Already handled by existing useAcademyDashboard hook
- No new queries added for H3.2.8 core features

**Session History View (if implemented):**
- Query academySessions by facilitatorUid
- Index: `facilitatorUid + status + createdAt` (for filtering/sorting)
- Typical: 10-50 sessions per facilitator per month
- Cost: ~0.06 per 100 queries

### No Realtime Requirement
- Use manual refresh (React Query existing pattern)
- No Firestore listeners
- No polling
- MVP doesn't require live collaboration

### Summary
**Minimal cost addition:** ~1-2 writes per session, ~1 read per history view
**Storage:** ~500 bytes per session (small documents)
**Indexing:** One index on (facilitatorUid, status) likely needed

---

## M. SECURITY TESTING REQUIREMENTS

### Functional Tests
1. ✅ Session creation by authenticated facilitator
2. ✅ Session read by session owner
3. ✅ Session update by session owner (attendance/notes)
4. ✅ Session completion by session owner
5. ✅ Duplicate active session prevention

### Security Tests
1. ✅ Unauthenticated user cannot create session
2. ✅ Parent cannot create facilitator session
3. ✅ Child cannot create facilitator session
4. ✅ Facilitator B cannot read Facilitator A's session
5. ✅ Facilitator B cannot update Facilitator A's session
6. ✅ Unauthorized learner IDs rejected in attendance
7. ✅ Learner progress not modified by session ops
8. ✅ Parent data not exposed in session document

### Recommended Test Location
If Firestore emulator infrastructure exists: Add to existing security test suite
Otherwise: Document test procedures for manual verification

---

## N. LEARNER PROGRESS INTEGRITY (NON-NEGOTIABLE)

### What Session Operations DO NOT Do
❌ Create journeyProgress entries
❌ Modify journeyProgress status
❌ Complete activities
❌ Modify assessment scores
❌ Modify scenario outcomes
❌ Change competencies
❌ Award achievements
❌ Mark learners complete

### Enforcement
- Learner progress owned by learner learning system
- Session operations only read learning data
- Session operations never write to:
  - journeyProgress
  - assessmentAttempts
  - scenarioSessions
  - competencies
  - achievements

---

## SUMMARY: H3.2.8 READY FOR IMPLEMENTATION

**Discovery Findings:**
- ✅ No existing facilitator session collection (clean slate)
- ✅ H3.2.2 authorization model fully supports facilitator isolation
- ✅ Learner progress model is immutable (safe from facilitator writes)
- ✅ Proposed minimal schema addresses all requirements
- ✅ Privacy boundaries clearly defined
- ✅ Security model enforceable via Firestore rules
- ✅ Cost is minimal (small documents, few operations per session)

**Recommended Architecture:**
1. Create `academySessions` collection (top-level)
2. Add Firestore rules for authorization and immutability
3. Create session CRUD functions in data-access layer
4. Add React Query hooks for session operations
5. Extend H3.2.6 launch screen with "Start Session" button
6. Extend H3.2.7 monitor screen with session header
7. Create session summary screen after completion

**No Architectural Changes Required:**
- Existing authorization model sufficient
- No changes to learner progress
- No changes to parent/child routes
- No new Firestore security complexity

**Proceed with implementation ✅**
