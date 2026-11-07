ADAPTER OUTPUT (scripts/tetlock-sim-adapter.ts --spec=docs/forecasts/megatrends-2026-2045/adapter-spec.json). Rows = readings, columns = runs.

| Q | status | reading | baseline | net-zero | ai-energy-boom | tech-stagnation | ssp3-70 | debt-populism | L:electrification-fast | L:electrification-slow | L:ai-robotics-boom | L:ai-robotics-stall | L:demography-deeper-contraction | L:fragmentation | L:fragmentation-no-defence-deficit | C:fortress-automation | C:fiscal-stress |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| q3 | directional | real lending rate change 2026->2035, pp | 0.15 | 0.18 | 0.19 | 0.03 | 0.14 | 0.95 | 0.17 | 0.15 | 0.19 | 0.14 | 0.15 | 0.39 | 0.16 | 0.45 | 0.86 |
| q3 | directional | debt risk premium 2035, pp | 1.36 | 1.06 | 1.35 | 1.54 | 1.53 | 2.58 | 1.31 | 1.38 | 1.35 | 1.34 | 1.36 | 1.57 | 1.33 | 1.52 | 2.03 |
| q4 | directional | world public interest / GDP 2035, % | 5.39 | 5.16 | 5.43 | 5.44 | 5.53 | 8.95 | 5.37 | 5.41 | 5.43 | 5.37 | 5.39 | 6.11 | 5.37 | 6.12 | 7.73 |
| q4 | directional | world public debt / GDP 2035 | 0.87 | 0.83 | 0.87 | 0.90 | 0.90 | 1.25 | 0.87 | 0.88 | 0.87 | 0.87 | 0.87 | 0.94 | 0.87 | 0.94 | 1.10 |
| q5 | directional | China/US PPP GDP ratio 2026 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 | 1.39 |
| q5 | directional | China/US PPP GDP ratio 2035 | 1.57 | 1.61 | 1.57 | 1.52 | 1.56 | 1.52 | 1.57 | 1.57 | 1.57 | 1.57 | 1.57 | 1.58 | 1.58 | 1.58 | 1.57 |
| q5 | directional | China real GDP growth 2026->2035, %/yr | 3.66 | 4.67 | 3.73 | 3.01 | 3.18 | 2.52 | 3.86 | 3.53 | 3.73 | 3.67 | 3.66 | 3.67 | 3.69 | 3.95 | 3.60 |
| q5 | directional | US real GDP growth 2026->2035, %/yr | 2.25 | 3.00 | 2.31 | 2.00 | 1.85 | 1.55 | 2.45 | 2.12 | 2.31 | 2.26 | 2.25 | 2.20 | 2.22 | 2.47 | 2.19 |
| q6 | identified | world real GDP growth 2040->2045, %/yr | 3.58 | 4.48 | 3.90 | 3.45 | 2.73 | 2.10 | 3.97 | 3.21 | 3.90 | 3.57 | 3.56 | 3.46 | 3.53 | 4.24 | 3.34 |
| q6 | identified | real lending rate change 2026->2045, pp (directional, C leg) | 0.31 | 0.73 | 0.95 | 0.20 | 0.24 | 1.97 | 0.43 | 0.23 | 0.95 | 0.22 | 0.31 | 0.72 | 0.28 | 1.51 | 1.60 |
| q6 | identified | world public interest / GDP 2045, % (directional, A leg) | 5.09 | 4.90 | 5.50 | 5.24 | 5.41 | 12.21 | 5.00 | 5.15 | 5.50 | 5.02 | 5.10 | 6.24 | 5.06 | 6.58 | 8.96 |

REFUSALS: q1: no trade block: the macro model has no exports, imports, tariffs or exchange rates; q2: no services-trade or nominal-USD representation

DISCLOSURES (read before quoting any figure):
- PPP BASE: regional and world GDP are PPP in 2017 international dollars (world ~$158T in 2025). Growth rates and ratios are invariant to the deflator base; LEVELS are not comparable to market-exchange-rate or nominal-USD figures. A nominal-USD level question is NOT identified.
- DEMOGRAPHY: the demographic path tracks the UN WPP LOW variant by deliberate low-fertility-convergence choice (CLAUDE.md). Labour-force, dependency and growth readings are low-fertility-conditional.
- RATES: capital.interestRate is the model's economy-wide real lending rate (~6% in 2025), not r*, not a policy rate and not a market yield. There is no term premium. Use CHANGES, never the level.
- NO TRADE BLOCK: the macro model has no bilateral trade, tariffs, exchange rates or current accounts. Trade-volume and trade-composition questions are not representable; fossil-fuel CONSUMPTION is.
- NO PRICE LEVEL: no CPI/PCE, no nominal anything, no asset prices. Nominal-GDP and inflation questions are not representable.
- FIXED FACTOR SHARES: laborCompensation/GDP stays ~65.5% across all lever settings, so the model cannot speak to AI eroding the labour tax base. Extreme labour substitution breaks the stock-flow ledger.
- FISCAL: public debt follows an exogenous structural primary deficit (capital.publicDeficitRate); interest is tax-financed by construction. It is a world aggregate, not a US or any single-sovereign fiscal path.
- LEVER PROXIES: the 'lever:' variants are this panel's stylized settings, not calibrated scenarios. Electrification = learning rates plus background end-use adoption pressure; AI/robotics = the ai-energy-boom levers (cognitive-labour payoff on, low integration friction); demography = fertility floors x0.8, which barely moves the 2045 workforce because it is already born; fragmentation = wider regional financing spreads and home bias, 60% less migration, a higher energy risk premium and a primary deficit 1 pp higher for defence.
- INTERACTIONS: in an 81-run factorial of these levers (2026-11-07 exploratory session) every pairwise GDP interaction at 2045 was below 0.4 log points: the model treats the four trends almost additively over this horizon. Strong non-linear interactions, if real, come from mechanisms outside the model (factor shares, politics, trade).
- US vs WORLD: Q4 is a US federal ratio; the model's public debt and interest are world aggregates under an exogenous primary deficit. Read only the sign and rough size of changes across runs.
- Q5 is NOMINAL USD. The model's China/US ratio is PPP and real; it speaks only to the relative real-growth leg, not to prices or the exchange rate.