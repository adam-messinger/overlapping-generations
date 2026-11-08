# E4 labor-distribution / premortem (A5, Wave 2, red team)

**BLUF.** All three Wave-1 seats assumed that the yardstick for Q6, the BLS percent labor share, keeps the same definition through 2030. It will not. BEA plans to start counting own-account data as investment in its **2028 comprehensive update**. That adds to measured business output and leaves compensation unchanged, so the published share would step down by about 0.3-0.8pp before anything real happens. My Q6 is therefore lower and wider than the effort's: **P10 48.6 / P50 51.4 / P90 54.4**. On Q7 the Wave-1 seats bounded the decline by the aggregate's growth-phase record (worst three years: -4.2%). The physical limit is set by attrition instead: about 12-14% of staff leave each year, so a hiring freeze alone shrinks a firm by double digits. I price the Yes world at **13**, roughly double outside-view and signals.

Lens: premortem only. I attack the effort's Wave-1 reasoning (outside-view, fermi, signals) on both tails and then give my own numbers. I did not read other efforts' files.

---

## 1. The shared assumption none of them questioned

**Assumption: "The Q6 resolver is a fixed ruler. Only the economy moves the number."**

Each Wave-1 seat models the 2030 value as the current level plus a drift, an AI increment, a cyclical term and a symmetric revision term:

- **Outside-view** converts the FRED index to percent and applies the historical 4-year change distribution. That implicitly treats the 1947-2026 definitional history as stationary.
- **Fermi** carries a "revision to first print" term with **mean 0, sd 0.45pp**.
- **Signals** notes that annual NIPA updates move levels "by up to about 0.5pp", but treats that as noise.

None of them noticed a scheduled, signed definitional break that falls inside the resolution window:

- BEA says it will capitalize data "**an improvement we plan to introduce with the next comprehensive update of GDP and its major components in 2028**" ([BEA blog, 20 Apr 2026](https://bea.gov/news/blog/2026-04-20/when-are-data-and-tractors-treated-same-economic-accounting)). The blog gives no dollar size.
- BEA's research spotlight says capitalization "expands the production boundary and affects gross fixed capital formation, consumption of fixed capital, net stock, value added, and capital services" and "raises measured value added and growth" ([BEA Research Spotlight, May 2026](https://apps.bea.gov/scb/spotlights/2026/0526-capitalizing-own-account-data.htm)). Its caveats, verbatim:
  - the estimates are "experimental economic statistics intended to preview implementation, gather feedback";
  - there are "ongoing discussions around asset-boundary choices, occupation involvement rates, pseudo-output prices, and depreciation profiles";
  - the views "do not necessarily represent the U.S. Bureau of Economic Analysis."
- The experimental series covers 1997-2024 ([BEA working paper](https://bea.gov/research/papers/2026/toward-economics-statistics-own-account-data-and-databases-assets-1997-2024)). I could not read the level of own-account data investment from the page; the figures sit in a data-appendix spreadsheet.

**Mechanism.** The BLS labor share is "labor compensation divided by current-dollar output", where output is BEA "gross value-added output" ([BLS MLR 2017](https://www.bls.gov/opub/mlr/2017/article/estimating-the-us-labor-share.htm)).

- Own-account data assets are valued at sum of costs. Capitalizing them raises business value added by D, the value of the data produced.
- The intermediate inputs used to produce the data were already deducted, and the data workers' pay is already in compensation. So the numerator does not change.
- Result: ΔLS ≈ -LS x D/VA.

**Size.** This is my estimate, with wide bounds.

- Statistics Canada's broader data, databases and data-science measure ran at roughly 1.3-1.8% of GDP in 2018. That is from memory and includes purchased data.
- For the US own-account slice I take D ≈ 0.6-1.5% of nonfarm business value added in 2030. That makes **ΔLS ≈ -0.3 to -0.8pp, central -0.5**, and the AI-era growth of data work pushes it up.
- P(implemented before the Feb-2031 first print of 2030Q4) ≈ 0.75. BEA budget and staff cuts could delay it, but the 2025 SNA global window (2029-30, per the [IMF/UN implementation strategy](https://www.imf.org/-/media/files/data/statistics/bpm6/approved-guidance-notes/implementation-strategy-for-2025-sna-bpm7-final-version.pdf)) still falls before the resolution date.
- **Expected level shift: about -0.4pp**, with all of it on one side.

**Precedent.** BEA capitalized R&D and entertainment originals in the 2013 comprehensive update. Koh, Santaeulàlia-Llopis and Zheng (2020, *Econometrica*, "Labor Share Decline and Intellectual Property Products Capital") attribute much of the measured long-run decline in the BEA-based labor share to intellectual-property capitalization. That is from memory; I did not re-verify it this session. A boundary change is how this series has moved before.

**Why this matters for the vintage rule.** Q6 resolves on the first publication that contains calendar-2030. That will be a post-2028-update vintage. The question quotes 52.8 as "scale", but the resolver does not re-base. A 2030 print that looks like "-2.4pp" may be -1.9pp of economics plus -0.5pp of accounting.

---

## 2. Attacking the simulation's closure (fermi seat)

The fermi seat used the model correctly on levels: it refused them. It did, however, take a **timing** claim from the model: "the effect is back-loaded ... most of the transfer [lands] after the Q6 resolution year." That claim comes from the model's closure, not from evidence.

- In `src/modules/capital.ts` (`calculateFirmCircuit`), capital's income share is `alpha + automationIncomeToCapital x (1 - alpha) x max(0, automationLaborShareChange)` on market output, and labor compensation is the remainder. With `alpha` fixed, **the model's labor share cannot move at all except through the robot/AI worker-equivalent count.** It has:
  - no markups,
  - no sectoral composition,
  - no depreciation wedge (its share is on market output, not BLS gross value added),
  - no measurement.
- The timing of the automation count comes from the deployment rule: marginal value against marginal cost, scaled by integration costs `(N/anchor)^theta`. CLAUDE.md calls `robotIntegrationExponent` "theta, judgment" and says the AI payoff is off by default.
- So "-0.1pp by 2030, -14pp by 2036" is a parameter choice about diffusion speed. It tells us nothing about when a US gross-output ratio moves.
- What drove the observed 2022-26 fall of about 3pp:
  - composition toward low-labor-share tech, energy and finance value added;
  - the depreciation share of gross output;
  - price shocks running ahead of nominal pay (tariff pass-through in 2025, an oil shock in 2026, real hourly compensation -1.9% in Q2).

  **None of these exists in the model.** The model's -0.11pp baseline is not a weak signal; it says nothing about those channels.

**Verdict.** Discard the "back-loaded" inference. Keep the fermi seat's composition arithmetic (-0.4 to -0.55pp), which does not depend on the model. That arithmetic is itself conservative. If AI and cloud value added grows by about $0.6T by 2030 (about 2.3% of business output) at a labor share of about 0.15, the effect is about -0.9pp, not -0.5.

---

## 3. Q6 premortems (both tails)

### Downside tail: "It printed 48.5 and we all said 51.5"

The story, told from 2031:

- The 2028 comprehensive update capitalized data: -0.6pp across the whole series.
- Hyperscaler and neocloud capex held near $1T a year. AI and cloud value added, with labor share near 0.15, grew to about 3% of business output: composition -1.1pp.
- White-collar substitution kept nominal pay growth near 3% while productivity ran 2.5-3%/yr. Real hourly compensation trailed productivity by about 1pp/yr: -0.5pp/yr, or -2.0pp over four years. This is the 2025-26 pattern repeated. Indeed Hiring Lab's productivity index stands at 116 against real compensation at 107.3 since Q4 2019 ([Hiring Lab](https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/)). Its caveats, verbatim: "Productivity growth can be very noisy quarter-to-quarter"; "an AI-driven sea change in efficiency gains has not yet shown up clearly in the data".
- There was no recession: the AI boom carried demand.

53.0 - 0.6 - 1.1 - 2.0 + 0 = **49.3**. Add a bad revision draw and 48.5 is a 1-in-10 world, not a 1-in-50 world. The outside-view seat put P10 at 50.0 because it treats definitional history as stationary. Its "largest 4-year fall, -4.1pp" is a statistic about a series that has been redefined several times.

Errors Wave-1 made here:

- **Scope insensitivity.** The fermi seat's AI-excess term (-0.55 median) is the same size whether Big-4 capex is $700B or $2T. Its own Q1 gives C plus D about 21%, and in that world composition alone is -1pp or more.
- **Narrative coherence.** The fermi seat's "z-factor" ties a strong-AI world to no recession. That is coherent, but it means the left tail **compounds**: no countercyclical bounce, deeper composition, faster substitution. A 200k-draw Monte Carlo with a lognormal sd of 0.8 on one term does not capture three channels breaking the same way.

### Upside tail: "It printed 55 and we all said 51.5"

The story, told from 2031:

- The Fed hiked into 2026 (3.75-4.00%, two dissents for more; [FOMC 28 Oct 2026](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm)) with the 10-year above 5%.
- Hyperscalers turned free cash flow negative and financed capex externally (signals seat: Alphabet Q3 FCF -$9.1B, Amazon TTM -$42.4B).
- In 2028-29 the AI capex cycle broke (Q1 regime A) and took a mild recession with it. Profits fell faster than sticky compensation. Every post-war recession lifted the share, to 58.9% in 2020Q2 ([BLS TED](https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm)).
- Tight labor supply amplified the bounce. Net immigration collapsed in 2025-26, and unemployment is 4.1% even after +165k payrolls in October ([AP via ABC](https://abc30.com/story/us-employers-added-surprising-165000-jobs-october-unemployment-rate-dipped-41/20020018/); preliminary; U-6 rose 7.6% -> 7.9%; wages +3.1% y/y, still trailing inflation).
- The price-shock component reversed: IEEPA tariffs were struck down on 20 Feb 2026, with refunds of up to $175B under litigation ([Penn Wharton](https://budgetmodel.wharton.upenn.edu/p/2026-02-20-supreme-court-tariff-ruling/)). Tariff pass-through had sat in the denominator; my reading is that taxes on production and imports are inside BEA value added, which the BLS method page does not state, so treat this as unverified. Oil retraced.
- BEA's data capitalization slipped past 2030.

53.0 - 0.8 (structural drift) + 2.0 (recession) + 0.3 (price reversal) + 0 (no boundary change) = **54.5**.

Errors Wave-1 made here:

- **Drag/pull asymmetry.** Signals and fermi both extrapolate the last 12-28 months, a window that contains a tariff shock, an oil shock and a hiking cycle: three price-level shocks that historically fade from the ratio.
- The record-low subclass (outside-view) splits evenly between rebound and continuation. Wave-1 medians all sit on the continuation branch.

### Q6 pricing (own numbers)

| Component | Central | Notes |
|---|---|---|
| Start, 2026Q3 first print | 53.0 | BLS USDL 26-1631 |
| Structural non-AI drift, 3.9 yr | -1.0 | -0.25pp/yr; I take a little out of the 2025-26 pace for price shocks |
| AI composition plus displacement | -0.6 | left tail to -2.5 |
| Cycle | +0.45 expected | P(recession weighting 2030) ≈ 0.35, x about +1.5 to +2 |
| 2028 data capitalization | -0.4 expected | 0.75 x (-0.3 to -0.8); one-sided |
| Revision noise | 0, sd 0.45 | |

Median ≈ 51.4. The left tail compounds (boundary change, composition and no recession arrive together), so P10 is 48.6. The upside is a recession with no boundary change, so P90 is 54.4.

**Q6: P10 48.6 / P50 51.4 / P90 54.4.**

The interval is wider than every Wave-1 seat's on the downside and roughly matches signals on the upside. The median is close to the fermi seat's, but for a different reason: the boundary change replaces about half of the cyclical offset.

---

## 4. Q7 premortems (both tails)

Requirement: the combined big-5 headcount at 31 Mar 2029 must be ≤ about 1,377,000. From the September 2026 level of 1,549,471 that is **-11.1% in 10 quarters**.

### Yes tail: "The modal 'No' was wrong"

**The shared assumption here is a physical bound taken from history.**

- Outside-view and fermi both cite "worst year -4.2% (FY24)" as a ceiling on how fast the aggregate can shrink. That is a statistic from a **growth-phase** reference class. It is not a physical limit.
- The physical limit is attrition. At 12-14% voluntary attrition (Wipro "attrition eases to 14%", per the [Business Today](https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16) headline), about 190-210k people leave the five firms each year.
- If fresher and lateral intake is cut to half of replacement for six quarters, headcount falls about 10% **with zero layoffs**. Indian IT shrinks by not hiring.
- FY24's -4.2% came from a modest demand dip while attrition was *falling* from above 20%. It shows a policy choice, not a capacity limit.

The 2027-29 story:

1. **AI deflation reaches renewals.** Kotak's base case is "3.5 per cent pricing erosion, first surfacing through renewals of large multi-year contracts"; HCLTech put industry AI deflation at 3-5% ([Tribune / Kotak](https://www.tribuneindia.com/news/business/it-services-growth-to-stay-range-bound-at-3-per-cent-as-ai-deflation-pressures-margins-mid-tiers-better-placed-says-kotak/)). Pricing is moving "away from billing for the number of people deployed" ([Business Today, Jul 2026](https://www.businesstoday.in/technology/artificial-intelligence/story/ai-deals-grow-but-indias-it-services-revenue-model-faces-a-reset-544547-2026-07-23)). Counter-evidence, also from the search summary: a CLSA report (March 2026) "found no evidence of increased deflation in renewal contracts".
2. **Clients insource.** GCCs added "nearly 200,000 net employees in fiscal 2026, almost twice the 110,000 added by IT services firms" (TeamLease Digital via ET, as summarised by [NewsBytes](https://www.newsbytesapp.com/news/business/indias-gccs-added-nearly-200000-net-employees-outpacing-it-services/tldr)). Caveat: part of GCC growth is new AI capability, not work moved away from vendors.
3. **The Q1 regime-A world.** The AI-capex bust brings a 2028 US recession and a cut in discretionary IT spend, as in 2023-24 but with the deflation stacked on top.

In that world USD revenue falls 2-4% a year while revenue per employee rises 4-5% a year. That is -6 to -9% a year, which crosses the threshold by FY29 Q4.

**The Wave-1 conjunction error ran backwards.** Fermi required "FY24 repeated three times in a row". From September 2026 only two fiscal years remain, and attrition-driven contraction compounds within a year. It does not need three separate shocks.

### No tail: why Yes is still the minority

- **Momentum is the wrong way.** The aggregate was +19,398 in H1 FY27. TCS onboarded about 24k freshers in H1, and Infosys holds a 20k target.
- **Drag asymmetry.** There is political and reputational resistance to visible cuts. TCS's 2025 cut of about 12k (about 2%) drew state labour-department scrutiny. Management prefers bench and pyramid flattening, which is slower.
- **Acquisitions.** The resolver counts reported headcount. HCLTech and TechM buy firms, which pushes the March 2029 figure up.
- **Offshoring pull.** A US recession plus the H-1B fee raises the offshore share of delivery, which supports India-based headcount.
- **AI deflation may be a 2-3 year phase** before "new AI implementation work" arrives (Kotak's own framing).

### Q7 pricing

- P(2027-28 demand shock: US recession or AI-capex bust that cuts discretionary IT) ≈ 0.30. Given that shock, P(aggregate -11% from Sep 2026 by Mar 2029) ≈ 0.33. That gives 0.10.
- No-shock structural path (flat revenue, revenue per employee +5-6%/yr, hiring freeze): about 0.05 x 0.7, or 0.035.
- Acquisition drag: -0.5pp.

**Q7: 13.**

---

## 5. The other five questions (premortem pass, E4 lens)

### Q1 (Big-4 capex, R = 2030/2026)

Wave-1 ranged from A 52 (outside-view) to C 38 (signals).

- **Outside-view's error is a reference-class mismatch.** It counts "sector after a ≥50% year". But 2027 consensus is about $935B (+30%; [Luminix](https://www.useluminix.com/reports/industry-analysis/hyperscaler-capex-q3-2026), aggregator), so regime A needs a peak-to-trough fall of more than 25-30% from a 2027-28 peak. Telecom did -46% over 2000-02, so A is plausible, but that is a two-step conjunction (peak, then crash) and outside-view priced it as one step.
- **Fermi's error is a scope error on its own walls.** Its walls (cash, depreciation, power) argue against D. They do not argue against C. Its intensity 0.30 for 2030 assumes partial normalization, which is the same mean reversion the signals rejected.
- My pricing:
  - P(bust that takes 2030 below the 2026 cash base) ≈ 0.24;
  - P(plateau at $0.7-1.4T) ≈ 0.40;
  - P(sustained growth) ≈ 0.29;
  - P(D, ≥ about $2.8T) ≈ 0.07. That needs about $1.5T a year of external finance; possible only if the "Washington backstop" is real.

### Q2 (Epoch training cost ≥ $10B, published by 2028)

- **Fermi's 9 rests on an arithmetic slip.** It set C0 = $0.55B "as of mid-2026", but that figure is Grok 4 (mid-2025). Then it compounded only 2.2 years at 2.6x. From mid-2025:
  - at Epoch's 2.4x, the run reaches $10B at about end-2028;
  - at Epoch's current headline of 3.5x (90% CI 2.8x-4.4x; [Epoch Trends](https://epoch.ai/trends)), it reaches about $35B.
- The honest No-world is different. GPT-5 used *less* training compute than GPT-4.5 ([Epoch](https://epoch.ai/gradient-updates/why-gpt5-used-less-training-compute-than-gpt45-but-gpt6-probably-wont)), so frontier spend may be shifting to RL and inference. Closed labs also disclose little, so Epoch marks costs unknown, and Epoch reports constant (2023) dollars.
- **Physical check.** A 1 GW GB200-class site running for six months amortizes to about $3-5B. $10B needs 2-3 GW dedicated to one run, which is plausible only at the end of 2028.
- **Q2: 24.**

### Q3 (all ten top LMArena organizations US/PRC)

- **Shared Wave-1 blind spot: geography ambiguity, not capability.** Several Chinese labs now sit under offshore listed parents (Hong Kong listings; Cayman parents), and some Chinese-founded agent firms have re-domiciled to Singapore. Under "headquarters (ultimate parent)" a Singapore- or HK-headquartered entry fails the question even if no European lab rises.
- **Mistral.** Large 4 is seventh among open models; P(top-10 organization) ≈ 0.08.
- **Sovereign programmes** (Korea, Japan, Gulf, India): about 0.06 combined.
- **Label or HQ reassignment:** about 0.05.
- **Q3: 81.**

### Q4 (DefiLlama stablecoins, end-2028)

- The supply is falling: about $290-294B against the $322B May peak. The GENIUS yield ban is routing cash to tokenized money-market funds, which DefiLlama does not count.
- **Every Wave-1 seat's P50 assumes a crypto-cycle recovery.** The No-growth world is the 2022-23 pattern: -26%, a stall, and bank-issued tokens that DefiLlama classifies outside "stablecoins". That puts P10 near 215.
- The upside is payments integration plus the 2028 halving bull run.
- **Q4: 215 / 345 / 650.**

### Q5 (Fed numerical yield ceiling, ≥ 1-year maturity, before 2031)

- **Wave-1 shared assumption: YCC needs a crisis that the Fed chooses to answer this way.** The underweighted path is institutional capture.
  - The 10-year is above 5% and mortgage affordability is a 2028 election issue.
  - The Treasury already runs yield-motivated buybacks ([CNBC](https://www.cnbc.com/2026/08/19/bessent-treasury-buybacks-yields-warsh-fed.html)).
  - A Board that the White House can reshape by 2028.
- Paths:
  - Recession with ZLB and front-end YCC: about 2.5%.
  - Bond-market or fiscal stress with an aligned Board: about 3.5%.
  - War financing, the 1942 precedent (a Taiwan or Iran escalation): about 1.5%.
  - Explicit-number front-end guidance: about 1%.
- Each path still needs an *announced number*. The Fed's stated preference (Warsh) is a smaller balance sheet tilted to bills, which works against it.
- **Q5: 9.**

---

## 6. Coherence checks

1. **Q1-A is coupled to Q6's upside and Q7's Yes.**
   - A bust raises the labor share (recession) and also raises the Indian IT Yes (discretionary cut).
   - Q6 P90 (54.4) and Q7's 13 both draw on the same 24% A-world, and I priced each conditionally on it.
2. **Q1 C/D is coupled to Q6's downside.** The 36% C+D mass drives the 48.6 P10 through composition. In that world Q7's Yes runs only through AI deflation (about 3.5pp of my 13).
3. **The Q6 boundary change is independent of the economy.** It shifts the whole distribution down by about 0.4pp and is not a tail event.

## Sources

- BEA blog, 20 Apr 2026 (data capitalization in the 2028 comprehensive update): https://bea.gov/news/blog/2026-04-20/when-are-data-and-tractors-treated-same-economic-accounting
- BEA Research Spotlight, own-account data: https://apps.bea.gov/scb/spotlights/2026/0526-capitalizing-own-account-data.htm
- BEA working paper, own-account data and databases 1997-2024: https://bea.gov/research/papers/2026/toward-economics-statistics-own-account-data-and-databases-assets-1997-2024
- IMF/UN 2025 SNA-BPM7 implementation strategy: https://www.imf.org/-/media/files/data/statistics/bpm6/approved-guidance-notes/implementation-strategy-for-2025-sna-bpm7-final-version.pdf
- BLS MLR 2017, "Estimating the U.S. labor share": https://www.bls.gov/opub/mlr/2017/article/estimating-the-us-labor-share.htm
- BLS TED, labor share 52.8% in 2026Q2: https://www.bls.gov/opub/ted/2026/labor-share-at-its-lowest-level-52-8-percent-in-second-quarter-2026.htm
- BLS Productivity and Costs Q3 2026 (via the Wave-1 packet): https://www.dol.gov/newsroom/economicdata/prod2_11052026.pdf
- Indeed Hiring Lab, Q3 2026: https://hiringlab.indeed.com/2026/11/05/q3-2026-productivity-and-costs/
- FOMC statement, 28 Oct 2026: https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm
- October 2026 jobs (AP via ABC): https://abc30.com/story/us-employers-added-surprising-165000-jobs-october-unemployment-rate-dipped-41/20020018/
- Penn Wharton, IEEPA ruling and refunds: https://budgetmodel.wharton.upenn.edu/p/2026-02-20-supreme-court-tariff-ruling/
- Kotak on AI deflation (Tribune): https://www.tribuneindia.com/news/business/it-services-growth-to-stay-range-bound-at-3-per-cent-as-ai-deflation-pressures-margins-mid-tiers-better-placed-says-kotak/
- Business Today, IT revenue-model reset: https://www.businesstoday.in/technology/artificial-intelligence/story/ai-deals-grow-but-indias-it-services-revenue-model-faces-a-reset-544547-2026-07-23
- GCC net additions FY26 (NewsBytes, citing TeamLease/ET): https://www.newsbytesapp.com/news/business/indias-gccs-added-nearly-200000-net-employees-outpacing-it-services/tldr
- Wipro attrition (Business Today): https://www.businesstoday.in/technology/story/wipro-adds-135-employees-in-q4-attrition-eases-to-14-526016-2026-04-16
- Luminix hyperscaler capex Q3 2026: https://www.useluminix.com/reports/industry-analysis/hyperscaler-capex-q3-2026
- Epoch Trends: https://epoch.ai/trends ; Epoch on GPT-5 compute: https://epoch.ai/gradient-updates/why-gpt5-used-less-training-compute-than-gpt45-but-gpt6-probably-wont
- CNBC on Treasury buybacks: https://www.cnbc.com/2026/08/19/bessent-treasury-buybacks-yields-warsh-fed.html
- Model closure: `src/modules/capital.ts`, `calculateFirmCircuit` (labor share = market output less `alpha` plus the automation-income share)

Figures marked "from memory" (the StatCan data-investment share; Koh-Santaeulàlia-Llopis-Zheng 2020) were not re-verified this session. The size of the data-capitalization shift is my estimate, not a BEA number.

```json
{"q1": {"A": 24, "B": 40, "C": 29, "D": 7},
 "q2": 24, "q3": 81,
 "q4": {"p10": 215, "p50": 345, "p90": 650},
 "q5": 9,
 "q6": {"p10": 48.6, "p50": 51.4, "p90": 54.4},
 "q7": 13}
```
