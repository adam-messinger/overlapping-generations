import {
  defineMeasurement,
  defineSemanticDerivation,
  type MeasurementBinding,
  type SemanticDerivation,
} from 'tsimulation';
import { dataCenterEstimands } from '../semantic-contracts.js';

export const bnef2035DataCenterCapacityMeasurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.bnef.us-data-center-power-capacity-2035',
    version: '1.0.0',
    estimand: dataCenterEstimands.totalPowerCapacityGw,
    dataset: {
      id: 'bnef.us-data-center-power-demand-forecast-2026',
      field: '2035_total_power_capacity_gw',
      version: '2026-07',
    },
    procedure: {
      description: 'BloombergNEF scenario estimate of total U.S. data-center power-demand capacity in 2035, as reported in the cited release.',
    },
    phenomenonTime: { instant: '2035-12-31' },
    revisionPolicy: 'revisable',
    release: 'revised',
    notes: 'A forward scenario estimate, not an observed project queue and not an incremental load value.',
  });

export const lbnl2023DataCenterElectricityMeasurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.lbnl.us-data-center-electricity-2023',
    version: '1.0.0',
    estimand: dataCenterEstimands.totalAnnualElectricityTwh,
    dataset: {
      id: 'lbnl-2024-us-data-center-energy-usage-report',
      field: 'estimated_2023_total_electricity_consumption_twh',
      version: '2024',
    },
    procedure: {
      description: 'Berkeley Lab estimate of total full-site U.S. data-center electricity consumption in calendar year 2023.',
    },
    phenomenonTime: {
      start: '2023-01-01',
      end: '2023-12-31',
    },
    resultTime: '2024-12-20',
    revisionPolicy: 'immutable-release',
    release: 'final',
  });

/**
 * Makes the model's 159 GW input visibly derived rather than silently treating
 * BNEF's 194 GW total scenario as an incremental contracted-load forecast.
 */
export const bnefTotalToIncrementalLoadDerivation: SemanticDerivation =
  defineSemanticDerivation({
    schemaVersion: 'tsimulation.derivation/v1',
    id: 'derivation.data-center.bnef-total-to-incremental-load',
    version: '1.0.0',
    description: 'Subtract an illustrative 35 GW current operating base from the 194 GW BNEF 2035 total-capacity scenario.',
    inputEstimandIds: [
      dataCenterEstimands.totalPowerCapacityGw.id,
    ],
    outputEstimand: dataCenterEstimands.incrementalContractedLoadGw,
    expression: 'incrementalContractedLoadGw = 194 GW total 2035 capacity - 35 GW illustrative current operating capacity',
    assumptions: [
      'The BNEF total-capacity definition is comparable to the illustrative current-capacity base.',
      'The difference is treated as contracted maximum load, even though project realization remains a separate scenario parameter.',
    ],
    evidenceIds: ['dc-grid-bnef-2035'],
  });
