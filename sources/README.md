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

### 7. Ocean Acidification
- **Caldeira & Wickett (2003)** "Anthropogenic carbon and ocean pH" — Nature 425, 365
  - URL: https://www.nature.com/articles/425365a
  - pH drop ~0.3–0.4 units per CO₂ doubling; our calibration: 0.32
- **Jacobson (2005)** preindustrial ocean surface pH = 8.18
- **NOAA PMEL**: Current observations ~8.06 at ~418 ppm
  - URL: https://www.pmel.noaa.gov/co2/story/Ocean+Acidification
- See also: `Caldeira-Wickett-Ocean-Acidification.md`

| Metric | Target | Source |
|--------|--------|--------|
| pH at 280 ppm | 8.18 | Jacobson (2005) |
| pH at ~418 ppm (2025) | ~8.06 | NOAA observations |
| pH at 560 ppm (2×CO₂) | 7.86 | Caldeira & Wickett (2003) |

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

### 6. Fernández-Villaverde & Norrick (2026): "Terra Incognita: The Economics of a Shrinking World"
- File: `fernandez-villaverde/Fernandez-Villaverde-Norrick-2026-Terra-Incognita.pdf`
- NBER Working Paper 35809 / CEPR DP21956 (September 2026)
- **The demographics module's calibration anchor** (fertility floors and convergence speeds)
- Key findings:
  - Humanity is likely below replacement in 2026: world TFR "at most 2.19" against a
    world replacement rate of ~2.20 (Supplemental Material A-B; WPP Medium says 2.23)
  - World population peaks at "roughly 9 billion around 2056", then falls "first slowly,
    then fast"; WPP 2024 Medium delays the fall to 2084 (10.29B)
  - Their reading "matches the UNPD's 'Low Variant' scenario much better than its 'Medium
    Variant'" (Low peaks at 8.949B in 2053); births since WPP 2024 "seem to be falling
    even below the Low Variant" (Egypt, Mexico, Philippines registry data)
  - Single-factor (Lee-Carter style) model on 236 countries, 1950-2023: the common factor
    peaked in 1978; country-specific trends now drive the decline, "219 of them negative and
    not one leveling off" (about -0.062 births per woman per year on average)
  - Middle-income countries below rich ones: Thailand 0.87, Colombia 1.01, Iran 1.35,
    Mexico 1.51, Brazil 1.52 (2025); Republic of Congo 5.1 -> 3.5 in a decade, 0.3 below
    the WPP Low Variant
  - WPP projections are mean-reverting and revised down every edition (world TFR
    2025-30: 2.38 in WPP 2019 -> 2.22 in WPP 2024)
- How the model uses it: regional floors are fit to the WPP 2024 Low variant 2030-2100
  (`scripts/wpp-fertility-paths.py`) with convergence slowed x0.7, so the world path
  peaks at ~9.0B in 2054 and 2026 world TFR is 2.12. The WPP Medium path is the opt-in
  `scenarios/un-wpp-medium.json`

## Model Calibration Targets (from sources above)

| Metric | Target | Source |
|--------|--------|--------|
| Global Pop 2025 | ~8.2B | UN WPP 2024 (2025 estimate) |
| 2025 age structure | 65+ ~0.86B; births ~132M | UN WPP 2024 (2025 estimate) |
| World TFR 2026 | ≤2.19, below replacement (~2.20) | Fernández-Villaverde & Norrick (2026) |
| Population Peak | ~9B, circa 2056 | Fernández-Villaverde & Norrick (2026); WPP Low 8.95B in 2052-53 |
| Pop 2100 | ~7-8B (declining) | WPP Low 6.99B; F-V & N "slightly less aggressive" than Low |
| China 2100 | 0.41-0.65B | WPP 2024 Low / Medium (incl. HK, Macao, Taiwan) |
| Global Dependency 2075 | ~44-48% | Model projection |
| China steepest aging | Yes | Low TFR effect |
| China college share 2025 | ~22% | World Bank |
| China tertiary enrollment 2025 | ~60% | UNESCO |
| China college peak | ~2040 | Model projection |

---

## Education Module Sources

### 1. World Bank Education Data
- URL: https://data.worldbank.org/indicator/SE.TER.ENRR
- Tertiary enrollment rates by country
- Key data:
  - OECD average: ~55%
  - China: ~60% (2023)
  - India: ~32%
  - Sub-Saharan Africa: ~9%

### 2. OECD Education at a Glance
- URL: https://www.oecd.org/education/education-at-a-glance/
- Key insights:
  - College wage premium: 1.4-1.8× in OECD countries
  - Employment rate premium: 5-10 percentage points
  - Educational attainment rising globally

### 3. Chetty et al. (2016): "The Association Between Income and Life Expectancy"
- URL: https://jamanetwork.com/journals/jama/fullarticle/2513561
- JAMA paper on income and life expectancy in the US
- Key insights:
  - 10-15 year life expectancy gap between top and bottom income deciles
  - Education is major correlate of income
  - Gap has been widening over time
  - Used to calibrate differential mortality by education

### 4. Meara et al. (2008): "The Gap Gets Bigger"
- URL: https://pubmed.ncbi.nlm.nih.gov/18350212/
- Educational gradients in mortality
- Key insights:
  - 3-4 year life expectancy difference by education level
  - Gap has increased over time
  - Effect persists across countries

### 5. UNESCO Education Data
- URL: https://data.unesco.org/
- Global enrollment statistics
- China tertiary enrollment growth from ~15% (2000) to ~60% (2023)

## Education Model Calibration Targets

| Metric | Target | Source |
|--------|--------|--------|
| China enrollment 2025 | ~60% | UNESCO |
| OECD enrollment 2025 | ~55% | World Bank |
| China college share 2025 | ~22% | Model estimate |
| OECD college share 2025 | ~40% | OECD |
| OECD wage premium 2025 | 1.5× | OECD |
| China wage premium 2025 | 1.8× | Higher scarcity |
| College life bonus (OECD) | +3 years | Chetty et al. |
| China college peak | ~2040 | 15 years after total peak |
| Global college share 2050 | ~36% | Model projection |
