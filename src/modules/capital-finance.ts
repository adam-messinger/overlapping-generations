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
  principalRepayments: number;
  loanWriteOffs: number;
  netCreditCreation: number;
  publicInterestPayments: number;
  privateInterestPayments: number;
  primaryDeficit: number;
  interestRate: number;
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
  let refinancedPrincipal = 0;
  let principalRepayments = 0;
  let loanWriteOffs = 0;
  let publicInterestPayments = 0;
  let privateInterestPayments = 0;
  let primaryDeficit = 0;
  let weightedInterestRate = 0;
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

    const fiscalConsolidationRate = Math.min(
      params.fiscalReactionMax * localGdp,
      Math.max(
        0,
        params.fiscalReactionCoeff
          * (publicDebtGDP - params.fiscalReactionThreshold)
          * localGdp,
      ),
    );
    const rawPublicDebtChange =
      (params.publicDeficitRate * localGdp - fiscalConsolidationRate) * dt;
    const publicDebtChange = Math.max(-publicDebt, rawPublicDebtChange);

    const spreadFactor = Math.max(
      0,
      1 - params.creditSensitivity * Math.max(0, interestRate - gdpGrowth),
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

    publicInterestPayments += interestRate * publicDebt * dt;
    privateInterestPayments += Math.max(0, interestRate) * privateDebt * dt;
    primaryDeficit += publicDebtChange;
    publicDebt += publicDebtChange;
    privateDebt += origination - repayment - writeOff;
    grossLoanOriginations += origination;
    newInvestmentLoanOriginations += investmentOrigination;
    refinancedPrincipal += refinancing;
    principalRepayments += repayment;
    loanWriteOffs += writeOff;
    remainingNetNewCreditDemand -= investmentOrigination;
    weightedInterestRate += interestRate * dt;
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
    principalRepayments,
    loanWriteOffs,
    netCreditCreation: privateDebt - openingPrivateDebt,
    publicInterestPayments,
    privateInterestPayments,
    primaryDeficit,
    interestRate: weightedInterestRate,
    debtRiskPremium: weightedRiskPremium,
    path,
  };
}
