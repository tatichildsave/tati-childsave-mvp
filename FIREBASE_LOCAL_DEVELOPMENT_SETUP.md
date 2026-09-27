# Firebase Local Development Setup - TATI ChildSave MVP

## Overview

The TATI ChildSave MVP uses Firebase for backend services during local development and production deployment:

- **Cloud Firestore**: NoSQL database for application data
- **Firebase Authentication**: User identity management
- **Firestore Security Rules**: Server-side authorization enforcement

---

## Current Configuration

### Project Credentials

**Firebase Project**: `tatichildsavemvp`

- **Project ID**: `tatichildsavemvp`
- **Auth Domain**: `tatichildsavemvp.firebaseapp.com`
- **Firestore**: `firestore.googleapis.com`
- **Storage Bucket**: `tatichildsavemvp.firebasestorage.app`

### Environment Variables (`.env.local`)

Create a `.env.local` file in the project root with the following Firebase web configuration:

```bash
# Firebase Web App Configuration (Client-side only - safe for public repositories)
VITE_FIREBASE_API_KEY=AIzaSyBTCuKIWxzuUoIon9LMllhp82RjwiUmJsA
VITE_FIREBASE_AUTH_DOMAIN=tatichildsavemvp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tatichildsavemvp
VITE_FIREBASE_STORAGE_BUCKET=tatichildsavemvp.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1040851280846
VITE_FIREBASE_APP_ID=1:1040851280846:web:999b5c9c9c502608f0819f
VITE_FIREBASE_MEASUREMENT_ID=G-03THSKYE7X

# Firebase Admin SDK (Server-side only - NEVER commit this in production)
FIREBASE_PROJECT_ID=tatichildsavemvp

# Firebase Emulator Configuration (Local Development Only)
# Uncomment these to use the local Firebase Emulator Suite instead of cloud Firebase
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

**⚠️ Important**: The `.env.local` file is in `.gitignore`. Do NOT commit environment variables with real credentials.

---

## Local Development Workflow

### Option A: Using Firebase Emulator (Recommended for Local Development)

The **Firebase Emulator Suite** provides local implementations of Firestore and Authentication for isolated testing.

#### Prerequisites

- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`firebase --version` should work)
- Java Runtime Environment (JRE) installed (required by Firestore Emulator)
- Ports 8080 (Firestore), 9099 (Auth), 4000 (Emulator UI), 4400 (Hub) free

#### Starting the Emulator

1. **Ensure emulator configuration exists** in `firebase.json`:

   ```json
   {
     "firestore": {
       "rules": "firestore.rules"
     },
     "emulators": {
       "auth": {
         "port": 9099
       },
       "firestore": {
         "port": 8080
       },
       "ui": {
         "enabled": true,
         "port": 4000
       }
     }
   }
   ```

   This file already exists in the project.

2. **Uncomment emulator variables in `.env.local`**:

   ```bash
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   ```

3. **Start the emulator** in one terminal:

   ```bash
   firebase emulators:start --only firestore,auth --project demo-tati
   ```

   Expected output:
   ```
   ✔ All emulators ready! It is now safe to connect your app.
   │ View Emulator UI at http://127.0.0.1:4000/
   
   ┌────────────────┬────────────────┬─────────────────────────────────┐
   │ Emulator       │ Host:Port      │ View in Emulator UI             │
   ├────────────────┼────────────────┼─────────────────────────────────┤
   │ Authentication │ 127.0.0.1:9099 │ http://127.0.0.1:4000/auth      │
   ├────────────────┼────────────────┼─────────────────────────────────┤
   │ Firestore      │ 127.0.0.1:8080 │ http://127.0.0.1:4000/firestore │
   └────────────────┴────────────────┴─────────────────────────────────┘
   ```

4. **Keep the emulator running** while developing. Firestore rules are automatically watched and reloaded from `firestore.rules` when the file changes.

5. **Start the development server** in another terminal:

   ```bash
   npm run dev
   ```

   The app will connect to the local emulator instead of cloud Firebase.

6. **Access the Emulator UI** at `http://127.0.0.1:4000/` to inspect Firestore data and auth state during development.

#### Running Tests with Emulator

Tests connect to the emulator automatically when the environment variables are set:

```bash
# Terminal 1: Start emulator
firebase emulators:start --only firestore,auth --project demo-tati

# Terminal 2: Run tests
npm test -- --run
```

**Note**: Tests can still run without the emulator, but Firebase/Firestore tests will fail with connection errors. If you see `ECONNREFUSED 127.0.0.1:8080`, the emulator isn't running.

---

### Option B: Using Cloud Firebase (Development Project)

If you prefer to test against the cloud Firebase project without the emulator:

1. **Comment out the emulator variables** in `.env.local`:

   ```bash
   # FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   # FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   # VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   # VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   ```

2. **Restart the development server**:

   ```bash
   npm run dev
   ```

3. The app will connect directly to the `tatichildsavemvp` Firebase project in the cloud.

**⚠️ Warning**: Cloud Firebase connection:
- Requires internet connectivity
- Modifies real project data (use separate dev/staging project for safety)
- Subject to Firebase quotas and billing
- Not suitable for unit testing Firestore Rules

---

## Firebase Architecture in TATI MVP

### Client SDK Integration

**File**: `src/integrations/firebase/client.ts`

Initializes Firebase app, authentication, and Firestore:

```typescript
// Get configured Firebase app
getFirebaseApp(): FirebaseApp

// Get Auth instance (browser only)
getFirebaseAuth(): Auth | null

// Get Firestore instance (browser only)
getFirebaseFirestore(): Firestore | null

// Get Storage instance (browser only)
getFirebaseStorage(): FirebaseStorage | null
```

**Emulator Support**: The client automatically detects `VITE_FIRESTORE_EMULATOR_HOST` and `VITE_FIREBASE_AUTH_EMULATOR_HOST` environment variables and connects to local emulators if set.

### Server-Side Admin SDK

**File**: `src/integrations/firebase/admin.server.ts`

Safe server-only initialization of Firebase Admin SDK:

```typescript
// Get Admin Auth instance (server only)
getFirebaseAdminAuth(): Auth

// Get Admin Firestore instance (server only)
getFirebaseAdminDb(): Firestore
```

**Emulator Support**: The admin SDK automatically respects `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` environment variables.

### Firestore Security Rules

**File**: `firestore.rules`

Enforces authorization at the server level:

- Family isolation (parents can only access own families)
- Child data protection (parents/facilitators cannot modify authoritative fields)
- Role escalation prevention (users cannot self-promote to admin)
- School-level access control (H3.3 feature)

**Important**: Security rules are always enforced. There is no `allow read, write: if true` development bypass.

---

## Data Collections

When using the emulator, data is stored locally and is cleared when the emulator stops. No persistent cloud storage occurs during local development.

### Key Collections in Firestore

- `users/{uid}` - User profiles (parents, facilitators, admins, children)
- `families/{familyId}` - Family records
- `families/{familyId}/members/{uid}` - Family membership
- `families/{familyId}/children/{childId}` - Child profiles
- `academyCohorts/{cohortId}` - School cohorts (with optional `schoolId` field for H3.3)
- `facilitatorAssignments/{assignmentId}` - Facilitator-child assignments (with optional `schoolId` field for H3.3)
- `schools/{schoolId}` - School records (H3.3)
- `schools/{schoolId}/admins/{uid}` - School administrator roles (H3.3)

---

## Common Issues & Troubleshooting

### Issue: `Missing Firebase environment variable: VITE_FIREBASE_API_KEY`

**Cause**: `.env.local` file is missing or incomplete.

**Solution**:
1. Create `.env.local` in the project root (see "Environment Variables" section above)
2. Include all required `VITE_FIREBASE_*` variables
3. Restart the dev server: `npm run dev`

### Issue: `ECONNREFUSED 127.0.0.1:8080`

**Cause**: Firebase Emulator is not running, or it crashed.

**Solution**:
1. Start the emulator:
   ```bash
   firebase emulators:start --only firestore,auth --project demo-tati
   ```
2. Verify ports are free:
   ```bash
   lsof -i :8080    # Firestore
   lsof -i :9099    # Auth
   ```
3. If ports are in use, kill the processes:
   ```bash
   # macOS/Linux
   kill -9 <PID>
   
   # Windows PowerShell
   Stop-Process -Id <PID> -Force
   ```

### Issue: Tests timeout when connecting to emulator

**Cause**: Emulator is slow to initialize or connection pool is exhausted.

**Solution**:
1. Ensure the emulator has fully started (look for "All emulators ready!")
2. Check that `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` are set in `.env.local`
3. Increase test timeout or reduce parallel test execution

### Issue: Firestore Rules validation warnings in emulator logs

**Example warning**:
```
firestore.rules:27:28 - WARNING Invalid function name: exists.
```

**Cause**: Firestore Emulator may not support all v2 rule language features.

**Solution**:
- These are warnings, not errors. Rules still function correctly.
- Ensure `firebase.rules` syntax is correct by running `firebase deploy --dry-run`
- For production deployments, resolve all warnings before deploying

---

## Security Considerations

### Never Commit Secrets

- ✅ Safe to commit: `VITE_FIREBASE_*` variables (web SDK config is public)
- ❌ Never commit: Service account keys, Admin SDK credentials
- ✅ `.env.local` is in `.gitignore` and won't be committed

### Firestore Rules Enforcement

- ✅ Rules are enforced at the database level
- ✅ Multi-tenant isolation is enforced on read and write operations
- ✅ No hardcoded data access bypasses
- ❌ Client-side checks are secondary only; never rely on them for security

### Local Emulator Data Privacy

- All data in the emulator is stored locally and cleared on emulator restart
- No data leaves the local machine during emulator operation
- Safe for development with sensitive test data

---

## Development Server Configuration

The development server is configured to:

1. **Load environment variables** from `.env.local` at startup
2. **Inject variables** via Vite's `import.meta.env` API
3. **Restart automatically** when `.env.local` is modified
4. **Support hot module replacement (HMR)** for Firebase-dependent routes

Start development:

```bash
npm run dev
```

The server runs on `http://localhost:8081` (or configured port).

---

## Production Deployment

**NOT YET IMPLEMENTED** - This MVP focuses on local development.

When ready for production:

1. Use `tatichildsavemvp` Firebase project (or create separate prod project)
2. Set production environment variables in deployment platform (Vercel, Netlify, Heroku, etc.)
3. Deploy Firestore rules: `firebase deploy --only firestore:rules`
4. Deploy backend functions (if using Cloud Functions)
5. Monitor Firestore logs for errors

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firebase Web SDK Reference](https://firebase.google.com/docs/reference/js)
- [Firestore Query Reference](https://firebase.google.com/docs/firestore/query-data/queries)

---

## Next Steps

1. **Start the emulator** (if not already running)
2. **Start the dev server** (`npm run dev`)
3. **Navigate to app** at `http://localhost:8081`
4. **Run tests** (`npm test -- --run`)
5. **Access Emulator UI** at `http://127.0.0.1:4000/` to inspect data

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-27  
**Firebase SDK**: v12.19.0  
**Firestore Emulator**: Latest (from Firebase CLI)
