import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Avatar, Button, Card, EmptyState, LoadingState } from "@/components/tati";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { getFacilitatorSession } from "@/lib/auth/facilitator-auth.functions";
import {
  useAcademyDashboard,
  useCreateAcademySession,
  useActiveFacilitatorSession,
  type CreateSessionInput,
} from "@/lib/academy";
import { getTrack, itemTitle, itemSubtitle } from "@/lib/learning/track";
import { facilitatorGuides } from "@/lib/academy/facilitator-guide";

interface StartSearchParams {
  activityId?: string | undefined;
}

export const Route = createFileRoute("/academy/session/start")({
  validateSearch: (search: Record<string, unknown>): StartSearchParams => ({
    activityId: search["activityId"] as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Launch Activity — TATI Academy" },
      {
        name: "description",
        content: "Ready to facilitate? Here's what you need to know.",
      },
      { property: "og:title", content: "Launch Activity — TATI Academy" },
      { property: "og:description", content: "Activity context and facilitator preparation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademyActivityLaunch,
});

function AcademyActivityLaunch() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/academy/session/start" });
  const activityId = search["activityId"];

  const [prepChecklist, setPrepChecklist] = useState({
    materialsReady: false,
    facilitatorPrepared: false,
    learnersReady: false,
    spaceReady: false,
  });

  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });

  // Load cohort dashboard data for learner list
  const { data: dashboardData, isLoading: dashboardLoading } = useAcademyDashboard(
    session ? { uid: session.uid, email: session.email, displayName: session.displayName } : null,
  );

  // Check for existing active session
  const { data: existingSession } = useActiveFacilitatorSession(
    session?.uid ?? null,
    activityId ?? null,
  );

  // Session creation mutation
  const createSessionMutation = useCreateAcademySession();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.isFacilitator) {
      navigate({ to: "/academy/login", replace: true });
    }
  }, [sessionLoading, session?.isFacilitator, navigate]);

  const handleStartSession = async () => {
    if (!session || !activityId || !dashboardData) return;

    // If there's an existing active session, show resume dialog
    if (existingSession && existingSession.status === "active") {
      setShowResumeDialog(true);
      return;
    }

    // Create new session
    setIsCreatingSession(true);
    try {
      const track = getTrack("save");
      const activity = track.sequence.find((item) => item.id === activityId);
      if (!activity) throw new Error("Activity not found");

      const sessionInput: CreateSessionInput = {
        facilitatorUid: session.uid,
        activityId,
        activityKind: activity.kind as "lesson" | "scenario" | "assessment" | "reflection",
        activityTitle: itemTitle(track, activity),
        trackId: "save",
        learnerIds: dashboardData.assignedChildren.map((child) => child.id),
      };

      const newSessionId = await createSessionMutation.mutateAsync(sessionInput);
      navigate({ to: `/academy/session/monitor?sessionId=${newSessionId}` });
    } catch (error) {
      console.error("Failed to create session:", error);
      setIsCreatingSession(false);
    }
  };

  const handleResumeSession = () => {
    if (!existingSession) return;
    navigate({ to: `/academy/session/monitor?sessionId=${existingSession.id}` });
  };

  if (sessionLoading || dashboardLoading) {
    return (
      <AcademyShell>
        <LoadingState label="Preparing activity launch…" />
      </AcademyShell>
    );
  }

  // If not authenticated, don't render anything (useEffect will redirect)
  if (!session?.isFacilitator) {
    return null;
  }

  // If no activity ID provided, show empty state
  if (!activityId) {
    return (
      <AcademyShell>
        <EmptyState
          title="No activity selected"
          description="Please select an activity to prepare for facilitation."
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

  // Load track and find the activity
  const track = getTrack("save");
  const activity = track.sequence.find((item) => item.id === activityId);

  if (!activity) {
    return (
      <AcademyShell>
        <EmptyState
          title="Activity not found"
          description="This activity is not part of the current track."
          action={<Button to={`/academy/session?activityId=${activityId}`}>Back to guide</Button>}
        />
      </AcademyShell>
    );
  }

  // Get facilitator guide for this activity
  const guide = facilitatorGuides[activityId];

  // Get activity metadata
  const activityTitle = itemTitle(track, activity);
  const activitySubtitle = itemSubtitle(track, activity);
  const position = track.sequence.findIndex((item) => item.id === activityId) + 1;
  const totalActivities = track.sequence.length;

  // Get assigned learners
  const learners = dashboardData?.progressSummaries || [];
  const learnerCount = learners.length;

  return (
    <AcademyShell>
      <div className="space-y-6">
        {/* Header with navigation */}
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
        </div>

        {/* Activity Context Card */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-foreground uppercase text-muted-foreground">
                Activity Context
              </p>
              <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
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
                  <p className="mt-1 font-bold text-foreground capitalize">
                    {activity.kind || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Learner Group Section */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">Learners in This Group</h2>

          {learnerCount === 0 ? (
            <Card tone="muted">
              <p className="text-base text-muted-foreground">
                No learners are currently assigned to you.
              </p>
            </Card>
          ) : (
            <Card>
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-sm font-bold text-foreground">
                  {learnerCount} learner{learnerCount !== 1 ? "s" : ""} ready
                </p>
              </div>

              <div className="space-y-3">
                {learners.map((learner) => (
                  <div
                    key={learner.childId}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar avatar={learner.avatar} name={learner.childName} size="md" />
                      <div>
                        <p className="font-bold text-foreground">{learner.childName}</p>
                        {learner.currentActivityName && (
                          <p className="text-xs text-muted-foreground">
                            Currently: {learner.currentActivityName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground">Progress</p>
                        <p className="text-sm font-bold text-foreground">
                          {learner.journeyProgress.completed}/{learner.journeyProgress.total}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Facilitator Preparation Checklist */}
        {guide && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">Are You Ready?</h2>
            <Card>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prepChecklist.materialsReady}
                    onChange={(e) =>
                      setPrepChecklist({
                        ...prepChecklist,
                        materialsReady: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                  <span className="text-base text-foreground">
                    Materials ready{guide.materials && guide.materials.length > 0 && " ✓"}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prepChecklist.facilitatorPrepared}
                    onChange={(e) =>
                      setPrepChecklist({
                        ...prepChecklist,
                        facilitatorPrepared: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                  <span className="text-base text-foreground">You've read the guide ✓</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prepChecklist.learnersReady}
                    onChange={(e) =>
                      setPrepChecklist({
                        ...prepChecklist,
                        learnersReady: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                  <span className="text-base text-foreground">Learners are ready</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prepChecklist.spaceReady}
                    onChange={(e) =>
                      setPrepChecklist({
                        ...prepChecklist,
                        spaceReady: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border bg-background"
                  />
                  <span className="text-base text-foreground">Space is set up</span>
                </label>
              </div>
            </Card>
          </div>
        )}

        {/* How Learners Enter */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">How Learners Access This</h2>
          <Card tone="muted">
            <div className="space-y-3">
              <p className="text-base font-medium text-foreground">
                Learners use their own TATI ChildSave devices:
              </p>
              <ol className="space-y-2 text-sm text-foreground list-decimal list-inside">
                <li>They open TATI ChildSave</li>
                <li>They log in with their TATI ID + PIN</li>
                <li>They continue from their current activity</li>
                <li>TATI automatically guides them to the next step</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-3">
                💡 Learners don't need a link or code. They simply continue their journey in TATI.
              </p>
            </div>
          </Card>
        </div>

        {/* Reminder Card */}
        <Card>
          <p className="text-sm text-muted-foreground">
            <strong>Remember:</strong> Your role is to guide, observe, and facilitate learning. TATI
            handles progress tracking automatically.
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

          {/* Status and Start Monitoring */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase font-medium">Status</p>
              <p className="text-sm font-bold text-foreground">
                {Object.values(prepChecklist).every((v) => v)
                  ? "✓ Ready to facilitate"
                  : "Prepare before starting"}
              </p>
            </div>
            <Button
              size="lg"
              className="min-w-[200px]"
              onClick={handleStartSession}
              disabled={isCreatingSession}
            >
              {isCreatingSession ? "Starting…" : "Start Session →"}
            </Button>
          </div>
        </div>

        {/* Resume Active Session Dialog */}
        {showResumeDialog && existingSession && (
          <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
            <AlertDialogContent>
              <AlertDialogTitle>Session Already Active</AlertDialogTitle>
              <AlertDialogDescription>
                You already have an active session for this activity. Would you like to resume it or
                start a new one?
              </AlertDialogDescription>
              <div className="flex gap-2 justify-end">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResumeSession}>Resume Session</AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </AcademyShell>
  );
}
