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
