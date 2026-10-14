# Phase 5C: Admin Authentication and Enrollment Testing Plan

**Date:** Phase 5C Testing  
**Status:** 🔄 IN PROGRESS  
**Branch:** `fix/admin-enrollment-stabilization`  

---

## Test Execution Framework

### Test Categories

1. **Session Cookie Tests** (Verify session creation)
2. **Authorization Boundary Tests** (Verify admin-only access)
3. **Enrollment Workflow Tests** (Verify end-to-end functionality)
4. **Security Tests** (Verify privilege escalation prevention)
5. **Automated Tests** (Unit, integration, authorization)
6. **Build Verification** (Production build success)

---

## 1. Session Cookie Creation Tests

### Test 1.1: Email/Password Login Session Creation

**Objective:** Verify admin can sign in with email/password and session cookie is created

**Setup:**
- Test admin account exists in Firebase Auth with email/password
- Admin account has `roles: ["admin"]` in Firestore `/users/{uid}`

**Steps:**
1. Navigate to `https://[PRODUCTION_URL]/admin-login`
2. Enter admin email address
3. Enter admin password
4. Click "Sign In"
5. Open browser DevTools → Application → Cookies
6. Look for `parent-session` or `__Secure-parent-session` cookie

**Expected Results:**
- ✅ Sign-in succeeds (no error message)
- ✅ Redirects to `/admin` dashboard
- ✅ Cookie `parent-session` (dev) or `__Secure-parent-session` (prod) exists
- ✅ Cookie has `HttpOnly` flag enabled (visible in DevTools)
- ✅ Cookie has `Secure` flag enabled in production
- ✅ Cookie `Path` is `/`
- ✅ Cookie has `Max-Age` or `Expires` (5 days)
- ✅ Browser DevTools Network tab shows POST to `/_serverFn/createParentSessionFn`

**Pass Criteria:** All cookies flags correct and session created

---

### Test 1.2: Google OAuth Login Session Creation

**Objective:** Verify admin can sign in with Google and session cookie is created

**Setup:**
- Test admin account has Firebase Auth Google credential
- Admin account has `roles: ["admin"]` in Firestore

**Steps:**
1. Navigate to `https://[PRODUCTION_URL]/admin-login`
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Open browser DevTools → Application → Cookies
5. Verify session cookie exists

**Expected Results:**
- ✅ OAuth flow completes successfully
- ✅ Redirects to `/admin` dashboard
- ✅ Session cookie exists with correct flags
- ✅ Cookie was created via `createParentSessionFn` server function

**Pass Criteria:** Session cookie exists after Google sign-in

---

### Test 1.3: Returning User Session Creation

**Objective:** Verify session cookie is created when admin already has Firebase Auth session

**Setup:**
- Admin is already signed in at Firebase Auth level (session cookie might exist from previous login)
- Navigate away and back to `/admin-login`

**Steps:**
1. Sign in as admin (complete Test 1.1 or 1.2)
2. Clear browser cookies (except Firebase Auth session)
3. Or wait for session cookie to expire
4. Navigate to `/admin-login` again
5. Observe behavior

**Expected Results:**
- ✅ If Firebase Auth session still valid: Automatically redirects to `/admin`
- ✅ Session cookie re-created via `onAuthStateChanged` effect
- ✅ No manual sign-in required if Firebase session valid
- ✅ If Firebase session expired: Shows sign-in form
- ✅ After re-signing in: Session cookie created again

**Pass Criteria:** Session lifecycle handled correctly

---

### Test 1.4: Session UID Verification

**Objective:** Verify session cookie UID matches Firebase authenticated account

**Setup:**
- Admin account created with known UID
- Can query Firebase Auth for this UID

**Steps:**
1. Admin signs in successfully
2. Open browser DevTools → Console
3. Run: 
   ```javascript
   // Get Firebase Auth user UID
   let user = await firebase.auth().currentUser;
   console.log("Firebase Auth UID:", user.uid);
   ```
4. Server-side: Check logs or query Firestore to see which UID was used for provisioning
5. Cross-reference with session cookie UID

**Expected Results:**
- ✅ Session cookie UID matches Firebase Auth UID
- ✅ Session cookie UID matches Firestore admin user record UID
- ✅ All three align (Firebase Auth → Session Cookie → Firestore)

**Pass Criteria:** UID consistency verified across all three sources

---

## 2. Authorization Boundary Tests

### Test 2.1: Admin Can Access Enrollment Workflow

**Objective:** Verify admin can access and use `/admin/enroll` route and server functions

**Setup:**
- Admin signed in via email/password or Google
- Admin has valid session cookie
- Admin has `roles: ["admin"]` in Firestore

**Steps:**
1. Admin signed in at `/admin` dashboard
2. Navigate to `/admin/enroll`
3. See "Step 1: Family Information" form
4. Fill form with test data:
   - Family Name: "Test Family Session 5C"
   - Location: "Test Location"
   - Any other required fields
5. Click "Next" button
6. Observe Network tab in DevTools

**Expected Results:**
- ✅ `/admin/enroll` route loads (no 403 or redirect)
- ✅ Step 1 form is visible
- ✅ Click "Next" calls `provisionFamily()` server function
- ✅ Network tab shows POST to `/_serverFn/provisionFamily` with **200 OK** (not 500)
- ✅ Family record created in Firestore (can be verified in Firestore Console)
- ✅ Proceeds to Step 2 without error
- ✅ Step 2 form loads (parent details)

**Pass Criteria:** Admin successfully calls server functions without 500 error

---

### Test 2.2: Non-Admin Cannot Access Server Functions

**Objective:** Verify non-admin users cannot call enrollment server functions

**Setup:**
- Create a test **parent account** (not admin)
- Parent signed in at `/login`
- Parent has `roles: ["parent"]` in Firestore
- Parent does NOT have `admin` role

**Steps:**
1. Sign in as parent
2. Navigate directly to `/admin/enroll` URL
3. Observe behavior (route protection)
4. If route allows access (should not), try to submit form
5. Observe server function response

**Expected Results:**
- ✅ **Ideally:** Route redirects to `/` (frontend protection)
- ✅ **If route allows access:** Server function rejects with "Admin authorization required" error
- ✅ Server returns **400/403/401** error (not 200)
- ✅ Firestore shows NO new family record created
- ✅ No privilege escalation possible

**Pass Criteria:** Non-admin access blocked at server level

---

### Test 2.3: Parent Cannot Escalate to Admin

**Objective:** Verify parent cannot modify their own Firestore `roles` field to add "admin"

**Setup:**
- Parent account exists in Firestore with `roles: ["parent"]`
- Parent has valid session cookie
- Parent is signed in

**Steps:**
1. Open browser Console or Firestore SDK
2. Attempt to modify own user document:
   ```javascript
   // This should FAIL due to Firestore rules
   await db.collection("users").doc(currentUser.uid).update({
     roles: ["parent", "admin"]
   });
   ```
3. Observe error response

**Expected Results:**
- ✅ Firestore returns **Permission Denied** error
- ✅ Rules prevent self-modification of `roles` field
- ✅ Parent cannot escalate privileges
- ✅ Firestore logs show rejected write

**Pass Criteria:** Firestore rules enforce privilege escalation prevention

---

### Test 2.4: Admin Cannot Self-Promote Further

**Objective:** Verify admins cannot modify their own `roles` field (not even to keep existing admin status)

**Setup:**
- Admin account with `roles: ["admin"]` in Firestore
- Admin has valid session cookie
- Admin is signed in

**Steps:**
1. Attempt to self-update in Firestore Console or SDK:
   ```javascript
   await db.collection("users").doc(currentUser.uid).update({
     roles: ["admin"] // Even keeping the same role
   });
   ```
2. Observe error response

**Expected Results:**
- ✅ Firestore returns **Permission Denied** error
- ✅ Admins cannot update their own user document (except via other admins)
- ✅ Rules prevent self-modification even for maintaining status

**Pass Criteria:** Firestore rules prevent admin self-update

---

## 3. Enrollment Workflow Tests

### Test 3.1: Single Parent, Single Child Enrollment

**Objective:** Verify complete enrollment workflow with one parent and one child

**Setup:**
- Admin signed in with valid session cookie
- No test data in system

**Steps:**

**Step 1: Family Information**
1. Navigate to `/admin/enroll`
2. Enter:
   - Family Name: "Test Family 5C-1P1C"
   - Location: "Test Location"
3. Click "Next"

**Step 2: Parent Details**
1. Enter:
   - Parent Email: "testparent5c1p@example.com"
   - Parent Name: "Test Parent 5C"
   - Phone: (optional) "555-0101"
2. Click "Next"

**Step 3: Add Children**
1. Enter first child:
   - Child Name: "Test Child 1"
   - Age: 10
   - Avatar: (select emoji)
2. Click "Add Child" (if interface allows adding more)
3. No additional children
4. Click "Next"

**Step 4: Review & Confirm**
1. Review all information
2. Click "Confirm" or "Submit"
3. Observe success message

**Expected Results:**
- ✅ Each step completes without 500 error
- ✅ All network requests return 200 OK
- ✅ Firestore contains:
  - 1 family document with admin UID as creator
  - 1 parent document with correct email/name
  - 1 child document with correct name/age
  - Family-parent relationship established
  - Child assigned to family
- ✅ Parent receives onboarding email (if configured)
- ✅ Child has TATI ID generated
- ✅ Child has PIN generated (not visible to admin)

**Pass Criteria:** Complete workflow succeeds, all records created correctly

---

### Test 3.2: Single Parent, Multiple Children Enrollment

**Objective:** Verify admin can add multiple children to one parent

**Setup:**
- Admin signed in
- Previous test data (or clean slate)

**Steps:**

**Steps 1-2:** Same as Test 3.1 (Family and Parent)

**Step 3: Add Children**
1. Add Child 1:
   - Name: "Child A"
   - Age: 8
   - Avatar: 😀
2. Click "Add Child" button
3. Form clears for next child
4. Add Child 2:
   - Name: "Child B"
   - Age: 10
   - Avatar: 😊
5. Click "Add Child" button
6. Add Child 3:
   - Name: "Child C"
   - Age: 12
   - Avatar: 😄
7. No more children
8. Click "Next" or "Complete"

**Step 4: Review & Confirm**
1. Verify all 3 children listed
2. Confirm submission

**Expected Results:**
- ✅ All 3 children created in Firestore
- ✅ Each child has unique TATI ID
- ✅ Each child has unique PIN
- ✅ All children linked to same family and parent
- ✅ Firestore shows correct family-child relationships
- ✅ No errors or 500 responses

**Pass Criteria:** Multiple children successfully enrolled

---

### Test 3.3: Duplicate Submission Idempotency

**Objective:** Verify duplicate form submissions don't create duplicate records

**Setup:**
- Admin at Step 4 (Review & Confirm) ready to submit
- Network configured to slow down requests (DevTools throttle to "Slow 3G")

**Steps:**
1. Click "Confirm" button
2. Immediately click again (within 100ms)
3. Observe network requests
4. Wait for completion

**Expected Results:**
- ✅ Only ONE family record created in Firestore (not 2-3)
- ✅ Only ONE parent record created
- ✅ Only ONE set of children created
- ✅ No duplicate detection error shown to user
- ✅ Can safely retry if needed

**Pass Criteria:** Idempotent server functions prevent duplicates

---

### Test 3.4: Partial Enrollment Failure Recovery

**Objective:** Verify system handles partial failures gracefully (e.g., family created but parent fails)

**Setup:**
- Admin starting enrollment
- (Optional: Mock server failure at specific step)

**Steps:**
1. Start enrollment
2. Complete Step 1 (family)
3. Step 2: Use invalid email address format
4. Click "Next"
5. Observe error response

**Expected Results:**
- ✅ Error message is clear and actionable
- ✅ No raw HTML or stack trace displayed
- ✅ Parent document NOT created (due to validation error)
- ✅ Family still exists (or is cleaned up gracefully)
- ✅ Can retry with correct data

**Pass Criteria:** Graceful error handling, no inconsistent state

---

## 4. Security Tests

### Test 4.1: Session Endpoint Verification

**Objective:** Verify `createParentSessionFn` endpoint validates ID token properly

**Testing Method:** Code review + manual test

**Code Review Points:**
- ✅ Endpoint receives Firebase ID token
- ✅ Endpoint calls `verifyIdToken()` with Firebase Admin SDK (server-side)
- ✅ Cannot grant admin privileges via session endpoint
- ✅ Session only identifies user, doesn't create roles
- ✅ No credentials or secrets in error messages
- ✅ No custom claims injection possible

**Manual Test:**
1. Admin signs in successfully
2. Inspect session cookie in DevTools
3. Decode JWT (use jwt.io)
4. Verify claims are standard Firebase claims
5. Verify no custom "admin" claim injected at session creation

**Expected Results:**
- ✅ Session endpoint only verifies, doesn't grant privileges
- ✅ Admin role comes from Firestore, not session endpoint
- ✅ Token verification happens on server
- ✅ No privilege escalation vector

**Pass Criteria:** Session endpoint security verified

---

### Test 4.2: Cookie Security Flags Verification

**Objective:** Verify session cookie has correct security settings

**Setup:**
- Admin signed in (Test 1.1 or 1.2 completed)

**Steps:**
1. Open DevTools → Application → Cookies
2. Click on `parent-session` or `__Secure-parent-session` cookie
3. Verify each flag:
   - HttpOnly: ✅ Checked (cannot access via JavaScript)
   - Secure: ✅ Checked in production (HTTPS-only)
   - SameSite: Check for "Lax" or "Strict"
   - Path: Should be "/"
   - Domain: Should match production domain
   - Max-Age: Should be ~5 days (432000 seconds)

**Expected Results:**
- ✅ HttpOnly: Enabled (cannot be stolen by XSS)
- ✅ Secure: Enabled in production (HTTPS-only)
- ✅ SameSite: Set to "Lax" or "Strict" (CSRF protection)
- ✅ Path: "/"
- ✅ Max-Age: ~432000 seconds (5 days)

**Pass Criteria:** All security flags correct

---

## 5. Automated Test Execution

### Test 5.1: Run Authorization Tests

**Command:**
```bash
npm run test -- authorization.test.ts
```

**Expected Results:**
```
✓ authorization boundaries (11 tests passed)
  ✓ allows a parent to access own-family child
  ✓ blocks a parent from another family's child
  ✓ allows a child session to access only its own child
  ✓ does not let a parent use admin access
  ✓ does not let a child session use admin access
  ✓ does not allow self-assignment of admin role
  ... and 5 more
```

**Pass Criteria:** All authorization tests pass

---

### Test 5.2: Run Provisioning Tests

**Command:**
```bash
npm run test -- provisioning
```

**Expected Results:**
- ✅ All provisioning-related tests pass
- ✅ Authorization boundary tests pass
- ✅ Family creation tests pass
- ✅ Parent creation tests pass
- ✅ Child creation tests pass
- ✅ Duplicate prevention tests pass

**Pass Criteria:** All provisioning tests pass

---

### Test 5.3: Run Full Test Suite

**Command:**
```bash
npm run test
```

**Expected Results:**
```
Test Files:  31 passed (31)
Tests:       637 passed (637)
Duration:    ~30 seconds
```

**Pass Criteria:** All tests pass, no failures or timeouts

---

## 6. Production Build Verification

### Test 6.1: Production Build Success

**Command:**
```bash
npm run build
```

**Expected Results:**
```
✓ built in 12-15s
- Zero errors
- Zero TypeScript violations
- All assets generated
- No warnings (except pre-existing)
```

**Pass Criteria:** Build completes without errors

---

## 7. Firebase Configuration Verification

### Test 7.1: Firebase API Key Referrer Restrictions

**Objective:** Verify Firebase API key referrer restrictions don't block Vercel domain

**Steps:**
1. Review Google Cloud Console → Firebase Project → Settings
2. Check API Keys → Restrictions
3. Verify Vercel domain (e.g., `tati-childsave-mvp.vercel.app`) is in whitelist
4. Or verify referrer restrictions are removed

**Expected Results:**
- ✅ Vercel domain is allowed OR
- ✅ No HTTP referrer restrictions (less secure but works)
- ✅ No API_KEY_HTTP_REFERRER_BLOCKED errors in browser console

**Pass Criteria:** Firebase API accessible from Vercel domain

---

### Test 7.2: Firebase Project Consistency

**Objective:** Verify production uses correct Firebase project

**Steps:**
1. Check Vercel environment variables for `VITE_FIREBASE_PROJECT_ID`
2. Compare with Firebase Console project ID
3. Verify they match

**Expected Results:**
- ✅ Vercel `VITE_FIREBASE_PROJECT_ID` matches Firebase Console project
- ✅ All production traffic goes to correct Firebase project
- ✅ No cross-project conflicts

**Pass Criteria:** Firebase project is consistent

---

## Test Execution Timeline

| Phase | Test Category | Estimated Time | Status |
|-------|---------------|-----------------|--------|
| 1 | Session Cookie (1.1-1.4) | 15 min | ⏳ Pending |
| 2 | Authorization Boundary (2.1-2.4) | 20 min | ⏳ Pending |
| 3 | Enrollment Workflows (3.1-3.4) | 30 min | ⏳ Pending |
| 4 | Security Verification (4.1-4.2) | 10 min | ⏳ Pending |
| 5 | Automated Tests (5.1-5.3) | 5 min | ⏳ Pending |
| 6 | Build Verification (6.1) | 2 min | ⏳ Pending |
| 7 | Firebase Config (7.1-7.2) | 5 min | ⏳ Pending |
| **Total** | | **~87 minutes** | ⏳ Pending |

---

## Pass/Fail Criteria Summary

**All of the following MUST pass before approval:**

- ✅ Test 1.1: Email/password session creation
- ✅ Test 1.2: Google OAuth session creation
- ✅ Test 1.3: Returning user session creation
- ✅ Test 1.4: Session UID verification
- ✅ Test 2.1: Admin can access enrollment
- ✅ Test 2.2: Non-admin blocked
- ✅ Test 2.3: Parent cannot escalate
- ✅ Test 2.4: Admin cannot self-promote
- ✅ Test 3.1: Single parent/child workflow
- ✅ Test 3.2: Single parent/multiple children
- ✅ Test 3.3: Duplicate submission handling
- ✅ Test 3.4: Partial failure recovery
- ✅ Test 4.1: Session endpoint secure
- ✅ Test 4.2: Cookie security flags
- ✅ Test 5.1: Authorization tests pass
- ✅ Test 5.2: Provisioning tests pass
- ✅ Test 5.3: Full test suite passes
- ✅ Test 6.1: Production build success
- ✅ Test 7.1: Firebase API key referrer OK
- ✅ Test 7.2: Firebase project consistent

---

## Documented Risks (If Any)

To be filled in as testing progresses...

---

## Next Steps

1. Execute session cookie tests (1.1-1.4)
2. Execute authorization tests (2.1-2.4)
3. Execute enrollment workflow tests (3.1-3.4)
4. Execute security tests (4.1-4.2)
5. Run automated tests (5.1-5.3)
6. Verify build (6.1)
7. Verify Firebase configuration (7.1-7.2)
8. Document any failures
9. Prepare deployment checklist and rollback procedure
10. Report results to user for approval
