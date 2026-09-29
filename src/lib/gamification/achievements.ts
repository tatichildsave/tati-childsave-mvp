// Earned badges live in the backend (Firebase achievements subcollection) so they survive a
// refresh or a new device. The badge catalogue itself stays in app data.

import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

export interface AwardedAchievement {
  achievementId: string;
  celebrated: boolean;
}

export const achievementsKey = (childId: string) => ["achievements", childId] as const;

export function achievementsQuery(childId: string) {
  return {
    queryKey: achievementsKey(childId),
    queryFn: async (): Promise<AwardedAchievement[]> => {
      const { data, error } = await supabase
        .from("learner_achievements")
        .select("achievement_id, celebrated")
        .eq("child_profile_id", childId);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        achievementId: r.achievement_id,
        celebrated: r.celebrated,
      }));
    },
    staleTime: 30_000,
    enabled: Boolean(childId),
  };
}

/** Saves badges the learner has just earned. Existing ones are left untouched. (H4.B: Firebase version) */
export const awardAchievementsServerFn = createServerFn({ method: "POST" })
  .validator((data: { childId: string; achievementIds: string[] }) => data)
  .handler(async ({ data: { childId, achievementIds } }) => {
    if (achievementIds.length === 0) return { ok: true };

    try {
      console.log(
        `[H4.B] awardAchievementsServerFn: childId=${childId}, achievements=${achievementIds.length}`,
      );

      // H4.B: Import Firebase dependencies here to avoid client bundle issues
      const { getFirebaseAdminDb } = await import("@/integrations/firebase/admin.server");
      const { FirebaseAchievementRepository } = await import("@/lib/backend/firebase/repositories");
      const { getCurrentChildContext } = await import("@/lib/auth/child-session.server");

      const context = await getCurrentChildContext();
      if (!context) {
        throw new Error("Child context required for awarding achievements.");
      }

      const db = getFirebaseAdminDb();
      const achievementRepo = new FirebaseAchievementRepository(db, context.familyId);

      await achievementRepo.awardAchievements(childId, achievementIds);
      console.log(`[H4.B] awardAchievementsServerFn: Successfully awarded`);
      return { ok: true };
    } catch (error) {
      console.error("[H4.B] awardAchievementsServerFn error:", error);
      throw error;
    }
  });

/**
 * Public wrapper for awardAchievements - can be called from client code
 * Internally delegates to server function
 */
export async function awardAchievements(childId: string, achievementIds: string[]): Promise<void> {
  if (achievementIds.length === 0) return;
  await awardAchievementsServerFn({ childId, achievementIds });
}

/** Marks badges as already celebrated so the toast only ever shows once. (H4.B: Firebase version) */
export const markCelebratedServerFn = createServerFn({ method: "POST" })
  .validator((data: { childId: string; achievementIds: string[] }) => data)
  .handler(async ({ data: { childId, achievementIds } }) => {
    if (achievementIds.length === 0) return { ok: true };

    try {
      console.log(
        `[H4.B] markCelebratedServerFn: childId=${childId}, achievements=${achievementIds.length}`,
      );

      // H4.B: Import Firebase dependencies here to avoid client bundle issues
      const { getFirebaseAdminDb } = await import("@/integrations/firebase/admin.server");
      const { FirebaseAchievementRepository } = await import("@/lib/backend/firebase/repositories");
      const { getCurrentChildContext } = await import("@/lib/auth/child-session.server");

      const context = await getCurrentChildContext();
      if (!context) {
        throw new Error("Child context required for marking achievements celebrated.");
      }

      const db = getFirebaseAdminDb();
      const achievementRepo = new FirebaseAchievementRepository(db, context.familyId);

      await achievementRepo.markCelebrated(childId, achievementIds);
      console.log(`[H4.B] markCelebratedServerFn: Successfully marked`);
      return { ok: true };
    } catch (error) {
      console.error("[H4.B] markCelebratedServerFn error:", error);
      throw error;
    }
  });

/**
 * Public wrapper for markCelebrated - can be called from client code
 * Internally delegates to server function
 */
export async function markCelebrated(childId: string, achievementIds: string[]): Promise<void> {
  if (achievementIds.length === 0) return;
  await markCelebratedServerFn({ childId, achievementIds });
}
