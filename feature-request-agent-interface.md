# Feature Request: Agent-Native Headless Interface & Logic Extraction

## Summary
The current "headless" mode relies on a fragile hack: a Node.js script (`generate-forecast.mjs`) scrapes JavaScript code out of an HTML file using regular expressions and `eval`s it. This makes it difficult for LLM agents to reliably interface with, modify, or reason about the simulation logic without potentially breaking the parser.

We propose decoupling the simulation engine from the UI and creating a first-class, **Agent-Native Interface**. This will allow LLM agents to import, query, and run the model using standard, typesafe, and self-documenting APIs.

## Problem Statement
*   **Code Entanglement:** Physics logic is mixed with Chart.js UI code in `energy-sim.html`.
*   **Fragile Execution:** Agents trying to run the model must rely on the existing `generate-forecast.mjs` wrapper or write their own brittle scrapers.
*   **Opaque Inputs:** There is no programmatic way for an agent to "ask" the model what parameters are available or what their valid ranges are (introspection).

## Proposed Implementation

### 1. Extract the Engine (`src/simulation.js`)
Move the `window.energySim` logic into a standalone ES Module.
*   **Pure Logic:** No DOM manipulation, no Chart.js dependencies.
*   **Universal Support:** Designed to run in both Node.js (for agents) and Browsers (for the UI).

### 2. Create an Agent API Schema
Define the inputs and outputs using a standard schema (e.g., JSDoc or TypeScript interfaces) that LLMs can easily parse to understand how to use the tool.

```javascript
// Example Agent Interaction
import { runSimulation, describeParameters } from './src/simulation.js';

// 1. Agent asks: "What can I change?"
const params = describeParameters(); 
// Returns: { carbonPrice: { type: 'number', min: 0, max: 200, description: '$/ton' }, ... }

// 2. Agent runs scenario
const result = runSimulation({
  carbonPrice: 75,
  solarGrowth: 0.30
});

// 3. Agent gets structured, semantic data
console.log(result.metrics.peakEmissionsYear);
```

### 3. Maintain UI Compatibility
The `energy-sim.html` file should simply import this new module:
```html
<script type="module">
  import { runSimulation } from './src/simulation.js';
  // UI logic connects sliders to runSimulation()...
</script>
```

## Success Criteria
*   **No more `eval`:** The Node.js entry point imports the logic directly.
*   **Introspection:** An agent can query the system to learn valid parameter ranges without reading the source code.
*   **Stability:** UI changes in HTML do not break the headless simulation.
