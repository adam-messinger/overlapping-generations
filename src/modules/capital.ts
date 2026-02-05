/**
 * Capital Module
 *
 * Savings, investment, and automation dynamics based on OLG lifecycle theory.
 * Implements Galbraith/Chen uncertainty premium for investment stability.
 *
 * Key equations:
 * - Savings rate: Demographic-weighted average of cohort savings rates
 * - Stability: Φ = 1 / (1 + λ × uncertainty²)
 * - Investment: I = GDP × savingsRate × stability
 * - Capital accumulation: K_{t+1} = (1-δ)K_t + I_t
 * - Interest rate: r = α × Y/K - δ (marginal product of capital)
 *
 * Sources:
 * - Penn World Table: K/Y ratio ~3.5, global capital stock ~$420T
 * - OLG theory: Lifecycle savings rates by age cohort
 * - Galbraith/Chen (2021): Uncertainty premium on investment
 */

import { REGIONS, Region } from '../framework/types.js';
import { Module } from '../framework/module.js';

// =============================================================================
// TYPES
// =============================================================================

export interface CapitalParams {
  // Production
  alpha: number;              // Capital share in Cobb-Douglas (~0.33)
  depreciation: number;       // Annual depreciation rate (~0.05)

  // OLG lifecycle savings rates
  savingsYoung: number;       // Ages 0-19: dependents (0)
  savingsWorking: number;     // Ages 20-64: prime savers (~0.45)
  savingsOld: number;         // Ages 65+: dissaving (~-0.05)

  // Regional savings premiums
  savingsPremium: Record<Region, number>;

  // Galbraith/Chen uncertainty premium
  stabilityLambda: number;    // Sensitivity to uncertainty

  // Automation
  automationShare2025: number;    // Initial fraction of capital as "robots"
  automationGrowth: number;       // Annual growth of automation share
  automationShareCap: number;     // Maximum automation share
  robotsPerCapitalUnit: number;   // Robots per $1000 automation capital per worker

  // Initial conditions
  initialCapitalStock: number;    // $ trillions (2025)
}

interface CapitalState {
  stock: number;              // Current capital stock ($ trillions)
}

interface CapitalInputs {
  // From demographics (per region)
  regionalYoung: Record<Region, number>;
  regionalWorking: Record<Region, number>;
  regionalOld: Record<Region, number>;
  regionalPopulation: Record<Region, number>;

  // Global demographics
  effectiveWorkers: number;

  // From demand
  gdp: number;                // Global GDP ($ trillions)

  // From climate (optional)
  damages?: number;           // Damage fraction (0-1) for stability

  // From energy/dispatch (optional)
  netEnergyFactor?: number;   // Net energy fraction (0-1), lagged
}

interface CapitalOutputs {
  // Stock and flows
  stock: number;              // Capital stock ($ trillions)
  investment: number;         // Annual investment ($ trillions)

  // Rates
  savingsRate: number;        // Global aggregate savings rate
  regionalSavings: Record<Region, number>;
  stability: number;          // G/C uncertainty premium Φ (0-1)
  interestRate: number;       // Real interest rate

  // Automation
  robotsDensity: number;      // Robots per 1000 workers
  automationShare: number;    // Fraction of capital that is automation

  // Intensity
  kPerWorker: number;         // Capital per effective worker ($K/person)
  capitalOutputRatio: number; // K/Y ratio

  // Growth rate (for Solow feedback to demand)
  capitalGrowthRate: number;  // Annual growth rate of capital stock
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const capitalDefaults: CapitalParams = {
  // Production
  alpha: 0.33,              // Capital share (Cobb-Douglas)
  depreciation: 0.05,       // Annual depreciation rate

  // OLG lifecycle savings
  savingsYoung: 0.0,        // Dependents don't save
  savingsWorking: 0.45,     // Prime savers (calibrated to ~22% global rate)
  savingsOld: -0.05,        // Dissaving in retirement

  // Regional premiums
  savingsPremium: {
    oecd: 0.0,              // Baseline
    china: 0.15,            // +15% higher savings
    em: -0.05,              // Lower savings
    row: -0.08,             // Lowest savings
  },

  // G/C uncertainty premium
  stabilityLambda: 2.0,     // At 30% uncertainty: 15% investment suppression

  // Automation
  automationShare2025: 0.02,    // 2% of capital is robots/automation
  automationGrowth: 0.03,       // 3%/year growth in share
  automationShareCap: 0.20,     // Max 20% of capital
  robotsPerCapitalUnit: 8.6,    // Robots per $1000 automation K per worker

  // Initial conditions
  initialCapitalStock: 420,     // $420T (Penn World Table, K/Y ≈ 3.5)
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate demographic-weighted savings rate
 */
function calculateSavingsRate(
  young: number,
  working: number,
  old: number,
  population: number,
  premium: number,
  params: CapitalParams
): number {
  const baseRate = (
    young * params.savingsYoung +
    working * params.savingsWorking +
    old * params.savingsOld
  ) / population;

  return baseRate + premium;
}

/**
 * Galbraith/Chen stability factor
 * Φ = 1 / (1 + λ × uncertainty²)
 */
function calculateStability(uncertainty: number, lambda: number): number {
  return 1 / (1 + lambda * uncertainty * uncertainty);
}

/**
 * Interest rate = marginal product of capital - depreciation
 * r = α × Y/K - δ
 */
function calculateInterestRate(gdp: number, capital: number, params: CapitalParams): number {
  if (capital <= 0) return 0.05; // Fallback
  return params.alpha * gdp / capital - params.depreciation;
}

/**
 * Robots per 1000 workers
 */
function calculateRobotsDensity(
  capital: number,
  workers: number,
  automationShare: number,
  robotsPerCapitalUnit: number
): number {
  const automationCapital = capital * automationShare; // $ trillions
  const dollarsPerWorker = (automationCapital * 1e12) / workers;
  return (dollarsPerWorker / 1000) * robotsPerCapitalUnit;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const capitalModule: Module<
  CapitalParams,
  CapitalState,
  CapitalInputs,
  CapitalOutputs
> = {
  name: 'capital',
  description: 'OLG capital accumulation with demographic-weighted savings',
  defaults: capitalDefaults,

  inputs: [
    'regionalYoung',
    'regionalWorking',
    'regionalOld',
    'regionalPopulation',
    'effectiveWorkers',
    'gdp',
    'damages',
    'netEnergyFactor',
  ] as const,

  outputs: [
    'stock',
    'investment',
    'savingsRate',
    'regionalSavings',
    'stability',
    'interestRate',
    'robotsDensity',
    'automationShare',
    'kPerWorker',
    'capitalOutputRatio',
    'capitalGrowthRate',
  ] as const,

  validate(params: Partial<CapitalParams>) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (params.alpha !== undefined) {
      if (params.alpha < 0.1 || params.alpha > 0.5) {
        errors.push('Capital share (alpha) must be between 0.1 and 0.5');
      }
    }

    if (params.depreciation !== undefined) {
      if (params.depreciation < 0.01 || params.depreciation > 0.15) {
        errors.push('Depreciation must be between 1% and 15%');
      }
    }

    if (params.savingsWorking !== undefined) {
      if (params.savingsWorking < 0.1 || params.savingsWorking > 0.7) {
        warnings.push('Working-age savings rate outside typical range (10-70%)');
      }
    }

    if (params.initialCapitalStock !== undefined) {
      if (params.initialCapitalStock < 100 || params.initialCapitalStock > 1000) {
        warnings.push('Initial capital stock outside typical range ($100T-$1000T)');
      }
    }

    if (params.stabilityLambda !== undefined) {
      if (params.stabilityLambda < 0) {
        errors.push('Stability lambda must be non-negative');
      }
      if (params.stabilityLambda > 10) {
        warnings.push('Stability lambda >10 creates extreme investment suppression');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<CapitalParams>): CapitalParams {
    const merged = { ...capitalDefaults };

    // Merge scalar params
    if (partial.alpha !== undefined) merged.alpha = partial.alpha;
    if (partial.depreciation !== undefined) merged.depreciation = partial.depreciation;
    if (partial.savingsYoung !== undefined) merged.savingsYoung = partial.savingsYoung;
    if (partial.savingsWorking !== undefined) merged.savingsWorking = partial.savingsWorking;
    if (partial.savingsOld !== undefined) merged.savingsOld = partial.savingsOld;
    if (partial.stabilityLambda !== undefined) merged.stabilityLambda = partial.stabilityLambda;
    if (partial.automationShare2025 !== undefined) merged.automationShare2025 = partial.automationShare2025;
    if (partial.automationGrowth !== undefined) merged.automationGrowth = partial.automationGrowth;
    if (partial.automationShareCap !== undefined) merged.automationShareCap = partial.automationShareCap;
    if (partial.robotsPerCapitalUnit !== undefined) merged.robotsPerCapitalUnit = partial.robotsPerCapitalUnit;
    if (partial.initialCapitalStock !== undefined) merged.initialCapitalStock = partial.initialCapitalStock;

    // Merge regional premiums
    if (partial.savingsPremium) {
      merged.savingsPremium = { ...capitalDefaults.savingsPremium, ...partial.savingsPremium };
    }

    return merged;
  },

  init(params: CapitalParams): CapitalState {
    return {
      stock: params.initialCapitalStock,
    };
  },

  step(
    state: CapitalState,
    inputs: CapitalInputs,
    params: CapitalParams,
    year: number,
    yearIndex: number
  ): { state: CapitalState; outputs: CapitalOutputs } {
    const t = yearIndex;

    // Calculate regional and global savings rates
    const regionalSavings = {} as Record<Region, number>;
    let totalPop = 0;
    let weightedSavings = 0;

    for (const region of REGIONS) {
      const young = inputs.regionalYoung[region];
      const working = inputs.regionalWorking[region];
      const old = inputs.regionalOld[region];
      const pop = inputs.regionalPopulation[region];
      const premium = params.savingsPremium[region];

      const rate = calculateSavingsRate(young, working, old, pop, premium, params);
      regionalSavings[region] = rate;

      totalPop += pop;
      weightedSavings += rate * pop;
    }

    const savingsRate = weightedSavings / totalPop;

    // Calculate stability factor from damages (if provided)
    const uncertainty = inputs.damages ?? 0;
    const stability = calculateStability(uncertainty, params.stabilityLambda);

    // Calculate investment
    const netEnergyFactor = Math.max(0, Math.min(1, inputs.netEnergyFactor ?? 1));
    const investment = inputs.gdp * savingsRate * stability * netEnergyFactor;

    // Calculate interest rate
    const interestRate = calculateInterestRate(inputs.gdp, state.stock, params);

    // Calculate automation share (grows but is capped)
    const rawShare = params.automationShare2025 * Math.pow(1 + params.automationGrowth, t);
    const automationShare = Math.min(rawShare, params.automationShareCap);

    // Calculate robots density
    const robotsDensity = calculateRobotsDensity(
      state.stock,
      inputs.effectiveWorkers,
      automationShare,
      params.robotsPerCapitalUnit
    );

    // Calculate K per effective worker ($K per person)
    const kPerWorker = (state.stock * 1e12) / inputs.effectiveWorkers / 1000;

    // Capital-output ratio
    const capitalOutputRatio = state.stock / inputs.gdp;

    // Update capital stock for next period: K_{t+1} = (1-δ)K_t + I_t
    const newStock = (1 - params.depreciation) * state.stock + investment;

    // Capital growth rate (for Solow feedback)
    const capitalGrowthRate = yearIndex > 0 && state.stock > 0
      ? (newStock - state.stock) / state.stock
      : 0;

    return {
      state: {
        stock: newStock,
      },
      outputs: {
        stock: state.stock, // Output current stock (before update)
        investment,
        savingsRate,
        regionalSavings,
        stability,
        interestRate,
        robotsDensity,
        automationShare,
        kPerWorker,
        capitalOutputRatio,
        capitalGrowthRate,
      },
    };
  },
};
