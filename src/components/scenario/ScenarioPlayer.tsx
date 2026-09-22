import { Link } from "@tanstack/react-router";
import { COMPETENCY_LABELS } from "@/lib/assessment/types";
import { dayProgressPercent } from "@/lib/scenario/engine";
import { useScenarioRunner, type ScenarioPersistence } from "@/lib/scenario/useScenarioRunner";
import type { ScenarioDefinition } from "@/lib/scenario/types";
import { Screen, PrimaryButton } from "@/components/learning/primitives";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/gamification/AnimatedNumber";

interface Props {
  scenario: ScenarioDefinition;
  childId: string;
  onComplete: (payload: { available: number; saved: number; decisions: unknown[] }) => void;
  saving?: boolean | undefined;
  /** Story nodes that start the NEXT chapter — the chapter pauses before them. */
  pauseBefore?: string[] | undefined;
  /** Name of the chapter being played, shown on the pause card. */
  chapterTitle?: string | undefined;
  /** What the learner does next after this chapter (e.g. a lesson title). */
  nextUpLabel?: string | undefined;
  onChapterPause?: (payload: { available: number; saved: number; decisions: unknown[] }) => void;
  persistence?: ScenarioPersistence;
}

/** Renders any scenario from the engine. Holds no story logic of its own. */
export function ScenarioPlayer({
  scenario,
  childId,
  onComplete,
  saving,
  pauseBefore,
  chapterTitle,
  nextUpLabel,
  onChapterPause,
  persistence,
}: Props) {
  const runner = useScenarioRunner(scenario, childId, persistence);
  const { state, node, summary, status } = runner;
  const dayPct = dayProgressPercent(scenario, state);
  const atChapterEnd =
    !!pauseBefore?.length &&
    state.phase === "decision" &&
    state.decisions.length > 0 &&
    pauseBefore.includes(state.nodeId);

  if (status === "loading") {
    return (
      <Screen>
        <p className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Opening your story…
        </p>
      </Screen>
    );
  }

  return (
    <Screen>
      <header className="mb-4 flex items-center gap-3">
        <Link
          to="/learn/$childId"
          params={{ childId }}
          aria-label="Back to my journey"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
        >
          <span aria-hidden="true">←</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{scenario.title}</p>
          <p className="truncate text-sm text-muted-foreground">{scenario.subtitle}</p>
        </div>
        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary">
          🔊 Listen
        </span>
      </header>

      {status === "interrupted" ? (
        <p className="mb-4 rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
          We cannot save your story on this device right now, so please try to finish it in one go.
        </p>
      ) : null}
      {status === "resumed" && state.phase !== "complete" ? (
        <p className="mb-4 rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
          Welcome back! Ready to continue? We kept your story exactly where you left it.
        </p>
      ) : null}

      {/* Day + money strip */}
      <section className="mb-4">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>
            📅 Day {state.day} of {scenario.totalDays}
          </span>
          <span className="text-primary">
            {state.phase === "consequence" ? "● Decision Consequence" : `${dayPct}% completed`}
          </span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={dayPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Story progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${dayPct}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Pocket" value={`GH₵${state.available}`} note="Available" />
          <Stat label="Saved" value={`GH₵${state.saved}`} note="In box" tone="success" />
          <Stat
            label="Target"
            value={`GH₵${state.goalTarget}`}
            note={scenario.goalLabel}
            tone="accent"
          />
        </div>
      </section>

      <GoalCard label={scenario.goalLabel} saved={state.saved} target={state.goalTarget} />

      {state.phase === "intro" ? (
        <section className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
          {scenario.intro.image ? (
            <img
              src={scenario.intro.image}
              alt=""
              loading="eager"
              decoding="async"
              className="mb-4 h-44 w-full rounded-2xl object-cover"
            />
          ) : null}
          <h2 className="text-xl font-bold">{scenario.intro.title}</h2>
          <p className="mt-2 text-muted-foreground">{scenario.intro.body}</p>
          <div className="mt-5">
            <PrimaryButton onClick={runner.start}>{scenario.intro.cta ?? "Let's go"}</PrimaryButton>
          </div>
        </section>
      ) : null}

      {atChapterEnd ? (
        <section className="mt-4 space-y-3">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">
              Chapter complete
            </p>
            <h2 className="mt-1 text-xl font-bold">{chapterTitle ?? "Your story pauses here"}</h2>
            <p className="mt-2 text-muted-foreground">
              Day {state.day} of {scenario.totalDays}. Your story is saved exactly here — the next
              part of the adventure is waiting on your journey map.
            </p>
            {nextUpLabel ? (
              <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                Next up: <span className="font-bold">{nextUpLabel}</span>
              </p>
            ) : null}
          </div>
          <PrimaryButton
            onClick={() =>
              onChapterPause?.({
                available: state.available,
                saved: state.saved,
                decisions: state.decisions,
              })
            }
            disabled={!!saving}
          >
            {saving ? "Saving…" : "Back to my journey →"}
          </PrimaryButton>
        </section>
      ) : null}

      {!atChapterEnd && state.phase === "decision" && node ? (
        <section className="mt-4">
          {node.image ? (
            <figure className="relative mb-4 overflow-hidden rounded-3xl border border-border">
              <img
                src={node.image}
                alt={node.imageCaption ?? node.title}
                loading="lazy"
                decoding="async"
                className="h-48 w-full object-cover"
              />
              {node.imageBadge ? (
                <figcaption className="absolute right-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs font-bold">
                  {node.imageBadge}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              {node.topic ? (
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                  {node.topic}
                </span>
              ) : null}
              {node.place ? (
                <span className="text-sm text-muted-foreground">📍 {node.place}</span>
              ) : null}
            </div>
            <h2 className="text-xl font-bold">{node.title}</h2>
            <p className="mt-2 text-muted-foreground">{node.situation}</p>
            {node.quote ? (
              <blockquote className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
                <p className="text-sm font-bold">{node.quote.speaker}</p>
                <p className="mt-1 italic">“{node.quote.text}”</p>
              </blockquote>
            ) : null}
            {node.question ? (
              <p className="mt-3 font-semibold text-primary">❓ {node.question}</p>
            ) : null}
          </div>

          <div className="mt-3 space-y-3">
            {node.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => runner.choose(choice.id)}
                className="flex min-h-[64px] w-full items-center gap-3 rounded-3xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-[transform,border-color] duration-150 hover:border-primary active:scale-[0.98]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg"
                >
                  {choice.icon ?? "•"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{choice.label}</span>
                  {choice.description ? (
                    <span className="block text-base text-muted-foreground">
                      {choice.description}
                    </span>
                  ) : null}
                </span>
                <span aria-hidden="true" className="text-muted-foreground">
                  ›
                </span>
              </button>
            ))}
          </div>

          {node.tip ? (
            <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-base text-accent-foreground">
              💡 <span className="font-bold">TATI Tip:</span> {node.tip}
            </p>
          ) : null}
        </section>
      ) : null}

      {state.phase === "consequence" && state.consequence ? (
        <section className="mt-4">
          {state.consequence.decisionChip ? (
            <p className="mb-3 inline-block rounded-full bg-accent-soft px-4 py-2 text-sm font-bold text-accent-foreground">
              🤝 {state.consequence.decisionChip}
            </p>
          ) : null}
          <h2 className="text-2xl font-bold">{state.consequence.headline}</h2>

          {state.consequence.image ? (
            <figure className="relative mt-3 overflow-hidden rounded-3xl border border-border">
              <img
                src={state.consequence.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-48 w-full object-cover"
              />
              {state.consequence.imageCaption ? (
                <figcaption className="absolute bottom-3 right-3 rounded-full bg-foreground/80 px-3 py-1 text-xs font-semibold text-background">
                  {state.consequence.imageCaption}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">🧾 Ledger update</p>
              {state.consequence.ledgerNote ? (
                <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">
                  {state.consequence.ledgerNote}
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="tati-consequence-in rounded-2xl bg-muted p-4">
                <p className="text-sm font-semibold">In pocket</p>
                <p className="text-xl font-bold">
                  {state.previousAvailable !== undefined &&
                  state.previousAvailable !== state.available ? (
                    <span className="mr-2 text-base font-semibold text-muted-foreground line-through">
                      GH₵{state.previousAvailable}
                    </span>
                  ) : null}
                  <AnimatedNumber
                    value={state.available}
                    prefix="GH₵"
                    className="tati-value-pop inline-block"
                  />
                </p>
                <p className="text-sm text-muted-foreground">Available to spend</p>
              </div>
              <div className="tati-consequence-in rounded-2xl bg-success-soft p-4 [animation-delay:70ms]">
                <p className="text-sm font-semibold text-success">Saved box</p>
                <p className="text-xl font-bold text-success">
                  {state.previousSaved !== undefined && state.previousSaved !== state.saved ? (
                    <span className="mr-2 text-base font-semibold text-muted-foreground line-through">
                      GH₵{state.previousSaved}
                    </span>
                  ) : null}
                  <AnimatedNumber
                    value={state.saved}
                    prefix="GH₵"
                    className="tati-value-pop inline-block"
                  />
                </p>
                <p className="text-sm text-muted-foreground">Untouched &amp; protected</p>
              </div>
            </div>
            {state.consequence.debtNote ? (
              <p className="mt-3 rounded-2xl bg-warning-soft px-4 py-2 text-base font-semibold text-warning-foreground">
                ⏳ {state.consequence.debtNote}
              </p>
            ) : null}
            <p className="mt-3 text-sm">
              Total on hand: <span className="font-bold">GH₵{state.available + state.saved}</span>
            </p>
          </div>

          <div className="mt-3 rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-bold">⚖️ {state.consequence.title}</h3>
            <p className="mt-1 text-muted-foreground">{state.consequence.body}</p>
          </div>

          {state.consequence.laterHint ? (
            <div className="mt-3 rounded-3xl bg-primary-soft p-5">
              <h3 className="font-bold text-primary">⏳ Something might happen later…</h3>
              <p className="mt-1 text-sm">{state.consequence.laterHint}</p>
            </div>
          ) : null}

          <div className="mt-4">
            <GoalCard label={scenario.goalLabel} saved={state.saved} target={state.goalTarget} />
          </div>

          <div className="mt-4">
            <PrimaryButton onClick={runner.continueOn}>Continue journey →</PrimaryButton>
          </div>
        </section>
      ) : null}

      {state.phase === "complete" ? (
        <section className="mt-4 space-y-3">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-xl font-bold">{summary.ending?.title ?? "Your story so far"}</h2>
            <p className="mt-1 text-muted-foreground">{summary.ending?.body}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm">In pocket</p>
                <p className="text-xl font-bold">GH₵{summary.available}</p>
              </div>
              <div className="rounded-2xl bg-success-soft p-4">
                <p className="text-sm text-success">Saved</p>
                <p className="text-xl font-bold text-success">GH₵{summary.saved}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {summary.stillNeeded > 0
                ? `GH₵${summary.stillNeeded} more to reach your ${scenario.goalLabel.toLowerCase()}.`
                : "You reached your goal amount!"}
            </p>
          </div>

          {summary.strengths.length ? (
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-bold">🌟 Your superpowers in this story</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {summary.strengths.map((c) => (
                  <li
                    key={c}
                    className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-foreground"
                  >
                    {COMPETENCY_LABELS[c]}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-bold">🪞 Looking back at your 14 days</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                💪 You earned <span className="font-bold">GH₵{summary.totals.earned}</span> through
                work and money that came back to you.
              </li>
              <li>
                🐖 You moved <span className="font-bold">GH₵{summary.totals.movedToSavings}</span>{" "}
                into your savings box.
              </li>
              <li>
                🛒 You spent or shared <span className="font-bold">GH₵{summary.totals.spent}</span>{" "}
                along the way.
              </li>
              <li>
                🔁 When plans changed, you made{" "}
                <span className="font-bold">{summary.decisions.length}</span> decisions and kept
                going.
              </li>
            </ul>
            <p className="mt-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm text-primary">
              {summary.reachedGoal
                ? "You reached your school bag amount — and you can see exactly which choices got you there."
                : "You did not reach GH₵80 this time, and that is completely fine. Finishing the journey and noticing what happened is real progress."}
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-bold">📖 The choices you made</h3>
            <ul className="mt-2 space-y-2">
              {summary.decisions.map((d, i) => (
                <li
                  key={i}
                  className="rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground"
                >
                  <span className="font-semibold">
                    Day {d.day} · {d.choiceLabel}
                  </span>
                  <span className="block text-muted-foreground">
                    Pocket GH₵{d.availableAfter} · Saved GH₵{d.savedAfter}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              {summary.ending?.reflection ?? scenario.closingReflection}
            </p>
          </div>

          <PrimaryButton
            onClick={() => {
              runner.clearSaved();
              onComplete({
                available: state.available,
                saved: state.saved,
                decisions: state.decisions,
              });
            }}
            disabled={!!saving}
          >
            {saving ? "Saving…" : "Save and continue"}
          </PrimaryButton>
          <button
            type="button"
            onClick={runner.restart}
            className="min-h-[48px] w-full rounded-2xl border border-border bg-card text-base font-semibold"
          >
            Try the story a different way
          </button>
        </section>
      ) : null}
    </Screen>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "success" | "accent";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-bold",
          tone === "success" && "text-success",
          tone === "accent" && "text-accent-foreground",
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function GoalCard({ label, saved, target }: { label: string; saved: number; target: number }) {
  const pct = Math.min(100, Math.round((saved / target) * 100));
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">🎒 {label}</p>
        <p className="text-sm font-semibold">
          GH₵{saved} of GH₵{target}
        </p>
      </div>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="text-muted-foreground">{pct}% reached</span>
        <span className="font-semibold text-accent-foreground">
          {Math.max(0, target - saved) > 0 ? `GH₵${target - saved} more needed` : "Goal reached 🎉"}
        </span>
      </div>
    </section>
  );
}
