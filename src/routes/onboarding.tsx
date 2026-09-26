import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateChildProfile } from "@/lib/family";
import {
  Page,
  PageHeader,
  Card,
  CardTitle,
  CardNote,
  Button,
  Badge,
  ProgressBar,
  Avatar,
  AVATAR_KEYS,
  StatCard,
  LoadingState,
  AuthLoadingShell,
} from "@/components/tati";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return {};
  },
  pendingComponent: AuthLoadingShell,
  head: () => ({
    meta: [
      { title: "Start the TATI adventure — TATI ChildSave" },
      {
        name: "description",
        content: "Meet TATI, pick a name, an age and a character, and begin the money adventure.",
      },
      { property: "og:title", content: "Start the TATI adventure — TATI ChildSave" },
      {
        property: "og:description",
        content: "A short, friendly start to your child's money journey.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const ages = [8, 9, 10, 11, 12];
const STEPS = ["welcome", "name", "age", "avatar", "meet", "journey", "start"] as const;
const DRAFT_KEY = "tati.onboarding.draft";

interface Draft {
  step: number;
  name: string;
  age: number;
  avatar: string;
}

const emptyDraft: Draft = { step: 0, name: "", age: 10, avatar: "kojo" };

function loadDraft(): Draft {
  if (typeof window === "undefined") return emptyDraft;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return { ...emptyDraft, ...parsed };
  } catch {
    return emptyDraft;
  }
}

function Onboarding() {
  const navigate = useNavigate();
  const createChild = useCreateChildProfile();
  const [ready, setReady] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadDraft();
    setDraft(saved);
    setResumed(saved.step > 0);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, ready]);

  const step = draft.step;
  const set = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }));
  const go = (next: number) => {
    setResumed(false);
    set({ step: Math.max(0, Math.min(STEPS.length - 1, next)) });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  async function startJourney() {
    setError(null);
    try {
      const child = await createChild.mutateAsync({
        name: draft.name.trim() || "Friend",
        age: draft.age,
        avatar: draft.avatar,
        onboardingCompleted: true,
      });
      window.localStorage.removeItem(DRAFT_KEY);
      navigate({
        to: "/learn/$childId/assessment/$assessmentId",
        params: { childId: child.id, assessmentId: "save-pre" },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't save that profile. Let's try once more.",
      );
    }
  }

  if (!ready) {
    return (
      <Page>
        <LoadingState label="Getting the adventure ready…" />
      </Page>
    );
  }

  const nameOk = draft.name.trim().length >= 2;

  return (
    <Page>
      <PageHeader
        backTo="/parent"
        eyebrow="TATI Junior"
        title={
          step === 0
            ? "Welcome!"
            : step === 1
              ? "What's your name?"
              : step === 2
                ? "How old are you?"
                : step === 3
                  ? "Pick your character"
                  : step === 4
                    ? "Meet TATI"
                    : step === 5
                      ? "Your journey"
                      : "All set!"
        }
        listenable
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Badge tone="neutral" icon="🎒">
          Step {step + 1} of {STEPS.length}
        </Badge>
        <span className="text-sm font-extrabold text-muted-foreground">
          {Math.round(((step + 1) / STEPS.length) * 100)}%
        </span>
      </div>
      <ProgressBar value={step + 1} max={STEPS.length} className="mb-5" />

      {resumed ? (
        <Card tone="muted" className="mb-5">
          <CardNote>👋 Welcome back — we picked up right where you stopped.</CardNote>
        </Card>
      ) : null}

      <StepShell stepKey={step}>
        {step === 0 ? (
          <div className="space-y-5">
            <Card className="text-center">
              <Avatar avatar={draft.avatar} size="xl" ring="accent" className="mx-auto" />
              <h2 className="mt-4 text-3xl font-extrabold leading-tight">
                A money adventure is about to begin! ✨
              </h2>
              <p className="mt-3 text-lg text-muted-foreground">
                You'll earn, save, spend and make your own choices. Every choice teaches you
                something.
              </p>
            </Card>
            <Button size="lg" onClick={() => go(1)}>
              Let's go! 🚀
            </Button>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <h2 className="text-3xl font-extrabold leading-tight">What should TATI call you?</h2>
            <p className="text-lg text-muted-foreground">
              Your first name or a nickname is perfect.
            </p>
            <Card>
              <label htmlFor="childName" className="mb-1 block text-base font-bold">
                Name or nickname
              </label>
              <input
                id="childName"
                value={draft.name}
                maxLength={15}
                autoComplete="off"
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Kojo"
                className="min-h-[56px] w-full rounded-2xl border border-border bg-background px-4 text-lg font-bold"
              />
              <CardNote className="mt-2">
                🔒 No email, phone number or password — you learn safely under your parent's
                account.
              </CardNote>
            </Card>
            <Button size="lg" onClick={() => go(2)} disabled={!nameOk}>
              Continue →
            </Button>
            <Button variant="ghost" onClick={() => go(0)}>
              Back
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <h2 className="text-3xl font-extrabold leading-tight">
              How old are you, {draft.name.trim() || "friend"}?
            </h2>
            <p className="text-lg text-muted-foreground">TATI Junior is made for ages 8 to 12.</p>
            <div className="grid grid-cols-5 gap-2">
              {ages.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => set({ age: a })}
                  aria-pressed={draft.age === a}
                  className={cn(
                    "min-h-[56px] rounded-2xl text-lg font-extrabold shadow-card transition-transform active:scale-95",
                    draft.age === a ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <Card tone="muted" className="flex items-center gap-2">
              <span aria-hidden="true">✨</span>
              <span className="text-base font-bold">
                Primary {Math.max(1, draft.age - 5)} level selected
              </span>
            </Card>
            <Button size="lg" onClick={() => go(3)}>
              Continue →
            </Button>
            <Button variant="ghost" onClick={() => go(1)}>
              Back
            </Button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <h2 className="text-3xl font-extrabold leading-tight">Choose your TATI character</h2>
            <p className="text-lg text-muted-foreground">
              Pick one that feels like you. You can change it later.
            </p>
            <Card className="flex items-center gap-4">
              <Avatar avatar={draft.avatar} size="lg" ring="success" name={draft.name} />
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wide text-success">
                  Current pick
                </p>
                <p className="text-xl font-extrabold">
                  {draft.name.trim() || "You"} (Age {draft.age})
                </p>
              </div>
            </Card>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_KEYS.map((avatar, index) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => set({ avatar })}
                  aria-label={`Avatar ${index + 1}`}
                  aria-pressed={draft.avatar === avatar}
                  className={cn(
                    "flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-card p-3 shadow-card transition-transform active:scale-95",
                    draft.avatar === avatar && "ring-2 ring-primary",
                  )}
                >
                  <Avatar avatar={avatar} size="md" />
                </button>
              ))}
            </div>
            <Button size="lg" onClick={() => go(4)}>
              That's me! →
            </Button>
            <Button variant="ghost" onClick={() => go(2)}>
              Back
            </Button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <Card className="text-center">
              <span aria-hidden="true" className="text-5xl">
                👋
              </span>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                Hi {draft.name.trim() || "friend"}, I'm TATI!
              </h2>
              <p className="mt-3 text-lg text-muted-foreground">
                I'll walk with you while you learn how money works — in cedis, at home, at school
                and at the market.
              </p>
            </Card>
            <Card tone="muted">
              <CardTitle>No wrong answers here</CardTitle>
              <CardNote>Every choice shows you something new. You can always try again.</CardNote>
            </Card>
            <Button size="lg" onClick={() => go(5)}>
              Nice to meet you →
            </Button>
            <Button variant="ghost" onClick={() => go(3)}>
              Back
            </Button>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-5">
            <h2 className="text-3xl font-extrabold leading-tight">Here's your journey</h2>
            <div className="space-y-3">
              {[
                { icon: "💬", title: "A quick chat", note: "A few easy questions to start." },
                { icon: "📚", title: "Short lessons", note: "Small ideas about saving money." },
                {
                  icon: "🎯",
                  title: "Money stories",
                  note: "You make the choices and see what happens.",
                },
                { icon: "🏅", title: "Your summary", note: "See how much you grew." },
              ].map((s) => (
                <Card key={s.title} className="flex items-start gap-3">
                  <span aria-hidden="true" className="text-2xl">
                    {s.icon}
                  </span>
                  <div>
                    <CardTitle>{s.title}</CardTitle>
                    <CardNote>{s.note}</CardNote>
                  </div>
                </Card>
              ))}
            </div>
            <Button size="lg" onClick={() => go(6)}>
              I'm ready →
            </Button>
            <Button variant="ghost" onClick={() => go(4)}>
              Back
            </Button>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-5">
            <Card className="text-center">
              <Avatar
                avatar={draft.avatar}
                size="xl"
                ring="accent"
                name={draft.name}
                className="mx-auto"
              />
              <div className="mt-3 flex justify-center">
                <Badge tone="warning" icon="🎓">
                  Primary {Math.max(1, draft.age - 5)} · Age {draft.age}
                </Badge>
              </div>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                {draft.name.trim() || "Friend"}, your adventure starts now! 🎒
              </h2>
            </Card>

            <Card>
              <p className="text-sm font-extrabold uppercase tracking-wide text-success">
                First challenge unlocked
              </p>
              <CardTitle className="mt-1">🎒 School Reopening Challenge</CardTitle>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <StatCard label="Pocket" money={50} tone="primary" icon="💰" />
                <StatCard label="Target" money={80} tone="success" icon="🎯" />
                <StatCard label="Mission" value="14 days" tone="neutral" icon="⏱" />
              </div>
            </Card>

            {error ? (
              <p
                role="alert"
                className="rounded-2xl bg-warning-soft p-3 text-base font-bold text-destructive"
              >
                {error}
              </p>
            ) : null}

            <Button size="lg" onClick={startJourney} disabled={createChild.isPending}>
              {createChild.isPending ? "Saving your profile…" : "Start My Journey 🚀"}
            </Button>
            <Button variant="ghost" onClick={() => go(5)}>
              Back
            </Button>
          </div>
        ) : null}
      </StepShell>
    </Page>
  );
}

/** Small fade-and-lift transition between onboarding steps. */
function StepShell({ stepKey, children }: { stepKey: number; children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    const t = window.setTimeout(() => setShown(true), 20);
    return () => window.clearTimeout(t);
  }, [stepKey]);
  return (
    <div
      className={cn(
        "transition-all duration-300 motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      {children}
    </div>
  );
}
