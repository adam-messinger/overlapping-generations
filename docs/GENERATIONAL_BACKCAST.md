# Generational backcast

`scripts/generational-backcast.ts` checks the five-year cohort ledger against
observed U.S. history. It is a conditional replay of the generational accounts,
not a calibration of the full global energy/economy simulation.

## What the test holds fixed

For 1989–2025, the replay supplies observed annual totals for:

- household assets and liabilities from the Federal Reserve Distributional
  Financial Accounts (DFA);
- GDP, population, life expectancy, and broad age shares from the World Bank.

The model is tested on what remains endogenous: how the totals are assigned
across age groups, how that distribution moves as cohorts age, and when its
funding-constraint diagnostic rises.

This distinction is essential. Aggregate balance-sheet levels match by
construction and are not validation results.

An optional cross-sectional test uses the U.S. 2011 National Transfer Accounts
(NTA) age profiles for labor income, taxes, public education consumption,
pensions, and health transfers.

## Data

### Federal Reserve DFA

Download and extract the full official DFA release:

```sh
curl -L --fail -o /tmp/dfa.zip \
  https://www.federalreserve.gov/releases/z1/dataviz/download/zips/dfa.zip
mkdir -p /tmp/dfa
unzip -oq /tmp/dfa.zip -d /tmp/dfa
```

The replay uses `dfa-age-levels.csv`. Values in that file are millions of
current U.S. dollars and are converted to trillions by the script.

### World Bank

Download these six official API responses into one directory:

```sh
curl -L --fail -o /tmp/wb-pop.json \
  'https://api.worldbank.org/v2/country/USA/indicator/SP.POP.TOTL?format=json&per_page=100'
curl -L --fail -o /tmp/wb-young.json \
  'https://api.worldbank.org/v2/country/USA/indicator/SP.POP.0014.TO.ZS?format=json&per_page=100'
curl -L --fail -o /tmp/wb-working.json \
  'https://api.worldbank.org/v2/country/USA/indicator/SP.POP.1564.TO.ZS?format=json&per_page=100'
curl -L --fail -o /tmp/wb-old.json \
  'https://api.worldbank.org/v2/country/USA/indicator/SP.POP.65UP.TO.ZS?format=json&per_page=100'
curl -L --fail -o /tmp/wb-gdp.json \
  'https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.MKTP.CD?format=json&per_page=100'
curl -L --fail -o /tmp/wb-life.json \
  'https://api.worldbank.org/v2/country/USA/indicator/SP.DYN.LE00.IN?format=json&per_page=100'
```

The World Bank bands are 0–14, 15–64, and 65+. The model uses 0–19, 20–64,
and 65+, so the replay assigns five-fiftieths of the 15–64 population to ages
15–19. This uniform-within-band approximation is explicit in the script.

### National Transfer Accounts (optional)

Use the [NTA database download page](https://www.ntaccounts.org/web/nta/show/Browse%20database)
to select the United States and download a transposed CSV containing:

- Labor Income
- Taxes
- Public Consumption, Education
- Public Transfers, Health, Inflows
- Public Transfers, Pensions, Inflows

The currently available U.S. profile is for 2011. The script compares only the
normalized age shape because the model represents the OECD region, while NTA
reports U.S. dollars per U.S. resident.

### Federal Reserve lending standards (optional)

The Senior Loan Officer Opinion Survey provides a direct macro credit-supply
check. Download the quarterly net percentage of banks tightening C&I lending
standards (`DRTSCILM`) from FRED:

```sh
curl -L --fail -o /tmp/sloos.csv \
  'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DRTSCILM'
```

The script averages the quarterly observations by calendar year and reports
their correlation with the modeled constrained-worker share and aggregate
funding shortfall. SLOOS covers business lending, not cohort-specific household
credit, so this is a timing test only.

## Run

```sh
npx tsx scripts/generational-backcast.ts \
  --dfa=/tmp/dfa/dfa-age-levels.csv \
  --world-bank-dir=/tmp \
  --nta=/path/to/nta-us-transposed.csv \
  --sloos=/tmp/sloos.csv \
  --calibrate-debt-profile
```

Omit either data-comparison argument to skip it. Omit
`--calibrate-debt-profile` to score the checked-in default debt-age curve. The
calibration flag estimates relative weights for ages 20–39, 40–54, 55–69, and
70+, with ages 40–54 normalized to one. It fits 1989–2012 and reports 2013–2025
separately as a chronological transport check. An explicit candidate can be
scored with `--debt-profile=0.579,1,0.487,0.198`.

## Metrics

- Age-share MAE is the mean absolute error in percentage points across four DFA
  groups: under 40, 40–54, 55–69, and 70+.
- `R²` and correlation pool the selected holdout years and four age groups.
- Total-variation distance compares normalized NTA/model age profiles. Zero is
  identical and one is disjoint.
- Constraint sensitivity reports results at several desired-capital-growth and
  borrowing-limit assumptions.
- Debt-profile calibration minimizes an equal-weight average of pre-2013
  stand-alone cross-sectional MAE and pre-2013 conditional-replay MAE. It does
  not use the 2013–2025 temporal check to choose the weights.

## Current scorecard

Using the Federal Reserve release available on July 16, 2026, the 1995–2025
holdout score is:

| Measure | MAE | R-squared | Correlation |
|---|---:|---:|---:|
| Asset shares by age | 9.6 percentage points | 0.13 | 0.54 |
| Liability shares by age | 4.3 percentage points | 0.83 | 0.91 |
| Liability snapshot transport, 2013–2025 | 5.8 percentage points | 0.60 | 0.92 |

The liability result includes both the July 2026 debt-persistence correction
and the DFA-calibrated initial age curve. The persistence correction by itself
reduced replay MAE from 7.3 to 3.4 percentage points. Calibrating a single
time-invariant curve on pre-2013 data changes that replay score to 4.3 points,
but fixes the much larger initialization error in the actual forward model: its
2025 OECD liability-share MAE falls from 11.9 to 3.9 points. The resulting
forward-model shares are 30.5% for under 40, 40.9% for 40–54, 21.1% for 55–69,
and 7.5% for 70+, compared with DFA shares of 27.1%, 36.4%, 25.5%, and 11.0%.

This is a real tradeoff, not a uniformly better score. The replay starts in
1989, when liabilities were more concentrated among younger households, while
the current cross-section is older. A fixed age curve cannot fit both regimes
perfectly. The calibrated defaults are the pre-2013 joint-fit compromise; the
2013–2025 results remain out of sample and point toward a future time-varying
or cohort-specific debt mechanism.

## Interpretation limits

The data and model concepts are not identical:

- DFA groups households by the age of a reference person; the model assigns
  balance sheets to every person in a birth cohort.
- DFA assets include homes, pensions, financial claims, and valuation changes;
  the model's `assets` are claims on the productive-capital stock.
- Gross asset formation in the replay is reconstructed from stock changes using
  5% depreciation. It therefore includes valuation changes and is an upper-bound
  funding proxy, not BEA fixed investment.
- The capital-constraint index has no direct observed counterpart. Its timing
  can be compared with known credit contractions, but its level cannot currently
  be validated.

These limitations make the replay a structural diagnostic. A close result is
encouraging; a poor result identifies mechanisms that need refinement, but does
not by itself reject the full macro simulation.
