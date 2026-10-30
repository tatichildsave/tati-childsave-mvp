import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorState, Page } from "@/components/tati";
import { ChildReflectionScreen } from "@/components/child/ChildReflectionScreen";
import { getReflection, getTrack } from "@/lib/learning/track";
import { assertChildActivity } from "@/lib/auth/child-learning.functions";
import { useRecordChildProgress } from "@/lib/auth/use-child-learning";

export const Route = createFileRoute("/child/reflection/$reflectionId")({
  beforeLoad: async ({ params }) => {
    await assertChildActivity({ data: { itemType: "reflection", itemId: params.reflectionId } });
  },
  head: () => ({
    meta: [
      { title: "Pause and think — TATI ChildSave" },
      {
        name: "description",
        content: "Take a moment to think about what you learned.",
      },
      { property: "og:title", content: "Pause and think — TATI ChildSave" },
      { property: "og:description", content: "Reflect on your choices and learning." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReflectionPage,
});

function ReflectionPage() {
  const { reflectionId } = Route.useParams();
  const reflection = getReflection(getTrack("save"), reflectionId);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const record = useRecordChildProgress();
  const navigate = useNavigate();

  const currentReflection = reflection;
  if (!currentReflection)
    return (
      <Page role="junior">
        <ErrorState
          title="This reflection isn't available"
          description="Please return to your journey and continue with an unlocked activity."
          onRetry={() => void navigate({ to: "/child/learn" })}
        />
      </Page>
    );

  const reflectionToPlay = currentReflection;
  const picked = reflectionToPlay.options.find((option) => option.id === choiceId);

  async function finish() {
    if (!picked) return;
    await record.mutateAsync({
      data: { itemType: "reflection", itemId: reflectionToPlay.id, details: { choiceId } },
    });
    await navigate({ to: "/child/learn" });
  }

  return (
    <ChildReflectionScreen
      reflection={reflectionToPlay}
      choiceId={choiceId}
      saving={record.isPending}
      onPick={setChoiceId}
      onFinish={finish}
    />
  );
}
