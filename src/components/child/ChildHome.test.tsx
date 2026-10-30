import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: {
    data: null as unknown,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  learning: {
    data: null as unknown,
    snapshot: null as unknown,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({
    to,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) =>
    createElement("a", { ...props, href: to }, children),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => state.session,
  useQueryClient: () => ({ clear: vi.fn() }),
}));
vi.mock("@/lib/auth/use-child-learning", () => ({
  useChildLearning: () => state.learning,
}));
vi.mock("@/lib/auth/child-auth.functions", () => ({
  childLogout: vi.fn(),
  getChildSession: vi.fn(),
}));
vi.mock("./ChildDashboard", () => ({
  ChildDashboard: () => <div>Dashboard loaded</div>,
}));

import { ChildHome } from "./ChildHome";

describe("child home query states", () => {
  beforeEach(() => {
    state.session = { data: null, isLoading: false, isError: false, refetch: vi.fn() };
    state.learning = {
      data: null,
      snapshot: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it("announces loading while either request is pending", () => {
    state.session.isLoading = true;
    const html = renderToStaticMarkup(<ChildHome />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Opening your adventure");
  });

  it("shows a retryable error even when data is missing", () => {
    state.learning.isError = true;
    const html = renderToStaticMarkup(<ChildHome />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Your adventure didn&#x27;t load");
    expect(html).toContain("Try again");
    expect(html).not.toContain("Opening your adventure");
  });

  it("offers sign-in when the session has expired", () => {
    const html = renderToStaticMarkup(<ChildHome />);
    expect(html).toContain("Your session has ended");
    expect(html).toContain('href="/child/login"');
  });

  it("shows an explicit error for missing learning data", () => {
    state.session.data = { profile: { name: "Ama", avatar: "ama" } };
    const html = renderToStaticMarkup(<ChildHome />);
    expect(html).toContain("Try again");
  });

  it("renders the dashboard once both requests succeed", () => {
    state.session.data = { profile: { name: "Ama", avatar: "ama" } };
    state.learning.data = {};
    state.learning.snapshot = {};
    expect(renderToStaticMarkup(<ChildHome />)).toContain("Dashboard loaded");
  });
});
