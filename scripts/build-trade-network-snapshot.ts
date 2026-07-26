import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { createInterface } from 'node:readline';

import {
  serializeTradeNetworkSnapshot,
  tradeSectorForHs6,
  type ProductTradeEdge,
  type TariffTreatment,
  type TradeNetworkSnapshot,
} from '../src/simulations/trade/network-data.js';

const BACI_URL =
  'https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html';
const CENSUS_URL =
  'https://api.census.gov/data/timeseries/intltrade/imports/hsimport.html';
const CENSUS_ENDPOINT =
  'https://api.census.gov/data/timeseries/intltrade/imports/hsimport';
const CENSUS_HS_ENDPOINT =
  'https://api.census.gov/data/timeseries/intltrade/imports/hs';
const SECTION_122_URL =
  'https://www.whitehouse.gov/wp-content/uploads/2026/02/2026Section122.prc_.ANNEX2_.Final_.pdf';
const TARIFF_NOTICE_URL =
  'https://ustr.gov/sites/default/files/files/Press/Releases/2026/FLIP%20301%20Investigation%20Final%20Action%20FRN%207-23-26%20FINAL.pdf';

interface Country {
  code: string;
  name: string;
  iso3: string;
}

interface RawBaciEdge {
  exporterCode: string;
  hs6: string;
  valueThousand: number;
}

interface RetainedBaciEdge extends RawBaciEdge {
  globalExportsThousand: number;
}

interface CensusHts10Row {
  hts10: string;
  label: string;
  consumptionValue: number;
  calculatedDuty: number;
  dutiableValue: number;
}

type ExemptionScope = 'full' | 'partial';

interface ExemptionEstimate {
  central: number;
  minimum: number;
  maximum: number;
}

interface CensusPreferenceRow {
  hs6: string;
  countrySubcode: string;
  consumptionValue: number;
}

interface Policy {
  treatment: TariffTreatment;
  newRate: number;
  annexParts: readonly string[];
}

const args = new Map(
  process.argv
    .slice(2)
    .map((arg) => {
      const separator = arg.indexOf('=');
      return separator >= 0
        ? [arg.slice(0, separator), arg.slice(separator + 1)]
        : [arg, 'true'];
    }),
);

const baciZip =
  args.get('--baci') ?? '/tmp/BACI_HS22_V202601.zip';
const ustrText =
  args.get('--ustr-text') ??
  '/tmp/forced-labor-301-2026.txt';
const section122Text =
  args.get('--section122-text') ??
  '/tmp/section122-annex2.txt';
const currentPeriod =
  args.get('--current-period') ?? '2026-05';
const mfnPeriod =
  args.get('--mfn-period') ?? '2024-12';
const prePolicyPeriod =
  args.get('--pre-policy-period') ?? '2026-01';
const output =
  args.get('--output') ??
  'data/trade/forced-labor-2026-network.json';
const auditOutput =
  args.get('--audit-output') ??
  'data/trade/forced-labor-2026-network-audit.json';
const envFile =
  args.get('--env') ?? '.env.census.local';
const cacheDirectory =
  args.get('--cache') ??
  '/tmp/tsimulation-census-trade-cache';
const concurrency = Number(args.get('--concurrency') ?? 8);
const edgeFloorMillion = Number(
  args.get('--edge-floor-million') ?? 1,
);

const parseCsvLine = (line: string): string[] => {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
};

const normalizeBaciText = (value: string): string =>
  value.includes('Ã')
    ? Buffer.from(value, 'latin1').toString('utf8')
    : value;

const unzipText = (
  zipPath: string,
  entry: string,
): string =>
  execFileSync('unzip', ['-p', zipPath, entry], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

const streamZipCsv = async (
  zipPath: string,
  entry: string,
  visit: (fields: readonly string[]) => void,
): Promise<void> => {
  const process = spawn('unzip', ['-p', zipPath, entry]);
  let stderr = '';
  process.stderr.setEncoding('utf8');
  process.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  const lines = createInterface({
    input: process.stdout,
    crlfDelay: Infinity,
  });
  let header = true;
  for await (const line of lines) {
    if (header) {
      header = false;
      continue;
    }
    visit(line.split(','));
  }
  const exitCode = await new Promise<number | null>((resolve) => {
    process.on('close', resolve);
  });
  if (exitCode !== 0) {
    throw new Error(
      `Unable to read ${entry} from ${zipPath}: ${stderr}`,
    );
  }
};

const sha256 = async (path: string): Promise<string> => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
};

const loadLocalEnvironment = async (): Promise<void> => {
  if (process.env.CENSUS_API_KEY) return;
  const contents = await readFile(envFile, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(
      /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/,
    );
    if (!match) continue;
    const raw = match[2];
    process.env[match[1]] = raw.replace(
      /^(["'])(.*)\1$/,
      '$2',
    );
  }
  if (!process.env.CENSUS_API_KEY) {
    throw new Error(
      `CENSUS_API_KEY was not found in the environment or ${envFile}`,
    );
  }
};

const chapters = Array.from(
  { length: 99 },
  (_, index) => String(index + 1).padStart(2, '0'),
);

const fetchCensusChapter = async (
  period: string,
  prefix: string,
): Promise<CensusHts10Row[]> => {
  const cachePath = `${cacheDirectory}/${period}-HTS10-${prefix}.json`;
  let payload: unknown;
  try {
    payload = JSON.parse(await readFile(cachePath, 'utf8'));
  } catch {
    const query = new URLSearchParams({
      get:
        'I_COMMODITY,I_COMMODITY_LABEL,COMM_LVL,SUMMARY_LVL2,' +
        'GEN_VAL_YR,CON_VAL_YR,CAL_DUT_YR,DUT_VAL_YR',
      for: 'world:*',
      time: period,
      COMM_LVL: 'HS10',
      SUMMARY_LVL2: 'HS',
      I_COMMODITY: `${prefix}*`,
      key: process.env.CENSUS_API_KEY ?? '',
    });
    let response: Response | undefined;
    let downloadedPayload: unknown;
    let succeeded = false;
    let lastError: unknown;
    const attempts = prefix.length < 6 ? 1 : 2;
    const timeoutMilliseconds =
      prefix.length === 2
        ? 120_000
        : prefix.length === 3
          ? 60_000
          : 30_000;
    for (
      let attempt = 1;
      attempt <= attempts;
      attempt += 1
    ) {
      try {
        response = await fetch(
          `${CENSUS_ENDPOINT}?${query.toString()}`,
          {
            signal: AbortSignal.timeout(
              timeoutMilliseconds,
            ),
          },
        );
        if (response.status === 204) {
          downloadedPayload = [];
          succeeded = true;
          break;
        }
        if (response.ok) {
          downloadedPayload = await response.json();
          succeeded = true;
          break;
        }
        lastError = new Error(
          `Census returned HTTP ${response.status}`,
        );
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, attempt * 1_000),
      );
    }
    if (
      !succeeded &&
      prefix.length < 6
    ) {
      console.warn(
        `Census ${period} prefix ${prefix} timed out; splitting`,
      );
      const children: CensusHts10Row[][] = [];
      for (let digit = 0; digit <= 9; digit += 1) {
        children.push(
          await fetchCensusChapter(
            period,
            `${prefix}${digit}`,
          ),
        );
      }
      const combined = children.flat();
      await mkdir(cacheDirectory, { recursive: true });
      await writeFile(
        cachePath,
        `${JSON.stringify({ parsedRows: combined })}\n`,
      );
      return combined;
    }
    if (!succeeded) {
      throw new Error(
        `Census ${period} prefix ${prefix} failed after retries: ${
          lastError instanceof Error
            ? lastError.message
            : String(lastError)
        }`,
      );
    }
    payload = downloadedPayload;
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(
      cachePath,
      `${JSON.stringify(payload)}\n`,
    );
  }

  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    'parsedRows' in payload
  ) {
    return (
      payload as { parsedRows: CensusHts10Row[] }
    ).parsedRows;
  }
  if (!Array.isArray(payload) || payload.length === 0) {
    return [];
  }
  const rows = payload as string[][];
  const header = rows[0];
  const column = (name: string): number => {
    const index = header.indexOf(name);
    if (index < 0) {
      throw new Error(
        `Census response lacks ${name} for ${period}/${prefix}`,
      );
    }
    return index;
  };
  const hts = column('I_COMMODITY');
  const label = column('I_COMMODITY_LABEL');
  const consumption = column('CON_VAL_YR');
  const duty = column('CAL_DUT_YR');
  const dutiable = column('DUT_VAL_YR');
  const summary = column('SUMMARY_LVL2');
  const level = column('COMM_LVL');

  return rows.slice(1)
    .filter(
      (row) =>
        row[summary] === 'HS' &&
        row[level] === 'HS10' &&
        /^\d{10}$/.test(row[hts]),
    )
    .map((row) => ({
      hts10: row[hts],
      label: row[label],
      consumptionValue: Number(row[consumption]),
      calculatedDuty: Number(row[duty]),
      dutiableValue: Number(row[dutiable]),
    }));
};

const fetchCensusPeriod = async (
  period: string,
): Promise<CensusHts10Row[]> => {
  let cursor = 0;
  let completed = 0;
  const results: CensusHts10Row[][] = [];
  const workers = Array.from(
    { length: Math.max(1, concurrency) },
    async () => {
      while (cursor < chapters.length) {
        const index = cursor;
        cursor += 1;
        const chapter = chapters[index];
        const rows = await fetchCensusChapter(
          period,
          chapter,
        );
        results[index] = rows;
        completed += 1;
        if (
          completed % 10 === 0 ||
          completed === chapters.length
        ) {
          console.log(
            `Census ${period}: ${completed}/${chapters.length} chapters`,
          );
        }
      }
    },
  );
  await Promise.all(workers);
  return results.flat();
};

const fetchCensusSummary = async (
  cacheName: string,
  queryFields: Readonly<Record<string, string>>,
): Promise<string[][]> => {
  const cachePath = `${cacheDirectory}/${cacheName}.json`;
  try {
    return JSON.parse(
      await readFile(cachePath, 'utf8'),
    ) as string[][];
  } catch {
    const query = new URLSearchParams({
      ...queryFields,
      key: process.env.CENSUS_API_KEY ?? '',
    });
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(
          `${CENSUS_HS_ENDPOINT}?${query.toString()}`,
          {
            signal: AbortSignal.timeout(90_000),
          },
        );
        if (!response.ok) {
          throw new Error(
            `Census returned HTTP ${response.status}`,
          );
        }
        const payload = (await response.json()) as string[][];
        await mkdir(cacheDirectory, { recursive: true });
        await writeFile(
          cachePath,
          `${JSON.stringify(payload)}\n`,
        );
        return payload;
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, attempt * 1_000),
      );
    }
    throw new Error(
      `Census summary ${cacheName} failed: ${
        lastError instanceof Error
          ? lastError.message
          : String(lastError)
      }`,
    );
  }
};

const preferenceCountries = new Map<
  string,
  { censusCode: string; qualifyingSubcodes: ReadonlySet<string> }
>([
  [
    'CAN',
    {
      censusCode: '1220',
      qualifyingSubcodes: new Set(['S', 'S+']),
    },
  ],
  [
    'MEX',
    {
      censusCode: '2010',
      qualifyingSubcodes: new Set(['S', 'S+']),
    },
  ],
  [
    'GTM',
    {
      censusCode: '2050',
      qualifyingSubcodes: new Set(['P']),
    },
  ],
  [
    'SLV',
    {
      censusCode: '2110',
      qualifyingSubcodes: new Set(['P']),
    },
  ],
  [
    'HND',
    {
      censusCode: '2150',
      qualifyingSubcodes: new Set(['P']),
    },
  ],
  [
    'NIC',
    {
      censusCode: '2190',
      qualifyingSubcodes: new Set(['P']),
    },
  ],
  [
    'CRI',
    {
      censusCode: '2230',
      qualifyingSubcodes: new Set(['P']),
    },
  ],
  [
    'DOM',
    {
      censusCode: '2470',
      qualifyingSubcodes: new Set(['P']),
    },
  ],
]);

const fetchPreferenceShares = async (
  period: string,
): Promise<{
  byCountryProduct: ReadonlyMap<string, number>;
  byCountry: ReadonlyMap<string, number>;
}> => {
  const byCountryProduct = new Map<string, number>();
  const byCountry = new Map<string, number>();
  for (const [iso3, config] of preferenceCountries) {
    const payload = await fetchCensusSummary(
      `${period}-HSCYCS-${config.censusCode}-HS6`,
      {
        get:
          'I_COMMODITY,CTY_CODE,CTY_SUBCODE,CON_VAL_YR,' +
          'COMM_LVL,SUMMARY_LVL2',
        time: period,
        CTY_CODE: config.censusCode,
        SUMMARY_LVL2: 'HSCYCS',
        COMM_LVL: 'HS6',
      },
    );
    const header = payload[0] ?? [];
    const hs6 = header.indexOf('I_COMMODITY');
    const subcode = header.indexOf('CTY_SUBCODE');
    const value = header.indexOf('CON_VAL_YR');
    if (hs6 < 0 || subcode < 0 || value < 0) {
      throw new Error(
        `Census preference response for ${iso3} lacks required fields`,
      );
    }
    const totals = new Map<
      string,
      { total: number; qualifying: number }
    >();
    let countryTotal = 0;
    let countryQualifying = 0;
    for (const row of payload.slice(1)) {
      const consumptionValue = Number(row[value]);
      if (
        !/^\d{6}$/.test(row[hs6]) ||
        !Number.isFinite(consumptionValue)
      ) {
        continue;
      }
      const aggregate = totals.get(row[hs6]) ?? {
        total: 0,
        qualifying: 0,
      };
      aggregate.total += consumptionValue;
      countryTotal += consumptionValue;
      if (config.qualifyingSubcodes.has(row[subcode])) {
        aggregate.qualifying += consumptionValue;
        countryQualifying += consumptionValue;
      }
      totals.set(row[hs6], aggregate);
    }
    for (const [product, aggregate] of totals) {
      byCountryProduct.set(
        `${iso3}|${product}`,
        aggregate.total > 0
          ? aggregate.qualifying / aggregate.total
          : 0,
      );
    }
    byCountry.set(
      iso3,
      countryTotal > 0
        ? countryQualifying / countryTotal
        : 0,
    );
  }
  return { byCountryProduct, byCountry };
};

const fetchPrePolicyChapter99Shares = async (
  period: string,
): Promise<ReadonlyMap<string, number>> => {
  const payload = await fetchCensusSummary(
    `${period}-HSRP-HS6`,
    {
      get:
        'I_COMMODITY,RP,CON_VAL_YR,COMM_LVL,SUMMARY_LVL2',
      time: period,
      SUMMARY_LVL2: 'HSRP',
      COMM_LVL: 'HS6',
    },
  );
  const header = payload[0] ?? [];
  const hs6 = header.indexOf('I_COMMODITY');
  const rateProvision = header.indexOf('RP');
  const value = header.indexOf('CON_VAL_YR');
  if (hs6 < 0 || rateProvision < 0 || value < 0) {
    throw new Error(
      'Census pre-policy rate-provision response lacks required fields',
    );
  }
  const totals = new Map<
    string,
    { total: number; chapter99Duty: number }
  >();
  for (const row of payload.slice(1)) {
    const consumptionValue = Number(row[value]);
    if (
      !/^\d{6}$/.test(row[hs6]) ||
      !Number.isFinite(consumptionValue)
    ) {
      continue;
    }
    const aggregate = totals.get(row[hs6]) ?? {
      total: 0,
      chapter99Duty: 0,
    };
    aggregate.total += consumptionValue;
    if (row[rateProvision] === '69') {
      aggregate.chapter99Duty += consumptionValue;
    }
    totals.set(row[hs6], aggregate);
  }
  return new Map(
    [...totals.entries()].map(([product, aggregate]) => [
      product,
      aggregate.total > 0
        ? aggregate.chapter99Duty / aggregate.total
        : 0,
    ]),
  );
};

const mergeScope = (
  current: ExemptionScope | undefined,
  next: ExemptionScope,
): ExemptionScope =>
  current === 'full' || next === 'full'
    ? 'full'
    : 'partial';

const parseAnnexExemptions = (
  text: string,
): ReadonlyMap<string, ReadonlyMap<string, ExemptionScope>> => {
  const annex = text.indexOf('ANNEX II');
  if (annex < 0) {
    throw new Error('ANNEX II was not found in USTR text');
  }
  const titles: readonly [string, string][] = [
    ['A', 'Part A. Goods of Any Investigated Economy'],
    ['B', 'Part B. Goods of the United Kingdom'],
    [
      'C',
      'Part C. Goods of Any Member State of the European Union',
    ],
    ['D', 'Part D. Goods of Switzerland'],
    ['E', 'Part E. Goods of Malaysia'],
    ['F', 'Part F. Goods of Cambodia'],
    [
      'G',
      'Part G. Goods of Guatemala (see Part O for Textile and Apparel Goods)',
    ],
    [
      'H',
      'Part H. Goods of El Salvador (see Part O for Textile and Apparel Goods)',
    ],
    ['I', 'Part I. Goods of Argentina'],
    ['J', 'Part J. Goods of Bangladesh'],
    ['K', 'Part K. Goods of Taiwan'],
    ['L', 'Part L. Goods of Indonesia'],
    ['M', 'Part M. Goods of Ecuador'],
    [
      'N',
      'Part N. Goods of Jordan (see Part O for Textile and Apparel Goods)',
    ],
    [
      'O',
      'Part O. Textile and Apparel Goods of (i) Jordan or (ii) El Salvador or Guatemala',
    ],
  ];

  const tableOfContentsA = text.indexOf(titles[0][1], annex);
  let currentStart = text.indexOf(
    titles[0][1],
    tableOfContentsA + titles[0][1].length,
  );
  if (currentStart < 0) {
    throw new Error('Could not locate Annex II Part A table');
  }

  const parts = new Map<
    string,
    ReadonlyMap<string, ExemptionScope>
  >();
  for (let index = 0; index < titles.length; index += 1) {
    const [letter] = titles[index];
    const nextTitle = titles[index + 1]?.[1];
    const nextStart = nextTitle
      ? text.indexOf(nextTitle, currentStart + 1)
      : text.length;
    if (nextStart < 0) {
      throw new Error(
        `Could not locate Annex II Part ${titles[index + 1]?.[0]}`,
      );
    }
    const partText = text.slice(currentStart, nextStart);
    const matches = [
      ...partText.matchAll(
        /\b(\d{4}\.\d{2}\.\d{2})\b/g,
      ),
    ];
    const scopes = new Map<string, ExemptionScope>();
    for (
      let matchIndex = 0;
      matchIndex < matches.length;
      matchIndex += 1
    ) {
      const match = matches[matchIndex];
      const segment = partText.slice(
        match.index,
        matches[matchIndex + 1]?.index ??
          partText.length,
      );
      const scope: ExemptionScope =
        /\b(?:Ex|Aircraft|Pharma)\b/.test(segment)
          ? 'partial'
          : 'full';
      const code = match[1].replace(/\./g, '');
      scopes.set(
        code,
        mergeScope(scopes.get(code), scope),
      );
    }
    parts.set(letter, scopes);
    currentStart = nextStart;
  }
  return parts;
};

const parseSingleAnnexExemptions = (
  text: string,
): ReadonlyMap<string, ExemptionScope> => {
  const annex = text.indexOf('ANNEX II');
  if (annex < 0) {
    throw new Error(
      'ANNEX II was not found in the Section 122 text',
    );
  }
  const annexText = text.slice(annex);
  const matches = [
    ...annexText.matchAll(/\b(\d{4}\.\d{2}\.\d{2})\b/g),
  ];
  const scopes = new Map<string, ExemptionScope>();
  for (
    let matchIndex = 0;
    matchIndex < matches.length;
    matchIndex += 1
  ) {
    const match = matches[matchIndex];
    const segment = annexText.slice(
      match.index,
      matches[matchIndex + 1]?.index ?? annexText.length,
    );
    const scope: ExemptionScope =
      /\b(?:Ex|Aircraft|Pharma)\b/.test(segment)
        ? 'partial'
        : 'full';
    const code = match[1].replace(/\./g, '');
    scopes.set(code, mergeScope(scopes.get(code), scope));
  }
  return scopes;
};

const unionExemptionEstimates = (
  ...estimates: readonly ExemptionEstimate[]
): ExemptionEstimate => {
  const union = (
    values: readonly number[],
  ): number =>
    1 -
    values.reduce(
      (taxable, exemption) =>
        taxable * (1 - exemption),
      1,
    );
  return {
    central: union(
      estimates.map((estimate) => estimate.central),
    ),
    minimum: union(
      estimates.map((estimate) => estimate.minimum),
    ),
    maximum: union(
      estimates.map((estimate) => estimate.maximum),
    ),
  };
};

const isCaftaTextileProduct = (hs6: string): boolean => {
  const chapter = Number(hs6.slice(0, 2));
  return chapter === 42 || (chapter >= 50 && chapter <= 63);
};

const isExistingMeasureCandidate = (
  hs6: string,
): boolean => {
  const chapter = Number(hs6.slice(0, 2));
  return (
    chapter === 72 ||
    chapter === 73 ||
    chapter === 74 ||
    chapter === 76 ||
    chapter === 87 ||
    hs6.startsWith('4403') ||
    hs6.startsWith('4407') ||
    hs6.startsWith('4412') ||
    hs6.startsWith('8541') ||
    hs6.startsWith('8542') ||
    hs6.startsWith('9401') ||
    hs6.startsWith('9403')
  );
};

const eu = new Set([
  'AUT',
  'BEL',
  'BGR',
  'HRV',
  'CYP',
  'CZE',
  'DNK',
  'EST',
  'FIN',
  'FRA',
  'DEU',
  'GRC',
  'HUN',
  'IRL',
  'ITA',
  'LVA',
  'LTU',
  'LUX',
  'MLT',
  'NLD',
  'POL',
  'PRT',
  'ROU',
  'SVK',
  'SVN',
  'ESP',
  'SWE',
]);

const tenPercent = new Set([
  'ARG',
  'BGD',
  'KHM',
  'CAN',
  'ECU',
  'SLV',
  'GTM',
  'HND',
  'IND',
  'IDN',
  'JOR',
  'MYS',
  'MEX',
  'PAK',
  'LKA',
  'TTO',
  'GBR',
]);

const twelveFivePercent = new Set([
  'DZA',
  'AGO',
  'AUS',
  'BHS',
  'BHR',
  'BRA',
  'CHL',
  'CHN',
  'COL',
  'CRI',
  'DOM',
  'EGY',
  'GUY',
  'HKG',
  'IRQ',
  'ISR',
  'KAZ',
  'KWT',
  'LBY',
  'MAR',
  'NZL',
  'NIC',
  'NGA',
  'NOR',
  'OMN',
  'PER',
  'PHL',
  'QAT',
  'RUS',
  'SAU',
  'SGP',
  'ZAF',
  'THA',
  'TUR',
  'ARE',
  'URY',
  'VEN',
  'VNM',
]);

const capTwelveFive = new Set([
  'JPN',
  'KOR',
  'CHE',
]);

const specialParts = new Map<string, readonly string[]>([
  ['ARG', ['I']],
  ['BGD', ['J']],
  ['KHM', ['F']],
  ['ECU', ['M']],
  ['SLV', ['H']],
  ['GTM', ['G']],
  ['IDN', ['L']],
  ['JOR', ['N', 'O']],
  ['MYS', ['E']],
  ['CHE', ['D']],
  ['TWN', ['K']],
  ['GBR', ['B']],
]);

const policyFor = (
  iso3: string,
  baselineMfnRate: number,
): Policy => {
  const annexParts = [
    'A',
    ...(specialParts.get(iso3) ?? []),
  ];
  if (eu.has(iso3)) {
    return {
      treatment: 'mfn-cap-ten',
      newRate: Math.max(0, 0.10 - baselineMfnRate),
      annexParts: [...annexParts, 'C'],
    };
  }
  if (iso3 === 'TWN') {
    return {
      treatment: 'mfn-cap-ten',
      newRate: Math.max(0, 0.10 - baselineMfnRate),
      annexParts,
    };
  }
  if (capTwelveFive.has(iso3)) {
    return {
      treatment: 'mfn-cap-twelve-five',
      newRate: Math.max(0, 0.125 - baselineMfnRate),
      annexParts,
    };
  }
  if (tenPercent.has(iso3)) {
    return {
      treatment: 'ten-percent',
      newRate: 0.10,
      annexParts,
    };
  }
  if (twelveFivePercent.has(iso3)) {
    return {
      treatment: 'twelve-five-percent',
      newRate: 0.125,
      annexParts,
    };
  }
  return {
    treatment: 'outside-investigation',
    newRate: 0,
    annexParts: [],
  };
};

const round = (value: number, digits = 9): number =>
  Number(value.toFixed(digits));

await loadLocalEnvironment();
await mkdir(dirname(output), { recursive: true });
await mkdir(dirname(auditOutput), { recursive: true });

console.log(`Reading ${basename(baciZip)} metadata`);
const countries = new Map<string, Country>();
for (const line of unzipText(
  baciZip,
  'country_codes_V202601.csv',
).split(/\r?\n/).slice(1)) {
  if (!line) continue;
  const [code, name, , iso3] = parseCsvLine(line);
  countries.set(code, {
    code,
    name: normalizeBaciText(name),
    iso3: code === '490' ? 'TWN' : iso3 || `BACI-${code}`,
  });
}
const productLabels = new Map<string, string>();
for (const line of unzipText(
  baciZip,
  'product_codes_HS22_V202601.csv',
).split(/\r?\n/).slice(1)) {
  if (!line) continue;
  const [code, description] = parseCsvLine(line);
  productLabels.set(code, normalizeBaciText(description));
}

const baciEntry = 'BACI_HS22_Y2024_V202601.csv';
const allUsEdges: RawBaciEdge[] = [];
const productBaciTotals = new Map<string, number>();
let baciUsTotalThousand = 0;
console.log(`Reading U.S. edges from ${baciEntry}`);
await streamZipCsv(baciZip, baciEntry, (fields) => {
  const [, exporter, importer, hs6, rawValue] = fields;
  if (importer !== '842') return;
  const valueThousand = Number(rawValue);
  allUsEdges.push({
    exporterCode: exporter,
    hs6,
    valueThousand,
  });
  baciUsTotalThousand += valueThousand;
  productBaciTotals.set(
    hs6,
    (productBaciTotals.get(hs6) ?? 0) +
      valueThousand,
  );
});

const edgesByProduct = new Map<string, RawBaciEdge[]>();
for (const edge of allUsEdges) {
  const rows = edgesByProduct.get(edge.hs6) ?? [];
  rows.push(edge);
  edgesByProduct.set(edge.hs6, rows);
}
const retainedRaw: RawBaciEdge[] = [];
for (const rows of edgesByProduct.values()) {
  rows.sort((a, b) => b.valueThousand - a.valueThousand);
  rows.forEach((edge, index) => {
    if (
      edge.valueThousand >= edgeFloorMillion * 1_000 ||
      index < 3
    ) {
      retainedRaw.push(edge);
    }
  });
}
const retainedPairs = new Set(
  retainedRaw.map(
    (edge) => `${edge.exporterCode}|${edge.hs6}`,
  ),
);
const globalExports = new Map<string, number>();
console.log(
  `Measuring global same-product supply for ${retainedPairs.size} retained edges`,
);
await streamZipCsv(baciZip, baciEntry, (fields) => {
  const [, exporter, , hs6, rawValue] = fields;
  const key = `${exporter}|${hs6}`;
  if (!retainedPairs.has(key)) return;
  globalExports.set(
    key,
    (globalExports.get(key) ?? 0) + Number(rawValue),
  );
});
const retainedBaciEdges: RetainedBaciEdge[] =
  retainedRaw.map((edge) => ({
    ...edge,
    globalExportsThousand:
      globalExports.get(
        `${edge.exporterCode}|${edge.hs6}`,
      ) ?? edge.valueThousand,
  }));
const retainedBaciValue = retainedBaciEdges.reduce(
  (total, edge) => total + edge.valueThousand,
  0,
);

const noticeText = await readFile(ustrText, 'utf8');
const oldTariffText = await readFile(section122Text, 'utf8');
const newAnnexParts = parseAnnexExemptions(noticeText);
const oldAnnexExemptions =
  parseSingleAnnexExemptions(oldTariffText);
console.log(
  `Parsed USTR exemptions: ${[...newAnnexParts.entries()]
    .map(([part, codes]) => `${part}=${codes.size}`)
    .join(', ')}`,
);
console.log(
  `Parsed ${oldAnnexExemptions.size} Section 122 exemption codes`,
);

console.log(
  `Fetching Census HTS10, preference, and pre-policy rate-provision data`,
);
const [
  currentRows,
  mfnRows,
  preferenceShares,
  prePolicyChapter99Shares,
] = await Promise.all([
  fetchCensusPeriod(currentPeriod),
  fetchCensusPeriod(mfnPeriod),
  fetchPreferenceShares(currentPeriod),
  fetchPrePolicyChapter99Shares(prePolicyPeriod),
]);

const currentByHs6 = new Map<string, CensusHts10Row[]>();
for (const row of currentRows) {
  const hs6 = row.hts10.slice(0, 6);
  const rows = currentByHs6.get(hs6) ?? [];
  rows.push(row);
  currentByHs6.set(hs6, rows);
}
const mfnByHs6 = new Map<
  string,
  { value: number; duty: number }
>();
for (const row of mfnRows) {
  const hs6 = row.hts10.slice(0, 6);
  const aggregate = mfnByHs6.get(hs6) ?? {
    value: 0,
    duty: 0,
  };
  aggregate.value += row.consumptionValue;
  aggregate.duty += row.calculatedDuty;
  mfnByHs6.set(hs6, aggregate);
}

const exemptionCache = new Map<string, ExemptionEstimate>();
const exemptionEstimateFor = (
  hs6: string,
  cacheKey: string,
  scopeFor: (hts8: string) => ExemptionScope | undefined,
): ExemptionEstimate => {
  const fullCacheKey = `${hs6}|${cacheKey}`;
  const cached = exemptionCache.get(fullCacheKey);
  if (cached) return cached;
  const rows = currentByHs6.get(hs6) ?? [];
  const total = rows.reduce(
    (value, row) => value + row.consumptionValue,
    0,
  );
  if (total <= 0) {
    const estimate = {
      central: 0,
      minimum: 0,
      maximum: 0,
    };
    exemptionCache.set(fullCacheKey, estimate);
    return estimate;
  }
  let central = 0;
  let minimum = 0;
  let maximum = 0;
  for (const row of rows) {
    const hts8 = row.hts10.slice(0, 8);
    const scope = scopeFor(hts8);
    if (scope === 'full') {
      central += row.consumptionValue;
      minimum += row.consumptionValue;
      maximum += row.consumptionValue;
    } else if (scope === 'partial') {
      central += row.consumptionValue * 0.5;
      maximum += row.consumptionValue;
    }
  }
  const estimate = {
    central: central / total,
    minimum: minimum / total,
    maximum: maximum / total,
  };
  exemptionCache.set(fullCacheKey, estimate);
  return estimate;
};

const newExemptionFor = (
  hs6: string,
  parts: readonly string[],
): ExemptionEstimate => {
  if (parts.length === 0) {
    return { central: 0, minimum: 0, maximum: 0 };
  }
  return exemptionEstimateFor(
    hs6,
    `new-${parts.join('')}`,
    (hts8) => {
      let scope: ExemptionScope | undefined;
      for (const part of parts) {
        const candidate =
          newAnnexParts.get(part)?.get(hts8);
        if (candidate) {
          scope = mergeScope(scope, candidate);
        }
      }
      return scope;
    },
  );
};

const oldExemptionFor = (
  hs6: string,
): ExemptionEstimate =>
  exemptionEstimateFor(
    hs6,
    'section-122',
    (hts8) => oldAnnexExemptions.get(hts8),
  );

const preferenceExemptionFor = (
  iso3: string,
  hs6: string,
): ExemptionEstimate => {
  const isUsmca = iso3 === 'CAN' || iso3 === 'MEX';
  const isCafta =
    preferenceCountries.has(iso3) &&
    !isUsmca &&
    isCaftaTextileProduct(hs6);
  if (!isUsmca && !isCafta) {
    return { central: 0, minimum: 0, maximum: 0 };
  }
  const share =
    preferenceShares.byCountryProduct.get(
      `${iso3}|${hs6}`,
    ) ??
    preferenceShares.byCountry.get(iso3) ??
    0;
  return {
    central: share,
    minimum: share,
    maximum: share,
  };
};

const existingMeasureExemptionFor = (
  hs6: string,
): ExemptionEstimate => {
  if (!isExistingMeasureCandidate(hs6)) {
    return { central: 0, minimum: 0, maximum: 0 };
  }
  const share = prePolicyChapter99Shares.get(hs6) ?? 0;
  return {
    central: share,
    minimum: share * 0.75,
    maximum: Math.min(1, share * 1.25),
  };
};

const currentMonths = Number(currentPeriod.slice(5, 7));
const annualization = 12 / currentMonths;
const currentProductAnnual = new Map<string, number>();
for (const [hs6, rows] of currentByHs6) {
  currentProductAnnual.set(
    hs6,
    rows.reduce(
      (total, row) => total + row.consumptionValue,
      0,
    ) *
      annualization /
      1e9,
  );
}

const retainedByProduct = new Map<
  string,
  RetainedBaciEdge[]
>();
for (const edge of retainedBaciEdges) {
  const rows = retainedByProduct.get(edge.hs6) ?? [];
  rows.push(edge);
  retainedByProduct.set(edge.hs6, rows);
}

const networkEdges: ProductTradeEdge[] = [];
let currentMatchedBaciBillion = 0;
for (const [hs6, rows] of retainedByProduct) {
  const retainedProductThousand = rows.reduce(
    (total, edge) => total + edge.valueThousand,
    0,
  );
  const baciProductBillion =
    (productBaciTotals.get(hs6) ?? retainedProductThousand) /
    1e6;
  const currentAnnualBillion =
    currentProductAnnual.get(hs6);
  const productAnnualBillion =
    currentAnnualBillion ?? baciProductBillion;
  if (currentAnnualBillion !== undefined) {
    currentMatchedBaciBillion += baciProductBillion;
  }
  const mfn = mfnByHs6.get(hs6);
  const baselineMfnRate = Math.min(
    0.25,
    mfn && mfn.value > 0 ? mfn.duty / mfn.value : 0,
  );

  for (const raw of rows) {
    const country = countries.get(raw.exporterCode);
    if (!country) {
      throw new Error(
        `BACI country ${raw.exporterCode} is missing metadata`,
      );
    }
    const policy = policyFor(
      country.iso3,
      baselineMfnRate,
    );
    const preferenceExemption = preferenceExemptionFor(
      country.iso3,
      hs6,
    );
    const existingMeasureExemption =
      existingMeasureExemptionFor(hs6);
    const oldExemption = unionExemptionEstimates(
      oldExemptionFor(hs6),
      preferenceExemption,
      existingMeasureExemption,
    );
    const newExemption = unionExemptionEstimates(
      newExemptionFor(hs6, policy.annexParts),
      preferenceExemption,
      existingMeasureExemption,
    );
    const share = raw.valueThousand / retainedProductThousand;
    const annualImportBillion =
      productAnnualBillion * share;
    const productScale =
      productAnnualBillion /
      Math.max(baciProductBillion, 1e-12);
    const nonUsExportsBillion =
      Math.max(
        0,
        raw.globalExportsThousand - raw.valueThousand,
      ) /
      1e6 *
      productScale;
    const covered =
      policy.treatment !== 'outside-investigation';
    const roundedAnnualImportBillion = round(
      annualImportBillion,
    );
    if (roundedAnnualImportBillion <= 0) continue;
    networkEdges.push({
      exporterIso3: country.iso3,
      exporterName:
        country.iso3 === 'TWN'
          ? 'Taiwan (BACI Other Asia, nes proxy)'
          : country.name,
      hs6,
      productLabel:
        productLabels.get(hs6) ?? `HS ${hs6}`,
      sector: tradeSectorForHs6(hs6),
      annualImportBillion: roundedAnnualImportBillion,
      nonUsExportsBillion: round(nonUsExportsBillion),
      baselineMfnRate: round(baselineMfnRate),
      oldTaxableShare: round(1 - oldExemption.central),
      oldTaxableShareLow: round(
        1 - oldExemption.maximum,
      ),
      oldTaxableShareHigh: round(
        1 - oldExemption.minimum,
      ),
      newTaxableShare: round(
        covered ? 1 - newExemption.central : 0,
      ),
      newTaxableShareLow: round(
        covered ? 1 - newExemption.maximum : 0,
      ),
      newTaxableShareHigh: round(
        covered ? 1 - newExemption.minimum : 0,
      ),
      oldAdditionalTariffRate: 0.10,
      newAdditionalTariffRate: round(policy.newRate),
      treatment: policy.treatment,
    });
  }
}

const totalImportsBillion = networkEdges.reduce(
  (total, edge) => total + edge.annualImportBillion,
  0,
);
const byTreatment = Object.fromEntries(
  [
    'outside-investigation',
    'ten-percent',
    'twelve-five-percent',
    'mfn-cap-ten',
    'mfn-cap-twelve-five',
  ].map((treatment) => [
    treatment,
    networkEdges
      .filter((edge) => edge.treatment === treatment)
      .reduce(
        (total, edge) => total + edge.annualImportBillion,
        0,
      ),
  ]),
);
const taxable = (
  field:
    | 'oldTaxableShareLow'
    | 'oldTaxableShare'
    | 'oldTaxableShareHigh'
    | 'newTaxableShareLow'
    | 'newTaxableShare'
    | 'newTaxableShareHigh',
): number =>
  networkEdges.reduce(
    (total, edge) =>
      total + edge.annualImportBillion * edge[field],
    0,
  );

const snapshot: TradeNetworkSnapshot = {
  metadata: {
    id: 'us-forced-labor-301-2026',
    label:
      'U.S. HS6 import network for the July 2026 forced-labor Section 301 action',
    importerIso3: 'USA',
    tradeFlowYear: 2024,
    currentFlowPeriod: currentPeriod,
    currentFlowMonths: currentMonths,
    baciVersion: '202601',
    hsRevision: 'HS22',
    edgeFloorMillion,
    retainedBaciValueShare: round(
      retainedBaciValue / baciUsTotalThousand,
    ),
    currentValueCoverageShare: round(
      currentMatchedBaciBillion /
        (baciUsTotalThousand / 1e6),
    ),
    exemptionValuation:
      'HTS10-world-composition-plus-HS6-entry-preferences',
    sharedExistingMeasureValuation:
      'January-2026-HS6-Chapter99-share',
    sourceUrls: {
      baci: BACI_URL,
      census: CENSUS_URL,
      section122Tariff: SECTION_122_URL,
      tariffNotice: TARIFF_NOTICE_URL,
    },
  },
  edges: networkEdges,
};
const sourceHashes = {
  baciZipSha256: await sha256(baciZip),
  section122AnnexSha256: await sha256(section122Text),
  ustrTextSha256: await sha256(ustrText),
};
const serializedSnapshot = serializeTradeNetworkSnapshot(
  snapshot,
  sourceHashes,
);

const audit = {
  schemaVersion: 2,
  generatedFrom: {
    baciZip: basename(baciZip),
    baciEntry,
    ustrText: basename(ustrText),
    section122Text: basename(section122Text),
    currentPeriod,
    mfnPeriod,
    prePolicyPeriod,
    censusHts10Rows: currentRows.length,
    mfnHts10Rows: mfnRows.length,
  },
  graph: {
    edges: networkEdges.length,
    products: new Set(
      networkEdges.map((edge) => edge.hs6),
    ).size,
    exporters: new Set(
      networkEdges.map((edge) => edge.exporterIso3),
    ).size,
    totalImportsBillion: round(totalImportsBillion, 6),
    retainedBaciValueShare:
      snapshot.metadata.retainedBaciValueShare,
    currentValueCoverageShare:
      snapshot.metadata.currentValueCoverageShare,
  },
  policy: {
    investigatedTradeShare: round(
      1 -
        (byTreatment['outside-investigation'] ?? 0) /
          totalImportsBillion,
    ),
    tradeByTreatmentBillion: Object.fromEntries(
      Object.entries(byTreatment).map(([key, value]) => [
        key,
        round(value, 6),
      ]),
    ),
    oldTaxableImportsBillion: {
      low: round(taxable('oldTaxableShareLow'), 6),
      central: round(taxable('oldTaxableShare'), 6),
      high: round(taxable('oldTaxableShareHigh'), 6),
    },
    oldTaxableShare: {
      low: round(
        taxable('oldTaxableShareLow') /
          totalImportsBillion,
      ),
      central: round(
        taxable('oldTaxableShare') /
          totalImportsBillion,
      ),
      high: round(
        taxable('oldTaxableShareHigh') /
          totalImportsBillion,
      ),
    },
    newTaxableImportsBillion: {
      low: round(taxable('newTaxableShareLow'), 6),
      central: round(taxable('newTaxableShare'), 6),
      high: round(taxable('newTaxableShareHigh'), 6),
    },
    newTaxableShare: {
      low: round(
        taxable('newTaxableShareLow') /
          totalImportsBillion,
      ),
      central: round(
        taxable('newTaxableShare') /
          totalImportsBillion,
      ),
      high: round(
        taxable('newTaxableShareHigh') /
          totalImportsBillion,
      ),
    },
    preferenceUtilizationByCountry:
      Object.fromEntries(
        [...preferenceShares.byCountry.entries()].map(
          ([iso3, share]) => [iso3, round(share, 6)],
        ),
      ),
    section122AnnexCodeCount:
      oldAnnexExemptions.size,
    annexCodeCounts: Object.fromEntries(
      [...newAnnexParts.entries()].map(([part, codes]) => [
        part,
        codes.size,
      ]),
    ),
  },
};

await writeFile(
  output,
  `${JSON.stringify(serializedSnapshot)}\n`,
);
await writeFile(
  auditOutput,
  `${JSON.stringify(audit, null, 2)}\n`,
);
console.log(
  `Wrote ${networkEdges.length} edges to ${output}`,
);
console.log(JSON.stringify(audit, null, 2));
