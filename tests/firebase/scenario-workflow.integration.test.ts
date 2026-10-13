/**
 * Phase 7C4C Gate B — Server-side scenario workflow integration tests.
 *
 * These exercise the REAL server logic (`loadChildScenarioForContext` /
 * `saveChildScenarioForContext`) against the REAL Firestore emulator:
 * authorization, track membership, engine replay integrity and persistence.
 *
 * Why not the `createServerFn` wrappers?
 * The TanStack Start Vite plugin rewrites `createServerFn().handler()` bodies
 * into transport stubs, so `__executeServer` resolves to `{result: undefined}`
 * under Vitest even inside `runWithStartContext`. The handler bodies are
 * therefore exported as plain async functions and the wrappers simply resolve
 * the child context and delegate. These tests call those exported functions,
 * which is the full server pipeline minus cookie parsing.
 *
 * Requires the Firestore emulator:  npx firebase emulators:start --only firestore
 */

process.env["FIRESTORE_EMULATOR_HOST"] = process.env["FIRESTORE_EMULATOR_HOST"] || "127.0.0.1:8080";
process.env["FIREBASE_PROJECT_ID"] = process.env["FIREBASE_PROJECT_ID"] || "demo-tati";

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import {
  loadChildScenarioForContext,
  saveChildScenarioForContext,
  type ScenarioStateInput,
} from "@/lib/auth/child-learning.functions";
import { getFirebaseAdminDb } from "@/integrations/firebase/admin.server";
import { FirebaseScenarioRepository } from "@/lib/backend/firebase/repositories";
import { getScenarioDefinition } from "@/lib/scenario/registry";
import { createInitialState, applyChoice, advance, beginScenario } from "@/lib/scenario/engine";
import { getTrack } from "@/lib/learning/track";
import { decideScenarioRecovery } from "@/lib/scenario/recovery";
import type { ScenarioState } from "@/lib/scenario/types";
import type { AuthenticatedChildContext } from "@/lib/auth/types";

const SCENARIO_ID = "kwame-request";
const FAMILY_A = "gateb-family-a";
const FAMILY_B = "gateb-family-b";
const CHILD_A = "gateb-child-a";
const CHILD_B = "gateb-child-b";

let db: Firestore;

function makeContext(
  childId: string,
  familyId: string,
  overrides: Partial<AuthenticatedChildContext> = {},
): AuthenticatedChildContext {
  return {
    session: {
      kind: "child",
      childId,
      sessionId: `session-${childId}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      revokedAt: null,
    },
    profile: {
      id: childId,
      tatiId: "TATI-TEST",
      name: "Test Child",
      age: 10,
      avatar: "avatar-1",
      tier: "junior",
      curriculum_level: null,
      familyId,
    },
    firebase: {
      firebaseUid: `uid-${childId}`,
      familyId,
      status: "active",
    },
    childId,
    sessionId: `session-${childId}`,
    familyId,
    ...overrides,
  } as AuthenticatedChildContext;
}

/** Convert an engine ScenarioState into the shape the server validator accepts. */
function toInput(state: ScenarioState, expectedVersion = 0): ScenarioStateInput {
  return {
    ...(JSON.parse(JSON.stringify(state)) as ScenarioState),
    expectedVersion,
  };
}

async function wipeSession(familyId: string, childId: string) {
  await db
    .collection("families")
    .doc(familyId)
    .collection("children")
    .doc(childId)
    .collection("scenarioSessions")
    .doc(SCENARIO_ID)
    .delete();
}

describe("Gate B — server-side scenario save/load workflow", () => {
  beforeAll(() => {
    db = getFirebaseAdminDb();
  });

  beforeEach(async () => {
    await wipeSession(FAMILY_A, CHILD_A);
    await wipeSession(FAMILY_B, CHILD_B);
  });

  // --------------------------------------------------------------------
  // Identity, authorization and scenario resolution
  // --------------------------------------------------------------------

  describe("authorization and scenario resolution", () => {
    it("loads a valid child scenario and reports no prior session", async () => {
      const result = await loadChildScenarioForContext(makeContext(CHILD_A, FAMILY_A), {
        scenarioId: SCENARIO_ID,
      });

      expect(result.sessionId).toBeNull();
      expect(result.state).toEqual(
        expect.objectContaining({
          scenarioId: SCENARIO_ID,
          phase: "intro",
          decisions: [],
        }),
      );
      expect(result.version).toBe(0);
      expect(result.definition?.id).toBe(SCENARIO_ID);
    });

    it("rejects an expired ChildSession", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      context.session.expiresAt = new Date(Date.now() - 1000).toISOString();

      await expect(
        loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID }),
      ).rejects.toThrow(/Session expired/);
    });

    it("rejects a revoked ChildSession", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      context.session.revokedAt = new Date().toISOString();

      await expect(
        loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID }),
      ).rejects.toThrow(/Session revoked/);
    });

    it("rejects a non-child session (missing ChildSession)", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      (context.session as { kind: string }).kind = "parent";

      await expect(
        loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID }),
      ).rejects.toThrow(/Child session required/);
    });

    it("rejects a parent session attempting to save a scenario", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      (context.session as { kind: string }).kind = "parent";
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      await expect(
        saveChildScenarioForContext(context, toInput(createInitialState(definition))),
      ).rejects.toThrow(/Child session required/);
    });

    it("rejects a context whose Firebase family disagrees with the session family", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      context.firebase = { firebaseUid: "uid", familyId: FAMILY_B, status: "active" };

      await expect(
        loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID }),
      ).rejects.toThrow(/Firebase identity mismatch/);
    });

    it("rejects an unknown scenario ID on load and on save", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);

      await expect(
        loadChildScenarioForContext(context, { scenarioId: "not-a-real-scenario" }),
      ).rejects.toThrow(/not available/);

      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const forgedId = toInput({ ...createInitialState(definition), scenarioId: "nope" });
      await expect(saveChildScenarioForContext(context, forgedId)).rejects.toThrow(/not available/);
    });

    it("accepts the scenario definition id used by the client, which the track stores per chapter", () => {
      // Regression guard: the track sequence stores chapter stops
      // ("kwame-request--ch1"), but the engine/client send the definition id.
      const track = getTrack("save");
      const chapterIds = track.sequence
        .filter((item) => item.kind === "scenario")
        .map((item) => item.id);

      expect(chapterIds).not.toContain(SCENARIO_ID);
      expect(chapterIds.length).toBeGreaterThan(0);
      expect(getScenarioDefinition(SCENARIO_ID)).toBeDefined();
    });
  });

  // --------------------------------------------------------------------
  // Lifecycle: initialization, decisions, reload
  // --------------------------------------------------------------------

  describe("save/load lifecycle", () => {
    it("persists first-time initial state at version 1 on the family-scoped path", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const saved = await saveChildScenarioForContext(
        context,
        toInput(createInitialState(definition)),
      );

      expect(saved.sessionId).toBe(SCENARIO_ID);
      expect(saved.version).toBe(1);
      expect(saved.status).toBe("in_progress");

      const snap = await db
        .collection("families")
        .doc(FAMILY_A)
        .collection("children")
        .doc(CHILD_A)
        .collection("scenarioSessions")
        .doc(SCENARIO_ID)
        .get();

      expect(snap.exists).toBe(true);
      expect(snap.data()?.["familyId"]).toBe(FAMILY_A);
      expect(snap.data()?.["childId"]).toBe(CHILD_A);
      expect(snap.data()?.["version"]).toBe(1);
    });

    it("persists a first decision and reloads it after a simulated refresh", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const initial = createInitialState(definition);
      const firstChoice = definition.nodes.find((n) => n.id === definition.startNodeId)!
        .choices[0]!;
      const afterChoice = advance(definition, applyChoice(definition, initial, firstChoice.id));

      const saved = await saveChildScenarioForContext(context, toInput(afterChoice));
      expect(saved.version).toBe(1);

      // Simulated page refresh: brand-new context, same identity.
      const reloaded = await loadChildScenarioForContext(makeContext(CHILD_A, FAMILY_A), {
        scenarioId: SCENARIO_ID,
      });

      expect(reloaded.sessionId).toBe(SCENARIO_ID);
      expect(reloaded.version).toBe(1);
      expect(reloaded.state?.decisions).toHaveLength(1);
      expect(reloaded.state?.decisions[0]?.choiceId).toBe(firstChoice.id);
      expect(reloaded.state?.available).toBe(afterChoice.available);
      expect(reloaded.state?.saved).toBe(afterChoice.saved);
    });

    it("persists a second decision and increments the version", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const initial = createInitialState(definition);
      const choice1 = definition.nodes.find((n) => n.id === definition.startNodeId)!.choices[0]!;
      const state1 = advance(definition, applyChoice(definition, initial, choice1.id));
      const first = await saveChildScenarioForContext(context, toInput(state1));
      expect(first.version).toBe(1);

      const node2 = definition.nodes.find((n) => n.id === state1.nodeId);
      const choice2 = node2?.choices[0];
      expect(choice2, "scenario should offer a second decision").toBeDefined();

      const state2 = advance(definition, applyChoice(definition, state1, choice2!.id));
      const second = await saveChildScenarioForContext(context, toInput(state2, first.version));

      expect(second.version).toBe(2);

      const reloaded = await loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID });
      expect(reloaded.version).toBe(2);
      expect(reloaded.state?.decisions).toHaveLength(2);
    });

    it("survives logout/login: a fresh context for the same child sees persisted progress", async () => {
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const initial = createInitialState(definition);
      const choice = definition.nodes.find((n) => n.id === definition.startNodeId)!.choices[0]!;
      const state1 = advance(definition, applyChoice(definition, initial, choice.id));

      await saveChildScenarioForContext(makeContext(CHILD_A, FAMILY_A), toInput(state1));

      // New login = new sessionId, same childId/familyId.
      const afterLogin = makeContext(CHILD_A, FAMILY_A);
      afterLogin.session.sessionId = "brand-new-session";

      const reloaded = await loadChildScenarioForContext(afterLogin, { scenarioId: SCENARIO_ID });
      expect(reloaded.state?.decisions).toHaveLength(1);
      expect(reloaded.version).toBe(1);
    });
  });

  // --------------------------------------------------------------------
  // Engine-based validation / forgery rejection
  // --------------------------------------------------------------------

  describe("engine-derived validation", () => {
    it("rejects forged completion with no supporting decisions", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const forged = toInput({
        ...createInitialState(definition),
        phase: "complete",
        endingId: definition.endings[0]?.id,
      });

      await expect(saveChildScenarioForContext(context, forged)).rejects.toThrow(
        /integrity violation/i,
      );

      const snap = await db
        .collection("families")
        .doc(FAMILY_A)
        .collection("children")
        .doc(CHILD_A)
        .collection("scenarioSessions")
        .doc(SCENARIO_ID)
        .get();
      expect(snap.exists).toBe(false);
    });

    it("rejects inflated savings that the engine never produced", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const initial = createInitialState(definition);
      const choice = definition.nodes.find((n) => n.id === definition.startNodeId)!.choices[0]!;
      const legit = advance(definition, applyChoice(definition, initial, choice.id));

      const forged = toInput({ ...legit, saved: legit.saved + 500 });

      await expect(saveChildScenarioForContext(context, forged)).rejects.toThrow(
        /money mismatch|integrity violation/i,
      );
    });

    it("rejects a decision referencing a choice that does not exist", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const initial = createInitialState(definition);
      const choice = definition.nodes.find((n) => n.id === definition.startNodeId)!.choices[0]!;
      const legit = advance(definition, applyChoice(definition, initial, choice.id));

      const forged = toInput(legit);
      (forged.decisions[0] as Record<string, unknown>)["choiceId"] = "totally-made-up-choice";

      await expect(saveChildScenarioForContext(context, forged)).rejects.toThrow();
    });

    it("rejects an unreachable node id", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const forged = toInput({
        ...createInitialState(definition),
        nodeId: "node-that-is-not-real",
      });

      await expect(saveChildScenarioForContext(context, forged)).rejects.toThrow();
    });

    it("rejects an impossible phase transition", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const forged = toInput({
        ...createInitialState(definition),
        phase: "complete",
      });

      await expect(saveChildScenarioForContext(context, forged)).rejects.toThrow(
        /Invalid phase|integrity violation/i,
      );
    });

    it("persists the engine-derived state, not the client's claimed node", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const initial = createInitialState(definition);
      const choice = definition.nodes.find((n) => n.id === definition.startNodeId)!.choices[0]!;
      const legit = advance(definition, applyChoice(definition, initial, choice.id));

      await saveChildScenarioForContext(context, toInput(legit));

      const reloaded = await loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID });
      // Engine replay is authoritative for money and competencies.
      expect(reloaded.state?.available).toBe(legit.available);
      expect(reloaded.state?.saved).toBe(legit.saved);
      expect(reloaded.state?.nodeId).toBe(legit.nodeId);
    });
  });

  // --------------------------------------------------------------------
  // Cross-child / cross-family isolation
  // --------------------------------------------------------------------

  describe("family and child isolation", () => {
    it("does not expose child A's scenario state to child B in another family", async () => {
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const initial = createInitialState(definition);
      const choice = definition.nodes.find((n) => n.id === definition.startNodeId)!.choices[0]!;
      const state1 = advance(definition, applyChoice(definition, initial, choice.id));

      await saveChildScenarioForContext(makeContext(CHILD_A, FAMILY_A), toInput(state1));

      const other = await loadChildScenarioForContext(makeContext(CHILD_B, FAMILY_B), {
        scenarioId: SCENARIO_ID,
      });

      expect(other.state).toEqual(
        expect.objectContaining({
          scenarioId: SCENARIO_ID,
          phase: "intro",
          decisions: [],
        }),
      );
      expect(other.sessionId).toBeNull();
      expect(other.version).toBe(0);
    });

    it("does not expose child A's scenario state to another child in the same family", async () => {
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const initial = createInitialState(definition);
      const choice = definition.nodes.find((n) => n.id === definition.startNodeId)!.choices[0]!;
      const state1 = advance(definition, applyChoice(definition, initial, choice.id));

      await saveChildScenarioForContext(makeContext(CHILD_A, FAMILY_A), toInput(state1));

      const sibling = await loadChildScenarioForContext(makeContext(CHILD_B, FAMILY_A), {
        scenarioId: SCENARIO_ID,
      });

      expect(sibling.sessionId).toBeNull();
      expect(sibling.version).toBe(0);
      expect(sibling.state?.decisions).toEqual([]);
    });

    it("writes under the family from the server context, ignoring any client-supplied identity", async () => {
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const initial = createInitialState(definition);
      const choice = definition.nodes.find((n) => n.id === definition.startNodeId)!.choices[0]!;
      const state1 = advance(definition, applyChoice(definition, initial, choice.id));

      // Client tries to smuggle another family/child into the payload.
      const payload = toInput(state1) as Record<string, unknown>;
      payload["familyId"] = FAMILY_B;
      payload["childId"] = CHILD_B;

      await saveChildScenarioForContext(
        makeContext(CHILD_A, FAMILY_A),
        payload as ScenarioStateInput,
      );

      const victim = await db
        .collection("families")
        .doc(FAMILY_B)
        .collection("children")
        .doc(CHILD_B)
        .collection("scenarioSessions")
        .doc(SCENARIO_ID)
        .get();
      expect(victim.exists).toBe(false);

      const owner = await db
        .collection("families")
        .doc(FAMILY_A)
        .collection("children")
        .doc(CHILD_A)
        .collection("scenarioSessions")
        .doc(SCENARIO_ID)
        .get();
      expect(owner.exists).toBe(true);
      expect(owner.data()?.["familyId"]).toBe(FAMILY_A);
    });
  });

  // --------------------------------------------------------------------
  // Optimistic concurrency
  // --------------------------------------------------------------------

  describe("optimistic concurrency", () => {
    it("repository rejects a stale expectedVersion", async () => {
      const repo = new FirebaseScenarioRepository(db, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const state = createInitialState(definition);

      await repo.saveSession(CHILD_A, SCENARIO_ID, state, 0); // -> v1
      await repo.saveSession(CHILD_A, SCENARIO_ID, state, 1); // -> v2

      await expect(repo.saveSession(CHILD_A, SCENARIO_ID, state, 1)).rejects.toThrow(
        /Version conflict/,
      );
    });

    it("rejects the second tab when both tabs saved from version 0", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const initial = createInitialState(definition);
      const startNode = definition.nodes.find((n) => n.id === definition.startNodeId)!;
      const tabOne = advance(
        definition,
        applyChoice(definition, initial, startNode.choices[0]!.id),
      );
      const tabTwo = advance(
        definition,
        applyChoice(definition, initial, startNode.choices[1]!.id),
      );

      const first = await saveChildScenarioForContext(context, toInput(tabOne));

      expect(first.version).toBe(1);
      await expect(saveChildScenarioForContext(context, toInput(tabTwo))).rejects.toThrow(
        /SCENARIO_VERSION_CONFLICT/,
      );

      const reloaded = await loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID });
      expect(reloaded.state?.decisions[0]?.choiceId).toBe(startNode.choices[0]!.id);
    });
  });

  // --------------------------------------------------------------------
  // Persistence failure handling
  // --------------------------------------------------------------------

  describe("persistence failure handling", () => {
    it("surfaces a Firestore failure instead of reporting a successful save", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const broken = new Error("Firestore unavailable");
      const original = db.runTransaction.bind(db);
      (db as unknown as { runTransaction: unknown }).runTransaction = () => Promise.reject(broken);

      try {
        await expect(
          saveChildScenarioForContext(context, toInput(createInitialState(definition))),
        ).rejects.toThrow(/Firestore unavailable/);
      } finally {
        (db as unknown as { runTransaction: unknown }).runTransaction = original;
      }

      const snap = await db
        .collection("families")
        .doc(FAMILY_A)
        .collection("children")
        .doc(CHILD_A)
        .collection("scenarioSessions")
        .doc(SCENARIO_ID)
        .get();
      expect(snap.exists).toBe(false);
    });
  });

  // --------------------------------------------------------------------
  // Actual UI call sequence (useScenarioRunner)
  // --------------------------------------------------------------------

  describe("actual UI call sequence", () => {
    it("persists the checkpoint issued by start()", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const uiState = beginScenario(createInitialState(definition));

      const saved = await saveChildScenarioForContext(context, toInput(uiState));
      expect(saved.version).toBe(1);

      const reloaded = await loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID });
      expect(reloaded.state?.phase).toBe("decision");
    });

    it("persists the checkpoint issued by choose()", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      const start = beginScenario(createInitialState(definition));
      const started = await saveChildScenarioForContext(context, toInput(start));
      const startNode = definition.nodes.find((n) => n.id === definition.startNodeId)!;
      const uiState = applyChoice(definition, start, startNode.choices[0]!.id);

      expect(uiState.phase).toBe("consequence");

      const saved = await saveChildScenarioForContext(context, toInput(uiState, started.version));
      expect(saved.version).toBe(2);

      const reloaded = await loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID });
      expect(reloaded.state?.phase).toBe("consequence");
      expect(reloaded.state?.decisions).toHaveLength(1);
    });

    it("persists the checkpoint issued by continueOn()", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const startedState = beginScenario(createInitialState(definition));
      const started = await saveChildScenarioForContext(context, toInput(startedState));
      const startNode = definition.nodes.find((node) => node.id === definition.startNodeId)!;
      const consequenceState = applyChoice(definition, startedState, startNode.choices[0]!.id);
      const chose = await saveChildScenarioForContext(
        context,
        toInput(consequenceState, started.version),
      );

      const continuedState = advance(definition, consequenceState);
      const continued = await saveChildScenarioForContext(
        context,
        toInput(continuedState, chose.version),
      );

      expect(continued.version).toBe(3);
      const reloaded = await loadChildScenarioForContext(context, {
        scenarioId: SCENARIO_ID,
      });
      expect(reloaded.state?.phase).toBe(continuedState.phase);
      expect(reloaded.state?.nodeId).toBe(continuedState.nodeId);
      expect(reloaded.state?.decisions).toEqual(continuedState.decisions);
    });
  });

  describe("localStorage recovery policy", () => {
    it("treats a valid unsaved local extension as recoverable", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const remote = beginScenario(createInitialState(definition));
      const persisted = await saveChildScenarioForContext(context, toInput(remote));
      const node = definition.nodes.find((candidate) => candidate.id === remote.nodeId)!;
      const local = applyChoice(definition, remote, node.choices[0]!.id);

      expect(decideScenarioRecovery(remote, local)).toBe("local-extension");

      const recovered = await saveChildScenarioForContext(
        context,
        toInput(local, persisted.version),
      );
      expect(recovered.version).toBe(2);

      const reloaded = await loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID });
      expect(reloaded.state?.decisions).toHaveLength(1);
      expect(reloaded.state?.phase).toBe("consequence");
    });

    it("preserves Firebase when localStorage contains an incompatible branch", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const started = beginScenario(createInitialState(definition));
      const node = definition.nodes.find((candidate) => candidate.id === started.nodeId)!;
      const remote = applyChoice(definition, started, node.choices[0]!.id);
      const local = applyChoice(definition, started, node.choices[1]!.id);

      await saveChildScenarioForContext(context, toInput(remote));
      expect(decideScenarioRecovery(remote, local)).toBe("conflict");

      const reloaded = await loadChildScenarioForContext(context, { scenarioId: SCENARIO_ID });
      expect(reloaded.state?.decisions[0]?.choiceId).toBe(node.choices[0]!.id);
    });

    it("resumes identical histories without creating a new branch", () => {
      const definition = getScenarioDefinition(SCENARIO_ID)!;
      const state = beginScenario(createInitialState(definition));
      expect(decideScenarioRecovery(state, { ...state, updatedAt: new Date().toISOString() })).toBe(
        "identical",
      );
    });
  });

  // --------------------------------------------------------------------
  // Completion consistency
  // --------------------------------------------------------------------

  describe("completion consistency", () => {
    it("marks a genuinely completed run as completed without touching journey progress", async () => {
      const context = makeContext(CHILD_A, FAMILY_A);
      const definition = getScenarioDefinition(SCENARIO_ID)!;

      // Walk the scenario with the engine until it reports completion.
      let state = beginScenario(createInitialState(definition));
      let guard = 0;
      while (state.phase !== "complete" && guard < 100) {
        const node = definition.nodes.find((n) => n.id === state.nodeId);
        const choice = node?.choices[0];
        if (!choice) break;
        state = advance(definition, applyChoice(definition, state, choice.id));
        guard += 1;
      }

      expect(state.phase, "engine should be able to complete the scenario").toBe("complete");

      const saved = await saveChildScenarioForContext(context, toInput(state));
      expect(saved.status).toBe("completed");

      const snap = await db
        .collection("families")
        .doc(FAMILY_A)
        .collection("children")
        .doc(CHILD_A)
        .collection("scenarioSessions")
        .doc(SCENARIO_ID)
        .get();
      expect(snap.data()?.["status"]).toBe("completed");
      expect(snap.data()?.["completedAt"]).toBeTruthy();

      // Gate B does not write journey progress; that stays a separate call.
      const progress = await db
        .collection("families")
        .doc(FAMILY_A)
        .collection("children")
        .doc(CHILD_A)
        .collection("journeyProgress")
        .get();
      expect(progress.empty).toBe(true);
    });
  });
});
