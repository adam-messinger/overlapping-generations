# E4 labor-distribution / fermi (A2, Wave 1)

**BLUF.** When I break each question into parts and multiply them out, I get a slow drift rather than the essay's line. The US labor share keeps falling at about its 2022-26 pace, to a 2030 median of **~51.5%** (P10 49.8 / P90 53.4). The parts do not produce a 10% three-year cut at the Indian IT big-5 (**15%**). The arithmetic puts Big-4 capex in a **plateau (B, ~57%)** and leaves almost no room for R >= 4. The model contributes direction only: its AI channel moves labor share by 0.1-1.9 pp by 2030 and adds 3.5-14 pp more by 2036. Even if the essay's mechanism is real, most of its effect lands after 2030.

Lens: arithmetic and physical decomposition only. Every number below is a component I chose, then multiplied out. The Monte Carlo scripts are in the session scratchpad, not the repo. Their parameters are written out in each section so you can rebuild them.

---

## The adapter I used (published as required)

- Spec: `docs/forecasts/commanding-heights-2026/adapter-spec.json` (scenarios `baseline`, `ai-energy-boom`, `debt-populism`; levers `lever:dc-fast`, `lever:dc-fast-ai-payoff`, `lever:repression-2pp`).
- Command, re-run at the origin: `npx tsx scripts/tetlock-sim-adapter.ts --spec=docs/forecasts/commanding-heights-2026/adapter-spec.json`. It exited 0 and **reproduced `adapter-output.md` exactly**: every reading was identical. The model vintage is commit 46df211.
- Statuses I follow: **q2, q3, q4, q7 REFUSED.** I take no model number for them. **q1, q5, q6 DIRECTIONAL.** For those I use the sign and rough size only, never a level and never a point estimate.
- Disclosures that bind what I quote:
  - The model's datacenter-capex level is understated about 2.5-3x. It is a world chips-plus-facilities composite with no hyperscaler, no lab and no stock market.
  - Model labor share is world compensation / GDP, about 0.65 in 2025, and is **not comparable to BLS 52.8%**. It moves only through robot and AI worker-equivalents.
  - The model has no Fed, no yields and no stablecoins. Fiscal dominance triggers only above 150% world public debt/GDP.

| Adapter reading (directional) | baseline | ai-energy-boom | debt-populism | dc-fast | dc-fast-ai-payoff | repression-2pp |
|---|---|---|---|---|---|---|
| DC capex CAGR 2026-30 (%/yr) | 12.8 | 20.2 | 12.3 | 39.2 | 39.4 | 13.7 |
| implied 4-yr ratio (my arithmetic, (1+g)^4) | 1.62 | 2.09 | 1.59 | 3.76 | 3.78 | 1.67 |
| world labor share change 2026-30 (pp) | -0.11 | -0.75 | -0.11 | -0.11 | -1.92 | -0.11 |
| world labor share change 2026-36 (pp) | -0.35 | -3.50 | -0.34 | -0.35 | -13.97 | -0.36 |
| world public debt/GDP 2030 | 0.89 | 0.89 | 1.07 | 0.89 | 0.88 | 0.80 |
| repression gap 2030 (pp) | 0 | 0 | 0 | 0 | 0 | 2.0 (imposed) |
| real safe rate change 2026-30 (pp) | +0.17 | +0.19 | +0.80 | +0.17 | +0.21 | -0.09 |

---

## Correction to the preamble baseline (Q6 resolver vintage)

The preamble's 52.8% (2026Q2) predates the 2026 annual NIPA update. The BLS *Productivity and Costs, Third Quarter 2026, Preliminary* release (USDL 26-1631, 5 Nov 2026, [PDF](https://www.dol.gov/newsroom/economicdata/prod2_11052026.pdf)) says:

> "The labor share, which is the percentage of output that accrues to workers in the form of compensation, was 53.0 percent in the third quarter of 2026, the lowest level in the series, which begins in the first quarter of 1947."

The release also says "measures incorporating compensation were revised back to 2021 for all sectors." Q2 hourly compensation was revised up 1.4 pp.

I rebuilt the percent series by scaling FRED's index `PRS85006173` (2017=100, [FRED](https://fred.stlouisfed.org/series/PRS85006173)) to 53.0 at 2026Q3. The results:

- Quarterly, 2025Q3 to 2026Q3: 53.9, 54.1, 54.0, **53.4** (2026Q2 under the new vintage, versus 52.8 in the old one), 53.0.
- Annual averages: 2019 56.6, 2022 55.4, 2023 54.6, 2024 54.5, 2025 54.3. 2026 is about 53.3 if Q4 is about 52.9.

The level is my derivation from the index; BLS does not print the 2026Q2 revised percent in the release text. The September revision alone moved the level about +0.6 pp, which is why I carry a revision term below.

---

## Q6: BLS nonfarm business labor share, CY2030 average (centre of gravity)

**Decomposition.** LS(2030 avg) = LS(2026Q3) + structural drift x horizon + AI labor-to-capital excess + cyclical term + revision noise. The horizon runs from mid-2026Q3 to the centre of 2030, about **3.9 years**.

| Component | Central | Spread | Basis |
|---|---|---|---|
| Start, 2026Q3 | 53.0 | n/a | BLS, 5 Nov 2026 |
| Structural non-AI drift | -0.30 pp/yr (x3.9 = **-1.2 pp**) | sd 0.18 pp/yr | Blends -0.14 pp/yr (1980->2020 annual averages, 63.4 -> 57.8, my rebuild) with about -0.5 pp/yr (2019->2026Q3, 56.6 -> 53.0). Composition, markups and intangibles continue. |
| AI excess | **-0.55 pp** (median), left-skewed, lognormal sd 0.8 | Tail to about -2.5 pp | See composition and displacement arithmetic below. Magnitude checked against the adapter's direction. |
| Cyclical term | P(recession weighting the 2030 average) ~ 0.38: **+1.4 pp** if yes, -0.15 if no | Expected about +0.4 pp | The labor share is countercyclical: 2020Q2 spike to 58.9 (BLS TED). Compensation is sticky while profits fall. |
| Revision to first print | 0 | sd 0.45 pp | The 2026 annual update moved 2026Q2 by about +0.6 pp. |

**AI-excess arithmetic.** I split it into composition and displacement.

1. **Composition.** AI capex is about $0.7T a year, about 2.3% of GDP. AI and cloud value added carries a labor share of about 0.25, against 0.53 for the sector. If AI-heavy activity adds about 1.5-2 pp to nonfarm business output by 2030, the shift lowers the share by 2 x (0.53 - 0.25) ≈ **-0.4 to -0.55 pp**.
2. **Displacement net of reinstatement.** Suppose about 2% of compensation-weighted tasks are automated by 2030, worth about 1.1% of output. Compute providers capture about 30% of the savings at a labor share of about 0.25. About half of the displaced pay reappears through reinstatement. Net: 1.1 x (1 - 0.3 x 0.25) x 0.5 ≈ **-0.5 pp**.
3. **Overlap.** The 2023-26 drift already contains some of this. Hence a combined median of about -0.55 pp on top of the trend, with a fat left tail.

**Correlation assumed.** One AI-strength factor z drives three things at once: a deeper AI excess, a lower recession probability (P = 0.38 - 0.10z) and boom-time margins. A strong-AI world is a no-recession, low-share world. An AI-bust world is a recession, high-share world. Because the two move together, **both tails get wider**.

**Multiplication** (200k draws, seed 7): P10 **49.8**, P50 **51.5**, P90 **53.4**, mean 51.5. The central value is 53.0 - 1.2 - 0.55 + 0.4 ≈ 51.6. Cross-checks:

- The implied 2026->2030 annual-average change is about -1.8 pp, or -0.45 pp/yr. That matches 2023->2026 (-0.43 pp/yr) and sits below the 1980-2019 rate.
- For scale, the essay's claim is the 1980-2020 decline (about 5.6-6.9 pp on my rebuild) in a decade. Pro rata to 2030 that is about -2.5 pp more than my drift. It lands at about **49.5, i.e. at my P10**.

**Model, directional only.**

- The model's sign agrees: every run falls.
- The **size by 2030 is small unless AI cognitive payoff is switched on**: -0.1 pp (baseline), -0.75 (ai-energy-boom), -1.9 (dc-fast-ai-payoff).
- The effect is **back-loaded**. In the payoff run, 2030 carries only about 14% of the 2036 shift (-1.9 of -14.0 pp). Even if the essay's mechanism is real, the model's diffusion arithmetic puts most of the transfer after the Q6 resolution year.
- I do not quote any model level.

**Model vs the baseline it contradicts.** The model's default path moves world labor share -0.11 pp over 2026-30. BLS's US measure fell about -0.9 pp over the last four quarters and -3.1 pp since 2022Q1. The model misses this drift because its labor share responds *only* to automation income. It has none of the following:

- markups or profit-margin cycles,
- sectoral composition (tech's low labor share),
- offshoring or a China shock,
- self-employment imputation.

That is also a different object (world, monetary-circuit closure). So I take the observed drift as the trend component, and the model only to sign and size the AI increment. I do not adopt its number.

## Q7: Indian IT big-5 headcount at 31 Mar 2029 >= 10% below 31 Mar 2026 (centre of gravity)

**Base, 31 Mar 2026** (company releases via press; sources disagree by a few thousand on HCLTech and Infosys):

| Company | 31 Mar 2026 | Source |
|---|---|---|
| TCS | 584,519 | [NiftyTrader / IANS](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000) |
| Infosys | 328,594 | [Business Today](https://www.businesstoday.in/technology/story/infosys-headcount-falls-by-over-8400-in-q4-workforce-at-328594-527161-2026-04-23) |
| HCLTech | 223,889 | press; one source says a net +802 in Q4 and another says "cutting 3,292", unresolved |
| Wipro | 242,156 | [Business Today](https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16) |
| Tech Mahindra | 147,623 | [Angel One](https://oga-prod.angelone.in/news/stocks/tech-mahindra-share-price-in-focus-headcount-falls-by-1-993-in-q4fy26-attrition-rate-eases) |

- **Sum at 31 Mar 2026 ≈ 1,526,800 (±~5k).** Threshold for Yes: 0.9 x that ≈ **1,374,100**.
- **Latest, 30 Sep 2026:** TCS 598,056 + Infosys 332,542 + HCLTech 230,339 + Wipro 236,328 ([People Matters](https://www.peoplematters.in/news/business/wipro-workforce-declines-28percent-sequentially-to-236328-in-q2-fy27-52773)) + Tech Mahindra 152,206 ([NewsBytes](https://www.newsbytesapp.com/news/business/tech-mahindra-hires-5446-in-q2-headcount-hits-152206/tldr)) = **≈1,549,500**. That is +1.5% above the base. From here a Yes needs **-11.3% in 10 quarters**, about **-4.7%/yr**.

**Decomposition.** Headcount = revenue / revenue-per-employee (RPE). Over three fiscal years:

ln(H29/H26) = Σ (g_rev − g_RPE). A Yes needs Σ ≤ ln 0.9 = −0.105, i.e. **g_rev − g_RPE ≤ −3.5%/yr for three straight years**.

| Component | Central | Spread | Basis |
|---|---|---|---|
| USD revenue growth | +3.5%/yr | AI pass-through: -1.2 pp per AI-sd. Macro factor: ±2.5 pp. Idiosyncratic sd 2 pp/yr. | Sector growth in low single digits in FY25-26 |
| RPE growth | +3.5%/yr | +1.2 pp per AI-sd; idiosyncratic sd 1.2 pp | FY26: revenue about +3% against headcount -0.5% ([IANS](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000)) |
| Acquired staff | 25% chance of +0.5-3% | n/a | The resolver counts reported headcount, including acquisitions |

**Correlation.** The same AI factor raises RPE and deflates revenue, because clients take the productivity. That is ρ(g_rev, g_RPE) < 0, which **widens** the left tail. This is the essay's mechanism, priced explicitly.

**Physical check against the record.**

- The worst year in the record is FY24: about -67.5k, **-4.2%** (1,593k -> 1,526k, Mar 2023 -> Mar 2024, from the company totals).
- The worst three-year window, Mar 2023 -> Mar 2026, is also only **-4.2%**.
- A Yes needs FY24 repeated three times in a row, starting from a base that is currently *growing*: Wipro -6,716 in Jul-Sep 2026, but TCS +13.5k and TechM +5.4k.

**Multiplication** (200k draws, seed 7): P(ratio ≤ 0.90) = **16.5%**. The ratio's P10/P50/P90 is 0.87 / 1.00 / 1.16. I shade to **15** because the September print starts the path 1.5% above the base. The adapter **refuses** Q7, so no model input.

## Q1: Big-4 cash PP&E capex, R = CY2030 / CY2026

**Decomposition.** R = (capex intensity 2030 / intensity 2026) x (revenue 2030 / revenue 2026).

| Component | Central | Spread | Basis |
|---|---|---|---|
| Big-4 revenue CY2026 | ≈ $1.85T | n/a | CY2025 ≈ $1.6T: MSFT about $300B, GOOGL about $400B, AMZN about $715B, META about $200B |
| Cash PP&E purchases CY2026 | ≈ $650B | n/a | Below the $720-745B headline: Microsoft's guidance includes finance leases, which Q1 excludes |
| Intensity 2026 | ≈ 0.35 | n/a | $650B / $1.85T |
| Revenue CAGR 2026-30 | 12% | sd 3.5 pp on the AI factor + 2 pp idiosyncratic | n/a |
| Intensity 2030 | 0.30 (partial normalization) | Lognormal sd 0.30; ρ with the AI factor 0.6 | The pre-2023 norm was about 0.12-0.15. Telecom's 2000 peak was about 0.3-0.5. |

**Physical and financial walls for regime D** (R ≥ 4, about $2.6T in 2030):

- **Cash.** $2.6T against 2030 operating cash flow of about $1.1-1.3T leaves **≈$1.4T a year of external finance**.
- **Depreciation.** About $1.5-2T a year of D&A by 2032 needs about **$3-4T of AI revenue**, against world IT spend of about $5.5T.
- **Power.** At about $45B per GW all-in, $2.6T is **≈55-60 GW a year** of Big-4 capacity, close to total annual US generation additions.

D needs all three walls to give way at once.

**Multiplication** (200k draws, seed 11): A 22.5 / B 61.7 / C 15.5 / D 0.3. R's P10/P50/P90 is 0.81 / 1.35 / 2.23. I widen the upper tail a little because AI revenue could accelerate beyond my factor. That gives **A 22 / B 57 / C 19 / D 2**.

**Model (directional).** The model's DC-capex growth implies R of about 1.6 (baseline) to 2.1 (ai-energy-boom). Its closest proxy to the essay's line (dc-fast) gives about 3.8. **No run reaches 4**, and the model has no financing or stock-market bust, so it is silent on regime A.

**Where it contradicts the baselines.** Observed Big-4 capex roughly doubled in one year (2025->2026). The model's world composite grows about 13%/yr, from a level understated 2.5-3x. I adopt neither number. I use the model only to note that even the essay-proxy lever stays below R = 4.

## Q2: Epoch-estimated training cost >= $10B for a model published by 2028-12-31

**Decomposition.** C(max, Sep 2028) = C0 x g^t, then x P(Epoch has a primary cost estimate).

- **C0.** The most expensive Epoch-costed frontier model as of mid-2026 is "hundreds of millions". The [Dror Poleg tracker](https://www.drorpoleg.com/charts/frontier-cost/), built on Epoch data, says the cost is up "roughly tenfold since GPT-4 in 2023" and carries this caveat: "Estimates amortize hardware and energy over the run and carry substantial uncertainty." I take ln C0 ~ N(ln $0.55B, 0.35).
- **g.** Epoch measured **2.4x/yr (95% CI: 2.0x to 3.1x)** in amortized hardware plus energy ([Epoch](https://epoch.ai/blog/how-much-does-it-cost-to-train-frontier-ai-models)). The essay and preamble cite 3.5x. I take ln g ~ N(ln 2.6, 0.2).
- **t.** About 2.2 years. A model published by end-2028 has a training run ending around Q3 2028.

**Multiplication.**

- ln C = ln 0.55 + 2.2 ln 2.6 = 1.50, i.e. **$4.5B median**. sd = √(0.35² + 0.44²) = 0.56.
- Hitting $10B needs z = (2.30 - 1.50) / 0.56 = 1.42, so **P ≈ 7.8%**.
- Equivalently, it needs about **3.9x/yr** from $0.55B, which is above Epoch's 95% CI.
- Physical check: a $10B amortized run means a cluster worth roughly $60-100B running for 6+ months, i.e. a 2-3 GW site in operation in 2028.

**Adjustments.**

- × about 0.75 for Epoch having a primary cost estimate at the 2029-12-31 snapshot ("unknown" does not count).
- Plus about 3 pp for lumpiness: the frontier is the maximum across labs and can jump.

Net ≈ **9**. The adapter **refuses** Q2.

## Q3: LMArena top-10 distinct organizations all US/China on 2028-12-31

**Decomposition.** P(Yes) = Π over non-US/China contenders of P(not in the top 10 organizations).

- **Crowding.** There are about 8 US organizations (Google, OpenAI, Anthropic, xAI, Meta, Microsoft, Amazon, Nvidia, plus Thinking Machines and SSI by ultimate parent). There are about 11 Chinese ones (DeepSeek, Alibaba, Moonshot, Zhipu, ByteDance, Tencent, MiniMax, StepFun, Baidu, Xiaomi, Meituan). The 10th organization is therefore around overall rank 20-30.
- **Mistral today.** Mistral Large 3 was rank 91 in May 2026 ([DataLearner](https://www.datalearner.com/en/leaderboards/external/text-generation)). An October 2026 top-17 listing has no non-US/China organization ([developersdigest](https://www.developersdigest.tech/models/best-for/chat)). I could not read arena.ai directly (HTTP 403), so the current organization list is from secondary snapshots.

**Contender probabilities.**

| Contender | P(not in top 10) |
|---|---|
| Mistral, France | 0.88: needs a jump of about 60 ranks; €-scale compute |
| Cohere, Canada | 0.96 |
| A Gulf lab (G42, TII, MBZUAI) | 0.96 |
| A Japanese, Korean or Indian sovereign or industrial lab | 0.95 |
| Other, including a label or parent-reassignment surprise | 0.97 |

**Multiplication.** 0.88 x 0.96 x 0.96 x 0.95 x 0.97 = **0.75**, so **75**. The adapter **refuses** Q3.

## Q4: DefiLlama total stablecoin supply, 2028-12-31 ($B)

**Base.** I computed it from DefiLlama's API (`stablecoins.llama.fi/stablecoincharts/all`, summing all pegs):

- **$294B on 2026-11-08**, down from $305B on 2026-01-01.
- 2026 peak: $317B (17 May) on this sum. Press reported $322B from the dashboard ([Crypto Briefing](https://cryptobriefing.com/stablecoin-market-record-322-billion/)). That method gap is about 1.5%.
- **2026 has been flat-to-down**, even with GENIUS.

**Decomposition** of the end-2028 stock:

| Stream | 2026 stock | Central multiplier | End-2028 central |
|---|---|---|---|
| Crypto collateral and DeFi | ~$195B | Tracks crypto market cap with elasticity 0.7; crypto +30% central (post-April-2028-halving year) | **≈$235B** |
| Payments and EM dollar savings | ~$75B | ~25%/yr compounding, x1.6 | **≈$120B** |
| New regulated issuers after GENIUS takes effect (banks, fintechs, tokenized MMFs DefiLlama counts) | n/a | +$15-150B | **≈$45B** |

**Multiplication.**

- Central ≈ 235 + 120 + 45 = **$400B**.
- Bear: crypto -50%, which also happened in 2022-23, when supply fell 24% peak to trough. That gives 127 + 90 + 15 ≈ **$235B**.
- Bull: crypto x2.5, giving 400 + 165 + 150 ≈ **$715B**.

**P10 / P50 / P90 = 235 / 390 / 680.** The adapter **refuses** Q4: no money block.

## Q5: Fed announces a numerical yield ceiling or target (≥1-yr maturity) before 2031

**Decomposition.** P = Σ over trigger paths of P(path) x P(explicit yield number | path).

| Path | P(path) | P(YCC given path) | Product | Basis |
|---|---|---|---|---|
| (a) Zero-lower-bound recession by 2030 | 0.25 | 0.10 | 2.5% | The Fed studied and rejected YCC in 2020 |
| (b) Bond-market or fiscal stress | 0.30 | 0.12 | 3.6% | The 10y is at 5.17% (Sep 2026). A politically aligned post-Powell Fed chair raises the odds, but "a new Accord" talk has so far meant balance-sheet coordination, not yield caps |
| (c) Front-end target used as forward guidance | n/a | n/a | 1.5% | e.g. a 1-2 yr cap as in Australia 2020-21 |

Sum ≈ **7.6%, call it 7**.

**Model (directional).**

- World public debt/GDP in 2030 is 0.89 (baseline) to 1.07 (debt-populism). That is **far below the model's 150% fiscal-dominance trigger**, so the endogenous repression gap is 0 in every non-imposed run.
- The real safe rate drifts +0.2 to +0.8 pp. That is upward pressure, but not a regime break.
- Direction: no structural forcing toward a peg by 2030. The model has no Fed and no US-specific debt, so this caps nothing; it only means the model supplies no push toward Yes.

---

## Correlations across my answers (coherence checks)

1. **AI-strength factor.**
   - High: Q1 at C or D, Q6 low, Q7 more likely Yes, Q2 more likely Yes.
   - Bust: Q1 at A, a recession lifts Q6, and Q7 is ambiguous: revenue falls but RPE gains slow.
   - My joint numbers respect this: Q6 P10 (49.8) sits in the world where Q1 is C or D (21%) and Q7 is Yes (15%).
2. **Q5 and Q6 share the recession path (a).** A recession raises the 2030 labor share and is the likeliest YCC route. That path adds only about 2.5 pp to Q5.
3. **Q4 is largely orthogonal** to the labor block. It depends on the crypto cycle.

## Sources

- BLS, Productivity and Costs, Q3 2026 preliminary, 5 Nov 2026: https://www.dol.gov/newsroom/economicdata/prod2_11052026.pdf
- BLS TED, "Labor share at its lowest level, 52.8 percent in second quarter 2026" (pre-revision vintage; also the 58.9% 2020Q2 spike and the 66.2% 1960Q4 high): https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm
- FRED PRS85006173 / PRS85006172 (index and annualized % change), downloaded 2026-11-08: https://fred.stlouisfed.org/series/PRS85006173
- Indian IT headcounts: IANS ([link](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000)), Business Today ([Infosys](https://www.businesstoday.in/technology/story/infosys-headcount-falls-by-over-8400-in-q4-workforce-at-328594-527161-2026-04-23), [Wipro](https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16)), People Matters ([Wipro Q2 FY27](https://www.peoplematters.in/news/business/wipro-workforce-declines-28percent-sequentially-to-236328-in-q2-fy27-52773)), NewsBytes ([TechM Q2 FY27](https://www.newsbytesapp.com/news/business/tech-mahindra-hires-5446-in-q2-headcount-hits-152206/tldr)), Angel One ([TechM Q4 FY26](https://oga-prod.angelone.in/news/stocks/tech-mahindra-share-price-in-focus-headcount-falls-by-1-993-in-q4fy26-attrition-rate-eases)). These are press reports of company releases, not checked against the companies' datasheets.
- Epoch AI, training-cost trend, 2.4x/yr (95% CI 2.0-3.1x): https://epoch.ai/blog/how-much-does-it-cost-to-train-frontier-ai-models
- DefiLlama stablecoins API: https://stablecoins.llama.fi/stablecoincharts/all ; dashboard https://defillama.com/stablecoins
- LMArena secondary snapshots: https://www.datalearner.com/en/leaderboards/external/text-generation , https://www.developersdigest.tech/models/best-for/chat

## Final payload

```json
{"q1": {"A": 22, "B": 57, "C": 19, "D": 2},
 "q2": 9, "q3": 75,
 "q4": {"p10": 235, "p50": 390, "p90": 680},
 "q5": 7,
 "q6": {"p10": 49.8, "p50": 51.5, "p90": 53.4},
 "q7": 15}
```
