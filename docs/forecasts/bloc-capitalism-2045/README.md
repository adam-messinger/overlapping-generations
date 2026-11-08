# Model vs the "Bifurcated Bloc Capitalism" panel: what separates them, and what the evidence says

**Date:** 2026-11-07 &nbsp;|&nbsp; **Panel:** a Tetlock / Good Judgment-style ensemble on 2026-2045,
headline "Bifurcated Bloc Capitalism & Fiscal Repression" (Q6-B 52%) &nbsp;|&nbsp;
**Model:** `main` at 865140e (after #117, #119, #121, #122)
&nbsp;|&nbsp; **Reproduce:** `npx tsx scripts/bloc-capitalism-comparison.ts` (output: `comparison-output.md`)

## Bottom line

1. **Nearly every disagreement traces back to growth.** The model's world GDP grows 3.9%/yr and
   OECD+China GDP per person 3.9%/yr. The panel has 1.6%/yr per person. Rates, debt, repression
   and the 2045 regime all follow from that gap. The two exceptions are the world-vs-advanced-economy
   debt problem (finding 3) and labour share (finding 5).
2. **The model's growth is above every published reference, and the evidence for its key
   parameter does not hold up.**
   - The 1990-2025 backcast was the main support for an energy weight of γ = 0.55. It rejected the
     mainstream weight only because its sweep cut γ without giving the weight to anything else
     (0.25 + 0.15 + 0.08 = 0.48, so returns to scale were sharply decreasing).
   - With weights summing to 1, history fits every γ from 0 to 0.7 within 0.25pp/yr, and γ = 0 fits
     best.
   - The identified literature points to γ ≈ 0.05-0.2.
3. **Even with a mainstream weight, the model stays above consensus.** At γ = 0.1 with constant
   returns, OECD+China per-person growth is 2.7%/yr. That is above the SSP2 middle-of-the-road
   path (2.0%) and between the panel (1.6%) and SSP5 (2.8%). The remaining gap comes from the
   model's efficiency growth, which acts as total factor productivity, and from how world growth
   is split into regions. Both can be tested inside the repo.
4. **On debt, the model is wrong for a separate reason.** It divides world public debt by world
   GDP at purchasing-power parity, which grows ~3.7%/yr and is led by emerging markets. That puts
   the rate minus growth (r−g) at about −2.5pp, so debt falls to 2031 while the IMF projects a rise
   from 93.9% to 102.3%. Most public debt sits in economies growing about 2%.
5. **Where the panel looks weaker:**
   - Its growth (1.6%) is below SSP2 and IMF medium-term rates.
   - Its 147% advanced-economy debt in 2045 is on the high side of an IMF/CBO extrapolation
     (~130-140%, unverified).
   - Its labour-share signpost uses an out-of-date starting point (54.4%; BLS now shows 53.0%).

**Verdict for now:** on growth, debt and the repression mechanism, the evidence favours the
panel's side of the 2045 regime question over the model's. It does not favour the panel's exact
numbers. The most likely world is in between: OECD+China growth of roughly 1.8-2.5%/yr per
person, debt rising, and repression arriving as soft measures, not a 150%-of-GDP trigger.

## Follow-up: fixes applied (2026-11-08)

The user asked for the debt term, the debt accounting and the efficiency/growth term to be
fixed. Commits on this branch, one change each:

1. **Debt term** (`safeRateDebtSensitivity`): 6.5bp -> **3.5bp** per pp of debt/GDP
   (Dallas Fed WP 2513 3.47bp incl. term premium; Laubach 2009 3-4bp).
2. **Debt accounting:** public debt is measured against **GDP at market exchange rates**
   (each region's PPP GDP x its 2025 market/PPP price ratio, IMF WEO Oct 2026;
   `scripts/imf-fiscal-regions.py`), and the 2025 anchor moves **90% -> 94%** (IMF).
3. **Growth:** the efficiency term itself is unchanged. Of the options tested (moving device
   efficiency into useful work broke the 1990-2025 backcast by 12%; refitting a residual
   restored the hot path), the one chosen was **constant-returns factor weights
   0.25/0.55/0.20** (energy 0.55 -> 0.20), after fixing the backcast sweep that had held
   beta fixed (T1).
4. A test file (`capital-finance.test.ts`) never reported failures; fixed.

Where the default now stands (`comparison-output.md` is regenerated):

| | Before | After | Reference |
|---|---|---|---|
| World growth 2026 | 3.74% | 3.47% | IMF Oct-2026: 3.1% |
| World growth 2026-45 | 3.86%/yr | 3.14%/yr | SSP2 2.67, SSP5 3.56 |
| OECD+China per capita | 3.93%/yr | 2.95%/yr | panel 1.60; SSP2 2.04, SSP5 2.79 |
| US per capita | 3.39%/yr | 2.69%/yr | panel 1.75; CBO ~1.3-1.55 |
| r* 2036-45 | 1.57% | 1.06% | panel 1.18%; HLW US 1.01% (2026Q2) |
| World public debt 2031 | 88.6% | 94.1% | IMF 101.5% |
| World public debt 2045 | 93% | 102% | panel (AE) 147% |
| Warming 2100 | 3.55°C | 3.26°C | — |

Still open: per-capita growth stays above SSP5 for the OECD+China bloc and well above
CBO for the US. The remaining gap is the efficiency series (1.29%/yr acting as TFP) and the
regional split (US growth tied to world growth); T3, the regional backcast, is the test.
Debt still runs ~7pp under the IMF by 2031: market-weighted growth in the model (~3.3%) is
above the IMF's 2.5-2.8% for the same reason.

## The disagreements and what resolves each

| # | Difference | Model (default) | Panel | External evidence | Leans to | Confidence | Resolved by |
|---|---|---|---|---|---|---|---|
| 1 | Growth: OECD+China GDP per person 2026-45 | 3.93%/yr | 1.60 | SSP2 2.04, SSP5 2.79; best G7 20-yr 3.65% (1950-70), last 20 yrs 1.07% | Panel's direction | High | Findings 1-2; regional backcast (T3) |
| 1a | US GDP per person | 3.39%/yr; US growth 4.1% in 2045 | 1.75 | SSP 0.75-1.63; CBO ~1.3-1.55; best US 20-yr record 2.77% (1949-69) | Panel | High | T3, T4 |
| 1b | Near-term check: 2026 growth | world 3.74%, US 3.24% | — | IMF Oct-2026: world 3.1%, US 2.3%; BEA Q1-Q3 +2.3% y/y | Against the model already | High | T4, every year |
| 2 | Energy weight γ (root of 1) | 0.55, near-AK forward | implicitly ~cost share | Backcast does not identify it (finding 1); Bruns-Gross-Stern 2014 meta: robust causality runs output → energy; supply shocks hit 1-3× the cost share short-run but fade (Känzig 2021; Germany 2022) | Low γ (0.05-0.3) | Medium-high | T1, T2, E1 |
| 3 | Electrification pace | electricity demand +5.2%/yr; 38% of final energy by 2045 | not central | IEA STEPS +2.9%/yr, ~30% by 2045; NZE ~48%; world history +0.25pp/yr | Model too fast | High | T6 (matters for emissions, not growth: finding 2) |
| 4 | r* 2036-45 | 1.57% (world) | 1.18% (G7) | HLW US 1.01%, euro area 0.09%, Fed longer-run real ~1.2% | Panel | Medium | Falls to 1.23% at γ = 0.1; T5 |
| 4a | Debt effect on r* | 6.5bp per pp (merged today, #122) | ~1bp (Dallas Fed WP 2513) | Dallas Fed: 1.0bp to the short real rate, 2.4bp to the term premium; Laubach 3-4bp; IMF 0.2-0.4bp | Lower than 6.5 | Medium-high | T5 |
| 4b | Growth pass-through to r* (c) | 1 | weak | ~1 inside r* models (HLW, LW); weak in long-run data (Hamilton et al. 2016, Lunsford-West 2019) | Contested | Low | Keep, flag in SENSITIVITY |
| 5 | Public debt | world 90% → 89% (2031) → 93% (2045) | AE 110% → 147% | IMF FM Apr-2026: world 93.9% → 102.3% (2031); AE 108 → 115; AE ex-US flat | Panel's direction | High | Finding 3; T7 |
| 6 | Financial repression | only above 150% world debt | 59.5% | No formal YCC in the G7; soft steps under way (bill-heavy issuance, eSLR relief, smallest long JGB and gilt issuance in decades) | Panel, on a soft definition | Medium | Define the question (E3) |
| 7 | Labour share | 65.4% → 64.4% | AI compresses it; signpost < 52.5% by 2030 | US nonfarm 53.0% (2026Q3, record low); ILO world -0.6pp/decade; no causal AI evidence yet | Mixed; signpost likely trips | Low-medium | E3 signposts |
| 8 | US+China share of world GDP (market FX) | 36% flat (PPP) | 43 → >50% | — | Out of scope: no exchange rates | — | — |
| 9 | Trade elasticity | — | 0.85x | — | Out of scope: no trade block | — | — |

## Findings

### Finding 1: the backcast does not identify the energy weight

`scripts/growth-backcast.ts` sweeps γ but keeps capital at 0.25 and labour at 0.15. Its "γ = 0.08"
run therefore has weights summing to 0.48, and the 0.82pp/yr miss is decreasing returns to scale,
not evidence about energy. The 1990-2025 backcast below holds the sum at 1 (section 5 of the
script):

| α / β / γ | Sum | Model CAGR | Observed | RMS log error |
|---|---|---|---|---|
| 0.25 / 0.15 / 0.08 (as shipped) | 0.48 | 2.65 | 3.49 | 0.142 |
| 0.25 / 0.15 / 0.55 (default) | 0.95 | 3.51 | 3.49 | 0.034 |
| 0.25 / 0.75 / 0 | 1.00 | 3.40 | 3.49 | **0.026** |
| 0.25 / 0.65 / 0.1 | 1.00 | 3.43 | 3.49 | 0.030 |
| 0.25 / 0.45 / 0.3 | 1.00 | 3.50 | 3.49 | 0.037 |
| 0.25 / 0.20 / 0.55 | 1.00 | 3.59 | 3.49 | 0.049 |

The reason: over 1990-2025, effective labour (~1.5%/yr) and useful exergy (~1.8%/yr) grew at
almost the same rate, so history cannot split weight between them. Forward they diverge (labour
~0.4%/yr, useful energy ~2.9%/yr), and that split is exactly what drives the forecast.
`scripts/growth-backcast.md` currently says "History rejects cost-share γ≈0.08"; that claim needs
correcting.

A second problem is the closed loop. Forward, energy demand follows GDP (GDP × intensity), and
capital follows saving. Growth then behaves roughly like g ≈ (β·g_L + (1−γ)·d) / (1−α−γ), and at
the defaults the denominator is 0.20. That is close to an AK economy: any push from efficiency is
amplified about 5×. The backcast drove production with *observed* energy, so this loop was never
tested. Bruns, Gross & Stern (2014) find that the robust causality runs from output to energy,
which is the direction that makes a co-movement fit overstate γ. The identified evidence:
- Energy supply shocks cost 1-3× the cost share in the short run (Känzig 2021; Baqaee & Farhi
  2019; South African load-shedding).
- The effect fades as firms adapt (Germany 2022: gas use −20%, GDP about +2%; Kilian 2008).

That is consistent with γ ≈ 0.05-0.2 over a 20-year horizon. Full sources:
`evidence-energy-growth.md`.

### Finding 2: what drives the model's growth (and what does not)

- **Electrification is not the driver.** Freezing it at its 2025 shares moves 2026-45 world growth
  only from 3.86 to 3.82%/yr. Electrification matters for emissions and temperature (3.55 → 3.92°C
  in 2100 when frozen), not for this comparison.
- **The factor weights are the driver.** With constant returns:

| α / β / γ | World 2026 | US 2026 | World 2026-45 | OECD+China /cap | US /cap | r* 2036-45 | Debt 2045 |
|---|---|---|---|---|---|---|---|
| 0.25 / 0.15 / 0.55 (default) | 3.74 | 3.24 | 3.86 | 3.93 | 3.39 | 1.57 | 93% |
| 0.25 / 0.45 / 0.30 | 3.55 | 3.10 | 3.31 | 3.19 | 2.86 | 1.35 | 98% |
| 0.25 / 0.55 / 0.20 | 3.47 | 3.03 | 3.13 | 2.94 | 2.68 | 1.28 | 100% |
| 0.25 / 0.65 / 0.10 | 3.39 | 2.97 | 2.98 | 2.72 | 2.53 | 1.23 | 101% |
| *IMF 2026 / SSP2 / panel* | *3.1* | *2.3* | *SSP2 2.67* | *SSP2 2.04 / panel 1.60* | *CBO ~1.4 / panel 1.75* | *panel 1.18* | *IMF world 102% in 2031* |

**Correction to the first comparison:** the earlier "mainstream weight 0.08" run, which nearly
matched the panel's US growth (1.79%), dropped returns to scale (sum 0.48). The same is true of the
forward grid's "best match" (γ = 0.08, which was then used to support the 6.5bp debt term). With
constant returns, a mainstream γ gives US 2.5% per person, not 1.8%.

**The remaining ~1pp gap at γ = 0.1** has two candidate sources:
- **The efficiency series (1.34%/yr), which acts as TFP.** Mainstream TFP estimates are ~0.5-1.0%/yr.
- **The regional split.** Regions grow at world growth adjusted by relative factors. The US runs
  only ~0.5pp below world growth (historically ~1pp), and its share of world GDP falls only 0.8pp
  in 20 years.

The model is already off in 2026: world 3.74% against IMF 3.1%, and US 3.24% against an actual ~2.3%.

### Finding 3: debt is mis-aggregated, independent of growth

The primary deficit matches the IMF's (~2.0% of GDP in 2026). The difference is r−g: the model
uses world PPP growth (~3.7%), while debt sits in economies growing ~2%. Weighting growth by debt
(US, Japan and the euro area hold most of it) gives r−g of about −1.2pp, not −2.5pp. That adds
roughly +1.2pp of debt/GDP a year, enough to close most of the gap with the IMF's +8.4pp over
2025-31. The model also starts 4pp low (90.0% vs 93.9%). Lowering γ alone does not fix this:
world debt in 2031 is 90% at γ = 0.1.

### Finding 4: rates mostly follow growth, but the debt term is now too high

At γ = 0.1, r* for 2036-45 is 1.23%, already at the panel's 1.18% and today's G7 level. The 6.5bp
debt sensitivity merged in #122 is above every published estimate (1.0bp to the short rate, 3.5bp
including the term premium, in Dallas Fed WP 2513). It was justified two ways:
- **A panel match**, which used a growth setting with decreasing returns (finding 2).
- **The US 2019-26 rise in real yields**, which the Fed attributes mostly to the term premium.

Both supports are weaker than they looked. Details: `evidence-rates-debt-labour.md`.

## Research and model work, ranked by information per unit of effort

**In-repo tests (each a small, separate commit; structural changes need two sources per CLAUDE.md):**

- **T1. Fix the γ sweep in `growth-backcast.ts`** so it holds constant returns, and correct the
  "history rejects γ≈0.08" claim in `growth-backcast.md` and `docs/SENSITIVITY.md`. This is a
  correctness fix to a diagnostic.
- **T2. Decide the energy weight.** Candidates are γ = 0.1-0.2 with β raised to keep constant
  returns. Sources: Bruns-Gross-Stern 2014, Stern & Kander 2012, Känzig 2021, Santos et al. 2018.
  This is the biggest decision; it changes every headline.
- **T3. Regional backcast 1990-2025** for the US, OECD-ex-US and China. Inputs: PWT capital and
  labour, plus regional useful exergy (CL-PFU country series or IEA balances). This tests the
  efficiency series and the regional split together. If the US backcast overshoots its observed
  ~1.5%/yr per person, the forward 2.5% at γ = 0.1 is overstated too.
- **T4. Add 2025-26 actuals to `scripts/nearterm-validation.ts`** (IMF Oct-2026 world 3.1%, US 2.3%,
  China 4.5%; BEA; Ember electricity +2.8% in 2025) as bands, so a growth miss fails loudly.
- **T5. Revisit the safe-rate debt term**, back toward ~3bp (Laubach 3-4bp; Dallas Fed 3.5bp
  in total). Or split the short real rate (~1bp) from the term premium if long-yield outputs are
  wanted.
- **T6. Electrification pace:** electricity demand runs 1.8× STEPS; the backcast lessons note
  already found a ~2× overshoot. Calibrate the sector pressures to the STEPS/CPS pace. This is an
  emissions fix.
- **T7. Debt aggregation:** weight r−g by debt, or carry public debt per region (the US, OECD-ex-US
  and China account for most of it). Re-anchor 2025 at the IMF's 93.9%.

**External evidence (a second research round):**

- **E1. Natural-experiment estimate of γ.** Use the 2022 European gas cutoff across EU countries:
  pre-war Russian-gas dependence as the instrument, GDP against trend 2022-25 per % of useful
  exergy lost. At γ ≈ 0.5 a 10% cut predicts about −5%; at γ ≈ 0.1, about −1%. Eurostat data are
  public; this is a contained study.
- **E2. Country useful-exergy panel (CL-PFU v1.x, 1971-2020):** GDP vs useful exergy within and
  across countries, net of the income → energy channel.
- **E3. Sharpen the panel's questions:** define "repression" so soft measures count or don't, and
  re-base the labour-share signpost (BLS is already at 53.0%).

**Where a Tetlock ensemble helps, and where it doesn't.** Re-running a 2045 panel now would
re-aggregate judgment on questions that evidence and model fixes can settle (T1-T7). Worse, a
sim-enabled panel would be anchored on a model known to run hot. The ensemble earns its cost after
T1-T4, aimed at pre-registered signposts that resolve in 2027-2030, so each year's data moves
confidence between paths. Candidate questions:
- US real GDP growth averages ≥ 2.5% over 2027-30 (BEA).
- IMF world general-government debt ≥ 100% of GDP in 2029 (Fiscal Monitor).
- World electricity demand grows ≥ 4%/yr on average over 2026-30 (IEA/Ember).
- HLW US r* ≥ 1.5% in 2030Q4 (NY Fed).
- US nonfarm labour share < 52.0% in any quarter of 2030 (BLS).
- A G7 central bank announces yield-curve control or a yield cap by 2030.

## Caveats

- The model is a world aggregate. Its rates and debt are world totals; the panel's are G7 or
  advanced-economy figures.
- The "fragmentation" run in the comparison table is a reconstruction (financing spreads ×2,
  migration −60%, primary deficit +1pp). The first comparison's exact settings were not kept.
- Each evidence note marks figures not confirmed in a primary source as unverified. IEA, CBO and
  Goldman pages returned 403, so their figures are secondary. The 2026 events the notes report
  (a US-Iran war, an inflation shock, a September Fed hike) come from web sources and were not
  checked independently.

## Files

- `comparison-output.md`: output of `scripts/bloc-capitalism-comparison.ts` (comparison table,
  factor weights, electrification, debt vs IMF, constant-returns backcast)
- `evidence-energy-growth.md`: energy elasticity, causality, electrification and productivity
- `evidence-electrification-growth.md`: electrification outlooks, growth consensus (IMF, SSP v3.2,
  CBO), historical reference class, 2025-26 actuals
- `evidence-rates-debt-labour.md`: r* estimates, debt sensitivity, IMF/CBO debt, labour share,
  repression steps
