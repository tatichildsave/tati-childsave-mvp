// XP and badge rules. Data-driven so new tracks only add rules, never UI code.

import type { BadgeDefinition, RewardTrigger, XpRule } from "./types";

export const XP_RULES: Record<RewardTrigger, XpRule> = {
  lesson: { trigger: "lesson", xp: 20, label: "Lesson finished" },
  reflection: { trigger: "reflection", xp: 15, label: "You paused and thought it through" },
  scenario: { trigger: "scenario", xp: 30, label: "Story chapter navigated" },
  assessment: { trigger: "assessment", xp: 25, label: "Check-in done" },
  journey: { trigger: "journey", xp: 100, label: "Whole journey completed" },
};

export const XP_PER_LEVEL = 100;

const LEVEL_LABELS = [
  "Money Beginner",
  "Money Saver",
  "Goal Builder",
  "Smart Decider",
  "Super Saver",
  "Money Champion",
];

export function levelLabel(level: number): string {
  return LEVEL_LABELS[Math.min(level - 1, LEVEL_LABELS.length - 1)] ?? "Money Saver";
}

const has = (id: string) => (done: Set<string>) => done.has(id);

export const BADGES: BadgeDefinition[] = [
  {
    id: "money-explorer",
    name: "Money Explorer",
    icon: "🧭",
    blurb: "You started your TATI money adventure.",
    hint: "Finish your first check-in and lesson.",
    earnedBy: (c) => c.counts.assessment >= 1 && c.counts.lesson >= 1,
  },
  {
    id: "goal-getter",
    name: "Goal Getter",
    icon: "🎯",
    blurb: "You set a real goal with an amount and a date.",
    hint: "Finish the goal-setting lesson.",
    earnedBy: (c) => has("lesson:set-a-goal")(c.done),
  },
  {
    id: "smart-saver",
    name: "Smart Saver",
    icon: "🐷",
    blurb: "You kept money aside, story after story.",
    hint: "Bank GH₵30 or more across your story chapters.",
    earnedBy: (c) => c.savedCedis >= 30,
  },
  {
    id: "money-tracker",
    name: "Money Tracker",
    icon: "📓",
    blurb: "You know where every cedi went.",
    hint: "Finish the money tracking lesson.",
    earnedBy: (c) => has("lesson:track-money")(c.done),
  },
  {
    id: "thoughtful-spender",
    name: "Thoughtful Spender",
    icon: "🤔",
    blurb: "You pause before you spend.",
    hint: "Finish the needs vs wants and Stop-Think-Choose lessons.",
    earnedBy: (c) =>
      has("lesson:needs-vs-wants")(c.done) && has("lesson:stop-think-choose")(c.done),
  },
  {
    id: "comeback-kid",
    name: "Comeback Kid",
    icon: "🌱",
    blurb: "When plans changed, you adjusted and kept going.",
    hint: "Finish the 'when plans change' lesson and a pause-and-think stop.",
    earnedBy: (c) => has("lesson:when-plans-change")(c.done) && c.counts.reflection >= 1,
  },
  {
    id: "journey-champion",
    name: "Journey Champion",
    icon: "🏅",
    blurb: "You completed the whole SAVE journey.",
    hint: "Clear every stop on your journey map.",
    earnedBy: (c) => c.journeyComplete,
  },
];
