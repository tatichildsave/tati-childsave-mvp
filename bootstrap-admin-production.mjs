#!/usr/bin/env node

/**
 * Bootstrap admin for PRODUCTION Firebase
 * Requires: GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account JSON
 */

import * as admin from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function bootstrapAdmin() {
  try {
    // Get credentials from environment
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!credentialsPath) {
      console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
      console.error('Usage: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"');
      process.exit(1);
    }

    if (!fs.existsSync(credentialsPath)) {
      console.error(`❌ Error: Credentials file not found at: ${credentialsPath}`);
      process.exit(1);
    }

    // Load the service account
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    console.log(`📋 Using Firebase project: ${serviceAccount.project_id}\n`);

    // Initialize Admin SDK with actual credentials
    const app = admin.initializeApp({
      credential: admin.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log("🚀 Bootstrapping admin user...\n");

    // Step 1: Create or get user in Firebase Auth
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

    // Step 2: Create admin document in Firestore
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
    console.log("  URL: https://tati-childsave-mvp.vercel.app/admin-login\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

bootstrapAdmin();
