import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Screen, Card, TopBar, PrimaryButton, ChoiceButton, GhanaCedi } from "@/components/learning/primitives";
import { ScenarioPlayer } from "@/components/scenario/ScenarioPlayer";
import { useRecordProgress } from "@/lib/progress/service";
import { getScenarioDefinition } from "@/lib/scenario/registry";
import { getScenario, getTrack, itemTitle } from "@/lib/learning/track";
import type { ScenarioChoice } from "@/lib/learning/types";
import { celebrateStep } from "@/components/gamification/celebrate";
import { assertChildInCurrentFamily } from "@/lib/family";

export const Route = createFileRoute("/_authenticated/learn/$childId/scenario/$scenarioId")({
  beforeLoad: async ({ params }) => {
    try {
      await assertChildInCurrentFamily(params.childId);
    } catch {
      throw redirect({ to: "/parent" });
    }
  },
  head: () => ({
    meta: [
      { title: "Decision story — TATI ChildSave" },
      { name: "description", content: "Make money choices and see what happens next in a Ghanaian story." },
      { property: "og:title", content: "Decision story — TATI ChildSave" },
      { property: "og:description", content: "Make money choices and see what happens next." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScenarioPage,
});

interface HistoryEntry {
  stepId: string;
  choiceId: string;
  label: string;
  outcome: string;
  savingsAfter: number;
}

function ScenarioPage() {
  const { childId, scenarioId } = useParams({ from: "/_authenticated/learn/$childId/scenario/$scenarioId" });
  const track = getTrack("save");
  const chapterItem = track.sequence.find((i) => i.kind === "scenario" && i.id === scenarioId);
  const baseScenarioId = chapterItem?.scenarioId ?? scenarioId.split("--")[0]!;
  const branching = getScenarioDefinition(baseScenarioId);
  const chapterIndex = track.sequence.findIndex((i) => i.kind === "scenario" && i.id === scenarioId);
  const nextUp = chapterIndex >= 0 ? track.sequence[chapterIndex + 1] : undefined;
  const scenario = getScenario(track, baseScenarioId);
  const navigate = useNavigate();
  const record = useRecordProgress();

  const [stepId, setStepId] = useState(scenario?.startStepId ?? "");
  const [savings, setSavings] = useState(scenario?.startingSavings ?? 0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pending, setPending] = useState<ScenarioChoice | null>(null);
  const [finished, setFinished] = useState(false);

  // Branching stories run on the reusable scenario engine.
  if (branching) {
    return (
      <ScenarioPlayer
        scenario={branching}
        childId={childId}
        saving={record.isPending}
        pauseBefore={chapterItem?.pauseBefore}
        chapterTitle={chapterItem?.chapterTitle}
        nextUpLabel={nextUp ? itemTitle(track, nextUp) : undefined}
        onChapterPause={async ({ available, saved, decisions }) => {
          await record.mutateAsync({
            childId,
            itemType: "scenario",
            itemId: scenarioId,
            details: { available, saved, decisions, chapter: true },
          });
          celebrateStep("scenario", "Chapter complete");
          navigate({ to: "/learn/$childId", params: { childId } });
        }}
        onComplete={async ({ available, saved, decisions }) => {
          await record.mutateAsync({
            childId,
            itemType: "scenario",
            itemId: scenarioId,
            details: { available, saved, decisions },
          });
          celebrateStep("scenario", "Story finished");
          navigate({ to: "/learn/$childId", params: { childId } });
        }}
      />
    );
  }

  if (!scenario) {
    return (
      <Screen>
        <TopBar title="Story not found" backTo={`/learn/${childId}`} />
        <Card>
          <p className="text-lg">We could not find this story. Let's head back to your journey.</p>
          <div className="mt-4">
            <PrimaryButton onClick={() => navigate({ to: "/learn/$childId", params: { childId } })}>
              Back to my journey
            </PrimaryButton>
          </div>
        </Card>
      </Screen>
    );
  }

  const step = scenario.steps.find((s) => s.id === stepId);

  function choose(choice: ScenarioChoice) {
    const after = savings + choice.savingsDelta;
    setSavings(after);
    setHistory([...history, { stepId, choiceId: choice.id, label: choice.label, outcome: choice.outcome, savingsAfter: after }]);
    setPending(choice);
  }

  function continueOn() {
    if (!pending) return;
    if (pending.next) {
      setStepId(pending.next);
      setPending(null);
    } else {
      setFinished(true);
      setPending(null);
    }
  }

  function restart() {
    setStepId(scenario!.startStepId);
    setSavings(scenario!.startingSavings);
    setHistory([]);
    setPending(null);
    setFinished(false);
  }

  async function finish() {
    await record.mutateAsync({
      childId,
      itemType: "scenario",
      itemId: scenario!.id,
      details: { finalSavings: savings, path: history },
    });
    navigate({ to: "/learn/$childId", params: { childId } });
  }

  return (
    <Screen>
      <TopBar
        title={scenario.title}
        backTo={`/learn/${childId}`}
        right={
          <span className="rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground" aria-label="Money you have">
            <GhanaCedi amount={savings} />
          </span>
        }
      />

      {finished ? (
        <>
          <Card>
            <h2 className="text-xl font-bold">Let's look back at your story</h2>
            <p className="mt-2 text-lg">
              You ended with <GhanaCedi amount={savings} />.
            </p>
            <ul className="mt-4 space-y-2">
              {history.map((h, i) => (
                <li key={i} className="rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
                  <span className="font-semibold">{h.label}</span> — {h.outcome}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-lg">{scenario.closingReflection}</p>
          </Card>
          <div className="mt-6 space-y-3">
            <PrimaryButton onClick={finish} disabled={record.isPending}>
              {record.isPending ? "Saving…" : "Save and continue"}
            </PrimaryButton>
            <button
              type="button"
              onClick={restart}
              className="min-h-[48px] w-full rounded-2xl border border-border bg-card text-base font-semibold"
            >
              Try the story a different way
            </button>
          </div>
        </>
      ) : pending ? (
        <Card>
          <p className="text-lg leading-relaxed">{pending.outcome}</p>
          {pending.reflection ? (
            <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">{pending.reflection}</p>
          ) : null}
          <p className="mt-3 text-lg">
            You now have <GhanaCedi amount={savings} />.
          </p>
          <div className="mt-5">
            <PrimaryButton onClick={continueOn}>{pending.next ? "What happens next?" : "Look back at my story"}</PrimaryButton>
          </div>
        </Card>
      ) : step ? (
        <Card>
          <p className="text-lg leading-relaxed">{step.situation}</p>
          <h2 className="mt-4 text-xl font-bold">{step.question}</h2>
          <div className="mt-4 space-y-2">
            {step.choices.map((choice) => (
              <ChoiceButton key={choice.id} onClick={() => choose(choice)}>
                {choice.label}
              </ChoiceButton>
            ))}
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}
