/**
 * Firebase Emulator Setup and Test Utilities
 *
 * This module provides utilities for testing Firestore Security Rules
 * against the local Firebase Emulator (NOT production).
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, Firestore, initializeFirestore } from "firebase/firestore";
import { Auth, connectAuthEmulator, initializeAuth } from "firebase/auth";
import { RpcStatus } from "@firebase/firestore";
import * as admin from "firebase-admin";
import { initializeApp as adminInitializeApp } from "firebase-admin/app";
import { getFirestore as adminGetFirestore, Timestamp } from "firebase-admin/firestore";

/**
 * Test identity model for emulator testing
 */
export interface TestIdentity {
  uid: string;
  email?: string;
  roles?: string[];
}

/**
 * Create a test Firebase app connected to the emulator
 */
export function createEmulatorApp(projectId: string): FirebaseApp {
  const app = initializeApp(
    {
      apiKey: "AIzaSyDEDN6fS0h2dKkWgkZfR2JPlqjUFLVFtZM",
      authDomain: "demo-tati.firebaseapp.com",
      projectId,
      storageBucket: "demo-tati.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef123456",
    },
    { name: `test-${projectId}-${Date.now()}` },
  );

  return app;
}

/**
 * Connect Firestore to the emulator
 */
export function connectEmulatorFirestore(app: FirebaseApp): Firestore {
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });

  const host = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const [hostname, port] = host.split(":");

  connectFirestoreEmulator(db, hostname, parseInt(port || "8080"));

  return db;
}

/**
 * Connect Firebase Auth to the emulator
 */
export function connectEmulatorAuth(app: FirebaseApp): Auth {
  const auth = initializeAuth(app, {
    persistence: [],
  });

  connectAuthEmulator(auth, `http://127.0.0.1:9099`, { disableWarnings: true });

  return auth;
}

/**
 * Get or initialize Admin SDK for emulator
 * This allows test setup to bypass security rules
 */
export function getAdminFirestore(projectId: string): admin.firestore.Firestore {
  // Set emulator environment variables before initializing
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  
  // Check if an admin app already exists for this project
  let adminApp: admin.app.App;
  
  try {
    // Try to get existing app
    adminApp = admin.app(`admin-${projectId}`);
  } catch {
    // If not found, create a new one
    adminApp = adminInitializeApp(
      {
        projectId,
      },
      `admin-${projectId}`,
    );
  }

  // Get firestore instance from the app
  return adminGetFirestore(adminApp) as admin.firestore.Firestore;
}

/**
 * Create test fixtures in Firestore using Admin SDK
 * This bypasses security rules for test setup
 * 
 * @param projectId - Firebase project ID
 * @param users - User configuration with roles
 * @param userUidMap - Map of user keys to actual Firebase UIDs (from createUserWithEmailAndPassword)
 */
export async function createTestFixtures(
  projectId: string,
  users: Record<string, { email: string; password: string; roles: string[] }>,
  userUidMap?: Record<string, string>,
): Promise<void> {
  const db = getAdminFirestore(projectId);

  // Map user keys to their actual Firebase UIDs
  // If userUidMap provided, use real UIDs; otherwise use keys (for backward compatibility)
  const userDocs: Record<string, Record<string, unknown>> = {};
  
  for (const [key, data] of Object.entries(users)) {
    // Use actual UID if provided, otherwise use key
    const uid = userUidMap?.[key] ?? key;
    userDocs[uid] = {
      uid,
      email: data.email,
      displayName: `Test ${key}`,
      status: data.roles.includes("admin") ? "active" : "pending",
      roles: data.roles,
      emailVerified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  console.log("Creating users with UIDs:", Object.keys(userDocs));

  // Create user documents
  for (const [uid, userData] of Object.entries(userDocs)) {
    await db.collection("users").doc(uid).set(userData);
  }

  // Map of key names to actual UIDs for family relationships
  const keyToUid = (key: string) => userUidMap?.[key] ?? key;

  console.log("Creating families");

  // Create families
  const families = [
    {
      id: "family-a",
      familyId: "family-a",
      name: "Test Family A",
      createdBy: keyToUid("parent-a"),
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: "family-b",
      familyId: "family-b",
      name: "Test Family B",
      createdBy: keyToUid("parent-b"),
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];

  for (const family of families) {
    await db.collection("families").doc(family.id).set(family);
  }

  console.log("Creating members");

  // Create family members
  const members = [
    { familyId: "family-a", key: "parent-a", role: "parent", status: "active" },
    { familyId: "family-b", key: "parent-b", role: "parent", status: "active" },
    { familyId: "family-a", key: "facilitator-a", role: "facilitator", status: "active" },
  ];

  for (const member of members) {
    const uid = keyToUid(member.key);
    const memberData = {
      uid,
      role: member.role,
      status: member.status,
      invitedBy: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await db
      .collection("families")
      .doc(member.familyId)
      .collection("members")
      .doc(uid)
      .set(memberData);
  }

  console.log("Creating children");

  // Create children
  const children = [
    {
      id: "child-a1",
      childId: "child-a1",
      familyId: "family-a",
      name: "Test Child A1",
      tatiId: "tati-child-a1",
      createdBy: keyToUid("parent-a"),
      facilitatorUids: [keyToUid("facilitator-a")],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    {
      id: "child-b1",
      childId: "child-b1",
      familyId: "family-b",
      name: "Test Child B1",
      tatiId: "tati-child-b1",
      createdBy: keyToUid("parent-b"),
      facilitatorUids: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  ];

  for (const child of children) {
    await db
      .collection("families")
      .doc(child.familyId)
      .collection("children")
      .doc(child.id)
      .set(child);
  }

  console.log("Creating journey progress");

  // Create journey progress documents
  await db
    .collection("families")
    .doc("family-a")
    .collection("children")
    .doc("child-a1")
    .collection("journeyProgress")
    .doc("progress-1")
    .set({
      itemKey: "progress-1",
      familyId: "family-a",
      childId: "child-a1",
      createdBy: keyToUid("parent-a"),
      status: "in_progress",
      score: null,
      maxScore: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

  // Create assessment attempt documents
  await db
    .collection("families")
    .doc("family-a")
    .collection("children")
    .doc("child-a1")
    .collection("assessmentAttempts")
    .doc("attempt-1")
    .set({
      id: "attempt-1",
      familyId: "family-a",
      childId: "child-a1",
      assessmentKey: "test-assessment",
      status: "completed",
      score: 85,
      maxScore: 100,
      competencyScores: {},
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
}

/**
 * Create a fake auth token for emulator testing
 * This simulates a user with the given UID and custom claims
 */
export function createFakeIdToken(uid: string, roles: string[] = []): string {
  // This is a simplified representation for emulator testing
  // The emulator accepts this format for local testing only
  return Buffer.from(
    JSON.stringify({
      sub: uid,
      iss: "https://securetoken.google.com/demo-tati",
      aud: "demo-tati",
      auth_time: Math.floor(Date.now() / 1000),
      user_id: uid,
      firebase: {
        identities: {
          email: [`${uid}@example.com`],
        },
        sign_in_provider: "custom",
      },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      email: `${uid}@example.com`,
      email_verified: false,
      roles,
    }),
  ).toString("base64");
}

/**
 * Test data builders for emulator setup
 */
export const testData = {
  /**
   * Create a user document
   */
  user(uid: string, overrides?: Record<string, unknown>) {
    return {
      uid,
      email: `${uid}@example.com`,
      displayName: `Test User ${uid}`,
      status: "active",
      roles: [],
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create a family document
   */
  family(familyId: string, createdBy: string, overrides?: Record<string, unknown>) {
    return {
      id: familyId,
      familyId,
      name: `Test Family ${familyId}`,
      createdBy,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create a family member document
   */
  familyMember(
    uid: string,
    role: "parent" | "guardian" = "parent",
    overrides?: Record<string, unknown>,
  ) {
    return {
      uid,
      role,
      status: "active",
      invitedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create a child document
   */
  child(childId: string, familyId: string, createdBy: string, overrides?: Record<string, unknown>) {
    return {
      id: childId,
      childId,
      familyId,
      name: `Test Child ${childId}`,
      tatiId: `tati-${childId}`,
      createdBy,
      facilitatorUids: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create journey progress document
   */
  journeyProgress(
    itemKey: string,
    familyId: string,
    childId: string,
    createdBy?: string,
    overrides?: Record<string, unknown>,
  ) {
    return {
      itemKey,
      familyId,
      childId,
      createdBy: createdBy || childId,
      status: "in_progress",
      score: null,
      maxScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create an assessment attempt document
   */
  assessmentAttempt(
    attemptId: string,
    familyId: string,
    childId: string,
    overrides?: Record<string, unknown>,
  ) {
    return {
      id: attemptId,
      familyId,
      childId,
      assessmentKey: "test-assessment",
      status: "completed",
      score: 85,
      maxScore: 100,
      competencyScores: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create a scenario session document
   */
  scenarioSession(
    scenarioKey: string,
    familyId: string,
    childId: string,
    overrides?: Record<string, unknown>,
  ) {
    return {
      scenarioKey,
      familyId,
      childId,
      available: true,
      saved: true,
      goalTarget: null,
      competencies: [],
      flags: {},
      nodeId: "start",
      nextNodeId: null,
      phase: 1,
      consequence: null,
      endingId: null,
      totals: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create a competency document
   */
  competency(
    competencyId: string,
    familyId: string,
    childId: string,
    overrides?: Record<string, unknown>,
  ) {
    return {
      competencyId,
      familyId,
      childId,
      score: 0,
      level: "novice",
      evidence: {},
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create an achievement document
   */
  achievement(
    achievementId: string,
    familyId: string,
    childId: string,
    overrides?: Record<string, unknown>,
  ) {
    return {
      achievementId,
      familyId,
      childId,
      awardedAt: new Date(),
      sourceItemKey: "test-item",
      ...overrides,
    };
  },

  /**
   * Create parent insights document
   */
  parentInsights(
    insightId: string,
    familyId: string,
    childId: string,
    overrides?: Record<string, unknown>,
  ) {
    return {
      id: insightId,
      familyId,
      childId,
      insight: "Test insight",
      generatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create feedback document
   */
  feedback(submittedByUid: string, overrides?: Record<string, unknown>) {
    return {
      id: `feedback-${submittedByUid}-${Date.now()}`,
      submittedByUid,
      message: "Test feedback",
      category: "general",
      submittedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create analytics event document
   */
  analyticsEvent(actorUid: string, eventName: string, overrides?: Record<string, unknown>) {
    return {
      id: `event-${actorUid}-${Date.now()}`,
      eventName,
      actorUid,
      childId: null,
      familyId: null,
      entityId: null,
      eventKey: eventName,
      occurredAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create child credentials document
   */
  childCredentials(
    tatiId: string,
    childId: string,
    familyId: string,
    overrides?: Record<string, unknown>,
  ) {
    return {
      tatiId,
      childId,
      familyId,
      pinHash: "hashed-pin",
      credentialVersion: 1,
      active: true,
      revokedAt: null,
      rotatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Create child session document
   */
  childSession(
    sessionId: string,
    childId: string,
    familyId: string,
    overrides?: Record<string, unknown>,
  ) {
    return {
      sessionId,
      childId,
      familyId,
      tokenHash: "hashed-token",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      revokedAt: null,
      lastSeenAt: null,
      ...overrides,
    };
  },
};


