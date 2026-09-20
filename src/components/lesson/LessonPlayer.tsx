import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { tatiTheme } from "@/lib/theme";
import { ListenButton } from "@/components/tati";
import type { Activity, ContentBlock, Lesson, QuickCheck } from "@/lib/lessons/types";

const toneRing: Record<string, string> = {
  save: "border-l-4 border-success",
  spend: "border-l-4 border-destructive",
  share: "border-l-4 border-accent",
  plan: "border-l-4 border-primary",
};

const toneText: Record<string, string> = {
  save: "text-success",
  spend: "text-destructive",
  share: "text-accent-foreground",
  plan: "text-primary",
};

export interface LessonDraft {
  taps: string[];
  quickCheck: string | null;
  activityChoice: string | null;
  sorted: string[];
  allocation: Record<string, number>;
  reflection: string;
}

function emptyDraft(activity?: Activity): LessonDraft {
  const allocation: Record<string, number> = {};
  if (activity?.kind === "allocate") for (const jar of activity.jars) allocation[jar.id] = 0;
  return { taps: [], quickCheck: null, activityChoice: null, sorted: [], allocation, reflection: "" };
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl bg-card p-5 shadow-card", className)}>{children}</div>;
}

export function LessonPlayer({
  lesson,
  childId,
  backTo,
  stepLabel,
  saving,

  onComplete,
}: {
  lesson: Lesson;
  childId: string;
  backTo: string;
  stepLabel?: string | undefined;
  saving?: boolean | undefined;
  onComplete: (draft: LessonDraft) => void;
}) {
  const storageKey = `tati.lesson.${childId}.${lesson.id}`;
  const [draft, setDraft] = useState<LessonDraft>(() => emptyDraft(lesson.activity));
  const [resumed, setResumed] = useState(false);

  // Resume where the learner left off.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<LessonDraft>;
        setDraft({ ...emptyDraft(lesson.activity), ...saved });
        setResumed(Boolean(saved.taps?.length || saved.quickCheck || saved.activityChoice || saved.sorted?.length || Object.values(saved.allocation ?? {}).some(Boolean) || saved.reflection));
      }
      else setDraft(emptyDraft(lesson.activity));
    } catch {
      setDraft(emptyDraft(lesson.activity));
    }
  }, [childId, lesson.id]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      /* storage unavailable — the lesson still works */
    }
  }, [draft, storageKey]);

  const patch = (p: Partial<LessonDraft>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className={cn(tatiTheme.container, "flex items-center gap-3 py-3")}>
          <Link
            to={backTo}
            aria-label="Back to my journey"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-xl"
          >
            <span aria-hidden="true">←</span>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-primary">TATI ChildSave</p>
            <p className="truncate text-sm text-muted-foreground">{lesson.subtitle ?? "Interactive lesson"}</p>
          </div>
          <ListenButton />
        </div>
      </header>

      <main className={cn(tatiTheme.container, "space-y-4 pb-28 pt-4")}>
        {resumed ? (
          <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm font-bold text-success">
            Welcome back! Ready to continue?
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {stepLabel ? (
            <span className="rounded-full bg-secondary px-3 py-1.5 text-sm font-extrabold text-secondary-foreground">
              📖 {stepLabel}
              {lesson.topic ? ` • ${lesson.topic}` : ""}
            </span>
          ) : null}
          <span className="rounded-full bg-success-soft px-3 py-1.5 text-sm font-extrabold text-success">
            +{lesson.xpReward} Pts
          </span>
          <span className="rounded-full bg-secondary px-3 py-1.5 text-sm font-extrabold text-secondary-foreground">
            ⏱ {lesson.estimatedMinutes} min
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold leading-tight">{lesson.title}</h1>
          <p className="mt-2 text-base text-muted-foreground">{lesson.learningObjective}</p>
        </div>

        {lesson.illustration ? (
          <figure className="relative overflow-hidden rounded-3xl shadow-card">
            <img src={lesson.illustration} alt="" loading="eager" decoding="async" className="h-48 w-full object-cover" />
            {lesson.illustrationBadge ? (
              <figcaption className="absolute bottom-0 left-0 right-0 bg-foreground/60 px-4 py-2 text-sm font-extrabold text-background">
                {lesson.illustrationBadge}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {lesson.contentBlocks.map((block, i) => (
          <Block key={i} block={block} draft={draft} patch={patch} />
        ))}

        {lesson.activity ? <ActivityBlock activity={lesson.activity} draft={draft} patch={patch} /> : null}

        {lesson.knowledgeCheck ? (
          <QuickCheckBlock check={lesson.knowledgeCheck} selected={draft.quickCheck} onSelect={(id) => patch({ quickCheck: id })} />
        ) : null}

        {lesson.reflection ? (
          <Card>
            <h2 className="text-lg font-extrabold">💭 {lesson.reflection.prompt}</h2>
            <textarea
              value={draft.reflection}
              onChange={(e) => patch({ reflection: e.target.value })}
              placeholder={lesson.reflection.placeholder}
              rows={3}
              className="mt-3 w-full rounded-2xl border border-border bg-background p-4 text-base"
              aria-label={lesson.reflection.prompt}
            />
          </Card>
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur">
        <div className={tatiTheme.container}>
          <button
            type="button"
            onClick={() => onComplete(draft)}
            disabled={saving}
            className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-lg font-extrabold text-primary-foreground transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving…" : (lesson.ctaLabel ?? "Continue")} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Block({
  block,
  draft,
  patch,
}: {
  block: ContentBlock;
  draft: LessonDraft;
  patch: (p: Partial<LessonDraft>) => void;
}) {
  if (block.type === "text") return <p className="text-base leading-relaxed">{block.body}</p>;

  if (block.type === "highlight") {
    const tone =
      block.tone === "warn" ? "bg-destructive/10" : block.tone === "good" ? "bg-success-soft" : "bg-primary-soft";
    return (
      <div className={cn("rounded-3xl p-5", tone)}>
        <p className="text-base font-bold leading-relaxed">{block.body}</p>
      </div>
    );
  }

  if (block.type === "scene") {
    return (
      <figure className="relative overflow-hidden rounded-3xl shadow-card">
        <img src={block.imageUrl} alt="" loading="lazy" decoding="async" className="h-48 w-full object-cover" />
        {block.caption ? (
          <figcaption className="absolute bottom-0 left-0 right-0 bg-foreground/60 px-4 py-2 text-sm font-extrabold text-background">
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (block.type === "cards") {
    return (
      <div className="space-y-3">
        {block.intro ? <p className="text-base">{block.intro}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {block.cards.map((c) => {
            const open = draft.taps.includes(c.id);
            const interactive = Boolean(c.reveal);
            return (
              <button
                key={c.id}
                type="button"
                disabled={!interactive}
                onClick={() =>
                  patch({ taps: open ? draft.taps.filter((t) => t !== c.id) : [...draft.taps, c.id] })
                }
                className={cn(
                  "min-h-[48px] rounded-3xl bg-card p-5 text-left shadow-card",
                  c.tone ? toneRing[c.tone] : "",
                )}
              >
                {c.icon ? <span aria-hidden="true" className="text-2xl">{c.icon}</span> : null}
                <p className={cn("text-sm font-extrabold uppercase tracking-widest", c.tone ? toneText[c.tone] : "")}>
                  {c.label}
                </p>
                <p className="mt-1 text-lg font-extrabold">{c.title}</p>
                <p className="mt-1 text-base text-muted-foreground">{c.body}</p>
                {c.chip ? (
                  <span className="mt-3 inline-block rounded-xl bg-secondary px-3 py-1.5 text-sm font-extrabold text-secondary-foreground">
                    {c.chip}
                  </span>
                ) : null}
                {interactive ? (
                  <p className="mt-2 text-sm font-bold text-primary">{open ? c.reveal : "Tap to explore"}</p>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={cn("text-lg font-extrabold", block.tone === "warn" ? "text-destructive" : "text-success")}>
            {block.title}
          </h2>
          {block.chip ? (
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-extrabold">{block.chip}</span>
          ) : null}
        </div>
        {block.body ? <p className="mt-2 text-base text-muted-foreground">{block.body}</p> : null}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {block.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-base">
              <span aria-hidden="true">{it.icon ?? "•"}</span>
              <span>{it.label}</span>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  if (block.type === "tip") {
    return (
      <Card className="border-l-4 border-accent">
        <h2 className="text-lg font-extrabold">💡 {block.title}</h2>
        <p className="mt-1 whitespace-pre-line text-base leading-relaxed">{block.body}</p>
        {block.example ? (
          <p className="mt-3 whitespace-pre-line rounded-2xl bg-secondary p-4 text-base">{block.example}</p>
        ) : null}
      </Card>
    );
  }

  if (block.type === "steps") {
    return (
      <div className="space-y-3">
        {block.steps.map((s) => (
          <Card key={s.id}>
            <p className="text-sm font-extrabold uppercase tracking-widest text-primary">{s.label}</p>
            <p className="mt-1 text-lg font-extrabold">{s.title}</p>
            <p className="mt-1 text-base text-muted-foreground">{s.body}</p>
            {s.note ? (
              <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-base font-bold">{s.note}</p>
            ) : null}
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {block.items.map((s) => (
        <div key={s.label} className="rounded-3xl bg-card p-4 text-center shadow-card">
          <p className="text-sm text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-lg font-extrabold">{s.value}</p>
          {s.note ? <p className="text-sm text-muted-foreground">{s.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

function QuickCheckBlock({
  check,
  selected,
  onSelect,
}: {
  check: QuickCheck;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">💡 Quick check!</h2>
        {check.chip ? (
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-extrabold">{check.chip}</span>
        ) : null}
      </div>
      <p className="mt-2 text-base leading-relaxed">{check.prompt}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {check.options.map((o) => {
          const chosen = selected === o.id;
          const good = chosen && o.id === check.correctOptionId;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              aria-pressed={chosen}
              className={cn(
                "min-h-[48px] rounded-2xl px-4 py-3 text-base font-extrabold",
                good
                  ? "bg-success text-success-foreground"
                  : chosen
                    ? "bg-primary-soft text-primary"
                    : "bg-secondary text-secondary-foreground",
              )}
            >
              {good ? "✓ " : ""}
              {o.label}
            </button>
          );
        })}
      </div>
      {selected ? (
        <div className="mt-3 rounded-2xl bg-secondary p-4">
          <p className="text-base font-extrabold">
            {selected === check.correctOptionId ? (check.feedbackTitle ?? "Well reasoned!") : "Interesting choice."}
          </p>
          <p className="mt-1 text-base text-muted-foreground">{check.feedback}</p>
        </div>
      ) : null}
    </Card>
  );
}

function ActivityBlock({
  activity,
  draft,
  patch,
}: {
  activity: Activity;
  draft: LessonDraft;
  patch: (p: Partial<LessonDraft>) => void;
}) {
  if (activity.kind === "sort") {
    const picked = draft.sorted;
    const foundNeeds = activity.items.filter((i) => i.isNeed && picked.includes(i.id)).length;
    return (
      <Card>
        <h2 className="text-lg font-extrabold">👆 {activity.title}</h2>
        <p className="mt-1 text-base">{activity.instruction}</p>
        {activity.helper ? <p className="mt-1 text-base text-muted-foreground">{activity.helper}</p> : null}
        <p className="mt-2 text-base font-extrabold text-success">{foundNeeds} needs found</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {activity.items.map((it) => {
            const on = picked.includes(it.id);
            return (
              <button
                key={it.id}
                type="button"
                aria-pressed={on}
                onClick={() => patch({ sorted: on ? picked.filter((p) => p !== it.id) : [...picked, it.id] })}
                className={cn(
                  "min-h-[48px] rounded-2xl border-2 bg-card p-4 text-left",
                  on ? "border-success" : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-base font-extrabold",
                      on ? "bg-success text-success-foreground" : "bg-secondary",
                    )}
                  >
                    {on ? "✓" : "+"}
                  </span>
                  {it.price !== undefined ? (
                    <span className="rounded-xl bg-secondary px-3 py-1 text-base font-extrabold">GH₵{it.price}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-base font-extrabold">{it.label}</p>
                {it.note ? <p className="text-base text-muted-foreground">{it.note}</p> : null}
              </button>
            );
          })}
        </div>
        {picked.length > 0 ? (
          <div className="mt-3 rounded-2xl bg-secondary p-4">
            <p className="text-base font-extrabold">{activity.feedbackTitle ?? "Great eye!"}</p>
            <p className="mt-1 text-base text-muted-foreground">{activity.feedback}</p>
          </div>
        ) : null}
      </Card>
    );
  }

  if (activity.kind === "allocate") return <Allocator activity={activity} draft={draft} patch={patch} />;

  return (
    <Card>
      <h2 className="text-lg font-extrabold">{activity.title}</h2>
      <p className="mt-1 text-base">{activity.instruction}</p>
      <div className="mt-3 space-y-2">
        {activity.options.map((o) => {
          const on = draft.activityChoice === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => patch({ activityChoice: o.id })}
              className={cn(
                "min-h-[48px] w-full rounded-2xl border-2 p-4 text-left text-base font-extrabold",
                on ? "border-primary bg-primary-soft text-primary" : "border-border bg-card",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {draft.activityChoice ? (
        <p className="mt-3 rounded-2xl bg-secondary p-4 text-base">
          {activity.options.find((o) => o.id === draft.activityChoice)?.response}
        </p>
      ) : null}
    </Card>
  );
}

function Allocator({
  activity,
  draft,
  patch,
}: {
  activity: Extract<Activity, { kind: "allocate" }>;
  draft: LessonDraft;
  patch: (p: Partial<LessonDraft>) => void;
}) {
  const allocation = draft.allocation ?? {};
  const used = useMemo(
    () => activity.jars.reduce((sum, j) => sum + (allocation[j.id] ?? 0), 0),
    [activity.jars, allocation],
  );
  const left = activity.total - used;

  const bump = (id: string, delta: number) => {
    const current = allocation[id] ?? 0;
    const next = Math.max(0, Math.min(current + delta, current + Math.max(0, left)));
    patch({ allocation: { ...allocation, [id]: next } });
  };

  return (
    <Card>
      <h2 className="text-lg font-extrabold">{activity.title}</h2>
      <p className="mt-1 text-base">{activity.instruction}</p>
      <p className="mt-3 rounded-2xl bg-secondary px-4 py-3 text-base font-extrabold">
        Total GH₵{activity.total} · Left GH₵{left}
      </p>
      <div className="mt-3 space-y-3">
        {activity.jars.map((j) => {
          const value = allocation[j.id] ?? 0;
          const pct = activity.total ? Math.round((value / activity.total) * 100) : 0;
          return (
            <div key={j.id} className={cn("rounded-3xl bg-secondary p-4", toneRing[j.tone])}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-extrabold">
                  <span aria-hidden="true">{j.icon} </span>
                  {j.label}
                </p>
                <span className={cn("text-base font-extrabold", toneText[j.tone])}>{pct}%</span>
              </div>
              {j.note ? <p className="text-base text-muted-foreground">{j.note}</p> : null}
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Take one cedi out of ${j.label}`}
                  onClick={() => bump(j.id, -1)}
                  className="h-12 w-12 rounded-2xl bg-card text-xl font-extrabold"
                >
                  −
                </button>
                <p className="flex-1 text-center text-lg font-extrabold">GH₵{value}</p>
                <button
                  type="button"
                  aria-label={`Add one cedi to ${j.label}`}
                  onClick={() => bump(j.id, 1)}
                  disabled={left <= 0}
                  className="h-12 w-12 rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {left === 0 ? (
        <div className="mt-3 rounded-2xl bg-success-soft p-4">
          <p className="text-base font-extrabold text-success">{activity.feedbackTitle ?? "All allocated! ✨"}</p>
          <p className="mt-1 text-base">{activity.feedback}</p>
        </div>
      ) : null}
    </Card>
  );
}
