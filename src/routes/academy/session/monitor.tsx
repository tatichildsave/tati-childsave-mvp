import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Avatar, Button, Card, EmptyState, LoadingState, Badge } from "@/components/tati";
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
  useAcademySession,
  useUpdateSessionAttendance,
  useUpdateSessionNote,
  useCompleteAcademySession,
  computeSessionDuration,
  computeAttendanceSummary,
} from "@/lib/academy";
import { getTrack, itemTitle, itemSubtitle } from "@/lib/learning/track";
import { facilitatorGuides } from "@/lib/academy/facilitator-guide";
import { getActivityStatus, summarizeActivityStatuses } from "@/lib/academy/activity-status";
import { getChildJourneyProgress, type FirestoreProgressEvent } from "@/lib/academy/data-access";

interface MonitorSearchParams {
  sessionId?: string | undefined;
  activityId?: string | undefined;
}

export const Route = createFileRoute("/academy/session/monitor")({
  validateSearch: (search: Record<string, unknown>): MonitorSearchParams => ({
    sessionId: search["sessionId"] as string | undefined,
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
  const { sessionId, activityId } = search;

  // Local state
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteMode, setNoteMode] = useState<"view" | "edit">("view");
  const [savingNote, setSavingNote] = useState(false);
  const [attendanceChanges, setAttendanceChanges] = useState<
    Record<string, "present" | "absent" | "unknown">
  >({});

  // Get facilitator session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });

  // Load academy dashboard
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useAcademyDashboard(
    session ? { uid: session.uid, email: session.email, displayName: session.displayName } : null,
  );

  // Load persisted session (if sessionId provided)
  const { data: persistedSession, isLoading: sessionDataLoading } = useAcademySession(
    sessionId ?? null,
    session?.uid ?? null,
  );

  // Determine active activity ID (from session or param)
  const effectiveActivityId = sessionId ? persistedSession?.activityId : activityId;

  // Load journey progress for all learners
  const { data: learnerJourneyData, isLoading: journeyLoading } = useQuery({
    queryKey: ["academy-activity-monitoring", session?.uid, effectiveActivityId],
    queryFn: async () => {
      if (
        !dashboardData?.assignedChildren ||
        !dashboardData.progressSummaries ||
        !effectiveActivityId
      ) {
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
    enabled: !!dashboardData?.assignedChildren && !!effectiveActivityId,
    staleTime: 30_000,
  });

  // Mutations
  const updateAttendanceMutation = useUpdateSessionAttendance();
  const updateNoteMutation = useUpdateSessionNote();
  const completeSessionMutation = useCompleteAcademySession();

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.isFacilitator) {
      navigate({ to: "/academy/login", replace: true });
    }
  }, [sessionLoading, session?.isFacilitator, navigate]);

  // Load initial note from session
  useEffect(() => {
    if (persistedSession?.facilitatorNote) {
      setNoteText(persistedSession.facilitatorNote);
    }
    // Load initial attendance from session
    if (persistedSession?.attendance) {
      setAttendanceChanges(persistedSession.attendance);
    }
  }, [persistedSession]);

  // Show loading states
  if (sessionLoading || dashboardLoading || journeyLoading || sessionDataLoading) {
    return (
      <AcademyShell>
        <LoadingState label="Loading session monitoring…" />
      </AcademyShell>
    );
  }

  if (!session?.isFacilitator) {
    return null;
  }

  // Require either sessionId or activityId
  if (!effectiveActivityId) {
    return (
      <AcademyShell>
        <EmptyState
          title="No activity selected"
          description="Please select an activity to monitor."
          action={
            <div className="flex gap-2">
              <Button to="/academy/session">View guide</Button>
              <Button to="/academy/cohorts" variant="outline">
                Cohorts
              </Button>
            </div>
          }
        />
      </AcademyShell>
    );
  }

  // For persistent sessions, verify ownership
  if (sessionId && persistedSession && persistedSession.facilitatorUid !== session.uid) {
    return (
      <AcademyShell>
        <EmptyState
          title="Session not available"
          description="This session belongs to another facilitator."
          action={<Button to="/academy/cohorts">Back to cohorts</Button>}
        />
      </AcademyShell>
    );
  }

  // For completed sessions, show read-only summary
  if (persistedSession && persistedSession.status === "completed") {
    const duration = computeSessionDuration(persistedSession);
    const attendance = computeAttendanceSummary(persistedSession);

    return (
      <AcademyShell>
        <div className="space-y-6">
          <div>
            <button
              onClick={() => navigate({ to: "/academy/cohorts" })}
              className="mb-3 text-sm font-medium text-primary hover:underline"
            >
              ← Back to cohorts
            </button>
            <h1 className="text-3xl font-bold text-foreground">Session Completed</h1>
            <p className="mt-1 text-base text-muted-foreground">
              {persistedSession.activityTitle || effectiveActivityId}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <p className="text-xs text-muted-foreground uppercase font-medium">Duration</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {duration ? `${duration} min` : "—"}
              </p>
            </Card>

            <Card>
              <p className="text-xs text-muted-foreground uppercase font-medium">Attendance</p>
              <p className="mt-2 text-base font-bold text-foreground">
                {attendance.present} present, {attendance.absent} absent, {attendance.unknown}{" "}
                unknown
              </p>
            </Card>
          </div>

          {persistedSession.facilitatorNote && (
            <Card>
              <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
                Facilitator Note
              </p>
              <p className="text-sm text-foreground">{persistedSession.facilitatorNote}</p>
            </Card>
          )}

          <div className="flex gap-2">
            <Button to="/academy/cohorts" variant="primary">
              Back to Cohorts
            </Button>
            <Button to="/academy/dashboard" variant="outline">
              Dashboard
            </Button>
          </div>
        </div>
      </AcademyShell>
    );
  }

  // Compute activity statuses (must be outside conditional rendering)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const activityStatuses = useMemo(() => {
    if (!learnerJourneyData || !dashboardData?.progressSummaries || !effectiveActivityId) return [];

    return dashboardData.progressSummaries.map((learner) => {
      const journeyProgress = learnerJourneyData[learner.childId] || [];
      return getActivityStatus(learner, effectiveActivityId, journeyProgress);
    });
  }, [learnerJourneyData, dashboardData?.progressSummaries, effectiveActivityId]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const statusSummary = useMemo(
    () => summarizeActivityStatuses(activityStatuses),
    [activityStatuses],
  );

  // Load track and activity
  const track = getTrack("save");
  const activity = track.sequence.find((item) => item.id === effectiveActivityId);

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

  // Activity metadata
  const guide = facilitatorGuides[effectiveActivityId];
  const activityTitle = itemTitle(track, activity);
  const activitySubtitle = itemSubtitle(track, activity);
  const position = track.sequence.findIndex((item) => item.id === effectiveActivityId) + 1;
  const totalActivities = track.sequence.length;

  // Get learners and compute activity statuses
  const learners = dashboardData?.progressSummaries || [];

  // Group learners by status
  const notStartedLearners = activityStatuses.filter((s) => s.status === "not-started");
  const inProgressLearners = activityStatuses.filter((s) => s.status === "in-progress");
  const completedLearners = activityStatuses.filter((s) => s.status === "completed");
  const onAnotherActivityLearners = activityStatuses.filter(
    (s) => s.status === "on-another-activity",
  );

  // Handler functions
  const handleAttendanceChange = (childId: string, status: "present" | "absent" | "unknown") => {
    setAttendanceChanges((prev) => ({
      ...prev,
      [childId]: status,
    }));

    if (sessionId && persistedSession) {
      updateAttendanceMutation.mutate({
        sessionId,
        facilitatorUid: session.uid,
        childId,
        status,
      });
    }
  };

  const handleSaveNote = async () => {
    if (!sessionId || !persistedSession) return;

    setSavingNote(true);
    try {
      await updateNoteMutation.mutateAsync({
        sessionId,
        facilitatorUid: session.uid,
        note: noteText,
      });
      setNoteMode("view");
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setSavingNote(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId || !persistedSession) return;

    setIsEndingSession(true);
    try {
      await completeSessionMutation.mutateAsync({
        sessionId,
        facilitatorUid: session.uid,
      });
      setShowEndConfirm(false);
      // Session completion will reload this component with completed status
    } catch (error) {
      console.error("Failed to end session:", error);
      setIsEndingSession(false);
    }
  };

  return (
    <AcademyShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() =>
                navigate({
                  to: `/academy/session?activityId=${effectiveActivityId}`,
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

        {/* Session Status (if persisted) */}
        {persistedSession && (
          <Card className="border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Session Status
                </p>
                <p className="mt-1 text-lg font-bold text-primary">
                  {persistedSession.status === "active" ? "● Session Active" : "Session Completed"}
                </p>
              </div>
              {persistedSession.status === "active" && (
                <Button size="md" variant="outline" onClick={() => setShowEndConfirm(true)}>
                  End Session
                </Button>
              )}
            </div>
          </Card>
        )}

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
              <p className="text-sm text-muted-foreground">Other Activity</p>
              <p className="mt-2 text-3xl font-bold text-muted-foreground">
                {statusSummary.onAnotherActivity}
              </p>
            </Card>
          </div>
        </div>

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

                    {/* Attendance selector (session only) */}
                    {sessionId && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAttendanceChange(status.learner.childId, "present")}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            attendanceChanges[status.learner.childId] === "present"
                              ? "bg-success text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(status.learner.childId, "absent")}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            attendanceChanges[status.learner.childId] === "absent"
                              ? "bg-destructive text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    )}

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

                    {/* Attendance selector (session only) */}
                    {sessionId && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAttendanceChange(status.learner.childId, "present")}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            attendanceChanges[status.learner.childId] === "present"
                              ? "bg-success text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(status.learner.childId, "absent")}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            attendanceChanges[status.learner.childId] === "absent"
                              ? "bg-destructive text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    )}

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

                    {/* Attendance selector (session only) */}
                    {sessionId && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAttendanceChange(status.learner.childId, "present")}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            attendanceChanges[status.learner.childId] === "present"
                              ? "bg-success text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(status.learner.childId, "absent")}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            attendanceChanges[status.learner.childId] === "absent"
                              ? "bg-destructive text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    )}

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

        {/* On Another Activity */}
        {onAnotherActivityLearners.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">Working On Another Activity</h2>
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

        {/* Facilitator Note (session only) */}
        {sessionId && (
          <Card>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Session Observation
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Learning and facilitation notes only (max 1000 characters)
                </p>
              </div>
              {noteMode === "view" && (
                <Button size="md" variant="outline" onClick={() => setNoteMode("edit")}>
                  Edit
                </Button>
              )}
            </div>

            {noteMode === "view" ? (
              noteText ? (
                <p className="text-sm text-foreground">{noteText}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No observation recorded yet.</p>
              )
            ) : (
              <div className="space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value.slice(0, 1000))}
                  placeholder="What did you observe? What should you follow up on?"
                  maxLength={1000}
                  className="w-full min-h-24 p-3 rounded border border-border bg-background text-foreground text-sm font-sans"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {noteText.length} / 1000 characters
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="md"
                      variant="outline"
                      onClick={() => {
                        setNoteMode("view");
                        if (persistedSession?.facilitatorNote) {
                          setNoteText(persistedSession.facilitatorNote);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="md" onClick={handleSaveNote} disabled={savingNote}>
                      {savingNote ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
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
                  to: `/academy/session?activityId=${effectiveActivityId}`,
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

        {/* End Session Confirmation Dialog */}
        {showEndConfirm && persistedSession && (
          <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
            <AlertDialogContent>
              <AlertDialogTitle>End this session?</AlertDialogTitle>
              <AlertDialogDescription>
                Your attendance and facilitator observation will be saved with this session.
                Learners can still continue their learning.
              </AlertDialogDescription>
              <div className="flex gap-2 justify-end">
                <AlertDialogCancel>Continue session</AlertDialogCancel>
                <AlertDialogAction onClick={handleEndSession} disabled={isEndingSession}>
                  {isEndingSession ? "Ending…" : "End session"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </AcademyShell>
  );
}
