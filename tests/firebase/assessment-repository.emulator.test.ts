/**
 * Group 2 Redo: Emulator-backed tests for FirebaseAssessmentRepository
 *
 * Tests using real Firestore emulator (not mocked):
 * - Sequential submission OK
 * - Stale expectedVersion rejected
 * - Promise.all concurrency: one success, one rejection
 * - Retake cleanup (only new responses remain)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Firestore } from "firebase/firestore";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  createEmulatorApp,
  connectEmulatorFirestore,
  connectEmulatorAuth,
  createTestFixtures,
} from "./emulator-setup";
import { FirebaseAssessmentRepository } from "@/lib/backend/firebase/repositories";
import type { AssessmentDefinition, AssessmentResult } from "@/lib/assessment/types";

let db: Firestore;
let adminDb: admin.firestore.Firestore;
let adminApp: admin.app.App;

const familyId = "test-family-emulator";
const childId = "test-child-emulator";

const sampleDefinition: AssessmentDefinition = {
  id: "save-pre",
  trackId: "save",
  assessmentType: "pre",
  title: "Test Assessment",
  shortTitle: "Test",
  intro: "Intro",
  introHeadline: "Headline",
  introImageUrl: "http://test.png",
  introImageBadge: "Badge",
  introTopics: [],
  estimatedMinutes: 5,
  startingWallet: 10,
  outro: "Outro",
  outroImageUrl: "http://test.png",
  outroImageBadge: "Badge",
  showScoreToChild: false,
  questions: [
    {
      id: "q1",
      assessmentType: "pre",
      competency: "comp1",
      question: "Q1?",
      options: [
        { id: "opt1a", label: "A" },
        { id: "opt1b", label: "B" },
      ],
      feedback: "Good",
    },
  ],
};

describe("FirebaseAssessmentRepository - Emulator-backed Tests", () => {
  beforeAll(async () => {
    const emulatorApp = createEmulatorApp("test-project");
    db = connectEmulatorFirestore(emulatorApp);

    // Initialize admin SDK for emulator
    try {
      adminApp = admin.initializeApp(
        {
          projectId: "test-project",
        },
        `admin-test-${Date.now()}`,
      );
    } catch (e) {
      // Already initialized
      adminApp = admin.app(`admin-test-${Date.now()}`);
    }

    adminDb = getFirestore(adminApp);
    (adminDb as any).settings({ experimentalForceLongPolling: true });

    // Setup minimal test data: create family and child
    const familyRef = adminDb.collection("families").doc(familyId);
    await familyRef.set({
      id: familyId,
      name: "Test Family",
      createdAt: FieldValue.serverTimestamp(),
    });

    const childRef = familyRef.collection("children").doc(childId);
    await childRef.set({
      id: childId,
      familyId,
      name: "Test Child",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  afterAll(async () => {
    if (adminApp) {
      await adminApp.delete();
    }
  });

  beforeEach(async () => {
    // Clear assessment attempts before each test
    const attemptRef = adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc("save-pre");
    await attemptRef.delete();

    // Also delete responses subcollection
    const responses = await attemptRef.collection("responses").get();
    for (const doc of responses.docs) {
      await doc.ref.delete();
    }
  });

  it("sequential submit with version 0, 1, 2 OK", async () => {
    const repository = new FirebaseAssessmentRepository(adminDb as any, familyId);

    const result: AssessmentResult = {
      assessmentId: "save-pre",
      assessmentType: "pre",
      points: 1,
      maxPoints: 1,
      responses: { q1: "opt1a" },
      competencies: [],
    };

    // First submit (version 0)
    await repository.saveAttempt({
      childId,
      definition: sampleDefinition,
      result,
      expectedVersion: 0,
    });

    // Verify version is now 1
    const doc1 = await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc("save-pre")
      .get();
    expect(doc1.data()?.version).toBe(1);

    // Second submit (version 1)
    await repository.saveAttempt({
      childId,
      definition: sampleDefinition,
      result: { ...result, points: 2 },
      expectedVersion: 1,
    });

    // Verify version is now 2
    const doc2 = await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc("save-pre")
      .get();
    expect(doc2.data()?.version).toBe(2);

    // Third submit (version 2)
    await repository.saveAttempt({
      childId,
      definition: sampleDefinition,
      result: { ...result, points: 1 },
      expectedVersion: 2,
    });

    // Verify version is now 3
    const doc3 = await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc("save-pre")
      .get();
    expect(doc3.data()?.version).toBe(3);
  });

  it("stale expectedVersion rejected with clear error", async () => {
    const repository = new FirebaseAssessmentRepository(adminDb as any, familyId);

    const result: AssessmentResult = {
      assessmentId: "save-pre",
      assessmentType: "pre",
      points: 1,
      maxPoints: 1,
      responses: { q1: "opt1a" },
      competencies: [],
    };

    // Create initial document with version 2
    await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc("save-pre")
      .set({
        id: "save-pre",
        childId,
        familyId,
        version: 2,
        status: "completed",
      });

    // Try to submit with wrong expectedVersion (1 instead of 2)
    await expect(
      repository.saveAttempt({
        childId,
        definition: sampleDefinition,
        result,
        expectedVersion: 1,
      }),
    ).rejects.toThrow(/version conflict|expected version 1.*has version 2/i);
  });

  it("Promise.all concurrency: one success, one rejection for same expectedVersion", async () => {
    const repository = new FirebaseAssessmentRepository(adminDb as any, familyId);

    const result: AssessmentResult = {
      assessmentId: "save-pre",
      assessmentType: "pre",
      points: 1,
      maxPoints: 1,
      responses: { q1: "opt1a" },
      competencies: [],
    };

    // Create initial document with version 1
    await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc("save-pre")
      .set({
        id: "save-pre",
        childId,
        familyId,
        version: 1,
        status: "completed",
      });

    // Send two concurrent submits with same expectedVersion (1)
    const results = await Promise.allSettled([
      repository.saveAttempt({
        childId,
        definition: sampleDefinition,
        result: { ...result, points: 1 },
        expectedVersion: 1,
      }),
      repository.saveAttempt({
        childId,
        definition: sampleDefinition,
        result: { ...result, points: 2 },
        expectedVersion: 1,
      }),
    ]);

    // Exactly one success, one rejection
    const statuses = results.map((r) => r.status);
    expect(statuses).toContain("fulfilled");
    expect(statuses).toContain("rejected");
    expect(statuses.filter((s) => s === "fulfilled")).toHaveLength(1);
    expect(statuses.filter((s) => s === "rejected")).toHaveLength(1);

    // The rejection should be about version conflict
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.message).toMatch(/version conflict/i);
  });

  it("retake deletes old responses, only new responses remain", async () => {
    const repository = new FirebaseAssessmentRepository(adminDb as any, familyId);

    const result1: AssessmentResult = {
      assessmentId: "save-pre",
      assessmentType: "pre",
      points: 1,
      maxPoints: 1,
      responses: { q1: "opt1a" },
      competencies: [],
    };

    // First submission
    await repository.saveAttempt({
      childId,
      definition: sampleDefinition,
      result: result1,
      expectedVersion: 0,
    });

    // Verify first response exists
    const responsesAfterFirst = await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc("save-pre")
      .collection("responses")
      .get();
    expect(responsesAfterFirst.docs.length).toBe(1);

    // Second submission (retake) with version 1
    const result2: AssessmentResult = {
      assessmentId: "save-pre",
      assessmentType: "pre",
      points: 1,
      maxPoints: 1,
      responses: { q1: "opt1b" },
      competencies: [],
    };

    await repository.saveAttempt({
      childId,
      definition: sampleDefinition,
      result: result2,
      expectedVersion: 1,
    });

    // Verify old response deleted and new one exists
    const responsesAfterRetake = await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("assessmentAttempts")
      .doc("save-pre")
      .collection("responses")
      .get();
    expect(responsesAfterRetake.docs.length).toBe(1);
    expect(responsesAfterRetake.docs[0].data().optionId).toBe("opt1b");
  });
});
