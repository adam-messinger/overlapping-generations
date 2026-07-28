import { resolve } from 'node:path';
import {
  runDataCenter2035Replay,
} from '../src/forecasting/questions/data-center-2035/replay.js';

const root = resolve(
  process.argv.find((argument) => argument.startsWith('--root='))
    ?.slice('--root='.length) ??
    'var/forecast-workbench/data-center-2035',
);
const audit = process.argv
  .find((argument) => argument.startsWith('--audit='))
  ?.slice('--audit='.length);

console.log(JSON.stringify(await runDataCenter2035Replay({
  root,
  ...(audit ? { auditDestination: resolve(audit) } : {}),
}), null, 2));
