import {
  analyzeDiscreteStability2D,
  finiteDifferenceJacobian,
  type DiscreteStability2D,
} from 'tsimulation';
import {
  advanceCapitalFinance,
  type CapitalFinanceInputs,
  type CapitalFinanceParameters,
  type CapitalFinanceState,
} from '../modules/capital-finance.js';

export interface FinancialStabilityPoint {
  state: CapitalFinanceState;
  inputs: CapitalFinanceInputs;
  params: CapitalFinanceParameters;
}

export interface FinancialLocalStability {
  point: FinancialStabilityPoint;
  analysis: DiscreteStability2D;
}

/**
 * Linearize the one-year debt-stock map around a specified operating point.
 * This is a local diagnostic, not a proof of global stability.
 */
export function analyzeFinancialLocalStability(
  point: FinancialStabilityPoint,
): FinancialLocalStability {
  const map = ([publicDebt, privateDebt]: readonly number[]) => {
    const result = advanceCapitalFinance(
      {
        publicDebt,
        privateDebt,
        previousGdp: point.state.previousGdp,
      },
      point.inputs,
      point.params,
    );
    return [result.state.publicDebt, result.state.privateDebt];
  };
  const jacobian = finiteDifferenceJacobian(
    map,
    [point.state.publicDebt, point.state.privateDebt],
    { lowerBounds: [0, 0] },
  );
  return {
    point,
    analysis: analyzeDiscreteStability2D(jacobian),
  };
}

export interface FinancialTimestepRow {
  substeps: number;
  publicDebt: number;
  privateDebt: number;
  publicDebtRelativeError: number;
  privateDebtRelativeError: number;
}

/** Compare coarser within-year integrations with the finest requested grid. */
export function compareFinancialTimesteps(
  point: FinancialStabilityPoint,
  resolutions: readonly number[] = [1, 4, 12],
): readonly FinancialTimestepRow[] {
  if (resolutions.length < 2) {
    throw new Error('Timestep comparison requires at least two resolutions');
  }
  if (
    resolutions.some((resolution) =>
      !Number.isInteger(resolution) || resolution < 1 || resolution > 365)
  ) {
    throw new Error('Timestep resolutions must be integers between 1 and 365');
  }
  const unique = [...new Set(resolutions)].sort((left, right) => left - right);
  if (unique.length < 2) {
    throw new Error('Timestep comparison requires at least two distinct resolutions');
  }
  const runs = unique.map((substeps) => ({
    substeps,
    result: advanceCapitalFinance(
      point.state,
      point.inputs,
      { ...point.params, financialSubsteps: substeps },
    ),
  }));
  const reference = runs[runs.length - 1].result.state;
  return runs.map(({ substeps, result }) => ({
    substeps,
    publicDebt: result.state.publicDebt,
    privateDebt: result.state.privateDebt,
    publicDebtRelativeError:
      Math.abs(result.state.publicDebt - reference.publicDebt)
      / Math.max(1, Math.abs(reference.publicDebt)),
    privateDebtRelativeError:
      Math.abs(result.state.privateDebt - reference.privateDebt)
      / Math.max(1, Math.abs(reference.privateDebt)),
  }));
}

export type DebtBasinOutcome = 'contracting' | 'bounded' | 'expanding' | 'escape';

export interface DebtBasinCell {
  initialPublicDebtGDP: number;
  initialPrivateDebtGDP: number;
  terminalPublicDebtGDP: number;
  terminalPrivateDebtGDP: number;
  maximumTotalDebtGDP: number;
  outcome: DebtBasinOutcome;
}

export interface DebtBasinOptions {
  publicDebtRatios: readonly number[];
  privateDebtRatios: readonly number[];
  years?: number;
  escapeTotalDebtGDP?: number;
}

/**
 * Scan a grid of initial debt ratios under constant GDP/capital conditions.
 * "Escape" means the path exceeds the explicit ceiling; the other labels
 * describe terminal direction and are not probability statements.
 */
export function scanDebtRatioBasin(
  point: Omit<FinancialStabilityPoint, 'state'>,
  options: DebtBasinOptions,
): readonly DebtBasinCell[] {
  const years = options.years ?? 40;
  const escapeTotalDebtGDP = options.escapeTotalDebtGDP ?? 10;
  if (!Number.isInteger(years) || years < 1) {
    throw new Error('Debt basin years must be an integer >= 1');
  }
  if (!Number.isFinite(escapeTotalDebtGDP) || escapeTotalDebtGDP <= 0) {
    throw new Error('Debt basin escapeTotalDebtGDP must be positive');
  }
  const ratios = [...options.publicDebtRatios, ...options.privateDebtRatios];
  if (ratios.some((ratio) => !Number.isFinite(ratio) || ratio < 0)) {
    throw new Error('Debt basin ratios must be finite and non-negative');
  }
  const gdp = point.inputs.gdp;
  const cells: DebtBasinCell[] = [];
  for (const initialPublicDebtGDP of options.publicDebtRatios) {
    for (const initialPrivateDebtGDP of options.privateDebtRatios) {
      const initialTotal = initialPublicDebtGDP + initialPrivateDebtGDP;
      let state: CapitalFinanceState = {
        publicDebt: initialPublicDebtGDP * gdp,
        privateDebt: initialPrivateDebtGDP * gdp,
        previousGdp: gdp,
      };
      let maximumTotalDebtGDP = initialTotal;
      let escaped = initialTotal > escapeTotalDebtGDP;
      for (let year = 0; year < years && !escaped; year++) {
        state = advanceCapitalFinance(state, point.inputs, point.params).state;
        const total = (state.publicDebt + state.privateDebt) / Math.max(gdp, Number.EPSILON);
        maximumTotalDebtGDP = Math.max(maximumTotalDebtGDP, total);
        escaped = !Number.isFinite(total) || total > escapeTotalDebtGDP;
      }
      const terminalPublicDebtGDP = state.publicDebt / Math.max(gdp, Number.EPSILON);
      const terminalPrivateDebtGDP = state.privateDebt / Math.max(gdp, Number.EPSILON);
      const terminalTotal = terminalPublicDebtGDP + terminalPrivateDebtGDP;
      const outcome: DebtBasinOutcome = escaped
        ? 'escape'
        : terminalTotal < initialTotal - 1e-6
          ? 'contracting'
          : terminalTotal > initialTotal + 1e-6
            ? 'expanding'
            : 'bounded';
      cells.push({
        initialPublicDebtGDP,
        initialPrivateDebtGDP,
        terminalPublicDebtGDP,
        terminalPrivateDebtGDP,
        maximumTotalDebtGDP,
        outcome,
      });
    }
  }
  return cells;
}
