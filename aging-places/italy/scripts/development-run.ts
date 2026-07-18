/**
 * Italy development windows (frozen protocol, docs/ITALY_PANEL.md):
 * demographic-core mechanism only — the channel that carried all transferable
 * signal in Japan — with frozen US weights, against the lagged-trend kill
 * comparator, within 2011 commuting basins.
 *
 * Windows: 2005-2012 (lag 2002-2005) and 2012-2019 (lag 2005-2012).
 * No Italian outcome after 2019 is read here.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, readCsvAuto } from '../../scripts/lib.js';
import {
  bootstrapDifference, conditionalWorkingAllocation, evaluateLocal, percentileStandardize,
} from '../../japan/src/validation.js';

const ITALY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN_BASIN_UNITS = 5;
const WINDOW_YEARS = 7;

function table(file: string): { header: string[]; rows: string[][] } {
  const rows = parseCsv(readCsvAuto(path.join(ITALY, 'data', file)));
  return { header: rows[0], rows: rows.slice(1).filter((r) => r.length > 1) };
}

interface WindowConfig {
  label: string;
  origin: 2005 | 2012;
  outcome: string;
  lagged: string;
}
const WINDOWS: WindowConfig[] = [
  { label: '2005-2012', origin: 2005, outcome: 'workingLog2005_2012', lagged: 'laggedLog2002_2005' },
  { label: '2012-2019', origin: 2012, outcome: 'workingLog2012_2019', lagged: 'laggedLog2005_2012' },
];

function main(): void {
  const panel = table('panel.csv.gz');
  const at = (name: string): number => {
    const i = panel.header.indexOf(name);
    if (i < 0) throw new Error(`panel missing ${name}`);
    return i;
  };
  const basins = table('basins2011.csv.gz');
  const basinByCode = new Map(basins.rows.map((r) => [r[0], r[1]]));

  const results: Record<string, unknown>[] = [];
  for (const config of WINDOWS) {
    const y = config.origin;
    const prelim = panel.rows.flatMap((row) => {
      const value = (name: string): number | null => {
        const raw = row[at(name)];
        const parsed = raw === '' ? NaN : Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const code = row[at('code')];
      const basin = basinByCode.get(code);
      const total = value(`total_${y}`);
      const working = value(`a20_64_${y}`);
      const a2544 = value(`a25_44_${y}`);
      const a2034 = value(`a20_34_${y}`);
      const a4559 = value(`a45_59_${y}`);
      const a6064 = value(`a60_64_${y}`);
      const a65 = value(`a65up_${y}`);
      const carry = value(`a13_57_${y}`);
      const outcome = value(config.outcome);
      const lagged = value(config.lagged);
      const endpointWorking = outcome !== null && working !== null ? working * Math.exp(outcome) : null;
      if (!basin || total === null || working === null || working <= 0 || a2544 === null
        || a2034 === null || a4559 === null || a6064 === null || a65 === null || a65 <= 0
        || carry === null || outcome === null || lagged === null || endpointWorking === null) return [];
      const young = working - a4559 - a6064;
      return [{
        code, basin, total, working, endpointWorking, carry, outcome, lagged,
        rep: a2544 / a65, vitality: a2034 / total, midlife: (a4559 + a6064) / total,
        moverRate: working > 0 ? (0.025 * young + 0.015 * (a4559 + a6064)) / working : 0.02,
      }];
    });
    const rep = percentileStandardize(prelim.map((u) => u.rep));
    const mid = percentileStandardize(prelim.map((u) => u.midlife));
    const vit = percentileStandardize(prelim.map((u) => u.vitality));
    const attraction = prelim.map((_, i) => 0.15 * (0.6 * rep[i] - 0.4 * mid[i]) + 0.15 * vit[i]);
    const allocation = conditionalWorkingAllocation(prelim.map((u, i) => ({
      originWorking: u.working,
      demographicEndpoint: u.carry, // exact aging-in-place carry (mortality ignored; scaling absorbs level)
      observedEndpoint: u.endpointWorking,
      attraction: attraction[i],
      annualMoverRate: u.moverRate,
    })), WINDOW_YEARS);

    const indexed = prelim.map((u, i) => ({ ...u, pred: allocation.predictedLogChange[i] }));
    const evaluate = (sample: typeof indexed, label: string): Record<string, unknown> => {
      const entry = (score: (u: typeof indexed[number]) => number) => evaluateLocal(
        sample.map((u) => ({ market: u.basin, score: score(u), outcome: u.outcome })), MIN_BASIN_UNITS,
      );
      const mech = entry((u) => u.pred);
      const lag = entry((u) => u.lagged);
      const noMig = entry((u) => Math.log((u.carry * allocation.baselineScaleToObservedNationalTotal) / u.working));
      const mae = (predict: (u: typeof indexed[number]) => number): number => +(
        sample.reduce((s, u) => s + Math.abs(predict(u) - u.outcome) / WINDOW_YEARS, 0) / sample.length
      ).toFixed(5);
      return {
        label,
        n: sample.length,
        maeAnnualized: {
          mechanism: mae((u) => u.pred),
          laggedTrend: mae((u) => u.lagged),
          scaledNoMigration: mae((u) => Math.log((u.carry * allocation.baselineScaleToObservedNationalTotal) / u.working)),
        },
        equalBasinSpearman: {
          mechanism: mech.metrics,
          laggedTrend: lag.metrics,
          scaledNoMigration: noMig.metrics,
        },
        mechanismMinusLagged: bootstrapDifference(mech.spearmanByMarket, lag.spearmanByMarket),
        mechanismMinusNoMigration: bootstrapDifference(mech.spearmanByMarket, noMig.spearmanByMarket),
      };
    };
    const primary = evaluate(indexed.filter((u) => u.total >= 10_000), 'pop>=10k');
    const sensitivity = evaluate(indexed.filter((u) => u.total >= 15_000), 'pop>=15k');
    // Pre-committed named reads
    const named = ['058091', '015146'].map((code) => { // Roma, Milano
      const u = indexed.find((x) => x.code === code);
      if (!u) return { code, note: 'not in sample' };
      const basinUnits = indexed.filter((x) => x.basin === u.basin && x.total >= 10_000);
      const rank = (score: (x: typeof u) => number): number => (
        basinUnits.filter((x) => score(x) > score(u)).length + 1
      );
      return {
        code, basin: u.basin, basinUnits: basinUnits.length,
        predictedRank: rank((x) => x.pred), realizedRank: rank((x) => x.outcome),
      };
    });
    results.push({
      window: config.label,
      conservationError: +(allocation.predictedEndpointTotal - allocation.observedEndpointTotal).toFixed(6),
      primary, sensitivity, namedCases: { roma: named[0], milano: named[1] },
    });
  }
  fs.writeFileSync(path.join(ITALY, 'data', 'development.json'), JSON.stringify({
    status: 'development windows only; 2019-2024 holdout sealed at run time',
    mechanism: 'frozen US demographic core (0.15 x (0.6 rep - 0.4 midlife) + 0.15 vitality); no Italian fitting',
    windows: results,
  }, null, 1));
  console.log(JSON.stringify(results, null, 1).slice(0, 2600));
}

main();
