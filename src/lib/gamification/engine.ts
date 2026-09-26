// Pure achievement logic. No UI, no database access.

import type { ProgressEvent } from "@/lib/learning/progress";
import type { Track, TrackItemKind } from "@/lib/learning/types";
import { BADGES, XP_PER_LEVEL, XP_RULES, levelLabel } from "./rules";
import type {
  BadgeContext,
  BadgeState,
  GamificationState,
  RewardTrigger,
  StreakState,
} from "./types";

const KINDS: TrackItemKind[] = ["assessment", "lesson", "scenario", "reflection"];

export function xpFor(trigger: RewardTrigger): number {
  return XP_RULES[trigger].xp;
}

export function rewardLabel(trigger: RewardTrigger): string {
  return XP_RULES[trigger].label;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Streak-ready: distinct active days ending today or yesterday. */
export function computeStreak(events: ProgressEvent[], today = new Date()): StreakState {
  const days = [...new Set(events.map((e) => dayKey(e.created_at)))].sort();
  if (days.length === 0) return { currentDays: 0, longestDays: 0, activeToday: false };

  const dayMs = 86_400_000;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const prev = Date.parse(`${days[i - 1]}T00:00:00Z`);
    const curr = Date.parse(`${days[i]}T00:00:00Z`);
    run = curr - prev === dayMs ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const todayKey = dayKey(today.toISOString());
  const yesterdayKey = dayKey(new Date(today.getTime() - dayMs).toISOString());
  const last = days[days.length - 1]!;
  const current = last === todayKey || last === yesterdayKey ? run : 0;

  return {
    currentDays: current,
    longestDays: longest,
    lastActiveDate: last,
    activeToday: last === todayKey,
  };
}

export function computeGamification(
  track: Track,
  events: ProgressEvent[] | undefined,
  today = new Date(),
): GamificationState {
  const list = events ?? [];
  const done = new Set<string>();
  for (const e of list) done.add(`${e.item_type}:${e.item_id}`);

  const counts = KINDS.reduce(
    (acc, kind) => {
      acc[kind] = track.sequence.filter(
        (i) => i.kind === kind && done.has(`${i.kind}:${i.id}`),
      ).length;
      return acc;
    },
    {} as Record<TrackItemKind, number>,
  );

  const doneSteps = track.sequence.filter((i) => done.has(`${i.kind}:${i.id}`));
  const savedCedis = doneSteps.reduce((sum, i) => sum + (i.reward ?? 0), 0);
  const journeyComplete = doneSteps.length === track.sequence.length && track.sequence.length > 0;

  let xp = doneSteps.reduce((sum, i) => sum + xpFor(i.kind), 0);
  if (journeyComplete) xp += xpFor("journey");

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;

  const ctx: BadgeContext = { done, counts, savedCedis, journeyComplete, events: list, track };
  const badges: BadgeState[] = BADGES.map((definition) => ({
    definition,
    earned: definition.earnedBy(ctx),
  }));

  return {
    xp,
    level,
    levelLabel: levelLabel(level),
    xpIntoLevel,
    xpForLevel: XP_PER_LEVEL,
    levelPct: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
    journey: {
      done: doneSteps.length,
      total: track.sequence.length,
      pct: track.sequence.length ? Math.round((doneSteps.length / track.sequence.length) * 100) : 0,
    },
    badges,
    earnedBadges: badges.filter((b) => b.earned),
    streak: computeStreak(list, today),
    journeyComplete,
  };
}
