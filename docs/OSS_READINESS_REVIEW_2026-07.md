# Open-Source Readiness Review — July 2026

Scope: a fresh bug/footgun/optimization pass over the whole tree, framed by the
question **"is this ready to be published publicly?"**. Complements — does not
repeat — `docs/codebase-review-2026-06.md` (bug hunt) and
`docs/ARCHITECTURE_REVIEW_2026-07.md` (layering).

Tree reviewed: 82,492 lines of TypeScript — `src` (45,798), `packages/tsimulation`
(13,916), `aging-places` (12,829), `scripts` (9,949). Environment: Node 22.22.2,
npm 10.9.7. Every claim below was verified by running code; repros are inline.

---

## Verdict

**The model is in good shape. The repository around it is not yet.**

The numerical core is more robust than most simulation code of this size — see
[What's genuinely good](#whats-genuinely-good), which includes a clean sweep of
every Tier-1 parameter at both bounds with zero non-finite values and zero
throws. Almost every high-severity finding from the June review is fixed and
verified fixed here.

The blockers are on the *outside*: a licensing exposure that publishing would
make irreversible, a destructive script with no guard, and 10k lines of code
that no typechecker has ever seen.

Ranked by what I'd fix before flipping the repo public:

| # | Finding | Kind | Severity |
|---|---------|------|----------|
| 1 | 33 MB of third-party copyrighted PDFs in tree **and history** | Legal | **Blocker** |
| 2 | `bless-baseline` silently overwrites the regression guard | Footgun | **High** |
| 3 | `scripts/` (9,949 lines) is outside every `tsconfig` — 7 live type errors | Correctness | **High** |
| 4 | 4 scripts are dead: 3 import a deleted path, 1 errors on every row | Correctness | **High** |
| 5 | Zero-capacity lock-in: a region at 0 GW can never build that source | Bug | Medium |
| 6 | Double validation → a single warning prints 58× per run | Footgun | Medium |
| 7 | Mineral extraction books demand it just said couldn't be supplied | Bug | Medium |
| 8 | No CONTRIBUTING / CoC / SECURITY / issue templates / linter / `.nvmrc` | OSS hygiene | Medium |
| 9 | Scripts dirty the working tree as a side effect of running | Footgun | Medium |
| 10 | `generations` — a pure diagnostic — is ~10% of runtime, always on | Perf | Medium |
| 11 | 32 exported framework functions have zero consumers | API surface | Medium |
| 12 | `src/simulations/` (19.6k lines) is undocumented in CLAUDE.md | Docs | Low |

---

## 1. Copyrighted PDFs in the repo and in git history — **publishing blocker**

18 third-party PDFs, **33.3 MiB**, are committed:

```
7.03 MiB  docs/burke-hsiang-miguel-2015.pdf          Nature (Springer)
4.94 MiB  docs/pastor-2014.pdf
4.68 MiB  docs/iea-2021-critical-minerals.pdf        IEA — explicitly non-redistributable
3.25 MiB  docs/schewe-2014.pdf                       PNAS
2.58 MiB  sources/weber/Weber-2023-Sellers-Inflation-WP571.pdf
2.45 MiB  docs/geoffroy-2013-part2.pdf               AMS J. Climate
... plus sources/ssrn-*.pdf and 11 others
```

Today this is a private repo, so it's a non-issue. Publishing turns it into
redistribution of paywalled publisher content. The IEA one is the sharpest case
— IEA report terms specifically prohibit redistribution.

**They are also in history**, so deleting them from `HEAD` does not remove them:

```
$ git rev-list --objects --all | git cat-file --batch-check=... | awk '$4 ~ /\.pdf$/'
18 pdf blobs, 33.2647 MiB
```

**Recommendation.** Each PDF is committed exactly once (18 files → 18 blobs), so
a `git filter-repo --path-glob '*.pdf' --invert-paths` is clean and cheap. Do it
*before* the repo is public — after, the objects are on forks and archives
forever. Replace each with a citation stub (DOI + URL + accessed-date); the
`sources/*.md` notes already do exactly this well and are the model to follow.
Bonus: the pack drops from 75.8 MiB to roughly 42 MiB.

---

## 2. `bless-baseline` overwrites the regression guard with no guard of its own

`scripts/bless-baseline.ts` promotes `baselines/current.json` →
`baselines/reference.json`. Its own docstring says:

> Promotes … **after the user has reviewed the diff** and accepts the change as
> intentional. This must be an **explicit, manual** operation.

The code enforces none of that. No argument, no confirmation, no diff shown, no
`--yes`, no check that `compare-baselines` was ever run:

```ts
fs.copyFileSync(CURRENT, REFERENCE);
```

I hit this accidentally: a loop that ran every file in `scripts/` to check they
still execute silently re-blessed the reference. `git status` afterwards:

```
 M baselines/reference.json
```

**This compounds with a second problem.** CI pins Node `20.11.0` with the
comment *"Pinned for float determinism — changing this requires re-blessing the
reference baseline."* But `package.json` says `"node": ">=20"` and there is no
`.nvmrc`, so contributors are actively invited onto a different Node. Blessing
from Node 22 shifts every metric:

```
warming2050            1.993552680516628  →  1.9936094348555478
electrificationRate2025  0.20958251947149453 → 0.20958192702462208
```

Run-to-run on one Node is **bit-identical** (verified: two `capture-baseline`
runs produced byte-identical JSON), so this is purely cross-version libm drift,
amplified by the 28-iteration fixed-point lag bootstrap. The regression
tolerances absorb it — `npm run regression` passed clean on Node 22 — but a
`bless` from the wrong Node silently re-anchors the reference to a float regime
CI does not use, and the diff looks like a legitimate model change.

**Recommendation.** Require an explicit `--yes`; print the
`compare-baselines` diff and refuse to proceed unless it was generated in the
same invocation; warn loudly if `process.version` ≠ the CI pin. Add `.nvmrc`
with `20.11.0` and tighten `engines.node`. This is the single highest-leverage
15-line change in the repo.

---

## 3. `scripts/` is outside every tsconfig — 7 real type errors are invisible

`tsconfig.json` has `"include": ["src/**/*"]`. `aging-places/tsconfig.json`
covers its own `scripts/`. **Nothing covers the root `scripts/` directory** —
9,949 lines, 46 files. `npm test` runs `npx tsc --noEmit`, which checks 128
files, none of them in `scripts/`.

Typechecking it standalone surfaces 7 errors:

```
scripts/electricity-2050.ts(2,34):      TS2307 Cannot find module '../src/framework/autowire.js'
scripts/heat-stress-by-region.ts(2,34): TS2307 Cannot find module '../src/framework/autowire.js'
scripts/regional-tailwinds.ts(12,34):   TS2307 Cannot find module '../src/framework/autowire.js'
scripts/garrett-j-sweep.ts(71,16):      TS2339 Property 'garrettJ' does not exist on type 'YearResult'
scripts/growth-backcast.ts(99,37):      TS2551 Property 'endUseEfficiencyMax' does not exist on ProductionParams
scripts/china-vs-us.ts(63,5):           TS2740 Partial Record<Region, RegionalEnergyParams>
scripts/new-simulations-suite.ts(88,22):TS2322 ModelDefinition<TInput,TOutput> not assignable
```

The first three are fallout from the `src/framework/` → `packages/tsimulation`
migration. The fourth is fallout from deleting the phantom `garrettJ` output
(June H5). Both refactors were done correctly in `src/` and left `scripts/`
broken, precisely because the typechecker never looked.

**Recommendation.** Add a `tsconfig.scripts.json` (or drop `rootDir` and widen
the root `include`) and put it in `test:core`. This is the mechanism that would
have prevented findings #3 and #4 entirely.

### 3a. `growth-backcast.ts` publishes results from a parameter that does nothing

`scripts/growth-backcast.ts:99` sets `endUseEfficiencyMax`, which is not a
`ProductionParams` field. The override is silently dropped; the script exits 0
and rewrites the committed `scripts/growth-backcast.md`. So a checked-in
validation artifact is generated under an assumption the model never applied.
(The autowire liveness proxy *does* warn about unread overrides — the warning is
just lost in the noise of finding #6.)

---

## 4. Four scripts are dead; one fails loudly only in its output

I ran all 46 scripts. 37 pass. Of the 9 failures, 5 are legitimate — they need
external data or CLI args and say so clearly (`generational-backcast.ts` prints
an excellent usage block; `build-trade-network-snapshot.ts` needs a Census API
key), and 2 are just my 120 s timeout (`parameter-sweep`, `learning-damage-sweep`).

The 4 real ones:

- `electricity-2050.ts`, `heat-stress-by-region.ts`, `regional-tailwinds.ts` —
  hard `ERR_MODULE_NOT_FOUND` on the deleted `src/framework/autowire.js`.
- `garrett-j-sweep.ts` — **exits 0** while every single row prints an error,
  because it reads the removed `garrettJ` field and catches per-row:

```
Case                                        2025  2040  2060  2080  2100
baseline              ERROR: Cannot read properties of undefined (reading 'toFixed')
sensitivity=2.5       ERROR: Cannot read properties of undefined (reading 'toFixed')
... (15 more identical rows)
```

`garrettJ` was deleted as a phantom output. The sweep that studied it should
have gone with it.

**Recommendation.** Delete all four. CLAUDE.md's own rule — *"when a new
approach replaces an old one, remove the old code in the same or next commit"* —
already covers this. Also worth noting: 16 of 46 scripts are referenced nowhere
in README, `package.json`, `docs/`, or CLAUDE.md. A public repo should not ship
a `scripts/` directory a third of which is undiscoverable.

---

## 5. Zero installed capacity is an absorbing state

`src/modules/energy.ts:1413`:

```ts
const growthCapped = prevInstalled * maxGrowth;
...
desired = Math.min(desired, growthCapped, ceilingRoom);
```

Every addition path scales multiplicatively off `prevInstalled`, including the
"small baseline growth (R&D, pilots)" fallback at `:1383` and `:1407`. If a
region holds 0 GW of a source, `growthCapped === 0` and it can never build it —
regardless of cost, policy, or demand.

Exactly one region/source pair starts at zero today:

```
$ energyModule.init(energyDefaults) → regional[*][*].installed === 0
  seasia/nuclear = 0
count = 1
```

Repro — nuclear at **$1/kW** (essentially free), 76 years:

```
nuclear installed after 76y, capex=$1/kW:
  oecd     193.4 GW      seasia     0.0 GW   ←
  china     22.8 GW      russia     4.6 GW
  india      3.0 GW      mena       1.9 GW
  latam      1.9 GW      ssa        0.8 GW
```

Southeast Asia builds *nothing* while every other region responds. The impact
on headline metrics today is small — it is one region and one source — but it is
a silent structural trap: any future scenario that seeds a new technology at
zero anywhere gets a permanently dead branch with no warning.

**Recommendation.** Give the pilot path an additive floor rather than a
multiplicative one — e.g. `Math.max(prevInstalled * MIN_CAPACITY_GROWTH,
seedCapacityGW)` when the source is competitive — and add a test asserting that
a zero-capacity region with a competitive source reaches non-zero capacity.

---

## 6. Every module is merged 30× and validated 58× per run

Measured on one `runSimulation()`:

```
climateModule.mergeParams calls: 30    validate calls: 58    init calls: 28
warning emissions for ONE run with ONE out-of-range param: 58
```

Two independent causes multiply:

1. **Double validation.** `autowire.ts:1004` wraps the module in
   `validatedMerge(name, validate, mergeParams, …)` — but each module's own
   `mergeParams` *already* calls `validatedMerge` internally
   (`climate.ts:372`, and the same in all ten modules). So `validate()` runs
   twice per merge and prints its warnings twice.
2. **The lag bootstrap fixed point.** `prepareAutowiredConfig` iterates
   `initAutowired` to convergence (`maxIterations: 100`, `tolerance: 1e-7`,
   `damping: 0.65`), re-merging and re-validating all ten modules each pass.
   It converges in ~27 iterations.

The fixed point itself is a good design — the comment explaining why it exists
(killing a spurious −5.5% GDP step in the first simulated year) is exactly the
kind of note that earns its keep. The redundant validation inside it is not.

The user-visible symptom: setting `climate.sensitivity = 4.5` prints

```
[climate] Warning: sensitivity 5 above IPCC likely range (2.5-4.0)
```

**58 times**, burying every other diagnostic — including the "unread parameter
override" warning that would have caught finding #3a.

**Recommendation.** Pick one owner for validate-on-construct. Either modules
stop calling `validatedMerge` inside their own `mergeParams` (autowire already
does it), or `validatedMerge` de-duplicates warnings by `(module, message)`.
Additionally, run the bootstrap iterations against already-merged params instead
of re-merging each pass.

### 6a. Latent: `this.validate` is passed unbound in all ten modules

```ts
return validatedMerge('climate', this.validate, (p) => ({ ... }));
```

Safe today — no `validate()` implementation references `this`. The moment one
does, it fails with an opaque `TypeError` inside the framework. The autowire
call site gets this right (`(p) => mod.validate(p)`); the modules do not.

---

## 7. Minerals book extraction the model just said couldn't be supplied

`src/modules/resources.ts:815-831`:

```ts
const supplyRatio = result.demand > 0
  ? Math.min(1, newMiningCapacity / result.demand)   // supply CAN'T meet demand
  : 1.0;
mineralConstraint = Math.min(mineralConstraint, supplyRatio);

const newCumulative = prevCumulative + result.demand; // …but books 100% anyway
```

`supplyRatio` is computed, exported as `mineralConstraint`, and used to constrain
the energy buildout — then `cumulative` adds the *full unconstrained demand* to
the extraction ledger. In 2025 the constraint is 0.983 while 100% of demand is
booked as mined. Nothing bounds `cumulative` by reserves either; `reserveRatio`
is reported but never acted on.

Honest framing: **this does not bind at defaults.** I ran 76 years with
buildout-heavy inputs and reserve ratios stay low (copper 0.17, lithium 0.22,
rare earths 0.01 by 2100). It is an internal inconsistency and a trap for anyone
writing a resource-scarcity scenario, not a live distortion of today's numbers.

**Recommendation.** Book `Math.min(result.demand, newMiningCapacity)` and add a
test asserting `cumulative ≤ reserves` and that `mineralConstraint < 1` implies
booked extraction < demand. (This is June's M7, still open.)

---

## 8. Open-source hygiene gaps

`packages/tsimulation/` is genuinely publish-ready — `LICENSE`, `CHANGELOG.md`,
`CONTRIBUTING.md`, `README.md`, correct `exports`/`files`, npm provenance in
`release.yml`. **The repo root has none of that.**

Missing at root: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
`.github/ISSUE_TEMPLATE/`, PR template, `.nvmrc`, and any linter or formatter
config (no ESLint, no Prettier, no `.editorconfig`).

Positives worth recording: **no secrets, tokens, or credentials anywhere** in
the tree (scanned `*.ts`, `*.json`, `*.md`, `*.yml`); the only email-shaped
string is `user:password@example.com` in a framework test fixture. The
`.gitignore` correctly excludes `.env*`, `baselines/current.json`, and agent
scratch files.

One inconsistency to resolve before publishing: root `LICENSE` is MIT with
`Copyright (c) 2026 Adam Messinger`, and the framework is separately MIT —
but the root `README` does not state the repo's license, and `package.json`
(root) has no `license` field at all. For a monorepo where one package is
published to npm and the rest is not, say so explicitly.

Also worth a deliberate decision: `aging-places/data/*.csv.gz` (~8 MiB of
Census/ACS derivatives) and `data/trade/*.json` (4.9 MiB). US federal data is
public domain so this is fine, but a `data/README.md` stating provenance and
terms for each — `data/trade/README.md` already does this — should cover all of
them.

---

## 9. Running a script dirties the working tree

Running the scripts directory end-to-end left:

```
 M baselines/reference.json                    (finding #2)
 M data/trade/forced-labor-2026-results.json
 M scripts/gamma-damage-sensitivity.md
 M scripts/growth-backcast.md
?? baselines/baseline.json
```

Four tracked files rewritten and one stray file created, purely as a side effect
of *running* analysis scripts. On a public repo this means a contributor
exploring the tree gets a dirty `git status` they didn't ask for, and
`git commit -a` sweeps model outputs into unrelated PRs.

**Recommendation.** Default script output to an ignored directory (`out/`,
already the natural home) and require an explicit `--write` (or `--output=`, the
convention `baseline.ts` already uses) to touch a tracked path.

---

## 10. Performance: the diagnostic module is the most expensive one

Warm `runSimulation()` is **~1.58 s** (76 steps, 10 modules). The 5.6× unit-cache
regression the July architecture review found has been fixed — `resolveUnit` now
memoizes and `assertPortValue` no longer re-validates the port meta at every
leaf. Current CPU profile:

```
 12.9%  (garbage collector)
  4.9%  finalizeAccount             src/modules/generations.ts
  3.7%  assertValueOnly             tsimulation/units.js
  3.2%  step                        src/modules/generations.ts
  1.3%  getOutputsAtYear            tsimulation/autowire.js
  1.1%  get                         tsimulation/liveness.js   ← Proxy
  0.9%  getOwnPropertyDescriptor    tsimulation/liveness.js   ← Proxy
  0.8%  step                        src/modules/energy.ts
  0.6%  buildPopulationSlices       src/modules/generations.ts
  0.6%  allocatePool                src/modules/generations.ts
```

`generations` totals **~10%** of runtime — the single most expensive module —
and CLAUDE.md is explicit that it *"does not feed back into the macro path."* I
verified that: no module declares any `generations` output as an input; the
names appear only in that module, in tests, and in comments. It builds full
balance sheets for 8 regions × ~22 five-year cohorts × 76 years (plus 27 more
during bootstrap) so the run can print a diagnostic table.

Two other unconditional taxes: the `paramLiveness` read-tracking `Proxy`
defaults to `'warn'` in the production path (`simulation-autowired.ts:879`) and
costs ~2%; and the bootstrap loop re-runs `initAutowired` 28×.

`connectorValidation` **is** now exposed through `RunOptions` — good, that was
the architecture review's #1 ask and it unblocks fast ensembles.

**Recommendation.** Make `generations` opt-in (`RunOptions.generationalAccounts`,
default off for programmatic runs, on for the CLI report). That is a ~10% win
for every sweep and ensemble, for a module whose output most callers discard.
Default `paramLiveness` to `'off'` unless the caller asks. Neither changes a
single number — the regression baseline should be byte-identical.

Also still live from the architecture review: importing `src/simulations/registry.ts`
costs **221 ms** and pulls in all 15 sub-models, and every script that wants one
model pays it.

---

## 11. 32 exported framework functions have zero consumers

`tsimulation` exports **149 symbols** from its main barrel. Measured adoption
across all three domains (`src`, `aging-places`, `scripts`):

| module | exports | used |
|---|---|---|
| `data` | 12 | **0** |
| `experiment` | 6 | **0** |
| `study` | 4 | **0** |
| `evidence` | 3 | **0** |
| `liveness` | 3 | **0** |
| `node-data` | 2 | **0** |
| `serialization` | 2 | **0** |
| `ensemble` | 5 | 1 |
| `semantics` | 18 | 5 |
| `units` | 32 | 9 |

For a package presented publicly as a general-purpose engine, this is the first
thing a new reader has to triage, and it is a large fraction of what `index.ts`
offers. The core that earns its keep — `module`, `autowire`, `problem`,
`collectors`, `equation`, `model`, `adapter` — is used at 72–100%.

Credit where due: `node-data.ts` (the one file importing `node:fs`) is correctly
behind the `tsimulation/node` subpath and absent from the main barrel, so the
"dependency-free" README claim holds for the core.

**Recommendation.** Move `study`, `experiment`, `data`, and `evidence` behind
subpath exports before the first npm release. Post-publication these are semver
commitments to code nobody calls.

### 11a. Five framework files have no test at all

`solvers.ts`, `equation.ts`, `serialization.ts`, `shock-ledger.ts`, and
`node-data.ts` are referenced by zero test files. `solvers.ts` is the notable
one: Gauss-Jordan with partial pivoting plus a damped fixed-point iterator, in a
package about to be published for numerical work, with no test asserting it
solves anything. (I read it — the implementation looks correct, including the
singular-pivot guard and the non-finite early return. It just isn't pinned.)

---

## 12. Documentation gaps

- **`src/simulations/` — 19,603 lines, the largest single area of the tree — does
  not appear in CLAUDE.md at all.** Neither does `src/port-schemas.ts` (renamed
  from `connector-schemas.ts` in the ConnectorSpec deletion) or
  `src/historical-backcast.ts`. CLAUDE.md is the onboarding doc the README points
  at; a contributor reading it would not know a third of the codebase exists.
- Three of the architecture review's eight findings remain open by design or by
  deferral, and should be either scheduled or explicitly declared "won't fix" in
  the docs: the `registry.ts` coupling hub (#6), the flat global output
  namespace (#7), and `aging-places` sitting outside the workspace boundary (#8
  — still no `package.json`, still 13 relative imports into `../../src/`).
- `SimulationResult.years` is `number[]` and `SimulationResult.results` is
  `YearResult[]`. The types are honest, but the naming inverts the obvious
  reading and cost me a wrong measurement mid-review. Worth a rename
  (`years` → `yearNumbers`, `results` → `years`) or at least a docstring.

---

## What's genuinely good

Stated plainly, because the list above is one-sided.

**Everything installs, builds, and runs from a clean clone.** I verified the
README quick start against a fresh `git clone` + `npm install` — the workspace
`prepare` hook builds the framework, and both `src/simulation.ts` and
`src/introspection.ts` run with no further steps.

**The test suite is real.** `npm test` → 749 passing assertions, exit 0. `npm run
regression` → 7 scenarios, 16 metrics each, 0 warnings. `tsc --noEmit` clean for
`src` and `aging-places`. CI runs both on every PR, with a Node matrix for the
framework package specifically because it has no float-determinism constraint —
that distinction is well reasoned.

**Parameter robustness is excellent.** I swept all 63 Tier-1 parameters to both
declared bounds — 126 full 76-year simulations — and checked every one of the
134 `YearResult` fields in every year plus every metric:

```
All boundary values clean.
params tested: 63
```

Zero non-finite values, zero throws. For a model this size with this much
compounding, exponentiation, and feedback, that is a genuinely strong result and
it is the direct payoff of the NaN guards and validation layer.

**The accounting identities hold exactly.** Verified live, not by reading code:

```
GDP identity: WC + I + retiree + child + debtService vs GDP
  2025  ratio=1.0000     2075  ratio=1.0000
  2050  ratio=1.0000     2100  ratio=1.0000

Energy split: electricity + nonElectric === totalFinalEnergy   ✓ all years
Land budget:  farmland + urban + forest + desert === 13,000 Mha ✓ all years
```

June's M9 (GDP-identity leak), M3 (land double-count), M4 (demand desync), H3
(sector misallocation), M1 (migration leak), M2 (`GDP_SHARES` = 0.99), H5
(phantom outputs), and H7 (`electricityGeneration` transform) are all fixed, and
the migration rates now carry an explicit "pre-scaled so global net migration
sums to zero" comment. That is a high fix rate on a hard review.

**Runs are deterministic.** Two `capture-baseline` runs on the same Node produced
byte-identical output. The float sensitivity in finding #2 is strictly
cross-version.

**Type hygiene in the framework is exemplary.** `packages/tsimulation/src` has
**zero** `as any` and zero `@ts-ignore`/`@ts-expect-error`. So does
`aging-places/src`. There is not a single suppression comment in the entire tree.

**The framework's own release setup is done properly** — provenance publishing,
`files` allowlist, subpath exports, `sideEffects: false`, engines pin,
CHANGELOG, CONTRIBUTING. Whoever set that up knew what they were doing; the root
repo just needs the same treatment.

**The regression tolerance design** (absolute for physical quantities,
percentage for monetary, rationale documented in-file, manual bless step) is the
right shape — finding #2 is about the bless *step* lacking a guard, not about
the design.

---

## Suggested order of work

**Before making the repo public:**

1. `git filter-repo` the PDFs out of history; replace with citation stubs. (#1)
2. Guard `bless-baseline` behind `--yes` + a Node-version check; add `.nvmrc`. (#2)
3. Add `scripts/` to a tsconfig and fix the 7 errors; delete the 4 dead scripts. (#3, #4)
4. Add root `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue/PR
   templates, a `license` field, and a formatter. (#8)
5. Move the unused framework modules behind subpath exports — after publishing
   they are semver commitments. (#11)

**Soon after:**

6. Fix the zero-capacity absorbing state, with a test. (#5)
7. De-duplicate validation; stop the 58× warning spam. (#6)
8. Make `generations` opt-in; default `paramLiveness` to `'off'`. (#10)
9. Bound mineral extraction by mining capacity, with a conservation test. (#7)
10. Stop scripts writing to tracked paths by default. (#9)
11. Document `src/simulations/` in CLAUDE.md; resolve or explicitly defer the
    three open architecture findings. (#12)

Items 1–5 touch no model behavior; the regression baseline should be
byte-identical through all of them.
