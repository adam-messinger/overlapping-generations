/**
 * Demand Module
 *
 * Calculates GDP growth, energy intensity, and electricity demand by region.
 * Takes demographics outputs (population, workers, dependency) and produces
 * economic outputs that feed into energy and capital modules.
 *
 * Theoretical basis:
 * - Fernández-Villaverde: GDP per working-age adult as key metric
 *
 * GDP growth equation (Ayres/Warr):
 *   growthRate = residualTFP + ε·usefulWorkGrowth + α·capitalGrowth + (1-α)·laborGrowth + demographicAdj
 *
 * Where:
 * - residualTFP decays over time (catch-up growth fades)
 * - usefulWorkGrowth = growth in useful energy per worker (lagged 1 year)
 * - ε = useful work elasticity (now in production module)
 * - laborGrowth uses effective workers (education-weighted)
 * - demographicAdj penalizes high dependency ratios
 */

import { Region, REGIONS } from '../domain-types.js';
import { compound, lerp, clamp, structuralDecayFactor } from '../primitives/math.js';
import {
  closeTo,
  defineModule,
  Module,
  type ModuleInvariant,
  sumValues,
  validatedMerge,
  unitPort,
} from 'tsimulation';
import {
  DEMAND_SECTORS_PORT,
  REGIONAL_ALLOCATION_PORT,
  REGIONAL_DEMAND_PORT,
} from '../port-schemas.js';

// =============================================================================
// TYPES
// =============================================================================

interface RegionalEconomicParams {
  gdp2025: number;           // $ trillions (World Bank)
  /**
   * 2025 GDP at market exchange rates over GDP at PPP, relative to the US (= 1).
   * Weights regional GDP into GDP at market rates (regionalGdpMarket), held at
   * 2025 prices and exchange rates.
   */
  marketPriceRatio2025: number;
  tfpGrowth: number;         // Total factor productivity growth rate
  tfpDecay: number;          // Rate at which catch-up growth fades
  /**
   * Long-run residual TFP growth the catch-up component decays TOWARD
   * (default 0). Conditional convergence: a catching-up economy's TFP growth
   * converges on the frontier's rate of technical progress, not on zero
   * (Barro & Sala-i-Martin, Economic Growth, 2nd ed. 2004, ch. 8). With a
   * floor, tfp(t) = floor + (tfpGrowth - floor) x (1 - tfpDecay)^t; with the
   * default 0 the path is the original tfpGrowth x (1 - tfpDecay)^t exactly.
   */
  tfpFloor?: number;
  energyIntensity: number;   // MWh per $1000 GDP (total energy)
  intensityDecline: number;  // Annual efficiency improvement rate
  /**
   * Region's 2025 electrification of final energy relative to the global
   * share (1 = at global). Grid access and industrial structure differ
   * hugely by region (SSA ~600M people without electricity); the previous
   * uniform global share over-assigned SSA ~4x its observed electricity.
   * Converges linearly to 1 by 2100 (access catch-up). Calibrated to
   * Ember/IEA 2024 regional generation.
   */
  elecShareMultiplier2025: number;
}

// Sector parameters
interface SectorParams {
  share: number;                  // Share of total final energy (sums to 1)
  electrification2025: number;    // Current sector electrification rate
  relativeDiffusionCap: number;   // Max annual increase as fraction of current level (S-curve diffusion; binds at low adoption)
  reversalStickiness: number;     // Fraction of adverse cost pressure applied to REVERSAL (installed stock reverts via replacement cycles, not scrappage)
  // Cost escalation replaces hard ceilings
  costEscalationThreshold: number; // Rate above which costs escalate (0.60/0.85/0.55)
  costEscalationRate: number;      // Quadratic escalation strength (2.0/1.5/2.5)
  // Cost-driven electrification parameters
  costSensitivity: number;        // Response to cost ratio (0.08/0.06/0.10)
  basePressure: number;           // Background pressure (0.015/0.02/0.008)
  efficiencyMultiplier: number;   // EV=3.5x, heat pump=3.0x, industry=1.1x
  maxAnnualChange: number;        // Infrastructure constraint (0.04/0.03/0.025)
  primaryFuel: 'oil' | 'gas';     // Which fuel sector competes with
  // 2025 non-electric fuel recipe of THIS sector (shares sum to 1). The
  // fuel-mix logit is calibrated to it, so a fuel this sector does not use
  // in 2025 (coal in transport) can never enter it.
  fuelShares2025: Record<FuelType, number>;
  // Retail electricity delivery adder $/MWh (T&D + retail margin over
  // wholesale LCOE) for this sector's electrification decision
  electricityDeliveryCost: number;
}

// Fuel parameters for non-electric energy
interface FuelParams {
  share2025: number;              // Share of non-electric in 2025
  carbonIntensity: number;        // kg CO2 per MWh thermal
  price: number;                  // Wholesale fuel price $/MWh thermal, 2025
  // Real price path: price(year) = price x (1+priceEscalation)^yearIndex.
  // Defaults 0 (flat real, IEA WEO STEPS-like); scenarios override (NZE-style
  // demand-collapse pricing goes negative).
  priceEscalation: number;
  // Retail delivery margin $/MWh (refining/distribution/retail over
  // wholesale). Enters the electrification comparison and household cost
  // accounting; deliberately EXCLUDED from the fuel-mix logit, whose
  // priceSensitivity is calibrated on wholesale relative prices.
  deliveryMargin: number;
}

// Fuel mix evolution parameters
interface FuelMixParams {
  priceSensitivity: number;       // β in logit model (default 0.03)
  inertiaRate: number;            // α blending rate (default 0.08 = ~9yr half-life)
  // Carbon price at which the 2025 sector recipes are calibrated: shares move
  // only when effective prices depart from (2025 wholesale + this carbon cost).
  referenceCarbonPrice: number;
  // GDP elasticity of heavy-materials output (crude steel, cement), the
  // activity behind industry's coal. Industry's service base grows with
  // GDP x intensity like every sector, but its coal slice tracks steel and
  // cement, which saturate: industry's coal share is scaled by
  // (GDP/GDP2025)^this / (service base / 2025 service base), the freed share
  // going pro rata to industry's other fuels bar hydrogen (chemicals, light industry).
  // Applied on top of the logit (composition, not equipment turnover).
  heavyIndustryGdpElasticity: number;
}

// Energy burden parameters
interface EnergyBurdenParams {
  threshold: number;              // Burden threshold (fraction of GDP, default 0.08)
  elasticity: number;             // GDP damage per % excess burden (default 1.5)
  maxBurden: number;              // Historical max burden (fraction, default 0.14)
}

/** Fossil end-use equipment stock parameters */
interface FossilStockParams {
  vehicleLifetime: number;     // ICE vehicle fleet lifetime (years)
  heatingLifetime: number;     // Gas/oil furnace lifetime (years)
  industrialLifetime: number;  // Fossil industrial equipment lifetime (years)
}

export interface AnnualCommodityShock {
  year: number;
  /** Global wholesale multipliers used for fuel switching and aggregate cost. */
  globalPriceMultipliers?: Partial<Record<'oil' | 'gas', number>>;
  /** Local wholesale multipliers used in the regional burden calculation. */
  regionalPriceMultipliers?: Partial<
    Record<Region, Partial<Record<'oil' | 'gas', number>>>
  >;
  /** Fraction of physical fuel demand that can be served in each region. */
  regionalAvailability?: Partial<
    Record<Region, Partial<Record<'oil' | 'gas', number>>>
  >;
  /**
   * Direct trade-income wedge from a commodity disruption, e.g. stranded Gulf
   * exports or exporter gains (the Hormuz bridge). It enters the regional
   * allocator inside the energy factor and is clamped to [0.5, 1.5]. For
   * general output overlays use `regionalOutputAdjustments` instead.
   */
  regionalOutputFactors?: Partial<Record<Region, number>>;
}

/**
 * One year of output adjustments from an overlay (a model run outside the
 * main simulation that moves regional output, e.g. scripts/ai-offshoring).
 * Each factor is a LEVEL on the region's output share in that calendar year,
 * relative to the run without the overlay; a missing year or region means 1.
 * The allocator applies the year-on-year change a(year)/a(year-1) and then
 * renormalises shares to world GDP, so world output moves only through
 * second-round effects.
 */
export interface AnnualRegionalOutputAdjustment {
  year: number;
  factors: Partial<Record<Region, number>>;
}

export interface DemandParams {
  // Fossil end-use stock lifetimes (infrastructure lock-in)
  fossilStock: FossilStockParams;

  // Regional economic parameters
  regions: Record<Region, RegionalEconomicParams>;

  // Sector-level parameters
  sectors: {
    transport: SectorParams;
    buildings: SectorParams;
    industry: SectorParams;
  };

  // Fuel mix for non-electric energy
  fuels: {
    oil: FuelParams;
    gas: FuelParams;
    coal: FuelParams;
    biomass: FuelParams;
    hydrogen: FuelParams;
    biofuel: FuelParams;
  };

  // Energy burden parameters
  energyBurden: EnergyBurdenParams;

  // Fuel mix evolution parameters
  fuelMix: FuelMixParams;

  // Optional efficiency multiplier (slider)
  efficiencyMultiplier: number;
  structuralEfficiencyShare: number;   // fraction of intensity decline that is decaying structural change (must match production)
  structuralDecayHalfLife: number;     // years to halve the structural component post-2025 (must match production)

  // Robot/automation (endogenous value-vs-cost adoption; no hard ceiling)
  robotBaseline2025: number;      // Initial robots per 1000 workers (must be > 0)
  robotDiffusionRate: number;     // Max adoption rate/yr when profitability >> 1
  robotIntegrationExponent: number; // Integration-cost exponent theta: MC scales with (N/anchor)^theta
  robotDepreciation: number;      // Robot fleet depreciation (fraction/yr)
  robotDisplacementShare: number; // Wage share used to value displaced labor (labour income share)
  energyPerRobotMWh: number;     // MWh per robot-unit per year
  robotUnitCost: number;         // $ per robot-unit installed (2025)
  robotCostDecline: number;      // Annual real cost decline (fraction/yr)

  // Datacenter/AI compute (endogenous demand with willingness-to-pay brake)
  dataCenterBaseline2025: number;      // Initial datacenter electricity load (TWh)
  dataCenterBaseGrowth: number;        // Base growth rate
  dataCenterSpendCeiling: number;      // WTP ceiling on the DC TOTAL-COST share of GDP: power + capital service (fraction)
  dataCenterEnergySensitivity: number; // LCOE elasticity (cheap energy → more compute)
  dataCenterGDPSensitivity: number;    // GDP-per-capita elasticity (wealth → more compute)
  dataCenterReferenceLCOE: number;     // Reference LCOE $/MWh
  dataCenterReferenceGDPpc: number;    // Reference GDP per capita ($ PPP)
  dataCenterCapitalCostPerGW: number;  // Composite chips + facility cost ($B per average GW of annual load)
  dataCenterDepreciation: number;      // Composite chips + facility replacement rate (fraction/yr)
  dataCenterRegionalShare: Record<Region, number>; // Where datacenter load sits (fractions summing to 1)
  /** Regional shares of the world's operational robot stock, 2024 (fractions summing to 1) */
  robotStockShare2024: Record<Region, number>;

  /** Sparse calendar-year shocks from monthly commodity/network simulations. */
  commodityShocks: readonly AnnualCommodityShock[];
  /** Sparse calendar-year regional output levels from overlays (missing = 1). */
  regionalOutputAdjustments: readonly AnnualRegionalOutputAdjustment[];
  /**
   * US GDP at market exchange rates in 2025, $T. With the price ratios
   * relative to the US, usGdpMarketUsd2025 / regions.us.gdp2025 converts the
   * model's PPP dollars (2017 intl $) to 2025 US dollars.
   */
  usGdpMarketUsd2025: number;
}

interface RegionalState {
  gdpShare: number;   // Fraction of global GDP (sums to 1)
  intensity: number;  // Current energy intensity (MWh/$1000)
}

interface DemandState {
  regions: Record<Region, RegionalState>;
  fuelShares: Record<FuelType, number>; // Evolved fuel shares (for non-electric), aggregate of the sector mixes
  sectorFuelShares: Record<'transport' | 'buildings' | 'industry', Record<FuelType, number>>;
  sectorElectrification: {     // Sector-level electrification rates
    transport: number;
    buildings: number;
    industry: number;
  };
  previousEffectiveWorkers: Record<Region, number>; // For labor growth calculation
  /** Previous level factors make climate/energy LEVEL wedges affect growth only when they change. */
  previousRegionalDamageFactor: Record<Region, number>;
  previousRegionalEnergyFactor: Record<Region, number>;
  previousUsefulEnergyPerWorker: number; // For Ayres/Warr useful work growth
  usefulWorkGrowthRate: number;          // Exposed for diagnostics
  robotsPer1000: number;
  robotFleet: number;             // absolute robot-units, for capex additions
  referenceLaborShare?: number;   // 2025 labor share (lagged-bootstrapped), anchors the wage a robot displaces
  dataCenterLoadTWh: number;             // Current datacenter electricity load (TWh)
  fossilVehicleFleet: number;            // TWh of annual fossil transport energy
  fossilHeatingStock: number;            // TWh of annual fossil heating energy
  fossilIndustrialStock: number;         // TWh of annual fossil industrial energy
  /**
   * Heavy-materials activity vs industry's service base, scaling industry's
   * coal share on top of the logit (not its anchor). gdp0/serviceBase0 are captured on the first step (0 =
   * unset); `coalActivityRatio` is last year's (GDP/GDP0)^eps /
   * (serviceBase/serviceBase0), lagged one year like the model's other
   * feedbacks because the fuel mix is set before this year's regional
   * service base is known.
   */
  heavyIndustry: { gdp0: number; serviceBase0: number; coalActivityRatio: number };
  /** Robots per worker relative to the world, fixed in year 0 from robotStockShare2024 */
  robotDensityIndex?: Record<Region, number>;
}

// Inputs from demographics and production modules
interface DemandInputs {
  // Per-region demographics
  regionalWorking: Record<Region, number>;
  regionalEffectiveWorkers: Record<Region, number>;
  regionalDependency: Record<Region, number>;

  // Global demographics
  population: number;
  working: number;
  dependency: number;

  // GDP from production module
  gdp: number;

  // Optional damage fractions (for regional share evolution)
  regionalDamages?: Record<Region, number>;

  // For energy burden calculation: last year's served generation
  // (delay-1 lag on dispatch.totalGeneration, shared with production)
  totalGeneration?: number;              // TWh
  carbonPrice?: number;                  // $/tonne for fuel carbon cost

  // For cost-driven electrification
  laggedAvgLCOE?: number;                // $/MWh from previous year

  // For the robot value-vs-cost deployment rule
  laggedInterestRate?: number;           // economy-wide rate from capital (delay-1 lag, shared with energy/cdr)
  laggedLaborShare?: number;             // capital.laborShare, lagged: falls as machines take labor income
  robotLaborEquivalent?: number;         // worker-equivalents per robot, injected from production params

  // CDR electricity demand (delay-1 lag on cdr.cdrEnergyTWh, shared with production)
  cdrEnergy?: number;                    // TWh

  // Regional allocator inputs (lagged, self-consistent 2025 bootstrap).
  // Fossil share is deliberately absent: technology mix is not a cost.
  regionalEnergyBurden?: Record<Region, number>;
  regionalReliabilityFactor?: Record<Region, number>;
  laborOutputElasticity?: number;
}

export interface RegionalAllocationDiagnostics {
  tfpFactor: number;
  laborFactor: number;
  climateFactorChange: number;
  energyFactorChange: number;
  /** Year-on-year change in the overlay output level (regionalOutputAdjustments) */
  outputAdjustmentChange: number;
  energyBurden: number;
  reliabilityFactor: number;
  gdpShare: number;
}

interface RegionalOutputs {
  gdp: number;                  // $ trillions
  growthRate: number;           // Annual growth rate
  energyIntensity: number;      // MWh per $1000 GDP
  totalFinalEnergy: number;     // TWh (total energy)
  electricityDemand: number;    // TWh
  nonElectricEnergy: number;    // TWh
  nonElectricEnergyPotential: number; // TWh requested before physical rationing
  gdpPerWorking: number;        // $ per working-age person
  electricityPerWorking: number; // kWh per working-age person
}

// Sector-level output
interface SectorOutput {
  total: number;                // TWh (sector total)
  electric: number;             // TWh (electricity portion)
  nonElectric: number;          // TWh (non-electric portion)
  electrificationRate: number;  // Fraction electrified
}

// Fuel consumption output
interface FuelOutput {
  oil: number;        // TWh
  gas: number;        // TWh
  coal: number;       // TWh
  biomass: number;    // TWh
  hydrogen: number;   // TWh
  biofuel: number;    // TWh
}

export type FuelType = 'oil' | 'gas' | 'coal' | 'biomass' | 'hydrogen' | 'biofuel';
export type SectorType = 'transport' | 'buildings' | 'industry';

const FUEL_KEYS: readonly FuelType[] = ['oil', 'gas', 'coal', 'biomass', 'hydrogen', 'biofuel'];

/** Regional grid-access catch-up horizon: elecShareMultiplier2025 -> 1 by 2100 */
const ELEC_ACCESS_CONVERGENCE_YEARS = 75;

interface DemandOutputs {
  // Regional outputs
  regional: Record<Region, RegionalOutputs>;
  regionalAllocation: Record<Region, RegionalAllocationDiagnostics>;

  // Global aggregates
  electricityDemand: number;    // TWh (global)
  electrificationRate: number;  // Fraction (0-1)
  totalFinalEnergy: number;     // TWh (global)
  nonElectricEnergy: number;    // TWh (global)
  nonElectricEnergyPotential: number; // TWh requested before physical rationing
  gdpPerWorking: number;        // $ per person (global)
  finalEnergyPerCapitaDay: number; // kWh/person/day

  // Sector breakdown
  sectors: {
    transport: SectorOutput;
    buildings: SectorOutput;
    industry: SectorOutput;
  };

  // Fuel consumption (non-electric only)
  fuels: FuelOutput;

  // Non-electric emissions (Gt CO2/year)
  nonElectricEmissions: number;

  // Energy burden outputs
  electricityCost: number;   // $ trillions
  fuelCost: number;          // $ trillions
  totalEnergyCost: number;   // $ trillions
  energyBurden: number;      // Fraction of GDP (0-1)
  burdenDamage: number;      // GDP damage fraction (0-1)
  regionalFuelCost: Record<Region, number>; // $T at local shock prices
  regionalFuelAvailability: Record<Region, number>; // served/potential thermal energy

  // Ayres/Warr useful work diagnostics
  usefulWorkGrowthRate: number; // Growth rate of useful energy per worker

  // Robot/automation
  robotLoadTWh: number;       // Automation energy load (TWh)
  robotCapexSpend: number;    // Robot fleet capex this year ($T)
  robotCapitalValue: number;  // Robot fleet at this year's installed unit cost ($T); capital splits the opening capital stock with it
  robotsPer1000: number;      // Robots per 1000 workers
  robotProfitability: number; // Marginal value / marginal cost of the next robot (pi)
  fossilStockTWh: number;    // Total fossil end-use equipment stock (TWh)

  // Datacenter/AI compute
  dataCenterLoadTWh: number;  // Datacenter electricity load (TWh)
  dataCenterCapexSpend: number; // Composite chips + datacenter capex this year ($T)
  dataCenterCapitalValue: number; // Opening chips + facility fleet at the composite cost per GW ($T); capital splits the opening capital stock with it
  dataCenterPowerSpendShare: number; // DC electricity bill as share of GDP
  /** GDP at market exchange rates, $T at constant 2025 prices and exchange rates */
  gdpMarket: number;
  regionalGdpMarket: Record<Region, number>;
  dataCenterSpendShare: number;      // DC total cost of ownership (power + capital service) as share of GDP: what the brake reads
}

// =============================================================================
// DEFAULTS
// =============================================================================

/**
 * Default economic parameters (PPP, 2017 international dollars)
 *
 * Energy intensity calibrated to preserve physical energy flows (TWh):
 * - Global final energy: ~122,000 TWh (IEA World Energy Outlook)
 * - Global electricity: ~30,000 TWh → 25% electrification
 * - Total GDP PPP: ~$158T → each region's gdp × intensity × 1000 ≈ same TWh as before
 */
export const demandDefaults: DemandParams = {
  fossilStock: {
    vehicleLifetime: 15,      // ICE vehicles ~15yr
    heatingLifetime: 20,       // Gas/oil furnaces ~20yr
    industrialLifetime: 25,    // Fossil industrial processes ~25yr
  },

  // intensityDecline: autonomous (non-electrification) final-energy intensity
  // improvement. Historical global final intensity declined ~1.5-2%/yr
  // (IEA Energy Efficiency 2024; SDG 7.3 tracking); pre-2020 electrification
  // contributed only ~0.2pp/yr of that, and electrification's final-energy
  // savings are now accounted separately by the efficiency-corrected demand
  // split — so these carry the ~1.0-1.5%/yr residual. The previous
  // 0.3-0.8%/yr had no source and inflated 2050 final energy ~25%.
  regions: {
    us: {
      gdp2025: 24,              // $24T PPP (World Bank 2017 intl $; US real GDP 2017$ ~$23.5T 2025)
      marketPriceRatio2025: 1.0,  // 2025 GDP at market rates / at PPP (US = 1): IMF WEO Oct 2026 NGDPD/PPPGDP, data/fiscal/imf-weo-regions.csv
      tfpGrowth: 0.010,         // Residual TFP: US labor productivity has outpaced Europe/Japan since 2005 (OECD Productivity Statistics)
      tfpDecay: 0.0,            // Mature economy - no convergence
      energyIntensity: 0.69,    // MWh per $1000 GDP PPP: US TFC ~16.5k TWh (IEA WEB 2023, ~42% of OECD final energy)
      intensityDecline: 0.013,  // 1.3%/year
      elecShareMultiplier2025: 1.04,  // US elec ~4.3k TWh gen 2024 (EIA/Ember) = ~26% of final energy
    },
    'oecd-ex-us': {
      gdp2025: 38,              // $38T PPP (World Bank 2017 intl $; 62 model-OECD less the US)
      marketPriceRatio2025: 0.738,  // 2025 GDP at market rates / at PPP (US = 1): IMF WEO Oct 2026 NGDPD/PPPGDP, data/fiscal/imf-weo-regions.csv
      tfpGrowth: 0.007,         // Residual TFP: Europe/Japan productivity growth below the US
      tfpDecay: 0.0,            // Mature economy - no convergence
      energyIntensity: 0.59,    // MWh per $1000 GDP PPP: ~22.5k TWh TFC (EU/Japan ~0.5, Mexico/Turkey/Korea higher); us + ex-us preserve the old ~39k TWh
      intensityDecline: 0.013,  // 1.3%/year (advanced economies ~1.5-2%/yr historical)
      elecShareMultiplier2025: 1.09,  // ~6.2k TWh gen 2024 (Ember) = ~27.5% of final energy; all multipliers scaled +5% so regional sums reconcile to the ~31.5k TWh world total
    },
    china: {
      gdp2025: 33,              // $33T PPP
      marketPriceRatio2025: 0.477,  // 2025 GDP at market rates / at PPP (US = 1): IMF WEO Oct 2026 NGDPD/PPPGDP, data/fiscal/imf-weo-regions.csv
      // Catch-up residual fitted (grid search, 2026-11) so the model's China-minus-
      // world real growth gap matches the P50 of a 24-seat Tetlock calibration
      // panel: 0.87pp mean 2026-30 (model 0.86) and 0.28pp 2031-35 (model 0.28).
      // See docs/forecasts/calibration-china-solar-2035/. Second source: the IMF
      // WEO Oct 2026 China path (4.5% 2026, 4.0% 2027, ~3.3% by 2029 vs world
      // ~3.1-3.2%) closes the gap to ~0.2pp by decade's end; Pritchett & Summers
      // (2014, NBER w20573) regression to the mean and the Korea/Taiwan second
      // decade past ~$25k PPP (gap ~0 or below). The excess over the floor halves
      // in ~6 yr; the old 0.025/0.015 (to a zero floor) held the gap at 0.84pp
      // through 2035. The floor carries China to the OECD-ex-US residual rather
      // than to zero; post-2035 China grows ~0.3pp below world as its workforce
      // shrinks (2035-50 -0.28pp, 2050-2100 -0.35pp) — the panel did not speak to that tail.
      tfpGrowth: 0.028,         // Residual TFP (catch-up component), 2025
      tfpDecay: 0.115,          // Catch-up excess fades ~11.5%/yr (fitted; see above)
      tfpFloor: 0.007,          // Converges on the OECD-ex-US residual (frontier TFP), not zero
      energyIntensity: 1.11,    // PPP-adjusted (preserves ~37k TWh)
      intensityDecline: 0.015,  // 1.5%/year
      elecShareMultiplier2025: 1.07,  // China elec ~9.5k TWh gen 2024 (Ember) ~= uniform share
    },
    india: {
      gdp2025: 16,              // $16T PPP (India + South Asia)
      marketPriceRatio2025: 0.231,  // 2025 GDP at market rates / at PPP (US = 1): IMF WEO Oct 2026 NGDPD/PPPGDP, data/fiscal/imf-weo-regions.csv
      tfpGrowth: 0.025,         // Residual TFP (catch-up growth)
      tfpDecay: 0.012,          // Gradual convergence
      energyIntensity: 0.65,    // PPP-adjusted (preserves ~10k TWh)
      intensityDecline: 0.014,  // 1.4%/year
      elecShareMultiplier2025: 0.84,  // India elec ~2.0k TWh gen 2024 vs ~2.5k uniform
    },
    latam: {
      gdp2025: 12,              // $12T PPP (Latin America)
      marketPriceRatio2025: 0.476,  // 2025 GDP at market rates / at PPP (US = 1): IMF WEO Oct 2026 NGDPD/PPPGDP, data/fiscal/imf-weo-regions.csv
      tfpGrowth: 0.012,         // Residual TFP
      tfpDecay: 0.005,          // Slow convergence
      energyIntensity: 0.50,    // PPP-adjusted (preserves ~6k TWh)
      intensityDecline: 0.012,  // 1.2%/year
      elecShareMultiplier2025: 1.09,  // LatAm elec ~1.7k TWh gen 2024, hydro-heavy grid
    },
    seasia: {
      gdp2025: 12,              // $12T PPP (SE Asia + Pacific)
      marketPriceRatio2025: 0.322,  // 2025 GDP at market rates / at PPP (US = 1): IMF WEO Oct 2026 NGDPD/PPPGDP, data/fiscal/imf-weo-regions.csv
      tfpGrowth: 0.020,         // Residual TFP (manufacturing hubs)
      tfpDecay: 0.008,          // Gradual convergence
      energyIntensity: 0.53,    // PPP-adjusted (preserves ~6k TWh)
      intensityDecline: 0.013,  // 1.3%/year
      elecShareMultiplier2025: 0.89,  // SE Asia elec ~1.3k TWh gen 2024 vs ~1.6k uniform
    },
    russia: {
      gdp2025: 7,               // $7T PPP (Russia + CIS)
      marketPriceRatio2025: 0.346,  // 2025 GDP at market rates / at PPP (US = 1): IMF WEO Oct 2026 NGDPD/PPPGDP, data/fiscal/imf-weo-regions.csv
      tfpGrowth: 0.005,         // Low residual TFP (aging, fossil-dependent)
      tfpDecay: 0.003,          // Very slow convergence
      energyIntensity: 1.03,    // PPP-adjusted (preserves ~7k TWh)
      intensityDecline: 0.012,  // 1.2%/year
      elecShareMultiplier2025: 0.76,  // Russia+CIS elec ~1.2k TWh gen 2024; gas-heavy direct fuel use
    },
    mena: {
      gdp2025: 9,               // $9T PPP (MENA)
      marketPriceRatio2025: 0.371,  // 2025 GDP at market rates / at PPP (US = 1): IMF WEO Oct 2026 NGDPD/PPPGDP, data/fiscal/imf-weo-regions.csv
      tfpGrowth: 0.010,         // Residual TFP (fossil exporters diversifying)
      tfpDecay: 0.005,          // Slow convergence
      energyIntensity: 0.67,    // PPP-adjusted (preserves ~6k TWh)
      intensityDecline: 0.012,  // 1.2%/year
      elecShareMultiplier2025: 1.03,  // MENA elec ~1.4k TWh gen 2024
    },
    ssa: {
      gdp2025: 7,               // $7T PPP (Sub-Saharan Africa, unchanged)
      marketPriceRatio2025: 0.290,  // 2025 GDP at market rates / at PPP (US = 1): IMF WEO Oct 2026 NGDPD/PPPGDP, data/fiscal/imf-weo-regions.csv
      tfpGrowth: 0.020,         // Residual TFP (demographic dividend)
      tfpDecay: 0.010,          // Gradual convergence
      energyIntensity: 1.50,    // Unchanged (already PPP-like)
      intensityDecline: 0.012,  // 1.2%/year
      elecShareMultiplier2025: 0.23,  // SSA elec ~0.55k TWh gen 2024 vs ~2.5k uniform; ~600M without access
    },
  },

  // Sector-level parameters (IEA-calibrated)
  // Transport: EVs growing fast, aviation/shipping slow
  // Buildings: Heat pumps, electric heating
  // Industry: Electric arc furnaces, hydrogen steel
  sectors: {
    transport: {
      // IEA World Energy Balances: transport ~28-29% of final consumption.
      // (The prior 0.45 was miscited and nearly doubled the oil-displacement lever.)
      share: 0.29,
      electrification2025: 0.02,      // 2% (mostly rail)
      costEscalationThreshold: 0.60,  // EVs easy up to 60%, then aviation/shipping get hard
      costEscalationRate: 3.0,        // Quadratic cost escalation strength (aviation/shipping very hard)
      costSensitivity: 0.08,          // Response to fuel/elec cost ratio
      basePressure: 0.015,            // Background electrification pressure
      efficiencyMultiplier: 3.5,      // EVs 3.5x more efficient than ICE
      maxAnnualChange: 0.04,          // 4%/year max (infrastructure)
      relativeDiffusionCap: 0.28,     // observed EV electricity-consumption growth ~30-35%/yr 2019-2024 (IEA Global EV Outlook), decelerating
      reversalStickiness: 0.3,        // no direct source; stock-turnover rationale (vehicle fleet ~15yr turnover) — reversal ~3x slower than adoption
      primaryFuel: 'oil',             // Competes with oil (gasoline/diesel)
      // IEA World Energy Balances (2022-23): transport final use ~91% oil
      // products, ~3.5% natural gas, ~3.5% biofuels, ~1.5% electricity.
      // Non-electric recipe below; ALL of the model's biofuel sits here.
      fuelShares2025: { oil: 0.932, gas: 0.040, coal: 0, biomass: 0, hydrogen: 0, biofuel: 0.028 },
      electricityDeliveryCost: 50,    // $/MWh: public/home charging blend over wholesale (EIA retail gaps)
    },
    buildings: {
      share: 0.31,                    // ~30-31% of final consumption (IEA WEB, residential + commercial)
      electrification2025: 0.35,      // 35% (heating, appliances)
      costEscalationThreshold: 0.85,  // Heat pumps easy to 85%, then edge cases
      costEscalationRate: 1.5,        // Lighter escalation (most things can electrify)
      costSensitivity: 0.06,          // Less sensitive than transport
      basePressure: 0.02,             // Higher baseline (heat pump momentum)
      efficiencyMultiplier: 3.0,      // Heat pump COP ~3
      maxAnnualChange: 0.03,          // 3%/year max
      relativeDiffusionCap: 0.28,     // same diffusion physics; rarely binds (adoption already 35%)
      reversalStickiness: 0.3,        // no direct source; stock-turnover rationale (heating stock ~20yr) — reversal ~3x slower than adoption
      primaryFuel: 'gas',             // Competes with gas (heating)
      // IEA WEB residential + commercial, non-electric: natural gas, oil and
      // a little coal, plus bioenergy. Gas carries 0.66 because the model's
      // global biomass share (0.06) excludes most traditional biomass and the
      // model has no district-heat carrier; both land on gas here. Scaled
      // with the other two recipes to reproduce fuels.*.share2025 exactly.
      fuelShares2025: { oil: 0.150, gas: 0.661, coal: 0.060, biomass: 0.129, hydrogen: 0, biofuel: 0 },
      electricityDeliveryCost: 80,    // $/MWh: residential/commercial retail-wholesale gap (EIA ~\$80-110 res.)
    },
    industry: {
      // IEA WEB: industry ~29% of final consumption, plus the ~11%
      // other/non-energy bucket (feedstocks, agriculture) folded in here as
      // the conservative hard-to-electrify home.
      share: 0.40,
      // Industry proper is ~30% electric (motors, EAFs); diluted to ~0.22 by
      // the folded non-energy uses, which are effectively non-electrifiable.
      electrification2025: 0.22,
      // Ceiling similarly diluted: feedstocks cannot electrify, so the
      // escalation threshold falls from 0.55 (industry proper) to ~0.42.
      costEscalationThreshold: 0.42,
      costEscalationRate: 3.5,        // Strongest escalation (cement, glass, steel)
      costSensitivity: 0.10,          // Most cost-sensitive sector
      basePressure: 0.019,            // Calibrated so industry electrification keeps rising ~0.15pp/yr against adverse retail economics (IEA WEB: 21.9% 2015 -> ~23% 2023) — policy mandates + onsite generation bypass retail adders; the signed cost pressure alone would pin it at the 2025 floor
      efficiencyMultiplier: 1.1,      // Motors ~10% more efficient
      maxAnnualChange: 0.025,         // 2.5%/year max (long-lived equipment)
      relativeDiffusionCap: 0.28,     // same diffusion physics; rarely binds (adoption already 22%)
      reversalStickiness: 0.3,        // no direct source; stock-turnover rationale (industrial equipment ~25yr) — reversal ~3x slower than adoption
      primaryFuel: 'gas',             // Competes with gas (process heat)
      // IEA WEB industry + non-energy use (folded in, see share above),
      // non-electric: coal ~27% (iron & steel, cement, chemicals), gas ~30%,
      // oil incl. petrochemical feedstocks ~33%, bioenergy ~7% (pulp & paper),
      // and all of the model's 1% hydrogen (refining, ammonia).
      fuelShares2025: { oil: 0.3325, gas: 0.304, coal: 0.268, biomass: 0.070, hydrogen: 0.0255, biofuel: 0 },
      electricityDeliveryCost: 40,    // $/MWh: industrial retail-wholesale gap (EIA ~\$30-50)
    },
  },

  // Fuel mix for non-electric energy (2025 shares, will evolve)
  // Carbon intensities from IEA/IPCC, prices calibrated to IEA
  fuels: {
    oil: {
      // Re-derived after the sector reweighting: oil is ~40% of TOTAL final
      // consumption (IEA WEB), i.e. ~50% of the non-electric share — transport
      // fuel plus petrochemical feedstocks (now inside industry's 0.40).
      share2025: 0.50,
      carbonIntensity: 267,      // kg CO2/MWh (gasoline/diesel)
      price: 50,                 // $/MWh (~$80/barrel equivalent)
      priceEscalation: 0,        // Flat real (IEA WEO STEPS oil roughly flat to 2050)
      deliveryMargin: 45,        // $/MWh: refining + distribution + retail, ex-heavy-tax global blend
    },
    gas: {
      share2025: 0.30,           // Heating, industry
      carbonIntensity: 202,      // kg CO2/MWh
      price: 25,                 // $/MWh (US/global blend)
      priceEscalation: 0,        // Flat real (WEO STEPS)
      deliveryMargin: 20,        // $/MWh: transmission + local distribution
    },
    coal: {
      share2025: 0.12,           // Industrial heat, developing countries
      carbonIntensity: 341,      // kg CO2/MWh
      price: 15,                 // $/MWh (before carbon pricing)
      priceEscalation: 0,
      deliveryMargin: 5,         // $/MWh: mostly delivered at industrial scale
    },
    biomass: {
      share2025: 0.06,           // Traditional biomass
      carbonIntensity: 100,      // kg CO2/MWh (net with regrowth)
      price: 30,                 // $/MWh
      priceEscalation: 0,
      deliveryMargin: 10,
    },
    hydrogen: {
      share2025: 0.01,           // Negligible today
      carbonIntensity: 0,        // Green hydrogen (assume clean)
      // Static deliberately: hydrogen has NO supply side in this model (no
      // electrolysis electricity demand), so a declining price path would be
      // a free-decarbonization channel. Deferred until supply is modeled.
      price: 150,
      priceEscalation: 0,
      deliveryMargin: 20,
    },
    biofuel: {
      share2025: 0.01,           // Aviation, blends
      carbonIntensity: 50,       // kg CO2/MWh (lifecycle)
      price: 80,                 // $/MWh
      priceEscalation: 0,
      deliveryMargin: 20,
    },
  },

  // Energy burden parameters (1970s oil shock calibrated)
  energyBurden: {
    threshold: 0.08,             // 8% of GDP is threshold (normal cheap energy)
    elasticity: 1.5,             // GDP damage per % excess burden
    maxBurden: 0.14,             // 1970s crisis peak
  },

  // Fuel mix evolution parameters
  fuelMix: {
    priceSensitivity: 0.03,      // β in logit model ($/MWh scale)
    inertiaRate: 0.08,           // α = ~9yr half-life for fleet turnover
    // = energy.carbonPrice default (the global carbon price the default run
    // feeds demand). A calibration anchor, not an observable: it makes the
    // default run reproduce the 2025 recipes; scenarios above it shift away
    // from carbon-intensive fuels, scenarios below it toward them.
    referenceCarbonPrice: 35,
    // Observed 2015-2025: world crude steel +1.3%/yr (1,620 -> 1,849 Mt,
    // worldsteel) and world cement ~-0.3%/yr (4.1 Gt 2015 -> 4.0 Gt 2024,
    // USGS MCS 2016/2025) against world PPP GDP ~+3.0%/yr (IMF WEO), i.e.
    // steel ~0.44, cement ~-0.1. Forward: IEA Iron & Steel Technology
    // Roadmap (2020) steel demand +~1/3 to 2050 (~0.4); IEA/CSI Cement
    // Technology Roadmap (2018) +12-23% 2014-2050 (~0.1-0.2). 0.3 sits
    // between the two, nearer steel (the larger industrial coal user: met
    // coal ~1,114 of ~2,880 Mt non-power coal, IEA Coal 2025). Cross-check:
    // IEA Coal 2025 has global non-power coal flat 2025-2030 (2,880 -> ~2,877
    // Mt) on ~3%/yr GDP, i.e. ~0 near-term, so 0.3 is not the low end.
    heavyIndustryGdpElasticity: 0.3,
  },

  // Scales autonomous intensity decline. Production's serviceEfficiencyGrowth
  // is derived from it (src/param-derivations.ts), so the one efficiency
  // series moves together on both sides.
  efficiencyMultiplier: 1.0,    // Default: no adjustment
  // Forward decay of the structural (catch-up/sectoral-shift) component of
  // intensity decline. Production's eta is the same physical series: its
  // defaults read these, and runs derive them (src/param-derivations.ts).
  structuralEfficiencyShare: 0.33,  // ~0.42 of 1.29 pp/yr is structural (bonus over the CL-PFU device rate)
  structuralDecayHalfLife: 18,      // structural component halves ~every 18yr post-2025 (judgment, not sourced)

  // Robot/automation — ENDOGENOUS value-vs-cost adoption (no hard ceiling).
  // Replaces the old robotSaturation logistic cap (a speculative carrying
  // capacity with no literature anchor — see sources/ai-robotics-deployment-
  // ceilings.md). Robots deploy while the marginal unit's value exceeds its
  // cost; the ceiling is economic (integration costs rising with density +
  // capital competition via the interest rate + energy price), not a number.
  robotBaseline2025: 1,          // 1 robot per 1000 workers in 2025 (IFR World Robotics 2024: ~4.3M industrial robots ≈ 1/1000 of all workers). Must be > 0.
  robotDiffusionRate: 0.22,      // max adoption rate/yr at high profitability; calibrated so 2025 growth ≈ 14%/yr, inside IFR's observed 10-14%/yr (2015-2024)
  // JUDGMENT parameter (like production's structuralDecayHalfLife): the
  // integration-cost exponent theta is not independently sourced; it is
  // originally calibrated so baseline 2100 density landed near the old
  // default (~600/1000). The regional-allocator rescore raises the untuned
  // baseline to ~1000/1000; theta is not silently refit to hide that result.
  // THE dominant late-century automation dial — see docs/SENSITIVITY.md.
  robotIntegrationExponent: 0.75,
  robotDepreciation: 0.10,       // ~10-12yr robot service life (IFR World Robotics book-depreciation convention)
  robotDisplacementShare: 0.55,  // labour income share: ILO Global Wage Report 2024 ~52-55%; PWT 10.x labsh ~0.53. LOAD-BEARING: firms value displacement at full salaries (wage share x GDP/worker), not at the fitted production beta — same accounts-vs-fitted split as capital.ts's alpha=0.33 vs production 0.25. Pinned by the pi(2025) test.
  energyPerRobotMWh: 10,        // MWh per robot-unit per year
  robotUnitCost: 80000,         // $ installed per robot-unit: IFR avg unit price ~$27k + integration ~2-3x (2025). INDUSTRIAL-robot anchor: at humanoid-scale densities (ai-energy-boom) this is an unanchored ~5x extrapolation
  robotCostDecline: 0.03,       // real cost decline ~3%/yr (robotics price indices, conservative vs Wright's-law fits)

  // Datacenter/AI compute (endogenous, distributed by regional GDP)
  dataCenterBaseline2025: 500,        // TWh, IEA/EPRI 2024: datacenters ~1.5% of global elec (~460 TWh); AI inference boost → ~500
  dataCenterBaseGrowth: 0.12,         // Base growth rate; pace matches 2022–2025 hyperscale buildout (~doubling/6yr)
  // Replaces the hard 6,000-TWh dataCenterSaturation cap (an asserted number
  // ~4x the 2035 IEA-high case, with 2030 forecasts diverging ~40x — see
  // sources/ai-robotics-deployment-ceilings.md). The brake is economic: a
  // willingness-to-pay ceiling on datacenters' TOTAL COST OF OWNERSHIP as a
  // share of GDP: the power bill plus the composite capital's service cost
  // (dataCenterCapitalCostPerGW annualised at laggedInterestRate +
  // dataCenterDepreciation), as robots' marginal cost prices their capital.
  // In 2025 that is ~$48/MWh of power + ~$1,130/MWh of capital service
  // (~$5,140 of capital per MWh-year at $45B/GW x 22%), ~0.37% of GDP.
  // Braking on the power bill alone left ~96% of the cost outside the brake,
  // so neither capex nor capital scarcity (a rising interest rate) could slow
  // the buildout. A GDP-indexed demand ceiling, not a forecast: equilibrium
  // load = ceiling x GDP / cost per MWh. Default 1.3% of GDP (~3.5x the 2025
  // share) is FITTED so the 2025-2035 default load path matches the
  // power-bill brake it replaced (0.05% of GDP, ~3x the 2025 revealed power
  // share) within 0.8% a year, at $45B/GW and IEA siting: a re-expression of
  // the same calibration, not new evidence. Re-fit it when the capital cost
  // or depreciation defaults move. An LCOE or rate spike collapses the brake
  // (buildout halts, the stock persists): correct for long-lived assets. The
  // load remains a pure electricity sink in production
  // (aiWorkerEquivalentPerTWh=0 by default); its capex builds datacenter
  // capital and competes for the economy's financing.
  dataCenterSpendCeiling: 0.013,
  dataCenterEnergySensitivity: 0.4,   // LCOE elasticity: cheap power incentivizes more inference/training capacity
  dataCenterGDPSensitivity: 0.6,      // GDP-per-capita elasticity: compute demand follows wealth (knowledge-economy share)
  dataCenterReferenceLCOE: 50,        // $/MWh (same reference as robot load)
  dataCenterReferenceGDPpc: 15000,    // $ PPP per capita (global average ~2025)
  // One composite asset for now: chips, servers, networking, cooling, backup
  // power, and the datacenter shell. $45B per average GW of load, in current
  // (2025) dollars like robotUnitCost. Calibrated so the 2025 step (net
  // additions + 15% replacement, ~16 average GW) charges ~$0.7T, Dell'Oro's
  // worldwide 2025 datacenter capex ($455B in 2024, +57% in 2025; Dell'Oro
  // Group, Jan 2026). Bottom-up cross-checks per GW of facility capacity:
  // ~$38B (Epoch AI, "AI datacenter cost breakdown", 2025), ~$41B (Van
  // Nieuwerburgh, Brookings Papers draft, Sep 2026), ~$47-49B for Vera Rubin-era
  // builds (Foxconn; Morgan Stanley, 2026); per AVERAGE GW of load the figure is
  // higher by the inverse load factor. It was $15B, a judgment anchor that
  // charged ~$0.24T in 2025, a third of observed spend. Known limits: one
  // composite cost for the legacy and the AI fleet, and capex is booked in the
  // year the load arrives (no construction lead), so a boom's capex leads the
  // model's by 1-2 years (Dell'Oro: 2026 > $1T vs ~$0.8T here).
  // A 15% blended replacement rate sits between short-lived accelerators
  // (~4-6 years) and longer-lived buildings/electrical infrastructure.
  dataCenterCapitalCostPerGW: 45,     // $B per average GW of annual load (2025 $)
  dataCenterDepreciation: 0.15,       // fraction/year
  // Datacenter load is sited where compute is built, not by GDP share. IEA,
  // Energy and AI (2025): of ~415 TWh in 2024 the US used 45%, China 25%,
  // Europe 15%. The other 15% is split here by judgment, with Japan, Korea,
  // Australia and Canada joining Europe in oecd-ex-us (~5.5pp); Singapore and
  // Malaysia in seasia; India's ~1.5 GW of 2025 capacity (JLL India, 2025).
  // Held fixed: siting does not follow later GDP shifts (known limitation).
  // Spread by GDP share, the US hosted 15% (86 TWh in 2025 against IEA's
  // ~183 TWh in 2024) and US + China 36% of world compute against ~70%.
  dataCenterRegionalShare: {
    us: 0.45, china: 0.25, 'oecd-ex-us': 0.205, india: 0.025, seasia: 0.03,
    mena: 0.015, latam: 0.01, russia: 0.01, ssa: 0.005,
  },
  // Where the world's industrial robots are: IFR World Robotics 2025,
  // operational stock 2024 (4,663,698 units; China 2,027,190, Japan 450,530,
  // US 393,700, Korea ~392k, Germany ~280k), IFR blocks split by judgment
  // (Taiwan -> china, Turkey -> mena, Canada -> oecd-ex-us, ~66k unallocated
  // pro rata; docs/ai-offshoring/evidence.md section 2). Top four countries
  // firm; small regions +-50%. Year 0 turns these into robots per worker
  // relative to the world, held fixed, so siting then follows the workforce.
  robotStockShare2024: {
    china: 0.4623, 'oecd-ex-us': 0.3669, us: 0.0856, seasia: 0.0348, latam: 0.0226,
    india: 0.0152, mena: 0.0087, russia: 0.0022, ssa: 0.0017,
  },

  commodityShocks: [],
  regionalOutputAdjustments: [],
  // US GDP 2025 at market exchange rates: $30.86T, IMF WEO Oct 2026 (NGDPD,
  // data/fiscal/imf-weo-regions.csv). The world total is then a check, not an
  // input: calibration-anchors compares it with the IMF's $118.45T.
  usGdpMarketUsd2025: 30.86,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Robots per working-age person relative to the world, from stock shares;
 * and each region's share of robots (and their electricity): working-age
 * population weighted by that density.
 */
export function robotDensityFromStock(
  stockShare: Readonly<Record<Region, number>>,
  regionalWorking: Readonly<Record<Region, number>>,
): Record<Region, number> {
  const working = sumValues(regionalWorking);
  return Object.fromEntries(REGIONS.map((r) => [
    r, regionalWorking[r] > 0 ? stockShare[r] * working / regionalWorking[r] : 0,
  ])) as Record<Region, number>;
}

export function robotSitingShares(
  densityIndex: Readonly<Record<Region, number>>,
  regionalWorking: Readonly<Record<Region, number>>,
): Record<Region, number> {
  const weights = Object.fromEntries(REGIONS.map((r) => [r, densityIndex[r] * regionalWorking[r]])) as Record<Region, number>;
  const total = sumValues(weights);
  return Object.fromEntries(REGIONS.map((r) => [r, total > 0 ? weights[r] / total : 0])) as Record<Region, number>;
}

/**
 * Calibrated logit fuel shares for ONE sector, with inertia.
 *
 * A calibrated (alternative-specific-constant) logit: at the reference prices
 * - 2025 wholesale plus `referenceCarbonPrice` - it reproduces the sector's
 * 2025 recipe exactly, and shares move only as effective prices depart from
 * that reference:
 *
 *   logit_f ∝ recipe2025_f × exp(-β × (p_f(t) - p_f(ref)))
 *
 * The uncalibrated form (exp(-β × p_f) alone, one global mix) drifted every
 * year toward whatever fuel was cheapest at ANY carbon price: its equilibrium
 * at 2025 prices was ~34% coal / ~12% oil against an observed 12% / 50%, so
 * coal absorbed the share oil gave up and non-electric coal doubled by 2045.
 * A fuel with a zero recipe share stays at zero (coal cannot enter transport).
 *
 * @param fuels Fuel parameters (carbon intensity, 2025 wholesale price)
 * @param recipe2025 This sector's 2025 non-electric fuel recipe
 * @param wholesalePrices This year's escalated (and shocked) wholesale prices ($/MWh)
 * @param prevShares Previous year's shares for this sector
 * @param carbonPrice Carbon price this year ($/tonne)
 * @param referenceCarbonPrice Carbon price at which recipe2025 is calibrated ($/tonne)
 * @param priceSensitivity β in logit model
 * @param inertiaRate α blending rate (0 = all inertia, 1 = pure logit)
 * @returns New sector shares (normalized to sum to 1)
 */
function calculateLogitFuelShares(
  fuels: DemandParams['fuels'],
  recipe2025: Record<FuelType, number>,
  wholesalePrices: Record<FuelType, number>,
  prevShares: Record<FuelType, number>,
  carbonPrice: number,
  referenceCarbonPrice: number,
  priceSensitivity: number,
  inertiaRate: number
): Record<FuelType, number> {
  // Effective prices are WHOLESALE + carbon. Delivery margins are
  // deliberately excluded: priceSensitivity is calibrated on the wholesale
  // scale, and margins would skew the mix toward low-margin coal.
  const raw = {} as Record<FuelType, number>;
  let rawSum = 0;
  for (const fuel of FUEL_KEYS) {
    const f = fuels[fuel];
    const priceNow = wholesalePrices[fuel] + (f.carbonIntensity * carbonPrice) / 1000;
    const priceRef = f.price + (f.carbonIntensity * referenceCarbonPrice) / 1000;
    raw[fuel] = recipe2025[fuel] > 0
      ? recipe2025[fuel] * Math.exp(-priceSensitivity * (priceNow - priceRef))
      : 0;
    rawSum += raw[fuel];
  }

  // Blend with previous shares (fleet turnover); renormalize.
  const blended = {} as Record<FuelType, number>;
  let total = 0;
  for (const fuel of FUEL_KEYS) {
    const logitShare = rawSum > 0 ? raw[fuel] / rawSum : prevShares[fuel];
    blended[fuel] = inertiaRate * logitShare + (1 - inertiaRate) * prevShares[fuel];
    total += blended[fuel];
  }
  for (const fuel of FUEL_KEYS) {
    blended[fuel] = total > 0 ? blended[fuel] / total : recipe2025[fuel];
  }
  return blended;
}

/**
 * Industry's fuel mix with its coal slice scaled to heavy-materials activity.
 * `activityRatio` is (heavy-materials output index) / (industry service-base
 * index): below 1 when steel and cement grow slower than industry's energy
 * service as a whole. Coal's share scales by it and the remainder is spread
 * pro rata over the mix's other fuels EXCEPT hydrogen, so the mix still sums
 * to 1 and a fuel absent from it stays absent. Hydrogen keeps its share: it
 * has no supply side in this model (see fuels.hydrogen.price), so growing it
 * by composition would be a free decarbonization channel.
 */
export function heavyIndustryMix(
  shares: Record<FuelType, number>,
  activityRatio: number
): Record<FuelType, number> {
  const coalBefore = shares.coal;
  if (!(coalBefore > 0) || coalBefore >= 1 || activityRatio === 1) return shares;
  const fixed = shares.hydrogen;
  const coal = clamp(coalBefore * Math.max(0, activityRatio), 0, 0.99 - fixed);
  const restBefore = 1 - coalBefore - fixed;
  if (!(restBefore > 0)) return shares;
  const otherScale = (1 - coal - fixed) / restBefore;
  const mix = {} as Record<FuelType, number>;
  for (const fuel of FUEL_KEYS) {
    mix[fuel] = fuel === 'coal' ? coal : fuel === 'hydrogen' ? fixed : shares[fuel] * otherScale;
  }
  return mix;
}

/** Hard physical ceiling on electrification (mathematical bound, not normative target) */
const PHYSICAL_ELEC_CEILING = 0.98;

/**
 * Calculate cost-driven sector electrification rate with cost escalation.
 * Below the threshold, electrification proceeds at normal cost.
 * Above, costs rise quadratically — representing hard-to-electrify applications.
 * No hard wall: rates can exceed threshold if economics are favorable enough.
 *
 * @param prevRate Previous year's electrification rate
 * @param retailElectricityPrice Retail electricity price ($/MWh: wholesale LCOE + sector delivery adder)
 * @param retailFuelPrice Retail primary fuel price ($/MWh: escalated wholesale + delivery margin)
 * @param carbonPrice Carbon price ($/tonne)
 * @param fuelCarbonIntensity Fuel carbon intensity (kg CO2/MWh)
 * @param sectorParams Sector parameters
 * @param yearIndex Year index for infrastructure score
 * @returns New sector electrification rate
 */
function calculateSectorElectrification(
  prevRate: number,
  retailElectricityPrice: number,
  retailFuelPrice: number,
  carbonPrice: number,
  fuelCarbonIntensity: number,
  sectorParams: SectorParams,
  yearIndex: number
): number {
  // Effective fuel cost with carbon pricing
  const fuelCarbonCost = (fuelCarbonIntensity * carbonPrice) / 1000; // $/MWh
  const effectiveFuelCost = retailFuelPrice + fuelCarbonCost;

  // Retail electricity adjusted for efficiency (EVs use 1/3.5 the energy of ICE)
  const effectiveElecCost = retailElectricityPrice / sectorParams.efficiencyMultiplier;

  // Infrastructure score builds with adoption and time (0-1)
  // Higher adoption → better charging/grid infrastructure → lower effective cost
  const INFRA_ADOPTION_WEIGHT = 2;
  const INFRA_TIME_INCREMENT = 0.01;
  const infraScore = Math.min(1, prevRate * INFRA_ADOPTION_WEIGHT + yearIndex * INFRA_TIME_INCREMENT);

  // Adjust cost ratio for infrastructure (lower infra → higher effective elec cost)
  const infraPenalty = 1 + 0.3 * (1 - infraScore); // 30% penalty at zero infra
  let adjustedElecCost = effectiveElecCost * infraPenalty;

  // Cost escalation above threshold: quadratic increase in effective electricity cost
  // Represents genuinely hard-to-electrify applications (long-haul aviation, high-temp cement)
  const threshold = sectorParams.costEscalationThreshold;
  if (prevRate > threshold) {
    const overshoot = (prevRate - threshold) / (1 - threshold);
    adjustedElecCost *= 1 + sectorParams.costEscalationRate * overshoot * overshoot;
  }

  // Cost ratio: fuel cost / adjusted electricity cost
  // When ratio > 1, electricity is cheaper → pressure to electrify
  const costRatio = effectiveFuelCost / adjustedElecCost;

  // Pressure = base + sensitivity × log(ratio). The log is SIGNED: when
  // electricity is expensive relative to the fuel (ratio < 1), pressure can
  // go negative and electrification REVERSES toward the 2025 floor — the
  // emissions release valve the adversarial review found missing (the old
  // max(1, ratio) clamp meant expensive clean energy could only make the
  // world poorer, never dirtier; reality's revealed alternative is burning
  // more fuel). Ratio sanity-clamped to [0.2, 5] so extreme transients
  // cannot swing pressure unboundedly.
  const rawCostPressure = sectorParams.costSensitivity
    * Math.log(clamp(costRatio, 0.2, 5));
  // Hysteresis: reversal is stickier than adoption — installed electric
  // stock (heat pumps, EV fleets, electrified process heat) is not scrapped
  // when fuel gets cheap; it reverts only through replacement cycles.
  const costPressure = rawCostPressure >= 0
    ? rawCostPressure
    : rawCostPressure * sectorParams.reversalStickiness;
  // NOTE: basePressure and this signed costPressure are JOINTLY calibrated —
  // industry's basePressure default offsets a persistently negative cost
  // pressure (see the defaults comment); retune them together.
  const totalPressure = sectorParams.basePressure + costPressure;

  // Apply pressure to gap-to-ceiling (physical ceiling, not normative)
  const gapToCeiling = PHYSICAL_ELEC_CEILING - prevRate;
  const desiredChange = totalPressure * gapToCeiling;

  // Clamp annual change. Two caps: the absolute infrastructure cap
  // (maxAnnualChange), and a relative diffusion cap — adoption cannot jump
  // 4pp in a year from a 2% base; fleets/stock turn over multiplicatively.
  // Only binds at low adoption (above ~15% the absolute cap binds first).
  const maxUp = Math.min(
    sectorParams.maxAnnualChange,
    prevRate * sectorParams.relativeDiffusionCap
  );
  const clampedChange = Math.max(
    -sectorParams.maxAnnualChange,
    Math.min(maxUp, desiredChange)
  );

  // Floor at the 2025 rate: reversal can stall electrification but not push
  // the share below the 2025 mix — a KNOWN LIMITATION of the release valve
  // (true de-electrification below today's stock is inexpressible; the
  // high-emissions tail comes from demand growth on a frozen mix). A
  // non-substitutable-share floor per sector would be the deeper treatment.
  const newRate = Math.max(
    sectorParams.electrification2025,
    Math.min(PHYSICAL_ELEC_CEILING, prevRate + clampedChange)
  );

  return newRate;
}

/**
 * Efficiency-corrected final-energy factors for a sector at a given
 * electrification rate. GDP x intensity is final energy at the 2025
 * electrification mix, so only the INCREMENT of electrification beyond 2025
 * converts at 1/efficiencyMultiplier (an EV draws ~1/3.5 the final energy of
 * the ICE it displaces); the 2025 electric baseload (lights, appliances) has
 * no fuel counterfactual and keeps its measured final energy. Counting
 * previously electrified demand at fuel-scale TWh — as the model once did —
 * inflates generation ~3x physical reality and, through it, the
 * useful-energy GDP channel.
 *
 * @returns elec/nonElec: fractions of the sector's service base, final-energy basis
 */
function sectorFinalFactors(
  s: SectorParams,
  rate: number
): { elec: number; nonElec: number } {
  const increment = Math.max(0, rate - s.electrification2025);
  const baseElec = Math.min(rate, s.electrification2025);
  return {
    elec: baseElec + increment / s.efficiencyMultiplier,
    nonElec: 1 - rate,
  };
}

/**
 * Convert an energy-expenditure burden into the same bounded GDP level
 * damage used by the global production path. A persistent burden is a
 * persistent level wedge, not a fresh growth penalty every year. A hinge at
 * the threshold: only regions whose burden sits above it respond to small
 * changes in their energy bill (SSA does on the default path).
 */
function energyBurdenDamage(
  burden: number,
  params: EnergyBurdenParams
): number {
  const cappedBurden = Math.min(
    Math.max(0, burden),
    params.maxBurden
  );
  return cappedBurden > params.threshold
    ? (cappedBurden - params.threshold) * params.elasticity
    : 0;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

/**
 * GDP-weighted average of the regional autonomous intensity-decline rates:
 * production's serviceEfficiencyGrowth (times efficiencyMultiplier) in every
 * run, through src/param-derivations.ts. One efficiency series, two views —
 * see production.ts. simulation.test.ts pins production's standalone default
 * near it.
 */
export function gdpWeightedIntensityDecline(
  regions: Readonly<Record<Region, { gdp2025: number; intensityDecline: number }>> = demandDefaults.regions
): number {
  let weighted = 0;
  let weight = 0;
  for (const region of REGIONS) {
    weighted += regions[region].gdp2025 * regions[region].intensityDecline;
    weight += regions[region].gdp2025;
  }
  return weight > 0 ? weighted / weight : 0;
}

// =============================================================================
// INVARIANTS
// =============================================================================

/**
 * Partitions demand promises every step. The sector split once reclassified
 * robot and datacenter electricity as sector fuel (03129ca); these hold that
 * line in every scenario and year rather than at the three years a test chose.
 */
const DEMAND_INVARIANTS: readonly ModuleInvariant<
  DemandParams, DemandState, DemandInputs, DemandOutputs
>[] = [
  {
    name: 'final energy is electricity plus non-electric',
    check: ({ outputs }) => closeTo('total final energy', outputs.totalFinalEnergy,
      outputs.electricityDemand + outputs.nonElectricEnergy),
  },
  {
    name: 'sectors partition non-electric energy',
    check: ({ outputs }) => closeTo('non-electric energy', outputs.nonElectricEnergy,
      sumValues(outputs.sectors, (sector) => sector.nonElectric)),
  },
  {
    name: 'each sector is its electric plus non-electric part',
    check: ({ outputs }) => Object.entries(outputs.sectors).map(([name, sector]) =>
      closeTo(`${name} total`, sector.total, sector.electric + sector.nonElectric)),
  },
  {
    name: 'fuels partition non-electric energy',
    check: ({ outputs }) => closeTo('fuel sum', sumValues(outputs.fuels), outputs.nonElectricEnergy),
  },
  {
    name: 'regions partition GDP at market rates',
    check: ({ outputs }) => closeTo('GDP at market rates', outputs.gdpMarket,
      sumValues(outputs.regionalGdpMarket)),
  },
  {
    // Every TWh of fuel is billed to a region, lock-in fuel included: the
    // regional energy burden feeds the regional GDP allocator, so fuel billed
    // to no region understates burdens (and once made the allocation depend
    // on whether a year carried a commodity-shock entry).
    name: 'regions partition fuel cost',
    check: ({ outputs }) => closeTo('fuel cost', outputs.fuelCost,
      sumValues(outputs.regionalFuelCost)),
  },
  {
    name: 'global electricity is the sum of regions',
    check: ({ outputs }) => closeTo('electricity demand', outputs.electricityDemand,
      sumValues(outputs.regional, (region) => region.electricityDemand)),
  },
];

export const demandModule: Module<
  DemandParams,
  DemandState,
  DemandInputs,
  DemandOutputs
> = defineModule<DemandParams, DemandState, DemandInputs, DemandOutputs>({
  name: 'demand',
  description: 'GDP and electricity demand model with regional economics',
  defaults: demandDefaults,
  invariants: DEMAND_INVARIANTS,

  paramMeta: {
    sectors: {
      transport: {
        costEscalationThreshold: {
          paramName: 'transportEscalationThreshold',
          description: 'Transport electrification threshold above which costs escalate quadratically. EVs easy to here, then aviation/shipping get hard.',
          unit: 'fraction',
          range: { min: 0.40, max: 0.80, default: 0.60 },
          tier: 1 as const,
        },
        costSensitivity: {
          paramName: 'transportCostSensitivity',
          description: 'Transport sector response to electricity/fuel cost ratio. Higher = faster EV adoption when cheap.',
          unit: 'fraction per cost ratio',
          range: { min: 0.02, max: 0.20, default: 0.08 },
          tier: 1 as const,
        },
      },
      buildings: {
        costEscalationThreshold: {
          paramName: 'buildingsEscalationThreshold',
          description: 'Buildings electrification threshold above which costs escalate. Heat pumps easy to 85%, then edge cases.',
          unit: 'fraction',
          range: { min: 0.60, max: 0.95, default: 0.85 },
          tier: 1 as const,
        },
        costSensitivity: {
          paramName: 'buildingsCostSensitivity',
          description: 'Buildings sector response to electricity/gas cost ratio. Heat pump adoption sensitivity.',
          unit: 'fraction per cost ratio',
          range: { min: 0.02, max: 0.15, default: 0.06 },
          tier: 1 as const,
        },
      },
      industry: {
        costEscalationThreshold: {
          paramName: 'industryEscalationThreshold',
          description: 'Industry electrification threshold above which costs escalate. EAFs/motors easy to 55%, high-temp very hard.',
          unit: 'fraction',
          range: { min: 0.35, max: 0.75, default: 0.55 },
          tier: 1 as const,
        },
        costSensitivity: {
          paramName: 'industryCostSensitivity',
          description: 'Industry sector response to cost signals. Most cost-sensitive sector.',
          unit: 'fraction per cost ratio',
          range: { min: 0.02, max: 0.25, default: 0.10 },
          tier: 1 as const,
        },
      },
    },
    fuelMix: {
      priceSensitivity: {
        paramName: 'fuelPriceSensitivity',
        description: 'Logit model sensitivity to effective fuel prices. Higher = faster response to price signals.',
        unit: 'per $/MWh',
        range: { min: 0.01, max: 0.10, default: 0.03 },
        tier: 1 as const,
      },
      inertiaRate: {
        paramName: 'fuelInertiaRate',
        description: 'Rate of fuel mix adjustment (0.08 = ~9yr half-life matching fleet turnover).',
        unit: 'fraction/year',
        range: { min: 0.02, max: 0.20, default: 0.08 },
        tier: 1 as const,
      },
      heavyIndustryGdpElasticity: {
        paramName: 'heavyIndustryGdpElasticity',
        description: 'GDP elasticity of heavy-materials output (steel, cement), which industry coal tracks instead of industry\'s whole service base. 0 = steel/cement flat (IEA Coal 2025 near-term); ~0.44 = 2015-2025 steel; >~0.7 approaches the old GDP x intensity scaling.',
        unit: 'elasticity',
        range: { min: 0, max: 1, default: 0.3 },
        tier: 1 as const,
      },
    },
    robotDiffusionRate: {
      description: 'Max robot adoption rate per year at high profitability (diffusion/manufacturing-ramp limit). Calibrated so 2025 growth ~14%/yr, inside IFR observed 10-14%/yr.',
      unit: 'fraction/year',
      range: { min: 0.05, max: 0.5, default: 0.22 },
      tier: 1 as const,
    },
    robotIntegrationExponent: {
      description: 'Integration-cost exponent theta: robot marginal cost scales with (density/anchor)^theta (installation, workflow redesign, scarce integrator labor). JUDGMENT parameter originally calibrated near the old 600/1000 default; the allocator rescore raises the untuned baseline to about 1000/1000. THE dominant late-century automation/GDP dial. See docs/SENSITIVITY.md.',
      unit: 'elasticity',
      range: { min: 0.3, max: 1.2, default: 0.75 },
      tier: 1 as const,
    },
    robotDepreciation: {
      description: 'Robot fleet depreciation rate (~10-12yr service life, IFR). Enters marginal cost as capital service and drives replacement capex; unprofitable fleets decay at this rate.',
      unit: 'fraction/year',
      range: { min: 0.05, max: 0.2, default: 0.10 },
      tier: 1 as const,
    },
    robotDisplacementShare: {
      description: 'Wage share used to value displaced labor in the robot business case (labour income share: ILO ~52-55%, PWT labsh ~0.53). LOAD-BEARING: scales profitability linearly; pinned by the pi(2025) test.',
      unit: 'fraction',
      range: { min: 0.3, max: 0.7, default: 0.55 },
      tier: 1 as const,
    },
    dataCenterBaseGrowth: {
      description: 'Base logistic growth rate for datacenter load. Calibrated to hyperscale buildout pace.',
      unit: 'fraction/year',
      range: { min: 0.04, max: 0.25, default: 0.12 },
      tier: 1 as const,
    },
    dataCenterSpendCeiling: {
      description: 'Willingness-to-pay ceiling on datacenters\' TOTAL COST OF OWNERSHIP as a share of GDP: the power bill plus capital service (dataCenterCapitalCostPerGW annualised at the lagged interest rate + dataCenterDepreciation). Default 1.3% (~3.5x the 2025 share at $45B/GW) is fitted to keep the 2025-2035 load path of the power-bill brake it replaced. Equilibrium load = ceiling x GDP / cost per MWh, a GDP-indexed demand ceiling, not a forecast.',
      unit: 'fraction of GDP',
      range: { min: 0.004, max: 0.13, default: 0.013 },
      tier: 1 as const,
    },
    dataCenterEnergySensitivity: {
      description: 'LCOE elasticity for datacenter adoption. Cheap power accelerates AI/cloud buildout.',
      unit: 'elasticity',
      range: { min: 0, max: 1.0, default: 0.4 },
      tier: 1 as const,
    },
    dataCenterGDPSensitivity: {
      description: 'GDP-per-capita elasticity for datacenter demand. Rising wealth → more compute consumption.',
      unit: 'elasticity',
      range: { min: 0, max: 1.0, default: 0.6 },
      tier: 1 as const,
    },
    dataCenterCapitalCostPerGW: {
      description: 'Composite chips, servers, networking, cooling, power, and facility cost per average GW of annual datacenter electricity load.',
      unit: '$B/average GW',
      range: { min: 0, max: 100, default: 15 },
      tier: 1 as const,
    },
    dataCenterDepreciation: {
      description: 'Blended annual replacement rate for the composite datacenter asset (short-lived chips plus longer-lived facilities).',
      unit: 'fraction/year',
      range: { min: 0, max: 0.5, default: 0.15 },
      tier: 1 as const,
    },
  },

  connectorTypes: {
    inputs: {
      regionalWorking: unitPort('people', 'record'),
      regionalEffectiveWorkers: unitPort('people', 'record'),
      regionalDependency: unitPort('fraction', 'record'),
      population: unitPort('people'),
      working: unitPort('people'),
      dependency: unitPort('fraction'),
      gdp: unitPort('$T/year'),
      regionalDamages: unitPort('fraction', 'record'),
      totalGeneration: unitPort('TWh/year'),
      carbonPrice: unitPort('$/tCO2'),
      laggedAvgLCOE: unitPort('$/MWh'),
      laggedInterestRate: unitPort('fraction'),
      laggedLaborShare: unitPort('fraction'),
      robotLaborEquivalent: unitPort('people/robot'),
      cdrEnergy: unitPort('TWh/year'),
      regionalEnergyBurden: unitPort('fraction', 'record'),
      regionalReliabilityFactor: unitPort('fraction', 'record'),
      laborOutputElasticity: unitPort('fraction'),
    },
    outputs: {
      electricityDemand: unitPort('TWh/year'),
      electrificationRate: unitPort('fraction'),
      totalFinalEnergy: unitPort('TWh/year'),
      nonElectricEnergy: unitPort('TWh/year'),
      nonElectricEnergyPotential: unitPort('TWh/year'),
      gdpPerWorking: unitPort('$/people/year'),
      finalEnergyPerCapitaDay: unitPort('kWh/people/day'),
      regional: REGIONAL_DEMAND_PORT,
      regionalAllocation: REGIONAL_ALLOCATION_PORT,
      sectors: DEMAND_SECTORS_PORT,
      fuels: unitPort('TWh/year', 'record'),
      nonElectricEmissions: unitPort('GtCO2/year'),
      electricityCost: unitPort('$T/year'),
      fuelCost: unitPort('$T/year'),
      totalEnergyCost: unitPort('$T/year'),
      energyBurden: unitPort('fraction'),
      burdenDamage: unitPort('fraction'),
      regionalFuelCost: unitPort('$T/year', 'record'),
      regionalFuelAvailability: unitPort('fraction', 'record'),
      usefulWorkGrowthRate: unitPort('fraction/year'),
      robotLoadTWh: unitPort('TWh/year'),
      robotCapexSpend: unitPort('$T/year'),
      robotCapitalValue: unitPort('$T'),
      robotsPer1000: unitPort('robot/kpeople'),
      robotProfitability: unitPort('1'),
      fossilStockTWh: unitPort('TWh/year'),
      dataCenterLoadTWh: unitPort('TWh/year'),
      dataCenterCapexSpend: unitPort('$T/year'),
      dataCenterCapitalValue: unitPort('$T'),
      dataCenterPowerSpendShare: unitPort('fraction'),
      gdpMarket: unitPort('$T/year'),
      regionalGdpMarket: unitPort('$T/year', 'record'),
      dataCenterSpendShare: unitPort('fraction'),
    },
  },

  validate(params: Partial<DemandParams>) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate regional params
    if (params.regions) {
      for (const region of REGIONS) {
        const r = params.regions[region];
        if (!r) continue;

        if (r.gdp2025 !== undefined && r.gdp2025 < 0) {
          errors.push(`${region}: GDP must be positive`);
        }
        if (r.marketPriceRatio2025 !== undefined
          && (!Number.isFinite(r.marketPriceRatio2025) || r.marketPriceRatio2025 <= 0 || r.marketPriceRatio2025 > 3)) {
          errors.push(`${region}: marketPriceRatio2025 must be in (0, 3]`);
        }
        if (r.tfpGrowth !== undefined && (r.tfpGrowth < -0.05 || r.tfpGrowth > 0.10)) {
          errors.push(`${region}: TFP growth must be between -5% and 10%`);
        }
        if (r.tfpFloor !== undefined && (r.tfpFloor < -0.02 || r.tfpFloor > 0.03)) {
          errors.push(`${region}: tfpFloor must be between -2% and 3%`);
        }
        if (r.energyIntensity !== undefined && r.energyIntensity < 0) {
          errors.push(`${region}: Energy intensity must be positive`);
        }
        if (r.intensityDecline !== undefined && r.intensityDecline > 0.05) {
          warnings.push(`${region}: Energy intensity decline >5%/year is unusually high`);
        }
        if (r.elecShareMultiplier2025 !== undefined &&
            (r.elecShareMultiplier2025 < 0.1 || r.elecShareMultiplier2025 > 1.5)) {
          errors.push(`${region}: elecShareMultiplier2025 must be between 0.1 and 1.5`);
        }
      }
    }

    // Validate sector cost escalation params
    if (params.sectors) {
      for (const sector of ['transport', 'buildings', 'industry'] as const) {
        const s = params.sectors[sector];
        if (!s) continue;
        if (s.costEscalationThreshold !== undefined) {
          if (s.costEscalationThreshold < 0 || s.costEscalationThreshold > 0.98) {
            errors.push(`${sector}: costEscalationThreshold must be between 0 and 0.98`);
          }
        }
        if (s.costEscalationRate !== undefined) {
          if (s.costEscalationRate < 0) {
            errors.push(`${sector}: costEscalationRate must be non-negative`);
          }
        }
        if (s.electricityDeliveryCost !== undefined) {
          if (s.electricityDeliveryCost < 0 || s.electricityDeliveryCost > 200) {
            errors.push(`${sector}: electricityDeliveryCost must be between 0 and 200 $/MWh`);
          }
        }
        if (s.relativeDiffusionCap !== undefined) {
          if (s.relativeDiffusionCap < 0.05 || s.relativeDiffusionCap > 1) {
            errors.push(`${sector}: relativeDiffusionCap must be between 0.05 and 1 per year`);
          }
        }
        if (s.reversalStickiness !== undefined) {
          if (s.reversalStickiness < 0 || s.reversalStickiness > 1) {
            errors.push(`${sector}: reversalStickiness must be between 0 and 1`);
          }
        }
      }
    }

    if (params.robotUnitCost !== undefined && params.robotUnitCost < 0) {
      errors.push('robotUnitCost must be non-negative');
    }
    if (params.robotCostDecline !== undefined &&
        (params.robotCostDecline < 0 || params.robotCostDecline >= 1)) {
      errors.push('robotCostDecline must be in [0, 1)');
    }
    if (params.robotBaseline2025 !== undefined && params.robotBaseline2025 <= 0) {
      errors.push('robotBaseline2025 must be > 0');
    }
    if (params.robotDiffusionRate !== undefined &&
        (params.robotDiffusionRate < 0 || params.robotDiffusionRate > 0.6)) {
      errors.push('robotDiffusionRate must be in [0, 0.6]');
    }
    if (params.robotIntegrationExponent !== undefined &&
        (params.robotIntegrationExponent < 0 || params.robotIntegrationExponent > 2)) {
      errors.push('robotIntegrationExponent must be in [0, 2]');
    }
    if (params.robotDepreciation !== undefined &&
        (params.robotDepreciation <= 0 || params.robotDepreciation > 0.5)) {
      errors.push('robotDepreciation must be in (0, 0.5]');
    }
    if (params.robotDisplacementShare !== undefined &&
        (params.robotDisplacementShare <= 0 || params.robotDisplacementShare > 1)) {
      errors.push('robotDisplacementShare must be in (0, 1]');
    }
    if (params.dataCenterSpendCeiling !== undefined &&
        (params.dataCenterSpendCeiling <= 0 || params.dataCenterSpendCeiling > 0.2)) {
      errors.push('dataCenterSpendCeiling must be in (0, 0.2]');
    }
    if (params.dataCenterCapitalCostPerGW !== undefined &&
        (params.dataCenterCapitalCostPerGW < 0 || params.dataCenterCapitalCostPerGW > 100)) {
      errors.push('dataCenterCapitalCostPerGW must be in [0, 100]');
    }
    if (params.dataCenterDepreciation !== undefined &&
        (params.dataCenterDepreciation < 0 || params.dataCenterDepreciation > 0.5)) {
      errors.push('dataCenterDepreciation must be in [0, 0.5]');
    }
    if (params.robotStockShare2024 !== undefined) {
      const shares = Object.values(params.robotStockShare2024) as number[];
      const total = shares.reduce((a, b) => a + b, 0);
      if (shares.some((x) => !(x >= 0)) || Math.abs(total - 1) > 1e-6) {
        errors.push('robotStockShare2024 must be non-negative and sum to 1');
      }
    }
    if (params.dataCenterRegionalShare !== undefined) {
      const shares = Object.values(params.dataCenterRegionalShare) as number[];
      const total = shares.reduce((a, b) => a + b, 0);
      if (shares.some((x) => !(x >= 0)) || Math.abs(total - 1) > 1e-6) {
        errors.push('dataCenterRegionalShare must be non-negative and sum to 1');
      }
    }

    // Validate sector fuel recipes (the calibrated fuel-mix logit's anchors)
    if (params.sectors) {
      for (const sector of ['transport', 'buildings', 'industry'] as const) {
        const recipe = params.sectors[sector]?.fuelShares2025;
        if (!recipe) continue;
        let sum = 0;
        for (const fuel of FUEL_KEYS) {
          const v = recipe[fuel];
          if (v === undefined || !Number.isFinite(v) || v < 0) {
            errors.push(`sectors.${sector}.fuelShares2025.${fuel} must be a non-negative number`);
          } else {
            sum += v;
          }
        }
        if (Math.abs(sum - 1) > 0.005) {
          errors.push(`sectors.${sector}.fuelShares2025 must sum to 1 (got ${sum.toFixed(3)})`);
        }
      }
    }
    if (params.fuelMix?.referenceCarbonPrice !== undefined &&
        (!Number.isFinite(params.fuelMix.referenceCarbonPrice) || params.fuelMix.referenceCarbonPrice < 0)) {
      errors.push('fuelMix.referenceCarbonPrice must be a non-negative number');
    }
    if (params.fuelMix?.heavyIndustryGdpElasticity !== undefined &&
        (!Number.isFinite(params.fuelMix.heavyIndustryGdpElasticity) ||
          params.fuelMix.heavyIndustryGdpElasticity < -0.5 ||
          params.fuelMix.heavyIndustryGdpElasticity > 1.5)) {
      errors.push('fuelMix.heavyIndustryGdpElasticity must be between -0.5 and 1.5');
    }

    // Validate fuel price-path params
    if (params.fuels) {
      for (const fuel of FUEL_KEYS) {
        const f = params.fuels[fuel];
        if (!f) continue;
        if (f.priceEscalation !== undefined) {
          if (f.priceEscalation < -0.05 || f.priceEscalation > 0.05) {
            errors.push(`${fuel}: priceEscalation must be between -5% and +5%/year`);
          }
        }
        if (f.deliveryMargin !== undefined) {
          if (f.deliveryMargin < 0 || f.deliveryMargin > 150) {
            errors.push(`${fuel}: deliveryMargin must be between 0 and 150 $/MWh`);
          }
        }
      }
    }

    for (const shock of params.commodityShocks ?? []) {
      if (!Number.isInteger(shock.year)) {
        errors.push('commodityShocks year must be an integer');
      }
      for (const multiplier of Object.values(shock.globalPriceMultipliers ?? {})) {
        if (multiplier !== undefined && multiplier < 0.1) {
          errors.push('commodityShocks global price multipliers must be at least 0.1');
        }
      }
      for (const regional of Object.values(shock.regionalAvailability ?? {})) {
        for (const availability of Object.values(regional ?? {})) {
          if (availability !== undefined && (availability < 0 || availability > 1)) {
            errors.push('commodityShocks regional availability must be between 0 and 1');
          }
        }
      }
      for (const factor of Object.values(shock.regionalOutputFactors ?? {})) {
        if (factor !== undefined && (factor < 0.5 || factor > 1.5)) {
          errors.push('commodityShocks regional output factors must be between 0.5 and 1.5');
        }
      }
    }
    if (params.usGdpMarketUsd2025 !== undefined
      && (!Number.isFinite(params.usGdpMarketUsd2025) || params.usGdpMarketUsd2025 <= 0)) {
      errors.push('usGdpMarketUsd2025 must be positive');
    }
    const adjustmentYears = new Set<number>();
    for (const adjustment of params.regionalOutputAdjustments ?? []) {
      if (!Number.isInteger(adjustment.year)) {
        errors.push('regionalOutputAdjustments year must be an integer');
      } else if (adjustmentYears.has(adjustment.year)) {
        errors.push(`regionalOutputAdjustments lists ${adjustment.year} twice`);
      }
      adjustmentYears.add(adjustment.year);
      for (const [region, factor] of Object.entries(adjustment.factors ?? {})) {
        if (!REGIONS.includes(region as Region)) {
          errors.push(`regionalOutputAdjustments: unknown region ${region}`);
        } else if (factor === undefined || !Number.isFinite(factor) || factor < 0.1 || factor > 10) {
          errors.push(`regionalOutputAdjustments ${adjustment.year} ${region} must be in [0.1, 10]`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<DemandParams>): DemandParams {
    return validatedMerge('demand', this.validate, (p) => {
      const merged = { ...demandDefaults };

      // Merge regions
      if (p.regions) {
        merged.regions = { ...demandDefaults.regions };
        for (const region of REGIONS) {
          if (p.regions[region]) {
            merged.regions[region] = {
              ...demandDefaults.regions[region],
              ...p.regions[region],
            };
          }
        }
      }

      // Merge sectors
      if (p.sectors) {
        merged.sectors = { ...demandDefaults.sectors };
        for (const sector of ['transport', 'buildings', 'industry'] as const) {
          if (p.sectors[sector]) {
            merged.sectors[sector] = {
              ...demandDefaults.sectors[sector],
              ...p.sectors[sector],
            };
          }
        }
      }

      // Merge fuels
      if (p.fuels) {
        merged.fuels = { ...demandDefaults.fuels };
        for (const fuel of FUEL_KEYS) {
          if (p.fuels[fuel]) {
            merged.fuels[fuel] = {
              ...demandDefaults.fuels[fuel],
              ...p.fuels[fuel],
            };
          }
        }
      }

      // Merge scalar params
      if (p.efficiencyMultiplier !== undefined) merged.efficiencyMultiplier = p.efficiencyMultiplier;
      if (p.structuralEfficiencyShare !== undefined) merged.structuralEfficiencyShare = p.structuralEfficiencyShare;
      if (p.structuralDecayHalfLife !== undefined) merged.structuralDecayHalfLife = p.structuralDecayHalfLife;

      // Merge fuelMix params
      if (p.fuelMix) {
        merged.fuelMix = {
          ...demandDefaults.fuelMix,
          ...p.fuelMix,
        };
      }

      // Merge fossilStock params
      if (p.fossilStock) {
        merged.fossilStock = {
          ...demandDefaults.fossilStock,
          ...p.fossilStock,
        };
      }

      // Merge energyBurden params
      if (p.energyBurden) {
        merged.energyBurden = {
          ...demandDefaults.energyBurden,
          ...p.energyBurden,
        };
      }

      // Robot/automation params
      if (p.robotBaseline2025 !== undefined) merged.robotBaseline2025 = p.robotBaseline2025;
      if (p.robotDiffusionRate !== undefined) merged.robotDiffusionRate = p.robotDiffusionRate;
      if (p.robotIntegrationExponent !== undefined) merged.robotIntegrationExponent = p.robotIntegrationExponent;
      if (p.robotDepreciation !== undefined) merged.robotDepreciation = p.robotDepreciation;
      if (p.robotDisplacementShare !== undefined) merged.robotDisplacementShare = p.robotDisplacementShare;
      if (p.energyPerRobotMWh !== undefined) merged.energyPerRobotMWh = p.energyPerRobotMWh;
      if (p.robotUnitCost !== undefined) merged.robotUnitCost = p.robotUnitCost;
      if (p.robotCostDecline !== undefined) merged.robotCostDecline = p.robotCostDecline;

      // Datacenter/AI compute params
      if (p.dataCenterBaseline2025 !== undefined) merged.dataCenterBaseline2025 = p.dataCenterBaseline2025;
      if (p.dataCenterBaseGrowth !== undefined) merged.dataCenterBaseGrowth = p.dataCenterBaseGrowth;
      if (p.dataCenterSpendCeiling !== undefined) merged.dataCenterSpendCeiling = p.dataCenterSpendCeiling;
      if (p.dataCenterEnergySensitivity !== undefined) merged.dataCenterEnergySensitivity = p.dataCenterEnergySensitivity;
      if (p.dataCenterGDPSensitivity !== undefined) merged.dataCenterGDPSensitivity = p.dataCenterGDPSensitivity;
      if (p.dataCenterReferenceLCOE !== undefined) merged.dataCenterReferenceLCOE = p.dataCenterReferenceLCOE;
      if (p.dataCenterReferenceGDPpc !== undefined) merged.dataCenterReferenceGDPpc = p.dataCenterReferenceGDPpc;
      if (p.dataCenterCapitalCostPerGW !== undefined) merged.dataCenterCapitalCostPerGW = p.dataCenterCapitalCostPerGW;
      if (p.dataCenterDepreciation !== undefined) merged.dataCenterDepreciation = p.dataCenterDepreciation;
      if (p.dataCenterRegionalShare !== undefined) {
        merged.dataCenterRegionalShare = { ...merged.dataCenterRegionalShare, ...p.dataCenterRegionalShare };
      }
      if (p.robotStockShare2024 !== undefined) {
        merged.robotStockShare2024 = { ...merged.robotStockShare2024, ...p.robotStockShare2024 };
      }
      if (p.commodityShocks !== undefined) merged.commodityShocks = p.commodityShocks;
      if (p.regionalOutputAdjustments !== undefined) merged.regionalOutputAdjustments = p.regionalOutputAdjustments;
      if (p.usGdpMarketUsd2025 !== undefined) merged.usGdpMarketUsd2025 = p.usGdpMarketUsd2025;

      return merged;
    }, partial);
  },

  init(params: DemandParams): DemandState {
    const regions = {} as Record<Region, RegionalState>;

    // Calculate initial GDP shares from gdp2025 values
    const totalGdp = REGIONS.reduce((sum, r) => sum + params.regions[r].gdp2025, 0);

    for (const region of REGIONS) {
      const r = params.regions[region];
      regions[region] = {
        gdpShare: r.gdp2025 / totalGdp,
        intensity: r.energyIntensity,
      };
    }

    // Initialize fuel shares from 2025 values
    const fuelShares: Record<FuelType, number> = {
      oil: params.fuels.oil.share2025,
      gas: params.fuels.gas.share2025,
      coal: params.fuels.coal.share2025,
      biomass: params.fuels.biomass.share2025,
      hydrogen: params.fuels.hydrogen.share2025,
      biofuel: params.fuels.biofuel.share2025,
    };

    // Each sector starts from its own 2025 recipe
    const sectorFuelShares = {
      transport: { ...params.sectors.transport.fuelShares2025 },
      buildings: { ...params.sectors.buildings.fuelShares2025 },
      industry: { ...params.sectors.industry.fuelShares2025 },
    };

    // Initialize sector electrification from 2025 values
    const sectorElectrification = {
      transport: params.sectors.transport.electrification2025,
      buildings: params.sectors.buildings.electrification2025,
      industry: params.sectors.industry.electrification2025,
    };

    // Compute initial fossil stocks from 2025 sector energy
    const totalEnergy2025 = REGIONS.reduce(
      (sum, r) => sum + params.regions[r].gdp2025 * params.regions[r].energyIntensity * 1000, 0
    );
    const fossilVehicleFleet = totalEnergy2025 * params.sectors.transport.share
      * (1 - params.sectors.transport.electrification2025);
    const fossilHeatingStock = totalEnergy2025 * params.sectors.buildings.share
      * (1 - params.sectors.buildings.electrification2025);
    const fossilIndustrialStock = totalEnergy2025 * params.sectors.industry.share
      * (1 - params.sectors.industry.electrification2025);

    return {
      regions,
      fuelShares,
      sectorFuelShares,
      sectorElectrification,
      previousEffectiveWorkers: Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>, // Set on first step
      previousRegionalDamageFactor: Object.fromEntries(
        REGIONS.map(r => [r, 1])
      ) as Record<Region, number>,
      previousRegionalEnergyFactor: Object.fromEntries(
        REGIONS.map(r => [r, 1])
      ) as Record<Region, number>,
      previousUsefulEnergyPerWorker: 0, // Set after first year
      usefulWorkGrowthRate: 0,          // No growth in first year
      robotsPer1000: params.robotBaseline2025, // Initial robot adoption
      robotFleet: 0, // captured on first step
      dataCenterLoadTWh: params.dataCenterBaseline2025, // Initial datacenter load
      heavyIndustry: { gdp0: 0, serviceBase0: 0, coalActivityRatio: 1 },
      fossilVehicleFleet,
      fossilHeatingStock,
      fossilIndustrialStock,
    };
  },

  step(
    state: DemandState,
    inputs: DemandInputs,
    params: DemandParams,
    year: number,
    yearIndex: number
  ): { state: DemandState; outputs: DemandOutputs } {
    const t = yearIndex;
    const commodityShock = params.commodityShocks.find(
      (shock) => shock.year === year,
    );
    const outputAdjustment = params.regionalOutputAdjustments.find((a) => a.year === year)?.factors;
    const previousOutputAdjustment =
      params.regionalOutputAdjustments.find((a) => a.year === year - 1)?.factors;

    const carbonPrice = inputs.carbonPrice ?? 35; // Default carbon price
    const electricityPrice = inputs.laggedAvgLCOE ?? 50; // Default $/MWh if not provided

    // =========================================================================
    // Sector electrification (cost-driven with cost escalation above threshold)
    // Compute before regional energy demand so global rate is available
    // =========================================================================
    const sectorKeys = ['transport', 'buildings', 'industry'] as const;
    const newSectorElectrification = { ...state.sectorElectrification };

    // Escalated wholesale fuel prices for this year (real paths; flat at
    // defaults). The fuel-mix logit competes on this scale; retail consumers
    // add delivery margins via retailFuelPrice.
    const baseWholesalePrices = {} as Record<FuelType, number>; // before any shock
    const wholesalePrices = {} as Record<FuelType, number>;
    for (const fuel of FUEL_KEYS) {
      const shockMultiplier =
        fuel === 'oil' || fuel === 'gas'
          ? commodityShock?.globalPriceMultipliers?.[fuel] ?? 1
          : 1;
      baseWholesalePrices[fuel] = compound(
        params.fuels[fuel].price, params.fuels[fuel].priceEscalation, yearIndex
      );
      wholesalePrices[fuel] = baseWholesalePrices[fuel] * shockMultiplier;
    }
    const retailFuelPrice = (fuel: FuelType): number =>
      wholesalePrices[fuel] + params.fuels[fuel].deliveryMargin;

    for (const sectorKey of sectorKeys) {
      const sectorParams = params.sectors[sectorKey];
      const prevSectorRate = state.sectorElectrification[sectorKey];
      const primaryFuel = sectorParams.primaryFuel;

      // Both sides of the comparison converted to retail at this one layer
      newSectorElectrification[sectorKey] = calculateSectorElectrification(
        prevSectorRate,
        electricityPrice + sectorParams.electricityDeliveryCost,
        retailFuelPrice(primaryFuel),
        carbonPrice,
        params.fuels[primaryFuel].carbonIntensity,
        sectorParams,
        yearIndex
      );
    }

    // Fuel mix: one calibrated logit per sector, then the global mix is the
    // non-electric-energy-weighted aggregate (weight = share x (1 - rate), the
    // same nonElec factor sectorFinalFactors uses). Computed before regional
    // quantity accounting so the same mix weights each region's oil/gas
    // physical availability. As transport electrifies, its oil-heavy recipe
    // carries less weight - oil falls by composition, not by logit drift.
    const evolvedSectorShares = {} as DemandState['sectorFuelShares'];
    // What each sector actually burns (industry composition-adjusted); the
    // fossil-stock lock-in below is booked at its own sector's mix.
    const realizedSectorShares = {} as DemandState['sectorFuelShares'];
    const evolvedShares = Object.fromEntries(FUEL_KEYS.map(f => [f, 0])) as Record<FuelType, number>;
    let fuelWeightSum = 0;
    // Industry's coal follows steel and cement output, not industry's whole
    // service base (see fuelMix.heavyIndustryGdpElasticity; lagged one year).
    // Applied ON TOP of the logit, not through its anchor: the shift is
    // compositional (growth lands in chemicals and light industry, no coal
    // kiln is replaced), so the logit's fleet-turnover inertia must not slow
    // it. The state keeps the logit (technology) mix; only the aggregation
    // and everything downstream see the composition-adjusted industry mix.
    const industryCoalActivityRatio = state.heavyIndustry.coalActivityRatio;
    for (const sectorKey of sectorKeys) {
      const sectorShares = calculateLogitFuelShares(
        params.fuels,
        params.sectors[sectorKey].fuelShares2025,
        wholesalePrices,
        state.sectorFuelShares[sectorKey],
        carbonPrice,
        params.fuelMix.referenceCarbonPrice,
        params.fuelMix.priceSensitivity,
        params.fuelMix.inertiaRate,
      );
      evolvedSectorShares[sectorKey] = sectorShares;
      const realizedShares = sectorKey === 'industry'
        ? heavyIndustryMix(sectorShares, industryCoalActivityRatio)
        : sectorShares;
      realizedSectorShares[sectorKey] = realizedShares;
      const weight = params.sectors[sectorKey].share * (1 - newSectorElectrification[sectorKey]);
      for (const fuel of FUEL_KEYS) evolvedShares[fuel] += weight * realizedShares[fuel];
      fuelWeightSum += weight;
    }
    for (const fuel of FUEL_KEYS) {
      evolvedShares[fuel] = fuelWeightSum > 0 ? evolvedShares[fuel] / fuelWeightSum : state.fuelShares[fuel];
    }

    // Derive global electrification rate as energy-weighted average of sector rates
    const electrificationRate =
      newSectorElectrification.transport * params.sectors.transport.share +
      newSectorElectrification.buildings * params.sectors.buildings.share +
      newSectorElectrification.industry * params.sectors.industry.share;

    // Efficiency-corrected final-energy factors (see sectorFinalFactors)
    let elecFinalFactor = 0;     // electricity share of service base, final-energy basis
    let nonElecFinalFactor = 0;  // fuel share of service base
    for (const sectorKey of sectorKeys) {
      const s = params.sectors[sectorKey];
      const f = sectorFinalFactors(s, newSectorElectrification[sectorKey]);
      elecFinalFactor += s.share * f.elec;
      nonElecFinalFactor += s.share * f.nonElec;
    }

    // Global GDP comes from production module
    const globalGdp = inputs.gdp;

    // Evolve regional GDP shares based on differential productivity
    const newRegions = {} as Record<Region, RegionalState>;
    const regionalOutputs = {} as Record<Region, RegionalOutputs>;

    let globalElec = 0;
    let globalWorking = 0;
    let globalTotalFinal = 0;
    let globalNonElec = 0;
    let globalNonElecPotential = 0;
    let globalServiceBase = 0;

    // First pass: evolve regional output indices, then normalize them to the
    // independently produced global GDP total. Each term is an accounting
    // factor:
    //   Y_r,t / Y_r,t-1 = TFP x labor^beta x Δclimate-level x Δenergy-level
    // The old allocator added climate DAMAGE LEVEL and fossil SHARE to the
    // growth rate every year. That made a dirty-but-cheap grid an annual
    // productivity loss and compounded persistent damages forever.
    const rawShares: Record<Region, number> = {} as Record<Region, number>;
    const currentDamageFactors = {} as Record<Region, number>;
    const currentEnergyFactors = {} as Record<Region, number>;
    const regionalAllocation = {} as Record<Region, RegionalAllocationDiagnostics>;
    const laborElasticity = clamp(inputs.laborOutputElasticity ?? 0.15, 0, 1);
    let totalShares = 0;

    for (const region of REGIONS) {
      const regionParams = params.regions[region];
      const damage = clamp(inputs.regionalDamages?.[region] ?? 0, 0, 0.95);
      const damageFactor = 1 - damage;
      const burden = Math.max(0, inputs.regionalEnergyBurden?.[region] ?? 0);
      const reliabilityFactor = clamp(
        inputs.regionalReliabilityFactor?.[region] ?? 1,
        0.25,
        1
      );
      const regionalOutputFactor = clamp(
        commodityShock?.regionalOutputFactors?.[region] ?? 1,
        0.5,
        1.5,
      );
      const energyFactor =
        (1 - energyBurdenDamage(burden, params.energyBurden)) *
        reliabilityFactor *
        regionalOutputFactor;

      currentDamageFactors[region] = damageFactor;
      currentEnergyFactors[region] = energyFactor;

      let tfpFactor = 1;
      let laborFactor = 1;
      let climateFactorChange = 1;
      let energyFactorChange = 1;
      let outputAdjustmentChange = 1;

      // The observed 2025 regional GDP table is an anchor, not a forecast
      // transition. Capture its prevailing wedges without moving its shares.
      if (yearIndex > 0) {
        const tfpFloor = regionParams.tfpFloor ?? 0;
        const tfp = tfpFloor
          + (regionParams.tfpGrowth - tfpFloor) * Math.pow(1 - regionParams.tfpDecay, t);
        tfpFactor = Math.max(0.01, 1 + tfp);

        const effective = inputs.regionalEffectiveWorkers[region];
        const prevEffective = state.previousEffectiveWorkers[region];
        laborFactor = effective > 0 && prevEffective > 0
          ? Math.pow(effective / prevEffective, laborElasticity)
          : 1;

        const previousDamageFactor = Math.max(
          0.01,
          state.previousRegionalDamageFactor[region] ?? damageFactor
        );
        const previousEnergyFactor = Math.max(
          0.01,
          state.previousRegionalEnergyFactor[region] ?? energyFactor
        );
        climateFactorChange = damageFactor / previousDamageFactor;
        energyFactorChange = energyFactor / previousEnergyFactor;
        outputAdjustmentChange =
          (outputAdjustment?.[region] ?? 1) / (previousOutputAdjustment?.[region] ?? 1);
      }

      const growthFactor =
        tfpFactor * laborFactor * climateFactorChange * energyFactorChange * outputAdjustmentChange;
      rawShares[region] = Math.max(
        Number.EPSILON,
        state.regions[region].gdpShare * growthFactor
      );
      totalShares += rawShares[region];

      regionalAllocation[region] = {
        tfpFactor,
        laborFactor,
        climateFactorChange,
        energyFactorChange,
        outputAdjustmentChange,
        energyBurden: burden,
        reliabilityFactor,
        gdpShare: 0,
      };
    }

    // Second pass: compute energy demand from regional GDP
    for (const region of REGIONS) {
      const regionParams = params.regions[region];
      const currentState = state.regions[region];
      const working = inputs.regionalWorking[region];

      const normalizedShare = rawShares[region] / totalShares;
      regionalAllocation[region].gdpShare = normalizedShare;
      const newGdp = globalGdp * normalizedShare;

      // Compute growth rate for diagnostics
      const prevGdp = currentState.gdpShare * (yearIndex > 0 ? globalGdp / (1 + 0.02) : globalGdp);
      const growthRate = prevGdp > 0 ? (newGdp - prevGdp) / prevGdp : 0;

      // Update energy intensity. The structural component of the decline
      // decays post-2025 (same series as production's eta growth — see
      // structuralDecayFactor), so a high efficiencyMultiplier can't strip
      // energy faster than production's eta compensates.
      let newIntensity = currentState.intensity;
      if (yearIndex > 0) {
        const decayFactor = structuralDecayFactor(
          year, params.structuralEfficiencyShare, params.structuralDecayHalfLife
        );
        newIntensity = currentState.intensity *
          (1 - regionParams.intensityDecline * params.efficiencyMultiplier * decayFactor);
      }

      // Calculate energy demand. totalEnergy is the service base (final
      // energy at the 2025 mix); the efficiency-corrected factors convert it
      // to actual final energy, which shrinks as electrification proceeds.
      const totalEnergy = newGdp * newIntensity * 1000; // TWh, service base
      // Regional electrification differs from the global share (grid access,
      // industrial structure); unelectrified service is met by fuels instead.
      // Multiplier converges to 1 by 2100 (access catch-up).
      const elecMult = lerp(
        params.regions[region].elecShareMultiplier2025, 1,
        yearIndex / ELEC_ACCESS_CONVERGENCE_YEARS
      );
      const elecDemand = totalEnergy * elecFinalFactor * elecMult;
      const nonElecEnergyPotential =
        totalEnergy * (nonElecFinalFactor + elecFinalFactor * (1 - elecMult));
      let regionalFuelAvailability = 0;
      for (const fuel of FUEL_KEYS) {
        const availability =
          fuel === 'oil' || fuel === 'gas'
            ? commodityShock?.regionalAvailability?.[region]?.[fuel] ?? 1
            : 1;
        regionalFuelAvailability += evolvedShares[fuel] * clamp(availability, 0, 1);
      }
      const nonElecEnergy = nonElecEnergyPotential * regionalFuelAvailability;
      const finalEnergy = elecDemand + nonElecEnergy;

      // Per working-age adult metrics
      const gdpPerWorking = (newGdp * 1e12) / working;
      const elecPerWorking = (elecDemand * 1e9) / working;

      // Store new state
      newRegions[region] = {
        gdpShare: normalizedShare,
        intensity: newIntensity,
      };

      // Store outputs
      regionalOutputs[region] = {
        gdp: newGdp,
        growthRate,
        energyIntensity: newIntensity,
        totalFinalEnergy: finalEnergy,
        electricityDemand: elecDemand,
        nonElectricEnergy: nonElecEnergy,
        nonElectricEnergyPotential: nonElecEnergyPotential,
        gdpPerWorking,
        electricityPerWorking: elecPerWorking,
      };

      // Accumulate globals
      globalElec += elecDemand;
      globalWorking += working;
      globalTotalFinal += finalEnergy;
      globalNonElec += nonElecEnergy;
      globalNonElecPotential += nonElecEnergyPotential;
      globalServiceBase += totalEnergy;
    }

    // Sector breakdown base is the SERVICE base (2025-mix final energy), so
    // per-sector electrified/fuel splits use the same efficiency-corrected
    // conversion as the regional totals. Robot/datacenter loads added below
    // are 100% electric add-ons and must not be split by sector rates
    // (doing so reclassified most of them as phantom non-electric energy).
    const sectorEnergyBase = globalServiceBase;
    // Regional electrification multipliers make realized global electricity
    // differ from the uniform-share prediction; scale the sector split by the
    // realized ratio so sector totals reconcile with the regional sums.
    // Snapshot NOW: globalElec still holds only the regional service-base
    // electricity — robot/DC add-on loads are added below and must be
    // excluded from the realization ratio.
    const serviceBasisElec = globalElec;
    const uniformElec = globalServiceBase * elecFinalFactor;
    const elecRealization = uniformElec > 0 ? serviceBasisElec / uniformElec : 1;

    // Endogenous robot adoption: deploy while marginal value > marginal cost.
    // Replaces the old logistic saturation ceiling — the brake is now economic:
    // integration costs rise with density, capital competition raises the
    // interest rate (the ai-energy-boom channel, now direct), and energy price
    // enters operating cost. See sources/ai-robotics-deployment-ceilings.md.
    const prevRobots = state.robotsPer1000;
    const currentLCOE = inputs.laggedAvgLCOE ?? 50; // $/MWh; matches the laggedAvgLCOE lag initial
    const gdpPerWorker = (inputs.gdp * 1e12) / inputs.working;
    // Economy-wide rate (capital.interestRate, lagged). Bare r by choice:
    // energy's riskPremium is sector-specific project financing; robots are
    // ordinary corporate capex at the economy-wide cost of capital.
    const robotRate = Math.max(0, inputs.laggedInterestRate ?? 0.05);
    const robotQ = inputs.robotLaborEquivalent ?? 2; // worker-equivalents/robot, injected from production params

    // VALUE of one robot-year: firm-level displacement business case — a robot
    // replacing q workers saves q full salaries (wage ≈ labour share × GDP per
    // worker), NOT q aggregate marginal products. Prices from national accounts,
    // quantities from the fitted production function — the same split capital.ts
    // uses (r priced off alpha=0.33 while production fits 0.25).
    // The wage a robot displaces is the human wage, which falls relative to
    // GDP per worker as machines take labor's income (capital.laborShare).
    // Scaling by the lagged labor share relative to 2025 keeps the 2025
    // business case (pinned by the pi(2025) test) and closes the loop:
    // automation cheapens the labor it competes with and so slows itself
    // (Acemoglu & Restrepo 2018: displacement lowers the wage).
    const referenceLaborShare = yearIndex === 0 || state.referenceLaborShare === undefined
      ? inputs.laggedLaborShare
      : state.referenceLaborShare;
    const displacedWageFactor =
      inputs.laggedLaborShare !== undefined && referenceLaborShare !== undefined && referenceLaborShare > 0
        ? inputs.laggedLaborShare / referenceLaborShare
        : 1;
    const robotMV = robotQ * params.robotDisplacementShare * gdpPerWorker * displacedWageFactor; // $/robot-yr

    // COST of one robot-year: annualized capital service + electricity, scaled
    // by an integration-cost factor rising with density (installation, workflow
    // redesign, scarce integrator labor — the same logic as the ~3x integration
    // multiplier inside robotUnitCost). Production's constant q stays untouched;
    // the density brake lives here on the COST side, honestly labeled.
    const robotUnitCostNow = compound(params.robotUnitCost, -params.robotCostDecline, yearIndex);
    const ROBOT_INTEGRATION_ANCHOR = 1; // per-1000 workers; fixed anchor (deliberately NOT robotBaseline2025 — recalibrating the 2025 fleet must not rescale long-run economics)
    const integrationFactor = Math.pow(
      Math.max(prevRobots, ROBOT_INTEGRATION_ANCHOR) / ROBOT_INTEGRATION_ANCHOR,
      params.robotIntegrationExponent
    );
    const robotMC =
      (robotUnitCostNow * (robotRate + params.robotDepreciation) +
        params.energyPerRobotMWh * currentLCOE) *
      integrationFactor; // $/robot-yr

    const robotProfitability = robotMC > 0 ? robotMV / robotMC : 0;
    // Diffusion-limited adoption while profitable; unprofitable fleets are not
    // replaced and decay at the depreciation rate. Equilibrium is balanced
    // growth (density settles where integration-cost growth offsets wage growth
    // + unit-cost decline), not a hard ceiling.
    const robotsPer1000 =
      robotProfitability > 1
        ? prevRobots * (1 + params.robotDiffusionRate * (1 - 1 / robotProfitability))
        : prevRobots * (1 - params.robotDepreciation);

    const totalRobots = (robotsPer1000 / 1000) * inputs.working;
    // Fleet capex: net additions + replacement of the depreciating fleet (the
    // rule prices depreciation in MC, so the ledger debits it too), at the
    // declining unit cost; debited by capital (lagged). No replacement spend
    // when the fleet is unprofitable (firms stop replacing; fleet decays).
    // Year 0 adds nothing (its fleet IS the observed 2025 fleet) but replaces
    // that fleet's wear, as datacenter capex does: without it capital's robot
    // stock depreciated two years with nothing replacing it, then jumped.
    const robotAdditions = yearIndex === 0 ? 0 : Math.max(0, totalRobots - state.robotFleet);
    const replacedFleet = yearIndex === 0 ? totalRobots : state.robotFleet;
    const robotReplacement =
      robotProfitability <= 1 ? 0 : params.robotDepreciation * replacedFleet;
    const robotCapexSpend = ((robotAdditions + robotReplacement) * robotUnitCostNow) / 1e12; // $T
    // The fleet at this year's installed cost. In year 0 this is the observed
    // 2025 fleet: capital carves it out of the observed capital stock, and
    // afterwards keeps the robot capital stock as a perpetual inventory of
    // the capex.
    const robotCapitalValue = (totalRobots * robotUnitCostNow) / 1e12; // $T
    const robotLoadTWh = (totalRobots * params.energyPerRobotMWh) / 1e6;
    globalElec += robotLoadTWh;
    globalTotalFinal += robotLoadTWh;

    // Site robot electricity load where robots are: each region's working-age
    // population weighted by its robot density relative to the world, set in
    // year 0 from the observed stock shares, so siting follows the workforce
    // while keeping the observed density gaps.
    const robotDensityIndex = yearIndex === 0 || !state.robotDensityIndex
      ? robotDensityFromStock(params.robotStockShare2024, inputs.regionalWorking)
      : state.robotDensityIndex;
    const robotShares = robotSitingShares(robotDensityIndex, inputs.regionalWorking);
    for (const region of REGIONS) {
      const regionRobotLoad = robotLoadTWh * robotShares[region];
      regionalOutputs[region].electricityDemand += regionRobotLoad;
      regionalOutputs[region].totalFinalEnergy += regionRobotLoad;
    }

    // Endogenous datacenter/AI compute adoption: LCOE/GDP-per-capita demand
    // drivers with a willingness-to-pay brake on the TOTAL-COST share of GDP
    // (power + capital service; replaces the hard TWh saturation cap — the
    // ceiling is economic). Quadratic brake: little drag at today's share
    // (~0.3x ceiling), hard stop as the share approaches the ceiling.
    // Equilibrium load = ceiling x GDP / cost per MWh — a GDP-indexed soft
    // cap. An LCOE or interest-rate spike collapses the brake (buildout
    // halts, the stock persists): correct for long-lived assets.
    const prevDataCenter = state.dataCenterLoadTWh;
    const gdpPerCapita = (inputs.gdp * 1e12) / inputs.population;

    const dcEnergyFactor = Math.pow(
      params.dataCenterReferenceLCOE / Math.max(currentLCOE, 1),
      params.dataCenterEnergySensitivity
    );
    const dcGDPFactor = Math.pow(
      gdpPerCapita / params.dataCenterReferenceGDPpc,
      params.dataCenterGDPSensitivity
    );

    // DC electricity bill as share of GDP: TWh -> MWh (x1e6) at $/MWh, over $ GDP
    const TWH_PER_AVERAGE_GW_YEAR = 8.76;
    const dataCenterPowerSpendShare =
      (prevDataCenter * 1e6 * currentLCOE) / (inputs.gdp * 1e12);
    // Capital service per MWh of load: the composite capital behind one
    // MWh-year of load ($B/GW over 8.76 TWh per average GW-year), annualised
    // at the cost of capital plus depreciation (the robot rule's convention).
    const dcCapitalPerMWhYear =
      (params.dataCenterCapitalCostPerGW * 1e9) / (TWH_PER_AVERAGE_GW_YEAR * 1e6); // $ per MWh/yr
    const dcCapitalServicePerMWh =
      dcCapitalPerMWhYear
      * (Math.max(0, inputs.laggedInterestRate ?? 0.05) + params.dataCenterDepreciation);
    const dataCenterSpendShare =
      (prevDataCenter * 1e6 * (currentLCOE + dcCapitalServicePerMWh)) / (inputs.gdp * 1e12);
    const dcBrake = Math.max(
      0,
      1 - Math.pow(dataCenterSpendShare / params.dataCenterSpendCeiling, 2)
    );
    const dcEffectiveRate =
      params.dataCenterBaseGrowth * dcEnergyFactor * dcGDPFactor * dcBrake;
    const dataCenterLoadTWh = prevDataCenter * (1 + dcEffectiveRate);

    // Composite datacenter capex: annual electricity load is the capacity
    // proxy, where 1 average GW produces 8.76 TWh/year. Charge both net new
    // capacity and replacement of the prior chips-plus-facility fleet. This
    // does not repurchase the calibrated opening fleet: in 2025 it charges
    // only that year's replacement plus the net load added during the step.
    // Capital debits this flow with the same lag convention as robot capex.
    const dataCenterAdditionsTWh = Math.max(0, dataCenterLoadTWh - prevDataCenter);
    const dataCenterReplacementTWh = params.dataCenterDepreciation * prevDataCenter;
    const dataCenterCapexSpend =
      ((dataCenterAdditionsTWh + dataCenterReplacementTWh) /
        TWH_PER_AVERAGE_GW_YEAR) *
      (params.dataCenterCapitalCostPerGW / 1000); // $B -> $T
    // The fleet this year's capex adds to and replaces (the opening load), at
    // the same composite cost. Capital carves it out of the observed 2025
    // capital stock, as with robotCapitalValue.
    const dataCenterCapitalValue =
      (prevDataCenter / TWH_PER_AVERAGE_GW_YEAR) *
      (params.dataCenterCapitalCostPerGW / 1000); // $T

    globalElec += dataCenterLoadTWh;
    globalTotalFinal += dataCenterLoadTWh;

    // Site datacenter load where compute is built (observed IEA 2024 split),
    // not by GDP share: compute is concentrated far beyond output.
    for (const region of REGIONS) {
      const regionDcLoad = dataCenterLoadTWh * params.dataCenterRegionalShare[region];
      regionalOutputs[region].electricityDemand += regionDcLoad;
      regionalOutputs[region].totalFinalEnergy += regionDcLoad;
    }

    // CDR electricity is REAL demand: generation must be built for it and it
    // must pay the going LCOE (which feeds back into cdrCostPerTon and the
    // SCC-vs-cost deployment gate, making CDR self-limiting through price).
    // Previously CDR energy was only subtracted from productive useful energy
    // in production — a phantom load the energy system neither served nor
    // priced. At cheap LCOE that let CDR silently consume >1/3 of generation
    // and starve the economy (the mult=1.3 GDP collapse). Same treatment as
    // robot/DC loads: add to demand here, production still nets it out of E
    // as intermediate consumption. Lagged one year (CDR runs after demand).
    const cdrLoadTWh = Math.max(0, inputs.cdrEnergy ?? 0);
    globalElec += cdrLoadTWh;
    globalTotalFinal += cdrLoadTWh;
    // Distribute like datacenters: CDR plants concentrate with investment/GDP
    for (const region of REGIONS) {
      const gdpShare = newRegions[region].gdpShare;
      const regionCdrLoad = cdrLoadTWh * gdpShare;
      regionalOutputs[region].electricityDemand += regionCdrLoad;
      regionalOutputs[region].totalFinalEnergy += regionCdrLoad;
    }

    // Calculate final energy per capita per day
    // TWh × 1e9 kWh/TWh / population / 365 days
    let finalEnergyPerCapitaDay = (globalTotalFinal * 1e9 / inputs.population) / 365;

    // =========================================================================
    // Sector-level breakdown (rates already computed above)
    // =========================================================================
    const sectors = {} as Record<typeof sectorKeys[number], SectorOutput>;

    for (const sectorKey of sectorKeys) {
      const sectorParams = params.sectors[sectorKey];
      const sectorElecRate = newSectorElectrification[sectorKey];

      // Sector service base (excludes robot/DC loads — pure electric add-ons).
      // Same efficiency-corrected convention as the regional factors, via the
      // shared helper, so sector final energy shrinks with electrification.
      const sectorService = sectorEnergyBase * sectorParams.share;
      const f = sectorFinalFactors(sectorParams, sectorElecRate);
      const sectorElectric = sectorService * f.elec * elecRealization;
      const sectorNonElectric = sectorService * (f.nonElec + f.elec * (1 - elecRealization));

      sectors[sectorKey] = {
        total: sectorElectric + sectorNonElectric,
        electric: sectorElectric,
        nonElectric: sectorNonElectric,
        electrificationRate: sectorElecRate,
      };
    }

    // =========================================================================
    // Fossil stock evolution (infrastructure lock-in)
    // =========================================================================
    // Installed fossil equipment retires naturally (1/lifetime per year).
    // New equipment reflects current electrification rates.
    // Stock provides floor on non-electric energy demand.
    const sectorStockMapping = [
      { sector: 'transport' as const, lifetime: params.fossilStock.vehicleLifetime,
        prev: state.fossilVehicleFleet },
      { sector: 'buildings' as const, lifetime: params.fossilStock.heatingLifetime,
        prev: state.fossilHeatingStock },
      { sector: 'industry' as const, lifetime: params.fossilStock.industrialLifetime,
        prev: state.fossilIndustrialStock },
    ];

    let newFossilVehicleFleet = state.fossilVehicleFleet;
    let newFossilHeatingStock = state.fossilHeatingStock;
    let newFossilIndustrialStock = state.fossilIndustrialStock;
    let lockInAdjustment = 0;
    const lockInBySector = { transport: 0, buildings: 0, industry: 0 };

    for (const { sector, lifetime, prev } of sectorStockMapping) {
      const retired = prev / lifetime;
      const sectorTotal = sectors[sector].total;
      const sectorElecRate = sectors[sector].electrificationRate;

      // New equipment enters at current tech split
      const replacement = sectorTotal / lifetime;
      const newFossil = replacement * (1 - sectorElecRate);
      const newStock = Math.max(0, prev - retired + newFossil);

      // Store updated stock
      if (sector === 'transport') newFossilVehicleFleet = newStock;
      else if (sector === 'buildings') newFossilHeatingStock = newStock;
      else newFossilIndustrialStock = newStock;

      // Apply floor: fossil stock creates minimum non-electric demand
      if (newStock > sectors[sector].nonElectric) {
        const extra = newStock - sectors[sector].nonElectric;
        sectors[sector].nonElectric = newStock;
        sectors[sector].total += extra;
        lockInAdjustment += extra;
        lockInBySector[sector] = extra;
      }
    }

    // Adjust global totals for the lock-in floor. Regional energy QUANTITIES
    // (regional[r].nonElectricEnergy) exclude this global stock-floor
    // reconciliation; regional fuel COST includes each region's share of it
    // (see the pricing loop below), so the regional costs sum to fuelCost.
    const preLockPotential = globalNonElecPotential;
    const globalFuelAvailabilityBeforeLock = preLockPotential > 0
      ? globalNonElec / preLockPotential
      : 1;
    const servedLockIn = lockInAdjustment * globalFuelAvailabilityBeforeLock;

    // Fuel accounting mix: the pre-lock potential at the aggregate mix plus
    // each sector's lock-in extra at THAT sector's mix. The extra is mostly
    // ICE fleets outliving transport electrification; booking it at the
    // aggregate non-electric mix (~13% coal) had locked-in cars burning coal.
    const accountingShares = { ...evolvedShares };
    if (lockInAdjustment > 0) {
      const denom = preLockPotential + lockInAdjustment;
      for (const fuel of FUEL_KEYS) {
        let lockedFuel = 0;
        for (const sectorKey of sectorKeys) {
          lockedFuel += lockInBySector[sectorKey] * realizedSectorShares[sectorKey][fuel];
        }
        accountingShares[fuel] = (preLockPotential * evolvedShares[fuel] + lockedFuel) / denom;
      }
    }
    globalNonElecPotential += lockInAdjustment;
    globalNonElec += servedLockIn;
    globalTotalFinal += servedLockIn;

    const fossilStockTWh = newFossilVehicleFleet + newFossilHeatingStock + newFossilIndustrialStock;

    // Useful energy proxy at service level. Electrified increments deliver
    // the same service from less final energy, so efficiency gains show up
    // as final energy falling — not as useful energy rising. Service base +
    // lock-in extra fuel + the pure-electric add-on loads. Electricity's
    // quality (exergy) advantage enters GDP via the production module's
    // exergy weighting, not here — the old formula multiplied electrified
    // energy by the efficiency multiplier on top of fuel-scale electricity
    // demand, double-crediting electrification.
    const usefulEnergy = Math.max(
      0,
      sectorEnergyBase + lockInAdjustment -
        (globalNonElecPotential - globalNonElec) +
        robotLoadTWh + dataCenterLoadTWh,
    );

    // Ayres/Warr: compute useful energy per worker growth rate for next year's GDP
    const totalEffectiveWorkers = REGIONS.reduce(
      (sum, r) => sum + inputs.regionalEffectiveWorkers[r], 0
    );
    const usefulEnergyPerWorker = totalEffectiveWorkers > 0
      ? usefulEnergy / totalEffectiveWorkers
      : 0;
    const newUsefulWorkGrowthRate = state.previousUsefulEnergyPerWorker > 0
      ? (usefulEnergyPerWorker - state.previousUsefulEnergyPerWorker) / state.previousUsefulEnergyPerWorker
      : 0;

    // =========================================================================
    // Fuel mix for non-electric energy (price-driven with inertia)
    // =========================================================================
    // Fuel shares evolve based on effective prices (wholesale + carbon cost)
    // Uses logit model blended with previous shares for fleet inertia
    // `evolvedShares` was computed before regional quantity accounting so its
    // weights also determine physical oil/gas availability by region.

    // Calculate fuel consumption (TWh) and emissions (Gt CO2/year)
    const fuels: FuelOutput = {
      oil: 0,
      gas: 0,
      coal: 0,
      biomass: 0,
      hydrogen: 0,
      biofuel: 0,
    };

    let nonElectricEmissions = 0; // Gt CO2/year

    // Calculate fuel costs (with carbon pricing if provided)
    // (carbonPrice already declared above for electrification calculation)
    let fuelCost = 0; // $ trillions
    const regionalFuelCost = {} as Record<Region, number>;
    const regionalFuelAvailability = {} as Record<Region, number>;

    // One pricing path for every year, shocked or not: each region pays for
    // its pre-lock fuel plus its potential share of the fossil-stock lock-in
    // fuel, so the regional costs partition fuelCost.
    const carbonCostPerMWh = Object.fromEntries(FUEL_KEYS.map((fuel) => [
      fuel, (params.fuels[fuel].carbonIntensity * carbonPrice) / 1000,
    ])) as Record<FuelType, number>;
    let reconciledNonElectricEnergy = 0;
    for (const region of REGIONS) {
      const preLockRegionalPotential =
        regionalOutputs[region].nonElectricEnergyPotential;
      const potentialShare = preLockPotential > 0
        ? preLockRegionalPotential / preLockPotential
        : newRegions[region].gdpShare;
      const regionalPotential =
        preLockRegionalPotential + lockInAdjustment * potentialShare;
      let regionalServed = 0;
      let regionCost = 0;
      for (const fuel of FUEL_KEYS) {
        const potentialFuelConsumption = regionalPotential * accountingShares[fuel];
        const availability =
          fuel === 'oil' || fuel === 'gas'
            ? clamp(
              commodityShock?.regionalAvailability?.[region]?.[fuel] ?? 1,
              0,
              1,
            )
            : 1;
        const fuelConsumption = potentialFuelConsumption * availability;
        fuels[fuel] += fuelConsumption;
        regionalServed += fuelConsumption;
        nonElectricEmissions +=
          (fuelConsumption * params.fuels[fuel].carbonIntensity) / 1e6;

        // Regional price multipliers are absolute relative to the unshocked
        // annual wholesale path. If absent, use the global shock multiplier.
        const regionalPriceMultiplier =
          fuel === 'oil' || fuel === 'gas'
            ? commodityShock?.regionalPriceMultipliers?.[region]?.[fuel]
            : undefined;
        const retailPrice = regionalPriceMultiplier !== undefined
          ? baseWholesalePrices[fuel] * regionalPriceMultiplier + params.fuels[fuel].deliveryMargin
          : retailFuelPrice(fuel);
        const effectivePrice = retailPrice + carbonCostPerMWh[fuel];
        regionCost += (fuelConsumption * effectivePrice) / 1e6;
      }
      regionalFuelCost[region] = regionCost;
      regionalFuelAvailability[region] = regionalPotential > 0
        ? regionalServed / regionalPotential
        : 1;
      reconciledNonElectricEnergy += regionalServed;
      fuelCost += regionCost;
    }
    globalTotalFinal += reconciledNonElectricEnergy - globalNonElec;
    globalNonElec = reconciledNonElectricEnergy;
    // The sectors are split from the requested fuel, lock-in included, so
    // ration them by the world total's served/requested ratio. It is only
    // known here: availability applies per fuel, at the accounting mix, so
    // the served total differs from any estimate made before this loop.
    // Electricity is not rationed.
    const sectorNonElectric = sectorKeys.reduce((sum, key) => sum + sectors[key].nonElectric, 0);
    const servedRatio = sectorNonElectric > 0 ? globalNonElec / sectorNonElectric : 1;
    for (const key of sectorKeys) {
      sectors[key].nonElectric *= servedRatio;
      sectors[key].total = sectors[key].electric + sectors[key].nonElectric;
    }
    finalEnergyPerCapitaDay = (globalTotalFinal * 1e9 / inputs.population) / 365;

    // =========================================================================
    // Energy Burden Calculation
    // =========================================================================
    // Electricity cost: generation × weighted LCOE
    // TWh × $/MWh × 1e6 MWh/TWh / 1e12 = $ trillions
    // Priced on last year's *served* generation (delay-1 lag; dispatch runs
    // after demand). Deliberate: cost reflects billed energy — unserved
    // demand carries no cost here; scarcity itself is dispatch's shortfall.
    // Falls back to demand when unwired (standalone module use).
    const electricityGeneration = inputs.totalGeneration ?? globalElec;
    const avgLCOE = inputs.laggedAvgLCOE ?? 50; // Lagged weighted-average LCOE
    // Retail electricity = wholesale LCOE + delivery adder, weighted by where
    // the electricity goes (sector share × electrification rate). Keeps the
    // burden on the same retail scale as its 8%-of-GDP threshold.
    let deliveryWeight = 0;
    let deliveryCostSum = 0;
    for (const sectorKey of sectorKeys) {
      const w = params.sectors[sectorKey].share * newSectorElectrification[sectorKey];
      deliveryWeight += w;
      deliveryCostSum += w * params.sectors[sectorKey].electricityDeliveryCost;
    }
    const weightedDeliveryCost = deliveryWeight > 0 ? deliveryCostSum / deliveryWeight : 0;
    const electricityTotalCost =
      (electricityGeneration * (avgLCOE + weightedDeliveryCost)) / 1e6;

    const totalEnergyCost = electricityTotalCost + fuelCost;
    const energyBurden = totalEnergyCost / globalGdp;

    // Same bounded level-damage function used by the regional allocator.
    const burdenDamage = energyBurdenDamage(energyBurden, params.energyBurden);

    // GDP at market exchange rates, 2025 US dollars: regional PPP GDP x the
    // region's 2025 market/PPP price ratio (US = 1) x the US dollars per model
    // PPP dollar. Constant 2025 prices and exchange rates: converging
    // economies' price levels do not rise here, so their market-rate share is
    // understated more over time.
    const usdPerModelDollar = params.usGdpMarketUsd2025 / params.regions.us.gdp2025;
    const regionalGdpMarket = Object.fromEntries(REGIONS.map((r) => [
      r, regionalOutputs[r].gdp * params.regions[r].marketPriceRatio2025 * usdPerModelDollar,
    ])) as Record<Region, number>;
    const gdpMarket = sumValues(regionalGdpMarket);

    // Next year's industry coal anchor: heavy-materials output index
    // (GDP^eps) over industry's service-base index (industry is a fixed
    // share of the global service base, so the global index is its index).
    const heavyIndustry = state.heavyIndustry.gdp0 > 0 && state.heavyIndustry.serviceBase0 > 0
      ? { ...state.heavyIndustry }
      : { gdp0: globalGdp, serviceBase0: globalServiceBase, coalActivityRatio: 1 };
    if (globalGdp > 0 && globalServiceBase > 0) {
      heavyIndustry.coalActivityRatio =
        Math.pow(globalGdp / heavyIndustry.gdp0, params.fuelMix.heavyIndustryGdpElasticity) /
        (globalServiceBase / heavyIndustry.serviceBase0);
    }

    return {
      state: {
        regions: newRegions,
        fuelShares: evolvedShares, // Persist evolved fuel shares (aggregate)
        sectorFuelShares: evolvedSectorShares,
        sectorElectrification: newSectorElectrification, // Persist sector rates
        previousEffectiveWorkers: inputs.regionalEffectiveWorkers, // For next year's labor growth
        previousRegionalDamageFactor: currentDamageFactors,
        previousRegionalEnergyFactor: currentEnergyFactors,
        previousUsefulEnergyPerWorker: usefulEnergyPerWorker, // For Ayres/Warr
        usefulWorkGrowthRate: newUsefulWorkGrowthRate,
        robotsPer1000, // Persist for logistic adoption
        robotFleet: totalRobots,
        referenceLaborShare,
        dataCenterLoadTWh, // Persist for datacenter logistic adoption
        fossilVehicleFleet: newFossilVehicleFleet,
        fossilHeatingStock: newFossilHeatingStock,
        fossilIndustrialStock: newFossilIndustrialStock,
        heavyIndustry,
        robotDensityIndex,
      },
      outputs: {
        regional: regionalOutputs,
        regionalAllocation,
        electricityDemand: globalElec,
        electrificationRate,
        totalFinalEnergy: globalTotalFinal,
        nonElectricEnergy: globalNonElec,
        nonElectricEnergyPotential: globalNonElecPotential,
        gdpPerWorking: (globalGdp * 1e12) / globalWorking,
        finalEnergyPerCapitaDay,
        sectors,
        fuels,
        nonElectricEmissions,
        electricityCost: electricityTotalCost,
        fuelCost,
        totalEnergyCost,
        energyBurden,
        burdenDamage,
        regionalFuelCost,
        regionalFuelAvailability,
        usefulWorkGrowthRate: newUsefulWorkGrowthRate,
        robotLoadTWh,
        robotCapexSpend,
        robotCapitalValue,
        robotsPer1000,
        robotProfitability,
        fossilStockTWh,
        dataCenterLoadTWh,
        dataCenterCapexSpend,
        dataCenterCapitalValue,
        dataCenterPowerSpendShare,
        gdpMarket,
        regionalGdpMarket,
        dataCenterSpendShare,
      },
    };
  },
});
