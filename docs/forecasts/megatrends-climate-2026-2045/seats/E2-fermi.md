# Seat E2-fermi (effort E2 neutral-rate-capital; lens: arithmetic decomposition; sim-enabled)

**BLUF.** Splitting the HLW composite into its growth leg (c x g) and its other-determinants leg (z) gives R near 0.6% for 2036-45: official trend-growth projections take about 0.5pp off the growth leg while debt supply and capex demand put about 0.3pp back through z, and R >= 2% needs US trend growth near 3.3% (6%). The same component arithmetic gives advanced-economy debt near 135% of GDP in 2045, a trade elasticity of 0.87 and aggregate per-capita growth of 2.3% a year.

Adapter: re-run on 2026-11-09 from the spec, numerically identical to `adapter-output.md`. Statuses used: c1, q1, q4 refused; c2, q2, c3, q3, q5 directional (sign and rough size only); c4 and q6's g identified, conditional on the run.

## Reasoning

**C2/Q2.** NY Fed file, final point 2026Q2 (https://www.newyorkfed.org/medialibrary/media/research/economists/williams/data/Holston_Laubach_Williams_current_estimates.xlsx): r* = c·g + z; c 1.113/0.964/1.134 (US/EA/CA), g 2.41/1.27/1.94, z −1.67/−1.14/−0.44. R = growth leg 2.16 + z leg −1.43 = 0.73. Growth leg 2036-45: US g 1.9 (CBO potential 1.8% for 2031-36, search summary of https://www.cbo.gov/publication/61882; AI +0.1), EA 0.9 (Ageing Report 0.8% early 2030s; "the level of uncertainty surrounding the projections is high", https://www.ecb.europa.eu/press/economic-bulletin/focus/2024/html/ecb.ebbox202405_08~5f9531042f.en.html), CA 1.7: 0.61×1.113×1.9 + 0.34×0.964×0.9 + 0.05×1.134×1.7 = 1.68. z drift: debt supply +0.4 (20pp×2bp), AI/energy/defence capex +0.3, OLG saving −0.2, physical climate −0.05, convenience-yield erosion +0.1, sum +0.55, ×0.6 filter pass-through (z fell after 2022 regardless): −1.10. R = 0.58. AI case (g 2.8/1.5/2.3) 1.64; stagnation −0.29; R≥2 needs US g near 3.3. HLW's σ_r* (0.19/0.24/0.14 a quarter) compounds to window-average sd 1.0-1.3 (correlation 0-0.5); at 0.87, P(R≥2) 5-7%. Adapter c2/q2 [DIRECTIONAL]: world safe rate, 2036-45 mean less 2026: +0.04pp baseline, −0.07 to −0.13 in high-sensitivity, climate-cascade, ssp3-70, +0.36/+0.51 in net-zero/ai-energy-boom. Tenths; climate negative. Level refused ("Use CHANGES, never the level").

**C3.** 2045 weight×ratio: US 0.48×178 (IMF: "Gross debt is projected to reach 142 percent of GDP by 2031", https://www.imf.org/-/media/files/publications/fiscal-monitor/2026/april/english/execsum.pdf.md; then 2.5pp a year), Japan 0.05×195, euro area 0.235×100, UK 0.057×115, Canada 0.033×105, others 0.145×68: 138.6, less the 3 these weights overshoot IMF 2031 (118.1 against 115.2): 135. Adapter c3 [DIRECTIONAL]: world debt/GDP +8pp 2026-2045 baseline, −4 ai-energy-boom, +74 debt-populism; world aggregate, exogenous deficit, hence smaller; not adopted.

**Q3.** F: adaptation 0.2 (EU need €70bn a year, 0.4% of GDP, public plus private, https://mission-adaptation-portal.ec.europa.eu/news-events/news/new-assessment-highlights-scale-adaptation-investment-needs-eu-2026-01-27_en), relief and backstops 0.2, household support 0.05, attributed revenue loss 0.35 (OBR: damage "could add 2.0 per cent of GDP to primary borrowing by the early 2070s", with "significant uncertainties ... that cannot, for the moment, be readily quantified", https://obr.uk/frs/fiscal-risks-and-sustainability-july-2025/): 0.8. Lognormal σ 0.55: P(≥1.5) 13%; without the revenue leg (0.45) 1%. Half each plus the high-sensitivity tail: 8. Adapter q3 [DIRECTIONAL]: world output loss 2.1% of GDP in 2040-45, 1.2% in 2026 (4.6-5.5% in high-sensitivity, cascade); not an outlay.

**Q4.** Adapter REFUSED. C3's components put only Japan, the US, Italy and marginally France above 140%. P(cap): Japan 0.28, US 0.11, a third (ECB numeric cap, UK, a 2%-of-GDP automation levy) 0.06: 0.2% if independent; under a common fiscal-dominance regime 0.12×0.75×0.55×0.3 = 1.5%: 2.

**C4/Q6.** OECD $76.5T at 1.6% reaches 105.1; China $35.3T at 3.9% then 2.5% reaches 66.3; population 1,435M+1,306M (UN medium, secondhand). Per capita $39.8k to $62.5k: 2.28% a year, 2.44% to 2035, then g 2.13%. Adapter c4 [IDENTIFIED, conditional]: 1.02622/0.99683−1 = 2.95% baseline, 2.64-3.99 across runs; q6 g 2.82%, 2.47-4.61. Its US (2.67%) and OECD ex-US (2.22%) per-capita rates contradict the OECD-alone baseline (1.16-1.41%): one world production function, a low-fertility denominator. Not adopted; it sets P90. P(g≥2.5) 25% at sd 0.55, 28% with that skew. Regime C: credit-event hazards US 2, Italy 2.5, France 1.5, UK 1, Japan 1 (7.5% together), stagflation 0.07×0.15: 8. A: 28×0.95 = 26.

**C1/Q1.** Adapter REFUSED. g_Y 2.5. g_T: 2.5, AI goods +0.25, electrification kit +0.1, fuels −0.2, tariffs −0.2, China import substitution −0.1, ageing −0.1, reshoring and chokepoints −0.08: 2.17. E 0.87, sd 0.2, P(E<0.75) 27%. Share 2045: digital services 24, AI goods 12, fuels and mining 8.5: 44.5, sd 5.3, 68% (50% on the fallback), 0.6 given low E (weak positive correlation). 0.27×0.6 = 16.

**Q5.** Nominal-dollar growth US 4.2, China 5.15, EU 3.25, rest 5.0 for 19 years: US+China 42.7%, EU 13.9%. Passing 50% needs a 1.64pp-a-year differential (8%); EU below 11.5% given that, 0.65: 5. Adapter q5 [DIRECTIONAL]: real leg flat, 44.8 to 44.5.

**Coherence.** Q1 16≤27; C2 P90 1.7<2, Q2 6<10; Q6-A 26≤28; Q4 countries follow C3.

```json
{"c1": {"p10": 0.62, "p50": 0.87, "p90": 1.13},
 "q1": 16,
 "c2": {"p10": -0.5, "p50": 0.6, "p90": 1.7},
 "q2": 6,
 "c3": {"p10": 112, "p50": 135, "p90": 162},
 "q3": 8,
 "q4": 2,
 "c4": {"p10": 1.8, "p50": 2.3, "p90": 2.9},
 "q5": 5,
 "q6": {"A": 26, "B": 66, "C": 8}}
```
