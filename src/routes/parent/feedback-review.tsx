import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, Page, PageHeader, EmptyState, ErrorState, LoadingState } from "@/components/tati";
import { getFeedbackForReview } from "@/lib/feedback";

export const Route = createFileRoute("/parent/feedback-review")({ component: FeedbackReview });

function FeedbackReview() {
  const feedback = useQuery({ queryKey: ["feedback-review"], queryFn: getFeedbackForReview });

  return (
    <Page role="parent">
      <PageHeader
        backTo="/parent"
        eyebrow="Internal testing view"
        title="Submitted feedback"
        subtitle="Only accounts listed as feedback reviewers can see this page."
      />
      {feedback.isLoading ? <LoadingState label="Loading feedback..." /> : null}
      {feedback.isError ? (
        <ErrorState
          title="Feedback is not available"
          description="This account may not be on the reviewer allowlist yet."
          onRetry={() => void feedback.refetch()}
        />
      ) : null}
      {!feedback.isLoading && !feedback.isError && feedback.data?.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No feedback yet"
          description="Submitted child and parent check-ins will appear here."
        />
      ) : null}
      <div className="space-y-4">
        {feedback.data?.map((item) => (
          <Card key={item.id} tone="surface">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  {item.audience} · {item.experience_key}
                </p>
                <h2 className="mt-2 text-lg font-extrabold">{item.context}</h2>
              </div>
              <time
                className="text-xs text-muted-foreground whitespace-nowrap"
                dateTime={item.created_at}
              >
                {new Date(item.created_at).toLocaleDateString()}
              </time>
            </div>
            <dl className="space-y-2">
              {Object.entries(item.answers).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-background px-3 py-2">
                  <dt className="text-xs font-bold uppercase text-muted-foreground">{key}</dt>
                  <dd className="text-base font-bold">{String(value)}</dd>
                </div>
              ))}
            </dl>
            {item.message ? (
              <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-accent-soft p-3 text-base">
                {item.message}
              </p>
            ) : null}
          </Card>
        ))}
      </div>
      <button
        onClick={() => window.history.back()}
        className="mt-6 block text-center w-full font-extrabold text-primary hover:underline"
      >
        Back to parent portal
      </button>
    </Page>
  );
}
