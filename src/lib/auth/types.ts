/**
 * Authentication types - NO server-only imports.
 * This file can be safely imported by both client and server code.
 * Server-only functionality is in authorization.server.ts
 */

export type AppRole = "parent" | "child" | "facilitator" | "admin";

export type AuthenticatedUser = {
  kind: "user";
  userId: string;
  roles: readonly AppRole[];
};

export type ChildSession = {
  kind: "child";
  childId: string;
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type AuthContext = AuthenticatedUser | ChildSession;

/**
 * Firebase child identity mapping (G3).
 * Supplementary identity layer for child authentication.
 * Always resolved server-side, never exposed to browser.
 */
export type FirebaseChildIdentity = {
  firebaseUid: string;
  familyId: string;
  status: "active" | "revoked";
};

/**
 * Authenticated child context (G3).
 * Unified context combining ChildSession with optional Firebase identity.
 * Primary application session remains ChildSession.
 * Firebase identity is supplementary (available if created in G2).
 */
export type AuthenticatedChildContext = {
  session: ChildSession;
  profile: {
    id: string;
    tatiId: string;
    name: string;
    age: number;
    avatar: string;
    tier: string;
    curriculum_level: string | null;
    familyId: string;
  };
  firebase?: FirebaseChildIdentity;

  readonly childId: string;
  readonly sessionId: string;
  readonly familyId: string;
};

