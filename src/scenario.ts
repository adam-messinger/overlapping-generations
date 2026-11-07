/**
 * Scenario Loader
 *
 * Loads and applies scenario files to simulation parameters.
 * Scenario format mirrors the module structure for clarity.
 */

import { readFile } from 'fs/promises';
import { SimulationParams } from './simulation.js';
import { ALL_MODULES } from './simulation-autowired.js';
import { deepMerge } from './primitives/deep-merge.js';

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
/**
 * Check override keys against the module's default shape and return the
 * override without the unrecognized ones, so "will be ignored" is what
 * happens: a module whose merge is strict (a parameter schema) would
 * otherwise reject a key this function only warned about.
 */
function pruneOverrideKeys(
  override: unknown,
  defaults: unknown,
  path: string,
  unknownKeys: 'warn' | 'error' | 'ignore',
): unknown {
  if (!isPlainObject(override) || !isPlainObject(defaults)) return override;
  const kept: Record<string, unknown> = {};
  for (const key of Object.keys(override)) {
    if (OPEN_PARTIAL_KEYS.has(key)) {  // valid optional/Partial — don't warn or descend
      kept[key] = override[key];
      continue;
    }
    // `in` walks the prototype chain, so `__proto__`, `constructor` and
    // `toString` would all pass the unknown-key check as though they named
    // real parameters. Own properties are the only real ones.
    if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
      const message = `Unrecognized ${path} param "${key}" will be ignored`;
      if (unknownKeys === 'error') throw new Error(message);
      if (unknownKeys === 'warn') console.warn(`Warning: ${message}`);
      continue;
    }
    kept[key] = pruneOverrideKeys(override[key], defaults[key], `${path}.${key}`, unknownKeys);
  }
  return kept;
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Scenario file format - mirrors SimulationParams with metadata
 */
/**
 * Scenario file format: SimulationParams plus metadata. Module sections are
 * whatever ALL_MODULES declares, so a new module needs no edit here.
 */
export interface Scenario extends SimulationParams {
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
 * Convert scenario to SimulationParams. Standard runs reject unrecognized
 * keys; callers importing legacy files can explicitly request warning mode.
 */
export function scenarioToParams(
  scenario: Scenario,
  options: { unknownKeys?: 'warn' | 'error' | 'ignore' } = {},
): SimulationParams {
  const params: SimulationParams = {};
  const unknownKeys = options.unknownKeys ?? 'error';

  // Known top-level keys: metadata, range, and one section per module
  const knownKeys = new Set([
    'name', 'description', 'meta', 'startYear', 'endYear', 'decouple',
    ...ALL_MODULES.map((m) => m.name),
  ]);

  const sections: Record<string, unknown> = {};
  for (const key of Object.keys(scenario)) {
    if (!knownKeys.has(key)) {
      const message = `Unrecognized scenario key "${key}" will be ignored`;
      if (unknownKeys === 'error') throw new Error(message);
      if (unknownKeys === 'warn') console.warn(`Warning: ${message}`);
      continue;
    }
    // Validate override keys against the module's default shape — recursively,
    // so a fat-fingered or dead NESTED override (energy.sources.solar.growthRate,
    // energy: { carbonPriceTYPO: ... }) is flagged instead of silently dropped
    // by the module's spread-based mergeParams.
    const defaults = MODULE_DEFAULTS[key];
    const section = (scenario as unknown as Record<string, unknown>)[key];
    if (defaults && isPlainObject(section)) {
      sections[key] = pruneOverrideKeys(section, defaults, key, unknownKeys);
    }
  }

  if (scenario.decouple !== undefined) params.decouple = [...scenario.decouple];
  if (scenario.startYear !== undefined) params.startYear = scenario.startYear;
  if (scenario.endYear !== undefined) params.endYear = scenario.endYear;

  for (const mod of ALL_MODULES) {
    const key = mod.name as keyof SimulationParams;
    const section = key in sections ? sections[key] : scenario[key];
    if (section) (params as Record<string, unknown>)[key] = section;
  }

  return params;
}

export { deepMerge } from './primitives/deep-merge.js';

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
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const SCENARIOS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../scenarios');

/**
 * List available scenarios in the scenarios directory
 */
export async function listScenarios(scenariosDir?: string): Promise<string[]> {
  const dir = scenariosDir ?? SCENARIOS_DIR;

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
  const dir = scenariosDir ?? SCENARIOS_DIR;
  return join(dir, `${name}.json`);
}

/** Synchronous `listScenarios`, sorted, for tests and scripts without top-level await. */
export function listScenariosSync(scenariosDir: string = SCENARIOS_DIR): string[] {
  return readdirSync(scenariosDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace('.json', ''))
    .sort();
}

/** Synchronous `loadScenarioAsParams` for a scenario name, without CLI overrides. */
export function loadScenarioParamsSync(name: string, scenariosDir?: string): SimulationParams {
  return scenarioToParams(JSON.parse(readFileSync(getScenarioPath(name, scenariosDir), 'utf-8')) as Scenario);
}
