import { useState } from "react";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { Badge, Button, Card, Page, PageHeader, ProgressBar } from "@/components/tati";
import { CelebrationOverlay } from "@/components/gamification/CelebrationOverlay";
import type { ChildLearningData } from "@/lib/auth/child-learning.functions";
import type { ProgressSnapshot } from "@/lib/progress/snapshot";

type ChildResultsScreenProps = {
  snapshot: ProgressSnapshot;
  profileName: string;
  assessments: ChildLearningData["assessments"];
  achievements: ChildLearningData["achievements"];
};

export function ChildResultsScreen({
  snapshot,
  profileName,
  assessments,
  achievements,
}: ChildResultsScreenProps) {
  const [showCelebration, setShowCelebration] = useState(true);
  const firstName = profileName.split(" ")[0] ?? "Friend";
  const latestAssessment = assessments[assessments.length - 1];
  const newestAchievement = achievements[achievements.length - 1];
  const completedStops = snapshot.steps.filter((step) => step.done).length;
  const totalStops = snapshot.steps.length;

  return (
    <Page withBottomNav role="junior">
      {showCelebration && newestAchievement ? (
        <CelebrationOverlay
          title="🎉 Badge unlocked!"
          message={`You earned "${newestAchievement.achievement_id}"!`}
          badgeIcons={["🏆"]}
          xp={snapshot.game.xp}
          primaryLabel="Continue"
          onPrimary={() => setShowCelebration(false)}
        />
      ) : null}

      <PageHeader
        backTo="/child/home"
        eyebrow="Let's see what happened"
        title="What I learned"
        subtitle="Every choice teaches you something useful for next time."
        listenable
      />

      <section aria-labelledby="results-celebration-title" className="mb-6">
        <Card className="rounded-[28px] border border-[#c9d9fa] bg-white p-6 text-center shadow-card">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#e9f1ff] text-primary">
            <Trophy aria-hidden="true" className="h-7 w-7" />
          </span>
          <h2
            id="results-celebration-title"
            className="mt-3 text-3xl font-extrabold text-[#0f2248]"
          >
            Nice work, {firstName}!
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            You made decisions, saw outcomes, and built stronger money skills.
          </p>
        </Card>
      </section>

      <section aria-labelledby="journey-summary-title" className="mb-6">
        <h2 id="journey-summary-title" className="mb-3 text-xl font-extrabold text-[#0f2248]">
          Journey summary
        </h2>
        <Card className="rounded-[28px] border border-[#dce6fa] bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-extrabold text-muted-foreground">XP earned</span>
            <Badge tone="success">⭐ {snapshot.game.xp}</Badge>
          </div>
          <ProgressBar
            value={completedStops}
            max={Math.max(1, totalStops)}
            label={`${completedStops} of ${totalStops} activities complete`}
            showPercent={false}
            tone="success"
          />
          <p className="mt-3 text-sm text-muted-foreground">{snapshot.competency.headline}</p>
        </Card>
      </section>

      <section aria-labelledby="checkin-title" className="mb-6">
        <h2 id="checkin-title" className="mb-3 text-xl font-extrabold text-[#0f2248]">
          Latest check-in
        </h2>
        <Card className="rounded-2xl border border-[#e3e9f8] bg-white px-4 py-4 shadow-card">
          {latestAssessment ? (
            <div className="space-y-1">
              <p className="text-lg font-extrabold text-[#102346]">
                {latestAssessment.points} of {latestAssessment.max_points} points
              </p>
              <p className="text-sm text-muted-foreground">
                You checked in across your money skills.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              <p>Complete a check-in to see your latest learning snapshot.</p>
            </div>
          )}
        </Card>
      </section>

      <div className="space-y-3">
        <Button to="/child/learn" size="lg" className="min-h-[54px] w-full rounded-full">
          Continue my journey
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </Button>
        <Button
          to="/child/progress"
          variant="secondary"
          className="min-h-[50px] w-full rounded-full"
        >
          See my progress
        </Button>
      </div>
    </Page>
  );
}
