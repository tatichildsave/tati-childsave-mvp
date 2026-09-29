/**
 * Initialize Child Credentials for Test Fixtures (H4.A)
 * =====================================================
 *
 * Creates /childCredentials/{tatiId} documents for each test fixture.
 * These enable child login with TATI ID + PIN.
 *
 * Prerequisites:
 * - Firebase Emulator running (firestore:8080, auth:9099)
 * - Test fixtures created via create-test-fixtures.mjs
 * - FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 *
 * Run: node init-child-credentials.mjs
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import * as fs from "fs";
import * as path from "path";

const isEmulatorMode = () => !!process.env["FIRESTORE_EMULATOR_HOST"];

function deriveKey(value, salt, keyLength, options) {
  return new Promise((resolve, reject) => {
    scryptCallback(value, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function hashPin(pin) {
  const salt = randomBytes(16);
  const keyLength = 64;
  const cost = 16_384;
  const blockSize = 8;
  const parallelization = 1;

  const derivedKey = await deriveKey(pin, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
  });

  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

async function initializeCredentials() {
  if (!isEmulatorMode()) {
    console.error("❌ FIRESTORE_EMULATOR_HOST not set");
    console.error("Set: export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080");
    process.exit(1);
  }

  console.log("🔧 Initializing Firebase Admin (emulator mode)...");
  const apps = getApps();
  let app = apps[0];
  if (!app) {
    app = initializeApp({
      projectId: "demo-tati",
    });
  }

  const db = getFirestore(app);
  console.log("✓ Connected to Firestore emulator at", process.env.FIRESTORE_EMULATOR_HOST);

  // Load test fixture credentials
  const credPath = path.join(process.cwd(), "test-fixtures-credentials.json");
  if (!fs.existsSync(credPath)) {
    console.error("❌ test-fixtures-credentials.json not found");
    console.error("Run: node create-test-fixtures.mjs");
    process.exit(1);
  }

  const fixtures = JSON.parse(fs.readFileSync(credPath, "utf-8"));
  const { children, family } = fixtures;
  const familyId = family.familyId;

  console.log(`\n📋 Found ${Object.keys(children).length} test fixtures`);
  console.log(`📦 Family ID: ${familyId}\n`);

  let created = 0;
  let failed = 0;

  for (const [key, child] of Object.entries(children)) {
    try {
      const { childId, tatiId, pin } = child;

      // Hash the PIN
      const pinHash = await hashPin(pin);

      // Create credential document at /childCredentials/{tatiId}
      const credentialRef = db.collection("childCredentials").doc(tatiId);
      await credentialRef.set({
        tatiId,
        childId,
        familyId,
        pinHash,
        active: true,
        revokedAt: null,
        rotatedAt: new Date().toISOString(),
      });

      console.log(`✓ Fixture ${key}: ${tatiId} → ${childId}`);
      created++;
    } catch (error) {
      console.error(`✗ Fixture ${key} failed:`, error.message);
      failed++;
    }
  }

  console.log(`\n✅ Created ${created} credentials`);
  if (failed > 0) {
    console.log(`⚠️  ${failed} failed`);
  }

  console.log("\n✓ Child credentials initialized!");
  console.log("Ready for child login testing at http://localhost:8080/child/login");

  process.exit(failed > 0 ? 1 : 0);
}

initializeCredentials().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
