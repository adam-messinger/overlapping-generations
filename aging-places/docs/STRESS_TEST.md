# Correction and stress-test log

This document supersedes the earlier ranking-tuning narrative. The most consequential tests were
accounting and validation audits, not checks that favored places “looked right.”

## 1. Population-flow accounting

### Failure

Internal mover pools were derived from national cohorts while the municipal simulation covered
only Census places above a population threshold. That could allocate full-country movers into a
partial universe. International immigration was not represented as a distinct local open flow.

### Correction

Every internal pool is now a rate times its modeled local origin stock. Arrivals and departures
sum to the same pool. International flows are allocated separately by cohort and scaled to the
share of the national cohort represented in the municipal universe.

### Test

Invariant tests require internal net migration to sum to zero, international allocation to sum to
the requested covered flow, and negative international flows never to exceed resident stock.

## 2. Household and group-quarters accounting

### Failure

Generic headship rates could imply many fewer households than observed occupied units in the first
year. The model interpreted the initialization mismatch as economic demand growth. Dormitories,
prisons, barracks, and other group quarters made this especially severe.

### Correction

Each place receives a headship scale that reproduces observed occupied units at initialization.
Census 2000 P015/P016/P037 and ACS occupied-unit/B26001 fields distinguish household and group-
quarters population. Majority-group-quarters and zero-unit places are excluded from published
housing rankings but retained for diagnostics.

### Test

Tests verify initial household anchoring, nonnegative housing demand, and group-quarters market
eligibility rules.

## 3. Retirement and stock semantics

### Failure

Housing units influenced retiree departure sizing, confusing destination capacity with people at
risk of moving.

### Correction

Retiree departures use lagged retiree population. Units only weight destination capacity. Separate
lagged stocks now exist for working-age, midlife, and retiree cohorts.

## 4. Price circularity

### Failure

Current price/value entered scarcity, structural support, and valuation, allowing expensive places
to look fundamentally attractive partly because they were already expensive.

### Correction

Amenity and structural scarcity exclude current price. Supply elasticity uses density and recent
construction. External support uses access, institutions, seasonal demand, and income. Current
price appears separately in affordability feedback and the valuation residual.

The 3.6 price/income anchor and 2.5% reversion are labeled heuristic calibrations; the OECD housing-
supply paper is not cited as their estimator.

## 5. Institution data leakage and localization

### Failure

The old hindcast reused 2023 institution geography/enrollment and could assign online or systemwide
enrollment to one headquarters municipality.

### Correction

The 2000 layer uses FA2000HD and EF2000A. The 2023 layer subtracts exclusively online students using
EFFY2023_DIST. The worldwide Community College of the Air Force count is excluded from 2000, and a
75,000-student cap is applied only to spatial weight while raw enrollment remains available.

Residual limitation: IPEDS is institution-level, and historical coordinates sometimes use current
coordinates or a city centroid.

## 6. Spatial validation

### Failure

Random place splits left states, neighboring places, and shared regional price shocks on both sides
of validation. A state-outcome baseline can reach AUC 0.842 under such a split.

### Correction

Five folds now hold out entire states. Winner thresholds, imputation, standardization, and fitting
are training-only. The corrected historical-persistence logistic mean is 0.667 rather than the earlier random-
split result near 0.80.

## 7. Correctness audit after spatial validation

A second code audit found two defects that changed published numbers and eight latent contract
failures. All ten now have regression coverage or a pipeline assertion:

- price/income reversion is one-sided again, so cheap below-anchor places do not receive a modeled
  price subsidy;
- same-name ZHVI candidates without a county match are treated as ambiguous rather than joined to
  an arbitrary row;
- international exits and internal moves are bounded by each place's actual cohort stock, with
  closed-flow arrivals rescaled to realized departures and unmet demand recorded;
- missing/undefined scoring fields remain null instead of becoming `NaN`;
- required epoch columns fail loudly instead of silently taking defaults;
- persisted model feature names, order, preprocessing lengths, and weight lengths are checked
  before positional scoring;
- start-year household anchoring uses the configured headship rates;
- Census GEOIDs remain strings with leading zeros;
- Census cache entries are written only after payload validation; and
- repository paths use `fileURLToPath`, including checkouts whose path contains spaces.

The price correction changed the mechanism diagnostics materially. In particular, the old 0.287
within-state Spearman no longer describes the corrected model; the current value is 0.182.

## 8. Result invalidation

| Diagnostic | Earlier published value | Corrected value |
|---|---:|---:|
| Statistical AUC | 0.801 random-place test | 0.667 mean state-grouped folds |
| Raw mechanism AUC, all places | 0.609 | 0.567 |
| Raw mechanism Spearman, all places | 0.198 | 0.082 |
| Raw mechanism AUC, population ≥10k | 0.669 | 0.621 |
| State-demeaned mechanism Spearman | 0.287 with reversion bug | 0.182 corrected |

These are not perfectly comparable specifications, but the direction is unambiguous: earlier
confidence was not warranted. The mechanism remains useful for controlled scenarios and accounting
experiments, not as an independently validated municipal forecast.

## 9. Functional-market and temporal stress tests

The corrected mechanism beats a lagged 1990–2000 population-trend baseline within 2000 commuting
zones (equal-zone Spearman difference 0.156, 95% bootstrap interval 0.084 to 0.231), but a fitted
local ridge is better. The historical-persistence classifier has only 0.023 equal-zone mean
Spearman on the common sample.

Splitting the US outcome into 2000–2012 and 2012–2025 produces negative cross-window transfer:
early-fit/late-outcome AUC is 0.408, raw early/late Spearman is −0.322, and coefficient cosine
similarity is negative. This turns the old “single window” caveat into an observed instability,
not merely an untested concern.

## 10. Remaining stress cases

- Coastal Florida ranks highly in the historical index despite missing flood and insurance risk.
- Affluent Midwest suburbs rank at the bottom, illustrating that classifier resemblance is not a
  literal forecast of collapse.
- Gateway-heavy results depend on immigration-policy persistence.
- University and medical proxies assume continuing capacity and do not predict closure or budget
  shocks.
- Cross-state metro spillovers remain even after state-grouped validation.
- Japan's post-2020 municipal holdout is sealed; the partial development mechanism now includes
  five institutional/employment/gateway constructs but still does not beat lagged population with
  a confidence interval above zero in either development window.
- University-throughput decline is now an explicit exogenous scenario lever, but its low/base/high
  paths remain illustrative until an official Japanese enrollment panel supplies a defensible
  calibration. The educated/non-educated international-migrant split is not yet available at
  adequate cross-national coverage.
