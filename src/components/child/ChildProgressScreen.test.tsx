import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ChildLearningData } from "@/lib/auth/child-learning.functions";
import { getTrack } from "@/lib/learning/track";
import type { ProgressEvent } from "@/lib/learning/progress";
import { computeProgressSnapshot } from "@/lib/progress/snapshot";
import { ChildProgressScreen } from "./ChildProgressScreen";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) =>
    createElement("a", { ...props, href: to }, children),
  useRouter: () => ({ history: { back: () => {} } }),
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

function renderProgress(
  count: number,
  achievements: ChildLearningData["achievements"] = [],
  competencies: ChildLearningData["competencies"] = [],
) {
  const snapshot = computeProgressSnapshot(track, eventsThrough(count), "child-1", "Ama");
  return renderToStaticMarkup(
    <ChildProgressScreen
      snapshot={snapshot}
      achievements={achievements}
      competencies={competencies}
    />,
  );
}

describe("child progress screen", () => {
  it("renders real savings and journey progress values", () => {
    const html = renderProgress(3);
    expect(html).toContain("My progress");
    expect(html).toContain("Savings goal");
    expect(html).toContain("GH₵");
    expect(html).toContain("3 of " + track.sequence.length + " journey stops complete");
  });

  it("shows continue action while journey is in progress", () => {
    const html = renderProgress(2);
    expect(html).toContain("Continue Adventure");
    expect(html).toContain('href="/child/lesson/set-a-goal"');
  });

  it("shows results action when journey is complete", () => {
    const html = renderProgress(track.sequence.length);
    expect(html).toContain("Journey complete");
    expect(html).toContain("View my results");
    expect(html).toContain('href="/child/results"');
  });

  it("shows fallback empty states when badges/skills are not yet available", () => {
    const html = renderProgress(0, [], []);
    expect(html).toContain("Complete more adventures to unlock your first badge.");
    expect(html).toContain("Complete learning stops to unlock visible skill progress.");
  });
});
