/**
 * Scenario Loader
 *
 * Loads and applies scenario files to simulation parameters.
 * Scenario format mirrors the module structure for clarity.
 */

import { readFile } from 'fs/promises';
import { SimulationParams } from './simulation.js';
import { ALL_MODULES } from './simulation-autowired.js';

/** Each module's default param object, keyed by module name. Used to validate
 * scenario overrides against the real default SHAPE — recursively, so dead or
 * fat-fingered NESTED keys are caught too (e.g. energy.sources.solar.growthRate,
 * which the module's spread-merge would otherwise silently ignore — exactly the
 * bug that let a dead growthRate sit in a dozen scenarios). Derived from the
 * modules themselves so it can never drift. */
const MODULE_DEFAULTS: Record<string, Record<string, unknown>> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.name, m.defaults as Record<string, unknown>]),
);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/** Interface fields that are optional / `Partial<Record<...>>` — declared in a
 * module's TS interface but not instantiated in its defaults object, so the
 * defaults-shape walk can't see them. These are valid overrides (e.g. the
 * per-region `maxGrowthRate`/`capacityFactor` policy overrides on
 * RegionalEnergyParams), so we neither warn when they're absent from defaults
 * nor recurse into their open key space. */
const OPEN_PARTIAL_KEYS = new Set(['maxGrowthRate', 'capacityFactor']);

/** Recursively warn about override keys absent from the default shape. Recurses
 * only where BOTH sides are plain objects (records-of-records like sources /
 * regional / sectors); stops at leaves, numeric maps, and open Partial records. */
function validateOverrideKeys(override: unknown, defaults: unknown, path: string): void {
  if (!isPlainObject(override) || !isPlainObject(defaults)) return;
  for (const key of Object.keys(override)) {
    if (OPEN_PARTIAL_KEYS.has(key)) continue;  // valid optional/Partial — don't warn or descend
    if (!(key in defaults)) {
      console.warn(`Warning: Unrecognized ${path} param "${key}" will be ignored`);
      continue;
    }
    validateOverrideKeys(override[key], defaults[key], `${path}.${key}`);
  }
}

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
  generations?: SimulationParams['generations'];
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
    'generations', 'dispatch', 'resources', 'cdr', 'climate', 'production',
    'startYear', 'endYear',
  ]);

  for (const key of Object.keys(scenario)) {
    if (!knownKeys.has(key)) {
      console.warn(`Warning: Unrecognized scenario key "${key}" will be ignored`);
      continue;
    }
    // Validate override keys against the module's default shape — recursively,
    // so a fat-fingered or dead NESTED override (energy.sources.solar.growthRate,
    // energy: { carbonPriceTYPO: ... }) is flagged instead of silently dropped
    // by the module's spread-based mergeParams.
    const defaults = MODULE_DEFAULTS[key];
    const section = (scenario as unknown as Record<string, unknown>)[key];
    if (defaults && isPlainObject(section)) {
      validateOverrideKeys(section, defaults, key);
    }
  }

  if (scenario.startYear !== undefined) params.startYear = scenario.startYear;
  if (scenario.endYear !== undefined) params.endYear = scenario.endYear;

  if (scenario.demographics) params.demographics = scenario.demographics;
  if (scenario.demand) params.demand = scenario.demand;
  if (scenario.capital) params.capital = scenario.capital;
  if (scenario.generations) params.generations = scenario.generations;
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
