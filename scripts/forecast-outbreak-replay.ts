import { resolve } from 'node:path';
import { runOutbreak2026Replay } from '../src/forecasting/questions/outbreak-2026/replay.js';

const root = resolve(
  process.argv.find((argument) => argument.startsWith('--root='))?.slice('--root='.length) ??
    'var/forecast-workbench/outbreak-2026',
);
const audit = process.argv
  .find((argument) => argument.startsWith('--audit='))
  ?.slice('--audit='.length);
const synthetic = process.argv
  .find((argument) => argument.startsWith('--synthetic-resolution='))
  ?.slice('--synthetic-resolution='.length);

const result = await runOutbreak2026Replay({
  root,
  ...(audit ? { auditDestination: resolve(audit) } : {}),
  ...(synthetic ? { syntheticResolutionValue: Number(synthetic) } : {}),
});

console.log(JSON.stringify(result, null, 2));
