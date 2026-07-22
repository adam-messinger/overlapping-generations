# Critical-material input/output network

This simulation keeps price propagation and physical bottlenecks separate:

1. Which upstream price shocks propagate through many downstream costs?
2. Which physically essential shortages stop output after inventories,
   alternative supply, and slow substitution are considered?

Run the full audit with:

```bash
node --import tsx scripts/critical-materials-backtest.ts
```

## What is empirical now—and what is not

V3 adds an explicit empirical overlay rather than silently mixing evidence and
assumptions.

| Layer | Current source/status |
|---|---|
| 2025 production, dominant producer, U.S. consumption/import reliance/stocks | Observed USGS Mineral Commodity Summaries 2026 rows |
| Material per 75 kWh NMC-622 EV | Observed IEA 2021 technology recipe |
| 2011/2021/2023 U.S. event-window output | Observed current-vintage Federal Reserve G.17 indexes |
| Event supply paths | Transparent event-envelope assumptions anchored to official narratives |
| Seven-material/component/final-sector topology | Assumption |
| Monetary cost shares | Assumption; not yet a BEA/OECD table |
| Allocation across firms/geographies | Assumption; normalized availability, not tonne-conserving trade flows |

Primary data and references:

- [USGS Mineral Commodity Summaries 2026 data release](https://doi.org/10.5066/P1WKQ63T)
- [USGS gallium/germanium restriction model](https://pubs.usgs.gov/publication/ofr20241057/full)
- [Federal Reserve G.17 industrial production downloads](https://www.federalreserve.gov/Releases/g17/download.htm)
- [Federal Reserve 2011 Tohoku supply-chain evidence](https://www.federalreserve.gov/monetarypolicy/beigebook/beigebook201107.htm)
- [Federal Reserve 2021–22 semiconductor-shortage assessment](https://www.federalreserve.gov/monetarypolicy/2022-02-mpr-part1.htm)
- [IEA vehicle material-intensity chart](https://www.iea.org/data-and-statistics/charts/minerals-used-in-electric-cars-compared-to-conventional-cars)
- [IEA 2025 export-control retrospective](https://www.iea.org/commentaries/with-new-export-controls-on-critical-minerals-supply-concentration-risks-become-reality)
- [IEA 2026 rare-earth assessment](https://www.iea.org/reports/rare-earth-elements/executive-summary)
- [Weber et al. (2024), systemically significant prices](https://doi.org/10.1093/icc/dtad080)

## Frozen 2025 material panel

“Residual supply” here is simply the share left after removing the largest
observed producer at the specified stage while holding demand fixed. It is not
the IEA's N-1 balance (which also removes that producer's domestic demand), not
loss of China as a bloc, not a forecast for 2035, and not always a refinery
measure. Gallium's denominator sums country rows because the displayed USGS
world total is rounded.

| Material/stage | Dominant producer share | Residual supply | U.S. import reliance | Reported U.S. stock months | kg in IEA NMC-622 EV |
|---|---:|---:|---:|---:|---:|
| Low-purity gallium | China 99.0% | 1.0% | 100% | 2.15 | — |
| Natural graphite mine | China 77.8% | 22.2% | 100% | — | 66.3 |
| Cobalt mine | Congo (Kinshasa) 74.2% | 25.8% | 79% | 1.88 | 13.3 |
| Broad rare-earth mine | China 69.2% | 30.8% | 67% | — | 0.5 |
| Nickel mine | Indonesia 66.7% | 33.3% | 41%* | 1.36 | 39.9 |
| Refined copper | China 48.3% | 51.7% | 57% | 2.45 | 53.2 |
| Lithium mine | Australia 31.7% | 68.3% | >50% | — | 8.9 |

`*` Nickel's 41% includes scrap; USGS says reliance excluding scrap is nearly
100%. Broad rare-earth mine output understates concentration in separated magnet
rare earths and finished magnets. Natural graphite mine output is not equivalent
to battery-grade spherical graphite. These stage mismatches remain in the row
metadata and must not be optimized away.

The IEA recipe is one entire-vehicle design: 75 kWh NMC-622 with a graphite
anode, excluding steel and aluminium. Manganese (24.5 kg) is retained as an
unmatched recipe row rather than silently discarded; it does not yet have a
network node. Because the current producer-loss shock is expressed as a fraction
of normal supply, kilograms cancel out of its fixed-proportion output ratio. The recipe is
an audited absolute-demand overlay; it will become causal when vehicle counts
from the global model are converted into tonnes of demand.

## Model revisions

### V1: cost share as quantity importance

V1 assumes a missing input reduces output only in proportion to its direct cost
share. This is useful for prices and badly wrong for tiny essential parts: a
one-dollar chip can stop a much more valuable vehicle.

### V2: toy dynamic network

V2 introduced critical versus non-critical inputs, normalized inventories,
monthly supply paths, and slow substitution. It reproduced Weber-style price
network calculations and the timing envelope of the April 2025 rare-earth
episode, but every material shared a fitted quarter-month buffer and most supply
magnitudes were hand set.

### V3: observed overlays and accessible inventory

V3 replaces the N-1 shock magnitudes with current USGS producer shares, overlays
reported U.S. stock/consumption ratios where available, and commits the IEA EV
recipe. Event fitting estimates that about 40% of gross reported/event-prior
stocks behave like inventory accessible to the affected chain.

That 40% is an **effective accessibility parameter**, not a claim that 60% of
metal is imaginary. Grade/specification, location, contracts, safety stocks,
and uneven holdings can keep national inventory from serving the marginal plant.
Where USGS publishes no stock row, the old visible network prior remains and the
output labels it `assumed`.

This change is motivated by the USGS gallium/germanium model: for complete
gallium restriction, loss of available quantity drives far more modeled GDP
damage than higher raw-material prices. The physical constraint therefore binds
independently of the input's tiny cost share.

## Five-event backtest and retrospective

The development set is 2010 rare-earth quotas, 2011 Tohoku components, and the
2021 auto-chip shortage. Frozen holdouts are 2023 gallium licensing and the 2025
heavy-rare-earth/magnet controls.

Targets are ranges because the evidence is heterogeneous:

- USGS reports 2010 exports down 40%, sharply higher prices, and most
  rare-earth prices peaking in mid-2011.
- Current G.17 motor-vehicle output fell about 7% in April 2011 versus the
  January–March mean; Fed contacts reported recovery during Q3.
- The Fed documents widespread 2021 auto-plant slowdowns. Current G.17 motor
  vehicle output has an event-window trough about 27% below January and recovery
  around late 2021/early 2022.
- China introduced gallium licensing in August 2023, but aggregate U.S.
  semiconductor-component IP fell less than 2% through September and then rose.
- IEA reports April/May 2025 rare-earth/magnet export falls, some auto plant
  curtailment, subsequent volume recovery, and European prices up to six times
  Chinese prices.

| Model | Fitted accessible inventory | Development interval score | Holdout interval score |
|---|---:|---:|---:|
| V1 cost share | 0% | 1.054 | 0.683 |
| V3 physical bottleneck | **40%** | **0.000** | **0.017** |

| Event | Set | V1 first curtailment | V3 first curtailment | V3 recovery | V3 scored/diagnostic result |
|---|---|---:|---:|---:|---|
| 2010 rare-earth quota | Development | None | Month 2 | Month 7 | 5.0x input price; downstream magnitude unscored |
| 2011 Tohoku | Development | None | Month 1 | Month 3 | 8% trough |
| 2021 auto chips | Development | None | Month 2 | Month 13 | 24% trough |
| 2023 gallium licensing | Holdout | None | **None** | None | 0% broad modeled trough, observed range 0–3% |
| 2025 rare-earth controls | Holdout | None | **Month 1** | **Month 5** | 7.5x price; modeled trough magnitude unscored |

The initial cost-share model misses both positive development curtailments and
the 2025 holdout. The physical model also passes the useful negative case: about
2.15 gross months of reported gallium stocks, partly accessible, bridge the
short licensing episode without predicting a broad semiconductor shutdown.

The zero development score is not precision. Three parameters are selected
against broad ranges and assumed supply paths. It means the compact mechanism
can reproduce those event envelopes; it does not identify causality. The input
supply paths are not independently measured for every product, so this tests the
buffer/bottleneck mechanism more than it tests shock estimation. The grid also
selects zero short-horizon technical substitution: these events do not identify
meaningful redesign inside 15 months. Likewise, the model's 65% firm-level 2025
rare-earth trough is deliberately **not scored
or reported as an observed aggregate fact** because IEA supplies no
representative global output magnitude.

## Empirically anchored dominant-producer loss

This is a 12-month loss of the largest producer with demand held fixed, not a
forecast or an IEA N-1 balance. “Output-months lost” sums the shortfall in the
normalized EV/wind/grid/data-center basket over 11 shock months. One unit equals
one month of the whole modeled basket. The topology and allocation remain
assumptions, so ranks are more defensible than levels.

| Material | Residual supply | Stock basis | Output-months lost | Avoided by 3x modeled buffers | Avoided by +20pp diverse supply |
|---|---:|---|---:|---:|---:|
| Gallium | 1.0% | USGS | **8.23** | 2.15 | 2.10 |
| Refined copper | 51.7% | USGS | **4.06** | 2.15 | 2.27 |
| Rare earths | 30.8% | Assumed | **3.52** | 0.79 | 1.39 |
| Natural graphite | 22.2% | Assumed | **3.09** | 0.56 | 0.93 |
| Cobalt | 25.8% | USGS | **2.32** | 0.85 | 1.31 |
| Nickel | 33.3% | USGS | **2.04** | 0.64 | 1.22 |
| Lithium | 68.3% | Assumed | **1.04** | 0.55 | 0.88 |

Relative to the prior hand-set producer-loss table, copper moves from fourth to second.
The reason is not a new copper apocalypse: V3 uses the observed 48.3% Chinese
share of 2025 refinery production instead of assuming 70% residual coverage,
and copper touches almost every modeled branch. Gallium remains the clearest
single-source chokepoint. Rare earths and graphite remain high, but their missing
inventory data make the stock-policy comparison less secure.

For sustained shocks, diverse operating capacity generally beats more inventory
because inventory only shifts the onset. For a short licensing interruption,
inventory can prevent plant stoppage entirely. Policy therefore needs both:
specification-matched buffers for weeks/months and alternate capacity for
quarters/years.

## Weber price-network check

The 2000–2019 Weber volatility experiment fits the network exposure; 2021-Q4 and
2022-Q2 shock vectors are held out. These are published model outputs, not
observed causal CPI decompositions.

| Held-out vector | V1 direct MAE (CPI pp) | V1 rank rho | V2 network MAE | V2 rank rho |
|---|---:|---:|---:|---:|
| 2021-Q4 | 0.198 | 0.190 | 0.009 | 0.976 |
| 2022-Q2 | 0.205 | 0.667 | 0.007 | 1.000 |

This validates the implementation of Weber's method, not the current physical
network or a causal inflation theory.

## Data access

No signup is required for the committed USGS, Federal Reserve, CDC/WHO, or IEA
web-page observations. A free IEA login may be convenient for downloading some
full report/chart files, but this build does not require it.

A free **BEA API key** would materially help the next step: replacing monetary
cost-share assumptions with current U.S. direct-requirements tables. If obtained,
set it locally as `BEA_API_KEY`; never paste it into chat or commit it. OECD ICIO
bulk tables are public and require no account, although automated downloads can
be blocked by their anti-bot layer. Thus BEA signup is optional, not a blocker.

## Next limitations to attack

1. Ingest BEA direct requirements and OECD ICIO geography while preserving the
   separate physical recipe overlay.
2. Convert normalized supply ratios into tonne-conserving flows by stage:
   mine → refining → active material/component → final product.
3. Fit plant/product-specific inventories, contracts, rationing priorities, and
   qualification delays from microdata.
4. Archive contemporaneous event data vintages; current G.17 history is revised
   and event-window movements are not causal attribution.
5. Add technology choice (LFP vs nickel-rich batteries, induction vs permanent
   magnets, copper/aluminium), recycling, investment, and capacity lead times.
6. Only then couple material demand to the global energy, data-center, and
   regional-capital forecasts.
