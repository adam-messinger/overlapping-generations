/**
 * Production Module
 *
 * Biophysical production function where GDP emerges from energy, capital, and labor.
 * Based on Ayres-Warr (2009) finding that useful energy is the dominant growth driver.
 *
 * Core equation (normalized Cobb-Douglas):
 *   GDP = Y₀ × (K/K₀)^α × (L/L₀)^β × (E/E₀)^γ × efficiency × (1 - damages)
 *
 * Efficiency replaces exogenous TFP with two physical factors:
 *   1. End-use efficiency: compound growth coupled to demand's autonomous intensity decline, capped at η_max
 *   2. Organizational efficiency (education-driven, diminishing returns)
 *
 * Ayres-Warr elasticities:
 *   α = 0.25 (capital)
 *   β = 0.15 (labor)
 *   γ = 0.55 (useful energy)
 *
 * All inputs are lagged (from previous year), so production runs early in the
 * step order (after demographics). This breaks the GDP→demand→dispatch→energy→GDP
 * cycle cleanly.
 *
 * Sources:
 * - Ayres & Warr (2009): The Economic Growth Engine
 * - Kümmel et al. (2010): LINEX production function
 * - Santos et al. (2018): Exergy economics survey
 * - Brockway et al. (2018): Exergy-GDP relationship
 */

import { defineModule, Module, ValidationResult, validatedMerge } from 'tsimulation';
import { compound } from '../primitives/math.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface ProductionParams {
  alpha: number;              // Capital elasticity (0.25)
  beta: number;               // Labor elasticity (0.15)
  gamma: number;              // Useful energy elasticity (0.55)
  initialGDP: number;         // $T (2025 global GDP)
  electricExergy: number;     // Exergy factor for electricity (0.95)
  thermalExergy: number;      // Exergy factor for direct fuel use (0.35)
  foodStressElasticity: number; // GDP reduction per unit food stress (0.3)

  // End-use (second-law) efficiency: single coupled series with demand's
  // autonomous intensity decline (two views of one physical process)
  endUseEfficiency0: number;        // η₀: second-law efficiency at run start (0.23)
  endUseEfficiencyMax: number;      // η_max: thermodynamic ceiling (0.60)
  serviceEfficiencyGrowth: number;  // η growth rate/yr = GDP-weighted demand intensityDecline (0.0129)

  // Organizational efficiency (education-driven)
  orgEfficiencySensitivity: number;    // φ: sensitivity to college share gain (0.35)
  orgEfficiencyMaxCollegeGain: number; // max college share improvement (0.40)

  // Automation payoff: robots/AI augment effective labor — the only channel
  // by which automation affects output (its electricity is subtracted from
  // E as intermediate consumption).
  robotLaborEquivalent: number;     // worker-equivalents per robot (Acemoglu & Restrepo 2020 find 1 robot displaces ~3-6 workers; output equivalent lower)
  aiWorkerEquivalentPerTWh: number; // worker-equivalents per TWh/yr of datacenter compute
}

export const productionDefaults: ProductionParams = {
  alpha: 0.25,
  beta: 0.15,
  gamma: 0.55,
  initialGDP: 158,            // $158T PPP (2025 global GDP, 2017 intl $)
  electricExergy: 0.95,       // Electricity is nearly pure useful work
  thermalExergy: 0.35,        // Thermal fuels ~35% exergy efficiency
  foodStressElasticity: 0.3,  // 30% GDP hit at full food stress
  // Effective service-efficiency index: growth coupled to the demand
  // module's autonomous intensity decline (one parameter, two views; the
  // pin in simulation.test.ts asserts this default equals demand's
  // gdpWeightedIntensityDecline()). METHODOLOGY NOTE (calibration review):
  // this 1.29%/yr BUNDLES two service-preserving components — measured
  // device (second-law) efficiency, ~0.85-0.9%/yr in the CL-PFU database
  // (Brockway group: world 15% in 1971 -> 23% in 2020), plus
  // value-preserving structural change (~0.4%/yr residual: sectoral shift
  // produces the same GDP from fewer energy services). eta here is
  // therefore an effective index, not the measured second-law efficiency;
  // that 0.15 x 1.0129^35 = 0.235 lands on Brockway's measured 2020s level
  // is a consistency check on the bundle (the structural component roughly
  // offsets starting from 1990's measured ~0.18 rather than 0.15), not an
  // identity.
  endUseEfficiency0: 0.23,          // effective index 2025; numerically in Brockway et al.'s measured ~0.20-0.25 band (see methodology note above)
  endUseEfficiencyMax: 0.60,        // practical thermodynamic potential, Cullen & Allwood (2010) — strictly applies to the device component; structural change is not thermodynamically capped, so the ceiling is conservative for the bundled index
  serviceEfficiencyGrowth: 0.0129,  // GDP-weighted average of demand regional intensityDecline defaults (IEA Energy Efficiency 2024 history)
  orgEfficiencySensitivity: 0.35,
  orgEfficiencyMaxCollegeGain: 0.40,
  robotLaborEquivalent: 2,      // worker-equivalents per robot: Acemoglu & Restrepo (2020) find 1 robot displaces ~3-6 workers; 2 is a conservative output-equivalent. This is now the ONLY channel robots affect output (their energy is subtracted from E).
  aiWorkerEquivalentPerTWh: 0,  // no literature referent for an output equivalent; datacenter services' value is embedded in the measured GDP of the sectors buying them, so 0 is the conservative default — the ai-energy-boom scenario explores >0
};

// =============================================================================
// STATE
// =============================================================================

export interface ProductionState {
  initialCapital: number;       // K₀, captured in year 0
  initialLabor: number;         // L₀, captured in year 0
  initialUsefulEnergy: number;  // E₀, captured in year 0
  initialCollegeShare: number;  // Captured in year 0
  initialDamageFactor: number;  // Combined damage factor at anchor, captured in year 0
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface ProductionInputs {
  /** Capital stock $T (from capital, lagged) */
  capitalStock: number;
  /** Effective workers (from demographics, current year) */
  effectiveWorkers: number;
  /** Total electricity generation TWh (from dispatch, lagged) */
  totalGeneration: number;
  /** Non-electric energy TWh (from demand, lagged) */
  nonElectricEnergy: number;
  /** Climate damage fraction 0-1 (from climate, lagged) */
  damages: number;
  /** Energy burden damage fraction 0-1 (from demand, lagged) */
  energyBurdenDamage: number;
  /** Food stress fraction 0-1 (from resources, lagged) */
  foodStress: number;
  /** Resource energy consumption TWh (from resources, lagged) */
  resourceEnergy: number;
  /** Energy system overhead TWh — embodied + operating (from energy, lagged) */
  energySystemOverhead: number;
  /** College share fraction (from demographics, current year) */
  collegeShare: number;
  /** CDR energy consumption TWh (from cdr, lagged) */
  cdrEnergy: number;
  /** Robots per 1000 workers (from demand, lagged); optional for standalone use */
  robotsPer1000?: number;
  /** Robot fleet electricity TWh (from demand, lagged); optional for standalone use */
  robotLoadTWh?: number;
  /** Datacenter compute load TWh (from demand, lagged); optional for standalone use */
  dataCenterLoadTWh?: number;
}

export interface ProductionOutputs {
  /** GDP from biophysical production function ($T) */
  gdp: number;
  /** Exergy-weighted useful energy (TWh) */
  productionUsefulEnergy: number;
  /** (K/K₀)^α */
  capitalContribution: number;
  /** (L/L₀)^β */
  laborContribution: number;
  /** (E/E₀)^γ */
  energyContribution: number;
  /** Combined efficiency multiplier (replaces TFP) */
  efficiencyLevel: number;
  /** End-use efficiency multiplier (η/η₀) */
  endUseEfficiency: number;
  /** Current second-law efficiency η(t) */
  eta: number;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const productionModule: Module<
  ProductionParams,
  ProductionState,
  ProductionInputs,
  ProductionOutputs
> = defineModule({
  name: 'production',
  description: 'Biophysical production function (Ayres-Warr): GDP from energy, capital, labor',

  defaults: productionDefaults,

  paramMeta: {
    alpha: {
      description: 'Capital elasticity in production function (Ayres-Warr). Traditional Solow uses ~0.33, biophysical model uses 0.25.',
      unit: 'fraction',
      range: { min: 0.10, max: 0.40, default: 0.25 },
      tier: 1 as const,
    },
    beta: {
      description: 'Labor elasticity in production function. Low because much "labor" growth is really energy-augmented.',
      unit: 'fraction',
      range: { min: 0.05, max: 0.30, default: 0.15 },
      tier: 1 as const,
    },
    gamma: {
      description: 'Useful energy elasticity. Ayres-Warr find ~0.5-0.6 for useful work (dominant growth driver); mainstream cost-share logic implies ~0.05-0.08. GDP levels are highly sensitive to this choice — see docs/SENSITIVITY.md.',
      unit: 'fraction',
      range: { min: 0.05, max: 0.70, default: 0.55 },
      tier: 1 as const,
    },
    robotLaborEquivalent: {
      description: 'Worker-equivalents each robot adds to effective labor — the ONLY channel robots affect output (their electricity is subtracted from productive useful energy as intermediate consumption). Default 2: Acemoglu & Restrepo (2020) find one industrial robot displaces ~3-6 workers; 2 is a conservative output-equivalent. 0 makes robots a pure parasitic load.',
      unit: 'worker-equivalents/robot',
      range: { min: 0, max: 20, default: 2 },
      tier: 1 as const,
    },
    aiWorkerEquivalentPerTWh: {
      description: 'Cognitive worker-equivalents per TWh/yr of datacenter compute added to effective labor. 0 = compute is a pure energy sink (calibrated baseline). Magnitude anchor: 1e5 means today\'s ~500 TWh of datacenter load augments ~50M workers (~1% of the global workforce) — the ai-energy-boom scenario value. 1e6 would mean today\'s compute already matches ~10% of the workforce.',
      unit: 'worker-equivalents/TWh',
      range: { min: 0, max: 1e7, default: 0 },
      tier: 1 as const,
    },
  },

  inputs: [
    'capitalStock',
    'effectiveWorkers',
    'totalGeneration',
    'nonElectricEnergy',
    'damages',
    'energyBurdenDamage',
    'foodStress',
    'resourceEnergy',
    'energySystemOverhead',
    'collegeShare',
    'cdrEnergy',
    'robotsPer1000',
    'robotLoadTWh',
    'dataCenterLoadTWh',
  ] as const,

  outputs: [
    'gdp',
    'productionUsefulEnergy',
    'capitalContribution',
    'laborContribution',
    'energyContribution',
    'efficiencyLevel',
    'endUseEfficiency',
    'eta',
  ] as const,

  validate(params: Partial<ProductionParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (params.alpha !== undefined && (params.alpha < 0 || params.alpha > 1)) {
      errors.push('alpha must be between 0 and 1');
    }
    if (params.beta !== undefined && (params.beta < 0 || params.beta > 1)) {
      errors.push('beta must be between 0 and 1');
    }
    if (params.gamma !== undefined && (params.gamma < 0 || params.gamma > 1)) {
      errors.push('gamma must be between 0 and 1');
    }
    if (params.alpha !== undefined && params.beta !== undefined && params.gamma !== undefined) {
      const sum = params.alpha + params.beta + params.gamma;
      if (sum > 1.1) {
        warnings.push(`α+β+γ = ${sum.toFixed(2)}, strongly increasing returns to scale`);
      }
    }
    if (params.initialGDP !== undefined && params.initialGDP <= 0) {
      errors.push('initialGDP must be positive');
    }
    if (params.endUseEfficiency0 !== undefined && params.endUseEfficiencyMax !== undefined) {
      if (params.endUseEfficiency0 >= params.endUseEfficiencyMax) {
        errors.push('endUseEfficiency0 must be less than endUseEfficiencyMax');
      }
    }
    if (params.serviceEfficiencyGrowth !== undefined &&
        (params.serviceEfficiencyGrowth < 0 || params.serviceEfficiencyGrowth > 0.04)) {
      errors.push('serviceEfficiencyGrowth must be between 0 and 4%/year');
    }
    if (params.serviceEfficiencyGrowth !== undefined && params.serviceEfficiencyGrowth > 0.02) {
      warnings.push('serviceEfficiencyGrowth > 2%/yr hits the eta ceiling mid-horizon (hard kink: efficiency growth stops while demand intensity keeps declining — the coupled series diverge from that year on)');
    }
    if (params.robotLaborEquivalent !== undefined &&
        (params.robotLaborEquivalent < 0 || params.robotLaborEquivalent > 20)) {
      errors.push('robotLaborEquivalent must be between 0 and 20 worker-equivalents per robot');
    }
    if (params.aiWorkerEquivalentPerTWh !== undefined &&
        (params.aiWorkerEquivalentPerTWh < 0 || params.aiWorkerEquivalentPerTWh > 1e7)) {
      errors.push('aiWorkerEquivalentPerTWh must be between 0 and 1e7 worker-equivalents per TWh');
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<ProductionParams>): ProductionParams {
    return validatedMerge('production', this.validate, (p) => ({
      ...productionDefaults,
      ...p,
    }), partial);
  },

  init(_params: ProductionParams): ProductionState {
    return {
      initialCapital: 0,
      initialLabor: 0,
      initialUsefulEnergy: 0,
      initialCollegeShare: 0,
      initialDamageFactor: 1,
    };
  },

  step(state, inputs, params, _year, yearIndex) {
    const {
      capitalStock,
      effectiveWorkers,
      totalGeneration,
      nonElectricEnergy,
      damages,
      energyBurdenDamage,
      foodStress,
      resourceEnergy,
      energySystemOverhead,
      collegeShare,
      cdrEnergy,
    } = inputs;

    // Compute useful energy from lagged supply (exergy-weighted)
    // Subtract energy consumed by the system itself (not available for productive GDP):
    //   - resourceEnergy: mining + farming operations
    //   - energySystemOverhead: embodied energy of new capacity + operating energy
    //   - cdrEnergy: carbon removal
    //   - robot/datacenter loads: automation is INTERMEDIATE consumption —
    //     its output enters solely through the labor-augmentation terms
    //     below. Counting its electricity in E as well was a
    //     perpetual-motion channel (any pure consumption load raised GDP
    //     through E^gamma) and, with the payoff on, double counting.
    const grossUsefulEnergy = totalGeneration * params.electricExergy
      + nonElectricEnergy * params.thermalExergy;
    // Assumption: overhead is roughly half electric (0.95) / half thermal
    // (0.35) exergy, giving ~0.65 — no direct source
    const OVERHEAD_EXERGY = 0.65;
    const automationEnergy = (inputs.robotLoadTWh ?? 0) + (inputs.dataCenterLoadTWh ?? 0);
    const systemOverhead = resourceEnergy * params.thermalExergy
      + energySystemOverhead * OVERHEAD_EXERGY
      + (cdrEnergy + automationEnergy) * params.electricExergy; // CDR + automation are purely electric
    const productionUsefulEnergy = Math.max(0, grossUsefulEnergy - systemOverhead);

    // Automation-augmented labor: robots add physical worker-equivalents,
    // datacenter compute adds cognitive worker-equivalents. The year-0
    // anchor captures the augmented value, so only relative growth in
    // automation moves GDP, not its 2025 level.
    const robotsPer1000 = inputs.robotsPer1000 ?? 0;
    const dataCenterLoadTWh = inputs.dataCenterLoadTWh ?? 0;
    const augmentedWorkers = effectiveWorkers
      * (1 + params.robotLaborEquivalent * robotsPer1000 / 1000)
      + params.aiWorkerEquivalentPerTWh * dataCenterLoadTWh;

    // Year 0: capture initial values for normalization
    let initialCapital = state.initialCapital;
    let initialLabor = state.initialLabor;
    let initialUsefulEnergy = state.initialUsefulEnergy;
    let initialCollegeShare = state.initialCollegeShare;

    if (yearIndex === 0) {
      initialCapital = capitalStock;
      initialLabor = augmentedWorkers;
      initialUsefulEnergy = productionUsefulEnergy;
      initialCollegeShare = collegeShare;
    }

    // Guard against zero division
    const safeK0 = initialCapital > 0 ? initialCapital : 1;
    const safeL0 = initialLabor > 0 ? initialLabor : 1;
    const safeE0 = initialUsefulEnergy > 0 ? initialUsefulEnergy : 1;

    // Production function components (normalized)
    const capitalContribution = Math.pow(capitalStock / safeK0, params.alpha);
    const laborContribution = Math.pow(augmentedWorkers / safeL0, params.beta);
    const energyContribution = Math.pow(Math.max(0.01, productionUsefulEnergy / safeE0), params.gamma);

    // =========================================================================
    // Endogenous efficiency (replaces exogenous TFP)
    // =========================================================================

    // 1. End-use efficiency: coupled to the demand module's autonomous
    //    intensity decline — the SAME physical improvements (motors, LEDs,
    //    heat pumps, industrial processes) that cut final energy per service
    //    on the demand side raise useful work per final energy here. Without
    //    this coupling, intensity decline was a pure GDP destroyer: demand
    //    removed the energy while production booked it as lost input
    //    (GDP ~ Intensity^1.2 through the gamma loop). Bounded by the
    //    thermodynamic ceiling; the assumed rate reproduces the measured
    //    world eta path 1990-2025 (0.15 -> ~0.235, De Stercke/Brockway).
    const eta = Math.min(
      params.endUseEfficiencyMax,
      compound(params.endUseEfficiency0, params.serviceEfficiencyGrowth, yearIndex)
    );
    const endUseEfficiency = eta / params.endUseEfficiency0;

    // 2. Organizational efficiency (education-driven, diminishing returns)
    //    Better-educated workforce coordinates more efficiently.
    //    Easy organizational improvements captured first → diminishing returns.
    const collegeDelta = Math.max(0, collegeShare - initialCollegeShare);
    const diminishing = Math.max(0, 1 - collegeDelta / params.orgEfficiencyMaxCollegeGain);
    const organizationalEfficiency = 1 + params.orgEfficiencySensitivity * collegeDelta * diminishing;

    // Combined efficiency level
    const efficiencyLevel = endUseEfficiency * organizationalEfficiency;

    // Damage factors, normalized to the anchor year like every other input:
    // observed 2025 GDP already includes 2025's prevailing damages, so only
    // CHANGES in damages relative to the anchor move GDP. (With bootstrapped
    // lags, year 0 sees real 2025 damages rather than zero.)
    const damageFactor = 1 - damages;
    const burdenFactor = 1 - energyBurdenDamage;
    const foodFactor = 1 - params.foodStressElasticity * Math.max(0, Math.min(1, foodStress));
    const combinedDamageFactor = damageFactor * burdenFactor * foodFactor;
    let initialDamageFactor = state.initialDamageFactor;
    if (yearIndex === 0) {
      initialDamageFactor = combinedDamageFactor > 0 ? combinedDamageFactor : 1;
    }
    const relativeDamageFactor = combinedDamageFactor / initialDamageFactor;

    // GDP = Y₀ × (K/K₀)^α × (L/L₀)^β × (E/E₀)^γ × efficiency × damage factors
    const gdp = params.initialGDP
      * capitalContribution
      * laborContribution
      * energyContribution
      * efficiencyLevel
      * relativeDamageFactor;

    return {
      state: {
        initialCapital,
        initialLabor,
        initialUsefulEnergy,
        initialCollegeShare,
        initialDamageFactor,
      },
      outputs: {
        gdp,
        productionUsefulEnergy,
        capitalContribution,
        laborContribution,
        energyContribution,
        efficiencyLevel,
        endUseEfficiency,
        eta,
      },
    };
  },
});
