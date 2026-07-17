# Validation results

This page separates four questions that earlier versions blurred together: held-out-state
classification, local capture within functional markets, transfer across US outcome windows, and
external-regime mechanism evidence from Japan. Machine-readable results are in
`data/validation.json`, `data/market-validation.json`, `data/window-stability.json`, and
`japan/data/development-demography.json`.

## 1. Held-out-state historical classification

### Design

- Historical universe: 5,891 places with population at least 1,000 and ZHVI in June 2000 and June
  2025.
- Outcome: nominal `log(ZHVI_2025 / ZHVI_2000)`; full-sample q75 is 1.2034.
- Validation: five deterministic folds grouped by state.
- Leakage controls: training-only winner cutoff, preprocessing, imputation, and fitting.

Fold means are unweighted, so each geographical partition—not each observation—has equal influence.

| Score | Mean AUC | Fold range |
|---|---:|---:|
| Logistic historical-persistence index | **0.667** | 0.624–0.707 |
| Logistic + state-demeaned ridge | 0.641 | 0.573–0.702 |
| Foreign-born-share baseline | 0.629 | 0.557–0.700 |
| Mechanism scenario | 0.527 | 0.365–0.658 |
| 70% logistic + 30% mechanism | 0.652 | 0.565–0.743 |
| 70% historical composite + 30% mechanism | 0.633 | 0.516–0.738 |

The mechanism does not improve the logistic mean. The ranking files therefore expose the fitted
classifier as a **historical persistence score**, never as a forward resilience forecast, and keep
the mechanism separate.

| Fold | Held-out states | n | Historical composite AUC | Mechanism AUC | 30% mechanism blend |
|---:|---|---:|---:|---:|---:|
| 0 | AK AZ HI KS MD MO NE NH RI TX WA | 810 | 0.610 | 0.472 | 0.587 |
| 1 | CT IL KY MI MN OH OR SC UT | 1,626 | 0.573 | 0.365 | 0.516 |
| 2 | AL AR GA LA NC NY OK WI | 1,214 | 0.631 | 0.559 | 0.647 |
| 3 | CA CO DE MA NJ NV VT WV | 1,196 | 0.702 | 0.658 | 0.738 |
| 4 | DC FL IA ID IN ME PA TN VA | 1,045 | 0.690 | 0.579 | 0.677 |

A deliberately non-deployable random-place diagnostic learns each state's outcome rate from the
training subset and reaches AUC 0.840. That is why the old random-place result near 0.80 was
invalidated: state-level price regimes were present on both sides of the split.

## 2. Continuous and functional-market diagnostics

After restoring the one-sided price-to-income correction, mean held-out-state Spearman with the
state-demeaned outcome is 0.165 for the fitted ridge, 0.182 for the mechanism, and 0.201 for their
30%-mechanism blend. The old 0.287 mechanism figure included the below-fundamental price-reversion
bug and must not be reused.

The product geography is tested separately with USDA 2000 commuting zones. Whole zones are held
out for fitted scores; local metrics require at least five modeled places. The primary table below
uses the exact 1990–2000 lagged-population common sample: 4,499 places in 210 zones.

| Score | Pooled centered Spearman | Equal-zone mean Spearman | Pairwise accuracy |
|---|---:|---:|---:|
| Local ridge, held-out zones | **0.228** | **0.175** | **0.566** |
| Mechanism scenario | 0.209 | 0.097 | 0.536 |
| Historical persistence | 0.130 | 0.023 | 0.509 |
| Foreign-born share | 0.069 | −0.049 | 0.484 |
| Market access | 0.008 | −0.001 | 0.501 |
| Lagged 1990–2000 population trend | −0.081 | −0.059 | 0.479 |

The mechanism beats the lagged-population comparator by 0.156 equal-zone Spearman points; the
4,000-draw zone bootstrap 95% interval is 0.084 to 0.231. The 2020-zone sensitivity is similar
(difference 0.155, interval 0.083 to 0.225). This clears the cheap baseline gate, but the fitted
local ridge remains better and the national historical-persistence score has almost no equal-zone
local rank signal. These are development-window diagnostics, not untouched validation.

## 3. US outcome-window stability

The 2000–2025 outcome is not one stable regime. A fixed-year-2000-covariate diagnostic splits ZHVI
growth into 2000–2012 and 2012–2025:

- raw early-versus-late Spearman is −0.322;
- top-quartile overlap has Jaccard index 0.061;
- the early-window classifier scores AUC 0.672 on its own window but 0.408 on the late window;
- the late-window classifier scores AUC 0.731 on its own window but 0.392 on the early window;
- mean logit-coefficient cosine similarity is −0.222; and
- state-demeaned early-versus-late outcome Spearman is −0.327.

This is not a rolling-origin backtest because 2012 covariates have not yet been assembled. It is
still a strong falsification of naive temporal persistence: the feature relationships that sort
one part of the historical window point largely the other way in the other part. The current
classifier can describe resemblance to the full 2000–2025 winners; it cannot claim coefficient
stability into 2025–2065.

## 4. Corrected raw US mechanism hindcast

Running the corrected 2000 municipal simulation for 25 years gives:

| Universe | Pearson | Spearman | Top-quartile AUC |
|---|---:|---:|---:|
| All 5,891 places | 0.120 | 0.082 | 0.567 |
| Population at least 10,000 (n=2,202) | 0.216 | 0.185 | 0.621 |

Simulated log-growth dispersion is 0.132 versus 0.264 observed. The national mean real-price index
ends at 1.276 and simulated 65+ share at 0.198. These improve on the bugged run but remain scenario
diagnostics; the model is too smooth and omits national credit, rate, insurance, and regulatory
price regimes.

## 5. Japan development-window mechanism audit

`docs/INTERNATIONAL_PANEL.md` was committed before any post-2020 municipal outcome was acquired.
The holdout remains sealed. The current Japan result uses official 2010, 2015, and 2020 censuses,
2020-boundary municipalities, origin-year 10% commuting basins, and newly acquired official
2010/2015 municipal employment and non-Japanese-resident tables. The partial mechanism applies the
unchanged US weights to education, health, public-administration, information/finance/professional
employment, and non-Japanese share. Omitted US constructs contribute zero; observed weights are not
renormalized or fitted to Japanese outcomes. Origin-median imputation follows the frozen protocol,
and the reported comparison sample contains complete origin features.

| Window | Partial mechanism MAE/yr | Demographic-only MAE/yr | Scaled no-migration MAE/yr | Equal-basin Spearman: partial | Lagged population | Partial minus lag, 95% CI |
|---|---:|---:|---:|---:|---:|---:|
| 2010–2015 | **0.00498** | 0.00525 | 0.00680 | **0.791** | 0.756 | +0.035 (−0.019, +0.090) |
| 2015–2020 | **0.00515** | 0.00542 | 0.00684 | **0.766** | 0.735 | +0.032 (−0.025, +0.087) |

On the same municipalities, the partial mechanism exceeds demographic-only allocation by +0.023
equal-basin Spearman in 2010–2015 (95% interval +0.003 to +0.047) and +0.006 in 2015–2020
(−0.018 to +0.030). This is evidence that the added channels carry some development-window signal,
but the preregistered kill comparator is lagged population and both intervals against it still cross
zero. The partial attraction score also trails the lagged trend for household growth, and a full
household mechanism is not yet run. University throughput, resident education, radius access,
vacancy, and land price remain missing. The result therefore **does not pass the
international-validation gate** and is not `japan-model-v1`; the mechanism remains scenario tooling.

## Interpretation

The evidence now supports three deliberately separate outputs:

1. a US historical-persistence screen with modest held-out-state discrimination but failed temporal
   transfer;
2. a mechanism scenario with some local and Japanese demographic-channel signal, not yet a fully
   validated resilience forecast; and
3. a separate valuation/exposure screen.

None establishes causal aging effects, calibrated probabilities, or investable 40-year returns.

## 6. Sealed-holdout adjudication: household primary (opened 2026-07-17)

The 2020-2025 household primary was opened per the deviation log (entries 4-6, committed before
any outcome fetch). Outcome: official R7 preliminary counts with 2020 households rebased to 2025
boundaries (statInfId 000040454825, SHA-256 in `japan/data/holdout-2025.json`). The working-age
primary remains sealed until the age tabulation (announced September 2026). An initial parsing
error (population mis-joined as households from the dbview table) was corrected before any verdict
was recorded; both runs are in git history.

| Score (pop>=10k, 2015 basins, n=1,210) | MAE/yr | Equal-basin mean Spearman |
|---|---:|---:|
| Frozen demographic mechanism allocation | 0.00585 | 0.630 |
| Lagged household trend (kill comparator) | **0.00536** | **0.689** |
| Lagged population trend | — | 0.714 |
| Scaled no-migration | 0.00729 | — |

Differences: mechanism − lagged household = −0.059 (95% CI −0.139..+0.017); mechanism − lagged
population = −0.084 (CI −0.159..−0.014). Sensitivity (pop>=15k): −0.019 (CI −0.115..+0.069).
Gate 1 (beat no-migration on absolute error) **passes**. Gate 3 (beat the lagged household trend
on MAE and Spearman point estimates) **fails** on both.

**Verdict: the mechanism does not earn the international-validation label. It remains scenario
tooling.** The precise reading: origin demographic structure alone reproduces within-basin
household allocation remarkably well in absolute terms (0.63 mean within-basin Spearman with no
outcome-side information beyond the national total), but it adds nothing over simple five-year
persistence — in Japan's highly stable municipal hierarchy, the lagged trend already embeds the
demographic information the mechanism reconstructs. Combined with the development finding that
the extended US channels (university, education, access, affordability, vacancy) *reduce*
transfer, the defensible claim shrinks to: the demographic-regeneration core is a real,
transferable signal; the US-calibrated channel weights are not.
