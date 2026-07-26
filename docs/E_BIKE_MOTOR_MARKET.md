# E-Bike Adoption and Motor-Supplier Market

This simulation asks two related questions:

1. How might complete e-bike market flow evolve in the United States, EU27 +
   UK, China, Japan, and the rest of the world?
2. If a U.S. company can build a very competitive motor, can it become a good
   drive-system business?

The second question is not answered from product quality alone. The model
separates motor performance from price, bicycle-OEM integration, batteries and
controls, certification, diagnostics, dealer service, warranty obligations,
supplier longevity, production capacity, and organizational burn.

Run the registered model and all decision diagnostics with:

```bash
npm run ebike:motors
```

## Measurement boundaries

There is no clean public global unit series with a common definition:

- The U.S. anchor is derived from [PeopleForBikes/Circana's estimate of about
  450,000 previously unmeasured 2024 direct-to-consumer new-bike
  transactions](https://www.peopleforbikes.org/news/e-bike-market-bigger-than-numbers-show).
  PeopleForBikes says the channel roughly doubled the previously visible new
  market, so the scenario uses a rounded 900,000 total. Approximately 80,000
  used-bike transactions are excluded.
- EU27 + UK uses [CONEBI retail sales](https://www.conebi.eu/pr-conebi-bimp-2024/).
- China uses the government's [42.28 million units of 2023 production by major
  enterprises](https://english.www.gov.cn/archive/statistics/202405/07/content_WS6639648fc6d0868f4e8e6cc3.html)
  as a production/demand proxy. It is not relabeled retail sell-through.
- Japan uses METI factory shipments cited in [Japanese Diet
  testimony](https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/000221320240412010.htm).
- Rest-of-world is a transparent scenario because no auditable aggregate
  series was found.

China's low-speed electric-bicycle boundary, European 250 W pedelecs, Japanese
power-assist bicycles, and the throttle-heavy U.S. direct channel are not
identical consumer products. The model aggregates them only as
one-drive-unit-per-complete-bike supply-demand equivalents.

The unit contracts preserve this distinction: complete bikes are `ebike`,
motors are `driveunit`, and qualified bicycle programs are `oemprogram`.
Regional source boundaries also have separate semantic measurement contracts.

## Adoption mechanics and backtest

For each region:

```text
annual market flow = replacement demand + new adoption

replacement demand = beginning installed stock / service life

new adoption
  = (innovation rate + imitation rate × current saturation)
    × remaining stock potential
```

Installed stock, population, saturation, and the hub/mid-drive mix evolve
annually. This prevents a temporary sales boom from compounding forever.

The frozen development/holdout exercise deliberately compares observations
only within their original source boundary:

| Holdout | Observed | Recent-growth extrapolation | Stock/replacement revision |
|---|---:|---:|---:|
| EU retail sales, 2022 | 5.500m | 6.063m | 5.182m |
| EU retail sales, 2023 | 5.100m | 7.353m | 5.501m |
| Japan factory shipments, 2022 | 0.790m | 0.976m | 0.861m |

Mean absolute percentage error falls from 26.0% to 7.6%. This is a sparse
shape validation, not strong evidence for the 2045 point estimates.

## Central regional path

Annual quantities below are millions of units in each region's stated market
boundary.

| Region | 2024 | 2030 | 2040 | 2045 |
|---|---:|---:|---:|---:|
| United States | 0.900 | 1.222 | 1.946 | 2.381 |
| EU27 + UK | 4.850 | 5.339 | 6.234 | 6.680 |
| China production/demand proxy | 42.280 | 43.118 | 43.277 | 42.986 |
| Japan factory shipments | 0.800 | 0.796 | 0.799 | 0.800 |
| Rest of world | 4.500 | 4.846 | 5.467 | 5.802 |
| **Drive-unit-equivalent total** | **53.330** | **55.321** | **57.723** | **58.648** |

The global headline grows slowly because China is already enormous and
replacement-heavy. The more economically relevant premium mid-drive pool
grows faster in the U.S., Europe, and rest of world.

## Supplier-volume estimates

[Bafang's 2024 annual report](https://www.100est.com/res/financial-report/r2024/SH603489_202504291664591346.pdf)
provides 857,442 hub motors, 167,839 mid-drives, and 1,899,594
integrated-wheel units, or 2,924,875 comparable units. [Ananda's public
filings](https://pdf.dfcfw.com/pdf/H2_AN202504291664487398_1.pdf) support a
constructed 7.2 million comparable target. The 2024 regional share allocation
reproduces these two targets with 1.3% mean absolute percentage error.

No equivalent Bosch, Shimano, Yamaha/Brose, Panasonic, or Avinox global unit
disclosure was found. Their values are inferred from regional market shares
and should be used as ranges, not precise company forecasts.

The user's “DJI” category is represented as Avinox. DJI launched the original
drive system; the company says Avinox became [operationally independent in
2025](https://www.bike-eu.com/52682/power-with-purpose-the-independent-strategy-of-avinox).
That independence statement comes from a sponsored company profile and is
treated as company evidence rather than independent validation.

| Supplier | Basis | 2024 central (indicative range) | 2040 central (indicative range) |
|---|---|---:|---:|
| Bosch | inferred | 2.56m (1.66–3.45m) | 2.75m (1.79–3.72m) |
| Shimano | inferred | 1.03m (0.62–1.45m) | 1.13m (0.68–1.59m) |
| Bafang | report-calibrated | 2.86m (2.71–3.00m) | 3.30m (3.14–3.47m) |
| Ananda | filing-calibrated | 7.21m (6.13–8.29m) | 8.06m (6.85–9.27m) |
| Yamaha / Brose | inferred | 1.21m (0.79–1.64m) | 1.46m (0.95–1.98m) |
| Panasonic | inferred | 0.82m (0.49–1.15m) | 0.65m (0.39–0.91m) |
| Avinox | inferred | 0.08m (0.04–0.11m) | 1.37m (0.69–2.06m) |
| Other Chinese / in-house | residual | 35.58m (28.46–42.69m) | 35.92m (28.73–43.10m) |
| Other premium systems | residual | 1.99m (1.29–2.68m) | 2.43m (1.58–3.28m) |
| U.S. entrant, full-stack scenario | scenario | 0 | 0.64m |

The ranges are judgmental identification bands, not confidence intervals.
Bafang is assigned ±5%, Ananda ±15%, undisclosed named suppliers ±35–50%, and
residual pools ±20–35%.

The structure of the premium business is better evidenced than its company
volumes. [Bosch's 2025 annual report](https://assets.bosch.com/media/global/bosch_group/our_figures/pdf/bosch-annual-report-2025.pdf)
describes drive units, batteries, ABS, displays, digital services, diagnostics,
and a service network of more than 30,000 European specialist dealers.
[UL 2849](https://www.ul.com/services/e-bikes-certificationevaluating-and-testing-ul-2849)
evaluates the combined electrical system, not a standalone motor. Avinox said
in April 2026 that it was working with [more than 60 OEM
brands](https://www.prnewswire.com/news-releases/e-bike-innovator-avinox-powers-the-next-generation-of-electric-bikes-with-the-launch-of-the-avinox-m2s-and-avinox-m2-with-60-leading-bike-brands-302736477.html).
Yamaha's acquisition of the [Brose e-Kit
business](https://www.yamaha-motor.eu/mk/mk/news/2025/Yamaha_Motor_acquires_Brose-s_bicycle_eKit_business_unit/)
adds European production, development, and after-sales capacity.

## Entrant cases

All financial values are real 2026 dollars. Enterprise NPV uses a 12% discount
rate, explicit cash flow through 2045, and a 2% terminal-growth value. It is a
modeled operating-company value before taxes, working capital, financing,
dilution, or an acquisition premium.

| Entrant case | 2045 units | 2045 revenue | 2045 operating margin | Operating breakeven | Cash payback | Peak full-horizon funding | Enterprise NPV |
|---|---:|---:|---:|---:|---:|---:|---:|
| Excellent motor, thin commercial layer | 0.150m | $58.5m | -22.0% | none | none | $540m | -$255m |
| Competitive full-stack mid-drive | 0.650m | $273.0m | 22.5% | 2033 | 2042 | $412m | -$136m |
| Avinox-like product and commercial breakthrough | 1.422m | $639.9m | 39.2% | 2030 | 2034 | $481m | +$417m |
| Localized commodity hub motor | 0.328m | $31.1m | -106.2% | none | none | $780m | -$310m |

“Peak full-horizon funding” assumes the scenario continues to be funded
through 2045 even when it is clearly unviable. It is not a claim that rational
investors would supply that capital; the company would normally shut down or
restructure earlier.

The model therefore says:

- A very good motor can win product reviews without creating a good company.
- A credible full system can become a real $250–300 million industrial
  supplier, but the central greenfield build is too slow and capital-intensive
  to clear a 12% hurdle rate.
- The venture-scale outcome requires a true breakthrough in product,
  OEM-acquisition speed, unit economics, and production—not merely U.S.
  localization.
- A commodity hub-motor strategy is unattractive at the modeled $95 selling
  price. The market is large, but gross dollars per unit are too small to
  support a U.S. engineering, qualification, and service organization.

## Geography is decisive

The U.S. company cannot be a U.S.-only company at the modeled cost structure:

| Contestable geography | 2045 units | 2045 revenue | 2045 operating margin | Cash payback by 2045? |
|---|---:|---:|---:|---:|
| U.S. only | 0.093m | $39.1m | -122.3% | No |
| U.S. + Europe | 0.593m | $249.2m | 20.1% | No |
| U.S. + Europe + rest of world | 0.650m | $273.0m | 22.5% | 2043 |
| All modeled regions | 0.650m | $273.0m | 22.5% | 2042 |

In the central 2045 full-stack case, 459,000 of 650,000 units go to Europe,
86,000 to the U.S., 94,000 to rest-of-world, and only about 11,000 combined to
China and Japan. Europe is the launch market that makes the company; the U.S.
is an important beachhead, not enough scale by itself. China adds volume to the
global industry but is mostly a closed, low-cost hub-drive market for this
entrant. Japan is similarly difficult because of incumbent relationships and
its distinct regulated system.

## What separates a good company from a merely viable one

The most important modeled sensitivities are:

1. Reaching at least roughly 600,000 units of justified capacity.
2. Preserving system selling price, manufacturing cost, warranty, and
   installed-base service economics.
3. Winning more than an 8% share of the contestable premium pool.
4. Qualifying roughly two to three meaningful OEM programs per year.
5. Keeping fixed R&D, commercial, service-network, G&A, and OEM-engineering
   cost below the central greenfield plan.

Adding OEM logos beyond the capacity and demand needed for about 650,000 units
has diminishing returns and can increase engineering expense. A compact
decision grid finds capital-efficient outcomes when:

- the company wins at least two meaningful OEM programs per year while fixed
  operating cost is about 50% of the central build; or
- it wins at least three programs per year while holding fixed cost near 70%
  of the central build.

For example, three OEM wins per year at 70% of central fixed cost produce
modeled cash payback in 2038, peak funding around $261 million, and enterprise
NPV around +$30 million. Two wins at that burn rate remain slightly
value-negative; two wins work at the 50% cost level. This suggests partnership,
contract manufacturing, licensing, a focused initial product family, or an
incumbent strategic investor could matter more than squeezing a little more
torque or weight from an already competitive motor.

## What to diligence next

The model changes the investment question from “is the motor good?” to a short
list of falsifiable commercial questions:

1. Which signed OEM programs can reach 15,000–30,000 annual units, in which
   model year, and with what cancellation rights?
2. Is the offer a motor, or a certifiable battery/controller/display/software
   system with tools for bicycle engineering teams?
3. What dealer coverage and spare-parts promise will European OEMs accept from
   a new U.S. supplier?
4. What are the fully burdened selling price, variable cost, warranty reserve,
   and annual support cost per active installed drive?
5. Can production reach 300,000 units without building the whole 650,000-unit
   organization in advance?
6. Does the company have a differentiated U.S. cargo/utility wedge that also
   travels into Europe, or is it competing directly with Bosch/Avinox in
   performance e-MTB?

The first data request should be an OEM pipeline by program, launch year,
expected bicycle volume, architecture, geography, qualification stage, and
binding commercial commitment. That evidence resolves the highest-value model
uncertainty faster than another top-down e-bike market report.

## Limitations

- Only three regional observations are genuine frozen holdouts.
- The China figure is production, not consumer sell-through.
- Supplier totals other than Bafang and Ananda are inferred, and architecture
  shares by supplier are not separately observed.
- The entrant scenarios do not model taxes, working capital, financing,
  dilution, subsidies, tariffs by component classification, licensing revenue,
  battery/display revenue, retrofit motors, acquisitions, or bankruptcy.
- OEM wins are represented as annual cohorts, not individual contracts.
- Capacity is now demand- and qualification-gated after a first-pass retro
  found that mechanical factory expansion irrationally overbuilt the hub case.
- Installed-base service cost is explicit, but dealer economics, spare-parts
  inventory, software operations, and recall tail risk are still simplified.
