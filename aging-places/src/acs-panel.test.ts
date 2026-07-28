import { expect, printSummary, test } from '../../src/test-utils.js';
import {
  acsFetchChunks,
  normalizeAcsPayloads,
  parseCensusArray,
  type AcsCrosswalk,
} from './acs-panel.js';

console.log('\n=== ACS Semantic Panel Tests ===\n');

const crosswalk: AcsCrosswalk = {
  schemaVersion: 'aging-places.acs-semantic-crosswalk/v1',
  vintage: 2024,
  resolvedAt: '2026-07-28T00:00:00.000Z',
  entries: [
    {
      output: 'pop', dataset: 'profile', group: 'DP05',
      variable: 'POP_E', moeVariable: 'POP_M',
      label: 'population', moeLabel: 'population MOE', unit: 'count',
      semanticMatch: { includes: ['population'], excludes: [] },
    },
    {
      output: 'builtRecentComponent1', dataset: 'profile', group: 'DP04',
      variable: 'BUILD1_E', moeVariable: 'BUILD1_M',
      label: 'newer bin', moeLabel: 'newer bin MOE', unit: 'count',
      semanticMatch: { includes: ['newer'], excludes: [] },
    },
    {
      output: 'builtRecentComponent2', dataset: 'profile', group: 'DP04',
      variable: 'BUILD2_E', moeVariable: 'BUILD2_M',
      label: 'older bin', moeLabel: 'older bin MOE', unit: 'count',
      semanticMatch: { includes: ['older'], excludes: [] },
    },
    {
      output: 'groupQuarters', dataset: 'detailed', group: 'B26001',
      variable: 'GQ_E', moeVariable: 'GQ_M',
      label: 'group quarters', moeLabel: 'group quarters MOE', unit: 'count',
      semanticMatch: { includes: ['total'], excludes: [] },
    },
  ],
  construction: {
    lowerBoundYear: 2010,
    componentOutputs: ['builtRecentComponent1', 'builtRecentComponent2'],
    rule: 'fixture',
  },
  notes: [],
};

test('Census matrix parser rejects error objects', () => {
  expect(() => parseCensusArray({ error: 'bad request' }, 'fixture'))
    .toThrow('two-dimensional array');
});

test('chunk planner preserves estimate/MOE pairs under the API limit', () => {
  const chunks = acsFetchChunks(crosswalk, 2);
  expect(chunks).toHaveLength(4);
  expect(chunks[0].variables).toEqual(['POP_E', 'POP_M']);
  expect(chunks[3].variables).toEqual(['GQ_E', 'GQ_M']);
});

test('chunk normalization joins geographies and derives construction MOE', () => {
  const panel = normalizeAcsPayloads(crosswalk, [
    {
      dataset: 'profile',
      columns: ['NAME', 'POP_E', 'POP_M', 'BUILD1_E', 'BUILD1_M', 'state', 'place'],
      rows: [['Example city', '1000', '40', '10', '3', '01', '00100']],
    },
    {
      dataset: 'profile',
      columns: ['NAME', 'BUILD2_E', 'BUILD2_M', 'state', 'place'],
      rows: [['Example city', '20', '4', '01', '00100']],
    },
    {
      dataset: 'detailed',
      columns: ['NAME', 'GQ_E', 'GQ_M', 'state', 'place'],
      rows: [['Example city', '50', '7', '01', '00100']],
    },
  ]);
  expect(panel.rows).toHaveLength(1);
  const record = Object.fromEntries(
    panel.header.map((name, index) => [name, panel.rows[0][index]]),
  );
  expect(record.geoid).toBe('0100100');
  expect(record.popMoe).toBe(40);
  expect(record.groupQuarters).toBe(50);
  expect(record.builtRecent).toBe(30);
  expect(record.builtRecentMoe).toBe(5);
});

printSummary();
