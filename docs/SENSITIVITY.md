# Sensitivity of headline conclusions to γ and the damage coefficient

The assumption audit identified the model's two most consequential and least
constrained parameters:

- **γ (useful-energy output elasticity)**, default 0.55 — the Ayres-Warr
  (2009) value, within Kümmel et al. (2010)'s defended 0.40–0.60 range. The
  mainstream counter-position: under cost-share logic, energy's output
  elasticity should approximate its ~5–8% share of GDP, i.e. γ ≈ 0.05–0.08.
  The exergy-economics school explicitly rejects the cost-share theorem;
  this model adopts that heterodox position deliberately.
- **damageCoeff (quadratic climate damages)**, default 0.00536 — the midpoint
  of DICE-2023 (0.003467; Barrage & Nordhaus 2024) and Howard & Sterner
  (2017; 0.007438). The growth-effects literature (Burke, Hsiang & Miguel
  2015; Bilal & Känzig 2024) implies levels several times larger; 0.021
  (~6× DICE-2023) is used as a growth-effects-consistent anchor.

`scripts/gamma-damage-sensitivity.ts` runs the full simulation over the 4×4
grid and regenerates `scripts/gamma-damage-sensitivity.md`. Summary of the
July 2026 run:

## What is robust across the entire grid

The **energy transition itself barely moves**. Across γ ∈ [0.08, 0.55] and
damages ∈ [DICE-2023, 6× DICE]:

- Fossil share of electricity 2050: 3.5–6.7%
- Electrification rate 2050: 81.6–83.2%
- Warming 2100: 1.98–2.13 °C
- Peak energy burden: ~4% of GDP

The fast transition is driven by Wright's-Law solar economics flipping the
competitiveness gate — not by the biophysical production function. Doubting
Ayres-Warr is not a reason to doubt the transition trajectory. (The same
robustness was found when the fossil depletion clock was removed: the
transition survives its assumptions being individually knocked out.)

## What is an artifact of the defaults

**GDP levels are almost entirely a bet on γ.** GDP 2100 spans **$225T to
$1,223T (5.4×)** across the grid, nearly all of it from γ:

| γ | GDP 2100 (default damages) | implied 2025–2100 growth |
|---|---:|---:|
| 0.08 (mainstream) | $243T | ~0.6%/yr |
| 0.25 | $321T | ~0.9%/yr |
| 0.40 | $491T | ~1.5%/yr |
| 0.55 (default) | $1,196T | ~2.7%/yr |

At the mainstream γ, the model produces an SSP2-like world (~$245T in 2100);
at the Ayres-Warr default it produces an energy-abundance boom far above any
SSP marker. Any claim about absolute GDP, per-capita wealth, or the size of
mid-century interest-rate/funding effects inherits this choice. Claims about
*relative* effects (scenario deltas, regional comparisons, timing of the
WACC peak) are much less exposed.

**The damage coefficient matters little — but only because warming stays
low.** Even 6× DICE damages cut 2100 GDP by only 8–20%, because the model's
endogenous transition holds warming near 2 °C where any quadratic is small.
This is conditional robustness: in high-sensitivity/tipping scenarios where
warming runs higher, the damage-coefficient choice becomes first-order.
Damage-side conclusions should always be checked against the
`high-sensitivity` and `climate-cascade` scenarios, not just the baseline.

## Guidance

- Report GDP-level results with γ stated, or bracket them with the γ=0.25
  row as a conservative bound.
- Transition-shape results (shares, timing, capacity mix) may be reported
  without γ caveats.
- The pinning tests in `production.test.ts` and `climate.test.ts` fail if
  the defaults drift from the documented values.
