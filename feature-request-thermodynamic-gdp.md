# Feature Request: Thermodynamic Production Function (Ayres-Warr)

## Summary
The current model uses a standard Solow-Swan production function where GDP determines Energy Demand. This is "Demand-Side" logic. To make the model "Supply-Side" (physically realistic), we must invert this: **Energy Supply determines GDP.**

We propose implementing the **Ayres-Warr logic**, where Economic Output is a function of **Useful Work** (Energy $\times$ Efficiency).

## Implementation Plan

### 1. New State Variables
*   `thermo.conversionEfficiency`: The global average efficiency of converting Raw Energy to Useful Work.
    *   *Driver:* Approaches thermodynamic limits (e.g., Carnot) but is boosted by `effectiveWorkers` (Knowledge).
*   `thermo.usefulWork`: The actual joules of work performed.

### 2. Invert the GDP Logic (`runDemandModel`)
**Current:**
1.  Calculate `GDP_potential` from Labor/TFP.
2.  Calculate `Energy_demand` from GDP.

**Proposed (Thermodynamic):**
1.  **Calculate Energy Supply:** Based on *installed capacity* (Solar, Wind, Gas) and *resource availability* (Depletion).
2.  **Calculate Efficiency ($\\epsilon$):**
    $$\\epsilon_t = \\epsilon_{base} \\times (1 + \text{TechLearning}) \\times \text{KnowledgeModifier}$$
3.  **Calculate Useful Work ($U$):**
    $$U_t = \text{EnergySupply}_t \\times \\epsilon_t$$
4.  **Calculate GDP:**
    $$GDP_t = U_t \\times \text{ValuePerJoule}$$
    *(Where ValuePerJoule is relatively constant or slowly rising due to digitalization).*

### 3. Impact
*   **Energy Crisis:** If Energy Supply drops (e.g., fossil depletion), GDP *must* drop. You cannot "efficiency" your way out of zero energy.
*   **Green Boom:** If Solar provides massive cheap energy, and we have the machines (Capital) to use it, GDP explodes (Super-linear growth).
*   **Stagnation:** If we stop innovating in efficiency ($\\epsilon$ plateaus) and energy supply is flat, growth stops.

## Success Criteria
*   The model should show that **GDP Growth** is highly correlated with **Energy Consumption** (modified by efficiency), rather than Energy Consumption being a passive result of GDP.
