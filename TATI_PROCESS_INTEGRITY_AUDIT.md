# TATI ChildSave — Comprehensive Process Integrity Audit

**Date:** 2026-10-01  
**Scope:** Complete chain mapping for signup, child creation, authentication, progress recording, and visibility flows  
**Format:** Process chains with breakpoint identification

---

## 1. PARENT SIGNUP & FAMILY CREATION

```
WORKFLOW: Parent Creates Account
USER: Parent/Guardian
ENTRY: GET /signup route
↓
ROUTE: src/routes/(public)/signup.tsx
↓ 
ACTION: Parent enters email, password, full name
↓
CLIENT AUTH CHECK: Firebase createUserWithEmailAndPassword()
↓
FIREBASE OPERATION: auth.createUser() + updateProfile(displayName)
↓
DATABASE OPERATION: No user document created automatically
↓
REDIRECT: Navigate to /parent (authenticated)
↓
RESULT: Parent is logged into Firebase Auth; no Firestore user doc exists yet
↓
UI CONSUMER: Parent Portal (src/routes/parent/index.tsx)
↓
NEXT ACTION: Query useChildProfiles() → calls getFamilyChildren()
↓
POTENTIAL BREAKS:
- ❌ CRITICAL: Parent has Firebase Auth but no Firestore /users/{uid} document
- ❌ Family is not created until parent interacts with /onboarding
- ⚠ Firestore rules allow reading /families only if user is isActiveFamilyMember
- ⚠ ensureFamily() is called during page load, creating family on-demand
```

### Family Creation Chain

```
WORKFLOW: Family Creation (On-Demand During Page Load)
USER: Parent/Guardian
ENTRY: Parent opens /parent/index.tsx
↓
ROUTE: src/lib/family.ts::useChildProfiles()
↓
SERVER FUNCTION: src/lib/backend/firebase/family.functions.ts::getFamilyChildren()
↓
SERVER-SIDE LOGIC:
  1. Calls FirebaseFamilyRepository.ensureFamily()
  2. Checks /users/{userId}/familyMemberships collection
  3. If no active membership exists, creates one
↓
DATABASE OPERATIONS (ensureFamily):
  1. CREATE: /families/{familyId} document
     - Fields: name="My Family", createdBy=userId, status="active"
     - Missing: familyId field (should be auto-set)
  2. CREATE: /users/{userId}/familyMemberships/{familyId} 
     - Fields: familyId, userId, role="parent", status="active"
  3. No user document created at /users/{userId}
↓
FIRESTORE AUTHORIZATION:
  - allow create: if signedIn() && request.resource.data.createdBy == request.auth.uid
  - Family creation allowed if createdBy matches auth.uid
  - memberships allow create, update, delete ONLY by isAdmin()
  - ⚠ RISK: Firestore rules allow membership creation but Firestore rules deny it
↓
RESULT: Family document exists; membership document exists
↓
POTENTIAL BREAKS:
- ❌ CRITICAL: /users/{uid} document never created; family-admin isolation fails
- ❌ ensureFamily() is called on EVERY page load (sync=30_000ms stale time)
- ⚠ Duplicate family protection: checks memberships, but creates family every page load
- ⚠ No transaction: family doc + membership doc created separately; could be orphaned
```

---

## 2. PARENT ADDS CHILD (ONBOARDING)

```
WORKFLOW: Parent Creates Child Profile
USER: Parent/Guardian
ENTRY: GET /onboarding → parent fills name/age/avatar → POST /onboarding
↓
ROUTE: src/routes/onboarding.tsx::startJourney()
↓
CLIENT ACTION: Calls createChild.mutateAsync() (useCreateChildProfile hook)
↓
SERVER FUNCTION: src/lib/family.ts::useCreateChildProfile()
↓
VALIDATION:
  - Name: 2-30 chars, letters/spaces/apostrophes only
  - Age: 8-12 years
  - Avatar: max 2 chars
↓
SERVER FUNCTION: src/lib/backend/firebase/family.functions.ts::createChildProfile()
↓
REPOSITORY: FirebaseFamilyRepository.createChild()
↓
DATABASE OPERATIONS:
  1. Call ensureFamily() → creates/returns familyId
  2. Generate UUID for childId
  3. CREATE: /families/{familyId}/children/{childId} document
     Fields:
     - id, familyId, created_by (parent's uid)
     - name, age, avatar, tier="junior"
     - curriculum_level (calculated)
     - onboarding_step=0, onboarding_completed=true
     - ❌ tati_id="" (EMPTY - NOT GENERATED)
     - createdAt, updatedAt (serverTimestamp)
↓
FIRESTORE RULES: Allow create if isFamilyAdult(familyId)
↓
RESULT: Child profile document created with EMPTY tati_id
↓
CHILD CREDENTIALS:
  - ❌ NO credentials generated
  - ❌ NO /childCredentials/{tatiId} document created
  - ❌ NO PIN generated
  - ❌ NO credentials issued or displayed to parent
↓
UI FEEDBACK: Parent sees success message, navigates to /learn/$childId/assessment/$assessmentId
↓
POTENTIAL BREAKS:
- 🔴 CRITICAL: tati_id is EMPTY STRING - child cannot log in via TATI ID + PIN
- 🔴 CRITICAL: NO credentials ever issued - /child/login path broken
- 🔴 CRITICAL: Child created but has no way to authenticate independently
- ⚠ Credentials code exists (src/lib/auth/child-auth-firebase.server.ts) but never called
- ⚠ generateTatiId(), hashChildPin(), saveChildPin() never invoked during child creation
```

---

## 3. CHILD LEARNING PATHS

### Path A: Parent-Guided Learning (Through Parent Account)

```
WORKFLOW: Parent Guides Child Through Lesson/Scenario/Assessment
USER: Parent (logged in) + Child (present)
ENTRY: Parent navigates /learn/$childId/lesson/$lessonId
↓
ROUTE: src/routes/_authenticated/learn.$childId.lesson.$lessonId.tsx
↓
FIREBASE AUTH: Parent is authenticated Firebase user
↓
ROUTE-LEVEL AUTH:
  beforeLoad: assertChildInCurrentFamily(childId)
  - Calls src/lib/family.ts::assertChildInCurrentFamily()
  - Queries Firebase for child in parent's family
  - Throws redirect to /parent if not found
↓
DATA LOADING:
  1. Lesson definition loaded from src/content/lessons/save.ts
  2. Child progress loaded via getChildJourneyProgress()
↓
PROGRESS RECORDING: Child completes lesson
  1. Calls useRecordProgress().mutate()
  2. Server Function: recordChildProgress() 
  3. Calls getCurrentChildContext() → getAuthenticatedChild()
  4. But parent is logged in as PARENT, not child
  5. ⚠ CONFUSION: How is child context established?
↓
FIREBASE OPERATION: recordChildProgress()
  - Requires AuthenticatedChildContext with childId + familyId
  - But caller is parent, not child
  - ⚠ RISK: Child context might be resolved from params, not session
↓
DATABASE OPERATION:
  CREATE/UPDATE: /families/{familyId}/children/{childId}/journeyProgress/{itemKey}
  - itemKey = "lesson:lessonId"
  - Fields: id, familyId, childId, child_profile_id, track_id, item_type, item_id
  - status="completed", score, max_score, details
  - createdAt, updatedAt (serverTimestamp)
↓
FIRESTORE RULES: journeyProgress allow create, update: if false
  - ❌ CRITICAL: Client writes DENIED
  - ✓ Server-side writes via Admin SDK bypass rules
↓
RESULT: Progress recorded to Firestore
↓
PARENT VISIBILITY: Parent sees progress updated in real-time
↓
POTENTIAL BREAKS:
- ⚠ DESIGN: Parent and child share same childId param
- ⚠ UNCLEAR: Child authentication for progress recording is vague
- ⚠ RISK: Parent can fake arbitrary childId and record progress for any child
  (no per-route authorization shown)
- ⚠ SERVER-ONLY: Admin SDK bypasses Firestore rules; no explicit per-child check shown
```

### Path B: Child-Initiated Learning (BROKEN)

```
WORKFLOW: Child Logs In With TATI ID + PIN
USER: Child (no parent)
ENTRY: GET /child/login
↓
ROUTE: src/routes/child/login.tsx
↓
UI: Form asks for TATI ID (e.g., "TATI-12345678") and 4-6 digit PIN
↓
CLIENT ACTION: childLogin({ data: { tatiId, pin } })
↓
SERVER FUNCTION: src/lib/auth/child-auth.functions.ts::childLogin()
↓
SERVER-SIDE VALIDATION:
  1. Call verifyChildCredential(tatiId, pin)
  2. Expects to find /childCredentials/{normalizedTatiId} document
  3. Verify PIN using scrypt hash
  4. Return childId
↓
DATABASE QUERY:
  LOOKUP: /childCredentials/{tatiId}
  Expected fields: tatiId, childId, familyId, pinHash, active, revokedAt
↓
VERIFICATION LOGIC:
  1. Normalize and validate TATI ID format (TATI-XXXXXXXX)
  2. Retrieve /childCredentials/{tatiId} document
  3. Check credential.active == true AND credential.revokedAt == null
  4. Verify PIN against credential.pinHash using scrypt comparison
  5. Return credential.childId
↓
GET CONTEXT:
  1. Query /childCredentials collection where childId == childId
  2. Extract familyId from credential
↓
CREATE SESSION:
  1. Generate random 32-byte token (base64url encoded)
  2. Hash token with SHA256
  3. CREATE: /families/{familyId}/children/{childId}/sessions/{sessionId}
     Fields: id, childProfileId, tokenHash, createdAt, expiresAt, revokedAt
  4. TTL: 30 minutes
↓
LOAD PROFILE:
  1. QUERY: /families/{familyId}/children/{childId}
  2. Return profile with childId, tatiId, name, age, avatar, tier, etc.
↓
SET COOKIE:
  1. HTTP-only, secure, sameSite=lax
  2. Name: "tati_child_session"
  3. Value: session token
  4. Max-age: 30 minutes
↓
FIRESTORE RULES:
  - /childCredentials: allow read, write: if false (DENY ALL)
  - /childSessions: allow read, write: if false (DENY ALL)
  - Server-only via Admin SDK
↓
RESULT: Child logged in with session cookie; navigates to /child/home
↓
POTENTIAL BREAKS:
- 🔴 CRITICAL: No /childCredentials documents exist
- 🔴 CRITICAL: verifyChildCredential() always returns null
- 🔴 CRITICAL: Login always fails with "That TATI ID or PIN could not be verified"
- ✓ Architecture is sound IF credentials existed
- ⚠ No way for parent to retrieve generated credentials
```

---

## 4. CHILD AUTHENTICATION (WHAT SHOULD HAPPEN VS. WHAT HAPPENS)

### Architecture (Intended)

```
Timeline:
  1. Parent creates child → system generates TATI ID + PIN
  2. System displays credentials to parent (screenshot/print suggested)
  3. Parent shows TATI ID + PIN to child
  4. Child enters /child/login with TATI ID + PIN
  5. System verifies in /childCredentials collection
  6. Session created, child learns
```

### Reality

```
Timeline:
  1. Parent creates child → tati_id="" (NEVER GENERATED)
  2. System displays nothing (tati_id empty)
  3. Parent cannot share credentials
  4. Child enters /child/login with TATI ID + PIN
  5. System looks for /childCredentials/{tatiId} → NOT FOUND
  6. Child sees: "That TATI ID or PIN could not be verified"
  7. Child cannot login
  8. /child/* routes are inaccessible
↓
MISSING LINK: When should credentials be generated?
  - Option A: During createChild() (recommended)
  - Option B: On-demand when parent requests (not implemented)
  - Option C: After onboarding completion (not implemented)
  - Current: NEVER
```

---

## 5. PARENT VIEWS CHILD PROGRESS

```
WORKFLOW: Parent Views Child's Journey on Parent Portal
USER: Parent/Guardian
ENTRY: GET /parent → clicks child card → /parent/child/$childId
↓
ROUTE: src/routes/parent/child.$childId.tsx
↓
FIREBASE AUTH: Parent is authenticated
↓
ROUTE-LEVEL AUTH:
  beforeLoad: None shown; relies on Firestore RLS
↓
DATA LOADING:
  1. useChildProfile(childId) → queries child profiles
  2. useChildProgress(childId) → queries journey progress
↓
SERVER FUNCTION: getChildJourneyProgress()
  1. Query /families (collectionGroup)
  2. WHERE children.id == childId
  3. Extract familyId from result
  4. Query /families/{familyId}/children/{childId}/journeyProgress
  5. Return sorted by updatedAt
↓
FIRESTORE OPERATIONS:
  1. collectionGroup("children").where("id", "==", childId).get()
  2. collection("families", familyId, "children", childId, "journeyProgress").get()
↓
FIRESTORE RULES:
  - /families/{familyId} read: if isActiveFamilyMember(familyId)
  - /families/{familyId}/children/{childId} read: if canAccessChild(familyId, childId)
  - /journeyProgress read: if canAccessChild(familyId, childId)
  - canAccessChild(): isFamilyAdult(familyId) || isAssignedFacilitator() || isAdmin()
  - isFamilyAdult: isActiveFamilyMember(familyId) && role in ["parent", "guardian"]
↓
UI DISPLAY:
  - Child profile card with name, age, avatar, curriculum level
  - Progress ring showing completion percentage
  - Lesson cards showing completed vs. upcoming
  - Competency insights
  - XP and badges
↓
RESULT: Parent sees child's journey progress
↓
POTENTIAL BREAKS:
- ⚠ AUTHORIZATION: Relies entirely on Firestore RLS
- ⚠ SERVER-SIDE: No explicit per-child authorization check in server function
- ⚠ RISK: Parent could query any childId; RLS must deny if not their child
- ✓ RLS appears correct: checks isFamilyAdult(familyId)
- ⚠ UNCLEAR: How does server function resolve familyId without authentication context?
  Uses collectionGroup scan; could leak family IDs across parents
```

---

## 6. FACILITATOR ACCESS TO LEARNER DATA

```
WORKFLOW: Facilitator Views Assigned Learner Progress (Academy)
USER: Facilitator
ENTRY: GET /academy/dashboard
↓
ROUTE: src/routes/academy/dashboard.tsx
↓
FIREBASE AUTH: Facilitator is authenticated
↓
ROUTE-LEVEL AUTH:
  beforeLoad: getFacilitatorSession()
  - Checks Firestore /users/{uid} for facilitator role
  - Returns null if not facilitator
↓
DATA LOADING:
  1. getAssignedChildren(facilitatorUid)
  2. getChildJourneyProgress(familyId, childId) for each
  3. getChildCompetencies(familyId, childId)
  4. getChildAssessments(familyId, childId)
↓
SERVER FUNCTION: getAssignedChildren()
  Queries /facilitatorAssignments collection
  WHERE facilitatorUid == facilitatorUid
  For each assignment:
    - Fetch /families/{familyId}/children/{childId}
    - Verify facilitatorUids.includes(facilitatorUid) (defense in depth)
↓
DATABASE OPERATIONS:
  1. collection("facilitatorAssignments").where("facilitatorUid", "==", facilitatorUid).get()
  2. doc("families", familyId, "children", childId).get() [for each assignment]
  3. collection("families", familyId, "children", childId, "journeyProgress").get()
↓
FIRESTORE RULES:
  - /facilitatorAssignments read: if facilitatorUid == auth.uid
  - /families/{familyId}/children/{childId} read: if canAccessChild()
  - canAccessChild: isFamilyAdult || isAssignedFacilitator || isAdmin
  - isAssignedFacilitator: exists(/families/{familyId}/children/{childId})
                          && facilit​atorUids.hasAny([auth.uid])
↓
RESULT: Facilitator sees only assigned learners' progress
↓
AUTHORIZATION CHAIN:
  1. Firestore rule checks facilitatorUids on child document
  2. Server code double-checks facilitatorUids.includes(uid)
  3. Facilitator cannot access:
     - parentInsights (read: if isFamilyAdult || isAdmin)
     - Family details beyond child scope
↓
POTENTIAL BREAKS:
- ✓ STRENGTH: Double-check authorization (RLS + server code)
- ✓ STRENGTH: facilitatorAssignments collection enables efficient lookup
- ⚠ ASSUMED: facilitatorAssignments populated correctly by admin
- ⚠ ORPHAN RISK: If facilitatorAssignments missing, facilitator sees nothing
  (fallback returns empty array; no error shown)
```

---

## 7. PROGRESS & ASSESSMENT SUBMISSION

```
WORKFLOW: Child Completes Assessment
USER: Child (via parent-guided or child-initiated path)
ENTRY: GET /child/assessment/{assessmentId} or /learn/$childId/assessment/$assessmentId
↓
ROUTE: src/routes/child/assessment.$assessmentId.tsx (child path shown)
↓
ROUTE-LEVEL AUTH:
  beforeLoad: assertChildActivity({ itemType: "assessment", itemId })
  - Calls getCurrentChildContext() → getAuthenticatedChild()
  - Throws if no valid child session
↓
CHILD CONTEXT RESOLUTION (getAuthenticatedChild):
  1. Get token from "tati_child_session" cookie
  2. Query /families/{familyId}/children/{childId}/sessions/{sessionId}
     WHERE tokenHash == sha256(token)
  3. Validate session not expired (expiresAt > now)
  4. Check session not revoked (revokedAt == null)
  5. Load child profile from /families/{familyId}/children/{childId}
  6. Return { childId, familyId, profile }
↓
ASSESSMENT LOADING:
  1. Load assessment definition from registry
  2. Verify trackId == "save" (current track)
  3. Verify item exists in track
↓
USER COMPLETES: Child answers questions
↓
SUBMIT: POST /child/assessment/{assessmentId}
↓
SERVER FUNCTION: saveChildAssessment()
  1. Get authenticated child context
  2. Load assessment definition
  3. Verify trackId == "save"
  4. CRITICAL: Server-side score calculation
     - Score NOT taken from client
     - Recalculated using scoreAssessment(definition, responses)
  5. Store to Firestore OR Supabase (HYBRID - see below)
↓
DATABASE OPERATIONS (PROBLEMATIC):
  Uses Supabase, NOT Firestore:
  
  1. supabase.from("assessment_attempts").upsert({
       child_profile_id: childId,
       assessment_id: definition.id,
       assessment_type: definition.assessmentType,
       points: calculatedResult.points,
       max_points: calculatedResult.maxPoints,
       competency_scores: {...},
       status: "completed",
       completed_at: now,
       updated_at: now
     }, { onConflict: "child_profile_id,assessment_id" })
  
  2. supabase.from("assessment_responses").upsert(responses, 
     { onConflict: "attempt_id,question_id" })
↓
FIRESTORE vs SUPABASE CONFUSION:
  - Child profile stored in Firebase
  - Progress stored in Firebase journeyProgress collection
  - Assessment attempts stored in Supabase
  - Competencies stored in Firestore (separate collection)
  - ⚠ DATA SPLIT: Two systems, two sources of truth
  - ⚠ SYNC RISK: No transactional guarantee between systems
  - ⚠ MIGRATION: Phase H4.B claims Firebase migration, but Supabase still used
↓
COMPETENCY SCORING:
  1. Server calculates competency scores from responses
  2. Uses definition.questions[].competency mapping
  3. ⚠ NOT STORED: Competency scores calculated but not persisted in this function
  4. Parent sees competencies via separate query to /competencies collection
↓
RESULT: Assessment attempt recorded; score calculated; competencies updated separately
↓
POTENTIAL BREAKS:
- 🔴 CRITICAL: Assessment attempts in Supabase, not Firebase
- ⚠ HYBRID SYSTEM: Child data split between Firebase and Supabase
- ⚠ SYNC: No transactional consistency between systems
- ✓ STRENGTH: Server-side score calculation prevents client tampering
- ⚠ COMPETENCY SYNC: Competencies not persisted in this function
  (appear to be updated in separate process)
```

---

## 8. SCENARIO EXECUTION & DECISION RECORDING

```
WORKFLOW: Child Plays Money Scenario
USER: Child
ENTRY: GET /child/scenario/{scenarioId}
↓
ROUTE: src/routes/child/scenario.$scenarioId.tsx
↓
ROUTE-LEVEL AUTH: assertChildActivity() → getCurrentChildContext()
↓
SCENARIO LOADING:
  1. Load scenario definition from registry
  2. Verify trackId == "save"
  3. Create initial scenario state from createInitialState()
     - State contains: scenarioId, phase, day, available (money), saved, decisions[]
↓
CLIENT-SIDE ENGINE:
  - Scenario player runs on client using pure deterministic engine
  - User makes choices
  - Engine advances state via applyChoice()
  - UI shows updated scenario
↓
SAVE DURING PLAY:
  Client periodically calls saveScenarioSession() with current state
  - State includes: scenarioId, nodeId, phase, day, available, saved, decisions[], etc.
  - Client calculates final state
  - ⚠ CLIENT CALCULATION: State computed on client, submitted to server
↓
SERVER-SIDE REPLAY (G5.1):
  Validates submitted state by replaying decision history:
  1. Load scenario definition
  2. Recreate initial state
  3. Replay all decisions in order via applyChoice()
  4. Compare computed state to submitted state
  5. If mismatch: REJECT (tampering detected)
  6. If match: ACCEPT (integrity verified)
↓
DATABASE OPERATION:
  CREATE/UPDATE: /families/{familyId}/children/{childId}/scenarioSessions/{scenarioKey}
  Fields: state, decisions[], createdAt, updatedAt, endingId (if finished)
↓
FIRESTORE RULES:
  scenarioSessions: allow read: if canAccessChild()
  scenarioSessions: allow write: if false (DENY ALL)
  - Server-only via Admin SDK
  - Firestore rules prevent client writes
↓
PROGRESS RECORDING:
  When scenario completes, call recordProgress()
  - itemType: "scenario"
  - itemId: scenarioId
  - score: final saved amount
  - maxScore: goal amount
↓
RESULT: Scenario saved; integrity verified; progress recorded
↓
POTENTIAL BREAKS:
- ✓ STRENGTH: Server-side replay prevents fabrication
- ✓ STRENGTH: Client-computed state is verified
- ✓ STRENGTH: Pure, deterministic engine enables replay
- ⚠ PERFORMANCE: Replay cost could scale with decision history
  (but storage is limited to 200 decisions per scenario)
```

---

## 9. AUTHORIZATION MODEL COMPLETENESS

### Firestore Security Rules Layer

```
FUNCTION: signedIn()
  return request.auth != null
  - ✓ Basic authentication check

FUNCTION: userDoc()
  return signedIn() ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data : {}
  - ⚠ RISK: Fails if /users/{uid} document doesn't exist (returns empty)
  - ⚠ CONSEQUENCE: hasRole() will always be false if user doc missing

FUNCTION: hasRole(role)
  return signedIn() && role in userDoc().roles
  - Depends on userDoc() existing and having roles array
  - ⚠ ORPHAN PATHS: Parent created via signup but no user doc created

FUNCTION: isAdmin()
  return hasRole('admin')

FUNCTION: isSchoolAdmin(schoolId)
  return signedIn() && exists(/databases/.../schools/{schoolId}/admins/{auth.uid})
  - ✓ Correct: Checks existence of admin doc

FUNCTION: memberPath(familyId)
  return /databases/.../families/{familyId}/members/{auth.uid}

FUNCTION: isActiveFamilyMember(familyId)
  return signedIn() && exists(memberPath(familyId)) && get(memberPath(familyId)).data.status == 'active'
  - ⚠ RISK: Checks /families/{familyId}/members/{uid}
  - ⚠ BUT: Firestore rules show members allow create,update,delete if isAdmin() only
  - ⚠ INCONSISTENCY: memberPath created during ensureFamily(), but rules deny non-admin updates

FUNCTION: isFamilyAdult(familyId)
  return isActiveFamilyMember(familyId) && get(memberPath(familyId)).data.role in ['parent', 'guardian']

FUNCTION: isAssignedFacilitator(familyId, childId)
  return signedIn() && hasRole('facilitator')
       && 'facilitatorUids' in get(/databases/.../families/{familyId}/children/{childId}).data
       && get(...).data.facilitatorUids.hasAny([request.auth.uid])

FUNCTION: canAccessChild(familyId, childId)
  return isFamilyAdult(familyId) || isAssignedFacilitator(familyId, childId) || isAdmin()
  - ✓ Correct: Parent can access, facilitator can access if assigned, admin can access

FUNCTION: immutableOwnership(existing, proposed)
  return proposed.familyId == existing.familyId
      && proposed.id == existing.id
      && proposed.createdBy == existing.createdBy
  - ✓ Correct: Prevents ownership tampering
```

### Collection Rules

```
/users/{uid}
  allow read: if signedIn() && (request.auth.uid == uid || isAdmin())
  allow create: if signedIn() && request.auth.uid == uid
             && request.resource.data.uid == uid
             && request.resource.data.roles is list
             && request.resource.data.status == 'pending'
  allow update: if isAdmin() || (signedIn() && request.auth.uid == uid
                && request.resource.data.uid == resource.data.uid
                && request.resource.data.status == resource.data.status
                && (roles unchanged OR resource.roles was empty))
  allow delete: if isAdmin()
  - ✓ Correct: Self-creation allowed; admin can bootstrap roles

/families/{familyId}
  allow read: if isActiveFamilyMember(familyId) || isAdmin()
  allow create: if signedIn() && request.resource.data.createdBy == request.auth.uid
  allow update: if (isActiveFamilyMember || isAdmin) && immutableOwnership
  allow delete: if isAdmin()
  - ✓ Correct: Members can read; creator can create; immutable fields protected

/families/{familyId}/members/{uid}
  allow read: if isActiveFamilyMember(familyId) || isAdmin()
  allow create, update, delete: if isAdmin()
  - ⚠ RISK: Only admin can create members, but ensureFamily() created member via Admin SDK
  - ✓ CONSEQUENCE: Server-side only; client cannot create members

/families/{familyId}/children/{childId}
  allow read: if canAccessChild(familyId, childId)
  allow create: if isFamilyAdult(familyId) && request.resource.data.createdBy == auth.uid
  allow update: if canAccessChild() && immutableOwnership
  allow delete: if isAdmin() || isFamilyAdult()
  - ✓ Correct: Parent can create own child; parent/facilitator/admin can read

/families/{familyId}/children/{childId}/journeyProgress/{itemKey}
  allow read: if canAccessChild(familyId, childId)
  allow create, update: if false
  allow delete: if isAdmin()
  - ✓ Correct: Client cannot write; server-only via Admin SDK

/childCredentials/{tatiId}
  allow read, write: if false
  - ✓ Correct: Server-only

/childSessions/{sessionId}
  allow read, write: if false
  - ✓ Correct: Server-only

/facilitatorAssignments/{assignmentId}
  allow read: if facilitator && assignmentId.facilitatorUid == auth.uid
           || canAccessSchool(schoolId)
           || isAdmin()
  - ✓ Correct: Facilitator can read own; school admin can read; admin can access all
```

---

## 10. STALE CODE & MIGRATION DEBT

### Supabase References (Should Be Removed)

```
Found 101 matches across codebase:

Still importing supabase client:
- src/integrations/lovable/index.ts
- src/lib/analytics.ts (uses supabase for events)
- src/lib/assessment/attempts.ts (stores assessment attempts)
- src/lib/feedback.ts (stores feedback)
- src/lib/gamification/achievements.ts
- src/lib/learning/progress.ts
- src/lib/scenario/session.ts

Still using Supabase for:
1. Analytics events (analyticsEvents table)
2. Feedback storage (feedback table)
3. Assessment attempts (assessment_attempts, assessment_responses tables)
4. Achievements (achievements table)
5. Competencies (indirectly via queries)

Migration Status:
- Child profiles: MIGRATED to Firebase
- Sessions: MIGRATED to Firebase
- Progress: MIGRATED to Firebase (/journeyProgress collection)
- ❌ Assessment attempts: STILL IN SUPABASE
- ❌ Feedback: STILL IN SUPABASE
- ❌ Analytics: STILL IN SUPABASE (but also Firestore analyticsEvents)
- ❌ Achievements: UNCLEAR (both systems referenced)

Risk:
- Hybrid system creates sync problems
- No migration plan documented
- Test fixtures reference both databases
```

### Duplicate Code

```
Child authentication implemented in THREE places:
1. src/lib/auth/child-auth-firebase.server.ts (Firebase/Phase H4.A)
2. src/lib/auth/child-identity.server.ts (Supabase - appears unused)
3. src/lib/auth/child-session.server.ts (Integration layer)

Resolves to: child-auth-firebase.server.ts for current use
But: child-identity.server.ts still exists and compiles

Backend contracts defined TWO ways:
1. src/lib/backend/contracts.ts (interface)
2. src/lib/backend/firebase/repositories.ts (implementation)
3. src/lib/backend/identity.ts (appears alternate)

Progress storage:
- /journeyProgress collection (Firestore) - current
- progress table (Supabase) - legacy

Likelihood of confusion: HIGH
```

---

## 11. SUMMARY OF CRITICAL BREAKS

| Priority | Issue | Location | Impact |
|----------|-------|----------|--------|
| 🔴 P0 | No child credentials generated | createChild() in repositories.ts | Child cannot log in independently |
| 🔴 P0 | tati_id empty string on creation | FirebaseFamilyRepository.createChild() | Child identity broken |
| 🔴 P0 | /childCredentials collection never populated | No code path exists | verifyChildCredential() always fails |
| 🟠 P1 | No /users/{uid} document created for parent | Signup route → no user doc created | Firestore rules fail when checking userDoc().roles |
| 🟠 P1 | ensureFamily() called on EVERY page load | useChildProfiles() stale time 30s | Scalability risk; family creation not idempotent |
| 🟠 P1 | Member docs created by Admin SDK but rules deny non-admin create | Inconsistency between server & rules | Confusing for future developers |
| 🟠 P1 | Assessment attempts stored in Supabase, not Firebase | saveChildAssessment() uses supabase client | Hybrid system; migration incomplete |
| 🟠 P1 | Child context resolution unclear in parent-guided path | /learn/$childId routes use parent auth but progress is recorded for child | Possible authorization bypass |
| ⚠️ P2 | collectionGroup scan for familyId | getChildJourneyProgress() | Could leak family IDs across parents; no explicit per-child check |
| ⚠️ P2 | Server-side replay only for scenario, not assessment | Assessment score calculated once, not verified | Different integrity models |
| ⚠️ P2 | Competency scoring calculated but not persisted in assessment flow | saveChildAssessment() | Competencies appear via separate process |

---

## 12. CHAIN COMPLETION MATRIX

### Workflows Traced to Completion

| Workflow | Entry | Route | Auth | DB Op | Firestore Rules | Result | Status |
|----------|-------|-------|------|-------|-----------------|--------|--------|
| Parent signup | /signup | signup.tsx | Firebase Auth | None | N/A | Auth only, no user doc | ✓ Completes |
| Family creation | /parent load | ensureFamily() | Server checks | /families, /members create | allow create | Family created | ✓ Completes |
| Child creation | /onboarding | createChild() | Server checks | /children create | allow create | Profile created, tati_id="" | ⚠️ Incomplete |
| Child credential issue | N/A | N/A | N/A | N/A | N/A | Never issued | 🔴 Broken |
| Child TATI login | /child/login | childLogin() | Credential verify | /childCredentials lookup | DENY | Login fails | 🔴 Broken |
| Child session creation | childLogin() success | createChildSession() | Credential valid | /families/*/children/*/sessions create | DENY | Session created | ✓ Completes (if cred exists) |
| Parent-guided learning | /learn/$childId/* | lesson/scenario route | assertChildInFamily | recordProgress → journeyProgress create | DENY client; allow Admin SDK | Progress recorded | ✓ Completes |
| Child-independent learning | /child/* | child routes | Session cookie | recordProgress → journeyProgress create | DENY client; allow Admin SDK | Progress recorded | 🔴 Blocked (no login) |
| Assessment submit | /child/assessment | saveChildAssessment() | Session valid | assessment_attempts upsert (Supabase) | N/A (Supabase) | Attempt recorded | ✓ Completes (hybrid) |
| Scenario completion | /child/scenario | saveScenarioSession() | Session valid | journeyProgress create | DENY client; Admin SDK | State saved, replayed | ✓ Completes |
| Parent views progress | /parent/child/$childId | useChildProgress() | Server checks family | journeyProgress query | isActiveFamilyMember | Progress displayed | ✓ Completes |
| Facilitator views learner | /academy/learner | getAssignedChildren() | FacilitatorSession | facilitatorAssignments query | facilitatorUid match | Children listed | ✓ Completes (if assigned) |

---

## 13. MISSING IMPLEMENTATION PIECES

### Code That Should Exist But Doesn't

```
1. CREDENTIAL ISSUANCE

Expected function signature:
  async function issueChildCredentials(
    childProfileId: string,
    familyId: string,
  ): Promise<{ tatiId: string; pin: string }>

Current state:
  - generateTatiId() exists in child-auth-firebase.server.ts ✓
  - hashChildPin() exists ✓
  - saveChildPin() exists ✓
  - BUT: issueChildCredentials() NOT CALLED during createChild()

Should be called:
  Option A (Recommended): In createChild() → await issueChildCredentials()
  Option B: On-demand via parent action (not implemented)
  Option C: After onboarding completion (not implemented)

Result of not calling:
  - tati_id remains ""
  - No /childCredentials document
  - No PIN stored
  - Child cannot authenticate

2. CREDENTIAL DISPLAY/RETRIEVAL

Expected function signature:
  async function getChildCredentials(
    childId: string,
    parentUserId: string,
  ): Promise<{ tatiId: string; pin: string } | null>

Current state:
  - NOT IMPLEMENTED
  - Parent has no way to retrieve credentials after creation

Impact:
  - Parent creates child but cannot share login info
  - Even if credentials issued, no retrieval path

3. PARENT USER DOCUMENT CREATION

Expected when:
  Parent signs up → create /users/{uid} with role=""

Current behavior:
  /users/{uid} never created during signup

Should be called:
  In signup flow after Firebase Auth succeeds

Impact:
  - Firestore rules depend on /users/{uid} existing
  - userDoc() returns {} if missing
  - All role checks fail

4. COMPETENCY PERSISTENCE

Expected:
  Assessment scoring calculates competencies
  Competencies stored to /families/{familyId}/children/{childId}/competencies/{id}

Current:
  - saveChildAssessment() calculates but doesn't store
  - Competencies appear via separate process
  - No clear trigger point

5. FACILITATOR ASSIGNMENT FLOW

Expected:
  Admin assigns facilitator to child → /facilitatorAssignments created

Current:
  - createFacilitatorUser() creates user, not assignments
  - No code to create facilitatorAssignments documents
  - Manual process or missing entirely

Impact:
  - Facilitators cannot access assigned learners
  - Academy dashboard shows empty list
```

---

## 14. DETAILED PROCESS CHAINS WITH FULL CALL STACK

### Complete Stack Trace: Parent Creates Child

```
USER ACTION: Parent at /onboarding → clicks "Start My Journey 🚀"

CALL STACK:
  1. onClick → startJourney()
  2. createChild.mutateAsync(input)
  3. useCreateChildProfile() mutation
  4. src/lib/family.ts::useCreateChildProfile()
     - Validates input
     - Calls serverCreateChildProfile({ userId, input })
  5. src/lib/backend/firebase/family.functions.ts::createChildProfile()
     - Calls FirebaseFamilyRepository(db, userId).createChild(input)
  6. FirebaseFamilyRepository::createChild()
     - Calls this.ensureFamily() → returns familyId
     - Generates childId = crypto.randomUUID()
     - Sets tati_id = ""  ← MISSING CREDENTIAL GENERATION
     - db.collection("families").doc(familyId).collection("children").doc(childId).set(document)
     - Returns toChildProfile(saved)

RESULT: Child profile created with empty tati_id; NO credentials issued

MISSING: Somewhere in step 6, should call:
  const { tatiId, pin } = await issueChildCredentials(childId, familyId)
  // Update document with tatiId
  // Return { ...profile, tatiId, pin }
```

### Complete Stack Trace: Child Login With TATI ID + PIN

```
USER ACTION: Child at /child/login → enters "TATI-12345678" + "1234"

CALL STACK:
  1. onClick → childLogin({ data: { tatiId, pin } })
  2. src/lib/auth/child-auth.functions.ts::childLogin()
     - Calls verifyChildCredential(tatiId, pin)
  3. src/lib/auth/child-auth-firebase.server.ts::verifyChildCredential()
     - Normalizes tatiId → "TATI-12345678"
     - Queries db().collection("childCredentials").doc(normalizedTatiId).get()
     - Document NOT FOUND (never created) → returns null
  4. childLogin() catches null → throws "That TATI ID or PIN could not be verified"

RESULT: Login fails; error displayed; child cannot proceed

ROOT CAUSE: Step 3 finds no document because createChild() never called issueChildCredentials()
```

### Complete Stack Trace: Parent Views Child Progress

```
USER ACTION: Parent at /parent → clicks child card → navigates to /parent/child/$childId

CALL STACK:
  1. useChildProfile(childId)
     - Calls useChildProfiles() → getFamilyChildren(userId)
  2. src/lib/backend/firebase/family.functions.ts::getFamilyChildren()
     - Calls FirebaseFamilyRepository(db, userId).getFamilyChildren()
  3. FirebaseFamilyRepository::getFamilyChildren()
     - Calls ensureFamily() → returns familyId
     - Queries db.collection("families").doc(familyId).collection("children").orderBy("createdAt").get()
     - Maps to ChildProfile objects
     - Firestore RLS: isActiveFamilyMember(familyId) must be true
  4. Back in route: useChildProgress(childId)
     - Calls useQuery(progressQuery(childId))
     - QueryFn: getChildJourneyProgress(childId)
  5. src/lib/backend/firebase/family.functions.ts::getChildJourneyProgress()
     - Queries collectionGroup("children").where("id", "==", childId).limit(1).get()
     - Extracts familyId from result
     - Queries collection("families", familyId, "children", childId, "journeyProgress").get()
     - Firestore RLS: canAccessChild(familyId, childId) must be true
     - Returns array of progress events
  6. UI renders progress using data

RESULT: Parent sees child's journey progress

AUTHORIZATION CHAIN:
  - Firestore RLS on /families enforces isActiveFamilyMember
  - Firestore RLS on /children enforces canAccessChild
  - Server function assumes RLS enforced (no additional checks)
  
RISK:
  - collectionGroup scan could theoretically match a childId from different family
  - Firestore RLS is relied upon entirely
  - No explicit per-child authorization in server function
```

---

## 15. FIRESTORE SCHEMA OBSERVATIONS

### Collections Expected vs. Actual

```
EXPECTED (Based on Firestore Rules):
✓ /users/{uid}
  - uid, email, roles[], status, createdAt, createdBy
  - Current state: NOT CREATED during signup

✓ /families/{familyId}
  - id, name, createdBy, status, createdAt, updatedAt
  - /families/{familyId}/members/{uid}
    - uid, familyId, role, status, createdAt
  - /families/{familyId}/children/{childId}
    - id, familyId, createdBy, name, age, avatar, tier, tati_id, createdAt, updatedAt
    - /families/{familyId}/children/{childId}/journeyProgress/{itemKey}
      - id, familyId, childId, track_id, item_type, item_id, status, score, max_score, details, createdAt, updatedAt
    - /families/{familyId}/children/{childId}/assessmentAttempts/{attemptId}
      - [Schema unclear; read-only via facilitator]
    - /families/{familyId}/children/{childId}/scenarioSessions/{scenarioKey}
      - scenarioId, nodeId, phase, day, available, saved, decisions[], endingId, createdAt, updatedAt
    - /families/{familyId}/children/{childId}/competencies/{competencyId}
      - competencyId, score, level, [others]
    - /families/{familyId}/children/{childId}/achievements/{achievementId}
      - achievementId, celebrated, awarded_at, [others]
    - /families/{familyId}/children/{childId}/sessions/{sessionId}
      - id, childProfileId, tokenHash, createdAt, expiresAt, revokedAt

✓ /childCredentials/{tatiId}
  - tatiId, childId, familyId, pinHash, active, revokedAt, rotatedAt, createdAt
  - Current state: NEVER POPULATED

✓ /childSessions/{sessionId}
  - [Schema used but Firestore rules deny all; stored under families/*/children/*/sessions]

✓ /childAuthIdentities/{childProfileId}
  - [Appears in schema but unclear purpose; rules deny all]

✓ /facilitatorAssignments/{assignmentId}
  - facilitatorUid, familyId, childId, createdAt, assignedBy, schoolId
  - Current state: CREATE method not shown in codebase

✓ /academySessions/{sessionId}
  - facilitatorUid, status, startedAt, endedAt, activityId, learnerIds, createdAt
  - Facilitator session for activity tracking

✓ /academyCohorts/{cohortId}
  - facilitatorUid, status, name, description, learnerIds, schoolId, createdAt
  - Facilitator cohort (group of learners)

✓ /schools/{schoolId}
  - id, status, name, createdAt
  - /schools/{schoolId}/admins/{adminUid}

✓ /feedback/{feedbackId}
  - submittedByUid, message, category, submittedAt, [others]

✓ /analyticsEvents/{eventId}
  - eventName, actorUid, childId, familyId, entityId, eventKey, occurredAt

SUPABASE (NOT Firestore):
  - assessment_attempts table
  - assessment_responses table
  - feedback table (also in Firestore)
  - progress table (also as /journeyProgress)
  - achievements table (also in Firestore)

INCONSISTENCIES:
  - feedback in both Supabase and Firestore
  - progress in both Supabase and Firestore (/journeyProgress)
  - achievements in both systems
  - assessments only in Supabase
```

---

## CONCLUSION

**Status:** Multiple critical breaks prevent independent child access; parent-guided learning works; hybrid system creates data integrity risks.

**Critical Path Blocks:**
1. Child credentials NEVER generated → `/child/login` always fails
2. Parent user document NEVER created → Firestore RLS may fail
3. Assessment data stored in Supabase, not Firebase → Incomplete migration

**What Works:**
- Parent signup and family creation (on-demand)
- Parent creation of child profiles
- Parent-guided child learning (via `/learn/$childId` authenticated path)
- Progress recording for parent-guided paths
- Facilitator access to assigned learners (if assignments exist)
- Scenario replay verification

**What's Broken:**
- Child independent access via TATI ID + PIN
- All `/child/*` routes inaccessible without login
- Child credential storage and retrieval
- User document creation during signup

**Architectural Debt:**
- Hybrid Supabase + Firebase system
- Incomplete Phase H4.B migration
- Duplicate authentication implementations
- No clear migration plan

