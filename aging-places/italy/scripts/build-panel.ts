/**
 * Build the Italian municipal age panel from Istat's intercensal
 * reconstruction 2002-2019 (one wide CSV per comune, ages 0-100+, already
 * harmonized by Istat to a consistent recent boundary vintage — that vintage
 * is adopted as the frozen geography, per the deviation log).
 *
 * Output: italy/data/panel.csv.gz — per comune: cohort aggregates for 2002,
 * 2005, 2012, 2019 and the window/lag log-changes used by the protocol.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeCsv } from '../../scripts/lib.js';

const ITALY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ITALY, '..', 'raw', 'italy');
const ZIP = path.join(RAW, 'ricostruzione_comuni.zip');
const YEARS = [2002, 2005, 2012, 2019] as const;

function cohorts(byAge: Map<number, number[]>, yearIdx: number): Record<string, number> {
  const sum = (lo: number, hi: number): number => {
    let s = 0;
    for (let a = lo; a <= hi; a++) s += byAge.get(a)?.[yearIdx] ?? 0;
    return s;
  };
  return {
    total: sum(0, 100),
    a20_64: sum(20, 64), a25_44: sum(25, 44), a20_34: sum(20, 34),
    a45_59: sum(45, 59), a60_64: sum(60, 64), a65up: sum(65, 100),
    a13_57: sum(13, 57), // no-migration carry into 20-64 over a 7-year window
  };
}

function main(): void {
  const members = execFileSync('unzip', ['-Z1', ZIP], { maxBuffer: 1 << 24 })
    .toString().split('\n').filter((m) => m.endsWith('.csv'));
  console.log(`comune files: ${members.length}`);
  const rows: (string | number | null)[][] = [];
  let yearsHeader: number[] = [];
  for (const member of members) {
    const match = /Comune_(\d{6})-/.exec(member);
    if (!match) continue;
    const code = match[1];
    const text = execFileSync('unzip', ['-p', ZIP, member], { maxBuffer: 1 << 22 }).toString('utf8');
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const headerIdx = lines.findIndex((l) => /^Et.*;.*2002/.test(l));
    if (headerIdx < 0) throw new Error(`${member}: no year header`);
    if (yearsHeader.length === 0) {
      yearsHeader = lines[headerIdx].split(';').slice(1).map((y) => Number(y));
    }
    const byAge = new Map<number, number[]>();
    for (const line of lines.slice(headerIdx + 1)) {
      const parts = line.split(';');
      const ageMatch = /^"?(\d+)/.exec(parts[0]); // "100 e più" -> 100; skips the Età;Totale sub-header
      if (!ageMatch) continue;
      const age = Number(ageMatch[1]);
      if (byAge.has(age)) break; // first section only (Tutte le cittadinanze, Totale)
      byAge.set(age, parts.slice(1).map((v) => Number(v.replace(/"/g, '').replace(/\./g, '')) || 0)); // Italian thousands separators
    }
    const at = (y: number): number => yearsHeader.indexOf(y);
    const c: Record<number, Record<string, number>> = {};
    for (const y of YEARS) c[y] = cohorts(byAge, at(y));
    const lg = (a: number, b: number, field: string): number | null => (
      c[a][field] > 0 && c[b][field] > 0 ? +(Math.log(c[b][field] / c[a][field])).toFixed(6) : null
    );
    rows.push([
      code,
      ...YEARS.flatMap((y) => [c[y].total, c[y].a20_64, c[y].a25_44, c[y].a20_34, c[y].a45_59, c[y].a60_64, c[y].a65up, c[y].a13_57]),
      lg(2005, 2012, 'a20_64'), lg(2012, 2019, 'a20_64'), // window outcomes
      lg(2002, 2005, 'a20_64'), lg(2005, 2012, 'a20_64'), // lagged comparators
    ]);
  }
  const header = ['code',
    ...YEARS.flatMap((y) => ['total', 'a20_64', 'a25_44', 'a20_34', 'a45_59', 'a60_64', 'a65up', 'a13_57'].map((f) => `${f}_${y}`)),
    'workingLog2005_2012', 'workingLog2012_2019', 'laggedLog2002_2005', 'laggedLog2005_2012',
  ];
  writeCsv(path.join(ITALY, 'data', 'panel.csv.gz'), header, rows);
}

main();
