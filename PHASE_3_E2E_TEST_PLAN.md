# TATI ChildSave MVP — Phase 3 End-to-End Test Plan

**Date**: October 13, 2026  
**Phase**: 3 — Manual End-to-End Validation  
**Status**: READY FOR EXECUTION

---

## PHASE 3 OBJECTIVE

Validate complete user journeys (ADMIN → PARENT → CHILD) and negative scenarios to establish operational readiness for controlled MVP pilot.

---

## PRE-TEST SETUP

### Environment Verification

- [ ] Firebase project configured (demo-tati)
- [ ] Firestore emulator running: `firebase emulators:start`
- [ ] Auth emulator running on port 9099
- [ ] Firestore emulator running on port 8080
- [ ] Application built: `npm run build`
- [ ] Application running locally: `npm run dev`
- [ ] Test user accounts provisioned (see fixtures)

### Test Devices

- [ ] Desktop browser (Chrome/Firefox, 1920x1080)
- [ ] Tablet (iPad/Android, ~1024x768)
- [ ] Mobile phone (Android, 375px width recommended)
- [ ] Network throttling tool (Chrome DevTools)

---

## TEST SCENARIO 1: ADMIN ACCOUNT PROVISIONING

**Objective**: Verify admin can create parent, family, and child accounts with proper authorization

### Test Case A1: Create Parent Account

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Log in as admin to Firebase Console | Admin dashboard loads | ☐ |
| 2 | Navigate to /admin/parents (if available) | Parent management page loads | ☐ |
| 3 | Create new parent account (John Doe, john@example.com) | Success message; parent created | ☐ |
| 4 | Verify parent in Firestore | Document in `families/*/parents/` collection | ☐ |
| 5 | Parent can login with email/password | Parent dashboard loads | ☐ |
| 6 | Parent sees no children assigned yet | "No children" message or empty list | ☐ |

**Notes**:
- If /admin/parents not available, use Firestore Console directly
- Parent should NOT be able to self-register; admin must create account
- Document structure: `{email, displayName, createdAt, role: 'parent'}`

### Test Case A2: Create Family Record

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Admin creates family (name: "Smith Family") | Family created in `families/` collection | ☐ |
| 2 | Assign parent (John Doe) to family | Parent listed as guardian | ☐ |
| 3 | Firestore document structure verified | Correct schema, parent ID referenced | ☐ |
| 4 | Admin creates second family (control group) | Second family created | ☐ |
| 5 | Parent can see only assigned family | One family in list (not second family) | ☐ |

### Test Case A3: Create Child Record

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Admin creates child in "Smith Family" (name: "Emma", age 9) | Child created in Firestore | ☐ |
| 2 | System generates TATI ID (e.g., TATI-2026-1001) | Unique ID assigned | ☐ |
| 3 | System generates 4-digit PIN (e.g., 1234) | PIN hashed (scrypt) and stored | ☐ |
| 4 | Admin provides credentials to parent | Email/SMS method used (TBD) | ☐ |
| 5 | Parent can see child in dashboard | Child listed with name, age, progress | ☐ |
| 6 | Cross-family access test: Can parent see child from other family? | NO (access denied or data not shown) | ☐ |

---

## TEST SCENARIO 2: PARENT LOGIN & DASHBOARD

**Objective**: Verify parent can log in securely and view assigned children/progress

### Test Case P1: Parent Successful Login

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Navigate to parent login page | Login form displayed | ☐ |
| 2 | Enter parent credentials (john@example.com, password) | Form validation passes | ☐ |
| 3 | Submit login form | Session cookie created; dashboard loads | ☐ |
| 4 | Check browser cookies | CHILD_SESSION cookie NOT present (parent-specific) | ☐ |
| 5 | Parent session cookie properties verified | httpOnly, secure, SameSite=lax | ☐ |

### Test Case P2: Parent Dashboard - View Children

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Parent dashboard loads | Shows assigned children (Emma age 9) | ☐ |
| 2 | Child card displays name, age, learning progress | All info visible and accurate | ☐ |
| 3 | Click on child to view details | Child profile/progress page loads | ☐ |
| 4 | View learning progress breakdown | Lessons completed, scenarios completed, assessments | ☐ |
| 5 | Progress bar or percentage shown | E.g., "3 of 5 scenarios complete" | ☐ |

### Test Case P3: Parent Dashboard - Error Recovery

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Dashboard is loading data (from network tab, slow down) | Loading spinner visible | ☐ |
| 2 | Simulate network failure (DevTools throttle) | Error message appears: "We couldn't load your family" | ☐ |
| 3 | Error state shows "Check your connection and try again" | Message is clear and friendly | ☐ |
| 4 | "Try Again" button visible | Button is clickable | ☐ |
| 5 | Network restored; click "Try Again" | Dashboard refetches and loads successfully | ☐ |
| 6 | No stale or unauthorized data shown | Previous error state cleared; correct data loaded | ☐ |

### Test Case P4: Parent Logout

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Click logout button on dashboard | Logout confirmation (optional) | ☐ |
| 2 | User redirected to login page | Session cleared | ☐ |
| 3 | Try to access parent dashboard directly | Redirect to login (not cached) | ☐ |
| 4 | Session cookie removed | Verify in browser dev tools | ☐ |

---

## TEST SCENARIO 3: CHILD LOGIN & LEARNING JOURNEY

**Objective**: Verify child can log in with TATI ID/PIN and complete a learning scenario with save feedback

### Test Case C1: Child Successful Login (TATI ID/PIN)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Navigate to child login page | TATI ID and PIN fields displayed | ☐ |
| 2 | Enter TATI ID (TATI-2026-1001) | Field accepts input | ☐ |
| 3 | Enter 4-digit PIN (1234) | PIN field masked (dots/asterisks) | ☐ |
| 4 | Click login button | Form submits; validation passes | ☐ |
| 5 | Child session created (secure cookie) | CHILD_SESSION cookie present | ☐ |
| 6 | Child dashboard loads | Shows available learning journeys/scenarios | ☐ |
| 7 | NO Firebase email/password login available | Only TATI ID/PIN method visible | ☐ |

### Test Case C2: Child Learning Journey - Lesson

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Click on first lesson in journey | Lesson content loads (e.g., "Money Basics") | ☐ |
| 2 | Read lesson content | Text, images, and interactive elements display | ☐ |
| 3 | Complete lesson (click "Next" or finish button) | Progress tracked locally | ☐ |
| 4 | No save feedback expected (lessons are read-only) | Progress saved server-side without UI | ☐ |

### Test Case C3: Child Learning Journey - Scenario

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Enter scenario gameplay | Scenario player loads with story/decision tree | ☐ |
| 2 | Make decisions in scenario | State updates; new content shown based on choices | ☐ |
| 3 | Simulate saving progress mid-scenario | **Saving indicator appears** (pulse, "⏳ Saving...") | ☐ |
| 4 | Wait for server response | **Saved indicator shows** (✓ "Progress saved", auto-hides 2s) | ☐ |
| 5 | Make more decisions; save again | Sequence: saving → saved → idle → saving (consecutive save) | ☐ |
| 6 | Verify correct state transitions | NOT: saved → idle → saved (wrong!) | ☐ |

### Test Case C4: Child Assessment - Save Feedback

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Enter assessment (e.g., "Money Quiz") | Assessment intro screen loads | ☐ |
| 2 | Answer questions (e.g., multiple choice) | Answers recorded locally | ☐ |
| 3 | Submit assessment | Saving state shown: "⏳ Submitting..." | ☐ |
| 4 | Wait for server response | **Saved state shown**: "✓ Assessment saved" | ☐ |
| 5 | Check score displayed | If applicable, show score and feedback | ☐ |
| 6 | Badge awarded (if applicable) | Certificate or achievement notification | ☐ |

### Test Case C5: Child Logout

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Click logout button | Logout confirmation or immediate redirect | ☐ |
| 2 | User returned to login page | Session cleared | ☐ |
| 3 | Try to access child dashboard directly | Redirect to login (not cached) | ☐ |

---

## TEST SCENARIO 4: PERSISTENCE VERIFICATION

**Objective**: Verify learning progress persists after logout/re-login

### Test Case P: Progress Persists

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Child logs out | Session cleared |
