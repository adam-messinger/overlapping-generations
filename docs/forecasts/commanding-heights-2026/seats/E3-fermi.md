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

```json
{"q1": {"A": 22, "B": 46, "C": 28, "D": 4},
 "q2": 17, "q3": 86,
 "q4": {"p10": 225, "p50": 390, "p90": 680},
 "q5": 7,
 "q6": {"p10": 49.6, "p50": 52.0, "p90": 54.6},
 "q7": 15}
```
