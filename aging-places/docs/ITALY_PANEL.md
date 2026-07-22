# Italian municipal panel: frozen protocol

> **Document type: frozen preregistration, not live status.** Time-specific statements below
> intentionally preserve what was known when choices were frozen. For opened outcomes and the
> current verdict, use the [canonical status manifest](../data/international-validation-status.json)
> or the [generated status table](../README.md#international-validation-status).

Status: **pre-registered before acquisition of any Italian municipal outcome with reference
year after 2019.** At commit time the repository contains no Istat demographic file, MEF income
file, or OMI price file for reference years 2020-2024. Changes to a frozen choice below must be
recorded in the deviation log before the affected outcome is opened. The methodology mirrors
`INTERNATIONAL_PANEL.md` (Japan); only regime-specific choices are restated here.

## 1. Question and allowed claim

Given origin-year municipal age structure and place characteristics, does the frozen
demographic-attraction mechanism predict where working-age people subsequently concentrate
within Italian commuting basins better than the lagged municipal trend? Italy is the
low-immigration, one-winner-metro regime; Japan was the high-stability regime; the US is the
fitting regime. Passing the holdout gates permits the phrase "externally validated in a second
regime" for the channels that pass; failure leaves the mechanism labeled scenario tooling, as
now. Land/house prices (OMI) are secondary and cannot overturn a primary failure.

## 2. Frozen geography and data

- Unit: comuni harmonized to the boundary vintage in force on 2019-01-01 via Istat's official
  variazioni amministrative file. Aggregation only; unsplittable histories are flagged and
  excluded from the primary common sample. A row-level boundary audit is mandatory.
- Population: Istat annual municipal population by single year of age (reconstructed
  intercensal series where Istat provides it), 2002-2019 for development.
- Functional markets: 2011 census commuting matrix; a comune links to the external comune
  receiving its largest resident-worker flow when that flow is >= 10% of employed residents,
  else self-links; components form basins; five modeled places minimum for local metrics.
- Origin features (all origin-vintage or earlier): 2011 industry + public/non-profit
  institutions censuses (education, health, public-administration, professional/information/
  finance employment shares); foreign-resident share (Istat); IRPEF income per taxpayer (MEF);
  university enrollment by campus comune (USTAT/MUR) with 15/60 km radius terms from official
  comune coordinates; replacement ratio (25-44 / 65+), young-working share, midlife share.

## 3. Frozen windows, models, metrics, gates

- Development windows: 2005-2012 and 2012-2019. Lagged kill comparators: 2002-2005 and
  2005-2012 annualized log working-age (20-64) change.
- Sealed holdout: 2019-2024 working-age change, lag 2012-2019. COVID-19 and its municipal
  mortality/migration shocks fall inside this window; the window is not moved for it.
- Mechanism: identical frozen US weights and construction as the Japan runs (percentile
  standardization at origin; median imputation with reported coverage; conditional allocation
  with the frozen US mover rates and beta; national totals are the only outcome-side input).
  No coefficient, sign, or rate is fitted to Italian outcomes.
- Metrics and uncertainty: MAE per year; equal-basin mean within-basin Spearman on the exact
  lagged-trend common sample; 4,000-draw basin bootstrap.
- Holdout gates (identical in kind to Japan §9): (1) beat scaled no-migration on working-age
  MAE; (2) beat the lagged working-age trend on equal-basin Spearman with a bootstrap 95%
  interval above zero; (3) no sign reversal in the >= 15k-population sensitivity. Households:
  secondary, on the 2011-2021 census window (annual municipal household series is not assumed).
- Pre-committed regime reads (recorded before any result): the foreign-share (gateway) channel
  is predicted weaker than in the US/Japan; the capital-without-dynamism case (Roma) and the
  one-winner case (Milano basin concentration) are reported explicitly whatever they show.

## Deviation log

(entries must precede the affected outcome's acquisition)
1. **2026-07-18 — POSAS 2024 format sample.** A scouting agent downloaded POSAS_2024 for format
   verification concurrent with preregistration; it was quarantined unread as
   raw/italy/SEALED_posas2024.zip and no value from it entered any analysis before freeze.
2. **2026-07-18 — frozen geography = Istat reconstruction vintage.** The intercensal
   reconstruction ships pre-harmonized by Istat to its own (post-2019) comune vintage; that
   vintage is adopted instead of a locally built 2019 crosswalk. 2011 basin codes not present in
   the panel are dropped with counts reported.
3. **2026-07-18 — development mechanism narrowed to the demographic core.** Origin-vintage
   municipal employment (2011 census) and university enrollment (USTAT outage) are not keylessly
   acquirable; the development runs therefore test the demographic core only — the sole channel
   that carried transferable signal in Japan. Gateway/income channels are not tested.
4. **2026-07-18 — development verdict frozen before holdout.** Window 2005-2012: mechanism
   within-basin Spearman 0.596 vs lagged 0.637 (diff -0.041, CI -0.136..+0.056); beats
   no-migration (+0.068, CI +0.013..+0.126). Window 2012-2019: 0.281 vs 0.353 (diff -0.072,
   CI -0.138..-0.004). Named cases: the mechanism ranked Milano 67/93 in its basin (realized #1)
   and Roma 43/45 (realized #7) in 2012-2019. The holdout opens regardless, per protocol.
