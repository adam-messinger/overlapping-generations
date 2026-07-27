# News-driven stress tests — 27 July 2026

This pass selects three stories from the 27 July news cycle that have a
measurable target and a mechanism the simulation collection can represent:

1. Nvidia is reportedly in talks to guarantee ~$250B of financing so OpenAI
   can lease SB Energy's planned 10 GW Piketon, Ohio campus. Is this "Lucent
   redux" vendor financing?
2. More than 75 U.S. data-center projects worth ~$130B were blocked or
   delayed in early 2026. Does that break the 194 GW-by-2035 demand path?
3. Solar generated more U.S. electricity than coal in May 2026, the first
   month on record. When does solar pass coal for a full year?

Run the models with:

```bash
npm run news:2026-07-27
```

These are conditional, first-order experiments. The backstop model prices a
deal that is still in negotiation; the attrition and crossover models
project from anchors that include estimated (not final) 2025 figures.

## Results at a glance

| Story | Initial model | Failure exposed by the first pass | Revised result |
|---|---|---|---|
| Nvidia backstop | Divide the guarantee by the guarantor's revenue and compare to Lucent (24%), Nortel (10%), Cisco (11%) in 2000: Nvidia is at 116% alone, 278% with chip financing | A contingent lease guarantee is not a booked loan, and a ratio says nothing about absorption capacity or when the exposure could actually be called | Expected loss ~$25B ≈ 25% of one year of Nvidia FCF; a full call with collapsed GPU collateral ≈ 2.1 years of FCF. Earnings risk and circularity, not Lucent-style solvency risk |
| Blocked data centers | Convert $130B to GW at facility cost, annualize: 47 GW/yr blocked vs 16 GW/yr required — "the forecast is infeasible" | Announced project values may include IT gear (3.7 vs 11.8 GW), blocked ≠ destroyed (phantom queue, relocation), and the forecast already absorbs ~24 GW/yr of queue attrition | Net consent drag 1.4–4.5 GW/yr of average load, comparable to the 1.5–5.3 GW/yr firm-capacity drag; both slow the path by years rather than breaking it |
| Solar over coal | Read the May monthly crossover as the annual regime change: "solar overtook coal in 2026" | May is solar's ~1.20× month and coal's ~0.84× month; annual 2026 still has a ~190 TWh solar deficit | Annual crossover in 2028 (2028–2029 across coal sensitivities). The seasonal model reproduces the observed May 2026 values within 6–8% from 2025 anchors |

## 1. The backstop is vendor financing — priced, it is an earnings risk

The reported structure: Nvidia would guarantee ~$250B tied to the lease and
construction debt of the $500B, 10 GW SB Energy campus in Piketon, Ohio that
OpenAI would lease, with chip-purchase financing that could reach another
$350B. Nvidia's FY2026 revenue was $215.9B and free cash flow $96.6B;
OpenAI's annualized revenue is ~$25B.

V1 reproduces the day's dominant take (the ratio):

| Entity | Peak commitments / revenue |
|---|---:|
| Lucent FY2000 | 24.1% |
| Nortel 2000 | 10.2% |
| Cisco FY2001 | 10.8% |
| Nvidia, backstop alone | 115.8% |
| Nvidia, incl. chip financing | 277.9% |

The intensity comparison is fair — this is 5× the worst vendor-financing
ratio of the telecom bubble, from a single deal, for a single counterparty.

V2 prices the guarantee instead of describing it:

- **Serviceability.** At 8% over 15 years the full-build lease is ~$58B/yr,
  requiring ~$195B of OpenAI revenue if this one campus can absorb 30% of a
  compute budget. Reusing the AI capital-cycle model's monetization paths:
  fast covers the lease by 2031, central by 2032 (about when full build
  arrives), slow never does by 2036. The guarantee is a bet that the slow
  path does not happen.
- **Expected loss.** Weighting the three paths (25/50/25) with per-path call
  probabilities (2%/15%/60%), 60% drawn at distress, and wrong-way recovery
  (20% in the slow world, where GPU resale collapses exactly when the call
  happens): expected loss ≈ $25B, about a quarter of one year of FCF.
  Applying the telecom bust's realized loss rate (35% of peak commitments)
  to the drawn exposure gives $53B — same order.
- **Absorption.** A full $250B call with worst-case recovery is ~$200B, or
  2.1 years of Nvidia FCF. Lucent's ~$3.5B of losses hit a company with
  negative FCF; that difference is why the ratio alone misleads.

Where the model differs from conventional wisdom: both popular readings are
wrong in opposite directions. "Lucent redux" overstates solvency risk — a
guarantee from a company generating ~$97B of FCF is absorbable. "It's only a
contingency, non-cash" understates it — the deal concentrates a
triple-digit-billion single-name exposure whose collateral (GPUs, AI-shell
real estate) is worth least in the states of the world where the call
happens, and 70% of the project capex flows back to the guarantor as chip
revenue. The right frame is a large written put on OpenAI monetization,
sold to finance demand for the writer's own product — earnings-cyclical,
circular, but not balance-sheet-fatal.

Sources: [Reuters/WSJ on the talks](https://finance.yahoo.com/technology/ai/articles/nvidia-talks-openai-guarantee-250-233930971.html),
[project details](https://www.networkworld.com/article/4183513/openai-weighs-nvidia-backed-lease-for-10-gw-ohio-data-center-campus.html),
[telecom vendor-financing history](https://tomtunguz.com/nvidia_nortel_vendor_financing_comparison/),
[Nortel drawn balances](https://www.theglobeandmail.com/report-on-business/nortel-clients-give-warning-of-finances/article20454748/),
[Nvidia FY2026 results](https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2026),
and [OpenAI revenue](https://sacra.com/c/openai/).

## 2. $130B blocked is a consent story, and smaller in GW than it sounds

Data Center Watch's count — 75+ projects, ~$130B, first three months of
2026 — is widely quoted next to "power shortage" framing. The tracker
itself attributes the blocks to local opposition: zoning denials,
moratoria, and at least 69 local bans.

V1 does the alarmed arithmetic: $130B ÷ $11B/GW ≈ 11.8 GW per quarter ≈
47 GW/yr, three times the 15.9 GW/yr the BloombergNEF 35→194 GW path needs.
Forecast infeasible.

V2 fixes three accounting problems and then asks which constraint binds:

1. **Capex semantics.** Announced "project value" sometimes includes IT
   equipment. The same $130B is 11.8 GW at facility-only cost ($11B/GW) but
   3.7 GW at full-stack cost ($35B/GW).
2. **Blocked ≠ destroyed.** A blocked proposal only removes demand if it
   would have materialized (utility queues realize ~40% of large-load
   requests) and does not resite (an estimated 60% relocate). Net loss:
   2.4–7.6 GW/yr of capacity, or 1.4–4.5 GW/yr of average load.
3. **The forecast already absorbs attrition.** Hitting 15.9 GW/yr net at 40%
   queue realization implies ~24 GW/yr of proposals failing anyway. Observed
   gross blocking (~130% of that budget) is elevated but the queue is
   deliberately oversubscribed.

The existing data-center-grid model then supplies the competing constraint:
if only 60 GW of shared firm capacity gets built by 2035 against the
socialized-scenario requirement of ~144 GW, unserved average load is
~53 GW — a 5.3 GW/yr drag, larger than consent. With 120 GW built the gap
is ~15 GW (1.5 GW/yr), smaller than the consent channel's upper bound.

| Channel | Average-load drag (GW/yr) |
|---|---:|
| Consent, net of phantoms and relocation | 1.4–4.5 |
| Firm capacity, 60 GW shared build | 5.3 |
| Firm capacity, 120 GW shared build | 1.5 |

Where the model differs from conventional wisdom: the "power shortage
blocked $130B of AI" framing misattributes a consent phenomenon, and the
literal GW subtraction overstates it by roughly an order of magnitude. But
the sanguine reading ("phantom queue, nothing real was lost") is also
wrong: consent drag at the observed rate is the same size as a plausible
firm-capacity shortfall, and the two channels compound — enough to push
the 2035 path years late even though neither breaks it.

Sources: [Data Center Watch tally](https://www.prnewswire.com/news-releases/130-billion-in-ai-data-centers-have-been-blocked-or-delayed-in-2026-302821568.html),
[coverage with attribution to local opposition](https://www.tomshardware.com/tech-industry/artificial-intelligence/more-than-75-data-center-build-outs-worth-usd130-billion-have-been-successfully-blocked-in-the-first-four-months-of-2026-bipartisan-opposition-mounts-nationwide-over-fears-of-soaring-power-and-water-costs),
and [the BNEF 2035 forecast](https://www.bloomberg.com/news/articles/2026-07-21/data-centers-on-track-to-suck-up-a-fifth-of-us-power-use-by-2035).

## 3. Solar passed coal in May; the annual crossover is ~2028

Ember's milestone is real: May 2026 solar 45.5 TWh (12.8% of generation)
versus coal 43.4 TWh (12.2%), the first month on record with solar above
coal. The headline reading treats this as the crossover.

V2 separates season from trend:

- May seasonal factors derived from 2025 anchors (solar ~390 TWh, coal
  ~700 TWh estimated): solar's May runs 1.20× its average month, coal's
  0.84×.
- One-step validation: projecting 2025 annuals forward one year and applying
  those factors predicts May 2026 at 48.1 TWh solar vs 46.8 TWh coal —
  within 6–8% of the observed values, and correctly reproducing the monthly
  crossover.
- Annual projection: solar adds ~92 TWh/yr (44 GW of 2026 solar additions at
  a 24% capacity factor), additions growing 5%/yr; coal declines 4%/yr
  centrally (0 to −8% sensitivity, reflecting demand growth propping coal
  against retirements).

| Year | Solar TWh | Coal TWh |
|---|---:|---:|
| 2026 | 482 | 672 |
| 2027 | 579 | 645 |
| 2028 | 680 | 619 |
| 2029 | 787 | 595 |

The first full solar-over-coal year is 2028 centrally, 2029 if coal holds
flat, and 2029–2030 if solar additions stall at ~70 TWh/yr. The monthly
milestone leads the annual crossover by about two years — the same pattern
as wind, which passed coal in monthly data in April 2019 but has still not
passed it on an annual basis in years when coal rebounds.

World-model tie-in: the repository's baseline scenario puts the *global*
solar-over-coal electricity crossover at 2034 — the US story leads the
world by roughly six years, mostly because Asian coal fleets are young.

Where the model differs from conventional wisdom: "solar has overtaken
coal" is premature by ~2 years as an annual claim for the US (2026 still
carries a ~190 TWh annual deficit), but the direction is overdetermined —
no plausible coal path avoids the crossover by 2030. The more durable
correction runs the other way: coal generation *rose* in 2025–2026 on gas
prices and demand growth even while its share fell, so share milestones say
little about absolute emissions in the near term.

Sources: [Ember on the May crossover](https://ember-energy.org/latest-updates/solar-overtakes-coal-in-us-electricity-for-the-first-month-on-record/),
[EIA 2026 planned additions](https://pv-magazine-usa.com/2026/07/22/solar-and-storage-account-for-91-of-new-u-s-grid-capacity-in-first-half-of-2026/),
and [EIA 2025 generation record](https://www.eia.gov/todayinenergy/detail.php?id=67284).

## What most differs from conventional wisdom

1. **Nvidia backstop:** the telecom-bubble ratio comparison is directionally
   fair and quantitatively unprecedented, but the failure mode is different:
   circular, concentrated earnings risk with wrong-way collateral — not the
   thin-balance-sheet solvency spiral of 2001. Watch the call probability
   (OpenAI monetization), not the notional.
2. **Blocked data centers:** consent, not electrons, is what blocked $130B —
   and correctly accounted, consent and firm capacity are similar-sized
   drags that delay rather than derail the 2035 demand path.
3. **Solar vs coal:** a seasonal first is two years ahead of the annual
   fact; and because coal output is currently rising with demand, the
   crossover is a share story, not yet an emissions story.

Code:
`src/simulations/news/headline-experiments-2026-07-27.ts`.
