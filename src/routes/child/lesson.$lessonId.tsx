import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, TopBar } from "@/components/learning/primitives";
import { LessonPlayer, type LessonDraft } from "@/components/lesson/LessonPlayer";
import { getLessonById, lessonsForTrack } from "@/lib/lessons/registry";
import { assertChildActivity } from "@/lib/auth/child-learning.functions";
import { useChildLearning, useRecordChildProgress } from "@/lib/auth/use-child-learning";

export const Route = createFileRoute("/child/lesson/$lessonId")({
  beforeLoad: async ({ params }) => {
    try {
      await assertChildActivity({ data: { itemType: "lesson", itemId: params.lessonId } });
    } catch {
      throw new Error("That lesson is not available.");
    }
  },
  head: () => ({
    meta: [
      { title: "Lesson — TATI ChildSave" },
      {
        name: "description",
        content: "A short TATI Junior mini-lesson about money, saving and choices.",
      },
      { property: "og:title", content: "Lesson — TATI ChildSave" },
      { property: "og:description", content: "Learn one money idea in about five minutes." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const lesson = getLessonById(lessonId);
  const { data } = useChildLearning();
  const access = useQuery({
    queryKey: ["child-activity", "lesson", lessonId],
    queryFn: () => assertChildActivity({ data: { itemType: "lesson", itemId: lessonId } }),
  });
  const record = useRecordChildProgress();
  const navigate = useNavigate();

  const playableLesson = lesson;
  if (!playableLesson || access.isError || !data) {
    return (
      <Screen>
        <TopBar title="Lesson not found" backTo="/child/learn" />
      </Screen>
    );
  }
  const lessonToPlay = playableLesson;

  const all = lessonsForTrack(lessonToPlay.track);
  const index = all.findIndex((item) => item.id === lessonToPlay.id);
  async function finish(draft: LessonDraft) {
    await record.mutateAsync({
      data: {
        itemType: "lesson",
        itemId: lessonToPlay.id,
        score: lessonToPlay.xpReward,
        maxScore: lessonToPlay.xpReward,
        details: draft as unknown as Record<string, unknown>,
      },
    });
    await navigate({ to: "/child/learn" });
  }
  return (
    <LessonPlayer
      lesson={lessonToPlay}
      childId={data.profile.id}
      backTo="/child/learn"
      stepLabel={index >= 0 ? `Lesson ${index + 1} of ${all.length}` : undefined}
      saving={record.isPending}
      onComplete={finish}
    />
  );
}
