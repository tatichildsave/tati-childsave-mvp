import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/tati";
import { Screen } from "@/components/learning/primitives";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";
import { getAssessmentDefinition } from "@/lib/assessment/registry";
import { assertChildActivity, saveChildAssessment } from "@/lib/auth/child-learning.functions";
import { useChildLearning, useRecordChildProgress } from "@/lib/auth/use-child-learning";
import type { AssessmentResult } from "@/lib/assessment/types";

export const Route = createFileRoute("/child/assessment/$assessmentId")({
  beforeLoad: async ({ params }) => {
    await assertChildActivity({ data: { itemType: "assessment", itemId: params.assessmentId } });
  },
  head: () => ({
    meta: [
      { title: "Check-in — TATI ChildSave" },
      {
        name: "description",
        content: "A quick check-in on what you've learned so far.",
      },
      { property: "og:title", content: "Check-in — TATI ChildSave" },
      { property: "og:description", content: "See how your money skills are growing." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { assessmentId } = Route.useParams();
  const definition = getAssessmentDefinition(assessmentId);
  const { data } = useChildLearning();
  const record = useRecordChildProgress();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!definition || !data)
    return (
      <Page role="junior">
        <Screen>
          <p className="text-lg">Check-in not found</p>
        </Screen>
      </Page>
    );

  async function finish(result: AssessmentResult) {
    try {
      setSubmitError(null);
      setIsSubmitting(true);

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
    } catch (error) {
      console.error("Assessment submission error:", error);
      setSubmitError("We couldn't save your answers. Your answers are still here. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <AssessmentRunner
      definition={definition}
      storageKey={`tati.assessment.child.${data.profile.id}.${assessmentId}`}
      backTo="/child/learn"
      saving={record.isPending || isSubmitting}
      onComplete={finish}
      submitError={submitError}
      {...(data.profile.name ? { childName: data.profile.name.split(" ")[0] } : {})}
    />
  );
}
