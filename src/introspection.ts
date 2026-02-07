/**
 * Agent Introspection
 *
 * Provides structured metadata about simulation parameters for LLM agents.
 * Enables parameter discovery without reading source code.
 *
 * Usage:
 *   import { describeParameters } from './introspection.js';
 *   const schema = describeParameters();
 *   console.log(schema.carbonPrice);
 *   // { type: 'number', default: 35, min: 0, max: 200, unit: '$/ton', path: 'energy.carbonPrice', ... }
 */

import { ComponentParams } from './framework/component-params.js';
import { generateParameterSchema, GeneratedParameterInfo } from './framework/introspect.js';
import { standardCollectors, resolveKey } from './framework/collectors.js';
import { deepMerge } from './scenario.js';

// Import all modules for auto-generated schema
import { climateModule } from './modules/climate.js';
import { energyModule } from './modules/energy.js';
import { demandModule } from './modules/demand.js';
import { demographicsModule } from './modules/demographics.js';
import { capitalModule } from './modules/capital.js';
import { dispatchModule } from './modules/dispatch.js';
import { productionModule } from './modules/production.js';
import { resourcesModule } from './modules/resources.js';
import { cdrModule } from './modules/cdr.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ParameterInfo {
  type: 'number' | 'boolean';
  default: number | boolean;
  min?: number;
  max?: number;
  unit: string;
  description: string;
  /** Dot-path to parameter in SimulationParams (e.g., 'energy.carbonPrice') */
  path: string;
}

export interface ParameterSchema {
  [key: string]: ParameterInfo;
}

// =============================================================================
// ALL MODULES (for auto-generation)
// =============================================================================

const ALL_MODULES = [
  climateModule,
  energyModule,
  demandModule,
  demographicsModule,
  capitalModule,
  dispatchModule,
  productionModule,
  resourcesModule,
  cdrModule,
] as any[];

// =============================================================================
// SCHEMA (auto-generated from module paramMeta)
// =============================================================================

/**
 * Returns structured metadata for Tier 1 simulation parameters.
 * Auto-generated from module paramMeta declarations.
 */
export function describeParameters(): ParameterSchema {
  const generated = generateParameterSchema(ALL_MODULES);

  // Convert GeneratedParameterInfo to ParameterInfo (identical shape)
  const result: ParameterSchema = {};
  for (const [key, info] of Object.entries(generated)) {
    result[key] = info;
  }
  return result;
}

/**
 * Returns example SimulationParams for a given parameter value.
 * Useful for constructing scenario overrides.
 *
 * Example:
 *   buildParams('carbonPrice', 100)
 *   // Returns: { energy: { carbonPrice: 100 } }
 */
export function buildParams(paramName: string, value: number | boolean): Record<string, unknown> {
  const schema = describeParameters();
  const info = schema[paramName];

  if (!info) {
    throw new Error(`Unknown parameter: ${paramName}`);
  }

  if (typeof value === 'number') {
    if (info.min !== undefined && value < info.min) {
      throw new Error(`Parameter ${paramName}: value ${value} is below minimum ${info.min}`);
    }
    if (info.max !== undefined && value > info.max) {
      throw new Error(`Parameter ${paramName}: value ${value} is above maximum ${info.max}`);
    }
  }

  // Use ComponentParams for dot-path construction
  const cp = ComponentParams.from({});
  return cp.set(info.path, value).toParams() as Record<string, unknown>;
}

/**
 * Build SimulationParams from multiple parameter name/value pairs.
 * Deep-merges individual buildParams results.
 *
 * Example:
 *   buildMultiParams({ carbonPrice: 100, climateSensitivity: 4.0 })
 *   // Returns: { energy: { carbonPrice: 100 }, climate: { sensitivity: 4.0 } }
 */
export function buildMultiParams(params: Record<string, number | boolean>): Record<string, unknown> {
  let result: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(params)) {
    const single = buildParams(name, value);
    result = deepMerge(result, single);
  }

  return result;
}

/**
 * Lists all parameter names.
 */
export function listParameters(): string[] {
  return Object.keys(describeParameters());
}

// =============================================================================
// OUTPUT SCHEMA
// =============================================================================

export interface OutputInfo {
  unit: string;
  description: string;
  module: string;
}

export interface OutputSchema {
  [key: string]: OutputInfo;
}

/**
 * Returns structured metadata for YearResult output fields.
 * Auto-generated from standardCollectors metadata.
 * Enables agents to understand simulation outputs without reading source.
 */
export function describeOutputs(): OutputSchema {
  const result: OutputSchema = {};

  // 'year' is always present (framework field, not a collector)
  result.year = { unit: 'year', description: 'Simulation year', module: 'framework' };

  for (const def of standardCollectors.timeseries) {
    const key = resolveKey(def);
    if (!def.unit || !def.description) {
      console.warn(`[introspection] standardCollectors entry '${key}' missing unit or description`);
      continue;
    }
    result[key] = { unit: def.unit, description: def.description, module: def.module ?? '' };
  }

  return result;
}

// =============================================================================
// CLI
// =============================================================================

async function runCLI() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: npx tsx src/introspection.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  --list         List all parameter names');
    console.log('  --json         Output full schema as JSON');
    console.log('  --param=NAME   Show details for a specific parameter');
    console.log('  --help, -h     Show this help');
    return;
  }

  const schema = describeParameters();

  if (args.includes('--list')) {
    console.log(listParameters().join('\n'));
    return;
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(schema, null, 2));
    return;
  }

  // --param=NAME
  const paramArg = args.find(a => a.startsWith('--param='));
  if (paramArg) {
    const name = paramArg.split('=')[1];
    const info = schema[name];
    if (!info) {
      console.error(`Unknown parameter: ${name}`);
      console.error(`Available: ${listParameters().join(', ')}`);
      process.exit(1);
    }
    console.log(`${name}:`);
    console.log(`  Type: ${info.type}`);
    console.log(`  Default: ${info.default}`);
    console.log(`  Range: [${info.min}, ${info.max}]`);
    console.log(`  Unit: ${info.unit}`);
    console.log(`  Path: ${info.path}`);
    console.log(`  Description: ${info.description}`);
    return;
  }

  // Default: show summary table
  const paramCount = Object.keys(schema).length;
  console.log(`Available parameters (${paramCount} total):\n`);
  console.log('Name                     Default    Unit                    Range');
  console.log('----                     -------    ----                    -----');
  for (const [name, info] of Object.entries(schema)) {
    const def = String(info.default).padStart(7);
    const unit = info.unit.padEnd(20);
    const range = `[${info.min}, ${info.max}]`;
    console.log(`${name.padEnd(24)} ${def}    ${unit}    ${range}`);
  }
  console.log('\nRun with --param=NAME for details, --json for full schema');
}

if (process.argv[1]?.endsWith('introspection.ts') || process.argv[1]?.endsWith('introspection.js')) {
  runCLI().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
