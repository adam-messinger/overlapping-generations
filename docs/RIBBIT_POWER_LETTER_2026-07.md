# Ribbit Power Letter (July 2026) vs the Twin-Engine hypothesis

Ribbit Capital's July 2026 LP letter is a 42-page investment thesis arguing
that the binding constraint on the AI buildout is electrons, not money, and
that value in the next decade accrues to founders who "make, move, store, and
sell" both electrons and tokens. It is not a forecast document, but it makes
enough checkable quantitative claims to function as an outside-view audit of
the Twin-Engine path.

Reproduce the model side with:

```bash
npm run ribbit:compare        # letter claims + baseline / central-path / ai-energy-boom
npx tsx scripts/compare-forecast.ts   # sim vs the Twin-Engine era table
```

**What "the Twin-Engine hypothesis" means here.** The repository does not
contain a Twin-Engine document. What it contains is (a) the era-by-era
forecast table hard-coded in `scripts/compare-forecast.ts` — final energy per
capita, temperature, old-age dependency, robot density, oil share — and (b)
five probability-weighted scenarios that sum to 100%: `central-path` (30%),
`tech-plateau` (30%), `tech-breakthrough` (20%), `debt-populism` (12%), and
`climate-cascade` (8%, carried in `meta.probability`). Everything below
compares against those. If a fuller statement of the hypothesis exists
outside the repo, the claims in §2 and §5 are the ones most likely to need
re-checking against it.

---

## 1. Where the two agree, and it is not a small agreement

The letter's opening move is Ayres-Warr biophysical economics arrived at from
the flow-of-funds side rather than from thermodynamics:

> "If you spend enough time thinking about what money really is, you end up
> thinking about energy... every financial system in history, from Mesopotamian
> grain tokens to Bretton Woods to Bitcoin, has been backed by energy at its
> core."

That is the γ = 0.55 production function stated in prose. A fintech investor
with no stake in the heterodox-growth literature independently reaching the
model's most contested structural choice is the single most useful thing in
the letter, because it is the choice the model is least able to defend from
data (`docs/SENSITIVITY.md`: γ spans ~1.7x in 2100 GDP).

Three further convergences:

| Claim | Letter | Model |
|---|---|---|
| The transition is cost-driven, not policy-driven | "the places deploying renewables fastest today (China, India, Texas, Pakistan, Indonesia) are doing so based on cost" | Research-note result #1: solar crosses gas by 2025 **in every scenario**; transition is self-reinforcing regardless of climate policy |
| Cheap electricity is the growth variable | "the pareto price is now the price of intelligence" | Research-note result #2: scenarios with cheap abundant electricity produce 2-3x the GDP of those that suppress it |
| Storage is the enabling technology, not a rounding error | A whole belief section on batteries | Storage capacity gates VRE penetration; curtailment feedback boosts storage investment; system LCOE blends storage at high VRE |

The letter is climate-agnostic throughout — decarbonization appears only as a
cost curve, never as a policy target. That is corroboration of the model's
central claim, from a source with no reason to want it to be true.

---

## 2. The substantive disagreement: what brakes AI electricity demand

This is where the letter and the model are not describing the same world.

**The letter's numbers.** US alone needs >100 GW of new capacity by 2030. US
datacenters "on course to use more power than all of Japan by 2030" — Japan
consumes roughly 950–1,000 TWh/yr. The BNEF chart projects AI compute to
~200 GW by 2030, crossing "all human brains" (8B × 20 W ≈ 160 GW) late this
decade. At high utilization, 200 GW ≈ 1,500 TWh/yr of AI compute alone.

**The model's numbers.**

| 2030 datacenter load | TWh | Share of world electricity |
|---|---|---|
| baseline / central-path | 1,007 | 3.6% |
| ai-energy-boom | 1,366 | 4.8% |
| Letter, **US only** | ~950–1,000 | — |

The letter's US-only 2030 figure is approximately the model's entire *global*
datacenter load on the central path. Even `ai-energy-boom` — the scenario
built specifically to remove the demand cap — leaves only ~400 TWh for the
rest of the world. On this claim the letter does not sit between the model's
scenarios; it sits above all of them.

**Why the model is low, and why the reason is the interesting part.** Demand
is braked by `dataCenterPowerSpendCeiling` = 0.05% of GDP — a willingness-to-pay
ceiling on the datacenter *electricity bill* as a share of GDP. Equilibrium
load is `ceiling × GDP / LCOE`. This was a deliberate improvement over the old
hard `dataCenterSaturation` cap (see `sources/ai-robotics-deployment-ceilings.md`),
and it is a real mechanism: compute does self-limit through price.

The letter's cost breakdown says it is the wrong lever. For a stylized 1 GW AI
datacenter (epoch.ai / Jefferies), annual costs are servers $5,000M, facility
$1,400M, networking $1,200M, **energy $590M**, taxes $140M, maintenance $120M,
labour $40M. Energy is ~7% of total cost of ownership.

A buyer for whom power is 7% of TCO, facing token demand doubling every four
months, does not stop buying power because power got expensive. The braking
variable is chips, capital, and physical delivery — not the electricity bill.
The model's ceiling binds on the one input that is least likely to bind in
reality.

The `ai-energy-boom` scenario partially concedes this (10x ceiling, and
CLAUDE.md notes that financing there binds through WACC rather than the capex
budget), but 2030 boom load is still 9% below the letter's US-only figure.

**Concrete revision candidate.** Re-anchor the ceiling on datacenter *revenue
or total TCO* rather than the electricity bill: at 7% of TCO, a 0.05%-of-GDP
electricity bill implies a ~0.7%-of-GDP compute industry, which is a far more
defensible thing to bound. Equivalently, raise the ceiling roughly 3–5x and
say why. Either way the current parameter is calibrated against a quantity the
letter shows is nearly irrelevant to the buyer's decision.

---

## 3. The constraint the model does not have at all

The letter's "why now" section is almost entirely about physical and
institutional friction:

- US interconnection queue ~2,600 GW waiting, against ~1,300 GW installed;
  average wait 5+ years.
- Large power transformers: 2–3 year lead times, up from 6–12 months in 2020.
  Medium-voltage switchgear 12–24 months. Industrial chillers 12–18 months.
- Specialty contractors who can build at current densities "can be counted on
  two hands and are booked years out." Skilled medium-voltage electrician
  wages up 30–50% since 2022.
- The industry "spends less of its revenue on R&D than the average restaurant
  chain."

The model has no representation of any of this. Its deployment constraints
are cost (LCOE), `maxGrowthRate` caps, mineral availability, curtailment
feedback, and financing cost (WACC and the unified capital ledger). All of
these are *price and quantity* constraints. None of them is a *queue*.

This matters more than it sounds, because a queue and a price cap have
opposite dynamics. A price cap is self-clearing: when demand rises, the price
rises, demand falls. A queue is not: when demand rises, the wait lengthens,
and the buildout is rate-limited by a stock of institutional capacity that
does not respond to price for years. `maxGrowthRate` is the model's only
proxy, and it is a smooth exogenous ceiling rather than a stock that depletes
and rebuilds.

If the letter is right that 2026–2032 is queue-limited rather than
price-limited, then every scenario's near-term deployment path is shaped by
the wrong mechanism — and the ones most affected are `tech-breakthrough`
(solar `maxGrowthRate` 0.40) and `ai-energy-boom`, precisely the branches
where fast deployment is the whole point.

The honest version of this finding is that it is a *scope* gap, not
necessarily an error: a 2025–2100 model may reasonably treat a five-year
interconnection queue as noise. But the Twin-Engine probability weights are
assigned over branches that differ mostly in their 2026–2045 deployment
speed, which is exactly the window the queue governs.

---

## 4. Calibration checks the letter can actually settle

### 4a. Long-duration storage — the sharpest single finding

The model's `longStorage` block is explicitly flagged in-code as guesswork:

```ts
// Long-duration storage (iron-air, CAES, etc.): modeling assumptions —
// pre-commercial technology, costs anchored loosely to ~2x Li-ion
longStorage: { cost0: 300, alpha: 0.15, duration: 100, ... }
```

The letter supplies a real contracted number for that exact technology class
and that exact duration: a Google-partnered 300 MW / 30 GWh system in
Minnesota — 100 hours, matching the model's `duration: 100` — that "pencils to
roughly $33/kWh after incentives."

| | $/kWh |
|---|---|
| Letter, 2026 contracted (after incentives) | ~33 |
| Model `longStorageCost`, 2025 | 300 |
| Model, 2050 | 118 |
| Model, 2100 | 47 |

Even grossing up for a 30–50% incentive, the letter's pre-incentive figure is
roughly $50–65/kWh — a level the model does not reach until the 2070s. The
model's LDES curve is off by close to an order of magnitude at the start
point, and `cost0` is the one parameter here with no source behind it. This
is worth fixing on its own; it will pull VRE penetration ceilings and system
LCOE at high VRE share.

### 4b. Solar learning rate — the letter is the aggressive one

> "every time global solar capacity doubles (currently ~3 years) costs fall
> another 30-40%"

Implied Wright's Law exponent: α = 0.51 (30%) to 0.74 (40%). The model uses
α = 0.36 on `central-path` (22% per doubling, Rubin 2019) and α = 0.42 on
`tech-breakthrough` (25%). The letter's *low* end is above the model's
*breakthrough* case.

Here I would not move the model. 30–40% almost certainly conflates module
price declines (which the letter separately cites correctly at −86% over 15
years) with system or LCOE declines, and includes a period of Chinese
overcapacity that is a price event rather than a learning event. The
two-independent-sources rule in CLAUDE.md exists for exactly this claim. Log
it as a disagreement, not a revision.

### 4c. Batteries

The letter's "−88% over fifteen years with grid-scale capacity up >100x since
2020" implies roughly 16–17% per doubling (α ≈ 0.26) if read as cumulative
deployment. The model's `central-path` battery α = 0.18 (11.8% per doubling);
`tech-breakthrough` uses 0.25. Central-path battery learning looks
conservative against observed history — a smaller, better-founded revision
than the solar one.

---

## 5. Robots: the letter sides with your model against your hypothesis

This is the cleanest result in the comparison, and it cuts the opposite way
from §2.

| Robots per 1,000 workers | 2050 | 2075 | 2100 |
|---|---|---|---|
| Twin-Engine forecast table | 60 | 110 | 120 |
| Model (baseline, endogenous rule) | 60 | 257 | 1,157 |

`compare-forecast.ts` currently annotates this divergence as a model defect
("Sim uses 12%/yr growth rate; T-E more conservative"). That comment is stale
— the hard `robotSaturation` cap was replaced by the endogenous
marginal-value-vs-marginal-cost rule, so the 1,157 figure is a deployment
equilibrium, not a growth-rate artifact.

The letter's robotics section argues for the model's side:

> "each robot is a data-collection rig running in a real physical
> environment... once robots can build robots, manufacturing becomes
> recursively self-improving"

A recursive manufacturing loop is inconsistent with density flattening
between 2075 and 2100, which is what the Twin-Engine table asserts (110 → 120
over 25 years). The letter also grounds the energy side: "a fleet of one
million humanoids running at scale will draw the equivalent of multiple new
nuclear reactors" — which is the model's robot energy-demand channel, not a
diagnostic add-on.

**Revision candidate:** the Twin-Engine robot path is the number to move, not
the model. Its terminal 120/1,000 is roughly Korea's *2020* industrial-robot
density held flat for 75 years through a period the letter (and the model's
own automation economics) both describe as recursive.

---

## 6. What the letter has that the model does not represent at all

- **Frontier generation.** `EnergySource` is `solar | wind | gas | coal |
  nuclear | hydro | battery`. There is no geothermal and no fusion. The
  letter's final and most differentiated belief — "AI will bend the curve for
  an entire generation of frontier energy technology" — covers SMRs and
  reactor restarts, fusion (CFS, Helion, Pacific Fusion, TAE), and enhanced
  geothermal built on shale-fracking learning. `tech-breakthrough` proxies
  all of this by setting `nuclear.cost0: 80`, which is a reasonable
  aggregation but cannot express "EGS gets a shale-style cost curve while
  fission does not."
- **Intraday price structure.** The letter reports Germany and Spain each
  seeing 500+ hours of negative prices in 2025, and PJM's capacity auction
  clearing ~9x higher year-over-year ($2.2B → $14.7B). The model's dispatch
  is annual merit order. Negative prices, capacity markets, and arbitrage
  spreads — the entire economic basis of the letter's battery thesis — have
  no representation. The model treats storage as a *technical* enabler of VRE
  share; the letter treats it as a *financial* asset that reprices power.
  Nothing in the model would change if storage arbitrage revenue doubled.
- **The second engine is a different engine.** The Twin-Engine pairing, as
  encoded, is the energy transition and the demographic transition —
  dependency ratios, transfers, and the intergenerational accounts. The
  letter never mentions demographics. Its implicit twin engines are energy
  and *intelligence*. Neither framing is wrong, but they only overlap on one
  engine, which is worth knowing before treating the letter as external
  validation of the whole structure.
- **Capacity factor.** The letter notes US terrestrial solar runs at "less
  than a 25% capacity factor." Worth checking against the model's
  `siteDepletion` assumptions (30% CF reduction at full potential from a
  best-sites-first rule) — the mechanism is there, the starting point may not
  be.

---

## 7. Net assessment

The letter is not a competing forecast and should not be scored as one. Its
value is that it is a well-sourced, financially-motivated near-term document
covering exactly the 2026–2035 window where the model is weakest, written by
people who lose money if they are wrong about deployment rates.

Read that way, it produces four asymmetric findings:

1. **`longStorage.cost0 = 300` is probably wrong by ~5-9x.** The letter gives
   a contracted price for the same technology at the same duration. Highest
   confidence, smallest change, and the parameter had no source to begin with.
2. **`dataCenterPowerSpendCeiling` brakes on the wrong variable.** Power is
   ~7% of AI datacenter TCO. A ceiling on the electricity bill cannot
   represent a buyer whose constraint is chips and delivery.
3. **The model has no queue.** Interconnection waits and equipment lead times
   are the letter's central "why now," and the model's deployment friction is
   entirely price-shaped. This is the largest structural gap, and it lands in
   the window the Twin-Engine probability weights are actually discriminating
   over.
4. **The Twin-Engine robot path, not the model's, is the one to revise up** —
   and the stale defect annotation in `compare-forecast.ts` should be
   corrected regardless.

Against these, the letter's solar learning claim (30–40% per doubling) is the
one place it is more aggressive than the model, and I would not follow it.

The deeper agreement is worth restating: the letter's whole argument is that
energy is upstream of value creation, that cheap electrons drive growth rather
than costing it, and that the transition is happening on economics regardless
of climate policy. Those are the model's three headline results, reached
independently by someone selling a fund rather than defending a production
function.
