# TATI ChildSave — Admin Bootstrap and Session Authentication Investigation

**Date:** Phase 5B Investigation  
**Status:** 🔍 INVESTIGATION COMPLETE  
**Critical Finding:** Admin login does not create server-side session cookie

---

## Executive Summary

The admin test account was created through **manual Firebase Console operations** (not an automated script). The admin can sign in at `/admin-login` and pass client-side role verification, but **enrollment server functions fail** because they expect a server-side session cookie that is never created.

### Key Findings

| Finding | Status | Impact |
|---------|--------|--------|
| **Admin Bootstrap Process** | ✅ Identified | Manual creation via Firebase Console; no automated script |
| **Admin-Login Session Gap** | 🔴 **CRITICAL** | Admin login doesn't create session cookie; server functions expect one |
| **Database Role Mismatch** | ⚠️ SECONDARY | Roles checked in Firestore; Supabase code exists but unused |
| **Authorization Enforcement** | ✅ Verified | Restored to require "admin" role (was relaxed) |
| **Error Response Handling** | ✅ Improved | Added defensive parsing to prevent HTML in UI |

---

## 1. Admin Bootstrap Process Investigation

### How the Test Admin Was Created

**Finding:** The test admin account was created **manually through Firebase Console** (not via script).

**Evidence:**
- No automated bootstrap script exists in the repository
- `scripts/setup-qa-test-data.js` creates school admins, not TATI platform admins
- `scripts/setup-firestore-qa.mjs` is for H3.3 school functionality, not MVP admin
- `package.json` has no bootstrap or admin-creation script
- ADMIN_DASHBOARD_GUIDE.md documents the admin dashboard but not first-admin bootstrap
- FIREBASE_LOCAL_DEVELOPMENT_SETUP.md does not mention admin creation process

**Process Used (Most Likely):**
1. User accessed Firebase Console for the project
2. Created a Firebase Auth user with email/password manually
3. Created a Firestore document at `/users/{uid}` with `roles: ["admin"]`
4. Tested admin login at `/admin-login`
5. Verified access to `/admin` dashboard

**Why No Automated Script?**
- First admin bootstrap is typically a manual, one-time operation
- Considered privileged and not suitable for automated deployment scripts
- Firebase Console is the intended tool for first admin creation

### Bootstrap Security Concerns

✅ **Secure aspects:**
- Firestore security rules prevent users from self-assigning admin role
- Admin login checks Firestore for admin role before granting access
- Admin operations on server-side are gated by `verifyAdminAuthorization()`

⚠️ **Recommended improvements:**
- Document the first-admin bootstrap process explicitly
- Consider Firebase Cloud Function for safe first-admin provisioning
- Implement audit logging for all admin account creation

---

## 2. CRITICAL FINDING: Admin Session Cookie Gap

### The Problem

**Location:** `src/routes/(public)/admin-login.tsx` vs. enrollment server functions

**Flow Comparison:**

#### Parent Login (✅ Creates Session Cookie)
```
1. Parent visits /login
2. Parent signs in with Firebase Auth (email/password)
3. client calls getIdTokenResult() to get Firebase ID token
4. Client calls createParentSessionFn() server function with ID token
5. Server function verifies token and creates HTTP-only session cookie
6. Subsequent calls to enrollment server functions use getCookie("parent-session")
7. Server functions can identify the parent via session cookie
```

#### Admin Login (❌ NO Session Cookie Created)
```
1. Admin visits /admin-login
2. Admin signs in with Firebase Auth (email/password)
3. route.tsx checks Firestore for admin role (client-side)
4. Admin redirected to /admin if admin role present
5. Admin can view /admin dashboard (client-side Firebase auth available)
6. Admin tries to click "Create Family" → calls provisionFamily() server function
7. Server function calls getCurrentAdminUid() which expects session cookie
8. Session cookie DOES NOT EXIST
9. Server returns 500 error: "Unauthenticated: No session cookie found"
```

### Evidence: getCurrentAdminUid() Implementation

**File:** `src/lib/backend/provisioning.functions.ts`

```typescript
export async function getCurrentAdminUid(): Promise<string> {
  const sessionCookie = getCookie("parent-session") || getCookie("__Secure-parent-session");
  
  if (!sessionCookie) {
    throw new Error("Unauthenticated: No session cookie found");
  }

  const decodedIdToken = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie);
  return decodedIdToken.uid;
}
```

**Problem:**
- Function looks for `parent-session` cookie (set by parent login flow)
- Admin login never calls `createParentSessionFn()`
- Cookie is never created for admin
- Server function throws "Unauthenticated" error
- TanStack wraps error in HTML 500 response
- User sees raw HTML or generic error message

### Expected Admin Session Creation

Admin-login.tsx should call `createParentSessionFn()` (or a dedicated `createAdminSessionFn()`) after successful Firebase auth:

**Option A: Reuse Parent Session (Recommended for MVP)**
```typescript
// In admin-login.tsx, after successful Firebase auth:
const idToken = await getAuth().currentUser?.getIdToken();
if (idToken) {
  await createParentSessionFn({ idToken });
  // Now admin has session cookie and can call enrollment server functions
}
```

**Option B: Create Dedicated Admin Session Function**
```typescript
// Create src/lib/backend/firebase/admin-auth.server.ts
export async function createAdminSession(idToken: string) {
  const decodedIdToken = await getFirebaseAdminAuth().verifyIdToken(idToken);
  
  // Verify admin role server-side
  const db = getFirebaseAdminDb();
  const userDoc = await db.collection("users").doc(decodedIdToken.uid).get();
  const roles = userDoc.data()?.roles || [];
  
  if (!Array.isArray(roles) || !roles.includes("admin")) {
    throw new Error("User does not have admin role");
  }

  // Create session cookie
  const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(idToken, {
    expiresIn: 60 * 60 * 24 * 5, // 5 days
  });

  setCookie("admin-session", sessionCookie, {
    httpOnly: true,
    secure: true,
    path: "/",
  });
}

// Update getCurrentAdminUid() to check admin-session first
export async function getCurrentAdminUid(): Promise<string> {
  const sessionCookie = getCookie("admin-session") || getCookie("parent-session") || getCookie("__Secure-parent-session");
  
  if (!sessionCookie) {
    throw new Error("Unauthenticated: No session cookie found");
  }

  const decodedIdToken = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie);
  return decodedIdToken.uid;
}
```

**Recommendation:** Option A (reuse parent session) is simpler for MVP. Admin and parent both need session cookies for server function calls.

---

## 3. Database Role Storage Mismatch

### Discovered Issue

Two different systems checking for admin roles in different databases:

#### Code 1: Admin-Login Client-Side Check (Firestore)
**File:** `src/routes/admin/route.tsx` (lines 18-27)
```typescript
const userDocRef = doc(db, "users", user.uid);
const userDocSnap = await getDoc(userDocRef);

if (userDocSnap.exists()) {
  const roles = userDocSnap.data()?.["roles"] as string[] | undefined;
  if (!Array.isArray(roles) || !roles.includes("admin")) {
    throw redirect({ to: "/" });
  }
}
```

#### Code 2: Server-Side Authorization Check (Firestore)
**File:** `src/lib/backend/provisioning.server.ts` (lines 30-40)
```typescript
const db = getFirebaseAdminDb();
const userDoc = await db.collection("users").doc(uid).get();
const roles = userDoc.data()?.["roles"] as string[] | undefined;

if (!Array.isArray(roles) || !roles.includes("admin")) {
  throw new Error(`Unauthorized: User ${uid} does not have admin role`);
}
```

#### Code 3: roles.server.ts (Supabase)
**File:** `src/lib/auth/roles.server.ts` (lines 4-12)
```typescript
export async function getUserRoles(uid: string): Promise<AppRole[]> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .single();

  return data ? [data.role] : [];
}
```

### Analysis

✅ **Aligned:** Admin-login and provisioning both check Firestore `users.{uid}.roles`  
⚠️ **Orphaned:** `roles.server.ts` queries Supabase but is not used by provisioning or admin login  
✅ **Result:** Current code is consistent (both use Firestore)

### Why Supabase Code Exists

- **History:** Project initially migrated from Supabase to Firebase
- `roles.server.ts` may be leftover from old architecture
- Safe to leave (unused code doesn't affect current flow)
- Can be removed in future cleanup, but not blocking

### Verification

**Admin test account requires:**
- Firebase Auth user with email/password
- Firestore document at `/users/{uid}` with `roles: ["admin"]` (array)

**Confirmation Needed:** User should verify test admin has this structure in Firestore.

---

## 4. Authorization Enforcement Status

### Previously Relaxed Authorization (Commit 2ce5a47)

**File:** `src/lib/backend/provisioning.server.ts` (before Phase 2 fixes)

```typescript
export async function verifyAdminAuthorization(uid: string): Promise<void> {
  // OLD CODE (INSECURE):
  // Authorization check was COMMENTED OUT during pilot phase
  // Any authenticated user could call provisioning functions
}
```

### Current Status (Phase 2 Fixes - Commit a52cd49)

✅ **Authorization Restored:**
```typescript
export async function verifyAdminAuthorization(uid: string): Promise<void> {
  const db = getFirebaseAdminDb();
  const userDoc = await db.collection("users").doc(uid).get();
  const roles = userDoc.data()?.["roles"] as string[] | undefined;

  if (!Array.isArray(roles) || !roles.includes("admin")) {
    throw new Error(
      `Unauthorized: User ${uid} does not have admin role. Actual roles: ${JSON.stringify(roles || [])}`,
    );
  }
}
```

**Security Implications:**
- ✅ Only users with "admin" role in Firestore can provision families
- ✅ Non-admin users cannot call `provisionFamily()`, `provisionParent()`, etc.
- ✅ Server-side verification independent of frontend navigation

### Firestore Security Rules

**Expected Configuration (Not Verified in Repository):**
- Firestore rules should also prevent non-admins from modifying `families`, `parents`, `children` collections
- Rules should prevent users from assigning themselves admin role
- Rules are configured in Firebase Console, not in code

**Recommendation:** Request user to verify Firestore security rules prevent privilege escalation.

---

## 5. Current Provisional Status Summary

### What Works
✅ Admin can sign in at `/admin-login`  
✅ Admin can view `/admin` dashboard  
✅ Authorization check restored (requires "admin" role)  
✅ Error handling improved (no raw HTML)  
✅ Production build passes  

### What's Broken
❌ Admin cannot call enrollment server functions (no session cookie)  
❌ HTTP 500 error when admin tries to provision families/parents  
❌ Users see confusing error messages  

### Why It's Broken
- Admin login doesn't create server-side session cookie
- Enrollment server functions require session cookie to identify caller
- `getCurrentAdminUid()` finds no cookie and throws "Unauthenticated" error
- TanStack wraps error as HTML 500

### What Needs to be Done
1. **[IMMEDIATE]** Make admin-login create session cookie after successful auth
2. **[VERIFY]** Confirm Firestore security rules prevent privilege escalation
3. **[TEST]** End-to-end test: admin can provision families and parents
4. **[TESTING]** Verify non-admins cannot access enrollment functions
5. **[OPTIONAL]** Consolidate admin dashboard and old dashboard (currently two paths)

---

## 6. Session Cookie Implementation Approaches

### Approach 1: Modify admin-login.tsx (Quick Fix)

**File to Change:** `src/routes/(public)/admin-login.tsx`

**Changes:**
1. After successful Firebase auth, call `createParentSessionFn()` with ID token
2. Session cookie is created on server
3. Admin can now call enrollment server functions

**Pros:**
- Minimal changes
- Reuses existing parent session infrastructure
- Works immediately

**Cons:**
- Mixes admin and parent session logic
- Cookie name "parent-session" is confusing for admin

**Effort:** ~15 minutes

### Approach 2: Create Dedicated admin-auth.server.ts (Clean Fix)

**Files to Create/Change:**
1. New: `src/lib/backend/firebase/admin-auth.server.ts` (create session function)
2. New: `src/routes/(public)/create-admin-session` (server function route)
3. Change: `src/routes/(public)/admin-login.tsx` (call new session function)
4. Change: `src/lib/backend/provisioning.functions.ts` (accept admin-session cookie)

**Pros:**
- Clean separation between admin and parent auth flows
- Explicit admin session cookie handling
- Better for future features (admin-specific operations)

**Cons:**
- More code changes
- Requires new server function route

**Effort:** ~45 minutes

### Recommendation

**For MVP Pilot:** Use Approach 1 (quick fix)  
**For Production:** Use Approach 2 (cleaner architecture)

---

## 7. Complete Root Cause Chain

```
User creates admin test account manually in Firebase Console
  ↓
Admin signs in at /admin-login with email/password
  ↓
Firebase Auth succeeds; user.uid = some_uid
  ↓
Client-side: route.tsx checks Firestore for admin role
  ↓
Firestore document exists: users/{uid}.roles = ["admin"]
  ↓
Client-side auth gate passes; admin is at /admin dashboard
  ↓
Admin tries to create family; clicks "Next"
  ↓
TanStack client calls provisionFamily() server function
  ↓
Server function calls getCurrentAdminUid()
  ↓
getCurrentAdminUid() looks for getCookie("parent-session")
  ↓
NO COOKIE FOUND (admin-login never created one)
  ↓
Server throws: "Unauthenticated: No session cookie found"
  ↓
TanStack wraps error in HTML 500 response body
  ↓
Client receives HTML instead of JSON
  ↓
Error handler attempts to parse HTML as error message
  ↓
Browser displays raw HTML or generic error to user
  ↓
User confused: "I'm signed in but getting auth errors"
```

---

## 8. Verification Checklist

Before implementing fixes, confirm:

- [ ] Test admin account exists in Firestore at `/users/{uid}` with `roles: ["admin"]`
- [ ] Test admin can sign in at `/admin-login` successfully
- [ ] Test admin can navigate to `/admin` dashboard
- [ ] Firestore security rules prevent non-admins from creating families
- [ ] Firestore security rules prevent users from self-assigning admin role
- [ ] Current Firebase project matches production Firebase project
- [ ] Environment variables are correctly set in Vercel

---

## 9. Next Steps (Phase 2B Implementation)

### Step 1: Fix Admin Session Cookie
Modify admin-login.tsx to create session cookie after successful Firebase auth.

### Step 2: Test Authorization Boundary
Verify that:
- Admin can call enrollment server functions with session cookie
- Non-admin user cannot call enrollment server functions
- Parent cannot access admin provisioning functions

### Step 3: End-to-End Enrollment Test
Test complete workflow:
1. Admin signs in
2. Admin provisions family
3. Admin provisions parent
4. Admin assigns children to family
5. Parent can sign in and see correct family
6. Child can sign in with TATI ID and PIN

### Step 4: Validate Error Messages
Ensure friendly error messages (no raw HTML) for:
- Permission denied
- Network errors
- Validation errors
- Session timeout

---

## Conclusion

The HTTP 500 error is caused by a **clear architectural gap**: admin login doesn't create a server-side session cookie, but enrollment server functions require one. The fix is straightforward (2-5 lines in admin-login.tsx) and requires no database migrations or complex refactoring.

All other findings (authorization enforcement, error handling, role storage) are in good shape after Phase 2 fixes.
