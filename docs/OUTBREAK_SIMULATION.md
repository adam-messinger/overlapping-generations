# Outbreak preparedness toy model

This is a scenario laboratory for the timing of detection, response, care
capacity, and countermeasure rollout. It is not an operational epidemic
forecast and it is not coupled to the macro simulation yet.

Run it with:

```bash
node --import tsx scripts/outbreak-backtest.ts
```

## What current practice implies

The model design follows a deliberately small subset of current practice:

- Separate latent infections from reported observations. CDC emphasizes that
  early outbreak data often lack a stable case definition or reporting process,
  and that reporting delays can make a growing outbreak appear to slow. Its
  response work uses nowcasts, branching processes, compartmental models, and
  network models according to the decision question.
- Represent the disease clock. V2 includes exposed and infectious states plus
  distributed reporting and death delays. The fixed COVID-19 calibration uses
  a 5.2-day incubation period and 5-day infectious period as coarse first-wave
  biological anchors rather than fitting every biological parameter.
- Make response speed explicit. The generic scenario uses the WHO/7-1-7 target:
  detect within seven days, notify within one, and mount an effective response
  within seven more.
- Assess more than cases. WHO's updated Pandemic Influenza Severity Assessment
  calls for transmissibility, seriousness, morbidity/mortality, and impact on
  healthcare capacity. V2 therefore reports infections, deaths, and peak
  staffed-bed load.
- Freeze holdouts and compare against simple baselines. The first 15 weekly
  observations are fitted and the remaining 10 are untouched. This is still
  much weaker than rolling-origin evaluation across many data vintages.
- Probabilistic forecasts should be scored with a proper score such as weighted
  interval score. This toy model is deterministic, so it reports a composite of
  normalized absolute error, cumulative error, and peak-week error. It should
  gain stochastic parameters and WIS before being used as a forecast system.

Primary references:

- [CDC outbreak response modeling](https://www.cdc.gov/forecast-outbreak-analytics/our-work/outbreak-response-modeling.html)
- [WHO 7-1-7 strategy](https://www.who.int/news/item/05-03-2026-who-tests-a-strategy-game-to-improve-outbreak-response-speed)
- [WHO Pandemic Influenza Severity Assessment](https://www.who.int/teams/global-influenza-programme/surveillance-and-monitoring/pandemic-influenza-severity-assessment)
- [Cori et al. on time-varying reproduction numbers](https://doi.org/10.1093/aje/kwt133)
- [Bracher et al. on weighted interval score](https://doi.org/10.1371/journal.pcbi.1008618)
- [WHO weekly COVID-19 data and caveats](https://data.who.int/dashboards/covid19/data)

## Frozen backtest

The panel contains WHO weekly reported cases and deaths for the first reported
waves in Italy, the United Kingdom, and the Republic of Korea. It was downloaded
on 2026-07-22 and reduced to the exact rows committed in
`src/simulations/outbreak/data.ts`. WHO explicitly warns that detection,
definitions, testing, completeness, and reporting delays differ across places
and time.

The score is dimensionless; lower is better. The split is fixed at week 15.

| Episode | V1 fit | V1 holdout | V2 fit | V2 holdout |
|---|---:|---:|---:|---:|
| Italy | 0.205 | 0.292 | 0.191 | 0.333 |
| United Kingdom | 0.216 | 1.204 | 0.182 | 0.428 |
| Republic of Korea | 0.355 | 0.683 | 0.271 | 0.625 |
| Mean | — | **0.726** | — | **0.462** |

V2 lowers mean holdout error by 36.4%. That result is not uniform: the Italian
holdout is slightly worse. With three episodes, this is evidence that the
revision is useful, not evidence that it generalizes to a novel pathogen.

## V1, retrospective, and V2

V1 is a homogeneous SIR model with one instantaneous contact-reduction step,
fixed case/death delays, and constant ascertainment and fatality. It captures
exponential growth and a policy-induced peak surprisingly well in Italy. It
does poorly when deaths decline faster than cases, particularly in the UK, and
every closed-population run decays toward zero too quickly.

The first V2 draft added calendar-based policy easing. It failed badly: an
arbitrary easing date manufactured large rebound waves in the untouched data
and could make an earlier response look worse. That mechanism was removed from
the fitted first-wave horizon.

The retained V2 adds only mechanisms motivated by residuals and practice:

- an exposed compartment and gradual rather than instantaneous response;
- distributed observation and death delays;
- a bounded continuing-introduction term, which prevents a closed model from
  forcing observed summer incidence to zero;
- a reduced-form decline in first-wave severity, standing in for changing age
  mix, protection of high-risk settings, and clinical learning;
- staffed-bed overflow, and an optional countermeasure rollout.

The V2 severity term is important to the UK improvement and is not identified
cleanly from aggregate cases and deaths. Fitted IFR/ascertainment pairs are
therefore nuisance observation parameters, not epidemiological estimates.

## Initial preparedness experiment

For a hypothetical respiratory pathogen in 10 million people (`R0 = 3`, base
IFR 0.7%), holding the response in place over the simulated horizon gives:

| Scenario | Infections | Deaths | Peak staffed-bed load |
|---|---:|---:|---:|
| 7-1-7 response, effective day 15 | 37,719 | 101 | 49 |
| Response effective day 30 | 181,557 | 604 | 364 |
| Response effective day 45 | 793,083 | 3,477 | 2,687 |
| Day-30 response + countermeasure from day 120 | 95,290 | 470 | 364 |

The central result is convexity: a two-week delay is not two weeks more harm.
At this parameterization, moving from day 30 to day 45 produces about 4.4 times
the infections and 5.8 times the deaths because it also drives more overload.
Rapid response is most valuable as a bridge to countermeasures and care, not as
a claim that restrictions can remain costless forever.

## What still needs work

1. Use archived data vintages, rolling forecast origins, a naive baseline, and
   probabilistic forecasts scored by WIS and coverage.
2. Add age/risk groups and explicit care homes; constant population-average IFR
   is the largest first-wave misspecification.
3. Endogenize surveillance: test sensitivity, lab/report queues, false signals,
   contact tracing capacity, and the actual 7-1-7 sequence.
4. Add spatial importation and contact networks for diseases where homogeneous
   mixing is untenable.
5. Add behavioral and economic costs so the model can compare sustainable
   response packages rather than assume a response can stay in place.
6. Calibrate multiple pathogen families. Three COVID-19 episodes do not test
   measles, influenza, mpox, Ebola, or a genuinely novel pathogen.
