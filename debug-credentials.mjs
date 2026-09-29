/**
 * Debug: Verify Child Credentials in Firestore
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const isEmulatorMode = () => !!process.env["FIRESTORE_EMULATOR_HOST"];

async function debug() {
  if (!isEmulatorMode()) {
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
  console.log("🔍 Checking Firestore credentials...\n");

  try {
    // Check each expected TATI ID (from latest run)
    const tatiIds = ["TATI-3B281288", "TATI-797C1591", "TATI-F1DA8FB3", "TATI-236734CE"];

    for (const tatiId of tatiIds) {
      const doc = await db.collection("childCredentials").doc(tatiId).get();
      if (doc.exists) {
        const data = doc.data();
        console.log(`✓ ${tatiId}`);
        console.log(`  - childId: ${data.childId}`);
        console.log(`  - familyId: ${data.familyId}`);
        console.log(`  - active: ${data.active}`);
        console.log(`  - pinHash (first 50 chars): ${String(data.pinHash).substring(0, 50)}...`);
      } else {
        console.log(`✗ ${tatiId} NOT FOUND`);
      }
    }

    console.log("\n🔍 Checking child profiles...\n");
    const familyId = "D28wvxj5YcwApBVqqPcS"; // New family from latest run
    const childrenRef = await db.collection("families").doc(familyId).collection("children").get();

    console.log(`Found ${childrenRef.size} child profiles`);
    childrenRef.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.name} (TATI: ${data.tatiId})`);
    });
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

debug();
