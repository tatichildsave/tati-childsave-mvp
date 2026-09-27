# TATI AUTHENTICATION ARCHITECTURE AUDIT

**Date**: 2026-09-27  
**Scope**: Complete read-only audit of authentication and authorization implementation  
**Status**: FINAL

---

## EXECUTIVE SUMMARY

The TATI MVP currently operates on a **hybrid authentication and authorization model**:

### Current State
- **Authentication Provider**: Supabase Auth (email/password, Google OAuth)
- **Authorization Layer**: Firestore Rules + Application-level role checks
- **User Roles**: Defined in Firestore documents, not Supabase
- **Firebase Auth Status**: Installed but NOT used for authentication
- **Session Management**: Supabase handles browser sessions; Firestore Rules enforce server-side authorization

### Key Finding
**Firebase Auth is present but dormant.** The application authenticates via Supabase, then validates authorization via Firestore. This creates a **critical authentication provider mismatch** that prevented manual QA:

- Supabase authenticates users
- Firestore authorizes users
- Firebase Auth is not wired into the login flow
- Therefore, test users created in Firebase Auth Emulator cannot log in

---

## 1. CURRENT AUTHENTICATION PROVIDER

### Active Provider: Supabase Auth

**Implementation**:
- Client-side: `src/integrations/supabase/client.ts`
- Session management: `src/integrations/supabase/auth-attacher.ts`
- Auth flow: `src/routes/login.tsx` (parent), `src/routes/signup.tsx` (parent), `src/routes/academy/login.tsx` (facilitator)

**Supported Methods**:

| Method | File | Endpoint | Usage |
|--------|------|----------|-------|
| Email/Password Login | `src/routes/login.tsx:L47` | `supabase.auth.signInWithPassword()` | Parent & Facilitator |
| Email/Password Signup | `src/routes/signup.tsx:L68` | `supabase.auth.signUp()` | Parent only |
| Google OAuth | `src/routes/login.tsx:L63` | `lovable.auth.signInWithOAuth('google')` | Parent only |
| Session Retrieval | `src/routes/parent/route.tsx:L9` | `supabase.auth.getUser()` | All routes |
| Logout | `src/lib/auth/facilitator-auth.functions.ts:L106` | `supabase.auth.signOut()` | Facilitator |

**Session Token**:
- Supabase generates JWT access token
- Attached to server functions via `attachSupabaseAuth` middleware (`src/start.ts:L26`)
- Authorization header: `Authorization: Bearer {access_token}`

**Environment**:
- URL: `https://ggtjulmplujaqmsppque.supabase.co` (Cloud production)
- API Key: `sb_publishable_3rMbg1g2sfnNJGJMcjZolA_d559Eq9Q` (Publishable key)
- No local emulator configured (uses production Supabase)

---

## 2. FIREBASE AUTH USAGE

### Status: **NOT USED FOR AUTHENTICATION**

**What's Installed**:
- Firebase SDK: `firebase@11.1.0`
- Auth module: `firebase/auth`
- Client init: `src/integrations/firebase/client.ts:L8`
- Admin SDK: `firebase-admin@14.4.0` (server-side only)

**Why It's NOT Used**:
1. **Parent Login** (`/login`): Uses Supabase only
2. **Parent Signup** (`/signup`): Uses Supabase only
3. **Facilitator Login** (`/academy/login`): Uses Supabase, then checks Firestore for role
4. **Child Session** (`/child`): Uses Supabase + PIN (not Firebase Auth)

**Where It IS Present**:
- **Data storage**: Firestore (initialization only, no auth-related functions)
- **Authorization checks**: Firestore Rules (server-side security)
- **Tests only**: `tests/firebase/firestore.rules.test.ts`, `tests/firebase/firestore-test-client.ts`

**Emulator Configuration** (`src/integrations/firebase/client.ts:L51-L70`):
- Firestore Emulator: 127.0.0.1:8080 (when `VITE_FIRESTORE_EMULATOR_HOST` set)
- Auth Emulator: 127.0.0.1:9099 (when `VITE_FIREBASE_AUTH_EMULATOR_HOST` set)
- Status: **Connected but not called by authentication flows**

**Explicit Finding**: No authentication routes (`/login`, `/signup`, `/academy/login`) call Firebase Auth functions:
- ✅ No `signInWithEmailAndPassword()`
- ✅ No `createUserWithEmailAndPassword()`
- ✅ No `onAuthStateChanged()`
- ✅ No `getAuth().currentUser`

---

## 3. SUPABASE AUTH USAGE

### Status: **FULLY ACTIVE**

**Client-Side Auth Flows**:

| Route | Method | Purpose | File |
|-------|--------|---------|------|
| `/login` | Email/password + Google OAuth | Parent login | `src/routes/login.tsx` |
| `/signup` | Email/password | Parent signup | `src/routes/signup.tsx` |
| `/academy/login` | Email/password | Facilitator login | `src/routes/academy/login.tsx` |
| `/parent` (protected) | Session restore | Auto-redirect to login | `src/routes/parent/route.tsx:L9` |
| `/academy/dashboard` (protected) | Session restore + role check | Auto-redirect to /academy/login | `src/routes/academy/dashboard.tsx:L30-L44` |

**Server-Side Auth Flows**:

| Function | Purpose | File |
|----------|---------|------|
| `getFacilitatorSession()` | Retrieve Supabase user + check Firestore role | `src/lib/auth/facilitator-auth.functions.ts:L37` |
| `loginFacilitator()` | Supabase login + Firestore role validation | `src/lib/auth/facilitator-auth.functions.ts:L62` |
| `attachSupabaseAuth` | Middleware to attach token to server functions | `src/integrations/supabase/auth-attacher.ts` |

**Session Persistence**:
- Storage: Browser `localStorage` (via Supabase auth configuration)
- Token: JWT access token + refresh token
- Middleware: `attachSupabaseAuth` in `src/start.ts:L26` attaches token to every server function call
- Expiry: Auto-refresh via Supabase SDK

**No Local Supabase Setup**:
- Production Supabase project used
- No `supabase/functions/` directory (no Edge Functions)
- No local Supabase emulation configured

---

## 4. SESSION ARCHITECTURE

### Session Flow

```
Browser Login
    ↓
Supabase Auth (email/password or Google)
    ↓
Supabase returns JWT + Refresh Token
    ↓
Browser stores in localStorage
    ↓
Session middleware attaches JWT to server calls
    ↓
Server-side Firestore authorization checks JWT
```

### Components

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| **Supabase Client** | Browser + Server | `src/integrations/supabase/client.ts` | Auth client |
| **Auth Attacher** | Server Middleware | `src/integrations/supabase/auth-attacher.ts` | Token injection |
| **Session Check** | Route Guard | `src/routes/parent/route.tsx` | Session restore |
| **Firestore Rules** | Server-side | `firestore.rules` | Final authorization |

### Parent Portal Session
```typescript
// Parent login @ /login
await supabase.auth.signInWithPassword({ email, password })
// → Token stored in browser localStorage
// → Route guard: supabase.auth.getUser() → redirect to /parent
// → Parent sees dashboard
```

### Facilitator Portal Session
```typescript
// Facilitator login @ /academy/login
await supabase.auth.signInWithPassword({ email, password })
// → Then: checkFacilitatorStatus(uid) → check Firestore /users/{uid}.roles
// → If facilitator role found → set session
// → If no role → signOut() immediately
// → Route guard: getFacilitatorSession() → redirect based on role
```

**Critical Issue**: Facilitator role must exist in Firestore BEFORE facilitator can log in. See Section 6.

---

## 5. ROLE ARCHITECTURE

### Role Definitions

Three distinct roles exist:
- `parent` - Family adult
- `facilitator` - School teacher/educator  
- `admin` - Platform administrator
- `child` - Learner (separate from adult roles)

### Where Roles Are Stored

| Role | Storage | Location | Checked By | Source |
|------|---------|----------|-----------|--------|
| **facilitator** | Firestore | `/users/{uid}.roles[]` | Application code | User document |
| **school admin** | Firestore | `/schools/{schoolId}/admins/{uid}` | Firestore Rules | School sub-collection |
| **admin** | Firestore | `/users/{uid}.roles[]` | Firestore Rules | User document |
| **parent** | Firestore | `/families/{familyId}/members/{uid}` | Firestore Rules | Family membership |
| **child** | Supabase | `child_profiles.tati_id` | Application code | Supabase table |

### Role Assignment Flows

#### Parent Role (Automatic)
```
1. User signs up @ /signup via Supabase
2. User document NOT automatically created
3. Parent role inferred from family membership
4. Family membership requires admin assignment in Firestore
```

**Status**: ❌ No automatic parent role assignment. Requires manual Firestore setup.

#### Facilitator Role (Manual Assignment)
```
1. User account created (email exists in Supabase)
2. Admin must manually set /users/{uid}.roles = ['facilitator']
3. Facilitator cannot create their own role
4. No UI for role assignment exists
```

**Status**: ❌ No facilitator self-service signup. Requires admin intervention.

#### School Admin Role (Manual Assignment)
```
1. Facilitator exists with facilitator role
2. Platform admin assigns via: /schools/{schoolId}/admins/{uid} = true
3. User gains school admin access (H3.3 only)
4. No UI for assignment exists
```

**Status**: ❌ No self-service assignment. Requires admin intervention.

#### Admin Role (Manual Assignment)
```
1. Admin must set /users/{uid}.roles = ['admin']
2. No UI for promotion exists
3. Only existing admin can create new admin
```

**Status**: ❌ Bootstrapping problem. First admin must be created via Firebase Console.

### Role Checking Implementation

#### Facilitator Check (Application-Level)
```typescript
// src/lib/auth/facilitator-auth.functions.ts:L16
export async function checkFacilitatorStatus(userId: string): Promise<boolean> {
  const db = getFirebaseFirestore();
  const userDocRef = doc(db, "users", userId);
  const userDocSnap = await getDoc(userDocRef);
  const roles = userDocSnap.data()?.["roles"] as string[] | undefined;
  return Array.isArray(roles) && roles.includes("facilitator");
}
```

**When Called**:
- Facilitator login: `src/routes/academy/login.tsx` → `loginFacilitator()` → `checkFacilitatorStatus()`
- Facilitator dashboard: `src/routes/academy/dashboard.tsx` → `getFacilitatorSession()` → `checkFacilitatorStatus()`

**Dependency**: Requires `/users/{uid}` document with `roles` array in Firestore

#### School Admin Check (Firestore Rules)
```text
function isSchoolAdmin(schoolId) {
  return signedIn() && exists(
    /databases/$(database)/documents/schools/$(schoolId)/admins/$(request.auth.uid)
  );
}
```

**When Enforced**:
- School data reads: `match /schools/{schoolId}`
- School admin operations: School CRUD via H3.3 admin routes

**Dependency**: Document must exist at `/schools/{schoolId}/admins/{uid}`

#### Admin Check (Firestore Rules)
```text
function isAdmin() {
  return hasRole('admin');
}

function hasRole(role) {
  return signedIn() && role in userDoc().roles;
}
```

**When Enforced**:
- All admin-only Firestore operations
- School creation
- Role assignment (implicit via rules)

---

## 6. FIRESTORE AUTHORIZATION DEPENDENCY

### The Architecture Problem: Two Independent Identity Systems

The TATI MVP uses two separate identity systems that have **no built-in bridge**:

```
Supabase Auth
  ├─ User ID (UUID)
  └─ Email, OAuth provider

Firestore
  ├─ Document path: /users/{uid}
  ├─ Roles array
  └─ Authorization rules
```

### How They're Connected

**Synchronization Mechanism**: **Manual via admin SDK or Firebase Console**

1. User authenticates via Supabase → Gets UID
2. Application checks Firestore for `/users/{uid}` → Role lookup
3. If document doesn't exist → User has no roles → Access denied

**Missing Link**: No automatic provisioning system creates the Firestore user document when Supabase auth user is created.

### Firestore Rules - Authorization Boundary

**Rules File**: `firestore.rules`

**Key Rules**:
- Users can create their own `/users/{uid}` with initial `status='pending'`, `roles=[]`
- Users cannot modify their own roles
- Only admins can update roles
- School admins checked via existence at `/schools/{schoolId}/admins/{uid}`
- Request auth is verified via `request.auth.uid`

**Request Auth Identity**:
```javascript
request.auth.uid  // Comes from Supabase JWT token
```

**Firestore Rules Trust Chain**:
1. Browser sends Firestore request with Supabase JWT
2. Firestore decodes JWT token (must validate signing)
3. Firestore extracts `sub` (Subject) claim → UID
4. Firestore evaluates rules using that UID
5. Rules check `/users/{uid}.roles` for authorization

**Critical Dependency**: Firestore must trust Supabase's JWT tokens. This works because:
- Supabase is a public Firebase provider
- Firestore accepts JWTs from any OIDC-compliant provider
- Supabase JWTs include standard `sub`, `aud`, `exp` claims

---

## 7. ACADEMY AUTHENTICATION FLOW (H3.3)

### Login Route: `/academy/login`

```
┌─────────────────────────────────────────────────────┐
│ /academy/login (Facilitator Sign In)                 │
└──────────────┬──────────────────────────────────────┘
               ↓
       User enters email + password
               ↓
┌──────────────────────────────────────────────────────┐
│ handleSubmit()                                        │
│ → loginFacilitator(email, password)                  │
└──────────────┬──────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────┐
│ Supabase Auth: signInWithPassword()                  │
│ src/lib/auth/facilitator-auth.functions.ts:L72      │
└──────────────┬──────────────────────────────────────┘
               ↓
         ✓ Email + password match?
               ↓
┌──────────────────────────────────────────────────────┐
│ Supabase returns: {user, session}                    │
│ user.id = Supabase UUID                              │
└──────────────┬──────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────┐
│ checkFacilitatorStatus(user.id)                      │
│ → Firestore query: GET /users/{uid}                  │
│ → Check: roles.includes('facilitator')?              │
│ src/lib/auth/facilitator-auth.functions.ts:L16      │
└──────────────┬──────────────────────────────────────┘
               ↓
         ✓ /users/{uid}.roles has 'facilitator'?
               │
        NO ────┴─→ signOut() + return null
               │
        YES    ↓
┌──────────────────────────────────────────────────────┐
│ Return FacilitatorSession {                          │
│   uid, email, displayName, isFacilitator: true       │
│ }                                                     │
└──────────────┬──────────────────────────────────────┘
               ↓
         ✓ Session obtained?
               │
        NO ────┴─→ Show error: "Invalid email or password,
               │    or you don't have facilitator access."
               │    Redirect to /academy/login
               │
        YES    ↓
┌──────────────────────────────────────────────────────┐
│ Redirect to /academy/dashboard                       │
└──────────────────────────────────────────────────────┘
```

### Dashboard Protection: `/academy/dashboard`

```
┌──────────────────────────────────────────────────────┐
│ Route: /academy/dashboard                            │
│ Component: AcademyDashboard                          │
└──────────────┬──────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────┐
│ useQuery({                                           │
│   queryFn: getFacilitatorSession()                   │
│ })                                                    │
└──────────────┬──────────────────────────────────────┘
               ↓
         Checks: session?.isFacilitator?
               │
        false  ├─→ useEffect → navigate('/academy/login')
               │
        true   ↓
        (or loading)
┌──────────────────────────────────────────────────────┐
│ Dashboard rendered with facilitator data             │
└──────────────────────────────────────────────────────┘
```

### Admin School Dashboard Protection: `/academy/admin/schools`

**Route Definition**: `src/routes/academy/admin/schools/index.tsx`

**Issue Found**: ❌ **NO PROTECTION**

The route has **no beforeLoad guard**. It renders without checking:
- Is user authenticated?
- Is user a school admin?
- Is user a facilitator?

**Current Behavior**:
```typescript
// src/routes/academy/admin/schools/index.tsx
function SchoolsIndex() {
  const { data: schools = [], isLoading, error } = useAllSchools();
  // allSchools calls: getAllSchools()
  // Which calls: getDocs(collection(db, "schools"))
  // Which is protected by: Firestore Rules
}
```

**Authorization Actually Happens At**: Firestore Rules (Server-side)

When unauthenticated user tries to access `/academy/admin/schools`:
1. Page loads (no route guard)
2. `useAllSchools()` hook executes
3. `getAllSchools()` sends Firestore query
4. Firestore Rules evaluate `match /schools/{schoolId}`: `allow read: if canAccessSchool(schoolId)`
5. Firestore rejects query (no auth token or token doesn't have access)
6. Hook returns error
7. UI shows "Error loading schools"

**This works but is fragile**:
- No early redirect to login
- User sees the route load, then error appears
- UX is poor
- Firestore errors exposed to client

---

## 8. IDENTITY MAPPING

### Complete Identity Chain

```
┌─────────────────────────────────────────────────────┐
│ Browser User Session                                │
│                                                     │
│  Email: facilitator-a-qa@school-a.test             │
│  Password: QATest123                                │
└──────────────┬──────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────┐
│ Supabase Auth                                       │
│                                                     │
│  User ID (UUID): zg3xWd0PT4Zz96rJ2NVZDTY0jARu     │
│  Email verified: true/false                         │
│  Provider: password                                 │
│  JWT Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6... │
└──────────────┬──────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────┐
│ Browser localStorage & Session Middleware           │
│                                                     │
│  Supabase JWT stored in localStorage                │
│  Attached to Firestore requests via:                │
│    Authorization: Bearer {JWT}                      │
└──────────────┬──────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────┐
│ Firestore Security Context                          │
│                                                     │
│  Decoded JWT: request.auth = {                      │
│    uid: "zg3xWd0PT4Zz96rJ2NVZDTY0jARu",            │
│    email: "facilitator-a-qa@school-a.test",        │
│    aud: "...",                                      │
│    iat: 1727...,                                    │
│    exp: 1727...                                     │
│  }                                                  │
└──────────────┬──────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────┐
│ Firestore User Document                             │
│                                                     │
│  Path: /users/zg3xWd0PT4Zz96rJ2NVZDTY0jARu        │
│  Document: {                                        │
│    uid: "zg3xWd0PT4Zz96rJ2NVZDTY0jARu",           │
│    email: "facilitator-a-qa@school-a.test",       │
│    displayName: "QA Facilitator A",                │
│    roles: ["facilitator"],                         │
│    status: "active",                               │
│    createdAt: Timestamp(...)                       │
│  }                                                  │
└──────────────┬──────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────┐
│ School Membership (H3.3)                            │
│                                                     │
│  Path: /schools/school-a-qa-test/admins/          │
│         zg3xWd0PT4Zz96rJ2NVZDTY0jARu              │
│  Document: {                                        │
│    role: "school_admin",                           │
│    assignedAt: Timestamp(...)                      │
│  }                                                  │
│  If this exists → isSchoolAdmin(schoolId) = true   │
└─────────────────────────────────────────────────────┘
```

### Summary
- **Supabase UID** = **Firestore UID** (same UUID used throughout)
- **No transformation** between systems
- **No automatic provisioning** - Firestore documents are manually created

### Missing Links

| Link | Status | Gap |
|------|--------|-----|
| Supabase User → Firestore /users/{uid} | ❌ | No trigger creates document |
| Supabase User → /schools/{id}/admins/{uid} | ❌ | Must be manually assigned |
| Supabase User → /families/{id}/members/{uid} | ❌ | No UI for family setup |
| Firestore roles → Firebase custom claims | ❌ | Not used; not synchronized |

---

## 9. H3.3 AUTHENTICATION DEPENDENCY

### What H3.3 Requires

H3.3 (School Administration) depends on:

| Component | Type | Status | Required |
|-----------|------|--------|----------|
| **Supabase Auth** | Authentication | ✅ Active | YES - for login |
| **Firestore Schools** | Data storage | ✅ Ready | YES - school data |
| **Firestore Rules** | Authorization | ✅ Enforced | YES - server-side authz |
| **/schools/{id}/admins** | Admin tracking | ✅ Defined | YES - role assignment |
| **Firebase Auth** | Authentication | ❌ Not used | NO - not needed |
| **Firebase custom claims** | Authorization | ❌ Not used | NO - rules-based instead |
| **Users document roles** | Role tracking | ⚠️ Manual | YES - but manual setup |

### H3.3 Implementation Dependency

H3.3 code depends on:
- ✅ Supabase for user authentication (parent login flow)
- ✅ Firestore for school and admin data (all read/write)
- ✅ Firestore rules for authorization (server-side enforcement)

H3.3 code does NOT depend on:
- ❌ Firebase Auth
- ❌ Firebase custom claims
- ❌ Automatic role provisioning

### The Gap

**H3.3 works if**:
1. User is already authenticated via Supabase
2. Firestore has a user document at `/users/{uid}` with the user's role
3. Firestore has `/schools/{id}/admins/{uid}` document if school admin

**But**: No UI or trigger creates these Firestore documents automatically.

**Result**: H3.3 requires manual admin setup before any facilitator/admin can access it.

---

## 10. MIGRATION STATUS

### Current State

**Firebase Status**: **INFRASTRUCTURE ONLY**

Firebase is installed but has:
- ✅ Firestore for data storage (configured, in use)
- ✅ Firestore Rules for authorization (written, enforced)
- ✅ Firebase Admin SDK for server-side operations (configured, available)
- ❌ Firebase Auth for user authentication (installed but not wired)
- ❌ Firebase custom claims for role management (not implemented)

**Supabase Status**: **FULLY PRODUCTION**

Supabase is the active provider for:
- ✅ User authentication (email/password, OAuth)
- ✅ Session management (JWT tokens)
- ✅ User account storage
- ✅ Child authentication (legacy TATI ID + PIN)

### Migration Table

| Component | Current Provider | Intended Provider | Migration Status | Notes |
|-----------|------------------|-------------------|------------------|-------|
| **User Authentication** | Supabase Auth | Firebase Auth | ❌ Not started | Supabase auth remains active |
| **User Account Storage** | Supabase | Firebase Auth | ❌ Not started | No user records in Firebase Auth |
| **Session Management** | Supabase JWT | Firebase ID Token | ❌ Not started | Supabase handles all sessions |
| **Role Storage** | Firestore /users/{uid}.roles | Firebase custom claims | ⚠️ Partial | Firestore roles exist but not synced to claims |
| **Authorization** | Firestore Rules | Firebase Rules | ⚠️ Partial | Rules written for Firestore, Supabase still controls auth |
| **Child Authentication** | Supabase TATI ID + PIN | Firebase Auth | ❌ Not started | Supabase child_profiles table used |
| **Parent Portal** | Supabase | Firebase Auth | ❌ Not started | /login uses Supabase only |
| **Facilitator Portal** | Supabase + Firestore | Firebase Auth + Firestore | ⚠️ Partial | Auth is Supabase, roles checked in Firestore |
| **School Admin** | Supabase + Firestore | Firebase Auth + Firestore | ⚠️ Partial | (H3.3) Auth is Supabase, admins in Firestore |

### What's Implemented vs. Intended

**✅ Completed**:
- Firestore Rules written and enforced (entire ruleset)
- Firebase Admin SDK initialized and working
- Firestore collections for schools (H3.3), families, learners

**⏳ In Progress**:
- Role provisioning (half-implemented: rules written, no UI)
- School admin assignments (half-implemented: rules written, no UI)

**❌ Not Started**:
- Firebase Auth integration into login flows
- User account migration from Supabase to Firebase
- Custom claims implementation
- Auth emulator testing with actual application flows

**🚫 Blocked By**:
- No mechanism to assign roles via UI
- No trigger to create Firestore user documents on Supabase signup
- No admin bootstrap (who creates the first admin?)
- Production Supabase project (cannot test locally without emulation)

---

## 11. EXACT REMAINING MIGRATION GAPS

### Gap 1: No Facilitator Self-Service Signup

**Current**: Administrator must manually set `/users/{uid}.roles = ['facilitator']`

**Required**: Either:
- UI for facilitators to sign up with admin approval, OR
- Admin dashboard to assign facilitator role

**Code Missing**: No facilitator signup form or role assignment UI

**Impact on H3.3**: Cannot test facilitator functionality without manual Firestore intervention

---

### Gap 2: No School Admin Assignment UI

**Current**: Administrator must manually create `/schools/{schoolId}/admins/{uid}` document

**Required**: UI for platform admin to assign school admins

**Code Missing**: No school admin assignment UI (only school CRUD exists in H3.3)

**Impact on H3.3**: Testing requires manual Firestore setup

---

### Gap 3: Firestore User Document Auto-Provisioning Missing

**Current**: Users manually create `/users/{uid}` with `status='pending'`

**Required**: On Supabase signup, automatically create Firestore user document with:
```javascript
{
  uid: user.id,
  email: user.email,
  displayName: user.user_metadata.full_name,
  roles: [],  // Empty, to be assigned by admin
  status: 'active',
  createdAt: now
}
```

**Code Missing**: No Supabase trigger or Cloud Function

**Impact on H3.3**: Roles cannot be checked until user manually creates Firestore document

---

### Gap 4: No Admin Bootstrap Mechanism

**Current**: First admin must be created via Firebase Console by someone with project access

**Required**: Either:
- Cloud Function to promote first auth user to admin via Console, OR
- Documented admin setup procedure

**Code Missing**: No documentation or automation for initial admin setup

**Impact on H3.3**: Requires access to Firebase Project beyond application code

---

### Gap 5: Firebase Auth Not Wired Into Login Routes

**Current**: All login routes use only Supabase

**Required for Full Migration**: Routes must:
```typescript
// Instead of:
await supabase.auth.signInWithPassword(email, password)

// Do:
await getAuth().signInWithEmailAndPassword(email, password)
```

**Code Missing**: No Firebase Auth login implementation (phase not started)

**Impact on H3.3**: H3.3 is stuck on Supabase auth until this phase completes

---

### Gap 6: No Session Bridge Between Auth Providers

**Current**: Supabase provides JWT, Firestore trusts Supabase JWT

**Required for Full Migration**: Session management must:
- Sign in with Firebase Auth
- Get Firebase ID Token
- Attach Firebase token to Firestore requests
- Clear Firebase session on logout

**Code Missing**: No route-level session switch to Firebase tokens

**Impact on H3.3**: Firestore currently accepts Supabase tokens; will not accept "no token" if Supabase auth is removed

---

## 12. RECOMMENDED NEXT TECHNICAL STEP

### Immediate Decision Required

The architecture is **asymmetrically hybrid**:
- Supabase for authentication
- Firestore for authorization and data
- No integration layer between them

### Option A: Complete Firebase Migration (Recommended for Long-Term)

**Scope**:
1. Create Firebase Auth accounts for all existing Supabase users
2. Migrate parent/facilitator/admin login routes to Firebase Auth
3. Update session middleware to use Firebase ID tokens
4. Implement role assignment UI (facilitator signup, admin dashboard)
5. Migrate child authentication to Firebase Auth (Phase G2/G3 foundation exists)
6. Deprecate Supabase Auth

**Timeline**: 3-4 phases (G7-G10)

**H3.3 Impact**: Can proceed with H3.3 once role assignment UI is built (doesn't require Firebase Auth login, can stay on Supabase for now)

### Option B: Stabilize Current Hybrid (Shorter-Term)

**Scope**:
1. Build role assignment UI for facilitators and school admins
2. Auto-create Firestore user documents on Supabase signup
3. Document manual admin bootstrap procedure
4. Test H3.3 with proper role setup

**Timeline**: 1 phase (H3.3.1)

**H3.3 Impact**: H3.3 works within current architecture, requires admin setup steps

### Option C: Skip H3.3 Manual QA Due to Architecture Gap

**Scope**:
1. Document that manual QA is blocked by lack of facilitator/admin provisioning
2. Release H3.3 based on:
   - Automated test results (122/122 passing)
   - Code review verification (security, privacy, rules enforcement)
   - Firestore rules are correct (no cross-school access possible)

**Timeline**: Immediate

**H3.3 Impact**: H3.3 available but requires backend admin setup before users can access it

---

## FINAL ANSWER

### Critical Questions

#### Q: Can a newly created Firebase Authentication user currently log into the TATI MVP?

**ANSWER: NO**

**Reason**: 
The application login routes (`/login`, `/signup`, `/academy/login`) **do not call Firebase Auth functions**. They exclusively use Supabase Auth:

```typescript
// What the app actually does:
await supabase.auth.signInWithPassword(email, password)

// What it would need to do to use Firebase Auth:
await signInWithEmailAndPassword(getAuth(), email, password)
```

A user created in Firebase Auth Emulator has no Supabase account, therefore cannot authenticate. Even if both accounts existed for the same email:
- Supabase login would create a Supabase session (JWT)
- Firestore rules would accept this JWT (valid Supabase JWT)
- Application would work

But Firebase Auth login would fail because:
- Firebase ID Token ≠ Supabase JWT
- Routes don't accept Firebase ID tokens
- No session middleware handles Firebase tokens

**Evidence**:
- `src/routes/login.tsx:L47` - Uses `supabase.auth.signInWithPassword()`
- `src/routes/signup.tsx:L68` - Uses `supabase.auth.signUp()`
- `src/routes/academy/login.tsx:L72` - Uses `supabase.auth.signInWithPassword()`
- `src/integrations/firebase/client.ts` - Firebase Auth initialized but never called from auth routes

---

#### Q: Can a newly created Supabase Authentication user currently log into the TATI MVP?

**ANSWER: YES, but with conditions**

**Reason**:
The application uses Supabase for authentication. A Supabase user can authenticate successfully.

**Conditions**:
1. **For Parent Portal** (`/login` → `/parent`): ✅ Works immediately
   - User authenticates via Supabase
   - JWT token obtained
   - Parent route redirects based on `supabase.auth.getUser()`
   - Works without additional Firestore setup

2. **For Facilitator Portal** (`/academy/login` → `/academy/dashboard`): ⚠️ Partially works
   - User authenticates via Supabase
   - Application checks Firestore for `/users/{uid}.roles.includes('facilitator')`
   - **If Firestore document exists with facilitator role**: ✅ Access granted
   - **If Firestore document missing or no facilitator role**: ❌ Access denied (sign out immediately)

3. **For School Admin** (`/academy/admin/schools`): ⚠️ Partially works
   - User authenticates via Supabase
   - Route has no guard (loads)
   - `useAllSchools()` sends Firestore query
   - **If `/schools/{id}/admins/{uid}` exists**: ✅ Schools visible
   - **If doesn't exist**: ❌ Query rejected by Firestore Rules, error shown

**Evidence**:
- `src/routes/login.tsx:L47` - Supabase login works for any user
- `src/routes/signup.tsx:L68` - Supabase signup works
- `src/lib/auth/facilitator-auth.functions.ts:L72` - Checks Firestore for facilitator role
- `firestore.rules` - Rules check role existence, not Supabase properties

**Conclusion**: A Supabase user can authenticate, but **role verification requires manual Firestore setup** by an administrator. There is no automated provisioning.

---

## SUMMARY TABLE

| Aspect | Current | Working | Issues |
|--------|---------|---------|--------|
| **Parent Signup** | Supabase | ✅ Yes | None |
| **Parent Login** | Supabase | ✅ Yes | None |
| **Parent Session** | Supabase JWT → Firestore | ✅ Yes | None |
| **Facilitator Signup** | ❌ Missing | ❌ No | No UI; manual Firestore setup required |
| **Facilitator Login** | Supabase | ⚠️ Partial | Requires `/users/{uid}.roles` to exist |
| **Facilitator Session** | Supabase JWT → Firestore | ✅ Yes | None (if role exists) |
| **School Admin Assignment** | ❌ Missing | ❌ No | No UI; manual Firestore setup required |
| **H3.3 Access** | Firestore Rules | ⚠️ Partial | Requires school admin document to exist |
| **Firebase Auth** | Not integrated | ❌ No | Dormant infrastructure |
| **User Provisioning** | ❌ Missing | ❌ No | No trigger creates `/users/{uid}` docs |

---

## CONCLUSION

The TATI MVP operates on a **working but manually-intensive hybrid model**:

1. **Supabase Auth** authenticates users (email/password, Google OAuth)
2. **Firestore** authorizes users (rules-based, role-checked)
3. **Firestore Rules** trust Supabase JWT tokens via OIDC
4. **Firebase Auth** is installed but not used

The system works for:
- ✅ Parent signup and login
- ✅ Any authenticated Firestore access (if roles exist)

The system fails for:
- ❌ Facilitator self-service (no signup, must be manually provisioned)
- ❌ School admin self-service (no assignment UI)
- ❌ Automatic user provisioning (must manually create Firestore docs)
- ❌ Firebase Auth integration (not wired in)

**H3.3 Implication**: School admin features are **code-complete and properly secured** but **operationally blocked** by lack of:
1. Facilitator provisioning mechanism
2. School admin assignment mechanism
3. Initial admin bootstrap procedure

Before H3.3 can be used in production, these operational gaps must be filled with either:
- A complete Firebase Auth migration (Phase G7+), OR
- Role assignment UI + auto-provisioning (Phase H3.3.1), OR
- Documented manual admin procedures (immediate)

---

**END OF AUDIT**
