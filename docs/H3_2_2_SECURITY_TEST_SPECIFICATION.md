# TATI Academy H3.2.2 — Security Test Specification

**Purpose**: Document all security tests required for H3.2.2 Firestore authorization.

**Test Framework**: Firebase Emulator with @firebase/rules-unit-testing  
**Status**: Test specification (implementation ready for H3.3 infrastructure setup)

---

## How to Run Tests

```bash
# Install test dependencies
npm install --save-dev @firebase/rules-unit-testing @types/jest

# Start Firebase emulator (separate terminal)
firebase emulators:start --only firestore,auth --project demo-tati

# Run tests
npm test -- src/lib/academy/__tests__/security.test.ts
```

---

## Test Suite: Facilitator Authorization

### Test Group 1: Facilitator Read Access

**Test 1.1 - Facilitator can read assigned child**
```
Given: Facilitator A with facilitatorUid = "facilitator-001"
  And: Child exists with facilitatorUids = ["facilitator-001"]
When: Facilitator A reads /families/{familyId}/children/{childId}
Then: ✅ Read succeeds (HTTP 200)
```

**Test 1.2 - Facilitator can read journey progress of assigned child**
```
Given: Facilitator A assigned to Child 1
  And: Child 1 has journeyProgress records
When: Facilitator A reads /families/{familyId}/children/{childId}/journeyProgress/*
Then: ✅ Read succeeds, returns all progress events
```

**Test 1.3 - Facilitator can read competencies of assigned child**
```
Given: Facilitator A assigned to Child 1
  And: Child 1 has competency records
When: Facilitator A reads /families/{familyId}/children/{childId}/competencies/*
Then: ✅ Read succeeds, returns competencies
```

**Test 1.4 - Facilitator can read own assignments**
```
Given: Facilitator A with uid = "facilitator-001"
  And: facilitatorAssignments collection has assignments for this facilitator
When: Facilitator A queries collection("facilitatorAssignments")
         .where("facilitatorUid", "==", "facilitator-001")
Then: ✅ Query succeeds, returns assignments for facilitator-001 only
```

---

### Test Group 2: Facilitator Write Prevention

**Test 2.1 - Facilitator cannot modify journey progress**
```
Given: Facilitator A assigned to Child 1
  And: journeyProgress record exists
When: Facilitator A attempts setDoc(...journeyProgress/{itemKey})
Then: ❌ Write fails (Firestore rule: write: false)
```

**Test 2.2 - Facilitator cannot modify assessment results**
```
Given: Facilitator A assigned to Child 1
When: Facilitator A attempts setDoc(...assessmentAttempts/{attemptId})
Then: ❌ Write fails (Firestore rule: write: false)
```

**Test 2.3 - Facilitator cannot modify scenario decisions**
```
Given: Facilitator A assigned to Child 1
When: Facilitator A attempts setDoc(...scenarioSessions/{sessionId}/decisions/...)
Then: ❌ Write fails (Firestore rule: write: false)
```

**Test 2.4 - Facilitator cannot modify competencies**
```
Given: Facilitator A assigned to Child 1
When: Facilitator A attempts setDoc(...competencies/{competencyId})
Then: ❌ Write fails (Firestore rule: write: false)
```

**Test 2.5 - Facilitator cannot modify achievements**
```
Given: Facilitator A assigned to Child 1
When: Facilitator A attempts setDoc(...achievements/{achievementId})
Then: ❌ Write fails (Firestore rule: write: false)
```

---

### Test Group 3: Cross-Facilitator Isolation

**Test 3.1 - Facilitator cannot read another facilitator's assignments**
```
Given: Facilitator A with uid = "facilitator-001"
  And: Facilitator B with uid = "facilitator-002"
  And: facilitatorAssignments has records for Facilitator B
When: Facilitator A queries collection("facilitatorAssignments")
         .where("facilitatorUid", "==", "facilitator-002")
Then: ❌ Query returns empty results (Firestore rule filters)
   OR ❌ Query fails if attempting to read specific document of another facilitator
```

**Test 3.2 - Facilitator cannot read unrelated child**
```
Given: Facilitator A assigned to Child 1 only
  And: Child 2 exists with facilitatorUids = ["facilitator-002"]
  And: Facilitator A knows familyId and childId of Child 2
When: Facilitator A attempts getDoc(/families/{familyId}/children/{childId for Child 2})
Then: ❌ Read fails (Firestore rule: canAccessChild() returns false)
```

**Test 3.3 - Facilitator cannot read child of different family**
```
Given: Facilitator A assigned to Child in Family 1
  And: Family 2 exists (unrelated)
  And: Facilitator A knows familyId of Family 2
When: Facilitator A attempts getDoc(/families/{familyId of Family 2}/children/...)
Then: ❌ Read fails (Firestore rule: canAccessChild() returns false)
```

---

### Test Group 4: Parent Privacy Enforcement

**Test 4.1 - Facilitator cannot read parentInsights**
```
Given: Facilitator A assigned to Child 1
  And: Child 1 has parentInsights records
When: Facilitator A attempts getDoc(/families/{familyId}/children/{childId}/parentInsights/{insightId})
Then: ❌ Read fails (Firestore rule: read: if isFamilyAdult || isAdmin → false for facilitator)
```

**Test 4.2 - Facilitator cannot read family document**
```
Given: Facilitator A assigned to Child 1
  And: Family document exists
When: Facilitator A attempts getDoc(/families/{familyId})
Then: ❌ Read fails (Firestore rule: read: if isActiveFamilyMember || isAdmin → false for facilitator)
```

**Test 4.3 - Facilitator cannot read family members**
```
Given: Facilitator A assigned to Child 1
When: Facilitator A attempts getDoc(/families/{familyId}/members/{parentUid})
Then: ❌ Read fails (Firestore rule: read: if isActiveFamilyMember || isAdmin → false for facilitator)
```

---

## Test Suite: Cross-Role Isolation

### Test Group 5: Role-Specific Access

**Test 5.1 - Parent can read own family**
```
Given: Parent P with uid = "parent-001"
  And: Parent is active family member (members/{parentUid}.status == "active")
When: Parent reads /families/{familyId}
Then: ✅ Read succeeds
```

**Test 5.2 - Parent can read parentInsights**
```
Given: Parent P with uid = "parent-001"
  And: Parent is active family member
  And: Child has parentInsights records
When: Parent reads /families/{familyId}/children/{childId}/parentInsights/*
Then: ✅ Read succeeds, returns insights
```

**Test 5.3 - Parent cannot access facilitator assignments**
```
Given: Parent P with uid = "parent-001"
When: Parent queries collection("facilitatorAssignments")
Then: ❌ Query returns empty (Firestore rule: read requires facilitator role)
```

**Test 5.4 - Child cannot access Academy records**
```
Given: Child C with uid = "child-001"
  And: Child has role = ["child"]
When: Child attempts collection("facilitatorAssignments").get()
Then: ❌ Query fails (Firestore rule: read requires facilitator role)
```

**Test 5.5 - Unauthenticated user cannot access Academy records**
```
Given: Unauthenticated context (no auth)
When: User attempts collection("facilitatorAssignments").get()
Then: ❌ Query fails (Firestore rule: signedIn() required)
```

---

## Test Suite: Admin Access

### Test Group 6: Admin Authority

**Test 6.1 - Admin can read any facilitator assignment**
```
Given: Admin A with uid = "admin-001"
  And: facilitatorAssignments has records for any facilitator
When: Admin reads any assignment document
Then: ✅ Read succeeds (Firestore rule: allow read if isAdmin)
```

**Test 6.2 - Admin can create facilitator assignment**
```
Given: Admin A with uid = "admin-001"
When: Admin creates document in facilitatorAssignments with:
      { facilitatorUid: "fac-xyz", familyId: "fam-abc", childId: "child-123" }
Then: ✅ Write succeeds (Firestore rule: allow create if isAdmin)
```

**Test 6.3 - Admin can update facilitator assignment**
```
Given: Admin A
  And: facilitatorAssignments document exists
When: Admin updates the document
Then: ✅ Write succeeds (Firestore rule: allow update if isAdmin)
```

**Test 6.4 - Admin can delete facilitator assignment**
```
Given: Admin A
  And: facilitatorAssignments document exists
When: Admin deletes the document
Then: ✅ Write succeeds (Firestore rule: allow delete if isAdmin)
```

---

## Test Suite: Query-Level Security

### Test Group 7: Authorization Scoping

**Test 7.1 - Facilitator query returns only own assignments**
```
Given: Facilitator A with uid = "fac-001"
  And: Facilitator B with uid = "fac-002"
  And: facilit atorAssignments has:
       - Document for Facilitator A (familyId: "fam-001")
       - Document for Facilitator B (familyId: "fam-002")
When: Facilitator A queries:
      collection("facilitatorAssignments")
        .where("facilitatorUid", "==", "fac-001")
Then: ✅ Query returns only 1 document (fam-001)
  And: ❌ Document for fam-002 is NOT returned
```

**Test 7.2 - Firestore prevents unauthorized document access by ID**
```
Given: Document in facilitatorAssignments for Facilitator B
  And: Facilitator A knows exact document ID
When: Facilitator A attempts getDoc(doc(db, "facilitatorAssignments", "documentId"))
Then: ❌ Read fails if documentId is for another facilitator
```

---

## Test Suite: Data Minimization

### Test Group 8: Field-Level Access

**Test 8.1 - No parent name exposed through facilitator queries**
```
Given: Facilitator A assigned to Child 1
When: Facilitator reads child and progress data
Then: ✅ Data contains: childName, avatar, progress
  And: ❌ Data does NOT contain: parentName, parentEmail, familyMetadata
```

**Test 8.2 - No parent insights in facilitator view**
```
Given: Facilitator A assigned to Child 1
  And: parentInsights collection has data
When: Facilitator queries all accessible child data
Then: ❌ No parentInsights documents returned
```

---

## Test Suite: Support Signals

### Test Group 9: Signal Derivation Rules

**Test 9.1 - Support signal "not-started" = 0 completed**
```
Given: Child with 0 completed journeyProgress items
When: Support signal is derived
Then: ✅ Signal = "not-started"
```

**Test 9.2 - Support signal "on-track" = 30%+ completion**
```
Given: Child with 5/14 (35.7%) completed items
When: Support signal is derived
Then: ✅ Signal = "on-track"
```

**Test 9.3 - Support signal "on-track" = recent activity within 2 days**
```
Given: Child with 2/14 (14.3%) completed items
  And: Last activity timestamp = 1 day ago
When: Support signal is derived
Then: ✅ Signal = "on-track" (despite low completion)
```

**Test 9.4 - Support signal "needs-support" = <30% + inactive >2 days**
```
Given: Child with 3/14 (21.4%) completed items
  And: Last activity timestamp = 3 days ago
When: Support signal is derived
Then: ✅ Signal = "needs-support"
```

---

## Test Data Setup

### Prerequisite: Create Test Collections

Before running tests, set up Firebase emulator with test data:

```firestore
-- Users
users/facilitator-001
  uid: "facilitator-001"
  email: "facilitator@example.com"
  displayName: "Test Facilitator"
  roles: ["facilitator"]
  status: "active"

users/facilitator-002
  uid: "facilitator-002"
  email: "facilitator2@example.com"
  displayName: "Second Facilitator"
  roles: ["facilitator"]
  status: "active"

users/parent-001
  uid: "parent-001"
  email: "parent@example.com"
  displayName: "Test Parent"
  roles: ["parent"]
  status: "active"

users/child-001
  uid: "child-001"
  roles: ["child"]

users/admin-001
  uid: "admin-001"
  email: "admin@example.com"
  displayName: "Test Admin"
  roles: ["admin"]
  status: "active"

-- Families
families/family-001
  id: "family-001"
  name: "Test Family 1"
  createdBy: "parent-001"
  createdAt: <timestamp>

families/family-001/members/parent-001
  uid: "parent-001"
  role: "parent"
  status: "active"

-- Children
families/family-001/children/child-001
  id: "child-001"
  familyId: "family-001"
  name: "Child One"
  avatar: "👧"
  age: 10
  tier: "junior"
  tati_id: "TATI-ABC-001"
  createdBy: "parent-001"
  facilitatorUids: ["facilitator-001"]  # Assigned to Facilitator A only

families/family-001/children/child-002
  id: "child-002"
  familyId: "family-001"
  name: "Child Two"
  avatar: "👦"
  age: 11
  tier: "junior"
  tati_id: "TATI-ABC-002"
  createdBy: "parent-001"
  facilitatorUids: ["facilitator-002"]  # Assigned to Facilitator B

-- Journey Progress
families/family-001/children/child-001/journeyProgress/item-001
  id: "item-001"
  item_type: "lesson"
  item_id: "lesson-save-001"
  status: "completed"
  familyId: "family-001"
  childId: "child-001"
  updatedAt: <1 day ago>

families/family-001/children/child-001/journeyProgress/item-002
  id: "item-002"
  item_type: "scenario"
  item_id: "scenario-save-001"
  status: "in-progress"
  familyId: "family-001"
  childId: "child-001"
  updatedAt: <3 days ago>

-- Parent Insights (Parent-only data)
families/family-001/children/child-001/parentInsights/insight-001
  id: "insight-001"
  childId: "child-001"
  content: "Private parent analysis"
  timestamp: <date>

-- Facilitator Assignments
facilitatorAssignments/assign-001
  facilitatorUid: "facilitator-001"
  familyId: "family-001"
  childId: "child-001"
  createdAt: <timestamp>
  assignedBy: "admin-001"

facilitatorAssignments/assign-002
  facilitatorUid: "facilitator-002"
  familyId: "family-001"
  childId: "child-002"
  createdAt: <timestamp>
  assignedBy: "admin-001"
```

---

## Test Execution Report Template

When running tests, document results:

```
Test Suite: Facilitator Authorization
├─ Test 1.1 [✅ PASS] Facilitator can read assigned child
├─ Test 1.2 [✅ PASS] Facilitator can read journey progress
├─ Test 1.3 [✅ PASS] Facilitator can read competencies
├─ Test 1.4 [✅ PASS] Facilitator can read own assignments
├─ Test 2.1 [✅ PASS] Facilitator cannot modify journey progress
├─ Test 2.2 [✅ PASS] Facilitator cannot modify assessments
├─ Test 2.3 [✅ PASS] Facilitator cannot modify scenarios
├─ Test 2.4 [✅ PASS] Facilitator cannot modify competencies
├─ Test 2.5 [✅ PASS] Facilitator cannot modify achievements
├─ Test 3.1 [✅ PASS] Facilitator cannot read another facilitator's assignments
├─ Test 3.2 [✅ PASS] Facilitator cannot read unrelated child
├─ Test 3.3 [✅ PASS] Facilitator cannot read different family
├─ Test 4.1 [✅ PASS] Facilitator cannot read parentInsights
├─ Test 4.2 [✅ PASS] Facilitator cannot read family document
├─ Test 4.3 [✅ PASS] Facilitator cannot read family members

Test Suite: Cross-Role Isolation
├─ Test 5.1 [✅ PASS] Parent can read own family
├─ Test 5.2 [✅ PASS] Parent can read parentInsights
├─ Test 5.3 [✅ PASS] Parent cannot access facilitator assignments
├─ Test 5.4 [✅ PASS] Child cannot access Academy records
├─ Test 5.5 [✅ PASS] Unauthenticated user cannot access Academy records

Test Suite: Admin Access
├─ Test 6.1 [✅ PASS] Admin can read any assignment
├─ Test 6.2 [✅ PASS] Admin can create assignment
├─ Test 6.3 [✅ PASS] Admin can update assignment
├─ Test 6.4 [✅ PASS] Admin can delete assignment

Test Suite: Query-Level Security
├─ Test 7.1 [✅ PASS] Facilitator query returns only own assignments
├─ Test 7.2 [✅ PASS] Firestore prevents unauthorized document access

Test Suite: Data Minimization
├─ Test 8.1 [✅ PASS] No parent name exposed
├─ Test 8.2 [✅ PASS] No parent insights in facilitator view

Test Suite: Support Signals
├─ Test 9.1 [✅ PASS] Signal "not-started" = 0 completed
├─ Test 9.2 [✅ PASS] Signal "on-track" = 30%+ completion
├─ Test 9.3 [✅ PASS] Signal "on-track" = recent activity
├─ Test 9.4 [✅ PASS] Signal "needs-support" = <30% + inactive

TOTAL TESTS: 31
PASSED: 31
FAILED: 0
SKIPPED: 0
```

---

## Implementation Notes for H3.3 QA

When setting up automated testing infrastructure in H3.3:

1. Use @firebase/rules-unit-testing package
2. Install test types: `npm install --save-dev @types/jest`
3. Configure Jest or Mocha for test discovery
4. Emulator must start before tests (use Firebase CLI)
5. Clean database state between test suites
6. Document any skipped tests with reason

---

**Test Specification Complete**  
*Ready for H3.3 Testing Infrastructure Implementation*
