/**
 * Server-only facilitator authorization.
 *
 * Verifies the HTTP-only session cookie (created at facilitator login) with the Firebase
 * Admin SDK, then checks the facilitator role on /users/{uid}. Never trust a uid sent by
 * the browser — always derive it here.
 */

import { getCookie } from "@tanstack/react-start/server";
import { getFirebaseAdmin, getFirebaseAdminDb } from "@/integrations/firebase/admin.server";

export interface FacilitatorContext {
  uid: string;
  roles: string[];
  displayName: string | null;
  email: string | null;
}

export async function requireFacilitatorContext(): Promise<FacilitatorContext> {
  const sessionCookie = getCookie("__Secure-parent-session") || getCookie("parent-session");
  if (!sessionCookie) throw new Error("Unauthenticated: please sign in to TATI Academy again.");

  const decoded = await getFirebaseAdmin().verifySessionCookie(sessionCookie, true);
  const userDoc = await getFirebaseAdminDb().collection("users").doc(decoded.uid).get();
  const data = userDoc.data() ?? {};
  const roles = Array.isArray(data["roles"]) ? (data["roles"] as unknown[]).filter((r): r is string => typeof r === "string") : [];

  if (!roles.includes("facilitator")) {
    throw new Error("Facilitator access required.");
  }
  if (data["status"] && data["status"] !== "active") {
    throw new Error("This facilitator account is not active.");
  }

  return {
    uid: decoded.uid,
    roles,
    displayName: typeof data["displayName"] === "string" ? data["displayName"] : null,
    email: typeof data["email"] === "string" ? data["email"] : null,
  };
}

/** True when the facilitator holds an assignment for every given child (any assignment id format). */
export async function facilitatorIsAssignedTo(facilitatorUid: string, childIds: string[]): Promise<boolean> {
  if (childIds.length === 0) return true;
  const snap = await getFirebaseAdminDb()
    .collection("facilitatorAssignments")
    .where("facilitatorUid", "==", facilitatorUid)
    .get();
  const assigned = new Set(snap.docs.map((d) => d.data()["childId"] as string));
  return childIds.every((id) => assigned.has(id));
}

export { assignmentId } from "./assignment-id";
