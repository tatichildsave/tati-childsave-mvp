import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advance,
  applyChoice,
  beginScenario,
  createInitialState,
  getNode,
  summarize,
} from "./engine";
import {
  clearCachedState,
  loadSession,
  readCachedState,
  recordDecision,
  saveSession,
  scenarioCacheKey,
  writeCachedState,
} from "./session";
import type { ScenarioDefinition, ScenarioState } from "./types";
import { trackEvent } from "@/lib/analytics";

export type RunnerStatus = "loading" | "ready" | "resumed" | "interrupted";

/**
 * Drives one scenario: state, persistence after every decision and resume.
 * All money/branching logic stays in engine.ts; storage lives in session.ts,
 * which saves to the backend (with a local cache for instant resume).
 */
export function useScenarioRunner(scenario: ScenarioDefinition, childId: string) {
  const key = scenarioCacheKey(childId, scenario.id);
  const [status, setStatus] = useState<RunnerStatus>("loading");
  const [state, setState] = useState<ScenarioState>(() => createInitialState(scenario));
  const loaded = useRef(false);
  const sessionId = useRef<string | undefined>(undefined);

  const usable = useCallback(
    (saved: ScenarioState | undefined) =>
      !!saved && saved.scenarioId === scenario.id && !!getNode(scenario, saved.nodeId),
    [scenario],
  );

  // Resume a story the learner left midway: backend first, local cache as fallback.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    let cancelled = false;

    const cached = readCachedState(key);
    if (usable(cached)) {
      setState(cached!);
      setStatus(cached!.phase === "intro" ? "ready" : "resumed");
    }

    void loadSession(childId, scenario.id).then((remote) => {
      if (cancelled) return;
      if (usable(remote)) {
        const local = usable(cached) ? cached! : undefined;
        const newest = local && local.updatedAt > remote!.updatedAt ? local : remote!;
        setState(newest);
        setStatus(newest.phase === "intro" ? "ready" : "resumed");
        writeCachedState(key, newest);
      } else if (!usable(cached)) {
        setStatus("ready");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key, childId, scenario, usable]);

  const persist = useCallback(
    (next: ScenarioState, isDecision = false) => {
      setState(next);
      writeCachedState(key, next);
      void saveSession(childId, next).then((id) => {
        if (id) {
          sessionId.current = id;
          setStatus("ready");
        } else {
          setStatus("interrupted");
        }
        if (isDecision && sessionId.current) void recordDecision(childId, sessionId.current, next);
      });
    },
    [key, childId],
  );

  const start = useCallback(() => persist(beginScenario(state)), [persist, state]);
  const choose = useCallback(
    (choiceId: string) => {
      void trackEvent("scenario_choice_made", { childProfileId: childId, entityId: choiceId });
      persist(applyChoice(scenario, state, choiceId), true);
    },
    [childId, persist, scenario, state],
  );
  const continueOn = useCallback(() => persist(advance(scenario, state)), [persist, scenario, state]);
  const restart = useCallback(() => persist(createInitialState(scenario)), [persist, scenario]);
  const clearSaved = useCallback(() => clearCachedState(key), [key]);

  const node = useMemo(() => getNode(scenario, state.nodeId), [scenario, state.nodeId]);
  const summary = useMemo(() => summarize(scenario, state), [scenario, state]);

  useEffect(() => {
    if (status === "ready" && state.phase === "intro") {
      void trackEvent("scenario_started", { childProfileId: childId, entityId: scenario.id, eventKey: scenario.id });
    }
    if (status === "resumed") {
      void trackEvent("scenario_resumed", { childProfileId: childId, entityId: scenario.id, eventKey: scenario.id });
    }
  }, [childId, scenario.id, state.phase, status]);

  useEffect(() => {
    if (state.phase === "complete") {
      void trackEvent("scenario_completed", { childProfileId: childId, entityId: scenario.id, eventKey: scenario.id });
    }
  }, [childId, scenario.id, state.phase]);

  return { status, state, node, summary, start, choose, continueOn, restart, clearSaved };
}
