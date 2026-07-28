# Sensitivity of headline conclusions to the efficiency dial, γ, and damages

> **July 27, 2026 monetary-circuit rescore:** after replacing “behavioral
> saving + gross lending” with profit-led investment orders, internal firm
> funds, net-new investment credit, and ex-post sectoral saving, the
> regenerated γ×damage grid spans **$454T–$2.005Q**, with the default at
> **$1.967Q**. The associated warming range is **2.59–2.68°C**. The bounded
> profit response was calibrated to keep the previous baseline trajectory
> recognizable and reduces the ±40% service-efficiency sweep from the former
> unstable `$0.50Q–$7.87Q` range to `$1.16Q–$2.77Q`. The causal closure and
> debt composition changed more than the default headline GDP level. The Keen
> energy-essential structural challenger below uses the same circuit and is
> not mixed into this Ayres–Warr γ grid.
>
> **July 22, 2026 composite-DC-capex rescore:** the earlier **$0.8–1.4Q**
> headline band and the July 21 allocator-only figures are superseded. The
> corrected allocator no longer gives clean grids a
> recurring GDP-share bonus or compounds an unchanged climate-damage level as
> a new annual growth penalty. Restoring output to more energy-intensive
> emerging regions strengthens the model's energy→output feedback: baseline
> GDP in 2100 is now **$1.898Q** after explicitly charging chips and
> datacenter facilities to the investment pool. The refreshed γ×damage grid
> spans **$448T–$1.972Q**, and a ±40% sweep around the forward effective
> service-efficiency rate (0.80% → 1.33% → 1.86%/yr) spans roughly
> **$500T → $1.90Q → $7.87Q**. That upper path is an unstable growth-loop
> diagnostic, not a forecast. Absolute late-century GDP must not be reported
> as a calibrated point or as the former narrow band.
>
> **The dominant GDP-level dial remains `serviceEfficiencyGrowth`** (the
> effective service-efficiency rate, coupled at runtime to demand's
> GDP-weighted intensity decline). About one-third is structural change that
> is not independently pinned. The profit-led investment function now bounds
> the former runaway capital feedback, but a ±40% rate sweep still moves 2100
> GDP from about `$1.16Q` to `$2.77Q`.
>
> **A co-equal second dial is `robotIntegrationExponent`** (θ, the
> integration-cost exponent in the endogenous robot deployment rule; default
> 0.75), which now swings GDP 2100 ~1.5× over its plausible range. It replaced the
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
file is the source of truth for all exact grid figures**. It was regenerated
on July 22, 2026 after adding composite datacenter capex. Qualitative summary:

## What is robust across the entire grid

The **energy transition itself moves much less than GDP**. Across γ ∈
[0.08, 0.55] and damages ∈ [DICE-2023, 6× DICE], the 2050 fossil share
stays in a 9.5–13.2% band, electrification 2050 stays at 60.2–60.5%, warming
2100 varies by only
~0.10 °C, and the peak energy burden stays at ~6.7% of GDP. NOTE: after the 2026
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

After the allocator, composite-DC-capex, and accounting corrections, the
γ×damage grid spans **$448T–$1,973T**, with the default cell at $1,899T
(~3.4%/yr over
2025–2100). The mainstream cost-share-γ/default-damage cell is $511T. GDP
levels remain the model's weakest output: restoring regional output changes
energy demand, which the Ayres-Warr loop then amplifies back into output.
This is much wider once `serviceEfficiencyGrowth`, demographics, and the
intensity-decline residual are varied. Treat point GDP values as path
illustrations, not forecasts.

**The damage coefficient matters less than γ, but is no longer negligible.**
At default γ, moving from the default coefficient to ~6× DICE cuts 2100 GDP
from $1.899Q to $1.304Q (~31%); at mainstream γ the reduction is ~12%.
This remains conditional on the endogenous transition holding warming near
2.6 °C. In high-sensitivity/tipping
scenarios where warming runs higher, the damage-coefficient choice becomes
first-order. Damage-side conclusions should always be checked against the
`high-sensitivity` and `climate-cascade` scenarios, not just the baseline.

## Guidance

- Report GDP-level results with γ stated; the γ spread is large and the
  *level* inherits the demand-side calibration (intensity decline, sector
  efficiency multipliers) more than any single elasticity.
- Transition-shape results (shares, timing, capacity mix) may be reported
  without γ caveats.
- The pinning tests in `production.test.ts` and `climate.test.ts` guard the
  *parameter defaults* (γ, α, β, damageCoeff) against silent drift; the
  output figures above are pinned by nothing and must be regenerated with
  the sweep after model changes.

## Structural challenger: Keen’s capital-energy composite

`keenEnergyWeight=1` selects a second production equation inspired by Keen,
Ayres, and Standish (2019). Aggregate useful energy proxies their
capital-utilization composite, with a two-thirds energy exponent and a
one-third labor exponent. The default weight is zero, so the calibrated
Ayres–Warr backcast and baseline remain the governing path.

| Year | Ayres–Warr baseline | Keen shadow on baseline state | Full Keen-feedback path |
|---|---:|---:|---:|
| 2025 | $158.0T | $158.0T | $158.0T |
| 2050 | $337.8T | $317.2T (-6.1%) | $294.2T (-12.9%) |
| 2100 | $1,966.6T | $1,817.9T (-7.6%) | $1,056.8T (-46.3%) |

The gap between the shadow and full-path comparisons measures feedback:
lower challenger output reduces later profit, internal funds, investment,
capital, and energy expansion. By 2100 the Ayres–Warr path needs no net-new
investment credit, while the full Keen path still uses `$32.2T/year` and
carries private debt equal to `135%` of GDP. This is not an error bar or a
probability. The challenger has not been independently calibrated on a
holdout, so carry it as structural uncertainty rather than averaging the
equations. Both equations satisfy the zero-useful-energy limit exactly.

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
| **6** (aggressive) | **13.5** | 580,003 | 0.010 | 2.655 | 1,956 |
| 9 | 17.0 | 572,153 | 0.010 | 2.663 | 1,963 |
| **12 (default)** | **20.3** | 562,860 | 0.010 | 2.676 | 1,967 |
| 18 | 26.7 | 552,517 | 0.017 | 2.707 | 1,982 |
| **24** (high) | **32.9** | 554,401 | **0.031** | 2.781 | 2,026 |

Two honest takeaways:

1. **The floor governs the reported *price*, not the *transition*.** Terminal
   solar LCOE tracks the floor closely (13.5 → 32.9 across the band), but generation,
   GDP, and warming move much less than the price:
   generation varies ~5%, GDP ~4%, and warming ~0.13°C across the sweep.
   Raising the floor grows the residual fossil tail (fossil 2075 rises to
   3.1% at floor 24).
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
costs rise with density is not independently sourced; the default was
originally calibrated so baseline 2100 density landed near the old default
(~540/1,000). The allocator correction raises the untuned default to
~998/1,000 before DC capital was charged; the composite-capex rescore yields
~1,002/1,000 under the monetary-circuit rescore. θ has not been silently refit
to offset any of these corrections.

Sweep (baseline, post-endogenization):

| θ | Robots 2100 (/1,000) | GDP 2100 | Gen 2100 (TWh) | WACC 2075 | Warming 2100 |
|---|---|---|---|---|---|
| 0.6 | 4,126 | 2,551 | 824,453 | 0.094 | 2.71 |
| **0.75 (default)** | **1,002** | **1,967** | 562,860 | 0.086 | 2.68 |
| 0.9 | 350 | 1,713 | 479,575 | 0.083 | 2.66 |

- **GDP 2100 swings ~1.5× across θ ∈ [0.6, 0.9]** — the same leverage the old
  ceiling had, but the dial now has an economic interpretation (integration/
  adjustment-cost curvature) instead of being a bare fleet count, and the
  *near-term* path is pinned independently (IFR pace + the π(2025) ∈ [2, 3.5]
  test). The effect is almost entirely post-2050.
- Two further rule parameters matter: `robotDisplacementShare` (0.55, the
  labour share — LOAD-BEARING, test-pinned: a value near production's fitted
  β would freeze deployment entirely) and `robotDiffusionRate` (0.22, sets
  the near-term pace only).
- **Report late-century GDP as explicitly conditional on θ**; treat automation
  density as a band, not a forecast.

Datacenter demand is no longer GDP-neutral. The demand brake still sets load
through `dataCenterPowerSpendCeiling` (equilibrium load = ceiling × GDP /
LCOE), but the composite chips-plus-facility fleet now has an explicit gross
investment flow:

```
average GW = annual load TWh / 8.76
DC capex = (net load additions + depreciation × prior load)
           / 8.76 × dataCenterCapitalCostPerGW
```

The default `dataCenterCapitalCostPerGW = $15B/average GW` and
`dataCenterDepreciation = 0.15/year` are **JUDGMENT parameters**. They combine
accelerators, servers, networking, cooling/electrical plant, and the building
into one asset; they do not claim that all components have the same life. The
flow is debited from the same investment pool as energy, CDR, and robots.
Leases and SPV financing therefore no longer make the real resource cost
disappear, but their debt ownership and debt-service schedules are not yet
modeled.

Baseline rescore (July 2026): DC capex is about $0.24T in 2025, $0.42T in
2030, $1.87T in 2050, and $12.88T in 2100. Relative to setting the composite
capital cost to zero, GDP is 0.8% lower in 2050 and 5.4% lower in 2100. A
simple cost sweep at the default 15% replacement rate gives GDP 2100 of
$1,949T / $1,898T / $1,799T for $7.5B / $15B / $30B per average GW. Report
late-century output as conditional on these finance assumptions too.
