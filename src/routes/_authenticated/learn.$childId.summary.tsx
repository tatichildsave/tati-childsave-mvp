import { createFileRoute, Link, redirect, useParams } from "@tanstack/react-router";
import { Screen, Card, TopBar } from "@/components/learning/primitives";
import { SkillBars } from "@/components/gamification/SkillBars";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";
import { useChildProgress } from "@/lib/progress/service";
import { assertChildInCurrentFamily } from "@/lib/family";

export const Route = createFileRoute("/_authenticated/learn/$childId/summary")({
  beforeLoad: async ({ params }) => {
    try {
      await assertChildInCurrentFamily(params.childId);
    } catch {
      throw redirect({ to: "/parent" });
    }
  },
  head: () => ({
    meta: [
      { title: "How my money skills grew — TATI ChildSave" },
      {
        name: "description",
        content: "A warm look at the money skills your child grew on the SAVE journey.",
      },
      { property: "og:title", content: "How my money skills grew — TATI ChildSave" },
      { property: "og:description", content: "A warm look at the money skills grown on the SAVE journey." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SummaryPage,
});

function SummaryPage() {
  const { childId } = useParams({ from: "/_authenticated/learn/$childId/summary" });
  const { game, competency, assessments, insights, isLoading } = useChildProgress(childId);
  const strong = competency.strengths;
  const growing = competency.stillDeveloping;
  const post = assessments.postDone;

  return (
    <Screen>
      <TopBar title="My money skills" backTo={`/learn/${childId}`} />

      <Card className="bg-accent text-accent-foreground">
        <h2 className="text-2xl font-bold">{competency.headline}</h2>
        <p className="mt-1">
          You finished {game.journey.done} of {game.journey.total} stops, earned {game.xp} XP and collected{" "}
          {game.earnedBadges.length} badge{game.earnedBadges.length === 1 ? "" : "s"}.
        </p>
      </Card>

      {isLoading ? (
        <p className="mt-5 rounded-3xl border border-dashed border-border p-6 text-center text-muted-foreground">
          Loading your skills…
        </p>
      ) : null}

      {strong.length > 0 ? (
        <Card className="mt-5">
          <h3 className="text-lg font-bold">Your superpowers 💪</h3>
          <p className="mt-1 text-sm text-muted-foreground">These are the skills you showed most often.</p>
          <div className="mt-4">
            <SkillBars skills={strong} />
          </div>
        </Card>
      ) : null}

      {growing.length > 0 ? (
        <Card className="mt-5">
          <h3 className="text-lg font-bold">Still growing 🌱</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Skills you are building. Every practice makes these stronger.
          </p>
          <div className="mt-4">
            <SkillBars skills={growing} tone="growing" />
          </div>
        </Card>
      ) : null}

      {!post ? (
        <Card className="mt-5">
          <h3 className="text-lg font-bold">One last check-in</h3>
          <p className="mt-2">
            Finish the final money check-in to see how much your thinking has grown since day one.
          </p>
          <Link
            to="/learn/$childId/assessment/$assessmentId"
            params={{ childId, assessmentId: "save-post" }}
            className="mt-4 flex min-h-[48px] items-center justify-center rounded-2xl bg-primary px-6 font-semibold text-primary-foreground"
          >
            Start the final check-in →
          </Link>
        </Card>
      ) : null}

      <div className="mt-6">
        <BadgeGrid badges={game.badges} title="Badges you collected" />
      </div>

      <Card className="mt-1">
        <h3 className="text-lg font-bold">For your grown-up</h3>
        <ul className="mt-3 space-y-2">
          {insights.map((i) => (
            <li key={i} className="rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
              {i}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-5">
        <h3 className="text-lg font-bold">Ready for next time</h3>
        <p className="mt-2 text-lg">
          Choose one real goal together this week — an amount and a date — and decide where the money
          will sleep: a money box, a Mobile Money wallet, or a children's bank account.
        </p>
      </Card>

      {post ? (
        <Link
          to="/learn/$childId/feedback"
          params={{ childId }}
          className="mt-5 flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-primary bg-primary-soft text-base font-semibold text-primary"
        >
          Tell us how it felt
        </Link>
      ) : null}

      <Link
        to="/dashboard"
        className="mt-6 flex min-h-[48px] items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground"
      >
        Back to the parent space
      </Link>
    </Screen>
  );
}
