/** Minimal dependency-free XLSX reader for the simple one-sheet e-Stat files.
 * XLSX is a ZIP of XML documents; `/usr/bin/unzip` is available on the
 * supported macOS/Linux research environments. Values remain strings so
 * municipality codes keep leading zeroes. */
import { execFileSync } from 'node:child_process';

function unzipText(file: string, member: string): string {
  return execFileSync('unzip', ['-p', file, member], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
}

export function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function cellReferenceToColumn(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) throw new Error(`invalid XLSX cell reference: ${reference}`);
  let value = 0;
  for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
  return value - 1;
}

function textRuns(xml: string): string {
  const values: string[] = [];
  for (const match of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) {
    values.push(decodeXml(match[1]));
  }
  return values.join('');
}

function sharedStrings(file: string): string[] {
  let xml: string;
  try {
    xml = unzipText(file, 'xl/sharedStrings.xml');
  } catch {
    return [];
  }
  return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)]
    .map((match) => textRuns(match[1]));
}

export function readXlsxRows(file: string, sheet = 'xl/worksheets/sheet1.xml'): string[][] {
  const strings = sharedStrings(file);
  const xml = unzipText(file, sheet);
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    const body = rowMatch[1];
    const cells = body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g);
    for (const cell of cells) {
      const attributes = cell[1];
      const reference = attributes.match(/\br="([^"]+)"/)?.[1];
      if (!reference) continue;
      const column = cellReferenceToColumn(reference);
      const type = attributes.match(/\bt="([^"]+)"/)?.[1];
      const cellBody = cell[2] ?? '';
      const raw = cellBody.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
      let value = decodeXml(raw);
      if (type === 's' && value !== '') value = strings[Number(value)] ?? '';
      else if (type === 'inlineStr') value = textRuns(cellBody);
      while (row.length <= column) row.push('');
      row[column] = value;
    }
    rows.push(row);
  }
  return rows;
}
