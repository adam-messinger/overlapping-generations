# The Commanding Heights (Manidis & Roberts, 2026): locked question set

**Forecast origin:** 2026-11-08. **Panel:** K = 4 efforts x 6 single-skill seats (24),
per `.claude/skills/tetlock-ensemble-forecasting`. This file is the shared preamble
every panelist receives verbatim.

## The topic

Will Manidis and Joe Roberts, *The Commanding Heights* (commanding-heights.com,
published 2026-10-29, ~40,000 words). Its core claims, as the panel tests them:

1. **The Line.** AI capex, stock prices and model capability move as one line. Frontier
   training cost grows ~3.5x a year ($1B runs in 2026, "$3.5B next year, $10B the year
   after"); hyperscaler capex went from >$400B (2025) to ~$800B (2026), "soon over $1T and
   trillions yet to come", and Washington will backstop it. There "may never be a signal
   that tells participants to stop building": rational for each firm, capital destruction
   in aggregate.
2. **Principalities and Powers.** Only the US and China will be able to keep developing
   frontier models; the frontier splits into commercial and sovereign tiers.
3. **Superscription.** AI diffusion will create near-unlimited demand for a global
   stablecoin dollar (the "Neo-Dollar"); Washington carries its costs through debasement
   and will reverse the 1951 Treasury-Fed Accord, fixing Treasury yields "even if Congress
   has to change its mandate".
4. **The World to Come.** Diffusion hits the rich world's back office first (India's IT
   services); "machine intelligence could drive as much transfer from labor to capital in
   the next decade as the previous wage-to-financial economy produced in forty years".
5. **The Commanding Heights.** Models commoditize; durable value goes to distribution,
   payment and dollar chokepoints, not labs. (Not directly forecast here: no resolvable series.)

You are forecasting the WORLD, not grading the essay. The essay's claims are the
hypotheses; do not anchor on them, and do not anchor against them.

## Baselines at the forecast origin (orchestrator-verified from secondary press; panelists may re-verify)

| Quantity | Latest value | Source |
|---|---|---|
| Big-4 (Microsoft, Alphabet, Amazon, Meta) capex | ~$410B CY2025; CY2026 guidance ~$720-745B (Alphabet $195-205B, Amazon ~$220B, Microsoft ~$170B CY, Meta $135-145B), October 2026 calls | trade press summaries (fourweekmba, Tom's Hardware); not checked against transcripts |
| Epoch AI training-cost trend | ~3.5x/yr since 2020 (was 2.4x in Epoch's 2024 estimate); ~$1B frontier runs reported (unconfirmed) in 2026 | Epoch "Trends in AI", per the essay |
| Stablecoin supply (all, DefiLlama) | ~$308B (13 Aug 2026); record ~$322B (26 May 2026); ~$308B end-2025 | DefiLlama via secondary sites |
| US nonfarm business labor share | **52.8% in 2026Q2**, lowest in the series (BLS; a Nov 5 2026 revision to Q2 productivity may have moved it) | BLS TED 2026; Productivity and Costs |
| Indian IT big-5 headcount (TCS, Infosys, HCLTech, Wipro, Tech Mahindra) | net +13,918 in Jul-Sep 2026 (Wipro -6,716); TCS 598,056, Infosys 332,542, HCLTech 230,339, Wipro 236,328 at 30 Sep 2026; TCS fell 23,460 over FY2026 | company results via press |
| US 10y Treasury | 5.17% on 2026-09-25 (per the essay) | Treasury / FRED DGS10 |

## Accounting and scope locks

- **Capex (Q1)** is each company's cash-flow-statement line for purchases of property and
  equipment ("Additions to property and equipment" for Microsoft and Alphabet; "Purchases of
  property and equipment" for Amazon and Meta), summed over the four CALENDAR quarters.
  Finance leases and incentives are excluded, whatever the companies' own "capex" headline
  includes. Nominal USD. Both years read from the same definitions.
- **Vintage rule:** each question resolves on the **first** publication containing the
  target period; later revisions do not re-resolve.
- **Geography:** an organization's country is its headquarters (ultimate parent).
- **Fallback resolver:** if a named series is discontinued, its closest successor by the same
  publisher; if none, the question is cancelled (not resolved No).

## Questions

**Q1 (regimes, "the Line"; MECE on one number).** Let R = Big-4 capex in CY2030 / Big-4
capex in CY2026 (definitions above). Bands, lower bound inclusive:

| Regime | Condition |
|---|---|
| **A  Line broken** | R < 1.0 (2030 below 2026) |
| **B  Plateau** | 1.0 <= R < 2.0 |
| **C  Sustained growth** | 2.0 <= R < 4.0 (~19-41%/yr) |
| **D  The essay's line** | R >= 4.0 (>= ~41%/yr; the essay's +70%/yr implies ~8x) |

A company that ceases separate reporting (merger, split) is carried at its successor's line.

**Q2 (binary, training-cost line).** Will Epoch AI's database of notable/frontier models,
as published on **2029-12-31**, contain at least one model with publication date on or before
**2028-12-31** whose estimated training cost (Epoch's headline training-cost estimate, any
method it reports as primary, nominal USD) is **at least $10 billion**? The essay predicts
$10B runs in 2028.

**Q3 (binary, US-China duopoly).** On **2028-12-31**, take the LMArena (lmarena.ai) Text
leaderboard's overall ranking (default style-control setting) and list the **ten highest-ranked
distinct organizations** (each organization counted once, at its best model). Will **all ten**
be headquartered in the United States or the People's Republic of China (excluding Hong Kong,
Macao, Taiwan)? If LMArena no longer publishes such a leaderboard, the question is cancelled.

**Q4 (continuous, Neo-Dollar).** Total stablecoin market capitalization on **2028-12-31**,
USD billions, as shown by DefiLlama's stablecoins dashboard (all pegs; USD-pegged are
~99% today). Give P10 / P50 / P90.

**Q5 (binary, reversing the Accord).** Before **2031-01-01**, will the Federal Reserve
(FOMC or Board), alone or jointly with the Treasury, **announce a numerical ceiling or target
for the yield of any US Treasury security with remaining maturity of at least one year** (yield
curve control, as in 1942-51)? Ordinary QE without a stated yield level, operation-twist-style
purchases, and Treasury buybacks do not count.

**Q6 (continuous, labor to capital).** The **calendar-2030 annual average** of the BLS
nonfarm business sector **labor share** (percent, as published in Productivity and Costs;
2026Q2 = 52.8%). Give P10 / P50 / P90. (For scale: the essay's claim implies a fall
comparable to the 1980-2020 decline in a decade.)

**Q7 (binary, the bottom K).** Will the combined reported employee headcount of TCS,
Infosys, HCLTech, Wipro and Tech Mahindra at their quarter ending **31 March 2029** be
**at least 10% below** the same combined figure at **31 March 2026**? (Company-reported
period-end headcount in each quarterly results release; an acquired firm's staff count.)

### Orchestrator's question audit (Step 1.4)

- **No vacuous clauses.** Each binary has a single condition. Q1 bands are half-open on one
  number and cover the real line: exactly one regime matches, no lexical rule needed beyond
  the stated inclusive lower bounds.
- **Composition traps.** Q1 excludes finance leases on purpose (Microsoft's and Oracle's
  headlines include them); a panelist pricing the companies' headline "capex incl. leases"
  prices a different, larger number. Oracle and xAI/OpenAI/Stargate spending are OUT of Q1.
  Q6 is the BLS *percent* labor share, not the index PRS85006173 (2017=100). Q4 counts all
  pegs, including euro, but non-USD pegs are ~1% today.
- **Resolvability.** Epoch publishes training-cost estimates with a lag and revises them;
  the 2029-12-31 snapshot is the resolver and a model whose cost is "unknown" there does not
  count. LMArena's organization labels are taken as published; a Paris- or London-headquartered
  subsidiary of a US parent counts as US (ultimate parent rule).

## Output discipline (every panelist)

- Answer **all seven** questions through your own lens. The output is a data payload
  consumed by `tetlock_aggregate.py`, not a message to a human.
- Binary answers (Q2, Q3, Q5, Q7) are integers from 1 to 99. Continuous answers (Q4, Q6)
  satisfy P10 < P50 < P90. Q1 is four non-negative numbers A, B, C, D summing to 100.
- **Do not hedge toward the obvious centre.** Lens purity is the ensemble's value;
  splitting the difference destroys the variance information and is a failure, not caution.
- Open with a one- or two-sentence BLUF. Cite primary-source URLs inline. Preserve source
  caveats (sample sizes, intervals, subgroup limits) verbatim; never compress a noisy
  estimate into an unqualified headline.
- Read-only: web search and page reading only. Do not write files other than your one
  seat file, do not launch other agents, do not open interactive browsers.
- End your reply with ONE fenced ```json block exactly in this shape:

```json
{"q1": {"A": 0, "B": 0, "C": 0, "D": 0},
 "q2": 50, "q3": 50,
 "q4": {"p10": 0, "p50": 0, "p90": 0},
 "q5": 50,
 "q6": {"p10": 0, "p50": 0, "p90": 0},
 "q7": 50}
```
