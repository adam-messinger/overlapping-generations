# Headless Simulation - Friction Points & Improvements

This documents issues encountered when extracting the simulation for headless/Node.js use, and ideas for making it easier in the future.

## Current Setup

```bash
# Run with defaults
node run-simulation.js

# With parameters
node run-simulation.js --carbonPrice=100 --format=forecast

# Output formats: summary, json, csv, forecast

# Full Twin-Engine Century Forecast
node forecast.js --carbonPrice=100
```

## Agent Introspection API

LLM agents can discover available parameters without reading source code:

```javascript
const sim = require('./energy-sim.js');
const params = sim.describeParameters();

// Returns structured schema:
// {
//   carbonPrice: { type: 'number', default: 35, min: 0, max: 200, unit: '$/ton CO₂', description: '...' },
//   solarAlpha: { type: 'number', default: 0.36, min: 0.1, max: 0.5, ... },
//   ...
//   _outputs: { years: '...', results: '...', demographics: '...' },
//   _metrics: ['warming2100', 'peakEmissionsYear', ...]
// }
```

## Friction Points Encountered

### 1. **Manual JS Extraction Required** (High friction)

**Problem:** The simulation lives in a single HTML file with embedded JS. Extracting it required:
- Using `sed` to pull lines 522-3799
- Manually verifying the "pure JS" comment boundary
- Adding Node.js module exports

**Future fix:** Consider one of:
- Keep simulation logic in `energy-sim.js`, import into HTML via `<script src>`
- Use a build tool (esbuild, rollup) to bundle for browser while keeping source in JS
- At minimum, add clear `// BEGIN_CORE` / `// END_CORE` markers

### 2. **Inconsistent Property Names** (Medium friction)

**Problem:** The data structure uses `dependency` but the runScenario metrics use `dependencyRatio` in some places. Had to debug to find correct keys:
- `demographics.global.dependency` (correct)
- `demographics.global.dependencyRatio` (wrong - doesn't exist)

**Future fix:** Standardize naming across all output objects. Add TypeScript types or JSDoc to document structure.

### 3. **Missing Metrics in runScenario** (Low friction)

**Problem:** `runScenario` returns `popPeakYear` but not `popPeak` (the actual population value at peak). Had to work around.

**Future fix:** Add commonly-needed derived values to runScenario output.

### 4. **No Package.json** (Low friction)

**Problem:** No npm package structure, so can't easily:
- Add npm scripts (`npm run sim`)
- Install as dependency in other projects
- Specify Node.js version requirements

**Future fix:** Add minimal package.json with:
```json
{
  "name": "overlapping-generations",
  "main": "energy-sim.js",
  "scripts": {
    "sim": "node run-simulation.js",
    "test": "node test-headless.js"
  }
}
```

### 5. **Chart.js Dependency in HTML** (N/A for headless)

Not a problem for headless use, but the HTML file requires Chart.js CDN. If someone wanted to run the browser version offline, they'd need to bundle it.

## Ideas for Future Improvements

### Short-term
- [ ] Add `package.json` with npm scripts
- [ ] Add `// BEGIN_CORE` / `// END_CORE` markers in HTML
- [ ] Standardize property names (dependency vs dependencyRatio)
- [ ] Add `popPeak` value to runScenario output

### Medium-term
- [ ] Add TypeScript types (energy-sim.d.ts) for IDE autocomplete
- [ ] Create test-headless.js that runs same tests as test.html
- [ ] Add JSON schema for simulation output

### Long-term
- [ ] Consider full extraction: energy-sim.js (core) + energy-sim-ui.js (browser)
- [ ] Publish to npm as package
- [ ] Add streaming output for large batch runs

## Files Added

| File | Purpose |
|------|---------|
| `energy-sim.js` | Standalone Node.js module with `describeParameters()` introspection |
| `run-simulation.js` | CLI runner (summary, json, csv, forecast formats) |
| `forecast.js` | Twin-Engine Century Forecast generator (full markdown output) |
| `HEADLESS.md` | This file |

## Verification

```bash
# Quick test
node -e "const s = require('./energy-sim.js'); s.config.quiet=true; console.log(s.runScenario({carbonPrice:35}).warming2100)"

# Full test
node run-simulation.js --format=json | head -20
```
