/**
 * First-class stock/flow primitives for physical and financial vintages.
 *
 * The framework deliberately keeps quantities numeric at model boundaries,
 * but state transitions that mix additions, retirements, scrappage, delivery
 * lags, and terminal stocks should not be reimplemented ad hoc in every model.
 */

import { getUnit } from './units.js';

const EPSILON = 1e-12;

function finiteNonNegative(value: number, context: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${context} must be finite and non-negative`);
  }
}

function integer(value: number, context: string, min = 0): void {
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${context} must be an integer >= ${min}`);
  }
}

function validUnit(unit: string, context: string): void {
  if (!getUnit(unit)) throw new Error(`${context} has unknown unit '${unit}'`);
}

export type InitialRetirementProfile = 'uniform' | 'bullet';

export interface VintageCohort {
  id: string;
  vintageStep: number;
  inServiceStep: number;
  retirementStep: number;
  originalAmount: number;
  remainingAmount: number;
}

export interface VintageStockState {
  unit: string;
  lastStep: number;
  cohorts: readonly VintageCohort[];
  cumulativeAdditions: number;
  cumulativeDeliveries: number;
  cumulativeScheduledRetirements: number;
  cumulativeScrappage: number;
}

export interface VintageStockAdvance {
  state: VintageStockState;
  openingStock: number;
  additions: number;
  deliveries: number;
  scheduledRetirements: number;
  scrappage: number;
  closingStock: number;
  terminalStock: number;
  terminalInTransit: number;
  conservationResidual: number;
}

export function activeVintageStock(
  state: VintageStockState,
  step = state.lastStep,
): number {
  return state.cohorts.reduce((sum, cohort) =>
    cohort.inServiceStep <= step && cohort.retirementStep > step
      ? sum + cohort.remainingAmount
      : sum, 0);
}

export function inTransitVintageStock(
  state: VintageStockState,
  step = state.lastStep,
): number {
  return state.cohorts.reduce((sum, cohort) =>
    cohort.inServiceStep > step ? sum + cohort.remainingAmount : sum, 0);
}

/** Return the active stock scheduled to retire in the next named step. */
export function scheduledVintageRetirements(
  state: VintageStockState,
  step = state.lastStep + 1,
): number {
  integer(step, 'step');
  if (step <= state.lastStep) {
    throw new Error(
      `Scheduled-retirement step must be after ${state.lastStep}, got ${step}`,
    );
  }
  return state.cohorts.reduce((sum, cohort) =>
    cohort.remainingAmount > 0 &&
    cohort.inServiceStep <= state.lastStep &&
    cohort.retirementStep <= step
      ? sum + cohort.remainingAmount
      : sum, 0);
}

/**
 * Create an opening stock. A uniform legacy profile retires equal slices at
 * steps startStep..startStep+life-1, matching the common assumption that the
 * unknown opening fleet is uniformly distributed across ages.
 */
export function createVintageStock(options: {
  unit: string;
  initialStock?: number;
  serviceLifeSteps: number;
  startStep?: number;
  initialRetirementProfile?: InitialRetirementProfile;
  idPrefix?: string;
}): VintageStockState {
  validUnit(options.unit, 'Vintage stock');
  const initialStock = options.initialStock ?? 0;
  const startStep = options.startStep ?? 0;
  const profile = options.initialRetirementProfile ?? 'uniform';
  finiteNonNegative(initialStock, 'initialStock');
  integer(options.serviceLifeSteps, 'serviceLifeSteps', 1);
  integer(startStep, 'startStep');
  if (profile !== 'uniform' && profile !== 'bullet') {
    throw new Error(
      `initialRetirementProfile must be 'uniform' or 'bullet', got '${String(profile)}'`,
    );
  }
  const cohorts: VintageCohort[] = [];
  if (initialStock > 0 && profile === 'uniform') {
    const amount = initialStock / options.serviceLifeSteps;
    for (let remainingLife = 1; remainingLife <= options.serviceLifeSteps; remainingLife++) {
      cohorts.push({
        id: `${options.idPrefix ?? 'legacy'}-${remainingLife}`,
        vintageStep: startStep - (options.serviceLifeSteps - remainingLife),
        inServiceStep: Number.MIN_SAFE_INTEGER,
        retirementStep: startStep + remainingLife - 1,
        originalAmount: amount,
        remainingAmount: amount,
      });
    }
  } else if (initialStock > 0) {
    cohorts.push({
      id: `${options.idPrefix ?? 'legacy'}-bullet`,
      vintageStep: startStep,
      inServiceStep: Number.MIN_SAFE_INTEGER,
      retirementStep: startStep + options.serviceLifeSteps - 1,
      originalAmount: initialStock,
      remainingAmount: initialStock,
    });
  }
  return {
    unit: options.unit,
    lastStep: startStep - 1,
    cohorts,
    cumulativeAdditions: 0,
    cumulativeDeliveries: 0,
    cumulativeScheduledRetirements: 0,
    cumulativeScrappage: 0,
  };
}

/**
 * Advance one consecutive step. Scheduled retirement is a beginning-of-step
 * flow; deliveries and immediate additions then enter service; scrappage is
 * applied pro rata to the surviving active fleet.
 */
export function advanceVintageStock(
  state: VintageStockState,
  options: {
    step: number;
    additions?: number;
    serviceLifeSteps: number;
    inServiceDelaySteps?: number;
    scrappageAmount?: number;
    scrappageFraction?: number;
    cohortId?: string;
  },
): VintageStockAdvance {
  validUnit(state.unit, 'Vintage stock state');
  integer(options.step, 'step');
  if (options.step !== state.lastStep + 1) {
    throw new Error(
      `Vintage stock step must be consecutive: expected ${state.lastStep + 1}, got ${options.step}`,
    );
  }
  integer(options.serviceLifeSteps, 'serviceLifeSteps', 1);
  const delay = options.inServiceDelaySteps ?? 0;
  integer(delay, 'inServiceDelaySteps');
  const additions = options.additions ?? 0;
  const requestedScrappage = options.scrappageAmount ?? 0;
  const scrappageFraction = options.scrappageFraction ?? 0;
  finiteNonNegative(additions, 'additions');
  finiteNonNegative(requestedScrappage, 'scrappageAmount');
  if (!Number.isFinite(scrappageFraction) || scrappageFraction < 0 || scrappageFraction > 1) {
    throw new Error('scrappageFraction must be finite and in [0,1]');
  }
  if (requestedScrappage > 0 && scrappageFraction > 0) {
    throw new Error('Specify scrappageAmount or scrappageFraction, not both');
  }

  const openingStock = activeVintageStock(state);
  const nextCohorts = state.cohorts.map((cohort) => ({ ...cohort }));
  let scheduledRetirements = 0;
  let deliveries = 0;

  for (const cohort of nextCohorts) {
    const wasActive = cohort.inServiceStep <= state.lastStep;
    if (wasActive && cohort.retirementStep <= options.step) {
      scheduledRetirements += cohort.remainingAmount;
      cohort.remainingAmount = 0;
    } else if (
      cohort.remainingAmount > 0 &&
      cohort.inServiceStep > state.lastStep &&
      cohort.inServiceStep <= options.step
    ) {
      deliveries += cohort.remainingAmount;
    }
  }

  if (additions > 0) {
    const inServiceStep = options.step + delay;
    nextCohorts.push({
      id: options.cohortId ?? `vintage-${options.step}-${nextCohorts.length}`,
      vintageStep: options.step,
      inServiceStep,
      retirementStep: inServiceStep + options.serviceLifeSteps,
      originalAmount: additions,
      remainingAmount: additions,
    });
    if (delay === 0) deliveries += additions;
  }

  const activeBeforeScrappage = nextCohorts.reduce((sum, cohort) =>
    cohort.remainingAmount > 0 &&
    cohort.inServiceStep <= options.step &&
    cohort.retirementStep > options.step
      ? sum + cohort.remainingAmount
      : sum, 0);
  const scrappage = Math.min(
    activeBeforeScrappage,
    requestedScrappage > 0
      ? requestedScrappage
      : activeBeforeScrappage * scrappageFraction,
  );
  if (scrappage > 0 && activeBeforeScrappage > 0) {
    const retention = 1 - scrappage / activeBeforeScrappage;
    for (const cohort of nextCohorts) {
      if (
        cohort.inServiceStep <= options.step &&
        cohort.retirementStep > options.step
      ) {
        cohort.remainingAmount *= retention;
      }
    }
  }

  const cohorts = nextCohorts.filter((cohort) =>
    cohort.remainingAmount > EPSILON && cohort.retirementStep > options.step);
  const nextState: VintageStockState = {
    unit: state.unit,
    lastStep: options.step,
    cohorts,
    cumulativeAdditions: state.cumulativeAdditions + additions,
    cumulativeDeliveries: state.cumulativeDeliveries + deliveries,
    cumulativeScheduledRetirements:
      state.cumulativeScheduledRetirements + scheduledRetirements,
    cumulativeScrappage: state.cumulativeScrappage + scrappage,
  };
  const closingStock = activeVintageStock(nextState);
  const terminalInTransit = inTransitVintageStock(nextState);
  const conservationResidual =
    closingStock - (openingStock + deliveries - scheduledRetirements - scrappage);
  const tolerance = 1e-9 * Math.max(1, openingStock, deliveries, closingStock);
  if (Math.abs(conservationResidual) > tolerance) {
    throw new Error(
      `Vintage stock conservation failed: residual=${conservationResidual} ${state.unit}`,
    );
  }
  return {
    state: nextState,
    openingStock,
    additions,
    deliveries,
    scheduledRetirements,
    scrappage,
    closingStock,
    terminalStock: closingStock,
    terminalInTransit,
    conservationResidual,
  };
}

export interface DepreciableVintage {
  id: string;
  expenditureStep: number;
  inServiceStep: number;
  cost: number;
  usefulLifeSteps: number;
  salvageValue?: number;
}

export interface DepreciationSnapshot {
  step: number;
  depreciation: number;
  accumulatedDepreciation: number;
  endingBookValue: number;
  grossBookValue: number;
}

export function depreciableVintage(options: DepreciableVintage): DepreciableVintage {
  integer(options.expenditureStep, 'expenditureStep');
  integer(options.inServiceStep, 'inServiceStep');
  integer(options.usefulLifeSteps, 'usefulLifeSteps', 1);
  if (options.inServiceStep < options.expenditureStep) {
    throw new Error('inServiceStep cannot precede expenditureStep');
  }
  finiteNonNegative(options.cost, 'cost');
  finiteNonNegative(options.salvageValue ?? 0, 'salvageValue');
  if ((options.salvageValue ?? 0) > options.cost) {
    throw new Error('salvageValue cannot exceed cost');
  }
  if (!options.id.trim()) throw new Error('Depreciable vintage ID must not be empty');
  return { ...options };
}

/** Straight-line book depreciation for explicit in-service vintages. */
export function straightLineDepreciation(
  vintages: readonly DepreciableVintage[],
  step: number,
): DepreciationSnapshot {
  integer(step, 'step');
  let depreciation = 0;
  let accumulatedDepreciation = 0;
  let grossBookValue = 0;
  for (const raw of vintages) {
    const vintage = depreciableVintage(raw);
    if (vintage.expenditureStep > step) continue;
    grossBookValue += vintage.cost;
    const basis = vintage.cost - (vintage.salvageValue ?? 0);
    const perStep = basis / vintage.usefulLifeSteps;
    const elapsed = Math.max(0, step - vintage.inServiceStep + 1);
    const depreciatedSteps = Math.min(vintage.usefulLifeSteps, elapsed);
    accumulatedDepreciation += perStep * depreciatedSteps;
    if (step >= vintage.inServiceStep &&
        step < vintage.inServiceStep + vintage.usefulLifeSteps) {
      depreciation += perStep;
    }
  }
  return {
    step,
    depreciation,
    accumulatedDepreciation,
    endingBookValue: Math.max(0, grossBookValue - accumulatedDepreciation),
    grossBookValue,
  };
}

export interface TransitBatch {
  id: string;
  dispatchStep: number;
  deliveryStep: number;
  amount: number;
}

export interface TransitLedgerState {
  unit: string;
  lastStep: number;
  batches: readonly TransitBatch[];
  cumulativeDispatches: number;
  cumulativeArrivals: number;
}

export interface TransitAdvance {
  state: TransitLedgerState;
  dispatched: number;
  arrived: number;
  terminalInTransit: number;
  conservationResidual: number;
}

export function createTransitLedger(unit: string, startStep = 0): TransitLedgerState {
  validUnit(unit, 'Transit ledger');
  integer(startStep, 'startStep');
  return {
    unit,
    lastStep: startStep - 1,
    batches: [],
    cumulativeDispatches: 0,
    cumulativeArrivals: 0,
  };
}

/**
 * Advance a transit queue with an optional fractional delay. Fractional
 * delivery is linearly split across the adjacent discrete steps.
 */
export function advanceTransitLedger(
  state: TransitLedgerState,
  options: {
    step: number;
    dispatchAmount?: number;
    delaySteps: number;
    batchId?: string;
  },
): TransitAdvance {
  validUnit(state.unit, 'Transit ledger state');
  integer(options.step, 'step');
  if (options.step !== state.lastStep + 1) {
    throw new Error(
      `Transit step must be consecutive: expected ${state.lastStep + 1}, got ${options.step}`,
    );
  }
  const dispatched = options.dispatchAmount ?? 0;
  finiteNonNegative(dispatched, 'dispatchAmount');
  if (!Number.isFinite(options.delaySteps) || options.delaySteps < 0) {
    throw new Error('delaySteps must be finite and non-negative');
  }

  const batches = state.batches.map((batch) => ({ ...batch }));
  if (dispatched > 0) {
    const floor = Math.floor(options.delaySteps);
    const remainder = options.delaySteps - floor;
    const firstAmount = dispatched * (1 - remainder);
    const secondAmount = dispatched * remainder;
    if (firstAmount > EPSILON) {
      batches.push({
        id: `${options.batchId ?? `transit-${options.step}`}-a`,
        dispatchStep: options.step,
        deliveryStep: options.step + floor,
        amount: firstAmount,
      });
    }
    if (secondAmount > EPSILON) {
      batches.push({
        id: `${options.batchId ?? `transit-${options.step}`}-b`,
        dispatchStep: options.step,
        deliveryStep: options.step + floor + 1,
        amount: secondAmount,
      });
    }
  }

  let arrived = 0;
  const pending: TransitBatch[] = [];
  for (const batch of batches) {
    if (batch.deliveryStep <= options.step) arrived += batch.amount;
    else pending.push(batch);
  }
  const nextState: TransitLedgerState = {
    unit: state.unit,
    lastStep: options.step,
    batches: pending,
    cumulativeDispatches: state.cumulativeDispatches + dispatched,
    cumulativeArrivals: state.cumulativeArrivals + arrived,
  };
  const terminalInTransit = pending.reduce((sum, batch) => sum + batch.amount, 0);
  const conservationResidual =
    nextState.cumulativeDispatches -
    nextState.cumulativeArrivals -
    terminalInTransit;
  const tolerance = 1e-9 * Math.max(1, nextState.cumulativeDispatches);
  if (Math.abs(conservationResidual) > tolerance) {
    throw new Error(
      `Transit conservation failed: residual=${conservationResidual} ${state.unit}`,
    );
  }
  return {
    state: nextState,
    dispatched,
    arrived,
    terminalInTransit,
    conservationResidual,
  };
}
