import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check, LockKeyhole, Sparkles, Target } from "lucide-react";
import { Button, Card, Page, PageHeader, ProgressBar } from "@/components/tati";
import { childItemPath, itemSubtitle, itemTitle } from "@/lib/learning/track";
import type { ProgressSnapshot } from "@/lib/progress/snapshot";
import { tatiTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ChildJourney({ snapshot }: { snapshot: ProgressSnapshot }) {
  const completedStops = snapshot.steps.filter((step) => step.done).length;
  const totalStops = snapshot.steps.length;
  const currentStep = snapshot.steps.find((step) => step.current && !step.locked);
  const preview = snapshot.steps.slice(0, Math.min(8, totalStops));

  return (
    <Page withBottomNav role="junior">
      <PageHeader
        backTo="/child/home"
        eyebrow="Track: SAVE"
        title="My learning journey"
        subtitle="Learn, decide, and unlock each new step one at a time."
        listenable
      />

      <section aria-labelledby="journey-overview-title" className="mb-6">
        <Card className="rounded-[28px] border border-[#d6e4ff] bg-white p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="journey-overview-title" className="text-lg font-extrabold text-[#0f2248]">
              Journey overview
            </h2>
            <span className="rounded-full bg-[#eaf1ff] px-3 py-1 text-sm font-extrabold text-primary">
              {totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0}%
            </span>
          </div>
          <ProgressBar
            value={completedStops}
            max={Math.max(1, totalStops)}
            label={`${completedStops} of ${totalStops} stops finished`}
            showPercent={false}
          />
          <p className="mt-3 text-sm font-bold text-muted-foreground">
            Complete each stop to unlock what comes next.
          </p>
        </Card>
      </section>

      <section aria-labelledby="next-stop-title" className="mb-6">
        <h2 id="next-stop-title" className="mb-3 text-[1.4rem] font-extrabold text-[#0f2248]">
          Next stop
        </h2>
        <Card className="rounded-[28px] border border-[#c9d9fa] bg-white p-5 shadow-card sm:p-6">
          {currentStep ? (
            <>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#e9f1ff] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
                <Target aria-hidden="true" className="h-3.5 w-3.5" />
                Ready now
              </p>
              <h3 className="mt-3 text-[1.9rem] font-extrabold leading-tight text-[#0f2248]">
                {itemTitle(snapshot.track, currentStep.item)}
              </h3>
              <p className="mt-2 text-base text-[#31486b]">
                {itemSubtitle(snapshot.track, currentStep.item)}
              </p>
              {currentStep.item.blurb ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {currentStep.item.blurb}
                </p>
              ) : null}
              <Button
                to={childItemPath(currentStep.item)}
                size="lg"
                className="mt-4 min-h-[56px] w-full rounded-full bg-[#003DA5] text-white hover:bg-[#002f80]"
              >
                Continue Adventure
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <p className="inline-flex items-center gap-2 rounded-full bg-[#e9f1ff] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                Great work
              </p>
              <h3 className="mt-3 text-3xl font-extrabold leading-tight text-[#0f2248]">
                You completed the journey!
              </h3>
              <p className="mt-2 text-base text-muted-foreground">
                Review your learning and celebrate how far you have come.
              </p>
              <Button
                to="/child/results"
                size="lg"
                className="mt-4 min-h-[56px] w-full rounded-full bg-[#003DA5] text-white hover:bg-[#002f80]"
              >
                View my results
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Button>
            </>
          )}
        </Card>
      </section>

      <section aria-labelledby="all-stops-title" className="mb-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="all-stops-title" className="text-xl font-extrabold text-[#0f2248]">
            All journey stops
          </h2>
          <span className="text-sm font-bold text-muted-foreground">{totalStops} total</span>
        </div>
        {preview.length ? (
          <ol className="space-y-2.5">
            {preview.map((step) => {
              const statusLabel = step.done
                ? "Completed"
                : step.locked
                  ? "Locked"
                  : step.current
                    ? "Ready now"
                    : "Ready";
              const icon = step.done ? (
                <Check aria-hidden="true" className="h-4 w-4 text-success" />
              ) : step.locked ? (
                <LockKeyhole aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              ) : (
                <BookOpen aria-hidden="true" className="h-4 w-4 text-primary" />
              );

              const body = (
                <div className="flex min-h-[56px] items-start gap-3 rounded-2xl border border-[#dfe7f8] bg-white px-4 py-3 shadow-card">
                  <span className="mt-0.5 text-xs font-extrabold text-muted-foreground">
                    {String(step.index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-extrabold text-[#102346]">
                      {itemTitle(snapshot.track, step.item)}
                    </h3>
                    <p className="mt-0.5 text-xs font-bold text-muted-foreground">
                      {itemSubtitle(snapshot.track, step.item)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {icon}
                    <span
                      className={cn(
                        "text-xs font-extrabold",
                        step.done
                          ? "text-success"
                          : step.locked
                            ? "text-muted-foreground"
                            : "text-primary",
                      )}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );

              if (step.locked) {
                return <li key={`${step.item.kind}:${step.item.id}`}>{body}</li>;
              }

              return (
                <li key={`${step.item.kind}:${step.item.id}`}>
                  <Link
                    to={childItemPath(step.item)}
                    className={cn("block rounded-2xl", tatiTheme.focusRing)}
                  >
                    {body}
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <Card tone="muted">
            <p className="text-muted-foreground">No journey stops are available yet.</p>
          </Card>
        )}
      </section>
    </Page>
  );
}
