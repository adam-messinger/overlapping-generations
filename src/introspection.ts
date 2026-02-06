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
 * Enables agents to understand simulation outputs without reading source.
 */
export function describeOutputs(): OutputSchema {
  return {
    // Demographics
    year: { unit: 'year', description: 'Simulation year', module: 'framework' },
    population: { unit: 'people', description: 'Global population', module: 'demographics' },
    working: { unit: 'people', description: 'Working-age population (20-64)', module: 'demographics' },
    dependency: { unit: 'ratio', description: 'Old-age dependency ratio (65+/working)', module: 'demographics' },
    effectiveWorkers: { unit: 'people', description: 'Productivity-weighted workers (education premium)', module: 'demographics' },
    collegeShare: { unit: 'fraction', description: 'Share of workers with college degree', module: 'demographics' },

    // Demand
    gdp: { unit: '$T', description: 'Global GDP in trillions', module: 'demand' },
    electricityDemand: { unit: 'TWh', description: 'Global electricity demand', module: 'demand' },
    electrificationRate: { unit: 'fraction', description: 'Electricity share of final energy', module: 'demand' },
    totalFinalEnergy: { unit: 'TWh', description: 'Total final energy consumption', module: 'demand' },
    nonElectricEnergy: { unit: 'TWh', description: 'Non-electric energy consumption', module: 'demand' },
    finalEnergyPerCapitaDay: { unit: 'kWh/person/day', description: 'Final energy per capita per day', module: 'demand' },

    // Sectors
    transportElectrification: { unit: 'fraction', description: 'Transport sector electrification rate', module: 'demand' },
    buildingsElectrification: { unit: 'fraction', description: 'Buildings sector electrification rate', module: 'demand' },
    industryElectrification: { unit: 'fraction', description: 'Industry sector electrification rate', module: 'demand' },

    // Fuels
    oilConsumption: { unit: 'TWh', description: 'Oil consumption (non-electric)', module: 'demand' },
    gasConsumption: { unit: 'TWh', description: 'Gas consumption (non-electric)', module: 'demand' },
    coalConsumption: { unit: 'TWh', description: 'Coal consumption (non-electric)', module: 'demand' },
    hydrogenConsumption: { unit: 'TWh', description: 'Hydrogen consumption (non-electric)', module: 'demand' },
    nonElectricEmissions: { unit: 'Gt CO2/year', description: 'Non-electric fuel combustion emissions', module: 'demand' },

    // Energy burden
    totalEnergyCost: { unit: '$T', description: 'Total energy cost (electricity + fuel)', module: 'demand' },
    energyBurden: { unit: 'fraction', description: 'Energy cost as fraction of GDP', module: 'demand' },
    burdenDamage: { unit: 'fraction', description: 'GDP damage from excess energy burden', module: 'demand' },
    usefulWorkGrowthRate: { unit: 'fraction/year', description: 'Growth rate of useful energy per worker (Ayres/Warr)', module: 'demand' },

    // Capital
    capitalStock: { unit: '$T', description: 'Global capital stock', module: 'capital' },
    investment: { unit: '$T', description: 'Annual investment', module: 'capital' },
    savingsRate: { unit: 'fraction', description: 'Aggregate savings rate', module: 'capital' },
    stability: { unit: 'index', description: 'Financial stability index (0-1)', module: 'capital' },
    interestRate: { unit: 'fraction', description: 'Real interest rate', module: 'capital' },
    robotsDensity: { unit: 'per 1000 workers', description: 'Automation capital density (capital-derived; see robotsPer1000 for energy-driving metric)', module: 'capital' },
    automationShare: { unit: 'fraction', description: 'Fraction of capital stock that is automation', module: 'capital' },
    capitalOutputRatio: { unit: 'ratio', description: 'Capital-to-output ratio (K/Y)', module: 'capital' },
    capitalGrowthRate: { unit: 'fraction/year', description: 'Annual capital stock growth rate', module: 'capital' },

    // Energy
    lcoes: { unit: '$/MWh', description: 'Levelized cost by source', module: 'energy' },
    capacities: { unit: 'GW (GWh for battery)', description: 'Installed capacity by source', module: 'energy' },
    solarLCOE: { unit: '$/MWh', description: 'Solar levelized cost', module: 'energy' },
    windLCOE: { unit: '$/MWh', description: 'Wind levelized cost', module: 'energy' },
    batteryCost: { unit: '$/kWh', description: 'Battery storage cost', module: 'energy' },
    cheapestLCOE: { unit: '$/MWh', description: 'Cheapest LCOE across all sources', module: 'energy' },
    solarPlusBatteryLCOE: { unit: '$/MWh', description: 'Solar + battery combined LCOE', module: 'energy' },

    // Dispatch
    generation: { unit: 'TWh', description: 'Electricity generation by source', module: 'dispatch' },
    gridIntensity: { unit: 'kg CO2/MWh', description: 'Grid carbon intensity', module: 'dispatch' },
    totalGeneration: { unit: 'TWh', description: 'Total electricity generation', module: 'dispatch' },
    shortfall: { unit: 'TWh', description: 'Unmet electricity demand', module: 'dispatch' },
    electricityEmissions: { unit: 'Gt CO2/year', description: 'Electricity generation emissions', module: 'dispatch' },
    fossilShare: { unit: 'fraction', description: 'Fossil share of electricity generation', module: 'dispatch' },
    curtailmentTWh: { unit: 'TWh', description: 'VRE generation curtailed', module: 'dispatch' },
    curtailmentRate: { unit: 'fraction', description: 'Fraction of available VRE curtailed', module: 'dispatch' },

    // Climate (two-layer energy balance, Geoffroy et al. 2013)
    temperature: { unit: '°C', description: 'Surface temperature above preindustrial (T₁)', module: 'climate' },
    co2ppm: { unit: 'ppm', description: 'Atmospheric CO2 concentration', module: 'climate' },
    equilibriumTemp: { unit: '°C', description: 'Equilibrium temperature at current CO2 (T₁=T₂ steady state)', module: 'climate' },
    damages: { unit: 'fraction', description: 'Global climate damage (fraction of GDP)', module: 'climate' },
    cumulativeEmissions: { unit: 'Gt CO2', description: 'Cumulative CO2 emissions since preindustrial', module: 'climate' },
    deepOceanTemp: { unit: '°C', description: 'Deep ocean temperature anomaly (T₂, slow response ~200yr)', module: 'climate' },
    radiativeForcing: { unit: 'W/m²', description: 'Radiative forcing from CO2 (F₂ₓ × log₂(CO₂/280))', module: 'climate' },

    // Resources - Minerals
    copperDemand: { unit: 'Mt/year', description: 'Annual copper demand (net of recycling)', module: 'resources' },
    lithiumDemand: { unit: 'Mt/year', description: 'Annual lithium demand (net of recycling)', module: 'resources' },
    copperCumulative: { unit: 'Mt', description: 'Cumulative copper extracted', module: 'resources' },
    lithiumCumulative: { unit: 'Mt', description: 'Cumulative lithium extracted', module: 'resources' },

    // Resources - Land
    farmland: { unit: 'Mha', description: 'Global cropland area', module: 'resources' },
    forest: { unit: 'Mha', description: 'Global forest area', module: 'resources' },
    desert: { unit: 'Mha', description: 'Desert/barren area', module: 'resources' },
    yieldDamageFactor: { unit: 'fraction', description: 'Climate yield damage (1=none, <1=damage)', module: 'resources' },

    // Resources - Food
    proteinShare: { unit: 'fraction', description: 'Fraction of calories from protein (Bennett\'s Law)', module: 'resources' },
    grainEquivalent: { unit: 'Mt', description: 'Total grain needed (direct + feed conversion)', module: 'resources' },
    foodStress: { unit: 'fraction', description: 'Fraction of food demand unmet due to land constraint (0=none, 1=total)', module: 'resources' },

    // Resources - Carbon
    forestNetFlux: { unit: 'Gt CO2/year', description: 'Net forest carbon flux (positive=emissions)', module: 'resources' },
    cumulativeSequestration: { unit: 'Gt CO2', description: 'Cumulative forest carbon sequestration', module: 'resources' },

    // Automation (formerly expansion module, now in demand)
    robotLoadTWh: { unit: 'TWh', description: 'Automation energy consumption', module: 'demand' },
    robotsPer1000: { unit: 'per 1000 workers', description: 'Robots per 1000 workers', module: 'demand' },

    // Production
    productionUsefulEnergy: { unit: 'TWh', description: 'Exergy-weighted useful energy for production', module: 'production' },
    capitalContribution: { unit: 'ratio', description: '(K/K₀)^α contribution to GDP', module: 'production' },
    laborContribution: { unit: 'ratio', description: '(L/L₀)^β contribution to GDP', module: 'production' },
    energyContribution: { unit: 'ratio', description: '(E/E₀)^γ contribution to GDP', module: 'production' },
    efficiencyLevel: { unit: 'ratio', description: 'Combined efficiency multiplier (end-use + organizational, replaces TFP)', module: 'production' },
    endUseEfficiency: { unit: 'ratio', description: 'End-use efficiency multiplier (Wright\'s Law on cumulative useful work)', module: 'production' },
    eta: { unit: 'fraction', description: 'Current second-law efficiency η(t), 0.35→0.60 ceiling', module: 'production' },

    // Resources - Energy
    miningEnergyTWh: { unit: 'TWh', description: 'Energy consumed by mining operations', module: 'resources' },
    farmingEnergyTWh: { unit: 'TWh', description: 'Energy consumed by farming operations', module: 'resources' },
    totalResourceEnergy: { unit: 'TWh', description: 'Total energy for mining + farming', module: 'resources' },
    energySystemOverhead: { unit: 'TWh', description: 'Embodied + operating energy of energy infrastructure (net energy overhead)', module: 'production' },

    // Regional
    regionalPopulation: { unit: 'people', description: 'Population by region', module: 'demographics' },
    regionalGdp: { unit: '$T', description: 'GDP by region', module: 'demand' },
    regionalCapacities: { unit: 'GW', description: 'Energy capacity by region and source', module: 'energy' },
    regionalAdditions: { unit: 'GW', description: 'Capacity additions by region and source', module: 'energy' },
    regionalGeneration: { unit: 'TWh', description: 'Generation by region and source', module: 'dispatch' },
    regionalGridIntensity: { unit: 'kg CO2/MWh', description: 'Grid intensity by region', module: 'dispatch' },
    regionalFossilShare: { unit: 'fraction', description: 'Fossil share by region', module: 'dispatch' },
    regionalEmissions: { unit: 'Gt CO2/year', description: 'Electricity emissions by region', module: 'dispatch' },
  };
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
