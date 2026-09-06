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
 */

import {
  runAutowired,
  type AutowireResult,
  type AnyModule,
  requireOutput,
  optionalOutput,
  auditConnectorContracts,
  collectResults,
  unitPort,
} from 'tsimulation';
import {
  CARBON_PORT,
  DEMAND_SECTORS_PORT,
  ENERGY_ADDITION_PORT,
  ENERGY_CAPACITY_PORT,
  ENERGY_LCOE_PORT,
  REGIONAL_DEMAND_PORT,
  REGIONAL_ENERGY_LCOE_PORT,
} from './port-schemas.js';
import { computeEnergySystemOverhead, standardCollectors } from './standard-collectors.js';
import { demographicsModule } from './modules/demographics.js';
import { productionModule } from './modules/production.js';
import { demandModule, gdpWeightedIntensityDecline } from './modules/demand.js';
import { capitalModule } from './modules/capital.js';
import { generationsModule } from './modules/generations.js';
import { humanCapitalModule } from './modules/human-capital.js';
import { energyModule } from './modules/energy.js';
import { dispatchModule } from './modules/dispatch.js';
// expansion module dissolved into demand + production
import { resourcesModule } from './modules/resources.js';
import { cdrModule } from './modules/cdr.js';
import { climateModule } from './modules/climate.js';
import { Region, REGIONS, EnergySource, ENERGY_SOURCES } from './domain-types.js';
import type { SimulationParams, RunOptions, YearResult, SimulationMetrics, SimulationResult } from './simulation.js';

// =============================================================================
// MODULES
// =============================================================================

export const ALL_MODULES: AnyModule[] = [
  demographicsModule,
  productionModule,
  demandModule,
  capitalModule,
  generationsModule,
  humanCapitalModule,
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
function buildTransforms(
  mergedEnergyParams: any,
  mergedProductionParams: any,
  mergedDemandParams: any
) {
  // Mutable closure: captures gdpPerCapita2025 on first year
  let capturedGdpPerCapita2025 = 0;

  return {
    // Energy needs availableInvestment (from capital.energyInvestment)
    availableInvestment: {
      fn: (outputs: Record<string, any>) => requireOutput(outputs, 'energyInvestment', 'availableInvestment'),
      dependsOn: ['energyInvestment'],
      inputTypes: { energyInvestment: unitPort('$T/year') },
      outputType: unitPort('$T/year'),
    },

    // Resources needs gdpPerCapita (derived)
    gdpPerCapita: {
      fn: (outputs: Record<string, any>) => {
        const gdp = requireOutput<number>(outputs, 'gdp', 'gdpPerCapita');
        const pop = requireOutput<number>(outputs, 'population', 'gdpPerCapita');
        return (gdp * 1e12) / pop;
      },
      dependsOn: ['gdp', 'population'],
      inputTypes: {
        gdp: unitPort('$T/year'),
        population: unitPort('people'),
      },
      outputType: unitPort('$/people/year'),
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
      inputTypes: {
        gdp: unitPort('$T/year'),
        population: unitPort('people'),
      },
      outputType: unitPort('$/people/year'),
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
      inputTypes: {
        electricityEmissions: unitPort('GtCO2/year'),
        nonElectricEmissions: unitPort('GtCO2/year'),
        carbon: CARBON_PORT,
        cdrRemovalGtCO2: unitPort('GtCO2/year'),
      },
      outputType: unitPort('GtCO2/year'),
    },

    // Dispatch needs carbonPrice (from energy params)
    carbonPrice: {
      fn: () => mergedEnergyParams.carbonPrice,
      dependsOn: [],
      inputTypes: {},
      outputType: unitPort('$/tCO2'),
    },

    // Demand's robot deployment rule needs the production-side payoff
    // (worker-equivalents per robot) to price the displacement business case.
    // Param injection, same pattern as carbonPrice.
    robotLaborEquivalent: {
      fn: () => mergedProductionParams.robotLaborEquivalent,
      dependsOn: [],
      inputTypes: {},
      outputType: unitPort('people/robot'),
    },

    // Regional GDP allocation uses the same labor exponent as aggregate
    // production rather than a separate heuristic coefficient.
    laborOutputElasticity: {
      fn: () => mergedProductionParams.beta,
      dependsOn: [],
      inputTypes: {},
      outputType: unitPort('fraction'),
    },

    // Regional energy expenditure as a share of regional GDP. This uses the
    // generation actually served, region-specific financing/carbon/resource
    // LCOEs, retail delivery, and the common delivered-fuel price. It is a
    // lag source because demand determines regional GDP before energy and
    // dispatch run; bootstrapLags makes the 2025 anchor self-consistent.
    regionalEnergyBurdenComputed: {
      fn: (outputs: Record<string, any>) => {
        const regional = requireOutput<Record<Region, any>>(
          outputs, 'regional', 'regionalEnergyBurdenComputed'
        );
        const generation = requireOutput<Record<Region, Record<string, number>>>(
          outputs, 'regionalGeneration', 'regionalEnergyBurdenComputed'
        );
        const regionalLCOEs = requireOutput<Record<Region, Record<EnergySource, number>>>(
          outputs, 'regionalLCOEs', 'regionalEnergyBurdenComputed'
        );
        const solarPlusBatteryLCOE = requireOutput<number>(
          outputs, 'solarPlusBatteryLCOE', 'regionalEnergyBurdenComputed'
        );
        const regionalFuelCost = requireOutput<Record<Region, number>>(
          outputs, 'regionalFuelCost', 'regionalEnergyBurdenComputed'
        );
        const sectors = requireOutput<Record<string, any>>(
          outputs, 'sectors', 'regionalEnergyBurdenComputed'
        );

        let deliveryWeight = 0;
        let deliveryCostSum = 0;
        for (const sector of ['transport', 'buildings', 'industry'] as const) {
          const rate = sectors[sector]?.electrificationRate ?? 0;
          const weight = mergedDemandParams.sectors[sector].share * rate;
          deliveryWeight += weight;
          deliveryCostSum += weight *
            mergedDemandParams.sectors[sector].electricityDeliveryCost;
        }
        const deliveryCost = deliveryWeight > 0
          ? deliveryCostSum / deliveryWeight
          : 0;
        const result = {} as Record<Region, number>;
        for (const region of REGIONS) {
          const regionGeneration = generation[region] ?? {};
          let electricityCost = 0;
          let servedGeneration = 0;
          for (const source of ENERGY_SOURCES) {
            // Battery energy is represented by solarPlusBattery; lcoes.battery
            // is $/kWh of capacity, not a generation LCOE.
            if (source === 'battery') continue;
            const generated = regionGeneration[source] ?? 0;
            servedGeneration += generated;
            electricityCost += generated * (regionalLCOEs[region]?.[source] ?? 50);
          }
          const solarStorageGeneration = regionGeneration.solarPlusBattery ?? 0;
          servedGeneration += solarStorageGeneration;
          electricityCost += solarStorageGeneration * solarPlusBatteryLCOE;
          electricityCost += servedGeneration * deliveryCost;

          const regionFuelCost = regionalFuelCost[region] ?? 0;
          const regionalGdp = regional[region]?.gdp ?? 0;
          result[region] = regionalGdp > 0
            ? electricityCost / 1e6 / regionalGdp + regionFuelCost / regionalGdp
            : 0;
        }
        return result;
      },
      dependsOn: [
        'regional', 'regionalGeneration', 'regionalLCOEs',
        'solarPlusBatteryLCOE', 'regionalFuelCost', 'sectors',
      ],
      inputTypes: {
        regional: REGIONAL_DEMAND_PORT,
        regionalGeneration: unitPort('TWh/year', 'nested-record'),
        regionalLCOEs: REGIONAL_ENERGY_LCOE_PORT,
        solarPlusBatteryLCOE: unitPort('$/MWh'),
        regionalFuelCost: unitPort('$T/year', 'record'),
        sectors: DEMAND_SECTORS_PORT,
      },
      outputType: unitPort('fraction', 'record'),
    },

    // Translate unserved regional electricity into a bounded output-level
    // factor using the aggregate production function's useful-energy
    // elasticity and exergy weights. A steady shortfall remains a level
    // loss; only a change in this factor changes regional growth.
    regionalReliabilityFactorComputed: {
      fn: (outputs: Record<string, any>) => {
        const regional = requireOutput<Record<Region, any>>(
          outputs, 'regional', 'regionalReliabilityFactorComputed'
        );
        const shortfallRate = requireOutput<Record<Region, number>>(
          outputs, 'regionalShortfallRate', 'regionalReliabilityFactorComputed'
        );
        const result = {} as Record<Region, number>;
        for (const region of REGIONS) {
          const electricity = Math.max(0, regional[region]?.electricityDemand ?? 0);
          const nonElectric = Math.max(0, regional[region]?.nonElectricEnergy ?? 0);
          const nonElectricPotential = Math.max(
            nonElectric,
            regional[region]?.nonElectricEnergyPotential ?? nonElectric,
          );
          const electricUseful = electricity * mergedProductionParams.electricExergy;
          const thermalUsefulPotential =
            nonElectricPotential * mergedProductionParams.thermalExergy;
          const totalUseful = electricUseful + thermalUsefulPotential;
          const lostThermalUseful =
            (nonElectricPotential - nonElectric) * mergedProductionParams.thermalExergy;
          const electricityUsefulShare = totalUseful > 0 ? electricUseful / totalUseful : 0;
          const electricLostUsefulShare = Math.min(
            0.95,
            Math.max(0, shortfallRate[region] ?? 0) * electricityUsefulShare
          );
          const thermalLostUsefulShare = totalUseful > 0
            ? lostThermalUseful / totalUseful
            : 0;
          const lostUsefulShare = Math.min(
            0.95,
            electricLostUsefulShare + thermalLostUsefulShare,
          );
          result[region] = Math.max(
            0.25,
            Math.pow(1 - lostUsefulShare, mergedProductionParams.gamma)
          );
        }
        return result;
      },
      dependsOn: ['regional', 'regionalShortfallRate'],
      inputTypes: {
        regional: REGIONAL_DEMAND_PORT,
        regionalShortfallRate: unitPort('fraction', 'record'),
      },
      outputType: unitPort('fraction', 'record'),
    },

    // Resources needs transport electrification for EV battery mineral demand
    transportElectrification: {
      fn: (outputs: Record<string, any>) => {
        const sectors = requireOutput<Record<string, any>>(outputs, 'sectors', 'transportElectrification');
        return sectors.transport?.electrificationRate ?? 0;
      },
      dependsOn: ['sectors'],
      inputTypes: {
        sectors: DEMAND_SECTORS_PORT,
      },
      outputType: unitPort('fraction'),
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
      inputTypes: {
        generation: unitPort('TWh/year', 'record'),
        lcoes: ENERGY_LCOE_PORT,
        solarPlusBatteryLCOE: unitPort('$/MWh'),
      },
      outputType: unitPort('$/MWh'),
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
      inputTypes: {
        generation: unitPort('TWh/year', 'record'),
        netEnergyFraction: unitPort('fraction', 'record'),
      },
      outputType: unitPort('fraction'),
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
      inputTypes: {
        regional: REGIONAL_DEMAND_PORT,
      },
      outputType: unitPort('TWh/year', 'record'),
    },

    // Regional investment allocation (weighted by desired saving propensity
    // × GDP share). This is a geographic allocation heuristic, not the macro
    // funding closure: aggregate investment is already determined upstream by
    // firm orders, internal funds, and bank credit.
    regionalInvestment: {
      fn: (outputs: Record<string, any>) => {
        const investment = requireOutput<number>(outputs, 'investment', 'regionalInvestment');
        const regionalSavings = requireOutput<Record<Region, number>>(outputs, 'regionalSavings', 'regionalInvestment');
        const regional = requireOutput<Record<Region, any>>(
          outputs, 'regional', 'regionalInvestment'
        );
        // The regional propensity is a dimensionless allocation weight, so it
        // scales with current regional GDP—not a fixed 2025 lookup table.
        let totalWeight = 0;
        const weights: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          weights[r] = (regionalSavings[r] ?? 0) * Math.max(0, regional[r]?.gdp ?? 0);
          totalWeight += weights[r];
        }
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          result[r] = totalWeight > 0 ? investment * (weights[r] / totalWeight) : investment / REGIONS.length;
        }
        return result;
      },
      dependsOn: ['investment', 'regionalSavings', 'regional'],
      inputTypes: {
        investment: unitPort('$T/year'),
        regionalSavings: unitPort('fraction', 'record'),
        regional: REGIONAL_DEMAND_PORT,
      },
      outputType: unitPort('$T/year', 'record'),
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
      inputTypes: {},
      outputType: unitPort('$/tCO2', 'record'),
    },

    // Cycle-breaker: reads current-year energy outputs that may not exist yet
    // Uses optionalOutput because energy hasn't run yet when production needs this
    energySystemOverheadComputed: {
      fn: (outputs: Record<string, any>) => computeEnergySystemOverhead(
        optionalOutput<Record<string, number> | null>(outputs, 'additions', null),
        optionalOutput<Record<string, number> | null>(outputs, 'capacities', null),
      ),
      dependsOn: [],
      inputTypes: {
        additions: ENERGY_ADDITION_PORT,
        capacities: ENERGY_CAPACITY_PORT,
      },
      outputType: unitPort('TWh/year'),
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
      inputTypes: {
        regional: REGIONAL_DEMAND_PORT,
      },
      outputType: unitPort('$T/year', 'record'),
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
      inputTypes: {
        regional: REGIONAL_DEMAND_PORT,
        regionalPopulation: unitPort('people', 'record'),
      },
      outputType: unitPort('$/people/year', 'record'),
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
      inputTypes: {
        regionalDamages: unitPort('fraction', 'record'),
        regional: REGIONAL_DEMAND_PORT,
      },
      outputType: unitPort('fraction'),
    },
  };
}

/** Default capacity factors for the initial total-generation lag. */
const DEFAULT_CAPACITY_FACTORS: Record<EnergySource, number> = {
  solar: 0.20, wind: 0.30, gas: 0.50, coal: 0.50,
  nuclear: 0.83, hydro: 0.38, battery: 0,
};

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
  for (const region of REGIONS) {
    let regionTotal = 0;
    const regionalCFs = mergedEnergy.regional[region].capacityFactor ?? {};
    for (const source of ENERGY_SOURCES) {
      if (source === 'battery') continue;
      const cap = mergedEnergy.sources[source].capacity2025[region] ?? 0;
      const cf = regionalCFs[source] ?? DEFAULT_CAPACITY_FACTORS[source];
      const gen = (cap * cf * 8760) / 1000;
      regionTotal += gen;
    }
    totalGen += regionTotal;
  }

  return {
    // Demand needs lagged climate damages
    regionalDamages: {
      source: 'regionalDamages',
      delay: 1,
      initial: Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>,
      contract: unitPort('fraction', 'record'),
      bootstrap: true,
    },

    // Production needs lagged energy burden damage (from demand.burdenDamage)
    energyBurdenDamage: {
      source: 'burdenDamage',
      delay: 1,
      initial: 0,
      contract: unitPort('fraction'),
      bootstrap: true,
    },

    // Capital needs lagged GDP-weighted damages (matches manual path)
    damages: {
      source: 'gdpWeightedDamages',
      delay: 1,
      initial: 0,
      contract: unitPort('fraction'),
      bootstrap: true,
    },

    // Resources needs lagged temperature
    temperature: {
      source: 'temperature',
      delay: 1,
      initial: mergedClimate.currentTemp,
      contract: unitPort('Δ°C'),
    },

    // Demand needs lagged average LCOE for cost-driven electrification
    laggedAvgLCOE: {
      source: 'weightedAverageLCOE',
      delay: 1,
      initial: 50,  // No direct param source; 50 $/MWh is reasonable default
      contract: unitPort('$/MWh'),
      bootstrap: true,
    },

    // Capital needs lagged net energy factor (from computed transform)
    netEnergyFactor: {
      source: 'netEnergyFactorComputed',
      delay: 1,
      initial: 1,
      contract: unitPort('fraction'),
      bootstrap: true,
    },

    // Production needs lagged capital stock
    capitalStock: {
      source: 'stock',
      delay: 1,
      initial: mergedCapital.initialCapitalStock,
      contract: unitPort('$T'),
    },

    // Production and demand both read lagged total generation through this
    // lag (demand prices electricity on last year's served generation —
    // dispatch runs after demand, so the current-year value can't exist yet)
    totalGeneration: {
      source: 'totalGeneration',
      delay: 1,
      initial: totalGen,
      contract: unitPort('TWh/year'),
      bootstrap: true,
    },

    // Production receives POTENTIAL lagged thermal energy, then applies any
    // current calendar-year physical shock itself. This prevents the same
    // one-year disruption from being counted again after it ends.
    nonElectricEnergy: {
      source: 'nonElectricEnergyPotential',
      delay: 1,
      initial: 92000,  // ~92,000 TWh in 2025 (IEA); no direct param source
      contract: unitPort('TWh/year'),
      bootstrap: true,
    },

    // Production needs lagged food stress
    foodStress: {
      source: 'foodStress',
      delay: 1,
      initial: 0,
      contract: unitPort('fraction'),
      bootstrap: true,
    },

    // Production needs lagged resource energy
    resourceEnergy: {
      source: 'totalResourceEnergy',
      delay: 1,
      initial: 0,
      contract: unitPort('TWh/year'),
      bootstrap: true,
    },

    // Production needs lagged energy system overhead (embodied + operating)
    energySystemOverhead: {
      source: 'energySystemOverheadComputed',
      delay: 1,
      initial: 0,
      contract: unitPort('TWh/year'),
      bootstrap: true,
    },

    // Production needs lagged CDR energy consumption (CDR competes for electricity)
    cdrEnergy: {
      source: 'cdrEnergyTWh',
      delay: 1,
      initial: 0,
      contract: unitPort('TWh/year'),
      bootstrap: true,
    },

    // Production needs lagged automation levels for the labor-augmentation
    // payoff and the intermediate-consumption energy subtraction (demand
    // runs after production)
    robotsPer1000: {
      source: 'robotsPer1000',
      delay: 1,
      initial: mergedDemand.robotBaseline2025,
      contract: unitPort('robot/kpeople'),
    },
    robotLoadTWh: {
      source: 'robotLoadTWh',
      delay: 1,
      initial: 0,
      contract: unitPort('TWh/year'),
      bootstrap: true, // flow: warm-up sets the 2025-consistent fleet load
    },

    // Capital debits REALIZED spends (one financing ledger): energy capex
    // from energy, CDR spend from cdr, and robot/DC capex from demand.
    // Delay-1 caveat: the debit trails the build by one year (over-credits
    // K during fast capex growth; final horizon year never debited)
    energyCapexSpend: {
      source: 'energyCapexSpend',
      delay: 1,
      initial: 0,
      contract: unitPort('$T/year'),
      bootstrap: true,
    },
    cdrSpend: {
      source: 'cdrAnnualSpend',
      delay: 1,
      initial: 0,
      contract: unitPort('$T/year'),
      bootstrap: true,
    },
    robotCapexSpend: {
      source: 'robotCapexSpend',
      delay: 1,
      initial: 0,
      contract: unitPort('$T/year'),
      bootstrap: true,
    },
    dataCenterCapexSpend: {
      source: 'dataCenterCapexSpend',
      delay: 1,
      initial: 0,
      contract: unitPort('$T/year'),
      bootstrap: true,
    },
    dataCenterLoadTWh: {
      source: 'dataCenterLoadTWh',
      delay: 1,
      initial: mergedDemand.dataCenterBaseline2025,
      contract: unitPort('TWh/year'),
    },

    // Energy needs lagged mineral constraint (resources runs after energy in topo order)
    mineralConstraint: {
      source: 'mineralConstraint',
      delay: 1,
      initial: 1.0,  // warm-up seed (bootstrapped)
      contract: unitPort('fraction'),
      bootstrap: true,
    },

    // Energy needs lagged curtailment rate (dispatch runs after energy)
    laggedCurtailmentRate: {
      source: 'curtailmentRate',
      delay: 1,
      initial: 0,  // warm-up seed (bootstrapped)
      contract: unitPort('fraction'),
      bootstrap: true,
    },

    // Energy + CDR need lagged interest rate (capital runs before energy)
    laggedInterestRate: {
      source: 'interestRate',
      delay: 1,
      initial: 0.05,  // ~5% initial real rate
      contract: unitPort('fraction'),
      bootstrap: true,
    },

    // CDR needs lagged GDP for damage-flow growth in the SCC annuity
    laggedGdp: {
      source: 'gdp',
      delay: 1,
      initial: 155,  // ~2024 GDP ($T), consistent with ~2% trend into the 2025 anchor
      contract: unitPort('$T/year'),
    },

    // Regional GDP allocation needs the prior year's actual energy burden
    // and reliability. Both are flow conditions, so bootstrap the observed
    // 2025 anchor instead of applying a guessed first-year shock.
    regionalEnergyBurden: {
      source: 'regionalEnergyBurdenComputed',
      delay: 1,
      initial: Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>,
      contract: unitPort('fraction', 'record'),
      bootstrap: true,
    },
    regionalReliabilityFactor: {
      source: 'regionalReliabilityFactorComputed',
      delay: 1,
      initial: Object.fromEntries(REGIONS.map(r => [r, 1])) as Record<Region, number>,
      contract: unitPort('fraction', 'record'),
      bootstrap: true,
    },
  };
}

/** Static, non-running unit/shape completeness report for CI and tooling. */
export function auditGlobalUnitContracts(params: SimulationParams = {}) {
  const transforms = buildTransforms(
    energyModule.mergeParams(params.energy ?? {}),
    productionModule.mergeParams(params.production ?? {}),
    demandModule.mergeParams(params.demand ?? {}),
  );
  return auditConnectorContracts(ALL_MODULES, transforms, buildLags(params));
}

// =============================================================================
// RUN SIMULATION
// =============================================================================

/**
 * Run autowired simulation with full SimulationParams support.
 */
export function runAutowiredSimulation(
  params: SimulationParams = {},
  options?: RunOptions
): AutowireResult {
  // Merge energy params to read carbon prices
  const mergedEnergyParams = energyModule.mergeParams(params.energy ?? {});
  // Merge production params to inject robotLaborEquivalent into demand's
  // deployment rule (one source of truth: a scenario overriding production's
  // payoff automatically changes the business case too). Safe before the
  // efficiency-coupling below — the coupled keys don't touch this param.
  const mergedProductionParams = productionModule.mergeParams(params.production ?? {});
  const mergedDemandParams = demandModule.mergeParams(params.demand ?? {});

  const transforms = buildTransforms(
    mergedEnergyParams,
    mergedProductionParams,
    mergedDemandParams
  );
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
      humanCapital: params.humanCapital,
      energy: params.energy,
      dispatch: params.dispatch,
      resources: params.resources,
      cdr: coupledCdr,
      climate: params.climate,
    },
    startYear: params.startYear ?? 2025,
    endYear: params.endYear ?? 2100,
    trackReads: options?.trackReads,
    // Per-step port checking. The framework already defaults this to 'error';
    // ensembles and sweeps that have already validated a representative run
    // can pass 'off' to skip it.
    connectorValidation: options?.connectorValidation,
    // Report pathwise-inert scenario knobs. This is a warning by default
    // because conditional branches can legitimately leave a parameter unread;
    // unknown scenario keys are rejected separately by scenarioToParams.
    paramLiveness: options?.paramLiveness ?? 'warn',
    externalParamReads: {
      energy: [
        'carbonPrice',
        ...REGIONS.map((region) => `regional.${region}.carbonPrice`),
      ],
      production: [
        'robotLaborEquivalent', 'beta', 'electricExergy', 'thermalExergy', 'gamma',
      ],
      demand: [
        'efficiencyMultiplier', 'structuralEfficiencyShare', 'structuralDecayHalfLife',
        ...REGIONS.map((region) => `regions.${region}.intensityDecline`),
        ...(['transport', 'buildings', 'industry'] as const).flatMap((sector) => [
          `sectors.${sector}.share`,
          `sectors.${sector}.electricityDeliveryCost`,
        ]),
      ],
      climate: ['sensitivity'],
    },
    // Fixed-point warm-up: flow lags (generation, non-electric energy,
    // overheads, damages, prices) get their year-0 self-consistent values
    // instead of hand-guessed constants — kills the spurious -5.5% GDP step
    // the old initials produced in the first simulated year.
    bootstrapLags: {
      maxIterations: 100,
      minIterations: 2,
      tolerance: 1e-7,
      damping: 0.65,
      onNonConvergence: 'throw',
    },
  });
}

// =============================================================================
// YEAR RESULT MAPPING
// =============================================================================

/** Rows for every simulated year, from the one declaration of the schema. */
export function toYearResults(result: AutowireResult): YearResult[] {
  return collectResults(result, standardCollectors).timeseries as YearResult[];
}

// =============================================================================
// METRICS
// =============================================================================

/** A `{ peak: true }` aggregator yields { value, year }; SimulationMetrics wants both flat. */
interface PeakResult {
  value: number;
  year: number;
}

/** Reshape collected metrics into the domain's flat SimulationMetrics. */
function toSimulationMetrics(metrics: Record<string, any>): SimulationMetrics {
  const peakPopulation: PeakResult | undefined = metrics.peakPopulation;
  const peakEmissions: PeakResult | undefined = metrics.peakEmissions;

  return {
    peakPopulation: peakPopulation?.value ?? 0,
    peakPopulationYear: peakPopulation?.year ?? 2025,
    population2100: metrics.population2100,
    warming2050: metrics.warming2050,
    warming2100: metrics.warming2100,
    peakEmissions: peakEmissions?.value ?? 0,
    peakEmissionsYear: peakEmissions?.year ?? 2025,
    solarCrossoverYear: metrics.solarCrossoverYear,
    gridBelow100Year: metrics.gridBelow100Year,
    fossilShareFinal: metrics.fossilShareFinal,
    gdp2050: metrics.gdp2050,
    gdp2100: metrics.gdp2100,
    kY2050: metrics.kY2050,
  };
}

export function computeMetrics(result: AutowireResult): SimulationMetrics {
  return toSimulationMetrics(collectResults(result, standardCollectors).metrics);
}

/**
 * Run autowired simulation and return full SimulationResult (matching simulation.ts).
 */
export function runAutowiredFull(
  params: SimulationParams = {},
  options?: RunOptions
): SimulationResult {
  const autowireResult = runAutowiredSimulation(params, options);
  // One pass: collectResults produces rows and metrics together, so calling
  // toYearResults and computeMetrics separately here would collect twice.
  const collected = collectResults(autowireResult, standardCollectors);
  return {
    years: autowireResult.years,
    results: collected.timeseries as YearResult[],
    metrics: toSimulationMetrics(collected.metrics),
  };
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
