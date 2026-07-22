/**
 * Climate Module
 *
 * Two-layer energy balance model (Geoffroy et al. 2013) with DICE-style damages.
 *
 * Surface + mixed ocean layer exchanges heat with deep ocean layer.
 * This captures both fast response (~4yr) and slow response (~200yr),
 * producing committed warming that persists decades after emissions stop.
 *
 * Equations:
 *   C₁ dT₁/dt = F(t) - λT₁ - γ(T₁ - T₂)   // surface + mixed ocean
 *   C₂ dT₂/dt = γ(T₁ - T₂)                   // deep ocean
 *
 * References:
 *   Geoffroy et al. (2013) J. Climate 26, 1841–1857
 *   Gregory (2004) J. Climate 17, 3325–3341
 *
 * Inputs (from other modules):
 * - emissions: Total Gt CO2/year (from dispatch + demand modules)
 *
 * Outputs (to other modules):
 * - temperature: °C above preindustrial (surface)
 * - co2ppm: Atmospheric CO2 concentration
 * - damages: Global damage fraction (0-0.50)
 * - regionalDamages: Per-region damage fractions
 * - deepOceanTemp: Deep ocean temperature anomaly
 * - radiativeForcing: Current radiative forcing (W/m²)
 */

import { defineModule, Module, ValidationResult, validatedMerge, unitConnector } from 'tsimulation';
import { Region, REGIONS } from '../domain-types.js';
import { lerp, quadraticDamage, smoothStep } from '../primitives/math.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface ClimateParams {
  // CO2 baseline
  preindustrialCO2: number;      // ppm (280)
  cumulativeCO2_2025: number;    // Gt cumulative since preindustrial

  // Carbon cycle
  airborneFraction: number;      // Fraction staying in atmosphere at the 2025 stock (see defaults)
  airborneFractionSlope: number; // Rise per 1000 Gt cumulative beyond 2025 (sink saturation)
  ppmPerGt: number;              // ppm per Gt in atmosphere (0.128)

  // Two-layer energy balance (Geoffroy et al. 2013)
  sensitivity: number;           // Equilibrium climate sensitivity, °C per CO2 doubling (3.0)
  upperHeatCapacity: number;     // C₁: surface + mixed ocean, W·yr·m⁻²·K⁻¹ (7.3)
  deepHeatCapacity: number;      // C₂: deep ocean, W·yr·m⁻²·K⁻¹ (106)
  heatExchange: number;          // γ: inter-layer heat exchange, W·m⁻²·K⁻¹ (0.73)
  forcingPerDoubling: number;    // F₂ₓ: radiative forcing per CO2 doubling, W/m² (3.7)
  warmingRate: number;           // Observed surface warming rate in 2025, °C/yr (0.02)
  currentTemp: number;           // °C above preindustrial in 2025 (1.45)

  // Damage function (DICE-2023/Howard-Sterner midpoint)
  damageCoeff: number;           // Quadratic coefficient (0.00536)
  maxDamage: number;             // Cap on damages (0.50)

  // Regional multipliers
  regionalDamage: Record<Region, number>;

  // Tipping points
  tippingThreshold: number;      // °C midpoint for tipping (2.0)
  tippingMultiplier: number;     // Max damage multiplier (1.5)
  tippingSteepness: number;      // S-curve steepness (4.0)

  // Adaptation
  adaptation: {
    adaptationRate: number;      // Damage reduction per log2 of GDP/cap ratio (0.10)
    referenceGDP: number;        // GDP/cap at which adaptation = 0 ($5000)
    maxAdaptation: number;       // Maximum adaptation fraction (0.50)
  };

  // Ocean acidification (Caldeira & Wickett 2003, Jacobson 2005)
  preindustrialPH: number;       // Surface ocean pH at 280 ppm (8.18)
  phSensitivity: number;         // pH drop per CO2 doubling (0.32)

  // Exogenous non-CO2 forcing overlay (CH4, N2O, halogens, ozone, aerosols),
  // W/m^2, linearly interpolated 2025 -> 2100 and constant after
  nonCO2Forcing2025: number;
  nonCO2Forcing2100: number;
}

export const climateDefaults: ClimateParams = {
  preindustrialCO2: 280,
  cumulativeCO2_2025: 2680,      // Gt CO2 fossil+industry+LUC since 1750 (Global Carbon Budget 2024: ~1810 fossil + ~870 land-use)
  airborneFraction: 0.42,        // DERIVED, not independently sourced: (424-280) ppm x 7.81 Gt/ppm / 2680 Gt at the 2025 stock
  airborneFractionSlope: 0.05,   // per 1000 Gt beyond 2025 (sink saturation): 30-yr marginal TCRE 0.42, 75-yr emergent 0.58 C/TtCO2 — both inside AR6's likely 0.27-0.63 (central 0.45); a constant fraction under log forcing understated the marginal response ~30%
  ppmPerGt: 0.128,
  sensitivity: 3.0,
  upperHeatCapacity: 7.3,
  deepHeatCapacity: 106,
  heatExchange: 0.73,
  forcingPerDoubling: 3.7,
  warmingRate: 0.02,
  currentTemp: 1.45,
  damageCoeff: 0.00536,
  maxDamage: 0.50,
  regionalDamage: {
    oecd: 0.8,
    china: 1.0,
    india: 1.5,      // Extreme heat and water stress
    latam: 1.0,
    seasia: 1.3,
    russia: 0.5,     // Warming reduces heating costs, opens agricultural land at moderate warming
    mena: 1.5,       // Extreme heat and water stress
    ssa: 2.0,        // Most vulnerable
  },
  tippingThreshold: 2.0,
  tippingMultiplier: 1.5,
  tippingSteepness: 4.0,
  adaptation: {
    adaptationRate: 0.10,      // ~33% reduction at $50K/cap (OECD)
    referenceGDP: 5000,        // $5K/cap baseline (SSA gets ~0%)
    maxAdaptation: 0.50,       // Cap at 50% damage reduction
  },
  preindustrialPH: 8.18,        // Jacobson (2005), surface ocean at 280 ppm
  phSensitivity: 0.32,          // Caldeira & Wickett (2003), pH drop per CO2 doubling
  // AR6 WG1 Ch.7 2019 effective radiative forcing: CO2 2.16 W/m^2 of 2.72
  // total anthropogenic; CH4 0.54 + N2O 0.21 + halogens 0.41 + ozone 0.47
  // + aerosols/cloud ~-1.1 => net non-CO2 ~ +0.5. The model previously forced
  // with CO2 only, biasing future warming low.
  nonCO2Forcing2025: 0.5,
  // Rises as aerosol cooling declines with air-quality cleanup while CH4/N2O
  // stay roughly flat: ~+0.85 by 2100 on a middle-of-road (SSP2-4.5-like)
  // non-CO2 trajectory (AR6 WG1 Fig 7.7 / Annex III). Scenario-overridable:
  // strong-mitigation pathways cut CH4 and land near +0.2-0.4.
  nonCO2Forcing2100: 0.85,
};

// =============================================================================
// STATE
// =============================================================================

export interface ClimateState {
  cumulativeEmissions: number;  // Gt CO2 since preindustrial
  temperature: number;          // Surface temperature, °C above preindustrial (T₁)
  deepTemp: number;             // Deep ocean temperature, °C above preindustrial (T₂)
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface ClimateInputs {
  /** Total emissions from all sources (Gt CO2/year) */
  emissions: number;
  /** Regional GDP per capita ($) for adaptation calculation */
  regionalGdpPerCapita?: Record<Region, number>;
}

export interface ClimateOutputs {
  /** Surface temperature (°C above preindustrial) */
  temperature: number;
  /** Atmospheric CO2 (ppm) */
  co2ppm: number;
  /** Equilibrium temperature at current CO2 (°C) */
  equilibriumTemp: number;
  /** Global average damage (fraction of GDP, 0-0.50) */
  damages: number;
  /** Per-region damages */
  regionalDamages: Record<Region, number>;
  /** Cumulative emissions (Gt CO2) */
  cumulativeEmissions: number;
  /** Deep ocean temperature anomaly (°C) */
  deepOceanTemp: number;
  /** Current radiative forcing (W/m²) */
  radiativeForcing: number;
  /** Per-region adaptation fraction (0 = no adaptation, up to maxAdaptation) */
  regionalAdaptation: Record<Region, number>;
  /** Ocean surface pH (CO₂-driven acidification) */
  oceanPH: number;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

/**
 * Airborne fraction rises with cumulative emissions beyond the 2025 stock
 * (ocean/land sink saturation): af(cum) = af0 + slope x (cum - cum2025)/1000,
 * capped at 0.6. At the 2025 anchor this reduces to af0 exactly, so the
 * 424-ppm calibration is unchanged.
 */
/**
 * Ceiling on the airborne fraction under extreme cumulative emissions —
 * AR6 projects the fraction rising toward ~0.55-0.6 under high-emission
 * pathways as ocean/land sinks saturate. At default slope this binds at
 * ~6,300 Gt cumulative, which ssp5-85 (~142 Gt/yr late-century) crosses
 * around the 2080s: the saturation feedback flattens there.
 */
const MAX_AIRBORNE_FRACTION = 0.6;

function effectiveAirborneFraction(
  cumulative: number,
  params: ClimateParams
): number {
  return Math.min(
    MAX_AIRBORNE_FRACTION,
    params.airborneFraction +
      params.airborneFractionSlope * Math.max(0, cumulative - params.cumulativeCO2_2025) / 1000
  );
}

export const climateModule: Module<
  ClimateParams,
  ClimateState,
  ClimateInputs,
  ClimateOutputs
> = defineModule<ClimateParams, ClimateState, ClimateInputs, ClimateOutputs>({
  name: 'climate',
  description: 'Two-layer energy balance (Geoffroy et al. 2013) with DICE-style damages',

  defaults: climateDefaults,

  paramMeta: {
    sensitivity: {
      paramName: 'climateSensitivity',
      description: 'Equilibrium climate sensitivity. IPCC AR6 range is 2.5-4.0°C, with 3.0°C as best estimate.',
      unit: '°C per CO₂ doubling',
      range: { min: 2.0, max: 5.0, default: 3.0 },
      tier: 1 as const,
    },
    nonCO2Forcing2100: {
      description: 'Exogenous non-CO2 forcing (CH4, N2O, halogens, ozone, aerosols) in 2100; linearly interpolated from the 2025 value. AR6 SSP range roughly +0.2 (strong CH4 mitigation) to +1.3 W/m² (SSP3/5).',
      unit: 'W/m²',
      range: { min: -0.5, max: 2.0, default: 0.85 },
      tier: 1 as const,
    },
    damageCoeff: {
      description: 'Quadratic damage coefficient (midpoint DICE/Howard-Sterner). damage = coeff × T². 0.00536 gives ~4.8% GDP loss at 3°C.',
      unit: 'per °C²',
      range: { min: 0.002, max: 0.015, default: 0.00536 },
      tier: 1 as const,
    },
    tippingThreshold: {
      description: 'Temperature threshold for tipping point multiplier. Damages increase faster above this (IPCC AR6: ~2°C).',
      unit: '°C',
      range: { min: 1.5, max: 4.0, default: 2.0 },
      tier: 1 as const,
    },
    adaptation: {
      adaptationRate: {
        paramName: 'adaptationRate',
        description: 'Damage reduction per log2 of GDP/cap ratio. OECD at $50K gets ~33% reduction.',
        unit: 'fraction per log2',
        range: { min: 0, max: 0.20, default: 0.10 },
        tier: 1 as const,
      },
      maxAdaptation: {
        paramName: 'maxAdaptation',
        description: 'Maximum climate damage adaptation fraction. Rich nations cap at this.',
        unit: 'fraction',
        range: { min: 0, max: 0.70, default: 0.50 },
        tier: 1 as const,
      },
    },
  },

  inputs: ['emissions', 'regionalGdpPerCapita'] as const,
  outputs: [
    'temperature',
    'co2ppm',
    'equilibriumTemp',
    'damages',
    'regionalDamages',
    'cumulativeEmissions',
    'deepOceanTemp',
    'radiativeForcing',
    'regionalAdaptation',
    'oceanPH',
  ] as const,

  connectorTypes: {
    inputs: {
      emissions: unitConnector('number', 'GtCO2/year'),
      regionalGdpPerCapita: unitConnector('record', '$/people/year'),
    },
    outputs: {
      temperature: unitConnector('number', '°C'),
      co2ppm: unitConnector('number', 'ppm'),
      equilibriumTemp: unitConnector('number', '°C'),
      damages: unitConnector('number', 'fraction'),
      regionalDamages: unitConnector('record', 'fraction'),
      cumulativeEmissions: unitConnector('number', 'GtCO2'),
      deepOceanTemp: unitConnector('number', '°C'),
      radiativeForcing: unitConnector('number', 'W/m^2'),
      regionalAdaptation: unitConnector('record', 'fraction'),
      oceanPH: unitConnector('number', 'pH'),
    },
  },

  validate(params: Partial<ClimateParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (params.airborneFractionSlope !== undefined &&
        (params.airborneFractionSlope < 0 || params.airborneFractionSlope > 0.15)) {
      errors.push('airborneFractionSlope must be between 0 and 0.15 per 1000 Gt');
    }

    const p = { ...climateDefaults, ...params };

    // Climate sensitivity range check (IPCC AR6)
    if (p.sensitivity < 1.5 || p.sensitivity > 6.0) {
      errors.push(
        `sensitivity ${p.sensitivity} outside valid range [1.5, 6.0]`
      );
    }
    if (p.sensitivity > 4.5) {
      warnings.push(
        `sensitivity ${p.sensitivity} above IPCC likely range (2.5-4.0)`
      );
    }

    // Non-CO2 forcing overlay
    for (const [name, value] of [
      ['nonCO2Forcing2025', p.nonCO2Forcing2025],
      ['nonCO2Forcing2100', p.nonCO2Forcing2100],
    ] as const) {
      if (!Number.isFinite(value) || value < -1 || value > 2) {
        errors.push(`${name} must be between -1 and 2 W/m²`);
      }
    }

    // Damage coefficient
    if (p.damageCoeff < 0) {
      errors.push('damageCoeff cannot be negative');
    }
    if (p.damageCoeff > 0.02) {
      warnings.push(
        `damageCoeff ${p.damageCoeff} unusually high (default uses 0.00536)`
      );
    }

    // Tipping threshold
    if (p.tippingThreshold < 1.5 || p.tippingThreshold > 4.0) {
      warnings.push(
        `tippingThreshold ${p.tippingThreshold} outside typical range [1.5, 4.0]`
      );
    }

    // Two-layer params
    if (p.upperHeatCapacity <= 0) {
      errors.push('upperHeatCapacity must be positive');
    }
    if (p.deepHeatCapacity <= 0) {
      errors.push('deepHeatCapacity must be positive');
    }
    if (p.heatExchange <= 0) {
      errors.push('heatExchange must be positive');
    }
    if (p.forcingPerDoubling <= 0) {
      errors.push('forcingPerDoubling must be positive');
    }

    // Regional damage multipliers
    for (const region of REGIONS) {
      const mult = p.regionalDamage[region];
      if (mult < 0) {
        errors.push(`regionalDamage.${region} cannot be negative`);
      }
      if (mult > 3.0) {
        warnings.push(`regionalDamage.${region} unusually high: ${mult}`);
      }
    }

    // Ocean pH params
    if (p.preindustrialPH < 7.5 || p.preindustrialPH > 8.5) {
      warnings.push(
        `preindustrialPH ${p.preindustrialPH} outside typical range [7.5, 8.5]`
      );
    }
    if (p.phSensitivity < 0.1 || p.phSensitivity > 0.6) {
      warnings.push(
        `phSensitivity ${p.phSensitivity} outside typical range [0.1, 0.6]`
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<ClimateParams>): ClimateParams {
    return validatedMerge('climate', this.validate, (p) => ({
      ...climateDefaults,
      ...p,
      regionalDamage: {
        ...climateDefaults.regionalDamage,
        ...p.regionalDamage,
      },
      adaptation: {
        ...climateDefaults.adaptation,
        ...p.adaptation,
      },
    }), partial);
  },

  init(params: ClimateParams): ClimateState {
    // Compute initial CO2 and forcing for deep ocean temperature derivation.
    // Non-CO2 forcing is included so the 2025 energy balance (and therefore
    // the derived deep-ocean temperature) stays anchored at currentTemp.
    const atmosphericCO2 =
      params.cumulativeCO2_2025 * params.airborneFraction * params.ppmPerGt;
    const co2ppm = params.preindustrialCO2 + atmosphericCO2;
    const forcing =
      params.forcingPerDoubling *
        Math.log2(co2ppm / params.preindustrialCO2) +
      params.nonCO2Forcing2025;
    const lambda = params.forcingPerDoubling / params.sensitivity;

    // Solve for initial deep ocean temperature from energy balance:
    // C₁ × warmingRate = F - λ·T₁ - γ·(T₁ - T₂)
    // T₂ = [C₁ × warmingRate - F + (λ + γ) × T₁] / γ
    const T1 = params.currentTemp;
    const deepTemp =
      (params.upperHeatCapacity * params.warmingRate -
        forcing +
        (lambda + params.heatExchange) * T1) /
      params.heatExchange;

    return {
      cumulativeEmissions: params.cumulativeCO2_2025,
      temperature: T1,
      deepTemp: Math.max(0, deepTemp),
    };
  },

  step(state, inputs, params, year, yearIndex) {
    // Update cumulative emissions
    const newCumulative = state.cumulativeEmissions + inputs.emissions;

    // Calculate atmospheric CO2 from cumulative emissions
    const atmosphericCO2 =
      newCumulative * effectiveAirborneFraction(newCumulative, params) * params.ppmPerGt;
    const co2ppm = params.preindustrialCO2 + atmosphericCO2;

    // Ocean surface pH (Caldeira & Wickett 2003)
    const oceanPH = params.preindustrialPH -
      params.phSensitivity * Math.log2(co2ppm / params.preindustrialCO2);

    // Radiative forcing: CO2 (from cumulative emissions) plus the exogenous
    // non-CO2 overlay, linearly interpolated between its calendar-anchored
    // endpoints (lerp clamps, so it is constant after 2100).
    const nonCO2Forcing = lerp(
      params.nonCO2Forcing2025,
      params.nonCO2Forcing2100,
      (year - 2025) / 75,
    );
    const forcing =
      params.forcingPerDoubling *
        Math.log2(co2ppm / params.preindustrialCO2) +
      nonCO2Forcing;

    // Feedback parameter (λ = F₂ₓ / ECS)
    const lambda = params.forcingPerDoubling / params.sensitivity;

    // Two-layer energy balance (Geoffroy et al. 2013)
    // Euler forward integration, Δt = 1 year
    const surfaceHeating =
      forcing -
      lambda * state.temperature -
      params.heatExchange * (state.temperature - state.deepTemp);
    const temperature =
      state.temperature + surfaceHeating / params.upperHeatCapacity;

    const deepHeating =
      params.heatExchange * (state.temperature - state.deepTemp);
    const deepTemp =
      state.deepTemp + deepHeating / params.deepHeatCapacity;

    // Equilibrium temperature (when T₁ = T₂ and all dT/dt = 0)
    const equilibriumTemp = forcing / lambda;

    // Calculate damages
    const baseDamage = quadraticDamage(
      temperature,
      params.damageCoeff,
      params.maxDamage
    );

    // Tipping point multiplier (smooth S-curve)
    const tippingTransition = smoothStep(
      temperature,
      params.tippingThreshold,
      params.tippingSteepness
    );
    const tippingMult =
      1 + (params.tippingMultiplier - 1) * tippingTransition;

    // Regional adaptation and damages
    const regionalDamages: Record<Region, number> = {} as Record<Region, number>;
    const regionalAdaptation: Record<Region, number> = {} as Record<Region, number>;
    const { adaptation } = params;

    for (const region of REGIONS) {
      // Compute adaptation: richer regions invest more in infrastructure
      const gdpPerCap = inputs.regionalGdpPerCapita?.[region] ?? adaptation.referenceGDP;
      const ratio = gdpPerCap / adaptation.referenceGDP;
      const adaptEff = ratio > 1
        ? Math.min(adaptation.maxAdaptation, adaptation.adaptationRate * Math.log2(ratio))
        : 0;
      regionalAdaptation[region] = adaptEff;

      // Raw regional damage, then reduce by adaptation
      const rawDamage = baseDamage * tippingMult * params.regionalDamage[region];
      regionalDamages[region] = Math.min(
        rawDamage * (1 - adaptEff),
        params.maxDamage
      );
    }

    // Global damages: GDP-weighted adaptation is handled downstream;
    // here use unweighted average for backwards compat
    const adaptedGlobalDamages = Math.min(
      baseDamage * tippingMult,
      params.maxDamage
    );

    return {
      state: {
        cumulativeEmissions: newCumulative,
        temperature,
        deepTemp,
      },
      outputs: {
        temperature,
        co2ppm,
        equilibriumTemp,
        damages: adaptedGlobalDamages,
        regionalDamages,
        cumulativeEmissions: newCumulative,
        deepOceanTemp: deepTemp,
        radiativeForcing: forcing,
        regionalAdaptation,
        oceanPH,
      },
    };
  },
});
