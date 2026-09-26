# PHASE G3 AUTHENTICATION MAP DESIGN
## Firebase Child Identity Integration with Existing TATI Session System

**Design Date**: January 24, 2025  
**Status**: Architecture Design (No Code Changes)  
**Scope**: Complete G3 authentication bridge design  
**Based On**: PHASE_G3_AUTHENTICATION_AUDIT.md

---

# EXECUTIVE SUMMARY

Phase G3 integrates Firebase child identity (from G2) with the existing TATI ID + PIN authentication system. The design preserves the proven security model while adding Firebase as a complementary identity layer.

**Core Principle**: 
```
Firebase = Identity Layer (Who the child is)
Supabase = Application Session (What the child can do)
```

**Target Architecture**:
```
TATI ID + PIN
   ↓
Supabase verification (existing)
   ↓
ChildSession creation (existing)
   ↓
Firebase identity resolved (NEW)
   ↓
AuthenticatedChildContext (NEW - unified)
   ↓
Learner routes + domain data (unchanged)
```

---

# 1. CURRENT AUTHENTICATION FLOW (DETAILED)

## 1.1 Complete Current Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│ BROWSER LAYER                                                  │
│                                                                │
│  Child navigates to /child/login                              │
│                                                                │
│  ┌─────────────────────────────────────────┐                │
│  │ Form (SSR: false)                       │                │
│  │ Input 1: TATI ID (TATI-XXXXXXXX)       │                │
│  │ Input 2: PIN (4-6 digits)              │                │
│  │ Button: "Continue"                     │                │
│  └──────────────┬──────────────────────────┘                │
│                 │                                             │
│                 ▼                                             │
│             POST /api/childLogin                             │
│             { tatiId: "TATI-...", pin: "1234" }             │
└────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│ SERVER LAYER                                                   │
│                                                                │
│  childLogin() createServerFn                                  │
│                                                                │
│  ┌─────────────────────────────────────────┐                │
│  │ 1. INPUT VALIDATION                     │                │
│  │    - Format check: TATI-XXXXXXXX       │                │
│  │    - PIN length: 4-6 digits            │                │
│  │    - Type validation via Zod           │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  ┌─────────────────────────────────────────┐                │
│  │ 2. SUPABASE LOOKUP (child_profiles)     │                │
│  │    Query: tati_id == normalized input  │                │
│  │    Result: child_profile_id, family_id │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  ┌─────────────────────────────────────────┐                │
│  │ 3. CREDENTIAL VERIFICATION              │                │
│  │    Lookup: child_credentials by id      │                │
│  │    Compare: PIN vs scrypt hash          │                │
│  │    Constant-time: timingSafeEqual()     │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  ┌─────────────────────────────────────────┐                │
│  │ 4. SESSION CREATION                     │                │
│  │    Generate: 256-bit random token       │                │
│  │    Hash: SHA256(token)                  │                │
│  │    Store in child_sessions table        │                │
│  │    TTL: 30 minutes                      │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  ┌─────────────────────────────────────────┐                │
│  │ 5. PROFILE LOADING                      │                │
│  │    Query: child_profiles by id          │                │
│  │    Data: name, age, avatar, tier, etc.  │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  ┌─────────────────────────────────────────┐                │
│  │ 6. COOKIE SETTING (BROWSER RESPONSE)    │                │
│  │    Name: tati_child_session             │                │
│  │    Value: unencrypted token             │                │
│  │    Flags: HttpOnly, Secure (prod),      │                │
│  │           SameSite=Lax                  │                │
│  │    MaxAge: 1800 seconds (30 min)        │                │
│  │    Path: /                              │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  RETURN { profile, sessionId, expiresAt }                    │
└────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│ BROWSER - NOW AUTHENTICATED                                    │
│                                                                │
│  Automatic redirect: /child/login → /child/home              │
│                                                                │
│  Cookie state: tati_child_session = "<256-bit token>"        │
│  (Sent automatically with every same-site request)            │
│                                                                │
│  Navigation to /child/scenario/school-reopening              │
└────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│ SERVER LAYER - ROUTE PROTECTION                               │
│                                                                │
│  /child (beforeLoad guard)                                    │
│                                                                │
│  ┌─────────────────────────────────────────┐                │
│  │ 1. READ COOKIE                          │                │
│  │    getCookie("tati_child_session")      │                │
│  │    Result: token (or null)              │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  ┌─────────────────────────────────────────┐                │
│  │ 2. VALIDATE SESSION                     │                │
│  │    validateChildSession(token)          │                │
│  │    Query: child_sessions by token_hash  │                │
│  │    Check: revoked_at is null            │                │
│  │    Check: expires_at > now()            │                │
│  │    Result: ChildSession context         │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  ┌─────────────────────────────────────────┐                │
│  │ 3. LOAD PROFILE                         │                │
│  │    Query: child_profiles by id          │                │
│  │    Result: profile (for UI)             │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  RETURN { profile, sessionId, expiresAt }                    │
│  or throw redirect to /child/login                           │
└────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────────────┐
│ PROTECTED ROUTE RENDERING                                      │
│                                                                │
│  /child/scenario/school-reopening                             │
│                                                                │
│  ┌─────────────────────────────────────────┐                │
│  │ 1. AUTHORIZE: requireChildSession()     │                │
│  │    Check: kind == "child"               │                │
│  │    Check: not revoked                   │                │
│  │    Check: not expired                   │                │
│  │    Check: childId matches (if required) │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  ┌─────────────────────────────────────────┐                │
│  │ 2. LOAD LEARNING DATA                   │                │
│  │    getChildLearningData()               │                │
│  │    Tables: journey_progress,            │                │
│  │            competencies, achievements,  │                │
│  │            assessments, scenarios       │                │
│  └─────────────────────────────────────────┘                │
│                  │                                            │
│                  ▼                                            │
│  ┌─────────────────────────────────────────┐                │
│  │ 3. RENDER PAGE                          │                │
│  │    Pass profile + data to component     │                │
│  │    ScenarioPlayer renders               │                │
│  └─────────────────────────────────────────┘                │
└────────────────────────────────────────────────────────────────┘
```

## 1.2 Current Session State Structure

```typescript
// In browser cookie
Cookie: tati_child_session = "base64url(256-bit random)"

// In server memory (from beforeLoad guard)
{
  profile: {
    id: "uuid-child-profile-id",
    tati_id: "TATI-A1B2C3D4",
    name: "Akosua",
    age: 10,
    avatar: "avatar-2",
    tier: "junior",
    curriculum_level: "gh-junior-2"
  },
  sessionId: "uuid-session-id",
  expiresAt: "2025-01-24T14:30:00Z"
}

// In Supabase (stored)
child_sessions:
{
  id: "uuid-session-id",
  child_profile_id: "uuid-child-profile-id",
  token_hash: "sha256-hex-string",
  created_at: "2025-01-24T14:00:00Z",
  expires_at: "2025-01-24T14:30:00Z",
  revoked_at: null
}
```

## 1.3 Current Authorization Model

```
ChildSession Context
  ├── kind: "child"
  ├── childId: string (from child_profiles.id)
  ├── sessionId: string (from child_sessions.id)
  ├── expiresAt: string (ISO timestamp)
  ├── revokedAt: string | null
  ↓
Authorization Checks
  ├── requireChildSession(context) → ✅ or ❌
  ├── requireChildResource(context, resourceChildId) → ✅ or ❌
  ├── Expiration check: Date.parse(expiresAt) > Date.now()
  ├── Revocation check: revokedAt === null
  └── Cross-child access check: childId === resourceChildId
  ↓
Route Access
  ├── /child/home → allowed
  ├── /child/learn → allowed
  ├── /child/scenario/$scenarioId → allowed
  └── All other /child/* routes → allowed
```

---

# 2. FIREBASE G2 IDENTITY LAYER

## 2.1 Firebase Component Overview (From G2)

```
Firebase (Server-Only, .server.ts files)
│
├── Firebase Admin SDK (not in browser)
│   ├── adminAuth() → Firebase Auth credentials
│   └── adminFirestore() → Firestore credentials
│
├── Server Functions (from child-auth.server.ts)
│   ├── createChildFirebaseIdentity()
│   │   Input: parent context, childProfileId, familyId, childAge
│   │   Process: Create Firebase Auth user with UID: child_{childProfileId}
│   │   Output: firebaseUid (string)
│   │
│   ├── getChildFirebaseIdentity()
│   │   Input: parent context, childProfileId, familyId
│   │   Process: Lookup Firestore childAuthIdentities mapping
│   │   Output: firebaseUid | null
│   │
│   ├── verifyChildFirebaseToken()
│   │   Input: Firebase ID token (from browser)
│   │   Process: Verify + resolve to child context
│   │   Output: { firebaseUid, childProfileId, familyId, role: "child" }
│   │
│   └── resolveChildFromFirebaseUid()
│       Input: firebaseUid (string)
│       Process: Query Firestore, check status="active"
│       Output: ChildFirebaseContext | null
│
└── Firestore Collection: childAuthIdentities
    Document ID: childProfileId
    Fields:
      ├── childProfileId: string
      ├── firebaseUid: string (e.g., "child_<uuid>")
      ├── familyId: string (from families table)
      ├── status: "active" | "revoked"
      ├── createdAt: Timestamp
      └── updatedAt: Timestamp
```

## 2.2 Firebase G2 State at Start of G3

```
Scenario: Parent created Firebase identity for child during parent onboarding (G2)

Firestore: childAuthIdentities/{child-profile-uuid}
{
  childProfileId: "child-uuid-1",
  firebaseUid: "child_child-uuid-1",
  familyId: "family-uuid-a",
  status: "active",
  createdAt: Timestamp("2025-01-20T10:00:00Z"),
  updatedAt: Timestamp("2025-01-20T10:00:00Z")
}

Firebase Auth User:
{
  uid: "child_child-uuid-1",
  displayName: "Child child-uui"
}

OR

Scenario: No Firebase identity exists yet (child created before G2, parent hasn't created it)

Firestore: childAuthIdentities/{child-profile-uuid} → NOT FOUND

Firebase Auth User: NOT FOUND
```

## 2.3 Information Authority Matrix

```
Entity              Current Authority    G2 Created      G3 Purpose
─────────────────────────────────────────────────────────────────
childProfileId      Supabase (child_profiles.id)
                    ├── Source of truth for child existence
                    ├── Immutable
                    └── G3: Use as stable identifier

firebaseUid         Firestore (childAuthIdentities)
                    ├── Created by parent in G2
                    ├── Deterministic: child_{childProfileId}
                    └── G3: Use as Firebase identity

familyId            Supabase (child_profiles.family_id)
                    ├── Also in Firestore (childAuthIdentities.familyId)
                    ├── Must match in both systems
                    └── G3: Enforce consistency

Status              Firestore (childAuthIdentities.status)
                    ├── "active" = usable
                    ├── "revoked" = unusable
                    └── G3: Check before accepting Firebase auth

ChildSession        Supabase (child_sessions)
                    ├── Created by childLogin()
                    ├── HTTP-only cookie
                    ├── 30-min TTL
                    └── G3: PRIMARY application session (unchanged)

TATI ID             Supabase (child_profiles.tati_id)
                    ├── Unique, immutable
                    ├── Only used for login UI
                    └── G3: Login unchanged

PIN Credential      Supabase (child_credentials.pin_hash)
                    ├── scrypt hashed
                    ├── Used for authentication
                    └── G3: Authentication unchanged

Learning Progress   Supabase (journey_progress, etc.)
                    ├── Child-specific data
                    ├── Authorization via ChildSession.childId
                    └── G3: Authorization unchanged
```

---

# 3. PROPOSED G3 BRIDGE ARCHITECTURE

## 3.1 Target G3 Flow (Complete Sequence)

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: CHILD ENTERS TATI ID + PIN                            │
│ (No change from current)                                         │
└─────────────────────────────────────────────────────────────────┘
         Browser navigates to /child/login
         User sees form: "TATI ID" + "PIN"
         Posts to childLogin()

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: EXISTING SUPABASE AUTHENTICATION (unchanged)           │
│                                                                 │
│ childLogin() server function                                    │
│  ├─ Validate TATI ID format                                    │
│  ├─ Query child_profiles by tati_id                            │
│  ├─ Verify PIN hash (scrypt)                                   │
│  ├─ Create child_sessions record                               │
│  ├─ Set HTTP-only cookie (tati_child_session)                  │
│  └─ Return profile to browser                                  │
│                                                                 │
│ Result: ChildSession established (existing)                    │
└─────────────────────────────────────────────────────────────────┘
         Supabase child_sessions now has token_hash
         Browser now has tati_child_session cookie
         Child is authenticated (existing model)

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: NEW - RESOLVE FIREBASE IDENTITY (server-side)         │
│                                                                 │
│ Enhanced childLogin() AFTER session creation                    │
│  ├─ Get childProfileId from verified credentials               │
│  ├─ Get familyId from child_profiles                           │
│  │                                                              │
│  ├─ TRY: getChildFirebaseIdentity(childProfileId, familyId)    │
│  │   ├─ Lookup Firestore: childAuthIdentities/{childProfileId} │
│  │   ├─ Check: status === "active"                             │
│  │   ├─ Return: firebaseUid (e.g., "child_<uuid>")             │
│  │   │                                                           │
│  │   └─ If NOT found or revoked:                               │
│  │       ├─ No Firebase identity available                      │
│  │       ├─ Child continues with TATI auth only (graceful)     │
│  │       └─ Firebase layer skipped for this session             │
│  │                                                              │
│  └─ STORE Firebase mapping in ChildSession context (memory)    │
│     NOT in cookie, NOT in Supabase child_sessions              │
│     (Context passed through route loaders)                      │
│                                                                 │
│ Result: FirebaseIdentity resolved and cached in session        │
└─────────────────────────────────────────────────────────────────┘
         childProfileId ↔ firebaseUid mapping established
         No new database writes (read-only lookup)
         No browser exposure of Firebase UID

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: RETURN TO BROWSER                                      │
│                                                                 │
│ childLogin() returns same response as before:                   │
│  { profile, sessionId, expiresAt }                              │
│                                                                 │
│ Browser side: exactly the same                                  │
│  ├─ Cookie: tati_child_session = <token>                       │
│  ├─ Navigation: /child/login → /child/home                     │
│  └─ No JavaScript knows about Firebase                          │
│                                                                 │
│ Server side: enhanced context                                  │
│  ├─ Has ChildSession (existing)                                │
│  ├─ Has firebaseUid (new, if available)                        │
│  └─ Ready for learner routes                                   │
└─────────────────────────────────────────────────────────────────┘
         Child authenticated identically to before
         Firefox identity silently available on server

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: PROTECTED ROUTES (enhanced)                            │
│                                                                 │
│ /child/home beforeLoad guard                                   │
│  ├─ getChildSession() as before (unchanged)                    │
│  │   ├─ Read tati_child_session cookie                         │
│  │   ├─ Validate in child_sessions table                       │
│  │   ├─ Return ChildSession context                            │
│  │   └─ HTTP-only cookie handles re-auth                       │
│  │                                                              │
│  ├─ NEW (optional): Resolve Firebase UID on each route         │
│  │   ├─ Only if needed by route/operation                      │
│  │   ├─ Call getChildFirebaseIdentity() again                  │
│  │   ├─ Merge into AuthenticatedChildContext                   │
│  │   └─ Pass to route component                                │
│  │                                                              │
│  └─ Return unified context to route                            │
│                                                                 │
│ Result: AuthenticatedChildContext available to routes          │
└─────────────────────────────────────────────────────────────────┘
         Routes can use either Supabase or Firebase context
         Graceful degradation if Firebase unavailable
         Existing learner experience unaffected

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 6: LEARNER OPERATIONS (unchanged)                         │
│                                                                 │
│ /child/scenario/school-reopening                               │
│  ├─ requireChildSession(context) ✅ (existing)                 │
│  ├─ assertChildActivity(itemType, itemId) ✅ (existing)        │
│  ├─ getChildLearningData() ✅ (existing)                       │
│  ├─ loadChildScenario() ✅ (existing)                          │
│  ├─ saveChildScenario() ✅ (existing)                          │
│  └─ All operations work exactly as before                      │
│                                                                 │
│ Result: Learner experience unchanged                           │
└─────────────────────────────────────────────────────────────────┘
         Child's journey continues unchanged
         Firebase available for future phases (G4+)
         No breaking changes to existing UI/behavior
```

## 3.2 Key Design Decision: Server-Side Firebase Resolution

```
CHOSEN: Resolve Firebase UID on server, never expose to browser

Why?
├── 1. Firebase UID is sensitive (identity, not session credential)
├── 2. Browser cannot be trusted with identity authority
├── 3. TATI ID + PIN is the proven login mechanism
├── 4. HTTP-only cookie is proven session mechanism
├── 5. Firebase layer is transitional (might be disabled)
└── 6. Child should not understand technical identities

Flow:
  Server (childLogin) ──────────→ Resolve Firebase Identity ──┐
                                                               │
  Server (beforeLoad) ──────────→ Optional Firebase context ──┤
                                                               │
  Browser ◄──────────────────────── Session cookie only ◄─────┘
                                    (No Firebase identifiers)
```

---

# 4. SOURCE-OF-TRUTH MATRIX

| Data | Current Source | G2 Created | G3 Source | G4+ Future | Mutability |
|------|---|---|---|---|---|
| **tatiId** | child_profiles.tati_id (Supabase) | — | Supabase (login) | Supabase (login) | Immutable |
| **childProfileId** | child_profiles.id (Supabase) | — | Supabase | Supabase | Immutable |
| **PIN Credential** | child_credentials.pin_hash (Supabase) | — | Supabase | Supabase (deprecated in G4+) | Mutable (rotation) |
| **firebaseUid** | — | childAuthIdentities.firebaseUid (Firestore) | Firestore | Firestore (or Firebase Auth) | Immutable |
| **familyId** | child_profiles.family_id (Supabase) | Also in Firestore | Supabase (source), Firestore (copy) | Supabase + Firestore | Immutable |
| **ChildSession** | child_sessions (Supabase) | — | Supabase | Supabase (G3-G4) → **Firebase** (G5+) | Mutable (revocation) |
| **Learning Progress** | journey_progress (Supabase) | — | Supabase | Supabase (G3-G4) → **Firestore** (G5+) | Mutable |
| **Competencies** | learner_competencies (Supabase) | — | Supabase | Supabase (G3-G4) → Firestore (G5+) | Mutable |
| **Achievements** | learner_achievements (Supabase) | — | Supabase | Supabase (G3-G4) → Firestore (G5+) | Mutable |
| **Child Status** | child_profiles.active (Supabase) | Also childAuthIdentities.status (Firestore) | Supabase (primary) | Both (synchronized) | Mutable (revocation) |
| **Session TTL** | 30 minutes (child_sessions.expires_at) | — | Supabase | Supabase (or Firebase token) | Configuration |
| **Role** | Implicit "child" in ChildSession | — | Supabase (session context) | Derived from both | Immutable (per-session) |

**Key Invariants**:
- ✅ `childProfileId` is immutable (shared key)
- ✅ `familyId` must be consistent (Supabase ≈ Firestore)
- ✅ `firebaseUid` format: `child_{childProfileId}` (deterministic)
- ✅ ChildSession is single source of truth for application session in G3
- ⚠️ Items marked "G4+ Future" are architectural placeholders (TBD, subject to Phase G4+ decisions)

---

# 5. SESSION MODEL DESIGN

## 5.1 Session Authority Decision

**RECOMMENDED: ChildSession remains PRIMARY application session in G3**

### Rationale

```
Existing ChildSession Advantages:
├── ✅ Proven secure (scrypt PIN, token hashing, HTTP-only cookie)
├── ✅ Proven scalable (30-min TTL, revocation tested)
├── ✅ Integrated with routes (beforeLoad guard, requireChildSession())
├── ✅ Works with Supabase (existing tables, no migration)
├── ✅ Supports gradual Firebase adoption (not all-or-nothing)
├── ✅ Graceful fallback if Firebase unavailable
└── ✅ No breaking changes to existing learner experience

Firebase Token Disadvantages in G3:
├── ❌ Would require browser to handle ID token (new surface)
├── ❌ Firebase token expiry (1 hour) != TATI session TTL (30 min)
├── ❌ Token refresh logic would duplicate session management
├── ❌ Breaks graceful degradation (Firebase outage = no auth)
├── ❌ Requires Firestore changes for child session data
├── ❌ Firebase token in browser increases attack surface
└── ❌ No proven coexistence with Supabase session

Hybrid Model (Recommended for G3):
├── ✅ Keep ChildSession as application session (HTTP-only cookie)
├── ✅ Add Firebase UID as supplementary identity metadata
├── ✅ Firebase token optional (future use in G4+)
├── ✅ Preserve all existing security properties
└── ✅ Enable gradual migration in later phases
```

## 5.2 Target Session Structure (G3)

```typescript
// Existing (preserved)
type ChildSession = {
  kind: "child";
  childId: string;           // From child_profiles.id
  sessionId: string;         // From child_sessions.id
  createdAt: string;         // ISO timestamp
  expiresAt: string;         // ISO timestamp
  revokedAt: string | null;  // ISO timestamp or null
};

// NEW: Add optional Firebase context
// (This is NOT replacing ChildSession, just extending context)
type FirebaseChildIdentity = {
  firebaseUid: string;       // e.g., "child_<uuid>"
  familyId: string;          // From Firestore + Supabase
  status: "active" | "revoked";  // From Firestore
};

// NEW: Unified context for routes
type AuthenticatedChildContext = {
  // Existing application session (primary)
  session: ChildSession;
  
  // Firebase identity metadata (optional, supplementary)
  firebase?: FirebaseChildIdentity;
  
  // Convenience accessors
  childId: string;           // session.childId
  sessionId: string;         // session.sessionId
  tatiId: string;            // From child_profiles (loaded)
};
```

## 5.3 Session Lifecycle (G3 Model)

```
PHASE 1: Login (childLogin)
├─ ✅ Existing: Create ChildSession in child_sessions table
├─ ✅ Existing: Generate 256-bit token, store SHA256 hash
├─ ✅ Existing: Set HTTP-only cookie (30-min TTL)
├─ ✅ Existing: Return profile to browser
│
└─ NEW: Also resolve Firebase identity (server-only, not in response)
   ├─ Call getChildFirebaseIdentity()
   ├─ Store in route context (passed via loader)
   └─ NOT in cookie, NOT in response body

PHASE 2: Authorization (beforeLoad guard)
├─ ✅ Existing: Read tati_child_session cookie
├─ ✅ Existing: Validate in child_sessions table
├─ ✅ Existing: Check expiry + revocation
├─ ✅ Existing: Load profile from child_profiles
│
└─ NEW: Optionally resolve Firebase identity
   ├─ Only for routes that need it (lazy loading)
   ├─ Call getChildFirebaseIdentity() again
   ├─ Check status === "active" in Firestore
   └─ Pass to route in context

PHASE 3: Route Handler
├─ ✅ Existing: requireChildSession(context)
├─ ✅ Existing: assertChildActivity(itemType, itemId)
├─ ✅ Existing: getChildLearningData()
│
└─ NEW: AuthenticatedChildContext with optional Firebase
   ├─ Can access session (always present)
   ├─ Can access firebase (if available)
   ├─ Can access child profile data
   └─ Gracefully handles missing Firebase identity

PHASE 4: Logout (childLogout)
├─ ✅ Existing: Revoke ChildSession in child_sessions
├─ ✅ Existing: Set revoked_at timestamp
├─ ✅ Existing: Clear HTTP-only cookie
│
└─ NEW: No Firebase-specific logout needed
   (Firebase session state is never stored; identity is read-only mapping)
```

## 5.4 Session Persistence Across Navigation

```
Scenario: Child logs in, navigates around, refreshes page

1. Browser: /child/login → childLogin() → /child/home
   ├─ Session created
   ├─ Cookie set
   └─ Firebase identity resolved (server-side only)

2. Browser: Navigate to /child/scenario/school-reopening
   ├─ beforeLoad guard runs
   ├─ getChildSession() reads cookie
   ├─ Validates in child_sessions
   ├─ Returns ChildSession (existing)
   ├─ Optionally resolves Firebase identity (new)
   └─ Route renders

3. Browser: User refreshes page (F5)
   ├─ Cookie persists (set by browser)
   ├─ beforeLoad guard runs again
   ├─ getChildSession() reads same cookie
   ├─ Validates again (still valid)
   ├─ Returns ChildSession (same)
   ├─ Optionally resolves Firebase identity (new lookup, same result)
   └─ Route renders (seamless)

4. Browser: Navigate to /child/lesson.save-lesson-1
5. Browser: Navigate back to /child/scenario/school-reopening
   ├─ beforeLoad guard runs each time
   ├─ Same cookie ✅
   ├─ Same ChildSession ✅
   ├─ Same Firebase identity (if available) ✅
   └─ Seamless experience (no re-login needed)

Session Expiry:
After 30 minutes of creation time, expires_at timestamp passes
├─ Next route load: getChildSession() returns null
├─ beforeLoad throws redirect to /child/login
├─ Child sees "Your session expired, please log in again"
└─ Normal re-login flow
```

---

# 6. AUTHENTICATED CHILD CONTEXT DESIGN

## 6.1 Context Derivation Flow

```
HTTP-only Cookie
  tati_child_session = "base64url(256-bit token)"
        │
        ▼
validateChildSession()
  ├─ Hash token: SHA256(token)
  ├─ Query child_sessions by token_hash
  ├─ Check: revoked_at IS NULL
  ├─ Check: expires_at > now()
  └─ Return ChildSession { kind, childId, sessionId, expiresAt, revokedAt }
        │
        ▼
loadChildProfile(childId)
  ├─ Query child_profiles by childId
  └─ Return { id, tati_id, name, age, avatar, tier, curriculum_level, family_id }
        │
        ▼
[Optional] getChildFirebaseIdentity(childId, familyId)
  ├─ Query Firestore: childAuthIdentities/{childId}
  ├─ Verify: familyId matches
  ├─ Verify: status === "active"
  └─ Return FirebaseChildIdentity { firebaseUid, familyId, status }
        │ (or null if not found)
        ▼
AuthenticatedChildContext
  {
    session: ChildSession,
    firebase: FirebaseChildIdentity | undefined,
    childId: string,
    sessionId: string,
    tatiId: string,
    name: string,
    age: number,
    avatar: string,
    tier: string,
    familyId: string
  }
```

## 6.2 New Type Definition

```typescript
// src/lib/auth/authorization.server.ts (modify existing)

// Keep existing ChildSession unchanged
export type ChildSession = {
  kind: "child";
  childId: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

// NEW: Add Firebase context type
export type FirebaseChildIdentity = {
  firebaseUid: string;       // Format: child_<childProfileId>
  familyId: string;          // From Firestore mapping
  status: "active" | "revoked";  // From Firestore
};

// NEW: Unified authenticated child context
export type AuthenticatedChildContext = {
  // Application session (primary, always present)
  session: ChildSession;
  
  // Child profile data (always present when authenticated)
  profile: {
    id: string;              // childProfileId
    tatiId: string;          // TATI-XXXXXXXX
    name: string;            // Child name
    age: number;             // Age
    avatar: string;          // Avatar key
    tier: string;            // "junior", "teen", "plus"
    curriculum_level: string | null;
    familyId: string;        // Family ID
  };
  
  // Firebase identity (optional, available if G2 identity created)
  firebase?: FirebaseChildIdentity;
  
  // Convenience accessors
  readonly childId: string;  // Alias for session.childId
  readonly sessionId: string; // Alias for session.sessionId
  readonly familyId: string;  // From profile
};
```

## 6.3 Context Derivation Function

```typescript
// src/lib/auth/child-session.server.ts (NEW FILE)

import type { ChildSession } from "./authorization.server";
import type { AuthenticatedChildContext, FirebaseChildIdentity } from "./authorization.server";
import { getCookie } from "@tanstack/react-start/server";
import { validateChildSession } from "./child-identity.server";
import { getChildFirebaseIdentity } from "@/lib/backend/firebase/child-auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const COOKIE_NAME = "tati_child_session";

/**
 * Derive complete authenticated child context from HTTP-only session cookie.
 * This is the main entry point for route guards and server functions.
 * 
 * NEVER TRUST: childId, familyId from client
 * ALWAYS DERIVE: From validated session token + Supabase/Firestore queries
 */
export async function getAuthenticatedChild(): Promise<AuthenticatedChildContext | null> {
  // Step 1: Validate session cookie (existing logic)
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;
  
  const session = await validateChildSession(token);
  if (!session) return null;
  
  // Step 2: Load child profile (existing logic)
  const profile = await loadChildProfile(session.child_profile_id);
  if (!profile) return null;
  
  // Step 3: Optionally resolve Firebase identity (new logic)
  let firebase: FirebaseChildIdentity | undefined = undefined;
  try {
    const firebaseIdentity = await getChildFirebaseIdentity(
      session.child_profile_id,
      profile.family_id
    );
    if (firebaseIdentity) {
      firebase = {
        firebaseUid: firebaseIdentity,
        familyId: profile.family_id,
        status: "active"  // Already verified by getChildFirebaseIdentity
      };
    }
  } catch (err) {
    // Firebase resolution failed (network, emulator down, etc.)
    // Gracefully continue without Firebase context
    console.debug("Firebase identity resolution failed:", err);
  }
  
  // Step 4: Construct unified context
  return {
    session,
    profile,
    firebase,
    
    // Convenience accessors
    get childId() { return session.child_profile_id; },
    get sessionId() { return session.id; },
    get familyId() { return profile.family_id; }
  } as AuthenticatedChildContext;
}

/**
 * Require authenticated child context.
 * Throws AuthorizationError if not authenticated or expired.
 */
export function requireAuthenticatedChild(context: unknown): AuthenticatedChildContext {
  if (!context || typeof context !== "object") {
    throw new AuthorizationError("Child authentication required.");
  }
  
  const ctx = context as any;
  if (!ctx.session || ctx.session.kind !== "child") {
    throw new AuthorizationError("Child session required.");
  }
  
  if (ctx.session.revokedAt) {
    throw new AuthorizationError("This child session has been revoked.");
  }
  
  if (Date.parse(ctx.session.expiresAt) <= Date.now()) {
    throw new AuthorizationError("This child session has expired.");
  }
  
  return ctx as AuthenticatedChildContext;
}

async function loadChildProfile(childId: string) {
  const { data, error } = await (supabaseAdmin as any)
    .from("child_profiles")
    .select("*")
    .eq("id", childId)
    .single();
  
  if (error || !data) return null;
  return data;
}
```

---

# 7. FAILURE SCENARIOS

## 7.1 Failure Matrix

| Scenario | Auth Result | Authz Result | User Sees | Server Behavior |
|----------|---|---|---|---|
| **Child has no Firebase identity** | ✅ SUCCESS (Supabase) | ✅ ALLOWED | Learner experience | Firebase context undefined, Supabase used for all operations |
| **Firebase identity exists + active** | ✅ SUCCESS (Supabase) | ✅ ALLOWED | Learner experience | Firebase context available (used for future phases) |
| **Firebase identity revoked** | ✅ SUCCESS (Supabase) | ⚠️ WARNING (log but allow) | Learner experience | Firebase context shows status="revoked", Supabase operations continue |
| **Firebase mapping wrong family** | ✅ SUCCESS (Supabase) | ❌ DENIED | ERROR page, redirect to login | getChildFirebaseIdentity throws "access denied", child forced to re-login |
| **ChildSession expired (30 min)** | ❌ FAIL | ❌ DENIED | "Session expired, log in again" | beforeLoad guard redirects to /child/login |
| **ChildSession revoked** | ❌ FAIL | ❌ DENIED | "Session revoked" error | beforeLoad guard throws AuthorizationError |
| **Firebase UID unknown** | ✅ SUCCESS (Supabase) | ✅ ALLOWED | Learner experience | Firebase context undefined (identity not created yet) |
| **Supabase child profile deleted** | ❌ FAIL | ❌ DENIED | "Profile not found" error | loadChildProfile() returns null, getAuthenticatedChild() returns null |
| **TATI ID/PIN invalid** | ❌ FAIL | N/A | "Invalid TATI ID or PIN" error | childLogin() catches verifyChildCredential() failure |
| **Firebase emulator unavailable** | ✅ SUCCESS (Supabase) | ✅ ALLOWED (graceful) | Learner experience | getChildFirebaseIdentity() catch → continue without Firebase |
| **PIN credential revoked** | ❌ FAIL | N/A | "Invalid TATI ID or PIN" error | verifyChildPin() fails, childLogin() error |
| **Token cookie missing** | ❌ FAIL | ❌ DENIED | "Please log in" | getChildSession() returns null, beforeLoad redirects |
| **Token cookie tampered** | ❌ FAIL | ❌ DENIED | "Please log in" | validateChildSession() returns null (token_hash won't match) |

## 7.2 Detailed Failure Scenarios

### Scenario A: Child has no Firebase identity

```
Trigger: Child logs in; Firebase identity was never created (not in G2)

Flow:
1. childLogin() succeeds (Supabase)
2. ChildSession created ✅
3. getChildFirebaseIdentity() called
   ├─ Query Firestore: childAuthIdentities/{childId}
   ├─ NOT FOUND
   └─ Returns null (not an error)
4. firebase context = undefined
5. Return to browser with ChildSession

Result:
├─ Child authenticated: ✅
├─ Authorized for learner routes: ✅
├─ Firebase context: undefined
└─ Learner experience: Unchanged (works as before)

Server behavior:
├─ Log: No Firebase identity for child {childId}
├─ Code path: All operations use Supabase ✅
└─ Graceful degradation: ✅ Works perfectly

User sees: Learner experience (no difference)
```

### Scenario B: Firebase identity revoked (status = "revoked")

```
Trigger: Parent revoked child Firebase identity during active session

Flow:
1. Child has valid ChildSession
2. Route beforeLoad calls getAuthenticatedChild()
3. getChildFirebaseIdentity() queries Firestore
4. Found: status = "revoked"
5. Still returns firebaseUid (for audit/logging)
6. firebase.status = "revoked"

Result:
├─ Child authenticated: ✅ (ChildSession still valid)
├─ Authorized for learner routes: ✅
├─ Firebase context: { firebaseUid, status: "revoked" }
└─ Learner experience: Unchanged (ChildSession is auth)

Server behavior:
├─ Log: Firebase identity revoked for child {childId}
├─ Check: Future Firebase operations will be blocked
├─ Code path: Current request uses Supabase ✅
└─ Next session: After logout, login will find revoked status

User sees: Learner experience continues (no immediate change)
          (When they log out and log in again, Firebase won't be available)
```

### Scenario C: Firebase mapping belongs to different family

```
Trigger: Child profile's family_id doesn't match Firestore childAuthIdentities.familyId

Flow:
1. Child logs in with TATI ID + PIN
2. Supabase verifies: correct child, correct PIN
3. Load profile: familyId = "family-uuid-a"
4. Call getChildFirebaseIdentity(childId, "family-uuid-a")
5. Query Firestore finds: familyId = "family-uuid-b" (MISMATCH)
6. getChildFirebaseIdentity() throws AuthorizationError("access denied")

Result:
├─ Child authentication: ✅ (Supabase still succeeded)
├─ Authorization: ❌ DENIED (Firebase cross-family detected)
├─ Error thrown: AuthorizationError
└─ ChildSession status: REVOKED (rollback)

Server behavior:
├─ Log: Security incident - Firebase family mismatch for child {childId}
├─ Action: Revoke ChildSession immediately (revokeChildSession())
├─ Clear cookie in response
├─ Redirect to /child/login with error

User sees: "Authentication error. Please log in again."
          (This should rarely happen; indicates data inconsistency or tampering)
```

### Scenario D: ChildSession expired (after 30 minutes)

```
Trigger: Child's ChildSession TTL has passed

Flow:
1. Child authenticated, navigates around
2. More than 30 minutes pass since login
3. Child clicks on learner route (e.g., /child/scenario)
4. beforeLoad guard runs: getChildSession()
5. validateChildSession(token) checks: Date.parse(expiresAt) <= Date.now()
6. Condition TRUE (expired)
7. validateChildSession() returns null

Result:
├─ Child authentication: ❌ FAILED
├─ Authorized: ❌ DENIED
└─ Action: beforeLoad throws redirect to /child/login

Server behavior:
├─ Log: Session expired for child {childId}, sessionId {sessionId}
├─ Cookie: Cleared (setCookie(..., "", { maxAge: 0 }))
├─ Redirect: to: "/child/login" with replace: true

User sees: Back at /child/login
          "Your session has expired. Please log in again."
          Form is ready for re-login
```

### Scenario E: Firebase emulator unavailable

```
Trigger: Firebase emulator not running, or network error

Flow:
1. Child logs in: childLogin()
2. ChildSession created ✅
3. getChildFirebaseIdentity() called
4. Network request to Firestore fails (ECONNREFUSED or timeout)
5. Exception thrown: FirestoreError or Network error

Result:
├─ ChildSession: Already created ✅
├─ Firebase resolution: ❌ FAILED
├─ Catch block: Logs error, continues
└─ firebase context: undefined

Server behavior:
├─ Log: Firebase identity resolution failed: {error}
├─ Code: try/catch continues without Firebase
├─ ChildSession: Still valid and returned to browser
├─ Cookie: Set normally
└─ Graceful degradation: ✅

User sees: Learner experience (Firebase absence transparent)
Server behavior: All operations work on Supabase, Firebase skipped
```

---

# 8. MIGRATION SAFETY & ROLLBACK

## 8.1 Rollback Guarantee

**Property**: If Firebase integration fails, system automatically falls back to TATI ID + PIN authentication.

```
Failure Scenario: Firebase Firestore emulator crashes

┌──────────────────────────────────┐
│ Child Login Attempt              │
│ TATI ID + PIN entered            │
└──────────────────┬───────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ Supabase Verify     │
         │ childLogin()        │
         │ (existing)          │
         └────┬────────────────┘
              │
              ▼
    ┌──────────────────────────┐
    │ ChildSession Created ✅  │
    │ Token hashed + stored    │
    │ HTTP-only cookie set     │
    └────┬─────────────────────┘
         │
         ▼
    ┌──────────────────────────────┐
    │ Try Firebase Resolution      │
    │ getChildFirebaseIdentity()   │
    └────┬───────────────┬─────────┘
         │               │
    SUCCESS           FAILURE
         │               │
         ▼               ▼
    Set firebase    Catch exception
    context         Log error
         │           Continue
         │           firebase=undefined
         │               │
         └───────┬───────┘
                 │
                 ▼
    ┌──────────────────────────┐
    │ Return to Browser         │
    │ ✅ ChildSession          │
    │ ✅ Profile               │
    │ ⏸️ Firebase (if failed)  │
    │ ✅ Cookie set            │
    └────┬─────────────────────┘
         │
         ▼
    Child sees: Learner dashboard
    Everything works: Supabase only
    Firebase: Gracefully absent
```

**Explicit Guarantee**:
- If `getChildFirebaseIdentity()` fails → Log warning + continue
- If Firestore is down → No child is locked out
- If Firebase credential is wrong → Supabase continues working
- Existing TATI ID + PIN flow remains intact

## 8.2 Graceful Degradation Strategy

```
Application Tier 1: TATI ID + PIN + ChildSession (G1-G3 era)
├─ Database: Supabase
├─ Authentication: Proven, secure
├─ Session: HTTP-only cookie
└─ Status: Core, always available

Application Tier 2: Firebase Identity (G3 added)
├─ Database: Firestore
├─ Purpose: Supplementary identity mapping
├─ Optional: Not required for child auth
└─ Status: Enhanced, can degrade gracefully

Failure Modes:
├─ Supabase down → ENTIRE system down (expected)
├─ Firebase down → Tier 1 + Tier 2 basic → Only Tier 1 available
│   └─ Child can login, access learner routes
│   └─ Firebase context unavailable
│   └─ No functionality lost
│
└─ Both down → No auth possible (expected, no worse than G1)
```

## 8.3 Rollback Procedure

If Firebase integration causes issues:

1. **Immediate**: Set `getChildFirebaseIdentity()` to always return null
   ```typescript
   export async function getChildFirebaseIdentity(...) {
     return null; // Disable Firebase resolution
   }
   ```

2. **Result**: All children authenticated via ChildSession only
   - Firebase context always undefined
   - No Breaking changes
   - Application functions identically to pre-G3

3. **Timeline**: Rollback effective immediately (no redeploy needed if feature-flagged)

4. **Verification**: Run existing test suite
   - `npm test -- --run` should pass
   - No Firebase-specific tests fail (graceful)

---

# 9. PARALLEL AUTHENTICATION ARCHITECTURE

## 9.1 Dual-Authority Model (Recommended)

**Architecture Decision**: YES, support both in parallel, but with clear hierarchy.

```
┌─────────────────────────────────────────────────────┐
│ AUTHENTICATION AUTHORITY (Who verifies identity?)   │
│                                                     │
│ Primary: Supabase                                   │
│ ├─ Verifies PIN credential (scrypt)                │
│ ├─ Validates TATI ID                               │
│ ├─ Creates ChildSession                            │
│ └─ Status: Core to G3                              │
│                                                     │
│ Secondary: Firebase (Future, prepared in G3)       │
│ ├─ Not used for authentication yet                 │
│ ├─ Exists as identity mapping only                 │
│ ├─ Ready for G4+ token verification                │
│ └─ Status: Prepared, not primary                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ IDENTITY MAPPING (Who am I?)                        │
│                                                     │
│ Supabase (Primary)                                  │
│ ├─ child_profiles.tati_id → child_profiles.id     │
│ ├─ Authoritative for child existence               │
│ └─ Status: Single source of truth                  │
│                                                     │
│ Firestore (Supplementary)                          │
│ ├─ childProfileId → firebaseUid (deterministic)   │
│ ├─ Read-only mapping (created in G2)               │
│ └─ Status: Consistent, non-authoritative          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ APPLICATION SESSION (How do I stay logged in?)      │
│                                                     │
│ Primary: ChildSession (Supabase)                    │
│ ├─ HTTP-only cookie with random token              │
│ ├─ 30-minute TTL                                   │
│ ├─ Revocation support                              │
│ └─ Status: Proven, primary application session    │
│                                                     │
│ Future: Firebase token (G4+, not yet)             │
│ ├─ Would be optional replacement                   │
│ ├─ Would need TTL negotiation                      │
│ └─ Status: Not implemented in G3                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AUTHORIZATION (Can I access this?)                  │
│                                                     │
│ Primary: ChildSession.childId                       │
│ ├─ Checked in every route guard                     │
│ ├─ Cannot elevate role                             │
│ ├─ Cannot cross-child access                       │
│ └─ Status: Core authorization mechanism            │
│                                                     │
│ Secondary: Firebase UID (Future authorization)     │
│ ├─ Prepared in G3, used in G4+                    │
│ ├─ Would duplicate authorization checks            │
│ └─ Status: Prepared, not primary                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ DOMAIN DATA (What can I access?)                    │
│                                                     │
│ Supabase (G3 primary)                               │
│ ├─ journey_progress                                │
│ ├─ learner_competencies                            │
│ ├─ learner_achievements                            │
│ ├─ assessment_attempts                             │
│ ├─ scenario_sessions                               │
│ └─ Status: All learning data in Supabase           │
│                                                     │
│ Firestore (G4+, not yet)                           │
│ ├─ Prepared for future migration                   │
│ ├─ Would gradually move Supabase data              │
│ └─ Status: Not used in G3                          │
└─────────────────────────────────────────────────────┘
```

## 9.2 No Competing Authorities

**Explicit Rule**: Avoid two sources of truth for the same thing.

```
✅ DO: Use both for different purposes
├─ Supabase: Application session + domain data
├─ Firebase: Identity mapping + future auth (G4+)
└─ No conflict: Different tables, different use cases

❌ DON'T: Use both as alternative auth sources
├─ Error: "Try Firebase, if that fails try Supabase"
├─ Problem: Unpredictable auth behavior
└─ Risk: Child might skip PIN verification

❌ DON'T: Store same data in both systems
├─ Example: Child name in Supabase AND Firestore
├─ Problem: Inconsistency, sync conflicts
└─ Risk: Wrong data returned to child
```

## 9.3 Integration Contract

```
During G3:
├─ Supabase owns: Authentication (PIN), Application session, Domain data
├─ Firebase owns: Identity mapping (read-only), Future auth preparation
└─ No conflicts: Clear separation

During G4-G5 (future phases):
├─ Decision to migrate certain data would be explicit
├─ Phase migration document would specify exactly what moves
├─ Gradual transition with parallel operation
└─ Supabase remains primary until explicitly cutover

Risk: If both systems are used for authentication in parallel
├─ Child logs in via PIN (Supabase)
├─ Child also logs in via Firebase token (hypothetically)
├─ ChildSession and Firebase token can diverge
├─ Which is authority? Risk of stale/conflicting state
├─ MITIGATION: Don't do this in G3. Firebase token is prepared, not used.
```

---

# 10. SECURITY ANALYSIS

## 10.1 Threat Model vs. G3 Design

| Threat | Attack Vector | G3 Mitigation | Status |
|--------|---|---|---|
| **Session Fixation** | Attacker forces child to use attacker's cookie | HTTP-only flag prevents JavaScript access; SameSite=Lax prevents cross-site cookie injection | ✅ MITIGATED |
| **Token Theft** | Attacker steals token from cookie | Stored as SHA256 hash in DB, token never logged; HTTP-only prevents JavaScript access | ✅ MITIGATED |
| **Child Impersonation** | Attacker guesses childProfileId or claims to be Child A | ChildSession.childId bound to validated token; no client-supplied IDs trusted; familyId verified | ✅ MITIGATED |
| **Firebase UID Spoofing** | Child sends fake Firebase UID in request | Firebase UID never accepted from client; always resolved server-side from Firestore mapping | ✅ MITIGATED |
| **Family Crossing** | Child A tries to access Family B data | getChildFirebaseIdentity() verifies familyId match; Query constraints check status + familyId | ✅ MITIGATED |
| **Child Crossing** | Child A accesses Child B's progress | requireChildSession() enforces childId match; Progress queries filtered by child_profile_id | ✅ MITIGATED |
| **Role Escalation** | Child elevates to parent role | ChildSession.role immutably "child"; No parent-creation code in child routes | ✅ MITIGATED |
| **Stale Firebase Mapping** | Old Firebase UID after revocation | Status field checked; Revoked UIDs return null from resolveChildFromFirebaseUid() | ✅ MITIGATED |
| **Revoked Identity Bypass** | Child uses Firebase UID after revocation | Firestore query: `WHERE status == "active"` blocks revoked identities | ✅ MITIGATED |
| **Expired Session Bypass** | Child uses token after 30 min | validateChildSession() checks `expires_at > now()`; Automatic rejection | ✅ MITIGATED |
| **PIN Exposure in Logs** | PIN appears in error messages or logs | PIN hash used; Comparison is constant-time; Error messages generic ("Invalid TATI ID or PIN") | ✅ MITIGATED |
| **Admin SDK Exposure** | firebase-admin imported in browser | .server.ts files only; TanStack Start build system prevents client access | ✅ MITIGATED |
| **Emulator Production Fallthrough** | Test Firebase emulator credential in production | Environment variables checked; No Firebase credential hardcoded in code; Admin SDK auto-detects emulator | ✅ MITIGATED |

## 10.2 Security Invariants (Never Broken)

```
Invariant 1: No ChildSession.childId from client
├─ Derive from: Validated token → Supabase lookup
├─ Verify in: Every route guard
└─ Breach impact: Child impersonation, data access

Invariant 2: No firebaseUid from client
├─ Derive from: Firestore mapping only
├─ Verify in: getChildFirebaseIdentity() server function
└─ Breach impact: Child identity spoofing, auth bypass

Invariant 3: No Firebase token in HTTP-only cookie
├─ Why: Firebase tokens have different TTL/refresh than TATI sessions
├─ Store in: HTTP-only cookies only (TATI session token)
└─ Breach impact: Stale token, mixed auth states

Invariant 4: No Admin credentials in browser
├─ Rule: firebase-admin only in .server.ts files
├─ Enforce: TanStack Start build system
└─ Breach impact: Complete Firebase compromise

Invariant 5: familyId consistency
├─ Supabase source: child_profiles.family_id
├─ Firestore replica: childAuthIdentities.familyId
├─ Validation: Must match in getChildFirebaseIdentity()
└─ Breach impact: Family data crossing

Invariant 6: Status field authorization
├─ Implementation: Firestore WHERE status == "active"
├─ Revocation: Set status = "revoked"
└─ Breach impact: Revoked children still authenticated

Invariant 7: Constant-time PIN comparison
├─ Implementation: timingSafeEqual() in verifyChildPin()
├─ Risk: Timing attacks on PIN validation
└─ Breach impact: PIN brute-force acceleration
```

## 10.3 Known Limitations (Acceptable in G3)

```
Limitation 1: No per-request Firebase verification
├─ G3: Firebase UID resolved at login/route load
├─ Acceptable: ChildSession is application authority
├─ Risk: If Firestore status changes mid-session, not detected
├─ Mitigation: Child logs out after 30 min anyway
├─ Future: G4+ can add per-request Firebase checks

Limitation 2: Firebase token refresh not supported
├─ G3: Firebase tokens not used
├─ Acceptable: ChildSession is primary
├─ Risk: N/A (no Firebase token issued)
├─ Future: G4+ would add token refresh logic

Limitation 3: No offline Firebase verification
├─ G3: Firebase resolution requires Firestore query
├─ Acceptable: Firestore is optional layer
├─ Risk: If Firestore down, Firebase context undefined (graceful)
├─ Future: Could cache mapping locally
```

---

# 11. G3 IMPLEMENTATION BOUNDARY

## 11.1 Files to Create (New)

```
REQUIRED:
├── src/lib/auth/child-session.server.ts
│   ├── getAuthenticatedChild()
│   ├── requireAuthenticatedChild()
│   └── AuthenticatedChildContext type derivation
│
├── tests/auth/child-session.server.test.ts
│   ├── Test getAuthenticatedChild() success path
│   ├── Test Firebase identity resolution (with/without)
│   ├── Test expired session rejection
│   ├── Test revocation detection
│   ├── Test family isolation
│   └── Test graceful Firebase unavailability
│
└── PHASE_G3_AUTHENTICATION_MAP.md (THIS DOCUMENT)

OPTIONAL (For clarity, not required for functionality):
├── src/lib/auth/firebase-context.ts (if Firebase context needs separate file)
└── tests/auth/firebase-context.test.ts
```

## 11.2 Files to Modify

```
EXISTING FILES TO EXTEND (minor, additive changes):
│
├── src/lib/auth/authorization.server.ts
│   ├── Add: FirebaseChildIdentity type
│   ├── Add: AuthenticatedChildContext type
│   └── Keep: Existing ChildSession, AuthorizationError
│
├── src/lib/auth/child-learning.functions.ts
│   └── Modify: currentChildId() to use getAuthenticatedChild() (optional improvement)
│
├── src/routes/child/route.tsx
│   ├── Optional: Use getAuthenticatedChild() in beforeLoad
│   └── Keep: Existing route guard (can be enhanced, not replaced)
│
└── drizzle/schema.ts (if type sync needed)
    └── Verify: childAuthIdentities Firestore collection type defined
```

## 11.3 Files NOT to Touch

```
❌ DO NOT MODIFY:
│
├── src/lib/auth/child-identity.server.ts
│   └── Reason: Existing TATI ID + PIN logic is working
│
├── src/lib/auth/child-auth.functions.ts
│   └── Reason: childLogin(), getChildSession(), childLogout() are unchanged
│
├── src/routes/child/login.tsx
│   └── Reason: TATI ID + PIN form unchanged (UX preserved)
│
├── src/lib/backend/firebase/child-auth.server.ts
│   └── Reason: G2 functions used as-is (read-only)
│
├── src/integrations/supabase/client.server.ts
│   └── Reason: Supabase is unchanged provider
│
├── firestore.rules
│   └── Reason: childAuthIdentities rules already set in G2
│
└── All child profile/credential/session tables
    └── Reason: Schema is final for this phase
```

## 11.4 Server Functions

```
NEW SERVER FUNCTIONS TO CREATE:

1. getAuthenticatedChildContext()
   ├── Input: None (reads from HTTP-only cookie)
   ├── Output: AuthenticatedChildContext | null
   ├── File: src/lib/auth/child-session.server.ts
   ├── Calls: validateChildSession(), loadChildProfile(), getChildFirebaseIdentity()
   └── Error handling: Graceful degradation if Firebase fails

2. (Optional) establishChildAuthContext()
   ├── Alternative: Could wrap for route middleware
   └── Purpose: Reusable in multiple route guards

EXISTING FUNCTIONS NOT TO CHANGE:
├── childLogin() - Existing, but optional enhancement to call Firebase resolution
├── getChildSession() - Existing, unchanged
├── childLogout() - Existing, unchanged
├── validateChildSession() - Existing, unchanged
├── createChildSession() - Existing, unchanged
└── revokeChildSession() - Existing, unchanged
```

## 11.5 Types

```
TYPES TO CREATE:
│
├── FirebaseChildIdentity (in authorization.server.ts)
│   ├── firebaseUid: string
│   ├── familyId: string
│   └── status: "active" | "revoked"
│
└── AuthenticatedChildContext (in authorization.server.ts)
    ├── session: ChildSession
    ├── profile: {...}
    ├── firebase?: FirebaseChildIdentity
    └── convenience accessors

TYPES TO KEEP UNCHANGED:
├── ChildSession (existing, unchanged)
├── ChildProfile (existing, unchanged)
└── AuthContext (existing, may add variant in future)
```

## 11.6 Tests

```
TESTS TO CREATE: tests/auth/child-session.server.test.ts
│
├── ✅ getAuthenticatedChild() with valid session
├── ✅ getAuthenticatedChild() with Firebase identity
├── ✅ getAuthenticatedChild() without Firebase identity (graceful)
├── ✅ getAuthenticatedChild() with expired session
├── ✅ getAuthenticatedChild() with revoked session
├── ✅ getAuthenticatedChild() with wrong family (Firebase error)
├── ✅ getAuthenticatedChild() with Firebase unavailable (graceful)
├── ✅ requireAuthenticatedChild() success path
├── ✅ requireAuthenticatedChild() expired throws
├── ✅ requireAuthenticatedChild() revoked throws
├── ✅ Family isolation via Firebase context
└── ✅ Child isolation via session.childId

REGRESSION TESTS TO RUN:
├── ✅ npm test -- --run (full suite)
├── ✅ npm exec -- tsc --noEmit (TypeScript)
├── ✅ npm run lint (ESLint)
├── ✅ npm run build (Build check)
└── ✅ Existing child-auth.functions tests (unchanged)
```

## 11.7 Routes

```
ROUTES MODIFIED: None immediately

ROUTES THAT MAY BENEFIT (future enhancement):
├── src/routes/child/route.tsx
│   └── beforeLoad: Could use getAuthenticatedChild() for convenience
│
├── src/routes/child/scenario.$scenarioId.tsx
│   └── beforeLoad: Could use getAuthenticatedChild() for enhanced context
│
└── Other child routes: Same optional enhancement pattern

ROUTES NOT TOUCHED:
├── /child/login ✅ (unchanged, no Firebase exposure)
├── /parent/* ✅ (parent routes, completely separate)
└── All other routes ✅ (unchanged)
```

## 11.8 Migrations

```
DATABASE MIGRATIONS:

Supabase: NONE
├─ child_profiles schema unchanged
├─ child_credentials schema unchanged
├─ child_sessions schema unchanged
└─ No new tables needed

Firestore: ALREADY DONE (in G2)
├─ childAuthIdentities collection exists
├─ Security rules set
└─ No new changes in G3

Environment Variables: NONE NEW
├─ FIRESTORE_EMULATOR_HOST already set
├─ FIREBASE_AUTH_EMULATOR_HOST already set
└─ No new config needed
```

---

# 12. RECOMMENDED G3 ARCHITECTURAL MODEL

## 12.1 Executive Architectural Decision

```
PHASE G3 RECOMMENDED ARCHITECTURE:

┌─────────────────────────────────────────────────────────────┐
│ AUTHENTICATION AUTHORITY                                    │
│ ═════════════════════════════════════════════════════════   │
│                                                             │
│ Who authenticates the child?                               │
│ ──────────────────────────────────────────────────────    │
│ Supabase (TATI ID + PIN verification)                      │
│                                                             │
│ WHY:                                                        │
│ ✅ Proven secure (scrypt PIN hashing)                      │
│ ✅ Age-appropriate (TATI ID + PIN form)                    │
│ ✅ Existing infrastructure                                 │
│ ✅ No breaking changes                                     │
│ ✅ Supports gradual Firebase adoption                      │
│                                                             │
│ Firebase role: IDENTITY MAPPING (not authentication yet)   │
│ ├─ Read-only mapping: childProfileId ↔ firebaseUid       │
│ ├─ Used for: Future auth methods (G4+)                    │
│ └─ Status: Prepared, not primary                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ APPLICATION SESSION AUTHORITY                               │
│ ═════════════════════════════════════════════════════════   │
│                                                             │
│ What establishes the application session?                  │
│ ────────────────────────────────────────────────────────── │
│ ChildSession (Supabase child_sessions table)               │
│                                                             │
│ Mechanism:                                                  │
│ ├─ 256-bit random token generated                          │
│ ├─ SHA256(token) stored in DB as token_hash                │
│ ├─ Token stored in HTTP-only cookie                        │
│ ├─ 30-minute TTL enforced                                  │
│ ├─ Revocation via status field                             │
│ └─ Validated on every route access                         │
│                                                             │
│ WHY:                                                        │
│ ✅ Proven security model                                   │
│ ✅ Works with existing route guards                        │
│ ✅ Integrated with Supabase schema                         │
│ ✅ Graceful degradation if Firebase unavailable            │
│ ✅ No breaking changes to learner experience               │
│                                                             │
│ Firebase role: SUPPLEMENTARY (for future phases)           │
│ ├─ Does not replace ChildSession in G3                    │
│ ├─ Could replace in G4+ (explicit decision)                │
│ └─ Status: Prepared, not integrated yet                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ IDENTITY RESOLUTION                                         │
│ ═════════════════════════════════════════════════════════   │
│                                                             │
│ What identifies the child?                                 │
│ ────────────────────────────────────────────────────────── │
│                                                             │
│ Step 1: Supabase child_profiles                            │
│ ├─ Source: child_profiles.id (UUID)                        │
│ ├─ Purpose: Stable child identifier                        │
│ └─ Authority: Single source of truth                       │
│                                                             │
│ Step 2: ChildSession.childId                               │
│ ├─ Bound to: Validated session token                       │
│ ├─ Never from: Client request                              │
│ └─ Checked: Every route guard                              │
│                                                             │
│ Step 3: Firebase UID (NEW in G3)                           │
│ ├─ Source: childAuthIdentities.firebaseUid (Firestore)    │
│ ├─ Format: Deterministic child_{childProfileId}           │
│ ├─ Purpose: Identity for Firebase operations (future)      │
│ └─ Resolved: Server-side only (never exposed to browser)   │
│                                                             │
│ WHY This Design:                                            │
│ ✅ childProfileId is stable, immutable                     │
│ ✅ Firebase UID derived from childProfileId                │
│ ✅ No client-supplied identifiers trusted                  │
│ ✅ All identity resolution server-side                     │
│ ✅ Prevents forgery, child crossing, family crossing       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AUTHORIZATION ENFORCEMENT                                   │
│ ═════════════════════════════════════════════════════════   │
│                                                             │
│ What authorizes access to resources?                       │
│ ────────────────────────────────────────────────────────── │
│                                                             │
│ Primary: ChildSession.childId                              │
│ ├─ Check: Every route guard (beforeLoad)                   │
│ ├─ Verify: Not expired, not revoked                        │
│ ├─ Enforce: Cannot access another child's resources        │
│ └─ Status: CORE to G3                                      │
│                                                             │
│ Secondary: familyId validation                             │
│ ├─ Source: child_profiles.family_id                        │
│ ├─ Verify: Firestore childAuthIdentities.familyId matches  │
│ ├─ Purpose: Prevent family crossing                        │
│ └─ Status: NEW in G3 (via Firebase context)                │
│                                                             │
│ Tertiary: Track item existence (existing)                  │
│ ├─ Check: assertChildActivity()                           │
│ ├─ Verify: Item in SAVE track sequence                     │
│ └─ Purpose: Prevent access to non-existent items           │
│                                                             │
│ WHY This Layered Approach:                                  │
│ ✅ Session is fast, always checked                         │
│ ✅ Family isolation prevents data crossing                 │
│ ✅ Track existence prevents content forgery                │
│ ✅ Graceful: If Firebase unavailable, session auth still   │
│   works                                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WHERE FIREBASE FITS (G3)                                    │
│ ═════════════════════════════════════════════════════════   │
│                                                             │
│ Firebase Role in G3:                                       │
│                                                             │
│ 1. Identity Mapping Storage                                │
│    ├─ Stores: childAuthIdentities/{childProfileId}        │
│    ├─ Contains: firebaseUid, familyId, status, timestamps  │
│    ├─ Purpose: Foundation for Firebase auth (G4+)          │
│    └─ Usage: Read-only in G3                               │
│                                                             │
│ 2. Family Isolation Verification                           │
│    ├─ Query: Firestore for childAuthIdentities.familyId   │
│    ├─ Verify: Matches child_profiles.family_id            │
│    ├─ Purpose: Detect inconsistency/tampering              │
│    └─ Usage: Optional enhanced security check              │
│                                                             │
│ 3. Revocation Status Check                                 │
│    ├─ Query: childAuthIdentities.status field              │
│    ├─ Check: "active" vs "revoked"                        │
│    ├─ Purpose: Prepared for Firebase-based auth flow       │
│    └─ Usage: Logged (not blocking in G3)                   │
│                                                             │
│ 4. Future Authentication Bridge (prepared, not used)       │
│    ├─ Functions: G2 functions available                    │
│    ├─ API: verifyChildFirebaseToken() ready                │
│    ├─ Purpose: Ready for G4+ integration                   │
│    └─ Usage: NOT called in G3 child auth flow              │
│                                                             │
│ What Firebase Does NOT Do in G3:                           │
│ ├─ ❌ NOT verifying child authentication                   │
│ ├─ ❌ NOT issuing Firebase tokens                          │
│ ├─ ❌ NOT creating Firebase sessions                       │
│ ├─ ❌ NOT managing application TTL                         │
│ ├─ ❌ NOT storing learning progress                        │
│ └─ ❌ NOT primary authorization authority                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WHERE SUPABASE FITS (G3)                                    │
│ ═════════════════════════════════════════════════════════   │
│                                                             │
│ Supabase Role in G3:                                       │
│                                                             │
│ 1. Application Authentication (PRIMARY)                    │
│    ├─ Function: childLogin() verifies TATI ID + PIN       │
│    ├─ Storage: child_profiles, child_credentials          │
│    ├─ Status: Core, unchanged                              │
│    └─ Criticality: Blocking (child cannot login without)   │
│                                                             │
│ 2. Application Session Management (PRIMARY)                │
│    ├─ Function: ChildSession creation, validation          │
│    ├─ Storage: child_sessions table                        │
│    ├─ Status: Core, unchanged                              │
│    └─ Criticality: Blocking (session validation required)  │
│                                                             │
│ 3. Child Profile Data (PRIMARY)                            │
│    ├─ Storage: child_profiles table                        │
│    ├─ Data: name, age, avatar, tier, family_id            │
│    ├─ Status: Core, unchanged                              │
│    └─ Use: Every route needs this data                     │
│                                                             │
│ 4. Learning Domain Data (PRIMARY)                          │
│    ├─ Tables: journey_progress, competencies, achievements │
│    ├─ Status: Core, unchanged                              │
│    └─ Criticality: Learning operations depend on this      │
│                                                             │
│ Supabase Provider:                                         │
│ ├─ getActiveBackendProviderName() === "supabase" ✅        │
│ ├─ Status: Remains active (NOT changed in G3)              │
│ └─ Future: May change in G5+ if full migration             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WHAT REMAINS UNCHANGED (G3)                                 │
│ ═════════════════════════════════════════════════════════   │
│                                                             │
│ TATI ID + PIN Form                                         │
│ ├─ UX: Exactly the same                                    │
│ ├─ Validation: No changes                                  │
│ └─ Backend: childLogin() enhanced but output identical     │
│                                                             │
│ Child Login Flow                                            │
│ ├─ Step 1: Verify TATI ID + PIN (Supabase) ✅              │
│ ├─ Step 2: Create ChildSession (Supabase) ✅               │
│ ├─ Step 3: Set HTTP-only cookie ✅                         │
│ ├─ Step 4: NEW - Resolve Firebase identity (optional)      │
│ └─ Step 5: Return to browser (same response) ✅            │
│                                                             │
│ Learner Routes (/child/*)                                  │
│ ├─ Route guards: beforeLoad unchanged (enhanced optionally) │
│ ├─ Authorization: requireChildSession() works as-is        │
│ ├─ Content: No UI changes                                  │
│ ├─ Data: All from Supabase (unchanged)                     │
│ └─ Experience: Child sees no difference                    │
│                                                             │
│ Route Protection                                            │
│ ├─ Cookie validation: Same HTTP-only cookie               │
│ ├─ Session check: Same validateChildSession() logic        │
│ ├─ Authorization check: Same requireChildSession()         │
│ └─ Error handling: Same redirect to /child/login           │
│                                                             │
│ Logout                                                      │
│ ├─ Behavior: Revoke ChildSession ✅                        │
│ ├─ Cookie: Clear ✅                                        │
│ ├─ Firebase: No changes (identity mapping unaffected)      │
│ └─ Result: Same behavior as before                         │
│                                                             │
│ Assessments, Scenarios, Lessons                            │
│ ├─ Unchanged: All use existing APIs                        │
│ ├─ Data: All from Supabase (unchanged)                     │
│ ├─ Authorization: Based on ChildSession.childId            │
│ └─ Result: Child experience identical                      │
│                                                             │
│ Parent Functionality                                        │
│ ├─ Completely separate: /parent/* routes unaffected        │
│ ├─ Parent auth: Unchanged (Supabase user roles)           │
│ ├─ Family mgmt: Unchanged (no G3 changes)                  │
│ └─ Child creation: Already uses G2 Firebase functions      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WHAT MIGRATES LATER (G4+, NOT G3)                           │
│ ═════════════════════════════════════════════════════════   │
│                                                             │
│ Firebase Token Verification (G4+)                          │
│ ├─ Status: Prepared in G2, not used in G3                  │
│ ├─ Future: verifyChildFirebaseToken() would be called      │
│ ├─ Impact: Would become alternative auth path              │
│ └─ Decision: Explicit in G4 phase design                   │
│                                                             │
│ Firebase Session Management (G4+)                          │
│ ├─ Status: Not implemented in G3                           │
│ ├─ Future: Could replace ChildSession                      │
│ ├─ Impact: Major architectural change                      │
│ └─ Decision: Explicit in G4 phase design                   │
│                                                             │
│ Firestore Domain Data (G5+)                                │
│ ├─ Status: All data stays in Supabase for G3              │
│ ├─ Future: Gradual migration of learning data              │
│ ├─ Impact: Data residency, compliance decisions             │
│ └─ Decision: Explicit in G5 phase design                   │
│                                                             │
│ Backend Provider Switchover (G5+)                          │
│ ├─ Status: Supabase remains active                         │
│ ├─ Future: getActiveBackendProviderName() might change     │
│ ├─ Impact: System-wide provider switch                     │
│ └─ Decision: Explicit in G5 phase design                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 12.2 Critical Implementation Principles

```
Principle 1: NO BREAKING CHANGES
├─ Child login experience: Identical to G1
├─ Learner routes: Same functionality
├─ Parent routes: Completely unaffected
├─ Database: No schema changes
└─ Verification: Existing tests pass

Principle 2: GRACEFUL DEGRADATION
├─ Firebase unavailable → Supabase works
├─ Firestore down → Child can still login
├─ Firebase identity missing → Continue with Supabase only
└─ Error handling: Try Firebase, continue without it

Principle 3: SERVER-SIDE RESOLUTION
├─ Firebase UID: Resolved on server only
├─ familyId: Derived from Supabase + Firestore verification
├─ childId: From validated token, never from client
└─ No identifiers exposed to browser

Principle 4: CLEAR AUTHORITY SEPARATION
├─ Authentication: Supabase (TATI ID + PIN)
├─ Session: Supabase (ChildSession)
├─ Identity mapping: Firebase (supplementary)
├─ Avoid: Two competing authentication sources

Principle 5: PREPARATION FOR MIGRATION
├─ Firebase functions available (G2)
├─ Server functions ready to call (G3)
├─ Types defined for future use (G3)
├─ No client-side Firebase exposure (G3)
└─ Explicit decision point at each phase
```

## 12.3 Success Criteria for G3

```
✅ Implementation Success:
├─ Child can login via TATI ID + PIN (unchanged)
├─ ChildSession created and validated (unchanged)
├─ Learner routes protected and accessible (unchanged)
├─ Firebase identity resolved server-side (new)
├─ No Firebase tokens exposed to browser (secure)
├─ Graceful fallback if Firebase unavailable (robust)
├─ All existing tests pass (regression free)
├─ New tests pass for Firebase resolution (coverage)
└─ TypeScript, ESLint, Build all pass (quality)

✅ Architectural Success:
├─ Supabase remains active provider (intact)
├─ No breaking changes to child experience (preserved)
├─ Firebase is supplementary, not primary (correct model)
├─ Clear separation of concerns (maintainable)
├─ Ready for G4+ Firebase authentication (prepared)
└─ Can rollback Firebase layer without impact (safe)

✅ Security Success:
├─ No child impersonation possible (tokens, not IDs)
├─ No family crossing (verification at query level)
├─ No Firebase UID spoofing (server-derived)
├─ No Admin SDK in browser (.server.ts only)
├─ HTTP-only cookies preserved (secure transmission)
├─ PIN hashing unchanged (scrypt strength)
└─ Session expiration enforced (time limit)
```

---

# CONCLUSION

**This map completes the G3 architectural design without code changes.**

The recommended model preserves the proven TATI ID + PIN authentication and ChildSession architecture while adding Firebase identity resolution as a supplementary layer prepared for future phases.

Key findings:
1. **Supabase remains the authentication authority** (TATI ID + PIN)
2. **ChildSession remains the application session** (HTTP-only cookie, 30-min TTL)
3. **Firebase provides identity mapping** (childProfileId ↔ firebaseUid)
4. **Server-side resolution only** (no Firebase exposure to browser)
5. **Graceful degradation** (Firebase unavailability doesn't break child auth)
6. **No breaking changes** (existing learner experience identical)
7. **Prepared for G4+** (types, functions, architecture ready)

**Status**: Ready for implementation phase (G3 coding)

---
