# Italian municipal panel: frozen protocol

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
