/**
 * Timestamp Normalization Tests (Phase 7C4A Security Correction)
 *
 * Validates strict, type-safe Timestamp handling for child sessions.
 * Ensures:
 * - Valid Firestore Timestamp objects convert correctly to ISO strings
 * - Valid Date objects convert correctly to ISO strings
 * - Valid ISO strings remain unchanged
 * - Invalid timestamps are rejected
 * - Valid sessions work end-to-end
 *
 * Security: Ensures no `any` type assertions and no silent fallbacks to current time.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes, createHash } from "crypto";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import { getAuthenticatedChild } from "@/lib/auth/child-session.server";
import { AuthorizationError } from "@/lib/auth/authorization.server";

// Mock HTTP-only session cookie
vi.mock("@tanstack/react-start/server", async () => {
  const actual = await vi.importActual("@tanstack/react-start/server");
  return {
    ...actual,
    getCookie: vi.fn(),
  };
});

describe("Timestamp Normalization (Phase 7C4A Security Correction)", () => {
  const db = getFirebaseAdminDb();
  const familyId = "test-family-ts";
  const childId = "test-child-ts";

  beforeAll(async () => {
    process.env["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080";

    // Set up test data
    await db.collection("childCredentials").doc("tati-test-ts").set({
      childId,
      familyId,
      tatiId: "TATI-TSNORM",
    });

    await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .set({
        tatiId: "TATI-TSNORM",
        name: "Timestamp Test",
        age: 10,
        avatar: "avatar-5",
        tier: "basic",
        curriculumLevel: 1,
      });
  });

  afterEach(async () => {
    const sessions = await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("sessions")
      .get();

    for (const doc of sessions.docs) {
      await doc.ref.delete();
    }
  });

  afterAll(async () => {
    await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .delete();
    await db.collection("childCredentials").doc("tati-test-ts").delete();
  });

  it("converts Firestore Timestamp objects to ISO strings", async () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Firestore Admin SDK converts Date objects to Timestamps automatically
    await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("sessions")
      .add({
        tokenHash,
        childProfileId: childId,
        createdAt: now,
        expiresAt: expiresAt,
        revokedAt: null,
      });

    vi.mocked(getCookie).mockReturnValue(token);
    const context = await getAuthenticatedChild();

    expect(context).toBeDefined();
    expect(typeof context?.session.createdAt).toBe("string");
    expect(typeof context?.session.expiresAt).toBe("string");
    expect(context?.session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(context?.session.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("accepts ISO date strings unchanged", async () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const isoCreated = now.toISOString();
    const isoExpires = expiresAt.toISOString();

    await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("sessions")
      .add({
        tokenHash,
        childProfileId: childId,
        createdAt: isoCreated,
        expiresAt: isoExpires,
        revokedAt: null,
      });

    vi.mocked(getCookie).mockReturnValue(token);
    const context = await getAuthenticatedChild();

    expect(context?.session.createdAt).toBe(isoCreated);
    expect(context?.session.expiresAt).toBe(isoExpires);
  });

  it("rejects invalid ISO string timestamps", async () => {
    const now = new Date();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("sessions")
      .add({
        tokenHash,
        childProfileId: childId,
        createdAt: now,
        expiresAt: "invalid-date-string",
        revokedAt: null,
      });

    vi.mocked(getCookie).mockReturnValue(token);

    // Should throw AuthorizationError for invalid timestamp
    await expect(getAuthenticatedChild()).rejects.toThrow(AuthorizationError);
  });

  it("rejects undefined expiresAt field", async () => {
    const now = new Date();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("sessions")
      .add({
        tokenHash,
        childProfileId: childId,
        createdAt: now,
        // expiresAt intentionally missing
        revokedAt: null,
      });

    vi.mocked(getCookie).mockReturnValue(token);

    // Should throw AuthorizationError when normalizing undefined value
    await expect(getAuthenticatedChild()).rejects.toThrow(AuthorizationError);
  });

  it("accepts valid sessions with proper timestamps end-to-end", async () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await db
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childId)
      .collection("sessions")
      .add({
        tokenHash,
        childProfileId: childId,
        createdAt: now,
        expiresAt: expiresAt,
        revokedAt: null,
      });

    vi.mocked(getCookie).mockReturnValue(token);
    const context = await getAuthenticatedChild();

    expect(context).toBeDefined();
    expect(context?.session.kind).toBe("child");
    expect(context?.session.childId).toBe(childId);

    // Verify timestamps are ISO strings
    expect(typeof context?.session.createdAt).toBe("string");
    expect(typeof context?.session.expiresAt).toBe("string");

    // Verify timestamps are valid dates
    const createdDate = new Date(context!.session.createdAt);
    const expiresDate = new Date(context!.session.expiresAt);
    expect(createdDate.getTime()).toBeCloseTo(now.getTime(), -2);
    expect(expiresDate.getTime()).toBeGreaterThan(Date.now());
  });
});
