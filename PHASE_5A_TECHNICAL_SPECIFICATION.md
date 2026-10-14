# TATI ChildSave — Phase 5A: Technical Specification

## 1. Server-Side Provisioning Functions

### 1.1 Function: `provisionParent`

**Location**: `src/lib/backend/provisioning.functions.ts`

**Type**: TanStack Server Function (POST)

**Input Schema**:
```typescript
{
  email: string;              // Valid email address
  displayName: string;        // Parent or guardian name
  phone?: string;             // Optional contact number
}
```

**Authorization**: 
- Caller must be authenticated Firebase user
- Caller must have `admin` role in `/users/{uid}.roles`

**Process**:
1. Verify admin authorization
2. Check if email already exists in `/users` collection
3. Generate temporary password (12 random characters)
4. Create Firebase Auth user with email/password
5. Create Firestore document:
   ```
   /users/{uid}
   {
     uid: string;
     email: string;
     displayName: string;
     phone?: string;
     roles: ["parent"];
     status: "active";
     createdAt: Timestamp;
     createdBy: admin_uid;
   }
   ```
6. Return success with UID (do NOT return password to client)

**Output**:
```typescript
{
  success: true;
  parentUid: string;
  email: string;
  displayName: string;
  message: "Parent account created successfully";
}
```

**Error Handling**:
- Email already exists → 409 "Email already in use"
- Invalid email format → 400 "Invalid email address"
- Not authenticated → 401 "Not authenticated"
- Not admin → 403 "Admin authorization required"
- Firebase Auth error → 500 with safe error message (no details)

---

### 1.2 Function: `provisionFamily`

**Location**: `src/lib/backend/provisioning.functions.ts`

**Type**: TanStack Server Function (POST)

**Input Schema**:
```typescript
{
  name: string;               // Family name or label
  parentUid: string;          // UID of parent from provisionParent
  notes?: string;             // Internal notes (optional)
  enrolmentDate?: string;     // ISO 8601 date (defaults to today)
}
```

**Authorization**:
- Caller must have `admin` role

**Process**:
1. Verify admin authorization
2. Verify parent exists in `/users/{parentUid}` with `roles` includes "parent"
3. Generate unique family ID: `family-${Date.now()}-${randomBytes(4).toString('hex')}`
4. Create family document:
   ```
   /families/{familyId}
   {
     id: familyId;
     name: string;
     notes?: string;
     status: "active";
     createdBy: admin_uid;
     createdAt: Timestamp;
     updatedAt: Timestamp;
     enrolmentDate: ISO 8601 string;
   }
   ```
5. Create family membership:
   ```
   /families/{familyId}/members/{parentUid}
   {
     uid: parentUid;
     role: "parent";
     status: "active";
     addedAt: Timestamp;
   }
   ```
6. Return family ID and parent UID

**Output**:
```typescript
{
  success: true;
  familyId: string;
  parentUid: string;
  name: string;
  message: "Family created and parent assigned";
}
```

**Error Handling**:
- Parent UID not found → 404 "Parent not found"
- Parent not active → 400 "Parent account not ready"
- Not admin → 403 "Admin authorization required"
- Firestore error → 500 with safe message

---

### 1.3 Function: `provisionChild` (ATOMIC)

**Location**: `src/lib/backend/provisioning.functions.ts`

**Type**: TanStack Server Function (POST)

**Input Schema**:
```typescript
{
  familyId: string;           // Target family ID
  name: string;               // Child's full name
  age: number;                // 5-18 years
  dateOfBirth?: string;       // ISO 8601 format (optional if age provided)
  preferredName?: string;     // Nickname (optional)
}
```

**Authorization**:
- Caller must have `admin` role
- Family must exist and be `status: "active"`

**Process (MUST BE ATOMIC)**:
1. Verify admin authorization
2. Verify family exists and is active
3. Generate child ID: `child-${Date.now()}-${randomBytes(4).toString('hex')}`
4. Generate TATI ID using `generateTatiId()` (retry if collision)
5. Generate PIN using `generateChildPin()`
6. Hash PIN using `hashChildPin()`
7. Start Firestore transaction:
   ```
   // Create child profile
   /families/{familyId}/children/{childId}
   {
     id: childId;
     tatiId: string;
     familyId: string;
     name: string;
     age: number;
     dateOfBirth?: string;
     preferredName?: string;
     status: "active";
     createdAt: Timestamp;
     createdBy: admin_uid;
   }
   
   // Create credential
   /childCredentials/{tatiId}
   {
     tatiId: string;
     childId: string;
     familyId: string;
     pinHash: string;
     active: true;
     revokedAt: null;
     rotatedAt: Timestamp;
   }
   ```
8. Commit transaction (all-or-nothing)
9. Return childId, tatiId, and PIN (shown once)

**Output**:
```typescript
{
  success: true;
  childId: string;
  tatiId: string;
  pin: string;              // ONLY for this response; not persisted
  familyId: string;
  name: string;
  message: "Child account created. PIN shown once above.";
}
```

**Special Handling**:
- PIN is returned ONLY in this response
- PIN is NOT stored in any document
- Future PIN recovery requires admin reset (new PIN generated)
- If transaction fails, automatically retry up to 3 times
- TATI ID uniqueness checked before credential write

**Error Handling**:
- Family not found → 404 "Family not found"
- Invalid age (< 5 or > 18) → 400 "Age must be 5-18"
- Name is empty → 400 "Child name required"
- Not admin → 403 "Admin authorization required"
- Transaction fails after 3 retries → 500 "Unable to create child, please retry"

---

### 1.4 Function: `resetChildPin`

**Location**: `src/lib/backend/provisioning.functions.ts`

**Type**: TanStack Server Function (POST)

**Input Schema**:
```typescript
{
  childId: string;            // Child to reset
  familyId: string;           // Verify ownership
}
```

**Authorization**:
- Caller must have `admin` role
- Child must belong to specified family

**Process**:
1. Verify admin authorization
2. Verify child exists in family
3. Get current credential from `/childCredentials` by childId query
4. Generate new PIN
5. Hash new PIN
6. Update credential document with new `pinHash` and `rotatedAt`
7. Return childId and new PIN

**Output**:
```typescript
{
  success: true;
  childId: string;
  newPin: string;           // Shown once
  message: "Child PIN reset. New PIN shown above.";
}
```

**Error Handling**:
- Child not found → 404 "Child not found"
- Child not in family → 403 "Child not in this family"
- Not admin → 403 "Admin authorization required"
- Credential not found → 500 "Credential lookup failed"

---

### 1.5 Function: `verifyProvisioningState`

**Location**: `src/lib/backend/provisioning.functions.ts`

**Type**: TanStack Server Function (GET)

**Purpose**: Check if provisioning workflow can proceed (used during multi-step form)

**Input Schema**:
```typescript
{
  parentUid?: string;        // Check if parent exists
  familyId?: string;         // Check if family exists
  childId?: string;          // Check if child exists
}
```

**Output**:
```typescript
{
  parentExists: boolean;
  parentEmail?: string;
  familyExists: boolean;
  familyName?: string;
  childExists: boolean;
  childName?: string;
  ready: boolean;            // All prerequisites met
}
```

**Security**: Admins only

---

## 2. Server-Side Utilities

### 2.1 Utility: `provisioning.server.ts`

**Location**: `src/lib/backend/provisioning.server.ts`

**Purpose**: Reusable server-side logic (not exposed to client)

**Functions**:

#### `ensureParentNotExists(email: string)`
- Query `/users` for email
- Return boolean

#### `getParentByUid(uid: string)`
- Get Firestore document
- Return parent data or null

#### `ensureFamilyExists(familyId: string)`
- Get family document
- Return family or null

#### `getChildByIdInFamily(childId: string, familyId: string)`
- Query child document
- Verify family ownership
- Return child or null

#### `getTatiIdCredential(tatiId: string)`
- Query `/childCredentials/{tatiId}`
- Return credential or null

#### `findCredentialByChildId(childId: string)`
- Query `/childCredentials` by childId index
- Return credential or null

#### `verifyAdminAuthorization(uid: string)`
- Get `/users/{uid}` document
- Check for "admin" in roles array
- Throw if not admin

---

## 3. Client-Side UI Components

### 3.1 Route: `/admin/enroll` (Layout)

**File**: `src/routes/admin/enroll/layout.tsx`

**Purpose**: Container for 4-step enrolment workflow

**State**:
```typescript
{
  step: 1 | 2 | 3 | 4;
  familyData: { name: string; notes?: string; };
  parentData: { email: string; displayName: string; phone?: string; };
  childrenData: Array<{
    name: string;
    age: number;
    dateOfBirth?: string;
    generatedTatiId?: string;
    generatedPin?: string;
  }>;
  loading: boolean;
  error: string | null;
  success: boolean;
}
```

**UI Structure**:
- Progress bar (step 1/2/3/4)
- Step content (conditionally rendered)
- Back/Next buttons
- Cancel button

---

### 3.2 Component: Step 1 — Family Details

**File**: `src/routes/admin/enroll/step-1-family.tsx`

**Form Fields**:
- Family Name (required, text input)
- Notes (optional, textarea)
- Enrolment Date (auto-filled with today, readonly or picker)

**Validation**:
- Family name not empty
- Name < 100 characters

**Next Button**:
- Enabled when family name provided
- Moves to step 2

---

### 3.3 Component: Step 2 — Parent Details

**File**: `src/routes/admin/enroll/step-2-parent.tsx`

**Form Fields**:
- Parent Full Name (required, text input)
- Email Address (required, email input with validation)
- Phone Number (optional, tel input)
- Pre-fill email check message (if email exists: "already used")

**Validation**:
- Name not empty
- Email is valid format
- Email not already used (fetch from server)
- Phone format validation (if provided)

**Submission**:
- Calls `provisionParent()` server function
- Shows loading state
- On success: stores parentUid, moves to step 3
- On error: displays error message, allows retry

---

### 3.4 Component: Step 3 — Children

**File**: `src/routes/admin/enroll/step-3-children.tsx`

**Form**:
- List of children (initially empty, can add multiple)
- For each child:
  - Name (required)
  - Date of Birth OR Age (required)
  - Preferred Name (optional)
  - Generated TATI ID (displayed, read-only)
  - Generated PIN (displayed, read-only, with copy button)
  - Remove button (delete from list)
- "Add Another Child" button

**Behavior**:
- Calls `provisionChild()` for each child
- Shows loading progress
- Displays each child's TATI ID and PIN as generated
- Warns: "PINs shown only once"
- On success: stores child data, moves to step 4

---

### 3.5 Component: Step 4 — Review & Confirm

**File**: `src/routes/admin/enroll/step-4-review.tsx`

**Display**:
- Family name and notes
- Parent email and name (no password shown)
- Each child: name, age, TATI ID, PIN
- Summary of what will be created

**Actions**:
- Confirm button: submits everything to backend
- Back button: returns to step 3
- Cancel button: aborts entire workflow

**On Confirmation**:
- Shows success screen with:
  - All credentials
  - Download/Print options
  - Option to start new enrolment
  - Link back to families list

---

### 3.6 Route: `/admin/families` (List)

**File**: `src/routes/admin/families/index.tsx`

**Display**:
- Table with columns: Family Name, Parent(s), Children Count, Enrolment Date, Status
- Search/filter by family name or ID
- Pagination (20 per page)
- New Family button (routes to `/admin/enroll`)

**Actions per row**:
- Click to view detail
- Quick actions menu: Edit, Delete

---

### 3.7 Route: `/admin/families/[familyId]`

**File**: `src/routes/admin/families/$familyId.tsx`

**Display**:
- Family detail card: name, notes, status, enrolment date
- Linked parents section
- Children list (with add-child button)

**Edit functionality**:
- Edit family name/notes (inline form)
- Save/Cancel buttons
- Delete family button (with confirmation)

**Add Child**:
- Quick form (similar to step 3)
- Calls `provisionChild()` with familyId
- Shows generated TATI ID and PIN

---

### 3.8 Route: `/admin/parents` (List)

**File**: `src/routes/admin/parents/index.tsx`

**Display**:
- Table: Email, Display Name, Phone, Families, Status
- Search by email or name
- Pagination

**Actions**:
- Click email to view detail
- Password reset button
- Edit profile button

---

### 3.9 Route: `/admin/children` (List)

**File**: `src/routes/admin/children/index.tsx`

**Display**:
- Table: Name, TATI ID, Family, Age, Status
- Search by name or TATI ID
- Filter by family

**Actions**:
- Click name to view detail
- Reset PIN button
- Edit profile button

**Detail view**:
- Child info (name, age, DOB)
- Family and parents
- Learning progress (read-only)
- Reset PIN button (with confirm dialog)
- Edit profile form (name, age only)

---

## 4. Firestore Schema Decisions

### Final Schema (After Phase 5A)

#### `/users/{uid}` (Parent account)
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  roles: ["parent"];
  status: "active" | "pending" | "disabled";
  createdAt: Timestamp;
  createdBy: admin_uid;
  updatedAt?: Timestamp;
}
```

#### `/families/{familyId}`
```typescript
{
  id: familyId;
  name: string;
  notes?: string;
  status: "active" | "archived";
  createdAt: Timestamp;
  createdBy: admin_uid;
  updatedAt: Timestamp;
  enrolmentDate: ISO 8601 string;
}
```

#### `/families/{familyId}/members/{parentUid}`
```typescript
{
  uid: parentUid;
  role: "parent";
  status: "active" | "removed";
  addedAt: Timestamp;
}
```

#### `/families/{familyId}/children/{childId}`
```typescript
{
  id: childId;
  tatiId: string;              // NOT mutable
  familyId: string;            // NOT mutable
  name: string;
  age: number;
  dateOfBirth?: string;
  preferredName?: string;
  status: "active" | "archived";
  createdAt: Timestamp;
  createdBy: admin_uid;
  updatedAt: Timestamp;
}
```

#### `/childCredentials/{tatiId}` (Server-only, denied to clients)
```typescript
{
  tatiId: string;              // Primary key
  childId: string;
  familyId: string;
  pinHash: string;             // scrypt$16384$8$1$salt$key
  active: boolean;
  revokedAt: string | null;
  rotatedAt: Timestamp;
}
```

#### `/families/{familyId}/children/{childId}/sessions/{sessionId}` (Server-only)
```typescript
{
  id: sessionId;
  childProfileId: childId;
  tokenHash: string;           // SHA256 of token
  createdAt: Timestamp;
  expiresAt: Timestamp;
  revokedAt: string | null;
}
```

---

## 5. API & Error Codes

### Server Function Error Codes

| Code | Message | HTTP Status |
|------|---------|-------------|
| `UNAUTHORIZED` | Not authenticated | 401 |
| `FORBIDDEN` | Admin role required | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Email already in use | 409 |
| `VALIDATION_ERROR` | Invalid input | 400 |
| `INTERNAL_ERROR` | Provisioning failed | 500 |

---

## 6. Security Checklist

- [ ] All provisioning functions verify admin authorization
- [ ] Parent passwords never returned to client
- [ ] Child PINs never stored in Firestore
- [ ] Child PINs shown only once during provisioning
- [ ] PIN reset generates new PIN (not retrieved from storage)
- [ ] Credentials use scrypt hashing (N=16384)
- [ ] Firestore rules deny client access to childCredentials
- [ ] Family/child relationships enforced server-side
- [ ] No secrets in error messages
- [ ] No plaintext PINs in logs
- [ ] Duplicate email prevention
- [ ] Admin authorization gates on all operations
- [ ] TATI ID uniqueness verified before write
- [ ] Atomic transactions for child + credential
- [ ] Timing-safe comparison for PIN verification

---

## 7. Testing Matrix

### Unit Tests
- PIN generation produces valid 4-digit numbers
- TATI ID generation produces valid format
- PIN hashing produces valid scrypt format
- PIN verification works with correct PIN
- PIN verification fails with wrong PIN

### Integration Tests
- `provisionParent()` creates user and Firestore doc
- `provisionFamily()` creates family and membership
- `provisionChild()` creates child and credential atomically
- `resetChildPin()` generates new PIN and updates credential
- Duplicate email rejected
- Non-admin authorization rejected
- Family ownership enforced

### End-to-End Tests
- Enrol family with 1 child → parent login → child login
- Enrol family with 3 children → all children can login
- Reset child PIN → new PIN works, old PIN fails
- Parent can view only their family's children
- Parent cannot view other families' children
- Admin can view all families and children

### Security Tests
- Non-admin cannot call `provisionParent()`
- Non-admin cannot call `provisionFamily()`
- Non-admin cannot call `provisionChild()`
- Non-admin cannot call `resetChildPin()`
- Parent account cannot call any provisioning function
- Child session cannot call any provisioning function
- Cross-family access attempts fail

---

## 8. Deployment & Rollback

### Pre-Deployment Checklist
- [ ] All tests pass
- [ ] TypeScript strict mode passes
- [ ] Production build succeeds
- [ ] No secrets in code
- [ ] Firestore rules unchanged
- [ ] Firestore indexes verified
- [ ] Server functions deploy successfully
- [ ] Manual provisioning test successful
- [ ] Bootstrap script still works

### Rollback (if needed)
1. Delete feature branch
2. All Firebase data persists (nothing deleted)
3. Admin uses bootstrap script if needed
4. Existing logins unaffected

---

**Technical Specification Complete**
