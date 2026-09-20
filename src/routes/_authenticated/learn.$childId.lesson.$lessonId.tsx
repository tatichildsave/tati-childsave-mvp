import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Screen, TopBar } from "@/components/learning/primitives";
import { LessonPlayer, type LessonDraft } from "@/components/lesson/LessonPlayer";
import { useRecordProgress } from "@/lib/progress/service";
import { getLessonById, lessonsForTrack } from "@/lib/lessons/registry";
import { celebrateStep } from "@/components/gamification/celebrate";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/learn/$childId/lesson/$lessonId")({
  head: () => ({
    meta: [
      { title: "Lesson — TATI ChildSave" },
      { name: "description", content: "A short, interactive lesson from the SAVE track." },
      { property: "og:title", content: "Lesson — TATI ChildSave" },
      { property: "og:description", content: "A short, interactive lesson about saving money." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { childId, lessonId } = useParams({ from: "/_authenticated/learn/$childId/lesson/$lessonId" });
  const lesson = getLessonById(lessonId);
  const navigate = useNavigate();
  const record = useRecordProgress();

  useEffect(() => {
    if (lesson) void trackEvent("lesson_started", { childProfileId: childId, entityId: lesson.id, eventKey: lesson.id });
  }, [childId, lesson]);

  if (!lesson) {
    return (
      <Screen>
        <TopBar title="Lesson not found" backTo={`/learn/${childId}`} />
      </Screen>
    );
  }

  const all = lessonsForTrack(lesson.track);
  const index = all.findIndex((l) => l.id === lesson.id);

  async function finish(draft: LessonDraft) {
    if (!lesson) return;
    await record.mutateAsync({
      childId,
      itemType: "lesson",
      itemId: lesson.id,
      score: lesson.xpReward,
      maxScore: lesson.xpReward,
      details: {
        xp: lesson.xpReward,
        competencies: lesson.competencies,
        quickCheck: draft.quickCheck,
        activityChoice: draft.activityChoice,
        sorted: draft.sorted,
        allocation: draft.allocation,
        reflection: draft.reflection,
      },
    });
    void trackEvent("lesson_completed", { childProfileId: childId, entityId: lesson.id, eventKey: lesson.id });
    try {
      localStorage.removeItem(`tati.lesson.${childId}.${lesson.id}`);
    } catch {
      /* ignore */
    }
    celebrateStep("lesson", lesson.title);
    if (lesson.nextLesson) {
      navigate({ to: "/learn/$childId/lesson/$lessonId", params: { childId, lessonId: lesson.nextLesson } });
    } else {
      navigate({ to: "/learn/$childId", params: { childId } });
    }
  }

  return (
    <LessonPlayer
      lesson={lesson}
      childId={childId}
      backTo={`/learn/${childId}`}
      stepLabel={index >= 0 ? `Lesson ${index + 1} of ${all.length}` : undefined}
      saving={record.isPending}
      onComplete={finish}
    />
  );
}
