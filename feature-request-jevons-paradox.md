# Feature Request: Jevons Paradox & Energy Gluttons (Robots/AI)

## Summary
The current model projects a decline in total global energy consumption in the late 21st century due to population decline and efficiency gains. This contradicts the **Maximum Power Principle (Odum)** and **Entropy Economics (Galbraith/Chen)**, which argue that an abundance of cheap, high-quality energy (solar) will invariably drive the evolution of new, energy-intensive complexities.

We propose adding a **"New Demand"** module to the simulation that links the proliferation of automation (Robots/AI) and cheap energy to a rise in energy intensity, preventing the unrealistic "power down" scenario.

## Theoretical Basis
*   **Jevons Paradox:** Efficiency gains + cost reductions $\to$ Increased consumption.
*   **Maximum Power Principle:** Systems evolve to maximize power throughput. If humans don't use the surplus energy, the system will evolve components (AI/Robots) that will.
*   **Current Model Gap:** The simulation tracks `robotsDensity` but treats it as energetically neutral. It assumes `energyIntensity` declines monotonically (1-2%/year) regardless of the capital/automation composition.

## Implementation Plan

### 1. New Parameters (`energySim.html`)
Add these to `demandParams` or a new `techParams` object:
```javascript
const reboundParams = {
    // Threshold: When LCOE drops below this ($/MWh), demand explodes
    cheapEnergyThreshold: 15,
    
    // Elasticity: How much demand rises for every $1 drop below threshold
    cheapEnergyElasticity: 0.05, // 5% increase per dollar drop
    
    // Robot Energy Intensity: How much energy does a robot/AI unit consume?
    // Baseline: Humans consume ~2500 kcal/day (~3 kWh/day)
    // AI/Robot unit might consume 10-50 kWh/day
    energyPerRobotPerYear: 10, // MWh per robot-unit per year
};
```

### 2. Modify Demand Logic (`runDemandModel`)
Update the loop in `runDemandModel` (around line 2150) to calculate a "Rebound Adjustment" to energy intensity.

**Current Logic:**
```javascript
currentState.intensity = currentState.intensity * (1 - econ.intensityDecline);
```

**New Logic:**
```javascript
// 1. Calculate Robot Energy Load
// robotsDensity is "robots per 1000 workers".
// Total Robots = (robotsDensity / 1000) * WorkingPopulation
const totalRobots = (capital.robotsDensity[i] / 1000) * working;
const robotEnergyDemandTWh = totalRobots * reboundParams.energyPerRobotPerYear / 1e6; // Convert MWh to TWh

// 2. Calculate Jevons/Price Rebound
// Check lowest LCOE (Solar usually)
const cheapestLCOE = Math.min(lcoes.solar, lcoes.wind);
let priceMultiplier = 1.0;
if (cheapestLCOE < reboundParams.cheapEnergyThreshold) {
    const delta = reboundParams.cheapEnergyThreshold - cheapestLCOE;
    priceMultiplier = 1 + (delta * reboundParams.cheapEnergyElasticity);
}

// 3. Apply to Total Energy
// Base demand (Human/Standard Industry)
let totalEnergy = currentState.gdp * currentState.intensity * 1000; 

// Add Robot Load & Price Rebound
totalEnergy = (totalEnergy + robotEnergyDemandTWh) * priceMultiplier;
```

### 3. Expected Outcome
*   **Baseline:** Energy use peaks in 2050 and declines.
*   **With Feature:** 
    *   As Solar LCOE hits $5/MWh (approx 2060), the `priceMultiplier` activates.
    *   As `robotsDensity` hits 200+ (2080s), the `robotEnergyDemand` becomes significant.
    *   **Result:** Total energy consumption stabilizes or continues to rise, reflecting a civilization that is becoming *more* energetic and complex, not less.

## Success Criteria
*   The model should show **Total Energy Demand** decoupling from **Population** in the late century.
*   The `robotsDensity` variable effectively acts as a driver for electricity demand.
