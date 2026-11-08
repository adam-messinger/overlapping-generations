# The Commanding Heights, tested against the model

Will Manidis and Joe Roberts, *The Commanding Heights* (commanding-heights.com,
2026-10-29; ~40,000 words, 153 notes). This note records which of its claims this
model can speak to, what the model said before and after two fixes the exercise
exposed, and where the Tetlock panel (`docs/forecasts/commanding-heights-2026/`) lands.

Reproduce: `npx tsx scripts/commanding-heights.ts`.

## The essay's core claims

| # | Claim (essay's words where quoted) | Modelable here? |
|---|---|---|
| 1 | **Genesis.** Frontier models commoditize within months (price of a capability level falls ~13x/yr; -47%/quarter). Labs keep spending: "rational capital allocation at the level of the lab or hyperscaler can destroy capital in the aggregate"; there "may never be a signal that tells participants to stop building". | Partly: the aggregate cost of a sustained datacenter boom with and without an output payoff (T2). No labs, prices or margins. |
| 2 | **The Line.** AI capex, stock prices and capability are "the same line". Training cost x3.5/yr ($1B 2026 -> $3.5B -> $10B); hyperscaler capex >$400B (2025) -> ~$800B (2026) -> "soon over $1T"; capex +70%/yr vs operating cash flow +23%/yr; Washington backstops it via retirement savings and the Treasury. | The arithmetic against the US economy (T1) and the macro cost (T2). No equity market. |
| 3 | **Principalities and Powers.** Only the US and China can keep building frontier models; sovereign and commercial frontiers split; the Fed will re-peg Treasury yields as in 1942-51. | Only where compute physically sits (T5). Labs, model quality and the Fed are outside the model. |
| 4 | **Superscription.** AI drives demand for a stablecoin "Neo-Dollar"; Washington "carries its costs through debasement", taxing savers. | Only the real-terms channel: the safe rate held below its market level (T4). No price level, no money, no stablecoins. |
| 5 | **The World to Come.** Diffusion hits the rich world's back office first (India's IT services); "as much transfer from labor to capital in the next decade as the previous wage-to-financial economy produced in forty years". | The labor share under automation (T3). No sectoral employment, so not India's IT services. |
| 6 | **The Commanding Heights.** Durable value goes to distribution, payment and dollar chokepoints, not to model builders. | No. The model has no firms, margins or market structure. |
| 7 | **The Firm / Alpha and Omega.** Firms shrink to a few operators directing models; venture becomes trading; investors must rebuild portfolios. | No. |

For scale on claim 5: the BLS nonfarm labor share index (FRED `PRS85006173`, 2017=100)
went 112.1 (1980) -> 102.3 (2020) and 108.4 (1985) -> 96.0 (2025), about -5.5 to -7 pp of the
percent share, which stood at 52.8% in 2026Q2.

## Two fixes the exercise exposed

Testing claims 2 and 3 showed two calibration errors in the datacenter block, both now fixed:

1. **Datacenter capex was a third of observed spend.** The composite chips + facility cost was a
   $15B per average GW judgment anchor, which charged ~$0.24T in 2025 and ~$0.27T in 2026 against
   Dell'Oro's ~$0.71T of 2025 worldwide datacenter capex and ~$0.73T of 2026 Big-4 guidance alone.
   Now $45B per average GW (Dell'Oro-calibrated; bottom-up $38-49B per facility GW from Epoch AI,
   Van Nieuwerburgh, Foxconn and Morgan Stanley), with a 2025 magnitude anchor.
2. **Datacenter load was sited by GDP share.** That put 15% of world compute in the US (86 TWh,
   against IEA's ~183 TWh in 2024) and 36% in the US and China (IEA: ~70%). Now sited by IEA's
   observed 2024 split (US 45%, China 25%, Europe 15%), held fixed.

Consequences, attributed by running each change alone: the cost fix lowers default GDP in 2100
by 17% (1,967 -> 1,634 $T) because datacenters are a GDP-neutral sink by default
(`aiWorkerEquivalentPerTWh = 0`) that now absorbs three times as much of the shared investment
pool; the siting fix raises 2050 grid intensity 94 -> 112 kg/MWh because compute now sits on the
fossil-heavier US and Chinese grids. `ai-energy-boom`, which turns the cognitive-labour payoff on,
now ends 2100 *below* the default (~$1,055T vs ~$1,634T; it was ~$3,956T at $15B/GW). The
regression baseline was re-blessed with this attribution.

The default's zero payoff is a modelling choice (datacenter services' value is in the measured
GDP of the sectors buying them), not a finding. It makes "capital destruction in aggregate" true
by construction on the default path. T2 therefore asks the question the other way round: what
payoff does the boom need?

## What the model says, before and after the fixes

### T1. The Line hits the macro budget around 2030-31 (arithmetic, unchanged by the fixes)

Projecting the essay's own rates against a nominal US GDP path (IMF 2026 level, the model's real
US growth, 2.5% inflation): Big-4 capex at +70%/yr passes 3% of US GDP in 2027, 10% in 2030 and
all of US gross private investment (~18% of GDP) in 2031. A single frontier training run at x3.5/yr
passes 1% of US GDP in 2031 and 5% in 2033. Neither rate can run past about 2030 without
non-US financing or a reallocation of most US investment. The essay's near-term numbers ($3.5B and
$10B runs in 2027-28, $1T capex) are inside the budget; its "the line will be sustained" is not,
beyond ~2030.

### T2. Genesis: the boom needs ~1.3 kW per worker-equivalent to pay for itself

`line` = datacenter base growth doubled to 0.30 and the power-spend ceiling loosened 10x.

| | before fixes | after fixes |
|---|---|---|
| baseline datacenter capex 2030 | $0.44T | $1.30T |
| `line` datacenter capex 2030 / 2035 | $2.2T / $11.1T | $6.7T / $32.2T |
| `line` with no payoff: GDP 2040 vs baseline | -5.6% | -9.8% |
| `line` with no payoff: cumulative 2026-40 GDP lost | $68T | $121T |
| payoff at which cumulative 2026-40 GDP breaks even | ~47k worker-eq/TWh (~2.4 kW each) | ~89k worker-eq/TWh (~1.3 kW each) |
| return on capital 2035, `line` vs baseline | +0.2 pp | +0.6 pp |

Read: a sustained line pays for itself by 2040 only if each ~1.3 kW of continuous datacenter
load (roughly one accelerator with its facility overhead) does the work of a full-time worker,
averaged over the whole fleet. Below that, the essay's "capital destruction in the aggregate" holds
in the model; above it, it does not. The `line` also needs ~17,000 TWh of datacenter load by 2035,
about 40% of the baseline's world electricity: the model never lets power bind (no interconnection
queue), which flatters the line.

### T3. Labor to capital: the essay's size needs a payoff, and comes with it

| run | labor share change 2026-36 |
|---|---|
| baseline, or `line` with no payoff | -0.4 pp |
| `line`, payoff 25k/TWh | -4.3 pp |
| `line`, payoff 50k/TWh | -7.8 pp |
| `line`, break-even payoff ~89k/TWh | about -12 pp |
| `ai-energy-boom` | -3.5 pp |

(unchanged by the fixes to one decimal.) The essay's decade-equals-forty-years transfer (-5.5 to
-7 pp) appears in the model only when compute substitutes for labor at ~35-45k worker-equivalents
per TWh (interpolated). In that band the boom also does NOT repay its capital by 2040 (cumulative
2026-40 GDP about -$53T to -$67T). So the model's reading is that the essay's two claims are jointly consistent in one
band: AI good enough to move a decade of labor share to capital, not good enough to pay back
the build. Above the break-even the labor-share fall is roughly twice the essay's figure. (The
model's labor share is a world compensation share in a monetary-circuit closure, ~65% in 2025;
read changes, not levels.)

### T4. Debasement as repression: savers pay, the debt ratio falls

| financial repression | safe rate 2030 | public debt/GDP 2050 | household interest forgone 2026-50 | GDP 2050 |
|---|---|---|---|---|
| none | 1.2% | 0.99 | - | - |
| 1 pp | 0.1% | 0.80 | $56T | +1.5% |
| 2 pp | -1.1% | 0.67 | $108T | +1.7% |
| 3 pp | -2.2% | 0.57 | $158T | +2.0% |

(Before the fixes the GDP gain was +2.1% to +3.0%; the other columns are unchanged.) With r_safe
already ~2.5 pp below growth, the world debt ratio barely rises on the default path and the
model's fiscal-dominance trigger (150% of world GDP) never binds to 2050. Repression does what the
essay says to bondholders, and in this model it also raises output, because the safe rate prices
energy project debt. The model cannot say whether the Fed will peg yields; it says the world
aggregate does not need it by 2050. The US alone (~100% debt held by the public, rising) is
outside the model.

### T5. Principalities: compute sits in two countries

After the siting fix, 70% of datacenter load is in the US and China (45% + 25%), matching IEA,
against 36% before. This is calibration to the observed concentration, not a forecast that it
persists: the share is held fixed.

## What the model cannot test

The essay's central claim (claim 6: value accrues to chokepoints, not labs), the stablecoin
Neo-Dollar, the sovereign frontier, the Fed peg and India's IT-services employment are all outside
the model's structure. The Tetlock panel covers them.
