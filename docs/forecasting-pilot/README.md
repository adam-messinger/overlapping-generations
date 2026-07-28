# Tsimulation forecasting pilot

**Forecast origin:** 2026-07-23, America/Los_Angeles

The original pilot used the existing simulations as tools in a Tetlock-style
forecasting workflow while deliberately holding the reusable `tsimulation`
framework fixed. That constraint exposed the framework gaps without designing
to an imagined workflow. A post-pilot hardening pass has since implemented
semantic and measurement contracts, explicit crosswalks, data provenance, and
experiment semantics. The forecast questions, sealed priors, and update
ledgers remain historically frozen.

## Why this protocol

There is no single published form titled “Tetlock's exact checklist.” The
sequence below is an operational reconstruction of the practices tested in the
Good Judgment work and subsequent research:

- The Good Judgment tournament work emphasizes probabilistic questions,
  training, feedback, collaboration, and selecting/aggregating skilled
  forecasters. See Mellers et al.,
  [*Identifying and Cultivating Superforecasters*](https://faculty.wharton.upenn.edu/wp-content/uploads/2015/07/2015---superforecasters.pdf).
- Atanasov et al.,
  [*Small Steps to Accuracy*](https://faculty.wharton.upenn.edu/wp-content/uploads/2022/03/1-s2.0-S0749597819300949-main.pdf),
  finds that the best forecasters tend to make frequent, relatively small
  belief updates. The pilot therefore preserves a chronological update ledger
  instead of reporting only the last number.
- The Forecasting Research Institute's
  [conditional-trees study](https://forecastingresearch.org/research/ai-conditional-trees)
  elicits `P(target | indicator)` and `P(target | not indicator)` to identify
  nearer-term questions with high value of information. The pilot applies that
  idea to each long or uncertain target.

The practical workflow also uses the familiar superforecasting disciplines of
starting from an outside view, decomposing the problem, balancing it against
the inside view, expressing uncertainty numerically, seeking the strongest
contrary case, and precommitting to resolution and scoring.

## Common protocol

Each pilot must complete these stages in order:

1. **Decision and question**
   - State the decision the forecast could inform.
   - Define a publicly resolvable question before detailed research.
   - Freeze the close date, outcome bins, named resolver, data-vintage rule,
     cancellation rule, and fallback resolver.
2. **Sealed forecast 0**
   - Record a numerical prior before detailed research or inspecting fresh
     simulation results.
   - State the broad reasoning and acknowledge any information already known.
3. **Outside view**
   - Identify more than one plausible historical reference class.
   - Publish inclusion/exclusion rules, event counts, time period, and the
     limits of analogy.
   - Keep empirical event frequencies separate from model-generated
     frequencies.
4. **Inside view**
   - Decompose the target into causal drivers and forces in both directions.
   - Gather current authoritative evidence, source dates, and release
     schedules.
   - Record other forecasts without silently adopting them.
5. **Simulation**
   - State exactly which question component the existing model represents.
   - Run a naive baseline where possible.
   - Distinguish scenario variation, sensitivity ranges, epistemic input
     distributions, and structural model discrepancy.
   - Do not label an ensemble percentile as a forecast percentile unless the
     input sampler represents beliefs and model error is included.
6. **Cruxes and value of information**
   - Identify a small set of nearer-term, resolvable indicators.
   - Elicit `P(target | crux)` and `P(target | not crux)`.
   - Rank further research by expected movement in the target forecast,
     reducibility, timeliness, and cost.
7. **Final forecast**
   - Report the following separately:
     - observed reference-class rate;
     - sealed pre-research judgment;
     - model-conditioned result;
     - final human judgment.
   - Give a concise rationale, strongest contrary case, update triggers, and
     forecast timestamp.
8. **Resolution and learning plan**
   - Specify the proper score and how it will be calculated.
   - Preserve the full update history.
   - Precommit to a postmortem separating reference-class error, input-belief
     error, structural-model error, missed evidence, and resolution ambiguity.

## Scoring

- Binary and unordered categorical questions use the Brier score.
- Ordered bins should additionally use a ranked probability score.
- Continuous distributions use WIS or CRPS, with empirical interval coverage
  reported separately.
- When updates occur, report launch, time-averaged, and closing scores
  separately so forecast skill is not conflated with entry timing.

## Framework field notes

Each pilot records observations in four categories:

- **Useful now:** existing APIs or model practices that directly helped.
- **Awkward now:** work possible only through ad hoc scripts or manual steps.
- **Missing:** information or behavior that cannot currently be represented.
- **Dangerous:** an existing affordance likely to be misread as forecasting
  evidence.

The synthesis report will distinguish changes needed in individual simulations
from changes that belong in the reusable framework.

Completed results and the cross-model framework audit are in
[SYNTHESIS.md](SYNTHESIS.md).

The first point-in-time live update using the delivered workbench is
[REFRESH_2026-07-28.md](REFRESH_2026-07-28.md). It appends CDC, EIA, Census,
Straits.live, and Polymarket evidence to the three historical pilot ledgers;
it does not install an always-on monitor.

## Independent root priors

These are recorded after question operationalization but before seeing each
issue agent's research, reference classes, simulation result, or forecast.
They are a second judgment, not a clean information-naive control: prior
conversation and the checked-in repository have already exposed the root
forecaster to some headline claims.

### U.S. data-center electricity in 2035

Question frozen 2026-07-23: What percentage of total U.S. electricity
consumption in calendar 2035 will be consumed at data-center sites?

| Outcome | Root prior |
|---|---:|
| Below 10% | 5% |
| 10% to below 15% | 30% |
| 15% to below 20% | 37% |
| At least 20% | 28% |

Broad pre-research rationale: current growth and previously seen upward
industry revisions make a large increase credible, but nine-year construction,
grid, chip, financing, and utilization constraints should produce substantial
attrition from announced capacity. The prior is already influenced by the
previously discussed BNEF 20% headline and therefore is not independent of
that public forecast.

### Strait of Hormuz transit recovery in December 2026

Question frozen 2026-07-23: Will the arithmetic mean of IMF PortWatch daily
`n_total` transit calls for the Strait of Hormuz be at least 62 per UTC day
during 1–21 December 2026?

| Outcome | Root prior |
|---|---:|
| Yes, mean at least 62 | 44% |
| No, mean below 62 | 56% |

Broad pre-research rationale: the checked-in material already indicates that
traffic has remained near closure levels into July, so full or near-full
normalization is far from automatic. Five additional months allow substantial
time for a ceasefire, security guarantees, insurance normalization, or an
escorted reopening, but the threshold requires recovery to persist across most
of a three-week window rather than a brief announcement.

### U.S. COVID-19 admissions for the week ending 2026-08-15

Question frozen 2026-07-23: How many new U.S. hospital admissions with
laboratory-confirmed COVID-19 will CDC report for the seven-day period ending
2026-08-15?

| Outcome | Root prior |
|---|---:|
| Below 4,000 | 8% |
| 4,000–5,999 | 22% |
| 6,000–8,999 | 34% |
| 9,000–13,999 | 27% |
| At least 14,000 | 9% |

Broad pre-research rationale: the May respiratory burden was known to be low,
but U.S. COVID activity has often produced a summer increase. The target is
far enough into August for a current rise to compound but severe-outcome
rates have generally fallen. Before inspecting the latest counts, the
headline probability of at least 9,000 admissions is therefore 36%.
