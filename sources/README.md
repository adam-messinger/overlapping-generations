# Sources for Energy Simulation

This folder contains reference materials for the simulation's demographics and climate modules.

## Climate Module Sources

### 1. DICE-2023 (Nordhaus/Barrage)
- URL: https://www.pnas.org/doi/10.1073/pnas.2312030121
- "Policies, projections, and the social cost of carbon: Results from the DICE-2023 model"
- Key insights:
  - Damage coefficient: 3.1% GDP loss at 3°C, 7.0% at 4.5°C
  - Damage coefficient nearly doubled from DICE-2016
  - Social cost of carbon: $66/tCO₂ (2020)
  - Quadratic damage function: D(T) = a × T²

### 2. Weitzman Fat Tails
- URL: https://scholar.harvard.edu/files/weitzman/files/fattaileduncertaintyeconomics.pdf
- "On Modeling and Interpreting the Economics of Catastrophic Climate Change"
- Key insights:
  - Climate sensitivity has fat-tailed distribution
  - Catastrophic outcomes (small probability) can dominate expected value
  - Standard CBA may break down with unbounded damages
  - Solution: bound marginal utility or use risk-weighted approaches
  - Our implementation: cap damages at 30% GDP

### 3. Farmer/Way (INET Oxford)
- URL: https://www.doynefarmer.com/environmental-economics
- "Empirically grounded technology forecasts and the energy transition"
- Key insights:
  - Traditional IAMs underestimate technology learning curves
  - Solar cost has fallen 99.6% since 1976
  - Agent-based models better handle nonequilibrium effects
  - Wright's Law (learning curves) applies to energy technologies

### 4. Tipping Points Economics
- URL: https://www.pnas.org/doi/10.1073/pnas.2103081118
- "The economic impacts of large-scale climate tipping points"
- Key insights:
  - 6 tipping points likely triggered below 2°C
  - Tipping points increase SCC by ~25% on average
  - 10% chance of tipping points more than doubling SCC
  - AMOC collapse risk underestimated

### 5. IPCC AR6
- URL: https://www.ipcc.ch/report/ar6/wg1/
- Climate sensitivity range: 2.0-4.5°C per CO₂ doubling (best estimate: 3.0°C)
- Current warming: ~1.2°C above preindustrial
- Atmospheric CO₂: ~420 ppm

### 6. IEA Emissions Data
- URL: https://www.iea.org/data-and-statistics
- 2025 estimates used for calibration:
  - Total CO₂: ~35 Gt/year
  - Electricity sector: ~10 Gt
  - Non-electricity (transport, industry, heating): ~25 Gt

## Climate Model Calibration Targets

| Metric | Target | Source |
|--------|--------|--------|
| Total emissions 2025 | ~35 Gt CO₂ | IEA |
| Electricity emissions 2025 | ~10 Gt CO₂ | IEA |
| Grid intensity 2025 | ~340 kg CO₂/MWh | Computed |
| Temperature 2025 | 1.2°C | NASA |
| Atmospheric CO₂ 2025 | 420 ppm | NOAA |
| Climate sensitivity | 2.0-4.5°C (default 3.0) | IPCC AR6 |
| Damage at 3°C (OECD) | ~1.7% GDP | DICE-2023 × 0.8 |
| Damage at 3°C (ROW) | ~3.8% GDP | DICE-2023 × 1.8 |
| Max damage cap | 30% GDP | Weitzman bounded |

## Validation Scenarios

1. **Business as Usual** (carbon $0): Emissions plateau ~2040, 3-4°C by 2100
2. **Paris-aligned** (carbon $100+): Peak 2030, <2°C achievable
3. **Aggressive** (carbon $150, high learning): Near-zero by 2070

---

## Demographics Module Sources

## Key Papers and Resources

### 1. Fernández-Villaverde Slides: "The Demographic Future of Humanity"
- URL: https://sas.upenn.edu/~jesusfv/Slides_London.pdf
- Key insights: Global TFR already below replacement, population peaks 2050-2060, then declines

### 2. NBER Working Paper 29480: "Demographic Transitions Across Time and Space"
- URL: https://www.nber.org/papers/w29480
- Authors: Fernández-Villaverde, Greenwood, Guner
- Key insight: Fertility convergence happening faster than expected globally

### 3. "The Wealth of Working Nations" (Fernández-Villaverde, Ventura, Yao)
- SSRN: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5036580
- Key insight: GDP per working-age adult is better metric than per capita

### 4. Mercatus Center Interview
- URL: https://www.mercatus.org/macro-musings/jesus-fernandez-villaverde-demographic-trends-recent-macroeconomic-developments-and
- Key quotes:
  - "The present of Japan is the future of the world"
  - Global fertility 2023: ~2.17 (below replacement of ~2.21)

### 5. Public Discourse: "The Demographic Future of Humanity"
- URL: https://www.thepublicdiscourse.com/2021/10/78340/
- Accessible summary of the demographic transition thesis

## Model Calibration Targets (from sources above)

| Metric | Target | Source |
|--------|--------|--------|
| Global Pop 2025 | ~8.3B | Current data |
| Population Peak | ~9.5B, 2055-2060 | Fernández-Villaverde |
| Pop 2100 | ~8-9B (declining) | Fernández-Villaverde |
| China 2100 | ~700M (50% decline) | Fernández-Villaverde |
| Global Dependency 2075 | ~44% | Model projection |
| China steepest aging | Yes | Low TFR effect |
