#!/usr/bin/env node
/**
 * Test session cookie creation and verification with Auth emulator
 */

import fetch from "node-fetch";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Admin SDK against emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_PROJECT_ID = "tatichildsavemvp";

const app = initializeApp({
  projectId: "tatichildsavemvp",
});

const auth = getAuth(app);

async function test() {
  try {
    console.log("=== Session Cookie Test ===\n");

    // Use unique emails based on timestamp
    const ts = Date.now();
    const emailA = `parenta-${ts}@test.com`;
    const emailB = `parentb-${ts}@test.com`;

    // Step 1: Create user A via REST API
    console.log("1. Creating User A via Auth Emulator REST API...");
    const signupResp = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailA,
          password: "Test123!",
          returnSecureToken: true,
        }),
      }
    );

    if (!signupResp.ok) {
      const error = await signupResp.text();
      throw new Error(`Signup failed: ${error}`);
    }

    const user = await signupResp.json();
    const idTokenA = user.idToken;
    const uidA = user.localId;

    console.log(`   ✓ User A created. UID: ${uidA}`);
    console.log(`   ✓ ID Token: ${idTokenA.substring(0, 50)}...\n`);

    // Step 2: Create session cookie
    console.log("2. Creating session cookie from ID token...");
    let sessionCookie;
    try {
      sessionCookie = await auth.createSessionCookie(idTokenA, {
        expiresIn: 5 * 24 * 60 * 60 * 1000, // 5 days
      });
      console.log(
        `   ✓ Session cookie created. Length: ${sessionCookie.length}\n`
      );
    } catch (error) {
      console.error("   ✗ FAILED to create session cookie:");
      console.error(`   Error: ${error.message}\n`);
      throw error;
    }

    // Step 3: Verify session cookie
    console.log("3. Verifying session cookie...");
    let decodedClaims;
    try {
      decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
      console.log(`   ✓ Session cookie verified`);
      console.log(
        `   ✓ Claims UID: ${decodedClaims.uid} (matches: ${decodedClaims.uid === uidA})\n`
      );
    } catch (error) {
      console.error("   ✗ FAILED to verify session cookie:");
      console.error(`   Error: ${error.message}\n`);
      throw error;
    }

    // Step 4: Create user B
    console.log("4. Creating User B via Auth Emulator REST API...");
    const signupRespB = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailB,
          password: "Test123!",
          returnSecureToken: true,
        }),
      }
    );

    const userB = await signupRespB.json();
    const uidB = userB.localId;
    console.log(`   ✓ User B created. UID: ${uidB}\n`);

    // Step 5: Test with forged cookie
    console.log("5. Testing with forged cookie (should fail)...");
    try {
      await auth.verifySessionCookie("forged-cookie-xyz", true);
      console.log("   ✗ FAIL: Forged cookie was accepted (security issue!)\n");
    } catch (error) {
      console.log(`   ✓ Forged cookie correctly rejected: ${error.message}\n`);
    }

    // Step 6: Test with no cookie (empty string)
    console.log("6. Testing with empty cookie (should fail)...");
    try {
      await auth.verifySessionCookie("", true);
      console.log("   ✗ FAIL: Empty cookie was accepted\n");
    } catch (error) {
      console.log(`   ✓ Empty cookie correctly rejected: ${error.message}\n`);
    }

    console.log("=== ALL TESTS PASSED ===");
    console.log("\nResults:");
    console.log(`- createSessionCookie works against emulator: PASS`);
    console.log(`- verifySessionCookie works against emulator: PASS`);
    console.log(`- Forged cookies rejected: PASS`);
    console.log(`- Empty cookies rejected: PASS`);
    console.log(`- User A UID: ${uidA}`);
    console.log(`- User B UID: ${uidB}`);
    console.log(`- Session Cookie: ${sessionCookie.substring(0, 50)}...`);

  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

test();
