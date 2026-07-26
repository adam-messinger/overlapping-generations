# Country-product tariff network

The tariff experiment now uses an OEC-style trade map: each directed edge is
an exporter, an HS6 product, and U.S. annual import value. CEPII BACI supplies
the bilateral world network, Census supplies current U.S. HTS10 values and
customs-entry classifications, and the legal schedules determine which value
is actually taxable. Product shocks then feed the existing nine-sector U.S.
input-output price network.

This replaces the bilateral model's assumption that each affected sector is a
single import pool. The bilateral model remains useful for deliberately simple
headline scenarios; `trade-network-tariff` is the richer model for actions
whose country and product schedules are known.

## Data graph

The normalized July 2026 snapshot contains:

- 53,079 exporter-product edges.
- 189 exporters and 5,551 HS6 products.
- $3.236 trillion of annualized imports.
- 99.445% of the BACI U.S. import value after retaining every edge worth at
  least $1 million and at least the three largest suppliers of each product.
- Current product totals from Census January-May 2026, with exporter shares
  and alternative non-U.S. supply from BACI 2024.

The graph is in
[`data/trade/forced-labor-2026-network.json`](../data/trade/forced-labor-2026-network.json).
It is normalized with country, product, and treatment dictionaries so that the
checked-in artifact is about 5 MB rather than a repeated object for every edge.

## Legal incidence

The scenario compares the expiring worldwide 10% Section 122 surcharge with
the July 2026 forced-labor Section 301 action.

For each edge the snapshot stores separate old and new taxable shares. This is
important: unchanged nominal rates do not imply an unchanged price when the
exemption boundary changes.

The crosswalk uses:

1. Old and new HTS8 exemption schedules, valued from the observed HTS10
   composition within each HS6 product.
2. Observed HS6-country preference claims from Census country subcodes:
   `S`/`S+` for USMCA and `P` for CAFTA-DR.
3. January 2026 Chapter 99 entry shares to estimate common Section 232 and
   other pre-existing-measure exclusions within the metal, vehicle, selected
   wood, and semiconductor categories named by the legal schedules.
4. Ordinary MFN duties from 2024 Census calculated duties. For the EU, Taiwan,
   Japan, South Korea, and Switzerland, the new additional rate is the amount
   needed to reach the legal all-in cap rather than the headline rate.

The resulting central taxable shares are 31.31% under Section 122 and 30.49%
under the new Section 301 action. Scope uncertainty is retained on every edge;
the aggregate old range is 26.85%-36.76% and the new range is 25.55%-36.41%.

## Propagation

Within each HS6 product, suppliers compete through a CES/Armington allocation.
The tariff changes delivered prices, import demand responds, and imports move
toward suppliers with lower effective duties. Supplier growth is capped by:

- 5% organic short-run expansion of existing U.S. shipments; plus
- 10% of observed exports to non-U.S. destinations that can be redirected.

The product-level price indexes are aggregated into the existing U.S.
input-output network. This preserves the distinction between a cheap imported
consumer good and an input whose price propagates through construction,
transport, or services.

## Calibration and holdout

The supplier-substitution elasticity is calibrated against the 2018-2019
U.S.-China tariff episode using BACI:

- In the training proxy (HS 84-85), China's U.S. supplier share fell from
  35.54% in 2017 to 29.61% in 2019. With 80% pass-through of a 25% tariff, the
  implied elasticity is 1.485.
- In a held-out List 3 proxy (HS 39, 63, 94, and 95), the selected elasticity
  predicts 45.30% versus an observed 47.43%. That reduces absolute error by
  31.7% relative to assuming no diversion, but overstates the speed of
  substitution.

The model therefore uses 1.5 centrally and 1-2 as the recommended sensitivity
range. The backtest does not identify the capacity parameter.

As a coarse level check, the Census calculated-duty rate rose from 2.36% in
2024 to 7.68% in January-May 2026. The network attributes 3.13 percentage
points to the Section 122 surcharge; the remaining increase is directionally
consistent with other post-2024 trade actions. This is a sanity check, not a
clean causal decomposition.

## July 2026 result

The central result is aggregate-neutral but distributionally active:

- Effective additional tariff: 3.131% old versus 3.139% new, a rise of only
  0.0076 percentage points.
- All-import delivered price index: +0.0007%.
- U.S. consumer-price level after input-output propagation: +0.0034%.
- Scope range for the consumer-price effect: -0.0072% to +0.0134%.
- Same-product supplier reallocation: $11.17 billion.
- Unfilled imports due to supplier capacity: about $3 million.
- Tariff revenue change after diversion: -$0.78 billion annualized.
- Weighted supplier HHI: 0.3000 to 0.2991.

The central exporter changes are not a generic reshoring result. China loses
$5.87 billion and Vietnam loses $1.49 billion of annualized U.S. sales, while
Germany gains $2.30 billion, Italy $1.61 billion, and the Taiwan proxy $1.19
billion. Apparel, wood/consumer goods, and materials get dearer; food and
machinery get modestly cheaper. This composition is why the import index can
remain nearly flat while the consumer-price index rises slightly.

The machine-readable result is
[`data/trade/forced-labor-2026-results.json`](../data/trade/forced-labor-2026-results.json).

## Commands

```sh
npm run trade:build-network
npm run trade:calibrate-network
npm run trade:network
```

The builder reads `CENSUS_API_KEY` from the environment or the ignored
`.env.census.local` file. Its default raw inputs are the CEPII BACI HS22 and
HS17 archives and text extracted from the two official tariff PDFs under
`/tmp`; see [`data/trade/README.md`](../data/trade/README.md).

## Important limits

- The scenario is a first-year comparative static, not a multiyear trade,
  exchange-rate, or general-equilibrium forecast.
- Current country shares are BACI 2024 shares scaled to 2026 Census product
  totals. Transshipment and firm-level sourcing are not explicit.
- HTS10 exemption valuation uses world composition within HS6 because a full
  country-HTS10 extract is not yet stored.
- Pre-existing Chapter 99 exclusions are inferred from observed entry shares
  inside legally named product families; they are not a line-by-line Section
  232 entry audit.
- The model does not include retaliation, customs avoidance, endogenous
  investment, or long-run supplier entry.
- BACI's “Other Asia, nes” is used as a Taiwan proxy, as documented by CEPII.
