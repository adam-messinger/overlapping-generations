/**
 * SEALED-HOLDOUT ADJUDICATION — Italy 2019-2024 working-age primary.
 * Opens POSAS_2024 (quarantined at preregistration). Origin side uses
 * POSAS_2019 (same series/vintage). Predictors: frozen demographic core from
 * 2019 ages; exact aging-in-place carry = ages 15-59 in 2019. Kill
 * comparator: lagged 2012-2019 working-age trend (panel). Basins: frozen
 * 2011. Development verdict was committed before this ran.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCsv, readCsvAuto } from '../../scripts/lib.js';
import {
  bootstrapDifference, conditionalWorkingAllocation, evaluateLocal, percentileStandardize,
} from '../../japan/src/validation.js';

const ITALY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ITALY, '..', 'raw', 'italy');
const YEARS = 5;
const MIN_BASIN_UNITS = 5;

interface Ages { [age: number]: number }

async function posas(year: number, file: string): Promise<Map<string, Ages>> {
  if (!fs.existsSync(file)) {
    const url = `https://demo.istat.it/data/posas/POSAS_${year}_it_Comuni.zip`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const member = execFileSync('unzip', ['-Z1', file]).toString().trim().split('\n')[0];
  const text = execFileSync('unzip', ['-p', file, member], { maxBuffer: 1 << 27 }).toString('utf8');
  const lines = text.split('\n');
  const headerIdx = lines.findIndex((l) => /Codice comune/i.test(l));
  const header = lines[headerIdx].split(';').map((h) => h.replace(/"/g, '').trim());
  const iCode = header.findIndex((h) => /Codice comune/i.test(h));
  const iAge = header.findIndex((h) => /^Et/i.test(h));
  const iTot = header.length - 1; // "Totale"
  const out = new Map<string, Ages>();
  for (const line of lines.slice(headerIdx + 1)) {
    const parts = line.split(';').map((p) => p.replace(/"/g, '').trim());
    if (parts.length < 4) continue;
    const age = /^(\d+)/.exec(parts[iAge]);
    if (!age) continue;
    const code = parts[iCode].padStart(6, '0');
    const value = Number(parts[iTot]);
    if (!Number.isFinite(value)) continue;
    const ages = out.get(code) ?? {};
    ages[Number(age[1])] = (ages[Number(age[1])] ?? 0) + value;
    out.set(code, ages);
  }
  return out;
}

const sum = (a: Ages, lo: number, hi: number): number => {
  let s = 0;
  for (let x = lo; x <= hi; x++) s += a[x] ?? 0;
  return s;
};

async function main(): Promise<void> {
  const sealed = path.join(RAW, 'SEALED_posas2024.zip');
  const p2024 = await posas(2024, sealed);
  const p2019 = await posas(2019, path.join(RAW, 'posas2019.zip'));
  console.log(`comuni 2019: ${p2019.size}; 2024: ${p2024.size}`);

  const panel = parseCsv(readCsvAuto(path.join(ITALY, 'data', 'panel.csv.gz')));
  const ph = panel[0];
  const lagIdx = ph.indexOf('workingLog2012_2019');
  const lagByCode = new Map(panel.slice(1).map((r) => [r[0], r[lagIdx] === '' ? null : Number(r[lagIdx])]));
  const basins = parseCsv(readCsvAuto(path.join(ITALY, 'data', 'basins2011.csv.gz')));
  const basinByCode = new Map(basins.slice(1).map((r) => [r[0], r[1]]));

  const prelim: { code: string; basin: string; total: number; working: number; endpoint: number;
    carry: number; outcome: number; lagged: number; rep: number; vitality: number; midlife: number;
    moverRate: number }[] = [];
  let dropped = 0;
  for (const [code, ages] of p2019) {
    const ages24 = p2024.get(code);
    const basin = basinByCode.get(code);
    const lagged = lagByCode.get(code);
    if (!ages24 || !basin || lagged === null || lagged === undefined) { dropped += 1; continue; }
    const working = sum(ages, 20, 64);
    const endpoint = sum(ages24, 20, 64);
    const total = sum(ages, 0, 120);
    const a65 = sum(ages, 65, 120);
    const midlifeCount = sum(ages, 45, 64);
    if (working <= 0 || endpoint <= 0 || total <= 0 || a65 <= 0) { dropped += 1; continue; }
    prelim.push({
      code, basin, total, working, endpoint,
      carry: sum(ages, 15, 59),
      outcome: Math.log(endpoint / working),
      lagged,
      rep: sum(ages, 25, 44) / a65,
      vitality: sum(ages, 20, 34) / total,
      midlife: midlifeCount / total,
      moverRate: (0.025 * (working - midlifeCount) + 0.015 * midlifeCount) / working,
    });
  }
  console.log(`holdout units: ${prelim.length}; dropped (no match/lag): ${dropped}`);

  const rep = percentileStandardize(prelim.map((u) => u.rep));
  const mid = percentileStandardize(prelim.map((u) => u.midlife));
  const vit = percentileStandardize(prelim.map((u) => u.vitality));
  const attraction = prelim.map((_, i) => 0.15 * (0.6 * rep[i] - 0.4 * mid[i]) + 0.15 * vit[i]);
  const allocation = conditionalWorkingAllocation(prelim.map((u, i) => ({
    originWorking: u.working, demographicEndpoint: u.carry, observedEndpoint: u.endpoint,
    attraction: attraction[i], annualMoverRate: u.moverRate,
  })), YEARS);
  const units = prelim.map((u, i) => ({ ...u, pred: allocation.predictedLogChange[i] }));

  const evaluate = (sample: typeof units, label: string): Record<string, unknown> => {
    const entry = (score: (u: typeof units[number]) => number) => evaluateLocal(
      sample.map((u) => ({ market: u.basin, score: score(u), outcome: u.outcome })), MIN_BASIN_UNITS,
    );
    const noMigScore = (u: typeof units[number]): number =>
      Math.log((u.carry * allocation.baselineScaleToObservedNationalTotal) / u.working);
    const mech = entry((u) => u.pred);
    const lag = entry((u) => u.lagged);
    const noMig = entry(noMigScore);
    const mae = (predict: (u: typeof units[number]) => number): number => +(
      sample.reduce((s, u) => s + Math.abs(predict(u) - u.outcome) / YEARS, 0) / sample.length
    ).toFixed(5);
    return {
      label, n: sample.length,
      maeAnnualized: { mechanism: mae((u) => u.pred), laggedTrend: mae((u) => u.lagged), scaledNoMigration: mae(noMigScore) },
      equalBasinSpearman: { mechanism: mech.metrics, laggedTrend: lag.metrics, scaledNoMigration: noMig.metrics },
      mechanismMinusLagged: bootstrapDifference(mech.spearmanByMarket, lag.spearmanByMarket),
      mechanismMinusNoMigration: bootstrapDifference(mech.spearmanByMarket, noMig.spearmanByMarket),
    };
  };
  const named = ['058091', '015146'].map((code) => {
    const u = units.find((x) => x.code === code);
    if (!u) return { code, note: 'absent' };
    const basinUnits = units.filter((x) => x.basin === u.basin && x.total >= 10_000);
    const rank = (s: (x: typeof u) => number): number => basinUnits.filter((x) => s(x) > s(u)).length + 1;
    return { code, basinUnits: basinUnits.length, predictedRank: rank((x) => x.pred), realizedRank: rank((x) => x.outcome) };
  });
  const report = {
    scope: 'WORKING-AGE PRIMARY, 2019-2024 (COVID inside the window, per protocol)',
    sealedFileSha256: crypto.createHash('sha256').update(fs.readFileSync(sealed)).digest('hex'),
    conservationError: +(allocation.predictedEndpointTotal - allocation.observedEndpointTotal).toFixed(6),
    primary: evaluate(units.filter((u) => u.total >= 10_000), 'pop>=10k'),
    sensitivity: evaluate(units.filter((u) => u.total >= 15_000), 'pop>=15k'),
    namedCases: { roma: named[0], milano: named[1] },
  };
  fs.writeFileSync(path.join(ITALY, 'data', 'holdout-2024.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1).slice(0, 1800));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
