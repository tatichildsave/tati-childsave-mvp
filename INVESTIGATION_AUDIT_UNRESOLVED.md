# Admin Enrollment 500 Error — Evidence-Based Investigation

**Date:** 2026-10-14  
**Branch:** fix/admin-enrollment-stabilization  
**Status:** UNRESOLVED — Awaiting Production Evidence  

---

## Critical Unresolved Questions

### 1. Where Does the 500 Error Actually Occur?

**Background:**
- User reports HTTP 500 when clicking "Next" on Step 2 of `/admin/enroll`
- User's browser console showed `API_KEY_HTTP_REFERRER_BLOCKED` error with referrer `https://tatichildsavemvp.firebaseapp.com/`

**Contradiction:**
- `/admin/enroll` workflow uses TanStack server functions (no direct Firebase API calls)
- Only `src/routes/admin/index.tsx` has direct Firebase Identity Toolkit call to `identitytoolkit.googleapis.com`
- The referrer `tatichildsavemvp.firebaseapp.com` suggests a different code path than what's in production

**BLOCKER:** Need to distinguish:
1. Is the 500 error from the enrollment workflow or the admin dashboard?
2. Where is the `identitytoolkit.googleapis.com` request originating in the user's deployment?
3. Is the user testing on the live Vercel deployment or local environment?

**Action Required:**
- [ ] User must provide exact screenshot of browser DevTools Network tab showing the 500 request
- [ ] Include request URL, method, headers, and response body
- [ ] Or access Vercel Function logs for the failing deployment

---

### 2. Authorization Audit — What Was Actually Relaxed?

**Finding:** Commit `2ce5a47` changed `verifyAdminAuthorization()`:

**Before:**
```typescript
if (!Array.isArray(roles) || !roles.includes("admin")) {
  throw new Error("Admin authorization required");
}
```

**After:**
```typescript
if (!Array.isArray(roles) || (roles.length === 0)) {
  console.warn(`[verifyAdminAuthorization] User ${uid} has no roles in Firestore`, userData);
  // For pilot, allow it anyway
  // throw new Error("Authorization required (no roles found)");
}
```

**Security Impact:**
- ✅ **ANY authenticated user** can now provision families
- ✅ **Users with NO roles** can provision families (commented out check)
- ✅ **Parents can provision other parents** and children
- ✅ Relaxation affects all 5 server functions: `provisionFamily`, `provisionParent`, `provisionChild`, `resetChildPin`, `verifyProvisioningState`

**Is This the Root Cause of 500?**
- **UNLIKELY.** Authorization relaxation would cause graceful rejection, not 500.
- If authorization check passed, the 500 must come from downstream code.

**BLOCKER:** Need exact error message from server logs to identify where execution is failing.

---

### 3. Session Cookie Handling — Is It Actually Working?

**Configuration:**
- Session cookie name: `parent-session` (dev) or `__Secure-parent-session` (prod)
- Created by: `createParentSession(idToken)` after sign-in
- Verified by: `getCurrentAdminUid()` using `getCookie()` from TanStack server

**Questions:**
1. Is the session cookie being set after parent login?
2. Can TanStack's `getCookie()` access HTTP-only cookies on the server?
3. Are the cookie names matching between creation and verification?

**Action Required:**
- [ ] Enable server-side logging in production to trace cookie access
- [ ] Add logs to `getCurrentAdminUid()` that show:
  - Whether cookie was found
  - Cookie name attempts
  - Session verification result

---

### 4. Error Response Serialization — Why HTML Instead of JSON?

**Observation:**
- User reported seeing raw HTML like `<!doctype html>` in error output
- TanStack server functions should return JSON responses
- Error may be getting wrapped in HTML error page by Vercel

**Questions:**
1. How does TanStack serialize errors back to the client?
2. Is the error being caught and re-thrown as an HTML response?
3. Is there error middleware that's converting JSON to HTML?

**Current Error Handling:**
```typescript
// In enrollment UI
try {
  const result = await provisionParent({...});
} catch (err) {
  setError(err instanceof Error ? err.message : "Failed to create parent account");
}
```

This assumes `err` is an Error object. If TanStack returns something else (like HTML), this will fail.

**Action Required:**
- [ ] Add defensive error parsing to handle non-JSON responses
- [ ] Log raw error responses to understand what's being returned

---

### 5. Bootstrap Process — How Is the First Admin Created?

**Requirement:** Only authorized admins can provision accounts, but we need a way to create the first admin.

**Current State:**
- Admin dashboard has `handleCreateAdmin` button
- Uses Firebase Cloud Function `createAdminUser`
- No visibility into bootstrap process

**Questions:**
1. Who/what calls `createAdminUser` Cloud Function?
2. How does the first admin get created?
3. Is there a documented bootstrap process for pilot launch?

**Action Required:**
- [ ] Verify bootstrap process exists and is documented
- [ ] Ensure it cannot be called from the client without proper authorization
- [ ] Test creating first admin through secure process

---

### 6. Production Deployment Configuration — Are Environment Variables Correct?

**Required Environment Variables:**
```
# Client-side (VITE_ prefix, exposed to browser)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Server-side (not VITE_ prefix, server-only)
FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT=...
```

**Questions:**
1. Are all VITE_ variables correctly set in Vercel environment?
2. Is the production authDomain pointing to the correct Firebase project?
3. Is the Vercel domain `tati-childsave-mvp.vercel.app` authorized in Firebase?

**Action Required:**
- [ ] Verify Vercel environment variables match local `.env`
- [ ] Check Firebase Console → Authentication → Settings → Authorized domains
- [ ] Confirm `tati-childsave-mvp.vercel.app` is in the authorized list

---

### 7. Is There a Duplicate/Old Provisioning Code Path?

**Finding:** Two separate provisioning architectures exist:

**Old Path (Admin Dashboard):**
- Location: `src/routes/admin/index.tsx`
- Uses direct Firebase API call to `identitytoolkit.googleapis.com`
- Has `handleCreateAdmin`, `handleCreateParent`, `handleCreateFamily`, `handleCreateFacilitator`
- **INSECURE:** Client-side API calls bypass server authorization

**New Path (Enrollment Workflow):**
- Location: `src/routes/admin/enroll/`
- Uses TanStack server functions
- Has 4-step workflow
- **SECURE:** Server-side provisioning

**Problem:**
- Both are active in production
- User may be confused about which to use
- Admin dashboard functions will fail with referrer errors

**Action Required:**
- [ ] Identify which path the user was actually testing
- [ ] Audit both paths for security issues
- [ ] Plan consolidation strategy (disable old path, migrate to new)

---

## Required Evidence to Proceed with Fixes

**Before implementing solutions, I need:**

1. **Exact Network Request Details**
   - Screenshot of browser DevTools → Network tab
   - Show the failing request to `/admin/enroll`
   - Include: URL, method, status code, headers, request body, response body

2. **Server-Side Logs from Vercel**
   - Vercel Project → Deployments → Function logs
   - Show logs for the failing server function call
   - Include any error messages, stack traces, or diagnostic output

3. **Verification of Production Configuration**
   - Confirm environment variables are deployed to Vercel
   - Check Firebase Console for authorized domains
   - Verify service account credentials are accessible

4. **Clarification on Testing Context**
   - Was the error from live Vercel deployment or local dev?
   - Which provisioning path (admin dashboard or enrollment workflow)?
   - What was the exact sequence of user actions before the 500?

5. **Bootstrap Process Documentation**
   - How was the test admin account created?
   - Is there a documented, secure way to create the first admin?
   - Can only authorized admins create new admins?

---

## Authorization Issues to Fix

**Confirmed Issues (No Evidence Needed):**

1. **`verifyAdminAuthorization()` is too permissive**
   - Currently allows ANY authenticated user to provision
   - Should enforce "admin" role from Firestore
   - Must be fixed before production, even for pilot

2. **Two separate provisioning architectures**
   - Admin dashboard uses insecure client-side calls
   - Enrollment workflow uses secure server functions
   - Consolidation needed

3. **Missing error handling for server function failures**
   - Enrollment UI doesn't handle HTML error responses
   - Should have defensive parsing and friendly error messages

---

## Immediate Actions (No Evidence Required)

These can be done while waiting for production logs:

1. **[ ] Restore strict admin authorization**
   ```typescript
   // Change verifyAdminAuthorization() back to:
   if (!Array.isArray(roles) || !roles.includes("admin")) {
     throw new Error("Admin authorization required");
   }
   ```

2. **[ ] Add comprehensive error handling**
   - Detect and handle non-JSON responses
   - Display friendly error messages
   - Log raw responses for debugging

3. **[ ] Disable or secure old admin dashboard provisioning**
   - Move admin creation to secure server function
   - Remove direct Firebase API calls
   - Redirect to enrollment workflow

4. **[ ] Add bootstrap documentation**
   - Document secure process for creating first admin
   - Include Vercel setup instructions
   - Include Firebase configuration steps

5. **[ ] Implement server-side diagnostic logging**
   - Log session cookie access (without exposing value)
   - Log authorization checks (which user, what roles)
   - Log provisioning steps with timestamps
   - Never log passwords, PINs, or credentials

---

## Contingency Plan

**If Production Logs Are Unavailable:**

1. Can the user access Vercel Function logs directly?
   - Vercel Project → Deployments → Click a deployment
   - Function logs show recent function invocations
   
2. Can we reproduce locally?
   - Run full build locally with production-like environment
   - Manually test enrollment workflow step-by-step
   - Compare local behavior with production behavior

3. Can we add temporary diagnostic output?
   - Add explicit error responses from server functions
   - Return detailed error info (safe, non-sensitive)
   - Temporarily enable verbose logging
   - Submit a test family enrollment and inspect output

---

## Summary

**Root Cause Status:** UNRESOLVED  
**Why:** Cannot determine where 500 error originates without:
- Exact request details from browser
- Server-side logs from Vercel
- Verification of production configuration

**What We Know:**
- Authorization is too permissive (needs restoration)
- Two separate provisioning architectures (needs consolidation)
- Error handling is weak (needs improvement)

**What We Don't Know:**
- Where the 500 error actually occurs
- What causes it (session cookie, Firebase config, authorization, downstream code?)
- Whether it affects production or is test-environment issue
- Whether fixing authorization will resolve the 500 or if it's unrelated

**Next Step:** Provide production evidence or enable diagnostic logging to identify exact failure point.
