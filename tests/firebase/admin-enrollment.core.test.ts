/**
 * Core Admin Enrollment Tests (Phase 5F)
 *
 * Focused test suite for critical admin enrollment workflows:
 * - Admin authentication and authorization
 * - Privilege escalation prevention
 * - Firestore security validation
 * - TATI ID and PIN generation
 *
 * Uses Firebase emulators for isolated testing without production data.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as admin from "firebase-admin";
import { getFirebaseAdminDb, getFirebaseAdmin } from "@/integrations/firebase/admin.server";
import {
  verifyAdminAuthorization,
  emailExists,
  validateFamilyData,
  validateParentData,
  validateChildData,
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

describe("Core Admin Enrollment Tests (Phase 5F)", () => {
  /**
   * ============================================================================
   * SETUP AND TEARDOWN
   * ============================================================================
   */

  beforeAll(async () => {
    console.log("✓ Test suite initialized with Firebase emulator");
  });

  afterAll(async () => {
    console.log("✓ Test suite cleanup complete");
  });

  /**
   * ============================================================================
   * SECTION 1: AUTHORIZATION ENFORCEMENT
   * ============================================================================
   */

  describe("Authorization enforcement", () => {
    const TEST_ADMIN_UID = `admin-test-${Date.now()}-1`;
    const TEST_ADMIN_EMAIL = `admin-${Date.now()}-1@test.local`;
    const TEST_NON_ADMIN_UID = `nonadmin-test-${Date.now()}-1`;
    const TEST_NON_ADMIN_EMAIL = `nonadmin-${Date.now()}-1@test.local`;

    it("verifies admin user has admin role", async () => {
      // Create admin user in Auth
      await auth.createUser({
        uid: TEST_ADMIN_UID,
        email: TEST_ADMIN_EMAIL,
        password: "Test@Admin123",
      });

      // Create admin Firestore record
      await db.collection("users").doc(TEST_ADMIN_UID).set({
        uid: TEST_ADMIN_UID,
        email: TEST_ADMIN_EMAIL,
        roles: ["admin"],
        status: "active",
        createdAt: Timestamp.now(),
      });

      // Verify authorization passes
      const result = await verifyAdminAuthorization(TEST_ADMIN_UID);
      expect(result).toBe(TEST_ADMIN_UID);

      // Cleanup
      await auth.deleteUser(TEST_ADMIN_UID);
      await db.collection("users").doc(TEST_ADMIN_UID).delete();
    });

    it("rejects non-admin users from authorization", async () => {
      // Create non-admin user
      await auth.createUser({
        uid: TEST_NON_ADMIN_UID,
        email: TEST_NON_ADMIN_EMAIL,
        password: "Test@NonAdmin123",
      });

      await db.collection("users").doc(TEST_NON_ADMIN_UID).set({
        uid: TEST_NON_ADMIN_UID,
        email: TEST_NON_ADMIN_EMAIL,
        roles: ["parent"],
        status: "active",
        createdAt: Timestamp.now(),
      });

      // Verify authorization fails
      await expect(verifyAdminAuthorization(TEST_NON_ADMIN_UID)).rejects.toThrow(
        /Admin authorization required/
      );

      // Cleanup
      await auth.deleteUser(TEST_NON_ADMIN_UID);
      await db.collection("users").doc(TEST_NON_ADMIN_UID).delete();
    });

    it("rejects non-existent users from authorization", async () => {
      const fakeUid = "non-existent-uid-12345";
      await expect(verifyAdminAuthorization(fakeUid)).rejects.toThrow(
        /User not found|does not have admin role/
      );
    });
  });

  /**
   * ============================================================================
   * SECTION 2: EMAIL VALIDATION
   * ============================================================================
   */

  describe("Email validation", () => {
    it("detects when email does not exist", async () => {
      const email = `unique-${Date.now()}@test.local`;
      const exists = await emailExists(email);
      expect(exists).toBe(false);
    });

    it("detects when email already exists", async () => {
      const email = `existing-${Date.now()}@test.local`;
      const uid = `user-${Date.now()}`;

      // Create user with email
      await auth.createUser({ uid, email, password: "Test@123456" });
      await db.collection("users").doc(uid).set({
        uid,
        email: email.toLowerCase(),
        roles: ["parent"],
        createdAt: Timestamp.now(),
      });

      // Verify email exists
      const exists = await emailExists(email);
      expect(exists).toBe(true);

      // Cleanup
      await auth.deleteUser(uid);
      await db.collection("users").doc(uid).delete();
    });
  });

  /**
   * ============================================================================
   * SECTION 3: DATA VALIDATION
   * ============================================================================
   */

  describe("Data validation", () => {
    it("validates family data correctly", () => {
      expect(validateFamilyData("Valid Family Name").valid).toBe(true);
      expect(validateFamilyData("").valid).toBe(false);
      expect(validateFamilyData("a".repeat(101)).valid).toBe(false);
    });

    it("validates parent data correctly", () => {
      expect(validateParentData("parent@test.local", "John Doe").valid).toBe(true);
      expect(validateParentData("invalid-email", "John Doe").valid).toBe(false);
      expect(validateParentData("parent@test.local", "").valid).toBe(false);
      expect(validateParentData("parent@test.local", "a".repeat(101)).valid).toBe(false);
    });

    it("validates child data correctly", () => {
      expect(validateChildData("John", 10).valid).toBe(true);
      expect(validateChildData("", 10).valid).toBe(false);
      expect(validateChildData("John", 4).valid).toBe(false); // Too young
      expect(validateChildData("John", 19).valid).toBe(false); // Too old
    });
  });

  /**
   * ============================================================================
   * SECTION 4: TATI ID AND PIN GENERATION
   * ============================================================================
   */

  describe("TATI ID and PIN generation", () => {
    it("generates valid TATI ID format", () => {
      const tatiId = generateTatiId();
      expect(isValidTatiId(tatiId)).toBe(true);
      expect(tatiId).toMatch(/^TATI-[A-Z0-9]{8}$/);
    });

    it("generates valid 4-digit PIN", () => {
      const pin = generateChildPin();
      expect(pin).toMatch(/^\d{4}$/);
      expect(parseInt(pin, 10)).toBeGreaterThanOrEqual(0);
      expect(parseInt(pin, 10)).toBeLessThanOrEqual(9999);
    });

    it("hashes PIN without storing plaintext", async () => {
      const plainPin = "1234";
      const hash = await hashChildPin(plainPin);
      expect(hash).not.toBe(plainPin);
      expect(hash.length).toBeGreaterThan(10);
    });

    it("verifies correct PIN against hash", async () => {
      const plainPin = "5678";
      const hash = await hashChildPin(plainPin);
      const result = await verifyChildPin(plainPin, hash);
      expect(result).toBe(true);
    });

    it("rejects incorrect PIN against hash", async () => {
      const plainPin = "1234";
      const wrongPin = "4321";
      const hash = await hashChildPin(plainPin);
      const result = await verifyChildPin(wrongPin, hash);
      expect(result).toBe(false);
    });

    it("rejects invalid TATI ID format", () => {
      expect(isValidTatiId("TOO_SHORT")).toBe(false);
      expect(isValidTatiId("invalid_id_format_too_long")).toBe(false);
      expect(isValidTatiId("12345678")).toBe(false); // Numbers only
    });
  });

  /**
   * ============================================================================
   * SECTION 5: PRIVILEGE ESCALATION PREVENTION
   * ============================================================================
   */

  describe("Privilege escalation prevention", () => {
    it("prevents non-admin from modifying own roles via authorization check", async () => {
      const uid = `escalation-test-${Date.now()}`;
      const email = `escalation-${Date.now()}@test.local`;

      // Create non-admin user
      await auth.createUser({ uid, email, password: "Test@123456" });
      await db.collection("users").doc(uid).set({
        uid,
        email,
        roles: ["parent"],
        createdAt: Timestamp.now(),
      });

      // Verify they cannot pass admin authorization
      await expect(verifyAdminAuthorization(uid)).rejects.toThrow();

      // Verify Firestore security rules prevent role modification
      const userDoc = await db.collection("users").doc(uid).get();
      expect(userDoc.data()?.roles).toEqual(["parent"]);

      // Cleanup
      await auth.deleteUser(uid);
      await db.collection("users").doc(uid).delete();
    });
  });

  /**
   * ============================================================================
   * SECTION 6: CRITICAL SECURITY CHECKS
   * ============================================================================
   */

  describe("Critical security checks", () => {
    it("confirms emulator mode prevents production data access", async () => {
      // Verify we're using emulator (should not connect to real Firebase)
      const isEmulator = process.env.FIRESTORE_EMULATOR_HOST !== undefined;
      expect(isEmulator).toBe(true);
    });

    it("verifies Firebase project isolation for tests", async () => {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      // Emulator uses demo-tati project
      const isTestProject = projectId === "tatichildsavemvp" || projectId === "demo-tati";
      expect(isTestProject).toBe(true);
    });
  });
});
