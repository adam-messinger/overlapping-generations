# Energy Learning Rates: Literature Review

Comparison of our model against Doyne Farmer (Oxford/INET) and Ramez Naam's research.

## Wright's Law Refresher

```
cost(t) = cost₀ × cumulative^(-α)
```

When cumulative doubles, cost multiplier = 2^(-α)

| α (alpha) | Cost reduction per doubling |
|-----------|----------------------------|
| 0.10 | 7% |
| 0.15 | 10% |
| 0.20 | 13% |
| 0.25 | 16% |
| 0.32 | 20% |
| 0.40 | 24% |
| 0.51 | 30% |
| 0.74 | 40% |

---

## Solar PV

### Literature Findings

| Source | Learning Rate | Period | Notes |
|--------|--------------|--------|-------|
| [Farmer/Way 2022 (Joule)](https://www.cell.com/joule/fulltext/S2542-4351(22)00410-X) | ~10%/year decline | Historical | Consistent exponential |
| [Ramez Naam 2020](https://rameznaam.com/2020/05/14/solars-future-is-insanely-cheap-2020/) | 30-40% per doubling | 2010-2020 | R² > 0.9 fit |
| [DOE/LBNL](https://www.energy.gov/eere/wind/articles/learning-better-way-forecast-wind-and-solar-energy-costs) | 24% full-period | Historical | Normalized for external factors |
| [Our World in Data](https://ourworldindata.org/learning-curve) | 20% per doubling | 1976-2019 | 19.3% precise |
| IEA (traditional) | 10-20% per doubling | Forecast | Consistently too conservative |

### Cost Projections

| Source | 2030 | 2040 | Notes |
|--------|------|------|-------|
| Naam | $10-20/MWh (sunny) | $10/MWh | At 30% learning rate |
| Farmer/Way | Cheaper than fossil | Much cheaper | Fast transition saves $12T |

### Our Model vs Literature

| Parameter | Our Model | Literature | Assessment |
|-----------|-----------|------------|------------|
| α (alpha) | 0.20 | 0.32-0.51 | **Too conservative** |
| Implied learning | 13%/doubling | 20-30%/doubling | Should increase |
| Growth rate | 20%/year | 40%/year historical | Conservative but reasonable |
| 2025 cost | $50/MWh | ~$30-40/MWh | Slightly high |

**Recommendation**: Increase solar α to 0.36 (25% learning rate) as default, with slider allowing 0.20-0.50.

---

## Wind

### Literature Findings

| Source | Learning Rate | Notes |
|--------|--------------|-------|
| DOE/LBNL | 15% per doubling | Full-period normalized |
| DOE/LBNL | 40-45% accelerated | 2010-2020 (may be correction) |
| Naam | Slower than solar | More mature technology |
| Farmer | 20-25%/year growth | Deployment rate |

### Our Model vs Literature

| Parameter | Our Model | Literature | Assessment |
|-----------|-----------|------------|------------|
| α (alpha) | 0.10 | 0.23 | **Too conservative** |
| Implied learning | 7%/doubling | 15%/doubling | Should double |
| Growth rate | 12%/year | 20-25%/year | Too low |
| 2025 cost | $45/MWh | ~$30-40/MWh | Slightly high |

**Recommendation**: Increase wind α to 0.23 (15% learning rate), growth to 15%.

---

## Battery Storage

### Literature Findings

| Source | Learning Rate | Notes |
|--------|--------------|-------|
| [Naam 2014](https://rameznaam.com/2014/09/30/the-learning-curve-for-energy-storage/) | 20% per doubling | Li-ion projection |
| Farmer | ~10%/year decline | Similar to solar |
| BloombergNEF | 18% per doubling | Historical trend |

### Our Model vs Literature

| Parameter | Our Model | Literature | Assessment |
|-----------|-----------|------------|------------|
| α (alpha) | 0.18 | 0.32 | **Somewhat conservative** |
| Implied learning | 12%/doubling | 18-20%/doubling | Should increase |
| Growth rate | 35%/year | 30-40%/year | Good |
| 2025 cost | $150/kWh | ~$130-150/kWh | Good |

**Recommendation**: Increase battery α to 0.26 (18% learning rate).

---

## Summary: Recommended Model Updates

| Technology | Current α | Recommended α | Learning Rate |
|------------|-----------|---------------|---------------|
| Solar | 0.20 | 0.36 | 25% |
| Wind | 0.10 | 0.23 | 15% |
| Battery | 0.18 | 0.26 | 18% |

### Growth Rates

| Technology | Current | Recommended |
|------------|---------|-------------|
| Solar | 20%/year | 25%/year |
| Wind | 12%/year | 18%/year |
| Battery | 35%/year | 35%/year |

### Starting Costs (2025)

| Technology | Current | Recommended |
|------------|---------|-------------|
| Solar | $50/MWh | $35/MWh |
| Wind | $45/MWh | $35/MWh |
| Battery | $150/kWh | $140/kWh |

---

## Key Insight from Farmer

> "Most energy-economy models have historically underestimated deployment rates for renewable energy technologies and overestimated their costs."

Our original parameters were closer to IEA-style conservative forecasts. The Farmer/Naam literature suggests we should be more aggressive—and even then may still underestimate the transition speed.

## Sources

- [Farmer/Way et al. 2022 - Joule](https://www.cell.com/joule/fulltext/S2542-4351(22)00410-X)
- [Ramez Naam - Solar's Future is Insanely Cheap](https://rameznaam.com/2020/05/14/solars-future-is-insanely-cheap-2020/)
- [Ramez Naam - Battery Learning Curve](https://rameznaam.com/2014/09/30/the-learning-curve-for-energy-storage/)
- [DOE/LBNL Learning Rate Study](https://www.energy.gov/eere/wind/articles/learning-better-way-forecast-wind-and-solar-energy-costs)
- [Our World in Data - Learning Curves](https://ourworldindata.org/learning-curve)
- [INET Oxford Summary](https://www.inet.ox.ac.uk/news/going-big-and-fast-on-renewables-could-save-trillions)
