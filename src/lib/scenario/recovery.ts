import type { ScenarioState } from "./types";

export type ScenarioRecoveryDecision =
  "identical" | "local-extension" | "remote-ahead" | "conflict";

function choiceHistory(state: ScenarioState): string[] {
  return state.decisions.map((decision) => `${decision.nodeId}:${decision.choiceId}`);
}

function sameCheckpoint(left: ScenarioState, right: ScenarioState): boolean {
  const withoutTimestamp = ({ updatedAt: _updatedAt, ...state }: ScenarioState) => state;
  return JSON.stringify(withoutTimestamp(left)) === JSON.stringify(withoutTimestamp(right));
}

function isHistoryPrefix(prefix: string[], candidate: string[]): boolean {
  return (
    prefix.length <= candidate.length &&
    prefix.every((decision, index) => candidate[index] === decision)
  );
}

function isLaterCheckpoint(earlier: ScenarioState, later: ScenarioState): boolean {
  if (earlier.decisions.length !== later.decisions.length) return false;
  if (earlier.phase === "intro" && later.phase === "decision") return true;
  return (
    earlier.phase === "consequence" && (later.phase === "decision" || later.phase === "complete")
  );
}

export function decideScenarioRecovery(
  remote: ScenarioState,
  local: ScenarioState,
): ScenarioRecoveryDecision {
  if (sameCheckpoint(remote, local)) return "identical";

  const remoteHistory = choiceHistory(remote);
  const localHistory = choiceHistory(local);

  if (
    isHistoryPrefix(remoteHistory, localHistory) &&
    (localHistory.length > remoteHistory.length || isLaterCheckpoint(remote, local))
  ) {
    return "local-extension";
  }

  if (
    isHistoryPrefix(localHistory, remoteHistory) &&
    (remoteHistory.length > localHistory.length || isLaterCheckpoint(local, remote))
  ) {
    return "remote-ahead";
  }

  return "conflict";
}
