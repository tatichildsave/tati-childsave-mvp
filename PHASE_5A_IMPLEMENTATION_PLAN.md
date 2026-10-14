# TATI ChildSave — Phase 5A: Implementation Plan

## Overview

This document provides the complete implementation plan for Phase 5A (Admin Family & Learner Provisioning), based on the comprehensive gap analysis of the existing codebase.

**Timeline**: Start immediately on feature branch  
**Status**: Planning phase complete, ready for implementation  
**Target**: Working admin provisioning dashboard for founding-family pilot

---

## Part 1: Gap Analysis Summary

### What's Already Built (Reuse)
✅ Secure PIN generation, hashing, and verification (`src/lib/auth/child-auth-firebase.server.ts`)  
✅ TATI ID generation (`generateTatiId()`)  
✅ Firebase Admin SDK configuration (`src/integrations/firebase/admin.server.ts`)  
✅ Existing Firestore schemas (families, children, users, credentials)  
✅ Family/member/child authorization rules in Firestore  
✅ Child session and credential storage pattern  
✅ Role-based authorization helpers  
✅ Child authentication tests  

### What Must Be Built
❌ Secure parent provisioning server function  
❌ Secure family provisioning server function  
❌ Admin-only child provisioning server function  
❌ PIN reset/rotation server function  
❌ Admin UI forms for parents, families, children  
❌ Atomic transaction for child + credential creation  
❌ TATI ID uniqueness enforcement  
❌ Credential issuance and display interface  
❌ End-to-end provisioning tests  

### Schema Decisions Required
1. **Naming consistency**: Consolidate between `tati_id`, `tatiId`, `pin_hash`, `pinHash`
2. **Custom claims vs. Firestore roles**: Use Firestore roles only (already implemented)
3. **Parent profile schema**: Decide if parents need dedicated collection or users-only
4. **Family member relationship**: Already exists but needs consistent admin provisioning approach

---

## Part 2: Security Requirements

Every admin operation must:
- Verify admin authorization on trusted server-side code
- Use Firebase Admin SDK only server-side
- Never expose secrets or PINs in client responses (except immediate display)
- Use timing-safe comparison for credentials
- Enforce family and child ownership relationships
- Validate inputs server-side (not just client-side)
- Prevent role escalation
- Maintain existing Firestore Security Rules guarantees
- Log provisioning operations (for audit)

---

## Part 3: Implementation Sequence

### Phase 5A.1: Server-Side Provisioning Functions (NEW)

**Objective**: Create secure, authorization-protected server functions for all provisioning operations.

**Files to Create**:
- `src/lib/backend/provisioning.functions.ts` - Callable provisioning functions
- `src/lib/backend/provisioning.server.ts` - Server-side provisioning logic (reusable)

**Functions to Implement**:

#### 1. Create Parent Account
```typescript
export const provisionParent = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    displayName: z.string(),
    phone?: z.string(),
  }))
  .handler(async ({ data }) => {
    // 1. Verify admin authorization
    // 2. Check email not already used
    // 3. Generate temporary password
    // 4. Create Firebase Auth user
    // 5. Create Firestore user document with role: "parent"
    // 6. Return { uid, email, temporaryPassword }
  })
```

#### 2. Create Family
```typescript
export const provisionFamily = createServerFn({ method: "POST" })
  .validator(z.object({
    name: z.string(),
    notes?: z.string(),
    parentUid: z.string(),
  }))
  .handler(async ({ data }) => {
    // 1. Verify admin authorization
    // 2. Verify parent exists and has "parent" role
    // 3. Create family document
    // 4. Create family/members/{parentUid} with role: "parent"
    // 5. Return { familyId, parentUid }
  })
```

#### 3. Create Child (Atomic)
```typescript
export const provisionChild = createServerFn({ method: "POST" })
  .validator(z.object({
    familyId: z.string(),
    name: z.string(),
    age: z.number().int().min(5).max(18),
    dateOfBirth?: z.string(),
  }))
  .handler(async ({ data }) => {
    // 1. Verify admin authorization
    // 2. Verify family exists
    // 3. Generate TATI ID (with uniqueness check/retry)
    // 4. Generate PIN
    // 5. Hash PIN
    // 6. ATOMIC TRANSACTION:
    //    a. Create child document
    //    b. Create childCredentials document
    // 7. Return { childId, tatiId, pin, familyId }
    //    (pin only shown once for provisioning)
  })
```

#### 4. Reset Child PIN
```typescript
export const resetChildPin = createServerFn({ method: "POST" })
  .validator(z.object({
    childId: z.string(),
    familyId: z.string(),
  }))
  .handler(async ({ data }) => {
    // 1. Verify admin authorization
    // 2. Verify child exists in family
    // 3. Generate new PIN
    // 4. Hash PIN
    // 5. Update childCredentials
    // 6. Return { childId, newPin }
  })
```

### Phase 5A.2: Remove Broken Cloud Functions

**Objective**: Eliminate Cloud Function calls that don't exist.

**Files to Modify**:
- `src/routes/admin/index.tsx`

**Changes**:
- Remove `handleCreateAdmin()` button and function call
- Remove `handleCreateFacilitator()` function and button
- Remove client-side Firebase Auth REST API calls
- Document that admin creation uses bootstrap script

### Phase 5A.3: Build Family Enrolment Workflow (UI)

**Objective**: Create 4-step UI workflow for enrolling families with one or more children.

**Files to Create**:
- `src/routes/admin/enroll/layout.tsx` - Enrolment workflow container
- `src/routes/admin/enroll/step-1-family.tsx` - Family details form
- `src/routes/admin/enroll/step-2-parent.tsx` - Parent provisioning form
- `src/routes/admin/enroll/step-3-children.tsx` - Child(ren) provisioning form
- `src/routes/admin/enroll/step-4-review.tsx` - Review and confirm

**Step 1 — Family Details**:
- Family name (required)
- Optional notes
- Enrolment date (auto-filled today)
- Validation on next

**Step 2 — Parent Details**:
- Full name (required)
- Email address (required, validated, check duplicates)
- Phone number (optional)
- First-time password setup method (show options)
- Call `provisionParent()` on next

**Step 3 — Children** (Multi-child support):
- For each child:
  - Full name (required)
  - Date of birth OR age (required)
  - Programme level (Junior only initially)
  - Add Another Child button
- Display generated TATI ID and PIN for each child (read-only)
- Call `provisionChild()` for each on next

**Step 4 — Review and Confirm**:
- Display family summary
- Display parent details (email, no password shown)
- Display each child: name, TATI ID, PIN
- Confirmation button triggers final submission
- Success screen shows credentials download/print options

### Phase 5A.4: Build Management Interfaces (UI)

**Objective**: Add sections to admin dashboard for viewing/managing families, parents, and children.

**Files to Create**:
- `src/routes/admin/families/index.tsx` - Families list and search
- `src/routes/admin/families/[familyId].tsx` - Family detail/edit page
- `src/routes/admin/parents/index.tsx` - Parents list
- `src/routes/admin/children/index.tsx` - Children list and search

**Families Section**:
- List all families with: name, parent(s), child count, enrolment date
- Search by family name or ID
- Click to open family detail page
- Family detail shows:
  - Family info (editable: name, notes)
  - Linked parents
  - Children list (with add-child button)
  - Edit/delete buttons (with confirm)

**Parents Section**:
- List all parents with: email, families assigned, status
- Search by email
- Show account status
- Password reset button
- Edit profile button
- Prevent deletion (archive instead)

**Children Section**:
- List all children with: name, TATI ID, family, age, status
- Search by name or TATI ID
- Click to view child detail:
  - Name, age, family, learning progress
  - Reset PIN button (requires confirm)
  - Edit profile (name, age only)
  - Learning journey progress (read-only)

### Phase 5A.5: Credential Issuance

**Objective**: Provide secure way to deliver credentials after successful provisioning.

**Implementation**:

For **Parents**:
- Option 1: Email (if email integration exists)
- Option 2: Download PDF with email and temporary password reset link
- Option 3: Print from browser

For **Children**:
- TATI ID and PIN shown only once during provisioning
- Display on screen with "Copy to clipboard" buttons
- Offer "Print credentials card" option
- Offer "Download QR code" option (for future mobile app)
- Parent can request PIN reset from their dashboard (Phase 5B)

**Do NOT**:
- Store plaintext PIN anywhere after provisioning
- Send PIN by email
- Expose PIN in API responses
- Log PIN to browser console or server logs

### Phase 5A.6: Firestore Schema Cleanup

**Files to Modify**:
- `firestore.rules` (if needed)
- `src/integrations/firebase/firestore-types.ts` (schema documentation)

**Schema Decisions**:
1. Child documents use consistent field names: `tatiId`, `pinHash` (not `tati_id`, `pin_hash`)
2. Parent documents: use `/users/{uid}` collection with `roles: ["parent"]`
3. Family member: `/families/{familyId}/members/{parentUid}` with `role: "parent"`
4. Credentials: `/childCredentials/{tatiId}` immutable, server-only

**No Migration Required**: Existing data structures are compatible; just ensure new provisioning writes consistent names.

### Phase 5A.7: Testing

**Files to Create**:
- `tests/provisioning/admin-provisioning.test.ts` - End-to-end provisioning
- `tests/provisioning/admin-authorization.test.ts` - Authorization enforcement

**Test Cases**:

1. **Success Paths**:
   - Provision parent successfully
   - Provision family with one child
   - Provision family with three children
   - Verify child can login with generated TATI ID/PIN
   - Verify parent can login with provisioned credentials
   - Reset child PIN successfully
   - Verify parent can view only their children

2. **Authorization Failures**:
   - Non-admin cannot provision parent
   - Non-admin cannot provision family
   - Parent cannot provision child
   - Child cannot provision anything
   - Unauthenticated user cannot provision anything

3. **Validation Failures**:
   - Duplicate email rejected
   - Invalid email rejected
   - Missing required fields rejected
   - Invalid age rejected

4. **Data Integrity**:
   - TATI ID is unique
   - PIN hash uses scrypt correctly
   - Child/parent/family relationships preserved
   - No orphaned documents on partial failures

5. **Existing Functionality**:
   - Existing parent login works (not broken)
   - Existing child login works (not broken)
   - Existing learning journey not affected
   - Existing assessment completion not affected

### Phase 5A.8: Documentation

**Files to Create**:
- `ADMIN_PROVISIONING_GUIDE.md` - How to enrol families (admin user guide)
- `PROVISIONING_API.md` - Server function specification (for developers)
- `PROVISIONING_SECURITY.md` - Security assumptions and threat model

### Phase 5A.9: Deployment Checklist

- [ ] Feature branch created and reviewed
- [ ] All tests pass (unit + integration + authorization)
- [ ] Production build succeeds
- [ ] No TypeScript errors
- [ ] No console warnings/errors in browser
- [ ] Firebase rules remain unchanged or reviewed
- [ ] Firestore indexes verified (if needed)
- [ ] Server functions deploy without error
- [ ] Bootstrap script still works
- [ ] Manual testing complete (enrol test family)
- [ ] Rollback plan documented
- [ ] Commits ready for review
- [ ] GitHub PR ready for merge approval

---

## Part 4: Implementation Order (Do This)

Execute in this sequence:

1. **Weeks**: Create feature branch `phase-5a/admin-provisioning`
2. **Phase 5A.1**: Server-side provisioning functions (3-4 hours)
   - Test functions with Firestore emulator
   - Verify authorization gates work
3. **Phase 5A.2**: Remove broken Cloud Functions (30 min)
4. **Phase 5A.3**: Build enrolment workflow UI (4-5 hours)
   - Step forms
   - State management
   - Credential display
5. **Phase 5A.4**: Build management interfaces (3-4 hours)
   - Family/parent/child lists
   - Search and detail pages
   - Edit/delete actions
6. **Phase 5A.5**: Credential issuance (1-2 hours)
   - PDF generation
   - QR code generation
   - Download/print options
7. **Phase 5A.6**: Schema cleanup (1 hour)
   - Update types
   - Update documentation
8. **Phase 5A.7**: Write tests (2-3 hours)
   - Provisioning flow tests
   - Authorization tests
   - Login verification
9. **Phase 5A.8**: Documentation (1-2 hours)
   - Admin guide
   - API docs
   - Security assumptions
10. **Phase 5A.9**: Deployment checklist (1 hour)
    - Verify everything
    - Prepare for merge

**Total Estimated Effort**: 16-22 hours  
**Can be parallelized**: UI work (5A.3-4) while testing (5A.7) proceeds

---

## Part 5: Success Criteria

✅ **Technical**:
- Admin can enrol a family through the UI
- Admin can provision multiple children
- Parent receives email with sign-in link
- Parent logs in successfully
- Child logs in with TATI ID + PIN successfully
- Parent sees only their children
- Admin can reset child PIN
- All tests pass

✅ **Security**:
- Non-admins cannot access provisioning UI
- PINs are never exposed except during provisioning
- Credentials are hashed with scrypt
- Family/child relationships enforced
- No SQL injection, no privilege escalation
- All Firestore rules remain effective

✅ **User Experience**:
- Enrolment workflow is clear and intuitive
- Error messages are helpful
- Credentials are easily accessible
- Mobile responsive
- No unnecessary clicks

✅ **Code Quality**:
- TypeScript strict mode passes
- ESLint clean
- Tests have good coverage
- No commented-out code
- Consistent formatting

---

## Part 6: Known Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Email delivery not configured | HIGH | Document assumption; offer fallback PDF/print |
| Accidental duplicate parent creation | MEDIUM | Check email before provisioning; show existing parents |
| PIN not truly random on older Node | LOW | Verify crypto module version; add test |
| Firestore transaction fails partially | LOW | Test with emulator; implement compensation logic |
| Admin accidentally deletes prod data | MEDIUM | Backup procedures verified; require confirmation on delete |
| Performance with many families | LOW | Add indexes; test with 1000+ families |
| Browser back button breaks workflow | LOW | Use state management; disable back during submission |

---

## Part 7: Roll Back Plan

If Phase 5A needs to roll back:

1. **Delete feature branch**: `git branch -D phase-5a/admin-provisioning`
2. **Revert to main**: All production data unchanged (Firebase backup exists)
3. **Keep bootstrap script**: Existing admin can still create first admin manually
4. **Manual provisioning**: Use Firebase Console to create families/children (not ideal but functional)

No data migration required; all existing structures remain compatible.

---

## Part 8: Next Steps (After Phase 5A)

### Phase 5B (Post-Pilot):
- Parent PIN reset from parent dashboard
- Bulk import/export for families and children
- Credential rotation/expiry policies
- Audit logging for provisioning operations
- Family onboarding email sequence

### Phase 5C (Post-Pilot+):
- School-level admin (multiple admins per school)
- Facilitator accounts and cohort management
- Child progress reporting
- Batch child deletion
- Archive vs. delete policies

---

## Summary

Phase 5A provides the minimum admin provisioning capability required for a controlled pilot with founding families. It reuses existing secure Firebase infrastructure for child authentication while adding the missing UI and server functions for complete family enrolment. The implementation prioritizes security, simplicity, and testability.

**Status**: Ready to start implementation.  
**Branch**: `phase-5a/admin-provisioning`  
**Approval**: Required before merge to main.
