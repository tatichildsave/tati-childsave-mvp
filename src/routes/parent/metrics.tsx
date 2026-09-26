import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, EmptyState, ErrorState, LoadingState, Page, PageHeader } from "@/components/tati";
import { getAnalyticsForReview, type AnalyticsEvent } from "@/lib/analytics";

export const Route = createFileRoute("/parent/metrics")({ component: MetricsPage });

function unique(
  events: AnalyticsEvent[],
  eventName: AnalyticsEvent["event_name"],
  key: (event: AnalyticsEvent) => string,
) {
  return new Set(events.filter((event) => event.event_name === eventName).map(key)).size;
}

function MetricsPage() {
  const query = useQuery({ queryKey: ["analytics-metrics"], queryFn: getAnalyticsForReview });
  const metrics = useMemo(() => {
    const events = query.data ?? [];
    const actor = (event: AnalyticsEvent) => event.actor_id;
    const child = (event: AnalyticsEvent) => event.child_profile_id ?? event.actor_id;
    const childEntity = (event: AnalyticsEvent) =>
      `${event.child_profile_id ?? event.actor_id}:${event.entity_id ?? "all"}`;
    const funnel = [
      ["Parents registered", unique(events, "signup_completed", actor)],
      ["Children onboarded", unique(events, "child_profile_created", child)],
      ["Pre-assessment completion", unique(events, "pre_assessment_completed", child)],
      ["Lesson completion", unique(events, "lesson_completed", childEntity)],
      ["Scenario starts", unique(events, "scenario_started", childEntity)],
      ["Scenario completion", unique(events, "scenario_completed", childEntity)],
      ["Journey completion", unique(events, "journey_completed", child)],
      ["Post-assessment completion", unique(events, "post_assessment_completed", child)],
      ["Parent dashboard usage", unique(events, "parent_dashboard_viewed", actor)],
      [
        "Feedback completion",
        new Set(
          events
            .filter(
              (event) =>
                event.event_name === "child_feedback_submitted" ||
                event.event_name === "parent_feedback_submitted",
            )
            .map(actor),
        ).size,
      ],
    ] as Array<[string, number]>;
    const dropoffs = funnel
      .slice(1)
      .map(([label, count], index) => {
        const previous = funnel[index]?.[1] ?? count;
        return {
          label,
          count,
          previous,
          rate: previous > 0 ? Math.round(((previous - count) / previous) * 100) : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate);
    return { funnel, dropoffs };
  }, [query.data]);

  return (
    <Page>
      <PageHeader
        backTo="/parent"
        eyebrow="Internal MVP metrics"
        title="Is the journey being used?"
        subtitle="Counts are based on anonymous internal identifiers, not personal details."
      />
      {query.isLoading ? <LoadingState label="Loading metrics..." /> : null}
      {query.isError ? (
        <ErrorState
          title="Metrics are not available"
          description="This account may not be on the reviewer allowlist yet."
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {!query.isLoading && !query.isError && query.data?.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No events yet"
          description="Metrics will appear as families use TATI."
        />
      ) : null}
      {!query.isLoading && !query.isError ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.funnel.map(([label, count]) => (
              <Card key={label}>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-extrabold text-primary">{count}</p>
              </Card>
            ))}
          </div>
          <Card className="mt-5">
            <h2 className="text-lg font-extrabold">Largest drop-offs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Directional funnel comparison; stages use distinct internal identifiers.
            </p>
            <ol className="mt-4 space-y-2">
              {metrics.dropoffs.slice(0, 5).map((dropoff) => (
                <li
                  key={dropoff.label}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3"
                >
                  <span>{dropoff.label}</span>
                  <span className="text-right font-bold text-destructive">
                    {dropoff.rate}%{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({dropoff.previous} → {dropoff.count})
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </>
      ) : null}
      <Link
        to="/parent/feedback-review"
        className="mt-6 block text-center font-extrabold text-primary"
      >
        Review submitted feedback
      </Link>
    </Page>
  );
}
