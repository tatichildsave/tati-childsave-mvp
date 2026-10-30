import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AssessmentDefinition } from "@/lib/assessment/types";
import { AssessmentRunner } from "./AssessmentRunner";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) =>
    createElement("a", { ...props, href: to }, children),
}));

const definition: AssessmentDefinition = {
  id: "save-pre",
  trackId: "save",
  assessmentType: "pre",
  title: "Money Check-In",
  shortTitle: "Check-In",
  intro: "Let's begin.",
  outro: "Great effort!",
  showScoreToChild: false,
  estimatedMinutes: 3,
  questions: [
    {
      id: "q1",
      assessmentType: "pre",
      competency: "saving",
      question: "You get GH₵10. What do you do first?",
      options: [
        { id: "a", label: "Save some first" },
        { id: "b", label: "Spend all now" },
      ],
      feedback: "Thanks for sharing your thinking.",
    },
  ],
};

describe("assessment runner child journey variant", () => {
  it("renders learner-space header and continue label in child mode", () => {
    const html = renderToStaticMarkup(
      <AssessmentRunner
        definition={definition}
        backTo="/child/learn"
        onComplete={() => {}}
        completeLabel="Continue my journey"
        childJourney
      />,
    );
    expect(html).toContain("TATI Learner Space");
    expect(html).toContain("Welcome • No Wrong Answers");
  });
});
