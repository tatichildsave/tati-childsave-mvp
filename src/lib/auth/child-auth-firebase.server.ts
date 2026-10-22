/**
 * Firebase-based Child Authentication (Phase H4.A)
 * ================================================
 * Replaces Supabase with Firebase for child identity and session management.
 *
 * Server-only module (*.server.ts) - never imported by client code.
 * All credential operations are performed server-side.
 * Firestore rules deny all client access to credentials and sessions.
 *
 * Architecture:
 * - Credentials stored at: /childCredentials/{tatiId}
 * - Sessions stored at: /families/{familyId}/children/{childId}/sessions/{sessionId}
 * - Child profiles at: /families/{familyId}/children/{childId}
 */

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import type { Timestamp, DocumentData } from "firebase-admin/firestore";

/**
 * Derive a key using scrypt password hashing algorithm.
 * Used for PIN security.
 */
function deriveKey(
  value: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(value, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

// Pattern validation
const TATI_ID_PATTERN = /^TATI-[A-F0-9]{8}$/;
const PIN_PATTERN = /^\d{4,6}$/;

// PIN brute-force protection: lock a TATI ID after consecutive failures
const PIN_MAX_FAILED_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000;

// Session configuration
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Scrypt parameters
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;

/**
 * Type definitions for Firestore documents
 */
type ChildCredentialDoc = {
  tatiId: string;
  childId: string;
  familyId: string;
  pinHash: string;
  active: boolean;
  revokedAt: string | null;
  rotatedAt: string;
  failedAttempts?: number;
  lockedUntil?: string | null;
};

export type ChildCredentialResult =
  | { status: "ok"; childId: string }
  | { status: "invalid" }
  | { status: "locked"; retryAt: string };

type ChildSessionDoc = {
  id: string;
  childProfileId: string;
  tokenHash: string;
  createdAt: Timestamp | Date | string;
  expiresAt: Timestamp | Date | string;
  revokedAt: string | null;
};

type ChildProfileDoc = {
  id: string;
  tatiId: string;
  familyId: string;
  createdBy: string;
  name: string;
  age: number;
  avatar: string;
  tier: string;
  curriculumLevel: string | null;
};

/**
 * Normalize and validate a TATI ID.
 * Format: TATI-XXXXXXXX (8 uppercase hex digits after prefix)
 */
export function isValidTatiId(value: string): boolean {
  return TATI_ID_PATTERN.test(value.trim().toUpperCase());
}

export function normalizeTatiId(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!isValidTatiId(normalized)) throw new Error("Invalid TATI ID.");
  return normalized;
}

/**
 * Validate PIN format.
 * Must be 4-6 digits.
 */
function validatePin(pin: string): void {
  if (!PIN_PATTERN.test(pin)) throw new Error("PIN must contain 4 to 6 digits.");
}

/**
 * Generate a new TATI ID.
 * Format: TATI-XXXXXXXX (8 random hex digits)
 */
export function generateTatiId(): string {
  return `TATI-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Generate a random child PIN.
 * Format: 4-6 random digits
 * Uses randomBytes for cryptographically secure randomness
 */
export function generateChildPin(): string {
  // Generate 4-digit PIN using cryptographically secure randomBytes
  // Generate 2 random bytes and convert to number 0-65535
  const randomValue = randomBytes(2).readUInt16BE(0);
  // Map to 1000-9999 range (4-digit PIN)
  const pin = 1000 + (randomValue % 9000);
  return pin.toString();
}

/**
 * Hash a child's PIN using scrypt.
 * Returns a string with algorithm, cost parameters, salt, and derived key.
 * Format: scrypt$cost$blockSize$parallelization$salt$key
 */
export async function hashChildPin(pin: string): Promise<string> {
  validatePin(pin);
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(pin, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

/**
 * Verify a PIN against its scrypt hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyChildPin(pin: string, encodedHash: string): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) return false;
  const [algorithm, cost, blockSize, parallelization, saltText, keyText] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltText || !keyText) return false;
  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(keyText, "base64url");
  const derivedKey = await deriveKey(pin, salt, expected.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
  });
  return derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected);
}

/**
 * Hash a session token using SHA256.
 * Only the hash is stored in Firestore, not the token itself.
 */
function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Get Firestore admin instance.
 */
function db() {
  return getFirebaseAdminDb();
}

/**
 * Save a child's PIN hash to Firestore.
 * Stored at: /childCredentials/{tatiId}
 *
 * This establishes the TATI ID → Child ID mapping and stores the PIN hash.
 * Server-side only; Firestore rules deny all client access.
 */
export async function saveChildPin(
  childProfileId: string,
  tatiId: string,
  familyId: string,
  pin: string,
): Promise<void> {
  const pinHash = await hashChildPin(pin);
  const normalizedTatiId = normalizeTatiId(tatiId);

  const credentialDoc = db().collection("childCredentials").doc(normalizedTatiId);

  await credentialDoc.set({
    tatiId: normalizedTatiId,
    childId: childProfileId,
    familyId,
    pinHash,
    active: true,
    revokedAt: null,
    rotatedAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null,
  } as ChildCredentialDoc);
}

function toEpochMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

let dummyPinHashPromise: Promise<string> | null = null;

/**
 * Spend the same scrypt work as a real PIN check. Branches that would
 * otherwise return early (unknown, inactive, revoked, locked, errors) call this
 * so response timing does not reveal whether a TATI ID exists or is locked.
 */
async function spendEquivalentPinCheckTime(pin: string): Promise<void> {
  if (!dummyPinHashPromise) dummyPinHashPromise = hashChildPin("0000");
  await verifyChildPin(pin, await dummyPinHashPromise);
}

/**
 * Verify a child's TATI ID and PIN.
 *
 * Failed attempts are counted per TATI ID. Each attempt first reserves a slot
 * inside a Firestore transaction, so parallel guesses cannot exceed the limit.
 * The PIN is then verified outside the transaction (scrypt is slow), and a
 * successful verification resets the counter.
 *
 * Unknown, inactive, revoked and locked IDs do not count as attempts. They
 * return a non-ok status after an equivalent scrypt delay. Callers must show a
 * single generic message for every non-ok status.
 */
export async function verifyChildCredential(
  tatiId: string,
  pin: string,
): Promise<ChildCredentialResult> {
  if (!isValidTatiId(tatiId) || !PIN_PATTERN.test(pin)) return { status: "invalid" };

  const normalizedId = normalizeTatiId(tatiId);
  const credentialRef = db().collection("childCredentials").doc(normalizedId);

  try {
    const reservation = await db().runTransaction(async (tx) => {
      const snapshot = await tx.get(credentialRef);
      if (!snapshot.exists) return { kind: "invalid" as const };

      const credential = snapshot.data() as ChildCredentialDoc;
      if (!credential.active || credential.revokedAt) return { kind: "invalid" as const };

      const now = Date.now();
      const lockedUntilMs = toEpochMs(credential.lockedUntil);
      if (lockedUntilMs > now) {
        return { kind: "locked" as const, retryAt: new Date(lockedUntilMs).toISOString() };
      }

      let failedAttempts = credential.failedAttempts ?? 0;
      if (lockedUntilMs !== 0) failedAttempts = 0; // previous lock has expired

      if (failedAttempts >= PIN_MAX_FAILED_ATTEMPTS) {
        // Counter at the limit without an active lock: lock defensively.
        const retryAt = new Date(now + PIN_LOCKOUT_MS).toISOString();
        tx.update(credentialRef, { failedAttempts, lockedUntil: retryAt });
        return { kind: "locked" as const, retryAt };
      }

      const nextFailedAttempts = failedAttempts + 1;
      const lockedUntil =
        nextFailedAttempts >= PIN_MAX_FAILED_ATTEMPTS
          ? new Date(now + PIN_LOCKOUT_MS).toISOString()
          : null;
      tx.update(credentialRef, { failedAttempts: nextFailedAttempts, lockedUntil });

      return {
        kind: "reserved" as const,
        childId: credential.childId,
        pinHash: credential.pinHash,
      };
    });

    if (reservation.kind === "invalid") {
      await spendEquivalentPinCheckTime(pin);
      return { status: "invalid" };
    }
    if (reservation.kind === "locked") {
      await spendEquivalentPinCheckTime(pin);
      return { status: "locked", retryAt: reservation.retryAt };
    }

    const pinValid = await verifyChildPin(pin, reservation.pinHash);
    if (!pinValid) return { status: "invalid" };

    await credentialRef.update({ failedAttempts: 0, lockedUntil: null });
    return { status: "ok", childId: reservation.childId };
  } catch (error) {
    console.error(
      "[verifyChildCredential] Verification failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    await spendEquivalentPinCheckTime(pin);
    return { status: "invalid" };
  }
}


/**
 * Create a new child session.
 * Stored at: /families/{familyId}/children/{childId}/sessions/{sessionId}
 *
 * Returns:
 * - token: The session token (bearer token, not hashed)
 * - session: The session document metadata
 *
 * The token is sent to the client in an HTTP-only cookie.
 * The token hash is stored in Firestore.
 */
export async function createChildSession(
  childProfileId: string,
  familyId: string,
): Promise<{ token: string; session: ChildSessionDoc }> {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);

  const sessionRef = db()
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childProfileId)
    .collection("sessions")
    .doc();

  const sessionDoc: ChildSessionDoc = {
    id: sessionRef.id,
    childProfileId,
    tokenHash: sessionTokenHash(token),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
  };

  await sessionRef.set(sessionDoc);

  return { token, session: sessionDoc };
}

/**
 * Validate a child's session token.
 * Queries: /families/{familyId}/children/{childId}/sessions
 *
 * Returns the session document if valid, null otherwise.
 *
 * Checks:
 * - Token hash matches
 * - Session not revoked
 * - Session not expired
 */
export async function validateChildSession(
  token: string,
): Promise<(ChildSessionDoc & { kind: "child" }) | null> {
  if (!token || token.length < 32) return null;

  const tokenHash = sessionTokenHash(token);

  try {
    // NOTE: collectionGroup lookup across all children's sessions. It is
    // unavoidable without a token -> session index; see Phase 0 audit notes.
    const snapshot = await db()
      .collectionGroup("sessions")
      .where("tokenHash", "==", tokenHash)
      .limit(1)
      .get();

    const sessionDoc = snapshot.docs[0];
    if (snapshot.empty || !sessionDoc) return null;

    const sessionData = sessionDoc.data() as ChildSessionDoc;

    if (sessionData.revokedAt) return null;

    const expiresAt = new Date(sessionData.expiresAt);
    if (expiresAt <= new Date()) return null;

    return { kind: "child" as const, ...sessionData };
  } catch (err) {
    console.error(
      "[validateChildSession] Validation failed:",
      err instanceof Error ? err.name : "unknown error",
    );
    return null;
  }
}

/**
 * Revoke a child's session.
 * Marks the session as revoked by setting revokedAt timestamp.
 */
export async function revokeChildSession(
  childProfileId: string,
  familyId: string,
  sessionId: string,
): Promise<void> {
  try {
    await db()
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childProfileId)
      .collection("sessions")
      .doc(sessionId)
      .update({
        revokedAt: new Date().toISOString(),
      });
  } catch {
    // Session may not exist; that's ok
  }
}

/**
 * Load a child's profile from Firestore.
 * Stored at: /families/{familyId}/children/{childId}
 *
 * Returns profile document or null if not found.
 */
export async function loadChildProfile(
  childProfileId: string,
  familyId: string,
): Promise<ChildProfileDoc | null> {
  try {
    const childDoc = await db()
      .collection("families")
      .doc(familyId)
      .collection("children")
      .doc(childProfileId)
      .get();

    if (!childDoc.exists) return null;

    const data = childDoc.data();

    // Sanitize Firestore Timestamp objects for serialization
    // Convert any Timestamp fields to ISO strings
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data || {})) {
      if (value && typeof value === "object" && "toDate" in value) {
        // It's a Firestore Timestamp - convert to ISO string
        sanitized[key] = value.toDate().toISOString();
      } else {
        sanitized[key] = value;
      }
    }

    // Parent-portal writes use `tati_id`; admin provisioning uses `tatiId`. No data migration.
    if (!sanitized.tatiId && sanitized.tati_id) sanitized.tatiId = sanitized.tati_id;

    return sanitized as ChildProfileDoc;
  } catch {
    return null;
  }
}

/**
 * Extract familyId and childId from a session.
 * Helper to get routing information from session data.
 */
export function getSessionContext(session: ChildSessionDoc & { kind: "child" }): {
  childId: string;
  familyId?: string;
} {
  return {
    childId: session.childProfileId,
  };
}
