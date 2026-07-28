# U.S. aging-places 2024 point-in-time refresh

Generated 2026-07-28T20:15:28.385Z. This is a one-shot run; it installs no monitor, timer, or scheduled job.

## What changed

- The committed 2023 forecast and `data/model.json` remain frozen.
- ACS 2009, 2014, 2019, and 2020-2024 payloads were captured with raw-query lineage, release schemas, semantic variable crosswalks, hashes, and 90% margins of error.
- The refreshed forecast uses 2024 ACS, 2024 Gazetteer and IPEDS, and a point-in-time Zillow capture. Its national mechanism assumptions and fitted coefficients are unchanged.
- Snapshot payloads live at `aging-places/data/snapshots/us-2024-20260728T195721Z`; their content-addressed originals live in the forecast-workbench ledger.

## Frozen-model comparison

- Common observed housing markets (population ≥10,000): 3,512
- Historical-persistence rank correlation: 0.985
- Mechanism-score rank correlation: 0.974
- Top-100 overlap: 90/100 (Jaccard 0.818)
- Median absolute rank movement: 75; 90th percentile: 285
- Median absolute 2023-to-2024 ACS population change on exact GEOIDs: 5.37%

Interpretation: aggregate stability and local revisions are separate questions. High rank correlation means the broad ordering survives the vintage update; individual movers and MOE-driven confidence downgrades should not be treated as equally stable.

## Rolling-origin audit

Same-window state-grouped cross-validation:

| Origin → outcome | N | Mean AUC | Mean Spearman |
|---|---:|---:|---:|
| 2009-2014 | 8947 | 0.56 | 0.094 |
| 2014-2019 | 10294 | 0.699 | 0.33 |
| 2019-2024 | 11120 | 0.646 | 0.132 |

Strict temporal transfer:

| Training windows | Test window | N | Model AUC | Model Spearman | Lagged-growth AUC | Lagged-growth Spearman |
|---|---|---:|---:|---:|---:|---:|
| 2009-2014 | 2014-2019 | 10294 | 0.577 | 0.037 | 0.535 | 0.106 |
| 2009-2014, 2014-2019 | 2019-2024 | 11120 | 0.537 | 0.046 | 0.601 | 0.235 |

These are retrospective diagnostics, not untouched forecasts. No inspected coefficient was promoted. The 2024 origin is frozen for a genuinely future score.

## One bounded iteration

Because the full-core model's strict transfer correlations were near zero, one post-hoc iteration tested two simpler specifications:

| Variant | 2014-2019 AUC / Spearman | 2019-2024 AUC / Spearman | Passed promotion rule? |
|---|---:|---:|---:|
| slow-structural | 0.593 / 0.078 | 0.528 / 0.045 | no |
| demography-only | 0.623 / 0.196 | 0.478 / -0.036 | no |

No simplified variant passed the screen; retain the frozen model and narrow its interpretation rather than retuning coefficients.

## Bottom line

The data-layer improvement is real: the broad 2023 ranking is fairly stable under a new release, individual uncertainty is now visible, and every input can be reproduced from sealed evidence. The forecasting claim should become narrower, not stronger. Same-window validation makes the feature set look useful, but the strict temporal tests mostly disagree with the conventional extrapolation that yesterday's cross-city winner profile will identify the next period's winners. For 2019-2024, simple lagged house-price growth beats the transferred structural model. Treat the historical-persistence ranking as descriptive resemblance and the mechanism simulation as a scenario—not a calibrated long-horizon return forecast.

## Main limitations

- Retrospective windows were selected before this run but are not untouched prospective tests.
- Current 2024 place identifiers and coordinates create survivorship and boundary-stability selection.
- Zillow coverage is a selected housing-market subset and is not all Census places.
- ACS estimates overlap within five-year windows and carry sampling error; MOEs are preserved but not used as regression weights.
- National and state house-price shocks are not structural aging effects.
