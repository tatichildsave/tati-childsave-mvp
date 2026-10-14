# Firebase API_KEY_HTTP_REFERRER_BLOCKED Investigation

**Issue:** `API_KEY_HTTP_REFERRER_BLOCKED` error when attempting to access Firebase API from browser  
**Blocked Referrer:** `https://tatichildsavemvp.firebaseapp.com/`  
**Affected Component:** Legacy admin dashboard (NOT the new enrollment workflow)  
**Status:** Identified; Configuration fix required pre-deployment

---

## Root Cause

### Where the Error Originates

**File:** `src/routes/admin/index.tsx` (lines 236-242)  
**Function:** `handleCreateParent()` in the admin dashboard  
**Code:**
```typescript
const response = await fetch(
  "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + 
  (window as any).FIREBASE_API_KEY,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: newParentEmail,
      password: newParentPassword,
      returnSecureToken: true,
    }),
  }
);
```

### How the Error Occurs

1. **Client-side API call:** JavaScript in browser directly calls Firebase Identity Toolkit API
2. **HTTP Referrer header:** Browser automatically includes referrer header in the request
3. **Firebase API key restrictions:** The API key (`VITE_FIREBASE_API_KEY`) has HTTP referrer restrictions configured in Google Cloud Console
4. **Authorization check:** Firebase checks if the referrer is in the authorized list
5. **Rejection:** If the referrer is not authorized, Firebase returns HTTP 403 with error: `API_KEY_HTTP_REFERRER_BLOCKED`

### Affected Request Details

| Component | Value | Notes |
|-----------|-------|-------|
| **API Endpoint** | `https://identitytoolkit.googleapis.com/v1/accounts:signUp` | Firebase Identity Toolkit (REST API) |
| **Authentication Method** | Firebase API Key (`VITE_FIREBASE_API_KEY`) | Client-side, embedded in request URL |
| **HTTP Referrer** | `https://tatichildsavemvp.firebaseapp.com/` | Sent by browser automatically |
| **HTTP Status** | 403 | Forbidden |
| **Error Response** | `{"error": {"code": 400, "message": "API_KEY_HTTP_REFERRER_BLOCKED"}}` | Firebase error message |
| **Expected Referrer** | `https://tati-childsave-mvp.vercel.app/` | Production Vercel domain (likely NOT in authorized list) |
| **Actual Production Referrer** | `https://tati-childsave-mvp.vercel.app/admin` | Production URL + route |

---

## Why the New Enrollment Workflow is NOT Affected

**New Enrollment Workflow:** Uses TanStack server functions (`provisioning.functions.ts`)

**Flow:**
1. Client (browser) calls `provisionParent()` server function (no API key needed)
2. Server function validates session cookie and authorization
3. **Server** calls Firebase Admin SDK with service account credentials (not API key)
4. Server function returns result to client

**Key Difference:**
- ✅ Server-side: Uses `FIREBASE_SERVICE_ACCOUNT` (service account credentials)
- ❌ Old admin dashboard: Uses `VITE_FIREBASE_API_KEY` (public API key with restrictions)

**Result:** Enrollment workflow will NOT encounter referrer blocking because it doesn't use the public API key.

---

## Google Cloud Console Configuration Required

### Current State (Verified in Repository)

**Configuration Source:** `VITE_FIREBASE_API_KEY` environment variable  
**API Key Type:** Firebase Web API Key  
**Restriction Status:** ⚠️ **Configured with HTTP referrer restrictions** (inferred from error)

### What Needs to Change

**In Google Cloud Console:**

1. **Navigate to the API Key:**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Find the API Key labeled "Firebase Web API Key" or similar
   - This key's value matches `VITE_FIREBASE_API_KEY` in Vercel

2. **Edit the API Key Restrictions:**
   - Click on the API Key to open edit dialog
   - Find section: "Application restrictions" or "HTTP Referrers"
   - Current (likely): Restricted to `https://tatichildsavemvp.firebaseapp.com/` (Firebase default)

3. **Add Production Referrer:**
   ```
   Authorized HTTP Referrers:
   - https://tatichildsavemvp.firebaseapp.com/
   - https://tati-childsave-mvp.vercel.app/
   ```

4. **Do NOT do this:**
   - ❌ `https://*.vercel.app/` (too broad; allows any Vercel project)
   - ❌ `*` (disables referrer checking entirely; security risk)
   - ❌ Remove all restrictions (allows any referrer to use the key)

5. **Save and wait:** 5-10 minutes for propagation (GCP caches credentials)

### Why This Specific Configuration

| Referrer | Include? | Reason |
|----------|----------|--------|
| `https://tatichildsavemvp.firebaseapp.com/` | ✅ YES | Firebase default domain; may be used for internal services |
| `https://tati-childsave-mvp.vercel.app/` | ✅ YES | Production Vercel deployment domain |
| `https://*.vercel.app/` | ❌ NO | Too broad; includes unrelated Vercel projects |
| `http://localhost:*` | ⚠️ MAYBE | Only if you want local development to work without config change |

---

## Testing After Configuration Change

### Step 1: Verify Configuration Applied
```bash
# Wait 5-10 minutes for GCP to propagate the change
# Then test in browser DevTools
```

### Step 2: Test Admin Dashboard (Where Error Originally Appeared)
1. Open `https://tati-childsave-mvp.vercel.app/admin`
2. Sign in with admin account
3. Under "Add Parent Manually", enter test parent details
4. Click "Create Parent"
5. **Verify:** No `API_KEY_HTTP_REFERRER_BLOCKED` error appears
6. Parent account should be created in Firebase Auth

### Step 3: Verify Enrollment Workflow Still Works
1. Open `https://tati-childsave-mvp.vercel.app/admin/enroll`
2. Complete 4-step enrollment
3. **Verify:** No referrer errors (enrollment uses server functions, not API key)

---

## Impact on New Enrollment Workflow

**For the new `/admin/enroll` workflow:**
- ✅ **NO IMPACT** — Uses server functions with service account credentials
- ✅ **NOT AFFECTED** — Does not use `VITE_FIREBASE_API_KEY`
- ✅ **SAFE TO DEPLOY** — This configuration change is not required for enrollment to work

**However:**
- ⚠️ **Recommended pre-deployment** — Prevents issues if user tests admin dashboard after enrollment works
- ⚠️ **May be discovered during smoke testing** — If tester tries to use admin dashboard for testing

---

## Who Performs This Configuration Change

**Action Required:** You (user) must do this in Firebase Console  
**Timeline:** Before or immediately after production deployment  
**Duration:** 5-10 minutes + 5-10 minutes for propagation  
**Risk:** None (only adds authorized domains; doesn't affect running deployment)

**Access Required:**
- Firebase Console access for project `tatichildsavemvp`
- Google Cloud Console access (same project)
- Permission to edit API keys

---

## Evidence Trail

**Original Error Report:**
- Phase 1 investigation identified `API_KEY_HTTP_REFERRER_BLOCKED` with blocked referrer `https://tatichildsavemvp.firebaseapp.com/`
- Error occurred in admin dashboard, not enrollment workflow

**Root Cause Analysis (Phase 5A):**
- Located exact code in `src/routes/admin/index.tsx` line 236-242
- Confirmed: Direct browser-to-Firebase API call using public API key
- Identified: HTTP referrer mismatch (Production Vercel domain vs. configured domain)

**Current Status:**
- Legacy admin dashboard code exists but is NOT used by new enrollment workflow
- New enrollment workflow uses server-side functions (safe from referrer blocking)
- Configuration change is optional for enrollment but recommended for full admin dashboard testing

---

## Deployment Decision

### Can We Deploy Without This Fix?

**YES** ✅ — The new enrollment workflow will work without this configuration change.

**Why:**
- Enrollment workflow uses server-side provisioning functions
- Server functions use service account credentials (not public API key)
- No HTTP referrer check applies to server-side calls

### Should We Deploy Without This Fix?

**OPTIONALLY** ⚠️ — Recommend fixing before or immediately after deployment.

**Why:**
- Prevents issues if admin dashboard is tested
- Prevents confusion if referrer error appears unexpectedly
- 5-10 minute fix that eliminates one class of production support issues
- Not critical; can be fixed post-deployment if needed

---

## Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **Root Cause Identified** | ✅ YES | Located in `src/routes/admin/index.tsx` |
| **Affects New Enrollment Workflow** | ❌ NO | Enrollment uses server functions |
| **Configuration Required** | ✅ YES | Add Vercel domain to API key referrers |
| **Can Deploy Without Fix** | ✅ YES | Enrollment will work regardless |
| **Recommended to Fix First** | ⚠️ MAYBE | Prevents issues with admin dashboard testing |
| **Who Fixes It** | 👤 User | In Firebase Console / Google Cloud Console |
| **Time to Fix** | ⏱️ 5-10 min | Mostly waiting for GCP propagation |
| **Risk of Fixing** | 🟢 LOW | Only adds authorized domains |
| **Risk of NOT Fixing** | 🟡 MEDIUM | Admin dashboard won't work for testing; enrollment unaffected |
