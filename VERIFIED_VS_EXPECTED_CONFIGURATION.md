# Verified vs. Expected Configuration — Clear Distinctions

**Purpose:** Clarify what HAS been verified in the repository vs. what MUST be configured/verified in production  
**Critical:** Do not assume expected configuration = verified production fact

---

## Configuration Summary Table

| Configuration | Verified? | Where/How Verified | Expected Value | Actual Production Value | Action Needed |
|---------------|-----------|-------------------|-----------------|------------------------|-----------------|
| **Repository: Client Firebase Config** | ✅ YES | Code inspection (client.ts) | `VITE_FIREBASE_PROJECT_ID = tatichildsavemvp` | ⏳ TBD | Verify in Vercel env vars |
| **Repository: Server Firebase Config** | ✅ YES | Code inspection (admin.server.ts) | `FIREBASE_PROJECT_ID = tatichildsavemvp` | ⏳ TBD | Verify in Vercel env vars |
| **Repository: Admin SDK Initialization** | ✅ YES | Code inspection (admin.server.ts line 29-60) | Reads `FIREBASE_PROJECT_ID` env var | ⏳ TBD | Confirm works in production |
| **Repository: Authorization Check** | ✅ YES | Code inspection (provisioning.server.ts line 20-39) | `roles.includes("admin")` check enforced | ✅ Verified | Passes all 28 tests |
| **Repository: Firestore Rules** | ✅ YES | Code inspection (firestore.rules) | Users cannot self-assign admin role | ✅ Verified | Passes all 28 tests |
| **Vercel: `VITE_FIREBASE_API_KEY`** | ❌ NO | Not accessible (secret) | Production Firebase web API key | ❓ UNKNOWN | User must verify |
| **Vercel: `VITE_FIREBASE_PROJECT_ID`** | ❌ NO | Not accessible (secret) | `tatichildsavemvp` | ❓ UNKNOWN | User must verify |
| **Vercel: `FIREBASE_PROJECT_ID`** | ❌ NO | Not accessible (secret) | `tatichildsavemvp` | ❓ UNKNOWN | User must verify |
| **Vercel: `FIREBASE_SERVICE_ACCOUNT`** | ❌ NO | Not accessible (secret) | Valid service account JSON | ❓ UNKNOWN | User must verify |
| **Firestore: Admin Account Role** | ❌ NO | Not accessible (live production) | User UID has `roles: ["admin"]` in `/users/{uid}` | ❓ UNKNOWN | User must verify NOW |
| **Firestore: Admin Account Email** | ❌ NO | Not accessible (live production) | Admin email matches test account | ❓ UNKNOWN | User must verify NOW |
| **Firebase: API Key Referrer Restrictions** | ❌ NO | Not accessible (Google Cloud Console) | Domain authorized in API key | ❓ UNKNOWN | User must configure |
| **Vercel: Production Deployment** | ❌ NO | Not deployed yet | Code deployed to `tati-childsave-mvp.vercel.app` | ❓ UNKNOWN | Pending deployment |
| **Firestore: No Test Data Exists** | ❓ PARTIAL | Assumed clean (not verified) | No TEST-PILOT-* families in production | ❓ UNKNOWN | User should verify |

---

## Repository Configuration (✅ VERIFIED)

### What We Verified
**In `src/integrations/firebase/admin.server.ts`:**
- ✅ Reads `FIREBASE_PROJECT_ID` environment variable (line 29)
- ✅ Validates project ID matches environment (line 110-119)
- ✅ Calls Firebase Admin SDK with configured project
- ✅ Service account JSON is parsed and used for credentials (line 45-52)

**In `src/integrations/firebase/client.ts`:**
- ✅ Reads `VITE_FIREBASE_PROJECT_ID` environment variable (line 23)
- ✅ Returns Firebase config object with project ID
- ✅ No hardcoded project IDs; all from environment

**In `src/lib/backend/provisioning.server.ts`:**
- ✅ `verifyAdminAuthorization()` checks `roles.includes("admin")` (line 36)
- ✅ Queries Firestore `/users/{uid}` document (line 30)
- ✅ Throws error if admin role missing (line 37)
- ✅ Cannot be bypassed from client

**In `firestore.rules`:**
- ✅ Line 71: `request.resource.data.roles == resource.data.roles` — users cannot modify roles
- ✅ Only admins can update other users' documents (line 67-68)

### Evidence
- ✅ Code inspection: Repository files reviewed and confirmed
- ✅ Build: Compilation succeeds with zero TypeScript errors
- ✅ Tests: 28 tests pass confirming authorization logic works correctly

### What This Means
- ✅ **Repository is correctly configured** to use Firestore admin roles
- ✅ **Authorization cannot be bypassed** at code level
- ✅ **Safe to deploy** from a code perspective

### What This DOES NOT Mean
- ❌ Does NOT mean Vercel env vars are configured correctly
- ❌ Does NOT mean admin account exists in production with correct role
- ❌ Does NOT mean Firebase API key is properly configured
- ❌ Does NOT mean production deployment will work

---

## Vercel Production Environment Variables (❌ NOT VERIFIED — User Must Check)

### What We CANNOT Verify
- ❌ `VITE_FIREBASE_API_KEY` value (secret, hidden in Vercel)
- ❌ `VITE_FIREBASE_PROJECT_ID` value (secret, hidden in Vercel)
- ❌ `FIREBASE_PROJECT_ID` value (secret, hidden in Vercel)
- ❌ `FIREBASE_SERVICE_ACCOUNT` value (secret, hidden in Vercel)

### Expected Values
These are what SHOULD be configured in Vercel (Production scope):

```
VITE_FIREBASE_API_KEY=
  → Firebase web API key from project tatichildsavemvp
  → From Firebase Console → Project Settings → General

VITE_FIREBASE_AUTH_DOMAIN=
  → tatichildsavemvp.firebaseapp.com
  → From Firebase Console → Project Settings

VITE_FIREBASE_PROJECT_ID=
  → tatichildsavemvp
  → Exact project ID from Firebase

VITE_FIREBASE_STORAGE_BUCKET=
  → tatichildsavemvp.appspot.com
  → From Firebase Console → Storage

VITE_FIREBASE_MESSAGING_SENDER_ID=
  → Sender ID from Firebase Console

VITE_FIREBASE_APP_ID=
  → App ID from Firebase Console

FIREBASE_PROJECT_ID=
  → tatichildsavemvp
  → MUST match VITE_FIREBASE_PROJECT_ID

FIREBASE_SERVICE_ACCOUNT=
  → Full service account JSON from Firebase Console
  → Key file downloaded from Google Cloud Console
  → Contains: type, project_id, private_key_id, private_key, etc.
```

### User Action Required (BEFORE DEPLOYMENT)

1. **Verify in Vercel Console:**
   - Go to Settings → Environment Variables
   - Set scope to "Production"
   - Confirm all 8 variables above are present
   - ⚠️ Cannot see values (encrypted); only verify they exist

2. **Verify Values in Firebase Console:**
   - Go to Firebase Console → Project Settings → General
   - Copy all displayed values
   - Cross-reference with Vercel env var names above
   - Example: Firebase shows `Project ID: tatichildsavemvp`
     → Vercel should have `FIREBASE_PROJECT_ID=tatichildsavemvp`
     → Vercel should have `VITE_FIREBASE_PROJECT_ID=tatichildsavemvp`

3. **Verify Service Account:**
   - Go to Google Cloud Console → Service Accounts
   - Find account used for FIREBASE_SERVICE_ACCOUNT
   - Confirm it's a key for project `tatichildsavemvp`
   - Confirm `project_id` field in JSON matches: `tatichildsavemvp`

---

## Firestore Admin Account (❌ NOT VERIFIED — User Must Verify NOW)

### Expected Firestore Schema

**Your admin account should have this structure in Firestore:**

```
Collection: /users
  Document ID: {your-firebase-uid}
    Field: uid = {same as document ID}
    Field: email = your-admin-email@domain.com
    Field: displayName = "Your Display Name"
    Field: roles = ["admin"]  ← CRITICAL: Must contain "admin"
    Field: status = "active"
    Field: createdAt = Timestamp
    Field: updatedAt = Timestamp
```

### User Action Required (BEFORE DEPLOYMENT)

1. **Find your Firebase UID:**
   - Firebase Console → Authentication → Users
   - Find your admin account (by email)
   - Click on it; note the UID (long alphanumeric string)

2. **Verify Firestore document:**
   - Firebase Console → Firestore → Collections
   - Click on `/users` collection
   - Find the document with your UID
   - Verify the document contains:
     - ✅ `roles` field is an array
     - ✅ `roles` array contains the string `"admin"`
     - ✅ `status` field is `"active"`

3. **If document is missing or incorrect:**
   - ❌ **STOP — Do NOT deploy yet**
   - Create or fix the document manually:
     ```
     Collection: /users
     Document ID: [your-uid]
     Data:
     {
       "uid": "[your-uid]",
       "email": "[your-admin-email]",
       "displayName": "[your name]",
       "roles": ["admin"],
       "status": "active",
       "createdAt": [current timestamp],
       "updatedAt": [current timestamp]
     }
     ```

### Why This Matters
- ❌ If your account lacks `roles: ["admin"]`, you cannot provision families
- ❌ Every provisioning function checks this: `roles.includes("admin")`
- ❌ Firestore rules also enforce admin-only operations
- ✅ Without this, smoke test will fail immediately

---

## Firebase API Key Referrer Configuration (❌ NOT VERIFIED — User Must Configure)

### Current State (Inferred, Not Verified)
**Hypothesis based on error reported:**
- Firebase API key has HTTP referrer restrictions
- Authorized referrers likely include: `https://tatichildsavemvp.firebaseapp.com/`
- Likely does NOT include: `https://tati-childsave-mvp.vercel.app/`

### Expected Configuration (What It Should Be)

**Google Cloud Console → APIs & Services → Credentials**
- Find API Key for Firebase project `tatichildsavemvp`
- HTTP Referrers restriction should include:
  - ✅ `https://tatichildsavemvp.firebaseapp.com/`
  - ✅ `https://tati-childsave-mvp.vercel.app/`

### Why This Matters
- ⚠️ If not configured: Old admin dashboard will show 403 referrer error
- ✅ Does NOT block new enrollment workflow (uses server functions)
- ✅ Can be fixed post-deployment if needed

### User Action (OPTIONAL pre-deployment, REQUIRED if admin dashboard is tested)
- See [API_KEY_REFERRER_INVESTIGATION.md](API_KEY_REFERRER_INVESTIGATION.md) for detailed instructions

---

## Production Deployment Status (❌ NOT DEPLOYED YET)

### What Happens at Deployment
1. Code from branch is merged into `main`
2. `main` branch is pushed to GitHub
3. Vercel auto-detects push and starts deployment
4. Vercel reads Environment Variables from Production scope
5. Vercel runs build: `npm run build`
6. If build succeeds, deployment is live
7. If build fails, deployment is rejected; `main` branch is reverted

### Potential Deployment Failures

| Failure | Cause | Prevention |
|---------|-------|-----------|
| **Build fails** | Missing/incorrect env vars | Verify Vercel env vars before pushing |
| **Runtime fails** | Admin account missing role | Verify Firestore document before pushing |
| **Enrollment fails at Step 2** | API key referrer issue | Configure API key referrer (can be post-deployment) |
| **Firestore writes fail** | Service account permissions | Verify service account key works |

### Pre-Deployment Verification Checklist

- [ ] **Vercel Environment Variables** (Production scope):
  - [ ] `VITE_FIREBASE_PROJECT_ID = tatichildsavemvp`
  - [ ] `FIREBASE_PROJECT_ID = tatichildsavemvp`
  - [ ] `FIREBASE_SERVICE_ACCOUNT` is valid JSON
  - [ ] All 8 Firebase variables are present

- [ ] **Firestore Admin Account:**
  - [ ] Your UID is documented
  - [ ] Firestore document `/users/{your-uid}` exists
  - [ ] Document has `roles: ["admin"]`
  - [ ] Document has `status: "active"`

- [ ] **Firebase API Key:**
  - [ ] (OPTIONAL) Add `https://tati-childsave-mvp.vercel.app/` to referrer list
  - [ ] (Can be done post-deployment if needed)

---

## Summary: What You Must Verify Right Now

### Before Deployment Approval

**1. Verify Vercel Environment Variables**
```
Vercel Console → Settings → Environment Variables (Production scope)
Check that these variables exist (values are hidden):
✅ VITE_FIREBASE_API_KEY
✅ VITE_FIREBASE_PROJECT_ID
✅ FIREBASE_PROJECT_ID
✅ FIREBASE_SERVICE_ACCOUNT
```

**2. Verify Firestore Admin Account**
```
Firebase Console → Firestore → Collections → /users → {your-uid}
Document MUST contain:
✅ roles = ["admin"]
✅ status = "active"
✅ email = your admin email
```

**3. (Optional) Configure API Key Referrer**
```
Google Cloud Console → APIs & Services → Credentials
Add to HTTP Referrers:
✅ https://tati-childsave-mvp.vercel.app/
```

---

## Deployment Safety Assessment

| Item | Verified | Expected | Risk |
|------|----------|----------|------|
| Code/Authorization | ✅ YES | ✅ Correct | 🟢 None |
| Firestore Rules | ✅ YES | ✅ Correct | 🟢 None |
| Repository Changes | ✅ YES | ✅ Safe | 🟢 None |
| Vercel Env Vars | ❌ NO | ⏳ TBD | 🟡 Medium |
| Admin Account Role | ❌ NO | ⏳ TBD | 🔴 High |
| API Key Referrer | ❌ NO | ⏳ TBD | 🟡 Medium |
| Production Deployment | ❌ NO | ⏳ Pending | 🟡 Medium |

**Deployment readiness: PENDING your verification of 3 items above.**

