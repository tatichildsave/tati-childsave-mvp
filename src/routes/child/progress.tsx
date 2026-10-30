import { createFileRoute } from "@tanstack/react-router";
import { ErrorState, LoadingState, Page } from "@/components/tati";
import { ChildProgressScreen } from "@/components/child/ChildProgressScreen";
import { useChildLearning } from "@/lib/auth/use-child-learning";

export const Route = createFileRoute("/child/progress")({
  head: () => ({
    meta: [
      { title: "My progress — TATI ChildSave" },
      {
        name: "description",
        content: "See how much you've saved, how far you've come and the badges ahead.",
      },
      { property: "og:title", content: "My progress — TATI ChildSave" },
      { property: "og:description", content: "Savings, lessons and badges at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChildProgress,
});

function ChildProgress() {
  const { data, snapshot, isLoading, isError, refetch } = useChildLearning();

  if (isLoading || !data || !snapshot) {
    return (
      <Page withBottomNav role="junior">
        <LoadingState label="Loading your progress…" />
      </Page>
    );
  }
  if (isError) {
    return (
      <Page withBottomNav role="junior">
        <ErrorState
          title="Your progress didn't load"
          description="Please try again. Your progress is safe."
          onRetry={() => void refetch()}
        />
      </Page>
    );
  }

  return (
    <ChildProgressScreen
      snapshot={snapshot}
      achievements={data.achievements}
      competencies={data.competencies}
    />
  );
}
