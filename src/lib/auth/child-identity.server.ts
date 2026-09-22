import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
const TATI_ID_PATTERN = /^TATI-[A-F0-9]{8}$/;
const PIN_PATTERN = /^\d{4,6}$/;
const SESSION_TTL_MS = 30 * 60 * 1000;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;

type ServerSupabase = SupabaseClient;

type ChildCredentialRow = {
  child_profile_id: string;
  pin_hash: string;
  active: boolean;
  revoked_at: string | null;
};

type ChildSessionRow = {
  id: string;
  child_profile_id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
};

export function generateTatiId(): string {
  return `TATI-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function isValidTatiId(value: string): boolean {
  return TATI_ID_PATTERN.test(value.trim().toUpperCase());
}

export function normalizeTatiId(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!isValidTatiId(normalized)) throw new Error("Invalid TATI ID.");
  return normalized;
}

function validatePin(pin: string): void {
  if (!PIN_PATTERN.test(pin)) throw new Error("PIN must contain 4 to 6 digits.");
}

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

function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function db(): ServerSupabase {
  return supabaseAdmin as unknown as ServerSupabase;
}

export async function saveChildPin(childProfileId: string, pin: string): Promise<void> {
  const pinHash = await hashChildPin(pin);
  const { error } = await db().from("child_credentials").upsert(
    {
      child_profile_id: childProfileId,
      pin_hash: pinHash,
      active: true,
      revoked_at: null,
      rotated_at: new Date().toISOString(),
    },
    { onConflict: "child_profile_id" },
  );
  if (error) throw error;
}

export async function verifyChildCredential(tatiId: string, pin: string): Promise<string | null> {
  if (!isValidTatiId(tatiId) || !PIN_PATTERN.test(pin)) return null;
  const normalizedId = normalizeTatiId(tatiId);
  const { data: child, error: childError } = await db()
    .from("child_profiles")
    .select("id")
    .eq("tati_id", normalizedId)
    .maybeSingle();
  if (childError || !child) return null;

  const { data: credential, error: credentialError } = await db()
    .from("child_credentials")
    .select("child_profile_id, pin_hash, active, revoked_at")
    .eq("child_profile_id", child.id)
    .maybeSingle();
  if (credentialError || !credential) return null;
  const row = credential as ChildCredentialRow;
  if (!row.active || row.revoked_at || !(await verifyChildPin(pin, row.pin_hash))) return null;
  return row.child_profile_id;
}

export async function createChildSession(childProfileId: string) {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_MS);
  const { data, error } = await db()
    .from("child_sessions")
    .insert({
      child_profile_id: childProfileId,
      token_hash: sessionTokenHash(token),
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id, child_profile_id, created_at, expires_at, revoked_at")
    .single();
  if (error) throw error;
  return { token, session: data as ChildSessionRow };
}

export async function validateChildSession(token: string) {
  if (!token || token.length < 32) return null;
  const { data, error } = await db()
    .from("child_sessions")
    .select("id, child_profile_id, created_at, expires_at, revoked_at")
    .eq("token_hash", sessionTokenHash(token))
    .maybeSingle();
  if (error || !data) return null;
  const session = data as ChildSessionRow;
  if (session.revoked_at || Date.parse(session.expires_at) <= Date.now()) return null;
  return { kind: "child" as const, ...session };
}

export async function revokeChildSession(sessionId: string): Promise<void> {
  const { error } = await db()
    .from("child_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);
  if (error) throw error;
}
