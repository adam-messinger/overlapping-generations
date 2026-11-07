/**
 * 2025 Magnitude Anchors
 *
 * Each anchor compares one 2025 model output with an independent observed
 * number, within a multiplicative band. The bands are deliberately loose:
 * this is not calibration (the near-term validation gate and the regression
 * baseline do that) but an order-of-magnitude tripwire. Unit and intensity
 * errors in this project's history were 183x (lithium kg/GWh), ~1000x
 * (battery copper), 1e9 (the CDR social cost of carbon), ~14x (mining
 * capacity against a transition-only demand) and ~3.5x (fuel-scale TWh
 * consumed as electricity); every one moves a 2025 aggregate far outside a
 * 1.1-1.5x band on day one, while ordinary recalibration does not.
 *
 * An anchor reads model OUTPUTS that intensities and shares produce, not the
 * inputs that set them: copper demand comes out of kg/MW, GDP intensity and
 * recycling, so anchoring it to mine production checks all three.
 *
 * Run `npx tsx src/calibration-anchors.ts` for the table.
 */

import { getOutputsAtYear } from 'tsimulation';
import { runAutowiredSimulation } from './simulation-autowired.js';
import type { SimulationParams } from './simulation.js';

export interface MagnitudeAnchor {
  name: string;
  unit: string;
  /** Observed value the model's 2025 output is compared with. */
  observed: number;
  /** Where the observed value comes from: value, source, year. */
  source: string;
  /** The model must sit within [observed / factor, observed x factor]. */
  factor: number;
  read(outputs: Record<string, any>): number;
}

export const MAGNITUDE_ANCHORS: readonly MagnitudeAnchor[] = [
  {
    name: 'world population', unit: 'people', observed: 8.23e9, factor: 1.05,
    source: '8.23B mid-2025, UN World Population Prospects 2024',
    read: (o) => o.population,
  },
  {
    name: 'total final energy', unit: 'TWh/year', observed: 123_000, factor: 1.15,
    source: '~444 EJ total final consumption, IEA World Energy Balances 2023',
    read: (o) => o.totalFinalEnergy,
  },
  {
    name: 'electricity generation', unit: 'TWh/year', observed: 30_850, factor: 1.15,
    source: '30,850 TWh in 2024, Ember Global Electricity Review 2025',
    read: (o) => o.totalGeneration,
  },
  {
    name: 'electricity share of final energy', unit: 'fraction', observed: 0.21, factor: 1.15,
    source: '~20-22% electricity in final consumption, IEA World Energy Outlook 2024',
    read: (o) => o.electrificationRate,
  },
  {
    name: 'fossil share of generation', unit: 'fraction', observed: 0.59, factor: 1.1,
    source: '~59% fossil generation in 2024, Ember Global Electricity Review 2025',
    read: (o) => o.fossilShare,
  },
  {
    name: 'grid carbon intensity', unit: 'kgCO2/MWh', observed: 473, factor: 1.2,
    source: '473 gCO2/kWh in 2024, Ember Global Electricity Review 2025',
    read: (o) => o.gridIntensity,
  },
  {
    name: 'fossil CO2 (power + non-electric)', unit: 'GtCO2/year', observed: 37.4, factor: 1.15,
    source: '37.4 GtCO2 fossil and cement in 2024, Global Carbon Budget 2024',
    read: (o) => o.electricityEmissions + o.nonElectricEmissions,
  },
  {
    name: 'atmospheric CO2', unit: 'ppm', observed: 427, factor: 1.02,
    source: '424.6 ppm 2024 annual mean rising ~2.5 ppm/yr, NOAA GML',
    read: (o) => o.co2ppm,
  },
  {
    name: 'warming above preindustrial', unit: 'Δ°C', observed: 1.4, factor: 1.15,
    source: '1.36 C human-induced in 2024 (Forster et al. 2025, Indicators of Global Climate Change); 1.55 C observed 2024 (WMO)',
    read: (o) => o.temperature,
  },
  {
    name: 'solar PV capacity', unit: 'GW', observed: 2_450, factor: 1.3,
    source: '1,865 GW end-2024 (IRENA Renewable Capacity Statistics 2025) plus ~600 GW added in 2025 (IEA Renewables 2025)',
    read: (o) => o.capacities.solar,
  },
  {
    name: 'wind capacity', unit: 'GW', observed: 1_133, factor: 1.25,
    source: '1,133 GW end-2024, IRENA Renewable Capacity Statistics 2025',
    read: (o) => o.capacities.wind,
  },
  {
    name: 'coal power capacity', unit: 'GW', observed: 2_175, factor: 1.2,
    source: '~2,175 GW operating, Global Energy Monitor Coal Plant Tracker 2025',
    read: (o) => o.capacities.coal,
  },
  {
    name: 'datacenter electricity', unit: 'TWh/year', observed: 415, factor: 1.5,
    source: '~415 TWh in 2024, IEA Energy and AI (2025)',
    read: (o) => o.dataCenterLoadTWh,
  },
  {
    name: 'primary copper demand', unit: 'Mt/year', observed: 23, factor: 1.3,
    source: '~23 Mt world mine production, USGS Mineral Commodity Summaries 2026',
    read: (o) => o.minerals.copper.demand,
  },
  {
    name: 'ore-based steel', unit: 'Mt/year', observed: 1_340, factor: 1.3,
    source: '1,882 Mt crude steel 2024 less the ~29% scrap-fed EAF share, worldsteel 2025',
    read: (o) => o.minerals.steel.demand,
  },
  {
    name: 'agricultural land', unit: 'Mha', observed: 4_780, factor: 1.1,
    source: '~4.78 Gha cropland + permanent pasture, FAOSTAT 2022',
    read: (o) => o.land.farmland,
  },
  {
    name: 'forest area', unit: 'Mha', observed: 4_060, factor: 1.1,
    source: '4.06 Gha, FAO Global Forest Resources Assessment 2020',
    read: (o) => o.land.forest,
  },
];

export interface AnchorReading {
  anchor: MagnitudeAnchor;
  model: number;
  /** model / observed */
  ratio: number;
  within: boolean;
}

/** Read every anchor off a run's 2025 outputs. */
export function readAnchors(params: SimulationParams = {}): AnchorReading[] {
  const result = runAutowiredSimulation(
    { ...params, endYear: 2025 },
    { diagnostics: false, paramLiveness: 'off' },
  );
  const outputs = getOutputsAtYear(result, 0);
  return MAGNITUDE_ANCHORS.map((anchor) => {
    const model = anchor.read(outputs);
    const ratio = model / anchor.observed;
    const within = Number.isFinite(ratio) && ratio >= 1 / anchor.factor && ratio <= anchor.factor;
    return { anchor, model, ratio, within };
  });
}

if (process.argv[1]?.endsWith('calibration-anchors.ts')) {
  for (const { anchor, model, ratio, within } of readAnchors()) {
    console.log(
      `${within ? 'ok  ' : 'FAIL'} ${anchor.name.padEnd(36)} model ${model.toPrecision(4).padStart(9)} ` +
      `observed ${anchor.observed.toPrecision(4).padStart(9)} ${anchor.unit.padEnd(11)} ` +
      `ratio ${ratio.toFixed(2)} (band x${anchor.factor})`,
    );
  }
}
