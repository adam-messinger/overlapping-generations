/**
 * Energy Module
 *
 * Handles LCOE calculation and capacity state management.
 * Implements Wright's Law learning curves and EROEI depletion.
 *
 * REGIONALIZATION (v2):
 * - Learning curves are GLOBAL (Wright's Law operates on cumulative deployment)
 * - Capacity stock is REGIONAL (each region has its own grid)
 * - Carbon price is REGIONAL (policy divergence)
 * - Investment is REGIONAL (from capital module's regionalSavings)
 *
 * This enables scenarios like "OECD stays on fossil while China goes solar"
 * while still modeling global learning (China building solar drives down
 * costs for everyone).
 *
 * State machine architecture:
 *   actualCapacity[t] = actualCapacity[t-1] + additions[t] - retirements[t]
 *
 * Outputs (to other modules):
 * - lcoes: Current LCOE by source ($/MWh) - GLOBAL (learning-driven)
 * - capacities: Installed capacity by source (GW) - SUM of regional
 * - regionalCapacities: Regional breakdown
 * - cumulativeCapacity: Total deployed (for learning curves)
 */

import {
  advanceVintageStock,
  createVintageStock,
  defineModule,
  type Module,
  type ValidationResult,
  type VintageStockState,
  validatedMerge,
  unitPort,
} from 'tsimulation';
import {
  ENERGY_ADDITION_PORT,
  ENERGY_CAPACITY_PORT,
  ENERGY_LCOE_PORT,
  REGIONAL_ENERGY_ADDITION_PORT,
  REGIONAL_ENERGY_CAPACITY_PORT,
  REGIONAL_ENERGY_LCOE_PORT,
} from '../port-schemas.js';
import { EnergySource, ENERGY_SOURCES, Region, REGIONS } from '../domain-types.js';
import { learningCurve, depletion } from '../primitives/math.js';
import { distributeByGDP } from '../primitives/distribute.js';
import { dispatchDefaults } from './dispatch.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface EnergySourceParams {
  name: string;
  cost0: number;           // $/MWh baseline (2025); battery is $/kWh
  alpha: number;           // Wright's Law exponent (0 = no learning)
  // $/MWh (solar/wind) or $/kWh (battery) irreducible non-learning cost: the
  // balance-of-system / soft-cost component Wright's Law is NOT applied to.
  // CONTESTED: Farmer et al. (2022) find "no good empirical evidence supporting
  // floor costs" and impose none (past IAM floors were "repeatedly violated");
  // the OIES camp says a floor is real but lives in slow-learning BOS/soft costs
  // (module is now only ~13% of installed solar cost) at an undetermined level.
  // For solar this sets the terminal 2100 LCOE ~1:1, so treat it as a WIDE band
  // biased HIGH (i.e. the transition may be even cheaper than modeled) and
  // sensitivity-test downward. See sources/wrights-law-empirics-and-floors.md
  // and docs/SENSITIVITY.md.
  softFloor: number;
  referenceCF: number;     // Base CF for LCOE calculation (0 = no CF adjustment)
  carbonIntensity: number; // kg CO2/MWh
  // Fossil fuel specific
  eroei0?: number;         // Initial EROEI
  // Depletion budget in extraction units: one year of 2025 production =
  // 2025 fleet GW × 0.01 (extraction books world fuel burned on that
  // scale; see the extraction update in step()). Sized to REMAINING TECHNICALLY RECOVERABLE RESOURCES, not
  // proved reserves: proved reserves are a working inventory that resources
  // convert into as extraction proceeds (world gas reserves 126 tcm in 1990,
  // 209 tcm in 2023 while R/P held at ~50-60 yr, BGR), so a proved-reserves
  // budget ran dry on the R/P horizon and gas LCOE jumped ~10x in one year.
  // See FOSSIL_RESOURCES_2025.
  recoverableResources?: number;

  // Regional 2025 baselines (replaces single capacity2025)
  capacity2025: Record<Region, number>;
}

/** Regional policy parameters */
export interface RegionalEnergyParams {
  carbonPrice: number;                          // $/ton CO2
  maxGrowthRate?: Partial<Record<EnergySource, number>>;  // Policy constraints (overrides global)
  /**
   * Regional capacity factor by source, entered as the pre-depletion base.
   * Convention: 2024 fleet-average CF net of curtailment for every wind row
   * and the us / oecd-ex-us solar rows; the other solar rows are still
   * latitude/irradiance estimates (follow-up). Site depletion counts
   * cumulative build from zero, so the year-0 effective CF sits below the
   * table value where the 2025 fleet is a large share of the potential
   * (follow-up: rebase depletion to post-2025 build).
   *
   * Both follow-ups matter more since dispatch began serving each region at
   * its own factor rather than at a fleet mean: these rows now set how much
   * a region can physically generate, not just how its capacity is planned.
   * A mis-stated row moves that region's fossil displacement directly.
   */
  capacityFactor?: Partial<Record<EnergySource, number>>;
  financingSpread?: number;                     // Observed start-year WACC spread over the global rate (fraction, e.g. 0.06 = +6pp); home bias drifts it thereafter
  /**
   * Multiplier on a source's financed LCOE in this region (pre-carbon,
   * pre-site-quality): local capex and soft costs that differ from the
   * global benchmark cost0. 1 (or absent) = benchmark.
   */
  costMultiplier?: Partial<Record<EnergySource, number>>;
  /** Fuel + VOM override ($/MWh) where the domestic fuel price differs from
   *  the global reference (e.g. China's regulated thermal coal market).
   *  Moves the fossil source's new-build LCOE and its running cost. */
  fossilRunningCost?: Partial<Record<'gas' | 'coal', number>>;
  /**
   * Firm-capacity adequacy policy: the region keeps dispatchable capacity
   * (coal + gas + nuclear + hydro + battery at its rated power) at `share`
   * of its start-year ratio to average demand, building `source` for any
   * gap. That build is standby capacity held for security, not for energy:
   * it is excluded from the energy requirement and fossil displacement, so
   * it neither crowds out clean build nor counts as energy supply, and
   * dispatch runs it only as a last resort (regionalStandbyCapacity). Absent =
   * no adequacy rule (capacity follows energy economics alone).
   */
  firmAdequacy?: { source: 'coal' | 'gas'; share: number };
}

export interface EnergyParams {
  sources: Record<EnergySource, EnergySourceParams>;

  /** Regional policy parameters (carbon price, growth constraints) */
  regional: Record<Region, RegionalEnergyParams>;

  /** EROI assumptions by source (non-fossil used directly; fossil uses depletion) */
  eroi: Record<EnergySource, number>;

  /**
   * Deployment-site capacity factors at which `eroi.solar` / `eroi.wind`
   * were measured. Dynamic EROI = eroi × fleetCF / eroiReferenceCF, so a
   * scenario that swaps EROI sources must move this with them.
   */
  eroiReferenceCF: { solar: number; wind: number };

  /**
   * Global carbon price. Prices demand-side fuel costs (electrification and
   * fuel switching) directly. Every power-sector decision (new-build choice,
   * fossil displacement, dispatch merit order) reads regional[r].carbonPrice,
   * so when a caller SETS this key, mergeParams copies it into every region
   * that has no explicit regional carbonPrice of its own: the global key is
   * an economy-wide price, and an explicit regional price overrides it for
   * that region. Left unset, the regions keep their own defaults (the
   * observed 2025 mix) and this 35 prices the demand side only. Before this
   * fill, a global-only price taxed end-use fuels but not power stations, so
   * raising it electrified demand onto unpriced coal and RAISED warming.
   */
  carbonPrice: number;

  /** Maximum growth rates (manufacturing limits) - global defaults */
  /** Generators: max annual growth of global BUILD capacity (see
   *  buildCapacity2025); a regional override caps the region's build growth
   *  on its previous year's build. Battery: fleet-proportional cap. */
  maxGrowthRate: Record<EnergySource, number>;

  /** Asset lifetimes (years) */
  lifetime: Record<EnergySource, number>;
  /**
   * Historical growth rate of each source's annual additions, which sets
   * the age profile of the 2025 fleet: cohort of age a ∝ (1+g)^-a (0 =
   * uniform ages). A fast-grown fleet is young, so its scheduled
   * retirements start near zero instead of at fleet / lifetime.
   */
  openingFleetGrowth: Record<EnergySource, number>;

  /** Battery round-trip efficiency */
  batteryEfficiency: number;

  /** Battery duration (hours) - converts GWh to GW */
  batteryDuration: number;

  /**
   * CAPEX for investment constraint
   * - Generators: $M/GW
   * - Battery: $M/GWh
   */
  capex: Record<EnergySource, number>;

  /**
   * Clean energy share of investment (grows over time)
   * cleanShare = cleanEnergyShare2025 + cleanEnergyShareGrowth × min(1, yearIndex/25)
   */
  cleanEnergyShare2025: number;
  cleanEnergyShareGrowth: number;

  /**
   * Generation required per unit of delivered demand — MUST equal
   * dispatch's gridLossFactor (consistency-pinned in energy.test.ts):
   * capacity is sized for the generation dispatch will actually request.
   */
  gridLossFactor: number;

  /**
   * Endogenous capex share: when desired clean build exceeds the ramp
   * budget, energy investment can compete for more of the investment pool.
   * flex = fraction of the unmet desired spend the share expands to cover
   * (0 = exogenous ramp only, current behavior); cleanShareMax caps the
   * total share of investment energy capex may claim.
   */
  cleanShareFlex: number;
  cleanShareMax: number;

  /**
   * CAPEX learning rate (annual decline for solar/wind/battery)
   */
  capexLearningRate: number;

  /**
   * Demand-driven capacity additions
   */
  demandFillRate: number;               // Fill this fraction of demand gap per year (0.30)
  competitiveThreshold: number;         // Build if within this factor of fossil LCOE (1.20)

  /** Capacity planning ceilings (max share of demand each source can serve) */
  capacityCeiling: Record<EnergySource, number>;

  /** Battery cycles per year for LCOE calculation */
  batteryCyclesPerYear: number;

  /** Battery service life in years; capex amortizes over lifetime cycles */
  batteryLifetimeYears: number;

  /**
   * Demand-led new build. Each region's requirement is the generation its
   * demand needs this year that the surviving fleet (after scheduled
   * retirements) cannot deliver. It is split among the generators by a logit
   * on delivered cost, share_s ∝ newBuildShareWeight_s × cost_s^-λ (the
   * GCAM technology-choice form). A source that hits a cap (resource
   * ceiling, build capacity) is held there and the rest of the requirement
   * is re-shared among the others, so a slower solar build is backfilled by
   * wind, gas, coal, nuclear or hydro rather than left unserved. Delivered
   * cost charges VRE for curtailment (LCOE / (1 - curtailment)) and blends
   * solar with solar+storage as the VRE share rises.
   */
  newBuildLogitExponent: number;
  /** Non-cost preference per generator (policy, siting, risk), calibrated so
   *  the 2025 world additions mix matches observation. Relative values only. */
  newBuildShareWeight: Record<GeneratorSource, number>;
  /**
   * Electricity demand growth in 2025 by region (fraction). Each region's
   * fleet-to-demand ratio is anchored on the end-2024 fleet serving 2025
   * demand / (1 + this), i.e. the fleet was built for 2024 demand; the region
   * then keeps that ratio, which carries its own utilization and reserve
   * conventions instead of a single global margin.
   */
  electricityDemandGrowth2025: Record<Region, number>;
  /**
   * Global build capacity per generator (GW/yr): the factory and supply-chain
   * ceiling on world additions (module lines, nacelle plants, turbine shops,
   * reactor construction). It grows at most maxGrowthRate[source] a year
   * while demand for it exceeds it; idle capacity depreciates at
   * buildCapacityDepreciation but not below what was demanded. There is no
   * fleet-proportional cap on generators. A REGIONAL maxGrowthRate override
   * caps that region's build at (1 + g) x its previous year's build.
   */
  buildCapacity2025: Record<GeneratorSource, number>;
  buildCapacityDepreciation: number;
  /** Fuel + variable O&M of running existing fossil plant ($/MWh, before
   *  depletion and carbon); mirrors dispatch's marginalCost */
  fossilRunningCost: Record<'gas' | 'coal', number>;
  /**
   * Average fleet efficiency (electric out / fuel in) of gas and coal power.
   * Turns dispatched fossil generation into fuel burned for depletion
   * accounting: extraction = one year of 2025 production x (power-sector
   * fuel + non-electric use) / its 2025 level. The index is anchored on
   * 2025, so this only sets the weight of power against end-use fuel.
   */
  fossilPowerEfficiency: Record<'gas' | 'coal', number>;
  /**
   * Economic replacement: each year, up to this fraction of a region's
   * existing gas/coal generation is added to the new-build requirement and
   * shared among CLEAN sources, scaled by how far new clean delivered cost
   * undercuts the plant's running cost (0 when it does not). The plant stays
   * on the books; dispatch runs it less.
   */
  fossilDisplacementRate: number;

  /** How strongly curtailment boosts battery target (default 2.0).
   *  storagePressure = 1 + curtailmentStorageBoost × the region's lagged curtailment rate */
  curtailmentStorageBoost: number;

  /** Risk premium over interest rate for energy project WACC */
  riskPremium: number;
  projectEquityShare: number;

  /** Base WACC used for LCOE calibration (no adjustment when effective WACC equals this) */
  baseWACC: number;

  /** Floor on effective WACC */
  minWACC: number;

  /** Multiplier on all regional financing spreads (0 = frictionless capital markets) */
  financingSpreadScale: number;

  /** Fraction of the change since the start year in a region's savings-rate gap
   *  vs the world that passes into its financing spread (Feldstein-Horioka home
   *  bias; 0 = perfect capital mobility) */
  financingHomeBias: number;

  /** Fraction of LCOE that is capital cost, by source */
  capitalIntensity: Record<EnergySource, number>;

  /** Long-duration storage (iron-air, compressed air, pumped hydro, etc.) */
  longStorage: {
    cost0: number;             // $/kWh initial cost (2025)
    alpha: number;             // Wright's Law learning exponent
    growthRate: number;        // Max annual capacity growth rate
    duration: number;          // Hours of storage duration (100h)
    capacity2025: Record<Region, number>;  // GWh per region
  };

  /** Site quality degradation — capacity factor declines with cumulative deployment */
  siteDepletion: {
    solarDepletion: number;        // Max CF reduction fraction (0.30 = 30% at full potential)
    windDepletion: number;         // Max CF reduction fraction
    solarPotential: Record<Region, number>;  // GW of good-quality sites per region
    windPotential: Record<Region, number>;   // GW of good-quality sites per region
  };
}

/**
 * Regional 2025 Capacity Defaults (GW; GWh for battery)
 *
 * Based on IEA World Energy Outlook 2024 and IRENA statistics. Region
 * lineage: 4 (OECD/China/EM/ROW) → 8 (EM → india+latam+seasia, ROW →
 * russia+mena+ssa) → 9 (OECD → us + oecd-ex-us by 2024 fleet shares: EIA
 * Electric Power Monthly, IRENA Renewable Capacity Statistics 2025, PRIS —
 * US ~26% of OECD solar, ~32% wind, ~52% gas, ~41% coal, ~35% nuclear,
 * ~18% hydro, ~55% battery GWh).
 */
const REGIONAL_CAPACITY_2025: Record<EnergySource, Record<Region, number>> = {
  // Solar rolled forward to END-2024 (the 2025 starting stock): the earlier
  // row summed to 1,408 GW = IRENA end-2023 (1,414 GW). Each region is scaled
  // by its IRENA end-2023 -> end-2024 growth (China x1.456, US x1.275, South
  // Asia x1.334, LatAm ex-OECD x1.358, OECD ex-US x1.176, MENA x1.228, SE Asia
  // x1.139, Russia+CIS x1.179, SSA x1.099), keeping the regional mapping; the
  // sum is 1,861 GW vs IRENA's 1,865 GW world total. IRENA Renewable Capacity
  // Statistics 2025, solar tables. Cross-check: China NEA ~887 GWac end-2024.
  solar:   { us: 204, 'oecd-ex-us': 518, china: 873, india: 120, latam: 54,  seasia: 40,  russia: 6,   mena: 37,  ssa: 9 },
  wind:    { us: 160, 'oecd-ex-us': 340, china: 400, india: 42,  latam: 22,  seasia: 5,   russia: 2,   mena: 12,  ssa: 5 },
  // Generation the model has no source for is folded into the nearest row,
  // as capacity-equivalent at that row's capacity factor (gas 0.50, hydro
  // 0.38), against each region's ~2025 requirement (MENA ~1,640 TWh, LatAm
  // ~1,730 TWh). Without it the observed 2025 fleet left 6.8% of MENA and
  // 5.7% of LatAm demand unserved, and the build's response to that shortfall
  // ran a two-year overshoot sawtooth.
  // - mena gas +75 (220 -> 295): oil-fired power, ~20% of MENA generation in
  //   2024 (IEA, The Future of Electricity in the Middle East and North
  //   Africa, 2025: gas ~70%, oil ~20%); Saudi Arabia 180, Iraq 68, Iran 58,
  //   Kuwait 33 TWh oil-fired (EI Statistical Review 2025 country data via
  //   Statbase). 0.20 x 1,640 TWh / (0.50 x 8.76) = 75 GW. Booked at gas
  //   carbon intensity: understates that slice's CO2 (oil ~750 kg/MWh).
  // - latam gas +8 (120 -> 128): oil derivatives, 2% of LAC generation 2024
  //   (OLADE, Electricity Generation Report 2024). 0.02 x 1,730 / 4.38.
  gas:     { us: 520, 'oecd-ex-us': 480, china: 200, india: 70,  latam: 128, seasia: 130, russia: 220, mena: 295, ssa: 45 },
  coal:    { us: 165, 'oecd-ex-us': 235, china: 1200,india: 270, latam: 20,  seasia: 100, russia: 45,  mena: 20,  ssa: 55 },
  nuclear: { us: 100, 'oecd-ex-us': 200, china: 60,  india: 8,   latam: 5,   seasia: 0,   russia: 12,  mena: 5,   ssa: 2 },
  // latam hydro +26 (200 -> 226): bioenergy (~4%, mostly Brazilian bagasse)
  // and geothermal (1%) of LAC generation 2024 (OLADE 2024; its full report
  // gives bioenergy 1.7%, the press release 4%), both non-emitting and
  // dispatchable like hydro. 0.05 x 1,730 TWh / (0.38 x 8.76) = 26 GW.
  hydro:   { us: 75,  'oecd-ex-us': 325, china: 400, india: 55,  latam: 226, seasia: 100, russia: 60,  mena: 50,  ssa: 40 },
  battery: { us: 55,  'oecd-ex-us': 45,  china: 80,  india: 5,   latam: 2,   seasia: 3,   russia: 1,   mena: 2,   ssa: 2 },
};

/**
 * Regional Carbon Price Defaults ($/ton CO2)
 *
 * Based on World Bank Carbon Pricing Dashboard 2024. US: RGGI (~$20) and
 * California/Washington (~$30-50) cover ~20% of power emissions, plus IRA
 * credits as an implicit price — ~$20 blended. OECD ex-US: EU ETS (~$70)
 * dominates power-sector pricing; UK/Canada ~$50, Japan/Korea/Mexico
 * near zero — ~$65 on the electricity-weighted blend.
 */
const REGIONAL_CARBON_PRICES: Record<Region, number> = {
  us: 20,
  'oecd-ex-us': 65,
  china: 15,
  india: 5,
  latam: 10,
  seasia: 5,
  russia: 0,
  mena: 0,
  ssa: 0,
};

/**
 * Regional cost multipliers on the financed LCOE (see
 * RegionalEnergyParams.costMultiplier), set so each region's 2025 model LCOE
 * reproduces its observed utility-scale cost (model values below are the
 * settled 2025 LCOE at multiplier 1); regions without a country figure stay
 * at the global benchmark (cost0).
 * - china solar 0.81: IRENA Renewable Power Generation Costs in 2024 (2025),
 *   China utility PV LCOE $33/MWh vs the model's $40.7 at the table CF.
 *   China's installed cost runs well below the global $691/kW average.
 * - china wind 0.66: same report, China onshore wind $29/MWh vs the model's
 *   $43.8 (global weighted average $34).
 * - india solar 0.85: same report, India $38/MWh vs the model's $44.5.
 * - us solar 1.5: IRENA 2024 puts US utility PV at $70/MWh unsubsidized (up
 *   from $59 in 2023; tariffs, interconnection, soft costs). The model has
 *   no tax credits, so 2025 is entered net of the 30% ITC (~$49 against the
 *   model's $32.9). JUDGMENT: the ITC phase-out after 2027 (OBBBA, 2025) is
 *   not modelled, so this understates the post-2027 US cost.
 */
const REGIONAL_COST_MULTIPLIER: Partial<Record<Region, Partial<Record<EnergySource, number>>>> = {
  us: { solar: 1.5 },
  china: { solar: 0.81, wind: 0.66 },
  india: { solar: 0.85 },
};

/**
 * Regional fuel + VOM overrides ($/MWh) where the domestic fuel market
 * diverges from the global (US 2024) reference in fossilRunningCost.
 * - china coal 40: Qinhuangdao 5,500 kcal thermal coal traded ~615-834
 *   RMB/t through 2025 (SunSirs; NDRC long-term contract band 570-770).
 *   At ~700 RMB/t, a ~300 gce/kWh fleet heat rate (CEC national average) burns ~0.38 kg
 *   of 5,500 kcal coal per kWh = 0.27 RMB/kWh = ~$37/MWh fuel, + ~$3 VOM.
 *
 * Gas: fuel = heat rate ~7 MMBtu/MWh x price + ~$7 VOM, the convention behind
 * the $35 reference (= $4/MMBtu). 2025 benchmarks: Henry Hub $3.5-3.6 (World
 * Bank CMO Oct 2025; EIA), TTF $12.2, North-East Asian LNG $11.9 (IEA Gas
 * Market Report, 2025 averages). Regional power-sector prices blend those
 * with administered domestic prices — judgment, $/MMBtu in brackets:
 * - oecd-ex-us 77 ($10): Europe at TTF and Japan/Korea on LNG dominate its
 *   gas-fired output; Canada/Australia domestic gas pulls it below spot
 * - china 73 ($9.5): regulated city-gate ~2.5-3 RMB/m3 plus LNG imports
 * - india 70 ($9): capped domestic APM gas (~$6.75) plus spot LNG
 * - seasia 63 ($8): Indonesian/Malaysian administered gas, Thai pool and
 *   Philippine/Vietnamese LNG
 * - latam 46 ($5.5): Mexican imports of US pipeline gas and Argentine shale
 *   against Brazilian/Chilean LNG
 * - russia 21 ($2): regulated domestic price, CIS similar or lower
 * - mena 25 ($2.5): Gulf administered prices ~$1.25-2.5 with Egypt ~$4-5
 * - us and ssa keep the $35 reference ($4; Nigeria's regulated domestic gas
 *   ~$2.4-3.5 against Ghana/South Africa nearer $6-7)
 * Held constant like the reference: no LNG price convergence is modelled.
 */
const REGIONAL_FOSSIL_RUNNING_COST: Partial<Record<Region, Partial<Record<'gas' | 'coal', number>>>> = {
  'oecd-ex-us': { gas: 77 },
  china: { coal: 40, gas: 73 },
  india: { gas: 70 },
  seasia: { gas: 63 },
  latam: { gas: 46 },
  russia: { gas: 21 },
  mena: { gas: 25 },
};

/**
 * Firm-capacity adequacy policies (see RegionalEnergyParams.firmAdequacy).
 * - china: holds its 2024 dispatchable-capacity-to-demand ratio, building
 *   coal for the gap. China commissioned 78 GW of coal in 2025 (CREA/GEM,
 *   China Coal Power H2 2025) while coal generation fell. Since 2024 the
 *   NDRC capacity payment has paid coal plants for availability, at 30-50%
 *   of a 330 RMB/kW benchmark fixed cost (100-165 RMB/kW/yr; NDRC Nov 2023).
 *   Policy reads the build as backup for variable renewables. share 0.983 is
 *   fitted (with newBuildShareWeight) so China's 2025 coal build is GEM's
 *   78.1 GW, i.e. the start-year ratio held almost exactly; storage counts
 *   at its rated power, so the coal build falls as batteries scale.
 */
const REGIONAL_FIRM_ADEQUACY: Partial<Record<Region, { source: 'coal' | 'gas'; share: number }>> = {
  china: { source: 'coal', share: 0.983 },
};

/**
 * Regional Financing Spreads — observed start-year WACC spread over the
 * global rate (fraction)
 *
 * Calibrated to the IEA Cost of Capital Observatory (2024: nominal WACC
 * ~6-7% advanced economies vs ~10-15% EMDE, Africa highest) and Steffen
 * (2020, Energy Economics) renewable project-finance survey; IRENA Renewable
 * Power Generation Costs 2023 uses 3.5-11% WACC assumptions across country
 * tiers. The US and OECD ex-US share the advanced-economy tier; China's
 * cheap capital is a savings/state-credit story; Russia's spread reflects
 * sanctions-era isolation; MENA blends cheap Gulf auction finance with
 * expensive North African markets. Reproduced exactly at yearIndex 0; the
 * home-bias drift is described at the spread block in step.
 */
const REGIONAL_FINANCING_SPREADS: Record<Region, number> = {
  us: -0.010,
  'oecd-ex-us': -0.010,
  china: -0.015,
  india: 0.020,
  latam: 0.030,
  seasia: 0.025,
  russia: 0.050,
  mena: 0.010,
  ssa: 0.060,
};

/**
 * Regional Solar Capacity Factors
 *
 * Based on latitude and irradiance. MENA has world's best solar (0.24).
 * Russia has poor solar (0.11). US utility PV fleet CF ~0.23 AC (EIA EPM
 * 2023), distributed lower; OECD ex-US ~0.15 (Germany 0.11, Japan 0.14,
 * Spain 0.19, Australia 0.20; capacity-weighted, IEA PVPS 2024).
 */
const REGIONAL_SOLAR_CF: Record<Region, number> = {
  us: 0.22,
  'oecd-ex-us': 0.15,
  china: 0.17,
  india: 0.20,
  latam: 0.21,
  seasia: 0.18,
  russia: 0.11,
  mena: 0.24,
  ssa: 0.22,
};

/**
 * Regional Wind Capacity Factors (2024 fleet averages; convention at
 * RegionalEnergyParams.capacityFactor). Cross-checks: China NEA 2,225
 * utilization hours = 0.254 and Ember 2024 generation / IRENA capacity
 * ~0.25; India Ember ~80 TWh on ~45 GW = 0.21; LatAm is Brazil ~0.42
 * (ONS/ABEEolica), Argentina ~0.45 (CAMMESA), Mexico ~0.35, weighted;
 * MENA is Egypt Gulf of Suez 0.40-0.45 (Zafarana ~0.32), Morocco
 * 0.35-0.40, Saudi Dumat al-Jandal ~0.40; SSA is South Africa ~0.34
 * (Eskom/CSIR), Lake Turkana 0.55-0.65 on 0.3 GW, Ethiopia ~0.30. SE Asia
 * (~5 GW) and Russia+CIS (~2 GW) are weakly sourced. Fleet check: 988 GW x
 * 0.276 x 8,760 h = 2,390 TWh vs Ember/IEA 2024 ~2,400-2,500 TWh.
 */
const REGIONAL_WIND_CF: Record<Region, number> = {
  us: 0.34,           // EIA Electric Power Monthly 2023 fleet CF 33.5%
  'oecd-ex-us': 0.27, // WindEurope 2023: onshore 24%, offshore 38%; Japan/Korea ~22%
  china: 0.25,        // NEA 2023 utilization hours
  india: 0.23,        // CEA 2023-24 CUF 22-24%
  latam: 0.40,        // Brazil/Argentina/Mexico fleets, capacity-weighted
  seasia: 0.25,       // EVN/ERAV Vietnam 2023 onshore + nearshore
  russia: 0.30,       // SO UPS annual report, Ulyanovsk/Rostov fleets 28-33%
  mena: 0.36,         // NREA Egypt, ONEE Morocco, Dumat al-Jandal
  ssa: 0.35,          // Eskom/CSIR South Africa REIPPP fleet
};

/** Capacity-weighted mean of a per-region value over the 2025 fleet. */
function fleetWeighted(value: Record<Region, number>, fleet: Record<Region, number>): number {
  let weighted = 0;
  let total = 0;
  for (const region of REGIONS) {
    weighted += value[region] * fleet[region];
    total += fleet[region];
  }
  return weighted / total;
}

/**
 * CF at which wind cost0 is quoted: the fleet-weighted table CF, derived so
 * a recalibration of REGIONAL_WIND_CF only redistributes cost between
 * regions. Overridable through sources.wind.referenceCF like any default.
 */
const WIND_FLEET_CF_2025 = fleetWeighted(REGIONAL_WIND_CF, REGIONAL_CAPACITY_2025.wind);

/**
 * Fossil depletion calibration: remaining technically recoverable resources
 * (proved reserves + reserve growth in known fields + undiscovered +
 * unconventional) over 2025 production.
 *
 * - gas: 800 tcm resources (225 tcm proved), IEA Global Energy and Climate
 *   Model Documentation 2024, Table 6.1 (2023; from USGS, BGR, CEDIGAZ). BGR
 *   Energy Study 2025 (end-2023) puts reserves + resources at 209 + 658 =
 *   ~870 tcm, within 10%.
 * - coal: 20,776 Gt resources (1,074 Gt proved), same IEA table. BGR
 *   (end-2023): reserves 797 + 321 Gt and resources 16,199 + 3,515 Gt (hard
 *   coal + lignite) = ~20,830 Gt.
 * - production: EI Statistical Review of World Energy 2024, ~4.0 tcm gas and
 *   ~8.7 Gt coal a year.
 *
 * The EROI decline in depletion() then runs on the share of the RESOURCE
 * left, the quantity the IEA's own supply model depletes (GEC documentation
 * 2024 §6.2: production is modelled from "remaining technically recoverable
 * resources (Table 6.1), depletion rates, production costs, ..."). Depleting
 * against proved reserves instead treats an inventory that has grown with
 * extraction for 35 years (gas 126 -> 209 tcm 1990-2023, BGR) as a fixed
 * endowment.
 */
export const FOSSIL_RESOURCES_2025 = {
  gas: { resources: 800, provedReserves: 225, production: 4.0 },   // tcm, tcm, tcm/yr
  coal: { resources: 20776, provedReserves: 1074, production: 8.7 }, // Gt, Gt, Gt/yr
} as const;

/** One year of 2025 production in extraction units (2025 fleet GW x 0.01). */
export function annualExtraction2025(source: 'gas' | 'coal'): number {
  let fleet = 0;
  for (const region of REGIONS) fleet += REGIONAL_CAPACITY_2025[source][region];
  return fleet * 0.01;
}

/** Depletion budget: 2025 extraction rate x resource-to-production years. */
function resourceBudget(source: 'gas' | 'coal'): number {
  const r = FOSSIL_RESOURCES_2025[source];
  return annualExtraction2025(source) * (r.resources / r.production);
}

export const energyDefaults: EnergyParams = {
  sources: {
    solar: {
      name: 'Solar PV',
      cost0: 35,             // $/MWh unsubsidized utility PV, Lazard LCOE+ 2024 low end; hardware $23 + soft $12
      alpha: 0.36,           // 22% learning/doubling; Way et al. 2022, OWID 1976-2019 (~20%) — see sources/energy-learning-rates.md
      softFloor: 12,         // $/MWh BOS/soft-cost floor; SETS terminal 2100 LCOE ~1:1. Contested & likely biased high — wide band ~$6-18, test downward. See interface note + sources/wrights-law-empirics-and-floors.md
      referenceCF: 0.20,     // CF adjustment: worse sites → higher effective LCOE
      capacity2025: REGIONAL_CAPACITY_2025.solar,
      carbonIntensity: 0,
    },
    wind: {
      name: 'Wind',
      cost0: 35,             // $/MWh unsubsidized onshore, Lazard LCOE+ 2024 low-mid; hardware $20 + soft $15
      alpha: 0.23,           // ~15% learning/doubling; lit. range 10-19% — see sources/energy-learning-rates.md
      softFloor: 15,         // $/MWh BOS/soft-cost floor (> solar: complex install, maintenance). Contested — wide band. See interface note.
      referenceCF: WIND_FLEET_CF_2025, // 0.276; see the constant
      capacity2025: REGIONAL_CAPACITY_2025.wind,
      carbonIntensity: 0,
    },
    gas: {
      name: 'Natural Gas',
      cost0: 45,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,        // No CF adjustment (dispatchable)
      capacity2025: REGIONAL_CAPACITY_2025.gas,
      carbonIntensity: 400,
      eroei0: 30,
      // ~200 years of 2025 production (800 tcm / 4.0 tcm/yr); see
      // FOSSIL_RESOURCES_2025. Pinned by the resource calibration test. The
      // fleet includes the oil-fired capacity folded into the gas row (see
      // REGIONAL_CAPACITY_2025), so its ~3% of the row books as gas.
      recoverableResources: resourceBudget('gas'),
    },
    coal: {
      name: 'Coal',
      cost0: 40,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,
      capacity2025: REGIONAL_CAPACITY_2025.coal,
      carbonIntensity: 900,
      eroei0: 25,
      // ~2,400 years of 2025 production (20,776 Gt / 8.7 Gt/yr); see
      // FOSSIL_RESOURCES_2025. Pinned by the resource calibration test.
      recoverableResources: resourceBudget('coal'),
    },
    nuclear: {
      name: 'Nuclear',
      cost0: 90,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,
      capacity2025: REGIONAL_CAPACITY_2025.nuclear,
      carbonIntensity: 0,
    },
    hydro: {
      name: 'Hydroelectric',
      cost0: 40,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,
      capacity2025: REGIONAL_CAPACITY_2025.hydro,
      carbonIntensity: 0,
    },
    battery: {
      name: 'Battery Storage',
      cost0: 108,            // $/kWh pack, BNEF battery price survey Dec 2025 (all-segment $108/kWh; stationary packs $70, China $84); hardware $88 + soft $20
      alpha: 0.26,           // ~17% learning/doubling; Ziegler & Trancik 2021 find ~24% at cell level, pack lower
      softFloor: 20,         // $/kWh BOS floor (BMS, pack assembly, install). INERT on the baseline transition — never binds (sweep: 10/20/40 identical). See interface note.
      referenceCF: 0,        // No CF adjustment (dispatchable)
      capacity2025: REGIONAL_CAPACITY_2025.battery,
      carbonIntensity: 0,
    },
  },

  // Regional policy parameters
  regional: Object.fromEntries(REGIONS.map(region => [region, {
    carbonPrice: REGIONAL_CARBON_PRICES[region],
    capacityFactor: { solar: REGIONAL_SOLAR_CF[region], wind: REGIONAL_WIND_CF[region] },
    financingSpread: REGIONAL_FINANCING_SPREADS[region],
    ...(REGIONAL_COST_MULTIPLIER[region] ? { costMultiplier: { ...REGIONAL_COST_MULTIPLIER[region] } } : {}),
    ...(REGIONAL_FOSSIL_RUNNING_COST[region] ? { fossilRunningCost: { ...REGIONAL_FOSSIL_RUNNING_COST[region] } } : {}),
    ...(REGIONAL_FIRM_ADEQUACY[region] ? { firmAdequacy: { ...REGIONAL_FIRM_ADEQUACY[region]! } } : {}),
  }])) as EnergyParams['regional'],

  // EROI assumptions (used for net energy fraction). Contested literature:
  // ranges span Weißbach et al. (2013, buffered vs unbuffered) to
  // Murphy & Hall (2010); values below sit mid-range, see docs/REFERENCES.md
  eroi: {
    solar: 20,
    wind: 25,
    nuclear: 60,
    hydro: 30,
    battery: 10,
    gas: 30,
    coal: 25,
  },
  // Reference CFs for the eroi values above: solar from Bhandari et al.
  // (2015) harmonized to 1,700 kWh/m²/yr (~CF 0.18); wind from Kubiszewski
  // et al. (2010) at ~CF 0.30. Manufacturing location enters eroi, not here.
  eroiReferenceCF: { solar: 0.18, wind: 0.30 },

  // Global fallback carbon price (DEPRECATED - use regional)
  carbonPrice: 35,

  // Max annual capacity growth: modeling assumptions bracketing recent
  // history (solar grew ~25-40%/yr 2015-2024, IRENA; nuclear/hydro
  // supply-chain limited)
  maxGrowthRate: {
    solar: 0.30,
    wind: 0.20,
    battery: 0.40,
    nuclear: 0.05,
    hydro: 0.02,
    gas: 0.05,
    coal: 0.03,
  },
  // Asset lives in years: NREL ATB 2024 / IEA WEO assumptions (nuclear with
  // license extension; hydro civil works)
  lifetime: {
    solar: 30,
    wind: 25,
    battery: 15,
    nuclear: 60,
    hydro: 80,
    gas: 40,
    coal: 45,
  },
  // Global installed-capacity CAGR 2015-2024 as the additions growth rate:
  // solar ~223 -> 1,865 GW, wind ~416 -> 1,133 GW, hydro +1.7%/yr (IRENA
  // Renewable Capacity Statistics); coal ~1,950 -> 2,175 GW (GEM Global Coal
  // Plant Tracker); gas ~2%/yr (GEM Oil & Gas Plant Tracker); grid batteries
  // ~10x 2019-2024 (BNEF). Nuclear 0 (uniform): the fleet was mostly built
  // 1970-1990, so it is at least as old as uniform — conservative.
  openingFleetGrowth: { solar: 0.26, wind: 0.12, battery: 0.5, nuclear: 0, hydro: 0.017, gas: 0.02, coal: 0.012 },
  batteryEfficiency: 0.85,
  batteryDuration: 4, // hours (for GWh → GW conversion)
  // Overnight capital cost $/kW ($/kWh for battery): IRENA Renewable Power
  // Generation Costs 2023 global-weighted averages (solar ~$760/kW, onshore
  // wind ~$1160/kW); nuclear is an OECD/recent-builds compromise
  capex: {
    solar: 800,
    wind: 1200,
    battery: 150,
    nuclear: 6000,
    hydro: 2000,
    gas: 800,
    coal: 2000,
  },

  // Investment constraint parameters
  cleanEnergyShare2025: 0.15,     // 15% of investment to clean energy in 2025
  cleanEnergyShareGrowth: 0.15,   // Grows to 30% by 2050
  // Capacity is planned on dispatch's generation basis; derived from
  // dispatch.gridLossFactor at run time (src/param-derivations.ts)
  gridLossFactor: dispatchDefaults.gridLossFactor,
  cleanShareFlex: 0,              // default off: exogenous ramp only (calibrated baseline)
  cleanShareMax: 0.30,            // matches the ramp's own 2050 endpoint when flex is off
  capexLearningRate: 0.02,        // 2% CAPEX decline per year for solar/wind/battery

  // Demand-driven capacity
  demandFillRate: 0.30,           // Fill 30% of demand gap per year
  competitiveThreshold: 1.20,     // Build if LCOE within 20% of fossil

  // Capacity planning ceilings (how much to build, not how much to
  // generate): modeling assumptions, not sourced data
  capacityCeiling: {
    solar: 0.8,
    wind: 0.35,
    nuclear: 0.3,
    hydro: 0.2,
    gas: 1.0,
    coal: 1.0,
    battery: 1.0,
  },

  // Battery LCOE cycles
  batteryCyclesPerYear: 365,
  batteryLifetimeYears: 15,  // Grid LFP calendar life ~15yr / ~5000 cycles, NREL Storage Futures (2023)

  // Demand-led new build (see the EnergyParams note)
  newBuildLogitExponent: 6,        // GCAM electricity technology-choice logit exponent (JGCRI GCAM documentation)
  // Calibrated jointly with fossilDisplacementRate and China's firmAdequacy
  // share (fixed point, solar weight = 1; scripts/calibrate-2025-build.ts)
  // on 2025 additions: world wind 158.7, hydro 18.4 GW (IRENA RCS 2026), gas
  // 60.4 GW (GEM Global Oil & Gas Plant Tracker 2026), coal ~95 GW (GEM Boom
  // & Bust 2026), nuclear 4.4 GW (IAEA); China solar 315 GW (NEA) and China
  // coal 78.1 GW (GEM). Re-solved when regional gas prices replaced the US
  // reference everywhere. World solar is NOT fitted and lands at 537 GW vs
  // 511 (IRENA; 574 before LNG-priced gas). Wind's low weight says its LCOE
  // (cost0 35) is cheaper outside China than the build choices actually made
  // reveal; gas's high weight is the firming value its fuel cost hides.
  newBuildShareWeight: { solar: 1, wind: 0.0537, nuclear: 1.57, hydro: 0.0237, gas: 2.39, coal: 0.53 },
  // Ember Global Electricity Review 2026: world +2.8% (+849 TWh) to 31,779
  // TWh, of which China +503 TWh (~5.0% on ~10,000 TWh); the remaining +346
  // TWh is ~1.6% on the rest of the world's ~21,800 TWh. Ember gives no
  // further split in the headline release, so every other region carries
  // the rest-of-world average (follow-up: country rows from the dataset).
  electricityDemandGrowth2025: Object.fromEntries(REGIONS.map(r => [r, r === 'china' ? 0.05 : 0.016])) as Record<Region, number>,
  buildCapacity2025: {
    solar: 1130,  // GW/yr AC: module nameplate ~1,531 GWdc (IEA PVPS 2026; CPIA 1,430) x 0.74 IRENA-AC/DC
    wind: 250,    // judgment: no public nacelle-capacity figure; GWEC 2026 counts 178 GW installed in 2025
    gas: 67,      // heavy-duty gas turbine output 2025 (BNEF; WoodMac 60-70 GW/yr vs ~110 GW backlog)
    coal: 150,    // judgment: China's boiler/turbine industry is not binding; 2025 China commissioned 78 GW (GEM 2026)
    nuclear: 10,  // judgment: ~70 reactors under construction on ~7-yr builds; 4.4 GW connected 2025, 6.8 GW 2024 (IAEA)
    hydro: 30,    // judgment: 18.4 GW added 2025 (IRENA RCS 2026), project-pipeline limited
  },
  buildCapacityDepreciation: 0.14, // ~7-yr economic life of idle lines (PV: PERC->TOPCon obsolescence 2022-25); judgment
  fossilRunningCost: { gas: 35, coal: 25 }, // = dispatch marginalCost (fuel + VOM, 2024 US reference prices)
  // The efficiencies the module's own carbonIntensity (400 / 900 kg/MWh)
  // implies under IPCC 2006 default combustion factors (gas 56.1, bituminous
  // coal 94.6 tCO2/TJ = 202 / 341 kg/MWh of fuel). Global public-fleet
  // averages were 40% gas / 34% coal in IEA (2008) Energy Efficiency
  // Indicators for Public Electricity Production from Fossil Fuels, and
  // have risen since (US coal fleet 37.4%, EU ~38%, IEA Clean Coal Centre
  // ~2017). At 0.50, power is ~35% of 2025 gas use (IEA: ~40%).
  fossilPowerEfficiency: { gas: 0.50, coal: 0.38 },
  fossilDisplacementRate: 0.017,   // fitted (with newBuildShareWeight) to China's 2025 solar build, 315 GW (NEA): clean build beyond demand growth
  curtailmentStorageBoost: 2.0,    // At 30% curtailment: battery target × 1.6; at 50%: × 2.0

  // WACC: financing cost channel for LCOE
  // Project WACC blends debt priced off the real SAFE rate (capital.safeRate,
  // ~1% in 2025; follows growth, public debt and repression) with equity
  // priced off the return on capital (capital.interestRate, which rises
  // when capital is scarce). Renewable project finance is ~70-80% debt
  // (Steffen 2020, Energy Economics 88; IEA Cost of Capital Observatory
  // 2024 uses ~70/30 for utility-scale solar).
  projectEquityShare: 0.30,
  // Premium over that blend, set so 2025 WACC is unchanged (~8% global,
  // 7% US/OECD with their -1pp spread — the level baseWACC and the IEA
  // Observatory calibrate). Was 2% over the return on capital alone.
  riskPremium: 0.052,
  baseWACC: 0.07,                  // 7% baseline — LCOE calibrated at this rate
  minWACC: 0.03,                   // Floor on WACC (even in very low-rate world)
  financingSpreadScale: 1.0,       // Regional spreads applied at face value
  // Domestic savings scarcity raises the local cost of capital: savings and
  // investment stay correlated because capital is imperfectly mobile
  // (Feldstein & Horioka 1980; retention coefficients ~0.3-0.5 in recent
  // decades). 0.15 maps a change in the savings-rate gap to price; the
  // observed start-year spreads themselves are taken as given.
  financingHomeBias: 0.15,
  capitalIntensity: {              // Fraction of LCOE that is capital cost
    solar: 0.85,
    wind: 0.80,
    nuclear: 0.90,
    hydro: 0.85,
    gas: 0.15,
    coal: 0.25,
    battery: 0.80,
  },

  // Long-duration storage (iron-air, CAES, etc.): modeling assumptions —
  // pre-commercial technology, costs anchored loosely to ~2x Li-ion
  longStorage: {
    cost0: 300,                // $/kWh (2025, ~2x battery)
    alpha: 0.15,               // Slower learning than Li-ion
    growthRate: 0.25,          // Max annual growth rate
    duration: 100,             // 100 hours
    capacity2025: {
      us: 3, 'oecd-ex-us': 2, china: 3, india: 1, latam: 1,
      seasia: 0.5, russia: 0.5, mena: 0.5, ssa: 0.5,
    },
  },

  // Site quality degradation: modeling assumptions (best-sites-first;
  // regional potentials are order-of-magnitude, not resource assessments)
  siteDepletion: {
    solarDepletion: 0.30,      // Best sites used first → 30% CF reduction at full potential
    windDepletion: 0.30,       // Same for wind
    solarPotential: {          // GW of good-quality solar sites per region
      // china: desert-Gobi-wilderness technical potential 10.7 TW (Wu et al. 2023, Energies 16:4559);
      // desert-only 36-85 TW (Wang et al. 2024, Sci. Total Environ.), national 55-108 TW. Was 2,500 GW, which already counted the
      // 2025 fleet as 35% of the good sites. Other rows remain order-of-magnitude placeholders.
      us: 1800, 'oecd-ex-us': 1200, china: 10000, india: 1500, latam: 2000,  // US Southwest + Australia carry the OECD resource
      seasia: 1000, russia: 1000, mena: 2000, ssa: 2000,
    },
    windPotential: {           // GW of good-quality wind sites per region
      us: 700, 'oecd-ex-us': 500, china: 800, india: 400, latam: 600,  // NREL: US Great Plains; ex-US mostly European offshore
      seasia: 300, russia: 800, mena: 200, ssa: 400,
    },
  },
};

// =============================================================================
// STATE
// =============================================================================

/** Regional capacity state (per region, per source) */
export interface RegionalCapacityState {
  installed: number;      // Current capacity (GW or GWh) in this region
  additions: number[];    // Auditable history of annual additions
  initialCapacity: number; // Original 2025 capacity
  vintages: VintageStockState;
}

/** Global learning state (per source) - for Wright's Law */
export interface GlobalLearningState {
  cumulative: number;     // Total ever deployed GLOBALLY (for learning)
  extracted: number;      // Fossil fuels: extracted so far (global)
  /** Fossil fuels: world fuel use (TWh of fuel) in the first year it was
   *  measurable; the extraction index divides by it */
  fuelUseAnchor?: number;
}

export interface EnergyState {
  /** Regional capacity by region and source */
  regional: Record<Region, Record<EnergySource, RegionalCapacityState>>;

  /** Global cumulative for learning curves */
  global: Record<EnergySource, GlobalLearningState>;

  /** Long-duration storage regional capacity (GWh) */
  longStorageRegional: Record<Region, number>;

  /** Long-duration storage global cumulative (GWh, for learning) */
  longStorageCumulative: number;

  /** World minus regional savings rate at yearIndex 0 (see the spread block in step) */
  savingsGapAnchor: Record<Region, number>;

  /** Global build capacity per generator this year (GW/yr; see buildCapacity2025) */
  buildCapacity: Record<GeneratorSource, number>;
  /** Each region's anchored fleet-to-demand ratio (see electricityDemandGrowth2025) */
  fleetDemandRatio: Record<Region, number>;
  /** Each region's anchored firm-capacity-to-average-demand ratio (firmAdequacy) */
  firmDemandRatio: Record<Region, number>;
  /** Each region's 2025 fossil utilization (dispatched / nameplate output),
   *  so idle capacity is measured against how the anchor fleet actually ran.
   *  Above 1 where dispatch ran the fleet past the table capacity factor;
   *  the fleet then counts at that duty */
  fossilRunRatio: Record<Region, Record<'coal' | 'gas', number>>;
  /** Standby (adequacy) build history by region, GW per year; the stock is
   *  the builds younger than the source's lifetime */
  standbyAdditions: Record<Region, number[]>;
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface EnergyInputs {
  /** Electricity demand for ceiling calculation (TWh) - GLOBAL */
  electricityDemand: number;

  /** Regional electricity demand (TWh) - for regional ceiling calculation */
  regionalElectricityDemand?: Record<Region, number>;

  /** Investment available to each region's build ($T): the region's share of
   *  world investment (the runner's regionalInvestment transform). */
  regionalInvestment: Record<Region, number>;

  /** Mineral supply constraint 0-1 (from resources, lagged). 1 = no constraint. */
  mineralConstraintBySource: Record<EnergySource, number>;

  /** Lagged curtailment rate 0-1 BY REGION (from dispatch previous year).
   *  0 = no curtailment. Each region's VRE damping and storage pressure read
   *  its own grid's curtailment: a region with little VRE is not braked by
   *  curtailment on other continents' grids. */
  laggedRegionalCurtailmentRate: Record<Region, number>;
  /** Last year's unserved share of required generation per region: built
   *  for this year on top of growth and retirements (closes the loop between
   *  the planner's fleet view and dispatch's) */
  laggedRegionalShortfallRate?: Record<Region, number>;
  /** Last year's dispatched generation by region and source (TWh). The
   *  build counts fossil plants at what they actually ran, not at nameplate
   *  output, and prices their idle output as a re-run option. Missing ->
   *  fossil counted at nameplate. */
  laggedRegionalGeneration?: Partial<Record<Region, Partial<Record<string, number>>>>;

  /** Non-electric fuel use this year by fuel (TWh, from demand). With last
   *  year's fossil generation it measures world gas and coal burned, which
   *  is what depletes the resource. Missing -> extraction falls back to the
   *  power fleet's nameplate. */
  fuels?: Partial<Record<string, number>>;

  /** Lagged real safe rate (capital.safeRate, previous year) — prices project debt */
  laggedSafeRate: number;
  /** Lagged return on capital + debt premium (capital.interestRate) — prices project equity */
  laggedInterestRate?: number;

  /** Global savings rate this year (from capital) for the home-bias spread */
  savingsRate?: number;

  /** Regional savings rates this year (from capital) for the home-bias spread */
  regionalSavings?: Record<Region, number>;
}

export interface EnergyOutputs {
  /** Realized capex spend this year, all sources incl. fossil/storage ($T) */
  energyCapexSpend: number;
  /** Generator LCOEs ($/MWh) plus battery capital cost ($/kWh), globally learned */
  lcoes: Record<EnergySource, number>;

  /** Regional generator LCOEs ($/MWh) plus battery capital cost ($/kWh) */
  regionalLCOEs: Record<Region, Record<EnergySource, number>>;

  /** Net energy fraction by source (1 - 1/EROI) */
  netEnergyFraction: Record<EnergySource, number>;

  /** Solar + battery combined LCOE ($/MWh) */
  solarPlusBatteryLCOE: number;

  /** Installed capacity by source (GW, GWh for battery) - SUM of regional */
  capacities: Record<EnergySource, number>;

  /** Regional capacity breakdown */
  regionalCapacities: Record<Region, Record<EnergySource, number>>;

  /** Standby (firm-adequacy) capacity inside regionalCapacities (GW): held
   *  for security, so dispatch runs it only after every other source. */
  regionalStandbyCapacity: Record<Region, Record<'coal' | 'gas', number>>;

  /** Cumulative capacity (for external tracking) - GLOBAL */
  cumulativeCapacity: Record<EnergySource, number>;

  /** Capacity additions this year (GW; GWh for battery) - SUM of regional */
  additions: Record<EnergySource, number>;

  /** Regional additions breakdown */
  regionalAdditions: Record<Region, Record<EnergySource, number>>;

  /** Battery cost ($/kWh) */
  batteryCost: number;

  /** Cheapest LCOE this year ($/MWh) */
  cheapestLCOE: number;

  /**
   * Effective solar capacity factor by region, after site depletion. Dispatch
   * needs these per region: a fleet mean applied everywhere lets a region
   * generate more than its own panels physically can.
   */
  regionalEffectiveSolarCF: Record<Region, number>;

  /** Effective wind capacity factor by region, after site depletion. */
  regionalEffectiveWindCF: Record<Region, number>;

  /**
   * Fleet-weighted solar capacity factor. Retained for the dynamic-EROI
   * scaling and aggregate diagnostics, which genuinely want a global mean.
   */
  effectiveSolarCF: number;

  /** Effective wind capacity factor (capacity-weighted, after site depletion) */
  effectiveWindCF: number;

  /** Long-duration storage cost ($/kWh) */
  longStorageCost: number;

  /** Long-duration storage total capacity (GWh) */
  longStorageCapacity: number;

  /** Long-duration storage regional capacities (GWh) */
  longStorageRegional: Record<Region, number>;

  /** Effective WACC used for LCOE adjustment this year */
  effectiveWACC: number;

  /** Effective WACC by region (global rate + regional financing spread) */
  regionalWACC: Record<Region, number>;
  /** Fuel + VOM $/MWh by region (regional override or the global reference), excl. carbon; dispatch's merit order reads it */
  regionalFossilRunningCost: Record<Region, Record<'gas' | 'coal', number>>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get global cumulative capacity for learning curves
 */
function getGlobalCumulative2025(params: EnergyParams, source: EnergySource): number {
  let total = 0;
  for (const region of REGIONS) {
    total += params.sources[source].capacity2025[region];
  }
  return total;
}

/**
 * Get global long storage cumulative capacity for learning curves
 */
function getGlobalLongStorageCumulative2025(params: EnergyParams): number {
  let total = 0;
  for (const region of REGIONS) {
    total += params.longStorage.capacity2025[region] ?? 0;
  }
  return total;
}

/** Annual capital-recovery factor for an asset with a finite service life. */
export function capitalRecoveryFactor(rate: number, lifetimeYears: number): number {
  if (rate < 0.001) return 1 / lifetimeYears;
  return rate / (1 - Math.pow(1 + rate, -lifetimeYears));
}

/**
 * Convert storage capital cost ($/kWh of energy capacity) to incremental
 * levelized storage service cost ($/MWh cycled).
 */
export function levelizedStorageCostPerMWh(
  costPerKWh: number,
  wacc: number,
  lifetimeYears: number,
  cyclesPerYear: number,
): number {
  return (costPerKWh * 1000 * capitalRecoveryFactor(wacc, lifetimeYears)) /
    cyclesPerYear;
}

/**
 * Get base regional capacity factor (with regional override, before site depletion)
 */
function getBaseRegionalCapacityFactor(
  params: EnergyParams,
  region: Region,
  source: EnergySource
): number {
  // Check for regional override
  const regionalCF = params.regional[region].capacityFactor?.[source];
  if (regionalCF !== undefined) return regionalCF;

  // Default capacity factors
  switch (source) {
    case 'solar': return 0.20;
    case 'wind': return 0.30;
    case 'nuclear': return 0.83;
    case 'hydro': return 0.38;
    default: return 0.50;
  }
}

/**
 * Get effective regional capacity factor with site quality degradation.
 * Best sites are used first; as cumulative deployment approaches regional potential,
 * capacity factor declines.
 *
 * effectiveCF = baseCF × (1 - depletion × min(1, cumCapacity / regionalPotential))
 */
export function getRegionalCapacityFactor(
  params: EnergyParams,
  region: Region,
  source: EnergySource,
  installedCapacity?: number
): number {
  const baseCF = getBaseRegionalCapacityFactor(params, region, source);

  // Only apply site depletion to solar and wind
  if (installedCapacity !== undefined && (source === 'solar' || source === 'wind')) {
    const depletion = source === 'solar'
      ? params.siteDepletion.solarDepletion
      : params.siteDepletion.windDepletion;
    const potential = source === 'solar'
      ? params.siteDepletion.solarPotential[region]
      : params.siteDepletion.windPotential[region];
    const depletionFraction = Math.min(1, installedCapacity / potential);
    return baseCF * (1 - depletion * depletionFraction);
  }

  return baseCF;
}

/** Generating sources: every source but storage */
export type GeneratorSource = Exclude<EnergySource, 'battery'>;
export const GENERATORS = ENERGY_SOURCES.filter((s): s is GeneratorSource => s !== 'battery');

/**
 * Regional solar additions in calendar 2024 (GW): the end-2024 fleet less
 * its end-2023 level at each region's IRENA growth ratio (see the solar row
 * of REGIONAL_CAPACITY_2025). Sums to 453 GW vs IRENA's 452 GW. Seeds a
 * regional maxGrowthRate.solar override (build growth on last year's build)
 * in the first simulated year.
 */
const REGIONAL_SOLAR_ADDITIONS_2024: Record<Region, number> = {
  us: 44.0, 'oecd-ex-us': 77.5, china: 273.4, india: 30.0, latam: 14.2,
  seasia: 4.9, russia: 0.9, mena: 6.9, ssa: 0.8,
};

export interface NewBuildCandidate {
  source: GeneratorSource;
  cost: number;       // delivered cost, $/MWh
  weight: number;     // non-cost share weight
  twhPerGW: number;   // delivered TWh per GW built
  capGW: number;      // most this source can add this year
  /** Re-running an existing, underused plant rather than building one: its
   *  share goes to `idleGW`, not `gw`, and costs running cost only */
  idle?: boolean;
}

export interface NewBuildAllocation {
  gw: Record<GeneratorSource, number>;
  /** Idle fossil capacity the plan expects to run again instead of building */
  idleGW: Partial<Record<GeneratorSource, number>>;
  requirementTWh: number;
  unmetTWh: number;   // > 0 only when every source is at its cap
  standbyGW?: number; // firm-adequacy build inside gw (see RegionalEnergyParams.firmAdequacy)
}

/**
 * Split a generation requirement among generators by a logit on delivered
 * cost, share ∝ weight × cost^-λ. A source whose share exceeds its cap is
 * held at the cap and the remaining requirement is re-shared among the
 * others (water-filling), so capped demand is backfilled, not dropped.
 */
export function allocateNewBuild(
  requirementTWh: number,
  candidates: NewBuildCandidate[],
  lambda: number,
): NewBuildAllocation {
  const gw = Object.fromEntries(GENERATORS.map(s => [s, 0])) as Record<GeneratorSource, number>;
  const idleGW: Partial<Record<GeneratorSource, number>> = {};
  const credit = (c: NewBuildCandidate, amount: number) => {
    if (c.idle) idleGW[c.source] = (idleGW[c.source] ?? 0) + amount;
    else gw[c.source] += amount;
  };
  let active = candidates.filter(c => c.capGW > 0 && c.twhPerGW > 0 && c.weight > 0 && c.cost > 0);
  let remaining = Math.max(0, requirementTWh);
  while (remaining > 1e-9 && active.length > 0) {
    const minCost = Math.min(...active.map(c => c.cost));
    const raw = active.map(c => c.weight * Math.exp(-lambda * Math.log(c.cost / minCost)));
    const total = raw.reduce((a, b) => a + b, 0);
    const want = active.map((c, i) => (remaining * raw[i] / total) / c.twhPerGW);
    const over = active.filter((c, i) => want[i] > c.capGW);
    if (over.length === 0) {
      active.forEach((c, i) => credit(c, want[i]));
      remaining = 0;
      break;
    }
    for (const c of over) {
      credit(c, c.capGW);
      remaining -= c.capGW * c.twhPerGW;
    }
    active = active.filter(c => !over.includes(c));
  }
  return { gw, idleGW, requirementTWh: Math.max(0, requirementTWh), unmetTWh: Math.max(0, remaining) };
}

/**
 * Get regional max growth rate (with regional override)
 */
function getRegionalMaxGrowth(
  params: EnergyParams,
  region: Region,
  source: EnergySource
): number {
  // Check for regional override
  const regionalGrowth = params.regional[region].maxGrowthRate?.[source];
  if (regionalGrowth !== undefined) return regionalGrowth;

  // Use global default
  return params.maxGrowthRate[source];
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const energyModule: Module<
  EnergyParams,
  EnergyState,
  EnergyInputs,
  EnergyOutputs
> = defineModule<EnergyParams, EnergyState, EnergyInputs, EnergyOutputs>({
  name: 'energy',
  description: 'Regional capacity with global learning curves',

  defaults: energyDefaults,

  paramMeta: {
    carbonPrice: {
      description: 'Economy-wide carbon price: demand-side fuel costs, and every region\'s power-sector price unless that region has its own (usCarbonPrice, chinaCarbonPrice, ...; an explicit regional price wins). Unset, regions keep their observed 2025 prices.',
      unit: '$/ton CO₂',
      range: { min: 0, max: 300, default: 35 },
      tier: 1 as const,
    },
    cleanShareFlex: {
      description: 'Endogenous energy-capex share: fraction of unmet desired clean build the investment share expands to cover, competing for the investment pool. 0 = exogenous 15%→30% ramp only (calibrated baseline). Expanded spend is debited from general capital formation via the lagged energyCapexSpend ledger (crowding-out is real). Used by the ai-energy-boom scenario.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0 },
      tier: 1 as const,
    },
    cleanShareMax: {
      description: 'Ceiling on the share of total investment that energy capex may claim when cleanShareFlex > 0.',
      unit: 'fraction',
      range: { min: 0.05, max: 0.9, default: 0.30 },
      tier: 1 as const,
    },
    sources: {
      solar: {
        alpha: {
          paramName: 'solarAlpha',
          description: "Wright's Law learning exponent for solar. 0.36 means 22% cost reduction per capacity doubling.",
          unit: 'dimensionless',
          range: { min: 0.1, max: 0.5, default: 0.36 },
          tier: 1 as const,
        },
      },
      wind: {
        alpha: {
          paramName: 'windAlpha',
          description: "Wright's Law learning exponent for wind. Lower than solar due to mature technology.",
          unit: 'dimensionless',
          range: { min: 0.1, max: 0.4, default: 0.23 },
          tier: 1 as const,
        },
      },
      battery: {
        alpha: {
          paramName: 'batteryAlpha',
          description: "Wright's Law learning exponent for battery storage.",
          unit: 'dimensionless',
          range: { min: 0.1, max: 0.4, default: 0.26 },
          tier: 1 as const,
        },
      },
    },
    newBuildLogitExponent: {
      description: 'Cost sensitivity of the new-build mix (logit exponent on delivered cost). Higher: the cheapest source takes more of each year\'s new build.',
      unit: 'dimensionless',
      range: { min: 1, max: 12, default: 6 },
      tier: 1 as const,
    },
    projectEquityShare: {
      description: 'Equity share of energy project finance. Equity is priced off the return on capital, debt off the safe rate, so a higher share passes capital scarcity into WACC.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.30 },
      tier: 2 as const,
    },
    riskPremium: {
      description: 'Project premium over the debt/equity rate blend for energy WACC. Higher values penalize capital-intensive sources.',
      unit: 'fraction',
      range: { min: 0, max: 0.15, default: 0.052 },
      tier: 1 as const,
    },
    baseWACC: {
      description: 'Baseline WACC at which LCOEs are calibrated. No LCOE adjustment when effective WACC equals this.',
      unit: 'fraction',
      range: { min: 0.03, max: 0.15, default: 0.07 },
      tier: 1 as const,
    },
    minWACC: {
      description: 'Floor on effective WACC. Prevents unrealistically cheap financing.',
      unit: 'fraction',
      range: { min: 0.01, max: 0.10, default: 0.03 },
      tier: 1 as const,
    },
    financingSpreadScale: {
      description: 'Multiplier on regional financing spreads over the global rate. 0 = frictionless global capital market, 1 = observed spreads, >1 = fragmentation.',
      unit: 'dimensionless',
      range: { min: 0, max: 3, default: 1.0 },
      tier: 1 as const,
    },
    financingHomeBias: {
      description: 'Fraction of the change since the start year in a region\'s savings-rate gap vs the world that passes into its financing spread. 0 = perfect capital mobility (Feldstein-Horioka home bias).',
      unit: 'dimensionless',
      range: { min: 0, max: 1, default: 0.15 },
      tier: 2 as const,
    },
    regional: {
      us: {
        carbonPrice: {
          paramName: 'usCarbonPrice',
          description: 'Carbon price for the United States (RGGI/California/Washington plus IRA implicit credits; see REGIONAL_CARBON_PRICES).',
          unit: '$/ton CO₂',
          range: { min: 0, max: 300, default: 20 },
          tier: 1 as const,
        },
      },
      'oecd-ex-us': {
        carbonPrice: {
          paramName: 'oecdExUsCarbonPrice',
          description: 'Carbon price for the OECD ex-US region (EU ETS-dominated electricity-weighted blend; see REGIONAL_CARBON_PRICES).',
          unit: '$/ton CO₂',
          range: { min: 0, max: 300, default: 65 },
          tier: 1 as const,
        },
      },
      china: {
        carbonPrice: {
          paramName: 'chinaCarbonPrice',
          description: 'Carbon price for China (nascent national ETS).',
          unit: '$/ton CO₂',
          range: { min: 0, max: 300, default: 15 },
          tier: 1 as const,
        },
      },
      india: {
        carbonPrice: {
          paramName: 'indiaCarbonPrice',
          description: 'Carbon price for India + South Asia. Limited carbon pricing.',
          unit: '$/ton CO₂',
          range: { min: 0, max: 300, default: 5 },
          tier: 1 as const,
        },
      },
    },
  },

  connectorTypes: {
    inputs: {
      electricityDemand: unitPort('TWh/year'),
      regionalElectricityDemand: unitPort('TWh/year', 'record'),
      regionalInvestment: unitPort('$T/year', 'record'),
      mineralConstraintBySource: unitPort('fraction', 'record'),
      laggedRegionalCurtailmentRate: unitPort('fraction', 'record'),
      laggedRegionalShortfallRate: unitPort('fraction', 'record'),
      laggedRegionalGeneration: unitPort('TWh/year', 'nested-record'),
      fuels: unitPort('TWh/year', 'record'),
      laggedSafeRate: unitPort('fraction'),
      laggedInterestRate: unitPort('fraction'),
      savingsRate: unitPort('fraction'),
      regionalSavings: unitPort('fraction', 'record'),
    },
    outputs: {
      lcoes: ENERGY_LCOE_PORT,
      regionalLCOEs: REGIONAL_ENERGY_LCOE_PORT,
      netEnergyFraction: unitPort('fraction', 'record'),
      solarPlusBatteryLCOE: unitPort('$/MWh'),
      capacities: ENERGY_CAPACITY_PORT,
      energyCapexSpend: unitPort('$T/year'),
      regionalCapacities: REGIONAL_ENERGY_CAPACITY_PORT,
      regionalStandbyCapacity: unitPort('GW', 'nested-record'),
      cumulativeCapacity: ENERGY_CAPACITY_PORT,
      additions: ENERGY_ADDITION_PORT,
      regionalAdditions: REGIONAL_ENERGY_ADDITION_PORT,
      batteryCost: unitPort('$/kWh'),
      cheapestLCOE: unitPort('$/MWh'),
      regionalEffectiveSolarCF: unitPort('fraction', 'record'),
      regionalEffectiveWindCF: unitPort('fraction', 'record'),
      effectiveSolarCF: unitPort('fraction'),
      effectiveWindCF: unitPort('fraction'),
      longStorageCost: unitPort('$/kWh'),
      longStorageCapacity: unitPort('GWh'),
      longStorageRegional: unitPort('GWh', 'record'),
      effectiveWACC: unitPort('fraction'),
      regionalWACC: unitPort('fraction', 'record'),
      regionalFossilRunningCost: unitPort('$/MWh', 'nested-record'),
    },
  },

  validate(params: Partial<EnergyParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = {
      ...energyDefaults,
      ...params,
      eroi: { ...energyDefaults.eroi, ...(params.eroi ?? {}) },
      eroiReferenceCF: { ...energyDefaults.eroiReferenceCF, ...(params.eroiReferenceCF ?? {}) },
      lifetime: { ...energyDefaults.lifetime, ...(params.lifetime ?? {}) },
      openingFleetGrowth: { ...energyDefaults.openingFleetGrowth, ...(params.openingFleetGrowth ?? {}) },
    };

    // Validate regional carbon prices
    if (p.regional) {
      for (const region of REGIONS) {
        const rp = p.regional[region];
        if (rp && rp.carbonPrice < 0) {
          errors.push(`regional.${region}.carbonPrice cannot be negative`);
        }
        if (rp && rp.carbonPrice > 500) {
          warnings.push(`regional.${region}.carbonPrice ${rp.carbonPrice} unusually high`);
        }
        for (const [source, m] of Object.entries(rp?.costMultiplier ?? {})) {
          if (!(m! > 0)) errors.push(`regional.${region}.costMultiplier.${source} must be positive`);
        }
        for (const [source, c] of Object.entries(rp?.fossilRunningCost ?? {})) {
          if (!(c! >= 0)) errors.push(`regional.${region}.fossilRunningCost.${source} cannot be negative`);
        }
        const fa = rp?.firmAdequacy;
        if (fa) {
          if (fa.source !== 'coal' && fa.source !== 'gas') errors.push(`regional.${region}.firmAdequacy.source must be coal or gas`);
          if (!(fa.share >= 0 && fa.share <= 2)) errors.push(`regional.${region}.firmAdequacy.share must be in [0, 2]`);
        }
      }
    }

    for (const f of ['gas', 'coal'] as const) {
      const eff = params.fossilPowerEfficiency?.[f];
      if (eff !== undefined && !(eff > 0 && eff <= 1)) {
        errors.push(`fossilPowerEfficiency.${f} must be in (0, 1]`);
      }
    }

    // Legacy: validate global carbonPrice
    if (p.carbonPrice < 0) {
      errors.push('carbonPrice cannot be negative');
    }
    if (p.carbonPrice > 500) {
      warnings.push(`carbonPrice ${p.carbonPrice} unusually high`);
    }

    // Endogenous capex share
    if (p.cleanShareFlex < 0 || p.cleanShareFlex > 1) {
      errors.push('cleanShareFlex must be between 0 and 1');
    }
    if (p.cleanShareMax < 0.05 || p.cleanShareMax > 0.9) {
      errors.push('cleanShareMax must be between 0.05 and 0.9');
    }
    if (p.cleanShareFlex > 0 &&
        p.cleanShareMax < p.cleanEnergyShare2025 + p.cleanEnergyShareGrowth) {
      warnings.push('cleanShareMax below the exogenous ramp endpoint — flex will never expand the budget');
    }

    for (const source of ENERGY_SOURCES) {
      const s = p.sources[source];
      if (s.alpha < 0 || s.alpha > 1) {
        errors.push(`sources.${source}.alpha must be 0-1`);
      }
      if (s.cost0 < 0) {
        errors.push(`sources.${source}.cost0 cannot be negative`);
      }
      const lifetime = p.lifetime[source];
      if (!Number.isInteger(lifetime) || lifetime < 1) {
        errors.push(`lifetime.${source} must be an integer number of years >= 1`);
      }
      const g = p.openingFleetGrowth[source];
      if (!Number.isFinite(g) || g <= -1 || g > 2) {
        errors.push(`openingFleetGrowth.${source} must be in (-1, 2]`);
      }
      const eroi = p.eroi[source];
      if (eroi !== undefined && eroi <= 1) {
        errors.push(`eroi.${source} must be > 1`);
      }
    }
    for (const source of ['solar', 'wind'] as const) {
      const cf = p.eroiReferenceCF[source];
      // No real PV or wind fleet sits below CF 0.05; the floor also keeps the
      // dynamic-EROI ratio from exploding.
      if (!Number.isFinite(cf) || cf < 0.05 || cf > 1) {
        errors.push(`eroiReferenceCF.${source} must be between 0.05 and 1`);
      }
    }

    // Curtailment feedback
    if (p.newBuildLogitExponent !== undefined && !(p.newBuildLogitExponent > 0)) {
      errors.push('newBuildLogitExponent must be positive');
    }
    if (p.newBuildShareWeight) {
      for (const [k, v] of Object.entries(p.newBuildShareWeight)) {
        if (!(v as number >= 0)) errors.push(`newBuildShareWeight.${k} must be non-negative`);
      }
    }
    for (const [region, g] of Object.entries(p.electricityDemandGrowth2025 ?? {})) {
      if (!(g >= -0.1 && g <= 0.2)) errors.push(`electricityDemandGrowth2025.${region} must be between -10% and 20%`);
    }
    if (p.buildCapacity2025) {
      for (const [k, v] of Object.entries(p.buildCapacity2025)) {
        if (!(v as number > 0)) errors.push(`buildCapacity2025.${k} must be positive`);
      }
    }
    if (p.buildCapacityDepreciation !== undefined &&
        (p.buildCapacityDepreciation < 0 || p.buildCapacityDepreciation >= 1)) {
      errors.push('buildCapacityDepreciation must be in [0, 1)');
    }
    if (p.fossilDisplacementRate !== undefined && (p.fossilDisplacementRate < 0 || p.fossilDisplacementRate > 1)) {
      errors.push('fossilDisplacementRate must be in [0, 1]');
    }
    // Battery LCOS
    if (p.batteryCyclesPerYear !== undefined && p.batteryCyclesPerYear <= 0) {
      errors.push('batteryCyclesPerYear must be positive');
    }
    if (p.batteryLifetimeYears !== undefined && p.batteryLifetimeYears <= 0) {
      errors.push('batteryLifetimeYears must be positive');
    }
    // WACC
    if (p.riskPremium !== undefined && p.riskPremium < 0) {
      errors.push('riskPremium cannot be negative');
    }
    if (p.projectEquityShare !== undefined && (p.projectEquityShare < 0 || p.projectEquityShare > 1)) {
      errors.push('projectEquityShare must be between 0 and 1');
    }
    if (p.baseWACC !== undefined && p.baseWACC <= 0) {
      errors.push('baseWACC must be positive');
    }
    if (p.minWACC !== undefined && p.minWACC < 0) {
      errors.push('minWACC cannot be negative');
    }
    if (p.financingSpreadScale !== undefined &&
        (!Number.isFinite(p.financingSpreadScale) || p.financingSpreadScale < 0 || p.financingSpreadScale > 3)) {
      errors.push('financingSpreadScale must be between 0 and 3');
    }
    if (p.financingHomeBias !== undefined &&
        (!Number.isFinite(p.financingHomeBias) || p.financingHomeBias < 0 || p.financingHomeBias > 1)) {
      errors.push('financingHomeBias must be between 0 and 1');
    }
    if (p.regional) {
      for (const region of REGIONS) {
        const spread = p.regional[region]?.financingSpread;
        if (spread !== undefined && (!Number.isFinite(spread) || spread < -0.05 || spread > 0.20)) {
          errors.push(`financingSpread for ${region} must be between -0.05 and 0.20`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<EnergyParams>): EnergyParams {
    return validatedMerge('energy', this.validate, (p) => {
      const result = { ...energyDefaults, ...p };

      // Deep merge sources
      if (p.sources) {
        result.sources = { ...energyDefaults.sources };
        for (const source of ENERGY_SOURCES) {
          if (p.sources[source]) {
            result.sources[source] = {
              ...energyDefaults.sources[source],
              ...p.sources[source],
            };
            // Deep merge regional capacity2025
            if (p.sources[source].capacity2025) {
              result.sources[source].capacity2025 = {
                ...energyDefaults.sources[source].capacity2025,
                ...p.sources[source].capacity2025,
              };
            }
          }
        }
      }

      // Deep merge regional params
      if (p.regional) {
        result.regional = { ...energyDefaults.regional };
        for (const region of REGIONS) {
          if (p.regional[region]) {
            result.regional[region] = {
              ...energyDefaults.regional[region],
              ...p.regional[region],
            };
            for (const key of ['costMultiplier', 'fossilRunningCost', 'firmAdequacy'] as const) {
              if (p.regional[region][key]) {
                (result.regional[region] as any)[key] = {
                  ...(energyDefaults.regional[region][key] ?? {}),
                  ...p.regional[region][key],
                };
              }
            }
            if (p.regional[region].maxGrowthRate) {
              result.regional[region].maxGrowthRate = {
                ...energyDefaults.regional[region].maxGrowthRate,
                ...p.regional[region].maxGrowthRate,
              };
            }
            if (p.regional[region].capacityFactor) {
              result.regional[region].capacityFactor = {
                ...energyDefaults.regional[region].capacityFactor,
                ...p.regional[region].capacityFactor,
              };
            }
          }
        }
      }

      // A set global carbonPrice is economy-wide: fill it into every region
      // without its own explicit carbonPrice (see EnergyParams.carbonPrice).
      // Copies each touched region, so energyDefaults is never mutated.
      if (p.carbonPrice !== undefined) {
        if (!p.regional) result.regional = { ...energyDefaults.regional };
        for (const region of REGIONS) {
          if (p.regional?.[region]?.carbonPrice === undefined) {
            result.regional[region] = { ...result.regional[region], carbonPrice: p.carbonPrice };
          }
        }
      }

      // Deep merge other records
      if (p.buildCapacity2025) {
        result.buildCapacity2025 = { ...energyDefaults.buildCapacity2025, ...p.buildCapacity2025 };
      }
      if (p.fossilPowerEfficiency) {
        result.fossilPowerEfficiency = { ...energyDefaults.fossilPowerEfficiency, ...p.fossilPowerEfficiency };
      }
      if (p.fossilRunningCost) {
        result.fossilRunningCost = { ...energyDefaults.fossilRunningCost, ...p.fossilRunningCost };
      }
      if (p.electricityDemandGrowth2025) {
        result.electricityDemandGrowth2025 = { ...energyDefaults.electricityDemandGrowth2025, ...p.electricityDemandGrowth2025 };
      }
      if (p.newBuildShareWeight) {
        result.newBuildShareWeight = { ...energyDefaults.newBuildShareWeight, ...p.newBuildShareWeight };
      }
      if (p.maxGrowthRate) {
        result.maxGrowthRate = { ...energyDefaults.maxGrowthRate, ...p.maxGrowthRate };
      }
      if (p.openingFleetGrowth) {
        result.openingFleetGrowth = { ...energyDefaults.openingFleetGrowth, ...p.openingFleetGrowth };
      }
      if (p.lifetime) {
        result.lifetime = { ...energyDefaults.lifetime, ...p.lifetime };
      }
      if (p.capex) {
        result.capex = { ...energyDefaults.capex, ...p.capex };
      }
      if (p.eroi) {
        result.eroi = { ...energyDefaults.eroi, ...p.eroi };
      }
      if (p.eroiReferenceCF) {
        result.eroiReferenceCF = { ...energyDefaults.eroiReferenceCF, ...p.eroiReferenceCF };
      }
      if (p.capacityCeiling) {
        result.capacityCeiling = { ...energyDefaults.capacityCeiling, ...p.capacityCeiling };
      }
      if (p.capitalIntensity) {
        result.capitalIntensity = { ...energyDefaults.capitalIntensity, ...p.capitalIntensity };
      }
      if (p.longStorage) {
        result.longStorage = { ...energyDefaults.longStorage, ...p.longStorage };
        if (p.longStorage.capacity2025) {
          result.longStorage.capacity2025 = { ...energyDefaults.longStorage.capacity2025, ...p.longStorage.capacity2025 };
        }
      }
      if (p.siteDepletion) {
        result.siteDepletion = { ...energyDefaults.siteDepletion, ...p.siteDepletion };
        if (p.siteDepletion.solarPotential) {
          result.siteDepletion.solarPotential = { ...energyDefaults.siteDepletion.solarPotential, ...p.siteDepletion.solarPotential };
        }
        if (p.siteDepletion.windPotential) {
          result.siteDepletion.windPotential = { ...energyDefaults.siteDepletion.windPotential, ...p.siteDepletion.windPotential };
        }
      }

      return result;
    }, partial);
  },

  init(params: EnergyParams): EnergyState {
    // Initialize regional capacity state
    const regional: Record<Region, Record<EnergySource, RegionalCapacityState>> = {} as any;
    for (const region of REGIONS) {
      regional[region] = {} as any;
      for (const source of ENERGY_SOURCES) {
        const cap2025 = params.sources[source].capacity2025[region];
        regional[region][source] = {
          installed: cap2025,
          additions: [],
          initialCapacity: cap2025,
          vintages: createVintageStock({
            unit: source === 'battery' ? 'GWh' : 'GW',
            initialStock: cap2025,
            serviceLifeSteps: params.lifetime[source],
            initialRetirementProfile: 'growth',
            initialGrowthRate: params.openingFleetGrowth[source],
            idPrefix: `${region}-${source}-opening`,
          }),
        };
      }
    }

    // Initialize global learning state
    const global: Record<EnergySource, GlobalLearningState> = {} as any;
    for (const source of ENERGY_SOURCES) {
      const globalCumulative = getGlobalCumulative2025(params, source);
      global[source] = {
        cumulative: globalCumulative,
        extracted: 0,
      };
    }

    // Initialize long-duration storage
    const longStorageRegional: Record<Region, number> = {} as any;
    let longStorageCumulative = 0;
    for (const region of REGIONS) {
      const cap = params.longStorage.capacity2025[region] ?? 0;
      longStorageRegional[region] = cap;
      longStorageCumulative += cap;
    }

    const savingsGapAnchor = Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>;
    return {
      regional, global, longStorageRegional, longStorageCumulative, savingsGapAnchor,
      buildCapacity: { ...params.buildCapacity2025 },
      // Set from the 2025 fleet on the first step
      fleetDemandRatio: Object.fromEntries(REGIONS.map(r => [r, 1])) as Record<Region, number>,
      firmDemandRatio: Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>,
      fossilRunRatio: Object.fromEntries(REGIONS.map(r => [r, { coal: 1, gas: 1 }])) as Record<Region, Record<'coal' | 'gas', number>>,
      standbyAdditions: Object.fromEntries(REGIONS.map(r => [r, [] as number[]])) as Record<Region, number[]>,
    };
  },

  step(state, inputs, params, year, yearIndex) {
    const { electricityDemand, regionalInvestment } = inputs;

    // Distribute demand to regions if not provided
    const regionalDemand = inputs.regionalElectricityDemand ?? distributeByGDP(electricityDemand);

    // Output accumulators
    const lcoes: Record<EnergySource, number> = {} as any;
    const netEnergyFraction: Record<EnergySource, number> = {} as any;
    const globalCapacities: Record<EnergySource, number> = {} as any;
    const globalAdditions: Record<EnergySource, number> = {} as any;
    const cumulativeCapacity: Record<EnergySource, number> = {} as any;

    const regionalCapacities: Record<Region, Record<EnergySource, number>> = {} as any;
    const regionalAdditions: Record<Region, Record<EnergySource, number>> = {} as any;

    // New state
    const newRegional: Record<Region, Record<EnergySource, RegionalCapacityState>> = {} as any;
    const newGlobal: Record<EnergySource, GlobalLearningState> = {} as any;

    // Initialize outputs
    for (const source of ENERGY_SOURCES) {
      globalCapacities[source] = 0;
      globalAdditions[source] = 0;
    }
    for (const region of REGIONS) {
      regionalCapacities[region] = {} as any;
      regionalAdditions[region] = {} as any;
      newRegional[region] = {} as any;
    }

    // =========================================================================
    // Calculate GLOBAL LCOEs (Wright's Law on global cumulative)
    // =========================================================================

    for (const source of ENERGY_SOURCES) {
      const s = params.sources[source];
      const globalState = state.global[source];
      const prevCumulative = globalState.cumulative;
      const globalCumulative2025 = getGlobalCumulative2025(params, source);

      let lcoe: number;
      if (s.alpha > 0) {
        // Learning curve (solar, wind, battery) - GLOBAL cumulative
        // Wright's Law applies only to hardware portion; soft costs are irreducible
        const ratio = prevCumulative / globalCumulative2025;
        const hardwareCost = s.cost0 - s.softFloor;
        lcoe = hardwareCost * Math.pow(Math.max(1, ratio), -s.alpha) + s.softFloor;
        const eroi = params.eroi[source];
        netEnergyFraction[source] = eroi > 1 ? 1 - 1 / eroi : 0;
      } else if (s.eroei0 !== undefined && s.recoverableResources !== undefined) {
        // Fossil fuel with depletion - GLOBAL extraction against the
        // remaining recoverable resource
        const dep = depletion(s.recoverableResources, globalState.extracted, s.eroei0);
        const baseCost = s.cost0 / dep.netEnergyFraction;
        // Note: carbon cost added regionally below
        lcoe = baseCost;
        netEnergyFraction[source] = dep.netEnergyFraction;
      } else {
        // Fixed cost (nuclear, hydro)
        lcoe = s.cost0;
        const eroi = params.eroi[source];
        netEnergyFraction[source] = eroi > 1 ? 1 - 1 / eroi : 0;
      }

      lcoes[source] = lcoe;
    }

    // =========================================================================
    // WACC adjustment: financing cost affects capital-intensive sources more
    // =========================================================================

    const laggedSafeRate = inputs.laggedSafeRate ?? 0.01;
    const laggedEquityRate = inputs.laggedInterestRate ?? laggedSafeRate;
    const baseFinancingRate =
      (1 - params.projectEquityShare) * laggedSafeRate
      + params.projectEquityShare * laggedEquityRate;
    const waccAt = (spread: number): number =>
      Math.max(params.minWACC, baseFinancingRate + params.riskPremium + spread);
    const effectiveWACC = waccAt(0);

    // Capital recovery factor: CRF(r, n) = r / (1 - (1+r)^(-n))
    const PROJECT_LIFE = 25; // years, generic generation asset
    const crfBase = capitalRecoveryFactor(params.baseWACC, PROJECT_LIFE);

    // Adjust LCOE for the capital-intensity-weighted portion only, so soft
    // floor bounds are respected. The CRF ratio depends only on the WACC, so
    // callers precompute it once per WACC (global, then per region below).
    const waccAdjustedLCOE = (baseLCOE: number, source: EnergySource, crfRatio: number): number => {
      const ci = params.capitalIntensity[source] ?? 0;
      const capitalPortion = baseLCOE * ci;
      const nonCapitalPortion = baseLCOE * (1 - ci);
      return capitalPortion * crfRatio + nonCapitalPortion;
    };

    // Pre-adjustment LCOEs are the basis for the regional adjustment.
    const preWaccLcoes = { ...lcoes };
    const crfGlobalRatio =
      capitalRecoveryFactor(effectiveWACC, PROJECT_LIFE) / crfBase;
    for (const source of ENERGY_SOURCES) {
      // Battery is an up-front energy-capacity cost ($/kWh), not a generator
      // LCOE. Financing enters when that cost is converted to LCOS below.
      lcoes[source] = source === 'battery'
        ? preWaccLcoes[source]
        : waccAdjustedLCOE(preWaccLcoes[source], source, crfGlobalRatio);
    }

    // Regional financing spreads over the global rate: the observed start-year
    // total (IEA Cost of Capital Observatory; Steffen 2020) plus a home-bias
    // drift — regions whose domestic savings become scarcer relative to the
    // world pool than they were at the start pay more for capital
    // (Feldstein & Horioka 1980). The start-year gap is anchored in state.
    const regionalWACC = {} as Record<Region, number>;
    const regionalCrfRatio = {} as Record<Region, number>;
    const savingsGap = (region: Region): number => {
      const regionalRate = inputs.regionalSavings?.[region];
      return inputs.savingsRate !== undefined && regionalRate !== undefined
        ? inputs.savingsRate - regionalRate
        : 0;
    };
    const savingsGapAnchor = yearIndex === 0
      ? Object.fromEntries(REGIONS.map(r => [r, savingsGap(r)])) as Record<Region, number>
      : state.savingsGapAnchor;
    for (const region of REGIONS) {
      const spread = ((params.regional[region].financingSpread ?? 0) +
        params.financingHomeBias * (savingsGap(region) - savingsGapAnchor[region])) * params.financingSpreadScale;
      regionalWACC[region] = waccAt(spread);
      regionalCrfRatio[region] =
        capitalRecoveryFactor(regionalWACC[region], PROJECT_LIFE) / crfBase;
    }

    // =========================================================================
    // Process each region independently
    // =========================================================================

    // CAPEX learning factor (global - declines 2%/year for solar/wind/battery)
    const capexLearningFactor = Math.pow(1 - params.capexLearningRate, yearIndex);
    const effectiveCapex: Record<EnergySource, number> = {} as any;
    for (const source of ENERGY_SOURCES) {
      let capex = params.capex[source];
      if (source === 'solar' || source === 'wind' || source === 'battery') {
        capex *= capexLearningFactor;
      }
      effectiveCapex[source] = capex;
    }

    let realizedCapexB = 0; // $B, summed across regions
    const regionalLCOEs = {} as Record<Region, Record<EnergySource, number>>;

    // Regional costs (financing, carbon, site quality), computed before the
    // build plan because the plan needs every region's solar demand at once
    const regionCosts = (region: Region) => {
      const regionParams = params.regional[region];
        // Regional effective LCOE (regional financing cost + carbon cost + site quality)
        const regionalLCOE: Record<EnergySource, number> = {} as any;
        for (const source of ENERGY_SOURCES) {
          let lcoe = source === 'battery'
            ? preWaccLcoes[source]
            : waccAdjustedLCOE(preWaccLcoes[source], source, regionalCrfRatio[region]);
          lcoe *= regionParams.costMultiplier?.[source] ?? 1;
          // Add regional carbon cost for fossil fuels
          if (source === 'gas' || source === 'coal') {
            const fuel = regionParams.fossilRunningCost?.[source];
            if (fuel !== undefined) {
              lcoe += (fuel - params.fossilRunningCost[source]) / Math.max(0.05, netEnergyFraction[source]);
            }
            const carbonCost = (params.sources[source].carbonIntensity * regionParams.carbonPrice) / 1000;
            lcoe += carbonCost;
          }
          // Adjust for site quality degradation: worse CF → higher effective LCOE
          // A site with half the reference CF costs twice as much per MWh
          const refCF = params.sources[source].referenceCF;
          if (refCF > 0) {
            const regionState = state.regional[region][source];
            const effectiveCF = getRegionalCapacityFactor(params, region, source, regionState.installed);
            lcoe *= refCF / effectiveCF;
          }
          regionalLCOE[source] = lcoe;
        }
        regionalLCOEs[region] = regionalLCOE;
        const regionalBatteryLCOS = levelizedStorageCostPerMWh(
          regionalLCOE.battery,
          regionalWACC[region],
          params.batteryLifetimeYears,
          params.batteryCyclesPerYear,
        );
        const regionalSolarPlusBatteryLCOE =
          regionalLCOE.solar / params.batteryEfficiency + regionalBatteryLCOS;

        // Find cheapest LCOE from each side for bilateral competitiveness
        const cheapestFossilLCOE = Math.min(regionalLCOE.gas, regionalLCOE.coal);
        const cheapestCleanLCOE = Math.min(
          regionalLCOE.solar, regionalLCOE.wind,
          regionalLCOE.nuclear, regionalLCOE.hydro
        );
      return { regionalLCOE, regionalBatteryLCOS, regionalSolarPlusBatteryLCOE, cheapestFossilLCOE };
    };
    const costsByRegion = Object.fromEntries(REGIONS.map(r => [r, regionCosts(r)])) as
      Record<Region, ReturnType<typeof regionCosts>>;

    // =========================================================================
    // Demand-led new build (see EnergyParams.newBuildLogitExponent):
    // requirement = generation demand cannot get from the surviving fleet,
    // shared among generators by a logit on delivered cost, with the global
    // solar build capacity as the only solar ceiling besides the resource one
    // =========================================================================
    const surviving = {} as Record<Region, Record<GeneratorSource, number>>;
    for (const region of REGIONS) {
      surviving[region] = {} as Record<GeneratorSource, number>;
      for (const source of GENERATORS) {
        // Pure: the stock left after this year's scheduled retirements
        surviving[region][source] = advanceVintageStock(state.regional[region][source].vintages, {
          step: yearIndex,
          additions: 0,
          serviceLifeSteps: params.lifetime[source],
        }).closingStock;
      }
    }

    const CLEAN: GeneratorSource[] = ['solar', 'wind', 'nuclear', 'hydro'];
    const FIRM: GeneratorSource[] = ['coal', 'gas', 'nuclear', 'hydro'];
    const fleetDemandRatio = { ...state.fleetDemandRatio };
    const firmDemandRatio = { ...state.firmDemandRatio };
    const fossilRunRatio = { ...state.fossilRunRatio };
    // Standby stock still in service at the end of this year, by region
    const standbyStock = Object.fromEntries(REGIONS.map((r) => {
      const source = params.regional[r].firmAdequacy?.source ?? 'coal';
      const hist = state.standbyAdditions[r];
      const live = hist.slice(Math.max(0, hist.length - params.lifetime[source] + 1));
      return [r, live.reduce((a, b) => a + b, 0)];
    })) as Record<Region, number>;

    // capGW[s]: this region's ceiling from global build capacity (Infinity
    // on the first pass)
    const planNewBuild = (region: Region, buildCapGW: Record<GeneratorSource, number>): NewBuildAllocation => {
      const { regionalLCOE, regionalSolarPlusBatteryLCOE } = costsByRegion[region];
      const regionParams = params.regional[region];
      // Generation basis dispatch will request (delivered demand x grid
      // losses/own use)
      const regionDemand = regionalDemand[region] * params.gridLossFactor;
      const curt = Math.min(0.9, Math.max(0, inputs.laggedRegionalCurtailmentRate?.[region] ?? 0));

      // Energy fleet: standby (adequacy) capacity is held for security, not
      // counted as energy supply
      const standbySource = regionParams.firmAdequacy?.source;
      const energyGW = (stock: number, source: GeneratorSource) =>
        source === standbySource ? Math.max(0, stock - standbyStock[region]) : stock;

      // VRE share of the previous fleet's generation (standby excluded):
      // marginal solar increasingly needs storage
      let prevVREGen = 0;
      let prevTotalGen = 0;
      for (const source of GENERATORS) {
        const prevCap = state.regional[region][source].installed;
        const gen = (energyGW(prevCap, source) * getRegionalCapacityFactor(params, region, source, prevCap) * 8760) / 1000;
        prevTotalGen += gen;
        if (source === 'solar' || source === 'wind') prevVREGen += gen;
      }
      const vreShare = prevTotalGen > 0 ? prevVREGen / prevTotalGen : 0;

      const candidates: NewBuildCandidate[] = GENERATORS.map((source) => {
        const prevInstalled = state.regional[region][source].installed;
        const cf = getRegionalCapacityFactor(params, region, source, prevInstalled);
        const isVRE = source === 'solar' || source === 'wind';
        // TWh a GW delivers: curtailed VRE output is not delivered
        const twhPerGW = (cf * 8760) / 1000 * (isVRE ? 1 - curt : 1);
        const baseCost = source === 'solar'
          ? (1 - vreShare) * regionalLCOE.solar + vreShare * regionalSolarPlusBatteryLCOE
          : regionalLCOE[source];
        const cost = isVRE ? baseCost / (1 - curt) : baseCost;

        // Resource / penetration ceiling (capacityCeiling share of demand),
        // then the region's slice of world build capacity
        const maxUsefulCapacity = (regionDemand * params.capacityCeiling[source] * 1000) / (cf * 8760);
        let capGW = Math.min(Math.max(0, maxUsefulCapacity - surviving[region][source]), buildCapGW[source]);
        // Regional policy override: build growth on last year's build
        const buildGrowth = regionParams.maxGrowthRate?.[source];
        if (buildGrowth !== undefined) {
          const prevBuild = state.regional[region][source].additions.at(-1)
            ?? (source === 'solar' ? REGIONAL_SOLAR_ADDITIONS_2024[region] : undefined);
          if (prevBuild !== undefined) capGW = Math.min(capGW, prevBuild * (1 + buildGrowth));
        }
        return { source, cost, weight: params.newBuildShareWeight[source], twhPerGW, capGW };
      });
      const bySource = Object.fromEntries(candidates.map(c => [c.source, c])) as Record<GeneratorSource, NewBuildCandidate>;

      // Fossil plants count at what they actually ran last year, not at
      // nameplate output: once clean power has pushed coal down to a ~10%
      // capacity factor, counting it at 60% told the build that idle coal
      // already covered demand growth, too little clean was built, and
      // dispatch ran the idle coal back up (net-zero coal 2.3k -> 7.9k TWh,
      // 2044-49). Standby generation is in last year's coal output, so this
      // slightly understates idle coal in firm-adequacy regions.
      //
      // Measured against the region's 2025 utilization, not nameplate: the
      // anchor fleet already ran below the nameplate capacity factor, and
      // fleetDemandRatio is anchored on nameplate, so 2025 has no idle
      // capacity by construction (measured against nameplate, ~3,000 TWh
      // of 2025 fossil read as idle and the world solar build hit its 1,130
      // GW factory cap in year one).
      //
      // The ratio may exceed 1 where dispatch ran the fleet past energy's
      // table capacity factor: dispatch runs coal to 0.60 against the 0.50
      // here, so coal in China, India, SE Asia, SSA, and OECD-ex-US ran
      // 1.15-1.25x the table in 2025. Such a fleet counts at its 2025 duty, nameplate x
      // ratio, in the anchor and in existing supply. Clamped at 1, coal
      // falling back toward the table still read as fully used, never idle,
      // so the no-new-coal-while-idle rule did not fire and new coal took a
      // logit share of every year's requirement (SSA 1,710 GW, India 1,650
      // GW, SE Asia 2,280 GW of coal by 2100, against ~55-270 GW in 2025).
      // Dispatch's availability headroom also runs thermal past the table
      // where a region has nothing else to run (LatAm coal 0.80, India coal
      // 0.61 in 2025): counted at the table, those regions anchored below
      // their own demand (India 0.88, LatAm 0.94) and covered it only by
      // running thermal ever harder as clean took a growing share.
      const laggedGen = inputs.laggedRegionalGeneration?.[region];
      const nameplateTWh = (s: GeneratorSource) => energyGW(surviving[region][s], s) * bySource[s].twhPerGW;
      if (yearIndex === 0) {
        const runRatio = (f: 'coal' | 'gas') => {
          const nameplate = nameplateTWh(f);
          const ran = laggedGen?.[f];
          if (ran === undefined || nameplate <= 0) return 1;
          // A plant cannot run more than every hour of the year
          const physicalMax = (energyGW(surviving[region][f], f) * 8760) / 1000;
          return Math.min(Math.max(0, ran), physicalMax) / nameplate;
        };
        fossilRunRatio[region] = { coal: runRatio('coal'), gas: runRatio('gas') };
      }
      const dutyMultiplier = (s: GeneratorSource) =>
        (s === 'coal' || s === 'gas' ? Math.max(1, fossilRunRatio[region][s]) : 1);
      // What the fleet delivers when it runs as it did in 2025
      const dutyTWh = (s: GeneratorSource) => nameplateTWh(s) * dutyMultiplier(s);

      // Anchor: the end-2024 fleet was built for 2024 demand
      const installedTWh = candidates.reduce(
        (sum, c) => sum + state.regional[region][c.source].installed * c.twhPerGW * dutyMultiplier(c.source), 0);
      if (yearIndex === 0) {
        fleetDemandRatio[region] = regionDemand > 0
          ? installedTWh / (regionDemand / (1 + params.electricityDemandGrowth2025[region]))
          : 1;
      }
      const ranTWh = (s: GeneratorSource) => {
        const duty = dutyTWh(s);
        if (s !== 'coal' && s !== 'gas') return duty;
        const ran = laggedGen?.[s];
        const ratio = Math.min(1, fossilRunRatio[region][s]);
        return ran === undefined || ratio <= 0 ? duty : Math.min(duty, Math.max(0, ran) / ratio);
      };
      const existingTWh = candidates.reduce((sum, c) => sum + ranTWh(c.source), 0);
      // Demand growth + retirements, at the region's own fleet-to-demand
      // ratio, plus whatever dispatch left unserved last year
      const shortfallTWh = Math.max(0, inputs.laggedRegionalShortfallRate?.[region] ?? 0) * regionDemand;
      const requirementTWh = Math.max(0, regionDemand * fleetDemandRatio[region] - existingTWh) + shortfallTWh;

      // Running cost of an existing fossil plant: fuel + VOM grossed up for
      // the fuel chain's own energy use, plus the carbon price
      const runningCost = (f: 'gas' | 'coal') =>
        (regionParams.fossilRunningCost?.[f] ?? params.fossilRunningCost[f]) / Math.max(0.05, netEnergyFraction[f])
        + (params.sources[f].carbonIntensity * regionParams.carbonPrice) / 1000;
      // Idle fossil output competes with new build at running cost, since its
      // capital is sunk: re-running idle coal beats building new coal, and
      // beats new solar unless carbon is priced. Same non-cost weight as the
      // fuel's new build.
      const idleCandidates: NewBuildCandidate[] = (['gas', 'coal'] as const).map((f) => ({
        ...bySource[f],
        cost: runningCost(f),
        capGW: bySource[f].twhPerGW > 0 ? (dutyTWh(f) - ranTWh(f)) / bySource[f].twhPerGW : 0,
        idle: true,
      }));
      // No new plant of a fuel while that fuel's existing plants sit idle:
      // the logit would otherwise still hand new coal a share of a
      // requirement that idle coal could serve with no capital at all
      const hasIdle = (s: GeneratorSource) => idleCandidates.some(c => c.source === s && c.capGW > 1e-9);
      const buildCandidates = candidates.map(c => (hasIdle(c.source) ? { ...c, capGW: 0 } : c));
      const base = allocateNewBuild(requirementTWh, [...buildCandidates, ...idleCandidates], params.newBuildLogitExponent);

      // Economic replacement of fossil output, shared among clean sources
      // only, with whatever build room the base allocation left. Only output
      // the plants actually produce can be displaced.
      const cheapestClean = Math.min(...CLEAN.map(s => bySource[s].capGW > base.gw[s] ? bySource[s].cost : Infinity));
      let displacementTWh = 0;
      for (const f of ['gas', 'coal'] as const) {
        const cost = runningCost(f);
        const advantage = Number.isFinite(cheapestClean)
          ? Math.min(1, Math.max(0, (cost - cheapestClean) / cost))
          : 0;
        displacementTWh += params.fossilDisplacementRate * advantage * ranTWh(f);
      }
      let plan: NewBuildAllocation = base;
      if (displacementTWh > 0) {
        const cleanRoom = CLEAN.map(s => ({ ...bySource[s], capGW: Math.max(0, bySource[s].capGW - base.gw[s]) }));
        const extra = allocateNewBuild(displacementTWh, cleanRoom, params.newBuildLogitExponent);
        const gw = { ...base.gw };
        for (const s of CLEAN) gw[s] += extra.gw[s];
        plan = {
          gw,
          idleGW: base.idleGW,
          requirementTWh: requirementTWh + displacementTWh,
          unmetTWh: base.unmetTWh + extra.unmetTWh,
        };
      }

      // Firm-capacity adequacy: standby build for whatever dispatchable
      // capacity (incl. storage at rated power) falls short of the anchored
      // ratio to average demand
      const adequacy = regionParams.firmAdequacy;
      if (!adequacy) return plan;
      const avgDemandGW = regionDemand / 8.76;
      const batteryGW = state.regional[region].battery.installed / params.batteryDuration;
      if (yearIndex === 0) {
        const firm0 = FIRM.reduce((sum, s) => sum + state.regional[region][s].installed, 0) + batteryGW;
        firmDemandRatio[region] = avgDemandGW > 0
          ? firm0 / (avgDemandGW / (1 + params.electricityDemandGrowth2025[region]))
          : 0;
      }
      const firmGW = FIRM.reduce((sum, s) => sum + surviving[region][s] + plan.gw[s], 0) + batteryGW;
      const gap = adequacy.share * firmDemandRatio[region] * avgDemandGW - firmGW;
      const room = Math.max(0, bySource[adequacy.source].capGW - plan.gw[adequacy.source]);
      const standbyGW = Math.min(room, Math.max(0, gap));
      if (standbyGW <= 0) return plan;
      return { ...plan, gw: { ...plan.gw, [adequacy.source]: plan.gw[adequacy.source] + standbyGW }, standbyGW };
    };

    // World build capacity binds by source: plan unconstrained, then tighten
    // the over-subscribed sources' regional slices pro rata and re-plan (the
    // freed requirement goes to other sources) until none is over capacity.
    const buildCapacity = state.buildCapacity;
    const noCap = Object.fromEntries(GENERATORS.map(s => [s, Infinity])) as Record<GeneratorSource, number>;
    const regionCaps = Object.fromEntries(REGIONS.map(r => [r, { ...noCap }])) as Record<Region, Record<GeneratorSource, number>>;
    let plans = Object.fromEntries(REGIONS.map(r => [r, planNewBuild(r, regionCaps[r])])) as Record<Region, NewBuildAllocation>;
    const worldBuild = (ps: Record<Region, NewBuildAllocation>, s: GeneratorSource) =>
      REGIONS.reduce((sum, r) => sum + ps[r].gw[s], 0);
    // Demand for build capacity: the unconstrained first pass
    const buildDemand = Object.fromEntries(GENERATORS.map(s => [s, worldBuild(plans, s)])) as Record<GeneratorSource, number>;
    for (let iter = 0; iter < 12; iter++) {
      let tightened = false;
      for (const s of GENERATORS) {
        const total = worldBuild(plans, s);
        if (total > buildCapacity[s] * (1 + 1e-9)) {
          const scale = buildCapacity[s] / total;
          for (const r of REGIONS) regionCaps[r][s] = plans[r].gw[s] * scale;
          tightened = true;
        }
      }
      if (!tightened) break;
      plans = Object.fromEntries(REGIONS.map(r => [r, planNewBuild(r, regionCaps[r])])) as Record<Region, NewBuildAllocation>;
    }
    // Build capacity expands toward demand at most maxGrowthRate a year;
    // idle capacity depreciates, but not below what was demanded
    const nextBuildCapacity = Object.fromEntries(GENERATORS.map(s => [s, Math.min(
      buildCapacity[s] * (1 + params.maxGrowthRate[s]),
      Math.max(buildDemand[s], buildCapacity[s] * (1 - params.buildCapacityDepreciation)),
    )])) as Record<GeneratorSource, number>;

    for (const region of REGIONS) {
      const regionInvestment = regionalInvestment[region];
      const { regionalLCOE, regionalBatteryLCOS, regionalSolarPlusBatteryLCOE, cheapestFossilLCOE } =
        costsByRegion[region];
      regionalLCOEs[region] = regionalLCOE;

      // Clean energy share grows over time (e.g., 15% → 30% over 25 years)
      const cleanShare = params.cleanEnergyShare2025 +
        params.cleanEnergyShareGrowth * Math.min(1, yearIndex / 25);

      // Regional clean energy budget ($B); may expand below if cleanShareFlex > 0
      let cleanBudget = regionInvestment * cleanShare * 1000;

      // Desired additions: generators from the demand-led plan, storage
      // sized to the solar fleet
      const desiredAdditions: Record<EnergySource, number> = {} as any;
      for (const source of GENERATORS) desiredAdditions[source] = plans[region].gw[source];
      {
        const regionState = state.regional[region].battery;
        const prevInstalled = regionState.installed;
        const maxUsefulCapacity = state.regional[region].solar.installed * params.batteryDuration;
        let targetAddition: number;
        const MIN_CAPACITY_GROWTH = 0.01;
        {
          const solarGW = state.regional[region].solar.installed;
          const solarAdditions = desiredAdditions.solar ?? 0;
          const futureSolarGW = solarGW + solarAdditions;
          // Curtailment feedback: boost battery target when curtailment is high
          const curtRate = inputs.laggedRegionalCurtailmentRate?.[region] ?? 0;
          const storagePressure = 1 + params.curtailmentStorageBoost * curtRate;
          const targetBatteryGWh = futureSolarGW * params.batteryDuration * storagePressure;
          const batteryGap = Math.max(0, targetBatteryGWh - prevInstalled);

          // Keep the calibrated firmed-solar adoption threshold separate
          // from budget ranking. Both sides here are $/MWh; the actual LCOS
          // conversion below fixes the distinct $/kWh-vs-$/MWh sorting bug.
          const CALIBRATED_FIRMED_SOLAR_MARKUP = 1.5;
          const firmedSolarAdoptionProxy =
            regionalLCOE.solar * CALIBRATED_FIRMED_SOLAR_MARKUP;
          const isCompetitive =
            firmedSolarAdoptionProxy <=
            cheapestFossilLCOE * params.competitiveThreshold;

          if (isCompetitive && batteryGap > 0) {
            targetAddition = batteryGap * params.demandFillRate;
          } else {
            targetAddition = prevInstalled * MIN_CAPACITY_GROWTH;
          }
        }
        const growthCapped = prevInstalled * getRegionalMaxGrowth(params, region, 'battery');
        const ceilingRoom = Math.max(0, maxUsefulCapacity - prevInstalled);
        desiredAdditions.battery = Math.min(Math.max(0, targetAddition), growthCapped, ceilingRoom);
      }

      // Apply investment constraint (LCOE priority)
      // System LCOE: blend solar with solarPlusBattery based on VRE penetration.
      // At high VRE share, marginal solar needs storage — use blended cost for ranking.
      let prevVREGen = 0;
      let prevTotalGen = 0;
      for (const source of ENERGY_SOURCES) {
        if (source === 'battery') continue;
        const regionState = state.regional[region][source];
        const prevCap = regionState.installed;
        const sourceCF = getRegionalCapacityFactor(params, region, source, prevCap);
        const gen = (prevCap * sourceCF * 8760) / 1000;
        prevTotalGen += gen;
        if (source === 'solar' || source === 'wind') prevVREGen += gen;
      }
      const regionVREShare = prevTotalGen > 0 ? prevVREGen / prevTotalGen : 0;

      // Effective solar LCOE for investment ranking: blends bare solar with solar+battery
      const effectiveSolarLCOE = (1 - regionVREShare) * regionalLCOE.solar + regionVREShare * regionalSolarPlusBatteryLCOE;

      const rankingLCOE: Record<EnergySource, number> = { ...regionalLCOE };
      rankingLCOE.solar = effectiveSolarLCOE;
      rankingLCOE.battery = regionalBatteryLCOS;

      const cleanSources: EnergySource[] = ['solar', 'wind', 'battery', 'nuclear', 'hydro'];
      cleanSources.sort((a, b) => rankingLCOE[a] - rankingLCOE[b]);

      // Per-source desired spend ($B) — same cost formula as the funding
      // loop below and the realized-capex accumulation (funded x capex)
      const desiredCost: Record<EnergySource, number> = {} as any;
      for (const source of cleanSources) {
        desiredCost[source] = (desiredAdditions[source] * effectiveCapex[source]) / 1000;
      }

      // Endogenous capex share: when desired build exceeds the ramp budget,
      // energy investment competes for more of the investment pool — the share
      // expands to cover cleanShareFlex of the unmet spend, capped at
      // cleanShareMax of regional investment. flex = 0 (default) preserves
      // the exogenous ramp exactly. Expanded spend IS debited from general
      // capital formation via the lagged energyCapexSpend ledger (crowding-
      // out is real). NB: in practice the diffusion/penetration ceilings
      // usually bind before this budget does, so flex rarely changes the
      // build — see the ai-energy-boom scenario notes.
      if (params.cleanShareFlex > 0) {
        const totalDesiredCost = cleanSources.reduce((s, src) => s + desiredCost[src], 0);
        if (totalDesiredCost > cleanBudget) {
          const maxBudget = regionInvestment * params.cleanShareMax * 1000;
          cleanBudget = Math.min(
            maxBudget,
            cleanBudget + params.cleanShareFlex * (totalDesiredCost - cleanBudget)
          );
        }
      }

      let remainingBudget = cleanBudget;
      const fundedAdditions: Record<EnergySource, number> = {} as any;

      for (const source of cleanSources) {
        const cost = desiredCost[source];

        if (cost <= remainingBudget) {
          fundedAdditions[source] = desiredAdditions[source];
          remainingBudget -= cost;
        } else {
          const affordable = (remainingBudget / effectiveCapex[source]) * 1000;
          fundedAdditions[source] = affordable;
          remainingBudget = 0;
        }
      }

      fundedAdditions.gas = desiredAdditions.gas ?? 0;
      fundedAdditions.coal = desiredAdditions.coal ?? 0;

      // Apply mineral supply constraint: scale each source by the scarcity of
      // the minerals IT uses, so a lithium shortage cannot throttle nuclear.
      // Sources that consume no minerals carry 1.0, so this needs no list of
      // which ones are mineral-intensive.
      for (const source of ENERGY_SOURCES) {
        fundedAdditions[source] *= inputs.mineralConstraintBySource[source];
      }

      // Realized capex this region actually spends ($B): ALL sources —
      // fossil and storage additions cost capital too, not only the
      // clean-budget sources
      for (const source of ENERGY_SOURCES) {
        realizedCapexB += (fundedAdditions[source] * effectiveCapex[source]) / 1000;
      }

      // Calculate retirements and update regional state
      for (const source of ENERGY_SOURCES) {
        const regionState = state.regional[region][source];
        const addition = fundedAdditions[source];
        const lifetime = params.lifetime[source];
        const vintage = advanceVintageStock(regionState.vintages, {
          step: yearIndex,
          additions: addition,
          serviceLifeSteps: lifetime,
          cohortId: `${region}-${source}-${year}`,
        });
        const newInstalled = vintage.closingStock;

        newRegional[region][source] = {
          installed: newInstalled,
          additions: [...regionState.additions, addition],
          initialCapacity: regionState.initialCapacity,
          vintages: vintage.state,
        };

        regionalCapacities[region][source] = newInstalled;
        regionalAdditions[region][source] = addition;

        // Accumulate global totals
        globalCapacities[source] += newInstalled;
        globalAdditions[source] += addition;
      }
    }

    // =========================================================================
    // Compute capacity-weighted effective CFs and update dynamic EROI
    // =========================================================================

    const regionalEffectiveSolarCF = {} as Record<Region, number>;
    const regionalEffectiveWindCF = {} as Record<Region, number>;
    let effectiveSolarCF = 0;
    let effectiveWindCF = 0;
    let totalSolarCap = 0;
    let totalWindCap = 0;
    const { solar: refSolarCF, wind: refWindCF } = params.eroiReferenceCF;

    for (const region of REGIONS) {
      const solarCap = newRegional[region].solar.installed;
      const windCap = newRegional[region].wind.installed;
      const solarCF = getRegionalCapacityFactor(params, region, 'solar', solarCap);
      const windCF = getRegionalCapacityFactor(params, region, 'wind', windCap);
      regionalEffectiveSolarCF[region] = solarCF;
      regionalEffectiveWindCF[region] = windCF;
      effectiveSolarCF += solarCF * solarCap;
      effectiveWindCF += windCF * windCap;
      totalSolarCap += solarCap;
      totalWindCap += windCap;
    }
    effectiveSolarCF = totalSolarCap > 0 ? effectiveSolarCF / totalSolarCap : refSolarCF;
    effectiveWindCF = totalWindCap > 0 ? effectiveWindCF / totalWindCap : refWindCF;

    // Update net energy fraction for solar/wind using dynamic EROI
    // effectiveEROI = eroi × (fleet CF / eroiReferenceCF)
    const dynamicSolarEROI = params.eroi.solar * (effectiveSolarCF / refSolarCF);
    const dynamicWindEROI = params.eroi.wind * (effectiveWindCF / refWindCF);
    netEnergyFraction.solar = dynamicSolarEROI > 1 ? 1 - 1 / dynamicSolarEROI : 0;
    netEnergyFraction.wind = dynamicWindEROI > 1 ? 1 - 1 / dynamicWindEROI : 0;

    // =========================================================================
    // Update global learning state
    // =========================================================================

    for (const source of ENERGY_SOURCES) {
      const s = params.sources[source];
      const prevCumulative = state.global[source].cumulative;
      const newCumulative = prevCumulative + globalAdditions[source];

      let extracted = state.global[source].extracted;
      let fuelUseAnchor = state.global[source].fuelUseAnchor;
      if (s.recoverableResources !== undefined && (source === 'gas' || source === 'coal')) {
        // Extraction is world fuel burned, indexed to its first measured
        // year and scaled so that year books one year of 2025 production
        // (the unit the budget is sized in; provenance at
        // FOSSIL_RESOURCES_2025). Fuel burned = last year's dispatched
        // generation / fleet efficiency + this year's non-electric use.
        // Nameplate overstated it: the power fleet stood in for the whole
        // fuel, so a fleet that grew 10x booked 10x world gas output while
        // end-use gas grew ~1.5x and idle plant booked as if it ran; the
        // budget was spent ~1.7x too fast in high-gas scenarios. EROEI
        // decline with fraction remaining follows the net-energy literature
        // (Murphy & Hall 2010; Delannoy et al. 2021; Brockway et al. 2019);
        // the sqrt exponent in primitives/math.ts depletion() is a
        // stylized midpoint.
        let globalInstalled = 0;
        let powerGen: number | undefined = 0;
        for (const region of REGIONS) {
          globalInstalled += state.regional[region][source].installed;
          const gen = inputs.laggedRegionalGeneration?.[region]?.[source];
          powerGen = gen === undefined || powerGen === undefined ? undefined : powerGen + Math.max(0, gen);
        }
        const nonElectric = inputs.fuels?.[source];
        const fuelUse = powerGen === undefined || nonElectric === undefined
          ? undefined
          : powerGen / params.fossilPowerEfficiency[source] + Math.max(0, nonElectric);
        if (fuelUseAnchor === undefined && fuelUse !== undefined && fuelUse > 0) {
          fuelUseAnchor = fuelUse;
        }
        let annual2025 = 0;
        for (const region of REGIONS) annual2025 += s.capacity2025[region] * 0.01;
        extracted += fuelUse !== undefined && fuelUseAnchor !== undefined
          ? annual2025 * (fuelUse / fuelUseAnchor)
          : globalInstalled * 0.01;
      }

      newGlobal[source] = {
        cumulative: newCumulative,
        extracted,
        ...(fuelUseAnchor !== undefined ? { fuelUseAnchor } : {}),
      };

      cumulativeCapacity[source] = newCumulative;
    }

    // =========================================================================
    // Calculate battery cost and solar+battery LCOE
    // =========================================================================

    const globalCumulativeBattery2025 = getGlobalCumulative2025(params, 'battery');
    const batteryRatio = state.global.battery.cumulative / globalCumulativeBattery2025;
    const batteryHardware = params.sources.battery.cost0 - params.sources.battery.softFloor;
    const batteryCost = batteryHardware *
      Math.pow(Math.max(1, batteryRatio), -params.sources.battery.alpha) +
      params.sources.battery.softFloor;

    // LCOS: annualize battery capex ($/kWh × 1000 = $/MWh of capacity) with
    // the capital recovery factor over the battery's life, then spread over
    // annual cycles. Uses the same effective WACC as every other source's
    // capital cost, so storage responds to interest rates consistently
    // (~$42/MWh at 7% WACC vs ~$26 straight-line).
    const batteryLCOEContribution = levelizedStorageCostPerMWh(
      batteryCost,
      effectiveWACC,
      params.batteryLifetimeYears,
      params.batteryCyclesPerYear,
    );
    const solarPlusBatteryLCOE =
      lcoes.solar / params.batteryEfficiency + batteryLCOEContribution;

    // =========================================================================
    // Long-duration storage (parallel track, not an EnergySource)
    // =========================================================================

    const longStorageInit = getGlobalLongStorageCumulative2025(params);
    const longStoragePrevCum = state.longStorageCumulative;
    const longStorageRatio = longStoragePrevCum / Math.max(1, longStorageInit);
    const longStorageCost = params.longStorage.cost0 *
      Math.pow(Math.max(1, longStorageRatio), -params.longStorage.alpha);

    // Size long storage to system needs: ramps when VRE > 50%
    const totalVRECap = globalCapacities.solar + globalCapacities.wind;
    const totalCap = ENERGY_SOURCES.reduce((s, src) => src === 'battery' ? s : s + globalCapacities[src], 0);
    const vreShare = totalCap > 0 ? totalVRECap / totalCap : 0;
    // Target fraction ramps 0 at VRE<50% to 0.3 at VRE>80%
    const longStorageFraction = Math.max(0, Math.min(0.3, (vreShare - 0.5) / 0.3 * 0.3));

    const newLongStorageRegional: Record<Region, number> = {} as any;
    let longStorageTotal = 0;
    let longStorageCumulativeNew = longStoragePrevCum;

    for (const region of REGIONS) {
      const prevCap = state.longStorageRegional[region] ?? 0;
      const regionDemandTWh = regionalDemand[region];
      const PEAK_TO_AVERAGE = 2;
      const peakGW = (regionDemandTWh * 1000) / 8760 * PEAK_TO_AVERAGE;
      const targetGWh = peakGW * longStorageFraction * params.longStorage.duration;
      const gap = Math.max(0, targetGWh - prevCap);
      const maxAdd = prevCap * params.longStorage.growthRate;
      const addition = Math.min(gap * 0.2, maxAdd + 1); // +1 GWh min to bootstrap

      const newCap = prevCap + addition;
      newLongStorageRegional[region] = newCap;
      longStorageTotal += newCap;
      longStorageCumulativeNew += addition;
    }

    // Find cheapest LCOE ($/MWh)
    // Note: lcoes.battery is $/kWh (storage cost), not $/MWh like generation sources.
    // Skip battery here; its contribution is captured via solarPlusBatteryLCOE.
    let cheapestLCOE = Infinity;
    for (const source of ENERGY_SOURCES) {
      if (source === 'battery') continue;
      if (lcoes[source] < cheapestLCOE) {
        cheapestLCOE = lcoes[source];
      }
    }
    if (solarPlusBatteryLCOE < cheapestLCOE) {
      cheapestLCOE = solarPlusBatteryLCOE;
    }

    return {
      state: {
        regional: newRegional,
        global: newGlobal,
        longStorageRegional: newLongStorageRegional,
        longStorageCumulative: longStorageCumulativeNew,
        savingsGapAnchor,
        buildCapacity: nextBuildCapacity,
        fleetDemandRatio,
        firmDemandRatio,
        fossilRunRatio,
        standbyAdditions: Object.fromEntries(REGIONS.map(r => [r, [...state.standbyAdditions[r], plans[r].standbyGW ?? 0]])) as Record<Region, number[]>,
      },
      outputs: {
        lcoes,
        regionalLCOEs,
        netEnergyFraction,
        solarPlusBatteryLCOE,
        energyCapexSpend: realizedCapexB / 1000, // $T realized (all sources)
        capacities: globalCapacities,
        regionalCapacities,
        regionalStandbyCapacity: Object.fromEntries(REGIONS.map((r) => {
          const source = params.regional[r].firmAdequacy?.source;
          const standby = { coal: 0, gas: 0 };
          if (source) {
            standby[source] = Math.min(regionalCapacities[r][source],
              standbyStock[r] + (plans[r].standbyGW ?? 0));
          }
          return [r, standby];
        })) as Record<Region, Record<'coal' | 'gas', number>>,
        cumulativeCapacity,
        additions: globalAdditions,
        regionalAdditions,
        batteryCost,
        cheapestLCOE,
        regionalEffectiveSolarCF,
        regionalEffectiveWindCF,
        effectiveSolarCF,
        effectiveWindCF,
        longStorageCost,
        longStorageCapacity: longStorageTotal,
        longStorageRegional: newLongStorageRegional,
        effectiveWACC,
        regionalWACC,
        regionalFossilRunningCost: Object.fromEntries(REGIONS.map((region) => [region, {
          gas: params.regional[region].fossilRunningCost?.gas ?? params.fossilRunningCost.gas,
          coal: params.regional[region].fossilRunningCost?.coal ?? params.fossilRunningCost.coal,
        }])) as Record<Region, Record<'gas' | 'coal', number>>,
      },
    };
  },
});

// =============================================================================
// HELPER: Distribute value by GDP share (fallback when regional not provided)
// =============================================================================
