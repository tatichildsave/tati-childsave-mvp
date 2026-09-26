import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, Button, EmptyState, LoadingState, Badge } from "@/components/tati";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { getFacilitatorSession } from "@/lib/auth/facilitator-auth.functions";
import { getTrack, itemTitle, itemSubtitle } from "@/lib/learning/track";
import { facilitatorGuides } from "@/lib/academy/facilitator-guide";

interface SessionSearchParams {
  activityId?: string | undefined;
}

export const Route = createFileRoute("/academy/session")({
  validateSearch: (search: Record<string, unknown>): SessionSearchParams => ({
    activityId: search["activityId"] as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Session Guide — TATI Academy" },
      {
        name: "description",
        content: "Facilitator guide for today's activity.",
      },
      { property: "og:title", content: "Session Guide — TATI Academy" },
      { property: "og:description", content: "Prepare and facilitate a TATI activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcademySession,
});

function AcademySession() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/academy/session" });
  const activityId = search["activityId"];

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["facilitator-session"],
    queryFn: getFacilitatorSession,
    staleTime: 60_000,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.isFacilitator) {
      navigate({ to: "/academy/login", replace: true });
    }
  }, [sessionLoading, session?.isFacilitator, navigate]);

  if (sessionLoading) {
    return (
      <AcademyShell>
        <LoadingState label="Loading session guide…" />
      </AcademyShell>
    );
  }

  // If not authenticated, don't render anything (useEffect will redirect)
  if (!session?.isFacilitator) {
    return null;
  }

  // Load track and activity data
  const track = getTrack("save");

  // Default to first activity if not specified
  const selectedActivityId = activityId || track.sequence[0]?.id;
  if (!selectedActivityId) {
    return (
      <AcademyShell>
        <EmptyState
          title="No activity selected"
          description="Please select an activity to view its facilitator guide."
          action={<Button to="/academy/cohorts">Back to cohorts</Button>}
        />
      </AcademyShell>
    );
  }

  // Find the activity in the track
  const activity = track.sequence.find((item) => item.id === selectedActivityId);
  if (!activity) {
    return (
      <AcademyShell>
        <EmptyState
          title="Activity not found"
          description="This activity is not part of the current track."
          action={<Button to="/academy/cohorts">Back to cohorts</Button>}
        />
      </AcademyShell>
    );
  }

  // Get facilitator guide for this activity
  const guide = facilitatorGuides[selectedActivityId];
  if (!guide) {
    return (
      <AcademyShell>
        <Card tone="muted">
          <p className="text-base font-bold text-foreground">
            Guide not available for this activity
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            A facilitator guide for this activity is coming soon.
          </p>
          <Button to="/academy/cohorts" variant="outline" className="mt-3">
            Back to cohorts
          </Button>
        </Card>
      </AcademyShell>
    );
  }

  // Get activity metadata
  const activityTitle = itemTitle(track, activity);
  const activitySubtitle = itemSubtitle(track, activity);

  // Find position in sequence
  const position = track.sequence.findIndex((item) => item.id === selectedActivityId) + 1;
  const totalActivities = track.sequence.length;

  return (
    <AcademyShell>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => navigate({ to: "/academy/cohorts" })}
              className="mb-3 text-sm font-medium text-primary hover:underline"
            >
              ← Back to cohorts
            </button>
            <h1 className="text-3xl font-bold text-foreground">{activityTitle}</h1>
            <p className="mt-1 text-base text-muted-foreground">{activitySubtitle}</p>
          </div>
        </div>

        {/* Activity Info Header */}
        <Card>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
              <p className="mt-1 font-bold text-foreground">{guide.estimatedMinutes || 10} min</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Type</p>
              <p className="mt-1 font-bold text-foreground capitalize">{activity.kind}</p>
            </div>
          </div>
        </Card>

        {/* Purpose Section */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">Why This Activity Matters</h2>
          <Card>
            <p className="text-base text-foreground leading-relaxed">{guide.purpose}</p>
          </Card>
        </div>

        {/* Before the Session */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">Before Learners Begin</h2>
          <Card>
            <div className="space-y-4">
              {guide.materials && guide.materials.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">You will need</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {guide.materials.map((material, i) => (
                      <li key={i} className="flex gap-2">
                        <span>•</span>
                        <span>{material}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {guide.preparation && (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">Prepare</h3>
                  <ol className="space-y-1 text-sm text-muted-foreground whitespace-pre-wrap">
                    {guide.preparation}
                  </ol>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Opening */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">Your Opening</h2>
          <Card>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold text-foreground mb-2">What to say</p>
                <p className="text-base text-foreground italic">{guide.opening}</p>
              </div>
              {guide.openingQuestion && (
                <div className="border-t border-border pt-3">
                  <p className="text-sm font-bold text-foreground mb-2">
                    Optional opening question
                  </p>
                  <p className="text-base text-foreground italic">{guide.openingQuestion}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Learner Activity Instructions */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">Learners Now</h2>
          <Card>
            <div className="whitespace-pre-wrap text-base text-foreground leading-relaxed">
              {guide.learnerInstructions}
            </div>
          </Card>
        </div>

        {/* What to Observe */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">While Learners Work</h2>
          <Card>
            <p className="text-sm text-muted-foreground mb-3 font-medium">Look for:</p>
            <ul className="space-y-2">
              {guide.observationPoints.map((point, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground">
                  <span className="text-primary font-bold">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Discussion / Debrief */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">Discuss Together</h2>
          <Card>
            <ul className="space-y-2">
              {guide.discussionPrompts.map((prompt, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary font-bold text-sm">Q.</span>
                  <span className="text-base text-foreground">{prompt}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Key Learning */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-2">Key Learning</h2>
          <Card tone="muted">
            <p className="text-base font-medium text-foreground">{guide.keyLearning}</p>
          </Card>
        </div>

        {/* Support Tips */}
        <div className="space-y-3">
          {guide.supportIfStuck && (
            <div>
              <h3 className="text-base font-bold text-foreground mb-2">If a learner is stuck</h3>
              <Card>
                <p className="text-base text-foreground">{guide.supportIfStuck}</p>
              </Card>
            </div>
          )}

          {guide.extensionPrompt && (
            <div>
              <h3 className="text-base font-bold text-foreground mb-2">If learners finish early</h3>
              <Card>
                <p className="text-base text-foreground italic">{guide.extensionPrompt}</p>
              </Card>
            </div>
          )}
        </div>

        {/* Navigation and CTA */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={() => navigate({ to: "/academy/cohorts" })}>
              Back to cohorts
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => navigate({ to: "/academy/dashboard" })}
            >
              Dashboard
            </Button>
          </div>

          {/* Primary CTA - Start Activity */}
          <Button
            size="lg"
            className="min-w-[200px]"
            onClick={() =>
              navigate({
                to: `/academy/session/start?activityId=${selectedActivityId}`,
              })
            }
          >
            Start Activity →
          </Button>
        </div>

        {/* Note about navigation */}
        <Card tone="muted">
          <p className="text-xs text-muted-foreground">
            📌 <strong>Note:</strong> Clicking "Start Activity" will guide learners to begin their
            work. Each learner's progress is tracked as they complete activities independently.
          </p>
        </Card>
      </div>
    </AcademyShell>
  );
}
