import { resolve } from 'node:path';
import { runDataCenter2035Replay } from '../questions/data-center-2035/replay.js';
import { runHormuz2026Replay } from '../questions/hormuz-2026/replay.js';
import { runOutbreak2026Replay } from '../questions/outbreak-2026/replay.js';
import { ledgerHasHistory, loadForecastEnvironment } from './common.js';
import {
  refreshDataCenterForecast,
  type DataCenterRefreshResult,
} from './data-center.js';
import {
  refreshHormuzForecast,
  type HormuzRefreshResult,
} from './hormuz.js';
import {
  refreshOutbreakForecast,
  type OutbreakRefreshResult,
} from './outbreak.js';

export type RefreshPilot = 'outbreak' | 'data-center' | 'hormuz';
export type ForecastRefreshResult =
  | OutbreakRefreshResult
  | DataCenterRefreshResult
  | HormuzRefreshResult;

export function defaultRefreshRoot(pilot: RefreshPilot): string {
  return resolve(
    'var',
    'forecast-workbench',
    pilot === 'data-center'
      ? 'data-center-2035'
      : pilot === 'hormuz'
        ? 'hormuz-2026'
        : 'outbreak-2026',
  );
}

async function seedHistoricalReplay(
  pilot: RefreshPilot,
  root: string,
): Promise<boolean> {
  if (await ledgerHasHistory(root)) return false;
  if (pilot === 'outbreak') {
    await runOutbreak2026Replay({ root });
  } else if (pilot === 'data-center') {
    await runDataCenter2035Replay({ root });
  } else {
    await runHormuz2026Replay({ root });
  }
  return true;
}

export async function runForecastRefresh(options: {
  pilot: RefreshPilot;
  root?: string;
  envFile?: string;
}): Promise<ForecastRefreshResult & { seededHistoricalReplay: boolean }> {
  await loadForecastEnvironment(options.envFile);
  const root = resolve(options.root ?? defaultRefreshRoot(options.pilot));
  const seededHistoricalReplay = await seedHistoricalReplay(options.pilot, root);
  const result =
    options.pilot === 'outbreak'
      ? await refreshOutbreakForecast({ root })
      : options.pilot === 'data-center'
        ? await refreshDataCenterForecast({ root })
        : await refreshHormuzForecast({ root });
  return { ...result, seededHistoricalReplay };
}
