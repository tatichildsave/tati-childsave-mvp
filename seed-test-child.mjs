#!/usr/bin/env node

/**
 * Seed Test Child Data into Supabase
 * ==================================
 * 
 * Creates test child profiles and credentials for H4.B testing.
 * Uses Supabase service role key for admin access.
 * 
 * Test child: Kwesi (TATI-824415B6, PIN: 8451)
 * Family: gVhZIbAB9wSx5jsUxkJg
 * 
 * Run: node seed-test-child.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Get Supabase config from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("❌ SUPABASE_URL not set");
  process.exit(1);
}

if (!supabaseServiceRoleKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set");
  console.error("   Get this from: https://supabase.com/dashboard/project/[project]/settings/api");
  process.exit(1);
}

// Initialize Supabase with service role key (admin access)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Test fixtures data
const testFamily = {
  familyId: "gVhZIbAB9wSx5jsUxkJg",
};

const testParent = {
  email: "test-parent@test.com",
  uid: "Wo9jP2HgbnrjKIuoBMljTn2H0lG4", // This should exist
};

const testChildren = [
  {
    name: "Kwesi Journey B",
    age: 12,
    avatar: "kojo",
    tier: "junior",
    tatiId: "TATI-824415B6",
    pin: "8451",
    childId: "liJg1870hgOVuzupRQmj",
  },
];

/**
 * Hash a PIN using scrypt (same algorithm as server)
 */
async function hashPin(pin) {
  const salt = randomBytes(16);
  const keyLength = 64;
  const cost = 16_384;
  const blockSize = 8;
  const parallelization = 1;

  const derivedKey = await scryptAsync(pin, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
  });

  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("base64"),
    derivedKey.toString("base64"),
  ].join(":");
}

/**
 * Seed test child data
 */
async function seedTestChildren() {
  console.log("🌱 Seeding test child data into Supabase...\n");

  try {
    // Verify family exists
    console.log(`✓ Verifying family: ${testFamily.familyId}`);
    const { data: familyData, error: familyError } = await supabase
      .from("families")
      .select("id")
      .eq("id", testFamily.familyId)
      .single();

    if (familyError || !familyData) {
      console.error("❌ Family not found:", testFamily.familyId);
      console.log(
        "   Please ensure the family exists in your Supabase database"
      );
      process.exit(1);
    }
    console.log("✓ Family verified\n");

    // Verify parent exists
    console.log(`✓ Verifying parent: ${testParent.uid}`);
    const { data: parentData, error: parentError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", testParent.uid)
      .single();

    if (parentError || !parentData) {
      console.error("❌ Parent profile not found:", testParent.uid);
      console.log(
        "   Please create the parent profile first, or update the test parent UID"
      );
      process.exit(1);
    }
    console.log("✓ Parent verified\n");

    // Seed each test child
    for (const child of testChildren) {
      console.log(`📝 Creating child: ${child.name}`);
      console.log(`   TATI ID: ${child.tatiId}`);
      console.log(`   PIN: ${child.pin}`);

      // Check if child already exists
      const { data: existingChild } = await supabase
        .from("child_profiles")
        .select("id")
        .eq("tati_id", child.tatiId)
        .single();

      if (existingChild) {
        console.log("   ⚠️  Child already exists, skipping\n");
        continue;
      }

      // Create child profile
      const { data: createdChild, error: childError } = await supabase
        .from("child_profiles")
        .insert({
          family_id: testFamily.familyId,
          created_by: testParent.uid,
          name: child.name,
          age: child.age,
          avatar: child.avatar,
          tier: child.tier,
          curriculum_level: null,
          tati_id: child.tatiId,
          onboarding_step: 0,
          onboarding_completed: false,
        })
        .select()
        .single();

      if (childError) {
        console.error("❌ Failed to create child:", childError.message);
        continue;
      }

      console.log(`   ✓ Created child profile: ${createdChild.id}`);

      // Hash and store PIN
      const pinHash = await hashPin(child.pin);
      const { error: credError } = await supabase
        .from("child_credentials")
        .insert({
          child_profile_id: createdChild.id,
          pin_hash: pinHash,
          credential_version: 1,
          active: true,
        });

      if (credError) {
        console.error("❌ Failed to create credentials:", credError.message);
        continue;
      }

      console.log(`   ✓ Created child credentials\n`);
    }

    console.log("✅ Test data seeding complete!");
    console.log("\n📋 You can now login with:");
    for (const child of testChildren) {
      console.log(`   TATI ID: ${child.tatiId}, PIN: ${child.pin}`);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run
seedTestChildren();
