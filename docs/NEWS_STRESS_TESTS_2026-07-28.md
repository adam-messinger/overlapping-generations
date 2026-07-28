# News-driven stress tests — 28 July 2026

This pass screened the day's economic, labour, technology, housing, and market
coverage for a measurable outcome, a mechanism that can be represented without
pretending to identify more than the available data allow, and at least one
independent check. Three stories survived:

1. Is Spain's 9.87% unemployment rate a genuine labour-market improvement or a
   seasonal/labour-force artifact?
2. Can Nvidia's possible $250B financing guarantee explain roughly $250B of
   equity value lost, and does the existing AI capital model support the
   broader funding concern?
3. Would Germany's proposed sick-note restrictions materially raise effective
   labour input?

Run the models with:

```bash
npm run news:2026-07-28
```

These are conditional stress tests, not forecasts or investment advice. The
Spain calculation is an accounting reconciliation, Nvidia deal terms remain
unconfirmed, and the Germany policy has no estimated behavioural response.

## News screen

| Story screened | Modeling decision | Reason |
|---|---|---|
| Spain unemployment falls to 9.87% | Selected | Official employment, unemployment, labour-force, adjusted-growth, and annual-change observations allow three internally consistent views |
| Nvidia CDS rises amid vendor-financing concern | Selected | The reported face value, CDS signal, equity move, and existing AI capital-cycle model permit a contingent-loss diagnostic |
| Germany's sick-note crackdown | Selected as a sensitivity envelope | The output identity is tractable, but the policy response is not estimated, so the sign must remain conditional |
| Persistent global inflation in a 500-economist poll | Not selected | A consensus revision is not an outcome model, and the energy-persistence channel was already modeled on 27 July |
| India industrial output grows 7.3% | Not selected | The output-price methodology changed in May; one post-change observation cannot support a useful backcast |
| China's high-tech provinces pull ahead | Not selected | Provincial sector-exposure weights and a defensible counterfactual are missing |
| Australia's housing slowdown reaches the economy | Deferred | The reported 5% decline covers Sydney and Melbourne, while the A$12.8T stock is national; matching geography and timing is necessary before applying a wealth effect |

Sources for the screen: [Reuters on Spain](https://www.investing.com/news/economic-indicators/spains-unemployment-rate-falls-to-987-in-q2-lowest-in-18-years-4815685),
[Reuters' global market wrap](https://au.investing.com/news/stock-market-news/ai-anxiety-sparks-tech-rout-broad-selloff-in-asian-markets-4555334),
[the Nvidia financing report](https://www.investing.com/news/stock-market-news/nvidias-rising-cds-the-talk-of-wall-street-amid-circular-financing-fears-4816626),
[Reuters on Germany](https://www.investing.com/news/economy-news/analysisgermanys-sicknote-crackdown-may-be-treating-the-symptoms-not-the-disease-4812967),
[the global inflation poll](https://www.investing.com/news/economy-news/persistently-high-inflation-to-nag-global-economy-say-economists-reuters-poll-4816723),
[India industrial output](https://www.investing.com/news/economy-news/indias-june-industrial-output-grows-73-yy-on-manufacturing-boost-4816399),
[China's regional divergence](https://www.investing.com/news/economy-news/hightech-manufacturing-hubs-pull-ahead-in-chinas-uneven-growth-4815650),
and [Australia housing](https://www.investing.com/news/economy-news/australias-sudden-housing-chill-seeps-into-economy-4815462).

## Results at a glance

| Story | Headline shortcut | Revision | Comparison with conventional wisdom |
|---|---|---|---|
| Spain | Read the raw 486,000 quarterly employment gain and 0.96pp unemployment-rate drop as underlying momentum | INE's adjusted growth rates imply about 120,000 additional jobs and only a 0.09pp rate decline; year over year, employment is still up 510,200 and the rate is down 0.41pp | Agrees that the labour market improved and rejects a labour-force-exit explanation; qualifies roughly 91% of the raw quarterly rate move as seasonal |
| Nvidia | Treat the possible $250B guarantee as an immediate $250B loss, exactly matching the reported equity-value decline | With a 5% annual customer hazard, 75% use, 60% loss given default, and a five-year horizon, present expected loss is $21.6B; a severe 25% hazard/full-use case is $95.3B | Agrees that customer funding is a real structural risk; disagrees that guarantee impairment alone explains the equity move |
| Germany | Assume a 10% cut in recorded sick days creates the same number of fully productive days: +0.64% effective labour | Separating recording, real attendance, sick-day productivity, infection spillovers, and administration gives -0.07% to +0.29%; the displayed break-even requires 25.1% of the recorded reduction to be real attendance | Supports the article's skepticism; the government's productivity effect is not identified by the sick-day statistic |

## 1. Spain: the milestone is real, the quarterly magnitude is seasonal

The official second-quarter stocks are:

| Stock | 2026 Q1 | 2026 Q2 | Change |
|---|---:|---:|---:|
| Employment | 22.293M | 22.779M | +486,000 |
| Unemployment | 2.709M | 2.495M | -213,300 |
| Labour force | 25.002M | 25.274M | +272,700 |
| Unemployment rate | 10.83% | 9.87% | -0.96pp |

The stock identity closes exactly up to published rounding:

```text
change in employment
  = change in labour force - change in unemployment
  = 272,700 - (-213,300)
  = 486,000
```

V1 decomposes `u = 1 - employment / labour force` with a two-order Shapley
split. Employment growth lowers the rate by 1.93pp, while the larger labour
force offsets 0.97pp. This is strong evidence against the skeptical
interpretation that the rate fell because people stopped looking for work.

The first result also exposes a seasonal warning: services supplied 394,000,
or 81%, of the raw quarterly job gain. V2 therefore uses INE's published
seasonally adjusted rates:

| Comparison | Employment change | Unemployment change | Rate change |
|---|---:|---:|---:|
| Raw Q2 versus Q1 | +486,000 | -213,300 | -0.96pp |
| Adjusted-rate proxy | +120,000 | -10,000 | -0.09pp |
| Q2 year over year | +510,200 | -57,800 | -0.41pp |

INE publishes adjusted growth rates in the release, not adjusted levels. The
middle row applies those rates to the Q1 stocks and is therefore a model proxy.
It retains only 9.1% of the raw quarterly rate decline. The annual result is
the more important robustness check: more than half a million additional
people are employed, unemployment is lower, and the labour force is larger.

The model agrees with the news story's direction and with its emphasis on a
record labour force. It disagrees only with reading the raw 0.96pp quarterly
drop as the underlying pace. The 9.87% milestone is a valid raw survey result;
most of the quarter-to-quarter acceleration is not seasonally persistent.

Source: [Spain's National Statistics Institute Q2 release](https://www.ine.es/dyngs/Prensa/es/EPA2T26.htm)
and [Q1 release](https://www.ine.es/dyngs/Prensa/en/EPA1T26.htm?print=1).

## 2. Nvidia: a funding signal, not a face-value loss

The day's reporting combined several quantities:

- Nvidia's five-year CDS reached 82 basis points.
- Nvidia shares lost about $250B of market value.
- A possible guarantee connected to an OpenAI lease was reported at $250B.
- Separate possible financing for chip purchases was reported at $350B.
- Announced circular-financing arrangements in 2026 were reported above
  $540B, while five hyperscalers' 2026 capex was estimated above $690B.

V1 makes the tempting visual comparison:

```text
possible guarantee face value = reported equity-value loss = $250B
```

That is not a loss model. A guarantee is contingent, may never be fully used,
may be collateralized, and loses less than face value when recoveries are
positive. The reported negotiations were also early-stage and unconfirmed.

### The iteration caught a creditor/counterparty error

The first revised run tried to infer guarantee loss from Nvidia's 82bp CDS.
That is the wrong obligor: Nvidia's CDS prices Nvidia's credit, while guarantee
loss depends primarily on the customer's default. The corrected V2 retains the
CDS only as a market signal. Applied mechanically to $250B of notional, 82bp
is a $2.05B annual premium; it is not a customer default probability.

Customer credit is therefore an explicit sensitivity. For annual customer
hazard `h`, utilization `q`, loss given default `LGD`, discount rate `r`, and
horizon `T`, the model uses:

```text
PV expected loss
  = face x q x LGD
    x h / (h + r)
    x (1 - exp(-(h + r) x T))
```

| Customer-credit case | Utilization | Five-year default probability | PV expected loss | Share of $250B equity move |
|---|---:|---:|---:|---:|
| 5% annual hazard | 75% | 22.1% | $21.6B | 8.7% |
| 25% annual hazard | 100% | 71.3% | $95.3B | 38.1% |

These are stresses, not forecasts. The wide hazards compensate for the absence
of public customer credit and deal terms. Even the severe row does not turn
the entire stock move into expected guarantee impairment under a 60% loss
given default.

The existing AI capital-cycle model nevertheless supports the market's broader
funding concern:

| AI monetization path | Peak cumulative customer funding need | Ending modeled debt | $250B guarantee as share of gap | $540B announced deals as share of gap |
|---|---:|---:|---:|---:|
| Fast | $0.67T | $0 | 37.1% | 80.1% |
| Central | $1.89T | $0.35T | 13.2% | 28.5% |
| Slow | $4.31T | $1.08T | 5.8% | 12.5% |

This is not an Nvidia valuation model, and the capex commitments and modeled
funding gaps cover different entities and horizons. It is a mechanism check:
in the central and slow monetization paths, customer economics require large
external funding even before adding new guarantees.

The conventional warning survives in a narrower form. Vendor financing can
signal that reported chip demand depends on the vendor's own balance sheet and
that customer monetization is lagging capex. The direct expected-loss channel,
however, explains only a minority of the observed equity move in the displayed
stress range. The residual must reflect some combination of demand quality,
future margins, Chinese competition, correlation in a common AI downturn, and
valuation multiples. This toy model does not allocate that residual.

Background for the reused model:
[24 July AI capital-cycle report](NEWS_STRESS_TESTS_2026-07-24.md).

## 3. Germany: fewer recorded sick days do not map one-for-one to output

Reuters reported about 22 certified calendar sick days per worker in 2024 and
a government plan to restrict telephone certification and make first-day
medical notes easier for employers to require. V1 asks what a 10% reduction
would do if every suppressed day became fully productive work.

Converting calendar days to a 220-working-day equivalent gives 13.26 recorded
workdays. A 10% cut recovers 1.326 days against about 206.7 baseline effective
days, apparently raising effective labour by 0.64%.

That is an upper-bound identity, not a policy estimate. V2 uses:

```text
net effective days
  = suppressed recorded workdays
    x behavioural share of the recorded reduction
    x (productivity while sick - infection spillover)
    - certification administration
```

| Case | Recorded reduction that becomes real attendance | Productivity while sick | Infection loss per attendance day | Administration days | Effective-labour change |
|---|---:|---:|---:|---:|---:|
| Cautious | 10% | 30% | 0.25 | 0.15 | -0.07% |
| Break-even illustration | 25% | 50% | 0.20 | 0.10 | approximately 0.00% |
| Optimistic | 75% | 70% | 0.05 | 0.05 | +0.29% |

The rows are exposed judgments because no credible rule-response estimate is
available. Under the middle row's other assumptions, 25.1% of any decline in
the recorded statistic must correspond to real extra attendance before output
rises. A recording change below that threshold does not pay for certification
time and infection spillovers.

The external evidence points away from a confident large gain. Reuters reports
that the 2022 jump was driven mainly by electronic reporting and respiratory
waves, and that studies found no increase attributable to telephone notes.
The OECD similarly attributes much of the post-2022 rise to better tracking
and infection awareness, and recommends retaining remote certification because
of transmission benefits. DAK's latest first-half 2026 data show the sickness
rate already edging from 5.4% to 5.3%, with respiratory absence down 21% but
mental-health absence up 9%—a compositional problem a certification rule does
not treat.

The model therefore supports the article's conventional skepticism, but it
does not prove the policy is harmful. It says the sign and magnitude are
unidentified until the government can estimate actual attendance response,
on-the-job productivity, clinical administration, and infection effects. The
simple +0.64% claim is a ceiling, not a central estimate.

Sources: [OECD Economic Survey of Germany](https://www.oecd.org/en/publications/2025/06/oecd-economic-surveys-germany-2025_b395dc9b/full-report/addressing-skilled-labour-shortages_9edb78e6.html)
and [DAK's current health-report index](https://www.dak.de/presse/bundesthemen/gesundheitsreport_48012).

## What the iteration changed

Each V1 equated a salient headline number with the desired outcome:

```text
raw unemployment drop = underlying momentum
guarantee face value = credit loss
fewer certified days = fully productive days
```

V2 inserts the missing state:

```text
labour stocks + seasonal and annual checks
customer default x utilization x recovery + capital funding path
recording x real attendance x sick productivity - spillovers
```

The revisions do not simply make every story smaller. They preserve Spain's
directional good news, strengthen the structural basis for AI funding concern
while shrinking the direct-loss interpretation, and leave Germany's policy
effect genuinely sign-ambiguous.

Code:
`src/simulations/news/headline-experiments-2026-07-28.ts`.
