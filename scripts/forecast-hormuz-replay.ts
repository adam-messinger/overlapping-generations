import { resolve } from 'node:path';
import {
  runHormuz2026Replay,
} from '../src/forecasting/questions/hormuz-2026/replay.js';

const root = resolve(
  process.argv.find((argument) => argument.startsWith('--root='))
    ?.slice('--root='.length) ??
    'var/forecast-workbench/hormuz-2026',
);
const audit = process.argv
  .find((argument) => argument.startsWith('--audit='))
  ?.slice('--audit='.length);

console.log(JSON.stringify(await runHormuz2026Replay({
  root,
  ...(audit ? { auditDestination: resolve(audit) } : {}),
}), null, 2));
