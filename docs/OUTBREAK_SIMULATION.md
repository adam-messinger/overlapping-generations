# Outbreak preparedness and forecast simulation

This module now has two deliberately separate jobs:

1. a mechanistic SEIR scenario laboratory for response timing, care capacity,
   and countermeasure rollout; and
2. a rolling probabilistic forecast test that asks whether the short-run signal
   extraction works across several respiratory pathogen families.

Neither is an operational public-health forecast. Run the complete report with:

```bash
node --import tsx scripts/outbreak-backtest.ts
```

## Practice translated into the model

- Latent infections and observations are separate. The mechanistic model has
  exposed/infectious states and distributed reporting/death delays.
- Response speed is explicit. The scenario laboratory includes the WHO 7-1-7
  detect-notify-respond timing target.
- Severity includes care capacity. Outcomes include infections, deaths, and
  peak staffed-bed load rather than cases alone.
- Forecast validation is rolling-origin and baseline-relative. Each 1–4 week
  forecast can use only observations available at that origin.
- Forecasts are probabilistic. Central 50% and 95% intervals are scored using
  weighted interval score (WIS) on `log1p` admissions, matching the broad CDC
  FluSight approach to scale and proper scoring.
- Pathogen results are macro-averaged so the long COVID series cannot overwhelm
  the shorter RSV series merely by contributing more rows.

Primary references:

- [CDC FluSight 2024–25 evaluation](https://www.cdc.gov/flu-forecasting/evaluation/2024-2025-report.html)
- [CDC outbreak response modeling](https://www.cdc.gov/forecast-outbreak-analytics/our-work/outbreak-response-modeling.html)
- [CDC historic national respiratory admissions](https://data.cdc.gov/Public-Health-Surveillance/Weekly-Hospital-Respiratory-Admission-Levels-and-R/vdzy-6i9v)
- [Bracher et al., weighted interval score](https://doi.org/10.1371/journal.pcbi.1008618)
- [WHO Pandemic Influenza Severity Assessment](https://www.who.int/teams/global-influenza-programme/surveillance-and-monitoring/pandemic-influenza-severity-assessment)
- [WHO weekly COVID-19 data and caveats](https://data.who.int/dashboards/covid19/data)

## Mechanistic first-wave backtest (V1 → V2)

The original panel contains frozen WHO weekly reported cases and deaths for the
first reported waves in Italy, the United Kingdom, and the Republic of Korea.
The first 15 weeks are fitted and the remaining 10 are untouched. WHO warns that
detection, definitions, testing, completeness, and reporting delays vary across
place and time.

| Episode | V1 fit | V1 holdout | V2 fit | V2 holdout |
|---|---:|---:|---:|---:|
| Italy | 0.205 | 0.292 | 0.191 | 0.333 |
| United Kingdom | 0.216 | 1.204 | 0.182 | 0.428 |
| Republic of Korea | 0.355 | 0.683 | 0.271 | 0.625 |
| Mean | — | **0.726** | — | **0.462** |

V2 lowers mean holdout error 36.4%, but Italy gets slightly worse. It adds an
exposed compartment, gradual response, distributed delays, continuing
introductions, a reduced-form severity decline, staffed-bed overflow, and an
optional countermeasure rollout. Its fitted ascertainment and IFR are nuisance
observation parameters, not clean epidemiological estimates.

The first V2 draft added calendar-based policy easing. It produced artificial
holdout rebounds, so that mechanism was removed from the fitted first-wave
horizon. This remains an important lesson: a plausible mechanism with an
unidentified calendar can reduce forecast validity.

## Rolling multi-pathogen data

`rolling-data.ts` commits the exact USA rows from CDC's harmonized NHSN weekly
hospital-admissions panel. The snapshot was taken on 2026-07-22 and censored at
2025-05-31:

| Series | Weeks | First included week | Last included week |
|---|---:|---:|---:|
| COVID-19 | 252 | 2020-08-08 | 2025-05-31 |
| Influenza | 252 | 2020-08-08 | 2025-05-31 |
| RSV | 87 | 2023-10-07 | 2025-05-31 |

Blank early RSV cells are missing, not zero. Reported early influenza zeroes are
retained. The final 52 weeks are frozen as the COVID/influenza holdout and the
final 26 weeks as the shorter RSV holdout. Earlier origins form the development
period.

This is **pseudo-real-time**, not a vintage archive. Forecasts cannot see future
weeks, but CDC's current historical file may revise a value after its original
release. A true operational backtest must archive every weekly vintage.

## Forecast models and retrospective (V3)

The models forecast log admissions at horizons 1–4:

- **Persistence:** carry the latest observation forward. Historical errors
  available at the origin generate its quantiles.
- **Local trend:** extrapolate the median of the latest weekly changes with
  damping and a growth cap. This was the first V3 attempt.
- **Adaptive ensemble:** combine persistence, local trend, and a 52-week
  seasonal analog using horizon-specific inverse recent-error weights, then
  shrink halfway toward the local trend. Quantiles come from only its prior
  rolling residuals.

The local trend improved influenza and RSV but was worse than persistence for
the COVID holdout. Residual review showed that one extrapolator cannot handle
both a turning epidemic curve and a recurring seasonal curve. The revision
therefore added the seasonal analog and recent-error weighting while retaining a
conservative trend anchor. No pathogen-specific coefficient is fitted.

### Frozen holdout results

Lower WIS is better. Coverage is empirical coverage of the adaptive model's
nominal intervals.

| Pathogen | Persistence WIS | Local-trend WIS | Adaptive WIS | Adaptive 50% coverage | Adaptive 95% coverage |
|---|---:|---:|---:|---:|---:|
| COVID-19 | 0.176 | 0.185 | **0.172** | 47.6% | 82.2% |
| Influenza | 0.298 | **0.225** | 0.230 | 40.9% | 89.4% |
| RSV | 0.243 | 0.193 | **0.190** | 78.8% | 100.0% |
| Macro mean | 0.239 | 0.201 | **0.197** | 55.8% | 90.5% |

The adaptive model reduces holdout WIS 17.6% versus persistence and 2.0% versus
the initial local trend. It beats persistence for each pathogen, but not every
intermediate model on every pathogen. On the development period, WIS is 0.350,
0.341, and 0.338 respectively, so the revision also improves the data used for
retrospective diagnosis.

| Horizon | Adaptive holdout WIS |
|---|---:|
| 1 week | 0.098 |
| 2 weeks | 0.168 |
| 3 weeks | 0.224 |
| 4 weeks | 0.298 |

The horizon gradient is the clearest operational result: four-week error is
roughly three times one-week error. The 95% interval undercovers overall, driven
especially by COVID (82.2%). Rapid onset and peak reversals remain the hard
case; the model should not advertise nominal 95% uncertainty as calibrated.

## Preparedness scenario

For a hypothetical respiratory pathogen in 10 million people (`R0 = 3`, base
IFR 0.7%), holding response assumptions fixed gives:

| Scenario | Infections | Deaths | Peak staffed-bed load |
|---|---:|---:|---:|
| 7-1-7 response, effective day 15 | 37,719 | 101 | 49 |
| Response effective day 30 | 181,557 | 604 | 364 |
| Response effective day 45 | 793,083 | 3,477 | 2,687 |
| Day-30 response + countermeasure from day 120 | 95,290 | 470 | 364 |

The result is convex: moving effective response from day 30 to day 45 produces
about 4.4 times the infections and 5.8 times the deaths in this scenario because
growth compounds and overload raises severity. This is a scenario comparison,
not a prediction for a named pathogen.

## Data access

No account is required for the committed CDC or WHO data. Updating the public
CDC Socrata snapshot also requires no API key. An account would become relevant
only for a future commercial feed or a platform with archived weekly vintages;
the current implementation has no such dependency.

## Next limitations to attack

1. Archive genuine weekly CDC vintages and score revision/nowcast error.
2. Calibrate intervals or use conformal/ensemble distributions that reach
   nominal coverage at onsets and peaks.
3. Add age/risk groups, care homes, and regional observations.
4. Add non-respiratory families (for example mpox or Ebola); three respiratory
   viruses are not evidence of novel-pathogen generality.
5. Endogenize surveillance, lab/report queues, contact tracing, behavior, and
   economic costs before comparing sustainable response packages.
