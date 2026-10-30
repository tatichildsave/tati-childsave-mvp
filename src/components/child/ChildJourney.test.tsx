import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getTrack } from "@/lib/learning/track";
import type { ProgressEvent } from "@/lib/learning/progress";
import { computeProgressSnapshot } from "@/lib/progress/snapshot";
import { ChildJourney } from "./ChildJourney";

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

function renderJourney(count: number) {
  const snapshot = computeProgressSnapshot(track, eventsThrough(count), "child-1", "Ama");
  return renderToStaticMarkup(<ChildJourney snapshot={snapshot} />);
}

describe("child journey", () => {
  it("shows the real first step and continue action for new learners", () => {
    const html = renderJourney(0);
    expect(html).toContain("My learning journey");
    expect(html).toContain("0 of " + track.sequence.length + " stops finished");
    expect(html).toContain("Continue Adventure");
    expect(html).toContain('href="/child/assessment/save-pre"');
  });

  it("shows completed and locked statuses from snapshot data", () => {
    const html = renderJourney(2);
    expect(html).toContain("Completed");
    expect(html).toContain("Locked");
    expect(html).toContain("Ready now");
  });

  it("routes each track item kind to child routes", () => {
    for (const kind of ["lesson", "scenario", "reflection"] as const) {
      const index = track.sequence.findIndex((item) => item.kind === kind);
      const item = track.sequence[index];
      expect(item).toBeDefined();
      expect(renderJourney(index)).toContain(`href="/child/${kind}/${item!.id}"`);
    }
  });

  it("offers results when every stop is complete", () => {
    const html = renderJourney(track.sequence.length);
    expect(html).toContain("You completed the journey!");
    expect(html).toContain('href="/child/results"');
    expect(html).not.toContain("Continue Adventure");
  });
});
