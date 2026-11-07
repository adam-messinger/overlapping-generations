---
name: tetlock-ensemble-forecasting
description: Run multi-effort Philip Tetlock / Good Judgment Project probabilistic superforecasting ensembles using parallel domain threads, each staffed with six single-skill agents executing a staged epistemic workflow with Bottom Line Up Front (BLUF) reporting. Use whenever the user asks for a Tetlock forecast, superforecasting analysis, Good Judgment style prediction, multi-agent probabilistic forecast, reference-class and Bayesian ensemble forecast, or calibrated long-horizon scenario probabilities across technology, market, economic, geopolitical, or policy questions.
---

# Tetlock Ensemble Forecasting

Orchestrate a Good Judgment Project (GJP) superforecasting workflow across parallel,
independent domain efforts, where each effort runs six single-purpose agents in a
three-wave DAG before pooling around an **unextremized** raw baseline and delivering
**BLUF** reporting.

This is the repository-local version. It differs from a generic Tetlock skill in two
ways that matter, both of which exploit what this repo already has:

1. **A simulation is available as a conditional-bound instrument** (`scripts/tetlock-sim-adapter.ts`),
   scoped to exactly one agent and governed by a refusal discipline.
2. **Forecasts are sealed, resolved and scored through `packages/forecast-workbench`**,
   so the extremization parameter `d` eventually becomes *estimated from this
   ensemble's own record* instead of a borrowed constant.

## Step 1 - Baseline grounding, scope locks, question clustering (orchestrator)

Before spawning any subagent:

1. Establish current-date baselines from primary sources. Lock **population
   denominators**, **numerators** and **accounting scopes** (geography, constant-year
   vs nominal currency, PPP vs market).
2. Decompose into **4-6 operationalized, resolvable questions** shared identically
   across efforts: binary milestones (1-99%), continuous quantities (P10/P50/P90),
   and 3-4 MECE end-state regimes summing to 100%.
3. **Audit MECE-ness yourself; it is almost never free.** Regime bands written in
   prose routinely overlap and leave gaps. Publish a **lexical priority rule**
   (first match wins) in the shared preamble so all panelists score identically, and
   name which regime became the residual catch-all. A worked example: four regimes
   defined on growth and inflation left `growth 1.8% + inflation 2.8%` matching two
   regimes and `growth 1.5% + inflation 2.3%` matching none.
4. **Audit each question's logic and its named aggregates before any panelist sees it.**
   The canonical six-seat roster has no seat whose job is to read the question, and in
   practice none of the six does it reliably. Check for:
   - **Vacuous clauses.** "Fails to fall by >= 50bp (or rises by >= 25bp)" — the
     disjunct is a strict subset of the first clause and adds nothing. Panelists who
     miss this price a stricter question than the one that resolves.
   - **Composition of named aggregates.** "GDP-weighted OECD-38 core inflation" under a
     PPP lock carries Turkiye at ~4-5% weight with 8-30% core; that alone moved one
     binary question by 10-20 pp in testing. Name the exact published series and its
     weight vector in the preamble.
   - **Resolvability.** Confirm a published series exists at the stated endpoints. A
     conjunct with no resolving data quietly becomes a bet on a resolver's convention.
   If you would rather delegate this, add a resolution-auditor duty to A3 explicitly;
   a run with a dedicated auditor seat found the vacuous clause, and a run without one
   did not.
5. Partition into **K = 4 orthogonal domain efforts** (`4 x 6 = 24` subagents).

## Step 2 - The six single-skill agents and three-wave DAG

Never bundle two cognitive tasks into one prompt.

```
WAVE 1: Independent anchor & evidence discovery        (3 agents/effort)
  A1 Outside-View Reference-Class Historian   pure historical analogs & base rates
  A2 Fermi Structural Decomposer              conditional algebraic/physical bounds  [SIM-ENABLED]
  A3 Inside-View Empirical Signal Scout       current telemetry + verbatim caveats
                 |  orchestrator compiles a per-effort Wave-1 packet
WAVE 2: Parallel updating & stress-testing             (2 agents/effort)
  A4 Bayesian Likelihood-Ratio Updater        anchors on A1+A2, updates on A3
  A5 Premortem & Devil's-Advocate Red-Teamer  attacks the thesis from both tails
                 |  orchestrator compiles a per-effort Wave-1+2 packet
WAVE 3: Effort synthesis & calibration                 (1 agent/effort)
  A6 Dragonfly-Eye Synthesizer & Calibrator   reconciles A4 + A5 + scope
                 |
WAVE 4: Pooling, sensitivity, BLUF  (orchestrator + scripts/tetlock_aggregate.py)
```

Discipline:

- **Frame staging as auditability, never proven accuracy.** Role separation makes
  reasoning inspectable. Never claim it improved Brier scores absent controlled
  same-cutoff ablations against resolved outcomes.
- **Preserve primary-source caveats verbatim** - sample sizes, confidence intervals
  (especially those spanning zero), subgroup limits, selection-bias disclaimers.
- **Trace the true wave-to-wave direction.** Report whether Waves 2-3 *moderated* or
  *amplified* Wave-1 base rates, separately from any extremization.
- **Efforts are orthogonal.** Pass effort `e`'s packets only to effort `e`.

Templates: `references/agent-prompt-templates.md`.

## Step 3 - Simulation access: scoped, and governed by refusal

Running a structural model is **not** a documented GJP practice, and Tetlock's
*Expert Political Judgment* cuts against it: hedgehogs with one grand framework
scored worse than foxes and were most overconfident where most expert. A shared
simulation also makes panelist errors **correlated by construction**, which is the
exact independence assumption extremization relies on.

It is nonetheless legitimate in one role: Fermi decomposition *is* core GJP, and a
simulation is a mechanized Fermi decomposition. So:

- **Only A2 may run the model.** A1 stays a pure base-rate instrument; A3 stays
  empirical; A4/A5/A6 see the model only through A2's packet.
- **A5 is instructed to attack the model's closure**, so the sim is never unchallenged.
- **A2 must publish the model-to-question adapter** and must **refuse an identified
  number where the translation is not identified** - the rule
  `packages/forecast-workbench` already enforces in code.
- **Treat disagreement as the payload.** When the model contradicts a locked prior,
  that tension is the finding. A2 explains it; A2 does not adopt the model's number.
- **Evidence from use.** In a controlled two-run comparison (identical preamble, locks
  and schema; only the roster and A2's sim access changed), all four sim-enabled A2
  seats ran the model, adopted its *identified* outputs (PPP weights, a ratio), rejected
  its *unidentified* ones (growth rates under a contradicting closure), and landed
  *below* the panel centre rather than anchoring on the model. No headline number moved.
  Scoped this way the sim is safe and mildly useful; that result does not license
  widening the grant.

Entry point (read its disclosures before quoting any figure):

```bash
npx tsx scripts/tetlock-sim-adapter.ts --json
```

The adapter self-reports which questions it can and cannot serve. For the
Demographics x AI question set it answers the growth question, gives directional
context only on real rates, and refuses the unemployment, inflation and
market-volatility questions outright, because `src/modules/` contains no
unemployment, no ISIC sectors, no price level and no asset prices.

## Step 4 - Execute the waves

Prefer the **Workflow tool** over ad-hoc subagent spawning: control flow is
deterministic, each agent is schema-validated, and `resumeFromRunId` re-runs only
edited stages. Pipeline the efforts rather than barriering between waves - effort 1
can be in Wave 3 while effort 4 is still in Wave 1.

Require a JSON schema per panelist so no output needs parsing, and force every
panelist to answer **all** questions through its own lens.

## Step 5 - Aggregate

```bash
python3 -I .claude/skills/tetlock-ensemble-forecasting/scripts/tetlock_aggregate.py \
  ./intermediate/forecasts_input.json ./intermediate/ --d-sens 1.35
```

Stdlib-only; writes `aggregate.json`, `aggregate.md`, and three SVG charts.
Reporting rules it enforces:

- **Raw Mean and Median are the headline.** LLM efforts share model priors and
  overlapping corpora, so correlated error violates the independence that aggressive
  extremization assumes.
- **`d = 1.35` is a clearly labelled secondary sensitivity column**, never the lead.
- **The `d = 1.0` log-odds pool is reported separately** from the arithmetic raw
  mean, because they are different estimators - that column tells the reader how
  much of any gap is the pooling rule rather than the extremization.
- **Continuous quantiles are never extremized**; they pool by Vincentization and
  per-quantile median, in their own table and chart.
- **Violations are reported, not silently repaired.** A regime distribution summing
  to 105 is renormalized *and* named.

## Step 6 - Seal and score it (what makes `d` real)

`d = 1.35` is otherwise a borrowed constant. `packages/forecast-workbench` closes
the loop: freeze the resolver contract before forecasting (`preflight`), seal the
checkpoint before evidence reveal, record resolutions against the frozen resolver,
and score with Brier / ranked-probability / logarithmic / weighted-interval / CRPS.
Once questions resolve, re-fit `d` against this ensemble's own record and stop
borrowing. See `references/workbench-wiring.md`.

## Gotchas

- **Never bury the lead.** BLUF first; architecture goes in the audit section.
- **Keep cross-effort independence clean.** No cross-effort leakage before Wave 4.
- **Never strip caveats or conflate denominators.**
- **Don't let the sim quietly become the forecast.** If A6's number equals the
  model's number, something has gone wrong.
- **Model base years and region sets rarely match the brief's locks.** A growth rate
  is invariant to the deflator base; a level is not. Check before quoting.
