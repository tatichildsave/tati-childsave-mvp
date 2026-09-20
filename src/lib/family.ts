import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export interface ChildProfile {
  id: string;
  family_id: string;
  created_by: string;
  name: string;
  age: number;
  avatar: string;
  tier: string;
  curriculum_level: string | null;
  onboarding_step: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You need to be signed in.");
  return data.user.id;
}

/** Returns the family id for the signed-in parent, creating it on first use. */
export async function ensureFamily(): Promise<string> {
  const userId = await getCurrentUserId();

  const { data: membership, error: readError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (readError) throw readError;
  if (membership?.family_id) return membership.family_id;

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ created_by: userId })
    .select("id")
    .single();
  if (familyError) throw familyError;

  const { error: memberError } = await supabase
    .from("family_members")
    .insert({ family_id: family.id, user_id: userId, role: "parent" });
  if (memberError) throw memberError;

  return family.id;
}

export async function assertChildInCurrentFamily(childId: string): Promise<void> {
  const familyId = await ensureFamily();
  const { data, error } = await supabase
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("That learner is not part of your family.");
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
    staleTime: 30_000,
  });
}

export function childProfilesQuery() {
  return {
    queryKey: ["child-profiles"],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ChildProfile[]> => {
      const familyId = await ensureFamily();
      const { data, error } = await supabase
        .from("child_profiles")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChildProfile[];
    },
  };
}

export function useChildProfiles() {
  return useQuery(childProfilesQuery());
}

export function useChildProfile(childId: string) {
  const q = useChildProfiles();
  return { ...q, child: q.data?.find((c) => c.id === childId) };
}

export interface CreateChildInput {
  name: string;
  age: number;
  avatar: string;
  onboardingCompleted?: boolean;
}

export function useCreateChildProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateChildInput): Promise<ChildProfile> => {
      const userId = await getCurrentUserId();
      const familyId = await ensureFamily();
      const safeName = input.name.trim();
      const age = Number(input.age);

      if (!safeName) throw new Error("Please enter your child's name.");
      if (safeName.length < 2 || safeName.length > 30) {
        throw new Error("Your child's name should be between 2 and 30 characters.");
      }
      if (!/^[\p{L}\p{M}][\p{L}\p{M}'\-. ]*$/u.test(safeName)) {
        throw new Error("Use letters, spaces, apostrophes, hyphens, or periods only.");
      }
      if (!Number.isInteger(age) || age < 8 || age > 12) {
        throw new Error("Child age must be between 8 and 12 years old.");
      }

      const { data, error } = await supabase
        .from("child_profiles")
        .insert({
          family_id: familyId,
          created_by: userId,
          name: safeName,
          age,
          avatar: input.avatar,
          curriculum_level: `Primary ${Math.max(1, age - 5)}`,
          onboarding_step: 0,
          onboarding_completed: input.onboardingCompleted ?? true,
        })
        .select("*")
        .single();
      if (error) throw error;
      void trackEvent("child_profile_created", { childProfileId: data.id, eventKey: data.id });
      return data as ChildProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-profiles"] }),
  });
}

export function useUpdateChildProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; changes: Partial<ChildProfile> }) => {
      const { error } = await supabase
        .from("child_profiles")
        .update(input.changes)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-profiles"] }),
  });
}
