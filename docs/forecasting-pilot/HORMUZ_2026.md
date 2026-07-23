# Hormuz reopening forecast pilot

**Forecast vintage:** 2026-07-23, America/Los_Angeles

## Question and sealed prior

> **Will the arithmetic mean of IMF PortWatch's daily `n_total` transit calls
> for the Strait of Hormuz (`portid = chokepoint6`) be at least 62 per UTC day
> over 1–21 December 2026?**

- **Close:** 2026-12-21 at 23:59 UTC.
- **Resolution:** use the first complete IMF PortWatch daily-chokepoint data
  vintage published after 2026-12-28. Compute the unrounded arithmetic mean of
  the 21 daily `n_total` observations from 2026-12-01 through 2026-12-21,
  inclusive. Resolve **Yes** if it is at least 62 and **No** otherwise.
- **Why 62:** it is 70% of the fixed pre-crisis daily median of 88 transit calls
  for 2025-02-28 through 2026-02-27 reported by the public
  [Straits.live IMF PortWatch mirror](https://straits.live/api).
- **Fallback:** if IMF PortWatch permanently omits one or more dates, use the
  IEA Middle East Maritime Chokepoints Shipping Monitor's PortWatch-derived
  series. If neither publishes a complete series by 2027-02-28, resolve using
  the available days only if at least 17 of 21 are present; otherwise cancel.
- **Revisions:** ignore revisions first published after 2027-02-28.

### Sealed independent prior

**58% Yes / 42% No.**

Recorded before detailed evidence collection and before running any prospective
Hormuz scenario. Information already visible when sealing was limited to the
repository's broad claim of a severe 2026 disruption and an initial news/API
search needed to identify a public resolver: the war was still active on July
23, a June reopening attempt had relapsed, and normal traffic was about 88
calls/day. No historical reference-class calculation, current time-series
calculation, scenario output, market forecast, or structured crux analysis had
yet been used. The prior rationale was simply that five months leave meaningful
time for a bargain under extreme mutual economic pressure, but repeated
escalation and Iran's view of the strait as leverage made restoration far from
the default.

_The rest of this document is intentionally written after the sealed prior._

## Decision use

This question is a bridge forecast for energy prices, Gulf production,
fertilizer availability, shipping capacity, and regional macro stress. A
decision-maker could use it to decide how much weight to put on the simulation's
partial-reopening versus prolonged-closure paths. It is deliberately a
forecast of observed vessel traffic, not of a diplomatic announcement or a
quoted oil price.

The target is harder than the prediction-market convention of reaching a
60-call seven-day average once before year-end. It requires traffic to average
62 over a fixed 21-day December window, so a brief convoy or failed ceasefire
does not qualify.

## Frozen data snapshot

The public transit input is IMF PortWatch data mirrored by
[Straits.live](https://straits.live/data). The mirror documents `n_total` as
the daily count of all recorded vessel transits and refreshes the underlying
PortWatch feed weekly. The [IEA's PortWatch-derived
monitor](https://www.iea.org/data-and-statistics/data-tools/middle-east-maritime-chokepoints-shipping-monitor)
is an independent way to inspect the same upstream data and warns that GPS
jamming, AIS spoofing, and vessels going dark reduce measurement quality.

The analysis froze mirror commit
[`07be7ed259aa56a7470567f5d1efa7f3439c5199`](https://github.com/jasonhjohnson/strait-of-hormuz-data/tree/07be7ed259aa56a7470567f5d1efa7f3439c5199).
Its `data/transits.csv` SHA-256 is
`089783b3fbe3a5d9853fe19e04189c801f4f48c2bd6e39b4e4f4c2af26fbdfa6`.

| Window | Days | Mean total calls/day | Median | Mean tanker calls/day |
|---|---:|---:|---:|---:|
| Available pre-war file window, 2025-03-30–2026-02-27 | 335 | 90.02 | 89 | 50.42 |
| Closure through latest observation, 2026-02-28–2026-07-19 | 142 | 10.26 | 7 | 4.04 |
| Initial response to June agreement, 2026-06-17–2026-06-30 | 14 | 25.00 | 21.5 | 10.43 |
| Latest seven days, 2026-07-13–2026-07-19 | 7 | 12.14 | 11 | 3.86 |

The best wholly post-closure seven-day average in the frozen file is 33.86
calls/day for June 24–30. Thus neither the June agreement nor its evacuation
corridor brought the PortWatch series close to 60 before the relapse.

This also exposed a resolver issue before it became a forecast surprise: the
mirror's fixed pre-crisis median has moved between 88 and 95 across earlier API
vintages. The question uses an absolute threshold of 62, so later changes to
the displayed baseline cannot change resolution.

## Outside view

### Direct reference class

There is no direct historical reopening rate. In April, the EIA said that the
2026 closure was unprecedented: it had never before seen Hormuz close and had
therefore never observed it reopen. That is an important negative result, not
permission to substitute a simulated frequency. See the [EIA April
STEO statement](https://www.eia.gov/pressroom/releases/press586.php).

### Strict hostile-chokepoint reference class

To avoid choosing analogues after seeing their outcomes, the inclusion rule is:

1. an internationally important strait or canal;
2. hostile state/non-state action or armed conflict caused a complete closure
   or at least a roughly 40% traffic contraction;
3. the episode began between 1956 and 2025;
4. at least 152 days of subsequent history are observable; and
5. restoration depended on security or political conditions, not only a
   mechanical repair.

The endpoint available consistently across history is weaker than this
forecast's endpoint: **was commercial navigation restored within 152 days?**

| Episode | Duration evidence | Restored within 152 days? |
|---|---|---:|
| Suez crisis, 1956–57 | Effectively blocked on 1956-11-01; navigation resumed 1957-03-29, about 149 days later | Yes |
| Suez after the 1967 war | Navigation stopped 1967-06-06 and resumed 1975-06-05 | No |
| Red Sea/Bab el-Mandeb attacks beginning December 2023 | More than two years later, transits remained around half their prior level | No |

The sources are the U.S. State Department's
[contemporaneous Suez record](https://history.state.gov/historicaldocuments/frus1955-57v16/d452),
the [Suez Canal Authority's
history](https://www.suezcanal.gov.eg/English/About/SuezCanal/Pages/CanalHistory.aspx),
and the IMF's [2026 Red Sea comparison](https://www.imf.org/en/blogs/articles/2026/04/29/global-disruptions-are-testing-how-the-world-moves-goods-and-people).

**Strict denominator: 3. Raw restoration rate: 1/3, or 33%.**

This is not a calibrated probability for the target. The sample is tiny,
heterogeneous, and its endpoint—some commercial navigation—is easier than a
21-day average at 70% of normal. It is nevertheless a more defensible outside
anchor than inventing a large synthetic history.

### Broader physical-obstruction reference class

Adding the accidental *Ever Given* obstruction changes the count to **2/4,
or 50%**: the canal was blocked from March 23–29, 2021, and then returned to
full-capacity operation. [UNCTAD documents the six-day
blockage](https://unctad.org/system/files/official-document/rmt2021ch2_en.pdf);
the [Suez Canal Authority reported full-capacity
operation](https://www.suezcanal.gov.eg/English/MediaCenter/News/Pages/31-3-2021.aspx).
This is a useful upper comparison but a poor causal analogue because removing
one grounded ship did not require a durable political settlement.

The 1980s Tanker War is excluded by the stated rule because traffic did not
collapse by 40%. It is still important contrary evidence: despite hundreds of
attacks, oil trade largely continued and the main effect was higher insurance
cost. [U.S. Naval History and Heritage Command](https://www.history.navy.mil/about-us/leadership/director/directors-corner/h-grams/h-gram-018/h-018-1.html).

### Outside-view conclusion

The honest historical bracket is broad: 33% in the narrow hostile-disruption
class and 50% after adding a mechanically simple accident. The current case is
more severe than the Tanker War, less physically fixed than the 1967–75 Suez
closure, and already nearly as long as the 1956–57 Suez closure. The outside
view moves the sealed 58% prior downward but cannot determine the answer.

## Inside view and current evidence

### Causal decomposition

For the December target to resolve Yes, five links must mostly hold:

1. **Security bargain or enforcement:** attacks must stop, or a corridor must
   become credible despite continuing hostilities.
2. **Navigability:** mines, routing rules, congestion, and naval coordination
   must permit routine rather than exceptional passages.
3. **Commercial risk acceptance:** crews, insurers, shipowners, and the large
   carriers must accept the route.
4. **Traffic ramp:** the backlog and ordinary Gulf trade must produce at least
   62 recorded calls/day, not merely a few high-volume tankers.
5. **Persistence:** the arrangement must survive most of December 1–21.

| Force toward Yes | Force toward No |
|---|---|
| All parties incur very large economic and political costs from continued closure | Control of the strait has become a central bargaining asset and stated red line |
| A signed June memorandum proves mutually acceptable language is possible | The June arrangement failed quickly, a direct within-case warning against equating agreement with durable operation |
| Oman has identified a southern corridor and remains an active mediator | Mines, competing routes, attacks, and naval blockades make a declared-open route commercially unsafe |
| The Tanker War shows commercial traffic can tolerate substantial risk with escorts | The Red Sea analogue shows large carriers can stay away for years even when rerouting is costly |
| Five months is enough time for negotiation, clearance, and a traffic ramp | The fixed 21-day window punishes late or fragile normalization |

### State as of July 23

- IMF PortWatch's latest seven-day mean was 12.14, only about 20% of the
  question threshold.
- The IMO listed **61 confirmed incidents and 17 seafarer fatalities through
  July 21**. Its June evacuation framework moved 136 vessels and about 2,900
  seafarers before being paused; approximately 6,000 seafarers remained trapped
  as of its July update. [IMO incident
  list](https://www.imo.org/en/mediacentre/hottopics/pages/middle-east-highlighted-incidents.aspx),
  [IMO Middle East hub](https://www.imo.org/en/mediacentre/hottopics/pages/middle-east-strait-of-hormuz.aspx).
- On July 23 the U.S. had conducted a twelfth consecutive night of strikes,
  while Iran continued to demand a right to manage traffic and potentially
  charge fees. Houthi attacks on Saudi tankers also threatened the principal
  Red Sea bypass. [Associated Press, July
  23](https://apnews.com/article/iran-us-hormuz-strait-war-60d46bf8c83c43a8f2268b7b87627c55).
- The June 17 memorandum called for an end to military operations and further
  talks with Oman over administration and maritime services. The current
  failure therefore demonstrates both that a bargain is possible and that
  signed text is insufficient. [Memorandum
  text](https://www.presidency.ucsb.edu/documents/islamabad-memorandum-understanding-between-the-united-states-america-and-the-islamic),
  [AP chronology of the
  relapse](https://apnews.com/article/iran-us-war-escalation-shipping-strait-hormuz-179973cfe1fb3fa1b7ea7b816648ad9c).
- Oman and Iran publicly reaffirmed safe passage and continued talks over
  maritime administration in June. That diplomatic channel still exists even
  though it has not delivered safe routine traffic. [Oman Foreign
  Ministry](https://www.fm.gov.om/en/48943/).
- Insurance capacity is not literally zero. Lloyd's launched an additional
  Hormuz war-risk consortium after the June agreement, while the Lloyd's
  Market Association had earlier emphasized that physical safety, rather than
  insurance availability alone, was keeping ships away. [Lloyd's, June
  19](https://www.lloyds.com/insights/media-centre/press-releases/press-release-19062026),
  [LMA, March
  23](https://lmalloyds.com/safety-concerns-not-insurance-availability-driving-reduced-vessel-traffic-in-the-strait-of-hormuz/).

### Other forecasts

The nearest liquid market is not identical to this question. At
2026-07-23T13:33:14Z, Polymarket assigned **49.5%** to a seven-day PortWatch
average reaching 60 at least once by December 31, with about $5.67 million
traded. The frozen status bundle has SHA-256
`882e8dfc72fd7cc47b42d7d07a3db71100abf86d4ead8d4fdc9e0566a2f36b92`.
See the [market and its resolution
rule](https://polymarket.com/event/strait-of-hormuz-traffic-returns-to-normal-by-december-31).

Because that market can resolve on one seven-day spike at a slightly lower
threshold and has ten extra days, 49.5% should be an upper comparator, not a
probability copied into this forecast. Its substantial volume is useful, but
traders share information and can be anchored to the same highly visible
peace headlines.

The EIA's June 4 forecast assumed flows would slowly resume in the third
quarter, with production and trade patterns taking until early 2027 to
normalize. That view predates the June agreement and July relapse, but it is a
useful independent warning that even peace does not imply instant physical
normalization. [EIA June
STEO](https://www.eia.gov/outlooks/steo/report/global_oil.php).

## Chronological update ledger

These are judgment updates, not outputs retrospectively fitted to a target.

| Stage | `P(Yes)` | Change | Reason |
|---|---:|---:|---|
| Sealed prior | 58% | — | Five months for a bargain, balanced against active war |
| Exact PortWatch history | 45% | −13 pp | Latest seven-day mean 12.14; failed June response peaked at only 33.86 |
| Strict and broad reference classes | 38% | −7 pp | 1/3 strict hostile disruptions reopened within 152 days; analogues very heterogeneous |
| Latest security/operational evidence | 30% | −8 pp | Renewed attacks, 61 confirmed incidents, paused evacuation, active competing blockades |
| Contrary case and market check | 39% | +9 pp | Signed-deal precedent, continuing mediation, extreme mutual costs, and 49.5% market on an easier target |
| Simulation run | 39% | 0 pp | It clarifies consequences and conditional paths but supplies no likelihood of either path |

The relatively large moves reflect genuinely diagnostic new information. A
production version should preserve exact timestamps for each update rather
than reconstructing the stages in one research session.

## What the Hormuz simulation contributes

### Calibration and backcast

The existing calibration sees four development targets: Q1 traffic, March net
oil loss, March oil price, and March Gulf shut-ins. All four modeled values
land inside their frozen accepted ranges.

| Set | Target | Modeled | Accepted range | Loss |
|---|---|---:|---:|---:|
| Development | Q1 average Hormuz oil transit, mb/d | 14.63 | 14.00–15.20 | 0.00 |
| Development | March net global oil-supply loss, mb/d | 9.88 | 8.00–12.00 | 0.00 |
| Development | March oil-price multiple | 1.71 | 1.50–1.80 | 0.00 |
| Development | March Gulf crude shut-in, mb/d | 6.56 | 6.50–8.50 | 0.00 |
| Holdout | Q2 oil-price multiple | 1.51 | 1.35–1.60 | 0.00 |
| Holdout | July oil-price multiple | 1.42 | 1.30–1.50 | 0.00 |
| Holdout | Peak fertilizer-price multiple | 1.91 | 1.30–1.70 | 0.51 |

The two oil-price holdouts are inside range; the broad fertilizer basket is
overpredicted. This validates some *consequences conditional on a throughput
path*. It does not validate the political path or the PortWatch vessel-count
target. All observations also come from the same 2026 crisis, so “holdout” is
not a historical reopening backtest.

### Conditional question translation

Only the two built-in prospective scenarios compatible with observed
January–July history were used.

| Scenario | Aug | Sep | Oct | Nov | Dec oil-throughput fraction | Naive December calls/day proxy | Conditional target |
|---|---:|---:|---:|---:|---:|---:|---:|
| Partial reopening | 20% | 40% | 65% | 85% | 100% | 88.0 | Yes |
| Prolonged closure | 8% | 8% | 8% | 8% | 8% | 7.0 | No |

The proxy is `88 × modeled oil-throughput fraction`. It is shown solely to
test whether the model paths fall on opposite sides of the forecast bin. Oil
volume is not the same quantity as a daily count of tankers, container ships,
dry bulk vessels, and other cargo vessels; the mapping is not calibrated.

The model also makes the incentive stakes legible:

| 2026 conditional result | Partial reopening | Prolonged closure |
|---|---:|---:|
| Oil-price multiple | 1.26× | 1.38× |
| Oil availability | 95.3% | 92.3% |
| Peak Gulf crude shut-in | 8.8 mb/d | 8.8 mb/d |

Those economic costs plausibly increase pressure for settlement, but that
feedback is not modeled. It would be circular to convert a costly simulated
outcome directly into a probability that politicians avoid it.

### Model-only probability

**The native model-only probability is not identified.** The model returns
Yes under the partial-reopening path and No under the prolonged-closure path;
it contains no geopolitical transition process or scenario weights.

For scale only, weighting the two paths by the strict observed restoration
rate gives a mechanical **33% Yes** benchmark. Including the accidental
*Ever Given* case raises that wrapper to **50% Yes**. This 17-point swing from
one defensible inclusion decision is why neither is presented as the model's
forecast probability.

This is the most important gap uncovered by the pilot: scenario execution is
strong, but selecting probabilities over paths remains entirely outside the
simulation.

## Cruxes and value of information

The final 39% judgment can be represented by several alternative conditional
trees. Each row is a separate decomposition, not a set of independent events
to multiply together.

| Resolvable crux | `P(crux)` | `P(target | crux)` | `P(target | not crux)` | Expected absolute movement |
|---|---:|---:|---:|---:|
| By Oct 31, a publicly acknowledged U.S.–Iran halt in attacks lasts 21 consecutive days | 45% | 78% | 7% | 35 pp |
| PortWatch seven-day mean reaches 40 by Nov 15 | 42% | 80% | 9% | 35 pp |
| At least 6 of the 9 largest container carriers resume regular Hormuz bookings by Nov 15 | 37% | 86% | 11% | 35 pp |

The conditionals reproduce approximately 39% after rounding. “Expected
absolute movement” is
`P(C)|P(Y|C)-P(Y)| + P(not C)|P(Y|not C)-P(Y)|`; it measures diagnostic value,
not the economic value of a decision.

Research/monitoring priority:

1. **Attack halt and negotiated terms.** Highest early value, low collection
   cost, and enough time to act. Track official U.S., Iranian, Omani,
   Pakistani, and IMO releases rather than generic headline counts.
2. **Carrier and insurance return.** Commercial acceptance is a better bridge
   from diplomatic text to actual traffic, but the evidence is scattered
   across nine carrier advisories and insurance trade sources.
3. **PortWatch 40-call milestone.** Most objective and closest to the target,
   but much of its information arrives late. The IEA/IMO series should be used
   to cross-check AIS artifacts.
4. **Mine clearance and corridor assurance.** Potentially decisive but poorly
   quantified in public data; an authoritative JMIC/IMO clearance update
   would materially change the forecast.

## Final analyst forecast

**As of 2026-07-23: 39% Yes / 61% No.**

The central No path is continued intermittent fighting or an agreement too
late/fragile for carriers to produce a 62-call average during December 1–21.
The central Yes path is a durable attack halt by October, followed by several
weeks of mine clearance, insurance repricing, carrier return, and a backlog
ramp.

### Strongest contrary case

The strongest case against the 61% No forecast is not simply “everyone needs
the oil.” The parties already produced a signed framework, Oman already
created a usable southern-route concept, PortWatch traffic responded within
days, and historically the Tanker War did not stop commerce despite hundreds
of attacks. Five months is long relative to the operational ramp once a
credible security guarantee exists. A liquid market still puts roughly even
odds on the easier year-end threshold. A genuine durable ceasefire by October
would make this forecast substantially too pessimistic.

### Update triggers

- Raise sharply if a halt in attacks survives 14 days, IMO/JMIC resumes a safe
  transit framework, and the PortWatch seven-day mean exceeds 30.
- Move near 80% if the seven-day mean reaches 40 by November 15 without a
  contemporaneous attack and several major carriers resume regular bookings.
- Cut below 15% if attacks continue after November 15 or the seven-day mean
  remains below 20 on December 1.
- Treat a signed agreement alone as only a modest positive update; the June
  failure shows that operational evidence must confirm it.
- Recheck weekly when PortWatch publishes and immediately after any ceasefire,
  vessel attack, evacuation resumption, mine-clearance announcement, or
  carrier-policy change.

## Resolution and scoring

- Archive the exact resolver rows, retrieval timestamp, URL, and content hash.
- Score the sealed 58%, every logged update, and the final 39% with binary
  Brier loss `(p - y)^2`.
- Also report a daily time-weighted Brier score so a late correct update is not
  treated as equivalent to sustained accuracy.
- Postmortem separately: reference-class selection, geopolitical judgment,
  PortWatch measurement, oil-volume/vessel-count mapping, scenario-path error,
  missed update, and resolution ambiguity.

## Framework field notes

### Useful now

- Development/holdout separation prevented the oil-price validation from
  becoming an entirely in-sample fit.
- Runtime contracts, units, finite-value guards, and deterministic scenario
  execution made the consequence results auditable.
- Monthly stock-flow accounting captured inventories, bypasses, alternative
  supply, price response, export storage, and shut-ins without double counting.
- Existing scenario paths put materially different futures on opposite sides
  of the question threshold and exposed what the model actually conditions on.

### Awkward now

- The question, resolver, sealed prior, evidence vintage, update ledger,
  reference classes, conditionals, and Brier plan all live in prose.
- A one-off script was needed to join a public daily CSV to model output and
  inspect the relevant December month.
- Reproducing the data required manually pinning an external Git commit and
  hash.
- Research notes could not be attached to individual probability movements or
  parameters.
- The model is monthly; the resolver is a fixed 21-day daily average.

### Missing

- A question target and adapter from model outputs to resolver-native units.
- Belief distributions or weights over geopolitical paths, including
  correlation and transition hazards.
- An observed reference-class store with inclusion rules, censoring, and
  sensitivity to alternate denominators.
- Model discrepancy for the oil-throughput-to-all-vessel-count mapping.
- First-class forecast versions, conditional trees, monitoring triggers,
  proper scoring, and multi-forecaster aggregation.
- A live-data ingest that freezes source vintage and detects resolver-schema or
  baseline changes.
- A behavioral feedback from simulated costs to political settlement. Adding
  one would require empirical grounding; the framework should not create it
  automatically.

### Dangerous

- Scenario names such as “partial reopening” can look like categorical
  forecasts even though they have no weights.
- A zero range loss on several backcast targets can create unwarranted
  confidence in an unvalidated geopolitical transition.
- Multiplying the model's oil-throughput fraction by 88 produces a plausible
  number in the resolver's unit while silently conflating oil volume and vessel
  counts.
- The model's strong consequence fit may tempt users to infer that it predicts
  the initiating event.
- Calling Q2 and July observations “holdouts” is technically correct for the
  parameter grid but can be mistaken for validation across independent crises.
- A generic ensemble over arbitrary parameter ranges would create percentiles,
  not belief-calibrated probabilities.

## Reproduction

```bash
curl -L --fail \
  -o /tmp/hormuz-transits.csv \
  https://raw.githubusercontent.com/jasonhjohnson/strait-of-hormuz-data/07be7ed259aa56a7470567f5d1efa7f3439c5199/data/transits.csv

shasum -a 256 /tmp/hormuz-transits.csv

node --import tsx scripts/forecasting-pilot-hormuz.ts \
  --transits=/tmp/hormuz-transits.csv

node --import tsx src/simulations/critical-materials/hormuz.test.ts
npx tsc --noEmit
```

The original pilot added only the model-specific script. The post-pilot
framework now gives the monthly-to-annual global bridge a strict semantic
boundary. Oil and gas availability remain distinct outputs, while their
contributions to composite non-electric energy availability require two named,
versioned crosswalks. No crosswalk was added from oil-volume throughput to
PortWatch vessel counts because the evidence does not support one.
