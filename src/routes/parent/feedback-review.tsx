import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, Page, PageHeader, EmptyState, ErrorState, LoadingState } from "@/components/tati";
import { getFeedbackForReview } from "@/lib/feedback";

export const Route = createFileRoute("/parent/feedback-review")({ component: FeedbackReview });

function FeedbackReview() {
  const feedback = useQuery({ queryKey: ["feedback-review"], queryFn: getFeedbackForReview });

  return (
    <Page>
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
          <Card key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  {item.audience} · {item.experience_key}
                </p>
                <h2 className="mt-1 text-lg font-extrabold">{item.context}</h2>
              </div>
              <time className="text-xs text-muted-foreground" dateTime={item.created_at}>
                {new Date(item.created_at).toLocaleDateString()}
              </time>
            </div>
            <dl className="mt-4 space-y-2">
              {Object.entries(item.answers).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-secondary px-3 py-2">
                  <dt className="text-xs font-bold uppercase text-muted-foreground">{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
            {item.message ? (
              <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-accent-soft p-3">
                {item.message}
              </p>
            ) : null}
          </Card>
        ))}
      </div>
      <Link to="/parent" className="mt-6 block text-center font-extrabold text-primary">
        Back to parent portal
      </Link>
    </Page>
  );
}
