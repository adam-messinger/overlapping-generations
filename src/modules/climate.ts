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

import { defineModule, Module } from '../framework/module.js';
import { ValidationResult } from '../framework/types.js';
import { Region, REGIONS } from '../domain-types.js';
import { quadraticDamage, smoothStep } from '../primitives/math.js';
import { validatedMerge } from '../framework/validated-merge.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface ClimateParams {
  // CO2 baseline
  preindustrialCO2: number;      // ppm (280)
  cumulativeCO2_2025: number;    // Gt cumulative since preindustrial (2400)

  // Carbon cycle
  airborneFraction: number;      // Fraction staying in atmosphere (0.45)
  ppmPerGt: number;              // ppm per Gt in atmosphere (0.128)

  // Two-layer energy balance (Geoffroy et al. 2013)
  sensitivity: number;           // Equilibrium climate sensitivity, °C per CO2 doubling (3.0)
  upperHeatCapacity: number;     // C₁: surface + mixed ocean, W·yr·m⁻²·K⁻¹ (7.3)
  deepHeatCapacity: number;      // C₂: deep ocean, W·yr·m⁻²·K⁻¹ (106)
  heatExchange: number;          // γ: inter-layer heat exchange, W·m⁻²·K⁻¹ (0.73)
  forcingPerDoubling: number;    // F₂ₓ: radiative forcing per CO2 doubling, W/m² (3.7)
  warmingRate: number;           // Observed surface warming rate in 2025, °C/yr (0.02)
  currentTemp: number;           // °C above preindustrial in 2025 (1.2)

  // Damage function (DICE-2023)
  damageCoeff: number;           // Quadratic coefficient (0.00236)
  maxDamage: number;             // Cap on damages (0.30)

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
}

export const climateDefaults: ClimateParams = {
  preindustrialCO2: 280,
  cumulativeCO2_2025: 2400,
  airborneFraction: 0.45,
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
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const climateModule: Module<
  ClimateParams,
  ClimateState,
  ClimateInputs,
  ClimateOutputs
> = defineModule({
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
  ] as const,

  connectorTypes: {
    inputs: {
      emissions: 'number',
      regionalGdpPerCapita: 'record',
    },
    outputs: {
      temperature: 'number',
      co2ppm: 'number',
      equilibriumTemp: 'number',
      damages: 'number',
      regionalDamages: 'record',
      cumulativeEmissions: 'number',
      deepOceanTemp: 'number',
      radiativeForcing: 'number',
      regionalAdaptation: 'record',
    },
  },

  validate(params: Partial<ClimateParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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
    // Compute initial CO2 and forcing for deep ocean temperature derivation
    const atmosphericCO2 =
      params.cumulativeCO2_2025 * params.airborneFraction * params.ppmPerGt;
    const co2ppm = params.preindustrialCO2 + atmosphericCO2;
    const forcing =
      params.forcingPerDoubling *
      Math.log2(co2ppm / params.preindustrialCO2);
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
      newCumulative * params.airborneFraction * params.ppmPerGt;
    const co2ppm = params.preindustrialCO2 + atmosphericCO2;

    // Radiative forcing
    const forcing =
      params.forcingPerDoubling *
      Math.log2(co2ppm / params.preindustrialCO2);

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

    const globalDamages = Math.min(
      baseDamage * tippingMult,
      params.maxDamage
    );

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
      },
    };
  },
});
