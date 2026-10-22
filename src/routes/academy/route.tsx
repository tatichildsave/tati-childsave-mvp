import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { getUserRoles } from "@/lib/auth/facilitator-auth.functions";
import { AuthLoadingShell } from "@/components/tati";

/** Pages reachable without signing in. */
const PUBLIC_PATHS = new Set(["/academy/login", "/academy/forgot-password", "/academy/reset-password"]);

/**
 * TATI Academy layout guard.
 * - Public pages: login and password recovery.
 * - /academy/admin/*: any signed-in user; school-admin access is enforced by Firestore rules
 *   (canAccessSchool) because school admins are identified by school membership, not a role.
 * - Everything else: signed-in users with the "facilitator" role.
 * UI checks are a convenience; Firestore rules and server functions remain the security boundary.
 */
export const Route = createFileRoute("/academy")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const path = location.pathname.replace(/\/+$/, "") || "/academy";
    if (PUBLIC_PATHS.has(path)) return {};

    const auth = getFirebaseAuth();
    if (!auth) throw redirect({ to: "/academy/login", replace: true });
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) throw redirect({ to: "/academy/login", replace: true });

    if (path.startsWith("/academy/admin")) return { user };

    const roles = await getUserRoles(user.uid);
    if (!roles.includes("facilitator")) throw redirect({ to: "/academy/login", replace: true });

    return { user, roles };
  },
  pendingComponent: AuthLoadingShell,
  component: () => <Outlet />,
});
