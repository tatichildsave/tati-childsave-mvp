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
      <Page withBottomNav role="junior">
        <PageHeader backTo="/child/home" eyebrow="My numbers" title="My progress" />
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p className="font-bold">Loading your progress…</p>
        </div>
      </Page>
    );
  }
  if (isError) {
    return (
      <Page withBottomNav role="junior">
        <PageHeader backTo="/child/home" eyebrow="My numbers" title="My progress" />
        <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <p>We could not load your progress.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page withBottomNav role="junior">
      <PageHeader backTo="/child/home" eyebrow="My numbers" title="My progress" listenable />

      {/* Savings Goal */}
      <Card
        tone="primary"
        className="mb-6 flex flex-col items-center gap-4 py-8 text-center text-white"
      >
        <ProgressRing
          value={snapshot.journey.savedCedis}
          max={snapshot.track.goal?.target ?? 80}
          caption="Towards my goal"
          tone="success"
          size={120}
        />
        <p className="text-base text-white/80">
          GH₵{snapshot.journey.savedCedis} saved of GH₵{snapshot.track.goal?.target ?? 80}
        </p>
        <p className="text-sm text-white/70">Small amounts, kept often, add up fast. 💪</p>
      </Card>

      {/* XP Level */}
      <XPIndicator xp={snapshot.game.xp} level={snapshot.game.level} className="mb-6" />

      {/* Lessons Progress */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-extrabold">📖 Lessons & stories</h2>
        <Card tone="surface">
          <ProgressBar
            value={snapshot.journey.doneItems.length}
            max={snapshot.track.sequence.length}
            label={`${snapshot.journey.doneItems.length} of ${snapshot.track.sequence.length} finished`}
            showPercent
            tone="success"
          />
        </Card>
      </div>

      {/* Badges Section */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-extrabold">🏆 Achievements earned</h2>
        {data.achievements.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.achievements.map((a) => (
              <Card
                key={a.achievement_id}
                tone="surface"
                className="flex flex-col items-center gap-2 text-center"
              >
                <span aria-hidden="true" className="text-3xl">
                  🏅
                </span>
                <p className="text-sm font-extrabold leading-tight">{a.achievement_id}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card tone="muted">
            <p className="text-center text-sm text-muted-foreground">
              Complete challenges to earn badges! 🌟
            </p>
          </Card>
        )}
      </div>

      {/* Skills Growing */}
      <div>
        <h2 className="mb-3 text-lg font-extrabold">💡 Skills I'm growing</h2>
        {data.competencies.length > 0 ? (
          <div className="space-y-2">
            {data.competencies.map((competency) => (
              <Card
                key={competency.competency_id}
                tone="surface"
                className="flex items-center justify-between"
              >
                <span className="font-bold">{competency.competency_id}</span>
                <Badge tone="primary">Level {competency.level}</Badge>
              </Card>
            ))}
          </div>
        ) : (
          <Card tone="muted">
            <p className="text-center text-sm text-muted-foreground">
              Skills grow as you complete lessons and scenarios. 📈
            </p>
          </Card>
        )}
      </div>
    </Page>
  );
}
