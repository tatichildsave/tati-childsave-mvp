import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Screen, Card, TopBar, PrimaryButton, ChoiceButton } from "@/components/learning/primitives";
import { useRecordProgress } from "@/lib/progress/service";
import { getReflection, getTrack } from "@/lib/learning/track";
import { celebrateStep } from "@/components/gamification/celebrate";
import { assertChildInCurrentFamily } from "@/lib/family";

export const Route = createFileRoute("/_authenticated/learn/$childId/reflection/$reflectionId")({
  beforeLoad: async ({ params }) => {
    try {
      await assertChildInCurrentFamily(params.childId);
    } catch {
      throw redirect({ to: "/parent" });
    }
  },
  head: () => ({
    meta: [
      { title: "Pause and think — TATI ChildSave" },
      { name: "description", content: "A short pause to think about the money choices you just made." },
      { property: "og:title", content: "Pause and think — TATI ChildSave" },
      { property: "og:description", content: "A short pause to think about your money choices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReflectionPage,
});

function ReflectionPage() {
  const { childId, reflectionId } = useParams({
    from: "/_authenticated/learn/$childId/reflection/$reflectionId",
  });
  const track = getTrack("save");
  const reflection = getReflection(track, reflectionId);
  const navigate = useNavigate();
  const record = useRecordProgress();
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const storageKey = `tati.reflection.${childId}.${reflectionId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setChoiceId(JSON.parse(saved) as string);
        setResumed(true);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  function choose(choice: string) {
    setChoiceId(choice);
    try {
      localStorage.setItem(storageKey, JSON.stringify(choice));
    } catch {
      /* storage unavailable; the reflection remains usable */
    }
  }

  if (!reflection) {
    return (
      <Screen>
        <TopBar title="Pause and think" backTo={`/learn/${childId}`} />
        <Card>
          <p className="text-lg">We could not find this pause. Let's head back to your journey.</p>
          <div className="mt-4">
            <PrimaryButton onClick={() => navigate({ to: "/learn/$childId", params: { childId } })}>
              Back to my journey
            </PrimaryButton>
          </div>
        </Card>
      </Screen>
    );
  }

  const picked = reflection.options.find((o) => o.id === choiceId);

  async function finish() {
    await record.mutateAsync({
      childId,
      itemType: "reflection",
      itemId: reflection!.id,
      details: { choiceId },
    });
    localStorage.removeItem(storageKey);
    celebrateStep("reflection");
    navigate({ to: "/learn/$childId", params: { childId } });
  }

  return (
    <Screen>
      <TopBar title={reflection.title} backTo={`/learn/${childId}`} />

      {resumed ? (
        <p className="mb-4 rounded-2xl bg-success-soft px-4 py-3 text-sm font-bold text-success">
          Welcome back! Ready to continue?
        </p>
      ) : null}

      <Card>
        <p className="text-sm font-bold uppercase tracking-wide text-primary">
          {reflection.icon ?? "🪞"} Pause and think
        </p>
        <p className="mt-2 text-lg leading-relaxed">{reflection.intro}</p>
        <h2 className="mt-4 text-xl font-bold">{reflection.question}</h2>
        <p className="mt-1 text-sm text-muted-foreground">No scores here — just your own thinking.</p>
        <div className="mt-4 space-y-2">
            {reflection.options.map((option) => (
            <ChoiceButton key={option.id} onClick={() => choose(option.id)}>
              {option.label}
            </ChoiceButton>
          ))}
        </div>
      </Card>

      {picked ? (
        <Card className="mt-4">
          <p className="text-lg leading-relaxed">{picked.response}</p>
          <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">{reflection.closing}</p>
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
