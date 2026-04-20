/**
 * Bless-Baseline Script
 *
 * Promotes baselines/current.json → baselines/reference.json after the user
 * has reviewed the diff and accepts the change as intentional.
 *
 * This must be an explicit, manual operation. Never auto-blessed in CI.
 * Commit messages for reference updates should explain what moved and why —
 * otherwise blessing becomes a reflex that hides real regressions.
 *
 * Usage: npx tsx scripts/bless-baseline.ts
 */

import * as fs from 'fs';

const CURRENT = 'baselines/current.json';
const REFERENCE = 'baselines/reference.json';

if (!fs.existsSync(CURRENT)) {
  console.error(`Error: ${CURRENT} not found. Run 'npm run capture-baseline' first.`);
  process.exit(1);
}

fs.copyFileSync(CURRENT, REFERENCE);
console.log(`Blessed: ${CURRENT} → ${REFERENCE}`);
console.log('Commit the new reference with a paragraph explaining what moved and why.');
