# Bug Report: Land-use carbon flux not linked to climate model

## Summary
The simulation now calculates carbon sequestration from forest growth and emissions from deforestation (via the `forestCarbon` function), but this data is not being used to calculate global temperature. The `climate.emissions` array only includes energy-related emissions, making the "Rewilding" effect purely cosmetic rather than climatologically active.

## Technical Details
**File:** `energy-sim.html`
**Functions involved:** `runResourceModel` and `runSimulation`.

**Current Logic in `runSimulation` (approx. line 1730):**
```javascript
const emissionsResult = calculateEmissions(dispatchResult, electrificationRate);
climate.emissions.push(emissionsResult.total); // Only energy emissions
// ...
cumulativeEmissions += emissionsResult.total;
const climateState = updateClimate(cumulativeEmissions, ...);
```

**The Issue:**
1.  `runResourceModel` calculates `resources.carbon.netFlux`, which is the Gt CO2 per year sequestered (negative) or released (positive) by land-use changes.
2.  `runSimulation` ignores this flux when calculating the total annual emissions used to update `cumulativeEmissions`.
3.  As a result, the massive reforestation predicted by the model (20%+ increase in forest area) has zero impact on the `warming2100` outcome.

## Proposed Fix
The `runResourceModel` is currently called *after* the climate loop in `runSimulation`. To fix this correctly without circular dependencies (since land use depends on temperature), we should:

1.  Move the `forestCarbon` calculation *inside* the main simulation loop.
2.  Add the land-use flux to the total emissions:
```javascript
const landUseFlux = resourceData.carbon.netFlux[i]; // Need to ensure resourceData is accessible
const totalAnnualEmissions = emissionsResult.total + landUseFlux;
climate.emissions.push(totalAnnualEmissions);
```

## Impact
Fixing this will enable the model to show the **Negative Emissions** potential of rewilding. In scenarios with high reforestation, we should see a measurable slowdown or even reversal of warming in the late 21st century.
