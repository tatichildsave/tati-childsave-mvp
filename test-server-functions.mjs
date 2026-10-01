#!/usr/bin/env node
/**
 * Test family server functions against dev server
 * Uses User A and User B UIDs from test-session-auth.mjs
 */

const DEV_SERVER = "http://localhost:3000";

const UidA = "KYIismnhMZbtLE5SvlcuOOofDdak";
const UidB = "EeYp2XmRJD5AEfxuugipIudmYmGe";

// Mock ID tokens (in real emulator these come from signUp)
// These won't work since we need real tokens, so we'll test differently
// Instead: fetch real tokens first

async function test() {
  console.log("=== Server Function Tests ===\n");
  
  try {
    // Test 1: Create session cookie for User A
    console.log("1. Creating session cookie for User A via server function...");
    // This requires a real ID token, which we need to get first
    
    // For now, test that the endpoints exist
    const response = await fetch(`${DEV_SERVER}/`, {
      method: "GET",
    });
    
    if (response.ok) {
      console.log("   ✓ Dev server responding on localhost:3000");
    } else {
      throw new Error(`Dev server returned ${response.status}`);
    }
    
    console.log("\n✓ Server is reachable");
    console.log("NOTE: Full server function test requires implementing client-side token flow");
    console.log("or using curl with session cookies. This validates connectivity only.\n");
    
  } catch (error) {
    console.error("Test failed:", error.message);
    process.exit(1);
  }
}

test();
