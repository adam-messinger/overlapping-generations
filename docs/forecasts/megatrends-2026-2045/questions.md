# Four megatrends, 2026-2045: locked question set

**Forecast origin:** 2026-11-07. **Panel:** K = 4 efforts x 6 single-skill seats (24),
per `.claude/skills/tetlock-ensemble-forecasting`. This file is the shared preamble
every panelist receives verbatim.

## The topic

How four structural megatrends interact over 2026-2045:

1. Solar- and battery-driven electrification (falling LCOE, grid storage, capital front-loading).
2. Embodied AI and robotics (autonomous transport, manufacturing automation, cognitive and
   physical labour substitution).
3. Demographic contraction (sub-replacement fertility, inverted dependency ratios, OLG
   saving and dissaving).
4. Deglobalization and geopolitical fragmentation (reshoring, fractured supply chains,
   retreat from multilateral trade rules).

Outputs of interest: trade volumes and composition, neutral real rates and capital
scarcity, sovereign debt sustainability, and comparative GDP trajectories (US, China,
EU, non-aligned emerging markets).

## Baselines at the forecast origin (orchestrator-verified; panelists may re-verify)

| Quantity | Latest value | Source |
|---|---|---|
| World trade (% of GDP), World Bank WDI `NE.TRD.GNFS.ZS` | 2022 62.42, 2023 58.20, **2024 56.76** | WDI via YCharts / Statista |
| World merchandise trade volume | +3.9% 2026, +4.1% 2027 forecast; H1-2026 value +15% y/y vs volume +3.5% (Middle East conflict, AI goods) | WTO Global Trade Outlook, 8 Oct 2026 |
| Digitally delivered services exports | **$5.26T in 2025** (+10.0%), ~55% of services exports | WTO data via JETRO 2026 |
| US 10y TIPS real yield (FRED `DFII10`) | **~2.9% (2 Oct 2026)**; Sep-2026 reopening 2.653%, highest since 2008 | FRED via thetrading.tools; TIPSwatch |
| NY Fed HLW r* (US) | 1.65% 2026Q2, 1.73% 2026Q1, 1.36% 2025Q1 (secondary report; not confirmed on NY Fed page) | IBTimes summary of NY Fed |
| US net interest (% GDP) | 3.2% FY2025 -> **4.6% FY2036** projected; debt held by public 101% (2026) -> 120% (2036) | CBO Budget and Economic Outlook, Feb 2026 (via CRFB) |
| US / China nominal GDP 2026 | ~$31.8T / ~$20.7T (ratio ~0.65); growth 2.3% / 4.5% | IMF WEO Oct 2026 (nominal figures via secondary press, unverified) |

## Accounting and scope locks

- **Nominal vs real:** Q1 and Q5 are ratios of current-price values; commodity-price and
  exchange-rate swings move them without any change in volumes. Q2 is current USD.
  Q3 is a real yield. Q4 is a ratio to nominal GDP.
- **Vintage rule:** each question resolves on the **first** publication of the stated
  series that contains the target year, and compares within that one vintage. Later
  revisions do not re-resolve.
- **Geography:** "US" is the federal government (Q4) or the United States (Q3, Q5).
  "China" is the People's Republic of China excluding Hong Kong, Macao and Taiwan (IMF `CHN`).
- **Fallback resolver:** if a named series is discontinued, the closest successor published
  by the same institution; if none, the question is cancelled (not resolved No).

## Questions

**Q1 (binary, trade volume and openness).** Will the World Bank WDI value of world trade
(exports plus imports of goods and services, % of GDP; indicator `NE.TRD.GNFS.ZS`, World
aggregate) for **2035** be **below** the 2024 value reported in the same vintage?
Resolver: the first WDI release containing 2035 (expected mid-2037).

**Q2 (continuous, trade composition).** World exports of **digitally delivered services**
in calendar **2035**, current **USD trillions**, as first published by the WTO (WTO-UNCTAD-ITC
estimates). Give P10 / P50 / P90.

**Q3 (continuous, r* and capital scarcity).** Calendar-**2035 average** of the US 10-year
TIPS real yield, FRED series `DFII10` (daily, percent). Give P10 / P50 / P90.

**Q4 (binary, sovereign debt).** Will US federal **net interest outlays be at least 4.5% of
GDP in fiscal year 2035**, per CBO's Historical Budget Data (first release containing
FY2035 actuals)? For reference, CBO's February 2026 baseline sits at roughly this level
for 2035 (4.6% in 2036).

**Q5 (binary, national divergence).** In the **IMF WEO October 2036** database, will
China's GDP in current US dollars for **2035** be **at least 75%** of US GDP in current
US dollars for 2035 (`NGDPD`, CHN / USA)? The ratio is ~0.65 in 2026 and peaked near
0.76 in 2021.

**Q6 (regimes, 2045 end-state; MECE by lexical priority, first match wins).**

| Order | Regime | Condition |
|---|---|---|
| 1 | **A  Fiscal dominance** | US federal net interest >= 6.0% of GDP in FY2045 (CBO Historical Budget Data), **or** any G7 sovereign restructures or defaults on marketable central-government debt, or enters an IMF lending arrangement, during 2036-2045 |
| 2 | **B  Capex-led abundance** | Not A, and world real GDP growth (IMF WEO, PPP weights) averages >= 3.75% a year over 2041-2045 |
| 3 | **C  Secular stagnation returns** | Not A or B, and the US 10y TIPS yield (`DFII10`) averages <= 1.00% over calendar 2041-2045 |
| 4 | **D  Fragmented middle (residual)** | None of the above. D is the catch-all |

Probabilities must be non-negative and sum to 100.

### Orchestrator's question audit (Step 1.4)

- **No vacuous clauses.** Q6-A's disjunction is genuine: a G7 restructuring can occur
  without US net interest reaching 6%.
- **Overlaps resolved by order.** A world with US net interest at 6.5% *and* 4% growth
  resolves A, not B. A world with 4% growth and TIPS at 0.8% resolves B. Name your
  reasoning by the lexical order, not by the regime's label.
- **Composition traps.** Q1 and Q5 are nominal; a 2035 oil-price spike or a renminbi
  revaluation moves them mechanically. Q2's "digitally delivered" is the WTO-UNCTAD
  measurement, which has been revised upward between vintages; the vintage rule applies.
- **Resolvability.** Every series exists and is published annually or daily today.
  `DFII10` has been published since 2003; CBO historical net interest since 1940.

## Output discipline (every panelist)

- Answer **all six** questions through your own lens. The output is a data payload
  consumed by `tetlock_aggregate.py`, not a message to a human.
- Binary answers are integers from 1 to 99. Continuous answers satisfy P10 < P50 < P90.
  Q6 is four non-negative numbers summing to 100.
- **Do not hedge toward the obvious centre.** Lens purity is the ensemble's value;
  splitting the difference destroys the variance information and is a failure, not caution.
- Open with a one- or two-sentence BLUF. Cite primary-source URLs inline. Preserve source
  caveats (sample sizes, intervals, subgroup limits) verbatim; never compress a noisy
  estimate into an unqualified headline.
- Read-only: web search and page reading only. Do not write files outside your scratch
  directory, do not launch other agents, do not open interactive browsers.
