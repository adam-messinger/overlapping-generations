import { convertUnit, getUnit } from './units.js';

export type ShockOperation = 'add' | 'multiply' | 'min' | 'max' | 'replace';

export interface ScalarShock {
  id: string;
  channel: string;
  period: string | number;
  value: number;
  unit: string;
  operation: ShockOperation;
  scope?: string;
  overlapGroup?: string;
  source?: string;
}

export interface ComposedShock {
  channel: string;
  period: string | number;
  scope?: string;
  value: number;
  unit: string;
  operation: ShockOperation;
  shockIds: string[];
}

function keyFor(shock: Pick<ScalarShock, 'channel' | 'period' | 'scope'>): string {
  return `${shock.channel}\u0000${String(shock.period)}\u0000${shock.scope ?? ''}`;
}

export function composeShockLedger(shocks: readonly ScalarShock[]): ComposedShock[] {
  const ids = new Set<string>();
  const overlapKeys = new Set<string>();
  const groups = new Map<string, ScalarShock[]>();
  for (const shock of shocks) {
    if (ids.has(shock.id)) throw new Error(`Duplicate shock ID '${shock.id}'`);
    ids.add(shock.id);
    if (!Number.isFinite(shock.value)) throw new Error(`Shock '${shock.id}' value must be finite`);
    if (!getUnit(shock.unit)) throw new Error(`Shock '${shock.id}' uses unknown unit '${shock.unit}'`);
    const key = keyFor(shock);
    if (shock.overlapGroup) {
      const overlapKey = `${key}\u0000${shock.overlapGroup}`;
      if (overlapKeys.has(overlapKey)) {
        throw new Error(
          `Shocks in overlap group '${shock.overlapGroup}' target the same channel/period/scope`,
        );
      }
      overlapKeys.add(overlapKey);
    }
    const rows = groups.get(key) ?? [];
    rows.push(shock);
    groups.set(key, rows);
  }
  return [...groups.values()].map((rows) => {
    const first = rows[0];
    if (rows.some((row) => row.operation !== first.operation)) {
      throw new Error(`Mixed shock operations for '${first.channel}' in period '${first.period}'`);
    }
    if (first.operation === 'replace' && rows.length > 1) {
      throw new Error(`Multiple replacement shocks for '${first.channel}' in period '${first.period}'`);
    }
    const values = rows.map((row) => convertUnit(row.value, row.unit, first.unit));
    let value: number;
    switch (first.operation) {
      case 'add': value = values.reduce((a, b) => a + b, 0); break;
      case 'multiply': value = values.reduce((a, b) => a * b, 1); break;
      case 'min': value = Math.min(...values); break;
      case 'max': value = Math.max(...values); break;
      case 'replace': value = values[0]; break;
    }
    return {
      channel: first.channel,
      period: first.period,
      scope: first.scope,
      value,
      unit: first.unit,
      operation: first.operation,
      shockIds: rows.map((row) => row.id),
    };
  });
}

export function mergeTemporalRecords<T extends { year: number }>(options: {
  existing?: readonly T[];
  generated: readonly T[];
  onConflict?: 'error' | 'replace';
  context?: string;
}): T[] {
  const onConflict = options.onConflict ?? 'error';
  const context = options.context ?? 'temporal records';
  const merged = new Map<number, T>();
  for (const row of options.existing ?? []) {
    if (merged.has(row.year)) throw new Error(`${context}: duplicate existing year ${row.year}`);
    merged.set(row.year, row);
  }
  for (const row of options.generated) {
    if (merged.has(row.year) && onConflict === 'error') {
      throw new Error(`${context}: generated record conflicts with existing year ${row.year}`);
    }
    merged.set(row.year, row);
  }
  return [...merged.values()].sort((a, b) => a.year - b.year);
}
