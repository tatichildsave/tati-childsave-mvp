# TATI Authentication + Family Enrollment Redesign: Audit Summary

**Date**: 2026-10-02  
**Phase**: READ-ONLY AUDIT (No code changes made)  
**Auditor**: Comprehensive codebase review  
**Status**: AUDIT COMPLETE — Ready for Target Architecture Alignment

---

## CURRENT ARCHITECTURE

### What Exists Today

The TATI system has **successfully migrated to Firebase** for all authentication and authorization paths. The architecture is production-grade and follows security best practices.

#### 1. **Parent Authentication (Firebase-Based)**

**Signup/Login Flow**:

- Parent enters email + password
- Firebase Auth creates/verifies user
- Server generates HTTP-only session cookie (Firebase Web SDK + custom session)
- Session TTL: **5 days**
- Authorization: Derived from Firebase UID stored in session cookie

**Files**:

- [src/routes/(public)/signup.tsx](<src/routes/(public)/signup.tsx>)
- [src/routes/(public)/login.tsx](<src/routes/(public)/login.tsx>)
- [src/lib/backend/firebase/parent-auth.server.ts](src/lib/backend/firebase/parent-auth.server.ts)

**Flow**:

```
Parent Email/Password → Firebase Auth → ID Token →
Server Verification → Session Cookie (HTTP-only) →
Parent Portal (/parent)
```

#### 2. **Child Authentication (TATI ID + PIN)**

**Login Flow**:

- Child enters TATI ID (e.g., `TATI-3B281288`) + 4-digit PIN
- Server verifies credentials against `/childCredentials/{tatiId}`
- PIN compared using scrypt hash (N=16384)
- Creates ChildSession in Firestore
- Sets HTTP-only session cookie
- Session TTL: **30 minutes** (no auto-refresh)

**Files**:

- [src/routes/child/login.tsx](src/routes/child/login.tsx)
- [src/lib/auth/child-auth.functions.ts](src/lib/auth/child-auth.functions.ts)
- [src/lib/auth/child-auth-firebase.server.ts](src/lib/auth/child-auth-firebase.server.ts)

**Flow**:

```
Child TATI ID + PIN → Server Verification → Firestore
/childCredentials/{tatiId} → PIN Hash Match →
ChildSession Created → Session Cookie → Child Journey
```

#### 3. **Parent-Child Relationship (Firestore-Based)**

**Current Model**:

Parent account created → **Automatically creates family** → Parent manually adds children via onboarding

```
/users/{parentUid}
  roles: ["parent"]
  ├─ /familyMemberships/{familyId}
  │   └─ status: "active"
  │
/families/{familyId}
  createdBy: parentUid
  ├─ /members/{parentUid}
  │   └─ role: "parent", status: "active"
  │
  └─ /children/{childId}
      ├─ id: UUID
      ├─ tati_id: "TATI-XXXXXXXX"
      ├─ familyId: familyId (reference)
      ├─ created_by: parentUid
      ├─ name, age, avatar
      └─ onboarding_step: 0-6
```

**How Children Are Created**:

1. Parent visits `/onboarding`
2. Multi-step wizard (7 steps):
   - Welcome
   - Child name
   - Child age (8-12)
   - Avatar selection
   - Meet TATI intro
   - Journey preview
   - Start button
3. On completion: `createChildProfile()` called
   - Generates TATI ID
   - Generates 4-digit PIN
   - Creates `/families/{familyId}/children/{childId}`
   - Saves credential in `/childCredentials/{tatiId}`
4. Redirects to pre-assessment

**Key Issue (vs. Spec)**:
❌ Parents currently **create children themselves** via onboarding  
❌ No explicit "TATI admin provisioning" step  
❌ No separation between "parent account creation" and "child enrollment submission"

#### 4. **Authorization & Access Control (Firestore Rules)**

**Parent Authorization**:

- Can access only their own family's children
- Firestore rules check: Parent UID matches `/families/{familyId}/members/{uid}` with status="active"
- Server functions call `ensureFamily()` to get parent's single family
- All child access calls `assertChildInFamily(childId)` to verify relationship

**Child Authorization**:

- Can access only their own profile + session data
- Firestore rules deny `/childCredentials/*` to all clients (server-only)
- Firestore rules deny `/families/{familyId}/children/{childId}/sessions/*` to all clients
- Server validates child session on every protected request

**Admin Authorization**:

- Role stored in `/users/{uid}.roles` array: ["admin"]
- Admin can bypass family isolation rules
- Admin login: [src/routes/(public)/admin-login.tsx](<src/routes/(public)/admin-login.tsx>)

**Files**:

- [firestore.rules](firestore.rules) — Security rules enforcement
- [src/lib/auth/authorization.server.ts](src/lib/auth/authorization.server.ts) — Server-side checks

#### 5. **Admin & Provisioning (Minimal)**

**Current Provisioning Model**:

- No visible admin UI for provisioning children
- Children created by parents via onboarding
- No admin approval workflow

**Admin Login** (exists but minimal):

- Email + password authentication via Firebase
- Checks `/users/{uid}.roles` for "admin" role
- Redirects to `/admin` (limited functionality visible)

**Child Credential Generation** (automatic):

- When child created by parent: TATI ID + PIN auto-generated
- TATI ID: 8-char hex code
- PIN: 4-digit code
- Stored in `/childCredentials/{tatiId}` with scrypt hash of PIN
- ❓ How are credentials communicated to parent/child? (Not clearly documented)

#### 6. **Firestore Data Model (Complete)**

**Collections**:

| Path                                                           | Purpose                   | Access                                                 |
| -------------------------------------------------------------- | ------------------------- | ------------------------------------------------------ |
| `/users/{uid}`                                                 | Parent/admin profiles     | Self or admin                                          |
| `/users/{uid}/familyMemberships/{familyId}`                    | Parent-family link        | Self or admin                                          |
| `/families/{familyId}`                                         | Family metadata           | Family members or admin                                |
| `/families/{familyId}/members/{uid}`                           | Family membership records | Family members or admin                                |
| `/families/{familyId}/children/{childId}`                      | Child profile             | Parent/guardian or admin                               |
| `/families/{familyId}/children/{childId}/journeyProgress/*`    | Learning data             | Parent/facilitator/admin (client reads, server writes) |
| `/families/{familyId}/children/{childId}/competencies/*`       | Skill tracking            | Parent/facilitator/admin (server-only writes)          |
| `/families/{familyId}/children/{childId}/sessions/{sessionId}` | Child sessions            | Server-only (client access denied by rules)            |
| `/childCredentials/{tatiId}`                                   | Credentials               | Server-only (client access denied by rules)            |

#### 7. **Supabase Dependencies (Partial)**

**Status**: 95% migrated to Firebase; Supabase used for **non-critical** operations only.

**Still Using Supabase**:

- Analytics events
- Feedback submissions
- Legacy progress queries
- Scenario decision logging

**Not in Auth Path**: None of these affect authentication, authorization, or session management.

**Files with Supabase**:

- [src/lib/analytics.ts](src/lib/analytics.ts) — Telemetry
- [src/lib/feedback.ts](src/lib/feedback.ts) — User feedback
- [src/lib/learning/progress.ts](src/lib/learning/progress.ts) — Legacy progress
- [src/lib/scenario/session.ts](src/lib/scenario/session.ts) — Scenario decisions

---

## TARGET ARCHITECTURE

### What Needs to Change (Per Specification)

The specification defines a **parent provisioning model** where:

1. **Parents do NOT create children** in-app
2. **TATI admin performs all provisioning** (create child, assign to parent, generate credentials)
3. **Parent enrollment form** is separate from account creation
4. **Admin provides credentials** to parent/child through official TATI workflow

#### Comparison: Current vs. Target

| Aspect                      | Current                          | Target                     | Status       |
| --------------------------- | -------------------------------- | -------------------------- | ------------ |
| **Parent Account Creation** | Self-service signup              | Self-service signup        | ✅ Same      |
| **Parent Enrollment Form**  | ❌ Does not exist                | ✅ Official TATI form      | ❌ Missing   |
| **Child Creation**          | ❌ Parent creates via onboarding | ✅ TATI admin creates      | ❌ Different |
| **Credential Generation**   | ✅ Automatic at creation         | ✅ Automatic at creation   | ✅ Same      |
| **Credential Distribution** | ❓ Unclear                       | ✅ Via TATI staff          | ⚠️ Unclear   |
| **Parent-Child Assignment** | ❌ Automatic (one-to-one family) | ✅ TATI admin controlled   | ❌ Different |
| **Admin Provisioning UI**   | ❌ Does not exist                | ✅ Required                | ❌ Missing   |
| **Parent Dashboard**        | ✅ Shows assigned children       | ✅ Shows assigned children | ✅ Same      |
| **Child Session TTL**       | ✅ 30 minutes                    | ✅ 30 minutes              | ✅ Same      |
| **Firestore Rules**         | ✅ Family isolation              | ✅ Family isolation        | ✅ Same      |

### Key Architectural Shifts

#### 1. **Separate Enrollment from Account Creation**

**Current**:

```
Parent signs up → Family created → Child enrollment wizard → Child created
```

**Target**:

```
Parent signs up → Family created (empty state shown)
↓
[TATI admin offline process]
  └─ Parent submits enrollment form
  └─ TATI staff reviews
  └─ TATI staff creates child
  └─ TATI staff assigns to family
  └─ TATI staff distributes credentials
↓
Parent logs in → See assigned child → Child can login with TATI ID + PIN
```

#### 2. **Move Child Creation to Admin**

**Current**: Parent portal → "Add Child" → Onboarding → Child created  
**Target**: Admin dashboard → "Create Child" → Link to parent → Credentials issued

#### 3. **Parent Sees Empty State Until Child Assigned**

**Current**: N/A (parent creates child immediately)  
**Target**: After parent login, if no children assigned, show:

```
"Your child's enrollment is being processed by our team.
We'll notify you when they're ready to start."
```

#### 4. **Credential Communication**

**Current**: ❓ Unclear  
**Target**:

- ✅ Admin UI shows "Copy Credentials" button
- ✅ Admin generates password-protected PDF or email
- ✅ Credentials only shown once (to prevent tampering)

---

## MIGRATION PLAN

### Which Files/Components Will Change

#### Phase 1: Remove Child Creation from Parent Portal

**Files to Modify**:

1. **[src/routes/onboarding.tsx](src/routes/onboarding.tsx)**
   - ❌ Delete parent-initiated child creation flow
   - ❌ Remove `createChildProfile()` call
   - ✅ Keep if repurposed for child pre-assessment setup (post-provisioning)

2. **[src/lib/family.ts](src/lib/family.ts)**
   - ❌ Remove or gate `useCreateChildProfile()` hook (admin-only)
   - ✅ Keep `useChildProfiles()` for reading children

3. **[src/routes/parent/index.tsx](src/routes/parent/index.tsx)**
   - ✅ Keep existing "My Family" view
   - ❌ Remove "Add Child" button
   - ✅ Add empty state message when no children assigned

#### Phase 2: Create Admin Provisioning UI

**New Files to Create**:

1. **[src/routes/admin/children/create.tsx](src/routes/admin/children/create.tsx)**
   - Child creation form (name, age, avatar, parent assignment)
   - Calls admin server function to create child
   - Shows generated TATI ID + PIN
   - Option to export/email credentials

2. **[src/routes/admin/children/list.tsx](src/routes/admin/children/list.tsx)**
   - Table of all children
   - Filter by family/parent
   - Edit, revoke, or resend credentials

3. **[src/routes/admin/families/list.tsx](src/routes/admin/families/list.tsx)**
   - Table of families
   - View enrolled parents
   - View assigned children
   - Manually assign children to families if needed

4. **[src/lib/admin/provisioning.server.ts](src/lib/admin/provisioning.server.ts)**
   - `adminCreateChild(familyId, input)`: Create child + credentials
   - `adminAssignChild(childId, familyId)`: Assign to family
   - `adminGetCredentials(childId)`: Retrieve credentials (one-time view)
   - `adminRevokeChild(childId)`: Revoke access

#### Phase 3: Create Parent Enrollment Form

**New Files to Create**:

1. **[src/routes/enroll.tsx](src/routes/enroll.tsx)**
   - Official TATI enrollment form (public route)
   - Collects: Parent name, email, phone, number of children, child names/ages
   - Submits to Firestore collection: `/enrollmentSubmissions/{submissionId}`
   - Shows confirmation message: "Thank you! We'll review and contact you soon."

2. **[src/integrations/firestore/enrollment.ts](src/integrations/firestore/enrollment.ts)**
   - `submitEnrollment(formData)`: Save submission to Firestore
   - Server function with rate limiting and spam protection

#### Phase 4: Update Firestore Model

**Firestore Changes** (data model extensions, no breaking changes):

1. **Add to `/families/{familyId}`**:

   ```typescript
   enrollmentSource: "self-signup" | "admin-provisioned" | "enrollment-form";
   enrollmentSubmissionId: string | null; // Link to /enrollmentSubmissions/{id}
   status: "provisioning" | "active" | "disabled";
   ```

2. **Add to `/families/{familyId}/children/{childId}`**:

   ```typescript
   provisioned_by: string; // Admin UID who created this child
   provisioned_at: Timestamp;
   credentialsSentAt: Timestamp | null;
   credentialsRevealedAt: Timestamp | null;
   ```

3. **New Collection `/enrollmentSubmissions/{submissionId}`**:
   ```typescript
   {
     parentName: string,
     parentEmail: string,
     phoneNumber: string,
     numberOfChildren: number,
     childrenInfo: { name: string, age: number }[],
     status: "pending" | "reviewed" | "provisioned" | "rejected"
     submittedAt: Timestamp,
     reviewedBy: string | null  // Admin UID
     reviewedAt: Timestamp | null,
     notes: string | null,
   }
   ```

#### Phase 5: Update Routes & Navigation

**Routes to Modify/Create**:

| Route                    | Action           | Purpose                                |
| ------------------------ | ---------------- | -------------------------------------- |
| `/enroll`                | Create           | Public enrollment form                 |
| `/login`                 | Keep             | Parent account login (unchanged)       |
| `/signup`                | Keep             | Parent account creation (unchanged)    |
| `/parent`                | Modify           | Add empty state if no children         |
| `/admin/children/create` | Create           | Admin: Create child                    |
| `/admin/children/list`   | Create           | Admin: Manage children                 |
| `/admin/families`        | Create           | Admin: Manage families                 |
| `/child/login`           | Keep             | Child TATI ID + PIN login (unchanged)  |
| `/onboarding`            | Modify or Delete | Remove parent-initiated child creation |

#### Phase 6: Security Rule Updates

**[firestore.rules](firestore.rules) Changes**:

1. **Add admin-only collection rule** for enrollment submissions:

   ```firestore
   match /enrollmentSubmissions/{submissionId} {
     allow read, write: if isAdmin();
   }
   ```

2. **Restrict child creation** to admin SDK:

   ```firestore
   match /families/{familyId}/children/{childId} {
     allow create: if false;  // Admin SDK only
     allow update: if /* parent/facilitator ownership checks */
   }
   ```

3. **Restrict credential writes** to admin SDK:
   ```firestore
   match /childCredentials/{tatiId} {
     allow write: if false;  // Admin SDK only
   }
   ```

#### Phase 7: Server Functions to Add

**Files to Create/Modify**:

1. **[src/lib/admin/provisioning.functions.ts](src/lib/admin/provisioning.functions.ts)** (new)
   - `adminCreateChild()`: Server function only (requires admin role)
   - `adminAssignChild()`: Server function only
   - `adminGetChildCredentials()`: Server function only (one-time reveal)
   - `adminRevokeCredential()`: Server function only

2. **[src/lib/backend/firebase/family.functions.ts](src/lib/backend/firebase/family.functions.ts)** (modify)
   - ❌ Remove `createChildProfile()` if it exists
   - ✅ Add admin-only versions

---

## RISKS & CONSIDERATIONS

### Architectural Risks

#### 1. **Backward Compatibility Break** (MEDIUM RISK)

**Issue**: Existing parents with self-created children must be preserved  
**Mitigation**:

- Migrate existing children: Run script to mark them as `enrollmentSource: "self-signup"`
- Existing parents can still see their children (no access removal)
- New children require admin provisioning

#### 2. **Parent Communication Gap** (HIGH RISK)

**Issue**: Parents won't know how to submit enrollment or access credentials  
**Mitigation**:

- Create clear communication plan (email, website banner, FAQ)
- Provide direct link to `/enroll` form
- Admin sends credentials via secure method (email with one-time link or PDF)
- Set parent expectations during initial signup

#### 3. **Credential Leakage Risk** (MEDIUM RISK)

**Issue**: Displaying TATI ID + PIN in admin UI could leak if session compromised  
**Mitigation**:

- Show credentials only once (hide after first copy/view)
- Log all credential views (audit trail)
- Require admin re-authentication to view credentials
- Provide secure email/SMS delivery options

#### 4. **Facilitator Assignment Not Yet Designed** (LOW RISK)

**Issue**: Spec mentions facilitators can be assigned to children, but no workflow exists  
**Current State**: Rules support `facilitatorUids` array in child document  
**Action**: Keep current support; design facilitator assignment in Phase 2+

#### 5. **Multi-Parent Families Not Supported** (LOW RISK)

**Issue**: Spec suggests "families" might have multiple adults, but current model is single-parent  
**Current State**: Rules support multi-member families (`members/{uid}` with roles)  
**Action**: Infrastructure exists; UI/workflows not yet built

### Security Risks Mitigated

✅ **No client-side identity spoofing**: Admin creates children, client cannot change family/role  
✅ **No credential forgery**: PIN hashing with scrypt; server-side verification only  
✅ **No cross-family access**: Firestore rules enforce path-based isolation  
✅ **No unauthorized provisioning**: Child creation requires admin role (verified server-side)

### Data Migration Risks

**If Merging Existing & New Model**:

- Existing self-created children must be preserved
- Mark enrollment source to track origin
- No data loss during transition
- Recommend: Soft transition (both models work for 1-2 weeks)

---

## CRITICAL GAPS vs. SPECIFICATION

### Missing / Not Yet Implemented

| Requirement                               | Current                          | Status       |
| ----------------------------------------- | -------------------------------- | ------------ |
| **Parent Enrollment Form**                | ❌ Does not exist                | ❌ Not built |
| **Admin Provisioning UI**                 | ❌ Does not exist                | ❌ Not built |
| **Admin Child Creation Workflow**         | ❌ Parents create via onboarding | ❌ Not built |
| **Credential Communication**              | ❓ Unclear/not specified         | ⚠️ Partial   |
| **Empty State for Unprovisioned Parents** | ❌ Not shown                     | ❌ Not built |
| **Facilitator Assignment Workflow**       | ⚠️ Rules support but no UI       | ⚠️ Partial   |
| **Multi-Parent Family Support**           | ⚠️ Rules support but no UI       | ⚠️ Partial   |

### What's Already Correct

✅ Parent authentication (Firebase + HTTP-only sessions)  
✅ Child authentication (TATI ID + PIN)  
✅ Session management (5-day parent, 30-min child TTL)  
✅ Authorization (family isolation, role-based access)  
✅ Firestore security rules (path-based scoping)  
✅ Credential storage (server-only, hashed PINs)  
✅ Child profile structure (TATI ID, age, avatar, etc.)

---

## NEXT STEPS

### Recommended Implementation Order

1. **Create Parent Enrollment Form** (`/enroll` route + `/enrollmentSubmissions` collection)
2. **Create Admin Provisioning UI** (admin child creation + credential management)
3. **Update Parent Portal** (empty state, hide "Add Child")
4. **Remove Parent-Initiated Child Creation** (gate or delete onboarding flow)
5. **Update Firestore Rules** (restrict child/credential writes to admin SDK)
6. **Add Server Functions** (admin provisioning functions)
7. **Data Migration** (mark existing children with enrollment source)
8. **Testing** (parent enrollment → admin provisioning → child login flow)

### Verification Checklist

- [ ] Parent cannot create children via onboarding
- [ ] Parent sees empty state if no children assigned
- [ ] Admin can create child and see TATI ID + PIN
- [ ] Credentials cannot be viewed twice (hidden after first view)
- [ ] Parent cannot access another family's child
- [ ] Child can login with TATI ID + PIN
- [ ] Child cannot change identity via URL manipulation
- [ ] Firestore rules prevent client-side child/credential writes

---

## CONCLUSION

**Current State**: Production-ready Firebase authentication architecture, mostly Firebase-migrated, security-sound.

**Target State**: Parent provisioning model with admin-controlled child creation and enrollment form.

**Migration Complexity**: Medium (requires new UI/workflows, no breaking changes to auth layer).

**Security Posture**: High (rules exist, audit good, risks manageable with documented mitigations).

**Ready for Implementation**: ✅ Yes — Proceed to architecture alignment and code changes.
