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

```json
{"q1": {"A": 18, "B": 44, "C": 36, "D": 2},
 "q2": 26, "q3": 79,
 "q4": {"p10": 265, "p50": 410, "p90": 680},
 "q5": 4,
 "q6": {"p10": 50.3, "p50": 52.2, "p90": 54.2},
 "q7": 20}
```
