# Feature Request: Dynamic Discounting & The "Climate Trap"

## Summary
The current model calculates the interest rate (discount rate) based solely on the marginal product of capital ($r = \alpha Y/K - \delta$). This misses the critical **Risk Premium** component described by James Galbraith and Jing Chen.

In their framework, the discount rate scales with **Systemic Uncertainty**. As climate damages and geopolitical tension rise, the discount rate should rise. This disproportionately punishes high-fixed-cost technologies (Solar/Wind/Nuclear) compared to variable-cost ones (Gas/Coal), creating a potential "Climate Trap" where instability prevents the investment needed to solve the instability.

## Implementation Plan

### 1. New Parameters (`capitalParams`)
```javascript
const riskParams = {
    riskFreeRate: 0.02,         // 2% base real rate
    climateRiskSensitivity: 0.5, // How much r rises per % of GDP lost to climate
    geopoliticsRiskSensitivity: 0.2 // How much r rises due to tension
};
```

### 2. Modify Interest Rate Logic (`runCapitalModel`)
Currently: `r = alpha * gdp / capital - depreciation` (Solow model).

Proposed:
```javascript
// Base Solow Return
let marginalProduct = capitalParams.alpha * gdp / currentCapital - capitalParams.depreciation;

// Systemic Risk Premium
// climateDamages is fraction of GDP (e.g., 0.05 for 5%)
const climatePremium = riskParams.climateRiskSensitivity * climateData.globalDamages[i];

// Geopolitical Premium (Optional extension)
// e.g. based on inequality between regions
const geoPremium = 0.0; 

// Effective Discount Rate
const effectiveRate = Math.max(0.01, marginalProduct + climatePremium + geoPremium);
```

### 3. Link LCOE to Discount Rate (`runSimulation`)
Currently, LCOE logic (`learningCurve`) implicitly assumes a constant cost of capital or rolls it into the base cost.

We need to make the **Cost of Capital** explicit in the LCOE function for Solar, Wind, Nuclear, and Battery.

$$LCOE \approx \frac{Capex \times WACC + Opex}{Output}$$

**Code Change in LCOE Loop:**
1.  Pass the `currentInterestRate` (from previous year) into the energy loop.
2.  Adjust `solarLCOE` based on `currentInterestRate`.
    *   *Approximation:* For every 1% rise in rates, Solar LCOE rises by ~8% (high capital intensity). Gas LCOE rises by ~2% (low capital intensity).

### 4. Expected Outcome
*   **Virtuous Cycle (Low Warming):** Low damages $\to$ Low Risk $\to$ Cheap Capital $\to$ Fast Solar Transition.
*   **Vicious Cycle (High Warming):** High damages $\to$ High Risk $\to$ Expensive Capital $\to$ Solar becomes unaffordable $\to$ Fall back to Gas/Coal $\to$ More Warming.

## Success Criteria
*   The model should demonstrate that **Climate Stability** is an economic asset that lowers the cost of the transition.
*   A "High Sensitivity" climate scenario should result in a slower energy transition due to capital flight/risk premiums.
