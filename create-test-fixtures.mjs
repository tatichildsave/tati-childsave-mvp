/**
 * Test Fixture Creator for Firebase Emulator
 * ============================================
 *
 * LOCAL EMULATOR ONLY - Never connects to production
 * Creates reproducible test data for H3.4 journey testing
 *
 * Usage: node create-test-fixtures.mjs
 *
 * Creates 4 test fixtures:
 * - Fixture A: Brand-new child (0 progress)
 * - Fixture B: Returning child (partial progress)
 * - Fixture C: Scenario-ready child
 * - Fixture D: Completed child (all lessons done)
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

// Set emulator env vars if not already set
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIREBASE_PROJECT_ID = "demo-tati";
}

// Verify we're using the emulator
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (!emulatorHost || !authEmulatorHost) {
  console.error("❌ Emulator not configured!");
  console.error("FIRESTORE_EMULATOR_HOST:", emulatorHost);
  console.error("FIREBASE_AUTH_EMULATOR_HOST:", authEmulatorHost);
  process.exit(1);
}

console.log("🔥 Using Firebase Emulator");
console.log(`   Firestore: ${emulatorHost}`);
console.log(`   Auth: ${authEmulatorHost}`);

// Initialize Firebase Admin (will auto-detect emulator from env vars)
const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        projectId: "demo-tati",
      });

const auth = getAuth(app);
const db = getFirestore(app);

// Test fixture data
const FIXTURES = {
  parentEmail: "test-parent@test.com",
  parentPassword: "TestParent123!",
  fixtures: {
    A: {
      name: "Journey A — Brand New Child",
      child: { name: "Emma Journey A", age: 9 },
      progress: [], // No progress
      description: "Completely new child, never started journey",
    },
    B: {
      name: "Journey B — Returning Child",
      child: { name: "Kwesi Journey B", age: 10 },
      progress: [
        { kind: "lesson", id: "lesson-01-intro", status: "completed", dayNumber: 1 },
        { kind: "lesson", id: "lesson-02-earn", status: "completed", dayNumber: 2 },
        { kind: "lesson", id: "lesson-03-save", status: "in-progress", dayNumber: 3 },
      ],
      savedCedis: 15, // Some money earned
      description: "Returning child with partial progress (2 lessons done, 3rd in progress)",
    },
    C: {
      name: "Journey C — Scenario Ready",
      child: { name: "Ama Journey C", age: 11 },
      progress: [
        { kind: "lesson", id: "lesson-01-intro", status: "completed", dayNumber: 1 },
        { kind: "lesson", id: "lesson-02-earn", status: "completed", dayNumber: 2 },
        { kind: "lesson", id: "lesson-03-save", status: "completed", dayNumber: 3 },
        { kind: "scenario", id: "scenario-market", status: "in-progress", dayNumber: 4 },
      ],
      savedCedis: 25,
      description: "Child ready to test scenario (lessons done, scenario available)",
    },
    D: {
      name: "Journey D — Completed Journey",
      child: { name: "Kofi Journey D", age: 8 },
      progress: [
        // All lessons completed (would be 12 in real data)
        { kind: "lesson", id: "lesson-01-intro", status: "completed", dayNumber: 1 },
        { kind: "lesson", id: "lesson-02-earn", status: "completed", dayNumber: 2 },
        { kind: "lesson", id: "lesson-03-save", status: "completed", dayNumber: 3 },
        { kind: "lesson", id: "lesson-04-spend", status: "completed", dayNumber: 4 },
        { kind: "lesson", id: "lesson-05-plan", status: "completed", dayNumber: 5 },
        { kind: "scenario", id: "scenario-market", status: "completed", dayNumber: 6 },
        { kind: "scenario", id: "scenario-shop", status: "completed", dayNumber: 7 },
        { kind: "reflection", id: "reflection-01", status: "completed", dayNumber: 8 },
        // Post-assessment ready
        { kind: "assessment", id: "post-assessment", status: "available", dayNumber: 14 },
      ],
      savedCedis: 75,
      description: "Child who has completed the full journey (for post-assessment testing)",
    },
  },
};

// Helper: Generate TATI ID format TATI-XXXXXXXX
function generateTatiId() {
  return `TATI-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

// Helper: Generate 4-digit PIN
function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper: Hash PIN using scrypt (matching server implementation)
async function hashPin(pin) {
  const { scrypt } = await import("crypto").then((m) => ({
    scrypt: m.scryptSync,
  }));

  const SCRYPT_COST = 16384;
  const SCRYPT_BLOCK_SIZE = 8;
  const SCRYPT_PARALLELIZATION = 1;
  const SCRYPT_KEY_LENGTH = 64;

  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pin, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });

  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

async function createTestFixtures() {
  try {
    console.log("\n📋 Creating Test Fixtures for H3.4 Testing");
    console.log("==========================================\n");

    // Step 1: Create or get parent user
    console.log("1️⃣  Setting up parent account...");
    let parentUser;
    try {
      parentUser = await auth.getUserByEmail(FIXTURES.parentEmail);
      console.log(`   ✓ Parent exists: ${parentUser.uid}`);
    } catch (e) {
      if (e.code === "auth/user-not-found") {
        parentUser = await auth.createUser({
          email: FIXTURES.parentEmail,
          password: FIXTURES.parentPassword,
          displayName: "Test Parent",
        });
        console.log(`   ✓ Parent created: ${parentUser.uid}`);
      } else {
        throw e;
      }
    }

    const parentId = parentUser.uid;

    // Step 2: Create or get family
    console.log("\n2️⃣  Setting up family...");
    const familyRef = db.collection("families").doc();
    const familyId = familyRef.id;

    await familyRef.set({
      name: "Test Family",
      createdBy: parentId,
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`   ✓ Family created: ${familyId}`);

    // Step 3: Add parent as family member
    console.log("   Adding parent to family...");
    await db.collection("families").doc(familyId).collection("members").doc(parentId).set({
      uid: parentId,
      role: "parent",
      status: "active",
      invitedBy: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log(`   ✓ Parent added to family`);

    // Step 4: Create child fixtures
    console.log("\n3️⃣  Creating child fixtures...");

    const fixtureData = {};

    for (const [fixtureKey, fixtureConfig] of Object.entries(FIXTURES.fixtures)) {
      console.log(`\n   📍 Fixture ${fixtureKey}: ${fixtureConfig.name}`);

      // Generate child credentials
      const tatiId = generateTatiId();
      const pin = generatePin();
      const pinHash = await hashPin(pin);

      // Create child profile document
      const childRef = db.collection("families").doc(familyId).collection("children").doc();
      const childId = childRef.id;

      await childRef.set({
        name: fixtureConfig.child.name,
        age: fixtureConfig.child.age,
        avatar: "🧒",
        tier: "essential",
        curriculumLevel: `Primary ${Math.max(1, fixtureConfig.child.age - 5)}`,
        tatiId: tatiId,
        onboardingStep: 0,
        onboardingCompleted: true,
        familyId: familyId,
        createdBy: parentId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`      ✓ Child profile: ${childId}`);
      console.log(`      ✓ TATI ID: ${tatiId}`);
      console.log(`      ✓ PIN: ${pin}`);

      // Store fixture credentials for testing
      fixtureData[fixtureKey] = {
        childId,
        tatiId,
        pin,
        familyId,
        childName: fixtureConfig.child.name,
        description: fixtureConfig.description,
      };

      // Create progress events (journey progress)
      if (fixtureConfig.progress && fixtureConfig.progress.length > 0) {
        console.log(`      ✓ Adding ${fixtureConfig.progress.length} progress events...`);

        for (const event of fixtureConfig.progress) {
          await db.collection("families").doc(familyId).collection("journeyProgress").doc().set({
            kind: event.kind,
            id: event.id,
            status: event.status,
            dayNumber: event.dayNumber,
            childId,
            familyId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
      }

      // Create journey summary document
      const currentItem = fixtureConfig.progress[fixtureConfig.progress.length - 1];
      await db
        .collection("families")
        .doc(familyId)
        .collection("children")
        .doc(childId)
        .collection("journey")
        .doc("summary")
        .set({
          currentItemKey: currentItem ? `${currentItem.kind}:${currentItem.id}` : null,
          completedCount: fixtureConfig.progress.filter((e) => e.status === "completed").length,
          completionPercent: Math.round(
            (fixtureConfig.progress.filter((e) => e.status === "completed").length /
              Math.max(1, fixtureConfig.progress.length)) *
              100,
          ),
          lastActivityAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

      // Store saved cedis in a wallet document
      await db
        .collection("families")
        .doc(familyId)
        .collection("children")
        .doc(childId)
        .collection("wallet")
        .doc("current")
        .set({
          savedCedis: fixtureConfig.savedCedis || 0,
          totalEarned: fixtureConfig.savedCedis || 0,
          updatedAt: Timestamp.now(),
        });

      // Store test credentials (for test-child-login.server.ts)
      // In production, these would be in Supabase
      // For H3.4 emulator testing, we store them in Firestore
      await db
        .collection("families")
        .doc(familyId)
        .collection("children")
        .doc(childId)
        .collection("testData")
        .doc("credentials")
        .set({
          tatiId: tatiId,
          testPin: pin,
          createdForTesting: Timestamp.now(),
        });

      // H4.A: Create production-style hashed credentials in /childCredentials/{tatiId}
      // This is for the Firebase-based child authentication (replacing Supabase)
      await db.collection("childCredentials").doc(tatiId).set({
        tatiId: tatiId,
        childId: childId,
        familyId: familyId,
        pinHash: pinHash,
        active: true,
        revokedAt: null,
        rotatedAt: Timestamp.now(),
      });

      console.log(`      ✓ Test credentials stored in Firestore`);
    }

    // Step 5: Print credentials summary
    console.log("\n\n✅ TEST FIXTURES CREATED!");
    console.log("===============================\n");

    console.log("📝 Test Account Credentials:");
    console.log(`   Email: ${FIXTURES.parentEmail}`);
    console.log(`   Password: ${FIXTURES.parentPassword}`);
    console.log(`   Parent UID: ${parentId}`);
    console.log(`   Family ID: ${familyId}\n`);

    console.log("🧒 Child Test Fixtures:\n");

    for (const [fixtureKey, data] of Object.entries(fixtureData)) {
      console.log(`   Fixture ${fixtureKey} — ${data.description}`);
      console.log(`   ├─ Name: ${data.childName}`);
      console.log(`   ├─ TATI ID: ${data.tatiId}`);
      console.log(`   ├─ PIN: ${data.pin}`);
      console.log(`   └─ Child ID: ${data.childId}\n`);
    }

    console.log("🚀 Next Steps:");
    console.log("   1. Navigate to http://localhost:8080/child/login");
    console.log("   2. Use any fixture TATI ID and PIN to log in");
    console.log("   3. Begin testing Journey A (Fixture A), then B, C, D\n");

    // Save to file for reference
    const credentialsFile = "test-fixtures-credentials.json";
    const credentials = {
      parent: {
        email: FIXTURES.parentEmail,
        password: FIXTURES.parentPassword,
        uid: parentId,
      },
      family: { familyId },
      children: fixtureData,
      emulator: {
        firestore: emulatorHost,
        auth: authEmulatorHost,
      },
      created: new Date().toISOString(),
    };

    const fs = await import("fs");
    fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
    console.log(`📄 Credentials saved to: ${credentialsFile}`);
  } catch (error) {
    console.error("\n❌ Error creating fixtures:");
    console.error(error.message);
    if (error.code) console.error(`   Code: ${error.code}`);
    process.exit(1);
  }
}

// Run
createTestFixtures()
  .then(() => {
    console.log("\n✨ Done! Emulator is ready for H3.4 testing.\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
