# Bug Report: Energy Burden Feedback Loop is decoupled from Simulation Parameters

## Summary
The newly implemented "Energy Burden" supply-side constraint (which reduces GDP when energy costs are high) is not reacting to the simulation's technology parameters (`solarAlpha`, `solarGrowth`). As a result, the GDP trajectory is identical across all scenarios (Stagnation vs Tech Boom), failing to model the economic benefits of a cheap energy transition.

## Technical Details
**File:** `energy-sim.js`
**Section:** The "Quick Climate Pass" (lines ~3615-3680).

**The Issue:**
The Energy Burden feedback loop relies on a two-pass architecture:
1.  **Quick Pass:** Estimates energy costs to calculate `energyBurdenFractions` (GDP drag).
2.  **Main Pass:** Runs the full demand model using those fractions.

The bug is in the **Quick Pass**. It calculates LCOE using a hardcoded formula that ignores the user's scenario settings:

```javascript
// Current Code (approx line 3655)
const baseLCOE = 80 * Math.exp(-0.015 * i);  // Hardcoded 1.5% learning
```

This means that even if the user sets `solarAlpha` to 0.45 (Tech Boom), the GDP constraint assumes a stagnant 1.5% learning rate. The economic feedback loop is essentially running in a parallel universe that ignores the technological progress being simulated.

## Proposed Fix
The "Quick Pass" must use an approximation that respects the `solarAlpha` and `solarGrowth` parameters.

**Conceptual Fix:**
Instead of a hardcoded decay, calculate an approximate learning curve based on the passed parameters:

```javascript
// Approximate cumulative doubling based on growth rate
const doublings = Math.log2(Math.pow(1 + solarGrowth, i));
// Apply user's learning rate (alpha)
const learningFactor = Math.pow(2, -solarAlpha * doublings);
const solarProxy = 35 * learningFactor; 
// ... blend with fossil prices ...
```

## Impact
Fixing this will allow the model to show that **Invest in Tech $\to$ Cheaper Energy $\to$ Higher GDP**. Currently, this causal link is broken.
