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

```json
{"q1": {"A": 24, "B": 42, "C": 30, "D": 4},
 "q2": 16, "q3": 66,
 "q4": {"p10": 215, "p50": 355, "p90": 650},
 "q5": 8,
 "q6": {"p10": 50.2, "p50": 52.4, "p90": 54.6},
 "q7": 11}
```
