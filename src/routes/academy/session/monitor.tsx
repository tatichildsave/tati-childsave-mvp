import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Avatar, Button, Card, EmptyState, LoadingState, Badge } from "@/components/tati";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { getFacilitatorSession } from "@/lib/auth/facilitator-auth.functions";
import { useAcademyDashboard } from "@/lib/academy";
import { getTrack, itemTitle, itemSubtitle } from "@/lib/learning/track";
import { facilitatorGuides } from "@/lib/academy/facilitator-guide";
import { getActivityStatus, summarizeActivityStatuses } from "@/lib/academy/activity-status";
import { getChildJourneyProgress } from "@/lib/academy/data-access";

interface MonitorSearchParams {
  activityId?: string | undefined;
}

export const Route = createFileRoute("/academy/session/monitor")({
  validateSearch: (search: Record<string, unknown>): MonitorSearchParams => ({
    activityId: search["activityId"] as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Session Monitoring — TATI Academy" },
      {
        name: "description",
        content: "Monitor learner activity and engagement during a session.",
      },
      { property: "og:title", content: "Session Monitoring — TATI Academy" },
      { property: "og:description", content: "Real-time view of learner progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademySessionMonitor,
});

function AcademySessionMonitor() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/academy/session/monitor" });
  const activityId = search["activityId"];

  // Get facilitator session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });

  // Load cohort dashboard data
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useAcademyDashboard(
    session ? { uid: session.uid, email: session.email, displayName: session.displayName } : null,
  );

  // Load detailed journey progress for all learners
  const { data: learnerJourneyData, isLoading: journeyLoading } = useQuery({
    queryKey: ["academy-activity-monitoring", session?.uid, activityId],
    queryFn: async () => {
      if (!dashboardData?.assignedChildren || !dashboardData.progressSummaries || !activityId) {
        return null;
      }

      const journeyMap: Record<string, FirestoreProgressEvent[]> = {};
      for (const child of dashboardData.assignedChildren) {
        try {
          const progress = await getChildJourneyProgress(child.familyId, child.id);
          journeyMap[child.id] = progress;
        } catch (error) {
          console.error(`Failed to load journey for child ${child.id}:`, error);
          journeyMap[child.id] = [];
        }
      }
      return journeyMap;
    },
    enabled: !!dashboardData?.assignedChildren && !!activityId,
    staleTime: 60_000,
  });

  // Compute activity statuses (must be outside conditional rendering)
  const activityStatuses = useMemo(() => {
    if (!learnerJourneyData || !dashboardData?.progressSummaries || !activityId) return [];

    return dashboardData.progressSummaries.map((learner) => {
      const journeyProgress = learnerJourneyData[learner.childId] || [];
      return getActivityStatus(learner, activityId, journeyProgress);
    });
  }, [learnerJourneyData, dashboardData?.progressSummaries, activityId]);

  const statusSummary = useMemo(
    () => summarizeActivityStatuses(activityStatuses),
    [activityStatuses],
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.isFacilitator) {
      navigate({ to: "/academy/login", replace: true });
    }
  }, [sessionLoading, session?.isFacilitator, navigate]);

  if (sessionLoading || dashboardLoading || journeyLoading) {
    return (
      <AcademyShell>
        <LoadingState label="Loading session monitoring…" />
      </AcademyShell>
    );
  }

  if (!session?.isFacilitator) {
    return null;
  }

  // If no activity ID provided
  if (!activityId) {
    return (
      <AcademyShell>
        <EmptyState
          title="No activity selected"
          description="Please select an activity to monitor learner progress."
          action={
            <div className="flex gap-2">
              <Button to="/academy/session">View today's guide</Button>
              <Button to="/academy/cohorts" variant="outline">
                Back to cohorts
              </Button>
            </div>
          }
        />
      </AcademyShell>
    );
  }

  // Load track and find activity
  const track = getTrack("save");
  const activity = track.sequence.find((item) => item.id === activityId);

  if (!activity) {
    return (
      <AcademyShell>
        <EmptyState
          title="Activity not found"
          description="This activity is not part of the current track."
          action={<Button to="/academy/session">Back to guide</Button>}
        />
      </AcademyShell>
    );
  }

  // Get activity metadata
  const guide = facilitatorGuides[activityId];
  const activityTitle = itemTitle(track, activity);
  const activitySubtitle = itemSubtitle(track, activity);
  const position = track.sequence.findIndex((item) => item.id === activityId) + 1;
  const totalActivities = track.sequence.length;

  // Get learners
  const learners = dashboardData?.progressSummaries || [];

  // Group learners by status
  const notStartedLearners = activityStatuses.filter((s) => s.status === "not-started");
  const inProgressLearners = activityStatuses.filter((s) => s.status === "in-progress");
  const completedLearners = activityStatuses.filter((s) => s.status === "completed");
  const onAnotherActivityLearners = activityStatuses.filter(
    (s) => s.status === "on-another-activity",
  );

  // Determine support section
  const learnersNeedingCheckIn = [
    ...notStartedLearners.filter(
      (s) =>
        s.learner.supportSignal === "needs-support" || s.learner.supportSignal === "not-started",
    ),
  ];

  const hasNoActivity = statusSummary.total === 0;

  return (
    <AcademyShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() =>
                navigate({
                  to: `/academy/session?activityId=${activityId}`,
                })
              }
              className="mb-3 text-sm font-medium text-primary hover:underline"
            >
              ← Back to guide
            </button>
            <h1 className="text-3xl font-bold text-foreground">{activityTitle}</h1>
            <p className="mt-1 text-base text-muted-foreground">{activitySubtitle}</p>
          </div>
          <Button variant="outline" size="md" onClick={() => void refetchDashboard()}>
            ↻ Refresh
          </Button>
        </div>

        {/* Activity Context */}
        <Card>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Track</p>
              <p className="mt-1 font-bold text-foreground">{track.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Position</p>
              <p className="mt-1 font-bold text-foreground">
                {position} of {totalActivities}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Duration</p>
              <p className="mt-1 font-bold text-foreground">
                {guide?.estimatedMinutes ? `${guide.estimatedMinutes} min` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Type</p>
              <p className="mt-1 font-bold text-foreground capitalize">{activity.kind || "—"}</p>
            </div>
          </div>
        </Card>

        {/* Status Summary */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Learner Status Summary</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card>
              <p className="text-sm text-muted-foreground">Total Learners</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{statusSummary.total}</p>
            </Card>

            <Card>
              <p className="text-sm text-muted-foreground">Not Started</p>
              <p className="mt-2 text-3xl font-bold text-muted-foreground">
                {statusSummary.notStarted}
              </p>
            </Card>

            <Card>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="mt-2 text-3xl font-bold text-primary">{statusSummary.inProgress}</p>
            </Card>

            <Card>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="mt-2 text-3xl font-bold text-success">{statusSummary.completed}</p>
            </Card>

            <Card>
              <p className="text-sm text-muted-foreground">Working On Other</p>
              <p className="mt-2 text-3xl font-bold text-muted-foreground">
                {statusSummary.onAnotherActivity}
              </p>
            </Card>
          </div>
        </div>

        {/* Learner Status Board */}
        {!hasNoActivity ? (
          <div className="space-y-6">
            {/* In Progress */}
            {inProgressLearners.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">Currently Working</h2>
                <Card>
                  <div className="space-y-2">
                    {inProgressLearners.map((status) => (
                      <div
                        key={status.learner.childId}
                        className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-3"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar
                            avatar={status.learner.avatar}
                            name={status.learner.childName}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {status.learner.childName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {status.learner.journeyProgress.completed} of{" "}
                              {status.learner.journeyProgress.total} activities
                            </p>
                          </div>
                        </div>
                        <Button
                          to={`/academy/cohorts/${status.learner.childId}`}
                          variant="outline"
                          size="md"
                        >
                          View detail
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Completed */}
            {completedLearners.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">Completed</h2>
                <Card>
                  <div className="space-y-2">
                    {completedLearners.map((status) => (
                      <div
                        key={status.learner.childId}
                        className="flex items-center justify-between rounded-lg bg-success/5 border border-success/20 p-3"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success">
                            <span className="text-white text-sm">✓</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {status.learner.childName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {status.learner.journeyProgress.completed} of{" "}
                              {status.learner.journeyProgress.total} activities
                            </p>
                          </div>
                        </div>
                        <Button
                          to={`/academy/cohorts/${status.learner.childId}`}
                          variant="outline"
                          size="md"
                        >
                          View detail
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Not Started */}
            {notStartedLearners.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">Not Started Yet</h2>
                <Card>
                  <div className="space-y-2">
                    {notStartedLearners.map((status) => (
                      <div
                        key={status.learner.childId}
                        className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar
                            avatar={status.learner.avatar}
                            name={status.learner.childName}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {status.learner.childName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {status.learner.journeyProgress.completed} of{" "}
                              {status.learner.journeyProgress.total} activities
                            </p>
                          </div>
                        </div>
                        <Button
                          to={`/academy/cohorts/${status.learner.childId}`}
                          variant="outline"
                          size="md"
                        >
                          View detail
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Working On Another Activity */}
            {onAnotherActivityLearners.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">
                  Working On Another Activity
                </h2>
                <Card>
                  <div className="space-y-2">
                    {onAnotherActivityLearners.map((status) => (
                      <div
                        key={status.learner.childId}
                        className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar
                            avatar={status.learner.avatar}
                            name={status.learner.childName}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {status.learner.childName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {status.statusReason || status.learner.currentActivityName}
                            </p>
                          </div>
                        </div>
                        <Button
                          to={`/academy/cohorts/${status.learner.childId}`}
                          variant="outline"
                          size="md"
                        >
                          View detail
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="No learners assigned"
            description="When learners are assigned to your cohorts, they'll appear here."
          />
        )}

        {/* Support Section */}
        {learnersNeedingCheckIn.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              Learners Who May Need a Check-In
            </h2>
            <Card tone="muted">
              <p className="text-sm text-muted-foreground mb-4">
                These learners may benefit from a quick check-in to offer support or answer
                questions.
              </p>
              <div className="space-y-2">
                {learnersNeedingCheckIn.map((status) => (
                  <div
                    key={status.learner.childId}
                    className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/5 p-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar
                        avatar={status.learner.avatar}
                        name={status.learner.childName}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {status.learner.childName}
                        </p>
                        <p className="text-xs text-muted-foreground">{status.statusReason}</p>
                      </div>
                    </div>
                    <Button
                      to={`/academy/cohorts/${status.learner.childId}`}
                      variant="outline"
                      size="md"
                    >
                      View detail
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Facilitation Reminder */}
        <Card tone="muted">
          <p className="text-sm text-muted-foreground">
            <strong>Your role:</strong> Guide, observe, and support learners in their journey. TATI
            tracks progress automatically. Focus on answering questions and celebrating progress.
          </p>
        </Card>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() =>
                navigate({
                  to: `/academy/session?activityId=${activityId}`,
                })
              }
            >
              Back to guide
            </Button>
            <Button variant="ghost" size="md" onClick={() => navigate({ to: "/academy/cohorts" })}>
              Cohort
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => navigate({ to: "/academy/dashboard" })}
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    </AcademyShell>
  );
}
