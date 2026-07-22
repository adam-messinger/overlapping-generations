# Critical-material input/output network

This toy model asks two different questions that are often conflated:

1. Which upstream input price can propagate most strongly through a strategic
   manufacturing basket?
2. Which physical shortage can stop the most downstream production, after
   inventories and substitution are considered?

Run it with:

```bash
node --import tsx scripts/critical-materials-backtest.ts
```

## Design and best practice

The price side follows Isabella Weber, Jesús Lara Jauregui, Lucas Teixeira, and
Luiza Nassif Pires: an exogenous price shock enters a Leontief cost-price system,
propagates through the transposed direct-requirements matrix, and is weighted by
final consumption. In compact form:

```text
Δp_endogenous = (I - A'ee)^-1 A'xe Δp_exogenous
```

The quantity side follows the lessons from dynamic input/output disaster and
COVID models: a full Leontief production function is usually too brittle;
inventories delay shocks; only critical inputs should bind output one-for-one;
rationing and the assumed direct shock matter enormously; and substitution and
capacity adjust more slowly than prices.

Primary references and data anchors:

- [Weber et al. (2024), systemically significant prices](https://doi.org/10.1093/icc/dtad080)
- [Pichler et al., dynamic input/output lockdown model](https://arxiv.org/abs/2102.09608)
- [Pichler & Farmer, simultaneous supply and demand constraints](https://doi.org/10.1080/09535314.2021.1926934)
- [IEA Global Critical Minerals Outlook 2025](https://www.iea.org/reports/global-critical-minerals-outlook-2025/executive-summary)
- [IEA 2025 rare-earth export-control retrospective](https://www.iea.org/commentaries/with-new-export-controls-on-critical-minerals-supply-concentration-risks-become-reality)
- [IEA 2026 rare-earth supply-chain assessment](https://www.iea.org/reports/rare-earth-elements/executive-summary)

The committed network is intentionally small: seven upstream materials,
semiconductors, magnets, batteries, power electronics, motors, and four final
sectors (EVs, wind, grid equipment, and data-center equipment). Its topology and
all cost shares are visible in `src/simulations/critical-materials/data.ts`.
Those coefficients are assumptions, not a disguised empirical global use table.

## V1 and retrospective

V1 has two matching simplifications:

- Prices: rank an input only by its direct consumer-basket weight, with one
  fitted global scale.
- Quantities: use no inventory and no substitution, so a critical-input shock
  hits downstream output immediately.

That fails in exactly the expected places. Direct exposure misses upstream oil,
chemicals, utilities, and wholesale trade in Weber's benchmark. In the April
2025 rare-earth episode it predicts EV curtailment in the first shock month,
whereas IEA reports exports falling sharply in April and May before some
automakers cut utilization or stopped plants.

V2 adds the total-requirements exposure inferred in the 2000–2019 Weber
experiment. On quantities it adds input inventories, critical versus
non-critical recipes, gradual technical substitution, explicit monthly capacity
paths, and a scarcity-price curve.

## Tests against history

### Weber method reproduction

The 2000–2019 volatility experiment is the fit set. The 2021-Q4 and 2022-Q2
shock vectors are held out. These targets are Weber et al.'s published model
outputs, not observed causal CPI decompositions; this is a useful implementation
test and out-of-period shock test, but not independent validation of the theory.

| Held-out shock vector | V1 MAE (CPI pp) | V1 rank rho | V2 MAE (CPI pp) | V2 rank rho |
|---|---:|---:|---:|---:|
| 2021-Q4 | 0.198 | 0.190 | 0.009 | 0.976 |
| 2022-Q2 | 0.205 | 0.667 | 0.007 | 1.000 |

The network term, not the fit scale, supplies nearly all of that gain.

### 2025 rare-earth event envelope

The fitted targets are the first downstream curtailment month and IEA's reported
European import-price envelope of up to six times Chinese prices. Recovery month
is kept as a small holdout.

| Version | Fitted inventory | First EV curtailment | Recovery | Peak import price |
|---|---:|---:|---:|---:|
| V1 static | 0 months | month 1 | month 5 | 6.11x |
| V2 dynamic | 0.25 months | month 2 | month 5 | 6.11x |

The fitted quarter-month inventory is about one week of normal use. It should be
read as an effective chain buffer, not a survey estimate for every firm. The
recovery result is not discriminating: both versions recover because the
observed supply recovery is imposed exogenously. A real capacity/licensing model
must forecast that path.

## Initial N-1 stress result

The following is a 12-month stress, not a forecast. IEA's published 2035 N-1
coverage ratios are used for lithium (60%), nickel (55%), cobalt and graphite
(27.5%). Rare earth (20%) and gallium (10%) are conservative stresses informed
by IEA's concentration data; copper (70%) is an explicit exploratory assumption.
“Output-months lost” sums the shortfall in the four-sector final basket over 11
shock months, so 1.0 is one month of the whole basket.

| Material | N-1 coverage | Output-months lost | Avoided by 3x stock buffer | Avoided by +20pp diverse supply | Basket price impact of 100% input-price shock |
|---|---:|---:|---:|---:|---:|
| Gallium | 10.0% | 7.86 | 0.97 | 2.11 | 0.56% |
| Magnet rare earths | 20.0% | 4.31 | 0.77 | 1.41 | 0.80% |
| Battery graphite | 27.5% | 2.92 | 0.40 | 0.93 | 0.86% |
| Copper | 70.0% | 2.69 | 0.69 | 2.26 | 8.32% |
| Cobalt | 27.5% | 2.40 | 0.41 | 1.30 | 0.38% |
| Lithium | 60.0% | 1.49 | 0.40 | 0.89 | 0.76% |
| Nickel | 55.0% | 0.83 | 0.41 | 0.77 | 0.76% |

Three preliminary conclusions survive the distinction between price and
quantity networks:

- Gallium/semiconductors and rare-earth magnets are tiny-volume, high-value
  physical chokepoints. Their low cost shares do not protect downstream output.
- Copper is less concentrated in this stress but ubiquitous. It is by far the
  largest price-propagation node and remains a large physical risk.
- Inventories are bridges, not substitutes for capacity. In a year-long loss of
  the dominant supplier, +20 percentage points of diverse supply prevents more
  lost output than tripling the small fitted buffer. For a short licensing or
  logistics interruption, the stock buffer is exactly what delays plant stops.

## What still needs work

1. Replace toy cost shares with BEA/OECD inter-country input/output tables and
   physical material-flow coefficients from IEA/USGS, keeping geography and
   ownership separate.
2. Fit actual sector inventories and rationing priorities. The current pro-rata
   normalized supply rule cannot represent contracts, strategic allocation, or
   firms with no alternate supplier.
3. Endogenize prices, demand destruction, recycling, capacity investment, mine
   and refinery lead times, and policy/licensing duration.
4. Model technology choice explicitly: LFP versus nickel-rich batteries,
   induction versus permanent-magnet motors, copper/aluminum substitution, and
   performance penalties.
5. Backtest more independent events: the 2010 rare-earth shock, 2011 Tohoku
   component disruptions, 2021 semiconductor shortage, 2022 lithium/nickel
   shock, and 2025 gallium/rare-earth controls.
6. Couple the resulting material demands to the global energy, data-center, and
   regional-capital paths only after those empirical replacements are in place.
