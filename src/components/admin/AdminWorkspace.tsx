import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import {
  BarChart3,
  BookOpen,
  Calendar,
  Home,
  Layers,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { clearParentSessionFn } from "@/lib/backend/firebase/family.functions";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/parent/ParentShell";

export type AdminSection = "dashboard" | "families";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "AD";
}

/** Admin chrome shared by the admin dashboard and family management pages. */
export function AdminWorkspace({
  title,
  active,
  children,
}: {
  title: string;
  active: AdminSection;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const user = getFirebaseAuth()?.currentUser;
  const name = user?.displayName?.trim() || user?.email?.split("@")[0] || "Administrator";

  async function handleSignOut() {
    setSigningOut(true);
    await qc.cancelQueries();
    qc.clear();
    try {
      await clearParentSessionFn({ data: undefined });
    } catch (error) {
      console.error("[AdminWorkspace] Error clearing session:", error);
    }
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    navigate({ to: "/admin-login", replace: true });
  }

  const navItems: WorkspaceNavItem[] = [
    { label: "Dashboard", icon: Home, to: "/admin/dashboard-v2", active: active === "dashboard" },
    { label: "Families", icon: Users, to: "/admin/families", active: active === "families" },
    { label: "Learners", icon: BookOpen },
    { label: "Facilitators", icon: UserCheck },
    { label: "Programmes", icon: Layers },
    { label: "Sessions", icon: Calendar },
    { label: "Reports", icon: BarChart3 },
    { label: "Settings", icon: Settings },
  ];

  return (
    <WorkspaceShell
      title={title}
      homeHref="/admin/dashboard-v2"
      roleLabel="Administrator"
      navItems={navItems}
      userName={name}
      userInitials={initialsOf(name)}
      onSignOut={handleSignOut}
      signingOut={signingOut}
    >
      <div className="mx-auto w-full max-w-[1400px]">{children}</div>
    </WorkspaceShell>
  );
}
