# Demographic Change × Artificial Intelligence — Coupled Forecast to Dec 31, 2036

**Tetlock / Good Judgment Project ensemble — 24 panelists, 4 orthogonal efforts, 3-wave DAG.**
Scope: OECD-38 + China, constant 2025 USD PPP. Generated 2026-11-04.
Primary baseline is the **unextremized raw mean (d = 1.0) and median**; Baron–Satopää
d = 1.35 appears only as a labelled secondary column.
Both runs are sealed for scoring in a hash-chained `forecast-workbench` ledger — see
[`SEALED.md`](SEALED.md); CQ1 is the exception, refused because it cannot resolve.

---

## BLUF

**The coupled world is a Bifurcated Barbell, and the two most popular stories about it
are both wrong.** The ensemble puts **50.3%** on CQ6-B — physical and care scarcity
coexisting with hyperscaler rents and white-collar compression, under steep real term
premia — against 14.4% for a broad productivity renaissance, 21.4% for a stagflationary
fiscal squeeze, and 13.9% for capital-concentrated stagnation. Coupled real GDP growth
over 2032–36 centres on **P50 1.87%/yr** (P10 0.98 / P90 2.82), and the G7 10-year
sovereign real yield on **P50 2.05%** (P10 0.94 / P90 3.26) — a world where *r* stays
comfortably above *g*. A second, independent 24-panelist run with a different roster and
scoped simulation access reproduced all of these to within a few points (see *Method sensitivity*).

**The headline casualty is the smooth-reallocation story.** The proposition that AI's
white-collar labour savings supply the workers elder care needs scores **5.0%** — the
lowest number anywhere in this exercise, with the tightest agreement (range 3–7%, σ 1.2pp).
CQ1, its operational form, scores **13.8%**.

**The single most consequential finding is not about AI at all.** CQ2's answer is
dominated by index construction, not macroeconomics: a *GDP-weighted OECD-38* core
aggregate under a PPP lock carries Türkiye at ~4–5% weight (core inflation 8–30%), plus
Mexico, Poland, Chile, Colombia and Costa Rica — worth **+0.25 to +0.81 pp** against a
2.50% threshold. All four efforts' auditors found this independently; two of three Wave-1
lenses in three separate efforts had priced a G7-shaped object against a question naming
all 38. It is the largest single driver of CQ2 **and** of the CQ6 C-versus-D split.

**Two caveats that bound every number below.** First, **CQ6-B is partly a drafting
residual**: the four regime definitions as written are not MECE, so this exercise imposed
a lexical-priority lock (A → C → D → B-as-residual), and Effort 3 reports that roughly
**34 pp of the distribution sits in cells with no literal home**. Do not read 50.3% as
50.3% confidence in the Barbell *narrative*. Second, **CQ1's second conjunct has no
published resolving series** — Eurostat SES is quadrennial with the 2034 vintage landing
after resolution, and OECD.Stat carries average annual wages, not sectoral real medians.

---

## Scorecard

### Binary questions

| CQ | Raw Mean (d=1.0) | Median | σ | Panelist Range | Effort Range | *log-odds d=1.0* | *Extremized d=1.35* |
|---|---|---|---|---|---|---|---|
| **CQ1** unemployment ≤5.5% **and** F+Q real wages beat J+K+M by ≥10pp | **13.8%** | **13.5%** | 4.8pp | 6–23% | 10–16% | *13.1%* | *7.2%* |
| **CQ2** OECD-38 core ≥2.50% **and** China CPI <1.50% | **35.6%** | **36.5%** | 9.1pp | 18–50% | 34–42% | *35.0%* | *30.2%* |
| **CQ5** MOVE ≥105 **and** a ≥25% equity drawdown with no bond rally | **28.0%** | **27.5%** | 6.0pp | 17–40% | 27–32% | *27.6%* | *21.4%* |

### Continuous questions (quantiles — never extremized)

| CQ | Ensemble Mean P10/P50/P90 | Ensemble Median | P50 σ | P50 Range | Effort P50 Range |
|---|---|---|---|---|---|
| **CQ3** coupled real GDP growth 2032–36, %/yr | **0.98 / 1.87 / 2.82** | 1.00 / 1.85 / 2.80 | 0.14 | 1.60–2.25 | 1.75–1.95 |
| **CQ4** G7 10y sovereign real yield 2032–36, % | **0.94 / 2.05 / 3.26** | 1.00 / 2.00 / 3.22 | 0.20 | 1.75–2.50 | 2.00–2.30 |

### CQ6 — end-state regimes at Dec 31, 2036

| Regime | Raw Mean | Median (renorm.) | σ | Panelist Range | Effort Range |
|---|---|---|---|---|---|
| **A** AI-Solvent Broad Productivity Renaissance | **14.4%** | 12.8% | 5.4pp | 9–33% | 12–18% |
| **B** Bifurcated Barbell Equilibrium | **50.3%** | 52.7% | 5.9pp | 34–63% | 48–60% |
| **C** Fiscal Dominance & Stagflationary Squeeze | **21.4%** | 21.3% | 5.8pp | 11–33% | 14–27% |
| **D** Capital-Concentrated Secular Stagnation | **13.9%** | 13.3% | 6.3pp | 5–34% | 7–14% |

Panelist medians summed to 94.0 before renormalization. Zero accounting-lock violations
across all 24 payloads.

Charts: [`chart_probabilities.svg`](run1-judgment-only/chart_probabilities.svg) ·
[`chart_intervals.svg`](run1-judgment-only/chart_intervals.svg) ·
[`chart_regimes.svg`](run1-judgment-only/chart_regimes.svg)

---

## Four findings that change how the question set should be read

**1. CQ2 and the C/D split are decided by a weight vector, not by inflation.** Covered in
the BLUF. Effort 3: "a resolvable factual gap, not a lens difference." Effort 4 priced
0.68 weight on the literal all-38 construction and notes "a third of my regime mass rides
on it." The fork resolves around 2029–30 and is the top-ranked signpost in two efforts.

**2. Impairment and productivity are complements, not substitutes — and the locked priors
imply the opposite.** Wave 1 across three efforts read AI-Q4's 66% impairment marginal as
evidence *for* weak measured 2032–36 output. The historical record of capex supercycles
says otherwise: fibre 1999–2002 coincided with the fastest US measured TFP since the
1960s, because the write-down collapses the user cost to adopters. Effort 4: "2B's
marginal-by-marginal elicitation assigns these a negative correlation it never states;
coupled, the correlation is mildly positive. **This sign flip, not the level of any
marginal, is the real tension.**" A high-impairment, high-growth world is fully
coherent — the compute gets written down and keeps running.

**3. Endogenizing demographics hands over ~+0.49 pp/yr of *measured* TFP for free — and
it is not output.** Effort 2's identity: OECD hours swing from +0.4%/yr to −0.2%/yr (0.6pp
at a 0.62 labour share = +0.37pp); China's from +0.2% to −1.1% (1.3pp at 0.52 = +0.68pp);
weighted 0.63/0.37 → **+0.485 pp/yr against a +0.50 pp threshold, with no AI contribution
at all.** This argues AI-Q1 belongs near 35–40% rather than 23%. Critically: *"this
revision adds ZERO to CQ3 and zero to CQ6-A. Measured TFP that rises because hours
contract faster than output is not output."* Any downstream reading of AI-Q6's TFP bands
as growth regimes double-counts the demographic drag's own accounting artefact as GDP.

**4. CQ5's disjunction is vacuous, and CQ1's second conjunct may be unresolvable.**
"Rises by ≥25bps" is a strict subset of "fails to fall by ≥50bps", so the OR clause adds
nothing and every muted-rally episode qualifies — this makes CQ5 *easier* than a careless
reading suggests, and the ensemble priced it accordingly. On CQ1, panelists split 0.68 to
0.90 on a multiplier standing in for "a resolution convention nobody can verify in
advance"; that disagreement alone spans CQ1 from 6 to 12.

---

## The working hypothesis, scored

| Plank | Raw Mean | Median | σ | Range | *d=1.35* |
|---|---|---|---|---|---|
| **(a)** AI white-collar savings smoothly supply elder-care workers | **5.0%** | 5.0% | 1.2pp | 3–7% | *1.8%* |
| **(b)** India and the Philippines suffer severely because AI blocks labour export | **14.3%** | 14.0% | 2.6pp | 10–22% | *8.0%* |
| **(c)** Inflation runs hot for a few years, then falls in the 2030s | **33.4%** | 26.5% | 16.1pp | 15–62% | *26.4%* |
| **(d)** Exponential AI outruns population decline, so growth wins | **16.0%** | 16.0% | 3.0pp | 11–22% | *9.4%* |

**(a) — 5.0%. The failing word is "smoothly."** This is the most confidently rejected
proposition in the exercise. The cross-elasticity between displaced cognitive workers and
care deficits is ~0.07 — effectively zero. The two markets are separated by a **−55%
reservation-wage step**, an **18–42 month licensing queue**, a physical-strain barrier, a
**77–88% female composition lock**, and a stock-flow mismatch (a 45-year-old displaced
paralegal is not a nursing entrant). Administrative throughput caps entry at 400–700k/yr
across all of OECD-38. Worse, the sector that must absorb them is 60–80% publicly funded
exactly as net interest goes from 2% to 3% of GDP — so the wage repricing that would clear
the market is fiscally blocked, and Baumol means care productivity cannot fund it
internally. Note the measurement trap: the J/K/M labour *share* can collapse while its
measured *median rises*, because culling the bottom quintile lifts the median 3–4pp.

**(b) — 14.3%. The failing words are "severely" and "blocks."** The hypothesis models one
leg of a two-leg shock. AI compresses *virtual* services export (IT/BPM, voice BPO), but
OECD aging simultaneously creates enormous demand for *physical* labour export — nurses,
aides, skilled trades — and these move in **opposite directions**. The net is far milder
than the plank asserts, and under some paths positive. One Effort-1 signpost is explicit:
if OECD-38 foreign-trained care-worker entries exceed 1.0M/yr with sub-12-month
licensure, plank (b) falls to ~8% on the remittance leg alone. The ensemble's EM ex-China
services exporters still carry the *worst* regime-D return in the asset matrix (−2.9%),
so the risk is real — it is the word "severely" that fails, not the direction.

**(c) — 33.4%, and this is the one genuine disagreement in the exercise** (σ 16.1pp, range
15–62%; mean 33.4% vs median 26.5%, a right-skewed split rather than a consensus). The
disagreement is not about inflation; it is about *which object* "inflation" names. Under
the literal all-38 PPP construction the EM-OECD composition floor keeps the aggregate
elevated regardless of G7 disinflation, so the back half never "falls" as the plank
requires. Panelists who priced a G7 object scored the plank high; those who priced the
literal index scored it low. Resolve the index question and this plank's spread mostly
collapses.

**(d) — 16.0%. The failing word is "eventually."** The horizon is the problem, not the
mechanism. The ensemble does not dispute that AI contributes; it disputes that the
contribution clears the demographic drag *by 2036*. CQ3's P50 of 1.87%/yr sits below the
2.6% that regime A requires, and the Fermi decomposition caps the AI capex hump's
contribution at **~0.15 pp/yr to 2032–36 growth regardless of the headline commitment
number** — that cap, not pessimism about AI, is the binding constraint. "Exponential"
also mis-states the production structure: under Chad Jones / Baumol weakest-link
elasticities, automating a subset of tasks raises the shadow price of the rest.

---

## Wave-by-wave audit trail

Mean across all four efforts. Direction of analytical updating, reported separately from
any extremization.

| Wave | CQ1 | CQ2 | CQ5 | CQ3 P50 | CQ4 P50 | A | B | C | D |
|---|---|---|---|---|---|---|---|---|---|
| **W1** blind elicitation | 13.2% | 31.8% | 24.8% | 1.84 | 1.93 | 12.6% | 49.9% | 20.1% | 17.4% |
| **W2** adversarial + Fermi | 15.1% | 39.8% | 32.0% | 1.91 | 2.19 | 16.9% | 49.4% | 23.6% | 10.1% |
| **W3** reconciled | 12.8% | 38.8% | 29.2% | 1.86 | 2.14 | 14.8% | 53.5% | 21.0% | 10.8% |

**Wave 2 amplified, Wave 3 partially moderated.** The largest movement is CQ6-D, which
**halved** (17.4% → 10.1%) in Wave 2 and stayed down. Cause: regime D requires OECD-38
core below 2.00% on an index containing Türkiye and Mexico, implying G7 core at
~1.65–1.70% — "a deeper Japanification than the narrative pictures; this is index
construction, not macro." CQ2 (+8.0pp) and CQ5 (+7.2pp) also rose sharply in Wave 2 and
held.

Notable: CQ3 barely moved across three waves (1.84 → 1.91 → 1.86) **but not because the
panel agreed**. Effort 4 flags its Wave-1 CQ3 cluster (1.90/1.90/1.85) as "narrowest and
most suspicious — anchoring on 2A's framing," and treated three lenses as one data point.
Effort 1 reports the same: its CQ3 agreement "was NOT triangulation," all three having
used the same OECD leg and the same reconstructed real-yield anchor, two of which were
arithmetically wrong.

---

## Falsification signposts

121 dated signposts were generated; these are the highest-leverage, drawn from the four
effort reconcilers. Each names a publicly observable event and what it does to the
forecast.

| By | Signpost | If observed |
|---|---|---|
| **Jun 2030** | OECD-38 PPP-weighted core for 2029 prints **below 2.2%** while G7 core prints ≥2.0% (composition wedge under 0.2pp) | The load-bearing fact dies. CQ2 42→29, CQ6-C 26→16 (mass to B), plank (c) 26→35, CQ5 30→24 |
| **Dec 2030** | The resolving inflation object settles — an "OECD advanced" aggregate becomes canonical, **or** Türkiye and Mexico core both converge below 4.0% | CQ2 41→27, CQ6-C 27→15, CQ6-D 7→13, B→55. Conversely if all-38 stays canonical above 3.0%: CQ2→48, C→33 |
| **Dec 2030** | NBS prints China real GDP **below 3.5%** absent a declared shock | CQ3 P50 1.9→1.75, CQ6-A 16→11, D 9→13, plank (d) 16→11 |
| **Dec 2031** | China headline CPI ≥2.0% y/y for four consecutive quarters, with non-food/non-residence contributing ≥1.0pp | Kills CQ2's stronger conjunct: CQ2 38→22 *even with the OECD leg intact* — the cleanest test of which leg is doing the work |
| **Mar 2032** | AI impairments stay **below 10%** of announced buildouts **and** external AI revenue exceeds 1.0× compute D&A for four quarters **and** ≥70 GW of DC-serving firm capacity reaches COD | Highest-leverage single signpost: CQ3 P50 1.75→2.05, CQ6-A 12→19, D 14→9, CQ5 27→21 |
| **Dec 2031** | A ≥20% MSCI World drawdown in which G7 10y nominals **fall ≥100bp** — flight-to-quality reasserting despite >100% debt/GDP | Falsifies the fiscal-dominance correlation: CQ5 27→16, CQ4 P90 3.35→2.95, mass C→D |
| **Dec 2032** | G7 10y real yield stays inside **1.70–2.60% in every one of 2030/31/32** with no YCC, captive-holding mandate or >3%-of-GDP purchase programme | Tests bimodality, not level. CQ4 collapses to 1.60/2.20/2.90 (narrower, not shifted); CQ5 28→22 |
| **Dec 2033** | Eurostat SES 2030 + BLS OES show F+Q beating J+K+M by **>+6.0pp** over 2022–30, decomposed as within-job rather than composition | CQ1 16→26, plank (a) 4→10. A gap below +1.0pp takes CQ1→9 and plank (a)→2 |
| **Dec 2033** | OECD-38 foreign-trained care-worker entries **above 1.0M/yr** with sub-12-month licensure in ≥3 of US/DE/JP/CA/UK | Cuts both CQ1 legs: CQ1→9, but CQ3 P50→2.05, CQ6-A→20, plank (b)→8 |
| **Dec 2031 / Dec 2034** | ≥20% of the $1.4T stack impaired — **paired with the sign of OECD measured TFP in the following three years** | *The* discriminating test of finding #2. Impairment **with** TFP >+0.4pp/yr: CQ3→2.15, A→26, D→4. Impairment **with** TFP flat/falling: CQ3→1.75, D→12, CQ5→−5 |

---

## Probability-weighted asset & sector matrix

Annualized **real** total return, %/yr, constant 2025 USD. Regime-conditional columns are
weighted by the CQ6 raw-mean distribution (A 14.4 / B 50.3 / C 21.4 / D 13.9) rather than
by a single-scenario narrative pick. Source: the six Effort-4 panelists.

| Asset | 2026–30 Buildout | A | B | C | D | **CQ6-weighted 2031–36** | Regime spread |
|---|---|---|---|---|---|---|---|
| Power, grid & electrical equipment | **8.3** | 7.8 | 6.7 | 4.5 | −0.9 | **5.3** | 8.8pp |
| Construction, skilled trades & capital goods | **7.1** | 7.8 | 7.0 | 4.8 | −2.2 | **5.4** | 10.0pp |
| Industrial metals (copper-levered) | 6.2 | 6.5 | 4.6 | 3.8 | −4.2 | **3.5** | 10.8pp |
| Healthcare & elder-care operators | 3.9 | 5.0 | 5.2 | 1.2 | 3.1 | **4.0** | **4.0pp** |
| Gold & reserve diversifiers | 3.8 | −1.0 | 2.4 | 7.5 | 2.0 | **3.0** | 8.5pp |
| OECD equities ex-AI-complex | 3.6 | 7.3 | 3.8 | −0.8 | −0.4 | **2.7** | 8.1pp |
| China equities & onshore duration | 3.2 | 6.6 | 3.1 | 0.7 | 1.1 | **2.8** | 5.9pp |
| EM ex-China services exporters (India/PH) | 2.8 | 6.8 | 1.9 | −0.1 | −2.9 | **1.5** | 9.8pp |
| AI / hyperscaler complex | 2.4 | 10.3 | 5.9 | −1.0 | −7.0 | **3.3** | **17.3pp** |
| Private credit / levered loans | 2.2 | 4.7 | 2.7 | −1.8 | −5.2 | **0.9** | 9.8pp |
| G7 cash / short real rates | 1.3 | 1.5 | 1.3 | −0.8 | 0.3 | **0.7** | 2.3pp |
| G7 inflation-linked sovereigns | 1.1 | 1.4 | 1.2 | 1.2 | 3.2 | **1.6** | **2.0pp** |
| G7 long nominal sovereigns (10y+) | −0.6 | 0.9 | −0.8 | −4.9 | 6.1 | **−0.5** | 11.0pp |

**How to read this.** Four things stand out.

*The buildout and the diffusion phase rank assets differently.* Power/grid leads
2026–30 at 8.3%, and construction/trades leads the CQ6-weighted diffusion period at 5.4%.
The **AI complex is near the bottom of the buildout table (2.4%)** while carrying the
highest regime-A payoff (10.3%) — it is the capex *payer* in the hump and the rent
*collector* only if regime A arrives. Its 17.3pp regime spread is the widest of any
asset: this is the position that most requires a regime view rather than a direction view.

*The picks-and-shovels trade is the ensemble's most robust.* Power/grid and
construction/trades are the only assets with a positive CQ6-weighted return above 5% and
they stay positive in three of four regimes, turning negative only in D. This follows
directly from the coupling: both the AI buildout and the aging build bid for the *same*
scarce physical inputs — electricians, linemen, substation crews — against a trades
workforce roughly a quarter of which reaches retirement eligibility by 2033.

*G7 long nominals are the cleanest regime hedge and the worst unconditional holding.*
−0.5% weighted, but +6.1% in D and −4.9% in C — an 11pp swing on the one axis the
ensemble is most uncertain about (the C/D split, which turns on index construction).
Linkers do the opposite: a 2.0pp spread, the narrowest in the table, positive everywhere.

*Elder-care operators are the demographic trade that is not a regime bet.* 4.0% weighted
with a 4.0pp spread — the second-narrowest. The demand is near-deterministic; what the
regimes argue about is who pays for it.

**Caveat — n is 6, not 24.** By design only Effort 4 was given the asset list and the
asset-matrix mandate, so each cell is the mean of that effort's six panelists across all
three waves. This was deliberate: asking all 24 to price 13 assets across 5 regime-periods
would have produced 1,560 numbers, most from panelists with no markets lens. The cost is a
smaller n on the matrix than on CQ1–CQ6. Effort 2's reconciler volunteered an unrequested
fifteen-item macro set of its own and flagged that it should be mapped by name rather than
position; it is excluded rather than merged, since its rows are not the same assets.

---

## Method sensitivity: a second, independent 24-panelist run

A second ensemble was run with **byte-identical** preamble, locks, efforts and output
schema (verified by diff), changing only two things: the roster was swapped to the
canonical six-role Tetlock skill (Reference-Class Historian · Fermi Structural Decomposer ·
Empirical Signal Scout → Bayesian Likelihood-Ratio Updater · Premortem Red-Teamer →
Dragonfly-Eye Synthesizer), and the **Fermi seat alone was given access to this
repository's simulation** through [`scripts/tetlock-sim-adapter.ts`](../../../scripts/tetlock-sim-adapter.ts),
under a rule to publish its model-to-question adapter and refuse unidentified numbers.
Run 2 also had web search on its Historian and Scout seats (140 tool calls vs 45).

**This is a sensitivity-to-method test, not an accuracy test.** Neither run has resolved
outcomes, so a difference between them says how much the answer depends on the
architecture — nothing about which architecture is better.

| Quantity | Run 1 (judgment-only) | Run 2 (skill roster + sim) | Δ |
|---|---|---|---|
| **CQ1** raw mean | 13.8% | 13.3% | −0.5 |
| **CQ2** raw mean | 35.6% | 31.8% | −3.8 |
| **CQ5** raw mean | 28.0% | 22.5% | −5.4 |
| **CQ3** P10 (ens. mean) | 0.98 | 0.87 | −0.11 |
| **CQ3** P50 (ens. mean) | 1.87 | 1.85 | −0.02 |
| **CQ3** P90 (ens. mean) | 2.82 | 2.88 | +0.06 |
| CQ3 panelist-P50 σ | 0.14 | 0.19 | +0.05 |
| **CQ4** P10 (ens. mean) | 0.94 | 0.88 | −0.07 |
| **CQ4** P50 (ens. mean) | 2.05 | 2.03 | −0.02 |
| **CQ4** P90 (ens. mean) | 3.26 | 3.31 | +0.05 |
| CQ4 panelist-P50 σ | 0.20 | 0.29 | +0.10 |
| **CQ6-A Renaissance** | 14.4% | 16.5% | +2.1 |
| **CQ6-B Barbell** | 50.3% | 47.3% | −3.0 |
| **CQ6-C Stagflation** | 21.4% | 20.9% | −0.5 |
| **CQ6-D Stagnation** | 13.9% | 15.2% | +1.4 |
| Plank (a) | 5.0% | 6.0% | +1.0 |
| Plank (b) | 14.3% | 14.7% | +0.4 |
| Plank (c) | 33.4% | 38.8% | +5.3 |
| Plank (d) | 16.0% | 15.5% | −0.5 |

**Wave 2's contribution (mean change from Wave 1 to Wave 2, all efforts):**

| | Run 1: red-team + Fermi | Run 2: Bayes + premortem |
|---|---|---|
| CQ2 | 31.8 → 39.8 (**+7.9**) | 28.8 → 34.8 (**+5.9**) |
| CQ5 | 24.8 → 32.0 (**+7.2**) | 21.5 → 23.9 (**+2.4**) |

**Asset matrix, CQ6-weighted 2031–36 real return (each run weighted by its own CQ6):**

| Asset | Run 1 | Run 2 | Δ |
|---|---|---|---|
| OECD equities ex-AI-complex (broad DM, ex mega-cap tech/semis) | 2.7 | 3.1 | +0.4 |
| AI/hyperscaler complex (mega-cap tech + semis + AI infra) | 3.3 | 3.9 | +0.6 |
| Power, grid & electrical equipment (utilities + T&D capex chain) | 5.3 | 5.2 | -0.1 |
| G7 long nominal sovereign bonds (10y+) | -0.5 | -0.9 | -0.4 |
| G7 inflation-linked sovereigns (TIPS/real) | 1.6 | 1.4 | -0.2 |
| G7 cash / short real rates | 0.7 | 0.8 | +0.1 |
| Gold & reserve diversifiers | 3.0 | 2.9 | -0.1 |
| Industrial metals (copper-levered) | 3.5 | 3.6 | +0.1 |
| Healthcare & elder-care service operators | 4.0 | 3.5 | -0.5 |
| Construction, skilled trades & capital goods | 5.4 | 4.6 | -0.8 |
| China equities and onshore duration | 2.8 | 3.9 | +1.1 |
| EM ex-China services exporters (India/Philippines IT-BPO) | 1.5 | 2.5 | +1.0 |
| Private credit / levered loans | 0.9 | 0.9 | +0.0 |

### What the comparison shows

**1. The headline is robust to the roster.** The modal regime, the growth and real-yield
centres, CQ1, and three of the four hypothesis planks all moved by less than a few points.
Bifurcated Barbell is modal in both runs (50.3% / 47.3%); CQ3's P50 moved 2 bp and CQ4's
2 bp. The asset ranking is stable at the top and bottom: power/grid and
construction/trades lead in both, and G7 long nominals are the only negative CQ6-weighted
holding in both.

**2. Simulation access did not contaminate the panel.** All four Fermi seats ran the model —
one across ten scenarios — and every one of them did what the seat was designed to do:
**adopted the model's 2031 PPP weights** (0.629 / 0.371, a ratio and therefore identified
regardless of deflator base) as a cross-check on their own hand-built weights, and
**rejected the model's growth rates** with stated reasons. Their CQ3 P50s landed at
**1.5–1.8%/yr, below the panel average** — the opposite of the anchoring risk. Effort 2's
Fermi seat named four reasons the model runs hot: its China leg (2.85–4.58%/yr) does not
implement the locked −2.7 pp aging drag; its Ayres-Warr production function with
γ = 0.55 is a heterodox choice; its regions do not partition OECD-38; and its demographics
carry fertility convergence but no pension, property or dissaving adjustment. Only the
model's `debt-populism` scenario (1.67%/yr) reached the panel's neighbourhood.

So the honest verdict on "should agents run simulations" is: **scoped to one seat with a
refusal rule, it is safe, and it is mildly useful** — it gave the Fermi seat a concrete
object to argue against and an independent check on the PPP weighting. It did not move
any headline number, which is what you want from an instrument whose structural choices
contradict the locked priors.

**3. The roster matters for the conjunctive market and inflation questions — and the
sensitivity sits in Wave 2.** CQ5 fell 5.5 pp and CQ2 3.8 pp between runs. The table
above shows where: in run 1 the red-team and Fermi seats pushed CQ5 up **+7.2 pp** in Wave 2
(the MOVE basis-point-normalization argument — MOVE's floor scales with the yield level,
so a ~4.5–5.0% US 10y implies a floor near 87–90, not 2010s levels); in run 2 the Bayesian
updater and premortem seats moved it only **+2.4 pp**. Treat CQ5 as **~22–28%** and CQ2 as
**~32–36%**, with the spread being genuine method uncertainty.

**4. One finding was robust, one was not.** The **Türkiye index-composition effect on CQ2
was found independently by all four efforts in *both* runs** — including in run 2, which
had no auditor seat (the Scout, Historian and Fermi seats found it). It is a property of
the question, not of a lens. The **vacuous CQ5 disjunction**, by contrast, was found only
in run 1, and only by the dedicated resolution-auditor seats in two efforts. The canonical
roster has no seat whose job is to read the question's logic, and it shows.

**Pooled view.** Treating the two runs as 48 panelists changes no conclusion: CQ6-B ≈ 49%,
CQ3 P50 ≈ 1.86%, CQ4 P50 ≈ 2.04%, plank (a) ≈ 5.5%.

---

## Limitations

- **No resolved outcomes.** All accuracy claims are out of scope. `d = 1.35` is a borrowed
  constant; it should be re-fitted once questions resolve (see
  [`workbench-wiring.md`](../../../.claude/skills/tetlock-ensemble-forecasting/references/workbench-wiring.md)).
- **Correlated priors.** All 48 panelists are instances of one model family reading
  overlapping corpora. The ensemble's σ understates true uncertainty; this is also why
  extremization is a secondary column only.
- **Locked priors were taken as given.** Several Section-2 figures post-date the panelists'
  training horizon and were not verified; the forecast is conditional on them. Panelists
  repeatedly found them in tension once coupled (AI-Q1 likely too low on measurement
  grounds, AI-Q2/Q4/Q5 too low, AI-Q3 internally inconsistent with AI-Q4).
- **CQ6-B is partly a residual** of the lexical-priority lock imposed to make the regimes
  MECE; ~34 pp of mass sits in cells with no literal home under the original definitions.
- **CQ1's wage conjunct may be unresolvable** at its stated endpoints with published data.
- **Asset matrix n = 6 per cell** (Effort 4 only, by design).
