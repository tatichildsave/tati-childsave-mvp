/**
 * Test child login flow directly
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";

function deriveKey(value, salt, keyLength, options) {
  return new Promise((resolve, reject) => {
    scryptCallback(value, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function verifyPin(pin, encodedHash) {
  const [algorithm, cost, blockSize, parallelization, saltText, keyText] = encodedHash.split("$");

  if (algorithm !== "scrypt" || !saltText || !keyText) {
    return false;
  }

  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(keyText, "base64url");

  const derivedKey = await deriveKey(pin, salt, expected.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
  });

  if (derivedKey.length !== expected.length) return false;

  let match = true;
  for (let i = 0; i < derivedKey.length; i++) {
    if (derivedKey[i] !== expected[i]) {
      match = false;
    }
  }

  return match;
}

async function test() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error("❌ FIRESTORE_EMULATOR_HOST not set");
    process.exit(1);
  }

  const apps = getApps();
  let app = apps[0];
  if (!app) {
    app = initializeApp({
      projectId: "demo-tati",
    });
  }

  const db = getFirestore(app);
  const tatiId = "TATI-3B281288";
  const pin = "9069";

  console.log(`Testing login: ${tatiId} + ${pin}\n`);

  // Step 1: Look up credential
  console.log("Step 1: Looking up credential...");
  const credDoc = await db.collection("childCredentials").doc(tatiId).get();

  if (!credDoc.exists) {
    console.log("  ✗ Credential not found!");
    process.exit(1);
  }

  const cred = credDoc.data();
  console.log(`  ✓ Credential found`);
  console.log(`    - childId: ${cred.childId}`);
  console.log(`    - familyId: ${cred.familyId}`);
  console.log(`    - active: ${cred.active}`);
  console.log(`    - pinHash: ${String(cred.pinHash).substring(0, 60)}...\n`);

  // Step 2: Verify PIN
  console.log("Step 2: Verifying PIN...");
  const pinMatch = await verifyPin(pin, cred.pinHash);
  console.log(`  ${pinMatch ? "✓" : "✗"} PIN verification: ${pinMatch ? "MATCH" : "MISMATCH"}\n`);

  if (!pinMatch) {
    console.log("❌ PIN verification failed!");
    process.exit(1);
  }

  // Step 3: Get child context
  console.log("Step 3: Getting child context...");
  const contextSnapshot = await db
    .collection("childCredentials")
    .where("childId", "==", cred.childId)
    .limit(1)
    .get();

  if (contextSnapshot.empty) {
    console.log("  ✗ Context not found!");
    process.exit(1);
  }

  const contextCred = contextSnapshot.docs[0].data();
  console.log(`  ✓ Context found`);
  console.log(`    - familyId: ${contextCred.familyId}\n`);

  // Step 4: Load child profile
  console.log("Step 4: Loading child profile...");
  const childDoc = await db
    .collection("families")
    .doc(contextCred.familyId)
    .collection("children")
    .doc(cred.childId)
    .get();

  if (!childDoc.exists) {
    console.log("  ✗ Child profile not found!");
    process.exit(1);
  }

  const childProfile = childDoc.data();
  console.log(`  ✓ Child profile found`);
  console.log(`    - name: ${childProfile.name}`);
  console.log(`    - age: ${childProfile.age}`);
  console.log(`    - tatiId: ${childProfile.tatiId}\n`);

  console.log("✅ ALL STEPS PASSED - LOGIN SHOULD WORK!");
}

test().catch(console.error);
