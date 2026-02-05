/**
 * Primitive mathematical functions
 *
 * Pure functions with no dependencies - the foundation of all calculations.
 * These map directly to the PRIMITIVES section in energy-sim.js
 */

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
