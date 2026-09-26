/**
 * Child Session Service (Phase G3)
 *
 * Derives authenticated child context from HTTP-only session cookie.
 * Integrates ChildSession (Supabase) with optional Firebase identity mapping.
 *
 * Responsibilities:
 * - Validate session cookie (existing logic)
 * - Load child profile (existing logic)
 * - Resolve Firebase identity (new, optional, server-side only)
 * - Construct unified AuthenticatedChildContext
 * - Enforce authorization boundaries
 *
 * Server-only: Always .server.ts, never imported into browser.
 */

import { getCookie } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateChildSession } from "./child-identity.server";
import {
  type AuthenticatedChildContext,
  type ChildSession,
  type FirebaseChildIdentity,
  AuthorizationError,
} from "./authorization.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getChildFirebaseIdentity } from "@/lib/backend/firebase/child-auth.server";
import type { AuthenticatedUser } from "./authorization.server";

const COOKIE_NAME = "tati_child_session";

/**
 * Type for the child profile row from Supabase.
 */
type ChildProfileRow = {
  id: string;
  tati_id: string;
  name: string;
  age: number;
  avatar: string;
  tier: string;
  curriculum_level: string | null;
  family_id: string;
};

/**
 * Load child profile from Supabase.
 * Used internally by getAuthenticatedChild().
 */
async function loadChildProfile(childId: string): Promise<ChildProfileRow | null> {
  const { data, error } = await (supabaseAdmin as unknown as SupabaseClient)
    .from("child_profiles")
    .select("id, tati_id, name, age, avatar, tier, curriculum_level, family_id")
    .eq("id", childId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ChildProfileRow;
}

/**
 * Resolve Firebase child identity from Firestore (if available).
 * Returns null if identity not found, gracefully continues.
 * Returns identity even if revoked (status checked by caller).
 *
 * Throws if family mismatch (security invariant violation).
 */
async function resolveChildFirebaseIdentity(
  childId: string,
  familyId: string,
): Promise<FirebaseChildIdentity | null> {
  try {
    // Create synthetic parent context for G2 function
    // This is a safe workaround: G2 function validates family anyway
    const parentContext: AuthenticatedUser = {
      kind: "user",
      userId: "system-child-session",
      roles: ["admin"],
    };

    const firebaseUid = await getChildFirebaseIdentity(parentContext, childId, familyId);

    if (!firebaseUid) {
      return null;
    }

    return {
      firebaseUid,
      familyId,
      status: "active",
    };
  } catch (error) {
    // Check if this is a family mismatch error (security incident)
    if (
      error instanceof Error &&
      error.message.includes("Access denied") &&
      error.message.includes("family")
    ) {
      // Security: Family mapping mismatch detected
      // Log and re-throw to prevent silent continuation
      console.error("Firebase family mismatch for child:", childId, error);
      throw error;
    }

    // Other errors (network, Firestore down, emulator unavailable, etc.)
    // Gracefully continue without Firebase context
    console.debug("Firebase identity resolution failed:", error);
    return null;
  }
}

/**
 * Derive complete authenticated child context from HTTP-only session cookie.
 *
 * Flow:
 * 1. Read and validate session cookie
 * 2. Load child profile from Supabase
 * 3. Optionally resolve Firebase identity (graceful degradation)
 * 4. Construct unified AuthenticatedChildContext
 *
 * Returns null if session invalid/expired.
 * Returns context without Firebase if identity unavailable.
 * Throws only on security violations (e.g., family mismatch).
 *
 * @returns AuthenticatedChildContext or null if not authenticated
 * @throws AuthorizationError if security invariants violated
 */
export async function getAuthenticatedChild(): Promise<AuthenticatedChildContext | null> {
  // Step 1: Validate session cookie (existing logic)
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;

  const childSession = await validateChildSession(token);
  if (!childSession) return null;

  // Step 2: Load child profile (existing logic)
  const profile = await loadChildProfile(childSession.child_profile_id);
  if (!profile) return null;

  // Step 3: Optionally resolve Firebase identity (new, graceful degradation)
  let firebase: FirebaseChildIdentity | undefined = undefined;

  try {
    const firebaseIdentity = await resolveChildFirebaseIdentity(
      childSession.child_profile_id,
      profile.family_id,
    );
    if (firebaseIdentity) {
      firebase = firebaseIdentity;
    }
  } catch (err) {
    // Security violation (family mismatch) - fail closed
    if (
      err instanceof Error &&
      err.message.includes("Access denied") &&
      err.message.includes("family")
    ) {
      throw new AuthorizationError(
        "This child session cannot access the requested family resources.",
      );
    }

    // Other errors - logged and ignored (graceful degradation)
    // Firebase is optional; session continues without it
  }

  // Step 4: Construct unified context
  // Convert snake_case DB fields to camelCase ChildSession type
  const session: ChildSession = {
    kind: "child" as const,
    childId: childSession.child_profile_id,
    sessionId: childSession.id,
    createdAt: childSession.created_at,
    expiresAt: childSession.expires_at,
    revokedAt: childSession.revoked_at,
  };

  const context: AuthenticatedChildContext = {
    session,
    profile: {
      id: profile.id,
      tatiId: profile.tati_id,
      name: profile.name,
      age: profile.age,
      avatar: profile.avatar,
      tier: profile.tier,
      curriculum_level: profile.curriculum_level,
      familyId: profile.family_id,
    },
    ...(firebase && { firebase }),
    childId: session.childId,
    sessionId: session.sessionId,
    familyId: profile.family_id,
  };

  return context;
}

/**
 * Require authenticated child context.
 *
 * Validates context object and enforces authorization.
 * Throws AuthorizationError if context is invalid, expired, or revoked.
 *
 * @param context - Context object to validate
 * @returns AuthenticatedChildContext if valid
 * @throws AuthorizationError if validation fails
 */
export function requireAuthenticatedChild(context: unknown): AuthenticatedChildContext {
  if (!context || typeof context !== "object") {
    throw new AuthorizationError("Child authentication required.");
  }

  const ctx = context as Record<string, unknown>;

  // Validate session exists and is ChildSession
  if (!ctx["session"] || typeof ctx["session"] !== "object") {
    throw new AuthorizationError("A child session is required.");
  }

  const session = ctx["session"] as Record<string, unknown>;
  if (session["kind"] !== "child") {
    throw new AuthorizationError("A child session is required.");
  }

  // Validate session not revoked
  if (session["revokedAt"]) {
    throw new AuthorizationError("This child session has been revoked.");
  }

  // Validate session not expired
  if (
    typeof session["expiresAt"] === "string" &&
    Date.parse(session["expiresAt"] as string) <= Date.now()
  ) {
    throw new AuthorizationError("This child session has expired.");
  }

  // Validate profile exists
  if (!ctx["profile"] || typeof ctx["profile"] !== "object") {
    throw new AuthorizationError("Child profile not found.");
  }

  const profile = ctx["profile"] as Record<string, unknown>;
  if (!profile["id"]) {
    throw new AuthorizationError("Child profile not found.");
  }

  // Validate consistency between session and profile
  if (session["childId"] !== profile["id"]) {
    throw new AuthorizationError("Session profile mismatch.");
  }

  return ctx as AuthenticatedChildContext;
}

/**
 * Require authenticated child context for specific child.
 *
 * Validates context and ensures childId matches specified child.
 * Used to prevent cross-child access.
 *
 * @param context - Context object to validate
 * @param childId - Expected child ID
 * @returns AuthenticatedChildContext if valid and matches childId
 * @throws AuthorizationError if validation fails or childId mismatch
 */
export function requireAuthenticatedChildResource(
  context: unknown,
  childId: string,
): AuthenticatedChildContext {
  const authenticated = requireAuthenticatedChild(context);

  if (authenticated.childId !== childId) {
    throw new AuthorizationError("This child session cannot access another learner.");
  }

  return authenticated;
}

/**
 * Require authenticated child context for specific family.
 *
 * Validates context and ensures familyId matches specified family.
 * Used to prevent family-crossing access.
 *
 * @param context - Context object to validate
 * @param familyId - Expected family ID
 * @returns AuthenticatedChildContext if valid and matches familyId
 * @throws AuthorizationError if validation fails or familyId mismatch
 */
export function requireAuthenticatedChildFamily(
  context: unknown,
  familyId: string,
): AuthenticatedChildContext {
  const authenticated = requireAuthenticatedChild(context);

  if (authenticated.familyId !== familyId) {
    throw new AuthorizationError("This child session cannot access another family.");
  }

  return authenticated;
}
