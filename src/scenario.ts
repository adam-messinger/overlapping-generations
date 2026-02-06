/**
 * Scenario Loader
 *
 * Loads and applies scenario files to simulation parameters.
 * Scenario format mirrors the module structure for clarity.
 */

import { readFile } from 'fs/promises';
import { SimulationParams } from './simulation.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Scenario file format - mirrors SimulationParams with metadata
 */
export interface Scenario {
  /** Human-readable name */
  name: string;

  /** Description of scenario assumptions */
  description: string;

  /** Optional scenario metadata */
  meta?: {
    author?: string;
    source?: string;
    probability?: number;  // For probabilistic scenarios (e.g., Twin-Engine)
  };

  /** Optional simulation range overrides */
  startYear?: number;
  endYear?: number;

  // Module parameters (all optional - only specify overrides)
  demographics?: SimulationParams['demographics'];
  demand?: SimulationParams['demand'];
  capital?: SimulationParams['capital'];
  energy?: SimulationParams['energy'];
  dispatch?: SimulationParams['dispatch'];
  resources?: SimulationParams['resources'];
  cdr?: SimulationParams['cdr'];
  climate?: SimulationParams['climate'];
  production?: SimulationParams['production'];
}

// =============================================================================
// LOADER
// =============================================================================

/**
 * Load a scenario from a JSON file
 */
export async function loadScenario(path: string): Promise<Scenario> {
  const content = await readFile(path, 'utf-8');
  const scenario = JSON.parse(content) as Scenario;

  if (!scenario.name) {
    throw new Error(`Scenario file missing required 'name' field: ${path}`);
  }

  return scenario;
}

/**
 * Convert scenario to SimulationParams, warning about unrecognized keys
 */
export function scenarioToParams(scenario: Scenario): SimulationParams {
  const params: SimulationParams = {};

  // Known top-level keys
  const knownKeys = new Set([
    'name', 'description', 'meta',
    'demographics', 'demand', 'capital', 'energy',
    'dispatch', 'resources', 'cdr', 'climate', 'production',
    'startYear', 'endYear',
  ]);

  for (const key of Object.keys(scenario)) {
    if (!knownKeys.has(key)) {
      console.warn(`Warning: Unrecognized scenario key "${key}" will be ignored`);
    }
  }

  if (scenario.startYear !== undefined) params.startYear = scenario.startYear;
  if (scenario.endYear !== undefined) params.endYear = scenario.endYear;

  if (scenario.demographics) params.demographics = scenario.demographics;
  if (scenario.demand) params.demand = scenario.demand;
  if (scenario.capital) params.capital = scenario.capital;
  if (scenario.energy) params.energy = scenario.energy;
  if (scenario.dispatch) params.dispatch = scenario.dispatch;
  if (scenario.resources) params.resources = scenario.resources;
  if (scenario.cdr) params.cdr = scenario.cdr;
  if (scenario.climate) params.climate = scenario.climate;
  if (scenario.production) params.production = scenario.production;

  return params;
}

/**
 * Deep merge two objects (scenario params override defaults)
 */
export function deepMerge<T extends object>(base: T, override: Partial<T>): T {
  const result = { ...base };

  for (const key of Object.keys(override) as Array<keyof T>) {
    const overrideValue = override[key];
    const baseValue = base[key];

    if (
      overrideValue !== undefined &&
      typeof overrideValue === 'object' &&
      overrideValue !== null &&
      !Array.isArray(overrideValue) &&
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(baseValue as object, overrideValue as object) as T[keyof T];
    } else if (overrideValue !== undefined) {
      result[key] = overrideValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Load scenario and convert to params, with optional CLI overrides
 */
export async function loadScenarioAsParams(
  path: string,
  cliOverrides?: SimulationParams
): Promise<{ scenario: Scenario; params: SimulationParams }> {
  const scenario = await loadScenario(path);
  let params = scenarioToParams(scenario);

  // Apply CLI overrides on top of scenario
  if (cliOverrides) {
    params = deepMerge(params, cliOverrides);
  }

  return { scenario, params };
}

// =============================================================================
// SCENARIO LISTING
// =============================================================================

import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * List available scenarios in the scenarios directory
 */
export async function listScenarios(scenariosDir?: string): Promise<string[]> {
  const dir = scenariosDir ?? join(dirname(fileURLToPath(import.meta.url)), '../scenarios');

  try {
    const files = await readdir(dir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

/**
 * Get scenario path from name
 */
export function getScenarioPath(name: string, scenariosDir?: string): string {
  const dir = scenariosDir ?? join(dirname(fileURLToPath(import.meta.url)), '../scenarios');
  return join(dir, `${name}.json`);
}
