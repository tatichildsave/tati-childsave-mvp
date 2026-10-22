import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleHelp,
  Home,
  PlayCircle,
  Settings,
  User,
  Users,
} from "lucide-react";
import { WorkspaceShell, type WorkspaceNavItem } from "@/components/parent/ParentShell";
import { getFacilitatorSession, logoutFacilitator } from "@/lib/auth/facilitator-auth.functions";

export type FacilitatorSection =
  | "dashboard"
  | "cohorts"
  | "learners"
  | "schedule"
  | "guide"
  | "start"
  | "history"
  | "profile";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "F";
}

/**
 * TATI Academy chrome for facilitator pages: sidebar, top bar with profile menu,
 * mobile drawer. Items without a destination yet are shown as "Coming soon".
 */
export function FacilitatorWorkspace({
  active,
  title = "TATI Academy",
  subtitle = "Facilitator Dashboard",
  children,
}: {
  active: FacilitatorSection;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const { data: session } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });
  const name = session?.displayName?.trim() || "Facilitator";

  async function handleSignOut() {
    setSigningOut(true);
    await qc.cancelQueries();
    qc.clear();
    await logoutFacilitator();
    navigate({ to: "/academy/login", replace: true });
  }

  const navItems: WorkspaceNavItem[] = [
    { label: "Dashboard", icon: Home, to: "/academy/dashboard", active: active === "dashboard" },
    { label: "My Cohorts", icon: Users, to: "/academy/cohorts", search: { view: "cohorts" }, active: active === "cohorts" },
    { label: "Learners", icon: User, to: "/academy/cohorts", search: { view: "learners" }, active: active === "learners" },
    { label: "Class Schedule", icon: CalendarDays, to: "/academy/schedule", active: active === "schedule" },
    { label: "Session Guide", icon: BookOpen, to: "/academy/session", active: active === "guide" },
    { label: "Start Session", icon: PlayCircle, to: "/academy/session/start", active: active === "start" },
    { label: "Session History", icon: BarChart3, active: active === "history" },
    { label: "My Profile", icon: Settings, to: "/academy/profile", active: active === "profile", dividerBefore: true },
    { label: "Help & Resources", icon: CircleHelp },
  ];

  return (
    <WorkspaceShell
      title={title}
      subtitle={subtitle}
      homeHref="/academy/dashboard"
      roleLabel="Facilitator"
      brandSubtitle="Academy"
      navItems={navItems}
      userName={name}
      userInitials={initialsOf(name)}
      onSignOut={handleSignOut}
      signingOut={signingOut}
      userMenu={[{ label: "My Profile", icon: Settings, to: "/academy/profile" }]}
      variant="academy"
    >
      <div className="mx-auto w-full max-w-[1400px]">{children}</div>
    </WorkspaceShell>
  );
}
