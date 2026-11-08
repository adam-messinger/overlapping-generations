# Effort 3 (dollar-monetary) - Wave-1 handoff packet

Your own effort's earlier seats only. Other efforts are deliberately withheld.

## Seat: outside-view

**Numbers:** q1={'A': 50, 'B': 37, 'C': 11, 'D': 2} | q2=35 | q3=45 | q4={'p10': 235, 'p50': 410, 'p90': 740} | q5=6 | q6={'p10': 50.1, 'p50': 52.4, 'p90': 54.2} | q7=8

# E3 (dollar-monetary) / outside-view (A1, Wave 1)

**BLUF.** Reference classes say the essay's monetary claims are tail events: explicit yield
pegs by reserve-currency issuers start about 0.5-2% per issuer-year, so Q5 is ~6%, and new
payment instruments after legitimation grow ~15-25% a year in the median, so stablecoins
reach ~$410B (P50) by end-2028, not "near-unlimited". Elsewhere: capex after a >=50% growth
year usually falls or plateaus (Q1 A+B ~87%), the $10B Epoch run is a coin flip on
trend times disclosure (35%), the US+China top-10 holds about as often as not (45%), the
labor share follows its own 4-year change distribution (P50 52.4%), and a 10% three-year drop
in the Indian big-5 has never happened in the aggregate (8%).

Lens discipline: no episode-specific mechanism. Each answer is a base-rate frequency with its
window and source, adjusted only for the arithmetic in the baselines (levels, required growth
rates, time remaining). Forecast origin 2026-11-08.

---

## Q1: Big-4 capex, CY2030 / CY2026 (centre of gravity for E1; reached here by base rate)

**Reference class:** sector capex in the 4 years after a year of >=50% growth (R = capex in t+4 / capex in t).

| Episode (boom year t) | Approx. R = t+4 / t | Source / caveat |
|---|---|---|
| Semiconductors 1984 (capex roughly doubled) | ~1.1-1.2 | IC Insights capex history, as summarised at [AnySilicon](https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/) (gives growth rates and decline years, not dollar levels; my level reading is approximate) |
| Semiconductors 1995 | ~0.85 | same; 1997-98 was a double-digit decline period |
| Semiconductors 2000 (~$62-64B, record) | ~0.7 (2004 ~$45B) | Gartner Dataquest 2001 forecast (2001 $47.3B, -26%; actual ~$44.4B, -29%), [Lightwave](https://www.lightwaveonline.com/business/market-research/article/16659882/gartner-dataquest-forecasts-decline-in-worldwide-semiconductor-spending); 2003 $29.7B and 2004 $44.8B are from an unattributed secondary source, treat as unverified |
| Semiconductors 2010 (+~100% after 2009) | ~1.2 | IC Insights: "the 2010 rebound after the 2008-2009 downturn as the lone exception" to the stronger-second-year pattern; 2012-13 double-digit declines |
| US telecom/fibre carriers 2000 | ~0.4-0.5 | standard telecom-bust record (from memory, not re-sourced here) |
| Upstream oil and gas 1980-81 | ~0.6 | 1980s oil bust (from memory, not re-sourced here) |
| US railroads 1880-82 (track miles built +40-46%/yr) | ~0.7-1.1 | 1880s railway mania; below the 50% threshold, so a weak member of the class |

Frequency in this small sample (n~7, approximate levels): R < 1 in about 4/7; 1 <= R < 2 in
about 3/7; R >= 2 in 0/7. IC Insights also counts six double-digit capex declines in 1983-2015
(1985-86, 1992, 1997-98, 2001-02, 2008-09, 2012-13): roughly one every 5 years, so a 4-year window
after a peak growth year almost always contains one.

**Arithmetic adjustment.** CY2026 (~$720-745B on guidance vs ~$410B CY2025, +~76%) would be the
third consecutive >=50% year (CY2024 was ~+60% on the cash-flow lines). In the class, the
episodes that broke hardest (telecom 2000, semis 2000) were the late years of multi-year booms,
so this nudges toward A, not away from it. The tiny sample has no R >= 2 case; I keep mass in C
and D for small-sample humility (rule of succession), not because of any mechanism.

**Answer:** A 50, B 37, C 11, D 2.

## Q2: An Epoch-estimated training run >= $10B, published by 2028-12-31

**Reference class:** trend-extrapolated cost/compute milestones and whether they arrived on time.

- TOP500 1 TFLOP (1997) and 1 PFLOP (2008) arrived on the trend line; 1 EFLOP, extrapolated for
  ~2018-19, arrived in 2022 (late, the trend bent ~2013).
- Intel node cadence: 10nm targeted ~2016, shipped in volume ~2019 (late).
- $1,000 genome: roughly on time (~2014-15). Battery packs $100/kWh: roughly on time.
- Rough frequency: ~half of mature-trend milestones arrive within a year of the extrapolated date.
  (These are from memory as a class; I did not re-source each.)

**Arithmetic content.** Epoch's own largest estimate in hand is Grok 4 at ~$490M (July 2025;
Epoch rates the underlying 5e26 FLOP figure as *speculative*:
[Epoch data insight](https://epoch.ai/data-insights/grok-4-training-resources)). Reaching $10B by
2028-12-31 is 20x in ~3.45 years = ~2.4x/yr, which is exactly Epoch's earlier central cost trend
(2.4x/yr, [Cottier et al.](https://arxiv.org/pdf/2405.21015), which reports a 95% CI of roughly
2.0-3.1x); at the newer ~3.5x/yr it lands ~$35B. So "on trend" is about the bar, not well clear
of it: ~50% from the class.

**Resolvability haircut (arithmetic of the resolver, not mechanism):** the model must carry an
Epoch headline cost estimate in the 2029-12-31 snapshot; a model whose cost is unknown does not
count. Many recent frontier models lack Epoch compute/cost estimates; I take ~0.7 for "the
largest run gets a published estimate within a year".

**Answer:** 0.5 x 0.7 = **35**.

## Q3: All ten top organizations on LMArena Text US or PRC on 2028-12-31

**Widest reference class:** two-country concentration of the top-10 firms in a frontier
technology. Semiconductors (Korea, Taiwan, Netherlands, Germany always present), aerospace
(Airbus, BAE, Safran, Thales), nuclear vendors (Rosatom, Framatome, KHNP), search engines (Yandex,
Naver, Seznam) never had a US+China-only top 10. Cloud IaaS comes closest. Class frequency: low,
~10-20% of industry-decades.

**The leaderboard's own record (computed from LMArena's published history,
[lmarena-ai/leaderboard-dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset),
`text_style_control`, overall, 194 snapshots 2024-08-28 to 2026-11-06; organizations as labelled,
non-US/PRC = mistral, cohere, AI21, TII, Upstage, Stability):**

| Year | Snapshots | Top-10 all US/PRC |
|---|---|---|
| 2024 (from Aug) | 22 | 0 |
| 2025 | 85 | 18 |
| 2026 (to Nov 6) | 87 | 81 |
| All | 194 | 99 (51%) |

Last violation: 2026-02-10 (Mistral). The current run began 2026-02-11 (~9 months). In the
2026-11-06 snapshot the top 10 are Google, Meta, Anthropic, Moonshot, OpenAI, Alibaba, Z.ai,
Xiaomi, DeepSeek, xAI; ranks 11-14 (Baidu, ByteDance, Tencent, StepFun) are also US/PRC.
Caveat: some April 2026 snapshots carry a blank organization label in the top 10 (anonymous
models), which a resolver would have to adjudicate.

**Combining frequencies.** Wide class ~15%; leaderboard all-history 51%; a Lindy/Gott estimate
for a 9-month-old state still holding 26 months on is ~9/(9+26) = ~26% if it must hold
continuously, higher for a single-date snapshot. Weighted toward the question's own history,
since the arithmetic of the baseline is that the condition holds today with a cushion of four
more US/PRC organizations.

**Answer: 45.**

## Q4: Stablecoin market cap on DefiLlama, 2028-12-31 (centre of gravity)

**Baseline re-verified** from DefiLlama's API ([stablecoins.llama.fi/stablecoincharts/all](https://stablecoins.llama.fi/stablecoincharts/all), summing `totalCirculatingUSD` across pegs): **$294.1B on 2026-11-08**; peak $317.1B on 2026-05-17
(the preamble's ~$322B record is a different aggregation); $305.0B on 2026-01-01. Supply is
*down* ~4% year-to-date. Horizon: ~2.15 years.

**Own-series annual growth (1 Jan to 1 Jan, DefiLlama):** 2021 $27.4B -> 2022 $162.6B (+493%);
2023 $137.7B (-15%); 2024 $130.2B (-5%); 2025 $203.7B (+56%); 2026 $305.0B (+50%); 2026 YTD -4%.
Median of the five full years +50%, but heavily skewed by the 2021 base effect; peak-to-trough
2022-23 was about -22%.

**Reference class: new payment instruments after regulatory legitimation.** ETFs after the 1993
SEC exemptive relief and mobile money (M-Pesa, Alipay) after licensing grew ~25-50%/yr in their
first post-legitimation decade; the EU e-money regime (2000, revised 2009) and Japan's 2022-23
stablecoin licensing produced long stagnation. My read of the class: median ~15-25%/yr, with a
fat lower tail of "legitimated and then flat". (Class members from memory; not re-sourced.)
The post-GENIUS realised rate so far (Jul 2025 $252B -> Nov 2026 $294B) is ~+12%/yr.

**Arithmetic.** 294 x 1.18^2.15 = ~$420B; a 2022-23-style -20% drawdown gives ~$235B; a
~55%/yr path gives ~$750B.

**Answer:** P10 235, P50 410, P90 740 ($B).

## Q5: Fed announces a numerical yield ceiling/target (>=1y maturity) before 2031-01-01 (centre of gravity)

**Reference class: explicit yield pegs among reserve-currency issuers.**

| Episode | Issuer | Maturity / level | Duration |
|---|---|---|---|
| 1942-51 | US (Fed with Treasury) | 2.5% long bond, 3/8% bills | 9 years, ended by the 1951 Accord |
| Sep 2016-Mar 2024 | Japan (BoJ YCC) | 10y ~0% | ~7.5 years |
| Mar 2020-Nov 2021 | Australia (RBA) | 3y 0.25% then 0.1% | ~1.7 years |
| 1945-51 (informal) | UK, Canada | cheap-money support, no announced numerical long-yield target | does not count under Q5's rule |

Issuer-years 1946-2025 for the main reserve issuers (USD, GBP, DEM/EUR, JPY, CHF, CAD, AUD, CNY)
are roughly 400-450; post-war new starts: 2 (Japan 2016, Australia 2020). Rate ~0.5% per
issuer-year. US alone: one start in the Fed's 112 years (~0.9%/yr), none in the 75 years since
the Accord.

**Arithmetic adjustment for the baseline (debt level, not mechanism):** restricted to
issuer-years with public debt above ~100% of GDP (US 1942-50, UK 1945-65, Canada 1945-50, Japan
1997-2025, US 2020-26: ~70 issuer-years), starts are 1-2, i.e. ~1.5-3% per year. Over the 4.15
years to 2030-12-31: 1-(1-0.007)^4.15 = ~3% unconditional; 1-(1-0.02)^4.15 = ~8% high-debt
conditional. Both post-war starts came at the zero lower bound, which the 10y at 5.17% is not;
I do not weigh that (it is mechanism), and stay between the two rates.

**Answer: 6.**

## Q6: BLS nonfarm business labor share, calendar-2030 annual average

**Baseline re-verified.** BLS TED: 52.8% in 2026Q2, "the lowest level ever recorded"; 53.6
(2026Q1), 54.1 (2025Q4), 54.7 (2025Q2); 2019 56.3-57.3; 2020 Q2 spike to 58.9
([BLS TED 2026](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm)).
FRED's index PRS85006173 ([FRED](https://fred.stlouisfed.org/data/PRS85006173)) at the current
vintage shows 2026Q3 at 93.73 vs 2026Q2 94.36; scaled to the 52.8% level, **2026Q3 is ~52.45%**
(my conversion; the Q1 ratio differs slightly across vintages, so +/-0.2pp).

**Reference class: 4-year and decade changes in this series** (computed from the FRED index
1947Q1-2026Q3, scaled to percent):

- Change from a year's Q2 to the annual average four years later (n = 75 overlapping windows,
  1947-2021): mean -0.53pp, SD 1.57; P10 -2.49, P25 -1.66, P50 -0.46, P75 +0.81, P90 +1.33;
  min -4.33 (from the 2020 spike), max +2.68.
- Subset starting within 0.5pp of the running series low (n = 21, heavily overlapping):
  median ~+0.85pp, range -2.71 to +2.68 (mild mean reversion from lows, but 2004-08 kept falling).
- Decade changes in annual averages: P10 -2.95, median -0.93, P90 +0.67, min -6.78.
- For scale: 1980s-2020s the level went ~63 -> ~55; the essay's "forty years in a decade" is
  ~-8pp, below the worst decade in the record.

**Arithmetic.** Start ~52.6 (between the published Q2 52.8 and the revised-vintage Q3 ~52.45).
Weight 0.7 unconditional / 0.3 near-low subset: median change ~-0.2pp. P10/P90 from the
unconditional tails, widened ~0.1pp for first-print/vintage noise.

**Answer:** P10 50.1, P50 52.4, P90 54.2 (%).

## Q7: Indian IT big-5 headcount at 31 Mar 2029 >= 10% below 31 Mar 2026

**Baseline arithmetic.** March 2026: TCS 584,519; Infosys 328,594; HCLTech 227,181; Tech Mahindra
147,623; Wipro ~233-243k (single-source; one article's date looks mistyped) -> combined ~1.52-1.53M
([Business Today on Infosys](https://www.businesstoday.in/amp/technology/story/infosys-headcount-falls-by-over-8400-in-q4-workforce-at-328594-527161-2026-04-23),
[Angel One on TechM](https://www.angelone.in/news/stocks/tech-mahindra-share-price-in-focus-headcount-falls-by-1-993-in-q4fy26-attrition-rate-eases),
[IANS on FY26](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000):
the five fell a combined 7,389 in FY26 after +12,718 in FY25). Threshold: ~1.37M, a ~150k cut.
30 Sep 2026 figures in the preamble sum to ~1.55M, so the path must fall ~11% from today in 2.5
years (~-4.5%/yr).

**Reference class: multi-year headcount declines at large IT/BPO employers.**
- The big-5 aggregate itself: deepest 3-year fall on record is Mar 2023 (~1.59M) -> Mar 2026
  (~1.52M), about -4 to -5%. Zero >= 10% 3-year declines in ~25 years of the aggregate.
- Single firms do it: IBM ~2012-15 (~-13%), CSC/DXC (several), Unisys (1990s), Wipro Dec 2022 ->
  Mar 2025 (~-10%). Firm-level frequency among large IT-services employers: ~15-20% of 3-year
  windows (from memory; not re-sourced firm by firm).
- Sector aggregates do it rarely: US computer-systems-design employment after 2001 (~-15%
  peak-to-trough) is the one clear case in ~35 years: ~3-5% of 3-year windows.

An aggregate of five firms behaves like a sector, not a firm. Class rate ~5%, nudged up for the
current downward drift (FY26 negative, TCS -23,460) and down for the latest quarter's rebound
(+13,918).

**Answer: 8.**

---

## Sources (primary where available)

- DefiLlama stablecoin API: https://stablecoins.llama.fi/stablecoincharts/all
- BLS TED, labor share 52.8% in 2026Q2: https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm
- FRED PRS85006173 (index, used only for changes, scaled to the BLS percent level): https://fred.stlouisfed.org/data/PRS85006173
- BLS MLR, estimating the US labor share: https://www.bls.gov/opub/mlr/2017/article/estimating-the-us-labor-share.htm
- LMArena leaderboard history: https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset
- Epoch, Grok 4 training resources: https://epoch.ai/data-insights/grok-4-training-resources
- Cottier et al., rising costs of frontier training: https://arxiv.org/pdf/2405.21015
- IC Insights capex history via AnySilicon: https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/
- Gartner Dataquest 2001 capex forecast via Lightwave: https://www.lightwaveonline.com/business/market-research/article/16659882/gartner-dataquest-forecasts-decline-in-worldwide-semiconductor-spending
- Indian IT headcount: Business Today, Angel One, IANS links above

Caveats carried forward: Q1 levels for several class members are approximate and partly from
memory; Q2's Grok 4 compute is rated *speculative* by Epoch; Q4's own-series growth median is
dominated by small-base years; Q6's percent conversion from the FRED index is mine and vintage
sensitive; Q7's Wipro March 2026 figure rests on one source.

## Seat: fermi

**Numbers:** q1={'A': 22, 'B': 46, 'C': 28, 'D': 4} | q2=17 | q3=86 | q4={'p10': 225, 'p50': 390, 'p90': 680} | q5=7 | q6={'p10': 49.6, 'p50': 52.0, 'p90': 54.6} | q7=15

# E3 (dollar-monetary) x fermi (A2, Wave 1, sim-enabled seat)

**BLUF.** When I break each claim into its parts, the essay's monetary leg looks weak on a 2028-2030 horizon. Stablecoins have been flat for all of 2026 despite the GENIUS Act: $294B on 2026-11-08 against $306B at end-2025. My decomposition puts end-2028 at a median of about $390B, which is growth, not "near-unlimited" demand. A numerical Fed yield cap before 2031 needs a chain of events whose product is about 7%. Every other answer is a product of components (shown below). The simulation is used only where the adapter allows it (directional for Q1/Q5/Q6), and its numbers are never adopted.

Forecast origin 2026-11-08. All web numbers below were pulled on 2026-11-08 unless stated.

---

## 0. The adapter I used (published as required)

- **Spec:** `docs/forecasts/commanding-heights-2026/adapter-spec.json` (scenarios `baseline`, `ai-energy-boom`, `debt-populism`; variants `lever:dc-fast`, `lever:dc-fast-ai-payoff`, `lever:repression-2pp`).
- **Command (re-run by this seat):** `npx tsx scripts/tetlock-sim-adapter.ts --spec=docs/forecasts/commanding-heights-2026/adapter-spec.json`
- **Reproducibility:** the working tree HEAD is `e319e77`, but the spec's vintage disclosure names `46df211`. My re-run printed numbers identical to `adapter-output.md` in every row, so the vintage difference does not touch these readings.
- **Statuses obeyed:** Q2, Q3, Q4 and Q7 are **REFUSED**, and I take no model number for them. Q1, Q5 and Q6 are **DIRECTIONAL**: I use sign and rough size only, never a level or a point estimate.
- **Disclosures carried forward (verbatim excerpts):**
  - "Treat every datacenter-capex LEVEL as understated; use growth rates only, and only directionally."
  - DC capex "is not the Big-4's cash capex; it has no lab, no hyperscaler and no stock market."
  - Labor share "2025 level ~0.65, NOT comparable to BLS 52.8% ... Use the change across runs only."
  - "NO MONETARY BLOCK: no price level, no Fed, no yields, no stablecoins."
  - The safe rate "is not a policy rate or a market yield. There is no term premium. Use CHANGES, never the level."

| Directional reading | baseline | ai-energy-boom | debt-populism | dc-fast | dc-fast-ai-payoff | repression-2pp |
|---|---|---|---|---|---|---|
| Q1 world DC-capex CAGR 2026-30, %/yr | 12.8 | 20.2 | 12.3 | 39.2 | 39.4 | 13.7 |
| Q1 implied 4-yr ratio (1+g)^4 (my arithmetic, directional) | ~1.62 | ~2.09 | ~1.59 | ~3.76 | ~3.78 | ~1.67 |
| Q1 total investment CAGR, %/yr | 3.6 | 3.6 | 2.7 | 3.6 | 3.5 | 3.3 |
| Q5 world public debt/GDP 2030 | 0.889 | 0.887 | 1.073 | 0.890 | 0.883 | 0.804 |
| Q5 repression gap 2030, pp | 0 | 0 | 0 | 0 | 0 | 2.0 (forced) |
| Q5 real safe-rate change 2026-30, pp | +0.17 | +0.19 | +0.80 | +0.17 | +0.21 | -0.09 |
| Q6 labor-share change 2026-30, pp (world, model units) | -0.11 | -0.75 | -0.11 | -0.11 | -1.92 | -0.11 |
| Q6 labor-share change 2026-36, pp | -0.35 | -3.50 | -0.34 | -0.35 | -13.97 | -0.36 |

---

## Q1: Big-4 cash capex ratio R = CY2030 / CY2026

**Denominator (CY2026, cash-flow PP&E lines, excluding finance leases).** These are component estimates, not transcript-verified:

| Company | Guidance headline | Cash-line adjustment | Cash PP&E CY2026 (est.) |
|---|---|---|---|
| Alphabet | $195-205B (baseline table; one secondary source says $180-190B) | none (cash line) | ~$195B |
| Amazon | ~$220B "cash capex" | gross purchases line slightly above net-of-incentives | ~$225B |
| Microsoft | ~$170B CY (other sources say $175-190B); headline INCLUDES finance leases | cash share ~60% (FY2025 pattern recalled: ~$65B cash of ~$88B incl. leases; not re-verified) | ~$105B |
| Meta | $135-145B incl. finance-lease principal | lease principal small | ~$138B |
| **Sum** | | | **~$665B (range ~$630-700B)** |

The 2030 thresholds this implies: A < ~$665B; B ~$665B-$1.33T; C ~$1.33T-$2.66T; D >= ~$2.66T.

**Path decomposition (median).**
- 2027: +30%. Alphabet guided a "significant increase" for 2027 ([Yahoo/Fortune, Apr 2026](https://fortune.com/2026/04/29/microsoft-meta-google-ai-capex-spending-billions/)), and Microsoft guided growth.
- 2028: +15%; 2029: +5%; 2030: 0%.
- Product: R = 1.30 x 1.15 x 1.05 x 1.00 = **1.57**.

**Financing arithmetic (the E3 lens).**
- Big-4 operating cash flow is roughly $580B in 2026 (MSFT ~150, GOOGL ~165, AMZN ~145, META ~120; my estimates). Capex/OCF is therefore ~1.15 already. Amazon's trailing free cash flow was **-$42.4B**, driven by a $94.8B year-on-year rise in net PP&E purchases ([Universal Asset Owners](https://www.universalassetowners.com/newsroom/hyperscaler-q3-capex-debt-equity-leases/)).
- R = 2 means ~$1.33T in 2030. Against OCF growing ~15%/yr to ~$1.0T, that requires ~$300B+/yr of external financing. The 10-year Treasury is at **5.1-5.3%** ([Trading Economics](https://tradingeconomics.com/united-states/government-bond-yield/news/591950)) and touched 5.30% on 2026-09-30, its highest since 2002 ([247wallst](https://247wallst.com/investing/2026/10/01/the-10-year-yield-just-broke-its-2007-peak-here-is-what-comes-next/)). At those rates, that financing is expensive.
- The cheaper route is off-balance-sheet: SPVs, JVs and leases. That route moves spending **out of** the Q1 cash line, a structural downward bias on measured R relative to economic capex.

**Physical check.**
- At ~$45-50B all-in per GW, $665B buys ~13-15 GW a year.
- R = 4 would mean ~55 GW a year for four firms by 2030. That is implausible against gas-turbine and transformer backlogs. D is a thin tail.

**Distribution.**
- I model ln R ~ N(ln 1.57, 0.55). That gives P(R<1) = 0.21, P(R<2) = 0.67 and P(R<4) = 0.955.
- I nudge A up for bust bimodality (telecom 2000-02 fell ~50-60% peak to trough) and for the leasing shift.

**Model (directional only).**
- The model's endogenous world DC capex grows ~13%/yr (baseline), implying R ~1.6, and ~20%/yr (ai-energy-boom), implying R ~2.1. Only the forced `dc-fast` lever reaches ~3.8.
- Sign: positive growth. Rough size: plateau-to-low-growth band.
- **Disagreement with the baseline:** observed Big-4 capex rose ~+75% from 2025 to 2026, against the model's ~13%/yr. The model's datacenter demand is braked by a willingness-to-pay ceiling on the power bill and has no equity market, lab race or credit block (see the disclosure). It cannot represent expectations-driven capex, so I do not adopt its number. I use it only as corroboration that, absent financial exuberance, the fundamentals-led pace sits in B.

**Q1: A 22, B 46, C 28, D 4.**

---

## Q2: Epoch $10B training run published by 2028-12-31 (adapter: REFUSED, so no model number)

**Unit facts from Epoch's own data** ([notable_ai_models.csv](https://epoch.ai/data/notable_ai_models.csv), pulled 2026-11-08).
- The headline column is **"Training compute cost (2023 USD)"**: constant 2023 dollars, not nominal.
- The most expensive entry is **Grok 4 at $388M** (5e26 FLOP, Jul 2025). Next are GPT-4.5 at $366M and Grok 3 at $218M.
- Grok 4's "upfront" hardware column reads **$10.7B**. That is hardware acquisition, not the headline training cost. It is a resolver trap: it must not count.
- The largest compute entry is **GPT-6 Astra at 9.4e26 FLOP** (2026-09-03), and it has **no headline cost**.
- Only 8 notable 2025 models and 1 notable 2026 model carry a headline cost. Coverage is thin.

**Implied unit cost.** $388M / 5e26 FLOP = **$0.78 per 1e18 FLOP** (2023 USD, mid-2025). I assume cost per FLOP falls ~1.4x a year.

**FLOP needed for $10B by late 2028.**
- $10B nominal is ~$8.7B in 2023 USD (assuming ~15% cumulative CPI 2023-28, given hot 2026 inflation).
- Unit cost at mid/late 2028 = 0.78 x 1.4^-3.2 = ~$0.27 per 1e18 FLOP.
- Required compute = 8.7e9 / 2.7e-19 = **~3.2e28 FLOP**.
- That is ~34x the GPT-6 Astra run, and it must be trained by ~mid-2028 so that it is **published** by 2028-12-31.

**Compute trend.**
- The historical frontier trend is ~4-5x a year. The observed max in Epoch's data grew only ~1.9x from Jul 2025 to Sep 2026, though that observation is lagged and censored by thin coverage.
- Over ~1.8-2.0 effective years at 4.5x a year, the frontier grows ~15-20x, to a median of ~1.6e28 at publication.
- With ln-sd 1.0, P(>= 3.2e28) = P(z > ln 2 / 1.0 = 0.69) = **~0.25**.

**Power sanity check.**
- 3.2e28 FLOP in ~1.3e7 s needs ~2.5e21 FLOP/s.
- At 40% MFU on ~1e16 FLOP/s per Rubin-class chip, that is ~600k chips, or ~1.2-1.5 GW.
- That is feasible on the 1-2 GW sites being built (Stargate Abilene, Colossus 2, Hyperion), so the run is not physically excluded.

**Combination.**
- P(Epoch posts a headline cost by 2029-12-31 | the run exists) = ~0.55. Of the 2025 frontier runs, Grok 3, Grok 4 and GPT-4.5 have one; GPT-5 and GPT-6 Astra do not.
- 0.25 x 0.55 = 0.14, plus ~3pp for a resolver reading a non-headline column = **~17%**.

**The essay's arithmetic gap.** The essay's "$1B in 2026" is not in Epoch's headline units. GPT-6 Astra at 9.4e26 FLOP x ~$0.53/1e18 comes to ~$0.5B in 2023 USD. Starting from half the base, the essay's 3.5x/yr line reaches $10B about half a year later than it claims, which is right at the deadline.

**Q2: 17.**

---

## Q3: LMArena top-10 organizations all US/China on 2028-12-31 (adapter: REFUSED)

**Current state** (LMArena's own [leaderboard dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset), config `text_style_control`, split `latest`, published **2026-11-06**, category `overall`). The distinct organizations in order are:

1. google
2. meta
3. anthropic
4. moonshot
5. openai
6. alibaba
7. zai
8. xiaomi
9. deepseek
10. xai
11-19. baidu, bytedance, tencent, stepfun, thinky (Thinking Machines, US), meituan, minimax, reflection (US), amazon
20. **mistral** (first non-US/China organization; rating 1426.5 vs the 10th organization's 1474.7, a gap of ~48 points)
21. nvidia
22. **upstage** (Korea)

So 20 US/China organizations currently sit ahead of the first outsider.

**Decomposition of the failure modes.**

| Failure path | P by end-2028 |
|---|---|
| Mistral (France) climbs ~48 points relative to the 10th-best US/China org and leapfrogs 10 orgs | ~5% |
| A sovereign or other outsider enters the top 10 (Gulf G42/Humain with US compute deals, Korea's sovereign-AI program, Japan SoftBank/Sakana, India Sarvam, Canada Cohere) | ~4% |
| An HQ classification event (a Chinese lab redomiciles to Singapore, a JV with an ambiguous ultimate parent, a resolver mislabel) | ~3% |

P(all ten US/China) = 0.95 x 0.96 x 0.97 = **~0.885**. I shade this to 86 for the unmodelled churn of a 2-year leaderboard. Ratings within ~10 points move positions quickly; the CIs on the dataset run about +/-5-9 points.

**Resolver note.** `lmarena.ai/leaderboard/text` now 301-redirects to **arena.ai**. A rebrand is not a discontinuation; the same publisher's successor page applies.

**Q3: 86.**

---

## Q4: Stablecoin market cap (DefiLlama) on 2028-12-31 (adapter: REFUSED; centre of gravity for E3)

**Baseline from DefiLlama's API** ([stablecoincharts/all](https://stablecoins.llama.fi/stablecoincharts/all), [stablecoins](https://stablecoins.llama.fi/stablecoins)).

| Date | Total supply |
|---|---|
| end-2019 | $4.2B |
| end-2020 | $27.1B |
| end-2021 | $163.3B |
| end-2022 | $137.8B |
| end-2023 | $130.5B |
| end-2024 | $204.2B |
| end-2025 | $305.7B |
| 2026-05-17 (peak) | $317.1B |
| 2026-10-31 | $300.7B |
| **2026-11-08** | **$294.1B** |

- The API total runs ~1.5% below the dashboard headline: the press quoted a $322B record ([Crypto Briefing](https://cryptobriefing.com/stablecoin-market-record-322-billion/)) where the API maximum is $317B. I treat the dashboard as about $299B today.
- Composition today: USDT $176.8B (down from $184.2B a month earlier), USDC $70.6B, USDS $5.6B, USDe $4.9B, DAI $4.7B, USD1 $3.4B, PYUSD $2.8B, USDG $2.7B, RLUSD $2.7B, BUIDL $1.8B.
- **2026 is flat to down, about -4% year to date**, even though the GENIUS Act was signed in July 2025. Regulators missed the 2026-07-18 rulemaking deadline, but the Jan 18 2027 effective date stands ([The Block](https://www.theblock.co/post/408843/us-regulators-miss-genius-act-deadline)). Legitimation has not, so far, produced acceleration.

**Monetary mechanism.**
- The Act bars issuers from paying interest. A stablecoin is therefore a zero-yield dollar competing with T-bills and money-market funds at roughly 4-5%, while long yields are at a 2002-era high and the Fed is weighing hikes against ~3.5-4% inflation ([Fortune](https://fortune.com/2026/08/01/fed-chair-kevin-warsh-credibility-shock-rate-hikes-inflation-yield-curve/)).
- In 2022-23, when rates rose, supply fell from $163B to $131B. High opportunity cost is a headwind on the savings use. It does not touch the transaction and collateral uses.

**Fermi decomposition.** Component shares are my judgment, not measured.

| Component (Nov 2026) | Size | Driver to end-2028 | Median x | P10 x | P90 x | Median $B |
|---|---|---|---|---|---|---|
| C1 crypto trading and DeFi collateral (~55%) | $162B | crypto market factor F_c. End-2028 is ~8 months after the Apr-2028 halving; in the analogous 2024 window supply rose +28% in 8 months | 1.25 | 0.65 | 2.3 | 202 |
| C2 EM dollar savings and P2P/remittance (USDT on Tron etc., ~25%) | $74B | structural ~20%/yr | 1.48 | 1.10 | 2.0 | 110 |
| C3 US-regulated payment and institutional (~15%) | $44B | GENIUS go-live Jan 2027; bank, fintech and platform issuers; capped by the interest ban | 2.0 | 1.2 | 5.0 | 88 |
| C4 synthetic and yield-bearing (USDe, USDS, ~5%) | $15B | F_c | 1.25 | 0.6 | 2.3 | 19 |
| **Total** | **$295B** | | | | | **~419** |

**Assumed correlations.** C1 and C4 move together (rho ~1). C2 correlates with C1 at ~0.4. C3 correlates with the rest at ~0.2.
- The sum of the P10s is ~$248B. With a Tether-specific tail (~60% of supply; the foreign-issuer and non-compliant offering deadline falls around July 2028, before resolution), I set **P10 at $225B**.
- The sum of the P90s is ~$776B. Imperfect correlation pulls that down to **~$680B**.
- I shade the median from $419B to **$390B** because 2026 shows zero momentum. A flat 11 months after legitimation is evidence against C3's recovery assumption.

**The essay test.** "Near-unlimited demand" would need something like $1T+ by 2028, i.e. ~3.4x in 2.15 years (~77%/yr). I put that above my P90, under 5%.

**Q4: P10 225, P50 390, P90 680 ($B).**

---

## Q5: Fed or Treasury numerical yield ceiling on >=1-year Treasuries before 2031 (adapter: DIRECTIONAL; centre of gravity for E3)

**Current conditions.**
- The 10-year was ~5.1-5.3% in October 2026, with a 30-year high of 5.33% (search snippets: [Trading Economics](https://tradingeconomics.com/united-states/government-bond-yield/news/591950), [Fool](https://www.fool.com/investing/2026/08/22/treasury-bond-intervention-nightmare-kevin-warsh/)).
- Inflation was 4.2% in May and 3.5% in June (search snippet, not verified against the BLS CPI release).
- Warsh has chaired the Fed since 2026-05-22 and talks of "regime change". Hikes are being priced.
- The Treasury doubled long-end **buybacks**, which are excluded from the question.
- An LPL note discussing a "modern Fed-Treasury Accord" exists; I saw only a search snippet because the page returned 403. It frames YCC as a risk, with Warsh's balance-sheet hawkishness implying "initial restraint".

**Pathways (independent-ish; overlap subtracted at the end).**

| Path | P(trigger by 2030) | P(numerical >=1y yield cap \| trigger) | Product |
|---|---|---|---|
| 1. Acute Treasury-market/fiscal stress (10y > 6%, disorderly auctions). The Fed's playbook is unlimited purchases without a stated level, as in March 2020 and the BoE's 2022 gilt operation | 0.28 | 0.12 | 3.4% |
| 2. Political: a formal new Treasury-Fed accord that names a yield level (Warsh's "accord" talk is about shrinking the balance sheet, the opposite direction) | 0.25 | 0.08 | 2.0% |
| 3. Recession to the zero lower bound, then RBA-2020-style YCC on 2-3 year tenors | 0.12 | 0.15 | 1.8% |
| 4. War finance, 1942-style (e.g. a Taiwan conflict) | 0.05 | 0.20 | 1.0% |
| Sum | | | 8.2% |
| Minus overlap | | | **~7%** |

**Why the conditional probabilities are low.**
- With inflation above target, a yield cap is the most inflationary tool available. It is also exactly what a hawkish chair was appointed to avoid before 2030. Warsh's chair term runs to 2030.
- The 1942 peg came with price controls and wartime consent. The Fed's 2019-20 framework review considered YCC and rejected it for long tenors.

**Model (directional only).**
- World public debt/GDP in 2030 is 0.89 in the baseline and 1.07 under debt-populism. The model's fiscal-dominance trigger (150% world debt) **does not bind in any scenario by 2030**; the repression gap is 0 unless forced.
- Sign: no structural repression pressure by 2030. Rough size: the real safe rate changes by only +0.2 to +0.8pp.
- **Disagreement with the baseline:** the observed US 10-year has risen about a full point since 2025. The model has no term premium, no inflation, no Fed and no US-specific fiscal path (a world aggregate). The model therefore under-represents the US-specific pressure. That pushes me **up** from where the model alone would put me (~3-4%), not down. I do not adopt the model's number.

**Q5: 7.**

---

## Q6: BLS nonfarm business labor share, calendar-2030 average (adapter: DIRECTIONAL)

**Series facts** ([BLS TED, 2026](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm); [P&C release, 2026-11-05](https://www.bls.gov/news.release/archives/prod2_11052026.htm)).
- The share was "generally in the range of 60 to 66 percent" for much of the postwar period.
- It was 62.8 in 2000Q4, 56.2 in 2010Q1, 58.9 in 2020Q2 (the recession spike), 54.1 in 2025Q4 and 53.6 in 2026Q1.
- The **2026Q3 preliminary is 53.0%, "the lowest level in the series"**. That implies the Nov-5 revision (which revised data back to 2021) **moved Q2 up from 52.8%**: the baseline row in the preamble is stale.
- Q2 real hourly compensation was -1.9% (annualized), so the inflation spike is squeezing the share.

**Decomposition from L0 = 53.1 (late 2026) to the 2030 average (~3.75 years).**

| Component | Median | P10-P90 range |
|---|---|---|
| (a) Pre-AI structural drift: 2000-25 slope -0.33/yr, 2010-25 slope -0.10/yr, blend -0.2/yr | -0.75 | -1.2 to -0.3 |
| (b) AI-specific shift to capital. Model directional: world share -0.1pp (no AI payoff), -0.75pp (ai-energy-boom), -1.9pp (AI payoff on) over 2026-30. Sign negative; size 0 to ~2pp | -0.6 | -2.0 to 0 |
| (c) Cycle. Real-wage catch-up as inflation normalizes (+0.3 to +0.8). A 2029-30 recession (p ~0.25) adds +1.5 to +2.5 in that year (2001: +1.8; 2020: +2.4) | +0.3 | -0.2 to +2.0 |
| (d) Revisions before the first 2030Q4 vintage. The latest revision alone moved Q2 by >= +0.2 | 0 | +/-0.5 |
| **Total** | **53.1 - 0.75 - 0.6 + 0.3 = ~52.0** | |

**Tails.** Partly correlated tails give P10 ~49.6 and P90 ~54.6.

**The essay test.** "1980-2020 in a decade" means about -5.5pp (63.4 to ~57.8) over ten years, or ~-2pp by 2030 on top of trend. That puts 2030 at ~50.3, which is near my P15.

**Model disagreement.** The model's baseline barely moves (-0.1pp) because AI cognitive payoff is off by default. The observed BLS share fell ~1.5pp from 2024 to 2026. The model has no inflation, profit-margin cycle or market power, so it cannot produce that. I use it only for the sign of AI's contribution.

**Q6: P10 49.6, P50 52.0, P90 54.6 (%).**

---

## Q7: Indian IT big-5 headcount at Mar-2029 <= 90% of Mar-2026 (adapter: REFUSED)

**Base.** These are reconstructions from press figures, not verified filings.

| Company | Mar 2026 (est.) |
|---|---|
| TCS | ~584.5k (Mar-2025 607,979 less 23,460 over FY26) |
| Infosys | ~325k |
| HCLTech | ~226k |
| Wipro | ~240k |
| Tech Mahindra | ~150k |
| **Combined** | **~1.525M** |

- Sep-2026 is ~1.549M (TCS 598,056; Infosys 332,542; HCLTech 230,339; Wipro 236,328; TechM ~152k).
- The threshold is **<= ~1.373M**, i.e. -11.4% from Sep-2026 and -10% from the base.

**Identity.** Headcount growth = USD revenue growth - revenue-per-employee growth.
- Revenue growth: median 4%/yr, range -2 to 8.
- Revenue-per-employee growth with GenAI delivery gains: median 5%/yr, against a ~2-3% history.
- Net median: **-1%/yr**, so Mar-2029 is ~1.48M (-3%).
- Volatility: the 3-year cumulative standard deviation is ~6.5pp (FY22 ~+12%, FY24 ~-4%; autocorrelated).
- z = (-10 + 3)/6.5 = -1.08, so P = ~14%.
- Fat-tail add for an agentic-coding price deflation on renewals combined with a US recession: +3pp.
- Subtractions: Q3 2026 net **+13,918** shows hiring has resumed, and the series starts ~1.5% above base. The dollar-monetary channel also cuts against decline. INR weakness and the H-1B fee shift work offshore and protect India headcount, and acquisitions add staff to the count. Net: -2pp.

**Q7: 15.**

---

## Correlation and coherence checks

- **Q1 vs Q4.** These are mostly independent. Both load weakly on financial conditions: tight money with 5%+ yields pushes both toward their lower bands.
- **Q5 vs Q4.** A Fed yield cap would be a debasement regime, positively correlated with stablecoin growth. With Q5 at 7%, that joint tail sits inside Q4's P90, not its median.
- **Q6 vs Q7.** Both rest on the same "AI substitutes labour" component (b). I hold both modest: Q6's median AI contribution is -0.6pp, and Q7 is 15%. A world where the essay is right moves both together: Q6 toward ~50 and Q7 toward ~35%.
- **Q1 vs Q2.** A $10B run by 2028 needs the C/D capex world. My P(C+D) of 32% times P(the run happens and Epoch estimates it | C+D) of ~0.45, plus a small B-world contribution, comes to about 17%. This is consistent with Q2.

## Resolver audit notes (from this seat's pulls)

1. **Q6:** the preamble's 52.8% for 2026Q2 has been revised. The 2026-11-05 release calls Q3's 53.0% the series low.
2. **Q2:** Epoch's headline cost column is in **2023 USD**, not nominal. The "upfront" and "hardware acquisition" columns are much larger (Grok 4 upfront $10.7B; GPT-6 Astra hardware $4.2B) and must not be read as the headline.
3. **Q3:** lmarena.ai redirects to arena.ai. LMArena's Hugging Face dataset publishes a `text_style_control` overall board that can serve as the machine-readable resolver.
4. **Q4:** DefiLlama's API total and its dashboard headline differ by ~1-2%. Resolve on the dashboard, as written.

## Seat: signals

**Numbers:** q1={'A': 20, 'B': 38, 'C': 34, 'D': 8} | q2=16 | q3=83 | q4={'p10': 235, 'p50': 370, 'p90': 720} | q5=6 | q6={'p10': 49.3, 'p50': 51.6, 'p90': 54.0} | q7=11

# E3 dollar-monetary / signals (A3, Wave 1)

**BLUF.** The freshest telemetry runs against the essay's monetary claims. Stablecoin supply has
been flat to falling for 13 months: about $294B on 2026-11-08, below the May 2026 peak, with
the steepest weekly drop of 2026 in the week to Nov 7. The Fed under Warsh is *hiking* and
talking about a smaller balance sheet, and Treasury is doing buybacks, which are excluded.
Nothing observable points to a numerical yield peg. On the resolver side there are four
problems. Q2's Epoch "cost" has three columns, and one of them already exceeds $10B. Q4's
DefiLlama history is revised retroactively. Q6's baseline differs across sources. Q7's
acquisition clause is truncated.

Forecast origin 2026-11-08. All URLs were accessed on that date. Where two sources disagree,
both are quoted.

---

## Q4: Stablecoin market cap on 2028-12-31 (centre of gravity)

**Telemetry**

- **Level, from the DefiLlama API.** I summed `totalCirculatingUSD` across all pegs in
  `https://stablecoins.llama.fi/stablecoincharts/all`.
  - **2026-11-08: $294.1B.** USD-pegged is $292.4B, about 99.4%. EUR is $0.85B and RUB $0.58B.
  - The series maximum is **$317.1B on 2026-05-17**.
  - Month-start values:

    | Date | Supply |
    |---|---|
    | Jan-2025 | $203.7B |
    | Jul-2025 | $251.8B |
    | Nov-2025 | $305.5B |
    | Jan-2026 | $305.0B |
    | May-2026 | $314.2B |
    | Aug-2026 | $300.1B |
    | Nov-2026 | $300.1B |

  - **Net change since Nov 2025 is about -4%.** Year-earlier growth was +50% (2025) and +48% (2024).
- **Composition.** These are DefiLlama `stablecoins` endpoint values, latest against the previous month:
  - USDT: $176.8B, from $184.2B
  - USDC: $70.6B, from $73.3B
  - USDS: $5.6B, from $6.8B
  - USD1: $3.4B, from $4.3B
  - The two majors account for the bulk of the outflow.
- **The weekly drop is the steepest of 2026.** Coverage:
  [24/7 Wall St., 2026-11-07](https://247wallst.com/investing/cryptocurrency/2026/11/07/stablecoins-shrank-by-5-billion-in-a-week-can-ethereum-rally-while-money-leaves-crypto/),
  [cryptonews](https://cryptonews.net/news/analytics/33719810/),
  [blockchainreporter](https://blockchainreporter.net/stablecoin-supply-sharpest-week-2026/).
  - **The trackers disagree on the size of the drop.**
    - On DefiLlama, supply fell from $298.24B to **$293.25B (-$4.99B, -1.7%)**.
    - Sentora reported **-$6.02B, to $293.69B** as of Nov 6.
    - The verbatim caveat: the gap exists *"because the two trackers measure supply differently."*
  - The causes offered are possibilities, not findings. The article's own caveats, verbatim:
    - *"The biggest blind spot is the exchange order book."*
    - *"Circle's 143,812 mint events mostly reflect institutional trading and say little about who is buying ETH."*
  - The suggested drivers are DeFi deleveraging, Sky Dollar savings withdrawals, a risk-off move
    (VIX 16.61 -> 28.18 on Nov 5) and market makers "moving into Treasury bills".
- **The earlier 2026 pullback was read as benign at the time.**
  [CoinDesk, 2026-07-12](https://www.coindesk.com/markets/2026/07/12/stablecoin-market-cap-has-shrunk-by-usd10-billion-since-may-but-analyst-sees-no-reason-to-panic)
  reported roughly -$10B since the May peak, including -$7.7B in June. An analyst there framed
  it as *"a relatively small pullback in what we believe is a long-term growth market."*
  That is an opinion, not data.
- **Regulation.**
  - The OCC finalized its GENIUS Act rule on **2026-10-21**. It is effective **2027-01-18**, the
    Act's own effective date. It **keeps the prohibition on issuer-paid yield** (it drops only the
    rebuttable presumption). It also confirms that "payment stablecoin" excludes deposits,
    including tokenized deposits.
    Sources: [Sidley](https://www.sidley.com/en/insights/newsupdates/2026/10/occ-finalizes-regulatory-framework-for-payment-stablecoins-under-genius-act),
    [WilmerHale](https://www.wilmerhale.com/en/insights/client-alerts/20261027-occ-finalizes-genius-act-rule-for-permitted-payment-stablecoin-issuers-easing-several-key-proposed-requirements-and-raising-new-issues),
    [Gibson Dunn](https://www.gibsondunn.com/the-genius-act-occ-finalizes-its-payment-stablecoin-framework/).
  - Gibson Dunn: the OCC is *the only* primary federal regulator to have finalized. *"nearly every
    other implementing rulemaking remains at the proposal stage."* BSA/AML/OFAC rules go to a
    separate Treasury rulemaking.
  - **Tether's US product.** USAT launched in January 2026 with *"a $10 million supply"* (Anchorage
    as issuer, Cantor as custodian). It does not appear among the top 12 by supply today.
    Source: [The Block](https://www.theblock.co/amp/post/387210/tether-officially-launches-made-in-america-usat-stablecoin-as-mass-tradfi-adoption-looms).
  - **The offshore-issuer deadline (USDT is 60% of supply) is unverified.** My search found no
    source on the GENIUS three-year deadline, about July 2028, after which US platforms may not
    offer non-compliant foreign stablecoins. Treat that date as **unverified, from statute
    memory**. If it holds, it falls inside the Q4 window.
- **Rates.** The 10y Treasury yield was 4.84% on 2026-11-05 (FRED DGS10), and the Fed raised
  rates in September (see Q5). A non-yielding token competes with 5%-yielding bills and MMFs, and
  the yield ban is now in final rule. This is a real headwind to "near-unlimited demand".
- **Published forecasts, as reference points rather than telemetry.**
  - [Standard Chartered (Feb 2026)](https://www.theblock.co/news/markets/2026-02-23-stablecoins-could-drive-1-trillion-in-t-bill-demand-giving-treasury-room-to-shift-issuance-standard-chartered-390783)
    kept **$2T by 2028** but cut its forecast of stablecoin T-bill demand to $0.8-1T.
  - JPMorgan's latest available view (Dec 2025) is **$500-600B by 2028**. It called $2T
    "optimistic" ([Bloomberg, Jul 2025](https://www.bloomberg.com/news/articles/2025-07-23/stablecoin-2-trillion-forecast-is-optimistic-jpmorgan-says)).
  - Bessent: "could surpass $2T by end-2028", said in mid-2025. I found no 2026 revision from Treasury.
  - Every one of these forecasts predates the 2026 stall.

**My read.** Momentum is at zero or negative, the yield ban is locked, and rates are high. The
offshore-USDT deadline falls inside the window. The upside rests on GENIUS going live in
January 2027 and bank or fintech issuers ramping up. My P50 implies about +12%/yr from today,
compounded over 25 months. That is well below the 2024-25 pace and above the 2026 pace.
**P10 $235B / P50 $370B / P90 $720B.**

## Q5: A numerical yield ceiling or target before 2031 (centre of gravity)

**Telemetry**

- **No official announcement exists.** Every "accord" or YCC source is commentary.
  - Warsh's accord idea, as reported by [investingLive](https://investinglive.com/centralbank/warshs-fedtreasury-accord-idea-sparks-debate-over-independence-and-markets-20260208/)
    and [ABN AMRO](https://www.abnamro.com/research/en/our-research/kevin-warshs-reverse-operation-twist),
    centres on a **smaller balance sheet and a shift toward bills**. That is a "reverse operation
    twist", which works against capping long yields.
  - The search summary's caveat: sources *"disagree on whether this amounts to yield caps"*.
    *"The Fed and Treasury also did not respond to questions about whether Warsh and Bessent had
    coordinated."*
- **The Fed is tightening, not pegging.**
  - It made a unanimous hike in September 2026, its first in three years
    ([CNBC 2026-09-16](https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html)).
  - At its Oct 28 hold (3.75-4.00%), **two officials dissented in favour of another hike**
    ([CNN 2026-10-28](https://www.cnn.com/2026/10/28/business/live-news/federal-reserve-interest-rate-october)).
  - Warsh has said the bond market would "do some of the Fed's tightening".
- **The strongest pro-YCC signal is one person's interpretation.** [Fortune, 2026-11-01](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/)
  quotes Robin Brooks (Brookings), who calls the Fed's moves *"yield curve management"* and
  *suspects* a de facto accord.
  - His evidence is Bessent's surprise **long-bond buyback** (excluded by Q5) and a **yen
    intervention**.
  - Fortune reports **no official statement by Warsh or the Fed setting a yield target**.
  - Fiscal context from the same piece: FY2026 net interest **exceeded $1T**; publicly held debt
    is about 100% of GDP; in BofA's high-yield scenario the effective rate on the debt exceeds
    nominal GDP growth from FY2028.
- **The yield path, from FRED DGS10.**
  - 5.17% on 2026-09-25, the essay's figure, which I verified.
  - 5.31% on 2026-10-05, the FRED peak. The
    [Senate Banking letter, 2026-10-07](https://www.banking.senate.gov/imo/media/doc/20261007lettertobessentreyields.pdf)
    gives **5.34% on Sep 30**, *"highest level since 2002"*. Both are first prints; the sources
    differ by a few basis points.
  - **4.84% on 2026-11-05.** The 30y was 5.25% the same day.
  - The [Treasury buyback](https://www.nbcnews.com/business/economy/bonds-bessent-treasury-debt-repurchase-rcna593319)
    had an effect reports dispute: one says 4.68% fell to as low as 4.63%; The Hill says the 10y
    was *higher* (4.73%) by the following Friday.
- **Politics.** Democrats won both chambers on 2026-11-03
  ([OPB/NPR](https://www.opb.org/article/2026/11/04/2026-midterms-democrats-win-the-senate/);
  some races uncalled at publication). Divided government from January 2027 makes the essay's
  route, Congress changing the Fed's mandate to fix yields, less likely before 2029. It also
  raises the chance of shutdown or debt-limit fights, which are the kind of stress that
  triggers emergency operations.

**My read.** Pressure toward fiscal dominance is real and rising: interest above $1T and a 10y
around 5%. But no observable step leads to a *numerical* cap. The chair is hawkish on the
balance sheet, the Committee leans toward hikes, and Treasury is using the excluded tools
(buybacks, issuance mix). The plausible path to Yes is a disorderly Treasury-market crisis in
2028-30 that turns into an emergency cap. **6.**

## Q1: Big-4 capex regime, 2030 against 2026

**Telemetry**

- **Q3 2026 calls** (late October):
  - Microsoft *cut* CY2026 to **$170B** (from $175B).
  - Alphabet held $195-205B but said capex will *"increase significantly in 2027"*. The stock
    **fell about 10%** ([CNBC 2026-10-28](https://www.cnbc.com/2026/10/28/alphabet-googl-earnings-q3-2026.html)).
  - Amazon held about $220B and said it will spend *"meaningfully more in 2027"*
    ([CNBC 2026-10-29](https://www.cnbc.com/2026/10/29/amazon-amzn-q3-earnings-report-2026.html)).
  - Meta narrowed to $135-145B.
  - Third-party 2027 consensus is **Google $284.8B, Amazon $256.5B, Microsoft $207.6B, Meta
    $185.6B ≈ $935B**, about +28% on the headline. Caveat from the search: these are
    *consensus forecasts, not company guidance*, and Q3 figures *"vary by source ... partly
    because of definitions"*. Microsoft and Meta headlines include finance-lease principal;
    Amazon's is pure cash capex.
- **Stress in the market.**
  - The VIX rose **as much as 48%** on Nov 5. It was the biggest one-day jump since April 2025,
    and *"third-biggest jump since 1990"* by one count
    ([24/7 Wall St.](https://247wallst.com/investing/2026/11/06/wall-streets-fear-gauge-just-had-its-third-biggest-jump-since-1990/)).
  - The jump was attributed partly to fears that a Democratic Congress could slow the
    data-centre buildout. Reuters (via [The Star](https://www.thestar.com.my/tech/tech-news/2026/11/07/ai-rout-sets-off-market-alarm-signals-as-traders-brace-for-what039s-next))
    notes the jump was smaller than April 2025 and August 2024.
  - Big Tech free cash flow is reported falling as capex outruns operating cash
    ([shattered.io](https://shattered.io/sp-500-q3-earnings-30-2-percent-big-tech-free-cash-flow-developers-2026/),
    secondary).
- **The scope lock (resolution audit).** The preamble's ~$720-745B sums headline guidance. On
  the locked definition, the Microsoft line excludes finance leases, which have recently been a
  large share of its headline. The CY2026 denominator is therefore likely materially below
  $720B. I did not verify this against filings; my rough guess is $650-690B. A lower
  denominator makes R≥2 slightly *easier*.

**My read.** Every company guides up for 2027, and the telemetry still shows acceleration. But
for the first time stress shows up at the same moment: a stock punished for capex, a guidance
cut, a volatility shock, 5% long rates and a falling FCF cushion. R ≥ 2 needs about 19%/yr
sustained through 2030 on the narrow line. **A 20 / B 38 / C 34 / D 8.**

## Q2: An Epoch model at or above $10B, published by 2028-12-31

**Telemetry, from Epoch's own CSVs** (`https://epoch.ai/data/notable_ai_models.csv` and `frontier_ai_models.csv`, downloaded 2026-11-08)

- **The headline column is `Training compute cost (2023 USD)`.**
  - Maximum: **Grok 4 (xAI, 2025-07-09) at $388M**.
  - Next: GPT-4.5 at $366M and Grok 3 at $218M.
  - **Coverage lag.** Only **1 of 95** 2026-dated notable models has a headline cost (A.X K2, $12M).
    In 2025 it was 8 of 109.
- **The largest run to date has no cost yet.** GPT-6 Astra (OpenAI, 2026-09-03) is estimated at
  **9.4e26 FLOP**, about 1.9x Grok 4's FLOP. Epoch's confidence is *"Likely"*. Its note says
  *"100,000 in 'Hardware quantity' is a lower bound/underestimate"*. Hardware acquisition cost
  is $4.2B, and the headline training cost is **blank**.
- **The observed trend is slower than the essay's.**
  - The headline frontier cost moved about $388M (Jul 2025) to an implied ~$0.6-0.8B
    (Sep 2026), roughly 1.5-2x a year. Epoch's published trend is 3.5x a year (Feb 2026 per
    secondary sources). [CloudZero](https://www.cloudzero.com/blog/cost-to-train-ai-model/)
    and others still cite 2.4x.
  - Reaching $10B in 2023 USD by end-2028 needs about **26x** in roughly 2.3 years. That is
    about 4.1x a year sustained, and Epoch must also *populate* the estimate by 2029-12-31.
- **Resolution audit: material.**
  1. Epoch's headline column is **inflation-adjusted 2023 USD**, not nominal. Q2 says "nominal
     USD", so the resolver must decide whether to inflate. That is about a 10-15% difference by 2028.
  2. Epoch publishes **three** cost columns: 2023-USD amortized, `cloud`, and `upfront`.
     **`Training compute cost (upfront)` already shows $10.7B for Grok 4 (2025)**, and Grok 3's
     `cloud` cost is $850M. If "any method it reports as primary" is read as the upfront column,
     Q2 has **already resolved Yes**. The question should name the column:
     `Training compute cost (2023 USD)`.
  3. A model whose cost is blank on 2029-12-31 does not count (the preamble's rule). Given the
     coverage lag above, this cuts hard against Yes.

**My read, on the headline-column reading.** Growth plus coverage lag gives **14**. Under the
upfront reading it would be about 99, so I lift slightly for resolver risk: **16**.

## Q3: All ten of the LMArena top organizations US or Chinese on 2028-12-31

**Telemetry**

- **Today's top ten distinct organizations.** Source: a third-party mirror,
  [benchleader](https://www.benchleader.com/benchmarks/lmarena_text) (snapshot 2026-11-08,
  results published 2026-11-06). The primary source refused automated fetch, so I did not
  verify against it.

  | Organization | Country | Best rank | Score |
  |---|---|---|---|
  | Google | US | #1 | 1527 |
  | Meta | US | #3 | 1513 |
  | Anthropic | US | #4 | 1505 |
  | Moonshot AI | CN | #19 | 1488 |
  | OpenAI | US | #22 | 1485 |
  | Alibaba | CN | #23 | 1483 |
  | Zhipu AI | CN | #26 | 1482 |
  | Xiaomi | CN | #29 | 1480 |
  | DeepSeek | CN | #37 | 1475 |
  | "SpaceXAI" | US | #40 | 1475 |

  - That is **10 of 10 US or China.** The mirror gives no countries, so the country labels are
    mine.
  - The next distinct organization is Baidu (CN, #51). **No non-US/China organization appears
    in the top 60.** Mistral was not found in any top-60 listing.
  - A secondary summary reports Gemini 4 Carbon at 1528 and notes a conflicting aggregator with
    Argon at 1532. Rankings *"shift with the date and whether style control is applied."*
- **Resolution audit.**
  1. **lmarena.ai now redirects with a 301 to arena.ai** (a rebrand). Under the fallback rule
     this counts as the same publisher's successor, and the question should say so explicitly.
  2. arena.ai returned 403 to automated fetch, so resolution needs a human or an archived capture.
  3. The 10th-place boundary sits inside a **five-way tie at 1475**, ranks #36-#40. Arena
     displays rank with confidence-interval ties, so "ten highest-ranked" is ambiguous whenever
     the 10th place is tied.
  4. The labels as published include "SpaceXAI". The resolver must map labels to an ultimate
     parent: here, SpaceX/xAI, US.

**My read.** There is a wide margin today: no outsider in the top 60, and US-China lab
turnover keeps refilling the list. The risks are a sovereign or European entrant breaking into
roughly the top 40 (Mistral, a Gulf lab, Japan or Korea) and label ambiguity. **83.**

## Q6: The 2030 average of the BLS nonfarm business labor share (percent)

**Telemetry**

- The BLS public API series **PRS85006173** (labor share index, 2017=100):
  - 2025Q1 96.861
  - 2025Q2 96.113
  - 2025Q3 95.254
  - 2025Q4 95.643
  - 2026Q1 95.518
  - **2026Q2 94.362**
  - **2026Q3 93.729 (preliminary, released Nov 5)**
  - Labor share fell about 3.2% in six quarters.
  - Productivity (PRS85006092) grew **+3.6% q/q annualized in Q3**. Unit labor costs fell **-0.7%**.
- **Level in percent.** [TheStreet](https://pro.thestreet.com/market-commentary/q3-productivity-hands-fed-doves-some-ammo-but-workers-share-hits-a-record-low)
  and [Indeed Hiring Lab](https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/)
  report **Q3 2026 = 53.0%**, *"the lowest level in the series, which begins in the first
  quarter of 1947"*.
  - **Q2 was "first reported at 52.9%, was revised to 53.3%".** The preamble's 52.8% does not
    match either figure.
  - The index is consistent with this: 53.0 x 94.362/93.729 = 53.36. The implied 2017 level is
    about 56.5%.
  - Caveats, verbatim:
    - It *"covers the nonfarm business sector only and uses gross value-added output."*
    - It *"runs lower than economywide measures based on national income, but the direction is
      consistent."*
    - Revision history (for productivity, not labor share): the third estimate *"has differed
      from the first by −1.1 to +1.4 percentage points about 80% of the time"*.
- **Resolution audit.**
  1. The BLS API exposes only the **index**. The percent level appears in BLS release text and
     press coverage. The resolver should state the conversion, or name the BLS table that
     carries the percent.
  2. The baseline in the preamble (52.8%) conflicts with both the first print (52.9%) and the
     revision (53.3%).
  3. The 2030 annual average is first published with the 2030Q4 preliminary release, about
     February 2031. That is acceptable under the vintage rule.

**My read.** Extrapolating the six-quarter slope (about -0.65pp a year) gives about 50.6 in
2030. Labor share rises in recessions, though, and this week's AI-equity shock is a live
recession trigger that would lift it temporarily. **P10 49.3 / P50 51.6 / P90 54.0.**

## Q7: Indian IT big-5 headcount down 10% or more, Mar 2026 to Mar 2029

**Telemetry**

- **30 Sep 2026 headcount**, per [Free Press Journal](https://www.freepressjournal.in/business/indian-it-giants-add-14000-employees-in-q2)
  and [Lapaas Voice](https://lapaasvoice.com/tcs-infosys-hcltech-wipro-and-tech-mahindra-add-13918-employees-in-q2-fy27):

  | Company | Headcount |
  |---|---|
  | TCS | 598,056 |
  | Infosys | 332,542 |
  | HCLTech | 230,339 |
  | Wipro | 236,328 |
  | Tech Mahindra | 152,206 |
  | **Total** | **1,549,471** |

- **Q2 FY27 net change: +13,918.**

  | Company | Net change |
  |---|---|
  | HCLTech | +6,450 |
  | Tech Mahindra | +5,446 |
  | Infosys | +4,480 |
  | TCS | +4,258 |
  | Wipro | -6,716 |

- **H1 FY27 net change: +16,055** ([Angel One](https://www.angelone.in/news/stocks/indian-it-stocks-in-focus-top-five-firms-add-16-055-employees-in-h1fy27-but-demand-recovery-remains-uncertain)).

  | Company | Net change |
  |---|---|
  | TCS | +13,537 |
  | Infosys | +3,948 |
  | HCLTech | +3,158 |
  | Tech Mahindra | +1,240 |
  | Wipro | -5,828 |

  - This **implies a 31 Mar 2026 baseline of about 1,533,416**. The 10% threshold is therefore
    about **1,380,074**: a further **~169k (-10.9%) drop from today** in 2.5 years.
  - **Conflict.** Another source gives Q1 FY27 as +5,480, which with Q2 implies H1 = +19,398,
    not 16,055. Angel One itself notes Infosys's Q1 is inconsistent with "nearly flat".
    Company filings are needed.
- Caveats, verbatim:
  - The first-half additions were *"not evidence of a broad recovery in demand"* (Gaurav Vasu,
    UnearthInsights).
  - The figures point to *"a changing hiring mix rather than a broad-based recovery"*.
  - Freshers were 60-65% of net new hiring.
  - AI and cloud skills hiring was up about 16% y/y while *"overall IT hiring declined by 3%."*
  - The full-year FY27 estimate is *"fewer than 30,000–40,000"* net additions.
- TCS fell 23,460 over FY2026 (preamble). That is the largest single-firm decline in the
  telemetry, about -3.9%.
- **Resolution audit.**
  1. The parenthetical *"(Company-reported period-end headcount ...; an acquired firm's staff
     count.)"* is **truncated**. It does not say whether acquired staff are included or
     excluded, and that is material if one of the five makes a large acquisition, or two of
     them merge.
  2. Headcount scopes differ across the five (subsidiaries, BPO). Taking each "as reported" is
     acceptable but should be stated.

**My read.** The current telemetry is net positive, so a 10% fall needs a sharp break: about
-4.5% a year for three years starting now. That is roughly double the worst single-firm year
in the data. **11.**

---

## Resolution-audit summary (for the orchestrator)

| Q | Issue | Severity |
|---|---|---|
| Q2 | Epoch's headline is **2023 USD**, not nominal. Its **upfront** column already shows **$10.7B** for Grok 4. "Any method it reports as primary" must name `Training compute cost (2023 USD)` | **High**: could resolve Yes today |
| Q4 | DefiLlama revises history: the preamble's "$322B record 26 May" against today's API max of $317.1B on 17 May. The dashboard headline (~$290-293B) differs from the API all-peg sum ($294.1B), and Sentora differs again. The 2028-12-31 value must be archived on the day | Medium |
| Q6 | Baseline 52.8% conflicts with the first print (52.9%) and the revision (53.3%). The API carries the index only, so a conversion or table should be named | Medium |
| Q7 | The acquisition clause is truncated. The Mar-2026 baseline is not published as a sum, and the derived values conflict (H1 +16,055 against +19,398) | Medium |
| Q3 | lmarena.ai redirects to arena.ai (rebrand). The 10th place sits in a tie (five at 1475). Organization labels need a parent mapping | Low-medium |
| Q1 | The headline guidance in the preamble includes finance leases. The locked line will be lower | Low (the preamble already flags it) |
| Q5 | Resolvable as written | None |
