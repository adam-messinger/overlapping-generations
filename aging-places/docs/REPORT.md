# US municipal aging and housing: corrected results

## Executive result

The project now produces an honest historical-structure ranking plus a separate aging scenario.
After correcting spatial validation, household accounting, migration conservation, group-quarters
treatment, and historical institution data, the strongest headline result is a mean held-out-state
ROC-AUC of **0.667**. The mechanism simulation's raw national hindcast is near chance
(AUC **0.522**, Spearman **−0.005**) and is no longer blended into the headline.

That changes the interpretation substantially. The output can support research, scenario comparison,
and locality triage. It does not support statements such as “this place has a 97% chance of winning,”
nor does it estimate a 2065 home price.

## What is ranked

The headline `outlook` is the standardized output of a logistic model trained to distinguish the
top quartile of 2000–2025 nominal Zillow ZHVI growth from year-2000 place features. The adjacent
`historicalWinnerIndex` is a 0–1 ranking index, not a calibrated probability. Applying the model to
2023 data assumes that relative feature positions have portable meaning in a new era. The predictor
set includes an income-gated current value/income measure, so this headline is not a price-free
fundamentals score; that is why valuation is reported separately.

Two other outputs answer different questions:

- `mechanismScore` is relative real-price growth in one 2025–2065 cohort/housing scenario; and
- `valuationGap` compares price-free structural fundamentals with current log price/income.

The top/bottom files cover 3,460 places with population at least 10,000, observed current ZHVI,
ordinary housing-market data, and no hard confidence warning. The full file contains 24,525 places.

## Validation in one table

| Held-out-state score | Mean AUC | Fold range |
|---|---:|---:|
| Headline logistic index | **0.667** | 0.625–0.708 |
| Foreign-born-share baseline | 0.629 | 0.557–0.700 |
| Historical logistic/ridge composite | 0.641 | 0.573–0.701 |
| Mechanism scenario | 0.548 | 0.424–0.650 |
| 70% logistic + 30% mechanism | 0.663 | 0.563–0.746 |

A random-place state-rate diagnostic reaches 0.842, showing why the earlier random split was too
optimistic. See [BACKTEST.md](BACKTEST.md) for fold detail and the corrected hindcast.

## Current top 20

These are the current headline rankings, not mechanism-model winners and not investment advice.

| Rank | Locality | State | Outlook | Historical index | Confidence |
|---:|---|:---:|---:|---:|:---:|
| 1 | Sunny Isles Beach city | FL | 3.63 | 0.986 | medium |
| 2 | Key Biscayne village | FL | 3.62 | 0.984 | medium |
| 3 | Miami Beach city | FL | 3.54 | 0.967 | medium |
| 4 | Langley Park CDP | MD | 3.52 | 0.963 | high |
| 5 | Nantucket CDP | MA | 3.50 | 0.960 | medium |
| 6 | Temple City city | CA | 3.48 | 0.956 | medium |
| 7 | Aventura city | FL | 3.44 | 0.948 | medium |
| 8 | Maywood city | CA | 3.42 | 0.944 | medium |
| 9 | Palm Springs village | FL | 3.42 | 0.943 | medium |
| 10 | East Riverdale CDP | MD | 3.40 | 0.939 | medium |
| 11 | Huntington Park city | CA | 3.38 | 0.935 | medium |
| 12 | Union City city | NJ | 3.37 | 0.933 | high |
| 13 | Union City city | CA | 3.35 | 0.929 | medium |
| 14 | Coronado city | CA | 3.35 | 0.929 | medium |
| 15 | Sunnyvale city | CA | 3.35 | 0.928 | medium |
| 16 | Walnut city | CA | 3.32 | 0.924 | medium |
| 17 | Adelphi CDP | MD | 3.32 | 0.923 | medium |
| 18 | The Hammocks CDP | FL | 3.31 | 0.921 | medium |
| 19 | Garden Grove city | CA | 3.30 | 0.920 | medium |
| 20 | Foster City city | CA | 3.30 | 0.919 | medium |

The concentration in Florida, California, New Jersey, and Maryland is itself a warning: the fitted
index strongly reflects the gateway/scarcity/coastal pattern of the 2000–2025 outcome window. State
grouping reduces direct leakage, but it cannot prove the same regime will dominate 2025–2065.

## Current bottom 20

| Bottom rank | Locality | State | Outlook | Historical index | Confidence |
|---:|---|:---:|---:|---:|:---:|
| 1 | University Heights city | OH | −1.09 | 0.034 | medium |
| 2 | Victoria city | MN | −1.09 | 0.035 | high |
| 3 | Rogers city | MN | −1.09 | 0.036 | high |
| 4 | Ferndale city | MI | −1.08 | 0.036 | medium |
| 5 | Berkley city | MI | −1.08 | 0.038 | medium |
| 6 | East Grand Rapids city | MI | −1.07 | 0.039 | high |
| 7 | Hudson city | OH | −1.07 | 0.040 | high |
| 8 | Deerfield village | IL | −1.06 | 0.041 | high |
| 9 | Whitestown town | IN | −1.06 | 0.042 | high |
| 10 | Heath city | TX | −1.05 | 0.042 | high |
| 11 | Royal Oak city | MI | −1.04 | 0.045 | high |
| 12 | Lake Forest city | IL | −1.03 | 0.046 | high |
| 13 | River Falls city | WI | −1.03 | 0.047 | high |
| 14 | Campton Hills village | IL | −1.03 | 0.048 | high |
| 15 | Orono CDP | ME | −1.03 | 0.048 | medium |
| 16 | Allouez village | WI | −1.02 | 0.049 | high |
| 17 | Lake Elmo city | MN | −1.02 | 0.049 | high |
| 18 | Greensburg city | PA | −1.02 | 0.049 | high |
| 19 | Kearney city | MO | −1.02 | 0.049 | high |
| 20 | Zionsville town | IN | −1.02 | 0.049 | high |

Many are affluent Midwest suburbs, not obvious demographic-collapse cases. The correct reading is
that their current feature profiles resemble the low end of the fitted historical top-quartile
classifier. Calling them literal “losers” would overinterpret the model. This is why mechanism,
structural fundamentals, confidence reasons, and local facts should be examined alongside outlook.

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

## Appropriate use

Good uses include comparing scenarios, finding places whose historical and mechanism channels
disagree, auditing data quality, and generating hypotheses for local research. Bad uses include
interpreting the index as a probability, treating the mechanism path as validated, or making a
purchase decision without climate, insurance, zoning, employment, tax, institutional, and local
market analysis.

The most important new result is not a city name. It is that the original confident municipal
forecast did not survive stricter accounting and spatial validation. The remaining signal is real
enough to study and modest enough to handle cautiously.
