#!/usr/bin/env node

/**
 * Update admin user's roles array in Firestore Emulator
 */

async function updateAdminRoles() {
  const uid = "gubN3Ry88IsIOsKy4IFzE7A0bAGl";
  const projectId = "demo-tati";

  console.log(`🚀 Updating roles for admin user...\n`);

  try {
    // Get ID token by signing in
    console.log("Step 1: Getting auth token...");
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
    const idToken = signInData.idToken;
    console.log(`✅ Auth token obtained\n`);

    // Update the document by patching it
    console.log("Step 2: Updating roles array in Firestore...");

    const updateResponse = await fetch(
      `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=roles`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            roles: {
              arrayValue: {
                values: [{ stringValue: "admin" }],
              },
            },
          },
        }),
      },
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log(`⚠️  Update via API failed (expected - port 8080 blocked by dev server)`);
      console.log(`\n📋 Manual update required:\n`);
      console.log(`Go to: http://localhost:4000/firestore/default/data/users/${uid}`);
      console.log(`Edit the 'roles' array field`);
      console.log(`Add value: admin`);
      console.log(`\nThen try signing in again at: http://localhost:8080/admin-login\n`);
      process.exit(0);
    }

    console.log(`✅ Roles updated to include 'admin'\n`);
    console.log("🌐 Try signing in again at: http://localhost:8080/admin-login\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

updateAdminRoles();
