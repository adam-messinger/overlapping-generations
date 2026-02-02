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
// SCHEMA
// =============================================================================

/**
 * Returns structured metadata for Tier 1 simulation parameters.
 * These are the policy-relevant knobs most useful for scenario exploration.
 */
export function describeParameters(): ParameterSchema {
  return {
    // =========================================================================
    // ENERGY - Carbon & Learning
    // =========================================================================
    carbonPrice: {
      type: 'number',
      default: 35,
      min: 0,
      max: 300,
      unit: '$/ton CO₂',
      description: 'Carbon tax applied to fossil fuel generation. Higher values accelerate clean energy transition.',
      path: 'energy.carbonPrice',
    },
    solarAlpha: {
      type: 'number',
      default: 0.36,
      min: 0.1,
      max: 0.5,
      unit: 'dimensionless',
      description: "Wright's Law learning exponent for solar. 0.36 means 22% cost reduction per capacity doubling.",
      path: 'energy.sources.solar.alpha',
    },
    windAlpha: {
      type: 'number',
      default: 0.23,
      min: 0.1,
      max: 0.4,
      unit: 'dimensionless',
      description: "Wright's Law learning exponent for wind. Lower than solar due to mature technology.",
      path: 'energy.sources.wind.alpha',
    },
    batteryAlpha: {
      type: 'number',
      default: 0.26,
      min: 0.1,
      max: 0.4,
      unit: 'dimensionless',
      description: "Wright's Law learning exponent for battery storage.",
      path: 'energy.sources.battery.alpha',
    },
    solarGrowthRate: {
      type: 'number',
      default: 0.25,
      min: 0.05,
      max: 0.40,
      unit: 'fraction/year',
      description: 'Base annual growth rate for solar capacity (25% = doubling every ~3 years).',
      path: 'energy.sources.solar.growthRate',
    },
    windGrowthRate: {
      type: 'number',
      default: 0.18,
      min: 0.05,
      max: 0.30,
      unit: 'fraction/year',
      description: 'Base annual growth rate for wind capacity.',
      path: 'energy.sources.wind.growthRate',
    },

    // =========================================================================
    // CLIMATE
    // =========================================================================
    climateSensitivity: {
      type: 'number',
      default: 3.0,
      min: 2.0,
      max: 5.0,
      unit: '°C per CO₂ doubling',
      description: 'Equilibrium climate sensitivity. IPCC AR6 range is 2.5-4.0°C, with 3.0°C as best estimate.',
      path: 'climate.sensitivity',
    },
    damageCoeff: {
      type: 'number',
      default: 0.00236,
      min: 0.001,
      max: 0.005,
      unit: 'per °C²',
      description: 'DICE-2023 quadratic damage coefficient. damage = coeff × T². 0.00236 gives ~1.7% GDP loss at 2.7°C.',
      path: 'climate.damageCoeff',
    },
    tippingThreshold: {
      type: 'number',
      default: 2.5,
      min: 1.5,
      max: 4.0,
      unit: '°C',
      description: 'Temperature threshold for tipping point multiplier. Damages increase faster above this.',
      path: 'climate.tippingThreshold',
    },
    maxDamage: {
      type: 'number',
      default: 0.30,
      min: 0.15,
      max: 0.50,
      unit: 'fraction of GDP',
      description: 'Cap on climate damages as fraction of GDP (30% = Great Depression level).',
      path: 'climate.maxDamage',
    },

    // =========================================================================
    // DEMAND - Electrification
    // =========================================================================
    electrificationTarget: {
      type: 'number',
      default: 0.65,
      min: 0.50,
      max: 0.95,
      unit: 'fraction',
      description: 'Long-run electrification target. 0.65 means 65% of final energy as electricity by late century.',
      path: 'demand.electrificationTarget',
    },
    transportElecTarget: {
      type: 'number',
      default: 0.70,
      min: 0.50,
      max: 0.85,
      unit: 'fraction',
      description: 'Transport sector electrification ceiling (70% - aviation/shipping limits).',
      path: 'demand.sectors.transport.electrificationTarget',
    },
    buildingsElecTarget: {
      type: 'number',
      default: 0.95,
      min: 0.60,
      max: 0.98,
      unit: 'fraction',
      description: 'Buildings sector electrification ceiling (95% - nearly all can electrify).',
      path: 'demand.sectors.buildings.electrificationTarget',
    },
    industryElecTarget: {
      type: 'number',
      default: 0.65,
      min: 0.40,
      max: 0.85,
      unit: 'fraction',
      description: 'Industry sector electrification ceiling (65% - high-temp needs H2).',
      path: 'demand.sectors.industry.electrificationTarget',
    },

    // =========================================================================
    // DEMAND - Fuel Mix Evolution
    // =========================================================================
    fuelPriceSensitivity: {
      type: 'number',
      default: 0.03,
      min: 0.01,
      max: 0.10,
      unit: 'per $/MWh',
      description: 'Logit model sensitivity to effective fuel prices. Higher = faster response to price signals.',
      path: 'demand.fuelMix.priceSensitivity',
    },
    fuelInertiaRate: {
      type: 'number',
      default: 0.08,
      min: 0.02,
      max: 0.20,
      unit: 'fraction/year',
      description: 'Rate of fuel mix adjustment (0.08 = ~9yr half-life matching fleet turnover).',
      path: 'demand.fuelMix.inertiaRate',
    },

    // =========================================================================
    // DEMAND - Sector Electrification Dynamics
    // =========================================================================
    transportCostSensitivity: {
      type: 'number',
      default: 0.08,
      min: 0.02,
      max: 0.20,
      unit: 'fraction per cost ratio',
      description: 'Transport sector response to electricity/fuel cost ratio. Higher = faster EV adoption when cheap.',
      path: 'demand.sectors.transport.costSensitivity',
    },
    buildingsCostSensitivity: {
      type: 'number',
      default: 0.06,
      min: 0.02,
      max: 0.15,
      unit: 'fraction per cost ratio',
      description: 'Buildings sector response to electricity/gas cost ratio. Heat pump adoption sensitivity.',
      path: 'demand.sectors.buildings.costSensitivity',
    },
    industryCostSensitivity: {
      type: 'number',
      default: 0.10,
      min: 0.02,
      max: 0.25,
      unit: 'fraction per cost ratio',
      description: 'Industry sector response to cost signals. Most cost-sensitive sector.',
      path: 'demand.sectors.industry.costSensitivity',
    },

    // =========================================================================
    // CAPITAL & AUTOMATION
    // =========================================================================
    savingsRateWorking: {
      type: 'number',
      default: 0.45,
      min: 0.20,
      max: 0.60,
      unit: 'fraction',
      description: 'Savings rate for working-age population. Higher in aging societies.',
      path: 'capital.savingsWorking',
    },
    robotGrowthRate: {
      type: 'number',
      default: 0.12,
      min: 0.05,
      max: 0.25,
      unit: 'fraction/year',
      description: 'Annual growth rate of robot/AI automation. 12% = doubling every 6 years.',
      path: 'expansion.robotGrowthRate',
    },

    // =========================================================================
    // G/C EXPANSION
    // =========================================================================
    expansionCoeff: {
      type: 'number',
      default: 0.25,
      min: 0.10,
      max: 0.50,
      unit: 'fraction per cost halving',
      description: 'Energy demand expansion per LCOE halving (G/C Entropy Economics). 0.25 = 25% more demand when costs halve.',
      path: 'expansion.expansionCoefficient',
    },
    robotEnergyPerUnit: {
      type: 'number',
      default: 10,
      min: 5,
      max: 20,
      unit: 'MWh/robot-unit/year',
      description: 'Energy consumption per robot-equivalent (datacenter + physical robots).',
      path: 'expansion.robotEnergyPerUnit',
    },

    // =========================================================================
    // DEMOGRAPHICS
    // =========================================================================
    fertilityFloor: {
      type: 'number',
      default: 1.5,
      min: 1.0,
      max: 2.1,
      unit: 'children/woman',
      description: 'Long-run fertility floor (global average). 2.1 = replacement level.',
      path: 'demographics.regions.oecd.fertilityFloor',
    },

    // =========================================================================
    // RESOURCES
    // =========================================================================
    yieldGrowthRate: {
      type: 'number',
      default: 0.01,
      min: 0.005,
      max: 0.02,
      unit: 'fraction/year',
      description: 'Annual agricultural yield improvement from technology.',
      path: 'resources.yieldGrowthRate',
    },
    yieldDamageThreshold: {
      type: 'number',
      default: 2.0,
      min: 1.5,
      max: 3.0,
      unit: '°C',
      description: 'Temperature above which crop yields decline (Schlenker/Roberts).',
      path: 'resources.yieldDamageThreshold',
    },

    // =========================================================================
    // REGIONAL ENERGY PARAMETERS
    // =========================================================================
    oecdCarbonPrice: {
      type: 'number',
      default: 50,
      min: 0,
      max: 300,
      unit: '$/ton CO₂',
      description: 'Carbon price for OECD region (EU ETS ~80, US implicit ~25, blended ~50).',
      path: 'energy.regional.oecd.carbonPrice',
    },
    chinaCarbonPrice: {
      type: 'number',
      default: 15,
      min: 0,
      max: 300,
      unit: '$/ton CO₂',
      description: 'Carbon price for China (nascent national ETS).',
      path: 'energy.regional.china.carbonPrice',
    },
    emCarbonPrice: {
      type: 'number',
      default: 10,
      min: 0,
      max: 300,
      unit: '$/ton CO₂',
      description: 'Carbon price for Emerging Markets (India, Brazil, Indonesia, etc.).',
      path: 'energy.regional.em.carbonPrice',
    },
    rowCarbonPrice: {
      type: 'number',
      default: 0,
      min: 0,
      max: 300,
      unit: '$/ton CO₂',
      description: 'Carbon price for Rest of World (Africa, etc.). No effective pricing.',
      path: 'energy.regional.row.carbonPrice',
    },
  };
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

  const parts = info.path.split('.');
  let result: Record<string, unknown> = {};
  let current = result;

  for (let i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = {};
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;

  return result;
}

/**
 * Lists all parameter names.
 */
export function listParameters(): string[] {
  return Object.keys(describeParameters());
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
