/**
 * Automatic Dependency Resolution
 *
 * Julia-inspired auto-wiring: modules declare inputs/outputs,
 * framework resolves dependencies automatically.
 *
 * Key concepts:
 * - OutputRegistry: maps output names to providing modules
 * - Topological sort: determines execution order
 * - Transforms: compute derived inputs from outputs
 * - Lags: handle feedback loops with delayed values
 */

import { Module } from './module.js';
import { Year, YearIndex } from './types.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A module with any type parameters (for registry)
 */
export type AnyModule = Module<any, any, any, any>;

/**
 * Transform function: compute an input from available outputs
 */
export type TransformFn = (outputs: Record<string, any>, year: Year, yearIndex: YearIndex) => any;

/**
 * Transform configuration with explicit dependencies
 */
export interface TransformConfig {
  /** Function that computes the transform */
  fn: TransformFn;
  /** Output names this transform reads (creates dependency edges) */
  dependsOn: string[];
}

/**
 * Transform entry: either a bare function (backwards compat) or config with dependencies
 */
export type TransformEntry = TransformFn | TransformConfig;

/**
 * Normalize a transform entry to TransformConfig
 */
function normalizeTransform(entry: TransformEntry): TransformConfig {
  if (typeof entry === 'function') {
    return { fn: entry, dependsOn: [] };  // Backwards compat: no deps
  }
  return entry;
}

/**
 * Lag configuration for feedback loops
 */
export interface LagConfig {
  /** Source output name */
  source: string;
  /** Delay in years (1 = use last year's value) */
  delay: number;
  /** Initial value for year 0 */
  initial: any;
}

/**
 * Configuration for auto-wired simulation
 */
export interface AutowireConfig {
  /** Modules to wire together */
  modules: AnyModule[];

  /**
   * Transforms: compute derived inputs from outputs
   * Key is the input name, value is a function or config with dependencies
   */
  transforms?: Record<string, TransformEntry>;

  /**
   * Lags: handle feedback loops with delayed values
   * Key is the input name, value specifies source and delay
   */
  lags?: Record<string, LagConfig>;

  /**
   * Module parameter overrides
   * Key is module name, value is partial params
   */
  params?: Record<string, any>;

  /** Start year (default: 2025) */
  startYear?: number;

  /** End year (default: 2100) */
  endYear?: number;
}

/**
 * Dependency graph node
 */
interface DepNode {
  module: AnyModule;
  dependsOn: Set<string>;  // Module names this depends on
  providesTo: Set<string>; // Module names that depend on this
}

// =============================================================================
// OUTPUT REGISTRY
// =============================================================================

/**
 * Build a registry mapping output names to their providing modules
 */
export function buildOutputRegistry(modules: AnyModule[]): Map<string, string> {
  const registry = new Map<string, string>();

  for (const mod of modules) {
    for (const output of mod.outputs) {
      if (registry.has(output as string)) {
        const existing = registry.get(output as string);
        throw new Error(
          `Output collision: '${output as string}' provided by both '${existing}' and '${mod.name}'`
        );
      }
      registry.set(output as string, mod.name);
    }
  }

  return registry;
}

// =============================================================================
// DEPENDENCY GRAPH
// =============================================================================

/**
 * Build dependency graph from modules
 */
export function buildDependencyGraph(
  modules: AnyModule[],
  outputRegistry: Map<string, string>,
  transforms: Record<string, TransformEntry> = {},
  lags: Record<string, LagConfig> = {}
): Map<string, DepNode> {
  const graph = new Map<string, DepNode>();

  // Initialize nodes
  for (const mod of modules) {
    graph.set(mod.name, {
      module: mod,
      dependsOn: new Set(),
      providesTo: new Set(),
    });
  }

  // Build edges
  for (const mod of modules) {
    const node = graph.get(mod.name)!;

    for (const input of mod.inputs) {
      const inputName = input as string;

      // Handle transforms - now with dependency tracking
      if (transforms[inputName]) {
        const config = normalizeTransform(transforms[inputName]);
        // Add edges for transform's declared dependencies
        for (const depOutput of config.dependsOn) {
          const provider = outputRegistry.get(depOutput);
          if (provider && provider !== mod.name) {
            node.dependsOn.add(provider);
            graph.get(provider)!.providesTo.add(mod.name);
          }
        }
        continue;  // Input is handled by transform
      }

      // Handle lags (unchanged - lags break cycles intentionally)
      if (lags[inputName]) {
        continue;
      }

      // Find which module provides this output
      const provider = outputRegistry.get(inputName);
      if (!provider) {
        throw new Error(
          `Unresolved input: '${inputName}' required by '${mod.name}' ` +
          `but no module provides it. Add a transform or lag, or add a module that outputs it.`
        );
      }

      // Don't add self-dependency
      if (provider !== mod.name) {
        node.dependsOn.add(provider);
        graph.get(provider)!.providesTo.add(mod.name);
      }
    }
  }

  return graph;
}

// =============================================================================
// TOPOLOGICAL SORT
// =============================================================================

/**
 * Topologically sort modules by dependencies (Kahn's algorithm)
 * Returns modules in execution order
 */
export function topologicalSort(graph: Map<string, DepNode>): AnyModule[] {
  const sorted: AnyModule[] = [];
  const remaining = new Map(graph);

  // Find nodes with no dependencies
  const ready: string[] = [];
  for (const [name, node] of remaining) {
    if (node.dependsOn.size === 0) {
      ready.push(name);
    }
  }

  while (ready.length > 0) {
    const name = ready.shift()!;
    const node = remaining.get(name)!;
    sorted.push(node.module);
    remaining.delete(name);

    // Remove this node from dependencies of others
    for (const dependent of node.providesTo) {
      if (remaining.has(dependent)) {
        const depNode = remaining.get(dependent)!;
        depNode.dependsOn.delete(name);
        if (depNode.dependsOn.size === 0) {
          ready.push(dependent);
        }
      }
    }
  }

  // Check for cycles
  if (remaining.size > 0) {
    const cycleNodes = Array.from(remaining.keys()).join(', ');
    throw new Error(
      `Dependency cycle detected involving: ${cycleNodes}. ` +
      `Use 'lags' configuration to break the cycle.`
    );
  }

  return sorted;
}

// =============================================================================
// AUTO-WIRED SIMULATION
// =============================================================================

/**
 * Result from running an auto-wired simulation
 */
export interface AutowireResult {
  years: number[];
  outputs: Record<string, Record<string, any[]>>;  // module -> output -> values[]
  states: Record<string, any[]>;  // module -> state[]
}

/**
 * Create and run an auto-wired simulation
 */
export function runAutowired(config: AutowireConfig): AutowireResult {
  const {
    modules,
    transforms = {},
    lags = {},
    params = {},
    startYear = 2025,
    endYear = 2100,
  } = config;

  // Build registry and graph
  const outputRegistry = buildOutputRegistry(modules);
  const graph = buildDependencyGraph(modules, outputRegistry, transforms, lags);
  const sortedModules = topologicalSort(graph);

  // Initialize module states and params
  const moduleMap = new Map<string, AnyModule>();
  const stateMap = new Map<string, any>();
  const paramsMap = new Map<string, any>();

  for (const mod of sortedModules) {
    moduleMap.set(mod.name, mod);
    const mergedParams = mod.mergeParams(params[mod.name] ?? {});
    paramsMap.set(mod.name, mergedParams);
    stateMap.set(mod.name, mod.init(mergedParams));
  }

  // Initialize lag history
  const lagHistory = new Map<string, any[]>();
  for (const [inputName, lagConfig] of Object.entries(lags)) {
    const history: any[] = [];
    for (let i = 0; i < lagConfig.delay; i++) {
      history.push(lagConfig.initial);
    }
    lagHistory.set(inputName, history);
  }

  // Result storage
  const years: number[] = [];
  const outputs: Record<string, Record<string, any[]>> = {};
  const states: Record<string, any[]> = {};

  for (const mod of sortedModules) {
    outputs[mod.name] = {};
    for (const output of mod.outputs) {
      outputs[mod.name][output as string] = [];
    }
    states[mod.name] = [];
  }

  // Current year's outputs (for dependency resolution)
  let currentOutputs: Record<string, any> = {};

  // Run simulation
  for (let year = startYear; year <= endYear; year++) {
    const yearIndex = year - startYear;
    years.push(year);

    // Clear current outputs for this year
    currentOutputs = {};

    // Step each module in sorted order
    for (const mod of sortedModules) {
      // Build inputs for this module
      const inputs: Record<string, any> = {};

      for (const input of mod.inputs) {
        const inputName = input as string;

        // Check transforms first
        if (transforms[inputName]) {
          const config = normalizeTransform(transforms[inputName]);
          inputs[inputName] = config.fn(currentOutputs, year, yearIndex);
          continue;
        }

        // Check lags
        if (lags[inputName]) {
          const history = lagHistory.get(inputName)!;
          inputs[inputName] = history[0]; // Oldest value
          continue;
        }

        // Get from current outputs
        if (currentOutputs[inputName] !== undefined) {
          inputs[inputName] = currentOutputs[inputName];
        } else {
          throw new Error(
            `Input '${inputName}' for module '${mod.name}' not available. ` +
            `This shouldn't happen if topological sort is correct.`
          );
        }
      }

      // Run module step
      const state = stateMap.get(mod.name)!;
      const modParams = paramsMap.get(mod.name)!;
      const result = mod.step(state, inputs, modParams, year, yearIndex);

      // Update state
      stateMap.set(mod.name, result.state);
      states[mod.name].push(result.state);

      // Store outputs
      for (const output of mod.outputs) {
        const outputName = output as string;
        const value = result.outputs[outputName];
        outputs[mod.name][outputName].push(value);
        currentOutputs[outputName] = value;
      }
    }

    // Update lag histories
    for (const [inputName, lagConfig] of Object.entries(lags)) {
      const history = lagHistory.get(inputName)!;
      // Shift: remove oldest, add newest
      history.shift();

      // Check outputs first, then transforms for the source value
      let sourceValue = currentOutputs[lagConfig.source];
      if (sourceValue === undefined && transforms[lagConfig.source]) {
        // Source is a transform, compute it
        const config = normalizeTransform(transforms[lagConfig.source]);
        sourceValue = config.fn(currentOutputs, year, yearIndex);
      }
      if (sourceValue === undefined) {
        throw new Error(
          `Lag source '${lagConfig.source}' for input '${inputName}' not found in outputs or transforms.`
        );
      }
      history.push(sourceValue);
    }
  }

  return { years, outputs, states };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get a flat record of all outputs for a given year
 */
export function getOutputsAtYear(
  result: AutowireResult,
  yearIndex: number
): Record<string, any> {
  const flat: Record<string, any> = {};

  for (const [moduleName, moduleOutputs] of Object.entries(result.outputs)) {
    for (const [outputName, values] of Object.entries(moduleOutputs)) {
      flat[outputName] = values[yearIndex];
      // Also provide namespaced version
      flat[`${moduleName}.${outputName}`] = values[yearIndex];
    }
  }

  return flat;
}

/**
 * Get time series for a specific output
 */
export function getTimeSeries(
  result: AutowireResult,
  moduleName: string,
  outputName: string
): any[] {
  return result.outputs[moduleName]?.[outputName] ?? [];
}
