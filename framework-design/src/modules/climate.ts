/**
 * Climate Module
 *
 * Handles CO2 accumulation, temperature, and damage calculations.
 * Based on DICE-2023 with tipping point extensions.
 *
 * Inputs (from other modules):
 * - emissions: Total Gt CO2/year (from dispatch + demand modules)
 *
 * Outputs (to other modules):
 * - temperature: °C above preindustrial
 * - co2ppm: Atmospheric CO2 concentration
 * - damages: Global damage fraction (0-0.30)
 * - regionalDamages: Per-region damage fractions
 */

import { defineModule, Module } from '../framework/module';
import { Region, REGIONS, ValidationResult } from '../framework/types';
import { quadraticDamage, smoothStep } from '../primitives/math';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface ClimateParams {
  // CO2 baseline
  preindustrialCO2: number;      // ppm (280)
  cumulativeCO2_2025: number;    // Gt cumulative since preindustrial (2400)

  // Carbon cycle
  airborneraction: number;       // Fraction staying in atmosphere (0.45)
  ppmPerGt: number;              // ppm per Gt in atmosphere (0.128)

  // Temperature dynamics
  climSensitivity: number;       // °C per CO2 doubling (2.0-4.5)
  temperatureLag: number;        // Years for temp to equilibrate (10)
  currentTemp: number;           // °C above preindustrial in 2025 (1.2)

  // Damage function (DICE-2023)
  damageCoeff: number;           // Quadratic coefficient (0.00236)
  maxDamage: number;             // Cap on damages (0.30)

  // Regional multipliers
  regionalDamage: Record<Region, number>;

  // Tipping points
  tippingThreshold: number;      // °C midpoint for tipping (2.5)
  tippingMultiplier: number;     // Max damage multiplier (1.25)
  tippingSteepness: number;      // S-curve steepness (4.0)
}

export const climateDefaults: ClimateParams = {
  preindustrialCO2: 280,
  cumulativeCO2_2025: 2400,
  airborneraction: 0.45,
  ppmPerGt: 0.128,
  climSensitivity: 3.0,
  temperatureLag: 10,
  currentTemp: 1.2,
  damageCoeff: 0.00236,
  maxDamage: 0.30,
  regionalDamage: {
    oecd: 0.8,
    china: 1.0,
    em: 1.3,
    row: 1.8,
  },
  tippingThreshold: 2.5,
  tippingMultiplier: 1.25,
  tippingSteepness: 4.0,
};

// =============================================================================
// STATE
// =============================================================================

export interface ClimateState {
  cumulativeEmissions: number;  // Gt CO2 since preindustrial
  temperature: number;          // °C above preindustrial
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface ClimateInputs {
  /** Total emissions from all sources (Gt CO2/year) */
  emissions: number;
}

export interface ClimateOutputs {
  /** Current temperature (°C above preindustrial) */
  temperature: number;
  /** Atmospheric CO2 (ppm) */
  co2ppm: number;
  /** Equilibrium temperature if emissions stopped */
  equilibriumTemp: number;
  /** Global average damage (fraction of GDP, 0-0.30) */
  damages: number;
  /** Per-region damages */
  regionalDamages: Record<Region, number>;
  /** Cumulative emissions (Gt CO2) */
  cumulativeEmissions: number;
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
  description: 'CO2 accumulation, temperature, and DICE-style damages',

  defaults: climateDefaults,

  inputs: ['emissions'] as const,
  outputs: [
    'temperature',
    'co2ppm',
    'equilibriumTemp',
    'damages',
    'regionalDamages',
    'cumulativeEmissions',
  ] as const,

  validate(params: Partial<ClimateParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const p = { ...climateDefaults, ...params };

    // Climate sensitivity range check (IPCC AR6)
    if (p.climSensitivity < 1.5 || p.climSensitivity > 6.0) {
      errors.push(
        `climSensitivity ${p.climSensitivity} outside valid range [1.5, 6.0]`
      );
    }
    if (p.climSensitivity > 4.5) {
      warnings.push(
        `climSensitivity ${p.climSensitivity} above IPCC likely range (2.5-4.0)`
      );
    }

    // Damage coefficient
    if (p.damageCoeff < 0) {
      errors.push('damageCoeff cannot be negative');
    }
    if (p.damageCoeff > 0.01) {
      warnings.push(
        `damageCoeff ${p.damageCoeff} unusually high (DICE-2023 uses 0.00236)`
      );
    }

    // Tipping threshold
    if (p.tippingThreshold < 1.5 || p.tippingThreshold > 4.0) {
      warnings.push(
        `tippingThreshold ${p.tippingThreshold} outside typical range [1.5, 4.0]`
      );
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
    return {
      ...climateDefaults,
      ...partial,
      regionalDamage: {
        ...climateDefaults.regionalDamage,
        ...partial.regionalDamage,
      },
    };
  },

  init(params: ClimateParams): ClimateState {
    return {
      cumulativeEmissions: params.cumulativeCO2_2025,
      temperature: params.currentTemp,
    };
  },

  step(state, inputs, params, year, yearIndex) {
    // Update cumulative emissions
    const newCumulative = state.cumulativeEmissions + inputs.emissions;

    // Calculate atmospheric CO2 from cumulative emissions
    const atmosphericCO2 =
      newCumulative * params.airborneraction * params.ppmPerGt;
    const co2ppm = params.preindustrialCO2 + atmosphericCO2;

    // Equilibrium temperature from radiative forcing
    // T = S × log₂(CO₂/280)
    const equilibriumTemp =
      params.climSensitivity *
      Math.log2(co2ppm / params.preindustrialCO2);

    // Temperature lags behind equilibrium (ocean thermal inertia)
    const lagFactor = 1 / params.temperatureLag;
    const temperature =
      state.temperature + (equilibriumTemp - state.temperature) * lagFactor;

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

    // Regional damages
    const regionalDamages: Record<Region, number> = {} as Record<Region, number>;
    for (const region of REGIONS) {
      regionalDamages[region] = Math.min(
        baseDamage * tippingMult * params.regionalDamage[region],
        params.maxDamage
      );
    }

    return {
      state: {
        cumulativeEmissions: newCumulative,
        temperature,
      },
      outputs: {
        temperature,
        co2ppm,
        equilibriumTemp,
        damages: globalDamages,
        regionalDamages,
        cumulativeEmissions: newCumulative,
      },
    };
  },
});
