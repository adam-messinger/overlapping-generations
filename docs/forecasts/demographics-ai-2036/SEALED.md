# Sealed record — Demographics × AI 2036

Both panel runs were sealed into a `forecast-workbench` ledger on 2026-11-04, the
day the panel answered and before any resolving data exists. The ledger is
append-only and hash-chained; the exported audit bundle in
[`sealed-audit/`](sealed-audit/) is the durable copy (the working ledger under
`var/` is git-ignored).

| | |
|---|---|
| Chain head | `sha256:3e1ec9dee841c34cdbb2fc7f86a17eec76a37bd8abcbac205e0753efb0319f84` |
| Ledger events | 274, verified |
| Forecasts sealed | 240 = 2 runs × 24 panelists × 5 questions |
| Pools recorded | 12 = CQ2, CQ5, CQ6 × equal-weight and log-odds × 2 runs |
| Resolutions | 5, all `pending` |
| Code | `src/forecasting/questions/demographics-ai-2036/`, `npm run forecast:demographics-ai-2036-seal` |

## What the workbench refused, and why it matters

- **CQ1 is not sealed.** Its resolver probe fails: no published series reports
  real *median* hourly wages by ISIC section for the OECD-38 at 2025 and 2036
  (Eurostat SES is quadrennial, EU/EFTA-only, last pre-cutoff reference year
  2034; OECD.Stat carries average wages). The workbench will not seal a forecast
  against a question that cannot resolve, so CQ1's 13.8% stays in the report as
  an unscoreable judgment. Rewrite the wage conjunct against a series that exists
  before reusing the question.
- **No continuous pools.** The workbench has no quantile pooling, so CQ3 and CQ4
  are sealed per panelist (P10/P50/P90) but their pooled values live only in the
  report's Vincentized tables. Each panelist's quantiles can still be scored
  individually (weighted-interval score).

## How the simulation is kept separate

Run 2's six Fermi seats consulted `scripts/tetlock-sim-adapter.ts`. The adapter
output they saw is archived at
[`run2-sim-enabled/sim-adapter-output.json`](run2-sim-enabled/sim-adapter-output.json)
and registered as a model forecast with its run manifest pinned to commit
`68c4279`. Re-running the adapter at that commit reproduces the archive exactly;
later commits (the regional curtailment fix, `04bc956`) change the model, so it
is deliberately NOT re-run. Only CQ3 is identified, as six scenario readings
flagged as not a probability distribution; CQ2, CQ4, CQ5 and CQ6 carry the
adapter's refusal. Those six seats are sealed with `modelUse: consulted`, citing
the record; every other seat is `none`, with indirect exposure through wave
packets declared as external information.

## Caveats on the record

- Panelists in waves 2–3 saw their effort's earlier packets. Those packets were
  not workbench evidence records, so the exposure is declared, not gated.
- Questions are frozen with their disclosed defects (CQ5's vacuous disjunct,
  CQ6's lexical-priority lock), because the sealed forecasts answer the
  questions as the panel saw them.
- The 121 dated signposts are not yet registered as workbench triggers.

## Checking it

```bash
npm run forecast -- verify --root=var/forecast-workbench/demographics-ai-2036
```
