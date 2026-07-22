import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type ValidationVerdict = 'pass' | 'fail' | 'pending' | 'not_applicable';
export type HoldoutStatus = 'opened' | 'awaiting_data' | 'not_run';

export interface ArtifactReference {
  path: string;
  sha256: string;
}

export interface HoldoutStatusRecord {
  status: HoldoutStatus;
  openedOn?: string;
  verdict: ValidationVerdict;
  primary: boolean;
  artifact?: ArtifactReference;
  summary: string;
}

export interface CountryValidationStatus {
  label: string;
  protocol: {
    path: string;
    frozenCommit: string;
    status: 'frozen';
  };
  development: {
    status: 'complete';
    modelVersion: string;
    artifact: ArtifactReference;
    verdict: ValidationVerdict;
    summary: string;
  };
  holdouts: {
    workingAge: HoldoutStatusRecord;
    household: HoldoutStatusRecord;
    vacancy: HoldoutStatusRecord;
    landPrice: HoldoutStatusRecord;
  };
  overall: {
    verdict: ValidationVerdict;
    claim: string;
    basis: string;
  };
  remainingPermissibleWork: string[];
  nextModelRule: string;
}

export interface InternationalValidationStatus {
  schemaVersion: 1;
  asOf: string;
  authority: string;
  countries: {
    japan: CountryValidationStatus;
    italy: CountryValidationStatus;
  };
}

interface JapanDevelopmentArtifact {
  holdoutStatus?: string;
  scope?: {
    claim?: string;
  };
  windows?: Array<{
    fullMechanism?: {
      households?: unknown;
    };
  }>;
}

interface JapanHouseholdArtifact {
  scope?: string;
  primary?: {
    maeAnnualized?: {
      mechanismAllocation?: number;
      laggedHouseholdTrend?: number;
    };
    equalBasinSpearman?: {
      mechanismAllocation?: {
        meanWithinMarketSpearman?: number;
      };
      laggedHouseholdTrend?: {
        meanWithinMarketSpearman?: number;
      };
    };
  };
}

interface ItalyDevelopmentArtifact {
  status?: string;
  windows?: unknown[];
}

interface ItalyWorkingAgeArtifact {
  scope?: string;
  primary?: {
    maeAnnualized?: {
      mechanism?: number;
      scaledNoMigration?: number;
    };
    mechanismMinusLagged?: {
      ci95?: [number, number];
    };
  };
}

export const AGING_PLACES_ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
export const STATUS_MANIFEST_PATH = path.join(
  AGING_PLACES_ROOT,
  'data',
  'international-validation-status.json',
);
export const README_PATH = path.join(AGING_PLACES_ROOT, 'README.md');
export const STATUS_BLOCK_START = '<!-- INTERNATIONAL_STATUS:START -->';
export const STATUS_BLOCK_END = '<!-- INTERNATIONAL_STATUS:END -->';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveWithinRoot(root: string, relativePath: string): string | null {
  if (path.isAbsolute(relativePath)) return null;
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readArtifactJson<T>(
  root: string,
  reference: ArtifactReference | undefined,
  errors: string[],
): T | undefined {
  if (reference === undefined) return undefined;
  const resolved = resolveWithinRoot(root, reference.path);
  if (resolved === null || !fs.existsSync(resolved)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8')) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    errors.push('Artifact is not valid JSON: ' + reference.path + ' (' + detail + ')');
    return undefined;
  }
}

function validateArtifact(
  root: string,
  label: string,
  reference: ArtifactReference | undefined,
  errors: string[],
): void {
  if (reference === undefined) {
    errors.push(label + ' must reference a committed artifact.');
    return;
  }
  if (!/^[a-f0-9]{64}$/.test(reference.sha256)) {
    errors.push(label + ' has an invalid SHA-256.');
  }
  const resolved = resolveWithinRoot(root, reference.path);
  if (resolved === null) {
    errors.push(label + ' path escapes aging-places: ' + reference.path);
    return;
  }
  if (!fs.existsSync(resolved)) {
    errors.push(label + ' artifact does not exist: ' + reference.path);
    return;
  }
  const actual = sha256(resolved);
  if (actual !== reference.sha256) {
    errors.push(
      label + ' hash drifted: expected ' + reference.sha256 + ', got ' + actual +
      '. Regenerate the result and update the canonical status in the same change.',
    );
  }
}

function validateHoldoutState(
  root: string,
  label: string,
  holdout: HoldoutStatusRecord,
  errors: string[],
): void {
  if (holdout.status === 'opened') {
    if (holdout.openedOn === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(holdout.openedOn)) {
      errors.push(label + ' is opened but has no valid openedOn date.');
    }
    if (holdout.verdict === 'pending' || holdout.verdict === 'not_applicable') {
      errors.push(label + ' is opened but has no adjudicated pass/fail verdict.');
    }
    validateArtifact(root, label, holdout.artifact, errors);
    return;
  }

  if (holdout.artifact !== undefined) {
    errors.push(label + ' is ' + holdout.status + ' but references an opened-result artifact.');
  }
  if (holdout.openedOn !== undefined) {
    errors.push(label + ' is ' + holdout.status + ' but has an openedOn date.');
  }
  if (holdout.status === 'awaiting_data' && holdout.verdict !== 'pending') {
    errors.push(label + ' awaits data and must have a pending verdict.');
  }
  if (
    holdout.status === 'not_run' &&
    holdout.verdict !== 'pending' &&
    holdout.verdict !== 'not_applicable'
  ) {
    errors.push(label + ' has not run and cannot have a pass/fail verdict.');
  }
}

function validateCountry(
  root: string,
  key: 'japan' | 'italy',
  country: CountryValidationStatus,
  errors: string[],
): void {
  const prefix = country.label || key;
  const protocolPath = resolveWithinRoot(root, country.protocol.path);
  if (protocolPath === null || !fs.existsSync(protocolPath)) {
    errors.push(prefix + ' frozen protocol does not exist: ' + country.protocol.path);
  }
  if (!/^[a-f0-9]{7,40}$/.test(country.protocol.frozenCommit)) {
    errors.push(prefix + ' frozen protocol commit is invalid.');
  }
  if (country.protocol.status !== 'frozen') {
    errors.push(prefix + ' protocol must remain marked frozen.');
  }
  if (country.development.status !== 'complete') {
    errors.push(prefix + ' development status no longer matches the committed result.');
  }
  validateArtifact(root, prefix + ' development', country.development.artifact, errors);

  for (const [holdoutKey, holdout] of Object.entries(country.holdouts)) {
    validateHoldoutState(root, prefix + ' ' + holdoutKey + ' holdout', holdout, errors);
  }

  const failedPrimary = Object.values(country.holdouts).some(
    (holdout) => holdout.primary && holdout.verdict === 'fail',
  );
  if (failedPrimary && country.overall.verdict !== 'fail') {
    errors.push(prefix + ' has a failed primary holdout, so its overall verdict must be fail.');
  }
  if (country.overall.verdict === 'fail' && !failedPrimary) {
    errors.push(prefix + ' is marked failed without a failed primary holdout.');
  }
  if (country.remainingPermissibleWork.length === 0) {
    errors.push(prefix + ' must state what work remains permissible after outcome opening.');
  }
  if (country.nextModelRule.trim().length === 0) {
    errors.push(prefix + ' must state the post-opening model-version rule.');
  }
}

function validateArtifactSemantics(
  root: string,
  manifest: InternationalValidationStatus,
  errors: string[],
): void {
  const japan = manifest.countries.japan;
  const japanDevelopment = readArtifactJson<JapanDevelopmentArtifact>(
    root,
    japan.development.artifact,
    errors,
  );
  if (
    japanDevelopment !== undefined &&
    (
      !Array.isArray(japanDevelopment.windows) ||
      japanDevelopment.windows.length < 2 ||
      japanDevelopment.windows.some(
        (window) => !isRecord(window.fullMechanism) || window.fullMechanism.households === undefined,
      )
    )
  ) {
    errors.push('Japan development is marked complete but the artifact lacks full-mechanism household runs.');
  }
  if (
    japanDevelopment !== undefined &&
    (
      !japanDevelopment.holdoutStatus?.includes('development artifact scope only') ||
      !japanDevelopment.holdoutStatus.includes('live split-holdout state') ||
      japanDevelopment.scope?.claim?.startsWith('partial development diagnostic only')
    )
  ) {
    errors.push('Japan development artifact confuses its no-holdout input scope with live holdout status.');
  }

  const japanHousehold = readArtifactJson<JapanHouseholdArtifact>(
    root,
    japan.holdouts.household.artifact,
    errors,
  );
  if (japanHousehold !== undefined) {
    if (!japanHousehold.scope?.startsWith('HOUSEHOLD PRIMARY ONLY')) {
      errors.push('Japan household artifact does not identify its split holdout scope.');
    }
    if (japan.holdouts.household.status !== 'opened') {
      errors.push('Japan household result exists, so the household holdout must be marked opened.');
    }
    if (japan.holdouts.workingAge.status !== 'awaiting_data') {
      errors.push('Japan household-only artifact requires working age to remain awaiting_data.');
    }
    const mae = japanHousehold.primary?.maeAnnualized;
    const rank = japanHousehold.primary?.equalBasinSpearman;
    if (
      mae?.mechanismAllocation === undefined ||
      mae.laggedHouseholdTrend === undefined ||
      mae.mechanismAllocation <= mae.laggedHouseholdTrend ||
      rank?.mechanismAllocation?.meanWithinMarketSpearman === undefined ||
      rank.laggedHouseholdTrend?.meanWithinMarketSpearman === undefined ||
      rank.mechanismAllocation.meanWithinMarketSpearman >=
        rank.laggedHouseholdTrend.meanWithinMarketSpearman
    ) {
      errors.push('Japan household fail verdict no longer matches the committed MAE and rank metrics.');
    }
  }

  const italy = manifest.countries.italy;
  const italyDevelopment = readArtifactJson<ItalyDevelopmentArtifact>(
    root,
    italy.development.artifact,
    errors,
  );
  if (
    italyDevelopment !== undefined &&
    (
      !italyDevelopment.status?.includes('development windows only') ||
      !Array.isArray(italyDevelopment.windows) ||
      italyDevelopment.windows.length !== 2
    )
  ) {
    errors.push('Italy development artifact no longer matches its frozen two-window scope.');
  }

  const italyWorkingAge = readArtifactJson<ItalyWorkingAgeArtifact>(
    root,
    italy.holdouts.workingAge.artifact,
    errors,
  );
  if (italyWorkingAge !== undefined) {
    if (!italyWorkingAge.scope?.startsWith('WORKING-AGE PRIMARY')) {
      errors.push('Italy holdout artifact does not identify the working-age primary scope.');
    }
    if (italy.holdouts.workingAge.status !== 'opened') {
      errors.push('Italy working-age result exists, so its holdout must be marked opened.');
    }
    const mae = italyWorkingAge.primary?.maeAnnualized;
    const ci = italyWorkingAge.primary?.mechanismMinusLagged?.ci95;
    if (
      mae?.mechanism === undefined ||
      mae.scaledNoMigration === undefined ||
      mae.mechanism <= mae.scaledNoMigration ||
      ci === undefined ||
      ci[0] > 0
    ) {
      errors.push('Italy working-age fail verdict no longer matches the committed gate metrics.');
    }
  }
}

export function loadInternationalStatus(
  manifestPath: string = STATUS_MANIFEST_PATH,
): InternationalValidationStatus {
  const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!isRecord(parsed)) {
    throw new Error('International status manifest must be a JSON object.');
  }
  return parsed as unknown as InternationalValidationStatus;
}

export function collectInternationalStatusErrors(
  manifest: InternationalValidationStatus,
  root: string = AGING_PLACES_ROOT,
): string[] {
  const errors: string[] = [];
  if (manifest.schemaVersion !== 1) {
    errors.push('Unsupported international status schemaVersion: ' + String(manifest.schemaVersion));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.asOf)) {
    errors.push('Manifest asOf must be an ISO calendar date.');
  }
  if (manifest.authority.trim().length === 0) {
    errors.push('Manifest must explain its authority.');
  }
  validateCountry(root, 'japan', manifest.countries.japan, errors);
  validateCountry(root, 'italy', manifest.countries.italy, errors);
  validateArtifactSemantics(root, manifest, errors);
  return errors;
}

export function assertInternationalStatus(
  manifest: InternationalValidationStatus,
  root: string = AGING_PLACES_ROOT,
): void {
  const errors = collectInternationalStatusErrors(manifest, root);
  if (errors.length > 0) {
    throw new Error('International validation status is inconsistent:\n- ' + errors.join('\n- '));
  }
}

function verdictLabel(verdict: ValidationVerdict): string {
  if (verdict === 'not_applicable') return 'not applicable';
  return verdict;
}

function developmentCell(country: CountryValidationStatus): string {
  return '[Complete](' + country.development.artifact.path + ') — ' +
    verdictLabel(country.development.verdict);
}

function holdoutCell(holdout: HoldoutStatusRecord): string {
  if (holdout.status === 'opened') {
    return '[Opened ' + holdout.openedOn + '](' + holdout.artifact!.path + ') — **' +
      verdictLabel(holdout.verdict) + '**';
  }
  if (holdout.status === 'awaiting_data') return 'Awaiting official data — pending';
  return 'Not run — ' + verdictLabel(holdout.verdict);
}

function secondaryCell(country: CountryValidationStatus): string {
  return 'Vacancy: ' + holdoutCell(country.holdouts.vacancy) +
    '; land price: ' + holdoutCell(country.holdouts.landPrice);
}

export function renderInternationalStatusBlock(
  manifest: InternationalValidationStatus,
): string {
  const japan = manifest.countries.japan;
  const italy = manifest.countries.italy;
  return [
    STATUS_BLOCK_START,
    '## International validation status',
    '',
    '_Live status as of **' + manifest.asOf + '**. Generated from ' +
      '[the canonical status manifest](data/international-validation-status.json); ' +
      'frozen protocols and plans are historical records, not live-status sources._',
    '',
    '| Country | Development | Working-age holdout | Household holdout | Secondary outcomes | Overall |',
    '|---|---|---|---|---|---|',
    '| ' + japan.label + ' | ' + developmentCell(japan) + ' | ' +
      holdoutCell(japan.holdouts.workingAge) + ' | ' + holdoutCell(japan.holdouts.household) +
      ' | ' + secondaryCell(japan) + ' | **' + verdictLabel(japan.overall.verdict) + '** |',
    '| ' + italy.label + ' | ' + developmentCell(italy) + ' | ' +
      holdoutCell(italy.holdouts.workingAge) + ' | ' + holdoutCell(italy.holdouts.household) +
      ' | ' + secondaryCell(italy) + ' | **' + verdictLabel(italy.overall.verdict) + '** |',
    '',
    '- **Japan:** ' + japan.overall.basis + ' ' + japan.nextModelRule,
    '- **Italy:** ' + italy.overall.basis + ' ' + italy.nextModelRule,
    STATUS_BLOCK_END,
  ].join('\n');
}

export function extractInternationalStatusBlock(readme: string): string | null {
  const start = readme.indexOf(STATUS_BLOCK_START);
  const end = readme.indexOf(STATUS_BLOCK_END);
  if (start === -1 && end === -1) return null;
  if (start === -1 || end === -1 || end < start) {
    throw new Error('README contains an incomplete international-status marker pair.');
  }
  return readme.slice(start, end + STATUS_BLOCK_END.length);
}

export function updateReadmeStatusBlock(
  readme: string,
  manifest: InternationalValidationStatus,
): string {
  const rendered = renderInternationalStatusBlock(manifest);
  const existing = extractInternationalStatusBlock(readme);
  if (existing !== null) return readme.replace(existing, rendered);

  const layoutMarker = '\n## Layout\n';
  const insertion = readme.indexOf(layoutMarker);
  if (insertion === -1) {
    throw new Error('README has no international-status block and no Layout heading insertion point.');
  }
  return readme.slice(0, insertion).trimEnd() + '\n\n' + rendered + '\n' +
    readme.slice(insertion);
}

export function assertReadmeStatusCurrent(
  manifest: InternationalValidationStatus,
  readmePath: string = README_PATH,
): void {
  const readme = fs.readFileSync(readmePath, 'utf8');
  const committed = extractInternationalStatusBlock(readme);
  const expected = renderInternationalStatusBlock(manifest);
  if (committed !== expected) {
    throw new Error(
      'aging-places/README.md live-status block is missing or stale. Run npm run aging:status -- --write-readme.',
    );
  }
}

export function writeReadmeStatus(
  manifest: InternationalValidationStatus,
  readmePath: string = README_PATH,
): void {
  const readme = fs.readFileSync(readmePath, 'utf8');
  fs.writeFileSync(readmePath, updateReadmeStatusBlock(readme, manifest));
}
