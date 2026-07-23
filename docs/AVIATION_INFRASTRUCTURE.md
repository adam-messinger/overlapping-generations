# Aviation Infrastructure and Air-Taxi Traffic

This simulation forecasts U.S. traffic through five landing-facility channels:

- FBO-oriented endpoints at major airports
- Business-aviation airports and their FBOs
- Small runway airports
- Existing commercial helipads
- New vertiports

It combines a conventional business-jet, light-aircraft, and rotorcraft
baseline with passenger advanced air mobility (AAM). AAM can use vertical
takeoff and landing (VTOL), ultra-short takeoff and landing (STOL), or
conventional takeoff and landing (CTOL) aircraft. The forecast runs annually
from 2025 through 2050.

The model's primary quantity is an airport operation: one arrival or one
departure. An origin-to-destination flight therefore creates exactly two
facility operations. FBO-handled operations are a modeled service subset of
airport operations, not a synonym for them.

## Data and forecast iteration

The conventional baseline uses:

- The [FAA June 2026 Business Jet Report](https://www.aspm.faa.gov/apmd/sys/bjpdf/b-jet-202606.pdf)
  for 2016–2025 business-jet operations.
- The [FAA 2025 Terminal Area Forecast](https://www.faa.gov/data_research/aviation/taf)
  for fixed cohorts of major hubs, business-aviation-oriented airports, other
  runway airports, and Palo Alto Airport.
- The [FAA Aerospace Forecast FY 2026–2046](https://www.faa.gov/data_research/aviation/aerospace_forecasts/FY_2026-2046_Full_Forecast_Document_Tables.pdf)
  for conventional fleet and hours trends and the FAA's six-year
  unconstrained AAM scenario. The passenger benchmark uses Airport Shuttle
  plus Commuter Air Taxi departures and excludes the chart's cargo-feeder and
  medical departures.
- The FAA's [initial AAM infrastructure assumptions](https://www.faa.gov/airports/new_entrants/aam_infrastructure),
  which emphasize piloted aircraft and existing airports and heliports in the
  initial phase.

The source TAF ZIP is pinned in the model by SHA-256. FAA domestic and
international business-jet operations have separate measurement contracts.
The public international total is not treated as U.S. airport traffic:

```text
U.S. business-jet operations
  = domestic operations
  + international operations × assumed U.S.-endpoint share
```

The central case uses a 50% U.S.-endpoint share. This is explicit and
replaceable because the published headline also includes international
operations that do not cleanly map to U.S. facility visits.

Three iterations materially improved the first pass:

1. Segment-specific operation trends replaced the shortcut of treating FAA
   aircraft-hours growth as airport-operations growth. On eight frozen
   2023–2025 holdouts, mean absolute percentage error fell from 5.2% to 2.6%.
2. A naive continuation of the FAA's early unconstrained AAM curve produced
   28.9 million annual passenger flights in 2050. Adding fares, outside-mode choice,
   usable sites, fleet capacity, and market saturation reduced the central
   result to 14.8 million.
3. A sensitivity run found that one parameter was serving as both the count of
   usable sites and the normalization for network coverage. Separating those
   quantities removed the perverse result that adding sites could reduce
   demand.

The central VTOL fleet ramp differs by 13.1% on average from the FAA's
six-year fleet series. That is only a production-scale diagnostic: the FAA
fleet supports passenger, cargo, and medical use cases, while the modeled VTOL
fleet is passenger-only. Modeled passenger flights are 76.9% of the FAA's
unconstrained passenger-departure sequence on average because the simulation
also imposes passenger economics, outside options, sites, and competing
architectures. These are benchmarks against an FAA scenario, not an observed
AAM backtest.

## Mechanics

For each architecture, annual deliveries follow early and mature logistic
production ramps. Fleet evolves as:

```text
fleet(t) = fleet(t-1) × (1 - retirement rate) + deliveries(t)
```

Autonomy changes both crew cost and daily aircraft utilization. Fare per
passenger is:

```text
fare = [fixed flight cost + distance × variable cost + crew cost]
       × (1 + operator margin)
       / occupied seats
```

Passenger demand is divided among VTOL, STOL, CTOL, and an explicit outside
option. Architecture weights combine market suitability, fare acceptance, and
network coverage. Realized flights are bounded by all three relevant forces:

```text
actual flights = min(desired flights, fleet capacity, usable-site capacity)
```

Flight endpoints are then allocated to facility classes by architecture and
market. Conventional and AAM FBO capture are calculated separately.

## Scenarios

- `continuity`: no material passenger AAM.
- `slow-certification`: four-year certification delay, slower production and
  site rollout, lower demand, and no autonomy before 2050.
- `central-mixed`: 2029 VTOL/CTOL entry, 2031 STOL entry, and autonomy beginning
  in 2038.
- `autonomous-vtol`: early autonomy plus strong VTOL production, economics, and
  site rollout.
- `autonomous-runway`: early autonomy plus strong STOL/CTOL economics and
  airport networks.

These are conditional branches, not assigned probabilities.

## Central forecast

All traffic quantities below are millions of annual operations or flights.

| Year | AAM flights | Passenger trips | VTOL flight share | Major-airport AAM ops | Business-airport AAM ops | Small-airport AAM ops | Helipad AAM ops | Incremental FBO-handled ops |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2030 | 0.088 | 0.296 | 62.8% | 0.049 | 0.030 | 0.046 | 0.034 | 0.059 |
| 2035 | 1.717 | 7.999 | 22.7% | 0.694 | 0.866 | 1.505 | 0.251 | 1.496 |
| 2040 | 6.695 | 28.967 | 32.0% | 2.761 | 3.076 | 5.343 | 1.465 | 5.443 |
| 2045 | 12.079 | 51.003 | 37.4% | 4.523 | 5.209 | 9.330 | 3.280 | 9.332 |
| 2050 | 14.790 | 62.552 | 37.3% | 5.102 | 6.327 | 11.650 | 4.127 | 11.347 |

The central case first exceeds one million annual AAM flights in 2034 and ten
million in 2043. By 2050, runway-capable aircraft carry 62.7% of flights.

The conventional trend remains visible underneath AAM. The U.S.-facility
business-jet proxy rises from 4.94 million operations in 2025 to 6.66 million
in 2050; light fixed-wing operations edge down from 56.0 million to 54.6
million; conventional rotorcraft rises from 7.71 million to 10.91 million.

| 2050 facility channel | Conventional ops | AAM ops | Total ops | Conventional FBO-handled ops | AAM FBO-handled ops |
|---|---:|---:|---:|---:|---:|
| Major-airport FBO endpoints | 2.618m | 5.102m | 7.719m | 1.521m | 1.786m |
| Business-aviation airports | 12.866m | 6.327m | 19.193m | 8.291m | 4.113m |
| Small airports | 50.156m | 11.650m | 61.807m | 8.443m | 5.243m |
| Commercial helipads | 6.546m | 4.127m | 10.673m | 0.327m | 0.206m |
| New vertiports | 0 | 2.373m | 2.373m | 0 | 0 |

FBO capture is a commercial-channel assumption, not the same thing as landing
traffic. In particular, helipad and independent-vertiport charging or passenger
handling may accrue to their operators rather than a conventional FBO.

The facility result is not “VTOL or small airports.” The model produces a
mixed network. Major-airport FBOs benefit as gateway endpoints; business
aviation airports and small airports capture regional trips; helipads and new
vertiports capture the portion for which vertical access is worth its cost.

## Architecture uncertainty

| 2050 scenario | AAM flights | Passenger trips | VTOL share | Major-airport ops | Business-airport ops | Small-airport ops | Helipad ops | Incremental FBO ops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Slow certification | 6.661 | 29.233 | 30.6% | 2.256 | 3.052 | 5.755 | 1.450 | 5.436 |
| Central mixed | 14.790 | 62.552 | 37.3% | 5.102 | 6.327 | 11.650 | 4.127 | 11.347 |
| Autonomous VTOL | 19.449 | 75.715 | 52.1% | 6.661 | 7.719 | 13.476 | 6.767 | 13.751 |
| Autonomous runway | 18.005 | 80.996 | 24.5% | 6.284 | 8.734 | 15.594 | 3.387 | 15.063 |

Architecture matters most during network formation. In 2035, the successful
VTOL branch is 92.9% VTOL and produces 1.42 million helipad operations; the
successful runway branch is 95.8% runway aircraft and produces 3.04 million
small-airport operations. By 2050, multiple architectures coexist because the
large regional market rewards runway efficiency even in the VTOL-success
case.

The most robust result is therefore relative rather than absolute:

- Small and business-aviation airports have the broadest upside across
  successful architectures.
- Helipads have the most architecture-specific upside.
- Major-airport FBOs benefit in both successful branches because airport
  access is an endpoint market.
- New vertiports are not required for the initial market and have the highest
  greenfield-network risk.

## Sensitivity and research priorities

The one-lever-at-a-time scan is deliberately not probabilistic. Its wide
perturbations rank what matters to the forecast.

| Lever | 2040 low / central / high flights | 2050 low / central / high flights |
|---|---:|---:|
| Addressable passenger demand | 4.69 / 6.70 / 8.70m | 10.35 / 14.79 / 19.23m |
| Aircraft operating cost | 5.81 / 6.70 / 7.44m | 13.16 / 14.79 / 16.08m |
| Autonomy timing | 6.01 / 6.70 / 7.18m | 12.38 / 14.79 / 14.79m |
| Usable landing-site capacity | 5.82 / 6.70 / 7.27m | 12.98 / 14.79 / 14.83m |
| Certification and industrial timing | 5.00 / 6.70 / 7.14m | 14.71 / 14.79 / 14.81m |
| Aircraft production capacity | 6.45 / 6.70 / 6.70m | 14.79 / 14.79 / 14.79m |

Certification, production, and site rollout strongly affect the timing of the
market. Once the model reaches 2050, addressable demand and passenger economics
dominate its level. Autonomy matters because it changes both fare and aircraft
utilization, but early autonomy does not raise the central 2050 result further
once the relevant markets have saturated.

The highest-value evidence to gather next is therefore:

1. Paid passenger demand at observed route time savings and all-in fares.
2. Real operations per aircraft per day, dispatch reliability, and load
   factors from early commercial service.
3. The number of sites that are legally, physically, and commercially usable,
   rather than nominal airport or heliport counts.
4. Which party captures charging, passenger-handling, parking, and maintenance
   revenue at each facility class.

## Palo Alto illustration

The PAO overlay is intentionally a local scenario rather than a calibrated
route forecast. It assumes that Palo Alto attracts 0.25% of national
small-airport AAM operations and has a practical limit of 220,000 total annual
operations.

| Year | Conventional ops | AAM ops | Total ops | AAM share | Practical capacity use |
|---:|---:|---:|---:|---:|---:|
| 2030 | 153,144 | 115 | 153,259 | 0.1% | 69.7% |
| 2035 | 156,052 | 3,762 | 159,814 | 2.4% | 72.6% |
| 2040 | 159,020 | 13,356 | 172,376 | 7.7% | 78.4% |
| 2045 | 162,047 | 23,326 | 185,373 | 12.6% | 84.3% |
| 2050 | 165,136 | 29,126 | 194,262 | 15.0% | 88.3% |

This overlay is useful for capacity and investment questions, but the 0.25%
attraction share needs a route-choice and airport-catchment model before it
should be used for property underwriting.

## Run

```bash
npm run aviation:infrastructure
```

The aviation model is also registered as
`aviation-infrastructure-traffic` and included in `npm run sim:new`.

## Limitations

- There is no observed passenger AAM history to backtest. The AAM result is a
  transparent structural scenario.
- The model does not yet resolve routes, metropolitan catchments, noise
  restrictions, weather, airspace queues, electric interconnection delays, or
  facility-by-facility ownership.
- Endpoint shares and FBO capture rates are scenario judgments.
- The central case is not a probability-weighted forecast, and scenario ranges
  are not confidence intervals.
- Traffic is not revenue. An operation can create charging, maintenance,
  parking, passenger-handling, or no FBO revenue depending on the commercial
  arrangement.
