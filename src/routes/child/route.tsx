import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { BottomNavigation } from "@/components/tati";
import { getChildSession } from "@/lib/auth/child-auth.functions";

export const Route = createFileRoute("/child")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/child/login") return;
    const session = await getChildSession();
    if (!session) throw redirect({ to: "/child/login" });
    return { childSession: session };
  },
  component: ChildLayout,
});

function ChildLayout() {
  return (
    <>
      <Outlet />
      <BottomNavigation />
    </>
  );
}
