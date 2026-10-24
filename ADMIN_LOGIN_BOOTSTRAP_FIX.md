# Admin Login Bootstrap Fix — Pilot Blocker #1

**Date:** 2026-10-24  
**Issue:** Admin Firebase Auth user exists, but corresponding Firestore admin document does not exist  
**Status:** ❌ **BLOCKING PILOT**  
**Severity:** CRITICAL

---

## Issue Summary

**What's Happening:**
1. ✅ Admin Firebase Auth account created: `tatichildsaveadmin@gmail.com`
2. ✅ Admin can sign in (Firebase Auth succeeds)
3. ❌ Admin Firestore user document missing at `/users/{uid}`
4. ❌ Admin route guard rejects access (no `roles: ["admin"]` document found)
5. ❌ Admin redirected back to `/admin-login`

**Evidence from Console Logs:**
```
[Admin Login] Attempting sign in with: tatichildsaveadmin@gmail.com
[Admin Login] Sign in successful, UID: HJC7ctPozeUGMYJWGpNGpnkU1B3
```

Login succeeded, but then admin was sent back to login page (redirected at route guard).

**Root Cause:** The admin Firestore user document does not exist or lacks the `roles: ["admin"]` array.

---

## The Fix

### Step 1: Create Admin Firestore User Document (Manual via Firebase Console)

1. Go to **Firebase Console** → Your Project
2. Navigate to **Firestore Database**
3. Click **+ Add collection**
4. Create collection: `users`
5. Click **+ Add document**
6. Set Document ID to: `HJC7ctPozeUGMYJWGpNGpnkU1B3` (the UID from console log)
7. Add fields:
   ```
   uid: "HJC7ctPozeUGMYJWGpNGpnkU1B3" (string)
   email: "tatichildsaveadmin@gmail.com" (string)
   roles: ["admin"] (array with one string value: "admin")
   status: "active" (string)
   createdAt: (server timestamp)
   createdBy: (your uid, or leave empty)
   ```
8. Click **Save**

### Step 2: Verify the Document Was Created

1. Go to **Firestore Database** → **users** collection
2. Click document `HJC7ctPozeUGMYJWGpNGpnkU1B3`
3. Verify fields:
   - ✅ `uid` = HJC7ctPozeUGMYJWGpNGpnkU1B3
   - ✅ `email` = tatichildsaveadmin@gmail.com
   - ✅ `roles` is an **array** (not a string) containing: `"admin"`
   - ✅ `status` = "active"

### Step 3: Test Admin Login

1. Open incognito/private browser window
2. Navigate to https://tati-childsave-mvp.vercel.app/admin-login
3. Sign in with:
   - Email: `tatichildsaveadmin@gmail.com`
   - Password: (the password you set)
4. **Expected Result:** Redirected to `/admin` dashboard (not back to login)
5. **Verify:** Admin dashboard loads with no errors

---

## Why This Happened

### Admin Bootstrap Gap

There is **no automated bootstrap script** for creating the first admin user. This is intentional for security:

1. First admin creation is a **one-time, manual operation** in Firebase Console
2. Once first admin exists, they can create other admins via the `createAdminUser` Cloud Function
3. Subsequent admins are created programmatically (not manually)

**Why not automated?**
- First admin creation requires elevated credentials
- Manual creation is more secure and auditable
- Typical practice for bootstrap admin accounts

### What Should Have Happened

**Process (Documented in ADMIN_BOOTSTRAP_AND_SESSION_INVESTIGATION.md):**

1. Admin user created in Firebase Console (manually)
2. Firestore user document created at `/users/{uid}` with `roles: ["admin"]`
3. Admin signs in via `/admin-login`
4. Admin dashboard loads
5. Admin can then enroll families, create children, manage facilitators, etc.

---

## Verification Checklist

After creating the Firestore user document:

- [ ] Firebase Console shows `/users/HJC7ctPozeUGMYJWGpNGpnkU1B3` document exists
- [ ] Document has `roles: ["admin"]` (array, not string)
- [ ] Admin can sign in at `/admin-login`
- [ ] Admin is redirected to `/admin` (not back to login)
- [ ] Admin dashboard displays without errors
- [ ] Console logs show `[Admin Login] Sign in successful`
- [ ] No "User document does not exist" or "does not have admin role" messages

---

## Next Steps After Fix

Once admin login is working:

1. ✅ Admin can now enroll test families
2. ✅ Admin can create test children
3. ✅ Test parent can sign in and see children
4. ✅ Test child can log in with TATI ID + PIN
5. ✅ Complete pilot verification checklist

---

## Related Documentation

- [ADMIN_BOOTSTRAP_AND_SESSION_INVESTIGATION.md](ADMIN_BOOTSTRAP_AND_SESSION_INVESTIGATION.md) — Detailed technical analysis
- [CONTROLLED_PILOT_GO_NO_GO.md](CONTROLLED_PILOT_GO_NO_GO.md) — Pilot readiness assessment
- [PILOT_VERIFICATION_CHECKLIST.md](PILOT_VERIFICATION_CHECKLIST.md) — Operational test procedures

---

## Escalation

**If Firebase Console admin document creation doesn't work:**

Contact Firebase Support:
- Project ID: (from your Firebase Console)
- Issue: Unable to create Firestore user document
- UID that needs document: HJC7ctPozeUGMYJWGpNGpnkU1B3

**Workaround (if Firestore access unavailable):**

Use Firebase Admin SDK (Node.js script):
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

db.collection('users').doc('HJC7ctPozeUGMYJWGpNGpnkU1B3').set({
  uid: 'HJC7ctPozeUGMYJWGpNGpnkU1B3',
  email: 'tatichildsaveadmin@gmail.com',
  roles: ['admin'],
  status: 'active',
  createdAt: new Date(),
  createdBy: 'bootstrap',
});
```

---

**STATUS: PILOT BLOCKER #1 — Requires manual Firestore setup**

This is a **one-time manual fix** required before pilot can proceed.
