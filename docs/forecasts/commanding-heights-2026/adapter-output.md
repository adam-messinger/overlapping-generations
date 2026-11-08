
The Commanding Heights, 2026-2031: conditional structural bounds only. identified = quotable conditional on the run; directional = context, never a point estimate.

q1 [DIRECTIONAL] DC capex CAGR 2026->2030, %/yr
    baseline                 12.762
    ai-energy-boom           20.194
    debt-populism            12.284
    lever:dc-fast            39.241
    lever:dc-fast-ai-payoff  39.424
    lever:repression-2pp     13.706
q1 [DIRECTIONAL] DC capex 2030, $T (understated level)
    baseline                 0.435
    ai-energy-boom           0.695
    debt-populism            0.428
    lever:dc-fast            2.226
    lever:dc-fast-ai-payoff  2.239
    lever:repression-2pp     0.461
q1 [DIRECTIONAL] total investment CAGR 2026->2030, %/yr
    baseline                 3.609
    ai-energy-boom           3.572
    debt-populism            2.651
    lever:dc-fast            3.566
    lever:dc-fast-ai-payoff  3.546
    lever:repression-2pp     3.342
q5 [DIRECTIONAL] world public debt / GDP 2030
    baseline                 0.889
    ai-energy-boom           0.887
    debt-populism            1.073
    lever:dc-fast            0.890
    lever:dc-fast-ai-payoff  0.883
    lever:repression-2pp     0.804
q5 [DIRECTIONAL] repression gap 2030, pp
    baseline                 0.000
    ai-energy-boom           0.000
    debt-populism            0.000
    lever:dc-fast            0.000
    lever:dc-fast-ai-payoff  0.000
    lever:repression-2pp     2.000
q5 [DIRECTIONAL] real safe rate change 2026->2030, pp
    baseline                 0.173
    ai-energy-boom           0.186
    debt-populism            0.798
    lever:dc-fast            0.172
    lever:dc-fast-ai-payoff  0.207
    lever:repression-2pp     -0.086
q6 [DIRECTIONAL] labor share change 2026->2030, pp
    baseline                 -0.108
    ai-energy-boom           -0.752
    debt-populism            -0.107
    lever:dc-fast            -0.108
    lever:dc-fast-ai-payoff  -1.915
    lever:repression-2pp     -0.109
q6 [DIRECTIONAL] labor share change 2026->2036, pp
    baseline                 -0.352
    ai-energy-boom           -3.502
    debt-populism            -0.336
    lever:dc-fast            -0.350
    lever:dc-fast-ai-payoff  -13.973
    lever:repression-2pp     -0.363

REFUSALS (do not derive these from the model):
  q2: no model-training or lab block; datacenter capex is a fleet composite
  q3: no representation of model quality, labs or national AI capability
  q4: no money, payments or crypto representation
  q7: no sectoral employment or offshoring block; India is a GDP/demography region only

DISCLOSURES:
  * PPP BASE: regional and world GDP are PPP in 2017 international dollars (world ~$158T in 2025). Growth rates and ratios are invariant to the deflator base; LEVELS are not comparable to market-exchange-rate or nominal-USD figures. A nominal-USD level question is NOT identified.

  * DEMOGRAPHY: the default fertility path follows Fernandez-Villaverde & Norrick (2026): world peak ~9.0B in 2054, 2100 ~7.5B (UN WPP Medium: 10.29B in 2084), a deliberate low-fertility choice (CLAUDE.md). Labour-force, dependency and growth readings are conditional on it; scenarios/un-wpp-medium.json gives the UN Medium view.

  * RATES: three real rates. capital.interestRate is the return on capital plus the debt premium (~7% in 2025, firms' cost of capital); capital.safeRate (~1%) is paid on public debt and capital.loanRate (~3%) on private bank debt. The safe rate follows trend growth and public debt (Holston-Laubach-Williams; Laubach 2009) and can be held down by financial repression (repressionGap). It is not a policy rate or a market yield. There is no term premium. Use CHANGES, never the level.

  * NO TRADE BLOCK: the macro model has no bilateral trade, tariffs, exchange rates or current accounts. Trade-volume and trade-composition questions are not representable; fossil-fuel CONSUMPTION is.

  * NO PRICE LEVEL: no CPI/PCE, no nominal anything, no asset prices. Nominal-GDP and inflation questions are not representable.

  * LABOUR SHARE: laborShare (world compensation / GDP, ~65% in 2025, not comparable to national-accounts or BLS levels) is endogenous to automation only: robot and AI worker-equivalents' income since 2025 is paid to capital (capital.automationIncomeToCapital). AI cognitive payoff is off by default (production.aiWorkerEquivalentPerTWh = 0), so the default path barely moves it. Use changes across runs.

  * FISCAL: public debt follows an exogenous structural primary deficit (capital.publicDeficitRate) plus a borrowed share of ageing costs, less a Bohn fiscal reaction; interest at the safe rate accumulates into the debt. It is a world aggregate, not a US or any single-sovereign fiscal path.

  * MODEL VINTAGE: read against the repository as of the panel origin (2026-11-08, commit 46df211). The orchestrator found, during this run, that the model's datacenter capex is ~2.5-3x below observed 2025-26 spending ($15B per average GW of load) and that its datacenter load is spread across regions by GDP share rather than where compute sits. Treat every datacenter-capex LEVEL as understated; use growth rates only, and only directionally.

  * DATACENTER CAPEX is a WORLD composite (chips + facilities) proportional to electricity-load additions plus 15% replacement, booked in the year the load arrives (no construction lead). It is not the Big-4's cash capex; it has no lab, no hyperscaler and no stock market. Its growth is endogenous to GDP, LCOE and a willingness-to-pay ceiling on the DC power bill.

  * LABOR SHARE in the model is world labor compensation / GDP in a monetary-circuit closure (2025 level ~0.65, NOT comparable to BLS 52.8%). It falls only as robot and AI worker-equivalents' income is paid to capital; AI cognitive payoff is OFF by default (aiWorkerEquivalentPerTWh = 0). Use the change across runs only.

  * NO MONETARY BLOCK: no price level, no Fed, no yields, no stablecoins. 'financialRepression' is a real-rate lever on the world safe rate; fiscal dominance triggers only above 150% WORLD public debt/GDP.

  * LEVER PROXIES: 'lever:dc-fast' doubles base datacenter growth and loosens the power-spend ceiling 10x (closest the model gets to the essay's line); '-ai-payoff' also turns on cognitive-labour payoff at the ai-energy-boom setting.

