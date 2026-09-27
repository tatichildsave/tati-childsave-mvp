import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { AuthLoadingShell } from "@/components/tati";

export const Route = createFileRoute("/parent")({
  ssr: false,
  beforeLoad: async () => {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user?.uid) throw redirect({ to: "/login" });
    return { user };
  },
  pendingComponent: AuthLoadingShell,
  component: () => <Outlet />,
});
