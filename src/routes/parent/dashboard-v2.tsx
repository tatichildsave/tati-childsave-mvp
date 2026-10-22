/**
 * Parent Dashboard V2 — approved premium design.
 *
 * Sidebar, top navigation, welcome hero, My Children, learning journey, achievements,
 * SAVE journey, next class, parent tips, quick links and quote.
 * Data is read only through the existing parent-scoped server functions
 * (getFamilyChildren / getChildJourneyProgress). Parents cannot create or
 * modify children from this page.
 */

import { useEffect, useState, type ReactNode } from "react";
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
import { useChildProfiles, useSession, type ChildProfile } from "@/lib/family";
import { useChildProgress, type ChildProgressResult } from "@/lib/progress/service";
import { clearParentSessionFn } from "@/lib/backend/firebase/family.functions";
import { ParentShell, type ParentNavItem } from "@/components/parent/ParentShell";
import { ParentHero } from "@/components/parent/ParentHero";
import { MyChildrenCard } from "@/components/parent/MyChildrenCard";
import {
  AchievementsCard,
  LearningJourneyCard,
  NextClassCard,
  ParentTipsCard,
  QuickLinksCard,
  QuoteCard,
  SaveJourneyCard,
} from "@/components/parent/DashboardSections";

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

  const hasChild = !!selectedId;
  const navItems: ParentNavItem[] = [
    { label: "Home", icon: Home, to: "/parent/dashboard-v2", active: true },
    { label: "My Children", icon: Users, hash: "my-children" },
    hasChild
      ? { label: "Learning Journey", icon: GraduationCap, hash: "learning-journey" }
      : { label: "Learning Journey", icon: GraduationCap },
    hasChild ? { label: "Achievements", icon: Trophy, hash: "achievements" } : { label: "Achievements", icon: Trophy },
    { label: "SAVE Journey", icon: BarChart3, hash: "save-journey" },
    { label: "Academy", icon: CalendarDays, hash: "next-class" },
    { label: "Parent Tips", icon: Lightbulb, hash: "parent-tips" },
    { label: "Support", icon: Headphones },
  ];

  const selectedChild = children?.find((c) => c.id === selectedId) ?? null;
  const myChildren = (
    <MyChildrenCard
      profiles={children}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );

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
        {selectedChild ? (
          <ChildDashboard child={selectedChild} myChildren={myChildren} />
        ) : (
          <DashboardLayout child={null} progress={null} myChildren={myChildren} />
        )}
      </div>
    </ParentShell>
  );
}

function ChildDashboard({ child, myChildren }: { child: ChildProfile; myChildren: ReactNode }) {
  const progress = useChildProgress(child.id);
  return <DashboardLayout child={child} progress={progress} myChildren={myChildren} />;
}

/**
 * Reference layout: a main column with a 360px side column from 1360px wide,
 * then a three-up row (tips, quick links, quote). Stacks on smaller screens.
 */
function DashboardLayout({
  child,
  progress,
  myChildren,
}: {
  child: ChildProfile | null;
  progress: ChildProgressResult | null;
  myChildren: ReactNode;
}) {
  return (
    <>
      <div className="grid gap-3 sm:gap-4 min-[1360px]:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3 sm:space-y-4">
          {myChildren}
          {child && progress ? (
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <LearningJourneyCard key={child.id} child={child} progress={progress} />
              <AchievementsCard key={`badges-${child.id}`} child={child} progress={progress} />
            </div>
          ) : null}
        </div>
        <div className="grid min-w-0 content-start gap-3 sm:gap-4 md:grid-cols-2 min-[1360px]:grid-cols-1">
          <NextClassCard />
          <SaveJourneyCard child={child} progress={progress} />
        </div>
      </div>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 min-[1360px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.72fr)]">
        <ParentTipsCard key={child?.id ?? "none"} child={child} progress={progress} />
        <QuickLinksCard child={child} />
        <QuoteCard className="lg:col-span-2 min-[1360px]:col-span-1" />
      </div>
    </>
  );
}
