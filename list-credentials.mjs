/**
 * List all documents in /childCredentials collection
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_PROJECT_ID = "demo-tati";
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        projectId: "demo-tati",
      });

const db = getFirestore(app);

async function listCredentials() {
  console.log("📋 Listing /childCredentials collection...\n");

  const snapshot = await db.collection("childCredentials").get();

  if (snapshot.empty) {
    console.log("❌ NO DOCUMENTS FOUND in /childCredentials");
    return;
  }

  console.log(`✅ Found ${snapshot.size} documents:\n`);

  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`  📄 ${doc.id}`);
    console.log(`     - childId: ${data.childId}`);
    console.log(`     - familyId: ${data.familyId}`);
    console.log(`     - active: ${data.active}`);
    console.log(`     - pinHash: ${String(data.pinHash).substring(0, 40)}...`);
    console.log();
  });
}

listCredentials().catch(console.error);
