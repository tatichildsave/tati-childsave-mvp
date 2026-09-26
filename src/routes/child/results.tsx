import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader, Card, Button, Badge } from "@/components/tati";
import { useChildLearning } from "@/lib/auth/use-child-learning";
import { CelebrationOverlay } from "@/components/gamification/CelebrationOverlay";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/child/results")({
  head: () => ({
    meta: [
      { title: "What I learned — TATI ChildSave" },
      {
        name: "description",
        content: "A warm summary of the choices you made and what you can try next time.",
      },
      { property: "og:title", content: "What I learned — TATI ChildSave" },
      { property: "og:description", content: "Every decision teaches you something." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChildResults,
});

function ChildResults() {
  const { data, snapshot, isLoading, isError } = useChildLearning();
  const [showCelebration, setShowCelebration] = useState(true);

  if (isLoading || !data || !snapshot) {
    return (
      <Page withBottomNav role="junior">
        <PageHeader backTo="/child/home" eyebrow="My results" title="What I learned" />
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p className="font-bold">Loading your results…</p>
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page withBottomNav role="junior">
        <PageHeader backTo="/child/home" eyebrow="My results" title="What I learned" />
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p>We could not load your results. Please try again.</p>
        </div>
      </Page>
    );
  }

  const latestAssessment = data.assessments[data.assessments.length - 1];
  const firstName = data.profile.name.split(" ")[0];
  const newBadges = data.achievements.slice(-1); // Show most recent badge if any
  const hasBadges = newBadges.length > 0;

  return (
    <Page withBottomNav role="junior">
      {showCelebration && hasBadges && (
        <CelebrationOverlay
          title={`🎉 Badge Unlocked!`}
          message={`You earned "${newBadges[0]!.achievement_id}"!`}
          badgeIcons={["🏆"]}
          xp={snapshot.game.xp}
          primaryLabel="Continue"
          onPrimary={() => setShowCelebration(false)}
        />
      )}

      <PageHeader
        backTo="/child/home"
        eyebrow="Let's see what happened"
        title="What I learned"
        listenable
      />

      {/* Success Message */}
      <Card tone="primary" className="mb-6 py-8 text-center text-white">
        <p className="text-4xl mb-2">🎉</p>
        <h2 className="text-2xl font-extrabold mb-2">Nice work, {firstName}!</h2>
        <p className="text-base text-white/80">
          You made your choices and saw what happened. That's exactly how savers learn.
        </p>
      </Card>

      {/* XP Earned */}
      <Card tone="surface" className="mb-6">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold">XP Earned This Journey</span>
          <Badge tone="success" className="text-lg font-extrabold">
            ⭐ {snapshot.game.xp}
          </Badge>
        </div>
      </Card>

      {/* Journey Progress */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-extrabold">📊 Your journey so far</h2>
        <Card tone="surface">
          <div className="space-y-2">
            <p className="text-base font-bold">
              {snapshot.journey.doneItems.length} of {snapshot.track.sequence.length} activities
              complete
            </p>
            <p className="text-sm text-muted-foreground">{snapshot.competency.headline}</p>
          </div>
        </Card>
      </div>

      {/* Latest Check-in Results */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-extrabold">📋 Latest check-in</h2>
        <Card tone="surface">
          <p className="text-base font-bold">
            {latestAssessment
              ? `${latestAssessment.points} of ${latestAssessment.max_points} points`
              : "No check-in completed yet"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {latestAssessment
              ? `Across your money skills`
              : `Complete a check-in to see what you are learning.`}
          </p>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button to="/child/learn" size="lg" full>
          Continue my journey →
        </Button>
        <Button to="/child/progress" variant="secondary" full>
          See my progress
        </Button>
      </div>
    </Page>
  );
}
