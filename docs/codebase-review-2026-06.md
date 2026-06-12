# Codebase Review — June 2026

Full review of the simulation codebase: framework, all nine modules, top-level
wiring, scenarios, scripts, and docs. Findings were verified against the code
(several empirically, by running the simulation); file:line references are to
the tree at the time of review.

**Verdict:** the architecture is genuinely good — clean module/framework
separation, fail-fast wiring validation, NaN guards, a disciplined regression
baseline — but the verification layer underneath it has decayed. `tsc` no
longer passes, several outputs are silently wrong or dead, and a handful of
unit errors (one off by a factor of 10⁹) have shipped because the modules that
matter most (cdr, production) have no tests at all.

---

## 1. Build & tooling

- **`npx tsc --noEmit` fails with 31 errors** (after a clean `npm install`).
  The test runner (`tsx`) strips types without checking them, and there is no
  CI, so `npm run build` has been broken without anyone noticing. Errors
  cluster in `capital.ts` (the `TransferParams` drift, §3-M1), `climate.ts`
  and `dispatch.ts` (`defineModule` input/output type mismatches), test-file
  `DemographicsInputs` stubs, and the duplicate `StepResult` barrel export
  (§2-H6). A standing red build also masks every *new* type error.
  *Recommendation:* fix the 31 errors, then add `tsc --noEmit` to `npm test`.

## 2. High-severity correctness bugs

**H1. CDR social cost of carbon is overstated by ~10⁹ — the deployment gate
never gates.** `src/modules/cdr.ts:249-252` computes
`effectiveSCC = 2·damageCoeff·T·tcre·GDP$ / discount` and the comment claims
$/ton, but `tcre` is °C per **Gt** CO₂ — the `/1e9` Gt→ton conversion is
missing. With 2025-like inputs the SCC evaluates to ~3×10¹⁰ vs a CDR cost of
~$525/ton (the corrected per-ton value would be ~$31 — *below* cost, i.e. no
deployment). The documented "deploy when SCC > CDR cost" mechanism is
effectively `temperature > 0`; deployment is purely budget/ramp-limited, and
the Tier-1 params `cost0`, `alpha`, `damageCoeff`, `tcre`, plus the endogenous
discount channel, have no effect on the decision.

**H2. `solarPlusBatteryLCOE` omits lifetime amortization — ~10× too high.**
`src/modules/energy.ts:1361-1364` divides the *entire* battery capex
($/MWh of capacity) by one year of cycles, as if the battery lives one year.
Year-0 output is ~$425/MWh vs real-world solar+storage at ~$40–70. The energy
module's own regional decisions bypass it (hardcoded
`REGIONAL_BATTERY_MARKUP = 1.5`, energy.ts:1144), but the broken value escapes
into `weightedAverageLCOE` (simulation-autowired.ts:184-186), inflating energy
burden whenever solarPlusBattery generation is nonzero, and into the
`cheapestLCOE` comparison (energy.ts:1413) where it can never win. Standard
LCOS divides by lifetime cycles or annualizes with a CRF.

**H3. Robot + datacenter load is misallocated in demand's sector breakdown.**
`src/modules/demand.ts:1193-1250`: robot/DC loads (100% electric) are added to
`globalTotalFinal` *before* the sector split, so each sector's electrification
rate (~2–35%) reclassifies most of that electricity as sector **non-electric**
energy. Consequences: `Σ sectors[*].nonElectric ≠ nonElectricEnergy` (thousands
of phantom TWh as DC load approaches its 6,000 TWh saturation); the fossil
lock-in floor (demand.ts:1296) compares against the inflated sector value and
binds less than intended; `usefulEnergy` values robot/DC energy at 1× instead
of electric × efficiency multiplier. A `Σ sectors ≈ totals` conservation test
would have caught it; none exists.

**H4. Dispatch shortfall-release double-counts solar panels.**
`src/modules/dispatch.ts:397-412`: the merit loop correctly shares panel
output between bare solar and solarPlusBattery via `remainingSolarGen`, but
the shortfall release adds back `curtailedSolar + curtailedSolarBattery`,
which derive from the *same panels*. Total solar-derived generation can exceed
physical panel output by up to `penalty × preCurtailmentSolarBattery` —
energy created from nothing, precisely in high-VRE shortfall scenarios. The
release also bypasses the storage-based penetration limits (lines 340-351)
without saying whether that's intended.

**H5. `garrettJ` and `effectiveDepreciation` are phantom outputs.** No module
computes them; `simulation-autowired.ts:606-607` maps `?? 1` / `?? 0.05`, so
every YearResult reports constants 1 and 0.05 in every scenario, while
`standard-collectors.ts:115-116` advertises them via `describeOutputs()` as
live capital outputs ("J→1 = stagflation precondition"). Either implement or
delete. A check that every collector `source` exists in some module's
declared `outputs` would catch this class permanently.

**H6. Framework barrel + test-helper integrity.**
- `src/framework/module.ts:110` and `src/framework/problem.ts:46` both export
  a (different) `StepResult`; the star-exports in `framework/index.ts` make
  the name ambiguous, so per ESM semantics *neither* is importable from the
  barrel (and it's a hard tsc error).
- `test-utils.ts:79-91`: `expect(fn).toThrow()` throws its "Expected function
  to throw" sentinel *inside* the same try block that catches it — with no
  message argument the assertion can never fail, and message substrings of
  the sentinel ("throw", "function") falsely pass. No current call site is
  bare, but per CLAUDE.md these tests are the only enforcement mechanism.
- `framework/autowire.ts`: transform→transform `dependsOn` passes
  `validateWiring` (line 321) but is broken at runtime — no ordering edge is
  created (lines 172-177 resolve through `outputRegistry`, module outputs
  only) and transform values are never written to `currentOutputs`, so a
  chained transform always reads `undefined`. Production wiring currently
  avoids the pattern; validation should reject it (or the engine support it).

**H7. The `electricityGeneration` transform is permanently `undefined`.**
`simulation-autowired.ts:158-162` reads `totalGeneration` from current-year
outputs, but outputs are cleared at the start of each year and dispatch runs
*after* demand — the lookup fails every year. Demand silently substitutes
demand for generation in the energy-burden cost calculation
(`demand.ts:1386`), ignoring shortfall. The correct pattern (a `delay: 1`
lag) already exists in the same file (`laggedAvgLCOE`).

## 3. Medium-severity findings

**Conservation violations**
- **M1. Migration leaks population:** default regional rates net to ≈ −1.2M
  people/yr (≈90M by 2100) in a closed-world model
  (`demographics.ts:87-171`). Rates should balance or a residual region
  should absorb the remainder.
- **M2. `GDP_SHARES` sums to 0.99** (`primitives/distribute.ts:8-11`), so
  every fallback regional split (`energy.ts:959`, `dispatch.ts:591`, and the
  unconditional capacity split at `dispatch.ts:717`) loses 1% of the global
  total. Renormalize in the function.
- **M3. Land budget double-counts desert** (`resources.ts:819-848`):
  climate-driven desert expansion is added on top of the residual, so
  farmland+urban+forest+desert exceeds `totalLandArea` (~300 Mha by 2100);
  the expansion term also applies the current climate factor retroactively to
  all past years. Separately, `availableLand` ignores desert, so the
  land-cap → foodStress feedback essentially never fires.
- **M4. Demand lock-in adjustment desyncs totals** (`demand.ts:1305-1306`):
  the adjustment is applied to global totals but not regional outputs, so
  `Σ regional.totalFinalEnergy ≠ totalFinalEnergy` whenever the floor binds.

**Parameter-lifecycle violations (per CLAUDE.md's own rules)**
- **M5. `TransferParams` drift** (`capital.ts:32-34` vs 209-218, 675-676):
  the interface lost `pensionRate`/`healthcareRate` but defaults and `step()`
  still use them (with non-null assertions). Runtime survives via deep-merge,
  but the params are invisible to types, `validate()`, and introspection —
  and this is the source of 11 of the 31 tsc errors.
- **M6. Dead params:** demand's `electrification2025` is defined/merged but
  never read (electrification is now sector-derived); cdr's `discountRate` is
  documented as the fallback but the actual fallback is a hardcoded `0.05`
  (`cdr.ts:246`) — exactly the "never hardcode a demoted param" pattern the
  conventions forbid. Overrides of either silently do nothing.

**Silent distortions**
- **M7. Mineral extraction is never constrained** (`resources.ts:744-766`):
  cumulative books unconstrained demand, nothing stops cumulative > reserves,
  and the depletion-energy clamp caps the penalty at ~4× forever — minerals
  can be mined past 100% of reserves indefinitely.
- **M8. Demand's `growthRate` output back-derives previous GDP assuming
  exactly 2% growth** (`demand.ts:1130`), biasing the regional output
  whenever actual growth differs (always).
- **M9. GDP-identity leaks in capital:** the 20% `workerConsumption` floor
  silently breaks `GDP = WC + I + transfers + debtService` when binding, and
  `retireeCost`/`childCost` outputs are uncapped while investment uses the
  capped burden (`capital.ts:706, 757, 765-768`). Tests tolerate 0.99–1.05.
- **M10. Demographics' `temperature ?? 1.2` fallback applies every year**
  (`demographics.ts:678`), masking wiring failures — and because both test
  files pass `{}`, the entire heat-stress mechanism has zero test coverage.

**Validation fragility**
- **M11.** `energyModule.validate()` crashes (TypeError) on partial nested
  params (`energy.ts:771-810`); dispatch's validate silently *passes* on
  partial records (`undefined < 0` → false); resources' validate throws on a
  partial `minerals` object. Safe today only because `validatedMerge`
  validates merged params — but the signatures accept `Partial<>`.
- **M12.** paramMeta/Tier-1 params with no validation rule: demand's
  `robotSaturation`/`dataCenterSaturation` (0 → division by zero,
  `demand.ts:1189`), demographics' `heatStressScale` (0 → NaN at
  `demographics.ts:763`), dispatch's `curtailmentOnset`/`curtailmentCoeff`,
  capital's fiscal/leverage/debt params, cdr's `tcre`/`damageCoeff`, climate's
  `airborneFraction`/`ppmPerGt`/`maxDamage`. Also `cdr.ts:230-232`:
  `cumulative2025 <= 0` → `log2(∞)` → cost collapses to 0, unguarded.

**Documentation / metadata drift**
- **M13.** `describeOutputs()` misattributes modules: `gdp` labeled `demand`
  (actually production), `heatStressLoss` labeled `climate` (actually
  demographics) (`standard-collectors.ts:68, 149`). This schema feeds LLM
  agents.
- **M14.** README.md describes a pre-migration system that doesn't exist
  (`energy-sim.js`, convergence iteration, `query.crossover`, types in
  `framework/types.ts`) — it contradicts both the code and CLAUDE.md's
  boundary rule. Reduce to a pointer at CLAUDE.md. scenarios/README.md's
  format example contains an `"expansion"` key that triggers the loader's own
  "unrecognized key" warning and lists 6 of 18 scenario files.
- **M15.** Stale value comments contradicting defaults: `climate.ts:56,59,60`
  (currentTemp 1.2 vs 1.45, damageCoeff 0.00236 vs 0.00536, maxDamage 0.30 vs
  0.50); `cdr.ts:74` calls 0.00536 "DICE-2023" (DICE-2023 is ~0.0035);
  `production.ts:50` says 0.30, default is 0.25; `capital.ts:745` states a
  debt-dynamics formula the code (correctly, per the adjacent design note)
  doesn't implement; `resources.ts:222` labels 4,800 Mha "cropland" (that's
  total agricultural land; FAO cropland ≈ 1,600 Mha) — repeated in
  CLAUDE.md's output table.
- **M16.** Duplicated runner logic: `computeMetrics`
  (simulation-autowired.ts:736) and `standardCollectors.metrics` are parallel
  implementations that have drifted (`peakTransferBurden` only in collectors;
  `peakPopulationYear`/`peakEmissionsYear` only in computeMetrics); the CLI
  table is copy-pasted between simulation.ts and simulation-autowired.ts.
  Also three different "total emissions" definitions exist (climate input
  includes −CDR; `peakEmissions` excludes it; `baselines/baseline.ts:81`
  excludes land use too).

## 4. Low-severity (selected)

- Energy retirement off-by-one: vintages live `lifetime + 1` years
  (`energy.ts:927, 1259-1261`).
- Zero-capacity lock-in: all addition paths scale off `prevInstalled`, so a
  source at 0 GW in a region can never be built (`energy.ts:1151-1181`).
- `curtailmentStorageBoost` is neutered by the battery ceiling it's meant to
  raise (`energy.ts:1125-1185`).
- Forest sequestration credited only in the year of net gain, not per-year as
  the param's unit states (`resources.ts:868-870`).
- Dead code: `globalDamages` vs identical `adaptedGlobalDamages`
  (`climate.ts:419-451`); unused `deaths`/`oldDeaths`
  (`demographics.ts:407-418`); most of `primitives/math.ts` has zero call
  sites, including `learningCurve`, which is imported by energy.ts but never
  called (implying Wright's Law runs through it when it doesn't).
- Framework: NaN guard skips arrays and stops at depth 3 (`autowire.ts:384`);
  collector `MetricDef.source` typos aggregate `undefined` silently
  (`collectors.ts:203-207`); `ComponentParams.get()` returns interior objects
  by reference despite the "immutable" docstring (`component-params.ts:34`);
  engine stores and reuses the same state object reference in history
  (`autowire.ts:651-652`); async tests are counted as passing before they run
  (`test-utils.ts:11-21` + `autowire.test.ts:762`).
- Validation warnings print 2–3× per run (mergeParams runs in three places).
- Metrics named `*2100` actually mean "final year" (simulation-autowired.ts:768).
- `simulation.ts:6-24` header dependency graph omits cdr; CLAUDE.md's graph
  says cdr reads from energy/dispatch directly, but its actual inputs are all
  lagged (cdr.ts:165-170).

## 5. Convention compliance (CLAUDE.md's calibration rule)

The "value, source, year" rule is applied inconsistently. Well-cited:
energy's capacity/carbon-price tables, capital's debt block, resources'
lithium block, demand's datacenter params. Systematically uncited:
demographics' entire `education` block (~80 numbers) plus `pop2025`/cohort
shares/migration rates; energy's `capex`/`eroi`/`lifetime`/`maxGrowthRate`/
`capacityCeiling` tables and even the headline learning rates α=0.36/0.23
(CLAUDE.md's own example for the rule); all of dispatch's
`capacityFactor`/`marginalCost`/`maxPenetration`; capital's
`alpha`/`depreciation`/`savingsPremium`/`transferPremium`/automation params;
resources' copper/steel/rareEarths/land/water blocks (`yieldDamageCoeff`
drives food stress and per convention needs two independent sources).
Magic numbers without sources: `OVERHEAD_EXERGY = 0.65` (production.ts:267),
`REGIONAL_BATTERY_MARKUP = 1.5` (energy.ts:1144), the 0.08 burden threshold
(capital.ts:773), the 0.5 forest-loss multiplier (resources.ts:829).

## 6. Test coverage

- **No test files at all:** `cdr.ts` (would have caught H1 with one
  assertion), `production.ts` (the GDP engine: year-0 normalization capture,
  overhead-collapse path, efficiency ratchet, damage stacking — all
  untested), and four of eight framework files (`collectors`,
  `component-params`, `introspect`, `validated-merge`, plus all of
  `problem.ts`).
- **Vacuous tests:** climate's "damages increase with temperature" never
  compares damages; resources has several `>= 0` / `typeof === 'number'`
  assertions that cannot fail; energy's "CAPEX learning reduces constraint"
  asserts `>= 0`.
- **Misleading tests:** dispatch.test.ts's `createInputs` passes `lcoes` and
  `solarPlusBatteryLCOE`, which `DispatchInputs` doesn't contain — the
  "cheapest source dispatched first" tests vary dead inputs and pass for
  unrelated reasons. Vestigial from a pre-merit-order design.
- **Missing test classes:** conservation tests (sector sums, population,
  land budget, regional-vs-global totals) — three high/medium bugs above are
  exactly this class; quantitative Wright's Law assertions; lag `delay > 1`;
  heat stress; foodStress/mineralConstraint/waterStress.
- **Strongest suites:** capital.test.ts (GDP identity, directional
  mechanism comparisons, 76-year boundedness, exact premium arithmetic) and
  climate.test.ts's energy-balance/committed-warming physics tests.

## 7. Notably well done

- **Fail-fast wiring discipline:** `requireOutput`/`yearZeroFallback`/
  `optionalOutput` encode three distinct missing-value intents; the
  cycle-breaker lint and the `trackReads` proxy + integration test catch
  subtle wiring bugs that static analysis wouldn't.
- **NaN-guarded test matchers** (`test-utils.ts:35-68`) and the per-step
  output-completeness + recursive NaN guard (`autowire.ts:394-409`) — the
  right defenses for a numeric simulation.
- **Two-pool capacity bookkeeping** in energy (global cumulative for learning
  vs regional installed for retirements) and the WACC→LCOE channel with a
  correct CRF and the r→0 limit handled — backed by discriminating tests.
- **Climate init solves deep-ocean temperature from the energy balance** and
  tests verify it numerically; all carbon unit conversions
  (44/12, ppm/Gt, GJ→TWh, kWh/ton≡TWh/Gt) check out.
- **compare-baselines.ts tolerance design** (absolute for physical,
  percentage for monetary, rationale documented, manual bless step).

## 8. Suggested priority order

1. Fix H1 (one-line `/1e9`) and add `cdr.test.ts` with a hand-computed SCC
   assertion.
2. Fix H2 (battery LCOS amortization) and H4 (shortfall release), with
   magnitude/conservation tests.
3. Fix H3 + M4 (demand accounting) and add `Σ sectors ≈ totals` and
   population-conservation tests.
4. Restore green `tsc --noEmit` (includes M5) and add it to `npm test`.
5. Delete or implement the phantom outputs (H5); add a collector-source ↔
   module-output completeness check; fix M13's attributions.
6. Fix H7 (`electricityGeneration` lag), H6 (barrel/`toThrow`/transform
   deps), M2 (renormalize `GDP_SHARES`).
7. Burn down the documentation drift (README, stale value comments) and the
   source-citation gaps, module by module.
