// Domain types for the reusable TATI lesson engine.
// Lessons are pure data — the LessonPlayer renders any lesson from this shape.

import type { Competency } from "@/lib/assessment/types";

export interface ConceptCard {
  id: string;
  label: string;
  title: string;
  body: string;
  chip?: string;
  icon?: string;
  tone?: "save" | "spend" | "share" | "plan";
  /** Extra detail revealed when the card is tapped. */
  reveal?: string;
}

export interface LessonItem {
  id: string;
  label: string;
  note?: string;
  icon?: string;
  /** GH₵ price, used by sorting activities. */
  price?: number;
  /** True when the item is a need (sort activities). */
  isNeed?: boolean;
}

export type ContentBlock =
  | { type: "text"; body: string }
  | { type: "highlight"; body: string; tone?: "info" | "warn" | "good" }
  | { type: "scene"; imageUrl: string; caption?: string; badge?: string }
  | { type: "cards"; intro?: string; cards: ConceptCard[] }
  | {
      type: "list";
      title: string;
      chip?: string;
      body?: string;
      items: LessonItem[];
      tone?: "good" | "warn";
    }
  | { type: "tip"; title: string; body: string; example?: string }
  | {
      type: "steps";
      steps: { id: string; label: string; title: string; body: string; note?: string }[];
    }
  | { type: "stat"; items: { label: string; value: string; note?: string }[] };

export interface QuickCheck {
  id: string;
  prompt: string;
  chip?: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  feedbackTitle?: string;
  feedback: string;
}

export type Activity =
  | {
      kind: "sort";
      title: string;
      instruction: string;
      helper?: string;
      items: LessonItem[];
      feedbackTitle?: string;
      feedback: string;
    }
  | {
      kind: "allocate";
      title: string;
      instruction: string;
      total: number;
      jars: {
        id: string;
        label: string;
        chip?: string;
        note?: string;
        icon?: string;
        tone: "save" | "spend" | "share";
      }[];
      feedbackTitle?: string;
      feedback: string;
    }
  | {
      kind: "choice";
      title: string;
      instruction: string;
      options: { id: string; label: string; response: string }[];
    };

export interface Lesson {
  id: string;
  track: string;
  title: string;
  subtitle?: string;
  learningObjective: string;
  estimatedMinutes: number;
  illustration?: string;
  illustrationBadge?: string;
  topic?: string;
  contentBlocks: ContentBlock[];
  activity?: Activity;
  knowledgeCheck?: QuickCheck;
  reflection?: { prompt: string; placeholder?: string };
  xpReward: number;
  competencies: Competency[];
  nextLesson?: string;
  ctaLabel?: string;
}
