/**
 * Sensitivity sweep over the model's two most consequential parameters:
 *
 * - gamma: the useful-energy output elasticity (Ayres-Warr default 0.55;
 *   mainstream cost-share logic implies ~0.05-0.08 because energy is ~5-8%
 *   of GDP)
 * - damageCoeff: the quadratic climate-damage coefficient (default 0.00536,
 *   the DICE-2023/Howard-Sterner midpoint; the growth-effects literature
 *   implies far larger values)
 *
 * The assumption audit found neither parameter's influence on headline
 * conclusions was documented anywhere. This sweep runs the full simulation
 * over a grid and writes a markdown report separating conclusions that are
 * robust across the grid from those that are artifacts of the defaults.
 *
 * Anchors:
 * - gamma 0.08: mainstream cost-share position
 * - gamma 0.25: intermediate (equal to the capital elasticity)
 * - gamma 0.40: low end of Kuemmel et al. (2010) 0.40-0.60 range
 * - gamma 0.55: Ayres & Warr (2009) default
 * - damage 0.003467: DICE-2023 (Barrage & Nordhaus 2024)
 * - damage 0.00536: model default (DICE/Howard-Sterner midpoint)
 * - damage 0.007438: Howard & Sterner (2017)
 * - damage 0.021: growth-effects-consistent (~6x DICE-2023, in the spirit
 *   of Bilal & Kaenzig 2024 / Burke-Hsiang-Miguel 2015)
 *
 * Usage: npx tsx scripts/gamma-damage-sensitivity.ts [--output=path.md]
 */

import { writeFileSync } from 'node:fs';
import { runSimulation } from '../src/index.js';

const GAMMAS = [0.08, 0.25, 0.40, 0.55] as const;
const DAMAGE_COEFFS = [
  { value: 0.003467, label: 'DICE-2023' },
  { value: 0.00536, label: 'default (midpoint)' },
  { value: 0.007438, label: 'Howard-Sterner' },
  { value: 0.021, label: 'growth-effects (~6x DICE)' },
] as const;

interface Cell {
  gamma: number;
  damageCoeff: number;
  gdp2050: number;
  gdp2100: number;
  warming2100: number;
  fossilShare2050: number;
  electrification2050: number;
  solar2050TW: number;
  damages2100: number;
  peakEnergyBurden: number;
}

function runCell(gamma: number, damage: { value: number; label: string }): Cell {
  const run = runSimulation({
    production: { gamma },
    climate: { damageCoeff: damage.value },
  });
  const at = (y: number) => run.results.find(r => r.year === y)!;
  const r2050 = at(2050);
  const r2100 = at(2100);
  return {
    gamma,
    damageCoeff: damage.value,
    gdp2050: r2050.gdp,
    gdp2100: r2100.gdp,
    warming2100: r2100.temperature,
    fossilShare2050: r2050.fossilShare,
    electrification2050: r2050.electrificationRate,
    solar2050TW: r2050.capacities.solar / 1000,
    damages2100: r2100.damages,
    peakEnergyBurden: Math.max(...run.results.map(r => r.energyBurden)),
  };
}

function table(
  cells: Cell[],
  metric: (c: Cell) => string,
  title: string,
): string {
  const lines: string[] = [`### ${title}`, ''];
  lines.push(`| γ \\ damage | ${DAMAGE_COEFFS.map(d => d.label).join(' | ')} |`);
  lines.push(`|---|${DAMAGE_COEFFS.map(() => '---:').join('|')}|`);
  for (const gamma of GAMMAS) {
    const row = DAMAGE_COEFFS.map(d => {
      const cell = cells.find(c => c.gamma === gamma && c.damageCoeff === d.value)!;
      return metric(cell);
    });
    const marker = gamma === 0.55 ? ' (default)' : '';
    lines.push(`| **${gamma}**${marker} | ${row.join(' | ')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function range(cells: Cell[], metric: (c: Cell) => number): { min: number; max: number } {
  const values = cells.map(metric);
  return { min: Math.min(...values), max: Math.max(...values) };
}

function main(): void {
  const outputArg = process.argv.find(a => a.startsWith('--output='));
  const outputPath = outputArg ? outputArg.slice('--output='.length) : 'scripts/gamma-damage-sensitivity.md';

  const cells: Cell[] = [];
  for (const gamma of GAMMAS) {
    for (const damage of DAMAGE_COEFFS) {
      const t0 = Date.now();
      const cell = runCell(gamma, damage);
      cells.push(cell);
      console.log(
        `gamma=${gamma} damage=${damage.value}: GDP2100=$${cell.gdp2100.toFixed(0)}T ` +
        `warming=${cell.warming2100.toFixed(2)}C fossil2050=${(cell.fossilShare2050 * 100).toFixed(1)}% ` +
        `(${((Date.now() - t0) / 1000).toFixed(1)}s)`,
      );
    }
  }

  const gdpRange = range(cells, c => c.gdp2100);
  const warmingRange = range(cells, c => c.warming2100);
  const fossilRange = range(cells, c => c.fossilShare2050);
  const elecRange = range(cells, c => c.electrification2050);
  const cellAt = (gamma: number, damage: { value: number }) =>
    cells.find(c => c.gamma === gamma && c.damageCoeff === damage.value)!;
  const defaultCell = cellAt(0.55, DAMAGE_COEFFS[1]);
  const mainstreamCell = cellAt(0.08, DAMAGE_COEFFS[0]);
  const pessimistCell = cellAt(0.08, DAMAGE_COEFFS[3]);

  // Per-gamma summary at default damages, with implied average growth —
  // the table docs/SENSITIVITY.md points at (generated here so it cannot
  // go stale against the grid).
  const growthTable = [
    '### GDP 2100 by γ at default damages',
    '',
    '| γ | GDP 2100 | implied 2025-2100 growth |',
    '|---|---:|---:|',
    ...GAMMAS.map(gamma => {
      const cell = cellAt(gamma, DAMAGE_COEFFS[1]);
      const growth = Math.pow(cell.gdp2100 / 158, 1 / 75) - 1;
      const marker = gamma === 0.55 ? ' (default)' : gamma === 0.08 ? ' (mainstream)' : '';
      return `| **${gamma}**${marker} | $${cell.gdp2100.toFixed(0)}T | ~${(growth * 100).toFixed(1)}%/yr |`;
    }),
    '',
  ].join('\n');

  const report = `# Gamma x damage-coefficient sensitivity

Generated by \`scripts/gamma-damage-sensitivity.ts\`. Full-simulation grid over
the useful-energy elasticity (gamma) and the quadratic climate-damage
coefficient — the two parameters the assumption audit identified as most
consequential and least constrained. Parameter anchors and sources are
documented in the script header; interpretation guidance in
\`docs/SENSITIVITY.md\`.

${table(cells, c => `$${c.gdp2100.toFixed(0)}T`, 'GDP 2100')}
${table(cells, c => `$${c.gdp2050.toFixed(0)}T`, 'GDP 2050')}
${table(cells, c => `${c.warming2100.toFixed(2)}°C`, 'Warming 2100')}
${table(cells, c => `${(c.fossilShare2050 * 100).toFixed(1)}%`, 'Fossil share of electricity 2050')}
${table(cells, c => `${(c.electrification2050 * 100).toFixed(1)}%`, 'Electrification rate 2050')}
${table(cells, c => `${c.solar2050TW.toFixed(0)} TW`, 'Solar capacity 2050')}
${table(cells, c => `${(c.damages2100 * 100).toFixed(1)}%`, 'Climate damages 2100 (fraction of GDP)')}
${table(cells, c => `${(c.peakEnergyBurden * 100).toFixed(1)}%`, 'Peak energy burden')}
${growthTable}
## Grid ranges

| Metric | Min | Max | Default cell |
|---|---:|---:|---:|
| GDP 2100 | $${gdpRange.min.toFixed(0)}T | $${gdpRange.max.toFixed(0)}T | $${defaultCell.gdp2100.toFixed(0)}T |
| Warming 2100 | ${warmingRange.min.toFixed(2)}°C | ${warmingRange.max.toFixed(2)}°C | ${defaultCell.warming2100.toFixed(2)}°C |
| Fossil share 2050 | ${(fossilRange.min * 100).toFixed(1)}% | ${(fossilRange.max * 100).toFixed(1)}% | ${(defaultCell.fossilShare2050 * 100).toFixed(1)}% |
| Electrification 2050 | ${(elecRange.min * 100).toFixed(1)}% | ${(elecRange.max * 100).toFixed(1)}% | ${(defaultCell.electrification2050 * 100).toFixed(1)}% |

Reference cells: mainstream (gamma 0.08, DICE-2023): GDP 2100 $${mainstreamCell.gdp2100.toFixed(0)}T, warming ${mainstreamCell.warming2100.toFixed(2)}°C. Pessimist (gamma 0.08, growth-effects damages): GDP 2100 $${pessimistCell.gdp2100.toFixed(0)}T, warming ${pessimistCell.warming2100.toFixed(2)}°C.
`;

  writeFileSync(outputPath, report);
  console.log(`\nReport written to ${outputPath}`);
}

main();
