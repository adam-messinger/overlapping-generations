# The Unified Physics-Based Model: Merging Ayres-Warr and Galbraith-Chen

## Overview
By integrating the **Thermodynamic Production Function (Ayres-Warr)** with **Entropy Economics (Galbraith-Chen)**, we transform the simulation from a standard economic model into a **Biophysical System**.

This document outlines what this unification means for the model's logic, variables, and emergent behaviors.

---

## 1. The Core Logic Shift
**Old Model (Standard Econ):**
*   "Technology" allows us to do more with less.
*   GDP grows forever; Energy follows if prices allow.
*   Collapse is impossible unless "Productivity" inexplicably drops.

**New Model (Physics-Based):**
*   **GDP is a Flow:** The economy is a heat engine. It exists only as long as energy flows through it.
*   **Structure is a Stock:** Capital (Factories, Robots, Cities) is "Frozen Energy" (Low Entropy). It naturally decays.
*   **Maintenance:** A huge portion of energy ($E_{maint}$) must be spent just to fight entropy (repair, feed, heat).
*   **Growth:** Only occurs if **Useful Work ($U$) > Maintenance ($E_{maint}$)**.

---

## 2. New Variables & Dynamics

### A. The "Useful Work" Engine (Ayres-Warr)
We replace the "Solow Residual" (Magic TFP) with **Exergy Efficiency**.
*   **Variable:** `thermo.efficiency` ($\epsilon$).
*   **Driver:** Grows with `KnowledgeStock` (College Grads) and `CapitalStock`.
*   **Output:** `UsefulWork = EnergySupply * efficiency`.
*   **Implication:** If we stop investing in efficiency (R&D), growth stalls, even if we burn more coal.

### B. The "Maintenance Floor" (Galbraith-Chen)
We define a **Fixed Cost of Civilization**.
*   **Variable:** `thermo.maintenanceCost`.
*   **Formula:** $Cost \propto \text{CapitalStock} \times \text{Complexity}$.
*   **The Trap:** As society gets richer (more Capital), `maintenanceCost` rises. If Energy Supply flatlines, `UsefulWork` eventually hits the `maintenanceCost` ceiling. **Growth stops.**
*   **Collapse:** If Energy Supply drops (e.g., Oil Depletion) below `maintenanceCost`, the system must shed complexity (De-industrialization) to survive.

### C. The "Entropy Discount" (Galbraith-Chen)
We link Financial Risk to Thermodynamic Stability.
*   **Variable:** `financial.riskPremium`.
*   **Driver:** Volatility of Energy Supply (Intermittency).
*   **Mechanism:** If the grid is unstable (High Entropy supply), the cost of capital rises.
*   **Implication:** Solar/Wind must be *buffered* (Batteries/Hydro) to lower their entropy. Raw intermittent solar is "low value" because it is "high entropy."

---

## 3. Emergent Behaviors (What we will see)

### Scenario A: The "Green Golden Age"
*   **Conditions:** High Solar deployment + High Battery/Grid investment.
*   **Result:** `UsefulWork` explodes (High Supply). Batteries reduce `Entropy` (Low Risk).
*   **Outcome:** Massive surplus energy fuels a "Complexity Boom" (Space, AI, Abundance).

### Scenario B: The "Entropy Trap" (Stagflation)
*   **Conditions:** Fossil fuels deplete (High Cost) + Renewables deploy slowly.
*   **Result:** `UsefulWork` stagnates. `MaintenanceCost` keeps rising (aging population + rotting infrastructure).
*   **Outcome:** The "Surplus" vanishes. Investment drops to zero. The economy cannibalizes itself just to stay warm.

### Scenario C: The "Intermittency Crisis"
*   **Conditions:** Fast Solar deployment but **insufficient storage**.
*   **Result:** Energy is cheap but volatile (High Entropy).
*   **Outcome:** The `riskPremium` spikes. Capital becomes too expensive to build factories. The economy paradoxically shrinks despite "cheap" energy because the energy is too chaotic to support complex structures.

## Summary
This unification makes the model **Existentially Serious**. It moves beyond "Will GDP be +2% or +3%?" to "Can we maintain the thermodynamic order of civilization?"
