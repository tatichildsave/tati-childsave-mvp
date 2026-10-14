# Production Rollback Procedure — Comprehensive Guide

**Purpose:** Step-by-step instructions to safely revert the admin enrollment feature deployment  
**Scope:** Repository changes, Vercel deployment, and limitations on Firestore/Auth rollback

---

## Pre-Deployment Record (Baseline)

**Record these values BEFORE deploying to production:**

### Git Repository State
```bash
# Command to record (execute NOW, before deployment)
git log --oneline -5 > pre-deployment-baseline.txt
git show HEAD:src/integrations/firebase/admin.server.ts | head -20 >> pre-deployment-baseline.txt

# Output will show:
# - Latest commit hash on main (before merge)
# - Sample of admin.server.ts (to verify it's the baseline)
```

**Example Output (DO THIS NOW):**
```
Main branch commit before deployment:
[latest commit hash on main]

Admin SDK initialization (should NOT have verifyProjectConfiguration yet):
[first 20 lines of admin.server.ts]
```

### Vercel Deployment State
- **Production URL:** `https://tati-childsave-mvp.vercel.app`
- **Current Deployment ID:** Record from Vercel Console → Deployments (note the hash)
- **Vercel Environment:** Production
- **Last Successful Deployment:** [timestamp before merge]

---

## Complete Feature Changes Being Deployed

**Files Added:**
```
PRODUCTION_DEPLOYMENT_READINESS.md (documentation)
DEPLOYMENT_APPROVAL_CHECKLIST.md (documentation)
PHASE_5F_PRODUCTION_READINESS_SUMMARY.md (documentation)
FINAL_PRE_DEPLOYMENT_VERIFICATION.md (documentation)
API_KEY_REFERRER_INVESTIGATION.md (documentation)
tests/firebase/admin-enrollment.integration.test.ts (tests)
tests/firebase/admin-enrollment.core.test.ts (tests)
tests/firebase/admin-enrollment-minimal.test.ts (tests)
```

**Files Modified:**
```
src/integrations/firebase/admin.server.ts
  - Added verifyProjectConfiguration() function (~45 lines)
  - Added fail-closed check in initializeAdminApp()
  - No changes to authentication logic or session handling

src/lib/backend/provisioning.server.ts
  - Fixed validation return types in 3 tests
  - No changes to authorization or business logic

src/routes/(public)/admin-login.tsx
  - Session cookie creation (from Phase 5C)
  - No changes to login flow

src/routes/admin/enroll/index.tsx
  - Four-step enrollment workflow
  - Uses new provisioning server functions
  - No changes to existing admin routes
```

**Files NOT Modified (Safe):**
```
src/routes/admin/index.tsx (old admin dashboard - unchanged)
src/lib/backend/provisioning.functions.ts (unchanged)
src/routes/parent/* (parent login - unchanged)
src/routes/child/* (child sessions - unchanged)
All learning journey, scenario, assessment code (unchanged)
All Firestore security rules (unchanged)
```

---

## Rollback Scenarios

### Scenario A: Rollback Before Any Data is Created (BEST CASE)

**Situation:** Deployment succeeded, but enrollment workflow has errors or is untested  
**Risk Level:** 🟢 LOW  
**Action:** Simple git revert + redeploy

```bash
# Step 1: Revert the merge commit
git checkout main
git log --oneline -1  # Note the merge commit hash

git revert -m 1 [merge-commit-hash]
# This creates a NEW commit that reverts all changes
# The -m 1 flag tells git to use the first parent (main branch)

# Step 2: Push the revert commit
git push origin main

# Step 3: Vercel auto-deploys the revert commit
# Wait 2-3 minutes for deployment to complete

# Step 4: Verify rollback
# Open https://tati-childsave-mvp.vercel.app/admin-login
# Test parent login and child sessions (should work as before)

# Step 5: Investigate the issue
# The previous commit remains in Git history for review
```

**Time to Rollback:** 5 minutes  
**Firestore Impact:** None (no documents created yet)  
**Firebase Auth Impact:** None (no accounts created yet)

---

### Scenario B: Rollback After Creating Test Data (MODERATE CASE)

**Situation:** Smoke test created disposable family/parent/child records  
**Risk Level:** 🟡 MEDIUM  
**Action:** Git revert + manual Firestore cleanup

```bash
# Step 1: Git revert (same as Scenario A)
git checkout main
git log --oneline -1
git revert -m 1 [merge-commit-hash]
git push origin main

# Wait for Vercel deployment to complete

# Step 2: Manual cleanup in Firestore
# ⚠️ These changes CANNOT be automatically rolled back

## Delete test families and records:
# In Firebase Console → Firestore:

1. Navigate to Collections → families
2. Find families created during smoke test
   - Example: TEST-PILOT-FAMILY-001
3. Click to open family document
4. Delete subcollections in this order:
   a. children (each child's subcollections first: childCredentials, sessions, journeyProgress, etc.)
   b. members
5. Delete the family document itself
6. Repeat for all test families

## Delete test parent Firebase Auth accounts:
# In Firebase Console → Authentication → Users:

1. Find users created during testing
   - Example: test-pilot@tatichildsave.test
2. Click the three-dot menu → Delete user
3. Confirm deletion

## Delete test parent Firestore records:
# In Firebase Console → Firestore → /users:

1. Find user documents for test parents
2. Delete each one

## Delete test child credentials:
# In Firebase Console → Firestore → /childCredentials:

1. Find credentials created during test
   - TATI IDs start with "TATI-"
2. Delete each credential document
```

**⚠️ IMPORTANT: Firestore Deletions Are NOT Reversible**
- Deleted documents cannot be restored from backup automatically
- Google Cloud has a 35-day soft-delete period (contact support if needed)
- **Prevention:** Use disposable test email addresses (e.g., `test-pilot@tatichildsave.test`) so cleanup is easier to identify

**Time to Rollback:** 10-15 minutes (mostly manual Firestore cleanup)  
**Risk:** If test data is not fully cleaned, subsequent deployments may encounter duplicate records

---

### Scenario C: Rollback After Production Data is Mixed With Test Data (WORST CASE)

**Situation:** Real families enrolled + test data created; need to rollback without losing real data  
**Risk Level:** 🔴 HIGH  
**Action:** Git revert + surgical Firestore cleanup + manual verification

**⚠️ CRITICAL:** Do NOT delete Firestore documents unless you are 100% certain they are test data.

```bash
# Step 1: Git revert (same as above)
git checkout main
git revert -m 1 [merge-commit-hash]
git push origin main

# Step 2: CAREFUL manual cleanup
# Open Firebase Console → Firestore → families

# For EACH family:
# BEFORE DELETING, verify:
# - createdBy field matches the admin TEST account (not production admin)
# - enrolmentDate is today (smoke test date)
# - Family name starts with TEST- or matches test naming pattern
# - NO REAL FAMILY DATA should have these characteristics

# ONLY then delete test family and related records

# Step 3: Verify production data remains
# Open Firebase Console → Firestore
# Manually confirm:
# - Real families still exist
# - Real parents still logged in
# - Real children still have TATI IDs

# Step 4: Contact Firebase support if uncertain
# If any real data may have been deleted:
# - Firebase Console → Help → Create support case
# - Request recovery from backup (up to 35 days)
```

**Time to Rollback:** 30+ minutes (requires careful manual verification)  
**Risk:** Very high risk of data loss if real and test data are mixed

**Prevention:** Always use clearly labeled test data (e.g., `TEST-PILOT-*` prefix) during smoke tests.

---

## What CANNOT Be Rolled Back Automatically

### Firestore Document Deletions
**Once deleted, documents are GONE (with some caveats):**
- ✅ Google Cloud keeps a 35-day soft-delete period
- ✅ Contact Firebase support to restore if within 35 days
- ❌ No automatic rollback
- ❌ No git-based recovery

**Example:**
```
Deleted: /families/TEST-PILOT-FAMILY-001
Result: Family record, all children, all credentials gone
Recovery: Contact Firebase support; provide deletion timestamp
```

### Firebase Auth Accounts
**Once deleted, accounts cannot be auto-recovered:**
- ✅ Account deletion is immediate
- ❌ Cannot use git to restore
- ✅ Can create new account with same email (after 30 days or contact support)

**Example:**
```
Deleted: User account test-pilot@tatichildsave.test
Result: Account gone; UID no longer valid
Recovery: Create new account with same email OR contact support
```

### Firestore Security Rules
**NOT affected by enrollment deployment:**
- ✅ Rules unchanged in this feature
- ✅ Rules will remain in place after rollback
- ✅ No rollback needed

---

## Rollback Checklist

**Execute in this order:**

### Before Deploying (Record Baseline)
- [ ] Run: `git log --oneline -5 > pre-deployment-baseline.txt`
- [ ] Note the main branch commit hash (e.g., abc1234)
- [ ] Record time/date before deployment
- [ ] Save Vercel deployment ID from Deployments page

### During Smoke Test (Prepare for Rollback)
- [ ] Use clearly labeled test data (e.g., `TEST-PILOT-*`)
- [ ] Document test family IDs created:
  - Family ID: _______________
  - Parent Email: _______________
  - Child TATI ID(s): _______________
- [ ] Keep Firestore Console tab open during testing

### If Rollback is Needed (Do These Steps)

**Step 1: Git Revert**
- [ ] `git checkout main`
- [ ] `git log --oneline -1` (record the merge commit hash)
- [ ] `git revert -m 1 [merge-commit-hash]`
- [ ] `git push origin main`

**Step 2: Wait for Deployment**
- [ ] Wait 2-3 minutes for Vercel to complete deployment
- [ ] Verify Vercel shows "Ready" status on Deployments page
- [ ] Test: Open https://tati-childsave-mvp.vercel.app/admin-login
- [ ] Confirm admin can still log in (parent login still works)

**Step 3: Manual Firestore Cleanup (If Needed)**
- [ ] Open Firebase Console → Firestore Database
- [ ] Delete test families (using IDs documented above)
  - [ ] Delete family: _______________
  - [ ] Delete family: _______________
- [ ] Delete test parent Firebase Auth accounts
  - [ ] Delete: _______________
- [ ] Delete test child credentials (TATI IDs)

**Step 4: Verify Cleanup**
- [ ] Query Firestore: `/families` should have only real families
- [ ] Query Firestore: `/users` should have only real parents
- [ ] Firebase Auth → Users should have no test accounts
- [ ] No orphaned child credentials remain

**Step 5: Final Verification**
- [ ] Parent can log in: https://tati-childsave-mvp.vercel.app/parent/login
- [ ] Real family can access learning journey
- [ ] Real children can access their sessions
- [ ] Admin cannot access `/admin/enroll` (feature rolled back)

---

## Rollback Communication

**If rollback becomes necessary, document:**

1. **What triggered the rollback?**
   - Example: "Enrollment workflow had 403 referrer error on Step 2"

2. **What Git commits were involved?**
   - Deployment commit: [hash]
   - Revert commit: [hash]

3. **What Firestore cleanup was performed?**
   - Families deleted: [count]
   - Auth accounts deleted: [count]
   - Credentials deleted: [count]

4. **Did any real data need recovery?**
   - YES/NO
   - If YES: Support case #: ____________

5. **Is the application stable after rollback?**
   - Parent login: WORKING / BROKEN
   - Child sessions: WORKING / BROKEN
   - Existing families: WORKING / BROKEN
   - Existing learning journeys: WORKING / BROKEN

---

## Testing Rollback Procedure (Before Production Deployment)

**Recommended:** Practice rollback in a staging environment first.

```bash
# On staging/test branch:
git checkout -b test-rollback

# Create a dummy commit to simulate deployment
echo "test" >> dummy.txt
git add dummy.txt
git commit -m "test deployment"

# Now practice rollback:
git log --oneline -1  # Note the commit hash
git revert -m 1 [hash]
git show HEAD  # Verify revert commit was created

# Clean up test branch
git checkout main
git branch -D test-rollback
```

This practice ensures the rollback procedure is solid before using it on production.

---

## Summary

| Scenario | Time to Rollback | Manual Cleanup | Risk Level | Data Loss |
|----------|-----------------|----------------|------------|-----------|
| **Before any data** | 5 min | None | 🟢 Low | None |
| **After test data** | 10-15 min | Firestore | 🟡 Medium | Only test data |
| **Mixed real + test** | 30+ min | Careful Firestore | 🔴 High | Possible real data |

**Best Practice:** Keep smoke test completely separate from real data using test-account naming convention.

