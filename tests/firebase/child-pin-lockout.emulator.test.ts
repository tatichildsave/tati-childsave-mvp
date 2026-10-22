/**
 * Child PIN lockout against the Firestore emulator (Phase 0).
 *
 * Runs the real transaction path in child-auth-firebase.server.ts.
 * Requires the emulator: firebase emulators:exec --only auth,firestore --project demo-tati
 * Never point this file at production Firestore.
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import {
  createChildSession,
  generateTatiId,
  hashChildPin,
  saveChildPin,
  validateChildSession,
  verifyChildCredential,
} from "@/lib/auth/child-auth-firebase.server";
import { resetChildPinAndRevokeSessions } from "@/lib/backend/provisioning.server";

const PIN = "4821";
const NEW_PIN = "9753";
const createdTatiIds: string[] = [];

function freshTatiId(): string {
  const tatiId = generateTatiId();
  createdTatiIds.push(tatiId);
  return tatiId;
}

describe("Child PIN lockout (Firestore emulator)", () => {
  beforeAll(() => {
    process.env["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080";
    process.env["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099";
    process.env["FIREBASE_PROJECT_ID"] = "demo-tati";
  });

  afterEach(async () => {
    const db = getFirebaseAdminDb();
    const ids = createdTatiIds.splice(0);
    await Promise.all(ids.map((id) => db.collection("childCredentials").doc(id).delete()));
  });

  it("allows exactly five verifications under 20 concurrent wrong guesses", async () => {
    const tatiId = freshTatiId();
    await saveChildPin("lockout-child-concurrent", tatiId, "lockout-family", PIN);

    const results = await Promise.all(
      Array.from({ length: 20 }, () => verifyChildCredential(tatiId, "0000")),
    );

    expect(results.filter((r) => r.status === "invalid")).toHaveLength(5);
    expect(results.filter((r) => r.status === "locked")).toHaveLength(15);
  }, 60_000);

  it("rejects the correct PIN while the credential is locked", async () => {
    const tatiId = freshTatiId();
    await saveChildPin("lockout-child-locked", tatiId, "lockout-family", PIN);

    for (let i = 0; i < 5; i++) {
      await verifyChildCredential(tatiId, "0000");
    }

    expect((await verifyChildCredential(tatiId, PIN)).status).toBe("locked");
  }, 60_000);

  it("resets the failure counter after a success below the threshold", async () => {
    const tatiId = freshTatiId();
    await saveChildPin("lockout-child-reset", tatiId, "lockout-family", PIN);

    for (let i = 0; i < 4; i++) {
      await verifyChildCredential(tatiId, "0000");
    }
    expect(await verifyChildCredential(tatiId, PIN)).toEqual({
      status: "ok",
      childId: "lockout-child-reset",
    });

    for (let i = 0; i < 4; i++) {
      expect(await verifyChildCredential(tatiId, "0000")).toEqual({ status: "invalid" });
    }
    expect(await verifyChildCredential(tatiId, PIN)).toEqual({
      status: "ok",
      childId: "lockout-child-reset",
    });
  }, 60_000);
});

describe("Admin child PIN reset (Firestore emulator)", () => {
  beforeAll(() => {
    process.env["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080";
    process.env["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099";
    process.env["FIREBASE_PROJECT_ID"] = "demo-tati";
  });

  afterEach(async () => {
    const db = getFirebaseAdminDb();
    const ids = createdTatiIds.splice(0);
    await Promise.all(ids.map((id) => db.collection("childCredentials").doc(id).delete()));
  });

  it("revokes every active child session and replaces the PIN in one commit", async () => {
    const childId = "reset-child-revoke";
    const familyId = "reset-family-revoke";
    const tatiId = freshTatiId();
    await saveChildPin(childId, tatiId, familyId, PIN);
    const first = await createChildSession(childId, familyId);
    const second = await createChildSession(childId, familyId);
    expect(await validateChildSession(first.token)).not.toBeNull();
    expect(await validateChildSession(second.token)).not.toBeNull();

    const result = await resetChildPinAndRevokeSessions(
      childId,
      familyId,
      await hashChildPin(NEW_PIN),
    );

    expect(result).toEqual({ tatiId, revokedSessionCount: 2 });
    expect(await validateChildSession(first.token)).toBeNull();
    expect(await validateChildSession(second.token)).toBeNull();
    expect(await verifyChildCredential(tatiId, PIN)).toEqual({ status: "invalid" });
    expect(await verifyChildCredential(tatiId, NEW_PIN)).toEqual({ status: "ok", childId });
  }, 60_000);

  it("clears an active lockout when the PIN is reset", async () => {
    const childId = "reset-child-lockout";
    const familyId = "reset-family-lockout";
    const tatiId = freshTatiId();
    await saveChildPin(childId, tatiId, familyId, PIN);
    for (let i = 0; i < 5; i++) {
      await verifyChildCredential(tatiId, "0000");
    }
    expect((await verifyChildCredential(tatiId, PIN)).status).toBe("locked");

    await resetChildPinAndRevokeSessions(childId, familyId, await hashChildPin(NEW_PIN));

    expect(await verifyChildCredential(tatiId, NEW_PIN)).toEqual({ status: "ok", childId });
  }, 60_000);

  it("rejects a reset aimed at the wrong family and changes nothing", async () => {
    const childId = "reset-child-wrong-family";
    const familyId = "reset-family-owner";
    const tatiId = freshTatiId();
    await saveChildPin(childId, tatiId, familyId, PIN);
    const { token } = await createChildSession(childId, familyId);

    await expect(
      resetChildPinAndRevokeSessions(childId, "reset-family-other", await hashChildPin(NEW_PIN)),
    ).rejects.toThrow(/Credential not found/);

    expect(await validateChildSession(token)).not.toBeNull();
    expect(await verifyChildCredential(tatiId, PIN)).toEqual({ status: "ok", childId });
  }, 60_000);

  it("rejects a reset for an unknown child and changes nothing", async () => {
    await expect(
      resetChildPinAndRevokeSessions(
        "reset-child-does-not-exist",
        "reset-family-missing",
        await hashChildPin(NEW_PIN),
      ),
    ).rejects.toThrow(/Credential not found/);
  }, 60_000);
});
