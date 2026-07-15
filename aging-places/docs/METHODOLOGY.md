# Municipal Scoring & Simulation Methodology

## Overview

Two complementary models score every US municipality (Census "place", n≈24,500 with population
≥250), each validated a different way, then blended:

1. **Statistical model** (`src/scoring.ts`, fit in `scripts/backtest.ts`): logistic + ridge
   regression on 25 year-2000 features predicting realized 2000-2025 Zillow ZHVI growth.
   Validated on a held-out 30% test split (see BACKTEST.md). Answers: *which observable
   structures preceded the last quarter-century's winners?*
2. **Mechanism simulation** (`src/simulation.ts` + `src/modules/`): an overlapping-generations
   municipal model run on this repo's generic simulation framework (`src/framework`), with
   attraction weights taken from the international evidence (THEORY.md), *not* fitted to US
   outcomes. Validated by hindcasting 2000→2025 and comparing against realized growth.
   Answers: *where do the aging-society mechanisms concentrate value going forward?*

Final **outlook score** = 0.7·z(simulated 2025-2065 log price growth) + 0.3·z(fitted expected
growth), components winsorized at ±3σ. The mechanism model gets the larger weight because the
fitted model's construct (past % price growth) embeds the 2000s bubble geography and cheap-base
convergence, which are poor proxies for forward value concentration under aging (see
STRESS_TEST.md, "the Boston test").

## Data

| Dataset | Source | Access |
|---|---|---|
| Census 2000 place features | SF1 (P012, H001, H005) + SF3 (P021/P036/P037/P043/P049/P053/P082/H034/H063/H085) | data.census.gov table API (keyless) |
| ACS 2019-23 place features | DP02/DP03/DP04/DP05 profiles + C24030, B25004, B19025 | data.census.gov table API |
| Home values 2000-2025 | Zillow ZHVI, city level, all-homes smoothed SA, June obs | files.zillowstatic.com |
| Coordinates & land area | Census 2023 gazetteer, place-by-county crosswalk | www2.census.gov |
| Universities | IPEDS HD2023 + EFFY2023 (12-month unduplicated headcount) | nces.ed.gov |

All fetch scripts are in `scripts/`; compact gzipped extracts are committed under `data/` so
results reproduce without re-fetching. Every Census variable code is documented inline with its
label in `scripts/fetch-census.ts`.

## Feature set (both epochs, identical definitions)

- **Replacement engines / institutional density**: educational-services, health-care,
  public-administration employment shares (split via C24030/P049); armed-forces share; college
  enrollment ÷ population; university enrollment within 15km and 60km (IPEDS).
- **Replacement ratios / regeneration**: (25-44)/(65+) ratio; 20-34 share; 65+ share; 45-64
  share (single-cohort-trap signal).
- **Human capital**: bachelor's-or-higher and graduate shares (pop 25+); professional/
  information/finance employment share.
- **Market access**: population and aggregate income within ~60/90/120 minutes (70/105/140km
  haversine radii over all places, spatial-grid accelerated); regional dominance = own pop ÷
  120-min population (the hinterland-hub geometry).
- **Amenity capital**: seasonal/recreational vacant unit share (revealed second-home demand —
  the single strongest amenity proxy available at place level); arts/recreation/accommodation
  employment share.
- **Scarcity capital**: *prestige-gated* value/income (V/I × min(2, income/median) — raw V/I
  conflates prestige with poverty-unaffordability; see STRESS_TEST.md iteration 3); density;
  low recent construction share.
- **Supply/distress**: units built in the last decade ÷ stock; non-seasonal vacancy.
- **Gateway**: foreign-born share.
- Income, population, price levels (logs).

## The OLG simulation (2025-2065, annual steps)

Four modules autowired by the framework (lags break the attraction↔market cycle):

- **nation** — cohort-component projection (5 brackets), births (TFR 1.62, CDC 2024), survival
  (SSA 2021), net immigration 1.1M/yr (CBO 2025); outputs national mover pools (2.5%/yr of
  20-44s relocate across places; 0.9%/yr of 65+, ACS county-to-county rates) and an elderly
  wealth index (+1.5%/yr real per capita).
- **attraction** — working-age attraction = 0.30·engines + 0.25·human capital + 0.20·access +
  0.15·regeneration + 0.10·gateway + 0.15·vitality (dynamic young share) − 0.25·affordability
  (dynamic price/income) − 0.15·distress + 0.10·hub term (engines × regional dominance, the
  Fukuoka/hinterland-consolidation mechanism). Retiree attraction = 0.45·amenity + 0.25·health
  + 0.15·scarcity + 0.15·access − 0.10·affordability. Weights follow the evidence ranking in
  LESSONS_JAPAN.md / LESSONS_ITALY.md.
- **migration** — gravity-logit allocation of the pools: destination share ∝ mass × exp(β·A),
  β=0.5 working / 0.3 retiree; departures proportional to stock, so internal flows sum to zero.
- **market** — local cohort aging + arrivals; household demand via headship rates (Census 2023);
  second-home demand = seasonal stock × elderly wealth index, wealth *growth* gated away from
  remote-and-poor places (the akiya rule); supply elasticity declining in density/prestige-
  scarcity (Saiz 2010 logic), slow abandonment (0.6%/yr max) in deep-surplus markets
  (akiya/Stadtumbau channel); price responds to the demand/stock gap net of supply response,
  plus an income-anchored **price-to-income error correction** (2.5%/yr toward 3.6× income,
  Caldera & Johansson OECD 2013) damped by external support (prestige, metro access, or
  university presence); kappa calibrated (0.28) so the hindcast's cross-sectional growth
  dispersion matches ZHVI's (0.23 vs 0.26); real drift 1.2%/yr (Shiller long-run).

The hindcast (scripts/hindcast.ts) initializes with year-2000 data and 2000s national dynamics
(TFR 2.0, NIM ~1M) and runs 25 years; correlations vs realized growth are in BACKTEST.md.
Known limitation: university locations/enrollment are 2023-vintage even in the hindcast
(institutions are highly persistent, but 2000 enrollment levels differ).

## Valuation gap (under/overvalued)

gap = outlook − z(log current price ÷ income). Undervalued list requires outlook ≥ +0.5 (strong
fundamentals, cheap price); overvalued requires outlook < 0 (weak fundamentals, expensive).
Prices use ZHVI 2025 (median value fallback), so the gap measures what the market currently
charges for a place relative to what its aging-era fundamentals support.

## Explainability

For every place: the eight pillar composites (engines, human capital, access, regeneration,
gateway, amenity, scarcity, distress), top positive/negative drivers, and rule-based typology
tags (Knowledge Center, Medical Hub, Government Hub, Military Anchor, Regional Service Center,
Amenity/Prestige Destination, Retirement Market, Metro Spillover Market, Aging Trap,
Institutional Loser, Demographic Loser, Housing Overbuild) — rules in `scripts/forecast.ts`.

## Known limitations

- ZHVI covers ~72% of places (16.5k), skewed away from the smallest; backtest universe is
  pop ≥1,000 with 2000 & 2025 observations (n=5,897).
- Travel-time bands are straight-line approximations (70 km/h); no climate normals (amenity is
  revealed-preference via seasonal share); no flood/climate-risk layer — a real aging-era
  concern for coastal amenity markets.
- Random train/test split leaves spatial autocorrelation between neighbors in train and test;
  metrics are likely modestly optimistic.
- The sim's migration pools are nationally uniform rates; no metro-level labor-market shocks,
  no endogenous institutional decline (a university that will close scores as if permanent).
- Municipal boundaries: places are compared as-is; unincorporated county territory outside
  places is not scored.
