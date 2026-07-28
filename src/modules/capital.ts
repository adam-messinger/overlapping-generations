/**
 * Capital Module
 *
 * Capital, monetary-circuit, and automation dynamics.
 *
 * The demographic saving propensity remains an OLG distributional diagnostic,
 * but it is not a pool that banks add to newly created credit. Firms place
 * profit-responsive investment orders, use internal cash flow, and ask banks
 * to create deposits for the remaining financing gap. Household saving is
 * measured ex post from income less consumption.
 *
 * Key equations:
 * - Savings rate: Demographic-weighted average of cohort savings rates
 * - Stability: Φ = 1 / (1 + λ × uncertainty²)
 * - Government services: retiree healthcare + education
 * - Cash transfers: pensions and public-debt interest (not GDP final uses)
 * - Interest rate: r = α × Y/K - δ + debtRiskPremium
 * - Profit after interest and depreciation: Π = α(Y-G) - rD - δK
 * - Investment orders: I* = δK + boundedProfitResponse(Π/K)
 * - Finance: I = min(I*, firmInternalFunds + netCashCredit, Y-G)
 * - Household saving: S_h = disposableIncome - householdConsumption
 * - National accounts: GDP = HouseholdConsumption + Investment + GovernmentServices
 * - Capital accumulation: K_{t+1} = (1-δ)K_t + I_general
 * - Public debt: ΔD = primaryDeficit - fiscalConsolidation
 * - Private debt: ΔD = gross originations - principal repayments - write-offs
 *
 * Sources:
 * - Penn World Table: K/Y ratio ~3.5, global capital stock ~$420T
 * - OLG theory: Lifecycle savings rates by age cohort
 * - Keen (2011): profit-responsive investment and bank-created deposits in a
 *   monetary circuit; the bounded response here is a toy adaptation
 * - Bank of England (2014): lending creates deposits and repayment destroys
 *   deposit money
 * - Uncertainty damping Φ = 1/(1+λu²): an ad-hoc form inspired by
 *   Galbraith/Chen entropy economics; only this factor is implemented, and
 *   the framework's emphasized Jevons/rebound dynamics are absent
 */

import { Region, REGIONS } from '../domain-types.js';
import {
  defineModule,
  type GodleyLedgerState,
  integrateFlow,
  Module,
  subtractQuantities,
  sumQuantities,
  unitPort,
  unitQuantity,
  validatedMerge,
} from 'tsimulation';
import { advanceCapitalFinance } from './capital-finance.js';
import {
  capitalBankCapitalRatio,
  createCapitalGodleyLedger,
  postCapitalGodleyYear,
} from './capital-accounting.js';

// =============================================================================
// TYPES
// =============================================================================

export interface TransferParams {
  educationRate: number;    // Per-child education as fraction of GDP/capita
  // Pension/healthcare have no global default: every region defines them in
  // transferPremium (step() relies on that via non-null assertions)
  pensionRate?: number;     // Per-retiree pension as fraction of GDP/capita
  healthcareRate?: number;  // Per-retiree healthcare as fraction of GDP/capita
}

export interface CapitalParams {
  // Production
  alpha: number;              // Capital share in Cobb-Douglas (~0.33)
  depreciation: number;       // Annual depreciation rate (~0.05)
  firmRetentionRate: number;  // Share of positive after-interest profit retained
  investmentProfitRateFloor: number; // Profit rate below which only replacement is ordered
  investmentProfitRateCeiling: number; // Profit rate at which net investment response saturates
  maximumNetInvestmentRate: number; // Maximum desired net investment / capital

  // OLG lifecycle savings rates
  savingsYoung: number;       // Ages 0-19: dependents (0)
  savingsWorking: number;     // Ages 20-64: prime savers (~0.45)
  savingsOld: number;         // Ages 65+: dissaving (0, replaced by explicit transfers)

  // Regional savings premiums
  savingsPremium: Record<Region, number>;

  // Intergenerational transfers
  transfers: TransferParams;
  transferPremium: Record<Region, Partial<TransferParams>>;

  stabilityLambda: number;    // Sensitivity to uncertainty (see Key equations)

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
  loanRolloverRate: number;             // Share of repaid principal refinanced
  privateDefaultRate: number;          // Annual loan write-off rate (0 in baseline)
  financialSubsteps: number;           // Within-year debt integration steps (4 = quarterly)
  bankEquityRatio: number;             // Opening bank equity / assets
  openingHouseholdDepositShare: number; // Initial deposits held by households

  // --- Risk premium ---
  debtRiskLambda: number;              // 0.03 (3bp per pp of excess total debt/GDP)
  debtRiskThreshold: number;           // 2.00 (total debt/GDP where premium starts)

  // Initial conditions
  initialCapitalStock: number;    // $ trillions (2025)
}

export interface CapitalState {
  stock: number;              // Current capital stock ($ trillions)
  referenceGdpPerWorker: Record<Region, number>;  // Year-0 GDP/worker per region
  referenceGdpPerCapita: Record<Region, number>;  // Year-0 GDP/capita per region
  referenceLifeExpectancy: Record<Region, number>; // Year-0 LE per region
  referenceDependency: Record<Region, number>;     // Year-0 dependency ratio per region
  publicDebt: number;         // $ trillions
  privateDebt: number;        // $ trillions
  previousGdp: number;        // $ trillions (for GDP growth rate)
  financialLedger?: GodleyLedgerState;
}

export interface CapitalInputs {
  /** Realized energy capex $T (from energy, lagged). Unwired fallback: the internal burden-driven estimate (pre-ledger behavior) */
  energyCapexSpend?: number;
  /** Realized CDR spend $T (from cdr, lagged). Unwired fallback: 0 (free CDR — pre-ledger behavior) */
  cdrSpend?: number;
  /** Realized robot fleet capex $T (from demand, lagged). Unwired fallback: 0 (free robots — pre-ledger behavior) */
  robotCapexSpend?: number;
  /** Realized composite chips + datacenter capex $T (from demand, lagged). Unwired fallback: 0 */
  dataCenterCapexSpend?: number;
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

export interface CapitalOutputs {
  // Stock and flows
  stock: number;              // Capital stock ($ trillions)
  nextCapitalStock: number;   // End-of-period capital stock ($ trillions)
  investment: number;         // Annual investment ($ trillions)
  plannedInvestment: number;  // Desired annual investment before final-use feasibility cap
  unfundedInvestmentDemand: number; // Desired investment above the feasible final-use envelope
  unfundedFinancingDemand: number; // Orders not covered by internal funds and net bank credit
  grossSavings: number;       // Deprecated-compatible alias for ex-post national gross saving

  // Monetary circuit and sectoral saving
  laborCompensation: number;
  operatingSurplus: number;
  privateInterestPayments: number;
  profitAfterInterestAndDepreciation: number;
  profitRate: number;
  retainedEarnings: number;
  firmDividendPayments: number;
  bankDividendPayments: number;
  firmInternalFunds: number;
  householdDisposableIncome: number;
  householdSaving: number;
  householdSavingRate: number;
  firmGrossSaving: number;
  governmentSaving: number;
  bankSaving: number;
  nationalSaving: number;
  savingInvestmentResidual: number;
  householdSavingLedgerResidual: number;

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
  energyInvestment: number;         // $T BUDGET signal to energy (availableInvestment fallback); the K debit uses realized spends (energyCapexSpend)
  generalInvestment: number;        // $ trillions to general economy
  unfundedRealizedSpend: number;    // $T of realized spends exceeding the investment pool (floor binding)
  energyShareOfInvestment: number;  // Fraction going to energy

  // Intergenerational transfers
  retireeCost: number;          // $ trillions (pensions + healthcare for 65+)
  childCost: number;            // $ trillions (education for 0-19)
  regionalRetireeCost: Record<Region, number>; // $ trillions by region
  regionalChildCost: Record<Region, number>;   // $ trillions by region
  pensionTransfers: number;     // Cash pensions; redistribution, not a GDP final use
  retireeHealthcareConsumption: number; // Government-purchased retiree healthcare
  educationConsumption: number; // Government-purchased education services
  governmentServiceConsumption: number; // Healthcare + education in GDP final uses
  regionalPensionTransfers: Record<Region, number>;
  regionalRetireeHealthcareConsumption: Record<Region, number>;
  regionalEducationConsumption: Record<Region, number>;
  transferBurden: number;       // Cash pensions + government dependent services / GDP
  householdConsumption: number; // GDP - investment - government services
  retireeConsumption: number;   // Household consumption allocated to pension recipients
  workerConsumption: number;    // Remaining household consumption
  nationalAccountsResidual: number; // GDP - C - I - G

  // Debt/credit
  publicDebtGDP: number;       // ratio
  privateDebtGDP: number;      // ratio
  totalDebtGDP: number;        // ratio
  privateDebtStock: number;    // Beginning-of-period private debt ($T)
  nextPrivateDebtStock: number;// End-of-period private debt ($T)
  publicDebtStock: number;     // Beginning-of-period public debt ($T)
  nextPublicDebtStock: number; // End-of-period public debt ($T)
  publicInterestPayments: number; // $T/year interest transfer to bondholders
  publicInterestToHouseholds: number; // Direct interest on household-held bonds
  publicInterestToBanks: number; // Interest on bank-held public bonds
  publicDebtService: number;   // Deprecated alias for publicInterestPayments
  grossLoanOriginations: number; // $T/year including refinanced principal
  newInvestmentLoanOriginations: number; // $T/year of genuinely new investment credit
  refinancedPrincipal: number; // $T/year of maturing principal rolled into new loans
  unfundedCreditDemand: number; // $T/year requested investment credit not supplied
  creditImpulse: number;       // Deprecated alias for newInvestmentLoanOriginations
  principalRepayments: number; // $T/year of private-loan principal repaid
  loanWriteOffs: number;       // $T/year of private loans written off
  netCreditCreation: number;   // Change in private debt stock
  primaryDeficit: number;      // Net public-debt issuance
  netTaxes: number;            // Taxes net of rebates needed by the fiscal closure
  debtRiskPremium: number;     // fraction added to interest rate
  bankEquity: number;          // Closing consolidated bank net worth
  bankEquityShortfall: number; // Amount required to restore non-negative equity
  bankCapitalRatio: number;    // Closing bank equity / bank assets
  financialLedgerResidual: number; // Maximum Godley accounting residual
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const capitalDefaults: CapitalParams = {
  // Production
  // Capital INCOME share for interest-rate formation (r = alpha*Y/K - delta):
  // deliberately not production's fitted Ayres-Warr elasticity (0.25) — fitted
  // output elasticities differ from factor cost shares (Kuemmel et al. 2010),
  // and r tracks what capital is paid, not the fitted marginal product.
  alpha: 0.33,              // ~1/3: Gollin (2002), Penn World Table labor-share complement
  depreciation: 0.05,       // Penn World Table 10.x average depreciation ~5%/yr
  // Bounded toy version of Keen's profit-responsive investment function.
  // These values keep the 2025 gross-investment rate near the pre-circuit
  // calibration while making investment orders causally prior to saving.
  firmRetentionRate: 0.90,
  investmentProfitRateFloor: 0,
  investmentProfitRateCeiling: 0.025,
  maximumNetInvestmentRate: 0.038,

  // OLG lifecycle savings
  savingsYoung: 0.0,        // Dependents don't save
  savingsWorking: 0.45,     // Prime savers (calibrated to ~22% global rate)
  savingsOld: 0,            // Explicit transfers now handle retirement consumption

  // Regional premiums: calibrated to gross national savings differentials
  // (World Bank WDI 2023: China ~44% of GDP, OECD ~22-24%, SSA ~18-20%).
  // NOTE: the energy module's REGIONAL_FINANCING_SPREADS residuals are
  // derived from the 2025 savings rates these produce; changing them is
  // caught by the spread-calibration test in simulation.test.ts.
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

  // Regional transfer premiums (per-recipient rates as fractions of
  // GDP/capita), calibrated so aggregate spending reproduces OECD Pensions
  // at a Glance 2023 (public pensions ~7-9% GDP in OECD, <2% in SSA) and
  // WHO/World Bank health expenditure shares
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

  // Automation: share trajectory is a modeling assumption; robot density
  // calibrated to IFR World Robotics 2024 (~4M industrial robots in
  // operation, ~162 per 10k manufacturing workers globally)
  automationShare2025: 0.02,    // 2% of capital is robots/automation
  automationGrowth: 0.03,       // 3%/year growth in share
  automationShareCap: 0.20,     // Max 20% of capital
  robotsPerCapitalUnit: 8.6,    // Robots per $1000 automation K per worker (calibrated to IFR 2024 stock)

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
  // Baseline assumes scheduled principal is rolled over; scenarios can force
  // deleveraging by lowering this ratio. Rollover creates no net spending power.
  loanRolloverRate: 1,
  // No baseline default mechanism is assumed. Scenarios must turn write-offs
  // on explicitly; doing so hits bank equity one-for-one in the Godley ledger.
  privateDefaultRate: 0,
  financialSubsteps: 4,
  // Scenario capitalization target, not a claim about a specific Basel
  // regulatory numerator or risk-weighted denominator.
  bankEquityRatio: 0.10,
  openingHouseholdDepositShare: 0.50,

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
 * Uncertainty damping on desired net investment: Φ = 1 / (1 + λu²).
 * Provenance and scope in the module header's Key equations block.
 */
function calculateStability(uncertainty: number, lambda: number): number {
  return 1 / (1 + lambda * uncertainty * uncertainty);
}

interface FirmCircuit {
  laborCompensation: number;
  operatingSurplus: number;
  depreciationAllowance: number;
  profitAfterInterestAndDepreciation: number;
  profitRate: number;
  retainedEarnings: number;
  firmDividendPayments: number;
  firmGrossSaving: number;
  firmInternalFunds: number;
  plannedInvestment: number;
}

function calculateFirmCircuit(
  gdp: number,
  governmentServiceConsumption: number,
  capitalStock: number,
  privateInterestPayments: number,
  stability: number,
  netEnergyFactor: number,
  params: CapitalParams,
): FirmCircuit {
  const marketOutput = Math.max(0, gdp - governmentServiceConsumption);
  const operatingSurplus = params.alpha * marketOutput;
  const laborCompensation = marketOutput - operatingSurplus;
  const depreciationAllowance = params.depreciation * capitalStock;
  const profitAfterInterestAndDepreciation =
    operatingSurplus - privateInterestPayments - depreciationAllowance;
  const profitRate = capitalStock > 0
    ? profitAfterInterestAndDepreciation / capitalStock
    : 0;

  // Losses are retained by definition; only positive profit can be paid out.
  const firmDividendPayments =
    Math.max(0, profitAfterInterestAndDepreciation)
    * (1 - params.firmRetentionRate);
  const retainedEarnings =
    profitAfterInterestAndDepreciation - firmDividendPayments;
  const firmGrossSaving = depreciationAllowance + retainedEarnings;
  const firmInternalFunds = Math.max(0, firmGrossSaving);

  const responseWidth = Math.max(
    Number.EPSILON,
    params.investmentProfitRateCeiling - params.investmentProfitRateFloor,
  );
  const normalizedProfit = Math.max(0, Math.min(
    1,
    (profitRate - params.investmentProfitRateFloor) / responseWidth,
  ));
  const smoothProfitSignal =
    normalizedProfit * normalizedProfit * (3 - 2 * normalizedProfit);
  const desiredNetInvestment =
    capitalStock
    * params.maximumNetInvestmentRate
    * smoothProfitSignal
    * stability
    * netEnergyFactor;

  return {
    laborCompensation,
    operatingSurplus,
    depreciationAllowance,
    profitAfterInterestAndDepreciation,
    profitRate,
    retainedEarnings,
    firmDividendPayments,
    firmGrossSaving,
    firmInternalFunds,
    plannedInvestment: Math.max(0, depreciationAllowance + desiredNetInvestment),
  };
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
> = defineModule<CapitalParams, CapitalState, CapitalInputs, CapitalOutputs>({
  name: 'capital',
  description: 'Profit-led capital accumulation with a stock-flow-consistent monetary circuit',
  defaults: capitalDefaults,

  paramMeta: {
    firmRetentionRate: {
      description: 'Share of positive firm profit retained after interest and depreciation; retained profit contributes internal investment finance.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.90 },
      tier: 1 as const,
    },
    investmentProfitRateCeiling: {
      description: 'Firm profit rate at which the bounded desired net-investment response reaches its maximum.',
      unit: 'fraction/year',
      range: { min: 0.005, max: 0.15, default: 0.025 },
      tier: 1 as const,
    },
    maximumNetInvestmentRate: {
      description: 'Maximum desired net investment as a fraction of the capital stock when the profit response saturates.',
      unit: 'fraction/year',
      range: { min: 0, max: 0.20, default: 0.038 },
      tier: 1 as const,
    },
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
      description: 'Bank capacity for net-new investment credit as a fraction of GDP per year. Principal refinancing is tracked separately.',
      unit: 'fraction/year',
      range: { min: 0, max: 0.10, default: 0.04 },
      tier: 1 as const,
    },
    loanRolloverRate: {
      description: 'Share of scheduled private-loan principal refinanced. Refinancing replaces maturing debt without funding new investment.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 1 },
      tier: 2 as const,
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
    privateDefaultRate: {
      description: 'Annual private-loan write-off rate. Write-offs reduce borrower liabilities and bank equity one-for-one.',
      unit: 'fraction/year',
      range: { min: 0, max: 0.20, default: 0 },
      tier: 2 as const,
    },
    financialSubsteps: {
      description: 'Within-year integration steps for debt, risk-premium, repayment, and credit feedback.',
      unit: 'steps/year',
      range: { min: 1, max: 12, default: 4 },
      tier: 2 as const,
    },
    bankEquityRatio: {
      description: 'Opening consolidated bank equity as a share of bank assets; a scenario balance-sheet assumption.',
      unit: 'fraction',
      range: { min: 0.01, max: 0.30, default: 0.10 },
      tier: 2 as const,
    },
    openingHouseholdDepositShare: {
      description: 'Share of the opening bank-deposit stock held by households; the remainder is held by firms.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.50 },
      tier: 2 as const,
    },
  },

  connectorTypes: {
    inputs: {
      regionalYoung: unitPort('people', 'record'),
      regionalWorking: unitPort('people', 'record'),
      regionalOld: unitPort('people', 'record'),
      regionalPopulation: unitPort('people', 'record'),
      effectiveWorkers: unitPort('people'),
      gdp: unitPort('$T/year'),
      regionalGdp: unitPort('$T/year', 'record'),
      damages: unitPort('fraction'),
      netEnergyFactor: unitPort('fraction'),
      energyBurden: unitPort('fraction'),
      regionalLifeExpectancy: unitPort('year', 'record'),
      energyCapexSpend: unitPort('$T/year'),
      cdrSpend: unitPort('$T/year'),
      robotCapexSpend: unitPort('$T/year'),
      dataCenterCapexSpend: unitPort('$T/year'),
    },
    outputs: {
      stock: unitPort('$T'),
      nextCapitalStock: unitPort('$T'),
      investment: unitPort('$T/year'),
      plannedInvestment: unitPort('$T/year'),
      unfundedInvestmentDemand: unitPort('$T/year'),
      unfundedFinancingDemand: unitPort('$T/year'),
      grossSavings: unitPort('$T/year'),
      laborCompensation: unitPort('$T/year'),
      operatingSurplus: unitPort('$T/year'),
      privateInterestPayments: unitPort('$T/year'),
      profitAfterInterestAndDepreciation: unitPort('$T/year'),
      profitRate: unitPort('fraction/year'),
      retainedEarnings: unitPort('$T/year'),
      firmDividendPayments: unitPort('$T/year'),
      bankDividendPayments: unitPort('$T/year'),
      firmInternalFunds: unitPort('$T/year'),
      householdDisposableIncome: unitPort('$T/year'),
      householdSaving: unitPort('$T/year'),
      householdSavingRate: unitPort('fraction'),
      firmGrossSaving: unitPort('$T/year'),
      governmentSaving: unitPort('$T/year'),
      bankSaving: unitPort('$T/year'),
      nationalSaving: unitPort('$T/year'),
      savingInvestmentResidual: unitPort('$T/year'),
      householdSavingLedgerResidual: unitPort('$T/year'),
      savingsRate: unitPort('fraction'),
      regionalSavings: unitPort('fraction', 'record'),
      stability: unitPort('fraction'),
      interestRate: unitPort('fraction'),
      robotsDensity: unitPort('robot/kpeople'),
      automationShare: unitPort('fraction'),
      kPerWorker: unitPort('$k/people'),
      capitalOutputRatio: unitPort('year'),
      capitalGrowthRate: unitPort('fraction/year'),
      energyInvestment: unitPort('$T/year'),
      generalInvestment: unitPort('$T/year'),
      unfundedRealizedSpend: unitPort('$T/year'),
      energyShareOfInvestment: unitPort('fraction'),
      retireeCost: unitPort('$T/year'),
      childCost: unitPort('$T/year'),
      regionalRetireeCost: unitPort('$T/year', 'record'),
      regionalChildCost: unitPort('$T/year', 'record'),
      pensionTransfers: unitPort('$T/year'),
      retireeHealthcareConsumption: unitPort('$T/year'),
      educationConsumption: unitPort('$T/year'),
      governmentServiceConsumption: unitPort('$T/year'),
      regionalPensionTransfers: unitPort('$T/year', 'record'),
      regionalRetireeHealthcareConsumption: unitPort('$T/year', 'record'),
      regionalEducationConsumption: unitPort('$T/year', 'record'),
      transferBurden: unitPort('fraction'),
      householdConsumption: unitPort('$T/year'),
      retireeConsumption: unitPort('$T/year'),
      workerConsumption: unitPort('$T/year'),
      nationalAccountsResidual: unitPort('$T/year'),
      publicDebtGDP: unitPort('fraction'),
      privateDebtGDP: unitPort('fraction'),
      totalDebtGDP: unitPort('fraction'),
      privateDebtStock: unitPort('$T'),
      nextPrivateDebtStock: unitPort('$T'),
      publicDebtStock: unitPort('$T'),
      nextPublicDebtStock: unitPort('$T'),
      publicInterestPayments: unitPort('$T/year'),
      publicInterestToHouseholds: unitPort('$T/year'),
      publicInterestToBanks: unitPort('$T/year'),
      publicDebtService: unitPort('$T/year'),
      grossLoanOriginations: unitPort('$T/year'),
      newInvestmentLoanOriginations: unitPort('$T/year'),
      refinancedPrincipal: unitPort('$T/year'),
      unfundedCreditDemand: unitPort('$T/year'),
      creditImpulse: unitPort('$T/year'),
      principalRepayments: unitPort('$T/year'),
      loanWriteOffs: unitPort('$T/year'),
      netCreditCreation: unitPort('$T/year'),
      primaryDeficit: unitPort('$T/year'),
      netTaxes: unitPort('$T/year'),
      debtRiskPremium: unitPort('fraction'),
      bankEquity: unitPort('$T'),
      bankEquityShortfall: unitPort('$T'),
      bankCapitalRatio: unitPort('fraction'),
      financialLedgerResidual: unitPort('$T'),
    },
  },

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
    if (
      params.firmRetentionRate !== undefined
      && (params.firmRetentionRate < 0 || params.firmRetentionRate > 1)
    ) {
      errors.push('firmRetentionRate must be between 0 and 1');
    }
    if (
      params.maximumNetInvestmentRate !== undefined
      && (
        params.maximumNetInvestmentRate < 0
        || params.maximumNetInvestmentRate > 0.20
      )
    ) {
      errors.push('maximumNetInvestmentRate must be between 0 and 0.20');
    }
    const profitFloor =
      params.investmentProfitRateFloor
      ?? capitalDefaults.investmentProfitRateFloor;
    const profitCeiling =
      params.investmentProfitRateCeiling
      ?? capitalDefaults.investmentProfitRateCeiling;
    if (!Number.isFinite(profitFloor) || !Number.isFinite(profitCeiling)) {
      errors.push('investment profit-rate bounds must be finite');
    } else if (profitCeiling <= profitFloor) {
      errors.push('investmentProfitRateCeiling must exceed investmentProfitRateFloor');
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
    if (
      params.loanRolloverRate !== undefined
      && (params.loanRolloverRate < 0 || params.loanRolloverRate > 1)
    ) {
      errors.push('loanRolloverRate must be between 0 and 1');
    }
    if (params.privateDefaultRate !== undefined) {
      if (params.privateDefaultRate < 0 || params.privateDefaultRate > 0.20) {
        errors.push('privateDefaultRate must be between 0 and 0.20');
      }
    }
    if (params.financialSubsteps !== undefined) {
      if (
        !Number.isInteger(params.financialSubsteps)
        || params.financialSubsteps < 1
        || params.financialSubsteps > 12
      ) {
        errors.push('financialSubsteps must be an integer between 1 and 12');
      }
    }
    if (params.bankEquityRatio !== undefined) {
      if (params.bankEquityRatio < 0.01 || params.bankEquityRatio > 0.30) {
        errors.push('bankEquityRatio must be between 0.01 and 0.30');
      }
    }
    if (
      params.openingHouseholdDepositShare !== undefined
      && (
        params.openingHouseholdDepositShare < 0
        || params.openingHouseholdDepositShare > 1
      )
    ) {
      errors.push('openingHouseholdDepositShare must be between 0 and 1');
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
      financialLedger: undefined,
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
    let totalGdp = 0;
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

      // Savings rates are shares of GDP (World Bank WDI: gross savings % of
      // GDP), so the global rate is a GDP-weighted mean. Population weighting
      // overstated poor, populous regions' pull on the global capital pool
      // by roughly their population/GDP share ratio.
      const gdpWeight = Math.max(0, inputs.regionalGdp[region]);
      totalGdp += gdpWeight;
      weightedSavings += rate * gdpWeight;
    }

    // Unreachable divide guard (regional GDP is positive every wired step);
    // fallback ≈ savingsWorking × working-age share ≈ the ~22% global rate.
    const savingsRate = totalGdp > 0 ? weightedSavings / totalGdp : params.savingsWorking * 0.5;

    // Calculate stability factor from damages (if provided)
    const uncertainty = inputs.damages ?? 0;
    const stability = calculateStability(uncertainty, params.stabilityLambda);

    // ==========================================================================
    // Intergenerational fiscal flows, with retirement-age adjustment and wage
    // indexation. Pensions are cash transfers; healthcare and education are
    // government purchases of final services. Keeping these categories
    // separate prevents transfers from being added to GDP as if they were
    // newly produced output.
    // ==========================================================================
    let pensionTransfers = 0;
    let retireeHealthcareConsumption = 0;
    let educationConsumption = 0;
    const regionalPensionTransfers = Object.fromEntries(
      REGIONS.map(r => [r, 0])
    ) as Record<Region, number>;
    const regionalRetireeHealthcareConsumption = Object.fromEntries(
      REGIONS.map(r => [r, 0])
    ) as Record<Region, number>;
    const regionalEducationConsumption = Object.fromEntries(
      REGIONS.map(r => [r, 0])
    ) as Record<Region, number>;
    const regionalRetireeCost = Object.fromEntries(
      REGIONS.map(r => [r, 0])
    ) as Record<Region, number>;
    const regionalChildCost = Object.fromEntries(
      REGIONS.map(r => [r, 0])
    ) as Record<Region, number>;

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

      // All 8 regions define these in transferPremium defaults (mergeParams
      // deep-merges per region); ?? 0 keeps a malformed direct override from
      // turning retireeCost into NaN
      const pensionRate = premium.pensionRate ?? 0;
      const healthcareRate = premium.healthcareRate ?? 0;
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

      const regionPensionTransfers =
        adjustedOld * pensionRate * effectiveGdpPerWorker;
      const regionRetireeHealthcare =
        adjustedOld * healthcareRate * effectiveGdpPerCapita;
      const regionEducation = young * educationRate * effectiveGdpPerCapita;
      const regionRetireeCost = regionPensionTransfers + regionRetireeHealthcare;
      const regionChildCost = regionEducation;
      regionalPensionTransfers[r] = regionPensionTransfers;
      regionalRetireeHealthcareConsumption[r] = regionRetireeHealthcare;
      regionalEducationConsumption[r] = regionEducation;
      regionalRetireeCost[r] = regionRetireeCost;
      regionalChildCost[r] = regionChildCost;
      pensionTransfers += regionPensionTransfers;
      retireeHealthcareConsumption += regionRetireeHealthcare;
      educationConsumption += regionEducation;
    }

    // Legacy aggregate names remain as transparent sums for downstream
    // compatibility. New accounting code uses the disaggregated categories.
    const retireeCost = pensionTransfers + retireeHealthcareConsumption;
    const childCost = educationConsumption;
    const governmentServiceConsumption =
      retireeHealthcareConsumption + educationConsumption;
    const transferBurden = inputs.gdp > 0 ? (retireeCost + childCost) / inputs.gdp : 0;

    // ==========================================================================
    // Keen-style monetary circuit (toy closure):
    // expected profit -> investment orders -> bank financing -> income and
    // payments -> ex-post saving -> debt service/default.
    //
    // Saving is deliberately not added to bank credit as a second funding
    // pool. Internal firm cash flow and net new bank deposits finance orders;
    // household and national saving are measured after expenditure occurs.
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

    const financeState = { publicDebt, privateDebt, previousGdp };
    const maximumFeasibleInvestment = Math.max(
      0,
      inputs.gdp - governmentServiceConsumption,
    );
    const netEnergyFactor = Math.max(0, Math.min(1, inputs.netEnergyFactor ?? 1));

    // Credit affects debt and interest within the year, while interest affects
    // profit and the financing request. Iterate this small fixed point so the
    // reported order, interest bill, and requested credit are mutually
    // consistent rather than relying on an arbitrary call order.
    let netNewCreditDemand = 0;
    let finance = advanceCapitalFinance(
      financeState,
      {
        gdp: inputs.gdp,
        capitalStock: state.stock,
        netNewCreditDemand,
      },
      params,
    );
    let firmCircuit = calculateFirmCircuit(
      inputs.gdp,
      governmentServiceConsumption,
      state.stock,
      finance.privateInterestPayments,
      stability,
      netEnergyFactor,
      params,
    );
    for (let iteration = 0; iteration < 12; iteration++) {
      const nextDemand = Math.max(
        0,
        Math.min(firmCircuit.plannedInvestment, maximumFeasibleInvestment)
          - firmCircuit.firmInternalFunds,
      );
      if (
        Math.abs(nextDemand - netNewCreditDemand)
        <= 1e-10 * Math.max(1, nextDemand)
      ) {
        netNewCreditDemand = nextDemand;
        break;
      }
      netNewCreditDemand = nextDemand;
      finance = advanceCapitalFinance(
        financeState,
        {
          gdp: inputs.gdp,
          capitalStock: state.stock,
          netNewCreditDemand,
        },
        params,
      );
      firmCircuit = calculateFirmCircuit(
        inputs.gdp,
        governmentServiceConsumption,
        state.stock,
        finance.privateInterestPayments,
        stability,
        netEnergyFactor,
        params,
      );
    }
    // One final evaluation associates the financial stocks and flows exactly
    // with the converged financing request.
    finance = advanceCapitalFinance(
      financeState,
      {
        gdp: inputs.gdp,
        capitalStock: state.stock,
        netNewCreditDemand,
      },
      params,
    );
    firmCircuit = calculateFirmCircuit(
      inputs.gdp,
      governmentServiceConsumption,
      state.stock,
      finance.privateInterestPayments,
      stability,
      netEnergyFactor,
      params,
    );

    const openingFinancialLedger = state.financialLedger ?? createCapitalGodleyLedger({
      capitalStock: state.stock,
      privateDebt,
      publicDebt,
      bankEquityRatio: params.bankEquityRatio,
      householdDepositShare: params.openingHouseholdDepositShare,
      step: yearIndex,
    });
    const publicDebtGDP = finance.openingPublicDebtGDP;
    const privateDebtGDP = finance.openingPrivateDebtGDP;
    const totalDebtGDP = finance.openingTotalDebtGDP;
    const debtRiskPremium = finance.debtRiskPremium;
    const interestRate = finance.interestRate;
    const publicInterestPayments = finance.publicInterestPayments;
    const openingBankPublicBonds =
      openingFinancialLedger.balances['banks.publicBonds'] ?? 0;
    const openingHouseholdPublicBonds =
      openingFinancialLedger.balances['households.publicBonds'] ?? 0;
    const openingPublicBondHoldings =
      openingBankPublicBonds + openingHouseholdPublicBonds;
    const publicInterestToBanks = openingPublicBondHoldings > 0
      ? publicInterestPayments
        * openingBankPublicBonds
        / openingPublicBondHoldings
      : 0;
    const publicInterestToHouseholds =
      publicInterestPayments - publicInterestToBanks;
    const publicDebtService = publicInterestPayments;
    const grossLoanOriginations = finance.grossLoanOriginations;
    const newInvestmentLoanOriginations =
      finance.newInvestmentLoanOriginations;
    const refinancedPrincipal = finance.refinancedPrincipal;
    const unfundedCreditDemand = finance.unfundedNetNewCreditDemand;
    // Preserve the scale and economic content of the deprecated field: unlike
    // total originations, this excludes mechanically rolled principal.
    const creditImpulse = newInvestmentLoanOriginations;

    const plannedInvestment = firmCircuit.plannedInvestment;
    const netCashCredit =
      grossLoanOriginations - finance.principalRepayments;
    const financingAvailable = Math.max(
      0,
      firmCircuit.firmInternalFunds + netCashCredit,
    );
    const investment = Math.min(
      plannedInvestment,
      financingAvailable,
      maximumFeasibleInvestment,
    );
    const unfundedFinancingDemand = Math.max(
      0,
      plannedInvestment - financingAvailable,
    );
    const unfundedInvestmentDemand = Math.max(
      0,
      plannedInvestment - investment,
    );
    // A fixed retention ratio can leave firms hoarding cash once internal
    // funds exceed their actual orders. Distribute that surplus (up to
    // positive retained profit) after the investment decision. This keeps the
    // circuit closed without forcing households to borrow merely because
    // firms have no profitable use for additional retained earnings.
    const excessFirmCash = Math.min(
      Math.max(
        0,
        firmCircuit.firmInternalFunds + netCashCredit - investment,
      ),
      Math.max(0, firmCircuit.retainedEarnings),
    );
    const firmDividendPayments =
      firmCircuit.firmDividendPayments + excessFirmCash;
    const retainedEarnings =
      firmCircuit.retainedEarnings - excessFirmCash;
    const firmGrossSaving =
      firmCircuit.firmGrossSaving - excessFirmCash;
    const householdConsumption = Math.max(
      0,
      subtractQuantities(
        unitQuantity(inputs.gdp, '$T/year', 'GDP'),
        [
          unitQuantity(investment, '$T/year', 'investment'),
          unitQuantity(
            governmentServiceConsumption,
            '$T/year',
            'government service consumption',
          ),
        ],
        'household-consumption residual',
      ).value,
    );
    const retireeConsumption = Math.min(pensionTransfers, householdConsumption);
    const workerConsumption = householdConsumption - retireeConsumption;

    // Fiscal closure and ex-post sectoral saving. Banks distribute current
    // interest income; loan write-offs remain a balance-sheet loss rather than
    // current income. The four sector balances therefore sum to realized
    // investment, up to floating-point error.
    const netTaxes =
      governmentServiceConsumption
      + pensionTransfers
      + publicInterestPayments
      - finance.publicDebtChange;
    const bankInterestIncome =
      finance.privateInterestPayments + publicInterestToBanks;
    const bankDividendPayments = bankInterestIncome;
    const householdDisposableIncome =
      firmCircuit.laborCompensation
      + firmDividendPayments
      + bankDividendPayments
      + governmentServiceConsumption
      + pensionTransfers
      + publicInterestToHouseholds
      - netTaxes;
    const householdSaving =
      householdDisposableIncome - householdConsumption;
    const householdSavingRate = householdDisposableIncome > 0
      ? householdSaving / householdDisposableIncome
      : 0;
    const governmentSaving =
      netTaxes
      - governmentServiceConsumption
      - pensionTransfers
      - publicInterestPayments;
    const bankSaving =
      bankInterestIncome - bankDividendPayments;
    const nationalSaving =
      householdSaving
      + firmGrossSaving
      + governmentSaving
      + bankSaving;
    const grossSavings = nationalSaving;
    const savingInvestmentResidual = nationalSaving - investment;

    const nationalAccountsResidual = subtractQuantities(
      unitQuantity(inputs.gdp, '$T/year', 'GDP'),
      [
        unitQuantity(householdConsumption, '$T/year', 'household consumption'),
        unitQuantity(investment, '$T/year', 'investment'),
        unitQuantity(
          governmentServiceConsumption,
          '$T/year',
          'government service consumption',
        ),
      ],
      'national-accounts residual',
    ).value;

    // Split investment between energy and general economy
    // When energy is scarce/expensive → more investment flows to energy
    const burden = inputs.energyBurden ?? 0.05;
    // 8% of GDP: stress threshold above the historical norm of ~4-6%
    // (global energy expenditure share; ~8-13% reached only in the
    // 1979-81 and 2022 price shocks) — calibration anchor, not sourced data
    const burdenSignal = burden / 0.08; // Normalized to threshold (1.0 = normal)
    const energyShare = Math.min(0.30, Math.max(0.10,
      params.baseEnergyInvestmentShare * (1 + params.energyInvestmentSensitivity * (burdenSignal - 1))
    ));
    // BUDGET signal (burden-driven share) — used as the standalone-mode
    // fallback for energy's investment constraint. The K-stock DEBIT below
    // uses REALIZED spends (lagged one year, from the energy/cdr/demand
    // modules) when wired: one ledger, money debited is money spent.
    // Lag caveat: the debit trails the build by a year, so K is
    // over-credited during fast capex growth and the final horizon year is
    // never debited.
    const energyInvestment = investment * energyShare;
    const realizedEnergyCapex = inputs.energyCapexSpend ?? energyInvestment;
    const realizedCdrSpend = inputs.cdrSpend ?? 0;
    const realizedRobotCapex = inputs.robotCapexSpend ?? 0;
    const realizedDataCenterCapex = inputs.dataCenterCapexSpend ?? 0;
    const totalRealizedSpend = sumQuantities([
      unitQuantity(realizedEnergyCapex, '$T/year', 'energy capex'),
      unitQuantity(realizedCdrSpend, '$T/year', 'CDR spend'),
      unitQuantity(realizedRobotCapex, '$T/year', 'robot capex'),
      unitQuantity(realizedDataCenterCapex, '$T/year', 'datacenter capex'),
    ], '$T/year', 'realized capital spend').value;
    // When spends exceed the pool, generalInvestment floors at 0 and the
    // overflow is implicitly unfinanced — exposed as an output so runs can
    // detect a silently binding floor instead of hiding it.
    const unfundedRealizedSpend = Math.max(0, totalRealizedSpend - investment);
    const generalInvestment = Math.max(0, subtractQuantities(
      unitQuantity(investment, '$T/year', 'investment'),
      [unitQuantity(totalRealizedSpend, '$T/year', 'realized special-purpose spend')],
      'general investment',
    ).value);

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
    const generalInvestmentStock = integrateFlow(
      unitQuantity(generalInvestment, '$T/year', 'general investment'),
      unitQuantity(1, 'year', 'annual timestep'),
      '$T',
      'general capital formation',
    );
    const newStock = sumQuantities([
      unitQuantity((1 - params.depreciation) * state.stock, '$T', 'post-depreciation stock'),
      generalInvestmentStock,
    ], '$T', 'next capital stock').value;

    // Capital growth rate
    const capitalGrowthRate = yearIndex > 0 && state.stock > 0
      ? (newStock - state.stock) / state.stock
      : 0;

    const newPublicDebt = finance.state.publicDebt;
    const newPrivateDebt = finance.state.privateDebt;

    const openingHouseholdNetWorth =
      openingFinancialLedger.balances['households.netWorth'] ?? 0;
    const financialPosting = postCapitalGodleyYear(openingFinancialLedger, {
      depreciation: firmCircuit.depreciationAllowance,
      generalInvestment,
      laborCompensation: firmCircuit.laborCompensation,
      householdConsumption,
      grossLoanOriginations,
      principalRepayments: finance.principalRepayments,
      loanWriteOffs: finance.loanWriteOffs,
      privateInterestPayments: finance.privateInterestPayments,
      firmDividendPayments,
      bankDividendPayments,
      publicDebtChange: finance.publicDebtChange,
      governmentServiceConsumption,
      pensionTransfers,
      publicInterestPayments,
      publicInterestToBanks,
      netTaxes,
    });
    const bankEquity =
      financialPosting.state.balances['banks.netWorth'] ?? 0;
    const bankEquityShortfall = Math.max(0, -bankEquity);
    const bankCapitalRatio = capitalBankCapitalRatio(financialPosting.state);
    const householdSavingLedgerResidual =
      (
        (financialPosting.state.balances['households.netWorth'] ?? 0)
        - openingHouseholdNetWorth
      )
      - householdSaving;

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
        financialLedger: financialPosting.state,
      },
      outputs: {
        stock: state.stock, // Output current stock (before update)
        nextCapitalStock: newStock,
        investment,
        plannedInvestment,
        unfundedInvestmentDemand,
        unfundedFinancingDemand,
        grossSavings,
        laborCompensation: firmCircuit.laborCompensation,
        operatingSurplus: firmCircuit.operatingSurplus,
        privateInterestPayments: finance.privateInterestPayments,
        profitAfterInterestAndDepreciation:
          firmCircuit.profitAfterInterestAndDepreciation,
        profitRate: firmCircuit.profitRate,
        retainedEarnings,
        firmDividendPayments,
        bankDividendPayments,
        firmInternalFunds: firmCircuit.firmInternalFunds,
        householdDisposableIncome,
        householdSaving,
        householdSavingRate,
        firmGrossSaving,
        governmentSaving,
        bankSaving,
        nationalSaving,
        savingInvestmentResidual,
        householdSavingLedgerResidual,
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
        unfundedRealizedSpend,
        energyShareOfInvestment: energyShare,
        retireeCost,
        childCost,
        regionalRetireeCost,
        regionalChildCost,
        pensionTransfers,
        retireeHealthcareConsumption,
        educationConsumption,
        governmentServiceConsumption,
        regionalPensionTransfers,
        regionalRetireeHealthcareConsumption,
        regionalEducationConsumption,
        transferBurden,
        householdConsumption,
        retireeConsumption,
        workerConsumption,
        nationalAccountsResidual,
        publicDebtGDP,
        privateDebtGDP,
        totalDebtGDP,
        privateDebtStock: privateDebt,
        nextPrivateDebtStock: newPrivateDebt,
        publicDebtStock: publicDebt,
        nextPublicDebtStock: newPublicDebt,
        publicInterestPayments,
        publicInterestToHouseholds,
        publicInterestToBanks,
        publicDebtService,
        grossLoanOriginations,
        newInvestmentLoanOriginations,
        refinancedPrincipal,
        unfundedCreditDemand,
        creditImpulse,
        principalRepayments: finance.principalRepayments,
        loanWriteOffs: finance.loanWriteOffs,
        netCreditCreation: finance.netCreditCreation,
        primaryDeficit: finance.primaryDeficit,
        netTaxes,
        debtRiskPremium,
        bankEquity,
        bankEquityShortfall,
        bankCapitalRatio,
        financialLedgerResidual: financialPosting.report.maxResidual,
      },
    };
  },
});
