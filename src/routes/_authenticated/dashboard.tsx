import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Screen, Card, PrimaryButton, ProgressBar } from "@/components/learning/primitives";
import { useAddChild, useChildren } from "@/lib/learning/progress";
import { itemTitle } from "@/lib/learning/track";
import { skillSentence } from "@/lib/learning/parent-insights";
import { useChildProgress } from "@/lib/progress/service";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Parent dashboard — TATI ChildSave" },
      { name: "description", content: "Follow your child's saving journey, progress and insights." },
      { property: "og:title", content: "Parent dashboard — TATI ChildSave" },
      { property: "og:description", content: "Progress and insights from your child's SAVE track." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: children, isLoading } = useChildren();
  const addChild = useAddChild();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [age, setAge] = useState(10);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void trackEvent("parent_dashboard_viewed", { eventKey: "parent-dashboard" });
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <Screen>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Parent space</p>
          <h1 className="text-3xl font-bold">Your children</h1>
        </div>
        <button onClick={signOut} className="min-h-[48px] text-sm font-semibold text-muted-foreground">
          Sign out
        </button>
      </header>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}

      <div className="space-y-4">
        {children?.map((child) => <ChildCard key={child.id} childId={child.id} name={child.name} age={child.age} />)}
      </div>

      {!isLoading && children?.length === 0 ? (
        <Card>
          <h2 className="text-lg font-bold">Add your first learner</h2>
          <p className="mt-1 text-muted-foreground">
            Each child gets their own TATI Junior profile and progress.
          </p>
        </Card>
      ) : null}

      <div className="mt-6">
        {showForm ? (
          <Card>
            <h2 className="text-lg font-bold">New learner</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                await addChild.mutateAsync({ name, age, avatar: "kente" });
                setName("");
                setAge(10);
                setShowForm(false);
              }}
            >
              <div>
                <label htmlFor="childName" className="mb-1 block text-sm font-semibold">
                  Child's name
                </label>
                <input
                  id="childName"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kwabena"
                  className="min-h-[48px] w-full rounded-2xl border border-border bg-background px-4 text-base"
                />
              </div>
              <div>
                <label htmlFor="childAge" className="mb-1 block text-sm font-semibold">
                  Age
                </label>
                <input
                  id="childAge"
                  type="number"
                  min={8}
                  max={12}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="min-h-[48px] w-full rounded-2xl border border-border bg-background px-4 text-base"
                />
              </div>
              <PrimaryButton type="submit" disabled={addChild.isPending}>
                {addChild.isPending ? "Adding…" : "Add child"}
              </PrimaryButton>
            </form>
          </Card>
        ) : (
          <PrimaryButton onClick={() => setShowForm(true)}>Add a child</PrimaryButton>
        )}
      </div>
    </Screen>
  );
}

function ChildCard({ childId, name, age }: { childId: string; name: string; age: number }) {
  const progress = useChildProgress(childId);
  const { track, journey: snapshot, game, competency, isLoading, isError, continuePath } = progress;
  const growth = competency.growth;
  const strong = competency.strengths.slice(0, 3);
  const growing = competency.stillDeveloping.slice(0, 2);
  const starters = progress.conversationStarters;
  const hasPost = progress.assessments.postDone;

  useEffect(() => {
    if (!isLoading && starters.length > 0) {
      void trackEvent("parent_conversation_prompt_viewed", { childProfileId: childId, eventKey: childId });
    }
  }, [childId, isLoading, starters.length]);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{name}</h2>
          <p className="text-sm text-muted-foreground">
            TATI Junior · age {age} · SAVE journey: Term Ready Challenge
          </p>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-foreground">
          {snapshot.completionPct}% done
        </span>
      </div>

      {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading progress…</p> : null}
      {isError ? (
        <p className="mt-4 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          We could not load progress just now. Please try again in a moment.
        </p>
      ) : null}

      <div className="mt-4">
        <ProgressBar
          value={snapshot.doneItems.length}
          max={track.sequence.length}
          label={`${snapshot.doneItems.length} of ${track.sequence.length} stops finished`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
          <p className="font-bold">Lessons</p>
          <p className="text-muted-foreground">
            {snapshot.lessonsDone} of {snapshot.lessonsTotal} finished
          </p>
        </div>
        <div className="rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
          <p className="font-bold">Money story</p>
          <p className="text-muted-foreground">
            {snapshot.scenarioDone} of {snapshot.scenarioTotal} chapters
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{snapshot.scenarioStatus}</p>

      {snapshot.currentItem ? (
        <p className="mt-2 text-sm">
          <span className="font-bold">Up next:</span> {itemTitle(track, snapshot.currentItem)}
        </p>
      ) : (
        <p className="mt-2 text-sm font-bold">The whole SAVE journey is complete. 🎉</p>
      )}

      {snapshot.recentTitles.length > 0 || game.earnedBadges.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-accent-soft p-4">
          <p className="text-sm font-bold text-accent-foreground">Recent achievements</p>
          <ul className="mt-2 space-y-1 text-sm text-accent-foreground/90">
            {game.earnedBadges.slice(-2).map((b) => (
              <li key={b.definition.id}>
                {b.definition.icon} {b.definition.name} — {b.definition.blurb}
              </li>
            ))}
            {snapshot.recentTitles.map((t) => (
              <li key={t}>✅ {t}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Skills developing
        </h3>
        {growth.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Skills appear here after {name} finishes the first money check-in.
          </p>
        ) : (
          <>
            <ul className="mt-2 space-y-2">
              {strong.map((s) => (
                <li key={s.competency} className="rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                  {skillSentence(name, s)}
                </li>
              ))}
            </ul>
            {growing.length > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Still growing: {growing.map((s) => s.label.toLowerCase()).join(" and ")}.
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">
              {hasPost
                ? "Comparing the first and final check-ins shows where thinking changed."
                : "The final check-in at the end of the journey will show how this has changed."}
            </p>
          </>
        )}
      </div>

      <div className="mt-4 rounded-2xl border-2 border-dashed border-border p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Talk about it at home</h3>
        <ul className="mt-2 space-y-2">
          {starters.map((s) => (
            <li key={s} className="text-sm">
              💬 {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to={continuePath}
          className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Continue learning →
        </Link>
        <Link
          to="/learn/$childId/summary"
          params={{ childId }}
          className="flex min-h-[48px] items-center justify-center rounded-2xl bg-secondary px-4 text-sm font-semibold text-secondary-foreground"
        >
          Full summary
        </Link>
      </div>
    </Card>
  );
}
