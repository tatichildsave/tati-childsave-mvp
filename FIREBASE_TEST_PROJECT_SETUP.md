# Firebase Test Project Setup for Vercel Preview

**Purpose:** Create isolated Firebase test project for preview environment to prevent production data contamination during enrollment testing.

**Outcome:** Preview will use test project; production remains untouched.

---

## Part 1: Create Firebase Test Project in Console

### Step 1.1: Create New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** or **"Create project"**
3. Project name: **`tati-childsave-test`** (or similar clearly marked as test)
4. Enable Google Analytics: **No** (not needed for testing)
5. Click **"Create project"**
6. Wait for project to be created (1-2 minutes)

### Step 1.2: Enable Firebase Authentication

1. In Firebase Console, go to **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Enable **Email/Password** authentication:
   - Click "Email/Password"
   - Toggle "Enable" to ON
   - Keep "Password account signup" disabled for test (admin-only)
   - Click "Save"

### Step 1.3: Create Firestore Database

1. Go to **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Select region: **"nam5" (us-central1)** (same as production)
4. Security rules: Start in **"Test mode"** (allows read/write for testing)
5. Click **"Enable"**
6. Wait for database to be created (1-2 minutes)

### Step 1.4: Copy Test Project Credentials

1. Go to **"Project settings"** (gear icon, top left)
2. Click **"Service accounts"** tab
3. Select **"Node.js"** (already selected)
4. Click **"Generate new private key"**
   - File `tati-childsave-test-key.json` downloads to your computer
   - **KEEP THIS FILE SECURE** — contains admin credentials
   - Do NOT commit to Git

5. Go to **"General"** tab (same settings page)
6. Note these values:
   - **Project ID:** `tati-childsave-test` (or your chosen name)
   - **Web API Key:** Listed under "Your web app"
   - **Auth Domain:** `tati-childsave-test.firebaseapp.com` (auto-generated)

### Step 1.5: Create Test Admin User (Optional)

In Firebase Console, **Authentication** → **Users**:
1. Click **"Add user"**
2. Email: `admin@test.local`
3. Password: (any test password, you won't use it in preview)
4. Click **"Add user"**

---

## Part 2: Vercel Environment Variables for Test Project

### Step 2.1: Update Vercel Project Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `tati-childsave-mvp` project
3. Go to **"Settings"** → **"Environment Variables"**
4. Add/update these for preview environment only:

**For Preview Environment (Important: Set scope to "Preview" only):**

```
VITE_FIREBASE_API_KEY = [Test project Web API Key from Step 1.4]
VITE_FIREBASE_AUTH_DOMAIN = tati-childsave-test.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = tati-childsave-test
VITE_FIREBASE_STORAGE_BUCKET = tati-childsave-test.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = [from test project settings]
VITE_FIREBASE_APP_ID = [from test project settings]

FIREBASE_PROJECT_ID = tati-childsave-test
FIREBASE_SERVICE_ACCOUNT = [contents of tati-childsave-test-key.json]
```

### Step 2.2: Find Test Project Configuration Values

1. Go back to Firebase Console → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Find or create a **Web** app:
   - If exists, click it to see config
   - If not, click **"Add app"** → **"Web"** → Name: "test-web"
   - Config object shows all needed values:

```javascript
{
  apiKey: "AIzaSyB...",           // VITE_FIREBASE_API_KEY
  authDomain: "tati-childsave-test.firebaseapp.com",
  projectId: "tati-childsave-test",
  storageBucket: "tati-childsave-test.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
}
```

3. Copy each value into Vercel environment variables

### Step 2.3: Encode Service Account for Vercel

1. Open `tati-childsave-test-key.json` in text editor
2. Copy entire JSON content
3. In Vercel, paste into `FIREBASE_SERVICE_ACCOUNT` field
4. Vercel automatically handles encoding

---

## Part 3: Update Local .env.local for Testing (Optional)

To test locally with the test project before Vercel deployment:

**.env.local (NEVER commit this file):**
```
# Test Firebase Project (for local testing with emulator)
VITE_FIREBASE_API_KEY=tati_childsave_test_api_key
VITE_FIREBASE_AUTH_DOMAIN=tati-childsave-test.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tati-childsave-test
VITE_FIREBASE_STORAGE_BUCKET=tati-childsave-test.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...

FIREBASE_PROJECT_ID=tati-childsave-test
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"tati-childsave-test",...}

# Use emulator (optional for local testing)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

---

## Part 4: Firestore Security Rules for Test Project

In Firebase Console → **Firestore Database** → **"Rules"** tab:

Replace rules with this test-friendly version:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all read/write in test mode for testing
    // In production, these would be restrictive
    match /{document=**} {
      allow read, write: if request.auth != null || request.auth == null;
    }
  }
}
```

(Or keep "Test mode" enabled, which allows all access)

---

## Part 5: Fail-Closed Environment Checks

Add to server-side code to prevent misconfigurations:

**File: `src/integrations/firebase/admin.server.ts`**

Add these checks after Admin SDK initialization:

```typescript
/**
 * Verify that server-side Firebase configuration matches environment intent.
 * Fail-closed: Throws error if production/preview mismatch detected.
 */
function verifyProjectConfiguration() {
  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const isProduction = process.env["VERCEL_ENV"] === "production";
  
  // Fail-closed: Prevent production provisioning with wrong project
  if (isProduction) {
    if (projectId !== "tatichildsavemvp") {
      throw new Error(
        `[FAIL-CLOSED] Production environment detected but FIREBASE_PROJECT_ID is "${projectId}". ` +
        `Production must use "tatichildsavemvp" project. Aborting to prevent data loss.`
      );
    }
  }
  
  // Fail-closed: Prevent preview provisioning with production project
  if (!isProduction && process.env["VERCEL_ENV"] === "preview") {
    if (projectId === "tatichildsavemvp") {
      throw new Error(
        `[FAIL-CLOSED] Preview environment detected but FIREBASE_PROJECT_ID is "${projectId}". ` +
        `Preview must use "tati-childsave-test" project to prevent production data contamination. ` +
        `Configure FIREBASE_PROJECT_ID in Vercel preview environment variables.`
      );
    }
  }
  
  console.log(`[Firebase] Project configuration verified: ${projectId} for ${isProduction ? "production" : "preview"}`);
}

// Call after Admin SDK initialization
verifyProjectConfiguration();
```

---

## Part 6: Verification Checklist

After setting up test project:

- [ ] Test project created in Firebase Console: `tati-childsave-test`
- [ ] Authentication enabled (Email/Password)
- [ ] Firestore Database created
- [ ] Service account key downloaded: `tati-childsave-test-key.json`
- [ ] Vercel environment variables updated (Preview scope only):
  - [ ] VITE_FIREBASE_API_KEY
  - [ ] VITE_FIREBASE_AUTH_DOMAIN (matches test project)
  - [ ] VITE_FIREBASE_PROJECT_ID = `tati-childsave-test`
  - [ ] FIREBASE_PROJECT_ID = `tati-childsave-test` (server-side)
  - [ ] FIREBASE_SERVICE_ACCOUNT (encoded test key)
- [ ] Fail-closed checks added to `admin.server.ts`
- [ ] Firestore rules set to test-friendly mode
- [ ] Local `.env.local` NOT committed to Git
- [ ] Production `main` branch still uses `tatichildsavemvp` project

---

## Part 7: Verification After Deployment

Once Vercel preview deploys with test project:

1. **Check Vercel deployment logs:**
   - Look for: `[Firebase] Project configuration verified: tati-childsave-test for preview`
   - Should NOT see: `[FAIL-CLOSED]` error message

2. **During manual testing:**
   - Create test families in preview
   - Verify they appear in test project Firestore (not production)
   - Do NOT appear in production Firestore

3. **After manual testing:**
   - Delete test families from test project only
   - Production `tatichildsavemvp` project remains unchanged

---

## Safety Guarantees

✅ **Production protection:** Fail-closed checks prevent accidental provisioning to production  
✅ **Data isolation:** Preview uses separate Firebase project entirely  
✅ **Credential isolation:** Test project credentials never in production code  
✅ **Rollback:** If anything wrong, delete test project; production untouched  
✅ **Clean separation:** Different Project IDs prevent any mixing

---

## Troubleshooting

**Preview shows 403 API_KEY_HTTP_REFERRER_BLOCKED:**
- Add Vercel preview domain to test project authorized referrers:
  - Firebase Console → "Settings" → "Authorized domains"
  - Add: `*.vercel.app` or specific preview URL

**Preview fails to connect to test Firestore:**
- Verify `FIREBASE_PROJECT_ID` is exactly `tati-childsave-test` (case-sensitive)
- Check Firestore rules allow test access (Test mode enabled)

**Fail-closed check fails in preview:**
- This is intentional—it means configuration is correct!
- Error message indicates which env var needs fixing
- Fix in Vercel → Settings → Environment Variables

**Production deployment should still work:**
- `main` branch uses production `tatichildsavemvp` project
- Production environment variables remain unchanged
- Fail-closed checks will pass for production

---

## Summary

After completing these steps:
1. Preview environment has completely isolated Firebase test project
2. Production remains on `tatichildsavemvp`
3. Fail-closed checks prevent misconfigurations
4. No possibility of preview provisioning affecting production
5. Safe for comprehensive enrollment testing on Vercel preview

Next: Restore comprehensive integration tests and verify all pass.
