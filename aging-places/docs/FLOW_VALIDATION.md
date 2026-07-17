# Flow-level validation (step 3): the mechanism is not a flow forecaster

## Plan

The mechanism's stated causal story runs through migration, but every prior test scored prices or
population change. This test faces realized IRS SOI county-to-county flows directly:
outcome = county net migration rate 2015-2020 (five filing years, exemptions ≈ persons);
predictor = county-aggregated year-2000 working-age attraction (deliberately 15-year-stale, no
lookahead); kill comparator = lagged 2005-2010 net rate from the same source. Metrics: national
Spearman; equal-zone within-commuting-zone Spearman with a 4,000-draw zone bootstrap.
Review notes fixed in advance: IRS undercounts non-filers; flows are all-ages; county aggregation
uses modeled incorporated places only; a pass would NOT upgrade the label — the test isolates
*where* the mechanism's information lives.

## Results (n = 2,883 counties; 255 zones with ≥5 counties)

| Comparison | Spearman |
|---|---:|
| Attraction (2000) vs net rate 2015-2020, national | 0.13 |
| Attraction (2000) vs net rate 2005-2010, national | 0.29 |
| Lagged flows (2005-10) vs net rate 2015-2020, national | **0.64** |
| Attraction, equal-zone within-CZ mean | **−0.13** |
| Lagged flows, equal-zone within-CZ mean | **0.53** |
| Attraction − lagged flows (within-CZ) | −0.66 (CI −0.73..−0.58) |

## Interpretation

**The attraction score fails as a flow forecaster, decisively.** Within commuting zones its sign
even inverts: high-attraction places are dense, expensive cores (Berkeley, Evanston) that lose
net domestic migrants to their own suburbs while their prices outperform — the classic
metro gradient. Flow persistence is overwhelmingly the best flow predictor.

Read together with the earlier results, the information geography is now clean:

- **within-zone price outcomes**: mechanism beats lagged population (+0.156, CI > 0) — its one
  validated surface;
- **within-zone flows**: mechanism fails badly (this test);
- **Japan household allocation**: strong absolutely, adds nothing over persistence (holdout).

So the migration submodel should be treated as a modeling device whose *price* implications
survived testing, not as a literal flow forecast; the step-2 `flowContradiction` flag (1,898
places) is the per-place expression of exactly this divergence. Product docs now say so.

Caveats: all-ages IRS exemptions; incorporated-place county coverage varies; county units are
coarser than places; no age-split flows were used (ACS county-to-county age detail is a possible
sharper follow-up).
