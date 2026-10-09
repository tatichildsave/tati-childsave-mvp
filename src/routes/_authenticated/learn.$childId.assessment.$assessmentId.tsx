import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Screen, TopBar } from "@/components/learning/primitives";

export const Route = createFileRoute("/_authenticated/learn/$childId/assessment/$assessmentId")({
  head: () => ({
    meta: [
      { title: "Assessment — TATI ChildSave" },
      {
        name: "description",
        content: "Assessments are completed by children on their own device.",
      },
      { property: "og:title", content: "Assessment — TATI ChildSave" },
      { property: "og:description", content: "Assessments are completed by children on their own device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssessmentPage,
});

function AssessmentPage() {
  const { childId } = useParams({
    from: "/_authenticated/learn/$childId/assessment/$assessmentId",
  });
  const navigate = useNavigate();

  return (
    <Screen>
      <TopBar title="Assessments" backTo={`/learn/${childId}`} />
      <div className="flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Assessments are completed by the child on their own device</h2>
          <p className="text-gray-600">
            Your child will take assessments independently. Check back in the Learning section to see their progress.
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