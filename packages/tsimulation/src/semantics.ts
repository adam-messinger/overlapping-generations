import { stableHash, stableStringify } from './serialization.js';

/**
 * Machine-readable meaning attached to a quantitative value.
 *
 * Units answer "how is the value scaled?"  An estimand answers "what exactly
 * does the value describe?"  The two contracts are deliberately independent:
 * values can have identical units and incompatible estimands.
 */

export type MeasureKind =
  | 'stock'
  | 'flow'
  | 'rate'
  | 'count'
  | 'share'
  | 'index'
  | 'level';

export type Totality = 'total' | 'incremental';
export type AccountingBasis = 'gross' | 'net';

export interface MeasureContract {
  kind: MeasureKind;
  totality?: Totality;
  accounting?: AccountingBasis;
}

export interface PopulationContract {
  /** Stable, namespaced identifier such as `population.us.resident`. */
  id: string;
  label?: string;
  universe?: string;
  inclusion?: readonly string[];
  exclusion?: readonly string[];
}

export interface GeographyContract {
  /** Stable geography identifier such as `geo.us` or `geo.oecd-proxy`. */
  id: string;
  label?: string;
  /** Census, administrative, or model-region boundary vintage. */
  boundaryVersion?: string;
}

export interface RatioContract {
  numerator: string;
  denominator: string;
}

export type CalendarConvention =
  | 'gregorian'
  | 'proleptic-gregorian'
  | 'iso-week'
  | '360-day'
  | '365-day'
  | 'simulation-step'
  | (string & {});

export type AggregationMethod =
  | 'sum'
  | 'mean'
  | 'minimum'
  | 'maximum'
  | 'first'
  | 'last'
  | 'point'
  | (string & {});

export type TemporalSupport =
  | {
      kind: 'instant';
      calendar?: CalendarConvention;
    }
  | {
      kind: 'interval';
      /** Human- and machine-readable interval such as `day`, `iso-week`, or `calendar-year`. */
      interval: string;
      aggregation: AggregationMethod;
      calendar?: CalendarConvention;
      alignment?: string;
    }
  | {
      kind: 'timeless';
    };

export interface ValuationContract {
  priceBasis: 'nominal' | 'real';
  currency?: string;
  priceYear?: number;
  exchangeRateBasis?: 'market' | 'ppp' | (string & {});
}

export interface EstimandContract {
  schemaVersion: 'tsimulation.estimand/v1';
  /** Stable identifier for this estimand definition. */
  id: string;
  /** Version of the definition, not the underlying data release. */
  version: string;
  /** Stable property/quantity identifier; may be a local namespaced ID or URI. */
  quantityKind: string;
  measure: MeasureContract;
  population?: PopulationContract;
  geography?: GeographyContract;
  ratio?: RatioContract;
  time?: TemporalSupport;
  valuation?: ValuationContract;
  signConvention?: string;
  description?: string;
}

export type RevisionPolicy =
  | 'immutable-release'
  | 'first-release'
  | 'revisable'
  | 'rolling'
  | 'backfilled'
  | 'final'
  | 'unknown';

export interface TimeExtent {
  start?: string;
  end?: string;
  instant?: string;
}

export interface ReportingCoverage {
  expected?: number;
  reported?: number;
  fraction?: number;
  geography?: string;
  population?: string;
  missingness?: string;
  notes?: string;
}

/**
 * Binds a stable estimand to one concrete observation procedure and data
 * vintage.  Source-specific fields belong here, never in the estimand itself.
 */
export interface MeasurementBinding {
  schemaVersion: 'tsimulation.measurement/v1';
  id: string;
  version: string;
  estimand: EstimandContract;
  dataset: {
    id: string;
    field: string;
    version?: string;
  };
  procedure: {
    id?: string;
    description: string;
  };
  /** Period or instant in the world to which the value applies. */
  phenomenonTime?: TimeExtent;
  /** Time at which the result first became available. */
  resultTime?: string;
  /** Exact retrieval time is normally supplied by the referenced snapshot. */
  retrievedAt?: string;
  revisionPolicy: RevisionPolicy;
  release?: 'first' | 'revised' | 'final' | 'rolling';
  coverage?: ReportingCoverage;
  snapshotId?: string;
  transformationIds?: readonly string[];
  notes?: string;
}

/** Explicit authorization to translate between two observation procedures. */
export interface MeasurementCrosswalk {
  schemaVersion: 'tsimulation.measurement-crosswalk/v1';
  id: string;
  version: string;
  description: string;
  source: MeasurementBinding;
  target: MeasurementBinding;
  method: string;
  assumptions?: readonly string[];
  evidenceIds?: readonly string[];
  uncertainty?: CrosswalkUncertainty;
}

export interface SemanticDerivation {
  schemaVersion: 'tsimulation.derivation/v1';
  id: string;
  version: string;
  description: string;
  inputEstimandIds: readonly string[];
  outputEstimand: EstimandContract;
  expression?: string;
  assumptions?: readonly string[];
  evidenceIds?: readonly string[];
}

export type CrosswalkUncertainty =
  | { kind: 'none' }
  | { kind: 'interval'; lower: number; upper: number; unit?: string }
  | { kind: 'relative-error'; fraction: number }
  | { kind: 'qualitative'; description: string };

/** Explicit authorization to bridge two non-equivalent estimands. */
export interface SemanticCrosswalk {
  schemaVersion: 'tsimulation.crosswalk/v1';
  id: string;
  version: string;
  description: string;
  source: EstimandContract;
  target: EstimandContract;
  method: string;
  assumptions?: readonly string[];
  evidenceIds?: readonly string[];
  uncertainty?: CrosswalkUncertainty;
}

export type SemanticValidationMode = 'off' | 'if-present' | 'required';

export interface SemanticDifference {
  path: string;
  source: unknown;
  target: unknown;
}

export interface EstimandComparison {
  compatible: boolean;
  differences: readonly SemanticDifference[];
  sourceHash: string;
  targetHash: string;
}

export interface MeasurementComparison {
  compatible: boolean;
  differences: readonly SemanticDifference[];
  sourceHash: string;
  targetHash: string;
}

const MACHINE_FIELDS = [
  'quantityKind',
  'measure',
  'population',
  'geography',
  'ratio',
  'time',
  'valuation',
  'signConvention',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${context} must not be empty`);
}

function optionalDate(value: string | undefined, context: string): void {
  if (value !== undefined && Number.isNaN(Date.parse(value))) {
    throw new Error(`${context} must be a valid date or timestamp`);
  }
}

function validateStringList(value: readonly string[] | undefined, context: string): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`${context} must contain non-empty strings`);
  }
}

function validateTimeExtent(extent: TimeExtent | undefined, context: string): void {
  if (!extent) return;
  const supplied = [extent.start, extent.end, extent.instant].filter((value) => value !== undefined);
  if (supplied.length === 0) throw new Error(`${context} must declare an instant or interval`);
  if (extent.instant !== undefined && (extent.start !== undefined || extent.end !== undefined)) {
    throw new Error(`${context} cannot mix instant with start/end`);
  }
  optionalDate(extent.instant, `${context}.instant`);
  optionalDate(extent.start, `${context}.start`);
  optionalDate(extent.end, `${context}.end`);
  if (extent.start && extent.end && Date.parse(extent.end) < Date.parse(extent.start)) {
    throw new Error(`${context}.end precedes start`);
  }
}

export function defineEstimand(contract: EstimandContract): EstimandContract {
  validateEstimand(contract, `Estimand '${contract.id || '<unknown>'}'`);
  return contract;
}

export function validateEstimand(contract: EstimandContract, context = 'estimand'): void {
  if (!isRecord(contract)) throw new Error(`${context} must be an object`);
  if (contract.schemaVersion !== 'tsimulation.estimand/v1') {
    throw new Error(`${context} has unsupported schemaVersion '${String(contract.schemaVersion)}'`);
  }
  requiredText(contract.id, `${context}.id`);
  requiredText(contract.version, `${context}.version`);
  requiredText(contract.quantityKind, `${context}.quantityKind`);
  if (!isRecord(contract.measure)) throw new Error(`${context}.measure must be an object`);
  if (!(['stock', 'flow', 'rate', 'count', 'share', 'index', 'level'] as const)
    .includes(contract.measure.kind)) {
    throw new Error(`${context}.measure.kind is invalid`);
  }
  if (contract.measure.totality !== undefined &&
      contract.measure.totality !== 'total' && contract.measure.totality !== 'incremental') {
    throw new Error(`${context}.measure.totality is invalid`);
  }
  if (contract.measure.accounting !== undefined &&
      contract.measure.accounting !== 'gross' && contract.measure.accounting !== 'net') {
    throw new Error(`${context}.measure.accounting is invalid`);
  }
  if (contract.population) {
    requiredText(contract.population.id, `${context}.population.id`);
    validateStringList(contract.population.inclusion, `${context}.population.inclusion`);
    validateStringList(contract.population.exclusion, `${context}.population.exclusion`);
  }
  if (contract.geography) {
    requiredText(contract.geography.id, `${context}.geography.id`);
    if (contract.geography.boundaryVersion !== undefined) {
      requiredText(contract.geography.boundaryVersion, `${context}.geography.boundaryVersion`);
    }
  }
  if (contract.ratio) {
    requiredText(contract.ratio.numerator, `${context}.ratio.numerator`);
    requiredText(contract.ratio.denominator, `${context}.ratio.denominator`);
  }
  if (contract.time?.kind === 'interval') {
    requiredText(contract.time.interval, `${context}.time.interval`);
    requiredText(contract.time.aggregation, `${context}.time.aggregation`);
  } else if (contract.time && contract.time.kind !== 'instant' && contract.time.kind !== 'timeless') {
    throw new Error(`${context}.time.kind is invalid`);
  }
  if (contract.valuation) {
    if (contract.valuation.priceBasis !== 'nominal' && contract.valuation.priceBasis !== 'real') {
      throw new Error(`${context}.valuation.priceBasis is invalid`);
    }
    if (contract.valuation.priceYear !== undefined &&
        (!Number.isInteger(contract.valuation.priceYear) || contract.valuation.priceYear < 0)) {
      throw new Error(`${context}.valuation.priceYear must be a non-negative integer`);
    }
  }
}

export function defineMeasurement(binding: MeasurementBinding): MeasurementBinding {
  validateMeasurement(binding, `Measurement '${binding.id || '<unknown>'}'`);
  return binding;
}

export function defineMeasurementCrosswalk(
  crosswalk: MeasurementCrosswalk,
): MeasurementCrosswalk {
  validateMeasurementCrosswalk(
    crosswalk,
    `Measurement crosswalk '${crosswalk.id || '<unknown>'}'`,
  );
  return crosswalk;
}

export function validateMeasurementCrosswalk(
  crosswalk: MeasurementCrosswalk,
  context = 'measurement crosswalk',
): void {
  if (crosswalk.schemaVersion !== 'tsimulation.measurement-crosswalk/v1') {
    throw new Error(`${context} has unsupported schemaVersion '${String(crosswalk.schemaVersion)}'`);
  }
  requiredText(crosswalk.id, `${context}.id`);
  requiredText(crosswalk.version, `${context}.version`);
  requiredText(crosswalk.description, `${context}.description`);
  requiredText(crosswalk.method, `${context}.method`);
  validateMeasurement(crosswalk.source, `${context}.source`);
  validateMeasurement(crosswalk.target, `${context}.target`);
  validateStringList(crosswalk.assumptions, `${context}.assumptions`);
  validateStringList(crosswalk.evidenceIds, `${context}.evidenceIds`);
  const uncertainty = crosswalk.uncertainty;
  if (uncertainty?.kind === 'interval') {
    if (!Number.isFinite(uncertainty.lower) || !Number.isFinite(uncertainty.upper) ||
        uncertainty.upper < uncertainty.lower) {
      throw new Error(`${context}.uncertainty interval is invalid`);
    }
  } else if (uncertainty?.kind === 'relative-error') {
    if (!Number.isFinite(uncertainty.fraction) || uncertainty.fraction < 0) {
      throw new Error(`${context}.uncertainty.fraction must be finite and non-negative`);
    }
  } else if (uncertainty?.kind === 'qualitative') {
    requiredText(uncertainty.description, `${context}.uncertainty.description`);
  }
}

export function validateMeasurement(binding: MeasurementBinding, context = 'measurement'): void {
  if (!isRecord(binding)) throw new Error(`${context} must be an object`);
  if (binding.schemaVersion !== 'tsimulation.measurement/v1') {
    throw new Error(`${context} has unsupported schemaVersion '${String(binding.schemaVersion)}'`);
  }
  requiredText(binding.id, `${context}.id`);
  requiredText(binding.version, `${context}.version`);
  validateEstimand(binding.estimand, `${context}.estimand`);
  requiredText(binding.dataset?.id, `${context}.dataset.id`);
  requiredText(binding.dataset?.field, `${context}.dataset.field`);
  requiredText(binding.procedure?.description, `${context}.procedure.description`);
  validateTimeExtent(binding.phenomenonTime, `${context}.phenomenonTime`);
  optionalDate(binding.resultTime, `${context}.resultTime`);
  optionalDate(binding.retrievedAt, `${context}.retrievedAt`);
  if (!([
    'immutable-release',
    'first-release',
    'revisable',
    'rolling',
    'backfilled',
    'final',
    'unknown',
  ] as const).includes(binding.revisionPolicy)) {
    throw new Error(`${context}.revisionPolicy is invalid`);
  }
  if (binding.coverage?.fraction !== undefined &&
      (!Number.isFinite(binding.coverage.fraction) ||
       binding.coverage.fraction < 0 ||
       binding.coverage.fraction > 1)) {
    throw new Error(`${context}.coverage.fraction must be in [0, 1]`);
  }
  for (const [name, value] of [
    ['expected', binding.coverage?.expected],
    ['reported', binding.coverage?.reported],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`${context}.coverage.${name} must be finite and non-negative`);
    }
  }
  validateStringList(binding.transformationIds, `${context}.transformationIds`);
}

export function validateSemanticDerivation(
  derivation: SemanticDerivation,
  context = 'semantic derivation',
): void {
  if (derivation.schemaVersion !== 'tsimulation.derivation/v1') {
    throw new Error(`${context} has unsupported schemaVersion '${String(derivation.schemaVersion)}'`);
  }
  requiredText(derivation.id, `${context}.id`);
  requiredText(derivation.version, `${context}.version`);
  requiredText(derivation.description, `${context}.description`);
  if (!Array.isArray(derivation.inputEstimandIds) || derivation.inputEstimandIds.length === 0) {
    throw new Error(`${context}.inputEstimandIds must not be empty`);
  }
  validateStringList(derivation.inputEstimandIds, `${context}.inputEstimandIds`);
  validateEstimand(derivation.outputEstimand, `${context}.outputEstimand`);
  validateStringList(derivation.assumptions, `${context}.assumptions`);
  validateStringList(derivation.evidenceIds, `${context}.evidenceIds`);
}

export function defineSemanticDerivation(
  derivation: SemanticDerivation,
): SemanticDerivation {
  validateSemanticDerivation(
    derivation,
    `Derivation '${derivation.id || '<unknown>'}'`,
  );
  return derivation;
}

export function defineSemanticCrosswalk(crosswalk: SemanticCrosswalk): SemanticCrosswalk {
  validateSemanticCrosswalk(crosswalk, `Crosswalk '${crosswalk.id || '<unknown>'}'`);
  return crosswalk;
}

export function validateSemanticCrosswalk(
  crosswalk: SemanticCrosswalk,
  context = 'semantic crosswalk',
): void {
  if (crosswalk.schemaVersion !== 'tsimulation.crosswalk/v1') {
    throw new Error(`${context} has unsupported schemaVersion '${String(crosswalk.schemaVersion)}'`);
  }
  requiredText(crosswalk.id, `${context}.id`);
  requiredText(crosswalk.version, `${context}.version`);
  requiredText(crosswalk.description, `${context}.description`);
  requiredText(crosswalk.method, `${context}.method`);
  validateEstimand(crosswalk.source, `${context}.source`);
  validateEstimand(crosswalk.target, `${context}.target`);
  validateStringList(crosswalk.assumptions, `${context}.assumptions`);
  validateStringList(crosswalk.evidenceIds, `${context}.evidenceIds`);
  const uncertainty = crosswalk.uncertainty;
  if (uncertainty?.kind === 'interval') {
    if (!Number.isFinite(uncertainty.lower) || !Number.isFinite(uncertainty.upper) ||
        uncertainty.upper < uncertainty.lower) {
      throw new Error(`${context}.uncertainty interval is invalid`);
    }
  } else if (uncertainty?.kind === 'relative-error') {
    if (!Number.isFinite(uncertainty.fraction) || uncertainty.fraction < 0) {
      throw new Error(`${context}.uncertainty.fraction must be finite and non-negative`);
    }
  } else if (uncertainty?.kind === 'qualitative') {
    requiredText(uncertainty.description, `${context}.uncertainty.description`);
  }
}

function semanticMeaning(contract: EstimandContract): Record<string, unknown> {
  return Object.fromEntries(
    MACHINE_FIELDS
      .filter((field) => contract[field] !== undefined)
      .map((field) => [field, contract[field]]),
  );
}

export function estimandMeaningHash(contract: EstimandContract): string {
  validateEstimand(contract);
  return stableHash(semanticMeaning(contract));
}

export function estimandContractHash(contract: EstimandContract): string {
  validateEstimand(contract);
  return stableHash(contract);
}

function measurementRegime(binding: MeasurementBinding): Record<string, unknown> {
  validateMeasurement(binding);
  return {
    estimand: semanticMeaning(binding.estimand),
    dataset: binding.dataset,
    procedure: binding.procedure.id
      ? { id: binding.procedure.id }
      : { description: binding.procedure.description },
    revisionPolicy: binding.revisionPolicy,
    release: binding.release,
    coverage: binding.coverage,
    transformationIds: binding.transformationIds,
  };
}

export function measurementRegimeHash(binding: MeasurementBinding): string {
  return stableHash(measurementRegime(binding));
}

function collectDifferences(
  source: unknown,
  target: unknown,
  path: string,
  differences: SemanticDifference[],
): void {
  if (stableStringify(source) === stableStringify(target)) return;
  if (isRecord(source) && isRecord(target)) {
    const keys = [...new Set([...Object.keys(source), ...Object.keys(target)])].sort();
    for (const key of keys) {
      collectDifferences(source[key], target[key], path ? `${path}.${key}` : key, differences);
    }
    return;
  }
  if (Array.isArray(source) && Array.isArray(target)) {
    const length = Math.max(source.length, target.length);
    for (let index = 0; index < length; index++) {
      collectDifferences(source[index], target[index], `${path}[${index}]`, differences);
    }
    return;
  }
  differences.push({ path, source, target });
}

export function compareEstimands(
  source: EstimandContract,
  target: EstimandContract,
): EstimandComparison {
  validateEstimand(source, 'source estimand');
  validateEstimand(target, 'target estimand');
  const sourceMeaning = semanticMeaning(source);
  const targetMeaning = semanticMeaning(target);
  const differences: SemanticDifference[] = [];
  collectDifferences(sourceMeaning, targetMeaning, '', differences);
  return {
    compatible: differences.length === 0,
    differences,
    sourceHash: estimandMeaningHash(source),
    targetHash: estimandMeaningHash(target),
  };
}

/**
 * Compare observation procedures while deliberately ignoring the particular
 * phenomenon/result/retrieval time and snapshot ID. Those identify a vintage;
 * the fields compared here determine whether two vintages were measured under
 * the same regime.
 */
export function compareMeasurements(
  source: MeasurementBinding,
  target: MeasurementBinding,
): MeasurementComparison {
  const sourceMeaning = measurementRegime(source);
  const targetMeaning = measurementRegime(target);
  const differences: SemanticDifference[] = [];
  collectDifferences(sourceMeaning, targetMeaning, '', differences);
  return {
    compatible: differences.length === 0,
    differences,
    sourceHash: measurementRegimeHash(source),
    targetHash: measurementRegimeHash(target),
  };
}

export function formatSemanticDifferences(differences: readonly SemanticDifference[]): string {
  return differences.map((difference) =>
    `${difference.path || '<root>'}: ${stableStringify(difference.source)} -> ` +
    `${stableStringify(difference.target)}`,
  ).join('; ');
}

export function assertEstimandsCompatible(
  source: EstimandContract | undefined,
  target: EstimandContract | undefined,
  context: string,
  options: {
    mode?: SemanticValidationMode;
    crosswalk?: SemanticCrosswalk;
  } = {},
): void {
  const mode = options.mode ?? 'if-present';
  if (mode === 'off') return;
  if (!source || !target) {
    if (mode === 'required') {
      const missing = !source && !target ? 'source and target' : !source ? 'source' : 'target';
      throw new Error(`${context}: missing ${missing} estimand contract`);
    }
    return;
  }
  const comparison = compareEstimands(source, target);
  if (comparison.compatible) {
    if (options.crosswalk) validateSemanticCrosswalk(options.crosswalk, `${context} crosswalk`);
    return;
  }
  if (!options.crosswalk) {
    throw new Error(
      `${context}: semantic mismatch (${formatSemanticDifferences(comparison.differences)}). ` +
      'Declare an explicit semantic crosswalk.',
    );
  }
  validateSemanticCrosswalk(options.crosswalk, `${context} crosswalk`);
  const sourceCrosswalk = compareEstimands(source, options.crosswalk.source);
  const targetCrosswalk = compareEstimands(options.crosswalk.target, target);
  if (!sourceCrosswalk.compatible || !targetCrosswalk.compatible) {
    const details = [
      ...sourceCrosswalk.differences.map((difference) => ({
        ...difference,
        path: `source.${difference.path}`,
      })),
      ...targetCrosswalk.differences.map((difference) => ({
        ...difference,
        path: `target.${difference.path}`,
      })),
    ];
    throw new Error(
      `${context}: crosswalk '${options.crosswalk.id}' does not match connected estimands ` +
      `(${formatSemanticDifferences(details)})`,
    );
  }
}

export function assertMeasurementsCompatible(
  source: MeasurementBinding | undefined,
  target: MeasurementBinding | undefined,
  context: string,
  options: {
    mode?: SemanticValidationMode;
    crosswalk?: MeasurementCrosswalk;
  } = {},
): void {
  const mode = options.mode ?? 'if-present';
  if (mode === 'off') return;
  if (!source || !target) {
    if (mode === 'required') {
      const missing = !source && !target ? 'source and target' : !source ? 'source' : 'target';
      throw new Error(`${context}: missing ${missing} measurement binding`);
    }
    if (options.crosswalk) {
      throw new Error(`${context}: measurement crosswalk requires both measurement bindings`);
    }
    return;
  }
  const comparison = compareMeasurements(source, target);
  if (comparison.compatible) {
    if (options.crosswalk) {
      validateMeasurementCrosswalk(options.crosswalk, `${context} measurement crosswalk`);
    }
    return;
  }
  if (!options.crosswalk) {
    throw new Error(
      `${context}: measurement-regime mismatch ` +
      `(${formatSemanticDifferences(comparison.differences)}). ` +
      'Declare an explicit measurement crosswalk.',
    );
  }
  validateMeasurementCrosswalk(
    options.crosswalk,
    `${context} measurement crosswalk`,
  );
  const sourceCrosswalk = compareMeasurements(source, options.crosswalk.source);
  const targetCrosswalk = compareMeasurements(options.crosswalk.target, target);
  if (!sourceCrosswalk.compatible || !targetCrosswalk.compatible) {
    const details = [
      ...sourceCrosswalk.differences.map((difference) => ({
        ...difference,
        path: `source.${difference.path}`,
      })),
      ...targetCrosswalk.differences.map((difference) => ({
        ...difference,
        path: `target.${difference.path}`,
      })),
    ];
    throw new Error(
      `${context}: measurement crosswalk '${options.crosswalk.id}' does not match connected ` +
      `measurement regimes (${formatSemanticDifferences(details)})`,
    );
  }
}
