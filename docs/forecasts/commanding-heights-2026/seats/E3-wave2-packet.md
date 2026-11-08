# Effort 3 (dollar-monetary) - Wave-2 handoff packet

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

## Seat: bayes

**Numbers:** q1={'A': 43, 'B': 42, 'C': 14, 'D': 1} | q2=26 | q3=62 | q4={'p10': 220, 'p50': 388, 'p90': 685} | q5=5 | q6={'p10': 50.3, 'p50': 52.6, 'p90': 54.5} | q7=8

# E3 (dollar-monetary) / bayes (A4, Wave 2)

**BLUF.** I start from E3's outside-view numbers as the prior and update on the Wave-1 fermi and signals evidence. Three moves come out of it.

- **Q3 moves the most: 45 to 62.** On LMArena, ten US or Chinese organisations stand between the 10th place and the first outsider, so the US/China top ten has a deep cushion.
- **Q4 and Q5 move down a little.** A zero-yield token now competes with tight money, and the offshore-USDT deadline (18 Jul 2028) falls inside the window. The Q4 median drops from 410 to 388 ($B). The Fed is hiking and sits far from the zero lower bound, so Q5 drops from 6 to 5.
- **Everything else stays close to the prior.** Q1 shifts mass from A to B. Q2 falls on Epoch's thin cost coverage. Q6 moves up only because the BLS revision put the starting level ~0.4pp higher.

Nearly every likelihood ratio below is under 2:1, and I say so where I cannot defend more.

Method. Prior = E3 outside-view seat (`seats/E3-wave1-packet.md`). Evidence = the E3 fermi and signals seats only. For each signal I write P(signal | H) / P(signal | not-H) (binaries), or a likelihood vector over bins (Q1, Q4, Q6), then multiply.

Three rules for the evidence:

- **No double counting.** Any signal the outside-view prior already conditioned on is excluded or discounted. That covers the 2026 year-to-date stablecoin fall, the 2026 LMArena run, the FY26 Indian IT decline, and the high-debt conditioning in Q5.
- **Correlated signals are merged** into one likelihood ratio, not multiplied separately.
- **Model outputs and other people's forecasts get LR ~1.** Fermi's adapter readings are directional by its own spec, and the bank forecasts predate the 2026 stall.

LR strength flags:

- **[weak]**: LR within 1.25 of 1.
- **[moderate]**: LR 1.25-2.
- **[>2:1, defended]**: only where I give the reason.

Forecast origin 2026-11-08.

---

## Q1: Big-4 cash capex, R = CY2030 / CY2026

**Prior (outside-view):** A 50, B 37, C 11, D 2. This comes from sector capex after a year of at least 50% growth (n≈7, approximate levels, partly from memory).

| # | Signal (source seat) | P(E\|A) | P(E\|B) | P(E\|C) | P(E\|D) | LR A:C | Flag |
|---|---|---|---|---|---|---|---|
| 1 | All four guide CY2027 up; third-party 2027 consensus ≈$935B headline, about +28%. Caveat: *"consensus forecasts, not company guidance"* (signals, citing [CNBC Alphabet](https://www.cnbc.com/2026/10/28/alphabet-googl-earnings-q3-2026.html), [CNBC Amazon](https://www.cnbc.com/2026/10/29/amazon-amzn-q3-earnings-report-2026.html)) | 0.40 | 0.65 | 0.90 | 0.95 | 0.44 (≈2.25:1 against A) | **[>2:1, defended]** |
| 2 | Stress: Microsoft cut CY26 guidance from $175B to $170B; Alphabet fell about 10% on capex; VIX up as much as 48% on Nov 5; FCF going negative (Amazon trailing FCF −$42.4B); 10y near 5% (signals, fermi). Merged with fermi's financing-gap arithmetic | 0.70 | 0.60 | 0.50 | 0.45 | 1.4 | [moderate] |
| 3 | Fermi: cheap financing runs off balance sheet (SPVs, JVs, leases), which biases the cash line down | 1.10 | 1.05 | 0.95 | 0.90 | 1.16 | [weak] |
| 4 | Fermi physical check: D means ~55 GW/yr for four firms, against turbine and transformer backlogs. Discounted because $/GW inflation raises nominal capex without adding GW | 1 | 1 | 1 | 0.60 | n/a (D only, 1.7:1) | [moderate] |
| 5 | Fermi model, DIRECTIONAL: world DC capex ~13-20%/yr. The model has no equity market or lab race (per its own disclosure) | 1 | 1 | 1 | 1 | 1 | refused (cannot justify >1.2) |
| — | Third consecutive year of at least 50% growth | already in prior | | | | | excluded |

**Defence of signal 1 above 2:1.** In the prior's own reference class, the year after the boom year was flat or down in nearly every R<1 case (semis 2000→2001 −29%, telecom 2001, semis 1985). Here the four firms guide 2027 up by about a quarter. For A to hold from a 2027 at ~1.25x, 2030 must fall more than ~20% below the 2027 peak. Telecom-style busts did fall that far, so A stays live. I set P(E|A) at 0.40, not lower, because in 2000-01 telecom carriers also guided up shortly before cutting. Guidance is not realisation.

**Arithmetic (products of the likelihoods):**
- A: 0.50 × 0.40 × 0.70 × 1.10 × 1 = 0.1540
- B: 0.37 × 0.65 × 0.60 × 1.05 × 1 = 0.1515
- C: 0.11 × 0.90 × 0.50 × 0.95 × 1 = 0.0470
- D: 0.02 × 0.95 × 0.45 × 0.90 × 0.60 = 0.0046
- Sum 0.3572. **Posterior: A 43.1, B 42.4, C 13.2, D 1.3.**

**Q1: A 43, B 42, C 14, D 1.** The forward guidance and the stress signals mostly cancel. The net effect moves ~7pp from A into B.

Scope-lock note: the cash-line CY2026 denominator is probably ~$650-690B, not the $720-745B headline, which includes Microsoft and Meta finance leases. Neither Wave-1 seat checked this against filings. The ratio R is roughly invariant to that only if the lease share stays constant, and signal 3 prices the risk that it does not.

---

## Q2: Epoch headline training cost ≥ $10B, model published by 2028-12-31

**Prior:** 35, built as 0.5 (on trend) × 0.7 (Epoch posts a cost). **Prior odds** 35/65 = 0.538.

| # | Signal | P(E\|Yes) / P(E\|No) | LR | Flag |
|---|---|---|---|---|
| 1 | Coverage is thinner than the prior's 0.7 assumes. Only 8 of 109 2025 models and 1 of 95 2026 models carry a headline cost. GPT-5 and GPT-6 Astra (9.4e26 FLOP, Epoch confidence *"Likely"*; *"100,000 in 'Hardware quantity' is a lower bound/underestimate"*) have no headline cost; Grok 3, Grok 4 and GPT-4.5 do ([notable_ai_models.csv](https://epoch.ai/data/notable_ai_models.csv)). Swapping the 0.7 for fermi's ~0.55 is an odds factor of 0.70 | via component swap | 0.70 | [moderate] |
| 2 | The headline column is **2023 USD**. $10B nominal is ≈$8.7B in 2023 USD if the resolver inflates; if it reads the column as-is, the bar is unchanged | 0.95/0.90 | 1.05 | [weak] |
| 3 | The observed frontier maximum grew only ~1.9x in FLOP from Jul 2025 to Sep 2026 (~1.5-2x/yr in cost), against Epoch's 3.5x/yr trend. Caveat (fermi): *"lagged and censored by thin coverage."* The frontier maximum is lumpy: GPT-4 held the record for ~2 years before Grok 3 | 0.45/0.60 | 0.75 | [moderate] |
| 4 | 1-2 GW sites are under construction (Abilene, Colossus 2, Hyperion), so a ~3e28 FLOP run is physically feasible (fermi) | 1.0/0.9 | 1.1 | [weak] |
| — | Resolver trap: the `upfront` column shows **$10.7B for Grok 4** already. It is not the headline. I price a 4% chance that a resolver misreads it, added at the end and not treated as an LR | n/a | n/a | additive |

**An arithmetic correction to the signals seat.** Its "26x in ~2.3 years ⇒ 4.1x/yr" sets a Jul-2025 level ($388M) against a Sep-2026 clock. The consistent figures are:
- From $388M (Jul 2025) to $8.7B by end-2028: 22x in 3.45 years, about **2.5x/yr**.
- From an implied $0.6-0.8B (Sep 2026): 11-15x in 2.3 years, about **2.9-3.2x/yr**.

So the bar sits between Epoch's 2.4x/yr and 3.5x/yr trends. The prior's 0.5 for "on trend" stands.

**Posterior odds:** 0.538 × 0.70 × 1.05 × 0.75 × 1.1 = 0.538 × 0.606 = 0.326.
- P = 0.246.
- Add the resolver misread: 0.246 + 0.754 × 0.04 = **0.276**.

**Coherence with Q1.**
- P(Q2 | A) ≈ 0.12, P(Q2 | B) ≈ 0.30, P(Q2 | C+D) ≈ 0.50.
- Weighted: 0.43 × 0.12 + 0.42 × 0.30 + 0.15 × 0.50 = **0.25**.
- A $10B amortised run is ~1.5% of one year of B-world Big-4 capex, and lab and Stargate money sits outside Q1. Q2 therefore does not require C or D, which is a weaker coupling than fermi assumed.

I take **26**.

**Q2: 26.**

---

## Q3: Top ten LMArena Text organisations all US/PRC on 2028-12-31

**Prior:** 45, a blend of three numbers:
- the wide class (~15%);
- the leaderboard's own history (51% of 194 snapshots);
- Lindy (~26%).

The prior already knew the top 14 were US/PRC. **Prior odds** 0.818.

| # | Signal | P(E\|Yes) / P(E\|No) | LR | Flag |
|---|---|---|---|---|
| 1 | **Depth of the cushion beyond what the prior saw.** In the 2026-11-06 `text_style_control` snapshot ([HF dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset)), the first outsider is Mistral at organisation #20, ~48 rating points below the 10th organisation. Fermi's caveat: CIs run *"about +/-5-9 points"*. Signals' mirror ([benchleader](https://www.benchleader.com/benchmarks/lmarena_text), unverified against the primary) finds no non-US/PRC organisation in the top 60 models. Raw ≈0.85/0.35 = 2.4; discounted for the partial overlap with the prior's "cushion of four" | 0.80/0.40 | **2.0** | [>2:1 borderline, defended] |
| 2 | Every 2026 entrant to the organisation top 20 is US/PRC (Xiaomi, Meituan, Thinking Machines, Reflection, StepFun). New entrants are the main route to No. Correlated with 1, so shrunk | 0.80/0.67 | 1.2 | [weak] |
| 3 | Funded sovereign programmes exist (Gulf G42/Humain, Korea, Japan, India, France) and have so far produced no top-20 model | — | 0.9 | [weak] |
| 4 | Resolver: lmarena.ai 301-redirects to arena.ai; *"a five-way tie at 1475"* at the 10th boundary; labels such as "SpaceXAI" or blank need a parent mapping; possible redomicile of a Chinese lab to Singapore | — | 0.95 | [weak] |

**Defence of signal 1.** The observation is exact, read from the publisher's own dataset. A No world needs an outsider to pass ten US/PRC organisations, not one. Mistral fell out of the top 10 in February 2026 and has since slipped to #20. A No world that runs through a sudden new entrant would look like today, so I do not push the LR past 2.

**Posterior odds:** 0.818 × 2.0 × 1.2 × 0.9 × 0.95 = 0.818 × 2.052 = 1.679, so **P = 0.627**.

**Q3: 62.** The prior's 15% wide class still holds this well below fermi's 86 and signals' 83. A Bayesian update from 45 on this evidence does not reach the mid-80s without LRs I cannot justify (the posterior would need about 7:1 combined).

---

## Q4: DefiLlama total stablecoin market cap, 2028-12-31 (centre of gravity)

**Prior:** P10 235 / P50 410 / P90 740. Fit as ln(V/294) ~ N(0.333, σ_lo 0.434, σ_hi 0.461), which reproduces 230 / 410 / 731. In bins:

| Bin | <250 shrink | 250-400 slow | 400-600 moderate | >600 boom |
|---|---|---|---|---|
| Prior mass | 0.136 | 0.342 | 0.323 | 0.199 |

**Already in the prior, not re-counted:**
- $294.1B on 2026-11-08 (API);
- −4% year to date;
- post-GENIUS growth of ~12%/yr;
- the 2022-23 drawdown.

| # | Signal | L(shrink) | L(slow) | L(mod) | L(boom) | LR shrink:boom | Flag |
|---|---|---|---|---|---|---|---|
| 1 | Steepest weekly drop of 2026: −$4.99B (−1.7%) on DefiLlama, against Sentora's −$6.02B. Caveat: *"because the two trackers measure supply differently"*; the drivers are possibilities, not findings ([24/7 Wall St.](https://247wallst.com/investing/cryptocurrency/2026/11/07/stablecoins-shrank-by-5-billion-in-a-week-can-ethereum-rally-while-money-leaves-crypto/)). USDT fell from $184.2B to $176.8B in a month. One week is mostly noise | 1.10 | 1.02 | 0.98 | 0.92 | 1.2 | [weak] |
| 2 | Rates: the Fed hiked in September 2026, with two dissents for more at the Oct 28 hold; the 10y is 4.8-5.3%; zero-yield tokens compete with ~4-5% bills and MMFs. **Discounted**: in 2024-25 supply grew ~+50%/yr with fed funds at 4.25-5.5%, and the 2022-23 fall coincided with the Terra/FTX collapse | 1.15 | 1.05 | 0.95 | 0.85 | 1.35 | [moderate, weakly justified] |
| 3 | The GENIUS offshore deadline falls inside the window: from **18 Jul 2028** US digital-asset service providers may not offer stablecoins from non-permitted issuers ([Paul Weiss](https://www.paulweiss.com/insights/client-memos/genius-act-ushers-in-comprehensive-federal-regulation-of-payment-stablecoins), [Latham](https://www.lw.com/en/insights/2025/07/the-genius-act-of-2025-stablecoin-legislation-adopted-in-the-us)). This was **unverified** in the signals seat; I confirmed the date. Caveat carried: the bar applies *absent a safe harbor*, and foreign issuers in comparable regimes can register. USDT is ~60% of supply and mostly serves non-US users. USAT launched at *"a $10 million supply"* and is not in the top 12 | 1.15 | 1.05 | 0.95 | 0.95 | 1.2 | [weak] |
| 4 | Crypto-cycle timing: end-2028 is ~8 months after the April 2028 halving; in the 2024 analogue supply rose +28% in 8 months (fermi). n=3 cycles, contested | 0.85 | 1.0 | 1.1 | 1.1 | 0.77 | [weak] |
| 5 | OCC final GENIUS rule (2026-10-21; effective 2027-01-18) keeps the issuer-yield ban. *"nearly every other implementing rulemaking remains at the proposal stage"* ([Gibson Dunn](https://www.gibsondunn.com/the-genius-act-occ-finalizes-its-payment-stablecoin-framework/)). The ban was already statute; go-live is on schedule | 1.0 | 1.0 | 1.05 | 1.0 | 1.0 | null |
| 6 | Published forecasts (StanChart $2T by 2028; JPM $500-600B; Bessent "$2T"). All *predate the 2026 stall* | 1 | 1 | 1 | 1 | 1 | refused |

**Combined likelihoods:**
- shrink: 1.10 × 1.15 × 1.15 × 0.85 = 1.237
- slow: 1.02 × 1.05 × 1.05 × 1.0 = 1.125
- moderate: 0.98 × 0.95 × 0.95 × 1.1 × 1.05 = 1.022
- boom: 0.92 × 0.85 × 0.95 × 1.1 = 0.817

**Posterior bins:**
- Unnormalised: 0.168, 0.385, 0.330, 0.163 (sum 1.045).
- Normalised: **0.161, 0.368, 0.316, 0.156**.
- Posterior CDF: 0.161 at 250, 0.529 at 400, 0.844 at 600.

**Quantiles (prior density rescaled within each bin):**
- **P10:** 0.10 / 1.183 = 0.0845 of the prior CDF, so z = −1.375 and V = 294·e^(0.333−0.597) = **221**.
- **P50:** (0.5 − 0.161) / 1.076 = 0.315 of prior mass into the slow bin, so the prior CDF target is 0.451, z = −0.123 and V = 294·e^(0.333−0.053) = **388**.
- **P90:** (0.9 − 0.844) / 0.782 = 0.072 of prior mass into the boom bin, so the prior CDF target is 0.873, z = 1.14 and V = 294·e^(0.333+0.526) = **685**.

**Unresolved ±1.5% level ambiguity.** The two seats disagree on which way DefiLlama's API and dashboard headline differ:
- fermi says the API runs *below* the dashboard;
- signals says the dashboard reads ~$290-293B against the API's $294.1B.

I make no adjustment and leave it in the tails.

**Q4: P10 220 / P50 388 / P90 685 ($B).** This is about +12%/yr at the median: growth, not "near-unlimited demand". The essay's ~$1T+ by 2028 sits beyond my P90, at roughly 4%.

---

## Q5: A numerical Fed (or Fed-Treasury) yield ceiling on ≥1-year Treasuries before 2031 (centre of gravity)

**Prior:** 6, set between 3% (unconditional reserve-issuer rate, ~0.5-0.9% per issuer-year) and 8% (issuer-years with debt above 100% of GDP). **Prior odds** 6/94 = 0.0638.

The prior already conditions on high debt, so debt above 100% of GDP is not re-counted. I merge the correlated "Fed stance" signals into one LR and the "fiscal pressure" signals into another. Multiplying four correlated hawkish signals separately would take Q5 to ~3%, which is the main failure mode this lens is meant to avoid.

| # | Signal (merged) | P(E\|Yes) / P(E\|No) | LR | Flag |
|---|---|---|---|---|
| 1 | **Fed in a tightening regime far from the zero lower bound.** Unanimous hike in September 2026 ([CNBC](https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html)); two dissents for a further hike at the Oct 28 hold at 3.75-4.00% ([CNN](https://www.cnn.com/2026/10/28/business/live-news/federal-reserve-interest-rate-october)). Warsh's "accord" means a *smaller* balance sheet and a "reverse operation twist" ([ABN AMRO](https://www.abnamro.com/research/en/our-research/kevin-warshs-reverse-operation-twist)). Inflation 3.5-4.2% (search snippet, unverified). All three post-war-style starts (US 1942, Japan 2016, Australia 2020) came from policy rates near zero | 0.45/0.75 | **0.6** | [moderate] |
| 2 | **Fiscal pressure on the long end beyond the debt level.** FY2026 net interest above $1T; the 10y reached 5.31-5.34%, *"highest level since 2002"* ([Senate Banking letter](https://www.banking.senate.gov/imo/media/doc/20261007lettertobessentreyields.pdf); sources differ by a few bp). Treasury long-bond buybacks (excluded by Q5 but a revealed preference to manage long yields). Brooks' *"yield curve management"* is one person's interpretation; *no official statement … setting a yield target* ([Fortune](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/)) | 0.80/0.53 | **1.5** | [moderate] |
| 3 | Democrats won both chambers on 2026-11-03 (some races uncalled). This lowers the odds of the essay's "Congress changes the mandate" route and raises debt-limit stress | — | 0.9 | [weak] |
| 4 | The 10y fell back to 4.84% by Nov 5 | — | 1.0 | noise, null |
| 5 | Fermi model, DIRECTIONAL: the fiscal-dominance trigger does not bind by 2030. The model has *"NO MONETARY BLOCK"* | — | 1.0 | refused |

**Posterior odds:** 0.0638 × 0.6 × 1.5 × 0.9 = 0.0638 × 0.81 = 0.0517, so **P = 4.9%**.

**Q5: 5.** The pressure is real but runs through excluded tools (buybacks, issuance mix). A numerical cap would need a disorderly Treasury-market crisis or a war under a chair appointed to shrink the balance sheet.

---

## Q6: BLS nonfarm business labor share, 2030 annual average

**Prior:** P10 50.1 / P50 52.4 / P90 54.2, built from a start level of ~52.6 and a median 4-year change of −0.2pp.

**Data correction (a level shift, not an LR).** The 2026-11-05 release gives **2026Q3 = 53.0%**, *"the lowest level in the series, which begins in the first quarter of 1947"*. Q2 was *"first reported at 52.9%, was revised to 53.3%"* ([Indeed Hiring Lab](https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/), [BLS release](https://www.bls.gov/news.release/archives/prod2_11052026.htm)). The preamble's 52.8 and the prior's ~52.45 Q3 conversion are stale. The start moves to ~53.0, a **+0.4 shift**, giving a shifted prior of 50.5 / 52.8 / 54.6 (σ_lo 1.80, σ_hi 1.40).

Shifted prior in bins: Low (<51) 0.158; Mid (51-53) 0.399; High (>53) 0.443.

| # | Signal | L(Low) | L(Mid) | L(High) | LR Low:High | Flag |
|---|---|---|---|---|---|---|
| 1 | Momentum: the index fell ~3.2% in six quarters (−0.65pp/yr), with Q3 productivity +3.6% annualised and unit labor costs −0.7%. Caveats verbatim: productivity revisions *"differed from the first by −1.1 to +1.4 percentage points about 80% of the time"*. The prior's near-low subset shows mean reversion (median +0.85pp), which partly offsets this | 1.25 | 1.0 | 0.80 | 1.56 | [moderate] |
| 2 | Real hourly compensation −1.9% annualised in Q2. Part of the fall is an inflation squeeze that tends to reverse as inflation normalises | 0.90 | 1.0 | 1.10 | 0.82 | [weak] |
| 3 | Fermi model, DIRECTIONAL: AI payoff off gives −0.1pp, on gives −1.9pp (model units, *"NOT comparable to BLS 52.8%"*). Sign only | 1.05 | 1.0 | 0.95 | 1.1 | [weak] |
| 4 | Recession risk (VIX shock, AI-equity rout). The share spikes in a recession year (2001 +1.8, 2020 +2.4) but falls back afterwards, so the effect on 2030 depends on timing | 1 | 1 | 1 | 1 | null |

**Combined likelihoods:** Low 1.181, Mid 1.0, High 0.836.

**Posterior bins:**
- Unnormalised: 0.187, 0.399, 0.371 (sum 0.956).
- Normalised: **0.195, 0.417, 0.388**.

**Quantiles:**
- **P10:** prior CDF target 0.081, z = −1.40, so 52.8 − 2.51 = **50.3**.
- **P50:** prior CDF target 0.450, z = −0.127, so **52.6**.
- **P90:** prior CDF target 0.886, z = 1.205, so 52.8 + 1.69 = **54.5**.

**Q6: P10 50.3 / P50 52.6 / P90 54.5.** The essay's "1980-2020 in a decade" path (~50.3 by 2030, per fermi) sits at my P10. Resolution caveat from signals: the BLS API carries only the index, so the percent level comes from release text. The question's 52.8 baseline conflicts with both the first print and the revision.

---

## Q7: Indian IT big-5 headcount at 31 Mar 2029 ≥10% below 31 Mar 2026

**Prior:** 8. The aggregate has never fallen 10% over three years. The prior already folded in the FY26 decline and the +13,918 in Q2. **Prior odds** 0.087.

| # | Signal | P(E\|Yes) / P(E\|No) | LR | Flag |
|---|---|---|---|---|
| 1 | H1 FY27 net **+16,055** ([Angel One](https://www.angelone.in/news/stocks/indian-it-stocks-in-focus-top-five-firms-add-16-055-employees-in-h1fy27-but-demand-recovery-remains-uncertain)). A conflicting source gives +19,398, so filings are needed. This implies a base of ~1,533k, a threshold of ~1,380k, and a required fall of **−10.9% from Sep-2026 in 2.5 years**. Incremental to the prior's Q2 read only | 0.50/0.62 | 0.8 | [weak] |
| 2 | Composition: freshers were 60-65% of net hiring; *"overall IT hiring declined by 3%"*; *"not evidence of a broad recovery in demand"*. FY27 net additions *"fewer than 30,000–40,000"* | — | 1.0 | null (cuts both ways) |
| 3 | A substitution mechanism outside the reference class: revenue per employee rising on GenAI delivery (fermi's identity, median −1%/yr). No direct telemetry in hand | — | 1.2 | [weak] |
| 4 | E3 channel: INR weakness and the H-1B fee shift push work offshore and protect India headcount (fermi) | — | 0.9 | [weak] |
| 5 | US-recession risk (Nov 5 VIX shock). A recession is the main fast path to Yes | 0.50/0.43 | 1.15 | [weak] |
| 6 | Resolver: the acquisition clause is truncated, and acquired staff add to the count | — | 0.95 | [weak] |

**Posterior odds:** 0.087 × 0.8 × 1.0 × 1.2 × 0.9 × 1.15 × 0.95 = 0.087 × 0.944 = 0.082, so **P = 7.6%**.

**Q7: 8.** No signal clears 1.25:1. The evidence is a wash, so the prior holds.

---

## Coherence checks

- **Q1 ↔ Q2:** Q2 implied from the Q1 regimes is ≈25%, against 26 stated. Consistent.
- **Q4 ↔ Q5:** a yield cap means debasement, which lifts stablecoins. At Q5 = 5% the joint tail sits inside Q4's P90, so neither number needs to move.
- **Q6 ↔ Q7:** both load on AI substituting labour. Both stay modest (Q6 median −0.4pp from start; Q7 8%). In a world where the essay is right, both move together: Q6 toward ~50 and Q7 toward ~30%.
- **Prior sensitivity:** Q3 is the only question where the prior choice dominates the posterior. From fermi's implicit prior the same LRs would give ~90%. That spread is the panel's real disagreement, and it is about the reference class (wide industry class against the leaderboard's own record), not about the evidence.

## Sources

- Wave-1 packet (prior and evidence): `docs/forecasts/commanding-heights-2026/seats/E3-wave1-packet.md`
- GENIUS three-year foreign-issuer provision (18 Jul 2028), checked for this seat: [Paul Weiss](https://www.paulweiss.com/insights/client-memos/genius-act-ushers-in-comprehensive-federal-regulation-of-payment-stablecoins); [Latham & Watkins](https://www.lw.com/en/insights/2025/07/the-genius-act-of-2025-stablecoin-legislation-adopted-in-the-us); [Orrick](https://www.orrick.com/de-DE/Insights/2025/07/Stablecoin-Framework-Signed-into-Law). Caveat: these are 2025 law-firm summaries, not the statute text; final rules or a safe harbor can change its reach.
- All other URLs are cited inline and taken from the E3 Wave-1 seats as they reported them.

## Seat: premortem

**Numbers:** q1={'A': 32, 'B': 41, 'C': 24, 'D': 3} | q2=18 | q3=78 | q4={'p10': 215, 'p50': 365, 'p90': 820} | q5=4 | q6={'p10': 49.7, 'p50': 52.5, 'p90': 55.0} | q7=14

# E3 (dollar-monetary) x premortem (A5, Wave 2, red team)

**BLUF.** E3's Wave-1 seats share a frozen-regime assumption: each priced the seven questions
as separate draws around the November 2026 snapshot (Fed hiking, 5% long yields, crypto
bear, stablecoins stalled). The window runs to 2028-2030, long enough for at least one full
rate cycle, and the most likely way the snapshot breaks (an AI-capex bust, then a recession,
then cuts) moves Q1, Q4, Q5, Q6 and Q7 together. Repricing both tails gives the following
changes:

- **Q5 goes down to 4.** The Wave-1 seats priced it off conditional probabilities that the one
  US natural experiment (June 2020) and the reference class's own exits contradict.
- **Q4 is wider on both sides:** P10 215, P50 365, P90 820.
- **Q1 moves mass into A.**
- **Q3 moves well above outside-view's 45 but below 83-86.**

Forecast origin 2026-11-08. Pulls dated that day unless stated.

---

## 1. The shared assumption none of the three seats questioned

**"The resolution dates inherit today's monetary regime, and the questions are roughly
independent."**

- **Signals** reads the Fed's hikes, the yield ban and 5% bills as a lasting headwind on Q4,
  and "nothing observable points to a numerical yield peg" on Q5.
- **Fermi** uses the same snapshot as the conditioning state for its Q4 rate-headwind
  component, for Q5's "a yield cap is the most inflationary tool ... exactly what a hawkish
  chair was appointed to avoid", and for Q1's "that financing is expensive". It then declares
  Q1 and Q4 "mostly independent".
- **Outside-view** is mechanism-free by mandate, but it inherits the snapshot through its
  arithmetic: a Q4 growth rate taken off the post-GENIUS realised pace, and a Q6 start level
  (see Q6 below).

**Why the assumption is fragile.** The Fed raised to 3.75-4.00% on 2026-09-16, its first hike
since 2023, with 16 of 19 participants expecting at least one more this year
([Al Jazeera](https://www.aljazeera.com/news/2026/9/16/what-to-know-about-us-federal-reserves-first-interest-rate-hike-in-3-years),
[The Star/Reuters](https://www.thestar.com.my/business/business-news/2026/09/17/fed-hikes-rates-sees-more-tightening-in-search-of-039timelier039-drop-in-inflation)).
Sources conflict on the vote: most report 12-0, and Trading Economics reports three hawkish
dissents. Policy rates are therefore early in a tightening cycle. At the same time:

- the VIX had a top-three one-day jump on Nov 5;
- Bitcoin fell below $76K, "down nearly 40% for the year"
  ([Stocktwits](https://stocktwits.com/news-articles/markets/cryptocurrency/mstr-bmnr-crcl-coin-stocks-tumble-bitcoin-breaks-76-k-wiping-out-1-b-crypto-bets/cNG1sepR94N),
  [Cointelegraph](https://cointelegraph.com/news/bitcoin-price-crashes-7-week-low-stocks-election-gains));
  these are secondary sources;
- Big-Tech free cash flow has turned negative at Amazon.

This is the 1999-2000 configuration: the Fed hiked from June 1999 to May 2000 into a
capex-led equity boom, and then cut 475bp in 2001. US hiking cycles do not survive two-year
horizons. Over 2026-2030 the policy rate will almost certainly visit a level well away from
today's, and the direction of that move is the common factor behind five of the seven
answers.

| Latent world (to 2030) | P (mine) | Q1 | Q4 | Q5 | Q6 (2030) | Q7 |
|---|---|---|---|---|---|---|
| W1 Soft landing; regime roughly persists | 0.45 | B/C | ~$340-450B | ~1% | ~52-53 | low |
| W2 AI-capex bust, recession, cuts toward the ELB by 2028-30 | 0.30 | **A** | bimodal: crypto crash first, then cheap money lifts supply | **higher** (the only post-war YCC starts were at the ELB) | higher in a 2029-30 recession, lower after one | **higher** |
| W3 Inflationary fiscal dominance (10y > 6%, disorderly auctions) | 0.15 | B | low (opportunity cost), unless debasement demand appears | higher (essay's path) | lower (real-wage squeeze) | low |
| W4 Boom continues (essay's line) | 0.10 | C/D | high | ~0 | lower | higher |

**What breaks.** Treating the questions as independent around W1 commits conjunction neglect
in reverse: the tails are positively correlated, so each marginal tail is fatter than a
snapshot-centred seat prices it. The E3 calibrator should check joint coherence across Q1, Q4,
Q5 and Q7, not just each marginal.

## 2. Attack on the simulation closure (fermi leaned on it for Q1, Q5 and Q6)

The adapter's own disclosure says: "NO MONETARY BLOCK: no price level, no Fed, no yields, no
stablecoins. 'financialRepression' is a real-rate lever on the world safe rate; fiscal
dominance triggers only above 150% WORLD public debt/GDP"
(`adapter-output.md`). In the code that threshold is `repressionDebtThreshold: 1.5`
(`src/modules/capital.ts`), which CLAUDE.md labels "judgment". The model's repression is then
a silent cap on the real safe rate at trend growth less 3pp (`capital-finance.ts`).

- **Q5: the model cannot produce the resolving event in any parameterisation.** Its
  repression is the 1945-80 UK kind: unannounced and implicit. Q5 excludes exactly that and
  requires a *numerical announced* level. Its trigger is a world aggregate (0.89 in 2030)
  where the relevant state is the US: debt held by the public is ~100% of GDP, and net
  interest is above $1T per Signals' Fortune citation. It has no term premium, so it cannot
  represent the bond-vigilante episode that is the main path to Yes.
  - Fermi read "the model alone would put me at ~3-4%" and then adjusted up to 7. That is
    anchoring and adjustment on a number with a likelihood ratio of exactly 1: the model's
    "no" is true in every world.
  - The right use is none at all.
- **Q1: circular corroboration.** The model's world datacenter capex grows ~13%/yr because
  of a willingness-to-pay ceiling on the datacenter power bill
  (`dataCenterPowerSpendCeiling`, 0.05% of GDP) and because it has no stock market or lab
  race. "Corroboration that the fundamentals-led pace sits in B" is therefore the ceiling
  parameter reporting its own value. It is uninformative about the A tail too: the model
  cannot bust, because it has no expectations to disappoint.
- **Q6: the parameter is the answer.** The baseline's -0.11pp comes from AI cognitive payoff
  being *off by default* (`aiWorkerEquivalentPerTWh = 0`). Fermi's AI component (-0.6pp,
  range 0 to -2) is a judgment about which run is true, presented as a model range. Choosing
  among the runs *is* the question.

**Verdict.** On these three questions the simulation contributes sign at most. Fermi's
numbers survive only where its non-model arithmetic carries them (Q2, Q4, Q7).

## 3. Named failure modes in the Wave-1 packet

- **Herding within the effort on Q4.** The three P50s sit within $40B of each other (370 /
  390 / 410), and the P90s span 680-740. All three share one driver, the 2026 stall, so the
  agreement is one observation counted three times. Every one of them sits below JPMorgan's
  sceptic forecast of $500-600B by 2028, quoted by Signals. That forecast predates the stall,
  but it shows the band's upper edge was set by the snapshot, not by the class.
- **Narrative coherence mistaken for likelihood on Q5.** Fermi's four paths sum to 8.2%, but
  each conditional is a story-weight. Path 3 (ELB, then YCC on 2-3y tenors) at 0.15 is
  contradicted by June 2020: the ELB, debt above 100%, an acute crisis, and a staff briefing
  on yield caps produced no cap. Minutes: "nearly all participants indicated that they had
  many questions regarding the costs and benefits", and "it was not clear that there would be
  a need for the Committee to reinforce its forward guidance"
  ([FOMC minutes, June 2020](https://www.federalreserve.gov/monetarypolicy/fomcminutes20200610.htm)).
  A couple of participants favoured a short-to-medium cap "as a powerful commitment device".
  That minority is the honest size of path 3.
- **Ignored drag in the reference class.** Outside-view's ~0.5-2% per issuer-year counts the
  BoJ and RBA as live members. Both have since repudiated the tool:
  - The RBA board "views the probability of using a yield target again in future as low",
    after an exit that "caused some reputational damage"
    ([RBA Review of the Yield Target, 2022](https://www.rba.gov.au/monetary-policy/reviews/yield-target/)).
  - The BoJ abandoned YCC in March 2024 after two forced band-widenings.
  - The class is learning against the tool, so forward-looking rates belong at or below the
    historical rate, not above it.
- **Anchoring on the essay's framing (Q5).** The essay's route is "even if Congress has to
  change its mandate". Democrats won both chambers on 2026-11-03 (Signals, OPB/NPR), which
  closes that route before January 2029. SCOTUS held 5-4 on 2026-06-29 that Fed governors'
  for-cause protection is constitutional and needs notice and a hearing
  ([SCOTUSblog](https://www.scotusblog.com/2026/06/court-prevents-trump-from-firing-fed-governor/),
  [CRS LSB11449](https://www.everycrsreport.com/reports/LSB11449.html); a stay ruling, merits
  open). That closes the fast Board-capture route. Neither Wave-1 seat priced either fact
  into its Q5 path table.
- **The substitute nobody counted (Q4 x Q5).** The tools Treasury is actually using are long-end
  buybacks, a shift to bills, Bessent's August intervention after the 30y hit a 19-year high
  ([CSMonitor](https://www.csmonitor.com//Business/2026/0828/warsh-bessent-inflation-economy)),
  and stablecoin T-bill demand. All of these are *substitutes* for a Fed cap, and all are
  excluded by Q5. The essay's own Neo-Dollar mechanism lowers Q5: every dollar of captive
  stablecoin bill demand is pressure a yield cap no longer has to absorb.
- **Scope insensitivity on Q3 (outside-view).** A Lindy estimate of 26-45% ignores that the
  current cushion is 20 US/PRC organizations ahead of the first outsider, ~48 rating points
  clear. A violation needs a non-US/PRC lab to pass ten US/PRC labs, not one.
- **Stale baseline on Q6 (outside-view).** Its start of ~52.6 scales the FRED index to the
  pre-revision 52.8. The Nov-5 release revised Q2 to 53.3 and printed Q3 at 53.0 (Signals,
  Fermi). The same method from 53.0 gives a P50 near 52.8, not 52.4.

## 4. Premortems, both tails, with my numbers

### Q4: stablecoins on DefiLlama, 2028-12-31 (centre of gravity)

DefiLlama API total, re-pulled: **$294.1B on 2026-11-08**
([stablecoincharts/all](https://stablecoins.llama.fi/stablecoincharts/all)). USDT $176.8B,
USDC $70.6B.

**Resolver note.** DefiLlama counts **BUIDL** (BlackRock's tokenized money fund, $1.76B) and
**YLDS** ($0.47B) as fiat-backed stablecoins
([stablecoins endpoint](https://stablecoins.llama.fi/stablecoins)). If the yield ban pushes
demand into tokenized yield-bearing funds, part of that substitution stays *inside* the
resolver. That weakens the rate-headwind argument all three seats used.

**Low-tail premortem: "It is 2029 and the dashboard reads $210B. Why?"**
- 2026 was the 2022 analog, and it ran longer:
  - In 2022-23, supply fell ~34% peak-to-trough over ~18 months. Some of that was
    idiosyncratic: UST's collapse, BUSD ordered shut, USDC after SVB.
  - From the May-2026 peak of $317B, -30% is ~$220B by late 2027.
- The Fed kept hiking into 3.7% PCE, so bills paid 4.5-5% against a token with the yield ban
  locked by the OCC final rule.
- USDT's US distribution closed on 2028-07-18 for lack of a comparability determination
  ([CryptoSlate](https://cryptoslate.com/treasury-just-put-a-deadline-on-offshore-stablecoins-access-to-us-customers/);
  sources disagree on whether foreign issuers get the full runway).
- USDT was already shrinking for "weaker speculative demand and money moving back into fiat"
  ([Whale Alert](https://whale-alert.io/stories/93da0118e97877/Tether-USDT-supply-falls-4-billion-in-60-days-as-crypto-demand-cools);
  secondary, no single cause established).
- The CLARITY rewards compromise never passed the remaining gates
  ([Baker McKenzie](https://blockchain.bakermckenzie.com/2026/05/05/the-clarity-acts-yield-compromise-what-the-senate-actually-agreed-to-and-why-it-matters/);
  Amina: "multiple legislative gates remain, each carrying meaningful passage risk").
- Supply is momentum-persistent and is currently accelerating downward: the steepest week of
  2026 was the week to Nov 7.
- Pricing: I give this world ~12% for a reading at or below $220B. The Wave-1 P10s
  (225-235) give it ~8-10%.

**High-tail premortem: "It is 2029 and the dashboard reads $850B. Why?"**
- W2 happened. The AI-capex bust pulled the Fed to ~1-2% by 2028, and the opportunity cost
  of a zero-yield dollar collapsed. In 2020-21 at zero rates supply rose ~6x in two years.
- GENIUS went live on 2027-01-18. Bank, fintech and card-network issuers scaled on a
  regulated rail.
- The April-2028 halving-year rally repeated 2024's +56%.
- CLARITY's activity-based rewards gave exchanges a legal yield-like wrapper.
- Tokenized-MMF growth was counted through BUIDL-type listings.
- $294B x 1.55^2.15 is ~$750B, and $850B needs ~60%/yr. That is below the 2024-25 realised
  pace from a bigger base, and well below Standard Chartered's and Bessent's $2T. I give
  >= $800B about 11%.

**Scenario mixture.** These are scenario weights:

| Scenario | Weight | Range |
|---|---|---|
| Cycle replay | 0.38 | ~$380B |
| Regulated take-off plus cheaper money | 0.25 | ~$620B |
| Prolonged winter | 0.27 | ~$270B |
| Shock | 0.05 | ~$170B |
| Essay world | 0.05 | ~$1.1T |

A lognormal mixture puts the P50 around $370-380B. I shade the P50 down to $365B for the
accelerating Nov-2026 outflow and the hiking Fed. The tails go wider on both sides, because
the latent rate path drives both of them.

**Q4: P10 215, P50 365, P90 820 ($B).**

### Q5: a numerical Fed yield ceiling or target on a >=1y Treasury before 2031 (centre of gravity)

**Yes-tail premortem: "It is December 2030 and the Fed has announced a 2-year yield target. Why?"**

| Path | P(trigger) | P(cap \| trigger) | Product | Basis |
|---|---|---|---|---|
| W2 to the ELB by 2029-30, then RBA-style short-tenor YCC to make guidance credible | ~0.20 | ~0.08 | ~1.6% | 0.08, not 0.15: June 2020 is the observed conditional, and a minority favoured it then |
| W3 bond crisis under fiscal dominance, then a joint Treasury-Fed "accord" with a named ceiling | ~0.15 | ~0.10 | ~1.5% | The new president from Jan 2029 and Warsh's chair term ending May 2030 open a short window. SCOTUS and a Democratic Congress close the faster routes. The 2020 and BoE-2022 playbook is purchases without a level |
| War finance | ~0.03 | ~0.2 | ~0.6% | |
| Other (a liquidity facility written as a price/yield backstop, a resolver dispute) | | | ~0.5% | |
| **Total** | | | **~4.2%** | |

**No-tail premortem: "Why might even 4 be too high?"** The current chair hikes and wants a
smaller balance sheet: a "reverse operation twist"
([National Mortgage News](https://www.nationalmortgagenews.com/articles/warsh-call-for-fed-treasury-accord-stirs-debate-in-30-trillion-bond-market)).
There is no official text naming a yield
([Fortune, 2026-11-01](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/):
Brooks's "de facto accord" rests on buybacks, which are excluded). The Treasury already has
cheaper, excluded tools. The purest outside-view rate of ~0.7%/yr over 4.15 years is 3%. I
do not go to 2-3% because W2 and W3 together carry ~35% of the window, and the ELB is the
only setting in which post-war yield targets have started.

**Q5: 4.**

### Q1: Big-4 cash capex, 2030 / 2026

- **A-tail ("2030 is below 2026").** This is the E3 lens's home ground. The Fed is tightening
  into a capex boom financed increasingly off operating cash flow. Signals reports capex/OCF
  ~1.15, Amazon FCF at -$42B, the 10y above 5% in September, and Alphabet down ~10% on a
  capex guide. That is 1999-2000.
  - Telecom capex fell ~50% within three years of its 2000 peak.
  - 2026 is the analog of 1999, not 2000: 2027 is guided up ~25-30%. A peak in 2027 and a
    -35% fall by 2030 puts R near 0.85.
  - The SPV/JV/lease shift (Meta-Blue Owl-style structures) moves spending off the locked cash
    line, which biases measured R down even without a bust.
  - Fermi (22) and Signals (20) underweight this. Outside-view (50) overweights it: its class
    is mostly single-commodity manufacturers, not firms with ~$150B pre-AI maintenance bases.
- **C/D-tail.** W4: 2027 at +28% per the ~$935B consensus, then 15-20%/yr. Fermi's own
  denominator correction (~$665B cash) makes R >= 2 reachable at ~19%/yr. D needs cash capex
  near or above $2.7T, roughly the four firms' entire 2030 revenue, so it stays a thin tail.

**Q1: A 32, B 41, C 24, D 3.**

### Q2: an Epoch run >= $10B published by 2028-12-31

The real Yes risk is resolver risk. The "upfront" column already shows $10.7B for Grok 4
(Signals' audit), and the headline is in 2023 USD while the question asks for nominal.

- **No tail.** Coverage lag: 1 of 95 notable 2026 models has a cost.
- **Yes tail.** 1-2 GW single-site runs (Abilene, Colossus 2) in 2028 make an amortized ~$10B
  physically feasible. Fermi's power check holds up. A W2 bust cuts the run before it
  happens.

I keep Fermi's structure but raise its coverage factor slightly: the largest-ever run
reliably gets an Epoch data insight (Grok 4 did).

**Q2: 18.**

### Q3: LMArena top ten all US/PRC on 2028-12-31

- **No tail.** A sovereign-funded European, Gulf or Korean lab enters the top ten. A Chinese
  lab redomiciles HQ to Singapore, which counts as non-PRC under the ultimate-parent rule.
  The 10th-place tie (five at 1475) is adjudicated against the panel. Two years of churn add
  to all of these.
- **Yes tail.** Twenty US/PRC organizations sit ahead of Mistral today, and the compute gap
  widens. Mistral would have to pass ten labs.

Outside-view's 45 is scope-insensitive (see section 3). Fermi's 86 multiplies three
"independent" failure paths and leaves out the label/tie path's correlation with churn.

**Q3: 78.**

### Q6: BLS labor share, 2030 average

Start at the corrected 53.0 (2026Q3 preliminary).

- **Low tail (~49.5).** The AI productivity surge persists (Q3 productivity +3.6% annualized)
  with wages lagging, as in the essay. No recession lands in 2030.
- **High tail (~55).** W2's recession falls in 2029-30. The share rose +1.8 in 2001 and +2.4
  in 2020. The 2026 drop was partly a real-wage squeeze (Q2 real hourly compensation -1.9%
  annualized) that reverses as inflation normalizes.

Signals' six-quarter slope extrapolation (-0.65pp/yr) is recency. Outside-view's start is
stale.

**Q6: P10 49.7, P50 52.5, P90 55.0 (%).**

### Q7: Indian IT big-5 down >= 10%, Mar-2026 to Mar-2029

**The shared assumption to attack here is "the aggregate behaves like a sector, so it is
sticky".** Annual attrition at these firms runs low-to-mid teens (my recollection of company
disclosures, ~12-14% LTM; not re-sourced). On ~1.55M staff that is ~200k exits a year. A
twelve-month backfill freeze delivers the whole -10%. The constraint is a management choice,
not a friction, and AI-driven renewal deflation plus a W2 US recession is exactly the world
in which all five choose it together (correlation, not five independent draws).

- **No tail.** H1 FY27 +16k. GCC and AI-services hiring. INR weakness and the H-1B fee shift
  work back offshore. Acquired staff are added to the count.

Outside-view's 8 is drag-blind; Signals' 11 takes current telemetry for the whole path.

**Q7: 14.**

## 5. Note for the calibrator

- **Real hits:**
  - Q5's conditional probabilities (the 2020 minutes and the RBA review are data, not story).
  - The model's Q5/Q1/Q6 readings carry LR = 1.
  - Outside-view's Q6 start and Q3 scope.
  - Correlated tails via the rate path.
- **Merely posed:** the Q4 high tail rests on several things going right at once. I priced it
  at ~11% for >= $800B, not more.

## Sources

- DefiLlama stablecoins API: https://stablecoins.llama.fi/stablecoincharts/all ; https://stablecoins.llama.fi/stablecoins
- Fed hike, 2026-09-16: https://www.aljazeera.com/news/2026/9/16/what-to-know-about-us-federal-reserves-first-interest-rate-hike-in-3-years ; https://www.thestar.com.my/business/business-news/2026/09/17/fed-hikes-rates-sees-more-tightening-in-search-of-039timelier039-drop-in-inflation (vote reported 12-0 by most sources, three dissents by Trading Economics; unconfirmed)
- FOMC minutes, June 2020 (yield caps or targets): https://www.federalreserve.gov/monetarypolicy/fomcminutes20200610.htm
- RBA Review of the Yield Target (2022): https://www.rba.gov.au/monetary-policy/reviews/yield-target/
- Trump v. Cook: https://www.scotusblog.com/2026/06/court-prevents-trump-from-firing-fed-governor/ ; https://www.everycrsreport.com/reports/LSB11449.html (stay-stage ruling; the merits remain open)
- Warsh/Bessent accord debate: https://www.nationalmortgagenews.com/articles/warsh-call-for-fed-treasury-accord-stirs-debate-in-30-trillion-bond-market ; https://www.lpl.com/research/blog/imagining-a-modern-fed-treasury-accord.html ; https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/ ; https://www.csmonitor.com//Business/2026/0828/warsh-bessent-inflation-economy
- Crypto drawdown: https://cointelegraph.com/news/bitcoin-price-crashes-7-week-low-stocks-election-gains ; https://stocktwits.com/news-articles/markets/cryptocurrency/mstr-bmnr-crcl-coin-stocks-tumble-bitcoin-breaks-76-k-wiping-out-1-b-crypto-bets/cNG1sepR94N (secondary)
- USDT contraction: https://whale-alert.io/stories/93da0118e97877/Tether-USDT-supply-falls-4-billion-in-60-days-as-crypto-demand-cools ; https://cryptobriefing.com/tether-usdt-market-cap-falls-5-billion/ (secondary; causes not established)
- CLARITY yield compromise: https://blockchain.bakermckenzie.com/2026/05/05/the-clarity-acts-yield-compromise-what-the-senate-actually-agreed-to-and-why-it-matters/ ; https://eu.aminagroup.com/research/clarity-act-stablecoin-yield-rules-winners-losers-and-what-changes-next/
- GENIUS 2028 foreign-issuer deadline: https://cryptoslate.com/treasury-just-put-a-deadline-on-offshore-stablecoins-access-to-us-customers/ ; https://www.finextra.com/the-long-read/1470/the-genius-acts-impact-on-foreign-stablecoin-issuers (secondary; legal experts disagree on foreign-issuer timing)
- Model closure: `docs/forecasts/commanding-heights-2026/adapter-output.md` (disclosures), `src/modules/capital.ts` (`repressionDebtThreshold: 1.5`, `repressionDepth: 0.03`), `src/modules/capital-finance.ts`
