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
};

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
  } as ChildCredentialDoc);
}

/**
 * Verify a child's TATI ID and PIN.
 * Returns the childId if verification succeeds, null otherwise.
 *
 * Process:
 * 1. Look up credential by TATI ID in /childCredentials/{tatiId}
 * 2. Verify PIN hash using scrypt
 * 3. Check credential is active and not revoked
 * 4. Return childId if all checks pass
 */
export async function verifyChildCredential(tatiId: string, pin: string): Promise<string | null> {
  console.log(`[verifyChildCredential] Starting: tatiId=${tatiId}, pinLength=${pin.length}`);

  if (!isValidTatiId(tatiId) || !PIN_PATTERN.test(pin)) {
    console.log(`[verifyChildCredential] Format validation failed`);
    return null;
  }

  const normalizedId = normalizeTatiId(tatiId);
  console.log(`[verifyChildCredential] Normalized ID: ${normalizedId}`);

  try {
    const credentialDoc = await db().collection("childCredentials").doc(normalizedId).get();

    if (!credentialDoc.exists) {
      console.log(`[verifyChildCredential] Document not found`);
      return null;
    }

    const credential = credentialDoc.data() as ChildCredentialDoc;
    console.log(
      `[verifyChildCredential] Found credential - childId=${credential.childId}, active=${credential.active}, revoked=${credential.revokedAt ? "yes" : "no"}`,
    );

    // Check if credential is active and not revoked
    if (!credential.active || credential.revokedAt) {
      console.log(`[verifyChildCredential] Credential is inactive or revoked`);
      return null;
    }

    // Verify PIN using timing-safe comparison
    console.log(`[verifyChildCredential] Verifying PIN...`);
    const pinValid = await verifyChildPin(pin, credential.pinHash);
    console.log(`[verifyChildCredential] PIN valid: ${pinValid}`);

    if (!pinValid) return null;

    console.log(`[verifyChildCredential] SUCCESS - returning childId=${credential.childId}`);
    return credential.childId;
  } catch (error) {
    console.error(`[verifyChildCredential] Error:`, error);
    return null;
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
    // Query all sessions to find matching token hash
    // NOTE: This is a collectionGroup query across all families/children
    // It's expensive but unavoidable without storing token→childId mappings
    // In production, consider adding a separate token→session lookup collection
    const snapshot = await db()
      .collectionGroup("sessions")
      .where("tokenHash", "==", tokenHash)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const sessionDoc = snapshot.docs[0];
    const sessionData = sessionDoc.data() as ChildSessionDoc;

    // Check if session is revoked
    if (sessionData.revokedAt) return null;

    // Check if session is expired
    const expiresAt = new Date(sessionData.expiresAt);
    if (expiresAt <= new Date()) return null;

    return { kind: "child" as const, ...sessionData };
  } catch {
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
