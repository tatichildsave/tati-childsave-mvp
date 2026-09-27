# H3.3 QA Authentication Troubleshooting Report

## Issue Summary
Academy login for QA facilitator account fails with: "Invalid email or password, or you don't have a facilitator account to access TATI Academy."

Browser console shows: `FirebaseError: Missing or insufficient permissions`

## Infrastructure Status

### ✅ Verified Working
- Supabase auth accounts created successfully (5 accounts)
- Supabase auth API responds correctly with valid JWT tokens
- Dev server running on localhost:8081
- Application routing to login pages works

### ❓ Unknown/Needs Verification
- QA user documents in production Firestore (created via Admin SDK, but unable to verify persistence)
- Supabase JWT ↔ Firestore rules evaluation
- request.auth.uid mapping from Supabase JWT

### ❌ Confirmed Failing
- Facilitator login via academy portal (authentication fails)
- Firestore rules evaluation when accessing /users/{uid} (permission denied error)

## Root Cause Analysis

### Theory 1: QA Data Not Persisting in Production Firestore
The QA documents were created using Firebase Admin SDK, but the creation might have failed silently due to:
- Credential issues
- Permission issues during creation
- Network failures

**Evidence**: Browser consistently receives "Missing or insufficient permissions" when trying to read /users/{uid}

**Solution**: Manually verify and recreate documents with explicit logging

### Theory 2: Firestore Rules Logic Issue  
The rules have a potential problem in the `userDoc()` function:
```javascript
function userDoc() {
  return signedIn()
    ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data
    : {};
}
```

If the document doesn't exist, `get()` returns nothing, and `.data` might fail.

**Issue**: The `hasRole(role)` function depends on `userDoc()` returning a valid object with a `roles` field. If the doc doesn't exist, this fails.

**Implication**: All role checks fail if the user document doesn't exist.

### Theory 3: Supabase JWT Not Being Recognized
The Firestore rules expect `request.auth` to be set correctly. This requires:
1. Supabase JWT to be passed in Authorization header
2. Firestore to trust Supabase as an OIDC provider
3. The `sub` claim in JWT to match request.auth.uid

**Possible Issues**:
- JWT not being passed by the application
- Firestore not configured to trust Supabase (though this worked in phase 2 verification)
- JWT sub claim not matching Supabase user UUID

## Recommendations

### Immediate Next Steps
1. **Verify Firestore data exists** - Query production Firestore directly to confirm 11 documents are there
2. **Check application logs** - Look at server-side logs for Firestore query errors
3. **Test with admin account** - Try authenticating as a user with admin role (different code path)
4. **Verify request.auth.uid** - Log what the application receives from Supabase JWT

### If Data Verification Fails
1. Recreate user documents with minimal fields
2. Manually test Firestore rule evaluation
3. Verify Supabase JWT is being passed correctly in Authorization header

### Alternative Approach
If authentication continues to fail:
- Re-enable Firebase Emulator
- Create test users via Firebase Auth Emulator
- Test H3.3 features using Firebase Auth instead of Supabase
- Document that production Supabase ↔ Firestore bridge needs further debugging

## Related Code

**Facilitator Auth Flow**: [src/lib/auth/facilitator-auth.functions.ts](src/lib/auth/facilitator-auth.functions.ts)
- loginFacilitator(): Calls supabase.auth.signInWithPassword() then checkFacilitatorStatus()
- checkFacilitatorStatus(): Reads /users/{uid} from Firestore and checks for "facilitator" role

**Academy Login**: [src/routes/academy/login.tsx](src/routes/academy/login.tsx)
- Uses loginFacilitator() function
- Error message shown if facilitator check fails

**Firestore Rules**: [firestore.rules](firestore.rules)
- hasRole(role) depends on userDoc().roles
- If user document doesn't exist, rules evaluation fails

## Status
🚨 **BLOCKED** - Cannot proceed with H3.3 QA until authentication issues are resolved
