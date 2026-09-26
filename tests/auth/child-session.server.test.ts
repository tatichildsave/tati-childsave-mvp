/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Child Session Service Tests (Phase G3)
 *
 * Tests for:
 * - requireAuthenticatedChild() and requireAuthenticatedChildResource()
 * - Security boundaries (child crossing, family crossing)
 * - Context validation
 * - Expiration and revocation checks
 */

import { describe, it, expect } from "vitest";
import {
  requireAuthenticatedChild,
  requireAuthenticatedChildResource,
  requireAuthenticatedChildFamily,
} from "@/lib/auth/child-session.server";
import { AuthorizationError } from "@/lib/auth/authorization.server";
import type { AuthenticatedChildContext } from "@/lib/auth/authorization.server";

describe("Child Session Service (Phase G3)", () => {
  const mockChildId = "child-uuid-1";
  const mockFamilyId = "family-uuid-a";
  const mockSessionId = "session-uuid-1";

  const mockSession = {
    kind: "child" as const,
    id: mockSessionId,
    child_profile_id: mockChildId,
    childId: mockChildId, // Required for camelCase access in validation
    sessionId: mockSessionId, // Required for camelCase access in validation
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // Required for camelCase access
    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // Added for requireAuthenticatedChild
    revoked_at: null,
    revokedAt: null, // Added for requireAuthenticatedChild
  };

  const mockProfile = {
    id: mockChildId,
    tatiId: "TATI-A1B2C3D4",
    name: "Akosua",
    age: 10,
    avatar: "avatar-2",
    tier: "junior",
    curriculum_level: "gh-junior-2",
    familyId: mockFamilyId,
  };

  describe("requireAuthenticatedChild", () => {
    it("should throw if context is null", () => {
      expect(() => {
        requireAuthenticatedChild(null);
      }).toThrow(AuthorizationError);
    });

    it("should throw if context kind is not child", () => {
      const userContext = {
        kind: "user",
        userId: "user-123",
        roles: ["parent"],
      };

      expect(() => {
        requireAuthenticatedChild(userContext);
      }).toThrow(AuthorizationError);
    });

    it("should throw if session revoked", () => {
      const context: AuthenticatedChildContext = {
        session: {
          ...mockSession,
          revoked_at: new Date().toISOString(),
          revokedAt: new Date().toISOString(),
        },
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      expect(() => {
        requireAuthenticatedChild(context);
      }).toThrow("revoked");
    });

    it("should throw if session expired", () => {
      const context: AuthenticatedChildContext = {
        session: {
          ...mockSession,
          expires_at: new Date(Date.now() - 1000).toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      expect(() => {
        requireAuthenticatedChild(context);
      }).toThrow(/expired/);
    });

    it("should return valid context", () => {
      const context = {
        session: mockSession,
        profile: mockProfile,
      };

      const result = requireAuthenticatedChild(context);

      expect(result).toBeDefined();
      expect((result as any).session).toBeDefined();
      expect((result as any).profile).toBeDefined();
    });

    it("should throw if session child_profile_id mismatch", () => {
      const context: AuthenticatedChildContext = {
        session: mockSession,
        profile: { ...mockProfile, id: "other-child-id" },
        childId: "other-child-id",
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      expect(() => {
        requireAuthenticatedChild(context);
      }).toThrow(/mismatch/);
    });
  });

  describe("requireAuthenticatedChildResource", () => {
    it("should allow access to own resources", () => {
      const context = {
        session: mockSession,
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      const result = requireAuthenticatedChildResource(context, mockChildId);

      expect(result).toBeDefined();
    });

    it("should deny access to other child resources", () => {
      const context = {
        session: mockSession,
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      expect(() => {
        requireAuthenticatedChildResource(context, "other-child-id");
      }).toThrow("cannot access another learner");
    });
  });

  describe("requireAuthenticatedChildFamily", () => {
    it("should allow access to own family resources", () => {
      const context = {
        session: mockSession,
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      const result = requireAuthenticatedChildFamily(context, mockFamilyId);

      expect(result).toBeDefined();
    });

    it("should deny access to other family resources", () => {
      const context = {
        session: mockSession,
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      expect(() => {
        requireAuthenticatedChildFamily(context, "other-family-id");
      }).toThrow("cannot access another family");
    });
  });

  describe("Security: Authorization boundaries", () => {
    it("should prevent child from accessing another child's data (Child A -> Child B)", () => {
      const childAContext = {
        session: mockSession,
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      // Attempt to access Child B's data
      expect(() => {
        requireAuthenticatedChildResource(childAContext, "child-uuid-2");
      }).toThrow();
    });

    it("should prevent child from accessing another family (Child A -> Family B)", () => {
      const childAContext = {
        session: mockSession,
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      // Attempt to access Family B's data
      expect(() => {
        requireAuthenticatedChildFamily(childAContext, "family-uuid-b");
      }).toThrow();
    });

    it("should require valid profile in context object", () => {
      const invalidContext = {
        session: mockSession,
        // Missing: profile
      };

      expect(() => {
        requireAuthenticatedChild(invalidContext);
      }).toThrow(/profile|not found/);
    });
  });

  describe("Regression: Existing ChildSession behavior preserved", () => {
    it("should work with existing requireChildSession use cases", () => {
      // Verify that AuthenticatedChildContext wraps ChildSession correctly
      const context = {
        session: mockSession,
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      // Should be able to validate
      const validated = requireAuthenticatedChild(context);

      // Verify ChildSession is preserved
      expect((validated as any).session.kind).toBe("child");
      expect((validated as any).session.childId).toBe(mockChildId);
      expect((validated as any).session.sessionId).toBe(mockSessionId);
      expect((validated as any).session.revokedAt).toBeNull();
      expect(Date.parse((validated as any).session.expiresAt)).toBeGreaterThan(Date.now());
    });

    it("should provide access to all expected context fields", () => {
      const context = {
        session: mockSession,
        profile: mockProfile,
        childId: mockChildId,
        sessionId: mockSessionId,
        familyId: mockFamilyId,
      };

      const validated = requireAuthenticatedChild(context);

      // Should have all expected properties
      expect((validated as any).childId).toBe(mockChildId);
      expect((validated as any).sessionId).toBe(mockSessionId);
      expect((validated as any).familyId).toBe(mockFamilyId);
      expect((validated as any).profile.name).toBe("Akosua");
      expect((validated as any).session).toBeDefined();
    });
  });
});
