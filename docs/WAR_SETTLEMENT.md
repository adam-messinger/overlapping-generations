# Reserve-and-magazine settlement model — 2026 US–Iran war

Read at 30 July 2026.

This model answers one question: given how fast the depletable stocks on each
side are draining, when does one of them bind hard enough that continuing the
war costs a belligerent more than settling?

Four stocks are tracked to their operational floors:

| Stock | Entering the war | Late July 2026 | Floor |
|---|---:|---:|---:|
| US Strategic Petroleum Reserve | 415 mb | 307.7 mb headline, **~218 mb deliverable** | 243 mb (authorization); operable floor disputed |
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

## Is the reserve reachable and fungible?

No, and not entirely. The headline SPR number overstates the usable buffer on
three separate counts, and this is the single largest correction the model
carries against a naive reading of the weekly EIA figure.

**Access.** GAO-26-106918 found that as of December 2025 more than a quarter of
SPR inventory was unavailable for drawdown, held behind construction and cavern
outages. Big Hill — 90 mb, and 1.1 mb/d of design drawdown rate — is entirely
offline, with return barrels scheduled from 1 November 2026. So the ~307.7 mb
reported for the week ending 24 July 2026 is roughly **218 mb of deliverable
crude**. When the authorized release completes at a headline 243 mb, the
deliverable reserve is about **153 mb**: a 37% overstatement.

**Rate.** Effective drawdown capability is 2.7 mb/d against a 4.415 mb/d design,
61% of nameplate, with refill at 56%. Site by site: Bryan Mound 1.5 mb/d (100%
of design), West Hackberry 0.75 (58%), Bayou Choctaw 0.45 (87%), Big Hill 0.
The statutory design requirement is to sustain 4.4 mb/d for 90 days; the reserve
cannot currently do that. At the observed release tempo — about 0.71 mb/d — the
rate ceiling is nowhere near binding, which is why it did not show up in the
backcast. It binds hard the moment policy tries to surge: the model delivers
2.7 mb/d against a request of 5.7 and stops there. Much of the infrastructure is
over four decades old against a $230 million maintenance backlog.

Each drawdown also injects fresh water to displace oil, dissolving the salt
walls and enlarging the caverns. Drawdowns are therefore partly irreversible:
the reserve degrades as it is used, not merely as it empties.

**Fungibility.** The reserve is roughly 40% sweet (max 0.5% sulfur) and 60%
sour (about 1.4%). Sweet crude nearly any refinery can take; sour clears only
through complex coking refineries, which is why the SPR sits where it does and
feeds the Gulf Coast through three fixed systems — Seaway from Bryan Mound to
Houston and Texas City, Texoma from Big Hill and West Hackberry to
Beaumont–Port Arthur and Lake Charles, and Capline from Bayou Choctaw to Baton
Rouge. Marine loading is a further hard constraint: Freeport 400 kb/d, Texas
City 300 kb/d, Nederland 1.19 mb/d, Beaumont 200 kb/d — and Texoma's two feeder
sites are the degraded ones.

The direction of the fungibility effect is not the obvious one. Gulf medium
sour is *exactly* the slate Hormuz removed, and it yields 30–35% straight-run
middle distillate against meaningfully less from light shale, so for this
particular shock the SPR holds close to the right barrels. What it does not do
is offset a Brent-priced (light sweet) shortfall one for one. The model applies
a 10% haircut on that account, flagged as judgment; for this shock that is
probably generous to the downside. Drawdowns so far have been sour-weighted —
the first 86 mb exchange was mostly sour — leaving the remaining mix at roughly
its designed 60/40.

**The floor is disputed, and the dispute is load-bearing.** Three numbers are in
play. EPCA's 252.4 mb applies only to *limited* drawdown authority (≤30 mb per
60 days); a severe-energy-supply-interruption finding, which a Hormuz closure
plainly supports, carries no statutory floor at all. Industry has conventionally
treated 250–300 mb as the practical limit. DOE in 2026 asserted a
cavern-mechanics operational minimum of about 70 mb, which critics argue ignores
both the rate collapse well above that level and the question of permanent
cavern damage. The model defaults to 200 mb as a practical judgment and sweeps
the others. The sweep produces a sharp result: **the announced release to 243 mb
is only executable under the low floor.** At the conventional 250–300 mb limit
the reserve bottoms out before the 172 mb is delivered.

There is a second, cleaner threshold the model now tracks. The central case
crosses below 252.4 mb in **October 2026**, at which point the United States
permanently loses the small, fast, non-emergency SPR lever. Everything after
that requires a presidential emergency finding.

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
   with the size of the shock. The SPR draw is capped three separate ways —
   stranded barrels, the 2.7 mb/d plumbing ceiling, and the 172 mb
   authorization — and released barrels are discounted 10% for sourness.
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
| EPCA limited-drawdown authority lost | October 2026 |
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
  the White House authorizes a further release is not modeled. Note that any
  further release now requires an emergency finding, and that the deliverable
  reserve behind it is roughly 153 mb, not the 243 mb headline.
- **Refinery-level and marine-terminal routing.** Distribution capacity is
  documented above but not simulated; the model treats a delivered barrel as
  reaching the market, subject only to the sourness haircut.
- **Distributional widening in Iran.** Dispersion is held at the pre-war Gini,
  so the poverty channel is, if anything, understated.
- **Feedback into the main energy-climate model.** This is a standalone
  registry model; it does not drive the 2025–2100 simulation.

## Sources

SPR condition: [GAO-26-106918](https://files.gao.gov/reports/GAO-26-106918/index.html),
[DOE SPR distribution systems](https://www.energy.gov/ceser/articles/spr-distribution-systems),
[DOE statutory drawdown authority](https://www.energy.gov/hgeo/opr/statutory-authority-spr-drawdown),
[CRS on SPR authorization and drawdown policy](https://www.congress.gov/crs_external_products/R/PDF/R42460/R42460.16.pdf),
[DOE SPR FAQs on the sweet/sour split](https://www.energy.gov/hgeo/opr/spr-faqs),
[the sour crude problem](https://larrycjohnson.substack.com/p/part-ii-the-sour-crude-problem-how),
[infrastructure strain explainer](https://discoveryalert.com.au/us-strategic-petroleum-reserve-infrastructure-strain-2026/).

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
