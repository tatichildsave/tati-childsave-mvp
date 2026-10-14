# Implementation Plan — Admin Enrollment Stabilization (Phase 2 Fixes)

**Branch:** fix/admin-enrollment-stabilization  
**Status:** Ready for Implementation  
**Date:** 2026-10-14  

---

## Overview

This plan addresses critical security and functionality issues in the admin provisioning system:

1. **Restore proper authorization** (no evidence needed)
2. **Consolidate provisioning architecture** (admin dashboard → enrollment workflow)
3. **Improve error handling** (defensive parsing, friendly messages)
4. **Prepare for diagnosis** (add diagnostic logging without evidence requirement)

---

## Issue Summary

### Current State
- **Two separate provisioning paths:**
  - Old: Admin dashboard tabs (insecure, direct Firebase API calls)
  - New: `/admin/enroll` workflow (secure, server functions)
- **Authorization too permissive:** Any authenticated user can provision
- **Error handling weak:** Raw HTML returned to client instead of friendly messages
- **User confusion:** Two different UIs for the same operation

### Target State
- **Single provisioning path:** `/admin/enroll` enrollment workflow only
- **Proper authorization:** Only "admin" role users can provision
- **Robust error handling:** Friendly, structured error messages
- **Clear user experience:** One clear path for admins to enroll families

---

## Fixes Implemented So Far

### ✅ Fix 1: Restore Admin Authorization
**File:** `src/lib/backend/provisioning.server.ts`  
**Change:** Restored strict "admin" role check in `verifyAdminAuthorization()`

**Before:**
```typescript
// Allow any authenticated user (relaxed for pilot)
if (!Array.isArray(roles) || (roles.length === 0)) {
  console.warn(...);
  // Commented out error throw
}
```

**After:**
```typescript
// Enforce admin role strictly
if (!Array.isArray(roles) || !roles.includes("admin")) {
  console.error(`[verifyAdminAuthorization] Authorization denied for user ${uid}...`);
  throw new Error("Admin authorization required to provision accounts");
}
```

**Impact:**
- Only users with "admin" role in Firestore can provision families
- Prevents parents from accessing privileged operations
- Server-side authorization boundary is restored

### ✅ Fix 2: Improve Error Handling in Enrollment UI
**File:** `src/routes/admin/enroll/index.tsx`  
**Change:** Added `parseErrorMessage()` function to handle non-JSON responses

**Added Function:**
```typescript
function parseErrorMessage(err: unknown): string {
  // Safely extract error message from various error types
  // Handles standard Error, TanStack errors, HTML responses, etc.
  // Never displays raw HTML to user
  // Logs raw response for debugging
}
```

**Impact:**
- Defensive parsing prevents raw HTML from displaying to user
- Distinguishes between different error types
- Logs raw errors for server-side diagnosis
- Friendly fallback messages

---

## Remaining Work

### Phase 2A: Consolidate Admin Dashboard (Non-Breaking)

**Objective:** Guide admins to use `/admin/enroll` instead of old dashboard tabs

**Approach 1 (Recommended):** Keep dashboard for management, remove provisioning
- Keep "overview", "users", "families", "family-management" tabs for viewing/managing
- Remove "parent-provisioning", "child-provisioning" tabs
- Add navigation link to `/admin/enroll` from dashboard
- Keep existing management functions (delete, update, view)

**Approach 2 (Minimal):** Add deprecation warning
- Keep all tabs but show warning: "Use /admin/enroll for provisioning"
- Disable the insecure direct API calls
- Redirect form submissions to `/admin/enroll`

**Files to Modify:**
- `src/routes/admin/index.tsx` — Remove or disable provisioning tabs
- `src/routes/admin/index.tsx` — Disable `handleCreateParent()` function (insecure direct API call)
- Add navigation to encourage `/admin/enroll` usage

**Why Not Done Yet:**
- Requires understanding which admin dashboard functions users actually need
- Don't want to remove useful management features
- Need to ensure `/admin/enroll` provides all functionality users expect from dashboard

---

### Phase 2B: Add Bootstrap Documentation

**Objective:** Document secure process for creating first admin

**Required Documentation:**
1. How to create test admin account during pilot setup
2. Step-by-step Vercel environment setup
3. Firebase credentials configuration
4. Manual admin creation process (if needed)

**Files to Create:**
- `ADMIN_BOOTSTRAP_GUIDE.md` — Step-by-step setup for first admin

**Why Not Done Yet:**
- Depends on understanding current bootstrap process
- May require Vercel/Firebase Console access that only user has
- Should be confirmed before pilot launch

---

### Phase 2C: Add Diagnostic Logging (With Caveat)

**Objective:** Prepare for diagnosing 500 error when production evidence becomes available

**Changes Needed:**
1. Log session cookie retrieval (without exposing value):
   ```typescript
   console.log("[getCurrentAdminUid] Session cookie retrieved: [REDACTED]");
   ```

2. Log authorization verification with user context:
   ```typescript
   console.log(`[verifyAdminAuthorization] User ${uid} authorized with roles:`, roles);
   ```

3. Log provisioning step completion:
   ```typescript
   console.log(`[provisionParent] Step 1 complete: Email validation passed`);
   console.log(`[provisionParent] Step 2 complete: Auth user created: ${uid}`);
   console.log(`[provisionParent] Step 3 complete: Firestore document created`);
   ```

**Files to Modify:**
- `src/lib/backend/provisioning.functions.ts`
- `src/lib/backend/provisioning.server.ts`

**Impact:** When 500 error occurs in production, Vercel logs will show exactly where provisioning failed

---

## Testing Strategy (Phase 3)

Once fixes are committed and tests run, verify:

### Authorization Tests
- [ ] Admin can access `/admin/enroll` workflow
- [ ] Admin can provision families, parents, children
- [ ] Parent (non-admin) cannot access provisioning functions
  - (Verify by having non-admin account attempt to call server functions)
  - Should see "Admin authorization required" error

### Error Handling Tests
- [ ] Invalid email format shows friendly error
- [ ] Duplicate email shows friendly error
- [ ] Missing required field shows friendly error
- [ ] Network error doesn't show raw HTML
- [ ] Server error doesn't show raw HTML

### End-to-End Workflow Tests
1. Admin signs in
2. Admin navigates to `/admin/enroll`
3. Admin enters family name → Step 1 complete
4. Admin enters parent details → Server function executes → Step 2 complete
5. Admin adds children with generated TATI IDs/PINs → Step 3 complete
6. Admin reviews and confirms → Family created

### Data Consistency Tests
- [ ] Family record created in Firestore
- [ ] Parent account created in Firebase Auth
- [ ] Parent linked to family
- [ ] Children added to family
- [ ] TATI IDs are unique
- [ ] PINs are properly hashed

### Security Tests
- [ ] No passwords in logs
- [ ] No PINs in logs
- [ ] No service account credentials in logs
- [ ] Server functions verify authorization independently
- [ ] Unauthenticated user gets 500 → authentication error

---

## Build & Type Check

**Before Testing:**
```bash
npm run build    # Full production build
npm run typecheck # TypeScript validation
npm run lint     # Linting (if available)
```

**Expected Result:** No errors, no warnings

---

## Evidence Required for 500 Error Diagnosis

Once fixes are implemented and tested locally, we need production evidence:

1. **Vercel Runtime Logs:**
   - Exact error message from failing server function
   - Stack trace showing where execution stopped
   - Timestamps and request ID

2. **Browser Network Details:**
   - Request URL, method, headers
   - Request body (sanitized)
   - Response status, headers, body (first 1KB)

3. **User Environment Context:**
   - Vercel deployment URL
   - Whether testing live or local
   - User role in Firestore (admin or parent?)
   - Session cookie name being used

---

## Deployment Plan

1. **Commit fixes to fix/admin-enrollment-stabilization branch**
   - `git add -A`
   - `git commit -m "Phase 2: Restore admin authorization and improve error handling"`

2. **Run full build locally**
   - Verify no TypeScript errors
   - Verify no linting errors
   - Verify production bundle size is reasonable

3. **Manual testing locally**
   - Test authorization boundary
   - Test error handling
   - Test complete enrollment workflow

4. **Request user approval before merging to main**
   - Show test results
   - Explain what was fixed
   - Request production evidence if 500 error persists

5. **After merge, monitor Vercel deployment**
   - Check Function logs for new errors
   - Verify authorization is enforced
   - Confirm friendly error messages appear

---

## Blockers & Dependencies

### Blocker: Exact Cause of 500 Error
- **Why It Matters:** Cannot fully validate fix without knowing root cause
- **Mitigation:** Fixes address known issues (authorization, error handling) that likely contribute
- **Resolution:** Requires production evidence from user

### Blocker: Bootstrap Process for First Admin
- **Why It Matters:** Need secure way to create first admin for pilot
- **Mitigation:** Create documented process using Firebase Console or secure script
- **Resolution:** User must confirm bootstrap process or provide alternative

### Blocker: Admin Dashboard Feature Requirements
- **Why It Matters:** Don't want to remove management functions users depend on
- **Mitigation:** Keep non-provisioning dashboard features
- **Resolution:** User must clarify which dashboard features are essential

---

## Success Criteria

✅ **Phase 2 Complete When:**
1. Authorization is restored (only admins can provision)
2. Error handling prevents raw HTML from displaying
3. Build passes TypeScript, linting, production build
4. Manual testing confirms authorization boundary works
5. Error messages are friendly and helpful
6. No regressions in existing functionality

❌ **Phase 2 Incomplete If:**
1. Authorization still allows non-admins to provision
2. Raw HTML still appears in UI on errors
3. Build has TypeScript or linting errors
4. Manual testing shows provisioning still broken
5. Error messages are unclear or expose internal details

---

## Timeline Estimate

- **Consolidation** (Phase 2A): 15 minutes code changes + user decision
- **Documentation** (Phase 2B): 20 minutes writing
- **Diagnostic Logging** (Phase 2C): 15 minutes code changes
- **Build & Local Testing** (Phase 3): 20 minutes
- **Total (without blocker resolution):** ~70 minutes

**Blockers can add:** Undefined time (depends on production investigation)

---

## Next Steps

1. **Review this plan** — Confirm approach aligns with requirements
2. **Await user approval** to proceed with Phase 2A consolidation
3. **Implement remaining fixes** (Phase 2A, 2B, 2C)
4. **Build and test locally** (Phase 3)
5. **Provide completion report** with test results
6. **Collect production evidence** if 500 error persists

---

## Questions for User

Before proceeding with Phase 2A consolidation:

1. **Admin Dashboard Features:** Which dashboard functions should be kept?
   - View statistics/overview ✅
   - View users list ✅
   - View schools ✅
   - View facilitators ✅
   - View families ✅
   - Create/manage families (via `/admin/enroll`?) ✅
   - Other?

2. **Bootstrap Process:** How should first admin be created?
   - Via Firebase Console?
   - Via secure CLI script?
   - Via documented manual process?
   - Other?

3. **Pilot Timeline:** When is the pilot launch?
   - Need this to prioritize remaining work

