import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createChildSession,
  revokeChildSession,
  validateChildSession,
  verifyChildCredential,
} from "./child-identity.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const COOKIE_NAME = "tati_child_session";
const genericFailure = "That TATI ID or PIN could not be verified.";
const loginInput = z.object({
  tatiId: z.string().trim().max(32),
  pin: z.string().regex(/^\d{4,6}$/),
});

type ChildProfile = {
  id: string;
  tati_id: string;
  name: string;
  age: number;
  avatar: string;
  tier: string;
  curriculum_level: string | null;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

async function loadChildProfile(childId: string): Promise<ChildProfile | null> {
  const { data, error } = await (supabaseAdmin as unknown as SupabaseClient)
    .from("child_profiles")
    .select("id, tati_id, name, age, avatar, tier, curriculum_level")
    .eq("id", childId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ChildProfile;
}

export const childLogin = createServerFn({ method: "POST" })
  .validator(loginInput)
  .handler(async ({ data }) => {
    const childId = await verifyChildCredential(data.tatiId, data.pin);
    if (!childId) throw new Error(genericFailure);

    const { token, session } = await createChildSession(childId);
    const profile = await loadChildProfile(childId);
    if (!profile) {
      await revokeChildSession(session.id);
      throw new Error(genericFailure);
    }

    setCookie(COOKIE_NAME, token, cookieOptions(30 * 60));
    return { profile };
  });

export const getChildSession = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;
  const session = await validateChildSession(token);
  if (!session) {
    setCookie(COOKIE_NAME, "", cookieOptions(0));
    return null;
  }
  const profile = await loadChildProfile(session.child_profile_id);
  if (!profile) return null;
  return { profile, sessionId: session.id, expiresAt: session.expires_at };
});

export const childLogout = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(COOKIE_NAME);
  if (token) {
    const session = await validateChildSession(token);
    if (session) await revokeChildSession(session.id);
  }
  setCookie(COOKIE_NAME, "", cookieOptions(0));
  return { ok: true };
});

export { genericFailure };
