import { inflateRawSync } from 'node:zlib';

function findEndOfCentralDirectory(bytes: Buffer): number {
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error('XLSX ZIP end-of-central-directory record was not found');
}

export function extractZipEntry(
  raw: Uint8Array,
  wantedName: string,
): Uint8Array {
  const bytes = Buffer.from(raw);
  const eocd = findEndOfCentralDirectory(bytes);
  const entries = bytes.readUInt16LE(eocd + 10);
  let offset = bytes.readUInt32LE(eocd + 16);
  for (let index = 0; index < entries; index++) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Invalid XLSX ZIP central-directory entry');
    }
    const compression = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString('utf8');
    if (name === wantedName) {
      if (bytes.readUInt32LE(localOffset) !== 0x04034b50) {
        throw new Error(`Invalid XLSX ZIP local header for '${wantedName}'`);
      }
      const localNameLength = bytes.readUInt16LE(localOffset + 26);
      const localExtraLength = bytes.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
      const expanded =
        compression === 0
          ? compressed
          : compression === 8
            ? inflateRawSync(compressed)
            : undefined;
      if (!expanded) {
        throw new Error(
          `Unsupported XLSX ZIP compression method ${compression} for '${wantedName}'`,
        );
      }
      if (expanded.length !== uncompressedSize) {
        throw new Error(`Unexpected expanded size for XLSX entry '${wantedName}'`);
      }
      return new Uint8Array(expanded);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`XLSX ZIP entry '${wantedName}' was not found`);
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([a-f0-9]+);/gi, (_match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    );
}

function sharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map((text) => decodeXml(text[1]))
      .join('')
  );
}

function cellColumn(reference: string): string {
  const match = /^([A-Z]+)\d+$/.exec(reference);
  if (!match) throw new Error(`Invalid XLSX cell reference '${reference}'`);
  return match[1];
}

function parseCells(
  rowXml: string,
  strings: readonly string[],
): Map<string, string | number> {
  const cells = new Map<string, string | number>();
  for (const match of rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const reference = /\br="([^"]+)"/.exec(match[1])?.[1];
    if (!reference) continue;
    const value = /<v>([\s\S]*?)<\/v>/.exec(match[2])?.[1];
    if (value === undefined) continue;
    const column = cellColumn(reference);
    if (/\bt="s"/.test(match[1])) {
      const index = Number(value);
      const text = strings[index];
      if (text === undefined) {
        throw new Error(`XLSX shared-string index ${index} is out of bounds`);
      }
      cells.set(column, text);
    } else {
      const number = Number(value);
      cells.set(column, Number.isFinite(number) ? number : decodeXml(value));
    }
  }
  return cells;
}

const MONTHS: Readonly<Record<string, string>> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

function normalizeMonth(value: string): string | undefined {
  const match = /^([A-Z][a-z]{2})-(\d{2})(?:[pr])?$/.exec(value);
  if (!match || !MONTHS[match[1]]) return undefined;
  const year = Number(match[2]);
  return `${year >= 80 ? 1900 + year : 2000 + year}-${MONTHS[match[1]]}`;
}

export interface CensusDataCenterConstructionRow {
  month: string;
  seasonallyAdjustedAnnualRateMillionUsd: number;
  sourceRow: number;
}

export function parseCensusDataCenterConstructionWorkbook(
  raw: Uint8Array,
): CensusDataCenterConstructionRow[] {
  const strings = sharedStrings(
    new TextDecoder().decode(extractZipEntry(raw, 'xl/sharedStrings.xml')),
  );
  const sheet = new TextDecoder().decode(
    extractZipEntry(raw, 'xl/worksheets/sheet1.xml'),
  );
  const rows = [...sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)].map(
    (match) => ({
      number: Number(/\br="(\d+)"/.exec(match[1])?.[1]),
      cells: parseCells(match[2], strings),
    }),
  );
  const header = rows.find(({ number }) => number === 4);
  if (header?.cells.get('A') !== 'Date' || header.cells.get('J') !== 'Data center') {
    throw new Error(
      'Census workbook schema changed: expected Date in A4 and Data center in J4',
    );
  }
  const result: CensusDataCenterConstructionRow[] = [];
  for (const row of rows) {
    const monthValue = row.cells.get('A');
    const dataCenterValue = row.cells.get('J');
    if (typeof monthValue !== 'string') continue;
    const month = normalizeMonth(monthValue);
    if (!month) continue;
    if (typeof dataCenterValue !== 'number' || dataCenterValue < 0) continue;
    result.push({
      month,
      seasonallyAdjustedAnnualRateMillionUsd: dataCenterValue,
      sourceRow: row.number,
    });
  }
  if (result.length < 24) {
    throw new Error('Census workbook yielded too few monthly data-center observations');
  }
  return result.sort((left, right) => left.month.localeCompare(right.month));
}
