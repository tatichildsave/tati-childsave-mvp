# Deployment Live Monitoring & Smoke Test Guide

**Deployment Status:** 🚀 IN PROGRESS  
**Commit Deployed:** `7b8b164` (docs: final deployment readiness brief statement)  
**Pushed to GitHub:** ✅ 2026-10-14 18:40 UTC  
**Vercel Auto-Deployment:** Started automatically

---

## Step 1: Monitor Vercel Deployment (5-10 minutes)

### Check Deployment Status
1. Go to: **https://vercel.com/dashboard**
2. Select project: **tati-childsave-mvp**
3. Click on **Deployments** tab
4. Look for the latest deployment (should show building/ready status)

### What to Look For

| Status | Meaning | Action |
|--------|---------|--------|
| 🟠 Building | Build in progress | Wait 5-10 minutes |
| 🟢 Ready | Build successful | Proceed to smoke test |
| 🔴 Failed | Build error | Check logs, may need rollback |

### Build Success Indicators
- Status shows: **Ready**
- Deployment URL is live: `tati-childsave-mvp.vercel.app`
- No error messages in deployment details

### If Build Fails
Check Vercel logs for errors. If critical:
```bash
# Rollback to previous deployment
git revert 7b8b164
git push origin main
# Vercel auto-redeploys
```

---

## Step 2: Verify Server-Side Configuration (1 minute)

Once deployment is **Ready**, test the fail-closed check:

### Option A: Check Vercel Logs
1. Click on the successful deployment
2. Go to **Deployments** → **Logs**
3. Search for: `[Firebase] Production environment verified`
4. You should see:
```
[Firebase] Production environment verified with correct project: tatichildsavemvp
```

### Option B: Direct Check (if logs not visible)
This confirms the fail-closed check passed and Firebase project ID is correct.

---

## Step 3: 15-Minute Smoke Test

**Goal:** Verify complete enrollment workflow works end-to-end  
**Data:** Use disposable test family (will be deleted after)  
**Time:** ~15 minutes

### Pre-Test Setup
1. Open browser → Go to: `https://tati-childsave-mvp.vercel.app/admin-login`
2. Sign in with your admin account (email + password)
3. Confirm you are logged in and can access the admin dashboard

### Test Steps

#### Step 1: Admin Login (Verify Session Created)
```
✅ PASS if:
- Login successful
- Redirected to admin dashboard
- No errors in console
- Session established server-side
```

**If it fails:**
- Check Firebase error message
- Verify Firestore admin account exists with roles: ["admin"]
- Check browser console for specific error

#### Step 2: Create Test Family
```
URL: https://tati-childsave-mvp.vercel.app/admin/enroll

Fill in Step 1 (Family Information):
- Family Name: "TEST-PILOT-[TIMESTAMP]" (e.g., TEST-PILOT-1014-1840)
- Address: "Test Address, Accra"
- Phone: "+233 24 XXX XXXX" (Ghana format)
- Location: "Accra"
- Click: Next

✅ PASS if:
- Proceeds to Step 2 without errors
- Family record visible in Firestore (check Firebase Console)
```

**If it fails:**
- Check error message
- Verify fail-closed check passed (see Step 2 above)
- Check Firestore `/families` collection

#### Step 3: Provision Parent Account
```
Step 2 (Parent Details):
- Parent Email: "testparent-[TIMESTAMP]@example.com"
- Parent Name: "Test Parent"
- Password: Create a test password (will not be used again)
- Click: Next

✅ PASS if:
- Parent account provisioning succeeds
- Proceeds to Step 3 without errors
- Parent record appears in Firestore `/parents` collection
- Firebase Auth shows new user created
```

**If it fails (403 referrer error):**
- This error should NOT appear in new enrollment workflow
- If you see it, this is the legacy admin dashboard error
- Report with screenshot

**If it fails (other error):**
- Check error message in console
- Verify Firestore security rules are correct
- Check Firebase Admin SDK credentials

#### Step 4: Add Child
```
Step 3 (Add Child):
- Child Name: "Test Child"
- Age: 9
- Click: Add Child

✅ PASS if:
- Child added without errors
- Child record appears in Firestore `/families/[familyId]/children`
- TATI ID generated (visible in child record)
- PIN generated (not visible but stored)
```

**If it fails:**
- Check error message
- Verify child creation logic is running
- Check Firestore `/families/[familyId]/children`

#### Step 5: Complete Enrollment
```
Step 4 (Review & Confirm):
- Review all information
- Click: Complete Enrollment

✅ PASS if:
- Enrollment completes successfully
- Returns to admin dashboard
- No errors in console
- Complete family record in Firestore with:
  - Family document
  - Parent document with email
  - Child document with TATI ID and PIN
```

**If it fails:**
- Check error message
- Verify all Firestore writes completed
- Check logs

---

## Step 4: Verify in Firestore (2 minutes)

Go to: **Firebase Console** → **Firestore** → **Collections**

### Check Family Record
```
Collection: /families
Document: [Your TEST-PILOT-* family]
Should contain:
✅ name: "TEST-PILOT-[TIMESTAMP]"
✅ address: "Test Address, Accra"
✅ phone: "+233 24 XXX XXXX"
✅ location: "Accra"
✅ createdBy: [Your admin UID]
✅ createdAt: [Timestamp]
```

### Check Parent Record
```
Collection: /parents
Document: [Parent UID]
Should contain:
✅ email: "testparent-[TIMESTAMP]@example.com"
✅ displayName: "Test Parent"
✅ familyId: [Matches family above]
✅ status: "active"
✅ createdAt: [Timestamp]
```

### Check Child Record
```
Collection: /families/[familyId]/children
Document: [Child UID]
Should contain:
✅ name: "Test Child"
✅ age: 9
✅ tatiId: [Generated alphanumeric ID]
✅ pinHash: [Hashed PIN, not visible]
✅ status: "active"
✅ createdAt: [Timestamp]
```

**✅ All records present and correct?** Deployment successful!

---

## Step 5: Test Parent Login (Optional, 3 minutes)

If you want to verify parent can sign in:

1. Open new browser tab (or incognito/private mode)
2. Go to: `https://tati-childsave-mvp.vercel.app/parent-login`
3. Enter: testparent email + temporary password (from enrollment)
4. Click: Sign In

**✅ PASS if:**
- Login successful
- Parent can see their enrolled children
- Dashboard loads without errors

**❌ FAIL if:**
- Login fails with permission error
- Parent sees wrong children
- Errors in console

---

## Step 6: Cleanup Test Records (2 minutes)

Once smoke test is complete, remove test data:

### Delete in Firestore Console

**Collection: `/families`**
1. Find: TEST-PILOT-* family
2. Click three dots → Delete document
3. Confirm delete

**Collection: `/parents`**
1. Find: testparent-* parent
2. Click three dots → Delete document
3. Confirm delete

### Delete in Firebase Auth Console

**Firebase Console → Authentication → Users**
1. Find: testparent-* user
2. Click three dots → Delete user
3. Confirm delete

**Result:** No test data remains in production

---

## Smoke Test Summary

| Step | Task | Status |
|------|------|--------|
| 1 | Vercel deployment ready | ☐ |
| 2 | Fail-closed check passed | ☐ |
| 3.1 | Admin login successful | ☐ |
| 3.2 | Family creation successful | ☐ |
| 3.3 | Parent provisioning successful | ☐ |
| 3.4 | Child creation successful | ☐ |
| 3.5 | Enrollment complete | ☐ |
| 4 | Firestore records verified | ☐ |
| 5 | Parent login works (optional) | ☐ |
| 6 | Test records cleaned up | ☐ |

---

## Rollback If Issues Occur

### If Smoke Test Fails

**Option 1: Quick Revert (5 minutes)**
```bash
git checkout main
git revert 7b8b164
git push origin main
# Vercel auto-redeploys previous version
```

**Option 2: Redeploy Previous Deployment**
- Vercel Console → Deployments
- Find last working deployment
- Click → Redeploy

**Option 3: Clean Up Production Data**
If test data was created but enrollment failed:
1. Delete test family in Firestore (`/families/TEST-PILOT-*`)
2. Delete test parent in Firestore (`/parents/testparent-*`)
3. Delete test user in Firebase Auth
4. Redeploy stable version

See `ROLLBACK_PROCEDURE.md` for detailed rollback steps.

---

## Success Criteria

**✅ Deployment Successful if:**
1. Vercel deployment shows "Ready" status
2. Fail-closed check passed (firebase project verified)
3. Admin can complete full 4-step enrollment
4. Test family, parent, and child records created in Firestore
5. No authorization errors
6. No 403 referrer errors in new enrollment workflow
7. Test records can be cleaned up
8. No errors in server logs

**❌ Deployment Failed if:**
- Vercel build fails
- Fail-closed check threw error (wrong Firebase project)
- Admin cannot login
- Enrollment stops at any step
- Records not created in Firestore
- Authorization errors appear
- Unrecoverable test data left in production

---

## Next Actions After Smoke Test

### ✅ If Smoke Test Passes
1. Confirm deployment is live and working
2. Notify stakeholders that pilot enrollment is ready
3. Begin safely enrolling founding families
4. Monitor logs for any issues

### ❌ If Smoke Test Fails
1. Review error messages
2. Check Firestore schema and Firestore rules
3. Check Firebase Auth and Admin SDK credentials
4. Verify Vercel environment variables
5. Review logs in Vercel and Firebase Console
6. Decide: Fix issue and redeploy, or rollback to previous version

---

## Questions During Smoke Test?

**If you encounter an error:**
1. **Screenshot the error message**
2. **Note the exact step where it failed**
3. **Check browser console for detailed error**
4. **Provide error message verbatim**

This helps with debugging if anything goes wrong.

---

## Estimated Timeline

- Vercel build: 5-10 minutes
- Smoke test: 15 minutes
- Cleanup: 2 minutes
- **Total: ~30 minutes**

Good luck with the pilot deployment! 🚀

