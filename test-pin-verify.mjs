/**
 * Test PIN Verification Logic
 */

import { createHash, randomBytes, scrypt as scryptCallback } from "crypto";

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

async function verifyPin(pin, encodedHash) {
  if (!/^\d{4,6}$/.test(pin)) {
    console.log("  ✗ PIN format invalid");
    return false;
  }

  const [algorithm, cost, blockSize, parallelization, saltText, keyText] = encodedHash.split("$");

  if (algorithm !== "scrypt" || !saltText || !keyText) {
    console.log("  ✗ Hash format invalid");
    return false;
  }

  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(keyText, "base64url");

  const derivedKey = await deriveKey(pin, salt, expected.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
  });

  // Timing-safe compare
  if (derivedKey.length !== expected.length) {
    console.log(`  ✗ Length mismatch: ${derivedKey.length} vs ${expected.length}`);
    return false;
  }

  let match = true;
  for (let i = 0; i < derivedKey.length; i++) {
    if (derivedKey[i] !== expected[i]) {
      match = false;
    }
  }

  return match;
}

async function test() {
  console.log("🧪 Testing PIN verification logic\n");

  // Test 1: Hash and verify same PIN
  console.log("Test 1: Hash and verify same PIN");
  const testPin = "8781";
  const hash = await hashPin(testPin);
  console.log(`  PIN: ${testPin}`);
  console.log(`  Hash: ${hash.substring(0, 50)}...`);

  const result = await verifyPin(testPin, hash);
  console.log(`  Verify result: ${result ? "✓ MATCH" : "✗ MISMATCH"}\n`);

  // Test 2: Verify with wrong PIN
  console.log("Test 2: Verify with wrong PIN");
  const wrongPin = "1234";
  const result2 = await verifyPin(wrongPin, hash);
  console.log(`  PIN: ${wrongPin}`);
  console.log(`  Verify result: ${result2 ? "✓ MATCH" : "✗ MISMATCH"}\n`);

  // Test 3: Test with the actual credential from Firestore
  console.log("Test 3: Verify credential from Firestore");
  const firestoreHash =
    "scrypt$16384$8$1$1o0WH00IKLjalOniJ1fFFA$IANQU9HDOHC9cA52j3bwIEi2JqZjqY3mVo5_1g7bPzw";
  const testPin3 = "8781";
  const result3 = await verifyPin(testPin3, firestoreHash);
  console.log(`  PIN: ${testPin3}`);
  console.log(`  Hash: ${firestoreHash.substring(0, 50)}...`);
  console.log(`  Verify result: ${result3 ? "✓ MATCH" : "✗ MISMATCH"}\n`);
}

test().catch(console.error);
