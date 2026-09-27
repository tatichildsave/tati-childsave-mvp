# PHASE 1 — IDENTITY BRIDGE VERIFICATION FINDINGS

**Date**: 2026-09-27  
**Scope**: How does Firestore receive authenticated user identity and does it work with Supabase Auth?  
**Status**: INVESTIGATION COMPLETE WITH CRITICAL FINDINGS

---

## A. How Does Firestore Receive the Authenticated User's Identity?

### Client-Side (Browser)

**Configuration**:
- File: `src/integrations/firebase/client.ts:L51-L70`
- Firestore connects to emulator at: `127.0.0.1:8080` (from `VITE_FIRESTORE_EMULATOR_HOST`)
- Auth Emulator connects to: `127.0.0.1:9099` (from `VITE_FIREBASE_AUTH_EMULATOR_HOST`)

**Auth Setup**:
```typescript
export function getFirebaseApp(): FirebaseApp {
  const app = initializeApp(getFirebaseConfig());
  if (browserOnly && !firebaseAppInitialized) {
    const firestoreEmulatorHost = import.meta.env["VITE_FIRESTORE_EMULATOR_HOST"];
    if (firestoreEmulatorHost) {
      const [host, port] = firestoreEmulatorHost.split(":");
      const fs = getFirestore(app);
      connectFirestoreEmulator(fs, host, parseInt(port || "8080"));
    }
  }
  return app;
}
```

**Problem**: 
- No custom auth provider set up
- No Supabase token bridge configured
- Firestore SDK initialized with Firebase config (production tatichildsavemvp project)
- Browser uses Firebase Emulator but has no way to authenticate with Supabase credentials

### Server-Side (Trusted Boundary)

**Configuration**:
- File: `src/integrations/supabase/auth-attacher.ts`
- Middleware attaches Supabase JWT to server function calls as `Authorization: Bearer {token}`
- File: `src/start.ts:L26`
- Middleware registered: `functionMiddleware: [attachSupabaseAuth]`

**Flow**:
1. Browser calls server function via TanStack React Start
2. Middleware intercepts call
3. Retrieves Supabase session: `supabase.auth.getSession()`
4. Extracts JWT: `data.session?.access_token`
5. Attaches header: `Authorization: Bearer {token}`
6. Server-side functions receive authenticated context

**Note**: Server functions can access Firestore with the Supabase JWT attached to the request, but this requires server functions to explicitly use it (not standard Firestore SDK behavior).

---

## B. What Value Does Firestore `request.auth.uid` Contain?

### In Firestore Rules

**Rule Definition** (from `firestore.rules`):
```javascript
function signedIn() {
  return request.auth != null;
}

function userDoc() {
  return signedIn()
    ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data
    : {};
}
```

**Where It Comes From**:
- `request.auth.uid` is populated from the **authentication token's subject (`sub`) claim**
- In production Firestore, this can come from:
  - Firebase Auth tokens
  - Supabase JWT tokens (via OIDC provider configuration)
  - Other OIDC-compliant providers

**Value**:
- Should be the **Supabase user UUID** (e.g., `zg3xWd0PT4Zz96rJ2NVZDTY0jARu`)
- Used as the key to access: `/users/{uid}` documents
- Used as the key to access: `/schools/{schoolId}/admins/{uid}` documents

---

## C. Is That UID the Supabase UID, Firebase Auth UID, or Something Else?

### Analysis

| System | UID Type | Used In Production | Used In Emulator | Status |
|--------|----------|-------------------|------------------|--------|
| **Supabase Auth** | UUID (e.g., `zg3xWd...`) | ✅ YES - active | ❌ NO - not connected | Active provider |
| **Firebase Auth** | UUID (different format) | ❌ NO - not used | ❌ NO - not wired in | Dormant |
| **Firestore Emulator** | Depends on auth setup | ? | ? | **AMBIGUOUS** |

### Critical Finding

**The emulator has an authentication problem:**

1. **Production Supabase Auth** → Provides JWT with `sub` = Supabase UID
2. **Browser Firestore Client** → Connects to Firebase Emulator (port 8080)
3. **Firebase Emulator** → Expects Firebase Auth tokens or custom auth setup
4. **Missing Link** → No bridge between Supabase JWT and Firestore Emulator

**Hypothesis**:
The Firebase Emulator likely has one of these behaviors:
- A) **Rules are NOT enforced in emulator** (permissive default) → All queries allowed
- B) **Emulator accepts any auth token** → Treats all tokens as valid
- C) **Emulator denies all requests without Firebase Auth** → Queries fail silently

**Evidence Needed**: 
- Run an actual Firestore query from browser
- Observe whether:
  - Query succeeds (indicates rule bypass or permissive emulator)
  - Query fails (indicates auth requirement)
  - Query returns partial data (indicates selective rule enforcement)

---

## D. How Does the Application Map the Authenticated User to Firestore Paths?

### Mapping Pattern

**Supabase Auth UID → Firestore Document Keys**:

```
Supabase User
  ↓
user.id = UUID (e.g., "zg3xWd0PT4Zz96rJ2NVZDTY0jARu")
  ↓
Used directly as Firestore document keys:
  - /users/{uid}
  - /schools/{schoolId}/admins/{uid}
  - /families/{familyId}/members/{uid}
```

### User Document Path

**File**: `src/lib/auth/facilitator-auth.functions.ts:L16`

```typescript
export async function checkFacilitatorStatus(userId: string): Promise<boolean> {
  const db = getFirebaseFirestore();
  const userDocRef = doc(db, "users", userId);  // ← Supabase UID used as key
  const userDocSnap = await getDoc(userDocRef);
  const roles = userDocSnap.data()?.["roles"] as string[] | undefined;
  return Array.isArray(roles) && roles.includes("facilitator");
}
```

### School Admin Path

**File**: `firestore.rules` line 23

```javascript
function isSchoolAdmin(schoolId) {
  return signedIn() && exists(
    /databases/$(database)/documents/schools/$(schoolId)/admins/$(request.auth.uid)
  );
}
```

**Usage in Rules**:
```javascript
match /schools/{schoolId}/admins/{adminUid} {
  allow read: if canAccessSchool(schoolId);
  allow create, update: if isAdmin();
  allow delete: if isAdmin();
}
```

### Assumption

**Critical Assumption**: The app assumes that:
1. Supabase `user.id` and Firestore document path keys are **identical**
2. No transformation or mapping occurs
3. The relationship is **1:1 direct mapping**

**Verification Status**: ❌ **NOT VERIFIED** - need to test actual login and data access

---

## E. Does the Firestore Emulator Actually Reproduce Production Authentication/OIDC Behavior?

### Answer: **LIKELY NO**

### Production Behavior

**Firestore in Production**:
- Firebase Firestore is configured to accept OIDC tokens
- When a browser makes a request to production Firestore with a Supabase JWT:
  1. Firestore validates the JWT signature using Supabase's public key
  2. Firestore extracts `sub` claim = Supabase user UID
  3. Rules evaluate with `request.auth.uid` set to that UID
  4. Access decisions based on rules

**Evidence**: 
- Firestore Rules specifically reference `request.auth.uid`
- Rules documentation shows this is populated from OIDC providers
- Production Firestore project (`tatichildsavemvp`) can trust Supabase JWTs

### Emulator Behavior

**Firebase Emulator in Emulator Mode**:
- Runs locally at `127.0.0.1:8080`
- Typically has limited or permissive authentication
- **Does NOT automatically trust external OIDC providers** (like Supabase)
- May require explicit Firebase Auth Emulator setup

**Likely Behavior**:
1. Browser connects to local Firestore Emulator
2. Browser has NO Firebase Auth user (uses Supabase, not Firebase)
3. Browser Firestore queries include NO authentication header
4. Emulator evaluates rules with `request.auth = null`
5. Rules require `signedIn()` (checks `request.auth != null`)
6. Queries should be **DENIED by rules**

**BUT**: If queries are working (tests pass, QA data was loaded), then either:
- A) Emulator is running in **permissive mode** (rules not enforced)
- B) Emulator is configured to **bypass rules**
- C) There's a **custom auth setup I haven't found**
- D) Queries are **failing silently** and errors are being ignored

### Critical Gap for H3.3 QA

| Aspect | Requirement | Current Status | Impact |
|--------|-------------|-----------------|---------|
| **Production Supabase Auth** | Works with production Firestore | ✅ Configured in .env | Can test real login |
| **Emulator Supabase Bridge** | Emulator accepts Supabase JWTs | ❓ UNKNOWN | Blocks QA if not working |
| **Firestore Rules Enforcement** | Rules are actually enforced in emulator | ❓ UNKNOWN | Security testing blocked if bypassed |
| **Client Auth Flow** | Browser Firestore inherits Supabase auth | ❌ NOT SET UP | QA likely cannot work locally |

---

## RECOMMENDATIONS FOR PHASE 2-3

### Phase 2 Verification (DO NOT ASSUME EMULATOR EQUIVALENCE)

**Required Testing**:
1. Create a dedicated Supabase QA test account
2. Log in via browser at `/login` using Supabase auth
3. Inspect browser localStorage for Supabase JWT token
4. Make a Firestore query from browser Firestore client
5. Observe the result:
   - ✅ SUCCESS → Emulator is permissive or has a bridge
   - ❌ FAILURE → Emulator requires different auth setup
6. Document the actual behavior

### Phase 3 Decision Tree

**If Emulator Works With Supabase Auth**:
- ✅ Proceed with H3.3 QA using test Supabase accounts
- Document emulator configuration as deviation from production

**If Emulator Does NOT Work With Supabase Auth**:
- ❌ STOP - local QA is blocked by architecture gap
- Options:
  1. Test against production Firestore (risky, requires credentials)
  2. Configure Firestore emulator to accept Supabase tokens (needs custom setup)
  3. Document limitation and use only automated tests
  4. Accept that manual QA must happen on staging/production with proper test accounts

---

## SUMMARY OF FINDINGS

| Question | Answer | Status |
|----------|--------|--------|
| **A. How does Firestore receive identity?** | Browser → Emulator (auth method unknown); Server → Middleware attaches Supabase JWT | ⚠️ PARTIAL |
| **B. What is `request.auth.uid`?** | Should be Supabase user UUID (extracted from JWT `sub` claim) | ✅ CLEAR |
| **C. What type of UID?** | Supabase UUID (not Firebase UID, not custom) | ✅ CLEAR |
| **D. How does app map users to Firestore?** | Direct 1:1 mapping: `Supabase user.id` → Firestore document key | ✅ CLEAR |
| **E. Does emulator reproduce production auth?** | **LIKELY NO** — Emulator probably doesn't trust Supabase JWTs natively | ❌ CRITICAL GAP |

---

## BLOCKING ISSUE

**The local Firebase Emulator is NOT configured to accept Supabase JWT tokens.**

This means:
- ❌ Browser Firestore queries likely CANNOT authenticate with Supabase credentials
- ❌ Client-side Firestore access in browser may fail or be blocked by emulator
- ❌ Server-side functions CAN work (they attach Supabase JWT explicitly via middleware)
- ❌ Local manual QA may be impossible without additional setup

**Next Action**: 
Conduct empirical verification in Phase 2 to determine if emulator has a workaround or permissive mode.

---

**WAITING FOR PHASE 2**: Empirical testing to resolve the emulator auth gap.
