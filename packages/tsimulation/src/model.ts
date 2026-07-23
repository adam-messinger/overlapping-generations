import type { ValidationResult } from './types.js';
import type { EvidenceRecord, ValidationClaim } from './evidence.js';
import { validateEvidence, validateValidationClaims } from './evidence.js';
import type { Invariant, InvariantReport } from './validation.js';
import { assertFiniteDeep, assertInvariants } from './validation.js';
import type { PortContract, PortMeta } from './units.js';
import {
  assertPortContract,
  countPortSchema,
  isOpaquePort,
  isPortMeta,
  validatePortMeta,
} from './units.js';

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
}

export interface ModelContractAudit {
  valid: boolean;
  errors: string[];
  unitBearingContracts: number;
  metadataContracts: number;
  opaqueContracts: number;
  structuredContracts: number;
  opaquePaths: string[];
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
): ModelContractAudit {
  const audit: ModelContractAudit = {
    valid: true,
    errors: [],
    unitBearingContracts: 0,
    metadataContracts: 0,
    opaqueContracts: 0,
    structuredContracts: 0,
    opaquePaths: [],
  };
  for (const model of models) {
    walkModelContract(model.inputPorts, `model ${model.id}.input`, audit);
    walkModelContract(model.outputPorts, `model ${model.id}.output`, audit);
  }
  audit.valid = audit.errors.length === 0;
  return audit;
}

function applyValidation(result: ValidationResult | void, context: string, warnings: string[]): void {
  if (!result) return;
  warnings.push(...result.warnings.map((warning) => `${context}: ${warning}`));
  if (!result.valid || result.errors.length > 0) {
    throw new Error(`${context}:\n  ${result.errors.join('\n  ')}`);
  }
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
  validateEvidence(definition.evidence ?? []);
  validateValidationClaims(definition.validationClaims ?? [], definition.evidence ?? []);
  return definition;
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
