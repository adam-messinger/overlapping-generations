# Ocean Acidification Sources

## Key Papers

### 1. Caldeira & Wickett (2003) "Anthropogenic carbon and ocean pH"
- **Journal**: Nature 425, 365
- **URL**: https://www.nature.com/articles/425365a
- **Key result**: Ocean surface pH drops ~0.3–0.4 units per CO₂ doubling
- **Our calibration**: `phSensitivity = 0.32` pH units per CO₂ doubling
- **Mechanism**: CO₂ dissolves in seawater → carbonic acid → lowers pH
- **Log-linear approximation**: pH ≈ pH₀ - α × log₂(CO₂/CO₂₀)

### 2. Jacobson (2005) "Studying Ocean Acidification with Conservative, Stable Numerical Schemes"
- **Journal**: J. Geophysical Research 110, D07302
- **Key result**: Preindustrial ocean surface pH ≈ 8.18
- **Our calibration**: `preindustrialPH = 8.18`

## Implementation

```
oceanPH = preindustrialPH - phSensitivity × log₂(co2ppm / preindustrialCO2)
```

## Calibration Targets

| CO₂ (ppm) | Expected pH | Source |
|------------|-------------|--------|
| 280 (preindustrial) | 8.18 | Jacobson (2005) |
| ~418 (2025) | ~8.06 | NOAA ocean observations |
| 560 (2×CO₂) | 7.86 | Caldeira & Wickett (2003) |

## Supporting References

- **NOAA Pacific Marine Environmental Laboratory**: Current ocean pH observations (~8.06 at ~418 ppm)
  - URL: https://www.pmel.noaa.gov/co2/story/Ocean+Acidification
- **IPCC AR6 WG1 Ch. 5**: Ocean carbon cycle and acidification projections
  - URL: https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-5/
- **Orr et al. (2005)**: "Anthropogenic ocean acidification over the twenty-first century and its impact on calcifying organisms" — Nature 437, 681–686
  - Projected pH decline of 0.3–0.5 units by 2100 under high-emission scenarios
