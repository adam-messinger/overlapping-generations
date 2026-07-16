# Validation results

These results supersede the earlier random-place split and the earlier mechanism hindcast. The
machine-readable record is `data/validation.json`.

## Design

- Historical universe: 5,897 places with population at least 1,000 and ZHVI in 2000 and 2025.
- Outcome: nominal `log(ZHVI_2025 / ZHVI_2000)`; full-sample q75 is 1.203.
- Validation: five deterministic folds grouped by state.
- Leakage controls: training-only winner cutoff, preprocessing statistics, imputation, and fitting.
- Selection: the production headline is the component with the best mean held-out-state AUC.

Fold means are reported with the worst and best fold in parentheses. Fold means are unweighted, so
each geographical partition—not each observation—has equal influence on the summary.

## Held-out-state classification

| Score | Mean AUC | Fold range |
|---|---:|---:|
| Logistic historical-winner index | **0.667** | 0.625–0.708 |
| Logistic + state-demeaned ridge, equal z-score weight | 0.641 | 0.573–0.701 |
| Foreign-born-share baseline | 0.629 | 0.557–0.700 |
| Mechanism scenario | 0.548 | 0.424–0.650 |
| 70% logistic + 30% mechanism | 0.663 | 0.563–0.746 |
| 70% historical-composite + 30% mechanism | 0.645 | 0.508–0.742 |
| 50% mechanism blend | 0.630 | 0.465–0.757 |
| 70% mechanism blend | 0.601 | 0.438–0.731 |

The mechanism does not improve the mean logistic result, and it materially hurts some held-out
state groups. That is why the production ranking no longer blends it into the headline.

For places with population at least 10,000, mean AUC is 0.625 for the historical composite, 0.573
for mechanism, 0.636 for the 30%-mechanism composite blend, and 0.646 for the 30%-mechanism
logistic blend. Fold ranges are wide, so the apparent large-place improvement from a blend is not
stable geographically.

## Fold detail

| Fold | Held-out states | n | Historical composite AUC | Mechanism AUC | 30% mechanism blend |
|---:|---|---:|---:|---:|---:|
| 0 | AK AZ HI KS MD MO NE NH RI TX WA | 810 | 0.609 | 0.444 | 0.565 |
| 1 | CT IL KY MI MN OH OR SC UT | 1,628 | 0.573 | 0.424 | 0.508 |
| 2 | AL AR GA LA NC NY OK WI | 1,217 | 0.631 | 0.650 | 0.712 |
| 3 | CA CO DE MA NJ NV VT WV | 1,196 | 0.701 | 0.628 | 0.742 |
| 4 | DC FL IA ID IN ME PA TN VA | 1,046 | 0.691 | 0.594 | 0.697 |

The geography dependence is substantive. Fold 1 is close to chance for the composite and
mechanism, while folds 3–4 are much stronger. A single national score hides that instability.

## Continuous within-state diagnostics

The ridge model is trained on state-demeaned growth. Mean held-out Spearman correlation with the
state-demeaned outcome is 0.164 for ridge, 0.287 for mechanism, and 0.276 for their 30%-mechanism
blend. The mechanism captures some within-state ordering while failing to rank raw national price
growth; this is useful diagnostic evidence, but not enough to make it the headline.

## Why the old random split looked much better

A deliberately non-deployable diagnostic learns each state's winner rate from a random 70% of
places and assigns that rate to the other 30%. It reaches AUC 0.842 without municipal features.
That demonstrates how easily a random place split can reward shared state-level price shocks. It
does not mean state identity is a usable forecast for a new regime. The previous reported random-
split AUCs around 0.80 therefore cannot be treated as spatially independent validation.

## Raw mechanism hindcast

Running the corrected 2000 municipal simulation for 25 years and comparing its raw national
ranking with observed ZHVI growth gives:

| Universe | Pearson | Spearman | Top-quartile AUC |
|---|---:|---:|---:|
| All 5,897 places | 0.041 | −0.005 | 0.522 |
| Population at least 10,000 (n=2,204) | 0.031 | −0.031 | 0.514 |

The simulated dispersion is 0.166 versus 0.264 observed. The national mean real-price index ends
at 1.541 and the simulated national 65+ share at 0.198. These are scenario diagnostics, not proof
of municipal ranking skill.

## Interpretation

The defensible claim is narrow: year-2000 municipal features contain modest information about
which entirely held-out states' places landed in the national top quartile through 2025. The best
mean AUC is 0.667, only 0.038 above a foreign-born-share baseline, and the fold range is broad.

The output does not establish causal aging mechanisms, calibrated probabilities, or investable
40-year returns. The same data window was used during feature and specification development, so
even grouped cross-validation is development validation rather than a final untouched replication.
