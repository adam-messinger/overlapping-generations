# News-driven stress tests — 8 November 2026

This pass screened the week's top stories for a measurable claim, a mechanism
the repository can represent, and an independent check. Three were selected,
each was run, revised against a holdout, and compared with how the story is
being told. A fourth section scores the 6 September forecasts against what
has happened since.

1. Brent fell 16% in a week ($117.64 to $98.32) "as traders bet on a US-Iran
   deal". How much of the fall is a deal bet?
2. Payrolls beat again (165,000 against 59,000), a December hike is priced at
   77%, and pump prices are falling. Where is US inflation going, and what is
   a hike resting on?
3. A record El Niño (Niño 3.4 +3.4°C weekly) and the warmest October on
   record. Will 2026 or 2027 beat 2024?

```bash
npm run news:2026-11-08
```

These are conditional stress tests, not forecasts. The war-settlement price
block, the energy-inflation policy model and a temperature regression do the
work; their limits are listed at the end.

## News screen

| Story | Decision | Reason |
|---|---|---|
| Brent −16% on the week, "deal bets" after the Democratic midterm sweep | Selected | Settlement model price block, prediction-market odds, analyst odds, IEA stocks, and JPMorgan balances allow a decomposition |
| 165k payrolls; 77% December hike odds; CPI on 10 Nov; pump prices falling | Selected | The 6 September CPI/payroll models can be scored and re-run on the new fuel path |
| Record El Niño; Copernicus warmest October, 2026 "virtually certain" above 1.5°C | Selected | ERA5 daily series through 6 November and the CPC ONI support a fit with a genuine 2026 holdout; the repository's climate module can be checked against it |
| US midterms: Democrats take both houses | Folded into 1 | It is the reported driver of the oil move; no model output of its own |
| RBA hikes to 4.85%; euro-area inflation 4.0%, ECB hike expected | Not selected | Same mechanism as story 2; no new observable beyond it |
| Nasdaq −3.4% on AI-spending doubts; Amsterdam data-center occupation | Not selected | The AI capital cycle was modelled on 24 and 26 July; no new capex data this week |
| US measles at 5,182 cases, most since 1991 | Deferred | The outbreak laboratory is SEIR without age-structured immunity; vaccination-cohort data would be needed |
| Paraguay: Ueno Bank collapse, president removed | Not selected | The contagion laboratory covers funds and sovereigns, not deposit runs; no balance-sheet data |
| Kraków shooting, Israeli coalition talks, Binance $6B hack, Bangladesh wage board | Not selected | No quantity the repository can represent |

Sources for the screen: [Wikipedia current events, November 2026](https://en.wikipedia.org/wiki/Portal:Current_events/November_2026),
[CNBC on oil](https://cnbc.com/2026/11/06/oil-price-today-brent-wti.html),
[CNBC jobs report](https://www.cnbc.com/2026/11/06/jobs-report-october-2026.html),
[Copernicus October bulletin](https://climate.copernicus.eu/copernicus-warmest-october-record-2026-virtually-certain-exceed-15degc).

## Results at a glance

| Story | Headline reading | After revision | Where the model differs from the narrative |
|---|---|---|---|
| Brent | The market moved to price a deal | A deal-odds move explains at most $4.90 (25%) of the $19.32 fall. On the stock-clearing model, the 6 November close is the no-deal status quo at full tempo ($100); the 30 October close was $14 above even a re-closure ($103) | The week took out a premium above anything fundamentals support, not a deal bet. $98 is consistent with the 10–20% deal odds analysts quote, not Polymarket's 41.5% |
| Fed | Inflation "red-hot"; a hike to contain it | Refit on July–September: energy has not leaked into core (pass-through 0.0025 vs 0.025). Headline peaked in October at ~3.7%, ~3.55% in December, ~2.4% by June 2027 under any rule | The hike case is the labour market, now clearly above breakeven (86% vs 33% on 6 September), but wages at 3.1% are below the 2%-consistent pace. A hike does not move 2027 inflation in the model |
| El Niño | 2026 "most likely second"; 2027 could set a record | 2026: 1.58°C, 12% chance of beating 2024 (needs 1.97°C over Nov–Dec). 2027: 1.68°C, 80%, Feb 2027 monthly ~1.88°C | Agrees on direction; adds magnitude. Also finds the repository's own climate module 0.06°C too warm, now corrected |

## 1. Brent: what a deal bet can and cannot explain

### Data

| Date | Brent (Jan 2027) | Event |
|---|---:|---|
| 29 Sep | $102.59 | Middle East exports recovering |
| 21 Oct | $108.82 | |
| 27 Oct | $114.55 | |
| 30 Oct | $117.64 | Qeshm Island strikes; Polymarket "ceasefire holds to 2 Nov" cut 20pts to 78% |
| 31 Oct | — | Draft framework; Polymarket deal by 30 Nov 23.5% → 34% |
| 3 Nov | $103.64 | Midterms |
| 4 Nov | $93.52 | −9.7%; Iran offers to reopen Hormuz within 48h if demands met |
| 6 Nov | $98.32 | Three tanker attacks reported Thursday |

Physical state: Hormuz crude flows below 60% of normal; Middle East exports
20.7 mb/d, up from a 9.8 mb/d March low; JPMorgan puts the market in surplus
by 1.1 mb/d in September and 1.4 mb/d in October; the IEA has observed stocks
509 mb below pre-war at end-September.

Odds: Polymarket deal by 31 December 41.5%, normal Hormuz traffic by
31 December 7%. Eurasia Group cut its deal odds from 20% to 10%. Rapidan puts
80% on fighting resuming.

Sources: [FinanceFeeds](https://financefeeds.com/brent-crude-oil-price-98-32-saturday-week-ahead-us-iran-deal-bets-cpi-10-november-bull-105-bear-93/),
[OilPrice](https://oilprice.com/Latest-Energy-News/World-News/Brent-Falls-to-100-as-Traders-Bet-on-a-US-Iran-Deal.html),
[BigGo/Reuters](https://finance.biggo.com/news/ebb2a1cb-d2a6-4a13-9051-50aa312b0b83),
[Startup Fortune](https://startupfortune.com/brent-crude-drops-16-in-a-week-to-98-as-traders-bet-on-a-us-iran-deal/),
[Rio Times on Polymarket](https://www.riotimesonline.com/hormuz-deal-odds-jump-us-iran-draft/),
[gCaptain on the IEA](https://gcaptain.com/iea-moves-to-accelerate-oil-reserve-releases-as-hormuz-crisis-drags-on/).

### V1: read the whole fall as a deal bet

Take the 30 October close as the no-deal value and the settlement model's
deal branch (tempo collapses, flows normalize over four months of mine
clearance) as the deal value: $71 for January delivery. Then $98.32 implies a
deal probability of 41%, up from zero. That matches Polymarket's 41.5%, but it
needs the odds to have jumped 41 points in a week. The largest observed move
was 10.5 points. V1 needs 3.9 times the move that happened.

### V2: bound the deal bet, then locate the rest

**The bound.** A change in deal odds moves the price by Δp × (no-deal − deal).
The widest that spread can be is $117.64 − $71. At Polymarket's 10.5-point
move that is $4.90, or 25% of the fall. That is an upper bound: Eurasia's odds
went the other way.

**The no-deal value.** This section uses the settlement model's
stock-clearing price block (revised 8 November; see "Revision: the oil model
now clears stocks" below). Flows are taken as observed: 36% of normal in
August (IEA), 47% in September (interpolated), 58% in October.

| State (settlement model) | Brent |
|---|---:|
| Status quo, tempo 0.6 (November) | $89 |
| Status quo, tempo 0.9 (November) | $98 |
| Status quo, full tempo (November) | $100 |
| Re-closure at full tempo (peak, Nov–Jan) | $103 |
| Deal, flows normal over four months (Jan) | $71 |

On 6 November Brent was at the model's full-tempo status quo. If the no-deal
value is the model's, the deal probability in $98.32 is about zero at any
tempo from 0.6 to 0.9.

On 30 October Brent was $14 *above* the model's re-closure peak. The
model's October is $101 against an observed $103 → $118. The model is fitted
to March, when the strait was nearly shut and Brent was 1.5–1.8× its
pre-war level ($102–122). It finds a second closure now would price about
like March, because most of a shortfall that size is absorbed by rationing,
demand restraint and strategic releases rather than by price. So
late-October's price was above what even a renewed closure would justify on
fundamentals. The model has no prompt-barrel squeeze (Dated Brent traded
above $120) and no fear premium beyond current tempo; one or both was in that
price. The week's fall took it out.

**What does not fit.** At $98.32, Polymarket's 41.5% needs a no-deal value of
about $118: more than the model's re-closure price. In other words, it needs the
market to treat "no deal" as worse than a March-style closure. Note also that
a "deal" is not barrels: the same market gives normal traffic by year-end 7%.

**Holdout.** The IEA's end-September observed stock gap (509 mb) arrived
after the stock block was fitted (to the 410 mb end-July figure). The stock
block gives 623 mb (1.22×), the legacy flow block 1,346 mb (2.6×).

### Comparison

The narrative says traders priced a deal. In the model, at most a quarter of
the fall can be a deal bet. The rest is a late-October premium leaving, and
the model puts that premium above even a re-closure. Today's price is
consistent with the low deal odds analysts quote. For the fourth quarter,
holding the status quo puts Brent at $89–100, depending on tempo. The EIA's
$105 needs more than a renewed closure would deliver in the model.

### Revision: the oil model now clears stocks

The first version of this section used the settlement model's original price
block. That block drew commercial stocks up to their 6 mb/d cap before price
did any work: it over-drew against the IEA by 2.2× at end-July and 2.6× at
end-September, and its price dropped to base plus war premium whenever the
flow deficit closed, whatever the level of stocks. Under it the 30 October
close sat at a $120 re-closure price, and the week read as repricing
re-closure.

The replacement (`stocks-v2`, now the default) clears commercial stocks
against price on a Working curve. Holders draw while the spot price exceeds
what their remaining inventory supports and rebuild when it is below. A
fitted share of the uncovered shortfall is absorbed without a price signal.
The IEA notes that observed draws ran far below the headline supply loss,
and this share is what reconciles them. It is fitted to March, Q2, June and
July Brent and the IEA's end-July gap. It passes the World Bank March
supply-loss holdout, which the old block missed, and the end-September stock
holdout above. The 6 September analysis is pinned to the old block and
reproduces bit-for-bit.

What changed in this story: the re-closure price fell from $120 to $103,
because the model now learns from March how much of a closure is absorbed
without price. So the 30 October close is no longer "the re-closure price";
it is $14 above it. What did not change: the deal bet is at most a quarter of
the fall, and $98 is the model's no-deal status quo.

## 2. A December hike while pump prices fall

### Data

CPI 12-month: July 3.4% / core 2.5%, August 3.4% / 2.4%, September 3.7% / 2.6%.
The October report (10 November) has no 12-month rate because October 2025
was not collected. Gasoline averaged $4.35 in September and $4.31 in October,
and was $4.04 on 7 November. RBOB futures at $2.78 imply about $3.85 by
December. Diesel was $6.21 on 7 November. The FOMC held 3.75–4.00% on
4 November, and CME FedWatch has 76.8% on a December hike. Payrolls: August
revised to 186k, September to 60k, October 165k (consensus 59k).
Unemployment 4.1%, average hourly earnings +3.1% y/y.

Sources: [CNBC CPI](https://www.cnbc.com/2026/10/14/cpi-inflation-report-september-2026.html),
[AAA](https://newsroom.aaa.com/2026/11/national-average-falls-12-cents-in-one-week/),
[CNBC jobs](https://www.cnbc.com/2026/11/06/jobs-report-october-2026.html),
[Stocktitan on the missing y/y](https://www.stocktitan.net/articles/october-2026-cpi-preview-no-yearly-rate).

### V1: the 6 September model on this autumn's fuel path

The same model with September–December fuel replaced by the observed and
futures-implied path. It runs 0.15pp hot on headline and 0.22pp hot on core
over July–September (model core 2.69/2.72/2.75 against 2.5/2.4/2.6; RMSE
0.20pp). Core has not picked up the energy shock the model assumed it would.

### V2: refit core, then run the rules

Refitting core's two free parameters on the six prints brings indirect energy
pass-through down from 0.025 to 0.0025 and starting expected inflation to
2.0%. RMSE falls to 0.07pp.

| Path | Peak headline | Dec 2026 | Jun 2027 | Dec 2027 | Core Dec 2026 |
|---|---|---:|---:|---:|---:|
| Look-through rule | 3.72% (Oct) | 3.55% | 2.44% | 2.28% | 2.54% |
| Hike rule | 3.72% (Oct) | 3.55% | 2.44% | 2.28% | 2.54% |
| Relapse (pump back to $4.40 / $6.40 from December) | 3.88% (Feb 2027) | 3.79% | 2.93% | 2.53% | 2.54% |

The hike rule changes December 2027 headline by less than 0.001pp and costs
0.08pp of output gap. The model's rate-to-inflation transmission is weak by
construction. The usual rule of thumb, about −0.05pp after two years per
25bp, still leaves the hike an order of magnitude smaller than the base
effects. Headline falls by more than a point between December and June
because the March–May 2026 fuel jumps drop out of the 12-month window.

### The labour market

| | 6 September | Now |
|---|---:|---:|
| Three-month payroll average | 71k ± 43k | 137k ± 43k |
| P(trend above 90k, the top of the judged breakeven range) | 33% | 86% |

The October beat is 1.4 sampling standard errors. Of the 66k rise in the
three-month average, about 48k is new months (September and October replaced
a weak June and July) and about 18k is revisions (August 162k → 186k,
September 29k → 60k). The 6 September method also treated sampling error as
the only error and first prints as unbiased. Revisions are a second,
correlated error, and they have run upward this year. That made it
overconfident and biased low. A filtered trend that carries revision noise
would be the fix. Unemployment fell to 4.1%. On
6 September the model called the labour market "not obviously overheating".
That call now fails: the quantity data are above breakeven. Wages are not.
At 3.1% y/y they are 0.4pp below the ~3.5% consistent with 2% inflation at
1.5% productivity growth (a judgment).

### Comparison

The narrative says inflation is red-hot and the Fed must hike. In the model,
headline peaked in October on the fuel path already in hand and falls under
either rule, and core has not taken in the energy shock. The case for hiking
rests on labour quantities, which the model now agrees are strong, not on
inflation, which the hike barely moves. The risk that matters is the relapse
branch: if fighting resumes and pump prices return to October levels, headline
stays near 3% through mid-2027 whatever the Fed does.

## 3. El Niño: 2026, 2027, and the 2024 record

### Data

ERA5 daily global-mean 2 m temperature from the Copernicus Climate Pulse
series, averaged to months, through 6 November 2026, plus 0.88°C to convert
to 1850–1900. NOAA CPC ONI through ASO 2026 (+2.46). Both are embedded in
`src/simulations/news/el-nino-temperature-data.ts`.

| | ERA5, above 1850–1900 |
|---|---:|
| 2024 (record) | 1.60°C |
| 2026 January–June | 1.39–1.44°C |
| 2026 July / August / September / October | 1.55 / 1.73 / 1.70 / 1.78°C |
| 1–6 November 2026 | 1.99°C |
| November–December average needed to tie 2024 | 1.97°C |

Copernicus projects 2026 at 1.56–1.61°C, "most likely second", with about a
20% chance of tying or beating 2024 ([bulletin](https://climate.copernicus.eu/copernicus-warmest-october-record-2026-virtually-certain-exceed-15degc)).

### V1: trend plus lagged ENSO

Monthly ERA5 on a quadratic trend plus ONI lagged two months, fitted
1970–2025 with the El Chichón and Pinatubo years left out. ENSO coefficient
0.107°C per °C of ONI; trend 1.44°C in 2026, rising 0.30°C per decade; monthly
residual sd 0.13°C. The two-month lag fits the ENSO-neutral first half of 2026
almost exactly (residual +0.007°C) and was chosen over lags of 1, 3 and 4 on
that and on the 2023–24 residuals. The ONI path forward peaks at +3.0 in
December, is neutral by May and reaches −1.0 in late 2027 (CPC outlook plus
private outlooks; judgment). Peak scales of 0.8× and 1.15× are swept.

The holdout is July–October 2026, which the fit never saw. V1 under-predicts
it by 0.08°C. It gives 2026 at 1.56°C (2% chance of a record) and 2027 at
1.57°C (39%).

### V2: the strong-event excess

The post-peak year of every prior strong El Niño ran warm against the same
regression: 1998 +0.11, 2016 +0.06, 2024 +0.14°C (mean +0.10). An asymmetric
term (positive ONI squared) was tried and fitted to zero, so the excess is
not a simple non-linearity in the index. It is applied as an analog from the
onset (July 2026), and it cuts the July–October holdout error from +0.080 to
−0.024°C. Its spread across the three events goes into the 2027 uncertainty.

| Version | 2026 | P(2026 > 2024) | 2027 | P(2027 > 2024) |
|---|---:|---:|---:|---:|
| V1 regression | 1.56°C | 2% | 1.57°C | 39% |
| V2 + strong-event excess | 1.58°C | 12% | 1.68°C | 80% |
| V2, peak ×0.8 / ×1.15 | — | — | 1.65 / 1.70°C | 71% / 85% |

The 2027 monthly peak is February at about 1.88°C. The 2026 numbers take the
six observed November days at face value, weighted 6/30.

### What it says about the repository's climate module

Before this pass, the climate module (`currentTemp` 1.45) put forced warming at
1.50°C in 2026 and 1.52°C in 2027. The ENSO-removed ERA5 trend was 1.44 and
1.47°C. The first half of 2026 was ENSO-neutral after lags, and in it the
module plus the ENSO term ran 0.055°C hot. The Indicators of Global Climate
Change estimate (Forster et al. 2025: 1.36°C human-induced in 2024, rising
0.27°C per decade) agrees with the trend. The module had taken a single
observed year as its forced state. `currentTemp` is now 1.39. The module then
gives 1.44°C in 2026 and 1.46°C in 2027, matching the trend. Warming in 2100
falls by 0.04–0.05°C across scenarios, 2050 warming by about 0.055°C, and
GDP, energy and emissions metrics stay inside regression tolerance; the
reference baseline was re-blessed.

### Comparison

On 2026 the model agrees with Copernicus: second place at 1.58°C, inside their
1.56–1.61 range. It gives a somewhat lower chance of a record (12% against
about 20%). A record now needs November and December to average 1.97°C. The
first six days of November averaged 1.99°C, so the question will be settled in
the next few weeks. On 2027 it puts a number on the "could be the warmest
year" coverage: 1.68°C, about 0.08°C above 2024, with an 80% chance of a
record. The model's long-term forced trend reaches 1.5°C around 2028. The
single years above 1.5°C in 2024, 2026 and 2027 are that trend plus ENSO.

## 4. Scorecard: the 6 September forecasts

| Forecast (6 Sep) | Then | What happened | Verdict |
|---|---|---|---|
| Ebola: plateau at ~630/week, not exponential | Plateau path 11,656 confirmed by 31 Oct; exponential 31,044 | 10,467 on 31 Oct (WHO), 484/week since 4 Sep | Right call; incidence ran slightly below the plateau (between "plateau" and "response strengthens") |
| Ebola, 31 Dec | Plateau 17,400; strengthens 12,300; erodes 30,200; V1 202,000 | Run-rate held flat gives ~14,700 | Inside the branch range |
| Hormuz: oil still moving | 26–46% of normal (IEA stock identity) | IEA: 7.6 mb/d in August (36%); <60% by late October | Right |
| Hormuz: Brent attrition branch Oct/Nov | $107 / $113 | October $103 → $118; November so far $94–104 | October right on price, wrong on mechanism (flows recovered faster; premium carried the price); November too high so far |
| US CPI September | 3.76% | 3.7% | Right on headline, through offsetting errors: core over-predicted, gasoline under-assumed |
| Payroll trend above 90k | 33% | 86% after revisions | Wrong direction; revisions added 24k to August |

Sources: [WHO DON622](https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON622),
[WHO DON619](https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON619),
[IEA commentary](https://www.iea.org/commentaries/how-global-oil-supplies-have-readjusted-to-help-fill-the-huge-gap-left-by-the-strait-of-hormuz-shock).

## Where the models differ from the day's narrative

- **Oil.** "Traders bet on a deal" accounts for at most a quarter of the
  move. Late October priced more than a renewed closure would justify on the
  model; this week priced the status quo. At observed flows, $98 is the
  model's no-deal price, which fits Eurasia's 10% and Rapidan's
  80%-resumption view better than Polymarket's 41.5%. The pass also replaced
  the oil model's price block with one that clears stocks; it now tracks the
  IEA's stock reports (1.2× rather than 2.6×).
- **Fed.** Headline inflation has already peaked, and energy has not reached
  core. A December hike would be a response to labour quantities, which are
  genuinely strong now (the 6 September read was wrong), not to wages, which
  are not, or to an inflation path the model says it cannot move.
- **El Niño.** 2026 is second unless November and December average 1.97°C;
  2027 is the likely record year at about 1.68°C. The pass also found and
  corrected a 0.06°C warm bias in the repository's own climate module.

## Limits

- Oil: the stock-clearing block's slope, elasticity and non-price restraint
  sit on a ridge of exact fits (the answers here move by a few dollars along
  it). It has no prompt spreads, crude-quality mismatch or forward-looking
  storage, so a squeeze like late October's is outside it. In its accounting
  almost all of the observed stock gap is strategic releases, and the IEA's
  China coverage is estimated. Tempo is a judgment. The deal branch's four-month normalization is a
  judgment. Prediction-market and analyst odds are snapshots from secondary
  reports.
- Fed: the policy model's rate transmission is weak by construction. December
  fuel prices are futures plus a judged retail margin. The 3.5% wage benchmark
  and the 30–90k breakeven range are judgments.
- El Niño: the strong-event excess is an empirical analog from three events,
  not a mechanism. The ONI path is a judgment, with the peak swept. ERA5 runs
  about 0.05°C warm of the multi-dataset mean, so "record" here means the ERA5
  record. The 2026 uncertainty treats the six observed November days as six
  days, not as information about the rest of the month.
- Scorecard: Ebola counts after 6 September are DRC-only WHO totals. October
  Brent is a range from reported closes, not an average.
