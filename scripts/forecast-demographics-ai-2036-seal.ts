/**
 * Seals the Demographics x AI 2036 panel runs into a forecast-workbench ledger.
 *
 *   npm run forecast:demographics-ai-2036-seal -- \
 *     --root=var/forecast-workbench/demographics-ai-2036 \
 *     --audit=docs/forecasts/demographics-ai-2036/sealed-audit
 *
 * Run ONCE: sealing is append-only, and re-registering the questions into the
 * same root fails by design.
 */
import { resolve } from 'node:path';
import { SystemClock } from 'forecast-workbench';
import { sealDemographicsAi2036 } from '../src/forecasting/questions/demographics-ai-2036/seal.js';

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const root = resolve(arg('root') ?? 'var/forecast-workbench/demographics-ai-2036');
const audit = arg('audit');

console.log(JSON.stringify(await sealDemographicsAi2036({
  root,
  forecastDir: resolve('docs/forecasts/demographics-ai-2036'),
  clock: new SystemClock(),
  ...(audit ? { auditDestination: resolve(audit) } : {}),
}), null, 2));
