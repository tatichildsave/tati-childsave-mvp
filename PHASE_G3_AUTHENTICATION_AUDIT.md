# PHASE G3 READ-ONLY AUTHENTICATION AUDIT
## Comprehensive Analysis of Existing TATI Child Authentication System

**Audit Date**: 2025-01-24  
**Status**: Complete  
**Scope**: Read-only analysis (no modifications)

---

## 1. EXECUTIVE SUMMARY

The TATI application currently implements a single, **Supabase-only** child authentication system using:

```
TATI ID (TATI-XXXXXXXX)
  ↓
PIN (4-6 digits)
  ↓
Supabase verification (child_profiles + child_credentials)
  ↓
ChildSession (HTTP-only cookie, 30-min TTL)
  ↓
Learner routes + child content
```

**Key Findings**:
- ✅ Existing system is secure and well-structured
- ✅ Session lifecycle is properly managed (creation, validation, expiration, revocation)
- ✅ No duplicate authentication abstractions
- ✅ Authorization checks are centralized (requireChildSession, requireChildResource)
- ✅ Clear separation between parent routes (/parent/*) and child routes (/child/*)
- ✅ Backend provider is already abstracted (getActiveBackendProviderName === "supabase")
- ⚠️ No Firebase integration yet (ready for G3)
- ⚠️ 40 pre-existing firestore.rules.test.ts failures (unrelated to authentication)

---

## 2. CURRENT AUTHENTICATION ARCHITECTURE

### 2.1 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Child Browser                                           │
│ ┌─────────────────────────────────────────────────┐    │
│ │ /child/login (SSR: false)                       │    │
│ │ Form: TATI ID + PIN                             │    │
│ └──────────────────┬──────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Server Functions (createServerFn)                       │
│ ┌─────────────────────────────────────────────────┐    │
│ │ childLogin()                                    │    │
│ │ - Validates TATI ID format                      │    │
│ │ - Queries child_profiles by tati_id             │    │
│ │ - Verifies PIN hash (scrypt)                    │    │
│ │ - Creates child_sessions with token_hash        │    │
│ │ - Returns profile + token                       │    │
│ │ - Sets HTTP-only cookie: tati_child_session     │    │
│ └──────────────────┬──────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Supabase (Active Backend Provider)                      │
│ ┌─────────────────────────────────────────────────┐    │
│ │ Tables:                                         │    │
│ │ - child_profiles: id, tati_id, name, age, ...  │    │
│ │ - child_credentials: child_profile_id, pin_... │    │
│ │ - child_sessions: id, child_profile_id, token..│    │
│ └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Child Browser - Authenticated                           │
│ ┌─────────────────────────────────────────────────┐    │
│ │ tati_child_session cookie (HTTP-only)           │    │
│ │ beforeLoad guard: getChildSession()             │    │
│ │ ▼                                               │    │
│ │ /child/home                                     │    │
│ │ /child/learn                                    │    │
│ │ /child/scenario/$scenarioId                     │    │
│ │ /child/lesson.$lessonId                         │    │
│ └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Session Lifecycle

#### **Phase 1: Login**

**File**: `src/lib/auth/child-auth.functions.ts`

```typescript
export const childLogin = createServerFn({ method: "POST" })
  .validator(loginInput)
  .handler(async ({ data }) => {
    // 1. Verify credential via Supabase
    const childId = await verifyChildCredential(data.tatiId, data.pin);
    if (!childId) throw new Error(genericFailure);

    // 2. Create session in child_sessions table
    const { token, session } = await createChildSession(childId);

    // 3. Load child profile
    const profile = await loadChildProfile(childId);
    if (!profile) {
      await revokeChildSession(session.id);
      throw new Error(genericFailure);
    }

    // 4. Store token in HTTP-only cookie (30 min TTL)
    setCookie(COOKIE_NAME, token, cookieOptions(30 * 60));
    return { profile };
  });
```

**ChildSession Creation** (`src/lib/auth/child-identity.server.ts`):

```typescript
export async function createChildSession(childProfileId: string) {
  const token = randomBytes(32).toString("base64url");        // 256-bit random
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);  // +30 min
  
  const { data, error } = await db()
    .from("child_sessions")
    .insert({
      child_profile_id: childProfileId,
      token_hash: sessionTokenHash(token),  // SHA256(token)
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id, child_profile_id, created_at, expires_at, revoked_at")
    .single();
  
  if (error) throw error;
  return { token, session: data as ChildSessionRow };
}
```

**Browser State After Login**:
```
Cookie: tati_child_session = base64url(256-bit random)
Secure: HTTP-only, SameSite=Lax
MaxAge: 30 minutes
Path: /
```

---

#### **Phase 2: Authorization (Every Request)**

**File**: `src/lib/auth/child-auth.functions.ts`

```typescript
export const getChildSession = createServerFn({ method: "GET" }).handler(async () => {
  // 1. Read cookie from request
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;

  // 2. Validate session via Supabase query
  const session = await validateChildSession(token);
  if (!session) {
    setCookie(COOKIE_NAME, "", cookieOptions(0));  // Clear cookie
    return null;
  }

  // 3. Load profile
  const profile = await loadChildProfile(session.child_profile_id);
  if (!profile) return null;

  // 4. Return context to route
  return { profile, sessionId: session.id, expiresAt: session.expires_at };
});
```

**Session Validation** (`src/lib/auth/child-identity.server.ts`):

```typescript
export async function validateChildSession(token: string) {
  if (!token || token.length < 32) return null;

  const { data, error } = await db()
    .from("child_sessions")
    .select("id, child_profile_id, created_at, expires_at, revoked_at")
    .eq("token_hash", sessionTokenHash(token))  // SHA256(token) lookup
    .maybeSingle();

  if (error || !data) return null;

  const session = data as ChildSessionRow;
  
  // Validate expiration
  if (session.revoked_at) return null;
  if (Date.parse(session.expires_at) <= Date.now()) return null;

  return { kind: "child" as const, ...session };
}
```

**ChildSession Type** (`src/lib/auth/authorization.server.ts`):

```typescript
export type ChildSession = {
  kind: "child";
  childId: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};
```

---

#### **Phase 3: Child Activity Authorization**

**File**: `src/lib/auth/child-learning.functions.ts`

```typescript
export const assertChildActivity = createServerFn({ method: "GET" })
  .validator(z.object({ 
    itemType: z.enum(["assessment", "lesson", "scenario", "reflection"]),
    itemId: z.string().min(1).max(128) 
  }))
  .handler(async ({ data }) => {
    // 1. Get current child from session cookie
    const childId = await currentChildId();

    // 2. Verify item exists in track
    if (!trackItemExists(data.itemType, data.itemId)) {
      throw new Error("That item is not available.");
    }

    // 3. Load and return child learning data
    return await getChildLearningData();
  });
```

**Track Item Verification**:
```typescript
function trackItemExists(itemType: string, itemId: string): boolean {
  const track = getTrack("save");  // TATI Junior SAVE track
  return track.sequence.some((item) => 
    item.kind === itemType && item.id === itemId
  );
}
```

---

#### **Phase 4: Logout**

**File**: `src/lib/auth/child-auth.functions.ts`

```typescript
export const childLogout = createServerFn({ method: "POST" }).handler(async () => {
  // 1. Read cookie
  const token = getCookie(COOKIE_NAME);
  
  // 2. Validate and revoke session
  if (token) {
    const session = await validateChildSession(token);
    if (session) await revokeChildSession(session.id);
  }

  // 3. Clear cookie
  setCookie(COOKIE_NAME, "", cookieOptions(0));
  return { ok: true };
});
```

**Session Revocation** (`src/lib/auth/child-identity.server.ts`):

```typescript
export async function revokeChildSession(sessionId: string): Promise<void> {
  const { error } = await db()
    .from("child_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);  // Idempotent: only update if not already revoked
  if (error) throw error;
}
```

---

### 2.3 Route Protection

**File**: `src/routes/child/route.tsx`

```typescript
export const Route = createFileRoute("/child")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/child/login") return;  // Skip guard for login

    // Call getChildSession before rendering any /child/* route
    const session = await getChildSession();
    if (!session) throw redirect({ to: "/child/login" });
    
    return { childSession: session };
  },
  component: ChildLayout,
});
```

**All child routes inherit this guard**:
- `/child/home`
- `/child/learn`
- `/child/scenario/$scenarioId`
- `/child/lesson.$lessonId`
- etc.

**Route Structure**:
```
/child (protected)
  ├── /login (public, SSR: false)
  ├── /home
  ├── /learn
  ├── /scenario/$scenarioId
  ├── /lesson.$lessonId
  └── ... (all require ChildSession)
```

---

## 3. EXISTING SECURITY MODEL

### 3.1 PIN Hashing

**Algorithm**: scrypt (time-hardened key derivation)

**File**: `src/lib/auth/child-identity.server.ts`

```typescript
const SCRYPT_COST = 16_384;           // N=2^14
const SCRYPT_BLOCK_SIZE = 8;          // r=8
const SCRYPT_PARALLELIZATION = 1;     // p=1
const SCRYPT_KEY_LENGTH = 64;         // 512 bits

export async function hashChildPin(pin: string): Promise<string> {
  validatePin(pin);
  const salt = randomBytes(16);        // 128-bit random salt
  
  const derivedKey = await deriveKey(pin, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
  
  // Format: scrypt$16384$8$1$<salt>$<derivedKey>
  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}
```

**Verification** (constant-time comparison):

```typescript
export async function verifyChildPin(pin: string, encodedHash: string): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) return false;
  
  const [algorithm, cost, blockSize, parallelization, saltText, keyText] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltText || !keyText) return false;
  
  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(keyText, "base64url");
  
  const derivedKey = await deriveKey(pin, salt, expected.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
  });
  
  // Constant-time comparison (prevent timing attacks)
  return derivedKey.length === expected.length && 
         timingSafeEqual(derivedKey, expected);
}
```

**Security Properties**:
- ✅ Salt: 128-bit random per PIN
- ✅ KDF: scrypt (memory-hard, resistant to GPU/ASIC attacks)
- ✅ Cost: N=2^14 (16,384) iterations
- ✅ Key Length: 512 bits
- ✅ Comparison: constant-time (via `timingSafeEqual`)
- ✅ Never logged or exposed in errors

---

### 3.2 Session Token Hashing

**Storage**: Token hash in database, token in HTTP-only cookie

```typescript
function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
```

**Security Properties**:
- ✅ Token: 256-bit random (32 bytes, base64url)
- ✅ Storage: SHA256 hash of token in DB (token never stored plaintext)
- ✅ Transmission: HTTP-only cookie (JavaScript cannot access)
- ✅ Protection: SameSite=Lax (CSRF protection)
- ✅ TTL: 30 minutes absolute expiration
- ✅ TLS in production (via secure: NODE_ENV === "production")

---

### 3.3 Authorization Enforcement

**File**: `src/lib/auth/authorization.server.ts`

```typescript
export function requireChildSession(context: AuthContext, childId?: string): ChildSession {
  if (context.kind !== "child") 
    throw new AuthorizationError("A child session is required.");
  
  if (context.revokedAt) 
    throw new AuthorizationError("This child session has been revoked.");
  
  if (Date.parse(context.expiresAt) <= Date.now()) 
    throw new AuthorizationError("This child session has expired.");
  
  if (childId && context.childId !== childId) 
    throw new AuthorizationError("This child session cannot access another learner.");
  
  return context;
}
```

**Enforced Invariants**:
1. Child sessions **cannot elevate to parent/facilitator/admin**
2. Expired sessions **automatically rejected**
3. Revoked sessions **immediately rejected**
4. Child A **cannot access Child B's data** (optional childId parameter)

---

## 4. LEARNER ROUTES & OPERATIONS

### 4.1 Route Tree

```
/child (ChildLayout - beforeLoad guard)
├── /login (public, SSR: false)
│   ├── POST childLogin({ tatiId, pin })
│   └── Navigate to /child/home on success
├── /home (protected)
│   ├── GET getChildSession()
│   └── Display learner dashboard
├── /learn (protected)
│   ├── GET getChildLearningData()
│   └── Display track/progress
├── /scenario/$scenarioId (protected)
│   ├── GET assertChildActivity({ itemType: "scenario", itemId })
│   ├── GET loadChildScenario()
│   ├── POST saveChildScenario()
│   └── ScenarioPlayer component
├── /lesson.$lessonId (protected)
│   ├── GET assertChildActivity({ itemType: "lesson", itemId })
│   └── LessonPlayer component
└── ... (other learner routes)
```

### 4.2 Child Learning Operations

**File**: `src/lib/auth/child-learning.functions.ts`

#### **Get Learning Data**

```typescript
export const getChildLearningData = createServerFn({ method: "GET" }).handler(async () => {
  const childId = await currentChildId();
  
  const [profile, progressResult, competencyResult, achievementResult, assessmentResult] =
    await Promise.all([
      loadProfile(childId),
      supabase.from("journey_progress")
        .select("id, track_id, item_type, item_id, status, score, max_score, details, created_at, updated_at")
        .eq("child_profile_id", childId)
        .eq("track_id", "save")
        .order("updated_at", { ascending: true }),
      supabase.from("learner_competencies")
        .select("competency_id, score, level, evidence")
        .eq("child_profile_id", childId),
      supabase.from("learner_achievements")
        .select("achievement_id, celebrated, awarded_at")
        .eq("child_profile_id", childId),
      supabase.from("assessment_attempts")
        .select("assessment_id, assessment_type, points, max_points, competency_scores, completed_at")
        .eq("child_profile_id", childId),
    ]);

  return {
    profile,
    progress,
    competencies,
    achievements,
    assessments,
  };
});
```

**Returns**:
```typescript
type ChildLearningData = {
  profile: ChildLearningProfile;        // child_profiles row
  progress: ProgressEvent[];            // journey_progress rows
  competencies: CompetencyScore[];      // learner_competencies rows
  achievements: Achievement[];          // learner_achievements rows
  assessments: AssessmentAttempt[];     // assessment_attempts rows
};
```

#### **Assert Child Activity**

```typescript
export const assertChildActivity = createServerFn({ method: "GET" })
  .validator(z.object({
    itemType: z.enum(["assessment", "lesson", "scenario", "reflection"]),
    itemId: z.string().min(1).max(128),
  }))
  .handler(async ({ data }) => {
    // 1. Validate session
    const childId = await currentChildId();

    // 2. Verify item exists in track sequence
    if (!trackItemExists(data.itemType, data.itemId)) {
      throw new Error("That item is not available.");
    }

    // 3. Return learning data
    return await getChildLearningData();
  });
```

---

### 4.3 Scenario & Lesson Persistence

**Load Scenario State**:

```typescript
export const loadChildScenario = createServerFn({ method: "GET" })
  .validator(z.object({ scenarioId: z.string().min(1).max(128) }))
  .handler(async ({ data }) => {
    const childId = await currentChildId();
    const { data: scenario, error } = await supabase
      .from("scenario_sessions")
      .select("state")
      .eq("child_profile_id", childId)
      .eq("scenario_id", data.scenarioId)
      .maybeSingle();
    
    if (error || !scenario) return { state: undefined };
    return { state: scenario.state };
  });
```

**Save Scenario State**:

```typescript
export const saveChildScenario = createServerFn({ method: "POST" })
  .validator(scenarioStateInput)
  .handler(async ({ data }) => {
    const childId = await currentChildId();
    const { data: result, error } = await supabase
      .from("scenario_sessions")
      .upsert({
        child_profile_id: childId,
        scenario_id: data.scenarioId,
        state: data,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    
    if (error) throw error;
    return { sessionId: result.id };
  });
```

---

## 5. SUPABASE TABLES & SCHEMA

### 5.1 Child Authentication Tables

#### **child_profiles**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| family_id | UUID | Foreign key to families |
| tati_id | TEXT | Unique (TATI-XXXXXXXX format) |
| name | TEXT | Child name |
| age | INT | Age (8-12 for Junior) |
| avatar | TEXT | Avatar selection |
| tier | TEXT | "junior", "teen", "plus" |
| curriculum_level | TEXT | null or specific level |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### **child_credentials**

| Column | Type | Notes |
|--------|------|-------|
| child_profile_id | UUID | Primary key, FK to child_profiles |
| pin_hash | TEXT | scrypt$cost$blockSize$parallelization$salt$derivedKey |
| active | BOOLEAN | Is credential active |
| revoked_at | TIMESTAMP | null or timestamp |
| rotated_at | TIMESTAMP | Last rotation time |

#### **child_sessions**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| child_profile_id | UUID | Foreign key to child_profiles |
| token_hash | TEXT | Unique (SHA256(token)) |
| created_at | TIMESTAMP | Session creation time |
| expires_at | TIMESTAMP | Expiration time (+30 min) |
| revoked_at | TIMESTAMP | null or revocation time |

### 5.2 Child Learning Tables

#### **journey_progress**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| child_profile_id | UUID | Foreign key to child_profiles |
| track_id | TEXT | "save", "teen-track", etc. |
| item_type | TEXT | "lesson", "scenario", "assessment", "reflection" |
| item_id | TEXT | Track item ID |
| status | TEXT | "started", "completed", "abandoned" |
| score | INT | Points earned (nullable) |
| max_score | INT | Maximum possible points (nullable) |
| details | JSONB | Item-specific metadata |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### **learner_competencies**

| Column | Type | Notes |
|--------|------|-------|
| child_profile_id | UUID | FK to child_profiles |
| competency_id | TEXT | Competency identifier |
| score | INT | Competency score |
| level | TEXT | "novice", "practitioner", "expert" |
| evidence | JSONB | Proof of competency |

#### **learner_achievements**

| Column | Type | Notes |
|--------|------|-------|
| child_profile_id | UUID | FK to child_profiles |
| achievement_id | TEXT | Badge identifier |
| celebrated | BOOLEAN | Has been shown to child |
| awarded_at | TIMESTAMP | Award date |

#### **assessment_attempts**

| Column | Type | Notes |
|--------|------|-------|
| child_profile_id | UUID | FK to child_profiles |
| assessment_id | TEXT | Assessment identifier |
| assessment_type | TEXT | "pre-test", "scenario-quiz", "reflection" |
| points | INT | Points earned |
| max_points | INT | Maximum points |
| competency_scores | JSONB | Per-competency breakdown |
| completed_at | TIMESTAMP | Completion time |

#### **scenario_sessions**

| Column | Type | Notes |
|--------|------|-------|
| child_profile_id | UUID | FK to child_profiles |
| scenario_id | TEXT | Scenario identifier |
| state | JSONB | Full scenario engine state |
| updated_at | TIMESTAMP | Last update |

---

## 6. BACKEND PROVIDER ABSTRACTION

**File**: `src/lib/backend/provider.ts`

```typescript
const availableProviders = new Set<BackendProviderName>(["supabase", "firebase"]);

/** Supabase remains the active provider until an explicit migration cutover. */
export function getActiveBackendProviderName(): BackendProviderName {
  return "supabase";  // NEVER CHANGED DURING G3
}
```

**Service Interface** (`src/lib/backend/contracts.ts`):

```typescript
export interface ChildSessionService {
  login(tatiId: string, pin: string): Promise<{ profile: ChildProfile; session: ChildSession }>;
  getCurrentSession(): Promise<{ profile: ChildProfile; session: ChildSession } | null>;
  logout(): Promise<void>;
}

export interface TatiApplicationServices {
  provider: BackendProviderName;
  childSessions: ChildSessionService;
  // ... (other services)
}
```

**Current Implementation**: Supabase provides all services

---

## 7. AUTHENTICATION CONTEXT & TYPES

**File**: `src/lib/auth/authorization.server.ts`

```typescript
// User context (parent, facilitator, admin)
export type AuthenticatedUser = {
  kind: "user";
  userId: string;
  roles: readonly AppRole[];  // "parent" | "facilitator" | "admin"
};

// Child context (learner)
export type ChildSession = {
  kind: "child";
  childId: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

// Unified context
export type AuthContext = AuthenticatedUser | ChildSession;
```

**Authorization Helpers**:

```typescript
export function requireChildSession(context: AuthContext, childId?: string): ChildSession
export function requireChildResource(context: AuthContext, resourceChildId: string): ChildSession
export function requireAuthenticatedUser(context: AuthContext): AuthenticatedUser
export function requireParent(context: AuthContext): AuthenticatedUser
```

---

## 8. CURRENT ARCHITECTURE STRENGTHS

✅ **Session Management**
- Secure token generation (256-bit random)
- Token hashing in database (SHA256)
- HTTP-only cookie transmission
- Clear expiration (30 min TTL)
- Revocation support
- Constant-time comparison

✅ **PIN Security**
- Strong hashing (scrypt with cost 2^14)
- Random salt (128-bit)
- Large key length (512 bits)
- Prevents dictionary/brute-force attacks

✅ **Authorization Enforcement**
- Type-safe context (AuthContext discriminated union)
- Expiration checked on every request
- Revocation checked on every request
- Child cannot elevate role
- Cross-child access prevented

✅ **Child/Parent Separation**
- /child/* routes (protected by ChildSession)
- /parent/* routes (protected by AuthenticatedUser)
- Cannot confuse roles
- Separate authentication paths

✅ **Developer Experience**
- Clear naming conventions (requireChildSession, requireChildResource, etc.)
- Type-safe authorization
- Centralized error handling (AuthorizationError)
- No duplicate abstractions

---

## 9. READY FOR G3 INTEGRATION

### What Can Be Extended (NOT Changed)

1. **ChildSession Type** - Can add Firebase UID field
2. **Authorization Helpers** - Can add Firebase-aware variants
3. **Child Learning Functions** - Can add Firebase auth checks
4. **Routes** - Can add Firebase token verification

### What Must Remain Unchanged

1. ✅ **Existing TATI ID + PIN flow** (remains primary for UX)
2. ✅ **Supabase tables** (continue to store all application data)
3. ✅ **HTTP-only session cookies** (continue to manage sessions)
4. ✅ **getActiveBackendProviderName()** (remains "supabase")
5. ✅ **Learner route UX** (no redesign, Firebase behind the scenes)
6. ✅ **Parent authentication** (unchanged)

### G3 Responsibilities

1. **Server-Side Bridge**: Map TATI ChildId ↔ Firebase UID (via G2 functions)
2. **Enhanced Context**: Add Firebase context to AuthenticatedChildContext
3. **Dual-Mode Operation**: Accept both Supabase session + Firebase token
4. **Authorization Layer**: Accept Firebase auth headers, resolve to child context
5. **Test Coverage**: Verify both authentication paths work correctly

---

## 10. IDENTIFIED COMPATIBILITY LAYER STRATEGY

For G3, build **without breaking existing functionality**:

```
Current (Supabase-Only):
TATI ID + PIN → ChildSession → Learner Routes

Target (With Firebase Bridge):
TATI ID + PIN → ChildSession + Firebase Identity
             ↘ Server resolves both → AuthenticatedChildContext
               ↓
               Learner Routes (auth-agnostic)
```

**Implementation Approach**:
1. Extend `ChildSession` OR create `FirebaseChildContext` (new type)
2. Add optional Firebase UID to context
3. Create `getAuthenticatedChild()` that handles both authentication paths
4. Protect routes with flexible authorization (accept either path)
5. Keep `childLogin()` unchanged initially
6. Add Firebase identity creation inside `childLogin()` flow
7. Test with emulators

---

## 11. KNOWN EXISTING ISSUES (NOT G3 RELATED)

### Pre-Existing Test Failures

**File**: `tests/firebase/firestore.rules.test.ts`  
**Failures**: 40 out of 45 tests  
**Root Cause**: Auth emulator users (testuser-a, testuser-b) not created beforehand  
**Error**: `auth/user-not-found` when firestore.rules.test.ts tries to login  
**Status**: Pre-G2, unrelated to child authentication  
**Impact**: None on child learner flow

---

## 12. AUDIT CONCLUSION

**The existing TATI child authentication system is:**

✅ Secure (scrypt PIN hashing, token randomization, constant-time comparison)  
✅ Well-Structured (clear separation of concerns, type-safe authorization)  
✅ Ready for Extension (existing abstractions are appropriate for G3)  
✅ NOT blocking G3 (no refactoring needed, build on top)  

**G3 should:**

1. ✅ Keep existing TATI ID + PIN UX (age-appropriate, familiar)
2. ✅ Use existing `ChildSession` management (proven, secure)
3. ✅ Add Firebase identity layer on the server (via G2 functions)
4. ✅ Create bridge between Supabase session + Firebase auth
5. ✅ Extend authorization checks to accept Firebase tokens
6. ✅ Test with both authentication paths working in parallel
7. ✅ Keep Supabase as active backend provider (unchanged)

**No Breaking Changes Required** — only additive integration.

---

## AUDIT COMPLETE

This audit provides the foundation for G3 implementation. Ready to proceed with design phase.

**Next Step**: Create AUTHENTICATION MAP (Section 5 of G3 prompt) based on these findings.
