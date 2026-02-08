/**
 * Capital Module
 *
 * Savings, investment, and automation dynamics based on OLG lifecycle theory.
 * Implements Galbraith/Chen uncertainty premium for investment stability.
 *
 * Key equations:
 * - Savings rate: Demographic-weighted average of cohort savings rates
 * - Stability: Φ = 1 / (1 + λ × uncertainty²)
 * - Transfers: RetireeCost + ChildCost (pensions, healthcare, education)
 * - Interest rate: r = α × Y/K - δ + debtRiskPremium
 * - Investment: I = max(0, grossSavings + creditImpulse)
 * - GDP = WorkerConsumption + Investment + RetireeCost + ChildCost + PublicDebtService
 * - Capital accumulation: K_{t+1} = (1-δ)K_t + I_general
 * - Public debt: ΔD = primaryDeficit + debtService - fiscalConsolidation
 * - Private debt: ΔD = creditImpulse - amortization
 *
 * Sources:
 * - Penn World Table: K/Y ratio ~3.5, global capital stock ~$420T
 * - OLG theory: Lifecycle savings rates by age cohort
 * - Galbraith/Chen (2021): Uncertainty premium on investment
 */

import { Region, REGIONS } from '../domain-types.js';
import { Module } from '../framework/module.js';
import { validatedMerge } from '../framework/validated-merge.js';

// =============================================================================
// TYPES
// =============================================================================

export interface TransferParams {
  educationRate: number;    // Per-child education as fraction of GDP/capita
}

export interface CapitalParams {
  // Production
  alpha: number;              // Capital share in Cobb-Douglas (~0.33)
  depreciation: number;       // Annual depreciation rate (~0.05)

  // OLG lifecycle savings rates
  savingsYoung: number;       // Ages 0-19: dependents (0)
  savingsWorking: number;     // Ages 20-64: prime savers (~0.45)
  savingsOld: number;         // Ages 65+: dissaving (0, replaced by explicit transfers)

  // Regional savings premiums
  savingsPremium: Record<Region, number>;

  // Intergenerational transfers
  transfers: TransferParams;
  transferPremium: Record<Region, Partial<TransferParams>>;

  // Galbraith/Chen uncertainty premium
  stabilityLambda: number;    // Sensitivity to uncertainty

  // Automation
  automationShare2025: number;    // Initial fraction of capital as "robots"
  automationGrowth: number;       // Annual growth of automation share
  automationShareCap: number;     // Maximum automation share
  robotsPerCapitalUnit: number;   // Robots per $1000 automation capital per worker

  // Investment split
  baseEnergyInvestmentShare: number;    // Base fraction of investment to energy sector (0.15)
  energyInvestmentSensitivity: number;  // Sensitivity to energy burden (1.0)

  // Retirement age adjustment
  retirementAgeResponse: number;    // Fraction of LE gains → retirement age (0.67)
  wageIndexation: number;           // 0=price-indexed, 1=wage-indexed (0.7)

  // Demographic savings response
  savingsLifeExpSensitivity: number;     // LE elasticity on savings (0.5)
  savingsDependencySensitivity: number;  // Dependency ratio elasticity on savings (0.3)

  // --- Public debt ---
  initialPublicDebtGDP: number;        // 0.90 (90% of GDP in 2025)
  publicDeficitRate: number;           // 0.03 (structural primary deficit / GDP)
  fiscalReactionCoeff: number;         // 0.03 (tightening per pp of debt/GDP above threshold)
  fiscalReactionThreshold: number;     // 0.60 (Maastricht-style trigger)
  fiscalReactionMax: number;           // 0.04 (max primary surplus / GDP — saturation)

  // --- Private debt ---
  initialPrivateDebtGDP: number;       // 1.60 (160% of GDP in 2025)
  baseCreditGrowth: number;            // 0.04 (new credit / GDP per year)
  creditSensitivity: number;           // 1.0 (elasticity to r-g spread)
  leverageDamping: number;             // 1.5 (dampening above threshold)
  leverageThreshold: number;           // 1.50 (private debt/GDP where damping starts)
  privateAmortization: number;         // 0.05 (fraction of stock repaid per year ≈ 20yr avg maturity)

  // --- Risk premium ---
  debtRiskLambda: number;              // 0.03 (3bp per pp of excess total debt/GDP)
  debtRiskThreshold: number;           // 2.00 (total debt/GDP where premium starts)

  // Initial conditions
  initialCapitalStock: number;    // $ trillions (2025)
}

interface CapitalState {
  stock: number;              // Current capital stock ($ trillions)
  referenceGdpPerWorker: Record<Region, number>;  // Year-0 GDP/worker per region
  referenceGdpPerCapita: Record<Region, number>;  // Year-0 GDP/capita per region
  referenceLifeExpectancy: Record<Region, number>; // Year-0 LE per region
  referenceDependency: Record<Region, number>;     // Year-0 dependency ratio per region
  publicDebt: number;         // $ trillions
  privateDebt: number;        // $ trillions
  previousGdp: number;        // $ trillions (for GDP growth rate)
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
  regionalGdp: Record<Region, number>;  // $T per region (from demand)

  // From climate (optional)
  damages?: number;           // Damage fraction (0-1) for stability

  // From energy/dispatch (optional)
  netEnergyFactor?: number;   // Net energy fraction (0-1), lagged

  // From demand (optional, for investment split)
  energyBurden?: number;      // Energy cost as fraction of GDP (0-1)

  // From demographics (for retirement age adjustment)
  regionalLifeExpectancy?: Record<Region, number>;
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
  robotsDensity: number;      // Automation capital density (capital-derived, $/worker scaled)
  automationShare: number;    // Fraction of capital that is automation

  // Intensity
  kPerWorker: number;         // Capital per effective worker ($K/person)
  capitalOutputRatio: number; // K/Y ratio

  // Growth rate
  capitalGrowthRate: number;  // Annual growth rate of capital stock

  // Investment split
  energyInvestment: number;         // $ trillions to energy sector
  generalInvestment: number;        // $ trillions to general economy
  energyShareOfInvestment: number;  // Fraction going to energy

  // Intergenerational transfers
  retireeCost: number;          // $ trillions (pensions + healthcare for 65+)
  childCost: number;            // $ trillions (education for 0-19)
  transferBurden: number;       // (retireeCost + childCost) / GDP, capped at 0.50
  workerConsumption: number;    // $ trillions (GDP - investment - retireeCost - childCost - publicDebtService)

  // Debt/credit
  publicDebtGDP: number;       // ratio
  privateDebtGDP: number;      // ratio
  totalDebtGDP: number;        // ratio
  publicDebtService: number;   // $T (interest on public debt)
  creditImpulse: number;       // $T (net new private credit)
  debtRiskPremium: number;     // fraction added to interest rate
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
  savingsOld: 0,            // Explicit transfers now handle retirement consumption

  // Regional premiums
  savingsPremium: {
    oecd: 0.00,             // Baseline
    china: 0.15,            // +15% higher savings
    india: 0.02,            // Slightly above baseline
    latam: -0.05,           // Lower savings
    seasia: -0.02,          // Slightly below baseline
    russia: -0.03,          // Below baseline
    mena: 0.05,             // Oil wealth savings
    ssa: -0.08,             // Lowest savings
  },

  // Intergenerational transfers (OECD/ILO/World Bank calibrated)
  transfers: {
    educationRate: 0.04,    // Per-child education as fraction of GDP/capita
  },

  // Regional transfer premiums (override global defaults)
  transferPremium: {
    oecd:   { pensionRate: 0.35, healthcareRate: 0.10, educationRate: 0.05 },
    china:  { pensionRate: 0.25, healthcareRate: 0.06 },
    india:  { pensionRate: 0.10, healthcareRate: 0.03 },
    latam:  { pensionRate: 0.20, healthcareRate: 0.05 },
    seasia: { pensionRate: 0.12, healthcareRate: 0.03 },
    russia: { pensionRate: 0.25, healthcareRate: 0.05 },
    mena:   { pensionRate: 0.18, healthcareRate: 0.04 },
    ssa:    { pensionRate: 0.05, healthcareRate: 0.02, educationRate: 0.03 },
  },

  // G/C uncertainty premium
  stabilityLambda: 2.0,     // At 30% uncertainty: 15% investment suppression

  // Automation
  automationShare2025: 0.02,    // 2% of capital is robots/automation
  automationGrowth: 0.03,       // 3%/year growth in share
  automationShareCap: 0.20,     // Max 20% of capital
  robotsPerCapitalUnit: 8.6,    // Robots per $1000 automation K per worker

  // Investment split
  baseEnergyInvestmentShare: 0.15,   // 15% of investment goes to energy sector
  energyInvestmentSensitivity: 1.0,  // How much energy burden shifts allocation

  // Retirement age adjustment
  retirementAgeResponse: 0.67,  // OECD recommendation: 2/3 of LE gains → retirement age
  wageIndexation: 0.7,          // 70% wage-indexed, 30% price-indexed

  // Demographic savings response (Bloom et al. 2003, Kinugasa & Mason 2007)
  savingsLifeExpSensitivity: 0.5,     // LE elasticity: longer life → save more
  savingsDependencySensitivity: 0.3,  // Dependency elasticity: more dependents → save less

  // --- Public debt (IMF Global Debt Database, 2025) ---
  initialPublicDebtGDP: 0.90,         // 90% of GDP
  publicDeficitRate: 0.03,            // 3% structural primary deficit / GDP
  fiscalReactionCoeff: 0.03,          // Tightening per pp of debt/GDP above threshold
  fiscalReactionThreshold: 0.60,      // Maastricht-style trigger
  fiscalReactionMax: 0.04,            // Max primary surplus / GDP (saturation)

  // --- Private debt (BIS, ~160% of GDP globally in 2025) ---
  initialPrivateDebtGDP: 1.60,        // 160% of GDP
  baseCreditGrowth: 0.04,             // 4% new credit / GDP per year
  creditSensitivity: 1.0,             // Elasticity to r-g spread
  leverageDamping: 1.5,               // Dampening above threshold
  leverageThreshold: 1.50,            // Private debt/GDP where damping starts
  privateAmortization: 0.05,          // ~20yr avg maturity

  // --- Risk premium ---
  debtRiskLambda: 0.03,               // 3bp per pp of excess total debt/GDP
  debtRiskThreshold: 2.00,            // Total debt/GDP where premium starts

  // Initial conditions
  initialCapitalStock: 553,     // $553T PPP (K/Y ≈ 3.5 at $158T GDP)
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate demographic-weighted savings rate with LE and dependency adjustments.
 *
 * Life expectancy effect: longer life → save more for retirement (lifecycle motive).
 * Dependency effect: more dependents → less capacity to save.
 * Combined factor clamped to [0.5, 1.5] to prevent unreasonable extremes.
 */
function calculateSavingsRate(
  young: number,
  working: number,
  old: number,
  population: number,
  premium: number,
  params: CapitalParams,
  currentLE?: number,
  referenceLE?: number,
  currentDependency?: number,
  referenceDependency?: number,
): number {
  let effectiveWorking = params.savingsWorking;

  // Apply LE and dependency adjustments if reference values are available
  if (currentLE !== undefined && referenceLE !== undefined &&
      currentDependency !== undefined && referenceDependency !== undefined) {
    // Life expectancy effect: longer life → save more (log for diminishing returns)
    const leFactor = 1 + params.savingsLifeExpSensitivity *
      Math.log(currentLE / Math.max(referenceLE, 40));

    // Dependency effect: more dependents → save less (linear, symmetric)
    const depChange = referenceDependency > 0
      ? (currentDependency - referenceDependency) / referenceDependency
      : 0;
    const depFactor = 1 - params.savingsDependencySensitivity * depChange;

    // Clamp combined factor to [0.5, 1.5]
    effectiveWorking = params.savingsWorking *
      Math.max(0.5, Math.min(1.5, leFactor * depFactor));
  }

  const baseRate = (
    young * params.savingsYoung +
    working * effectiveWorking +
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
  if (capital <= 0) return params.depreciation; // Fallback
  return params.alpha * gdp / capital - params.depreciation;
}

/**
 * Automation capital density (capital-derived metric).
 * NOT the same as expansion.robotsPer1000 (which uses exponential growth and
 * drives energy demand). This metric tracks automation as a share of capital stock.
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

  paramMeta: {
    savingsWorking: {
      paramName: 'savingsRateWorking',
      description: 'Savings rate for working-age population. Higher in aging societies.',
      unit: 'fraction',
      range: { min: 0.20, max: 0.60, default: 0.45 },
      tier: 1 as const,
    },
    'transfers.educationRate': {
      paramName: 'educationRate',
      description: 'Per-child education as fraction of GDP per capita. Global ~0.04.',
      unit: 'fraction',
      range: { min: 0, max: 0.15, default: 0.04 },
      tier: 1 as const,
    },
    retirementAgeResponse: {
      description: 'Fraction of life expectancy gains that raise retirement age. OECD recommendation: 0.67.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.67 },
      tier: 1 as const,
    },
    wageIndexation: {
      description: 'Degree of wage indexation for transfers. 0=price-indexed (frozen real), 1=fully wage-indexed.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.7 },
      tier: 1 as const,
    },
    savingsLifeExpSensitivity: {
      description: 'Life expectancy elasticity on savings. Longer life → save more for retirement (lifecycle motive).',
      unit: 'elasticity',
      range: { min: 0, max: 1.0, default: 0.5 },
      tier: 1 as const,
    },
    savingsDependencySensitivity: {
      description: 'Dependency ratio elasticity on savings. More dependents → less capacity to save.',
      unit: 'elasticity',
      range: { min: 0, max: 1.0, default: 0.3 },
      tier: 1 as const,
    },
    baseCreditGrowth: {
      description: 'New private credit as fraction of GDP per year. Higher → faster capital accumulation but more leverage risk.',
      unit: 'fraction/year',
      range: { min: 0, max: 0.10, default: 0.04 },
      tier: 1 as const,
    },
    publicDeficitRate: {
      description: 'Structural primary deficit as fraction of GDP. Higher → more public debt accumulation.',
      unit: 'fraction/year',
      range: { min: 0, max: 0.10, default: 0.03 },
      tier: 1 as const,
    },
    debtRiskLambda: {
      description: 'Interest rate premium per percentage point of excess total debt/GDP above threshold. Self-limiting: high debt → expensive borrowing.',
      unit: 'fraction/pp',
      range: { min: 0, max: 0.10, default: 0.03 },
      tier: 1 as const,
    },
  },

  inputs: [
    'regionalYoung',
    'regionalWorking',
    'regionalOld',
    'regionalPopulation',
    'effectiveWorkers',
    'gdp',
    'regionalGdp',
    'damages',
    'netEnergyFactor',
    'energyBurden',
    'regionalLifeExpectancy',
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
    'energyInvestment',
    'generalInvestment',
    'energyShareOfInvestment',
    'retireeCost',
    'childCost',
    'transferBurden',
    'workerConsumption',
    'publicDebtGDP',
    'privateDebtGDP',
    'totalDebtGDP',
    'publicDebtService',
    'creditImpulse',
    'debtRiskPremium',
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
      if (params.initialCapitalStock < 1 || params.initialCapitalStock > 1000) {
        warnings.push('Initial capital stock outside typical range ($1T-$1000T)');
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

    if (params.retirementAgeResponse !== undefined) {
      if (params.retirementAgeResponse < 0 || params.retirementAgeResponse > 1) {
        errors.push('retirementAgeResponse must be between 0 and 1');
      }
    }

    if (params.wageIndexation !== undefined) {
      if (params.wageIndexation < 0 || params.wageIndexation > 1) {
        errors.push('wageIndexation must be between 0 and 1');
      }
    }

    if (params.savingsLifeExpSensitivity !== undefined) {
      if (params.savingsLifeExpSensitivity < 0 || params.savingsLifeExpSensitivity > 1) {
        errors.push('savingsLifeExpSensitivity must be between 0 and 1');
      }
    }

    if (params.savingsDependencySensitivity !== undefined) {
      if (params.savingsDependencySensitivity < 0 || params.savingsDependencySensitivity > 1) {
        errors.push('savingsDependencySensitivity must be between 0 and 1');
      }
    }

    if (params.transfers !== undefined) {
      const t = params.transfers;
      if (t.educationRate !== undefined && (t.educationRate < 0 || t.educationRate > 0.15)) {
        errors.push('Education rate must be between 0 and 0.15');
      }
    }

    // Debt params validation
    if (params.baseCreditGrowth !== undefined) {
      if (params.baseCreditGrowth < 0 || params.baseCreditGrowth > 0.15) {
        errors.push('baseCreditGrowth must be between 0 and 0.15');
      }
    }
    if (params.publicDeficitRate !== undefined) {
      if (params.publicDeficitRate < 0 || params.publicDeficitRate > 0.15) {
        errors.push('publicDeficitRate must be between 0 and 0.15');
      }
    }
    if (params.debtRiskLambda !== undefined) {
      if (params.debtRiskLambda < 0 || params.debtRiskLambda > 0.20) {
        errors.push('debtRiskLambda must be between 0 and 0.20');
      }
    }
    if (params.privateAmortization !== undefined) {
      if (params.privateAmortization < 0.01 || params.privateAmortization > 0.20) {
        errors.push('privateAmortization must be between 0.01 and 0.20');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<CapitalParams>): CapitalParams {
    return validatedMerge('capital', this.validate, (p) => {
      const merged = { ...capitalDefaults, ...p };

      // Merge regional premiums
      if (p.savingsPremium) {
        merged.savingsPremium = { ...capitalDefaults.savingsPremium, ...p.savingsPremium };
      }

      // Deep merge transfers
      if (p.transfers) {
        merged.transfers = { ...capitalDefaults.transfers, ...p.transfers };
      }

      // Deep merge transferPremium (per-region)
      if (p.transferPremium) {
        merged.transferPremium = { ...capitalDefaults.transferPremium };
        for (const r of REGIONS) {
          if (p.transferPremium[r]) {
            merged.transferPremium[r] = { ...capitalDefaults.transferPremium[r], ...p.transferPremium[r] };
          }
        }
      }

      return merged;
    }, partial);
  },

  init(params: CapitalParams): CapitalState {
    return {
      stock: params.initialCapitalStock,
      referenceGdpPerWorker: {} as Record<Region, number>,
      referenceGdpPerCapita: {} as Record<Region, number>,
      referenceLifeExpectancy: {} as Record<Region, number>,
      referenceDependency: {} as Record<Region, number>,
      publicDebt: 0,   // Initialized from GDP at yearIndex === 0
      privateDebt: 0,   // Initialized from GDP at yearIndex === 0
      previousGdp: 0,   // Initialized from inputs at yearIndex === 0
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

    // Calculate regional and global savings rates (with LE/dependency adjustments)
    const regionalSavings = {} as Record<Region, number>;
    let totalPop = 0;
    let weightedSavings = 0;

    for (const region of REGIONS) {
      const young = inputs.regionalYoung[region];
      const working = inputs.regionalWorking[region];
      const old = inputs.regionalOld[region];
      const pop = inputs.regionalPopulation[region];
      const premium = params.savingsPremium[region];

      // Current LE and dependency for this region
      const currentLE = inputs.regionalLifeExpectancy?.[region];
      const referenceLE = state.referenceLifeExpectancy[region];
      const currentDependency = working > 0 ? (young + old) / working : 0;
      const referenceDep = state.referenceDependency[region];

      const rate = calculateSavingsRate(
        young, working, old, pop, premium, params,
        currentLE, referenceLE, currentDependency, referenceDep,
      );
      regionalSavings[region] = rate;

      totalPop += pop;
      weightedSavings += rate * pop;
    }

    const savingsRate = weightedSavings / totalPop;

    // Calculate stability factor from damages (if provided)
    const uncertainty = inputs.damages ?? 0;
    const stability = calculateStability(uncertainty, params.stabilityLambda);

    // ==========================================================================
    // Intergenerational transfers: pension + healthcare (old), education (young)
    // With retirement age adjustment + wage indexation
    // ==========================================================================
    const MAX_TRANSFER_BURDEN = 0.50;
    let retireeCost = 0;
    let childCost = 0;

    // Capture reference values on first step (year 0)
    const refGdpPerWorker = { ...state.referenceGdpPerWorker };
    const refGdpPerCapita = { ...state.referenceGdpPerCapita };
    const refLE = { ...state.referenceLifeExpectancy };
    const refDependency = { ...state.referenceDependency };
    if (yearIndex === 0) {
      for (const r of REGIONS) {
        const working = inputs.regionalWorking[r] ?? 0;
        const pop = inputs.regionalPopulation[r] ?? 0;
        const regionGdp = inputs.regionalGdp[r] ?? 0;
        const young = inputs.regionalYoung[r] ?? 0;
        const old = inputs.regionalOld[r] ?? 0;
        refGdpPerWorker[r] = working > 0 ? regionGdp / working : 0;
        refGdpPerCapita[r] = pop > 0 ? regionGdp / pop : 0;
        refLE[r] = inputs.regionalLifeExpectancy?.[r] ?? 75;
        refDependency[r] = working > 0 ? (young + old) / working : 0;
      }
    }

    for (const r of REGIONS) {
      const regionGdp = inputs.regionalGdp[r] ?? 0;
      let old = inputs.regionalOld[r] ?? 0;
      const young = inputs.regionalYoung[r] ?? 0;
      let working = inputs.regionalWorking[r] ?? 0;
      const pop = inputs.regionalPopulation[r] ?? 0;
      const premium = params.transferPremium[r] ?? {};

      const pensionRate = premium.pensionRate!;      // All 8 regions define this in transferPremium
      const healthcareRate = premium.healthcareRate!; // All 8 regions define this in transferPremium
      const educationRate = premium.educationRate ?? params.transfers.educationRate;

      // --- Retirement age adjustment ---
      // As LE rises, some 65+ are reclassified as "still working" (lower transfer recipients)
      const currentLE = inputs.regionalLifeExpectancy?.[r] ?? 75;
      const baseLE = refLE[r] ?? 75;
      const leGain = Math.max(0, currentLE - baseLE);
      const effectiveRetirementAge = 65 + params.retirementAgeResponse * leGain;
      // Fraction of 65+ reclassified as working (capped at 0.5)
      const remainingOldSpan = currentLE - 65;
      const fractionStillWorking = remainingOldSpan > 0
        ? Math.min(0.5, Math.max(0, (effectiveRetirementAge - 65) / remainingOldSpan))
        : 0;
      const adjustedOld = old * (1 - fractionStillWorking);
      const adjustedWorking = working + old * fractionStillWorking;

      // --- Wage indexation ---
      // Blend current and reference GDP per worker/capita
      const currentGdpPerWorker = adjustedWorking > 0 ? regionGdp / adjustedWorking : 0;
      const currentGdpPerCapita = pop > 0 ? regionGdp / pop : 0;
      const wi = params.wageIndexation;
      const effectiveGdpPerWorker = wi * currentGdpPerWorker + (1 - wi) * (refGdpPerWorker[r] ?? currentGdpPerWorker);
      const effectiveGdpPerCapita = wi * currentGdpPerCapita + (1 - wi) * (refGdpPerCapita[r] ?? currentGdpPerCapita);

      // Use adjusted old population + blended GDP rates for transfer costs
      retireeCost += adjustedOld * (pensionRate * effectiveGdpPerWorker + healthcareRate * effectiveGdpPerCapita);
      childCost += young * educationRate * effectiveGdpPerCapita;
    }

    const transferBurden = Math.min(MAX_TRANSFER_BURDEN, inputs.gdp > 0 ? (retireeCost + childCost) / inputs.gdp : 0);

    // ==========================================================================
    // Debt/credit channel
    // ==========================================================================

    // Initialize debt stocks at yearIndex === 0
    let publicDebt = state.publicDebt;
    let privateDebt = state.privateDebt;
    let previousGdp = state.previousGdp;
    if (yearIndex === 0) {
      publicDebt = params.initialPublicDebtGDP * inputs.gdp;
      privateDebt = params.initialPrivateDebtGDP * inputs.gdp;
      previousGdp = inputs.gdp;
    }

    // Debt ratios (use beginning-of-period stocks)
    const publicDebtGDP = inputs.gdp > 0 ? publicDebt / inputs.gdp : 0;
    const privateDebtGDP = inputs.gdp > 0 ? privateDebt / inputs.gdp : 0;
    const totalDebtGDP = publicDebtGDP + privateDebtGDP;

    // Risk premium: high debt → expensive borrowing (self-limiting)
    const excessDebt = Math.max(0, totalDebtGDP - params.debtRiskThreshold);
    const debtRiskPremium = params.debtRiskLambda * excessDebt;

    // Interest rate = marginal product of capital + debt risk premium
    const baseInterestRate = calculateInterestRate(inputs.gdp, state.stock, params);
    const interestRate = baseInterestRate + debtRiskPremium;

    // --- Public debt dynamics ---
    // Debt service: interest on outstanding public debt (paid from GDP, not capitalized)
    const publicDebtService = interestRate * publicDebt;
    // Fiscal consolidation: primary surplus when debt/GDP exceeds threshold
    const fiscalConsolidation = Math.min(
      params.fiscalReactionMax * inputs.gdp,
      Math.max(0, params.fiscalReactionCoeff * (publicDebtGDP - params.fiscalReactionThreshold) * inputs.gdp),
    );
    // Primary deficit only (not interest) drives new debt accumulation.
    // Interest is serviced from tax revenue (already captured as GDP burden).
    // Debt/GDP dynamics: d' = d × r/(1+g) + primaryDeficit/GDP
    const primaryDeficit = params.publicDeficitRate * inputs.gdp - fiscalConsolidation;

    // --- Private debt / credit channel ---
    const gdpGrowth = previousGdp > 0 ? (inputs.gdp - previousGdp) / previousGdp : 0;
    const spreadFactor = Math.max(0.2, 1 - params.creditSensitivity * Math.max(0, interestRate - gdpGrowth));
    const leverageFactor = Math.max(0.1, 1 - params.leverageDamping * Math.max(0, privateDebtGDP - params.leverageThreshold));
    const creditImpulse = params.baseCreditGrowth * inputs.gdp * spreadFactor * leverageFactor;
    const amortization = privateDebt * params.privateAmortization;

    // --- Investment: gross savings + credit impulse ---
    // Public debt service is a burden on GDP (like transfers)
    const totalBurden = Math.min(0.50, transferBurden + (inputs.gdp > 0 ? publicDebtService / inputs.gdp : 0));
    const availableGdp = inputs.gdp * (1 - totalBurden);
    const netEnergyFactor = Math.max(0, Math.min(1, inputs.netEnergyFactor ?? 1));
    const grossSavings = availableGdp * savingsRate * stability * netEnergyFactor;
    const investment = Math.max(0, grossSavings + creditImpulse);

    // Worker consumption = residual (20% floor prevents negative)
    const MIN_WORKER_CONSUMPTION_SHARE = 0.20;
    const workerConsumption = Math.max(
      MIN_WORKER_CONSUMPTION_SHARE * inputs.gdp,
      inputs.gdp - investment - retireeCost - childCost - publicDebtService,
    );

    // Split investment between energy and general economy
    // When energy is scarce/expensive → more investment flows to energy
    const burden = inputs.energyBurden ?? 0.05;
    const burdenSignal = burden / 0.08; // Normalized to threshold (1.0 = normal)
    const energyShare = Math.min(0.30, Math.max(0.10,
      params.baseEnergyInvestmentShare * (1 + params.energyInvestmentSensitivity * (burdenSignal - 1))
    ));
    const energyInvestment = investment * energyShare;
    const generalInvestment = investment * (1 - energyShare);

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

    // Update capital stock: only general investment builds general capital
    const newStock = (1 - params.depreciation) * state.stock + generalInvestment;

    // Capital growth rate
    const capitalGrowthRate = yearIndex > 0 && state.stock > 0
      ? (newStock - state.stock) / state.stock
      : 0;

    // Update debt stocks
    // Public: only primary deficit accumulates (interest paid from tax revenue, not new borrowing)
    const newPublicDebt = Math.max(0, publicDebt + primaryDeficit);
    const newPrivateDebt = Math.max(0, privateDebt + creditImpulse - amortization);

    return {
      state: {
        stock: newStock,
        referenceGdpPerWorker: refGdpPerWorker,
        referenceGdpPerCapita: refGdpPerCapita,
        referenceLifeExpectancy: refLE,
        referenceDependency: refDependency,
        publicDebt: newPublicDebt,
        privateDebt: newPrivateDebt,
        previousGdp: inputs.gdp,
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
        energyInvestment,
        generalInvestment,
        energyShareOfInvestment: energyShare,
        retireeCost,
        childCost,
        transferBurden,
        workerConsumption,
        publicDebtGDP,
        privateDebtGDP,
        totalDebtGDP,
        publicDebtService,
        creditImpulse,
        debtRiskPremium,
      },
    };
  },
};
