import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
