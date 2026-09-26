// Turns stored pre/post assessment results into growth-oriented, child-friendly
// skill pictures. Pure logic — no UI, no database access. Never returns a percentage
// score to show a child; bars are described in words.

import { COMPETENCY_LABELS, type Competency, type CompetencyScore } from "@/lib/assessment/types";
import type { ProgressEvent } from "./progress";

export interface SkillGrowth {
  competency: Competency;
  label: string;
  /** 0–1 from the first check-in, when it exists. */
  before?: number;
  /** 0–1 from the most recent check-in. */
  after: number;
  delta: number;
  /** Plain words for children: no numbers. */
  strength: "growing" | "strong" | "super";
  grew: boolean;
}

export function resultCompetencies(event: ProgressEvent | undefined): CompetencyScore[] {
  const raw = (event?.details as { competencies?: CompetencyScore[] } | undefined)?.competencies;
  return Array.isArray(raw) ? raw : [];
}

function strengthOf(ratio: number): SkillGrowth["strength"] {
  if (ratio >= 0.8) return "super";
  if (ratio >= 0.5) return "strong";
  return "growing";
}

export function buildSkillGrowth(
  preEvent: ProgressEvent | undefined,
  postEvent: ProgressEvent | undefined,
): SkillGrowth[] {
  const pre = resultCompetencies(preEvent);
  const post = resultCompetencies(postEvent);
  const source = post.length > 0 ? post : pre;

  return source.map((c) => {
    const before =
      post.length > 0 ? pre.find((p) => p.competency === c.competency)?.ratio : undefined;
    const after = c.ratio;
    return {
      competency: c.competency,
      label: c.label ?? COMPETENCY_LABELS[c.competency],
      ...(before != null ? { before } : {}),
      after,
      delta: after - (before ?? after),
      strength: strengthOf(after),
      grew: before != null && after > before,
    };
  });
}

/** Skills to celebrate, strongest first. */
export function strengths(growth: SkillGrowth[], limit = 4): SkillGrowth[] {
  return [...growth].sort((a, b) => b.after - a.after || b.delta - a.delta).slice(0, limit);
}

/** Skills still developing, gentlest framing, weakest first. */
export function stillDeveloping(growth: SkillGrowth[], limit = 3): SkillGrowth[] {
  return [...growth]
    .filter((g) => g.after < 0.8)
    .sort((a, b) => a.after - b.after)
    .slice(0, limit);
}

/** One warm headline about the whole journey. Never a percentage. */
export function growthHeadline(growth: SkillGrowth[], childName?: string): string {
  const who = childName ? `${childName}, l` : "L";
  const grewCount = growth.filter((g) => g.grew).length;
  if (grewCount >= 3) return `${who}ook how your money skills have grown! 🌱`;
  if (grewCount > 0) return `${who}ook how your money skills have grown! 🌱`;
  return `${who}ook at everything you practised! 🌱`;
}
