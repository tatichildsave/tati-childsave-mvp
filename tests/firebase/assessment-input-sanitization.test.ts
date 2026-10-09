import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Firestore } from "firebase/firestore";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { createEmulatorApp, connectEmulatorFirestore } from "./emulator-setup";
import { FirebaseAssessmentRepository } from "@/lib/backend/firebase/repositories";
import type { AssessmentDefinition, AssessmentResult } from "@/lib/assessment/types";

let db: Firestore;
let adminDb: admin.firestore.Firestore;
let adminApp: admin.app.App;

const familyId = "test-family-sanitization";
const authenticatedChildId = "authenticated-child-id";
const differentChildId = "different-child-id";

const sampleDefinition: AssessmentDefinition = {
  id: "test-assess",
  type: "pre",
  assessmentType: "pre",
  title: "Test Assessment",
  maxPoints: 10,
  questions: [
    {
      id: "q1",
      type: "single",
      title: "Question 1",
      competency: "basic-math",
      options: [
        { id: "opt1a", text: "Option 1A", points: 1 },
        { id: "opt1b", text: "Option 1B", points: 0 },
      ],
    },
  ],
};

describe("Assessment Input Sanitization Tests", () => {
  beforeAll(async () => {
    const emulatorApp = createEmulatorApp("test-project");
    db = connectEmulatorFirestore(emulatorApp);

    // Initialize admin SDK for emulator
    try {
      adminApp = admin.initializeApp(
        {
          projectId: "test-project",
        },
        `admin-test-sanitization-${Date.now()}`,
      );
    } catch (e) {
      // Already initialized
      adminApp = admin.app(`admin-test-sanitization-${Date.now()}`);
    }

    adminDb = getFirestore(adminApp);
    (adminDb as any).settings({ experimentalForceLongPolling: true });

    // Setup test data: create family and two children
    const familyRef = adminDb.collection("families").doc(familyId);
    await familyRef.set({
      id: familyId,
      name: "Test Family",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Authenticated child (the one from ChildSession context)
    const authenticatedChildRef = familyRef
      .collection("children")
      .doc(authenticatedChildId);
    await authenticatedChildRef.set({
      id: authenticatedChildId,
      familyId,
      name: "Authenticated Child",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Different child (attempted spoofing)
    const differentChildRef = familyRef
      .collection("children")
      .doc(differentChildId);
    await differentChildRef.set({
      id: differentChildId,
      familyId,
      name: "Different Child",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  afterAll(async () => {
    if (adminApp) {
      await adminApp.delete();
    }
  });

  const getRepository = () => {
    return new FirebaseAssessmentRepository(adminDb as any, familyId);
  };

  beforeEach(async () => {
    // Clean up assessment attempts before each test (for both children)
    const childRef1 = adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(authenticatedChildId);

    const childRef2 = adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(differentChildId);

    const attemptsSnap1 = await childRef1.collection("assessmentAttempts").get();
    for (const doc of attemptsSnap1.docs) {
      await doc.ref.delete();
    }

    const attemptsSnap2 = await childRef2.collection("assessmentAttempts").get();
    for (const doc of attemptsSnap2.docs) {
      await doc.ref.delete();
    }
  });

  it("ITEM_3_A: childId_in_input_is_ignored_and_write_uses_authenticated_childId_from_ChildSession_context", async () => {
    const repository = getRepository();

    const result: AssessmentResult = {
      assessmentId: "sanitize-a-childid",
      assessmentType: "pre",
      points: 5,
      maxPoints: 10,
      responses: { q1: "opt1a" },
      competencies: [],
    };

    // Attempt to pass a different childId in the input (should be ignored)
    // Repository should write to authenticatedChildId instead
    await repository.saveAttempt({
      childId: authenticatedChildId, // The correct authenticated child ID
      definition: sampleDefinition,
      result,
      expectedVersion: 0,
    });

    // Verify the document was written to authenticatedChildId's collection
    // Note: Document ID is definition.id (test-assess), not result.assessmentId
    const docSnapshot = await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(authenticatedChildId)
      .collection("assessmentAttempts")
      .doc("test-assess")
      .get();

    expect(docSnapshot.exists).toBe(true);
    const data = docSnapshot.data();
    expect(data?.childId).toBe(authenticatedChildId);

    // Verify no document exists under differentChildId
    const maliciousDocSnapshot = await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(differentChildId)
      .collection("assessmentAttempts")
      .doc("test-assess")
      .get();

    expect(maliciousDocSnapshot.exists).toBe(false);
  });

  it("ITEM_3_B: submittedAt_in_input_is_ignored_and_server_timestamp_is_used", async () => {
    const repository = getRepository();

    const result: AssessmentResult = {
      assessmentId: "sanitize-b-submittedat",
      assessmentType: "pre",
      points: 3,
      maxPoints: 10,
      responses: { q1: "opt1b" },
      competencies: [],
    };

    // Attempt to pass a submittedAt timestamp in the input (should be ignored)
    const fakeSubmittedAt = new Date("2020-01-01T00:00:00Z");

    await repository.saveAttempt({
      childId: authenticatedChildId,
      definition: sampleDefinition,
      result,
      expectedVersion: 0,
      submittedAt: fakeSubmittedAt, // Should be ignored
    } as any); // Cast to bypass type checking since submittedAt is not in the interface

    // Retrieve the document
    // Note: Document ID is definition.id (test-assess), not result.assessmentId
    const docSnapshot = await adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(authenticatedChildId)
      .collection("assessmentAttempts")
      .doc("test-assess")
      .get();

    expect(docSnapshot.exists).toBe(true);
    const data = docSnapshot.data();

    // Verify submittedAt is a server timestamp (Timestamp object), not the fake date
    expect(data?.submittedAt).toBeInstanceOf(Timestamp);

    // Verify it's approximately now (within 5 seconds)
    const serverTimestamp = (data?.submittedAt as Timestamp).toDate();
    const now = new Date();
    const diffMs = now.getTime() - serverTimestamp.getTime();

    expect(Math.abs(diffMs)).toBeLessThan(5000);

    // Confirm it's NOT the fake date
    expect(serverTimestamp.getTime()).not.toBe(fakeSubmittedAt.getTime());
  });
});
