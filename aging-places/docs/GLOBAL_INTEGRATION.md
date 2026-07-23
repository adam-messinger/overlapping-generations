# Global-to-city integration

Status: **experimental, opt-in scenario coupling**. The validated historical-persistence surface
is unchanged. This bridge changes the municipal mechanism scenario only, which remains scenario
tooling.

## First implemented slice

`src/global-bridge.ts` runs the corrected global simulation through one look-ahead year and
converts its OECD real PPP GDP-per-capita levels into forward annual growth rates. The OECD is the
closest geography currently exposed by the global model; it is not a US forecast. Each point
labeled year `y` evolves the city state from `y` to `y+1`.

The city market consumes two annual paths:

1. real household-income growth = OECD real GDP-per-capita growth; and
2. national real house-price drift = that growth plus 0.2 percentage points.

The 0.2-point spread preserves the standalone model's existing long-run calibration
(`drift=1.2%`, `realIncomeGrowth=1.0%`) while replacing its fixed macro growth rate. Both paths
are optional. Calling `runAgingSim` without a macro path reproduces the existing standalone
behavior, so backtests, international validation, and current rankings do not silently change.

The bridge now has a strict machine-readable semantic contract. Unchanged global and regional
diagnostics are identity mappings. OECD/selected-region GDP per capita to U.S. municipal household
income, and GDP per capita to house-price drift, are separate versioned crosswalks with their proxy
assumptions and qualitative uncertainty recorded. Equal numeric units no longer make those
translations look like identities.

## Contract already carried for later slices

Every annual macro point also records:

- global interest rate and OECD energy-project WACC;
- energy burden and climate damage fraction;
- aggregate productive-capital coverage;
- total and borrowing-constrained working shares; and
- OECD fossil share.

These fields are audited but not consumed yet. Carrying them in the boundary now prevents later
work from reaching directly into the global simulation internals or inventing incompatible annual
timing.

## Current baseline read and integration warning

Run:

```bash
npm run aging:global-city
```

After the July 21 regional-allocator correction, global GDP rises from $158T in 2025 to $553T in
2065 (3.18% annualized). OECD real GDP per capita grows **2.39% annualized**. The OECD share of
global GDP now falls from 39.2% to 32.6%; before the correction it rose to 67.9% because a lower
fossil share was incorrectly treated as a recurring productivity advantage. On the full municipal
universe, the first coupling slice now changes the endpoint:

| 2065 real index | Standalone city macro | Globally coupled |
|---|---:|---:|
| Mean house price | 1.097 | 1.910 |
| Median house price | 1.199 | 2.086 |
| Household income | 1.489 | 2.569 |

The correction removes the specific OECD-share artifact, but these absolute coupled levels remain
**non-decision-grade city scenarios**. OECD is still not the United States, and the allocator fix
reveals a second global coupling sensitivity: restoring GDP to more energy-intensive emerging
regions raises energy demand, which the Ayres-Warr production loop amplifies. Baseline 2100 GDP
rises from $1.13Q before the correction to $2.01Q after it, outside the previously reported
$0.8--1.4Q sensitivity band. The regional allocation is more coherent; the aggregate growth loop
now needs to be re-calibrated against that allocation.

The macro impulse remains common to nearly every municipality, so relative ordering should move
less than absolute price levels. The earlier exact rank-retention audit was run against the broken
allocator and must be regenerated before quoting post-correction percentages.

Extending the same provisional bridge to 2100 makes the problem clearer: the coupled household
income index reaches 8.62 and the mean real house-price index 4.69, versus 2.11 and 1.12 in the
standalone city scenario. This is lower than the pre-correction coupled path (10.40 income and
5.68 mean price in the current-code before snapshot), but still an integration diagnostic rather
than a forecast.

## Next coupling decisions

1. **National income anchor:** replace the OECD proxy with a US/North America region or an
   externally calibrated US real-income scenario. Do not hide global growth-loop uncertainty
   inside a national growth scalar.
2. **Housing finance:** translate OECD WACC and aggregate capital coverage into mortgage
   capitalization and construction-finance constraints. This needs an explicit empirical
   calibration; applying the global coverage ratio directly to housing supply would be false
   precision.
3. **Who is constrained:** use the generational constrained-working shares to modify access to
   down payments and launch capital, while keeping the aggregate and household borrowing gaps
   distinct.
4. **Local energy and climate exposure:** combine national burden/damage paths with local
   electricity mix, heat, insurance, and adaptation exposure rather than applying one national
   scalar to every city.
5. **US geography:** add a US or North America region to the global model. Until then every
   coupled result must retain the OECD-proxy label.

The bridge is deliberately one-way. City outcomes do not feed back into global GDP, capital, or
energy demand.
