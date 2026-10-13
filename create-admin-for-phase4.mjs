#!/usr/bin/env node

/**
 * Create admin user for Phase 4 testing
 */

async function createAdmin() {
  try {
    console.log("Creating test admin user...\n");

    // Step 1: Create auth user
    const signUpResponse = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-key",
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

    const signUpData = await signUpResponse.json();
    if (!signUpResponse.ok) {
      throw new Error(`Sign up error: ${signUpData.error?.message || JSON.stringify(signUpData)}`);
    }

    const uid = signUpData.localId;
    const idToken = signUpData.idToken;
    console.log(`✅ Auth user created with UID: ${uid}`);
    console.log(`✅ ID Token: ${idToken.substring(0, 50)}...\n`);

    // Step 2: Create Firestore admin document
    console.log("Creating Firestore admin document...");
    const firestoreResponse = await fetch(
      `http://127.0.0.1:8080/v1/projects/demo-tati/databases/(default)/documents/users/${uid}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
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

    const firestoreData = await firestoreResponse.json();
    if (!firestoreResponse.ok) {
      console.log(`⚠️  Firestore error: ${JSON.stringify(firestoreData)}`);
    } else {
      console.log(`✅ Firestore document created`);
    }

    console.log("\n✅ Admin setup complete!\n");
    console.log("You can now login with:");
    console.log("  Email: admin@test.com");
    console.log("  Password: Admin@12345");
    console.log("  URL: http://localhost:4173/admin-login\n");
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

createAdmin();
