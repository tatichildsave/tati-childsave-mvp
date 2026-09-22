import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader, Card, LessonCard, ScenarioCard, ProgressBar } from "@/components/tati";
import { getTrack, itemTitle, itemSubtitle } from "@/lib/learning/track";
import { useChildLearning } from "@/lib/auth/use-child-learning";

export const Route = createFileRoute("/child/learn")({
  head: () => ({
    meta: [
      { title: "My learning journey — TATI ChildSave" },
      {
        name: "description",
        content:
          "Mini-lessons and decision stories on the SAVE track, unlocked one step at a time.",
      },
      { property: "og:title", content: "My learning journey — TATI ChildSave" },
      {
        property: "og:description",
        content: "Lessons and decision stories for learners aged 8–12.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChildLearn,
});

function ChildLearn() {
  const { snapshot, isLoading, isError } = useChildLearning();
  const track = getTrack("save");

  if (isLoading || !snapshot) {
    return (
      <Page withBottomNav>
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Opening your journey…
        </p>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page withBottomNav>
        <PageHeader backTo="/child/home" title="My learning journey" />
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          We could not load your journey. Please try again.
        </p>
      </Page>
    );
  }

  const lessonSteps = snapshot.steps.filter(({ item }) => item.kind === "lesson");
  const scenarioSteps = snapshot.steps.filter(({ item }) => item.kind === "scenario");
  const childPath = (kind: string, id: string) => {
    if (kind === "lesson") return `/child/lesson/${id}`;
    if (kind === "scenario") return `/child/scenario/${id}`;
    if (kind === "assessment") return `/child/assessment/${id}`;
    return `/child/reflection/${id}`;
  };

  return (
    <Page withBottomNav>
      <PageHeader
        backTo="/child/home"
        eyebrow="Track: SAVE"
        title="My learning journey"
        subtitle="Learn, decide, see what happens, then adjust your plan."
        listenable
      />

      <Card>
        <ProgressBar
          value={snapshot.journey.doneItems.length}
          max={snapshot.track.sequence.length}
          label={`${snapshot.journey.doneItems.length} of ${snapshot.track.sequence.length} journey stops finished`}
          showPercent
          tone="success"
        />
      </Card>

      <h2 className="mb-3 mt-6 text-lg font-extrabold">Mini-lessons</h2>
      <Card className="space-y-3">
        {lessonSteps.map(({ item, index, done, locked }) => (
          <LessonCard
            key={item.id}
            index={index + 1}
            title={itemTitle(track, item)}
            subtitle={itemSubtitle(track, item)}
            status={done ? "done" : locked ? "locked" : "ready"}
            to={childPath(item.kind, item.id)}
          />
        ))}
      </Card>

      <h2 className="mb-3 mt-6 text-lg font-extrabold">Decision stories</h2>
      <div className="space-y-4">
        {scenarioSteps.map(({ item, done, locked }) => (
          <ScenarioCard
            key={item.id}
            title={itemTitle(track, item)}
            description={item.blurb ?? "Make a money choice, see what happens, and keep learning."}
            status={done ? "done" : locked ? "locked" : "ready"}
            to={childPath(item.kind, item.id)}
          />
        ))}
      </div>
    </Page>
  );
}
