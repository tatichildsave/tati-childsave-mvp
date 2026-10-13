# Phase A: TATI Authentication Redesign — Parent Signup/Onboarding Audit

**Date**: 2026-10-02  
**Scope**: Complete audit of parent signup, registration, account creation, and onboarding flows  
**Objective**: Identify all code that enables parent self-service account/child creation to be gated or moved to admin-only

---

## AUDIT RESULTS SUMMARY

### 1. TO REMOVE (Self-Service Only, No Longer Needed)

**None.** All signup/onboarding UI and logic will be **gated** or **repurposed** rather than deleted. The underlying mechanics (Firebase user creation, session setup, child profile creation) will be reused by the admin provisioning workflow.

### 2. TO MOVE TO ADMIN (Parent Self-Service → Admin-Only)

| Category                        | Component                            | Location                                                                                                 | Current Flow                  | New Flow                                    |
| ------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------- |
| **Parent Account Creation**     | Signup form + Firebase user creation | [src/routes/(public)/signup.tsx](<src/routes/(public)/signup.tsx>)                                       | Self-service form             | Admin creates user, same Firebase mechanics |
| **Family Creation**             | Auto-create on first page load       | [src/lib/backend/firebase/repositories.ts](src/lib/backend/firebase/repositories.ts):49 `ensureFamily()` | On-demand, idempotent         | Admin creates during parent provisioning    |
| **Family Member Assignment**    | Link parent to family                | [src/lib/backend/firebase/repositories.ts](src/lib/backend/firebase/repositories.ts):93                  | Auto via `ensureFamily()`     | Admin creates during parent provisioning    |
| **Child Profile Creation**      | Onboarding wizard                    | [src/routes/onboarding.tsx](src/routes/onboarding.tsx)                                                   | Parent enters name/age/avatar | Admin enters same data                      |
| **Child Credential Generation** | Generates tati_id + child_pin        | [src/lib/backend/firebase/repositories.ts](src/lib/backend/firebase/repositories.ts):143                 | During parent onboarding      | During admin child creation                 |

### 3. TO PRESERVE (Core to Login/Dashboard, Unchanged)

| Component                | Location                                                                                                                  | Why Preserve                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Parent login flow        | [src/routes/(public)/login.tsx](<src/routes/(public)/login.tsx>)                                                          | Used by both self-signed-up and admin-provisioned parents |
| Parent session creation  | [src/lib/backend/firebase/family.functions.ts](src/lib/backend/firebase/family.functions.ts):32 `createParentSessionFn()` | Core auth mechanism, works for all parents                |
| Parent dashboard         | [src/routes/parent/index.tsx](src/routes/parent/index.tsx)                                                                | View children, access learning journeys                   |
| Family data queries      | [src/lib/backend/firebase/family.functions.ts](src/lib/backend/firebase/family.functions.ts):44 `getFamilyChildren()`     | Query existing family data                                |
| Child login flow         | [src/routes/child/login.tsx](src/routes/child/login.tsx)                                                                  | Unchanged (still uses tati_id + pin)                      |
| Child learning journey   | [src/routes/learn/](src/routes/learn/)                                                                                    | Unchanged                                                 |
| Analytics infrastructure | [src/lib/analytics.ts](src/lib/analytics.ts)                                                                              | Tracking stays, only event names may change               |

### 4. PARENT-INITIATED CHILD CREATION (Affected by Model Change)

| Item                           | Status                       | Impact                       |
| ------------------------------ | ---------------------------- | ---------------------------- |
| Child profile wizard           | ❌ Remove access             | Only admin creates children  |
| `useCreateChildProfile()` hook | ✅ Keep function             | Reused by admin UI           |
| Child credential generation    | ✅ Keep logic                | Called from admin UI instead |
| "Add my child" buttons         | ❌ Remove from parent portal | Hidden or disabled           |
| Onboarding route redirects     | ❌ Gate access               | Redirect to login or message |

---

## DETAILED FINDINGS

### FILE-BY-FILE BREAKDOWN

---

#### **1. PARENT SIGNUP ROUTE**

**File**: [src/routes/(public)/signup.tsx](<src/routes/(public)/signup.tsx>)

**Lines**: 1–300+ (full file)

**What it does**:

- Web form for parent self-service account creation (email + password)
- Validates password (8+ chars, requires number or symbol)
- Confirms password matches
- Requires terms/conditions checkbox
- Google OAuth signup option
- Creates Firebase user: `createUserWithEmailAndPassword(auth, email, password)`
- Updates Firebase profile: `updateProfile(userCredential.user, { displayName: fullName })`
- Gets ID token: `userCredential.user.getIdToken()`
- Creates session: `await createParentSessionFn({ data: { idToken } })`
- Tracks event: `trackEvent("signup_completed", { eventKey: uid })`
- Redirects: `navigate({ to: "/parent", replace: true })`
- Auth check: `onAuthStateChanged()` listener redirects existing users to `/parent`

**Functions/Components**:

- `SignupPage()` component
- `handleSubmit()` async handler (form submission)
- `handleGoogle()` async handler (Google OAuth)
- Firebase functions: `createUserWithEmailAndPassword()`, `updateProfile()`, `getIdToken()`, `onAuthStateChanged()`
- Server function: `createParentSessionFn()`
- Analytics: `trackEvent()`

**Routes**:

- `GET /signup` – Form display
- `POST /signup` (implicit via form)

**Linked from**:

- [src/routes/index.tsx](src/routes/index.tsx):89 – "Create Parent Account" button
- [src/routes/(public)/login.tsx](<src/routes/(public)/login.tsx>):197 – "Sign up instead" link

**Decision**: ❌ **GATE PUBLIC ACCESS**

- Keep the route/component in codebase (may be repurposed for admin UI)
- Block public access via: auth check, environment flag, or redirect
- The Firebase mechanics stay the same (will be called by admin provisioning)

---

#### **2. PARENT LOGIN ROUTE**

**File**: [src/routes/(public)/login.tsx](<src/routes/(public)/login.tsx>)

**Lines**: 1–180+ (full file)

**What it does**:

- Email + password login form
- Google OAuth login option
- Uses `signInWithEmailAndPassword(auth, email, password)`
- Gets ID token and calls `createParentSessionFn()`
- Redirects to `/parent` on success
- Auth check: Existing users redirected to `/parent`

**Functions/Components**:

- `LoginPage()` component
- `handleSubmit()` – Email/password login
- `handleGoogle()` – Google OAuth login
- Firebase functions: `signInWithEmailAndPassword()`, `signInWithPopup()`, `onAuthStateChanged()`
- Server function: `createParentSessionFn()`

**Routes**:

- `GET /login`
- `POST /login` (implicit)

**Linked from**:

- [src/routes/index.tsx](src/routes/index.tsx):93 – "I already have an account" button

**Decision**: ✅ **PRESERVE (NO CHANGES)**

- Used by both self-signed-up parents (old flow) and admin-provisioned parents (new flow)
- No code changes needed

---

#### **3. PARENT SESSION CREATION (Server Function)**

**File**: [src/lib/backend/firebase/family.functions.ts](src/lib/backend/firebase/family.functions.ts)

**Lines**: 32–42

**Function**: `createParentSessionFn`

**What it does**:

```typescript
export const createParentSessionFn = createServerFn({ method: "POST" })
  .validator(z.object({ idToken: z.string().min(1) }))
  .handler(async ({ data: { idToken } }) => {
    try {
      await createParentSession(idToken);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create session: ${message}`);
    }
  });
```

- Takes Firebase ID token from client
- Calls `createParentSession(idToken)` on server
- Creates HTTP-only session cookie
- Called by: signup and login flows

**Implementation**: [src/lib/backend/firebase/parent-auth.server.ts](src/lib/backend/firebase/parent-auth.server.ts):29

**Called from**:

- [src/routes/(public)/signup.tsx](<src/routes/(public)/signup.tsx>):100 – After Firebase user created
- [src/routes/(public)/signup.tsx](<src/routes/(public)/signup.tsx>):137 – After Google OAuth signup
- [src/routes/(public)/login.tsx](<src/routes/(public)/login.tsx>):76 – After email/password login

**Decision**: ✅ **PRESERVE (CORE AUTH MECHANISM)**

- No changes to function or logic
- Will continue to be called by admin provisioning flow

---

#### **4. FAMILY CREATION (Automatic on First Use)**

**File**: [src/lib/backend/firebase/repositories.ts](src/lib/backend/firebase/repositories.ts)

**Lines**: 49–120

**Method**: `FirebaseFamilyRepository.ensureFamily()`

**What it does**:

- Checks if parent already has a family (via Firestore query)
- If family exists: returns its ID
- If no family: creates new family document with auto-generated ID
- Creates family membership link: `/users/{parentUid}/familyMemberships/{familyId}`
- Creates family Insights document for parent insights
- Uses Admin SDK (bypasses Firestore RLS)
- **Idempotent**: Safe to call multiple times, returns same family ID

**Logic**:

```typescript
async ensureFamily(): Promise<string> {
  const memberships = await db
    .collection("users")
    .doc(this.userId)
    .collection("familyMemberships")
    .where("status", "==", "active")
    .limit(1)
    .get();

  // If family found, return it
  if (memberships.docs.length > 0) {
    return active.id;
  }

  // Create new family
  const familyId = db.collection("families").doc().id;
  await db.collection("families").doc(familyId).set({
    created_by: this.userId,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    // ... other fields
  });

  // Create membership link
  await db
    .collection("users")
    .doc(this.userId)
    .collection("familyMemberships")
    .doc(familyId)
    .set({
      status: "active",
      // ... other fields
    });

  return familyId;
}
```

**Called from**:

- [src/lib/backend/firebase/family.functions.ts](src/lib/backend/firebase/family.functions.ts):57 – `createChildProfile()` server function
- Implicitly by any `getFamilyChildren()` or `getFamilyId()` call via React Query hooks
- Page load cycle: Parent visits `/parent` → `useChildProfiles()` → `getFamilyChildren()` → `ensureFamily()` is called

**Current Behavior**:

- Family is created **on-demand** when parent first accesses parent portal
- Not created during signup

**Decision**: ⚠️ **MOVE TO ADMIN (WITH CAVEATS)**

- **Option A** (Recommended): Admin provisioning creates family during parent account setup
  - Modify `ensureFamily()` to NOT create families automatically
  - Return error if family doesn't exist
  - Admin creates family as part of provisioning workflow

- **Option B** (Interim): Keep automatic family creation
  - `ensureFamily()` stays as-is
  - Works for admin-provisioned parents too
  - More compatible with existing code
  - But defeats purpose of "admin-only" model

---

#### **5. CHILD CREATION ONBOARDING WIZARD**

**File**: [src/routes/onboarding.tsx](src/routes/onboarding.tsx)

**Lines**: 1–250+ (full file)

**What it does**:

- Multi-step wizard for parent to create first child
- **Steps** (0–6):
  1. Welcome screen (step 0)
  2. Name input (step 1)
  3. Age selection (step 2)
  4. Avatar/character picker (step 3)
  5. Meet TATI screen (step 4)
  6. Journey preview (step 5)
  7. Final "Start" button (step 6)
- Saves progress to localStorage: `"tati.onboarding.draft"`
- **Resumable**: Parent can return later and resume
- Validation: Name (2–30 chars), Age (8–12)
- On completion: Calls `createChild.mutateAsync({...})`
- Redirects: `/learn/{childId}/assessment/save-pre` (pre-assessment)

**Functions/Components**:

- `Onboarding()` component
- `useCreateChildProfile()` hook (creates child)
- `startJourney()` async function (line ~93)
- localStorage handlers

**Routes**:

- `GET /onboarding` – Protected (requires Firebase auth)
- Checks: `if (!user?.uid) throw redirect({ to: "/login" })`

**Linked from**:

- [src/routes/parent/index.tsx](src/routes/parent/index.tsx):102 – "Add my child" button
- [src/routes/parent/index.tsx](src/routes/parent/index.tsx):154 – Secondary "Add my child" button

**Decision**: ❌ **REMOVE PUBLIC ACCESS**

- Gate the route: Only admins can access (or show message)
- OR redirect to parent portal with message "Admins create children"
- Keep component in codebase (may be reused for admin dashboard)

---

#### **6. CREATE CHILD (Client Hook)**

**File**: [src/lib/family.ts](src/lib/family.ts)

**Lines**: 94–130

**Function**: `useCreateChildProfile()`

**What it does**:

```typescript
export function useCreateChildProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChildInput): Promise<ChildProfile> => {
      // Client-side validation
      if (!safeName) throw new Error("Please enter your child's name.");
      if (safeName.length < 2 || safeName.length > 30)
        throw new Error("Name should be between 2 and 30 characters.");
      if (!/^[\p{L}\p{M}][\p{L}\p{M}'\-. ]*$/u.test(safeName))
        throw new Error("Use letters, spaces, apostrophes, hyphens, or periods only.");
      if (!Number.isInteger(age) || age < 8 || age > 12)
        throw new Error("Child age must be between 8 and 12 years old.");

      // Call server function
      const result = await serverCreateChildProfile({
        data: {
          name: safeName,
          age,
          avatar: input.avatar,
          onboardingCompleted: input.onboardingCompleted ?? true,
        },
      });

      // Track event
      void trackEvent("child_profile_created", { childProfileId: result.id });
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-profiles"] }),
  });
}
```

- React Query mutation for optimistic updates
- Validates input: name, age, avatar
- Calls server function: `createChildProfile()`
- Tracks event: `child_profile_created`
- Invalidates child profiles cache

**Used by**:

- [src/routes/onboarding.tsx](src/routes/onboarding.tsx):78 – Parent onboarding
- [src/lib/learning/progress.ts](src/lib/learning/progress.ts):59 – `useAddChild()` hook
- Potentially: Admin dashboard (future)

**Decision**: ✅ **KEEP FUNCTION, GATE PARENT ACCESS**

- Hook logic stays unchanged
- Remove from parent UI (`/onboarding`)
- Add to admin UI (admin dashboard)
- Same validation and tracking apply

---

#### **7. CREATE CHILD (Server Function)**

**File**: [src/lib/backend/firebase/family.functions.ts](src/lib/backend/firebase/family.functions.ts)

**Lines**: 50–68

**Function**: `createChildProfile`

**What it does**:

```typescript
export const createChildProfile = createServerFn({ method: "POST" })
  .validator(createChildInput) // name, age, avatar, onboardingCompleted?
  .handler(async ({ data: input }) => {
    try {
      const { uid } = await getCurrentParentContext();
      const db = getFirebaseAdminDb();
      const repo = new FirebaseFamilyRepository(db, uid);
      const child = await repo.createChild(input);
      return child;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[createChildProfile] Error:", message);
      throw new Error(`Failed to create child: ${message}`);
    }
  });
```

- Server-side function (can only be called by authenticated parent)
- Gets parent UID from authenticated context
- Calls repository: `FirebaseFamilyRepository.createChild(input)`
- Returns created child profile
- No public access

**Called from**:

- [src/lib/family.ts](src/lib/family.ts):107 – `useCreateChildProfile()` hook

**Decision**: ✅ **PRESERVE FUNCTION, GATE PARENT ACCESS**

- Function mechanics unchanged
- Auth check stays (but changes from "any logged-in parent" to "admin only")
- Will be called by admin provisioning workflow

---

#### **8. CREATE CHILD (Repository Method)**

**File**: [src/lib/backend/firebase/repositories.ts](src/lib/backend/firebase/repositories.ts)

**Lines**: 143–165+

**Method**: `FirebaseFamilyRepository.createChild()`

**What it does**:

- Calls `ensureFamily()` to get/create family
- Generates unique child ID
- Validates input via Zod schema
- Creates child profile document in Firestore:
  - Path: `/families/{familyId}/children/{childId}`
  - Fields: name, age, avatar, tati_id (generated), child_pin (generated), onboarding_step, etc.
- Calls `generateChildCredential()` to create tati_id and child_pin
- Returns created `ChildProfile` object

**Code snippet**:

```typescript
async createChild(input: CreateChildInput): Promise<ChildProfile> {
  const familyId = await this.ensureFamily();
  const childId = this.db.collection("families").doc().id;

  // Generate credentials
  const { tatiId, childPin } = await generateChildCredential(
    childId,
    input.age,
  );

  const childDoc: ChildProfileDoc = {
    name: input.name,
    age: input.age,
    avatar: input.avatar,
    tati_id: tatiId,
    child_pin: childPin,
    onboarding_step: 0,
    onboarding_completed: input.onboardingCompleted ?? true,
    // ... timestamps
  };

  await this.db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .set(childDoc);

  return { id: childId, ...childDoc };
}
```

**Decision**: ✅ **PRESERVE LOGIC, GATE PARENT ACCESS**

- Repository method unchanged
- Still called by server function
- Server function changes from parent-accessible to admin-only

---

#### **9. GENERATE CHILD CREDENTIALS**

**File**: [src/lib/backend/firebase/child-auth.server.ts](src/lib/backend/firebase/child-auth.server.ts)

**Lines**: 40+ (function not shown but referenced)

**Function**: `generateChildCredential()` and related

**What it does**:

- Generates unique `tati_id` for child (used for login)
- Generates `child_pin` security code (used for login with tati_id)
- Validates child age (8–12)
- Stores credentials in child profile document

**Called from**:

- [src/lib/backend/firebase/repositories.ts](src/lib/backend/firebase/repositories.ts):143 – During `createChild()`

**Current flow**:

- During parent onboarding: Parent creates child → credentials generated
- Child can then login with tati_id + pin

**New flow**:

- During admin provisioning: Admin creates child → credentials generated (same logic)
- Child can then login with tati_id + pin (no change)

**Decision**: ✅ **PRESERVE (MOVE CALLER ONLY)**

- Credential generation logic unchanged
- Will be called from admin provisioning instead of parent onboarding
- No code changes to this function

---

#### **10. PARENT PORTAL HOME**

**File**: [src/routes/parent/index.tsx](src/routes/parent/index.tsx)

**Lines**: 1–160+ (full file)

**What it does**:

- Parent dashboard (portal home)
- Lists all children in family
- Shows progress for each child
- Links to child progress pages
- "Add my child" button: `to="/onboarding"`
- "Continue learning journey" link per child
- Sign out button

**Components**:

- `ParentHome()` component
- Uses: `useSession()`, `useChildProfiles()`
- Button: "Add my child →" (line 102)

**Routes**:

- `GET /parent/` – Protected (redirects to login if not authenticated)

**Entry points**:

- Homepage → Sign in → /parent

**Decision**: ✅ **PRESERVE ROUTE, UPDATE UI**

- Remove or disable "Add my child" button
- Update message: "Your family's learners" (instead of "Your children")
- Update onboarding link (if present)
- Keep dashboard view and progress links

---

#### **11. PARENT PORTAL ROUTE PROTECTION**

**File**: [src/routes/parent/route.tsx](src/routes/parent/route.tsx)

**Lines**: 1–50+ (full file)

**What it does**:

- Route guard for `/parent/*` routes
- Checks if user is authenticated via Firebase
- Redirects to `/login` if not authenticated
- Renders child routes via `<Outlet />`

**Code**:

```typescript
export const Route = createFileRoute("/parent")({
  ssr: false,
  beforeLoad: async () => {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user?.uid) throw redirect({ to: "/login" });
    return { user };
  },
  pendingComponent: AuthLoadingShell,
  component: () => <Outlet />,
});
```

**Decision**: ✅ **PRESERVE (NO CHANGES)**

- Auth check stays the same
- Works for all parents (self-signed-up or admin-provisioned)

---

#### **12. HOMEPAGE SIGNUP LINK**

**File**: [src/routes/index.tsx](src/routes/index.tsx)

**Lines**: 1–110+ (full file, relevant lines: 89–93)

**What it shows**:

- Landing page for unauthenticated users
- Hero image and value proposition
- 4 buttons:
  1. "Continue My Journey →" → `/child/login`
  2. "Create Parent Account" → `/signup` ← **TO REMOVE**
  3. "I already have an account" → `/login`
  4. "Facilitator Sign In" → `/academy/login`

**Components**:

- `Landing()` component
- Button: `to="/signup"` (line 89)

**Decision**: ❌ **REMOVE "CREATE PARENT ACCOUNT" BUTTON**

- Delete the Button component that links to `/signup`
- Keep other buttons
- Consider adding message: "Parents: Contact an administrator to create an account"

---

#### **13. LOGIN PAGE SIGNUP LINK**

**File**: [src/routes/(public)/login.tsx](<src/routes/(public)/login.tsx>)

**Lines**: Approx. 195–200

**What it shows**:

- At the bottom of login form
- Link text: "Don't have an account? Sign up here."
- Links to `/signup`

**Decision**: ❌ **REMOVE "SIGN UP" LINK**

- Delete the Link component: `to="/signup"`
- Consider replacing with message: "Contact your administrator for account access"

---

#### **14. ANALYTICS EVENTS**

**File**: [src/lib/analytics.ts](src/lib/analytics.ts)

**Events related to signup/onboarding**:

- `"signup_completed"` – Fired when parent creates account
- `"child_profile_created"` – Fired when child profile created
- `"parent_dashboard_viewed"` – Parent portal view

**Tracking calls**:

- [src/routes/(public)/signup.tsx](<src/routes/(public)/signup.tsx>):105 – After signup
- [src/lib/family.ts](src/lib/family.ts):121 – After child created
- [src/routes/_authenticated/dashboard.tsx](src/routes/_authenticated/dashboard.tsx):47 – Dashboard viewed

**Decision**: ✅ **PRESERVE EVENTS, UPDATE TRACKING**

- `signup_completed` – Can stay (both old and new flows should track this)
- `child_profile_created` – Can stay (same creation method)
- Consider adding: `admin_account_provisioned`, `admin_child_provisioned`

---

#### **15. FACILITATOR LOGIN (ACADEMY)**

**File**: [src/routes/academy/login.tsx](src/routes/academy/login.tsx)

**Lines**: 1–150+ (full file)

**What it does**:

- Facilitator login page
- Email + password only (no Google OAuth)
- Calls `loginFacilitator()` function
- No self-service signup available
- Message: "You must have a facilitator account to access TATI Academy. Contact your administrator."

**Routes**:

- `GET /academy/login`

**Decision**: ✅ **NO CHANGES**

- Separate from parent signup flow
- Already admin-provisioned (no self-service exists)
- Keep as-is

---

#### **16. CHILD LOGIN**

**File**: [src/routes/child/login.tsx](src/routes/child/login.tsx) (referenced but not shown)

**What it does**:

- Child enters tati_id + child_pin to login
- Creates child session
- Loads learning journey

**Decision**: ✅ **NO CHANGES**

- Credentials created by admin during child provisioning
- Login flow unchanged

---

## RELATED AUDIT DOCUMENTS

For context on the authentication architecture redesign:

- [H5.2_AND_LOVABLE_EXIT_PHASE_0_AUDIT_REPORT.md](H5.2_AND_LOVABLE_EXIT_PHASE_0_AUDIT_REPORT.md) – Current state and Phase 0 (pilot model)
- [AUTHENTICATION_REDESIGN_AUDIT_SUMMARY.md](AUTHENTICATION_REDESIGN_AUDIT_SUMMARY.md) – High-level redesign summary
- [COMPREHENSIVE_AUTH_ARCHITECTURE_AUDIT.md](COMPREHENSIVE_AUTH_ARCHITECTURE_AUDIT.md) – Complete architecture audit
- [TATI_PROCESS_INTEGRITY_AUDIT.md](TATI_PROCESS_INTEGRITY_AUDIT.md) – Process flows and integrity checks

---

## SUMMARY OF CHANGES NEEDED

### Phase A Implementation Checklist

- [ ] **Gate `/signup` route**
  - Add redirect or auth check
  - Redirect unauthenticated users or show message
  - Keep component in codebase

- [ ] **Gate `/onboarding` route**
  - Add admin-only check or redirect
  - Show message: "Admins create children for your family"

- [ ] **Remove homepage link to `/signup`**
  - Delete Button component (line 89 in index.tsx)
  - Optional: Add message about admin provisioning

- [ ] **Remove login page "Sign up" link**
  - Delete Link component (~line 197 in login.tsx)
  - Optional: Add message about admin provisioning

- [ ] **Remove/disable "Add my child" buttons**
  - Parent portal (parent/index.tsx lines 102, 154)
  - Optional: Update to "Admins manage family"

- [ ] **Verify parent session creation works for admin-provisioned accounts**
  - Test: Admin creates parent → Parent logs in → Session created ✅

- [ ] **Verify child credential generation works in admin workflow**
  - Test: Admin creates child → tati_id and child_pin generated ✅

- [ ] **Update messaging/copy**
  - Homepage: "Parents: Contact your administrator"
  - Parent portal: "Admins manage your family"

- [ ] **No database changes required**
  - Firestore schema unchanged
  - Firebase user structure unchanged
  - Session mechanism unchanged

- [ ] **Optional: Modify `ensureFamily()` behavior**
  - Current: Auto-creates on first page load (works for both flows)
  - Recommended: Admin creates during provisioning
  - Decision: TBD based on admin workflow design

---

## UNAFFECTED CODE

The following code requires **no changes**:

✅ Parent login and session creation  
✅ Child login (tati_id + pin)  
✅ Parent dashboard viewing  
✅ Child learning journey  
✅ Family data queries  
✅ Firestore RLS rules  
✅ Firebase authentication setup  
✅ Analytics infrastructure  
✅ Facilitator authentication

---

## NEXT STEPS

1. **Design Phase B**: Admin provisioning UI/workflow
2. **Design Phase C**: Transition plan for existing self-signed-up parents
3. **Implementation**: Gate the routes identified above
4. **Testing**: Verify admin provisioning flow works with existing code
5. **Documentation**: Update user guides and admin docs
