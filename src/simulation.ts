/**
 * Simulation Runner
 *
 * Public API for running simulations. Delegates to the autowired path.
 *
 * Module dependency graph:
 *   demographics (no inputs)
 *        ↓
 *   production ← lagged capital, lagged energy, lagged damages, lagged food stress
 *        ↓
 *      demand ← production (GDP), demographics, lagged damages
 *        ↓
 *      capital ← demographics, demand, lagged damages
 *        ↓
 *      energy ← demand, capital
 *        ↓
 *      dispatch ← demand, energy
 *        ↓
 *      resources ← energy, demographics, demand, climate (lagged)
 *        ↓
 *      climate ← dispatch, resources (land use carbon)
 *        ↓
 *      (damages, energy burden, food stress feed back via lags to production)
 */

import type { DemographicsParams } from './modules/demographics.js';
import type { ProductionParams } from './modules/production.js';
import type { DemandParams } from './modules/demand.js';
import type { CapitalParams } from './modules/capital.js';
import type { EnergyParams } from './modules/energy.js';
import type { DispatchParams } from './modules/dispatch.js';
import type { ResourcesParams } from './modules/resources.js';
import type { ClimateParams } from './modules/climate.js';
import type { CDRParams } from './modules/cdr.js';
import type { Region, EnergySource } from './domain-types.js';
import { runAutowiredFull } from './simulation-autowired.js';

// =============================================================================
// TYPES
// =============================================================================

export interface SimulationParams {
  startYear?: number;
  endYear?: number;
  demographics?: Partial<DemographicsParams>;
  production?: Partial<ProductionParams>;
  demand?: Partial<DemandParams>;
  capital?: Partial<CapitalParams>;
  energy?: Partial<EnergyParams>;
  dispatch?: Partial<DispatchParams>;
  resources?: Partial<ResourcesParams>;
  cdr?: Partial<CDRParams>;
  climate?: Partial<ClimateParams>;
}

export interface YearResult {
  year: number;

  // Demographics
  population: number;
  working: number;
  dependency: number;
  effectiveWorkers: number;
  collegeShare: number;

  // Demand
  gdp: number;
  electricityDemand: number;
  electrificationRate: number;
  totalFinalEnergy: number;
  nonElectricEnergy: number;
  finalEnergyPerCapitaDay: number;

  // Sectors
  transportElectrification: number;
  buildingsElectrification: number;
  industryElectrification: number;

  // Fuels (TWh)
  oilConsumption: number;
  gasConsumption: number;
  coalConsumption: number;
  hydrogenConsumption: number;

  // Non-electric emissions (Gt CO2/year)
  nonElectricEmissions: number;

  // Energy burden
  totalEnergyCost: number;    // $ trillions
  energyBurden: number;       // Fraction of GDP
  burdenDamage: number;       // GDP damage fraction

  // Useful work
  usefulWorkGrowthRate: number;

  // Capital
  capitalStock: number;
  investment: number;
  savingsRate: number;
  stability: number;
  interestRate: number;
  robotsDensity: number;
  automationShare: number;
  capitalOutputRatio: number;
  capitalGrowthRate: number;

  // Intergenerational transfers
  retireeCost: number;        // $ trillions (pensions + healthcare for 65+)
  childCost: number;          // $ trillions (education for 0-19)
  transferBurden: number;     // Fraction of GDP going to transfers
  workerConsumption: number;  // $ trillions (GDP - investment - transfers)

  // Energy
  lcoes: Record<EnergySource, number>;
  capacities: Record<EnergySource, number>;
  solarLCOE: number;
  windLCOE: number;
  batteryCost: number;
  cheapestLCOE: number;
  solarPlusBatteryLCOE: number;

  // Dispatch
  generation: Record<string, number>;
  gridIntensity: number;
  totalGeneration: number;
  shortfall: number;
  electricityEmissions: number;
  fossilShare: number;
  curtailmentTWh: number;
  curtailmentRate: number;

  // WACC
  effectiveWACC: number;

  // Climate
  temperature: number;
  co2ppm: number;
  equilibriumTemp: number;
  damages: number;
  cumulativeEmissions: number;
  deepOceanTemp: number;
  radiativeForcing: number;

  // Adaptation
  regionalAdaptation: Record<Region, number>;

  // Long-duration storage
  longStorageCost: number;     // $/MWh (Wright's Law)
  longStorageCapacity: number; // GWh global

  // Resources - Minerals
  copperDemand: number;
  lithiumDemand: number;
  copperCumulative: number;
  lithiumCumulative: number;

  // Resources - Land
  farmland: number;
  forest: number;
  desert: number;
  yieldDamageFactor: number;

  // Resources - Food (Bennett's Law)
  proteinShare: number;          // Fraction of calories from protein
  grainEquivalent: number;       // Mt grain needed (direct + feed)
  foodStress: number;            // 0-1, fraction of food demand unmet (land cap)

  // Resources - Carbon
  forestNetFlux: number;
  cumulativeSequestration: number;

  // CDR (Carbon Dioxide Removal)
  cdrRemoval: number;       // Gt CO2/yr removed
  cdrEnergyTWh: number;     // TWh consumed
  cdrCostPerTon: number;    // $/ton
  cdrCumulative: number;    // Gt total removed
  cdrCapacity: number;      // Gt/yr capacity
  cdrAnnualSpend: number;   // $T/yr

  // Production (biophysical)
  productionUsefulEnergy: number;
  energySystemOverhead: number;

  // Mineral constraint (0-1, 1 = no constraint)
  mineralConstraint: number;

  // Heat stress (fractional labor loss per region, 0-1)
  heatStressLoss: Record<Region, number>;

  // Water stress
  waterStress: Record<Region, number>;
  waterYieldFactor: number;

  // Infrastructure lock-in (fossil end-use equipment stock)
  fossilStockTWh: number;

  // Automation (formerly expansion)
  robotLoadTWh: number;
  robotsPer1000: number;

  // Regional
  regionalPopulation: Record<Region, number>;
  regionalGdp: Record<Region, number>;

  // Regional Energy (v2)
  regionalCapacities: Record<Region, Record<EnergySource, number>>;
  regionalAdditions: Record<Region, Record<EnergySource, number>>;

  // Regional Dispatch (v2)
  regionalGeneration: Record<Region, Record<string, number>>;
  regionalGridIntensity: Record<Region, number>;
  regionalFossilShare: Record<Region, number>;
  regionalEmissions: Record<Region, number>;
}

export interface SimulationResult {
  years: number[];
  results: YearResult[];
  metrics: SimulationMetrics;
}

export interface SimulationMetrics {
  // Population
  peakPopulation: number;
  peakPopulationYear: number;
  population2100: number;

  // Climate
  warming2050: number;
  warming2100: number;
  peakEmissions: number;
  peakEmissionsYear: number;

  // Energy
  solarCrossoverYear: number | null;  // Year solar beats gas
  gridBelow100Year: number | null;    // Year grid intensity < 100 kg/MWh
  fossilShareFinal: number;

  // Economy
  gdp2050: number;
  gdp2100: number;
  kY2050: number;  // Capital-output ratio
}

// =============================================================================
// SIMULATION FUNCTIONS
// =============================================================================

/**
 * Run a simulation with optional parameter overrides.
 * Delegates to the autowired simulation path.
 */
export function runSimulation(params: SimulationParams = {}): SimulationResult {
  return runAutowiredFull(params);
}

/**
 * Run a simulation with a scenario file
 */
export async function runWithScenario(
  scenarioPath: string,
  overrides?: SimulationParams
): Promise<{ scenario: { name: string; description: string }; result: SimulationResult }> {
  const { loadScenario, scenarioToParams, deepMerge } = await import('./scenario.js');

  const scenario = await loadScenario(scenarioPath);
  let params = scenarioToParams(scenario);

  if (overrides) {
    params = deepMerge(params, overrides);
  }

  const result = runSimulation(params);

  return {
    scenario: { name: scenario.name, description: scenario.description },
    result,
  };
}

// =============================================================================
// CLI RUNNER
// =============================================================================

function makeSampleYears(startYear: number, endYear: number): number[] {
  const years = [startYear];
  const span = endYear - startYear;
  if (span <= 25) {
    for (let y = startYear + 5; y <= endYear; y += 5) years.push(y);
  } else {
    // First few closely spaced, then wider
    years.push(startYear + 5, startYear + 15, startYear + 25);
    years.push(startYear + Math.round(span * 2 / 3));
    years.push(endYear);
  }
  return years.filter(y => y <= endYear);
}

async function runCLI() {
  const args = process.argv.slice(2);

  // Known flags
  const knownFlags = new Set([
    '--scenario', '--list', '--help', '-h',
    '--carbonPrice', '--sensitivity',
  ]);

  // Parse --scenario=name or --scenario name
  let scenarioName: string | undefined;
  let scenarioPath: string | undefined;
  const unknownFlags: string[] = [];
  const paramOverrides: SimulationParams = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--scenario=')) {
      scenarioName = arg.split('=')[1];
    } else if (arg === '--scenario' && args[i + 1]) {
      scenarioName = args[++i];
    } else if (arg === '--list') {
      // List available scenarios
      const { listScenarios } = await import('./scenario.js');
      const scenarios = await listScenarios();
      console.log('Available scenarios:');
      for (const s of scenarios) {
        console.log(`  ${s}`);
      }
      return;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npx tsx src/simulation.ts [options]');
      console.log('');
      console.log('Options:');
      console.log('  --scenario=NAME           Run with named scenario');
      console.log('  --list                    List available scenarios');
      console.log('  --carbonPrice=VALUE       Override carbon price ($/ton)');
      console.log('  --sensitivity=VALUE       Override climate sensitivity (°C)');
      console.log('  --help, -h                Show this help');
      return;
    } else if (arg.startsWith('--carbonPrice=')) {
      const value = parseFloat(arg.split('=')[1]);
      if (!isNaN(value)) {
        paramOverrides.energy = { ...paramOverrides.energy, carbonPrice: value };
      }
    } else if (arg.startsWith('--sensitivity=')) {
      const value = parseFloat(arg.split('=')[1]);
      if (!isNaN(value)) {
        paramOverrides.climate = { ...paramOverrides.climate, sensitivity: value };
      }
    } else if (arg.startsWith('--') || arg.startsWith('-')) {
      // Check if it's a known flag with separate value
      const flagName = arg.split('=')[0];
      if (!knownFlags.has(flagName)) {
        unknownFlags.push(arg);
      }
    }
  }

  // Warn about unknown flags
  if (unknownFlags.length > 0) {
    console.warn(`Warning: Unknown flags ignored: ${unknownFlags.join(', ')}`);
    console.warn('Run with --help to see available options.');
    console.warn('');
  }

  // Load scenario if specified
  let params: SimulationParams = {};
  let loadedScenario: { name: string; description: string } | undefined;

  if (scenarioName) {
    const { loadScenario, scenarioToParams, getScenarioPath } = await import('./scenario.js');
    try {
      // Try as path first, then as name
      scenarioPath = scenarioName.endsWith('.json')
        ? scenarioName
        : getScenarioPath(scenarioName);
      const scenario = await loadScenario(scenarioPath);
      params = scenarioToParams(scenario);
      loadedScenario = { name: scenario.name, description: scenario.description };
    } catch (err) {
      console.error(`Error loading scenario '${scenarioName}': ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Merge CLI parameter overrides
  const { deepMerge } = await import('./scenario.js');
  if (Object.keys(paramOverrides).length > 0) {
    params = deepMerge(params, paramOverrides);
  }

  // Run simulation
  if (loadedScenario) {
    console.log(`=== ${loadedScenario.name} ===`);
    console.log(loadedScenario.description);
    console.log('');
  } else {
    console.log('=== Full Simulation ===\n');
  }

  const result = runSimulation(params);

  // Print sample years
  const startYear = result.results[0].year;
  const endYear = result.results[result.results.length - 1].year;
  const sampleYears = makeSampleYears(startYear, endYear);

  console.log('Year  Pop(B)  GDP($T)  Elec(TWh)  Temp(°C)  Grid(kg/MWh)  Solar$/MWh');
  console.log('----  ------  -------  ---------  --------  ------------  ----------');

  for (const r of result.results) {
    if (sampleYears.includes(r.year)) {
      console.log(
        `${r.year}  ` +
        `${(r.population / 1e9).toFixed(2)}    ` +
        `${r.gdp.toFixed(0).padStart(5)}    ` +
        `${(r.electricityDemand / 1000).toFixed(0).padStart(6)}k    ` +
        `${r.temperature.toFixed(2).padStart(5)}     ` +
        `${r.gridIntensity.toFixed(0).padStart(8)}      ` +
        `${r.solarLCOE.toFixed(0).padStart(6)}`
      );
    }
  }

  console.log('\n=== Metrics ===\n');
  console.log(`Peak population: ${(result.metrics.peakPopulation / 1e9).toFixed(2)}B in ${result.metrics.peakPopulationYear}`);
  console.log(`Population 2100: ${(result.metrics.population2100 / 1e9).toFixed(2)}B`);
  console.log(`Warming 2050: ${result.metrics.warming2050.toFixed(2)}°C`);
  console.log(`Warming 2100: ${result.metrics.warming2100.toFixed(2)}°C`);
  console.log(`Peak emissions: ${result.metrics.peakEmissions.toFixed(1)} Gt in ${result.metrics.peakEmissionsYear}`);
  console.log(`Solar crosses gas: ${result.metrics.solarCrossoverYear ?? 'never'}`);
  console.log(`Grid < 100 kg/MWh: ${result.metrics.gridBelow100Year ?? 'never'}`);
  console.log(`GDP 2050: $${result.metrics.gdp2050.toFixed(0)}T`);
  console.log(`GDP 2100: $${result.metrics.gdp2100.toFixed(0)}T`);
  console.log(`K/Y 2050: ${result.metrics.kY2050.toFixed(2)}`);

  // Resource metrics
  const idx2025 = 0;
  const idx2050 = result.results.findIndex(r => r.year === 2050);
  const idx2100 = result.results.length - 1;
  const r2050 = idx2050 >= 0 ? result.results[idx2050] : null;
  const fmt2050 = (fn: (r: YearResult) => string) => r2050 ? fn(r2050) : 'N/A';

  console.log('\n=== Resources ===\n');
  console.log(`Copper cumulative 2100: ${result.results[idx2100].copperCumulative.toFixed(0)} Mt`);
  console.log(`Lithium cumulative 2100: ${result.results[idx2100].lithiumCumulative.toFixed(1)} Mt`);
  console.log(`Forest 2100: ${result.results[idx2100].forest.toFixed(0)} Mha`);
  console.log(`Farmland 2100: ${result.results[idx2100].farmland.toFixed(0)} Mha`);
  console.log(`Yield damage 2100: ${((1 - result.results[idx2100].yieldDamageFactor) * 100).toFixed(0)}%`);
  console.log(`Cumulative sequestration: ${result.results[idx2100].cumulativeSequestration.toFixed(1)} Gt CO2`);

  console.log('\n=== Food (Bennett\'s Law) ===\n');
  console.log(`Protein share 2025: ${(result.results[idx2025].proteinShare * 100).toFixed(1)}%`);
  console.log(`Protein share 2050: ${fmt2050(r => (r.proteinShare * 100).toFixed(1) + '%')}`);
  console.log(`Protein share 2100: ${(result.results[idx2100].proteinShare * 100).toFixed(1)}%`);
  console.log(`Grain demand 2025: ${result.results[idx2025].grainEquivalent.toFixed(0)} Mt`);
  console.log(`Grain demand 2050: ${fmt2050(r => r.grainEquivalent.toFixed(0) + ' Mt')}`);
  console.log(`Grain demand 2100: ${result.results[idx2100].grainEquivalent.toFixed(0)} Mt`);

  // Automation metrics
  console.log('\n=== Automation ===\n');
  console.log(`Robot load 2025: ${result.results[idx2025].robotLoadTWh.toFixed(0)} TWh`);
  console.log(`Robot load 2050: ${fmt2050(r => r.robotLoadTWh.toFixed(0) + ' TWh')}`);
  console.log(`Robot load 2100: ${result.results[idx2100].robotLoadTWh.toFixed(0)} TWh`);
  console.log(`Robots/1000 workers 2025: ${result.results[idx2025].robotsPer1000.toFixed(1)}`);
  console.log(`Robots/1000 workers 2100: ${result.results[idx2100].robotsPer1000.toFixed(1)}`);

  // Sector electrification
  console.log('\n=== Sector Electrification ===\n');
  console.log(`Transport 2025: ${(result.results[idx2025].transportElectrification * 100).toFixed(0)}%`);
  console.log(`Transport 2050: ${fmt2050(r => (r.transportElectrification * 100).toFixed(0) + '%')}`);
  console.log(`Transport 2100: ${(result.results[idx2100].transportElectrification * 100).toFixed(0)}%`);
  console.log(`Buildings 2025: ${(result.results[idx2025].buildingsElectrification * 100).toFixed(0)}%`);
  console.log(`Buildings 2050: ${fmt2050(r => (r.buildingsElectrification * 100).toFixed(0) + '%')}`);
  console.log(`Buildings 2100: ${(result.results[idx2100].buildingsElectrification * 100).toFixed(0)}%`);
  console.log(`Industry 2025: ${(result.results[idx2025].industryElectrification * 100).toFixed(0)}%`);
  console.log(`Industry 2050: ${fmt2050(r => (r.industryElectrification * 100).toFixed(0) + '%')}`);
  console.log(`Industry 2100: ${(result.results[idx2100].industryElectrification * 100).toFixed(0)}%`);

  // Fuel mix
  console.log('\n=== Fuel Mix (non-electric TWh) ===\n');
  console.log(`Non-electric 2025: ${result.results[idx2025].nonElectricEnergy.toFixed(0)} TWh`);
  console.log(`Non-electric 2050: ${fmt2050(r => r.nonElectricEnergy.toFixed(0) + ' TWh')}`);
  console.log(`Non-electric 2100: ${result.results[idx2100].nonElectricEnergy.toFixed(0)} TWh`);
  console.log(`Oil 2025: ${result.results[idx2025].oilConsumption.toFixed(0)} TWh`);
  console.log(`Oil 2100: ${result.results[idx2100].oilConsumption.toFixed(0)} TWh`);
  console.log(`Hydrogen 2025: ${result.results[idx2025].hydrogenConsumption.toFixed(0)} TWh`);
  console.log(`Hydrogen 2100: ${result.results[idx2100].hydrogenConsumption.toFixed(0)} TWh`);
  console.log(`Non-electric emissions 2025: ${result.results[idx2025].nonElectricEmissions.toFixed(1)} Gt`);
  console.log(`Non-electric emissions 2100: ${result.results[idx2100].nonElectricEmissions.toFixed(1)} Gt`);

  // Energy burden
  console.log('\n=== Energy Burden ===\n');
  console.log(`Energy cost 2025: $${result.results[idx2025].totalEnergyCost.toFixed(1)}T`);
  console.log(`Energy cost 2050: ${fmt2050(r => '$' + r.totalEnergyCost.toFixed(1) + 'T')}`);
  console.log(`Energy cost 2100: $${result.results[idx2100].totalEnergyCost.toFixed(1)}T`);
  console.log(`Energy burden 2025: ${(result.results[idx2025].energyBurden * 100).toFixed(1)}% of GDP`);
  console.log(`Energy burden 2050: ${fmt2050(r => (r.energyBurden * 100).toFixed(1) + '% of GDP')}`);
  console.log(`Energy burden 2100: ${(result.results[idx2100].energyBurden * 100).toFixed(1)}% of GDP`);

  // CDR
  console.log('\n=== Carbon Dioxide Removal ===\n');
  console.log(`CDR cost 2025: $${result.results[idx2025].cdrCostPerTon.toFixed(0)}/ton`);
  console.log(`CDR cost 2050: ${fmt2050(r => '$' + r.cdrCostPerTon.toFixed(0) + '/ton')}`);
  console.log(`CDR cost 2100: $${result.results[idx2100].cdrCostPerTon.toFixed(0)}/ton`);
  console.log(`CDR capacity 2050: ${fmt2050(r => r.cdrCapacity.toFixed(3) + ' Gt/yr')}`);
  console.log(`CDR capacity 2100: ${result.results[idx2100].cdrCapacity.toFixed(3)} Gt/yr`);
  console.log(`CDR removal 2050: ${fmt2050(r => r.cdrRemoval.toFixed(3) + ' Gt/yr')}`);
  console.log(`CDR removal 2100: ${result.results[idx2100].cdrRemoval.toFixed(3)} Gt/yr`);
  console.log(`CDR energy 2050: ${fmt2050(r => r.cdrEnergyTWh.toFixed(0) + ' TWh')}`);
  console.log(`CDR energy 2100: ${result.results[idx2100].cdrEnergyTWh.toFixed(0)} TWh`);
  console.log(`CDR cumulative 2100: ${result.results[idx2100].cdrCumulative.toFixed(1)} Gt`);
  console.log(`CDR spend 2050: ${fmt2050(r => '$' + r.cdrAnnualSpend.toFixed(2) + 'T/yr')}`);
  console.log(`CDR spend 2100: $${result.results[idx2100].cdrAnnualSpend.toFixed(2)}T/yr`);

  // Intergenerational transfers
  console.log('\n=== Intergenerational Transfers ===\n');
  console.log(`Retiree cost 2025: $${result.results[idx2025].retireeCost.toFixed(1)}T`);
  console.log(`Retiree cost 2050: ${fmt2050(r => '$' + r.retireeCost.toFixed(1) + 'T')}`);
  console.log(`Retiree cost 2100: $${result.results[idx2100].retireeCost.toFixed(1)}T`);
  console.log(`Child cost 2025: $${result.results[idx2025].childCost.toFixed(1)}T`);
  console.log(`Child cost 2050: ${fmt2050(r => '$' + r.childCost.toFixed(1) + 'T')}`);
  console.log(`Child cost 2100: $${result.results[idx2100].childCost.toFixed(1)}T`);
  console.log(`Transfer burden 2025: ${(result.results[idx2025].transferBurden * 100).toFixed(1)}%`);
  console.log(`Transfer burden 2050: ${fmt2050(r => (r.transferBurden * 100).toFixed(1) + '%')}`);
  console.log(`Transfer burden 2100: ${(result.results[idx2100].transferBurden * 100).toFixed(1)}%`);
  console.log(`Worker consumption 2025: $${result.results[idx2025].workerConsumption.toFixed(0)}T`);
  console.log(`Worker consumption 2050: ${fmt2050(r => '$' + r.workerConsumption.toFixed(0) + 'T')}`);
  console.log(`Worker consumption 2100: $${result.results[idx2100].workerConsumption.toFixed(0)}T`);

  // Find peak burden
  let peakBurden = 0;
  let peakBurdenYear = 2025;
  for (const r of result.results) {
    if (r.energyBurden > peakBurden) {
      peakBurden = r.energyBurden;
      peakBurdenYear = r.year;
    }
  }
  console.log(`Peak burden: ${(peakBurden * 100).toFixed(1)}% in ${peakBurdenYear}`);
}

if (process.argv[1]?.endsWith('simulation.ts') || process.argv[1]?.endsWith('simulation.js')) {
  runCLI().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
