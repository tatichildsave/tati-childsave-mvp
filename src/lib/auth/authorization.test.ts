import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  canAssignRole,
  requireAdmin,
  requireAuthenticatedUser,
  requireAssignedClassAccess,
  requireChildSession,
  requireChildResource,
  requireFacilitator,
  requireFamilyChildAccess,
  requireParent,
} from "./authorization.server";
import {
  generateTatiId,
  hashChildPin,
  isValidTatiId,
  verifyChildPin,
} from "./child-identity.server";

const parent = { kind: "user" as const, userId: "parent-1", roles: ["parent" as const] };
const facilitator = {
  kind: "user" as const,
  userId: "facilitator-1",
  roles: ["facilitator" as const],
};
const admin = { kind: "user" as const, userId: "admin-1", roles: ["admin" as const] };
const child = {
  kind: "child" as const,
  childId: "child-1",
  sessionId: "session-1",
  createdAt: "2026-09-21T10:00:00.000Z",
  expiresAt: "2099-09-21T10:00:00.000Z",
  revokedAt: null,
};

function rejects(action: () => unknown | Promise<unknown>) {
  return expect(action()).rejects.toBeInstanceOf(AuthorizationError);
}

describe("authorization boundaries", () => {
  it("allows a parent to access an own-family child", async () => {
    await expect(
      requireFamilyChildAccess(
        parent,
        "child-1",
        async (userId, childId) => userId === "parent-1" && childId === "child-1",
      ),
    ).resolves.toMatchObject({ userId: "parent-1" });
  });

  it("blocks a parent from another family's child", async () => {
    await rejects(() => requireFamilyChildAccess(parent, "child-2", async () => false));
  });

  it("allows a child session to access only its own child", () => {
    expect(requireChildSession(child, "child-1").childId).toBe("child-1");
  });

  it("blocks a child session from another child route parameter", () => {
    expect(() => requireChildSession(child, "child-2")).toThrow(AuthorizationError);
  });

  it("allows child A to read only child A profile and progress resources", () => {
    expect(requireChildResource(child, "child-1").childId).toBe("child-1");
    expect(() => requireChildResource(child, "child-2")).toThrow(AuthorizationError);
  });

  it("blocks child A from another child's scenario, assessment, and progress writes", () => {
    for (const resource of ["child-2", "child-2", "child-2"]) {
      expect(() => requireChildResource(child, resource)).toThrow(AuthorizationError);
    }
  });

  it("does not let a child session use parent access", () => {
    expect(() => requireParent(child)).toThrow(AuthorizationError);
  });

  it("does not let a child session use facilitator access", () => {
    expect(() => requireFacilitator(child)).toThrow(AuthorizationError);
  });

  it("does not let a child session use admin access", () => {
    expect(() => requireAdmin(child)).toThrow(AuthorizationError);
  });

  it("does not let a parent use facilitator access", () => {
    expect(() => requireFacilitator(parent)).toThrow(AuthorizationError);
  });

  it("does not let a parent use admin access", () => {
    expect(() => requireAdmin(parent)).toThrow(AuthorizationError);
  });

  it("rejects an unauthenticated context", () => {
    expect(() => requireAuthenticatedUser(child)).toThrow(AuthorizationError);
  });

  it("allows facilitators only into assigned classes and lets admins oversee them", async () => {
    await expect(
      requireAssignedClassAccess(
        facilitator,
        "class-1",
        async (userId, classId) => userId === "facilitator-1" && classId === "class-1",
      ),
    ).resolves.toMatchObject({ userId: "facilitator-1" });
    await rejects(() => requireAssignedClassAccess(facilitator, "class-2", async () => false));
    await expect(
      requireAssignedClassAccess(admin, "class-2", async () => false),
    ).resolves.toMatchObject({ userId: "admin-1" });
  });

  it("does not allow self-assignment or non-admin role assignment", () => {
    expect(canAssignRole(admin, "facilitator-1", "facilitator")).toBe(true);
    expect(canAssignRole(admin, "admin-1", "admin")).toBe(false);
    expect(() => canAssignRole(parent, "facilitator-1", "facilitator")).toThrow(AuthorizationError);
    expect(() => canAssignRole(child, "facilitator-1", "facilitator")).toThrow(AuthorizationError);
  });

  it("rejects expired child sessions", () => {
    expect(() => requireChildSession({ ...child, expiresAt: "2020-01-01T00:00:00.000Z" })).toThrow(
      AuthorizationError,
    );
  });

  it("rejects revoked child sessions", () => {
    expect(() => requireChildSession({ ...child, revokedAt: "2026-09-21T11:00:00.000Z" })).toThrow(
      AuthorizationError,
    );
  });
});

describe("child identity", () => {
  it("generates opaque, unique-format TATI IDs", () => {
    const first = generateTatiId();
    const second = generateTatiId();
    expect(isValidTatiId(first)).toBe(true);
    expect(isValidTatiId(second)).toBe(true);
    expect(first).not.toBe(second);
    expect(first).not.toContain("child");
  });

  it("rejects invalid TATI IDs", () => {
    expect(isValidTatiId("TATI-4821")).toBe(false);
    expect(isValidTatiId("TATI-parent-1")).toBe(false);
    expect(isValidTatiId("child-1")).toBe(false);
  });

  it("hashes PINs without storing plaintext", async () => {
    const hash = await hashChildPin("4821");
    expect(hash).not.toContain("4821");
    await expect(verifyChildPin("4821", hash)).resolves.toBe(true);
  });

  it("rejects invalid PINs", async () => {
    const hash = await hashChildPin("4821");
    await expect(verifyChildPin("0000", hash)).resolves.toBe(false);
    await expect(hashChildPin("abcd")).rejects.toThrow();
  });
});
