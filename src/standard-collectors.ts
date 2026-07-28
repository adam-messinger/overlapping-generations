/**
 * Standard Collectors (domain-specific)
 *
 * Defines the canonical output fields, energy overhead computation,
 * and standardCollectors configuration for the energy/demographics simulation.
 *
 * Kept out of the tsimulation package to keep the framework domain-independent.
 */

import { Region, REGIONS } from './domain-types.js';
import { unitPort, type CollectorConfig } from 'tsimulation';
import {
  ENERGY_ADDITION_PORT,
  ENERGY_CAPACITY_PORT,
  REGIONAL_DEMAND_PORT,
} from './port-schemas.js';

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
 * Compute annual energy system overhead (embodied + operating) in TWh/year.
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
    { source: 'dependency', unit: 'fraction', description: 'Old-age dependency ratio (65+/working)', module: 'demographics' },
    { source: 'effectiveWorkers', unit: 'people', description: 'Productivity-weighted workers (education premium)', module: 'demographics' },
    { source: 'collegeShare', unit: 'fraction', description: 'Share of workers with college degree', module: 'demographics' },

    // Demand
    { source: 'gdp', unit: '$T/year', description: 'Global annual GDP in trillions', module: 'production' },
    { source: 'electricityDemand', unit: 'TWh/year', description: 'Global electricity demand', module: 'demand' },
    { source: 'electrificationRate', unit: 'fraction', description: 'Electricity share of final energy', module: 'demand' },
    { source: 'totalFinalEnergy', unit: 'TWh/year', description: 'Total final energy consumption', module: 'demand' },
    { source: 'nonElectricEnergy', unit: 'TWh/year', description: 'Non-electric energy consumption', module: 'demand' },
    { source: 'finalEnergyPerCapitaDay', unit: 'kWh/people/day', description: 'Final energy per capita per day', module: 'demand' },

    // Sectors
    { source: 'sectors', as: 'transportElectrification', path: 'transport.electrificationRate', unit: 'fraction', description: 'Transport sector electrification rate', module: 'demand' },
    { source: 'sectors', as: 'buildingsElectrification', path: 'buildings.electrificationRate', unit: 'fraction', description: 'Buildings sector electrification rate', module: 'demand' },
    { source: 'sectors', as: 'industryElectrification', path: 'industry.electrificationRate', unit: 'fraction', description: 'Industry sector electrification rate', module: 'demand' },

    // Fuels
    { source: 'fuels', as: 'oilConsumption', path: 'oil', unit: 'TWh/year', description: 'Oil consumption (non-electric)', module: 'demand' },
    { source: 'fuels', as: 'gasConsumption', path: 'gas', unit: 'TWh/year', description: 'Gas consumption (non-electric)', module: 'demand' },
    { source: 'fuels', as: 'coalConsumption', path: 'coal', unit: 'TWh/year', description: 'Coal consumption (non-electric)', module: 'demand' },
    { source: 'fuels', as: 'hydrogenConsumption', path: 'hydrogen', unit: 'TWh/year', description: 'Hydrogen consumption (non-electric)', module: 'demand' },
    { source: 'nonElectricEmissions', unit: 'GtCO2/year', description: 'Non-electric fuel combustion emissions', module: 'demand' },

    // Energy burden
    { source: 'electricityCost', unit: '$T/year', description: 'Total electricity expenditure', module: 'demand' },
    { source: 'fuelCost', unit: '$T/year', description: 'Total fuel (non-electric) expenditure', module: 'demand' },
    { source: 'totalEnergyCost', unit: '$T/year', description: 'Total energy cost (electricity + fuel)', module: 'demand' },
    { source: 'energyBurden', unit: 'fraction', description: 'Energy cost as fraction of GDP', module: 'demand' },
    { source: 'burdenDamage', unit: 'fraction', description: 'GDP damage from excess energy burden', module: 'demand' },

    // Per-worker welfare metric
    { source: 'gdpPerWorking', unit: '$/people/year', description: 'GDP per working-age adult (Fernandez-Villaverde welfare metric)', module: 'demand' },

    // Useful work
    { source: 'usefulWorkGrowthRate', unit: 'fraction/year', description: 'Growth rate of useful energy per worker (Ayres/Warr)', module: 'demand' },

    // Capital
    { source: 'stock', as: 'capitalStock', unit: '$T', description: 'Global capital stock', module: 'capital' },
    { source: 'investment', unit: '$T/year', description: 'Annual investment', module: 'capital' },
    { source: 'plannedInvestment', unit: '$T/year', description: 'Desired annual investment before the GDP final-use feasibility cap', module: 'capital' },
    { source: 'unfundedInvestmentDemand', unit: '$T/year', description: 'Desired investment above the feasible GDP final-use envelope', module: 'capital' },
    { source: 'unfundedFinancingDemand', unit: '$T/year', description: 'Investment orders not covered by internal firm funds and net bank credit', module: 'capital' },
    { source: 'grossSavings', unit: '$T/year', description: 'Deprecated-compatible alias for ex-post national gross saving', module: 'capital' },
    { source: 'laborCompensation', unit: '$T/year', description: 'Firm labor compensation in the monetary circuit', module: 'capital' },
    { source: 'operatingSurplus', unit: '$T/year', description: 'Firm gross operating surplus before depreciation and private interest', module: 'capital' },
    { source: 'privateInterestPayments', unit: '$T/year', description: 'Interest paid by firms to banks on private debt', module: 'capital' },
    { source: 'profitAfterInterestAndDepreciation', unit: '$T/year', description: 'Firm profit after private interest and capital depreciation', module: 'capital' },
    { source: 'profitRate', unit: 'fraction/year', description: 'After-interest-and-depreciation firm profit divided by capital', module: 'capital' },
    { source: 'retainedEarnings', unit: '$T/year', description: 'Firm profit retained after dividends; negative when firms absorb losses', module: 'capital' },
    { source: 'firmDividendPayments', unit: '$T/year', description: 'Positive firm profit distributed to households', module: 'capital' },
    { source: 'bankDividendPayments', unit: '$T/year', description: 'Bank interest income distributed to households', module: 'capital' },
    { source: 'firmInternalFunds', unit: '$T/year', description: 'Non-negative gross firm saving available to finance investment', module: 'capital' },
    { source: 'householdDisposableIncome', unit: '$T/year', description: 'Household income after taxes and including transfers and dividends', module: 'capital' },
    { source: 'householdSaving', unit: '$T/year', description: 'Ex-post household disposable income less consumption', module: 'capital' },
    { source: 'householdSavingRate', unit: 'fraction', description: 'Ex-post household saving divided by disposable income', module: 'capital' },
    { source: 'firmGrossSaving', unit: '$T/year', description: 'Firm operating surplus less private interest and dividends', module: 'capital' },
    { source: 'governmentSaving', unit: '$T/year', description: 'Fiscal revenue less services, transfers, and public interest', module: 'capital' },
    { source: 'bankSaving', unit: '$T/year', description: 'Bank interest income less distributions', module: 'capital' },
    { source: 'nationalSaving', unit: '$T/year', description: 'Ex-post sum of household, firm, government, and bank saving', module: 'capital' },
    { source: 'savingInvestmentResidual', unit: '$T/year', description: 'National saving minus realized investment', module: 'capital' },
    { source: 'householdSavingLedgerResidual', unit: '$T/year', description: 'Household net-worth change in the Godley ledger minus calculated saving', module: 'capital' },
    { source: 'savingsRate', unit: 'fraction', description: 'Demographic desired household-saving propensity (diagnostic, not investment funding)', module: 'capital' },
    { source: 'regionalSavings', unit: 'fraction', description: 'Desired household-saving propensity by region', module: 'capital' },
    { source: 'stability', unit: 'fraction', description: 'Uncertainty damping applied to desired net investment (0-1)', module: 'capital' },
    { source: 'interestRate', unit: 'fraction', description: 'Real interest rate', module: 'capital' },
    { source: 'robotsDensity', unit: 'robot/kpeople', description: 'Automation capital density', module: 'capital' },
    { source: 'automationShare', unit: 'fraction', description: 'Fraction of capital stock that is automation', module: 'capital' },
    { source: 'capitalOutputRatio', unit: 'year', description: 'Capital-to-output ratio (K/Y)', module: 'capital' },
    { source: 'capitalGrowthRate', unit: 'fraction/year', description: 'Annual capital stock growth rate', module: 'capital' },
    { source: 'retireeCost', unit: '$T/year', description: 'Retiree transfers: pensions + healthcare (65+)', module: 'capital' },
    { source: 'childCost', unit: '$T/year', description: 'Child transfers: education spending (0-19)', module: 'capital' },
    { source: 'pensionTransfers', unit: '$T/year', description: 'Cash pension transfers, excluded from GDP final expenditure', module: 'capital' },
    { source: 'retireeHealthcareConsumption', unit: '$T/year', description: 'Government-purchased healthcare services for retirees', module: 'capital' },
    { source: 'educationConsumption', unit: '$T/year', description: 'Government-purchased education services', module: 'capital' },
    { source: 'governmentServiceConsumption', unit: '$T/year', description: 'Healthcare plus education government final consumption', module: 'capital' },
    { source: 'transferBurden', unit: 'fraction', description: 'Intergenerational transfer burden (retiree+child cost / GDP)', module: 'capital' },
    { source: 'householdConsumption', unit: '$T/year', description: 'Household final consumption in the GDP expenditure identity', module: 'capital' },
    { source: 'retireeConsumption', unit: '$T/year', description: 'Household consumption allocated to pension recipients', module: 'capital' },
    { source: 'workerConsumption', unit: '$T/year', description: 'Household consumption remaining after retiree allocation', module: 'capital' },
    { source: 'nationalAccountsResidual', unit: '$T/year', description: 'GDP minus household consumption, investment, and government services', module: 'capital' },
    { source: 'publicDebtGDP', unit: 'fraction', description: 'Public debt to GDP ratio', module: 'capital' },
    { source: 'privateDebtGDP', unit: 'fraction', description: 'Private debt to GDP ratio', module: 'capital' },
    { source: 'totalDebtGDP', unit: 'fraction', description: 'Total debt to GDP ratio', module: 'capital' },
    { source: 'publicInterestPayments', unit: '$T/year', description: 'Interest transfers paid to public bondholders', module: 'capital' },
    { source: 'publicInterestToHouseholds', unit: '$T/year', description: 'Public interest paid directly on household-held bonds', module: 'capital' },
    { source: 'publicInterestToBanks', unit: '$T/year', description: 'Public interest received on bank-held bonds before distribution', module: 'capital' },
    { source: 'publicDebtService', unit: '$T/year', description: 'Deprecated alias of publicInterestPayments', module: 'capital' },
    { source: 'grossLoanOriginations', unit: '$T/year', description: 'Total loan originations, including refinanced principal', module: 'capital' },
    { source: 'newInvestmentLoanOriginations', unit: '$T/year', description: 'Net-new bank credit that creates purchasing power for investment', module: 'capital' },
    { source: 'refinancedPrincipal', unit: '$T/year', description: 'Scheduled principal replaced by new loans without adding net finance', module: 'capital' },
    { source: 'unfundedCreditDemand', unit: '$T/year', description: 'Requested investment credit not supplied within the bank lending envelope', module: 'capital' },
    { source: 'creditImpulse', unit: '$T/year', description: 'Deprecated alias of newInvestmentLoanOriginations', module: 'capital' },
    { source: 'principalRepayments', unit: '$T/year', description: 'Private-loan principal repayments', module: 'capital' },
    { source: 'loanWriteOffs', unit: '$T/year', description: 'Private loans written off against bank equity', module: 'capital' },
    { source: 'netCreditCreation', unit: '$T/year', description: 'Change in the private-debt stock after repayments and write-offs', module: 'capital' },
    { source: 'primaryDeficit', unit: '$T/year', description: 'Net public-debt issuance generated by the primary fiscal balance', module: 'capital' },
    { source: 'netTaxes', unit: '$T/year', description: 'Taxes net of rebates implied by the fiscal stock-flow closure', module: 'capital' },
    { source: 'debtRiskPremium', unit: 'fraction', description: 'Interest rate premium from debt levels', module: 'capital' },
    { source: 'bankEquity', unit: '$T', description: 'Consolidated bank net worth in the Godley balance sheet', module: 'capital' },
    { source: 'bankEquityShortfall', unit: '$T', description: 'Capital required to restore consolidated bank equity to zero after write-offs', module: 'capital' },
    { source: 'bankCapitalRatio', unit: 'fraction', description: 'Consolidated bank equity divided by bank assets', module: 'capital' },
    { source: 'financialLedgerResidual', unit: '$T', description: 'Maximum sector, instrument, or stock-transition residual in the Godley ledger', module: 'capital' },

    // Five-year birth-cohort accounts
    { source: 'cohortAccounts', description: 'Global five-year birth-cohort balance sheets and annual flows', module: 'generations' },
    { source: 'regionalCohortAccounts', description: 'Five-year birth-cohort accounts by region', module: 'generations' },
    { source: 'cohortDesiredCapital', unit: '$T/year', description: 'Diagnostic desired cohort capital formation: replacement plus target net growth', module: 'generations' },
    { source: 'cohortFundedCapital', unit: '$T/year', description: 'Desired cohort capital acquisition funded by own saving and allocated credit', module: 'generations' },
    { source: 'cohortFundingGap', unit: '$T/year', description: 'Desired cohort capital acquisition not funded', module: 'generations' },
    { source: 'aggregateCapitalFundingGap', unit: '$T/year', description: 'Shortfall of general investment relative to replacement plus target net capital growth', module: 'generations' },
    { source: 'aggregateCapitalCoverage', unit: 'fraction', description: 'General investment divided by diagnostic desired aggregate capital formation, capped at one', module: 'generations' },
    { source: 'cohortBorrowingLimitGap', unit: '$T/year', description: 'Funding gap attributable to cohort income-based borrowing limits', module: 'generations' },
    { source: 'cohortCreditRationingGap', unit: '$T/year', description: 'Funding gap attributable to scarce aggregate credit despite borrowing headroom', module: 'generations' },
    { source: 'constrainedWorkingShare', unit: 'fraction', description: 'Working population in cohorts with a material capital funding gap', module: 'generations' },
    { source: 'borrowingConstrainedWorkingShare', unit: 'fraction', description: 'Working population in cohorts whose desired borrowing exceeds their limit', module: 'generations' },
    { source: 'cohortBequests', unit: '$T/year', description: 'Productive-asset ownership transferred to working-age heirs', module: 'generations' },
    { source: 'cohortAssets', unit: '$T', description: 'End-of-period productive capital owned across cohort accounts', module: 'generations' },
    { source: 'cohortLiabilities', unit: '$T', description: 'End-of-period private liabilities across cohort accounts', module: 'generations' },

    // Energy
    { source: 'lcoes', description: 'Generator LCOEs and battery storage capital cost by source', module: 'energy' },
    { source: 'capacities', description: 'Installed generation power and battery energy capacity by source', module: 'energy' },
    { source: 'lcoes', as: 'solarLCOE', path: 'solar', unit: '$/MWh', description: 'Solar levelized cost', module: 'energy' },
    { source: 'lcoes', as: 'windLCOE', path: 'wind', unit: '$/MWh', description: 'Wind levelized cost', module: 'energy' },
    { source: 'batteryCost', unit: '$/kWh', description: 'Battery storage cost', module: 'energy' },
    { source: 'cheapestLCOE', unit: '$/MWh', description: 'Cheapest LCOE across all sources', module: 'energy' },
    { source: 'solarPlusBatteryLCOE', unit: '$/MWh', description: 'Solar + battery combined LCOE', module: 'energy' },
    { source: 'longStorageCost', unit: '$/kWh', description: 'Long-duration storage capital cost (Wright\'s Law)', module: 'energy' },
    { source: 'longStorageCapacity', unit: 'GWh', description: 'Global long-duration storage capacity', module: 'energy' },
    { source: 'effectiveWACC', unit: 'fraction', description: 'Weighted average cost of capital for energy projects', module: 'energy' },

    // Dispatch
    { source: 'generation', unit: 'TWh/year', description: 'Electricity generation by source', module: 'dispatch' },
    { source: 'gridIntensity', unit: 'kgCO2/MWh', description: 'Grid carbon intensity', module: 'dispatch' },
    { source: 'totalGeneration', unit: 'TWh/year', description: 'Total electricity generation', module: 'dispatch' },
    { source: 'shortfall', unit: 'TWh/year', description: 'Unmet electricity demand', module: 'dispatch' },
    { source: 'electricityEmissions', unit: 'GtCO2/year', description: 'Electricity generation emissions', module: 'dispatch' },
    { source: 'fossilShare', unit: 'fraction', description: 'Fossil share of electricity generation', module: 'dispatch' },
    { source: 'curtailmentTWh', unit: 'TWh/year', description: 'VRE generation curtailed', module: 'dispatch' },
    { source: 'curtailmentRate', unit: 'fraction', description: 'Fraction of available VRE curtailed', module: 'dispatch' },

    // Climate
    { source: 'temperature', unit: 'Δ°C', description: 'Surface temperature above preindustrial (T₁)', module: 'climate' },
    { source: 'co2ppm', unit: 'ppm', description: 'Atmospheric CO2 concentration', module: 'climate' },
    { source: 'equilibriumTemp', unit: 'Δ°C', description: 'Equilibrium temperature at current CO2', module: 'climate' },
    { source: 'damages', unit: 'fraction', description: 'Global climate damage (fraction of GDP)', module: 'climate' },
    { source: 'cumulativeEmissions', unit: 'GtCO2', description: 'Cumulative CO2 emissions since preindustrial', module: 'climate' },
    { source: 'deepOceanTemp', unit: 'Δ°C', description: 'Deep ocean temperature anomaly (T₂)', module: 'climate' },
    { source: 'radiativeForcing', unit: 'W/m²', description: 'Radiative forcing from CO2', module: 'climate' },
    { source: 'regionalAdaptation', unit: 'fraction', description: 'Adaptation spending by region', module: 'climate' },
    { source: 'heatStressLoss', unit: 'fraction', description: 'Labor productivity loss from heat stress by region', module: 'demographics' },
    { source: 'oceanPH', unit: 'pH', description: 'Ocean surface pH (CO₂-driven acidification)', module: 'climate' },

    // Resources - Minerals
    { source: 'minerals', as: 'copperDemand', path: 'copper.demand', unit: 'Mt/year', description: 'Annual copper demand (net of recycling)', module: 'resources' },
    { source: 'minerals', as: 'lithiumDemand', path: 'lithium.demand', unit: 'Mt/year', description: 'Annual lithium demand (net of recycling)', module: 'resources' },
    { source: 'minerals', as: 'copperCumulative', path: 'copper.cumulative', unit: 'Mt', description: 'Cumulative copper extracted', module: 'resources' },
    { source: 'minerals', as: 'lithiumCumulative', path: 'lithium.cumulative', unit: 'Mt', description: 'Cumulative lithium extracted', module: 'resources' },
    { source: 'mineralConstraint', unit: 'fraction', description: 'Mineral availability constraint on energy buildout', module: 'resources' },
    { source: 'miningEnergyTWh', unit: 'TWh/year', description: 'Energy consumed by mining', module: 'resources' },
    { source: 'farmingEnergyTWh', unit: 'TWh/year', description: 'Energy consumed by farming/agriculture', module: 'resources' },

    // Resources - Land
    { source: 'land', as: 'farmland', path: 'farmland', unit: 'Mha', description: 'Global cropland area', module: 'resources' },
    { source: 'land', as: 'forest', path: 'forest', unit: 'Mha', description: 'Global forest area', module: 'resources' },
    { source: 'land', as: 'desert', path: 'desert', unit: 'Mha', description: 'Desert/barren area', module: 'resources' },
    { source: 'land', as: 'yieldDamageFactor', path: 'yieldDamageFactor', unit: 'fraction', description: 'Climate yield damage (1=none, <1=damage)', module: 'resources' },

    // Resources - Food
    { source: 'food', as: 'proteinShare', path: 'proteinShare', unit: 'fraction', description: 'Fraction of calories from protein (Bennett\'s Law)', module: 'resources' },
    { source: 'food', as: 'grainEquivalent', path: 'grainEquivalent', unit: 'Mt/year', description: 'Total grain needed (direct + feed conversion)', module: 'resources' },
    { source: 'foodStress', unit: 'fraction', description: 'Fraction of food demand unmet due to land constraint', module: 'resources' },

    // Resources - Carbon
    { source: 'carbon', as: 'forestNetFlux', path: 'netFlux', unit: 'GtCO2/year', description: 'Net forest carbon flux (positive=emissions)', module: 'resources' },
    { source: 'carbon', as: 'cumulativeSequestration', path: 'cumulativeSequestration', unit: 'GtCO2', description: 'Cumulative forest carbon sequestration', module: 'resources' },

    // Resources - Water
    { source: 'waterStress', unit: 'fraction', description: 'Water stress index by region', module: 'resources' },
    { source: 'waterYieldFactor', unit: 'fraction', description: 'Crop yield loss factor from water stress', module: 'resources' },

    // CDR (Carbon Dioxide Removal)
    { source: 'cdrRemovalGtCO2', as: 'cdrRemoval', unit: 'GtCO2/year', description: 'CDR removal rate', module: 'cdr' },
    { source: 'cdrEnergyTWh', unit: 'TWh/year', description: 'Energy consumed by CDR', module: 'cdr' },
    { source: 'cdrCostPerTon', unit: '$/tCO2', description: 'CDR cost per ton', module: 'cdr' },
    { source: 'cdrCumulative', unit: 'GtCO2', description: 'Cumulative CDR removals', module: 'cdr' },
    { source: 'cdrCapacity', unit: 'GtCO2/year', description: 'CDR deployment capacity', module: 'cdr' },
    { source: 'cdrAnnualSpend', unit: '$T/year', description: 'Annual CDR spending', module: 'cdr' },

    // Production
    { source: 'productionUsefulEnergy', unit: 'TWh/year', description: 'Exergy-weighted useful energy for production', module: 'production' },
    { source: 'ayresWarrGdp', unit: '$T/year', description: 'GDP under the calibrated Ayres-Warr production equation', module: 'production' },
    { source: 'keenEnergyGdp', unit: '$T/year', description: 'GDP under the Keen-Ayres-Standish energy/capital-composite challenger', module: 'production' },
    { source: 'productionFunctionGap', unit: 'fraction', description: 'Symmetric relative difference between Keen and Ayres-Warr GDP', module: 'production' },
    { source: 'capitalContribution', unit: '1', description: 'Capital contribution to GDP, (K/K0)^alpha', module: 'production' },
    { source: 'laborContribution', unit: '1', description: 'Labor contribution to GDP, (L/L0)^beta', module: 'production' },
    { source: 'energyContribution', unit: '1', description: 'Useful-energy contribution to GDP, (E/E0)^gamma — the dominant heterodox growth channel', module: 'production' },
    { source: 'efficiencyLevel', unit: '1', description: 'TFP-replacement efficiency multiplier (end-use x organizational)', module: 'production' },

    // Energy system overhead (computed from additions + capacities)
    {
      source: 'additions',
      as: 'energySystemOverhead',
      unit: 'TWh/year',
      description: 'Embodied + operating energy of energy infrastructure (net energy overhead)',
      module: 'energy',
      inputTypes: {
        additions: ENERGY_ADDITION_PORT,
        capacities: ENERGY_CAPACITY_PORT,
      },
      outputType: unitPort('TWh/year'),
      transform: (outputs: Record<string, any>) =>
        computeEnergySystemOverhead(outputs.additions, outputs.capacities),
    },

    // Infrastructure lock-in
    { source: 'fossilStockTWh', unit: 'TWh/year', description: 'Total fossil end-use equipment stock (TWh annual energy)', module: 'demand' },

    // Automation
    { source: 'robotLoadTWh', unit: 'TWh/year', description: 'Automation energy consumption', module: 'demand' },
    { source: 'robotsPer1000', unit: 'robot/kpeople', description: 'Robots per 1000 workers', module: 'demand' },

    // Datacenter / AI compute
    { source: 'dataCenterLoadTWh', unit: 'TWh/year', description: 'Datacenter/AI electricity load', module: 'demand' },
    { source: 'dataCenterCapexSpend', unit: '$T/year', description: 'Composite chips and datacenter capital expenditure', module: 'demand' },

    // Regional
    { source: 'regionalPopulation', unit: 'people', description: 'Population by region', module: 'demographics' },
    { source: 'regionalFertility', unit: '1', description: 'Total fertility rate by region (births per woman)', module: 'demographics' },
    {
      source: 'regional',
      as: 'regionalGdp',
      unit: '$T/year',
      description: 'GDP by region',
      module: 'demand',
      inputTypes: { regional: REGIONAL_DEMAND_PORT },
      outputType: unitPort('$T/year', 'record'),
      transform: (outputs: Record<string, any>) => {
        const regional = outputs.regional;
        if (!regional) return Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>;
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) result[r] = regional[r]?.gdp ?? 0;
        return result;
      },
    },
    { source: 'regionalCapacities', description: 'Energy capacity by region and source', module: 'energy' },
    { source: 'regionalWACC', unit: 'fraction', description: 'Energy project WACC by region (global rate + regional financing spread)', module: 'energy' },
    { source: 'regionalAdditions', description: 'Capacity additions by region and source', module: 'energy' },
    { source: 'regionalGeneration', unit: 'TWh/year', description: 'Generation by region and source', module: 'dispatch' },
    { source: 'regionalGridIntensity', unit: 'kgCO2/MWh', description: 'Grid intensity by region', module: 'dispatch' },
    { source: 'regionalFossilShare', unit: 'fraction', description: 'Fossil share by region', module: 'dispatch' },
    { source: 'regionalEmissions', unit: 'GtCO2/year', description: 'Electricity emissions by region', module: 'dispatch' },
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
