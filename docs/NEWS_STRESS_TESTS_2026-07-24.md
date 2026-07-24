# News-driven stress tests — 24 July 2026

This pass converts three questions in the 24 July news cycle into small,
auditable `tsimulation` models:

1. Does a $100 oil shock imply a repeat of the euro area's 2022 inflation and
   rate cycle?
2. Does reported AI revenue exceeding depreciation mean the current data-center
   buildout is economically self-funding?
3. Is El Niño the main cause of the current global coral-bleaching footprint,
   or primarily a timing amplifier on top of ocean warming?

They were selected because each has a measurable outcome, a plausible causal
mechanism, public inputs, and either a historical reconstruction or a frozen
holdout. They are conditional stress tests, not unconditional forecasts.

Run all three with:

```bash
npm run news:2026-07-24
```

## Results at a glance

| Question | Initial toy model | What failed | Revised central result |
|---|---|---|---|
| Hormuz → energy network → inflation → policy | Mechanical energy-CPI pass-through, followed by an aggregate indirect-pass-through revision | V1 made policy chase headline inflation; V2 replaced the missing input-output structure with a fitted scalar and implicitly attributed too much of the 2022 core episode to energy | The integrated partial-reopening path peaks near 4.2% headline, 2.3% core, and a 2.4% policy rate. A prolonged closure raises those only to 4.3%, 2.4%, and 2.5% because Hormuz prices adapt rather than remaining on an invented plateau |
| AI revenue → replacement and growth funding | Compare $25B quarterly AI revenue with $21B depreciation | Revenue/depreciation is an accounting coverage ratio, not a cash-profit or replacement test; it omits operating cost and the depreciation/replacement wave embedded in current capex | Central replacement coverage starts at 0.70×, reaches 1× in 2032Q3, and quarterly free cash flow turns positive in 2032Q4; peak cumulative external funding is $1.89T and cumulative cash remains −$1.41T at end-2035 |
| Warming + ENSO → global reef stress | Explain annual 365-day bleaching exposure from lagged positive ENSO alone | Development MAE is 7.1%, but the frozen 2018–2025 holdout MAE explodes to 34.8%; it misses the rising background hazard | Adding the global-ocean temperature baseline lowers holdout MAE to 11.4%. Conditional central extents are 71.9% in 2026 and 89.3% in 2027; the strong 2026 El Niño mainly appears as a lagged 2027 increment |

## 1. Energy prices, euro-area inflation, and policy

The revised calculation is now a four-stage composition:

1. The calibrated Hormuz stock-flow model determines monthly oil and LNG
   availability, inventories, bypass supply, demand adjustment, prices, and
   reopening.
2. Its monthly OECD oil and gas prices proxy the euro-area import shock.
3. Weber total-requirements exposures propagate oil through petroleum and
   extraction and gas through utilities and extraction, keeping direct
   household energy separate from indirect producer costs.
4. The inflation block converts those price-level paths into headline/core
   inflation, expectations, output, and policy.

The 55% oil/45% gas input split remains an explicit crosswalk judgment, not an
HICP weight. The Weber layer is fitted on the published 2000–2019 vector and
retains its strong 2021-Q4 and 2022-Q2 checks: network MAE is 0.009 and 0.007
CPI percentage point, versus 0.198 and 0.205 for the direct-weight shortcut.

The historical comparison now reveals why the aggregate V2 looked too good:

| 2022–2023 reconstruction | Observed | V1 direct-only | V2 aggregate propagation | V3 Weber energy-only |
|---|---:|---:|---:|---:|
| Peak headline inflation | 10.6% | 9.9% | 10.2% | 9.5% |
| Peak core inflation | 5.7% | 2.7% | 4.1% | 3.3% |
| Peak policy rate | 4.0% | 4.7% | 3.8% | 3.5% |

V3 is intentionally an energy attribution, so it should not reproduce all of
2022 core inflation. Its shortfall represents non-energy supply bottlenecks,
reopening demand, wages, rents, food, and other omitted shocks. V2 partially
hid that residual inside one energy pass-through coefficient.

| Current branch | Peak OECD oil | Peak OECD gas | Peak indirect network CPI | Peak headline | Peak core | Peak policy |
|---|---:|---:|---:|---:|---:|---:|
| Short disruption | 1.71× | 1.47× | 0.46pp | 3.5% | 2.3% | 2.4% |
| Partial reopening | 1.71× | 1.47× | 0.46pp | 4.2% | 2.3% | 2.4% |
| Prolonged closure | 1.71× | 1.47× | 0.46pp | 4.3% | 2.4% | 2.5% |

All three share the same initial price peak; duration distinguishes them. The
prolonged path does not hold prices at 1.70×: medium-run demand response,
alternative supply, and route recovery reduce prices even while throughput
remains impaired. Doubling the Weber network exposure still leaves the
partial-reopening result around 4.3% headline, 2.4% core, and a 2.5% policy
rate. The conditional dovish result is therefore not coming from a single
low network coefficient.

This is less hawkish than a literal “$100 oil means 2022 again” reading. It
still permits a small near-term move, but the central model-implied increase is
closer to 20bp than 40bp. The ECB's current distinction among direct, indirect,
and second-round energy channels—and its less propagation-friendly starting
backdrop—is important here.

Sources: [24 July market report](https://au.marketscreener.com/news/stocks-sink-on-big-tech-cash-burn-oil-hits-100-for-first-time-since-may-ce7f51dedf8afe22),
[ECB energy-shock transmission analysis](https://www.ecb.europa.eu/press/key/date/2026/html/ecb.sp260513~5b14c78806.en.html),
and [ECB comparison with the 2022 shock](https://www.ecb.europa.eu/press/key/date/2026/html/ecb.sp260325~ac2916a211.cs.html).

The input-output method is from [Weber et al.](https://doi.org/10.1093/icc/dtad080).

Code: `src/simulations/news/hormuz-weber-inflation.ts`,
`src/simulations/critical-materials/price-network.ts`, and
`src/simulations/news/energy-inflation.ts`.

## 2. AI revenue, depreciation, and the capital cycle

The headline accounting snapshot is real: outside-China quarterly AI revenue
of about $25B exceeds an estimated $21B of AI-related depreciation, for 1.19×
coverage. But that comparison cannot answer whether the buildout is
self-funding. Revenue must also cover power, labor, networking, financing, and
eventual asset replacement; meanwhile, much of the current capex has not yet
entered depreciation.

The revision models quarterly chip and facility cohorts separately, with
deployment lags, four-year chip lives, fifteen-year facility lives, operating
cost, replacement cost, debt financing, and a declining capex path after the
2026 big-tech guide. Results are highly scenario-dependent:

| Scenario | Initial economic replacement coverage | Replacement break-even | All-capex break-even | Peak funding need | Cumulative cash at end-2035 |
|---|---:|---:|---:|---:|---:|
| Fast monetization | 0.77× | 2027Q4 | 2029Q3 | $0.67T | +$2.62T |
| Central | 0.70× | 2032Q3 | 2032Q4 | $1.89T | −$1.41T |
| Slow monetization | 0.62× | After 2035 | After 2035 | $4.31T | −$4.31T |

This falls between the two popular narratives. “Revenue clears depreciation”
is too optimistic as a profitability claim; “cash burn proves the buildout
cannot work” is too pessimistic. The central case eventually becomes
quarterly cash-positive, but not soon enough to earn back the prior standalone
investment by 2035. The fast case works very well and the slow case does not
work at all.

The most important unknown is not useful life by itself. It is a scope-matched
measurement of AI-attributable revenue, operating cost, and capex. The model
currently treats the AI system as standalone and therefore does not net the
large non-AI cash flows of the hyperscalers against its funding need.

Sources: [AI revenue/depreciation estimate](https://aiweekly.co/alerts/exponential-view-ai-revenue-clears-the-depreciation-bar),
[2026 big-tech capex guide](https://www.bloomberg.com/news/articles/2026-04-30/us-big-tech-ratchets-up-ai-spending-past-700-billion-this-year),
and the [24 July market report](https://au.marketscreener.com/news/stocks-sink-on-big-tech-cash-burn-oil-hits-100-for-first-time-since-may-ce7f51dedf8afe22).

Code: `src/simulations/news/ai-capital-cycle.ts`.

## 3. Coral bleaching: baseline hazard versus ENSO timing

The coral target is NOAA Coral Reef Watch's maximum annual 365-day share of
reef pixels at Alert Level 1 or higher. It is a rolling thermal-exposure
measure—not coral mortality. The history combines that series with NOAA's
global-ocean annual anomaly and Oceanic Niño Index.

Both specifications are fitted only through 2017 and evaluated on 2018–2025.
The ENSO-only version misses the large recent expansion in stressed reef area:

| Holdout year | Observed | V1 ENSO-only | V2 warming + lagged ENSO |
|---|---:|---:|---:|
| 2018 | 27.5% | 5.9% | 24.7% |
| 2020 | 39.2% | 8.1% | 40.0% |
| 2022 | 29.6% | 4.6% | 23.4% |
| 2024 | 74.7% | 16.2% | 83.7% |
| 2025 | 77.2% | 15.0% | 68.5% |

In the current conditional path, El Niño adds only 0.2 percentage point to
2026 global exposure because the target uses a rolling window and the event is
still strengthening. It adds about 15 points in 2027. Holding ocean
temperature at its 1986–1995 mean instead lowers the modeled paths from 71.9%
to 2.3% in 2026 and from 89.3% to 6.3% in 2027.

That last comparison is a model counterfactual for warming since the early
satellite record, not a causal estimate of all anthropogenic warming. Ocean
temperature can proxy omitted trends, and the model is extrapolating slightly
beyond its fitted range. Its defensible result is that a rising thermal
baseline is indispensable and ENSO mainly times the pulse. That agrees with
the day's research narrative more than it contradicts it, but differs from the
common shorthand that the emerging El Niño is already the main cause of 2026
global exposure.

The model cannot adjudicate the separate Florida claim that 2026 local
mortality will exceed 2023. It omits local heat histories, species, disease,
acidification, acclimatization, and recovery.

Sources: [NOAA bleaching methodology](https://coralreefwatch.noaa.gov/product/5km/methodology.php),
[NOAA global bleaching status](https://www.coralreefwatch.noaa.gov/satellite/research/coral_bleaching_report.php),
[NOAA current ENSO outlook](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/strengths/),
[warming-versus-ENSO research report](https://www.globalissues.org/amp/news/2026/07/23/43652),
and [Florida coral-rescue report](https://apnews.com/article/coral-rescue-florida-330525586a3c0811cf4e8961929dd88c).

Code: `src/simulations/news/coral-bleaching.ts`; frozen input:
`src/simulations/news/coral-data.ts`.

## What most differs from conventional wisdom

1. **The oil result becomes more dovish after adding—not removing—structure.**
   The partial-reopening headline peak falls from the scalar model's 5.0% to
   4.2%, core from 2.6% to 2.3%, and policy from 2.6% to 2.4%. The key discovery
   is that the old coefficient had absorbed non-energy parts of the 2022
   inflation episode.
2. **The AI accounting milestone is not an economic milestone.** Clearing
   current depreciation does not clear replacement plus operating costs. Yet
   the opposite “unfinanceable bubble” conclusion is also not robust: the fast
   monetization case becomes self-funding in 2029 and produces large positive
   cumulative cash by 2035.
3. **ENSO is more clock than engine at the global scale.** The model's large
   2026 footprint exists without a positive lagged ENSO term; the very strong
   event primarily enlarges 2027 exposure. The magnitude is uncertain, but the
   timing distinction survives the historical holdout.

All source data used here is public and requires no account.
