# E1 ai-capital-cycle / signals (A3, Wave 1)

**BLUF.** The freshest telemetry (October 2026 earnings, Nvidia, GPU rental prices) shows the capex
line still accelerating into 2027, but it has crossed the classic late-cycle threshold: three of the
Big-4 posted negative free cash flow in Q3 2026, Meta is selling up to ~$95B of stock, and hyperscaler
CDS and SPV project-bond yields have repriced wider. I read that as momentum strong enough to put
R >= 2 roughly as likely as a plateau, with a thin tail for the essay's line; the other six
questions are read through what the cycle does to costs, wages and policy. Three resolver problems
are flagged in the audit (Q2 deflator, Q3 domain/rename, Q6 vintage of an annual average).

Lens discipline: every number below is an observed indicator with its source's own caveat; where
the source is secondary press I say so. I did not read other seats' files.

---

## Q1: Big-4 capex, CY2030 / CY2026 (centre of gravity)

### Signals

1. **Q3 2026 cash-flow capex lines (target definition), ~$202B in one quarter.** Per a compilation of
   the Q3 releases ([Stock Metric Lab](https://stockmetriclab.com/ai-capex-comparison-2026/)):
   Alphabet purchases of P&E $51.355B; Microsoft cash P&E additions $39.367B (FY27 Q1); Amazon
   gross purchases of P&E $77.259B ($75.878B net of $1.381B proceeds and incentives); Meta
   $34.906B, which is "P&E of $33.942bn plus $0.964bn finance-lease principal". Sum of the four
   cash P&E lines (Meta at $33.942B): **$201.9B**, matching
   [24/7 Wall St's $201.9B record](https://247wallst.com/cards/amzn-xpost-01m6brbqw7crxv3sfsg6jnhzy6).
   Source caveat verbatim: "Amazon's net figure is SML-calculated. Meta includes finance-lease
   principal. Microsoft's figure excludes non-cash finance-lease additions." The compiler also
   says its sources are "mostly secondary analysis rather than the companies' filings".
   Implication for the denominator: on the locked cash lines CY2026 is likely ~$700-750B, a little
   below the ~$720-745B headline guidance, because Microsoft's ~$170B CY2026 figure includes finance
   leases ([fourweekmba](https://fourweekmba.com/ai-microsoft-lowers-2026-capex-view-to-170b-eyes-new-funding/);
   the Microsoft call quotes come from "a machine transcript of the webcast", unconfirmed).
2. **2027 direction: up, no numbers.** Alphabet CFO: "We continue to expect our capex to increase
   significantly in 2027, and will provide further details on our Q4 call"; CNBC reports 2027
   "projected to exceed $300 billion" (a projection, not guidance)
   ([CNBC, Oct 28](https://www.cnbc.com/2026/10/28/alphabet-googl-earnings-q3-2026.html)). Amazon expects
   to "spend meaningfully more in 2027"; Meta declined to guide ("still developing our budget and
   capacity plans for next year"); Microsoft trimmed CY2026 from ~$175B to ~$170B
   ([trade summary](https://www.datacentres.com/guides/hyperscaler-capex-trends)). Pre-earnings sell-side
   2027 consensus ~$934.5B (+28%), dated Oct 4, i.e. before the reports
   ([yieldtheory](https://www.yieldtheory.app/research/hyperscaler-capex-2027-forecast)); secondary, not checked.
3. **Supplier telemetry: still accelerating.** Nvidia FY27 Q2 (to Jul 26 2026): revenue $96.2B
   (+106% y/y), data-center $89B (+117%), hyperscale within DC $48.71B (+102%); Q3 guide $108.0B
   "plus or minus 2%", and the outlook "excludes Data Center compute revenue from China"; first
   year-ahead forecast of ~70% revenue growth, "although the company continues to face supply
   constraints" ([Unite.AI](https://www.unite.ai/nvidia-posts-96-2b-quarter-as-data-center-revenue-hits-89b/),
   [Verdict](https://www.verdict.co.uk/nvidia-q2-fy27-results/)). AWS-Nvidia: two million more GPUs
   in 2027-2028. Nvidia FY27 Q3 reports later in November.
4. **Utilisation / pricing telemetry: no glut yet.** Median on-demand H100 SXM ~$4.20/GPU-hr on Oct 7
   2026 (range $3.20-$12.29); one index has rental prices "up 12% over the last 12 months, with 16 of
   21 models rising and 5 falling"; Nebius raised H100 $3.85 -> $4.50 on Oct 1 2026
   ([Uvik index](https://uvik.net/blog/gpu-price-index/), [getdeploying](https://getdeploying.com/gpu-price-index)).
   Caveat from the compiling search: "these are mostly vendor or aggregator pages, and their samples
   differ". I found **no** reporting of data-center lease cancellations in 2026 (absence of evidence,
   not a measured zero). Telecom 2001 analogue: dark-fibre prices collapsed BEFORE capex rolled over;
   that leading indicator is currently pointing the other way.
5. **Cash-flow crossover has happened.** Epoch's SEC-XBRL fit (MSFT, AMZN, GOOGL, META, ORCL): CFO
   grows ~23%/yr, cash capex ~70%/yr, "these trends cross around the third quarter of 2026"; CY2026 Q1
   actuals CFO $157.9B vs capex $148.4B. Caveats verbatim: "The crossover is sensitive to the fit
   window"; "The trend extensions are simple extrapolations of the existing trends, not
   all-things-considered forecasts"; "we do not directly model how the surge in AI-related capex will
   affect hyperscalers' future operating cash flow"
   ([Epoch](https://epoch.ai/data-insights/hyperscaler-capex-vs-cash-flow)). Q3 actuals: Alphabet FCF
   -$9.07B "far worse than the $2.70 billion analysts had expected" (CNBC above); Meta capex ~$34.9B vs
   ~$32.8B CFO; Amazon TTM FCF ~-$42.4B on its own definition
   ([CNBC Oct 27](https://www.cnbc.com/2026/10/27/ai-debt-hyperscaler-earnings.html),
   [letsdatascience](https://letsdatascience.com/blog/hyperscaler-ai-capex-outruns-cash-flow-q3-2026-oracle)).
   Microsoft is the exception.
6. **Financing has moved outside the firm.** Meta: up to ~$95B equity, "the first issuance of new stock
   since 2013"; only ~$35B launched immediately, with a proposed $60B ATM from 2027Q1; "Meta says ... it
   expects no initial proceeds from that sale; proceeds would come at future settlement"
   ([Semafor](https://www.semafor.com/article/10/26/2026/meta-announces-95b-offering-to-fund-ai),
   [InvestmentNews](https://www.investmentnews.com/equities/meta-plots-95b-stock-offering-as-ai-spending-drains-cash-flow/268740));
   details differ across sources. Goldman: hyperscalers issued ~$296B of bonds YTD vs a $250B full-year
   baseline, covering ~36% of five hyperscalers' 2026 capex
   ([404k Research summary of GS](https://404kresearch.substack.com/p/the-ai-buildout-enters-the-debt-era); secondary).
   CDS: Meta +177% YTD, Amazon +129%; S&P sees negative free operating cash flow in 2026 and 2027;
   strategist: "The market is really not concerned about credit quality at this point" (CNBC Oct 27).
   SPV project debt: Hyperion (Meta/Blue Owl, ~$27-30B, A+) at 6.58%; El Paso (~$12B) "expected to yield
   more than 7%, around 0.4 percentage points above" Hyperion
   ([Capacity](https://capacityglobal.com/news/metas-12bn-el-paso-bond-exposes-ai-debt-repricing/)).
   Morgan Stanley: up to $800B private credit via asset-specific structures by 2028 (secondary).
7. **Rates backdrop.** 10y 4.86% on Nov 6 2026 (one source,
   [Advisor Perspectives](https://www.advisorperspectives.com/dshort/updates/2026/11/06/treasury-yields-snapshot-november-6-2026)),
   down from 5.17% on Sep 25; the FOMC hiked in September (Fortune, below). Hyperion-style 20-year
   bonds against 4-6-year chips is the duration mismatch the press flags.

### Reading through the cycle lens
Railroads (1850s, 1870s), telecom (2000) and shale (2014) all show the same telemetry sequence:
capex growth outruns internal cash, external finance fills the gap at widening spreads, and capex
peaks within ~1-3 years of the financing turn, usually when the product price breaks. Today we have
steps 1-2 but not the price break (GPU rents rising, cloud revenue doubling at Google: Q3 cloud revenue
$30.7B "more than double the prior year"). Committed 2027-28 hardware (AWS 2M GPUs, Hyperion 3.7M
H100e by Jan 2028 per [Epoch trends](https://epoch.ai/trends)) makes 2027 > 2026 near-certain (R_2027
~1.3-1.4). From there: if capex converges to CFO and CFO keeps growing ~23%/yr, R_2030 ~ 2.1-2.4
(edge of C); if the price break comes in 2028, telecom-style falls of 40-60% from peak put 2030 in A or
low B. D needs ~40%/yr AFTER the financing turn, which no reference cycle sustained for three more
years with negative FCF.

**Q1: A 12 / B 38 / C 40 / D 10.**

---

## Q2: Epoch training cost >= $10B for a model published by 2028-12-31 (centre of gravity)

### Signals
- Epoch trend: training cost "3.5x per year since 2020 (90% CI: 2.8x to 4.4x)"; compute "5x per year
  since 2020 (90% CI: 4x to 6x)"; "A typical AI data center with 1 gigawatt of IT power costs roughly
  $38 billion in up-front capital expenditure"; Colossus 2 "estimated computing capacity of 1.1
  million H100-equivalents"; "Meta Hyperion is expected to have over 3x more computing capacity, at
  3.7M H100-equivalents by January 2028" ([epoch.ai/trends](https://epoch.ai/trends)).
- Latest published Epoch cost point I can verify: **Grok 4 (Jul 2025), median $490M**, 246M
  H100-hours, rental-price method with "a 90% confidence interval of $1.90 to $2.20 per H100-hour".
  Epoch caveat verbatim: "The FLOP and GPU-hour estimates for Grok-4 are largely based on public
  statements from xAI, which are often vague. So there is significant uncertainty around our point
  estimate" ([Epoch data insight](https://epoch.ai/data-insights/grok-4-training-resources)).
- Frontier compute in 2026 is **below** the 5x line: Epoch reportedly estimates GPT-6 Astra (Sep 2026)
  at 9.4e26 FLOP vs Grok 4's 5.0e26 fourteen months earlier (~1.9x). Third-party caveats: the estimate
  "may be 'somewhat inflated'", and "Astra likely did not monopolize the entire cluster, as other
  models were trained simultaneously"; Google, Meta and xAI "have completed runs without public
  estimates" ([FutureSearch, Oct 17 2026](https://futuresearch.ai/app/p/a/rsi-largest-training-compute)).
  I could not find an Epoch dollar figure for Astra; scaling Grok 4's $490M by ~1.9x compute and ~1.4x
  cheaper FLOP gives ~$0.65B (my arithmetic, not Epoch's).
- Path arithmetic: $0.65B (Sep 2026) to $10B (by Dec 2028) is 15x in 2.3 years = ~3.3x/yr, i.e. it
  needs the trend to hold exactly from a point that is already below it. Feasibility exists: a 100-day
  run on all 3.7M H100e of Hyperion at Grok-4's ~$2/H100e-hr is ~$18B (my arithmetic), but labs split
  clusters across concurrent runs, and Epoch notes frontier runs "can't get much longer"
  ([Epoch](https://epoch.ai/data-insights/longest-training-run)).
- Cycle consequence: the financing strain in Q1 lands first on discretionary single-run size, not on
  inference capacity that has paying customers; a 2028 capex wobble cuts the tail here.
- Coverage: Epoch's database shows only models "where we have estimates", and per-model cost exists
  only where compute and hardware are known; closed-lab frontier models are exactly the ones whose
  cost is often missing.

**Q2: 33.**

---

## Q3: All ten top LMArena organizations US or PRC on 2028-12-31

### Signals
- Third-party snapshot of the style-controlled Text board, data as of 8 Nov 2026
  ([BenchLeader](https://www.benchleader.com/benchmarks/lmarena_text)): best model per organization,
  in order: Google 1527, Meta 1513, Anthropic 1505, Moonshot AI 1488, OpenAI 1485, Alibaba 1483,
  Zhipu AI 1482, Xiaomi 1480, DeepSeek 1475, SpaceXAI 1475. **All ten distinct top organizations are
  US or PRC today; the question would resolve Yes now.** Caveat: this is a scrape by a third party;
  the official page returned HTTP 403 to me and "lmarena.ai" now 301-redirects to arena.ai.
- Nearest non-US/PRC contender: Mistral. Mistral Large 3 ~1,414.8 in an Aug 12 2026 snapshot (vs
  GPT-5.5 ~1,476.6); a Mistral Medium 3.5 figure of ~1,481.8 appears on one aggregator but "the
  labeling on that page is inconsistent" and it does not appear in the Nov 8 top 40
  ([gradually.ai](https://www.gradually.ai/en/llm-comparison/gpt-5.5-vs-mistral-large-3/)). Gap to
  the 10th organization: ~60 Elo on the verifiable figure.
- Margin is thin at the bottom: 10th place is a ~1475 tie, and Chinese organizations hold 5 of 10
  seats, so any PRC-lab fade opens a slot to whoever is 11th (unknown from my snapshot; could be
  another US/PRC lab such as ByteDance, Tencent or Amazon).
- Cycle consequence: a capital-cycle bust thins the US commercial tier first (the essay's
  "principalities" survive), which helps sovereign or EU entrants only if they are already close; none
  is.

**Q3: 84.**

---

## Q4: DefiLlama stablecoin market cap on 2028-12-31

### Signals
- DefiLlama total ~$290.1B on Nov 8 2026, "down about 2.2% over the past week and about 4.9% over 30
  days"; USDT ~$176.8B, USDC ~$70.6B ([DefiLlama](https://defillama.com/stablecoins), read via search
  snapshot). Another report: ~$292.31B on Nov 7 after "a $6.66B weekly drop, the steepest of 2026";
  cause disputed ("One ties the November outflow to a Binance security breach, but notes neither
  issuer has linked the two events")
  ([cryptonews](https://cryptonews.net/news/analytics/33719810/)).
- So 2026 is **flat to down**: ~$308B end-2025 -> record ~$322B (26 May) -> ~$290B now (~-6% YTD),
  after ~+50% in 2025. No AI-driven "near-unlimited demand" is visible in the series yet.
- Catalyst: OCC GENIUS Act final rule (Oct 2026), effective 18 Jan 2027; "OCC expects to begin
  processing issuer applications in 2027"; Treasury/FinCEN status unclear
  ([Decrypt](https://decrypt.co/381502/occ-finalizes-genius-act-stablecoin-rules-ahead-of-january-deadline),
  [CryptoBriefing](https://cryptobriefing.com/occ-final-rule-genius-act-stablecoins/)). Bank
  "tokenized deposits" may not be listed by DefiLlama as stablecoins.
- Cycle consequence: stablecoin supply has tracked crypto-cycle liquidity and the T-bill/IORB spread;
  a higher-for-longer rate path (Fed hiked Sep 2026) favours yield-bearing substitutes over
  non-yielding coins, and GENIUS bans issuer-paid yield.

**Q4: P10 $225B / P50 $345B / P90 $540B.**

---

## Q5: Fed numerical Treasury yield ceiling/target (>= 1y) announced before 2031

### Signals
- Treasury, not the Fed, is acting on the long end: Aug 19 2026 Treasury doubled max long-dated
  buyback size from $2B to "at least $4 billion per operation"; Bessent: "We have a big toolkit, so
  we'll see"; "the Treasury and the Fed would work together if there was any change in the balance
  sheet" ([CNBC Aug 20](https://www.cnbc.com/2026/08/20/bessent-warsh-fed-bond-market-treasury-yields.html)).
  Buybacks are excluded by the question.
- Fed Chair Warsh wants a smaller balance sheet tilted to bills ("would likely push up long-term
  Treasury yields", CNBC) and an updated accord in which "The Treasury secretary would need to find the
  proposed change in Fed holdings acceptable". A Warsh balance-sheet task force is "expected to report
  late this year or early next". CNBC: neither the Fed nor Treasury has issued an official statement
  ruling yield curve control in or out.
- The FOMC hiked unanimously in September 2026, then held; Brookings' Robin Brooks: "What's happening
  is yield curve management"; "Warsh is neither hawk nor dove" ... "just trying to keep long-term yields
  manageable" ([Fortune, Nov 1](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/)).
  That is one economist's interpretation; Fortune's article reports no Warsh statement on YCC and no
  numeric target.
- 10y 4.86% (Nov 6), back under 5% from 5.17% (Sep 25). CBO baseline yields 4.3% with stress scenarios
  +50 and +150bp (Fortune).
- Cycle consequence: an AI capex bust is disinflationary and lowers yields on its own, removing the
  motive for an explicit cap; the YCC path needs a yield spike with weak growth (fiscal dominance).
  The telemetry shows informal management and accord talk, not a numeric peg.

**Q5: 8.**

---

## Q6: BLS nonfarm business labor share, CY2030 average

### Signals
- **Q3 2026 preliminary: 53.0%, "the lowest level in the series, which begins in the first quarter of
  1947"** (BLS USDL 26-1631, Nov 5 2026, [PDF](https://www.bls.gov/news.release/pdf/prod2.pdf)).
  Productivity +3.6% (SAAR), ULC -0.7%, real hourly compensation +1.0% over four quarters vs
  productivity +2.1%. Revised Q3 release: Dec 8 2026.
- **Vintage warning:** the release "reflect[s] the 2026 Annual Update of the National Income and
  Product Accounts"; "measures incorporating compensation were revised back to 2021 for all sectors".
  The pre-revision vintage had Q2 2026 at 52.8% ([BLS TED](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm));
  since 53.0% is now the series low, Q2 was revised up above 53.0%. The preamble's 52.8% baseline is
  stale.
- Pre-revision path (TED): Q1 2025 55.3, Q2 54.7, Q3 54.2, Q4 54.1, Q1 2026 53.6, Q2 52.8: about -2pp in
  five quarters. Decade average cited ~55.6% (Fortune, Jan 2026).
- Cycle consequence: labor share is counter-cyclical to profits. Capex booms raise measured output and
  profits (share falls); busts crush profits first (share jumps, as in 2001-02 and 2008-09). So the
  capital-cycle lens says the 2030 value depends on WHERE in the cycle 2030 sits: a 2028-29 bust
  lifts it back toward 54-55; a still-running boom plus automation extends the slide.

**Q6: P10 48.6 / P50 51.6 / P90 54.4.**

---

## Q7: Indian IT big-5 headcount 31 Mar 2029 at least 10% below 31 Mar 2026

### Signals
- **31 Mar 2026 base (company-reported via press):** TCS 584,519; Infosys 328,594; Wipro 242,156;
  HCLTech 227,181; Tech Mahindra 147,623 = **1,530,073**. FY26 combined -7,389 vs +12,718 in FY25
  ([IANS](https://ianslive.in/top-it-firms-hiring-turns-negative-as-headcount-falls-over-7000-in-fy26--20260425104000)).
  Infosys's Q4 change is disputed in press (+888 vs -8,440); the 328,594 level reconciles with the Q1
  FY27 combined +5,480 reported later, so I use it.
- **30 Sep 2026:** TCS 598,056; Infosys 332,542; HCLTech 230,339; Wipro 236,328; Tech Mahindra
  152,206 = **1,549,471** (+13,918 in Q2 FY27 after +5,480 in Q1)
  ([Lapaas](https://lapaasvoice.com/tcs-infosys-hcltech-wipro-and-tech-mahindra-add-13918-employees-in-q2-fy27),
  [AngelOne](https://www.angelone.in/news/stocks/indian-it-stocks-in-focus-top-five-firms-add-16-055-employees-in-h1fy27-but-demand-recovery-remains-uncertain)).
  Analyst caveat: the hiring numbers "do not yet signal a recovery"; Infosys cut FY27 revenue-growth
  guidance to 1-2% from 1.5-3%. Infosys fresher hiring >8,000 in Q2; HCLTech 6,136 freshers.
- **Threshold:** 0.9 x 1,530,073 = 1,377,066, i.e. **-11.1% from the Sep 2026 level** in ten quarters
  (~-172k). The worst recent year (FY24) cut roughly 4% from the group (my recollection, unverified).
- Cycle consequence: hyperscaler capex is cannibalising enterprise IT budgets at the margin and
  revenue guidance is weak, but the telemetry shows headcount RISING in H1 FY27, with fresher intakes
  intact. The essay's "bottom K" mechanism shows in revenue per employee and Wipro, not yet in the
  aggregate.

**Q7: 12.**

---

## Resolution audit (resolver read-as-written check)

1. **Q2: deflator mismatch.** Epoch's explorer labels the cost field "Training compute cost (2023
   USD)" ([epoch.ai/data/ai-models](https://epoch.ai/data/ai-models)), i.e. constant dollars, while Q2
   says "nominal USD". A model at ~$9.0-9.9B in 2023 USD could be >= $10B nominal (2023->2028
   inflation ~10-15%). The resolver must either convert (which index?) or accept Epoch's headline as
   is. Recommend: amend to "Epoch's headline training-cost figure as published, in whatever dollar
   basis Epoch uses", or specify the conversion. Also Epoch reports cost via more than one method
   (rental price vs amortized hardware for Grok 4); "any method it reports as primary" needs a
   tie-break if two are shown.
2. **Q3: the named resolver has been renamed.** lmarena.ai 301-redirects to arena.ai ("Arena"); the
   fallback rule (closest successor by same publisher) covers it, but the question text should say so
   to avoid a cancellation argument. Also the official page returned 403 to automated fetch;
   resolution needs a human or archived snapshot at 2028-12-31. **Geography:** several PRC labs'
   ultimate parents are Cayman-incorporated (Alibaba Group Holding, ByteDance Ltd); the lock says
   "headquarters (ultimate parent)", which I read as operating HQ (Hangzhou, Beijing), but an
   incorporation reading would turn Yes into No. Recommend stating "operating headquarters".
   "SpaceXAI" (xAI after the SpaceX combination) is US either way.
3. **Q6: annual average vs vintage rule.** The percent labor share appears in the release TEXT only
   for the latest quarter; the published tables carry the index. A "calendar-2030 annual average" first
   becomes computable from the Q4 2030 preliminary release (~Feb 2031), but each quarter's percent is
   first printed in a different release, and the Q4 2030 release will have revised Q1-Q3. Recommend:
   resolve on the Q4 2030 preliminary release's vintage of all four 2030 quarters (from the BLS
   labor-share percent data series), averaged. The preamble's 52.8% baseline is already superseded
   by the Sep 2026 NIPA revision (Q3 2026 = 53.0% is the new low).
4. **Q1:** readable as written. Note Amazon's line is GROSS "Purchases of property and equipment"
   (proceeds and incentives are a separate line, and "incentives are excluded" means not netted), and
   Meta's headline capex adds finance-lease principal that the lock excludes. Microsoft's headline
   ~$170B includes finance leases; its cash line is materially lower, so the CY2026 denominator will
   be below the $720-745B headline.
5. **Q4, Q5, Q7:** readable. Q7: Infosys's 31 Mar 2026 figure is disputed in secondary press; resolve
   from the company's Q4 FY26 fact sheet.

## Sources (primary where available)
- BLS Productivity and Costs Q3 2026 preliminary, USDL 26-1631: https://www.bls.gov/news.release/pdf/prod2.pdf
- BLS TED, labor share 52.8% Q2 2026 (pre-revision): https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm
- Epoch AI trends: https://epoch.ai/trends ; capex vs cash flow: https://epoch.ai/data-insights/hyperscaler-capex-vs-cash-flow ; Grok 4: https://epoch.ai/data-insights/grok-4-training-resources ; models DB: https://epoch.ai/data/ai-models
- CNBC Alphabet Q3: https://www.cnbc.com/2026/10/28/alphabet-googl-earnings-q3-2026.html ; AI debt: https://www.cnbc.com/2026/10/27/ai-debt-hyperscaler-earnings.html ; Bessent/Warsh: https://www.cnbc.com/2026/08/20/bessent-warsh-fed-bond-market-treasury-yields.html
- Stock Metric Lab Q3 capex table: https://stockmetriclab.com/ai-capex-comparison-2026/
- Semafor, Meta equity: https://www.semafor.com/article/10/26/2026/meta-announces-95b-offering-to-fund-ai
- Fortune on Warsh/yields: https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/
- DefiLlama stablecoins: https://defillama.com/stablecoins
- BenchLeader Arena text snapshot: https://www.benchleader.com/benchmarks/lmarena_text
- FutureSearch on largest training compute: https://futuresearch.ai/app/p/a/rsi-largest-training-compute

```json
{"q1": {"A": 12, "B": 38, "C": 40, "D": 10},
 "q2": 33, "q3": 84,
 "q4": {"p10": 225, "p50": 345, "p90": 540},
 "q5": 8,
 "q6": {"p10": 48.6, "p50": 51.6, "p90": 54.4},
 "q7": 12}
```
