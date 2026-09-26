import type { ChildSession } from "@/lib/auth/authorization.server";
import type { ChildProfile } from "@/lib/family";

export type AdultRole = "parent" | "guardian" | "facilitator" | "admin";
export type AdultAuthProvider = "password" | "google";
export type AccountStatus = "active" | "pending" | "disabled";

export interface AdultIdentity {
  kind: "user";
  userId: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  status: AccountStatus;
  authProvider: AdultAuthProvider;
  roles: readonly AdultRole[];
}

export interface AdultAuthService {
  getCurrentUser(): Promise<AdultIdentity | null>;
  signIn(input: { email: string; password: string }): Promise<AdultIdentity>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  sendEmailVerification(): Promise<void>;
}

export interface AdultRoleService {
  getRoles(userId: string): Promise<readonly AdultRole[]>;
  assignRole(userId: string, role: AdultRole): Promise<void>;
  revokeRole(userId: string, role: AdultRole): Promise<void>;
}

export interface FamilyAuthorizationService {
  isMember(userId: string, familyId: string): Promise<boolean>;
  canAccessChild(userId: string, childId: string): Promise<boolean>;
  canAccessAssignedChild(userId: string, childId: string): Promise<boolean>;
}

export interface ChildIdentityService {
  authenticate(input: { tatiId: string; pin: string }): Promise<{
    profile: ChildProfile;
    session: ChildSession;
  }>;
  getCurrentSession(): Promise<{
    profile: ChildProfile;
    session: ChildSession;
  } | null>;
  logout(): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
}

export interface IdentityServices {
  adults: AdultAuthService;
  roles: AdultRoleService;
  familyAuthorization: FamilyAuthorizationService;
  children: ChildIdentityService;
}
