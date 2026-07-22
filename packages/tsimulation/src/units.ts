export type UnitDimension =
  | 'dimensionless'
  | 'currency'
  | 'energy'
  | 'power'
  | 'mass'
  | 'time'
  | 'temperature'
  | 'rate'
  | `custom:${string}`;

export interface UnitDefinition {
  symbol: string;
  dimension: UnitDimension;
  /** Multiplicative scale to the dimension's base unit. */
  scale: number;
  /** Optional additive offset applied before scaling. */
  offset?: number;
  description?: string;
}

export interface PortMeta {
  unit: string;
  description?: string;
  valueType?: 'number' | 'record' | 'nested-record';
}

const definitions = new Map<string, UnitDefinition>();

export function registerUnit(definition: UnitDefinition): void {
  if (!definition.symbol) throw new Error('Unit symbol must not be empty');
  if (!Number.isFinite(definition.scale) || definition.scale <= 0) {
    throw new Error(`Unit '${definition.symbol}' scale must be finite and positive`);
  }
  const existing = definitions.get(definition.symbol);
  if (existing && JSON.stringify(existing) !== JSON.stringify(definition)) {
    throw new Error(`Unit '${definition.symbol}' is already registered differently`);
  }
  definitions.set(definition.symbol, { ...definition });
}

export function getUnit(symbol: string): UnitDefinition | undefined {
  const unit = definitions.get(symbol);
  return unit ? { ...unit } : undefined;
}

export function listUnits(): UnitDefinition[] {
  return [...definitions.values()].map((unit) => ({ ...unit }));
}

export function convertUnit(value: number, fromSymbol: string, toSymbol: string): number {
  if (!Number.isFinite(value)) throw new Error('Cannot convert a non-finite value');
  const from = definitions.get(fromSymbol);
  const to = definitions.get(toSymbol);
  if (!from) throw new Error(`Unknown unit '${fromSymbol}'`);
  if (!to) throw new Error(`Unknown unit '${toSymbol}'`);
  if (from.dimension !== to.dimension) {
    throw new Error(`Incompatible units '${fromSymbol}' and '${toSymbol}'`);
  }
  const base = (value + (from.offset ?? 0)) * from.scale;
  return base / to.scale - (to.offset ?? 0);
}

export function validatePortUnits(
  producer: PortMeta,
  consumer: PortMeta,
  context: string,
): void {
  const from = definitions.get(producer.unit);
  const to = definitions.get(consumer.unit);
  if (!from) throw new Error(`${context}: unknown producer unit '${producer.unit}'`);
  if (!to) throw new Error(`${context}: unknown consumer unit '${consumer.unit}'`);
  if (from.dimension !== to.dimension || from.scale !== to.scale || from.offset !== to.offset) {
    throw new Error(
      `${context}: unit mismatch '${producer.unit}' -> '${consumer.unit}'. ` +
      `Use an explicit conversion transform.`,
    );
  }
  if (producer.valueType && consumer.valueType && producer.valueType !== consumer.valueType) {
    throw new Error(
      `${context}: value type mismatch '${producer.valueType}' -> '${consumer.valueType}'`,
    );
  }
}

const BUILTIN_UNITS = [
  { symbol: '1', dimension: 'dimensionless', scale: 1, description: 'dimensionless ratio' },
  { symbol: 'fraction', dimension: 'dimensionless', scale: 1 },
  { symbol: '%', dimension: 'dimensionless', scale: 0.01 },
  { symbol: 'percentage-point', dimension: 'dimensionless', scale: 0.01 },
  { symbol: 'bp', dimension: 'dimensionless', scale: 0.0001 },
  { symbol: '$', dimension: 'currency', scale: 1 },
  { symbol: '$B', dimension: 'currency', scale: 1e9 },
  { symbol: '$T', dimension: 'currency', scale: 1e12 },
  { symbol: 'Wh', dimension: 'energy', scale: 1 },
  { symbol: 'MWh', dimension: 'energy', scale: 1e6 },
  { symbol: 'TWh', dimension: 'energy', scale: 1e12 },
  { symbol: 'W', dimension: 'power', scale: 1 },
  { symbol: 'MW', dimension: 'power', scale: 1e6 },
  { symbol: 'GW', dimension: 'power', scale: 1e9 },
  { symbol: 'day', dimension: 'time', scale: 1 },
  { symbol: 'month', dimension: 'time', scale: 365.25 / 12 },
  { symbol: 'year', dimension: 'time', scale: 365.25 },
  { symbol: '°C', dimension: 'temperature', scale: 1 },
  { symbol: 'people', dimension: 'custom:people', scale: 1 },
  { symbol: 'mb/d', dimension: 'custom:oil-flow', scale: 1, description: 'million barrels per day' },
] satisfies UnitDefinition[];

BUILTIN_UNITS.forEach(registerUnit);
