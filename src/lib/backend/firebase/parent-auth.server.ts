/**
 * Parent Authentication (Server-Side Only)
 *
 * Uses Firebase session cookies with Admin SDK verification.
 * Session cookies are created with a 5-day expiration and verified on every server request.
 */

import { setCookie, getCookie, deleteCookie } from "@tanstack/react-start/server";
import { getFirebaseAdmin } from "@/integrations/firebase/admin.server";

// In dev (http://), __Secure- prefix is rejected by browsers unless secure=true.
// Use plain name in dev, __Secure- in production.
const SESSION_COOKIE_NAME = process.env["NODE_ENV"] === "production" 
  ? "__Secure-parent-session" 
  : "parent-session";
const SESSION_COOKIE_MAX_AGE = 5 * 24 * 60 * 60; // 5 days in seconds

export type AuthenticatedParentContext = {
  uid: string;
};

/**
 * Create a parent session cookie from a verified Firebase ID token.
 * This is called immediately after sign-in with a fresh ID token.
 * 
 * The returned session cookie is cryptographically verified by Firebase Admin SDK
 * and includes the parent's uid. It is set as an HTTP-only cookie.
 */
export async function createParentSession(idToken: string): Promise<void> {
  try {
    console.log("[createParentSession] START - idToken:", idToken.substring(0, 50) + "...");
    
    const auth = getFirebaseAdmin();
    console.log("[createParentSession] Auth instance obtained");
    
    // Verify the ID token and create a session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_COOKIE_MAX_AGE * 1000, // Convert to milliseconds
    });
    console.log("[createParentSession] Session cookie created, length:", sessionCookie.length);

    // Set the session cookie with strict security options
    console.log("[createParentSession] Calling setCookie with name:", SESSION_COOKIE_NAME);
    setCookie(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE,
    });
    console.log("[createParentSession] setCookie completed");
    console.log("[createParentSession] SUCCESS - cookie should be in response");
  } catch (error) {
    console.error("[createParentSession] Error:", error);
    throw error;
  }
}

/**
 * Get authenticated parent context from server request.
 * Verifies the session cookie with Firebase Admin SDK.
 *
 * Returns:
 * - AuthenticatedParentContext with uid
 *
 * Throws:
 * - Error if no session cookie or if verification fails
 */
export async function getCurrentParentContext(): Promise<AuthenticatedParentContext> {
  try {
    const sessionCookie = getCookie(SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      throw new Error("Unauthenticated: No session cookie found");
    }

    const auth = getFirebaseAdmin();
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    return { uid: decodedClaims.uid };
  } catch (error) {
    console.error(
      "[getCurrentParentContext] Error:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

/**
 * Clear the parent session cookie and optionally revoke the Firebase token.
 * Called on logout.
 */
export async function clearParentSession(uid?: string): Promise<void> {
  try {
    // Delete the session cookie
    deleteCookie(SESSION_COOKIE_NAME);

    // Optionally revoke refresh tokens for the user
    if (uid) {
      try {
        const auth = getFirebaseAdmin();
        await auth.revokeRefreshTokens(uid);
        console.log("[clearParentSession] Refresh tokens revoked for uid:", uid);
      } catch (revokeError) {
        console.error("[clearParentSession] Error revoking tokens:", revokeError);
        // Continue even if revocation fails - cookie deletion is what matters
      }
    }

    console.log("[clearParentSession] Session cleared");
  } catch (error) {
    console.error("[clearParentSession] Error clearing session:", error);
    throw error;
  }
}
