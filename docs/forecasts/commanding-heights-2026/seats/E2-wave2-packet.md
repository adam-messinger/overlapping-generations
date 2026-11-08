# Effort 2 (compute-geopolitics) - Wave-2 handoff packet

Your own effort's earlier seats only. Other efforts are deliberately withheld.

## Seat: outside-view

**Numbers:** q1={'A': 40, 'B': 32, 'C': 22, 'D': 6} | q2=20 | q3=30 | q4={'p10': 245, 'p50': 410, 'p90': 700} | q5=5 | q6={'p10': 49.8, 'p50': 52.0, 'p90': 54.0} | q7=7

# E2 compute-geopolitics, outside-view seat (A1, Wave 1)

**BLUF.** History says booms that grow capex 50%+ in a year usually stall or reverse within four years, so the regime mass sits on "line broken" and "plateau" (A+B = 72%), not on the essay's line (D = 6%). Trend-dated cost milestones arrive on time less than half the time, and the Q2 resolver needs Epoch to have *published* a cost (Q2 = 20%). Two-country closure of a frontier-tech top-10 is rare across industries (Q3 = 30%). Yield pegs by reserve-currency issuers run at under 1% per issuer-year (Q5 = 5%). Labor share and Indian-IT headcount are forecast from their own 4-year and 3-year change distributions: drift continues and there is no cliff (Q6 P50 52.0; Q7 = 7%).

Lens discipline: every number below comes from a reference-class frequency. The only adjustments are arithmetic ones made to the baselines (current levels, the threshold multiple each question needs). I give no mechanism arguments about AI, chips, export controls or policy, and I did not look up anyone else's forecast of these questions.

---

## Q1: Big-4 capex regime, R = CY2030 / CY2026

**Reference class:** capex in a sector (or a hyperscaler aggregate) in the four years after a year of >=50% capex growth. The ratio is year t+4 over the boom year t. Values are approximate, from IC Insights/Gartner semiconductor capex series, company 10-Ks and standard railway history. Treat each as roughly +/-15%.

| Boom year (growth >= ~50%) | R = t+4 / t | Regime |
|---|---|---|
| UK railway mania, 1846 (capital calls peak) -> 1850 | well below 1 | A |
| US railroad track built, 1887 (peak ~12.9k miles) -> 1891 (~4.6k) | ~0.36 | A |
| Semiconductor capex, 1984 -> 1988 | ~1.0 | A/B border |
| Semiconductor capex, 1995 -> 1999 | ~0.7 | A |
| Semiconductor capex, 2000 (~+80%) -> 2004 | ~0.75 | A |
| Optical/telecom equipment, 2000 -> 2004 | ~0.4-0.5 | A |
| Semiconductor capex, 2004 -> 2008 | ~1.0 | A/B border |
| Semiconductor capex, 2010 (~+100%) -> 2014 | ~1.2 | B |
| Solar manufacturing capex, 2010 -> 2014 | <1 | A |
| US shale upstream, 2010 -> 2014 | ~1.5 | B |
| Big-4 hyperscalers, 2018 (~+60%, ~$40B -> ~$64B) -> 2022 (~$150B) | ~2.35 | C |
| Amazon alone, 2017 (+53%) -> 2021 | ~5 | D (single firm) |

IC Insights' summary of semiconductor capex reports six episodes of double-digit capex declines (1985-86, 1992, 1997-98, 2001-02, 2008-09, 2012-13). It also notes that "in every case between 1983 and 2010 where spending declined, a surge in spending of at least 45% occurred two years later". In other words, booms and busts alternate on a roughly four-year beat ([AnySilicon / IC Insights](https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/); [Design-Reuse / IC Insights 2021](https://www.design-reuse.com/news/news51109.html)).

**Frequency** across the ~11 sector-level cases (single-firm row excluded): A ~55-60%, B ~25-30%, C ~10-15%, D ~0%. **Arithmetic adjustment:** the closest sub-class, the Big-4 aggregate itself, has resolved C once, and D occurs only at single-firm level, so I move a little mass from A toward C/D. The 2026 base (~$720-745B guidance, excluding leases on the Q1 definition) follows a second consecutive year of ~+75%. In every analogue the boom-year base was the year the cycle's level was most stretched, so I make no upward adjustment for it.

**Answer:** A 40, B 32, C 22, D 6.

## Q2: Epoch lists a >= $10B training run published by 2028-12-31

**Reference class 1:** trend-extrapolated compute or cost milestones, and whether they arrived on the date the trend implied.
- TOP500 exaflop: the 2010s extrapolation of the #1 system pointed to ~2018-19. It arrived June 2022 (Frontier), about 3-4 years late, because the list's growth rate broke around 2013.
- Petaflop (Roadrunner 2008): on trend.
- Intel's Moore's-law node cadence: held to ~2014, then slipped (10 nm ~3 years late).
- Li-ion pack $100/kWh: projected for ~2023 in the late 2010s; not reached as a global average by then.
- Epoch's own 2024 report: "if the trend of growing training costs continues, the largest training runs will cost more than a billion dollars by 2027" ([Epoch](https://epoch.ai/blog/trends-in-the-dollar-training-cost-of-machine-learning-systems); [arXiv 2405.21015](https://arxiv.org/abs/2405.21015)). This is still open.

Rough on-time frequency for milestones set by a continued established trend: **~40%**. Trends tend to decelerate at about the point people start extrapolating them.

**Arithmetic on the baseline.** I downloaded Epoch's `notable_ai_models.csv` on 2026-11-08 ([epoch.ai/data](https://epoch.ai/data/notable_ai_models.csv)).
- The headline column is "Training compute cost (2023 USD)". Its maximum is **$388M (Grok 4, 2025-07-09)**, then GPT-4.5 at $366M and Grok 3 at $218M.
- Only **180 of 1,092** models carry a headline cost. **No model published in 2026 has one**, including the largest-compute entry, GPT-6 Astra (2026-09-03, 9.4e26 FLOP), which has only a "hardware acquisition cost" of $4.2B.
- Of the ten largest-compute models, 6 carry a headline cost.
- Going from $388M (mid-2025) to $10B by end-2028 needs about 2.5x/yr for 3.5 years. Epoch's 2024 trend of 2.4x/yr gives ~$8.3B, a near miss at the median. The essay's 3.5x/yr gives ~$31B.

The threshold therefore sits at the trend median. I take P(true run >= $10B by end-2028) at the ~40% on-time rate, then multiply by P(Epoch publishes a headline cost for it by 2029-12-31) ~0.6 (the coverage rate among top-compute models). That gives ~0.24, and I round down for the headline's 2023-dollar deflation.

**Resolver caveats.**
- (a) Epoch's headline column is in **2023 USD, not nominal**, while the question says nominal. Using 2023 dollars lowers the reported figure by roughly 8-12% at 2028 prices.
- (b) Epoch also publishes "Training compute cost (upfront)". Grok 4 **already shows $10.7B** on that column. If an auditor read "upfront" as primary, the question would already resolve Yes. I treat the 2023-USD amortized column as the headline, per the question text.

**Answer: 20.**

## Q3: All ten top LMArena organizations US or PRC on 2028-12-31

**Reference class:** in a frontier technology, do the ten leading organizations all come from two countries?

| Industry, list | Two-country top 10? |
|---|---|
| Large commercial aerospace / airframers | No (US + Europe + Brazil/Canada) |
| Civil nuclear vendors | No (US, France, Russia, Japan, Korea, China) |
| Semiconductors by revenue / foundry | No (US, Korea, Taiwan, Japan, Netherlands, Europe) |
| Web search engines by share | No (Yandex, Naver, Seznam alongside US/China) |
| TOP500 top-10 supercomputers | No in essentially every list (Japan, Europe present) |
| Space launch | No (Europe, Russia, India, Japan) |
| Internet platforms by market cap, top 10 (~2015-2024) | **Yes** (Meeker 2018: top 20 = 11 US + 9 China) |

**Frequency:** about 1 in 7 industry lists, ~15%. The closest analogue, internet platforms, did close to two countries and stayed closed for about a decade, so I weight it double. That gives ~25-30%.

**Arithmetic:** the condition is a conjunction over ten slots. One non-US/PRC organization anywhere in the top ten resolves No, and the history of these lists shows that the tenth slot turns over.

**Resolver caveat:** lmarena.ai now 301-redirects to arena.ai. That domain is the same publisher's successor, so the fallback rule applies and the question should not be cancelled. On a DataLearner mirror (May 2026) of the board, Mistral ranked 91st overall. I note this only as a status-quo level and do not adjust for it beyond the analogue weight.

**Answer: 30.**

## Q4: DefiLlama stablecoin market cap on 2028-12-31

**Baseline re-check (arithmetic).** I summed DefiLlama `stablecoincharts/all` `totalCirculatingUSD` across all pegs ([stablecoins.llama.fi](https://stablecoins.llama.fi/stablecoincharts/all)). It shows **$294.1B on 2026-11-08**, against a peak of $317.1B on 2026-05-17 and $305.7B at Dec-2025. The level is down ~4% year to date. Year-end series: 2020 $27B, 2021 $163B, 2022 $138B, 2023 $131B, 2024 $204B, 2025 $306B.

**Reference class 1: new payment/store-of-value instruments after regulatory legitimation, once they reach ~$200-300B.**
- US money-market funds after Reg Q workarounds: ~$230B in 1982, then -25% in 1983 when MMDAs were legalised. Growth from 1982 to 1990 was ~+10%/yr.
- US ETFs at the ~$300B scale (2004-06): ~+30%/yr.
- EU e-money after the 2009 directive: modest single-digit to low-double-digit growth.
- Central tendency: **~+15-25%/yr**, with a fat left tail when a substitute is legalised or the market sours.

**Reference class 2: stablecoins' own post-2022 25-month growth ratios.** Dec-2022 -> Jan-2025 ~1.5x; Dec-2023 -> Jan-2026 ~2.35x; mid-2022 -> mid-2024 ~1.07x; the 2022-23 drawdown fell ~-20%. Across all 58 overlapping 25-month windows since 2020, the deciles are P10 0.88x, P50 1.86x, P90 11.8x, but the upper part is inflated by 2020-21 hypergrowth from a tiny base.

**Combination:** ~+20%/yr for 2.15 years gives ~1.4x, so P50 = $294B x 1.4 ≈ **$410B**. P10 is a 2022-style drawdown (~0.83x) ≈ $245B. P90 is about the 2023-25 pace (~2.4x) ≈ $700B.

**Answer:** P10 245, P50 410, P90 700 ($B).

## Q5: Fed announces a numerical yield ceiling/target (>= 1-yr maturity) before 2031

**Reference class:** explicit yield pegs or targets on securities of one year or longer, by reserve-currency issuers (USD, GBP, JPY, DEM/EUR, FRF, CHF, AUD, CAD, CNY), 1913/1940-2026.
- **Events:** US 1942 (peg to 1951, ended by the Accord); Japan September 2016 (10-year YCC, to March 2024); Australia March 2020 (3-year target, to November 2021). The UK's 1940s "cheap money" (3% war, Dalton's 2.5%) used rate guidance and tap issuance rather than a formally announced peg, so I count it half.
- **Rate:** ~3.5 events in ~500 issuer-years ≈ **0.7% per issuer-year**. Over the 4.15-year window that is ~3%.
- **US-specific:** 1 adoption in 113 years of the Fed ≈ 0.9%/yr, or ~3.6% over the window.
- **Sub-class with public debt near or above 100% of GDP** (US 1942-51, UK 1945-60s, Japan 1997-2026, Italy, France): ~2 events in ~80-100 issuer-years, ≈ 2-2.5%/yr, or ~9% over the window.

**Arithmetic adjustment:** the baseline 10-year yield of 5.17% is the only baseline input. A high starting yield is when pegs have been *adopted* (the US in 1942 pegged at the then-prevailing 2.5%, Japan at ~0%), so it does not move the class. I weight the unconditional ~3-4% more heavily than the high-debt sub-class's ~9%.

**Answer: 5.**

## Q6: BLS nonfarm business labor share, 2030 annual average

**Reference class:** I downloaded FRED PRS85006173 (labor share index, 2017=100, 1947Q1-2026Q3; [FRED](https://fred.stlouisfed.org/series/PRS85006173)) and rescaled it to the BLS percent level by setting 2026Q2 = 52.8%. I then took the change from Q2 of year t to the annual average of year t+4, for t = 1947-2021.
- **All years (n = 75):** mean -0.53pp, SD 1.57pp; P10 -2.49, P25 -1.66, P50 -0.46, P75 +0.81, P90 +1.33.
- **Since 1980 (n = 42):** mean -0.79, SD 1.68; P10 -2.64, P50 -0.93, P90 +0.97.
- **Decade changes in the annual average:** min -6.8pp (2000s), max +2.3pp, mean -1.15pp. The essay's claim maps onto the 2000s decade, the worst in the record.
- **Starts within 0.3pp of a record low (n = 16):** 4-year changes range from -2.7 to +2.7, mean ≈ +0.2. Record lows do not reliably extend.

**Arithmetic on the baseline:** the 2026Q3 print (index 93.729, out 2026-11-05) rescales to **52.45%**, already 0.35pp below Q2. Anchoring on Q3 and applying the full-sample quantiles, slightly widened for the shorter, 3.25-year horizon's rescaling uncertainty, gives the answer below. A drop to 2000s pace (-6.8pp per decade, ≈ -2.7pp over four years) lands at about P10.

**Answer:** P10 49.8, P50 52.0, P90 54.0 (%).

## Q7: Indian IT big-5 combined headcount at 31 Mar 2029 >= 10% below 31 Mar 2026

**Reference class 1, sector aggregate:** US "computer systems design and related services" employment (FRED [CES6054150001](https://fred.stlouisfed.org/series/CES6054150001), 1990-2026). The share of 36-month windows with a decline of 10% or more is **3.4% (n = 406)**. All of them start in late 2000-2001, the dot-com bust; the worst is -16.2% from March 2001.

**Reference class 2, single large IT/BPO firms, 3-year windows:**
- IBM 2012 -> 2015: ~-13%.
- IBM 2017 -> 2020: ~-13%.
- DXC FY2018 -> FY2021: ~-11%.
- CSC 2012 -> 2015 (with spin-offs).
- Wipro March 2023 (256,921) -> about March 2026: ~-8 to -10%.
- Accenture, Cognizant, Capgemini and TCS: no such window.
- Frequency across firm-windows: roughly 10-20%.

**Reference class 3, the big-5 combined itself:** I know of no 3-year window since 2000 with a combined fall of 10% or more. The worst, March 2023 (~1.59M) -> 2024/26, was single-digit (about -4% in FY2024).

**Arithmetic:** the five-firm sum diversifies firm-level shocks, so it sits between the sector rate (3%) and the single-firm rate (10-20%). With combined headcount at ~1.53M, a Yes needs about 150k net exits in three years.

**Answer: 7.**

---

**Sources:**
- [Epoch AI notable models dataset](https://epoch.ai/data/notable_ai_models.csv)
- [Epoch, trends in training cost](https://epoch.ai/blog/trends-in-the-dollar-training-cost-of-machine-learning-systems)
- [arXiv 2405.21015](https://arxiv.org/abs/2405.21015)
- [AnySilicon / IC Insights capex history](https://anysilicon.com/semiconductor-industry-capex-history-and-forecast-1983-2020/)
- [Design-Reuse / IC Insights 2021](https://www.design-reuse.com/news/news51109.html)
- [DefiLlama stablecoins API](https://stablecoins.llama.fi/stablecoincharts/all)
- [FRED PRS85006173](https://fred.stlouisfed.org/series/PRS85006173)
- [FRED CES6054150001](https://fred.stlouisfed.org/series/CES6054150001)
- [LMArena text leaderboard](https://lmarena.ai/leaderboard/text) (now redirects to arena.ai)

Figures without a link (railway, telecom, solar and shale capex; the IBM, DXC and CSC headcounts; the yield-peg episodes) are from standard histories and company filings as I recall them. They are approximate, roughly +/-15%, and were not re-verified in this session.

## Seat: fermi

**Numbers:** q1={'A': 18, 'B': 44, 'C': 36, 'D': 2} | q2=26 | q3=79 | q4={'p10': 265, 'p50': 410, 'p90': 680} | q5=4 | q6={'p10': 50.3, 'p50': 52.2, 'p90': 54.2} | q7=20

# Seat E2-fermi (compute-geopolitics effort, fermi lens, Wave 1)

**BLUF.** Decomposing the essay's training-cost line into GPU-hours, price per GPU-hour and gigawatts, a
$10B run in Epoch's own cost metric needs about a 1-2 GW cluster used for one run of 4 to 6 months,
published by end-2028 and then costed by Epoch within a year. Each step is plausible, and together they
give **~26%** for Q2. The top ten organizations on the Arena text board are already all US or Chinese.
The best organization from elsewhere (Mistral) sits about 45-60 Elo below the #10 cutoff, with nine or
more well-funded US/China labs in between, so Q3 is **~79%**. The other five questions are derived from
the same arithmetic. Q1 and Q5-Q6 use the simulation directionally only.

Forecast origin 2026-11-08. All arithmetic shown; correlations stated at the end.

---

## Adapter used (published as required)

- Command: `npx tsx scripts/tetlock-sim-adapter.ts --spec=docs/forecasts/commanding-heights-2026/adapter-spec.json`
- I re-ran it at repository HEAD `e319e77`. The spec's MODEL VINTAGE disclosure names `46df211`. Ignoring
  blank lines, my re-run output is **identical** to `adapter-output.md`, so the numbers quoted below are the
  precomputed ones. Where the two commits differ, it does not affect this spec's readings.
- **Statuses I obey:** q2, q3, q4 and q7 are **REFUSED**. I take no model number for them (no lab or
  training block, no model-quality or national-capability block, no money or crypto block, no sectoral
  employment block). q1, q5 and q6 are **DIRECTIONAL**: I use sign and rough size only and never a level
  or point estimate.
- Disclosures I carry forward:
  - The model's DC capex is "a WORLD composite (chips + facilities)... not the Big-4's cash capex". Its
    level is "~2.5-3x below observed 2025-26 spending".
  - Its labor share is "world labor compensation / GDP... (2025 level ~0.65, NOT comparable to BLS
    52.8%)", with AI cognitive payoff OFF by default.
  - It has "NO MONETARY BLOCK: no price level, no Fed, no yields, no stablecoins".
  - Its GDP levels are PPP 2017 international dollars.

Directional readings I use:

| Question | Reading | baseline | ai-energy-boom | debt-populism | lever:dc-fast | lever:dc-fast-ai-payoff |
|---|---|---|---|---|---|---|
| q1 | DC capex CAGR 2026->30, %/yr | 12.8 | 20.2 | 12.3 | 39.2 | 39.4 |
| q5 | world public debt/GDP 2030 | 0.89 | 0.89 | 1.07 | 0.89 | 0.88 |
| q5 | repression gap 2030, pp | 0 | 0 | 0 | 0 | 0 (2.0 only when forced by lever:repression-2pp) |
| q6 | labor share change 2026->30, pp | -0.11 | -0.75 | -0.11 | -0.11 | -1.92 |

---

## Q2: Epoch $10B training run, published by 2028-12-31 (centre of gravity). **26**

**Primary data.** I downloaded Epoch's database files on 2026-11-08:
https://epoch.ai/data/notable_ai_models.csv, all_ai_models.csv and frontier_ai_models.csv. Findings:

- The headline cost column is **"Training compute cost (2023 USD)"**. It is inflation-adjusted, not nominal.
- **Largest cost in the database:** Grok 4 (xAI, 2025-07-09) at **$388M**, with 5.0e26 FLOP. Next are
  GPT-4.5 at $366M (3.8e26) and Grok 3 at $218M (3.5e26).
- **No 2026 frontier model has a cost estimate yet.** The largest-compute entry is "GPT-6 Astra" (OpenAI,
  2026-09-03) at 9.4e26 FLOP with the cost field blank. GPT-5 (6.6e25) also has no cost. The only 2026
  costs in the file are small, such as SK Telecom A.X K2 at $12M.
- Epoch's Grok 4 write-up (https://epoch.ai/data-insights/grok-4-training-resources) estimates "246
  million H100-hours" at "$1.90 to $2.20 per H100-hour". It warns: "The FLOP and GPU-hour estimates for
  Grok-4 are largely based on public statements from xAI, which are often vague. So there is significant
  uncertainty around the point estimate."

**Threshold conversion.** CPI 2023 to 2028 is about 1.029 × 1.027 × 1.03 × 1.025 × 1.025 ≈ 1.14, so
$10B nominal ≈ **$8.7B in 2023 USD**. A resolver that compares Epoch's 2023-USD figure directly against
$10B faces a ~14% higher bar, which is worth about -2pp. I price the nominal reading but flag it for the
signals and auditor seats.

**Decomposition 1: extrapolating the database's own maximum.**
- The maximum went from $37M (GPT-4, 2023-03) to $388M (2025-07): 10.5x in 2.33 years, or **2.75x/yr**.
- Extrapolated from 2025-07 to 2028-12 (3.45 years):
  - 2.75^3.45 ≈ 33, giving **$12.7B**
  - 2.4x/yr gives $8.0B
  - 3.5x/yr gives $29B
- The trend median sits right on the $8.7B (2023 USD) bar.
- **Evidence of a slowdown:** GPT-6 Astra's 9.4e26 FLOP is only 1.9x Grok 4's compute 14 months later.
  On trend it would be 4-5x. At ~1.4x/yr cheaper FLOP, that implies only ~$0.5-0.6B for the 2026 frontier,
  against ~$1.6B on the 3.5x line. Caveat: Gemini, Claude Opus 5 and Grok 5 are unestimated, and the 2026
  "~$1B runs" in the preamble are unconfirmed.

**Decomposition 2: physical (GPU-hours × price × duration).**
- Cost ≈ N_GPU × hours × amortized $/GPU-hour. Epoch's amortized method is close to rental-equivalent.
- A Rubin-class GPU-hour in 2028 costs about **$5-7** nominal.
- $10B / $6 ≈ **1.4-2.0B GPU-hours**. Over a 120-180 day run (2,900-4,300 h), that is
  **330k-690k GPUs dedicated to one run**.
- At ~2-3 kW all-in per GPU package, that is **~0.8-2.0 GW for one run**.
- Supply side: the largest single sites by 2028 (Stargate Abilene ~1.2 GW, xAI Colossus 2 ~1+ GW, Meta
  Hyperion first phase, Anthropic/Google TPU >1 GW, Amazon Rainier, Microsoft Fairwater linked sites)
  make a 1-2 GW run **physically possible** for perhaps 3-5 labs.
- The real constraint is the **final-run share** of a lab's fleet. Historically final runs took ~10% of
  R&D compute (Epoch's OpenAI 2024 decomposition: ~$0.4-0.5B of ~$5B R&D compute).
  - A top lab with a 4-6 GW fleet in 2028 at a 10-15% final-run share gets 0.4-0.9 GW, worth **$2-6B**.
  - $10B needs either an 8-10 GW fleet or a final-run share of 25-40%, an xAI-style all-in run.
  - Counting RL post-training in total compute helps.

**Multiplication.**
- P(some lab completes a run worth ≥$8.7B in 2023 USD and publishes the model by 2028-12-31) = **0.35**.
  Trend says ~0.5; the final-run-share arithmetic and the 2026 slowdown pull it down.
- × P(Epoch assigns a cost estimate by 2029-12-31 | such a model exists) = **0.65**. Today the frontier
  coverage rate is 3 of the top 5 by compute, and 0 of 1 for 2026. If one lab clears the bar, 1-2 others
  probably come close, which raises the chance of coverage.
- = 0.23, plus ~0.03 where Epoch's estimate lands above a true value just under the bar.
- **= 0.26.**
- Not priced: a change in Epoch's primary method to hardware-acquisition cost. That metric is ~20x
  larger (GPT-4: ~$800M acquisition vs $40M amortized) and would flip Q2 to near-certain. I give it ≤3%
  and it is inside the 0.03.

## Q3: Top-10 distinct Arena orgs all US/China on 2028-12-31 (centre of gravity). **79**

**State now.** The resolver itself was not readable: `lmarena.ai/leaderboard/text` 301-redirects to
`arena.ai/leaderboard/text`, and arena.ai returned HTTP 403 to my fetch. **Auditor note:** the board has
rebranded to "Arena" (arena.ai). Under the preamble's successor rule it should still resolve, but the
signals seat should confirm. Secondary snapshots:

- **Oct 8 2026 snapshot (search summary, default view):** Google gemini-4-argon-high 1525, Anthropic
  claude-opus-5.5-high 1507, Meta muse-spark-1.3-max, Moonshot kimi-k3-max 1488, OpenAI gpt-5.6-sol 1485,
  then Alibaba, Xiaomi and Z.ai, "SpaceXAI" grok-4.20 1475, and DeepSeek v4.1 1475. That is **10 of 10
  distinct organizations US/China**, with the #10 organization at ~1475. Source: secondary summaries of
  arena.ai, e.g. https://manifold.markets/Terminator2/which-lab-will-have-the-1-model-on and
  https://www.versusapps.com/blog/lmarena-leaderboard-september-2026, and the
  versusapps note that Gemini 4 Argon's "early score is preliminary".
- A conflicting BenchLM snapshot (https://benchlm.ai/llm-leaderboard-history) lists a "Gemini 4 Carbon
  (High)" at 1540 and different model names. Treat it cautiously.
- **Best organization outside the US and China: Mistral.**
  - Mistral Large 3 is ~1415 and Medium 3.5 ~1427 on overall text with style control (third-party,
    "data dated August 2026").
  - One undated Arena lab page shows "Mistral Large 4 · Proprietary at 1433, ranked 19th".
  - Mistral Large 4 entered public preview 2026-10-06 with no Arena rank found.
  - **The gap to the #10 cutoff is ~45-60 Elo, with ~9 US/China organizations in between.**
  - Cohere has no current Arena score.

**Elo-gap arithmetic.**
- Top-of-board scores rise ~50-70 Elo/yr, so Mistral's gap to the #10 cutoff is ~8-12 months of frontier
  progress.
- Mistral's compute: Mistral Compute ~18k Grace-Blackwell, a planned 1.4 GW Paris campus, ~€1.7B raised
  in 2025. That is roughly **1/30-1/100 of a top US lab's 2028 fleet**.
- With final-run budgets growing ~3x/yr (Q2), the compute gap stays ≥10x. Open-weight distillation from
  Chinese releases is the main gap-closer, and it equally lifts the Chinese labs that hold seats 6-10.
- The bench is getting deeper on the US/China side. Xiaomi, Meituan, ByteDance Seed, Tencent, MiniMax,
  StepFun, Microsoft MAI, Amazon, Thinking Machines, SSI (Palo Alto) and Reflection all count as US/China.
  More entrants push the cutoff up.
- It is a single-day snapshot, so a fresh non-US/China release could briefly sit high. Preliminary scores
  move ±10-20 Elo.

**Hazard sum (P that each puts an organization in the top 10 on that day):**

| Hazard | Probability |
|---|---|
| Mistral (France) | 7% |
| Korean sovereign programme (LG Exaone, Upstage, SKT, Naver) | 2% |
| Japan (Sakana, SoftBank-domestic) | 1.5% |
| Gulf (G42/MBZUAI, TII, Humain) | 1.5% |
| New well-funded European/UK lab | 1.5% |
| Classification events (a Chinese lab redomiciled to Singapore, a Hong Kong-headquartered org, a resolver reading Arena's org label instead of the ultimate parent) | 1.5% |
| Cohere (Canada) | 0.5% |
| India (Sarvam etc.) | 0.5% |
| **Sum** | **≈16%** |

These hazards are **positively correlated**: one compression event, in which Arena saturates and the top
spread narrows, raises them all. So P(none) ≈ 1 - 0.16 + a small correlation credit ≈ 0.84. I then shave
5pp because Mistral and Cohere were in the top-10 organizations as recently as 2024 (Command R+ was #6
model in April 2024, https://simonwillison.net/2024/Apr/9/command-r/), so it is not unprecedented.
**= 0.79.**

## Q1: Big-4 capex ratio R = 2030/2026. **A 18 / B 44 / C 36 / D 2**

**Components.**
- 2026 cash PP&E is ≈ $680-720B. Guidance is ~$720-745B, but finance leases sit in Microsoft's and Meta's
  headlines.
- 2027 consensus (S&P Global, Oct 26 2026 preview,
  https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/10/microsoft-and-alphabet-earnings-previews):
  - Microsoft FY27 ~$197B
  - Alphabet FY27 ~$312B
  - A separate undated S&P table shows Alphabet $357B, Amazon $319B, Meta $164B, Microsoft $189B, about
    **$1.0T**, mixed fiscal/calendar years and lease definitions
  - The same source projects negative FCF at three of the four in 2027
- So **R27 ≈ 1.35**.

**Physical ceiling on D.**
- R=4 means ~$2.8T cash capex in 2030. At ~$55-60B/GW all-in (Rubin/Feynman era), that is ~45-50 GW/yr of
  Big-4-only build.
- That exceeds plausible gas-turbine, transformer and grid additions, and roughly equals total US
  nameplate additions.
- **Directional cross-check:** even the model's extreme lever (`lever:dc-fast`, 39%/yr) compounds to
  1.39^4 ≈ 3.8 < 4. Sign and size only; the level is understated.
- **D = 2.**

**R in C (≥2):**
- Needs 2027→30 growth ≥ 1.48x (~14%/yr) on top of R27.
- That means ~$1.4T in 2030, ~23-25 GW/yr including chip refresh of the 2026 fleet.
- Operating cash flow would have to grow ~15%/yr plus ~$200-300B/yr of debt or off-balance-sheet SPVs.
- Feasible if AI revenue compounds at 30%+.
- P(boom through 2027) ≈ 0.8. P(≥14%/yr for 2028-30 | boom) ≈ 0.45, so **C+D ≈ 0.36 + 0.02**.

**R in A (<1):**
- Needs 2030 ≥ ~26% below a 2027 peak.
- Telecom capex fell ~55% from 2000 to 2002, and shale capex fell >50% in 2015-16.
- Capex is already ≈ OCF, so a revenue miss forces cuts fast.
- P(peak by 2028 with a ≥26-35% retrenchment by 2030) ≈ **0.18**.

**B is the residual: 0.44.**

**Model directional reading.** All six runs have positive DC-capex growth. Baseline is 12.8%/yr
(→1.6x), the boom scenario 20%/yr (→2.1x) and the levers ~39%/yr. That is consistent with B/C and against
A in an un-shocked world. The model has no financial cycle, so it cannot price A. I do not adopt its
pace; its 2026 level is understated 2.5-3x.

## Q4: Stablecoin market cap on DefiLlama, 2028-12-31. **P10 265 / P50 410 / P90 680 ($B)** (model REFUSED)

- **Now:**
  - "$308.0 billion as of 13 August 2026, up 14.3% year over year". The peak was "$322.4 billion on 17
    May 2026". Third-party summaries of DefiLlama, not the dashboard itself
    (https://cryptobriefing.com/stablecoin-market-record-322-billion/).
  - YTD 2026 is ~flat from ~$308B at end-2025.
  - Composition (June 2026): USDT ~$185B (59%), USDC ~$74B (24%), others ~$50-55B.
- **Component growth over 2.35 years:**

| Component | Growth assumption | End-2028 |
|---|---|---|
| USDT (EM dollar savings + trading collateral) | ~10%/yr | $185B × 1.10^2.35 ≈ $231B |
| USDC + GENIUS-licensed bank/fintech issuers (effective ~2027) | ~22%/yr | $74B × 1.22^2.35 ≈ $118B |
| Others | ~12%/yr | $52B × 1.12^2.35 ≈ $68B |
| **Total (P50)** | | **≈ $417B, rounded to $410B** for the flat 2026 momentum |

- **P10:** a crypto winter with -15% in trading collateral, as in 2022 when supply fell ~30% from its
  peak, plus tokenized bank deposits taking share. ≈ $265B.
- **P90:** a crypto bull market, with big-tech and bank issuance under GENIUS adding ~$150-250B.
  ≈ $680B.
- The essay's AI-agent payments channel is set at ~0 by 2028: no observable volume today.

## Q5: Fed numerical yield cap/target (≥1y maturity) before 2031. **4**

- **Model, directional:**
  - World public debt/GDP 2030 is 0.89 at baseline and 1.07 under debt-populism, both far below the
    model's 1.50 fiscal-dominance trigger.
  - The repression gap is 0 in every run not forced by the lever.
  - The model's real safe rate rises +0.2 to +0.8pp from 2026 to 2030.
  - Sign: **no endogenous fiscal-dominance pressure by 2030**. Read as world aggregate, not US, and not
    the Fed's reaction function.
- **Fermi paths:**

| Path | P(trigger) | P(numerical cap \| trigger) | Product |
|---|---|---|---|
| Recession to the zero lower bound, with YCC chosen over QE (the 2020 framework review rejected it) | 0.25 | 0.10 | 0.025 |
| Sustained high 10y (5.17% in Sep 2026) plus political pressure on a reshaped FOMC | 0.20 | 0.07 | 0.014 |
| Acute Treasury-market dysfunction answered with a stated ceiling | 0.01 | | 0.01 |

- Sum ≈ 0.049, minus a small overlap. **≈ 4.**

## Q6: BLS nonfarm business labor share, CY2030 average. **P10 50.3 / P50 52.2 / P90 54.2 (%)**

- **Components from 2026Q2 at 52.8%:**
  - Long-run trend: ~-0.2pp/yr (1980-2019 decline) × 4 years = **-0.8pp**.
  - AI and automation transfer:
    - Model directional: -0.1pp at baseline, **-0.75pp** in the boom scenario and **-1.9pp** with AI
      payoff on, by 2030. That is world compensation share, not BLS; sign and rough size only.
    - My expectation: -0.3pp, skewed toward -1.5.
  - Cycle: P(recession affecting 2028-30) ≈ 0.35. Recessions lift the share +1-2pp as profits fall
    faster. Expected value ≈ +0.5pp, and it widens the upper tail.
  - BLS benchmark-revision noise: ±0.5pp.
- **P50:** 52.8 - 0.8 - 0.3 + 0.5 ≈ **52.2**.
- **Tails:** the essay-level transfer (-1980-2020-sized, ~-6pp) is outside my P10. The decade-long claim
  is not testable by 2030.
- **Correlation:** Q1 C/D goes with a lower Q6.

## Q7: Indian IT big-5 headcount ≥10% below 31 Mar 2026 at 31 Mar 2029. **20** (model REFUSED)

- **31 Mar 2026 base** (company results via press,
  https://www.zeebiz.com/companies/news-infosys-headcount-falls-by-8440-qoq-to-329-lakh-attrition-rises-to-126-394183
  and https://www.angelone.in/news/stocks/tech-mahindra-share-price-in-focus-headcount-falls-by-1-993-in-q4fy26-attrition-rate-eases):

| Company | Headcount |
|---|---|
| TCS | 584,519 |
| Infosys | 328,594 |
| HCLTech | 227,181 |
| Wipro | 242,156 |
| Tech Mahindra | 147,623 |
| **Total** | **1,530,073** |

  The bar is **≤1,377,066**.
- **30 Sep 2026:** TCS 598,056, Infosys 332,542, HCLTech 230,339, Wipro 236,328, plus Tech Mahindra
  ~147k, for **≈1.544M**. So the remaining required fall is **≈ -167k (-10.8%) in 10 quarters ≈ -4.5%/yr**.
- **Decomposition:** headcount growth ≈ revenue growth (constant currency) - revenue-per-employee growth.
  - Revenue: median +3%/yr, sd 3.
  - AI-driven productivity: median +5.5%/yr, sd 3.
  - These are partly correlated, since AI deflation also cuts billable revenue, so the sd of the
    difference is ~3.5.
  - Headcount is therefore ~-2.5%/yr ± 3.5.
  - P(≤ -4.5%/yr) = Φ(-0.57) ≈ 0.28.
- **Adjustment:** headcount is managed through ~12-13% attrition and fresher intake, so it adjusts
  quickly; that is already in the sd. Companies have historically preferred hiring freezes to the
  >100k net cuts a sector-wide 10% needs (the FY24-FY26 slump cut ~2-3%). Shave to **20**.

---

## Assumed correlations (for the aggregator)

- **Q1 C/D ↔ Q2 YES:** strongly positive. A $10B run needs the multi-GW fleets that only a C-regime
  capex path delivers. P(Q2 | Q1=A) ≈ 0.10; P(Q2 | Q1=C) ≈ 0.40.
- **Q2 YES ↔ Q3 YES:** mildly positive. Bigger runs widen the compute gap facing non-US/China labs.
- **Q1 C/D ↔ Q6 lower, Q7 YES:** mildly positive.
- **Q4 and Q5:** roughly independent of the compute block by 2028-30.

## Sources

- Epoch AI data, downloaded 2026-11-08: https://epoch.ai/data/notable_ai_models.csv ,
  https://epoch.ai/data/all_ai_models.csv , https://epoch.ai/data/frontier_ai_models.csv
- Epoch Grok 4 resources: https://epoch.ai/data-insights/grok-4-training-resources
- Epoch cost trends: https://epoch.ai/blog/trends-in-the-dollar-training-cost-of-machine-learning-systems
- Arena / LMArena: https://arena.ai/leaderboard/text (HTTP 403 to this seat; lmarena.ai redirects here);
  https://www.versusapps.com/blog/lmarena-leaderboard-september-2026 ; https://benchlm.ai/llm-leaderboard-history ;
  https://manifold.markets/Terminator2/which-lab-will-have-the-1-model-on
- Mistral Large 4: https://benchmarklist.com/models/mistralai-mistral-large-4/
- S&P Global hyperscaler preview, Oct 26 2026:
  https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/10/microsoft-and-alphabet-earnings-previews
- Stablecoins: https://cryptobriefing.com/stablecoin-market-record-322-billion/ ;
  https://dlnews.com/articles/markets/the-stablecoin-boom-has-stalled-but-two-factors-will-restart-the-rise/
- Indian IT headcount: https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000 ;
  https://www.zeebiz.com/companies/news-infosys-headcount-falls-by-8440-qoq-to-329-lakh-attrition-rises-to-126-394183
- Simulation: `docs/forecasts/commanding-heights-2026/adapter-spec.json`, `adapter-output.md`
  (re-run identical at HEAD e319e77).

## Seat: signals

**Numbers:** q1={'A': 12, 'B': 46, 'C': 34, 'D': 8} | q2=15 | q3=80 | q4={'p10': 220, 'p50': 340, 'p90': 560} | q5=7 | q6={'p10': 49.8, 'p50': 51.7, 'p90': 53.7} | q7=12

# E2 compute-geopolitics / signals (A3, Wave 1)

**BLUF.** Current telemetry favours the US-China duopoly on the Arena text board (Q3 ~80%: today the eleven best-placed organizations are all US or Chinese). It is against an Epoch-recorded $10B run by 2028 (Q2 ~15%). The largest run Epoch logs grew only ~1.9x in the 14 months from Grok 4 to GPT-6 Astra. Epoch has published no cost estimate for any frontier model released after July 2025. And Q2's resolver is ambiguous: one of Epoch's three cost columns already shows **$10.7B for Grok 4**. Off-centre telemetry: stablecoin supply has fallen through 2026, the labor share made a new record low, the Fed is hiking rather than pegging, and Indian IT headcount is flat, not collapsing.

Lens discipline: this seat reports observables only, each with the caveat its source attaches. Secondary-press figures are marked as such. Where a primary source was readable (Epoch CSVs, the DefiLlama API, the BLS release PDF), I read it directly on 2026-11-08.

---

## Q2: Epoch $10B training run by 2028 (centre of gravity)

**Signals (Epoch's own data, downloaded 2026-11-08 from `https://epoch.ai/data/frontier_ai_models.csv` and `https://epoch.ai/data/all_ai_models.csv`):**

- **The largest logged run is GPT-6 Astra (OpenAI, published 2026-09-03), at 9.4e26 FLOP.** Epoch rates it "Likely". Its note reads: "per OpenAI and affiliates (e.g. Nvidia), 6 Astra was trained on at least 100,000 GB200s in Abilene, Texas (so 100,000 in 'Hardware quantity' is a lower bound/underestimate). This suggests around 9e26 FLOP (corresponding to ~100k GB200s over 90 days at 25% FP8 MFU). See more detailed estimate in this notebook, yielding a CI of ~[5e26, 2e27] FLOP."
  - **The row has no training-cost estimate in any column.**
- **Grok 4 (xAI, 2025-07-09), 5.0e26 FLOP, is the most expensive model Epoch has costed.** It carries three cost columns:

  | Epoch column | Grok 4 |
  |---|---|
  | `Training compute cost (2023 USD)` (amortized hardware + energy) | **$388M** |
  | `Training compute cost (cloud)` | blank |
  | `Training compute cost (upfront)` | **$10.72B** |

  - Epoch's data insight ([epoch.ai/data-insights/grok-4-training-resources](https://epoch.ai/data-insights/grok-4-training-resources), 2025-09-12) gives a median of **$490M**. Its caveats, verbatim:
    - the estimates "are largely based on public statements from xAI, which are often vague";
    - "There is significant uncertainty around our point estimate for these quantities";
    - the figures "do not even account for the costs of human labor."
  - The insight states no price year; the CSV's $388M is in 2023 USD.
- **Growth at the top has slowed.** The largest logged run went from 5e26 (Jul 2025) to 9.4e26 (Sep 2026): about **1.9x in 14 months, ~1.7x/yr**. The essay's line is 3.5x/yr in cost, and Epoch's earlier compute trend was 4-5x/yr.
  - Caveat: GPT-6 Astra's CI spans 5e26-2e27. At the upper end the growth is ~4x.
  - Caveat: closed labs (Anthropic, Google) have **no** compute estimates for their 2026 frontier models in the database, so "largest logged" is not "largest run".
- **Cost coverage is the binding constraint.** Of 417 models in Epoch's database dated since 2025-08-01, **only 2 have a `Training compute cost (2023 USD)` value**: SK Telecom's A.X K1 ($9.6M) and A.X K2 ($12.4M).
  - GPT-5 (Aug 2025) has had no cost value for 15 months. GPT-6 Astra has had none for 2 months.
  - The cost column is still maintained: Grok 4's row was last modified 2026-11-06. But estimates for closed frontier models lag by more than a year.
- **Secondary telemetry (not Epoch):**
  - Epoch's outlook, as relayed by secondary sources, is that the largest runs "will exceed $1 billion by 2027".
  - CloudZero's summary of Epoch's measured trend: "Frontier AI training costs rise 2.4-fold annually" ([rallies.ai/CloudZero](https://rallies.ai/news/frontier-ai-training-costs-rise-24-fold-annually-cloudzero-analysis-shows-e62d58f7d114a069)).
  - The ~3.5x/yr figure in the preamble comes from the essay; I could not find it on an Epoch page.

**Arithmetic on the telemetry.** Start from roughly $0.5B amortized (2023 USD) for a GPT-6-Astra-class run in Sep 2026 (my inference; Epoch has not published it). Projected to Dec 2028:

| Growth rate | Multiple to Dec 2028 | Cost |
|---|---|---|
| 2.4x/yr | ~7.5x | ~$3.7B |
| 3.5x/yr | ~18x | ~$9B |

So $10B is reachable only on or above the essay's line, and then Epoch still has to publish a cost by 2029-12-31.

**Resolution audit (Q2): material ambiguity.**

1. "Epoch's headline training-cost estimate, any method it reports as primary" does not pick a column. Epoch publishes three: amortized (2023 USD), cloud and upfront.
   - **The upfront column already exceeds $10B for a 2025 model (Grok 4: $10.72B).** If a resolver accepts it, Q2 is already Yes.
   - I forecast on the amortized `Training compute cost (2023 USD)` column, the one Epoch's cost charts and data insights headline. **Recommend the orchestrator lock that column explicitly.**
2. "Nominal USD" conflicts with Epoch's primary column, which is **constant 2023 USD**. The gap is about 10% by 2028, so in nominal terms the effective threshold is ~$9B in 2023 dollars. This is minor next to item 1.
3. "notable/frontier" covers two Epoch files (`notable_ai_models.csv`, `frontier_ai_models.csv`) plus `all_ai_models.csv`. A $10B run would appear in all of them, so this is harmless.

**Forecast: 15.**

---

## Q3: all top-10 Arena organizations US or China on 2028-12-31 (centre of gravity)

**Signals:**

- **Arena Text, style control on, snapshot 8 Nov 2026** (via the [BenchLeader mirror](https://www.benchleader.com/benchmarks/lmarena_text); arena.ai returns HTTP 403 to automated fetches, so I could not read the primary page). Distinct organizations in rank order, each at its best model:

  | Rank of best model | Organization | Country | Score |
  |---|---|---|---|
  | 1 | Google | US | 1527 |
  | 3 | Meta | US | 1513 |
  | 4 | Anthropic | US | 1505 |
  | 19 | Moonshot AI | CN | 1488 |
  | 22 | OpenAI | US | 1485 |
  | 23 | Alibaba | CN | 1483 |
  | 26 | Zhipu AI | CN | 1482 |
  | 29 | Xiaomi | CN | 1480 |
  | 37 | DeepSeek | CN | 1475 |
  | 40 | "SpaceXAI" (xAI) | US | 1475 |
  | 51 | Baidu | CN | 1467 |

  - **All 11 are US or Chinese. No non-US/China organization appears in the visible top 60.**
  - Caveats on the mirror:
    - It shows **no confidence intervals or vote counts**. The 10th place (DeepSeek and SpaceXAI, both 1475) is a tie at the displayed precision.
    - Several outside aggregators disagree on who is #1. One (Swfte) has a Claude model at 1531, so the snapshots are not mutually consistent.
- **Best non-US/China contender: Mistral (France).**
  - Mistral Large 3 scores ~1,415 (± 4, 41,365 votes) on an older third-party snapshot ([datalearner](https://www.datalearner.com/en/leaderboards/external/text-generation)); another comparison site gives 1,431.8. Neither gives a rank.
  - Mistral Large 4 was "Added to Text Arena" on **2026-10-08** ([Arena changelog](https://arena.ai/blog/leaderboard-changelog/)), but I found no published score.
  - On the visible numbers, the best European model sits roughly **40-60 points below the 10th organization**, with at least 11 US/Chinese organizations above it.
  - Mistral's own claim that Large 4 is "the best open-weight model developed in the US or Europe" is a vendor claim with no independent confirmation, per secondary coverage ([theodorosdimitriou.com](https://theodorosdimitriou.com/blog/mistral-large-4-european-sovereign-ai)).
- **Compute-stock signals bearing on whether a third country can close that gap by 2028:**
  - Mistral Large 4 is in Epoch at **1.24e25 FLOP** ("Confident", 2026-10-06), about **1/75 of GPT-6 Astra**. Apertus 70B (Swiss consortium) is at 6.7e24.
  - Korea's state frontier programme is ~4.7T won (~$3.5B). Per secondary press, its "bidding terms and technical specifications are expected to be disclosed in December 2026" ([winzheng](https://www.winzheng.com/en/article/south-korea-frontier-ai-model-4-7-trillion-won-sovereign-str)).
  - The UAE flagship K2-Think "is built on Alibaba's Qwen 2.5", per secondary coverage ([pdpspectra](https://pdpspectra.com/blog/sovereign-ai-initiatives-2026/)). That is a derivative, not an independent frontier model.
- **China stays in the race despite controls:**
  - Kimi K3 is the best open-weight model on the board (#19). Chinese labs hold 6 of the top 11 organization slots.
  - Reuters, via the [Manila Times](https://www.manilatimes.net/2026/11/07/business/foreign-business/china-puts-nvidia-chips-on-hold-in-hk/2464236), reports "ABOUT 600,000 of Nvidia's advanced artificial intelligence (AI) chips are stored in Hong Kong awaiting shipment to mainland China" while Beijing withholds import approval. This conflicts with a March 2026 report of approved H200 purchases, and the sources do not reconcile the two.
  - CNBC ([2026-11-05](https://www.cnbc.com/2026/11/05/moonshot-ai-nvidia-chips-europe-china.html)) reports Moonshot sought Blackwell capacity in Europe, noting that "remote access via overseas data centers offers a loophole".
  - Beijing proposed export controls on 23 AI technologies, with comments open to 15 Nov ([TNW](https://thenextweb.com/news/china-ai-export-controls-draft)).
  - Net: Chinese labs are compute-squeezed but present at the frontier on preference rankings.
- **Tail risks visible in telemetry:**
  - **HQ relocation.** Chinese AI startups re-domiciling to Singapore to escape US controls is an observed pattern (2025-26). One such lab in the top 10 would break "all ten".
  - **Org-label drift.** xAI now appears as "SpaceXAI".
  - A Gulf, Korean or European lab buying its way into the top 10 by end-2028.

**Resolution audit (Q3):**

1. **`lmarena.ai` now 301-redirects to `arena.ai`** (rebranded "Arena"). The preamble's fallback (closest successor by the same publisher) covers this, but the resolver should name arena.ai's Text leaderboard.
2. arena.ai **returns 403 to automated fetches**. Resolution needs a browser read or Arena's published dataset; third-party mirrors disagree with each other.
3. Arena ranks are "Rank (UB)", so **ties are common**. "Ten highest-ranked distinct organizations" needs a tie rule at 10th place. I suggest ordering by score, with a tie at 10th that includes a non-US/China organization resolving No. Today the 10th-place tie is between two US/China organizations, so it is harmless.
4. Organizations are taken "as published". A US lab listed under a holding or parent name ("SpaceXAI") still resolves via the ultimate-parent rule.

**Forecast: 80.**

---

## Q1: Big-4 capex regime, CY2030 / CY2026

**Signals (secondary press; not checked against 10-Qs):**

- **2026 guidance:** Amazon ~$220B (reaffirmed after Q3), Alphabet $195-205B (held), Microsoft ~$170B CY, Meta $135-145B (narrowed).
  - Microsoft's figure **includes finance leases**. One report says it was trimmed from ~$175B on 28 Oct "because third-party capacity deliveries slipped". Others cite ~$190B, of which ~$25B is attributed to component pricing ([tech-insider](https://tech-insider.org/microsoft-meta-google-ai-capex-725-billion-2026/), [tmtfinance](https://www.tmtfinance.com/intel/2026-hyperscaler-capex-tops-us700bn-analysis/)).
- **Q3 2026 actuals:** "Amazon $75.9bn net cash PP&E; Alphabet $51.4bn capex; Microsoft $45.2bn capex including lease commencements; Meta $34.91bn capex including lease principal". The tracker itself notes that "accounting bases differ" ([tmtfinance](https://www.tmtfinance.com/intel/2026-hyperscaler-capex-tops-us700bn-analysis/)).
  - Primary: Alphabet's 10-Q states "during the six months ended June 30, 2025 and 2026, we spent $39.6 billion and $80.6 billion on capital expenditures, respectively" ([SEC](https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000071/goog-20260630.htm)).
- **2027 outlook:**
  - Alphabet has signalled a further increase.
  - Microsoft says only that FY27 will grow.
  - Meta's CFO: "We aren't providing a specific outlook for 2027 capex at this time. Even this year, there are a range of outcomes embedded in our outlook."
  - Amazon's CEO reportedly expects capacity constraints to persist through 2027.
  - Several Wall Street firms project the group above $1T in 2027 on headline (lease-inclusive) bases.
- **Financing-climate telemetry:**
  - The Fed **raised** rates to 3.75-4.00% in mid-September ([CNBC 2026-09-16](https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html)).
  - The 10y is ~4.9-5.0%.
  - Component inflation is padding capex dollars (Microsoft's ~$25B).
  - Third-party delivery slippage is trimming capex.

**Read:** momentum carries 2027 to ~+30-40% on Q1's cash-PP&E definitions, so R ≥ 1.0 needs only modest post-2027 behaviour. Regime C needs 2028-30 growth averaging ≥ ~14%/yr after 2027. Telemetry cannot see past 2027, and the rate backdrop is tightening.

**Resolution audit (Q1):**

- Resolvable as written.
- Note that the 2026 denominator on Q1's definitions (Microsoft and Meta ex-leases) will be **below** the $720-745B headline. A panelist who uses the headline in the denominator but cash PP&E in the numerator biases R downward.
- Microsoft's June fiscal year means summing calendar quarters from 10-Qs and 10-Ks.

**Forecast: A 12 / B 46 / C 34 / D 8.**

---

## Q4: stablecoin market cap, 2028-12-31

**Signals (primary: DefiLlama API `https://stablecoins.llama.fi/stablecoincharts/all`, read 2026-11-08):**

| Date | Total, all pegs |
|---|---|
| **2026-11-08** | **$294.1B** (USD-pegged $292.4B) |
| All-time high in the API, 2026-05-17 | $317.1B |
| 2025-12-31 | $305.7B |
| 2025-11-08 | $303.7B |

- **Year on year: -3.2%. Since the peak: -7%.**
- The DefiLlama dashboard headline the same day read "$290.096b, down 2.23% over 7 days and 4.86% over 30 days". USDT ~$176.8B, USDC ~$70.6B.
- Secondary coverage:
  - The 2026 drawdown is "the largest since 2023 but dwarfed by 2022's 26% bear-market contraction".
  - Supply "remains tightly linked to crypto market cycles"; BTC is ~$80k vs a ~$126k Oct 2025 high.
  - Circle received an OCC trust charter on 10 July.
  - One analyst calls it "a relatively small pullback in what we believe is a long-term growth market"; others say "aggregate supply is a blunt instrument for measuring investor intentions".
  - Sources: [Bitcoin.com](https://news.bitcoin.com/stablecoin-market-sheds-12-7b-as-cryptos-dry-powder-runs-thin), [crowdfundinsider](https://www.crowdfundinsider.com/2026/07/291407-stablecoin-market-experiences-10-billion-decline-in-past-2-months-analysts-downplay-concerns/), [cointelegraph](https://cointelegraph.com/news/stablecoin-supply-plateaus-regulation-treasury-yields).
- **Read:** sixteen months after GENIUS-Act legitimation, telemetry shows a plateau or decline, not "near-unlimited demand". Supply still tracks the crypto cycle.

**Resolution audit (Q4):**

- The dashboard headline ($290.1B) and the API all-pegs sum ($294.1B) differ by ~1.4% on the same date. The preamble's ATH ($322B on 26 May) does not match the API's $317.1B on 17 May.
- The dashboard 403s automated fetches. **Recommend resolving on the API's all-pegs `totalCirculatingUSD` sum for the 2028-12-31 daily point.**

**Forecast: P10 220 / P50 340 / P90 560 ($B).**

---

## Q5: Fed yield ceiling or target before 2031

**Signals:**

- The Fed under Chair Warsh **hiked** to 3.75-4.00% in September, citing persistent inflation. The 10y closed at 5.016% that day ([CNBC](https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html)).
- Treasury increased long-end **buybacks** in August after a selloff ([CNBC 2026-08-19](https://www.cnbc.com/2026/08/19/bessent-treasury-buybacks-yields-warsh-fed.html)). Buybacks are explicitly excluded by Q5.
- Commentary:
  - Robin Brooks argues "a new Treasury-Fed accord is taking shape" ([Substack](https://robinjbrooks.substack.com/p/the-new-treasury-fed-accord-takes)). He is an analyst, not an official source.
  - Tim Duy calls it closer to YCC; another note calls it "yield volatility control, not yield curve control".
  - Fortune (2026-11-01) quotes an economist saying Warsh "is actually managing U.S. debt costs not inflation" ([Fortune](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/)).
  - Warsh's stated balance-sheet direction (shrink, shorten duration) **raises** long yields, which cuts against a peg.
- **No official statement of any numerical yield level was found.**

**Read:** fiscal-dominance chatter is rising, but the observable policy actions (hikes, QT, buybacks) run opposite to an announced peg.

**Resolution audit (Q5):** clean. "Announce a numerical ceiling or target" is a bright line.

**Forecast: 7.**

---

## Q6: BLS nonfarm business labor share, 2030 annual average

**Signals (primary: BLS USDL 26-1631, 2026-11-05, [bls.gov/news.release/pdf/prod2.pdf](https://www.bls.gov/news.release/pdf/prod2.pdf)):**

- Verbatim: "The labor share, which is the percentage of output that accrues to workers in the form of compensation, was 53.0 percent in the third quarter of 2026, the lowest level in the series, which begins in the first quarter of 1947."
- Q3 2026:
  - Productivity +3.6% (SAAR), up 2.1% year on year.
  - Unit labor costs -0.7%.
  - Real hourly compensation up 1.0% over four quarters.
  - Productivity is running ~1pp/yr ahead of real compensation, which implies a downward drift of roughly 0.4-0.6pp/yr in the share. That is my arithmetic, not a BLS figure.
- Revision caveat, verbatim: "the third estimate of nonfarm business sector quarterly labor productivity growth has differed from the first estimate by -1.1 to +1.4 percentage points about 80 percent of the time. This interval is based on estimates for reference quarters from the first quarter of 2001 to the second quarter of 2026."
- The release also incorporates the 2026 NIPA annual update, with measures "revised back to 2021". Q2 2026 hourly compensation was revised up 1.4pp.
- Because 53.0 is now the series low, **the preamble's "52.8% in 2026Q2" has been superseded**: Q2 must now be above 53.0.

**Resolution audit (Q6):**

1. **The baseline in questions.md is stale** (52.8% → revised above 53.0 on 2026-11-05).
2. The release text reports only the **quarterly** percent level. The "calendar-2030 annual average" in percent must be read from BLS's labor-share tables, or computed from the four quarterly levels in the first publication containing 2030Q4 (Q4 2030 preliminary, ~Feb 2031). I could not confirm that BLS prints an annual-average percent in the release itself. **Recommend specifying "mean of the four quarterly levels as first published with 2030Q4".**

**Forecast: P10 49.8 / P50 51.7 / P90 53.7 (%).**

---

## Q7: Indian IT big-5 headcount down ≥10%, Mar 2029 vs Mar 2026

**Signals (company results via press; secondary):**

- **30 Sep 2026:**

  | Company | Headcount |
  |---|---|
  | TCS | 598,056 |
  | Infosys | 332,542 |
  | HCLTech | 230,339 |
  | Wipro | 236,328 |
  | Tech Mahindra | 152,206 (+5,446 QoQ, "highest quarterly addition in two years") |
  | **Combined** | **~1,549,471** |

  - Tech Mahindra source: [newsbytes](https://www.newsbytesapp.com/news/business/tech-mahindra-hires-5446-in-q2-headcount-hits-152206/tldr). Secondary sources conflict: one says +1,928.
- Jul-Sep 2026 net change: +13,918, so ~1,535,553 at 30 Jun.
- **31 Mar 2026:** not found as one primary figure. From quarterly changes it is ≈1.53-1.54M, so **combined headcount is now ~+0.5-1% above the Mar 2026 base**.
  - FY26 combined change: secondary sources give -7,389 or -6,981 ([niftytrader](https://www.niftytrader.in/markets/tcs-cuts-12000-jobs-as-top/), [multibagg](https://www.multibagg.ai/market-pulse/articles/indian-it-job-cuts-fy26-cmrjjp4vp00chpc0kd736jt6l)). The sources "disagree on the full-year numbers".
- Fresher hiring plans for FY27: TCS 25,000, Infosys 20,000 (secondary).
- **Read:** reaching -10% (≤ ~1.38M) by Mar 2029 needs a ~-4%/yr decline from here for 2.5 years. Telemetry shows flat-to-up.

**Resolution audit (Q7):**

- **The parenthetical in questions.md is truncated**: "(Company-reported period-end headcount in each quarterly results release; an acquired firm's staff count.)" It does not say whether an acquired firm's staff are **included or excluded**. Recommend "included as reported". A large acquisition (e.g. HCLTech or TechM buying a 20k-person firm) could otherwise swing ~1.3pp.
- Tech Mahindra reports both total and IT-segment headcount (IT ~74,689). Use the **total**.

**Forecast: 12.**

---

## Resolution-audit summary (for the orchestrator)

| Q | Status | Issue |
|---|---|---|
| Q1 | OK | Denominator must be on the same ex-lease definitions; headline figures overstate 2026 |
| Q2 | **AMBIGUOUS, material** | Three Epoch cost columns; the upfront column already shows Grok 4 at $10.72B (→ trivially Yes). The primary column is 2023 USD, not nominal. Lock the `Training compute cost (2023 USD)` column |
| Q3 | Needs wording fix | lmarena.ai → arena.ai (301); site 403s automated reads; tie rule at 10th place unspecified |
| Q4 | Minor | Dashboard headline vs API sum differ ~1.4%; baseline ATH differs from API |
| Q5 | OK | — |
| Q6 | Baseline stale | 52.8% superseded by the NIPA revision (Q3 = 53.0 = record low); annual-average-percent read needs specifying |
| Q7 | **Truncated clause** | "an acquired firm's staff count" is missing include/exclude |

## Seat: bayes

**Numbers:** q1={'A': 32, 'B': 42, 'C': 23, 'D': 3} | q2=18 | q3=66 | q4={'p10': 241, 'p50': 400, 'p90': 663} | q5=5 | q6={'p10': 50.1, 'p50': 52.3, 'p90': 54.3} | q7=7

# E2 compute-geopolitics, bayes seat (A4, Wave 2)

**BLUF.** I start from my effort's outside-view numbers as priors. One signal moves a centre-of-gravity question a long way: the Arena text board is closed today, with all of the top ten or eleven organizations US or Chinese and the best outsider 40-60 Elo below the cutoff. That lifts Q3 from 30 to **66**. For Q2, three things together pull it down from 20 to **18**: the largest logged run grew only ~1.9x in 14 months, Epoch has costed no frontier model since July 2025, and a small resolver-ambiguity channel (Grok 4's "upfront" column is already $10.7B) partly offsets those two. Most of the other updates are weak, under 2:1, and I flag them. The posteriors stay close to the priors except for Q1, where the 2027 consensus moves mass from A to B, and Q6, where the prior's baseline was wrong by +0.55pp and I correct it before updating.

Method. Each prior is the outside-view seat's number. Each signal comes from my effort's signals or fermi seat and gets a likelihood ratio LR = P(signal | H) / P(signal | not H). The update is posterior odds = prior odds x product of LRs. I treat signals as conditionally independent only after removing overlaps, and I say where I did that. **Flag** marks an LR I cannot justify at or beyond 2:1 (LR between 0.5 and 2). Model outputs from the fermi seat's adapter are directional, so I give them LRs near 1 and never use them as levels.

---

## Q2: Epoch lists a >= $10B training run published by 2028-12-31 (centre of gravity)

**Prior: 20%.** The outside-view arrived at 0.4 x 0.6 = 0.24, then rounded down for 2023-USD deflation. I split the 20% into its two conjuncts so that each signal updates only the conjunct it bears on:
- P(run) = P(a run worth >= $10B nominal (~$8.7B 2023 USD) is completed and published by 2028-12-31) ≈ 0.33
- P(cov) = P(Epoch prints a headline cost for it by 2029-12-31 | it exists) = 0.60
- Check: 0.33 x 0.60 ≈ 0.20.

### Conjunct 1, the run itself

| # | Signal (seat) | P(s given H) | P(s given not H) | LR | Note |
|---|---|---|---|---|---|
| E1 | The largest logged compute went from Grok 4 at 5.0e26 (Jul 2025) to GPT-6 Astra at 9.4e26 (Sep 2026), ~1.9x in 14 months, ~1.7x/yr (signals, fermi). Epoch's note: "CI of ~[5e26, 2e27] FLOP". Caveat: closed labs (Anthropic, Google) "have no compute estimates for their 2026 frontier models". | 0.40 | 0.62 | **0.65** | **Flag (<2:1).** Logged-maximum series have stalled for 12-18 months before and then jumped. The Astra CI's top end is ~4x, and "largest logged" is not "largest run". |
| E3 | Big-4 2026 capex ~$720B, 2027 consensus ~$1T on a headline basis. GW-scale single sites by 2028: Abilene ~1.2 GW, Colossus 2 >1 GW, Hyperion (fermi, signals). | 0.95 | 0.80 | **1.2** | **Flag.** Capex keeps growing in both worlds, because most of it is inference and fleet. |
| E6 | Fermi's physical decomposition: $10B needs a 0.8-2 GW run lasting 4-6 months. At historical final-run shares of ~10-15%, a 4-6 GW fleet gives $2-6B, so $10B needs an all-in or 8-10 GW lab. | — | — | **0.85** | **Flag.** This is a re-derivation, not an observation. It mostly restates the slowdown in E1, so I discount it. |

Overlap removed: the signals seat's own back-projection (GPT-6 Astra at ~$0.5B, which needs ~3.8x/yr) is the same observation as E1, so I do not count it twice.

Posterior odds = (0.33/0.67) x 0.65 x 1.2 x 0.85 = 0.4925 x 0.663 = 0.327, so **P(run) = 0.246**.

### Conjunct 2, Epoch coverage

| # | Signal | LR on coverage odds | Note |
|---|---|---|---|
| E2 | The signals seat reads Epoch's CSVs: "Of 417 models in Epoch's database dated since 2025-08-01, only 2 have a `Training compute cost (2023 USD)` value" (both SK Telecom). GPT-5 has had no cost for 15 months and GPT-6 Astra none for 2 months. But the column is maintained (Grok 4's row was modified 2026-11-06), and Epoch costed the previous record run, Grok 4, within ~2 months ([Epoch data insight](https://epoch.ai/data-insights/grok-4-training-resources)). | **0.67** (1.5 → 1.0) | **Flag.** The 2-of-417 count is dominated by small models Epoch never costs. The relevant n is about 2 record-holding runs, of which 1 was costed. A first $10B run would be the salient kind of run Epoch writes up. |

P(cov) goes from 0.60 to **0.50**.

### Resolver channel

The signals seat found that `Training compute cost (upfront)` already shows **$10.72B for Grok 4**. The question says "headline ... any method it reports as primary", and Epoch's headline is the amortized 2023-USD column. Both seats recommend locking that column. I give a resolver reading the upfront column, or Epoch switching its primary method, **4%**.

The signals seat also quotes Epoch's own caveat, verbatim: the estimates "are largely based on public statements from xAI, which are often vague"; "There is significant uncertainty around our point estimate". That noise can push a true run just under the bar over it. Because most of the mass sits below the threshold, symmetric noise adds a net **+0.02**.

### Arithmetic

| Step | Value |
|---|---|
| Amortized-column path: 0.246 x 0.50 + 0.02 | 0.143 |
| Add resolver channel: 0.04 + 0.96 x 0.143 | **0.177** |

**Q2 = 18.** If the orchestrator locks the amortized column, my number is 14.

---

## Q3: All ten top Arena organizations US or PRC on 2028-12-31 (centre of gravity)

**Prior: 30%.** The outside-view's reference class is two-country closure of a frontier-tech top 10 (about 1 in 7 lists), with the internet-platforms list weighted double. That class is unconditional: it never looked at the current board. Over a horizon of only 25 months, the current state is the most diagnostic evidence there is.

| # | Signal (seat) | P(s given H) | P(s given not H) | LR | Note |
|---|---|---|---|---|---|
| S1a | **The board is closed today.** The signals seat's 8 Nov 2026 BenchLeader mirror shows the 11 best-placed organizations all US or Chinese, with "no non-US/China organization ... in the visible top 60". The fermi seat's independent 8 Oct snapshot agrees, 10 of 10. Caveats verbatim: the mirror shows "no confidence intervals or vote counts"; the 10th place "is a tie at the displayed precision"; outside aggregators "disagree on who is #1". | 0.90 | 0.30 | **3.0** | Justified above 2:1. If the board is closed in 2028, it is almost surely closed now. Open-2028 worlds mostly run through an outsider that is already near the cutoff, or a new entrant. The 2024 → 2026 history (Cohere and Mistral dropped out) shows composition persisting or closing, never reopening. |
| S1b | **Depth of the gap.** Mistral Large 3 is ~1,415 (± 4, 41,365 votes) or 1,431.8 on third-party sites. Mistral Large 4 was "Added to Text Arena" on 2026-10-08 with no score found. That puts the best outsider ~40-60 Elo below #10, with >= 9-11 US/China organizations in between. | 0.70 | 0.40 | **1.75** | **Flag (<2:1).** Correlated with S1a, so I keep it modest. Preliminary scores move ± 10-20, and top scores rise ~50-70 Elo/yr, so the gap is ~8-12 months of frontier progress. |
| S2 | **Compute stock.** Mistral Large 4 at 1.24e25 FLOP ("Confident"), ~1/75 of GPT-6 Astra. Korea's 4.7T won programme publishes its specs only in Dec 2026. The UAE's K2-Think "is built on Alibaba's Qwen 2.5" (secondary). | 0.85 | 0.65 | **1.3** | **Flag.** Partly redundant with S1b, since the Elo gap already reflects compute. |
| S3 | **China squeeze.** "ABOUT 600,000 of Nvidia's advanced AI chips are stored in Hong Kong awaiting shipment" while Beijing withholds approval ([Manila Times/Reuters](https://www.manilatimes.net/2026/11/07/business/foreign-business/china-puts-nvidia-chips-on-hold-in-hk/2464236)). This conflicts with a March report of approved H200 purchases, and the sources do not reconcile the two. Moonshot is seeking Blackwell capacity in Europe ([CNBC](https://www.cnbc.com/2026/11/05/moonshot-ai-nvidia-chips-europe-china.html)). | 0.50 | 0.55 | **0.9** | **Flag.** If Chinese labs fall back, deep US benches (MAI, Amazon, Thinking Machines, SSI, Reflection) mostly refill the slots. |
| S4 | **Classification hazards.** Chinese startups re-domiciling to Singapore is an observed 2025-26 pattern. Organization labels drift ("SpaceXAI"). | — | — | **0.85** | **Flag.** These are not-H mechanisms. The Hong Kong exclusion is an extra trap. |
| S5 | **Open-weight diffusion.** Kimi K3 is the best open-weight model, at 1488, which is above the #10 cutoff of ~1475. A non-US/China organization that post-trains it well could land in the top 10 under its own label. | — | — | **0.85** | **Flag.** Historically, third-party fine-tunes rarely beat their base model's organization on Arena, but the base is now above the cutoff. |

Posterior odds = (0.30/0.70) x 3.0 x 1.75 x 1.3 x 0.9 x 0.85 x 0.85:
- 0.4286 x 5.25 = 2.250
- x 1.3 = 2.925
- x 0.9 = 2.633
- x 0.85 = 2.238
- x 0.85 = 1.902

P = 1.902 / 2.902 = **0.655**.

Resolver issues from the signals seat:
- lmarena.ai 301-redirects to arena.ai. The successor rule covers that.
- arena.ai 403s automated reads.
- There is no tie rule at 10th place.

These bear on cancellation and noise, not on P(Yes | resolved). Today's 10th-place tie is between two US/China organizations.

**Q3 = 66.** This sits below the fermi seat (79) and the signals seat (80) because the 30% prior still carries weight, and the only signal I can justify above 2:1 is the one at 3.0.

---

## Q1: Big-4 capex regime, R = CY2030 / CY2026

**Prior** (outside-view): A 40 / B 32 / C 22 / D 6.

The likelihoods below are per regime, P(signal | regime).

| # | Signal (seat) | A | B | C | D | Note |
|---|---|---|---|---|---|---|
| S1 | 2027 momentum: cash-PP&E growth ~+30-40% (R27 ≈ 1.35). "Several Wall Street firms project the group above $1T in 2027" (headline, lease-inclusive). Amazon expects capacity constraints through 2027; Alphabet signals an increase. Meta's CFO, verbatim: "We aren't providing a specific outlook for 2027 capex at this time." | 0.40 | 0.75 | 0.90 | 0.95 | A:C = 0.44, about 2.25:1 against A. In the A analogues (telecom 2000, semis 2000, railroads 1887), the boom year was usually the peak. Here the year after the boom has a strong consensus, so A needs a >= 26% fall from a 2027 peak. |
| S2 | Financing climate: the Fed hiked to 3.75-4.00% in September ([CNBC](https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html)), the 10y is ~5%, and S&P projects negative 2027 FCF at three of the four ([S&P](https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/10/microsoft-and-alphabet-earnings-previews)). | 0.75 | 0.65 | 0.50 | 0.40 | **Flag.** A:C = 1.5. Hyperscalers are mostly funded from operating cash flow, so rates bite weakly until FCF goes negative. |
| S3 | Supply constraints and the physical ceiling: Microsoft trimmed guidance "because third-party capacity deliveries slipped". R=4 means ~$2.8T, or ~45-50 GW/yr for the Big-4 alone (fermi). Partly offset by component inflation (~$25B of Microsoft's figure). | 1.0 | 1.0 | 0.85 | 0.40 | The D:B ratio of 0.4 is justified (2.5:1). The ceiling is physical: gas turbines, transformers, interconnects. |
| S4 | Model, directional: DC-capex CAGR is positive in all six runs (12.8-39%/yr). The model has no financial cycle. | 1 | 1 | 1 | 1 | Set to 1 on purpose: the model cannot see regime A, and its level is understated 2.5-3x. |

Unnormalised posterior:

| Regime | Arithmetic | Value |
|---|---|---|
| A | 0.40 x 0.40 x 0.75 x 1.0 | 0.120 |
| B | 0.32 x 0.75 x 0.65 x 1.0 | 0.156 |
| C | 0.22 x 0.90 x 0.50 x 0.85 | 0.0842 |
| D | 0.06 x 0.95 x 0.40 x 0.40 | 0.0091 |
| Sum | | 0.3693 |

Normalised: A 0.325, B 0.422, C 0.228, D 0.025.

**Q1 = A 32 / B 42 / C 23 / D 3.**

Definitional caveat from the signals seat: on Q1's ex-lease definitions the 2026 denominator is below the $720-745B headline. That cuts toward a higher R, but by a small amount, and the 2027 consensus is also headline-based.

---

## Q4: DefiLlama stablecoin market cap, 2028-12-31

**Prior:** the outside-view's P10 245 / P50 410 / P90 700. I represent it as a three-scenario lognormal mixture on the 2.15-year growth multiple. The mixture reproduces the prior as P10 250 / P50 418 / P90 712, close enough.

| Scenario | Median multiple | Log sd | Prior weight |
|---|---|---|---|
| Bear | 0.85x | 0.12 | 0.20 |
| Base | 1.40x | 0.15 | 0.55 |
| Bull | 2.30x | 0.20 | 0.25 |

| # | Signal (seat) | P(s given Bear : Base : Bull) | Note |
|---|---|---|---|
| S1 | The 2026 drawdown, from the [DefiLlama API](https://stablecoins.llama.fi/stablecoincharts/all) all-pegs sum: $294.1B on 2026-11-08, "-3.2%" year on year, "-7%" from the $317.1B peak. The dashboard read "$290.096b, down 2.23% over 7 days and 4.86% over 30 days". Supply "remains tightly linked to crypto market cycles", with BTC at ~$80k against a ~$126k high. | 0.50 : 0.40 : 0.30 | **Flag (Bear:Bull = 1.67).** It cannot go higher: the last time YoY was negative (2023), 2-year forward growth was ~1.7-1.95x (Mar/Jun 2023 → 2025), against ~1.13x from Sep 2022. n = one episode. |
| S2 | Circle's OCC charter (10 July). GENIUS-licensed bank issuers arrive ~2027. | 1 : 1 : 1 | Already inside the prior's "after legitimation" reference class, so I do not count it again. |
| S3 | Fermi's component build (USDT 10%/yr, USDC+ 22%/yr) gives a P50 of ~$417B. | 1 | It shares the prior's baseline and growth logic, so it carries no independent evidence. |
| — | Baseline re-anchor: the dashboard and API differ by 1.4% on the same date. I use $292B. | — | Arithmetic only, not a likelihood update. |

Posterior weights: Bear 0.253, Base 0.557, Bull 0.190. Simulated mixture (400k draws) x $292B gives **P10 241 / P50 400 / P90 663**.

**Q4 = 241 / 400 / 663 ($B).** This sits above the signals seat's 340. Momentum alone is weak evidence about growth over 25 months, and the 2023 episode shows exactly that kind of reversal.

---

## Q5: Fed numerical yield ceiling or target before 2031

**Prior: 5%.** Prior odds 0.0526.

| # | Signal (seat) | LR | Note |
|---|---|---|---|
| S1 | The Fed under Warsh **hiked** in September, citing inflation. Warsh's stated balance-sheet direction is shrink and shorten, which raises long yields. | **0.7** | **Flag.** Over four more years, the stance today is weakly diagnostic. |
| S2 | Fiscal-dominance commentary: Robin Brooks, "a new Treasury-Fed accord is taking shape" ([Substack](https://robinjbrooks.substack.com/p/the-new-treasury-fed-accord-takes)); Fortune quoting an economist that Warsh "is actually managing U.S. debt costs not inflation" ([Fortune](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/)). Treasury long-end buybacks, which Q5 excludes. Signals seat: "No official statement of any numerical yield level was found." | **1.5** | **Flag.** Analyst commentary. Chatter is cheap under not-H too. |
| S3 | The 10y at ~5.0-5.17%: high yields plus political pressure is fermi's path 2. | **1.2** | **Flag.** |
| S4 | Model, directional: world public debt/GDP in 2030 is 0.89-1.07, far below the 1.50 repression trigger, and the repression gap is 0. World aggregate, not the Fed's reaction function. | **0.85** | **Flag.** Directional only. |

Posterior odds = 0.0526 x 0.7 x 1.5 x 1.2 x 0.85 = 0.0526 x 1.071 = 0.0564, so **P = 5.3%**.

**Q5 = 5.** Every signal is under 2:1 and they roughly cancel, so the prior stands.

---

## Q6: BLS nonfarm business labor share, CY2030 annual average

**The prior needs a baseline correction first, as arithmetic and not as evidence.** The outside-view rescaled the 2017=100 index so that 2026Q2 = 52.8% (the stale preamble figure), which put Q3 at 52.45%. I read the BLS release myself ([USDL 26-1631, prod2.pdf](https://www.bls.gov/news.release/pdf/prod2.pdf)). It states, verbatim: "The labor share, which is the percentage of output that accrues to workers in the form of compensation, was 53.0 percent in the third quarter of 2026, the lowest level in the series, which begins in the first quarter of 1947." Its data "reflect the 2026 Annual Update of the National Income and Product Accounts".

The outside-view's quantiles were changes from 52.45: -2.65 / -0.45 / +1.55. Applied to 53.0, the corrected prior is **P10 50.35 / P50 52.55 / P90 54.55**.

| # | Signal (seat) | Shift to the median, or LR | Note |
|---|---|---|---|
| S1 | Productivity +2.1% YoY against real hourly compensation +1.0% "over the last four quarters" (BLS). The signals seat's arithmetic gives a -0.4 to -0.6pp/yr drift. | -0.3pp (LR ≈ 1.3 for "decline continues") | **Flag.** Real compensation is CPI-deflated while the share uses the output deflator, so the gap is not the share's drift. BLS caveat, verbatim: productivity "has differed from the first estimate by -1.1 to +1.4 percentage points about 80 percent of the time." |
| S2 | Starting at a record low: the outside-view's subclass of starts within 0.3pp of a record (n=16) had a mean 4-year change of ≈ +0.2. "Record lows do not reliably extend." | +0.2pp | **Flag.** n=16 with overlapping windows. It offsets S1. |
| S3 | Model, directional: -0.11pp (baseline), -0.75 (boom), -1.92 (AI payoff on), 2026→30. World compensation share, "NOT comparable to BLS". | -0.1pp | **Flag.** Sign only. |
| S4 | Recession risk from Fed tightening, which lifts the share (fermi: +1-2pp in recessions). | 0 | Already inside the prior's historical distribution of changes. |

Net median shift: -0.2pp. Spread unchanged.

**Q6 = P10 50.1 / P50 52.3 / P90 54.3 (%).**

Resolver note carried from the signals seat: the release text prints only quarterly levels, so the CY2030 average should be read as the mean of the four first-published quarters.

---

## Q7: Indian IT big-5 headcount at 31 Mar 2029 >= 10% below 31 Mar 2026

**Prior: 7%.** Prior odds 0.0753.

| # | Signal (seat) | P(s given H) | P(s given not H) | LR | Note |
|---|---|---|---|---|---|
| S1 | The combined total at 30 Sep 2026 is ~1.549M, ~+0.5-1% above the Mar 2026 base (~1.53M). Jul-Sep was net +13,918, and TechM's +5,446 was its "highest quarterly addition in two years" (one source says +1,928; sources conflict). | 0.35 | 0.60 | **0.58** | **Flag (1.7:1).** Under H the decline could be back-loaded. The bar now needs ≈ -10.8% in 10 quarters. |
| S2 | FY27 fresher plans: TCS 25k, Infosys 20k (secondary). | — | — | **0.7** | **Flag.** Plans, not hires. |
| S3 | FY26 cuts: TCS -23,460, combined ≈ -7k ("sources disagree on the full-year numbers"). Wipro -6,716 in Q2. | — | — | **1.3** | **Flag.** Restructuring is visible but small. |
| S4 | Fermi decomposition: revenue +3%/yr minus AI productivity +5.5%/yr gives ≈ -2.5%/yr ± 3.5, so P ≈ 0.28. | — | — | **1.8** | **Flag.** The +5.5%/yr AI-productivity input is assumed, not measured, and S1's flat-to-up print contradicts the decomposition's central drift. |

Posterior odds = 0.0753 x 0.58 x 0.7 x 1.3 x 1.8 = 0.0753 x 0.950 = 0.0715, so **P = 6.7%**.

**Q7 = 7.**

The signals seat flagged a truncated acquisition clause. If acquired staff are included, acquisitions push against H. I make no adjustment.

---

## Coherence checks

- **Q1 ↔ Q2.** P(Q2) = 0.18 against P(C+D) = 0.255. The fermi conditionals were P(Q2 | A) ≈ 0.10 and P(Q2 | C) ≈ 0.40. Applied to my Q1, they imply ~0.32 x 0.10 + 0.42 x 0.22 + 0.255 x 0.40 ≈ 0.23 on the true-run reading. That is before the coverage and column discount, so it is consistent with 0.18.
- **Q2 ↔ Q3.** Both lean on the same compute-gap observations, E1 and S2. Slower frontier growth (E1) narrows the gap for outsiders, which would cut Q3 a little. I already priced that inside S1b's modest LR.
- **Q6 ↔ Q7.** Both priors stay near "drift, no cliff". Neither moved by more than 0.3pp or 0.3 percentage points.

## Sources

- Epoch AI data: https://epoch.ai/data/notable_ai_models.csv ; https://epoch.ai/data/frontier_ai_models.csv ; https://epoch.ai/data-insights/grok-4-training-resources (as read by my effort's fermi and signals seats on 2026-11-08)
- Arena: https://arena.ai/leaderboard/text (403 to automated reads); https://www.benchleader.com/benchmarks/lmarena_text ; https://arena.ai/blog/leaderboard-changelog/ ; https://www.datalearner.com/en/leaderboards/external/text-generation
- Manila Times/Reuters: https://www.manilatimes.net/2026/11/07/business/foreign-business/china-puts-nvidia-chips-on-hold-in-hk/2464236 ; CNBC: https://www.cnbc.com/2026/11/05/moonshot-ai-nvidia-chips-europe-china.html
- S&P Global: https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/10/microsoft-and-alphabet-earnings-previews ; tmtfinance: https://www.tmtfinance.com/intel/2026-hyperscaler-capex-tops-us700bn-analysis/
- DefiLlama API: https://stablecoins.llama.fi/stablecoincharts/all
- Fed and Treasury: https://www.cnbc.com/2026/09/16/treasury-yield-bond-market-fed-decision.html ; https://robinjbrooks.substack.com/p/the-new-treasury-fed-accord-takes ; https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/
- BLS Productivity and Costs, USDL 26-1631 (2026-11-05): https://www.bls.gov/news.release/pdf/prod2.pdf (I read the PDF directly in this seat to verify the 53.0% labor-share caveat)
- Indian IT: https://www.newsbytesapp.com/news/business/tech-mahindra-hires-5446-in-q2-headcount-hits-152206/tldr ; https://www.zeebiz.com/companies/news-infosys-headcount-falls-by-8440-qoq-to-329-lakh-attrition-rises-to-126-394183

## Seat: premortem

**Numbers:** q1={'A': 24, 'B': 42, 'C': 30, 'D': 4} | q2=16 | q3=66 | q4={'p10': 215, 'p50': 355, 'p90': 650} | q5=8 | q6={'p10': 50.2, 'p50': 52.4, 'p90': 54.6} | q7=11

# E2 compute-geopolitics, premortem seat (A5, Wave 2, red team)

**BLUF.** The compute-geopolitics effort left out geopolitics. All three Wave-1 seats modelled the US-China race as a smooth trend in which politics only bends slopes (export-control drag, compute gaps, financing climate). None priced a **discontinuity**: a break in the chip supply chain, or in the two instruments that resolve Q2 and Q3. That shared blind spot correlates the tails. Separately, Q3 at ~80 rests on a compute-gate argument that the leaderboard itself refutes, and Q2's coverage factor uses a stale rate. My numbers: Q3 **66** (modal ~80), Q2 **16**, Q1 A **24** (the modal seats had 12-18), Q5 **8**, and Q6 shifted up for a stale baseline.

Forecast origin 2026-11-08. Lens discipline: I attack my effort's Wave-1 seats (outside-view, fermi, signals). I read only `questions.md`, the E2 mandate and premortem lens in `efforts.md`, and `seats/E2-wave1-packet.md`. My own numbers are at the end and are not an average of theirs.

---

## 1. The shared assumption attacked: "the race is continuous"

**What every Wave-1 seat assumed and none questioned.**
- Through 2028-30, TSMC output reaches the US labs on schedule.
- Chinese labs stay listed on a US-run leaderboard.
- Epoch and Arena keep measuring the frontier the way they do today.

**How each seat carried it.**
- Outside-view took demand-cycle reference classes (railroads, semiconductors, telecom). In those cases the commodity could always be bought.
- Fermi converted dollars into GPU-hours and gigawatts on the assumption that Rubin-class supply is not in doubt. Its Q3 hazard list, and every channel in it, is about catch-up by third countries.
- Signals reported export-control friction (600k Nvidia chips held in Hong Kong, China's draft export controls on 23 AI technologies), but only as a slope on China's trend.

No seat priced a Taiwan Strait event. Nor did any seat price a rule that removes one side of the duopoly from the instruments.

**How large the omitted mass is.**
- A CSIS expert survey (Nov-Dec 2023, n = 52 US and 35 Taiwan experts) found that 81% of US experts and 60% of Taiwan experts judged that Beijing *could* impose a blockade within five years. That measures perceived capability, not intent or likelihood ([CSIS](https://www.csis.org/analysis/surveying-the-experts-us-and-taiwan-views-chinas-approach-taiwan)).
- A Substack piece from early 2024 cites Metaculus at 29% for a "full-scale" blockade before 2030 ([tellingthefuture](https://tellingthefuture.substack.com/p/the-next-taiwan-strait-crisis)). That figure is stale and comes from a secondary source.
- The PLA's "Justice Mission 2025" (Dec 2025) rehearsed blockades of the main ports, with a coast-guard blockade line ([USNI](https://news.usni.org/2025/12/29/china-launches-blockade-drills-around-taiwan-in-protest-of-u-s-arms-sales); [Maritime Executive](https://maritime-executive.com/article/china-launches-massive-naval-drill-simulating-blockade-of-taiwan)).
- In June 2026 Taiwan ran tabletop exercises on a customs-declaration "quarantine" ([Taipei Times](https://www.taipeitimes.com/News/taiwan/archives/2026/06/26/2003859776)).

**My prices.** I discount the crowd figure heavily, because blockades are costly to Beijing, which needs TSMC output too.

| Event | Probability |
|---|---|
| A quarantine, blockade or conflict that disrupts TSMC exports for ≥1 month, before end-2028 | ≈ 5% |
| The same, before 2031 | ≈ 9% |
| A US rule (or PRC export control) that removes Chinese frontier models from US platforms, or forces Chinese labs to stop serving abroad, by end-2028 | ≈ 4% |
| A broad export-control shock (H20/H200-style licences pulled both ways, Hong Kong stockpile never released) | Already slope, not discontinuity; not counted |

**Why it matters more than its ~10% mass suggests: correlation.** In the discontinuity world the answers move together:
- **Q1:** toward A, because GPUs cannot be bought and markets are in shock.
- **Q2:** No.
- **Q3:** probably No. If Chinese labs vanish from Arena, slots 6-10 go to the next organizations in line. The US has only five organizations in today's top 11, so a third-country lab (Mistral) gets in.
- **Q5:** toward Yes. The only US yield peg, in 1942, was war finance, and the outside-view seat's own reference class says so.
- **Q7:** toward Yes, through a recession in US client spending.

The aggregator treats the questions as roughly independent apart from the Q1-Q2 link. This shared tail is a joint mode it does not see.

**Size of the hit.** This assumption alone moves:
- Q2 down ~1pp
- Q3 down ~3pp
- Q1 A up ~3pp
- Q5 up ~1-1.5pp

It is the strongest *shared* blind spot, but not the largest single error. That is the Q3 compute-gate argument below, which only fermi and signals made.

---

## 2. Q3 (centre of gravity): the modal ~80 is too high

**What the modal view rests on.**
- Fermi (79) and signals (80) both read today's board as closed: 10 of 10 organizations are US or Chinese.
- They argue it stays closed because third-country labs are 1/30-1/100 short on compute. Mistral Large 4 is 1.24e25 FLOP, about 1/75 of GPT-6 Astra.

**Hit 1: compute is not what gates slot 10; the board refutes it.** I re-read the BenchLeader mirror of Arena Text (style control, 8 Nov 2026; mirror has no CIs or vote counts) ([BenchLeader](https://www.benchleader.com/benchmarks/lmarena_text)):

| Organization | Best model | Model rank | Score |
|---|---|---|---|
| Google | | 1 | 1527 |
| Meta | | 3 | 1513 |
| Anthropic | | 4 | 1505 |
| Moonshot | | 19 | 1488 |
| OpenAI | | 22 | 1485 |
| Alibaba | | 23 | 1483 |
| Zhipu | | 26 | 1482 |
| **Xiaomi** | MiMo-V2.6-Pro | 29 | 1480 |
| DeepSeek | | 37 | 1475 |
| SpaceXAI | | 40 | 1475 |
| Baidu (11th organization) | | 51 | 1467 |

- **The 10th organization is not a frontier lab.** Its best model ranks around #40. The whole spread from #1 to #10 is **52 Elo**.
- A phone maker (Xiaomi) holds slot 8. Several Chinese holders of slots 6-10 work at roughly 1/10 of US compute.
- Slot 10 is won with post-training, distillation and preference tuning. Those are the skills a well-funded third-country lab can buy.
- Fermi's own Elo arithmetic (Mistral ~45-60 below the cutoff) puts Mistral about as far below #10 as #10 is below #1. That gap is a single good release, not a compute generation.

**Hit 2: the "bench depth" is asserted, not observed.**
- Fermi lists Xiaomi, Meituan, ByteDance, Tencent, MiniMax, StepFun, Microsoft MAI, Amazon, Thinking Machines, SSI and Reflection as filler between Mistral and the cutoff.
- On the mirror, Tencent, ByteDance, MiniMax, StepFun, Meituan, Microsoft, Amazon, NVIDIA, Mistral and Cohere all appear in the provider filter, and none of them is in the top 60 rows. SSI and Thinking Machines have no Arena entries.
- **The US side has only five organizations in the top 11.** Closure depends on Chinese labs holding five or six slots.
- So the duopoly sits on one side of a geopolitical fault line: the delisting and restriction channel in §1. No Wave-1 seat priced it.

**Hit 3: the derivative-model channel is missing from fermi's hazard list.**
- Arena labels a fine-tune with the organization that submits it.
- Kimi K3 is open-weight and sits 13 Elo above the cutoff. A non-US/China organization that post-trains an open Chinese or US frontier model, and submits it under its own name, could land above 1475 with negligible compute.
- Candidates:
  - G42/MBZUAI: the UAE's K2-Think is already built on Qwen, per secondary press relayed by signals.
  - Sakana
  - Upstage
  - Mistral itself
- Fine-tunes usually lose general chat preference, so I price this low but not at zero.

**Hit 4: Mistral is underweighted after its raise.**
- Mistral raised **€3B on 8 Sep 2026 at >€21B post-money**, a Samsung-led round with Nvidia participating ([Euronews](https://euronews.com/business/2026/09/08/mistral-ai-raises-record-3-billion-in-samsung-led-funding-round); [HPCwire](https://hpcwire.com/aiwire/2026/09/08/mistral-raises-e3b-to-expand-ai-research-and-infrastructure)).
- It projects >$1B ARR by end-2026 (company claim).
- It is the one non-US/China lab that has repeatedly sat in or near the top-10 organizations: 2024 (Mistral Large 2; Cohere Command R+ was the #6 model in April 2024).
- Over two years it gets one or two flagship cycles. Fermi's 7% for Mistral alone is light.

**Strongest No-world (priced).** In 2028 Mistral ships Large 5, trained on its Paris campus and preference-tuned hard, at ~1,490 on a compressed board. Meanwhile one Chinese lab has gone quiet (Beijing review, consolidation or a closed pivot), and the 10th slot falls to ~1,470.

| No path | Probability |
|---|---|
| Mistral directly | 10% |
| Other originals (Korea programme ~$3.5B, Japan, Gulf, UK, Canada, India) | 5% |
| Derivative fine-tune under a non-US/China label | 4% |
| Chinese bench thinning (delisting, Beijing restriction, merger, a lab going closed and dark) × P(next in line is non-US/China) ≈ 0.10 × 0.35 | 3.5% |
| Classification (Singapore re-domicile as with Manus, a Hong Kong HQ, a tie at 10th, org-label drift) | 3% |
| Taiwan or war discontinuity, net of overlap | 1.5% |
| **Sum** | **27%** |

These paths are positively correlated, because board compression raises them all, so P(No) ≈ 0.31 after the correlation adjustment. Then I add back the observed trend toward closure: Mistral, Cohere and 01.AI all fell out between 2024 and 2026. **P(Yes) ≈ 0.66.**

**Strongest Yes-world (priced, other tail).**
- The trend toward closure is real and accelerating: the board went from about 7 US/China organizations in the top 10 in 2024 to 10 in 2026.
- Mistral pivots to sovereign and enterprise deployment and stops chasing Arena.
- Chinese open-weight releases deepen the Chinese bench (MiniMax, ByteDance and Tencent all enter).
- In that world the outside-view's 30 is simply wrong, and the answer is ~90.

I give this world ~45% of the mass. The remaining mass sits where the paths above bite. **Q3 = 66.**

**Outside-view's 30 is also wrong.**
- Its reference class (aerospace, nuclear, foundry) has entry costs in the billions and decades. The Arena 10th slot has entry costs in the hundreds of millions and months.
- It also ignores the status quo, which is already closed.
- Its "internet platforms" analogue, which closed and stayed closed for a decade, is the right one. It deserved more than double weight.

---

## 3. Q2 (centre of gravity): both tails attacked; the number lands low

**Downside hit: fermi's coverage factor (0.65) uses a stale rate.**
- Signals' own count: of 417 Epoch models dated since 2025-08-01, **only 2 carry a cost value**, both small SK Telecom models.
- GPT-5 has gone uncosted for 15 months. GPT-6 Astra (9.4e26 FLOP) has no cost in any column.
- A model published in, say, Q3 2028 has ≤16 months to be costed before the 2029-12-31 snapshot.
- On the current regime, P(costed | exists) ≈ 0.40-0.45, not 0.65. The upward correction is that a first $10B run would be a landmark, and xAI-style disclosure helps: Grok 4 was costed within ~2 months.

**Downside hit: the physical arithmetic, redone on Epoch's own amortization.**
- Grok 4 implies ~$53k all-in per H100-class GPU, amortized over about 3.8 years: $10.72B upfront / $388M amortized at 246M H100-hours, a ~51-day run.
- Epoch's own outlook has frontier runs drawing **1-2 GW each by 2028** ([Epoch / CO/AI summary](https://getcoai.com/news/ai-model-training-could-consume-4-gigawatts-by-2030/); [Epoch cost trends](https://epoch.ai/blog/trends-in-the-dollar-training-cost-of-machine-learning-systems)).
- 1.5 GW ≈ 600-700k Rubin-class GPUs at ~$80k all-in ≈ $50-55B upfront, which amortizes to about $13-14B per run-year.
- A 4-6 month run is therefore **~$4.5-7B nominal**, ≈ $4-6B in 2023 USD.
- To clear $8.7B in 2023 USD, you need ≥2.5 GW for a single run, or a run of ~9+ months.
- P(true ≥ bar, published by 2028-12-31) ≈ 0.30.
- The 2026 slowdown signals already found supports this: the largest logged run grew 1.9x in 14 months.

**Upside hit: the resolver.**
- The question reads "Epoch's headline training-cost estimate, any method it reports as primary, nominal USD". Epoch's `Training compute cost (upfront)` column **already shows $10.72B for Grok 4**.
- If an auditor reads "upfront" as a primary method, or Epoch re-headlines its cost metric, Q2 is Yes today.
- Signals flagged this. Fermi priced it at ≤3%. I put it at ~4%, because the orchestrator has not locked the column.

**Strongest Yes-world.**
- SpaceXAI, flush after the SpaceX merger, runs Grok 6 on Colossus 2+3 (~2+ GW) for 6+ months in 2028.
- It discloses GPU counts, as it did for Grok 4, and Epoch costs it within a quarter.
- Probability ~8-10%, which is inside the 0.30 × 0.43 product below.

**Strongest No-world.**
- Runs shift to RL and post-training spread across many sub-runs, so no single "training run" reaches the bar.
- Epoch keeps leaving closed frontier models uncosted.

**Arithmetic.**
- 0.30 × 0.43 ≈ 0.13.
- Resolver path: + 0.04 × 0.87 ≈ 0.035.
- Taiwan: - ~0.5pp.
- **Q2 = 16.**
- Signals (15) was closest. Fermi (26) leaned on a stale coverage rate and on a GW-to-dollar conversion that is about 1.5x too generous.

---

## 4. Q1: the modal "boom through 2027 then glide" understates A

**Attacks on fermi and signals (A 12-18).**

1. **Accounting migration (drag nobody priced).** Q1 measures the *cash* PP&E line, and the build is moving off it.
   - Meta's Hyperion is financed through a $30B SPV with Blue Owl, kept off balance sheet. Its auditor flagged consolidation as a critical audit matter, and Moody's has criticised hyperscaler disclosures ([City AM](https://www.cityam.com/big-tech-buries-billions-in-ai-debt-as-bubble-fears-mount/); [IFR](https://prod.ifre.com/bonds/2390941/moodys-opinion-threatens-to-derail-off-balance-sheet-data-centre-deals)).
   - Neocloud capacity contracts and lease-backs follow the same direction.
   - The more the boom is financed off balance sheet, the lower R on this definition, *even if the "line" holds*. This bias exists only in the measured series, and it favours A/B.
2. **Inflated denominator.** CY2026 includes a memory and component price spike (signals: ~$25B of Microsoft's figure is attributed to component pricing). If DRAM/HBM prices normalize, R falls with no change in real build.
3. **Rates.** The Fed under Warsh *hiked* to 3.75-4.00% in September and the 10y sits at ~5%. That is the highest cost of capital at the start of any of the outside-view's capex booms since 2000, and Moody's is already questioning the SPV channel.
4. **The discontinuity from §1.** A Taiwan event in 2027-29 crushes GPU purchases: about +3pp to A.

**Attack on the outside-view's A 40.**
- Hyperscaler capex is not railroad track. A large share is 4-6-year equipment.
- A ~$2T+ gross AI/cloud stock built over 2024-27 creates a replacement floor of roughly $350-450B/yr by 2030, before any growth.
- A requires 2030 below ~$700B, so it needs a genuine bust with refresh deferred, not just a pause.

**Attack on fermi's D ceiling.** It converts dollars to GW at a fixed $55-60B/GW. Nominal capex can outrun GW if component prices rise, so the ceiling is soft. D is still small, because R ≥ 4 needs ~$2.8T.

**Strongest A-world (priced ~24%).**
- AI revenue misses in 2027-28, equity reprices and SPV credit tightens.
- Meta and Microsoft cut, and Amazon and Alphabet shift growth into leases.
- Cash PP&E in 2030 is ~$600-680B.

**Strongest C-world.** Agentic revenue compounds at 40%+, 2027 lands at ~$1T cash and 2030 at $1.5-1.8T.

**Q1: A 24 / B 42 / C 30 / D 4.**

---

## 5. Q4 (off-centre): both tails fatter than modal

- **Shared assumption:** supply tracks the crypto cycle, with GENIUS adding a moderate tailwind.
- **Downside not priced:**
  - GENIUS bars issuer-paid yield. With the policy rate at 3.75-4.00% and a 5% 10y, a non-yielding dollar token has the largest opportunity cost since stablecoins became material.
  - Tokenized money-market funds and bank tokenized deposits are the obvious substitutes. The outside-view's own money-market analogue fell 25% when MMDAs were legalised.
  - Telemetry: -3.2% year on year, -7% from peak (DefiLlama API via signals).
- **Upside not priced:** bank and big-tech issuance under licences after GENIUS; a USDT-to-USAT migration that grows the onshore pool rather than cannibalising it.
- **Q4: P10 215 / P50 355 / P90 650 ($B).**

## 6. Q5: priced 4-7 by all three; the war channel is missing

- The only US peg in the reference class was war finance (1942). The §1 discontinuity, ~5% by 2028 and ~9% by 2031, carries P(numerical cap | war) ≈ 0.25: ~+2pp.
- Peacetime path:
  - A 2029-30 recession at the zero lower bound with front-end YCC (a 1-2 year target, Australia-style, which counts here) chosen by a politically aligned FOMC: ~3-4%.
  - A sustained 5%+ 10y with a formal Treasury-Fed "accord" that states a level: ~2%. Commentary already frames a new accord taking shape (Robin Brooks, analyst, not official). Observable actions (hikes, QT, buybacks) run the other way.
- **Q5 = 8.**

## 7. Q6: anchoring on a superseded baseline

- **The hit:** the BLS release of 2026-11-05 (USDL 26-1631, via signals) says, verbatim: "The labor share ... was 53.0 percent in the third quarter of 2026, the lowest level in the series." The NIPA update revised 2026Q2 *up*, above 53.0.
- **How the seats anchored:**
  - Outside-view rescaled the index so that 2026Q2 = 52.8 and anchored Q3 at **52.45**: ~0.55pp too low.
  - Fermi started at 52.8: ~0.2-0.3pp too low.
- **BLS caveat, verbatim:** "the third estimate of nonfarm business sector quarterly labor productivity growth has differed from the first estimate by -1.1 to +1.4 percentage points about 80 percent of the time."
- **Downside world:** productivity at +3.6% SAAR against real compensation at +1.0% over four quarters keeps the share falling ~0.4-0.6pp/yr, and 2030 lands ~51.
- **Upside world:** the AI capex bust from §4 hits profits in 2029-30, and the share jumps +1-2pp as in 2001.
- **Q6: P10 50.2 / P50 52.4 / P90 54.6.** That is wider than modal on both sides and centred higher.

## 8. Q7: a mechanical tail nobody priced

- **The hit:** Q7 counts *company-reported* headcount. A demerger or carve-out (a BPO or engineering unit spun off, or a subcontractor model replacing payroll) cuts the reported number without any layoff. That is ~2pp of extra Yes mass across five firms over three years.
- **Telemetry still against Yes:**
  - Combined headcount is ~+0.5-1% above March 2026.
  - Reaching ≤ ~1.38M needs ≈ -10.5% from here in 10 quarters.
  - The big-5 combined has never fallen 10% in 3 years.
- **Strongest Yes-world:** the §4 A-world recession in US client spending, plus an outsourcing excise tax, plus agentic delivery flattening the pyramid in 2027-28.
- **Q7 = 11.**

---

## Biases found in Wave 1 (summary)

| Bias | Where |
|---|---|
| Narrative coherence mistaken for likelihood | Fermi Q3: "compute gap ⇒ no third country". The board's own composition (Xiaomi at slot 8; slot 10 at model rank ~40) contradicts the mechanism. |
| Scope insensitivity | "Top-10 *organizations*" was read as "the frontier". Slot 10 sits 52 Elo below #1 and about one release above Mistral. |
| Stale-rate anchoring | Fermi's Q2 coverage of 0.65 vs a current ~0/N; Q6 anchored at 52.45/52.8 vs the revised 53.0. |
| Conjunction neglect, inverted | Fermi's Q3 hazards are summed as independent catch-up events. The fragility is structural (one side of the duopoly can drop out), not additive catch-up. |
| Drag/pull asymmetry | Q1: off-balance-sheet migration and component-price normalization are both drags on the measured series, and neither was priced. |
| Anchoring on the essay | No seat over-adopted the essay's +70%/yr. The outside-view under-adopted the hyperscaler replacement floor by importing railroad track. |

## Sources

- Arena Text mirror, 8 Nov 2026: https://www.benchleader.com/benchmarks/lmarena_text (no CIs or vote counts; primary arena.ai 403s)
- Arena model-removal policy: https://help.arena.ai/articles/4662132537-models-added-and-removed-from-direct-and-side-by-side-mode
- Arena removal-pattern critique ("Leaderboard Illusion"): https://the-decoder.com/popular-ai-benchmark-lmarena-allegedly-systematically-favors-large-providers-study-claims/ (operators dispute it)
- Mistral €3B Series D: https://euronews.com/business/2026/09/08/mistral-ai-raises-record-3-billion-in-samsung-led-funding-round ; https://hpcwire.com/aiwire/2026/09/08/mistral-raises-e3b-to-expand-ai-research-and-infrastructure
- CSIS expert survey: https://www.csis.org/analysis/surveying-the-experts-us-and-taiwan-views-chinas-approach-taiwan
- Metaculus via secondary source (early 2024, stale): https://tellingthefuture.substack.com/p/the-next-taiwan-strait-crisis
- PLA blockade drills: https://news.usni.org/2025/12/29/china-launches-blockade-drills-around-taiwan-in-protest-of-u-s-arms-sales ; https://maritime-executive.com/article/china-launches-massive-naval-drill-simulating-blockade-of-taiwan ; https://www.taipeitimes.com/News/taiwan/archives/2026/06/26/2003859776
- Epoch cost methodology and trends: https://epoch.ai/blog/trends-in-the-dollar-training-cost-of-machine-learning-systems ; https://epoch.ai/data-insights/grok-4-training-resources ; secondary summary of the 1-2 GW per run by 2028 outlook: https://getcoai.com/news/ai-model-training-could-consume-4-gigawatts-by-2030/
- Off-balance-sheet AI financing: https://www.cityam.com/big-tech-buries-billions-in-ai-debt-as-bubble-fears-mount/ ; https://prod.ifre.com/bonds/2390941/moodys-opinion-threatens-to-derail-off-balance-sheet-data-centre-deals ; https://www.clearygottlieb.com/news-and-insights/publication-listing/financing-the-data-center-boom
- Wave-1 telemetry I rely on is cited in `seats/E2-wave1-packet.md`: Epoch CSVs, the DefiLlama API, BLS USDL 26-1631, and company headcounts.
