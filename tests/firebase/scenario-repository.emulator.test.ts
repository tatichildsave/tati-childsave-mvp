/**
 * FirebaseScenarioRepository - Emulator-backed Tests
 *
 * Tests using real Firestore emulator (not mocked):
 * 1. Initial scenario state creation (version 0 → 1)
 * 2. State loading after persistence
 * 3. Version increment after update (v1 → v2)
 * 4. Stale-version rejection (prevent overwrites)
 * 5. Concurrent update conflict (one wins, one fails)
 * 6. Persistence consistency after rejected writes
 *
 * Phase 7C4C Gate A: Repository implementation only.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Firestore } from "firebase/firestore";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createEmulatorApp, connectEmulatorFirestore } from "./emulator-setup";
import { FirebaseScenarioRepository } from "@/lib/backend/firebase/repositories";
import type { ScenarioState } from "@/lib/scenario/types";

let db: Firestore;
let adminDb: admin.firestore.Firestore;
let adminApp: admin.app.App;

const familyId = "test-family-scenario";
const childId = "test-child-scenario";
const scenarioId = "kwame-request";

// Minimal valid scenario state for testing
function createTestState(
  day: number = 1,
  phase: "intro" | "decision" | "consequence" | "complete" = "intro",
): ScenarioState {
  return {
    scenarioId,
    day,
    available: 10,
    saved: 0,
    goalTarget: 80,
    competencies: {},
    flags: {},
    scheduled: [],
    nodeId: `day-${day}-start`,
    phase,
    consequence: undefined,
    decisions: [],
    totals: {
      earned: 0,
      spent: 0,
      movedToSavings: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

describe("FirebaseScenarioRepository - Emulator Tests", () => {
  beforeAll(async () => {
    const emulatorApp = createEmulatorApp("test-scenario-project");
    db = connectEmulatorFirestore(emulatorApp);

    // Initialize admin SDK for emulator
    try {
      adminApp = admin.initializeApp(
        {
          projectId: "test-scenario-project",
        },
        `admin-scenario-test-${Date.now()}`,
      );
    } catch (e) {
      adminApp = admin.app(`admin-scenario-test-${Date.now()}`);
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
    try {
      await adminApp?.delete();
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clear scenario sessions before each test
    const sessionsRef = adminDb
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("scenarioSessions");
    const docs = await sessionsRef.get();
    for (const doc of docs.docs) {
      await doc.ref.delete();
    }
  });

  describe("Initial Scenario Creation", () => {
    it("1. creates new scenario state with version 0 → 1", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);
      const state = createTestState(1, "intro");

      const result = await repo.saveSession(childId, scenarioId, state as any, 0);

      expect(result.version).toBe(1);
      expect(result.status).toBe("in_progress");

      // Verify in Firestore
      const loaded = await repo.loadSession(childId, scenarioId);
      expect(loaded).not.toBeNull();
      expect(loaded?.version).toBe(1);
      expect(loaded?.status).toBe("in_progress");
      expect(loaded?.state?.day).toBe(1);
    });

    it("2. rejects creation with non-zero expected version", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);
      const state = createTestState(1, "intro");

      await expect(repo.saveSession(childId, scenarioId, state as any, 1)).rejects.toThrow(
        "Version conflict",
      );
    });

    it("3. rejects null/invalid state", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      await expect(repo.saveSession(childId, scenarioId, null as any, 0)).rejects.toThrow(
        "Invalid scenario state",
      );
    });
  });

  describe("State Loading", () => {
    it("4. loads persisted scenario state after initial save", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);
      const state = createTestState(2, "decision");

      // Save
      await repo.saveSession(childId, scenarioId, state as any, 0);

      // Load
      const loaded = await repo.loadSession(childId, scenarioId);

      expect(loaded).not.toBeNull();
      expect(loaded?.state?.day).toBe(2);
      expect(loaded?.state?.phase).toBe("decision");
      expect(loaded?.state?.nodeId).toBe("day-2-start");
    });

    it("5. returns null for non-existent session", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      const result = await repo.loadSession(childId, "non-existent-scenario");

      expect(result).toBeNull();
    });

    it("6. preserves full state details (money, competencies, decisions)", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);
      const state = createTestState(3, "decision");
      (state as any).available = 15;
      (state as any).saved = 25;
      (state as any).competencies = { financial_responsibility: 10 };
      (state as any).decisions = [{ day: 1, nodeId: "day-1", choiceId: "save-5" }];

      await repo.saveSession(childId, scenarioId, state as any, 0);

      const loaded = await repo.loadSession(childId, scenarioId);
      expect(loaded?.state?.available).toBe(15);
      expect(loaded?.state?.saved).toBe(25);
      expect(loaded?.state?.competencies).toEqual({ financial_responsibility: 10 });
      expect(loaded?.state?.decisions).toHaveLength(1);
    });
  });

  describe("Version Increment", () => {
    it("7. increments version on each save (v0 → v1 → v2)", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      // v0 → v1
      const state1 = createTestState(1, "intro");
      const result1 = await repo.saveSession(childId, scenarioId, state1 as any, 0);
      expect(result1.version).toBe(1);

      // v1 → v2
      const state2 = createTestState(2, "decision");
      const result2 = await repo.saveSession(childId, scenarioId, state2 as any, 1);
      expect(result2.version).toBe(2);

      // Verify final state
      const loaded = await repo.loadSession(childId, scenarioId);
      expect(loaded?.version).toBe(2);
    });
  });

  describe("Stale Version Rejection", () => {
    it("8. rejects update with mismatched expectedVersion", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      // Create v1
      const state1 = createTestState(1, "intro");
      await repo.saveSession(childId, scenarioId, state1 as any, 0);

      // Advance to v2
      const state2 = createTestState(2, "decision");
      await repo.saveSession(childId, scenarioId, state2 as any, 1);

      // Try to save with stale expectedVersion
      const state3 = createTestState(3, "decision");
      await expect(repo.saveSession(childId, scenarioId, state3 as any, 1)).rejects.toThrow(
        "Version conflict",
      );

      // Verify state did NOT change
      const loaded = await repo.loadSession(childId, scenarioId);
      expect(loaded?.version).toBe(2);
      expect(loaded?.state?.day).toBe(2);
    });

    it("9. rejects version 0 if session already exists", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      const state1 = createTestState(1, "intro");
      await repo.saveSession(childId, scenarioId, state1 as any, 0);

      // Try to save again with expectedVersion 0
      const state2 = createTestState(2, "decision");
      await expect(repo.saveSession(childId, scenarioId, state2 as any, 0)).rejects.toThrow(
        "Version conflict",
      );
    });
  });

  describe("Concurrent Update Conflict", () => {
    it("10. one concurrent save succeeds, other gets version conflict", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      // Create initial state (v0 → v1)
      const initial = createTestState(1, "intro");
      await repo.saveSession(childId, scenarioId, initial as any, 0);

      // Two concurrent saves from same version (v1)
      const state2a = createTestState(2, "decision");
      (state2a as any).available = 20;

      const state2b = createTestState(2, "decision");
      (state2b as any).available = 30;

      const results = await Promise.allSettled([
        repo.saveSession(childId, scenarioId, state2a as any, 1),
        repo.saveSession(childId, scenarioId, state2b as any, 1),
      ]);

      // One should succeed, one should fail
      const succeeded = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r) => r.status === "rejected");

      expect(succeeded).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0]).toBeDefined();
      if (failed[0]?.status === "rejected") {
        expect((failed[0].reason as Error).message).toContain("Version conflict");
      }

      // Verify final state is from first success
      const loaded = await repo.loadSession(childId, scenarioId);
      expect(loaded?.version).toBe(2);
      expect([20, 30]).toContain(loaded?.state?.available);
    });
  });

  describe("Completion Status", () => {
    it("11. sets status to 'completed' and completedAt when phase='complete'", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      // Progress to completion
      const state = createTestState(14, "complete");
      const result = await repo.saveSession(childId, scenarioId, state as any, 0);

      expect(result.status).toBe("completed");

      // Verify in Firestore
      const loaded = await repo.loadSession(childId, scenarioId);
      expect(loaded?.status).toBe("completed");
    });

    it("12. keeps status='in_progress' for non-complete phases", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      const state = createTestState(5, "decision");
      const result = await repo.saveSession(childId, scenarioId, state as any, 0);

      expect(result.status).toBe("in_progress");

      const loaded = await repo.loadSession(childId, scenarioId);
      expect(loaded?.status).toBe("in_progress");
    });
  });

  describe("Version Check Helper", () => {
    it("13. getSessionVersion returns exists=false, version=0 for new session", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      const result = await repo.getSessionVersion(childId, scenarioId);

      expect(result.exists).toBe(false);
      expect(result.version).toBe(0);
    });

    it("14. getSessionVersion returns exists=true, current version for persisted session", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      // Create session
      const state = createTestState(1, "intro");
      await repo.saveSession(childId, scenarioId, state as any, 0);

      const result = await repo.getSessionVersion(childId, scenarioId);

      expect(result.exists).toBe(true);
      expect(result.version).toBe(1);
    });
  });

  describe("Persistence Consistency", () => {
    it("15. rejected write does not corrupt persisted state", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      // Create v1
      const state1 = createTestState(1, "intro");
      (state1 as any).available = 10;
      await repo.saveSession(childId, scenarioId, state1 as any, 0);

      // Advance to v2
      const state2 = createTestState(2, "decision");
      (state2 as any).available = 20;
      await repo.saveSession(childId, scenarioId, state2 as any, 1);

      // Attempt stale write (should fail)
      const state3 = createTestState(3, "decision");
      (state3 as any).available = 99; // Should not persist
      await expect(repo.saveSession(childId, scenarioId, state3 as any, 1)).rejects.toThrow();

      // Verify state is still v2 with available=20
      const loaded = await repo.loadSession(childId, scenarioId);
      expect(loaded?.version).toBe(2);
      expect(loaded?.state?.available).toBe(20);
      expect(loaded?.state?.day).toBe(2);
    });

    it("16. server timestamps are set by Firestore, not client", async () => {
      const repo = new FirebaseScenarioRepository(adminDb, familyId);

      const state = createTestState(1, "intro");
      await repo.saveSession(childId, scenarioId, state as any, 0);

      // Query raw Firestore document
      const snap = await adminDb
        .collection("families")
        .doc(familyId)
        .collection("children")
        .doc(childId)
        .collection("scenarioSessions")
        .doc(scenarioId)
        .get();

      const data = snap.data();
      expect(data?.["createdAt"]).toBeDefined();
      expect(data?.["updatedAt"]).toBeDefined();
      // Verify timestamps are Firestore Timestamp objects (have toDate method)
      expect(typeof data?.["createdAt"]).toBe("object");
      expect(typeof data?.["updatedAt"]).toBe("object");
      expect("toDate" in (data?.["createdAt"] || {})).toBe(true);
      expect("toDate" in (data?.["updatedAt"] || {})).toBe(true);
    });
  });
});
