/**
 * Re-solve the 2025 new-build calibration (energy.ts, newBuildShareWeight).
 *
 * Seven parameters against seven 2025 additions, solved as a damped
 * multiplicative fixed point with the solar weight held at 1:
 *   newBuildShareWeight wind / hydro / gas / nuclear -> world additions
 *   newBuildShareWeight coal  -> rest-of-world coal (world ~95 less China 78.1)
 *   fossilDisplacementRate    -> China solar 315 GW (NEA)
 *   China firmAdequacy share  -> China coal 78.1 GW (GEM)
 * Targets and sources are in energy.ts beside newBuildShareWeight. Rerun this
 * whenever something that prices the 2025 build moves (fuel prices, WACC,
 * capex), then copy the printed values into energy.ts.
 *
 * Usage: npx tsx scripts/calibrate-2025-build.ts
 */
import { runSimulation } from '../src/index.js';
import { energyDefaults } from '../src/modules/energy.js';

const TARGET = {
  wind: 158.7,
  hydro: 18.4,
  gas: 60.4,
  nuclear: 4.4,
  coalWorld: 95,
  chinaSolar: 315,
  chinaCoal: 78.1,
};

const weights = { ...energyDefaults.newBuildShareWeight };
let displacement = energyDefaults.fossilDisplacementRate;
let chinaShare = energyDefaults.regional.china.firmAdequacy?.share ?? 1;

function additions2025() {
  const result = runSimulation(
    {
      startYear: 2025,
      endYear: 2025,
      energy: {
        newBuildShareWeight: weights,
        fossilDisplacementRate: displacement,
        regional: { china: { firmAdequacy: { source: 'coal', share: chinaShare } } },
      },
    } as any,
    { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as any,
  ) as any;
  const adds = result.results[0].regionalAdditions as Record<string, Record<string, number>>;
  const world = (s: string) => Object.values(adds).reduce((sum, a) => sum + a[s], 0);
  return {
    wind: world('wind'),
    hydro: world('hydro'),
    gas: world('gas'),
    nuclear: world('nuclear'),
    coalWorld: world('coal'),
    chinaSolar: adds.china.solar,
    chinaCoal: adds.china.coal,
    worldSolar: world('solar'),
  };
}

const DAMP = 0.7;
let prevShare: number | undefined;
let prevChinaCoal = 0;
let m = additions2025();
for (let i = 0; i < 60; i++) {
  for (const s of ['wind', 'hydro', 'gas', 'nuclear'] as const) {
    weights[s] *= Math.pow(TARGET[s] / Math.max(1e-6, m[s]), DAMP);
  }
  const rowCoalTarget = TARGET.coalWorld - TARGET.chinaCoal;
  const rowCoal = Math.max(1e-6, m.coalWorld - m.chinaCoal);
  weights.coal *= Math.pow(rowCoalTarget / rowCoal, DAMP);
  displacement *= Math.pow(TARGET.chinaSolar / Math.max(1e-6, m.chinaSolar), DAMP);
  // China coal is a gap-filler: ~2,000 GW of build per unit of share, so a
  // multiplicative step overshoots. Damped secant on the observed slope.
  const slope = prevShare !== undefined && Math.abs(chinaShare - prevShare) > 1e-9
    ? (m.chinaCoal - prevChinaCoal) / (chinaShare - prevShare)
    : 2000;
  prevShare = chinaShare;
  prevChinaCoal = m.chinaCoal;
  chinaShare = Math.min(1.5, Math.max(0.5,
    chinaShare + 0.7 * (TARGET.chinaCoal - m.chinaCoal) / Math.max(200, slope)));
  m = additions2025();
  if (process.env.VERBOSE) console.log(i, Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.toFixed(1)])), chinaShare.toFixed(4));
  const err = Math.max(
    ...(['wind', 'hydro', 'gas', 'nuclear', 'coalWorld', 'chinaSolar', 'chinaCoal'] as const)
      .map((k) => Math.abs(m[k] / TARGET[k] - 1)),
  );
  if (err < 0.002) break;
}

const round = (x: number, d: number) => Number(x.toPrecision(d));
console.log('2025 additions (GW):', Object.fromEntries(Object.entries(m).map(([k, v]) => [k, round(v, 4)])));
console.log('newBuildShareWeight:', Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, round(v, 3)])));
console.log('fossilDisplacementRate:', round(displacement, 3));
console.log('china firmAdequacy share:', round(chinaShare, 3));
