# Phase 5C: Production Deployment Checklist and Rollback Procedure

**Date:** Phase 5C Planning  
**Status:** 📋 PREPARATION (Awaiting test results)  
**Branch:** `fix/admin-enrollment-stabilization`  

---

## Pre-Deployment Checklist

### Code and Build Verification

- [ ] **Branch prepared:** `fix/admin-enrollment-stabilization` contains all fixes
- [ ] **Commits reviewed:** All commits are focused, with clear messages
- [ ] **Build passes:** `npm run build` completes without errors
- [ ] **Build artifacts:** Size and structure normal (no unexpected bloat)
- [ ] **No console warnings:** Production build shows no concerning warnings
- [ ] **TypeScript clean:** No type errors or ignored `@ts-ignore` comments

**Verification Commands:**
```bash
npm run build
# Verify output shows: ✓ built in X.XXs with zero errors
```

---

### Testing Verification

- [ ] **Unit tests pass:** `npm run test` shows all tests passing
- [ ] **Authorization tests:** Test suite includes privilege escalation prevention
- [ ] **Provisioning tests:** Family/parent/child creation tests pass
- [ ] **No test timeouts:** All tests complete within expected time
- [ ] **Test coverage:** All modified code paths covered

**Verification Commands:**
```bash
npm run test
# Verify output shows: Tests: XXX passed (XXX)
```

---

### Security Verification

- [ ] **Session endpoint reviewed:** Uses Firebase Admin SDK for token verification
- [ ] **Cookie flags verified:** HttpOnly, Secure, SameSite flags set correctly
- [ ] **Authorization enforced:** Server functions verify admin role
- [ ] **Firestore rules verified:** Users cannot self-modify roles
- [ ] **No credentials in logs:** No passwords, tokens, or PINs exposed
- [ ] **Error messages safe:** No stack traces or sensitive data in user-facing errors

**Verification Points:**
- Session creation at: `src/lib/backend/firebase/parent-auth.server.ts`
- Authorization check at: `src/lib/backend/provisioning.server.ts` (line 18-43)
- Firestore rules at: `firestore.rules` (line 60-72)

---

### Manual Testing Verification

- [ ] **Test 1.1 passed:** Admin email/password login creates session cookie
- [ ] **Test 1.2 passed:** Admin Google OAuth login creates session cookie
- [ ] **Test 1.3 passed:** Returning admin user session created correctly
- [ ] **Test 1.4 passed:** Session UID matches Firebase Auth UID
- [ ] **Test 2.1 passed:** Admin can access enrollment workflow
- [ ] **Test 2.2 passed:** Non-admin cannot access server functions
- [ ] **Test 2.3 passed:** Parent cannot escalate to admin role
- [ ] **Test 2.4 passed:** Admin cannot self-promote via Firestore
- [ ] **Test 3.1 passed:** Single parent/child enrollment workflow complete
- [ ] **Test 3.2 passed:** Single parent/multiple children enrollment works
- [ ] **Test 3.3 passed:** Duplicate submissions don't create duplicates
- [ ] **Test 3.4 passed:** Partial failures handled gracefully
- [ ] **Test 4.1 passed:** Session endpoint secure and verified
- [ ] **Test 4.2 passed:** Cookie security flags correct
- [ ] **Test 7.1 passed:** Firebase API key referrer restrictions OK

---

### Firebase Configuration Verification

- [ ] **Project ID matches:** Vercel `VITE_FIREBASE_PROJECT_ID` = Firebase Console
- [ ] **API key whitelisted:** Vercel domain in Firebase API key referrer restrictions
- [ ] **Service account configured:** Vercel has `FIREBASE_SERVICE_ACCOUNT` env var
- [ ] **Auth emulator OFF:** No local emulator running in production
- [ ] **Session cookie domain:** Matches Vercel domain
- [ ] **Production flags:** `secure=true` and `httpOnly=true` active

**Verification:**
- Check Vercel Environment Variables dashboard
- Verify no `FIRESTORE_EMULATOR_HOST` or `FIREBASE_AUTH_EMULATOR_HOST`
- Confirm Firebase project matches

---

### Environment Variables Verified

**In Vercel Settings → Environment Variables:**
- [ ] `VITE_FIREBASE_API_KEY` - set
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` - set
- [ ] `VITE_FIREBASE_PROJECT_ID` - set
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` - set
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` - set
- [ ] `FIREBASE_SERVICE_ACCOUNT` - set (JSON, not exposed)
- [ ] `FIREBASE_PROJECT_ID` - set (matches VITE_ version)
- [ ] No emulator env vars set

---

### Git History Clean

- [ ] **No merge conflicts:** `fix/admin-enrollment-stabilization` merges cleanly to `main`
- [ ] **Commit messages clear:** All commits have descriptive messages
- [ ] **No accidental commits:** No credentials, keys, or secrets in history
- [ ] **Rebase optional:** Can be deployed as-is without cleanup

**Verification:**
```bash
git merge-base --is-ancestor fix/admin-enrollment-stabilization main
# Should show that branch is ahead of main
```

---

### Documentation Prepared

- [ ] **PHASE_5B_INVESTIGATION_SUMMARY.md** - Root cause documented
- [ ] **PHASE_5B_SESSION_FIX_COMPLETION_REPORT.md** - Fix details documented
- [ ] **PHASE_5C_TESTING_PLAN.md** - Test cases documented
- [ ] **PHASE_5C_DEPLOYMENT_CHECKLIST.md** - This file
- [ ] **README or DEPLOYMENT_NOTES.md** - Deployment instructions clear
- [ ] **ROLLBACK_PROCEDURE.md** - Rollback steps documented (below)

---

## Deployment Procedure

### Step 1: Pre-Flight Check (15 minutes before deployment)

1. **Verify nothing changed since testing:**
   ```bash
   git status
   # Should show: On branch fix/admin-enrollment-stabilization, working tree clean
   ```

2. **Pull latest main to ensure no conflicts:**
   ```bash
   git fetch origin
   git log origin/main..fix/admin-enrollment-stabilization
   # Should show commits from fix branch only
   ```

3. **Run final test suite:**
   ```bash
   npm run test
   # Verify all tests pass
   ```

4. **Run final build:**
   ```bash
   npm run build
   # Verify zero errors
   ```

5. **Verify git log:**
   ```bash
   git log --oneline fix/admin-enrollment-stabilization -5
   ```

---

### Step 2: Merge to Main

1. **Checkout main:**
   ```bash
   git checkout main
   ```

2. **Merge fix branch:**
   ```bash
   git merge fix/admin-enrollment-stabilization
   # Should show: Fast-forward or explicit merge
   ```

3. **Verify merge succeeded:**
   ```bash
   git log --oneline main -5
   # Should show all commits from fix branch
   ```

---

### Step 3: Push to Production

1. **Push to origin main:**
   ```bash
   git push origin main
   ```

2. **Verify push succeeded:**
   ```bash
   git log --oneline origin/main -5
   # Should show latest commits
   ```

3. **Monitor Vercel deployment:**
   - Navigate to https://vercel.com/dashboard
   - Click on `tati-childsave-mvp` project
   - Wait for deployment to complete
   - Expected: ~2-5 minutes for full build and deployment
   - Look for green checkmark: "Production Deployment Successful"

---

### Step 4: Post-Deployment Verification (5-10 minutes)

**Smoke Testing (Quick Validation):**

1. **Health Check:**
   ```bash
   curl -I https://tati-childsave-mvp.vercel.app
   # Should return HTTP 200
   ```

2. **Admin Login Test:**
   - Navigate to `https://tati-childsave-mvp.vercel.app/admin-login`
   - Sign in with test admin account
   - Verify session cookie created (DevTools → Cookies)
   - Verify admin can navigate to `/admin/enroll`

3. **Enrollment Step 1 Test:**
   - At `/admin/enroll`, fill family information
   - Click "Next"
   - Verify no 500 error (main issue fix verification)
   - Check browser Network tab for successful request

4. **Error Log Check:**
   - Check Vercel Function Logs for any errors
   - Verify no "Unauthenticated: No session cookie found" errors
   - Verify no Firebase API_KEY_HTTP_REFERRER_BLOCKED errors

5. **Firebase Console Check:**
   - Open Firebase Console → Firestore
   - Verify test family record was created (if smoke test created one)
   - Check timestamps and structure

---

### Step 5: Rollback Ready

- **Rollback branch prepared:** See section below
- **Rollback procedure documented:** See section below
- **Time to rollback:** Estimated 5-15 minutes
- **Data loss risk:** None (Firestore data persists)
- **User impact if rollback:** Admin enrollment unavailable for ~5 minutes

---

## Rollback Procedure

### When to Rollback

Rollback if **any of the following** occur:
- 🔴 HTTP 500 errors persist during admin enrollment
- 🔴 Session cookie not created (Unauthenticated errors)
- 🔴 Non-admin users can call provisioning functions
- 🔴 Admin cannot access enrollment workflow
- 🔴 Existing parent/child journeys broken
- 🔴 Firebase connectivity issues
- 🔴 Significant performance degradation

### Rollback Steps (Command Line)

**Option 1: Via Git (Clean Rollback)**

1. **Identify last known good commit:**
   ```bash
   git log --oneline main -10
   # Find commit: 2ce5a47 "Relax authorization for pilot phase" (the commit BEFORE our fixes)
   # Or find: a52cd49 "Phase 2: Restore admin authorization..."
   ```

2. **Revert to previous good state:**
   ```bash
   git revert main
   # Creates new commit that undoes merge
   # OR
   git reset --hard 2ce5a47  # Go back to before our fixes
   git push origin main --force
   # WARNING: --force requires caution; use only if absolutely necessary
   ```

3. **Verify revert:**
   ```bash
   git log --oneline main -2
   ```

4. **Push to production:**
   ```bash
   git push origin main
   ```

5. **Monitor Vercel deployment:** Wait for green checkmark

---

**Option 2: Via Vercel Console (Fastest)**

1. **Go to Vercel Dashboard:**
   - Navigate to https://vercel.com/dashboard
   - Click `tati-childsave-mvp` project
   - Go to "Deployments" tab

2. **Find previous good deployment:**
   - Look for deployment before current one
   - Should show commit: `2ce5a47` or `a52cd49` or earlier
   - Status should be "Ready"

3. **Promote previous deployment to production:**
   - Click "..." menu on previous deployment
   - Select "Promote to Production"
   - Confirm action
   - Expected: ~2 minutes for DNS to update

4. **Verify rollback:**
   - Navigate to admin-login
   - Verify previous behavior (might still see session cookie from Phase 2)

---

### Rollback Verification

**After executing rollback, verify:**

1. **Health check:**
   ```bash
   curl -I https://tati-childsave-mvp.vercel.app
   # Should return HTTP 200
   ```

2. **Admin login still works:**
   - Navigate to `/admin-login`
   - Sign in should still work (because Phase 2 fixes remain)

3. **Error is gone (or changed):**
   - Attempt enrollment workflow
   - If 500 error was main issue: it should return (confirming rollback)
   - Observe error type

4. **Verify rollback commit:**
   ```bash
   git log --oneline origin/main -1
   ```

5. **Notify team:**
   - Document what failed
   - Prepare investigation for next iteration

---

### Data State After Rollback

**Important:** Firestore data persists across deployments

If test data was created during failed deployment:
- Test family records remain in Firestore
- Test parent accounts remain in Firebase Auth
- Can be cleaned up manually via Firebase Console if needed

---

## Emergency Procedures

### Complete System Failure

If production is completely down:

1. **Contact Firebase Support** (if Firebase issue)
2. **Check Vercel Status** at https://www.vercel.com/status
3. **Review Vercel Function Logs:**
   - Vercel Dashboard → Deployments → Current → Function Logs
4. **Check Firestore Quota:** Firebase Console → Firestore → Usage
5. **Redeploy from last known good commit:**
   ```bash
   git push origin [last_good_commit]:main --force
   ```

---

## Post-Rollback Recovery

If rollback was executed:

1. **Investigate root cause:**
   - Check Vercel Function Logs
   - Check Firebase Console for errors
   - Check browser Network tab recordings
   - Run tests locally: `npm run test`

2. **Fix identified issue:**
   - Create new branch: `git checkout -b fix/deployment-issue`
   - Make targeted fix
   - Test locally with `npm run test` and `npm run build`

3. **Redeploy:**
   - Repeat deployment procedure
   - More careful testing before pushing

---

## Monitoring Post-Deployment

### Real-Time Monitoring (First 30 minutes)

- **Monitor Vercel Function Logs:** Check for errors every 5 minutes
- **Monitor Firebase Logs:** Check for authentication/Firestore errors
- **Smoke Test:** Rerun smoke tests every 10 minutes
- **Check Error Rate:** Verify no spikes in 5xx errors

### Ongoing Monitoring (First 24 hours)

- **Check daily summary:** Review Vercel analytics
- **Monitor user reports:** Check Slack/email for issues
- **Verify enrollment data:** Spot-check Firestore for correct structure
- **Check session cookies:** Verify they're being created consistently

### Success Indicators

✅ **Deployment successful if:**
- No 500 errors in Function Logs
- Admin can complete enrollment workflow
- Session cookies created consistently
- No Firebase API errors
- Parent/child journeys still work
- Existing test data still accessible

---

## Documentation Links

- **Root Cause Analysis:** ADMIN_BOOTSTRAP_AND_SESSION_INVESTIGATION.md
- **Fix Details:** PHASE_5B_SESSION_FIX_COMPLETION_REPORT.md
- **Test Plan:** PHASE_5C_TESTING_PLAN.md
- **Summary:** PHASE_5B_INVESTIGATION_SUMMARY.md

---

## Backup and Recovery

**Database Backups:**
- Firestore is managed by Firebase (automatic daily backups)
- Firebase Auth is managed by Firebase (no direct backup needed)
- Can request Firestore restoration from Firebase Support if needed

**Code Backup:**
- All commits in GitHub repository
- Can checkout any previous commit
- Branch protection prevents accidental deletes

---

## Sign-Off

**Deployment authorized by:**
- [ ] User approval (explicit consent required before deploying)
- [ ] QA/Testing complete
- [ ] Security review passed
- [ ] All checklist items verified

**Deployment executed by:**
- [ ] Name/Date: _________________
- [ ] No issues encountered
- [ ] Deployment verified successful
- [ ] Post-deployment monitoring confirmed

---

## Contacts for Issues

- **Vercel Support:** https://vercel.com/help
- **Firebase Support:** https://firebase.google.com/support
- **GitHub Issues:** Create issue in repository
- **Team Slack:** #tati-childsave channel

---

## Conclusion

This deployment checklist and rollback procedure ensures:
1. ✅ All code and tests verified before deployment
2. ✅ Clear deployment steps with verification
3. ✅ Fast rollback capability (5-15 minutes)
4. ✅ No data loss during rollback
5. ✅ Post-deployment monitoring and recovery plan
6. ✅ Emergency procedures documented

**Status:** Ready for deployment after all test cases pass
