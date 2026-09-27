/** Comprehensive Firestore security-rules tests for the TATI ChildSave data model. */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Firestore, Auth, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { deleteApp, FirebaseApp } from "firebase/app";
import { createEmulatorApp, connectEmulatorFirestore, connectEmulatorAuth, createTestFixtures } from "./emulator-setup";

const USERS = {
  "parent-a": {
    email: "parent-a@tati.test",
    password: "testpassword123",
    roles: [],
  },
  "parent-b": {
    email: "parent-b@tati.test",
    password: "testpassword123",
    roles: [],
  },
  "facilitator-a": {
    email: "facilitator-a@tati.test",
    password: "testpassword123",
    roles: ["facilitator"],
  },
  admin: {
    email: "admin@tati.test",
    password: "testpassword123",
    roles: ["admin"],
  },
} as const;
const familyA = "families/family-a";
const familyB = "families/family-b";
const childA = `${familyA}/children/child-a1`;
const childB = `${familyB}/children/child-b1`;
const journeyProgressA = `${childA}/journeyProgress/progress-1`;
const assessmentAttemptA = `${childA}/assessmentAttempts/attempt-1`;

type Result<T = unknown> = { success: boolean; data?: T; error?: string };
const denied = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const isDenied =
    /PERMISSION_DENIED|permission|evaluation error|Null value|false for|false\s|@ L\d/.test(
      message,
    );
  return { success: false, error: isDenied ? "PERMISSION_DENIED" : message };
};

async function tryRead<T = unknown>(db: Firestore, path: string): Promise<Result<T>> {
  try {
    const snapshot = await getDoc(doc(db, path));
    return { success: true, data: snapshot.data() as T };
  } catch (error) {
    return denied(error);
  }
}
async function tryWrite<T>(
  db: Firestore,
  path: string,
  data: T,
  merge = false,
): Promise<Result<void>> {
  try {
    await setDoc(doc(db, path), data, { merge });
    return { success: true };
  } catch (error) {
    return denied(error);
  }
}
async function tryUpdate<T>(db: Firestore, path: string, data: Partial<T>): Promise<Result<void>> {
  try {
    await updateDoc(doc(db, path), data as Parameters<typeof updateDoc>[1]);
    return { success: true };
  } catch (error) {
    return denied(error);
  }
}

const expectDenied = (result: Result) => {
  expect(result.success).toBe(false);
  expect(result.error).toBe("PERMISSION_DENIED");
};
const expectAllowed = (result: Result) => expect(result.success).toBe(true);

describe("Firestore security rules", () => {
  let app: FirebaseApp;
  let db: Firestore;
  let auth: Auth;
  let currentUserUid: string | null = null; // Track authenticated user's UID

  beforeAll(async () => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    
    app = createEmulatorApp("demo-tati");
    db = connectEmulatorFirestore(app);
    auth = connectEmulatorAuth(app);

    // Create test users in Firebase Auth emulator
    // Since emulator might have residual data, we'll just log creation attempts
    // but focus on login and using auth.currentUser.uid
    console.log("[TEST] Setting up Firebase Auth users...");
    const loginPromises = Object.entries(USERS).map(async ([key, user]) => {
      try {
        // Try to create user first
        try {
          const credential = await createUserWithEmailAndPassword(auth, user.email, user.password);
          console.log(`[TEST] Created new Auth user ${key} with UID: ${credential.user.uid}`);
        } catch (createError) {
          const createMsg = createError instanceof Error ? createError.message : "";
          if (createMsg.includes("already-in-use")) {
            // User already exists in emulator, that's fine
            console.log(`[TEST] User ${key} already exists in emulator (using existing)`);
          } else {
            throw createError;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[TEST] ERROR during user setup for ${key}:`, message);
      }
    });
    
    await Promise.all(loginPromises);

    // Create Firestore test fixtures
    // Get UIDs by logging in first
    console.log("[TEST] Getting Firebase UIDs by logging in...");
    const userUidMap: Record<string, string> = {};
    for (const [key, user] of Object.entries(USERS)) {
      try {
        const credential = await signInWithEmailAndPassword(auth, user.email, user.password);
        userUidMap[key] = credential.user.uid;
        console.log(`[TEST] Logged in ${key}, UID: ${credential.user.uid}`);
      } catch (error) {
        console.error(`[TEST] ERROR logging in ${key}:`, error instanceof Error ? error.message : error);
        throw error;
      }
    }
    
    console.log("[TEST] UID map keys:", Object.keys(userUidMap));

    // Create Firestore test fixtures with actual Firebase UIDs
    await createTestFixtures("demo-tati", USERS, userUidMap);
  });
  afterAll(async () => {
    await signOut(auth).catch(() => undefined);
    await deleteApp(app).catch(() => undefined);
  });
  beforeEach(async () => {
    await signOut(auth).catch(() => undefined);
    currentUserUid = null;
  });
  const login = async (user: typeof USERS[keyof typeof USERS]) => {
    const credential = await signInWithEmailAndPassword(auth, user.email, user.password);
    currentUserUid = credential.user.uid; // Capture current user's actual UID
    return credential;
  };

  describe("Authenticated adult access (10)", () => {
    it("parent reads own family", async () => {
      await login(USERS["parent-a"]);
      expectAllowed(await tryRead(db, familyA));
    });
    it("parent reads own child", async () => {
      await login(USERS["parent-a"]);
      expectAllowed(await tryRead(db, childA));
    });
    it("parent reads own child progress", async () => {
      await login(USERS["parent-a"]);
      expectAllowed(await tryRead(db, journeyProgressA));
    });
    it("parent reads own family members", async () => {
      await login(USERS["parent-a"]);
      // Read the parent's own member document (uses their actual UID)
      expectAllowed(await tryRead(db, `${familyA}/members/${currentUserUid}`));
    });
    it("parent can read user profile", async () => {
      await login(USERS["parent-a"]);
      // Read the parent's own user profile (uses their actual UID)
      expectAllowed(await tryRead(db, `users/${currentUserUid}`));
    });
    it("parent cannot modify role", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryUpdate(db, "users/parent-a", { roles: ["admin"] }));
    });
    it("parent cannot change status", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryUpdate(db, "users/parent-a", { status: "suspended" }));
    });
    it("parent cannot self-promote to admin", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryUpdate(db, "users/parent-a", { roles: ["admin"] }));
    });
    it("authenticat adult can read journey content", async () => {
      await login(USERS["parent-a"]);
      expectAllowed(await tryRead(db, journeyProgressA));
    });
    it("admin can read any child", async () => {
      await login(USERS["admin"]);
      expectAllowed(await tryRead(db, childB));
    });
  });

  describe("Family isolation (6)", () => {
    it("parent A cannot read family B", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryRead(db, familyB));
    });
    it("parent A cannot read family B child", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryRead(db, childB));
    });
    it("parent B cannot read family A", async () => {
      await login(USERS["parent-b"]);
      expectDenied(await tryRead(db, familyA));
    });
    it("parent B cannot read family A child", async () => {
      await login(USERS["parent-b"]);
      expectDenied(await tryRead(db, childA));
    });
    it("parent A cannot update family B", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryUpdate(db, familyB, { name: "stolen" }));
    });
    it("parent B cannot create in family A", async () => {
      await login(USERS["parent-b"]);
      expectDenied(await tryWrite(db, `${familyA}/children/forged`, { familyId: "family-a" }));
    });
  });

  describe("Child data protection (4)", () => {
    it("cannot overwrite child identity", async () => {
      await login(USERS["parent-a"]);
      expectDenied(
        await tryWrite(
          db,
          childA,
          { familyId: "family-a", id: "child-a1", createdBy: "parent-b", userId: "attacker" },
          true,
        ),
      );
    });
    it("cannot write authoritative score", async () => {
      await login(USERS["parent-a"]);
      expectDenied(
        await tryWrite(db, `${childA}/assessmentAttempts/fake`, { score: 100, maxScore: 100 }),
      );
    });
    it("cannot write competency level", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryWrite(db, `${childA}/competencies/fake`, { level: 5 }));
    });
    it("cannot award an achievement", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryWrite(db, `${childA}/achievements/fake`, { unlocked: true }));
    });
  });

  describe("Server-only collections (10)", () => {
    const cases = [
      ["assessmentAttempts/attempt-server", { score: 1 }],
      ["competencies/competency-server", { level: 1 }],
      ["achievements/achievement-server", { unlockedAt: "now" }],
      ["scenarioSessions/session-server", { started: true }],
      ["scenarioSessions/session-server/decisions/decision-server", { choice: "A" }],
      ["riskScores/score-server", { score: 1 }],
      ["recommendations/recommendation-server", { text: "x" }],
      ["auditLog/event-server", { event: "x" }],
      ["analytics/event-server", { event: "x" }],
      ["serverResults/result-server", { value: 1 }],
    ] as const;
    it.each(cases)("rejects client write to %s", async (suffix, data) => {
      await login(USERS["parent-a"]);
      expectDenied(await tryWrite(db, `${childA}/${suffix}`, data));
    });
  });

  describe("Legitimate client writes (1)", () => {
    it("allows a parent to create journey progress", async () => {
      await login(USERS["parent-a"]);
      expectAllowed(
        await tryWrite(db, `${childA}/journeyProgress/test-write`, {
          familyId: "family-a",
          childId: "child-a1",
          score: null,
          maxScore: null,
        }),
      );
    });
  });

  describe("Role escalation prevention (6)", () => {
    it("cannot change family role", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryUpdate(db, `${familyA}/members/parent-a`, { role: "admin" }));
    });
    it("cannot add itself as admin", async () => {
      await login(USERS["parent-a"]);
      expectDenied(
        await tryWrite(db, `${familyA}/members/attacker`, { role: "admin", uid: "parent-a" }),
      );
    });
    it("cannot change family owner", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryUpdate(db, familyA, { familyId: "family-b" }));
    });
    it("cannot change child family", async () => {
      await login(USERS["parent-a"]);
      expectDenied(
        await tryUpdate(db, childA, {
          familyId: "family-b",
          id: "child-a1",
          createdBy: "parent-a",
        }),
      );
    });
    it("cannot grant facilitator access", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryWrite(db, `${familyA}/members/facilitator-x`, { role: "facilitator" }));
    });
    it("cannot forge an auth role field", async () => {
      await login(USERS["parent-a"]);
      expectDenied(await tryUpdate(db, `${familyA}/members/parent-a`, { isAdmin: true }));
    });
  });

  describe("Anonymous access denial (5)", () => {
    it("denies family reads", async () => {
      expectDenied(await tryRead(db, familyA));
    });
    it("denies child reads", async () => {
      expectDenied(await tryRead(db, childA));
    });
    it("denies family writes", async () => {
      expectDenied(await tryWrite(db, `${familyA}/members/anon`, { value: 1 }));
    });
    it("denies child writes", async () => {
      expectDenied(await tryWrite(db, `${childA}/journeyProgress/anon`, { value: 1 }));
    });
    it("denies updates", async () => {
      expectDenied(await tryUpdate(db, familyA, { displayName: "anonymous" }));
    });
  });

  describe("Admin capabilities (3)", () => {
    it("admin can read any family", async () => {
      await login(USERS["admin"]);
      expectAllowed(await tryRead(db, familyA));
      expectAllowed(await tryRead(db, familyB));
    });
    it("admin can read protected child data", async () => {
      await login(USERS["admin"]);
      expectAllowed(await tryRead(db, assessmentAttemptA));
    });
    it("admin can read users", async () => {
      await login(USERS["admin"]);
      expectAllowed(await tryRead(db, "users/parent-a"));
    });
  });
});
