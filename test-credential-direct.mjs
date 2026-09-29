/**
 * Direct Test of Credential Verification
 * Test the exact same logic as the server
 */

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
  console.log(`\n  Verifying PIN: ${pin}`);
  console.log(`  Against hash: ${encodedHash.substring(0, 80)}...`);

  const PIN_PATTERN = /^\d{4,6}$/;
  if (!PIN_PATTERN.test(pin)) {
    console.log("  ✗ PIN format invalid");
    return false;
  }

  const [algorithm, cost, blockSize, parallelization, saltText, keyText] = encodedHash.split("$");

  console.log(`  Parsing: alg=${algorithm}, cost=${cost}, r=${blockSize}, p=${parallelization}`);
  console.log(`  Salt (base64url): ${saltText.substring(0, 20)}...`);
  console.log(`  Key (base64url): ${keyText.substring(0, 20)}...`);

  if (algorithm !== "scrypt" || !saltText || !keyText) {
    console.log("  ✗ Hash format invalid");
    return false;
  }

  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(keyText, "base64url");

  console.log(`  Salt (hex): ${salt.toString("hex").substring(0, 20)}...`);
  console.log(`  Expected key length: ${expected.length}`);

  const derivedKey = await deriveKey(pin, salt, expected.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
  });

  console.log(`  Derived key length: ${derivedKey.length}`);
  console.log(`  Derived (hex): ${derivedKey.toString("hex").substring(0, 20)}...`);

  if (derivedKey.length !== expected.length) {
    console.log(`  ✗ Length mismatch: ${derivedKey.length} vs ${expected.length}`);
    return false;
  }

  let match = true;
  for (let i = 0; i < derivedKey.length; i++) {
    if (derivedKey[i] !== expected[i]) {
      match = false;
      console.log(`  ✗ Mismatch at byte ${i}: ${derivedKey[i]} vs ${expected[i]}`);
      break;
    }
  }

  if (match) {
    console.log("  ✓ PIN MATCHES");
  } else {
    console.log("  ✗ PIN DOES NOT MATCH");
  }

  return match;
}

async function test() {
  console.log("🧪 Testing actual credential from Firestore\n");

  // This is the actual hash from Firestore for TATI-3B281288
  const firestoreHash =
    "scrypt$16384$8$1$WkNxov9nlsg_QqdolVLq0A$abRxmdosqzPFmFMgF3hUHM0X-FnxW3rXw0fQ3FXTwu8";
  const pin = "9069";

  console.log("From test-fixtures: TATI-3B281288, PIN: 9069");
  const result = await verifyPin(pin, firestoreHash);

  console.log(`\n🎯 Result: ${result ? "✅ SUCCESS" : "❌ FAILED"}`);
}

test().catch(console.error);
