/**
 * Runtime dimensional analysis for simulation boundaries.
 *
 * Unit expressions are deliberately small and dependency-free. Registered
 * atomic symbols may be combined with `*`, `/`, integer powers (`^2`), and
 * parentheses. Examples: `$/MWh`, `TWh/year`, `kgCO2/MWh`, and `people/year`.
 */

import {
  assertEstimandsCompatible,
  assertMeasurementsCompatible,
  validateEstimand,
  validateMeasurement,
  type EstimandContract,
  type MeasurementBinding,
  type MeasurementCrosswalk,
  type SemanticCrosswalk,
  type SemanticValidationMode,
} from './semantics.js';

export type UnitDimension =
  | 'dimensionless'
  | 'currency'
  | 'energy'
  | 'power'
  | 'mass'
  | 'length'
  | 'time'
  | 'temperature'
  | `custom:${string}`
  | (string & {});

export type DimensionVector = Readonly<Record<string, number>>;

export interface UnitDefinition {
  symbol: string;
  /** Human-readable/canonical dimension label. */
  dimension: UnitDimension;
  /** Multiplicative scale to SI-like base dimensions. */
  scale: number;
  /** Optional additive offset applied before scaling. Offsets cannot be compounded. */
  offset?: number;
  description?: string;
  /** Dimension exponents. Atomic definitions normally omit this. */
  dimensions?: DimensionVector;
}

export type PortValueType = 'number' | 'record' | 'nested-record' | 'vector';

export interface QuantityPortMeta {
  unit: string;
  /** Meaning of the quantity, independent of its physical unit and scale. */
  estimand?: EstimandContract;
  /** Optional concrete observation procedure for source-bound data ports. */
  measurement?: MeasurementBinding;
  description?: string;
  /** Defaults to a scalar number when omitted. */
  valueType?: PortValueType;
  optional?: boolean;
  nullable?: boolean;
  opaque?: never;
}

/**
 * Explicit escape hatch for configuration objects and mixed-unit structures.
 * Opaque ports are visible to completeness audits but deliberately excluded
 * from dimensional comparison.
 */
export interface OpaquePortMeta {
  opaque: true;
  description: string;
  valueType?: Exclude<PortValueType, 'number'>;
  optional?: boolean;
  nullable?: boolean;
  unit?: never;
}

/** Non-quantitative data that is still structurally validated. */
export interface MetadataPortMeta {
  kind: 'metadata';
  dataType: 'string' | 'boolean';
  description: string;
  optional?: boolean;
  nullable?: boolean;
  unit?: never;
  opaque?: never;
}

export type ObjectFieldContract<T extends object> = {
  readonly [K in keyof T]-?: {} extends Pick<T, K>
    ? PortMetaForValue<T[K]> & { optional: true }
    : PortMetaForValue<T[K]> & { optional?: false };
};

/** A fixed-shape object whose leaves carry their own contracts. */
export interface ObjectPortMeta<T extends object = Record<string, unknown>> {
  kind: 'object';
  fields: ObjectFieldContract<T>;
  description?: string;
  optional?: boolean;
  nullable?: boolean;
  unit?: never;
  opaque?: never;
}

/** A homogeneous keyed map, optionally restricted to a known key set. */
export interface RecordPortMeta<T = unknown> {
  kind: 'record';
  values: PortMetaForValue<T>;
  keys?: readonly string[];
  description?: string;
  optional?: boolean;
  nullable?: boolean;
  unit?: never;
  opaque?: never;
}

/** A homogeneous array or typed-array contract. */
export interface VectorPortMeta<T = unknown> {
  kind: 'vector';
  items: PortMetaForValue<T>;
  description?: string;
  optional?: boolean;
  nullable?: boolean;
  unit?: never;
  opaque?: never;
}

/**
 * Erased structured contracts.
 *
 * The generic forms above keep each field tied to the value type it describes,
 * which is what makes a declaration site type-safe. But `ObjectPortMeta<any>`
 * is not a usable union member: `ObjectFieldContract<any>` collapses to an
 * index signature demanding `optional: true`, so no concrete
 * `objectPort<T>()` result is assignable to it. The union therefore uses these
 * erased forms, which drop the T link and keep only the runtime shape.
 */
export interface AnyObjectPortMeta {
  kind: 'object';
  fields: Readonly<Record<string, PortMeta>>;
  description?: string;
  optional?: boolean;
  nullable?: boolean;
  unit?: never;
  opaque?: never;
}

export interface AnyRecordPortMeta {
  kind: 'record';
  values: PortMeta;
  keys?: readonly string[];
  description?: string;
  optional?: boolean;
  nullable?: boolean;
  unit?: never;
  opaque?: never;
}

export interface AnyVectorPortMeta {
  kind: 'vector';
  items: PortMeta;
  description?: string;
  optional?: boolean;
  nullable?: boolean;
  unit?: never;
  opaque?: never;
}

export type StructuredPortMeta = AnyObjectPortMeta | AnyRecordPortMeta | AnyVectorPortMeta;
export type PortMeta = QuantityPortMeta | MetadataPortMeta | StructuredPortMeta | OpaquePortMeta;

type WithNullability<T, TMeta> = null extends T
  ? TMeta & { nullable: true }
  : TMeta & { nullable?: false };

export type PortMetaForValue<T> = WithNullability<T,
  [NonNullable<T>] extends [number]
    ? QuantityPortMeta
    : [NonNullable<T>] extends [string]
      ? MetadataPortMeta | OpaquePortMeta
      : [NonNullable<T>] extends [boolean]
        ? MetadataPortMeta | OpaquePortMeta
        : NonNullable<T> extends readonly (infer TItem)[]
          ? QuantityPortMeta | VectorPortMeta<TItem> | OpaquePortMeta
          : NonNullable<T> extends object
            ? QuantityPortMeta | ObjectPortMeta<NonNullable<T>> |
              RecordPortMeta<NonNullable<T>[keyof NonNullable<T>]> | OpaquePortMeta
            : OpaquePortMeta
>;

/** Every top-level field at a model boundary must have a contract entry. */
export type PortContract<T> = T extends object
  ? {
      readonly [K in keyof T]-?: {} extends Pick<T, K>
        ? PortMetaForValue<T[K]> & { optional: true }
        : PortMetaForValue<T[K]> & { optional?: false }
    }
  : PortMetaForValue<T>;

export function unitPort(
  unit: string,
  valueType?: PortValueType,
  description?: string,
): QuantityPortMeta & { optional?: false; nullable?: false } {
  return { unit, ...(valueType ? { valueType } : {}), ...(description ? { description } : {}) };
}

export function measurementPort(
  unit: string,
  estimand: EstimandContract,
  valueType?: PortValueType,
  description?: string,
): QuantityPortMeta & { optional?: false; nullable?: false } {
  validateEstimand(estimand, `Port '${estimand.id}' estimand`);
  return {
    unit,
    estimand,
    ...(valueType ? { valueType } : {}),
    ...(description ? { description } : {}),
  };
}

/** A quantitative port tied to a particular dataset/field/revision regime. */
export function observationPort(
  unit: string,
  measurement: MeasurementBinding,
  valueType?: PortValueType,
  description?: string,
): QuantityPortMeta & { optional?: false; nullable?: false } {
  validateMeasurement(measurement, `Port '${measurement.id}' measurement`);
  return {
    unit,
    estimand: measurement.estimand,
    measurement,
    ...(valueType ? { valueType } : {}),
    ...(description ? { description } : {}),
  };
}

export function opaquePort(
  description: string,
  valueType?: Exclude<PortValueType, 'number'>,
): OpaquePortMeta & { optional?: false; nullable?: false } {
  return { opaque: true, description, ...(valueType ? { valueType } : {}) };
}

export function metadataPort(
  dataType: MetadataPortMeta['dataType'],
  description: string,
): MetadataPortMeta & { optional?: false; nullable?: false } {
  return { kind: 'metadata', dataType, description };
}

export function objectPort<T extends object>(
  fields: ObjectFieldContract<T>,
  description?: string,
): ObjectPortMeta<T> & { optional?: false; nullable?: false } {
  return {
    kind: 'object',
    fields,
    ...(description ? { description } : {}),
  };
}

export function recordPort<T>(
  values: PortMetaForValue<T>,
  options: { keys?: readonly string[]; description?: string } = {},
): RecordPortMeta<T> & { optional?: false; nullable?: false } {
  return {
    kind: 'record',
    values,
    ...(options.keys ? { keys: [...options.keys] } : {}),
    ...(options.description ? { description: options.description } : {}),
  };
}

export function vectorPort<T>(
  items: PortMetaForValue<T>,
  description?: string,
): VectorPortMeta<T> & { optional?: false; nullable?: false } {
  return { kind: 'vector', items, ...(description ? { description } : {}) };
}

/** Convert a full fixed-object schema to a schema for TypeScript's Partial<T>. */
export function partialObjectPort<T extends object>(
  port: ObjectPortMeta<T>,
  description = port.description,
): ObjectPortMeta<Partial<T>> & { optional?: false; nullable?: false } {
  const fields = Object.fromEntries(
    Object.entries(port.fields as Readonly<Record<string, PortMeta>>).map(([name, field]) => [
      name,
      { ...field, optional: true },
    ]),
  );
  return {
    kind: 'object',
    fields: fields as ObjectFieldContract<Partial<T>>,
    ...(description ? { description } : {}),
  };
}

interface ResolvedUnit extends UnitDefinition {
  dimensions: DimensionVector;
}

const definitions = new Map<string, ResolvedUnit>();

function cleanDimensions(dimensions: DimensionVector): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [dimension, exponent] of Object.entries(dimensions)) {
    if (!Number.isFinite(exponent)) throw new Error(`Invalid exponent for dimension '${dimension}'`);
    if (Math.abs(exponent) > 1e-12) result[dimension] = exponent;
  }
  return result;
}

function dimensionsFor(definition: UnitDefinition): Record<string, number> {
  if (definition.dimensions) return cleanDimensions(definition.dimensions);
  return definition.dimension === 'dimensionless' ? {} : { [definition.dimension]: 1 };
}

function dimensionKey(dimensions: DimensionVector): string {
  const entries = Object.entries(cleanDimensions(dimensions)).sort(([a], [b]) => a.localeCompare(b));
  return entries.length === 0
    ? 'dimensionless'
    : entries.map(([name, exponent]) => `${name}^${exponent}`).join('*');
}

function sameDimensions(a: DimensionVector, b: DimensionVector): boolean {
  return dimensionKey(a) === dimensionKey(b);
}

export function registerUnit(definition: UnitDefinition): void {
  if (!definition.symbol) throw new Error('Unit symbol must not be empty');
  if (!Number.isFinite(definition.scale) || definition.scale <= 0) {
    throw new Error(`Unit '${definition.symbol}' scale must be finite and positive`);
  }
  const resolved: ResolvedUnit = {
    ...definition,
    offset: definition.offset ?? 0,
    dimensions: dimensionsFor(definition),
  };
  const existing = definitions.get(definition.symbol);
  if (existing && JSON.stringify(existing) !== JSON.stringify(resolved)) {
    throw new Error(`Unit '${definition.symbol}' is already registered differently`);
  }
  definitions.set(definition.symbol, resolved);
  // A new base unit can turn a previously-unresolvable symbol (cached as
  // `undefined`) or a compound expression built from it into a hit.
  resolutionCache.clear();
}

class UnitExpressionParser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): ResolvedUnit {
    const result = this.parseProduct();
    this.skipWhitespace();
    if (this.index !== this.source.length) {
      throw new Error(`Unexpected '${this.source[this.index]}' at position ${this.index + 1}`);
    }
    return { ...result, symbol: this.source, dimension: dimensionKey(result.dimensions) };
  }

  private parseProduct(): ResolvedUnit {
    let result = this.parsePower();
    while (true) {
      this.skipWhitespace();
      const operator = this.source[this.index];
      if (operator !== '*' && operator !== '/') break;
      this.index++;
      const right = this.parsePower();
      result = combineResolvedUnits(result, right, operator === '*' ? 1 : -1, this.source);
    }
    return result;
  }

  private parsePower(): ResolvedUnit {
    let result = this.parseAtom();
    this.skipWhitespace();
    if (this.source[this.index] === '^') {
      this.index++;
      this.skipWhitespace();
      const match = /^[+-]?\d+/.exec(this.source.slice(this.index));
      if (!match) throw new Error(`Expected integer exponent at position ${this.index + 1}`);
      this.index += match[0].length;
      result = raiseResolvedUnit(result, Number(match[0]), this.source);
    }
    return result;
  }

  private parseAtom(): ResolvedUnit {
    this.skipWhitespace();
    if (this.source[this.index] === '(') {
      this.index++;
      const result = this.parseProduct();
      this.skipWhitespace();
      if (this.source[this.index] !== ')') throw new Error(`Missing ')' at position ${this.index + 1}`);
      this.index++;
      return result;
    }
    const start = this.index;
    while (this.index < this.source.length && !'*/^()'.includes(this.source[this.index])) this.index++;
    const symbol = this.source.slice(start, this.index).trim();
    if (!symbol) throw new Error(`Expected unit symbol at position ${start + 1}`);
    const unit = definitions.get(symbol);
    if (!unit) throw new Error(`Unknown atomic unit '${symbol}'`);
    return cloneResolved(unit);
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source[this.index] ?? '')) this.index++;
  }
}

function assertNoCompoundOffset(unit: ResolvedUnit, expression: string): void {
  if ((unit.offset ?? 0) !== 0) {
    throw new Error(`Offset unit '${unit.symbol}' cannot be used in compound expression '${expression}'`);
  }
}

function combineResolvedUnits(
  left: ResolvedUnit,
  right: ResolvedUnit,
  rightExponent: 1 | -1,
  expression: string,
): ResolvedUnit {
  assertNoCompoundOffset(left, expression);
  assertNoCompoundOffset(right, expression);
  const dimensions: Record<string, number> = { ...left.dimensions };
  for (const [name, exponent] of Object.entries(right.dimensions)) {
    dimensions[name] = (dimensions[name] ?? 0) + exponent * rightExponent;
  }
  const cleaned = cleanDimensions(dimensions);
  return {
    symbol: expression,
    dimension: dimensionKey(cleaned),
    dimensions: cleaned,
    scale: left.scale * Math.pow(right.scale, rightExponent),
    offset: 0,
  };
}

function raiseResolvedUnit(unit: ResolvedUnit, exponent: number, expression: string): ResolvedUnit {
  assertNoCompoundOffset(unit, expression);
  const dimensions = cleanDimensions(Object.fromEntries(
    Object.entries(unit.dimensions).map(([name, value]) => [name, value * exponent]),
  ));
  return {
    symbol: expression,
    dimension: dimensionKey(dimensions),
    dimensions,
    scale: Math.pow(unit.scale, exponent),
    offset: 0,
  };
}

function normalizeExpression(symbol: string): string {
  return symbol.replaceAll('·', '*').replaceAll('²', '^2').replaceAll('³', '^3').trim();
}

/**
 * Resolution cache, keyed on the RAW symbol.
 *
 * Not the normalized form: resolveUncached tests the compound-character regex
 * against the raw symbol while parsing the normalized one, so a normalized key
 * would conflate '·'-style symbols with their already-normalized twins.
 *
 * Contract validation resolves the same handful of unit strings at every leaf of
 * every port on every step, so without this the parser dominates a run's whole
 * runtime. Cleared by registerUnit, which is the only mutation path into
 * `definitions` and the only thing that can turn a miss into a hit.
 */
/** Misses are stored as null so one lookup distinguishes them from an absent key. */
const resolutionCache = new Map<string, ResolvedUnit | null>();

/** Callers may mutate what they get back, so every hit hands out a fresh copy. */
function cloneResolved(unit: ResolvedUnit): ResolvedUnit {
  return { ...unit, dimensions: { ...unit.dimensions } };
}

function resolveUnit(symbol: string): ResolvedUnit | undefined {
  let cached = resolutionCache.get(symbol);
  if (cached === undefined) {
    cached = resolveUncached(symbol) ?? null;
    resolutionCache.set(symbol, cached);
  }
  // The cached entry is never handed out directly, so it needs no copy going in.
  return cached ? cloneResolved(cached) : undefined;
}

function resolveUncached(symbol: string): ResolvedUnit | undefined {
  const normalized = normalizeExpression(symbol);
  const registered = definitions.get(normalized);
  if (registered) return registered;
  if (!/[*/^()²³·]/.test(symbol)) return undefined;
  try {
    return new UnitExpressionParser(normalized).parse();
  } catch {
    return undefined;
  }
}

/** Existence check for validators, avoiding the defensive copy getUnit owes callers. */
function unitExists(symbol: string): boolean {
  let cached = resolutionCache.get(symbol);
  if (cached === undefined) {
    cached = resolveUncached(symbol) ?? null;
    resolutionCache.set(symbol, cached);
  }
  return cached !== null;
}

export function getUnit(symbol: string): UnitDefinition | undefined {
  // resolveUnit already hands back a private copy; no second clone needed.
  return resolveUnit(symbol);
}

export function listUnits(): UnitDefinition[] {
  return [...definitions.values()].map(cloneResolved);
}

export function areUnitsConvertible(fromSymbol: string, toSymbol: string): boolean {
  const from = resolveUnit(fromSymbol);
  const to = resolveUnit(toSymbol);
  return !!from && !!to && sameDimensions(from.dimensions, to.dimensions);
}

/** True only when no scale or offset conversion is needed. */
export function areUnitsIdentical(fromSymbol: string, toSymbol: string): boolean {
  const from = resolveUnit(fromSymbol);
  const to = resolveUnit(toSymbol);
  return !!from && !!to && sameDimensions(from.dimensions, to.dimensions) &&
    from.scale === to.scale && (from.offset ?? 0) === (to.offset ?? 0);
}

export function convertUnit(value: number, fromSymbol: string, toSymbol: string): number {
  if (!Number.isFinite(value)) throw new Error('Cannot convert a non-finite value');
  const from = resolveUnit(fromSymbol);
  const to = resolveUnit(toSymbol);
  if (!from) throw new Error(`Unknown unit '${fromSymbol}'`);
  if (!to) throw new Error(`Unknown unit '${toSymbol}'`);
  if (!sameDimensions(from.dimensions, to.dimensions)) {
    throw new Error(`Incompatible units '${fromSymbol}' and '${toSymbol}'`);
  }
  const base = (value + (from.offset ?? 0)) * from.scale;
  return base / to.scale - (to.offset ?? 0);
}

export function multiplyUnits(left: string, right: string): UnitDefinition {
  const result = getUnit(`(${left})*(${right})`);
  if (!result) throw new Error(`Cannot multiply units '${left}' and '${right}'`);
  return result;
}

export function divideUnits(numerator: string, denominator: string): UnitDefinition {
  const result = getUnit(`(${numerator})/(${denominator})`);
  if (!result) throw new Error(`Cannot divide units '${numerator}' and '${denominator}'`);
  return result;
}

export function powUnit(symbol: string, exponent: number): UnitDefinition {
  if (!Number.isInteger(exponent)) throw new Error('Unit exponent must be an integer');
  const result = getUnit(`(${symbol})^${exponent}`);
  if (!result) throw new Error(`Cannot raise unit '${symbol}' to power ${exponent}`);
  return result;
}

export function isOpaquePort(port: PortMeta): port is OpaquePortMeta {
  return 'opaque' in port && port.opaque === true;
}

export function isQuantityPort(port: PortMeta): port is QuantityPortMeta {
  return 'unit' in port && typeof port.unit === 'string';
}

export function isMetadataPort(port: PortMeta): port is MetadataPortMeta {
  return 'kind' in port && port.kind === 'metadata';
}

export function isObjectPort(port: PortMeta): port is AnyObjectPortMeta {
  return 'kind' in port && port.kind === 'object';
}

export function isRecordPort(port: PortMeta): port is AnyRecordPortMeta {
  return 'kind' in port && port.kind === 'record';
}

export function isVectorPort(port: PortMeta): port is AnyVectorPortMeta {
  return 'kind' in port && port.kind === 'vector';
}

export function isPortMeta(value: unknown): value is PortMeta {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.unit === 'string' || candidate.opaque === true ||
    candidate.kind === 'metadata' || candidate.kind === 'object' ||
    candidate.kind === 'record' || candidate.kind === 'vector';
}

function portKind(port: PortMeta): string {
  if (isQuantityPort(port)) return 'quantity';
  if (isOpaquePort(port)) return 'opaque';
  return port.kind;
}

export function validatePortMeta(port: PortMeta, context: string): void {
  if (port.optional !== undefined && typeof port.optional !== 'boolean') {
    throw new Error(`${context}: optional must be boolean`);
  }
  if (port.nullable !== undefined && typeof port.nullable !== 'boolean') {
    throw new Error(`${context}: nullable must be boolean`);
  }
  if (isOpaquePort(port)) {
    if (typeof port.description !== 'string' || !port.description.trim()) {
      throw new Error(`${context}: opaque port must explain why it is opaque`);
    }
    return;
  }
  if (isQuantityPort(port)) {
    if (!unitExists(port.unit)) throw new Error(`${context}: unknown unit '${port.unit}'`);
    if (port.estimand) validateEstimand(port.estimand, `${context}.estimand`);
    if (port.measurement) {
      validateMeasurement(port.measurement, `${context}.measurement`);
      assertEstimandsCompatible(
        port.measurement.estimand,
        port.estimand,
        `${context}.measurement estimand`,
        { mode: 'required' },
      );
    }
    if (
      port.valueType !== undefined &&
      !(['number', 'record', 'nested-record', 'vector'] as const).includes(port.valueType)
    ) {
      throw new Error(`${context}: invalid quantity value type '${String(port.valueType)}'`);
    }
    return;
  }
  if (isMetadataPort(port)) {
    if (port.dataType !== 'string' && port.dataType !== 'boolean') {
      throw new Error(`${context}: invalid metadata type '${String(port.dataType)}'`);
    }
    if (typeof port.description !== 'string' || !port.description.trim()) {
      throw new Error(`${context}: metadata port must have a description`);
    }
    return;
  }
  if (isObjectPort(port)) {
    if (!isRecord(port.fields)) throw new Error(`${context}: object contract must declare fields`);
    for (const [name, field] of Object.entries(port.fields as Readonly<Record<string, PortMeta>>)) {
      if (!isPortMeta(field)) throw new Error(`${context}.${name}: invalid port contract`);
      validatePortMeta(field, `${context}.${name}`);
    }
    return;
  }
  if (isRecordPort(port)) {
    if (port.keys) {
      if (!Array.isArray(port.keys) || port.keys.some((key) => typeof key !== 'string')) {
        throw new Error(`${context}: record keys must be an array of strings`);
      }
      if (new Set(port.keys).size !== port.keys.length) {
        throw new Error(`${context}: record contract has duplicate keys`);
      }
    }
    if (!isPortMeta(port.values)) throw new Error(`${context}{value}: invalid port contract`);
    validatePortMeta(port.values, `${context}{value}`);
    return;
  }
  if (isVectorPort(port)) {
    if (!isPortMeta(port.items)) throw new Error(`${context}[]: invalid port contract`);
    validatePortMeta(port.items, `${context}[]`);
    return;
  }
  throw new Error(`${context}: invalid port contract`);
}

export function validatePortUnits(producer: PortMeta, consumer: PortMeta, context: string): void {
  validatePortMeta(producer, `${context} producer`);
  validatePortMeta(consumer, `${context} consumer`);
  if (producer.optional && !consumer.optional) {
    throw new Error(`${context}: optional producer cannot satisfy a required consumer`);
  }
  if (producer.nullable && !consumer.nullable) {
    throw new Error(`${context}: nullable producer cannot satisfy a non-null consumer`);
  }
  const producerKind = portKind(producer);
  const consumerKind = portKind(consumer);
  if (producerKind !== consumerKind) {
    throw new Error(`${context}: schema mismatch '${producerKind}' -> '${consumerKind}'`);
  }
  if (isOpaquePort(producer) || isOpaquePort(consumer)) {
    if (!(isOpaquePort(producer) && isOpaquePort(consumer))) {
      throw new Error(`${context}: opaque and unit-bearing ports cannot be connected implicitly`);
    }
    if (producer.valueType && consumer.valueType && producer.valueType !== consumer.valueType) {
      throw new Error(`${context}: opaque value type mismatch '${producer.valueType}' -> '${consumer.valueType}'`);
    }
    return;
  }
  if (isQuantityPort(producer) && isQuantityPort(consumer)) {
    if (!areUnitsIdentical(producer.unit, consumer.unit)) {
      throw new Error(
        `${context}: unit mismatch '${producer.unit}' -> '${consumer.unit}'. ` +
        `Use an explicit conversion transform.`,
      );
    }
    const producerValueType = producer.valueType ?? 'number';
    const consumerValueType = consumer.valueType ?? 'number';
    if (producerValueType !== consumerValueType) {
      throw new Error(`${context}: value type mismatch '${producerValueType}' -> '${consumerValueType}'`);
    }
    return;
  }
  if (isMetadataPort(producer) && isMetadataPort(consumer)) {
    if (producer.dataType !== consumer.dataType) {
      throw new Error(`${context}: metadata type mismatch '${producer.dataType}' -> '${consumer.dataType}'`);
    }
    return;
  }
  if (isObjectPort(producer) && isObjectPort(consumer)) {
    const producerFields = producer.fields as Readonly<Record<string, PortMeta>>;
    const consumerFields = consumer.fields as Readonly<Record<string, PortMeta>>;
    const producerNames = Object.keys(producerFields).sort();
    const consumerNames = Object.keys(consumerFields).sort();
    const missing = consumerNames.filter((name) => !Object.hasOwn(producerFields, name));
    const extra = producerNames.filter((name) => !Object.hasOwn(consumerFields, name));
    if (missing.length || extra.length) {
      throw new Error(
        `${context}: object schema fields differ` +
        `${missing.length ? `; missing [${missing.join(', ')}]` : ''}` +
        `${extra.length ? `; extra [${extra.join(', ')}]` : ''}`,
      );
    }
    for (const name of consumerNames) {
      const provided = producerFields[name];
      const expected = consumerFields[name];
      validatePortUnits(provided, expected, `${context}.${name}`);
    }
    return;
  }
  if (isRecordPort(producer) && isRecordPort(consumer)) {
    const producerKeys = producer.keys ? [...producer.keys].sort() : undefined;
    const consumerKeys = consumer.keys ? [...consumer.keys].sort() : undefined;
    if (JSON.stringify(producerKeys) !== JSON.stringify(consumerKeys)) {
      throw new Error(
        `${context}: record key contracts differ ` +
        `(${producerKeys?.join(', ') ?? 'dynamic'} -> ${consumerKeys?.join(', ') ?? 'dynamic'})`,
      );
    }
    validatePortUnits(producer.values, consumer.values, `${context}{value}`);
    return;
  }
  if (isVectorPort(producer) && isVectorPort(consumer)) {
    validatePortUnits(producer.items, consumer.items, `${context}[]`);
    return;
  }
  throw new Error(
    `${context}: incompatible port schemas '${producerKind}' -> '${consumerKind}'`,
  );
}

export interface PortCompatibilityOptions {
  semanticValidation?: SemanticValidationMode;
  measurementValidation?: SemanticValidationMode;
  /** Valid only for a scalar/homogeneous quantity mapping. */
  crosswalk?: SemanticCrosswalk;
  /** Valid only for a scalar/homogeneous observed quantity mapping. */
  measurementCrosswalk?: MeasurementCrosswalk;
}

function validatePortSemantics(
  producer: PortMeta,
  consumer: PortMeta,
  context: string,
  options: PortCompatibilityOptions,
): void {
  if (isQuantityPort(producer) && isQuantityPort(consumer)) {
    assertEstimandsCompatible(producer.estimand, consumer.estimand, context, {
      mode: options.semanticValidation,
      crosswalk: options.crosswalk,
    });
    assertMeasurementsCompatible(
      producer.measurement,
      consumer.measurement,
      context,
      {
        mode: options.measurementValidation,
        crosswalk: options.measurementCrosswalk,
      },
    );
    return;
  }
  if (options.crosswalk || options.measurementCrosswalk) {
    throw new Error(`${context}: one crosswalk cannot be applied to a structured port`);
  }
  if (isObjectPort(producer) && isObjectPort(consumer)) {
    const producerFields = producer.fields as Readonly<Record<string, PortMeta>>;
    const consumerFields = consumer.fields as Readonly<Record<string, PortMeta>>;
    for (const name of Object.keys(consumerFields)) {
      validatePortSemantics(
        producerFields[name],
        consumerFields[name],
        `${context}.${name}`,
        options,
      );
    }
    return;
  }
  if (isRecordPort(producer) && isRecordPort(consumer)) {
    validatePortSemantics(producer.values, consumer.values, `${context}{value}`, options);
    return;
  }
  if (isVectorPort(producer) && isVectorPort(consumer)) {
    validatePortSemantics(producer.items, consumer.items, `${context}[]`, options);
  }
}

/**
 * Full boundary compatibility: shape, units, and—when declared or
 * required—the estimand carried by every quantitative leaf.
 */
export function validatePortCompatibility(
  producer: PortMeta,
  consumer: PortMeta,
  context: string,
  options: PortCompatibilityOptions = {},
): void {
  validatePortUnits(producer, consumer, context);
  validatePortSemantics(producer, consumer, context, {
    semanticValidation: options.semanticValidation ?? 'if-present',
    measurementValidation: options.measurementValidation ?? 'if-present',
    crosswalk: options.crosswalk,
    measurementCrosswalk: options.measurementCrosswalk,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !ArrayBuffer.isView(value);
}

function matchesValueType(value: unknown, type: PortValueType): boolean {
  if (type === 'number') return typeof value === 'number';
  if (type === 'vector') return Array.isArray(value) || ArrayBuffer.isView(value);
  if (type === 'record') return isRecord(value);
  return isRecord(value) && Object.values(value).every((child) =>
    isRecord(child) || Array.isArray(child) || ArrayBuffer.isView(child)
  );
}

function assertNumericDeep(value: unknown, path: string, seen = new WeakSet<object>()): void {
  if (typeof value === 'number') return;
  if (value === undefined || value === null) {
    throw new Error(`${path}: unit-bearing value must be numeric, got ${String(value)}`);
  }
  if (typeof value !== 'object') throw new Error(`${path}: unit-bearing value must be numeric, got ${typeof value}`);
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) assertNumericDeep(child, `${path}.${key}`, seen);
}

/**
 * Validate the runtime shape and numeric content of a single boundary value.
 *
 * Contract validity and value conformance are two different questions, and
 * conflating them is expensive: the contract is a static schema, while the
 * value is a tree that may hold hundreds of leaves. validatePortMeta already
 * walks the whole contract tree, so one call here covers every nested field —
 * the recursion below deliberately re-enters assertValueOnly, not this
 * function, so a Record<Region, Record<Source, number>> costs one contract
 * walk instead of one per leaf.
 */
export function assertPortValue(value: unknown, meta: PortMeta, context: string): void {
  validatePortMeta(meta, context);
  assertValueOnly(value, meta, context);
}

/** Value conformance only. Assumes `meta` has already been validated. */
function assertValueOnly(value: unknown, meta: PortMeta, context: string): void {
  if (value === undefined) {
    if (meta.optional) return;
    throw new Error(`${context}: required contracted value is undefined`);
  }
  if (value === null) {
    if (meta.nullable) return;
    throw new Error(`${context}: contracted value is not nullable`);
  }
  if (isOpaquePort(meta)) {
    if (meta.valueType && !matchesValueType(value, meta.valueType)) {
      throw new Error(`${context}: expected ${meta.valueType} value`);
    }
    return;
  }
  if (isQuantityPort(meta)) {
    const valueType = meta.valueType ?? 'number';
    if (!matchesValueType(value, valueType)) {
      throw new Error(`${context}: expected ${valueType} value`);
    }
    assertNumericDeep(value, context);
    return;
  }
  if (isMetadataPort(meta)) {
    if (typeof value !== meta.dataType) {
      throw new Error(`${context}: expected ${meta.dataType} metadata, got ${typeof value}`);
    }
    return;
  }
  if (isObjectPort(meta)) {
    if (!isRecord(value)) throw new Error(`${context}: expected object value`);
    const fields = meta.fields as Readonly<Record<string, PortMeta>>;
    for (const [name, field] of Object.entries(fields)) {
      if (!field.optional && !Object.hasOwn(value, name)) {
        throw new Error(`${context}.${name}: required contracted value is missing`);
      }
      if (Object.hasOwn(value, name)) assertValueOnly(value[name], field, `${context}.${name}`);
    }
    for (const name of Object.keys(value)) {
      if (!Object.hasOwn(fields, name)) throw new Error(`${context}.${name}: value has no port contract`);
    }
    return;
  }
  if (isRecordPort(meta)) {
    if (!isRecord(value)) throw new Error(`${context}: expected record value`);
    if (meta.keys) {
      const expected = new Set(meta.keys);
      for (const key of meta.keys) {
        if (!Object.hasOwn(value, key)) throw new Error(`${context}.${key}: required record key is missing`);
      }
      for (const key of Object.keys(value)) {
        if (!expected.has(key)) throw new Error(`${context}.${key}: unexpected record key`);
      }
    }
    for (const [key, child] of Object.entries(value)) {
      assertValueOnly(child, meta.values, `${context}.${key}`);
    }
    return;
  }
  if (isVectorPort(meta)) {
    if (!Array.isArray(value) && !ArrayBuffer.isView(value)) {
      throw new Error(`${context}: expected vector value`);
    }
    for (const [index, child] of Array.from(value as ArrayLike<unknown>).entries()) {
      assertValueOnly(child, meta.items, `${context}[${index}]`);
    }
    return;
  }
}

/**
 * Check an actual runtime object against a complete top-level port contract.
 * This catches JavaScript callers and drift between declared TypeScript types
 * and the object a model actually returns.
 */
export function assertPortContract<T>(
  value: T,
  contract: PortContract<T>,
  context: string,
): void {
  if (!contract) throw new Error(`${context}: missing port contract`);
  if (isPortMeta(contract)) {
    assertPortValue(value, contract, context);
    return;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${context}: expected object matching the top-level port contract`);
  }
  const declared = contract as Readonly<Record<string, PortMeta>>;
  for (const [name, meta] of Object.entries(declared)) validatePortMeta(meta, `${context}.${name}`);
  for (const [name, meta] of Object.entries(declared)) {
    if (!meta.optional && !Object.hasOwn(value as object, name)) {
      throw new Error(`${context}.${name}: required contracted value is missing`);
    }
  }
  for (const [name, fieldValue] of Object.entries(value as Record<string, unknown>)) {
    const meta = declared[name];
    if (!meta) throw new Error(`${context}.${name}: value has no port contract`);
    assertPortValue(fieldValue, meta, `${context}.${name}`);
  }
}

export interface PortSchemaCounts {
  unitBearing: number;
  metadata: number;
  opaque: number;
  structured: number;
}

export interface SemanticSchemaAudit {
  quantitativeContracts: number;
  semanticContracts: number;
  measurementContracts: number;
  missingSemanticPaths: string[];
}

function walkSemanticSchema(
  meta: PortMeta,
  path: string,
  audit: SemanticSchemaAudit,
): void {
  if (isQuantityPort(meta)) {
    audit.quantitativeContracts++;
    if (meta.estimand) audit.semanticContracts++;
    else audit.missingSemanticPaths.push(path);
    if (meta.measurement) audit.measurementContracts++;
    return;
  }
  if (isObjectPort(meta)) {
    for (const [name, field] of Object.entries(meta.fields as Readonly<Record<string, PortMeta>>)) {
      walkSemanticSchema(field, `${path}.${name}`, audit);
    }
  } else if (isRecordPort(meta)) {
    walkSemanticSchema(meta.values, `${path}{value}`, audit);
  } else if (isVectorPort(meta)) {
    walkSemanticSchema(meta.items, `${path}[]`, audit);
  }
}

/** Count semantic coverage independently from dimensional coverage. */
export function auditPortSemantics(meta: PortMeta, path = 'port'): SemanticSchemaAudit {
  const audit: SemanticSchemaAudit = {
    quantitativeContracts: 0,
    semanticContracts: 0,
    measurementContracts: 0,
    missingSemanticPaths: [],
  };
  walkSemanticSchema(meta, path, audit);
  return audit;
}

/** Count leaf and structural contracts for CI coverage reporting. */
export function countPortSchema(meta: PortMeta): PortSchemaCounts {
  if (isQuantityPort(meta)) return { unitBearing: 1, metadata: 0, opaque: 0, structured: 0 };
  if (isMetadataPort(meta)) return { unitBearing: 0, metadata: 1, opaque: 0, structured: 0 };
  if (isOpaquePort(meta)) return { unitBearing: 0, metadata: 0, opaque: 1, structured: 0 };
  const children = isObjectPort(meta)
    ? Object.values(meta.fields as Readonly<Record<string, PortMeta>>)
    : [isRecordPort(meta) ? meta.values : meta.items];
  return children.reduce<PortSchemaCounts>(
    (total, child) => {
      const count = countPortSchema(child);
      total.unitBearing += count.unitBearing;
      total.metadata += count.metadata;
      total.opaque += count.opaque;
      total.structured += count.structured;
      return total;
    },
    { unitBearing: 0, metadata: 0, opaque: 0, structured: 1 },
  );
}

const SECOND = 1;
const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;
const ENERGY_DIMENSIONS = { mass: 1, length: 2, time: -2 } as const;
const POWER_DIMENSIONS = { mass: 1, length: 2, time: -3 } as const;

const BUILTIN_UNITS: UnitDefinition[] = [
  { symbol: '1', dimension: 'dimensionless', scale: 1, description: 'dimensionless ratio' },
  { symbol: 'fraction', dimension: 'dimensionless', scale: 1 },
  { symbol: '%', dimension: 'dimensionless', scale: 0.01 },
  { symbol: 'percentage-point', dimension: 'dimensionless', scale: 0.01 },
  { symbol: 'bp', dimension: 'dimensionless', scale: 0.0001 },
  { symbol: '100bp', dimension: 'dimensionless', scale: 0.01 },
  { symbol: '$', dimension: 'currency', scale: 1 },
  { symbol: '$k', dimension: 'currency', scale: 1e3 },
  { symbol: '$M', dimension: 'currency', scale: 1e6 },
  { symbol: '$B', dimension: 'currency', scale: 1e9 },
  { symbol: '$T', dimension: 'currency', scale: 1e12 },
  { symbol: 'Wh', dimension: 'energy', dimensions: ENERGY_DIMENSIONS, scale: 3600 },
  { symbol: 'kWh', dimension: 'energy', dimensions: ENERGY_DIMENSIONS, scale: 3.6e6 },
  { symbol: 'MWh', dimension: 'energy', dimensions: ENERGY_DIMENSIONS, scale: 3.6e9 },
  { symbol: 'GWh', dimension: 'energy', dimensions: ENERGY_DIMENSIONS, scale: 3.6e12 },
  { symbol: 'TWh', dimension: 'energy', dimensions: ENERGY_DIMENSIONS, scale: 3.6e15 },
  { symbol: 'W', dimension: 'power', dimensions: POWER_DIMENSIONS, scale: 1 },
  { symbol: 'kW', dimension: 'power', dimensions: POWER_DIMENSIONS, scale: 1e3 },
  { symbol: 'MW', dimension: 'power', dimensions: POWER_DIMENSIONS, scale: 1e6 },
  { symbol: 'GW', dimension: 'power', dimensions: POWER_DIMENSIONS, scale: 1e9 },
  { symbol: 'TW', dimension: 'power', dimensions: POWER_DIMENSIONS, scale: 1e12 },
  { symbol: 'second', dimension: 'time', scale: SECOND },
  { symbol: 'hour', dimension: 'time', scale: HOUR },
  { symbol: '100hour', dimension: 'time', scale: 100 * HOUR },
  { symbol: 'day', dimension: 'time', scale: DAY },
  { symbol: 'week', dimension: 'time', scale: 7 * DAY },
  { symbol: 'month', dimension: 'time', scale: YEAR / 12 },
  { symbol: 'quarter', dimension: 'time', scale: YEAR / 4 },
  { symbol: 'year', dimension: 'time', scale: YEAR },
  {
    symbol: 'calendar-year',
    dimension: 'custom:calendar-year',
    scale: 1,
    description: 'absolute Gregorian year label, not a duration',
  },
  {
    symbol: 'calendar-month',
    dimension: 'custom:calendar-month',
    scale: 1,
    description: 'Gregorian month-of-year label in [1, 12], not a duration',
  },
  {
    symbol: 'calendar-quarter',
    dimension: 'custom:calendar-quarter',
    scale: 1,
    description: 'Gregorian quarter-of-year label in [1, 4], not a duration',
  },
  {
    symbol: 'step-index',
    dimension: 'custom:step-index',
    scale: 1,
    description: 'zero-based discrete simulation-step index, not elapsed time',
  },
  { symbol: 'm', dimension: 'length', scale: 1 },
  { symbol: 'km', dimension: 'length', scale: 1e3 },
  { symbol: 'mi', dimension: 'length', scale: 1609.344 },
  { symbol: 'ha', dimension: 'length', dimensions: { length: 2 }, scale: 1e4 },
  { symbol: 'Mha', dimension: 'length', dimensions: { length: 2 }, scale: 1e10 },
  { symbol: 'kg', dimension: 'mass', scale: 1 },
  { symbol: 't', dimension: 'mass', scale: 1e3 },
  { symbol: 'Mt', dimension: 'mass', scale: 1e9 },
  { symbol: 'Gt', dimension: 'mass', scale: 1e12 },
  { symbol: 'kgCO2', dimension: 'custom:co2-mass', scale: 1 },
  { symbol: 'tCO2', dimension: 'custom:co2-mass', scale: 1e3 },
  { symbol: 'GtCO2', dimension: 'custom:co2-mass', scale: 1e12 },
  {
    symbol: '°C',
    dimension: 'custom:absolute-temperature',
    scale: 1,
    offset: 273.15,
    description: 'absolute temperature on the Celsius scale',
  },
  {
    symbol: 'K',
    dimension: 'custom:absolute-temperature',
    scale: 1,
    description: 'absolute temperature on the Kelvin scale',
  },
  {
    symbol: 'Δ°C',
    dimension: 'custom:temperature-difference',
    scale: 1,
    description: 'temperature difference or anomaly in Celsius degrees',
  },
  {
    symbol: 'ΔK',
    dimension: 'custom:temperature-difference',
    scale: 1,
    description: 'temperature difference in kelvins',
  },
  { symbol: 'people', dimension: 'custom:people', scale: 1 },
  { symbol: 'kpeople', dimension: 'custom:people', scale: 1e3 },
  { symbol: '100kpeople', dimension: 'custom:people', scale: 1e5 },
  { symbol: 'Mpeople', dimension: 'custom:people', scale: 1e6 },
  { symbol: 'robot', dimension: 'custom:robot', scale: 1 },
  { symbol: 'bed', dimension: 'custom:bed', scale: 1 },
  { symbol: 'course', dimension: 'custom:course', scale: 1 },
  { symbol: 'dose', dimension: 'custom:dose', scale: 1 },
  { symbol: 'vehicle', dimension: 'custom:vehicle', scale: 1 },
  { symbol: 'aircraft', dimension: 'custom:aircraft', scale: 1 },
  { symbol: 'seat', dimension: 'custom:seat', scale: 1 },
  {
    symbol: 'flight',
    dimension: 'custom:flight',
    scale: 1,
    description: 'one origin-to-destination aircraft movement',
  },
  {
    symbol: 'operation',
    dimension: 'custom:airport-operation',
    scale: 1,
    description: 'one arrival or one departure at a landing facility',
  },
  {
    symbol: 'passenger-trip',
    dimension: 'custom:passenger-trip',
    scale: 1,
    description: 'one passenger carried on one origin-to-destination flight',
  },
  { symbol: 'facility', dimension: 'custom:aviation-facility', scale: 1 },
  {
    symbol: 'USgal',
    dimension: 'custom:liquid-volume',
    scale: 1,
    description: 'U.S. liquid gallon',
  },
  { symbol: 'individual', dimension: 'custom:individual', scale: 1 },
  { symbol: 'housing-unit', dimension: 'custom:housing-unit', scale: 1 },
  { symbol: 'household', dimension: 'custom:housing-unit', scale: 1 },
  { symbol: 'kcal', dimension: 'energy', dimensions: ENERGY_DIMENSIONS, scale: 4184 },
  { symbol: 'ppm', dimension: 'custom:concentration', scale: 1e-6 },
  {
    symbol: 'pH',
    dimension: 'custom:ph-scale',
    scale: 1,
    description: 'logarithmic hydrogen-ion activity scale; not a linear fraction',
  },
  {
    symbol: 'log1p-admissions',
    dimension: 'custom:log1p-admissions',
    scale: 1,
    description: 'log(1 + weekly hospital admissions), a nonlinear transformed scale',
  },
  { symbol: 'barrel', dimension: 'custom:oil-volume', scale: 1 },
  { symbol: 'million-barrel', dimension: 'custom:oil-volume', scale: 1e6 },
  {
    symbol: 'mb/d',
    dimension: 'custom:oil-flow',
    dimensions: { 'custom:oil-volume': 1, time: -1 },
    scale: 1e6 / DAY,
    description: 'million barrels per day',
  },
  { symbol: 'Bcf', dimension: 'custom:gas-volume', scale: 1, description: 'billion cubic feet' },
];

BUILTIN_UNITS.forEach(registerUnit);
