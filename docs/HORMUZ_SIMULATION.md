# Hormuz disruption simulation

This module extends the critical-materials work from a fixed-input mineral
network into a monthly transport-and-energy stock-flow model. It does **not**
treat an unavailable barrel like an unavailable gram of cobalt: oil and LNG
clear through prices, demand response, inventories, rerouting, and alternative
supply. Export-side storage and shut-ins are tracked separately so stranded
production is not subtracted twice.

Run the central gradual-reopening case:

```bash
node --import tsx scripts/hormuz-scenario.ts
```

Other cases:

```bash
node --import tsx scripts/hormuz-scenario.ts --scenario=short-disruption
node --import tsx scripts/hormuz-scenario.ts --scenario=prolonged-closure
```

## Physical structure

The monthly sequence is:

1. reduce normal Hormuz throughput;
2. route oil through the Saudi/UAE bypass, subject to its ramp and capacity;
3. add slow non-Gulf supply response;
4. draw mobilizable commercial/strategic stocks at a rate limit;
5. clear remaining oil and LNG demand through a short-run elasticity that rises
   as conservation and substitution become possible;
6. fill Gulf export storage, then shut in stranded crude;
7. propagate LNG and physical shipping stress into fertilizer application,
   crop yields, and harvest availability. Prices clear on the traded margin,
   while a separate judgment share prevents non-traded fertilizer supply from
   being incorrectly removed from global crop application;
8. allocate physical and price incidence across the eight global-model regions.

The annual bridge sends four sparse paths to the main simulation:

- global and regional oil/gas price multipliers to `demand`;
- regional physical fuel availability and trade-income factors to `demand`;
- same-year non-electric energy availability to `production`;
- fertilizer-linked yield and food-availability multipliers to `resources`.

Production applies the same-year physical shock to lagged *potential* thermal
energy. Demand separately reports served energy. This avoids counting a
one-year closure again in the year after it ends.

## Frozen public anchors

- EIA's 1H25 chokepoint data report 20.9 mb/d of oil through Hormuz,
  including 14.7 mb/d crude/condensate and 6.1 mb/d products, plus 11.4 Bcf/d
  LNG. Saudi and UAE pipelines together could bypass about 4.7 mb/d.
  [EIA World Oil Transit Chokepoints](https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/)
- EIA's 2026 STEO reports Q1 Hormuz oil traffic averaging 14.6 mb/d.
  [EIA Short-Term Energy Outlook](https://www.eia.gov/outlooks/steo/report/energysecurity/article.php)
- EIA reported about 7.5 mb/d of March crude shut-ins across affected Gulf
  exporters as storage filled.
  [EIA, April 7 2026](https://www.eia.gov/pressroom/releases/press586.php)
- The World Bank estimated an initial net global oil-supply reduction around
  10 mb/d, a 31% fertilizer-price increase, and a 60% urea increase.
  [World Bank Commodity Markets Outlook, April 2026](https://www.worldbank.org/en/news/press-release/2026/04/28/commodity-markets-outlook-april-2026-press-release)
- The IMF reports that oil settled around $90–$100 after the initial spike and
  that buffers were being depleted by July.
  [IMF, July 15 2026](https://www.imf.org/en/blogs/articles/2026/07/15/the-oil-market-absorbed-the-war-shock-but-buffers-are-running-low)
- The IMF estimates roughly one-third of fertilizer shipments normally cross
  Hormuz.
  [IMF, March 30 2026](https://www.imf.org/en/blogs/articles/2026/03/30/how-the-war-in-the-middle-east-is-affecting-energy-trade-and-finance)

Monthly throughput after February is reconstructed from these aggregates and
described as an assumption in the scenario data; it is not presented as a
reported monthly series.

## Backcast discipline

The calibration grid sees only:

- Q1 average transit;
- March net global oil loss;
- March oil-price multiple;
- March Gulf crude shut-ins.

It does not see Q2/July oil prices or the fertilizer observations. The oil
holdouts land inside their reported ranges. The single fertilizer basket peaks
near 1.9x, above the broad observed basket and closer to the urea tail. That miss
is retained in the score. A credible V2 should split ammonia, urea, phosphate,
and potash; give each its own origin, route, gas-feedstock exposure, planting
calendar, and importer inventory.

## Limits

- Regional exposures are transparent judgments, not a fitted bilateral trade
  matrix. India and Southeast Asia are consequently directional results.
- MENA combines domestic energy abundance with Gulf export losses; country
  results require splitting the region.
- The model omits refinery crude-quality matching, tanker queues, sanctions,
  war-risk insurance as a separate balance sheet, and financial contagion.
- The global model is annual. It captures same-year physical fuel loss, while
  burden and food feedbacks continue through its existing one-year lags.
- GDP magnitudes inherit the global model's disputed useful-energy elasticity.
  The report therefore prints low (0.08), middle (0.30), and default Ayres-Warr
  (0.55) sensitivity cases rather than presenting one GDP point as settled.
- Scenario paths are conditional stress tests, not probabilities.
