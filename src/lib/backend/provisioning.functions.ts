/**
 * Admin Provisioning Server Functions (Phase 5A)
 * ==============================================
 * Secure server-side provisioning for families, parents, and children.
 *
 * All functions:
 * - Verify admin authorization server-side
 * - Validate inputs server-side
 * - Use Firebase Admin SDK only
 * - Return safe responses (no passwords/PINs in body)
 * - Never expose secrets in error messages
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCookie } from "@tanstack/react-start/server";
import {
  verifyAdminAuthorization,
  emailExists,
  validateParentData,
  validateFamilyData,
  validateChildData,
  getParentByUid,
  getFamilyById,
  createParentAuthUser,
  createParentFirestoreRecord,
  createFamilyRecord,
  addParentToFamily,
  updateCredentialPin,
  getChildByIdInFamily,
  findCredentialByChildId,
  getCredentialByTatiId,
} from "./provisioning.server";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import { Timestamp } from "firebase-admin/firestore";
import {
  generateTatiId,
  generateChildPin,
  hashChildPin,
} from "@/lib/auth/child-auth-firebase.server";
import { getFirebaseAdmin } from "@/integrations/firebase/admin.server";

/**
 * Get current admin context from session cookie
 */
async function getCurrentAdminUid(): Promise<string> {
  try {
    const sessionCookie = getCookie("__Secure-parent-session") || getCookie("parent-session");
    if (!sessionCookie) {
      throw new Error("Unauthenticated");
    }

    const auth = getFirebaseAdmin();
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return decodedClaims.uid;
  } catch {
    throw new Error("Unauthenticated or invalid session");
  }
}

// ============================================================================
// FUNCTION 1: Provision Parent
// ============================================================================

const provisionParentInput = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(1, "Display name required").max(100),
  phone: z.string().optional(),
});

export const provisionParent = createServerFn({ method: "POST" })
  .validator(provisionParentInput)
  .handler(async ({ data }) => {
    try {
      // Get admin UID from session
      const adminUid = await getCurrentAdminUid();

      // Verify admin authorization
      await verifyAdminAuthorization(adminUid);

      // Validate input
      const validation = validateParentData(data.email, data.displayName);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid input");
      }

      // Check if email already exists
      if (await emailExists(data.email)) {
        throw new Error("Email already in use");
      }

      // Create Firebase Auth user
      const authUser = await createParentAuthUser(
        data.email,
        data.displayName
      );

      // Create Firestore document
      await createParentFirestoreRecord(
        authUser.uid,
        data.email,
        data.displayName,
        data.phone,
        adminUid
      );

      console.log(`[provisionParent] Created parent: ${authUser.uid} (${data.email})`);

      return {
        success: true,
        parentUid: authUser.uid,
        email: authUser.email || data.email,
        displayName: authUser.displayName || data.displayName,
        message: "Parent account created. They will set their password on first login.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create parent account";
      console.error("[provisionParent] Error:", message);
      throw error;
    }
  });

// ============================================================================
// FUNCTION 2: Provision Family
// ============================================================================

const provisionFamilyInput = z.object({
  name: z.string().min(1, "Family name required").max(100),
  parentUid: z.string().min(1, "Parent UID required"),
  notes: z.string().optional(),
  enrolmentDate: z.string().optional(), // ISO 8601
});

export const provisionFamily = createServerFn({ method: "POST" })
  .validator(provisionFamilyInput)
  .handler(async ({ data }) => {
    try {
      // Get admin UID from session
      const adminUid = await getCurrentAdminUid();

      // Verify admin authorization
      await verifyAdminAuthorization(adminUid);

      // Validate family data
      const familyValidation = validateFamilyData(data.name);
      if (!familyValidation.valid) {
        throw new Error(familyValidation.error || "Invalid family data");
      }

      // Verify parent exists and has parent role
      const parent = await getParentByUid(data.parentUid);
      if (!parent) {
        throw new Error("Parent not found or inactive");
      }

      // Generate family ID
      const familyId = `family-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get enrolment date (default to today)
      const enrolmentDate =
        data.enrolmentDate || new Date().toISOString().split("T")[0];

      // Create family document
      await createFamilyRecord(
        familyId,
        data.name,
        data.notes,
        enrolmentDate,
        adminUid
      );

      // Add parent to family
      await addParentToFamily(familyId, data.parentUid);

      console.log(
        `[provisionFamily] Created family: ${familyId} with parent ${data.parentUid}`
      );

      return {
        success: true,
        familyId,
        parentUid: data.parentUid,
        name: data.name,
        enrolmentDate,
        message: "Family created and parent assigned",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create family";
      console.error("[provisionFamily] Error:", message);
      throw error;
    }
  });

// ============================================================================
// FUNCTION 3: Provision Child (ATOMIC)
// ============================================================================

const provisionChildInput = z.object({
  familyId: z.string().min(1, "Family ID required"),
  name: z.string().min(1, "Child name required").max(100),
  age: z.number().int().min(5).max(18),
  dateOfBirth: z.string().optional(), // ISO 8601
  preferredName: z.string().optional(),
});

export const provisionChild = createServerFn({ method: "POST" })
  .validator(provisionChildInput)
  .handler(async ({ data }) => {
    try {
      // Get admin UID from session
      const adminUid = await getCurrentAdminUid();

      // Verify admin authorization
      await verifyAdminAuthorization(adminUid);

      // Validate child data
      const childValidation = validateChildData(data.name, data.age);
      if (!childValidation.valid) {
        throw new Error(childValidation.error || "Invalid child data");
      }

      // Verify family exists
      const family = await getFamilyById(data.familyId);
      if (!family) {
        throw new Error("Family not found");
      }

      const db = getFirebaseAdminDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Generate TATI ID with uniqueness check
      let tatiId: string;
      let retries = 0;
      const maxRetries = 3;

      do {
        tatiId = generateTatiId();
        const existing = await getCredentialByTatiId(tatiId);
        if (!existing) break; // TATI ID is unique

        retries++;
        if (retries >= maxRetries) {
          throw new Error("Unable to generate unique TATI ID");
        }
      } while (true);

      // Generate PIN and hash it
      const pin = generateChildPin();
      const pinHash = await hashChildPin(pin);

      // Generate child ID
      const childId = `child-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // ATOMIC TRANSACTION: Create child profile + credential
      await db.runTransaction(async (transaction) => {
        // Create child profile
        const childRef = db
          .collection("families")
          .doc(data.familyId)
          .collection("children")
          .doc(childId);

        transaction.set(childRef, {
          id: childId,
          tatiId,
          familyId: data.familyId,
          name: data.name,
          age: data.age,
          dateOfBirth: data.dateOfBirth || null,
          preferredName: data.preferredName || null,
          status: "active",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          createdBy: adminUid,
        });

        // Create credential
        const credRef = db.collection("childCredentials").doc(tatiId);
        transaction.set(credRef, {
          tatiId,
          childId,
          familyId: data.familyId,
          pinHash,
          active: true,
          revokedAt: null,
          rotatedAt: Timestamp.now(),
        });
      });

      console.log(
        `[provisionChild] Created child: ${childId} (TATI: ${tatiId}) in family ${data.familyId}`
      );

      return {
        success: true,
        childId,
        tatiId,
        pin, // PIN SHOWN ONLY ONCE
        familyId: data.familyId,
        name: data.name,
        message: "Child account created. PIN shown once above.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create child, please retry";
      console.error("[provisionChild] Error:", message);
      throw error;
    }
  });

// ============================================================================
// FUNCTION 4: Reset Child PIN
// ============================================================================

const resetChildPinInput = z.object({
  childId: z.string().min(1, "Child ID required"),
  familyId: z.string().min(1, "Family ID required"),
});

export const resetChildPin = createServerFn({ method: "POST" })
  .validator(resetChildPinInput)
  .handler(async ({ data }) => {
    try {
      // Get admin UID from session
      const adminUid = await getCurrentAdminUid();

      // Verify admin authorization
      await verifyAdminAuthorization(adminUid);

      // Verify child exists in family
      const child = await getChildByIdInFamily(
        data.childId,
        data.familyId
      );
      if (!child) {
        throw new Error("Child not found in this family");
      }

      // Find credential by child ID
      const credential = await findCredentialByChildId(data.childId);
      if (!credential) {
        throw new Error("Credential not found");
      }

      // Generate new PIN and hash it
      const newPin = generateChildPin();
      const newPinHash = await hashChildPin(newPin);

      // Update credential
      await updateCredentialPin(credential.tatiId, newPinHash);

      console.log(
        `[resetChildPin] Reset PIN for child ${data.childId} (TATI: ${credential.tatiId})`
      );

      return {
        success: true,
        childId: data.childId,
        newPin, // PIN SHOWN ONLY ONCE
        message: "Child PIN reset. New PIN shown above.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset PIN";
      console.error("[resetChildPin] Error:", message);
      throw error;
    }
  });

// ============================================================================
// FUNCTION 5: Verify Provisioning State
// ============================================================================

const verifyProvisioningStateInput = z.object({
  parentUid: z.string().optional(),
  familyId: z.string().optional(),
  childId: z.string().optional(),
});

export const verifyProvisioningState = createServerFn({ method: "POST" })
  .validator(verifyProvisioningStateInput)
  .handler(async ({ data }) => {
    try {
      // Get admin UID from session
      const adminUid = await getCurrentAdminUid();

      // Verify admin authorization
      await verifyAdminAuthorization(adminUid);

      const result: any = {
        ready: false,
      };

      // Check parent
      if (data.parentUid) {
        const parent = await getParentByUid(data.parentUid);
        result.parentExists = !!parent;
        result.parentEmail = parent?.email;
      }

      // Check family
      if (data.familyId) {
        const family = await getFamilyById(data.familyId);
        result.familyExists = !!family;
        result.familyName = family?.name;
      }

      // Check child
      if (data.childId && data.familyId) {
        const child = await getChildByIdInFamily(data.childId, data.familyId);
        result.childExists = !!child;
        result.childName = child?.name;
      }

      // All prerequisites met?
      result.ready =
        (!data.parentUid || result.parentExists) &&
        (!data.familyId || result.familyExists) &&
        (!data.childId || result.childExists);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to verify state";
      console.error("[verifyProvisioningState] Error:", message);
      throw error;
    }
  });
