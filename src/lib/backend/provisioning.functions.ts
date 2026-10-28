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
  createFacilitatorFirestoreRecord,
  createFamilyRecord,
  addParentToFamily,
  resetChildPinAndRevokeSessions,
  getChildByIdInFamily,
  getCredentialByTatiId,
} from "./provisioning.server";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type DocumentSnapshot,
  type WriteBatch,
} from "firebase-admin/firestore";
import { assignmentId } from "@/lib/academy/assignment-id";
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
      console.error("[getCurrentAdminUid] No session cookie found");
      throw new Error("Unauthenticated: No session cookie found");
    }

    console.log("[getCurrentAdminUid] Found session cookie, verifying...");
    const auth = getFirebaseAdmin();
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    console.log("[getCurrentAdminUid] Session verified");
    return decodedClaims.uid;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[getCurrentAdminUid] Error:", message);
    throw new Error(`Unauthenticated or invalid session: ${message}`);
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

      console.log("[provisionParent] Parent account created");

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

      console.log("[provisionFamily] Family created");

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
          // Parent-portal field names (see toChildProfile in repositories.server.ts)
          tati_id: tatiId,
          created_by: adminUid,
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
          failedAttempts: 0,
          lockedUntil: null,
        });
      });

      console.log("[provisionChild] Child provisioned");

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

      // Generate new PIN and hash it (outside the transaction; scrypt is slow)
      const newPin = generateChildPin();
      const newPinHash = await hashChildPin(newPin);

      // New PIN, cleared lockout and revocation of all active child sessions
      // commit together. The family check is enforced inside the transaction.
      const { revokedSessionCount } = await resetChildPinAndRevokeSessions(
        data.childId,
        data.familyId,
        newPinHash
      );

      return {
        success: true,
        childId: data.childId,
        revokedSessionCount,
        newPin, // PIN SHOWN ONLY ONCE; returned only after the transaction commits
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

// ============================================================================
// FUNCTIONS 6–7: Read-only family directory for administrators
// ============================================================================
// These never read childCredentials and never return PINs, PIN hashes or passwords.

export interface AdminFamilyParent {
  uid: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
}

export interface AdminFamilyChild {
  id: string;
  name: string;
  preferredName: string | null;
  age: number | null;
  avatar: string | null;
  tatiId: string | null;
  status: string;
  createdAt: string | null;
}

export interface AdminFamilySummary {
  id: string;
  name: string | null;
  status: string;
  enrolmentDate: string | null;
  createdAt: string | null;
  childrenCount: number;
  parents: AdminFamilyParent[];
}

export interface AdminFamilyDetail extends Omit<AdminFamilySummary, "childrenCount"> {
  notes: string | null;
  children: AdminFamilyChild[];
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

async function loadFamilyParents(familyRef: DocumentReference): Promise<AdminFamilyParent[]> {
  const db = getFirebaseAdminDb();
  const members = await familyRef.collection("members").get();
  const adults = members.docs
    .map((m) => ({ uid: str(m.data()["uid"]) ?? m.id, role: str(m.data()["role"]) ?? "parent" }))
    .filter((m) => m.role === "parent" || m.role === "guardian");
  if (adults.length === 0) return [];

  const userDocs = await db.getAll(...adults.map((a) => db.collection("users").doc(a.uid)));
  return userDocs.map((u, i) => {
    const d = u.data() ?? {};
    return {
      uid: adults[i]!.uid,
      displayName: str(d["displayName"]),
      email: str(d["email"]),
      phone: str(d["phone"]),
      status: str(d["status"]),
    };
  });
}

export const listFamiliesAdmin = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async (): Promise<AdminFamilySummary[]> => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);

      const db = getFirebaseAdminDb();
      const snapshot = await db.collection("families").limit(500).get();

      const families = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const d = doc.data();
          const [parents, childCount] = await Promise.all([
            loadFamilyParents(doc.ref),
            doc.ref.collection("children").count().get(),
          ]);
          return {
            id: doc.id,
            name: str(d["name"]),
            status: str(d["status"]) ?? "active",
            enrolmentDate: str(d["enrolmentDate"]),
            createdAt: toIso(d["createdAt"]),
            childrenCount: childCount.data().count,
            parents,
          };
        }),
      );

      return families.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load families";
      console.error("[listFamiliesAdmin] Error:", message);
      throw error;
    }
  });

export const getFamilyAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ familyId: z.string().min(1).max(200) }))
  .handler(async ({ data }): Promise<AdminFamilyDetail | null> => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);

      const db = getFirebaseAdminDb();
      const familyRef = db.collection("families").doc(data.familyId);
      const familyDoc = await familyRef.get();
      if (!familyDoc.exists) return null;
      const d = familyDoc.data() ?? {};

      const [parents, childrenSnap] = await Promise.all([
        loadFamilyParents(familyRef),
        familyRef.collection("children").get(),
      ]);

      const children: AdminFamilyChild[] = childrenSnap.docs
        .map((c) => {
          const cd = c.data();
          return {
            id: c.id,
            name: str(cd["name"]) ?? "Unnamed learner",
            preferredName: str(cd["preferredName"]),
            age: typeof cd["age"] === "number" ? cd["age"] : null,
            avatar: str(cd["avatar"]),
            tatiId: str(cd["tatiId"]) ?? str(cd["tati_id"]),
            status: str(cd["status"]) ?? "active",
            createdAt: toIso(cd["createdAt"]),
          };
        })
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

      return {
        id: familyDoc.id,
        name: str(d["name"]),
        notes: str(d["notes"]),
        status: str(d["status"]) ?? "active",
        enrolmentDate: str(d["enrolmentDate"]),
        createdAt: toIso(d["createdAt"]),
        parents,
        children,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load family";
      console.error("[getFamilyAdmin] Error:", message);
      throw error;
    }
  });

// ============================================================================
// FUNCTION 8: Repair parent ↔ family links (one-off, admin only)
// ============================================================================
// Before the enrolment fix, provisioning linked parents only via families/{id}/members.
// The parent portal looks up users/{uid}/familyMemberships, found nothing, and auto-created
// an empty "My Family". This repair is additive and idempotent: it adds missing membership
// links and parent-portal child fields, and marks empty self-created families "superseded".
// It never deletes data and never touches credentials or PINs.

export interface FamilyLinkRepairReport {
  applied: boolean;
  familiesScanned: number;
  linksToAdd: Array<{ familyId: string; familyName: string | null; parentUid: string; parentEmail: string | null }>;
  childFieldsToFix: number;
  strayFamiliesToRetire: Array<{ familyId: string; parentUid: string; parentEmail: string | null }>;
  needsReview: Array<{ familyId: string; parentUid: string; parentEmail: string | null; childrenCount: number }>;
}

export const repairFamilyLinks = createServerFn({ method: "POST" })
  .validator(z.object({ apply: z.boolean() }))
  .handler(async ({ data }): Promise<FamilyLinkRepairReport> => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);

      const db = getFirebaseAdminDb();
      const now = Timestamp.now();
      const writes: Array<(batch: WriteBatch) => void> = [];
      const report: FamilyLinkRepairReport = {
        applied: data.apply,
        familiesScanned: 0,
        linksToAdd: [],
        childFieldsToFix: 0,
        strayFamiliesToRetire: [],
        needsReview: [],
      };

      const familiesSnap = await db.collection("families").get();
      report.familiesScanned = familiesSnap.size;
      const familyById = new Map(familiesSnap.docs.map((f) => [f.id, f]));
      const linkedFamiliesByParent = new Map<string, Set<string>>();
      const emailCache = new Map<string, string | null>();
      const emailOf = async (uid: string) => {
        if (!emailCache.has(uid)) {
          const u = await db.collection("users").doc(uid).get();
          emailCache.set(uid, str(u.data()?.["email"]));
        }
        return emailCache.get(uid) ?? null;
      };

      for (const family of familiesSnap.docs) {
        const [membersSnap, childrenSnap] = await Promise.all([
          family.ref.collection("members").get(),
          family.ref.collection("children").get(),
        ]);

        for (const child of childrenSnap.docs) {
          const cd = child.data();
          const patch: Record<string, unknown> = {};
          if (str(cd["tatiId"]) && !str(cd["tati_id"])) patch["tati_id"] = cd["tatiId"];
          if (str(cd["createdBy"]) && !str(cd["created_by"])) patch["created_by"] = cd["createdBy"];
          if (Object.keys(patch).length > 0) {
            report.childFieldsToFix++;
            writes.push((b) => b.update(child.ref, patch));
          }
        }

        for (const member of membersSnap.docs) {
          const md = member.data();
          const role = str(md["role"]) ?? "parent";
          if ((role !== "parent" && role !== "guardian") || (str(md["status"]) ?? "active") !== "active") continue;
          const uid = str(md["uid"]) ?? member.id;
          if (!linkedFamiliesByParent.has(uid)) linkedFamiliesByParent.set(uid, new Set());
          linkedFamiliesByParent.get(uid)!.add(family.id);

          const membershipRef = db.collection("users").doc(uid).collection("familyMemberships").doc(family.id);
          const membership = await membershipRef.get();
          if (!membership.exists) {
            report.linksToAdd.push({
              familyId: family.id,
              familyName: str(family.data()["name"]),
              parentUid: uid,
              parentEmail: await emailOf(uid),
            });
            writes.push((b) =>
              b.set(membershipRef, { familyId: family.id, userId: uid, role, status: "active", createdAt: now, repairedAt: now }),
            );
          }
        }
      }

      // Retire empty families the portal auto-created for parents who belong to an enrolled family.
      for (const [uid, linkedFamilies] of linkedFamiliesByParent) {
        const memberships = await db.collection("users").doc(uid).collection("familyMemberships").get();
        for (const m of memberships.docs) {
          if (linkedFamilies.has(m.id) || str(m.data()["status"]) !== "active") continue;
          const stray = familyById.get(m.id);
          if (!stray || str(stray.data()["createdBy"]) !== uid) continue;
          const childCount = (await stray.ref.collection("children").count().get()).data().count;
          const entry = { familyId: stray.id, parentUid: uid, parentEmail: await emailOf(uid) };
          if (childCount > 0) {
            report.needsReview.push({ ...entry, childrenCount: childCount });
            continue;
          }
          report.strayFamiliesToRetire.push(entry);
          writes.push((b) => b.update(m.ref, { status: "superseded", supersededAt: now }));
          writes.push((b) => b.update(stray.ref, { status: "superseded", supersededAt: now, updatedAt: now }));
        }
      }

      if (data.apply && writes.length > 0) {
        for (let i = 0; i < writes.length; i += 400) {
          const batch = db.batch();
          writes.slice(i, i + 400).forEach((w) => w(batch));
          await batch.commit();
        }
        console.log(`[repairFamilyLinks] Applied ${writes.length} writes`);
      }

      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to repair family links";
      console.error("[repairFamilyLinks] Error:", message);
      throw error;
    }
  });

// ============================================================================
// FUNCTIONS 9–14: Facilitators — provisioning and cohort-based assignment (admin only)
// ============================================================================
// Access model: a facilitator can read a learner only when BOTH a facilitatorAssignments
// document exists and the child's facilitatorUids contains the facilitator (Firestore rules).
// Admins assign learners through cohorts; every change updates the cohort, the assignment
// documents and the child's facilitatorUids in one transaction.

export interface AdminFacilitatorSummary {
  uid: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  cohortCount: number;
  learnerCount: number;
  createdAt: string | null;
}

export interface AdminCohortLearner {
  childId: string;
  familyId: string;
  name: string;
  age: number | null;
  avatar: string | null;
  tatiId: string | null;
}

export interface AdminFacilitatorCohort {
  id: string;
  name: string;
  description: string | null;
  status: string;
  managedBy: string;
  learners: AdminCohortLearner[];
  /** Learner ids on the cohort whose child record could not be found. */
  missingLearnerIds: string[];
}

export interface AdminFacilitatorDetail extends Omit<AdminFacilitatorSummary, "cohortCount"> {
  cohorts: AdminFacilitatorCohort[];
}

export interface AdminLearnerOption extends AdminCohortLearner {
  familyName: string | null;
}

function learnerFromDoc(doc: DocumentSnapshot): AdminCohortLearner | null {
  if (!doc.exists) return null;
  const d = doc.data() ?? {};
  const familyId = str(d["familyId"]) ?? doc.ref.parent.parent?.id ?? null;
  if (!familyId) return null;
  return {
    childId: doc.id,
    familyId,
    name: str(d["name"]) ?? "Unnamed learner",
    age: typeof d["age"] === "number" ? d["age"] : null,
    avatar: str(d["avatar"]),
    tatiId: str(d["tati_id"]) ?? str(d["tatiId"]),
  };
}

const provisionFacilitatorInput = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z.string().trim().min(1, "Name required").max(100),
  phone: z.string().max(40).optional(),
});

export const provisionFacilitator = createServerFn({ method: "POST" })
  .validator(provisionFacilitatorInput)
  .handler(async ({ data }) => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);

      const validation = validateParentData(data.email, data.displayName);
      if (!validation.valid) throw new Error(validation.error || "Invalid input");
      if (await emailExists(data.email)) throw new Error("Email already in use");

      const authUser = await createParentAuthUser(data.email, data.displayName);
      await createFacilitatorFirestoreRecord(authUser.uid, data.email, data.displayName, data.phone, adminUid);

      console.log("[provisionFacilitator] Facilitator account created");
      return {
        success: true,
        facilitatorUid: authUser.uid,
        email: authUser.email || data.email,
        displayName: authUser.displayName || data.displayName,
        message:
          "Facilitator account created. Ask them to choose 'Forgot password' on the TATI Academy sign-in page to set their password.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create facilitator";
      console.error("[provisionFacilitator] Error:", message);
      throw error;
    }
  });

export const listFacilitatorsAdmin = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async (): Promise<AdminFacilitatorSummary[]> => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);
      const db = getFirebaseAdminDb();

      const users = await db.collection("users").where("roles", "array-contains", "facilitator").get();
      const rows = await Promise.all(
        users.docs.map(async (u) => {
          const d = u.data();
          const [cohorts, assignments] = await Promise.all([
            db.collection("academyCohorts").where("facilitatorUid", "==", u.id).where("status", "==", "active").count().get(),
            db.collection("facilitatorAssignments").where("facilitatorUid", "==", u.id).count().get(),
          ]);
          return {
            uid: u.id,
            displayName: str(d["displayName"]),
            email: str(d["email"]),
            phone: str(d["phone"]),
            status: str(d["status"]) ?? "active",
            cohortCount: cohorts.data().count,
            learnerCount: assignments.data().count,
            createdAt: toIso(d["createdAt"]),
          };
        }),
      );
      return rows.sort((a, b) => (a.displayName ?? a.email ?? "").localeCompare(b.displayName ?? b.email ?? ""));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load facilitators";
      console.error("[listFacilitatorsAdmin] Error:", message);
      throw error;
    }
  });

export const getFacilitatorAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ facilitatorUid: z.string().min(1).max(200) }))
  .handler(async ({ data }): Promise<AdminFacilitatorDetail | null> => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);
      const db = getFirebaseAdminDb();

      const user = await db.collection("users").doc(data.facilitatorUid).get();
      const u = user.data();
      if (!user.exists || !u || !Array.isArray(u["roles"]) || !(u["roles"] as string[]).includes("facilitator")) {
        return null;
      }

      const [cohortSnap, assignmentSnap] = await Promise.all([
        db.collection("academyCohorts").where("facilitatorUid", "==", data.facilitatorUid).get(),
        db.collection("facilitatorAssignments").where("facilitatorUid", "==", data.facilitatorUid).get(),
      ]);

      // Resolve learners via their assignments (familyId is stored there).
      const familyByChild = new Map(
        assignmentSnap.docs.map((a) => [a.data()["childId"] as string, a.data()["familyId"] as string]),
      );

      const cohorts = await Promise.all(
        cohortSnap.docs.map(async (c): Promise<AdminFacilitatorCohort> => {
          const cd = c.data();
          const ids = Array.isArray(cd["learnerIds"]) ? (cd["learnerIds"] as string[]) : [];
          const refs = ids
            .filter((id) => familyByChild.has(id))
            .map((id) => db.collection("families").doc(familyByChild.get(id)!).collection("children").doc(id));
          const docs = refs.length ? await db.getAll(...refs) : [];
          const learners = docs.map(learnerFromDoc).filter((l): l is AdminCohortLearner => !!l);
          const found = new Set(learners.map((l) => l.childId));
          return {
            id: c.id,
            name: str(cd["name"]) ?? "Unnamed cohort",
            description: str(cd["description"]),
            status: str(cd["status"]) ?? "active",
            managedBy: str(cd["managedBy"]) ?? "facilitator",
            learners: learners.sort((a, b) => a.name.localeCompare(b.name)),
            missingLearnerIds: ids.filter((id) => !found.has(id)),
          };
        }),
      );

      return {
        uid: user.id,
        displayName: str(u["displayName"]),
        email: str(u["email"]),
        phone: str(u["phone"]),
        status: str(u["status"]) ?? "active",
        learnerCount: assignmentSnap.size,
        createdAt: toIso(u["createdAt"]),
        cohorts: cohorts.sort((a, b) => a.name.localeCompare(b.name)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load facilitator";
      console.error("[getFacilitatorAdmin] Error:", message);
      throw error;
    }
  });

/** Every learner in an active family, for the admin cohort picker. Never returns credentials. */
export const listLearnersAdmin = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async (): Promise<AdminLearnerOption[]> => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);
      const db = getFirebaseAdminDb();

      const [children, families] = await Promise.all([
        db.collectionGroup("children").get(),
        db.collection("families").get(),
      ]);
      const familyInfo = new Map(
        families.docs.map((f) => [f.id, { name: str(f.data()["name"]), status: str(f.data()["status"]) ?? "active" }]),
      );

      return children.docs
        .filter((c) => c.ref.parent.parent?.parent.id === "families")
        .map((c) => {
          const learner = learnerFromDoc(c);
          if (!learner) return null;
          const fam = familyInfo.get(learner.familyId);
          if (!fam || fam.status !== "active") return null;
          return { ...learner, familyName: fam.name };
        })
        .filter((l): l is AdminLearnerOption => !!l)
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load learners";
      console.error("[listLearnersAdmin] Error:", message);
      throw error;
    }
  });

const cohortLearnerRef = z.object({
  familyId: z.string().min(1).max(200),
  childId: z.string().min(1).max(200),
});

const saveFacilitatorCohortInput = z.object({
  facilitatorUid: z.string().min(1).max(200),
  cohortId: z.string().min(1).max(200).optional(),
  name: z.string().trim().min(1, "Cohort name required").max(100),
  description: z.string().trim().max(500).optional(),
  // Max 120 keeps the transaction within Firestore's 500-write limit (2 writes per added and removed learner).
  learners: z.array(cohortLearnerRef).max(120, "A cohort can have up to 120 learners"),
});

/**
 * Create or update an admin-managed cohort for a facilitator, atomically keeping
 * facilitatorAssignments and each child's facilitatorUids in sync with cohort membership.
 */
async function saveCohortTransaction(params: {
  adminUid: string;
  facilitatorUid: string;
  cohortId?: string | undefined;
  name: string;
  description: string | null;
  learners: Array<{ familyId: string; childId: string }>;
}): Promise<{ cohortId: string; added: number; removed: number }> {
  const db = getFirebaseAdminDb();
  const cohortRef = params.cohortId
    ? db.collection("academyCohorts").doc(params.cohortId)
    : db.collection("academyCohorts").doc();

  return db.runTransaction(async (tx) => {
    // ---- Reads (all before writes) ----
    const facilitator = await tx.get(db.collection("users").doc(params.facilitatorUid));
    const roles = facilitator.data()?.["roles"];
    if (!facilitator.exists || !Array.isArray(roles) || !roles.includes("facilitator")) {
      throw new Error("Facilitator not found");
    }

    const existing = params.cohortId ? await tx.get(cohortRef) : null;
    if (params.cohortId) {
      if (!existing?.exists) throw new Error("Cohort not found");
      if (existing.data()?.["facilitatorUid"] !== params.facilitatorUid) {
        throw new Error("Cohort belongs to a different facilitator");
      }
    }

    const unique = new Map(params.learners.map((l) => [l.childId, l]));
    const childDocs = unique.size
      ? await tx.getAll(
          ...[...unique.values()].map((l) =>
            db.collection("families").doc(l.familyId).collection("children").doc(l.childId),
          ),
        )
      : [];
    for (const c of childDocs) {
      if (!c.exists) throw new Error("One or more selected learners could not be found");
    }

    const otherCohorts = await tx.get(
      db.collection("academyCohorts").where("facilitatorUid", "==", params.facilitatorUid),
    );
    const assignments = await tx.get(
      db.collection("facilitatorAssignments").where("facilitatorUid", "==", params.facilitatorUid),
    );

    const previous = new Set<string>(
      existing?.exists && Array.isArray(existing.data()?.["learnerIds"]) ? (existing.data()!["learnerIds"] as string[]) : [],
    );
    const next = new Set(unique.keys());
    const stillCoveredElsewhere = new Set<string>();
    for (const c of otherCohorts.docs) {
      // Only other active admin-managed cohorts grant (and therefore retain) access.
      if (c.id === cohortRef.id || c.data()["status"] !== "active" || c.data()["managedBy"] !== "admin") continue;
      for (const id of (c.data()["learnerIds"] as string[] | undefined) ?? []) stillCoveredElsewhere.add(id);
    }
    const assignmentsByChild = new Map<string, DocumentReference[]>();
    for (const a of assignments.docs) {
      const childId = a.data()["childId"] as string;
      assignmentsByChild.set(childId, [...(assignmentsByChild.get(childId) ?? []), a.ref]);
    }

    // Removed learners lose access only when no other active cohort of this facilitator includes them.
    const revoke = [...previous].filter((id) => !next.has(id) && !stillCoveredElsewhere.has(id));
    const revokeFamily = new Map(
      assignments.docs.map((a) => [a.data()["childId"] as string, a.data()["familyId"] as string]),
    );

    // ---- Writes ----
    const now = Timestamp.now();
    for (const l of unique.values()) {
      tx.set(
        db.collection("facilitatorAssignments").doc(assignmentId(params.facilitatorUid, l.childId)),
        {
          facilitatorUid: params.facilitatorUid,
          familyId: l.familyId,
          childId: l.childId,
          assignedBy: params.adminUid,
          updatedAt: now,
          ...(assignmentsByChild.has(l.childId) ? {} : { createdAt: now }),
        },
        { merge: true },
      );
      tx.update(db.collection("families").doc(l.familyId).collection("children").doc(l.childId), {
        facilitatorUids: FieldValue.arrayUnion(params.facilitatorUid),
      });
    }

    for (const childId of revoke) {
      for (const ref of assignmentsByChild.get(childId) ?? []) tx.delete(ref);
      const familyId = revokeFamily.get(childId);
      if (familyId) {
        tx.update(db.collection("families").doc(familyId).collection("children").doc(childId), {
          facilitatorUids: FieldValue.arrayRemove(params.facilitatorUid),
        });
      }
    }

    tx.set(
      cohortRef,
      {
        id: cohortRef.id,
        facilitatorUid: params.facilitatorUid,
        name: params.name,
        description: params.description,
        learnerIds: [...next],
        status: "active",
        managedBy: "admin",
        updatedAt: now,
        updatedBy: params.adminUid,
        ...(existing?.exists ? {} : { createdAt: now, createdBy: params.adminUid }),
      },
      { merge: true },
    );

    const added = [...next].filter((id) => !previous.has(id)).length;
    return { cohortId: cohortRef.id, added, removed: revoke.length };
  });
}

export const saveFacilitatorCohort = createServerFn({ method: "POST" })
  .validator(saveFacilitatorCohortInput)
  .handler(async ({ data }) => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);
      const result = await saveCohortTransaction({
        adminUid,
        facilitatorUid: data.facilitatorUid,
        cohortId: data.cohortId,
        name: data.name,
        description: data.description?.trim() || null,
        learners: data.learners,
      });
      console.log(
        `[saveFacilitatorCohort] Cohort saved: +${result.added} / -${result.removed}`,
      );
      return { success: true, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save cohort";
      console.error("[saveFacilitatorCohort] Error:", message);
      throw error;
    }
  });

export const removeLearnerFromFacilitatorCohort = createServerFn({ method: "POST" })
  .validator(
    z.object({
      facilitatorUid: z.string().min(1).max(200),
      cohortId: z.string().min(1).max(200),
      childId: z.string().min(1).max(200),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);
      const db = getFirebaseAdminDb();

      const cohort = await db.collection("academyCohorts").doc(data.cohortId).get();
      const cd = cohort.data();
      if (!cohort.exists || !cd || cd["facilitatorUid"] !== data.facilitatorUid) throw new Error("Cohort not found");

      const assignments = await db
        .collection("facilitatorAssignments")
        .where("facilitatorUid", "==", data.facilitatorUid)
        .get();
      const familyByChild = new Map(
        assignments.docs.map((a) => [a.data()["childId"] as string, a.data()["familyId"] as string]),
      );
      const remaining = ((cd["learnerIds"] as string[] | undefined) ?? [])
        .filter((id) => id !== data.childId && familyByChild.has(id))
        .map((id) => ({ childId: id, familyId: familyByChild.get(id)! }));

      const result = await saveCohortTransaction({
        adminUid,
        facilitatorUid: data.facilitatorUid,
        cohortId: data.cohortId,
        name: str(cd["name"]) ?? "Cohort",
        description: str(cd["description"]),
        learners: remaining,
      });
      return { success: true, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove learner";
      console.error("[removeLearnerFromFacilitatorCohort] Error:", message);
      throw error;
    }
  });

// ============================================================================
// FUNCTION 15: List Sessions — admin dashboard
// ============================================================================
// Display all academy sessions (classes) with facilitator and cohort details.
// Returns session data for the admin sessions management page.

export interface AdminSessionItem {
  id: string;
  cohortName: string;
  activityTitle: string;
  facilitatorName: string | null;
  facilitatorEmail: string | null;
  scheduledAt: string; // ISO 8601 string
  durationMinutes: number;
  deliveryMode: "in-person" | "virtual";
  location: string;
  status: "scheduled" | "completed" | "cancelled";
  learnerCount: number;
}

export const listSessionsAdmin = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async (): Promise<AdminSessionItem[]> => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);

      const db = getFirebaseAdminDb();

      // Query all academy classes (sessions)
      const classesSnapshot = await db.collection("academyClasses").get();

      // Get all unique cohort IDs and facilitator UIDs for batch loading
      const cohortIds = new Set<string>();
      const facilitatorUids = new Set<string>();
      const classData = new Map<string, any>();

      for (const doc of classesSnapshot.docs) {
        const data = doc.data();
        classData.set(doc.id, data);
        cohortIds.add(data.cohortId);
        facilitatorUids.add(data.facilitatorUid);
      }

      // Batch load cohorts and facilitators
      const [cohortDocs, facilitatorDocs] = await Promise.all([
        cohortIds.size > 0
          ? db.getAll(...[...cohortIds].map((id) => db.collection("academyCohorts").doc(id)))
          : Promise.resolve([]),
        facilitatorUids.size > 0
          ? db.getAll(...[...facilitatorUids].map((uid) => db.collection("users").doc(uid)))
          : Promise.resolve([]),
      ]);

      // Build lookup maps
      const cohortMap = new Map(
        cohortDocs.map((doc) => [doc.id, { name: str(doc.data()?.["name"]) ?? "Unnamed Cohort" }]),
      );

      const facilitatorMap = new Map(
        facilitatorDocs.map((doc) => [
          doc.id,
          {
            name: str(doc.data()?.["displayName"]),
            email: str(doc.data()?.["email"]),
          },
        ]),
      );

      // Get learner counts per cohort
      const cohortLearnerCounts = new Map<string, number>();
      for (const cohortId of cohortIds) {
        const cohortDoc = await db.collection("academyCohorts").doc(cohortId).get();
        const learnerIds = cohortDoc.data()?.["learnerIds"] ?? [];
        cohortLearnerCounts.set(cohortId, Array.isArray(learnerIds) ? learnerIds.length : 0);
      }

      // Transform to admin format
      const sessions: AdminSessionItem[] = classesSnapshot.docs
        .map((doc): AdminSessionItem | null => {
          const data = classData.get(doc.id);
          if (!data) return null;

          const scheduledAt = data.scheduledAt instanceof Timestamp
            ? data.scheduledAt.toDate().toISOString()
            : typeof data.scheduledAt === "string"
            ? data.scheduledAt
            : new Date().toISOString();

          const cohort = cohortMap.get(data.cohortId);
          const facilitator = facilitatorMap.get(data.facilitatorUid);
          const learnerCount = cohortLearnerCounts.get(data.cohortId) ?? 0;

          return {
            id: doc.id,
            cohortName: cohort?.name ?? "Unnamed Cohort",
            activityTitle: str(data.activityTitle) ?? str(data.activityId) ?? "Unknown Activity",
            facilitatorName: facilitator?.name,
            facilitatorEmail: facilitator?.email,
            scheduledAt,
            durationMinutes: typeof data.durationMinutes === "number" ? data.durationMinutes : 60,
            deliveryMode: data.deliveryMode === "virtual" ? "virtual" : "in-person",
            location: str(data.location) ?? "",
            status: ["completed", "cancelled"].includes(data.status) ? data.status : "scheduled",
            learnerCount,
          };
        })
        .filter((s): s is AdminSessionItem => s !== null)
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));

      return sessions;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load sessions";
      console.error("[listSessionsAdmin] Error:", message);
      throw error;
    }
  });

// ============================================================================
// FUNCTION 16: List Programmes — admin dashboard
// ============================================================================
// Display all academy programmes (cohorts) with facilitator and learner details.
// Returns programme data for the admin programmes management page.

export interface AdminProgrammeItem {
  id: string;
  name: string;
  facilitatorName: string | null;
  facilitatorEmail: string | null;
  learnerCount: number;
  status: "active" | "archived";
  createdAt: string | null; // ISO 8601 string
  description: string | null;
}

export const listProgrammesAdmin = createServerFn({ method: "POST" })
  .validator(z.void())
  .handler(async (): Promise<AdminProgrammeItem[]> => {
    try {
      const adminUid = await getCurrentAdminUid();
      await verifyAdminAuthorization(adminUid);

      const db = getFirebaseAdminDb();

      // Query all academy cohorts
      const cohortsSnapshot = await db.collection("academyCohorts").get();

      // Get all unique facilitator UIDs for batch loading
      const facilitatorUids = new Set<string>();
      for (const doc of cohortsSnapshot.docs) {
        const facilitatorUid = doc.data().facilitatorUid;
        if (facilitatorUid) facilitatorUids.add(facilitatorUid);
      }

      // Batch load facilitators
      const facilitatorDocs = facilitatorUids.size > 0
        ? await db.getAll(...[...facilitatorUids].map((uid) => db.collection("users").doc(uid)))
        : [];

      // Build lookup map
      const facilitatorMap = new Map(
        facilitatorDocs.map((doc) => [
          doc.id,
          {
            name: str(doc.data()?.["displayName"]),
            email: str(doc.data()?.["email"]),
          },
        ]),
      );

      // Transform to admin format
      const programmes: AdminProgrammeItem[] = cohortsSnapshot.docs
        .map((doc): AdminProgrammeItem | null => {
          const data = doc.data();
          const learnerIds = data.learnerIds ?? [];
          const learnerCount = Array.isArray(learnerIds) ? learnerIds.length : 0;
          const facilitator = facilitatorMap.get(data.facilitatorUid);

          return {
            id: doc.id,
            name: str(data.name) ?? "Unnamed Programme",
            facilitatorName: facilitator?.name,
            facilitatorEmail: facilitator?.email,
            learnerCount,
            status: (data.status === "archived" ? "archived" : "active") as "active" | "archived",
            createdAt: toIso(data.createdAt),
            description: str(data.description),
          };
        })
        .filter((p): p is AdminProgrammeItem => p !== null)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

      return programmes;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load programmes";
      console.error("[listProgrammesAdmin] Error:", message);
      throw error;
    }
  });
