import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ChildLoginScreen } from "./ChildLoginScreen";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) =>
    createElement("a", { ...props, href: to }, children),
  useRouter: () => ({ history: { back: () => {} } }),
}));

function renderLogin({
  busy = false,
  error = null,
}: { busy?: boolean; error?: string | null } = {}) {
  return renderToStaticMarkup(
    <ChildLoginScreen
      tatiId={busy ? "TATI-27FD8A72" : ""}
      pin={busy ? "1234" : ""}
      busy={busy}
      error={error}
      onSubmit={(event) => event.preventDefault()}
      onTatiIdChange={() => {}}
      onPinChange={() => {}}
    />,
  );
}

describe("child login screen", () => {
  it("renders learner login form fields and parent link", () => {
    const html = renderLogin();
    expect(html).toContain("Welcome back");
    expect(html).toContain("Your TATI ID");
    expect(html).toContain("Your 4-digit PIN");
    expect(html).toContain('href="/login"');
  });

  it("shows error alert and busy button copy when provided", () => {
    const html = renderLogin({ busy: true, error: "That TATI ID or PIN could not be verified." });
    expect(html).toContain("That TATI ID or PIN could not be verified.");
    expect(html).toContain("Checking…");
  });
});
