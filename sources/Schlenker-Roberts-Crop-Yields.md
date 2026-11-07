# Schlenker & Roberts (2009): Nonlinear Temperature Effects on Crop Yields

## Core Thesis
Crop yields do not respond linearly to temperature. Instead, they exhibit a **highly nonlinear threshold effect**.
*   **Moderate Warming:** Is beneficial or neutral up to a certain point (optimum).
*   **Extreme Heat:** Causes a precipitous collapse in yields once a specific thermal threshold is crossed.

## The Mechanism: Degree Days
The authors decompose temperature exposure into two metrics:

### 1. Growing Degree Days (GDD)
*   **Definition:** Time spent within the optimal growth range (e.g., 10°C to 29°C for corn).
*   **Effect:** **Positive**. Accumulating GDD increases yield.
*   **Saturation:** The benefit plateaus; you can't force a plant to grow infinitely fast.

### 2. Killing Degree Days (KDD) / Extreme Heat
*   **Definition:** Time spent *above* the critical threshold (e.g., >29°C for corn, >30°C for soybeans, >32°C for cotton).
*   **Effect:** **Catastrophic Negative**.
*   **The Cliff:** The damage function is not linear; it is extremely steep. One day at 40°C can undo weeks of perfect growing weather.
*   **Reason:** At these temperatures, the plant's enzyme activity (rubisco) fails, photosynthesis shuts down, and the plant essentially goes into shock or dies.

## Quantitative Findings
*   **Thresholds:**
    *   Corn: 29°C
    *   Soybeans: 30°C
    *   Cotton: 32°C
*   **Impact:** A scenario with significant warming (e.g., +4°C) leads to yield declines of **30-46%** (slowest warming) to **63-82%** (fastest warming) by end-of-century, assuming no magical adaptation.

## Implications for Modeling
A model that assumes a constant +1% yield growth per year regardless of temperature (like the current simulation) is **physically wrong**.
*   **Reality:** Technology (GDD efficiency) fights against Climate (KDD damage).
*   **Result:** In high warming scenarios, the "KDD penalty" overwhelms the technological progress, causing net yield *declines*.

## How the model uses this (2026 recalibration)
The model's yield factor responds to **global mean** warming and scales the
**world** average yield. Schlenker & Roberts' threshold is in **local daily**
temperature for US corn, soy and cotton. Transferring their cliff to the
global aggregate is a category error: world yields average thousands of
locations, seasons and crops, most far from 29-32°C on most days, so the
aggregate response is smooth. An earlier version did transfer it (an
exponential collapse past +3°C global, ~80% yield loss by +4°C), which
turned any scenario crossing 3°C into a food-stress GDP collapse.

The global response is instead fitted to per-degree global estimates:
- **Zhao et al. (2017), PNAS 114(35):9326-9331**, four methods (global grid
  models, point models, regressions, field warming): per °C of global mean
  temperature, wheat -6.0%, maize -7.4%, rice -3.2%, soybean -3.1%, with no
  CO2 fertilization, adaptation or genetic improvement (mean -4.9%/°C).
- **Hultgren et al. (2025), Nature 642:644-652**, 12,658 regions, six
  staples, with adaptation and income growth: -120 kcal/person/day, 4.4% of
  recommended consumption, per °C of global warming.
- Cross-check: **Jägermeyr et al. (2021), Nature Food 2:873-885**, GGCMI
  ensemble, end-of-century SSP5-8.5: maize -24%, wheat +18% (with CO2).

Midpoint -4.65%/°C from 2025 (~1.5°C) to +4°C sets yieldDamageCoeff 0.021
(factor 0.884 at +4°C). The quadratic form keeps a mild convexity, the
aggregate echo of the local extreme-heat nonlinearity. The water-stress term
(irrigation water availability, IPCC AR6 WGII Ch4) multiplies on top.
