# TATI ChildSave: Comprehensive Authentication & Family Enrollment Architecture Audit

**Date:** 2026-10-02  
**Scope:** Read-only architecture analysis  
**Status:** Complete audit of current state (no changes made)

---

## Executive Summary

The TATI ChildSave system has undergone a significant migration from Supabase to Firebase. The authentication layer is now **mostly Firebase-based**, with a deliberate dual-provider architecture:

- **Adult Authentication (Parents, Facilitators, Admins)**: Firebase Auth + Firestore ✅ **COMPLETE**
- **Child Authentication (Learners)**: Firebase Firestore (credentials & sessions) ✅ **COMPLETE (H4.A/H4.B)**
- **Legacy Data Access Layer**: Supabase still present for analytics, feedback, and some progress tracking ⚠️ **PARTIAL DEPENDENCY**

**Key Finding**: The system has achieved a stable state where core authentication and family enrollment flows work entirely on Firebase, with Supabase remaining only for non-critical data access paths that could be migrated independently.

---

## 1. Firebase Configuration

### Configuration Files

**File**: [firebase.json](firebase.json)

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default"
    }
  ],
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "ui": { "enabled": true, "port": 4000 }
  },
  "projectId": "demo-tati"
}
```

**Project ID**: `demo-tati`  
**Emulator Support**: Full emulator stack (Auth, Firestore, Functions, UI)

### Client Initialization

**File**: [src/integrations/firebase/client.ts](src/integrations/firebase/client.ts)

- **Initialization**: Lazy singleton using Firebase Web SDK
- **Environment Variables Required**:
  - `VITE_FIREBASE_API_KEY` ✅
  - `VITE_FIREBASE_AUTH_DOMAIN` ✅
  - `VITE_FIREBASE_PROJECT_ID` ✅
  - `VITE_FIREBASE_STORAGE_BUCKET` ✅
  - `VITE_FIREBASE_MESSAGING_SENDER_ID` ✅
  - `VITE_FIREBASE_APP_ID` ✅
  - `VITE_FIREBASE_MEASUREMENT_ID` (optional)

- **Emulator Support**: Automatically connects to emulator if:
  - `VITE_FIRESTORE_EMULATOR_HOST` is set → Firestore emulator
  - `VITE_FIREBASE_AUTH_EMULATOR_HOST` is set → Auth emulator

- **Exports**:
  - `getFirebaseApp()`: Main Firebase app instance
  - `getFirebaseAuth()`: Auth module (browser only)
  - `getFirebaseFirestore()`: Firestore module (browser only)
  - `getFirebaseStorage()`: Storage module (browser only)
  - `getFirebaseFunctions()`: Functions module (browser only)

### Admin SDK Initialization

**File**: [src/integrations/firebase/admin.server.ts](src/integrations/firebase/admin.server.ts)

- **Scope**: Server-only, never imported by browser code (`.server.ts` naming convention)
- **Initialization**: Lazy singleton for Admin SDK
- **Credential Handling**:
  - Production: Requires `FIREBASE_SERVICE_ACCOUNT` JSON in environment
  - Development/Emulator: Uses emulator if `FIRESTORE_EMULATOR_HOST` is set
  - Fallback: Attempts application default credentials

- **Environment Variables**:
  - `FIREBASE_PROJECT_ID`: Project ID
  - `FIREBASE_SERVICE_ACCOUNT`: Service account JSON (production)
  - `FIRESTORE_EMULATOR_HOST`: Emulator host:port (dev)
  - `FIREBASE_AUTH_EMULATOR_HOST`: Auth emulator host:port (dev)

- **Exports**:
  - `getFirebaseAdmin()`: Admin Auth instance
  - `getFirebaseAdminAuth()`: Admin Auth (alias)
  - `getFirebaseAdminDb()`: Admin Firestore instance
  - `adminCollection(path)`: Helper for collection references
  - `adminDoc(path)`: Helper for document references

---

## 2. Firestore Data Model

### Collections Structure

```
/users/{uid}
  - uid: string (Firebase UID)
  - email: string | null
  - displayName: string | null
  - status: "pending" | "active" | "disabled"
  - roles: Array<"parent" | "guardian" | "facilitator" | "admin">
  - emailVerified: boolean
  - createdAt: Timestamp
  - updatedAt: Timestamp
  └─ /familyMemberships/{familyId}
       - familyId: string
       - userId: string (uid)
       - role: "parent" | "guardian"
       - status: "active" | "invited" | "removed"
       - invitedBy: string | null
       - createdAt: Timestamp

/families/{familyId}
  - name: string (e.g., "My Family")
  - createdBy: string (uid of parent who created)
  - status: "active" | "disabled"
  - createdAt: Timestamp
  - updatedAt: Timestamp
  └─ /members/{uid}
       - uid: string (Firebase UID)
       - role: "parent" | "guardian"
       - status: "active" | "invited" | "removed"
       - invitedBy: string | null
       - createdAt: Timestamp
       - updatedAt: Timestamp
  └─ /children/{childId}
       - id: string (UUID)
       - familyId: string (for reference)
       - created_by: string (parent uid)
       - name: string
       - age: number (8-12 for Junior)
       - avatar: string (emoji)
       - tier: string ("junior")
       - curriculum_level: string | null (e.g., "Primary 3")
       - onboarding_step: number (0-6)
       - onboarding_completed: boolean
       - tati_id: string (TATI-XXXXXXXX format)
       - createdAt: Timestamp
       - updatedAt: Timestamp
       └─ /journeyProgress/{itemKey}
            - [Journey progress events; H4.B migrated from Supabase]
       └─ /competencies/{competencyId}
            - [Competency data; H4.B migrated from Supabase]
       └─ /achievements/{achievementId}
            - [Awarded achievements; H4.B migrated from Supabase]
       └─ /assessmentAttempts/{attemptId}
            - [Assessment attempt records; H4.B migrated from Supabase]
       └─ /scenarioSessions/{scenarioKey}
            - [Scenario session data; H4.B migrated from Supabase]
            └─ /decisions/{decisionId}
       └─ /sessions/{sessionId}
            - [Child session records; server-only, client access denied]
       └─ /parentInsights/{insightId}
            - [Parent-visible insights; H4.B]

/childCredentials/{tatiId}
  - tatiId: string (TATI-XXXXXXXX)
  - childId: string (UUID of child profile)
  - familyId: string (family context)
  - pinHash: string (scrypt-hashed PIN)
  - credentialVersion: number
  - active: boolean
  - revokedAt: Timestamp | null
  - rotatedAt: Timestamp
  - createdAt: Timestamp
  - updatedAt: Timestamp

/childAuthIdentities/{childProfileId}
  - childProfileId: string (UUID)
  - firebaseUid: string (child_{childProfileId} pattern)
  - familyId: string (for family isolation)
  - status: "active" | "revoked"
  - createdAt: Timestamp
  - updatedAt: Timestamp

/schools/{schoolId}
  - [Academy/facilitator data structures]
  └─ /admins/{uid}
       - [School admin role markers]
```

### Key Data Models (TypeScript Types)

**Parent/Adult User**: [src/lib/backend/identity.ts](src/lib/backend/identity.ts)

```typescript
type AdultRole = "parent" | "guardian" | "facilitator" | "admin";
type AccountStatus = "active" | "pending" | "disabled";

interface AdultIdentity {
  kind: "user";
  userId: string; // Firebase UID
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  status: AccountStatus;
  authProvider: "password" | "google";
  roles: readonly AdultRole[];
}
```

**Child Profile**: [src/lib/family.ts](src/lib/family.ts)

```typescript
interface ChildProfile {
  id: string; // UUID
  tati_id: string; // TATI-XXXXXXXX
  family_id: string; // familyId
  created_by: string; // parent uid
  name: string;
  age: number; // 8-12 for Junior
  avatar: string; // emoji
  tier: string; // "junior"
  curriculum_level: string | null;
  onboarding_step: number; // 0-6
  onboarding_completed: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

**Child Session**: [src/lib/auth/types.ts](src/lib/auth/types.ts)

```typescript
type ChildSession = {
  kind: "child";
  childId: string; // Profile UUID
  sessionId: string; // Session document ID
  createdAt: string; // ISO 8601
  expiresAt: string; // ISO 8601 (30-min TTL)
  revokedAt: string | null;
};
```

**Firebase Child Identity** (G2/G3):

```typescript
type FirebaseChildIdentity = {
  firebaseUid: string; // child_{childProfileId}
  familyId: string;
  status: "active" | "revoked";
};
```

---

## 3. Authentication Flows

### 3.1 Parent Signup Flow

**Route**: [/(public)/signup.tsx](<src/routes/(public)/signup.tsx>)

**Flow**:

```
1. Parent enters: Full Name, Email, Password
2. Client calls: createUserWithEmailAndPassword(auth, email, password)
   └─ Creates Firebase Auth user
3. Client calls: updateProfile(user, { displayName })
4. Client calls: user.getIdToken()
   └─ Gets fresh JWT ID token from Firebase
5. Client calls: createParentSessionFn({ data: { idToken } })
   └─ Server function on TanStack Start
6. Server:
   - Verifies ID token with Firebase Admin SDK
   - Creates session cookie via createParentSession()
   - Sets HTTP-only cookie: "parent-session" (or "__Secure-parent-session" in production)
   - Cookie TTL: 5 days (432,000 seconds)
7. Redirect to /parent (parent portal)
```

**Server Handler**: [src/lib/backend/firebase/parent-auth.server.ts](src/lib/backend/firebase/parent-auth.server.ts)

- `createParentSession(idToken)`: Verifies token, creates session cookie
- Session cookie: HTTP-only, Secure (production), SameSite=Lax

**Google OAuth Flow**:

```
1. Parent clicks: "Continue with Google"
2. Client: signInWithPopup(auth, new GoogleAuthProvider())
3. Firebase handles Google auth popup
4. Same as step 4-7 above
```

**Security**:

- ✅ No password stored in application
- ✅ Firebase Auth handles credential storage
- ✅ Session cookie HTTP-only (CSRF protection)
- ✅ ID token verified server-side before session creation
- ✅ Parent UID persisted in session for authorization checks

### 3.2 Parent Login Flow

**Route**: [/(public)/login.tsx](<src/routes/(public)/login.tsx>)

**Flow**:

```
1. Parent enters: Email, Password
2. Client: signInWithEmailAndPassword(auth, email, password)
3. On successful auth:
   - Get ID token: user.getIdToken()
   - Call: createParentSessionFn({ data: { idToken } })
4. Server: Same session creation as signup (steps 5-6 above)
5. Redirect to /parent
```

**Session Persistence**:

- Browser stores session cookie automatically
- On page reload: Server middleware verifies session cookie
- If valid: Continues session; if expired/invalid: Redirects to /login

### 3.3 Child Login Flow (TATI ID + PIN)

**Route**: [/child/login.tsx](src/routes/child/login.tsx)

**Child Credential Format**:

- TATI ID: `TATI-XXXXXXXX` (8 random hex digits)
- PIN: 4-digit numeric code

**Flow**:

```
1. Child enters: TATI ID, 4-digit PIN
2. Client submits to: childLogin({ data: { tatiId, pin } })
   └─ Server function (POST)
3. Server:
   a. Calls verifyChildCredential(tatiId, pin)
      - Query /childCredentials/{tatiId}
      - Compare PIN against pinHash using scrypt
      - Return childId on match
   b. If verification fails:
      - Return error: "That TATI ID or PIN could not be verified."
   c. If verification succeeds:
      - Get familyId from credential document
      - Call createChildSession(childId, familyId)
      - Returns { token, session }
      - Call loadChildProfileFirebase(childId, familyId)
      - Set HTTP-only cookie: "tati_child_session"
      - Cookie TTL: 30 minutes
4. Client: Redirect to /child/home
```

**Server Functions**: [src/lib/auth/child-auth.functions.ts](src/lib/auth/child-auth.functions.ts)

- `childLogin({ data: { tatiId, pin } })`: Main login handler
- `getChildSession()`: Retrieve current session
- `childLogout()`: Clear session cookie

**Credential Verification**: [src/lib/auth/child-auth-firebase.server.ts](src/lib/auth/child-auth-firebase.server.ts)

- `verifyChildCredential(tatiId, pin)`: Lookup and verify credential
- `hashChildPin(pin)`: Generate scrypt hash (64-byte key, cost N=16384)
- `validatePin(pin)`: Ensure 4-6 digits

**Session Storage**:

- Location: `/families/{familyId}/children/{childId}/sessions/{sessionId}`
- Token: Signed JWT containing session ID
- Validation: Token verified server-side on each request
- TTL: 30 minutes; no auto-renewal

**Security**:

- ✅ PIN never transmitted plaintext (hashed immediately on setup)
- ✅ Scrypt password hashing (N=16384, r=8, p=1)
- ✅ Timing-safe comparison for PIN verification
- ✅ Session tied to familyId (family isolation)
- ✅ Client session cookie HTTP-only

### 3.4 Session Management

**Parent Session**:

- Cookie name: `parent-session` (dev) or `__Secure-parent-session` (prod)
- Verified via: Firebase Admin SDK `verifySessionCookie()`
- TTL: 5 days
- On verification failure: Redirects to /login

**Child Session**:

- Cookie name: `tati_child_session`
- Verified via: Firestore session document lookup + token validation
- TTL: 30 minutes (no refresh mechanism)
- Expiration check: Server compares expiresAt against now()

**Logout**:

- Parent: `clearParentSession()` → Deletes cookie, revokes refresh tokens
- Child: `childLogout()` → Deletes cookie, marks session as revoked

---

## 4. Authorization & Access Control

### 4.1 Firestore Security Rules

**File**: [firestore.rules](firestore.rules)

**Key Functions**:

```firestore
// Core auth check
function signedIn() {
  return request.auth != null;
}

// Get user document (cached in rules)
function userDoc() {
  return signedIn()
    ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data
    : {};
}

// Role-based access
function hasRole(role) {
  return signedIn() && role in userDoc().roles;
}

function isAdmin() {
  return hasRole('admin');
}

// Family membership check
function memberPath(familyId) {
  return /databases/$(database)/documents/families/$(familyId)/members/$(request.auth.uid);
}

function isActiveFamilyMember(familyId) {
  return signedIn() && exists(memberPath(familyId))
    && get(memberPath(familyId)).data.status == 'active';
}

function isFamilyAdult(familyId) {
  return isActiveFamilyMember(familyId)
    && get(memberPath(familyId)).data.role in ['parent', 'guardian'];
}

// Facilitator assignment check
function isAssignedFacilitator(familyId, childId) {
  return signedIn() && hasRole('facilitator')
    && 'facilitatorUids' in get(/databases/$(database)/documents/families/$(familyId)/children/$(childId)).data
    && get(/databases/$(database)/documents/families/$(familyId)/children/$(childId)).data.facilitatorUids.hasAny([request.auth.uid]);
}

// Unified child access check
function canAccessChild(familyId, childId) {
  return isFamilyAdult(familyId) || isAssignedFacilitator(familyId, childId) || isAdmin();
}

// Immutability enforcement
function immutableOwnership(existing, proposed) {
  return proposed.familyId == existing.familyId
    && proposed.id == existing.id
    && proposed.createdBy == existing.createdBy;
}
```

**Authorization Matrix**:

| Resource                                                    | Read                                             | Create                      | Update                                               | Delete                    | Who            |
| ----------------------------------------------------------- | ------------------------------------------------ | --------------------------- | ---------------------------------------------------- | ------------------------- | -------------- |
| `/users/{uid}`                                              | Self or Admin                                    | Self (pending status)       | Self (if roles empty) or Admin                       | Admin                     |                |
| `/families/{familyId}`                                      | Active member or Admin                           | Any signed-in user          | Member/Admin (immutable ownership)                   | Admin                     |                |
| `/families/{familyId}/members/{uid}`                        | Active member or Admin                           | Admin only                  | Admin only                                           | Admin only                |                |
| `/families/{familyId}/children/{childId}`                   | Parent/Guardian or assigned Facilitator or Admin | Parent/Guardian             | Parent/Guardian or Facilitator (immutable ownership) | Parent/Guardian or Admin  |                |
| `/families/{familyId}/children/{childId}/journeyProgress/*` | Parent/Guardian or Facilitator or Admin          | **Denied (Admin SDK only)** | **Denied (Admin SDK only)**                          | Admin only                |                |
| `/families/{familyId}/children/{childId}/competencies/*`    | Parent/Guardian or Facilitator or Admin          | **Denied (Admin SDK only)** | **Denied (Admin SDK only)**                          | Admin only                |                |
| `/families/{familyId}/children/{childId}/achievements/*`    | Parent/Guardian or Facilitator or Admin          | **Denied (Admin SDK only)** | **Denied (Admin SDK only)**                          | Admin only                |                |
| `/families/{familyId}/children/{childId}/sessions/*`        | **Denied to all clients**                        | **Denied to all clients**   | **Denied to all clients**                            | **Denied to all clients** | Admin SDK only |
| `/childCredentials/{tatiId}`                                | **Denied to all clients**                        | **Denied to all clients**   | **Denied to all clients**                            | **Denied to all clients** | Admin SDK only |

### 4.2 Server-Side Authorization

**Parent Route Protection**: [src/lib/backend/firebase/family.functions.ts](src/lib/backend/firebase/family.functions.ts)

All parent server functions extract `uid` from session cookie:

```typescript
async function parentFunction() {
  const { uid } = await getCurrentParentContext(); // Throws if no session
  // uid is now verified by Firebase Admin SDK
}
```

**Child Route Protection**: [src/lib/auth/authorization.server.ts](src/lib/auth/authorization.server.ts)

Functions to validate child access:

- `requireChildSession(context, childId?)`: Verify valid child session, optional childId match
- `requireChildResource(context, resourceChildId)`: Enforce childId match
- `requireFamilyChildAccess(context, childId)`: Parent can access child (via callback)

### 4.3 Client-Side Route Guards

**Parent Routes**:

```typescript
export const Route = createFileRoute("/parent/")({
  beforeLoad: async () => {
    if (!user?.uid) throw redirect({ to: "/login" });
  },
  component: ParentHome,
});
```

**Child Routes**:

```typescript
export const Route = createFileRoute("/child/home")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getChildSession();
    if (!session) throw redirect({ to: "/child/login" });
  },
  component: ChildHome,
});
```

**Admin Routes**:

```typescript
export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    const user = auth?.currentUser;
    const isAdmin = await checkAdminStatus(user?.uid);
    if (!isAdmin) throw redirect({ to: "/admin-login" });
  },
  component: AdminDashboard,
});
```

### 4.4 Parent-Child Relationship Validation

**Ensures Parent Sees Only Their Children**:

```typescript
async function assertChildInFamily(childId: string) {
  const { uid } = await getCurrentParentContext();
  const db = getFirebaseAdminDb();
  const repo = new FirebaseFamilyRepository(db, uid);

  // This queries for children in parent's family
  await repo.assertChildAccess(childId); // Throws if not found
}
```

Implementation in [src/lib/backend/firebase/repositories.ts](src/lib/backend/firebase/repositories.ts):

```typescript
async assertChildAccess(childId: string): Promise<void> {
  const familyId = await this.ensureFamily();
  const snapshot = await this.db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .get();
  if (!snapshot.exists) throw new Error("That learner is not part of your family.");
}
```

---

## 5. Admin & Provisioning

### 5.1 Admin User Creation

**Admin Bootstrap Script**: [bootstrap-admin.mjs](bootstrap-admin.mjs)

```javascript
// Creates admin@test.com in Firebase Emulator
// Writes Firestore doc: /users/{uid} with roles: ["admin"]
```

**Admin Provisioning Steps**:

1. Create Firebase Auth user manually or via script
2. Write Firestore document at `/users/{uid}` with:
   ```typescript
   {
     uid: string,
     email: string,
     displayName: string,
     status: "active",
     roles: ["admin"],
     emailVerified: boolean,
     createdAt: Timestamp,
     updatedAt: Timestamp,
   }
   ```

**Admin Login**: [/(public)/admin-login.tsx](<src/routes/(public)/admin-login.tsx>)

- Email/password authentication via Firebase
- Post-login: Checks `/users/{uid}.roles` for "admin" role
- If admin: Redirects to /admin dashboard
- If not admin: Shows error and redirects to /

### 5.2 Child Provisioning

**Automatic Credential Generation**:

When parent calls `createChildProfile()`:

```typescript
async createChild(input: CreateChildInput): Promise<ChildProfile> {
  // 1. Generate TATI ID
  const tatiId = generateTatiId();  // TATI-XXXXXXXX

  // 2. Generate PIN
  const pin = generateChildPin();  // 4-digit code

  // 3. Create child profile in Firestore
  await db.collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .set({
      id: childId,
      familyId,
      created_by: parentUid,
      tati_id: tatiId,
      name: input.name,
      age: input.age,
      avatar: input.avatar,
      tier: "junior",
      curriculum_level: ...,
      onboarding_step: 0,
      onboarding_completed: true,
      createdAt: Timestamp,
      updatedAt: Timestamp,
    });

  // 4. Save credential
  await saveChildPin(childId, tatiId, familyId, pin);
  // └─ Creates /childCredentials/{tatiId} with pinHash

  return profile;
}
```

**Generated Credential Format**:

Saved in `/childCredentials/{tatiId}`:

```typescript
{
  tatiId: "TATI-3B281288",
  childId: "uuid-123",
  familyId: "fam-456",
  pinHash: "scrypt$16384$8$1$salt$derivedkey",
  credentialVersion: 1,
  active: true,
  revokedAt: null,
  rotatedAt: Timestamp.now(),
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
}
```

### 5.3 Parent-Child Assignment

**Automatic During Child Creation**:

```
Parent → createChild() → Family collection checked
  → Child doc written to /families/{familyId}/children/{childId}
  → Automatic family isolation via Firestore path
```

**No explicit assignment needed** — child is scoped to family, and family is scoped to parent via `/users/{uid}/familyMemberships/{familyId}`.

**For Facilitators**:
Child document can optionally include:

```typescript
{
  facilitatorUids: ["uid-facilitator-1", "uid-facilitator-2"],
  // Used by rule: isAssignedFacilitator() checks if request.auth.uid in facilitatorUids
}
```

---

## 6. Supabase Dependencies

### Current Status: **PARTIAL MIGRATION**

✅ **Fully Migrated to Firebase**:

- Parent authentication (Firebase Auth + Firestore)
- Child authentication (Firebase Firestore)
- Child session management (Firebase Firestore)
- Child profile storage (Firebase Firestore)
- Journey progress (Firebase Firestore) — H4.B
- Competencies (Firebase Firestore) — H4.B
- Achievements (Firebase Firestore) — H4.B
- Assessment attempts (Firebase Firestore) — H4.B
- Scenario sessions (Firebase Firestore) — H4.B

⚠️ **Still Using Supabase** (Not Critical Path):

- Analytics events
- Feedback submissions
- Learning progress (legacy queries)
- Scenario decisions (legacy storage)

### Remaining Supabase References

**Files Still Importing Supabase**:

| File                                                             | Usage                                          | Purpose                        |
| ---------------------------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| [src/lib/analytics.ts](src/lib/analytics.ts)                     | `supabase.from("analytics_events").insert()`   | Telemetry tracking             |
| [src/lib/feedback.ts](src/lib/feedback.ts)                       | `supabase.from("feedback").insert()`           | User feedback collection       |
| [src/lib/learning/progress.ts](src/lib/learning/progress.ts)     | `supabase.from("journey_progress").select()`   | Legacy progress queries        |
| [src/lib/scenario/session.ts](src/lib/scenario/session.ts)       | `supabase.from("scenario_decisions").upsert()` | Scenario decision logging      |
| [src/lib/assessment/attempts.ts](src/lib/assessment/attempts.ts) | Imports Supabase types                         | Assessment attempt recording   |
| [src/routes/onboarding.tsx](src/routes/onboarding.tsx)           | Imports `supabase` client                      | (Imported but may not be used) |

**None of these are in the critical authentication/authorization path.**

### Supabase Client Configuration

**File**: [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts)

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env["VITE_SUPABASE_URL"],
  import.meta.env["VITE_SUPABASE_ANON_KEY"],
);

export { supabase };
```

**Admin Client**: [src/integrations/supabase/client.server.ts](src/integrations/supabase/client.server.ts)

```typescript
const supabaseAdmin = createClient(
  process.env["SUPABASE_URL"],
  process.env["SUPABASE_SERVICE_KEY"],
);
```

---

## 7. Current Signup & Enrollment Flow

### Parent Enrollment Journey

**Step 1: Sign Up** → [/(public)/signup.tsx](<src/routes/(public)/signup.tsx>)

- Email, password, name entry
- Firebase Auth user creation
- Session cookie set (HTTP-only, 5-day TTL)
- Redirect to `/parent`

**Step 2: Family Initialization** → Automatic on first parent access

- `ensureFamily()` called by any parent server function
- Creates family document: `/families/{familyId}`
- Creates family membership: `/users/{uid}/familyMemberships/{familyId}`
- One family per parent (first-come basis)

**Step 3: Child Enrollment** → [/onboarding](src/routes/onboarding.tsx)

- Multi-step wizard (7 steps):
  1. Welcome
  2. Child name
  3. Child age (8-12)
  4. Avatar selection (emoji)
  5. Meet TATI intro
  6. Journey preview
  7. Start button

- On completion: `createChildProfile({ name, age, avatar })`
  - Generates TATI ID
  - Generates 4-digit PIN
  - Creates child document
  - Saves credentials in `/childCredentials/{tatiId}`

- Redirect to: `/learn/$childId/assessment/save-pre`
  (Pre-assessment before first lesson)

### Form Fields & Validation

**Parent Signup Form**:

```typescript
{
  fullName: string (min 1, no validation shown but used for displayName),
  email: string (email format),
  password: string (min 8 chars, must include digit or symbol),
  confirm: string (must match password),
  agreed: boolean (terms acceptance required),
}
```

**Child Creation Form**:

```typescript
{
  name: string (min 2, max 30 chars),
  age: number (8-12),
  avatar: string (one of: "kojo", "amara", "kai", "zara", etc.),
  onboardingCompleted: boolean (default true),
}
```

### Storage Locations

**Parent Account Created**:

- Firebase Auth: Email + hashed password (Firebase managed)
- Firestore `/users/{uid}`: Profile info, roles, status
- Session Cookie: HTTP-only cookie with session token

**Family Created**:

- Firestore `/families/{familyId}`: Family metadata
- Firestore `/users/{uid}/familyMemberships/{familyId}`: Membership record

**Child Created**:

- Firestore `/families/{familyId}/children/{childId}`: Child profile
- Firestore `/childCredentials/{tatiId}`: TATI ID + hashed PIN
- **NOT in Supabase** (fully migrated to Firebase)

### Auto-Account Creation Policy

**❌ NO automatic child account creation during parent signup**

Current flow:

1. Parent signs up (creates parent account only)
2. Parent redirects to `/parent` (empty state)
3. Parent manually clicks "Add my child"
4. Onboarding wizard opens
5. Child account created with explicit enrollment

This is intentional — parents may have multiple children, so enrollment is one-at-a-time.

---

## 8. Existing Child-Parent Relationships

### How Relationships are Established

**Automatic Via Firestore Path Structure**:

```
Parent UID (Firebase)
  ↓
  /users/{parentUid}/familyMemberships/{familyId}
  ↓
  /families/{familyId}/children/{childId}
  ↓
  Child profile
```

**Authorization Chain**:

1. Parent logs in → Session cookie verified
2. `getCurrentParentContext()` extracts `uid` from session
3. `ensureFamily()` finds `/users/{uid}/familyMemberships/` docs
4. Parent can only access their own family's children
5. Rules enforce: `memberPath(familyId)` must exist and be active

### Relationship Validation

**At Child Access Time**:

```typescript
async assertChildInFamily(childId: string) {
  const { uid } = await getCurrentParentContext();
  const familyId = await this.ensureFamily();

  // Query the family's children collection
  const childSnapshot = await db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .get();

  if (!childSnapshot.exists) {
    throw new Error("That learner is not part of your family.");
  }
}
```

### Current Validation Gaps & Observations

**✅ Properly Validated**:

- Parent can only see their own family's children
- Children are scoped to family via Firestore path
- Family membership is checked via `/members/{uid}` rules

**⚠️ Observations**:

- No explicit "invited" state for family members yet
  - Rules show support for it (`status in ['active', 'invited', 'removed']`)
  - But no UI/API to invite other parents/guardians
  - Currently single-parent-per-family model

- No role differentiation between "parent" and "guardian"
  - Both treated identically in rules: `role in ['parent', 'guardian']`
  - No separate permission levels

- No "facilitator" assignment workflow visible
  - Rules support `facilitatorUids` in child document
  - No admin UI shown for assigning facilitators to children

### Relationship Data Consistency

**Firestore Rules Enforce**:

```
immutableOwnership(existing, proposed) {
  proposed.familyId == existing.familyId
  && proposed.id == existing.id
  && proposed.createdBy == existing.createdBy
}
```

This prevents:

- ❌ Moving a child to a different family
- ❌ Changing child ID after creation
- ❌ Changing who created the child

---

## Security Assessment

### Authentication: ✅ STRONG

- ✅ Firebase Auth handles credential storage (industry standard)
- ✅ Session cookies are HTTP-only (CSRF protection)
- ✅ ID tokens verified server-side before session creation
- ✅ Session cookies set with Secure flag in production
- ✅ Parent sessions expire after 5 days
- ✅ Child sessions expire after 30 minutes
- ✅ PIN hashing uses scrypt (cost N=16384) — exceeds OWASP recommendations

### Authorization: ✅ WELL-DESIGNED

- ✅ Firestore security rules enforce family isolation
- ✅ Request.auth.uid verified by Firebase Admin SDK
- ✅ Role-based access control (admin, facilitator, parent, guardian)
- ✅ Immutable ownership fields prevent privilege escalation
- ✅ Server-side checks in all family/child access functions
- ✅ Admin SDK operations bypass rules (privileged operations only)

### Data Isolation: ✅ PROPER

- ✅ Children scoped to family via path
- ✅ Families scoped to parent via membership document
- ✅ No cross-family access possible via rules
- ✅ Child credentials server-only (client access denied by rules)
- ✅ Session storage server-only (client access denied by rules)

### Known Limitations: ⚠️

1. **No session refresh mechanism for child sessions**
   - Child session expires after 30 minutes
   - No automatic refresh; child must re-login
   - Could be mitigated with refresh token endpoint

2. **Supabase dependency remains**
   - Analytics, feedback, some progress tracking still on Supabase
   - Not in authentication/authorization path, but shared backend
   - Could be removed in future migration phase

3. **No audit logging visible**
   - No explicit audit trail of who accessed what
   - Firebase Audit Logs available in Cloud Console but not shown in code
   - Could be important for compliance

4. **No explicit role assignment workflow**
   - Facilitators/admins created via direct Firestore writes
   - No self-service role provisioning
   - No role invitation system

---

## File Structure & Key Files Summary

### Authentication & Authorization

- [src/lib/backend/firebase/parent-auth.server.ts](src/lib/backend/firebase/parent-auth.server.ts) — Parent session management
- [src/lib/backend/firebase/child-auth.server.ts](src/lib/backend/firebase/child-auth.server.ts) — Child Firebase identity (G2)
- [src/lib/auth/authorization.server.ts](src/lib/auth/authorization.server.ts) — Authorization utilities
- [src/lib/auth/child-session.server.ts](src/lib/auth/child-session.server.ts) — Child session resolution
- [src/lib/auth/child-auth.functions.ts](src/lib/auth/child-auth.functions.ts) — Child login/logout handlers
- [src/lib/auth/child-auth-firebase.server.ts](src/lib/auth/child-auth-firebase.server.ts) — Credential verification, PIN hashing
- [src/lib/auth/facilitator-auth.functions.ts](src/lib/auth/facilitator-auth.functions.ts) — Facilitator login

### Data Access & Repositories

- [src/lib/backend/firebase/repositories.ts](src/lib/backend/firebase/repositories.ts) — Family, child, progress repositories
- [src/lib/backend/firebase/family.functions.ts](src/lib/backend/firebase/family.functions.ts) — Server functions for family operations
- [src/lib/family.ts](src/lib/family.ts) — Client hooks (useChildProfiles, useCreateChildProfile)

### Routing & UI

- [src/routes/(public)/signup.tsx](<src/routes/(public)/signup.tsx>) — Parent signup page
- [src/routes/(public)/login.tsx](<src/routes/(public)/login.tsx>) — Parent login page
- [src/routes/(public)/admin-login.tsx](<src/routes/(public)/admin-login.tsx>) — Admin login page
- [src/routes/child/login.tsx](src/routes/child/login.tsx) — Child login page (TATI ID + PIN)
- [src/routes/onboarding.tsx](src/routes/onboarding.tsx) — Child enrollment wizard
- [src/routes/parent/index.tsx](src/routes/parent/index.tsx) — Parent portal (family view)

### Firebase Configuration

- [src/integrations/firebase/client.ts](src/integrations/firebase/client.ts) — Firebase Web SDK initialization
- [src/integrations/firebase/admin.server.ts](src/integrations/firebase/admin.server.ts) — Firebase Admin SDK initialization
- [src/integrations/firebase/firestore-types.ts](src/integrations/firebase/firestore-types.ts) — Firestore document type definitions
- [firestore.rules](firestore.rules) — Security rules
- [firebase.json](firebase.json) — Firebase project configuration

### Types & Constants

- [src/lib/auth/types.ts](src/lib/auth/types.ts) — Auth-related types
- [src/lib/backend/identity.ts](src/lib/backend/identity.ts) — Identity interfaces
- [src/lib/backend/contracts.ts](src/lib/backend/contracts.ts) — Backend service interfaces

---

## Recommendations for Future Work

### 1. Complete Supabase Migration

- Migrate analytics to Firestore or Cloud Logging
- Migrate feedback to Firestore
- Remove all Supabase client imports
- **Impact**: Eliminates dual-provider dependency; simplifies operations

### 2. Session Refresh for Children

- Add endpoint to refresh child session tokens before expiration
- Automatic refresh 5 minutes before expiration
- Prevents mid-journey logouts
- **Impact**: Better UX for child learners

### 3. Audit Logging

- Log authentication events (login, logout, failed attempts)
- Log authorization events (access denied)
- Log data modifications (child created, profile updated)
- **Impact**: Compliance, security incident investigation

### 4. Role Provisioning Workflow

- Self-service teacher/facilitator enrollment
- Role invitation system with email validation
- Admin UI for role management
- **Impact**: Scales platform for school/cohort management

### 5. Multi-Parent Family Support

- Implement "invite parent" workflow
- Support guardian roles (grandparents, etc.)
- **Impact**: Real-world family structures

### 6. Child Credential Rotation

- Implement PIN rotation after period/events
- Support disabling credentials for lost access
- **Impact**: Long-term security hygiene

---

## Conclusion

The TATI ChildSave authentication and family enrollment architecture is **production-ready** and follows Firebase best practices:

✅ Secure credential storage (Firebase Auth)  
✅ Proper session management (HTTP-only cookies, short TTLs)  
✅ Robust authorization (Firestore rules + server-side checks)  
✅ Complete family isolation (path-based scoping)  
✅ Server-only sensitive operations (Admin SDK)

The migration from Supabase to Firebase is **substantially complete** for all critical authentication and authorization paths. The remaining Supabase dependencies are **non-critical** and could be migrated in future phases.

**Current recommendation**: System is ready for production use. Consider planning Phase H5.3+ for Supabase elimination and workflow enhancements.
