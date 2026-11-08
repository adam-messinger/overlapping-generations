# E3 (dollar-monetary) x premortem (A5, Wave 2, red team)

**BLUF.** E3's Wave-1 seats share a frozen-regime assumption: each priced the seven questions
as separate draws around the November 2026 snapshot (Fed hiking, 5% long yields, crypto
bear, stablecoins stalled). The window runs to 2028-2030, long enough for at least one full
rate cycle, and the most likely way the snapshot breaks (an AI-capex bust, then a recession,
then cuts) moves Q1, Q4, Q5, Q6 and Q7 together. Repricing both tails gives the following
changes:

- **Q5 goes down to 4.** The Wave-1 seats priced it off conditional probabilities that the one
  US natural experiment (June 2020) and the reference class's own exits contradict.
- **Q4 is wider on both sides:** P10 215, P50 365, P90 820.
- **Q1 moves mass into A.**
- **Q3 moves well above outside-view's 45 but below 83-86.**

Forecast origin 2026-11-08. Pulls dated that day unless stated.

---

## 1. The shared assumption none of the three seats questioned

**"The resolution dates inherit today's monetary regime, and the questions are roughly
independent."**

- **Signals** reads the Fed's hikes, the yield ban and 5% bills as a lasting headwind on Q4,
  and "nothing observable points to a numerical yield peg" on Q5.
- **Fermi** uses the same snapshot as the conditioning state for its Q4 rate-headwind
  component, for Q5's "a yield cap is the most inflationary tool ... exactly what a hawkish
  chair was appointed to avoid", and for Q1's "that financing is expensive". It then declares
  Q1 and Q4 "mostly independent".
- **Outside-view** is mechanism-free by mandate, but it inherits the snapshot through its
  arithmetic: a Q4 growth rate taken off the post-GENIUS realised pace, and a Q6 start level
  (see Q6 below).

**Why the assumption is fragile.** The Fed raised to 3.75-4.00% on 2026-09-16, its first hike
since 2023, with 16 of 19 participants expecting at least one more this year
([Al Jazeera](https://www.aljazeera.com/news/2026/9/16/what-to-know-about-us-federal-reserves-first-interest-rate-hike-in-3-years),
[The Star/Reuters](https://www.thestar.com.my/business/business-news/2026/09/17/fed-hikes-rates-sees-more-tightening-in-search-of-039timelier039-drop-in-inflation)).
Sources conflict on the vote: most report 12-0, and Trading Economics reports three hawkish
dissents. Policy rates are therefore early in a tightening cycle. At the same time:

- the VIX had a top-three one-day jump on Nov 5;
- Bitcoin fell below $76K, "down nearly 40% for the year"
  ([Stocktwits](https://stocktwits.com/news-articles/markets/cryptocurrency/mstr-bmnr-crcl-coin-stocks-tumble-bitcoin-breaks-76-k-wiping-out-1-b-crypto-bets/cNG1sepR94N),
  [Cointelegraph](https://cointelegraph.com/news/bitcoin-price-crashes-7-week-low-stocks-election-gains));
  these are secondary sources;
- Big-Tech free cash flow has turned negative at Amazon.

This is the 1999-2000 configuration: the Fed hiked from June 1999 to May 2000 into a
capex-led equity boom, and then cut 475bp in 2001. US hiking cycles do not survive two-year
horizons. Over 2026-2030 the policy rate will almost certainly visit a level well away from
today's, and the direction of that move is the common factor behind five of the seven
answers.

| Latent world (to 2030) | P (mine) | Q1 | Q4 | Q5 | Q6 (2030) | Q7 |
|---|---|---|---|---|---|---|
| W1 Soft landing; regime roughly persists | 0.45 | B/C | ~$340-450B | ~1% | ~52-53 | low |
| W2 AI-capex bust, recession, cuts toward the ELB by 2028-30 | 0.30 | **A** | bimodal: crypto crash first, then cheap money lifts supply | **higher** (the only post-war YCC starts were at the ELB) | higher in a 2029-30 recession, lower after one | **higher** |
| W3 Inflationary fiscal dominance (10y > 6%, disorderly auctions) | 0.15 | B | low (opportunity cost), unless debasement demand appears | higher (essay's path) | lower (real-wage squeeze) | low |
| W4 Boom continues (essay's line) | 0.10 | C/D | high | ~0 | lower | higher |

**What breaks.** Treating the questions as independent around W1 commits conjunction neglect
in reverse: the tails are positively correlated, so each marginal tail is fatter than a
snapshot-centred seat prices it. The E3 calibrator should check joint coherence across Q1, Q4,
Q5 and Q7, not just each marginal.

## 2. Attack on the simulation closure (fermi leaned on it for Q1, Q5 and Q6)

The adapter's own disclosure says: "NO MONETARY BLOCK: no price level, no Fed, no yields, no
stablecoins. 'financialRepression' is a real-rate lever on the world safe rate; fiscal
dominance triggers only above 150% WORLD public debt/GDP"
(`adapter-output.md`). In the code that threshold is `repressionDebtThreshold: 1.5`
(`src/modules/capital.ts`), which CLAUDE.md labels "judgment". The model's repression is then
a silent cap on the real safe rate at trend growth less 3pp (`capital-finance.ts`).

- **Q5: the model cannot produce the resolving event in any parameterisation.** Its
  repression is the 1945-80 UK kind: unannounced and implicit. Q5 excludes exactly that and
  requires a *numerical announced* level. Its trigger is a world aggregate (0.89 in 2030)
  where the relevant state is the US: debt held by the public is ~100% of GDP, and net
  interest is above $1T per Signals' Fortune citation. It has no term premium, so it cannot
  represent the bond-vigilante episode that is the main path to Yes.
  - Fermi read "the model alone would put me at ~3-4%" and then adjusted up to 7. That is
    anchoring and adjustment on a number with a likelihood ratio of exactly 1: the model's
    "no" is true in every world.
  - The right use is none at all.
- **Q1: circular corroboration.** The model's world datacenter capex grows ~13%/yr because
  of a willingness-to-pay ceiling on the datacenter power bill
  (`dataCenterPowerSpendCeiling`, 0.05% of GDP) and because it has no stock market or lab
  race. "Corroboration that the fundamentals-led pace sits in B" is therefore the ceiling
  parameter reporting its own value. It is uninformative about the A tail too: the model
  cannot bust, because it has no expectations to disappoint.
- **Q6: the parameter is the answer.** The baseline's -0.11pp comes from AI cognitive payoff
  being *off by default* (`aiWorkerEquivalentPerTWh = 0`). Fermi's AI component (-0.6pp,
  range 0 to -2) is a judgment about which run is true, presented as a model range. Choosing
  among the runs *is* the question.

**Verdict.** On these three questions the simulation contributes sign at most. Fermi's
numbers survive only where its non-model arithmetic carries them (Q2, Q4, Q7).

## 3. Named failure modes in the Wave-1 packet

- **Herding within the effort on Q4.** The three P50s sit within $40B of each other (370 /
  390 / 410), and the P90s span 680-740. All three share one driver, the 2026 stall, so the
  agreement is one observation counted three times. Every one of them sits below JPMorgan's
  sceptic forecast of $500-600B by 2028, quoted by Signals. That forecast predates the stall,
  but it shows the band's upper edge was set by the snapshot, not by the class.
- **Narrative coherence mistaken for likelihood on Q5.** Fermi's four paths sum to 8.2%, but
  each conditional is a story-weight. Path 3 (ELB, then YCC on 2-3y tenors) at 0.15 is
  contradicted by June 2020: the ELB, debt above 100%, an acute crisis, and a staff briefing
  on yield caps produced no cap. Minutes: "nearly all participants indicated that they had
  many questions regarding the costs and benefits", and "it was not clear that there would be
  a need for the Committee to reinforce its forward guidance"
  ([FOMC minutes, June 2020](https://www.federalreserve.gov/monetarypolicy/fomcminutes20200610.htm)).
  A couple of participants favoured a short-to-medium cap "as a powerful commitment device".
  That minority is the honest size of path 3.
- **Ignored drag in the reference class.** Outside-view's ~0.5-2% per issuer-year counts the
  BoJ and RBA as live members. Both have since repudiated the tool:
  - The RBA board "views the probability of using a yield target again in future as low",
    after an exit that "caused some reputational damage"
    ([RBA Review of the Yield Target, 2022](https://www.rba.gov.au/monetary-policy/reviews/yield-target/)).
  - The BoJ abandoned YCC in March 2024 after two forced band-widenings.
  - The class is learning against the tool, so forward-looking rates belong at or below the
    historical rate, not above it.
- **Anchoring on the essay's framing (Q5).** The essay's route is "even if Congress has to
  change its mandate". Democrats won both chambers on 2026-11-03 (Signals, OPB/NPR), which
  closes that route before January 2029. SCOTUS held 5-4 on 2026-06-29 that Fed governors'
  for-cause protection is constitutional and needs notice and a hearing
  ([SCOTUSblog](https://www.scotusblog.com/2026/06/court-prevents-trump-from-firing-fed-governor/),
  [CRS LSB11449](https://www.everycrsreport.com/reports/LSB11449.html); a stay ruling, merits
  open). That closes the fast Board-capture route. Neither Wave-1 seat priced either fact
  into its Q5 path table.
- **The substitute nobody counted (Q4 x Q5).** The tools Treasury is actually using are long-end
  buybacks, a shift to bills, Bessent's August intervention after the 30y hit a 19-year high
  ([CSMonitor](https://www.csmonitor.com//Business/2026/0828/warsh-bessent-inflation-economy)),
  and stablecoin T-bill demand. All of these are *substitutes* for a Fed cap, and all are
  excluded by Q5. The essay's own Neo-Dollar mechanism lowers Q5: every dollar of captive
  stablecoin bill demand is pressure a yield cap no longer has to absorb.
- **Scope insensitivity on Q3 (outside-view).** A Lindy estimate of 26-45% ignores that the
  current cushion is 20 US/PRC organizations ahead of the first outsider, ~48 rating points
  clear. A violation needs a non-US/PRC lab to pass ten US/PRC labs, not one.
- **Stale baseline on Q6 (outside-view).** Its start of ~52.6 scales the FRED index to the
  pre-revision 52.8. The Nov-5 release revised Q2 to 53.3 and printed Q3 at 53.0 (Signals,
  Fermi). The same method from 53.0 gives a P50 near 52.8, not 52.4.

## 4. Premortems, both tails, with my numbers

### Q4: stablecoins on DefiLlama, 2028-12-31 (centre of gravity)

DefiLlama API total, re-pulled: **$294.1B on 2026-11-08**
([stablecoincharts/all](https://stablecoins.llama.fi/stablecoincharts/all)). USDT $176.8B,
USDC $70.6B.

**Resolver note.** DefiLlama counts **BUIDL** (BlackRock's tokenized money fund, $1.76B) and
**YLDS** ($0.47B) as fiat-backed stablecoins
([stablecoins endpoint](https://stablecoins.llama.fi/stablecoins)). If the yield ban pushes
demand into tokenized yield-bearing funds, part of that substitution stays *inside* the
resolver. That weakens the rate-headwind argument all three seats used.

**Low-tail premortem: "It is 2029 and the dashboard reads $210B. Why?"**
- 2026 was the 2022 analog, and it ran longer:
  - In 2022-23, supply fell ~34% peak-to-trough over ~18 months. Some of that was
    idiosyncratic: UST's collapse, BUSD ordered shut, USDC after SVB.
  - From the May-2026 peak of $317B, -30% is ~$220B by late 2027.
- The Fed kept hiking into 3.7% PCE, so bills paid 4.5-5% against a token with the yield ban
  locked by the OCC final rule.
- USDT's US distribution closed on 2028-07-18 for lack of a comparability determination
  ([CryptoSlate](https://cryptoslate.com/treasury-just-put-a-deadline-on-offshore-stablecoins-access-to-us-customers/);
  sources disagree on whether foreign issuers get the full runway).
- USDT was already shrinking for "weaker speculative demand and money moving back into fiat"
  ([Whale Alert](https://whale-alert.io/stories/93da0118e97877/Tether-USDT-supply-falls-4-billion-in-60-days-as-crypto-demand-cools);
  secondary, no single cause established).
- The CLARITY rewards compromise never passed the remaining gates
  ([Baker McKenzie](https://blockchain.bakermckenzie.com/2026/05/05/the-clarity-acts-yield-compromise-what-the-senate-actually-agreed-to-and-why-it-matters/);
  Amina: "multiple legislative gates remain, each carrying meaningful passage risk").
- Supply is momentum-persistent and is currently accelerating downward: the steepest week of
  2026 was the week to Nov 7.
- Pricing: I give this world ~12% for a reading at or below $220B. The Wave-1 P10s
  (225-235) give it ~8-10%.

**High-tail premortem: "It is 2029 and the dashboard reads $850B. Why?"**
- W2 happened. The AI-capex bust pulled the Fed to ~1-2% by 2028, and the opportunity cost
  of a zero-yield dollar collapsed. In 2020-21 at zero rates supply rose ~6x in two years.
- GENIUS went live on 2027-01-18. Bank, fintech and card-network issuers scaled on a
  regulated rail.
- The April-2028 halving-year rally repeated 2024's +56%.
- CLARITY's activity-based rewards gave exchanges a legal yield-like wrapper.
- Tokenized-MMF growth was counted through BUIDL-type listings.
- $294B x 1.55^2.15 is ~$750B, and $850B needs ~60%/yr. That is below the 2024-25 realised
  pace from a bigger base, and well below Standard Chartered's and Bessent's $2T. I give
  >= $800B about 11%.

**Scenario mixture.** These are scenario weights:

| Scenario | Weight | Range |
|---|---|---|
| Cycle replay | 0.38 | ~$380B |
| Regulated take-off plus cheaper money | 0.25 | ~$620B |
| Prolonged winter | 0.27 | ~$270B |
| Shock | 0.05 | ~$170B |
| Essay world | 0.05 | ~$1.1T |

A lognormal mixture puts the P50 around $370-380B. I shade the P50 down to $365B for the
accelerating Nov-2026 outflow and the hiking Fed. The tails go wider on both sides, because
the latent rate path drives both of them.

**Q4: P10 215, P50 365, P90 820 ($B).**

### Q5: a numerical Fed yield ceiling or target on a >=1y Treasury before 2031 (centre of gravity)

**Yes-tail premortem: "It is December 2030 and the Fed has announced a 2-year yield target. Why?"**

| Path | P(trigger) | P(cap \| trigger) | Product | Basis |
|---|---|---|---|---|
| W2 to the ELB by 2029-30, then RBA-style short-tenor YCC to make guidance credible | ~0.20 | ~0.08 | ~1.6% | 0.08, not 0.15: June 2020 is the observed conditional, and a minority favoured it then |
| W3 bond crisis under fiscal dominance, then a joint Treasury-Fed "accord" with a named ceiling | ~0.15 | ~0.10 | ~1.5% | The new president from Jan 2029 and Warsh's chair term ending May 2030 open a short window. SCOTUS and a Democratic Congress close the faster routes. The 2020 and BoE-2022 playbook is purchases without a level |
| War finance | ~0.03 | ~0.2 | ~0.6% | |
| Other (a liquidity facility written as a price/yield backstop, a resolver dispute) | | | ~0.5% | |
| **Total** | | | **~4.2%** | |

**No-tail premortem: "Why might even 4 be too high?"** The current chair hikes and wants a
smaller balance sheet: a "reverse operation twist"
([National Mortgage News](https://www.nationalmortgagenews.com/articles/warsh-call-for-fed-treasury-accord-stirs-debate-in-30-trillion-bond-market)).
There is no official text naming a yield
([Fortune, 2026-11-01](https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/):
Brooks's "de facto accord" rests on buybacks, which are excluded). The Treasury already has
cheaper, excluded tools. The purest outside-view rate of ~0.7%/yr over 4.15 years is 3%. I
do not go to 2-3% because W2 and W3 together carry ~35% of the window, and the ELB is the
only setting in which post-war yield targets have started.

**Q5: 4.**

### Q1: Big-4 cash capex, 2030 / 2026

- **A-tail ("2030 is below 2026").** This is the E3 lens's home ground. The Fed is tightening
  into a capex boom financed increasingly off operating cash flow. Signals reports capex/OCF
  ~1.15, Amazon FCF at -$42B, the 10y above 5% in September, and Alphabet down ~10% on a
  capex guide. That is 1999-2000.
  - Telecom capex fell ~50% within three years of its 2000 peak.
  - 2026 is the analog of 1999, not 2000: 2027 is guided up ~25-30%. A peak in 2027 and a
    -35% fall by 2030 puts R near 0.85.
  - The SPV/JV/lease shift (Meta-Blue Owl-style structures) moves spending off the locked cash
    line, which biases measured R down even without a bust.
  - Fermi (22) and Signals (20) underweight this. Outside-view (50) overweights it: its class
    is mostly single-commodity manufacturers, not firms with ~$150B pre-AI maintenance bases.
- **C/D-tail.** W4: 2027 at +28% per the ~$935B consensus, then 15-20%/yr. Fermi's own
  denominator correction (~$665B cash) makes R >= 2 reachable at ~19%/yr. D needs cash capex
  near or above $2.7T, roughly the four firms' entire 2030 revenue, so it stays a thin tail.

**Q1: A 32, B 41, C 24, D 3.**

### Q2: an Epoch run >= $10B published by 2028-12-31

The real Yes risk is resolver risk. The "upfront" column already shows $10.7B for Grok 4
(Signals' audit), and the headline is in 2023 USD while the question asks for nominal.

- **No tail.** Coverage lag: 1 of 95 notable 2026 models has a cost.
- **Yes tail.** 1-2 GW single-site runs (Abilene, Colossus 2) in 2028 make an amortized ~$10B
  physically feasible. Fermi's power check holds up. A W2 bust cuts the run before it
  happens.

I keep Fermi's structure but raise its coverage factor slightly: the largest-ever run
reliably gets an Epoch data insight (Grok 4 did).

**Q2: 18.**

### Q3: LMArena top ten all US/PRC on 2028-12-31

- **No tail.** A sovereign-funded European, Gulf or Korean lab enters the top ten. A Chinese
  lab redomiciles HQ to Singapore, which counts as non-PRC under the ultimate-parent rule.
  The 10th-place tie (five at 1475) is adjudicated against the panel. Two years of churn add
  to all of these.
- **Yes tail.** Twenty US/PRC organizations sit ahead of Mistral today, and the compute gap
  widens. Mistral would have to pass ten labs.

Outside-view's 45 is scope-insensitive (see section 3). Fermi's 86 multiplies three
"independent" failure paths and leaves out the label/tie path's correlation with churn.

**Q3: 78.**

### Q6: BLS labor share, 2030 average

Start at the corrected 53.0 (2026Q3 preliminary).

- **Low tail (~49.5).** The AI productivity surge persists (Q3 productivity +3.6% annualized)
  with wages lagging, as in the essay. No recession lands in 2030.
- **High tail (~55).** W2's recession falls in 2029-30. The share rose +1.8 in 2001 and +2.4
  in 2020. The 2026 drop was partly a real-wage squeeze (Q2 real hourly compensation -1.9%
  annualized) that reverses as inflation normalizes.

Signals' six-quarter slope extrapolation (-0.65pp/yr) is recency. Outside-view's start is
stale.

**Q6: P10 49.7, P50 52.5, P90 55.0 (%).**

### Q7: Indian IT big-5 down >= 10%, Mar-2026 to Mar-2029

**The shared assumption to attack here is "the aggregate behaves like a sector, so it is
sticky".** Annual attrition at these firms runs low-to-mid teens (my recollection of company
disclosures, ~12-14% LTM; not re-sourced). On ~1.55M staff that is ~200k exits a year. A
twelve-month backfill freeze delivers the whole -10%. The constraint is a management choice,
not a friction, and AI-driven renewal deflation plus a W2 US recession is exactly the world
in which all five choose it together (correlation, not five independent draws).

- **No tail.** H1 FY27 +16k. GCC and AI-services hiring. INR weakness and the H-1B fee shift
  work back offshore. Acquired staff are added to the count.

Outside-view's 8 is drag-blind; Signals' 11 takes current telemetry for the whole path.

**Q7: 14.**

## 5. Note for the calibrator

- **Real hits:**
  - Q5's conditional probabilities (the 2020 minutes and the RBA review are data, not story).
  - The model's Q5/Q1/Q6 readings carry LR = 1.
  - Outside-view's Q6 start and Q3 scope.
  - Correlated tails via the rate path.
- **Merely posed:** the Q4 high tail rests on several things going right at once. I priced it
  at ~11% for >= $800B, not more.

## Sources

- DefiLlama stablecoins API: https://stablecoins.llama.fi/stablecoincharts/all ; https://stablecoins.llama.fi/stablecoins
- Fed hike, 2026-09-16: https://www.aljazeera.com/news/2026/9/16/what-to-know-about-us-federal-reserves-first-interest-rate-hike-in-3-years ; https://www.thestar.com.my/business/business-news/2026/09/17/fed-hikes-rates-sees-more-tightening-in-search-of-039timelier039-drop-in-inflation (vote reported 12-0 by most sources, three dissents by Trading Economics; unconfirmed)
- FOMC minutes, June 2020 (yield caps or targets): https://www.federalreserve.gov/monetarypolicy/fomcminutes20200610.htm
- RBA Review of the Yield Target (2022): https://www.rba.gov.au/monetary-policy/reviews/yield-target/
- Trump v. Cook: https://www.scotusblog.com/2026/06/court-prevents-trump-from-firing-fed-governor/ ; https://www.everycrsreport.com/reports/LSB11449.html (stay-stage ruling; the merits remain open)
- Warsh/Bessent accord debate: https://www.nationalmortgagenews.com/articles/warsh-call-for-fed-treasury-accord-stirs-debate-in-30-trillion-bond-market ; https://www.lpl.com/research/blog/imagining-a-modern-fed-treasury-accord.html ; https://fortune.com/2026/11/01/fed-chair-kevin-warsh-treasury-bond-yield-curve-control-debt-costs-inflation-interest-rates-gdp-growth/ ; https://www.csmonitor.com//Business/2026/0828/warsh-bessent-inflation-economy
- Crypto drawdown: https://cointelegraph.com/news/bitcoin-price-crashes-7-week-low-stocks-election-gains ; https://stocktwits.com/news-articles/markets/cryptocurrency/mstr-bmnr-crcl-coin-stocks-tumble-bitcoin-breaks-76-k-wiping-out-1-b-crypto-bets/cNG1sepR94N (secondary)
- USDT contraction: https://whale-alert.io/stories/93da0118e97877/Tether-USDT-supply-falls-4-billion-in-60-days-as-crypto-demand-cools ; https://cryptobriefing.com/tether-usdt-market-cap-falls-5-billion/ (secondary; causes not established)
- CLARITY yield compromise: https://blockchain.bakermckenzie.com/2026/05/05/the-clarity-acts-yield-compromise-what-the-senate-actually-agreed-to-and-why-it-matters/ ; https://eu.aminagroup.com/research/clarity-act-stablecoin-yield-rules-winners-losers-and-what-changes-next/
- GENIUS 2028 foreign-issuer deadline: https://cryptoslate.com/treasury-just-put-a-deadline-on-offshore-stablecoins-access-to-us-customers/ ; https://www.finextra.com/the-long-read/1470/the-genius-acts-impact-on-foreign-stablecoin-issuers (secondary; legal experts disagree on foreign-issuer timing)
- Model closure: `docs/forecasts/commanding-heights-2026/adapter-output.md` (disclosures), `src/modules/capital.ts` (`repressionDebtThreshold: 1.5`, `repressionDepth: 0.03`), `src/modules/capital-finance.ts`

```json
{"q1": {"A": 32, "B": 41, "C": 24, "D": 3},
 "q2": 18, "q3": 78,
 "q4": {"p10": 215, "p50": 365, "p90": 820},
 "q5": 4,
 "q6": {"p10": 49.7, "p50": 52.5, "p90": 55.0},
 "q7": 14}
```
