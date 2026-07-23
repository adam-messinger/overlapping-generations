# Semantic measurement contracts

Status: implemented first slice, 2026-07-23

## Why this layer exists

Dimensional analysis catches errors such as connecting power to energy or
dollars to people. It cannot catch values that share a unit but answer
different questions:

- total data-center load versus incremental load;
- full-site electricity versus IT-only electricity;
- oil cargo volume through Hormuz versus vessel counts;
- a revised/backfilled hospital-admission series versus its fixed first release;
- OECD GDP per capita versus U.S. municipal household income.

`tsimulation` now treats these as contract errors, not documentation issues.

## Prior art and the design choices taken from it

The implementation combines several established patterns rather than copying
one framework wholesale:

- The [CF Conventions](https://cfconventions.org/cf-conventions/cf-conventions.html)
  keep units separate from standard names, coordinates, and temporal cell
  methods. `EstimandContract` similarly separates scale from quantity meaning,
  geography, population, and aggregation support.
- [OpenMDAO](https://openmdao.org/newdocs/versions/latest/features/core_features/working_with_components/units.html)
  validates units at component connections and requires explicit conversions.
  `tsimulation` applies the same fail-fast connection pattern to units,
  estimands, and declared measurement regimes.
- The [Functional Mock-up Interface](https://fmi-standard.org/) makes model
  variables and model boundaries inspectable and versioned. The implementation
  keeps semantic declarations on ports, connectors, models, transforms, and
  adapters rather than burying them in a separate prose catalog.
- [W3C PROV](https://www.w3.org/TR/prov-overview/) distinguishes entities from
  activities. `DataArtifact` is content identity, `DataSnapshot` is a retrieval
  entity/vintage, and `DataTransformation` records the activity that produced a
  derived artifact.
- Statistical estimand practice separates the target real-world quantity from
  the estimator and observation process. For that reason, the stable
  `EstimandContract` does not contain dataset releases; `MeasurementBinding`
  owns source fields, procedures, coverage, revisions, backfills, and vintages.
- Uncertainty-quantification practice separates aleatory variability from
  epistemic uncertainty. `ExperimentContract` preserves that distinction and
  refuses to flatten mixed uncertainty into one probability distribution.

This avoids two tempting but harmful designs: putting a data-release timestamp
inside the definition of the real-world quantity, and calling every sampled
parameter range a probability distribution.

## Contract layers

| Layer | Question answered | Stable identity |
|---|---|---|
| Unit | How is the number scaled? | Unit expression |
| Estimand | What real-world quantity is it? | Meaning hash plus versioned contract |
| Measurement | How did this dataset observe it? | Measurement-regime hash |
| Artifact | What exact bytes were retrieved? | SHA-256 content digest |
| Snapshot | Which request and vintage produced those bytes? | SHA-256 snapshot identity |
| Transformation | How was a derived artifact produced? | Versioned transform plus input snapshots |
| Experiment | What kind of conclusion does sampling support? | Versioned intent/variable contract |

Estimand compatibility compares quantity kind, measure kind, population,
inclusion/exclusion, geography/boundary, numerator/denominator, temporal
support, valuation, and sign convention. IDs and prose descriptions do not make
otherwise identical quantities incompatible.

Measurement-regime compatibility compares the estimand, dataset and field,
procedure, revision/release policy, coverage, and transformation history. It
deliberately ignores the particular phenomenon, publication, retrieval, and
snapshot times: those distinguish vintages under one regime.

## Crosswalk rules

Connections with incompatible estimands fail unless a matching
`SemanticCrosswalk` is supplied. Connections with incompatible declared
observation procedures fail unless a matching `MeasurementCrosswalk` is
supplied. Crosswalks carry:

- source and target contracts;
- a versioned method;
- assumptions and evidence IDs;
- explicit uncertainty.

Transforms that create a new estimand also declare a `SemanticDerivation`.
Model runs and adapters return the IDs and versions of all derivations and
crosswalks used. Run manifests preserve that semantic lineage and hash complete
input/output contracts.

## Data and revision provenance

Resolvers produce a canonical, safe-to-persist request and the exact raw
response. `captureDataSnapshot()` stores:

- SHA-256 of exact bytes and a separate normalized-value digest;
- resolver and source versions;
- request URI/query/public headers;
- named credential reference, never the secret;
- retrieval, as-of, publication, and source-version times;
- response ETag/last-modified metadata;
- coverage and measurement binding.

The same bytes retrieved at different times have one artifact ID and different
snapshot IDs. Evidence and calibration observations may reference snapshots;
manifests validate that every reference exists. A calibration split hash now
includes measurement definitions and snapshot content identities.

## Experiment semantics

Experiment variables are classified as constants, state, decision levers,
aleatory variables, epistemic variables, or structural choices. Domains are
cases, sets, possibility intervals, objective/empirical distributions, or
explicit subjective distributions. Dependence must be declared when multiple
probabilistic variables are present.

The output vocabulary follows the declared intent:

- scenarios and stress tests: unweighted cases;
- sensitivity/design studies: design-sample percentiles;
- aleatory uncertainty: probability quantiles;
- epistemic uncertainty: possibility bounds;
- mixed uncertainty: an outer family of epistemic cases, each with an inner
  aleatory distribution.

## First strict migrations

| Boundary | Previously implicit mismatch | New contract behavior |
|---|---|---|
| Data-center grid model | BNEF's 194 GW total scenario was discussed beside a 159 GW incremental model input | Total and incremental estimands differ; the subtraction of the illustrative 35 GW base is a registered derivation. Full-site load, cost allocation, valuation, capacity, energy, and emissions fields are strict. |
| Hormuz model/bridge | Traffic, vessel counts, gross transit loss, net supply loss, and non-electric availability could all be called “throughput” or “availability” | The scenario path is explicitly physical commodity cargo-throughput capacity, not vessel count. Oil and gas availability remain separate at the global boundary; each contribution to composite non-electric energy uses a versioned crosswalk. |
| Outbreak forecast | Operational revised CDC admissions and fixed-initial resolution admissions had equal units and the same underlying admissions estimand | Both observation procedures are explicit and fail regime compatibility. The 13-week 0.9440 overlap correction is a registered measurement crosswalk. |
| Global to city | OECD GDP-per-capita growth was silently treated as U.S. city income and house-price growth | Unchanged global diagnostics are identity mappings. Municipal income and house prices require separate uncertain proxy crosswalks, including the fixed house-price premium assumption. |

Those models/adapters run with required semantic validation. Unmigrated models
remain in `if-present` mode: any semantic declarations they do have are checked,
but missing declarations are reported by audits rather than breaking the whole
repository. This makes migration incremental without creating a decorative
schema that is never enforced.

## Remaining migration work

The core framework work is complete; semantic coverage of every existing model
is not. The next bounded migrations should follow actual integration and
forecasting risk:

1. global model collectors and the highest-leverage inter-module transforms;
2. city housing-stock utilization and household/cohort definitions;
3. critical-material node/product boundaries beyond Hormuz;
4. calibration datasets with archived raw snapshots rather than only committed
   normalized fixtures;
5. forecast resolution objects and an update ledger, which are intentionally
   outside this simulation-richness pass.
