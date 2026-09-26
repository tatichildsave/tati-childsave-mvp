import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, Page, PageHeader, Button } from "@/components/tati";
import { useChildProfiles } from "@/lib/family";
import { submitFeedback } from "@/lib/feedback";

export const Route = createFileRoute("/parent/feedback")({ component: ParentFeedback });

type Question = { key: string; label: string; options: string[] };
const questions: Question[] = [
  {
    key: "setup",
    label: "How easy was setup?",
    options: ["Very easy", "Mostly easy", "A little difficult", "Very difficult"],
  },
  {
    key: "help",
    label: "Did your child need help?",
    options: ["No", "A little", "Quite a bit", "For most activities"],
  },
  {
    key: "interest",
    label: "Did your child stay interested?",
    options: ["The whole time", "Most of the time", "Sometimes", "Not really"],
  },
  {
    key: "thinking",
    label: "Did you notice them thinking about their choices?",
    options: ["Yes", "Sometimes", "Not yet", "Not sure"],
  },
  {
    key: "conversation",
    label: "Did the experience lead to a money conversation?",
    options: ["Yes, we talked", "A short conversation", "Not yet", "We already talk about money"],
  },
  {
    key: "continue",
    label: "Would you want your child to continue using TATI?",
    options: ["Definitely", "Probably", "Not sure", "Probably not"],
  },
];

function ParentFeedback() {
  const navigate = useNavigate();
  const { data: children } = useChildProfiles();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [childProfileId, setChildProfileId] = useState("");
  const [confused, setConfused] = useState("");
  const [improve, setImprove] = useState("");
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const complete = questions.every((question) => answers[question.key]);

  async function send() {
    if (!complete) return;
    setSaving(true);
    try {
      await submitFeedback({
        audience: "parent",
        experienceKey: "parent-journey-review",
        childProfileId: childProfileId || null,
        context: "parent_post_journey",
        answers: { ...answers, confused, improve },
        message: [confused && `Confused: ${confused}`, improve && `Improve: ${improve}`]
          .filter(Boolean)
          .join("\n"),
      });
      setSent(true);
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <Page role="parent">
        <PageHeader title="Feedback sent" />
        <Card tone="primary" className="py-8 text-center text-white">
          <p className="text-4xl mb-2">🌟</p>
          <h2 className="text-2xl font-extrabold mb-3">Thank you!</h2>
          <p className="text-base text-white/80">
            Your feedback helps us improve TATI for families.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/parent" })} full size="lg">
            Back to parent portal
          </Button>
        </Card>
      </Page>
    );
  }

  return (
    <Page role="parent">
      <PageHeader
        backTo="/parent"
        eyebrow="Help us improve"
        title="Parent feedback"
        subtitle="A few quick questions about your child's experience."
      />

      {children && children.length > 1 ? (
        <Card tone="surface" className="mb-4">
          <label className="font-extrabold text-base" htmlFor="feedback-child">
            Which learner?
          </label>
          <select
            id="feedback-child"
            value={childProfileId}
            onChange={(event) => setChildProfileId(event.target.value)}
            className="mt-3 w-full rounded-2xl border-2 border-border bg-card p-3 font-bold"
          >
            <option value="">The whole family</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </Card>
      ) : null}

      {questions.map((question) => (
        <Card key={question.key} tone="surface" className="mb-4">
          <h2 className="font-extrabold text-base mb-3">{question.label}</h2>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnswers((current) => ({ ...current, [question.key]: option }))}
                aria-pressed={answers[question.key] === option}
                className={`min-h-12 rounded-2xl border-2 px-4 py-3 text-left font-bold transition-all ${
                  answers[question.key] === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface hover:border-primary/50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Card>
      ))}

      <TextQuestion
        id="parent-confused"
        label="What confused your child?"
        value={confused}
        onChange={setConfused}
      />
      <TextQuestion
        id="parent-improve"
        label="What would you improve?"
        value={improve}
        onChange={setImprove}
      />

      <Button
        className="mt-6"
        size="lg"
        disabled={!complete || saving}
        onClick={() => void send()}
        full
      >
        {saving ? "Sending..." : "Send parent feedback →"}
      </Button>
      <button
        onClick={() => navigate({ to: "/parent" })}
        className="mt-3 block w-full text-center font-extrabold text-primary hover:underline"
      >
        Maybe later
      </button>
    </Page>
  );
}

function TextQuestion({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card tone="surface" className="mb-4">
      <label htmlFor={id} className="font-extrabold text-base block mb-2">
        {label} <span className="font-normal text-muted-foreground">(Optional)</span>
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={1000}
        className="w-full min-h-24 resize-y rounded-2xl border-2 border-border bg-background p-4 font-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        placeholder="Share a little detail..."
      />
    </Card>
  );
}
