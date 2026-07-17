import { expect, printSummary, test } from '../../../src/test-utils.js';
import { cellReferenceToColumn, decodeXml } from '../scripts/xlsx.js';

console.log('\n=== Japan XLSX Reader Tests ===\n');

test('XLSX cell references map to zero-based columns', () => {
  expect(cellReferenceToColumn('A1')).toBe(0);
  expect(cellReferenceToColumn('Z99')).toBe(25);
  expect(cellReferenceToColumn('AA12')).toBe(26);
  expect(cellReferenceToColumn('AZ12')).toBe(51);
  expect(cellReferenceToColumn('BA12')).toBe(52);
});

test('XML entities and numeric entities decode without losing text', () => {
  expect(decodeXml('A &amp; B &#x65E5;&#26412;')).toBe('A & B 日本');
});

printSummary();
