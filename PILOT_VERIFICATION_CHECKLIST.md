# PILOT VERIFICATION CHECKLIST

**Date:** 2026-10-24  
**Status:** To be completed before pilot launch  
**Owner Responsibility:** Admin team

---

## Pre-Pilot Infrastructure Verification

### Firebase Configuration

- [ ] **FIREBASE_PROJECT_ID** set in Vercel deployment environment
- [ ] **FIREBASE_SERVICE_ACCOUNT** is valid JSON credentials with required IAM roles
  - [ ] firestore.databases.get
  - [ ] firestore.documents.read
  - [ ] firestore.documents.write
  - [ ] firebase.projects.get
- [ ] Firebase project is accessible from deployment region
- [ ] Firestore database is in "production mode" (not emulator)
- [ ] Firebase Auth is enabled
- [ ] Cloud Logging is enabled and configured

### Supabase Verification (Ownership)

- [ ] Supabase project `ggtjulmplujaqmsppque` ownership confirmed
  - [ ] Logged into https://supabase.com
  - [ ] Project visible under TATI organization
  - [ ] Billing account is TATI-controlled (not Lovable)
  - [ ] No Lovable team members have admin access
- [ ] Decision made: Retain, Migrate, or Remove Supabase
  - [ ] If Retain: Emergency contact defined for Supabase issues
  - [ ] If Migrate: Timeline documented (Phase 7C3+)
  - [ ] If Remove: Backup/archive plan confirmed

### Network & Connectivity

- [ ] Test connection to Firebase endpoints from deployment environment
- [ ] Test Firestore write/read latency (target: <100ms)
- [ ] Test child login from deployed URL (not localhost)
- [ ] Test parent enrollment from deployed URL
- [ ] Verify HTTPS enforcement on all routes

---

## Operational Readiness Tests

### 1. Child Authentication & Session Management

**Test: Child Login with Valid Credentials**
```
Setup:
  - Admin: Create test family "Pilot Test Family"
  - Admin: Enroll test parent "parent.test@tatichildsave.local"
  - Admin: Create test child, TATI ID: TATI-TESTABCD, PIN: 1234

Test:
  - [ ] Navigate to /child/login
  - [ ] Enter TATI-TESTABCD
  - [ ] Enter PIN 1234
  - [ ] Verify: Session created, cookie set
  - [ ] Verify: Redirected to /child/home
  - [ ] Verify: Child profile loaded
  - [ ] Verify: No error in console logs

Evidence:
  - [ ] Screenshot: /child/home displays child avatar and name
  - [ ] Browser DevTools: Cookie "tati_child_session" is set, HTTP-only=true, Secure=true
  - [ ] Firebase Console: Session document created at /families/{familyId}/children/{childId}/sessions/{sessionId}
```

**Test: Child Login with Invalid PIN**
```
Test:
  - [ ] Enter TATI-TESTABCD
  - [ ] Enter wrong PIN (e.g., 9999)
  - [ ] Verify: Error message displayed
  - [ ] Verify: Error is generic: "That TATI ID or PIN could not be verified."
  - [ ] Verify: No indication whether TATI ID exists or PIN is wrong
  - [ ] Verify: No PIN value in error message or console
  - [ ] Verify: Login counter incremented in backend

Evidence:
  - [ ] Screenshot: Error message shown
  - [ ] Firebase Console: Lockout document shows failed_attempts incremented
```

**Test: PIN Brute-Force Lockout**
```
Test:
  - [ ] Enter TATI-TESTABCD + wrong PIN 5 times
  - [ ] On 5th attempt, verify: Locked message shown
  - [ ] Verify: Message says "Try again in X minutes" (X = 15)
  - [ ] Wait 5 seconds, try login again
  - [ ] Verify: Still locked
  - [ ] Wait 15 minutes (or simulate by clearing lockout in Firebase)
  - [ ] Verify: Login allowed again

Evidence:
  - [ ] Screenshot: Lockout message with time remaining
  - [ ] Firebase Console: child_lockout document shows lockedUntil timestamp
  - [ ] Screenshot: Login succeeds after lockout expires
```

**Test: Session Expiry (30-minute TTL)**
```
Test:
  - [ ] Child logs in successfully
  - [ ] After 1 minute, verify session still valid (can view pages)
  - [ ] After 31 minutes, refresh page
  - [ ] Verify: Redirected to /child/login
  - [ ] Verify: Session marked as expired in backend
  - [ ] Attempt to use old cookie: denied with redirect to login

Evidence:
  - [ ] Session timestamp in Firebase shows creation time
  - [ ] Expiry timestamp = creation + 30 minutes
  - [ ] After expiry, attempts return 401 Unauthorized
```

**Test: Logout**
```
Test:
  - [ ] Child logs in
  - [ ] Click "Logout" button on /child/home or learning page
  - [ ] Verify: Redirected to /child/login
  - [ ] Verify: Cookie cleared
  - [ ] Attempt to navigate back to /child/home
  - [ ] Verify: Redirected to /child/login (session not valid)

Evidence:
  - [ ] Browser DevTools: Cookie "tati_child_session" removed
  - [ ] Firebase Console: Session document marked revoked_at = now
```

### 2. Family & Child Profile Isolation

**Test: Cross-Family Access Denial**
```
Setup:
  - Create two families: "Family A", "Family B"
  - Enroll parent@a.test in Family A with child "Child A1"
  - Enroll parent@b.test in Family B with child "Child B1"

Test:
  - [ ] Parent A logs in, navigates to /parent
  - [ ] Verify: Only "Child A1" visible in child list
  - [ ] Verify: "Child B1" NOT visible
  - [ ] Parent B logs in, navigates to /parent
  - [ ] Verify: Only "Child B1" visible
  - [ ] Verify: "Child A1" NOT visible
  - [ ] Attempt direct Firestore query: /families/family-b-id/children
  - [ ] Verify: Firestore rules deny read access (permission denied)

Evidence:
  - [ ] Screenshot: Parent A dashboard shows only Child A1
  - [ ] Screenshot: Parent B dashboard shows only Child B1
  - [ ] Firestore Console: Query /families/family-b-id/children as parent@a.test returns permission denied
```

**Test: Child Cannot Access Sibling's Progress (Same Family)**
```
Setup:
  - Create family "Multi-Child Family" with two children
  - Child 1: TATI-CHILD01, Child 2: TATI-CHILD02

Test:
  - [ ] Child 1 completes lesson, earns 100 points
  - [ ] Child 2 logs in
  - [ ] Verify: Child 2 sees ONLY their own progress
  - [ ] Verify: Child 2 does NOT see Child 1's 100 points
  - [ ] Verify: Child 2 sees 0 points (their own)
  - [ ] Attempt direct Firestore query: /families/{familyId}/children/child1-id/progress
  - [ ] Verify: Query as child2-session returns permission denied

Evidence:
  - [ ] Screenshot: Child 2 dashboard shows their progress, not Child 1's
  - [ ] Firestore Console: Permission denied when querying sibling's progress
```

### 3. Administrator Enrollment Workflow

**Test: Admin Creates Family & Enrolls Parent**
```
Test:
  - [ ] Admin logs in at /admin
  - [ ] Click "Create New Family"
  - [ ] Enter family name "Test Enrollment Family"
  - [ ] Enter parent email "pilot@tatichildsave.local"
  - [ ] Verify: Family created in Firestore
  - [ ] Verify: Parent invited (invitation sent or displayed)
  - [ ] Admin receives TATI ID for first child (e.g., TATI-NEWWCHLD)
  - [ ] Verify: PIN is displayed once to admin (not emailed)
  - [ ] Verify: PIN can be copied but not resent

Evidence:
  - [ ] Screenshot: Family created confirmation
  - [ ] Screenshot: Parent email and TATI ID/PIN displayed to admin
  - [ ] Firebase Console: Family document created
  - [ ] Firebase Console: Child profile document created with tatiId
  - [ ] Firebase Console: child_credentials document created with pin_hash (not plaintext)
```

**Test: Parent Completes Onboarding**
```
Test:
  - [ ] Parent receives enrollment link
  - [ ] Parent clicks link, logs in to Firebase
  - [ ] Parent sets child avatar, age, tier
  - [ ] Verify: Child profile updated in Firestore
  - [ ] Parent sees "Ready to start" message
  - [ ] Parent is redirected to /parent dashboard
  - [ ] Verify: Child visible in parent's child list

Evidence:
  - [ ] Screenshot: Parent onboarding completion
  - [ ] Firebase Console: Child profile document has avatar, age, tier
  - [ ] Parent dashboard shows enrolled child
```

### 4. Learning Flow & Progress Persistence

**Test: Complete Lesson**
```
Test:
  - [ ] Child logs in
  - [ ] Child navigates to first lesson
  - [ ] Child completes lesson task
  - [ ] Verify: Progress recorded
  - [ ] Verify: Lesson marked as "completed" in dashboard
  - [ ] Verify: Firestore write successful (no error)

Evidence:
  - [ ] Screenshot: Lesson completion page
  - [ ] Firebase Console: learning_progress document shows lesson_completed
  - [ ] Firebase Console: Timestamp = current time
```

**Test: Start & Save Scenario, Then Resume**
```
Test:
  - [ ] Child starts scenario "Save and Spend Decisions"
  - [ ] Child makes first choice (e.g., "Save money")
  - [ ] Verify: Progress auto-saved to Firestore
  - [ ] Child exits scenario (close browser tab or back button)
  - [ ] Child logs back in
  - [ ] Child navigates to scenario
  - [ ] Verify: Previous choice is visible (scenario resumed)
  - [ ] Verify: State matches what was saved

Evidence:
  - [ ] Screenshot: Scenario state after resume matches pre-exit state
  - [ ] Firebase Console: scenario_sessions document shows current node_id matching resumed state
  - [ ] No loss of decisions or progress
```

**Test: Complete Assessment & Store Attempt**
```
Test:
  - [ ] Child starts assessment (pre or post)
  - [ ] Child answers questions
  - [ ] Child completes assessment
  - [ ] Verify: Score calculated and shown
  - [ ] Verify: Attempt persisted to Firestore
  - [ ] Parent logs in, views assessment results
  - [ ] Verify: Parent sees child's score (not individual answers for privacy)

Evidence:
  - [ ] Screenshot: Assessment completion with score
  - [ ] Firebase Console: assessment_attempts document shows points, max_points
  - [ ] Firebase Console: assessment_responses documents show answers (if needed for analysis)
  - [ ] Parent dashboard shows assessment score
```

**Test: Earn Achievement Badge & Celebration**
```
Test:
  - [ ] Child completes scenario
  - [ ] Verify: Achievement badge earned (toast shown)
  - [ ] Verify: Celebration animation shown once
  - [ ] Child navigates away, then back to home
  - [ ] Verify: Celebration NOT shown again (only once per session)
  - [ ] Verify: Badge still visible in achievement list
  - [ ] Child logs out and back in
  - [ ] Verify: Celebration NOT shown (persisted as "celebrated: true")

Evidence:
  - [ ] Screenshot: Achievement toast with celebration
  - [ ] Screenshot: Home page shows badge in achievements
  - [ ] Firebase Console: learner_achievements document shows celebrated=true
  - [ ] No duplicate celebrations on refresh
```

### 5. Facilitator Authorization & School/Cohort Isolation

**Test: Facilitator Can Only See Assigned School**
```
Setup:
  - Create two schools: "Pilot School A", "Pilot School B"
  - Enroll facilitator@school-a.test to School A
  - Enroll facilitator@school-b.test to School B
  - Create cohorts and learner assignments

Test:
  - [ ] Facilitator A logs in
  - [ ] Verify: Only School A visible
  - [ ] Verify: Only School A cohorts visible
  - [ ] Verify: Only School A learners visible
  - [ ] Verify: School B cohorts NOT visible
  - [ ] Verify: School B learners NOT visible
  - [ ] Attempt direct Firestore query: /schools/school-b-id/cohorts
  - [ ] Verify: Permission denied (Firestore rules deny access)

Evidence:
  - [ ] Screenshot: Facilitator A dashboard shows School A only
  - [ ] Firebase Console: Query for School B returns permission denied
```

**Test: Facilitator Read-Only Access to Learners**
```
Test:
  - [ ] Facilitator A views assigned cohort
  - [ ] Verify: Can view learner progress, assessments, scenarios
  - [ ] Verify: Cannot edit child profile (avatar, name, age read-only)
  - [ ] Verify: Cannot reset child PIN
  - [ ] Verify: Cannot enroll new children
  - [ ] Verify: Can see optional "Request PIN Reset" button
  - [ ] Verify: When clicked, sends admin request (not automatic reset)

Evidence:
  - [ ] Screenshot: Learner profile is read-only
  - [ ] No edit buttons on facilitator dashboard
```

### 6. Security & Logging

**Test: No PINs or Tokens in Logs**
```
Test:
  - [ ] Export 24-hour Firebase logs
  - [ ] Search for PIN patterns (e.g., "1234", "0000", PIN_PATTERN regex)
  - [ ] Verify: Zero results
  - [ ] Search for session token patterns (hex strings > 32 chars)
  - [ ] Verify: Zero results in unencrypted logs
  - [ ] Search for email patterns
  - [ ] Verify: Only in admin enrollment (expected), not in error messages
  - [ ] Review error messages for sensitive data
  - [ ] Verify: All errors are generic (e.g., "Operation failed, please try again")

Evidence:
  - [ ] Log export report: "Searched 500 log entries, 0 PINs found, 0 tokens found"
  - [ ] Screenshot: Error messages contain no PII
```

**Test: No Sensitive Data in Analytics Events**
```
Test:
  - [ ] Export analytics_events from Firestore
  - [ ] Verify: event_name only (no free text)
  - [ ] Verify: No question text
  - [ ] Verify: No child response text
  - [ ] Verify: No parent personal data
  - [ ] Verify: Uses actor_id (UUID), not email/name

Evidence:
  - [ ] Report: "Sample 100 events, all event_name only, no free text, no PII"
```

**Test: Firestore Rules Enforced**
```
Test:
  - [ ] As unauthenticated user, attempt read of /families
  - [ ] Verify: Permission denied
  - [ ] As child session (cookie), attempt read of /childCredentials
  - [ ] Verify: Permission denied
  - [ ] As facilitator, attempt write of /schools/school-a/cohorts
  - [ ] Verify: Permission denied (read-only)
  - [ ] As parent A, attempt read of /families/family-b-id
  - [ ] Verify: Permission denied

Evidence:
  - [ ] Firestore Console: All unauthorized queries return "Permission denied"
```

---

## Deployment Validation

### Build Verification
- [ ] Clean build succeeds: `npm run build`
- [ ] Build output contains:
  - [ ] dist/client/ (browser bundle)
  - [ ] dist/server/ (server functions)
  - [ ] dist/api/ (Vercel API routes)
- [ ] Build has zero TypeScript errors (note: may have warnings)
- [ ] Build time reasonable (<2 minutes)

### Type Checking
- [ ] Run: `npx tsc --noEmit`
- [ ] Document any pre-existing TypeScript issues
- [ ] Confirm no NEW TypeScript issues introduced
- [ ] Note: 112 pre-existing diagnostics are acceptable (technical debt)

### Deployment Configuration
- [ ] vercel.json is correct
- [ ] Environment variables documented in Vercel dashboard
- [ ] Node.js version: 20.x or later (recommended)
- [ ] Build & deployment verified on staging before production

### Performance Baseline
- [ ] Child login latency: < 2 seconds
- [ ] Parent dashboard load: < 3 seconds
- [ ] Scenario save latency: < 1 second
- [ ] Lesson completion: < 1 second
- [ ] No slow queries or timeout errors in logs

---

## Incident Response Preparation

### Monitoring Setup
- [ ] Firebase Cloud Logging dashboard configured
- [ ] Alert: High error rate (>1% 5xx errors)
- [ ] Alert: Slow queries (latency > 5 seconds)
- [ ] Alert: Unauthorized access attempts
- [ ] Dashboard refreshed at: [frequency]

### Escalation Plan
- [ ] Pilot admin primary contact: [name, phone, email]
- [ ] Pilot admin backup contact: [name, phone, email]
- [ ] Developer on-call: [name, phone, email]
- [ ] Response time SLA: [hours]

### Rollback Plan
- [ ] Firestore backup schedule: [frequency]
- [ ] Last known good backup available: [date/time]
- [ ] Rollback procedure documented
- [ ] Rollback tested in staging: [date]

### Data Recovery Plan
- [ ] Child progress can be recovered: [method]
- [ ] Parent enrollments can be recovered: [method]
- [ ] Achievement badges can be recovered: [method]
- [ ] Recovery time estimate: [minutes]

---

## Post-Test Documentation

### Test Results Summary
```
Total Tests: ___
Passed: ___
Failed: ___
Blocked: ___
Deferred: ___

Critical Issues Found:
- Issue 1: [description, severity, owner]
- Issue 2: [description, severity, owner]

Non-Critical Issues Found:
- Issue 1: [description, priority, owner]
- Issue 2: [description, priority, owner]
```

### Sign-Off
- [ ] All critical tests passed
- [ ] All critical issues resolved or deferred with justification
- [ ] Admin team trained on incident response
- [ ] Monitoring configured and tested
- [ ] GO/NO-GO decision: ___________________
- [ ] Approved by: [name, date]

---

**This checklist must be completed and signed off before pilot launch.**

No partial sign-off or "pending verification" pilots allowed.

All conditions must be verified with evidence.
