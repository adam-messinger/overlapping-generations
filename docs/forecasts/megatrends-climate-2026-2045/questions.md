# Five megatrends including physical climate change, 2026-2045: locked question set

**Forecast origin:** 2026-11-09. **Panel:** K = 4 efforts x 6 single-skill seats (24),
per `.claude/skills/tetlock-ensemble-forecasting`. This file is the shared preamble
every panelist receives verbatim.

## The topic

How five structural megatrends interact over 2026-2045. Two engines of growth:

1. Solar- and battery-driven electrification (falling LCOE, storage, capital front-loading).
2. Embodied AI and robotics (automation of cognitive and physical labour).

Three headwinds:

3. Demographic contraction (sub-replacement fertility, rising dependency, OLG dissaving).
4. Deglobalization and geopolitical fragmentation (tariffs, carbon border measures, reshoring).
5. Physical climate change: heat stress, extreme weather, chokepoint droughts, property
   uninsurability and the cost of adaptation.

Outputs of interest: trade volumes and composition, neutral real rates, sovereign debt,
and comparative GDP (US, EU, China, the rest of the world).

**Provenance.** The ten questions are those of an earlier 24-agent ensemble report dated
2026-11-09 (the "source report"). That report named each question in a phrase and published
no resolvers. The operational definitions below are this panel's lock, written by the
orchestrator; where the source report was silent the choice is stated in the audit section.
The source report's forecasts are deliberately withheld from you. Do not look for them, and do
not search for anyone else's forecast of these exact questions (that is herding).
You are forecasting the WORLD, not grading a thesis.

## Baselines at the forecast origin

Rows marked (P) were read by the orchestrator from the primary source; rows marked (S) come
from secondary press and are unverified. Panelists may re-verify any row.

| Quantity | Latest value | Source |
|---|---|---|
| World merchandise trade volume growth / world real GDP growth at market exchange rates | forecast 3.9% / 2.6% for 2026 and 4.1% / 2.9% for 2027; first-half 2026 merchandise trade value +15% y/y against volume +3.5% | (P) WTO Global Trade Outlook update, 8 Oct 2026 |
| AI-enabling goods, share of world merchandise trade | 14.8% in H1 2026, up from 7-8% over 2016-2023; 47% of merchandise trade growth in H1 2026 | (S) WTO Global Trade Outlook executive summary |
| Digitally delivered services exports | $5.26T in 2025, about 15% of world exports of goods and commercial services | (S) WTO data via trade press |
| Composite share for Q1 (digitally delivered services + AI-enabling goods + fuels and mining products, over world exports of goods and commercial services) | roughly 37-40% in 2025: about 15 + 11-12 + 11-12 | orchestrator's estimate from the components; NOT a published figure |
| NY Fed HLW r* (one-sided), 2026Q2 | US 1.01%, euro area 0.09%, Canada 1.76%; composite R (weights below) 0.73% | (P) NY Fed HLW current estimates file, final data point 2026Q2 |
| Composite R, decade averages | 1996-2005 2.75%; 2006-2015 1.28%; 2016-2025 0.93%. Of the 45 ten-year windows starting 1972-2016, 30 averaged >= 2.0%; none starting after 2001 did | (P) same file, orchestrator's arithmetic |
| IMF advanced economies, general government gross debt | 110.1% of GDP in 2025, 110.9% in 2026 (Oct 2025 Fiscal Monitor); Oct 2026 Fiscal Monitor projects 115.2% in 2031 | (S) IMF Fiscal Monitor via press |
| G7 gross debt (IMF, % of GDP) | US 123.9% (2025), projected 142-145% in 2031; Italy 137.9% (2026); France projected 123.6% (2031); Japan projected 188.9% (2031, the highest); UK about 100-105%, Canada about 110%, Germany about 65% | (S) press coverage of IMF Fiscal Monitor Apr and Oct 2026; approximate where marked "about" |
| US 10- and 30-year Treasury yields | "highest yields since around 2002" on 13 Oct 2026; advanced-economy yields up about 110 bp since late February | (S) Jakarta Post / Reuters on the Oct 2026 Fiscal Monitor |
| OECD + China real GDP per capita (sum of PPP GDP over sum of population) | CAGR 2.48% over 2005-2025 and 2.58% over 2015-2025. Every ten-year window since 1990 lies between 2.15% and 2.85%. OECD alone 1.16% / 1.41%; China alone 7.15% / 5.37%. 2025 levels: OECD $76.5T and 1,402M people, China $35.3T and 1,407M | (P) World Bank WDI `NY.GDP.MKTP.PP.KD`, `SP.POP.TOTL` (aggregate `OED`, `CHN`), orchestrator's arithmetic |
| World nominal GDP, 2026 | $128.0T; US $32.64T (25.5%), China $21.55T (16.8%), sum 42.3%. Germany 5.47, France 3.55, Italy 2.70, Spain 2.09, Netherlands 1.42, Poland 1.13 ($T) | (S) IMF WEO Oct 2026 via CEOWORLD, 5 Nov 2026 |
| EU-27 share of world nominal GDP, 2026 | about 17.5-18% (the six members above are roughly 72% of EU GDP) | orchestrator's estimate; NOT a published figure |
| Physical-climate fiscal scale markers | FEMA Disaster Relief Fund appropriations $57.9B in FY2025 (about 0.19% of US GDP); global natural-catastrophe economic losses $327B in 2024 and $220B in 2025 (about 0.2-0.3% of world GDP), of which $141B and $107B insured | cited by the source report from Brookings and Swiss Re sigma; not re-verified |

## Accounting and scope locks

- **Windows.** "2026-2045" means the twenty years of growth from the 2025 level to the 2045
  level. "2036-2045" means the ten years from the 2035 level to the 2045 level, or the
  calendar years 2036 to 2045 inclusive for an average of annual or quarterly values.
- **Real vs nominal.** C1 and C4 are volumes. C2 is a real rate. C3 is a ratio to nominal
  GDP. Q5 is a ratio of current-price US-dollar values, so exchange rates and relative
  inflation move it without any change in volumes.
- **G7** is the United States, Japan, Germany, France, the United Kingdom, Italy and Canada.
- **EU-27** is the 27 member states as of 2026, fixed. **OECD** is the 38 members as of 2026,
  fixed, summed country by country (the World Bank's `OED` aggregate is recomputed on current
  membership, so a new member would change both endpoints). **China** is the People's Republic
  excluding Hong Kong, Macao and Taiwan.
- **Vintage rule.** Each question resolves on the first publication of the stated series
  that contains the target period, and compares within that one vintage. Later revisions do
  not re-resolve.
- **Fallback resolver.** If a named series is discontinued, its closest successor by the
  same publisher; if none, the stated fallback; if none, the question is cancelled (not
  resolved No).

## Questions

**C1 (continuous, trade volume).** World trade-to-GDP volume elasticity, 2026-2045:
E = g_T / g_Y, where g_T is the compound annual growth rate of world merchandise trade volume
from 2025 to 2045 (WTO, average of exports and imports) and g_Y is the compound annual growth
rate of world real GDP at market exchange rates over the same years (the WTO's GDP series in
Global Trade Outlook and Statistics; fallback World Bank `NY.GDP.MKTP.KD`, World). E is the
ratio of the two twenty-year compound rates, not an average of annual ratios. Give P10 / P50 /
P90 in "x" (for example 0.95).

**Q1 (binary, trade composition; a conjunction).** Will **both** hold: (i) E from C1 is
**below 0.75**, and (ii) in calendar 2045 the combined current-dollar value of world exports
of (a) digitally delivered services, (b) AI-enabling goods (the WTO's definition as used in
its 2026 Global Trade Outlook; fallback the WTO product group "office and telecom
equipment") and (c) fuels and mining products **exceeds 42%** of world exports of goods and
commercial services (all WTO)?

**C2 (continuous, neutral real rate).** R = 0.61 x US + 0.34 x euro area + 0.05 x Canada of
the New York Fed's Holston-Laubach-Williams (HLW) one-sided r* estimates, averaged over the 40
quarters 2036Q1-2045Q4, read from the first HLW release whose final data point is 2045Q4 or
later. Percent. The weights are fixed (2025 nominal GDP at market exchange rates). Fallback if
the New York Fed publishes no HLW or successor estimate: the same weights applied to the
ex-post real short rate (average 3-month government bill yield minus average CPI inflation)
over 2036-2045. Give P10 / P50 / P90.

**Q2 (binary).** Will R from C2 be **at least 2.00%**?

**C3 (continuous, sovereign debt).** General government gross debt of the IMF's "Advanced
Economies" group, percent of GDP, for **2045**, as in the first IMF Fiscal Monitor or WEO
database (`GGXWDG_NGDP`, group aggregate) that reports 2045 as an estimate or actual (expected
April 2046). Group membership is whatever the IMF uses in that edition. Give P10 / P50 / P90.

**Q3 (binary, climate fiscal cost).** Let F be the G7 GDP-weighted average, over 2040-2045,
of the annual addition to general-government primary deficits attributable to physical climate
change: (i) public adaptation and resilience investment and its maintenance, (ii) disaster
relief, reconstruction and public insurance or reinsurance backstop payouts, net of premiums
and levies received, (iii) climate-attributed price, food and relocation support to
households, and (iv) revenue losses that the resolving source attributes directly to physical
climate damage. Excluded: mitigation and energy-transition spending, off-budget mandatory
surcharges on private insurance policies, privately insured losses, and interest on the debt.
Will **F be at least 1.5% of GDP per year**? Resolver: the first official multi-country
estimate covering the window (IMF Fiscal Monitor or OECD); failing that, the GDP-weighted sum
of national fiscal-council or audit-office estimates (CBO or GAO, OBR, and equivalents) under
the accounting above. If no such estimate exists by end-2048 the question is cancelled.

**Q4 (binary, policy response).** Between 2026-01-01 and 2045-12-31, will **at least three
distinct G7 countries** each satisfy at least one of:

- (a) **Automation tax.** National legislation is enacted creating a tax or levy specifically
  on robots, AI compute, AI model usage or automated substitution for labour, officially
  scored (finance ministry or independent fiscal council) at >= 2.0% of GDP a year once phased
  in, or actually raising >= 2.0% of GDP in any year to 2045. General corporate, capital,
  wealth, payroll and digital-services taxes do not count.
- (b) **Formal yield-curve control.** The country's central bank (for Germany, France and
  Italy: the ECB or Eurosystem, with respect to that country's government bonds) publicly
  announces a numerical target, cap or ceiling for the yield of that government's bonds at a
  maturity of two years or longer, at a time when the country's general government gross debt
  (latest IMF annual figure) exceeds 140% of GDP. QE without a stated yield level, spread
  backstops without a stated number (such as the ECB's TPI as it stands), operation-twist
  purchases and buybacks do not count.

A country counts once. A measure later repealed still counts. Japan's 2016-2024 yield-curve
control ended before the window and does not count unless re-enacted.

**C4 (continuous, growth).** Compound annual growth rate, 2025 to 2045, of real GDP per
capita of the OECD + China aggregate: sum of GDP in constant PPP international dollars
(World Bank WDI `NY.GDP.MKTP.PP.KD`) over sum of population (`SP.POP.TOTL`), for the 38 OECD
members and China, in the first WDI vintage that contains 2045. Percent per year. Give P10 /
P50 / P90.

**Q5 (binary, national divergence; a conjunction).** In the first IMF WEO database that
reports 2045 as an estimate or actual, will **both** hold for 2045 GDP in current US dollars
(`NGDPD`): (United States + China) / World **above 50.0%**, and EU-27 / World **below 11.5%**?

**Q6 (regimes, 2045 end-state; MECE by lexical priority, first match wins).** Let g be the
compound annual growth rate of the C4 aggregate's real GDP per capita from 2035 to 2045, and
let pi be the average of the ten annual CPI inflation rates 2036-2045 for the OECD's G7
aggregate ("G7, CPI all items, annual growth rate").

| Order | Regime | Condition |
|---|---|---|
| 1 | **C  Stagflationary climate-debt crisis** | During 2036-2045 any G7 sovereign defaults on or restructures marketable central-government debt, or draws on an IMF Stand-By or Extended arrangement; **or** pi >= 4.0% and g < 1.0% |
| 2 | **A  High-productivity techno-abundance** | Not C, and g >= 2.5% |
| 3 | **B  Bifurcated bloc capitalism and repression (residual)** | Neither. B is the catch-all |

Probabilities must be non-negative and sum to 100.

### Orchestrator's question audit (Step 1.4)

- **What the source report left open, and what was chosen.** C1: which trade and GDP series,
  and "average elasticity" (chosen: WTO merchandise volume over market-rate GDP, ratio of
  twenty-year compound rates). Q1: the "digital / minerals" composite was never defined
  (chosen: the three WTO categories the report's own evidence names). C2/Q2: "G7 r*" has no
  published series (chosen: the HLW estimates for the US, euro area and Canada, which hold
  about 85% of G7 GDP; Japan and the UK have no HLW estimate and are outside R). Q3: "climate
  fiscal drag" has no series at all. Q4: "formal YCC", "robot tax" and the window. Q6: the
  three regimes were labels without conditions.
- **Vacuous clauses.** None. Q6-C's disjunction is genuine: a G7 credit event can occur
  without decade-average stagflation, and the reverse. Q4's two limbs are independent.
- **Overlaps resolved by order.** A world with a G7 restructuring *and* g of 3% resolves C,
  not A. The regime labels carry causal stories (climate, blocs, repression) that cannot be
  resolved; only the stated observables count. A decade of financial repression with 5%
  inflation and g of 1.4% and no credit event resolves **B**.
- **Conjunctions.** Q1 and Q5 are joint thresholds, and Q6-C's second limb is one too. Price
  each conjunct's marginal, state the assumed correlation, and multiply.
- **Composition traps.** C1 is merchandise only; services trade is outside it. C2's euro-area
  estimate has been near zero since 2024 and carries 34% of R. C3 is the IMF group aggregate,
  weighted by nominal GDP, so the United States is roughly half of it and Japan under a tenth;
  it is gross general-government debt, not US debt held by the public. C4's aggregate has
  grown about twice as fast as the OECD alone because China is about 32% of the aggregate's
  GDP; that weight and China's growth rate are both changing. Q5 is nominal: a renminbi or euro move
  of 20% shifts the shares by several points with no change in output.
- **Resolvability, weakest first.** Q3 has no existing series and resolves on a future
  official estimate under the stated accounting; it is the least resolvable question and may
  be cancelled. C2/Q2 depend on the New York Fed continuing HLW (published since 2017, paused
  2020-2022, back-filled); the fallback changes the concept from an estimate to a realized
  rate. Q1(ii) depends on the WTO still publishing an AI-enabling-goods aggregate in 2046;
  the fallback is narrower. C1, C3, C4, Q5 and Q6's g and pi read series published today.

## Coherence rules (your own answers must satisfy these)

- Q1 cannot exceed your own probability that C1 is below 0.75.
- Q2 is your own probability that C2 is at least 2.00: if your C2 P90 is below 2.00, Q2 is
  below 10; if your C2 P50 is above 2.00, Q2 is above 50.
- Q6-A cannot exceed your own probability that g is at least 2.5%, and your C4 quantiles
  (which cover 2026-2045) must be consistent with your view of g (2036-2045).
- Q4's yield-control limb needs debt above 140% in each counted country; check it against
  your C3 view.

## Output discipline (every panelist)

- Answer **all ten** questions through your own lens. The output is a data payload
  consumed by `tetlock_aggregate.py`, not a message to a human.
- Binary answers (Q1-Q5) are integers from 1 to 99 (percent probability of Yes; 1 means
  "1% or less"). Continuous answers (C1-C4) satisfy P10 < P50 < P90. Q6 is three
  non-negative numbers A, B, C summing to 100.
- **Do not hedge toward the obvious centre.** Lens purity is the ensemble's value;
  splitting the difference destroys the variance information and is a failure, not caution.
- Open with a one- or two-sentence BLUF. Then reasoning of at most 600 words, through your
  lens only. Cite primary-source URLs inline. Preserve source caveats (sample sizes,
  intervals, subgroup limits) verbatim; never compress a noisy estimate into an unqualified
  headline.
- Read-only: web search and page reading only. Do not write files other than your one
  seat file, do not launch other agents, do not open interactive browsers, do not run git.
- End your seat file with ONE fenced ```json block exactly in this shape:

```json
{"c1": {"p10": 0, "p50": 0, "p90": 0},
 "q1": 50,
 "c2": {"p10": 0, "p50": 0, "p90": 0},
 "q2": 50,
 "c3": {"p10": 0, "p50": 0, "p90": 0},
 "q3": 50,
 "q4": 50,
 "c4": {"p10": 0, "p50": 0, "p90": 0},
 "q5": 50,
 "q6": {"A": 0, "B": 0, "C": 0}}
```
