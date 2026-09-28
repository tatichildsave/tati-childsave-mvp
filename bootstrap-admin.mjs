#!/usr/bin/env node

/**
 * Bootstrap admin user setup
 * 1. Create Firebase Auth user
 * 2. Create Firestore document with admin role
 * Uses the emulator's permissive initial state
 */

async function bootstrapAdmin() {
  try {
    console.log('🚀 Bootstrap Admin User Setup\n');

    const email = 'admin@test.com';
    const password = 'Admin@12345';
    const displayName = 'Test Admin';
    const projectId = 'demo-tati';

    // Step 1: Create auth user
    console.log('Step 1: Creating Firebase Auth user...');
    const signUpResponse = await fetch(
      'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName,
          returnSecureToken: true,
        }),
      }
    );

    if (!signUpResponse.ok) {
      const error = await signUpResponse.json();
      throw new Error(`Auth signup failed: ${error.error.message}`);
    }

    const authData = await signUpResponse.json();
    const uid = authData.localId;
    const idToken = authData.idToken;
    console.log(`✅ Auth user created: ${uid}\n`);

    // Step 2: Create Firestore document with admin role
    console.log('Step 2: Creating Firestore admin document...');
    
    const createResponse = await fetch(
      `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users?documentId=${uid}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            uid: { stringValue: uid },
            email: { stringValue: email },
            displayName: { stringValue: displayName },
            status: { stringValue: 'active' },
            roles: {
              arrayValue: {
                values: [{ stringValue: 'admin' }],
              },
            },
          },
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log(`⚠️  Firestore POST (create) failed: ${createResponse.status}`);
      console.log(`Error: ${error}\n`);
      
      // Try PATCH instead if create fails
      console.log('Trying PATCH to update document...');
      const patchResponse = await fetch(
        `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=uid&updateMask.fieldPaths=email&updateMask.fieldPaths=displayName&updateMask.fieldPaths=status&updateMask.fieldPaths=roles`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            fields: {
              uid: { stringValue: uid },
              email: { stringValue: email },
              displayName: { stringValue: displayName },
              status: { stringValue: 'active' },
              roles: {
                arrayValue: {
                  values: [{ stringValue: 'admin' }],
                },
              },
            },
          }),
        }
      );

      if (!patchResponse.ok) {
        throw new Error(`PATCH also failed: ${patchResponse.status}`);
      }
    }
    
    console.log('✅ Firestore document created\n');
    console.log('🎉 Admin user bootstrapped successfully!\n');
    console.log('📋 Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UID: ${uid}\n`);
    console.log('🌐 Sign in at: http://localhost:8080/admin-login\n');

  } catch (error) {
    console.error('❌ Bootstrap failed:', error.message);
    process.exit(1);
  }
}

bootstrapAdmin();
