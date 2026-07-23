# Forecasting pilot: U.S. data-center electricity share in 2035

Status: open
Forecast origin: 2026-07-23
Forecast horizon: calendar year 2035
Planned resolution date: 2039-03-31

## 1. Frozen question and resolution contract

**Question.** What percentage of total U.S. electricity consumption in calendar
year 2035 will be consumed at data-center sites?

The forecast uses four mutually exclusive and exhaustive bins:

| Bin | Share of U.S. electricity consumption |
|---|---:|
| A | below 10% |
| B | 10% to below 15% |
| C | 15% to below 20% |
| D | 20% or more |

The associated headline binary question is **D: will the share be at least
20%?**

### Definitions

- **U.S.** means the 50 states and District of Columbia.
- **Data-center-site consumption** includes IT equipment and site
  infrastructure such as cooling, power conversion, lighting, and networking.
  It includes electricity produced behind the meter and consumed at the site.
  It excludes separately metered cryptocurrency mining, unless the resolver
  cannot separate it from ordinary data-center use.
- **Total U.S. electricity consumption** includes grid-supplied and
  behind-the-meter electricity consumed in the United States. If the resolver
  publishes an explicit data-center share using a materially equivalent
  denominator, that reported share takes precedence over reconstructing the
  denominator.

### Resolver and revisions

1. Use the latest officially revised estimate published by 2038-12-31 in a
   U.S. Department of Energy, Lawrence Berkeley National Laboratory, or U.S.
   Energy Information Administration publication that explicitly estimates
   actual (not projected) national data-center electricity consumption for
   calendar 2035.
2. Prefer an explicitly published share. Otherwise divide the publication's
   2035 data-center-site consumption estimate by the EIA's latest, as of
   2038-12-31, estimate of total U.S. calendar-2035 electricity consumption.
3. If the primary estimate is an interval with no central estimate, use its
   arithmetic midpoint. If several qualifying primary publications disagree,
   use the most recently published estimate; publication date, rather than
   model vintage, breaks ties.
4. If no qualifying estimate exists by 2038-12-31, use the first materially
   equivalent IEA or congressionally commissioned national retrospective
   estimate published by that date.
5. If neither exists, mark the question invalid rather than resolving it from
   a pre-2036 projection.

This contract was frozen before targeted source research or inspection of the
repository's data-center model.

## 2. Sealed independent prior

Timestamp: **2026-07-23T13:21:37Z**

Information allowed at this stage: broad background knowledge and the
previously encountered public claim that data centers might reach roughly 20%
of U.S. electricity use by 2035. No targeted web research and no simulation
output were consulted.

| Bin | Prior probability |
|---|---:|
| A: below 10% | 12% |
| B: 10% to below 15% | 33% |
| C: 15% to below 20% | 33% |
| D: 20% or more | 22% |

Derived prior probabilities:

- `P(share >= 15%) = 55%`
- `P(share >= 20%) = 22%`

Prior median: in the 15%–20% bin.

### Pre-research rationale

The AI build-out makes a several-fold increase in data-center electricity use
plausible. Against that are long construction and interconnection lead times,
the difficulty of sustaining exponential demand growth for nine years,
efficiency and utilization responses to electricity scarcity, and likely
double-counting between announced projects. I therefore put the modal mass
between 10% and 20%, with 20% or more possible but not the default.

No later result will overwrite this section. Updates will be logged
chronologically below.

## 3. Decision use

This forecast can inform the scale and timing of generation, transmission,
data-center financing, and ratepayer-protection decisions. It is not itself a
forecast of electricity prices or grid reliability. Those consequences depend
on where the load appears, its flexibility, and who pays for dedicated and
shared infrastructure.

The nine-year target is too distant to manage as one unchanging forecast. The
workflow therefore also identifies nearer-term bridge questions that can be
resolved and scored before 2035.

## 4. Outside view

### 4.1 Explicit forecast reference class

Inclusion rule: a published U.S. national data-center electricity forecast
covering servers plus associated site infrastructure, subsequently revisited
by a reasonably comparable bottom-up national study.

Only **two** clean-enough historical forecast episodes were found:

1. The [EPA's 2007 Report to
   Congress](https://www.energystar.gov/ia/partners/prod_development/downloads/EPA_Datacenter_Report_Congress_Final1.pdf)
   projected 95.5 TWh in its current-efficiency case and 109.3 TWh in its
   historical-trends case for 2010. A 2011 reconstruction using updated
   shipment and efficiency data estimated 67.1–85.6 TWh, midpoint 76.4 TWh.
   Thus the current-efficiency point was about 25% above the later midpoint
   and even exceeded the top of the updated range by about 12%.
2. The [2016 LBNL
   report](https://eta-publications.lbl.gov/publications/united-states-data-center-energy)
   projected 73 TWh in 2020. The [2024 LBNL
   report](https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report.pdf)
   says its revised 2018–2020 history was higher than every 2016 scenario
   because the earlier model did not capture the rise of accelerated AI
   servers.

Reference-class denominator: **n = 2 forecast episodes**. Directional result:
**1/2 overpredicted and 1/2 underpredicted**. This is much too small and too
definition-sensitive to use as a numerical event base rate. Its legitimate
lesson is that extrapolations have failed in both directions: efficiency and
economic shocks broke the high 2007 trajectory, while a new workload regime
broke the low 2016 trajectory.

The [2011 Koomey
reconstruction](https://ptacts.uspto.gov/ptacts/public-informations/petitions/1549149/download-documents?artifactId=B2sK_6JKG7HvlcMY3Comn8hU4xWpi3N-yHk1r8gNHEhFOrrYRmncFdQ)
attributes the first miss to the financial crisis, virtualization, and
efficiency improvements. This is an especially relevant warning against
assuming that demand for computation translates one-for-one into electricity
demand.

### 4.2 Project-pipeline reference class

The [2025 NERC Long-Term Reliability
Assessment](https://www.nerc.com/globalassets/our-work/assessments/nerc_ltra_2025.pdf)
reports three useful ERCOT observations for data-center and large-load projects
with recent requested in-service dates:

- projects entering service in 2022–2024 averaged a 180-day delay;
- data-center peak consumption averaged 49.8% of requested MW;
- 55.4% of previously filed projects with 2024 in-service dates had energized.

The public report does not give the project counts behind these percentages.
The denominator is therefore **unknown**, and multiplying 55.4% by 49.8%
would also risk combining cancellation, delay, and utilization effects that
overlap with the simulation's separate load-factor input. These figures are
strong evidence for a realization haircut, but not a defensible national 2035
frequency.

FERC subsequently described speculative and duplicate requests as distorting
forecasts and adopted escalating readiness requirements in June 2026. That
should improve the informational value of future queues, but it also means the
recent ERCOT realization rate need not remain stable. See [FERC's 2025
forecasting letter](https://www.ferc.gov/news-events/news/chairman-rosners-letter-rtosisos-large-load-forecasting)
and [June 2026
remarks](https://www.ferc.gov/news-events/news/commissioner-rosners-remarks-large-load-show-cause-orders-e-7-e-12-june-18-2026).

### Outside-view conclusion

There is no stable empirical base rate that deserves to replace judgment. The
outside view says to use several models, put real probability on both
structural slowdown and a new regime, and avoid narrow confidence intervals.

## 5. Current evidence and inside view

### 5.1 Current level and specialized bottom-up outlook

The [2024 LBNL national
report](https://energyanalysis.lbl.gov/publications/2024-lbnl-data-center-energy-usage-report)
estimated:

- 76 TWh and 1.9% of U.S. electricity in 2018;
- 176 TWh and 4.4% in 2023;
- 325–580 TWh and 6.7%–12.0% in 2028 scenarios.

Its [June 2026
update](https://eta-publications.lbl.gov/publications/united-states-data-center-energy-2025)
is the most relevant current specialized study for this resolution boundary.
It estimates 2030 full-site electricity consumption of:

| 2030 case | TWh | U.S. share |
|---|---:|---:|
| Compounded low | 521 | 9.5% |
| Reference | 649 | 11.8% |
| Compounded high | 843 | 15.3% |

The report explicitly calls these sensitivity scenarios rather than
probability intervals. Important single-parameter cases include lower
equipment installations at 578 TWh, shorter AI-chip life at 590 TWh, more
specialized chips at 664 TWh, and higher idle power and utilization at
782 TWh. Utilization and installed equipment are therefore direct cruxes.

Starting at the 2030 shares, the annual growth in data-center versus
non-data-center electricity odds required to reach 20% in 2035 is:

| 2030 share | Required annual relative odds growth, 2030–2035 |
|---:|---:|
| 9.5% | 19.0% |
| 11.8% | 13.3% |
| 15.3% | 6.7% |

The reference path is demanding but not outside recent experience. The
2018–2023 share rose from 1.9% to 4.4%, about 17% annual growth in the odds.
That historical rate is not a forecast: a much larger base, power constraints,
efficiency, and the economics of additional computation should cause
deceleration.

### 5.2 Strong official contrary model

The EIA's [Annual Energy Outlook
2026](https://www.eia.gov/outlooks/aeo/) is far lower. Exact values in the
official [AEO narrative figures
workbook](https://www.eia.gov/outlooks/aeo/excel/Narrative_Figures.xlsx),
sheet `7_DataCenters`, are:

| EIA case | 2030 server TWh | 2035 server TWh | 2035 total U.S. TWh | Server-only share |
|---|---:|---:|---:|---:|
| Counterfactual baseline | 178 | 258 | 4,937 | 5.2% |
| High electricity demand | 191 | 304 | 5,018 | 6.0% |

These are server-only figures, whereas this forecast covers the full site.
Applying a rough 1.4–1.6 full-site/server ratio puts the EIA-style 2035
outcome around 7%–10%. That conversion is only an approximation, but it makes
the strongest contrary case clear: a respected official model can accommodate
exponential AI-server growth and still land below the lowest forecast bin
boundary.

The disagreement is not a small parameter dispute. It reflects different
boundaries, equipment-stock assumptions, operating power, utilization,
efficiency, and modeling purposes. The general EIA model deserves some weight;
the specialized and newer LBNL study deserves more weight for this particular
site-load target.

### 5.3 Other forecasts and revisions

- The [IEA's 2025 Energy and AI
  report](https://www.iea.org/reports/energy-and-ai/executive-summary%C2%A0)
  projected global data-center consumption near 945 TWh in 2030 and 1,200 TWh
  in 2035. Its U.S. load rises by about 240 TWh from 2024 to 2030. Headwinds,
  high-efficiency, and lift-off cases show that infrastructure, financing, AI
  adoption, and efficiency all matter. The IEA's [2026
  update](https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary)
  says bottlenecks reduce aggressive near-term outcomes while investments to
  relieve them create post-2030 upside.
- BNEF's U.S. 2035 estimate has moved extraordinarily quickly: about 78 GW in
  April 2025, 106 GW in December 2025, and 194 GW in July 2026. The latest
  report associates 194 GW with roughly 20% of U.S. electricity. See BNEF's
  earlier [public summary](https://about.bnef.com/insights/commodities/power-for-ai-easier-said-than-built/),
  the [June 2026 Columbia comparison
  table](https://www.energypolicy.columbia.edu/wp-content/uploads/2026/06/ElectricityLoad-CGEP_WhitePaper_062326.pdf),
  and the [latest report
  coverage](https://www.datacenterdynamics.com/en/news/us-data-centers-to-consume-up-to-194gw-of-power-by-2035-report/).
  The last two revisions were approximately +36% and +83%. They are not
  resolved forecast errors, but they demonstrate unstable inputs and argue
  against over-weighting the latest point estimate.
- EIA reports that total U.S. electricity demand grew about 1.7% annually from
  2020–2025 after growing only 0.1% annually from 2005–2019. Its [March 2026
  analysis](https://www.eia.gov/TODAYINENERGY/detail.php?id=67344) attributes
  much of the current acceleration to data centers. This confirms that the
  build-out is already affecting observed load rather than existing only in
  announcement queues.

### 5.4 Causal decomposition

The target can be written as:

`site electricity = energized IT stock × operating power × utilization × PUE and other infrastructure`

divided by:

`non-data-center electricity + site electricity`.

Forces toward 20% or more:

- continuing rapid AI accelerator shipments and short replacement cycles;
- inference demand broadening beyond frontier-model training;
- hyperscalers' willingness to use dedicated and behind-the-meter generation;
- declining generation and storage costs in suitable regions;
- grid, turbine, transformer, and chip investment relieving current
  bottlenecks after 2030;
- a high-utilization regime for expensive accelerators.

Forces below 20%:

- duplicated announcements, delayed connections, and projects that never
  energize;
- compute-efficiency improvements and workload optimization;
- falling utilization after an overbuild;
- poor returns on incremental AI capital, tighter financing, or a capex
  reversal;
- electricity, turbine, transformer, water, and permitting constraints;
- growth in the denominator from electrification and industrial load;
- data-center activity locating outside the United States.

The most likely path contains both: very rapid additions through 2030 followed
by meaningful deceleration, not uninterrupted exponential growth or a sudden
stop.

## 6. What the existing simulations say

### 6.1 Global model

The global model is not a U.S. forecast. Its data-center load is allocated
across broad regions in proportion to GDP, with the United States embedded in
an OECD region. It can test whether a global compute trajectory is coherent
with capital, GDP, and energy supply, but it cannot resolve the national
question.

Deterministic results:

| Global scenario | 2030 DC TWh | 2035 DC TWh | 2035 share of global electricity |
|---|---:|---:|---:|
| Slower growth / tighter power-spend brake | 774 | 1,135 | 3.2% |
| Repository baseline | 1,017 | 1,785 | 4.9% |
| Faster growth / looser brake | 1,358 | 2,949 | 7.9% |

The baseline is close to the IEA's global 2030 level but about 49% above its
1,200 TWh 2035 base case. This supports continued global growth, but it cannot
identify what fraction lands in the United States. The sensitivity range is
scenario variation, not an epistemic interval.

### 6.2 U.S. data-center grid model

The U.S. grid model begins from BNEF's 194 GW 2035 scenario, subtracts an
illustrative 35 GW current fleet, and uses a 60% fleet load factor. Its
`annualElectricityTwh` result is incremental electricity, despite the
unqualified field name.

Holding non-data-center electricity fixed as the model does, different
realizations of the incremental contracted load imply:

| Incremental realization | Total DC TWh | 2035 U.S. share |
|---:|---:|---:|
| 50% | 602 | 12.9% |
| 75% | 811 | 16.6% |
| 100% | 1,020 | 20.0% |

This identifies realization as a crux. It does **not** independently validate
20%: at 100% realization the result is an algebraic restatement of the BNEF
input. The model is much more useful for the consequences conditional on that
load—firm-capacity requirements, cost responsibility, stranded risk, and
emissions—than for its probability.

### 6.3 Question-specific probability adapter

Because neither existing model maps beliefs into the resolution bins, the
pilot uses a standalone seeded script rather than changing `tsimulation`.
The adapter gives:

- 25% structural weight to the EIA model family, centered near a 6% full-site
  share in 2030 with 6% annual relative odds growth;
- 75% weight to the specialized LBNL family, centered at 11.8% in 2030;
- within LBNL, post-2030 regime weights of 30% headwinds, 50% central, and
  20% lift-off, with annual relative odds growth centered at 3%, 10%, and 17%.

Those weights and distributions are explicit analyst judgments. LBNL
sensitivity bounds are not silently treated as confidence bounds. A model
family mixture supplies structural discrepancy that would otherwise be
missing.

With seed `20350723` and 200,000 draws, the **model-conditioned result** is:

| Bin | Probability |
|---|---:|
| Below 10% | 23.1% |
| 10% to below 15% | 25.6% |
| 15% to below 20% | 26.1% |
| At least 20% | 25.2% |

Model distribution: 10th percentile 7.4%, median 15.2%, 90th percentile
24.7%.

Structural weights matter far more than Monte Carlo error:

| EIA-family weight | Below 10% | 10%–15% | 15%–20% | At least 20% |
|---:|---:|---:|---:|---:|
| 0% | 3.7% | 28.2% | 34.8% | 33.2% |
| 25% | 23.1% | 25.7% | 26.3% | 24.9% |
| 50% | 42.4% | 23.3% | 17.8% | 16.6% |

This is the main modeling result: today's structural disagreement justifies a
wide, almost flat distribution across the four bins.

## 7. Update ledger

All rows preserve the four-bin order `<10 / 10–15 / 15–20 / >=20`.

| Stage | Probabilities | Update rationale |
|---|---|---|
| Sealed prior | 12 / 33 / 33 / 22 | Broad knowledge only; already aware of the rough 20% headline. |
| Historical reference classes | 15 / 30 / 31 / 24 | Widened both tails. Efficiency broke an earlier high forecast, while AI broke a later low forecast. |
| June 2026 LBNL update | 7 / 25 / 34 / 34 | A specialized 2030 reference share of 11.8% makes 20% reachable with 13.3% annual relative odds growth. |
| EIA AEO 2026 model | 21 / 25 / 28 / 26 | Added substantial sub-10% mass because the official high-demand path remains near 10% after converting to full-site load. |
| BNEF revisions and queue evidence | 20 / 26 / 29 / 25 | The latest pipeline is large, but two huge upward forecast revisions and poor recent queue realization reduce its independent weight. |
| Quantitative adapter observed | 23.1 / 25.6 / 26.1 / 25.2 | Model result recorded separately; not automatically adopted. |
| **Final human forecast** | **18 / 25 / 29 / 28** | More weight than the adapter gives to the newer specialized LBNL study and the already observed demand acceleration; less than full weight to BNEF because realization and forecast instability remain serious. |

The research moved probability toward both tails. The headline probability of
20% or more rose from 22% to 28%, but the probability below 10% also rose from
12% to 18%. Learning about genuine model disagreement should reduce confidence
even when the central story changes little.

## 8. Final forecast

Timestamp: **2026-07-23**

| Bin | Final probability |
|---|---:|
| A: below 10% | **18%** |
| B: 10% to below 15% | **25%** |
| C: 15% to below 20% | **29%** |
| D: 20% or more | **28%** |

- `P(share >= 15%) = 57%`
- `P(share >= 20%) = 28%`
- Median bin: 15%–20%

The central narrative is rapid growth through 2030 followed by deceleration.
Twenty percent is a live possibility, not the base case. The exact bin
distribution is more informative than a single expected share because current
official models span opposite sides of two bin boundaries.

### Strongest contrary case

The strongest case against this forecast's 57% probability above 15% is the
EIA AEO 2026. It projects only 258–304 TWh of server electricity in 2035.
Even after a generous full-site conversion, that is roughly 7%–10% of total
electricity. Combine that with recent queue attrition, continued compute
efficiency, weaker AI returns after an investment boom, and growth in
non-data-center electricity, and the outcome can remain below 10% without
requiring an AI collapse.

The strongest case for 20% is the newer specialized LBNL trajectory plus
BNEF's rapidly expanding facility pipeline. If 2030 is near the top of LBNL's
range, only about 6.7% annual post-2030 relative odds growth is required.
Behind-the-meter generation also prevents the public interconnection queue
from being a hard national cap.

## 9. Cruxes, conditionals, and value of information

### Model conditionals

| Condition | `P(2035 share >= 20% | condition)` |
|---|---:|
| 2030 share at least 12% | 53.1% |
| 2030 share below 12% | 10.1% |
| 2030–2035 relative odds growth at least 10%/yr | 59.8% |
| Relative odds growth below 10%/yr | 5.9% |
| EIA structural family | approximately 0% in the adapter |
| LBNL structural family | 33.6% |
| LBNL headwinds regime | 4.2% |
| LBNL central regime | 33.7% |
| LBNL lift-off regime | 76.9% |

Zero in the EIA adapter is not a claim of literal impossibility. It means that
the specified EIA-centered distribution generated no 20% draws; a human
forecast should retain a small tail beyond every model.

### Scoreable bridge questions

1. **Will a qualifying retrospective estimate put full-site 2030 U.S.
   data-center electricity share at 12% or more?** Current judgment 45%.
   Human conditionals: `P(D | yes) = 53%`, `P(D | no) = 10%`.
2. **Will a qualifying estimate put calendar-2028 data-center electricity at
   500 TWh or more?** Current judgment 35%. Human conditionals:
   `P(D | yes) = 45%`, `P(D | no) = 19%`.
3. **Will data-center versus non-data-center electricity odds grow at least
   10% annually from 2030 through 2035?** Current judgment 40%.
   Human conditionals: `P(D | yes) = 60%`, `P(D | no) = 6%`.

The first bridge question has roughly a 20-percentage-point expected absolute
movement in the model's headline probability if perfectly resolved. The third
has roughly 25 points, but it resolves too late to guide most current research.
The best near-term research therefore predicts that growth rate using its
components rather than waiting to observe it.

### Research queue

Ranked by expected probability movement, reducibility, and timeliness:

1. **Measured energized load and utilization.** Obtain facility-level or
   utility-level actual MW, requested MW, energization dates, and duplicate
   project identifiers. Separate cancellation, delay, peak/request ratio, and
   annual load factor.
2. **AI equipment stock.** Track U.S. accelerator shipments and installations,
   operating power, utilization, and retirement. This directly adjudicates
   the LBNL/EIA divergence.
3. **Forecast reconciliation.** Rebuild EIA and LBNL estimates under one
   server/site boundary and common PUE. This is currently more valuable than
   another model run.
4. **Compute economics.** Track AI revenue, hyperscaler and off-balance-sheet
   data-center commitments, financing costs, cancellations, and the ratio of
   incremental revenue to capital and electricity expense.
5. **Power-delivery milestones.** Track turbines, transformers, generation,
   interconnection agreements, site control, and behind-the-meter projects,
   counting only demonstrated readiness.
6. **Denominator growth.** Update non-data-center demand for EVs, industry, and
   buildings. It matters, but less than numerator stock and utilization.

### Update triggers

Update the forecast, with a cited rationale, when any of the following occurs:

- a new LBNL national estimate or scenario update;
- AEO 2027 or later materially revises the data-center server series;
- an audited national or multi-ISO data set reports requested versus energized
  MW and actual load factors;
- BNEF or another tracked forecaster changes its 2035 estimate by at least 15%;
- accelerator shipment or utilization evidence moves the LBNL 2030 reference
  by at least 10%;
- a sustained hyperscaler capex contraction, major project-cancellation wave,
  or demonstrated post-2030 supply acceleration changes the growth-regime
  weights.

Do not update merely because the simulation is rerun with unchanged evidence.

## 10. Resolution and scoring

At resolution:

- score the four probabilities with the multinomial Brier score;
- also use ranked probability score because the bins are ordered;
- preserve launch, every update, time-averaged, and closing scores;
- run a postmortem separating reference-class error, input-belief error,
  structural-model error, missed evidence, and resolver ambiguity.

The binary `>=20%` Brier score is a secondary diagnostic. It should not replace
the four-bin score because most useful information lies below that threshold.

## 11. Framework field notes from actual use

### Useful now

- Strict units made the GW, average-GW, TWh/year, load-factor, and percentage
  conversions auditable.
- Scenario overrides made it easy to expose the realization crux and to test
  global growth and willingness-to-pay brakes.
- The U.S. grid model cleanly separates energy, firm capacity, flexibility,
  dedicated supply, cost responsibility, and stranded risk.
- The global model tests whether compute demand remains coherent with capital,
  energy supply, prices, and GDP rather than extrapolating TWh in isolation.
- Seeded local execution and model registration make results reproducible.

### Awkward now

- The target, resolver, prior, evidence chronology, model result, and final
  judgment all had to be maintained manually in Markdown.
- A custom script was needed to convert beliefs into target-bin probabilities
  and calculate conditional crux probabilities.
- External forecast data had to be reconciled by hand before becoming model
  inputs.
- The global and news simulations require separate entry points and use
  different geographic and accounting boundaries.
- `annualElectricityTwh` in the U.S. grid result is incremental, although its
  name sounds like total electricity.

### Missing

- A U.S. regional allocator and a direct national data-center share output.
- An empirical facility/project cohort model with cancellation, delay,
  utilization ramp, retirement, and duplicate-request handling.
- Belief distributions, correlations, structural-model weights, and an
  explicit model-discrepancy term.
- First-class resolution contracts, reference classes, forecast ledgers,
  conditionals, aggregation, and proper scoring.
- Versioned backtests of data-center forecasts under stable definitions.
- A common full-site/server boundary shared by the global, EIA-style, LBNL,
  and grid models.

### Dangerous

- The BNEF-aligned grid scenario can appear to “predict” 20%, although 20% is
  built into its 194 GW, 60% load-factor, and denominator assumptions.
- Scenario ranges and sensitivity sweeps can be mistaken for probability
  intervals.
- The global model's GDP-proportional allocation could be used to infer a U.S.
  value even though the only relevant region is OECD.
- A single expected-load-realization factor invites double-counting project
  cancellation, delay, requested/actual peak, and annual utilization.
- Current source disagreements partly reflect incompatible boundaries.
  Treating them as parameter disagreement alone produces false precision.
- The frozen resolver's “most recent qualifying publication” rule can make
  methodology and publication timing determine the outcome. The exercise
  revealed that a future question should name one recurring statistical
  series or predefine a crosswalk, not merely a hierarchy of institutions.

## 12. Reproduction

From the repository root:

```bash
node --import tsx scripts/forecast-data-center-2035.ts
npx tsc --noEmit
node --import tsx src/simulations/news/data-center-grid.test.ts
```

The forecasting adapter is
[`scripts/forecast-data-center-2035.ts`](../../scripts/forecast-data-center-2035.ts).
It remains a model-specific probability adapter and does not change the
production simulation. The post-pilot framework now gives the grid model a
strict semantic boundary: BNEF's 194 GW value is registered as total 2035
capacity, and the subtraction of the illustrative 35 GW operating base is a
versioned total-to-incremental derivation rather than an implicit relabeling.
