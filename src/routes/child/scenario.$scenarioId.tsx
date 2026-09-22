import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScenarioPlayer } from "@/components/scenario/ScenarioPlayer";
import { getScenarioDefinition } from "@/lib/scenario/registry";
import { getTrack, itemTitle } from "@/lib/learning/track";
import { useChildLearning, useRecordChildProgress } from "@/lib/auth/use-child-learning";
import {
  assertChildActivity,
  loadChildScenario,
  saveChildScenario,
} from "@/lib/auth/child-learning.functions";
import type { ScenarioState } from "@/lib/scenario/types";
import { Screen, TopBar, Card, PrimaryButton } from "@/components/learning/primitives";

export const Route = createFileRoute("/child/scenario/$scenarioId")({
  beforeLoad: async ({ params }) => {
    try {
      await assertChildActivity({ data: { itemType: "scenario", itemId: params.scenarioId } });
    } catch {
      throw new Error("That story is not available.");
    }
  },
  head: () => ({
    meta: [
      { title: "Decision story — TATI ChildSave" },
      {
        name: "description",
        content: "Make money choices in a Ghanaian story and see what happens next.",
      },
      { property: "og:title", content: "Decision story — TATI ChildSave" },
      { property: "og:description", content: "Choose, see the result, and adjust your plan." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScenarioPage,
});

function ScenarioPage() {
  const { scenarioId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useChildLearning();
  const record = useRecordChildProgress();
  const track = getTrack("save");
  const item = track.sequence.find((entry) => entry.kind === "scenario" && entry.id === scenarioId);
  const scenario = getScenarioDefinition(item?.scenarioId ?? scenarioId.split("--")[0]!);
  const childId = data?.profile.id ?? "child";
  const persistence = {
    loadSession: async (_childId: string, id: string) => {
      const result = await loadChildScenario({ data: { scenarioId: id } });
      return result.state as ScenarioState | undefined;
    },
    saveSession: async (_childId: string, state: ScenarioState) => {
      const result = await saveChildScenario({
        data: state as unknown as Parameters<typeof saveChildScenario>[0]["data"],
      });
      return result.sessionId;
    },
    recordDecision: async () => undefined,
  };

  if (isLoading || !data) {
    return (
      <Screen>
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Opening your story…
        </p>
      </Screen>
    );
  }

  if (!scenario || !item) {
    return (
      <Screen>
        <TopBar title="Story not found" backTo="/child/learn" />
        <Card>
          <p className="text-lg">This story is not available in your journey.</p>
          <div className="mt-4">
            <PrimaryButton onClick={() => navigate({ to: "/child/learn" })}>
              Back to my journey
            </PrimaryButton>
          </div>
        </Card>
      </Screen>
    );
  }

  return (
    <ScenarioPlayer
      scenario={scenario}
      childId={childId}
      persistence={persistence}
      saving={record.isPending}
      onComplete={async ({ saved, available, decisions }) => {
        await record.mutateAsync({
          data: {
            itemType: "scenario",
            itemId: scenarioId,
            details: { saved, available, decisions },
          },
        });
        await navigate({ to: "/child/learn" });
      }}
    />
  );
}
