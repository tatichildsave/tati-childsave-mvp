import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader, Card, CardTitle, CardNote, Button, Badge } from "@/components/tati";
import { useChildLearning } from "@/lib/auth/use-child-learning";

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

  if (isLoading || !data || !snapshot) {
    return (
      <Page withBottomNav>
        <PageHeader backTo="/child/home" eyebrow="My results" title="What I learned" />
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Loading your results…
        </p>
      </Page>
    );
  }
  if (isError) {
    return (
      <Page withBottomNav>
        <PageHeader backTo="/child/home" eyebrow="My results" title="What I learned" />
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          We could not load your results.
        </p>
      </Page>
    );
  }
  const latestAssessment = data.assessments[data.assessments.length - 1];

  return (
    <Page withBottomNav>
      <PageHeader
        backTo="/child/home"
        eyebrow="Let's see what happened"
        title="What I learned"
        listenable
      />

      <Card className="text-center">
        <span aria-hidden="true" className="text-4xl">
          🎉
        </span>
        <h2 className="mt-2 text-2xl font-extrabold">
          Nice work, {data.profile.name.split(" ")[0]}!
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          You made your choices and saw what happened. That's exactly how savers learn.
        </p>
        <div className="mt-3 flex justify-center">
          <Badge tone="success" icon="⭐">
            {snapshot.game.xp} XP earned
          </Badge>
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitle>Your journey so far</CardTitle>
        <CardNote>
          {snapshot.journey.doneItems.length} of {snapshot.track.sequence.length} activities
          complete. {snapshot.competency.headline}
        </CardNote>
      </Card>

      <Card className="mt-3">
        <CardTitle>Latest check-in</CardTitle>
        <CardNote>
          {latestAssessment
            ? `${latestAssessment.points} of ${latestAssessment.max_points} points across your money skills.`
            : "Complete a check-in to see what you are learning."}
        </CardNote>
      </Card>

      <div className="mt-6 space-y-3">
        <Button to="/child/learn" size="lg">
          Continue my journey →
        </Button>
        <Button to="/child/progress" variant="secondary">
          See my progress
        </Button>
      </div>
    </Page>
  );
}
