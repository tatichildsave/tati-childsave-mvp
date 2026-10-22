/**
 * Parent Dashboard V2 — approved premium design (stage 1).
 *
 * Stage 1: sidebar, top navigation, welcome hero and My Children.
 * Data is read only through the existing parent-scoped server functions
 * (getFamilyChildren / getChildJourneyProgress). Parents cannot create or
 * modify children from this page.
 */

import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  Headphones,
  Home,
  Lightbulb,
  Trophy,
  Users,
} from "lucide-react";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { useChildProfiles, useSession } from "@/lib/family";
import { clearParentSessionFn } from "@/lib/backend/firebase/family.functions";
import { ParentShell, type ParentNavItem } from "@/components/parent/ParentShell";
import { ParentHero } from "@/components/parent/ParentHero";
import { MyChildrenCard } from "@/components/parent/MyChildrenCard";

export const Route = createFileRoute("/parent/dashboard-v2")({
  head: () => ({
    meta: [{ title: "Parent Dashboard — TATI ChildSave" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap",
      },
    ],
  }),
  component: ParentDashboardV2,
});

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase() || "P";
}

function ParentDashboardV2() {
  const { data: sessionData } = useSession();
  const session = (sessionData ?? null) as { displayName?: string | null; email?: string | null } | null;
  const { data: children, isLoading, isError, refetch } = useChildProfiles();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!children?.length) return;
    if (!selectedId || !children.some((c) => c.id === selectedId)) {
      setSelectedId(children[0]!.id);
    }
  }, [children, selectedId]);

  const displayName = session?.displayName?.trim() || session?.email?.split("@")[0] || "Parent";
  const firstName = session?.displayName?.trim().split(/\s+/)[0] ?? null;

  async function handleSignOut() {
    setSigningOut(true);
    await qc.cancelQueries();
    qc.clear();
    try {
      await clearParentSessionFn({ data: undefined });
    } catch (error) {
      console.error("[ParentDashboardV2] Error clearing session:", error);
    }
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    navigate({ to: "/login", replace: true });
  }

  const navItems: ParentNavItem[] = [
    { label: "Home", icon: Home, to: "/parent/dashboard-v2", active: true },
    { label: "My Children", icon: Users, hash: "my-children" },
    selectedId
      ? {
          label: "Learning Journey",
          icon: GraduationCap,
          to: "/parent/child/$childId",
          params: { childId: selectedId },
        }
      : { label: "Learning Journey", icon: GraduationCap },
    { label: "Achievements", icon: Trophy },
    { label: "SAVE Journey", icon: BarChart3 },
    { label: "Academy", icon: CalendarDays },
    { label: "Parent Tips", icon: Lightbulb },
    { label: "Support", icon: Headphones },
  ];

  return (
    <ParentShell
      title="Parent Dashboard"
      homeHref="/parent/dashboard-v2"
      roleLabel="Parent"
      navItems={navItems}
      userName={displayName}
      userInitials={initialsOf(displayName)}
      onSignOut={handleSignOut}
      signingOut={signingOut}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-3 sm:space-y-4">
        <ParentHero firstName={firstName} />
        <MyChildrenCard
          profiles={children}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
    </ParentShell>
  );
}
