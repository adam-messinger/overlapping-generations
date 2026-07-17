# Municipal model methodology

## 1. What the project estimates

The project produces three different quantities that should not be conflated:

1. **Historical persistence score.** A logistic model learns which year-2000 place characteristics
   preceded top-quartile nominal ZHVI growth through 2025. Applying its coefficients to the 2023
   cross-section produces a relative ranking under a persistence assumption.
2. **Mechanism scenario.** A municipal cohort-and-housing simulation projects one internally
   consistent path from 2025 through 2065. Its output is real price growth under stated demographic
   and behavioral assumptions.
3. **Structural valuation screen.** A current, price-free fundamentals composite is compared with
   current price/income. This is a screening residual, not an estimated fair value.

The first drives the current ranking files because it has the best mean held-out-state
discrimination. Its name deliberately limits the claim: it is a persistence screen, not an
internationally validated aging-resilience forecast. The other two remain visible diagnostics.
There is no production blend.

## 2. Data and epochs

| Layer | Historical epoch | Current epoch |
|---|---|---|
| Population, age, households, housing, income, education, industry | Census 2000 SF1/SF3 | ACS 2019–2023 five-year tables |
| Group quarters | SF1 P037 | ACS B26001 |
| Home values | Zillow city ZHVI, June 2000 and June 2025 | latest 2025 observation in the committed series |
| Coordinates and land area | 2023 Census place gazetteer used as a common geography | same |
| Institutions | IPEDS FA2000HD + EF2000A fall enrollment | IPEDS HD2023 + EFFY2023_DIST 12-month enrollment |

The exact tables, download pages, and demographic sources are linked in
[REFERENCES.md](REFERENCES.md). `fetch-census.ts` documents every Census variable inline.

The 2000 and 2023 feature files contain 23,066 and 28,538 rows respectively. The simulation's
population-at-least-250 current universe contains 24,525 rows. The historical validation universe
requires population at least 1,000 and ZHVI at both endpoints, leaving 5,891 rows.

### Institution cleaning

Historical validation uses historical institutions, not 2023 institutions. For 2023, students who
take every course remotely are subtracted from total 12-month enrollment. The 2000 Community
College of the Air Force system-wide count is excluded because it cannot be localized to
Montgomery. IPEDS is institution-level rather than physical-campus-level, so both epochs preserve
raw enrollment but cap the spatial weight of one headquarters point at 75,000 students. Historical
institutions without surviving coordinates are placed at their contemporaneous named city's
centroid. These choices reduce, but do not eliminate, headquarters-location error.

## 3. Features

The fitted model uses 25 predictors with identical definitions at both epochs:

- age structure: 25–44/65+ replacement ratio, 20–34 share, 65+ share, and 45–64 share;
- institutions and employment: education, health, public administration, armed forces,
  professional/information/finance, arts, resident college share, and IPEDS enrollment within
  15 km and 60 km;
- human capital: bachelor's and graduate shares;
- housing: seasonal vacancy, non-seasonal vacancy, recent construction, density, and a
  value/income feature gated by income relative to that epoch's median;
- external connection: foreign-born share and population access within approximately 60 and
  120 minutes; and
- scale: log population and log household income.

Straight-line radii approximate travel time; they are not a road-network calculation. Missing
values are imputed to the training mean after standardization.

## 4. Statistical model and validation

The outcome is `log(ZHVI_2025 / ZHVI_2000)`. Within every training partition, the top quartile is
defined as a winner. Validation uses five deterministic folds grouped by state. Thus no state—and
no neighboring municipality within that state—appears in both train and test for a fold. The
winner cutoff, missing-value means, standard deviations, and model coefficients are all learned
from training rows only.

Two fits are retained:

- L2-regularized logistic regression for top-quartile classification; and
- ridge regression on state-demeaned continuous growth as a diagnostic.

The production artifact is fit on all historical rows. On application to 2023, features are
standardized within the 2023 cross-section because nominal 2000 and 2023 levels are not directly
comparable. This assumes percentile relationships transfer across epochs. The logistic output is
called `historicalWinnerIndex`; despite its 0–1 range it is not calibrated as a forward
probability. `historicalPersistenceScore` is its z-score across the modeled current universe;
`outlook` remains only as a deprecated compatibility alias.

Two additional diagnostics deliberately answer different questions. Functional-market validation
maps places to start-period USDA 2000 commuting zones, holds out whole zones for fitted models, and
evaluates ranks only within zones with at least five modeled places. A 1990–2000 population trend
is the primary cheap comparator. Temporal stability splits ZHVI outcomes into 2000–2012 and
2012–2025 while holding year-2000 covariates fixed. It is not a rolling-origin backtest, but it
tests whether one historical coefficient pattern transfers to the other outcome regime.

## 5. Mechanism simulation

### National cohorts

Five age groups—0–19, 20–24, 25–44, 45–64, and 65+—advance annually using bracket exits and
approximate survival rates. The current scenario starts at final 2024 TFR 1.5995 and converges to
1.53 by 2035. Net immigration rises from 0.41 million in 2025 to 1.2 million by 2035. These are
simplified interpolations of current CDC/CBO information, not a reproduction of CBO's full
age-sex model. The 2000 hindcast uses a separate historical TFR path and constant 1.05 million
annual net immigration.

### Attraction

Working-age and retiree attraction are additive weighted scores. Working-age terms emphasize
institutional employment, human capital, access, replacement, foreign-born share, current young
share, affordability, distress, and an explicit institution-by-regional-dominance interaction.
Retiree terms use seasonal amenity, health employment, structural scarcity, access, and
affordability. Current prices are excluded from static amenity and scarcity so an expensive place
is not mechanically labeled structurally attractive.

The weights are theory-driven judgment parameters. They were inspected during development and are
not independent causal estimates.

University enrollment throughput has an explicit scenario retention path. The path scales only
the `logUni15`/`logUni60` portion of the institutional-engine composite; health systems, public
employment, education employment, resident college share, and accumulated human capital do not
vanish with it. The default retains 100%. Low/base/high paths are illustrative until an official
Japanese enrollment panel supplies an empirical contraction range.

### Migration

Internal mover pools are sized from the cohort stocks in the modeled place universe: 2.5% annually
for ages 20–44, 1.5% for ages 45–64, and 0.9% for ages 65+. Departures are proportional to origin
stock and arrivals follow a gravity-logit share, so every internal pool sums to zero to numerical
precision. Housing units affect destination capacity; they never substitute for the retiree origin
stock.

International migration is an open flow allocated by cohort and attraction. Each cohort's national
flow is scaled by the share of the corresponding national cohort covered by modeled places. It is
therefore added exactly once and is not forced to sum to zero.

Internal and international exits are reconciled against each place's available stock by cohort.
When requested departures exceed capacity, realized departures are capped, arrivals are rescaled
to preserve closed-flow conservation, and unmet demand is emitted as a diagnostic rather than
silently creating people or crashing a scenario sweep.

### Households, supply, and prices

Place-specific headship multipliers anchor initial implied households to reported occupied housing
units. Group-quarters residents remain in population cohorts but do not create an artificial initial
household shortfall. Places with zero reported units or at least 50% group-quarters population stay
in the full diagnostic output but are ineligible for published housing rankings.

Demand combines age-specific households and seasonal homes. Supply responds to positive demand
gaps through an elasticity based on density and recent construction; deep surplus permits slow
abandonment. Real prices respond to the bounded demand/stock gap, construction, a 1.2% national
real drift, and one-sided correction when price exceeds 3.6 times real household income. A cheap
place below that heuristic anchor receives no artificial upward price subsidy. Income grows 1% per
year in the scenario.

The 3.6 anchor, 2.5% annual reversion, drift, income growth, mover rates, and attraction weights are
transparent scenario calibrations—not estimates supplied by the papers cited in the bibliography.

## 6. International mechanism validation

Japan is the first external-regime test. The protocol in [INTERNATIONAL_PANEL.md](INTERNATIONAL_PANEL.md)
was committed before any post-2020 municipal outcome was acquired. The development panel uses
official 2010, 2015, and 2020 Population Census tables harmonized to 1,741 units on 2020 boundaries
and origin-year municipality commuting flows. Tokyo's 23 special wards remain outcome units; the
official aggregate-origin commuting record assigns them one flagged basin without splitting flows
using endpoint outcomes.

The current development run tests only demographic regeneration/vitality and working-age
allocation. It is not `japan-model-v1`, and the 2020–2025 holdout remains sealed. Institutional,
human-capital, gateway, radius-access, vacancy, and land-price constructs must be added before the
full preregistered model can be frozen and opened. Italy remains untouched replication data.

## 7. Forecast and valuation outputs

The top/bottom lists are sorted by `historicalPersistenceScore` and require:

- population at least 10,000;
- observed current ZHVI;
- positive observed housing and occupied-unit counts;
- group-quarters share below 50%; and
- confidence other than `low`.

The structural score uses institutional engines, human capital, access, replacement, gateway,
amenity, structural scarcity, health capacity, and distress, all without current price. The
valuation screen is:

`valuationGap = z(structural fundamentals) - z(log(current price / income))`.

It is intentionally separate from the historical persistence score and the mechanism scenario.

## 8. Confidence labels

`low` marks hard data/support problems: population below 2,500, no current ZHVI, missing income,
zero reported units, majority group-quarters population, many missing predictors, or extreme
statistical/mechanism disagreement. `medium` marks high group-quarters share, several missing or
out-of-support predictors, or material disagreement. `high` only means none of these rule-based
warnings fired; it is not a confidence interval.

## 9. Main limitations

- US coefficient relationships reverse sharply between the 2000–2012 and 2012–2025 outcome
  windows; the historical-persistence score therefore has no demonstrated temporal portability.
- State grouping is stricter than random-place validation, but neighboring cross-state metros and
  national shocks remain.
- The current application assumes standardized feature ranks retain the same meaning across epochs.
- The historical-persistence score includes a value/income predictor and is not independent of
  starting valuation.
- The mechanism model has weak raw national hindcast performance and should be used for scenarios,
  not as an independently validated forecast.
- Institutional capacity, local fertility, zoning, climate/insurance risk, employment shocks, and
  municipal boundary change are not endogenous.
- Zillow coverage selects toward larger and more active housing markets.
