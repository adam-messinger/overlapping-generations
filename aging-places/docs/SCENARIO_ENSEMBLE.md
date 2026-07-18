# Scenario ensemble and uncertainty bands (step 4)

## Plan

The mechanism is scenario tooling; this step makes the scenarios explicit instead of publishing
one future. Full 48-run factorial of the 2025-2065 simulation over five documented fragility
axes: net immigration (0.6M / 1.2M / 1.8M per year), gateway-channel rerouting (wGateway 0.05
vs 0.10), climate/insurance repricing of amenity demand (rAmenity 0.25 vs 0.45), secular
institutional enrollment decline (throughput retention 0.985, floor 0.5, vs stable), and
**regime concentration** (concentrationSensitivity 1 vs 0). The concentration axis encodes the
Japan/Italy old-regime lesson (BACKTEST.md §6-8): as national working-age growth turns negative,
allocation shifts from demographic momentum toward institutional hierarchy. The dial reads
*simulated* national working-age growth (fully off at +0.5%/yr or better, fully on at
-0.5%/yr or worse), so it engages earlier and deeper in low-immigration runs — the interaction
is endogenous, not assumed. The mixing rule is unvalidatable on US data by construction (no US
observation exists at those demographic states); that is exactly why it is an ensemble axis and
not a default. Per place: percentile of real log price growth within each run -> band
[min, max], base percentile, per-axis mean absolute percentile shift, dominant axis, signed
`concentrationShift` (mean old-regime minus current-regime percentile), and `scenarioRobust`
(band width <= 0.15). Review notes: bands are **scenario ranges, not probability intervals** —
no distribution over futures is asserted; axis levels are documented judgments, not estimates.

## Results (`outputs/scenario-bands.csv.gz`, `data/scenario-ensemble.json`, 48 runs)

- **88.3% of the 24,525 modeled places are scenario-robust** across all 48 futures (93.5% on
  the earlier 24-run grid — a new axis can only widen bands). The ranked product is mostly not
  a bet on any single assumption.
- **Dominant fragility axis (places >= 10k): immigration (2,584), regime concentration
  (1,142), gateway rerouting (444), amenity repricing (12), institutional decline (2).** The
  concentration axis lands second on its first inclusion: whether US allocation stays
  momentum-driven or turns old-regime is the largest structural unknown after immigration
  itself.
- **The immigration x concentration interaction is confirmed and endogenous**: mean per-place
  concentration effect is 0.0223 under 0.6M immigration, 0.0174 at base, 0.0119 under 1.8M —
  the dial reads simulated working-age growth, so a low-immigration US enters the old regime
  sooner and deeper. Concentration risk and immigration risk compound; they do not diversify.
- **Old-regime winners are institution-heavy, demographically quiet wealthy suburbs currently
  mid-pack on momentum** (concentrationShift up to +0.23: Melville NY, Los Altos, Palo Alto,
  North Tustin, Rancho Palos Verdes, Leawood KS, Northbrook IL, Mercer Island WA). Old-regime
  losers are young, dense, momentum-driven places without institutional anchors (LA's
  southeast corridor: Florence-Graham, Huntington Park, Cudahy, East Los Angeles, -0.07 to
  -0.08; rust-belt satellites: Lemay MO, Conneaut and Piqua OH, Michigan City IN).
- Anchors hold in every future: Evanston, Cambridge, Ann Arbor and the rest of the top-of-zone
  institutional names sit near percentile 0.99 with concentrationShift within +-0.01 — already
  ranked by their institutions, they are indifferent to the regime. The Villages stays in the
  bottom 3% across all 48 runs.
- Institutional decline barely moves relative standing at these levels — university towns'
  rank advantage survives a 40-year enrollment slide because the decline hits their comparators'
  access channels too.

## Use

Join `scenario-bands.csv.gz` to `market-rankings.csv.gz` by geoid: a place is a strong claim
when it is top-of-zone AND scenario-robust; a place whose zone rank depends on one axis
(wide band, single dominant axis) should be read as a conditional bet on that axis.
