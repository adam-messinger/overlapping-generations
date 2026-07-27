# News-driven stress tests — 26 July 2026

This pass selects three stories from the 26 July news cycle that have a
measurable target and a mechanism the current simulation collection can
represent:

1. How far does the provisional U.S. heat-death count understate event excess
   mortality?
2. How many cases will eventually be assigned to the iceberg-lettuce
   Cyclospora outbreak, and does the count support the claim that the federal
   response was unusually slow?
3. Can the voluntary data-center Ratepayer Protection Pledge keep household
   electricity bills from rising?

Run the models with:

```bash
npm run news:2026-07-26
```

These are conditional, first-order experiments. The heat and Cyclospora
outputs are nowcasts, not forecasts of future weather or transmission. The
data-center output is a 2035 scenario decomposition, not a prediction that the
central compliance assumption will occur.

## Results at a glance

| Story | Initial model | Failure exposed by the first pass | Revised result |
|---|---|---|---|
| July heat deaths | Multiply the 69 explicitly attributed deaths by the arithmetic mean of three historical excess/direct ratios | Leave-one-event-out MAPE is 69%; event definitions and death-certificate attribution differ too much for a precise universal multiplier | Central excess mortality is 202, but the defensible toy range is 113–440; the uncertainty is more important than the point |
| Cyclospora response | Compound the 1,644→1,947 reported-count growth through FDA's six-week classification window | The geography and onset boundary changed between updates, and classification lag is not continuing infection growth | A reporting-completion curve nowcasts about 3,400 final outbreak-linked cases, with 2,920–4,250 sensitivity; its frozen later-2020 check misses by 2.6% |
| Data-center pledge | Compare fully socialized grid buildout (+5.1% to other bills) with literal full cost responsibility (0%) | All-or-nothing cost assignment omits partial compliance, wholesale scarcity, and the fixed-cost contribution from durable new load | The illustrative 65%-enforceable case is +2.5%; no protection is +8.5%; literal full protection is 0% before, or −0.7% with, a $5/MWh contribution to legacy fixed costs |

## 1. Heat mortality is a measurement problem

The current headline is a count of deaths explicitly attributed to heat, not
an all-cause excess-mortality estimate. The two quantities have different
inclusion rules. The model uses three event comparisons:

| Event | Heat-attributed | Excess | Excess / attributed |
|---|---:|---:|---:|
| Chicago 1995 | 473 | 739 | 1.56× |
| California 2006 | 147 | 655 | 4.46× |
| Washington and Oregon 2021 | 273 | about 600 | 2.20× |

V1 applies the arithmetic mean, producing 189 excess deaths. That looks
plausible but is not stable: holding out each event and estimating its excess
deaths with the other two produces 69% mean absolute percentage error.

V2 makes two changes:

- It uses the geometric rather than arithmetic historical center, because the
  error is multiplicative.
- It models the current direct count as 85% complete, with 70%–95%
  sensitivity, separately from the heat-attribution share on completed death
  records.

The result is 202 central excess deaths and a 113–439 range. The point
backtest remains poor at 60% MAPE. The revision therefore does not claim a
newly accurate number; it stops the model from presenting a fragile multiplier
as accurate.

The day's claim that 69 is a dramatic undercount is directionally supported:
two of the three historical episodes had more than twice as many excess deaths
as explicitly attributed deaths. But “the toll is about 200” is too precise
for this evidence.

Sources: [current Washington Post count and methodology](https://www.washingtonpost.com/weather/2026/07/26/this-months-heat-domes-killed-least-70-people-us-post-analysis-finds/),
[Chicago cause-of-death analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC1854989/),
[California excess-mortality estimate](https://pubmed.ncbi.nlm.nih.gov/19680599/),
[Washington's final direct count](https://doh.wa.gov/emergencies/be-prepared-be-safe/severe-weather-and-natural-disasters/extreme-heat/hot-weather-precautions/heat-wave-2021),
[Oregon's final direct count](https://climate.oregon.gov/s/2023-Legislative-Report.pdf),
and [Pacific Northwest excess mortality](https://time.com/6198720/heatwave-health-death-toll/).

## 2. Cyclospora: a severe outbreak, but a bad real-time performance metric

FDA's 24 July update reports 1,947 outbreak-specific cases, 98
hospitalizations, a 17 July recall, onsets through 20 July, and up to six weeks
to decide whether a case belongs to this outbreak. It also says the increase
partly reflects four newly included states. The 16 July update reported 1,644
cases in five states and an onset window beginning 13 May; the 24 July
nine-state definition begins 22 June. Those counts are therefore not one clean
cumulative time series.

V1 ignores that distinction. It compounds the eight-day count increase for the
remainder of the six-week window and reaches 4,081 cases.

V2 treats the outbreak count as an administrative reporting stock:

```text
completion(d) = 1 - (1 - completion at recall) × 2^(-d / reporting half-life)
```

The action-day completion anchor is the 2018 fast-food salad outbreak:
61 cases were known at intervention and 511 were eventually linked. The early
2020 bagged-salad snapshot—509 of an eventual 701 cases 11 days after the full
recall—sets a 6.5-day reporting half-life. Without refitting, that curve
predicts 658 cases at the later 2020 snapshot; FDA reported 641, a 2.6% miss.
Refitting both 2020 snapshots gives a 6.7-day half-life.

At seven days after the current recall, that curve says the 1,947 count is
about 57% complete. The central final count is 3,405, with a 2,922–4,252 range
when the reporting half-life is varied from five to ten days. Roughly 1,460
additional assignments after the recall are therefore expected. They should
not be read as 1,460 infections caused after the recall.

The “catastrophic response” claim cannot be cleanly scored from public counts:

- Using the latest outbreak definition, first onset to recall was 25 days,
  versus 54 days in 2018 and 47 days in 2020.
- Public linkage of the vehicle/supplier and recall were one day apart.
- The revision of the first-onset boundary by 40 days shows that an
  onset-to-action score is itself unstable in real time.

This does not establish that the upstream investigation was good. Thousands of
cases, confusing laboratory communications, and the lack of a clean
public event line can all signal capability problems. It does establish that
post-recall case growth is a poor measure of recall effectiveness, and that
the available public series cannot by itself support a comparative verdict on
agency competence.

Sources: [FDA's current 2026 investigation](https://www.fda.gov/food/outbreaks-foodborne-illness/investigation-9-state-outbreak-cyclospora-illnesses-iceberg-lettuce-july-2026),
[CDC's 2018 final report](https://www.cdc.gov/mmwr/volumes/67/wr/mm6739a6.htm),
and [FDA's 2020 update history](https://www.fda.gov/food/outbreaks-foodborne-illness/outbreak-investigation-cyclospora-bagged-salads-june-2020).

## 3. Data-center bills depend on enforcement and rate design

The existing grid model puts BloombergNEF's 2035 194 GW scenario through
generation, network, load-realization, and take-or-pay accounting. Its V1
endpoints are:

- If all incremental shared generation and network capital is socialized,
  non-data-center bills rise 5.1%.
- If the data center brings additive power, pays all delivery upgrades, and
  signs take-or-pay protection, the capital-cost shift is zero.

V2 adds the channels needed to evaluate the current pledge story:

```text
other-customer bill impact
  = uncovered project-capital revenue requirement
  + wholesale scarcity from unmatched load
  - data-center contribution to legacy fixed costs
```

The illustrative central case assumes 65% of projects—not 65% of power
territories—eventually have enforceable protection, a 40% generation share of
retail rates, a 0.5 wholesale price elasticity to unmatched load, and a
$5/MWh large-load contribution to legacy fixed costs.

| Case | Capital shift | Scarcity | Fixed-cost benefit | Net |
|---|---:|---:|---:|---:|
| No protection | +5.1% | +4.1% | −0.7% | +8.5% |
| 65% enforceable project coverage | +1.8% | +1.4% | −0.7% | +2.5% |
| Literal full pledge | 0% | 0% | −0.7% | −0.7% |
| Literal full pledge, no legacy contribution | 0% | 0% | 0% | 0% |

The White House says its coalition covers 80% of power delivered to homes and
businesses. That is not an observed 80% compliance rate for future projects.
Substituting it for project coverage gives +1.2%, but that apparent precision
is a semantic error.

Two pieces of conventional wisdom are too strong:

1. Paying every incremental project cost prevents a positive cost shift; it
   does not mathematically guarantee lower household bills. Bills fall only if
   the large-load tariff also contributes to legacy fixed costs or creates
   other system benefits.
2. The widely repeated 15%–40% figure is not a data-center-only causal
   estimate. ICF projects nominal residential rate increases between 2025 and
   2030 in four utility markets under 25% total U.S. demand growth from data
   centers, industry, electrification, and other loads.

The historical literature also does not settle the sign. One recent
instrumental-variables estimate says a doubling of data-center capacity
reduced residential prices about 3.5% through 2024 by spreading fixed costs.
Another facility-entry study estimates a 2.1% residential increase. The
model's separate dilution, scarcity, and cost-allocation terms show how both
results can arise in different utility conditions. Future supply constraints
can reverse a historical fixed-cost benefit.

Sources: [current AP pledge report](https://apnews.com/article/trump-ai-data-centers-pledge-490ea7e4c7227d5e550b00a0056c33c9),
[the White House pledge terms and coverage](https://www.whitehouse.gov/ratepayer-protection-pledge/),
[ICF's demand and nominal-rate forecast](https://www.icf.com/-/media/files/icf/reports/2025/energy-demand-report-icf-2025_report.pdf),
[DOE large-load rate-design guidance](https://www.energy.gov/policy/articles/electricity-rate-designs-large-loads-evolving-practices-and-opportunities),
[the negative historical estimate](https://arxiv.org/abs/2606.19777),
and [the positive historical estimate](https://papers.ssrn.com/sol3/Delivery.cfm/6967558.pdf?abstractid=6967558).

## What most differs from conventional wisdom

1. **Heat:** the undercount is credible; the precision is not. Historical
   conversion factors are too heterogeneous to defend one national multiplier.
2. **Cyclospora:** a rising count after recall is expected and mostly says
   “classification lag,” not “recall failure.” The burden is severe, but the
   current public data do not identify which part of investigation,
   traceback, communication, or recall execution failed.
3. **Data centers:** neither “AI inevitably raises bills 15%–40%” nor “the
   pledge makes bills fall” survives semantic and accounting checks. The sign
   is conditional on spare capacity, enforcement, cost allocation, and whether
   large-load rates contribute to the old grid as well as their new assets.

Code:
`src/simulations/news/headline-experiments-2026-07-26.ts`.
