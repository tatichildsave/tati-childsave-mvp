import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BadgeState } from "@/lib/gamification/types";
import {
  achievementsKey,
  achievementsQuery,
  awardAchievements,
  markCelebrated,
} from "@/lib/gamification/achievements";
import { celebrateBadge } from "./celebrate";

const JOURNEY_ACHIEVEMENT = "journey-complete";

/**
 * Announces newly earned badges once each (subtle toast) and reports whether the
 * one big journey celebration is still owed. Earned badges are saved in the
 * backend, so a refresh or another device never re-announces them.
 */
export function useBadgeCelebrations(
  childId: string,
  badges: BadgeState[],
  journeyComplete: boolean,
) {
  const qc = useQueryClient();
  const { data: awarded } = useQuery(achievementsQuery(childId));
  const [showJourneyCelebration, setShowJourneyCelebration] = useState(false);

  const earnedIds = badges
    .filter((b) => b.earned)
    .map((b) => b.definition.id)
    .join(",");

  useEffect(() => {
    if (!childId || !awarded || earnedIds === "") return;
    const current = earnedIds.split(",");
    const known = new Set(awarded.map((a) => a.achievementId));
    const fresh = current.filter((id) => !known.has(id));
    if (fresh.length === 0) return;

    const firstSync = awarded.length === 0;
    void awardAchievements(childId, fresh).then(() => {
      // A brand-new learner record is a catch-up save, not a moment to celebrate.
      if (!firstSync) {
        for (const id of fresh) {
          const badge = badges.find((b) => b.definition.id === id);
          if (badge)
            celebrateBadge(badge.definition.icon, badge.definition.name, badge.definition.blurb);
        }
      }
      void markCelebrated(childId, fresh);
      void qc.invalidateQueries({ queryKey: achievementsKey(childId) });
    });
    // badges is derived from earnedIds; keeping it out avoids re-announcing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, earnedIds, awarded, qc]);

  useEffect(() => {
    if (!childId || !journeyComplete || !awarded) return;
    if (awarded.some((a) => a.achievementId === JOURNEY_ACHIEVEMENT)) return;
    setShowJourneyCelebration(true);
  }, [childId, journeyComplete, awarded]);

  function dismissJourneyCelebration() {
    setShowJourneyCelebration(false);
    void awardAchievements(childId, [JOURNEY_ACHIEVEMENT]).then(() => {
      void markCelebrated(childId, [JOURNEY_ACHIEVEMENT]);
      void qc.invalidateQueries({ queryKey: achievementsKey(childId) });
    });
  }

  return { showJourneyCelebration, dismissJourneyCelebration };
}
