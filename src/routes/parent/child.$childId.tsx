import { createFileRoute } from "@tanstack/react-router";
import {
  Page,
  PageHeader,
  Card,
  CardTitle,
  Avatar,
  Button,
  ProgressRing,
  LessonCard,
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/tati";
import { useChildProfile } from "@/lib/family";
import { useChildProgress } from "@/lib/progress/service";
import { getTrack } from "@/lib/learning/track";

export const Route = createFileRoute("/parent/child/$childId")({
  head: () => ({
    meta: [
      { title: "Child journey — TATI ChildSave parent portal" },
      {
        name: "description",
        content: "Progress, savings and plain-language insights for one child on the SAVE track.",
      },
      { property: "og:title", content: "Child journey — TATI ChildSave parent portal" },
      {
        property: "og:description",
        content: "See what your child is ready to talk about at home.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ParentChild,
});

function ParentChild() {
  const { childId } = Route.useParams();
  const { child, isLoading, isError, refetch } = useChildProfile(childId);
  const progress = useChildProgress(childId);
  const { track } = progress;
  const doneLesson = (id: string) =>
    progress.steps.some((s) => s.done && s.item.kind === "lesson" && s.item.id === id);

  if (isLoading) {
    return (
      <Page>
        <PageHeader backTo="/parent" title="Child journey" />
        <LoadingState label="Loading this learner…" />
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        <PageHeader backTo="/parent" title="Child journey" />
        <ErrorState onRetry={() => void refetch()} />
      </Page>
    );
  }

  if (!child) {
    return (
      <Page>
        <PageHeader backTo="/parent" title="Child journey" />
        <EmptyState
          title="We couldn't find that learner"
          description="Pick a child from your parent portal."
          action={<Button to="/parent">Back to parent portal</Button>}
        />
      </Page>
    );
  }

  const done = progress.events.length;
  const insights = progress.insights;

  return (
    <Page>
      <PageHeader backTo="/parent" eyebrow="Parent portal" title={`${child.name}'s journey`} />

      <Card className="flex items-center gap-4">
        <Avatar avatar={child.avatar} name={child.name} size="lg" ring="primary" />
        <div>
          <CardTitle>
            {child.name}, {child.age}
          </CardTitle>
          <p className="text-base text-muted-foreground">
            {child.curriculum_level ?? `Primary ${Math.max(1, child.age - 5)}`} · TATI Junior
          </p>
        </div>
      </Card>

      <div className="mt-4 flex justify-center">
        <ProgressRing
          value={done}
          max={track.sequence.length}
          caption="Journey steps done"
          tone="success"
          size={120}
        />
      </div>

      <h2 className="mb-3 mt-6 text-lg font-extrabold">What we're noticing</h2>
      <Card className="space-y-2">
        {insights.map((insight, i) => (
          <p key={i} className="text-base">
            • {insight}
          </p>
        ))}
      </Card>

      <h2 className="mb-3 mt-6 text-lg font-extrabold">Lessons</h2>
      <Card className="space-y-3">
        {track.lessons.map((lesson, i) => (
          <LessonCard
            key={lesson.id}
            index={i + 1}
            title={lesson.title}
            subtitle={`Lesson · ${lesson.minutes ?? 5} min`}
            minutes={lesson.minutes ?? 5}
            status={doneLesson(lesson.id) ? "done" : "ready"}
          />
        ))}
      </Card>

      <div className="mt-6 space-y-3">
        <Button to="/parent" variant="secondary">
          Back to all children
        </Button>
      </div>
    </Page>
  );
}
