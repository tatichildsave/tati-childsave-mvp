import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReflectionPrompt } from "@/lib/learning/types";
import { ChildReflectionScreen } from "./ChildReflectionScreen";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) =>
    createElement("a", { ...props, href: to }, children),
  useRouter: () => ({ history: { back: () => {} } }),
}));

const reflection: ReflectionPrompt = {
  id: "test-reflection",
  title: "Pause and think",
  intro: "Think about your choice.",
  question: "What would you do next time?",
  options: [
    { id: "a", label: "Save first", response: "Great thinking." },
    { id: "b", label: "Spend all", response: "What might happen after?" },
  ],
  closing: "Your choices can change your future.",
};

describe("child reflection screen", () => {
  it("renders prompt and answer options", () => {
    const html = renderToStaticMarkup(
      <ChildReflectionScreen
        reflection={reflection}
        choiceId={null}
        saving={false}
        onPick={() => {}}
        onFinish={() => {}}
      />,
    );
    expect(html).toContain("Reflection time");
    expect(html).toContain("What would you do next time?");
    expect(html).toContain("Save first");
    expect(html).toContain("Continue my journey");
  });

  it("shows selected option response", () => {
    const html = renderToStaticMarkup(
      <ChildReflectionScreen
        reflection={reflection}
        choiceId="a"
        saving={false}
        onPick={() => {}}
        onFinish={() => {}}
      />,
    );
    expect(html).toContain("Great thinking.");
    expect(html).toContain("Your choices can change your future.");
  });
});
