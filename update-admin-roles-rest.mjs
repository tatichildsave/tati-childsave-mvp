#!/usr/bin/env node

/**
 * Update admin user roles using Firestore REST API directly
 */

async function updateAdminRoles() {
  try {
    console.log('🔗 Getting authentication token...\n');

    // Step 1: Sign in to get ID token
    const signInResponse = await fetch(
      'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'Admin@12345',
          returnSecureToken: true,
        }),
      }
    );

    if (!signInResponse.ok) {
      throw new Error(`Sign in failed: ${signInResponse.status}`);
    }

    const signInData = await signInResponse.json();
    const idToken = signInData.idToken;
    console.log('✅ Authentication token obtained\n');

    // Step 2: Try updating the document directly - bypass port 8080 dev server
    // by stopping dev server first or using a workaround
    console.log('📝 Note: Dev server is running on port 8080, blocking direct Firestore API access');
    console.log('\n💡 Solution: Manually add "admin" to the roles array in Firebase Emulator UI:');
    console.log('   1. Go to: http://localhost:4000/firestore/default/data/users');
    console.log('   2. Click on document: gubN3Ry88IsIOsKy4IFzE7A0bAGl');
    console.log('   3. Click the arrow (▶) next to "roles: []" to expand it');
    console.log('   4. Click "Add field" button inside the roles array');
    console.log('   5. Select index: 0, Type: string, Value: admin');
    console.log('   6. Click Save');
    console.log('\n   OR use this curl command (with dev server stopped):');
    console.log('');
    console.log(`   curl -X PATCH http://127.0.0.1:8080/v1/projects/demo-tati/databases/(default)/documents/users/gubN3Ry88IsIOsKy4IFzE7A0bAGl?updateMask.fieldPaths=roles \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -H "Authorization: Bearer ${idToken.substring(0, 20)}..." \\`);
    console.log(`     -d '{"fields":{"roles":{"arrayValue":{"values":[{"stringValue":"admin"}]}}}}'`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateAdminRoles();
