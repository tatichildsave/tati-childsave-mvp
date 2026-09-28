#!/usr/bin/env node
/**
 * Test data setup script for Phase H3.4 E2E testing
 * Creates parent and child accounts with various progress states
 * 
 * Usage: node test-setup.mjs
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Initialize admin SDK
const serviceAccountPath = resolve('./functions/.secret.local/demo-tati-key.json');
let serviceAccount;

try {
  const keyFile = readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(keyFile);
} catch (e) {
  // Create a dummy service account for emulator
  serviceAccount = {
    "type": "service_account",
    "project_id": "demo-tati",
    "private_key_id": "key-id",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA2a2j...truncated\n-----END RSA PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk@demo-tati.iam.gserviceaccount.com",
    "client_id": "123456789",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "http://127.0.0.1:9099/",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
  };
}

admin.initializeApp({
  projectId: "demo-tati"
});

const auth = admin.auth();
const db = admin.firestore();

// Use emulators
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

/**
 * Journey A: Brand-new child
 * - No progress
 * - No assessment
 * - Ready for onboarding
 */
async function setupJourneyA() {
  console.log("Setting up Journey A (brand-new child)...");

  const parentEmail = "parent-a@test.com";
  const parentPassword = "TestPassword123!";
  
  try {
    // Create parent user
    const parentUser = await auth.createUser({
      email: parentEmail,
      password: parentPassword,
      displayName: "Parent A"
    });
    const parentId = parentUser.uid;
    console.log(`✓ Parent A created: ${parentId}`);

    // Create parent profile
    await db.collection("users").doc(parentId).set({
      email: parentEmail,
      name: "Parent A",
      role: "parent",
      schools: [],
      children: [],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`✓ Parent A profile created`);

    // Create child user
    const childEmail = "child-a@test.com";
    const childPassword = "1234";
    
    const childUser = await auth.createUser({
      email: childEmail,
      password: childPassword,
      displayName: "Ama"
    });
    const childId = childUser.uid;
    console.log(`✓ Child A created: ${childId}`);

    // Generate TATI ID (format: TATI-XXXXXXXX)
    const tatiId = `TATI-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const pin = "1234";

    // Create child profile
    await db.collection("users").doc(childId).set({
      email: childEmail,
      name: "Ama",
      role: "child",
      age: 9,
      avatar: "ama",
      curriculum_level: "Primary 3",
      tatiId: tatiId,
      pin: pin,
      parentId: parentId,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`✓ Child A profile created`);
    console.log(`   TATI ID: ${tatiId}`);
    console.log(`   PIN: ${pin}`);

    // Update parent's children list
    await db.collection("users").doc(parentId).update({
      children: [childId]
    });
    console.log(`✓ Parent-child relationship established`);

    return { parentId, childId, tatiId, pin, childEmail, parentEmail };
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log("✓ Accounts already exist (skipping)");
      const tatiId = "TATI-DEMO0001";
      const pin = "1234";
      return { tatiId, pin, childEmail: "child-a@test.com", parentEmail };
    }
    console.error("Error setting up Journey A:", error.message);
    throw error;
  }
}

/**
 * Journey B: Returning child with progress
 * - Completed pre-assessment
 * - Completed lessons 1-3
 * - Started scenario 1
 */
async function setupJourneyB() {
  console.log("\nSetting up Journey B (returning child with progress)...");

  const parentEmail = "parent-b@test.com";
  const parentPassword = "TestPassword123!";
  
  try {
    // Create parent user
    const parentUser = await auth.createUser({
      email: parentEmail,
      password: parentPassword,
      displayName: "Parent B"
    });
    const parentId = parentUser.uid;
    console.log(`✓ Parent B created: ${parentId}`);

    // Create child user
    const childEmail = "child-b@test.com";
    const childPassword = "1234";
    
    const childUser = await auth.createUser({
      email: childEmail,
      password: childPassword,
      displayName: "Kofi"
    });
    const childId = childUser.uid;
    console.log(`✓ Child B created: ${childId}`);

    const tatiId = `TATI-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const pin = "1234";

    // Create child profile
    await db.collection("users").doc(childId).set({
      email: childEmail,
      name: "Kofi",
      role: "child",
      age: 10,
      avatar: "kofi",
      curriculum_level: "Primary 4",
      tatiId: tatiId,
      pin: pin,
      parentId: parentId,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`✓ Child B profile created`);

    // Create parent profile
    await db.collection("users").doc(parentId).set({
      email: parentEmail,
      name: "Parent B",
      role: "parent",
      schools: [],
      children: [childId],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`✓ Parent B profile created`);

    // Create progress events (simulating completed pre-assessment + lessons)
    const eventsRef = db.collection(`users/${childId}/progress-events`);
    const events = [
      { kind: "assessment-complete", id: "save-pre", timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 7)) },
      { kind: "lesson-complete", id: "lesson-1", timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 6)) },
      { kind: "lesson-complete", id: "lesson-2", timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 5)) },
      { kind: "lesson-complete", id: "lesson-3", timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 4)) },
      { kind: "scenario-start", id: "school-reopening", timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000 * 3)) }
    ];

    for (const event of events) {
      await eventsRef.add(event);
    }
    console.log(`✓ Created ${events.length} progress events`);

    return { parentId, childId, tatiId, pin, childEmail, parentEmail };
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log("✓ Accounts already exist (skipping)");
      return null;
    }
    console.error("Error setting up Journey B:", error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("🧪 TATI Phase H3.4 Test Data Setup\n");
  console.log("Connecting to Firebase Emulator...\n");

  try {
    // Setup test journeys
    const journeyA = await setupJourneyA();
    const journeyB = await setupJourneyB();

    console.log("\n✅ Test data setup complete!\n");
    console.log("📝 Journey A (Brand-new child):");
    console.log(`   Email: ${journeyA.childEmail}`);
    console.log(`   TATI ID: ${journeyA.tatiId}`);
    console.log(`   PIN: ${journeyA.pin}`);
    
    if (journeyB) {
      console.log("\n📝 Journey B (Returning child with progress):");
      console.log(`   Email: ${journeyB.childEmail}`);
      console.log(`   TATI ID: ${journeyB.tatiId}`);
      console.log(`   PIN: ${journeyB.pin}`);
    }

    console.log("\n🌐 Visit http://localhost:8080/child/login to test\n");
    
    await admin.app().delete();
    process.exit(0);
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

main();
