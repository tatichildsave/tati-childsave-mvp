import { createFileRoute } from "@tanstack/react-router";
import { ErrorState, LoadingState, Page } from "@/components/tati";
import { ChildResultsScreen } from "@/components/child/ChildResultsScreen";
import { useChildLearning } from "@/lib/auth/use-child-learning";

export const Route = createFileRoute("/child/results")({
  head: () => ({
    meta: [
      { title: "What I learned — TATI ChildSave" },
      {
        name: "description",
        content: "A warm summary of the choices you made and what you can try next time.",
      },
      { property: "og:title", content: "What I learned — TATI ChildSave" },
      { property: "og:description", content: "Every decision teaches you something." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChildResults,
});

function ChildResults() {
  const { data, snapshot, isLoading, isError, refetch } = useChildLearning();

  if (isLoading || !data || !snapshot) {
    return (
      <Page withBottomNav role="junior">
        <LoadingState label="Loading your results…" />
      </Page>
    );
  }

  if (isError) {
    return (
      <Page withBottomNav role="junior">
        <ErrorState
          title="Your results didn't load"
          description="Please try again. Your progress is safe."
          onRetry={() => void refetch()}
        />
      </Page>
    );
  }

  return (
    <ChildResultsScreen
      snapshot={snapshot}
      profileName={data.profile.name}
      assessments={data.assessments}
      achievements={data.achievements}
    />
  );
}
