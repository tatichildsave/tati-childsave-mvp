import { Sparkles } from "lucide-react";
import { Button, Card, Page, PageHeader } from "@/components/tati";
import { ChoiceButton } from "@/components/learning/primitives";
import type { ReflectionPrompt } from "@/lib/learning/types";

type ChildReflectionScreenProps = {
  reflection: ReflectionPrompt;
  choiceId: string | null;
  saving: boolean;
  onPick: (id: string) => void;
  onFinish: () => void;
};

export function ChildReflectionScreen({
  reflection,
  choiceId,
  saving,
  onPick,
  onFinish,
}: ChildReflectionScreenProps) {
  const picked = reflection.options.find((option) => option.id === choiceId);

  return (
    <Page role="junior">
      <PageHeader
        backTo="/child/learn"
        eyebrow="Pause and think"
        title="Reflection time"
        subtitle="Think about your choice and what you want to do next."
        listenable
      />

      <Card className="rounded-[28px] border border-[#dce6fa] bg-white p-5 shadow-card sm:p-6">
        <p className="text-sm font-extrabold uppercase tracking-wide text-primary">
          {reflection.icon ?? "🪞"} Reflection
        </p>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{reflection.intro}</p>
        <h2 className="mt-4 text-xl font-extrabold text-[#0f2248]">{reflection.question}</h2>
        <div className="mt-4 space-y-2.5">
          {reflection.options.map((option) => (
            <ChoiceButton
              key={option.id}
              onClick={() => onPick(option.id)}
              state={choiceId === option.id ? "selected" : "idle"}
            >
              {option.label}
            </ChoiceButton>
          ))}
        </div>
      </Card>

      {picked ? (
        <Card className="mt-4 rounded-3xl border border-[#dce6fa] bg-white p-5 shadow-card">
          <p className="text-base leading-relaxed text-[#102346]">{picked.response}</p>
          <div className="mt-4 rounded-2xl bg-[#fff0d5] p-4 text-sm font-bold text-[#7a4f0f]">
            <span className="inline-flex items-center gap-2">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              {reflection.closing}
            </span>
          </div>
        </Card>
      ) : null}

      <div className="mt-6">
        <Button
          onClick={onFinish}
          disabled={!picked || saving}
          full
          size="lg"
          className="rounded-full"
        >
          {saving ? "Saving…" : "Continue my journey"}
        </Button>
      </div>
    </Page>
  );
}
