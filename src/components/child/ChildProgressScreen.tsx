import { ArrowRight, Award, Check, Sparkles, TrendingUp } from "lucide-react";
import { Badge, Button, Card, Page, PageHeader, ProgressBar, XPIndicator } from "@/components/tati";
import type { ChildLearningData } from "@/lib/auth/child-learning.functions";
import { childItemPath } from "@/lib/learning/track";
import type { ProgressSnapshot } from "@/lib/progress/snapshot";

type ChildProgressScreenProps = {
  snapshot: ProgressSnapshot;
  achievements: ChildLearningData["achievements"];
  competencies: ChildLearningData["competencies"];
};

export function ChildProgressScreen({
  snapshot,
  achievements,
  competencies,
}: ChildProgressScreenProps) {
  const targetAmount = snapshot.track.goal?.target ?? 80;
  const goalLabel = snapshot.track.goal?.title ?? "My savings goal";
  const savingsPercent =
    targetAmount > 0
      ? Math.min(100, Math.round((snapshot.journey.savedCedis / targetAmount) * 100))
      : 0;
  const completedStops = snapshot.steps.filter((step) => step.done).length;
  const totalStops = snapshot.steps.length;
  const earnedBadges = snapshot.game.earnedBadges;

  return (
    <Page withBottomNav role="junior">
      <PageHeader
        backTo="/child/home"
        eyebrow="My numbers"
        title="My progress"
        subtitle="See your savings growth, level and skills in one place."
        listenable
      />

      <section aria-labelledby="savings-goal-title" className="mb-6">
        <Card className="rounded-[28px] border border-[#c9d9fa] bg-white p-5 shadow-card sm:p-6">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="savings-goal-title" className="text-lg font-extrabold text-[#0f2248]">
                Savings goal
              </h2>
              <p className="mt-0.5 text-sm font-bold text-muted-foreground">{goalLabel}</p>
            </div>
            <span className="rounded-full bg-[#e9f1ff] px-3 py-1 text-sm font-extrabold text-primary">
              {savingsPercent}%
            </span>
          </div>
          <p className="text-3xl font-extrabold text-[#0f2248]">
            GH₵{snapshot.journey.savedCedis}
            <span className="ml-1 text-lg font-bold text-muted-foreground">
              of GH₵{targetAmount}
            </span>
          </p>
          <ProgressBar
            value={snapshot.journey.savedCedis}
            max={Math.max(1, targetAmount)}
            label={`${snapshot.journey.savedCedis} cedis saved`}
            showPercent={false}
            className="mt-3"
          />
          <p className="mt-3 text-sm font-bold text-muted-foreground">
            Day {snapshot.journey.dayNumber} of {snapshot.track.goal?.daysTotal ?? 14}
          </p>
        </Card>
      </section>

      <section aria-labelledby="journey-growth-title" className="mb-6">
        <h2 id="journey-growth-title" className="mb-3 text-xl font-extrabold text-[#0f2248]">
          Journey growth
        </h2>
        <Card className="rounded-[28px] border border-[#dce6fa] bg-white p-5 shadow-card sm:p-6">
          <XPIndicator xp={snapshot.game.xp} level={snapshot.game.level} className="mb-4" />
          <ProgressBar
            value={completedStops}
            max={Math.max(1, totalStops)}
            label={`${completedStops} of ${totalStops} journey stops complete`}
            showPercent={false}
            tone="success"
          />
          <Button
            to={snapshot.currentItem ? childItemPath(snapshot.currentItem) : "/child/results"}
            className="mt-4 min-h-[52px] w-full rounded-full bg-[#003DA5] text-white hover:bg-[#002f80]"
          >
            {snapshot.currentItem ? "Continue Adventure" : "View my results"}
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </Button>
        </Card>
      </section>

      <section aria-labelledby="badges-title" className="mb-6">
        <h2 id="badges-title" className="mb-3 text-xl font-extrabold text-[#0f2248]">
          Badges earned
        </h2>
        {earnedBadges.length > 0 ? (
          <div className="space-y-2.5">
            {earnedBadges.map((badge) => (
              <Card
                key={badge.definition.id}
                className="rounded-2xl border border-[#e3e9f8] bg-white px-4 py-3 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9f1ff] text-primary">
                    <Award aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-[#102346]">
                      {badge.definition.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{badge.definition.blurb}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : achievements.length > 0 ? (
          <div className="space-y-2.5">
            {achievements.map((achievement) => (
              <Card
                key={achievement.achievement_id}
                className="rounded-2xl border border-[#e3e9f8] bg-white px-4 py-3 shadow-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-[#102346]">
                    {achievement.achievement_id}
                  </p>
                  <Badge tone="success">Earned</Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card tone="muted">
            <p className="text-sm text-muted-foreground">
              Complete more adventures to unlock your first badge.
            </p>
          </Card>
        )}
      </section>

      <section aria-labelledby="skills-title">
        <h2 id="skills-title" className="mb-3 text-xl font-extrabold text-[#0f2248]">
          Skills growing
        </h2>
        {snapshot.competency.growth.length > 0 ? (
          <div className="space-y-2.5">
            {snapshot.competency.growth.slice(0, 4).map((skill) => (
              <Card
                key={skill.competency}
                className="rounded-2xl border border-[#e3e9f8] bg-white px-4 py-3 shadow-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold text-[#102346]">
                      {skill.label}
                    </h3>
                    <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                      {skill.grew ? "You improved in this skill." : "Keep practicing this skill."}
                    </p>
                  </div>
                  <Badge tone={skill.strength === "super" ? "success" : "primary"}>
                    {skill.strength === "super"
                      ? "Super"
                      : skill.strength === "strong"
                        ? "Strong"
                        : "Growing"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : competencies.length > 0 ? (
          <div className="space-y-2.5">
            {competencies.slice(0, 4).map((competency) => (
              <Card
                key={competency.competency_id}
                className="rounded-2xl border border-[#e3e9f8] bg-white px-4 py-3 shadow-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-extrabold text-[#102346]">
                    {competency.competency_id}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-primary">
                    <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
                    {competency.level}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card tone="muted">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              <p>Complete learning stops to unlock visible skill progress.</p>
            </div>
          </Card>
        )}
      </section>

      {snapshot.journey.complete ? (
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#e9f8ee] px-3 py-1 text-xs font-extrabold text-success-foreground">
          <Check aria-hidden="true" className="h-3.5 w-3.5" />
          Journey complete
        </p>
      ) : null}
    </Page>
  );
}
