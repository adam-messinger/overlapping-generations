/**
 * Simulation runner - orchestrates modules with dependency resolution
 *
 * Features:
 * - Automatic dependency graph construction
 * - Cycle detection for feedback loops
 * - Iterative convergence for feedback
 * - Time series collection
 */

import { Module, ModuleOutputs } from './module.js';
import { Year, YearIndex } from './types.js';
import { TimeSeries, TimeSeriesStore } from './timeseries.js';

/**
 * Registered module with runtime type info
 */
interface RegisteredModule {
  module: Module<any, any, any, any>;
  state: any;
  params: any;
}

/**
 * Dependency graph node
 */
interface DepNode {
  name: string;
  provides: Set<string>;
  requires: Set<string>;
}

/**
 * Simulation configuration
 */
export interface SimulationConfig {
  /** Start year (default: 2025) */
  startYear?: Year;
  /** End year (default: 2100) */
  endYear?: Year;
  /** Max iterations for feedback convergence (default: 3) */
  maxIterations?: number;
  /** Convergence threshold (default: 0.001 = 0.1%) */
  convergenceThreshold?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Parameter overrides by module name
 */
export type ParamOverrides = Record<string, Record<string, any>>;

/**
 * Simulation results - time series for each module's outputs
 */
export type SimulationResults = {
  years: Year[];
  modules: Record<string, Record<string, TimeSeries<any>>>;
};

/**
 * Simulation class - the main orchestrator
 */
export class Simulation {
  private modules: Map<string, RegisteredModule> = new Map();
  private outputProviders: Map<string, string> = new Map(); // output key -> module name
  private executionOrder: string[] = [];
  private feedbackCycles: string[][] = [];
  private config: Required<SimulationConfig>;

  constructor(config: SimulationConfig = {}) {
    this.config = {
      startYear: config.startYear ?? 2025,
      endYear: config.endYear ?? 2100,
      maxIterations: config.maxIterations ?? 3,
      convergenceThreshold: config.convergenceThreshold ?? 0.001,
      verbose: config.verbose ?? false,
    };
  }

  /**
   * Register a module with optional parameter overrides
   */
  register<M extends Module<any, any, any, any>>(
    module: M,
    paramOverrides?: Partial<Parameters<M['mergeParams']>[0]>
  ): this {
    const params = module.mergeParams(paramOverrides ?? {});

    // Validate
    const validation = module.validate(params);
    if (!validation.valid) {
      throw new Error(
        `Module ${module.name} validation failed:\n${validation.errors.join('\n')}`
      );
    }
    if (validation.warnings.length > 0 && this.config.verbose) {
      console.warn(`Module ${module.name} warnings:\n${validation.warnings.join('\n')}`);
    }

    // Register output keys
    for (const output of module.outputs) {
      const key = String(output);
      if (this.outputProviders.has(key)) {
        throw new Error(
          `Output "${key}" already provided by module ${this.outputProviders.get(key)}, ` +
          `cannot also be provided by ${module.name}`
        );
      }
      this.outputProviders.set(key, module.name);
    }

    this.modules.set(module.name, {
      module,
      state: null, // Initialized at run time
      params,
    });

    return this;
  }

  /**
   * Build dependency graph and compute execution order
   */
  private buildGraph(): void {
    const nodes: Map<string, DepNode> = new Map();

    // Build nodes
    for (const [name, { module }] of this.modules) {
      nodes.set(name, {
        name,
        provides: new Set(module.outputs.map(String)),
        requires: new Set(module.inputs.map(String)),
      });
    }

    // Validate all inputs can be satisfied
    for (const [name, node] of nodes) {
      for (const req of node.requires) {
        if (!this.outputProviders.has(req)) {
          throw new Error(
            `Module ${name} requires "${req}" but no module provides it`
          );
        }
      }
    }

    // Topological sort with cycle detection
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    const cycles: string[][] = [];

    const visit = (name: string, path: string[] = []): void => {
      if (visited.has(name)) return;

      if (visiting.has(name)) {
        // Found a cycle
        const cycleStart = path.indexOf(name);
        cycles.push(path.slice(cycleStart));
        return;
      }

      visiting.add(name);
      path.push(name);

      const node = nodes.get(name)!;
      for (const req of node.requires) {
        const provider = this.outputProviders.get(req)!;
        if (provider !== name) {
          visit(provider, [...path]);
        }
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of nodes.keys()) {
      visit(name);
    }

    this.executionOrder = order;
    this.feedbackCycles = cycles;

    if (this.config.verbose) {
      console.log('Execution order:', this.executionOrder);
      if (cycles.length > 0) {
        console.log('Feedback cycles detected:', cycles);
      }
    }
  }

  /**
   * Run the simulation
   */
  run(overrides?: ParamOverrides): SimulationResults {
    // Apply any runtime overrides
    if (overrides) {
      for (const [moduleName, params] of Object.entries(overrides)) {
        const reg = this.modules.get(moduleName);
        if (reg) {
          reg.params = reg.module.mergeParams({ ...reg.params, ...params });
        }
      }
    }

    // Build dependency graph
    this.buildGraph();

    // Initialize all module states
    for (const [name, reg] of this.modules) {
      reg.state = reg.module.init(reg.params);
    }

    // Prepare results storage
    const years: Year[] = [];
    const moduleResults: Record<string, Record<string, any[]>> = {};

    for (const name of this.modules.keys()) {
      moduleResults[name] = {};
      const mod = this.modules.get(name)!.module;
      for (const output of mod.outputs) {
        moduleResults[name][String(output)] = [];
      }
    }

    // Main simulation loop
    const numYears = this.config.endYear - this.config.startYear + 1;

    for (let i = 0; i < numYears; i++) {
      const year = this.config.startYear + i;
      years.push(year);

      // Current year's outputs (built up as we execute modules)
      let currentOutputs: Record<string, any> = {};
      let prevOutputs: Record<string, any> | null = null;

      // Iterate for feedback convergence
      const newStates = new Map<string, any>();

      for (let iter = 0; iter < this.config.maxIterations; iter++) {
        const iterOutputs: Record<string, any> = {};

        // Execute modules in dependency order
        for (const moduleName of this.executionOrder) {
          const reg = this.modules.get(moduleName)!;
          const { module, state, params } = reg;

          // Gather inputs from other modules' outputs
          const inputs: Record<string, any> = {};
          for (const inputKey of module.inputs) {
            const key = String(inputKey);
            // Use current iteration's output if available, else previous iteration
            inputs[key] = iterOutputs[key] ?? currentOutputs[key] ?? prevOutputs?.[key];
          }

          // Execute step
          const result = module.step(state, inputs, params, year, i);

          // Store new state for later (don't update yet)
          newStates.set(moduleName, result.state);

          // Collect outputs
          for (const [key, value] of Object.entries(result.outputs)) {
            iterOutputs[key] = value;
          }
        }

        const converged = this.hasConverged(iterOutputs, currentOutputs);

        // Update all module states after full iteration completes (not inside module loop)
        if (converged || iter === this.config.maxIterations - 1) {
          for (const moduleName of this.executionOrder) {
            const reg = this.modules.get(moduleName)!;
            reg.state = newStates.get(moduleName);
          }
        }

        // Check convergence
        if (converged) {
          currentOutputs = iterOutputs;
          break;
        }

        prevOutputs = currentOutputs;
        currentOutputs = iterOutputs;
      }

      // Store results for this year
      for (const moduleName of this.modules.keys()) {
        const mod = this.modules.get(moduleName)!.module;
        for (const output of mod.outputs) {
          const key = String(output);
          moduleResults[moduleName][key].push(currentOutputs[key]);
        }
      }
    }

    return { years, modules: moduleResults };
  }

  /**
   * Check if outputs have converged
   */
  private hasConverged(
    current: Record<string, any>,
    previous: Record<string, any> | null
  ): boolean {
    if (!previous) return false;

    for (const [key, value] of Object.entries(current)) {
      const prev = previous[key];
      if (prev === undefined) continue;

      if (typeof value === 'number' && typeof prev === 'number') {
        const diff = Math.abs(value - prev) / (Math.abs(prev) + 1e-10);
        if (diff > this.config.convergenceThreshold) {
          return false;
        }
      }
    }

    return true;
  }
}

/**
 * Helper to create a simulation with modules
 */
export function createSimulation(
  modules: Module<any, any, any, any>[],
  config?: SimulationConfig
): Simulation {
  const sim = new Simulation(config);
  for (const mod of modules) {
    sim.register(mod);
  }
  return sim;
}
