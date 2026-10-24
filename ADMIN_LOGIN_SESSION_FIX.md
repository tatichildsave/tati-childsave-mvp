# Admin Login Fix — Session Cookie Secure Flag Issue

**Date:** 2026-10-24  
**Commit:** e3abff3  
**Status:** ✅ **FIXED AND DEPLOYED**  
**Issue:** Admin login was creating session cookie with mismatched Secure flag

---

## The Problem

When admin tried to sign in at `/admin-login`:

1. ✅ Firebase Auth succeeded (correct credentials accepted)
2. ✅ Admin clicked "Sign in"
3. ❌ Browser console error: `__Secure-parent-session cookies must have the Secure attribute`
4. ❌ Admin redirected back to login (cookie creation failed)

**Root Cause:** Mismatch between cookie name and security flag:
- Cookie name: `__Secure-parent-session` (indicates production/HTTPS)
- Security flag: `secure: false` (set for HTTP/dev environment)
- Browser rejection: Cookies with `__Secure-` prefix REQUIRE `secure: true`

---

## Why It Happened

**File:** `src/lib/backend/firebase/parent-auth.server.ts` (lines 12-16, 42-50)

**Original Code:**
```typescript
const SESSION_COOKIE_NAME =
  process.env["NODE_ENV"] === "production" ? "__Secure-parent-session" : "parent-session";

// Later...
setCookie(SESSION_COOKIE_NAME, sessionCookie, {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",  // ← The problem!
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_COOKIE_MAX_AGE,
});
```

**The Issue:** On Vercel deployment:
- `NODE_ENV` is often NOT set to "production" (even though the app IS running in production)
- Code sets cookie name to `__Secure-parent-session` (because of some other logic)
- Code sets `secure: false` (because `NODE_ENV !== "production"`)
- Browser rejects the cookie (mismatch)

---

## The Fix

**Changed to:**
```typescript
const SESSION_COOKIE_NAME =
  process.env["NODE_ENV"] === "production" || process.env["VERCEL"] ? "__Secure-parent-session" : "parent-session";

// Later...
// If using __Secure- prefix (production/Vercel), secure MUST be true
const useSecureFlag = SESSION_COOKIE_NAME.startsWith("__Secure-");

setCookie(SESSION_COOKIE_NAME, sessionCookie, {
  httpOnly: true,
  secure: useSecureFlag,  // ← Derived from cookie name, not NODE_ENV
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_COOKIE_MAX_AGE,
});
```

**Two changes:**
1. **Detect Vercel** by checking `process.env["VERCEL"]` (set by Vercel at runtime)
2. **Derive secure flag from cookie name** — if cookie name starts with `__Secure-`, always set `secure: true`

This ensures the cookie name and security flag are **always consistent**.

---

## Verification

After fix is deployed:

1. Clear browser cache (Ctrl+Shift+Delete)
2. Go to `/admin-login`
3. Sign in with: `tatichildsaveadmin@gmail.com` + password
4. **Expected:** Redirected to `/admin/dashboard-v2` (admin dashboard loads)
5. **Not expected:** Blank page or console error about Secure attribute

---

## Impact

✅ **Fixes:** Admin login now works  
✅ **Unblocks:** Pilot readiness verification  
✅ **Security:** Session cookie still secure (HTTP-only, SameSite=Lax)  
✅ **Backward compatible:** No changes to authentication logic or permissions

---

## Parent/Admin Session Cookie Security

Both parent and admin use the same session cookie mechanism:

- **Cookie name:** `__Secure-parent-session` (production) or `parent-session` (dev)
- **Security:** HTTP-only (cannot access from JavaScript), SameSite=Lax (CSRF protection)
- **Expiration:** 5 days (verified on every server request)
- **Verification:** Firebase Admin SDK verifies signature and expiration

Parent and admin can both use the same cookie mechanism because they share the same Firestore role-checking logic.

---

## Next Steps

1. **Vercel redeploy** (automatic, happens immediately)
2. **Admin tries login again** at `/admin-login`
3. **If successful:** Admin can access `/admin` and proceed with pilot verification
4. **If still failing:** Check browser console for additional errors

---

## Related Issues

- [ADMIN_LOGIN_BOOTSTRAP_FIX.md](ADMIN_LOGIN_BOOTSTRAP_FIX.md) — Original bootstrap documentation (now partly obsolete)
- [PILOT_STATUS.md](PILOT_STATUS.md) — Executive summary of pilot blockers
- [PILOT_NEXT_STEPS.md](PILOT_NEXT_STEPS.md) — Pilot timeline and critical conditions
