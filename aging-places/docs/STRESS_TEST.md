# Stress Test & Iteration Log

The brief demands: find the obvious false positives/negatives, decide whether they reveal model
flaws, iterate until institutional cities, medical hubs, university towns, and prestige
destinations are treated appropriately. Three iterations were run.

## Iteration 1 findings (initial 50/50 blend, loose tags)

1. **The Boston test failed at first.** Pure fitted-model ranking put Ann Arbor at #3223/4184,
   Rochester MN (Mayo) at #3000, Chapel Hill similar — because the fitted construct is
   *percentage price growth 2000-2025*, which favored cheap-base, gateway, metro-edge places
   and (conditional on scarcity controls) penalized educated, already-expensive towns.
   **Diagnosis: construct mismatch, not evidence against institutions.** Fixes: (a) linear
   model refit on state-demeaned outcomes (within-region divergence, the construct the theory
   addresses); (b) blend re-weighted to 0.7 mechanism / 0.3 fitted; (c) ±3σ winsorization so
   one model's tail can't dominate (the Durham NH case).
2. **"Knowledge Center" tag over-fired** (Gary, Flint, East Cleveland, Sunny Isles Beach) —
   any place within 15km of metro universities qualified. Fixed to resident-student semantics:
   college share > 15%, or campus enrollment > 50% of local population with college share > 8%.
3. **Wrong-state lookups** in the sanity harness (Boston, GA ≠ Boston, MA). Fixed.

## Iteration 2 findings

4. **Rochester MN still mid-table.** Root cause: the theory's hinterland-consolidation
   mechanism (Fukuoka/Sapporo pattern) was missing — institutions in low-access regions were
   only penalized for remoteness, never credited for regional monopoly. Added the **hub term**:
   attraction += 0.10 × max(0, engines) × max(0, regional dominance), where dominance = own
   population ÷ 120-minute population. Hindcast metrics unchanged (the mechanism is forward-
   aging, not 2000s-era), so the term is admissible.
5. **Undervalued list contaminated by "merely cheap"** places with near-zero outlook. Fixed:
   undervalued requires outlook ≥ +0.5.

## Iteration 3 findings — the Covelo case (tiny-town test)

6. **Covelo, CA (pop 1,495, Round Valley) ranked top-2% nationally** — a remote, poor
   reservation-area town scored like a prestige amenity market. Root causes, each fixed
   system-wide:
   - **Poverty-unaffordability read as prestige-scarcity.** Covelo's value/income is 9.0
     (national median 2.8) — but at $35.7k income, versus Nantucket's 12.4 at $110k. Fix: all
     scarcity/prestige channels (amenity pillar, scarcity pillar, supply-elasticity input, the
     fitted model's feature, and the Prestige Destination tag) now use **income-gated
     prestige-V/I** = V/I × min(2, income/median). Backtest cost: ≈0.004 AUC.
   - **Missing akiya gates.** THEORY.md's own rule — amenity without access, prestige, or
     institutions rots (Wakayama) — was not enforced. Fix: remote AND low-income places lose up
     to half their amenity pull and up to 70% of second-home wealth-growth capture.
   - **Heads counted as purchasing power.** Local household formation drove price regardless of
     income. Fix: income-anchored **price-to-income error correction** (2.5%/yr toward a 3.6×
     income fundamental; Caldera & Johansson, OECD 2013), damped by external support = prestige
     + metro access + university presence (student towns' median incomes are compositionally
     depressed; their prices are carried by external tuition/parental money — without the
     university term, State College fell from rank ~1,000 to ~3,200, which is how the term was
     caught).
   - **No data-confidence signal.** Covelo has no observed ZHVI in 2000 — thin markets rest on
     covariate extrapolation. Fix: `lowConfidence` flag (pop < 2,500 or no current ZHVI) on
     every output row.
   Result: Covelo's mechanism score flips negative (sim −0.16), outlook falls from +1.38
   (rank ~455 of 24.5k) to +0.74, and the residual is transparently attributed to the fitted
   historical channel plus its (unpriced-market) low-confidence flag. Hindcast Spearman ≥10k
   moves 0.385 → 0.317 — the deliberate cost of removing the credit-bubble channel (see
   BACKTEST.md).

## Final sanity table (rank among 4,184 places ≥10k)

| Place | Rank | Verdict |
|---|---|---|
| Boston, MA | 381 (top 9%) | ✅ institutional metro treated as winner |
| New York, NY | 347 | ✅ |
| Cambridge, MA | top 100 | ✅ knowledge capital |
| State College, PA | 109 | ✅ university + regional-hub compound |
| Naples, FL | 225 | ✅ amenity+prestige (not a Sun City clone — engines + wealth inflow) |
| Jackson, WY | 406 | ✅ prestige-scarcity |
| Boulder, CO | 687 | ✅ |
| Ann Arbor, MI | 1,484 (top 36%) | ⚠️ defensible-but-debatable: sim strongly positive; drag is the affordability channel |
| Rochester, MN | 2,307 (top 55%) | ⚠️ discussed below |
| Detroit, MI | 4,072 | ✅ |
| The Villages, FL | 4,181 | ✅ single-cohort trap flagged despite current boom — the model's core anti-momentum claim |

## Judgment calls the model makes (and our verdict)

- **Rochester, MN at the median** looks like a "Mayo test" failure — until you check the data:
  Rochester's realized 2000-2025 ZHVI growth (log 0.95) was itself almost exactly the national
  median. Mayo anchors demand, but flat-land elastic supply converts demand into houses, not
  prices — precisely the Tokyo-rents lesson (supply sets amplitude). The model correctly tags
  it Medical Hub with positive outlook and modest price growth. **Not a flaw.**
- **Kiryas Joel / Monsey / Lakewood NJ near the top.** Not noise: these Haredi communities are
  the most extreme demographic-regeneration outliers in America (TFR > 5, replacement ratios
  no other municipality approaches) with severe housing scarcity. The model, told to find
  places that keep generating young residents in an aging nation, found the fertility enclaves.
  Flagged as a genuine discovery, with the caveat that income/wealth per capita is low.
- **LA gateway suburbs (Maywood, Cudahy, Bell Gardens…) high.** Matches the Kawaguchi/
  Nishi-Kawaguchi (Japan) and Spanish-gateway lessons: immigrant density + extreme scarcity +
  metro core adjacency was the single strongest historical channel and remains demographically
  young. Risk noted: these ride on continued immigration policy.
- **Port Townsend, WA near the bottom** is the model's most contestable call: a prestige
  heritage amenity town scored as an aging trap (65+ share, weak engines, remote). The
  Wakayama lesson (warm coastal amenity without institutions or access rots) supports the
  model; Port Townsend's Seattle-wealth catchment argues against. Left standing, flagged low
  confidence.
- **Williston, ND at the bottom** — the model knows nothing about oil; it sees overbuild +
  weak institutions + weak human capital. Reasonable prior for a 40-year horizon.

## Residual weaknesses (not fixed, disclosed)

- Small college-town CDPs where the campus IS the town (Durham NH, Stanford CA) get whipsawed
  by the fitted model's student-demographics coefficients; the winsorized blend contains but
  does not eliminate this.
- The fitted classifier flags ~69% of places at the 90%-recall operating point — by design
  (recall over precision), but it means "flagged" is weak evidence; use the continuous outlook.
- No climate-risk layer: Florida coastal amenity winners (Sunny Isles Beach, Key Biscayne)
  carry unpriced flood/insurance risk that an aging-focused model does not see.
- 2023-vintage universities in the 2000 hindcast (persistence assumption).
