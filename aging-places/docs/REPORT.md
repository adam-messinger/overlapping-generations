# US municipal aging and housing: corrected results

## Executive result

The project now produces an honest historical-persistence ranking plus a separate aging scenario.
After correcting spatial validation, household accounting, migration conservation, group-quarters
treatment, historical institution data, and price reversion, the persistence classifier has mean
held-out-state ROC-AUC **0.667**. The mechanism simulation's corrected raw national hindcast is
weaker (AUC **0.567**, Spearman **0.082**) and remains separate from the ranking.

That changes the interpretation substantially. The output can support research, scenario comparison,
and locality triage. It does not support statements such as “this place has a 97% chance of winning,”
nor does it estimate a 2065 home price.

## What is ranked

The `historicalPersistenceScore` is the standardized output of a logistic model trained to distinguish the
top quartile of 2000–2025 nominal Zillow ZHVI growth from year-2000 place features. The adjacent
`historicalWinnerIndex` is a 0–1 ranking index, not a calibrated probability. Applying the model to
2023 data assumes that relative feature positions have portable meaning in a new era. The predictor
set includes an income-gated current value/income measure, so this ranking is not a price-free
fundamentals score; that is why valuation is reported separately.

Two other outputs answer different questions:

- `mechanismScore` is relative real-price growth in one 2025–2065 cohort/housing scenario; and
- `valuationGap` compares price-free structural fundamentals with current log price/income.

The top/bottom files cover 3,496 places with population at least 10,000, observed current ZHVI,
ordinary housing-market data, and no hard confidence warning. The full file contains 24,525 places.

## Validation in one table

| Held-out-state score | Mean AUC | Fold range |
|---|---:|---:|
| Historical-persistence logistic index | **0.667** | 0.624–0.707 |
| Foreign-born-share baseline | 0.629 | 0.557–0.700 |
| Historical logistic/ridge composite | 0.641 | 0.573–0.702 |
| Mechanism scenario | 0.527 | 0.365–0.658 |
| 70% logistic + 30% mechanism | 0.652 | 0.565–0.743 |

A random-place state-rate diagnostic reaches 0.842, showing why the earlier random split was too
optimistic. Functional-market validation is more favorable to the mechanism: its equal-zone
Spearman is 0.097 versus −0.059 for lagged population, a difference of 0.156 with 95% interval
0.084–0.231. But a local ridge reaches 0.175, while historical persistence reaches only 0.023.

Temporal transfer is the sharper warning. The early-window classifier scores AUC 0.408 on the late
window, the late-window classifier scores 0.392 on the early window, and early/late ZHVI growth has
Spearman −0.322. The persistence screen has no demonstrated portability into 2025–2065. See
[BACKTEST.md](BACKTEST.md) for full results and the still-sealed Japan protocol.

## Current top 20

These are historical-persistence rankings, not mechanism-model winners, validated aging-resilience
rankings, or investment advice.

| Rank | Locality | State | Persistence score | Historical index | Confidence |
|---:|---|:---:|---:|---:|:---:|
| 1 | Sunny Isles Beach city | FL | 3.622 | 0.9857 | medium |
| 2 | Key Biscayne village | FL | 3.614 | 0.9839 | medium |
| 3 | Miami Beach city | FL | 3.533 | 0.9677 | medium |
| 4 | Langley Park CDP | MD | 3.511 | 0.9633 | high |
| 5 | East Palo Alto city | CA | 3.496 | 0.9601 | medium |
| 6 | Nantucket CDP | MA | 3.492 | 0.9594 | medium |
| 7 | Doral city | FL | 3.490 | 0.9589 | medium |
| 8 | Temple City city | CA | 3.479 | 0.9568 | medium |
| 9 | Arcadia city | CA | 3.466 | 0.9542 | medium |
| 10 | Aventura city | FL | 3.437 | 0.9483 | high |
| 11 | El Monte city | CA | 3.431 | 0.9470 | medium |
| 12 | Maywood city | CA | 3.416 | 0.9441 | medium |
| 13 | Palm Springs village | FL | 3.415 | 0.9439 | medium |
| 14 | North Miami city | FL | 3.410 | 0.9429 | medium |
| 15 | Redwood City city | CA | 3.407 | 0.9422 | medium |
| 16 | North Miami Beach city | FL | 3.395 | 0.9399 | medium |
| 17 | East Riverdale CDP | MD | 3.392 | 0.9392 | medium |
| 18 | Golden Glades CDP | FL | 3.389 | 0.9387 | medium |
| 19 | Huntington Park city | CA | 3.376 | 0.9361 | medium |
| 20 | Union City city | NJ | 3.366 | 0.9340 | high |

The concentration in Florida, California, New Jersey, and Maryland is itself a warning: the fitted
index strongly reflects the gateway/scarcity/coastal pattern of the 2000–2025 outcome window. State
grouping reduces direct leakage, but it cannot prove the same regime will dominate 2025–2065.

## Current bottom 20

| Bottom rank | Locality | State | Persistence score | Historical index | Confidence |
|---:|---|:---:|---:|---:|:---:|
| 1 | University Heights city | OH | −1.094 | 0.0338 | medium |
| 2 | Victoria city | MN | −1.087 | 0.0353 | high |
| 3 | Rogers city | MN | −1.084 | 0.0358 | high |
| 4 | Ferndale city | MI | −1.084 | 0.0359 | medium |
| 5 | Berkley city | MI | −1.075 | 0.0377 | medium |
| 6 | East Grand Rapids city | MI | −1.070 | 0.0388 | high |
| 7 | Hudson city | OH | −1.066 | 0.0396 | high |
| 8 | Deerfield village | IL | −1.059 | 0.0409 | high |
| 9 | Whitestown town | IN | −1.056 | 0.0414 | high |
| 10 | Heath city | TX | −1.054 | 0.0419 | high |
| 11 | Royal Oak city | MI | −1.041 | 0.0446 | high |
| 12 | Lake Forest city | IL | −1.032 | 0.0463 | high |
| 13 | River Falls city | WI | −1.030 | 0.0467 | high |
| 14 | Campton Hills village | IL | −1.026 | 0.0476 | high |
| 15 | Orono CDP | ME | −1.023 | 0.0481 | medium |
| 16 | Allouez village | WI | −1.022 | 0.0483 | high |
| 17 | Lake Elmo city | MN | −1.021 | 0.0485 | high |
| 18 | Greensburg city | PA | −1.019 | 0.0490 | high |
| 19 | Kearney city | MO | −1.018 | 0.0491 | high |
| 20 | Zionsville town | IN | −1.018 | 0.0492 | high |

Many are affluent Midwest suburbs, not obvious demographic-collapse cases. The correct reading is
that their current feature profiles resemble the low end of the fitted historical top-quartile
classifier. Calling them literal “losers” would overinterpret the model. This is why mechanism,
structural fundamentals, confidence reasons, and local facts should be examined alongside the
historical persistence score.

## What changed in the city model

- Internal migration is now a closed redistribution of modeled local cohort stocks. The former
  implementation could inject a full national mover pool into a partial place universe.
- International immigration is explicit, cohort-specific, coverage-scaled, and added once.
- Household demand is anchored to observed occupied units. Group-quarters residents no longer
  generate an artificial housing shortage at initialization.
- Retiree departures are based on retiree stock; housing units only affect destination capacity.
- Historical IPEDS replaces 2023 institution data in the hindcast. Exclusively online current
  enrollment is removed and system/HQ spatial outliers are constrained.
- Current price is removed from structural attraction and supply-constraint scores. Valuation is
  calculated separately.
- Validation holds out whole states and performs every preprocessing step inside training folds.
- Output confidence now records missing markets, small populations, group quarters, extrapolation,
  and statistical/mechanism disagreement.

## Institutional-throughput stress test

University enrollment throughput can now contract independently of health systems, government,
institutional employment, or accumulated human capital. The first paths are intentionally
illustrative: high retains 100% of the enrollment contribution, base reaches a 65% floor, and low
reaches a 25% floor by 2065. They are not yet calibrated from Japan and carry no causal claim.

Relative to high retention, the low-retention case most reduces modeled support in large
institutional hubs including New York, Detroit, Urban Honolulu, Chicago, Los Angeles, Cleveland,
Jackson, Shreveport, and Boston. Low-throughput places become relative beneficiaries as the
cross-place institutional gap narrows. Total modeled population is conserved across scenarios;
changes in the unweighted mean place-price index reflect redistribution and nonlinear local-market
responses, not a national welfare or GDP result. Row-level exposure is in
`outputs/institutional-scenario-exposure.csv.gz`.

## Appropriate use

Good uses include comparing scenarios, finding places whose historical and mechanism channels
disagree, auditing data quality, and generating hypotheses for local research. Bad uses include
interpreting the index as a probability, treating the mechanism path as validated, or making a
purchase decision without climate, insurance, zoning, employment, tax, institutional, and local
market analysis.

The most important new result is not a city name. It is that the original confident municipal
forecast did not survive stricter accounting and spatial validation. The remaining signal is real
enough to study and modest enough to handle cautiously.
