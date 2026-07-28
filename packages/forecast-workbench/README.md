# forecast-workbench

Private Node-oriented forecasting control plane for this repository. It stays
separate from the publishable, dependency-free `tsimulation` engine while
reusing that engine's semantic contracts, snapshots, and run manifests.

It provides:

- point-in-time acquisition and observation-release lineage;
- SHA-256 artifact storage and a hash-chained append-only ledger;
- sealed forecast checkpoints and gated evidence exposure;
- question preflight, reference classes, conditionals, and aggregation;
- explicit model-to-question adapters and discrepancy;
- trigger checks, resolution, proper scoring, and audit bundles; and
- a non-forecast daily-news modeling dossier with one preserved iteration.

Build and test:

```bash
npm run build --workspace forecast-workbench
npm test --workspace forecast-workbench
```

Use the repository operator CLI:

```bash
npm run forecast -- help
npm run forecast -- source-catalog \
  --monitoring-started-at=2026-07-28T00:00:00.000Z
npm run forecast -- replay outbreak \
  --root=/tmp/outbreak-ledger \
  --audit=/tmp/outbreak-audit \
  --synthetic-resolution=1500
npm run forecast -- verify --root=/tmp/outbreak-ledger
```

See the full
[architecture, protocol, connector matrix, and production boundaries](../../docs/FORECAST_WORKBENCH.md).
