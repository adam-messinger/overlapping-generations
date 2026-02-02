# Galbraith & Chen: Discounting, Uncertainty, and Fixed Costs

## Core Thesis
The discount rate is not merely a measure of "impatience" or "time preference" (as in standard economics), but a measure of **uncertainty** and the cost of maintaining **structured complexity** (fixed costs).

### 1. The Uncertainty Principle of Discounting
*   **Formula:** $Discount Rate \approx Risk Free Rate + Uncertainty Premium$
*   **Mechanism:** Uncertainty (entropy) naturally degrades structures over time. To justify building a high-fixed-cost structure (like a solar farm, a grid, or a government), the expected return must exceed the rate of entropic decay (uncertainty).
*   **High Uncertainty = High Discount Rate:** If the future is chaotic (war, climate instability, policy volatility), the discount rate rises.

### 2. Fixed Cost vs. Variable Cost
*   **Rich/Stable Societies:** Low uncertainty $\to$ Low discount rates $\to$ Ability to finance **High Fixed Cost / Low Variable Cost** systems.
    *   *Examples:* Renewable energy (Solar/Wind), high-speed rail, universal healthcare.
*   **Poor/Unstable Societies:** High uncertainty $\to$ High discount rates $\to$ Forced to rely on **Low Fixed Cost / High Variable Cost** systems.
    *   *Examples:* Diesel generators, minibuses, pay-as-you-go services.

### 3. The "Systemic Risk" Multiplier
*   **Idiosyncratic Risk:** Risk specific to a single project (e.g., will this specific solar panel break?). Can be diversified away.
*   **Systemic Risk:** Risk to the whole system (e.g., Climate Change, Global War, Financial Crisis). Cannot be diversified.
*   **Galbraith's Point:** Standard models undervalue systemic risk. In an age of "Poly-crisis," systemic risk rises, pushing up the **effective discount rate** for *all* long-term projects.

## Implication for the Energy Transition
*   **Solar/Wind:** Are "High Fixed Cost" assets. They are up-front capital intensive (buying 30 years of energy today). They are **highly sensitive** to the discount rate.
*   **Fossil Fuels:** Are "High Variable Cost" assets. You pay for fuel as you go. They are **less sensitive** to the discount rate.
*   **The Trap:** If climate change causes systemic instability (wars, disasters), the discount rate might *rise*. This makes the transition to renewables *harder* just when it is needed most. A "Climate Catch-22."

## Modeling Recommendation
The current simulation uses a relatively static `interestRate` derived from capital returns. To align with Galbraith/Chen, we should:
1.  **Split the Discount Rate:** Explicitly model `SystemicRisk` (driven by temperature, geopolitics).
2.  **Apply to LCOE:** The LCOE calculation for Solar/Wind should use this dynamic, risk-adjusted discount rate ($r$), not a flat assumption.
    *   $LCOE_{Solar} \propto \frac{Capex \times r}{1 - (1+r)^{-n}}$
    *   If $r$ jumps from 5% to 10% due to "Climate Chaos," Solar LCOE explodes, while Gas LCOE rises much less.
