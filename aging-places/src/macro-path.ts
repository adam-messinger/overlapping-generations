/**
 * Auditable annual macro inputs for the municipal model.
 *
 * Only realIncomeGrowth and realHousePriceDrift are consumed in the first
 * integration slice. The remaining fields are carried now so later capital,
 * financing, energy, and climate channels can be added without changing the
 * global-to-city data contract.
 */
export interface NationalMacroPoint {
  /** Transition beginning in this year; rates evolve the city state to year+1. */
  year: number;
  realIncomeGrowth: number;
  realHousePriceDrift: number;
  interestRate: number;
  regionalWacc: number;
  energyBurden: number;
  climateDamages: number;
  aggregateCapitalCoverage: number;
  constrainedWorkingShare: number;
  borrowingConstrainedWorkingShare: number;
  regionalFossilShare: number;
  regionalGdpPerCapita: number;
}

export interface NationalMacroPath {
  source: string;
  geography: string;
  incomeGrowthBasis: string;
  points: Record<number, NationalMacroPoint>;
}

function assertFraction(
  value: number,
  label: string,
  min: number,
  max: number,
): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(label + ' out of [' + min + ',' + max + ']');
  }
}

export function assertNationalMacroPath(
  path: NationalMacroPath,
  startYear: number,
  endYear: number,
): void {
  if (path.source.trim().length === 0) throw new Error('macro path source is required');
  if (path.geography.trim().length === 0) throw new Error('macro path geography is required');
  if (path.incomeGrowthBasis.trim().length === 0) {
    throw new Error('macro path incomeGrowthBasis is required');
  }
  for (let year = startYear; year <= endYear; year++) {
    const point = path.points[year];
    if (point === undefined) throw new Error('macro path missing year ' + year);
    if (point.year !== year) throw new Error('macro path key/year mismatch at ' + year);
    assertFraction(point.realIncomeGrowth, year + ' realIncomeGrowth', -0.2, 0.2);
    assertFraction(point.realHousePriceDrift, year + ' realHousePriceDrift', -0.2, 0.2);
    assertFraction(point.interestRate, year + ' interestRate', -0.1, 0.5);
    assertFraction(point.regionalWacc, year + ' regionalWacc', 0, 0.5);
    assertFraction(point.energyBurden, year + ' energyBurden', 0, 1);
    assertFraction(point.climateDamages, year + ' climateDamages', 0, 1);
    assertFraction(point.aggregateCapitalCoverage, year + ' aggregateCapitalCoverage', 0, 1);
    assertFraction(point.constrainedWorkingShare, year + ' constrainedWorkingShare', 0, 1);
    assertFraction(
      point.borrowingConstrainedWorkingShare,
      year + ' borrowingConstrainedWorkingShare',
      0,
      1,
    );
    assertFraction(point.regionalFossilShare, year + ' regionalFossilShare', 0, 1);
    if (!Number.isFinite(point.regionalGdpPerCapita) || point.regionalGdpPerCapita <= 0) {
      throw new Error(year + ' regionalGdpPerCapita must be positive');
    }
  }
}
