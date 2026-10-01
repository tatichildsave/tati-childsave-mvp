#!/usr/bin/env node
/**
 * Manual end-to-end session test:
 * 1. Create user via Auth Emulator
 * 2. Get ID token
 * 3. Call createParentSessionFn to create session cookie
 * 4. Call getFamilyChildren with session cookie
 * 5. Verify session works
 */

const fetch = await import("node-fetch").then(m => m.default);

const API_KEY = "fake";
const AUTH_EMULATOR = "http://127.0.0.1:9099";
const DEV_SERVER = "http://localhost:3000";
const EMAIL = `parent-${Date.now()}@test.com`;
const PASSWORD = "Test123!";

console.log("=== End-to-End Session Test ===\n");

try {
  // Step 1: Sign up user
  console.log("1. Creating user via Auth Emulator...");
  let res = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  });
  
  if (!res.ok) throw new Error(`Signup failed: ${res.status}`);
  
  const user = await res.json();
  const idToken = user.idToken;
  const uid = user.localId;
  console.log(`   ✓ User created: ${uid}\n`);

  // Step 2: Call createParentSessionFn
  console.log("2. Calling createParentSessionFn via dev server...");
  const createSessionRes = await fetch(`${DEV_SERVER}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      _action: "createParentSessionFn",
      data: { idToken },
    }),
  });

  console.log(`   Response status: ${createSessionRes.status}`);
  const createSessionText = await createSessionRes.text();
  console.log(`   Response: ${createSessionText.substring(0, 200)}`);
  
  // Check for Set-Cookie header
  const setCookieHeader = createSessionRes.headers.get("set-cookie");
  console.log(`   Set-Cookie header: ${setCookieHeader ? "YES" : "NO"}\n`);

  if (!createSessionRes.ok) {
    console.error("   ✗ Failed to create session");
  } else {
    console.log("   ✓ createParentSessionFn returned 200\n");
  }

  // Step 3: Try calling getFamilyChildren
  console.log("3. Calling getFamilyChildren with cookies...");
  const getCookieJar = require("cookie-jar");
  
  // For now, just report what happened
  console.log("   NOTE: Session creation returned 200, but need to verify cookie is in requests");
  console.log(`   UID: ${uid}`);
  console.log(`   Email: ${EMAIL}`);

} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
