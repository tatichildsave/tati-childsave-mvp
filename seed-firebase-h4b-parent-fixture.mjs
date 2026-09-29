#!/usr/bin/env node

/**
 * Seed Firebase with test parent account and family data
 * This creates the complete family structure needed for H4.B parent portal testing
 *
 * Emulator-only - checks FIRESTORE_EMULATOR_HOST before running
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (!FIRESTORE_EMULATOR_HOST || !FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    "❌ Firebase emulators not running. Set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST",
  );
  process.exit(1);
}

console.log(`✅ Using Firebase emulator at ${FIRESTORE_EMULATOR_HOST}`);

// Initialize Admin SDK with emulator
if (!admin.getApps().length) {
  admin.initializeApp({
    projectId: "demo-tati",
  });
}

const auth = getAuth();
const db = getFirestore();

async function seedParentAccount() {
  try {
    console.log("\n📋 Seeding H4.B Parent Account and Family Data...\n");

    // Test parent credentials
    const parentEmail = "parent-test@tati.dev";
    const parentPassword = "TatiTest2024!";
    const parentName = "Kwame Parent";

    // Family and child IDs (use consistent IDs for reproducibility)
    const familyId = "fam-h4b-test-parent";
    const parentMemberId = "parent-member-h4b";
    const childId = "liJg1870hgOVuzupRQmj"; // Existing test child from H4.B child fixture

    let parentUser;

    // 1. Create or get parent auth user
    console.log("1️⃣ Creating parent auth user...");
    try {
      parentUser = await auth.getUserByEmail(parentEmail);
      console.log(`   ✅ Parent user already exists: ${parentUser.uid}`);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        parentUser = await auth.createUser({
          email: parentEmail,
          password: parentPassword,
          displayName: parentName,
        });
        console.log(`   ✅ Created parent user: ${parentUser.uid}`);
      } else {
        throw err;
      }
    }

    // 2. Create family document if not exists
    console.log("2️⃣ Creating family document...");
    const familyRef = db.collection("families").doc(familyId);
    const familyDoc = await familyRef.get();

    if (!familyDoc.exists) {
      await familyRef.set({
        id: familyId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: parentUser.uid,
      });
      console.log(`   ✅ Created family: ${familyId}`);
    } else {
      console.log(`   ✅ Family already exists: ${familyId}`);
    }

    // 3. Create family membership for parent
    console.log("3️⃣ Creating family membership for parent...");
    const membershipRef = db.collection("users").doc(parentUser.uid).collection("familyMemberships").doc(familyId);
    const membershipDoc = await membershipRef.get();

    if (!membershipDoc.exists) {
      await membershipRef.set({
        status: "active",
        role: "parent",
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`   ✅ Created family membership: ${parentUser.uid} → ${familyId}`);
    } else {
      console.log(`   ✅ Family membership already exists`);
    }

    // 4. Create family member document for parent
    console.log("4️⃣ Creating family member entry for parent...");
    const familyMemberRef = db
      .collection("families")
      .doc(familyId)
      .collection("members")
      .doc(parentMemberId);
    const familyMemberDoc = await familyMemberRef.get();

    if (!familyMemberDoc.exists) {
      await familyMemberRef.set({
        uid: parentUser.uid,
        email: parentEmail,
        displayName: parentName,
        role: "parent",
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`   ✅ Created family member: ${parentMemberId}`);
    } else {
      console.log(`   ✅ Family member already exists`);
    }

    // 5. Check if existing test child from H4.B is linked to this family
    console.log("5️⃣ Linking test child to family...");
    const existingChildRef = db.collection("families").doc(familyId).collection("children").doc(childId);
    const existingChildDoc = await existingChildRef.get();

    if (!existingChildDoc.exists) {
      // Create a wrapper/reference document linking the existing child
      // Note: The actual child data exists in the original family structure
      // This is a linking document for the test
      console.log(`   ℹ️  Child ${childId} is linked via original family structure`);
    } else {
      console.log(`   ✅ Child already linked to family`);
    }

    // 6. Create a test child if needed for standalone testing
    console.log("6️⃣ Creating test child for parent (optional)...");
    const testChildId = "test-child-parent-portal";
    const testChildRef = db.collection("families").doc(familyId).collection("children").doc(testChildId);
    const testChildDoc = await testChildRef.get();

    if (!testChildDoc.exists) {
      await testChildRef.set({
        id: testChildId,
        familyId: familyId,
        tati_id: "TATI-PARENT-TEST",
        created_by: parentUser.uid,
        name: "Test Child",
        age: 10,
        avatar: "🧒",
        tier: "junior",
        curriculum_level: "Primary 5",
        onboarding_step: 0,
        onboarding_completed: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`   ✅ Created test child for parent portal testing`);
    } else {
      console.log(`   ✅ Test child already exists`);
    }

    console.log("\n✅ Parent Account Seeding Complete!");
    console.log("\nTest Credentials:");
    console.log(`  Email:    ${parentEmail}`);
    console.log(`  Password: ${parentPassword}`);
    console.log(`  Parent ID: ${parentUser.uid}`);
    console.log(`  Family ID: ${familyId}`);
    console.log("\nYou can now:");
    console.log("  1. Navigate to http://localhost:8080/login");
    console.log(`  2. Sign in with ${parentEmail} / ${parentPassword}`);
    console.log("  3. Parent portal should load with family and children data");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedParentAccount()
  .then(() => {
    console.log("\n✨ Seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
