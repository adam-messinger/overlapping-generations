# Wiring the ensemble to `packages/forecast-workbench`

Why bother: without this, `d = 1.35` is a number borrowed from someone else's
calibration study, and the ensemble can never find out whether it was any good.
The workbench is what turns a one-off forecast into a scored record.

Every method below is real; `ForecastWorkbench` is exported from
`packages/forecast-workbench/src/session.ts` via the package index.

## The loop

```ts
import { ForecastWorkbench, runQuestionPreflight, referenceClassRate,
         auditConditionalCoherence, scorePrediction } from 'forecast-workbench';

const wb = new ForecastWorkbench(/* ... */);
await wb.initialize();

// 1. Freeze the contract BEFORE any forecasting.
const q = await wb.registerQuestion(/* ForecastQuestion with OutcomeContract + ResolverContract */);
await wb.recordPreflight(/* runQuestionPreflight({...}) */);

// 2. Wave 1: A1's base rates become an auditable artifact, not prose.
await wb.recordReferenceClass(/* ReferenceClassVersion; referenceClassRate() computes the rate */);

// 3. A2's simulation output is a MODEL forecast, kept separate by construction.
await wb.registerModelForecast(/* model run manifest + the model-to-question adapter */);

// 4. Seal each panelist before any evidence reveal.
await wb.sealForecast({ /* prediction, information set, rationale, strongest contrary case */ });
await wb.revealEvidence({ /* the next update must cite this exposure */ });

// 5. Wave 4 pooling is itself a record.
await wb.recordAggregation(/* AggregationRecord: equal-weight | log-odds | performance-weighted */);

// 6. On resolution, score it.
await wb.recordResolution(/* against the FROZEN resolver */);
await wb.scoreForecast({ /* brier | rankedProbability | logarithmic | weightedInterval | crps */ });
```

## The three things this buys that prose cannot

1. **`registerModelForecast` keeps the simulation out of the judgment pool by
   construction.** The workbench "keeps a model run separate from the
   model-to-question adapter and refuses an identified probability when the
   translation is not identified." That is the Step-3 refusal discipline enforced in
   code rather than by instruction.
2. **`sealForecast` / `revealEvidence` makes blind elicitation checkable.** Wave-1
   independence is currently a property of how prompts were written. Sealed, it
   becomes a property of the record.
3. **`scoreForecast` + `scoreForecastSeries` make `d` estimable.** Fit `d` to
   minimize Brier (or log score) over this ensemble's resolved questions. Until then
   every report must label `d = 1.35` as borrowed.

## Caveats before you build on it

- `aggregation.ts` currently offers `equal-weight`, `log-odds` and
  `performance-weighted`. It has **no Baron-Satopaa `d` parameter and no quantile
  pooling**, which is why `scripts/tetlock_aggregate.py` exists as a separate,
  dependency-free analysis tool. Promoting extremization into `aggregation.ts` is the
  natural next step, and should come with tests mirroring the existing suite.
- `performance-weighted` aggregation **must cite training scores** or validation
  throws - so it is unusable until at least one question set has resolved.
- The workbench is "an operational library and CLI, not a hosted multi-user product"
  (`docs/FORECAST_WORKBENCH.md`). Single-host append lock; plan accordingly.
