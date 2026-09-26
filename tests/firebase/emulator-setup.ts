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
