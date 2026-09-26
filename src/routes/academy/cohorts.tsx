import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Avatar, Button, EmptyState, LoadingState, Card } from "@/components/tati";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { LearnerRoster } from "@/components/academy/LearnerRoster";
import { SupportSignalBadge } from "@/components/academy/SupportSignalBadge";
import { getFacilitatorSession } from "@/lib/auth/facilitator-auth.functions";
import { useAcademyDashboard } from "@/lib/academy";
import type { ChildProgressSummary } from "@/lib/academy/data-access";

export const Route = createFileRoute("/academy/cohorts")({
  head: () => ({
    meta: [
      { title: "My Cohorts — TATI Academy" },
      {
        name: "description",
        content: "Manage your cohorts and learners in TATI Academy.",
      },
      { property: "og:title", content: "My Cohorts — TATI Academy" },
      { property: "og:description", content: "View and manage your cohorts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademyCohorts,
});

function AcademyCohorts() {
  const navigate = useNavigate();
  const [filterSignal, setFilterSignal] = useState<
    "all" | "on-track" | "needs-support" | "not-started"
  >("all");
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });

  // Load Academy dashboard data (includes assigned children and progress)
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useAcademyDashboard(
    session ? { uid: session.uid, email: session.email, displayName: session.displayName } : null,
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.isFacilitator) {
      navigate({ to: "/academy/login", replace: true });
    }
  }, [sessionLoading, session?.isFacilitator, navigate]);

  if (sessionLoading || dashboardLoading) {
    return (
      <AcademyShell>
        <LoadingState label="Loading your cohorts…" />
      </AcademyShell>
    );
  }

  // If not authenticated, don't render anything (useEffect will redirect)
  if (!session?.isFacilitator) {
    return null;
  }

  if (dashboardError) {
    return (
      <AcademyShell>
        <Card tone="muted">
          <p className="text-base font-bold text-foreground">Could not load cohorts</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please try refreshing the page or contact support if the problem persists.
          </p>
          <Button variant="outline" onClick={() => refetchDashboard()} className="mt-3">
            Refresh
          </Button>
        </Card>
      </AcademyShell>
    );
  }

  const learners = dashboardData?.progressSummaries || [];

  // Calculate cohort-level statistics
  const totalLearners = learners.length;
  const onTrackCount = learners.filter((l) => l.supportSignal === "on-track").length;
  const needsSupportCount = learners.filter((l) => l.supportSignal === "needs-support").length;
  const notStartedCount = learners.filter((l) => l.supportSignal === "not-started").length;

  const totalCompleted = learners.reduce((sum, l) => sum + l.journeyProgress.completed, 0);
  const totalActivities = learners.reduce((sum, l) => sum + l.journeyProgress.total, 0);
  const classProgressPercent = totalActivities > 0 ? (totalCompleted / totalActivities) * 100 : 0;

  // Filter learners based on selected signal
  const filteredLearners = learners.filter((l) => {
    if (filterSignal === "all") return true;
    return l.supportSignal === filterSignal;
  });

  const needsSupportLearners = learners.filter((l) => l.supportSignal === "needs-support");
  const everyoneOnTrack = totalLearners > 0 && needsSupportCount === 0;

  return (
    <AcademyShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Cohort</h1>
            <p className="mt-1 text-base text-muted-foreground">
              {totalLearners === 0
                ? "No learners assigned yet."
                : `${totalLearners} learner${totalLearners !== 1 ? "s" : ""} • Progressing through the journey`}
            </p>
          </div>
          <Button variant="outline" size="md" onClick={() => refetchDashboard()}>
            ↻ Refresh
          </Button>
        </div>

        {totalLearners === 0 ? (
          <EmptyState
            title="No learners assigned"
            description="When learners are assigned to your cohorts, they'll appear here. Contact your administrator if you think this is a mistake."
            action={<Button to="/academy/dashboard">Back to dashboard</Button>}
          />
        ) : (
          <div className="space-y-6">
            {/* Class Progress Section */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">Class Progress</h2>
              <Card>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">Journey Completion</p>
                      <p className="text-sm font-bold text-primary">
                        {Math.round(classProgressPercent)}%
                      </p>
                    </div>
                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success transition-all duration-300"
                        style={{ width: `${Math.min(classProgressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {totalCompleted} of {totalActivities} activities completed across all learners
                  </p>
                </div>
              </Card>
            </div>

            {/* Summary Cards */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">Cohort Summary</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                  <p className="text-sm text-muted-foreground">Total Learners</p>
                  <p className="mt-2 text-3xl font-bold text-primary">{totalLearners}</p>
                </Card>

                <Card>
                  <p className="text-sm text-muted-foreground">On Track</p>
                  <p className="mt-2 text-3xl font-bold text-success">{onTrackCount}</p>
                </Card>

                <Card>
                  <p className="text-sm text-muted-foreground">May Need Support</p>
                  <p className="mt-2 text-3xl font-bold text-warning">{needsSupportCount}</p>
                </Card>

                <Card>
                  <p className="text-sm text-muted-foreground">Not Started</p>
                  <p className="mt-2 text-3xl font-bold text-muted-foreground">{notStartedCount}</p>
                </Card>
              </div>
            </div>

            {/* Support Section */}
            {needsSupportCount > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">
                  Learners Who May Need Support
                </h2>
                <Card tone="muted">
                  <p className="text-sm text-muted-foreground mb-4">
                    These learners have completed less than 30% of the journey and haven't been
                    active in the last 2 days. They may benefit from a check-in to answer questions
                    or discuss any challenges.
                  </p>
                  <div className="space-y-2">
                    {needsSupportLearners.map((learner) => (
                      <div
                        key={learner.childId}
                        className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/5 p-3"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar avatar={learner.avatar} name={learner.childName} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {learner.childName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {learner.journeyProgress.completed} of {learner.journeyProgress.total}{" "}
                              activities
                            </p>
                          </div>
                        </div>
                        <Button
                          to={`/academy/cohorts/${learner.childId}`}
                          variant="outline"
                          size="md"
                        >
                          View learner
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {everyoneOnTrack && (
              <div>
                <Card tone="muted">
                  <p className="text-base font-bold text-foreground">
                    Everyone is currently on track!
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Keep supporting learners as they move through the journey. Check in regularly to
                    answer questions and celebrate progress.
                  </p>
                </Card>
              </div>
            )}

            {/* Filtering Section */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3">Learner Roster</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    { label: "All learners", value: "all" },
                    { label: "On track", value: "on-track" },
                    { label: "May need support", value: "needs-support" },
                    { label: "Not started", value: "not-started" },
                  ] as const
                ).map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setFilterSignal(filter.value as typeof filterSignal)}
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      filterSignal === filter.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-transparent text-foreground hover:bg-muted"
                    }`}
                    aria-pressed={filterSignal === filter.value}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {filteredLearners.length === 0 ? (
                <Card tone="muted">
                  <p className="text-base font-bold text-foreground">No learners in this view</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No learners match the selected filter. Try selecting a different filter.
                  </p>
                </Card>
              ) : (
                <LearnerRoster
                  learners={filteredLearners.map((summary) => ({
                    id: summary.childId,
                    name: summary.childName,
                    avatar: summary.avatar,
                    status: "in-progress" as const,
                    progressPercent:
                      (summary.journeyProgress.completed / summary.journeyProgress.total) * 100,
                    ...(summary.currentActivityType && {
                      currentActivity: summary.currentActivityType,
                    }),
                    supportSignal: summary.supportSignal ?? "on-track",
                    action: (
                      <Button
                        to={`/academy/cohorts/${summary.childId}`}
                        variant="outline"
                        size="md"
                      >
                        View progress
                      </Button>
                    ),
                  }))}
                  onLearnerClick={(id) => navigate({ to: `/academy/cohorts/${id}` })}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </AcademyShell>
  );
}
