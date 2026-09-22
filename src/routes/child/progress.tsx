import { createFileRoute } from "@tanstack/react-router";
import {
  Page,
  PageHeader,
  Card,
  CardTitle,
  ProgressRing,
  ProgressBar,
  Badge,
  XPIndicator,
} from "@/components/tati";
import { useChildLearning } from "@/lib/auth/use-child-learning";

export const Route = createFileRoute("/child/progress")({
  head: () => ({
    meta: [
      { title: "My progress — TATI ChildSave" },
      {
        name: "description",
        content: "See how much you've saved, how far you've come and the badges ahead.",
      },
      { property: "og:title", content: "My progress — TATI ChildSave" },
      { property: "og:description", content: "Savings, lessons and badges at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChildProgress,
});

function ChildProgress() {
  const { data, snapshot, isLoading, isError } = useChildLearning();

  if (isLoading || !data || !snapshot) {
    return (
      <Page withBottomNav>
        <PageHeader backTo="/child/home" eyebrow="My numbers" title="My progress" />
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Loading your progress…
        </p>
      </Page>
    );
  }
  if (isError) {
    return (
      <Page withBottomNav>
        <PageHeader backTo="/child/home" eyebrow="My numbers" title="My progress" />
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          We could not load your progress.
        </p>
      </Page>
    );
  }

  return (
    <Page withBottomNav>
      <PageHeader backTo="/child/home" eyebrow="My numbers" title="My progress" listenable />

      <Card className="flex flex-col items-center gap-4 text-center">
        <ProgressRing
          value={snapshot.journey.savedCedis}
          max={snapshot.track.goal?.target ?? 80}
          caption="Towards my goal"
          tone="success"
          size={120}
        />
        <p className="text-base text-muted-foreground">
          GH₵{snapshot.journey.savedCedis} saved of GH₵{snapshot.track.goal?.target ?? 80}. Small
          amounts, kept often, add up.
        </p>
      </Card>

      <XPIndicator xp={snapshot.game.xp} level={snapshot.game.level} className="mt-4" />

      <Card className="mt-4">
        <CardTitle>Lessons</CardTitle>
        <div className="mt-3">
          <ProgressBar
            value={snapshot.journey.doneItems.length}
            max={snapshot.track.sequence.length}
            label={`${snapshot.journey.doneItems.length} of ${snapshot.track.sequence.length} finished`}
            showPercent
          />
        </div>
      </Card>

      <h2 className="mb-3 mt-6 text-lg font-extrabold">Badges</h2>
      <div className="grid grid-cols-3 gap-3">
        {data.achievements.map((a) => (
          <Card key={a.achievement_id} className="text-center">
            <span aria-hidden="true" className="text-3xl">
              🏅
            </span>
            <p className="mt-2 text-sm font-extrabold">{a.achievement_id}</p>
            <div className="mt-2 flex justify-center">
              <Badge tone="success">Earned</Badge>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <CardTitle>Skills I am growing</CardTitle>
        <div className="mt-3 space-y-2">
          {data.competencies.map((competency) => (
            <div
              key={competency.competency_id}
              className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3"
            >
              <span className="font-bold">{competency.competency_id}</span>
              <span className="text-sm text-muted-foreground">{competency.level}</span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
