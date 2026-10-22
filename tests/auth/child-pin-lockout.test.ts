/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Child PIN lockout and child profile compatibility tests (Phase 0).
 *
 * Runs against an in-memory Firestore stand-in. No Firebase project or
 * emulator is contacted, so production data cannot be touched.
 *
 * The stand-in serialises transactions, which mirrors how Firestore resolves
 * contention, so the concurrency test exercises the real reservation logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const fake = vi.hoisted(() => {
  type Data = Record<string, unknown>;
  const store = new Map<string, Data>();

  function makeRef(path: string): any {
    return {
      path,
      get: async () => {
        const data = store.get(path);
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
      },
      set: async (data: Data) => {
        store.set(path, { ...data });
      },
      update: async (data: Data) => {
        const existing = store.get(path);
        if (!existing) throw new Error(`NOT_FOUND: ${path}`);
        store.set(path, { ...existing, ...data });
      },
      collection: (name: string) => collectionAt(`${path}/${name}`),
    };
  }

  function collectionAt(path: string): any {
    return { doc: (id: string) => makeRef(`${path}/${id}`) };
  }

  let queue: Promise<unknown> = Promise.resolve();

  function runTransaction(fn: (tx: any) => Promise<unknown>): Promise<unknown> {
    const run = queue.then(async () => {
      const pendingWrites: Array<() => Promise<void>> = [];
      const tx = {
        get: (ref: any) => ref.get(),
        update: (ref: any, data: Data) => {
          pendingWrites.push(() => ref.update(data));
        },
      };
      const result = await fn(tx);
      for (const write of pendingWrites) await write();
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  const db = { collection: (name: string) => collectionAt(name), runTransaction };
  return { store, db };
});

vi.mock("@/integrations/firebase/admin.server", () => ({
  getFirebaseAdminDb: () => fake.db,
}));

import {
  generateTatiId,
  hashChildPin,
  loadChildProfile,
  saveChildPin,
  verifyChildCredential,
} from "@/lib/auth/child-auth-firebase.server";
import { updateCredentialPin } from "@/lib/backend/provisioning.server";

const CHILD_ID = "child-1";
const FAMILY_ID = "family-1";
const PIN = "4821";
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function credential(tatiId: string): Record<string, unknown> | undefined {
  return fake.store.get(`childCredentials/${tatiId}`);
}

async function enrolChild(): Promise<string> {
  const tatiId = generateTatiId();
  await saveChildPin(CHILD_ID, tatiId, FAMILY_ID, PIN);
  return tatiId;
}

beforeEach(() => {
  fake.store.clear();
});

describe("child PIN lockout", () => {
  it("keeps the account open below the threshold and clears the counter on success", async () => {
    const tatiId = await enrolChild();

    for (let i = 0; i < 4; i++) {
      expect(await verifyChildCredential(tatiId, "0000")).toEqual({ status: "invalid" });
    }
    expect(credential(tatiId)?.failedAttempts).toBe(4);
    expect(credential(tatiId)?.lockedUntil).toBeNull();

    expect(await verifyChildCredential(tatiId, PIN)).toEqual({ status: "ok", childId: CHILD_ID });
    expect(credential(tatiId)?.failedAttempts).toBe(0);
  });

  it("locks for 15 minutes after the fifth failure, including for the correct PIN", async () => {
    const tatiId = await enrolChild();

    for (let i = 0; i < 5; i++) {
      expect(await verifyChildCredential(tatiId, "0000")).toEqual({ status: "invalid" });
    }

    const result = await verifyChildCredential(tatiId, PIN);
    expect(result.status).toBe("locked");
    if (result.status !== "locked") throw new Error("expected a locked result");

    const remainingMs = Date.parse(result.retryAt) - Date.now();
    expect(remainingMs).toBeGreaterThan(FIFTEEN_MINUTES_MS - 10_000);
    expect(remainingMs).toBeLessThanOrEqual(FIFTEEN_MINUTES_MS);
  });

  it("allows at most five verifications when guesses arrive concurrently", async () => {
    const tatiId = await enrolChild();

    const results = await Promise.all(
      Array.from({ length: 20 }, () => verifyChildCredential(tatiId, "0000")),
    );

    const invalid = results.filter((r) => r.status === "invalid");
    const locked = results.filter((r) => r.status === "locked");
    expect(invalid).toHaveLength(5);
    expect(locked).toHaveLength(15);
    expect(credential(tatiId)?.failedAttempts).toBe(5);
  });

  it("reopens after the lock expires and resets the counter on a correct PIN", async () => {
    const tatiId = await enrolChild();
    for (let i = 0; i < 5; i++) await verifyChildCredential(tatiId, "0000");

    // Simulate the lock window elapsing without waiting 15 minutes.
    fake.store.set(`childCredentials/${tatiId}`, {
      ...credential(tatiId),
      lockedUntil: new Date(Date.now() - 1000).toISOString(),
    });

    expect(await verifyChildCredential(tatiId, PIN)).toEqual({ status: "ok", childId: CHILD_ID });
    expect(credential(tatiId)?.failedAttempts).toBe(0);
    expect(credential(tatiId)?.lockedUntil).toBeNull();
  });

  it("does not count attempts for unknown, malformed or revoked credentials", async () => {
    expect(await verifyChildCredential("TATI-00000000", PIN)).toEqual({ status: "invalid" });
    expect(await verifyChildCredential("not-a-tati-id", PIN)).toEqual({ status: "invalid" });
    expect(await verifyChildCredential("TATI-ABCDEF01", "12")).toEqual({ status: "invalid" });
    expect(fake.store.size).toBe(0);

    const tatiId = await enrolChild();
    fake.store.set(`childCredentials/${tatiId}`, {
      ...credential(tatiId),
      revokedAt: new Date().toISOString(),
    });

    expect(await verifyChildCredential(tatiId, PIN)).toEqual({ status: "invalid" });
    expect(credential(tatiId)?.failedAttempts).toBe(0);
  });

  it("clears an active lockout when an administrator resets the PIN", async () => {
    const tatiId = await enrolChild();
    for (let i = 0; i < 5; i++) await verifyChildCredential(tatiId, "0000");
    expect((await verifyChildCredential(tatiId, PIN)).status).toBe("locked");

    await updateCredentialPin(tatiId, await hashChildPin("9753"));

    expect(credential(tatiId)?.failedAttempts).toBe(0);
    expect(credential(tatiId)?.lockedUntil).toBeNull();
    expect(await verifyChildCredential(tatiId, "9753")).toEqual({
      status: "ok",
      childId: CHILD_ID,
    });
  });
});

describe("tati_id / tatiId compatibility", () => {
  it("exposes a tati_id written by parent-portal flows as tatiId", async () => {
    fake.store.set(`families/${FAMILY_ID}/children/${CHILD_ID}`, {
      name: "Ama",
      tati_id: "TATI-ABCDEF01",
    });

    const profile = await loadChildProfile(CHILD_ID, FAMILY_ID);

    expect(profile).toMatchObject({ tatiId: "TATI-ABCDEF01", tati_id: "TATI-ABCDEF01" });
  });

  it("keeps an existing tatiId untouched", async () => {
    fake.store.set(`families/${FAMILY_ID}/children/${CHILD_ID}`, {
      name: "Ama",
      tatiId: "TATI-11111111",
      tati_id: "TATI-22222222",
    });

    const profile = await loadChildProfile(CHILD_ID, FAMILY_ID);

    expect(profile).toMatchObject({ tatiId: "TATI-11111111" });
  });

  it("does not write a migration back to Firestore", async () => {
    fake.store.set(`families/${FAMILY_ID}/children/${CHILD_ID}`, { tati_id: "TATI-ABCDEF01" });

    await loadChildProfile(CHILD_ID, FAMILY_ID);

    expect(fake.store.get(`families/${FAMILY_ID}/children/${CHILD_ID}`)).toEqual({
      tati_id: "TATI-ABCDEF01",
    });
  });
});
