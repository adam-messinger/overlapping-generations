# E3-fermi: sovereign-debt-fiscal x fermi

**BLUF.** Component arithmetic puts advanced-economy debt near 138% of GDP in 2045, the US (about 170%) carrying half the weight, yet on-budget G7 climate cost sums to about 0.7% of GDP (half the bar) and three G7 yield caps or automation taxes multiply out to about 3%. Neutral rates rise a few tenths, not to 2%; aggregate per-capita growth slows to about 2.3%.

## Reasoning

Adapter re-run 2026-11-09, identical to `adapter-output.md`. "Slides" = IMF staff on the October 2026 Fiscal Monitor ([SUERF, 27 Oct 2026](https://www.suerf.org/wp-content/uploads/2026/09/Davide-Furceri-Fiscal-Monitor.pdf)); chart values read by eye.

**C3.** Anchors: AE 115.2 in 2031 (baseline row); US "projected to reach 142 percent of GDP by 2031" ([IMF, Apr 2026](https://www.imf.org/-/media/files/publications/fiscal-monitor/2026/april/english/execsum.pdf.md)); slides: 2026 primary balances US ≈−4.7, euro area ≈−1.7, Japan ≈−1.1; AE marginal r−g ≈−1.0 rising to −0.4 by 2029 ("unweighted cross-country medians; bands: interquartile ranges"). After 2031: US +1.8pp/yr (CBO public debt 108% 2030, 129% 2040, 175% 2056: secondary summaries; [cbo.gov](https://www.cbo.gov/publication/61882) returned 403) → 170; Japan −0.3; others +0.6. 115.2 + 14×(0.50×1.8 − 0.06×0.3 + 0.44×0.6) = 131; shock allowance 0.6×12 = +7 → **138**. Top-down check (primary deficit 2.3 + 30% of the slides' ≈3.0 extra ageing-defence-climate spending − 0.5 reaction − 0.4 snowball = 2.3pp/yr) gives 156; the country sum gets the weight. Adapter c3 [DIRECTIONAL]: world debt change 2026→2045 positive in nine of ten runs, order ten pp; negative in ai-energy-boom; several times larger in debt-populism. Sign and size only; level refused.

**Q3.** F = adaptation 0.20 (slides' AE climate bar ≈0.15-0.22: "Average annual spending increases relative to 2024 ... Climate: adaptation investment") + relief and backstops 0.4×1.4×0.45×0.8 = 0.20 (losses, trend, public share, attributable) + household support 0.05 + revenue 1%×0.33×0.8 = 0.26 → **0.71%**. The bar needs ×2.1; lognormal σ 0.55 gives 8%. Adapter q3 [DIRECTIONAL]: global damage about 2% of GDP in 2040-45, 2.2-2.6× that in high-sensitivity runs; an output loss, world not G7. Scaled 2.4×, my sum reaches only ≈1.3: **7**. OBR: "There is a large degree of uncertainty around the estimates of the fiscal costs from climate damage" ([OBR](https://obr.uk/box/risks-around-the-estimates-of-climate-damage-costs/)).

**Q4.** Adapter [REFUSED]. P(debt>140) × P(numeric cap) + P(automation tax ≥2% of GDP): Japan 0.95×0.25+0.02 = 0.25; US 0.90×0.13+0.02 = 0.14; Italy 0.70×0.04+0.015 = 0.045; France 0.03; UK 0.035; Canada 0.02; Germany 0.015. Independent P(≥3) = 0.7%; a common fiscal-dominance factor (ρ≈0.35) lifts it to **3**. Coherent with C3: US, Japan and Italy exceed 140 centrally. No cap exists today (slides: "Central banks are tightening"; Japan's ten-year ≈3.05% at 30 Sep 2026).

**C2/Q2.** US 1.01 − 0.1 (labour force) + 0.45 (45pp debt × 1bp, a third of Laubach; slides' US forward-rate coefficient ≈0.07, 90% band ≈0.02-0.12, "rolling windows of 40 observations") − 0.2 (ageing saving) + 0.2 (AI capex) = 1.36; euro area 0.4; Canada 1.5. R = 0.61×1.36 + 0.34×0.4 + 0.05×1.5 = **1.04**, SD 0.7. Reaching 2.0 needs US ≥2.6 with euro area ≥1.0 (0.12×0.5) or US ≥3.0 (0.03): **9**. Adapter c2/q2 [DIRECTIONAL]: world safe-rate change 2026→2040 between −0.1 and +0.4pp, up in seven of ten runs: tenths. Level refused.

**C4/Q6.** Adapter c4 [IDENTIFIED]: baseline 1.02622/0.99683−1 = 2.95% (runs 2.64-3.98; un-wpp-medium 2.74); q6 [IDENTIFIED]: g = 1.02349/0.99546−1 = 2.82%. Not adopted: the run implies OECD-core per-capita growth of 2.2-2.7% against WDI's 1.16-1.41%, and China 3.5% against 5.4-7.2%; offsetting errors, plus population at −0.32%/yr. Mine: OECD GDP 1.55%; China 4.0% then 2.4%; population 2,809M→2,790M→2,730M; per capita $39.8k→$50.7k→$62.4k: C4 **2.27%**, g 2.09%. P(g≥2.5) = 28% (SD 0.6, model upper tail). Regime C: decade hazards Italy 3, France 1.5, UK 1.5, US 1.5, Japan 1, others 0.4, union 7; stagflation limb 0.08×0.15 = 1; C = 8. A = 0.28×0.96 = 27.

**C1/Q1.** Adapter [REFUSED]. g_T = (3.9+4.1+18×2.0)/20 = 2.2, where 2.0 = 0.14×(−0.5) fuels + 0.15×5 AI goods + 0.71×1.7 other + 0.15 reweighting; g_Y = (2.6+2.9+18×2.5)/20 = 2.53; E = **0.87** ([WTO](https://www.wto.org/english/res_e/booksp_e/trade_outlook24_e.pdf) 2010-23: 2.5/2.7 = 0.93). SD 0.2: P(E<0.75) = 27%. Share 2045 = digital 21.5 + AI goods 11 + fuels and mining 8 = 40.5±5: P(>42) = 38%, 45% given low E. Q1 = 0.27×0.45 = **12**.

**Q5.** Adapter q5 [DIRECTIONAL]: constant-price US+China share flat (44.8→44.4-45.1) in every run, so the +7.7pp must come from prices and exchange rates: 6%. EU 17.7×(1.032/1.045)^19 = 14.0; P(<11.5 | first leg) = 0.5. **3**.

```json
{"c1": {"p10": 0.62, "p50": 0.87, "p90": 1.12},
 "q1": 12,
 "c2": {"p10": 0.2, "p50": 1.05, "p90": 1.95},
 "q2": 9,
 "c3": {"p10": 119, "p50": 138, "p90": 163},
 "q3": 7,
 "q4": 3,
 "c4": {"p10": 1.7, "p50": 2.3, "p90": 3.0},
 "q5": 3,
 "q6": {"A": 27, "B": 65, "C": 8}}
```
