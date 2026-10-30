import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getTrack } from "@/lib/learning/track";
import type { ProgressEvent } from "@/lib/learning/progress";
import { computeProgressSnapshot } from "@/lib/progress/snapshot";
import { ChildDashboard } from "./ChildDashboard";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) =>
    createElement("a", { ...props, href: to }, children),
}));

const track = getTrack("save");
const child = { name: "Ama", avatar: "ama" };

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

function renderDashboard(count: number) {
  const snapshot = computeProgressSnapshot(track, eventsThrough(count), "child-1", child.name);
  return renderToStaticMarkup(
    <ChildDashboard
      child={child}
      snapshot={snapshot}
      onSignOut={() => {}}
      signingOut={false}
      signOutError={false}
    />,
  );
}

describe("child dashboard", () => {
  it("uses the first real activity and zero recorded progress for a new learner", () => {
    const html = renderDashboard(0);
    expect(html).toContain("Akwaaba, Ama!");
    expect(html).toContain('href="/child/assessment/save-pre"');
    expect(html).toContain("0 of " + track.sequence.length + " adventures");
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain("Ready to continue");
    expect(html).toContain("Locked");
    expect(html.match(/Continue Adventure/g)).toHaveLength(1);
  });

  it("shows recorded completion, the real next step and earned badges", () => {
    const html = renderDashboard(2);
    expect(html).toContain('href="/child/lesson/set-a-goal"');
    expect(html).toContain("2 of " + track.sequence.length + " adventures");
    expect(html).toContain("Completed");
    expect(html).toContain("Money Explorer");
    expect(html).toContain("<details");
  });

  it("routes scenario and reflection steps to their child routes", () => {
    for (const kind of ["scenario", "reflection"] as const) {
      const index = track.sequence.findIndex((item) => item.kind === kind);
      const item = track.sequence[index];
      expect(item).toBeDefined();
      expect(renderDashboard(index)).toContain(`href="/child/${kind}/${item!.id}"`);
    }
  });

  it("offers results rather than a fabricated next step when complete", () => {
    const html = renderDashboard(track.sequence.length);
    expect(html).toContain("Adventure complete!");
    expect(html).toContain('href="/child/results"');
    expect(html).not.toContain("Continue Adventure");
    expect(html).toContain('aria-valuenow="100"');
  });

  it("shows an empty state without claiming an empty journey is complete", () => {
    const emptyTrack = { ...track, sequence: [] };
    const snapshot = computeProgressSnapshot(emptyTrack, [], "child-1", child.name);
    const html = renderToStaticMarkup(
      <ChildDashboard
        child={child}
        snapshot={snapshot}
        onSignOut={() => {}}
        signingOut={false}
        signOutError={false}
      />,
    );
    expect(html).toContain("There are no adventures to show yet.");
    expect(html).toContain("Your adventure awaits");
    expect(html).not.toContain("Adventure complete!");
  });
});
