# Trade-network data

This directory contains normalized, reproducible outputs for the OEC-style
country-product tariff model.

## Checked-in artifacts

- `forced-labor-2026-network.json`: normalized exporter-by-HS6 graph and legal
  incidence fields.
- `forced-labor-2026-network-audit.json`: graph coverage, treatment totals,
  exemption counts, and preference utilization.
- `forced-labor-2026-results.json`: low, central, and high taxable-scope model
  results.
- `trade-diversion-calibration.json`: 2017-2019 BACI training and holdout
  results for supplier substitution.

## Official raw inputs

- CEPII BACI version 202601:
  `https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html`
- Census monthly imports:
  `https://api.census.gov/data/timeseries/intltrade/imports/hsimport`
- Census detailed HS summaries:
  `https://api.census.gov/data/timeseries/intltrade/imports/hs`
- February 2026 Section 122 Annex II:
  `https://www.whitehouse.gov/wp-content/uploads/2026/02/2026Section122.prc_.ANNEX2_.Final_.pdf`
- July 2026 USTR final action:
  `https://ustr.gov/sites/default/files/files/Press/Releases/2026/FLIP%20301%20Investigation%20Final%20Action%20FRN%207-23-26%20FINAL.pdf`

The default local raw paths are:

```text
/tmp/BACI_HS22_V202601.zip
/tmp/BACI_HS17_V202601.zip
/tmp/section122-annex2.txt
/tmp/forced-labor-301-2026.txt
```

PDF-to-text extraction is intentionally outside the normal simulation path.
The source hashes embedded in the normalized artifacts make silent source
changes detectable.

## Census key and cache

Set `CENSUS_API_KEY` in the environment or in `.env.census.local`:

```text
CENSUS_API_KEY=your-key
```

The local env file is ignored by git. Census responses are cached under
`/tmp/tsimulation-census-trade-cache`; the cache is disposable, while the
normalized graph is the checked-in runtime input.

## Regeneration

```sh
npm run trade:build-network
npm run trade:calibrate-network
npm run trade:network
```

The runtime model never calls Census. Only the explicit graph-refresh command
uses the network.
