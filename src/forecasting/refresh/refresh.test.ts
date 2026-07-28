import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseEiaDataCenterPaths,
  summarizeCensusConstruction,
} from './data-center.js';
import {
  partialMarketUpdate,
  summarizeHormuzMarket,
  summarizeHormuzPhysical,
} from './hormuz.js';
import { parseCdcAdmissionsRows } from './outbreak.js';
import { parseCensusDataCenterConstructionWorkbook } from './xlsx.js';

function storedZip(
  entries: Readonly<Record<string, string>>,
): Uint8Array {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  for (const [name, value] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(value);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    localParts.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, nameBytes);
    localOffset += local.length + nameBytes.length + data.length;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return new Uint8Array(Buffer.concat([...localParts, central, end]));
}

test('focused XLSX parser validates and reads the Census worksheet contract', () => {
  const months = [
    'Jun-24', 'Jul-24', 'Aug-24', 'Sep-24', 'Oct-24', 'Nov-24',
    'Dec-24', 'Jan-25', 'Feb-25', 'Mar-25', 'Apr-25', 'May-25',
    'Jun-25', 'Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25',
    'Dec-25', 'Jan-26', 'Feb-26', 'Mar-26', 'Apr-26r', 'May-26p',
  ];
  const strings = ['Date', 'Data center', ...months];
  const shared =
    `<sst>${strings.map((value) => `<si><t>${value}</t></si>`).join('')}</sst>`;
  const dataRows = months.map((_, index) => {
    const row = index + 5;
    return `<row r="${row}"><c r="A${row}" t="s"><v>${index + 2}</v></c>` +
      `<c r="J${row}"><v>${10_000 + index}</v></c></row>`;
  }).join('');
  const sheet =
    '<worksheet><sheetData>' +
    '<row r="4"><c r="A4" t="s"><v>0</v></c>' +
    '<c r="J4" t="s"><v>1</v></c></row>' +
    `${dataRows}</sheetData></worksheet>`;
  const parsed = parseCensusDataCenterConstructionWorkbook(storedZip({
    'xl/sharedStrings.xml': shared,
    'xl/worksheets/sheet1.xml': sheet,
  }));
  assert.equal(parsed.length, 24);
  assert.deepEqual(parsed.at(-1), {
    month: '2026-05',
    seasonallyAdjustedAnnualRateMillionUsd: 10_023,
    sourceRow: 28,
  });
});

test('live-source parsers enforce the forecast-specific measurement contracts', () => {
  const weeks = [
    '2026-05-30',
    '2026-06-06',
    '2026-06-13',
    '2026-06-20',
    '2026-06-27',
    '2026-07-04',
    '2026-07-11',
    '2026-07-18',
  ];
  assert.deepEqual(
    parseCdcAdmissionsRows(weeks.map((weekendingdate, index) => ({
        weekendingdate,
        jurisdiction: 'USA',
        totalconfc19newadm: String(900 + index),
        totalconfc19newadmhosprep: '5000',
        totalconfc19newadmperchosprep: '80',
      })),
      'cdc.test',
    ).at(-1)?.admissions,
    907,
  );

  const paths = parseEiaDataCenterPaths({
    response: {
      data: [
        {
          period: '2035',
          scenario: 'cb2026',
          scenarioDescription: 'Counterfactual Baseline case',
          seriesId: 'cnsm_NA_comm_NA_prc_datactrserv_usa_qbtu',
          value: '0.881098',
          unit: 'quads',
        },
        {
          period: '2035',
          scenario: 'cb2026',
          scenarioDescription: 'Counterfactual Baseline case',
          seriesId: 'cnsm_NA_elep_NA_tel_NA_usa_blnkwh',
          value: '4937.111816',
          unit: 'BkWh',
        },
      ],
    },
  });
  assert.equal(paths.length, 1);
  assert.ok(paths[0].serverOnlyShare > 0.052);
  assert.ok(paths[0].serverOnlyShare < 0.053);

  const construction = summarizeCensusConstruction([
    {
      month: '2021-05',
      seasonallyAdjustedAnnualRateMillionUsd: 9_326,
      sourceRow: 65,
    },
    {
      month: '2025-05',
      seasonallyAdjustedAnnualRateMillionUsd: 48_210,
      sourceRow: 17,
    },
    {
      month: '2026-05',
      seasonallyAdjustedAnnualRateMillionUsd: 59_307,
      sourceRow: 5,
    },
  ]);
  assert.ok(Math.abs(construction.yearOverYearGrowth - 0.23018) < 0.00001);
  assert.ok(
    Math.abs(construction.fiveYearCompoundAnnualGrowth - 0.44771) < 0.00001,
  );
});

test('Hormuz refresh transfers only a partial move from the easier comparator', () => {
  const physical = summarizeHormuzPhysical({
    asOf: '2026-07-28T17:19:06.093Z',
    verdict: { status: 'closed' },
    transits: {
      count: 10,
      baseline: 88,
      asOfDate: '2026-07-23',
      stale: false,
    },
    carrierSuspensions: [
      { carrier: 'A', status: 'rerouting' },
      { carrier: 'B', status: 'limited' },
    ],
  });
  assert.equal(physical.throughputShare, 10 / 88);
  assert.equal(physical.regularCarrierCount, 0);

  const market = summarizeHormuzMarket([{
    id: '455875',
    updatedAt: '2026-07-28T17:16:37.724137Z',
    markets: [{
      id: '2176270',
      question: 'Strait of Hormuz traffic returns to normal by December 31?',
      outcomes: '["Yes", "No"]',
      outcomePrices: '["0.565", "0.435"]',
      volume: '6189751.79',
      liquidity: '273470.07',
      active: true,
      closed: false,
    }],
  }]);
  assert.equal(market.probabilityYes, 0.565);
  const updated = partialMarketUpdate({
    priorQuestionProbability: 0.39,
    priorComparatorProbability: 0.495,
    currentComparatorProbability: market.probabilityYes,
    logOddsWeight: 1 / 3,
  });
  assert.ok(Math.abs(updated - 0.4125374695) < 1e-9);
});
