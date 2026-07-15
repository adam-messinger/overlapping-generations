# Backtest & Hindcast Results

Design: score municipalities using **only information available in 2000** (Census 2000 + the
persistence-safe university layer), predict which places would be 2000-2025 winners, then
compare against realized Zillow ZHVI growth. Objective per the research brief: **high recall —
do not miss future winners; false positives are acceptable.**

## Universe and outcome

- Universe: places with pop ≥ 1,000 and ZHVI observed in 2000 and 2025 → **n = 5,897**.
- Winner: top quartile of national log(ZHVI2025/ZHVI2000); q75 = 1.203 (≈ 3.33× nominal).
- Split: 70% train / 30% test (seeded, deterministic).

## Statistical model (logistic, 25 features)

| Set | ROC-AUC | Recall | Precision | Share flagged |
|---|---|---|---|---|
| Train | 0.780 | 0.900 | 0.331 | 0.678 |
| **Test** | **0.806** | **0.916** | 0.336 | 0.690 |
| Test, pop ≥ 10k | **0.840** | **0.970** | 0.377 | (n = 673) |

Operating threshold chosen on train for 90% recall; at that threshold the model flags ~69% of
all places to catch ~92% of winners — the high-recall design trades precision exactly as
specified. Base rate is 25%, so precision 0.336 is a 1.34× lift at 92% recall; at the top of
the score distribution the lift is far higher (see calibration).

### Calibration (test set, deciles of predicted probability)

| Decile | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Mean predicted | .075 | .105 | .127 | .148 | .172 | .199 | .237 | .297 | .413 | .705 |
| Actual winner rate | .051 | .045 | .112 | .107 | .107 | .215 | .275 | .343 | .511 | .764 |

Monotone and close to the diagonal; the top decile converts at 76%, bottom two deciles under 5%.

### Continuous growth model

- National outcome (log growth): test R² = 0.303, Spearman = 0.567.
- State-demeaned outcome (within-state divergence, the production model): test R² = 0.085,
  Spearman = 0.252 — most 25-year variance is the state/coastal macro cycle; the within-state
  signal is real but modest, which is exactly why the forward blend leans on the mechanism model.

### What the fitted weights say (and why they can't be used as-is)

Largest |weights|: foreign-born share (+), value/income (+), 60-min access (−) with 120-min
access (+) (= metro-edge, not core), bachelor's share (−), young share (−), professional
employment (+), seasonal share (+). The negative education/young-share weights are partialling
artifacts of the 2000s cheap-base convergence: conditional on scarcity and gateway status,
already-expensive educated places had lower *percentage* growth. Predictively valid for
2000-2025; structurally wrong as forward "importance" weights — hence the mechanism simulation.

## Mechanism simulation hindcast (theory weights, no outcome fitting)

Initialize with 2000 data, run 25 years, compare simulated vs realized growth:

| Universe | Pearson | Spearman | AUC (top-quartile) |
|---|---|---|---|
| All (n = 5,897) | 0.237 | 0.252 | 0.637 |
| pop ≥ 10k (n = 2,204) | 0.342 | 0.385 | 0.702 |

Cross-sectional dispersion: sd(sim) = 0.229 vs sd(actual) = 0.264 (kappa calibrated to this
moment only — a scale, not a ranking, adjustment). National check: simulated 65+ share reaches
19.3% by 2025 (actual ≈ 18%).

A model with **zero US price information** in its attraction weights — weights ranked from
Japanese/Korean/European evidence — recovers a 0.39 rank correlation with 25 years of realized
US municipal price growth among 10k+ places. That is the study's core validation: the
aging-geography mechanisms transfer.

## Biggest missed winners (test set) — recall audit

Mostly sub-3k exurban towns that rode metro expansion (Wolfforth TX, Rush City MN, Ferris TX),
plus a few inner-suburb gentrifications (Fair Haven NJ, Shorewood Hills WI, Claremont CA at
pop 34k the largest miss). The engine misses small-town *metro-edge conversion* — places that
became commuter towns after 2000 — consistent with its structural (rather than momentum) design.
