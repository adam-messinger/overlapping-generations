/**
 * Auto-Generated Introspection
 *
 * Walks each module's `paramMeta` tree to generate ParameterInfo entries.
 * Co-locates metadata with module definitions (Julia ModelingToolkit pattern).
 */

import { AnyModule } from './autowire.js';
import { ParamMeta } from './types.js';

/**
 * ParameterInfo matches the existing introspection schema shape.
 */
export interface GeneratedParameterInfo {
  type: 'number' | 'boolean';
  default: number | boolean;
  min?: number;
  max?: number;
  unit: string;
  description: string;
  path: string;
}

/**
 * Check if a value is a ParamMeta leaf node.
 * ParamMeta has `description`, `unit`, and `range` fields.
 */
function isParamMeta(value: unknown): value is ParamMeta {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.description === 'string' &&
    typeof v.unit === 'string' &&
    typeof v.range === 'object' && v.range !== null
  );
}

/**
 * Get a nested value from an object by dot-path parts.
 */
function getNestedValue(obj: any, parts: string[]): unknown {
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * Recursively walk the paramMeta tree to generate ParameterInfo entries.
 */
function walkParamMeta(
  meta: Record<string, any>,
  defaults: any,
  moduleName: string,
  pathParts: string[],
  result: Record<string, GeneratedParameterInfo>
): void {
  for (const [key, value] of Object.entries(meta)) {
    const currentPath = [...pathParts, key];

    if (isParamMeta(value)) {
      // This is a leaf ParamMeta node
      const fullPath = `${moduleName}.${currentPath.join('.')}`;
      const defaultValue = getNestedValue(defaults, currentPath);
      const schemaKey = value.paramName ?? key;

      result[schemaKey] = {
        type: typeof defaultValue === 'boolean' ? 'boolean' : 'number',
        default: (defaultValue as number | boolean) ?? value.range.default,
        min: value.range.min,
        max: value.range.max,
        unit: value.unit,
        description: value.description,
        path: fullPath,
      };
    } else if (typeof value === 'object' && value !== null) {
      // Nested object — recurse
      walkParamMeta(value, defaults, moduleName, currentPath, result);
    }
  }
}

/**
 * Generate a parameter schema from modules with paramMeta declarations.
 * Only processes Tier 1 params (or all tiers if none specified).
 *
 * @param modules - Array of modules to extract paramMeta from
 * @returns Record mapping friendly param names to GeneratedParameterInfo
 */
export function generateParameterSchema(
  modules: AnyModule[]
): Record<string, GeneratedParameterInfo> {
  const result: Record<string, GeneratedParameterInfo> = {};

  for (const mod of modules) {
    if (!mod.paramMeta) continue;
    walkParamMeta(mod.paramMeta, mod.defaults, mod.name, [], result);
  }

  return result;
}
