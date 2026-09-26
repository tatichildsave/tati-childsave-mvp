import { timingSafeEqual } from "node:crypto";

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

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function requireAuthenticatedUser(context: AuthContext): AuthenticatedUser {
  if (context.kind !== "user") throw new AuthorizationError("A user session is required.");
  return context;
}

export function requireRole(context: AuthContext, role: AppRole): AuthenticatedUser {
  const user = requireAuthenticatedUser(context);
  if (!user.roles.includes(role)) throw new AuthorizationError(`The ${role} role is required.`);
  return user;
}

export function requireParent(context: AuthContext): AuthenticatedUser {
  return requireRole(context, "parent");
}

export function requireFacilitator(context: AuthContext): AuthenticatedUser {
  return requireRole(context, "facilitator");
}

export function requireAdmin(context: AuthContext): AuthenticatedUser {
  return requireRole(context, "admin");
}

export function requireChildSession(context: AuthContext, childId?: string): ChildSession {
  if (context.kind !== "child") throw new AuthorizationError("A child session is required.");
  if (context.revokedAt) throw new AuthorizationError("This child session has been revoked.");
  if (Date.parse(context.expiresAt) <= Date.now()) {
    throw new AuthorizationError("This child session has expired.");
  }
  if (childId && context.childId !== childId) {
    throw new AuthorizationError("This child session cannot access another learner.");
  }
  return context;
}

export function requireChildResource(context: AuthContext, resourceChildId: string): ChildSession {
  return requireChildSession(context, resourceChildId);
}

export async function requireFamilyChildAccess(
  context: AuthContext,
  childId: string,
  canAccess: (userId: string, childId: string) => Promise<boolean>,
): Promise<AuthenticatedUser> {
  const user = requireParent(context);
  if (!(await canAccess(user.userId, childId))) {
    throw new AuthorizationError("This learner is not part of your family.");
  }
  return user;
}

export async function requireAssignedClassAccess(
  context: AuthContext,
  classId: string,
  isAssigned: (userId: string, classId: string) => Promise<boolean>,
): Promise<AuthenticatedUser> {
  const user = requireFacilitatorOrAdmin(context);
  if (user.roles.includes("admin")) return user;
  if (!(await isAssigned(user.userId, classId))) {
    throw new AuthorizationError("You are not assigned to this class.");
  }
  return user;
}

function requireFacilitatorOrAdmin(context: AuthContext): AuthenticatedUser {
  const user = requireAuthenticatedUser(context);
  if (!user.roles.includes("facilitator") && !user.roles.includes("admin")) {
    throw new AuthorizationError("A facilitator or admin role is required.");
  }
  return user;
}

export function canAssignRole(actor: AuthContext, targetUserId: string, role: AppRole): boolean {
  if (!targetUserId || role === "child") return false;
  const user = requireAdmin(actor);
  return user.userId !== targetUserId;
}

export function constantTimeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
