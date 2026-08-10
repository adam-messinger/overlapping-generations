# News stress tests, 2026-08-10

Two headlines from the day's cycle, both about the same underlying question:
**is electricity the binding constraint on the AI buildout, and if so, which
part of electricity?**

| Headline | Estimand | Mechanism |
|---|---|---|
| Bloomberg (2026-08-06), "Data Centers Are Being Damaged by AI's Volatile Power Demand" | Volatility cost as a share of AI cost of ownership | Load spectrum → asset wear → least-cost mitigation |
| LBNL *Queued Up: 2026 Edition* / FERC interconnection docket, ~2,600 GW in US queues | Deliverable generation capacity per year | Service capacity + endogenous withdrawal |

Run with `npm run news:2026-08-10`. Models in
`src/simulations/news/headline-experiments-2026-08-10.ts`, tests alongside.

---

## 1. The volatility tax on AI compute

### The claim in the news

AI training synchronizes tens of thousands of GPUs, which alternate between a
compute phase and a collective-communication phase every 3–10 seconds. NERC
calls the resulting swings a "high likelihood, high impact" grid risk. The
Bloomberg piece reports the consequence downstream of the meter: batteries,
generators and cooling systems malfunctioning or wearing out far sooner than
expected, with lost uptime hitting revenue.

### The model

The unit of analysis is a 1 GW hyperscaler AI campus (Epoch AI's cost
breakdown: $38M/MW upfront, **$8.5B/yr annualized cost of ownership**, servers
60% of it, energy ~7%, PUE 1.14, 71% utilization).

AI load is not "a swing" — it is a spectrum, and each band has completely
different economics. For a sinusoidal deviation of peak-to-peak amplitude `A·P`
and period `T`:

- buffer power = `A·P/2` — set by amplitude only;
- buffer **energy** = `A·P·T/(2π)` — scales **with** the period;
- **cycle count** = `duty·yr/T` — scales with the **inverse** period;
- annual **throughput** = `A·P·duty·yr/(2π)` — **independent of the period**.

That last invariant is what makes the problem counterintuitive, and it is
pinned in a test.

| Band | Period | Campus swing (p-p) | Buffer power | Buffer energy | Cycles/yr | Throughput |
|---|---|---|---|---|---|---|
| intra-batch | 0.1 s | 5.0% | 25 MW | 2.2e-4 MWh | 1.9e8 | 42 GWh/yr |
| collective-sync | 5 s | 24.8% | 124 MW | 5.5e-2 MWh | 3.8e6 | 207 GWh/yr |
| checkpoint | 600 s | 25.2% | 126 MW | 6.7 MWh | 3.2e4 | 211 GWh/yr |
| job-transition | 4 h | 35.1% | 176 MW | 223 MWh | 2.2e3 | 489 GWh/yr |

Cluster-level amplitudes come from the reporting (Meta's "tens of megawatts" on
a 30 MW, 24k-H100 cluster). `campusCorrelation` — how much of that survives
aggregation across a campus — is the parameter nobody publishes; it is
calibrated so campus swings land at the "hundreds of MW on a GW campus"
magnitude NERC describes.

### V1: the arithmetic the headline implies

Charge every oscillation in the spectrum against the installed UPS string's
rated cycle life, and against the cooling plant's fatigue life with no thermal
filtering.

| | Result |
|---|---|
| Installed UPS life | **82 seconds** |
| Cooling wear multiplier vs. a cloud site | **457×** |
| Annual cost | **$14.7T/yr** |
| Share of cost of ownership | **173,000%** |

A model that returns 1,732× the cost of owning the asset is not a finding; it
is a missing constraint. Naming the missing constraints is the work.

### V2: three physical constraints and one economic one

1. **C-rate sizing.** A buffer's rated energy cannot be below
   `power / maxCRate`. For the 5 s band an LFP battery is forced to 124 MWh —
   an oversize of ~2,300× the swing energy. Real installations are energy-
   oversized by two to three orders of magnitude whether you want them to be or
   not.
2. **Depth-of-discharge stress.** `N(DoD) = N_rated · DoD^-k`. Cycles available
   scale as `oversize^k`, so the micro-cycling that killed the V1 battery in 82
   seconds is not the binding wear mechanism at all. Under V2 the same LFP unit
   runs to its 15-year calendar life.
3. **Thermal low-pass.** A chilled-water loop is a first-order lag with a time
   constant of minutes. It simply does not see the seconds-band oscillation.
   Applying the filter drops the AI-to-cloud wear ratio from 457× to 5.3×.
4. **Operators buy the cheapest fix**, they do not absorb the damage.

Mitigation priced per band, annualized:

| Band | Cheapest buffer | Buffer | Dummy workload | GPU power cap | Chosen |
|---|---|---|---|---|---|
| intra-batch | flywheel | $2.8M | $12.5M | $28.5M | buffer |
| collective-sync | LFP | $9.3M | $61.8M | $141.0M | buffer |
| checkpoint | LFP | $9.5M | $63.0M | $143.5M | buffer |
| job-transition | LFP | $41.6M | $146.2M | $333.2M | buffer |

The ordering is the result: **hardware ≪ wasted energy ≪ lost compute.** The
dummy-workload column totals $284M/yr, which independently reproduces the "tens
of millions per year at gigawatt scale" that Meta's
`pytorch_no_powerplant_blowup=1` is reported to cost. Anything that touches
compute throughput is the expensive option, because the campus cost is almost
entirely fixed.

### The correction that changed the answer

The first version of V2 credited the electrical buffer with protecting the
cooling plant. That is wrong: a battery decouples the **grid** from the swing,
but every watt the GPUs draw still lands in the chilled-water loop, whichever
side of the meter it came from. Only measures that flatten IT power *at the
source* (dummy fill, power capping) or that buffer **heat** touch chiller wear.

Separating the two channels is what produced the actual finding:

| Item | Annual |
|---|---|
| Grid-side smoothing (buffers) | $63.1M |
| Cooling: absorb the thermal swing | **$542.9M** |
| Cooling: chilled-water store ($17.7M capex) | $1.9M |
| Grid stabilization (synchronous condensers) | $1.3M |
| **Total at the least-cost fix** | **$66.4M/yr = $9.36/MWh = 0.78% of TCO** |

Chiller life without a thermal store is **3.8 years against a 20-year design
life** — which is what the reporting is describing. A ~$18M chilled-water store
retires it and pays back **282×**.

### Robustness

The thermal time constant and the fatigue exponent are the two least identified
parameters in the model. Sweeping them moves the wear multiplier over 5.3×–12.8×
and the absorb-the-damage cost over $543M–$1.51B/yr — and leaves the headline
number at **0.78% of TCO in every cell**, because the mitigation caps the
exposure. The conclusion is bounded even where the fatigue physics is not.

### Macro linkage

The repository's demand module rations data-center load with a
willingness-to-pay ceiling on the electricity-bill share of GDP. A volatility
tax raises the all-in cost of AI compute without raising the electricity bill,
so it shrinks the electricity budget by `tax/(1+tax)`, i.e. an effective ceiling
of `ceiling/(1+tax)`. Injected into the full 2025–2100 run:

| Case | Tax | DC load 2100 | Δ load | GDP 2100 | ΔT 2100 |
|---|---|---|---|---|---|
| none | 0% | 41,998 TWh | — | $1,967T | — |
| V2 least-cost mitigation | 0.78% | 41,724 TWh | −0.65% | $1,968T | +0.0001 °C |
| chillers absorb the swing | 6.4% | 39,789 TWh | −5.26% | $1,978T | −0.0058 °C |
| hypothetical binding tax | 25% | 34,635 TWh | −17.53% | $2,005T | −0.0032 °C |

Elasticity of 2100 load to the tax: **−0.86**, which is a budget identity, not
a result. Two caveats stated rather than buried: the 2100 GDP *rises* slightly
as data-center load falls because data centers are a GDP-neutral electricity
sink in this model with the AI payoff off by default — that sign is a property
of the assumption, not evidence that volatility helps growth. And the
temperature column is noise at this magnitude.

---

## 2. What the interconnection queue actually delivers

### The claim in the news

~2,600 GW of generation and storage sits in US interconnection queues against a
745 GW national peak — 3.5× the grid. Waits run five years and up. FERC has
grids on a ~60-day clock for revised tariffs. The framing throughout is that the
queue is a *pipeline* and the grid cannot keep up with AI.

### V1: the queue as a pipeline

| | Result |
|---|---|
| Queue / US peak load | 3.49× |
| 13% historical completion share × queue | 338 GW "coming" |
| Time to clear at observed additions | 42 years |

The flaw: no time dimension, no service capacity, and no recognition that the
completion rate is *produced by* congestion. Developers withdraw because the
wait is long, and the wait is long because the queue is deep.

### V2: a congested service system with endogenous withdrawal

Little's Law first. With a 13/75/12 completion/withdrawal/active split and mean
residences of 5/3/5 years, mean residence is 3.5 yr, so the standing queue
implies **743 GW/yr of arrivals**.

| Quantity | Value |
|---|---|
| Arrivals implied by the standing queue | 743 GW/yr |
| Completions implied by the 13% historical share | 97 GW/yr |
| Observed US capacity additions | **62 GW/yr** |
| Completion share consistent with observed additions | 8.3% |
| Overstatement from using the historical share | **1.56×** |

The historical completion rate is a stale-cohort statistic and overstates
current delivery by half again.

The steady state solves `λ = S(L) + h(L/S(L))·L`, where service capacity
degrades with queue length (restudies) and the withdrawal hazard rises with the
expected wait:

- **Completions are set by service capacity, not queue depth.** Doubling
  arrivals into the same system grows the queue 38% and moves delivery by less
  than a tenth — *downward*, via congestion drag. The queue is the rationing
  device, so its headline size carries almost no information about delivery.

### The counterintuitive comparative statics

| Reform | Queue | Δ queue | Completions | Δ completions | Wait |
|---|---|---|---|---|---|
| Readiness deposits halve speculative multi-siting | 1,808 GW | **−30%** | 67 GW/yr | +8% | 27 yr |
| Study/construction throughput +50% | 3,054 GW | **+18%** | 89 GW/yr | +44% | 34 yr |
| Both | 2,071 GW | −20% | 98 GW/yr | +58% | 21 yr |

Two reforms that both raise delivery move the headline queue in **opposite
directions**. Culling speculative duplicates shrinks the queue; raising
throughput grows it, because shorter waits mean fewer withdrawals. Anyone
tracking queue size as a health metric will read one of these two successes as a
failure.

### What data centers need from that buildout

| Quantity | Value |
|---|---|
| 2030 US data-center average load at 27%/yr | 109 GW |
| Incremental vs. 2026 | 67 GW |
| Nameplate required (portfolio CF 0.45) | 149 GW |
| **Share of all achievable US additions through 2030** | **60%** |

---

## Bottom line versus the conventional wisdom

| Conventional wisdom | This model |
|---|---|
| "AI's volatile power demand is damaging data centers" | Real, and the **cooling plant** is where it bites (3.8 yr vs 20 yr design life) — not the batteries the framing leads with. The fix costs 0.78% of cost of ownership. |
| Volatility is a brake on the AI buildout | No. $9.36/MWh, bounded across the whole sensitivity grid, macro-invisible at the mitigated tax. Expect fast retrofit, not a slowdown. |
| "2,600 GW of generation is coming" | 62 GW/yr is coming. Queue depth is a rationing device, not a pipeline; the historical completion share overstates delivery 1.56×. |
| The grid is the binding constraint on AI | Yes — but as a **share-of-buildout** constraint: 60% of every US generator added through 2030 would have to serve data centers. |
| FERC/queue reform should shrink the queue | Only one of the two effective reforms shrinks it. Faster service *grows* the queue 18% while raising delivery 44%. |

The two stories point in opposite directions on where to worry. The one that got
the Bloomberg headline is a well-posed engineering problem with a cheap,
already-available fix. The one that got a research-report footnote is the
constraint that actually binds.

## Known limitations

- `campusCorrelation` and the cooling fatigue parameters are judgment
  calibrations, not measurements. The first drives the volatility tax roughly
  linearly; the second is neutralized by the mitigation cap (see the sensitivity
  grid).
- The queue model is a steady state. The actual queue is not in one — arrivals
  have grown sharply — so the implied-arrivals figure is an upper bound on the
  true stationary rate.
- `siteMultiplicity` (speculative multi-siting) is unpublished. It sets the size
  of the cull-duplicates reform, not its sign.
- The gensets in the Bloomberg headline are not modelled: they do not follow AI
  load in normal operation, so their wear channel is start-cycle driven and
  needs outage data the reporting does not give.
