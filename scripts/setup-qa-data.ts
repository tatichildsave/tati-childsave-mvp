/**
 * H3.3 QA Data Setup Script
 * Creates Firestore documents for QA testing
 * This runs against production Firestore (not emulator)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// QA Test Data Definition
const QA_DATA = {
  users: [
    {
      docId: "32cde835-c1af-4439-a797-00fb165c56d1",
      data: {
        uid: "32cde835-c1af-4439-a797-00fb165c56d1",
        email: "admin-h33-qa-a@childsave.test",
        displayName: "QA Admin A",
        roles: ["admin"],
        status: "active",
        qaMarker: "h33-qa",
      },
    },
    {
      docId: "fc1d52d5-7200-4e38-bc97-058145fb4f9e",
      data: {
        uid: "fc1d52d5-7200-4e38-bc97-058145fb4f9e",
        email: "admin-h33-qa-b@childsave.test",
        displayName: "QA Admin B",
        roles: ["admin"],
        status: "active",
        qaMarker: "h33-qa",
      },
    },
    {
      docId: "7525a372-0e4d-4b43-9185-4281f29b0608",
      data: {
        uid: "7525a372-0e4d-4b43-9185-4281f29b0608",
        email: "facilitator-h33-qa-a@childsave.test",
        displayName: "QA Facilitator A",
        roles: ["facilitator"],
        status: "active",
        qaMarker: "h33-qa",
      },
    },
    {
      docId: "2964b466-3ee6-4f84-a4c1-212bdd03baab",
      data: {
        uid: "2964b466-3ee6-4f84-a4c1-212bdd03baab",
        email: "facilitator-h33-qa-b@childsave.test",
        displayName: "QA Facilitator B",
        roles: ["facilitator"],
        status: "active",
        qaMarker: "h33-qa",
      },
    },
    {
      docId: "8bcbf7e9-eb0f-4d8f-aaf3-9162a64ca014",
      data: {
        uid: "8bcbf7e9-eb0f-4d8f-aaf3-9162a64ca014",
        email: "parent-h33-qa-a@childsave.test",
        displayName: "QA Parent A",
        roles: [],
        status: "active",
        qaMarker: "h33-qa",
      },
    },
  ],
  schools: [
    {
      docId: "qa-school-h33-a",
      data: {
        id: "qa-school-h33-a",
        name: "H3.3 QA School A",
        status: "active",
        createdBy: "32cde835-c1af-4439-a797-00fb165c56d1",
        qaMarker: "h33-qa",
      },
    },
    {
      docId: "qa-school-h33-b",
      data: {
        id: "qa-school-h33-b",
        name: "H3.3 QA School B",
        status: "active",
        createdBy: "fc1d52d5-7200-4e38-bc97-058145fb4f9e",
        qaMarker: "h33-qa",
      },
    },
  ],
  schoolAdmins: [
    {
      schoolDocId: "qa-school-h33-a",
      adminDocId: "32cde835-c1af-4439-a797-00fb165c56d1",
      data: {
        adminUid: "32cde835-c1af-4439-a797-00fb165c56d1",
        role: "school_admin",
        qaMarker: "h33-qa",
      },
    },
    {
      schoolDocId: "qa-school-h33-b",
      adminDocId: "fc1d52d5-7200-4e38-bc97-058145fb4f9e",
      data: {
        adminUid: "fc1d52d5-7200-4e38-bc97-058145fb4f9e",
        role: "school_admin",
        qaMarker: "h33-qa",
      },
    },
  ],
  cohorts: [
    {
      docId: "qa-cohort-a1",
      data: {
        id: "qa-cohort-a1",
        schoolId: "qa-school-h33-a",
        name: "QA Cohort A1",
        facilitatorUid: "7525a372-0e4d-4b43-9185-4281f29b0608",
        status: "active",
        qaMarker: "h33-qa",
      },
    },
    {
      docId: "qa-cohort-b1",
      data: {
        id: "qa-cohort-b1",
        schoolId: "qa-school-h33-b",
        name: "QA Cohort B1",
        facilitatorUid: "2964b466-3ee6-4f84-a4c1-212bdd03baab",
        status: "active",
        qaMarker: "h33-qa",
      },
    },
  ],
};

async function setupQAData() {
  try {
    // Initialize Firebase Admin SDK
    const app = initializeApp({
      projectId: "tatichildsavemvp",
    });

    const db = getFirestore(app);

    console.log("\n📋 H3.3 QA Data Setup\n");

    let totalDocs = 0;

    // 1. Create user documents
    console.log("1️⃣  Creating user documents...");
    for (const user of QA_DATA.users) {
      await db.collection("users").doc(user.docId).set(user.data);
      console.log(`   ✓ ${user.data.email}`);
      totalDocs++;
    }

    // 2. Create schools
    console.log("\n2️⃣  Creating schools...");
    for (const school of QA_DATA.schools) {
      await db.collection("schools").doc(school.docId).set(school.data);
      console.log(`   ✓ ${school.data.name}`);
      totalDocs++;
    }

    // 3. Create school admin assignments
    console.log("\n3️⃣  Creating school admin assignments...");
    for (const admin of QA_DATA.schoolAdmins) {
      await db
        .collection("schools")
        .doc(admin.schoolDocId)
        .collection("admins")
        .doc(admin.adminDocId)
        .set(admin.data);
      console.log(`   ✓ Admin for ${admin.schoolDocId}`);
      totalDocs++;
    }

    // 4. Create cohorts
    console.log("\n4️⃣  Creating cohorts...");
    for (const cohort of QA_DATA.cohorts) {
      await db.collection("academyCohorts").doc(cohort.docId).set(cohort.data);
      console.log(`   ✓ ${cohort.data.name}`);
      totalDocs++;
    }

    console.log(`\n✅ QA Setup Complete! Created ${totalDocs} documents\n`);

    // Clean up
    app.delete();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

setupQAData().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
