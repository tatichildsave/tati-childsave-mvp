import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getScenarioDefinition } from "@/lib/scenario/registry";
import { advance, applyChoice, beginScenario, createInitialState } from "@/lib/scenario/engine";
import { decideScenarioRecovery } from "@/lib/scenario/recovery";
import {
  clearCachedState,
  readCachedState,
  scenarioCacheKey,
  writeCachedState,
} from "@/lib/scenario/session";
import {
  createScenarioLoadCoordinator,
  createScenarioSaveQueue,
  isScenarioVersionConflict,
  ScenarioSaveQueueBlockedError,
} from "@/lib/scenario/useScenarioRunner";

describe("scenario local cache", () => {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };

  beforeEach(() => {
    values.clear();
    vi.clearAllMocks();
    vi.stubGlobal("window", { localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores the Firebase version observed with the cached checkpoint", () => {
    const definition = getScenarioDefinition("kwame-request")!;
    const state = beginScenario(createInitialState(definition));
    const key = scenarioCacheKey("child-a", definition.id);

    writeCachedState(key, state, 4);

    expect(readCachedState(key)).toEqual({ state, version: 4 });
  });

  it("treats a legacy state-only cache as version zero", () => {
    const definition = getScenarioDefinition("kwame-request")!;
    const state = createInitialState(definition);
    const key = scenarioCacheKey("child-a", definition.id);
    values.set(key, JSON.stringify(state));

    expect(readCachedState(key)).toEqual({ state, version: 0 });
  });

  it("clears a cached checkpoint only after an explicit recovery action", () => {
    const definition = getScenarioDefinition("kwame-request")!;
    const state = createInitialState(definition);
    const key = scenarioCacheKey("child-a", definition.id);
    writeCachedState(key, state, 2);

    clearCachedState(key);

    expect(readCachedState(key)).toBeUndefined();
  });

  it("finishes loading after a StrictMode-style setup, cleanup, and setup cycle", async () => {
    const coordinator = createScenarioLoadCoordinator();
    const applied: string[] = [];
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;

    const cancelFirst = coordinator.run(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
      (value) => {
        applied.push(value);
      },
      () => undefined,
    );

    cancelFirst();
    coordinator.run(
      () =>
        new Promise<string>((resolve) => {
          resolveSecond = resolve;
        }),
      (value) => {
        applied.push(value);
      },
      () => undefined,
    );

    resolveFirst("outdated-child");
    resolveSecond("current-child");
    await Promise.resolve();
    await Promise.resolve();

    expect(applied).toEqual(["current-child"]);
  });

  it("uses each successful version and blocks queued saves after an intermediate failure", async () => {
    const queue = createScenarioSaveQueue(0);
    const writes: Array<{ checkpoint: string; expectedVersion: number }> = [];

    const first = queue.enqueue(async (expectedVersion) => {
      writes.push({ checkpoint: "start", expectedVersion });
      return { sessionId: "scenario", version: 1 };
    });
    const second = queue.enqueue(async (expectedVersion) => {
      writes.push({ checkpoint: "choice", expectedVersion });
      throw new Error("network unavailable");
    });
    const third = queue.enqueue(async (expectedVersion) => {
      writes.push({ checkpoint: "continue", expectedVersion });
      return { sessionId: "scenario", version: 2 };
    });

    await expect(first).resolves.toEqual({ sessionId: "scenario", version: 1 });
    await expect(second).rejects.toThrow("network unavailable");
    await expect(third).rejects.toBeInstanceOf(ScenarioSaveQueueBlockedError);
    expect(writes).toEqual([
      { checkpoint: "start", expectedVersion: 0 },
      { checkpoint: "choice", expectedVersion: 1 },
    ]);
    expect(queue.getVersion()).toBe(1);
    expect(queue.isBlocked()).toBe(true);

    await expect(
      queue.retry(async (expectedVersion) => {
        writes.push({ checkpoint: "continue-retry", expectedVersion });
        return { sessionId: "scenario", version: 2 };
      }),
    ).resolves.toEqual({ sessionId: "scenario", version: 2 });
    expect(writes.at(-1)).toEqual({ checkpoint: "continue-retry", expectedVersion: 1 });
    expect(queue.getVersion()).toBe(2);
    expect(queue.isBlocked()).toBe(false);
  });

  it("keeps saves blocked when a retry discovers a stale version", async () => {
    const queue = createScenarioSaveQueue(3);
    await expect(
      queue.enqueue(async () => {
        throw new Error("network unavailable");
      }),
    ).rejects.toThrow("network unavailable");

    const conflict = new Error("SCENARIO_VERSION_CONFLICT: modified elsewhere");
    const retry = queue.retry(async (expectedVersion) => {
      expect(expectedVersion).toBe(3);
      throw conflict;
    });

    await expect(retry).rejects.toBe(conflict);
    expect(isScenarioVersionConflict(conflict)).toBe(true);
    expect(queue.isBlocked()).toBe(true);
    expect(queue.getVersion()).toBe(3);
  });

  it("classifies Firebase ahead on the same history without a conflict", () => {
    const definition = getScenarioDefinition("kwame-request")!;
    const local = beginScenario(createInitialState(definition));
    const node = definition.nodes.find((candidate) => candidate.id === local.nodeId)!;
    const remote = applyChoice(definition, local, node.choices[0]!.id);

    expect(decideScenarioRecovery(remote, local)).toBe("remote-ahead");
    expect(decideScenarioRecovery(advance(definition, remote), remote)).toBe("remote-ahead");
  });

  it("classifies a valid local extension", () => {
    const definition = getScenarioDefinition("kwame-request")!;
    const remote = beginScenario(createInitialState(definition));
    const node = definition.nodes.find((candidate) => candidate.id === remote.nodeId)!;
    const local = applyChoice(definition, remote, node.choices[0]!.id);

    expect(decideScenarioRecovery(remote, local)).toBe("local-extension");
  });

  it("keeps divergent histories in conflict", () => {
    const definition = getScenarioDefinition("kwame-request")!;
    const started = beginScenario(createInitialState(definition));
    const node = definition.nodes.find((candidate) => candidate.id === started.nodeId)!;
    const remote = applyChoice(definition, started, node.choices[0]!.id);
    const local = applyChoice(definition, started, node.choices[1]!.id);

    expect(decideScenarioRecovery(remote, local)).toBe("conflict");
  });
});
