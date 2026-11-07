/**
 * What would the model's safe-rate, growth and fiscal settings have to be to
 * reproduce the 2026-11-07 "Bifurcated Bloc Capitalism" Tetlock panel?
 *
 * Panel medians (2026-2045): G7 equilibrium real rate 1.18% (2036-45 average;
 * P10-P90 -0.05..2.30), advanced-economy public debt 110% -> 147% of GDP by
 * 2045 (P10-P90 115.5..182.5), OECD+China real GDP per capita +1.60%/yr
 * (P10-P90 0.81..2.57).
 *
 * The model is a world aggregate, so the debt target is read as the RATIO
 * debt2045/debt2025 (147/110 = 1.34), applied to the model's world 0.90.
 * Growth is read as us + oecd-ex-us + china PPP GDP per capita. The rate is
 * the model's world safeRate, anchored to world trend growth.
 *
 * Grid: production.gamma x production.serviceEfficiencyGrowth (growth),
 * capital.safeRateGrowthPassThrough, safeRateDebtSensitivity, neutralSafeRate
 * (rate) and capital.ageingCostDeficitShare (fiscal). Writes one JSON line per
 * run; results are summarized in docs/SAFE_RATE_BACKCAST.md section 2.
 *
 * Usage: npx tsx scripts/safe-rate-forecast-match.ts <out.jsonl>   (~1,080 runs, ~10-15 min)
 */
import { runSimulation, type MacroYearResult } from '../src/simulation.js';
import { appendFileSync, writeFileSync } from 'node:fs';

const out = process.argv[2];
if (!out) throw new Error('usage: safe-rate-forecast-match.ts <out.jsonl>');
writeFileSync(out, '');

const OPTS = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
const BLOC = ['us', 'oecd-ex-us', 'china'] as const;

const GROWTH: [gamma: number, eff: number][] = [
  [0.55, 0.0129], [0.30, 0.0129], [0.15, 0.0129], [0.08, 0.0129],
  [0.55, 0.009], [0.30, 0.009], [0.15, 0.009], [0.08, 0.009],
];

for (const [gamma, eff] of GROWTH)
  for (const c of [0, 0.5, 1, 2, 3])
    for (const s of [0.03, 0.065, 0.10])
      for (const z of [0.010, 0.015, 0.020])
        for (const ag of [0.25, 0.5, 1.0]) {
          const params = {
            production: { gamma, serviceEfficiencyGrowth: eff },
            capital: { safeRateGrowthPassThrough: c, safeRateDebtSensitivity: s, neutralSafeRate: z, ageingCostDeficitShare: ag },
          };
          const row: Record<string, unknown> = { gamma, eff, c, s, z, ag };
          try {
            const res = runSimulation(params as never, OPTS).results as MacroYearResult[];
            const at = (y: number) => {
              const r = res.find((x) => x.year === y);
              if (!r) throw new Error(`missing ${y}`);
              return r;
            };
            const perCap = (y: number) =>
              BLOC.reduce((a, r) => a + at(y).regionalGdp[r], 0) / BLOC.reduce((a, r) => a + at(y).regionalPopulation[r], 0);
            const window = res.filter((r) => r.year >= 2036 && r.year <= 2045);
            Object.assign(row, {
              safe26: at(2026).safeRate * 100,
              safe: (window.reduce((a, r) => a + r.safeRate, 0) / window.length) * 100,
              debt25: at(2025).publicDebtGDP,
              debt45: at(2045).publicDebtGDP,
              debt60: at(2060).publicDebtGDP,
              pcg: ((perCap(2045) / perCap(2026)) ** (1 / 19) - 1) * 100,
              wg: ((at(2045).gdp / at(2026).gdp) ** (1 / 19) - 1) * 100,
              repr45: res.filter((r) => r.year <= 2045 && r.repressionGap > 1e-4).length,
              repr60: res.filter((r) => r.year <= 2060 && r.repressionGap > 1e-4).length,
            });
          } catch (e) {
            row.error = String((e as Error).message).slice(0, 160);
          }
          appendFileSync(out, JSON.stringify(row) + '\n');
        }
