# Remediation plan — project review of 2026-09-09

Companion to `docs/PROJECT_REVIEW_2026-09-09.md`. Every finding in that review
was independently reproduced before this plan was written. This is revision 2,
after an independent review of revision 1; the corrections it forced are noted
inline as **[rev2]** so the reasoning stays auditable.

## Ground rules

- **One mechanism per commit** (`CLAUDE.md` → Commit Scope). Baseline
  re-blessing is always its own *commit*, citing the cause — but not
  necessarily its own *PR*: CI gates per PR, so a change that moves the model
  must carry its re-bless commit in the same PR. **[rev2 — this was the single
  biggest defect in revision 1.]**
- **Every PR green on CI before merge**: `npm test` and `npm run regression`
  (`.github/workflows/test.yml:29-30`).
- **Bless baselines on Node 20.11.0.** CI pins it for float determinism.
  Verified: 20.11.0 reproduces `baselines/reference.json` on all 168 numeric
  fields exactly; Node 25 differs by 1 ULP on 59 of them — inside tolerance,
  but a re-bless captured on 25 would silently rewrite those digits. Develop on
  25 if convenient; capture on 20.11.0.
- **Each PR adds the test that fails before the fix**, in the same PR.
- **Each PR gets a `/simplify` pass before merge.**

## Ordering

```
A1a ─→ A1b ─→ A2a ─→ A2b          (codec before the event body that relies on it)
A3                                 (independent)
A4a ─→ A4b                         (independent)
A5+A6                              (independent)

C1 ─→ B1 ─→ B234 ─→ C2             (single baseline chain; see below)

C3, C4a/b/c, C5a/b, C6, C7, D      (independent)
```

**[rev2] Revision 1 claimed "A, C and D are independent of B". That is false:**
B4 and C2 both rewrite `baselines/reference.json`, and C1 turns a missing
metric key from a silent skip into a hard failure. So the three are one chain:
C1 tightens the comparator, B re-blesses values, C2 adds keys and re-blesses
again on top. **[rev2] Revision 1 also fanned A1 out to A3, A4 and A5; only
A2 actually depends on the codec.**

---

## Tranche A — forecast-workbench provenance and persistence

### A1a — `parseCanonical` in the framework  (Finding 3, part 1)

**[rev2] Revision 1 put the decoder in `forecast-workbench/src/canonical.ts`.
Wrong package.** The encoder is `packages/tsimulation/src/serialization.ts:1-32`;
`canonical.ts:39` only re-exports it. A decoder in `forecast-workbench` cannot
serve `tsimulation`'s own readers, and `tsimulation` may not import from a
consumer.

Add `parseCanonical()` to `packages/tsimulation/src/serialization.ts` beside
its inverse, decoding `$undefined`, `$number`, `$bigint`, `$date`. Framework
tests only. Rebuild the framework (`npm run build:framework`).

The round trip is hash-preserving: `normalize` re-emits `{$undefined:true}` for
a decoded `undefined` own-property, so `canonicalSha256Id(reloaded)` still
matches the stored id. Verify that as a test, not an assumption.

### A1b — Wire it into the readers  (Finding 3, part 2)

**[rev2] Two corrections.**

**Do not decode in `FileArtifactStore.getJson`.** That is the generic reader
for the whole store (`artifact-store.ts:149-151`), and `put`/`putFile` store
arbitrary third-party bytes — raw acquisition responses. Decoding there would
corrupt any external JSON legitimately containing a `$undefined`/`$number`/
`$date`/`$bigint` key. Add `getCanonicalJson()` for artifacts this codebase
wrote, or gate on the stored `mediaType`. Revision 1's excuse — that the
ambiguity is "inherited, not introduced" — covers the *encoder* writing its own
values; it does not license applying a decoder to bytes the encoder never
produced.

**`getJson` is not the only reader.** `parseRunManifest`
(`packages/tsimulation/src/manifest.ts:269`) does a bare `JSON.parse` and is
called on stored artifacts at `session.ts:464` and `session.ts:926`, via
`getText` — deliberately bypassing `getJson`. Revision 1 missed this path
entirely. Fix it too.

**Honest justification for decode-only.** Revision 1 said changing the encoder
would invalidate "every sealed event hash". `git ls-files` finds no committed
`events.jsonl`, `.sqlite`, or `objects/sha256` anywhere — every ledger in every
test and replay is built fresh in a temp dir, and `var/forecast-workbench/` is
gitignored. So that population is users' local ledgers only. Decode-only is
still the smaller and safer change; the argument for it is "no migration
needed for anyone's local ledger", not "the repo would break".

**Tests.** Create → persist → reload → validate → export for
`AcquisitionReceipt` and `SourceRelease` across every optional-field
combination; a marker round-trip through `parseRunManifest`; a third-party JSON
artifact containing a literal `$undefined` key surviving `getJson` unchanged.

### A2a — Persist classification  (Finding 2, part 1)

**Fix.** Event envelope `forecast-workbench.event/v2` carrying
`classification`; project it onto `records`.

**Verified in the plan's favour:** adding a field does *not* break v1
verification. `sealEvent` (`ledger.ts:177-186`) hashes the envelope minus
`eventId`/`eventHash`; `validateEvent` (`ledger.ts:230-234`) rehashes the same
remainder; `normalize` walks only `Object.keys`, so a v1 event with no
`classification` key hashes identically. Only the guard at `ledger.ts:193`
needs widening.

**[rev2] Three things revision 1 missed, all blocking.**

1. **No migration mechanism exists.** `SCHEMA` is 11 × `CREATE TABLE IF NOT
   EXISTS` and `initialize()` just `exec`s it (`ledger.ts:258-262`), so adding
   a column to `records` is a silent no-op on any existing database file.
   `PRAGMA user_version = 1` is written at `ledger.ts:168` and never read. Add
   a `user_version`-keyed migration — or drop and rebuild the projection from
   the canonical log, which this codebase already supports
   (`ledger-audit.test.ts:49`).
2. **`chainHead()` hard-codes `schemaVersion: 'forecast-workbench.event/v1'`**
   (`ledger.ts:756`) while the `events` table has neither a `schema_version`
   nor a `classification` column. Add both columns and fix the reconstruction.
3. **v1 has no classification, and the fallback must be explicit.** Rebuilding
   a pre-upgrade log leaves `records.classification` NULL for every legacy
   record, which A2b would then treat as unrestricted. **Decision: fail closed
   — unknown classification is treated as restricted for export purposes.**
   This is a security fix; the safe default is the restrictive one, and an
   operator who wants the legacy bodies can pass `includeRestricted`.

**Rejected alternative.** Classification could be a separate
`record-classification` record type, avoiding the schema bump. Rejected: it
leaves a window in which a restricted record exists unclassified, and makes
export correctness depend on a join that may be absent. Classification belongs
to the act of recording, so it belongs in the event.

### A2b — Enforce classification in export  (Finding 2, part 2)

`exportAuditBundle` withholds restricted record *bodies* by default
(`audit.ts:150` currently adds every record with `included` defaulted true),
keeping the manifest entry with `included:false` and a `restriction` reason.

**State the residual, don't hide it:** `events.jsonl` is still written for all
events (`audit.ts:259-264`) and the manifest lists each record id — which *is*
the sha256 of the withheld body. That is the intended "auditable by pointer";
say so in the PR and in `docs/FORECAST_WORKBENCH.md`.

**[rev2] Test-surface note:** the replay tests assert `verification:
'complete'` (`outbreak-2026/replay.test.ts:66`, `news/2026-07-28/replay.test.ts:125`)
and survive only because no replay uses `classification: 'restricted'`. A2b
changes what drives `incomplete` at `audit.ts:265` — verify that rather than
assume it.

### A3 — Compare-and-set on the resolution head  (Finding 5)

Move the prior-final query into `validateProjection`, requiring the incoming
`supersedesResolutionId` to equal the current head and the superseded record's
`question_hash` to match.

**Verified sound:** `validateProjection` runs at `ledger.ts:404`, immediately
after `BEGIN IMMEDIATE` (402), inside the cross-process append lock (395/446)
and the in-process serializer (371). `await this.initialize()` at 397 runs
inside the lock, so a competing process's commit is visible first. The
`resolutions` table already carries `question_hash`, `status` and
`supersedes_resolution_id` (`ledger.ts:143-149`). The precedent at
`session.ts:834-845` is real.

**[rev2] Preserve an existing exemption revision 1 would have silently
dropped.** `session.ts:1049-1053` permits a `cancelled` or `disputed`
resolution with no `supersedesResolutionId` even when a prior final exists. The
new predicate must keep that carve-out.

**[rev2] Also move `requireRecordType` inside the transaction** — it currently
runs outside at `session.ts:1058-1063`.

`putCanonical` writing the artifact before `BEGIN IMMEDIATE` (`ledger.ts:398`)
is fine: a rejected append leaves an orphan in a content-addressed store that
no reader can reach (`verify()`, `listRecords()` and `exportAuditBundle` all
walk the log or the projection). One sentence in the PR body; not a redesign.

**Tests.** Concurrent finalization (exactly one accepted); cross-question
amendment rejected; stale supersession rejected; cancelled-after-final still
accepted; ordinary amend-the-head still accepted.

### A4a — Aggregations must match the predictions they cite  (Finding 4, part 1)

Compare `canonicalJson(forecast.prediction)` against `input.prediction`
(`aggregation.ts:16`) in `recordAggregation`'s existing loop
(`session.ts:581-586`) and reject mismatches. Small and self-contained.

### A4b — Derive performance weights from score records  (Finding 4, part 2)

**[rev2] Split out, because it hides three spec decisions revision 1 glossed:**
`ScoreRecord` has no `forecasterId` (must join through the `forecasts`
projection); there is no designated performance metric among the five optional
`values` fields (`scoring.ts:33-39`); and `trainingScoreIds` is a flat list
with no per-forecaster structure (`aggregation.ts:30`). Settle all three
explicitly, then derive `performanceScore` / `performanceScoreAvailableAt` from
the records and recompute from record-derived inputs.

### A5 + A6 — WIS normalization and consolidation  (Finding 6)

**[rev2] Combined into one PR** — same ~30 lines, and A6's only meaningful test
is "did A5's number land".

**A5.** Divide by `K + 0.5` (`scoring.ts:168`); validate a symmetric grid.
Confirmed: default quantiles give `totalWeight = 0.775`; `[0,5,10,15,20]` at
obs 10 gives numerator `3.0`, so `3.0/0.775 = 3.8709677419354835` against a
standard `3.0/2.5 = 1.2`.

**[rev2] "Version the scoring specification" has no mechanism to hook into.**
`ScoringSpecification` (`scoring.ts:9-19`) has `schemaVersion` and
`version: string`, but no field selecting a normalization — bumping `version`
*labels* scores without letting old ones reproduce. Add an explicit
discriminant `wisNormalization: 'weight-sum' | 'k-plus-half'`, read at
`scoring.ts:168`, defaulting to `'k-plus-half'` in a bumped
`DEFAULT_SCORING_SPECIFICATION`. Old records then replay correctly from their
own embedded spec, which is what "stay interpretable" has to mean.

**Schedule the doc update:** the spec object is embedded in every `ScoreRecord`
(`scoring.ts:47`) and `ScoreSeriesSummary` (`scoring.ts:66`), so changing it
changes their hashes and stales the chain heads pinned at
`docs/forecasting-pilot/REFRESH_2026-07-28.md:145-147`. Not CI-breaking;
still ours to update.

**A6.** **[rev2] Revision 1's claim that the two implementations "already
agree" is arithmetically right but numerically wrong.** Coefficients are
bit-identical (`alpha = 2·p`, `weight = alpha/2` — exact in binary FP), but the
accumulation order differs: `scoring.ts:153` filters in declaration order and
adds the 95% term before the 50%, while `probabilistic.ts:229-233` adds 50%
first. Measured over 200k random triples: **23.9% of evaluations differ, max
relative deviation 4.5e-16.** Revision 1's proposed test ("pin the existing
values before and after") would fail.

Resolution: **reorder the shared accumulation to descending interval width** so
it matches, then the exact-equality pin holds. An API adapter is also needed —
`weightedIntervalScore` takes an array of `{probability, value}`
(`contracts.ts:129-134`) while outbreak holds a `Record`
(`probabilistic.ts:14`), inside the models × origins × horizons loop.

Blast radius is small: `probabilistic.test.ts:97-117` uses `toBe(0)` on a
degenerate forecast (order-independent) and 122-130 uses inequalities; the
outbreak replay scores are Brier/log, not WIS. `docs/forecasting-pilot/OUTBREAK_2026.md:250`
publishes a WIS table from the outbreak scorer — it must not move.

---

## Tranche B — regional dispatch capacity factors  (Finding 1)

**Problem.** `energy` computes regional capacity factors (`energy.ts:1653-1662`)
but emits only fleet-weighted global averages; `dispatch` substitutes those into
one parameter object and passes it to every region (`dispatch.ts:674-691`).
Reproduced on the default 2025 run, bare solar before any battery pairing:
oecd-ex-us serves 780.80 TWh against 630.30 of potential (**+23.9%**), russia
6.84 against 4.70 (**+45.6%**); us and mena are correspondingly understated.
Wind shows the same pattern.

**Measured blast radius** (prototype, reverted): `gdp2100` 1840.81 → 2029.90
(**+10.3%**), `gdp2050` +2.9%, `warming2100` +0.021 °C, `peakEmissions` +1.7%.

**Design verified sound.** Only `dispatch` consumes
`effectiveSolarCF`/`effectiveWindCF`; `energy` uses them internally just for
dynamic EROI (`energy.ts:1670-1671`), so keeping the global averages is right.
The regional values already apply site depletion through
`getRegionalCapacityFactor` (`energy.ts:783-803`) and are computed from
end-of-year capacity — the same capacity dispatch receives — so the review's
"same site-depletion calculation used in capacity planning" requirement is met
without touching the planning path.

### B1 — Emit regional effective capacity factors  *(own PR — true no-op, green)*

`energy` gains `regionalEffectiveSolarCF` / `regionalEffectiveWindCF`
(`unitPort('fraction', 'record')`, the pattern already used for
`netEnergyFraction` and `regionalWACC`). Nothing consumes them yet, so the model
is unchanged and `npm run regression` stays green.

### B234 — Consume, assert, re-bless  *(one PR, three commits)*

**[rev2] Revision 1 sequenced these as three separate PRs. That cannot pass
CI:** B2 moves `gdp2100` by 10.3% against a 5% tolerance, so a standalone B2 is
red until B4 blesses; and B3 landing before B2 (as a failing-first test should)
makes `npm test` red. CI gates per PR, `CLAUDE.md` governs commits — so one PR,
three commits:

1. **B3 first, as the failing test.** Assert per region and year that solar
   (bare plus the battery-paired share) and wind generation do not exceed that
   region's `capacity × regional CF × hoursPerYear`. Verified this invariant
   *does* hold after B2 despite `solarPlusBattery` using
   `params.capacityFactor.battery` (`dispatch.ts:325`): `remainingSolarGen`
   (`dispatch.ts:341`, drawn down 433-448) and the emergency-release cap
   (`dispatch.ts:465`) bound total solar-derived output by `maxGen.solar`, so
   the battery CF is a secondary ceiling, never an addition. **Assert against
   the capacities dispatch actually used** — it falls back to
   `distributeCapacitiesByGDP` when regional capacities are absent
   (`dispatch.ts:658`).
2. **B2 — the fix.** `dispatch` declares matching optional inputs and builds
   the CF override *inside* the region loop, falling back regional → global →
   parameter default.
3. **B4 — re-bless**, captured on Node 20.11.0, commit message citing the
   mechanism and the headline deltas.

Re-read `regional-divergence`, `net-zero` and the SSPs for narrative changes.

**Disclosure.** `CLAUDE.md` already notes solar's `capacityFactor` table is
"still mixed-convention" and that depletion counts build from zero. B2 makes
those regional numbers load-bearing for dispatch, so the PR must restate that
follow-up rather than let the fix read as having resolved it.

---

## Tranche C — guardrails

### C1 — Regression comparison rejects missing and non-finite metrics  (Finding 11)

Two defects, both confirmed: `compare-baselines.ts:133` skips undefined metrics
(`continue`), and `:136`/`:142` suppress the warning when the reference is 0
because `percentChange` is `null`. `NaN` slips through as well.

Validate every `METRICS` key present and finite on both sides; treat missing or
non-finite as failure alongside the existing missing-*scenario* protection
(`compare-baselines.ts:120-123`, which is real); add a per-metric absolute
fallback tolerance for a zero reference.

**[rev2] Revision 1's stated reason for C1 → C2 was wrong** (regression only
runs the default 2025-2100 horizon, where nothing is unavailable). The real
coupling is the reverse: after C1, a new metric key absent from the baseline is
red rather than silently skipped — so C2 must ship its re-bless.

### C2 — Named-year metrics report the year they name  (Finding 10)

**[rev2] Revision 1 miscounted and missed the harness. Corrected scope:**

- **Four** `last` aggregators, not three: `population2100` (352),
  `warming2100` (367), `gdp2100` (413), and **`fossilShareFinal` (398)** —
  which is the "separately named terminal metric" shape C2 wants to add.
- **Three** named-year closures, not two: `warming2050` (360), `gdp2050` (406),
  and **`kY2050` (428)**, which has the identical
  `years.indexOf(2050) >= 0 ? values[i] : 0` bug. Confirmed:
  `runSimulation({endYear:2030})` yields `kY2050 === 0`.
- **`scripts/baseline.ts` has the same defect inside the regression harness.**
  `baselines/reference.json` is not produced by `standardCollectors` at all —
  `extractMetrics` (`baseline.ts:69-127`) recomputes everything with
  `idx2100 = results.length - 1` (line 71) and `?? 0` on the 2050 index. Fixing
  the collectors alone leaves CI's own numbers wrong. Also note the two already
  disagree: reference `default.peakEmissions = 36.4596` vs the collector's
  `36.9881`, because `baseline.ts:78` omits the land-use `carbon.netFlux` that
  `standard-collectors.ts:371-377` includes. And `fossilShareFinal` is not
  merely `undefined` in the reference — **the key is absent**; the baseline
  uses its own `fossilShare2025/2050/2100`.
- **Two downstream consumers** must handle the unavailable value:
  `src/simulation.ts:617-625` calls `.toFixed()` directly on six of these
  metrics, and `src/ensemble-model.ts:326` declares `'number'` measurement
  ports with an assertion at `:351`. Plus the `SimulationMetrics` type.

**[rev2] Do not add a framework `atYear` aggregator.** `MetricAggregator`
already has `{custom: (values, years) => any}` (`collectors.ts:79-85`), which
all three named-year metrics already use — a domain-local helper in
`standard-collectors.ts` needs no framework change and no rebuild. Worse,
moving off `'last'` *loses* behaviour: `collectors.ts:644-646` special-cases
`!transform && aggregator === 'last' && source` to inherit the source port's
unit contract, which is exactly how these metrics get their contracts today,
and `collectors.ts:361-368` makes any non-`'last'` aggregator without an
explicit `outputType` throw under `semanticValidation: 'required'`.

**Verified no-op for the blessed baseline:** defaults are 2025-2100
(`simulation-autowired.ts:979-980`), the loop is inclusive
(`autowire.ts:1548-1550`) giving `years[75] === 2100`, and `'last'` resolves to
the final element (`collectors.ts:474-476`). `warming2100 === results[75].temperature`
and `gdp2100 === results[75].gdp` numerically. So the *value* change is nil;
the re-bless is only for the new keys.

**Opportunistic fix while in this file:** `peakTransferBurden`
(`standard-collectors.ts:415-419`) is computed and never mapped into
`SimulationMetrics` by `toSimulationMetrics` (`simulation-autowired.ts:1053-1071`).
Wire it up or delete it.

**Tests.** Shortened run (`endYear: 2030`), extended run (`endYear: 2120`),
default run bit-identical.

### C3 — `ComponentParams` path policy and value ownership  (Findings 8, 9)

**[rev2] Revision 1's scope was wrong in both directions.**

**Narrower than stated:** of the three segments revision 1 proposed to reject,
only `__proto__` is exploitable. `component-params.ts:61`
(`typeof current[parts[i]] !== 'object'`) already neutralizes `constructor` —
it is a *function*, so line 62 overwrites it with a fresh own `{}`. Confirmed:
`set('constructor.prototype.pwned','Y')` leaves `({}).pwned === undefined`.
Reject all three anyway as defence-in-depth, but do not describe them as three
live holes.

**Broader than stated — three additions:**

1. **`ComponentParams.get` has the identical flaw** at
   `component-params.ts:43`. Confirmed: with `Object.prototype.sneaky` set,
   `get('a.sneaky')` returns `'inherited'`. Read-only, but it is a
   prototype-chain read oracle and `get('__proto__')` reaches
   `structuredClone(Object.prototype)`. (`entries()`/`paths()` are safe —
   `walkNumericLeaves` uses `Object.keys`.)
2. **There is a user-controlled path into `set`:**
   `scripts/human-capital-trajectory.ts:63` forwards a `--set=<path>=<value>`
   CLI argument straight into `ComponentParams.set`. The other call site
   (`src/introspection.ts:92`) is safe.
3. **`src/primitives/deep-merge.ts:24-33` + `src/scenario.ts:47` admit the same
   class from scenario JSON.** `JSON.parse` creates an *own* `__proto__` key so
   `Object.keys` does not save `deepMerge`, and the unrecognized-key guard is
   `if (!(key in defaults))` — `in` walks the prototype chain, so `__proto__`,
   `constructor` and `toString` all pass the "unknown parameter" check
   silently. This is the one place in the repo where a path really is
   externally supplied, so it belongs in this PR rather than deferred.

**Two traps for the tests.** The by-reference aliasing (Finding 9) reproduces
**only with a single `set`** — chaining `.set().set()` re-clones at line 56 and
severs the alias, so a chained test silently passes. And `structuredClone` (the
policy being reused) *throws* on functions, so `set(path, fn)` — which
currently succeeds and fails later — would begin throwing at insert time. No
current caller does that; note it.

### C4 — Typechecking  (Finding 12)  **[rev2] split three ways**

**C4a — mechanism.** Add `tsconfig.scripts.json` and `typecheck:scripts` wired
into `npm test`; fix the four diagnostics mechanically. Implementation note:
`tsconfig.json:8` sets `"rootDir": "./src"`, so a config extending it and
adding `scripts/**/*` produces "is not under rootDir" errors — override
`rootDir` explicitly. The `new-simulations-suite.ts:88` diagnostic is a
`ModelDefinition<TInput,TOutput>` → `ModelDefinition<any,any>` variance
failure, not a one-liner; `china-vs-us.ts:63` wants a recursive partial
override type since nested partials work at runtime.

**C4b — `growth-backcast` repair, not removal. [rev2] Revision 1 proposed
deleting a script a live test depends on.** `growth-backcast.ts:210` writes
`scripts/growth-backcast.md`, which is **committed** and cited as calibration
provenance by `src/modules/production.test.ts:114-125` ("Changing elasticities,
efficiency params, or the observed series breaks this pin"), and named as a
consumer at `src/historical-backcast.ts:4`. `endUseEfficiencyMax` is genuinely
gone — `production.ts` has only `endUseEfficiency0` — so the fix is to drop the
η_max bullet at `growth-backcast.ts:99` and regenerate the md, which currently
still asserts "η_max = 0.9 — Cullen & Allwood (2010)"
(`growth-backcast.md:26`) for a parameter the model no longer has. That makes
this a **calibration-documentation change requiring a sourced commit message**
per `CLAUDE.md`, not a typecheck cleanup.

**C4c — remove `garrett-j-sweep.ts`.** `r.garrettJ.toFixed(3)` inside a `try`
that prints `ERROR:` per row; no doc or npm-script referent anywhere. Removal
is correct here.

**[rev2] Scope honesty.** "Scripts are outside typechecking" is true of root
`scripts/`, but `aging-places/scripts` and `aging-places/japan` are *already*
covered by `aging-places/tsconfig.json` and run by `test:aging`. The genuinely
uncovered surface is `packages/tsimulation/test/` (181 diagnostics) and
`examples/` (2) — excluded by the package tsconfig while `node --test` runs
those very files, with an unused `typecheck` script already defined. Tracked as
**C8**, not silently folded in.

### C5 — Ledger read path  (Finding 14)  **[rev2] split two ways, and rescoped**

Instrumented: 25 reads → 625 verifications, 50 → 2,500, 100 → 10,000.

**C5a — targeted verified reads and incremental sync.** `getRecord` verifies
only the artifact it returns; `verify()` stays the explicit full audit that
`exportAuditBundle` already calls (`audit.ts:128`).

**[rev2] Revision 1's "cheap sequence-count check" is not cheap and its
acceptance test would pass while the bug remained.** Counting sequences means
`readEventLog()` (`ledger.ts:634-646`), which reads and splits the whole file —
O(N) bytes × N reads = **O(N²) I/O**, saving only the per-artifact sha256.
And revision 1's test counted *artifact verifications only*, so it would go
green with the quadratic file read intact. Required: an in-memory cache keyed
on file size/mtime (or a stored byte offset), and a test that counts **bytes
read as well as verifications** at 25/50/100.

**[rev2] State what is being given up.** Today every `initialize()` re-validates
the whole chain and rehashes every artifact, so out-of-band tampering with
*any* artifact is caught on the next read of *any* record. A targeted read
catches none of: an in-place rewrite preserving line count, tampering with
records other than the one returned, or a same-length event mutation. That
narrowing is acceptable — `verify()` remains — but it must be stated and
`docs/FORECAST_WORKBENCH.md` updated.

**[rev2] Revision 1's reassurance was false.** It said "existing integrity
tests must still pass, including detection of a tampered artifact on the read
path." **There is no such test** — `ledger-audit.test.ts:153-158` tampers with a
file and then calls `store.put`, the *write* path. So this PR must **add** the
read-path tamper test before it can claim to preserve the property.

**C5b — generic logical-id projection.** **[rev2] Revision 1 said "index
`logical_id`". It cannot be an index change:** `logical_id` exists on exactly
two tables (`evidence_packets` `ledger.ts:100`, `model_forecasts` `:137`), but
`findLogicalRecordId` is called for **eight** record types — acquisition-receipt,
source-release, observation-version, dataset-snapshot, conditional-set,
aggregation, trigger, monitor-check — and `projectRecord` (`ledger.ts:486-632`)
projects none of them. This needs a new generic logical-id table, population
logic for eight types, and a backfill — with the same migration problem as A2a.

### C6 — Read tracking preserves native objects  (Finding 13)

**[rev2] Invert the rule.** Revision 1 listed leaf types to exclude; that
allowlist keeps leaking — it misses bare `ArrayBuffer` (`ArrayBuffer.isView`
returns `false`, so `byteLength` still throws), `Promise`, boxed primitives,
`WeakMap`/`WeakSet`/`WeakRef`, and any class with `#private` fields. There are
two distinct mechanisms: accessors backed by internal slots throw at
`liveness.ts:16` (proxy as receiver), while extracted *methods* succeed and
throw later at the call site with `this = proxy`. The robust formulation is the
inverse — **wrap only objects whose prototype is `Object.prototype` or
`Array.prototype`; everything else is a leaf.**

**[rev2] `leafPaths` has the same hole** (`liveness.ts:34-39`) and revision 1
omitted it. It special-cases `Array.isArray` but not typed arrays, so confirmed:
`leafPaths({stat:{pop:new Float64Array([1,2,3])}})` returns
`['stat.pop.0','stat.pop.1','stat.pop.2']`. Fixing only the proxy leaves a
typed-array override producing N spurious `unreadOverridePaths` entries — one
warning per element, or a thrown error under `paramLiveness: 'error'`.
`Map`/`Date` survive only by accident (`entries.length === 0` → leaf at line
37). Apply the same leaf policy to both.

**Reachability, stated honestly in the PR:** one production call site
(`autowire.ts:1100`, gated on `paramLiveness !== 'off'`). The aging model passes
`Float64Array`s as module params (`aging-places/src/simulation.ts:278,286`) but
defaults to `'off'`; the energy model defaults to `'warn'`
(`simulation-autowired.ts:989`) but has no typed arrays. So this is one config
line from firing, not currently firing.

### C7 — IPv6 classification  (Finding 7)  **[rev2] substantially rescoped**

**The classifier must operate on the parsed group array, never on the string.**
Revision 1 named five bad addresses and proposed "detect the mapped prefix
numerically", which does not close the family:

- **Brackets — and revision 1 missed this entirely.** `acquisition.ts:250` reads
  `isIP(url.hostname) && privateIp(url.hostname)`, but for any IPv6 literal URL
  `new URL('https://[::1]/').hostname === '[::1]'` and **`isIP('[::1]') === 0`**
  (confirmed). So the direct-literal check is **dead code for every IPv6
  destination**. It fails closed today only because the default resolver rejects
  the bracketed string.
- **The dotted regex can never match a URL-derived hostname**: WHATWG `URL`
  canonicalizes `[::ffff:127.0.0.1]` → `[::ffff:7f00:1]` (confirmed). It only
  ever sees strings from `resolveHost`.
- **Node's resolver returns the hex form verbatim** for the exact options
  `defaultRuntime.resolveHost` uses (`acquisition.ts:95-98`), so this is not
  string-crafting — a hostile AAAA record for an allowlisted host produces the
  bypass through the normal path.
- **Expanded and padded spellings**: `0:0:0:0:0:0:0:1`, `0000:…:0001`,
  `::0:0:0:1`, `0:0:0:0:0:0:0:0` all evade the literal string comparisons and
  `startsWith` prefixes at `acquisition.ts:120-126`.
- **NAT64 / 6to4**: `64:ff9b::7f00:1`, `64:ff9b::a9fe:a9fe` (RFC 6052 —
  the second reaching cloud metadata), `2002:7f00:1::`.
- **`::ffff:a9fe:a9fe`** — hex-mapped `169.254.169.254`.

**Do not widen the IPv4 branch.** `privateIpv4` (`acquisition.ts:101-111`)
already covers `0/8`, `10/8`, `127/8`, `169.254/16`, `172.16/12`,
`192.168/16`, `100.64/10` and `>= 224`, and fails **closed** on anything that
is not four integer octets; octal/decimal/hex forms are canonicalized by `URL`
first.

**[rev2] Priced-in cost:** `203.0.113.x` (TEST-NET-3) is the canonical "public"
fixture address in eight existing tests (`test/acquisition.test.ts:55,97,124,186,212`;
`test/source-connectors.test.ts:95,169,247`). Completing the reserved-range
list breaks all eight. **Decision: leave TEST-NET-3 allowed** rather than churn
the fixtures for a range with no exploit value.

**Scope note on rebinding.** The code validates one lookup then lets `fetch`
resolve again (`acquisition.ts:250-256`). This PR fixes the classifier and
*states the guarantee* — allowlist plus best-effort resolution check, not
rebinding-proof. Pinning is deferred (below).

**Tests.** Table-driven over every form above, including the resolver-shaped
hex spellings — the existing coverage at `test/acquisition.test.ts:152-176`
tests the mapped case in the *one dotted spelling the regex handles*, which is
why the suite is green while every hex form is open.

### C8 — Typecheck the framework's own tests and examples  **[rev2] new**

`packages/tsimulation/test/` (181 diagnostics) and `examples/` (2) are excluded
by the package tsconfig while `node --test` runs those very files; both packages
already define an unused `typecheck` script. Own PR — 183 diagnostics is not a
rider on anything.

---

## Tranche D — documentation the review flagged as actively misleading

**D1.** `CLAUDE.md:219` still states `Investment = max(0, grossSavings +
creditImpulse)` while `README.md:24` and `capital.ts:567` describe a profit-led
monetary circuit in which `grossSavings` is an ex-post alias
(`capital.ts:194`). `CLAUDE.md` is read as implementation guidance.

**D2.** `aging-places/scripts/global-city.ts:96` says "the global model does
not yet expose a US-only region" while line 49 reads `regionalGdp.us`.

**D3. [rev2 — promoted from deferred.]** Annotate `portMappings[].convert` at
`packages/tsimulation/src/adapter.ts:58-69` as **descriptive, not executed**.
`runAdapter` (`:256-290`) never calls it; the handwritten `adapt` owns the real
conversion, so a declared `$B → $T` can coexist with an adapter returning the
value unchanged. The full remedy is a design decision and stays deferred — but
leaving an unmarked false declaration in code, in the same PR series that fixes
D1 and D2 for exactly that reason, is inconsistent. One comment now.

D1–D3 can share a PR.

---

## Deferred, with reasons

- **Executable adapter contracts** — the design decision (executable mapping
  model vs. descriptive mapping plus a required validation function). D3 lands
  the marker in the meantime.
- **Registry decomposition** — `registry.ts` 2,037 lines,
  `registry-port-schemas.ts` 1,392. Large mechanical refactor; wants a quiet tree.
- **Aging cohort transition duplication** — needs a careful read of where the
  three expressions are intentionally *different* before extracting.
- **DNS address pinning** — changes the connection path; own test surface. See C7.
- **Start-of-year / end-of-year stock conventions** — the review calls these
  interpretation issues, wanting a convention decided before more bridges.

## PR list

| PR | Scope | Gate |
|---|---|---|
| A1a | `parseCanonical` in `serialization.ts` | framework tests |
| A1b | `getCanonicalJson` + `parseRunManifest` wiring | round-trip matrix |
| A2a | event v2 + migration + v1 fail-closed policy + `chainHead` | rebuild test |
| A2b | export withholds restricted bodies | sentinel-absent test |
| A3 | resolution CAS (keeping cancelled/disputed exemption) | race + cross-question |
| A4a | aggregation prediction match | tamper test |
| A4b | performance weights from score records | three spec decisions first |
| A5+A6 | WIS denominator + `wisNormalization` + consolidation | `1.2` oracle |
| B1 | emit regional CFs | no-op, green |
| B234 | invariant + fix + re-bless (3 commits) | bless on Node 20.11.0 |
| C1 | comparator strictness | fixture test |
| C2 | named-year metrics + `baseline.ts` + consumers + re-bless | short/long-run tests |
| C3 | `set`+`get` path policy, value clone, `deep-merge`/`scenario.ts` | pollution + aliasing |
| C4a | scripts tsconfig in CI | 4 diagnostics |
| C4b | `growth-backcast` repair + regenerated md | sourced commit |
| C4c | remove `garrett-j-sweep.ts` | — |
| C5a | targeted reads + cached sync | bytes-read linearity + tamper-on-read |
| C5b | generic logical-id projection + migration | eight record types |
| C6 | inverse leaf rule in proxy **and** `leafPaths` | parity check |
| C7 | parsed-group IPv6 classifier + brackets | table-driven |
| C8 | framework test/example typecheck | 183 diagnostics |
| D | D1 + D2 + D3 | — |
