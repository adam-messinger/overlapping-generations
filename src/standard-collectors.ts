/**
 * Standard Collectors (domain-specific)
 *
 * Defines the canonical output fields, energy overhead computation,
 * and standardCollectors configuration for the energy/demographics simulation.
 *
 * Separated from framework/collectors.ts to keep the framework domain-independent.
 */

import { Region, REGIONS } from './domain-types.js';
import type { CollectorConfig } from './framework/collectors.js';

// =============================================================================
// ENERGY SYSTEM OVERHEAD (shared computation)
// =============================================================================

/** Embodied energy per GW installed (TWh/GW); TWh/GWh for battery */
const EMBODIED_ENERGY: Record<string, number> = {
  solar: 1.5, wind: 2.0, nuclear: 5.0,
  gas: 0.8, coal: 1.0, hydro: 3.0, battery: 0.00015,
};

/** Operating energy per GW per year (TWh/GW/yr) */
const OPERATING_ENERGY: Record<string, number> = {
  solar: 0.02, wind: 0.05, nuclear: 0.15,
  gas: 0.10, coal: 0.12, hydro: 0.01, battery: 0,
};

/**
 * Compute total energy system overhead (embodied + operating) in TWh.
 * Shared by the energySystemOverheadComputed transform, toYearResults(),
 * and the standardCollectors transform.
 */
export function computeEnergySystemOverhead(
  additions: Record<string, number> | null | undefined,
  capacities: Record<string, number> | null | undefined
): number {
  if (!additions || !capacities) return 0;
  let total = 0;
  for (const source of Object.keys(additions)) {
    total += (additions[source] ?? 0) * (EMBODIED_ENERGY[source] ?? 0);
    total += (capacities[source] ?? 0) * (OPERATING_ENERGY[source] ?? 0);
  }
  return total;
}

// =============================================================================
// STANDARD COLLECTORS
// =============================================================================

/**
 * Standard collectors matching current YearResult + SimulationMetrics.
 *
 * This is the canonical source of truth for output fields. The `unit`,
 * `description`, and `module` metadata is used by `describeOutputs()` in
 * introspection.ts to auto-generate the output schema.
 */
export const standardCollectors: CollectorConfig = {
  timeseries: [
    // Demographics
    { source: 'population', unit: 'people', description: 'Global population', module: 'demographics' },
    { source: 'working', unit: 'people', description: 'Working-age population (20-64)', module: 'demographics' },
    { source: 'dependency', unit: 'ratio', description: 'Old-age dependency ratio (65+/working)', module: 'demographics' },
    { source: 'effectiveWorkers', unit: 'people', description: 'Productivity-weighted workers (education premium)', module: 'demographics' },
    { source: 'collegeShare', unit: 'fraction', description: 'Share of workers with college degree', module: 'demographics' },

    // Demand
    { source: 'gdp', unit: '$T', description: 'Global GDP in trillions', module: 'demand' },
    { source: 'electricityDemand', unit: 'TWh', description: 'Global electricity demand', module: 'demand' },
    { source: 'electrificationRate', unit: 'fraction', description: 'Electricity share of final energy', module: 'demand' },
    { source: 'totalFinalEnergy', unit: 'TWh', description: 'Total final energy consumption', module: 'demand' },
    { source: 'nonElectricEnergy', unit: 'TWh', description: 'Non-electric energy consumption', module: 'demand' },
    { source: 'finalEnergyPerCapitaDay', unit: 'kWh/person/day', description: 'Final energy per capita per day', module: 'demand' },

    // Sectors
    { source: 'sectors', as: 'transportElectrification', path: 'transport.electrificationRate', unit: 'fraction', description: 'Transport sector electrification rate', module: 'demand' },
    { source: 'sectors', as: 'buildingsElectrification', path: 'buildings.electrificationRate', unit: 'fraction', description: 'Buildings sector electrification rate', module: 'demand' },
    { source: 'sectors', as: 'industryElectrification', path: 'industry.electrificationRate', unit: 'fraction', description: 'Industry sector electrification rate', module: 'demand' },

    // Fuels
    { source: 'fuels', as: 'oilConsumption', path: 'oil', unit: 'TWh', description: 'Oil consumption (non-electric)', module: 'demand' },
    { source: 'fuels', as: 'gasConsumption', path: 'gas', unit: 'TWh', description: 'Gas consumption (non-electric)', module: 'demand' },
    { source: 'fuels', as: 'coalConsumption', path: 'coal', unit: 'TWh', description: 'Coal consumption (non-electric)', module: 'demand' },
    { source: 'fuels', as: 'hydrogenConsumption', path: 'hydrogen', unit: 'TWh', description: 'Hydrogen consumption (non-electric)', module: 'demand' },
    { source: 'nonElectricEmissions', unit: 'Gt CO2/year', description: 'Non-electric fuel combustion emissions', module: 'demand' },

    // Energy burden
    { source: 'totalEnergyCost', unit: '$T', description: 'Total energy cost (electricity + fuel)', module: 'demand' },
    { source: 'energyBurden', unit: 'fraction', description: 'Energy cost as fraction of GDP', module: 'demand' },
    { source: 'burdenDamage', unit: 'fraction', description: 'GDP damage from excess energy burden', module: 'demand' },

    // Useful work
    { source: 'usefulWorkGrowthRate', unit: 'fraction/year', description: 'Growth rate of useful energy per worker (Ayres/Warr)', module: 'demand' },

    // Capital
    { source: 'stock', as: 'capitalStock', unit: '$T', description: 'Global capital stock', module: 'capital' },
    { source: 'investment', unit: '$T', description: 'Annual investment', module: 'capital' },
    { source: 'savingsRate', unit: 'fraction', description: 'Aggregate savings rate', module: 'capital' },
    { source: 'stability', unit: 'index', description: 'Financial stability index (0-1)', module: 'capital' },
    { source: 'interestRate', unit: 'fraction', description: 'Real interest rate', module: 'capital' },
    { source: 'robotsDensity', unit: 'per 1000 workers', description: 'Automation capital density', module: 'capital' },
    { source: 'automationShare', unit: 'fraction', description: 'Fraction of capital stock that is automation', module: 'capital' },
    { source: 'capitalOutputRatio', unit: 'ratio', description: 'Capital-to-output ratio (K/Y)', module: 'capital' },
    { source: 'capitalGrowthRate', unit: 'fraction/year', description: 'Annual capital stock growth rate', module: 'capital' },
    { source: 'retireeCost', unit: '$T', description: 'Retiree transfers: pensions + healthcare (65+)', module: 'capital' },
    { source: 'childCost', unit: '$T', description: 'Child transfers: education spending (0-19)', module: 'capital' },
    { source: 'transferBurden', unit: 'fraction', description: 'Intergenerational transfer burden (retiree+child cost / GDP)', module: 'capital' },
    { source: 'workerConsumption', unit: '$T', description: 'Worker consumption (GDP - investment - transfers)', module: 'capital' },

    // Energy
    { source: 'lcoes', unit: '$/MWh', description: 'Levelized cost by source', module: 'energy' },
    { source: 'capacities', unit: 'GW (GWh for battery)', description: 'Installed capacity by source', module: 'energy' },
    { source: 'lcoes', as: 'solarLCOE', path: 'solar', unit: '$/MWh', description: 'Solar levelized cost', module: 'energy' },
    { source: 'lcoes', as: 'windLCOE', path: 'wind', unit: '$/MWh', description: 'Wind levelized cost', module: 'energy' },
    { source: 'batteryCost', unit: '$/kWh', description: 'Battery storage cost', module: 'energy' },
    { source: 'cheapestLCOE', unit: '$/MWh', description: 'Cheapest LCOE across all sources', module: 'energy' },
    { source: 'solarPlusBatteryLCOE', unit: '$/MWh', description: 'Solar + battery combined LCOE', module: 'energy' },
    { source: 'longStorageCost', unit: '$/MWh', description: 'Long-duration storage cost (Wright\'s Law)', module: 'energy' },
    { source: 'longStorageCapacity', unit: 'GWh', description: 'Global long-duration storage capacity', module: 'energy' },
    { source: 'effectiveWACC', unit: 'fraction', description: 'Weighted average cost of capital for energy projects', module: 'energy' },

    // Dispatch
    { source: 'generation', unit: 'TWh', description: 'Electricity generation by source', module: 'dispatch' },
    { source: 'gridIntensity', unit: 'kg CO2/MWh', description: 'Grid carbon intensity', module: 'dispatch' },
    { source: 'totalGeneration', unit: 'TWh', description: 'Total electricity generation', module: 'dispatch' },
    { source: 'shortfall', unit: 'TWh', description: 'Unmet electricity demand', module: 'dispatch' },
    { source: 'electricityEmissions', unit: 'Gt CO2/year', description: 'Electricity generation emissions', module: 'dispatch' },
    { source: 'fossilShare', unit: 'fraction', description: 'Fossil share of electricity generation', module: 'dispatch' },
    { source: 'curtailmentTWh', unit: 'TWh', description: 'VRE generation curtailed', module: 'dispatch' },
    { source: 'curtailmentRate', unit: 'fraction', description: 'Fraction of available VRE curtailed', module: 'dispatch' },

    // Climate
    { source: 'temperature', unit: '°C', description: 'Surface temperature above preindustrial (T₁)', module: 'climate' },
    { source: 'co2ppm', unit: 'ppm', description: 'Atmospheric CO2 concentration', module: 'climate' },
    { source: 'equilibriumTemp', unit: '°C', description: 'Equilibrium temperature at current CO2', module: 'climate' },
    { source: 'damages', unit: 'fraction', description: 'Global climate damage (fraction of GDP)', module: 'climate' },
    { source: 'cumulativeEmissions', unit: 'Gt CO2', description: 'Cumulative CO2 emissions since preindustrial', module: 'climate' },
    { source: 'deepOceanTemp', unit: '°C', description: 'Deep ocean temperature anomaly (T₂)', module: 'climate' },
    { source: 'radiativeForcing', unit: 'W/m²', description: 'Radiative forcing from CO2', module: 'climate' },
    { source: 'regionalAdaptation', unit: 'fraction', description: 'Adaptation spending by region', module: 'climate' },
    { source: 'heatStressLoss', unit: 'fraction', description: 'Labor productivity loss from heat stress by region', module: 'climate' },

    // Resources - Minerals
    { source: 'minerals', as: 'copperDemand', path: 'copper.demand', unit: 'Mt/year', description: 'Annual copper demand (net of recycling)', module: 'resources' },
    { source: 'minerals', as: 'lithiumDemand', path: 'lithium.demand', unit: 'Mt/year', description: 'Annual lithium demand (net of recycling)', module: 'resources' },
    { source: 'minerals', as: 'copperCumulative', path: 'copper.cumulative', unit: 'Mt', description: 'Cumulative copper extracted', module: 'resources' },
    { source: 'minerals', as: 'lithiumCumulative', path: 'lithium.cumulative', unit: 'Mt', description: 'Cumulative lithium extracted', module: 'resources' },
    { source: 'mineralConstraint', unit: '0-1 factor', description: 'Mineral availability constraint on energy buildout', module: 'resources' },

    // Resources - Land
    { source: 'land', as: 'farmland', path: 'farmland', unit: 'Mha', description: 'Global cropland area', module: 'resources' },
    { source: 'land', as: 'forest', path: 'forest', unit: 'Mha', description: 'Global forest area', module: 'resources' },
    { source: 'land', as: 'desert', path: 'desert', unit: 'Mha', description: 'Desert/barren area', module: 'resources' },
    { source: 'land', as: 'yieldDamageFactor', path: 'yieldDamageFactor', unit: 'fraction', description: 'Climate yield damage (1=none, <1=damage)', module: 'resources' },

    // Resources - Food
    { source: 'food', as: 'proteinShare', path: 'proteinShare', unit: 'fraction', description: 'Fraction of calories from protein (Bennett\'s Law)', module: 'resources' },
    { source: 'food', as: 'grainEquivalent', path: 'grainEquivalent', unit: 'Mt', description: 'Total grain needed (direct + feed conversion)', module: 'resources' },
    { source: 'foodStress', unit: 'fraction', description: 'Fraction of food demand unmet due to land constraint', module: 'resources' },

    // Resources - Carbon
    { source: 'carbon', as: 'forestNetFlux', path: 'netFlux', unit: 'Gt CO2/year', description: 'Net forest carbon flux (positive=emissions)', module: 'resources' },
    { source: 'carbon', as: 'cumulativeSequestration', path: 'cumulativeSequestration', unit: 'Gt CO2', description: 'Cumulative forest carbon sequestration', module: 'resources' },

    // Resources - Water
    { source: 'waterStress', unit: 'fraction', description: 'Water stress index by region', module: 'resources' },
    { source: 'waterYieldFactor', unit: 'fraction', description: 'Crop yield loss factor from water stress', module: 'resources' },

    // CDR (Carbon Dioxide Removal)
    { source: 'cdrRemovalGtCO2', as: 'cdrRemoval', unit: 'Gt CO2/year', description: 'CDR removal rate', module: 'cdr' },
    { source: 'cdrEnergyTWh', unit: 'TWh', description: 'Energy consumed by CDR', module: 'cdr' },
    { source: 'cdrCostPerTon', unit: '$/ton CO2', description: 'CDR cost per ton', module: 'cdr' },
    { source: 'cdrCumulative', unit: 'Gt CO2', description: 'Cumulative CDR removals', module: 'cdr' },
    { source: 'cdrCapacity', unit: 'Gt CO2/year', description: 'CDR deployment capacity', module: 'cdr' },
    { source: 'cdrAnnualSpend', unit: '$T/year', description: 'Annual CDR spending', module: 'cdr' },

    // Production
    { source: 'productionUsefulEnergy', unit: 'TWh', description: 'Exergy-weighted useful energy for production', module: 'production' },

    // Energy system overhead (computed from additions + capacities)
    {
      source: 'additions',
      as: 'energySystemOverhead',
      unit: 'TWh',
      description: 'Embodied + operating energy of energy infrastructure (net energy overhead)',
      module: 'energy',
      transform: (outputs: Record<string, any>) =>
        computeEnergySystemOverhead(outputs.additions, outputs.capacities),
    },

    // Infrastructure lock-in
    { source: 'fossilStockTWh', unit: 'TWh', description: 'Total fossil end-use equipment stock (TWh annual energy)', module: 'demand' },

    // Automation
    { source: 'robotLoadTWh', unit: 'TWh', description: 'Automation energy consumption', module: 'demand' },
    { source: 'robotsPer1000', unit: 'per 1000 workers', description: 'Robots per 1000 workers', module: 'demand' },

    // Regional
    { source: 'regionalPopulation', unit: 'people', description: 'Population by region', module: 'demographics' },
    {
      source: 'regional',
      as: 'regionalGdp',
      unit: '$T',
      description: 'GDP by region',
      module: 'demand',
      transform: (outputs: Record<string, any>) => {
        const regional = outputs.regional;
        if (!regional) return Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>;
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) result[r] = regional[r]?.gdp ?? 0;
        return result;
      },
    },
    { source: 'regionalCapacities', unit: 'GW', description: 'Energy capacity by region and source', module: 'energy' },
    { source: 'regionalAdditions', unit: 'GW', description: 'Capacity additions by region and source', module: 'energy' },
    { source: 'regionalGeneration', unit: 'TWh', description: 'Generation by region and source', module: 'dispatch' },
    { source: 'regionalGridIntensity', unit: 'kg CO2/MWh', description: 'Grid intensity by region', module: 'dispatch' },
    { source: 'regionalFossilShare', unit: 'fraction', description: 'Fossil share by region', module: 'dispatch' },
    { source: 'regionalEmissions', unit: 'Gt CO2/year', description: 'Electricity emissions by region', module: 'dispatch' },
  ],

  metrics: [
    // Population
    {
      as: 'peakPopulation',
      source: 'population',
      aggregator: { peak: true },
    },
    {
      as: 'population2100',
      source: 'population',
      aggregator: 'last',
    },

    // Climate
    {
      as: 'warming2050',
      source: 'temperature',
      aggregator: { custom: (values, years) => {
        const i = years.indexOf(2050);
        return i >= 0 ? values[i] : 0;
      }},
    },
    {
      as: 'warming2100',
      source: 'temperature',
      aggregator: 'last',
    },
    {
      as: 'peakEmissions',
      transform: (outputs) => {
        const elec = outputs.electricityEmissions ?? 0;
        const nonElec = outputs.nonElectricEmissions ?? 0;
        const carbon = outputs.carbon;
        const land = carbon?.netFlux ?? 0;
        return elec + nonElec + land;
      },
      aggregator: { peak: true },
    },

    // Energy
    {
      as: 'solarCrossoverYear',
      transform: (outputs) => {
        const lcoes = outputs.lcoes;
        return lcoes ? lcoes.solar < lcoes.gas : false;
      },
      aggregator: { first: (crossed: boolean) => crossed },
    },
    {
      as: 'gridBelow100Year',
      source: 'gridIntensity',
      aggregator: { first: (v: number) => v < 100 },
    },
    {
      as: 'fossilShareFinal',
      source: 'fossilShare',
      aggregator: 'last',
    },

    // GDP
    {
      as: 'gdp2050',
      source: 'gdp',
      aggregator: { custom: (values, years) => {
        const i = years.indexOf(2050);
        return i >= 0 ? values[i] : 0;
      }},
    },
    {
      as: 'gdp2100',
      source: 'gdp',
      aggregator: 'last',
    },
    {
      as: 'peakTransferBurden',
      source: 'transferBurden',
      aggregator: { peak: true },
    },
    {
      as: 'kY2050',
      transform: (outputs) => {
        const stock = outputs.stock ?? 0;
        const gdp = outputs.gdp ?? 1;
        return stock / gdp;
      },
      aggregator: { custom: (values, years) => {
        const i = years.indexOf(2050);
        return i >= 0 ? values[i] : 0;
      }},
    },
  ],
};
