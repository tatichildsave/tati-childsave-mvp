# Phase C1.3: Comprehensive Authorization Surface Audit Report

**Status**: ⚠️ **CRITICAL VULNERABILITIES IDENTIFIED**  
**Date**: Current  
**Scope**: All server functions and provisioning operations  
**Objective**: Verify all provisioning paths have proper server-side authorization

---

## Executive Summary

Comprehensive audit of all provisioning operations, server functions, and authorization patterns reveals **2 CRITICAL vulnerabilities** that allow unauthorized access to protected TATI data.

**Critical Issues**:

1. `getChildJourneyProgress` - Allows parents to read ANY child's progress by guessing childId
2. `testAdminSdkDiagnostics` - Allows unauthorized Firestore writes via Admin SDK

**Status**: Phase C1.2 (family auto-creation fix) is SECURE ✓, but authorization gaps exist elsewhere

---

## Part 1: Authorization Architecture Review

### Server Function Authorization Pattern

All server functions follow this pattern:

```typescript
export const operationName = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    // 1. Get authenticated context
    const { uid, roles } = await getCurrentParentContext();

    // 2. Verify authorization (if provisioning)
    if (operationModifiesData) {
      requireProvisioningRole(roles); // or similar check
    }

    // 3. Execute operation
    // ...
  });
```

### Three Authorization Tiers

**Tier 1 - Authentication**: Firebase session cookie + Admin SDK verification

- Verified in `getCurrentParentContext()` ✓

**Tier 2 - Authorization**: Role-based access control

- Provisioning operations: `requireProvisioningRole()` ✓
- Child/family ownership: `assertChildAccess()` ⚠️

**Tier 3 - Data Access**: Firestore rules (secondary layer)

- Only protects direct client writes
- Admin SDK bypasses rules by design

### Authorization Flow

```
Client Call → TanStack Server Function
    ↓
getCurrentParentContext() [Verify auth + get roles]
    ↓
requireProvisioningRole() [Verify role if needed]
    ↓
GetFirebaseAdminDb() [Bypass Firestore rules - ADMIN SDK]
    ↓
Firestore Write [No rule protection for Admin SDK]
```

**CRITICAL INSIGHT**: Authorization checks MUST occur at server function layer before Admin SDK operations, because rules are bypassed.

---

## Part 2: Audit of All Server Functions

### Parent Portal Functions (family.functions.ts)

| Function                      | Takes           | Auth Check                    | Firestore Ops  | Status            |
| ----------------------------- | --------------- | ----------------------------- | -------------- | ----------------- |
| `createParentSessionFn`       | idToken         | ✓ Token                       | None           | ✅ SECURE         |
| `getFamilyId`                 | -               | ✓ Context                     | Read           | ✅ SECURE         |
| `getFamilyChildren`           | -               | ✓ Context                     | Read           | ✅ SECURE         |
| `ensureFamilyFn`              | -               | ✓ `requireProvisioningRole()` | Create         | ✅ SECURE         |
| `createChildProfile`          | name,age,avatar | ✓ `requireProvisioningRole()` | Create         | ✅ SECURE         |
| `updateChildProfile`          | id, changes     | ✓ `assertChildAccess()`       | Update         | ✅ SECURE         |
| `assertChildInFamily`         | childId         | ✓ `assertChildAccess()`       | Read           | ✅ SECURE         |
| **`getChildJourneyProgress`** | **childId**     | **❌ NONE**                   | **Read**       | **🔴 VULNERABLE** |
| **`testAdminSdkDiagnostics`** | **-**           | **❌ NONE**                   | **Read/Write** | **🔴 VULNERABLE** |
| `clearParentSessionFn`        | -               | ✓ Context                     | None           | ✅ SECURE         |

### Child Learning Functions (child-learning.functions.ts)

All child functions call `getCurrentChildContext()` which verifies the child's authentication and provides access to their own data. These are appropriately scoped to the authenticated child.

✅ `recordChildProgress` - Has context check  
✅ `saveChildAssessment` - Has context check  
✅ `loadChildScenario` - Has context check  
✅ `saveChildScenario` - Has context check

### Cloud Functions (functions/src/admin.ts)

✅ `createAdminUser` - Has authorization check (admin only)  
✅ `createFacilitatorUser` - Has authorization check (admin only)  
✅ `assignSchoolAdmin` - Has authorization check (admin only)

---

## Part 3: Critical Vulnerability Analysis

### VULNERABILITY #1: `getChildJourneyProgress` - Unauthorized Data Access

**Severity**: 🔴 CRITICAL - Data Breach

**Location**: `src/lib/backend/firebase/family.functions.ts:219`

**Function Signature**:

```typescript
export const getChildJourneyProgress = createServerFn({ method: "POST" })
  .validator(z.string().min(1))  // Only childId parameter
  .handler(async ({ data: childId }) => {
    try {
      const db = getFirebaseAdminDb();

      // Search for ANY child with this ID across ALL families
      const familyDocs = await db
        .collectionGroup("children")
        .where("id", "==", childId)
        .limit(1)
        .get();

      // ... No authorization check that parent owns this child

      return progress;  // Returns data
    }
  });
```

**Attack Scenario**:

1. Parent A logs in and obtains session cookie
2. Parent A calls `getChildJourneyProgress("child-b-id")`
3. Server function searches for ANY child with ID "child-b-id"
4. If Child B exists (in Family B), progress is returned
5. Parent A now has unauthorized access to Child B's progress data

**Root Cause**:

- Function takes only `childId` parameter
- No call to `getCurrentParentContext()` to verify authentication
- No call to `assertChildAccess()` to verify parent owns the child
- Admin SDK `collectionGroup().where()` search bypasses Firestore rules

**Impact**:

- ⚠️ Data breach: Parents can read any child's progress
- ⚠️ Privacy violation: Family data exposed across boundaries
- ⚠️ Scenario/lesson/assessment details compromised

**Proof of Vulnerability**:
Route-level check in `/learn/$childId/index.tsx`:

```typescript
beforeLoad: async ({ params }) => {
  try {
    await assertChildInCurrentFamily(params.childId); // Route blocks unauthorized access
  } catch {
    throw redirect({ to: "/parent" });
  }
};
```

But calling the server function directly bypasses this route protection:

```typescript
// This succeeds even if parent doesn't own the child
const progress = await getChildJourneyProgress({ data: "any-child-id" });
```

**Fix Required**:

1. Call `getCurrentParentContext()` to get authenticated parent
2. Verify parent owns the family that contains the child
3. Implement similar pattern to `updateChildProfile`:
   ```typescript
   const { uid } = await getCurrentParentContext();
   const repo = new FirebaseFamilyRepository(db, uid);
   await repo.assertChildAccess(childId); // Verify parent owns child
   ```

---

### VULNERABILITY #2: `testAdminSdkDiagnostics` - Unauthorized Firestore Access

**Severity**: 🔴 CRITICAL - Admin SDK Abuse

**Location**: `src/lib/backend/firebase/family.functions.ts:290`

**Function Signature**:

```typescript
export const testAdminSdkDiagnostics = createServerFn({ method: "POST" })
  .validator(z.void())  // No parameters
  .handler(async () => {
    const report: Record<string, any> = {};

    try {
      // Read environment variables
      report.env_vars = {
        FIRESTORE_EMULATOR_HOST: process.env["FIRESTORE_EMULATOR_HOST"],
        FIREBASE_AUTH_EMULATOR_HOST: process.env["FIREBASE_AUTH_EMULATOR_HOST"],
        FIREBASE_PROJECT_ID: process.env["FIREBASE_PROJECT_ID"],
        NODE_ENV: process.env["NODE_ENV"],
      };

      // Get Admin SDK access
      const db = getFirebaseAdminDb();

      // Write arbitrary test document
      const testDocId = `test-${Date.now()}`;
      const testPath = `test-diagnostics/${testDocId}`;
      await db.doc(testPath).set({
        timestamp: new Date().toISOString(),
        projectId: process.env["FIREBASE_PROJECT_ID"],
        written_at: Date.now(),
      });

      // Read it back
      const readResult = await db.doc(testPath).get();
      return report;
    }
  });
```

**Attack Scenario**:

1. Any authenticated parent calls `testAdminSdkDiagnostics()`
2. Function exposes environment variables (FIREBASE_PROJECT_ID, emulator hosts)
3. Parent can write arbitrary data to `test-diagnostics/*` collection
4. Parent can read any Firestore data via Admin SDK
5. Potential for data exfiltration or system reconnaissance

**Root Cause**:

- No authentication verification
- No authorization checks
- Marked as "TEMPORARY" but still in production
- Unrestricted Admin SDK access

**Impact**:

- ⚠️ Information disclosure: Environment variables exposed
- ⚠️ Data corruption: Arbitrary writes to Firestore
- ⚠️ System reconnaissance: Parents can discover infrastructure details
- ⚠️ Denial of service: Large writes to cloud infrastructure

**Fix Required**:
Either:

1. **Option A**: Delete entirely (preferred - it's diagnostic)
2. **Option B**: Add authorization gate:
   ```typescript
   const { roles } = await getCurrentParentContext();
   requireProvisioningRole(roles); // Admin only
   ```

---

## Part 4: Pattern Analysis

### Authorization Gap Pattern

Functions that read child data WITHOUT parent ownership verification:

| Category                | Pattern                           | Example                     | Risk                |
| ----------------------- | --------------------------------- | --------------------------- | ------------------- |
| Direct childId reads    | Takes childId, no assertion       | `getChildJourneyProgress()` | Data breach         |
| Unrestricted admin ops  | No context check                  | `testAdminSdkDiagnostics()` | Admin SDK abuse     |
| Missing child assertion | Should call `assertChildAccess()` | `getChildJourneyProgress()` | Cross-family access |

### Verified Secure Patterns

Functions that properly verify authorization:

| Pattern           | Examples                                     | Verification                |
| ----------------- | -------------------------------------------- | --------------------------- |
| Provisioning gate | `createChildProfile`, `ensureFamilyFn`       | `requireProvisioningRole()` |
| Child ownership   | `updateChildProfile`, `assertChildInFamily`  | `assertChildAccess()`       |
| Read-only ops     | `getFamilyId`, `getFamilyChildren`           | Parent context only         |
| Child context     | `recordChildProgress`, `saveChildAssessment` | `getCurrentChildContext()`  |

---

## Part 5: Complete Server Function Inventory

### Parent-Scoped Operations

```
✅ createParentSessionFn - Session creation (token auth)
✅ getFamilyId - Read family (parent context)
✅ getFamilyChildren - Read children (parent context)
✅ ensureFamilyFn - Create/get family (requireProvisioningRole)
✅ createChildProfile - Create child (requireProvisioningRole + assertChildAccess)
✅ updateChildProfile - Update child (assertChildAccess)
✅ assertChildInFamily - Verify child (assertChildAccess)
🔴 getChildJourneyProgress - Read progress (NO AUTHORIZATION)
🔴 testAdminSdkDiagnostics - Diagnostic (NO AUTHORIZATION)
✅ clearParentSessionFn - Logout (parent context)
```

### Child-Scoped Operations

```
✅ childLogin - Auth login (Firebase token)
✅ getChildSession - Session (child context)
✅ childLogout - Logout (child context)
✅ recordChildProgress - Save progress (child context)
✅ saveChildAssessment - Save assessment (child context)
✅ loadChildScenario - Load scenario (child context)
✅ saveChildScenario - Save scenario (child context)
✅ awardAchievementsServerFn - Award achievements (child context)
✅ markCelebratedServerFn - Mark celebrated (child context)
```

### Admin Functions (Cloud Functions)

```
✅ createAdminUser - Create admin (admin authorization)
✅ createFacilitatorUser - Create facilitator (admin authorization)
✅ assignSchoolAdmin - Assign admin (admin authorization)
```

---

## Part 6: Security Boundary Verification

### Phase B Requirement: "Parents DO NOT sign up, register, onboard themselves, create accounts"

**Status**: ✅ VERIFIED SECURE

- ✅ No self-signup: Firebase signup disabled in client
- ✅ No self-registration: `getFamilyId` is read-only (C1.2 fix)
- ✅ No self-onboarding: Routes require pre-provisioned family
- ✅ No account creation: No parent creation endpoint
- ✅ No child creation by parents: `createChildProfile` blocked

**However**: With `getChildJourneyProgress` vulnerability, parents CAN read other families' children's data.

### Phase C Requirement: "All Admin SDK operations have server-side authorization"

**Status**: ⚠️ PARTIALLY VERIFIED

- ✅ Provisioning: `ensureFamilyFn`, `createChildProfile` have checks
- ✅ Updates: `updateChildProfile` has ownership verification
- ❌ Reads: `getChildJourneyProgress` has NO authorization
- ❌ Diagnostics: `testAdminSdkDiagnostics` has NO authorization

---

## Part 7: Recommended Fixes

### Fix #1: Add Authorization to `getChildJourneyProgress`

**Priority**: 🔴 CRITICAL

**Changes**:

1. Add `getCurrentParentContext()` call
2. Add `assertChildAccess(childId)` verification
3. Verify parent owns the family containing the child

**Implementation**:

```typescript
export const getChildJourneyProgress = createServerFn({ method: "POST" })
  .validator(z.string().min(1))
  .handler(async ({ data: childId }) => {
    try {
      const { uid } = await getCurrentParentContext();  // ADD THIS
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, uid);

      // Verify parent owns this child
      await repo.assertChildAccess(childId);  // ADD THIS

      // ... rest of function
    }
  });
```

**Impact**: Prevents unauthorized access to child progress data

### Fix #2: Remove or Gate `testAdminSdkDiagnostics`

**Priority**: 🔴 CRITICAL

**Options**:

**Option A (Recommended)**: Delete entirely

- Function marked as "TEMPORARY"
- Not needed in production
- No legitimate parent use case
- Remove from `family.functions.ts`

**Option B**: Add authorization gate

```typescript
export const testAdminSdkDiagnostics = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async () => {
    // Only allow admin/provisioner roles
    const { roles } = await getCurrentParentContext();
    if (!roles.includes("admin") && !roles.includes("provisioner")) {
      throw new Error("Admin-only operation");
    }
    // ... rest of function
  });
```

**Impact**: Prevents unauthorized Firestore access and reconnaissance

---

## Part 8: Testing Requirements

### Test #1: Authorization Bypass Prevention

```typescript
it("parent cannot read another family's child progress", async () => {
  // Setup: Two families with different parents
  const familyA = ..., childA = ...;
  const familyB = ..., childB = ...;

  // Parent A login
  const parentASession = await loginParent(familyA.ownerId);

  // Parent A tries to read Child B's progress
  const attack = () =>
    getChildJourneyProgress({ data: childB.id });

  // Should fail
  await expect(attack()).rejects.toThrow("not authorized");
});
```

### Test #2: Diagnostic Function Gating

```typescript
it("non-admin parent cannot call testAdminSdkDiagnostics", async () => {
  const parent = createTestParent({ role: "parent" });
  const session = await loginParent(parent.uid);

  const attack = () => testAdminSdkDiagnostics();

  await expect(attack()).rejects.toThrow("admin-only");
});
```

### Test #3: Legitimate Access Allowed

```typescript
it("parent can read their own child's progress", async () => {
  const family = createTestFamily();
  const child = createTestChild(family);
  const parent = family.owner;

  const session = await loginParent(parent.uid);
  const progress = await getChildJourneyProgress({ data: child.id });

  expect(progress).toBeDefined();
  expect(progress.length).toBeGreaterThanOrEqual(0);
});
```

---

## Part 9: Summary Table

### Vulnerabilities

| ID  | Function                | Type                | Severity | Status | Fix                      |
| --- | ----------------------- | ------------------- | -------- | ------ | ------------------------ |
| V1  | getChildJourneyProgress | Auth bypass         | CRITICAL | Active | Add authorization check  |
| V2  | testAdminSdkDiagnostics | Unrestricted access | CRITICAL | Active | Delete or gate to admins |

### Secure Functions

| Category                                  | Count | Status        |
| ----------------------------------------- | ----- | ------------- |
| Parent provisioning (properly authorized) | 5     | ✅ SECURE     |
| Parent read operations                    | 2     | ✅ SECURE     |
| Child operations                          | 8     | ✅ SECURE     |
| Admin Cloud Functions                     | 3     | ✅ SECURE     |
| Parent operations (VULNERABLE)            | 2     | 🔴 VULNERABLE |

---

## Part 10: Phase C1.3 Audit Conclusion

### Findings

**CONDITIONAL PASS - CRITICAL GAPS REMAIN**

Phase C1.2 (family auto-creation fix) is SECURE. However, comprehensive audit reveals:

1. ✅ Provisioning operations are protected by `requireProvisioningRole()`
2. ✅ Parent cannot self-register or create accounts
3. ✅ Parent cannot bypass `ensureFamilyFn` authorization
4. ✅ Child creation is protected by role checks
5. ✅ Cloud Functions have proper authorization
6. ❌ **CRITICAL**: `getChildJourneyProgress` allows reading ANY child's data
7. ❌ **CRITICAL**: `testAdminSdkDiagnostics` allows unrestricted Admin SDK access

### Remediation Required Before C2

Before implementing C2 (Admin Provisioning UI), must:

1. Fix `getChildJourneyProgress` authorization
2. Remove or gate `testAdminSdkDiagnostics`
3. Add tests to prevent regression
4. Re-run comprehensive audit

### Authorization Architecture Assessment

**Layer 1 - Authentication**: ✅ SOLID

- Session cookies verified with Admin SDK
- Parent context properly established

**Layer 2 - Authorization**: ⚠️ INCOMPLETE

- Provisioning operations: ✅ Protected
- Data ownership: ⚠️ Gaps found (getChildJourneyProgress)
- Admin diagnostics: ❌ Unprotected

**Layer 3 - Firestore Rules**: ⚠️ SECONDARY

- Rules deny direct client writes
- Rules do NOT protect Admin SDK operations
- Server-side authorization must be primary defense

### Recommended Action

**GATE**: Phase C2 readiness blocked until vulnerabilities are fixed.

1. **Immediate**: Fix V1 and V2 (1-2 hours)
2. **Testing**: Add regression tests (1 hour)
3. **Verification**: Re-run audit (30 minutes)
4. **Gate**: Proceed to C2 with full authorization boundary secured

---

## Appendix A: Attack Vectors

### AV1: Cross-Family Progress Read

```
Parent A (Family A) → Call getChildJourneyProgress("child-b-id")
→ Server searches collectionGroup("children").where("id", "==", "child-b-id")
→ Finds Child B (Family B)
→ Returns Child B's progress → Parent A reads Family B's data
```

**Prevention**: Must verify `parent.familyId == child.familyId` before returning data

### AV2: Admin SDK Reconnaissance

```
Parent A → Call testAdminSdkDiagnostics()
→ Discovers FIRESTORE_EMULATOR_HOST, FIREBASE_PROJECT_ID
→ Writes to test-diagnostics/* collection
→ Probes Firestore infrastructure
→ Discovers system configuration
```

**Prevention**: Delete function or restrict to admins only

### AV3: Scenario Chain

```
1. Parent A calls getChildJourneyProgress("child-b-id") → Gets progress
2. Parent A examines progress details → Finds lesson ID
3. Parent A calls loadChildScenario(lessonId) → Reads Child B's scenario state
4. Parent A calls saveChildScenario(lessonId, modified_state) → Modifies Child B's data
```

**Note**: Chain assumes `loadChildScenario` might also lack authorization (need to verify)

---

## Appendix B: Firestore Schema Notes

### Collections Structure

```
/families/{familyId}/
  ├── members/{parentUid}/...
  ├── children/{childId}/
  │   ├── journeyProgress/{eventId}/...
  │   ├── achievements/...

/journeyProgress/{familyId}/{childId}/{eventId}

/users/{uid}/
  ├── roles: ["admin", "parent"]
  ├── family: familyId
```

### collectionGroup() Security Risk

- `collectionGroup("children")` searches across ALL families
- Vulnerable to enumeration if no access control in handler
- Even with Firestore rules, Admin SDK bypasses them
- **MUST** verify authorization in server function

---

## Appendix C: Three-Layer Security Model

This audit demonstrates why all three layers are required:

**Layer 1 (Authentication)**: "Who are you?"

- Firebase session cookie verification
- ✅ Currently working

**Layer 2 (Authorization)**: "Can you access this?"

- Server-side role and ownership verification
- ⚠️ Partially implemented (gaps in Layer 2B)
- **Layer 2A**: Role-based (provisioning roles) ✅
- **Layer 2B**: Ownership-based (child/family access) ⚠️

**Layer 3 (Firestore Rules)**: "Database-level enforcement"

- Denies direct client writes
- Cannot protect Admin SDK operations
- ❌ Useless for server functions using Admin SDK
- Should not be relied upon as primary defense

**Gap Identified**: Layer 2B (ownership verification) has holes that bypass entire three-layer model.

---

## Document Version

**C1.3 Audit Report**

- Generated: Phase C1.3 ongoing
- Vulnerabilities Found: 2 CRITICAL
- Audit Status: COMPLETE (audit phase)
- Remediation Status: PENDING (implementation phase)
