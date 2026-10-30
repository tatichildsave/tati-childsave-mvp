import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MiniMission } from "./MiniMission";
import { WelcomePage } from "./WelcomePage";
import {
  INITIAL_MISSION_STATE,
  MISSION_CHOICES,
  findMissionChoice,
  missionReducer,
} from "./mission";
import { WELCOME_ROLES, WELCOME_SPEECH } from "./roles";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) =>
    createElement("a", { ...props, href: to }, children),
}));

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!);
}

describe("welcome roles", () => {
  it("maps each role to its existing authentication route", () => {
    expect(Object.fromEntries(WELCOME_ROLES.map((role) => [role.id, role.to]))).toEqual({
      learner: "/child/login",
      parent: "/login",
      facilitator: "/academy/login",
      admin: "/admin-login",
    });
  });

  it("never offers parent self-registration", () => {
    for (const role of WELCOME_ROLES) {
      expect(role.to).not.toMatch(/register|signup|sign-up/i);
    }
  });

  it("has a welcome message for the Listen feature", () => {
    expect(WELCOME_SPEECH).toContain("TATI ChildSave");
  });
});

describe("welcome page", () => {
  const html = renderToStaticMarkup(<WelcomePage />);

  it("renders the adventure headline and Ghana cedi notation", () => {
    expect(html).toContain("SUPERPOWER!");
    expect(html).toContain("GH₵20");
    expect(html).not.toContain("$");
  });

  it("links every sign-in entrance to the real routes", () => {
    const links = hrefs(html);
    for (const path of ["/child/login", "/login", "/academy/login", "/admin-login"]) {
      expect(links).toContain(path);
    }
    expect(html).toContain('aria-label="Learner sign in. Let&#x27;s make money moves!"');
    expect(html).toContain('aria-label="Admin sign in. Manage the TATI platform."');
  });

  it("starts the adventure at Learner sign in", () => {
    expect(html).toMatch(/href="\/child\/login"[^>]*>(?:(?!<\/a>).)*Start my adventure/s);
  });

  it("keeps quick access to parent, facilitator and admin in the hero", () => {
    const quick = html.slice(html.indexOf('aria-label="Other sign-ins"'));
    expect(quick).toContain('href="/login"');
    expect(quick).toContain('href="/academy/login"');
    expect(quick).toContain('href="/admin-login"');
  });

  it("includes a Listen control and keeps decorations hidden from assistive tech", () => {
    expect(html).toContain("Listen to a welcome message");
    expect(html).toContain("Money Explorer");
    expect(html).toMatch(/aria-hidden="true"[^>]*>[^<]*<span[^>]*>🏆/);
  });

  it("anchors the in-page navigation to existing sections", () => {
    for (const id of ["choose", "how", "mini-mission", "mission-card"]) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`href="#${id}"`);
    }
  });
});

describe("mini mission", () => {
  it("has exactly one successful answer and feedback for every choice", () => {
    expect(MISSION_CHOICES.filter((choice) => choice.outcome === "success")).toHaveLength(1);
    for (const choice of MISSION_CHOICES) {
      expect(choice.feedback.length).toBeGreaterThan(20);
    }
    expect(findMissionChoice("save").outcome).toBe("success");
  });

  it("records an answer, ignores further answers and resets on replay", () => {
    const answered = missionReducer(INITIAL_MISSION_STATE, { type: "choose", choiceId: "treats" });
    expect(answered).toEqual({ status: "answered", choiceId: "treats" });
    expect(missionReducer(answered, { type: "choose", choiceId: "save" })).toBe(answered);
    expect(missionReducer(answered, { type: "replay" })).toEqual(INITIAL_MISSION_STATE);
  });

  it("starts unanswered with all three choices and a practice-only promise", () => {
    const markup = renderToStaticMarkup(<MiniMission />);
    expect(markup).toContain("Save GH₵15, keep GH₵5 for needs");
    expect(markup).toContain("Spend everything on treats");
    expect(markup).toContain("Borrow the rest right away");
    expect(markup).not.toContain("Mission complete");
    expect(markup).not.toContain("Play again");
  });
});
