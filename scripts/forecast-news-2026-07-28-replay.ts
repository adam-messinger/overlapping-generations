import { resolve } from 'node:path';
import { runDailyNews20260728Replay } from '../src/forecasting/news/2026-07-28/replay.js';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(
    prefix.length,
  );
}

const root = resolve(
  argument('root') ?? 'var/forecast-workbench/news-2026-07-28',
);
const audit = resolve(
  argument('audit') ??
    'var/forecast-workbench/audits/news-2026-07-28',
);

const result = await runDailyNews20260728Replay({
  root,
  auditDestination: audit,
});

console.log(JSON.stringify({ root, audit, ...result }, null, 2));
