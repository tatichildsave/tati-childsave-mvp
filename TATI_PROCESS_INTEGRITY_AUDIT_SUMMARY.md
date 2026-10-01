# TATI ChildSave — Process Integrity Audit Report
**Date:** 2026-10-01  
**Status:** Complete mapping of actual implementation  
**Purpose:** Identify broken handoffs and process gaps, NOT suggest solutions

---

## Executive Summary

The TATI ChildSave system has **two parallel and partially disconnected child access models**:

### Model A: Parent-Guided Learning ✅ WORKS
- Parent signs up → Firebase Auth
- Parent portal loads → family auto-created
- Parent adds child → child profile created in Firebase
- Parent guides child through `/learn/$childId` routes
- Progress recorded to Firestore via server
- **Status:** Functional end-to-end

### Model B: Child-Independent Learning 🔴 BROKEN
- Child uses TATI ID + PIN to login
- Child accesses `/child/*` routes independently
- Progress recorded while parent offline
- **Status:** Completely non-functional (no credentials ever generated)

### Critical Finding
**Child profiles are created with empty `tati_id=""` and no credentials are ever issued.** The entire child-independent authentication path is implemented in code but has no runtime activation—it silently fails at every attempt to login.

---

## Current Architecture Overview

```
                    Parent Firebase Auth
                            |
                            v
                    Parent Portal (/parent)
                            |
                    +-------+--------+
                    |                |
                    v                v
            Family Document    Family Membership
         (families/{fId})   (users/{uid}/familyMemberships)
                    |                
                    v
            Children Collection
         (families/{fId}/children/{cId})
                    |
        +-----------+-----------+----------+
        |           |           |          |
        v           v           v          v
      profile   credentials progress  achievements
      [tati_id]  [MISSING]  [exists]   [exists]
                          
                    Parent-Guided Learning
                       /learn/$childId
                      (Parent Auth Required)
                            |
                            v
                    Journey Progress
                   (Server-side writes)
                    (Firestore RLS enforced)
                    
                    
                    Child-Independent Learning
                        /child/login
                      (Child TATI ID + PIN)
                            |
                            v
                    Child Credentials [NEVER CREATED]
                    Child Session [NEVER STARTS]
                            |
                            x BROKEN
```

---

## Critical Breaks (P0 — Blocks Pilot)

### 1. Child Credentials Never Generated
**Chain:** Parent creates child → `createChildProfile()` → child doc set with `tati_id=""`

```
EXPECTED:
  1. createChildProfile() called
  2. Generate unique TATI ID (e.g., "TATI-A7B2C9D1")
  3. Generate random 4-6 digit PIN
  4. Hash PIN with scrypt
  5. Create /childCredentials/{tatiId} document
  6. Save credential to Firestore with PIN hash
  7. Display TATI ID + PIN to parent
  8. Parent shares with child
  9. Child enters /child/login
  10. System verifies against /childCredentials

ACTUAL:
  1. createChildProfile() called
  2. Child doc created with tati_id="" (empty)
  3. NO credentials generated
  4. NO /childCredentials document created
  5. Parent sees nothing to share
  6. Child cannot login
  7. /child/* routes inaccessible

IMPACT:
  🔴 COMPLETE: Child-independent learning path is non-functional
  🔴 COMPLETE: No way for child to authenticate without parent browser
  🔴 PILOT BLOCKER: Pilot requires child independence
```

**Missing Code Location:** `src/lib/backend/firebase/repositories.ts::createChild()`  
**Should call:** `generateChildCredential()` after creating child profile (code exists but not invoked)

---

### 2. Parent User Document Never Created
**Chain:** Parent signs up → Firebase Auth created → NO Firestore `/users/{uid}` doc

```
EXPECTED:
  1. Parent signs up via Firebase Auth
  2. Server creates /users/{uid} document with:
     - uid: auth.uid
     - email: auth.email
     - displayName: auth.displayName
     - status: "pending" or "active"
     - roles: [] (empty, to be bootstrapped by admin)
  3. Family creation adds role "parent" to roles array
  4. Firestore rules check userDoc().roles for authorization

ACTUAL:
  1. Parent signs up via Firebase Auth
  2. NO Firestore /users/{uid} document created
  3. Firestore rules call userDoc() → returns empty {}
  4. hasRole('parent') always false
  5. Authorization checks fail silently
  6. BUT: ensureFamily() uses Admin SDK (bypasses RLS)
  7. Family creation succeeds despite missing user doc

CONSEQUENCE:
  ⚠ RISK: Parent cannot be assigned facilitator role
  ⚠ RISK: Parent cannot be admin
  ⚠ RISK: Authorization system incomplete
  ⚠ STATUS: Parent-guided learning works despite this (Admin SDK bypass)

FIRESTORE RULE FAILURE:
  Function hasRole(role) = role in userDoc().roles
  If userDoc() is {}, then hasRole() is always false
  
  - Parent cannot read /users/{uid} (rule checks auth.uid == uid, but userDoc empty)
  - Parent cannot update own profile
  - Parent role assignment blocked by missing user doc
```

**Missing Code Location:** `src/lib/backend/firebase/repositories.ts`  
**Should call:** Create user doc during signup or after Firebase Auth  
**Workaround:** Admin SDK bypasses rules, so parent-guided path works anyway

---

### 3. Assessment Attempts Hybrid (Firestore + Supabase)
**Chain:** Child completes assessment → `saveChildAssessment()` → stored in Supabase, NOT Firestore

```
EXPECTED (Full Firebase Migration):
  1. Assessment attempt submitted
  2. Server calculates score
  3. CREATE: /families/{fId}/children/{cId}/assessmentAttempts/{attemptId}
  4. Fields: childId, assessmentId, score, maxScore, responses[], timestamp
  5. Competencies updated in /competencies collection
  6. Parent sees assessment results via Firestore query

ACTUAL:
  1. Assessment attempt submitted
  2. Server calculates score
  3. CREATE: Supabase table "assessment_attempts"
  4. CREATE: Supabase table "assessment_responses"
  5. Fields stored in Supabase (NOT Firestore)
  6. Competencies may update separately (unclear)
  7. Parent sees assessment results (but source unclear—Firestore or Supabase?)

IMPACT:
  🟠 HYBRID SYSTEM: Child data split between Firebase and Supabase
  🟠 SYNC RISK: No transactional guarantee between systems
  🟠 DEBT: H4.B claims "complete Firebase migration" but false
  ⚠ UNCLEAR: Who reads this data? Parent query path unclear
  ⚠ DEPLOYMENT: Supabase credentials must be available (single point of failure)
```

**Affected Code:** `src/lib/auth/child-learning.functions.ts::saveChildAssessment()`  
**References:** Supabase from `src/integrations/supabase/client.ts`  
**Migration Status:** NOT COMPLETE despite H4.B claim

---

## Major Issues (P1 — Serious Workflow Problems)

### 4. ensureFamily() Called on Every Page Load
**Location:** `src/lib/family.ts::useChildProfiles()` → `src/lib/backend/firebase/family.functions.ts::getFamilyChildren()`

```
CURRENT BEHAVIOR:
  1. Parent loads /parent
  2. useChildProfiles() hook executes
  3. React Query calls progressQuery() with staleTime=30_000ms
  4. Server function getFamilyChildren() runs
  5. FirebaseFamilyRepository.ensureFamily() runs
  6. Queries /users/{uid}/familyMemberships collection
  7. If NO active membership: CREATE family + membership
  8. If active membership exists: return familyId

SCALABILITY RISK:
  ⚠ ensureFamily() is idempotent but not free
  ⚠ Queries /users/{uid}/familyMemberships on EVERY load
  ⚠ Creates documents if missing (fine for single family, bad if called frequently)
  ⚠ Reads + writes happen on every page load
  ⚠ Not caching-friendly (stale time won't prevent query if user navigates away/back)

PREFERRED LIFECYCLE:
  - ensureFamily() during signup/onboarding (one-time)
  - Subsequent loads retrieve existing family only
  - Page rendering should not create data

CURRENT STATUS:
  ✓ Works (idempotent, no duplicates)
  ⚠ Not optimal (unnecessary writes on every load)
  ⚠ Not what designer probably intended
```

---

### 5. Child Context Resolution Ambiguous in Parent-Guided Routes
**Location:** `src/routes/_authenticated/learn.$childId.*.tsx` + `src/lib/auth/child-learning.functions.ts`

```
PARADOX:
  1. Parent navigates to /learn/$childId/lesson/$lessonId
  2. Parent is logged in as PARENT (Firebase auth)
  3. Route calls recordProgress()
  4. recordProgress() calls getCurrentChildContext()
  5. getCurrentChildContext() calls getAuthenticatedChild()
  6. getAuthenticatedChild() looks for "tati_child_session" cookie
  7. Parent is NOT a child; cookie doesn't exist
  8. BUT: Progress recording succeeds anyway

ACTUAL IMPLEMENTATION:
  - recordProgress() tries getAuthenticatedChild()
  - Falls through to alternate context resolution (unclear)
  - May extract childId from URL params
  - Server function receives { childId, familyId } but source unclear
  - Parent session verified but per-child authorization may be missing

RISK:
  ⚠ AMBIGUOUS: Unclear exactly how childId is established
  ⚠ POSSIBLE: Parent could record progress for arbitrary child
  ⚠ NO EXPLICIT: Per-route authorization check visible in code
  ⚠ RELIANCE: Depends on Firestore RLS to deny unauthorized writes
  ⚠ SERVER-ONLY: Admin SDK bypasses RLS, so RLS check doesn't matter

EXPECTED:
  - Parent auth verified
  - Parent session loaded
  - Child ID extracted from params
  - Verify parent owns child (per-route check or RLS)
  - Proceed with progress recording

UNCLEAR:
  - Where child ownership is actually verified
  - Why getAuthenticatedChild() doesn't fail if cookie missing
  - Whether parent can access arbitrary childId via URL manipulation
```

---

### 6. Firestore Child/Adult Membership vs. User Document Gap
**Location:** Firestore rules + `src/lib/backend/firebase/repositories.ts::ensureFamily()`

```
INCONSISTENCY:
  Firestore rules check: /families/{fId}/members/{uid} for isFamilyAdult()
  But called: isActiveFamilyMember() which checks /families/{fId}/members/{uid}
  And queries: /users/{uid}/familyMemberships/{fId}
  
  Two different structures!
  
  A) Firestore rules expect: /families/{fId}/members/{uid}
  B) Code creates: /users/{uid}/familyMemberships/{fId}
  
  memberPath(familyId) = /families/{familyId}/members/{auth.uid}
  BUT ensureFamily() creates: /users/{userId}/familyMemberships/{familyId}
  
CONSEQUENCE:
  ⚠ RLS checks path A
  ⚠ Code writes path B
  ⚠ isActiveFamilyMember() looks for A; code creates B
  ⚠ RLS authorization fails unless path A exists
  ⚠ BUT: Admin SDK bypasses RLS, so writes succeed anyway

CURRENT STATUS:
  ✓ Works (Admin SDK bypasses RLS)
  🟠 Fragile (RLS checks != actual data structure)
  🟠 Debt (Should use consistent paths)
```

---

## Identity Model Conflicts (P1)

### The Two Models Existing Simultaneously

**Model A: Parent-Guided (Currently Working)**
```
Parent Firebase Auth ← Parent session in browser
    ↓
Family { familyId }
    ↓
Child { childId }
    ↓
Authorization: Parent auth → family → child
    ↓
Progress recording: Parent session authorizes write
    ↓
Status: ✅ WORKS
```

**Model B: Child-Independent (Currently Broken)**
```
Child TATI ID + PIN ← Child-provided credentials
    ↓
Look up /childCredentials/{tatiId}
    ↓
Verify PIN against pinHash
    ↓
Extract childId + familyId
    ↓
Create ChildSession { sessionId, tokenHash, expiresAt }
    ↓
Authorization: Child session (cookie) authorizes subsequent requests
    ↓
Progress recording: Child session authorizes write
    ↓
Status: 🔴 BROKEN (no credentials ever created)
```

### The Intended Pilot Model
Per architecture documentation, the pilot should use:
- **Parent:** Firebase Auth
- **Child:** TATI ID + PIN (Model B)
- **Facilitator:** Firebase Auth + role/school authorization

### What Actually Happens
- **Parent:** Firebase Auth + parent-guided child (Model A) ✅
- **Child:** No independent access possible ❌
- **Facilitator:** Firebase Auth + school/class queries ✅ (if assignments exist)

### Result
Model A and Model B code coexist but Model B never activates. Parent can use child profile only through parent account. Pilot requirement for child independence cannot be met without generating credentials (Model B activation).

---

## Process Map with All Handoffs

### Workflow 1: Parent Signup → Family Creation → Parent Portal

```
STEP 1: Parent Signup
  Route: src/routes/(public)/signup.tsx
  User Action: Fill email, password, full name
  Auth Check: None (public route)
  Client Function: Firebase createUserWithEmailAndPassword()
  DB Operation: Firebase Auth creates user
  Result: Firebase Auth user created; NO Firestore doc
  
STEP 2: Post-Signup Redirect (useEffect)
  Auth Listener: onAuthStateChanged() detects new user
  Navigation: Redirect to /parent
  Firestore Operation: None yet
  
STEP 3: Parent Portal Loads
  Route: src/routes/parent/index.tsx
  Auth Check: _authenticated layout verifies auth.currentUser
  Query Hook: useChildProfiles()
  Server Function: getFamilyChildren(userId)
  
STEP 4: Family Initialization (Hidden in Page Load)
  Server Fn: FirebaseFamilyRepository.ensureFamily()
  Query: /users/{userId}/familyMemberships
  Decision: If empty → CREATE family
  DB Write 1: families/{familyId} document
    Fields: name="My Family", createdBy=userId, status="active"
  DB Write 2: users/{userId}/familyMemberships/{familyId}
    Fields: familyId, userId, role="parent", status="active"
  RLS Check: families allow create if createdBy == auth.uid ✓
  Result: Family + membership created
  
STEP 5: Query Children
  Server Fn: Still in getFamilyChildren()
  Query: families/{familyId}/children (ordered by createdAt)
  RLS Check: /families/{familyId} read if isActiveFamilyMember ✓
  Result: Empty array (first time)
  
STEP 6: UI Render
  Parent sees: "No learner yet" + "Add my child" button
  Navigation ready: /onboarding
  
POTENTIAL BREAKS:
  ⚠ Step 1→2: If browser closes, Firebase Auth persists but family not created yet
  ⚠ Step 4: ensureFamily() creates family on first load; idempotent but not optimal
  ⚠ Step 4: No /users/{uid} document created; RLS incomplete
  ⚠ Step 5: If memberships check fails, no family created; parent stuck
  ✓ Overall: Works because Admin SDK bypasses RLS issues
```

### Workflow 2: Parent Creates Child → Credentials Broken

```
STEP 1: Parent Initiates Onboarding
  Route: src/routes/onboarding.tsx
  Auth Check: _authenticated layout verifies auth.currentUser
  User Input: Name (2-30 chars), Age (8-12), Avatar (6 options)
  Validation: All client-side
  
STEP 2: Submit Child Profile
  User Action: Click "Start my journey"
  Client Fn: startJourney() calls createChild.mutateAsync()
  Server Function: createChildProfile({ userId, input })
  
STEP 3: Child Document Creation
  Server Fn: FirebaseFamilyRepository.createChild()
  Call: ensureFamily() (same as Workflow 1)
  Generate: childId = crypto.randomUUID()
  DB Write: families/{familyId}/children/{childId}
    Fields:
      - id, familyId, created_by, name, age, avatar
      - tier="junior", curriculum_level (calculated)
      - onboarding_step=0, onboarding_completed=true
      - ❌ tati_id="" (EMPTY!)
      - createdAt, updatedAt (serverTimestamp)
  RLS Check: create if isFamilyAdult ✓
  
STEP 4: Credential Generation (MISSING)
  Expected: Call generateChildCredential(childId)
  Expected: Create /childCredentials/{tatiId}
  Expected: Store pinHash, active flag, etc.
  Expected: Return credentials to parent
  Actual: DOES NOT HAPPEN
  Code exists: src/lib/auth/child-auth-firebase.server.ts
  Function exists: generateTatiId(), hashChildPin(), etc.
  Invocation: MISSING from createChild()
  
STEP 5: Return to Client
  Server returns: ChildProfile { id, name, age, avatar, tati_id="" }
  Client receives: Profile with empty tati_id
  
STEP 6: UI Render
  Parent sees: Child created! Success!
  Parent sees: NO TATI ID (tati_id is empty)
  Parent can share: Nothing (no credentials)
  
STEP 7: Redirect
  Navigation: /learn/{childId}/assessment/save-pre
  Child pre-assessment starts (parent-guided only)
  
POTENTIAL BREAKS:
  🔴 CRITICAL: tati_id="" prevents child independent login
  🔴 CRITICAL: No credentials generated
  🔴 CRITICAL: Parent has no way to get credentials
  ❌ Child cannot use /child/login route
  ❌ Child cannot authenticate via TATI ID + PIN
  ✓ Parent-guided learning still works
```

### Workflow 3: Child Attempts Independent Login (BROKEN)

```
STEP 1: Child Navigates to Login
  Route: src/routes/child/login.tsx
  User: Child (no auth yet)
  UI: Form for TATI ID + PIN
  
STEP 2: Child Enters Credentials
  Input: TATI ID (e.g., "TATI-A7B2C9D1")
  Input: PIN (e.g., "1234")
  
STEP 3: Submit Login
  Client Fn: childLogin({ tatiId, pin })
  Server Function: src/lib/auth/child-auth.functions.ts::childLogin()
  
STEP 4: Verify Credentials
  Server Fn: verifyChildCredential(tatiId, pin)
  Query: /childCredentials collection
  Lookup: WHERE tatiId == normalized("TATI-A7B2C9D1")
  Expected: Find document with pinHash, active=true, revokedAt=null
  Actual: Document does not exist
  
STEP 5: Credential Verification
  Server Fn: Compares submitted pin with stored pinHash
  Compare: scrypt.compare(pin, pinHash)
  Result: Cannot compare because document doesn't exist
  Return: null (no credential found)
  
STEP 6: Error Response
  Server returns: "That TATI ID or PIN could not be verified"
  Client displays: Error message
  Child remains: Unauthenticated
  
STEP 7: Child Session Not Created
  Expected: Create /families/{familyId}/children/{childId}/sessions/{sessionId}
  Actual: Not reached (verification failed)
  Expected: Return session token as HTTP-only cookie
  Actual: No cookie set
  
STEP 8: Next Attempt
  Child tries again: Same error
  Child route access: /child/* routes all redirect to /child/login
  Parent Browser: Only way child can access learning
  
POTENTIAL BREAKS:
  🔴 CRITICAL: verifyChildCredential() always returns null
  🔴 CRITICAL: Login always fails
  🔴 CRITICAL: No session created
  🔴 CRITICAL: Child cannot access independent learning
  
WHY BROKEN:
  Parent creates child with tati_id=""
  No /childCredentials document ever created
  verifyChildCredential() looks for doc that doesn't exist
  Lookup fails → authentication fails
  
REQUIRED FIX:
  1. During createChild() call generateChildCredential()
  2. Generate TATI ID (unique, e.g., "TATI-" + 8 alphanumeric)
  3. Generate PIN (4-6 random digits)
  4. Hash PIN with scrypt
  5. Create /childCredentials/{tatiId} document
  6. Return tatiId + PIN to parent for sharing
  7. Then verifyChildCredential() lookup will succeed
```

### Workflow 4: Parent Views Child Progress (WORKS)

```
STEP 1: Parent Navigates to Child Card
  Route: /parent/child/$childId
  Auth: Parent Firebase user
  
STEP 2: Authorize Access
  beforeLoad: None shown explicitly
  RLS Check: Read /families (must be isFamilyAdult)
  
STEP 3: Load Child Profile
  Query: families/{familyId}/children/{childId}
  RLS Check: canAccessChild() = isFamilyAdult || isAssignedFacilitator || isAdmin
  Result: Parent is isFamilyAdult ✓
  
STEP 4: Load Progress
  Server Fn: getChildJourneyProgress()
  Query 1: collectionGroup("children").where("id", "==", childId)
  Query 2: families/{familyId}/children/{childId}/journeyProgress
  RLS Check: journeyProgress read if canAccessChild() ✓
  
STEP 5: Display Progress
  Render: Progress ring, completed items, badges, competencies
  
POTENTIAL BREAKS:
  ⚠ AUTHORIZATION: Relies entirely on Firestore RLS
  ⚠ NO SERVER-SIDE: Per-route authorization not explicit
  ⚠ RLS DESIGN: Parent could theoretically query any familyId via collectionGroup
     (RLS must deny if parent not member)
  ✓ RESULT: Works if RLS correct (appears to be)
```

---

## Broken Handoffs Summary Table

| Process | Expected | Actual | Status | Root Cause |
|---------|----------|--------|--------|-----------|
| **Signup** | Firebase Auth created | ✓ Firebase Auth created | ✅ WORKS | N/A |
| **User Doc** | /users/{uid} created during signup | Never created | 🔴 BROKEN | Missing initialization code |
| **Family Init** | Created during signup | Created on first /parent load | 🟠 WORKS (suboptimal) | ensureFamily() design |
| **Child Create** | Child doc + credentials | Child doc only | 🔴 BROKEN | generateChildCredential() not called |
| **TATI ID** | Generated + displayed | tati_id="" (empty) | 🔴 BROKEN | Credential generation skipped |
| **Child Credentials** | /childCredentials doc created | Never created | 🔴 BROKEN | generateChildCredential() not called |
| **Child Login** | Verify against /childCredentials | Doc not found → fail | 🔴 BROKEN | No credentials exist |
| **Child Session** | Create ChildSession cookie | Never reached (login fails) | 🔴 BROKEN | Login fails first |
| **Parent-Guided Learning** | Progress recorded to Firestore | ✓ Progress recorded | ✅ WORKS | N/A |
| **Assessment Storage** | Store to Firestore | Stored to Supabase | 🟠 HYBRID | Migration incomplete |
| **Parent Sees Progress** | Query Firestore | ✓ Query works | ✅ WORKS | N/A |
| **Facilitator Access** | Query assigned learners | ✓ Query works | ✅ WORKS | N/A (if assignments exist) |

---

## Security & Authorization Findings

### What Works ✅
- **Firestore RLS:** Correctly restricts family/child access to authorized users
- **Scenario Integrity:** G5.1 server-side replay prevents tampering
- **Assessment Scoring:** Server-side calculation prevents client score inflation
- **Facilitator Scoping:** Double-checked authorization (RLS + server code)
- **Admin SDK:** Properly used for server-only writes (bypasses RLS intentionally)

### What's Incomplete ⚠️
- **Parent User Doc:** Missing in Firestore; userDoc() RLS checks fail silently
- **Child Membership:** Two different path patterns (RLS vs. code)
- **Per-Route Authorization:** Child ownership not explicitly verified in /learn routes
- **Credential Isolation:** /childCredentials and /childSessions server-only (correct)

### What's At Risk 🟠
- **Parent Can Access Any Child?** Unclear if parent auth is verified before recording progress
- **Collectiongroup Scan:** getChildJourneyProgress() scans all children by ID; RLS must deny
- **Hybrid Storage:** Assessment data split between Firebase and Supabase (no transaction)

---

## Data Integrity Findings

### Idempotency Protection
| Operation | Idempotent? | Notes |
|-----------|------------|-------|
| Family creation | ✓ YES | ensureFamily() checks membership; won't create duplicate |
| Child creation | ✓ YES | childId = UUID; impossible to create duplicate |
| Progress recording | ✓ YES | journeyProgress key = itemType:itemId; upsert overwrites |
| Assessment attempt | ✓ YES | Supabase upsert on (childId, assessmentId) |
| Scenario session | ✓ YES | scenarioSessions keyed by scenarioId; upsert overwrites |

### Transaction Safety
| Operation | Transactional? | Risk |
|-----------|---|-------|
| Family + Membership | ❌ NO | Two separate writes; orphan if second fails |
| Child + Credentials | N/A | Credentials never created (broken) |
| Assessment + Competency | ❌ UNCLEAR | Assessment in Supabase; competency update unclear |
| Scenario + Progress | ✓ YES | Both to Firestore; Admin SDK should batch |

### Retry Safety
| Scenario | Outcome |
|----------|---------|
| Signup retried | Firebase Auth idempotent; no duplicate user |
| Family creation retried | ensureFamily() idempotent; same family returned |
| Child creation retried | UUID prevents duplicate; might create two orphans if first failed mid-write |
| Progress submission retried | Upsert overwrites; idempotent |
| Assessment retried | Upsert overwrites; no duplicate attempts |

---

## UX Process Findings

### Parent Onboarding Flow
```
Signup → (immediate) Firebase Auth
  ↓
Redirect /parent → (hidden) family auto-created
  ↓
Parent portal displays → "No learner yet"
  ↓
Parent confident family initialized ✓
```
**Status:** Seamless but family creation hidden in page load

### Child Addition Flow
```
Parent clicks "Add my child" → Onboarding wizard
  ↓
7-step form → Click "Start my journey"
  ↓
Child profile created
  ↓
NO CREDENTIALS SHOWN ❌
  ↓
Parent has nothing to give child
  ↓
Parent-guided learning starts (child present)
  ↓
NO WAY for child to continue alone ❌
```
**Status:** Broken (credentials missing)

### Child Learning Alone
```
Parent offline → Child has no way to login ❌
  ↓
Child TATI ID + PIN flow completely non-functional
  ↓
Pilot assumes child can learn independently ❌
```
**Status:** Impossible (credentials were never created)

---

## Stale Code & Migration Debt

### Supabase References (Should Be Removed or Documented)
```
STILL USING SUPABASE:
- Assessment attempts: src/lib/auth/child-learning.functions.ts
- Assessment responses: src/lib/auth/child-learning.functions.ts
- Analytics events: src/lib/analytics.ts
- Feedback storage: src/lib/feedback.ts
- Gamification achievements: src/lib/gamification/achievements.ts (partial)
- Progress tracking: src/lib/progress/service.ts (partial)

CLAIM: "H4.B Firebase Migration Complete"
REALITY: Assessment data still in Supabase; Firebase only partial
```

### Code Exists But Never Called
```
generateChildCredential() - defined but never invoked
generateTatiId() - defined but never invoked
hashChildPin() - defined but never invoked
saveChildPin() - defined but never invoked
verifyChildCredential() - defined, called, but always fails (no data)
getAuthenticatedChild() - defined, called, but path unclear
```

### Potential Duplicates
```
Family creation logic: ensureFamily() (main path)
  - Also: No alternate path shown; single implementation
  
Child repository: FirebaseFamilyRepository
  - Also: FirebaseJourneyProgressRepository (separate concern; fine)
  
Server functions: family.functions.ts + child-auth.functions.ts
  - Also: child-learning.functions.ts (overlaps? unclear)
```

---

## Priority Classification

### P0 — Blocks Pilot (Cannot Proceed)
1. ❌ **Child credentials never generated** — No way for child to login independently
2. ❌ **Child TATI ID + PIN path broken** — verifyChildCredential() always fails
3. ❌ **Assessment hybrid storage** — Data split between Firebase + Supabase

### P1 — Serious Workflow Problem (Needs Fixing)
4. ⚠️ **Parent user doc missing** — Firestore RLS incomplete; relies on Admin SDK bypass
5. ⚠️ **ensureFamily() on every load** — Not optimal; creates documents during page render
6. ⚠️ **Child context resolution ambiguous** — Per-route authorization unclear
7. ⚠️ **Child/adult membership path inconsistency** — RLS checks path A; code writes path B

### P2 — Important But Not Blocking
8. 📝 **Parent feedback/metrics incomplete** — Routes exist but unclear if connected to data
9. 📝 **Multiple family behavior untested** — Assumes one family per parent
10. 📝 **Facilitator assignment creation** — Assignment mechanism unclear
11. 📝 **Stale Supabase code** — Should document or remove

---

## Recommendations (For Next Phase, NOT This Audit)

**DO NOT IMPLEMENT YET.** This audit is diagnostic only.

Before any fixes, understand:
1. Is Model B (child-independent) actually required for pilot?
2. Should parent-guided Model A be sufficient?
3. What's the intended child authentication model?
4. Should credentials be generated? When? How shown to parent?
5. Should Supabase assessment data migrate to Firestore?
6. Should parent user docs be created at signup or lazily?

Once clarified, these items become actionable:
- Generate child credentials during createChild()
- Create /users/{uid} doc at signup
- Migrate assessment storage to Firestore
- Fix family/member path consistency
- Document child context resolution per route
- Remove unused Supabase code or commit to hybrid

---

## Conclusion

**TATI ChildSave has a complete parent-guided learning pipeline that works end-to-end.**

**However, the child-independent authentication path (Model B) is completely non-functional because child credentials are never generated.**

The code for credential generation exists but is never invoked during child creation. When parents create children, the system records `tati_id=""` and never writes to `/childCredentials`. When children attempt to login via TATI ID + PIN, the system finds no credentials to verify and authentication fails.

This is the critical blocker for pilot independence. All other processes work within the parent-guided constraint but cannot be used without this fix.

**The rest of the system (parent auth, family lifecycle, progress recording, facilitator access) is reasonably solid, though it relies heavily on Firestore RLS correctness and Admin SDK security.**
