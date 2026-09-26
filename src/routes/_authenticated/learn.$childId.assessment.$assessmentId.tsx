import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";
import { Screen, TopBar } from "@/components/learning/primitives";
import { getAssessmentDefinition } from "@/lib/assessment/registry";
import { saveAssessmentAttempt } from "@/lib/assessment/attempts";
import type { AssessmentResult } from "@/lib/assessment/types";
import { useChild } from "@/lib/learning/progress";
import { useRecordProgress } from "@/lib/progress/service";
import { celebrateStep } from "@/components/gamification/celebrate";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";
import { assertChildInCurrentFamily } from "@/lib/family";

export const Route = createFileRoute("/_authenticated/learn/$childId/assessment/$assessmentId")({
  beforeLoad: async ({ params }) => {
    try {
      await assertChildInCurrentFamily(params.childId);
    } catch {
      throw redirect({ to: "/parent" });
    }
  },
  head: () => ({
    meta: [
      { title: "Check-in — TATI ChildSave" },
      {
        name: "description",
        content: "A short, friendly check-in about money choices. No pass or fail.",
      },
      { property: "og:title", content: "Check-in — TATI ChildSave" },
      { property: "og:description", content: "A short, friendly check-in about money choices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { childId, assessmentId } = useParams({
    from: "/_authenticated/learn/$childId/assessment/$assessmentId",
  });
  const definition = getAssessmentDefinition(assessmentId);
  const navigate = useNavigate();
  const record = useRecordProgress();
  const child = useChild(childId);

  useEffect(() => {
    if (assessmentId === "save-pre") {
      void trackEvent("pre_assessment_started", {
        childProfileId: childId,
        entityId: assessmentId,
        eventKey: assessmentId,
      });
    }
  }, [assessmentId, childId]);

  if (!definition) {
    return (
      <Screen>
        <TopBar title="Check-in not found" backTo={`/learn/${childId}`} />
      </Screen>
    );
  }

  async function finish(result: AssessmentResult) {
    if (definition) await saveAssessmentAttempt(childId, definition, result);
    if (result.assessmentType === "pre") {
      void trackEvent("pre_assessment_completed", {
        childProfileId: childId,
        entityId: assessmentId,
        eventKey: assessmentId,
      });
    }
    if (result.assessmentType === "post") {
      void trackEvent("post_assessment_completed", {
        childProfileId: childId,
        entityId: assessmentId,
        eventKey: assessmentId,
      });
    }
    await record.mutateAsync({
      childId,
      itemType: "assessment",
      itemId: assessmentId,
      score: result.points,
      maxScore: result.maxPoints,
      details: {
        assessmentType: result.assessmentType,
        responses: result.responses,
        competencies: result.competencies,
      },
    });
    celebrateStep("assessment");
    if (result.assessmentType === "post") {
      navigate({ to: "/learn/$childId/summary", params: { childId } });
      return;
    }
    navigate({ to: "/learn/$childId", params: { childId } });
  }

  return (
    <AssessmentRunner
      definition={definition}
      storageKey={`tati.assessment.${childId}.${assessmentId}`}
      backTo={`/learn/${childId}`}
      saving={record.isPending}
      onComplete={finish}
      {...(child.child?.name ? { childName: child.child.name } : {})}
    />
  );
}
