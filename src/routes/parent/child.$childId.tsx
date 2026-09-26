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
      <Page role="parent">
        <PageHeader backTo="/parent" title="Child journey" />
        <LoadingState label="Loading this learner…" />
      </Page>
    );
  }

  if (isError) {
    return (
      <Page role="parent">
        <PageHeader backTo="/parent" title="Child journey" />
        <ErrorState onRetry={() => void refetch()} />
      </Page>
    );
  }

  if (!child) {
    return (
      <Page role="parent">
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
    <Page role="parent">
      <PageHeader backTo="/parent" eyebrow="Parent portal" title={`${child.name}'s journey`} />

      {/* Child Profile Card */}
      <Card tone="surface" className="mb-6 flex items-center gap-4">
        <Avatar avatar={child.avatar} name={child.name} size="lg" />
        <div>
          <h1 className="text-2xl font-extrabold">
            {child.name}, {child.age}
          </h1>
          <p className="text-sm font-bold text-muted-foreground">
            {child.curriculum_level ?? `Primary ${Math.max(1, child.age - 5)}`} learner
          </p>
        </div>
      </Card>

      {/* Progress Ring */}
      <Card tone="primary" className="mb-6 flex justify-center py-8">
        <div className="text-center">
          <ProgressRing
            value={done}
            max={track.sequence.length}
            caption="Learning steps completed"
            tone="success"
            size={120}
          />
        </div>
      </Card>

      {/* Insights Section */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-extrabold">💡 What we're noticing</h2>
        {insights.length > 0 ? (
          <Card tone="muted" className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-primary" aria-hidden="true">
                  ✓
                </span>
                <p className="text-base text-muted-foreground">{insight}</p>
              </div>
            ))}
          </Card>
        ) : (
          <Card tone="muted">
            <p className="text-center text-sm text-muted-foreground">
              Insights will appear as {child.name} progresses through lessons.
            </p>
          </Card>
        )}
      </div>

      {/* Lessons Section */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-extrabold">📖 Lessons</h2>
        <div className="space-y-2">
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
        </div>
      </div>

      {/* Action Button */}
      <Button to="/parent" variant="secondary" size="md" full>
        Back to all children
      </Button>
    </Page>
  );
}
