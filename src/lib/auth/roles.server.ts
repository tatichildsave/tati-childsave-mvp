import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  canAssignRole,
  requireAdmin,
  type AppRole,
  type AuthContext,
} from "./authorization.server";

export async function getUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await (supabaseAdmin as unknown as SupabaseClient)
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.role as AppRole);
}

export async function assignRole(
  actor: AuthContext,
  targetUserId: string,
  role: AppRole,
): Promise<void> {
  requireAdmin(actor);
  if (!canAssignRole(actor, targetUserId, role)) {
    throw new Error("Role assignment is not permitted.");
  }

  const { error } = await (supabaseAdmin as unknown as SupabaseClient)
    .from("user_roles")
    .upsert({ user_id: targetUserId, role }, { onConflict: "user_id,role" });
  if (error) throw error;
}

export async function revokeRole(
  actor: AuthContext,
  targetUserId: string,
  role: AppRole,
): Promise<void> {
  requireAdmin(actor);
  if (actor.kind === "user" && actor.userId === targetUserId) {
    throw new Error("An admin cannot revoke their own role through this operation.");
  }

  const { error } = await (supabaseAdmin as unknown as SupabaseClient)
    .from("user_roles")
    .delete()
    .eq("user_id", targetUserId)
    .eq("role", role);
  if (error) throw error;
}
