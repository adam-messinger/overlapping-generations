# Forecasting pilot: U.S. COVID-19 admissions, August 2026

Status: open
Forecast origin: 2026-07-23
Prior sealed: 2026-07-23T13:22:18Z
Target week ending: 2026-08-15

## 1. Frozen question and resolution contract

**Question.** How many new U.S. hospital admissions with laboratory-confirmed
COVID-19 will CDC report for the seven-day period ending 2026-08-15?

The forecast uses five mutually exclusive and exhaustive bins:

| Bin | National weekly admissions |
|---|---:|
| A | below 4,000 |
| B | 4,000 to below 6,000 |
| C | 6,000 to below 9,000 |
| D | 9,000 to below 14,000 |
| E | 14,000 or more |

The headline binary question is **D or E: will admissions be at least 9,000?**

### Definitions

- The outcome is the national (`USA`) count in CDC's harmonized weekly
  respiratory hospital-admissions dataset, using the dataset's COVID-19
  admissions field and week-ending field.
- The value is the row returned by CDC's public data API at **12:00 noon
  America/New_York on 2026-09-30**. This fixed vintage allows normal reporting
  delay while preventing indefinite revision chasing.
- If that query is unavailable, use the first successful query during the next
  seven calendar days. If CDC retires the endpoint, use the corresponding
  archived CDC national weekly-admissions release with the closest retrieval
  date. If CDC has not published the target week by 2026-10-07, cancel rather
  than infer the value from another surveillance signal.
- Endpoint, returned row, retrieval time, and a content hash must be archived
  when the question resolves.

## 2. Sealed independent prior

This prior was written before querying current CDC data, reading current
respiratory surveillance, or running the forecast model. It used only general
knowledge and the already-committed model documentation/data inspected to
understand what the code could forecast.

| Bin | Prior probability |
|---|---:|
| A: below 4,000 | 20% |
| B: 4,000–5,999 | 35% |
| C: 6,000–8,999 | 25% |
| D: 9,000–13,999 | 15% |
| E: 14,000 or more | 5% |

**Prior `P(admissions >= 9,000)`: 20%.**

Unaided continuous judgment:

| Quantile | Admissions |
|---|---:|
| 2.5% | 2,000 |
| 25% | 4,000 |
| 50% | 6,000 |
| 75% | 8,500 |
| 97.5% | 18,000 |

Prior rationale: recent U.S. COVID waves have often risen during summer, but
hospitalization burden has generally declined from the large 2021–22 waves.
The target is far enough into August for a summer rise to matter, while a
five-digit national weekly count should remain possible if the current level
or growth rate is already elevated.

## 3. Research and update ledger

Research, model output, and all subsequent probability changes are recorded
below in chronological order.

Only the initial prior and final forecast are genuine saved forecast states.
The intermediate percentages below were written after the evidence pass and
are therefore a reconstruction of how each bundle changed the judgment. That
is itself a workflow finding: the repository has no forecast ledger that
requires an update to be saved before the next evidence source is opened.

| Stage | New information | `P(admissions >= 9,000)` | Interpretation |
|---|---|---:|---|
| T0 | Sealed prior | 20% | General summer-wave knowledge, before current data |
| T1 | Current admission level and reporting coverage | 2.5% | The target requires about an eightfold increase from a very low base |
| T2 | Calendar reference class, wastewater, state trends, CDC outlook, and CDC ensemble | 2.0% | Summer growth is real, but observed growth and the external ensemble are far below the required trajectory |
| T3 | `tsimulation` model-only result | 1.0% preliminary human judgment | No model residual analog reached 9,000; this cannot justify literal zero |
| T4 | Tail correction and strongest contrary case | **1.5% final** | Restores probability for immune escape, rapid acceleration, measurement change, and known model undercoverage |

### Current level and measurement regime

There are two overlapping CDC products:

1. The complete, potentially revisable operational `mpgq-jmmr` endpoint
   supplies the 2020–2026 history required by the model and had a row through
   2026-07-18.
2. The newer `vdzy-6i9v` product begins on 2026-04-18 and says that published
   values reflect initial reporting and are not revised or backfilled. This is
   the resolution series.

They have the same nominal unit but not identical values:

| Series | Latest available week at origin | Admissions | Hospitals reporting |
|---|---|---:|---:|
| Resolution, fixed-initial | 2026-07-11 | 1,067 | 75.93% |
| Operational, potentially revisable full history | 2026-07-18 | 1,195 | 76.79% |

Across the 13 overlapping weeks, the fixed-initial count averaged **94.40%**
of the operational count. The pilot therefore runs the model on the complete
operational history and multiplies its count-scale output by 0.9440 to map it
to the fixed-initial resolver. The correction is the arithmetic mean of the
13 same-week ratios `fixed-initial / operational`; it translates the model's
estimand but does not coverage-adjust either series. This is a transparent
approximation, not an identified measurement model.

The question's 9,000 threshold is 8.44 times the latest observed resolver count
over five weeks. Using the operational origin and the overlap correction, it is
7.98 times the resolver-equivalent current level over the model's four-week
horizon.

This evidence changed the forecast far more than the simulation. It also
revealed that the bins were poorly designed: they were frozen before checking
the current level and the new resolver's data regime.

Sources:

- [CDC fixed-initial national admission dataset](https://data.cdc.gov/Public-Health-Surveillance/Weekly-Hospital-Respiratory-Admission-Levels-and-R/vdzy-6i9v)
- [CDC complete operational API](https://data.cdc.gov/resource/mpgq-jmmr.json)
- [CDC NHSN hospital respiratory dashboard and reporting context](https://www.cdc.gov/nhsn/psc/hospital-respiratory-dashboard.html)

### Outside view: explicit reference classes

No single reference class is sufficient, so two views were retained.

**Broad calendar reference class.** In the five completed mid-August weeks
from 2021 through 2025, the operational national count was at least 9,000 in
**3/5 cases (60%)** and at least 4,000 in **5/5 cases (100%)**. This reference
class notices that U.S. COVID activity often rises in summer, but ignores the
much lower 2026 starting level and secular changes in severity and reporting.

**Current-level-conditioned analog.** The four-week multiplier from a
mid-July origin to the matching mid-August target was applied to today's
resolver-equivalent level:

| Year | Mid-July origin | Mid-August target | Four-week multiple | Target if applied to 2026 level |
|---|---:|---:|---:|---:|
| 2021 | 25,090 | 85,702 | 3.42× | 3,853 |
| 2022 | 44,759 | 43,392 | 0.97× | 1,094 |
| 2023 | 7,630 | 13,538 | 1.77× | 2,002 |
| 2024 | 6,250 | 7,968 | 1.27× | 1,438 |
| 2025 | 4,623 | 8,183 | 1.77× | 1,997 |

The required 7.98× four-week multiplier occurred in **0/5 analogs (0%)**.
All five level-scaled analogs fall in bin A; even the 2021 Delta-shaped
multiple produces only 3,853. Five cases are too few to infer a zero tail
probability, but this is the more relevant outside view.

### Inside view: forces for and against

Evidence supporting a larger summer wave:

- Admissions have turned upward. The operational series rose from 878 on
  June 20 to 912, 996, 1,111, and 1,195 in the next four weeks.
- The mean CDC site-level SARS-CoV-2 wastewater activity value rose from 1.18
  on June 6 to 1.72 on July 11. Of 826 sites in the latest week, 645 were still
  "Very Low," but 44 were "High" or "Very High."
- CDC's July 14 epidemic-trend snapshot classified 10 states as growing and
  eight as likely growing, versus two declining and one likely declining.
  Twenty-eight were not changing and two were not estimated.
- CDC's summer outlook expects relatively more activity in southern and
  western regions that had less winter transmission. It also identifies a
  moderate immune-escape variant as the principal upside scenario and notes
  that its model did not explicitly represent 2026 World Cup mixing.

Evidence against reaching 9,000 by August 15:

- Recent weekly admission growth is about 8–12%; the threshold requires
  roughly 50% compound weekly growth from the latest resolver observation.
- On July 17 CDC described national activity as very low and only beginning to
  show early increases, mainly in the South.
- The official CovidHub ensemble projected approximately 1,300 admissions
  for July 25, with a 95% interval of 650–2,600. It warns that rapid changes
  remain difficult, but its central path is not close to the threshold path.
- CDC observes declining national hospitalization peaks over time. Its June
  outlook said that without a moderate immune-escape variant, it did not
  expect an increase substantially larger than the preceding winter.
- Hospital reporting coverage is below 80% and has recently fallen. The
  forecast resolves on the reported count, not a coverage-adjusted estimate of
  total U.S. hospitalizations.

Authoritative evidence sources:

- [CDC respiratory data channel, July 17, 2026](https://www.cdc.gov/respiratory-viruses/data/)
- [CDC 2026 COVID-19 Summer Outlook](https://www.cdc.gov/cfa-qualitative-assessments/php/data-research/2026covid-19outlook.html)
- [CDC summer scenario-model methods](https://www.cdc.gov/cfa-qualitative-assessments/php/about/scenario-models-methods.html)
- [CDC COVID-19 ensemble forecasts, July 16, 2026](https://www.cdc.gov/cfa-modeling-and-forecasting/covid19-data-vis/index.html)
- [CDC epidemic-trend dataset](https://data.cdc.gov/Public-Health-Surveillance/CDC-Epidemic-Trends-and-Rt/5dqz-y4ea)
- [CDC wastewater activity dataset](https://data.cdc.gov/Public-Health-Surveillance/CDC-Wastewater-Viral-Activity-Level-for-SARS-CoV-2/atcp-73re)

## 4. Model run

### Method

The adaptive model was run on the complete operational national admissions
series through 2026-07-18. The target is exactly four weeks beyond that origin.
The model combines persistence, a damped local trend, and a 52-week seasonal
analog using recent-error weights. Its uncertainty distribution uses the 104
four-week residuals that were available at the origin. Count outputs were then
multiplied by the 0.9440 cross-endpoint correction.

The forecast code originally rejected any target beyond the observed vector.
That made retrospective scoring possible but made a real forecast impossible.
The outbreak model was narrowly fixed to permit a future target while still
rejecting an origin outside the observed series.

### Model-only result

| Quantity | Resolution-series admissions |
|---|---:|
| Point | 1,398 |
| 2.5th percentile | 627 |
| 25th percentile | 1,047 |
| Median | 1,279 |
| 75th percentile | 1,643 |
| 97.5th percentile | 3,586 |

| Bin | Empirical-residual model probability |
|---|---:|
| A: below 4,000 | 97.1% |
| B: 4,000–5,999 | 1.0% |
| C: 6,000–8,999 | 1.9% |
| D: 9,000–13,999 | 0.0% |
| E: 14,000 or more | 0.0% |

No one of the 104 empirical residual draws reached 9,000; the largest reached
6,266. This means **0/104 model draws**, not that the real-world probability is
zero. The finite residual distribution cannot represent a genuinely novel
variant or a measurement-regime jump.

### Relevant validation

The frozen COVID holdout in the existing report had only 82.2% coverage for
the nominal 95% interval, a reason to distrust the model's tail. On the
subsequent pseudo-holdout from 2025-06-07 through 2026-07-18, which was not
available when the original forecast model was written, the results were:

| Model | WIS | 50% coverage | 95% coverage |
|---|---:|---:|---:|
| Persistence | 0.137 | 52.1% | 97.9% |
| Local trend | 0.152 | 46.6% | 94.5% |
| Adaptive ensemble | **0.128** | 50.0% | 97.5% |

There are 59 target weeks and 236 overlapping origin-horizon forecasts in this
pseudo-holdout. It uses the current historical file rather than archived
weekly vintages, so it does not include real-time revision error. The adaptive
model improves WIS 6.3% relative to persistence in this slice.

## 5. Final human forecast

The final judgment is deliberately wider and more right-tailed than the model.

| Bin | Prior | Model-only | Final human |
|---|---:|---:|---:|
| A: below 4,000 | 20% | 97.1% | **91.0%** |
| B: 4,000–5,999 | 35% | 1.0% | **5.0%** |
| C: 6,000–8,999 | 25% | 1.9% | **2.5%** |
| D: 9,000–13,999 | 15% | 0.0% | **1.0%** |
| E: 14,000 or more | 5% | 0.0% | **0.5%** |

**Final `P(admissions >= 9,000)`: 1.5%.**

Final continuous judgment:

| Quantile | Admissions |
|---|---:|
| 2.5% | 600 |
| 25% | 1,100 |
| 50% | 1,550 |
| 75% | 2,300 |
| 97.5% | 7,000 |

The median is above the model median because current admissions, wastewater,
state epidemic trends, and the external ensemble all point upward. The upper
tail is much wider because the model's empirical residuals truncate novelty
and its older COVID holdout undercovered.

### Strongest contrary case

A moderate immune-escape lineage could already be expanding first in the South
and West. Wastewater and state-level transmission would lead hospitalizations;
falling hospital participation could initially hide the acceleration; World
Cup travel could spread it geographically; and reporting participation could
recover by the target week. The 2021 summer wave demonstrates that several
weeks of very rapid growth are possible.

For that story to reach 9,000 by August 15, however, acceleration must become
far sharper almost immediately. Neither current admissions nor the official
two-week ensemble yet shows that trajectory.

## 6. Cruxes, conditional forecasts, and updates

The most valuable evidence is not another broad article. It is the next two
weekly observations.

### Crux 1: week-ending July 25 admissions

Current judgment assigns about 20% to the fixed-initial count reaching 2,000
for the week ending July 25.

| Condition | Conditional `P(August 15 >= 9,000)` |
|---|---:|
| July 25 admissions at least 2,000 | 5.0% |
| July 25 admissions below 2,000 | 0.6% |

The weighted probability is approximately the 1.5% final forecast. This
observation has the highest near-term value because it directly measures
whether the required acceleration has begun.

### Crux 2: immune-escape lineage

Current judgment assigns about 7% to an authoritative U.S. surveillance source
showing a lineage with evidence of moderate immune escape at 20% or more of
national prevalence by August 1.

| Condition | Conditional `P(August 15 >= 9,000)` |
|---|---:|
| Lineage reaches the criterion | 8.0% |
| Criterion is not reached | 1.0% |

This also averages to approximately 1.5%. It is less immediately observable
than admissions because CDC archived its former wastewater-variant page and
the lag and interpretation of sequencing data are less convenient.

### Update triggers

- If July 25 fixed-initial admissions are below 1,500, reduce the headline
  probability below 1%.
- If they are at least 2,000, raise it to roughly 5%; at least 3,000 would
  justify a substantially larger revision.
- If the August 1 count remains below 2,000, reaching 9,000 two weeks later
  becomes an extreme tail.
- A moderate immune-escape lineage reaching 20% prevalence, a broad rise to
  more than 30 growing/likely-growing states, or another near-doubling in
  wastewater activity should trigger an immediate update.
- A recovery in hospital reporting coverage should be separated from disease
  growth rather than treated as the same signal.
- Any change in CDC endpoint definitions or publication policy should suspend
  updating until the resolver contract is checked.

At resolution, score both the sealed prior and final categorical distribution
with a multiclass Brier score. Also score the continuous quantiles with WIS and
record which data vintage actually resolved the question.

## 7. What the exercise exposed

### Useful

- The rolling model was leakage-safe, deterministic, fast, and already
  probabilistic.
- Historical residuals provided an immediate empirical uncertainty
  distribution instead of an invented standard error.
- Existing WIS, baseline comparisons, horizon-specific results, and holdout
  coverage made it possible to decide how much weight to put on the output.
- The model's seasonal component and recent-error weighting matched the
  short-horizon question better than the mechanistic preparedness SEIR model.
- Strict model input ports caught an unrelated stale call site in
  `outbreak-backtest.ts`: a display-only `name` property was being passed into
  the model. That was a useful fail-fast check and is now fixed.

### Awkward

- `makeForecast` originally required the target observation to exist. It was a
  backtest function advertised as a forecast function. This pilot fixed that
  simulation-level issue.
- The native output is log-count quantiles and an integer target index. The
  analyst had to convert back to counts, map the index to a calendar date,
  retrieve residuals, and manually calculate question-bin probabilities.
- The model cannot ingest wastewater, emergency-department activity, state
  trends, variant prevalence, reporting coverage, or an external ensemble.
  All model-to-judgment synthesis happened outside the code.
- The complete-history and fixed-initial CDC series required an ad hoc overlap
  correction. Units alone could not reveal the different revision semantics.
- Evidence retrieval, reference-class construction, conditionals, and
  probability updates were manual prose and one-off calculations.

### Missing

> Framework follow-up (2026-07-23): the measurement-contract item below is now
> implemented for this model. The operational and fixed-initial CDC procedures
> are separate bindings, and the 0.9440 correction is a versioned measurement
> crosswalk. Immutable snapshot APIs are available, while the forecast ledger
> and future resolution archive remain to be built.

- A resolvable-question object, bin validation, resolver test, and resolution
  archive.
- Separate roles for question design and forecasting. The question designer
  should inspect the resolver and choose informative bins before the
  forecaster seals an independent prior.
- A timestamped forecast/evidence ledger that makes it impossible to read the
  next source without saving the current forecast state.
- Observed reference-class storage with explicit denominators and inclusion
  criteria.
- A measurement contract covering source, vintage, revision policy, reporting
  denominator, transformations, and cross-series bridges.
- Direct categorical probabilities, conditional forecasts, human-model
  aggregation, VOI ranking, and proper scoring at resolution.
- An explicit model-discrepancy or heavy-tail component for events outside the
  historical residual support.

### Dangerous

- **Question-bin degeneracy.** The current level puts nearly all reasonable
  outcomes in the first bin. A simulation cannot recover information that the
  question discarded.
- **Same units, different estimands.** Both CDC endpoints report
  `people/week`, yet their vintage and backfill behavior differs. A unit check
  correctly passes while the forecast target silently changes.
- **Literal zero from finite residuals.** Zero of 104 draws crossing a
  threshold is not a zero real-world probability.
- **Raw counts with changing coverage.** Reporting fell from roughly 90% in
  mid-2025 to roughly 76% at the origin. The outcome is partly a surveillance
  forecast unless coverage is modeled.
- **Pseudo-real-time validation.** Good scores against today's revised history
  can overstate the performance available from contemporaneous vintages.
- **Stale-callsite friction.** Strict ports appropriately rejected an unknown
  property, but the display metadata and model input were intermingled in the
  script. The framework error is safe; the composition UX made the mistake
  easy to create.

Had the question been designed after validating the resolver, a more
informative set of shadow bins would have been approximately `<1,250`,
`1,250–1,749`, `1,750–2,499`, `2,500–3,999`, and `>=4,000`. The official
question remains unchanged.

## 8. Reproduction

The exact national rows used by the pilot are frozen in
`src/simulations/outbreak/pilot-data-2026-07-23.ts`.

Run the pilot and relevant validation:

```bash
node --import tsx scripts/outbreak-forecast-pilot.ts
npx tsc --noEmit
node --import tsx src/simulations/outbreak/probabilistic.test.ts
node --import tsx scripts/outbreak-backtest.ts
```

Refresh the two CDC sources for comparison:

```bash
curl -sS --get 'https://data.cdc.gov/resource/mpgq-jmmr.json' \
  --data-urlencode '$select=weekendingdate,jurisdiction,totalconfc19newadm,totalconfc19newadmperchosprep' \
  --data-urlencode "\$where=jurisdiction='USA'" \
  --data-urlencode '$order=weekendingdate ASC' \
  --data-urlencode '$limit=1000'

curl -sS --get 'https://data.cdc.gov/resource/vdzy-6i9v.json' \
  --data-urlencode "\$where=jurisdiction='USA'" \
  --data-urlencode '$order=weekendingdate ASC' \
  --data-urlencode '$limit=1000'
```

The raw all-jurisdiction API responses retrieved during research had SHA-256
hashes:

- `mpgq-jmmr`: `33439ab045c1fab551231230ed0c1994873f9a4bed3951eec1c2f082401d8f4e`
- `vdzy-6i9v`: `356daaf5130fe12973e62f3b86713b8140523ca7a300d2d58efe6c898decad16`
