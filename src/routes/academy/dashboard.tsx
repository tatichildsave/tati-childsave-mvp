/**
 * TATI Academy — Facilitator Dashboard V2.
 *
 * All figures come from Firestore via the facilitator data layer:
 * assigned learners (facilitatorAssignments + child.facilitatorUids), progress
 * (shared 24-activity SAVE calculation), cohorts (academyCohorts) and sessions
 * (academySessions). Firestore rules restrict every read to this facilitator.
 */

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FacilitatorWorkspace } from "@/components/academy/FacilitatorWorkspace";
import {
  CohortsCard,
  RecentSessionsCard,
  SummaryCards,
  SupportListCard,
  TodaysClassCard,
  UpcomingClassesCard,
  WelcomeHeader,
  toMillis,
} from "@/components/academy/FacilitatorDashboardSections";
import { getFacilitatorSession } from "@/lib/auth/facilitator-auth.functions";
import {
  nextClassToday,
  upcomingClasses,
  useAcademyDashboard,
  useFacilitatorClasses,
  useFacilitatorCohorts,
  useFacilitatorSessions,
  type ChildProgressSummary,
} from "@/lib/academy";

export const Route = createFileRoute("/academy/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TATI Academy" },
      { name: "description", content: "Guide your learners through TATI ChildSave." },
      { property: "og:title", content: "Dashboard — TATI Academy" },
      { property: "og:description", content: "TATI Academy facilitator dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademyDashboard,
});

function startOfWeek(now: Date) {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function AcademyDashboard() {
  const [now] = useState(() => new Date());
  const { data: session } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });
  const uid = session?.uid ?? null;

  const dashboard = useAcademyDashboard(
    session ? { uid: session.uid, email: session.email, displayName: session.displayName } : null,
  );
  const cohortsQuery = useFacilitatorCohorts(uid);
  const sessionsQuery = useFacilitatorSessions(uid);
  const classesQuery = useFacilitatorClasses(uid);

  const summaries = dashboard.data?.progressSummaries ?? [];
  const activeCohorts = useMemo(
    () => (cohortsQuery.data ?? []).filter((c) => c.status === "active"),
    [cohortsQuery.data],
  );
  const sessions = sessionsQuery.data ?? [];

  const activeCohortIds = useMemo(() => new Set(activeCohorts.map((c) => c.id)), [activeCohorts]);
  const liveClasses = useMemo(
    () => (classesQuery.data ?? []).filter((c) => activeCohortIds.has(c.cohortId)),
    [classesQuery.data, activeCohortIds],
  );
  const todaysClass = useMemo(() => nextClassToday(liveClasses, now), [liveClasses, now]);
  const upcoming = useMemo(
    () => upcomingClasses(liveClasses, now, { exclude: todaysClass, limit: 4 }),
    [liveClasses, now, todaysClass],
  );

  const derived = useMemo(() => {
    const progressByChild = new Map<string, ChildProgressSummary>(summaries.map((s) => [s.childId, s]));
    const averageProgress = summaries.length
      ? Math.round(summaries.reduce((sum, s) => sum + s.percentComplete, 0) / summaries.length)
      : null;

    const weekStart = startOfWeek(now).getTime();
    const thisWeek = sessions.filter((s) => (toMillis(s.startedAt) ?? 0) >= weekStart);

    // Suggest the next activity most learners are on.
    const counts = new Map<string, number>();
    for (const s of summaries) {
      if (s.nextActivityId) counts.set(s.nextActivityId, (counts.get(s.nextActivityId) ?? 0) + 1);
    }
    const suggestion = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    return {
      progressByChild,
      averageProgress,
      sessionsThisWeek: thisWeek.length,
      completedThisWeek: thisWeek.filter((s) => s.status === "completed").length,
      activeSession: sessions.find((s) => s.status === "active") ?? null,
      suggestedActivityId: suggestion?.[0] ?? null,
      suggestedLearners: suggestion?.[1] ?? 0,
    };
  }, [summaries, sessions, now]);

  const cohortNameFor = (childId: string) => activeCohorts.find((c) => c.learnerIds.includes(childId))?.name ?? null;

  const loading =
    !session || dashboard.isLoading || cohortsQuery.isLoading || sessionsQuery.isLoading || classesQuery.isLoading;

  return (
    <FacilitatorWorkspace active="dashboard">
      <div className="space-y-4 sm:space-y-5">
        <WelcomeHeader name={session?.displayName ?? "Facilitator"} now={now} />

        {dashboard.isError ? (
          <div className="rounded-2xl border border-[#F3D2D2] bg-[#FFF6F6] p-5" role="alert">
            <p className="text-[15px] font-extrabold text-[#B42318]">We couldn't load your learners.</p>
            <p className="mt-1 text-[14px] text-[#6B7489]">Check your connection, then try again.</p>
            <button
              type="button"
              onClick={() => void dashboard.refetch()}
              className="mt-3 rounded-lg bg-white px-3 py-1.5 text-[14px] font-bold text-[#1C5AD6] ring-1 ring-[#D7E1F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C5AD6]"
            >
              Try again
            </button>
          </div>
        ) : null}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <SummaryCards
              learners={dashboard.data?.assignedChildren.length ?? 0}
              cohortCount={activeCohorts.length}
              averageProgress={derived.averageProgress}
              needSupport={dashboard.data?.learnersSupportSignal.total ?? 0}
              sessionsThisWeek={derived.sessionsThisWeek}
              sessionsCompletedThisWeek={derived.completedThisWeek}
            />

            <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <TodaysClassCard
                activeSession={derived.activeSession}
                nextClass={todaysClass}
                cohorts={activeCohorts}
                suggestedActivityId={derived.suggestedActivityId}
                suggestedLearners={derived.suggestedLearners}
              />
              <UpcomingClassesCard classes={upcoming} cohorts={activeCohorts} />
            </div>

            <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.27fr)_minmax(0,1fr)]">
              <SupportListCard
                learners={dashboard.data?.learnersSupportSignal.needsSupport ?? []}
                cohortNameFor={cohortNameFor}
                now={now}
              />
              <CohortsCard cohorts={activeCohorts} progressByChild={derived.progressByChild} />
            </div>

            {sessionsQuery.isError ? (
              <p className="rounded-2xl border border-[#E4E9F2] bg-white p-5 text-[14px] text-[#6B7489]" role="alert">
                Recent sessions couldn't be loaded right now.
              </p>
            ) : (
              <RecentSessionsCard sessions={sessions} />
            )}
          </>
        )}
      </div>
    </FacilitatorWorkspace>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading your dashboard">
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[132px] animate-pulse rounded-2xl bg-[#EEF2F8]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="h-64 animate-pulse rounded-2xl bg-[#EEF2F8]" />
        <div className="h-64 animate-pulse rounded-2xl bg-[#EEF2F8]" />
      </div>
    </div>
  );
}
