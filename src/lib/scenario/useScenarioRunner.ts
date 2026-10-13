import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advance,
  applyChoice,
  beginScenario,
  createInitialState,
  getNode,
  summarize,
} from "./engine";
import { clearCachedState, readCachedState, scenarioCacheKey, writeCachedState } from "./session";
import type { ScenarioDefinition, ScenarioState } from "./types";
import { decideScenarioRecovery } from "./recovery";
import { trackEvent } from "@/lib/analytics";

export type RunnerStatus = "loading" | "ready" | "resumed" | "interrupted";

export interface ScenarioSessionSnapshot {
  state: ScenarioState;
  version: number;
  sessionId?: string | undefined;
}

export interface ScenarioSaveResult {
  sessionId: string;
  version: number;
}

export interface ScenarioPersistence {
  loadSession: (childId: string, scenarioId: string) => Promise<ScenarioSessionSnapshot>;
  saveSession: (
    childId: string,
    state: ScenarioState,
    expectedVersion: number,
  ) => Promise<ScenarioSaveResult>;
  recordDecision: (childId: string, sessionId: string, state: ScenarioState) => Promise<void>;
}

export interface ScenarioLoadCoordinator {
  run: <T>(
    load: () => Promise<T>,
    onSuccess: (value: T) => void | Promise<void>,
    onError: (error: unknown) => void,
  ) => () => void;
}

export function createScenarioLoadCoordinator(): ScenarioLoadCoordinator {
  let latestRequest = 0;

  return {
    run(load, onSuccess, onError) {
      const request = ++latestRequest;
      let active = true;

      void load().then(
        async (value) => {
          if (!active || request !== latestRequest) return;
          await onSuccess(value);
        },
        (error) => {
          if (!active || request !== latestRequest) return;
          onError(error);
        },
      );

      return () => {
        active = false;
      };
    },
  };
}

export class ScenarioSaveQueueBlockedError extends Error {
  constructor() {
    super("Scenario saves are blocked until the previous failure is resolved.");
    this.name = "ScenarioSaveQueueBlockedError";
  }
}

export function isScenarioVersionConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes("SCENARIO_VERSION_CONFLICT");
}

export interface ScenarioSaveQueue {
  enqueue: (
    write: (expectedVersion: number) => Promise<ScenarioSaveResult>,
  ) => Promise<ScenarioSaveResult>;
  retry: (
    write: (expectedVersion: number) => Promise<ScenarioSaveResult>,
  ) => Promise<ScenarioSaveResult>;
  getVersion: () => number;
  isBlocked: () => boolean;
}

export function createScenarioSaveQueue(initialVersion: number): ScenarioSaveQueue {
  let observedVersion = initialVersion;
  let blocked = false;
  let tail = Promise.resolve();

  const schedule = (
    write: (expectedVersion: number) => Promise<ScenarioSaveResult>,
    isRetry: boolean,
  ) => {
    const operation = tail.then(async () => {
      if (blocked && !isRetry) throw new ScenarioSaveQueueBlockedError();

      try {
        const result = await write(observedVersion);
        observedVersion = result.version;
        blocked = false;
        return result;
      } catch (error) {
        blocked = true;
        throw error;
      }
    });
    tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  };

  return {
    enqueue: (write) => schedule(write, false),
    retry: (write) => schedule(write, true),
    getVersion: () => observedVersion,
    isBlocked: () => blocked,
  };
}

/**
 * Drives one scenario: state, persistence after every decision and resume.
 * All money/branching logic stays in engine.ts; storage lives in session.ts,
 * which saves to the backend (with a local cache for instant resume).
 */
export function useScenarioRunner(
  scenario: ScenarioDefinition,
  childId: string,
  persistence?: ScenarioPersistence,
) {
  const key = scenarioCacheKey(childId, scenario.id);
  const [status, setStatus] = useState<RunnerStatus>("loading");
  const [state, setState] = useState<ScenarioState>(() => createInitialState(scenario));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const sessionId = useRef<string | undefined>(undefined);
  const saveQueue = useRef<ScenarioSaveQueue>(createScenarioSaveQueue(0));
  const loadCoordinator = useRef(createScenarioLoadCoordinator());
  const conflictKind = useRef<"recovery" | "stale" | "retry" | null>(null);
  const recoveryRemoteState = useRef<ScenarioState | null>(null);
  const activePersistence = useMemo<ScenarioPersistence>(
    () =>
      persistence ?? {
        loadSession: async () => ({
          state: createInitialState(scenario),
          version: 0,
        }),
        saveSession: async (_childId, _state, expectedVersion) => ({
          sessionId: `local:${scenario.id}`,
          version: expectedVersion + 1,
        }),
        recordDecision: async () => undefined,
      },
    [persistence, scenario],
  );
  const persistenceRef = useRef(activePersistence);
  const scenarioRef = useRef(scenario);
  useEffect(() => {
    persistenceRef.current = activePersistence;
  }, [activePersistence]);
  useEffect(() => {
    scenarioRef.current = scenario;
  }, [scenario]);

  // Resume a story the learner left midway: backend first, local cache as fallback.
  useEffect(() => {
    const scenarioAtLoadStart = scenarioRef.current;
    const usableAtLoadStart = (saved: ScenarioState | undefined) =>
      !!saved &&
      saved.scenarioId === scenarioAtLoadStart.id &&
      !!getNode(scenarioAtLoadStart, saved.nodeId);

    setStatus("loading");
    setState(createInitialState(scenarioAtLoadStart));
    setSaveError(null);
    sessionId.current = undefined;
    saveQueue.current = createScenarioSaveQueue(0);
    conflictKind.current = null;
    recoveryRemoteState.current = null;
    const cached = readCachedState(key);

    const persistenceAtLoadStart = persistenceRef.current;
    return loadCoordinator.current.run(
      () => persistenceAtLoadStart.loadSession(childId, scenarioAtLoadStart.id),
      async (remote) => {
        const currentQueue = createScenarioSaveQueue(remote.version);
        saveQueue.current = currentQueue;
        sessionId.current = remote.sessionId;

        const local = cached && usableAtLoadStart(cached.state) ? cached.state : undefined;
        if (!local) {
          setState(remote.state);
          setStatus(remote.state.phase === "intro" ? "ready" : "resumed");
          writeCachedState(key, remote.state, remote.version);
          return;
        }

        const recovery = decideScenarioRecovery(remote.state, local);
        if (recovery === "identical") {
          setState(remote.state);
          setStatus(remote.state.phase === "intro" ? "ready" : "resumed");
          writeCachedState(key, remote.state, remote.version);
          return;
        }

        if (recovery === "remote-ahead") {
          setState(remote.state);
          setStatus(remote.state.phase === "intro" ? "ready" : "resumed");
          writeCachedState(key, remote.state, remote.version);
          return;
        }

        if (recovery === "conflict") {
          setState(remote.state);
          setStatus(remote.state.phase === "intro" ? "ready" : "resumed");
          conflictKind.current = "recovery";
          recoveryRemoteState.current = remote.state;
          setSaveError(
            "This story changed on another device. Firebase progress is shown, and this device's different progress is still preserved. Choose Use Firebase progress to discard the local copy.",
          );
          return;
        }

        setState(local);
        setStatus(local.phase === "intro" ? "ready" : "resumed");
        try {
          const result = await currentQueue.enqueue((expectedVersion) =>
            persistenceAtLoadStart.saveSession(childId, local, expectedVersion),
          );
          if (saveQueue.current !== currentQueue) return;
          sessionId.current = result.sessionId;
          writeCachedState(key, local, result.version);
          conflictKind.current = null;
          recoveryRemoteState.current = null;
          setSaveError(null);
        } catch (error) {
          if (saveQueue.current !== currentQueue) return;
          setState(remote.state);
          setStatus(remote.state.phase === "intro" ? "ready" : "resumed");
          conflictKind.current = "stale";
          setSaveError(
            "We couldn't recover this device's newer progress. Firebase progress was kept, and the local copy remains available for review.",
          );
          console.error("Scenario recovery error:", error);
        }
      },
      (error) => {
        const local = cached && usableAtLoadStart(cached.state) ? cached.state : undefined;
        if (local) setState(local);
        setStatus("interrupted");
        conflictKind.current = "stale";
        setSaveError(
          "We couldn't load Firebase progress. This device's local copy was preserved; reload to try again safely.",
        );
        console.error("Scenario load error:", error);
      },
    );
  }, [key, childId, scenario.id]);

  const persist = useCallback(
    (next: ScenarioState, isDecision = false) => {
      if (conflictKind.current) return;
      const persistenceAtSaveStart = persistenceRef.current;
      setState(next);
      const queue = saveQueue.current;
      writeCachedState(key, next, queue.getVersion());
      conflictKind.current = null;
      recoveryRemoteState.current = null;
      setSaveError(null);
      setLastSaveTime(null);
      setIsSaving(true);

      const queuedSave = queue.enqueue((expectedVersion) =>
        persistenceAtSaveStart.saveSession(childId, next, expectedVersion),
      );

      void queuedSave
        .then((result) => {
          if (saveQueue.current !== queue) return;
          sessionId.current = result.sessionId;
          writeCachedState(key, next, result.version);
          setStatus("ready");
          setSaveError(null);
          setIsSaving(false);
          setLastSaveTime(Date.now());
          if (isDecision) {
            void persistenceAtSaveStart.recordDecision(childId, result.sessionId, next);
          }
        })
        .catch((error) => {
          if (saveQueue.current !== queue || error instanceof ScenarioSaveQueueBlockedError) return;
          const conflict = isScenarioVersionConflict(error);
          conflictKind.current = conflict ? "stale" : "retry";
          setIsSaving(false);
          if (conflict) {
            setSaveError(
              "This story changed in another tab. Your local progress was preserved; reload to recover safely.",
            );
          } else {
            setSaveError(
              "We couldn't save your progress. Your local progress was preserved; try again before continuing.",
            );
          }
          console.error("Scenario save error:", error);
          setStatus("interrupted");
        });
    },
    [key, childId],
  );

  const retryLastSave = useCallback(() => {
    setSaveError(null);
    setLastSaveTime(null);
    setIsSaving(true);
    const queue = saveQueue.current;
    const persistenceAtRetryStart = persistenceRef.current;
    const queuedSave = queue.retry((expectedVersion) =>
      persistenceAtRetryStart.saveSession(childId, state, expectedVersion),
    );
    void queuedSave
      .catch((error) => {
        if (saveQueue.current !== queue) return undefined;
        const conflict = isScenarioVersionConflict(error);
        conflictKind.current = conflict ? "stale" : "retry";
        setIsSaving(false);
        setSaveError(
          conflict
            ? "This story changed in another tab. Your local progress was preserved; reload to recover safely."
            : "We couldn't save your progress. Your local progress was preserved; try again before continuing.",
        );
        setStatus("interrupted");
        console.error("Scenario save retry error:", error);
        return undefined;
      })
      .then((result) => {
        if (!result || saveQueue.current !== queue) return;
        sessionId.current = result.sessionId;
        writeCachedState(key, state, result.version);
        conflictKind.current = null;
        setStatus("ready");
        setSaveError(null);
        setIsSaving(false);
        setLastSaveTime(Date.now());
      });
  }, [childId, key, state]);

  const resolveSaveError = useCallback(() => {
    if (conflictKind.current === "recovery" && recoveryRemoteState.current) {
      writeCachedState(key, recoveryRemoteState.current, saveQueue.current.getVersion());
      conflictKind.current = null;
      recoveryRemoteState.current = null;
      setSaveError(null);
      return;
    }
    if (conflictKind.current === "stale") {
      window.location.reload();
      return;
    }
    retryLastSave();
  }, [key, retryLastSave]);

  const start = useCallback(() => persist(beginScenario(state)), [persist, state]);
  const choose = useCallback(
    (choiceId: string) => {
      void trackEvent("scenario_choice_made", { childProfileId: childId, entityId: choiceId });
      persist(applyChoice(scenario, state, choiceId), true);
    },
    [childId, persist, scenario, state],
  );
  const continueOn = useCallback(
    () => persist(advance(scenario, state)),
    [persist, scenario, state],
  );
  const restart = useCallback(() => persist(createInitialState(scenario)), [persist, scenario]);
  const clearSaved = useCallback(() => clearCachedState(key), [key]);

  const node = useMemo(() => getNode(scenario, state.nodeId), [scenario, state.nodeId]);
  const summary = useMemo(() => summarize(scenario, state), [scenario, state]);

  useEffect(() => {
    if (status === "ready" && state.phase === "intro") {
      void trackEvent("scenario_started", {
        childProfileId: childId,
        entityId: scenario.id,
        eventKey: scenario.id,
      });
    }
    if (status === "resumed") {
      void trackEvent("scenario_resumed", {
        childProfileId: childId,
        entityId: scenario.id,
        eventKey: scenario.id,
      });
    }
  }, [childId, scenario.id, state.phase, status]);

  useEffect(() => {
    if (state.phase === "complete") {
      void trackEvent("scenario_completed", {
        childProfileId: childId,
        entityId: scenario.id,
        eventKey: scenario.id,
      });
    }
  }, [childId, scenario.id, state.phase]);

  return {
    status,
    state,
    node,
    summary,
    start,
    choose,
    continueOn,
    restart,
    clearSaved,
    saveError,
    isSaving,
    lastSaveTime,
    recoveryRequired: conflictKind.current !== null,
    retryLastSave,
    resolveSaveError,
    saveErrorActionLabel:
      conflictKind.current === "recovery"
        ? "Use Firebase progress"
        : conflictKind.current === "stale"
          ? "Reload safely"
          : "Try again",
  };
}
