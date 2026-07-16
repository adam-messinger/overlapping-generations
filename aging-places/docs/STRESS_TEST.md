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
quarters population. Majority-group-quarters and zero-unit places are excluded from headline
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
are training-only. The corrected headline logistic mean is 0.667 rather than the earlier random-
split result near 0.80.

## 7. Result invalidation

| Diagnostic | Earlier published value | Corrected value |
|---|---:|---:|
| Statistical AUC | 0.801 random-place test | 0.667 mean state-grouped folds |
| Raw mechanism AUC, all places | 0.609 | 0.522 |
| Raw mechanism Spearman, all places | 0.198 | −0.005 |
| Raw mechanism AUC, population ≥10k | 0.669 | 0.514 |

These are not perfectly comparable specifications, but the direction is unambiguous: earlier
confidence was not warranted. The mechanism remains useful for controlled scenarios and accounting
experiments, not as an independently validated municipal forecast.

## 8. Remaining stress cases

- Coastal Florida ranks highly in the historical index despite missing flood and insurance risk.
- Affluent Midwest suburbs rank at the bottom, illustrating that classifier resemblance is not a
  literal forecast of collapse.
- Gateway-heavy results depend on immigration-policy persistence.
- University and medical proxies assume continuing capacity and do not predict closure or budget
  shocks.
- Cross-state metro spillovers remain even after state-grouped validation.
- A single 2000–2025 outcome window remains the largest unresolved validation limitation.
