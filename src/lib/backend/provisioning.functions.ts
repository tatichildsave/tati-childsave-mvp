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
import { Timestamp, type DocumentReference, type WriteBatch } from "firebase-admin/firestore";
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
    console.log("[getCurrentAdminUid] Session verified for user:", decodedClaims.uid);
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
        console.log(`[repairFamilyLinks] Applied ${writes.length} writes (admin ${adminUid})`);
      }

      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to repair family links";
      console.error("[repairFamilyLinks] Error:", message);
      throw error;
    }
  });
