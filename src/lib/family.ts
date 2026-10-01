import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { trackEvent } from "@/lib/analytics";
import {
  getFamilyId,
  getFamilyChildren,
  createChildProfile as serverCreateChildProfile,
  updateChildProfile as serverUpdateChildProfile,
  assertChildInFamily as serverAssertChildInFamily,
} from "@/lib/backend/firebase/family.functions";

export interface ChildProfile {
  id: string;
  tati_id: string;
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
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user?.uid) {
    throw new Error("You need to be signed in.");
  }
  return user.uid;
}

/** Returns the family id for the signed-in parent, creating it on first use. */
export async function ensureFamily(): Promise<string> {
  return getFamilyId();
}

export async function assertChildInCurrentFamily(childId: string): Promise<void> {
  await serverAssertChildInFamily({ data: { childId } });
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      return new Promise((resolve) => {
        const auth = getFirebaseAuth();
        if (!auth) {
          resolve(null);
          return;
        }
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
    },
    staleTime: 30_000,
  });
}

export function childProfilesQuery() {
  return {
    queryKey: ["child-profiles"],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ChildProfile[]> => {
      return getFamilyChildren();
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

      const result = await serverCreateChildProfile({
        data: {
          name: safeName,
          age,
          avatar: input.avatar,
          onboardingCompleted: input.onboardingCompleted ?? true,
        },
      });

      void trackEvent("child_profile_created", { childProfileId: result.id, eventKey: result.id });
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-profiles"] }),
  });
}

export function useUpdateChildProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; changes: Partial<ChildProfile> }) => {
      await serverUpdateChildProfile({
        data: {
          id: input.id,
          changes: input.changes,
        },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-profiles"] }),
  });
}
