import React, { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyChoice, beginScenario, createInitialState } from "@/lib/scenario/engine";
import { getScenarioDefinition } from "@/lib/scenario/registry";
import { scenarioCacheKey, writeCachedState } from "@/lib/scenario/session";
import { useScenarioRunner, type ScenarioPersistence } from "@/lib/scenario/useScenarioRunner";
import type { ScenarioDefinition, ScenarioState } from "@/lib/scenario/types";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(async () => undefined),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class TestNode {
  nodeType: number;
  nodeName: string;
  tagName: string;
  ownerDocument: TestDocument | null;
  parentNode: TestNode | null = null;
  childNodes: TestNode[] = [];
  style = {};
  namespaceURI = "http://www.w3.org/1999/xhtml";
  nodeValue?: string;

  constructor(type: number, name: string, ownerDocument: TestDocument | null) {
    this.nodeType = type;
    this.nodeName = name;
    this.tagName = name;
    this.ownerDocument = ownerDocument;
  }

  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  removeAttribute() {}

  appendChild(node: TestNode) {
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  insertBefore(node: TestNode, before: TestNode) {
    node.parentNode = this;
    const index = this.childNodes.indexOf(before);
    this.childNodes.splice(index < 0 ? this.childNodes.length : index, 0, node);
    return node;
  }

  removeChild(node: TestNode) {
    const index = this.childNodes.indexOf(node);
    if (index >= 0) this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
  }
}

class TestDocument extends TestNode {
  documentElement: TestNode;
  body: TestNode;
  defaultView: {
    document: TestDocument;
    HTMLIFrameElement: new () => object;
    location: { reload: ReturnType<typeof vi.fn> };
    localStorage: Storage;
  };

  constructor(localStorage: Storage, reload: ReturnType<typeof vi.fn>) {
    super(9, "#document", null);
    this.ownerDocument = this;
    this.documentElement = this.createElement("html");
    this.body = this.createElement("body");
    this.defaultView = {
      document: this,
      HTMLIFrameElement: class {},
      location: { reload },
      localStorage,
    };
  }

  createElement(name: string) {
    return new TestNode(1, name.toUpperCase(), this);
  }

  createTextNode(text: string) {
    const node = new TestNode(3, "#text", this);
    node.nodeValue = text;
    return node;
  }
}

type Runner = ReturnType<typeof useScenarioRunner>;

interface ProbeProps {
  scenario: ScenarioDefinition;
  childId: string;
  persistence: ScenarioPersistence;
  onRender: (runner: Runner) => void;
}

function RunnerProbe({ scenario, childId, persistence, onRender }: ProbeProps) {
  const runner = useScenarioRunner(scenario, childId, persistence);
  onRender(runner);
  return null;
}

function createMemoryStorage() {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
  return { storage, values };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useScenarioRunner lifecycle", () => {
  let root: Root;
  let latest: Runner;
  let storage: ReturnType<typeof createMemoryStorage>;
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage = createMemoryStorage();
    reload = vi.fn();
    const testDocument = new TestDocument(storage.storage, reload);
    vi.stubGlobal("document", testDocument);
    vi.stubGlobal("window", testDocument.defaultView);
    vi.stubGlobal("navigator", { userAgent: "node" });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    root = createRoot(document.createElement("div"));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("survives StrictMode and ignores inline persistence identity changes", async () => {
    const scenario = getScenarioDefinition("kwame-request")!;
    const loads: Deferred<{
      state: ScenarioState;
      version: number;
      sessionId?: string;
    }>[] = [];
    const loadSession = vi.fn(() => {
      const load = deferred<{
        state: ScenarioState;
        version: number;
        sessionId?: string;
      }>();
      loads.push(load);
      return load.promise;
    });
    const adapter = (): ScenarioPersistence => ({
      loadSession,
      saveSession: vi.fn(),
      recordDecision: vi.fn(async () => undefined),
    });

    await act(async () => {
      root.render(
        <StrictMode>
          <RunnerProbe
            scenario={scenario}
            childId="child-a"
            persistence={adapter()}
            onRender={(runner) => {
              latest = runner;
            }}
          />
        </StrictMode>,
      );
    });

    expect(latest.status).toBe("loading");
    expect(loadSession).toHaveBeenCalledTimes(2);

    const remote = beginScenario(createInitialState(scenario));
    loads[1]!.resolve({ state: remote, version: 4, sessionId: scenario.id });
    await flushEffects();
    expect(latest.status).toBe("resumed");
    expect(latest.state).toEqual(remote);
    const resumedState = latest.state;

    await act(async () => {
      root.render(
        <StrictMode>
          <RunnerProbe
            scenario={scenario}
            childId="child-a"
            persistence={adapter()}
            onRender={(runner) => {
              latest = runner;
            }}
          />
        </StrictMode>,
      );
    });
    await flushEffects();

    expect(loadSession).toHaveBeenCalledTimes(2);
    expect(latest.status).toBe("resumed");
    expect(latest.state).toBe(resumedState);

    loads[0]!.resolve({
      state: createInitialState(scenario),
      version: 1,
      sessionId: scenario.id,
    });
    await flushEffects();
    expect(latest.state).toBe(resumedState);
  });

  it("isolates identity switches from delayed loads and queued saves", async () => {
    const scenarioA = getScenarioDefinition("kwame-request")!;
    const scenarioB: ScenarioDefinition = {
      ...scenarioA,
      id: "kwame-request-alternate",
    };
    const loadA = deferred<{ state: ScenarioState; version: number; sessionId?: string }>();
    const loadB = deferred<{ state: ScenarioState; version: number; sessionId?: string }>();
    const firstSave = deferred<{ sessionId: string; version: number }>();
    const secondSave = deferred<{ sessionId: string; version: number }>();
    const saveA = vi
      .fn<ScenarioPersistence["saveSession"]>()
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(secondSave.promise);
    const saveB = vi.fn<ScenarioPersistence["saveSession"]>();
    const adapterA: ScenarioPersistence = {
      loadSession: vi.fn(() => loadA.promise),
      saveSession: saveA,
      recordDecision: vi.fn(async () => undefined),
    };
    const adapterB: ScenarioPersistence = {
      loadSession: vi.fn(() => loadB.promise),
      saveSession: saveB,
      recordDecision: vi.fn(async () => undefined),
    };

    await act(async () => {
      root.render(
        <RunnerProbe
          scenario={scenarioA}
          childId="child-a"
          persistence={adapterA}
          onRender={(runner) => {
            latest = runner;
          }}
        />,
      );
    });
    const remoteA = createInitialState(scenarioA);
    loadA.resolve({ state: remoteA, version: 0 });
    await flushEffects();

    await act(async () => latest.start());
    const startNode = scenarioA.nodes.find((node) => node.id === latest.state.nodeId)!;
    await act(async () => latest.choose(startNode.choices[0]!.id));
    expect(saveA).toHaveBeenCalledTimes(1);

    const remoteB = createInitialState(scenarioB);
    writeCachedState(scenarioCacheKey("child-b", scenarioB.id), remoteB, 7);
    await act(async () => {
      root.render(
        <RunnerProbe
          scenario={scenarioB}
          childId="child-b"
          persistence={adapterB}
          onRender={(runner) => {
            latest = runner;
          }}
        />,
      );
    });
    expect(latest.status).toBe("loading");
    expect(latest.state.scenarioId).toBe(scenarioB.id);

    loadB.resolve({ state: remoteB, version: 7 });
    await flushEffects();
    expect(latest.state).toEqual(remoteB);

    firstSave.resolve({ sessionId: scenarioA.id, version: 1 });
    await flushEffects();
    expect(saveA).toHaveBeenCalledTimes(2);
    expect(saveB).not.toHaveBeenCalled();

    secondSave.resolve({ sessionId: scenarioA.id, version: 2 });
    await flushEffects();
    expect(latest.state).toEqual(remoteB);
    expect(JSON.parse(storage.values.get(scenarioCacheKey("child-b", scenarioB.id))!)).toEqual({
      state: remoteB,
      version: 7,
    });
  });

  it("turns a load failure into a blocked recoverable state", async () => {
    const scenario = getScenarioDefinition("kwame-request")!;
    const load = deferred<{ state: ScenarioState; version: number; sessionId?: string }>();
    const persistence: ScenarioPersistence = {
      loadSession: vi.fn(() => load.promise),
      saveSession: vi.fn(),
      recordDecision: vi.fn(async () => undefined),
    };
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await act(async () => {
      root.render(
        <RunnerProbe
          scenario={scenario}
          childId="child-a"
          persistence={persistence}
          onRender={(runner) => {
            latest = runner;
          }}
        />,
      );
    });
    load.reject(new Error("network unavailable"));
    await flushEffects();

    expect(latest.status).toBe("interrupted");
    expect(latest.recoveryRequired).toBe(true);
    expect(latest.saveErrorActionLabel).toBe("Reload safely");
    expect(latest.saveError).toContain("couldn't load Firebase progress");

    latest.resolveSaveError();
    expect(reload).toHaveBeenCalledOnce();
  });
});
