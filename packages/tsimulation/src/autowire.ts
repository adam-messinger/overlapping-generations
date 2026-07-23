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

import { Module, ConnectorDeclaration, ConnectorSpec, ConnectorType } from './module.js';
import { Year, YearIndex } from './types.js';
import { validatedMerge } from './validated-merge.js';
import type { PortMeta } from './units.js';
import { assertPortValue, countPortSchema, validatePortMeta, validatePortUnits } from './units.js';
import { trackObjectReads, unreadOverridePaths } from './liveness.js';
import { findNonFiniteValues } from './validation.js';

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
  /** Complete unit/shape signature for every output the function may read. */
  inputTypes: Record<string, ConnectorSpec>;
  /** Unit/shape signature of the value returned by the transform. */
  outputType: ConnectorSpec;
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
    return {
      fn: entry,
      dependsOn: [],
      inputTypes: {},
      outputType: undefined as unknown as ConnectorSpec,
    }; // Runtime backwards compatibility; strict validation rejects this form.
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
  /** The lag preserves this unit and shape from source through initial/history to consumer. */
  contract: ConnectorSpec;
  /**
   * When true and the run uses bootstrapLags > 0, this lag's initial is
   * replaced by the value its source actually produces in a warm-up pass of
   * year 0 — a fixed-point (steady-state) initialization. Use for FLOW
   * quantities (prices, rates, per-year energy) whose "previous year" value
   * should be consistent with the anchor year itself. Leave false for STOCK
   * quantities (capital, temperature) whose initial is a calibrated
   * end-of-previous-year level: bootstrapping those would inject a
   * one-year-forward bias. Note: honored only by the runAutowired
   * convenience wrapper (which owns the warm-up loop); callers driving
   * initAutowired/stepAutowired directly must run their own warm-up.
   */
  bootstrap?: boolean;
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

  /** First step index (e.g. a start year, or 0 for a generic horizon) */
  startYear: number;

  /** Last step index, inclusive */
  endYear: number;

  /** Enable dev-mode transform read tracking via Proxy (default: false) */
  trackReads?: boolean;

  /** Runtime connector contract policy (default: error). */
  connectorValidation?: 'off' | 'warn' | 'error';

  /** Report or reject scenario parameters that are never read during a full run. */
  paramLiveness?: 'off' | 'report' | 'warn' | 'error';

  /**
   * Parameter paths consumed by composition code or transform closures rather
   * than by a module's proxied init/step functions.
   */
  externalParamReads?: Record<string, readonly string[]>;

  /**
   * Fixed-point warm-up iterations for lags marked bootstrap: true.
   * Each iteration runs year 0 once and replaces those lags' initials with
   * the values their sources actually produced, so the anchor year sees
   * self-consistent "previous year" flows instead of hand-guessed constants
   * (which otherwise produce a spurious step change in year 1). Default 0
   * (off). 2 is enough in practice — convergence is geometric.
   */
  bootstrapLags?: number | BootstrapOptions;
}

/** Convergence-controlled initialization for lags marked `bootstrap`. */
export interface BootstrapOptions {
  /** Maximum warm-up passes. */
  maxIterations?: number;
  /** Minimum passes before convergence may be accepted. */
  minIterations?: number;
  /** Maximum absolute difference allowed across bootstrapped values. */
  tolerance?: number;
  /** Fixed-point damping in (0, 1]; 1 uses the newest value directly. */
  damping?: number;
  /** Behavior when maxIterations is reached before tolerance. */
  onNonConvergence?: 'throw' | 'warn' | 'ignore';
}

export interface BootstrapDiagnostics {
  enabled: boolean;
  converged: boolean;
  iterations: number;
  maxIterations: number;
  residual: number;
  tolerance?: number;
  lagNames: string[];
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
  const moduleNames = new Set<string>();

  for (const mod of modules) {
    if (moduleNames.has(mod.name)) {
      throw new Error(`Duplicate module name: '${mod.name}'`);
    }
    moduleNames.add(mod.name);
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

  // Work on a private copy of each node's dependency set. `new Map(graph)` would
  // be a shallow copy that shares the DepNode Sets, so mutating them below would
  // corrupt the caller's graph — this function is exported and must be safe to
  // call more than once on the same graph. `providesTo` is only read.
  const pending = new Map<string, Set<string>>();
  for (const [name, node] of graph) {
    pending.set(name, new Set(node.dependsOn));
  }

  // Find nodes with no dependencies
  const ready: string[] = [];
  for (const [name, deps] of pending) {
    if (deps.size === 0) {
      ready.push(name);
    }
  }

  while (ready.length > 0) {
    const name = ready.shift()!;
    const node = graph.get(name)!;
    sorted.push(node.module);
    pending.delete(name);

    // Remove this node from the pending dependencies of others
    for (const dependent of node.providesTo) {
      const deps = pending.get(dependent);
      if (deps) {
        deps.delete(name);
        if (deps.size === 0) {
          ready.push(dependent);
        }
      }
    }
  }

  // Check for cycles
  if (pending.size > 0) {
    const cycleNodes = Array.from(pending.keys()).join(', ');
    throw new Error(
      `Dependency cycle detected involving: ${cycleNodes}. ` +
      `Use 'lags' configuration to break the cycle.`
    );
  }

  return sorted;
}

// =============================================================================
// CONNECTOR TYPE VALIDATION
// =============================================================================

/** Convert a module connector declaration to the framework's common port schema. */
export function connectorSpecToPortMeta(spec: ConnectorSpec): PortMeta {
  if ('kind' in spec && spec.kind) return spec as PortMeta;
  if ('opaque' in spec && spec.opaque) {
    return { opaque: true, description: spec.description, valueType: spec.type };
  }
  return {
    unit: spec.unit,
    valueType: spec.type,
    ...(spec.description ? { description: spec.description } : {}),
  };
}

/** Validate complete shape/unit contracts for modules, transforms, and lags. */
export function validateConnectorTypes(
  modules: AnyModule[],
  _outputRegistry: Map<string, string>,
  transforms: Record<string, TransformEntry> = {},
  lags: Record<string, LagConfig> = {}
): string[] {
  const warnings: string[] = [];

  const normalize = (
    declaration: ConnectorDeclaration | undefined,
    context: string,
  ): ConnectorSpec | undefined => {
    if (!declaration) {
      warnings.push(`Missing connector contract: ${context}`);
      return undefined;
    }
    if (typeof declaration === 'string') {
      warnings.push(`Incomplete connector contract: ${context} declares type '${declaration}' but no unit or opaque marker`);
      return undefined;
    }
    try {
      validatePortMeta(connectorSpecToPortMeta(declaration), context);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
    return declaration;
  };

  const compare = (producer: ConnectorSpec, consumer: ConnectorSpec, context: string): void => {
    if (producer.type !== consumer.type) {
      warnings.push(`Type mismatch: ${context} provides '${producer.type}' but consumer expects '${consumer.type}'`);
    }
    try {
      validatePortUnits(
        connectorSpecToPortMeta(producer),
        connectorSpecToPortMeta(consumer),
        context,
      );
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  };

  const outputTypes = new Map<string, { module: string; spec: ConnectorSpec }>();
  for (const mod of modules) {
    const inputNames = new Set(mod.inputs.map(String));
    const outputNames = new Set(mod.outputs.map(String));
    const inputContracts = mod.connectorTypes?.inputs as Record<string, ConnectorDeclaration> | undefined;
    const outputContracts = mod.connectorTypes?.outputs as Record<string, ConnectorDeclaration> | undefined;
    for (const inputName of inputNames) normalize(inputContracts?.[inputName], `${mod.name}.${inputName}`);
    for (const outputName of outputNames) {
      const spec = normalize(outputContracts?.[outputName], `${mod.name}.${outputName}`);
      if (spec) outputTypes.set(outputName, { module: mod.name, spec });
    }
    for (const name of Object.keys(inputContracts ?? {})) {
      if (!inputNames.has(name)) warnings.push(`Extraneous input connector contract: ${mod.name}.${name}`);
    }
    for (const name of Object.keys(outputContracts ?? {})) {
      if (!outputNames.has(name)) warnings.push(`Extraneous output connector contract: ${mod.name}.${name}`);
    }
  }

  const transformOutputs = new Map<string, ConnectorSpec>();
  for (const [name, entry] of Object.entries(transforms)) {
    if (typeof entry === 'function') {
      warnings.push(`Transform '${name}' uses the legacy bare-function form and has no unit signature`);
      continue;
    }
    const outputType = normalize(entry.outputType, `transform ${name} output`);
    if (outputType) transformOutputs.set(name, outputType);
    const declaredReads = new Set(Object.keys(entry.inputTypes ?? {}));
    for (const dependency of entry.dependsOn) {
      if (!declaredReads.has(dependency)) {
        warnings.push(`Transform '${name}' dependency '${dependency}' has no input unit signature`);
      }
    }
    for (const [read, declaration] of Object.entries(entry.inputTypes ?? {})) {
      const expected = normalize(declaration, `transform ${name} input ${read}`);
      const provider = outputTypes.get(read);
      if (!provider) {
        warnings.push(`Transform '${name}' input signature references unknown module output '${read}'`);
      } else if (expected) {
        compare(provider.spec, expected, `${provider.module}.${read} -> transform ${name}.${read}`);
      }
    }
  }

  for (const mod of modules) {
    for (const input of mod.inputs) {
      const inputName = String(input);
      const expected = normalize(
        (mod.connectorTypes?.inputs as Record<string, ConnectorDeclaration> | undefined)?.[inputName],
        `${mod.name}.${inputName}`,
      );
      if (!expected) continue;
      const transform = transforms[inputName];
      if (transform) {
        if (typeof transform !== 'function') {
          const provided = transformOutputs.get(inputName);
          if (provided) compare(provided, expected, `transform ${inputName} -> ${mod.name}.${inputName}`);
        }
        continue;
      }
      const lag = lags[inputName];
      if (lag) {
        const lagContract = normalize(lag.contract, `lag ${inputName}`);
        const provider = outputTypes.get(lag.source) ?? (
          transformOutputs.has(lag.source)
            ? { module: 'transform', spec: transformOutputs.get(lag.source)! }
            : undefined
        );
        if (!provider) {
          warnings.push(`Lag '${inputName}' source '${lag.source}' has no connector contract`);
        } else if (lagContract) {
          compare(provider.spec, lagContract, `${provider.module}.${lag.source} -> lag ${inputName}`);
          compare(lagContract, expected, `lag ${inputName} -> ${mod.name}.${inputName}`);
          try {
            assertConnectorValue(lag.initial, lagContract, `Lag '${inputName}' initial`);
          } catch (error) {
            warnings.push(error instanceof Error ? error.message : String(error));
          }
        }
        continue;
      }
      const provider = outputTypes.get(inputName);
      if (provider) compare(provider.spec, expected, `${provider.module}.${inputName} -> ${mod.name}.${inputName}`);
      else warnings.push(`Input connector ${mod.name}.${inputName} has no contracted provider, transform, or lag`);
    }
  }

  return [...new Set(warnings)];
}

function assertConnectorValue(value: unknown, spec: ConnectorSpec, context: string): void {
  assertPortValue(value, connectorSpecToPortMeta(spec), context);
}

export interface ConnectorContractAudit {
  valid: boolean;
  errors: string[];
  unitBearingContracts: number;
  metadataContracts: number;
  opaqueContracts: number;
  structuredContracts: number;
}

/** CI-friendly completeness audit for an entire composed simulation graph. */
export function auditConnectorContracts(
  modules: AnyModule[],
  transforms: Record<string, TransformEntry> = {},
  lags: Record<string, LagConfig> = {},
): ConnectorContractAudit {
  const outputRegistry = buildOutputRegistry(modules);
  const declarations: ConnectorDeclaration[] = [];
  for (const mod of modules) {
    declarations.push(...Object.values(mod.connectorTypes?.inputs ?? {}));
    declarations.push(...Object.values(mod.connectorTypes?.outputs ?? {}));
  }
  for (const transform of Object.values(transforms)) {
    if (typeof transform === 'function') continue;
    declarations.push(...Object.values(transform.inputTypes ?? {}), transform.outputType);
  }
  for (const lag of Object.values(lags)) if (lag.contract) declarations.push(lag.contract);
  const counts = declarations.reduce(
    (total, declaration) => {
      if (typeof declaration === 'string' || !declaration) return total;
      try {
        const meta = connectorSpecToPortMeta(declaration);
        validatePortMeta(meta, 'connector contract audit');
        const count = countPortSchema(meta);
        total.unitBearingContracts += count.unitBearing;
        total.metadataContracts += count.metadata;
        total.opaqueContracts += count.opaque;
        total.structuredContracts += count.structured;
      } catch {
        // validateConnectorTypes below records the contextual error. Keep the
        // audit report usable even when a JavaScript caller supplied malformed metadata.
      }
      return total;
    },
    {
      unitBearingContracts: 0,
      metadataContracts: 0,
      opaqueContracts: 0,
      structuredContracts: 0,
    },
  );
  const errors = validateConnectorTypes(modules, outputRegistry, transforms, lags);
  return { valid: errors.length === 0, errors, ...counts };
}

export function assertConnectorContracts(
  modules: AnyModule[],
  transforms: Record<string, TransformEntry> = {},
  lags: Record<string, LagConfig> = {},
): ConnectorContractAudit {
  const audit = auditConnectorContracts(modules, transforms, lags);
  if (!audit.valid) throw new Error(`Connector contract errors:\n${audit.errors.join('\n')}`);
  return audit;
}

// =============================================================================
// WIRING VALIDATION
// =============================================================================

/**
 * Validate all wiring at composition time.
 * Catches transform/output name collisions, typos in dependsOn, missing or
 * invalid lag sources/delays, transform chaining, and modules that directly
 * consume cycle-breaker transforms.
 */
export function validateWiring(
  modules: AnyModule[],
  outputRegistry: Map<string, string>,
  transforms: Record<string, TransformEntry>,
  lags: Record<string, LagConfig>
): void {
  const errors: string[] = [];

  // Ignore transform keys whose value is undefined (e.g. built via a
  // conditional spread) — otherwise they'd count as available outputs while
  // never producing a value, and crash normalizeTransform below
  const definedTransforms = Object.fromEntries(
    Object.entries(transforms).filter(([, entry]) => entry !== undefined)
  );

  for (const name of Object.keys(definedTransforms)) {
    if (lags[name]) {
      errors.push(
        `Input '${name}' is configured as both a transform and a lag. ` +
        `Choose exactly one resolution strategy.`
      );
    }
  }

  // A transform must not reuse a module output's name. If it did, a module
  // consuming that name would silently receive the transform's value (module
  // inputs resolve transforms before outputs) while dependsOn/lag sources
  // resolve to the module output — the two paths disagree. Identity
  // pass-throughs are simply redundant: a same-named input already resolves to
  // the output natively.
  for (const name of Object.keys(definedTransforms)) {
    const provider = outputRegistry.get(name);
    if (provider) {
      errors.push(
        `Transform '${name}' collides with output '${name}' provided by module '${provider}'. ` +
        `Rename the transform, or drop it if it only passes the output through.`
      );
      // Drop it so the passes below reason over a clean transform set (a name
      // here is now guaranteed to be a pure transform, not a shadowed output).
      delete definedTransforms[name];
    }
  }

  // All available output names (module outputs + transform names)
  const allOutputs = new Set([...outputRegistry.keys(), ...Object.keys(definedTransforms)]);

  // Check transform dependsOn items exist and are module outputs.
  // Transform→transform dependencies are rejected: the engine creates no
  // ordering edge for them (buildDependencyGraph resolves deps through the
  // output registry only) and transform values are never written to
  // currentOutputs, so a chained transform would silently read undefined.
  // (Colliding transform names were dropped above, so a dep still found in
  // definedTransforms is necessarily a pure transform name.)
  for (const [name, entry] of Object.entries(definedTransforms)) {
    const config = normalizeTransform(entry);
    for (const dep of config.dependsOn) {
      if (!allOutputs.has(dep)) {
        errors.push(`Transform '${name}' depends on '${dep}' which doesn't exist`);
      } else if (definedTransforms[dep] !== undefined) {
        errors.push(
          `Transform '${name}' depends on transform '${dep}'. ` +
          `Transform chaining is not supported — depend on module outputs instead.`
        );
      }
    }
  }

  // A module cannot consume one of its own current-step outputs, either
  // directly or through a transform evaluated before the module step. Such a
  // dependency must be represented as state or an explicit lag.
  for (const mod of modules) {
    for (const input of mod.inputs) {
      const inputName = input as string;
      if (lags[inputName]) continue;
      if (definedTransforms[inputName]) {
        const config = normalizeTransform(definedTransforms[inputName]);
        for (const dep of config.dependsOn) {
          if (outputRegistry.get(dep) === mod.name) {
            errors.push(
              `Module '${mod.name}' transform input '${inputName}' depends on its own ` +
              `current-step output '${dep}'. Use module state or a lag.`
            );
          }
        }
      } else if (outputRegistry.get(inputName) === mod.name) {
        errors.push(
          `Module '${mod.name}' directly consumes its own current-step output ` +
          `'${inputName}'. Use module state or a lag.`
        );
      }
    }
  }

  // Check lag sources exist and delays are valid
  for (const [name, lag] of Object.entries(lags)) {
    if (!allOutputs.has(lag.source)) {
      errors.push(`Lag '${name}' reads source '${lag.source}' which doesn't exist`);
    }
    if (!Number.isInteger(lag.delay) || lag.delay < 1) {
      errors.push(`Lag '${name}' has delay ${lag.delay}: delay must be an integer >= 1`);
    }
  }

  // Cycle-breaker lint: if a transform has dependsOn: [] AND is used as a lag
  // source (proving it carries feedback data), no module should consume it
  // directly — use a lag instead. Transforms with dependsOn: [] that are NOT
  // lag sources are parameter injections (e.g., carbonPrice) and are fine.
  const noDepsTransforms = new Set<string>();
  for (const [name, entry] of Object.entries(definedTransforms)) {
    const config = normalizeTransform(entry);
    if (config.dependsOn.length === 0) noDepsTransforms.add(name);
  }
  // A cycle-breaker is a dependsOn:[] transform that's also a lag source
  const lagSources = new Set(Object.values(lags).map(l => l.source));
  const cycleBreakers = new Set(
    [...noDepsTransforms].filter(name => lagSources.has(name))
  );
  for (const mod of modules) {
    for (const input of mod.inputs) {
      const inputName = input as string;
      // Skip inputs resolved by lags (that's the correct pattern)
      if (lags[inputName]) continue;
      // Check if input is resolved by a cycle-breaker transform
      if (cycleBreakers.has(inputName)) {
        errors.push(
          `Module '${mod.name}' directly consumes cycle-breaker transform '${inputName}'. ` +
          `Use a lag instead to get real values.`
        );
      }
    }
  }

  if (errors.length > 0) throw new Error(`Wiring errors:\n${errors.join('\n')}`);
}

// =============================================================================
// OUTPUT GUARDS
// =============================================================================

/**
 * Verify output completeness and check for NaN/Infinity after each module step.
 */
function validateOutputs(
  mod: AnyModule,
  outputs: Record<string, any>,
  year: number
): void {
  for (const output of mod.outputs) {
    const key = output as string;
    const val = outputs[key];
    if (val === undefined) {
      throw new Error(
        `Module '${mod.name}' declares output '${key}' but step() didn't return it`
      );
    }
    const invalid = findNonFiniteValues(val, key);
    if (invalid.length > 0) {
      const first = invalid[0];
      throw new Error(`Module '${mod.name}' output '${first.path}' is ${first.value} at year ${year}`);
    }
  }
}

// =============================================================================
// TRANSFORM HELPERS
// =============================================================================

/**
 * Fail-fast: output MUST exist. Throws on broken wiring instead of masking with a fallback.
 * Use for normal (non-cycle-breaker) transforms where the dependency is declared.
 */
export function requireOutput<T>(outputs: Record<string, any>, key: string, context: string): T {
  const val = outputs[key];
  if (val === undefined) throw new Error(`${context}: required output '${key}' not available`);
  return val as T;
}

/**
 * Year-0 fallback: OK to use default on year 0 before upstream modules run, throws after.
 * Use for cycle-breaker transforms where the value legitimately doesn't exist on the first step.
 */
export function yearZeroFallback<T>(
  outputs: Record<string, any>,
  key: string,
  initial: T,
  yearIndex: number,
  context: string
): T {
  const val = outputs[key];
  if (val !== undefined) return val as T;
  if (yearIndex === 0) return initial;
  throw new Error(`${context}: '${key}' missing at year index ${yearIndex} (only year 0 fallback allowed)`);
}

/**
 * Intentional optional: output may legitimately not exist (e.g., pre-activation CDR).
 * The fallback value is always used when the output is absent — this is not a bug.
 */
export function optionalOutput<T>(
  outputs: Record<string, any>,
  key: string,
  fallback: T
): T {
  const val = outputs[key];
  return val !== undefined ? val as T : fallback;
}

// =============================================================================
// TRANSFORM READ TRACKING
// =============================================================================

/**
 * Create a Proxy that records which keys are read from outputs.
 * Used in dev mode to detect undeclared transform dependencies.
 */
function trackingProxy(outputs: Record<string, any>): { proxy: Record<string, any>; reads: Set<string> } {
  const reads = new Set<string>();
  const proxy = new Proxy(outputs, {
    get(target, prop) {
      if (typeof prop === 'string') reads.add(prop);
      return target[prop as string];
    },
  });
  return { proxy, reads };
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
  /**
   * Producer contracts carried with normal engine results so downstream
   * collectors can validate source paths and transformed outputs automatically.
   * Optional for compatibility with externally constructed result fixtures.
   */
  outputContracts?: Record<string, { module: string; spec: ConnectorSpec }>;
  diagnostics?: {
    bootstrap?: BootstrapDiagnostics;
    parameterLiveness?: Record<string, {
      overridePaths: string[];
      readPaths: string[];
      unreadOverridePaths: string[];
      completeRun: boolean;
    }>;
  };
}

/**
 * Mutable state for step-by-step simulation
 */
export interface AutowireState {
  sortedModules: AnyModule[];
  transforms: Record<string, TransformEntry>;
  lags: Record<string, LagConfig>;
  stateMap: Map<string, any>;
  paramsMap: Map<string, any>;
  lagHistory: Map<string, any[]>;
  years: number[];
  outputs: Record<string, Record<string, any[]>>;
  states: Record<string, any[]>;
  currentOutputs: Record<string, any>;
  startYear: number;
  endYear: number;
  currentYear: number;
  trackReads: boolean;
  connectorValidation: NonNullable<AutowireConfig['connectorValidation']>;
  diagnostics?: AutowireResult['diagnostics'];
  paramReads: Map<string, Set<string>>;
  paramOverrides: Map<string, unknown>;
  paramLiveness: NonNullable<AutowireConfig['paramLiveness']>;
}

/**
 * Initialize an auto-wired simulation (builds graph, inits states).
 * Returns mutable state for step-by-step execution.
 */
export function initAutowired(config: AutowireConfig): AutowireState {
  const {
    modules,
    transforms = {},
    lags = {},
    params = {},
    startYear,
    endYear,
    trackReads = false,
    connectorValidation = 'error',
    paramLiveness = 'off',
    externalParamReads = {},
  } = config;

  if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
    throw new Error('startYear and endYear must be integers');
  }
  if (endYear < startYear) {
    throw new Error(`endYear (${endYear}) must be >= startYear (${startYear})`);
  }

  // Build registry and graph
  const outputRegistry = buildOutputRegistry(modules);

  // Unit contracts are strict by default; callers must explicitly opt out.
  const connectorWarnings = connectorValidation === 'off'
    ? []
    : validateConnectorTypes(modules, outputRegistry, transforms, lags);
  if (connectorWarnings.length > 0 && connectorValidation === 'error') {
    throw new Error(`Connector contract errors:\n${connectorWarnings.join('\n')}`);
  }
  if (connectorValidation === 'warn') {
    for (const warning of connectorWarnings) console.warn(`[autowire] ${warning}`);
  }

  // Validate wiring: catch typos, missing sources, orphaned outputs
  validateWiring(modules, outputRegistry, transforms, lags);

  const graph = buildDependencyGraph(modules, outputRegistry, transforms, lags);
  const sortedModules = topologicalSort(graph);

  // Initialize module states and params
  const stateMap = new Map<string, any>();
  const paramsMap = new Map<string, any>();
  const paramReads = new Map<string, Set<string>>();
  const paramOverrides = new Map<string, unknown>();

  for (const mod of sortedModules) {
    // Merge + validate at load time: throws on invalid params, warns on
    // warnings. This is what makes each Module's required validate() actually
    // run — the engine's contract, not something consumers must wire by hand.
    const mergedParams = validatedMerge(
      mod.name,
      (p) => mod.validate(p),
      (p) => mod.mergeParams(p),
      params[mod.name] ?? {}
    );
    const partial = params[mod.name] ?? {};
    paramOverrides.set(mod.name, partial);
    if (paramLiveness !== 'off') {
      const tracked = trackObjectReads(mergedParams as object);
      paramsMap.set(mod.name, tracked.proxy);
      for (const path of externalParamReads[mod.name] ?? []) tracked.reads.add(path);
      paramReads.set(mod.name, tracked.reads);
      stateMap.set(mod.name, mod.init(tracked.proxy));
    } else {
      paramsMap.set(mod.name, mergedParams);
      paramReads.set(mod.name, new Set());
      stateMap.set(mod.name, mod.init(mergedParams));
    }
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
  const outputs: Record<string, Record<string, any[]>> = {};
  const states: Record<string, any[]> = {};

  for (const mod of sortedModules) {
    outputs[mod.name] = {};
    for (const output of mod.outputs) {
      outputs[mod.name][output as string] = [];
    }
    states[mod.name] = [];
  }

  return {
    sortedModules,
    transforms,
    lags,
    stateMap,
    paramsMap,
    lagHistory,
    years: [],
    outputs,
    states,
    currentOutputs: {},
    startYear,
    endYear,
    currentYear: startYear,
    trackReads,
    connectorValidation,
    paramReads,
    paramOverrides,
    paramLiveness,
  };
}

/**
 * Advance the simulation by one year.
 * Returns the year that was stepped and a flat record of all outputs.
 */
export function stepAutowired(state: AutowireState): { year: number; outputs: Record<string, any>; done: boolean } {
  const year = state.currentYear;
  const yearIndex = year - state.startYear;

  if (year > state.endYear) {
    return { year: year - 1, outputs: state.currentOutputs, done: true };
  }

  state.years.push(year);

  // Clear current outputs for this year
  state.currentOutputs = {};

  // Step each module in sorted order
  for (const mod of state.sortedModules) {
    const inputs: Record<string, any> = {};

    for (const input of mod.inputs) {
      const inputName = input as string;

      if (state.transforms[inputName]) {
        const config = normalizeTransform(state.transforms[inputName]);
        const checkUnitReads = state.connectorValidation === 'error';
        const checkDependencyReads = state.trackReads && config.dependsOn.length > 0;
        if (checkUnitReads || checkDependencyReads) {
          const { proxy, reads } = trackingProxy(state.currentOutputs);
          inputs[inputName] = config.fn(proxy, year, yearIndex);
          for (const read of reads) {
            if (checkUnitReads && !config.inputTypes[read]) {
              throw new Error(`Transform '${inputName}' reads '${read}' without an input unit signature`);
            }
            if (checkDependencyReads && !config.dependsOn.includes(read)) {
              console.warn(`[autowire] Transform '${inputName}' reads '${read}' but doesn't declare it in dependsOn`);
            }
          }
        } else {
          inputs[inputName] = config.fn(state.currentOutputs, year, yearIndex);
        }
        continue;
      }

      if (state.lags[inputName]) {
        const history = state.lagHistory.get(inputName)!;
        inputs[inputName] = history[0];
        continue;
      }

      if (state.currentOutputs[inputName] !== undefined) {
        inputs[inputName] = state.currentOutputs[inputName];
      } else {
        throw new Error(
          `Input '${inputName}' for module '${mod.name}' not available. ` +
          `This shouldn't happen if topological sort is correct.`
        );
      }
    }

    if (state.connectorValidation !== 'off') {
      const contracts = mod.connectorTypes?.inputs as Record<string, ConnectorSpec> | undefined;
      for (const input of mod.inputs) {
        const inputName = String(input);
        if (contracts?.[inputName]) {
          assertConnectorValue(inputs[inputName], contracts[inputName], `Module '${mod.name}' input '${inputName}' at year ${year}`);
        }
      }
    }

    const modState = state.stateMap.get(mod.name)!;
    const modParams = state.paramsMap.get(mod.name)!;
    const result = mod.step(modState, inputs, modParams, year, yearIndex);

    // Verify completeness + NaN guard
    validateOutputs(mod, result.outputs as Record<string, any>, year);
    if (state.connectorValidation !== 'off') {
      const contracts = mod.connectorTypes?.outputs as Record<string, ConnectorSpec> | undefined;
      for (const output of mod.outputs) {
        const outputName = String(output);
        if (contracts?.[outputName]) {
          assertConnectorValue(
            (result.outputs as Record<string, unknown>)[outputName],
            contracts[outputName],
            `Module '${mod.name}' output '${outputName}' at year ${year}`,
          );
        }
      }
    }

    state.stateMap.set(mod.name, result.state);
    state.states[mod.name].push(result.state);

    for (const output of mod.outputs) {
      const outputName = output as string;
      const value = result.outputs[outputName];
      state.outputs[mod.name][outputName].push(value);
      state.currentOutputs[outputName] = value;
    }
  }

  // Update lag histories
  for (const [inputName, lagConfig] of Object.entries(state.lags)) {
    const history = state.lagHistory.get(inputName)!;
    history.shift();

    let sourceValue = state.currentOutputs[lagConfig.source];
    if (sourceValue === undefined && state.transforms[lagConfig.source]) {
      const config = normalizeTransform(state.transforms[lagConfig.source]);
      if (state.connectorValidation === 'error') {
        const { proxy, reads } = trackingProxy(state.currentOutputs);
        sourceValue = config.fn(proxy, year, yearIndex);
        for (const read of reads) {
          if (!config.inputTypes[read]) {
            throw new Error(`Transform '${lagConfig.source}' reads '${read}' without an input unit signature`);
          }
        }
      } else {
        sourceValue = config.fn(state.currentOutputs, year, yearIndex);
      }
    }
    if (sourceValue === undefined) {
      throw new Error(
        `Lag source '${lagConfig.source}' for input '${inputName}' not found in outputs or transforms.`
      );
    }
    history.push(sourceValue);
  }

  state.currentYear = year + 1;
  const done = state.currentYear > state.endYear;

  return { year, outputs: state.currentOutputs, done };
}

/**
 * Collect accumulated results from a completed (or in-progress) simulation.
 */
export function finalizeAutowired(state: AutowireState): AutowireResult {
  const completeRun = state.currentYear > state.endYear;
  const outputContractEntries = state.sortedModules.flatMap((mod) =>
    mod.outputs.flatMap((output) => {
      const name = String(output);
      const spec = (mod.connectorTypes?.outputs as Record<string, ConnectorSpec> | undefined)?.[name];
      return spec ? [[name, { module: mod.name, spec }] as const] : [];
    }),
  );
  const expectedOutputContracts = state.sortedModules.reduce(
    (sum, mod) => sum + mod.outputs.length,
    0,
  );
  let parameterLiveness: NonNullable<AutowireResult['diagnostics']>['parameterLiveness'];
  if (state.paramLiveness !== 'off') {
    parameterLiveness = {};
    const messages: string[] = [];
    for (const mod of state.sortedModules) {
      const reads = state.paramReads.get(mod.name) ?? new Set<string>();
      const overrides = state.paramOverrides.get(mod.name) ?? {};
      const unread = completeRun ? unreadOverridePaths(overrides, reads) : [];
      parameterLiveness[mod.name] = {
        overridePaths: unreadOverridePaths(overrides, new Set()).sort(),
        readPaths: [...reads].sort(),
        unreadOverridePaths: unread.sort(),
        completeRun,
      };
      if (unread.length > 0) messages.push(`${mod.name}: ${unread.join(', ')}`);
    }
    if (messages.length > 0 && state.paramLiveness === 'error') {
      throw new Error(`Unread parameter overrides:\n${messages.join('\n')}`);
    }
    if (messages.length > 0 && state.paramLiveness === 'warn') {
      for (const message of messages) console.warn(`[autowire] Unread parameter overrides: ${message}`);
    }
  }
  return {
    years: state.years,
    outputs: state.outputs,
    states: state.states,
    ...(outputContractEntries.length === expectedOutputContracts
      ? { outputContracts: Object.fromEntries(outputContractEntries) }
      : {}),
    ...((state.diagnostics || parameterLiveness) ? {
      diagnostics: {
        ...(state.diagnostics ?? {}),
        ...(parameterLiveness ? { parameterLiveness } : {}),
      },
    } : {}),
  };
}

function maxAbsoluteDifference(a: unknown, b: unknown, seen = new WeakSet<object>()): number {
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.POSITIVE_INFINITY;
    return Math.abs(a - b);
  }
  if (Object.is(a, b)) return 0;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return Number.POSITIVE_INFINITY;
  }
  if (seen.has(a)) return 0;
  seen.add(a);
  const aArray = Array.isArray(a);
  const bArray = Array.isArray(b);
  if (aArray !== bArray) return Number.POSITIVE_INFINITY;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length || aKeys.some((key) => !Object.hasOwn(b, key))) {
    return Number.POSITIVE_INFINITY;
  }
  let maximum = 0;
  for (const key of aKeys) {
    maximum = Math.max(
      maximum,
      maxAbsoluteDifference(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        seen,
      ),
    );
  }
  return maximum;
}

function dampValue(previous: unknown, candidate: unknown, damping: number): unknown {
  if (damping === 1) return candidate;
  if (typeof previous === 'number' && typeof candidate === 'number') {
    return previous + damping * (candidate - previous);
  }
  if (
    typeof previous === 'object' && previous !== null &&
    typeof candidate === 'object' && candidate !== null &&
    Array.isArray(previous) === Array.isArray(candidate)
  ) {
    if (Array.isArray(previous) && Array.isArray(candidate)) {
      return candidate.map((value, index) => dampValue(previous[index], value, damping));
    }
    return Object.fromEntries(
      Object.entries(candidate).map(([key, value]) => [
        key,
        dampValue((previous as Record<string, unknown>)[key], value, damping),
      ]),
    );
  }
  return candidate;
}

/**
 * Resolve bootstrap-marked lag initials before either batch or interactive
 * execution. Numeric `bootstrapLags` retains the pre-0.2 fixed-pass behavior;
 * the object form adds convergence diagnostics and failure policy.
 */
export function prepareAutowiredConfig(config: AutowireConfig): {
  config: AutowireConfig;
  diagnostics: BootstrapDiagnostics;
} {
  const requested = config.bootstrapLags ?? 0;
  const lagNames = Object.entries(config.lags ?? {})
    .filter(([, lag]) => lag.bootstrap)
    .map(([name]) => name);
  const enabled = lagNames.length > 0 && requested !== 0;
  const options: Required<Pick<BootstrapOptions, 'maxIterations' | 'minIterations' | 'damping' | 'onNonConvergence'>> &
    Pick<BootstrapOptions, 'tolerance'> = typeof requested === 'number'
      ? {
          maxIterations: requested,
          minIterations: requested,
          damping: 1,
          onNonConvergence: 'ignore',
          tolerance: undefined,
        }
      : {
          maxIterations: requested.maxIterations ?? 50,
          minIterations: requested.minIterations ?? 1,
          damping: requested.damping ?? 1,
          onNonConvergence: requested.onNonConvergence ?? 'throw',
          tolerance: requested.tolerance ?? 1e-8,
        };

  if (!Number.isInteger(options.maxIterations) || options.maxIterations < 0) {
    throw new Error('bootstrap maxIterations must be an integer >= 0');
  }
  if (!Number.isInteger(options.minIterations) || options.minIterations < 0 ||
      options.minIterations > options.maxIterations) {
    throw new Error('bootstrap minIterations must be an integer in [0, maxIterations]');
  }
  if (!(options.damping > 0 && options.damping <= 1)) {
    throw new Error('bootstrap damping must be in (0, 1]');
  }
  if (options.tolerance !== undefined &&
      (!Number.isFinite(options.tolerance) || options.tolerance < 0)) {
    throw new Error('bootstrap tolerance must be finite and >= 0');
  }

  if (!enabled || options.maxIterations === 0) {
    return {
      config,
      diagnostics: {
        enabled: false,
        converged: true,
        iterations: 0,
        maxIterations: options.maxIterations,
        residual: 0,
        tolerance: options.tolerance,
        lagNames,
      },
    };
  }

  let cfg = config;
  let residual = Number.POSITIVE_INFINITY;
  let converged = options.tolerance === undefined;
  let iterations = 0;

  for (iterations = 1; iterations <= options.maxIterations; iterations++) {
    const warm = initAutowired({ ...cfg, bootstrapLags: 0 });
    stepAutowired(warm);
    const newLags: Record<string, LagConfig> = {};
    residual = 0;
    for (const [name, lag] of Object.entries(cfg.lags ?? {})) {
      if (lag.bootstrap) {
        const history = warm.lagHistory.get(name)!;
        const candidate = history[history.length - 1];
        residual = Math.max(residual, maxAbsoluteDifference(lag.initial, candidate));
        newLags[name] = {
          ...lag,
          initial: dampValue(lag.initial, candidate, options.damping),
        };
      } else {
        newLags[name] = lag;
      }
    }
    cfg = { ...cfg, lags: newLags };
    if (
      options.tolerance !== undefined &&
      iterations >= options.minIterations &&
      residual <= options.tolerance
    ) {
      converged = true;
      break;
    }
  }

  const diagnostics: BootstrapDiagnostics = {
    enabled: true,
    converged,
    iterations: Math.min(iterations, options.maxIterations),
    maxIterations: options.maxIterations,
    residual,
    tolerance: options.tolerance,
    lagNames,
  };
  if (!converged) {
    const message =
      `Lag bootstrap did not converge after ${options.maxIterations} iterations ` +
      `(residual ${residual}, tolerance ${options.tolerance})`;
    if (options.onNonConvergence === 'throw') throw new Error(message);
    if (options.onNonConvergence === 'warn') console.warn(`[autowire] ${message}`);
  }
  return { config: cfg, diagnostics };
}

/** Initialize a run with the same lag preparation used by `runAutowired`. */
export function initPreparedAutowired(config: AutowireConfig): AutowireState {
  const prepared = prepareAutowiredConfig(config);
  const state = initAutowired(prepared.config);
  state.diagnostics = { bootstrap: prepared.diagnostics };
  return state;
}

/**
 * Create and run an auto-wired simulation (convenience wrapper).
 */
export function runAutowired(config: AutowireConfig): AutowireResult {
  const state = initPreparedAutowired(config);

  while (state.currentYear <= state.endYear) {
    stepAutowired(state);
  }

  return finalizeAutowired(state);
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
