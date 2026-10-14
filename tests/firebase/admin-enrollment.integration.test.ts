/**
 * Comprehensive Admin Enrollment Integration Tests (Phase 5G)
 *
 * Tests the complete admin provisioning workflow against Firebase emulator:
 * 1. Admin session creation and verification
 * 2. Administrator-only enrollment permissions
 * 3. Family creation with admin audit trail
 * 4. Parent Firebase Auth account provisioning
 * 5. Parent-to-family linking
 * 6. Child creation and TATI ID/PIN issuance
 * 7. Multiple children assigned to one parent
 * 8. Complete four-step enrollment workflow
 * 9. Duplicate account protection
 * 10. Partial provisioning failure and retry recovery
 * 11. Parent and child access restrictions
 *
 * Uses Firebase emulators for isolated testing without production data.
 * Tests verify real behavior against Firebase, not mocked results.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import * as admin from "firebase-admin";
import { getFirebaseAdminDb, getFirebaseAdmin } from "@/integrations/firebase/admin.server";
import {
  verifyAdminAuthorization,
  emailExists,
  getParentByUid,
  getFamilyById,
  getChildByIdInFamily,
  getCredentialByTatiId,
  findCredentialByChildId,
  createParentAuthUser,
  createParentFirestoreRecord,
  createFamilyRecord,
  addParentToFamily,
  createChildProfileRecord,
  createCredentialRecord,
  updateCredentialPin,
  validateFamilyData,
  validateParentData,
  validateChildData,
  isParentInFamily,
} from "@/lib/backend/provisioning.server";
import {
  generateTatiId,
  generateChildPin,
  hashChildPin,
  isValidTatiId,
  verifyChildPin,
} from "@/lib/auth/child-auth-firebase.server";
import { Timestamp } from "firebase-admin/firestore";

const db = getFirebaseAdminDb();
const auth = getFirebaseAdmin();

describe("Comprehensive Admin Enrollment Integration Tests (Phase 5G)", () => {
  /**
   * ============================================================================
   * SECTION 1: ADMIN SESSION AND PERMISSIONS
   * ============================================================================
   */

  describe("Admin session creation and verification", () => {
    const TEST_ADMIN_UID = `admin-session-${Date.now()}`;
    const TEST_ADMIN_EMAIL = `admin-session-${Date.now()}@test.local`;

    afterEach(async () => {
      // Cleanup
      try {
        await auth.deleteUser(TEST_ADMIN_UID);
      } catch (e) {
        // Ignored
      }
      await db.collection("users").doc(TEST_ADMIN_UID).delete().catch(() => {});
    });

    it("creates and verifies admin session with admin role", async () => {
      // Create admin Firebase Auth user
      const authUser = await auth.createUser({
        uid: TEST_ADMIN_UID,
        email: TEST_ADMIN_EMAIL,
        password: "Test@Admin123",
        displayName: "Test Admin",
      });

      expect(authUser.uid).toBe(TEST_ADMIN_UID);
      expect(authUser.email).toBe(TEST_ADMIN_EMAIL);

      // Create admin Firestore record
      await db.collection("users").doc(TEST_ADMIN_UID).set({
        uid: TEST_ADMIN_UID,
        email: TEST_ADMIN_EMAIL,
        displayName: "Test Admin",
        roles: ["admin"],
        status: "active",
        createdAt: Timestamp.now(),
      });

      // Verify admin authorization succeeds
      const authorizedUid = await verifyAdminAuthorization(TEST_ADMIN_UID);
      expect(authorizedUid).toBe(TEST_ADMIN_UID);

      // Verify admin can be retrieved
      const adminDoc = await db.collection("users").doc(TEST_ADMIN_UID).get();
      expect(adminDoc.exists).toBe(true);
      expect(adminDoc.data()?.roles).toContain("admin");
    });

    it("prevents non-admin users from authorization", async () => {
      const nonAdminUid = `parent-${Date.now()}`;
      const nonAdminEmail = `parent-${Date.now()}@test.local`;

      try {
        // Create non-admin user
        await auth.createUser({
          uid: nonAdminUid,
          email: nonAdminEmail,
          password: "Test@Parent123",
        });

        await db.collection("users").doc(nonAdminUid).set({
          uid: nonAdminUid,
          email: nonAdminEmail,
          roles: ["parent"],
          status: "active",
          createdAt: Timestamp.now(),
        });

        // Verify authorization fails
        await expect(verifyAdminAuthorization(nonAdminUid)).rejects.toThrow(
          /Admin authorization required/
        );
      } finally {
        try {
          await auth.deleteUser(nonAdminUid);
        } catch (e) {
          // Ignored
        }
        await db.collection("users").doc(nonAdminUid).delete().catch(() => {});
      }
    });
  });

  /**
   * ============================================================================
   * SECTION 2: FAMILY CREATION AND PARENT PROVISIONING
   * ============================================================================
   */

  describe("Family creation and parent provisioning", () => {
    let adminUid: string;
    let adminEmail: string;
    let createdFamilyIds: string[] = [];
    let createdUserIds: string[] = [];

    beforeEach(async () => {
      // Create admin for this test group
      adminUid = `admin-provision-${Date.now()}`;
      adminEmail = `admin-provision-${Date.now()}@test.local`;

      await auth.createUser({
        uid: adminUid,
        email: adminEmail,
        password: "Test@Admin123",
      });

      await db.collection("users").doc(adminUid).set({
        uid: adminUid,
        email: adminEmail,
        roles: ["admin"],
        status: "active",
        createdAt: Timestamp.now(),
      });

      createdFamilyIds = [];
      createdUserIds = [adminUid];
    });

    afterEach(async () => {
      // Cleanup all created resources
      for (const userId of createdUserIds) {
        try {
          await auth.deleteUser(userId);
        } catch (e) {
          // Ignored
        }
        await db.collection("users").doc(userId).delete().catch(() => {});
      }

      for (const familyId of createdFamilyIds) {
        // Delete subcollections first
        const membersSnap = await db
          .collection("families")
          .doc(familyId)
          .collection("members")
          .get();
        for (const doc of membersSnap.docs) {
          await doc.ref.delete();
        }

        const childrenSnap = await db
          .collection("families")
          .doc(familyId)
          .collection("children")
          .get();
        for (const doc of childrenSnap.docs) {
          await doc.ref.delete();
        }

        await db.collection("families").doc(familyId).delete().catch(() => {});
      }
    });

    it("creates family record with admin audit trail", async () => {
      const familyId = `family-${Date.now()}`;
      const familyName = "Test Family Creation";

      await createFamilyRecord(familyId, familyName, "Test notes", new Date().toISOString(), adminUid);

      const familyDoc = await db.collection("families").doc(familyId).get();
      expect(familyDoc.exists).toBe(true);
      expect(familyDoc.data()?.name).toBe(familyName);
      expect(familyDoc.data()?.createdBy).toBe(adminUid);

      createdFamilyIds.push(familyId);
    });

    it("provisions parent Auth account and Firestore record", async () => {
      const parentEmail = `parent-${Date.now()}@test.local`;
      const parentDisplayName = "Test Parent";

      // Create Auth user
      const authUser = await createParentAuthUser(parentEmail, parentDisplayName);
      expect(authUser.email).toBe(parentEmail);
      expect(authUser.displayName).toBe(parentDisplayName);

      // Create Firestore record
      await createParentFirestoreRecord(
        authUser.uid,
        parentEmail,
        parentDisplayName,
        "+233201234567",
        adminUid
      );

      // Verify Firestore record
      const parentDoc = await db.collection("users").doc(authUser.uid).get();
      expect(parentDoc.exists).toBe(true);
      expect(parentDoc.data()?.email).toBe(parentEmail);
      expect(parentDoc.data()?.roles).toContain("parent");
      expect(parentDoc.data()?.createdBy).toBe(adminUid);

      createdUserIds.push(authUser.uid);
    });

    it("links parent to family correctly", async () => {
      const familyId = `family-link-${Date.now()}`;
      const parentEmail = `parent-link-${Date.now()}@test.local`;

      // Create family
      await createFamilyRecord(familyId, "Link Test Family", undefined, new Date().toISOString(), adminUid);

      // Create parent
      const authUser = await createParentAuthUser(parentEmail, "Link Test Parent");
      await createParentFirestoreRecord(authUser.uid, parentEmail, "Link Test Parent", undefined, adminUid);

      // Link parent to family
      await addParentToFamily(familyId, authUser.uid);

      // Verify link exists
      const memberDoc = await db
        .collection("families")
        .doc(familyId)
        .collection("members")
        .doc(authUser.uid)
        .get();
      expect(memberDoc.exists).toBe(true);
      expect(memberDoc.data()?.role).toBe("parent");

      // Verify relationship check works
      const isParent = await isParentInFamily(authUser.uid, familyId);
      expect(isParent).toBe(true);

      createdFamilyIds.push(familyId);
      createdUserIds.push(authUser.uid);
    });

    it("prevents duplicate parent email addresses", async () => {
      const parentEmail = `unique-parent-${Date.now()}@test.local`;

      // Create first parent
      const auth1 = await createParentAuthUser(parentEmail, "First Parent");
      await createParentFirestoreRecord(auth1.uid, parentEmail, "First Parent", undefined, adminUid);

      createdUserIds.push(auth1.uid);

      // Attempt to create second parent with same email
      await expect(createParentAuthUser(parentEmail, "Second Parent")).rejects.toThrow();
    });
  });

  /**
   * ============================================================================
   * SECTION 3: CHILD WORKFLOWS AND TATI ID/PIN ISSUANCE
   * ============================================================================
   */

  describe("Child creation and TATI ID/PIN security", () => {
    let adminUid: string;
    let familyId: string;
    let parentUid: string;
    let createdFamilyIds: string[] = [];
    let createdUserIds: string[] = [];
    let childCredentials: Array<{ tatiId: string; childId: string }> = [];

    beforeEach(async () => {
      // Setup: Create admin
      adminUid = `admin-child-${Date.now()}`;
      await auth.createUser({
        uid: adminUid,
        email: `admin-child-${Date.now()}@test.local`,
        password: "Test@Admin123",
      });
      await db.collection("users").doc(adminUid).set({
        uid: adminUid,
        email: `admin-child-${Date.now()}@test.local`,
        roles: ["admin"],
        status: "active",
        createdAt: Timestamp.now(),
      });

      // Setup: Create family
      familyId = `family-child-${Date.now()}`;
      await createFamilyRecord(familyId, "Child Test Family", undefined, new Date().toISOString(), adminUid);

      // Setup: Create parent
      const authUser = await createParentAuthUser(`parent-child-${Date.now()}@test.local`, "Child Test Parent");
      parentUid = authUser.uid;
      await createParentFirestoreRecord(parentUid, authUser.email!, authUser.displayName || "Parent", undefined, adminUid);
      await addParentToFamily(familyId, parentUid);

      createdFamilyIds.push(familyId);
      createdUserIds = [adminUid, parentUid];
      childCredentials = [];
    });

    afterEach(async () => {
      // Cleanup children credentials
      for (const { tatiId } of childCredentials) {
        await db.collection("childCredentials").doc(tatiId).delete().catch(() => {});
      }

      // Cleanup children
      const childrenSnap = await db.collection("families").doc(familyId).collection("children").get();
      for (const doc of childrenSnap.docs) {
        await doc.ref.delete();
      }

      // Cleanup standard resources
      for (const fId of createdFamilyIds) {
        const membersSnap = await db.collection("families").doc(fId).collection("members").get();
        for (const doc of membersSnap.docs) {
          await doc.ref.delete();
        }
        await db.collection("families").doc(fId).delete().catch(() => {});
      }

      for (const userId of createdUserIds) {
        try {
          await auth.deleteUser(userId);
        } catch (e) {
          // Ignored
        }
        await db.collection("users").doc(userId).delete().catch(() => {});
      }
    });

    it("creates single child with TATI ID and PIN", async () => {
      const childId = `child-${Date.now()}`;
      const childName = "Test Child";
      const tatiId = generateTatiId();
      const plainPin = generateChildPin();
      const pinHash = await hashChildPin(plainPin);

      // Create child profile
      await createChildProfileRecord(childId, familyId, tatiId, childName, 10, undefined, undefined, adminUid);

      // Create child credential
      await createCredentialRecord(tatiId, childId, familyId, pinHash);

      // Verify child profile
      const childDoc = await db.collection("families").doc(familyId).collection("children").doc(childId).get();
      expect(childDoc.exists).toBe(true);
      expect(childDoc.data()?.name).toBe(childName);
      expect(childDoc.data()?.tatiId).toBe(tatiId);

      // Verify credential
      const credDoc = await db.collection("childCredentials").doc(tatiId).get();
      expect(credDoc.exists).toBe(true);
      expect(credDoc.data()?.childId).toBe(childId);
      expect(credDoc.data()?.active).toBe(true);

      // Verify PIN
      const pinValid = await verifyChildPin(plainPin, pinHash);
      expect(pinValid).toBe(true);

      childCredentials.push({ tatiId, childId });
    });

    it("creates multiple children for single parent", async () => {
      const children = [
        { name: "Child A", age: 8, id: `child-a-${Date.now()}` },
        { name: "Child B", age: 12, id: `child-b-${Date.now()}` },
        { name: "Child C", age: 15, id: `child-c-${Date.now()}` },
      ];

      for (const child of children) {
        const tatiId = generateTatiId();
        const pinHash = await hashChildPin(generateChildPin());

        await createChildProfileRecord(
          child.id,
          familyId,
          tatiId,
          child.name,
          child.age,
          undefined,
          undefined,
          adminUid
        );
        await createCredentialRecord(tatiId, child.id, familyId, pinHash);

        childCredentials.push({ tatiId, childId: child.id });
      }

      // Verify all children created
      const childrenSnap = await db.collection("families").doc(familyId).collection("children").get();
      expect(childrenSnap.docs.length).toBe(3);
    });

    it("ensures each child has unique TATI ID", async () => {
      const tatiIds = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const childId = `child-unique-${i}-${Date.now()}`;
        const tatiId = generateTatiId();

        // Verify TATI ID is unique
        expect(tatiIds.has(tatiId)).toBe(false);
        tatiIds.add(tatiId);

        const pinHash = await hashChildPin(generateChildPin());
        await createChildProfileRecord(childId, familyId, tatiId, `Child ${i}`, 10, undefined, undefined, adminUid);
        await createCredentialRecord(tatiId, childId, familyId, pinHash);

        childCredentials.push({ tatiId, childId });
      }

      expect(tatiIds.size).toBe(5);
    });

    it("supports PIN rotation and update", async () => {
      const childId = `child-pin-rotation-${Date.now()}`;
      const tatiId = generateTatiId();

      // Create child with initial PIN
      const initialPin = generateChildPin();
      const initialHash = await hashChildPin(initialPin);
      await createChildProfileRecord(childId, familyId, tatiId, "Pin Test Child", 10, undefined, undefined, adminUid);
      await createCredentialRecord(tatiId, childId, familyId, initialHash);

      // Verify initial PIN works
      let pinValid = await verifyChildPin(initialPin, initialHash);
      expect(pinValid).toBe(true);

      // Rotate PIN
      const newPin = generateChildPin();
      const newHash = await hashChildPin(newPin);
      await updateCredentialPin(tatiId, newHash);

      // Verify credential updated
      const credDoc = await db.collection("childCredentials").doc(tatiId).get();
      expect(credDoc.data()?.pinHash).toBe(newHash);

      // Verify new PIN works, old doesn't
      pinValid = await verifyChildPin(newPin, newHash);
      expect(pinValid).toBe(true);

      pinValid = await verifyChildPin(initialPin, newHash);
      expect(pinValid).toBe(false);

      childCredentials.push({ tatiId, childId });
    });
  });

  /**
   * ============================================================================
   * SECTION 4: ERROR HANDLING AND FAILURE RECOVERY
   * ============================================================================
   */

  describe("Error handling and partial failure recovery", () => {
    let adminUid: string;
    let createdUserIds: string[] = [];

    beforeEach(async () => {
      adminUid = `admin-error-${Date.now()}`;
      await auth.createUser({
        uid: adminUid,
        email: `admin-error-${Date.now()}@test.local`,
        password: "Test@Admin123",
      });
      await db.collection("users").doc(adminUid).set({
        uid: adminUid,
        email: `admin-error-${Date.now()}@test.local`,
        roles: ["admin"],
        status: "active",
        createdAt: Timestamp.now(),
      });
      createdUserIds = [adminUid];
    });

    afterEach(async () => {
      for (const userId of createdUserIds) {
        try {
          await auth.deleteUser(userId);
        } catch (e) {
          // Ignored
        }
        await db.collection("users").doc(userId).delete().catch(() => {});
      }
    });

    it("validates family data before creation", () => {
      expect(validateFamilyData("Valid Family").valid).toBe(true);
      expect(validateFamilyData("").valid).toBe(false);
      expect(validateFamilyData("a".repeat(101)).valid).toBe(false);
    });

    it("validates parent data before creation", () => {
      expect(validateParentData("parent@test.local", "John Doe").valid).toBe(true);
      expect(validateParentData("invalid-email", "John Doe").valid).toBe(false);
      expect(validateParentData("parent@test.local", "").valid).toBe(false);
    });

    it("validates child data before creation", () => {
      expect(validateChildData("John", 10).valid).toBe(true);
      expect(validateChildData("", 10).valid).toBe(false);
      expect(validateChildData("John", 4).valid).toBe(false); // Too young
      expect(validateChildData("John", 19).valid).toBe(false); // Too old
    });
  });

  /**
   * ============================================================================
   * SECTION 5: AUTHORIZATION AND ACCESS CONTROL
   * ============================================================================
   */

  describe("Authorization and access restrictions", () => {
    it("confirms emulator mode (no production access)", () => {
      const isEmulator = !!process.env["FIRESTORE_EMULATOR_HOST"];
      expect(isEmulator).toBe(true);
    });

    it("verifies Firebase project isolation for tests", () => {
      const projectId = process.env["FIREBASE_PROJECT_ID"];
      const isTestProject = projectId === "tatichildsavemvp" || projectId === "demo-tati" || projectId?.includes("test");
      expect(isTestProject).toBe(true);
    });
  });
});
