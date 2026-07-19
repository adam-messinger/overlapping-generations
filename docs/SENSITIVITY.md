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
grid and regenerates `scripts/gamma-damage-sensitivity.md` — **that generated
file is the source of truth for all exact figures**; numbers quoted below are
illustrative, from the July 2026 run *after* the demand-side corrections
(efficiency-corrected electricity accounting, IEA sector shares, historical
intensity decline, retail pricing), and are not updated automatically when
the model changes. Qualitative summary:

## What is robust across the entire grid

The **energy transition itself barely moves**. Across γ ∈ [0.08, 0.55] and
damages ∈ [DICE-2023, 6× DICE], the 2050 fossil share stays in a narrow band
(13.0–15.3% in the July 2026 run, reaching ~0 by 2075), electrification 2050
is pinned at ~62%, warming 2100 varies by only ~0.03 °C, and the peak energy
burden stays at ~6.7% of GDP.

The fast transition is driven by Wright's-Law solar economics flipping the
competitiveness gate — not by the biophysical production function. Doubting
Ayres-Warr is not a reason to doubt the transition trajectory. (The same
robustness was found when the fossil depletion clock was removed: the
transition survives its assumptions being individually knocked out.)

## What changed with the demand-side corrections

Before the 2026 demand-side fixes, **GDP levels were almost entirely a bet
on γ**: GDP 2100 spanned roughly 5× across the grid (≈$225T–$1,220T), with
the Ayres-Warr default producing an energy-abundance boom (~2.7%/yr growth).
That spread was substantially an accounting artifact — previously-electrified
demand was counted at fuel-scale TWh, inflating useful-energy growth that γ
then amplified into GDP.

After the corrections the grid collapses to **$177T–$227T (~1.3×)**, and
the γ ordering *reverses*: higher γ now gives slightly *lower* GDP, because
useful energy per worker stagnates or declines under realistic final-energy
accounting (efficiency gains shrink final energy as electrification
proceeds), so γ amplifies a mild decline instead of a boom. After the
1990-2025 growth-backcast calibration of the efficiency engine
(`scripts/growth-backcast.md` — the production structure now reproduces
observed 1990-2025 growth, pinned in `production.test.ts`), the default
trajectory is slow growth (~0.7%/yr to 2050, ~0.4%/yr to 2100) — an
energy-and-demographics-constrained deceleration, not an energy-abundance
boom. Absolute GDP levels remain the model's weakest output, but they are
no longer hostage to a single elasticity, and the growth engine is no
longer missing a residual against history: the forward slowdown is
input-driven (S-curve learning deceleration, shrinking final energy,
demographic capital slowdown).

**The damage coefficient still matters little — but only because warming
stays low.** Even 6× DICE damages cut 2100 GDP by only ~15%, because the
model's endogenous transition holds warming near 2.3 °C where any quadratic
is small. This is conditional robustness: in high-sensitivity/tipping
scenarios where warming runs higher, the damage-coefficient choice becomes
first-order. Damage-side conclusions should always be checked against the
`high-sensitivity` and `climate-cascade` scenarios, not just the baseline.

## Guidance

- Report GDP-level results with γ stated; the γ spread is now modest but the
  *level* inherits the demand-side calibration (intensity decline, sector
  efficiency multipliers) more than any single elasticity.
- Transition-shape results (shares, timing, capacity mix) may be reported
  without γ caveats.
- The pinning tests in `production.test.ts` and `climate.test.ts` guard the
  *parameter defaults* (γ, α, β, damageCoeff) against silent drift; the
  output figures above are pinned by nothing and must be regenerated with
  the sweep after model changes.
