# Point-in-time evidence and forecasting workbench

The repository now has a working local control plane for point-in-time
evidence, resolvable forecasts, model runs, updates, monitoring records,
resolution, and scoring. It lives in
[`packages/forecast-workbench`](../packages/forecast-workbench/) and reuses
`tsimulation` run manifests and semantic contracts.

This is an operational library and CLI, not a hosted multi-user product. Its
core invariants are enforced and tested; the remaining production boundaries
are listed explicitly below.

## What is implemented

The workbench:

- stores raw responses, schemas, sanitized requests, evidence views, records,
  and model manifests in a SHA-256 content-addressed store;
- maintains a canonical append-only JSONL event chain and a rebuildable SQLite
  projection;
- serializes independent local writers with an atomic single-host append lock;
- records retrieval time, requested as-of time, source-effective vintage,
  publication time basis, source version, schema, and raw artifact digest;
- versions normalized observations as new, unchanged, revised, backfilled, or
  withdrawn;
- freezes question, resolver, revision, fallback, cancellation, and outcome
  contracts before forecasting;
- requires a preflight before the first forecast;
- blocks evidence reveal until the forecast checkpoint is sealed and requires
  the next update to cite that exposure;
- links forecasts to information sets, model forecasts, reference classes,
  conditional sets, update bases, rationale, and strongest contrary case;
- keeps a model run separate from the model-to-question adapter and refuses an
  identified probability when the translation is not identified;
- stores blinded forecast inputs and aggregation records;
- records triggers and monitor checks, including neutral versus
  magnitude-bearing notification policy;
- records pending, provisional, final, amended, disputed, and cancelled
  resolutions against the frozen resolver;
- calculates Brier, logarithmic, ranked-probability, CRPS, and time-weighted
  scores where applicable;
- exports auditable bundles with restricted raw artifacts omitted by default;
  and
- signs chain-head receipts with Ed25519 for external anchoring.

The core evidence path is:

```text
sanitized request + credential references
                  |
                  v
        hardened acquisition
                  |
       +----------+-----------+
       |                      |
       v                      v
 immutable raw bytes   acquisition receipt
       |                      |
       +----------+-----------+
                  v
       source release + versioned rows
                  |
                  v
            evidence packet
                  |
       seal forecast -> reveal -> update
                  |
                  v
       resolver snapshot -> resolution -> score
```

Credentials are resolved only for the wire request. Their values are excluded
from persisted requests and metadata, stripped on cross-origin redirects, and
scanned out of response bodies before persistence. File ingestion confines
real paths to declared roots and can require an expected SHA-256 digest.

## Operator CLI

Build once, then use the root `forecast` command:

```bash
npm run build:framework
npm run build:forecast-workbench

npm run forecast -- help
npm run forecast -- source-catalog \
  --monitoring-started-at=2026-07-28T00:00:00.000Z

npm run forecast -- replay outbreak \
  --root=/tmp/outbreak-ledger \
  --audit=/tmp/outbreak-audit \
  --synthetic-resolution=1500

# One-shot live updates; no scheduler or background process is installed.
npm run forecast -- refresh outbreak
npm run forecast -- refresh data-center
npm run forecast -- refresh hormuz
npm run forecast -- refresh all

npm run forecast -- verify --root=/tmp/outbreak-ledger
npm run forecast -- list --root=/tmp/outbreak-ledger --type=forecast
npm run forecast -- show --root=/tmp/outbreak-ledger --id=sha256:...
npm run forecast -- monitor-status --root=/tmp/outbreak-ledger
npm run forecast -- export \
  --root=/tmp/outbreak-ledger \
  --destination=/tmp/outbreak-audit-2
```

Replay destinations are append-only histories. Use a new ledger directory for
each replay rather than rerunning a historical import into an existing one.

### One-shot pilot refreshes

`refresh` is deliberately operator-invoked. It does not install a daemon,
cron job, webhook, or notification service. With the default roots, the first
call seeds the frozen 23 July historical replay and then appends a live
checkpoint. Later calls append another acquisition/evidence/model/forecast
chain without changing an earlier forecast.

The command reads credential values from the process environment and, when
present, `.env.forecast.local`. A different ignored local file can be selected
with `--env-file=/path/to/file`. Values are resolved only onto the wire; CLI
output and persisted sanitized requests contain credential references, not
secrets.

The current pilot refresh contracts are:

| Pilot | Live inputs | Update behavior |
|---|---|---|
| Outbreak | CDC operational `mpgq-jmmr` and fixed-initial `vdzy-6i9v` USA rows | Rebuild the measurement crosswalk, rerun the adaptive residual model at the remaining 1–4 week horizon, expose the result, then seal a human update |
| Data center | EIA AEO 2026 API paths and the Census private-construction seasonally adjusted history workbook | Preserve both low and high structural evidence, run an explicitly weighted model-family mixture, then seal a human update |
| Hormuz | Straits.live's PortWatch mirror and carrier rollup plus the Polymarket Gamma market | Stop for manual review if a physical trigger has fired; otherwise partially transfer the easier comparator's log-odds move and seal an evidence update |

The source parsers validate the forecast-specific fields, units, worksheet
coordinates, market outcome labels, and target non-equivalence. Material
schema changes or precommitted physical triggers stop the command instead of
silently producing a new probability.

The first completed live run is reported in
[the 28 July refresh note](forecasting-pilot/REFRESH_2026-07-28.md).

To sign and verify the current chain head:

```bash
npm run forecast -- sign-receipt \
  --root=/tmp/outbreak-ledger \
  --private-key=/secure/forecast-ed25519-private.pem \
  --public-key-id=forecast-key-2026-01 \
  --issuer=research-operations \
  --output=/tmp/outbreak-ledger-receipt.json

npm run forecast -- verify-receipt \
  --receipt=/tmp/outbreak-ledger-receipt.json \
  --public-key=/secure/forecast-ed25519-public.pem
```

Private keys are read but never written to the ledger or printed by the CLI.
Key generation, custody, rotation, and external receipt publication remain
operator responsibilities.

## Public-data connectors and vintage guarantees

The catalog deliberately describes what each source can actually guarantee.
It does not label today's revised history as a historical vintage.

| Source | Workbench capability | Authentication/configuration |
|---|---|---|
| BEA Data API | Current-only; captures establish future cutoffs | BEA user ID credential reference |
| EIA API v2 | Current-only; captures establish future cutoffs | EIA API key |
| Census Data API | Release-pinned by dataset year/vintage plus raw capture | Census API key |
| SEC EDGAR submissions | Release-pinned by accession/accepted time plus raw capture | Real SEC-compliant user agent |
| FRED/ALFRED | True historical real-time period | FRED API key |
| Eurostat | Current-only; Eurostat exposes the latest dissemination version | None |
| OECD Data Explorer | Current-only; captures establish future cutoffs | None |
| World Bank Indicators | Current-only; captures establish future cutoffs | None |
| CDC Socrata | Current-only; captures preserve later backfills | Optional app token |
| NOAA NCEI CDO v2 | Current-only; captures establish future cutoffs | NOAA token |
| LBNL Queued Up | Release-pinned named workbook/report | None |

The three pilot refreshes also use narrow question-specific connectors for the
Census Value of Construction Put in Place workbook, Straits.live, and
Polymarket Gamma. These are not presented as universal catalog connectors:
their parsers and normalized rows are intentionally tied to the forecast
measurement contracts.

Credential smoke tests on 28 July also confirmed the distinction between
current and real-time-vintage data. An ALFRED `GDPC1` query for 2025 Q4 as
known on 20 February 2026 returned `24,111.830`, while the current FRED history
returned `24,055.749`. The EIA key was then used for the sealed data-center
refresh. The Census construction workbook itself is public and unauthenticated;
the Census key remains available for Census Data API datasets.

For a current-only source, an as-of request before `monitoringStartedAt` is
rejected. A caller supplies source-specific normalization to
`captureHttpSource`; the workbench then creates the release and row-version
lineage. This keeps transport/schema handling reusable without inventing one
universal observation model.

The implementations are based on the official
[BEA API guide](https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf),
[EIA API documentation](https://www.eia.gov/opendata/documentation.php),
[Census API guide](https://www.census.gov/data/developers/guidance/api-user-guide.html),
[SEC EDGAR API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces),
[FRED real-time-period documentation](https://fred.stlouisfed.org/docs/api/fred/realtime_period.html),
[Eurostat API introduction](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-introduction),
[OECD API guide](https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html),
[World Bank API documentation](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392),
[NOAA CDO documentation](https://www.ncdc.noaa.gov/cdo-web/webservices/v2),
and [LBNL Queued Up](https://emp.lbl.gov/queues).

## Migrated pilots

Four workflows exercise different parts of the protocol.

| Workflow | What the replay demonstrates |
|---|---|
| Outbreak 2026 | Preflight, sealed prior, evidence exposure, identified model adapter, final forecast, synthetic resolution, proper scoring, and audit export |
| U.S. data-center share in 2035 | Frozen ordered question, outside view, seeded epistemic mixture, conditionals, triggers, human/model separation, and pending resolution |
| Hormuz traffic in December 2026 | Six forecast checkpoints, strict and broad reference classes, two physical scenarios, explicit non-identification of the event probability, conditionals, triggers, and pending resolution |
| News screen, 28 July 2026 | Seven screened stories, three selected, separate immutable V1 and V2 manifests, and explicit agree/qualify/disagree comparison with conventional wisdom |

The daily-news records are intentionally not forecast records. Spain is an
accounting reconciliation, Nvidia is a conditional mechanism stress, and
Germany is an unidentified sensitivity envelope. Their source pointers were
preserved by the historical analysis, but raw articles and original retrieval
times were not; the replay records that gap rather than manufacturing
point-in-time provenance.

## Storage and audit model

Every logical record is canonical JSON addressed by its content hash. Each
event commits the record hash, actor, type, time, prior event hash, and its own
hash. `events.jsonl` plus the artifact tree are canonical; `index.sqlite` is a
query projection and can be deleted and reconstructed from them.

An audit export copies the event chain, manifest, manifest digest, records,
information sets, evidence views, sanitized requests, run manifests, and raw
acquisitions allowed by policy. Restricted raw acquisitions remain in the
source ledger but are omitted from an ordinary export and marked as excluded.
`--include-restricted` is an explicit operator action, not a license override.
The destination must be empty, which prevents an older restricted export from
silently leaving disallowed files behind in a later public bundle.

The ledger directory therefore needs filesystem access controls and backups.
Content addressing and hash chaining detect changes; they do not encrypt data,
prevent an administrator from deleting the whole directory, or replace
contractual source restrictions.

## Production boundaries

The following are explicit limits, not silently missing features:

- This is a Node library and local CLI. It has no hosted UI, user
  authentication, organization RBAC, or approval workflow.
- The append lock coordinates processes on one host. A shared network
  filesystem or horizontally scaled service needs one transactional writer or
  a database-backed lock.
- Trigger definitions and checks are ledger-native, but no always-on scheduler
  or notification delivery service ships here. An external runner must execute
  connectors, evaluate triggers, and record checks.
- HTTP defenses validate scheme, allowlisted host, resolved public addresses,
  redirects, timeouts, and response size. A production deployment should still
  add a controlled egress proxy to eliminate DNS-rebinding and platform-network
  ambiguity.
- Ed25519 receipts are optional. Strong non-repudiation needs managed keys and
  regular publication to an external timestamp or transparency service.
- Connectors do not bypass paywalls or licenses. Subscription documents should
  use `acquireFile` or a vendor-specific connector with `restricted`
  classification, license, and access policy.
- Forecast aggregation for continuous distributions requires a caller-supplied
  common grid; the package refuses to improvise one.
- The Hormuz pilot has a read-only Polymarket Gamma observation connector.
  General market discovery, authenticated positions, trading, forecaster
  assignment, and paid-data purchasing are not connected. Credentials,
  commercial rights, and any state-changing market action need a separate
  authorized integration.

These boundaries make the current system suitable for reproducible local
research and pilot operations. Moving it into shared production is primarily
an identity, scheduling, key-management, egress, and durable-service project;
the forecast/evidence data model does not need to be redesigned.

## Verification

Run:

```bash
npm run test:forecast-workbench
npx tsc --noEmit
```

The workbench tests cover evidence gates, close-time enforcement, information
sets, adapters, reference classes, conditionals, aggregation, monitoring,
resolution, score series, content canonicalization, acquisition size and
network controls, credential non-persistence, vintage behavior, concurrent
writers, projection rebuilding, audit restrictions, and Ed25519 receipts.
