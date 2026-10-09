import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { AssessmentRunner } from "@/components/assessment/AssessmentRunner";
import { Screen, TopBar } from "@/components/learning/primitives";
import { getAssessmentDefinition } from "@/lib/assessment/registry";
import { saveChildAssessment } from "@/lib/auth/child-learning.functions";
import type { AssessmentResult } from "@/lib/assessment/types";
import { useChild } from "@/lib/learning/progress";
import { useRecordProgress } from "@/lib/progress/service";
import { celebrateStep } from "@/components/gamification/celebrate";
import { trackEvent } from "@/lib/analytics";
import { useEffect, useState } from "react";
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
  const [notAllowed, setNotAllowed] = useState(false);

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

  if (notAllowed) {
    return (
      <Screen>
        <TopBar title="Not authorized" backTo={`/learn/${childId}`} />
        <div className="flex flex-col items-center justify-center gap-6 p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Assessments are completed by the child</h2>
            <p className="text-gray-600">
              Assessments are designed to be completed by {child.child?.name || "the child"} on their own device.
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/learn/$childId", params: { childId } })}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Learning
          </button>
        </div>
      </Screen>
    );
  }

  async function finish(result: AssessmentResult) {
    try {
      // Convert competencies array to record format for server function
      const competencyScores: Record<string, unknown> = {};
      for (const comp of result.competencies) {
        competencyScores[comp.competency] = {
          points: comp.points,
          maxPoints: comp.maxPoints,
        };
      }

      // Use server function for assessment submission (requires ChildSession)
      const response = await saveChildAssessment({
        data: {
          assessmentId,
          responses: result.responses,
          points: result.points,
          maxPoints: result.maxPoints,
          competencyScores,
        },
      });
      if (!response.ok) throw new Error("Failed to save assessment");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Check if error is due to missing ChildSession (parent tried to access)
      if (message.includes("Child session") || message.includes("not authenticated")) {
        setNotAllowed(true);
        return;
      }
      // Re-throw other errors
      throw error;
    }

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
