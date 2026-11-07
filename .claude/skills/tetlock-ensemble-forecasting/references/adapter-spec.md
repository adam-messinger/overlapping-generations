# Writing an adapter spec for a new panel

`scripts/tetlock-sim-adapter.ts --spec=<file>` serves any question set. The spec is
the **model-to-question adapter** A2 must publish: it says, per question, whether the
simulation can answer it and exactly how a model field becomes the question's quantity.
Write it in Step 1, after the questions are locked and before any panelist runs.

Keep the spec beside the panel's other records, e.g.
`docs/forecasts/<panel>/adapter-spec.json`, so the run is reproducible later.

## Shape

```json
{
  "title": "Four megatrends 2026-2045",
  "scenarios": ["baseline", "net-zero", "ai-energy-boom"],
  "variants": {
    "fragmented": { "energy": { "financingSpreadScale": 2.0 }, "demographics": { "migrationMultiplier": 0.4 } }
  },
  "disclosures": ["Panel-specific caveat the model-wide list does not cover"],
  "questions": [
    { "id": "q4", "status": "identified", "label": "China/US GDP ratio",
      "note": "PPP ratio, deflator-invariant; the question is nominal USD, so this is context for the real leg only",
      "readings": [
        { "label": "China/US PPP GDP 2035", "field": "regionalGdp", "regions": ["china"],
          "denominator": ["us"], "transform": "ratio", "year": 2035 }
      ] },
    { "id": "q2", "status": "directional", "label": "US 10y TIPS",
      "readings": [
        { "label": "real lending rate change 2025-35, pp", "field": "interestRate",
          "transform": "delta", "from": 2025, "to": 2035, "scale": 100 }
      ] },
    { "id": "q1", "status": "refused", "reason": "no trade block: no exports, imports or tariffs" }
  ]
}
```

## Status is a claim, not a label

| Status | Means | Panelist may |
|---|---|---|
| `identified` | The translation is exact (a growth rate or ratio, the same scope) | Quote the number, conditional on the run |
| `directional` | A related model quantity with a different scope or definition | Use the *sign and rough size of a change*; never a point estimate |
| `refused` | The model cannot represent the question | Nothing. The adapter emits no number |

When in doubt, choose the weaker status. A level read off a PPP-2017 model is not a
nominal-USD level; an economy-wide lending rate is not a 10-year market yield.

## Readings

| Field | Notes |
|---|---|
| `field` | Any numeric output of a `diagnostics: false` run (`describeOutputs()` lists them). Per-region records (`regionalGdp`, `regionalPopulation`, `regionalWACC`, ...) take `regions` |
| `regionAgg` | `sum` (default) or `mean`; use `mean` for rates such as `regionalWACC` |
| `transform` | `level` (`year`), `mean` (`from`..`to`), `delta` (`to` - `from`), `cagr` (% per year), `ratio` (`regions` over `denominator` regions or `denominatorField`, at `year`), `share` (`regions` over all regions, at `year`) |
| `scale` | Multiplier, e.g. `100` to express a fraction in percent |

An unknown field, region or transform is an **error**, never a silent zero or a
silent refusal.

## Model-wide disclosures

Appended to every spec's payload automatically, so no panel can forget them: PPP
2017 base, UN-WPP-low demography, the rate is a real lending rate (use changes),
no trade block, no price level, fixed labour share, exogenous world-aggregate fiscal
path. Add panel-specific caveats in `disclosures`.
