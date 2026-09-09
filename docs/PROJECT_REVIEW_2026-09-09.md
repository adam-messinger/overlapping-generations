**Project review — 9 September 2026**

Reviewed commit: `9302bdc`. No implementation changes were made during this review.

The module/lag abstraction is a good fit for the annual models, and the project has substantial conservation, sensitivity, and integration testing. The most consequential problems I found are incorrect regional dispatch and gaps in the forecast workbench's persistence, provenance, and resolution guarantees. Passing the current suites does not establish those guarantees.

| Dimension | Assessment |
| --- | --- |
| Correctness | Needs fixes: regional physical limits, persisted types, scoring, and resolution consistency |
| Security / data handling | Needs fixes: restricted-data export, prototype traversal, and private-address filtering |
| Performance | Ledger reads repeat whole-history verification; grows poorly with observation count |
| Abstractions / maintainability | Good simulation kernel; some contracts are descriptive without enforcing the represented behavior |
| Testing | Strong existing coverage, with gaps in independent numerical oracles, persistence round trips, concurrency, and script typechecking |

P1 means fix before relying on the affected outputs or guarantee. P2 means a concrete correctness, robustness, or maintainability issue that should be scheduled. Security impact below is conditional on the relevant data/path/network input being used; this review did not establish an externally accessible attack surface.

**Confirmed findings**

1. **[P1] Regional dispatch uses global capacity factors and can exceed local physical generation potential.** [dispatch.ts:674](/Users/adam/github/overlapping-generations/src/modules/dispatch.ts:674)

   `energy` computes regional solar/wind capacity factors, then emits fleet-weighted global averages. `dispatch` substitutes those averages into one parameter object and passes that same object to every region. Regions retain separate demand, capacity, carbon prices, and dispatch, so averaging their physical productivity is not equivalent to dispatching the regional fleets.

   Reproduced on the default 2025 run: OECD-ex-US has 630.30 TWh of solar potential under its own installed capacity and effective capacity factor, but dispatch serves 780.80 TWh, about **24% too much**. Russia has 4.70 TWh of potential and dispatch serves 6.84 TWh, about **46% too much**. The US and MENA are correspondingly understated. These errors affect regional fossil displacement, emissions, energy burdens, and downstream GDP feedback. A global sum can conceal the geographic error.

   Emit and consume capacity factors by region, with the same site-depletion calculation used in capacity planning. Add an invariant comparing each region's solar-derived and wind generation against its own physical potential. Preserve global averages only for aggregate diagnostics that actually need them.

2. **[P1] Audit export includes restricted observation values by default.** [audit.ts:150](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/audit.ts:150), [session.ts:285](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/session.ts:285)

   `recordObservationVersion(..., 'restricted')` accepts a classification, but the classification passed to `appendRecord` is not retained in the event or record index. Observation values are stored directly in the observation record. `exportAuditBundle` unconditionally includes every record artifact, applying restrictions only to selected referenced artifacts such as raw acquisitions and evidence views.

   Reproduced: an observation record containing `RESTRICTED_OBSERVATION_VALUE`, appended with classification `restricted`, is marked `included: true` and copied into the default bundle. The event log contains no retained classification for that record. Omitting the original restricted raw file therefore does not protect the normalized value.

   Persist classification as authoritative record metadata and propagate it through releases and observations. Export should enforce it for record bodies as well as referenced artifacts. Preserve an auditable pointer when withholding a body, and test the exported bytes for a restricted observation sentinel.

3. **[P1] Canonical persistence changes optional fields into objects, breaking round trips and audit export.** [canonical.ts:39](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/canonical.ts:39), [serialization.ts:10](/Users/adam/github/overlapping-generations/packages/tsimulation/src/serialization.ts:10), [vintage.ts:265](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/vintage.ts:265)

   Workbench persistence reuses `stableStringify`, which encodes `undefined` as `{ "$undefined": true }`. The artifact reader uses ordinary `JSON.parse` without decoding the marker. `createAcquisitionReceipt` explicitly includes absent optional fields, so an absent `license` or `schemaArtifactId` reloads as a truthy object.

   Reproduced with a normal receipt that omits optional fields: its reloaded value fails `validateAcquisitionReceipt` with `acquisition.license must not be empty`; audit export fails with `Invalid audit artifact ID '[object Object]'` because it treats the encoded `schemaArtifactId` as a reference.

   Separate a hash normalization format from the persisted JSON contract. Either omit undefined object properties under a documented JSON policy, or provide a versioned, unambiguous codec and matching decoder. Account for existing stored artifacts and hashes. Add create → persist → reload → validate → export tests, including every optional-field combination that changes control flow.

4. **[P1] Aggregations can cite real forecasts while using different probabilities or unbound performance weights.** [session.ts:580](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/session.ts:580)

   `recordAggregation` checks each cited forecast's question, forecaster, and timestamp, but never checks its prediction against `input.prediction`. It recomputes the aggregate from caller-supplied inputs. The result therefore agrees with the supplied copy without necessarily agreeing with the sealed forecasts.

   Reproduced: two sealed forecasts with probabilities `{low: 0.3, middle: 0.4, high: 0.3}` were cited by an accepted equal-weight aggregate assigning `{low: 1, middle: 0, high: 0}`. No sealed record was changed. Separately, performance-weighted aggregation only checks that cited training records are scores; it does not derive the supplied score values or availability timestamps from those records.

   Load predictions and performance data from canonical referenced records when calculating an aggregate. Enforce the forecaster/training-window relationship and actual score availability. Reject discrepancies instead of treating caller copies as evidence.

5. **[P1] Resolution updates can create conflicting final histories.** [session.ts:1037](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/session.ts:1037)

   The existing-final check runs before the ledger's serialized append transaction. The transaction callback only checks the question and closing time. Two concurrent final resolutions can both observe no previous final and both commit. Reproduced using `Promise.allSettled`: final resolutions for values 5 and 15 on the same ordered question were both accepted without supersession.

   Supersession validation also checks only record type. Reproduced: an amendment for question A can supersede a resolution belonging to question B.

   Validate the current resolution head under the append lock/transaction, using a compare-and-set predecessor rule similar to the existing forecast-series check. Require the predecessor to belong to the same question and to be the allowed current version. Test conflicting concurrent finalizations and cross-question amendments.

6. **[P2] Weighted interval score uses the wrong denominator.** [scoring.ts:151](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/scoring.ts:151)

   The numerator applies the standard median and interval weights, but divides by their sum (`0.775` for the default quantiles), rather than `K + 0.5` (`2.5` for two intervals). For quantiles `[0, 5, 10, 15, 20]` at the default levels and observation 10, the implementation returns **3.8709677**, whereas standard WIS is **1.2**. The outbreak model's separate scorer already uses `2.5`, so the repository has inconsistent scoring conventions. The [scoringutils reference](https://epiforecasts.io/scoringutils/reference/wis.html) specifies the standard normalization.

   A common multiplicative error does not change rankings on an identical quantile grid, but does corrupt absolute scores, comparisons with other implementations, and comparisons across grids. Correct the denominator, validate symmetric interval grids, version the scoring specification, and add an independently calculated expected value; the current test only checks `wis > 0`.

7. **[P2] Private-network filtering misses hexadecimal IPv4-mapped IPv6 addresses.** [acquisition.ts:113](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/acquisition.ts:113)

   `privateIp` understands `::ffff:127.0.0.1` only in dotted notation. It accepts the equivalent `::ffff:7f00:1`, as well as mapped private IPv4 ranges in hexadecimal form. Reproduced using the provided fetch runtime seam: resolving an allowlisted hostname to `::ffff:7f00:1` reaches the fetch callback even with private networks disabled. No real private-network request was made.

   Parse and normalize IPv6 addresses before classifying mapped IPv4 addresses. Also review the DNS check/use split: the current code validates one lookup and subsequently lets `fetch` resolve the hostname again. Address pinning is needed if the intended guarantee includes protection against DNS rebinding; an allowlist alone does not bind the checked address to the connection.

8. **[P2] Parameter paths can mutate `Object.prototype`.** [component-params.ts:54](/Users/adam/github/overlapping-generations/packages/tsimulation/src/component-params.ts:54)

   `ComponentParams.set` traverses inherited properties. `ComponentParams.from({}).set('__proto__.olgReviewProbe', 42)` sets the property on the global object prototype; a new unrelated `{}` then reads `olgReviewProbe === 42`. Reproduced in an isolated process and removed the probe afterward.

   Reject dangerous path segments and traverse only own properties, creating intermediate objects explicitly. Apply the same path policy to other dynamic parameter accessors. This is a process-wide correctness footgun even when paths originate from a local user rather than an HTTP request.

9. **[P2] The immutable parameter container retains caller-owned replacement objects.** [component-params.ts:66](/Users/adam/github/overlapping-generations/packages/tsimulation/src/component-params.ts:66)

   `set` clones the existing container but assigns the new `value` by reference. Reproduced: set a subtree `{x: 1}`, mutate the caller's original subtree to `{x: 99}`, and the supposedly immutable container now returns 99. This can make stored sweep parameters change without another container operation.

   Clone the inserted value using the same supported-value policy as `from` and `toParams`. Test mutation through the original replacement object, not only through values returned by `get`.

10. **[P2] Fixed-year summary metrics silently report the wrong horizon.** [standard-collectors.ts:350](/Users/adam/github/overlapping-generations/src/standard-collectors.ts:350), [standard-collectors.ts:403](/Users/adam/github/overlapping-generations/src/standard-collectors.ts:403)

    `population2100`, `warming2100`, and `gdp2100` use the last simulated row regardless of its year. Missing 2050 metrics return zero. Reproduced with `runSimulation({endYear: 2030})`: `gdp2100` is the 2030 GDP, **175.7023**, and `gdp2050` is **0**. The public API supports configurable horizons, and the CLI labels these as actual 2050/2100 results.

    Select the named calendar year and return an explicit unavailable value when absent. Add separately named terminal metrics with their terminal year if callers need them. Test shortened runs and runs extending beyond 2100.

11. **[P2] Strict regression comparison can return false success.** [compare-baselines.ts:132](/Users/adam/github/overlapping-generations/scripts/compare-baselines.ts:132)

    Missing metric values are skipped. Percentage-based metrics with a zero reference have `percentChange: null`, which explicitly suppresses warnings. Reproduced with one fixture removing `gdp2100` and changing `gridIntensity2050` from 0 to 1000: `--strict --json` reports zero warnings and exits 0.

    Validate the complete baseline schema and finite numeric values before comparing. Treat missing metrics as failures and define an absolute fallback tolerance when the reference is zero. Keep the existing missing-scenario protection.

12. **[P2] Root analysis scripts are outside typechecking and already contain stale API references.** [tsconfig.json:17](/Users/adam/github/overlapping-generations/tsconfig.json:17), [garrett-j-sweep.ts:71](/Users/adam/github/overlapping-generations/scripts/garrett-j-sweep.ts:71), [growth-backcast.ts:99](/Users/adam/github/overlapping-generations/scripts/growth-backcast.ts:99)

    The root tsconfig includes only `src`, while `tsx` executes scripts without typechecking. A temporary no-emit config including `src` and `scripts` reports four diagnostics: incomplete nested override typing in `china-vs-us.ts`, removed `YearResult.garrettJ` in `garrett-j-sweep.ts`, removed `ProductionParams.endUseEfficiencyMax` in `growth-backcast.ts`, and a model variance error in `new-simulations-suite.ts`.

    Two are direct behavioral defects: the Garrett sweep calls `.toFixed` on the removed field and catches each failure into an error row; the growth report interpolates `undefined` into its stated calibration. Add a scripts tsconfig to CI, remove or update obsolete scripts, and use a recursive override type where partial nested parameter records are supported at runtime.

13. **[P2] Read tracking can break otherwise valid typed-array parameters.** [liveness.ts:16](/Users/adam/github/overlapping-generations/packages/tsimulation/src/liveness.ts:16)

    The read tracker proxies every object and uses the proxy as the receiver for native accessors. Reproduced: `trackObjectReads({v: new Float64Array([1, 2])}).proxy.v.length` throws an incompatible-receiver `TypeError`. Typed arrays are used extensively by the aging model and are supported elsewhere in the framework, so enabling a diagnostic option can change a successful computation into a failure.

    Define supported tracked container types. Treat typed arrays and other native-slot objects as leaves or wrap them with receiver-safe access and methods. Add a parity check showing that enabling read tracking preserves model results for representative parameter shapes. The current default aging run does not enable this option.

14. **[P2] Every ledger record lookup re-verifies the entire history.** [ledger.ts:648](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/ledger.ts:648), [ledger.ts:713](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/ledger.ts:713), [session.ts:1324](/Users/adam/github/overlapping-generations/packages/forecast-workbench/src/session.ts:1324)

    `getRecord` invokes `initialize`, which rereads the full event log and rehashes every record artifact before the indexed lookup. Instrumentation on a 50-record ledger counted **2,500 artifact verifications for 50 record reads**. `findLogicalRecordId` then loops over record IDs and calls `getRecord` for each, so repeated logical-ID lookups during observation ingestion can compound into approximately cubic work as history grows.

    Separate initialization, incremental synchronization, targeted verified reads, and an explicit full audit. Index logical IDs by record type in the SQLite projection. Preserve integrity checks for the specific artifact being returned, and provide a coherent snapshot for export. Verify scaling by counting work at multiple ledger sizes instead of depending on noisy wall-clock thresholds.

**Abstractions and practices to improve**

- **Make executable contracts authoritative.** Adapter conversion functions are declared but never called by `runAdapter`; the handwritten `adapt` function owns the real conversion. A declared `$B → $T` conversion can coexist with an adapter that returns 1000 unchanged, and the runner accepts it. Some adapters deliberately use conceptual port names that do not match the object shape, so blindly applying model-style top-level validation would be wrong. Choose an explicit executable mapping/path model, or label the mapping as descriptive and require a validation function that checks the actual conversion. Avoid maintaining two independent descriptions of the same computation.

- **Give domain modules ownership of their registrations.** `registry.ts` has 2,037 lines and `registry-port-schemas.ts` has 1,392. Keep model definition, boundary contracts, calibration evidence, and adapters near each domain model; make the global registry a small composition list. Retain both the annual module kernel and black-box model API: different time structures justify them, and forcing every model into an annual loop would add artificial constraints.

- **Share invariant mathematics across layers.** The duplicate WIS implementations already disagree. Aging cohort survival/aging/birth transitions are separately expressed in nation, migration availability, and market updates. Extract small pure calculations where those mechanisms are intentionally identical, while keeping regional parameters and closures explicit.

- **Use an independent oracle where a claimed identity matters.** Many existing tests are valuable conservation and sensitivity tests. Extend that approach with regional generation limits, externally specified score formulas, typed persistence round trips, and races against the same logical head. A result can be finite, monotonic, deterministic, and still be wrong.

- **Update the architecture guide after model changes.** `CLAUDE.md` still describes investment as gross savings plus credit impulse, whereas the README and current capital implementation describe a profit-led monetary circuit and ex-post saving. The documentation is used as implementation guidance, so this discrepancy can cause future regressions. Similarly, `aging-places/scripts/global-city.ts` still says no US-only region exists even though it reads `regionalGdp.us`.

- **Keep disclosed modeling limitations visible in public outputs.** Capital already documents that special-purpose capex debits lag the physical build and that horizon-end spending is not debited. Global simulation initialization also mixes calendar anchors with configurable start years. These are interpretation issues rather than newly established implementation bugs here. Define start-of-year/end-of-year stock conventions and supported initialization dates before adding more bridges or making stronger accounting claims.

**What is working well**

The pure module interface, explicit lags, and topological wiring provide understandable causal structure. Deriving port lists and collector contracts reduces duplicated declarations. Conservation checks, the Godley ledger, diagnostics-off parity tests, deterministic ensemble/executor checks, and explicit development/holdout separation are substantial strengths. Source artifacts, event hashes, and forecast checkpoints are also sensible foundations once the persistence and enforcement gaps above are closed.

**Validation and scope**

The initial working tree was clean. I installed the locked dependencies and ran under the available Node **25.6.1** runtime; the default shell had Node 16 and could not support the project. CI pins Node **20.11.0**, which was not independently exercised in this review.

- `npm test`: passed, including framework, forecast-workbench, core, and aging suites and their configured typechecks.
- `npm run regression`: passed for all **seven** compared scenarios, with zero warnings. The CLI needed execution outside the sandbox because its IPC socket was blocked.
- Additional root-script typecheck: **four diagnostics**, described above.
- Dependency installation reported zero known vulnerabilities; this is not a substitute for the code-level data-handling review.
- Focused reproductions confirmed the numerical values, accepted invalid histories, round-trip failures, parameter mutations, filtering gap, and verification counts described above. Fixtures and logs were written under `/private/tmp`.

Useful local artifacts: [workbench reproduction](/private/tmp/olg-review-repro.mjs), [test log](/private/tmp/olg-review-tests.log), [regression log](/private/tmp/olg-review-regression.log), [script typecheck output](/private/tmp/olg-review-scripts-typecheck.log). Temporary artifacts may be removed by the system later.

This was a broad implementation review, with deeper inspection of the generic engine, forecast workbench, annual model composition, capital/energy/dispatch/demographic paths, aging composition and scoring, and selected outbreak/trade/Hormuz paths. It was not a line-by-line audit of every standalone scenario, an independent re-estimation of scientific calibration values, or a live audit of every external data connector. The WIS definition was checked against the primary implementation documentation linked above. No model source, calibration, baseline, or existing test was changed.
