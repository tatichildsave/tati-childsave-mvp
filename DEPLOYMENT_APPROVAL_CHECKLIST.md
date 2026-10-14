# Production Deployment Approval Checklist

**Branch:** `fix/admin-enrollment-stabilization`  
**Latest Commit:** 413f10d (simplified MVP strategy, no separate test project)  
**Build Status:** ✅ Passing  
**Tests:** ✅ 32/32 passing (15 integration + 17 core)

---

## You Must Complete These Steps Before Approval

### 1. Verify Admin Account Configuration

In Firebase Console (`tatichildsavemvp` project):
- [ ] Go to **Authentication → Users**
- [ ] Find your admin account (email)
- [ ] Note the **UID** of your admin account

Then, in Firestore (`tatichildsavemvp` project):
- [ ] Navigate to **Firestore Database**
- [ ] Open collection: `/users/{uid}` (replace `{uid}` with the admin UID from above)
- [ ] Verify the document contains: `roles: ["admin"]` field
- [ ] If missing or incorrect, **STOP** and create/fix the document manually

**Why:** Admin provisioning functions check for `'admin' in roles`. If your account lacks this, you cannot enroll families.

---

### 2. Verify Vercel Production Environment Variables

In Vercel Console (tati-childsave-mvp project):
- [ ] Go to **Settings → Environment Variables**
- [ ] Set scope to **Production**
- [ ] Confirm these variables exist (values hidden; just verify keys):
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_SERVICE_ACCOUNT`

**Why:** Incomplete env vars cause deployment or runtime failures.

---

### 3. Understand the Risks

Read these sections in `PRODUCTION_DEPLOYMENT_READINESS.md`:
- [ ] Section 6: "Identified Risks to Existing Users"
- [ ] Confirm: Existing parent login, child sessions, learning journeys are NOT affected
- [ ] Confirm: Only new admin enrollment workflow is changing

---

### 4. Understand the Rollback

If production deployment fails:
- [ ] You understand how to revert main branch (command in readiness report)
- [ ] You have access to Vercel deployments to monitor rollback

---

## If All Checks Pass, Provide Approval

Please reply with:

```
✅ I have verified:
1. Admin account has roles: ["admin"] in Firestore
2. Vercel Production env vars are configured
3. I understand the risks to existing users
4. I understand the rollback procedure

APPROVED: Proceed with production deployment.
```

---

## What Happens After Approval

1. **I merge** `fix/admin-enrollment-stabilization` into `main` and push
2. **Vercel auto-deploys** main branch to production
3. **I monitor** deployment logs for success
4. **You run smoke test** (15 minutes) with disposable test data
5. **We verify** new family enrollment works
6. **Deployment is complete** ✅

---

## Smoke Test (You Do This After Deployment)

1. Open https://tati-childsave-mvp.vercel.app/admin-login
2. Sign in with your admin account
3. Complete enrollment for **disposable test family:**
   - Family: "TEST-PILOT-FAMILY-001"
   - Parent: "test-pilot@tatichildsave.test"
   - Child: "TEST-PILOT-CHILD-001"
4. Verify no HTML error pages (user-friendly messages only)
5. Check Firestore Console: family record created
6. Return to me and confirm success
7. I delete the test records from Firestore

---

## Summary

- ✅ Tests: 32/32 passing (comprehensive coverage)
- ✅ Build: No errors
- ✅ Security: Fail-closed checks active, authorization enforced
- ✅ Risk: Low (isolated to new enrollment, existing features unchanged)
- ⏳ Waiting: Your approval and verification

**Ready?**
