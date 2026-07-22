import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, printSummary, test } from '../../../src/test-utils.js';
import { parseCsv, readCsvAuto } from '../../scripts/lib.js';

console.log('\n=== Japan Origin Feature Tests ===\n');

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(JAPAN_DIR, 'data');
const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, 'origin-features.csv')));
const header = rows[0];
const data = rows.slice(1);
const at = (name: string): number => {
  const column = header.indexOf(name);
  if (column < 0) throw new Error(`origin feature test is missing ${name}`);
  return column;
};

test('origin feature panel has one frozen-boundary row per unit and year', () => {
  expect(data.length).toBe(3_482);
  const key = new Set(data.map((row) => `${row[at('originYear')]}:${row[at('code2020')]}`));
  expect(key.size).toBe(data.length);
  expect(data.filter((row) => row[at('originYear')] === '2010').length).toBe(1_741);
  expect(data.filter((row) => row[at('originYear')] === '2015').length).toBe(1_741);
  expect(data.every((row) => /^\d{5}$/.test(row[at('code2020')]))).toBeTrue();
});

test('derived shares are bounded and reconstruct from official counts', () => {
  const shareNames = [
    'educationEmploymentShare',
    'healthEmploymentShare',
    'publicAdminEmploymentShare',
    'professionalInfoFinanceShare',
    'foreignResidentShare',
  ];
  for (const name of shareNames) {
    expect(data.every((row) => {
      if (row[at(name)] === '') return true;
      const value = Number(row[at(name)]);
      return value >= 0 && value <= 1;
    })).toBeTrue();
  }
  for (const row of data) {
    const total = Number(row[at('totalEmployed')]);
    if (total <= 0) continue;
    const education = Number(row[at('educationEmployed')]);
    expect(Number(row[at('educationEmploymentShare')])).toBeCloseTo(education / total, 10);
    const professional = ['informationEmployed', 'financeEmployed', 'professionalEmployed']
      .map((name) => row[at(name)]);
    if (professional.every((value) => value !== '')) {
      const sum = professional.reduce<number>((totalValue, value) => totalValue + Number(value), 0);
      expect(Number(row[at('professionalInfoFinanceShare')])).toBeCloseTo(sum / total, 10);
    }
  }
});

test('all added constructs clear the preregistered 80% coverage threshold', () => {
  const coverage = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'origin-feature-coverage.json'), 'utf8'),
  ) as { years: Record<string, { finiteCoverage: Record<string, { share: number }> }> };
  for (const year of ['2010', '2015']) {
    for (const feature of Object.values(coverage.years[year].finiteCoverage)) {
      expect(feature.share).toBeGreaterThan(0.8);
    }
  }
});

test('source manifest contains only origin-year data and cannot leak holdout outcomes', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'origin-feature-sources.json'), 'utf8'),
  ) as { post2020OutcomeIncluded: boolean; sources: Array<{ year: number; statsDataId: string }> };
  expect(manifest.post2020OutcomeIncluded).toBeFalse();
  expect(manifest.sources.length).toBe(4);
  expect(manifest.sources.every((source) => source.year === 2010 || source.year === 2015)).toBeTrue();
  expect(manifest.sources.every((source) => /^\d{10}$/.test(source.statsDataId))).toBeTrue();
});

printSummary();
