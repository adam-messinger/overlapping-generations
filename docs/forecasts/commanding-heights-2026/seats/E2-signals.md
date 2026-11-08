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

```json
{"q1": {"A": 12, "B": 46, "C": 34, "D": 8},
 "q2": 15, "q3": 80,
 "q4": {"p10": 220, "p50": 340, "p90": 560},
 "q5": 7,
 "q6": {"p10": 49.8, "p50": 51.7, "p90": 53.7},
 "q7": 12}
```
