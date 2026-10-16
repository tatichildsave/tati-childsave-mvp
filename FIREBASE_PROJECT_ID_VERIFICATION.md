# Firebase Project ID Configuration

## Project Recognized

**Firebase Project ID: `tatichildsavemvp`**

---

## Configuration Sources

### 1. **Local Firebase Configuration** (.firebaserc)
```json
{
  "projects": {
    "default": "tatichildsavemvp"
  }
}
```

### 2. **Server-Side (Admin SDK)**
- **Environment Variable**: `FIREBASE_PROJECT_ID`
- **Fallback Value**: `"demo-tati"` (if env var not set)
- **Production Requirement**: Must be `"tatichildsavemvp"`
- **File**: `src/integrations/firebase/admin.server.ts`

**Verification Logic**:
```typescript
const projectId = process.env["FIREBASE_PROJECT_ID"];

// In production (VERCEL_ENV === "production"):
if (projectId !== "tatichildsavemvp") {
  throw new Error("[FAIL-CLOSED] Production environment detected but FIREBASE_PROJECT_ID is \"${projectId}\". Production MUST use \"tatichildsavemvp\" project.");
}
```

### 3. **Client-Side (Web SDK)**
- **Environment Variable**: `VITE_FIREBASE_PROJECT_ID`
- **Used In**: Firebase Auth, Firestore client initialization
- **File**: `src/integrations/firebase/client.ts`

---

## Environment Variables Required

### For Vercel Production Deployment:

| Variable | Value | Purpose |
|----------|-------|---------|
| `FIREBASE_PROJECT_ID` | `tatichildsavemvp` | Server-side Admin SDK project identification |
| `VITE_FIREBASE_PROJECT_ID` | `tatichildsavemvp` | Client-side Web SDK project identification |
| `VITE_FIREBASE_API_KEY` | (from Firebase console) | Client authentication |
| `VITE_FIREBASE_AUTH_DOMAIN` | `tatichildsavemvp.firebaseapp.com` | Firebase Auth domain |
| `VITE_FIREBASE_STORAGE_BUCKET` | (from Firebase console) | Cloud Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (from Firebase console) | Messaging configuration |
| `VITE_FIREBASE_APP_ID` | (from Firebase console) | Firebase App ID |
| `FIREBASE_SERVICE_ACCOUNT` | (JSON from Firebase console) | Service account credentials for Admin SDK |

---

## Verification Checklist

- [x] `.firebaserc` correctly specifies `tatichildsavemvp` as default project
- [x] Server-side code requires `FIREBASE_PROJECT_ID=tatichildsavemvp` in production
- [x] Client-side code uses `VITE_FIREBASE_PROJECT_ID` from environment
- [ ] **ACTION REQUIRED**: Verify `FIREBASE_PROJECT_ID` is set in Vercel Production environment variables
- [ ] **ACTION REQUIRED**: Verify `VITE_FIREBASE_PROJECT_ID` is set in Vercel Production environment variables
- [ ] **ACTION REQUIRED**: Verify all other `VITE_FIREBASE_*` variables are set in Vercel

---

## Troubleshooting

### If Admin Login Still Fails:

1. **Check Vercel environment variables**:
   - Go to: Vercel Dashboard → Project → Settings → Environment Variables
   - Ensure `FIREBASE_PROJECT_ID` and all `VITE_FIREBASE_*` variables are set
   - Ensure they match the production Firebase project `tatichildsavemvp`

2. **Verify credentials**:
   - `FIREBASE_SERVICE_ACCOUNT` must be valid JSON from Firebase Console
   - Service account must have appropriate roles in `tatichildsavemvp` project

3. **Check Vercel logs**:
   - Look for: `[Firebase] Initialization diagnostics:` log
   - Should show: `hasFIREBASE_PROJECT_ID: true`, `projectIdValue: 'tatichildsavemvp'`

4. **Fallback behavior**:
   - If `FIREBASE_PROJECT_ID` is not set, code uses fallback `"demo-tati"`
   - In production, this will throw error (fail-closed protection)
