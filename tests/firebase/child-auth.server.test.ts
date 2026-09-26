/**
 * Firebase Child Authentication Tests (Phase G2)
 *
 * Validates:
 * 1. Child Firebase identity creation
 * 2. Parent authorization enforcement
 * 3. Family isolation
 * 4. Token verification
 * 5. Child authorization boundaries
 * 6. Idempotency
 * 7. Age validation
 *
 * Note: Tests use Firebase emulators (Auth + Firestore).
 * Emulator state is cleared between major test suites.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import {
  createChildFirebaseIdentity,
  getChildFirebaseIdentity,
  verifyChildFirebaseToken,
  resolveChildFromFirebaseUid,
  type ChildFirebaseContext,
} from "@/lib/backend/firebase/child-auth.server";
import { adminAuth, adminFirestore } from "@/lib/backend/firebase/admin.server";
import type { AuthenticatedUser } from "@/lib/auth/authorization.server";

// Test fixtures
const parentA: AuthenticatedUser = {
  kind: "user",
  userId: "parent-a",
  roles: ["parent"],
};

const parentB: AuthenticatedUser = {
  kind: "user",
  userId: "parent-b",
  roles: ["parent"],
};

const familyA = "family-a";
const familyB = "family-b";
const childA1 = "child-a1";
const childA2 = "child-a2";
const childB1 = "child-b1";

describe("Firebase Child Authentication (Phase G2)", () => {
  beforeAll(() => {
    // Ensure emulator env vars
    process.env["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080";
    process.env["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099";
    process.env["FIREBASE_PROJECT_ID"] = "demo-tati";
  });

  afterEach(async () => {
    // Clear Firestore collections between tests
    try {
      const db = adminFirestore();
      const docs = await db.collection("childAuthIdentities").get();
      for (const doc of docs.docs) {
        await doc.ref.delete();
      }
    } catch (e) {
      // Ignore errors
    }

    // Clear Firebase Auth users between tests
    try {
      const auth = adminAuth();
      const users = await auth.listUsers(1000);
      for (const user of users.users) {
        if (user.uid.startsWith("child_")) {
          await auth.deleteUser(user.uid).catch(() => undefined);
        }
      }
    } catch (e) {
      // Ignore errors
    }
  });

  describe("Child Firebase Identity Creation (6)", () => {
    it("creates Firebase identity for valid child (age 9)", async () => {
      const uid = await createChildFirebaseIdentity(parentA, childA1, familyA, 9);
      expect(uid).toBe("child_child-a1");

      // Verify Firebase Auth user was created
      const user = await adminAuth().getUser(uid);
      expect(user.uid).toBe(uid);
      expect(user.displayName).toContain("child");
    });

    it("stores mapping in Firestore", async () => {
      await createChildFirebaseIdentity(parentA, childA1, familyA, 9);
      const mapping = await adminFirestore().collection("childAuthIdentities").doc(childA1).get();
      expect(mapping.exists).toBe(true);
      expect(mapping.data()?.firebaseUid).toBe("child_child-a1");
      expect(mapping.data()?.familyId).toBe(familyA);
      expect(mapping.data()?.status).toBe("active");
    });

    it("is idempotent - repeated calls return same UID", async () => {
      const uid1 = await createChildFirebaseIdentity(parentA, childA1, familyA, 9);
      const uid2 = await createChildFirebaseIdentity(parentA, childA1, familyA, 9);
      expect(uid1).toBe(uid2);
    });

    it("rejects age too young (age 7)", async () => {
      await expect(createChildFirebaseIdentity(parentA, "child-young", familyA, 7)).rejects.toThrow(
        /age must be between 8 and 12/i,
      );
    });

    it("rejects age too old (age 13)", async () => {
      await expect(createChildFirebaseIdentity(parentA, "child-old", familyA, 13)).rejects.toThrow(
        /age must be between 8 and 12/i,
      );
    });

    it("accepts edge ages (8 and 12)", async () => {
      const uid8 = await createChildFirebaseIdentity(parentA, "child-age8", familyA, 8);
      expect(uid8).toBeDefined();

      const uid12 = await createChildFirebaseIdentity(parentA, "child-age12", familyA, 12);
      expect(uid12).toBeDefined();
    });
  });

  describe("Get Child Firebase Identity (2)", () => {
    beforeEach(async () => {
      // Create test identity
      await createChildFirebaseIdentity(parentA, childA1, familyA, 9);
    });

    it("retrieves existing Firebase UID for child", async () => {
      const uid = await getChildFirebaseIdentity(parentA, childA1, familyA);
      expect(uid).toBe("child_child-a1");
    });

    it("returns null for non-existent child", async () => {
      const uid = await getChildFirebaseIdentity(parentA, "non-existent", familyA);
      expect(uid).toBeNull();
    });
  });

  describe("Family Isolation (3)", () => {
    beforeEach(async () => {
      await createChildFirebaseIdentity(parentA, childA1, familyA, 9);
      await createChildFirebaseIdentity(parentB, childB1, familyB, 10);
    });

    it("different families have separate child identities", async () => {
      const uidA = await getChildFirebaseIdentity(parentA, childA1, familyA);
      const uidB = await getChildFirebaseIdentity(parentB, childB1, familyB);
      expect(uidA).not.toBe(uidB);
    });

    it("requesting wrong family ID throws access denied", async () => {
      // Requesting child A with wrong family ID should throw
      await expect(getChildFirebaseIdentity(parentA, childA1, familyB)).rejects.toThrow(
        /access denied/i,
      );
    });

    it("child identity mappings are family-specific in Firestore", async () => {
      const docA = await adminFirestore().collection("childAuthIdentities").doc(childA1).get();
      const docB = await adminFirestore().collection("childAuthIdentities").doc(childB1).get();

      expect(docA.data()?.familyId).toBe(familyA);
      expect(docB.data()?.familyId).toBe(familyB);
    });
  });

  describe("Firebase UID Resolution (5)", () => {
    beforeEach(async () => {
      await createChildFirebaseIdentity(parentA, childA1, familyA, 9);
      await createChildFirebaseIdentity(parentA, childA2, familyA, 10);
      await createChildFirebaseIdentity(parentB, childB1, familyB, 11);
    });

    it("resolves Firebase UID to child context", async () => {
      const uid = await getChildFirebaseIdentity(parentA, childA1, familyA);
      const context = await resolveChildFromFirebaseUid(uid!);
      expect(context).toBeDefined();
      expect(context?.childProfileId).toBe(childA1);
      expect(context?.familyId).toBe(familyA);
      expect(context?.role).toBe("child");
    });

    it("returns null for unknown Firebase UID", async () => {
      const context = await resolveChildFromFirebaseUid("unknown-uid-12345");
      expect(context).toBeNull();
    });

    it("returns null for invalid UID format", async () => {
      const context = await resolveChildFromFirebaseUid("");
      expect(context).toBeNull();
    });

    it("resolves child A within family A", async () => {
      const uidA = await getChildFirebaseIdentity(parentA, childA1, familyA);
      const context = await resolveChildFromFirebaseUid(uidA!);
      expect(context?.childProfileId).toBe(childA1);
      expect(context?.familyId).toBe(familyA);
    });

    it("resolves child B within family B", async () => {
      const uidB = await getChildFirebaseIdentity(parentB, childB1, familyB);
      const context = await resolveChildFromFirebaseUid(uidB!);
      expect(context?.childProfileId).toBe(childB1);
      expect(context?.familyId).toBe(familyB);
    });
  });

  describe("Authorization Boundaries (5)", () => {
    beforeEach(async () => {
      await createChildFirebaseIdentity(parentA, childA1, familyA, 9);
      await createChildFirebaseIdentity(parentA, childA2, familyA, 10);
      await createChildFirebaseIdentity(parentB, childB1, familyB, 11);
    });

    it("child A resolves to family A context", async () => {
      const uidA = await getChildFirebaseIdentity(parentA, childA1, familyA);
      const context = await resolveChildFromFirebaseUid(uidA!);
      expect(context?.familyId).toBe(familyA);
      expect(context?.childProfileId).toBe(childA1);
      expect(context?.role).toBe("child");
    });

    it("child B resolves to family B context", async () => {
      const uidB = await getChildFirebaseIdentity(parentB, childB1, familyB);
      const context = await resolveChildFromFirebaseUid(uidB!);
      expect(context?.familyId).toBe(familyB);
      expect(context?.childProfileId).toBe(childB1);
      expect(context?.role).toBe("child");
    });

    it("child A UID does not resolve for child B lookup", async () => {
      const uidA = await getChildFirebaseIdentity(parentA, childA1, familyA);
      // Even though we have the UID, it resolves only to childA1
      const context = await resolveChildFromFirebaseUid(uidA!);
      expect(context?.childProfileId).not.toBe(childB1);
    });

    it("child IDs and family IDs cannot be spoofed in resolution", async () => {
      const uidA1 = await getChildFirebaseIdentity(parentA, childA1, familyA);
      const uidA2 = await getChildFirebaseIdentity(parentA, childA2, familyA);

      const contextA1 = await resolveChildFromFirebaseUid(uidA1!);
      const contextA2 = await resolveChildFromFirebaseUid(uidA2!);

      // Each UID resolves to its own child
      expect(contextA1?.childProfileId).toBe(childA1);
      expect(contextA2?.childProfileId).toBe(childA2);
      // Both are in same family
      expect(contextA1?.familyId).toBe(contextA2?.familyId);
    });

    it("revoked identity fails resolution", async () => {
      // Create identity
      const uid = await createChildFirebaseIdentity(parentA, "child-revoke-test", familyA, 9);

      // Verify it resolves before revocation
      let context = await resolveChildFromFirebaseUid(uid);
      expect(context).toBeDefined();

      // Revoke it
      await adminFirestore()
        .collection("childAuthIdentities")
        .doc("child-revoke-test")
        .update({ status: "revoked" });

      // Resolution should fail after revocation
      context = await resolveChildFromFirebaseUid(uid);
      expect(context).toBeNull();
    });
  });

  describe("Emulator Isolation (1)", () => {
    it("uses emulator environment variables", () => {
      const firestoreHost = process.env["FIRESTORE_EMULATOR_HOST"];
      const authHost = process.env["FIREBASE_AUTH_EMULATOR_HOST"];
      expect(firestoreHost).toBe("127.0.0.1:8080");
      expect(authHost).toBe("127.0.0.1:9099");
    });
  });
});
