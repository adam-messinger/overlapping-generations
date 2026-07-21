# Sensitivity of headline conclusions to the efficiency dial, γ, and damages

> **The dominant GDP-level dial is `serviceEfficiencyGrowth`** (the effective
> service-efficiency growth rate, coupled at runtime to demand's GDP-weighted
> intensity decline; default 1.29%/yr). It contributes more to GDP growth
> than any single production elasticity, and it is a soft residual — ~1/3 of
> it is "structural change" not independently pinned. Sweeping the effective
> rate 0.77 → 1.29 → 1.81%/yr swings GDP 2100 **$794T → $1,151T → $1,423T**
> (~1.8×). This is a genuine multiple-equilibria exposure: the model supports
> a wide range of self-consistent 2100 GDP worlds selected by a rate that no
> observable pins to better than a few tenths of a pp/yr. **Report GDP 2100
> as a band (~$0.8–1.4Q), not a point.** The 2026 accounting reconciliation
> and the efficiency-series coupling reduced this exposure (it was ~5× before
> the coupling — higher efficiency used to *destroy* GDP through an
> uncoupled η ceiling) but did not remove it: with loop gain ≈ α+γ ≈ 0.8, any
> growth-side residual is amplified ~5× into the level.
>
> **A co-equal second dial is `robotIntegrationExponent`** (θ, the
> integration-cost exponent in the endogenous robot deployment rule; default
> 0.75), which swings GDP 2100 ~1.6× over its plausible range. It replaced the
> old hard `robotSaturation` ceiling: automation is now deploy-while-profitable
> (value vs cost), and θ — a JUDGMENT parameter — sets how fast integration
> costs rise with density (see the θ section below and
> `sources/ai-robotics-deployment-ceilings.md`). The two dials together, not
> `serviceEfficiencyGrowth` alone, set the late-century GDP band.

The γ×damage grid below (a separate, smaller axis) identified two further
consequential, least-constrained parameters:

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
(8.1–10.6% in the July 2026 post-round-2 run, reaching ~0 by 2075),
electrification 2050 is pinned at ~62%, warming 2100 varies by only
~0.04 °C, and the peak energy burden stays at ~6.7% of GDP. NOTE: after the 2026
emissions release valve (signed electrification pressure with reversal
hysteresis) and the rising airborne fraction, the scenario space spans
~1.55C (ssp1-19) to ~3.3C (ssp5-85) — a genuine tail exists. The
gamma x damage grid's narrow band reflects those parameters specifically;
scenario-level warming uncertainty is much wider. The tail still stops
~1.1 °C short of the literature SSP markers (ssp5-85 achieves 3.3 °C vs
the nominal 4.4 °C), so damage stress-tests at literature SSP
temperatures still require climate-sensitivity overrides, not emissions
alone.

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

After the 2026 accounting reconciliation (automation energy as
intermediate consumption; one efficiency series shared between demand's
intensity decline and production's η — see the reconciliation commit and
`scripts/growth-backcast.md`), the γ×damage grid spans **$499T–$1,183T**,
with the default cell at $1,151T (~2.8%/yr to 2050, ~2.6%/yr after). The
earlier "stagnation baseline" (~0.7%/yr) was the net of two opposing
accounting artifacts (automation electricity booked as productive exergy;
intensity decline booked as lost input). GDP levels remain the model's
weakest output — the growth loop amplifies residual dials ~5× (loop gain
α+γ ≈ 0.8) and honest uncertainty spans roughly $499T–$1,183T across the
grid alone, wider still once serviceEfficiencyGrowth (the dominant dial,
top of this doc), demographics, and the intensity-decline residual are
varied. Treat point GDP values as path illustrations, not forecasts.

**The damage coefficient still matters little — but only because warming
stays low.** Even 6× DICE damages cut 2100 GDP by only ~15%, because the
model's endogenous transition holds warming near 2.6 °C where any quadratic
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

## The solar `softFloor`: the terminal clean-energy price dial

Wright's Law is applied only to `cost0 − softFloor`, so by 2100 the learning
term has decayed to ~0 and **the solar `softFloor` ($12/MWh) sets the terminal
solar LCOE almost 1:1.** It is a balance-of-system / soft-cost floor whose level
is *contested and probably biased high* — Farmer et al. (2022) find no empirical
basis for cost floors at all, and the floors IAMs did impose were repeatedly
beaten (see `sources/wrights-law-empirics-and-floors.md`).

Sweep (baseline, battery floor held at 20; the battery floor is **inert** —
10/20/40 give identical outputs):

| solar `softFloor` | Solar LCOE 2100 | Gen 2100 (TWh) | Fossil 2075 | Warming 2100 | GDP 2100 |
|---|---|---|---|---|---|
| **6** (aggressive) | **11.8** | 252,284 | 0.001 | 2.585 | 1,135 |
| 9 | 14.8 | 249,320 | 0.001 | 2.595 | 1,129 |
| **12 (default)** | **18.0** | 250,952 | 0.001 | 2.616 | 1,151 |
| 18 | 24.2 | 241,974 | 0.001 | 2.626 | 1,126 |
| **24** (high) | **30.1** | 244,211 | **0.006** | 2.648 | 1,142 |

Two honest takeaways:

1. **The floor governs the reported *price*, not the *transition*.** Terminal
   solar LCOE tracks the floor 1:1 (11.8 → 30.1 across the band), but generation,
   GDP, and warming barely move — the transition completes below the floor either
   way (fossil ≈ 0 by 2075). Lowering the floor (which the evidence favors)
   barely helps because clean is already dominant; *raising* it grows the
   residual fossil tail (fossil 2075 rises to 0.6% at floor 24) and nudges
   warming up ~0.03°C.
2. **Direction robust, terminal cost soft.** Report the transition shape without
   floor caveats, but treat the *terminal clean-energy price* as a band, biased
   toward the cheaper end. The default $12 is more likely too high than too low.

## `robotIntegrationExponent` (θ): the automation dial, now cost-anchored

The old hard robot ceiling (`robotSaturation` 600/1,000, a speculative
carrying capacity with no fleet forecast behind it) has been replaced by an
**endogenous deploy-while-profitable rule**: robots deploy while
`MV = q × robotDisplacementShare × GDP/worker` exceeds
`MC = (annualized capex + energy) × (N/anchor)^θ`. The economic ceiling —
integration costs rising with density, capital competition via the interest
rate, and energy price — replaces the number. θ (default 0.75) is a
**JUDGMENT parameter** (like `structuralDecayHalfLife`): how fast integration
costs rise with density is not independently sourced; the default is
calibrated so baseline 2100 density lands near the old default (~540/1,000).

Sweep (baseline, post-endogenization):

| θ | Robots 2100 (/1,000) | GDP 2100 | Gen 2100 (TWh) | WACC 2075 | Warming 2100 |
|---|---|---|---|---|---|
| 0.6 | 2,442 | 1,600 | 468,617 | 0.097 | 2.62 |
| **0.75 (default)** | **541** | **1,134** | 272,487 | 0.092 | 2.60 |
| 0.9 | 195 | 988 | 223,247 | 0.090 | 2.59 |

- **GDP 2100 swings ~1.6× across θ ∈ [0.6, 0.9]** — the same leverage the old
  ceiling had, but the dial now has an economic interpretation (integration/
  adjustment-cost curvature) instead of being a bare fleet count, and the
  *near-term* path is pinned independently (IFR pace + the π(2025) ∈ [2, 3.5]
  test). The effect is almost entirely post-2050.
- Two further rule parameters matter: `robotDisplacementShare` (0.55, the
  labour share — LOAD-BEARING, test-pinned: a value near production's fitted
  β would freeze deployment entirely) and `robotDiffusionRate` (0.22, sets
  the near-term pace only).
- **Report late-century GDP as explicitly conditional on θ**; treat automation
  density as a band, not a forecast. (The companion datacenter brake
  `dataCenterPowerSpendCeiling` is GDP-neutral — a pure electricity sink —
  and needs no GDP caveat; it sets the generation/emissions ledger, with
  equilibrium DC load = ceiling × GDP / LCOE.)
