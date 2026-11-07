/**
 * Derived Parameters
 *
 * Each entry is one quantity that two modules need, with the module that owns
 * it. The runner computes every target from the merged parameters before the
 * run (tsimulation's applyDerivations); setting a target explicitly is refused
 * unless the caller lists it in `SimulationParams.decouple`.
 *
 * These replace couplings the runner used to hand-write with `??=`. That form
 * let an explicit value, even the default, silently re-split the pair: the
 * efficiency series split this way cost a 3.6x GDP swing with the wrong sign
 * (7665fe1), and the ensemble wrapper hit the same trap by passing
 * serviceEfficiencyGrowth at its own default.
 */

import type { ParamDerivation } from 'tsimulation';
import { type Region, REGIONS } from './domain-types.js';
import { gdpWeightedIntensityDecline } from './modules/demand.js';
import { cdrDefaults } from './modules/cdr.js';

/** The climate sensitivity cdr.tcre's default was measured at (°C per CO2 doubling). */
export const TCRE_REFERENCE_SENSITIVITY = 3.0;

export const PARAM_DERIVATIONS: readonly ParamDerivation[] = [
  {
    target: 'production.serviceEfficiencyGrowth',
    from: ['demand.regions', 'demand.efficiencyMultiplier'],
    description:
      "Production's efficiency index and demand's intensity decline are one efficiency series seen " +
      'from two sides: eta rises at the GDP-weighted regional intensity decline times efficiencyMultiplier.',
    // Reads the two leaves per region it uses, so liveness credits only those
    derive: (read) => gdpWeightedIntensityDecline(Object.fromEntries(REGIONS.map((region) => [region, {
      gdp2025: read(`demand.regions.${region}.gdp2025`) as number,
      intensityDecline: read(`demand.regions.${region}.intensityDecline`) as number,
    }])) as Record<Region, { gdp2025: number; intensityDecline: number }>)
      * (read('demand.efficiencyMultiplier') as number),
  },
  {
    target: 'production.structuralEfficiencyShare',
    from: ['demand.structuralEfficiencyShare'],
    description:
      'The structural (catch-up) share of the one efficiency series must decay the same way on both ' +
      'sides, or the series re-splits and GDP collapses at high efficiencyMultiplier.',
    derive: (read) => read('demand.structuralEfficiencyShare'),
  },
  {
    target: 'production.structuralDecayHalfLife',
    from: ['demand.structuralDecayHalfLife'],
    description: 'The structural share decays with one half-life on both sides of the efficiency series.',
    derive: (read) => read('demand.structuralDecayHalfLife'),
  },
  {
    target: 'cdr.tcre',
    from: ['climate.sensitivity'],
    description:
      "CDR's SCC gate values the warming a ton causes; the climate module's emergent 75-yr TCRE scales " +
      '~linearly with sensitivity (0.00058 at 3.0, 0.00088 at 4.5).',
    derive: (read) => cdrDefaults.tcre * (read('climate.sensitivity') as number) / TCRE_REFERENCE_SENSITIVITY,
  },
  {
    target: 'cdr.damageCoeff',
    from: ['climate.damageCoeff'],
    description:
      "CDR's SCC gate values the damage a ton causes with the climate module's quadratic damage " +
      'coefficient; a scenario raising damages must raise the value of removal with them.',
    derive: (read) => read('climate.damageCoeff'),
  },
  {
    target: 'energy.gridLossFactor',
    from: ['dispatch.gridLossFactor'],
    description:
      'Energy plans capacity on the same generation basis dispatch serves; planning on another factor ' +
      'built the fleet ~25% short (4e24472).',
    derive: (read) => read('dispatch.gridLossFactor'),
  },
];
