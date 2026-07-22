import {
  assertInternationalStatus,
  assertReadmeStatusCurrent,
  loadInternationalStatus,
  writeReadmeStatus,
} from '../src/international-status.js';

function main(): void {
  const args = new Set(process.argv.slice(2));
  const allowed = new Set(['--write-readme', '--help']);
  const unknown = [...args].filter((arg) => !allowed.has(arg));
  if (unknown.length > 0) {
    throw new Error('Unknown argument(s): ' + unknown.join(', '));
  }
  if (args.has('--help')) {
    console.log('Usage: npm run aging:status [-- --write-readme]');
    console.log('Validates canonical Japan/Italy status, artifact hashes, and README drift.');
    return;
  }

  const manifest = loadInternationalStatus();
  assertInternationalStatus(manifest);
  if (args.has('--write-readme')) writeReadmeStatus(manifest);
  assertReadmeStatusCurrent(manifest);

  for (const country of Object.values(manifest.countries)) {
    console.log(
      country.label + ': ' + country.overall.verdict.toUpperCase() + ' — ' +
      country.overall.claim,
    );
  }
  console.log('International validation status and README are current as of ' + manifest.asOf + '.');
}

main();
