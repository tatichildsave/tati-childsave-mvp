import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Card, PrimaryButton, Screen, TopBar } from "@/components/learning/primitives";
import { submitFeedback } from "@/lib/feedback";

export const Route = createFileRoute("/_authenticated/learn/$childId/feedback")({
  component: ChildFeedback,
});

const funOptions = [
  ["😴", "Not really"],
  ["🙂", "A little"],
  ["😄", "Fun"],
  ["🤩", "Loved it!"]
] as const;
const confusingOptions = ["No, I understood", "A little", "Yes, I needed help"] as const;
const continueOptions = ["Yes!", "Maybe", "Not yet"] as const;

function ChildFeedback() {
  const { childId } = useParams({ from: "/_authenticated/learn/$childId/feedback" });
  const navigate = useNavigate();
  const [fun, setFun] = useState("");
  const [confusing, setConfusing] = useState("");
  const [continueUsing, setContinueUsing] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const canSend = Boolean(fun && confusing && continueUsing);

  async function send() {
    if (!canSend) return;
    setSaving(true);
    try {
      await submitFeedback({
        audience: "child",
        experienceKey: "journey-complete",
        childProfileId: childId,
        context: "post_journey_child",
        answers: { fun, confusing, continueUsing },
        message,
      });
      setSent(true);
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <Screen>
        <Card className="mt-10 text-center">
          <div className="text-5xl">🌟</div>
          <h1 className="mt-3 text-2xl font-bold">Thanks for telling us!</h1>
          <p className="mt-2 text-muted-foreground">Your ideas help make TATI better.</p>
          <PrimaryButton className="mt-6" onClick={() => navigate({ to: "/learn/$childId", params: { childId } })}>
            Back to my journey
          </PrimaryButton>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title="Quick check-in" backTo={`/learn/${childId}/summary`} />
      <p className="mb-5 text-center text-lg text-muted-foreground">Three tiny questions. You can skip the note.</p>

      <Question title="Was TATI fun?" options={funOptions.map(([icon, label]) => ({ value: label, label: `${icon} ${label}` }))} value={fun} onChange={setFun} />
      <Question title="Was anything confusing?" options={confusingOptions.map((label) => ({ value: label, label }))} value={confusing} onChange={setConfusing} />
      <Question title="Would you like another money challenge?" options={continueOptions.map((label) => ({ value: label, label }))} value={continueUsing} onChange={setContinueUsing} />

      <Card className="mt-4">
        <label htmlFor="child-feedback-note" className="font-bold">Anything else? <span className="font-normal text-muted-foreground">Optional</span></label>
        <textarea
          id="child-feedback-note"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us one thing you liked or would change..."
          className="mt-3 min-h-28 w-full resize-y rounded-2xl border border-border bg-secondary p-4 outline-none focus:ring-2 focus:ring-ring"
          maxLength={500}
        />
      </Card>

      <PrimaryButton className="mt-5" onClick={() => void send()} disabled={!canSend || saving}>
        {saving ? "Sending..." : "Send my answers"}
      </PrimaryButton>
      <Link to="/learn/$childId" params={{ childId }} className="mt-4 block text-center font-semibold text-primary">
        Skip for now
      </Link>
    </Screen>
  );
}

function Question({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ value: string; label: string }>;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="mt-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`min-h-14 rounded-2xl border-2 px-4 py-3 text-left font-semibold transition-colors ${value === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
