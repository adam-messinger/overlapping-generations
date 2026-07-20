/**
 * Auto-wired Simulation Runner
 *
 * Julia-inspired automatic dependency resolution.
 * Modules declare inputs/outputs, framework wires them automatically.
 *
 * Fixes over initial version:
 * - netEnergyFactor computed from generation + netEnergyFraction (lagged)
 * - energyBurdenDamage sourced from demand.burdenDamage (consumed by production only)
 * - capitalGrowthRate lagged to break demand→capital cycle
 * - gdpPerCapita2025 captured from year 0 via closure
 * - carbonPrice + regionalCarbonPrice read from full params
 * - Metrics computation ported from simulation.ts
 * - YearResult mapping from autowire outputs
 */

import { runAutowired, getOutputsAtYear, AutowireResult, AnyModule, requireOutput, optionalOutput } from 'tsimulation';
import { computeEnergySystemOverhead } from './standard-collectors.js';
import { demographicsModule } from './modules/demographics.js';
import { productionModule } from './modules/production.js';
import { demandModule, gdpWeightedIntensityDecline } from './modules/demand.js';
import { capitalModule } from './modules/capital.js';
import { generationsModule } from './modules/generations.js';
import { energyModule } from './modules/energy.js';
import { dispatchModule } from './modules/dispatch.js';
// expansion module dissolved into demand + production
import { resourcesModule } from './modules/resources.js';
import { cdrModule } from './modules/cdr.js';
import { climateModule } from './modules/climate.js';
import { Region, REGIONS, EnergySource, ENERGY_SOURCES } from './domain-types.js';
import { GDP_SHARES } from './primitives/distribute.js';
import type { SimulationParams, YearResult, SimulationMetrics, SimulationResult } from './simulation.js';

// =============================================================================
// MODULES
// =============================================================================

export const ALL_MODULES: AnyModule[] = [
  demographicsModule,
  productionModule,
  demandModule,
  capitalModule,
  generationsModule,
  energyModule,
  dispatchModule,
  resourcesModule,
  cdrModule,
  climateModule,
];

// =============================================================================
// BUILD TRANSFORMS AND LAGS
// =============================================================================

/**
 * Build transforms with proper parameter access.
 * Closure captures merged energy params for carbonPrice/regionalCarbonPrice.
 */
function buildTransforms(mergedEnergyParams: any) {
  // Mutable closure: captures gdpPerCapita2025 on first year
  let capturedGdpPerCapita2025 = 0;

  return {
    // Energy needs availableInvestment (from capital.energyInvestment)
    availableInvestment: {
      fn: (outputs: Record<string, any>) => requireOutput(outputs, 'energyInvestment', 'availableInvestment'),
      dependsOn: ['energyInvestment'],
    },

    // Resources needs gdpPerCapita (derived)
    gdpPerCapita: {
      fn: (outputs: Record<string, any>) => {
        const gdp = requireOutput<number>(outputs, 'gdp', 'gdpPerCapita');
        const pop = requireOutput<number>(outputs, 'population', 'gdpPerCapita');
        return (gdp * 1e12) / pop;
      },
      dependsOn: ['gdp', 'population'],
    },

    // Resources needs gdpPerCapita2025 (captured from year 0)
    gdpPerCapita2025: {
      fn: (outputs: Record<string, any>, _year: number, yearIndex: number) => {
        if (yearIndex === 0) {
          const gdp = requireOutput<number>(outputs, 'gdp', 'gdpPerCapita2025');
          const pop = requireOutput<number>(outputs, 'population', 'gdpPerCapita2025');
          capturedGdpPerCapita2025 = (gdp * 1e12) / pop;
        }
        return capturedGdpPerCapita2025;
      },
      dependsOn: ['gdp', 'population'],
    },

    // Climate needs total emissions (electricity + non-electric + land use - CDR)
    emissions: {
      fn: (outputs: Record<string, any>) => {
        const elecEmissions = requireOutput<number>(outputs, 'electricityEmissions', 'emissions');
        const nonElecEmissions = requireOutput<number>(outputs, 'nonElectricEmissions', 'emissions');
        const carbon = requireOutput<Record<string, any>>(outputs, 'carbon', 'emissions');
        const landUse = carbon.netFlux ?? 0;  // Legitimately zero when no land-use change
        const cdrRemoval = optionalOutput(outputs, 'cdrRemovalGtCO2', 0);  // Zero before CDR activates
        return elecEmissions + nonElecEmissions + landUse - cdrRemoval;
      },
      dependsOn: ['electricityEmissions', 'nonElectricEmissions', 'carbon', 'cdrRemovalGtCO2'],
    },

    // Dispatch needs carbonPrice (from energy params)
    carbonPrice: {
      fn: () => mergedEnergyParams.carbonPrice,
      dependsOn: [],
    },

    // Resources needs transport electrification for EV battery mineral demand
    transportElectrification: {
      fn: (outputs: Record<string, any>) => {
        const sectors = requireOutput<Record<string, any>>(outputs, 'sectors', 'transportElectrification');
        return sectors.transport?.electrificationRate ?? 0;
      },
      dependsOn: ['sectors'],
    },

    // Cycle-breaker: reads current-year dispatch+energy outputs that may not exist yet
    // Uses optionalOutput because dispatch/energy haven't run yet when this is evaluated
    weightedAverageLCOE: {
      fn: (outputs: Record<string, any>) => {
        const generation = optionalOutput<Record<string, number> | null>(outputs, 'generation', null);
        const lcoes = optionalOutput<Record<string, number> | null>(outputs, 'lcoes', null);
        if (!generation || !lcoes) return 50;
        let totalGen = 0;
        let weightedSum = 0;
        // ENERGY_SOURCES covers the 7 primary sources (solar, wind, nuclear, etc.)
        for (const source of ENERGY_SOURCES) {
          const gen = generation[source] ?? 0;
          const lcoe = lcoes[source] ?? 50;
          totalGen += gen;
          weightedSum += gen * lcoe;
        }
        // Include solarPlusBattery separately — its generation represents the
        // battery-backed portion of solar, with a higher LCOE than bare solar.
        // Without this, the average is biased low when storage is a large share.
        const spbGen = generation['solarPlusBattery'] ?? 0;
        const spbLcoe = outputs.solarPlusBatteryLCOE ?? 50;
        totalGen += spbGen;
        weightedSum += spbGen * spbLcoe;
        return totalGen > 0 ? weightedSum / totalGen : 50;
      },
      dependsOn: [],
    },

    // Cycle-breaker: reads current-year dispatch+energy outputs that may not exist yet
    // Uses optionalOutput because dispatch/energy haven't run yet when this is evaluated
    netEnergyFactorComputed: {
      fn: (outputs: Record<string, any>) => {
        const generation = optionalOutput<Record<string, number> | null>(outputs, 'generation', null);
        const netEnergyFraction = optionalOutput<Record<string, number> | null>(outputs, 'netEnergyFraction', null);
        if (!generation || !netEnergyFraction) return 1;
        let grossElectricity = 0;
        let netElectricity = 0;
        for (const [source, gen] of Object.entries(generation)) {
          const g = gen as number;
          if (g <= 0) continue;
          const energySource = source === 'solarPlusBattery' ? 'solar' : source;
          const fraction = netEnergyFraction[energySource] ?? 1;
          grossElectricity += g;
          netElectricity += g * fraction;
        }
        return grossElectricity > 0
          ? Math.max(0, Math.min(1, netElectricity / grossElectricity))
          : 1;
      },
      dependsOn: [],  // No deps to avoid cycle - uses current year's outputs
    },

    // Regional electricity demand from demand module
    regionalElectricityDemand: {
      fn: (outputs: Record<string, any>) => {
        const regional = requireOutput<Record<string, any>>(outputs, 'regional', 'regionalElectricityDemand');
        const result = {} as Record<Region, number>;
        for (const r of REGIONS) result[r] = regional[r]?.electricityDemand ?? 0;
        return result;
      },
      dependsOn: ['regional'],
    },

    // Regional investment from capital (weighted by savings rate × GDP share)
    regionalInvestment: {
      fn: (outputs: Record<string, any>) => {
        const investment = requireOutput<number>(outputs, 'investment', 'regionalInvestment');
        const regionalSavings = requireOutput<Record<Region, number>>(outputs, 'regionalSavings', 'regionalInvestment');
        // Weight by savings rate × GDP share (proxy for savings amount)
        let totalWeight = 0;
        const weights: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          weights[r] = (regionalSavings[r] ?? 0) * GDP_SHARES[r];
          totalWeight += weights[r];
        }
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          result[r] = totalWeight > 0 ? investment * (weights[r] / totalWeight) : investment / REGIONS.length;
        }
        return result;
      },
      dependsOn: ['investment', 'regionalSavings'],
    },

    // Regional carbon prices from energy params
    regionalCarbonPrice: {
      fn: () => {
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          result[r] = mergedEnergyParams.regional[r].carbonPrice;
        }
        return result;
      },
      dependsOn: [],
    },

    // Cycle-breaker: reads current-year energy outputs that may not exist yet
    // Uses optionalOutput because energy hasn't run yet when production needs this
    energySystemOverheadComputed: {
      fn: (outputs: Record<string, any>) => computeEnergySystemOverhead(
        optionalOutput<Record<string, number> | null>(outputs, 'additions', null),
        optionalOutput<Record<string, number> | null>(outputs, 'capacities', null),
      ),
      dependsOn: [],
    },

    // Regional GDP for capital module intergenerational transfers
    regionalGdp: {
      fn: (outputs: Record<string, any>) => {
        const regional = requireOutput<Record<string, any>>(outputs, 'regional', 'regionalGdp');
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) result[r] = regional[r]?.gdp ?? 0;
        return result;
      },
      dependsOn: ['regional'],
    },

    // Regional GDP per capita for climate adaptation
    regionalGdpPerCapita: {
      fn: (outputs: Record<string, any>) => {
        const regional = requireOutput<Record<string, any>>(outputs, 'regional', 'regionalGdpPerCapita');
        const regionalPop = requireOutput<Record<Region, number>>(outputs, 'regionalPopulation', 'regionalGdpPerCapita');
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          const gdp = regional[r]?.gdp ?? 0;
          const pop = regionalPop[r] ?? 1;
          result[r] = (gdp * 1e12) / pop;
        }
        return result;
      },
      dependsOn: ['regional', 'regionalPopulation'],
    },

    // Cycle-breaker: reads current-year climate+demand outputs that may not exist yet
    // Uses optionalOutput because climate/demand outputs aren't available for this transform
    gdpWeightedDamages: {
      fn: (outputs: Record<string, any>) => {
        const regionalDamages = optionalOutput<Record<Region, number> | null>(outputs, 'regionalDamages', null);
        const regional = optionalOutput<Record<string, any> | null>(outputs, 'regional', null);
        if (!regionalDamages || !regional) return 0;
        let totalGdp = 0;
        let weightedSum = 0;
        for (const r of REGIONS) {
          const gdp = regional[r]?.gdp ?? 0;
          totalGdp += gdp;
          weightedSum += (regionalDamages[r] ?? 0) * gdp;
        }
        return totalGdp > 0 ? weightedSum / totalGdp : 0;
      },
      dependsOn: [],
    },
  };
}

/**
 * Default capacity factors for totalGeneration and regionalFossilShare derivation.
 */
const DEFAULT_CAPACITY_FACTORS: Record<EnergySource, number> = {
  solar: 0.20, wind: 0.30, gas: 0.50, coal: 0.50,
  nuclear: 0.83, hydro: 0.38, battery: 0,
};

const FOSSIL_SOURCES: EnergySource[] = ['gas', 'coal'];

/**
 * Build lag configurations, deriving initial values from params where possible.
 *
 * Three categories of lag initialization:
 * 1. STOCKS (capitalStock, temperature, laggedGdp, robotsPer1000): calibrated
 *    end-of-2024 levels — never bootstrap (a warm-up value would inject a
 *    one-year-forward bias).
 * 2. FLOWS with a calibrated 2025 observable (dataCenterLoadTWh): keep the
 *    observed anchor as initial; bootstrap optional but the anchor is better.
 * 3. FLOWS without a reliable hand value (generation, non-electric energy,
 *    overheads, damages, prices, rates): bootstrap: true — the warm-up pass
 *    (bootstrapLags below) replaces the initial with the year-0
 *    self-consistent value, so the listed initial is only a warm-up seed.
 */
function buildLags(params: SimulationParams) {
  const mergedClimate = climateModule.mergeParams(params.climate ?? {});
  const mergedCapital = capitalModule.mergeParams(params.capital ?? {});
  const mergedEnergy = energyModule.mergeParams(params.energy ?? {});
  const mergedDemand = demandModule.mergeParams(params.demand ?? {});

  // Derive totalGeneration from capacity2025 × CF × 8760 / 1000
  let totalGen = 0;
  const regionalFossilShareInit: Record<string, number> = {};
  for (const region of REGIONS) {
    let regionTotal = 0;
    let regionFossil = 0;
    const regionalCFs = mergedEnergy.regional[region].capacityFactor ?? {};
    for (const source of ENERGY_SOURCES) {
      if (source === 'battery') continue;
      const cap = mergedEnergy.sources[source].capacity2025[region] ?? 0;
      const cf = regionalCFs[source] ?? DEFAULT_CAPACITY_FACTORS[source];
      const gen = (cap * cf * 8760) / 1000;
      regionTotal += gen;
      if (FOSSIL_SOURCES.includes(source)) regionFossil += gen;
    }
    totalGen += regionTotal;
    regionalFossilShareInit[region] = regionTotal > 0 ? regionFossil / regionTotal : 0.5;
  }

  return {
    // Demand needs lagged climate damages
    regionalDamages: {
      source: 'regionalDamages',
      delay: 1,
      initial: Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>,
      bootstrap: true,
    },

    // Production needs lagged energy burden damage (from demand.burdenDamage)
    energyBurdenDamage: {
      source: 'burdenDamage',
      delay: 1,
      initial: 0,
      bootstrap: true,
    },

    // Capital needs lagged GDP-weighted damages (matches manual path)
    damages: {
      source: 'gdpWeightedDamages',
      delay: 1,
      initial: 0,
      bootstrap: true,
    },

    // Resources needs lagged temperature
    temperature: {
      source: 'temperature',
      delay: 1,
      initial: mergedClimate.currentTemp,
    },

    // Demand needs lagged average LCOE for cost-driven electrification
    laggedAvgLCOE: {
      source: 'weightedAverageLCOE',
      delay: 1,
      initial: 50,  // No direct param source; 50 $/MWh is reasonable default
      bootstrap: true,
    },

    // Capital needs lagged net energy factor (from computed transform)
    netEnergyFactor: {
      source: 'netEnergyFactorComputed',
      delay: 1,
      initial: 1,
      bootstrap: true,
    },

    // Production needs lagged capital stock
    capitalStock: {
      source: 'stock',
      delay: 1,
      initial: mergedCapital.initialCapitalStock,
    },

    // Production and demand both read lagged total generation through this
    // lag (demand prices electricity on last year's served generation —
    // dispatch runs after demand, so the current-year value can't exist yet)
    totalGeneration: {
      source: 'totalGeneration',
      delay: 1,
      initial: totalGen,
      bootstrap: true,
    },

    // Production needs lagged non-electric energy
    nonElectricEnergy: {
      source: 'nonElectricEnergy',
      delay: 1,
      initial: 92000,  // ~92,000 TWh in 2025 (IEA); no direct param source
      bootstrap: true,
    },

    // Production needs lagged food stress
    foodStress: {
      source: 'foodStress',
      delay: 1,
      initial: 0,
      bootstrap: true,
    },

    // Production needs lagged resource energy
    resourceEnergy: {
      source: 'totalResourceEnergy',
      delay: 1,
      initial: 0,
      bootstrap: true,
    },

    // Production needs lagged energy system overhead (embodied + operating)
    energySystemOverhead: {
      source: 'energySystemOverheadComputed',
      delay: 1,
      initial: 0,
      bootstrap: true,
    },

    // Production needs lagged CDR energy consumption (CDR competes for electricity)
    cdrEnergy: {
      source: 'cdrEnergyTWh',
      delay: 1,
      initial: 0,
      bootstrap: true,
    },

    // Production needs lagged automation levels for the labor-augmentation
    // payoff and the intermediate-consumption energy subtraction (demand
    // runs after production)
    robotsPer1000: {
      source: 'robotsPer1000',
      delay: 1,
      initial: mergedDemand.robotBaseline2025,
    },
    robotLoadTWh: {
      source: 'robotLoadTWh',
      delay: 1,
      initial: 0,
      bootstrap: true, // flow: warm-up sets the 2025-consistent fleet load
    },

    // Capital debits REALIZED spends (one financing ledger): energy capex
    // from energy, CDR spend from cdr, robot fleet capex from demand.
    // Delay-1 caveat: the debit trails the build by one year (over-credits
    // K during fast capex growth; final horizon year never debited)
    energyCapexSpend: {
      source: 'energyCapexSpend',
      delay: 1,
      initial: 0,
      bootstrap: true,
    },
    cdrSpend: {
      source: 'cdrAnnualSpend',
      delay: 1,
      initial: 0,
      bootstrap: true,
    },
    robotCapexSpend: {
      source: 'robotCapexSpend',
      delay: 1,
      initial: 0,
      bootstrap: true,
    },
    dataCenterLoadTWh: {
      source: 'dataCenterLoadTWh',
      delay: 1,
      initial: mergedDemand.dataCenterBaseline2025,
    },

    // Energy needs lagged mineral constraint (resources runs after energy in topo order)
    mineralConstraint: {
      source: 'mineralConstraint',
      delay: 1,
      initial: 1.0,  // warm-up seed (bootstrapped)
      bootstrap: true,
    },

    // Energy needs lagged curtailment rate (dispatch runs after energy)
    laggedCurtailmentRate: {
      source: 'curtailmentRate',
      delay: 1,
      initial: 0,  // warm-up seed (bootstrapped)
      bootstrap: true,
    },

    // Energy + CDR need lagged interest rate (capital runs before energy)
    laggedInterestRate: {
      source: 'interestRate',
      delay: 1,
      initial: 0.05,  // ~5% initial real rate
      bootstrap: true,
    },

    // CDR needs lagged GDP for damage-flow growth in the SCC annuity
    laggedGdp: {
      source: 'gdp',
      delay: 1,
      initial: 155,  // ~2024 GDP ($T), consistent with ~2% trend into the 2025 anchor
    },

    // Demand needs lagged regional fossil share (for energy cost → GDP share feedback)
    regionalFossilShare: {
      source: 'regionalFossilShare',
      delay: 1,
      initial: regionalFossilShareInit as Record<Region, number>,
      bootstrap: true,
    },
  };
}

// =============================================================================
// RUN SIMULATION
// =============================================================================

/**
 * Run autowired simulation with full SimulationParams support.
 */
export function runAutowiredSimulation(
  params: SimulationParams = {},
  options?: { trackReads?: boolean }
): AutowireResult {
  // Merge energy params to read carbon prices
  const mergedEnergyParams = energyModule.mergeParams(params.energy ?? {});

  const transforms = buildTransforms(mergedEnergyParams);
  const lags = buildLags(params);

  // Couple production's efficiency-index growth to demand's EFFECTIVE
  // autonomous intensity decline: the GDP-weighted regional rate times the
  // top-level efficiencyMultiplier that scenarios use. Demand decays final
  // energy at intensityDecline x efficiencyMultiplier; production's eta must
  // rise at the same rate or the "one efficiency series, two views" invariant
  // silently re-splits when efficiencyMultiplier != 1 — an artifact worth a
  // ~3.6x GDP swing across the 8 scenarios that set it (higher efficiency
  // would otherwise DESTROY GDP through E^gamma with no offsetting eta gain).
  // An explicit production.serviceEfficiencyGrowth override still wins.
  const mergedDemandParams = demandModule.mergeParams(params.demand ?? {});
  const coupledProduction = { ...(params.production ?? {}) };
  coupledProduction.serviceEfficiencyGrowth ??=
    gdpWeightedIntensityDecline(mergedDemandParams.regions) * mergedDemandParams.efficiencyMultiplier;
  // The structural-decay shape must match demand's so the two views of the
  // one efficiency series decay together (a mismatch re-splits them and
  // collapses GDP at high efficiencyMultiplier). Injected unless overridden.
  coupledProduction.structuralEfficiencyShare ??= mergedDemandParams.structuralEfficiencyShare;
  coupledProduction.structuralDecayHalfLife ??= mergedDemandParams.structuralDecayHalfLife;

  // Couple CDR's TCRE (the warming/GtCO2 its SCC gate values) to climate's
  // sensitivity: the emergent 75-yr TCRE scales ~linearly with sensitivity
  // (0.00058 at 3.0, 0.00088 at 4.5). Without this, high-sensitivity /
  // climate-cascade ran the SCC gate at the 3.0-sensitivity damage while
  // realized warming was 4.5 — silently under-valuing CDR ~50%. Explicit
  // cdr.tcre overrides still win.
  const mergedClimateParams = climateModule.mergeParams(params.climate ?? {});
  const coupledCdr = { ...(params.cdr ?? {}) };
  coupledCdr.tcre ??= cdrModule.mergeParams({}).tcre * (mergedClimateParams.sensitivity / 3.0);

  return runAutowired({
    modules: ALL_MODULES,
    transforms,
    lags,
    params: {
      demographics: params.demographics,
      production: coupledProduction,
      demand: params.demand,
      capital: params.capital,
      generations: params.generations,
      energy: params.energy,
      dispatch: params.dispatch,
      resources: params.resources,
      cdr: coupledCdr,
      climate: params.climate,
    },
    startYear: params.startYear ?? 2025,
    endYear: params.endYear ?? 2100,
    trackReads: options?.trackReads,
    // Fixed-point warm-up: flow lags (generation, non-electric energy,
    // overheads, damages, prices) get their year-0 self-consistent values
    // instead of hand-guessed constants — kills the spurious -5.5% GDP step
    // the old initials produced in the first simulated year.
    bootstrapLags: 2,
  });
}

// =============================================================================
// YEAR RESULT MAPPING
// =============================================================================

/**
 * Convert autowire result to flat YearResult array (matches simulation.ts output).
 */
export function toYearResults(result: AutowireResult): YearResult[] {
  const yearResults: YearResult[] = [];

  for (let i = 0; i < result.years.length; i++) {
    const o = getOutputsAtYear(result, i);

    yearResults.push({
      year: result.years[i],

      // Demographics
      population: o.population,
      working: o.working,
      dependency: o.dependency,
      effectiveWorkers: o.effectiveWorkers,
      collegeShare: o.collegeShare,

      // Demand
      gdp: o.gdp,
      electricityDemand: o.electricityDemand,
      electrificationRate: o.electrificationRate,
      totalFinalEnergy: o.totalFinalEnergy,
      nonElectricEnergy: o.nonElectricEnergy,
      finalEnergyPerCapitaDay: o.finalEnergyPerCapitaDay,

      // Sectors
      transportElectrification: o.sectors?.transport?.electrificationRate ?? 0,
      buildingsElectrification: o.sectors?.buildings?.electrificationRate ?? 0,
      industryElectrification: o.sectors?.industry?.electrificationRate ?? 0,

      // Fuels
      oilConsumption: o.fuels?.oil ?? 0,
      gasConsumption: o.fuels?.gas ?? 0,
      coalConsumption: o.fuels?.coal ?? 0,
      hydrogenConsumption: o.fuels?.hydrogen ?? 0,

      // Non-electric emissions
      nonElectricEmissions: o.nonElectricEmissions,

      // Energy burden
      totalEnergyCost: o.totalEnergyCost,
      energyBurden: o.energyBurden,
      burdenDamage: o.burdenDamage,

      // Useful work
      usefulWorkGrowthRate: o.usefulWorkGrowthRate ?? 0,

      // Capital
      capitalStock: o.stock,
      investment: o.investment,
      savingsRate: o.savingsRate,
      regionalSavings: o.regionalSavings,
      stability: o.stability,
      interestRate: o.interestRate,
      robotsDensity: o.robotsDensity,
      automationShare: o.automationShare,
      capitalOutputRatio: o.capitalOutputRatio,
      capitalGrowthRate: o.capitalGrowthRate,
      retireeCost: o.retireeCost ?? 0,
      childCost: o.childCost ?? 0,
      transferBurden: o.transferBurden ?? 0,
      workerConsumption: o.workerConsumption ?? 0,
      publicDebtGDP: o.publicDebtGDP ?? 0,
      privateDebtGDP: o.privateDebtGDP ?? 0,
      totalDebtGDP: o.totalDebtGDP ?? 0,
      publicDebtService: o.publicDebtService ?? 0,
      creditImpulse: o.creditImpulse ?? 0,
      debtRiskPremium: o.debtRiskPremium ?? 0,

      // Five-year birth-cohort accounts
      cohortAccounts: o.cohortAccounts ?? {},
      regionalCohortAccounts: o.regionalCohortAccounts ??
        Object.fromEntries(REGIONS.map(r => [r, {}])),
      cohortDesiredCapital: o.cohortDesiredCapital ?? 0,
      cohortFundedCapital: o.cohortFundedCapital ?? 0,
      cohortFundingGap: o.cohortFundingGap ?? 0,
      aggregateCapitalFundingGap: o.aggregateCapitalFundingGap ?? 0,
      aggregateCapitalCoverage: o.aggregateCapitalCoverage ?? 1,
      cohortBorrowingLimitGap: o.cohortBorrowingLimitGap ?? 0,
      cohortCreditRationingGap: o.cohortCreditRationingGap ?? 0,
      constrainedWorkingShare: o.constrainedWorkingShare ?? 0,
      borrowingConstrainedWorkingShare: o.borrowingConstrainedWorkingShare ?? 0,
      cohortBequests: o.cohortBequests ?? 0,
      cohortAssets: o.cohortAssets ?? 0,
      cohortLiabilities: o.cohortLiabilities ?? 0,

      // Energy
      lcoes: o.lcoes,
      capacities: o.capacities,
      solarLCOE: o.lcoes?.solar ?? 0,
      windLCOE: o.lcoes?.wind ?? 0,
      batteryCost: o.batteryCost ?? 0,
      cheapestLCOE: o.cheapestLCOE ?? 0,
      solarPlusBatteryLCOE: o.solarPlusBatteryLCOE ?? 0,

      // Dispatch
      generation: o.generation,
      gridIntensity: o.gridIntensity,
      totalGeneration: o.totalGeneration,
      shortfall: o.shortfall,
      electricityEmissions: o.electricityEmissions,
      fossilShare: o.fossilShare,
      curtailmentTWh: o.curtailmentTWh,
      curtailmentRate: o.curtailmentRate,
      effectiveWACC: o.effectiveWACC ?? 0.07,

      // Climate
      temperature: o.temperature,
      co2ppm: o.co2ppm,
      equilibriumTemp: o.equilibriumTemp,
      damages: o.damages,
      cumulativeEmissions: o.cumulativeEmissions,
      deepOceanTemp: o.deepOceanTemp ?? 0,
      radiativeForcing: o.radiativeForcing ?? 0,

      // Ocean acidification
      oceanPH: o.oceanPH ?? 8.18,

      // Adaptation
      regionalAdaptation: o.regionalAdaptation ?? Object.fromEntries(REGIONS.map(r => [r, 0])),

      // Long-duration storage
      longStorageCost: o.longStorageCost ?? 300,
      longStorageCapacity: o.longStorageCapacity ?? 0,

      // Resources - Minerals
      copperDemand: o.minerals?.copper?.demand ?? 0,
      lithiumDemand: o.minerals?.lithium?.demand ?? 0,
      copperCumulative: o.minerals?.copper?.cumulative ?? 0,
      lithiumCumulative: o.minerals?.lithium?.cumulative ?? 0,

      // Resources - Land
      farmland: o.land?.farmland ?? 0,
      forest: o.land?.forest ?? 0,
      desert: o.land?.desert ?? 0,
      yieldDamageFactor: o.land?.yieldDamageFactor ?? 1,

      // Resources - Food
      proteinShare: o.food?.proteinShare ?? 0,
      grainEquivalent: o.food?.grainEquivalent ?? 0,
      foodStress: o.foodStress ?? 0,

      // Resources - Carbon
      forestNetFlux: o.carbon?.netFlux ?? 0,
      cumulativeSequestration: o.carbon?.cumulativeSequestration ?? 0,

      // CDR (Carbon Dioxide Removal)
      cdrRemoval: o.cdrRemovalGtCO2 ?? 0,
      cdrEnergyTWh: o.cdrEnergyTWh ?? 0,
      cdrCostPerTon: o.cdrCostPerTon ?? 400,
      cdrCumulative: o.cdrCumulative ?? 0,
      cdrCapacity: o.cdrCapacity ?? 0,
      cdrAnnualSpend: o.cdrAnnualSpend ?? 0,

      // Robot/automation (from demand, expansion dissolved)
      robotLoadTWh: o.robotLoadTWh ?? 0,
      robotsPer1000: o.robotsPer1000 ?? 0,

      // Datacenter / AI compute (from demand)
      dataCenterLoadTWh: o.dataCenterLoadTWh ?? 0,

      // Production (biophysical)
      productionUsefulEnergy: o.productionUsefulEnergy ?? 0,
      // Compute from energy module outputs (the transform output
      // energySystemOverheadComputed is only available via the lag mechanism)
      energySystemOverhead: computeEnergySystemOverhead(o.additions, o.capacities),

      // Mineral constraint
      mineralConstraint: o.mineralConstraint ?? 1.0,

      // Water stress
      waterStress: o.waterStress ?? Object.fromEntries(REGIONS.map(r => [r, 0])),
      waterYieldFactor: o.waterYieldFactor ?? 1,

      // Infrastructure lock-in
      fossilStockTWh: o.fossilStockTWh ?? 0,

      // Heat stress
      heatStressLoss: o.heatStressLoss ?? Object.fromEntries(REGIONS.map(r => [r, 0])),

      // Regional
      regionalPopulation: o.regionalPopulation,
      regionalGdp: (() => {
        const regional = o.regional;
        if (!regional) return Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>;
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) result[r] = regional[r]?.gdp ?? 0;
        return result;
      })(),

      // Regional Energy
      regionalCapacities: o.regionalCapacities,
      regionalAdditions: o.regionalAdditions,
      regionalWACC: o.regionalWACC,

      // Regional Dispatch
      regionalGeneration: o.regionalGeneration,
      regionalGridIntensity: o.regionalGridIntensity,
      regionalFossilShare: o.regionalFossilShare,
      regionalEmissions: o.regionalEmissions,
    });
  }

  return yearResults;
}

// =============================================================================
// METRICS
// =============================================================================

/**
 * Compute summary metrics from YearResult array.
 * Ported from simulation.ts calculateMetrics().
 */
export function computeMetrics(results: YearResult[]): SimulationMetrics {
  let peakPopulation = 0;
  let peakPopulationYear = 2025;
  for (const r of results) {
    if (r.population > peakPopulation) {
      peakPopulation = r.population;
      peakPopulationYear = r.year;
    }
  }

  let peakEmissions = 0;
  let peakEmissionsYear = 2025;
  for (const r of results) {
    const totalEmissions = r.electricityEmissions + r.nonElectricEmissions + r.forestNetFlux;
    if (totalEmissions > peakEmissions) {
      peakEmissions = totalEmissions;
      peakEmissionsYear = r.year;
    }
  }

  let solarCrossoverYear: number | null = null;
  let gridBelow100Year: number | null = null;
  for (const r of results) {
    if (solarCrossoverYear === null && r.solarLCOE < r.lcoes.gas) {
      solarCrossoverYear = r.year;
    }
    if (gridBelow100Year === null && r.gridIntensity < 100) {
      gridBelow100Year = r.year;
    }
  }

  const idx2050 = results.findIndex(r => r.year === 2050);
  const idx2100 = results.length - 1;

  return {
    peakPopulation,
    peakPopulationYear,
    population2100: results[idx2100].population,

    warming2050: idx2050 >= 0 ? results[idx2050].temperature : 0,
    warming2100: results[idx2100].temperature,
    peakEmissions,
    peakEmissionsYear,

    solarCrossoverYear,
    gridBelow100Year,
    fossilShareFinal: results[idx2100].fossilShare,

    gdp2050: idx2050 >= 0 ? results[idx2050].gdp : 0,
    gdp2100: results[idx2100].gdp,
    kY2050: idx2050 >= 0 ? results[idx2050].capitalStock / results[idx2050].gdp : 0,
  };
}

/**
 * Run autowired simulation and return full SimulationResult (matching simulation.ts).
 */
export function runAutowiredFull(params: SimulationParams = {}): SimulationResult {
  const autowireResult = runAutowiredSimulation(params);
  const results = toYearResults(autowireResult);
  const metrics = computeMetrics(results);
  return { years: autowireResult.years, results, metrics };
}

// =============================================================================
// CLI
// =============================================================================

function makeSampleYears(startYear: number, endYear: number): number[] {
  const years = [startYear];
  const span = endYear - startYear;
  if (span <= 25) {
    for (let y = startYear + 5; y <= endYear; y += 5) years.push(y);
  } else {
    years.push(startYear + 5, startYear + 15, startYear + 25);
    years.push(startYear + Math.round(span * 2 / 3));
    years.push(endYear);
  }
  return years.filter(y => y <= endYear);
}

if (process.argv[1]?.endsWith('simulation-autowired.ts') ||
    process.argv[1]?.endsWith('simulation-autowired.js')) {

  console.log('=== Autowired Simulation ===\n');

  try {
    const simResult = runAutowiredFull();
    const { results, metrics } = simResult;

    const startYear = results[0].year;
    const endYear = results[results.length - 1].year;
    const sampleYears = makeSampleYears(startYear, endYear);

    console.log('Year  Pop(B)  GDP($T)  Elec(TWh)  Temp(°C)  Grid(kg/MWh)  Solar$/MWh');
    console.log('----  ------  -------  ---------  --------  ------------  ----------');

    for (const r of results) {
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
    console.log(`Peak population: ${(metrics.peakPopulation / 1e9).toFixed(2)}B in ${metrics.peakPopulationYear}`);
    console.log(`Population 2100: ${(metrics.population2100 / 1e9).toFixed(2)}B`);
    console.log(`Warming 2050: ${metrics.warming2050.toFixed(2)}°C`);
    console.log(`Warming 2100: ${metrics.warming2100.toFixed(2)}°C`);
    console.log(`Peak emissions: ${metrics.peakEmissions.toFixed(1)} Gt in ${metrics.peakEmissionsYear}`);
    console.log(`Solar crosses gas: ${metrics.solarCrossoverYear ?? 'never'}`);
    console.log(`Grid < 100 kg/MWh: ${metrics.gridBelow100Year ?? 'never'}`);
    console.log(`GDP 2050: $${metrics.gdp2050.toFixed(0)}T`);
    console.log(`GDP 2100: $${metrics.gdp2100.toFixed(0)}T`);
    console.log(`K/Y 2050: ${metrics.kY2050.toFixed(2)}`);

  } catch (err) {
    console.error('Auto-wiring failed:', (err as Error).message);
    process.exit(1);
  }
}
