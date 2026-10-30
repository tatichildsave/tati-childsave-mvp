import { createFileRoute } from "@tanstack/react-router";
import { ErrorState, LoadingState, Page } from "@/components/tati";
import { ChildJourney } from "@/components/child/ChildJourney";
import { useChildLearning } from "@/lib/auth/use-child-learning";

export const Route = createFileRoute("/child/learn")({
  head: () => ({
    meta: [
      { title: "My learning journey — TATI ChildSave" },
      {
        name: "description",
        content:
          "Mini-lessons and decision stories on the SAVE track, unlocked one step at a time.",
      },
      { property: "og:title", content: "My learning journey — TATI ChildSave" },
      {
        property: "og:description",
        content: "Lessons and decision stories for learners aged 8–12.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChildLearn,
});

function ChildLearn() {
  const { snapshot, isLoading, isError, refetch } = useChildLearning();

  if (isLoading || !snapshot) {
    return (
      <Page withBottomNav role="junior">
        <LoadingState label="Opening your journey…" />
      </Page>
    );
  }

  if (isError) {
    return (
      <Page withBottomNav role="junior">
        <ErrorState
          title="Your journey didn't load"
          description="Please try again. Your progress is safe."
          onRetry={() => void refetch()}
        />
      </Page>
    );
  }

  return <ChildJourney snapshot={snapshot} />;
}
