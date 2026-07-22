/**
 * Runtime dimensional analysis for simulation boundaries.
 *
 * Unit expressions are deliberately small and dependency-free. Registered
 * atomic symbols may be combined with `*`, `/`, integer powers (`^2`), and
 * parentheses. Examples: `$/MWh`, `TWh/year`, `kgCO2/MWh`, and `people/year`.
 */

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
  description?: string;
  valueType?: PortValueType;
  optional?: boolean;
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
  unit?: never;
}

export type PortMeta = QuantityPortMeta | OpaquePortMeta;

type PortMetaForValue<T> = [NonNullable<T>] extends [number]
  ? QuantityPortMeta
  : [NonNullable<T>] extends [string | boolean]
    ? OpaquePortMeta
    : PortMeta;

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
): QuantityPortMeta & { optional?: false } {
  return { unit, ...(valueType ? { valueType } : {}), ...(description ? { description } : {}) };
}

export function opaquePort(
  description: string,
  valueType?: Exclude<PortValueType, 'number'>,
): OpaquePortMeta & { optional?: false } {
  return { opaque: true, description, ...(valueType ? { valueType } : {}) };
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
    return { ...unit, dimensions: { ...unit.dimensions } };
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

function resolveUnit(symbol: string): ResolvedUnit | undefined {
  const normalized = normalizeExpression(symbol);
  const registered = definitions.get(normalized);
  if (registered) return { ...registered, dimensions: { ...registered.dimensions } };
  if (!/[*/^()²³·]/.test(symbol)) return undefined;
  try {
    return new UnitExpressionParser(normalized).parse();
  } catch {
    return undefined;
  }
}

export function getUnit(symbol: string): UnitDefinition | undefined {
  const unit = resolveUnit(symbol);
  return unit ? { ...unit, dimensions: { ...unit.dimensions } } : undefined;
}

export function listUnits(): UnitDefinition[] {
  return [...definitions.values()].map((unit) => ({ ...unit, dimensions: { ...unit.dimensions } }));
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

export function validatePortMeta(port: PortMeta, context: string): void {
  if (isOpaquePort(port)) {
    if (!port.description.trim()) throw new Error(`${context}: opaque port must explain why it is opaque`);
    return;
  }
  if (!getUnit(port.unit)) throw new Error(`${context}: unknown unit '${port.unit}'`);
}

export function validatePortUnits(producer: PortMeta, consumer: PortMeta, context: string): void {
  validatePortMeta(producer, `${context} producer`);
  validatePortMeta(consumer, `${context} consumer`);
  if (isOpaquePort(producer) || isOpaquePort(consumer)) {
    if (!(isOpaquePort(producer) && isOpaquePort(consumer))) {
      throw new Error(`${context}: opaque and unit-bearing ports cannot be connected implicitly`);
    }
  } else if (!areUnitsIdentical(producer.unit, consumer.unit)) {
    throw new Error(
      `${context}: unit mismatch '${producer.unit}' -> '${consumer.unit}'. ` +
      `Use an explicit conversion transform.`,
    );
  }
  if (producer.valueType && consumer.valueType && producer.valueType !== consumer.valueType) {
    throw new Error(`${context}: value type mismatch '${producer.valueType}' -> '${consumer.valueType}'`);
  }
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
  if (value === undefined || value === null) return;
  if (typeof value !== 'object') throw new Error(`${path}: unit-bearing value must be numeric, got ${typeof value}`);
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) assertNumericDeep(child, `${path}.${key}`, seen);
}

/** Validate the runtime shape and numeric content of a single boundary value. */
export function assertPortValue(value: unknown, meta: PortMeta, context: string): void {
  validatePortMeta(meta, context);
  if (value === undefined) return;
  if (meta.valueType && !matchesValueType(value, meta.valueType)) {
    throw new Error(`${context}: expected ${meta.valueType} value`);
  }
  if (!isOpaquePort(meta)) assertNumericDeep(value, context);
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
  if (typeof value !== 'object' || value === null) {
    const meta = contract as PortMeta;
    validatePortMeta(meta, context);
    if (!isOpaquePort(meta)) assertNumericDeep(value, context);
    return;
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
  { symbol: 'day', dimension: 'time', scale: DAY },
  { symbol: 'week', dimension: 'time', scale: 7 * DAY },
  { symbol: 'month', dimension: 'time', scale: YEAR / 12 },
  { symbol: 'year', dimension: 'time', scale: YEAR },
  { symbol: 'm', dimension: 'length', scale: 1 },
  { symbol: 'km', dimension: 'length', scale: 1e3 },
  { symbol: 'ha', dimension: 'length', dimensions: { length: 2 }, scale: 1e4 },
  { symbol: 'Mha', dimension: 'length', dimensions: { length: 2 }, scale: 1e10 },
  { symbol: 'kg', dimension: 'mass', scale: 1 },
  { symbol: 't', dimension: 'mass', scale: 1e3 },
  { symbol: 'Mt', dimension: 'mass', scale: 1e9 },
  { symbol: 'Gt', dimension: 'mass', scale: 1e12 },
  { symbol: 'kgCO2', dimension: 'custom:co2-mass', scale: 1 },
  { symbol: 'tCO2', dimension: 'custom:co2-mass', scale: 1e3 },
  { symbol: 'GtCO2', dimension: 'custom:co2-mass', scale: 1e12 },
  { symbol: '°C', dimension: 'temperature', scale: 1 },
  { symbol: 'K', dimension: 'temperature', scale: 1 },
  { symbol: 'people', dimension: 'custom:people', scale: 1 },
  { symbol: 'kpeople', dimension: 'custom:people', scale: 1e3 },
  { symbol: '100kpeople', dimension: 'custom:people', scale: 1e5 },
  { symbol: 'Mpeople', dimension: 'custom:people', scale: 1e6 },
  { symbol: 'robot', dimension: 'custom:robot', scale: 1 },
  { symbol: 'bed', dimension: 'custom:bed', scale: 1 },
  { symbol: 'course', dimension: 'custom:course', scale: 1 },
  { symbol: 'vehicle', dimension: 'custom:vehicle', scale: 1 },
  { symbol: 'individual', dimension: 'custom:individual', scale: 1 },
  { symbol: 'housing-unit', dimension: 'custom:housing-unit', scale: 1 },
  { symbol: 'household', dimension: 'custom:housing-unit', scale: 1 },
  { symbol: 'kcal', dimension: 'energy', dimensions: ENERGY_DIMENSIONS, scale: 4184 },
  { symbol: 'ppm', dimension: 'custom:concentration', scale: 1e-6 },
  { symbol: 'pH', dimension: 'dimensionless', scale: 1 },
  { symbol: 'mb/d', dimension: 'custom:oil-flow', scale: 1, description: 'million barrels per day' },
];

BUILTIN_UNITS.forEach(registerUnit);
