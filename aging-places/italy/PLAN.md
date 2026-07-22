# Step 5 plan: Italy external-regime validation

> **Historical execution plan — primary work complete.** Development was frozen and the
> 2019–2024 working-age holdout opened and failed on 2026-07-18. Household and OMI outcomes remain
> secondary work; feature changes now require exploratory labeling or a preregistered v2. See the
> [canonical live status](../data/international-validation-status.json). The original plan below
> is preserved as a pre-outcome record.

Goal: repeat the Japan exercise on Italian comuni. Italy is the complementary regime test:
aging as fast as Japan but with the *lowest* immigration dosage among large rich countries, a
one-winner metro structure (Milan), and a capital that lost value (Rome). If the demographic
core transfers here too, it is not a Japan artifact; if the gateway channel matters in Japan/US
but not Italy, that is exactly the regime-dependence the theory predicts.

## Work items

A. **Preregistration first** (`../docs/ITALY_PANEL.md`): frozen protocol committed before any
   post-2019 outcome file is downloaded. Sealed holdout = 2019-2024 (includes COVID; noted, not
   avoidable, same as Japan's window).
B. **Panel**: annual municipal population by single year of age (Istat demo, 2002-2019 for
   development), harmonized to a frozen boundary vintage via Istat's official variazioni file
   with an aggregate-only audit, as in Japan.
C. **Markets**: 2011 census commuting matrix, identical 10% dominant-flow basin algorithm,
   identical five-place evaluation floor.
D. **Origin features** (frozen US weights, percentile-standardized at origin, zero-contribution
   for unacquired constructs — the Japan pattern): employment shares (education, health, public
   administration, professional/information/finance) from the 2011 industry+institutions
   censuses; foreign-resident share; income per taxpayer (MEF IRPEF); university enrollment
   (USTAT) with radius terms from official comune coordinates; replacement/vitality from ages.
E. **Development windows**: 2005-2012 and 2012-2019, lagged-trend kill comparators 2002-2005 and
   2005-2012. Same metrics: MAE, equal-basin Spearman, 4,000-draw basin bootstrap.
F. **Holdout**: open 2019-2024 working-age outcome only after freezing; households secondary on
   the 2011-2021 census window if annual household data does not exist; OMI prices secondary.
G. Simplify, results in BACKTEST.md §7, merge PR.

## Plan review (revision notes)

- *Reuse, don't fork*: the generic machinery (percentile standardization, conditional
  allocation, evaluateLocal, bootstrap) imports from `japan/src/validation.js` unchanged — one
  implementation, two regimes. Italy gets only fetchers, panel/boundary builders, and configs.
- *Mover rates stay frozen at US values* even though Italian residential mobility is famously
  lower; scaling them to Italian levels would be regime-fitting. The conditional allocation's
  national-total constraint absorbs the level; what is tested is the ranking.
- *Windows use annual data*, not census decades — Italy's annual municipal age series is richer
  than Japan's quinquennial censuses; 7-year windows with true lagged comparators beat two
  census decades.
- *COVID sits in the sealed holdout.* Do not move the window to dodge it; log it.
- *Expect and pre-commit the Italy-specific reads*: gateway channel plausibly weaker (regime
  prediction, recorded before results); "Rome test" reported explicitly (capital comune's
  predicted vs realized within-basin rank).
