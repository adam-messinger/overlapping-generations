/**
 * Primitive mathematical functions
 *
 * Pure functions with no dependencies - the foundation of all calculations.
 * These map directly to the PRIMITIVES section in energy-sim.js
 */

/**
 * Calendar year at which the structural (catch-up/sectoral-shift) component of
 * the efficiency series begins to decay. Anchored to the last historical year
 * so the 1990-2025 backcast is untouched; shared by production's eta integral
 * and demand's intensity decline so the two views stay coupled.
 */
export const STRUCTURAL_ANCHOR_YEAR = 2025;

/**
 * Compound growth: start × (1 + rate)^years
 */
export function compound(start: number, rate: number, years: number): number {
  return start * Math.pow(1 + rate, years);
}

/**
 * Wright's Law learning curve: cost = cost₀ × cumulative^(-α)
 *
 * As cumulative production doubles, cost falls by 2^(-α)
 * α = 0.20 means 13% cost reduction per doubling (1 - 2^-0.2 ≈ 0.13)
 * α = 0.36 means 22% cost reduction per doubling (solar)
 *
 * @param cost0 - Initial cost
 * @param cumulative - Cumulative production/deployment
 * @param alpha - Learning exponent (higher = faster learning)
 */
export function learningCurve(
  cost0: number,
  cumulative: number,
  alpha: number
): number {
  if (cumulative <= 0) return cost0;
  return cost0 * Math.pow(cumulative, -alpha);
}

/**
 * Learning rate from alpha: how much cost falls per doubling
 *
 * @param alpha - Learning exponent
 * @returns Learning rate (0-1), e.g., 0.22 means 22% reduction per doubling
 */
export function learningRate(alpha: number): number {
  return 1 - Math.pow(2, -alpha);
}

/**
 * Alpha from learning rate
 *
 * @param rate - Learning rate (0-1)
 * @returns Alpha exponent for Wright's Law
 */
export function alphaFromLearningRate(rate: number): number {
  const clamped = Math.max(0.001, Math.min(0.99, rate));
  return -Math.log2(1 - clamped);
}

/**
 * EROEI depletion model
 *
 * EROEI (Energy Return on Energy Invested) declines as resources are extracted.
 * Models fossil fuel depletion where remaining reserves become harder to access.
 *
 * @param reserves - Total initial reserves
 * @param extracted - Amount extracted so far
 * @param eroei0 - Initial EROEI (e.g., 30 for conventional oil)
 * @param beta - Depletion exponent (default 0.5)
 */
export function depletion(
  reserves: number,
  extracted: number,
  eroei0: number,
  beta: number = 0.5
): { eroei: number; netEnergyFraction: number; remaining: number } {
  const remaining = Math.max(reserves - extracted, 0.01);
  const fractionRemaining = remaining / reserves;
  const eroei = Math.max(eroei0 * Math.pow(fractionRemaining, beta), 1.1);

  return {
    eroei,
    netEnergyFraction: 1 - 1 / eroei,
    remaining,
  };
}

/**
 * Logistic S-curve for adoption/deployment
 *
 * Models technology adoption, electrification rates, etc.
 *
 * @param start - Starting value
 * @param ceiling - Maximum value (asymptote)
 * @param rate - Growth rate (k in logistic equation)
 * @param years - Years since start
 */
export function logistic(
  start: number,
  ceiling: number,
  rate: number,
  years: number
): number {
  if (start >= ceiling) return ceiling;
  if (start <= 0) return 0;
  if (rate <= 0) return start;
  const midpoint = Math.log((ceiling - start) / start) / rate;
  return ceiling / (1 + Math.exp(-rate * (years - midpoint)));
}

/**
 * Logistic function with explicit midpoint
 *
 * @param floor - Minimum value
 * @param ceiling - Maximum value
 * @param midpoint - Year when value = (floor + ceiling) / 2
 * @param steepness - How sharp the transition is
 * @param year - Current year
 */
export function logisticMidpoint(
  floor: number,
  ceiling: number,
  midpoint: number,
  steepness: number,
  year: number
): number {
  const t = 1 / (1 + Math.exp(-steepness * (year - midpoint)));
  return floor + (ceiling - floor) * t;
}

/**
 * Exponential convergence to target
 *
 * Value approaches target asymptotically: v(t) = target + (start - target) × e^(-rate × t)
 *
 * @param start - Starting value
 * @param target - Target value (asymptote)
 * @param rate - Convergence rate (higher = faster)
 * @param years - Years since start
 */
export function exponentialConvergence(
  start: number,
  target: number,
  rate: number,
  years: number
): number {
  return target + (start - target) * Math.exp(-rate * years);
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Clamp value to range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Structural-decay multiplier on an efficiency/intensity-decline rate.
 * A `structuralShare` fraction of the rate is transitional structural change
 * (sectoral shift, catch-up) that halves every `halfLife` years after 2025;
 * the rest is persistent device efficiency. Returns 1 before 2025 and when
 * halfLife = 0 (no decay), so backcasts and no-decay runs are unaffected.
 * Used by BOTH demand (intensity decline) and production (eta growth) so the
 * "one efficiency series, two views" invariant holds through the decay.
 */
export function structuralDecayFactor(
  year: number,
  structuralShare: number,
  halfLife: number
): number {
  const tau = Math.max(0, year - STRUCTURAL_ANCHOR_YEAR);
  const decayed = halfLife > 0 ? Math.pow(0.5, tau / halfLife) : 1;
  return (1 - structuralShare) + structuralShare * decayed;
}

/**
 * Poisson shock probability
 *
 * P(at least one event) = 1 - e^(-λ)
 *
 * @param lambda - Expected events per period
 * @param magnitude - Impact magnitude if event occurs
 */
export function poissonShock(
  lambda: number,
  magnitude: number
): { probability: number; magnitude: number } {
  return {
    probability: 1 - Math.exp(-lambda),
    magnitude,
  };
}

/**
 * Quadratic damage function (DICE-style)
 *
 * D = coeff × T²
 *
 * @param temperature - °C above preindustrial
 * @param coeff - Damage coefficient (DICE-2023: 0.00236)
 * @param maxDamage - Cap on damages (Weitzman bounded utility)
 */
export function quadraticDamage(
  temperature: number,
  coeff: number,
  maxDamage: number = 0.3
): number {
  return Math.min(coeff * temperature * temperature, maxDamage);
}

/**
 * Smooth S-curve transition (for tipping points)
 *
 * Returns 0 well below threshold, 1 well above, smooth transition near threshold.
 *
 * @param value - Current value (e.g., temperature)
 * @param threshold - Midpoint of transition
 * @param steepness - How sharp the transition is (higher = sharper)
 */
export function smoothStep(
  value: number,
  threshold: number,
  steepness: number = 4
): number {
  return 1 / (1 + Math.exp(-steepness * (value - threshold)));
}

/**
 * Standard normal cumulative distribution function
 *
 * Abramowitz & Stegun 7.1.26 rational approximation to erf, absolute error
 * below 1.5e-7 — well inside the precision of any share this model reports.
 *
 * @param z - Standard normal deviate
 */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
    0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

/**
 * Standard normal quantile (inverse CDF)
 *
 * Acklam's rational approximation, relative error below 1.15e-9. Used to invert
 * an observed headcount share back to the deviate that produced it.
 *
 * @param p - Probability in (0, 1)
 */
export function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) throw new Error(`normalQuantile requires p in (0,1), received ${p}`);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416];
  const pLow = 0.02425;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pLow) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/**
 * Dispersion (sigma) of a lognormal income distribution implied by a Gini
 *
 * For lognormal incomes, G = 2Φ(σ/√2) − 1, so σ = √2 · Φ⁻¹((G+1)/2).
 *
 * @param gini - Gini coefficient in (0, 1)
 */
export function lognormalSigmaFromGini(gini: number): number {
  return Math.SQRT2 * normalQuantile((gini + 1) / 2);
}
