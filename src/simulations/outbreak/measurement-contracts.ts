import {
  defineMeasurement,
  defineMeasurementCrosswalk,
  type MeasurementBinding,
  type MeasurementCrosswalk,
} from 'tsimulation';
import { usCovidWeeklyAdmissions } from '../semantic-contracts.js';

/**
 * Same estimand, different observation procedures.
 *
 * The operational history is revised/backfilled; the resolution endpoint
 * preserves initial reporting. Equal units do not make those values
 * interchangeable at a forecast origin.
 */
export const cdcOperationalAdmissionsMeasurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.cdc.mpgq-jmmr.us-covid-weekly-admissions',
    version: '1.0.0',
    estimand: usCovidWeeklyAdmissions,
    dataset: {
      id: 'cdc.socrata.mpgq-jmmr',
      field: 'totalconfc19newadm',
    },
    procedure: {
      id: 'cdc-nhsn-operational-national-weekly-sum',
      description: 'Select jurisdiction USA and use the operational national NHSN weekly COVID-19 admission total.',
    },
    revisionPolicy: 'backfilled',
    release: 'revised',
    coverage: {
      geography: 'USA',
      population: 'Reporting acute-care hospitals',
      missingness: 'Reporting coverage varies by week; published count is not coverage-adjusted.',
    },
    notes: 'Complete history used to fit and run the rolling forecast; recent rows can change after first publication.',
  });

export const cdcFixedInitialAdmissionsMeasurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.cdc.vdzy-6i9v.us-covid-weekly-admissions',
    version: '1.0.0',
    estimand: usCovidWeeklyAdmissions,
    dataset: {
      id: 'cdc.socrata.vdzy-6i9v',
      field: 'totalconfc19newadm',
    },
    procedure: {
      id: 'cdc-nhsn-fixed-initial-national-weekly-sum',
      description: 'Select jurisdiction USA and retain the initially reported national weekly COVID-19 admission total without later revision or backfill.',
    },
    revisionPolicy: 'first-release',
    release: 'first',
    coverage: {
      geography: 'USA',
      population: 'Hospitals reporting at the initial weekly release',
      missingness: 'Published count is not coverage-adjusted and late-reporting hospitals are not backfilled.',
    },
    notes: 'Forecast resolution series; must not be silently substituted with the operational revisable history.',
  });

export const operationalToFixedInitialAdmissionsCrosswalk: MeasurementCrosswalk =
  defineMeasurementCrosswalk({
    schemaVersion: 'tsimulation.measurement-crosswalk/v1',
    id: 'measurement-crosswalk.outbreak.operational-to-fixed-initial-admissions',
    version: '1.0.0',
    description: 'Map count-scale output trained on the backfilled operational CDC series to the fixed-initial resolution series.',
    source: cdcOperationalAdmissionsMeasurement,
    target: cdcFixedInitialAdmissionsMeasurement,
    method: 'Multiply by the arithmetic mean of 13 same-week fixed-initial / operational count ratios (0.9440 at the 2026-07-23 forecast vintage).',
    assumptions: [
      'The recent mean endpoint ratio remains applicable over the forecast horizon.',
      'Neither endpoint is adjusted to full hospital-reporting coverage.',
      'The correction changes measurement regime, not the underlying admissions estimand.',
    ],
    evidenceIds: [
      'outbreak-forecast-operational-admissions',
      'outbreak-forecast-fixed-initial-admissions',
    ],
    uncertainty: {
      kind: 'qualitative',
      description: 'Only 13 overlapping weeks were available and reporting coverage changes over time.',
    },
  });
