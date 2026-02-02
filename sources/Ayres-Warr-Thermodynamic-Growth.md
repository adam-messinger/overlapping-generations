# Ayres & Warr: The Thermodynamic Roots of Economic Growth

## Core Thesis
Standard Solow-Swan models treat "Total Factor Productivity" (TFP) as an exogenous variable—"manna from heaven"—that grows automatically. Ayres and Warr argue that **TFP is actually a physical phenomenon**: it is the result of increasing the **Useful Work** (Exergy) extracted from raw energy inputs.

### 1. Useful Work vs. Raw Energy
*   **Raw Energy ($E$):** Coal in the ground, sunlight.
*   **Conversion Efficiency ($\epsilon$):** The efficiency of heat engines, motors, and devices.
*   **Useful Work ($U$):** The actual mechanical work or information processing done.
    $$U = \epsilon \times E$$
*   **Key Finding:** Economic growth tracks **Useful Work** ($U$) almost perfectly (R² > 0.99), whereas it decouples from Raw Energy ($E$). The "Solow Residual" (technological progress) is actually just improvements in **Conversion Efficiency** ($\epsilon$).

### 2. The LINEX Production Function
They propose replacing the Cobb-Douglas function ($Y = A K^\alpha L^\beta$) with the **LINEX** function:
$$Y = A \cdot U \cdot \exp\left(\frac{L+K}{E}\right)$$
*(Simplified conceptual form: Output depends on Useful Work, modulated by Labor and Capital).*

### 3. The Growth Engine (Feedback Loop)
1.  **Efficiency Gains:** Engineers improve $\epsilon$ (better steam engines, cheaper solar).
2.  **Cost Drop:** The cost of Useful Work drops.
3.  **Demand Surge:** The economy consumes *more* Useful Work (Jevons Paradox) to build capital.
4.  **Capital Accumulation:** More capital requires more energy to maintain.

## Implications for Your Model
To make your simulation "Supply Side" and "Thermodynamic," you should:

1.  **Replace TFP:** Stop modeling TFP as a fixed 1.5% growth rate.
2.  **Endogenize Efficiency:** Model $\epsilon$ (efficiency) as a function of **Knowledge Stock** (College Grads) and **Cumulative Investment** (Learning by Doing).
    *   $\epsilon_t = \epsilon_{max} \times (1 - e^{-k \cdot \text{Knowledge}})$
3.  **Energy Constraint:**
    *   $GDP_{potential} = \text{TotalEnergy}_t \times \epsilon_t \times \text{CapitalScaler}$
    *   If you lack the Energy ($E$), you physically cannot generate the GDP ($Y$), regardless of how much money/labor you have.

## The "Information" Link
Ayres later added **Information** (I) as the organizer of Useful Work.
*   Energy provides the **capacity** to do work.
*   Information (Knowledge/Tech) reduces the **entropy** of that work, making it productive.
*   **Your Model's Parallel:** Your `effectiveWorkers` (Education) metric is a good proxy for the "Information" stock that drives efficiency $\epsilon$.
