import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Card,
  ChoiceButton,
  PrimaryButton,
  Screen,
  TopBar,
} from "@/components/learning/primitives";
import { getReflection, getTrack } from "@/lib/learning/track";
import { assertChildActivity } from "@/lib/auth/child-learning.functions";
import { useRecordChildProgress } from "@/lib/auth/use-child-learning";

export const Route = createFileRoute("/child/reflection/$reflectionId")({
  beforeLoad: async ({ params }) => {
    await assertChildActivity({ data: { itemType: "reflection", itemId: params.reflectionId } });
  },
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
      <Screen>
        <TopBar title="Pause and think" backTo="/child/learn" />
      </Screen>
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
    <Screen>
      <TopBar title={reflectionToPlay.title} backTo="/child/learn" />
      <Card>
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          {reflectionToPlay.icon ?? "🪞"} Pause and think
        </p>
        <p className="mt-2 text-lg leading-relaxed">{reflectionToPlay.intro}</p>
        <h2 className="mt-4 text-xl font-bold">{reflectionToPlay.question}</h2>
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
      </Card>
      {picked ? (
        <Card className="mt-4">
          <p className="text-lg leading-relaxed">{picked.response}</p>
          <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
            {reflection.closing}
          </p>
        </Card>
      ) : null}
      <div className="mt-6">
        <PrimaryButton onClick={finish} disabled={!picked || record.isPending}>
          {record.isPending ? "Saving…" : "Continue my journey →"}
        </PrimaryButton>
      </div>
    </Screen>
  );
}
