# Rates, public debt, labour share: external evidence vs model vs panel (as of 2026-11-07)

Notation: [P] = primary source read directly (data file / official document / paper text).
[S] = secondary report, figure consistent across >1 outlet. "unverified" = single or
unconfirmed secondary source, or my own derivation (marked "derived").

Context for 2026 (affects every rate number below): US-Iran war from March 2026, oil/inflation
shock; Fed RAISED rates on 2026-09-16 (SEP median FFR 4.1% end-2026) [P: SEP table; hike itself
S]; 10y nominal 4.95% and 10y TIPS reopening 2.653% on 2026-09-17, "highest for this term since
October 2008" [S: tipswatch]; 10y TIPS ~2.9% in early-mid October 2026 (unverified, two
secondary sites citing FRED; FRED itself was unreachable from this sandbox). PCE inflation 3.7%
(July 2026), core 3.3% [S].

---------------------------------------------------------------------------------------------
## 1. Natural / safe real rate

### 1a. Latest r* estimates [P unless noted]
NY Fed HLW spreadsheet (Holston_Laubach_Williams_current_estimates.xlsx, final data point
2026Q2, one-sided; replication code "as of August 27, 2026"; next update Nov 27, 2026):

| r* (HLW, %) | 2019Q4 | 2021Q4 | 2024Q4 | 2025Q4 | 2026Q1 | 2026Q2 | change 2019Q4-2026Q2 |
|---|---|---|---|---|---|---|---|
| US | 1.27 | 1.73 | 0.87 | 0.89 | 1.09 | **1.01** | -0.26 |
| Canada | 1.77 | 2.01 | 1.92 | 1.81 | 1.72 | **1.76** | -0.01 |
| Euro area | 0.45 | 0.40 | 0.20 | 0.08 | - | **0.09** | -0.36 |

HLW US 2026Q2 decomposition: trend growth g = 2.41%, other factors z = -1.67. Standard error of
final-obs r*: US 1.53pp, Canada 1.97pp, Euro area 4.79pp (!) [P, Parameters sheet].

NY Fed Laubach-Williams (LW_current_estimates, data to Aug 26 2026, final 2026Q2): US one-sided
r* **1.65%** (2026Q2), 1.73 (2026Q1), 1.74 (2019Q4), 1.38 (2024Q4). g = 2.49, z = -1.01 [P].

Other estimates:
- FOMC SEP longer-run FFR median: **3.2%** (Sept 16 2026; central tendency 3.0-3.6, range
  2.9-3.9), longer-run PCE 2.0 -> implied real **1.2%**. June 2026 was 3.1, March 2026 3.1 [P
  for Sept table]. Dec 2019 SEP longer-run median was 2.5% (real 0.5%) — from memory, not
  re-fetched (unverified here) -> change since 2019 ~ +0.7pp.
- St. Louis Fed (May 2026 "On the Economy"): geometric mean of six alternative r* estimates
  **1.43%** in 2025Q4 (slightly below prior quarter, its highest since 2008-09); HLW "a little
  less than 1%" (lowest), 10y10y TIPS forward "a little more than 3%" (highest) [P].
- Richmond Fed Lubik-Matthes: ~**1.5%** (May 2026, secondary commentary; Richmond Fed page not
  retrieved) — unverified. Purdue (Jan 2026) says ~2% in 2025; an older MNI piece 2.3% — unverified.
- SF Fed Economic Letter (Aug 2026): medium-run natural rate "approximately 1.5%" [P].
- NY Fed Liberty Street (Feb 2026, "The post-pandemic global r*"): global r* (common trend of 18
  developed economies) **0.31%** in 2024 (68% band ~-0.5 to >1); US 0.46%; global r* rose
  **+0.79pp** 2019-2024, US +1.11pp; still ~3.5pp below 1990 [P]. One-third to one-half of the
  rise attributed to a falling convenience yield.
- ECB Economic Bulletin 1/2025 box: euro-area real r* range **-0.5% to +0.5%** (end-2024),
  **-0.5% to 1%** incl. HLW variants; nominal 1.75-3%; "broadly unchanged since end-2023" [P].
  No 2026 ECB update found.
- BoE: no official staff number found. MPC member Alan Taylor: neutral Bank Rate ~3% nominal
  (=> ~1% real) [S]; MNI says 3% is the midpoint of the Bank's neutral range (Feb 2026) — unverified.
- Fed FEDS Note (Feb 12 2026): rise in US far-forward nominal rates in the last ~5 years sits
  mostly in the term/risk premium, not r* or expected inflation (qualitative; figures only) [P].

Rough G7 GDP-weighted r* today (derived, unverified): US ~1.0-1.6, EA ~0-0.5, Japan ~0,
UK ~1, Canada ~1.8 -> **~0.8-1.2%**. The panel's 1.18% G7 median sits at today's level; the
model's 1.57% world 2036-45 average sits at the top of the US model range and ~0.4-0.8pp above
a G7 aggregate (but "world" includes EMs; IMF WEO 2023 projects China r* falling ~1.5pp to
~0 by 2050 [P]).

### 1b. Long-run forecasts
- SEP: real 1.2% (above). Longer-run real GDP growth 2.0% [P].
- CBO (Feb 2026 baseline, via CRFB): 10y Treasury 4.1% (2026) -> 4.4% from 2031 [S]; average
  nominal rate on federal debt exceeds nominal growth from 2031, by 0.63pp in 2056 (2025
  vintage: only from 2046, +0.19pp in 2055) [P: Auerbach-Gale, Brookings/TPC, Mar 2026]. CBO's
  explicit real-rate assumption not retrieved (cbo.gov returned 403) — unverified.
- IMF WEO Apr 2023 ch.2 [P]: AE natural rates likely to "stay close to pre-pandemic levels";
  China r* declines ~1.5pp to ~0 by 2050; no AE point projections in text.

### 1c. Debt -> r* (model: 6.5bp per pp of public debt/GDP on the safe rate)
| Source | Estimate | per pp debt/GDP |
|---|---|---|
| Plante-Richter-Zubairy, Dallas Fed WP 2513 (Apr 2025, rev. Jul 2025) [P] | 5y5y nominal +3.47bp (SE 1.61) per pp of projected debt; decomposed (DKW, 1995-2025): **expected real short rate (DKW r*) +1.01bp (SE 0.49)**, term premium +2.38bp; ACM: ~80% term premium. "about 70%" / "three-quarters" via term premium. 56pp CBO debt rise -> ~170bp long rates, ~120 TP + ~50 r* | r*: **~1bp**; long rate: **~3bp** |
| Laubach (2009) as re-estimated in WP2513 | 3-5bp on 5y5y in levels; WP2513 levels spec now ~14bp but biased by nonstationarity [P] | 3-4bp (long rate) |
| Mian-Straub-Sufi (AER 2025, NBER w29707) [P] | semi-elasticity b0·d(R-G)/db mostly **-1.0% to -2.5%** (KVJ 2012, Presbitero-Wiriadinata 2020, Jiang et al.) | ~1-2.5bp at b0 = 100% |
| Rachel-Summers (BPEA 2019) [S: NBER Digest] | AE debt 20->70% of GDP raised neutral rate ~1.5-2pp | ~3-4bp (r*, long-run GE incl. crowding out) |
| IMF WEO Apr 2023 ch.2 [P] | +25pp debt by 2050 -> r* effect "should not exceed 5 to 10 basis points for most countries" | **0.2-0.4bp** |

Verdict: model's 6.5bp is above every estimate for r* (0.2-4bp, central ~1-3bp) and ~2x the
best estimate even for long nominal yields (~3bp). The panel's "~1bp reaches short r*, 70-80% to
term premia" is an accurate reading of WP2513 [P]. Note the model's safe rate is the rate PAID
on public debt; if that is meant as an average coupon (term premium included), ~3bp is the
defensible coefficient, not 1bp. Caveat: WP2513 is US-only and uses CBO projections.

### 1d. Growth pass-through c (model c = 1)
- Semi-structural models ESTIMATE c near 1: current HLW c = 1.11 (US), 1.13 (CA), 0.96 (EA);
  LW c = 1.07 (SE 0.38, t = 2.8) [P, NY Fed spreadsheets]. Identification is weak (HLW r*
  final-obs SE 1.5pp US).
- Reduced-form evidence says c is much lower/unstable: Hamilton-Harris-Hatzius-West (IMF Econ
  Rev 2016) — link to trend growth "much more tenuous than widely believed", sample-dependent
  [S: abstract]; Lunsford-West (AEJ:Macro 2019) — productivity growth NOT positively correlated
  with safe real rates (negative at low frequencies); demographics (hours growth, 40-64 share)
  are [S: abstract]; Rachel-Smith (BoE SWP 571, 2015) — of ~450bp fall in global real rates they
  explain ~400bp, slowing growth is "one force" but saving/investment shifts "appear more
  important" [S]; Obstfeld (NBER w31949, 2023) — demographics, productivity, market power,
  safe-asset demand; no durable large rise "yet on the horizon" (draft) [S].
- NY Fed Cho-Williams (LSE, Apr 15 2026) [P]: labour share cointegrated with HLW r*
  (alpha = 0.044 on log share; +1pp r* ~ +2.5pp labour share at 60%; half-life ~3 quarters);
  cointegration with the trend-growth component ALONE is not similarly strong.
Verdict: c = 1 is defensible only as "same as HLW/LW"; the reduced-form literature favours
c well below 1 (0-0.5). Since the model's g term is (trend growth - 3.4%), a c of 1 makes the
model's r* track world growth one-for-one — the most contested link.

---------------------------------------------------------------------------------------------
## 2. Public debt

IMF Fiscal Monitor April 2026, Table 1.2, general government GROSS debt, % of GDP [P]:

| | 2019 | 2024 | 2025 | 2026 | 2029 | 2031 |
|---|---|---|---|---|---|---|
| World | 82.1 | 92.0 | **93.9** | 95.3 | 100.0 | **102.3** |
| Advanced economies | 100.9 | 107.6 | **108.0** | 108.2 | 112.2 | **114.8** |
| AEs excl. US | 95.5 | 95.7 | 95.3 | 94.4 | 93.9 | 93.4 |
| United States | 108.8 | 122.3 | 123.9 | 125.8 | 135.5 | 142.1 |
| Euro area | 83.3 | 86.6 | 87.1 | 87.8 | 89.0 | 89.7 |
| Japan | 206.3 | 214.5 | 206.5 | 204.4 | 195.7 | 192.8 |
| UK | 84.9 | 99.9 | 102.3 | 103.6 | 103.5 | 102.6 |
| China | 59.8 | 90.4 | 99.2 | 106.9 | 120.3 | 126.8 |
| EMDEs | 54.4 | 69.9 | 73.9 | 77.2 | 83.7 | 86.2 |

World net debt 73.5 (2025) -> 80.6 (2031). Weights: nominal USD GDP at market rates. Global
primary deficit 2.2% of GDP now, narrowing ~0.5pp by 2031; 2025-31 drivers: primary deficit
+11.3pp (avg 1.9/yr), snowball r +18.8, real g -14.3, deflator -15.5, stock-flow +8.2 [P].
Global interest payments ~2% -> nearly 3% of GDP in four years; debt-at-risk (3 yrs ahead)
~117% of GDP [P, exec summary]. The rise is "largely" China and the US [P].
October 2026 Fiscal Monitor (tax-policy themed): press coverage repeats ~94% in 2025, ~100% by
2029 (one outlet says 2030) [S]; Oct 2026 tables not retrieved.

- Model start (world 90%) vs IMF 2025 93.9% (2024: 92.0) -> model ~4pp low on IMF weights
  (a PPP-weighted world would be lower; unverified whether that explains it).
- Model path +3pp over 2025-45; IMF +8.4pp over 2025-31 alone (+1.4pp/yr). Linear
  extrapolation of IMF to 2045 ~ 120% (derived). Model's 3% structural primary deficit is
  ABOVE the IMF world primary deficit (1.9-2.2%), so the gap comes from the model's r-g /
  fiscal-reaction dynamics, not from a smaller deficit.
- US: CBO LTBO (Feb/Mar 2026) federal debt held by public 99% (end-FY2025) / 101% (2026) ->
  108% (2030) -> 120% (2036) -> **175% (2056)**; net interest 3.2% -> 4.6% (2036) -> 6.9% GDP
  (2056); primary deficits ~2% of GDP long run; current-policy variant 211% in 2056 [P:
  Auerbach-Gale; S: CRFB]. CBO higher-rate scenario: 222% in 2056 [S]. Interpolated 2045 ~
  140-150% held-by-public (derived).
- AE 2045 (derived, unverified): US gross ~165-175% x ~45% weight + AE-ex-US ~93-100% ->
  **~130-140%**. Panel's 147% is on the high side of trend extrapolation but within reach if
  r > g bites (CBO) or AE-ex-US resumes rising (defence, ageing).
- EC 2024 Ageing Report [S, Council doc]: EU age-related spending 24.4% (2022) -> 25.6% GDP
  (2070), +1.2pp, most of rise by 2045; pensions 11.4 -> 12.1 (2045) -> 11.8; health 6.9 ->
  7.3; LTC 1.7 -> 2.6. (Modest in EU; US/China/Korea larger.)
- AI and the tax base: IMF note (2026, insea2026002) — transition "could strain fiscal
  frameworks through erosion of labor tax bases and rising social spending needs" [S/P exec
  summary snippet]; ~50% of OECD revenue from labour taxes (IMF FAD official, quoted) [S];
  OECD's Unsal: AI that raises employment could cut OECD debt ~10pp (unverified, second-hand);
  Moody's (Feb 2026): labour-tax losses "could offset or exceed" AI gains [S]. No quantified
  institutional baseline includes AI tax-base erosion. IMF Apr 2026 debt-at-risk: AI-valuation
  correction adds +2.4pp to global debt-at-risk [P].

---------------------------------------------------------------------------------------------
## 3. Labour share

US BLS nonfarm business labour share [P: BLS TED 2026-09-15; Productivity & Costs 2026-11-05]:
| 2025Q1 | 2025Q2 | 2025Q3 | 2025Q4 | 2026Q1 | 2026Q2 | 2026Q3 (prelim) |
|---|---|---|---|---|---|---|
| 55.3 | 54.7 | 54.2 | 54.1 | 53.6 | 52.8 | **53.0** |
Record lows (series from 1947Q1 = 65.5; peak 66.2 in 1960Q4; 58.9 in 2020Q2). Nov 5 2026
release revised compensation back to 2021 (Q2 2026 hourly comp revised +1.4pp to 4.0%), so
Q2's 52.8 may be revised up; Q3 2026 productivity +3.6% saar, ULC -0.7% saar.
- => The panel's signpost (US NFB < 52.5% by 2030, "from 54.4%") is stale: the series is
  already at 52.8-53.0, ~0.5pp from the threshold. Hitting <52.5 in some quarter by 2030 looks
  more likely than not on trend (-1.3pp/yr over the last 6 quarters), though compensation
  revisions and an energy-shock unwind could lift it.
- Goldman Sachs (Sept 15 2026 note, via Fortune) [S]: of the ~7.5pp NFB decline since the
  1990s, ~40% (~3pp) is measurement (pass-through relabelling, depreciation of short-lived
  capital, stock pay timing); ~4.5pp real (markups, automation, bargaining power); "if AI
  continues to automate many additional tasks" the share "will likely continue to decline".
  No AI share assigned.
- AI attribution so far: not established at macro level. Micro: Stanford/King's (Sept 2026,
  41 countries) — AI-adopting firms' affiliates cut junior workforce share; model with AI
  capital lowers labour share in benchmark [S]. TD Economics: little aggregate employment
  disruption [S]. Other drivers in play: 2026 energy shock, weak hiring.
- Global (ILO, WESO May 2025 update) [S, consistent across outlets]: global labour income share
  **53.0% (2014) -> 52.4% (2024)**; -1.6pp over 2004-2024; ILOSTAT blog: 53.0 (2015) -> 52.6
  (2025) (unverified methodology). Trend ~ -0.06 to -0.08pp/yr.
- Model 65% -> 64% by 2045: the LEVEL is a different concept (1 - alpha income share, not the
  ILO self-employment-adjusted share, which is ~52%); the CHANGE (-1pp/20 yrs ~ -0.05pp/yr)
  matches the ILO world trend but is ~1/3 of the recent US pace. Evidence that AI compresses the
  share is suggestive (US record lows, Goldman), not yet causal.
- NY Fed Cho-Williams: if r* stays low, labour share stays low; a rise in r* goes with a
  higher trend share (+2.5pp per pp r*) [P]. Pulls against the panel's combination of LOW r*
  AND a FALLING share being driven by AI-boosted growth (AI growth would raise r*).

---------------------------------------------------------------------------------------------
## 4. Financial repression / YCC: steps 2024-2026
- US: Treasury kept coupon sizes unchanged "for the next several quarters" at the Nov 2026
  refunding; bills absorb the deficit (Bessent tilt), buybacks continue with a tentative Q4 2026
  schedule [P: refunding statement snippet; sizes not retrieved]. eSLR final rule (Fed/FDIC/OCC,
  Fed. Reg. 2025-12-01, effective 2026-04-01, early adoption Jan 1 2026) lowers the G-SIB
  enhanced SLR so it is a backstop, expanding dealer balance-sheet room for Treasuries [S]. GENIUS
  Act stablecoins: est. $0.8-1T extra T-bill demand by ~2028 (Standard Chartered; Liang-Neiman
  Brookings 2026); Bessent called it a "feature of financing the U.S. government" [S]. These
  are captive-demand / term-premium-suppression measures, i.e. soft repression, not YCC.
  Single-source claim: 10y >5% mid-Sept 2026 met by more bill issuance (unverified).
- Japan: BoJ ended YCC March 2024; taper slowed to ¥200bn/quarter from April 2026 (from ¥400bn),
  reviewed June 2026 with reports of a possible pause (outcome not confirmed) [S]; MOF cut
  super-long (20/30/40y) issuance — FY2026 plan the smallest in 17 years [S]; BoJ pledges
  "nimble" fixed-rate purchase operations if long yields spike [S].
- UK: DMO 2026-27 remit £250.6bn; long gilts (15y+) under 7% of issuance, lowest since
  1990/91; long sales £23bn vs £32.5bn in 2025-26 [S, DMO docs listed].
- Literature: Reinhart-Sbrancia 1945-80 liquidation effect (model already uses). No 2024-26
  formal YCC in any G7 economy. The common move is shortening issuance + regulatory captive
  demand, which is the classic first stage of repression.
- Model: repression is triggered only above 150% WORLD public debt/GDP (~2070 in the default
  run) — structurally cannot represent country-level repression (Japan ~200% for decades, US
  heading to 140%+ federal). Evidence favours the panel's direction on "some repression by 2045"
  if defined to include debt-management/regulatory measures; formal YCC in the US is unproven.

---------------------------------------------------------------------------------------------
## 5. Final table

| Quantity | Model | Panel | Best current external evidence | Which side, how strongly |
|---|---|---|---|---|
| Safe real rate / r*, 2036-45 | World 1.57% avg | G7 r* 1.18% median; P(>=2%) 22.5% | US HLW 1.01 (26Q2), LW 1.65, SEP 1.2, St. Louis 6-model mean 1.43 (25Q4), SF Fed MR ~1.5, Lubik-Matthes ~1.5 (unverified); EA HLW 0.09, ECB range -0.5..1.0; Canada 1.76; global (18 DMs) 0.31 (2024). G7 aggregate ~0.8-1.2 (derived). Market 10y TIPS 2.65-2.9% in Sep-Oct 2026 (war/inflation, term premium). | **Panel, moderately** for a G7 r* (its 1.18 = today's level). Model's 1.57 is defensible only as a US/world (incl. EM) number. Market real yields argue P(>=2%) of 22.5% is not too high, maybe low, if the question is market yields rather than r*. |
| Debt sensitivity of the rate | 6.5bp per pp | ~1bp to short r* (70-80% to term premia) | WP2513: 1.01bp r*, 2.38bp TP, 3.47bp 5y5y [P]; MSF 1-2.5bp; Laubach 3-4bp; Rachel-Summers ~3-4bp (GE, long run); IMF WEO 2023 0.2-0.4bp | **Panel, strongly** for r*; for the rate PAID on debt ~3bp, still half the model's. Model 6.5bp is above every estimate. |
| Growth pass-through c | 1 | (not stated) | HLW c 1.11/1.13/0.96, LW 1.07 (SE 0.38) [P]; Hamilton et al. 2016 "tenuous"; Lunsford-West 2019 no positive productivity link; Rachel-Smith: growth minor vs saving/investment | **Mixed**: c=1 matches HLW/LW by construction; reduced-form evidence says c<1. Moderate case to cut c to ~0.5 or flag it. |
| World public debt | 90% (2025) -> 93% (2045) | (AE focus) | IMF FM Apr 2026: world 93.9% (2025) -> 100% (2029) -> 102.3% (2031); global primary deficit 1.9-2.2% | **Against model, strongly**: start ~4pp low, and the 2025-31 IMF rise (+8.4pp) is ~3x the model's 20-year rise. |
| AE public debt | (n/a; world 93%) | 110% -> 147% (2045) | IMF: AE 108.0 (2025) -> 114.8 (2031); AE ex-US flat ~93-95; US 123.9 -> 142.1 gross; CBO US held-by-public 99 -> 120 (2036) -> 175 (2056); trend-extrapolated AE 2045 ~130-140 (derived) | **Panel's direction strongly; its 147 level somewhat high** (needs r>g acceleration / AE-ex-US rise). |
| Ageing-borrowing / AI tax base | 25% of transfer rise borrowed; no AI erosion | AI compresses tax base | EC AR 2024: EU age costs +1.2pp by 2070, most by 2045; IMF/Moody's flag labour-tax erosion qualitatively, no baseline quantifies it | Neutral-to-panel, weak: risk is real but unquantified in official baselines. |
| Labour share (level/trend) | ~65% -> 64% by 2045 (47% only in AI-boom) | AI compresses; US NFB < 52.5% by 2030 signpost | US NFB 53.0% (26Q3 prelim), 52.8% (26Q2), record lows, -2.3pp since 25Q1 [P]; ILO world 53.0 (2014) -> 52.4 (2024) [S]; Goldman: ~40% of US decline is measurement; AI causality unproven | **Split**: world trend matches model's slow drift (model, moderately); US data favour panel's signpost, whose 54.4% baseline is stale (now ~0.5pp from threshold). AI attribution: weak evidence either way. |
| Financial repression / YCC by 2045 | Only above 150% world debt (~2070) | 59.5% | Soft repression under way: US bill tilt + buybacks + eSLR relief (eff. Apr 2026) + stablecoin T-bill demand; Japan super-long cuts, BoJ taper slowed; UK long gilts <7% of issuance. No formal G7 YCC since BoJ exit (Mar 2024). | **Panel, moderately** (definition-dependent): the model's world-level trigger cannot see country-level repression already starting. |

Key sources: NY Fed HLW & LW spreadsheets (newyorkfed.org/research/policy/rstar); Dallas Fed WP
2513 r1 (dallasfed.org/research/papers/2025/wp2513); IMF Fiscal Monitor Apr 2026 ch.1 Table 1.2
and exec summary (imf.org); FOMC SEP 2026-09-16 (federalreserve.gov/monetarypolicy/
fomcprojtabl20260916.htm); St. Louis Fed On the Economy May 2026; SF Fed EL Aug 2026; NY Fed
LSE Feb 2026 (global r*) and Apr 2026 (R*-labour share nexus); ECB EB 1/2025 box 8; Mian-Straub-
Sufi NBER w29707; IMF WEO Apr 2023 ch.2; Auerbach-Gale Brookings/TPC Mar 2026; CRFB on CBO
LTBO 2026; BLS TED 2026-09-15 and Productivity & Costs 2026-11-05; ILO WESO May 2025 update;
Fortune 2026-09-16 (Goldman); tipswatch 2026-09-17; DMO remit 2026-27; EC 2024 Ageing Report.
