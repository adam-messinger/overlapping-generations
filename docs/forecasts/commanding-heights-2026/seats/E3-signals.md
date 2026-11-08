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

```json
{"q1": {"A": 20, "B": 38, "C": 34, "D": 8},
 "q2": 16, "q3": 83,
 "q4": {"p10": 235, "p50": 370, "p90": 720},
 "q5": 6,
 "q6": {"p10": 49.3, "p50": 51.6, "p90": 54.0},
 "q7": 11}
```
