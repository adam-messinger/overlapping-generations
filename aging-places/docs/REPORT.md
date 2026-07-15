# Aging, Demographics, and Long-Term Real-Estate Value in the United States

**Final report — research program deliverables.** Companion documents: theory
(`THEORY.md`), international evidence (`LESSONS_JAPAN.md`, `LESSONS_ITALY.md`), model design
(`METHODOLOGY.md`), validation (`BACKTEST.md`), iteration log (`STRESS_TEST.md`). Full ranked
universe: `outputs/forecast-all.csv.gz` (~24,500 municipalities); lists: `outputs/*.csv`.

---

## 1. The theory in one page

Aging does not shrink housing demand uniformly — it **changes its composition and concentrates
it**. Broad-based household formation (which spreads growth across every suburb) gives way to
three spiky flows: the migration of the scarce young, the spending of the old's accumulated
wealth, and external demand (immigrants, second-home capital, tourists). The observed result in
every aged country is **tripolarization**: a small rising tier, a sagging middle, and a long
tail sliding toward zero value.

Four capitals decide a municipality's tier, multiplicatively:

1. **Institutional concentration** — universities, medical centers, government, military,
   regional service monopolies: machines that *import people on a schedule*. What matters is
   the annual flow they import, not their mere presence (Rome and Valladolid fell with
   institutions intact; Fukuoka and Bologna compounded).
2. **Amenity concentration** — but only when paired with scarcity, prestige, or access. Amenity
   alone rots (Japan's vacant-home belt is warm and coastal).
3. **Demographic regeneration** — the master variable: the capacity to re-attract 25-44s
   continuously. A place can regenerate while shrinking (Leipzig, Toyama center) and can grow
   while failing to regenerate (every Sun City).
4. **Wealth concentration** — aging shifts purchasing power to the old, who spend it on medical
   proximity, central convenience, and second homes; places positioned to receive elderly
   wealth appreciate with zero population growth (the Venice inversion).

Two laws govern the interactions: **supply sets the amplitude, demand sets the sign** (elastic
supply moderates winners and deepens losers — Tokyo vs Daegu); **access is a threshold
multiplier** (≤ ~1h to a booming core converts periphery into spillover; beyond it,
infrastructure alone saves nothing — Spain's AVE ghost stations, Daegu's KTX).

## 2-3. Lessons from Japan and Italy (full docs in repo)

Japan: national record land-price gains coexist with 9M vacant homes; winners were the youth-
importing hubs (Tokyo core, Fukuoka +9%/yr land), global amenity assets (Niseko, Karuizawa,
Kyoto), and policy-concentrated centers (Toyama LRT corridors); losers were the 1970s
single-cohort commuter towns (Tama New Town), the engine-less rural belt, and industrial
monotowns (Yubari). Korea compressed the same story into 20 years (Seoul doubling while Daegu
fell 112 straight weeks amid oversupply).

Italy is the no-immigration control: national real prices fell 24% (2011-24) while Milan rose
49% — a one-winner country. Spain (foreign-born 1.4%→20%) and Germany (polycentric, migration
waves) aged just as fast and boomed, with winners in capitals, university towns (Bologna +37%
student rents; Leipzig condos +250%), and international amenity coasts (Málaga >20% above its
2007 peak); losers in the emptied interior (España vaciada, Mezzogiorno €1 houses, Chemnitz).
Government seats alone did not hold value (Rome −13%); place-based revival policy measurably
failed (Bank of Italy on SNAI: zero effect).

## 4. Methodology (full doc in repo)

Every US place (n≈24,500) is scored by two independently validated models built from Census
2000/ACS 2023 microstructure, Zillow ZHVI, IPEDS, and spatial market-access computation:

- a **statistical model** fit on year-2000 features → realized 2000-2025 ZHVI growth
  (test ROC-AUC 0.81; 0.84 for places ≥10k; recall 0.92 at the high-recall operating point;
  top-decile calibration 76% winner rate);
- a **mechanism simulation** — an overlapping-generations municipal model on this repo's
  simulation framework (national cohort projection → four-capitals attraction → gravity-logit
  migration of young/retiree pools → local housing demand/supply/price with elasticity and
  abandonment dynamics). Its attraction weights come from the international evidence, not US
  fitting; hindcasting 2000→2025 recovers Spearman 0.39 / AUC 0.70 (places ≥10k) against
  realized growth — the core validation that the aging-geography mechanisms transfer.

Outlook = 0.7·z(simulated 2025-2065 growth) + 0.3·z(fitted expected growth). Valuation gap =
outlook − z(current price/income).

## 5. Backtest results (full doc in repo)

| Test-set metric | Value |
|---|---|
| ROC-AUC (all / ≥10k) | 0.801 / 0.837 |
| Recall at operating point (all / ≥10k) | 0.922 / 0.985 |
| Precision (base rate 25%) | 0.337 / 0.379 |
| Calibration | monotone; top decile 75%, bottom 4% |
| Mechanism hindcast Spearman (≥10k) | 0.317 (0.385 before removing the credit-bubble channel; see BACKTEST.md) |

## 6. Top 100 (headline: top 50, pop ≥ 10k; full CSV in outputs/)

The winners fall into five archetypes rather than one list-topping type:

**A. Gateway-scarcity metro cores & inner suburbs** (the Kawaguchi/Madrid channel): Maywood,
Cudahy, Bell Gardens, Huntington Park, East LA, El Monte (LA core belt); Passaic, West New
York, Fairview NJ; Langley Park MD; Waipahu HI; Hoboken.
**B. Fertility enclaves** (extreme demographic regeneration): Kiryas Joel NY (#2), Monsey NY,
Lakewood NJ — the strongest replacement ratios in America.
**C. Prestige-amenity scarcity** (the Como/Karuizawa channel): Nantucket, Sunny Isles Beach,
Key Biscayne, Ocean City NJ, South Lake Tahoe, Lake Arrowhead, Big Bear, Panama City Beach,
Aventura, Hallandale Beach.
**D. Knowledge capitals**: Cambridge MA (#30), Stanford CDP, Berkeley-adjacent CDPs; Boston
ranks in the top 9% of all ≥10k places.
**E. Metro-spillover value corridors**: East Palo Alto, North Fair Oaks, East Riverdale MD,
McNair VA, Round Lake Beach IL.

Top-10 by outlook: Nantucket MA, Key Biscayne FL, Kiryas Joel NY, Maywood CA, Hoboken NJ,
Alum Rock CA, Lennox CA, Waipahu HI, Langley Park MD, Monsey NY.

## 7. Bottom 100 (headline: bottom 50; full CSV in outputs/)

Three archetypes, exactly as the theory predicts:

**A. Single-cohort retirement tracts — the American Tama New Towns**: On Top of the World FL
(#1 worst), The Villages FL, Sun City / Sun City West / Sun Lakes / Saddlebrooke AZ, Sun City
Center FL, Holiday City-Berkeley NJ, Laguna Woods CA, Hot Springs Village AR, Green Valley AZ.
Currently booming; demographically they age in lockstep with no replacement engine — the
model's strongest anti-momentum call.
**B. Engine-less industrial legacy**: Johnstown PA, East Cleveland OH, East St. Louis IL,
Gary IN, Wheeling WV, Anniston AL, New Kensington PA, Selma AL, Cumberland MD.
**C. Remote small cities with weak institutions/oversupply**: Williston ND (boomtown
overbuild), Borger TX, Elk City OK, Mason City IA, Mitchell SD, Rutland VT.

## 8. Most undervalued (fundamentals strong, priced cheap)

- **Immigrant-anchored regeneration towns nobody prices**: Beardstown IL, Schuyler NE,
  Liberal KS — meatpacking-economy towns with the youngest age structures in rural America.
- **Inner-ring spillover of expensive metros**: Langley Park MD, Lauderdale Lakes FL, Harper
  Woods & Lincoln Park MI, Sharon Hill PA, Posen & Sauk Village IL, Elsmere DE, Woodlawn VA.
- **Hoboken NJ** — the one famous name the gap metric still calls cheap relative to its
  regeneration + access fundamentals.
- Rio Grande Valley towns (Alamo, Raymondville TX): young, growing, near-zero prices.

## 9. Most overvalued (price assumes what demographics won't deliver)

- **Priced-for-perfection prestige with aging-trap structure**: Beverly Hills, Newport Beach,
  Montecito, Laguna Beach, Santa Monica, Los Altos Hills, Woodside, Saratoga, Larkspur,
  Paradise Valley AZ, Key West.
- **Retirement markets at retirement-boom prices**: The Villages, all Sun Cities, Sequim WA,
  Port Townsend WA, Skidaway Island GA, St. James NC — the market prices the current inflow;
  the model prices the 2040s exit wave.
- Interpretation: the prestige group likely keeps its top-tier *level* (scarcity floor) but
  offers poor forward *returns*; the retirement group faces genuine Tama-New-Town risk.

## 10. What makes places win or lose as America ages

**Win conditions** (≥2 required): an institution that imports people annually at scale relative
to town size; sustained 25-44 replacement (organically or via immigration/fertility); scarce,
prestigious amenity connected to wealth; ≤1h access to a winner metro; supply constraint in the
presence of demand.
**Lose conditions**: one cohort housed all at once (the single-cohort trap — retirement tracts
and 1970s exurbs are the same object 30 years apart); institutions that stop importing;
remoteness without regional monopoly; elastic overbuilding into decelerating demand; distress
vacancy as the visible symptom.
**The two biggest American mispricings implied by the international record**: (1) the market
extrapolates retirement-migration momentum into the exact structures that aged worst in Japan;
(2) it underprices institutional regeneration in cheap inner suburbs and immigrant towns —
the places whose age pyramids look like a growing country's.

### Confidence and caveats

Forty-year municipal forecasts are hypotheses with error bars. The model is validated at rank
correlation ≈ 0.3-0.4 and AUC 0.67-0.84 over one 25-year replication — strong for this problem
class, far from determinism. Rows flagged `lowConfidence` (population < 2,500 or no observed
Zillow market) rest on covariate extrapolation, not price history. Known blind spots: climate/flood risk (Florida amenity winners),
immigration policy dependence (gateway winners), oil/industry shocks (Williston), and
endogenous institutional decline (a university closure is not predicted, it is assumed away).
See STRESS_TEST.md for the judgment calls we left standing and why.
