#!/usr/bin/env node

/**
 * Script to create a test admin user via Firebase Emulator
 * Uses REST API calls to Auth and Firestore emulators
 *
 * Usage:
 *   node create-test-admin.mjs
 */

async function createTestAdmin() {
  console.log("🚀 Creating test admin user in Firebase Emulator...\n");

  try {
    // Step 1: Create user in Firebase Auth Emulator
    console.log("Step 1: Creating Firebase Auth user...");
    const authResponse = await fetch(
      "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key",
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

    const authData = await authResponse.json();
    if (!authResponse.ok) {
      throw new Error(`Auth error: ${authData.error?.message || "Unknown error"}`);
    }

    const uid = authData.localId;
    const idToken = authData.idToken;
    console.log(`✅ Auth user created with UID: ${uid}\n`);

    // Step 2: Create Firestore document via direct Firestore Emulator REST API
    console.log("Step 2: Creating Firestore admin document...");

    // First, we need to use curl or direct REST call to the Firestore emulator
    // The Firestore emulator on port 8080 conflicts with dev server
    // So we'll use a workaround by creating the document locally

    const firestorePayload = {
      fields: {
        uid: { stringValue: uid },
        email: { stringValue: "admin@test.com" },
        displayName: { stringValue: "Test Admin" },
        roles: { arrayValue: { values: [{ stringValue: "admin" }] } },
        status: { stringValue: "active" },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    };

    console.log(`\n⚠️  Cannot auto-create Firestore document (dev server on port 8080)`);
    console.log(`\nManual setup required:\n`);
    console.log(`1. Go to Firebase Emulator UI: http://localhost:4000`);
    console.log(`2. Navigate to Firestore tab`);
    console.log(`3. Create new document in 'users' collection with ID: ${uid}`);
    console.log(`4. Add the following data:\n`);
    console.log(JSON.stringify(firestorePayload.fields, null, 2));
    console.log(`\n---\n`);

    // Success message
    console.log("✨ Auth user created successfully!\n");
    console.log("📧 Email: admin@test.com");
    console.log("🔐 Password: Admin@12345");
    console.log(`📝 UID: ${uid}`);
    console.log("\n🌐 After setting up Firestore, sign in at: http://localhost:8080/admin-login\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createTestAdmin();
