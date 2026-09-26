import { Link } from "@tanstack/react-router";
import { ListenButton } from "@/components/tati/Layout";
import { useAssessmentRunner } from "@/lib/assessment/useAssessmentRunner";
import { COMPETENCY_LABELS } from "@/lib/assessment/types";
import type { AssessmentDefinition, AssessmentResult } from "@/lib/assessment/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Reusable one-question-at-a-time assessment UI.
 * Content comes from the definition; this component holds no questions.
 */

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-4">{children}</div>
    </div>
  );
}

function Header({ title, backTo }: { title: string; backTo: string }) {
  return (
    <header className="mb-4 flex items-center gap-3">
      <Link
        to={backTo}
        aria-label="Go back"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl text-foreground"
      >
        <span aria-hidden="true">←</span>
      </Link>
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground"
      >
        Tati
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold text-muted-foreground">TATI Junior</p>
        <h1 className="break-words text-lg font-extrabold leading-tight">{title}</h1>
      </div>
      <ListenButton />
    </header>
  );
}

function Scene({
  url,
  badge,
  alt,
  loading = "lazy",
}: {
  url: string;
  badge?: string;
  alt: string;
  loading?: "eager" | "lazy";
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-card">
      <img
        src={url}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={loading === "eager" ? "high" : "auto"}
        className="h-auto w-full object-cover"
      />
      {badge ? (
        <span className="absolute bottom-3 right-3 rounded-full bg-foreground/80 px-4 py-2 text-sm font-extrabold text-background">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function CtaButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-primary px-6 text-lg font-extrabold text-primary-foreground shadow-card transition-[transform,opacity] duration-150 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}

export function AssessmentRunner({
  definition,
  storageKey,
  backTo,
  saving = false,
  onComplete,
  completeLabel = "Start My Journey 🚀",
  childName,
  submitError,
}: {
  definition: AssessmentDefinition;
  storageKey?: string;
  backTo: string;
  saving?: boolean;
  onComplete: (result: AssessmentResult) => void;
  completeLabel?: string;
  childName?: string;
  submitError?: string | null;
}) {
  const runner = useAssessmentRunner(definition, storageKey);
  const headerTitle = definition.shortTitle ?? definition.title;

  if (runner.stage === "intro") {
    return (
      <Shell>
        <Header title={headerTitle} backTo={backTo} />

        {submitError ? (
          <div className="mb-4 rounded-2xl bg-warning-soft px-4 py-3">
            <p className="text-sm text-warning-foreground">{submitError}</p>
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
            🌱 Welcome • No Wrong Answers
          </span>
          {definition.estimatedMinutes ? (
            <span className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
              ⏱ ~{definition.estimatedMinutes} mins · {definition.questions.length} stories
            </span>
          ) : null}
        </div>

        {definition.introImageUrl ? (
          <Scene
            url={definition.introImageUrl}
            loading="eager"
            {...(definition.introImageBadge ? { badge: definition.introImageBadge } : {})}
            alt="A boy sitting at a table outside his school"
          />
        ) : null}

        <h2 className="mt-5 text-3xl font-extrabold leading-tight">
          {definition.introHeadline ?? definition.title}
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{definition.intro}</p>

        {definition.introTopics?.length ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {definition.introTopics.map((t) => (
              <span
                key={t.label}
                className="shrink-0 rounded-2xl bg-card px-4 py-3 text-base font-bold shadow-card"
              >
                <span aria-hidden="true" className="mr-2">
                  {t.icon}
                </span>
                {t.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 rounded-3xl bg-card p-5 shadow-card">
          <div className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success-soft text-xl"
            >
              😊
            </span>
            <div>
              <h3 className="text-lg font-extrabold">Just be yourself</h3>
              <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                Every choice helps TATI know how to guide your adventure. Pick what sounds like you!
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-secondary p-4">
            <p className="text-base font-extrabold">
              <span aria-hidden="true" className="mr-2">
                🌟
              </span>
              TATI Golden Rule
            </p>
            <p className="mt-1 text-base leading-relaxed text-muted-foreground">
              There are no “right” or “wrong” choices here. Great money managers think about their
              goals and trade-offs.
            </p>
          </div>
          {definition.startingWallet != null ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-primary/10 px-4 py-3">
              <span className="text-base font-bold">💳 Starting Practice Wallet</span>
              <span className="text-lg font-extrabold text-primary tabular-nums">
                GH₵{definition.startingWallet.toFixed(2)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <CtaButton onClick={runner.start}>Let's Go! 🚀</CtaButton>
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-muted-foreground">
          🔒 Your answers stay private to your family
        </p>
      </Shell>
    );
  }

  if (runner.stage === "complete") {
    const { result } = runner;
    const superpowers = [...result.competencies].sort((a, b) => b.ratio - a.ratio).slice(0, 3);

    return (
      <Shell>
        <Header title={headerTitle} backTo={backTo} />

        {submitError ? (
          <div className="mb-4 rounded-2xl bg-warning-soft px-4 py-3">
            <p className="text-sm text-warning-foreground">{submitError}</p>
          </div>
        ) : null}

        {runner.resumed ? (
          <p className="mb-3 rounded-2xl bg-success-soft px-4 py-3 text-sm font-bold text-success">
            Welcome back! Ready to continue?
          </p>
        ) : null}

        <div className="flex justify-center">
          <span className="rounded-full bg-card px-5 py-3 text-base font-extrabold shadow-card">
            🎉 Check-In Complete! • All Set
          </span>
        </div>

        <h2 className="mt-5 text-center text-3xl font-extrabold leading-tight">
          Nice thinking{childName ? `, ${childName}` : ""}! 🌟
        </h2>
        <p className="mt-3 text-center text-lg leading-relaxed text-muted-foreground">
          {definition.outro}
        </p>

        {definition.outroImageUrl ? (
          <div className="mt-5">
            <Scene
              url={definition.outroImageUrl}
              {...(definition.outroImageBadge ? { badge: definition.outroImageBadge } : {})}
              alt="Children celebrating in a school yard"
            />
          </div>
        ) : null}

        <div className="mt-6 flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-extrabold">✨ Your Superpowers</h3>
          <p className="text-sm font-extrabold text-success">
            {superpowers.length} traits discovered
          </p>
        </div>
        <ul className="mt-3 space-y-3">
          {superpowers.map((s) => (
            <li key={s.competency} className="rounded-3xl bg-card p-4 shadow-card">
              <p className="text-base font-extrabold">{COMPETENCY_LABELS[s.competency]}</p>
              <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                You thought carefully about {COMPETENCY_LABELS[s.competency].toLowerCase()}.
              </p>
            </li>
          ))}
        </ul>

        {definition.showScoreToChild ? (
          <p className="mt-4 text-center text-base text-muted-foreground">
            You picked the saver's choice on {result.points} of {result.maxPoints} stories.
          </p>
        ) : null}

        <div className="mt-6">
          <CtaButton onClick={() => onComplete(result)} disabled={saving}>
            {saving ? "Saving…" : completeLabel}
          </CtaButton>
        </div>
      </Shell>
    );
  }

  const question = runner.question!;
  const pct = Math.round(((runner.index + 1) / runner.total) * 100);

  return (
    <Shell>
      <Header title={headerTitle} backTo={backTo} />

      {submitError ? (
        <div className="mb-4 rounded-2xl bg-warning-soft px-4 py-3">
          <p className="text-sm text-warning-foreground">{submitError}</p>
        </div>
      ) : null}

      {runner.resumed ? (
        <p className="mb-3 rounded-2xl bg-success-soft px-4 py-3 text-sm font-bold text-success">
          Welcome back! Ready to continue?
        </p>
      ) : null}

      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
          ✨ Question {runner.index + 1} of {runner.total} •{" "}
          {question.topic ?? COMPETENCY_LABELS[question.competency]}
        </span>
        <span className="ml-auto text-base font-extrabold text-success tabular-nums">{pct}%</span>
      </div>
      <div
        className="mb-5 h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Question ${runner.index + 1} of ${runner.total}`}
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div
        key={question.id}
        className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
      >
        {question.imageUrl ? (
          <Scene
            url={question.imageUrl}
            {...(question.imageBadge ? { badge: question.imageBadge } : {})}
            alt="A money story scene"
          />
        ) : null}

        <div className="mt-4 rounded-3xl bg-card p-5 shadow-card">
          <div className="flex items-start gap-3">
            <h2 className="flex-1 text-xl font-bold leading-snug">
              {question.illustration && !question.imageUrl ? (
                <span aria-hidden="true" className="mr-2">
                  {question.illustration}
                </span>
              ) : null}
              {question.question}
            </h2>
          </div>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            <span aria-hidden="true" className="mr-2">
              🧭
            </span>
            {question.hint ?? "There are no wrong answers — pick the plan that suits you best!"}
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {question.options.map((opt) => {
            const selected = runner.selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => runner.select(opt.id)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-start gap-3 rounded-3xl p-4 text-left shadow-card transition-[transform,background-color] duration-150 active:scale-[0.98]",
                  selected ? "bg-primary/10 ring-2 ring-primary" : "bg-card hover:bg-secondary/60",
                )}
              >
                {opt.icon ? (
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-xl"
                  >
                    {opt.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold leading-snug">{opt.label}</span>
                  {opt.description ? (
                    <span className="mt-1 block text-base leading-relaxed text-muted-foreground">
                      {opt.description}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    selected ? "bg-primary" : "bg-muted",
                  )}
                >
                  {selected ? (
                    <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {runner.selected ? (
          <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-base leading-relaxed text-secondary-foreground">
            <span aria-hidden="true" className="mr-2">
              💡
            </span>
            {question.options.find((o) => o.id === runner.selected)?.response ?? question.feedback}
          </p>
        ) : (
          <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-base leading-relaxed text-secondary-foreground">
            <span aria-hidden="true" className="mr-2">
              💡
            </span>
            <strong>Remember:</strong> Honest choices make your journey personalised and fun.
          </p>
        )}

        <div className="mt-5 flex gap-3">
          {!runner.isFirst ? (
            <button
              type="button"
              onClick={runner.back}
              className="min-h-[56px] shrink-0 rounded-2xl bg-card px-6 text-base font-extrabold shadow-card"
            >
              Back
            </button>
          ) : null}
          <CtaButton onClick={runner.next} disabled={!runner.canAdvance}>
            {runner.isLast ? "Finish ✨" : "Continue →"}
          </CtaButton>
        </div>
      </div>
    </Shell>
  );
}
