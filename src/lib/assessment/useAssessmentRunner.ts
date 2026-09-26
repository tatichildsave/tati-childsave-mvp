import { useCallback, useEffect, useMemo, useState } from "react";
import { scoreAssessment } from "./engine";
import type { AssessmentDefinition, ResponseMap } from "./types";

export type RunnerStage = "intro" | "question" | "complete";

/** Drives one-question-at-a-time navigation, selection state and completion. */
export function useAssessmentRunner(
  definition: AssessmentDefinition,
  storageKey?: string,
  initial?: ResponseMap,
) {
  const [stage, setStage] = useState<RunnerStage>("intro");
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<ResponseMap>(initial ?? {});
  const [resumed, setResumed] = useState(false);

  const total = definition.questions.length;
  const question = definition.questions[index];
  const selected = question ? responses[question.id] : undefined;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        stage?: RunnerStage;
        index?: number;
        responses?: ResponseMap;
      };
      if ((saved.stage === "question" || saved.stage === "complete") && saved.responses) {
        setStage(saved.stage);
        setIndex(Math.max(0, Math.min(total - 1, saved.index ?? 0)));
        setResponses(saved.responses);
        setResumed(true);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, total]);

  useEffect(() => {
    if (!storageKey || stage === "intro") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ stage, index, responses }));
    } catch {
      /* storage unavailable; the assessment remains usable */
    }
  }, [index, responses, stage, storageKey]);

  const select = useCallback(
    (optionId: string) => {
      if (!question) return;
      setResponses((prev) => ({ ...prev, [question.id]: optionId }));
    },
    [question],
  );

  const start = useCallback(() => setStage("question"), []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= total) {
        setStage("complete");
        return i;
      }
      return i + 1;
    });
  }, [total]);

  const back = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const result = useMemo(() => scoreAssessment(definition, responses), [definition, responses]);

  return {
    stage,
    index,
    total,
    question,
    selected,
    responses,
    isFirst: index === 0,
    isLast: index + 1 === total,
    canAdvance: !!selected,
    select,
    start,
    next,
    back,
    result,
    resumed,
  };
}
