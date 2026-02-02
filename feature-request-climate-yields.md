# Feature Request: Climate-Driven Agricultural Yield Collapse (Schlenker/Roberts)

## Summary
The current model assumes agricultural yields grow monotonically (~1% per year) due to technology, regardless of climate change. This leads to unrealistic "Rewilding" outcomes even in 4°C collapse scenarios.

We must implement a **Nonlinear Climate Damage Function** for agriculture based on the work of Schlenker & Roberts (2009), who showed that yields crash once specific temperature thresholds (Killing Degree Days) are exceeded.

## Implementation Plan

### 1. New Parameters (`resourceParams.land`)
```javascript
const agParams = {
    // Schlenker/Roberts Threshold Proxy
    // When Global T > 2.0°C, local extremes > 29°C become frequent
    yieldDamageThreshold: 2.0, 
    
    // Damage Steepness (Quadratic or Cubic)
    // At 4.0°C, we expect ~50% yield loss relative to baseline
    yieldDamageCoeff: 0.15 
};
```

### 2. Modify `landDemand` Logic
Currently:
```javascript
const currentYield = land.yield2025 * Math.pow(1 + land.yieldGrowthRate, t);
```

Proposed:
```javascript
// 1. Calculate Tech Baseline
const techYield = land.yield2025 * Math.pow(1 + land.yieldGrowthRate, t);

// 2. Calculate Climate Penalty (Schlenker/Roberts Proxy)
const excessTemp = Math.max(0, temperature - land.yieldDamageThreshold);
const damageFactor = 1 / (1 + land.yieldDamageCoeff * Math.pow(excessTemp, 2));

// 3. Apply Penalty
const currentYield = techYield * damageFactor;
```

## Expected Outcome
*   **Low Warming (< 2°C):** Yields continue to grow. Farmland shrinks. Forests grow.
*   **High Warming (> 3°C):** Yields plateau or collapse. Farmland must *expand* to feed the population. Reforestation stops or reverses (Deforestation).
*   **Feedback:** Expanding farmland kills the "Carbon Sink," accelerating warming further.

## Success Criteria
*   The model should show a **Bifurcation** in Land Use between the "Green New Deal" scenario (Reforestation) and the "Climate Collapse" scenario (Deforestation). Currently, both show Reforestation.
