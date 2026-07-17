/**
 * SEALED-HOLDOUT ADJUDICATION — household primary only.
 *
 * Opens the 2025 Census preliminary municipal counts (statInfId 000040454825:
 * population and TOTAL households, 2020 rebased to 2025 boundaries) — the first post-2020 outcome this
 * pipeline touches. Scope, outcome concepts, basin vintage, and the frozen
 * development verdict were recorded in INTERNATIONAL_PANEL.md's deviation log
 * and committed BEFORE this script was first run. The working-age primary
 * stays sealed until the age tabulation (announced September 2026).
 *
 * Mechanism under test: the frozen demographic attraction
 *   0.15 x (0.6 x pct(rep2020) - 0.4 x pct(midlife2020)) + 0.15 x pct(young2020)
 * driving the conditional household allocation (origin total households
 * anchor; observed national 2025 total is the only outcome-side input).
 * Kill comparators: lagged household trend and lagged population trend.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, readCsvAuto } from '../../scripts/lib.js';

import {
  bootstrapDifference, conditionalWorkingAllocation, evaluateLocal, percentileStandardize,
} from '../src/validation.js';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.resolve(JAPAN_DIR, '..', 'raw', 'japan');
const DATA_DIR = path.join(JAPAN_DIR, 'data');

const MIN_MARKET_UNITS = 5;
const YEARS = 5;

interface Unit {
  code: string;
  market: string;
  pop2020: number;
  households2020: number;
  households2020Adjusted: number;
  laggedHouseholdTrend: number | null;
  laggedPopulationTrend: number | null;
  attraction: number;
  moverRate: number;
  pop2025: number;
  households2025: number;
}

function table(file: string): { header: string[]; rows: string[][] } {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, file)));
  return { header: rows[0], rows: rows.slice(1).filter((row) => row.length > 1) };
}



async function main(): Promise<void> {
  // --- 2025 preliminary outcome from the official municipal Excel ---
  // statInfId 000040454825: population and households for 2025 plus the SAME
  // quantities for 2020 reorganized to 2025 boundaries (組替) — the official
  // within-window comparison, so no local boundary mapping is needed.
  const xlsxFile = path.join(RAW_DIR, 'r7-prelim-municipal.xlsx');
  if (!fs.existsSync(xlsxFile)) {
    const response = await fetch('https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040454825&fileKind=0');
    if (!response.ok) throw new Error(`e-Stat file download HTTP ${response.status}`);
    fs.mkdirSync(RAW_DIR, { recursive: true });
    fs.writeFileSync(xlsxFile, Buffer.from(await response.arrayBuffer()));
  }
  const { readXlsxRows } = await import('./xlsx.js');
  const sheet = readXlsxRows(xlsxFile);
  const outcome = new Map<string, { pop: number; households: number; pop2020: number; households2020: number }>();
  for (const row of sheet) {
    const match = /^(\d{5})_/.exec(row[2] ?? '');
    if (!match) continue;
    const value = (index: number): number | null => {
      const parsed = Number(row[index]);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };
    const pop = value(3);
    const pop2020 = value(6);
    const households = value(12);
    const households2020 = value(13);
    if (pop === null || households === null || pop2020 === null || households2020 === null) continue;
    outcome.set(match[1], { pop, households, pop2020, households2020 });
  }
  console.log(`2025 preliminary municipal rows parsed: ${outcome.size}`);

  // --- panel + basins ---
  const panel = table('census-2010-2020.csv');
  const at = (name: string): number => {
    const column = panel.header.indexOf(name);
    if (column < 0) throw new Error(`panel missing ${name}`);
    return column;
  };
  const markets = table('commuting-markets2015.csv');
  const mkCode = markets.header.indexOf('code2020');
  const mkMarket = markets.header.findIndex((name) => /market|basin/i.test(name));
  const marketByCode = new Map(markets.rows.map((row) => [row[mkCode], row[mkMarket]]));

  // --- build units ---
  const prelim = panel.rows.flatMap((row) => {
    const code = row[at('code2020')];
    const out = outcome.get(code);
    const market = marketByCode.get(code);
    const value = (name: string): number | null => {
      const raw = row[at(name)];
      const parsed = raw === '' ? NaN : Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const pop2020 = value('population2020');
    const households2020 = value('totalHouseholds2020');
    const age2024 = value('age20_24_2020');
    const age2544 = value('age25_44_2020');
    const age2034 = value('age20_34_2020');
    const age4559 = value('age45_59_2020');
    const age6064 = value('age60_64_2020');
    const age65 = value('age65plus2020');
    if (!out || !market || !pop2020 || !households2020 || pop2020 <= 0 || households2020 <= 0) return [];
    if (age2024 === null || age2544 === null || age2034 === null || age4559 === null || age6064 === null || age65 === null || age65 <= 0) return [];
    const young = age2024 + age2544;
    const midlife = age4559 + age6064;
    const working = young + midlife;
    return [{
      code, market,
      pop2020,
      households2020,
      rep: age2544 / age65,
      youngShare: age2034 / pop2020,
      midlifeShare: midlife / pop2020,
      laggedHouseholdTrend: value('privateHouseholdLogChange2015_2020'),
      laggedPopulationTrend: value('populationLogChange2015_2020'),
      moverRate: working > 0 ? (0.025 * young + 0.015 * midlife) / working : 0.02,
      pop2025: out.pop,
      households2025: out.households,
      households2020Adjusted: out.households2020,
    }];
  });
  const rep = percentileStandardize(prelim.map((unit) => unit.rep));
  const midlife = percentileStandardize(prelim.map((unit) => unit.midlifeShare));
  const young = percentileStandardize(prelim.map((unit) => unit.youngShare));
  const units: Unit[] = prelim.map((unit, index) => ({
    ...unit,
    attraction: 0.15 * (0.6 * rep[index] - 0.4 * midlife[index]) + 0.15 * young[index],
  }));

  // --- frozen conditional household allocation ---
  const allocation = conditionalWorkingAllocation(units.map((unit) => ({
    originWorking: unit.households2020Adjusted,
    demographicEndpoint: unit.households2020Adjusted,
    observedEndpoint: unit.households2025,
    attraction: unit.attraction,
    annualMoverRate: unit.moverRate,
  })));

  const evaluate = (sample: Unit[], label: string): Record<string, unknown> => {
    const indexOf = new Map(units.map((unit, index) => [unit.code, index]));
    const householdOutcome = (unit: Unit): number => Math.log(unit.households2025 / unit.households2020Adjusted);
    const common = sample.filter((unit) => unit.laggedHouseholdTrend !== null && unit.laggedPopulationTrend !== null);
    const entry = (score: (unit: Unit) => number) => evaluateLocal(common.map((unit) => ({
      market: unit.market, score: score(unit), outcome: householdOutcome(unit),
    })), MIN_MARKET_UNITS);
    const mechanism = entry((unit) => allocation.predictedLogChange[indexOf.get(unit.code)!]);
    const laggedHousehold = entry((unit) => unit.laggedHouseholdTrend!);
    const laggedPopulation = entry((unit) => unit.laggedPopulationTrend!);
    const noMigration = entry((unit) => Math.log(allocation.baselineScaleToObservedNationalTotal));
    const mae = (predict: (unit: Unit) => number): number => +(
      common.reduce((sum, unit) => sum + Math.abs(predict(unit) - householdOutcome(unit)) / YEARS, 0) / common.length
    ).toFixed(5);
    return {
      label,
      n: common.length,
      maeAnnualized: {
        mechanismAllocation: mae((unit) => allocation.predictedLogChange[indexOf.get(unit.code)!]),
        laggedHouseholdTrend: mae((unit) => unit.laggedHouseholdTrend!),
        scaledNoMigration: mae(() => Math.log(allocation.baselineScaleToObservedNationalTotal)),
      },
      equalBasinSpearman: {
        mechanismAllocation: mechanism.metrics,
        laggedHouseholdTrend: laggedHousehold.metrics,
        laggedPopulationTrend: laggedPopulation.metrics,
      },
      mechanismMinusLaggedHousehold: bootstrapDifference(
        mechanism.spearmanByMarket, laggedHousehold.spearmanByMarket,
      ),
      mechanismMinusLaggedPopulation: bootstrapDifference(
        mechanism.spearmanByMarket, laggedPopulation.spearmanByMarket,
      ),
      mechanismMinusNoMigration: bootstrapDifference(
        mechanism.spearmanByMarket, noMigration.spearmanByMarket,
      ),
    };
  };

  const primary = evaluate(units.filter((unit) => unit.pop2020 >= 10_000), 'pop>=10k, 2015 basins');
  const sensitivity = evaluate(units.filter((unit) => unit.pop2020 >= 15_000), 'pop>=15k sensitivity');

  const report = {
    openedAt: 'first run recorded in git history; raw response hashed below',
    source: 'e-Stat statInfId 000040454825 (R7 preliminary counts, municipal Excel)',
    resultSha256: crypto.createHash('sha256').update(fs.readFileSync(xlsxFile)).digest('hex'),
    scope: 'HOUSEHOLD PRIMARY ONLY - working-age primary sealed until the 2025 age tabulation (Sept 2026)',
    conceptNotes: [
      'outcome: total households, official 2020-reorganized-to-2025-boundaries baseline -> 2025 preliminary',
      'lagged comparator: private-household trend 2015-2020 (published lag; concept differs, logged)',
      'basins: frozen 2015 vintage (2020-origin matrix pending, logged)',
    ],
    conservationError: +(allocation.predictedEndpointTotal - allocation.observedEndpointTotal).toFixed(6),
    primary,
    sensitivity,
  };
  fs.writeFileSync(path.join(DATA_DIR, 'holdout-2025.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ primary, sensitivity }, null, 1).slice(0, 2200));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
