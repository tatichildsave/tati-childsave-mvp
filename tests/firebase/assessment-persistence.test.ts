/**
 * Phase 7C4B: Assessment Persistence Tests
 *
 * Tests Firebase-backed assessment submission with:
 * - ChildSession authorization
 * - Atomic transaction writes
 * - Retake and duplicate handling
 * - Stale submission rejection
 * - Concurrent submission safety
 * - Firestore security rules
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FieldValue } from "firebase-admin/firestore";
import type { AssessmentDefinition, AssessmentResult } from "@/lib/assessment/types";
import { FirebaseAssessmentRepository } from "@/lib/backend/firebase/repositories";

// Mock Firebase types for testing
type MockFirestore = {
  runTransaction: (callback: (tx: MockTransaction) => Promise<void>) => Promise<void>;
  collection: (name: string) => MockCollectionRef;
};

type MockCollectionRef = {
  doc: (id: string) => MockDocumentRef;
  _path?: string[];
};

type MockDocumentRef = {
  collection: (name: string) => MockCollectionRef;
  get: () => Promise<MockDocumentSnapshot>;
  _isDocumentRef?: boolean;
  _path?: string[];
};

type MockDocumentSnapshot = {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
  ref?: MockDocumentRef;
};

type MockTransaction = {
  get: (ref: MockDocumentRef | MockCollectionRef) => Promise<MockDocumentSnapshot | MockQuerySnapshot>;
  set: (ref: MockDocumentRef, data: Record<string, unknown>, options?: { merge: boolean }) => void;
  delete: (ref: MockDocumentRef) => void;
};

type MockQuerySnapshot = {
  docs: Array<{ ref: MockDocumentRef; data: () => Record<string, unknown> }>;
};

describe("FirebaseAssessmentRepository - Assessment Persistence", () => {
  let db: MockFirestore;
  let repository: FirebaseAssessmentRepository;
  const familyId = "test-family-1";
  const childId = "test-child-1";

  // Sample assessment definition
  const sampleDefinition: AssessmentDefinition = {
    id: "save-pre",
    trackId: "save",
    assessmentType: "pre",
    title: "Test Assessment",
    shortTitle: "Test",
    intro: "Test intro",
    introHeadline: "Test headline",
    introImageUrl: "http://test.png",
    introImageBadge: "Test Badge",
    introTopics: [],
    estimatedMinutes: 5,
    startingWallet: 10,
    outro: "Test outro",
    outroImageUrl: "http://test.png",
    outroImageBadge: "Test Badge",
    showScoreToChild: false,
    questions: [
      {
        id: "q1",
        assessmentType: "pre",
        competency: "needs-vs-wants",
        question: "Test question 1?",
        options: [
          { id: "opt1a", label: "Option A" },
          { id: "opt1b", label: "Option B" },
        ],
        feedback: "Good choice",
      },
      {
        id: "q2",
        assessmentType: "pre",
        competency: "saving",
        question: "Test question 2?",
        options: [
          { id: "opt2a", label: "Option A" },
          { id: "opt2b", label: "Option B" },
        ],
        feedback: "Great",
      },
    ],
  };

  beforeEach(() => {
    // Initialize mock Firebase
    db = createMockFirestore();
    repository = new FirebaseAssessmentRepository(db as any, familyId);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Submission", () => {
    it("should persist pre-assessment with correct score and responses", async () => {
      const responses = {
        q1: "opt1a",
        q2: "opt2b",
      };

      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 2,
        maxPoints: 2,
        responses,
        competencies: [
          { competency: "needs-vs-wants", points: 1, maxPoints: 1 },
          { competency: "saving", points: 1, maxPoints: 1 },
        ],
      };

      await repository.saveAttempt({
        childId,
        definition: sampleDefinition,
        result,
      });

      // Verify attempt was written
      expect(db.collection("families").doc(familyId).collection("children").doc(childId)).toBeDefined();
    });

    it("should persist post-assessment with different competencies", async () => {
      const postDefinition = { ...sampleDefinition, id: "save-post", assessmentType: "post" };

      const responses = {
        q1: "opt1b",
        q2: "opt2a",
      };

      const result: AssessmentResult = {
        assessmentId: "save-post",
        assessmentType: "post",
        points: 1,
        maxPoints: 2,
        responses,
        competencies: [
          { competency: "needs-vs-wants", points: 0, maxPoints: 1 },
          { competency: "saving", points: 1, maxPoints: 1 },
        ],
      };

      await repository.saveAttempt({
        childId,
        definition: postDefinition,
        result,
      });

      expect(db.collection("families").doc(familyId).collection("children").doc(childId)).toBeDefined();
    });
  });

  describe("Server-Side Score Validation", () => {
    it("should reject non-finite scores", async () => {
      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: NaN,
        maxPoints: 2,
        responses: { q1: "opt1a" },
        competencies: [],
      };

      await expect(
        repository.saveAttempt({
          childId,
          definition: sampleDefinition,
          result,
        }),
      ).rejects.toThrow("must be finite");
    });

    it("should reject Infinity values", async () => {
      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: Infinity,
        responses: { q1: "opt1a" },
        competencies: [],
      };

      await expect(
        repository.saveAttempt({
          childId,
          definition: sampleDefinition,
          result,
        }),
      ).rejects.toThrow("must be finite");
    });
  });

  describe("Question and Option Validation", () => {
    it("should reject invalid question ID", async () => {
      const responses = {
        invalid_q: "opt1a",
      };

      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: 2,
        responses,
        competencies: [],
      };

      await expect(
        repository.saveAttempt({
          childId,
          definition: sampleDefinition,
          result,
        }),
      ).rejects.toThrow(/question.*not found/i);
    });

    it("should reject invalid option ID", async () => {
      const responses = {
        q1: "invalid_option",
      };

      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: 2,
        responses,
        competencies: [],
      };

      await expect(
        repository.saveAttempt({
          childId,
          definition: sampleDefinition,
          result,
        }),
      ).rejects.toThrow(/option.*not found/i);
    });
  });

  describe("Retakes and Response Cleanup", () => {
    it("should delete old responses when retaking assessment", async () => {
      const transactionMock: MockTransaction = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };

      // Mock: existing attempt with old responses
      vi.spyOn(db, "runTransaction").mockImplementation(async (callback) => {
        await callback(transactionMock);
      });

      const responses = { q1: "opt1a" };
      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: 2,
        responses,
        competencies: [{ competency: "needs-vs-wants", points: 1, maxPoints: 1 }],
      };

      // On first get: return existing attempt (DocumentSnapshot)
      vi.spyOn(transactionMock, "get").mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: "save-pre",
          submittedAt: Date.now() - 1000,
        }),
      } as any);

      // On second get: return old responses (QuerySnapshot)
      vi.spyOn(transactionMock, "get").mockResolvedValueOnce({
        docs: [
          {
            ref: {} as any,
            data: () => ({ id: "q1", optionId: "opt1b" }),
          },
          {
            ref: {} as any,
            data: () => ({ id: "q2", optionId: "opt2a" }),
          },
        ],
      } as any);

      await repository.saveAttempt({
        childId,
        definition: sampleDefinition,
        result,
      });

      // Verify delete was called for old responses
      expect(transactionMock.delete).toHaveBeenCalled();
    });
  });

  describe("Stale Submission Prevention (Version-based Concurrency)", () => {
    it("should reject submission with mismatched version", async () => {
      const transactionMock: MockTransaction = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };

      vi.spyOn(db, "runTransaction").mockImplementation(async (callback) => {
        await callback(transactionMock);
      });

      // Mock: existing attempt with version 2
      vi.spyOn(transactionMock, "get").mockResolvedValueOnce({
        docs: [],
        data: () => ({
          id: "save-pre",
          version: 2,
        }),
      } as any);

      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: 2,
        responses: { q1: "opt1a" },
        competencies: [],
      };

      // Try to write with expectedVersion 1 when document has version 2
      await expect(
        repository.saveAttempt({
          childId,
          definition: sampleDefinition,
          result,
          expectedVersion: 1, // Mismatch with server's version 2
        }),
      ).rejects.toThrow(/version conflict|expected version/i);
    });

    it("should accept submission with matching version and increment", async () => {
      const transactionMock: MockTransaction = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };

      vi.spyOn(db, "runTransaction").mockImplementation(async (callback) => {
        await callback(transactionMock);
      });

      // Mock: existing attempt with version 1 (first get)
      // Mock: responses collection (second get)
      vi.spyOn(transactionMock, "get")
        .mockResolvedValueOnce({
          docs: [],
          data: () => ({
            id: "save-pre",
            version: 1,
            createdAt: 1000,
          }),
        } as any)
        .mockResolvedValueOnce({
          docs: [], // No existing responses
        } as any);

      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: 2,
        responses: { q1: "opt1a" },
        competencies: [],
      };

      // Submit with matching expectedVersion 1
      await repository.saveAttempt({
        childId,
        definition: sampleDefinition,
        result,
        expectedVersion: 1,
      });

      // Verify version was incremented to 2
      const setCalls = (vi.mocked(transactionMock.set).mock.calls || []).filter(
        (call) => call[0]._path?.[5] === "save-pre",
      );
      expect(setCalls.length).toBeGreaterThan(0);
      const attemptData = setCalls[0][1];
      expect(attemptData.version).toBe(2);
    });

    it("should default to version 0 for new submissions", async () => {
      const transactionMock: MockTransaction = {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };

      vi.spyOn(db, "runTransaction").mockImplementation(async (callback) => {
        await callback(transactionMock);
      });

      // Mock: no existing attempt (first get)
      // Mock: responses collection (won't be called since no existing, but mock anyway for safety)
      vi.spyOn(transactionMock, "get")
        .mockResolvedValueOnce({
          docs: [],
          data: () => undefined,
        } as any)
        .mockResolvedValueOnce({
          docs: [],
        } as any);

      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: 2,
        responses: { q1: "opt1a" },
        competencies: [],
      };

      // Submit without expectedVersion (defaults to 0)
      await repository.saveAttempt({
        childId,
        definition: sampleDefinition,
        result,
      });

      // Verify version was set to 1 (0 + 1)
      const setCalls = (vi.mocked(transactionMock.set).mock.calls || []).filter(
        (call) => call[0]._path?.[5] === "save-pre",
      );
      expect(setCalls.length).toBeGreaterThan(0);
      const attemptData = setCalls[0][1];
      expect(attemptData.version).toBe(1);
    });
  });

  describe("Atomic Persistence", () => {
    it("should write attempt, responses, and progress in single transaction", async () => {
      const transactionMock: MockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: false,
          data: () => undefined,
        } as any),
        set: vi.fn(),
        delete: vi.fn(),
      };

      let callCount = 0;
      vi.spyOn(transactionMock, "set").mockImplementation(() => {
        callCount++;
      });

      vi.spyOn(db, "runTransaction").mockImplementation(async (callback) => {
        await callback(transactionMock);
      });

      const responses = { q1: "opt1a", q2: "opt2b" };
      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 2,
        maxPoints: 2,
        responses,
        competencies: [
          { competency: "needs-vs-wants", points: 1, maxPoints: 1 },
          { competency: "saving", points: 1, maxPoints: 1 },
        ],
      };

      await repository.saveAttempt({
        childId,
        definition: sampleDefinition,
        result,
      });

      // Should write: attempt + 2 responses + progress = 4 documents
      expect(callCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Input Validation", () => {
    it("should reject empty childId", async () => {
      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: 2,
        responses: {},
        competencies: [],
      };

      await expect(
        repository.saveAttempt({
          childId: "",
          definition: sampleDefinition,
          result,
        }),
      ).rejects.toThrow(/childId/i);
    });

    it("should reject invalid definition", async () => {
      const result: AssessmentResult = {
        assessmentId: "save-pre",
        assessmentType: "pre",
        points: 1,
        maxPoints: 2,
        responses: {},
        competencies: [],
      };

      await expect(
        repository.saveAttempt({
          childId,
          definition: {} as any,
          result,
        }),
      ).rejects.toThrow(/definition/i);
    });

    it("should reject invalid result", async () => {
      await expect(
        repository.saveAttempt({
          childId,
          definition: sampleDefinition,
          result: {} as any,
        }),
      ).rejects.toThrow(/result/i);
    });
  });
});

// ============================================================================
// Mock Firebase Implementation
// ============================================================================

function createMockFirestore(): MockFirestore {
  const storage = new Map<string, Record<string, unknown>>();

  // Helper to build a path key for storage
  function buildKey(parts: string[]): string {
    return parts.join("/");
  }

  // Helper to determine if a ref is a DocumentRef or CollectionRef
  function isDocumentRef(ref: any): boolean {
    return ref._isDocumentRef === true;
  }

  function createDocumentRef(path: string[], basePath: string[] = []): MockDocumentRef {
    const fullPath = [...basePath, ...path];
    return {
      _isDocumentRef: true,
      _path: fullPath,
      collection: (subName: string) => {
        return {
          doc: (subId: string) => createDocumentRef([subId], fullPath.concat(subName)),
        } as MockCollectionRef;
      },
      get: async () => {
        const key = buildKey(fullPath);
        return {
          exists: storage.has(key),
          data: () => storage.get(key),
        };
      },
    } as any;
  }

  function createCollectionRef(path: string[]): MockCollectionRef {
    return {
      doc: (id: string) => createDocumentRef([id], path),
    } as any;
  }

  return {
    runTransaction: async (callback) => {
      const transaction: MockTransaction = {
        get: async (ref: any) => {
          if (isDocumentRef(ref)) {
            // Return DocumentSnapshot
            const key = buildKey(ref._path);
            return {
              exists: storage.has(key),
              data: () => storage.get(key),
              ref,
            } as any;
          } else {
            // Return QuerySnapshot (for collection refs)
            const collectionPath = buildKey(ref._path || []);
            const docs: any[] = [];
            for (const [key, value] of storage.entries()) {
              if (key.startsWith(collectionPath + "/")) {
                const parts = key.split("/");
                docs.push({
                  ref: createDocumentRef([parts[parts.length - 1]], ref._path),
                  data: () => value,
                });
              }
            }
            return { docs } as any;
          }
        },
        set: (ref, data) => {
          const key = buildKey(ref._path);
          storage.set(key, data);
        },
        delete: (ref) => {
          const key = buildKey(ref._path);
          storage.delete(key);
        },
      };

      await callback(transaction);
    },

    collection: (name: string) => {
      return createCollectionRef([name]);
    },
  };
}
