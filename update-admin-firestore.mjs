#!/usr/bin/env node

/**
 * Update admin user roles using Firestore REST API via fetch
 * Connects directly to Firestore Emulator on port 8080
 */

async function updateAdminRoles() {
  try {
    console.log("🔗 Step 1: Getting authentication token from Firebase Auth emulator...\n");

    // Step 1: Sign in to get ID token
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

    if (!signInResponse.ok) {
      throw new Error(`Sign in failed: ${signInResponse.status} ${signInResponse.statusText}`);
    }

    const signInData = await signInResponse.json();
    const idToken = signInData.idToken;
    console.log(`✅ Auth token obtained: ${idToken.substring(0, 30)}...\n`);

    // Step 2: Update the Firestore document via REST API
    console.log("📝 Step 2: Updating roles array in Firestore via REST API...\n");

    const uid = "gubN3Ry88IsIOsKy4IFzE7A0bAGl";
    const projectId = "demo-tati";
    const updateUrl = `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=roles`;

    const updateResponse = await fetch(updateUrl, {
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
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log(`⚠️  Update failed: ${updateResponse.status} ${updateResponse.statusText}`);
      console.log(`Error: ${errorText}\n`);

      if (
        updateResponse.status === 404 ||
        updateResponse.status === 502 ||
        errorText.includes("UNAVAILABLE")
      ) {
        console.log("💡 Dev server is likely blocking port 8080. Solutions:\n");
        console.log("   Option A: Stop the dev server, run this script, then restart it");
        console.log("   Option B: Manually update via Firebase Emulator UI:");
        console.log(
          "     1. Go to: http://localhost:4000/firestore/default/data/users/gubN3Ry88IsIOsKy4IFzE7A0bAGl",
        );
        console.log("     2. Find the roles array field");
        console.log('     3. Click "Add" to add a new array element');
        console.log('     4. Enter "admin" as the value');
        console.log("     5. Click Save\n");
      }
      process.exit(1);
    }

    const updateData = await updateResponse.json();
    console.log("✅ Successfully updated roles array!\n");
    console.log("📊 Updated document:", JSON.stringify(updateData.fields, null, 2));
    console.log("\n🌐 Try signing in now at: http://localhost:8080/admin-login");
    console.log("   Email: admin@test.com");
    console.log("   Password: Admin@12345\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

updateAdminRoles();
