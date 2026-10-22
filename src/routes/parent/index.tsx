import { createFileRoute, redirect } from "@tanstack/react-router";

// The parent portal home is the Parent Dashboard V2. Parents cannot add children
// here; children are provisioned by TATI administrators.
export const Route = createFileRoute("/parent/")({
  beforeLoad: () => {
    throw redirect({ to: "/parent/dashboard-v2", replace: true });
  },
});
