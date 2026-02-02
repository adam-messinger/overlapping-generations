# Feature Request: Scenario Configuration Files (Decoupling Data from Logic)

## Summary
Currently, the simulation's physical and economic constants (e.g., `solarAlpha: 0.36`, `savingsWorking: 0.45`, `carbonIntensity: 400`) are hardcoded directly into the simulation engine in `energy-sim.html`. This makes it difficult to run different scenarios (like the IEA's STEPS vs. NZE) without manually editing the source code.

We propose extracting all "magic numbers" into standalone **Scenario Configuration Files** (JSON) and refactoring the engine to accept these configurations as inputs.

## Problem Statement
*   **Brittle Scenarios:** To test a "Tech Stagnation" vs. "Tech Boom" case, a developer must find and replace specific values deep in the code.
*   **Lack of Versioning:** There is no easy way to track changes to scenario assumptions over time.
*   **CLI Friction:** The `generate-forecast.mjs` script has to manually override defaults via a flat object, which is less flexible than a structured config file.

## Proposed Implementation

### 1. Define a Standard Configuration Schema
Create a directory `scenarios/` containing JSON files (e.g., `baseline.json`, `net-zero.json`).

**Example `scenarios/baseline.json`:**
```json
{
  "energy": {
    "solar": { "cost0": 35, "alpha": 0.36, "growth": 0.25 },
    "fossil": { "carbonPrice": 35, "gasIntensity": 400 }
  },
  "demographics": {
    "fertilityFloor": 1.4,
    "lifeExpectancyGrowth": 0.1
  },
  "capital": {
    "savingsPrime": 0.45,
    "automationGrowth": 0.03
  }
}
```

### 2. Refactor the Simulation Engine
Update `runSimulation(params)` to accept a full configuration object that deep-merges with the internal defaults.

```javascript
function runSimulation(configOverride = {}) {
    // Deep merge defaults with the loaded scenario config
    const config = mergeDeep(defaults, configOverride);
    
    // Use config.energy.solar.alpha instead of hardcoded 0.36
    // ...
}
```

### 3. Browser UI Update
Add a dropdown or file-picker to the `energy-sim.html` interface to allow users to "Load Scenario File." This would fetch the JSON and update all sliders and charts instantly.

### 4. CLI Update
Update `generate-forecast.mjs` to accept a path to a config file:
```bash
node generate-forecast.mjs --scenario scenarios/net-zero.json
```

## Success Criteria
*   The `energy-sim.html` file contains only **logic**, not **assumptions**.
*   Users can share scenario assumptions by sending a single JSON file.
*   It becomes possible to run "Sensitivity Swarms" (running the model against every file in the `scenarios/` folder) automatically.
