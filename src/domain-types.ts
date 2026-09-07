/**
 * Domain-specific types for the energy/demographics simulation.
 *
 * These are kept out of the tsimulation package to keep the framework
 * fully domain-independent and reusable.
 */

/** Region identifiers */
export type Region = 'us' | 'oecd-ex-us' | 'china' | 'india' | 'latam' | 'seasia' | 'russia' | 'mena' | 'ssa';
export const REGIONS: Region[] = ['us', 'oecd-ex-us', 'china', 'india', 'latam', 'seasia', 'russia', 'mena', 'ssa'];

/** Display names for reports and scripts (row labels; column headers keep the short keys). */
export const REGION_NAMES: Record<Region, string> = {
  us: 'United States',
  'oecd-ex-us': 'OECD ex-US',
  china: 'China',
  india: 'India + South Asia',
  latam: 'Latin America',
  seasia: 'SE Asia + Pacific',
  russia: 'Russia + CIS',
  mena: 'MENA',
  ssa: 'Sub-Saharan Africa',
};

/** Energy source identifiers */
export type EnergySource = 'solar' | 'wind' | 'gas' | 'coal' | 'nuclear' | 'hydro' | 'battery';
export const ENERGY_SOURCES: EnergySource[] = ['solar', 'wind', 'gas', 'coal', 'nuclear', 'hydro', 'battery'];

/** Fuel types for non-electric energy */
export type Fuel = 'oil' | 'gas' | 'coal' | 'biomass' | 'hydrogen' | 'biofuel';
export const FUELS: Fuel[] = ['oil', 'gas', 'coal', 'biomass', 'hydrogen', 'biofuel'];

/** Mineral types */
export type Mineral = 'copper' | 'lithium' | 'rareEarths' | 'steel';
export const MINERALS: Mineral[] = ['copper', 'lithium', 'rareEarths', 'steel'];

/**
 * Highest schooling stage completed at workforce entry. Ordered: each band
 * completes every stage below it, so cumulative schooling cost is a prefix sum.
 */
export type EducationBand = 'primary' | 'secondary' | 'tertiary' | 'advanced';
export const EDUCATION_BANDS: EducationBand[] = ['primary', 'secondary', 'tertiary', 'advanced'];
