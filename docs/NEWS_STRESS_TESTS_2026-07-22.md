# News-driven stress tests — 22 July 2026

This suite turns seven questions from the July 2026 news cycle into small,
auditable simulations.  Each model separates observed inputs from fitted
parameters and scenario judgments.  Ebola was explicitly removed from scope
because the available alignment checks blocked a defensible run.

The models are stress tests, not unconditional forecasts.  Where only one
historical event is available, an exact backcast fit is evidence that the
mechanism can reproduce the event—not evidence that its current scenario is
correct.

## Results at a glance

| Question | Historical discipline | Central conditional result | Confidence |
|---|---|---|---|
| Does an AI buildout cushion a prolonged Hormuz shock? | Matched 2×2 runs use the already calibrated Hormuz bridge | 2026 GDP is 2.29% below its matched no-war path with or without AI; the interaction remains within about ±0.03 percentage point through 2035 | High confidence that the *current model* has little interaction; low confidence that reality does, because AI load is not regionalized |
| What if Hormuz and Bab el-Mandeb are impaired together? | Fit Cape rerouting to 2024; hold out 1H25 Cape flow (9.21 modeled versus 9.10 mb/d observed) | First-month intended Red Sea oil availability falls to 37.5%, then about 55.9% after the Cape queue fills; effective global container capacity falls about 10%; the empirical delay mapping peaks at a 1.30pp import-inflation impulse five months later | Medium for routing and delay; low-to-medium for CPI translation |
| Can U.S. defense magnet sourcing meet a January 2027 cutoff? | Dynamic inventory/bottleneck mechanism inherits the rare-earth event test; classified qualification and inventory inputs remain scenarios | An abrupt cutoff produces a 45.5% minimum output ratio and 4.97 output-months lost. A gradual waiver bridge plus faster qualification avoids curtailment in the central case | Low-to-medium; policy comparison is more informative than levels |
| Which heat adaptations jointly protect lives, food, and power? | Mortality scale fits France's preliminary 5,764 excess deaths; age gradient comes from Europe 2022; adaptation counterfactual is literature-anchored | Targeted cooling cuts deaths about 40% but nearly consumes the power reserve. The combined package cuts deaths 66%, seasonal exposed-crop loss from 7.5% to 4.1%, and leaves a 7.4GW reserve | Medium for mortality direction; low-to-medium for level; crop and grid blocks are engineering scenarios |
| Will India's 50% platinum-drug price relief end shortages? | 2023 cisplatin model fits national volume and center-shortage surveys; held-out utilization decline is 14% modeled versus 15% observed | A 50% increase narrowly prevents a service break when raw-material cost is 1.8× baseline. At 2.1× cost it provides only about 88% minimum service, so it is not a universal threshold | Medium for mechanism, low-to-medium for the India level because manufacturer costs are not public |
| How large are the new Canada and Brazil tariff shocks? | Pass-through and sector substitution use 2018 USITC estimates; the failed one-elasticity version is retained as a retro | Canada's 50% headline applies to about $20B of $389B of imports: roughly +0.08pp U.S. CPI and −0.4% Canadian GDP for a full year. Brazil: roughly +0.01pp U.S. CPI and −0.1% Brazilian GDP | Medium for order of magnitude; legal duration and retaliation are unresolved |
| Can sovereign repricing become a nonbank fire-sale spiral? | UK 2022 feedback fit reproduces £36B sales and a 140bp peak; a one-pass version predicts only £1B of sales | A UK-only 100bp shock is manageable under post-LDI buffers but leaks 1–2bp into Treasuries and JGBs through global funds. A synchronous shock has a parameter-sensitive cliff around 170bp in the central balance sheets; safeguards move it beyond 300bp | Medium for nonlinear mechanism, low for the numerical cliff |

## 1. War × AI capital demand

The experiment crosses baseline/AI parameters with no-war/prolonged-Hormuz
parameters.  Comparing each war path with its matched no-war path avoids
crediting AI for growth it would have produced anyway.

The near-zero interaction is diagnostically useful.  Data-center load grows
from 692TWh in 2026 to 3,528TWh in 2035, yet the global model does not assign
that load to the grids, gas markets, financing pools, or regions most exposed
to the war.  A future nonzero answer requires those links; simply making the
AI scenario larger would not fix the mechanism.

Code: `src/simulations/news/war-ai.ts`; runner:
`scripts/news-war-ai.ts`.

## 2. Serial maritime chokepoints

The routing model treats Hormuz → Bab el-Mandeb → Suez/SUMED as serial edges
with a delayed Cape alternative.  It removes Hormuz-overlapping barrels before
applying the Bab shock, which prevents counting the same lost cargo twice.
The only fitted shipping coefficient is the share of blocked Bab oil that
keeps its destination and goes around the Cape: 51%.

The principal empirical anchors are the [EIA chokepoint data](https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/),
the [UNCTAD Review of Maritime Transport](https://unctad.org/publication/review-maritime-transport-2024),
and the IMF estimate that a 100-hour delay raises inflation about 0.5pp at a
five-month peak in [From Ports to Prices](https://ideas.repec.org/p/imf/imfwpa/2026-026.html).
The 35% overlap between Hormuz and Bab oil is still a transparent judgment.

Code: `src/simulations/critical-materials/shipping-network.ts`; runner:
`scripts/multi-chokepoint-scenario.ts`.

## 3. Defense permanent-magnet qualification

The defense model distinguishes four things that headline capacity numbers
collapse together: physically commissioned capacity, defense-qualified
capacity, waiver supply, and specification-matched inventory.  The distinction
explains why a new plant can exist while a downstream weapon system is still
input-constrained.

The January 2027 date comes from the [DFARS restriction](https://www.acq.osd.mil/DPAP/dars/dfars/changenotice/2024/20240729/dfars-changes-20240729.pdf).
DOD said its investments were intended to support all defense requirements by
2027 in its [mine-to-magnet update](https://www.defense.gov/News/News-Stories/Article/Article/3700059/dod-looks-to-establish-mine-to-magnet-supply-chain-for-rare-earth-materials/),
but neither public source establishes how much capacity will be qualified by a
specific month.  Accordingly, the 35% starting coverage and project sizes are
scenarios and are printed in the sensitivity table.

Code: `src/simulations/critical-materials/defense-sourcing.ts`; runner:
`scripts/defense-sourcing-scenario.ts`.

## 4. Acute heat: mortality × food × power

The event model combines day and night thermal load, three age groups,
cooling access and grid uptime, crop extreme-degree-days, irrigation, and
cooling electricity.  It is deliberately not presented as a replacement for a
distributed-lag epidemiological model.

Mortality evidence comes from the [2022 European age-specific study](https://www.nature.com/articles/s41591-023-02419-z),
the [2023 adaptation counterfactual](https://www.nature.com/articles/s41591-024-03186-1),
and [compound day/night heat research](https://www.nature.com/articles/s41467-025-62871-y).
Crop response uses the nonlinear extreme-heat result in
[Schlenker and Roberts](https://www.nature.com/articles/nclimate1832), while
the power block is checked against a European [air-conditioning adaptation study](https://www.nature.com/articles/s41598-023-31469-z).

An illustrative older and 1.3°C/1.5°C hotter French repeat in 2035 raises
modeled deaths 52% under unchanged adaptation.  The combined package lowers
them 48% below the 2026 current-adaptation count, illustrating that aging and
warming are not destiny if adaptation arrives first.

Code: `src/simulations/heat/`; runner: `scripts/heat-adaptation-scenario.ts`.

## 5. Essential generic-drug access

The cisplatin reconstruction separates national product releases from local
hospital access.  That revision was necessary because 2023 releases recovered
above their prior level while most surveyed cancer centers still reported a
shortage.  The fitted points are Intas's market share/output loss, Q3 national
volume, and June/September center surveys.  A fixed access-friction coefficient
then predicts the held-out 15% utilization decline.

The 2026 policy experiment uses India's reported 50% increases for cisplatin
and carboplatin.  The result is nonlinear: price relief works only if it clears
the actual cost shock and lasts long enough for production to ramp.  Even then,
it does not qualify a redundant plant or reward quality.

Sources include the [2023 volume study](https://academyhealth.confex.com/academyhealth/2025arm/meetingapp.cgi/Paper/70656),
the [cancer-center surveys](https://ascopost.com/news/october-2023/chemotherapy-shortages-ongoing-according-to-new-survey/),
the [FDA root-causes report](https://www.fda.gov/drugs/drug-shortages/report-drug-shortages-root-causes-and-potential-solutions),
and [USP shortage evidence](https://www.usp.org/news/long-lasting-drug-shortages-drive-average-duration-higher-disrupting-patient-care).

Code: `src/simulations/drug-supply/`; runner:
`scripts/generic-drug-scenario.ts`.

## 6. Bilateral tariffs and input-output propagation

The first version applied each headline rate broadly and used one trade
elasticity.  Both choices failed:

1. The Canada order covers about $20B of $389B of imports, so 50% becomes a
   2.57pp average increase, consistent with the published 3.1%-to-5.6% change.
2. An elasticity fitted to the 2018 aluminum tariff predicts a 63% steel import
   decline, versus 24% in the USITC evaluation.  The revision uses
   sector-specific substitution and passes costs through a small use table.

The Canada scope is documented in the [AP analysis](https://apnews.com/article/trump-tariffs-canada-great-depression-trade-ece841a9c029d20be16c065f9a0eccfc)
and [White House order](https://www.whitehouse.gov/fact-sheets/2026/07/fact-sheet-president-donald-j-trump-imposes-additional-tariffs-on-canada/).
Brazil's product list is in the [USTR action](https://ustr.gov/about/policy-offices/press-office/press-releases/2026/july/ustr-section-301-action-brazils-unreasonable-acts-policies-and-practices).
Historical calibration uses the [USITC 2018 tariff evaluation](https://www.usitc.gov/sites/default/files/publications/332/pub5405.pdf).

Code: `src/simulations/trade/`; runner:
`scripts/bilateral-tariff-scenario.ts`.

## 7. Sovereign–nonbank contagion

The model iterates collateral calls → forced sales → dealer-capacity-dependent
yield changes → new collateral calls.  Global relative-value funds liquidate
across Treasuries, gilts, and JGBs, so a local shock can move otherwise
unshocked markets.  Direct sovereign mark-to-market losses and repo/prime-broker
gap losses then reach bank capital.

The UK 2022 retro is the strongest demonstration of why iteration matters.  A
one-pass calculation sees only £1B of forced sales.  With fitted feedback gain
of 0.972, it reaches the observed £36B and amplifies a 70bp fundamental move to
140bp.  This fit uses the [Bank of England's December 2022 report](https://www.bankofengland.co.uk/financial-stability-report/2022/december-2022)
and [gilt intervention review](https://www.bankofengland.co.uk/quarterly-bulletin/2023/2023/financial-stability-buy-sell-tools-a-gilt-market-case-study).

Current structure is anchored by the [BIS 2026 Annual Economic Report](https://www.bis.org/publ/arpdf/ar2026e2.htm):
NBFIs hold 53% of advanced-economy sovereign debt, central banks 17%, and about
70% of bilateral dollar repos with hedge funds have zero haircuts.  The exact
170bp cliff in the central scenario is not a forecast.  It is the point at
which these illustrative balance sheets hit a liquidation cap; the robust
finding is the discontinuity and the large improvement from ex-ante buffers.

Code: `src/simulations/financial-contagion/`; runner:
`scripts/financial-contagion-scenario.ts`.

## Reproduction

```bash
node --import tsx scripts/news-war-ai.ts
node --import tsx scripts/multi-chokepoint-scenario.ts
node --import tsx scripts/defense-sourcing-scenario.ts
node --import tsx scripts/heat-adaptation-scenario.ts
node --import tsx scripts/generic-drug-scenario.ts
node --import tsx scripts/bilateral-tariff-scenario.ts
node --import tsx scripts/financial-contagion-scenario.ts
```

All current inputs are public and require no account.  Better second versions
would benefit from licensed AIS voyage data, USP's detailed Medicine Supply
Map, manufacturer cost/quality data, transaction-level trade data, and
confidential fund/repo exposures.  Those are improvements, not prerequisites
for reproducing this suite.
