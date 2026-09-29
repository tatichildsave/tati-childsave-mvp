import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  createChildSession,
  revokeChildSession,
  validateChildSession,
  verifyChildCredential,
  loadChildProfile as loadChildProfileFirebase,
} from "./child-auth-firebase.server";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";

const COOKIE_NAME = "tati_child_session";
const genericFailure = "That TATI ID or PIN could not be verified.";
const loginInput = z.object({
  tatiId: z.string().trim().max(32),
  pin: z.string().regex(/^\d{4,6}$/),
});

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Load child's credential document to get familyId.
 * This is used to route to the correct family context.
 */
async function getChildContext(childId: string): Promise<{ familyId: string } | null> {
  try {
    // Query childCredentials collection to find the familyId
    const snapshot = await getFirebaseAdminDb()
      .collection("childCredentials")
      .where("childId", "==", childId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const cred = snapshot.docs[0].data();
    return { familyId: cred.familyId };
  } catch {
    return null;
  }
}

export const childLogin = createServerFn({ method: "POST" })
  .validator(loginInput)
  .handler(async ({ data }) => {
    console.log(`[childLogin] Starting login - tatiId=${data.tatiId}`);

    // Verify TATI ID and PIN, returns childId
    const childId = await verifyChildCredential(data.tatiId, data.pin);
    console.log(`[childLogin] verifyChildCredential returned: ${childId}`);

    if (!childId) {
      console.log(`[childLogin] Credential verification failed`);
      throw new Error(genericFailure);
    }

    // Get familyId from credential context
    const context = await getChildContext(childId);
    console.log(`[childLogin] Got context:`, context);

    if (!context) {
      console.log(`[childLogin] Context lookup failed`);
      throw new Error(genericFailure);
    }

    // Create session in Firestore
    const { token, session } = await createChildSession(childId, context.familyId);
    console.log(`[childLogin] Created session: ${session.id}`);

    // Load child profile
    const profile = await loadChildProfileFirebase(childId, context.familyId);
    console.log(`[childLogin] Loaded profile: ${profile?.name}`);

    if (!profile) {
      // Clean up session if profile load fails
      console.log(`[childLogin] Profile load failed, revoking session`);
      await revokeChildSession(childId, context.familyId, session.id);
      throw new Error(genericFailure);
    }

    // Set HTTP-only session cookie
    setCookie(COOKIE_NAME, token, cookieOptions(30 * 60));
    console.log(`[childLogin] Set session cookie and returning profile`);

    return { profile };
  });

export const getChildSession = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;

  // Validate session token
  const session = await validateChildSession(token);
  if (!session) {
    // Clear invalid session cookie
    setCookie(COOKIE_NAME, "", cookieOptions(0));
    return null;
  }

  // Get context from credential lookup
  const context = await getChildContext(session.childProfileId);
  if (!context) {
    setCookie(COOKIE_NAME, "", cookieOptions(0));
    return null;
  }

  // Load child profile
  const profile = await loadChildProfileFirebase(session.childProfileId, context.familyId);
  if (!profile) return null;

  return { profile, sessionId: session.id, expiresAt: session.expiresAt };
});

export const childLogout = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(COOKIE_NAME);
  if (token) {
    const session = await validateChildSession(token);
    if (session) {
      const context = await getChildContext(session.childProfileId);
      if (context) {
        await revokeChildSession(session.childProfileId, context.familyId, session.id);
      }
    }
  }
  setCookie(COOKIE_NAME, "", cookieOptions(0));
  return { ok: true };
});

export { genericFailure };
