// Persistence for branching scenarios.
// The scenario engine stays pure; this module is the only place that talks to
// the backend for scenario_sessions / scenario_decisions. localStorage is kept
// as an instant offline cache, but the backend row is the source of truth.

import type { ScenarioState } from "./types";

export interface CachedScenarioSession {
  state: ScenarioState;
  version: number;
}

export function scenarioCacheKey(childId: string, scenarioId: string) {
  return `tati.scenario.${childId}.${scenarioId}`;
}

export function readCachedState(key: string): CachedScenarioSession | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedScenarioSession | ScenarioState;
    if ("state" in parsed && typeof parsed.version === "number") return parsed;
    return { state: parsed as ScenarioState, version: 0 };
  } catch {
    return undefined;
  }
}

export function writeCachedState(key: string, state: ScenarioState, version: number) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ state, version }));
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
