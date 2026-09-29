#!/usr/bin/env node

/**
 * Firebase Emulator Seed — H4.B Test Fixture
 * ==========================================
 *
 * Seeds a deterministic test fixture for H4.B child journey E2E testing.
 * Uses fixed credentials from test-fixtures-credentials.json
 * 
 * Only runs against Firebase Emulator. Safe to run repeatedly (idempotent).
 *
 * Prerequisites:
 * - Firebase Emulator running: firestore:8080, auth:9099
 * - FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 * - FIREBASE_PROJECT_ID=demo-tati
 *
 * Run: node seed-firebase-h4b-fixture.mjs
 *
 * Creates:
 * - /families/{familyId}
 * - /families/{familyId}/members/{parentId}
 * - /families/{familyId}/children/{childId} (Kwesi)
 * - /childCredentials/{tatiId}
 * - /families/{familyId}/children/{childId}/journey/summary
 *
 * Test credentials:
 *   TATI ID: TATI-824415B6
 *   PIN: 8451
 *   Child: Kwesi Journey B
 *   Family: gVhZIbAB9wSx5jsUxkJg
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import * as fs from "fs";

// ============================================================================
// Configuration
// ============================================================================

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "demo-tati";

if (!EMULATOR_HOST) {
  console.error("❌ FIRESTORE_EMULATOR_HOST not set");
  console.error("   Set it to: 127.0.0.1:8080");
  process.exit(1);
}

console.log(`🔥 Firebase Emulator Mode`);
console.log(`   Firestore: ${EMULATOR_HOST}`);
console.log(`   Project: ${FIREBASE_PROJECT_ID}\n`);

// Initialize Firebase Admin (will auto-detect emulator from env vars)
const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        projectId: FIREBASE_PROJECT_ID,
      });

const db = getFirestore(app);

// ============================================================================
// Test Fixture Data
// ============================================================================

// Use fixed test credentials for H4.B
const TEST_FIXTURE = {
  parent: {
    uid: "test-parent-h4b",
    email: "test-parent@test.com",
  },
  family: {
    id: "gVhZIbAB9wSx5jsUxkJg",
  },
  child: {
    id: "liJg1870hgOVuzupRQmj",
    name: "Kwesi Journey B",
    age: 10,
    avatar: "🧒",
    tier: "junior",
    tatiId: "TATI-824415B6",
    pin: "8451",
  },
};

// ============================================================================
// Crypto Utilities (matching server implementation)
// ============================================================================

async function hashPin(pin) {
  const SCRYPT_COST = 16_384;
  const SCRYPT_BLOCK_SIZE = 8;
  const SCRYPT_PARALLELIZATION = 1;
  const SCRYPT_KEY_LENGTH = 64;

  const salt = randomBytes(16);
  const derivedKey = scryptSync(pin, salt, SCRYPT_KEY_LENGTH, {
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
    derivedKey.toString("base64url"),
  ].join("$");
}

// ============================================================================
// Seed Functions
// ============================================================================

async function seedTestFixture() {
  console.log("🌱 Seeding H4.B test fixture...\n");

  try {
    // Step 1: Create family
    console.log("1️⃣  Creating family...");
    const familyRef = db.collection("families").doc(TEST_FIXTURE.family.id);
    
    const familyDoc = await familyRef.get();
    if (familyDoc.exists) {
      console.log("   ⚠️  Family already exists, skipping creation");
    } else {
      await familyRef.set({
        id: TEST_FIXTURE.family.id,
        name: "Test Family H4.B",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`   ✓ Created family: ${TEST_FIXTURE.family.id}`);
    }

    // Step 2: Add parent to family
    console.log("\n2️⃣  Adding parent to family...");
    const parentMemberRef = familyRef.collection("members").doc(TEST_FIXTURE.parent.uid);
    
    const parentMemberDoc = await parentMemberRef.get();
    if (parentMemberDoc.exists) {
      console.log("   ⚠️  Parent already in family, skipping");
    } else {
      await parentMemberRef.set({
        uid: TEST_FIXTURE.parent.uid,
        role: "parent",
        status: "active",
        invitedBy: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`   ✓ Added parent to family`);
    }

    // Step 3: Create child profile
    console.log("\n3️⃣  Creating child profile...");
    const childRef = familyRef.collection("children").doc(TEST_FIXTURE.child.id);
    
    const childDoc = await childRef.get();
    if (childDoc.exists) {
      console.log("   ⚠️  Child already exists, skipping creation");
    } else {
      await childRef.set({
        id: TEST_FIXTURE.child.id,
        name: TEST_FIXTURE.child.name,
        age: TEST_FIXTURE.child.age,
        avatar: TEST_FIXTURE.child.avatar,
        tier: TEST_FIXTURE.child.tier,
        curriculumLevel: "Primary 5",
        tatiId: TEST_FIXTURE.child.tatiId,
        familyId: TEST_FIXTURE.family.id,
        createdBy: TEST_FIXTURE.parent.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`   ✓ Created child profile: ${TEST_FIXTURE.child.id}`);
      console.log(`   ✓ TATI ID: ${TEST_FIXTURE.child.tatiId}`);
    }

    // Step 4: Create child credentials (TATI ID lookup)
    console.log("\n4️⃣  Creating child credentials...");
    const pinHash = await hashPin(TEST_FIXTURE.child.pin);
    const credRef = db.collection("childCredentials").doc(TEST_FIXTURE.child.tatiId);
    
    const credDoc = await credRef.get();
    if (credDoc.exists) {
      console.log("   ⚠️  Credentials already exist, skipping creation");
    } else {
      await credRef.set({
        tatiId: TEST_FIXTURE.child.tatiId,
        childId: TEST_FIXTURE.child.id,
        familyId: TEST_FIXTURE.family.id,
        pinHash: pinHash,
        active: true,
        revokedAt: null,
        rotatedAt: Timestamp.now(),
      });
      console.log(`   ✓ Created child credentials at /childCredentials/${TEST_FIXTURE.child.tatiId}`);
    }

    // Step 5: Create child journey summary (empty progress)
    console.log("\n5️⃣  Creating journey summary...");
    const journeyRef = childRef.collection("journey").doc("summary");
    
    const journeyDoc = await journeyRef.get();
    if (journeyDoc.exists) {
      console.log("   ⚠️  Journey summary already exists, skipping");
    } else {
      await journeyRef.set({
        currentDay: 1,
        currentLesson: "lesson-01-intro",
        lessonsCompleted: 2,
        scenariosCompleted: 0,
        reflectionsCompleted: 0,
        lastActivityAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log(`   ✓ Created journey summary`);
    }

    // Step 6: Print summary
    console.log("\n✅ Test Fixture Seeded Successfully!");
    console.log("=====================================\n");
    console.log("📝 Login Credentials:");
    console.log(`   TATI ID: ${TEST_FIXTURE.child.tatiId}`);
    console.log(`   PIN: ${TEST_FIXTURE.child.pin}`);
    console.log(`   Child: ${TEST_FIXTURE.child.name}`);
    console.log(`   Family ID: ${TEST_FIXTURE.family.id}\n`);
    console.log("🧪 Firebase Emulator Data:");
    console.log(`   /families/${TEST_FIXTURE.family.id}`);
    console.log(`   /families/${TEST_FIXTURE.family.id}/members/${TEST_FIXTURE.parent.uid}`);
    console.log(`   /families/${TEST_FIXTURE.family.id}/children/${TEST_FIXTURE.child.id}`);
    console.log(`   /childCredentials/${TEST_FIXTURE.child.tatiId}\n`);
    console.log("🚀 Ready to test H4.B child login!");
  } catch (error) {
    console.error("❌ Error seeding fixture:", error.message);
    process.exit(1);
  }
}

// ============================================================================
// Main
// ============================================================================

seedTestFixture().then(() => {
  process.exit(0);
});
