/** Unit-aware arithmetic for high-risk equations inside simulation modules. */

import {
  areUnitsConvertible,
  convertUnit,
  divideUnits,
  getUnit,
  multiplyUnits,
  powUnit,
} from './units.js';

export interface UnitQuantity {
  value: number;
  unit: string;
  label?: string;
}

export interface UnitBalanceReport {
  name: string;
  unit: string;
  left: number;
  right: number;
  residual: number;
  tolerance: number;
}

function assertQuantity(quantity: UnitQuantity, context: string): void {
  if (!Number.isFinite(quantity.value)) throw new Error(`${context}: value must be finite`);
  if (!getUnit(quantity.unit)) throw new Error(`${context}: unknown unit '${quantity.unit}'`);
}

export function unitQuantity(value: number, unit: string, label?: string): UnitQuantity {
  const result = { value, unit, ...(label ? { label } : {}) };
  assertQuantity(result, label ?? 'quantity');
  return result;
}

export function convertQuantity(quantity: UnitQuantity, targetUnit: string): UnitQuantity {
  assertQuantity(quantity, quantity.label ?? 'quantity');
  if (!areUnitsConvertible(quantity.unit, targetUnit)) {
    throw new Error(
      `${quantity.label ?? 'quantity'}: cannot convert '${quantity.unit}' to '${targetUnit}'`,
    );
  }
  return {
    value: convertUnit(quantity.value, quantity.unit, targetUnit),
    unit: targetUnit,
    ...(quantity.label ? { label: quantity.label } : {}),
  };
}

export function sumQuantities(
  quantities: readonly UnitQuantity[],
  targetUnit = quantities[0]?.unit,
  label?: string,
): UnitQuantity {
  if (!targetUnit) throw new Error(`${label ?? 'sum'}: target unit is required for an empty sum`);
  const value = quantities.reduce((sum, quantity) => {
    try {
      return sum + convertQuantity(quantity, targetUnit).value;
    } catch (error) {
      throw new Error(
        `${label ?? 'sum'}${quantity.label ? ` term '${quantity.label}'` : ''}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, 0);
  return unitQuantity(value, targetUnit, label);
}

export function subtractQuantities(
  minuend: UnitQuantity,
  subtrahends: readonly UnitQuantity[],
  label?: string,
): UnitQuantity {
  assertQuantity(minuend, label ?? minuend.label ?? 'difference');
  const subtracted = sumQuantities(subtrahends, minuend.unit, label ? `${label} subtrahends` : undefined);
  return unitQuantity(minuend.value - subtracted.value, minuend.unit, label);
}

export function multiplyQuantities(
  quantities: readonly UnitQuantity[],
  label?: string,
): UnitQuantity {
  if (quantities.length === 0) return unitQuantity(1, '1', label);
  let value = 1;
  let unit = '1';
  for (const quantity of quantities) {
    assertQuantity(quantity, label ?? quantity.label ?? 'product');
    value *= quantity.value;
    unit = multiplyUnits(unit, quantity.unit).symbol;
  }
  return unitQuantity(value, unit, label);
}

export function divideQuantities(
  numerator: UnitQuantity,
  denominator: UnitQuantity,
  label?: string,
): UnitQuantity {
  assertQuantity(numerator, label ?? numerator.label ?? 'quotient');
  assertQuantity(denominator, label ?? denominator.label ?? 'quotient');
  if (denominator.value === 0) throw new Error(`${label ?? 'quotient'}: division by zero`);
  return unitQuantity(
    numerator.value / denominator.value,
    divideUnits(numerator.unit, denominator.unit).symbol,
    label,
  );
}

export function powQuantity(
  quantity: UnitQuantity,
  exponent: number,
  label?: string,
): UnitQuantity {
  assertQuantity(quantity, label ?? quantity.label ?? 'power');
  return unitQuantity(
    Math.pow(quantity.value, exponent),
    powUnit(quantity.unit, exponent).symbol,
    label,
  );
}

/** Integrate a flow over an explicit timestep and convert it to a stock unit. */
export function integrateFlow(
  flow: UnitQuantity,
  duration: UnitQuantity,
  stockUnit: string,
  label?: string,
): UnitQuantity {
  const integrated = multiplyQuantities([flow, duration], label);
  return convertQuantity(integrated, stockUnit);
}

/**
 * Check both dimensions and values for a conservation/accounting identity.
 * Right-hand terms are explicitly converted to the left-hand unit.
 */
export function assertUnitBalance(
  name: string,
  left: UnitQuantity,
  rightTerms: readonly UnitQuantity[],
  options: { absoluteTolerance?: number; relativeTolerance?: number } = {},
): UnitBalanceReport {
  assertQuantity(left, `${name} left side`);
  const right = sumQuantities(rightTerms, left.unit, `${name} right side`);
  const residual = left.value - right.value;
  const tolerance = (options.absoluteTolerance ?? 1e-9) +
    (options.relativeTolerance ?? 1e-9) * Math.max(Math.abs(left.value), Math.abs(right.value));
  if (Math.abs(residual) > tolerance) {
    throw new Error(
      `${name}: balance failed in ${left.unit}; left=${left.value}, right=${right.value}, ` +
      `residual=${residual}, tolerance=${tolerance}`,
    );
  }
  return { name, unit: left.unit, left: left.value, right: right.value, residual, tolerance };
}
