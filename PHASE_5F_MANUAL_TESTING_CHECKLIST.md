# Manual Testing Checklist — Phase 5F Preview Deployment

**Duration:** 90-120 minutes  
**Tester:** (your name)  
**Preview URL:** (from Vercel)  
**Date:** (date tested)  

---

## Pre-Testing Setup

- [ ] Admin account credentials ready (DO NOT share password in report)
- [ ] Test family data prepared (family name, parent email, child names)
- [ ] Preview URL from Vercel dashboard noted
- [ ] Firebase project verified as production (tatichildsavemvp)

**Important:** Do not use production admin account. Use test account created via Firebase Console.

---

## Test Group 1: Admin Authentication (15 min)

### Test 1: Admin Login (Email)
- [ ] Navigate to `/admin-login`
- [ ] Enter admin test email
- [ ] Enter admin test password
- [ ] Click "Sign In"
- **Expected:** Redirect to `/admin` dashboard
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

### Test 2: Admin Session Persistence
- [ ] After login, refresh page (Ctrl+R)
- [ ] Check if still logged in (should see admin dashboard)
- **Expected:** Session cookie persists, still authenticated
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

### Test 3: Logout
- [ ] Click logout/sign out button
- [ ] Navigate to `/admin`
- **Expected:** Redirected to login page, not dashboard
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

---

## Test Group 2: Enrollment Workflow (60 min)

### Test 4: Step 1 - Family Details
- [ ] From admin dashboard, click "Enroll New Family" or navigate `/admin/enroll`
- [ ] Enter family name: "Test Family [Your ID]"
- [ ] Enter location: "Accra" (or any valid Ghana location)
- [ ] Click "Next"
- **Expected:** Progress to Step 2, no errors
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

### Test 5: Step 2 - Parent Details (CRITICAL - This is where HTTP 500 occurred)
- [ ] Enter parent email: `testparent+[timestamp]@test.local`
- [ ] Enter full name: "Test Parent [Your ID]"
- [ ] Enter phone: "+233201234567" (Ghanaian format)
- [ ] Click "Next"
- **Expected:** Progress to Step 3, NO HTTP 500 error
- **Result:** ☐ PASS ☐ FAIL
- **HTTP Status:** (note if 500, 403, or 2xx)
- **Error Message:** ___________________________________________________________
- **Notes:** ___________________________________________________________

### Test 6: Step 3 - Add Child (Single)
- [ ] Enter child name: "Test Child 1 [Your ID]"
- [ ] Select age: 10
- [ ] Click "Add Child"
- [ ] Click "Next" (or "Proceed")
- **Expected:** Child added, progress to Step 4
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

### Test 7: Step 4 - Review and Confirm
- [ ] Review displayed family name
- [ ] Review displayed parent email
- [ ] Review displayed child name and age
- [ ] Click "Confirm and Enroll"
- **Expected:** Enrollment completes, success message shown
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

### Test 8: Multiple Children Scenario
- [ ] Start new enrollment (new family name + timestamp)
- [ ] Complete Steps 1-2 as before
- [ ] In Step 3, add three children:
  - Child A: age 8
  - Child B: age 12
  - Child C: age 15
- [ ] Complete Step 4
- **Expected:** All three children added correctly
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

---

## Test Group 3: Authorization Enforcement (15 min)

### Test 9: Non-Admin User Blocked
- [ ] Log out from admin account
- [ ] Create a test parent account (optional, if supported)
- [ ] Try to access `/admin/enroll` directly
- **Expected:** Access denied or redirected to login
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

### Test 10: Server-Function Authorization Check
- [ ] Open browser Developer Tools (F12)
- [ ] Go to Network tab
- [ ] While logged in as parent (or non-admin), attempt to call any provisioning server function
- **Expected:** Request blocked with 403 Forbidden or authorization error (not 500)
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

---

## Test Group 4: Error Handling (15 min)

### Test 11: Invalid Email Format
- [ ] Start new enrollment
- [ ] In Step 2, enter invalid email: "notanemail"
- [ ] Try to click "Next"
- **Expected:** Validation error shown, no server call made
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

### Test 12: Duplicate Parent Email
- [ ] Complete one full enrollment (Tests 4-7)
- [ ] Start new enrollment with same parent email
- [ ] Complete Step 2
- **Expected:** Error message (not raw HTML or 500)
- **Result:** ☐ PASS ☐ FAIL
- **Error Message:** ___________________________________________________________

### Test 13: Child Age Out of Range
- [ ] In Step 3, try to add child with age < 5 or > 18
- [ ] Try to submit
- **Expected:** Validation error shown, not accepted
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

---

## Test Group 5: UI/UX Validation (10 min)

### Test 14: No Raw HTML Errors
- [ ] Throughout all tests, check browser console and UI
- **Expected:** All errors are user-friendly messages, NOT raw HTML or stack traces
- **Result:** ☐ PASS ☐ FAIL
- **Notes:** ___________________________________________________________

---

## Critical Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Admin Login | ☐ PASS ☐ FAIL | |
| 2. Session Persistence | ☐ PASS ☐ FAIL | |
| 3. Logout | ☐ PASS ☐ FAIL | |
| **4. Step 1 - Family** | ☐ PASS ☐ FAIL | |
| **5. Step 2 - Parent** | ☐ PASS ☐ FAIL | **CRITICAL** |
| **6. Step 3 - Child** | ☐ PASS ☐ FAIL | |
| **7. Step 4 - Review** | ☐ PASS ☐ FAIL | |
| 8. Multiple Children | ☐ PASS ☐ FAIL | |
| 9. Non-Admin Blocked | ☐ PASS ☐ FAIL | |
| 10. Server Auth Check | ☐ PASS ☐ FAIL | |
| 11. Invalid Email | ☐ PASS ☐ FAIL | |
| 12. Duplicate Email | ☐ PASS ☐ FAIL | |
| 13. Child Age Validation | ☐ PASS ☐ FAIL | |
| 14. No Raw HTML Errors | ☐ PASS ☐ FAIL | |

---

## Cleanup Required After Testing

**DO THIS BEFORE FINISHING:**

1. [ ] Open Firebase Console (production project)
2. [ ] Go to Firestore → Collection "families"
3. [ ] Delete test families created during testing
   - Search for "Test Family [Your ID]"
   - Delete entire family documents
4. [ ] Go to Firebase Auth
5. [ ] Delete test parent accounts created:
   - Search for emails containing "testparent+"
   - Delete accounts

**Why:** To avoid contaminating production data with test records.

---

## Final Sign-Off

**Overall Result:**
- ☐ ALL TESTS PASSED → Ready to merge to main
- ☐ SOME TESTS FAILED → Needs fixes before merge
- ☐ CRITICAL TEST FAILED (Step 2) → Blocking issue

**Summary of Failures (if any):**

___________________________________________________________________________

___________________________________________________________________________

**Tester Name:** ________________  
**Date:** ________________  
**Time Spent:** ________________

---

## Issue Reporting (if failures found)

If you encountered failures:

1. **Do NOT include passwords, session cookies, tokens, or PINs in the report**
2. Note the exact error message
3. Note HTTP status code (if visible in Network tab)
4. Describe steps to reproduce
5. Screenshot of error (mask any sensitive data)

**Report template:**
```
Test: [Number and name]
Status: FAIL
HTTP Status: [500, 403, 400, etc. or "N/A"]
Error Message: [Exact text shown to user]
Steps to Reproduce:
1. ...
2. ...
3. ...
Expected: ...
Actual: ...
Notes: ...
```

---

## Success Criteria for Pilot Approval

✅ **All 14 tests must PASS**  
✅ **No HTTP 500 errors in Step 2 (Parent Details)**  
✅ **Authorization enforcement working (non-admins blocked)**  
✅ **All error messages are user-friendly (no raw HTML)**  
✅ **Test data cleaned up from Firebase**

If all criteria met → Ready to merge and proceed with pilot launch.
