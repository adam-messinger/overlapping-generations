# News-driven stress tests — 27 July 2026 macro/risk companion

This pass screened the day's major economic, climate, technology, and market
coverage for claims with a measurable outcome and at least one public
calibration point. Three stories survived:

1. How much inflation relief follows from the oil-price drop after the
   U.S.-Iran pause?
2. Did exports do most of the work behind China's 18.7% industrial-profit
   growth?
3. Does a quieter El Nino hurricane season materially reduce insurers' risk?

Run the models with:

```bash
npm run news:2026-07-27:macro-risk
```

The models are conditional stress tests. The oil result is a stylized
euro-area pass-through comparison, the China export result bridges two
different statistical universes, and the hurricane result is an aggregate
loss distribution rather than a portfolio catastrophe model.

## Results at a glance

| Story | Initial model | Failure exposed by the first pass | Revised result |
|---|---|---|---|
| Oil and inflation | Translate Monday's 8.1% Brent drop immediately into the consumer energy price level | A one-day futures price is not a durable monthly input, and consumer prices adjust with a lag | A one-month pause lowers average first-year headline inflation only 0.04pp versus renewed stress; a six-month pause lowers it 0.21pp |
| China industrial profits | Treat 6.5% revenue growth, or 13.4% export growth, as profit growth | Profit is revenue times margin; both shortcuts miss the observed 18.7% gain, and neither represents sector mix | Margin expansion accounts for 11.83pp, or 63%, on a Shapley split; the central export bridge contributes about 2.98pp, with a 2.24-3.73pp range |
| Hurricane insurance | Scale the recent $30B average loss by the forecast number of named storms | The shortcut has 99.6% mean absolute error on the article's 1992 and 2020 contrasts because it omits landfall location | Mean El Nino loss falls to $18.7B, but the median is only $6.4B and the 90th percentile is $104.8B; the modeled metro-strike probability is 11.8% |

## 1. The oil move is relief only if it persists

The 27 July market story reported that the U.S. and Iran paused strikes after
two weeks of attacks. Brent fell 8.14% to $88.90, Treasury yields declined,
and investors marked down inflation risk. The same report emphasized that
tensions remained high and quoted a market participant describing the pause
as potentially very short-lived.

V1 reads the market move literally. Monday's price and percentage decline
imply a pre-pause close of $96.78. The model uses the $67.02 last prewar close
and the existing imported-energy bridge, in which oil supplies 55% of the
composite shock. If the consumer energy subindex adjusted immediately and
fully to its new target, the headline price level would be about 0.44
percentage point lower.

That number is not a first-year inflation forecast. It silently assumes:

- the futures repricing persists;
- retail energy prices jump to their new target immediately;
- an oil move is the same thing as a whole imported-energy move; and
- no renewed fighting reverses the decline.

V2 runs the existing lagged energy-inflation model on three matched monthly
paths. Each path holds the relevant price for six months and then decays
toward the prewar level with an eight-month half-life. The temporary branch
holds $88.90 for one month and then returns to the pre-pause stress path; the
sustained branch holds $88.90 for all six months.

| Path | Peak headline inflation | First-year average | Excess inflation over target, point-months | Relief versus stress |
|---|---:|---:|---:|---:|
| Pre-pause stress | 3.52% | 3.25% | 15.05 | — |
| One-month pause | 3.50% | 3.22% | 14.62 | 0.04pp first-year average |
| Six-month pause | 3.33% | 3.05% | 12.57 | 0.21pp first-year average |

Monday's Brent quote was still 32.6% above the prewar close. In price
distance, 73.5% of the modeled war premium remained after the selloff.

The conventional market interpretation is directionally right: cheaper oil
reduces the inflation impulse. The model's disagreement is about immediacy
and scale. If the pause lasts one month, the first-year effect is about one
tenth of the mark-to-market shortcut. Meaningful macro relief requires a
durable de-escalation and restored physical supply, not just one favorable
trading day.

Sources: [Reuters' 27 July market report](https://au.investing.com/news/stock-market-news/shares-bonds-bounce-as-oil-skid-offers-inflation-relief-4552818),
the [IEA July Oil Market Report](https://www.iea.org/reports/oil-market-report-july-2026),
and the [prewar close reported by Kiplinger](https://www.kiplinger.com/investing/stocks/stocks-slip-as-alphabet-gets-ready-to-report-stock-market-today).

## 2. Exports cushioned Chinese profits; margins did more

China reported CNY3.95 trillion of profit at large industrial firms in the
first half, up 18.7% from a year earlier. Reuters described resilient exports
as cushioning sluggish domestic demand. The same release reported 6.5%
industrial revenue growth, while customs reported 13.4% goods-export growth.

V1 tries each growth rate as a profit model:

| Shortcut | Predicted profit growth | Error versus 18.7% |
|---|---:|---:|
| Revenue growth equals profit growth | 6.5% | -12.2pp |
| Export growth equals profit growth | 13.4% | -5.3pp |

V2 starts from the identity:

```text
profit = operating revenue x operating margin
```

The current 5.70% operating margin and the reported revenue and profit growth
imply a prior margin of 5.11%, or 11.46% margin growth. The exact multiplicative
decomposition is:

```text
18.70% = 6.50% revenue + 11.46% margin + 0.74% interaction
```

Splitting the interaction equally gives a 6.87pp revenue contribution and an
11.83pp margin contribution. Margin expansion therefore accounts for about
63% of the aggregate gain.

The sector data reveal even more concentration:

| Sector block | Contribution to aggregate profit growth | Share of total gain |
|---|---:|---:|
| Electronics | 8.5pp | 45.5% |
| Raw materials | 8.8pp | 47.1% |
| All other industries combined | 1.4pp | 7.5% |

This is compatible with strong external AI-hardware demand, but it is not the
same claim as "exports caused the profit recovery." Raw-material gains also
reflect commodity-price and margin effects, while automobile-manufacturing
profit fell 19.5%.

The export counterfactual is necessarily weaker. Customs exports and the
operating revenue of above-designated-size industrial firms do not cover
exactly the same entities or transactions. Using their prior-year ratio as a
20.0% proxy says that, if export revenue had not grown while domestic revenue
and margins followed the observed path, industrial profit growth would have
been about 15.7% rather than 18.7%. Varying the export-revenue share from 15%
to 25% gives a 2.24-3.73pp export cushion.

The reporting's word "cushion" survives. A stronger claim that exports explain
most of the 18.7% profit gain does not. The observable accounting points first
to margin expansion and to an unusually concentrated electronics/raw-materials
cycle.

Sources: [Reuters' industrial-profit report](https://www.investing.com/news/economic-indicators/chinas-industrial-profit-growth-moderates-amid-patchy-recovery-4812940),
the [National Bureau of Statistics first-half release](https://www.stats.gov.cn/english/PressRelease/202607/t20260715_1964120.html),
the [NBS June industrial-production release](https://www.stats.gov.cn/english/PressRelease/202607/t20260717_1964159.html),
and the [NBS sector-contribution figures](https://www.china.org.cn/china/Off_the_Wire/2026-07/27/content_118620327.shtml).

## 3. A quieter hurricane season lowers the mean, not the tail enough

Reuters reported a NOAA forecast of 8-14 named Atlantic storms, versus 14 in
an average season. V1 scales the recent $30B average insured loss by the
midpoint count:

```text
$30B x 11 / 14 = $23.6B
```

The implied range is $17.1B-$30.0B. The article itself supplies a sharp test
of that shortcut:

| Season | Named storms | Article's present-value insured loss | Count-scaled prediction | Absolute error |
|---|---:|---:|---:|---:|
| 1992, including Andrew | about 7 | about $100B | $15.0B | 85% |
| 2020 | 30 | about $30B | $64.3B | 114% |

Mean absolute percentage error is 99.6%. Named-storm count is a basin-activity
measure, not a loss model.

V2 separates three quantities:

1. El Nino landfall frequency: 3.8 per year in Aon's 13-year composite,
   versus 8.4 in La Nina years.
2. Ordinary loss per landfall: $6.1B historical El Nino loss divided by 3.8
   landfalls, or $1.61B.
3. A rare high-value metro strike: $100B in present-day insured loss, matching
   the article's Andrew and Miami/Tampa/Houston estimates.

The metro-hit probability is calibrated so the same structure reproduces the
recent $30B average at the midpoint of the El Nino and La Nina landfall rates.
It is 3.31% per landfall. Poisson thinning then yields this El Nino-year
distribution:

| Statistic | Modeled insured loss |
|---|---:|
| Mean | $18.7B |
| Median | $6.4B |
| 90th percentile | $104.8B |
| 95th percentile | $108.0B |
| Probability of at least one metro strike | 11.8% |

Halving or increasing the concentration probability by 50% moves expected
loss from $12.4B to $25.0B and the metro-strike probability from 6.1% to
17.2%.

The revised mechanism can conditionally reconstruct the two contrasts much
better: one present-day metro strike produces $101.6B, while 12 ordinary 2020
U.S. landfalls produce $19.3B versus the reported $30B. Conditional MAPE is
18.7%, but this is not a predictive backtest: the location class is supplied
after observing each season, and the calibration data overlap the historical
period.

The model agrees with the article's central warning. A lower basin storm count
does not guarantee a low-loss year. It adds one useful qualification: El Nino
is still good news in expectation in this toy model, lowering the mean about
38%. The remaining problem is a roughly one-in-nine present-day concentration
tail, not an unchanged average.

Sources: [Reuters' insurer analysis](https://www.investing.com/news/stock-market-news/analysiswhy-el-ninos-promise-of-a-quieter-hurricane-season-may-not-guarantee-good-news-for-insurers-4813365),
[Aon's 2026 ENSO risk report](https://www.aon.com/getmedia/a205f3da-7119-41a2-9a8e-4255172509d9/El-Nino-US-Hurricane-Risk-report.pdf),
[NOAA's 2026 outlook as reported by AP](https://apnews.com/article/hurricanes-atlantic-pacific-el-nino-damage-risk-419de66615c5eb9b2974ef14b4d2f50b),
and [NOAA's 2020 landfall summary](https://www.aoml.noaa.gov/hurricane_blog/record-breaking-atlantic-hurricane-season-draws-to-an-end/).

## What the revision changed

Across all three stories, V1 mapped the most salient headline number directly
to the outcome: spot oil to inflation, exports to profit, and named storms to
insured loss. V2 replaces those shortcuts with the missing stock or state:

```text
oil quote + duration + retail lag
profit = revenue x margin, with sector mix
insured loss = landfalls x location-conditioned severity
```

That revision changes the comparison with conventional wisdom in a consistent
way. The headline mechanism remains directionally useful, but its magnitude
depends on persistence, margins, and concentration—variables the headline
statistic does not itself measure.

Code:
`src/simulations/news/headline-experiments-2026-07-27-macro-risk.ts`.
