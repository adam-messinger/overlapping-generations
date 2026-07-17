/** Shared rules for the frozen-boundary Japanese municipal census panel. */

export const CODE_2015_TO_2020: Readonly<Record<string, string>> = {
  // Tomiya-machi became Tomiya-shi on 2016-10-10; geography was unchanged.
  '04423': '04216',
  // Nakagawa-machi became Nakagawa-shi on 2018-10-01; geography was unchanged.
  '40305': '40231',
};

/** Census code for the aggregate of Tokyo's 23 special wards. */
export const TOKYO_WARD_AGGREGATE = '13100';

export function isTokyoSpecialWard(code: string): boolean {
  return /^131(?:0[1-9]|1[0-9]|2[0-3])$/.test(code);
}

/**
 * The international protocol treats designated cities as one municipality,
 * while retaining Tokyo's 23 special wards as municipalities. Other
 * designated-city wards would double count their parent city and are omitted.
 */
export function isAnalysisUnit(identification: string, code: string): boolean {
  // Tokyo's aggregate is published beside its 23 constituent wards. Keeping
  // both would double count 9.7 million people in the municipal panel.
  if (code === TOKYO_WARD_AGGREGATE) return false;
  return identification === '1'
    || identification === '2'
    || identification === '3'
    || (identification === '0' && isTokyoSpecialWard(code));
}

export function codeOn2020Boundary(code2015: string): string {
  return CODE_2015_TO_2020[code2015] ?? code2015;
}

export function stripAreaOrdinal(value: string): string {
  const separator = value.indexOf('_');
  return separator >= 0 ? value.slice(separator + 1) : value;
}

export function finiteNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const cleaned = value.replace(/[,+%]/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '***' || cleaned === '**') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sumRequired(values: Array<number | null>, label: string): number | null {
  if (values.some((value) => value === null)) return null;
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  if (!Number.isFinite(total)) throw new Error(`non-finite sum for ${label}`);
  return total;
}

export interface AgeCohorts {
  age0_19: number | null;
  age15_19: number | null;
  age20_24: number | null;
  age20_34: number | null;
  age25_44: number | null;
  age45_59: number | null;
  age60_64: number | null;
  age65plus: number | null;
  working20_64: number | null;
}

export function ageCohorts2015(row: string[]): AgeCohorts {
  // Recounted five-year bands in the 2015 e-Stat age table.
  const band = (column: number): number | null => finiteNumber(row[column]);
  return {
    age0_19: sumRequired([112, 113, 114, 115].map(band), '2015 age 0-19'),
    age15_19: band(115),
    age20_24: band(116),
    age20_34: sumRequired([116, 117, 118].map(band), '2015 age 20-34'),
    age25_44: sumRequired([117, 118, 119, 120].map(band), '2015 age 25-44'),
    age45_59: sumRequired([121, 122, 123].map(band), '2015 age 45-59'),
    age60_64: band(124),
    age65plus: band(135),
    working20_64: sumRequired([116, 117, 118, 119, 120, 121, 122, 123, 124].map(band), '2015 age 20-64'),
  };
}

export function ageCohorts2010(row: string[]): AgeCohorts {
  // The 2010 table has two additional classification columns before the same
  // recounted five-year bands used in 2015.
  const band = (column: number): number | null => finiteNumber(row[column]);
  return {
    age0_19: sumRequired([114, 115, 116, 117].map(band), '2010 age 0-19'),
    age15_19: band(117),
    age20_24: band(118),
    age20_34: sumRequired([118, 119, 120].map(band), '2010 age 20-34'),
    age25_44: sumRequired([119, 120, 121, 122].map(band), '2010 age 25-44'),
    age45_59: sumRequired([123, 124, 125].map(band), '2010 age 45-59'),
    age60_64: band(126),
    age65plus: band(137),
    working20_64: sumRequired([118, 119, 120, 121, 122, 123, 124, 125, 126].map(band), '2010 age 20-64'),
  };
}

export function ageCohorts2020(row: string[]): AgeCohorts {
  const band = (column: number): number | null => finiteNumber(row[column]);
  return {
    age0_19: sumRequired([10, 11, 12, 13].map(band), '2020 age 0-19'),
    age15_19: band(13),
    age20_24: band(14),
    age20_34: sumRequired([14, 15, 16].map(band), '2020 age 20-34'),
    age25_44: sumRequired([15, 16, 17, 18].map(band), '2020 age 25-44'),
    age45_59: sumRequired([19, 20, 21].map(band), '2020 age 45-59'),
    age60_64: band(22),
    age65plus: band(34),
    working20_64: band(33),
  };
}

function currentComponents(rows: string[][], dataStart: number): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  let currentCode: string | null = null;
  for (const row of rows.slice(dataStart)) {
    const code = row[2];
    const identification = row[3];
    if (isAnalysisUnit(identification, code)) {
      currentCode = code;
      const components = new Set<string>();
      // A populated 2000 boundary-year column means this unit itself existed
      // in 2000 and no historic child row is needed.
      if (row[5] === '2000') components.add(code);
      result.set(code, components);
      continue;
    }
    if (identification === '9' && currentCode !== null && code === currentCode) {
      const oldLocalCode = row[6]?.match(/旧\s*(\d{3,5})/)?.[1];
      if (!oldLocalCode) throw new Error(`cannot parse historic municipality component: ${row[6]}`);
      const component = oldLocalCode.length === 3
        ? currentCode.slice(0, 2) + oldLocalCode
        : oldLocalCode;
      result.get(currentCode)!.add(component);
      continue;
    }
    if (identification !== '9') currentCode = null;
  }
  for (const [code, components] of result) {
    if (components.size === 0) throw new Error(`analysis unit ${code} has no 2000 boundary component`);
  }
  return result;
}

export interface BoundaryCrosswalkRow {
  sourceCode: string;
  targetCode: string;
  operation: 'unchanged' | 'aggregate';
  reason: string;
}

/**
 * Derive a 2010-to-2015 succession map from the official 2000-component rows.
 * A source code that still exists always maps to itself; this resolves the two
 * 2000 municipalities that were split before 2010 and therefore appear as a
 * component of two current units.
 */
export function deriveBoundaryCrosswalk(
  sourceRows: string[][],
  targetRows: string[][],
  dataStart = 10,
): BoundaryCrosswalkRow[] {
  const source = currentComponents(sourceRows, dataStart);
  const target = currentComponents(targetRows, dataStart);
  const owners = new Map<string, Set<string>>();
  for (const [targetCode, components] of target) {
    for (const component of components) {
      const values = owners.get(component) ?? new Set<string>();
      values.add(targetCode);
      owners.set(component, values);
    }
  }

  const rows: BoundaryCrosswalkRow[] = [];
  for (const [sourceCode, components] of source) {
    let targetCode: string;
    if (target.has(sourceCode)) {
      targetCode = sourceCode;
    } else {
      const candidates = new Set<string>();
      for (const component of components) {
        for (const owner of owners.get(component) ?? []) candidates.add(owner);
      }
      if (candidates.size !== 1) {
        throw new Error(
          `source municipality ${sourceCode} has ${candidates.size} target owners: ${[...candidates].join(', ')}`,
        );
      }
      targetCode = [...candidates][0];
    }
    rows.push({
      sourceCode,
      targetCode: codeOn2020Boundary(targetCode),
      operation: codeOn2020Boundary(targetCode) === sourceCode ? 'unchanged' : 'aggregate',
      reason: codeOn2020Boundary(targetCode) === sourceCode
        ? 'same official municipality code'
        : 'official 2000-component succession rows',
    });
  }
  return rows;
}
