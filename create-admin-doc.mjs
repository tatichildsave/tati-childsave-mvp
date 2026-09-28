#!/usr/bin/env node

/**
 * Create admin Firestore document for existing auth user
 */

async function createAdminDoc() {
  try {
    console.log('🚀 Create Admin Firestore Document\n');

    const email = 'admin@test.com';
    const password = 'Admin@12345';
    const displayName = 'Test Admin';
    const projectId = 'demo-tati';

    // Step 1: Sign in to get ID token and UID
    console.log('Step 1: Signing in to get ID token...');
    const signInResponse = await fetch(
      'http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!signInResponse.ok) {
      const error = await signInResponse.json();
      throw new Error(`Sign in failed: ${error.error.message}`);
    }

    const authData = await signInResponse.json();
    const uid = authData.localId;
    const idToken = authData.idToken;
    console.log(`✅ Signed in as: ${uid}\n`);

    // Step 2: Create Firestore document
    console.log('Step 2: Creating Firestore admin document...');
    
    const createUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users?documentId=${uid}`;
    console.log(`   URL: ${createUrl}`);

    const createResponse = await fetch(createUrl, {
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
          status: { stringValue: 'pending' },  // Must be 'pending' for initial create
          roles: {
            arrayValue: {
              values: [{ stringValue: 'admin' }],
            },
          },
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log(`❌ Create failed (${createResponse.status}): ${error}\n`);
      throw new Error(`Firestore POST failed`);
    }

    console.log('✅ Firestore document created\n');
    console.log('🎉 Admin user ready!\n');
    console.log('📋 Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UID: ${uid}\n`);
    console.log('🌐 Sign in at: http://localhost:8080/admin-login\n');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

createAdminDoc();
