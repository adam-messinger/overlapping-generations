# Reserve-and-magazine settlement model — 2026 US–Iran war

Read at 30 July 2026.

This model answers one question: given how fast the depletable stocks on each
side are draining, when does one of them bind hard enough that continuing the
war costs a belligerent more than settling?

Four stocks are tracked to their operational floors:

| Stock | Entering the war | Late July 2026 | Floor |
|---|---:|---:|---:|
| US Strategic Petroleum Reserve | 415 mb | 307.7 mb | 243 mb (authorization), 200 mb (operable) |
| Chinese strategic + commercial crude | ~1,400 mb | ~1,150 mb | 700 mb (judgment) |
| US high-end interceptors (THAAD + SM-3) | ~860 | ~650 | 516 (60% reserve requirement) |
| US area interceptors (Patriot PAC-3) | ~2,850 | ~990 | 1,710 — **already breached** |
| Iranian ballistic missiles | 2,500 | ~1,525 | salvo below 60/month |

Run it:

```bash
npm run war:settlement
npm run war:settlement -- --scenario=escalation
npm run war:settlement -- --scenario=negotiated-pause
npm run war:settlement -- --scenario=iran-capitulates-hormuz
```

## Structure

A monthly step from March 2026 over 36 months. The 28 February opening salvo
sits in the initial conditions, because a monthly step cannot hold a one-day
event. Each month:

1. **Tempo.** A scenario path of political willingness to fight, then limited by
   whether the US standoff magazine can actually support that many strikes.
2. **Iranian launches.** The lesser of surviving launcher capacity, a cap on the
   share of inventory Iran will commit in one month, and the inventory itself.
   Production continues at a rate suppressed by strikes on the manufacturing
   base; stock and launchers suffer proportional attrition, so the absolute loss
   falls as the surviving force disperses.
3. **US magazines.** Ballistic tracks draw the THAAD/SM-3 pool; drones and cruise
   missiles draw the Patriot/SM-6 pool. A depleted pool degrades coverage rather
   than hitting zero: no more than 35% of what remains is committed in a month.
4. **Oil.** Hormuz throughput sets the loss, netted against the Saudi/UAE bypass
   at 75% utilization and a ramping non-Gulf supply response. The residual is
   met by SPR, Chinese, rest-of-world and commercial inventory draws in that
   order, and whatever is left clears through a demand elasticity that rises
   with the size of the shock.
5. **US inflation.** Retail gasoline is crude passthrough plus a crack term
   driven by Hormuz *product* flow, which does not travel the bypass pipelines.
   Headline CPI is core plus the motor-fuel and other-energy contributions.
6. **Iranian economy.** Export volume falls with combat tempo while the price
   rises; the fiscal gap is monetized, inflation runs at money growth times a
   velocity multiplier, and real income falls by the unindexed share. Poverty
   headcount comes from shifting the mean of a lognormal income distribution
   whose dispersion is pinned by Iran's Gini.
7. **Settlement.** Four pressure indices map to a competing-risk monthly hazard
   of a settlement *attempt*; attempts become durable settlements with a fixed
   probability.

## The one non-obvious arithmetic constraint

EIA reports Q1 2026 Hormuz oil traffic averaging 14.6 mb/d against a 20.9 mb/d
norm. January and February ran close to normal, so March has to have been near
a total closure — about 15% of normal throughput — to produce that quarterly
average. This is not an assumption in the scenario; it is forced, and the whole
price backcast hangs off it. `war-settlement.test.ts` pins it.

## Backcast

Development targets set the defaults, either through the coordinate search in
`calibration.ts` or by hand while the defaults were chosen. Calling the price
and CPI targets a holdout would be false — they were used to pick the crack
spread, the war-risk premium, and the demand elasticity.

| Development target | Model | Reported |
|---|---:|---|
| SPR, week ending 24 July 2026 | 307.5 mb | 303–313 mb |
| SPR once the 172 mb release completes | 243.0 mb | 238–248 mb |
| Iranian ballistic missiles, July | 1,525 | 1,500–2,000 |
| Iranian launchers, July | 131 | 80–150 |
| Cumulative Iranian launches | 675 | 500–800 |
| THAAD + SM-3 remaining, July | 651 | 590–700 |
| Patriot remaining, July | 988 | 850–1,050 |
| Brent, end June | $73.2 | $71–76 |
| Brent, 29 July | $89.8 | $88–94 |
| Retail gasoline, June | $3.98 | $3.85–4.15 |
| Headline CPI y/y, June | 3.5% | 3.3–3.7% |
| Iranian monthly inflation | 4.7% | 3.5–5.5% |

Two quantities nothing in the model was ever pointed at are held out:

| Holdout | Model | Reported | Result |
|---|---:|---|---|
| China's July import cover | 101.7 days | 80–110 days | pass |
| World Bank March supply loss | 6.4 mb/d | 8–12 mb/d | **miss** |

The World Bank miss is real and is reported rather than tuned away. Their
10 mb/d figure sits between the model's March loss after rerouting (16.9 mb/d)
and after inventory draws (6.4 mb/d), and the source does not say which
definition it uses. The model brackets it; it does not match it.

Nothing in the settlement-hazard block is calibrated. It cannot be: this war
has produced exactly one settlement attempt, in mid-June, and it collapsed
within six weeks. That single observation is used only to set the
attempt-to-durable-settlement conversion below one-half.

## What binds, and when — central case

| Stock | Hits its floor |
|---|---|
| US Patriot below reserve requirement | April 2026 (already past) |
| US SPR authorization spent | November 2026 |
| Iranian salvo below credibility floor | October 2026 |
| US THAAD/SM-3 below reserve requirement | never in horizon |
| Chinese reserve floor | never in horizon |

Two results here are worth more than the dates.

**China is not on a clock.** It entered the war with roughly three times the US
strategic stock and can cover its own Hormuz import shortfall for years without
touching a floor. Whatever ends this war, it is not Chinese oil scarcity, and
the asymmetry means an oil-price channel that pressures Washington barely
touches Beijing.

**The US standoff magazine, not the interceptor magazine, is the harder
military ceiling.** Under continued attrition the Tomahawk/JASSM pool runs down
through 2026 and effectively empties in early 2027, at which point strike tempo
is capped by a production line delivering perhaps 140 weapons a month against a
36-to-52-month lead time. In that branch Iranian stocks *reconstitute* from
2027 because the strikes suppressing them have stopped.

## When it settles

Conditional on the war still running at the end of July 2026, over a 729-member
factorial ensemble:

| Scenario | Median | By end-2026 | By end-2027 |
|---|---|---:|---:|
| Attrition continues (central) | May 2027 | 30% | 71% |
| Escalation and closure | Feb 2027 | 42% | 77% |
| Negotiated pause holds | Aug 2027 | 22% | 63% |
| Hormuz reopens, strikes continue | May 2027 | 28% | 68% |

Escalation settles *soonest*. Closing the strait routes pressure straight into
the US price level, and the inflation channel's share of settlements rises from
23% to 36%. A holding pause is the slowest path to a durable settlement,
because relieving the pressure is also what removes the reason to conclude one.

Attribution in the central case:

| Channel | Share |
|---|---:|
| Iranian poverty | 29% |
| US magazine depletion | 28% |
| US inflation | 23% |
| Baseline diplomacy | 17% |
| Iranian missile exhaustion | 3% |

**Iran running out of missiles is the weakest of the four channels**, in every
scenario. Iran meters its own firing rate: the stock falls without the
sustainable salvo dropping below the credibility floor for long, and once US
strikes slacken the stock rebuilds. The intuition that this war ends when Iran
runs out of missiles is the one the model most clearly rejects. A test pins
this ordering so a change to the launcher or production block that flips it
fails loudly.

## Sensitivity

The reported-range axes barely move the median. The judgment axes move it by a
quarter: the US inflation and magazine hazard weights each shift the median
between December 2026 and March 2027 across their swept range. That is the
honest measure of how much of the date is arithmetic and how much is the
modeler's hand — and it is why the channel *ordering* is the reportable result
and the date is not.

## What is out of scope

- **Leakage.** A thinner interceptor magazine degrades coverage without
  inflicting the damage that would actually follow, so the model understates
  the cost of the US magazine channel.
- **Nuclear escalation, regime change, third-party entry.** Any of these would
  dominate every mechanism above.
- **SPR reauthorization.** The March order is executed on schedule; whether
  Congress or the White House authorizes a further release is not modeled. The
  200 mb operable floor bounds anything that could follow.
- **Distributional widening in Iran.** Dispersion is held at the pre-war Gini,
  so the poverty channel is, if anything, understated.
- **Feedback into the main energy-climate model.** This is a standalone
  registry model; it does not drive the 2025–2100 simulation.

## Sources

Reserves and prices: [EIA weekly SPR](https://energynow.com/2026/07/oil-stocks-in-us-strategic-petroleum-reserve-fall-by-3-7-million-barrels-to-lowest-level-since-1983/),
[CNBC on SPR stress](https://www.cnbc.com/2026/07/28/us-strategic-petroleum-reserve-spr-iran-oil-strait-hormuz.html),
[EIA chokepoints](https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/),
[Columbia on China's stockpile](https://www.energypolicy.columbia.edu/?p=27032),
[China versus US reserves](https://finance.yahoo.com/sectors/energy/article/new-data-shows-china-came-into-the-iran-war-with-over-3x-the-strategic-oil-reserves-of-the-us-151438578.html),
[Brent, 29 July 2026](https://www.cnbc.com/2026/07/29/oil-prices-today-brent-wti-iran-us-hormuz.html).

Munitions: [CSIS on interceptor inventory](https://www.csis.org/analysis/depleting-missile-defense-interceptor-inventory),
[CSIS on munitions at the ceasefire](https://www.csis.org/analysis/last-rounds-status-key-munitions-iran-war-ceasefire),
[Army Times on Patriot depletion](https://www.armytimes.com/news/your-military/2026/07/30/iran-war-depleted-us-patriot-missile-stockpiles-creating-readiness-challenges-experts-say/),
[Iran's arsenal in the 2026 conflict](https://www.mideastjournal.org/post/iran-missile-arsenal-2026-conflict),
[JINSA on Iranian firepower](https://jinsa.org/wp-content/uploads/2026/03/Irans-Firepower-2026-03-05-1.pdf).

Economies: [BLS June 2026 CPI](https://www.cnbc.com/2026/07/14/inflation-cpi-june-2026-in-one-chart.html),
[Iran's economy in charts](https://www.cnbc.com/2026/04/23/iran-economy-war-charts-rial-oil-strait-hormuz-blockade.html),
[the rial at 1.95m](https://www.tftc.io/iran-rial-record-low-1-95-million-per-dollar-2026).

War status: [CNN, 27 July 2026](https://www.cnn.com/2026/07/27/world/live-news/iran-war-trump),
[CNBC on the strike pause](https://www.cnbc.com/2026/07/27/us-iran-war-trump-hormuz.html).
