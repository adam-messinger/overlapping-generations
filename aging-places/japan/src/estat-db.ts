import * as zlib from 'node:zlib';

export interface EstatItem {
  code: string;
  name: string;
  unitName?: string;
  explanation?: string;
}

export interface EstatMatter {
  matterId: number;
  matterName: string;
  tableName: string;
  dispTableName: string;
  positionNum: string;
  position: 'row' | 'col' | 'top';
  total: number;
  listData: Record<string, EstatItem>;
}

export interface EstatModel {
  matters: Record<string, EstatMatter>;
  annotationFlg: number;
  rowNoDataDispFlg: number;
  colNoDataDispFlg: number;
  commaType: number;
  replaceSpChars: number;
  graphAxis: string;
  graphBasis: string;
  graphSort: string;
  graphTitle: string;
  graphType: string;
}

export interface EstatLayout {
  rows: number[];
  cols: number[];
  tops: number[];
  selectedCodes: Record<number, string[]>;
}

interface MatterRequest {
  matterId: number;
  tableName: string;
  dispTableName: string;
  positionNum: string;
  listData: Array<EstatItem>;
  allSelected: number;
}

export interface EstatRequest {
  rows: MatterRequest[];
  cols: MatterRequest[];
  tops: MatterRequest[];
  apiTops?: MatterRequest[];
  annotationFlg: number;
  rowNoDataDispFlg: number;
  colNoDataDispFlg: number;
  commaType: number;
  replaceSpChars: number;
  graphAxis: string;
  graphBasis: string;
  graphSort: string;
  graphTitle: string;
  graphType: string;
  inputNumberOfCols: number;
  inputNumberOfRows: number;
  movementId: number;
  leftMoveFlg: number;
  rightMoveFlg: number;
  underMoveFlg: number;
  upMoveFlg: number;
  currentCols: null;
  currentRows: null;
  mode: 'table';
}

export interface EstatTableRow {
  code: string;
  name: string;
  values: Array<number | null>;
}

export interface EstatFetchResult {
  modelText: string;
  resultText: string;
  model: EstatModel;
  tableHtml: string;
  rows: EstatTableRow[];
}

const COMPRESSED_FIELDS = new Set(['rows', 'cols', 'tops', 'apiTops', 'topsAll', 'viewTops']);

function matterById(model: EstatModel, matterId: number): EstatMatter {
  const matter = Object.values(model.matters).find((candidate) => candidate.matterId === matterId);
  if (!matter) throw new Error(`e-Stat model is missing matter ${matterId}`);
  return matter;
}

function selectedItems(matter: EstatMatter, codes: string[] | undefined): EstatItem[] {
  const items = Object.values(matter.listData);
  if (codes === undefined) return items;
  const byCode = new Map(items.map((item) => [item.code, item]));
  return codes.map((code) => {
    const item = byCode.get(code);
    if (!item) throw new Error(`${matter.matterName} is missing selected code ${code}`);
    return item;
  });
}

function matterRequest(
  model: EstatModel,
  matterId: number,
  positionNum: number,
  selectedCodes: Record<number, string[]>,
  pickOne: boolean,
): MatterRequest {
  const matter = matterById(model, matterId);
  const codes = selectedCodes[matterId];
  const items = selectedItems(matter, codes).map((item) => ({
    name: item.name,
    code: item.code,
    unitName: item.unitName,
    explanation: item.explanation,
  }));
  if (pickOne && items.length !== 1) {
    throw new Error(`${matter.matterName} must select exactly one page-top item, found ${items.length}`);
  }
  return {
    matterId,
    tableName: matter.tableName,
    dispTableName: matter.dispTableName,
    positionNum: String(positionNum),
    listData: items,
    allSelected: codes === undefined || codes.length === matter.total ? 1 : 0,
  };
}

/** Build the same request shape as e-Stat's table UI, with an explicit layout. */
export function buildEstatRequest(
  model: EstatModel,
  layout: EstatLayout,
  includeApiTops = false,
): EstatRequest {
  // e-Stat numbers row and column positions from one. Page-top matters use
  // zero; preserving that convention is required when a UI-default top
  // dimension (such as municipality) is deliberately moved into the table.
  const axis = (ids: number[], top = false, pickOne = false): MatterRequest[] => ids.map(
    (matterId, index) => matterRequest(
      model, matterId, top ? 0 : index + 1, layout.selectedCodes, pickOne,
    ),
  );
  const request: EstatRequest = {
    rows: axis(layout.rows),
    cols: axis(layout.cols),
    tops: axis(layout.tops, true, includeApiTops),
    annotationFlg: model.annotationFlg,
    rowNoDataDispFlg: model.rowNoDataDispFlg,
    colNoDataDispFlg: model.colNoDataDispFlg,
    commaType: model.commaType,
    replaceSpChars: model.replaceSpChars,
    graphAxis: model.graphAxis,
    graphBasis: model.graphBasis,
    graphSort: model.graphSort,
    graphTitle: model.graphTitle,
    graphType: model.graphType,
    inputNumberOfCols: 99_999,
    inputNumberOfRows: 99_999,
    movementId: 0,
    leftMoveFlg: 0,
    rightMoveFlg: 0,
    underMoveFlg: 0,
    upMoveFlg: 0,
    currentCols: null,
    currentRows: null,
    mode: 'table',
  };
  if (includeApiTops) {
    request.apiTops = axis(layout.tops, true);
  }
  return request;
}

/** e-Stat expects each axis as gzip-compressed JSON inside form encoding. */
export function estatForm(request: EstatRequest): URLSearchParams {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(request)) {
    if (COMPRESSED_FIELDS.has(key)) {
      form.set(key, zlib.gzipSync(JSON.stringify(value)).toString('base64'));
    } else {
      form.set(key, value === null ? '' : String(value));
    }
  }
  return form;
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function htmlText(value: string): string {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function tableNumber(value: string): number | null {
  const cleaned = htmlText(value).replace(/[,+%]/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '***' || cleaned === '**') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parse the simple rectangular table returned by the e-Stat UI endpoint. */
export function parseEstatTable(html: string): EstatTableRow[] {
  const tbody = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1];
  if (!tbody) throw new Error('e-Stat response is missing a table body');
  const rows: EstatTableRow[] = [];
  for (const match of tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const body = match[1];
    const header = body.match(
      /<th\b[^>]*class="[^"]*js-dbview-rows[^"]*"[^>]*data-unique="([^"]+)"[^>]*>([\s\S]*?)<\/th>/i,
    );
    if (!header) continue;
    const values = [...body.matchAll(/<td\b[^>]*class="[^"]*stat-dbview-value[^"]*"[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((cell) => tableNumber(cell[1]));
    rows.push({ code: decodeHtml(header[1]), name: htmlText(header[2]), values });
  }
  if (rows.length === 0) throw new Error('e-Stat response contains no data rows');
  const width = rows[0].values.length;
  if (width === 0 || rows.some((row) => row.values.length !== width)) {
    throw new Error('e-Stat response is not rectangular');
  }
  return rows;
}

function mergeCookies(current: Map<string, string>, setCookies: string[]): void {
  for (const value of setCookies) {
    const pair = value.split(';', 1)[0];
    const separator = pair.indexOf('=');
    if (separator > 0) current.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

/** Fetch one official e-Stat database table without requiring an API app ID. */
export async function fetchEstatTable(
  sid: string,
  layoutForModel: (model: EstatModel) => EstatLayout,
  timeoutMs = 60_000,
): Promise<EstatFetchResult> {
  const cookies = new Map<string, string>();
  const page = `https://www.e-stat.go.jp/dbview?sid=${sid}`;
  const call = async (url: string, init: RequestInit = {}): Promise<string> => {
    const headers = new Headers(init.headers);
    if (cookies.size > 0) {
      headers.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    }
    headers.set('referer', page);
    const response = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    mergeCookies(cookies, getSetCookie?.call(response.headers) ?? []);
    const body = await response.text();
    if (!response.ok) throw new Error(`e-Stat ${sid} returned HTTP ${response.status}: ${body.slice(0, 200)}`);
    return body;
  };

  await call(page);
  const formHeaders = {
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'x-requested-with': 'XMLHttpRequest',
  };
  const modelText = await call(`https://www.e-stat.go.jp/dbview/api_get_model?sid=${sid}`, {
    method: 'POST', headers: formHeaders, body: '',
  });
  const model = JSON.parse(modelText) as EstatModel;
  if (!model.matters) throw new Error(`e-Stat ${sid} returned an invalid model`);
  const layout = layoutForModel(model);
  const validationText = await call(`https://www.e-stat.go.jp/dbview/api_check_validate?sid=${sid}`, {
    method: 'POST', headers: formHeaders, body: estatForm(buildEstatRequest(model, layout)),
  });
  const validation = JSON.parse(validationText) as { error?: boolean; view?: string };
  if (validation.error) throw new Error(`e-Stat ${sid} rejected the table layout: ${htmlText(validation.view ?? '')}`);
  const resultText = await call(`https://www.e-stat.go.jp/dbview/api_get_result?sid=${sid}`, {
    method: 'POST', headers: formHeaders, body: estatForm(buildEstatRequest(model, layout, true)),
  });
  const result = JSON.parse(resultText) as { error?: boolean; message?: string; table?: string };
  if (result.error || !result.table) {
    throw new Error(`e-Stat ${sid} table request failed: ${result.message ?? 'missing table'}`);
  }
  return {
    modelText,
    resultText,
    model,
    tableHtml: result.table,
    rows: parseEstatTable(result.table),
  };
}
