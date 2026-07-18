/**
 * Build 2011 commuting basins from Istat's matrice di pendolarismo.
 * S-records = strata totals: TipoRes(1) ProvRes(3) ComRes(3) Sesso(1)
 * Motivo(1) Luogo(1) ProvDest(3) ComDest(3) StatoEstero(3) ... count.
 * Work trips only (Motivo 2). Same frozen algorithm as Japan: link to the
 * largest external destination when >= 10% of employed residents, else
 * self-link; connected components = basins.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeCsv } from '../../scripts/lib.js';

const ITALY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ITALY, '..', 'raw', 'italy');
const ZIP = path.join(RAW, 'pend2011.zip');

async function main(): Promise<void> {
  const member = execFileSync('unzip', ['-Z1', ZIP]).toString().split('\n')
    .find((m) => m.endsWith('.txt'));
  if (!member) throw new Error('matrix member not found');
  const proc = spawn('unzip', ['-p', ZIP, member]);
  const rl = readline.createInterface({ input: proc.stdout });
  const flows = new Map<string, number>(); // "res|dest" -> workers
  const residentsWorking = new Map<string, number>();
  let parsed = 0;
  for await (const line of rl) {
    if (!line.startsWith('S')) continue;
    const f = line.trim().split(/\s+/);
    // S tipoRes provRes comRes sesso motivo luogo provDest comDest statoEstero count
    if (f.length < 10) continue;
    const motivo = f[5];
    if (motivo !== '2') continue;
    const res = f[2].padStart(3, '0') + f[3].padStart(3, '0');
    const luogo = f[6];
    const count = Number(f[f.length - 1]);
    if (!Number.isFinite(count)) continue;
    residentsWorking.set(res, (residentsWorking.get(res) ?? 0) + count);
    // luogo: 1 = same comune, 2 = other comune (Italy), 3 = abroad
    if (luogo === '2' && f.length >= 10) {
      const dest = f[7].padStart(3, '0') + f[8].padStart(3, '0');
      if (dest !== res && !/^0+$/.test(f[7])) {
        flows.set(`${res}|${dest}`, (flows.get(`${res}|${dest}`) ?? 0) + count);
      }
    }
    parsed += 1;
  }
  console.log(`S work records: ${parsed}; comuni with workers: ${residentsWorking.size}`);

  // Dominant external destination per comune
  const best = new Map<string, { dest: string; count: number }>();
  for (const [key, count] of flows) {
    const [res, dest] = key.split('|');
    const current = best.get(res);
    if (!current || count > current.count) best.set(res, { dest, count });
  }
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== undefined && parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a); const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const code of residentsWorking.keys()) parent.set(code, code);
  let linked = 0;
  for (const [res, { dest, count }] of best) {
    const total = residentsWorking.get(res) ?? 0;
    if (total > 0 && count / total >= 0.10 && residentsWorking.has(dest)) {
      union(res, dest);
      linked += 1;
    }
  }
  const rows: (string | number)[][] = [];
  const basins = new Set<string>();
  for (const code of residentsWorking.keys()) {
    const basin = find(code);
    basins.add(basin);
    rows.push([code, basin]);
  }
  console.log(`linked: ${linked}; basins: ${basins.size}`);
  writeCsv(path.join(ITALY, 'data', 'basins2011.csv.gz'), ['code', 'basin'], rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
