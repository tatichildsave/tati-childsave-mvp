import { schoolReopeningScenario } from "@/content/scenarios/school-reopening";
import type { ScenarioDefinition, ScenarioNode, ScenarioChoice } from "./types";

const ALL: ScenarioDefinition[] = [schoolReopeningScenario];

/**
 * Enhanced scenario definition with precomputed indexes for validation.
 * Used internally for O(1) lookups during state validation.
 */
export interface EnhancedScenarioDefinition extends ScenarioDefinition {
  /** All node IDs reachable from startNodeId via valid transitions. */
  reachableNodes: Set<string>;
  /** Map: nodeId → ScenarioNode (O(1) lookup). */
  nodeIndex: Map<string, ScenarioNode>;
  /** Map: nodeId → Map<choiceId → ScenarioChoice> (O(1) lookup). */
  choiceIndex: Map<string, Map<string, ScenarioChoice>>;
  /** Map: choiceId → nodeId (for choice source validation). */
  choiceToNode: Map<string, string>;
  /** Ending IDs that are valid in this scenario. */
  endingIds: Set<string>;
}

/**
 * Precompute reachability graph for a scenario.
 * BFS from startNodeId to find all reachable nodes.
 */
function computeReachableNodes(definition: ScenarioDefinition): Set<string> {
  const reachable = new Set<string>();
  const queue = [definition.startNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);

    const node = definition.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Add all directly reachable nodes from this node's choices
    for (const choice of node.choices) {
      if (choice.next && !reachable.has(choice.next)) {
        queue.push(choice.next);
      }
      if (choice.schedule && !reachable.has(choice.schedule.nodeId)) {
        queue.push(choice.schedule.nodeId);
      }
    }
  }

  return reachable;
}

/**
 * Build node lookup index: nodeId → ScenarioNode.
 */
function buildNodeIndex(definition: ScenarioDefinition): Map<string, ScenarioNode> {
  const index = new Map<string, ScenarioNode>();
  for (const node of definition.nodes) {
    index.set(node.id, node);
  }
  return index;
}

/**
 * Build choice lookup indexes:
 * 1. choiceIndex: nodeId → choiceId → ScenarioChoice
 * 2. choiceToNode: choiceId → sourceNodeId
 */
function buildChoiceIndexes(
  definition: ScenarioDefinition,
): [Map<string, Map<string, ScenarioChoice>>, Map<string, string>] {
  const choiceIndex = new Map<string, Map<string, ScenarioChoice>>();
  const choiceToNode = new Map<string, string>();

  for (const node of definition.nodes) {
    const nodeChoices = new Map<string, ScenarioChoice>();
    for (const choice of node.choices) {
      nodeChoices.set(choice.id, choice);
      choiceToNode.set(choice.id, node.id);
    }
    choiceIndex.set(node.id, nodeChoices);
  }

  return [choiceIndex, choiceToNode];
}

/**
 * Build ending IDs set for quick validation.
 */
function buildEndingIds(definition: ScenarioDefinition): Set<string> {
  return new Set(definition.endings.map((e) => e.id));
}

/**
 * Enhance a scenario definition with precomputed indexes.
 * Called once per scenario at module load time.
 */
function enhanceScenario(definition: ScenarioDefinition): EnhancedScenarioDefinition {
  const reachableNodes = computeReachableNodes(definition);
  const nodeIndex = buildNodeIndex(definition);
  const [choiceIndex, choiceToNode] = buildChoiceIndexes(definition);
  const endingIds = buildEndingIds(definition);

  return {
    ...definition,
    reachableNodes,
    nodeIndex,
    choiceIndex,
    choiceToNode,
    endingIds,
  };
}

/** Cache of enhanced scenario definitions. */
const ENHANCED_CACHE = new Map<string, EnhancedScenarioDefinition>();

/**
 * Initialize the cache on first access.
 */
function initializeCache() {
  if (ENHANCED_CACHE.size > 0) return;
  for (const scenario of ALL) {
    ENHANCED_CACHE.set(scenario.id, enhanceScenario(scenario));
  }
}

export function getScenarioDefinition(id: string): ScenarioDefinition | undefined {
  return ALL.find((s) => s.id === id);
}

/**
 * Get an enhanced scenario definition with precomputed validation indexes.
 * Use this in server functions for validation.
 */
export function getEnhancedScenarioDefinition(id: string): EnhancedScenarioDefinition | undefined {
  initializeCache();
  return ENHANCED_CACHE.get(id);
}

export function scenariosForTrack(trackId: string): ScenarioDefinition[] {
  return ALL.filter((s) => s.track === trackId);
}
