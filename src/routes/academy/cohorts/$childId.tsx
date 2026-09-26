import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/tati";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { SupportSignalBadge } from "@/components/academy/SupportSignalBadge";
import { getFacilitatorSession } from "@/lib/auth/facilitator-auth.functions";
import { getAssignedLearnerDetail } from "@/lib/academy/data-access";

export const Route = createFileRoute("/academy/cohorts/$childId")({
  head: () => ({
    meta: [
      { title: "Learner Progress — TATI Academy" },
      {
        name: "description",
        content: "View detailed progress for a learner in TATI Academy.",
      },
      { property: "og:title", content: "Learner Progress — TATI Academy" },
      {
        property: "og:description",
        content: "See how this learner is progressing through the journey.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademyLearnerDetail,
});

function AcademyLearnerDetail() {
  const navigate = useNavigate();
  const { childId } = Route.useParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get facilitator session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });

  // Load learner detail data
  const { data: learnerDetail, isLoading: detailLoading, error: detailError, refetch: refetchDetail } = useQuery({
    queryKey: ["academy-learner-detail", session?.uid, childId],
    queryFn: async () => {
      if (!session?.uid) throw new Error("Not authenticated");
      return getAssignedLearnerDetail(session.uid, childId);
    },
    enabled: !!session?.uid,
    retry: 2,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.isFacilitator) {
      navigate({ to: "/academy/login", replace: true });
    }
  }, [sessionLoading, session?.isFacilitator, navigate]);

  // Set error message if detail load fails
  useEffect(() => {
    if (detailError) {
      const message = detailError instanceof Error
        ? detailError.message
        : "Could not load learner progress";
      setErrorMessage(message);
    }
  }, [detailError]);

  const isLoading = sessionLoading || detailLoading;

  if (isLoading) {
    return (
      <AcademyShell>
        <LoadingState label="Loading learner progress…" />
      </AcademyShell>
    );
  }

  // If not authenticated, don't render anything (useEffect will redirect)
  if (!session?.isFacilitator) {
    return null;
  }

  // Handle error state
  if (errorMessage || !learnerDetail) {
    const isAuthError = errorMessage?.includes("not assigned");
    return (
      <AcademyShell>
        <div className="space-y-4">
          <Button to="/academy/cohorts" variant="outline" size="md">
            ← Back to cohorts
          </Button>
          
          {isAuthError ? (
            <EmptyState
              title="Learner not found"
              description="This learner is not assigned to you or may have been removed."
              action={<Button to="/academy/cohorts">Back to cohorts</Button>}
            />
          ) : (
            <ErrorState
              title="Could not load learner progress"
              description={errorMessage || "Please try again or contact support."}
              onRetry={() => void refetchDetail()}
            />
          )}
        </div>
      </AcademyShell>
    );
  }

  const { child, progress, assessments, competencies, activityLog, supportSignal } = learnerDetail;
  const completionPercent = (progress.journeyProgress.completed / progress.journeyProgress.total) * 100;

  return (
    <AcademyShell>
      <div className="space-y-6">
        {/* Back navigation */}
        <Button to="/academy/cohorts" variant="outline" size="md">
          ← Back to cohorts
        </Button>

        {/* Learner Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar avatar={child.avatar} name={child.name} size="lg" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">{child.name}</h1>
                <p className="text-sm text-muted-foreground">TATI ID: {child.tatiId}</p>
              </div>
            </div>
            <div className="text-right">
              <SupportSignalBadge signal={supportSignal} />
            </div>
          </div>
        </div>

        {/* Overall Progress Section */}
        <Card>
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Journey Progress</h2>
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">{Math.round(completionPercent)}% complete</span>
                <span className="text-muted-foreground">
                  {progress.journeyProgress.completed} of {progress.journeyProgress.total} activities
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            {/* Current Activity */}
            {progress.currentActivityName && (
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xs text-muted-foreground font-semibold">Current focus</p>
                <p className="text-sm text-foreground font-medium mt-1">{progress.currentActivityName}</p>
              </div>
            )}

            {/* Last Activity Date */}
            {progress.lastActivityAt && (
              <p className="text-xs text-muted-foreground">
                Last activity: {progress.lastActivityAt.toLocaleDateString()}
              </p>
            )}
          </div>
        </Card>

        {/* Learning Journey Timeline */}
        {activityLog.length > 0 ? (
          <Card>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Learning Journey</h2>
              
              <div className="space-y-2">
                {activityLog.slice(0, 10).map((activity, index) => (
                  <div key={`${activity.itemId}-${index}`} className="flex gap-3 py-2">
                    <div className="mt-1">
                      {activity.status === "completed" && (
                        <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                      {activity.status === "in-progress" && (
                        <div className="w-5 h-5 rounded-full bg-warning flex items-center justify-center">
                          <span className="text-white text-xs">→</span>
                        </div>
                      )}
                      {activity.status === "not-started" && (
                        <div className="w-5 h-5 rounded-full bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {activity.type}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{activity.title}</p>
                      {activity.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.completedAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {activityLog.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{activityLog.length - 10} more activities
                </p>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No learning activity yet.</p>
            </div>
          </Card>
        )}

        {/* Competencies Section */}
        {competencies.length > 0 ? (
          <Card>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Skills Developing</h2>
              
              <div className="grid gap-2">
                {competencies.map((comp) => (
                  <div key={comp.id} className="flex justify-between items-center py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {comp.name.replace(/-/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{comp.level}</p>
                    </div>
                    <div className="text-xs font-semibold text-primary">
                      {Math.round(comp.score)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Competency information will appear as the learner completes activities.
              </p>
            </div>
          </Card>
        )}

        {/* Assessment History */}
        {assessments.length > 0 ? (
          <Card>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Assessments</h2>
              
              <div className="space-y-2">
                {assessments.map((assessment) => (
                  <div
                    key={assessment.id}
                    className="flex justify-between items-center p-2 rounded bg-surface"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{assessment.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {assessment.phase} assessment
                      </p>
                      {assessment.completedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {assessment.completedAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {assessment.score !== null && assessment.maxScore !== null && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">
                          {assessment.score}/{assessment.maxScore}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round((assessment.score / assessment.maxScore) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No assessments completed yet.</p>
            </div>
          </Card>
        )}

        {/* Support Signal & Next Steps */}
        <Card>
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Support Information</h2>
            
            {supportSignal === "on-track" && (
              <div className="rounded-lg bg-surface p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">On track</p>
                <p className="text-sm text-muted-foreground">
                  This learner is progressing well. Continue with the regular activities.
                </p>
              </div>
            )}

            {supportSignal === "not-started" && (
              <div className="rounded-lg bg-surface p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">Not started</p>
                <p className="text-sm text-muted-foreground">
                  This learner hasn't started activities yet. Check in during the next session to provide support.
                </p>
              </div>
            )}

            {supportSignal === "needs-support" && (
              <div className="rounded-lg bg-surface p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">May need support</p>
                <p className="text-sm text-muted-foreground">
                  This learner has had limited recent activity. Consider checking in to see if they need help
                  understanding a concept or if there are barriers to participation.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AcademyShell>
  );
}
