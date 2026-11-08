# E1 ai-capital-cycle / premortem (A5, Wave 2, red team)

**BLUF.** All three Wave-1 seats assume the Big-4 are this cycle's cash-rich *incumbents*, with operating
cash flow that is independent of the build: they can fund it, or survive the bust. On the backlog
evidence they are closer to its *Lucent/Nortel*: vendors whose revenue backlog is about half owed by two
labs they partly finance. That ties funding to spending, so both tails of Q1 get fatter and the
"plateau" regime B, which fermi made modal at 59, loses its claim to be the default. My Q1 is a barbell:
A 30 / B 36 / C 29 / D 5. The other six questions: Q2 18, Q3 68, Q4 225/370/700, Q5 6,
Q6 48.7/51.4/54.0, Q7 18.

Lens discipline: I read only `questions.md`, the E1 mandate and the premortem lens in `efforts.md`, the
E1 Wave-1 packet, and (to attack the fermi seat's use of the model) `adapter-output.md` /
`adapter-spec.json` and the one model parameter they name. Web searches were used to build counter-cases.
They are not used to herd on others' forecasts.

---

## 1. The shared assumption attacked

**The assumption: Big-4 operating cash flow is an exogenous funding base that keeps growing ~15-23%/yr
whatever the AI cycle does.** In railway or telecom terms, it assumes the Big-4 are the incumbents who
survive the bust (Verizon, SBC), not the vendors whose customers go under (Lucent, Nortel).

Each seat leans on it:
- **Fermi** builds Q1 on "hold capex/OCF at ~1.0 while OCF grows 15-19%/yr", which gives R ≈ 1.85-2.1.
  It treats a bust as a separate 25% event with a replacement floor of $0.4-0.5T.
- **Signals** uses "if capex converges to CFO and CFO keeps growing ~23%/yr, R ≈ 2.1-2.4".
- **Outside-view** draws its reference class from busted *single-product, debt-financed* sectors. It never
  asks whether the Big-4's diversified cash flows are actually insulated from this build. It is forbidden
  mechanism, so it inherits the assumption silently. Its A 50 assumes the Big-4 behave like CLECs. The
  other two assume they behave like AT&T in 2002. Neither tested which it is.

**Why it fails.**

1. **The labs carry the backlog.** Contracts with OpenAI and Anthropic are reported as about half of the
   ~$2T combined revenue backlog of Amazon, Microsoft, Google and Oracle. Detail:
   - Microsoft's CFO attributed ~45% of a ~$625B RPO to OpenAI.
   - Anthropic's ~$200B Google Cloud commitment was >40% of Google's backlog when disclosed.
   - AWS's headline RPO excluded a separate >$100B Anthropic agreement.
   - Sources: [Fierce Network](https://www.fierce-network.com/cloud/microsoft-livin-ai-prayer),
     [Michael Parekh summary](https://michaelparekh.substack.com/p/ai-anthropic-and-opemai-half-of-2),
     [Business Today](https://www.businesstoday.in/technology/story/who-is-really-paying-for-the-ai-boom-follow-the-money-from-cloud-to-ai-labs-549292-2026-08-14).
   - Caveat, preserved: the sources are "mixed in quality"; Microsoft's backlog appears as "$625B, $627B,
     and $678B across different reports".
2. **The Big-4 finance their own customers.** Microsoft owns part of OpenAI, and Amazon and Google own
   parts of Anthropic. The labs' ability to pay depends on further rounds priced off the Line itself. That
   is vendor financing, the mechanism that turned Lucent's and Nortel's 1999-2000 revenue into 2001-02
   write-offs.
3. **So OCF growth and capex growth are one bet, not two.** The cloud-revenue growth that makes the
   OCF arithmetic work is partly the spending of customers the vendors fund. In the world where capex
   stalls, OCF stalls too. The Wave-1 "no bust → R ≈ 2" and "bust → R < 1" branches are not
   independent draws. The correlation pushes mass out of the middle.
4. **Cash-rich incumbents cut hard too.** In the telecom bust the incumbents were the cash-rich firms,
   and they cut deeply:
   - RBOC capex fell 2001→2002: Verizon $17.3B → $11.9B, SBC $11.2B → $6.8B, BellSouth $6.0B → $3.8B
     ([House hearing record](https://www.govinfo.gov/content/pkg/CHRG-108hhrg86044/html/CHRG-108hhrg86044.htm)).
   - SBC's 2003 budget was ~$5-6B, against ~$12-13B in 2000
     ([Computerworld](https://www.computerworld.com/article/1340085/sbc-slashes-jobs-capital-spending.html)).
     That is -55% to -60% over three years for a firm that never came close to insolvency.
   - Cash flow is the *option* to keep building. Managements exercise that option only while ROI looks
     good.
5. **These four have cut fast before.** Amazon's purchases of P&E fell from ~$63.6B (2022) to
   ~$52.7B (2023) after it overbuilt fulfilment, and Meta's fell from ~$31.4B to ~$27.3B in its "year
   of efficiency" (10-K figures from memory, not re-read). Microsoft cancelled or paused data-centre
   leases in early 2025. The essay's claim that "there may never be a signal to stop building" is
   contradicted by these firms' own behaviour within the last four years.

**What the Wave-1 seats got right and I keep:** CY2026 ≈ $700-720B on the locked cash lines; 2027 > 2026
is near-certain (R_2027 ≈ 1.25-1.35); D fails a physical check.

## 2. Further attacks on the Wave-1 reasoning

- **Scope insensitivity (Q1, all seats).** McKinsey's base case is ~$5.2T of *cumulative* AI-data-centre
  capex for the whole world to 2030, and its high scenario is $7.9T
  ([pulse.bot summary of McKinsey](https://www.pulse.bot/ai/news/hyperscalers-will-own-two-thirds-of-data-center-capacity-by-2031-df7ff550-3954-4248-b285-e25ac7da5af0/);
  secondary, and "every major AI infrastructure spending forecast went up in 2026"
  ([softwarestrategiesblog](https://softwarestrategiesblog.com/2026/10/22/ai-infrastructure-spending-forecasts-compared-gartner-idc-delloro-goldman-sachs-2030/))).
  - **R = 2 path** (0.41, 0.70, 0.90, 1.1, 1.25, 1.4 $T for 2025-30): ~$5.8T cumulative 2025-30 from
    four firms alone, already above McKinsey's world base case.
  - **R = 4 path:** ~$8.5T, above the world high case.
  - Signals' C 40 and D 10 price the four firms out-spending the world's published high scenarios.
    That does not make it impossible, since forecasts keep being revised up. It does make it a tail, not
    a coin flip.
- **The opposite reference class the outside view skipped.** These four firms' own rolling 4-year capex
  ratio has been about 2 or more in every window I can reconstruct:
  - 2018→22 ~2.35, 2019→23 ~2.0, 2020→24 ~2.3 (approximate, from memory of 10-K lines).
  - Anchoring on sector busts while ignoring the firms' own record is drag/pull asymmetry. The outside
    seat's own caveat admits its sample is "biased toward famous busts".
  - The firm record shows something else too: one ROI-pause year (2023) was enough to drag a window
    down to exactly the B/C boundary.
- **Off-cash-line migration, both seats too mild.** Fermi raised it, but only as a pull from C/D into B.
  It can also pull B into A while the physical build keeps going:
  - Meta's Hyperion sits off balance sheet in a ~$27B JV, 80% owned by Blue Owl, under four-year leases
    ([Bisnow](https://www.bisnow.com/news/national/data-center-capital-markets/meta-pushes-its-largest-data-center-project-off-its-books-with-27b-joint-venture-131490)).
  - An FT figure, via a secondary summary and itself flagged as unverified, puts Big Tech's off-balance-
    sheet AI exposure at ~$300B
    ([fourweekmba](https://fourweekmba.com/ai-alphabet-meta-ai-infrastructure-off-balance-sheet-300-billio/)).
  - The locked definition excludes all of this. A CFO under the CDS and FCF pressure that signals
    documented reaches for this lever before cutting the build.
  - Q1 can therefore read "Line broken" while the Line is intact: R < 1 on the cash line with no bust.
- **Asset-life extension weakens the replacement floor.** Fermi's bust-world floor of $0.4-0.5T assumes
  chips are replaced on schedule. In a squeeze, firms sweat assets:
  - Meta *extended* server lives to 5.5 years in 2025.
  - Microsoft depreciates GPUs over six years.
  - Source: [summary](https://davefriedman.substack.com/p/the-176-billion-accounting-question); secondary.
  - The 2026 GPU fleet need not be replaced in 2030.
- **Conjunction neglect in signals' "price break precedes the turn".** Signals reads rising GPU rents as
  "no glut yet". But in a vendor-financed cycle the price signal lags: the vendor's customers keep
  paying list price until the funding round that fails. Telecom carrier capex peaked in 2000, *a year
  after* revenue peaked in 1998 (per the [Computerworld](https://www.computerworld.com/article/1406298/carriers-plan-less-spending-on-equipment.html)
  / Lightwave coverage). Rising rents in Q4 2026 say little about 2028.
- **Narrative coherence mistaken for likelihood (Q6, fermi and signals).** Both say a bust raises the
  labor share because profits fall first. That holds only for the first quarters:
  - After 2001 and 2008-09 the BLS share fell through the recovery's productivity surge (from memory of
    the series, not re-read).
  - A 2028-29 bust read through a *2030 annual average* is therefore near zero or negative, not the
    +0.3 to +1.8 fermi booked.

## 3. Attack on the simulation closure the fermi seat used

The fermi seat called the model "directional only", but it still drew three directional facts from it.
None carries information about the question.

1. **Q1, "even dc-fast lands at R ≈ 3.8, below 4.0".** This is the lever's own setting, not a result.
   - `adapter-spec.json` defines `lever:dc-fast` as `dataCenterBaseGrowth: 0.30` and
     `dataCenterPowerSpendCeiling: 0.005`, a 10x loosening of the default WTP ceiling of 0.0005 on the
     DC electricity bill as a share of GDP (`src/modules/demand.ts`).
   - 1.30^4 = 2.86, and the ceiling relaxation adds the rest. A panelist who had typed 0.35 would have
     got "above 4".
   - The adapter also discloses that DC capex is "proportional to electricity-load additions plus 15%
     replacement, booked in the year the load arrives (no construction lead)", with "no lab, no
     hyperscaler and no stock market".
   - A capex that is proportional to load *additions*, braked by a GDP-scaled power-bill ceiling, gives a
     plateau whenever additions level off. "Unlevered runs sit in B" restates the closure. It is not
     evidence for B. It also cannot produce A: the adapter says so, and that is an inability, not a
     finding.
   - The level is "~2.5-3x below observed 2025-26 spending".
2. **Q5, "no run reaches the 150% fiscal-dominance trigger, so the sign is no repression".**
   - The trigger is world-average public debt/GDP at a threshold the repo itself labels judgment.
   - A world average of 0.89 says nothing about the US Fed.
   - The 1942 peg was imposed for war finance with US debt near 50% of GDP, not at a debt threshold.
   - The model's repression is a smooth real-rate cap, not an announced numeric target. That is the
     wrong object for Q5.
3. **Q6, "the model's sign agrees".**
   - The model's labor share falls only because robot and AI income since 2025 is booked to capital by
     construction (`automationIncomeToCapital`). Its agreement echoes its own assumption.
   - It also omits the mechanism I think matters most for the BLS gross share by 2030: depreciation
     (§4, Q6).

Net: the fermi seat's Q1 B 59 rested mainly on cash arithmetic (attacked in §1). The model added
false comfort to B and to "D below 4".

---

## 4. Both-tail premortems and my numbers

### Q1: Big-4 cash capex, CY2030 / CY2026

**Premortem of the modal view (fermi's B) from below: "It's 2031 and R = 0.8. What happened?"**
1. In 2027, OpenAI's next round prices flat. Its ~$1T+ of compute commitments get re-cut.
2. Microsoft's RPO, ~45% OpenAI, is restated. Anthropic renegotiates its Google and AWS terms.
3. In 2028 the four cut new starts. Capex peaks in CY2027 at ~$0.9-1.0T.
4. Meta and Microsoft move new capacity into Blue-Owl-style JVs and neocloud leases, off the cash line,
   and extend GPU lives to 6-7 years.
5. CY2030 cash P&E is ~$0.55-0.65T: SBC 2000→03 at half the severity.

Nothing in this story is exotic. Every step has a 2022-2026 precedent at these same firms.

**Premortem from above: "It's 2031 and R = 3.2. What happened?"**
1. Agentic inference revenue compounds and the labs pay.
2. HBM/DRAM and power-equipment inflation push nominal $/GW up.
3. Meta's ~$95B equity programme proves that mega-caps *will* fund past OCF. That breaks fermi's "no
   precedent for 4-5 years of zero FCF" constraint, which fell in Q3 2026.
4. 2027 at +30%, then +22/18/15% gives R ≈ 2.3. A late-decade reacceleration takes it past 3.
5. D needs ~$2.8T: above every published world high case for four firms alone, and ~40-55 GW/yr. It
   stays a tail.

**Pricing.**

| Branch | P | Outcome split |
|---|---|---|
| Funding loop breaks by 2029 (lab-funding failure, ROI pause, or efficiency shock) | 0.40 | A 0.65 / B 0.35 |
| Loop holds | 0.60 | lognormal median R ≈ 2.05, σ_ln 0.32 → P(R ≥ 2) ≈ 0.53, P(R ≥ 4) ≈ 0.08 (fat right tail); off-line migration and life extension give A ≈ 0.05 |

Branch totals:
- A ≈ 0.26 + 0.03 = 0.29
- B ≈ 0.14 + 0.25 = 0.39
- C ≈ 0.27
- D ≈ 0.05

**Rounding:** I tilted ~2-3 points from B to the wings (A +1, C +2), not by formula. B is the regime
that needs *neither* coherent story: a soft landing between +0% and +19%/yr. The reflexive loop makes
soft landings rarer than the lognormal admits.

**Answer: A 30 / B 36 / C 29 / D 5.**

### Q2: Epoch ≥ $10B training cost, published by 2028-12-31

**Shared assumption attacked (Q2).** Wave 1 treats this as "does the cost trend land on time".

**Scope check.**
- Epoch's headline (amortized, 2023 USD) puts Grok 4 at ~$388M, about 3.6% of its ~$10.7B upfront
  cluster (fermi's read of the CSV).
- At ~$1.6 per H100e-hour amortized, the arithmetic runs:

| Run | H100e-hours | Headline at ~$1.6/hr |
|---|---|---|
| 100 days on all 3.7M H100e of Meta Hyperion (Epoch: by Jan 2028) | ~8.9B | ~$14B |
| 4 months on the same cluster | ~10.7B | ~$17B |

- Discount for Blackwell/Rubin's lower cost per H100e and this lands near $10B.

So **Yes needs one lab to put roughly the largest cluster on Earth on a single run for 3-4 months,
publish the model in 2028, and have Epoch cost it.**

**Premortem of "No".** Wave-1 seats underweight lumpiness:
- Frontier compute grows in steps when GW sites come online (Colossus 2, Stargate Abilene, Hyperion all
  in 2027-28).
- The 1.9x-in-14-months slowdown since Grok 4 may be a pause between steps, not a new slope.
- The upfront-method ambiguity fermi flagged (Grok 4 already $10.7B upfront) is a real if small
  resolver-leniency path.

**Premortem of "Yes".**
- Frontier labs now split clusters across concurrent runs and RL post-training.
- Closed labs publish no hardware counts. Epoch's 2026 headline-cost coverage is 1 of 95 models.
- Epoch's 2023-USD basis is ~10% harder than nominal.
- E1 consequence: if the funding loop in Q1 breaks in 2027-28, the first casualty is the single
  speculative mega-run. Inference capacity with paying customers survives.

**Pricing.**
- P(a ~$10B-scale single run published by end-2028) ≈ 0.33.
- P(Epoch prices it by 2029-12-31 | it happens) ≈ 0.45.
- Lenient resolution adds ~0.03.

0.33 × 0.45 + 0.03 ≈ 0.18.

**Answer: 18.**

### Q3: LMArena top-10 distinct organizations all US/PRC on 2028-12-31

**Shared assumption attacked (Q3).** Signals and fermi (84, 77) assume today's snapshot persists. Both
read it from a third-party mirror, BenchLeader, which the source itself warns diverges across sites.

**Premortem of "Yes".**
- Two years is two to three full generations on Arena.
- The 6th-10th slots sit in a ~10-Elo cluster (1475-1483). As open weights converge, the gap between
  the 10th and 20th organization compresses.
- One entrant is enough to flip the question:
  - a Mistral release (Mistral sat ~1415-1427 in August 2026 per
    [gradually.ai](https://www.gradually.ai/en/llm-comparison/gpt-5.5-vs-mistral-large-3/), ~50-60 Elo
    short);
  - a Gulf, Korean, Japanese or Canadian lab;
  - a style-tuned fine-tune of a Chinese open-weight base by a non-US/China org;
  - a Chinese lab re-domiciled to Singapore for export-control reasons (the Manus pattern).
- The outside view's two-country-concentration base rate of ~22% is not crazy for an arena that ranks
  style as much as capability.

**Premortem of "No".**
- The nearest outsider is ~50-60 Elo back with ~27x less compute.
- US and PRC have deep benches behind slot 10: ByteDance, Tencent, MiniMax, StepFun, Amazon, Microsoft
  MAI, Nvidia.
- E1 consequence: a capex bust thins US second-tier labs, but the PRC bench refills those slots.

**Answer: 68.**

### Q4: DefiLlama total stablecoins, 2028-12-31 ($B)

**Shared assumption attacked (Q4).** All three seats price this as a crypto-cycle variable starting from
~$290B.

**Premortem from above.**
- GENIUS takes effect in January 2027. Bank and fintech issuers (payments, treasury, AI-agent rails) do
  not need a crypto bull market.
- A doubling of the non-trading slice alone, plus a normal crypto upcycle, gives ~$600-700B.
- The P90 should sit there, not at 540-640.

**Premortem from below (missed by all three).** The GENIUS foreign-issuer cliff falls on
**18 July 2028**, five months before resolution.
- From that date it is "generally unlawful" for US service providers to offer a payment stablecoin not
  from a permitted issuer.
- USDT, ~60% of supply, is not a permitted issuer, and Tether "has not publicly detailed a comprehensive
  plan"; USAT was ~$185M against ~$183B of USDT in August 2026.
- Sources: [coinpaprika](https://coinpaprika.com/news/tether-usdt-two-year-clock-us-exchanges/),
  [stablecoininsider](https://stablecoininsider.org/genius-act-2028-deadline-stablecoins/). Caveat
  preserved: "Legal experts disagree on the exact timing for foreign issuers."
- Most USDT use is offshore and migration to USDC/USAT largely conserves the total. Still, a
  forced-redemption episode in H2 2028 plus a crypto bear market is a credible path to ~$220B.
- E1 consequence: an AI-capex bust is risk-off and hits the trading-collateral slice.

**Answer: P10 225 / P50 370 / P90 700.**

### Q5: Fed numerical yield ceiling or target (≥1y maturity) before 2031

**Premortem of "No": a path Wave 1 ignored.** The question counts *any* Treasury of ≥1 year, so a
**short-end** target counts: a Brainard-style or RBA-style 2-3-year yield target used to reinforce
forward guidance at the lower bound. That is the form the FOMC actually discussed in 2020.
- E1 path: bust in 2028-29, then a recession and the Fed at or near zero by 2030. I put that at ~0.15.
- P(short-end yield target | lower bound) ≈ 0.10. The RBA's disorderly exit in 2021 is the deterrent.
- Path value ≈ 0.015.

**The essay's long-end accord.**
- Warsh wants a smaller, bill-tilted balance sheet, the opposite of a peg. The FOMC hiked in September
  2026.
- A numeric long-end ceiling needs a fiscal-dominance crisis plus a compliant FOMC: ~0.035.
- War or other shock: ~0.01.

**Premortem of "Yes".** This is the modal view and I cannot find a strong case against it. The fermi
seat's model argument (world debt below 150%) is not part of it: see §3.

**Answer: 6.**

### Q6: BLS nonfarm business labor share, CY2030 average (%)

**Mechanism every Wave-1 seat missed: depreciation.** The BLS share is compensation over *gross*
sector output. Gross output includes consumption of fixed capital.
- The AI build is the shortest-lived capital in the economy.
- Big-4 depreciation alone could rise by ~$250-350B/yr by 2030. Perhaps two-thirds of it is in the US.
- That moves ~0.6-1.0pp of a ~$24-25T nominal nonfarm-business output into capital income, before any
  worker is displaced.
- This is the Koh-Santaeulàlia-Llopis-Zheng (Econometrica 2020) IPP-depreciation channel for the post-1980
  decline, sped up.

**Premortem from below (the essay's world).** Depreciation (-0.8) + trend (-1.0) + cognitive-AI
substitution (-1.5) + a post-bust productivity shake-out (2009-10 pattern) puts the share at ~48.5.

**Premortem from above.**
- Immigration restriction tightens labor supply.
- A capex bust cuts the *new* depreciation wave in half and the profit share with it.
- The record low mean-reverts, as pre-2000 lows did (+1 to +2.8pp per the outside seat).
- Together these give ~54.

**Start level.** 53.0 (2026Q3 first print after the NIPA revision; the preamble's 52.8 is stale).

**Answer: P10 48.7 / P50 51.4 / P90 54.0.**

### Q7: Big-5 Indian IT headcount at Mar 2029 ≥10% below Mar 2026

**Shared assumption attacked (Q7).** All three treat a 10% fall as needing an unprecedented decline:
"worse than any aggregate precedent", "~-4.5%/yr". That is scope insensitivity about *speed*.
- Voluntary attrition is ~13%/yr: TCS 12.7%, Wipro 13.8% in Q2 FY27
  ([HRKatha](https://www.hrkatha.com/news/it-hiring-takes-divergent-turns-in-q2-as-workforce-numbers-shift/),
  [People Matters](https://www.peoplematters.in/news/business/wipro-workforce-declines-28percent-sequentially-to-236328-in-q2-fy27-52773);
  definitions differ by firm and "cannot be compared directly").
- A hiring freeze with no layoffs cuts ~13% in one year.
- Analysts already model 2-3%/yr AI-led deflation of the application-services base, and Infosys "tracks
  ... and has declined to publish" its own figure
  ([Business Today](https://www.businesstoday.in/technology/artificial-intelligence/story/ai-deals-grow-but-indias-it-services-revenue-model-faces-a-reset-544547-2026-07-23)).
- The work Indian IT does (maintenance, testing, BPO) is exactly what 2027-28 coding agents target.
- GCCs move work in-house inside India, off the big-5's books.
- E1 consequence: a 2028 US capex bust and recession lands on discretionary IT budgets at the same
  moment.

**Premortem of "Yes".**
- The line is rising: +13,918 in Q2 FY27, with fresher intakes intact.
- The pyramid business model bills by headcount, and the firms are hiring for AI services.
- Acquisitions add staff.
- The firms have every incentive to defer a freeze until revenue actually falls.

**Answer: 18.**

---

## Sources (beyond those inline)
- E1 Wave-1 packet (outside-view, fermi, signals): `docs/forecasts/commanding-heights-2026/seats/E1-wave1-packet.md`.
- Adapter: `docs/forecasts/commanding-heights-2026/adapter-output.md`, `adapter-spec.json`; model parameter `dataCenterPowerSpendCeiling` (default 0.0005) in `src/modules/demand.ts`.
- Telecom capex: [govinfo House hearing](https://www.govinfo.gov/content/pkg/CHRG-108hhrg86044/html/CHRG-108hhrg86044.htm), [Computerworld on SBC](https://www.computerworld.com/article/1340085/sbc-slashes-jobs-capital-spending.html), [Computerworld on carrier spending](https://www.computerworld.com/article/1406298/carriers-plan-less-spending-on-equipment.html).
- Backlog concentration: [Fierce Network](https://www.fierce-network.com/cloud/microsoft-livin-ai-prayer), [Parekh](https://michaelparekh.substack.com/p/ai-anthropic-and-opemai-half-of-2), [Business Today](https://www.businesstoday.in/technology/story/who-is-really-paying-for-the-ai-boom-follow-the-money-from-cloud-to-ai-labs-549292-2026-08-14).
- Off-balance-sheet: [Bisnow on Hyperion](https://www.bisnow.com/news/national/data-center-capital-markets/meta-pushes-its-largest-data-center-project-off-its-books-with-27b-joint-venture-131490), [fourweekmba on ~$300B](https://fourweekmba.com/ai-alphabet-meta-ai-infrastructure-off-balance-sheet-300-billio/).
- Asset lives: [Dave Friedman](https://davefriedman.substack.com/p/the-176-billion-accounting-question), [Fortune Apr 2026](https://fortune.com/2026/04/15/data-centers-hyperscalers-spending-billions-on-hardware-thats-worthless-in-3-years/).
- 2030 forecasts: [softwarestrategiesblog](https://softwarestrategiesblog.com/2026/10/22/ai-infrastructure-spending-forecasts-compared-gartner-idc-delloro-goldman-sachs-2030/), [pulse.bot/McKinsey](https://www.pulse.bot/ai/news/hyperscalers-will-own-two-thirds-of-data-center-capacity-by-2031-df7ff550-3954-4248-b285-e25ac7da5af0/).
- GENIUS 2028 cliff: [coinpaprika](https://coinpaprika.com/news/tether-usdt-two-year-clock-us-exchanges/), [stablecoininsider](https://stablecoininsider.org/genius-act-2028-deadline-stablecoins/).
- Arena: [gradually.ai](https://www.gradually.ai/en/llm-comparison/gpt-5.5-vs-mistral-large-3/), [arena.ai overall](https://arena.ai/leaderboard/text/overall).
- Indian IT: [HRKatha](https://www.hrkatha.com/news/it-hiring-takes-divergent-turns-in-q2-as-workforce-numbers-shift/), [People Matters](https://www.peoplematters.in/news/business/wipro-workforce-declines-28percent-sequentially-to-236328-in-q2-fy27-52773), [Business Today](https://www.businesstoday.in/technology/artificial-intelligence/story/ai-deals-grow-but-indias-it-services-revenue-model-faces-a-reset-544547-2026-07-23).
- Caveats preserved:
  - Most capex, backlog and off-balance-sheet figures are secondary press, not filings.
  - Big-4 historical capex ratios and the 2022-23 cuts are from memory of 10-K lines, not re-read.
  - Labor-share recession behaviour is from memory of the BLS series.

```json
{"q1": {"A": 30, "B": 36, "C": 29, "D": 5},
 "q2": 18, "q3": 68,
 "q4": {"p10": 225, "p50": 370, "p90": 700},
 "q5": 6,
 "q6": {"p10": 48.7, "p50": 51.4, "p90": 54.0},
 "q7": 18}
```
