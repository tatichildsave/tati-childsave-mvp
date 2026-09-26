import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page, Card, Button } from "@/components/tati";
import { Card as PrimCard, ChoiceButton, PrimaryButton } from "@/components/learning/primitives";
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
        <Card>
          <p className="text-lg">Reflection not found</p>
        </Card>
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
    <Page role="junior">
      <PrimCard>
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          {reflectionToPlay.icon ?? "🪞"} Pause and think
        </p>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          {reflectionToPlay.intro}
        </p>
        <h2 className="mt-4 text-lg font-extrabold">{reflectionToPlay.question}</h2>
        <div className="mt-4 space-y-2">
          {reflectionToPlay.options.map((option) => (
            <ChoiceButton
              key={option.id}
              onClick={() => setChoiceId(option.id)}
              state={choiceId === option.id ? "selected" : "idle"}
            >
              {option.label}
            </ChoiceButton>
          ))}
        </div>
      </PrimCard>

      {picked ? (
        <Card tone="surface" className="mt-4">
          <p className="text-base leading-relaxed">{picked.response}</p>
          <div className="mt-4 rounded-2xl bg-accent-soft p-4 text-base font-bold text-accent-foreground">
            💭 {reflection.closing}
          </div>
        </Card>
      ) : null}

      <div className="mt-6">
        <Button onClick={finish} disabled={!picked || record.isPending} full size="lg">
          {record.isPending ? "Saving…" : "Continue my journey →"}
        </Button>
      </div>
    </Page>
  );
}
