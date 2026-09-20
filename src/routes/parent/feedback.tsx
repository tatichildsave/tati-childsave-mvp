import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, Page, PageHeader, Button } from "@/components/tati";
import { useChildProfiles } from "@/lib/family";
import { submitFeedback } from "@/lib/feedback";

export const Route = createFileRoute("/parent/feedback")({ component: ParentFeedback });

type Question = { key: string; label: string; options: string[] };
const questions: Question[] = [
  { key: "setup", label: "How easy was setup?", options: ["Very easy", "Mostly easy", "A little difficult", "Very difficult"] },
  { key: "help", label: "Did your child need help?", options: ["No", "A little", "Quite a bit", "For most activities"] },
  { key: "interest", label: "Did your child stay interested?", options: ["The whole time", "Most of the time", "Sometimes", "Not really"] },
  { key: "thinking", label: "Did you notice them thinking about their choices?", options: ["Yes", "Sometimes", "Not yet", "Not sure"] },
  { key: "conversation", label: "Did the experience lead to a money conversation?", options: ["Yes, we talked", "A short conversation", "Not yet", "We already talk about money"] },
  { key: "continue", label: "Would you want your child to continue using TATI?", options: ["Definitely", "Probably", "Not sure", "Probably not"] },
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
        message: [confused && `Confused: ${confused}`, improve && `Improve: ${improve}`].filter(Boolean).join("\n"),
      });
      setSent(true);
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <Page>
        <PageHeader backTo="/parent" title="Feedback sent" />
        <Card className="text-center">
          <p className="text-4xl">🌟</p>
          <h2 className="mt-2 text-2xl font-extrabold">Thank you</h2>
          <p className="mt-2 text-muted-foreground">Your feedback helps us improve TATI for families.</p>
          <Button className="mt-5" onClick={() => navigate({ to: "/parent" })}>Back to parent portal</Button>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader backTo="/parent" eyebrow="Help us improve" title="Parent feedback" subtitle="A few quick questions about your child's experience." />
      {children && children.length > 1 ? (
        <Card>
          <label className="font-extrabold" htmlFor="feedback-child">Which learner?</label>
          <select id="feedback-child" value={childProfileId} onChange={(event) => setChildProfileId(event.target.value)} className="mt-2 w-full rounded-2xl border border-input bg-card p-3">
            <option value="">The whole family</option>
            {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </Card>
      ) : null}
      {questions.map((question) => (
        <Card key={question.key} className="mt-4">
          <h2 className="font-extrabold">{question.label}</h2>
          <div className="mt-3 grid gap-2">
            {question.options.map((option) => (
              <button key={option} type="button" onClick={() => setAnswers((current) => ({ ...current, [question.key]: option }))} aria-pressed={answers[question.key] === option} className={`min-h-12 rounded-2xl border-2 px-4 py-3 text-left font-bold ${answers[question.key] === option ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}>
                {option}
              </button>
            ))}
          </div>
        </Card>
      ))}
      <TextQuestion id="parent-confused" label="What confused your child?" value={confused} onChange={setConfused} />
      <TextQuestion id="parent-improve" label="What would you improve?" value={improve} onChange={setImprove} />
      <Button className="mt-5" size="lg" disabled={!complete || saving} onClick={() => void send()}>{saving ? "Sending..." : "Send parent feedback"}</Button>
      <Link to="/parent" className="mt-4 block text-center font-extrabold text-primary">Maybe later</Link>
    </Page>
  );
}

function TextQuestion({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Card className="mt-4">
      <label htmlFor={id} className="font-extrabold">{label} <span className="font-normal text-muted-foreground">Optional</span></label>
      <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={1000} className="mt-3 min-h-24 w-full resize-y rounded-2xl border border-input bg-secondary p-4" placeholder="Share a little detail..." />
    </Card>
  );
}
