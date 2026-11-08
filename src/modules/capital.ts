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
 * - Return on capital / firms' cost of capital: r = α × Y/K - δ + debtRiskPremium
 * - Safe rate (public debt): r_safe = r_neutral + c·(g_trend - g_anchor) + λ_d·(d - d_2025)
 * - Loan rate (private bank debt): r_loan = r_safe + creditSpread
 * - Capital's income share: α + s_m·(1-α)·Δm, Δm = machine share of augmented labor since 2025
 * - Profit after interest and depreciation: Π = share·(Y-G) - r_loan·D - δK
 * - Investment orders: I* = δK + boundedProfitResponse(Π/K)
 * - Credit demand: max(I* - internalFunds, leverage borrowing), where
 *   leverage borrowing takes debt/K from Lev to Lev + s(Lev* - Lev) on the
 *   projected closing capital; the excess over the investment gap is paid
 *   out, and over-levered firms with spare cash repay early instead
 * - Finance: I = min(I*, firmInternalFunds + netCashCredit, Y-G)
 * - Firm cash floor: firms cannot overdraw deposits. A shortfall suspends
 *   dividends, then leaves interest unpaid, then misses principal; loans
 *   behind unpaid interest are written down by unpaid / r
 * - Household saving: S_h = disposableIncome - householdConsumption
 * - National accounts: GDP = HouseholdConsumption + Investment + GovernmentServices
 * - Capital accumulation: K_{t+1} = (1-δ)K_t + I_general
 * - Public debt: ΔD = primaryDeficit + s·Δ(transfers/Y)·Y - fiscalConsolidation + r_safe·D
 * - Private debt: ΔD = gross originations - principal repayments - write-offs
 *
 * Sources:
 * - Penn World Table: K/Y ratio ~3.5, global capital stock ~$420T
 * - OLG theory: Lifecycle savings rates by age cohort
 * - Keen (2011): profit-responsive investment and bank-created deposits in a
 *   monetary circuit; the bounded response here is a toy adaptation
 * - Bank of England (2014): lending creates deposits and repayment destroys
 *   deposit money
 * - Flannery & Rangan (2006), Huang & Ritter (2009): partial adjustment
 *   toward target leverage; Lemmon, Roberts & Zender (2008): the target
 *   persists around the initial ratio
 * - Uncertainty damping Φ = 1/(1+λu²): an ad-hoc form inspired by
 *   Galbraith/Chen entropy economics; only this factor is implemented, and
 *   the framework's emphasized Jevons/rebound dynamics are absent
 */

import { Region, REGIONS } from '../domain-types.js';
import {
  atMost,
  closeTo,
  defineModule,
  type GodleyLedgerState,
  type ModuleInvariant,
  integrateFlow,
  Module,
  subtractQuantities,
  sumQuantities,
  unitPort,
  unitQuantity,
  validatedMerge,
} from 'tsimulation';
import { advanceCapitalFinance } from './capital-finance.js';
import { demandDefaults } from './demand.js';
import {
  bankRetention,
  capitalBankCapitalRatio,
  createCapitalGodleyLedger,
  postCapitalGodleyYear,
  settleFirmCashShortfall,
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
  automationIncomeToCapital: number; // Share of machine worker-equivalents' income paid to capital (1)
  depreciation: number;       // Annual depreciation rate (~0.05)
  firmRetentionRate: number;  // Share of positive after-interest profit retained
  investmentProfitRateFloor: number; // Profit rate below which only replacement is ordered
  investmentProfitRateCeiling: number; // Profit rate at which net investment response saturates
  maximumNetInvestmentRate: number; // Maximum desired net investment / capital
  robotCapitalDepreciation: number; // Robot capital depreciation (derived from demand.robotDepreciation)
  dataCenterCapitalDepreciation: number; // Datacenter capital depreciation (derived from demand.dataCenterDepreciation)

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

  // Demographic savings response
  savingsLifeExpSensitivity: number;     // LE elasticity on savings (0.5)
  savingsDependencySensitivity: number;  // Dependency ratio elasticity on savings (0.3)

  // --- Public debt ---
  initialPublicDebtGDP: number;        // 0.90 (90% of GDP in 2025)
  publicDeficitRate: number;           // 0.03 (structural primary deficit / GDP)
  ageingCostDeficitShare: number;      // 0.25 (share of the rise in transfers/GDP since 2025 that is borrowed)
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
  leverageAdjustmentSpeed: number;     // Share of the gap to target debt/capital closed per year
  privateDefaultRate: number;          // Annual loan write-off rate (0 in baseline)
  financialSubsteps: number;           // Within-year debt integration steps (4 = quarterly)
  bankEquityRatio: number;             // Bank equity / assets: opening value and retention target
  bankRetentionSpeed: number;          // Share of the equity-target gap closed by retention each year
  openingHouseholdDepositShare: number; // Initial deposits held by households

  // --- Risk premium ---
  debtRiskLambda: number;              // 0.03 (3bp per pp of excess total debt/GDP)
  debtRiskThreshold: number;           // 2.00 (total debt/GDP where premium starts)

  // --- Rate structure ---
  neutralSafeRate: number;             // 0.010 (safe rate at anchor growth and 2025 public debt)
  safeRateGrowthPassThrough: number;   // 1.0 (c in r* = c·g + z)
  safeRateGrowthAnchor: number;        // 0.034 (2025 trend growth the safe rate is anchored at)
  safeRateDebtSensitivity: number;     // 0.065 (6.5bp per pp of public debt/GDP above its 2025 level)
  safeRateDebtSmoothingYears: number;  // 3 (exponential smoothing of the debt ratio the safe rate prices)
  trendGrowthSmoothingYears: number;   // 10 (exponential smoothing of realized growth)
  financialRepression: number;         // 0 (pp the safe rate is held below its market level)
  repressionDebtThreshold: number;     // 1.5 (public debt/GDP above which fiscal dominance caps the safe rate)
  repressionDepth: number;             // 0.03 (cap = trend growth less this)
  creditSpread: number;                // 0.020 (bank/corporate borrowing over the safe rate)

  // Initial conditions
  initialCapitalStock: number;    // $ trillions (2025)
}

export interface CapitalState {
  stock: number;              // Current GENERAL capital stock ($ trillions)
  /** Robot capital stock ($T); undefined until year 0 splits the opening stock */
  robotStock?: number;
  /** Chips + datacenter capital stock ($T); undefined until year 0 splits the opening stock */
  dataCenterStock?: number;
  /** General capital stock after the year-0 split (production's anchor in general-capital units) */
  openingGeneralStock?: number;
  referenceLifeExpectancy: Record<Region, number>; // Year-0 LE per region
  referenceDependency: Record<Region, number>;     // Year-0 dependency ratio per region
  publicDebt: number;         // $ trillions
  privateDebt: number;        // $ trillions
  previousGdp: number;        // $ trillions (for GDP growth rate)
  trendGrowth: number;        // Smoothed real GDP growth the safe rate tracks
  pricedPublicDebtGDP?: number; // Smoothed public debt/GDP the safe rate's debt term prices
  referenceTransferBurden?: number; // 2025 transfers / GDP, for the borrowed share of later increases
  referenceAutomationLaborShare?: number; // 2025 machine share of augmented labor
  /** Target private debt / general capital, anchored at the year-0 ratio */
  targetPrivateLeverage?: number;
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
  /** Robot fleet at installed cost $T (from demand, same year): splits the opening stock in year 0. Unwired: 0 */
  robotCapitalValue?: number;
  /** Opening datacenter fleet at composite cost $T (from demand, same year): splits the opening stock in year 0. Unwired: 0 */
  dataCenterCapitalValue?: number;
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
  automationLaborShare?: number; // Machine share of augmented labor (from production, same year)

  // From demand (optional, for investment split)
  energyBurden?: number;      // Energy cost as fraction of GDP (0-1)

  // From demographics (for retirement age adjustment)
  regionalLifeExpectancy?: Record<Region, number>;

  /** Previous year's GDP $T (lagged). Read at the seed year only, so the
   *  finance block's within-year GDP path grows into 2025 as it does into
   *  every later year. Unwired fallback: this year's GDP (no growth) */
  laggedGdp?: number;
}

export interface CapitalOutputs {
  // Stock and flows
  stock: number;              // Capital stock: general + robot + datacenter ($ trillions)
  nextCapitalStock: number;   // End-of-period capital stock: general + robot + datacenter ($ trillions)
  generalCapitalStock: number;      // Opening general capital stock ($T): production's K
  nextGeneralCapitalStock: number;  // End-of-period general capital stock ($T)
  nextProductionCapitalStock: number; // nextGeneralCapitalStock in production's anchor units ($T): see step
  robotCapitalStock: number;        // Opening robot capital stock ($T)
  dataCenterCapitalStock: number;   // Opening chips + datacenter capital stock ($T)
  automationDepreciation: number;   // Robot + datacenter capital depreciation ($T/year)
  investment: number;         // Annual investment ($ trillions)
  plannedInvestment: number;  // Desired annual investment before final-use feasibility cap
  unfundedInvestmentDemand: number; // Desired investment above the feasible final-use envelope
  unfundedFinancingDemand: number; // Orders not covered by internal funds and net bank credit
  grossSavings: number;       // Deprecated-compatible alias for ex-post national gross saving

  // Monetary circuit and sectoral saving
  laborCompensation: number;
  laborShare: number;          // Labor compensation / GDP
  operatingSurplus: number;
  privateInterestPayments: number;
  unpaidPrivateInterest: number; // $T/year of interest due that firms could not pay (forgone by banks)
  profitAfterInterestAndDepreciation: number;
  profitRate: number;
  retainedEarnings: number;
  firmDividendPayments: number;
  bankDividendPayments: number;
  bankInterestIncome: number;  // $T/year of private interest paid plus public interest to banks
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
  interestRate: number;       // Real return on capital + debt premium (firms' cost of capital)
  safeRate: number;           // Real rate paid on public debt
  loanRate: number;           // Real rate paid on private bank debt
  repressionGap: number;      // pp the safe rate is held below its market level

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
  capitalFormation: number;         // $T entering K: generalInvestment + robot + datacenter capex
  unfundedRealizedSpend: number;    // $T of realized spends exceeding the investment pool (floor binding)
  energyShareOfInvestment: number;  // Fraction going to energy

  // Intergenerational transfers
  retireeCost: number;          // $ trillions (pensions + healthcare for 65+)
  childCost: number;            // $ trillions (education for 0-19)
  regionalRetireeCost: Record<Region, number>; // $ trillions by region
  regionalChildCost: Record<Region, number>;   // $ trillions by region
  regionalRetirementAgeExtension: Record<Region, number>; // years added to retirement by LE gains
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
  creditCapacity: number;      // $T/year new investment credit banks would extend (the lending envelope)
  creditImpulse: number;       // Deprecated alias for newInvestmentLoanOriginations
  principalRepayments: number; // $T/year of private-loan principal repaid
  loanWriteOffs: number;       // $T/year of private loans written off
  netCreditCreation: number;   // Change in private debt stock
  privateLeverage: number;     // Beginning-of-period private debt / capital (general + robot + datacenter)
  targetPrivateLeverage: number; // Debt/capital firms adjust toward (year-0 ratio)
  leverageBorrowing: number;   // $T/year net new credit the leverage target asks for (signed)
  leverageRecapBorrowing: number; // $T/year borrowed beyond the investment gap and paid out
  voluntaryPrincipalRepayments: number; // $T/year repaid early by over-levered firms
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
  // Robots and AI add worker-equivalents to production's labor input, where
  // they earn the same marginal product as people. In the task framework
  // that income goes to the machines' owners: automation's displacement
  // effect lowers the labor share (Acemoglu & Restrepo 2018 AER 108(6), 2019
  // JEP 33(2)); automation explains ~50-70% of the 1980-2016 US wage-
  // structure change (Acemoglu & Restrepo 2022, Econometrica 90(5)). 1 = all
  // of it; lower values model rents shared with complementary workers.
  automationIncomeToCapital: 1.0,
  // PWT 10.01 capital-weighted world depreciation (delta x cn): 3.7% (1990)
  // -> 4.65% (2019), 1990-2019 mean ~4.1% (scripts/pwt-capital-aggregates.py). With K/Y 3.5 and I/Y 25.2%, 4%
  // grows K ~3.1%/yr in 2026, continuing PWT's world capital growth (3.34%/yr
  // 1990-2019, 3.77% 2010-19). The old 5% grew it 1.9%, breaking the
  // 30-year trend at the 2025 seam and pushing K/Y down to ~2.9 by 2055.
  depreciation: 0.04,
  // Bounded toy version of Keen's profit-responsive investment function.
  // These values keep the 2025 gross-investment rate near the pre-circuit
  // calibration while making investment orders causally prior to saving.
  // Re-solved when private debt moved from the return on capital (~6%) to
  // the loan rate (~3%), which roughly doubled after-interest profit, and
  // again when depreciation moved to 4% (a smaller depreciation allowance
  // means less internal finance). Both hold 2025 investment at 25.2% of GDP
  // with ~3% of GDP in net new credit (pre-split: 25.2%, 3.1%). Retention
  // vs global listed payout ratios ~40-50% (MSCI ACWI; Janus Henderson
  // Global Dividend Index, 2024).
  firmRetentionRate: 0.60,
  investmentProfitRateFloor: 0,
  investmentProfitRateCeiling: 0.048,
  maximumNetInvestmentRate: 0.038,
  // Robot and datacenter capital wear out at the rates demand's capex
  // replaces them at (one source of truth: src/param-derivations.ts).
  robotCapitalDepreciation: demandDefaults.robotDepreciation,
  dataCenterCapitalDepreciation: demandDefaults.dataCenterDepreciation,

  // OLG lifecycle savings
  savingsYoung: 0.0,        // Dependents don't save
  savingsWorking: 0.45,     // Prime savers (calibrated to ~22% global rate)
  savingsOld: 0,            // Explicit transfers now handle retirement consumption

  // Regional premiums: calibrated to gross national savings differentials
  // (World Bank WDI 2023 gross national savings; per-region sources inline).
  savingsPremium: {
    us: -0.10,              // US ~17.6% of GDP (WDI 2023)
    'oecd-ex-us': 0.05,     // ~25%: Japan 29, Germany 28, Korea 34, UK 15 (WDI 2023)
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
  // WHO/World Bank health expenditure shares. US: public pensions ~7% GDP
  // (SS 5.1% + federal/state plans) on a young age structure implies a
  // higher per-retiree rate; public health spending on the old (Medicare +
  // Medicaid LTC ~4% GDP) is ~2x the OECD ex-US per capita (Health at a
  // Glance 2023).
  transferPremium: {
    us:     { pensionRate: 0.38, healthcareRate: 0.16, educationRate: 0.05 },
    'oecd-ex-us': { pensionRate: 0.34, healthcareRate: 0.08, educationRate: 0.05 },
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
  retirementAgeResponse: 0.67,  // OECD recommendation: 2/3 of gains in life expectancy at pension age (e65) → retirement age

  // Demographic savings response (Bloom et al. 2003, Kinugasa & Mason 2007)
  savingsLifeExpSensitivity: 0.5,     // LE elasticity: longer life → save more
  savingsDependencySensitivity: 0.3,  // Dependency elasticity: more dependents → save less

  // --- Public debt (IMF Global Debt Database, 2025) ---
  initialPublicDebtGDP: 0.90,         // 90% of GDP
  publicDeficitRate: 0.03,            // 3% structural primary deficit / GDP
  // Share of the rise in transfers (pensions, retiree health, education)
  // above their 2025 share of GDP that is borrowed rather than taxed; the
  // fiscal reaction still leans against the resulting debt. US calibration,
  // judgment for the world: CBO's Long-Term Budget Outlook (Mar 2025) has
  // Social Security +0.9pp and Medicare +2.1pp of GDP 2025-2055 against
  // revenues +2.2pp, so ~1/4 of the ageing increase is left unmatched under
  // current law. Symmetric: falling education costs lower the deficit.
  ageingCostDeficitShare: 0.25,
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
  // Target leverage (trade-off theory with partial adjustment): each year
  // firms close this share of the gap between their debt/capital ratio and
  // its target, Lev' = Lev + s(Lev* - Lev). 0.25/yr sits between the two
  // standard estimates: Flannery & Rangan (2006, JFE 79) >30%/yr (~1/3 of
  // the gap closed per year) and Huang & Ritter (2009, JFQA 44), book-
  // leverage half-life 3.7 yr, i.e. ~17%/yr. The target itself is not a
  // parameter: it is the year-0 ratio, held in state (Lemmon, Roberts &
  // Zender 2008, JF 63: leverage persists around a firm's own initial level
  // for 20+ years). At 0 firms hold their current ratio (no reversion).
  leverageAdjustmentSpeed: 0.25,
  // No baseline default mechanism is assumed. Scenarios must turn write-offs
  // on explicitly; doing so hits bank equity one-for-one in the Godley ledger.
  privateDefaultRate: 0,
  financialSubsteps: 4,
  // Consolidated bank equity / (loans + bonds + reserves), 2025. Basel III
  // Tier 1 leverage ratio (Tier 1 / total exposure), fully phased-in, June
  // 2025: 6.1% Group 1 banks, 6.0% G-SIBs, 6.9% Group 2 (BCBS Basel III
  // Monitoring Report, Oct 2025; stable at Dec 2025). Bank capital and reserves
  // / total assets (IMF FSI via World Bank FB.BNK.CAPA.ZS): US 9.2% (2025),
  // India 8.5% (2025), China 7.8% (2021), UK 5.6% (2025), Japan 4.1% (2022);
  // FDIC US leverage capital ratio 9.26% (QBP Q4 2025). Accounting equity over
  // on-balance assets sits above the leverage ratio (no Tier 1 deductions, no
  // off-balance exposures in the denominator), so 7%, not 6.1%. Not a
  // risk-weighted ratio (CET1 is 13.9% of RWA for Group 1)
  bankEquityRatio: 0.07,
  // Banks hold their equity ratio, distributing only the interest income the
  // target does not need: the shape of Basel III's capital conservation
  // buffer, which restricts payouts until capital is restored (BCBS 2011,
  // paras 129-130). 1 = the gap closes within the year, subject to retaining
  // no more than a year's interest income; 0 = all interest income is paid out
  bankRetentionSpeed: 1,
  openingHouseholdDepositShare: 0.50,

  // --- Risk premium ---
  debtRiskLambda: 0.03,               // 3bp per pp of excess total debt/GDP
  debtRiskThreshold: 2.00,            // Total debt/GDP where premium starts

  // --- Rate structure ---
  // The return on capital (alpha*Y/K - delta, ~4.4% in 2025) is not what
  // governments or banks borrow at. Safe real rates fell ~5pp from the
  // mid-1980s while the return on capital stayed flat (Marx, Mojon & Velde
  // 2021, J. Monetary Econ. 124; Caballero, Farhi & Gourinchas 2017, AER P&P).
  // So the safe rate is not a fixed wedge below the return on capital (that
  // ties it one-for-one to K/Y and, once interest accrues to debt, spirals).
  // It follows trend growth, r* = c·g + z: Laubach & Williams (2003, REStat)
  // estimate c ~1; Holston, Laubach & Williams (2017, JIE) impose c = 1.
  // 2025 level ~1.0% real. Anchors: US r* ~1% (HLW and LW, NY Fed, 2025);
  // world public interest ~3% of GDP nominal on ~94% debt (IMF Fiscal
  // Monitor, Apr 2026), ~0-1% real.
  neutralSafeRate: 0.010,
  safeRateGrowthPassThrough: 1.0,
  // World real GDP (PPP) CAGR 1990-2025 3.43% (WDI; scripts/growth-backcast.md),
  // 2015-2025 ~3.5%: the trend the 2025 safe rate was set at.
  safeRateGrowthAnchor: 0.034,
  // r* filters move with growth over roughly a decade (HLW's trend growth is
  // a slow-moving random walk); a 10-year exponential smoother.
  trendGrowthSmoothingYears: 10,
  // 6.5bp per pp of public debt/GDP: JUDGMENT between the published estimates
  // and the most recent observation.
  //   Floor: 3-4bp (Laubach 2009, JEEA 7(4)); 2-3bp (Gamber & Seliski, CBO
  //   Working Paper 2019-01). Both are estimated on the low-debt, falling-rate
  //   sample before 2020.
  //   Ceiling: the US 10y real rate (Cleveland Fed) rose 1.28pp from 2019 to
  //   the 2024-26 average while trend growth moved +0.08pp and federal debt
  //   rose 16pp of GDP: 7.8bp per pp if debt carried all of it. Part of it is
  //   term premium and QT, so that is an upper bound (docs/SAFE_RATE_BACKCAST.md).
  // At 3bp the 2019 -> 2024-26 rise is under-predicted by half (+0.57pp). In a
  // 1,080-run grid, 6.5bp with c = 1 was the closest match to the 2026-11-07
  // Tetlock panel (r* 2036-45, AE debt 2045) once growth is held to the
  // panel's: a consistency check, not a source.
  // Measured from the 2025 ratio, so it moves the rate, not its level.
  // The total-debt debtRiskPremium (mostly private leverage) prices the
  // return on capital, not the sovereign.
  safeRateDebtSensitivity: 0.065,
  // The debt term prices a 3-year exponential smooth of debt/GDP, not the
  // current ratio. Laubach (2009) regresses on CBO's 5-year-AHEAD projected
  // debt: markets price the debt path and look through one year's swing in
  // the denominator. Pricing the current ratio turned the model's low-growth
  // 2026 (debt/GDP +1.5pp, then ~flat) into a one-year rate spike
  // (src/seed-year.test.ts). A backward smoother is the crude proxy, and it lags
  // where the market leads, so the window is kept short: 3 years keeps 96% of
  // the US 2019 -> 2024-26 debt change (15.6 of 16.3pp), still within the
  // 8.2bp-per-pp upper bound at 6.5bp. Judgment, not separately sourced.
  safeRateDebtSmoothingYears: 3,
  // Financial repression. Explicit lever off by default. Above 150% public
  // debt/GDP fiscal dominance caps the safe rate at trend growth less 3pp,
  // so debt liquidates instead of spiralling once interest accrues:
  // advanced-economy real rates averaged roughly -1% to -3.5% in 1945-80
  // with growth ~3-4%, liquidating ~3-4% of GDP a year in the US and UK
  // (Reinhart & Sbrancia 2015, Economic Policy 30(82)). The 150% threshold
  // is judgment (post-war US ~110%, UK ~240%; Japan's YCC began at ~230%).
  financialRepression: 0,
  repressionDebtThreshold: 1.5,
  repressionDepth: 0.03,
  // Bank and corporate borrowers pay ~2pp over the safe rate: ECB composite
  // cost of borrowing for NFCs vs the deposit facility rate (~1.8-2pp, 2025);
  // Moody's Baa less 10y Treasury (FRED BAA10Y, ~1.7-2pp, 2025).
  creditSpread: 0.020,

  // Initial conditions
  initialCapitalStock: 553,     // $553T PPP (K/Y ≈ 3.5 at $158T GDP)
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Life expectancy at 65 (e65), the measure retirement-age links and the
 * retired share of the 65+ population actually depend on. UN WPP 2024
 * Medium, population-weighted to model regions (scripts/wpp-life-expectancy-65.py).
 * E65_PER_E0_GAIN maps the demographics module's at-birth gains onto e65
 * gains: WPP's ratio of e65 to e0 gains, 2025-2075. Low in SSA and South
 * Asia, where at-birth gains are mostly child survival.
 */
const E65_2025: Record<Region, number> = {
  us: 20.1,
  'oecd-ex-us': 20.9,
  china: 18.0,
  india: 15.7,
  latam: 18.0,
  seasia: 15.5,
  russia: 16.4,
  mena: 16.0,
  ssa: 13.6,
};
const E65_PER_E0_GAIN: Record<Region, number> = {
  us: 0.66,
  'oecd-ex-us': 0.74,
  china: 0.68,
  india: 0.47,
  latam: 0.52,
  seasia: 0.51,
  russia: 0.52,
  mena: 0.58,
  ssa: 0.24,
};

/**
 * Calculate demographic-weighted savings rate with LE and dependency adjustments.
 *
 * Life expectancy effect: longer life → save more for retirement (lifecycle motive).
 * Dependency effect: more dependents → less capacity to save.
 * Combined factor clamped to [0.5, 1.5] to prevent unreasonable extremes.
 *
 * The result is floored at zero. The regional premium is an additive offset
 * calibrated at the default `savingsWorking` (US -0.10 against a ~0.27 base
 * gives WDI's 17.6%), so a lower working-age rate or a stronger dependency
 * response can shrink the base below the premium as a region ages. A negative
 * gross saving propensity has no meaning here: it is a share weight for
 * allocating investment across regions (negative weight = negative gross
 * investment, i.e. un-building capital) and the lowest WDI gross saving rate
 * for any of these aggregates is ~15% (SSA). The floor never binds on the
 * default path (lowest rate: US 2100, ~0.06).
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

  return Math.max(0, baseRate + premium);
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
  /** Depreciation of all capital: general + robot + datacenter */
  depreciationAllowance: number;
  /** Depreciation of general capital only (the replacement general orders cover) */
  generalDepreciation: number;
  profitAfterInterestAndDepreciation: number;
  /** General capital's own profit rate (the automation return excluded) */
  profitRate: number;
  retainedEarnings: number;
  firmDividendPayments: number;
  firmGrossSaving: number;
  firmInternalFunds: number;
  plannedInvestment: number;
}

interface FinancingPlan {
  /** Net-new bank credit requested: max(investment gap, leverage borrowing) */
  netNewCreditDemand: number;
  /** Early principal repayment by over-levered firms with spare cash */
  voluntaryRepayment: number;
  /** Orders not covered by internal funds */
  investmentFinancingGap: number;
  /** Net new credit the leverage target asks for; negative when over-levered */
  leverageBorrowing: number;
}

function calculateFirmCircuit(
  gdp: number,
  governmentServiceConsumption: number,
  capitalStock: number,
  privateInterestPayments: number,
  stability: number,
  netEnergyFactor: number,
  params: CapitalParams,
  automationLaborShareChange = 0,
  automationDepreciation = 0,
): FirmCircuit {
  const marketOutput = Math.max(0, gdp - governmentServiceConsumption);
  // Labor's (1 - alpha) is split between people and machine worker-
  // equivalents by quantity; the machines' part (since 2025, which the
  // alpha calibration already contains) is capital income.
  const capitalIncomeShare = params.alpha
    + params.automationIncomeToCapital * (1 - params.alpha)
      * Math.max(0, automationLaborShareChange);
  const operatingSurplus = capitalIncomeShare * marketOutput;
  const laborCompensation = marketOutput - operatingSurplus;
  const generalDepreciation = params.depreciation * capitalStock;
  const depreciationAllowance = generalDepreciation + automationDepreciation;
  const profitAfterInterestAndDepreciation =
    operatingSurplus - privateInterestPayments - depreciationAllowance;
  // Orders for GENERAL capital respond to general capital's own profit rate.
  // Machine income is the gross return on robot/compute capital, a separate
  // stock (robotStock, dataCenterStock) whose own deployment rules live in
  // demand: net of that stock's depreciation it is firm cash flow (internal
  // funds, then dividends), not a signal that general K is scarce. Counting
  // it here sent investment to ~40% of GDP in slow-growth scenarios.
  const automationIncome = operatingSurplus - params.alpha * marketOutput;
  const profitRate = capitalStock > 0
    ? (profitAfterInterestAndDepreciation - (automationIncome - automationDepreciation))
      / capitalStock
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
    generalDepreciation,
    profitAfterInterestAndDepreciation,
    profitRate,
    retainedEarnings,
    firmDividendPayments,
    firmGrossSaving,
    firmInternalFunds,
    // General capital's orders: its replacement plus desired expansion.
    plannedInvestment: Math.max(0, generalDepreciation + desiredNetInvestment),
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

// =============================================================================
// INVARIANTS
// =============================================================================

/**
 * Accounting identities the capital block promises every step. Its residual
 * outputs are each defined to be zero; declaring them here checks that in
 * every scenario and year, not just in the unit tests' fixtures. The ledger
 * split is the one the unified financing ledger introduced (d950fc1): money
 * debited from capital formation is exactly the realized spends, and any
 * overflow is reported rather than silently floored (f73a96b).
 */
const CAPITAL_INVARIANTS: readonly ModuleInvariant<
  CapitalParams, CapitalState, CapitalInputs, CapitalOutputs
>[] = [
  {
    name: 'accounting residuals are zero',
    check: ({ inputs, outputs }) => {
      // $1M of slack per $1T of GDP: far above float error, far below any real leak.
      const abs = 1e-6 * Math.max(1, Math.abs(inputs.gdp));
      return [
        closeTo('saving - investment residual', outputs.savingInvestmentResidual, 0, { abs }),
        closeTo('household saving ledger residual', outputs.householdSavingLedgerResidual, 0, { abs }),
        closeTo('national accounts residual', outputs.nationalAccountsResidual, 0, { abs }),
        closeTo('financial ledger residual', outputs.financialLedgerResidual, 0, { abs }),
      ];
    },
  },
  {
    name: 'bank interest income is retained or distributed, never over-retained',
    description: 'bankDividendPayments + bankSaving = bankInterestIncome, and banks retain no more than their positive interest income.',
    check: ({ inputs, outputs }) => {
      const abs = 1e-6 * Math.max(1, Math.abs(inputs.gdp));
      return [
        closeTo('bank earnings partition',
          outputs.bankDividendPayments + outputs.bankSaving, outputs.bankInterestIncome, { abs }),
        atMost('bank retained earnings', outputs.bankSaving,
          Math.max(0, outputs.bankInterestIncome), { abs }),
      ];
    },
  },
  {
    name: 'capital stock partitions into general, robot and datacenter capital',
    description: 'stock = generalCapitalStock + robotCapitalStock + dataCenterCapitalStock.',
    check: ({ outputs }) => closeTo('capital stock partition',
      outputs.generalCapitalStock + outputs.robotCapitalStock + outputs.dataCenterCapitalStock,
      outputs.stock,
      { abs: 1e-9 * Math.max(1, Math.abs(outputs.stock)) }),
  },
  {
    name: 'capital stock moves by its formation less its depreciation',
    description: 'nextCapitalStock = stock - depreciation x generalCapitalStock - automationDepreciation + capitalFormation (what the generational accounts read).',
    check: ({ outputs, params }) => closeTo('capital stock-flow',
      outputs.nextCapitalStock,
      outputs.stock - params.depreciation * outputs.generalCapitalStock
        - outputs.automationDepreciation + outputs.capitalFormation,
      { abs: 1e-9 * Math.max(1, Math.abs(outputs.nextCapitalStock)) }),
  },
  {
    name: 'robot and datacenter capital is a perpetual inventory of their capex',
    description: 'closing automation capital = opening - automationDepreciation + robotCapexSpend + dataCenterCapexSpend.',
    check: ({ inputs, outputs }) => {
      if (inputs.robotCapexSpend == null || inputs.dataCenterCapexSpend == null) return undefined;
      const closing = outputs.nextCapitalStock - outputs.nextGeneralCapitalStock;
      const opening = outputs.robotCapitalStock + outputs.dataCenterCapitalStock;
      return closeTo('automation capital stock-flow',
        closing,
        opening - outputs.automationDepreciation + inputs.robotCapexSpend + inputs.dataCenterCapexSpend,
        { abs: 1e-9 * Math.max(1, Math.abs(closing)) });
    },
  },
  {
    name: 'realized spends are debited from investment, overflow reported',
    description: 'investment - generalInvestment + unfundedRealizedSpend = sum of realized spends.',
    check: ({ inputs, outputs }) => {
      const spends = [inputs.energyCapexSpend, inputs.cdrSpend, inputs.robotCapexSpend,
        inputs.dataCenterCapexSpend];
      // Unwired, energy's debit is an internal estimate this check cannot see.
      if (spends.some((spend) => spend == null)) return undefined;
      const total = spends.reduce((sum: number, spend) => sum + (spend as number), 0);
      return closeTo('realized spend debit',
        outputs.investment - outputs.generalInvestment + outputs.unfundedRealizedSpend,
        total);
    },
  },
];

export const capitalModule: Module<
  CapitalParams,
  CapitalState,
  CapitalInputs,
  CapitalOutputs
> = defineModule<CapitalParams, CapitalState, CapitalInputs, CapitalOutputs>({
  name: 'capital',
  description: 'Profit-led capital accumulation with a stock-flow-consistent monetary circuit',
  defaults: capitalDefaults,
  invariants: CAPITAL_INVARIANTS,

  paramMeta: {
    automationIncomeToCapital: {
      description: 'Share of the income earned by robot/AI worker-equivalents (production\'s augmented labor) that is paid to capital rather than wages. 1 = all of it (Acemoglu-Restrepo displacement); 0 = the labor share never moves.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 1 },
      tier: 2 as const,
    },
    firmRetentionRate: {
      description: 'Share of positive firm profit retained after interest and depreciation; retained profit contributes internal investment finance.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.60 },
      tier: 1 as const,
    },
    investmentProfitRateCeiling: {
      description: 'Firm profit rate at which the bounded desired net-investment response reaches its maximum.',
      unit: 'fraction/year',
      range: { min: 0.005, max: 0.15, default: 0.048 },
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
    leverageAdjustmentSpeed: {
      description: 'Share of the gap between private debt/capital and its year-0 target that firms close each year (Flannery-Rangan partial adjustment). Under target, firms borrow beyond their investment gap and pay the surplus out; over target, they repay early from spare cash.',
      unit: 'fraction/year',
      range: { min: 0, max: 1, default: 0.25 },
      tier: 2 as const,
    },
    publicDeficitRate: {
      description: 'Structural primary deficit as fraction of GDP. Higher → more public debt accumulation.',
      unit: 'fraction/year',
      range: { min: 0, max: 0.10, default: 0.03 },
      tier: 1 as const,
    },
    ageingCostDeficitShare: {
      description: 'Share of the rise in transfer costs (pensions, retiree health, education) above their 2025 share of GDP that is financed by borrowing rather than taxes. 0 = all taxed (ageing never reaches public debt); 1 = all borrowed.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.25 },
      tier: 1 as const,
    },
    debtRiskLambda: {
      description: 'Interest rate premium per percentage point of excess total debt/GDP above threshold. Self-limiting: high debt → expensive borrowing.',
      unit: 'fraction/pp',
      range: { min: 0, max: 0.10, default: 0.03 },
      tier: 1 as const,
    },
    neutralSafeRate: {
      description: 'Real safe rate on public debt at the anchor growth rate and the 2025 public-debt ratio (~1% in 2025). Lower → cheaper public borrowing; below growth it erodes the debt ratio.',
      unit: 'fraction',
      range: { min: -0.04, max: 0.04, default: 0.010 },
      tier: 1 as const,
    },
    financialRepression: {
      description: 'Percentage points by which policy holds the real safe rate below its market level (captive buyers, rate caps, yield-curve control). Liquidates public debt when the safe rate falls below growth; also lowers the loan rate.',
      unit: 'fraction',
      range: { min: 0, max: 0.06, default: 0 },
      tier: 1 as const,
    },
    repressionDebtThreshold: {
      description: 'Public debt/GDP above which fiscal dominance caps the safe rate at trend growth less repressionDepth (phased in over 25pp). Set high to disable.',
      unit: 'ratio',
      range: { min: 0.6, max: 5, default: 1.5 },
      tier: 2 as const,
    },
    safeRateGrowthPassThrough: {
      description: 'How far the safe rate moves per point of trend growth (c in r* = c·g + z). 1 = one-for-one (Holston-Laubach-Williams).',
      unit: 'ratio',
      range: { min: 0, max: 2, default: 1 },
      tier: 2 as const,
    },
    creditSpread: {
      description: 'Spread of private bank/corporate borrowing over the safe rate. Sets the private interest bill that firms pay out of operating surplus.',
      unit: 'fraction',
      range: { min: 0, max: 0.08, default: 0.020 },
      tier: 2 as const,
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
      description: 'Consolidated bank equity as a share of bank assets (loans + bonds + reserves): the opening balance sheet and the level banks retain interest income to hold. ~7% observed (Basel III Tier 1 leverage 6.1-6.9%, IMF FSI capital/assets 4-9% across the largest systems).',
      unit: 'fraction',
      range: { min: 0.01, max: 0.30, default: 0.07 },
      tier: 2 as const,
    },
    bankRetentionSpeed: {
      description: 'Share of the gap between bank equity and bankEquityRatio x assets that banks close each year by retaining interest income (or paying out equity above target). 0 = banks distribute all interest income and equity never grows.',
      unit: 'fraction/year',
      range: { min: 0, max: 1, default: 1 },
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
      automationLaborShare: unitPort('fraction'),
      energyBurden: unitPort('fraction'),
      regionalLifeExpectancy: unitPort('year', 'record'),
      energyCapexSpend: unitPort('$T/year'),
      cdrSpend: unitPort('$T/year'),
      robotCapexSpend: unitPort('$T/year'),
      dataCenterCapexSpend: unitPort('$T/year'),
      robotCapitalValue: unitPort('$T'),
      dataCenterCapitalValue: unitPort('$T'),
      laggedGdp: unitPort('$T/year'),
    },
    outputs: {
      stock: unitPort('$T'),
      nextCapitalStock: unitPort('$T'),
      generalCapitalStock: unitPort('$T'),
      nextGeneralCapitalStock: unitPort('$T'),
      nextProductionCapitalStock: unitPort('$T'),
      robotCapitalStock: unitPort('$T'),
      dataCenterCapitalStock: unitPort('$T'),
      automationDepreciation: unitPort('$T/year'),
      investment: unitPort('$T/year'),
      plannedInvestment: unitPort('$T/year'),
      unfundedInvestmentDemand: unitPort('$T/year'),
      unfundedFinancingDemand: unitPort('$T/year'),
      grossSavings: unitPort('$T/year'),
      laborCompensation: unitPort('$T/year'),
      laborShare: unitPort('fraction'),
      unpaidPrivateInterest: unitPort('$T/year'),
      operatingSurplus: unitPort('$T/year'),
      privateInterestPayments: unitPort('$T/year'),
      profitAfterInterestAndDepreciation: unitPort('$T/year'),
      profitRate: unitPort('fraction/year'),
      retainedEarnings: unitPort('$T/year'),
      firmDividendPayments: unitPort('$T/year'),
      bankDividendPayments: unitPort('$T/year'),
      bankInterestIncome: unitPort('$T/year'),
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
      safeRate: unitPort('fraction'),
      loanRate: unitPort('fraction'),
      repressionGap: unitPort('fraction'),
      robotsDensity: unitPort('robot/kpeople'),
      automationShare: unitPort('fraction'),
      kPerWorker: unitPort('$k/people'),
      capitalOutputRatio: unitPort('year'),
      capitalGrowthRate: unitPort('fraction/year'),
      energyInvestment: unitPort('$T/year'),
      generalInvestment: unitPort('$T/year'),
      capitalFormation: unitPort('$T/year'),
      unfundedRealizedSpend: unitPort('$T/year'),
      energyShareOfInvestment: unitPort('fraction'),
      retireeCost: unitPort('$T/year'),
      childCost: unitPort('$T/year'),
      regionalRetireeCost: unitPort('$T/year', 'record'),
      regionalChildCost: unitPort('$T/year', 'record'),
      regionalRetirementAgeExtension: unitPort('year', 'record'),
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
      creditCapacity: unitPort('$T/year'),
      creditImpulse: unitPort('$T/year'),
      principalRepayments: unitPort('$T/year'),
      loanWriteOffs: unitPort('$T/year'),
      netCreditCreation: unitPort('$T/year'),
      privateLeverage: unitPort('fraction'),
      targetPrivateLeverage: unitPort('fraction'),
      leverageBorrowing: unitPort('$T/year'),
      leverageRecapBorrowing: unitPort('$T/year'),
      voluntaryPrincipalRepayments: unitPort('$T/year'),
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
    for (const key of ['robotCapitalDepreciation', 'dataCenterCapitalDepreciation'] as const) {
      const rate = params[key];
      if (rate !== undefined && !(rate > 0 && rate <= 1)) {
        errors.push(`${key} must be in (0, 1]`);
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
    if (params.automationIncomeToCapital !== undefined) {
      if (params.automationIncomeToCapital < 0 || params.automationIncomeToCapital > 1) {
        errors.push('automationIncomeToCapital must be between 0 and 1');
      }
    }
    if (params.publicDeficitRate !== undefined) {
      if (params.publicDeficitRate < 0 || params.publicDeficitRate > 0.15) {
        errors.push('publicDeficitRate must be between 0 and 0.15');
      }
    }
    if (params.ageingCostDeficitShare !== undefined) {
      if (params.ageingCostDeficitShare < 0 || params.ageingCostDeficitShare > 1) {
        errors.push('ageingCostDeficitShare must be between 0 and 1');
      }
    }
    if (params.debtRiskLambda !== undefined) {
      if (params.debtRiskLambda < 0 || params.debtRiskLambda > 0.20) {
        errors.push('debtRiskLambda must be between 0 and 0.20');
      }
    }
    if (params.neutralSafeRate !== undefined) {
      if (params.neutralSafeRate < -0.10 || params.neutralSafeRate > 0.10) {
        errors.push('neutralSafeRate must be between -0.10 and 0.10');
      }
    }
    if (params.safeRateGrowthPassThrough !== undefined) {
      if (params.safeRateGrowthPassThrough < 0 || params.safeRateGrowthPassThrough > 3) {
        errors.push('safeRateGrowthPassThrough must be between 0 and 3');
      }
    }
    if (params.safeRateDebtSensitivity !== undefined) {
      if (params.safeRateDebtSensitivity < 0 || params.safeRateDebtSensitivity > 0.20) {
        errors.push('safeRateDebtSensitivity must be between 0 and 0.20');
      }
    }
    if (params.financialRepression !== undefined) {
      if (params.financialRepression < 0 || params.financialRepression > 0.10) {
        errors.push('financialRepression must be between 0 and 0.10');
      }
    }
    if (params.repressionDebtThreshold !== undefined) {
      if (params.repressionDebtThreshold < 0.3 || params.repressionDebtThreshold > 10) {
        errors.push('repressionDebtThreshold must be between 0.3 and 10');
      }
    }
    if (params.repressionDepth !== undefined) {
      if (params.repressionDepth < 0 || params.repressionDepth > 0.10) {
        errors.push('repressionDepth must be between 0 and 0.10');
      }
    }
    if (params.trendGrowthSmoothingYears !== undefined) {
      if (params.trendGrowthSmoothingYears < 1 || params.trendGrowthSmoothingYears > 50) {
        errors.push('trendGrowthSmoothingYears must be between 1 and 50');
      }
    }
    if (params.safeRateDebtSmoothingYears !== undefined) {
      if (params.safeRateDebtSmoothingYears < 1 || params.safeRateDebtSmoothingYears > 50) {
        errors.push('safeRateDebtSmoothingYears must be between 1 and 50');
      }
    }
    if (params.creditSpread !== undefined) {
      if (params.creditSpread < 0 || params.creditSpread > 0.10) {
        errors.push('creditSpread must be between 0 and 0.10');
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
    if (
      params.leverageAdjustmentSpeed !== undefined
      && !(params.leverageAdjustmentSpeed >= 0 && params.leverageAdjustmentSpeed <= 1)
    ) {
      errors.push('leverageAdjustmentSpeed must be between 0 and 1');
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
      params.bankRetentionSpeed !== undefined
      && !(params.bankRetentionSpeed >= 0 && params.bankRetentionSpeed <= 1)
    ) {
      errors.push('bankRetentionSpeed must be between 0 and 1');
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
      referenceLifeExpectancy: {} as Record<Region, number>,
      referenceDependency: {} as Record<Region, number>,
      publicDebt: 0,   // Initialized from GDP at yearIndex === 0
      privateDebt: 0,   // Initialized from GDP at yearIndex === 0
      previousGdp: 0,   // Initialized from inputs at yearIndex === 0
      trendGrowth: params.safeRateGrowthAnchor,
      pricedPublicDebtGDP: params.initialPublicDebtGDP,
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

    // Robots and datacenters are capital. The observed 2025 stock already
    // contains the 2025 fleets, so year 0 carves them out of it at their
    // installed cost; from then on each is a perpetual inventory of its
    // realized capex, depreciating at the rate demand replaces it at.
    const splitOpeningStock =
      state.robotStock === undefined || state.dataCenterStock === undefined;
    const robotStock = state.robotStock ?? Math.max(0, inputs.robotCapitalValue ?? 0);
    const dataCenterStock =
      state.dataCenterStock ?? Math.max(0, inputs.dataCenterCapitalValue ?? 0);
    if (splitOpeningStock) {
      const generalOpening = state.stock - robotStock - dataCenterStock;
      if (!(generalOpening > 0)) {
        throw new Error(
          `capital: the opening robot (${robotStock} $T) and datacenter (${dataCenterStock} $T) `
          + `fleets exceed the opening capital stock (${state.stock} $T)`,
        );
      }
      state = {
        ...state,
        stock: generalOpening,
        robotStock,
        dataCenterStock,
        openingGeneralStock: generalOpening,
      };
    }
    const automationStock = robotStock + dataCenterStock;
    const automationDepreciation =
      params.robotCapitalDepreciation * robotStock
      + params.dataCenterCapitalDepreciation * dataCenterStock;

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
    const regionalRetirementAgeExtension = Object.fromEntries(
      REGIONS.map(r => [r, 0])
    ) as Record<Region, number>;

    // Capture reference values on first step (year 0)
    const refLE = { ...state.referenceLifeExpectancy };
    const refDependency = { ...state.referenceDependency };
    if (yearIndex === 0) {
      for (const r of REGIONS) {
        const working = inputs.regionalWorking[r] ?? 0;
        const young = inputs.regionalYoung[r] ?? 0;
        const old = inputs.regionalOld[r] ?? 0;
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

      // All 9 regions define these in transferPremium defaults (mergeParams
      // deep-merges per region); ?? 0 keeps a malformed direct override from
      // turning retireeCost into NaN
      const pensionRate = premium.pensionRate ?? 0;
      const healthcareRate = premium.healthcareRate ?? 0;
      const educationRate = premium.educationRate ?? params.transfers.educationRate;

      // --- Retirement age adjustment ---
      // As longevity rises, some 65+ are reclassified as "still working"
      // (lower transfer recipients). Both steps use life expectancy AT 65:
      // the OECD-style rule links pension ages to gains in longevity at
      // pension age, and the share of the 65+ population inside the first x
      // years past 65 is ~x / e65 (near-flat survival over that span).
      // At-birth LE minus 65 understated the span (US 14.6 vs e65 20.1;
      // India ~7 vs 15.7), and at-birth gains overstated the extension where
      // they are mostly child survival — together ~2x too many reclassified.
      const currentLE = inputs.regionalLifeExpectancy?.[r] ?? 75;
      const baseLE = refLE[r] ?? 75;
      const e65Gain = E65_PER_E0_GAIN[r] * Math.max(0, currentLE - baseLE);
      const e65 = E65_2025[r] + e65Gain;
      const retirementAgeExtension = params.retirementAgeResponse * e65Gain;
      regionalRetirementAgeExtension[r] = retirementAgeExtension;
      // Fraction of 65+ reclassified as working (capped at 0.5)
      const fractionStillWorking =
        Math.min(0.5, Math.max(0, retirementAgeExtension / e65));
      const adjustedOld = old * (1 - fractionStillWorking);
      const adjustedWorking = working + old * fractionStillWorking;

      // --- Benefit levels ---
      // The average pension in payment is a stable fraction of current
      // earnings (pensionRate, the 2025 benefit ratio). Price indexation in
      // payment is a LEVEL gap already inside that ratio: each cohort's
      // first pension is wage-linked, so the stock tracks wages. Blending in
      // frozen 2025 GDP per worker (the old 30% "price-indexed" weight) turned
      // that level gap into one that widened every year — 18% by 2055, 26%
      // by 2100 — and cut ageing costs ~2.5pp of GDP by 2055. Healthcare and
      // education per head track current GDP per capita (no excess cost
      // growth: conservative against health's history of outgrowing GDP).
      const currentGdpPerWorker = adjustedWorking > 0 ? regionGdp / adjustedWorking : 0;
      const currentGdpPerCapita = pop > 0 ? regionGdp / pop : 0;

      const regionPensionTransfers =
        adjustedOld * pensionRate * currentGdpPerWorker;
      const regionRetireeHealthcare =
        adjustedOld * healthcareRate * currentGdpPerCapita;
      const regionEducation = young * educationRate * currentGdpPerCapita;
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
    const referenceTransferBurden = yearIndex === 0 || state.referenceTransferBurden === undefined
      ? transferBurden
      : state.referenceTransferBurden;
    const additionalPrimaryDeficitRate =
      params.ageingCostDeficitShare * (transferBurden - referenceTransferBurden);

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
      // The finance block interpolates GDP within the year from the previous
      // year's level. Seeding it with this year's GDP froze the 2025 path:
      // debt grew all year against a flat denominator and r - g read g = 0,
      // so the debt ratio and risk premium jumped into 2026 and fell after.
      previousGdp = inputs.laggedGdp !== undefined && inputs.laggedGdp > 0
        ? inputs.laggedGdp
        : inputs.gdp;
    }

    const financeState = { publicDebt, privateDebt, previousGdp };
    const maximumFeasibleInvestment = Math.max(
      0,
      inputs.gdp - governmentServiceConsumption,
    );
    const netEnergyFactor = Math.max(0, Math.min(1, inputs.netEnergyFactor ?? 1));
    const automationLaborShare = inputs.automationLaborShare ?? 0;
    const referenceAutomationLaborShare =
      yearIndex === 0 || state.referenceAutomationLaborShare === undefined
        ? automationLaborShare
        : state.referenceAutomationLaborShare;
    const automationLaborShareChange =
      automationLaborShare - referenceAutomationLaborShare;

    // Investment split between energy and the general economy. When energy
    // is scarce/expensive more investment flows to energy. Computed ahead of
    // the financing plan because firms project their closing general capital
    // (orders net of special-purpose spend) to set their borrowing.
    const burden = inputs.energyBurden ?? 0.05;
    // 8% of GDP: stress threshold above the historical norm of ~4-6%
    // (global energy expenditure share; ~8-13% reached only in the
    // 1979-81 and 2022 price shocks) — calibration anchor, not sourced data
    const burdenSignal = burden / 0.08; // Normalized to threshold (1.0 = normal)
    const energyShare = Math.min(0.30, Math.max(0.10,
      params.baseEnergyInvestmentShare * (1 + params.energyInvestmentSensitivity * (burdenSignal - 1))
    ));
    const realizedCdrSpend = inputs.cdrSpend ?? 0;
    const realizedRobotCapex = inputs.robotCapexSpend ?? 0;
    const realizedDataCenterCapex = inputs.dataCenterCapexSpend ?? 0;
    const specialPurposeSpend = (orders: number) =>
      (inputs.energyCapexSpend ?? orders * energyShare)
      + realizedCdrSpend + realizedRobotCapex + realizedDataCenterCapex;
    // Orders always replace worn general capital ON TOP of the energy and CDR
    // spends debited from them. The order rule already replaces depreciation
    // unconditionally; carving those spends out of that replacement shrank
    // general capital whenever they exceeded net investment, and since desired
    // net investment scales with K, orders shrank with it while its return
    // rose. Above replacement, energy and CDR spends still crowd out net
    // general investment. In the standalone fallback the energy debit scales
    // with orders, so the floor solves orders = s x orders + other + dep.
    //
    // Robot and datacenter capex is capital formation in its own stocks,
    // ordered by demand's deployment rules, so it is ADDED to general orders
    // rather than carved out of general capital's desired expansion. It
    // competes with general investment for financing (internal funds and bank
    // credit) and for the final-use envelope, which cap the total below.
    // Carved out of desired expansion, it froze general capital outright once
    // it exceeded maximumNetInvestmentRate x K: desired expansion scales with
    // K, the capex with GDP, so K could never catch up (ai-energy-boom: K flat
    // at $967T from 2049 to 2100 with a 37% return on capital).
    const automationCapex = realizedRobotCapex + realizedDataCenterCapex;
    const plannedOrders = (circuit: FirmCircuit) => {
      const replacementFloor = inputs.energyCapexSpend !== undefined
        ? inputs.energyCapexSpend + realizedCdrSpend + automationCapex
          + circuit.generalDepreciation
        : (realizedCdrSpend + automationCapex + circuit.generalDepreciation)
          / Math.max(Number.EPSILON, 1 - energyShare);
      return Math.max(circuit.plannedInvestment + automationCapex, replacementFloor);
    };

    // Target leverage. Firms hold private debt / capital (general + robot +
    // datacenter: all of it is financed from the same pool and secures the
    // debt) near the year-0 ratio, closing leverageAdjustmentSpeed of the gap per year
    // (Flannery-Rangan partial adjustment in ratio space), so debt grows with
    // the capital it is secured on. Before this, firms borrowed only the gap
    // between orders and internal funds: once retained profit covered orders
    // net new credit went to ~0 and private debt/GDP decayed at the growth
    // rate against an observed world ratio that has held at ~1.4-1.7 for two
    // decades (IMF Global Debt Database 2025: private debt just under 143% of
    // GDP in 2024, its lowest since 2015; BIS total credit to the private
    // non-financial sector). The stock is the consolidated private
    // non-financial one (households' mortgages included, as leverage on the
    // dwellings inside the PWT capital stock).
    const openingTotalStock = state.stock + automationStock;
    const targetPrivateLeverage = state.targetPrivateLeverage
      ?? (openingTotalStock > 0 ? privateDebt / openingTotalStock : 0);
    const openingPrivateLeverage = openingTotalStock > 0 ? privateDebt / openingTotalStock : 0;
    // Robot and datacenter capital at year end does not depend on the plan
    const closingAutomationStock =
      (1 - params.robotCapitalDepreciation) * robotStock + realizedRobotCapex
      + (1 - params.dataCenterCapitalDepreciation) * dataCenterStock + realizedDataCenterCapex;
    const desiredClosingLeverage = openingPrivateLeverage
      + params.leverageAdjustmentSpeed
        * (targetPrivateLeverage - openingPrivateLeverage);

    // Credit affects debt and interest within the year, while interest affects
    // profit and the financing request. Iterate this small fixed point so the
    // reported order, interest bill, and requested credit are mutually
    // consistent rather than relying on an arbitrary call order.
    // The safe rate's debt term prices last year's smoothed ratio (one source
    // of truth across the credit iterations below).
    const pricedPublicDebtGDP = state.pricedPublicDebtGDP ?? params.initialPublicDebtGDP;
    const runFinance = (plan: FinancingPlan) => advanceCapitalFinance(
      financeState,
      {
        gdp: inputs.gdp,
        capitalStock: state.stock,
        netNewCreditDemand: plan.netNewCreditDemand,
        voluntaryRepayment: plan.voluntaryRepayment,
        trendGrowth: state.trendGrowth,
        pricedPublicDebtGDP,
        additionalPrimaryDeficitRate,
      },
      params,
    );
    const runFirmCircuit = (privateInterest: number) => calculateFirmCircuit(
      inputs.gdp,
      governmentServiceConsumption,
      state.stock,
      privateInterest,
      stability,
      netEnergyFactor,
      params,
      automationLaborShareChange,
      automationDepreciation,
    );
    // Debt left at year end if firms took no new credit and repaid nothing
    // early (scheduled runoff and write-offs only); independent of the plan.
    let plan: FinancingPlan = {
      netNewCreditDemand: 0,
      voluntaryRepayment: 0,
      investmentFinancingGap: 0,
      leverageBorrowing: 0,
    };
    let finance = runFinance(plan);
    const runoffPrivateDebt = finance.state.privateDebt;
    const planFinancing = (circuit: FirmCircuit): FinancingPlan => {
      const orders = Math.min(plannedOrders(circuit), maximumFeasibleInvestment);
      // Pecking order: orders beyond internal funds are financed with debt
      const investmentFinancingGap = Math.max(0, orders - circuit.firmInternalFunds);
      const expectedClosingStock = (1 - params.depreciation) * state.stock
        + Math.max(0, orders - specialPurposeSpend(orders))
        + closingAutomationStock;
      const leverageBorrowing =
        desiredClosingLeverage * expectedClosingStock - runoffPrivateDebt;
      // An over-levered firm with no financing gap repays early from the cash
      // it would otherwise pay out; one with a gap still borrows to invest.
      const spareCash = Math.max(0, circuit.firmInternalFunds - orders);
      return {
        netNewCreditDemand: Math.max(investmentFinancingGap, leverageBorrowing),
        voluntaryRepayment: investmentFinancingGap > 0
          ? 0
          : Math.min(spareCash, Math.max(0, -leverageBorrowing)),
        investmentFinancingGap,
        leverageBorrowing,
      };
    };
    let firmCircuit = runFirmCircuit(finance.privateInterestPayments);
    for (let iteration = 0; iteration < 12; iteration++) {
      const next = planFinancing(firmCircuit);
      const converged =
        Math.abs(next.netNewCreditDemand - plan.netNewCreditDemand)
          <= 1e-10 * Math.max(1, next.netNewCreditDemand)
        && Math.abs(next.voluntaryRepayment - plan.voluntaryRepayment)
          <= 1e-10 * Math.max(1, next.voluntaryRepayment);
      plan = next;
      if (converged) break;
      finance = runFinance(plan);
      firmCircuit = runFirmCircuit(finance.privateInterestPayments);
    }
    // One final evaluation associates the financial stocks and flows exactly
    // with the converged financing request.
    finance = runFinance(plan);
    firmCircuit = runFirmCircuit(finance.privateInterestPayments);
    // Credit beyond the investment gap is a leverage recapitalization: it is
    // paid out to owners with the firm's other surplus cash below.
    const leverageRecapBorrowing = Math.max(
      0,
      finance.newInvestmentLoanOriginations - plan.investmentFinancingGap,
    );

    const openingFinancialLedger = state.financialLedger ?? createCapitalGodleyLedger({
      capitalStock: state.stock,
      automationCapital: automationStock,
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
    // Investment credit not supplied. Unmet leverage demand is not counted:
    // it is visible as privateLeverage below targetPrivateLeverage.
    const unfundedCreditDemand = Math.max(
      0,
      plan.investmentFinancingGap - newInvestmentLoanOriginations,
    );
    // Preserve the scale and economic content of the deprecated field: unlike
    // total originations, this excludes mechanically rolled principal.
    const creditImpulse = newInvestmentLoanOriginations;

    const plannedInvestment = plannedOrders(firmCircuit);
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
    // positive retained profit plus any leverage recap borrowing) after the
    // investment decision. This keeps the
    // circuit closed without forcing households to borrow merely because
    // firms have no profitable use for additional retained earnings.
    const excessFirmCash = Math.min(
      Math.max(
        0,
        firmCircuit.firmInternalFunds + netCashCredit - investment,
      ),
      Math.max(0, firmCircuit.retainedEarnings) + leverageRecapBorrowing,
    );
    const declaredFirmDividends =
      firmCircuit.firmDividendPayments + excessFirmCash;
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
    // Firm cash floor. Investment is capped by CLAMPED internal funds, so
    // once interest due exceeds operating surplus, gross saving goes negative
    // and drains the deposit buffer. When it runs out, firms default rather
    // than overdraw (see settleFirmCashShortfall). Unpaid interest is forgone
    // by banks, never capitalized into the loan, and bankruptcy writes the
    // loans behind it down to what the cash flow can carry (unpaid / r), so
    // zombie principal cannot keep the risk premium and leverage brake on
    // while output shrinks.
    const settled = settleFirmCashShortfall(
      openingFinancialLedger.balances['firms.deposits'] ?? 0,
      {
        grossLoanOriginations,
        principalRepayments: finance.principalRepayments,
        laborCompensation: firmCircuit.laborCompensation,
        householdConsumption,
        privateInterestPayments: finance.privateInterestPayments,
        firmDividendPayments: declaredFirmDividends,
      },
    );
    const {
      firmDividendPayments,
      privateInterestPayments,
      principalRepayments,
      unpaidInterest: unpaidPrivateInterest,
    } = settled;
    // Loans are carried at the rate they pay (the loan rate), not the return on capital
    const insolvencyWriteDown = finance.loanRate > 0
      ? Math.min(finance.state.privateDebt, unpaidPrivateInterest / finance.loanRate)
      : 0;
    const loanWriteOffs =
      finance.loanWriteOffs + settled.defaultedPrincipal + insolvencyWriteDown;
    // Paid basis: interest firms did not pay stays with them, so the sector
    // balances still sum to investment
    const retainedEarnings =
      firmCircuit.profitAfterInterestAndDepreciation
      + unpaidPrivateInterest
      - firmDividendPayments;
    const firmGrossSaving = firmCircuit.depreciationAllowance + retainedEarnings;
    const retireeConsumption = Math.min(pensionTransfers, householdConsumption);
    const workerConsumption = householdConsumption - retireeConsumption;

    // Fiscal closure and ex-post sectoral saving. Banks retain the interest
    // income that holds their equity ratio and distribute the rest; loan
    // write-offs remain a balance-sheet loss rather than current income.
    // Retained income is bank saving and is missing from household income one
    // for one, so the four sector balances still sum to realized investment,
    // up to floating-point error.
    const netTaxes =
      governmentServiceConsumption
      + pensionTransfers
      + publicInterestPayments
      - finance.publicDebtChange;
    const {
      interestIncome: bankInterestIncome,
      dividendPayments: bankDividendPayments,
    } = bankRetention(
      openingFinancialLedger,
      {
        grossLoanOriginations,
        principalRepayments,
        loanWriteOffs,
        privateInterestPayments,
        publicInterestToBanks,
        publicDebtChange: finance.publicDebtChange,
      },
      params.bankEquityRatio,
      params.bankRetentionSpeed,
    );
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

    // BUDGET signal (burden-driven share) — used as the standalone-mode
    // fallback for energy's investment constraint. The K-stock DEBIT below
    // uses REALIZED spends (lagged one year, from the energy/cdr/demand
    // modules) when wired: one ledger, money debited is money spent.
    // Lag caveat: the debit trails the build by a year, so K is
    // over-credited during fast capex growth and the final horizon year is
    // never debited.
    const energyInvestment = investment * energyShare;
    const realizedEnergyCapex = inputs.energyCapexSpend ?? energyInvestment;
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

    // Total capital: general + robot + datacenter
    const totalStock = state.stock + automationStock;

    // Calculate K per effective worker ($K per person)
    const kPerWorker = (totalStock * 1e12) / inputs.effectiveWorkers / 1000;

    // Capital-output ratio
    const capitalOutputRatio = totalStock / inputs.gdp;

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
    ], '$T', 'next general capital stock').value;
    // Robot and datacenter capital: perpetual inventory of realized capex
    // (built, so booked in full even when the pool could not finance it all;
    // that overflow is reported as unfundedRealizedSpend)
    const newRobotStock = (1 - params.robotCapitalDepreciation) * robotStock
      + realizedRobotCapex;
    const newDataCenterStock =
      (1 - params.dataCenterCapitalDepreciation) * dataCenterStock
      + realizedDataCenterCapex;
    const newTotalStock = newStock + newRobotStock + newDataCenterStock;

    // Capital growth rate
    const capitalGrowthRate = yearIndex > 0 && totalStock > 0
      ? (newTotalStock - totalStock) / totalStock
      : 0;

    const newPublicDebt = finance.state.publicDebt;
    const newPrivateDebt = finance.state.privateDebt - insolvencyWriteDown;

    // Trend growth for next year's safe rate: exponential smoothing of
    // realized growth. Year 0 has no prior GDP, so it keeps the anchor.
    const realizedGrowth = yearIndex > 0 && previousGdp > 0
      ? inputs.gdp / previousGdp - 1
      : undefined;
    const openingTrendGrowth = state.trendGrowth ?? params.safeRateGrowthAnchor;
    const nextTrendGrowth = realizedGrowth === undefined
      ? openingTrendGrowth
      : openingTrendGrowth
        + (realizedGrowth - openingTrendGrowth) / params.trendGrowthSmoothingYears;
    // Debt ratio the safe rate prices next year: exponential smoothing of the
    // year-end ratio (see safeRateDebtSmoothingYears).
    const nextPricedPublicDebtGDP = inputs.gdp > 0
      ? pricedPublicDebtGDP
        + (newPublicDebt / inputs.gdp - pricedPublicDebtGDP) / params.safeRateDebtSmoothingYears
      : pricedPublicDebtGDP;

    const openingHouseholdNetWorth =
      openingFinancialLedger.balances['households.netWorth'] ?? 0;
    const financialPosting = postCapitalGodleyYear(openingFinancialLedger, {
      depreciation: firmCircuit.generalDepreciation,
      generalInvestment,
      automationInvestment: automationCapex,
      automationDepreciation,
      laborCompensation: firmCircuit.laborCompensation,
      householdConsumption,
      grossLoanOriginations,
      principalRepayments,
      loanWriteOffs,
      privateInterestPayments,
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
        robotStock: newRobotStock,
        dataCenterStock: newDataCenterStock,
        openingGeneralStock: state.openingGeneralStock,
        referenceLifeExpectancy: refLE,
        referenceDependency: refDependency,
        publicDebt: newPublicDebt,
        privateDebt: newPrivateDebt,
        previousGdp: inputs.gdp,
        trendGrowth: nextTrendGrowth,
        pricedPublicDebtGDP: nextPricedPublicDebtGDP,
        referenceTransferBurden,
        referenceAutomationLaborShare,
        targetPrivateLeverage,
        financialLedger: financialPosting.state,
      },
      outputs: {
        stock: totalStock, // Output current stock (before update)
        nextCapitalStock: newTotalStock,
        generalCapitalStock: state.stock,
        nextGeneralCapitalStock: newStock,
        // Production anchors K0 on the observed 2025 stock (its lag's initial)
        // and uses only K/K0. Rescaling general capital by observed / year-0
        // general makes that ratio exactly general_t / general_2025; read
        // raw, the year-0 carve-out of the robot and datacenter fleets was a
        // permanent -0.23% in K (-0.06% of GDP).
        nextProductionCapitalStock: state.openingGeneralStock !== undefined
          && state.openingGeneralStock > 0
          ? newStock * params.initialCapitalStock / state.openingGeneralStock
          : newStock,
        robotCapitalStock: robotStock,
        dataCenterCapitalStock: dataCenterStock,
        automationDepreciation,
        investment,
        plannedInvestment,
        unfundedInvestmentDemand,
        unfundedFinancingDemand,
        grossSavings,
        laborCompensation: firmCircuit.laborCompensation,
        laborShare: inputs.gdp > 0 ? firmCircuit.laborCompensation / inputs.gdp : 0,
        operatingSurplus: firmCircuit.operatingSurplus,
        privateInterestPayments,
        unpaidPrivateInterest,
        profitAfterInterestAndDepreciation:
          firmCircuit.profitAfterInterestAndDepreciation,
        profitRate: firmCircuit.profitRate,
        retainedEarnings,
        firmDividendPayments,
        bankDividendPayments,
        bankInterestIncome,
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
        safeRate: finance.safeRate,
        loanRate: finance.loanRate,
        repressionGap: finance.repressionGap,
        robotsDensity,
        automationShare,
        kPerWorker,
        capitalOutputRatio,
        capitalGrowthRate,
        energyInvestment,
        generalInvestment,
        capitalFormation: generalInvestment + automationCapex,
        unfundedRealizedSpend,
        energyShareOfInvestment: energyShare,
        retireeCost,
        childCost,
        regionalRetireeCost,
        regionalChildCost,
        regionalRetirementAgeExtension,
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
        creditCapacity: finance.netNewCreditCapacity,
        creditImpulse,
        principalRepayments,
        loanWriteOffs,
        netCreditCreation: newPrivateDebt - privateDebt,
        privateLeverage: openingPrivateLeverage,
        targetPrivateLeverage,
        leverageBorrowing: plan.leverageBorrowing,
        leverageRecapBorrowing,
        voluntaryPrincipalRepayments: finance.voluntaryPrincipalRepayments,
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
