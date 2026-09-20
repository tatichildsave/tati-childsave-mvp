// Persistence for branching scenarios.
// The scenario engine stays pure; this module is the only place that talks to
// the backend for scenario_sessions / scenario_decisions. localStorage is kept
// as an instant offline cache, but the backend row is the source of truth.

import { supabase } from "@/integrations/supabase/client";
import type { ScenarioState } from "./types";

export function scenarioCacheKey(childId: string, scenarioId: string) {
  return `tati.scenario.${childId}.${scenarioId}`;
}

export function readCachedState(key: string): ScenarioState | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ScenarioState) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCachedState(key: string, state: ScenarioState) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* storage unavailable — the backend row still holds the story */
  }
}

export function clearCachedState(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing to clear */
  }
}

/** Reads the saved story from the backend, if the learner has one. */
export async function loadSession(
  childId: string,
  scenarioId: string,
): Promise<ScenarioState | undefined> {
  const { data, error } = await supabase
    .from("scenario_sessions")
    .select("state")
    .eq("child_profile_id", childId)
    .eq("scenario_id", scenarioId)
    .maybeSingle();
  if (error || !data?.state) return undefined;
  const state = data.state as unknown as ScenarioState;
  return state && typeof state === "object" && "nodeId" in state ? state : undefined;
}

/** Saves the story after every decision so a refresh never loses progress. */
export async function saveSession(childId: string, state: ScenarioState): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("scenario_sessions")
    .upsert(
      {
        child_profile_id: childId,
        scenario_id: state.scenarioId,
        state: state as never,
        current_node_id: state.nodeId,
        day_number: state.day,
        status: state.phase === "complete" ? "completed" : "in_progress",
        completed_at: state.phase === "complete" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "child_profile_id,scenario_id" },
    )
    .select("id")
    .maybeSingle();
  if (error) return undefined;
  return data?.id;
}

/** Appends the decision the learner just made, for the parent view and research. */
export async function recordDecision(
  childId: string,
  sessionId: string,
  state: ScenarioState,
): Promise<void> {
  const last = state.decisions[state.decisions.length - 1];
  if (!last) return;
  await supabase.from("scenario_decisions").upsert(
    {
      session_id: sessionId,
      child_profile_id: childId,
      node_id: last.nodeId,
      choice_id: last.choiceId,
      day_number: last.day,
      details: {
        nodeTitle: last.nodeTitle,
        choiceLabel: last.choiceLabel,
        availableAfter: last.availableAfter,
        savedAfter: last.savedAfter,
      } as never,
    },
    { onConflict: "session_id,node_id,day_number", ignoreDuplicates: true },
  );
}
