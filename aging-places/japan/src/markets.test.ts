import { expect, printSummary, test } from '../../../src/test-utils.js';
import { buildCommutingBasins, type CommutingOrigin } from './markets.js';

console.log('\n=== Japan Commuting Market Tests ===\n');

function origin(workers: number, flows: Record<string, number>): CommutingOrigin {
  return { employedResidents: workers, externalFlows: new Map(Object.entries(flows)) };
}

test('flows below ten percent leave a municipality self-linked', () => {
  const result = buildCommutingBasins(new Map([
    ['A', origin(100, { B: 9 })],
    ['B', origin(100, {})],
  ]));
  expect(result.find((row) => row.code === 'A')!.linkedDestination).toBe('A');
});

test('dominant links follow through to a common sink', () => {
  const result = buildCommutingBasins(new Map([
    ['A', origin(100, { B: 20 })],
    ['B', origin(100, { C: 30 })],
    ['C', origin(100, {})],
  ]));
  expect(result.find((row) => row.code === 'A')!.market).toBe('C');
  expect(result.find((row) => row.code === 'B')!.market).toBe('C');
});

test('directed cycles become one basin with a deterministic identifier', () => {
  const result = buildCommutingBasins(new Map([
    ['A', origin(100, { B: 20 })],
    ['B', origin(100, { A: 20 })],
    ['C', origin(100, { B: 20 })],
  ]));
  expect(new Set(result.map((row) => row.market)).size).toBe(1);
  expect(result[0].market).toBe('A');
});

test('ties use the lowest destination code', () => {
  const result = buildCommutingBasins(new Map([
    ['A', origin(100, { C: 20, B: 20 })],
    ['B', origin(100, {})],
    ['C', origin(100, {})],
  ]));
  expect(result.find((row) => row.code === 'A')!.linkedDestination).toBe('B');
});

printSummary();
