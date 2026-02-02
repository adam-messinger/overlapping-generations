# Feature Request: Supply-Side Energy Constraints (Biophysical Reality)

## Summary
The current simulation is a **Demand-Driven** model: it calculates GDP based on demographics and productivity, assumes the necessary energy is always available, and then calculates the resulting emissions.

This ignores **Biophysical Causality**: In reality, energy availability is a *constraint* on GDP. If energy is scarce or expensive, economic activity must shrink to fit the available supply. The current model cannot simulate an "Energy Crisis" where high costs choke off growth.

## Proposed Architecture: The "Constraint Check"

We propose transforming the model into a **Supply-Constrained** system by introducing a feedback loop within the annual simulation step.

### 1. The Concept: "Potential vs. Realized GDP"
*   **Potential GDP:** Calculated from Labor (Demographics) and Capital/Tech (Solow Model). This is what the economy *wants* to do.
*   **Realized GDP:** The actual economic activity that can be supported by the available energy at an affordable price.

### 2. Implementation Logic
Inside the main `runSimulation` loop, after calculating `Demand` and `LCOE`:

1.  **Calculate Energy Burden:**
    $$EnergyShare = \frac{TotalEnergyCost}{GDP}$$
    *(TotalEnergyCost = Demand $\times$ Weighted Average LCOE)*

2.  **The Constraint Function:**
    Define a "Threshold of Pain" (e.g., historical max is ~10-14% of GDP during 1970s crises).
    *   If `EnergyShare` < 5%: No constraint (Energy is cheap, Jevons Rebound applies).
    *   If `EnergyShare` > 10%: **GDP contraction**. The economy sheds lowest-value activities until the burden returns to a sustainable level.

3.  **Adjust Output:**
    $$RealizedGDP = PotentialGDP \times \min(1, \frac{MaxEnergyShare}{CurrentEnergyShare})$$

### 3. Feedback Dynamics
*   **Negative Feedback:** High Energy Costs $\to$ Lower GDP $\to$ Lower Energy Demand $\to$ Prices stabilize (Recession as equilibrium mechanism).
*   **Positive Feedback (Jevons):** Ultra-low Energy Costs $\to$ Higher Realized GDP (or new industries) $\to$ Higher Demand.

## Why this matters
This feature allows the model to simulate:
*   **Stagflation:** High inflation (energy costs) killing growth.
*   **The "Green Premium" Risk:** If the transition is mismanaged and energy prices spike, the model will correctly predict an economic slowdown, rather than blindly assuming growth continues.
