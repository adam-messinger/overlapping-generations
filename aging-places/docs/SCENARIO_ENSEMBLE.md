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

## Results (`outputs/scenario-bands.csv.gz`, `data/scenario-ensemble.json`)

- **93.5% of the 24,525 modeled places are scenario-robust** — their relative standing moves
  less than 15 percentile points across all 24 futures. The ranked product is mostly not a bet
  on any single assumption.
- **Dominant fragility axis (places >= 10k): immigration (3,249), gateway rerouting (872),
  amenity repricing (53), institutional decline (10).** National immigration policy is by far
  the largest single lever over municipal relative standing.
- **The most scenario-fragile places are precisely the gateway suburbs** (band widths 0.38-0.42:
  Diamond Bar, Walnut, Hacienda Heights, Artesia CA; Palisades Park, Little Ferry NJ) —
  quantifying the fragility raised qualitatively in the gateway critique and flagged
  per-place in step 2.
- Anchors hold in every future: Evanston band [0.995, 0.996]; The Villages stays in the bottom
  3% across all 24 runs; Nantucket, Berkeley, Sunny Isles Beach all robust. Maywood is robust
  overall but gateway-sensitive at the margin (min percentile 0.92 under rerouting).
- Institutional decline barely moves relative standing at these levels — university towns'
  rank advantage survives a 40-year enrollment slide because the decline hits their comparators'
  access channels too.

## Use

Join `scenario-bands.csv.gz` to `market-rankings.csv.gz` by geoid: a place is a strong claim
when it is top-of-zone AND scenario-robust; a place whose zone rank depends on one axis
(wide band, single dominant axis) should be read as a conditional bet on that axis.
