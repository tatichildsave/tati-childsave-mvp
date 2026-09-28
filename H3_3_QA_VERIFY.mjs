#!/usr/bin/env node
/**
 * H3.3 QA Data Verification & Recovery Script
 * This script verifies that all QA data exists in production Firestore
 * and recreates any missing documents.
 */

import admin from "firebase-admin";

const QA_DATA = {
  users: [
    { docId: "32cde835-c1af-4439-a797-00fb165c56d1", displayName: "QA Admin A", roles: ["admin"] },
    { docId: "fc1d52d5-7200-4e38-bc97-058145fb4f9e", displayName: "QA Admin B", roles: ["admin"] },
    {
      docId: "7525a372-0e4d-4b43-9185-4281f29b0608",
      displayName: "QA Facilitator A",
      roles: ["facilitator"],
    },
    {
      docId: "2964b466-3ee6-4f84-a4c1-212bdd03baab",
      displayName: "QA Facilitator B",
      roles: ["facilitator"],
    },
    { docId: "8bcbf7e9-eb0f-4d8f-aaf3-9162a64ca014", displayName: "QA Parent A", roles: [] },
  ],
  schools: [
    { docId: "qa-school-h33-a", name: "H3.3 QA School A" },
    { docId: "qa-school-h33-b", name: "H3.3 QA School B" },
  ],
};

async function verifyAndRecoverQAData() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp();
    }

    const db = admin.firestore();
    console.log("\n📋 Verifying H3.3 QA Data\n");

    let verified = 0;
    let recreated = 0;

    // Verify users
    console.log("Checking users...");
    for (const user of QA_DATA.users) {
      const doc = await db.collection("users").doc(user.docId).get();
      if (doc.exists) {
        const data = doc.data();
        if (data.roles && Array.isArray(data.roles)) {
          console.log(`  ✓ ${user.displayName} exists (roles: ${data.roles.join(",")})`);
          verified++;
        } else {
          console.log(`  ⚠ ${user.displayName} missing roles field`);
        }
      } else {
        console.log(`  ✗ ${user.displayName} missing - recreating...`);
        await db.collection("users").doc(user.docId).set({
          uid: user.docId,
          displayName: user.displayName,
          roles: user.roles,
          status: "active",
          qaMarker: "h33-qa",
          createdAt: admin.firestore.Timestamp.now(),
        });
        console.log(`    ✓ Recreated ${user.displayName}`);
        recreated++;
      }
    }

    // Verify schools
    console.log("\nChecking schools...");
    for (const school of QA_DATA.schools) {
      const doc = await db.collection("schools").doc(school.docId).get();
      if (doc.exists) {
        console.log(`  ✓ ${school.name} exists`);
        verified++;
      } else {
        console.log(`  ✗ ${school.name} missing - recreating...`);
        await db.collection("schools").doc(school.docId).set({
          id: school.docId,
          name: school.name,
          status: "active",
          qaMarker: "h33-qa",
          createdAt: admin.firestore.Timestamp.now(),
        });
        console.log(`    ✓ Recreated ${school.name}`);
        recreated++;
      }
    }

    console.log(`\n📊 Results: ${verified} verified, ${recreated} recreated`);

    if (recreated > 0) {
      console.log("\n⚠️  Some documents were missing and have been recreated.");
      console.log("The facilitator login should now work.");
    } else {
      console.log("\n✓ All QA data is present.");
      console.log("\nIf login still fails, check:");
      console.log("1. Firestore rules allow reading /users/{uid}");
      console.log("2. Supabase JWT is being passed to Firestore");
      console.log("3. request.auth.uid matches the document ID");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\nTo fix this, ensure:");
    console.error("1. GOOGLE_APPLICATION_CREDENTIALS environment variable is set");
    console.error("2. Or use Application Default Credentials (ADC) configuration");
    console.error("3. Or run this script on Google Cloud where ADC is automatically available");
    process.exit(1);
  }
}

verifyAndRecoverQAData()
  .then(() => {
    console.log("\n✨ Verification complete\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n🚨 Fatal error:", error);
    process.exit(1);
  });
