# News stress tests, 2026-08-11

| Headline | Estimand | Mechanism |
|---|---|---|
| "Markets are heading into US CPI with inflation anxiety back in the driving seat, as Brent's four-day surge forces investors to rethink last week's post-payrolls relief" | July CPI m/m, released 2026-08-12 08:30 ET | Crude → pump pass-through → CPI weights |
| DC National Guard deployment extended to Inauguration Day 2029, "expected to cost in the billions" | Benefit-cost ratio and break-even crime effect | Measured effects × social cost of crime vs. run rate |

Run with `npm run news:2026-08-11`. Models in
`src/simulations/news/headline-experiments-2026-08-11.ts`, tests alongside.

**The first model makes a forecast that resolves the morning after it was
written.** It is recorded here before the print so it can be scored, not
rationalised.

---

## 1. What an oil surge can and cannot do to a CPI print

### The claim in the news

Brent closed on $88 on Tuesday, up from ~$83 at the end of last week — a fourth
straight session of gains as Iran rejected direct talks and the Hormuz reopening
stalled. The market read: inflation anxiety is back, rate-cut bets get trimmed,
and "oil near $88/bbl makes it much harder for policymakers to sound
comfortable" going into Wednesday's July CPI.

### V1: the arithmetic behind the commentary

| Step | Value |
|---|---|
| Brent, four sessions ($83 → $88) | +6.02% |
| Passed straight through to the pump | +6.02% |
| Contribution to headline | +0.22pp |
| Implied July print | **+0.42%** vs 0.2% consensus |

Three things are wrong with it, and they compound: it reads an **August spot
move into a July reference period**, it passes crude through **contemporaneously
and symmetrically**, and it ignores where the pump currently sits relative to
crude.

### The crude path the print actually sits on

| Month | Brent | Crude-implied pump | Actual pump | Margin overhang |
|---|---|---|---|---|
| 2026-04 | $117.29 | $4.543 | $4.350 | −$0.193 |
| 2026-05 | $103.94 | $4.225 | $4.485 | +$0.260 |
| 2026-06 | $84.42 | $3.760 | $4.050 | +$0.290 |
| 2026-07 | $79.99 | $3.655 | $3.930 | **+$0.275** |

Brent averaged **$79.99 in July, down 5.2% from June**. The pump followed it
down. The war's April peak has been unwinding for three months, and retail is
still carrying a 27.5-cent margin overhang from the descent.

### Pass-through model

An error-correction model on monthly averages:

```
dRetail = beta * dTarget + alpha * (target[t-1] - retail[t-1])
target  = taxAndMarginWedge + Brent / 42
```

Rockets and feathers (Bacon 1991; Borenstein–Cameron–Gilbert 1997) enters
through two asymmetries that key on **different things**, which is the piece the
first draft of this model got wrong:

- `beta` keys on the direction of the **cost shock** — increases pass through
  fast (0.9), decreases slowly (0.6);
- `alpha` keys on the direction the **pump has to move** to close the gap —
  margins expand quickly (0.5) and compress slowly (0.196).

Keying `alpha` on the crude direction instead makes a rising crude price *pull
the pump down* whenever margins are fat, which is backwards. `alphaDown` is the
single free parameter, pinned to the observed June→July move; everything else is
a literature value.

### Validation on the June print

Rather than guessing the non-gasoline energy components, back them out of the
two numbers BLS published (gasoline −9.7%, energy −5.7%): **−1.59% m/m**.

| Weights | Reconstructed | Reported | Error |
|---|---|---|---|
| Base period (energy 6.4%) | −0.36% | −0.4% | 0.035pp |
| Price-drift adjusted (energy 7.3%) | −0.42% | −0.4% | 0.016pp |

Both round to the reported −0.4%. The drift markup — energy's relative
importance rises with its own price, and at $4/gal gasoline carries ~3.7% of the
index rather than its ~3.1% base-period share — is a genuine refinement but it
is **not** what rescues the reconstruction. Backing out non-gasoline energy from
the release is. An earlier version of this model guessed those components and
missed the June print by 0.10pp; that error is the reason the July forecast is
stated with a band.

### The forecast

| Component | Change | Contribution |
|---|---|---|
| Gasoline (3.7%) | −2.46% | −0.09pp |
| Energy total (7.3%) | −1.07% | **−0.08pp** |
| Food (13.6%) | +0.15% | +0.02pp |
| Core (consensus input) | +0.20% | +0.16pp |

| Measure | Model | Rounded | Consensus | Surprise |
|---|---|---|---|---|
| Headline m/m | +0.10% | **0.1%** | 0.2% | −0.10pp |
| Headline y/y | 3.30% | **3.3%** | 3.4% | −0.10pp |

Band from sweeping the gasoline seasonal factor and the Cleveland Fed core
nowcast: **−0.02% to +0.15%** — the whole band sits below consensus.

The model has nothing to say about core and takes the consensus 0.2% as an
input; the entire call is the energy block. If core surprises, the forecast is
wrong for a reason the model never claimed to cover.

### Where the surge does land

| Scenario | August Brent | Modelled pump | Pump change | Headline contribution |
|---|---|---|---|---|
| Hormuz route agreed | $78.0 | $3.848 | −2.10% | −0.08pp |
| Stalemate holds | $85.5 | $3.994 | **+1.63%** | +0.06pp |
| Talks collapse | $100.0 | $4.305 | +9.54% | +0.35pp |
| Full closure | $115.0 | $4.626 | +17.72% | +0.66pp |

At the level that has the market nervous, crude up ~7% moves the pump **1.6%**
in the first month, because the fat post-collapse margin absorbs most of it.
Only an actual escalation puts a visible number on a monthly print.

### The base effect nobody is pricing

Hold Brent at the August average and roll the y/y window forward over the war
months:

| Month | Year-ago pump | Projected pump | Gasoline y/y | Shift vs. June |
|---|---|---|---|---|
| 2027-04 | $4.350 | $3.786 | −13.0% | −1.47pp |
| 2027-05 | $4.485 | $3.786 | **−15.6%** | **−1.56pp** |
| 2027-06 | $4.050 | $3.786 | −6.5% | −1.23pp |
| 2027-07 | $3.930 | $3.786 | −3.7% | −1.14pp |

Energy currently contributes about **+1.1pp of the 3.5% headline y/y** (energy
+15.7%, gasoline +26.7%). Headline inflation ex-energy is running around 2.4%.
Unless oil goes back to $100+, that contribution mechanically reverses and takes
**up to 1.6pp off headline y/y by spring 2027**. The war's oil spike is a future
*disinflationary* base effect.

---

## 2. What the DC National Guard deployment buys

### The claim in the news

~5,000 troops from more than 20 states, extended to Inauguration Day 2029. CBO
puts the run rate above $3M/day; POGO the total at $2.5–3.4B; other researchers
say the full programme heads toward $4B. Two evaluations found "little to no
effect on violent crime." The Niskanen Center evaluation found something the
headlines mostly dropped: a **24% cut in property crime**, with no measurable
effect on violent crime, homicides or gun crimes.

| Quantity | Value |
|---|---|
| CBO run rate | $3.0M/day |
| Annualized | $1.09B/yr |
| Remaining to Inauguration Day 2029 | $2.67B |
| POGO published range | $2.50B – $3.40B |

The bottom-up run rate lands inside the published range, so the cost side is not
in dispute.

### V1: cost per averted offence

6,480 property offences averted per year → **$169k per offence**, and the same
money would fund 6,083 officers, 1.93× MPD's entire sworn strength. Both figures
circulate. Both are misleading: the first divides the whole bill by the one
effect that happened to be measured, and the second treats the money as
instantly convertible into police.

### V2: monetize every measured effect, then invert

| Line | Value |
|---|---|
| Property crime, −24% (measured) | $35.6M/yr |
| Violent crime, no measured effect | $0/yr |
| Homicide, no measured effect | $0/yr |
| **Total benefit vs. cost** | **$35.6M vs $1.09B — ratio 0.033** |

The interesting part is the inversion:

| Break-even | Required | Versus |
|---|---|---|
| Property offences averted per year | 199,091 | **7.4× the District's entire annual count** |
| Homicides averted per year | 100 | **62% of all DC homicides** |

This is stronger than "it didn't work." **No attainable property-crime effect
can justify this budget** — the entire annual stock of property offences in the
District is worth about a seventh of one year of the deployment. The ceiling
binds before the effect size does. The programme could only clear its cost
through violent crime, which is the one place it has no measured effect.

### The opportunity-cost comparison, corrected

| Version | Officers | Force increase | Homicides averted | Valid? |
|---|---|---|---|---|
| Unconstrained (the version that circulates) | 6,083 | +193% | 108 | **OUT OF SAMPLE** |
| Constrained by what MPD can recruit | 366 | +12% | 6.5 | in range |

Two corrections, and the second is the one that matters:

1. The quasi-experimental police elasticities are estimated over force changes
   of a few percent. Extrapolating one to a 193% increase to claim 108 averted
   homicides is not a forecast, and the model flags it rather than printing it
   bare.
2. **A constant elasticity makes the return per dollar identical at any scale.**
   So the hiring constraint does not change what a police dollar buys — it
   changes how many dollars can buy it. MPD has shed officers for a decade and
   nets on the order of 150/year, so only **2.5% of this budget** is redeployable
   into policing, leaving **$2.61B with no identified higher-return use**.

Return per dollar of police spending is **1.28** against **0.033** for the
deployment — a factor of ~39. The "just hire officers instead" comparison is
arithmetically right and operationally unavailable, and the remainder has to be
argued on its own merits rather than by pointing at MPD.

### Sensitivity

| Value per homicide | Break-even homicides | Share of DC homicides | Police benefit-cost ratio |
|---|---|---|---|
| $6.0M | 183 | 114% | 0.78 |
| $11.0M | 100 | 62% | 1.28 |
| $20.0M | 55 | 34% | 2.17 |

The homicide valuation is the parameter that moves the police comparison across
break-even. It does not rescue the deployment at any value in the range: even at
$20M per homicide the deployment would need to prevent a third of all killings
in the city, against a measured effect of zero.

---

## Bottom line versus the conventional wisdom

| Conventional wisdom | This model |
|---|---|
| "Inflation anxiety back in the driving seat" ahead of CPI | The July print carries an energy **drag** of −0.08pp. Forecast **+0.10% m/m, 3.3% y/y** against 0.2%/3.4% consensus. |
| "Brent's four-day surge forces investors to rethink" | The surge is an August event and cannot enter a July reference period. It is being priced into the wrong number. |
| Oil at $88 makes the Fed less comfortable | At that level the pump rises 1.6% in August — a fat post-collapse margin absorbs most of it. Only a real escalation registers. |
| The war means sustained inflation pressure | Opposite sign by spring. Base effects take up to **1.6pp off headline y/y** by May 2027 if oil merely stays where it is. |
| Guard deployment: "no effect on crime" | Understates it — there is a real, measured 24% property-crime effect worth $35.6M/yr. |
| Guard deployment: "cost in the billions" | $1.09B/yr, ratio **0.033**. And no attainable property-crime effect could clear it: break-even needs 7.4× the District's entire annual count. |
| That money should fund police instead | Right on return (39× better per dollar), wrong on scale — only 2.5% is redeployable at MPD's actual hiring rate. |

## Known limitations

- The CPI forecast takes consensus core as an input and forecasts only energy.
  A core surprise breaks it for a reason outside the model.
- May 2026 retail gasoline is reconstructed from the June CPI gasoline index
  rather than observed, so the April–May margin path is derived.
- The gasoline seasonal factor (+0.5pp NSA→SA) is a judgment value; it is swept
  in the band and is worth about 0.02pp on the headline.
- `alphaDown` is fitted to a single monthly observation. It carries the August
  scenarios, which should be read as ordinal rather than precise.
- DC offence counts and the social cost per offence are order-of-magnitude
  literature values. They do not need to be precise: the break-even results hold
  by more than an order of magnitude.
- The police elasticity is a single mid-range point estimate applied linearly.
  The model flags out-of-sample extrapolation but does not model diminishing
  returns, which would make the constrained comparison better and the
  unconstrained one worse.
