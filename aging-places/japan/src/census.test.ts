import { expect, printSummary, test } from '../../../src/test-utils.js';
import {
  ageCohorts2015,
  ageCohorts2010,
  ageCohorts2020,
  codeOn2020Boundary,
  deriveBoundaryCrosswalk,
  isAnalysisUnit,
  stripAreaOrdinal,
} from './census.js';

console.log('\n=== Japan Census Panel Tests ===\n');

test('analysis units keep municipal parents and Tokyo special wards without double counting', () => {
  expect(isAnalysisUnit('1', '01100')).toBe(true);
  expect(isAnalysisUnit('0', '01101')).toBe(false);
  expect(isAnalysisUnit('1', '13100')).toBe(false);
  expect(isAnalysisUnit('0', '13101')).toBe(true);
  expect(isAnalysisUnit('3', '01202')).toBe(true);
  expect(isAnalysisUnit('9', '01202')).toBe(false);
});

test('the two 2015 status-change codes map explicitly to frozen 2020 codes', () => {
  expect(codeOn2020Boundary('04423')).toBe('04216');
  expect(codeOn2020Boundary('40305')).toBe('40231');
  expect(codeOn2020Boundary('01100')).toBe('01100');
});

test('area ordinals are removed without damaging names', () => {
  expect(stripAreaOrdinal('0003_Sapporo-shi')).toBe('Sapporo-shi');
  expect(stripAreaOrdinal('Tokyo')).toBe('Tokyo');
});

test('2015 and 2020 age tables map into the same cohort definitions', () => {
  const row10 = Array(145).fill('0');
  for (let column = 114; column <= 134; column++) row10[column] = '10';
  row10[137] = '90';
  const c10 = ageCohorts2010(row10);
  expect(c10.age0_19).toBe(40);
  expect(c10.age20_34).toBe(30);
  expect(c10.age25_44).toBe(40);
  expect(c10.working20_64).toBe(90);
  expect(c10.age65plus).toBe(90);

  const row15 = Array(143).fill('0');
  for (let column = 112; column <= 132; column++) row15[column] = '10';
  row15[135] = '90';
  const c15 = ageCohorts2015(row15);
  expect(c15.age0_19).toBe(40);
  expect(c15.age20_34).toBe(30);
  expect(c15.age25_44).toBe(40);
  expect(c15.working20_64).toBe(90);
  expect(c15.age65plus).toBe(90);

  const row20 = Array(48).fill('0');
  for (let column = 10; column <= 30; column++) row20[column] = '10';
  row20[33] = '90';
  row20[34] = '90';
  const c20 = ageCohorts2020(row20);
  expect(c20.age0_19).toBe(40);
  expect(c20.age20_34).toBe(30);
  expect(c20.age25_44).toBe(40);
  expect(c20.working20_64).toBe(90);
  expect(c20.age65plus).toBe(90);
});

test('boundary crosswalk aggregates a retired source code into its official successor', () => {
  const source = [
    [],
    ['1', '', '01001', '3', '2010', '2000', 'unchanged'],
    ['2', '', '01002', '3', '2010', '2000', 'retired'],
  ];
  const target = [
    [],
    ['1', '', '01001', '2', '2015', '', 'successor'],
    ['2', '', '01001', '9', '', '2000', '(旧 001 unchanged)'],
    ['3', '', '01001', '9', '', '2000', '(旧 002 retired)'],
  ];
  const rows = deriveBoundaryCrosswalk(source, target, 1);
  expect(rows.length).toBe(2);
  expect(rows[0].targetCode).toBe('01001');
  expect(rows[1].targetCode).toBe('01001');
  expect(rows[1].operation).toBe('aggregate');
});

printSummary();
