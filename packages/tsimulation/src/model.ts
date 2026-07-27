import type { ValidationResult } from './types.js';
import type { EvidenceRecord, ValidationClaim } from './evidence.js';
import { validateEvidence, validateValidationClaims } from './evidence.js';
import type { Invariant, InvariantReport } from './validation.js';
import { assertFiniteDeep, assertInvariants } from './validation.js';
import type {
  PortContract,
  PortMeta,
  QuantityPortMeta,
} from './units.js';
import {
  auditPortSemantics,
  assertPortContract,
  countPortSchema,
  isOpaquePort,
  isObjectPort,
  isPortMeta,
  isQuantityPort,
  isRecordPort,
  isVectorPort,
  validatePortMeta,
} from './units.js';
import {
  validateSemanticCrosswalk,
  validateSemanticDerivation,
  validateMeasurementCrosswalk,
  compareEstimands,
  compareMeasurements,
  type EstimandContract,
  type MeasurementBinding,
  type MeasurementCrosswalk,
  type SemanticCrosswalk,
  type SemanticDerivation,
  type SemanticValidationMode,
} from './semantics.js';
import { stableHash } from './serialization.js';

export interface ModelContext {
  seed?: number;
  runLabel?: string;
}

export interface ModelDefinition<TInput, TOutput> {
  id: string;
  version: string;
  description: string;
  run: (input: TInput, context: ModelContext) => TOutput;
  validateInput?: (input: TInput) => ValidationResult | void;
  validateOutput?: (output: TOutput, input: TInput) => ValidationResult | void;
  invariants?: readonly Invariant<TOutput>[];
  /** Complete top-level contract. Numeric fields require units; mixed objects must be explicitly opaque. */
  inputPorts: PortContract<TInput>;
  /** Complete top-level contract. Numeric fields require units; mixed objects must be explicitly opaque. */
  outputPorts: PortContract<TOutput>;
  evidence?: readonly EvidenceRecord[];
  validationClaims?: readonly ValidationClaim[];
  /** Auditable equations that produce a different estimand from model inputs. */
  semanticDerivations?: readonly SemanticDerivation[];
  /** Explicit approximations that bridge non-equivalent estimands inside the model. */
  semanticCrosswalks?: readonly SemanticCrosswalk[];
  /** Explicit translations between source-specific observation procedures. */
  measurementCrosswalks?: readonly MeasurementCrosswalk[];
  /** Semantic completeness expected for this model's quantitative boundary. */
  semanticValidation?: SemanticValidationMode;
  /** Disable only for explicit sentinel values such as Infinity-as-no-decay. */
  requireFiniteInput?: boolean;
  requireFiniteOutput?: boolean;
}

export interface ModelRun<TInput, TOutput> {
  modelId: string;
  modelVersion: string;
  input: TInput;
  output: TOutput;
  warnings: string[];
  invariantReport: InvariantReport;
  durationMs: number;
  seed?: number;
  runLabel?: string;
  contractHashes: {
    input: string;
    output: string;
  };
  evidence: readonly EvidenceRecord[];
  validationClaims: readonly ValidationClaim[];
  semanticLineage: {
    derivations: readonly { id: string; version: string }[];
    crosswalks: readonly { id: string; version: string }[];
    measurementCrosswalks: readonly { id: string; version: string }[];
  };
}

export interface ModelContractAudit {
  valid: boolean;
  errors: string[];
  unitBearingContracts: number;
  metadataContracts: number;
  opaqueContracts: number;
  structuredContracts: number;
  opaquePaths: string[];
  semanticContracts: number;
  measurementContracts: number;
  missingSemanticPaths: string[];
  incompleteSemanticPaths: string[];
  semanticCompletenessErrors: string[];
}

export interface AuditableModelContract {
  id: string;
  inputPorts: unknown;
  outputPorts: unknown;
}

function walkModelContract(
  contract: unknown,
  context: string,
  audit: ModelContractAudit,
): void {
  if (isPortMeta(contract)) {
    try {
      validatePortMeta(contract, context);
      const count = countPortSchema(contract);
      audit.unitBearingContracts += count.unitBearing;
      audit.metadataContracts += count.metadata;
      audit.opaqueContracts += count.opaque;
      audit.structuredContracts += count.structured;
      if (isOpaquePort(contract)) audit.opaquePaths.push(context);
      const semantic = auditPortSemantics(contract, context);
      audit.semanticContracts += semantic.semanticContracts;
      audit.measurementContracts += semantic.measurementContracts;
      audit.missingSemanticPaths.push(...semantic.missingSemanticPaths);
      audit.incompleteSemanticPaths.push(...semantic.incompleteSemanticPaths);
      audit.semanticCompletenessErrors.push(...semantic.semanticCompletenessErrors);
    } catch (error) {
      audit.errors.push(error instanceof Error ? error.message : String(error));
    }
    return;
  }
  if (typeof contract !== 'object' || contract === null) {
    audit.errors.push(`${context}: missing or invalid port contract`);
    return;
  }
  for (const [name, field] of Object.entries(contract)) {
    walkModelContract(field, `${context}.${name}`, audit);
  }
}

/** CI-friendly dimensional coverage audit for standalone model boundaries. */
export function auditModelContracts(
  models: readonly AuditableModelContract[],
  semanticValidation: SemanticValidationMode = 'required',
): ModelContractAudit {
  const audit: ModelContractAudit = {
    valid: true,
    errors: [],
    unitBearingContracts: 0,
    metadataContracts: 0,
    opaqueContracts: 0,
    structuredContracts: 0,
    opaquePaths: [],
    semanticContracts: 0,
    measurementContracts: 0,
    missingSemanticPaths: [],
    incompleteSemanticPaths: [],
    semanticCompletenessErrors: [],
  };
  for (const model of models) {
    walkModelContract(model.inputPorts, `model ${model.id}.input`, audit);
    walkModelContract(model.outputPorts, `model ${model.id}.output`, audit);
  }
  audit.missingSemanticPaths = [...new Set(audit.missingSemanticPaths)];
  audit.incompleteSemanticPaths = [...new Set(audit.incompleteSemanticPaths)];
  audit.semanticCompletenessErrors = [...new Set(audit.semanticCompletenessErrors)];
  if (semanticValidation === 'required') {
    audit.errors.push(...audit.missingSemanticPaths.map((path) => `${path}: missing estimand contract`));
    audit.errors.push(...audit.semanticCompletenessErrors);
  }
  audit.valid = audit.errors.length === 0;
  return audit;
}

export interface SemanticBoundaryDefaults {
  modelId: string;
  modelVersion: string;
  side: 'input' | 'output';
}

function semanticSlug(value: string): string {
  return value
    .replace(/^scenario[.[{]/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'value';
}

function inferMeasureKind(
  path: string,
  unit: string,
): EstimandContract['measure']['kind'] {
  const name = semanticSlug(path);
  const explicitPerTime =
    /\/(?:year|month|day|hour|quarter|week|yr|d)$/.test(unit);
  if (unit === 'calendar-year' || unit === 'step-index') return 'index';
  if (/index|multiple|multiplier|score|factor/.test(name)) return 'index';
  if (explicitPerTime) {
    return /^(?:hour|day|week|month|quarter|year)\//.test(unit)
      ? 'count'
      : unit === `fraction/${unit.split('/').at(-1)}` ||
      unit === `1/${unit.split('/').at(-1)}` ||
      /rate|growth|decay|elasticity|intensity/.test(name)
      ? 'rate'
      : 'flow';
  }
  if (unit === 'fraction' || unit === '%') return 'share';
  if (
    /share|fraction|probab|margin|uptime|utilization|availability|mix|weight|coverage|ratio/.test(name)
  ) return 'share';
  if (
    /rate|growth|decay|elasticity|intensity|per-capita|[-.]per[-.]/.test(name)
  ) return 'rate';
  if (
    /annual-sales|annual-units|revenue|expense|income|cash-flow|capex|depreciation|retirement|dispatch|arrival|shortfall/.test(name)
  ) return 'flow';
  if (/stock|inventory|storage|capacity|population|installed|bookvalue|intransit/.test(name)) {
    return 'stock';
  }
  if (/(^|[.])counts?($|[.])|number-of|months-below|years-above/.test(name)) {
    return 'count';
  }
  return 'level';
}

function inferInterval(path: string, unit: string): string | undefined {
  for (const interval of ['quarter', 'month', 'week', 'day', 'hour', 'year'] as const) {
    if (
      unit.includes(`/${interval}`) ||
      unit.includes(`${interval}^-1`) ||
      path.toLowerCase().includes(`${interval}s[]`)
    ) return interval === 'year' ? 'calendar-year' : `simulation-${interval}`;
  }
  if (/\/d(?:$|[)])/.test(unit) || unit === 'mb/d') return 'simulation-day';
  if (/\/yr(?:$|[)])/.test(unit)) return 'calendar-year';
  if (path.includes('[]')) return 'simulation-step';
  return undefined;
}

function inferredEstimand(
  path: string,
  port: QuantityPortMeta,
  defaults: SemanticBoundaryDefaults,
): EstimandContract {
  const canonicalPath = semanticSlug(path);
  const kind = inferMeasureKind(path, port.unit);
  const interval = inferInterval(path, port.unit);
  const totality =
    /increment|additional|newadoption|new-adoption|change|delta|shortfall|loss|added/.test(
      canonicalPath,
    )
      ? 'incremental'
      : 'total';
  const aggregation =
    kind === 'flow' || kind === 'count' ? 'sum' : 'mean';
  const time: EstimandContract['time'] = interval
    ? {
        kind: 'interval',
        interval,
        aggregation,
        calendar: interval === 'calendar-year' ? 'gregorian' : 'simulation-step',
      }
    : defaults.side === 'input'
      ? { kind: 'timeless' }
      : kind === 'stock' || kind === 'level' || kind === 'index'
        ? { kind: 'instant', calendar: 'simulation-step' }
        : {
            kind: 'interval',
            interval: 'simulation-horizon',
            aggregation,
            calendar: 'simulation-step',
          };
  const vintageBasis: NonNullable<EstimandContract['vintage']>['basis'] =
    /opening|beginning|initial/.test(canonicalPath)
      ? 'opening-stock'
      : /ending|terminal/.test(canonicalPath)
        ? 'closing-stock'
        : defaults.side === 'input'
          ? 'scenario-assumption'
          : 'current-period';
  return {
    schemaVersion: 'tsimulation.estimand/v1',
    id: `estimand.${semanticSlug(defaults.modelId)}.${canonicalPath}`,
    version: defaults.modelVersion,
    quantityKind: `simulation.${semanticSlug(defaults.modelId)}.${canonicalPath}`,
    measure: {
      kind,
      totality,
      accounting: /net|margin|balance|income|cashflow|cash-flow/.test(canonicalPath)
        ? 'net'
        : 'gross',
    },
    population: {
      id: `population.${semanticSlug(defaults.modelId)}.${canonicalPath}`,
      universe:
        `Values represented by '${path}' within the ${defaults.modelId} modeled scenario boundary.`,
    },
    geography: {
      id: `geo.${semanticSlug(defaults.modelId)}.scenario-boundary`,
      boundaryVersion: `${defaults.modelId}-${defaults.modelVersion}`,
    },
    ...(kind === 'rate' || kind === 'share' || kind === 'index'
      ? {
          ratio: {
            numerator: `${path} modeled numerator`,
            denominator:
              kind === 'share'
                ? `${path} applicable modeled total`
                : kind === 'rate'
                  ? `${path} applicable exposure or time`
                  : `${path} defined reference value`,
          },
        }
      : {}),
    time,
    vintage: {
      basis: vintageBasis,
      convention:
        vintageBasis === 'scenario-assumption'
          ? 'scenario input as supplied for this run'
          : 'simulation step associated with the boundary value',
    },
    description:
      `Framework-completed boundary contract for ${defaults.modelId}.${path}.`,
  };
}

function completeEstimand(
  estimand: EstimandContract,
  inferred: EstimandContract,
): void {
  estimand.measure = {
    ...estimand.measure,
    totality: estimand.measure.totality ?? inferred.measure.totality,
    accounting: estimand.measure.accounting ?? inferred.measure.accounting,
  };
  estimand.population ??= inferred.population;
  if (estimand.population && !estimand.population.universe) {
    estimand.population = {
      ...estimand.population,
      universe: inferred.population!.universe,
    };
  }
  estimand.geography ??= inferred.geography;
  if (estimand.geography && !estimand.geography.boundaryVersion) {
    estimand.geography = {
      ...estimand.geography,
      boundaryVersion: inferred.geography!.boundaryVersion,
    };
  }
  if (
    (estimand.measure.kind === 'rate' ||
      estimand.measure.kind === 'share' ||
      estimand.measure.kind === 'index') &&
    !estimand.ratio
  ) {
    estimand.ratio = inferred.ratio ?? {
      numerator: `${estimand.quantityKind} modeled numerator`,
      denominator: `${estimand.quantityKind} defined reference value`,
    };
  }
  estimand.time ??= inferred.time;
  estimand.vintage ??= inferred.vintage;
}

function completeSemanticTree(
  contract: unknown,
  path: string,
  defaults: SemanticBoundaryDefaults,
): void {
  if (isPortMeta(contract)) {
    if (isQuantityPort(contract)) {
      const inferred = inferredEstimand(path, contract, defaults);
      if (contract.measurement) {
        completeEstimand(contract.measurement.estimand, inferred);
      }
      if (contract.estimand) completeEstimand(contract.estimand, inferred);
      else contract.estimand = contract.measurement?.estimand ?? inferred;
      return;
    }
    if (isObjectPort(contract)) {
      for (const [name, field] of Object.entries(
        contract.fields as Readonly<Record<string, PortMeta>>,
      )) {
        completeSemanticTree(field, `${path}.${name}`, defaults);
      }
    } else if (isRecordPort(contract)) {
      completeSemanticTree(contract.values, `${path}{value}`, defaults);
    } else if (isVectorPort(contract)) {
      completeSemanticTree(contract.items, `${path}[]`, defaults);
    }
    return;
  }
  if (typeof contract !== 'object' || contract === null) return;
  for (const [name, field] of Object.entries(contract)) {
    completeSemanticTree(field, name, defaults);
  }
}

/**
 * Complete every quantitative boundary leaf, preserving authored semantics
 * and filling only missing fields. Intended for migrations: the resulting
 * model is always strict and its generated contracts remain visible to audits.
 */
export function completeModelSemanticContracts<TInput, TOutput>(
  definition: ModelDefinition<TInput, TOutput>,
): ModelDefinition<TInput, TOutput> {
  // Port schemas are commonly reused across models and between an input and
  // an echoed output. Clone the whole semantic graph at once: this preserves
  // intentional shared references within the definition while preventing one
  // model's generated contracts from contaminating another definition.
  const cloned = structuredClone({
    inputPorts: definition.inputPorts,
    outputPorts: definition.outputPorts,
    semanticDerivations: definition.semanticDerivations,
    semanticCrosswalks: definition.semanticCrosswalks,
    measurementCrosswalks: definition.measurementCrosswalks,
  });
  completeSemanticTree(cloned.inputPorts, '', {
    modelId: definition.id,
    modelVersion: definition.version,
    side: 'input',
  });
  completeSemanticTree(cloned.outputPorts, '', {
    modelId: definition.id,
    modelVersion: definition.version,
    side: 'output',
  });
  return {
    ...definition,
    ...cloned,
    semanticValidation: 'required',
  };
}

function applyValidation(result: ValidationResult | void, context: string, warnings: string[]): void {
  if (!result) return;
  warnings.push(...result.warnings.map((warning) => `${context}: ${warning}`));
  if (!result.valid || result.errors.length > 0) {
    throw new Error(`${context}:\n  ${result.errors.join('\n  ')}`);
  }
}

function collectBoundaryEstimands(contract: unknown): EstimandContract[] {
  if (isPortMeta(contract)) {
    if (isQuantityPort(contract)) return contract.estimand ? [contract.estimand] : [];
    if (isObjectPort(contract)) {
      return Object.values(contract.fields as Readonly<Record<string, PortMeta>>)
        .flatMap(collectBoundaryEstimands);
    }
    if (isRecordPort(contract)) return collectBoundaryEstimands(contract.values);
    if (isVectorPort(contract)) return collectBoundaryEstimands(contract.items);
    return [];
  }
  if (typeof contract !== 'object' || contract === null) return [];
  return Object.values(contract).flatMap(collectBoundaryEstimands);
}

function collectBoundaryMeasurements(contract: unknown): MeasurementBinding[] {
  if (isPortMeta(contract)) {
    if (isQuantityPort(contract)) {
      return contract.measurement ? [contract.measurement] : [];
    }
    if (isObjectPort(contract)) {
      return Object.values(contract.fields as Readonly<Record<string, PortMeta>>)
        .flatMap(collectBoundaryMeasurements);
    }
    if (isRecordPort(contract)) return collectBoundaryMeasurements(contract.values);
    if (isVectorPort(contract)) return collectBoundaryMeasurements(contract.items);
    return [];
  }
  if (typeof contract !== 'object' || contract === null) return [];
  return Object.values(contract).flatMap(collectBoundaryMeasurements);
}

export function defineModel<TInput, TOutput>(
  definition: ModelDefinition<TInput, TOutput>,
): ModelDefinition<TInput, TOutput> {
  if (!definition.id.trim()) throw new Error('Model ID must not be empty');
  if (!definition.version.trim()) throw new Error(`Model '${definition.id}' version must not be empty`);
  if (!definition.description.trim()) throw new Error(`Model '${definition.id}' description must not be empty`);
  for (const [side, ports] of [
    ['input', definition.inputPorts],
    ['output', definition.outputPorts],
  ] as const) {
    if (!ports) throw new Error(`Model '${definition.id}' is missing its ${side} port contract`);
    if (isPortMeta(ports)) {
      validatePortMeta(ports as PortMeta, `Model '${definition.id}' ${side} port`);
      continue;
    }
    for (const [name, port] of Object.entries(ports as Readonly<Record<string, PortMeta>>)) {
      validatePortMeta(port, `Model '${definition.id}' ${side} port '${name}'`);
    }
  }
  const semanticValidation = definition.semanticValidation ?? 'required';
  if (semanticValidation === 'required') {
    const semanticAudit = auditModelContracts([definition], 'required');
    if (!semanticAudit.valid) {
      throw new Error(
        `Model '${definition.id}' semantic contract errors:\n${semanticAudit.errors.join('\n')}`,
      );
    }
  }
  validateEvidence(definition.evidence ?? []);
  validateValidationClaims(definition.validationClaims ?? [], definition.evidence ?? []);
  const inputEstimands = collectBoundaryEstimands(definition.inputPorts);
  const outputEstimands = collectBoundaryEstimands(definition.outputPorts);
  const inputMeasurements = collectBoundaryMeasurements(definition.inputPorts);
  const outputMeasurements = collectBoundaryMeasurements(definition.outputPorts);
  const semanticIds = new Set<string>();
  const availableDerivationInputs = new Set(
    inputEstimands.map((estimand) => estimand.id),
  );
  const derivationDependencyIds = new Set(
    (definition.semanticDerivations ?? [])
      .flatMap((derivation) => derivation.inputEstimandIds),
  );
  for (const derivation of definition.semanticDerivations ?? []) {
    validateSemanticDerivation(
      derivation,
      `Model '${definition.id}' derivation '${derivation.id}'`,
    );
    if (semanticIds.has(derivation.id)) {
      throw new Error(`Model '${definition.id}' has duplicate semantic lineage ID '${derivation.id}'`);
    }
    for (const inputId of derivation.inputEstimandIds) {
      if (!availableDerivationInputs.has(inputId)) {
        throw new Error(
          `Model '${definition.id}' derivation '${derivation.id}' references input ` +
          `estimand '${inputId}' that is absent from its input ports and prior derivations`,
        );
      }
    }
    if (
      !outputEstimands.some((estimand) =>
        compareEstimands(estimand, derivation.outputEstimand).compatible
      ) &&
      !derivationDependencyIds.has(derivation.outputEstimand.id)
    ) {
      throw new Error(
        `Model '${definition.id}' derivation '${derivation.id}' output is neither exposed ` +
        'by an output port nor consumed by another derivation',
      );
    }
    availableDerivationInputs.add(derivation.outputEstimand.id);
    semanticIds.add(derivation.id);
  }
  for (const crosswalk of definition.semanticCrosswalks ?? []) {
    validateSemanticCrosswalk(
      crosswalk,
      `Model '${definition.id}' crosswalk '${crosswalk.id}'`,
    );
    if (semanticIds.has(crosswalk.id)) {
      throw new Error(`Model '${definition.id}' has duplicate semantic lineage ID '${crosswalk.id}'`);
    }
    if (!inputEstimands.some((estimand) =>
      compareEstimands(estimand, crosswalk.source).compatible
    ) || !outputEstimands.some((estimand) =>
      compareEstimands(crosswalk.target, estimand).compatible
    )) {
      throw new Error(
        `Model '${definition.id}' crosswalk '${crosswalk.id}' does not match an ` +
        'input-to-output boundary',
      );
    }
    semanticIds.add(crosswalk.id);
  }
  for (const crosswalk of definition.measurementCrosswalks ?? []) {
    validateMeasurementCrosswalk(
      crosswalk,
      `Model '${definition.id}' measurement crosswalk '${crosswalk.id}'`,
    );
    if (semanticIds.has(crosswalk.id)) {
      throw new Error(`Model '${definition.id}' has duplicate semantic lineage ID '${crosswalk.id}'`);
    }
    if (!inputMeasurements.some((measurement) =>
      compareMeasurements(measurement, crosswalk.source).compatible
    ) || !outputMeasurements.some((measurement) =>
      compareMeasurements(crosswalk.target, measurement).compatible
    )) {
      throw new Error(
        `Model '${definition.id}' measurement crosswalk '${crosswalk.id}' does not match ` +
        'an input-to-output boundary',
      );
    }
    semanticIds.add(crosswalk.id);
  }
  return { ...definition, semanticValidation };
}

export function runModel<TInput, TOutput>(
  model: ModelDefinition<TInput, TOutput>,
  input: TInput,
  context: ModelContext = {},
): ModelRun<TInput, TOutput> {
  const warnings: string[] = [];
  assertPortContract(input, model.inputPorts, `Model '${model.id}' input`);
  if (model.requireFiniteInput !== false) assertFiniteDeep(input, `${model.id}.input`);
  applyValidation(model.validateInput?.(input), `${model.id} invalid input`, warnings);
  const started = Date.now();
  const output = model.run(input, context);
  const durationMs = Date.now() - started;
  assertPortContract(output, model.outputPorts, `Model '${model.id}' output`);
  if (model.requireFiniteOutput !== false) assertFiniteDeep(output, `${model.id}.output`);
  applyValidation(model.validateOutput?.(output, input), `${model.id} invalid output`, warnings);
  const invariantReport = assertInvariants(
    output,
    model.invariants ?? [],
    `Model '${model.id}'`,
  );
  warnings.push(...invariantReport.warnings);
  return {
    modelId: model.id,
    modelVersion: model.version,
    input,
    output,
    warnings,
    invariantReport,
    durationMs,
    contractHashes: {
      input: stableHash(model.inputPorts),
      output: stableHash(model.outputPorts),
    },
    evidence: model.evidence ?? [],
    validationClaims: model.validationClaims ?? [],
    semanticLineage: {
      derivations: (model.semanticDerivations ?? []).map(({ id, version }) => ({
        id,
        version,
      })),
      crosswalks: (model.semanticCrosswalks ?? []).map(({ id, version }) => ({
        id,
        version,
      })),
      measurementCrosswalks: (model.measurementCrosswalks ?? [])
        .map(({ id, version }) => ({ id, version })),
    },
    ...context,
  };
}

export class ModelRegistry {
  private readonly models = new Map<string, ModelDefinition<any, any>>();

  register<TInput, TOutput>(model: ModelDefinition<TInput, TOutput>): this {
    if (this.models.has(model.id)) throw new Error(`Model '${model.id}' is already registered`);
    this.models.set(model.id, model as ModelDefinition<any, any>);
    return this;
  }

  get<TInput = unknown, TOutput = unknown>(id: string): ModelDefinition<TInput, TOutput> {
    const model = this.models.get(id);
    if (!model) throw new Error(`Unknown model '${id}'`);
    return model as ModelDefinition<TInput, TOutput>;
  }

  list(): Array<{ id: string; version: string; description: string }> {
    return [...this.models.values()]
      .map(({ id, version, description }) => ({ id, version, description }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  run<TInput, TOutput>(id: string, input: TInput, context: ModelContext = {}): ModelRun<TInput, TOutput> {
    return runModel(this.get<TInput, TOutput>(id), input, context);
  }
}
