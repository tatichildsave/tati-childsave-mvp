import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ChildLearningData } from "@/lib/auth/child-learning.functions";
import { getTrack } from "@/lib/learning/track";
import type { ProgressEvent } from "@/lib/learning/progress";
import { computeProgressSnapshot } from "@/lib/progress/snapshot";
import { ChildResultsScreen } from "./ChildResultsScreen";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) =>
    createElement("a", { ...props, href: to }, children),
  useRouter: () => ({ history: { back: () => {} } }),
}));

vi.mock("@/components/gamification/CelebrationOverlay", () => ({
  CelebrationOverlay: ({ title, message }: { title: string; message: string }) =>
    createElement("div", { "data-testid": "celebration-overlay" }, `${title} ${message}`),
}));

const track = getTrack("save");

function eventsThrough(count: number): ProgressEvent[] {
  return track.sequence.slice(0, count).map((item, index) => ({
    id: `event-${index}`,
    child_profile_id: "child-1",
    track_id: track.id,
    item_type: item.kind,
    item_id: item.id,
    status: "completed",
    score: null,
    max_score: null,
    details: {},
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }));
}

function renderResults(
  count: number,
  assessments: ChildLearningData["assessments"] = [],
  achievements: ChildLearningData["achievements"] = [],
) {
  const snapshot = computeProgressSnapshot(track, eventsThrough(count), "child-1", "Ama");
  return renderToStaticMarkup(
    <ChildResultsScreen
      snapshot={snapshot}
      profileName="Ama Kofi"
      assessments={assessments}
      achievements={achievements}
    />,
  );
}

describe("child results screen", () => {
  it("renders summary and action links", () => {
    const html = renderResults(3);
    expect(html).toContain("What I learned");
    expect(html).toContain("Nice work, Ama!");
    expect(html).toContain("3 of " + track.sequence.length + " activities complete");
    expect(html).toContain('href="/child/learn"');
    expect(html).toContain('href="/child/progress"');
  });

  it("shows latest assessment score when available", () => {
    const html = renderResults(4, [
      {
        assessment_id: "save-pre",
        assessment_type: "pre",
        points: 7,
        max_points: 10,
        competency_scores: {},
        completed_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(html).toContain("7 of 10 points");
  });

  it("shows check-in guidance when no assessment is available", () => {
    const html = renderResults(1, []);
    expect(html).toContain("Complete a check-in to see your latest learning snapshot.");
  });

  it("shows celebration overlay when a new achievement exists", () => {
    const html = renderResults(
      2,
      [],
      [
        {
          achievement_id: "money-explorer",
          celebrated: true,
          awarded_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    expect(html).toContain("Badge unlocked!");
    expect(html).toContain("money-explorer");
  });
});
