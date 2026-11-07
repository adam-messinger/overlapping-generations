/**
 * Domain Invariant Tests
 *
 * The modules declare their accounting identities as invariants, which the
 * engine checks after every step. These tests pin two things the declarations
 * alone cannot: that every scenario in the repository satisfies them in every
 * year, and that each one actually bites when its identity is broken (an
 * invariant that can never fail is worse than none, since it reads as cover).
 */

import { evaluateInvariants, type InvariantContext, type ModuleInvariant } from 'tsimulation';
import { ALL_MODULES, runAutowiredSimulation } from './simulation-autowired.js';
import { listScenariosSync, loadScenarioParamsSync } from './scenario.js';
import { test, expect, printSummary } from './test-utils.js';

/**
 * Scenario files that cannot complete a run today. Each entry is a known bug,
 * not an exemption: the test below fails once the scenario runs again, so the
 * entry has to be removed rather than forgotten.
 */
const KNOWN_BROKEN: Record<string, string> = {
  // energy: advanceVintageStock receives negative additions mid-run
  // ("additions must be finite and non-negative"). Predates the invariants.
  'debt-populism': 'energy additions go negative',
};

test('every scenario satisfies every invariant in every year', () => {
  const declared = ALL_MODULES.reduce((sum, mod) => sum + (mod.invariants?.length ?? 0), 0);
  for (const name of listScenariosSync()) {
    if (KNOWN_BROKEN[name]) continue;
    // Invariants are the subject; the per-step port checks run in every other suite
    const result = runAutowiredSimulation(loadScenarioParamsSync(name), {
      invariants: 'report', paramLiveness: 'off', connectorValidation: 'off',
    });
    const diagnostics = result.diagnostics?.invariants;
    const violations = diagnostics?.violations ?? [];
    if (violations.length > 0) {
      console.log(`    ${name}: ${violations[0].module} '${violations[0].invariant}' ${violations[0].year}: ${violations[0].message}`);
    }
    expect(violations.length).toBe(0);
    // Every declared invariant ran on every simulated year
    expect(diagnostics?.checked).toBe(declared * result.years.length);
  }
});

test('known-broken scenarios are still broken (remove them from the list once fixed)', () => {
  for (const name of Object.keys(KNOWN_BROKEN)) {
    let threw = false;
    try {
      runAutowiredSimulation(loadScenarioParamsSync(name), { paramLiveness: 'off' });
    } catch {
      threw = true;
    }
    expect(threw).toBeTrue();
  }
});

// =============================================================================
// EACH INVARIANT BITES
// =============================================================================

/** The step index the bite tests break: late enough that previous-step fields exist. */
const CAPTURE_INDEX = 2;

/**
 * One real step context per module, captured from a short default run by
 * appending a recording invariant to each module for the duration of the run.
 */
function captureContexts(): Map<string, InvariantContext<any, any, any, any>> {
  const captured = new Map<string, InvariantContext<any, any, any, any>>();
  const originals = new Map<string, readonly ModuleInvariant[] | undefined>();
  for (const mod of ALL_MODULES) {
    originals.set(mod.name, mod.invariants);
    const record: ModuleInvariant = {
      name: 'record',
      check: (context) => { if (context.yearIndex === CAPTURE_INDEX) captured.set(mod.name, context); },
    };
    (mod as { invariants?: readonly ModuleInvariant[] }).invariants = [...(mod.invariants ?? []), record];
  }
  try {
    runAutowiredSimulation({ endYear: 2025 + CAPTURE_INDEX }, { paramLiveness: 'off' });
  } finally {
    for (const mod of ALL_MODULES) {
      (mod as { invariants?: readonly ModuleInvariant[] }).invariants = originals.get(mod.name);
    }
  }
  return captured;
}

const contexts = captureContexts();

/** Break one quantity in a real context and assert the named invariant reports it. */
function expectBites(
  moduleName: string,
  invariantName: string,
  breakIt: (context: { inputs: any; outputs: any; state: any; previousOutputs: any }) => void,
) {
  const mod = ALL_MODULES.find((m) => m.name === moduleName)!;
  const original = contexts.get(moduleName)!;
  // The unbroken context passes, so any violation below is the seeded break
  expect(evaluateInvariants(moduleName, mod.invariants, original).length).toBe(0);
  const broken = {
    ...original,
    inputs: structuredClone(original.inputs),
    outputs: structuredClone(original.outputs),
    state: structuredClone(original.state),
    previousOutputs: structuredClone(original.previousOutputs),
  };
  breakIt(broken);
  const violated = new Set(evaluateInvariants(moduleName, mod.invariants, broken).map((v) => v.invariant));
  expect(violated.has(invariantName)).toBeTrue();
}

test('dispatch: a region served beyond its panels fails the physical bound', () => {
  expectBites('dispatch', 'no region generates more than its capacity can', ({ outputs }) => {
    // Credit the same panels twice: the shape of the 16e7793 release bug.
    // Global and regional move together so only the physical bound fails.
    const extra = outputs.regionalGeneration.china.solar + 1e4;
    outputs.regionalGeneration.china.solar += extra;
    outputs.generation.solar += extra;
    outputs.totalGeneration += extra;
  });
});

test('dispatch: a global total that drops a region fails aggregation', () => {
  expectBites('dispatch', 'global generation is the sum of regions', ({ outputs }) => {
    outputs.regionalGeneration.ssa.coal += 50;
  });
});

test('demand: electricity reclassified into a sector fails the partition', () => {
  expectBites('demand', 'sectors partition non-electric energy', ({ outputs }) => {
    // The 03129ca shape: robot/DC electricity counted as sector fuel
    outputs.sectors.industry.nonElectric += 1000;
    outputs.sectors.industry.total += 1000;
  });
});

test('resources: shipping more copper than the mines can fails the bound', () => {
  expectBites('resources', 'extraction is bounded by mine capacity and by demand', ({ outputs, state }) => {
    outputs.minerals.copper.extraction = state.minerals.copper.miningCapacity * 1.1;
  });
});

test('resources: land that exceeds the land area fails the partition', () => {
  expectBites('resources', 'land categories partition the land area', ({ outputs }) => {
    outputs.land.desert += 300; // the 49b2115 shape: desertification on top of residual desert
  });
});

test('capital: a nonzero residual fails, and so does a spend that is not debited', () => {
  expectBites('capital', 'accounting residuals are zero', ({ outputs }) => {
    outputs.nationalAccountsResidual = 0.5;
  });
  expectBites('capital', 'realized spends are debited from investment, overflow reported', ({ inputs }) => {
    // A spend that reaches the ledger's inputs but not its debit: d950fc1's free capex
    inputs.cdrSpend += 1;
  });
});

test('climate: emissions that never reach the carbon stock fail the stock-flow identity', () => {
  expectBites('climate', 'cumulative emissions accumulate net emissions', ({ inputs }) => {
    inputs.emissions += 5;
  });
});

test('human capital: a ledger that leaks fails closure; a region missing from the world total fails aggregation', () => {
  expectBites('humanCapital', 'regional ledgers close', ({ outputs }) => {
    outputs.regionalHumanCapital.india.netStock += 1;
  });
  expectBites('humanCapital', 'world totals are the sum of regions', ({ outputs }) => {
    outputs.regionalHumanCapital.latam.investment += 1;
  });
});

printSummary();
