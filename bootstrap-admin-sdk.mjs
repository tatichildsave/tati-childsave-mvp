#!/usr/bin/env node

/**
 * Bootstrap admin using Firebase Admin SDK
 * This bypasses Firestore rules because the Admin SDK has full access
 */

import admin from 'firebase-admin';

// Initialize with emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Initialize Firebase Admin (requires credentials, but emulator accepts dummy)
const serviceAccount = {
  "type": "service_account",
  "project_id": "demo-tati",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3...DUMMY...-----END RSA PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk@demo-tati.iam.gserviceaccount.com",
  "client_id": "1234567890",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "http://127.0.0.1:9099/",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
};

async function bootstrapAdmin() {
  try {
    // Initialize admin SDK
    const app = admin.initializeApp({
      projectId: "demo-tati",
    });

    const auth = admin.auth(app);
    const db = admin.firestore(app);

    console.log("🚀 Bootstrapping admin user...\n");

    // Step 1: Create user in Firebase Auth
    console.log("Step 1: Creating auth user...");
    let uid;
    try {
      // Try to get existing user first
      const existingUser = await auth.getUserByEmail("admin@test.com");
      uid = existingUser.uid;
      console.log(`✅ Auth user already exists with UID: ${uid}`);
    } catch (e) {
      // User doesn't exist, create new one
      const userRecord = await auth.createUser({
        email: "admin@test.com",
        password: "Admin@12345",
        emailVerified: false,
        displayName: "Test Admin",
      });
      uid = userRecord.uid;
      console.log(`✅ Auth user created with UID: ${uid}`);
    }

    // Step 2: Create admin document in Firestore (using Admin SDK, bypasses rules)
    console.log("Step 2: Creating Firestore admin document...");
    await db.collection("users").doc(uid).set({
      uid,
      email: "admin@test.com",
      displayName: "Test Admin",
      roles: ["admin"],
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });
    console.log(`✅ Firestore document created`);

    // Step 3: Set custom claims
    console.log("Step 3: Setting custom claims...");
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(`✅ Custom claims set`);

    console.log("\n✅ Admin bootstrap complete!\n");
    console.log("Login credentials:");
    console.log("  Email: admin@test.com");
    console.log("  Password: Admin@12345");
    console.log("  URL: http://localhost:4173/admin-login\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

bootstrapAdmin();
