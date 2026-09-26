/**
 * Firestore Emulator Fixture Setup using Admin SDK
 *
 * Creates test fixtures for Firestore security rules tests.
 * Run this setup BEFORE running tests: node tests/firebase/fixtures.cjs
 */

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

async function setupFixtures() {
  console.log("\n=== FIRESTORE EMULATOR FIXTURE SETUP ===\n");

  try {
    // Initialize Admin SDK
    admin.initializeApp({ projectId: "demo-tati" });
    const db = getFirestore();
    const auth = getAuth();

    const now = new Date();
    let created = 0;

    // Step 1: Create auth users
    console.log("Step 1: Creating Auth Users...");
    const users = [
      { uid: "parent-a", email: "parent-a@tati.test", password: "testpassword123" },
      { uid: "parent-b", email: "parent-b@tati.test", password: "testpassword123" },
      { uid: "facilitator-a", email: "facilitator-a@tati.test", password: "testpassword123" },
      { uid: "facilitator-b", email: "facilitator-b@tati.test", password: "testpassword123" },
      { uid: "admin", email: "admin@tati.test", password: "testpassword123" },
      { uid: "unknown", email: "unknown@tati.test", password: "testpassword123" },
    ];

    for (const user of users) {
      try {
        await auth.createUser({ uid: user.uid, email: user.email, password: user.password });
        console.log(`  ✓ ${user.email}`);
        created++;
      } catch (error) {
        if (error.code === "auth/uid-already-exists") {
          console.log(`  ~ ${user.email} (already exists)`);
        } else {
          console.log(`  ✗ ${user.email}: ${error.message}`);
        }
      }
    }

    // Step 2: Create user documents with active status
    console.log("\nStep 2: Creating User Documents...");
    const batch1 = db.batch();
    for (const user of users) {
      const userRoles =
        user.uid === "admin"
          ? ["admin"]
          : user.uid.includes("parent")
            ? ["parent"]
            : user.uid.includes("facilitator")
              ? ["facilitator"]
              : [];
      batch1.set(db.collection("users").doc(user.uid), {
        uid: user.uid,
        email: user.email,
        roles: userRoles,
        status: "active",
      });
    }
    await batch1.commit();
    console.log(`  ✓ ${users.length} user documents created`);

    // Step 3: Create Family A
    console.log("\nStep 3: Creating Family A...");
    const batch2 = db.batch();

    batch2.set(db.collection("families").doc("family-a"), {
      id: "family-a",
      name: "Family A",
      createdBy: "parent-a",
      createdAt: now,
      status: "active",
    });

    batch2.set(db.collection("families").doc("family-a").collection("members").doc("parent-a"), {
      uid: "parent-a",
      email: "parent-a@tati.test",
      role: "parent",
      status: "active",
      addedAt: now,
    });

    batch2.set(db.collection("families").doc("family-a").collection("children").doc("child-a1"), {
      id: "child-a1",
      childId: "child-a1",
      tatiId: "tati-1",
      familyId: "family-a",
      name: "Child A1",
      createdBy: "parent-a",
      createdAt: now,
      facilitatorUids: [],
    });

    batch2.set(db.collection("families").doc("family-a").collection("children").doc("child-a2"), {
      id: "child-a2",
      childId: "child-a2",
      tatiId: "tati-2",
      familyId: "family-a",
      name: "Child A2",
      createdBy: "parent-a",
      createdAt: now,
      facilitatorUids: [],
    });

    // Create sample journey progress for testing
    batch2.set(
      db
        .collection("families")
        .doc("family-a")
        .collection("children")
        .doc("child-a1")
        .collection("journeyProgress")
        .doc("test"),
      {
        familyId: "family-a",
        childId: "child-a1",
        score: null,
        maxScore: null,
        createdAt: now,
      },
    );

    await batch2.commit();
    console.log(`  ✓ Family A structure created`);

    // Step 4: Create Family B
    console.log("\nStep 4: Creating Family B...");
    const batch3 = db.batch();

    batch3.set(db.collection("families").doc("family-b"), {
      id: "family-b",
      name: "Family B",
      createdBy: "parent-b",
      createdAt: now,
      status: "active",
    });

    batch3.set(db.collection("families").doc("family-b").collection("members").doc("parent-b"), {
      uid: "parent-b",
      email: "parent-b@tati.test",
      role: "parent",
      status: "active",
      addedAt: now,
    });

    batch3.set(db.collection("families").doc("family-b").collection("children").doc("child-b1"), {
      id: "child-b1",
      childId: "child-b1",
      tatiId: "tati-3",
      familyId: "family-b",
      name: "Child B1",
      createdBy: "parent-b",
      createdAt: now,
      facilitatorUids: [],
    });

    await batch3.commit();
    console.log(`  ✓ Family B structure created`);

    console.log("\n=== FIXTURE SETUP COMPLETE ===\n");
    const apps = admin.getApps();
    for (const app of apps) {
      await admin.deleteApp(app);
    }
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Setup failed:", error);
    process.exit(1);
  }
}

setupFixtures();
