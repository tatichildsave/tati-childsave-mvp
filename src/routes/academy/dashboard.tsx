import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardTitle, Button, LoadingState, Avatar } from "@/components/tati";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { SupportSignalBadge } from "@/components/academy/SupportSignalBadge";
import { getFacilitatorSession, logoutFacilitator } from "@/lib/auth/facilitator-auth.functions";
import { useAcademyDashboard } from "@/lib/academy";

export const Route = createFileRoute("/academy/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TATI Academy" },
      {
        name: "description",
        content: "Guide your learners through TATI ChildSave.",
      },
      { property: "og:title", content: "Dashboard — TATI Academy" },
      { property: "og:description", content: "TATI Academy facilitator dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademyDashboard,
});

function AcademyDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });

  // Load Academy dashboard data
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useAcademyDashboard(
    session ? { uid: session.uid, email: session.email, displayName: session.displayName } : null,
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.isFacilitator) {
      navigate({ to: "/academy/login", replace: true });
    }
  }, [sessionLoading, session?.isFacilitator, navigate]);

  async function handleLogoutClick() {
    await qc.cancelQueries();
    qc.clear();
    await logoutFacilitator();
    navigate({ to: "/academy/login", replace: true });
  }

  if (sessionLoading || dashboardLoading) {
    return (
      <AcademyShell>
        <LoadingState label="Loading your dashboard…" />
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
          <p className="text-base font-bold text-foreground">Could not load dashboard</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please try refreshing the page or contact support if the problem persists.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-3">
            Refresh
          </Button>
        </Card>
      </AcademyShell>
    );
  }

  return (
    <AcademyShell>
      <div className="space-y-6">
        {/* Welcome section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Good morning, {session?.displayName}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Let's help your learners take their next step with TATI.
          </p>
        </div>

        {/* Today's activity section */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Today's Activity</h2>
          {dashboardData?.todayActivity ? (
            <Card className="border-success/20 bg-success/5">
              <div className="flex items-start gap-4">
                <span className="text-4xl">🎯</span>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-foreground">
                    {dashboardData.todayActivity.activityName}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dashboardData.todayActivity.cohortName} ·{" "}
                    {dashboardData.todayActivity.duration}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="md">Start session</Button>
                    <Button variant="outline" size="md">
                      View guide
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card tone="muted">
              <p className="text-base font-bold text-foreground">No activity scheduled today</p>
              <p className="mt-1 text-sm text-muted-foreground">
                View your cohorts to see upcoming activities.
              </p>
              <Button to="/academy/cohorts" variant="outline" className="mt-3">
                View cohorts
              </Button>
            </Card>
          )}
        </div>

        {/* Learners needing support */}
        {(dashboardData?.learnersSupportSignal?.needsSupport?.length ?? 0) > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3">
              Learners Who May Need Support
            </h2>
            <Card>
              <div className="space-y-2">
                {dashboardData?.learnersSupportSignal?.needsSupport?.map((learner) => (
                  <div
                    key={learner.childId}
                    className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar avatar={learner.avatar} name={learner.childName} size="sm" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{learner.childName}</p>
                        <p className="text-xs text-muted-foreground">
                          {learner.journeyProgress.completed}/{learner.journeyProgress.total}{" "}
                          completed
                        </p>
                      </div>
                    </div>
                    <SupportSignalBadge signal="needs-support" />
                  </div>
                ))}
              </div>
              <Button to="/academy/cohorts" variant="outline" className="mt-4 w-full">
                View all learners
              </Button>
            </Card>
          </div>
        )}

        {/* My Cohorts quick links */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">My Cohorts</h2>
          {(dashboardData?.assignedChildren?.length ?? 0) === 0 ? (
            <Card tone="muted">
              <p className="text-base font-bold text-foreground">No learners assigned yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Contact your administrator to assign learners or cohorts to your account.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <CardTitle>👥 Assigned Learners</CardTitle>
                <p className="mt-2 text-3xl font-bold text-primary">
                  {dashboardData?.assignedChildren?.length ?? 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Total learners in your cohorts</p>
                <Button to="/academy/cohorts" variant="outline" className="mt-4">
                  Manage cohorts
                </Button>
              </Card>

              <Card>
                <CardTitle>📊 Overall Progress</CardTitle>
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${
                          dashboardData?.progressSummaries?.length
                            ? (dashboardData.progressSummaries.reduce(
                                (sum, p) => sum + p.journeyProgress.completed,
                                0,
                              ) /
                                (dashboardData.progressSummaries.length * 14)) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Average journey progress across cohorts
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AcademyShell>
  );
}
