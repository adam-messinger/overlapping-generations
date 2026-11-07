/**
 * Financial stock transition used by the OLG capital module.
 *
 * Rates are annualized, while stocks are advanced in configurable substeps.
 * The default quarterly step exposes nonlinear debt/risk feedback that a
 * single annual Euler update can otherwise hide.
 */

export interface CapitalFinanceParameters {
  alpha: number;
  depreciation: number;
  publicDeficitRate: number;
  fiscalReactionCoeff: number;
  fiscalReactionThreshold: number;
  fiscalReactionMax: number;
  baseCreditGrowth: number;
  creditSensitivity: number;
  leverageDamping: number;
  leverageThreshold: number;
  privateAmortization: number;
  loanRolloverRate: number;
  privateDefaultRate: number;
  debtRiskLambda: number;
  debtRiskThreshold: number;
  neutralSafeRate: number;
  safeRateGrowthPassThrough: number;
  safeRateGrowthAnchor: number;
  safeRateDebtSensitivity: number;
  initialPublicDebtGDP: number;
  financialRepression: number;
  repressionDebtThreshold: number;
  repressionDepth: number;
  creditSpread: number;
  financialSubsteps: number;
}

export interface CapitalFinanceState {
  publicDebt: number;
  privateDebt: number;
  previousGdp: number;
}

export interface CapitalFinanceInputs {
  gdp: number;
  capitalStock: number;
  /**
   * Desired net-new bank credit for investment. When omitted, banks lend up
   * to the modeled credit-capacity envelope. Principal refinancing is handled
   * separately and never counts as investment finance.
   */
  netNewCreditDemand?: number;
  /** Smoothed real GDP growth the safe rate tracks (r* = c·g + z). Defaults to the anchor. */
  trendGrowth?: number;
  /**
   * Smoothed public debt/GDP the safe rate's debt term prices. Markets price
   * the expected debt path, not one year's swing in the ratio. Defaults to the
   * current (substep) ratio. The repression threshold reads the actual ratio.
   */
  pricedPublicDebtGDP?: number;
  /** Extra primary deficit as a fraction of GDP (e.g. unfunded ageing costs). Defaults to 0. */
  additionalPrimaryDeficitRate?: number;
}

export interface CapitalFinancePathPoint {
  substep: number;
  fractionOfYear: number;
  gdp: number;
  publicDebt: number;
  privateDebt: number;
  publicDebtGDP: number;
  privateDebtGDP: number;
  interestRate: number;
  safeRate: number;
  loanRate: number;
  repressionGap: number;
  debtRiskPremium: number;
}

export interface CapitalFinanceResult {
  state: CapitalFinanceState;
  openingPublicDebt: number;
  openingPrivateDebt: number;
  openingPublicDebtGDP: number;
  openingPrivateDebtGDP: number;
  openingTotalDebtGDP: number;
  publicDebtChange: number;
  /** Total new loan contracts, including principal refinanced at maturity. */
  grossLoanOriginations: number;
  /** Originations that add purchasing power for new investment. */
  newInvestmentLoanOriginations: number;
  /** Originations that replace maturing principal without adding net finance. */
  refinancedPrincipal: number;
  /** Requested investment credit not supplied by banks. */
  unfundedNetNewCreditDemand: number;
  /** New investment credit banks would extend this year (the lending
   *  envelope, summed over substeps along the realized debt path). Credit
   *  demand minus this is the unclipped form of unfundedNetNewCreditDemand. */
  netNewCreditCapacity: number;
  principalRepayments: number;
  loanWriteOffs: number;
  netCreditCreation: number;
  publicInterestPayments: number;
  privateInterestPayments: number;
  primaryDeficit: number;
  /** Return on capital plus the debt premium: firms' required return. */
  interestRate: number;
  /** Real rate on public debt: tracks trend growth and the public-debt ratio. */
  safeRate: number;
  /** Real rate on private bank debt: safeRate plus the credit spread. */
  loanRate: number;
  /** How far policy holds the safe rate below its market level (financial repression). */
  repressionGap: number;
  debtRiskPremium: number;
  path: readonly CapitalFinancePathPoint[];
}

function finiteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be finite and non-negative`);
  }
}

export function advanceCapitalFinance(
  state: CapitalFinanceState,
  inputs: CapitalFinanceInputs,
  params: CapitalFinanceParameters,
): CapitalFinanceResult {
  finiteNonNegative(state.publicDebt, 'publicDebt');
  finiteNonNegative(state.privateDebt, 'privateDebt');
  finiteNonNegative(state.previousGdp, 'previousGdp');
  finiteNonNegative(inputs.gdp, 'gdp');
  finiteNonNegative(inputs.capitalStock, 'capitalStock');
  if (inputs.netNewCreditDemand !== undefined) {
    finiteNonNegative(inputs.netNewCreditDemand, 'netNewCreditDemand');
  }
  if (!Number.isInteger(params.financialSubsteps) || params.financialSubsteps < 1) {
    throw new Error('financialSubsteps must be an integer >= 1');
  }
  if (
    !Number.isFinite(params.loanRolloverRate)
    || params.loanRolloverRate < 0
    || params.loanRolloverRate > 1
  ) {
    throw new Error('loanRolloverRate must be between 0 and 1');
  }

  const openingPublicDebt = state.publicDebt;
  const openingPrivateDebt = state.privateDebt;
  const ratioDenominator = Math.max(inputs.gdp, Number.EPSILON);
  const openingPublicDebtGDP = openingPublicDebt / ratioDenominator;
  const openingPrivateDebtGDP = openingPrivateDebt / ratioDenominator;
  const openingTotalDebtGDP = openingPublicDebtGDP + openingPrivateDebtGDP;
  const previousGdp = state.previousGdp > 0 ? state.previousGdp : inputs.gdp;
  const gdpGrowth = previousGdp > 0 ? (inputs.gdp - previousGdp) / previousGdp : 0;
  const dt = 1 / params.financialSubsteps;

  let publicDebt = openingPublicDebt;
  let privateDebt = openingPrivateDebt;
  let grossLoanOriginations = 0;
  let newInvestmentLoanOriginations = 0;
  let totalNetNewCreditCapacity = 0;
  let refinancedPrincipal = 0;
  let principalRepayments = 0;
  let loanWriteOffs = 0;
  let publicInterestPayments = 0;
  let privateInterestPayments = 0;
  let primaryDeficit = 0;
  let weightedInterestRate = 0;
  let weightedSafeRate = 0;
  let weightedLoanRate = 0;
  let weightedRepressionGap = 0;
  let weightedRiskPremium = 0;
  let remainingNetNewCreditDemand =
    inputs.netNewCreditDemand ?? Number.POSITIVE_INFINITY;
  const path: CapitalFinancePathPoint[] = [];

  for (let substep = 0; substep < params.financialSubsteps; substep++) {
    const midpoint = (substep + 0.5) * dt;
    const localGdp = Math.max(
      Number.EPSILON,
      previousGdp + (inputs.gdp - previousGdp) * midpoint,
    );
    const publicDebtGDP = publicDebt / localGdp;
    const privateDebtGDP = privateDebt / localGdp;
    const totalDebtGDP = publicDebtGDP + privateDebtGDP;
    const debtRiskPremium =
      params.debtRiskLambda * Math.max(0, totalDebtGDP - params.debtRiskThreshold);
    const baseInterestRate = inputs.capitalStock > 0
      ? params.alpha * localGdp / inputs.capitalStock - params.depreciation
      : params.depreciation;
    const interestRate = baseInterestRate + debtRiskPremium;
    // Three rates, not one. The return on capital (interestRate) is what
    // capital earns; governments and banks borrow far below it, and the gap
    // is not fixed: safe rates fell ~5pp from the mid-1980s while the return
    // on capital stayed flat (Marx, Mojon & Velde 2021). The safe rate
    // follows trend growth instead, r* = c·g + z (Laubach & Williams 2003;
    // Holston, Laubach & Williams 2017), and rises with PUBLIC debt (Laubach
    // 2009). The total-debt premium above is mostly private leverage, so it
    // prices the return on capital, not the sovereign.
    const trendGrowth = inputs.trendGrowth ?? params.safeRateGrowthAnchor;
    const marketSafeRate =
      params.neutralSafeRate
      + params.safeRateGrowthPassThrough
        * (trendGrowth - params.safeRateGrowthAnchor)
      + params.safeRateDebtSensitivity
        * ((inputs.pricedPublicDebtGDP ?? publicDebtGDP) - params.initialPublicDebtGDP);
    // Financial repression: policy holds the safe rate below its market
    // level (captive buyers, rate caps, yield-curve control), so debt is
    // liquidated through r < g (Reinhart & Sbrancia 2015). Two parts: an
    // explicit lever, and fiscal dominance above a public-debt threshold,
    // where the rate is capped at trend growth less repressionDepth. The cap
    // phases in over 25pp of debt/GDP so crossing the threshold is smooth.
    const repressionWeight = Math.min(1, Math.max(
      0,
      (publicDebtGDP - params.repressionDebtThreshold) / 0.25,
    ));
    const repressionCap = trendGrowth - params.repressionDepth;
    const repressionGap =
      params.financialRepression
      + repressionWeight * Math.max(0, marketSafeRate - repressionCap);
    const safeRate = marketSafeRate - repressionGap;
    const loanRate = safeRate + params.creditSpread;

    const fiscalConsolidationRate = Math.min(
      params.fiscalReactionMax * localGdp,
      Math.max(
        0,
        params.fiscalReactionCoeff
          * (publicDebtGDP - params.fiscalReactionThreshold)
          * localGdp,
      ),
    );
    // Debt accumulates the overall deficit: the primary balance plus
    // interest at the safe rate. (Interest used to be tax-financed by
    // construction because it was charged at the ~6% return on capital,
    // where capitalizing it spirals.) Δd = pd + (r_safe - g)·d, so a safe
    // rate held below growth erodes the debt ratio: the financial-repression
    // "liquidation effect" (Reinhart & Sbrancia 2015). The fiscal reaction
    // still acts on the primary balance (Bohn 1998).
    const primaryDebtChange = (
      (params.publicDeficitRate + (inputs.additionalPrimaryDeficitRate ?? 0)) * localGdp
      - fiscalConsolidationRate
    ) * dt;
    const interestAccrual = safeRate * publicDebt * dt;
    const publicDebtChange = Math.max(
      -publicDebt,
      primaryDebtChange + interestAccrual,
    );

    const spreadFactor = Math.max(
      0,
      1 - params.creditSensitivity * Math.max(0, loanRate - gdpGrowth),
    );
    const leverageFactor = Math.max(
      0,
      1 - params.leverageDamping
        * Math.max(0, privateDebtGDP - params.leverageThreshold),
    );
    const netNewCreditCapacity =
      params.baseCreditGrowth * localGdp * spreadFactor * leverageFactor * dt;
    let repayment = privateDebt * params.privateAmortization * dt;
    let writeOff = privateDebt * params.privateDefaultRate * dt;
    // Principal and write-offs apply to the opening stock in this substep;
    // newly originated loans do not mature or default immediately.
    if (repayment + writeOff > privateDebt && repayment + writeOff > 0) {
      const scale = privateDebt / (repayment + writeOff);
      repayment *= scale;
      writeOff *= scale;
    }
    const refinancing = repayment * params.loanRolloverRate;
    const investmentOrigination = Math.min(
      netNewCreditCapacity,
      remainingNetNewCreditDemand,
    );
    const origination = refinancing + investmentOrigination;
    totalNetNewCreditCapacity += netNewCreditCapacity;

    publicInterestPayments += safeRate * publicDebt * dt;
    privateInterestPayments += Math.max(0, loanRate) * privateDebt * dt;
    primaryDeficit += publicDebtChange - interestAccrual;
    publicDebt += publicDebtChange;
    privateDebt += origination - repayment - writeOff;
    grossLoanOriginations += origination;
    newInvestmentLoanOriginations += investmentOrigination;
    refinancedPrincipal += refinancing;
    principalRepayments += repayment;
    loanWriteOffs += writeOff;
    remainingNetNewCreditDemand -= investmentOrigination;
    weightedInterestRate += interestRate * dt;
    weightedSafeRate += safeRate * dt;
    weightedLoanRate += loanRate * dt;
    weightedRepressionGap += repressionGap * dt;
    weightedRiskPremium += debtRiskPremium * dt;
    path.push({
      substep,
      fractionOfYear: (substep + 1) * dt,
      gdp: localGdp,
      publicDebt,
      privateDebt,
      publicDebtGDP: publicDebt / localGdp,
      privateDebtGDP: privateDebt / localGdp,
      interestRate,
      safeRate,
      loanRate,
      repressionGap,
      debtRiskPremium,
    });
  }

  return {
    state: {
      publicDebt,
      privateDebt,
      previousGdp: inputs.gdp,
    },
    openingPublicDebt,
    openingPrivateDebt,
    openingPublicDebtGDP,
    openingPrivateDebtGDP,
    openingTotalDebtGDP,
    publicDebtChange: publicDebt - openingPublicDebt,
    grossLoanOriginations,
    newInvestmentLoanOriginations,
    refinancedPrincipal,
    unfundedNetNewCreditDemand: inputs.netNewCreditDemand === undefined
      ? 0
      : Math.max(0, remainingNetNewCreditDemand),
    netNewCreditCapacity: totalNetNewCreditCapacity,
    principalRepayments,
    loanWriteOffs,
    netCreditCreation: privateDebt - openingPrivateDebt,
    publicInterestPayments,
    privateInterestPayments,
    primaryDeficit,
    interestRate: weightedInterestRate,
    safeRate: weightedSafeRate,
    loanRate: weightedLoanRate,
    repressionGap: weightedRepressionGap,
    debtRiskPremium: weightedRiskPremium,
    path,
  };
}
