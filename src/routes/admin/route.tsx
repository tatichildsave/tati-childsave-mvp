import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { getFirebaseFirestore } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { AuthLoadingShell } from "@/components/tati";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;

    if (!user) {
      throw redirect({ to: "/admin-login" });
    }

    // Check if user has admin role
    const db = getFirebaseFirestore();
    if (db) {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const roles = userDocSnap.data()?.roles as string[] | undefined;
        if (!Array.isArray(roles) || !roles.includes("admin")) {
          throw redirect({ to: "/" });
        }
      } else {
        throw redirect({ to: "/admin-login" });
      }
    }

    return { user };
  },
  pendingComponent: AuthLoadingShell,
  component: () => <Outlet />,
});
