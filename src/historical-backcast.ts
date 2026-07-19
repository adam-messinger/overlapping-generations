/**
 * Observed world series 1990-2025 and the growth-backcast runner.
 *
 * Used by scripts/growth-backcast.ts (diagnostic report) and by the
 * calibration-pinning test in production.test.ts. The production module's
 * efficiency series (endUseEfficiency0 at the 1990 anchor, growing at
 * serviceEfficiencyGrowth — the same rate as demand's autonomous intensity
 * decline) must reproduce observed 2025 GDP when driven with observed
 * inputs. Changing production elasticities, efficiency params, or this
 * data breaks the pin rather than silently decalibrating the model.
 *
 * All values approximate (±5-10%); the backcast conclusions rest on
 * growth-rate gaps several times that uncertainty. Sources:
 * - GDP: World Bank WDI, GDP PPP constant 2017 intl $ (2025 = the model's
 *   $158T anchor, consistent with WDI 2023 ≈ $145T + IMF growth)
 * - Electricity generation: IEA WEO / Ember
 * - Total final consumption: IEA World Energy Balances (Mtoe × 11.63)
 * - Capital stock: Penn World Table 10.01 'cn' world aggregate, constant
 *   2017$ (2025 = the model's $553T anchor, K/Y ≈ 3.5)
 * - Working-age 20-64: UN World Population Prospects 2024
 * - College share of workforce: Barro-Lee attainment, interpolated
 */

import { productionModule, ProductionParams, ProductionOutputs } from './modules/production.js';

/** 5-year observation points, 1990-2025 */
export const BACKCAST_YEARS = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025];

export const OBSERVED_WORLD = {
  /** $T PPP, constant 2017 intl $ (2020 includes the covid dip) */
  gdp: [47.6, 55.6, 65.4, 79.5, 94.6, 111.5, 126.9, 158],
  /** TWh generated */
  electricity: [11860, 13170, 15440, 18240, 21530, 24250, 26940, 31500],
  /** TWh total final energy consumption */
  totalFinal: [72700, 76500, 81400, 90700, 100100, 106900, 110300, 119000],
  /** $T capital stock, constant 2017$ */
  capital: [160, 190, 225, 275, 340, 420, 495, 553],
  /** Billions aged 20-64 */
  workingAge: [2.79, 3.03, 3.27, 3.56, 3.87, 4.16, 4.45, 4.65],
  /** Tertiary attainment share of workforce */
  college: [0.10, 0.11, 0.12, 0.135, 0.15, 0.165, 0.18, 0.20],
};

/** Geometric interpolation of 5-year points to an annual series */
export function annualize(points: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const r = Math.pow(points[i + 1] / points[i], 1 / 5);
    for (let k = 0; k < 5; k++) out.push(points[i] * Math.pow(r, k));
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Delivered electricity ≈ generation less ~8% grid losses and own use */
export const DELIVERY_FACTOR = 0.92;

/**
 * The 1990 world second-law efficiency anchor (De Stercke 2014; Brockway
 * et al. 2018 place the recent level at ~0.20-0.25, which the calibrated
 * backcast reproduces endogenously — see growth-backcast.md).
 */
export const ETA_1990 = 0.15;

export interface GrowthBackcastResult {
  /** Predicted GDP $T for each year 1990..2025 */
  gdpPath: number[];
  /** Observed GDP $T for each year 1990..2025 */
  gdpObserved: number[];
  /** Final-year (2025) production outputs */
  final: ProductionOutputs;
  /** Annualized driving series */
  series: {
    electricity: number[];
    nonElectric: number[];
    totalFinal: number[];
    capital: number[];
    workingAge: number[];
    college: number[];
  };
}

/**
 * Drive the real production module from a 1990 anchor with the observed
 * world series. Damages, burdens, and system overheads are zeroed (small,
 * roughly constant shares — they net out of a growth-rate comparison).
 */
export function runGrowthBackcast(
  overrides: Partial<ProductionParams> = {}
): GrowthBackcastResult {
  const gdpObserved = annualize(OBSERVED_WORLD.gdp);
  const electricity = annualize(OBSERVED_WORLD.electricity);
  const totalFinal = annualize(OBSERVED_WORLD.totalFinal);
  const capital = annualize(OBSERVED_WORLD.capital);
  const workingAge = annualize(OBSERVED_WORLD.workingAge);
  const college = annualize(OBSERVED_WORLD.college);
  const nonElectric = totalFinal.map((t, i) => t - electricity[i] * DELIVERY_FACTOR);

  const params = productionModule.mergeParams({
    initialGDP: OBSERVED_WORLD.gdp[0],
    endUseEfficiency0: ETA_1990,
    ...overrides,
  });

  let state = productionModule.init(params);
  const gdpPath: number[] = [];
  let final!: ProductionOutputs;

  for (let i = 0; i < gdpObserved.length; i++) {
    const r = productionModule.step(
      state,
      {
        capitalStock: capital[i],
        effectiveWorkers: workingAge[i] * 1e9,
        totalGeneration: electricity[i],
        nonElectricEnergy: nonElectric[i],
        damages: 0,
        energyBurdenDamage: 0,
        foodStress: 0,
        resourceEnergy: 0,
        energySystemOverhead: 0,
        collegeShare: college[i],
        cdrEnergy: 0,
      },
      params,
      1990 + i,
      i
    );
    state = r.state;
    final = r.outputs;
    gdpPath.push(r.outputs.gdp);
  }

  return {
    gdpPath,
    gdpObserved,
    final,
    series: { electricity, nonElectric, totalFinal, capital, workingAge, college },
  };
}
