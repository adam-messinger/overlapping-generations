import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';

interface ImportTotals {
  allThousand: number;
  chinaThousand: number;
}

interface CalibrationGroup {
  id: string;
  label: string;
  chapters: ReadonlySet<string>;
  deliveredPriceShock: number;
}

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const separator = arg.indexOf('=');
    return separator >= 0
      ? [arg.slice(0, separator), arg.slice(separator + 1)]
      : [arg, 'true'];
  }),
);

const baciZip =
  args.get('--baci') ?? '/tmp/BACI_HS17_V202601.zip';
const output =
  args.get('--output') ??
  'data/trade/trade-diversion-calibration.json';

const groups: readonly CalibrationGroup[] = [
  {
    id: 'training-lists-1-2-proxy',
    label:
      'Electrical and mechanical equipment (2018 Lists 1/2 proxy)',
    chapters: new Set(['84', '85']),
    // A 25% statutory tariff with the model's 80% pass-through.
    deliveredPriceShock: 0.20,
  },
  {
    id: 'holdout-list-3-proxy',
    label:
      'Plastics, textiles, furniture, and toys (List 3 proxy)',
    chapters: new Set(['39', '63', '94', '95']),
    // Approximate 2019 annual incidence as List 3 moved from 10% to 25%.
    deliveredPriceShock: 0.15,
  },
];

const streamBaciYear = async (
  year: 2017 | 2019,
): Promise<ReadonlyMap<string, ImportTotals>> => {
  const entry = `BACI_HS17_Y${year}_V202601.csv`;
  const child = spawn('unzip', ['-p', baciZip, entry]);
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  const totals = new Map<string, ImportTotals>(
    groups.map((group) => [
      group.id,
      { allThousand: 0, chinaThousand: 0 },
    ]),
  );
  const lines = createInterface({
    input: child.stdout,
    crlfDelay: Infinity,
  });
  let header = true;
  for await (const line of lines) {
    if (header) {
      header = false;
      continue;
    }
    const [, exporter, importer, hs6, rawValue] =
      line.split(',');
    if (importer !== '842') continue;
    const valueThousand = Number(rawValue);
    const chapter = hs6.slice(0, 2);
    for (const group of groups) {
      if (!group.chapters.has(chapter)) continue;
      const aggregate = totals.get(group.id);
      if (!aggregate) continue;
      aggregate.allThousand += valueThousand;
      if (exporter === '156') {
        aggregate.chinaThousand += valueThousand;
      }
    }
  }
  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('close', resolve);
  });
  if (exitCode !== 0) {
    throw new Error(
      `Unable to read ${entry} from ${baciZip}: ${stderr}`,
    );
  }
  return totals;
};

const share = (totals: ImportTotals): number =>
  totals.chinaThousand / totals.allThousand;

const impliedElasticity = (
  beforeShare: number,
  afterShare: number,
  deliveredPriceShock: number,
): number =>
  -Math.log(
    (afterShare / (1 - afterShare)) /
      (beforeShare / (1 - beforeShare)),
  ) / Math.log(1 + deliveredPriceShock);

const predictShare = (
  beforeShare: number,
  deliveredPriceShock: number,
  elasticity: number,
): number => {
  const treatedWeight =
    beforeShare *
    Math.pow(1 + deliveredPriceShock, -elasticity);
  return treatedWeight / (treatedWeight + 1 - beforeShare);
};

const sha256 = async (path: string): Promise<string> => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
};

console.log('Reading 2017 and 2019 BACI U.S. import edges');
const [before, after] = await Promise.all([
  streamBaciYear(2017),
  streamBaciYear(2019),
]);
const training = groups[0];
const trainingBefore = share(
  before.get(training.id) as ImportTotals,
);
const trainingAfter = share(
  after.get(training.id) as ImportTotals,
);
const fittedElasticity = impliedElasticity(
  trainingBefore,
  trainingAfter,
  training.deliveredPriceShock,
);
const selectedElasticity =
  Math.round(fittedElasticity * 10) / 10;

const groupResults = groups.map((group) => {
  const beforeTotals = before.get(group.id) as ImportTotals;
  const afterTotals = after.get(group.id) as ImportTotals;
  const beforeShare = share(beforeTotals);
  const observedAfterShare = share(afterTotals);
  const predictedAfterShare = predictShare(
    beforeShare,
    group.deliveredPriceShock,
    selectedElasticity,
  );
  const noDiversionAbsoluteError = Math.abs(
    beforeShare - observedAfterShare,
  );
  const networkAbsoluteError = Math.abs(
    predictedAfterShare - observedAfterShare,
  );
  return {
    id: group.id,
    label: group.label,
    chapters: [...group.chapters],
    deliveredPriceShock: group.deliveredPriceShock,
    before: {
      year: 2017,
      totalUsImportsBillion:
        beforeTotals.allThousand / 1e6,
      chinaImportsBillion:
        beforeTotals.chinaThousand / 1e6,
      chinaSupplierShare: beforeShare,
    },
    after: {
      year: 2019,
      totalUsImportsBillion:
        afterTotals.allThousand / 1e6,
      chinaImportsBillion:
        afterTotals.chinaThousand / 1e6,
      chinaSupplierShare: observedAfterShare,
    },
    impliedElasticity: impliedElasticity(
      beforeShare,
      observedAfterShare,
      group.deliveredPriceShock,
    ),
    prediction: {
      selectedElasticity,
      chinaSupplierShare: predictedAfterShare,
      absoluteError: networkAbsoluteError,
      noDiversionAbsoluteError,
      absoluteErrorImprovement:
        noDiversionAbsoluteError > 0
          ? 1 -
            networkAbsoluteError /
              noDiversionAbsoluteError
          : 0,
    },
  };
});

const calibration = {
  schemaVersion: 1,
  model: 'same-product Armington supplier substitution',
  fittedOn: training.id,
  fittedElasticity,
  selectedElasticity,
  recommendedSensitivityRange: [1, 2],
  groups: groupResults,
  source: {
    name: 'CEPII BACI version 202601, HS17',
    url:
      'https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html',
    baciZipSha256: await sha256(baciZip),
  },
  limitations: [
    'Chapter groups are transparent proxies rather than exact USTR tariff-line lists.',
    'The two-year change also contains exchange-rate, demand, and non-tariff shocks.',
    'The holdout tests supplier substitution but not the short-run capacity parameter.',
  ],
};

await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `${JSON.stringify(calibration, null, 2)}\n`,
);
console.log(JSON.stringify(calibration, null, 2));
