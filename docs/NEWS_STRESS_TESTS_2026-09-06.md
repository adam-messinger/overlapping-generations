# News-driven stress tests — 6 September 2026

This pass screened the day's top stories for something measurable, a mechanism
the repository can represent without pretending to identify more than the data
allow, and at least one independent check. Three survived, and each went
through two rounds of revision after the first version was run:

1. The Strait of Hormuz is reported "closed for 190 days" with 7% of normal
   transits, the US has destroyed three Iranian tankers, and Brent is $96.
   How much oil is actually moving, and what does that do to the settlement
   clock?
2. US diesel hit a record $5.85, August payrolls printed 162,000 against
   55,000 expected, and markets price a 60–65% chance of a Fed hike on
   16 September. How much inflation is the diesel record, and what would a
   hike buy?
3. The Bundibugyo Ebola epidemic is "the fastest growing on record" and has
   passed 3,000 deaths. Is it still growing?

Run the models with:

```bash
npm run news:2026-09-06
```

These are conditional stress tests, not forecasts. The oil settlement hazard
is a swept judgment, the policy model's rate transmission is weak by
construction, and the Ebola weekly counts are interpolated between batched
cumulative reports.

## News screen

| Story screened | Modeling decision | Reason |
|---|---|---|
| US strikes Iranian tankers; Hormuz "closed for 190 days"; Brent $96 | Selected | Two calibrated oil models, a transit tracker, a prediction market, and an IEA stock series allow a price-versus-barrels reconciliation |
| Record US diesel, refineries out, "fueling inflation worries" | Selected | Reported shortfall volumes, the record crack spread, and the July CPI decomposition identify the incremental channel |
| 162,000 jobs; Fed hike odds above 60% | Selected, folded into story 2 | The BLS sampling interval and revisions make this a signal-extraction problem the existing inflation-policy model can absorb |
| Ebola passes 3,000 deaths; "critical threshold" | Selected | Thirteen dated cumulative anchors and the existing SEIR laboratory support a fit with a genuine holdout |
| German state elections, far-right gains | Not selected | No measurable outcome the repository's models can represent |
| New York bans generative AI in elementary and middle schools | Not selected | No quantitative claim to test |
| OpenAI releases GPT-6 | Not selected | Data-center load was modeled on 24 and 26 July; one release adds no new observable |
| France €1B drought aid; European drought | Deferred | The heat and food modules exist, but the day's reporting carried no yield or acreage numbers |

Sources for the screen: [ABC live updates](https://abcnews.com/International/live-updates/iran-live-updates-centcom-targeted-iranian-forces-posed/?id=136080582),
[straits.live](https://straits.live/), [Brent](https://tradingeconomics.com/commodity/brent-crude-oil),
[the diesel record](https://www.usnews.com/news/business/articles/2026-09-04/us-diesel-prices-hit-a-record-high-of-5-85-on-average-as-the-iran-war-disrupts-the-flow-of-fuel),
[CNBC on refineries](https://www.cnbc.com/2026/09/04/diesel-price-record-high-ukraine-iran-inflation.html),
[the diesel crack record](https://www.ttnews.com/articles/diesel-crack-spread-record),
[hike odds after the jobs report](https://www.redfin.com/news/august-jobs-report-increases-september-rate-hike-odds/),
[the July CPI](https://www.cnbc.com/2026/08/12/cpi-inflation-report-july-2026.html),
[WHO DON616](https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON616),
[CDC MMWR](https://www.cdc.gov/mmwr/volumes/75/wr/mm7535e1.htm),
and the [Wikipedia current-events portal](https://en.wikipedia.org/wiki/Portal:Current_events/September_2026).

## Results at a glance

| Story | Headline shortcut | Revision | Comparison with the day's narrative |
|---|---|---|---|
| Hormuz | 7% of transits means 7% of oil; "closed" is physical | The price alone does not identify the flow (two models reproduce $96 at 5% and 31%); the IEA's observed 410 mb draw is the discriminating series, and with a $96 price it implies roughly 25–45% of normal Gulf oil still reaching buyers | Disagrees with "closed" as a physical description; agrees that the situation is fragile: both models put Brent above $105 by December if nothing reopens, because the buffers holding $96 are thinning |
| Diesel and the Fed | +58% diesel across "a long list of goods" (+1.4pp headline); 162k jobs means overheating | The record is 84% crack spread; the increment since July adds ~0.17pp to headline over a year; base effects pull headline from ~3.9% in December to ~2.9% by June 2027 under any rule; the hiking rule costs 0.12pp of output for 0.001pp of inflation; the payroll trend exceeds 90k with 33% probability | Agrees that the print was a genuine surprise; disagrees that it changes the inflation outlook, which is dominated by arithmetic the Fed does not control |
| Ebola | Doubling every 25 days; 202,000 confirmed by year-end | Weekly confirmed cases have been flat at ~630 since mid-July; the fitted Rt is 1.01; the plateau path gives ~17,000 confirmed and ~9,000 deaths by 31 December | Disagrees with "fastest growing"; agrees the outbreak is not controlled, and flags that a flat confirmed count is also what a laboratory-throughput ceiling produces |

## 1. Hormuz: the price does not identify the barrels

### V1: read the tracker literally

straits.live reports 6 transits a day against an 85-a-day baseline on
30 August, and a strait "closed for 190 days" on 6 September. Reading the
7.1% vessel count as an oil-volume share removes 19.4 mb/d of seaborne flow.
After the 4.7 mb/d bypass pipelines (at 75% utilization) and 1.4 mb/d of
non-Gulf response, 14.5 mb/d, or 14% of world liquids supply, is gone. With a
short-run elasticity of 0.2 and no stock draws that clears at $145. The
reserve-and-magazine settlement model, run with 7% throughput in August and
September, gives $116. The stock-flow model gives $95, which looks like a
confirmation until one notices why (below).

### V2: invert each model on $96

The two models were each inverted for the throughput that reproduces $96.28
in September (and $89 in late August):

| Model | September throughput implied by $96 | Stock draw March–September |
|---|---:|---:|
| Settlement model (elasticity 0.06, $29/bbl war premium at full tempo) | 31% at 0.9 tempo | 1,432 mb |
| Stock-flow model (elasticity 0.35, 4 mb/d draw cap) | 2–9% (price within $3 anywhere in the band) | 852 mb |

The stock-flow model is insensitive to throughput below 10% because its
inventory draw is capped and its medium-run elasticity absorbs the rest. The
settlement model, with a low elasticity, needs far more oil to be moving. Both
are calibrated to the March–July record. The price is not enough to tell them
apart.

Two things did come out of the inversion:

- **The week's rise is premium, not barrels.** The settlement model attaches
  $29/bbl of war premium at Epic Fury tempo. Going from August's relative calm
  (0.35) to renewed strikes (0.9) adds $16, more than the $7 Brent actually
  rose, so the implied September flow (31%) is *higher* than August's (23%).
  The result depends on tempo: at 0.3 the implied flow is 12%, at 0.7 it is
  26%, and at full tempo the premium alone exceeds $96 and no shortfall is
  needed.
- **Dark tankers are the reconciliation.** 79 of 231 screened tankers went
  AIS-dark in 24 hours (34%). A tracker counts what it can see.

### V3: the IEA stock series as holdout and anchor

The IEA's August Oil Market Report puts cumulative observed stock draws at
410 mb between end-February and end-July, 2.7 mb/d. Neither model was
calibrated to it:

| Model | Modeled draw March–July | Observed | Ratio |
|---|---:|---:|---:|
| Settlement model | 862 mb | 410 mb | 2.1× |
| Stock-flow model | 609 mb | 410 mb | 1.5× |

Both over-draw, which means both overstate the physical shortfall, which means
both understate the flow. The identity is simple: seaborne loss equals bypass
plus non-Gulf response plus stock draw plus price-induced demand reduction. Only
the elasticity is unobserved:

| Demand elasticity | Demand reduction at the March–July average price (1.53×) | Physical loss | Implied Hormuz oil throughput |
|---:|---:|---:|---:|
| 0.10 | 4.3 mb/d | 7.0 mb/d | 45% |
| 0.15 | 6.4 mb/d | 9.1 mb/d | 35% |
| 0.20 | 8.5 mb/d | 11.2 mb/d | 26% |
| 0.35 | 14.4 mb/d | 17.1 mb/d | 0% (rules the value out) |

The elasticity of 0.35 that the stock-flow model uses in the medium run would
require 14 mb/d of demand destruction, which did not happen, so the observed
draw bounds the elasticity as well as the flow. The stock-anchored reading is
25–45% of normal Gulf oil still reaching buyers, four to six times the vessel
count.

### The settlement clock

Branches from October, using the settlement model with its price-implied
August and September throughput, conditioned on the war surviving to October
(the model, as of July, had placed 34% of its mass on a durable settlement
before October, which did not occur):

| Branch | Settled by 31 Dec | Settled by Jun 2027 | Conditional median | Brent Oct→Mar | SPR release ends |
|---|---:|---:|---|---|---|
| Escalation: full tempo, strait closed outright | 31% | 59% | Apr 2027 | 120/126/119/94/96/96 | Nov 2026 |
| Attrition: September tempo and flow persist | 27% | 58% | Apr 2027 | 107/113/112/111/112/96 | Nov 2026 |
| Pause: strikes stop, shipping normalizes over six months | 19% | 43% | Aug 2027 | 87/89/81/72/72/72 | Nov 2026 |

The prediction market's 26% for normal transit by 31 December sits inside the
model's 19–31% band. The disagreement is with the price forecasts: the EIA's
$85 third-quarter Brent and its $79 annual average are reopening paths. Under
attrition, with nothing changing, the model's Brent rises from $96 to $107–113
in the fourth quarter because the stock draw that holds the price falls from
5 mb/d to under 3 mb/d as the SPR release completes in November and commercial
stocks thin. The stock-flow model tells the same story at its own flow: 41% of
accessible stocks remain in September, exhausted in five months, after which
the multiple is 1.55× ($106). Because both models over-draw relative to the
IEA, these are upper bounds on how fast the buffer goes; the direction is not
in doubt.

Escalation *raises* the settlement hazard in this model (through the US
inflation and interceptor channels). That is a property of the hazard mapping,
which is a swept judgment, not an estimate.

## 2. Diesel, payrolls, and the Fed

### V1

Diesel is up 58% year over year. Applied at once to a 2.5% "diesel-exposed"
basket (fuel oil, other motor fuel, and a freight share), that is +1.4pp on
headline CPI. Payrolls at 162,000 are 1.8 times the top of the breakeven range.

### V2a: the distillate market

Reported disruptions total 2.2 mb/d of 28 mb/d global diesel demand: Russia's
export ban (0.8), Hormuz (1.2), other outages (0.2). Net of a 0.3 mb/d stock
draw, 6.8% of demand has to be priced out. Wholesale diesel is $202/bbl
($96 Brent plus a $106 crack) against $112 a year ago, a 1.80× multiple. The
crack accounts for 84% of the wholesale rise. The implied short-run elasticity
is 0.12, inside the usual 0.05–0.2 range, so the record needs no demand story.

Two sensitivities: losing the remaining Hormuz product flow (another 1.2 mb/d)
at that elasticity gives $8.19 a gallon; the same shortfall once demand adjusts
(elasticity 0.25) gives $4.58.

### V2b: what the increment can add to CPI

| Quantity | Value |
|---|---:|
| July average diesel (weekly AAA prints) | $4.96/gal |
| Increment since July on 3.6 mb/d of distillate | $49B/yr, 0.23% of PCE |
| Year-over-year increment (mostly already in the index) | $118B/yr |
| Direct CPI level (0.2% weight) | +0.04pp |
| Indirect after one year (70% pass-through, 5-month half-life) | +0.13pp |
| Total | **+0.17pp** |

### V2c: base effects

Energy contributed 0.88pp to July's 3.4% headline. If retail energy simply
stays at September levels, the March–May 2026 jump leaves the twelve-month
window by spring 2027 and headline mechanically converges on core plus the
diesel increment: about 2.7% by June 2027.

### V2d: policy rules

The existing energy-inflation policy model was run on a retail-energy path
built from reported gasoline and diesel prices (month 0 is March 2026; the
September level is held). It reproduces July at 3.52% against 3.4% reported.

| Rule | Peak funds rate | Headline Dec 2026 | Jun 2027 | Dec 2027 | Output-gap trough |
|---|---:|---:|---:|---:|---:|
| Look through (90% of the headline–core gap ignored) | 3.68% | 3.93% | 2.89% | 2.52% | −0.25pp |
| Hike rule (30% look-through, unit inflation response) | 4.71% | 3.92% | 2.89% | 2.52% | −0.37pp |

Headline drifts up into year-end on the September fuel level, then the base
effect takes over under either rule. The hiking rule delivers 0.001pp less
inflation in December 2027 for 0.12pp more output loss. The model's
transmission is weak by construction; the usual rule of thumb (about −0.2pp on
inflation per 100bp after two years) puts one 25bp step at −0.05pp, still an
order of magnitude below the base effect.

### V2e: the payroll print

BLS's 90% interval on the monthly change is ±122,000, a standard error of
74,000. The 162,000 print is a genuine surprise (93% probability it is above
the 55,000 consensus). But the three-month average with June and July revised
to 31,000 and 21,000 is 71,000 ± 43,000. With a 2026 breakeven range of
30,000–90,000 (a judgment; the Fed's April note argues for a range), the
probability that trend hiring exceeds the top of the range is 33%, and that it
exceeds the bottom is 83%. The labor market is not weakening; it is not
obviously overheating either.

## 3. Ebola: arithmetic, not geometric

### The data

Cumulative confirmed cases and deaths were anchored on thirteen dated reports
(WHO DON602, DON605, DON616; CDC MMWR; the outbreak timeline) and interpolated
onto weeks from the 15 May declaration:

```text
week:   0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
cases: 63  63 276 276 276 300 304 304 494 636 500 500 665 793 336 728
```

The batching is visible (weeks 13–15 are one report's 793, then 336, then
728). Two-week ratios, which damp it, give Rt ≈ 1.3, 1.9, 1.4, 0.9, 1.0, 1.5,
1.0, 0.7 over the last eight weeks. The last four weeks average 630 a week
against 636 in mid-July.

### V1

From 1,000 cases on 20 June to 5,000 on 17 August is a 25-day doubling time.
Continued to 31 December it gives 202,000 confirmed cases. 5,458 cases in the
first 100 days is 5.5 times West Africa's 2014 pace over the same window,
which is the "fastest on record" comparison.

### V2 and V3: SEIR with a staged response, thirteen training weeks, three holdout weeks

| Fit | Response | Rt now | Holdout cumulative error (weeks 14–16) |
|---|---|---:|---:|
| V2 single stage (train ≤ 14 Aug) | R0 1.8 × 0.70 from day 7 | 1.26 | +39% |
| V3 second stage (train ≤ 14 Aug) | × 0.665 from day 70 (24 July) | 1.20 | +29% |
| V3 refit on all weeks (projection basis) | × 0.56 from day 70 | **1.01** | — |

A model that carries the June–July growth over-predicts the last three weeks
by 39%. Adding a mid-July stage, fitted only on the training weeks, improves
the holdout by ten points; refitting it on all sixteen weeks puts the effective
reproduction number at 1.01. Fitted ascertainment is 31% of infections (WHO
says reported cases are at least half of reality) and the implied fatality among
confirmed cases is 61% against 48% reported, a delay-structure artifact.

The outbreak model gained an optional `additionalStages` field for this, so
that a post-observation branch can be encoded without discarding the fitted
mid-July stage.

### Projections to 31 December

| Branch | Rt | Confirmed cases | Confirmed deaths | Weekly cases, late December |
|---|---:|---:|---:|---:|
| V1 exponential | — | 202,000 | — | — |
| Plateau continues | 1.01 | 17,300 | 9,000 | 650 |
| Response strengthens 20% | 0.81 | 12,200 | 6,600 | 130 |
| Response erodes 20% | 1.21 | 30,000 | 14,500 | 2,600 |

"Fastest growing on record" describes May through July. Since mid-July the
confirmed count has been flat, and that is neither containment nor explosion.
The caveat that matters: at 24% test positivity, 630 confirmed a week is about
2,600 tests a week, and a flat confirmed count is exactly what a laboratory
ceiling would produce. MMWR reports 72% of validated alerts tested and 59% of
deaths occurring outside treatment units. Community deaths, not confirmed
cases, are the series that would distinguish a plateau from a ceiling.

## Where the models differ from the day's narrative

- **Hormuz.** "Closed for 190 days" is an insurance and routing status. The
  IEA draw plus the price is arithmetic for roughly a third of normal Gulf oil
  still reaching buyers through the bypass pipelines, Iran's designated route,
  and a dark fleet the tracker cannot see. The week's $7 rise is smaller than
  the war premium renewed strikes carry, so the physical flow did not fall.
  The consensus price forecasts are reopening paths; hold the current state
  and both repository models put Brent above $105 by December as the buffers
  that have held $96 thin out and the SPR release completes in November.
- **Diesel and the Fed.** The diesel record is a refining-margin event. Its
  incremental CPI contribution is about 0.17pp over a year, against a base
  effect that takes headline from about 3.9% in December to about 2.9% by June
  2027 with no policy change at all. The hike the market prices changes that
  path by an amount the model cannot distinguish from zero, at a real output
  cost. The jobs print was a real surprise and a weak trend signal.
- **Ebola.** The curve stopped being exponential seven weeks ago. The
  year-end range is roughly 12,000–30,000 confirmed cases, not 200,000, unless
  the flat count is the laboratory's throughput rather than the epidemic's.

## Limits

- Hormuz: both repository models draw stocks 1.5–2× faster than the IEA
  observed, so their post-buffer price paths are upper bounds. The settlement
  hazard mapping is a swept judgment. A durable settlement is not the same
  event as normal transit, so the prediction-market comparison is approximate.
  August and September tempo values are judgments; the tempo sweep shows how
  much rides on them.
- Diesel: the policy model's transmission from the funds rate to inflation is
  weak by construction, and the comparison is between endogenous rules, not a
  single 25bp move. The breakeven employment range is a judgment. The gasoline
  path for March–May and August is interpolated from reported anchors.
- Ebola: weekly counts are interpolated between batched cumulative reports;
  ascertainment and fatality are fitted observation parameters, not
  epidemiological estimates; the second response stage is reduced-form; the
  branches are scenarios, not forecasts, and a spatially shifting epidemic can
  look flat in aggregate while individual health zones are still growing.
