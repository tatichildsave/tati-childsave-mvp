import { createFileRoute, redirect } from "@tanstack/react-router";

// /academy has no page of its own; send facilitators to their dashboard.
export const Route = createFileRoute("/academy/")({
  beforeLoad: () => {
    throw redirect({ to: "/academy/dashboard", replace: true });
  },
});
