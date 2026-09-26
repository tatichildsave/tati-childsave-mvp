// Earned badges live in the backend (learner_achievements) so they survive a
// refresh or a new device. The badge catalogue itself stays in app data.

import { supabase } from "@/integrations/supabase/client";

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

/** Saves badges the learner has just earned. Existing ones are left untouched. */
export async function awardAchievements(childId: string, achievementIds: string[]): Promise<void> {
  if (achievementIds.length === 0) return;
  await supabase.from("learner_achievements").upsert(
    achievementIds.map((id) => ({ child_profile_id: childId, achievement_id: id })),
    { onConflict: "child_profile_id,achievement_id", ignoreDuplicates: true },
  );
}

/** Marks badges as already celebrated so the toast only ever shows once. */
export async function markCelebrated(childId: string, achievementIds: string[]): Promise<void> {
  if (achievementIds.length === 0) return;
  await supabase
    .from("learner_achievements")
    .update({ celebrated: true })
    .eq("child_profile_id", childId)
    .in("achievement_id", achievementIds);
}
