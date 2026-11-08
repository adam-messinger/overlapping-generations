# Reference points: electrification pace and long-run growth (gathered 2026-11-07)

> **Correction (synthesis, 2026-11-07):** the model's 52% is `electrificationRate`, a service-weighted share. On the final-energy basis the IEA tables use (electricity demand / (electricity + non-electric final energy)), the model is 19.9% in 2025 and **38.0% in 2045**: above STEPS (~30%) and DNV (33%), below NZE (~48%). Model total final energy grows 1.8%/yr 2026-45, not ~3%. Electricity demand growth (5.2%/yr) is as stated. See README.md.

Status tags: **[primary]** = number read in the primary document/data (page text or table extracted
here); **[computed]** = derived by me from primary data (method stated); **[secondary]** = consistent
reports from news/aggregators, primary not opened (blocked or not found); **[unverified]** = single
secondary source, memory, or interpolation.

Access notes: iea.org pages, cbo.gov PDFs and goldmansachs.com returned HTTP 403 to the fetch tool;
the full WEO-2025 PDF was downloaded from IEA's blob store and its Annex A tables read directly.
SSP v3.2 (IIASA, May 2025) basic-drivers file was downloaded and growth rates computed.

---

## 1. Electrification

### 1a. World electricity share of total final consumption (TFC), history

| Year | Share | Source |
|---|---|---|
| 1973 | 9.4% | IEA Key World Energy Statistics 2020, "1973 and 2018 source shares of TFC" [primary] |
| 1990 | ~13% | interpolated, not found in a primary source [unverified] |
| 2000 | ~15% (Enerdata says 17%, different scope) | Enerdata "World electrification and decarbonisation" [unverified] |
| 2010 | 16.9% | WEO-2025 Table A.2a: 64 EJ / 378 EJ [computed from primary] |
| 2018 | 19.3% | IEA KWES 2020 [primary] |
| 2023 | 20.5% | WEO-2025 Table A.2a: 91/444 [computed from primary] |
| 2024 | 21% | WEO-2025 Table A.2a ("21% of total final consumption globally", p.~22, 196) [primary] |

Pace: 1973-2024 ≈ **0.23 pp/yr**; 2010-2024 ≈ **0.29 pp/yr** [computed].

### 1b. IEA World Energy Outlook 2025 (Nov 2025) — Annex A, world tables [primary]

Electricity in TFC (EJ) and share; TFC total:

| Scenario | 2024 | 2035 | 2040 | 2050 | Elec CAAGR 2024-35 / 2024-50 | TFC CAAGR 2024-35 / -50 |
|---|---|---|---|---|---|---|
| CPS | 95 EJ, 21% | 131 EJ, 25% | 145 EJ (26.4%) | 172 EJ, 29% | 2.9% / 2.3% | 1.3% / 1.1% |
| STEPS | 95 EJ, 21% | 130 EJ, 26% | 144 EJ (27.9%) | 169 EJ, 31% | 2.9% / 2.2% | 1.0% / 0.7% |
| NZE | 95 EJ, 21% | 133 EJ, 33% (2030: 26%) | 156 EJ (41%) | 192 EJ, 55% | 3.1% / 2.8% | -0.9% / -1.0% |

(2040 shares computed from the table's EJ; NZE 2030 share 26% from Table 7.1.)

Total generation (TWh), CAAGR:
- CPS 31,229 (2024) → 45,109 (2035) → 59,426 (2050): 3.4% / 2.5%
- STEPS → 44,274 → 58,081: 3.2% / 2.4%
- NZE → 48,118 → 80,175: 4.0% / 3.7% ("increases by 4.1% on average per year until 2035, adding ~1,400 TWh each year")

Non-electric TFC (TFC minus electricity) [computed]: 2024 358 EJ →
- CPS 392 (2035), 427 (2050): +0.8%/yr to 2035, +0.68%/yr to 2050
- STEPS 374, 372: +0.4%/yr to 2035, +0.15%/yr to 2050
- NZE 275, 160: -2.4%/yr to 2035, -3.1%/yr to 2050

Interpolated 2045 electricity share [computed, linear in EJ]: CPS ~27.5%, STEPS ~29.6%, NZE ~48%.
In electricity terms, 2045 electricity TFC ≈ CPS 158 EJ (≈44,000 TWh), NZE ≈174 EJ (≈48,000 TWh).

Useful-energy caveat (WEO-2025 p.196, STEPS) [primary]: "electricity ... provides approximately
40% of useful energy to end-users by 2035" while being just over 25% of TFC. If the model's
"electrified share of final energy services" is a useful-energy/service measure, compare it with
that ~40%-by-2035 STEPS figure, not with TFC shares.

WEO-2025 GDP assumptions (Table 2.2, PPP, all scenarios) [primary]: World 3.0% 2024-35, 2.4%
2035-50 (2.6% 2024-50); US 2.0% / 1.8%; China 3.5% / 2.2%; India 6.1% / 4.0%. Based on IMF WEO
(April 2025) to 2030, Oxford Economics + Solow model after.

### 1c. Other outlooks

- **BNEF New Energy Outlook 2025, Economic Transition Scenario** [primary, exec summary]: "demand
  for electric power rises 75% by 2050" (≈2.2%/yr 2024-50 [computed]); useful energy +32% by 2050,
  primary energy +9%. Data centres 4.5% of final power demand in 2035, 8.7% in 2050. Final-energy
  electricity share not in the exec summary.
- **DNV Energy Transition Outlook 2026 (10th ed.)** [primary web page]: electricity share of final
  energy demand 21% today → **33% in 2045**; electricity demand +80% by 2050 (≈2.4%/yr); generation
  33,000 TWh (2025) → 84,000 TWh (2060). China 27% today, >50% by 2060.
- **DNV ETO 2025** [secondary, DNV news]: 21% → 43% by 2060; electricity demand +55% (horizon unclear).
- **Ember** (Global Electricity Review 2026, Apr 2026) [primary]: world demand +2.8% (+849 TWh) in
  2025; ten-year average 2.7% (2015-24); China +5.0%, India +2.4%. Total 31,779 TWh [secondary].

### 1d. Fastest historical electrification pace

- China: electricity share of final energy ~32% in 2023 (Ember's definition), "growing by
  1 percentage point per year since 2015" — Ember China Energy Transition Review 2025 [secondary
  summary of Ember page]. US and EU flat at ~24% since 2010 (same source).
- IEA WEO-2025 Fig 8.3 [primary]: Japan/Korea and China are the most electrified major regions
  (~25-28% in 2024); rapid growth also in Southeast Asia and India.
- No major economy found with a sustained (10-20 yr) pace above ~1 pp/yr [search not exhaustive].
- Scenario paces: NZE 2024-35 ≈1.1 pp/yr, 2035-50 ≈1.5 pp/yr; CPS/STEPS ≈0.4 pp/yr [computed].

### 1e. Latest electricity data (earliest checks on the model's 2026-27 path)

- 2025: +2.8% (Ember) [primary]; ~3% (IEA) [secondary].
- IEA Electricity Mid-Year Update (23 Jul 2026): **+3.6% in 2026, +3.8% in 2027**; China +5.5%
  2026, India ~7% (after 1.6% in 2025), US and EU close to 2% [secondary — reported identically
  by several outlets; iea.org returned 403].

---

## 2. Long-run growth consensus

### 2a. IMF World Economic Outlook, October 2026 (Ch.1, Table 1.1 and Annex Table 1.1.6) [primary]

| | 2025 | 2026 | 2027 |
|---|---|---|---|
| World (PPP) | 3.5 | 3.1 | 3.4 |
| World (market FX) | 2.9 | 2.5 | 2.8 |
| Advanced economies | 2.0 | 2.1 | 1.8 |
| United States | 2.3 | 2.3 | 2.3 |
| China | 5.0 | 4.5 | 4.0 |
| India (FY) | 7.8 | 7.0 | 7.0 |
| Per capita (PPP): World | 2.6 | 2.1 | 2.5 |
| Per capita: US | 1.8 | 2.0 | 2.0 |
| Per capita: China | 5.2 | 4.7 | 4.2 |
| Per capita: India | 6.9 | 6.1 | 6.1 |

Medium term: "Global output is projected to expand at an average annual pace of **3.2 percent in
2028-31**, ... compared with the prepandemic (2000-19) historical average of **3.7 percent**."
AI upside scenario (Box 1.2, "Strong Payoffs"): global TFP +0.8% (level) over 10 years; world GDP
+0.6% by 2029, US GDP +1.3% by 2031 vs baseline (i.e. ~0.2-0.3 pp/yr at most).

### 2b. CBO (US)

- Long-Term Budget Outlook data, Feb 2026 (2026-2056): real GDP growth averages **1.7%**; below 2%
  every year from 2027; 2.4% in 2026 falling to 1.5% by end of horizon [secondary: PGPF summary].
- Budget and Economic Outlook Feb 2026: real GDP 2.2% (2026), 1.8% (2027); potential GDP 2.1%/yr
  2026-30, 1.8%/yr 2031-36; includes a +0.1 pp AI productivity effect 2026-36 [secondary: CRFB,
  PWBM summaries; cbo.gov PDF 403].
- Population: "1.5 percent per decade" through 2056 (House Budget chair statement) / PWBM 0.47% (2026)
  → 0.08% (2056) [secondary]. Implied US real GDP per capita ≈ **1.3-1.55%/yr** [computed, unverified].
- PWBM (independent, May 2026): 1.8% 2027-36, 1.6% 2037-46, 1.3% 2047-56 [secondary].

### 2c. SSP v3.2 (IIASA SSP database, May 2025; GDP by OECD ENV-Growth 2025), PPP USD2017 [computed from primary data]

CAGR 2025-2045 (2025-2050 in parentheses):

| | SSP1 | SSP2 | SSP3 | SSP4 | SSP5 |
|---|---|---|---|---|---|
| World GDP | 3.01 (2.91) | 2.67 (2.56) | 2.17 (1.98) | 2.66 (2.51) | **3.56** (3.50) |
| World GDP/cap | 2.46 | 1.95 | 1.28 | 1.82 | 3.01 |
| USA GDP | 1.79 | 1.50 | 1.12 | 1.67 | 2.29 |
| USA GDP/cap | 1.38 (1.32) | 1.09 (1.03) | 0.75 | 1.43 | **1.63** (1.63) |
| China GDP/cap | 3.25 | 2.91 | 2.34 | 3.05 | **3.81** (3.68) |
| India GDP/cap | 4.64 | 4.02 | 3.20 | 3.51 | **5.27** (5.09) |
| OECD&EU (R5) GDP/cap | 1.73 | 1.46 | 1.06 | — | 2.07 |
| OECD&EU+China GDP/cap | 2.33 | 2.04 | 1.56 | — | **2.79** (2.75) |

SSP5 decade profile: World GDP 3.39% (2025-35), 3.73% (2035-45); US per capita 1.44% / 1.83%.
(OECD&EU+China bloc = sum of GDP / sum of population, population backed out as GDP / GDP-per-capita.
The IIASA-WU GDP model is not in release 3.2; the 2023 presentations say IIASA-WU projections are
"less optimistic" than OECD's, so the OECD numbers above are the upper of the two SSP GDP sets.)

### 2d. Other long-run projections

- **Goldman Sachs, "The Path to 2075"** (Dec 2022): global growth "a little under 3% per year over
  the next ten years", gradually declining; EM 3.8% vs DM 1.8% this decade [secondary; GS PDF 403].
  Decade-by-decade country rates not retrieved [unverified].
- **PwC "The World in 2050"** (Feb 2017): world GDP +130% 2016-50 (≈2.5%/yr [computed]); E7 ~3.5%/yr,
  G7 ~1.6%/yr [secondary, PwC press release].
- **OECD, Guillemette & Turner (2021) "The long game"**: trend real GDP growth for OECD+G20 from
  ~3% post-COVID to ~1.5% by 2060 [secondary, OECD summary]. Per-capita figure not found.
- **IEA WEO-2025 macro assumption** (above): world 3.0% 2024-35, 2.4% 2035-50.

### 2e. Is US 3.4%/yr per capita, or OECD+China 3.9%/yr per capita, inside any published scenario?

**No.** The highest is SSP5: US 1.63%/yr per capita, OECD&EU+China 2.79%/yr (2025-45). The model's
world GDP 3.8%/yr also sits above SSP5 (3.56%) and above IMF's 2000-19 average (3.7%). The model's
China 4.7%/yr per capita is above SSP5 (3.81%). India 4.4%/yr per capita is inside the SSP range
(SSP2 4.02 - SSP5 5.27).

### 2f. AI-boom growth estimates (productivity boost, pp per year unless stated)

From Cunningham's compilation (tecunningham.github.io, Oct 2025) [secondary compilation; individual
papers not reopened], cross-checked where noted:
- Goldman Sachs (Briggs & Kodnani 2023): +1.5 pp/yr US labour productivity over 10 years after
  adoption; +7% global GDP level [primary GS insight page title/summary, secondary detail].
- Acemoglu (2024): TFP +0.71% total over 10 years (~0.07 pp/yr), possibly <0.55%.
- Aghion & Bunel (2024): +0.68 pp/yr (task-based); 0.8-1.3 pp/yr (historical analogies).
- OECD Filippucci et al. (2024/25): +0.25-0.6 pp/yr US TFP; 0.4-1.3 pp/yr labour productivity US/UK.
- BIS Aldasoro et al. (2024): +1.5 pp/yr productivity, GDP ~30% higher in 10 years.
- McKinsey (2023): gen-AI 0.1-0.6%/yr labour productivity through 2040; all automation 0.2-3.3 pp/yr
  [secondary, WEF republication].
- Baily, Brynjolfsson & Korinek (2023): +18% level in 10 years; +1 pp/yr in "level+growth" case.
- Penn Wharton (2025): +1.5% level by 2035 (~0.15 pp/yr). CBO: +0.1 pp. IMF Oct 2026: ~0.2-0.3 pp/yr.
- Tails: Korinek & Suh (2024) AGI scenarios ~18%/yr growth; Epoch GATE (Erdil et al. 2025)
  ~30%/yr gross world product growth by 2035 under default parameters (authors doubt it).

Implication [computed]: SSP2-to-SSP5 US per capita (1.1-1.6%) + the top mainstream AI estimate
(+1.5 pp) gives ≈2.6-3.1%/yr. Model's 3.4% exceeds even this; only explicit AGI/explosive-growth
scenarios reach it.

---

## 3. Historical reference class

Computed from FRED A939RX0Q048SBEA / GDPC1 (US, annual averages of quarterly) and OWID's copy of the
Maddison Project Database 2023 (2011 int$, through 2022) [computed]:

- **US, best 20-yr real GDP per capita**: 2.77%/yr (1949-69 and 1958-78); 1960-80 2.52; 1980-2000
  2.27; 2005-25 1.31; 2015-25 1.84.
- **G7 aggregate (population-weighted), best 20-yr per capita**: 3.65%/yr (1950-70), golden age
  with Japan 8.4%, Germany 5.3%, Italy 5.2% catch-up; 2002-22 only 1.07%.
- Other G7 bests: France 4.15 (1953-73), Canada 3.16 (1961-81), UK 2.50 (1953-73).
- Catch-up economies: China 6.87 (1999-2019), South Korea 8.25 (1968-88), Taiwan 7.38, India 5.10
  (2002-22).
- **World GDP (PPP)**: 1990-2022 3.55%/yr (Maddison); 1990-2010 3.79%; 2000-19 3.87% (Maddison)
  vs IMF 2000-19 3.7% [primary]; world per capita 1990-2022 2.24%/yr.
- OECD aggregate 20-yr windows not computed (G7 used as proxy).

---

## 4. Latest actuals

- **US** [computed from BEA via FRED]: 2025 real GDP +2.3% (annual average); 2026 Q1-Q3 vs 2025 Q1-Q3
  +2.3%; Q3/Q3 +2.1%. Quarterly SAAR 2026: Q1 2.5%, Q2 2.2%, Q3 3.4% (BEA advance, 29 Oct 2026 [primary]).
  Q4 2025 was 0.2% SAAR.
- **World** (IMF Oct 2026) [primary]: 2025 3.5%, 2026 3.1% (proj.), 2027 3.4%.
- **China** (NBS, 21 Oct 2026) [primary]: 2026 Q1-Q3 +4.6% y/y (Q1 5.0, Q2 4.3, Q3 4.5); 2025 5.0% (IMF).
- **Electricity**: 2025 +2.8% (Ember); 2026 forecast +3.6%, 2027 +3.8% (IEA mid-year update, secondary).

---

## 5. Model value vs reference range

| Quantity | Model | Reference range | Verdict |
|---|---|---|---|
| World electricity demand growth 2025-45 | ~5.2%/yr (24k → 66k TWh) | CPS/STEPS 2.9%/yr TFC to 2035 (2.2-2.3% to 2050); NZE 3.1% TFC, 4.0% generation to 2035 (3.7% to 2050); BNEF ETS ~2.2%; DNV ~2.4%; history 2.7% (2015-24) | Above every scenario, incl. NZE (~1.3x NZE generation growth) |
| Electricity demand growth 2026-27 | ~5% | IEA: 3.6% (2026), 3.8% (2027); 2025 actual 2.8-3.0% | ~1.2-1.5 pp high |
| Electrified share of final energy, 2045 | 52% | CPS ~27.5%, STEPS ~29.6%, DNV-2026 33%, NZE ~48% (55% in 2050) | Above NZE; ~1.6-1.9x policy-baseline outlooks (if TFC basis; if useful-energy basis, compare STEPS ~40% of useful energy by 2035) |
| Electrification pace | ~1.55 pp/yr | World 0.23-0.29 pp/yr; China ~1 pp/yr (fastest documented); NZE 1.1 (to 2035) to 1.5 pp/yr (2035-50) | Above any observed economy; equals late-NZE pace from 2025 |
| Non-electric final energy | +0.5%/yr | CPS +0.7-0.8%; STEPS +0.15-0.4%; NZE -2.4 to -3.1% | In CPS/STEPS band, but no scenario pairs that with NZE-level electrification; implies total final energy ~+3%/yr vs CPS 1.1-1.3%, history 1.3% (2010-24) |
| World real GDP (PPP) 2026-45 | 3.8%/yr | IEA 3.0 → 2.4; IMF 3.2 (2028-31); SSP2 2.67, SSP5 3.56; GS "<3%"; history 3.55 (1990-2022), 3.7 (2000-19) | Above SSP5; equal to best historical (China-boom) era |
| World growth 2026-27 | ~3.7% | IMF 3.1 (2026), 3.4 (2027) | 0.3-0.6 pp high |
| US real GDP growth 2026-27 | ~3.2% | Actual 2026 YTD 2.3%; IMF 2.3/2.3; CBO 2.2/1.8 | ~0.9-1.4 pp high |
| US real GDP growth 2045 | 4.1% | CBO <2% every year from 2027, 1.7% avg 2026-56; SSP5 US GDP 2.46% (2035-45) | ~2x consensus; above SSP5 |
| US real GDP per capita 2026-45 | 3.4%/yr | SSP 0.75-1.63; CBO-implied ~1.3-1.55; IMF 2.0 (2026-27); Tetlock 1.75; best US 20-yr 2.77 (1949-69); last 20-yr 1.31 | Above every published scenario and the US record by ~0.6 pp |
| China per capita 2026-45 | 4.7%/yr | SSP 2.34-3.81; IEA-implied ~3.8 (2024-35) → ~2.5; IMF 4.7 (2026), 4.2 (2027); Tetlock 3.15 | Above SSP5; at IMF's near-term rate held 20 years |
| India per capita 2026-45 | 4.4%/yr | SSP 3.20-5.27 (SSP2 4.02); IMF 6.1 (2026-27); Tetlock 4.65 | Inside the range (slightly below Tetlock) |
| OECD+China per capita 2026-45 | 3.9%/yr | SSP 1.56-2.79 (SSP2 2.04); Tetlock 1.6; G7 best 20-yr 3.65 (1950-70); G7 2002-22 1.07 | Above SSP5 by ~1.1 pp; above the G7 golden age |
| AI-boom upper bound (US per capita) | n/a | Consensus + Goldman/BIS +1.5 pp ≈ 2.6-3.1%; only AGI/explosive scenarios (Korinek-Suh, Epoch GATE) higher | Model's 3.4% sits in the explosive-AI tail |

---

## Sources
- IEA, World Energy Outlook 2025 (PDF): https://iea.blob.core.windows.net/assets/9753df19-0a71-422a-b725-012c555763b3/WorldEnergyOutlook2025.pdf — Annex A Tables A.2a-c, A.3a-c, A.5a; Table 2.2; Table 7.1; p.196
- IEA, Key World Energy Statistics 2020 (TFC shares 1973/2018): https://www.rus.unich.it/sites/st23/files/key_world_energy_statistics_2020.pdf
- IMF, WEO October 2026, Chapter 1: https://www.imf.org/-/media/files/publications/weo/2026/october/english/ch1.pdf
- BNEF, New Energy Outlook 2025 executive summary: https://www.qualenergia.it/wp-content/uploads/2025/04/New-Energy-Outlook-2025-Executive-summary-external-14-04-2025-1.pdf
- DNV, Energy Transition Outlook 2026: https://www.dnv.com/energy-transition-outlook/2025/ ; ETO 2025 news: https://www.dnv.com/news/2025/energy-transition-outlook/
- Ember, Global Electricity Review 2026: https://ember-energy.org/latest-insights/global-electricity-review-2026/2025-in-review/
- Ember, China Energy Transition Review 2025: https://ember-energy.org/latest-insights/china-energy-transition-review-2025/
- Enerdata, World electrification and decarbonisation: https://www.enerdata.net/publications/executive-briefing/world-electrification-and-decarbonisation.pdf
- IEA Electricity Mid-Year Update 2026 (via): https://www.downtoearth.org.in/energy/global-power-demand-to-grow-36-in-2026-as-renewables-overtake-coal-iea ; https://www.engineeringnews.co.za/article/global-power-demand-to-accelerate-in-2026-and-2027-iea-says-2026-07-23
- IIASA SSP database release 3.2: https://files.ece.iiasa.ac.at/ssp/downloads/ssp_basic_drivers_release_3.2_full.xlsx (docs: https://ssp.apps.ece.iiasa.ac.at/documentation/basic-drivers)
- CBO long-term outlook summaries: https://www.pgpf.org/article/national-debt-projected-to-hit-175-gdp-interest-totals-99-trillion/ ; https://budgetmodel.wharton.upenn.edu/p/2026-05-29-the-demographic-economic-and-conventional-budget-outlook-2026-2056/ ; https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook
- BEA Q3 2026 advance: https://bea.gov/news/2026/gdp-advance-estimate-3rd-quarter-2026 ; FRED GDPC1, A939RX0Q048SBEA
- NBS China Q3 2026: https://www.stats.gov.cn/english/PressRelease/202610/t20261021_1965671.html
- Maddison Project Database 2023 via OWID: https://ourworldindata.org/grapher/gdp-per-capita-maddison-project-database
- AI growth forecasts compilation: https://tecunningham.github.io/posts/2025-10-19-forecasts-of-AI-growth-extended.html
- Goldman Sachs gen-AI: https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent ; Path to 2075 (via): https://www.tbsnews.net/node/547202
- McKinsey gen-AI (via WEF): https://www.weforum.org/stories/2023/07/generative-ai-could-add-trillions-to-global-economy/
- PwC World in 2050: https://www.pwc.com/hu/en/pressroom/2017/shift_of_global_economic_power.html
- OECD "The long game": https://www.oecd.org/en/publications/2021/10/the-long-game-fiscal-outlooks-to-2060-underline-need-for-structural-reform_93bcf0c3.html
