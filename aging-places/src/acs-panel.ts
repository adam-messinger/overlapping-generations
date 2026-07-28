/**
 * Semantic ACS place-panel extraction.
 *
 * Profile variable positions have changed across releases. This module
 * resolves concepts from each release's own variables.json and records the
 * resulting crosswalk; callers never carry a 2024 code backward by accident.
 */
import { num } from '../scripts/lib.js';

export type AcsDatasetKind = 'profile' | 'detailed';

export interface AcsVariableMetadata {
  label: string;
  concept?: string;
  predicateType?: string;
  group?: string;
  attributes?: string;
}

export interface AcsVariablesMetadata {
  variables: Record<string, AcsVariableMetadata>;
}

export interface AcsCrosswalkEntry {
  output: string;
  dataset: AcsDatasetKind;
  group: string;
  variable: string;
  moeVariable: string;
  label: string;
  moeLabel: string;
  unit: 'count' | 'percent' | 'years' | 'dollars';
  semanticMatch: {
    includes: readonly string[];
    excludes: readonly string[];
    predicateType?: string;
  };
}

export interface AcsCrosswalk {
  schemaVersion: 'aging-places.acs-semantic-crosswalk/v1';
  vintage: number;
  resolvedAt: string;
  entries: readonly AcsCrosswalkEntry[];
  construction: {
    lowerBoundYear: number;
    componentOutputs: readonly string[];
    rule: string;
  };
  notes: readonly string[];
}

interface SemanticSpec {
  output: string;
  dataset: AcsDatasetKind;
  group: string;
  statistic: 'estimate' | 'percent';
  unit: AcsCrosswalkEntry['unit'];
  includes: readonly string[];
  excludes?: readonly string[];
  predicateType?: string;
}

const PROFILE_SPECS: readonly SemanticSpec[] = [
  { output: 'pop', dataset: 'profile', group: 'DP05', statistic: 'estimate', unit: 'count', includes: ['sex and age', 'total population'], predicateType: 'int' },
  { output: 'medianAge', dataset: 'profile', group: 'DP05', statistic: 'estimate', unit: 'years', includes: ['sex and age', 'median age years'], predicateType: 'float' },
  { output: 'pctUnder5', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', 'under 5 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct5_9', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '5 to 9 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct10_14', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '10 to 14 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct15_19', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '15 to 19 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct20_24', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '20 to 24 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct25_34', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '25 to 34 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct35_44', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '35 to 44 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct45_54', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '45 to 54 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct55_59', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '55 to 59 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct60_64', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '60 to 64 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct65_74', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '65 to 74 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct75_84', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '75 to 84 years'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct85up', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '85 years and over'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'pct65up', dataset: 'profile', group: 'DP05', statistic: 'percent', unit: 'percent', includes: ['sex and age', '65 years and over'], excludes: ['male', 'female'], predicateType: 'float' },
  { output: 'households', dataset: 'profile', group: 'DP02', statistic: 'estimate', unit: 'count', includes: ['households by type', 'total households'], predicateType: 'int' },
  { output: 'collegeEnroll', dataset: 'profile', group: 'DP02', statistic: 'estimate', unit: 'count', includes: ['school enrollment', 'college or graduate school'], predicateType: 'int' },
  { output: 'pctGrad', dataset: 'profile', group: 'DP02', statistic: 'percent', unit: 'percent', includes: ['educational attainment', 'graduate or professional degree'], predicateType: 'float' },
  { output: 'pctBach', dataset: 'profile', group: 'DP02', statistic: 'percent', unit: 'percent', includes: ['educational attainment', 'bachelor s degree or higher'], predicateType: 'float' },
  { output: 'foreignBorn', dataset: 'profile', group: 'DP02', statistic: 'estimate', unit: 'count', includes: ['place of birth', 'foreign born'], predicateType: 'int' },
  { output: 'armedForces', dataset: 'profile', group: 'DP03', statistic: 'estimate', unit: 'count', includes: ['employment status', 'in labor force', 'armed forces'], predicateType: 'int' },
  { output: 'civEmployed', dataset: 'profile', group: 'DP03', statistic: 'estimate', unit: 'count', includes: ['industry', 'civilian employed population 16 years and over'], predicateType: 'int' },
  { output: 'pctInfo', dataset: 'profile', group: 'DP03', statistic: 'percent', unit: 'percent', includes: ['industry', 'civilian employed population 16 years and over', 'information'], predicateType: 'float' },
  { output: 'pctFire', dataset: 'profile', group: 'DP03', statistic: 'percent', unit: 'percent', includes: ['industry', 'finance and insurance and real estate and rental and leasing'], predicateType: 'float' },
  { output: 'pctProf', dataset: 'profile', group: 'DP03', statistic: 'percent', unit: 'percent', includes: ['industry', 'professional scientific and management and administrative and waste management services'], predicateType: 'float' },
  { output: 'pctEduHealth', dataset: 'profile', group: 'DP03', statistic: 'percent', unit: 'percent', includes: ['industry', 'educational services', 'health care and social assistance'], predicateType: 'float' },
  { output: 'pctArtsRec', dataset: 'profile', group: 'DP03', statistic: 'percent', unit: 'percent', includes: ['industry', 'arts entertainment and recreation', 'accommodation and food services'], predicateType: 'float' },
  { output: 'pctPubAdmin', dataset: 'profile', group: 'DP03', statistic: 'percent', unit: 'percent', includes: ['industry', 'public administration'], excludes: ['other services'], predicateType: 'float' },
  { output: 'medianHHInc', dataset: 'profile', group: 'DP03', statistic: 'estimate', unit: 'dollars', includes: ['income and benefits', 'total households', 'median household income dollars'], predicateType: 'int' },
  { output: 'meanHHInc', dataset: 'profile', group: 'DP03', statistic: 'estimate', unit: 'dollars', includes: ['income and benefits', 'total households', 'mean household income dollars'], predicateType: 'int' },
  { output: 'units', dataset: 'profile', group: 'DP04', statistic: 'estimate', unit: 'count', includes: ['housing occupancy', 'total housing units'], predicateType: 'int' },
  { output: 'occupied', dataset: 'profile', group: 'DP04', statistic: 'estimate', unit: 'count', includes: ['housing occupancy', 'occupied housing units'], predicateType: 'int' },
  { output: 'vacant', dataset: 'profile', group: 'DP04', statistic: 'estimate', unit: 'count', includes: ['housing occupancy', 'vacant housing units'], predicateType: 'int' },
  { output: 'medianValue', dataset: 'profile', group: 'DP04', statistic: 'estimate', unit: 'dollars', includes: ['value', 'owner occupied units', 'median dollars'], predicateType: 'int' },
  { output: 'medianRent', dataset: 'profile', group: 'DP04', statistic: 'estimate', unit: 'dollars', includes: ['gross rent', 'occupied units paying rent', 'median dollars'], predicateType: 'int' },
] as const;

const DETAILED_SPECS: readonly SemanticSpec[] = [
  { output: 'eduEmpM', dataset: 'detailed', group: 'C24030', statistic: 'estimate', unit: 'count', includes: ['male', 'educational services'], excludes: ['female'], predicateType: 'int' },
  { output: 'healthEmpM', dataset: 'detailed', group: 'C24030', statistic: 'estimate', unit: 'count', includes: ['male', 'health care and social assistance'], excludes: ['female'], predicateType: 'int' },
  { output: 'eduEmpF', dataset: 'detailed', group: 'C24030', statistic: 'estimate', unit: 'count', includes: ['female', 'educational services'], predicateType: 'int' },
  { output: 'healthEmpF', dataset: 'detailed', group: 'C24030', statistic: 'estimate', unit: 'count', includes: ['female', 'health care and social assistance'], predicateType: 'int' },
  { output: 'seasonalUnits', dataset: 'detailed', group: 'B25004', statistic: 'estimate', unit: 'count', includes: ['seasonal recreational or occasional use'], predicateType: 'int' },
  { output: 'aggHHInc', dataset: 'detailed', group: 'B19025', statistic: 'estimate', unit: 'dollars', includes: ['aggregate household income', 'inflation adjusted dollars'], predicateType: 'int' },
  { output: 'groupQuarters', dataset: 'detailed', group: 'B26001', statistic: 'estimate', unit: 'count', includes: ['total'], predicateType: 'int' },
] as const;

function normalizeLabel(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(?:19|20)\d{2}\s+inflation adjusted dollars\b/gi, 'inflation adjusted dollars')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function variableKind(variable: string): 'estimate' | 'percent' | null {
  if (/PE$/.test(variable)) return 'percent';
  if (/E$/.test(variable)) return 'estimate';
  return null;
}

function resolveOne(
  metadata: AcsVariablesMetadata,
  spec: SemanticSpec,
): AcsCrosswalkEntry {
  const includes = spec.includes.map(normalizeLabel);
  const excludes = (spec.excludes ?? []).map(normalizeLabel);
  let candidates = Object.entries(metadata.variables).filter(([variable, row]) => {
    if (row.group !== spec.group || variableKind(variable) !== spec.statistic) return false;
    if (
      spec.predicateType &&
      row.predicateType &&
      row.predicateType !== spec.predicateType
    ) return false;
    const label = normalizeLabel(row.label);
    return includes.every((token) => label.includes(token)) &&
      label.endsWith(includes.at(-1)!) &&
      excludes.every((token) => !label.includes(token));
  });
  if (candidates.length > 1) {
    const bySpecificity = [...candidates].sort(
      (left, right) =>
        normalizeLabel(right[1].label).length -
        normalizeLabel(left[1].label).length,
    );
    if (
      normalizeLabel(bySpecificity[0][1].label).length >
      normalizeLabel(bySpecificity[1][1].label).length
    ) {
      candidates = [bySpecificity[0]];
    }
  }
  if (candidates.length !== 1) {
    throw new Error(
      `${spec.output}: expected one ${spec.group} semantic match, found ${
        candidates.length
      }: ${candidates.map(([variable, row]) => `${variable}=${row.label}`).join(' | ')}`,
    );
  }
  const [variable, row] = candidates[0];
  const moeVariable = spec.statistic === 'percent'
    ? variable.replace(/PE$/, 'PM')
    : variable.replace(/E$/, 'M');
  const moe = metadata.variables[moeVariable];
  const declaredAttributes = new Set(
    (row.attributes ?? '').split(',').map((value) => value.trim()),
  );
  if (!moe && !declaredAttributes.has(moeVariable)) {
    throw new Error(`${spec.output}: ${variable} has no MOE variable ${moeVariable}`);
  }
  return {
    output: spec.output,
    dataset: spec.dataset,
    group: spec.group,
    variable,
    moeVariable,
    label: row.label,
    moeLabel: moe?.label ?? `Margin of error!!${row.label}`,
    unit: spec.unit,
    semanticMatch: {
      includes: spec.includes,
      excludes: spec.excludes ?? [],
      ...(spec.predicateType ? { predicateType: spec.predicateType } : {}),
    },
  };
}

function constructionSpecs(
  metadata: AcsVariablesMetadata,
  vintage: number,
): readonly SemanticSpec[] {
  const lowerBound = vintage - 14;
  const bins = Object.entries(metadata.variables)
    .filter(([variable, row]) =>
      row.group === 'DP04' &&
      variableKind(variable) === 'estimate' &&
      row.predicateType === 'int' &&
      normalizeLabel(row.label).includes('year structure built') &&
      normalizeLabel(row.label).includes('built '))
    .map(([variable, row]) => {
      const label = normalizeLabel(row.label);
      const match = /\bbuilt (\d{4})(?: to \d{4}| or later)\b/.exec(label);
      return match ? { variable, row, lower: Number(match[1]) } : null;
    })
    .filter((row): row is {
      variable: string;
      row: AcsVariableMetadata;
      lower: number;
    } => row !== null && row.lower >= lowerBound)
    .sort((left, right) => right.lower - left.lower);
  if (bins.length === 0) {
    throw new Error(`No complete construction bins found at or after ${lowerBound}`);
  }
  return bins.map(({ row }, index) => ({
    output: `builtRecentComponent${index + 1}`,
    dataset: 'profile',
    group: 'DP04',
    statistic: 'estimate',
    unit: 'count',
    includes: ['year structure built', normalizeLabel(row.label).split('built ').at(-1)!],
    predicateType: 'int',
  }));
}

export function resolveAcsCrosswalk(options: {
  vintage: number;
  resolvedAt: string;
  profile: AcsVariablesMetadata;
  detailed: AcsVariablesMetadata;
}): AcsCrosswalk {
  const construction = constructionSpecs(options.profile, options.vintage);
  const profileSpecs = PROFILE_SPECS.map((spec): SemanticSpec => {
    // The 2005-2009 profile encodes this already-computed percentage as an
    // `E` float and makes the corresponding `PE` field a string annotation.
    if (options.vintage === 2009 && spec.output === 'pctBach') {
      return {
        ...spec,
        statistic: 'estimate',
        includes: [
          'educational attainment',
          'percent bachelor s degree or higher',
        ],
        predicateType: 'float',
      };
    }
    return spec;
  });
  const entries = [
    ...profileSpecs.map((spec) => resolveOne(options.profile, spec)),
    ...construction.map((spec) => resolveOne(options.profile, spec)),
    ...DETAILED_SPECS.map((spec) => resolveOne(options.detailed, spec)),
  ];
  const outputs = new Set<string>();
  for (const entry of entries) {
    if (outputs.has(entry.output)) {
      throw new Error(`Duplicate ACS output '${entry.output}'`);
    }
    outputs.add(entry.output);
  }
  return {
    schemaVersion: 'aging-places.acs-semantic-crosswalk/v1',
    vintage: options.vintage,
    resolvedAt: options.resolvedAt,
    entries,
    construction: {
      lowerBoundYear: options.vintage - 14,
      componentOutputs: construction.map(({ output }) => output),
      rule:
        'Sum published year-built bins whose lower endpoint is no earlier than vintage minus 14; partial bins are excluded.',
    },
    notes: [
      'Each estimate is paired with its published 90% ACS margin of error.',
      'Construction-component MOEs are combined by root-sum-square; ACS covariance is unavailable, so that derived MOE is approximate.',
      'Profile codes are resolved independently for each vintage from variables.json.',
    ],
  };
}

export interface AcsPayload {
  dataset: AcsDatasetKind;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}

export interface NormalizedAcsPanel {
  header: string[];
  rows: (string | number | null)[][];
}

export function parseCensusArray(value: unknown, context: string): {
  columns: string[];
  rows: string[][];
} {
  if (!Array.isArray(value) || value.length < 1 || !Array.isArray(value[0])) {
    throw new Error(`${context}: expected a non-empty two-dimensional array`);
  }
  const matrix = value as unknown[][];
  if (!matrix.every(Array.isArray)) {
    throw new Error(`${context}: expected every row to be an array`);
  }
  return {
    columns: matrix[0].map(String),
    rows: matrix.slice(1).map((row) => row.map(String)),
  };
}

export function normalizeAcsPayloads(
  crosswalk: AcsCrosswalk,
  payloads: readonly AcsPayload[],
): NormalizedAcsPanel {
  const records = new Map<string, Record<string, string | number | null>>();
  for (const payload of payloads) {
    const at = (column: string): number => payload.columns.indexOf(column);
    const state = at('state');
    const place = at('place');
    const name = at('NAME');
    if (state < 0 || place < 0 || name < 0) {
      throw new Error('ACS payload lacks NAME/state/place geography columns');
    }
    const entries = crosswalk.entries.filter(({ dataset }) => dataset === payload.dataset);
    for (const row of payload.rows) {
      const geoid = `${row[state]}${row[place]}`;
      let record = records.get(geoid);
      if (!record) {
        record = { geoid, name: row[name] ?? '' };
        records.set(geoid, record);
      }
      for (const entry of entries) {
        const estimateAt = at(entry.variable);
        const moeAt = at(entry.moeVariable);
        if (estimateAt >= 0) record[entry.output] = num(row[estimateAt]);
        if (moeAt >= 0) record[`${entry.output}Moe`] = num(row[moeAt]);
      }
    }
  }
  const baseOutputs = crosswalk.entries.map(({ output }) => output);
  const header = [
    'geoid',
    'name',
    ...baseOutputs.flatMap((output) => [output, `${output}Moe`]),
    'builtRecent',
    'builtRecentMoe',
  ];
  const rows = [...records.values()]
    .sort((left, right) => String(left.geoid).localeCompare(String(right.geoid)))
    .map((record) => {
      const constructionEstimates = crosswalk.construction.componentOutputs
        .map((output) => record[output])
        .filter((value): value is number => typeof value === 'number');
      const constructionMoes = crosswalk.construction.componentOutputs
        .map((output) => record[`${output}Moe`])
        .filter((value): value is number => typeof value === 'number');
      record.builtRecent = constructionEstimates.length > 0
        ? constructionEstimates.reduce((sum, value) => sum + value, 0)
        : null;
      record.builtRecentMoe = constructionMoes.length > 0
        ? Math.sqrt(constructionMoes.reduce((sum, value) => sum + value ** 2, 0))
        : null;
      return header.map((column) => record[column] ?? null);
    });
  return { header, rows };
}

export function acsFetchChunks(
  crosswalk: AcsCrosswalk,
  maximumGetVariables = 47,
): { dataset: AcsDatasetKind; variables: string[] }[] {
  if (!Number.isInteger(maximumGetVariables) || maximumGetVariables < 2) {
    throw new Error('maximumGetVariables must be an integer of at least two');
  }
  const result: { dataset: AcsDatasetKind; variables: string[] }[] = [];
  for (const dataset of ['profile', 'detailed'] as const) {
    const variables = crosswalk.entries
      .filter((entry) => entry.dataset === dataset)
      .flatMap((entry) => [entry.variable, entry.moeVariable]);
    for (let offset = 0; offset < variables.length; offset += maximumGetVariables) {
      result.push({
        dataset,
        variables: variables.slice(offset, offset + maximumGetVariables),
      });
    }
  }
  return result;
}
