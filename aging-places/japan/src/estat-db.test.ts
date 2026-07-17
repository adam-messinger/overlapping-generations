import { gunzipSync } from 'node:zlib';
import { expect, printSummary, test } from '../../../src/test-utils.js';
import {
  buildEstatRequest,
  decodeHtml,
  estatForm,
  parseEstatTable,
  type EstatModel,
} from './estat-db.js';

console.log('\n=== Japan e-Stat Database Tests ===\n');

const model: EstatModel = {
  matters: {
    geography: {
      matterId: 1,
      matterName: 'geography',
      tableName: 'area',
      dispTableName: 'area_display',
      positionNum: '0',
      position: 'row',
      total: 2,
      listData: {
        first: { code: '01234', name: 'First' },
        second: { code: '05678', name: 'Second' },
      },
    },
    category: {
      matterId: 2,
      matterName: 'category',
      tableName: 'category',
      dispTableName: 'category_display',
      positionNum: '0',
      position: 'col',
      total: 2,
      listData: {
        total: { code: '000', name: 'Total' },
        education: { code: '290', name: 'Education' },
      },
    },
    year: {
      matterId: 3,
      matterName: 'year',
      tableName: 'time',
      dispTableName: 'time_display',
      positionNum: '0',
      position: 'top',
      total: 1,
      listData: { y2010: { code: '2010000000', name: '2010' } },
    },
  },
  annotationFlg: 1,
  rowNoDataDispFlg: 0,
  colNoDataDispFlg: 0,
  commaType: 0,
  replaceSpChars: 0,
  graphAxis: 'horizontal',
  graphBasis: 'head',
  graphSort: 'asc',
  graphTitle: '',
  graphType: 'barChart',
};

test('request builder can move dimensions and preserve selected code order', () => {
  const request = buildEstatRequest(model, {
    rows: [1], cols: [2], tops: [3],
    selectedCodes: { 1: ['05678'], 2: ['290', '000'], 3: ['2010000000'] },
  }, true);
  expect(request.rows[0].listData.map((item) => item.code)).toEqual(['05678']);
  expect(request.cols[0].listData.map((item) => item.code)).toEqual(['290', '000']);
  expect(request.tops[0].listData.map((item) => item.code)).toEqual(['2010000000']);
  expect(request.apiTops?.[0].listData.map((item) => item.code)).toEqual(['2010000000']);
});

test('form encoder gzip-compresses e-Stat axes', () => {
  const request = buildEstatRequest(model, {
    rows: [1], cols: [2], tops: [3],
    selectedCodes: { 1: ['01234'], 2: ['000'], 3: ['2010000000'] },
  });
  const form = estatForm(request);
  const rows = JSON.parse(gunzipSync(Buffer.from(form.get('rows')!, 'base64')).toString('utf8'));
  expect(rows[0].listData[0].code).toBe('01234');
});

test('table parser retains codes and converts suppressed values to null', () => {
  const rows = parseEstatTable(`
    <table><tbody>
      <tr><th class="js-dbview-rows" data-unique="01234">A &amp; B</th>
        <td class="stat-dbview-value">1,234</td><td class="stat-dbview-value">***</td></tr>
      <tr><th class="other js-dbview-rows sticky" data-unique="05678">Second</th>
        <td class="x stat-dbview-value">5</td><td class="stat-dbview-value">6.5</td></tr>
    </tbody></table>
  `);
  expect(rows).toEqual([
    { code: '01234', name: 'A & B', values: [1234, null] },
    { code: '05678', name: 'Second', values: [5, 6.5] },
  ]);
  expect(decodeHtml('A&#x65E5;&nbsp;B')).toBe('A日 B');
});

printSummary();
