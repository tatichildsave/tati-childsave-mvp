import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";
import { Screen, TopBar } from "@/components/learning/primitives";
import { getAssessmentDefinition } from "@/lib/assessment/registry";
import { assertChildActivity, saveChildAssessment } from "@/lib/auth/child-learning.functions";
import { useChildLearning, useRecordChildProgress } from "@/lib/auth/use-child-learning";
import type { AssessmentResult } from "@/lib/assessment/types";

export const Route = createFileRoute("/child/assessment/$assessmentId")({
  beforeLoad: async ({ params }) => {
    await assertChildActivity({ data: { itemType: "assessment", itemId: params.assessmentId } });
  },
  component: AssessmentPage,
});

function AssessmentPage() {
  const { assessmentId } = Route.useParams();
  const definition = getAssessmentDefinition(assessmentId);
  const { data } = useChildLearning();
  const record = useRecordChildProgress();
  const navigate = useNavigate();

  if (!definition || !data)
    return (
      <Screen>
        <TopBar title="Check-in not found" backTo="/child/learn" />
      </Screen>
    );

  async function finish(result: AssessmentResult) {
    await saveChildAssessment({
      data: {
        assessmentId: result.assessmentId,
        responses: result.responses,
        points: result.points,
        maxPoints: result.maxPoints,
        competencyScores: Object.fromEntries(
          result.competencies.map((item) => [item.competency, item]),
        ),
      },
    });
    await record.mutateAsync({
      data: {
        itemType: "assessment",
        itemId: assessmentId,
        score: result.points,
        maxScore: result.maxPoints,
        details: { assessmentType: result.assessmentType },
      },
    });
    await navigate({ to: "/child/learn" });
  }

  return (
    <AssessmentRunner
      definition={definition}
      storageKey={`tati.assessment.child.${data.profile.id}.${assessmentId}`}
      backTo="/child/learn"
      saving={record.isPending}
      onComplete={finish}
      {...(data.profile.name ? { childName: data.profile.name.split(" ")[0] } : {})}
    />
  );
}
