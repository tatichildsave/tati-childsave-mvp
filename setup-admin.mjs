#!/usr/bin/env node

/**
 * Get admin UID and create Firestore document
 */

async function setupAdmin() {
  console.log("🚀 Setting up admin in Firebase Emulator...\n");

  try {
    // Step 1: Sign in to get the UID
    console.log("Step 1: Signing in to get UID...");
    const signInResponse = await fetch(
      "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@test.com",
          password: "Admin@12345",
          returnSecureToken: true,
        }),
      },
    );

    const signInData = await signInResponse.json();
    if (!signInResponse.ok) {
      throw new Error(`Sign in error: ${signInData.error?.message || "Unknown error"}`);
    }

    const uid = signInData.localId;
    const idToken = signInData.idToken;
    console.log(`✅ Signed in successfully with UID: ${uid}\n`);

    // Step 2: Create Firestore document
    // We'll POST to localhost:8080 but target the Firestore emulator
    // Since dev server is on 8080, we need to restart without dev server first
    // Or use a workaround

    console.log("Step 2: Creating Firestore admin document...");

    // Attempt direct Firestore API call
    const firestoreResponse = await fetch(
      `http://localhost:8080/v1/projects/demo-tati/databases/(default)/documents/users?documentId=${uid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            uid: { stringValue: uid },
            email: { stringValue: "admin@test.com" },
            displayName: { stringValue: "Test Admin" },
            roles: { arrayValue: { values: [{ stringValue: "admin" }] } },
            status: { stringValue: "active" },
            createdAt: { timestampValue: new Date().toISOString() },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
        }),
      },
    );

    if (!firestoreResponse.ok) {
      const errorText = await firestoreResponse.text();
      console.log(`⚠️  Could not create Firestore document (dev server blocking port 8080)`);
      console.log(`\n✅ Auth user is ready! Manual Firestore setup needed:\n`);
      console.log(`📝 UID: ${uid}`);
      console.log(`📧 Email: admin@test.com`);
      console.log(`🔐 Password: Admin@12345`);
      console.log(`\nNext steps:`);
      console.log(`1. Open: http://localhost:4000 (Firebase Emulator UI)`);
      console.log(`2. Go to Firestore tab`);
      console.log(`3. Create collection: users`);
      console.log(`4. Add document with ID: ${uid}`);
      console.log(`5. Add these fields:\n`);
      console.log(`   uid: ${uid}`);
      console.log(`   email: admin@test.com`);
      console.log(`   displayName: Test Admin`);
      console.log(`   roles: [admin]`);
      console.log(`   status: active`);
      console.log(`\n6. Then sign in at: http://localhost:8080/admin-login\n`);
      process.exit(0);
    }

    console.log(`✅ Firestore admin document created\n`);
    console.log("✨ Admin setup complete!\n");
    console.log("📧 Email: admin@test.com");
    console.log("🔐 Password: Admin@12345");
    console.log("\n🌐 Sign in at: http://localhost:8080/admin-login\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

setupAdmin();
