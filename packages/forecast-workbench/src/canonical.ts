import { createHash, createHmac } from 'node:crypto';
import { stableStringify } from 'tsimulation';

export interface Clock {
  now(): Date;
  mode: 'production' | 'replay';
}

export class SystemClock implements Clock {
  readonly mode = 'production' as const;

  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  readonly mode = 'replay' as const;

  constructor(private current: Date) {
    if (Number.isNaN(current.getTime())) throw new Error('Fixed clock requires a valid date');
  }

  now(): Date {
    return new Date(this.current);
  }

  set(value: Date): void {
    if (Number.isNaN(value.getTime())) throw new Error('Fixed clock requires a valid date');
    this.current = new Date(value);
  }

  advance(milliseconds: number): void {
    if (!Number.isFinite(milliseconds)) throw new Error('Clock advance must be finite');
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

export function canonicalJson(value: unknown, space?: number): string {
  return stableStringify(value, space);
}

export function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalJson(value));
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function sha256Id(value: string | Uint8Array): string {
  return `sha256:${sha256Hex(value)}`;
}

export function canonicalSha256Id(value: unknown): string {
  return sha256Id(canonicalBytes(value));
}

export function hmacSha256Hex(key: string | Uint8Array, value: string | Uint8Array): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

export function isoNow(clock: Clock): string {
  return clock.now().toISOString();
}

export function requireIsoTimestamp(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
    throw new Error(`${context} must be an ISO timestamp`);
  }
}

export function requireText(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${context} must not be empty`);
  }
}

export function assertFiniteJson(value: unknown, context = 'value'): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${context} must be finite`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteJson(item, `${context}[${index}]`));
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      assertFiniteJson(item, `${context}.${key}`);
    }
  }
}
