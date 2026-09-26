// Single source of truth for everything "how far along is this learner".
// Pure logic: given a track and the stored progress events, it derives lesson
// completion, journey completion, scenario progress, XP, badges, assessment
// completion and competency development. No UI, no database access.
// Components must not recompute any of this on their own.

import { computeGamification } from "@/lib/gamification/engine";
import type { GamificationState } from "@/lib/gamification/types";
import type { ProgressEvent } from "@/lib/learning/progress";
import {
  buildSkillGrowth,
  growthHeadline,
  stillDeveloping,
  strengths,
  type SkillGrowth,
} from "@/lib/learning/growth";
import { buildInsights } from "@/lib/learning/insights";
import {
  conversationStarters,
  journeySnapshot,
  skillSentence,
  type JourneySnapshot,
} from "@/lib/learning/parent-insights";
import { itemPath, itemTitle } from "@/lib/learning/track";
import type { Track, TrackItem, TrackItemKind } from "@/lib/learning/types";

export interface ItemProgress {
  item: TrackItem;
  index: number;
  done: boolean;
  current: boolean;
  locked: boolean;
  title: string;
  path: string;
  event?: ProgressEvent;
}

export interface AssessmentProgress {
  preDone: boolean;
  postDone: boolean;
  preEvent?: ProgressEvent;
  postEvent?: ProgressEvent;
  /** The post check-in is unlocked once every other stop is finished. */
  postReady: boolean;
}

export interface CompetencyDevelopment {
  growth: SkillGrowth[];
  strengths: SkillGrowth[];
  stillDeveloping: SkillGrowth[];
  headline: string;
  /** Warm parent-facing sentences about the strongest skills. */
  parentSentences: string[];
}

export interface ProgressSnapshot {
  track: Track;
  events: ProgressEvent[];
  /** Every stop with its done / current / locked state. */
  steps: ItemProgress[];
  journey: JourneySnapshot & {
    complete: boolean;
    savedCedis: number;
    savedPct: number;
    daysToGo: number;
    dayNumber: number;
  };
  currentItem?: TrackItem;
  continuePath: string;
  countsByKind: Record<TrackItemKind, { done: number; total: number }>;
  game: GamificationState;
  assessments: AssessmentProgress;
  competency: CompetencyDevelopment;
  /** Plain-language notes for grown-ups. */
  insights: string[];
  conversationStarters: string[];
}

const KINDS: TrackItemKind[] = ["assessment", "lesson", "scenario", "reflection"];

export function findEvent(events: ProgressEvent[], itemType: string, itemId: string) {
  return events.find((e) => e.item_type === itemType && e.item_id === itemId);
}

export function computeProgressSnapshot(
  track: Track,
  events: ProgressEvent[] | undefined,
  childId: string,
  childName = "Your child",
  today = new Date(),
): ProgressSnapshot {
  const list = events ?? [];
  const eventOf = (item: TrackItem) => findEvent(list, item.kind, item.id);

  const currentIndex = track.sequence.findIndex((item) => !eventOf(item));
  const steps: ItemProgress[] = track.sequence.map((item, index) => {
    const event = eventOf(item);
    return {
      item,
      index,
      done: !!event,
      current: index === currentIndex,
      locked: currentIndex !== -1 && index > currentIndex,
      title: itemTitle(track, item),
      path: itemPath(childId, item),
      ...(event ? { event } : {}),
    };
  });

  const countsByKind = KINDS.reduce(
    (acc, kind) => {
      const of = track.sequence.filter((i) => i.kind === kind);
      acc[kind] = { done: of.filter((i) => !!eventOf(i)).length, total: of.length };
      return acc;
    },
    {} as Record<TrackItemKind, { done: number; total: number }>,
  );

  const base = journeySnapshot(track, list);
  const game = computeGamification(track, list, today);

  const goal = track.goal;
  const target = goal?.target ?? 80;
  const daysTotal = goal?.daysTotal ?? 14;
  const savedCedis = steps.reduce((sum, s) => sum + (s.done ? (s.item.reward ?? 0) : 0), 0);
  const doneCount = steps.filter((s) => s.done).length;

  const preEvent = findEvent(list, "assessment", "save-pre");
  const postEvent = findEvent(list, "assessment", "save-post");
  const otherStopsDone = track.sequence
    .filter((i) => !(i.kind === "assessment" && i.id === "save-post"))
    .every((i) => !!eventOf(i));

  const growth = buildSkillGrowth(preEvent, postEvent);
  const strong = strengths(growth, 4);

  const currentItem = currentIndex === -1 ? undefined : track.sequence[currentIndex];

  return {
    track,
    events: list,
    steps,
    journey: {
      ...base,
      complete: game.journeyComplete,
      savedCedis,
      savedPct: Math.min(100, Math.round((savedCedis / target) * 100)),
      dayNumber: Math.min(daysTotal, doneCount + 1),
      daysToGo: Math.max(0, daysTotal - doneCount),
    },
    ...(currentItem ? { currentItem } : {}),
    continuePath: currentItem ? itemPath(childId, currentItem) : `/learn/${childId}`,
    countsByKind,
    game,
    assessments: {
      preDone: !!preEvent,
      postDone: !!postEvent,
      ...(preEvent ? { preEvent } : {}),
      ...(postEvent ? { postEvent } : {}),
      postReady: otherStopsDone,
    },
    competency: {
      growth,
      strengths: strong,
      stillDeveloping: stillDeveloping(growth, 3),
      headline: growthHeadline(growth, childName),
      parentSentences: strong.slice(0, 3).map((s) => skillSentence(childName, s)),
    },
    insights: buildInsights(track, list),
    conversationStarters: conversationStarters(childName, track, list, growth),
  };
}
