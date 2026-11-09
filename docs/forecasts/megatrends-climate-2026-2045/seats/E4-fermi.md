# E4-fermi

**BLUF.** Component arithmetic gives OECD+China per-capita growth of about 2.0%/yr for 2026-2045 and 1.9% for 2036-2045, under every ten-year window since 1990, because China's growth falls faster than its weight rises; the simulation's identified 2.95% is published here but not adopted. US+China would have to outgrow the rest of the world by about 1.6 pp a year in dollars for nineteen years to pass 50%, so Q5 is 3%.

## Reasoning

Adapter re-run 2026-11-09, identical to `adapter-output.md`. C1, Q1 and Q4 are **refused**: no model number used.

**C4 (identified).** Baseline GDP +2.622%, population −0.317%: 1.02622/0.99683 − 1 = 2.95%; runs span 2.64 (ssp3-70) to 3.99 (ai-energy-boom); un-wpp-medium 2.74, so demography is worth 0.21 pp. Not adopted: 2.95 tops every WDI window (2.15-2.85) because the model's US (+2.90%) and OECD-ex-US (+2.25%) GDP run about 1 pp above IMF WEO October 2026 (US 1.8% by 2030-31), while its China (+2.83%) matches my 2.9. I keep its scenario differences only.

- OECD per capita: productivity 1.1 + AI 0.3 − employment ratio 0.25 − climate and fragmentation 0.1 = 1.05; IMF-path reading 1.35; I use 1.2. The OECD's own figure is lower: "from the already meagre 1% per year in 2006‑19 to 0.6% per year in 2024‑60 on average", "if nothing is done" ([Employment Outlook 2025](https://www.oecd.org/en/publications/oecd-employment-outlook-2025_194a947b-en/full-report/component-6)). AI: OECD staff 0.25-0.6 pp a year of TFP; Acemoglu caps it at a "0.71% increase in total factor productivity" over ten years ([NBER w32487](https://www.nber.org/papers/w32487)); both static.
- China GDP: IMF 4.5, 4.0, 4.0, 3.7, 3.3, 3.3 for 2026-31 ([WEO](https://www.imf.org/external/datamapper/NGDP_RPCH@WEO)), fading to 2%: 2.9% average. Population −0.45%/yr: UN medium is 1.306B in 2045 (secondary site), but 2025 births were 7.92M and the TFR of "approximately 0.96" is an independent estimate, not NBS ([Caixin](https://www.caixinglobal.com/2026-01-19/chinas-population-decline-accelerates-as-births-hit-modern-era-low-in-2025-102405521.html)).
- 2025: 111.8/2,809 = $39.8k. 2045: 76.5 × 1.012^20 × 1.020 = 99.1; 35.3 × 1.029^20 = 62.5; 161.6/2,716 = $59.5k; **2.03%**. Component ranges 0.5-1.9 and 2.4-4.5, correlation 0.4: σ 0.55.

**Q6 (g identified).** Model: 1.02349/0.99546 − 1 = 2.82% (ssp3-70 2.47, ai-energy-boom 4.61); same objection. Mine: $49.2k in 2035 to $59.5k = 1.92%; σ 0.65 gives P(g ≥ 2.5) = 20%, P(g < 1) = 8%. C = credit events 8% (Italy 3, France 2.5, US 1.5, UK 1.5, Japan 1, less overlap) + P(π ≥ 4) 12% × P(g < 1 | π) 20% = 10. A = 0.20 × 0.95 = 19. B = 71.

**Q5 (directional).** IMF NGDPD ([DataMapper](https://www.imf.org/external/datamapper/NGDPD@WEO)): US+China 30.0% (2008), 42.6% (2021), 42.3% (2026), 42.4% (2031); EU 25.3%, 17.8%, 17.8%, 16.7%. Passing 50% needs ln(50/42.33)/19 = 0.88%/yr against the world, about 1.6 pp against the rest; realised +1.3 over 2015-26, −0.2 over 2021-26, IMF 0.0 to 2031. Model: constant-price share 44.83 → 44.49, so real growth supplies no drift and prices and exchange rates must supply all of it: P = 5.5%. EU reaches 14.0% on the IMF slope and 12.3% repeating 2008-26; a proportional squeeze with US+China at 50.5 leaves 12.0: P = 0.5. 0.055 × 0.5 = **3**.

**C1, Q1.** Volume to 2045, share × index: fuels and mining 0.15 × 0.94, AI goods 0.15 × 2.28, agriculture 0.10 × 1.43, other 0.60 × 1.47 = 1.51, 2.08%/yr; with the WTO's 3.9% and 4.1% for 2026-27, 2.20%. GDP 2.57%. E = **0.86**; P(E < 0.75) = 30%. Composite: digital services $5.26T × 4.25 = 22.4, AI goods 12.8, fuels and mining 4.4, over 88.6 = 44.7%; from the baseline's 37% end, 42.5%: P = 0.6 given low E. Q1 = 0.30 × 0.60 = **18**.

**C2, Q2 (directional).** Model safe rate, 2036-45 mean less 2026: +0.04 pp, −0.13 to +0.51 across runs; sign and size only. HLW r* = g + z: 0.61 × (2.0 − 0.6) + 0.34 × (1.0 − 0.7) + 0.05 × 1.5 = **1.03**. R ≥ 2 needs US ≥ 2.7: 7%.

**C3 (directional).** Model world debt +8.4 pp (−4.1 to +73.6); sign only. US 143.5 (2031) + 14 × 1.9 = 170; others 93 → 100; 0.46 × 170 + 0.54 × 100 = **132**.

**Q3 (directional).** Model world damage 2.12% of GDP in 2040-45 (4.60-5.52 with high sensitivity), an output loss; × 0.35 tax share = 0.74. OBR: damage "could add 2.0 per cent of GDP to primary borrowing by the early 2070s" at "just below 3°C", with adaptation "one important missing piece" ([OBR](https://obr.uk/frs/fiscal-risks-and-sustainability-july-2025/)). Revenue 0.3 + relief 0.3 + adaptation 0.2 = 0.8%: **9**.

**Q4.** Above 140% on my C3: Japan, US, Italy, France marginal. Yield-cap odds 0.25, 0.11, 0.04, 0.03; a 2% automation tax 1% each. Repression regime 10% × 0.19 + 0.3% = **2**.

```json
{"c1": {"p10": 0.6, "p50": 0.86, "p90": 1.1},
 "q1": 18,
 "c2": {"p10": 0.2, "p50": 1.03, "p90": 1.85},
 "q2": 7,
 "c3": {"p10": 114, "p50": 132, "p90": 158},
 "q3": 9,
 "q4": 2,
 "c4": {"p10": 1.35, "p50": 2.03, "p90": 2.8},
 "q5": 3,
 "q6": {"A": 19, "B": 71, "C": 10}}
```
