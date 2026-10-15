# Admin Login Failure Investigation Report

**Investigation Date**: 2026-10-15
**Status**: In Progress

## Executive Summary

The admin login flow is failing at the session cookie creation stage with an HTTP 500 error on Vercel. The Firebase email/password sign-in succeeds, Firestore queries work correctly, and the admin role is verified, but the TanStack server function fails when calling `firebase-admin` SDK's `createSessionCookie()` method.

**Root Cause Candidates** (ranked by likelihood):
1. **ESM/CommonJS interoperability issue** with `jose` and `jwks-rsa` on Vercel's Node.js runtime
2. **Missing or incorrect server-side error logging** preventing visibility into actual failure
3. **Firebase Admin SDK project context mismatch** (less likely given production fail-closed checks)
4. **Security rule rejection** of session cookie creation (unlikely but possible)

---

## Detailed Findings

### 1. **Authentication Flow Succeeds**
✅ **Status**: VERIFIED WORKING

Firebase email/password sign-in succeeds:
- Browser logs: `[Admin Login] Sign in successful, UID: HJC7ctPozeUGMYJWGpNGpnkuk1B3`
- User document exists in Firestore
- Admin role is correctly assigned: `roles: Array(1) = ['admin']`

### 2. **Session Cookie Creation Fails**
❌ **Status**: FAILS WITH 500

**Error Chain**:
```
[Client] POST https://tati-childsave-mvp.vercel.app/_serverfn/2e47878...
[Server] Response: 500 (Internal Server Error)
[Client] Failed to create session cookie: Error: <!doctype html>...
```

**Server Function**: `createParentSessionFn` in `src/lib/backend/firebase/family.functions.ts`

```typescript
export const createParentSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ idToken: z.string().min(1) }))
  .handler(async (data) => {
    try {
      await createParentSession(data.idToken);  // ← FAILS HERE
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create session: ${message}`);  // ← No server-side logging
    }
  });
```

**The Problem**: The error is caught, but only the message is logged to the client. There is NO server-side logging of the actual error, making it invisible to Vercel logs.

### 3. **Session Cookie Function Implementation**
📍 **File**: `src/lib/backend/firebase/parent-auth.server.ts`

```typescript
export async function createParentSession(idToken: string): Promise<void> {
  const auth = getFirebaseAdmin();

  // This line is failing but no detailed error logging
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_COOKIE_MAX_AGE * 1000,
  });

  setCookie(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}
```

**Issue**: When `auth.createSessionCookie(idToken, ...)` is called, it internally:
1. Verifies the ID token against the Firebase project's public keys
2. Uses `jose` library for JWT validation
3. Uses `jwks-rsa` to fetch public keys from Google's keystore

On Vercel, the ESM/CommonJS boundary is problematic.

### 4. **Firebase Admin SDK Initialization**
✅ **Status**: CORRECTLY CONFIGURED (Production Fail-Closed)

**File**: `src/integrations/firebase/admin.server.ts`

**Good Signs**:
- ✅ Project ID verification: Only accepts "tatichildsavemvp" in production
- ✅ Service account credential parsing: Logs success when loaded
- ✅ Emulator mode detection: Works for development
- ✅ Application default credentials fallback

**Potential Issue**:
```typescript
if (vercelEnv === "production") {
  if (projectId !== "tatichildsavemvp") {
    throw new Error(`[FAIL-CLOSED] Production environment detected...`);
  }
}
```

This check only runs if `vercelEnv === "production"`. On Vercel, `VERCEL_ENV` must be explicitly set. If Vercel's environment is not properly labeled, this check may not run.

### 5. **Security Issues Found**
🔴 **CRITICAL**: Sensitive user data logged to browser console

**File**: `src/routes/(public)/admin-login.tsx` (Line 106)
```typescript
console.log("[Admin Login] User data:", userData);
```

This logs the entire user document to the browser console, including:
- Email address
- Display name
- All Firestore fields
- Potentially Firebase internal data

### 6. **ESM/CommonJS Interop Issue**
⚠️ **Status**: CONFIRMED ON VERCEL

**Vercel Error**:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module 
/var/task/node_modules/jose/dist/webapi/index.js from 
/var/task/node_modules/jwks-rsa/src/utils.js not supported.
```

**Root Cause**: 
- `firebase-admin` depends on `jose` (ESM-only library)
- `jwks-rsa` tries to `require()` `jose` as CommonJS
- Vercel's Node.js runtime doesn't automatically handle this interop
- Added to `vite.config.ts` `ssr.external` list but Vercel still bundling dependencies

**Attempted Fix**: Added to `vite.config.ts`:
```typescript
ssr: {
  external: [
    "firebase-admin",
    "jose",
    "jwks-rsa",
    "google-auth-library-nodejs",
    "@google-cloud/firestore",
    "@google-cloud/storage",
  ],
}
```

This tells Vite not to bundle these modules, but Vercel's bundler may still be bundling them.

---

## Analysis

### Why Admin Login Fails but Tests Pass

1. **Local Testing**: Using Firebase Admin SDK works fine because the Node.js environment handles ESM/CommonJS correctly
2. **Vercel Preview**: ESM/CommonJS issue manifests during server function execution
3. **The ID token is valid**: Sign-in succeeds, which means the ID token is correctly issued by Firebase
4. **The failure occurs during ID token verification** by the Admin SDK when creating the session cookie

### Why the Error is Hard to Debug

1. Server-side error is not logged (only caught and re-thrown to client)
2. Browser receives HTTP 500 with generic HTML error page
3. Vercel logs are not visible to us in real-time
4. The error occurs deep in the `jose` → `jwks-rsa` → `firebase-admin` stack

---

## Recommendations

### Critical Fixes (Must Do)

1. **Add Detailed Server-Side Error Logging**
   - Log the actual error to console/Vercel logs
   - Don't expose error to client, but capture it server-side
   - This will reveal the exact Firebase SDK error

2. **Remove Sensitive Logging**
   - Remove `console.log("[Admin Login] User data:", userData)` from admin-login.tsx
   - Only log role verification status, not the data

3. **Fix Vercel Node.js Module Resolution**
   - Update `vercel.json` to ensure correct module resolution
   - Verify Vercel's Node.js version supports ESM properly
   - Consider using Vercel Environment Variables to control build behavior

4. **Verify Firebase Project Configuration in Production**
   - Confirm `FIREBASE_PROJECT_ID` is set to `tatichildsavemvp` in Vercel Production
   - Confirm `FIREBASE_SERVICE_ACCOUNT` is properly formatted JSON in Vercel Production

### Nice-to-Have Fixes

1. Return structured error response from server function (for better client-side error handling)
2. Add health check endpoint to verify Firebase Admin SDK initialization
3. Add monitoring/alerting for session cookie creation failures

---

## Files Requiring Changes

| File | Issue | Fix |
|------|-------|-----|
| `src/lib/backend/firebase/family.functions.ts` | No server-side error logging | Add detailed error logging |
| `src/lib/backend/firebase/parent-auth.server.ts` | Silent failures in createParentSession | Add error logging and context |
| `src/routes/(public)/admin-login.tsx` | Logs sensitive user data | Remove `console.log("[Admin Login] User data:", userData)` |
| `vercel.json` | May need module resolution hints | Add build configuration |

---

## Testing Plan

1. Add error logging and deploy to Vercel Preview
2. Attempt admin login and check Vercel logs for detailed error message
3. Based on error message, apply targeted fix
4. Test admin login again
5. Verify session cookie is created
6. Verify admin dashboard loads
7. Verify non-admin users cannot access `/admin`

---

## Next Steps

1. ✅ Investigate root cause ← **CURRENT STEP**
2. ⏳ Add comprehensive error logging
3. ⏳ Remove sensitive logging
4. ⏳ Deploy to Vercel Preview
5. ⏳ Review Vercel logs for detailed error
6. ⏳ Apply fix based on actual error
7. ⏳ Test and verify
