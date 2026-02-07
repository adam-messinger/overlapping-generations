/**
 * Domain-specific types for the energy/demographics simulation.
 *
 * These are separated from framework/types.ts to keep the framework
 * fully domain-independent and reusable.
 */

/** Region identifiers */
export type Region = 'oecd' | 'china' | 'india' | 'latam' | 'seasia' | 'russia' | 'mena' | 'ssa';
export const REGIONS: Region[] = ['oecd', 'china', 'india', 'latam', 'seasia', 'russia', 'mena', 'ssa'];

/** Energy source identifiers */
export type EnergySource = 'solar' | 'wind' | 'gas' | 'coal' | 'nuclear' | 'hydro' | 'battery';
export const ENERGY_SOURCES: EnergySource[] = ['solar', 'wind', 'gas', 'coal', 'nuclear', 'hydro', 'battery'];

/** Fuel types for non-electric energy */
export type Fuel = 'oil' | 'gas' | 'coal' | 'biomass' | 'hydrogen' | 'biofuel';
export const FUELS: Fuel[] = ['oil', 'gas', 'coal', 'biomass', 'hydrogen', 'biofuel'];

/** Mineral types */
export type Mineral = 'copper' | 'lithium' | 'rareEarths' | 'steel';
export const MINERALS: Mineral[] = ['copper', 'lithium', 'rareEarths', 'steel'];
