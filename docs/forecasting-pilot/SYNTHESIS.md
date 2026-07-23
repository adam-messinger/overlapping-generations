# Forecasting pilot synthesis

**Forecast vintage:** 2026-07-23
**Original-pilot constraint:** issue simulations could be repaired or adapted,
but the reusable `tsimulation` framework was held fixed.
**Post-pilot status:** the simulation-richness improvements exposed by the
pilot are now implemented and the three forecasts have been rerun.

## What we did

We used the common protocol in [README.md](README.md) on three questions with
very different horizons and model relationships:

1. freeze an objectively resolvable question;
2. seal a numerical prior before targeted research or a fresh model run;
3. construct explicit outside-view reference classes;
4. gather current inside-view evidence and the strongest contrary case;
5. determine what the existing simulation actually represents;
6. run the model, keeping scenario, sensitivity, empirical residual, and
   judgmental uncertainty separate;
7. elicit conditional forecasts and rank high-value future observations;
8. issue a final human probability, precommit scoring, and record workflow
   failures.

The issue reports contain source-by-source evidence, full update ledgers,
resolution rules, conditional forecasts, and reproduction commands:

- [DATA_CENTER_2035.md](DATA_CENTER_2035.md)
- [HORMUZ_2026.md](HORMUZ_2026.md)
- [OUTBREAK_2026.md](OUTBREAK_2026.md)

## Post-hardening rerun

The 2026-07-23 rerun reproduces every published numerical result. That
invariance is intentional: the hardening pass changes validation, lineage, and
interpretation rather than silently changing model equations or analyst
probabilities.

| Output | Regenerated result | Newly enforced interpretation |
|---|---|---|
| Data-center 2035 mixture | `23.1 / 25.6 / 26.1 / 25.2%`; median `15.2%` | BNEF's `194 GW` is total capacity. The model's `159 GW` input is an explicit derivation after subtracting a `35 GW` illustrative base, not the same estimand. |
| Hormuz December question | Partial-reopening path: Yes; prolonged-closure path: No; final human `P(Yes)=39%` | The simulation conditions on oil-volume throughput and supplies no probability over political paths. Oil-volume capacity cannot be connected to all-vessel daily counts without a currently absent empirical crosswalk. |
| Outbreak August 15 bins | `97.1 / 1.0 / 1.9 / 0.0 / 0.0%`; mapped median `1,279` | Revised operational admissions and fixed-initial resolution admissions are distinct measurement regimes. The `0.9440` conversion is a named 13-week measurement crosswalk. |
| Global-to-city bridge | Numerical city paths unchanged | OECD/selected-region GDP per capita is explicitly marked as a proxy for U.S. municipal income growth and house-price drift through two qualitative crosswalks. |

The strict data-center and outbreak model audit covers 66 quantitative
contracts: all 66 carry estimands, the outbreak input carries a source-specific
measurement binding, and no strict semantic path is missing. Hormuz and the
global-to-city bridge additionally expose four named proxy/composition
crosswalks.

## Forecasts

### U.S. data-center electricity share in 2035

| Share of U.S. electricity | Sealed analyst prior | Model-conditioned | Final human |
|---|---:|---:|---:|
| Below 10% | 12% | 23.1% | **18%** |
| 10% to below 15% | 33% | 25.6% | **25%** |
| 15% to below 20% | 33% | 26.1% | **29%** |
| At least 20% | 22% | 25.2% | **28%** |

The independently recorded root prior was `5 / 30 / 37 / 28`; it was already
influenced by the public BNEF 20% claim and is not a clean information-naive
control.

The explicit historical reference class contained only two comparable
national forecast episodes: one overprediction and one underprediction. It was
too small to supply a numerical event rate. The useful outside-view lesson was
that efficiency/economic shocks have broken high forecasts while a new
workload regime has broken low forecasts.

The seeded mixture has a 15.2% median and 7.4%–24.7% 10th–90th percentile
range, but structural-model weights dominate its sampling error. Giving the
EIA model family 0%, 25%, or 50% weight changes `P(share >= 20%)` from 33.2%
to 24.9% to 16.6%. The final judgment gives somewhat more weight than the
adapter to the newer specialized LBNL evidence.

**Substantive call:** rapid growth through 2030 followed by deceleration is
the central path. Twenty percent is a serious possibility, not the base case.
The most useful bridge variables are energized equipment stock, actual
utilization, and realized-versus-requested project load.

### Strait of Hormuz traffic in December 2026

**Question:** will IMF PortWatch total transit calls average at least 62 per
day during December 1–21?

| Object | `P(Yes)` |
|---|---:|
| Sealed analyst prior | 58% |
| Independently sealed root prior | 44% |
| Strict hostile-chokepoint reference rate | 33% (`1/3`) |
| Broader rate including the *Ever Given* obstruction | 50% (`2/4`) |
| Native simulation probability | **Not identified** |
| **Final human forecast** | **39%** |

The current-compatible partial-reopening scenario resolves Yes and the
prolonged-closure scenario resolves No. The model contains no probabilities
over those paths. Applying the 33% or 50% historical rates as path weights
would be a mechanical wrapper, not a model forecast.

The pinned PortWatch snapshot has a 90.0 prewar daily mean, a 10.3
post-closure mean, a best wholly post-closure seven-day average of 33.9, and a
latest seven-day average of 12.1. The June bargain proves that an agreement
and traffic response are possible, but its failure is direct evidence that
signed text is not enough to produce persistent commercial normalization.

**Substantive call:** No is favored, but a durable attack halt by October
would change the forecast sharply. The highest-value bridge signals are a
21-day halt in attacks, a PortWatch seven-day mean reaching 40, and the return
of major carriers.

### U.S. COVID-19 admissions for the week ending August 15, 2026

| Weekly admissions | Sealed analyst prior | Model-conditioned | Final human |
|---|---:|---:|---:|
| Below 4,000 | 20% | 97.1% | **91.0%** |
| 4,000 to below 6,000 | 35% | 1.0% | **5.0%** |
| 6,000 to below 9,000 | 25% | 1.9% | **2.5%** |
| 9,000 to below 14,000 | 15% | 0.0% | **1.0%** |
| At least 14,000 | 5% | 0.0% | **0.5%** |

The independently recorded root prior was `8 / 22 / 34 / 27 / 9`, set before
the latest CDC rows were inspected.

The broad calendar reference class says three of five completed mid-August
weeks had at least 9,000 admissions. That base rate is misleading without the
current level. Applying each year's mid-July-to-mid-August multiplier to
today's resolver-equivalent level puts all five analogues below 4,000; none
produces the roughly eightfold four-week increase needed for 9,000.

After a narrow live-forecast repair, the adaptive model's resolver-mapped
median is 1,279 and its 95% interval is 627–3,586. Zero of 104 empirical
residual draws reached 9,000. The human forecast retains a 1.5% tail above
9,000 because a finite residual history cannot represent a novel
immune-escape lineage, a sudden acceleration, or a measurement-regime jump.

**Substantive call:** the reported count is overwhelmingly likely to remain
below 4,000. The next one or two weekly admissions releases are much more
valuable than additional broad background research.

## How useful was the framework during the original pilot?

| Workflow stage | Data center | Hormuz | Outbreak |
|---|---|---|---|
| Question, resolver, and bins | Manual | Manual | Manual; bins failed preflight |
| Outside view/reference class | Manual | Manual | Manual |
| Conditional simulation | Strong for physical coherence and grid consequences | Strong for market consequences | Directly relevant after repair |
| Independent probability over outcomes | Custom judgmental adapter | Absent | Empirical residuals, but no novelty tail |
| Backtest/calibration evidence | Weak for the target | Same-crisis consequence holdouts | Useful WIS and coverage holdouts |
| External evidence and data vintage | Manual reconciliation | Manual pinned snapshot | Manual two-endpoint crosswalk |
| Conditional cruxes and VOI | Custom script/prose | Prose | Prose |
| Forecast versions, aggregation, and scoring | Prose | Prose | Prose |

The framework was most useful when the target was close to a modeled output
and historical forecast errors existed. It was least useful when the dominant
uncertainty was an exogenous political transition or structural disagreement
between estimands.

## The most important gap: semantic contracts

> Implementation follow-up (2026-07-23): the simulation-richness portion of
> this recommendation is now implemented. Estimands, source-specific
> measurement bindings, semantic and measurement crosswalks, immutable data
> snapshots, semantic lineage, and explicit experiment meanings are described
> in [Semantic measurement contracts](../SEMANTIC_MEASUREMENT_CONTRACTS.md).
> Forecast questions and update ledgers remain separate future work.

The unit system worked. The dominant errors were quantities with compatible
physical units but incompatible meanings:

- **Data center:** server-only versus full-site TWh, and incremental versus
  total electricity.
- **Hormuz:** an oil-volume throughput fraction versus daily counts of all
  vessel types.
- **Outbreak:** revised operational `people/week` versus fixed-initial,
  non-backfilled `people/week`, with changing reporting coverage.

No dimensional checker should reject those pairs; their units really are
compatible. A forecasting system also needs a measurement or estimand contract
covering:

- population/geography and inclusion boundary;
- numerator and denominator;
- aggregation window and calendar convention;
- source field and dataset version;
- release vintage, revision, and backfill policy;
- reporting coverage;
- total versus incremental and stock versus flow;
- transformations and empirically supported crosswalks.

Every adapter between estimands should be explicit, versioned, and carry its
own uncertainty. This is more urgent than adding more unit symbols.

## Other gaps exposed by actual use

### 1. Scenario and probability semantics

During the pilot, `runScenarios`, sweeps, and ensembles executed alternative
inputs but did not know whether inputs were:

- unweighted stress tests;
- sensitivity bounds;
- a forecaster's epistemic distribution;
- frequencies estimated from a reference class; or
- draws from a fitted stochastic process.

That ambiguity is now closed in the core framework. Experiment contracts
distinguish scenarios, stress tests, sensitivity and design-space studies,
aleatory distributions, epistemic beliefs, and mixed uncertainty. Mixed
uncertainty stays nested rather than becoming one false cumulative
distribution. The three pilot scripts still need first-class forecast-question
objects before their analyst probabilities can move fully into the framework.

### 2. Question design and forecast independence

The outbreak question froze bins before the live resolver and reporting regime
were validated. Nearly all credible mass then fell in the bottom bin. The
proper workflow is not simply “look at current data before stating a prior,”
because that destroys an independent prior.

Question authoring and forecasting should be separate roles. A question
preflight should test the resolver, schema, bin exhaustiveness, historical bin
occupancy, cancellation rule, and expected publication date before the
forecaster receives the question. In a solo workflow, that preflight must be
logged as information already seen.

### 3. Immutable forecast and evidence ledger

The reports preserve launch and final forecasts, but many intermediate updates
had to be reconstructed after the research pass. Nothing required a forecast
to be saved before opening the next source.

A useful ledger would make each forecast immutable and timestamp:

- probabilities or quantiles;
- information set and cited evidence IDs;
- base-rate choice and denominator;
- model run IDs and adapter version;
- rationale and strongest contrary case;
- superseding forecast ID.

It should calculate launch, time-weighted, and closing scores rather than
overwriting the old number.

### 4. Model-to-question adapters and discrepancy

Each pilot needed custom code to map model output into resolver-native bins.
The adapter must be first-class but separate from the domain simulation.
It should declare the source estimand, target estimand, crosswalk, uncertainty,
and structural discrepancy.

The outbreak model also showed why empirical residuals are not enough:
`0/104` threshold crossings became a model probability of zero even though
the real tail is not zero. A forecast distribution needs an explicit
heavy-tail or model-discrepancy component, with the human override visible
rather than silently blended.

### 5. Live data and real-time validation

Run manifests can hash data supplied to them, but this exercise still required
manual downloads, external commit pinning, API queries, schema inspection, and
handwritten hashes. The system needs resolver-aware ingestion that archives:

- exact raw response and retrieval time;
- URL/query and content hash;
- schema and revision-policy changes;
- publication lag and missingness;
- the contemporaneous vintage used for every forecast.

Backtests against today's revised history should be labeled separately from
true real-time-vintage backtests.

### 6. Reference classes, conditionals, and collaboration

All inclusion rules, denominators, alternate reference classes, conditional
forecasts, and value-of-information calculations lived outside the framework.
Likewise, the two independently sealed judgments could not be aggregated
without manual work.

These are forecasting-workbench needs, not core equation-solver needs:

- a reference-class record with explicit inclusion/exclusion and censoring;
- conditional trees with internally checked probability coherence;
- bridge-question monitoring and VOI ranking;
- blinded independent forecasts and configurable aggregation;
- proper scoring for binary, categorical, ordered, and continuous targets.

## What worked especially well

- Strict input ports caught a stale display-only `name` field passed into the
  outbreak preparedness model. That is exactly the kind of safe failure we
  want.
- Units made GW, average GW, TWh/year, load factor, daily calls, and weekly
  admissions transformations auditable.
- Development/holdout roles prevented all calibration evidence from being
  described as out of sample. They also revealed the Hormuz fertilizer miss
  and the outbreak model's historical tail undercoverage.
- Seeded execution made the data-center mixture reproducible.
- Scenario execution clearly exposed data-center realization and Hormuz
  reopening as cruxes.
- The outbreak model's WIS, coverage, baselines, and horizon breakdown gave a
  principled reason to use—but not fully trust—its short-range distribution.

## Changes made after the pilot

The original model-specific repairs remain:

- The data-center and Hormuz work added question-specific adapters.
- The outbreak forecast function permits a target beyond the last observed
  value while remaining leakage-safe; its model version is `2.1.0`.
- Historical outbreak residuals are exposed for target-bin mapping, with
  origin validation and leakage tests.
- A stale outbreak-backtest call site was corrected so display metadata is not
  passed as model input.
- The exact CDC rows used by the pilot were frozen in a model-specific data
  file with source hashes documented in the report.

The reusable framework now additionally provides estimand and measurement
contracts, semantic and measurement crosswalks, immutable data snapshots and
transformation lineage, contract hashes in run manifests, and explicit
experiment meanings. Strict representative migrations cover data center,
outbreak, Hormuz-to-global, and global-to-city boundaries. Forecast questions,
reference classes, update ledgers, aggregation, and resolution scoring remain
future forecasting-workbench work.

## Bottom line

The simulations materially improved all three forecasts, but in different
ways:

- they constrained the data-center forecast without resolving the dominant
  structural disagreement;
- they quantified the stakes and scenario consequences at Hormuz without
  estimating the political event probability;
- they produced a useful direct outbreak forecast after a small repair, while
  live data and reporting semantics supplied the largest update.

The framework is now a simulation engine with strong dimensional, semantic,
provenance, and experiment-interpretation primitives. It is still not a full
forecasting workbench. The highest-priority future layer is a resolvable
forecast object and immutable update ledger, followed by reference-class and
conditional-tree records, model-to-target discrepancy, aggregation, and
resolution scoring.
