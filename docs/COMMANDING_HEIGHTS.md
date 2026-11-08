# The Commanding Heights, tested against the model

Will Manidis and Joe Roberts, *The Commanding Heights* (commanding-heights.com,
2026-10-29; ~40,000 words, 153 notes). This note records which of its claims this
model can speak to, what the model says after two fixes the exercise
exposed (now on main), and where the Tetlock panel (`docs/forecasts/commanding-heights-2026/`) lands.

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

Testing claims 2 and 3 showed two calibration errors in the datacenter block. Both were fixed in
this work and landed on main through adam-messinger/overlapping-generations#129, which combined
them with a datacenter brake on total cost of ownership refitted at the new cost:

1. **Datacenter capex was a third of observed spend.** The composite chips + facility cost was a
   $15B per average GW judgment anchor, which charged ~$0.24T in 2025 and ~$0.27T in 2026 against
   Dell'Oro's ~$0.71T of 2025 worldwide datacenter capex and ~$0.73T of 2026 Big-4 guidance alone.
   Now $45B per average GW (Dell'Oro-calibrated; bottom-up $38-49B per facility GW from Epoch AI,
   Van Nieuwerburgh, Foxconn and Morgan Stanley), with a 2025 magnitude anchor.
2. **Datacenter load was sited by GDP share.** That put 15% of world compute in the US (86 TWh,
   against IEA's ~183 TWh in 2024) and 36% in the US and China (IEA: ~70%). Now sited by IEA's
   observed 2024 split (US 45%, China 25%, Europe 15%), held fixed.

The siting fix is the one with a large regional effect: the US carries ~1,650 TWh of datacenter
load in 2050 and its 2050 grid intensity is ~164 kg/MWh (fossil share 25%; ~58 with GDP siting
when #129 measured it), while
China's and OECD-ex-US grids are fossil-free by 2050 in the default run. Default datacenters stay
a GDP-neutral sink (`aiWorkerEquivalentPerTWh = 0`): that is a modelling choice (their services'
value sits in the measured GDP of the sectors buying them), not a finding, and it makes "capital
destruction in aggregate" true by construction on the default path. T2 therefore asks the
question the other way round: what payoff does the boom need?

## What the model says

### T1. The Line hits the macro budget around 2030-31 (arithmetic, unchanged by the fixes)

Projecting the essay's own rates against a nominal US GDP path (IMF 2026 level, the model's real
US growth, 2.5% inflation): Big-4 capex at +70%/yr passes 3% of US GDP in 2027, 10% in 2030 and
all of US gross private investment (~18% of GDP) in 2031. A single frontier training run at x3.5/yr
passes 1% of US GDP in 2031 and 5% in 2033. Neither rate can run past about 2030 without
non-US financing or a reallocation of most US investment. The essay's near-term numbers ($3.5B and
$10B runs in 2027-28, $1T capex) are inside the budget; its "the line will be sustained" is not,
beyond ~2030.

### T2. Genesis: the boom pays for itself at ~2.9 kW per worker-equivalent

`line` = datacenter base growth doubled to 0.30 and the total-cost spend ceiling loosened 10x (as
in `ai-energy-boom`). Payoff = `production.aiWorkerEquivalentPerTWh`, the full-time workers whose
output each TWh of datacenter load replaces (0 by default).

**What counts as paying.** The test is what people get: cumulative 2026-40 consumption (household
plus public services) plus the capital stock left in 2040 (general, robot and datacenter, so
datacenters still standing count, and so does the general capital they crowded out), each against
the baseline. GDP is the wrong test. GDP that holds level while datacenter capex absorbs more of
it means less consumption. An earlier version of this note scored GDP and reported break-even at
~17k worker-equivalents per TWh; at that payoff the boom still costs ~$78T of value.

| run (current main) | cum. GDP vs base | cum. extra DC capex | cum. consumption vs base | capital 2040 vs base | **value vs base** |
|---|---|---|---|---|---|
| `line`, no payoff | -$67T | $216T | -$78T | -$50T | **-$128T** |
| payoff 25k/TWh | +$30T | $232T | -$52T | +$1T | **-$52T** |
| payoff 35k/TWh | +$72T | $240T | -$38T | +$21T | **-$16T** |
| payoff 45k/TWh | +$114T | $247T | -$19T | +$39T | **+$20T** |
| payoff 75k/TWh | +$250T | $270T | +$46T | +$92T | **+$137T** |
| `ai-energy-boom` | +$89T | $58T | +$33T | +$28T | **+$61T** |

Break-even on value is ~40k worker-equivalents per TWh: each ~2.9 kW of continuous datacenter
load (two to three accelerators with their facility overhead) has to do a full-time worker's job,
averaged over the whole fleet. On consumption alone it is ~55k (~2.1 kW). Below it, the essay's
"capital destruction in the aggregate" holds; above it, it does not. The model cannot say which
side the real world is on: the payoff is an input, not an output. Two limits on the reading: the
2040 cut-off (datacenter capital depreciates 15% a year, so later payoffs are only partly counted
through the 2040 stock), and power never binds in the model (the `line` needs ~16,100 TWh of
datacenter load by 2035, about 40% of the baseline's world electricity).

For the panel-origin model (commit 46df211) the GDP-scored break-even was ~47k; main has since
changed production (constant returns, #136) and capital (#127, #134).

### T3. Labor to capital: the essay's size lands on break-even

| run (current main) | labor share change 2026-36 | value 2026-40 vs base |
|---|---|---|
| baseline | -0.3 pp | - |
| `line`, no payoff | -0.3 pp | -$128T |
| payoff 25k/TWh | -4.2 pp | -$52T |
| payoff 35k/TWh | -5.6 pp | -$16T |
| payoff 45k/TWh | -7.0 pp | +$20T |
| payoff 75k/TWh | -10.9 pp | +$137T |
| `ai-energy-boom` | -3.4 pp | +$61T |

The essay's decade-equals-forty-years transfer (-5.5 to -7 pp) appears at a payoff of ~35-45k
worker-equivalents per TWh, the band in which the build crosses break-even (value -$16T to
+$20T). So the essay's two claims meet at the boundary: AI good enough to move a decade of labor
share to capital is just about good enough to repay the build by 2040, neither clearly destroying
capital nor clearly creating it. Two caveats on what this shows:

- **The pairing is built in.** The labor share falls only because AI worker-equivalents' income is
  paid to capital, so a large labor-share shift with no AI output cannot occur in the model. It
  cannot test the two claims independently.
- **The model's labor share** is a world compensation share in a monetary-circuit closure (~65%
  in 2025): read changes, not levels.

### T4. Debasement as repression: savers pay, the debt ratio falls

| financial repression | safe rate 2030 | public debt/GDP 2050 | household interest forgone 2026-50 | GDP 2050 |
|---|---|---|---|---|
| none | 1.1% | 1.07 | - | - |
| 1 pp | 0.0% | 0.89 | $48T | +1.7% |
| 2 pp | -1.1% | 0.76 | $94T | +2.3% |
| 3 pp | -2.2% | 0.65 | $139T | +2.4% |

(Current main. On the panel-origin model world debt ended lower, 0.98 without repression, and
1 pp cost bondholders $56T.) With r_safe already ~2.3 pp below growth, the world debt ratio rises
only from ~0.9 to ~1.07 by 2050 on the default path, and the model's fiscal-dominance trigger
(150% of world GDP) never binds before 2050. Repression does what the
essay says to bondholders, and in this model it also raises output, because the safe rate prices
energy project debt. The model cannot say whether the Fed will peg yields; it says the world
aggregate does not need it by 2050. The US alone (~100% debt held by the public, rising) is
outside the model.

### T5. Principalities: compute sits in two countries

With IEA siting, 70% of datacenter load is in the US and China (45% + 25%), against 36% when it
was spread by GDP share. US datacenter load is ~254 TWh in 2025 and ~793 TWh in 2035. This is
calibration to the observed concentration, not a forecast that it persists: the share is held
fixed. Its cost shows up on the US grid (2050 grid intensity ~164 kg/MWh, above).

## What the model cannot test

The essay's central claim (claim 6: value accrues to chokepoints, not labs), the stablecoin
Neo-Dollar, the sovereign frontier, the Fed peg and India's IT-services employment are all outside
the model's structure. The Tetlock panel covers them.

## The Tetlock panel (24 seats, origin 2026-11-08)

Full report: `docs/forecasts/commanding-heights-2026/REPORT.md`. Raw means:

- Big-4 capex 2030/2026: broken (<1x) 30%, plateau (1-2x) 41%, sustained (2-4x) 25%, the
  essay's line (>=4x) 4%.
- An Epoch-costed >= $10B training run by end-2028: 24%.
- LMArena top ten all US/China at end-2028: 70% (median 76%).
- Stablecoins at end-2028: $230B / $377B / $669B (P10/P50/P90; ~$308B today).
- A Fed numerical yield cap before 2031: 6%.
- BLS labor share 2030 average: 49.6 / 51.9 / 54.2% (52.8% in 2026Q2).
- Indian IT big-5 headcount down 10% by March 2029: 11%.

Model and panel agree on the shape of the answer. The essay's directions hold up: capex
rising, the labor share falling, compute concentrated in two countries. Its magnitudes do not:
the line cannot run past ~2030 on arithmetic (T1), and the panel puts its named milestones at
4-24%. Whether the build destroys capital turns on how much work each kilowatt of compute
does, and the essay's own labor-share claim puts it right at the model's break-even (T2-T3).
