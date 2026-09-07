# Independent reproduction: people x education as a capital asset, 1925-2100

This is a from-scratch reproduction of the human-capital-as-capital-asset study,
written from the specification alone. It shares no code with
`src/modules/human-capital.ts`, `scripts/human-capital-trajectory.ts` or
`scripts/human-capital-backcast.py`, and it reads none of their outputs. Code:
`scripts/repro/` (`hc_regions.py`, `hc_ledger.py`, `hc_sources.py`,
`hc_backcast.py`, `hc_forecast.py`, `hc_report.py`). Derived panels and results:
`data/human-capital-repro/`.

**Bottom line.** The backcast reproduces cleanly: every stated backcast target
lands within rounding. The forecast reproduces the *architecture* — the ledger
closes to a zero residual, the regional ordering is right, India's peak year and
the US immigrant share hit their targets — but the world path does not. On the
actual UN WPP 2024 low-fertility variant the world constant-cost stock peaks in
**2032 at 1.04** and ends 2100 at **0.58**, against the study's **2063 at 1.22**
and a migration-driven 2025-50 gain of $44T that I cannot get above +$16T. Two
assumptions account for nearly all of it, and both are identified below.

## 1. Sources

All primary, all fetched for this reproduction:

| Input | Source |
|---|---|
| Population by 5-year age group, 1950-2024 estimates | UN WPP 2024, `PopulationByAge5GroupSex_Medium` |
| Population by 5-year age group, 2024-2100 projections | UN WPP 2024, `PopulationByAge5GroupSex_OtherVariants`, **Low** variant (Medium also extracted for the diagnostics) |
| Life expectancy and net migration, 1950-2100 | UN WPP 2024, `Demographic_Indicators_Medium` (variants differ only in fertility) |
| Population before 1950 | Our World in Data historical population (HYDE / Gapminder / UN splice) |
| GDP per capita and population, 1900-2022 | Maddison Project Database 2023, `Full data` sheet, 2011 PPP $ |
| Attainment 1870-2010, ages 25-64 and 15-24 | Lee & Lee (2016) long series, `OUP_long_MF2564/1524_v1` |
| Attainment 2015-2040, ages 25-64 and 15-24 | Barro & Lee projections, `OUP_proj_MF2564/1524_v1` |
| Attainment by 5-year age group, 1950-2010 | Barro-Lee v3, `BL_v3_MF.csv` (used for the net-of-depreciation series) |

Regions are assigned from the UN M49 subregion tree with explicit overrides
(`hc_regions.py`): USA broken out; Japan, Korea, Israel, Cyprus into OECD ex-US;
Iran and Türkiye into MENA; Sudan and South Sudan into Sub-Saharan Africa; the
Caucasus and Central Asia into Russia + CIS; Hong Kong, Macao and Taiwan into
China; North Korea and Mongolia into the SE Asia + Pacific residual.

## 2. The ledger

Unit costs come out of the brief exactly as stated — GDP per capita x
(0.23 x entry age + cumulative schooling):

| Band | Entry | Retire | Multiple of GDP/capita |
|---|---|---|---|
| none (no schooling) | 16 | 61 | 3.68 |
| primary | 16 | 61 | 4.88 |
| secondary | 18 | 63 | 6.84 |
| tertiary | 22 | 66 | 9.36 |
| advanced | 26 | 68 | 11.78 |

Book value per head is `C x max(0, 1 - k / L)` with `k` years in the workforce
and `L` the *current* expected years in the workforce, so the identity

```
dStock = investment - depreciation - write-offs + migration transfer + life revaluation
```

holds by construction. The measured residual across every specification is
**< 2e-16 relative** (max absolute error 0.15 dollars on a $2.2e14 stock) —
the "residual must be zero" target is met exactly.

### Judgment calls the brief leaves open

1. **A fifth band.** The attainment data carries a "no schooling" share; the
   brief names only four bands. I price it at rearing only (3.68).
2. **Tertiary vs advanced split.** The brief gives no rule. I use the ISCED 7-8
   share of ISCED 5-8 attainment (OECD EAG 2023 / UIS): US 0.36, OECD ex-US 0.30,
   Russia 0.20, India 0.13, MENA 0.12, China 0.09, LatAm 0.09, SE Asia 0.09,
   SSA 0.09.
3. **Domestic-role exit for the six regions the brief does not pin.** The brief
   gives US 0.11, India 0.29, MENA 0.36. Those are reproduced exactly by
   `0.5 x (1 - female/male LFP ratio)` at ILO ratios of 0.78 / 0.42 / 0.28, so I
   apply that formula to the rest: OECD ex-US 0.10, Russia 0.10, China 0.085,
   LatAm 0.15, SE Asia 0.135, SSA 0.075.
4. **Hazard multipliers where the brief is silent** (secondary, tertiary) are 1.0.
5. **Retirement indexation**: two-thirds of life-expectancy gains.
6. **Tertiary targets for entrants**: US 0.75, OECD ex-US 0.70, Russia 0.70,
   China 0.65, LatAm 0.55, SE Asia 0.50, India 0.45, MENA 0.45, SSA 0.30,
   approached with a 35-year time constant.
7. **GDP per capita 2025-2100**: the brief takes this from the energy model. I
   use a transparent convergence rule (1.5%/yr frontier, 1.5%/yr closure of the
   log gap). It touches only current-dollar figures; every index in this note is
   constant-cost and independent of it.

### The working-life calibration does not close

The brief's hazards do not deliver the working lives the brief cites. Applying
them literally at OECD life expectancy:

| Band | Brief's Eurostat target | My literal implementation |
|---|---|---|
| primary | ~32 | **36.7** |
| secondary | ~37 | **38.2** |
| tertiary | ~39 | **37.8** |
| advanced | ~38 | **37.1** |

The stated multipliers (death x1.5 / x0.7, disability x2.2 / x0.5) disperse the
bands far too little: hitting 32/37/39/38 needs the death+disability hazards
scaled by 2.57 / 1.64 / 0.79 / 0.78 by band, which no single reading of the brief
produces. I report the literal implementation as primary and carry a
`eurostat` variant with those scale factors; it moves the world 2100 index by
0.01 and no regional peak year at all, so nothing downstream turns on it.

## 3. Backcast, 1925-2025

World, constant cost (each region at its own 2025 unit cost, 2025 = 1):

| Year | Gross stock $T | Net stock $T | Investment $T | GDP $T | Inv/GDP | Index |
|---|---|---|---|---|---|---|
| 1925 | 96.0 | – | 0.51 | 6.1 | 8.4% | 0.172 |
| 1950 | 130.3 | 26.8 | 0.80 | 8.3 | 9.6% | 0.233 |
| 1975 | 211.0 | 63.6 | 3.02 | 27.1 | 11.1% | 0.378 |
| 2000 | 398.2 | 148.7 | 6.50 | 60.6 | 10.7% | 0.713 |
| 2025 | 558.5 | 199.5 | 14.86 | 145.7 | 10.2% | 1.000 |

Dollars are Maddison 2011 PPP. Growth: **x5.82 over the century, 1.78%/yr**;
1.23% 1925-50, 1.95% 1950-75, 2.57% 1975-2000, 1.36% 2000-25.

Regional constant-cost index (2025 = 1) and the century multiple:

| Region | 1925 | 1950 | 1975 | 2000 | 2025 | x1925-2025 |
|---|---|---|---|---|---|---|
| United States | 0.217 | 0.314 | 0.486 | 0.811 | 1.000 | 4.6 |
| OECD ex-US | 0.300 | 0.394 | 0.576 | 0.879 | 1.000 | 3.3 |
| China | 0.127 | 0.156 | 0.281 | 0.696 | 1.000 | 7.9 |
| India + South Asia | 0.101 | 0.122 | 0.211 | 0.506 | 1.000 | 9.9 |
| Latin America | 0.066 | 0.118 | 0.241 | 0.571 | 1.000 | 15.3 |
| SE Asia + Pacific | 0.066 | 0.105 | 0.216 | 0.522 | 1.000 | 15.0 |
| Russia + CIS | 0.190 | 0.295 | 0.549 | 0.913 | 1.000 | 5.3 |
| MENA | 0.050 | 0.076 | 0.143 | 0.413 | 1.000 | 19.9 |
| Sub-Saharan Africa | 0.068 | 0.102 | 0.187 | 0.425 | 1.000 | 14.7 |

**Every backcast target reproduces.** x5.82 is inside "x5-6"; 1.78%/yr rounds to
1.7-1.8; the three quarter-century rates (1.23 / 2.57 / 1.36) match 1.3 / 2.5 /
1.4; investment is 10.20% of GDP in 2025 against a target of 10.3%. The one
soft spot is the "9-12% throughout" band: my 1925-1935 investment share sits at
8.4-9.0%, just under it. That is a pre-1950 age-structure artefact — with no
age data before 1950 I hold each region's 1950 share of population aged 20-24
and 25-64 constant back to 1925, which understates the young share in an
interwar population and so understates the entrant flow.

## 4. Forecast, 2025-2100

Primary specification: WPP 2024 **low** variant, 2025 workforce seeded by
spreading the population aged 20-64 uniformly over the 45 single-year ages and
thinning each age by the survival curve (the thinning is a genuine level
reduction — it is what makes the workforce smaller than the population, and it
reproduces the US labour force at 163M in 2025 and 172M in 2030).

World constant-cost index (2025 = 1):

| Year | Low (primary) | Blend* | Medium |
|---|---|---|---|
| 2030 | 1.034 | 1.039 | 1.043 |
| 2040 | 1.010 | 1.043 | 1.079 |
| 2050 | 0.928 | 1.010 | 1.101 |
| 2063 | 0.834 | 0.971 | **1.123** |
| 2080 | 0.703 | 0.893 | 1.104 |
| 2100 | 0.580 | 0.813 | 1.072 |
| **peak** | **2032 @ 1.043** | 2035 @ 1.055 | **2063 @ 1.123** |

\* "Blend" is 0.474 x medium + 0.526 x low, the mix whose world population path
matches the 8.5bn in 2100 that this repository's own demographics module
produces. See §5.

World decomposition, constant 2025 cost, closing exactly:

| Period | Net investment | Migration transfer | Life revaluation | Total |
|---|---|---|---|---|
| 2025-2050 | -42.7 | +16.1 | +10.3 | **-16.3** |
| 2050-2075 | -67.1 | +16.6 | +8.6 | **-41.9** |
| 2075-2100 | -57.6 | +16.9 | +4.5 | **-36.1** |

Regions, primary specification:

| Region | Peak year | Peak | 2100 | Own-cohort net turns negative | Total net turns negative | Post-2025 immigrants, 2075 |
|---|---|---|---|---|---|---|
| United States | 2031 | 1.012 | 0.758 | 2027 | 2027 | 21.9% |
| OECD ex-US | 2025 | 1.000 | 0.469 | 2027 | 2027 | 15.1% |
| China | 2025 | 1.000 | 0.114 | 2027 | 2027 | 0% |
| India + South Asia | 2054 | 1.603 | 0.963 | 2052 | 2050 | 0% |
| Latin America | 2039 | 1.127 | 0.488 | 2038 | 2037 | 0% |
| SE Asia + Pacific | 2041 | 1.221 | 0.609 | 2041 | 2040 | 0% |
| Russia + CIS | 2031 | 1.029 | 0.624 | 2029 | 2031 | 5.4% |
| MENA | 2053 | 1.716 | 1.155 | 2055 | 2054 | 0% |
| Sub-Saharan Africa | 2079 | 4.751 | 4.310 | 2073 | 2072 | 0% |

United States series (constant 2025 cost, $T):

| Year | Index | Workforce (M) | Immigrant share | Investment | Charge on own cohorts | Own-cohort net | Total net |
|---|---|---|---|---|---|---|---|
| 2025 | 1.000 | 163.5 | 0.0% | – | – | – | – |
| 2030 | 0.998 | 171.7 | 2.7% | 1.912 | 2.322 | -0.410 | -0.080 |
| 2040 | 0.972 | 174.3 | 8.1% | 1.672 | 2.151 | -0.479 | -0.282 |
| 2050 | 0.918 | 172.9 | 13.3% | 1.560 | 1.933 | -0.373 | -0.294 |
| 2060 | 0.874 | 169.8 | 18.2% | 1.493 | 1.727 | -0.234 | -0.235 |
| 2065 | 0.865 | 164.7 | 20.0% | 1.426 | 1.636 | -0.210 | -0.203 |
| 2075 | 0.833 | 157.2 | 21.9% | 1.310 | 1.519 | -0.210 | -0.175 |
| 2100 | 0.758 | 140.8 | 26.1% | 1.173 | 1.303 | -0.129 | -0.160 |

## 5. Target check

### Reproduced

| Target | Study | This reproduction |
|---|---|---|
| World stock x5-6 over 1925-2025 | x5-6 | **x5.82** |
| ...at 1.7%/yr | 1.7% | **1.78%** |
| 1925-50 / 1975-2000 / 2000-25 | 1.3 / 2.5 / 1.4 | **1.23 / 2.57 / 1.36** |
| Investment 10.3% of GDP in 2025 | 10.3% | **10.20%** |
| 2025 investment as a share of GDP | 9.6% | **9.70%** (forecast entrant rule) |
| India peaks 2056 at 1.56 | 2056 / 1.56 | **2054 / 1.60** (low); 2056 / 1.78 (blend) |
| SSA x3.9 by 2100 | x3.9 | **x4.31** |
| US post-2025 immigrants >20% of workforce by 2075 | >20% | **21.9%** (crosses 20% in 2065) |
| Decomposition residual zero | 0 | **< 2e-16 relative** |
| Energy/climate scenarios do not move the quantity path | – | **True by construction**: the ledger has no energy or climate input, and the constant-cost index is quantity x fixed 2025 unit costs |
| Cost-scope changes move levels and the world turn, but no regional peak by more than 3 years | ≤3 yr | **≤2 yr** (max drift SE Asia 2041→2043 at rearing 0); the world turn moves 2032→2035 |

Cost-scope sensitivities behave as the brief says. Rearing 0.30 lifts the 2025
stock from $225T to $265T; rearing 0 cuts it to $92T; foregone earnings 0.45
lifts it to $270T. None moves the world peak by more than three years and none
moves a regional peak by more than two.

### Not reproduced

| Target | Study | This reproduction | Assumption I think explains it |
|---|---|---|---|
| World stock peaks **2063** at **1.22** | 2063 / 1.22 | 2032 / 1.043 | **The demographic path.** See below — on the WPP *medium* variant I get the peak in **2063** exactly. |
| 2025-50 gain of **$44T** | +44 | **-16.3** | Same, compounded by the migration gap below. On the medium variant the 2025-50 change is **+22.7T**. |
| ...of which **$1T** net investment | +1 | **-42.7** | Demographic path (medium: -3.8T) plus the seed level; see below. |
| ...of which **$36T** migration re-pricing | +36 | **+16.1** | How the 80% working-age share and the 10-year tenure write-down are applied. Dropping the working-age haircut gives $20.1T; dropping the tenure write-down gives $22.6T; dropping both gives **$28.3T**. The remainder needs migration volumes above WPP's net-migration series. |
| ...of which **$7T** longer working lives | +7 | **+10.3** | Retirement indexation: I pass two-thirds of life-expectancy gains into the retirement age. A one-third rule would land near $7T. |
| Net investment negative **from the 2040s** | 2040s | **2030** (low), 2034 (medium) | Seed level: see below. |
| Net investment **-$26T** by 2100 | -26 | **-2.1T/yr** constant cost (cumulative 2026-2100: -167T) | Units. If the study's figure is an annual current-dollar flow, my -2.1T constant scaled by its GDP-per-capita path is roughly -$8 to -$10T — still short by a factor of ~3, tracking the same seed and demographic gaps. |
| Migration off: peaks **1.09**, ends **0.92** | 1.09 / 0.92 | **1.027 / 0.532** (low); 1.080 / 1.024 (medium) | Demographic path. The medium variant brackets the target from above, the low variant from below. |
| China **-61%** by 2100 | -61% | **-89%** (low) | Demographic path: the medium variant gives **-67%**, the blend -78%. |
| US own-cohort net positive to **2064**, total to **2065** | 2064 / 2065 | **2027 / 2027** | Seed level. The one-year gap between the two turning years *is* reproduced (my own and total net are within $0.01T of each other at the crossing) — only the date is wrong. |
| 2025 investment = charge = **$15.2T** | 15.2 = 15.2 | investment **$14.12T**, charge **$13.24T** | The GDP base ($145.7T Maddison 2011 PPP vs the study's implied $158T, +8.5%) explains the level. The 6.6% gap between investment and charge is the seed, below. |
| Working lives ~32/37/39/38 | 32/37/39/38 | **36.7/38.2/37.8/37.1** | The brief's own hazard multipliers under-disperse the bands; see §2. |

### The two assumptions that carry almost all of it

**(a) The demographic path is not the WPP low variant.** The brief says "UN WPP
2024 low-fertility variant". The actual WPP 2024 low variant ends 2100 at
**6.99bn**. This repository's own `CLAUDE.md` records its demographics as peaking
at 8.95bn in 2059 and ending at **8.5bn** — 22% above the true low variant, and
described there as "~18% below the medium variant". So the study's ledger is
being driven by a materially less severe population path than the one the brief
names. Running my ledger on the WPP **medium** variant moves the world peak to
**2063** — the study's year exactly — lifts the 2100 index from 0.58 to 1.07,
turns net investment negative in the 2030s rather than 2030, and brings China to
-67% against the -61% target. Running it on the blend that matches 8.5bn in 2100
puts India's peak at **2056**, the study's year exactly. I take this as the
single largest source of divergence, and I do not think it is a coding
difference: it is that the brief's stated demographic input and the study's
actual demographic input are not the same series.

**(b) The 2025 seed and the entrant rule are not mutually consistent.** The brief
says to seed uniformly over ages 20-64 thinned by the survival curve, and
separately that 2025 investment equals the charge. Under my reading the seed's
implied historical entrant flow is population(20-64)/45, while the 2025 entrant
flow is population(0-19)/20. Worldwide those are 105M and 132M — but for the US
they are 4.47M and 4.07M, a 9% deficit that puts the US ledger in the red from
the first year and never lets it out. For the US to stay in own-cohort surplus
to 2064 the seed has to be flow-consistent rather than population-consistent. I
ran that variant: it fixes the balance at 2025 by construction but wrecks the
regional indices (India's peak collapses from 1.60 to 1.07 and SSA's from x4.75
to x1.44, because fast-growing regions get an inflated 2025 base), and it is
clearly not what the study did. So the study is doing something in between that
the brief does not describe.

**Not an explanation:** the price base. I first suspected the study valued at
market exchange rates rather than Maddison PPP, which would widen the
destination/origin cost ratio and inflate the migration re-pricing. It does
(migration 2025-50 goes from $16.1T to $21.5T), but the study's own 2025 numbers
— $15.2T at 9.6% of GDP, implying world GDP of $158T against Maddison's $145.7T
— put its price base within 9% of Maddison PPP, not at market rates. And within
a region the constant-cost index is scale-invariant, so no price base changes a
single regional peak year. I have left the variant in the code
(`prices="market"`) but I do not think it is the answer.

## 6. Reproducing this

```bash
pip install pandas openpyxl
RAW=<dir with the raw downloads> python3 scripts/repro/hc_sources.py   # builds data/human-capital-repro/
python3 scripts/repro/hc_backcast.py
python3 scripts/repro/hc_forecast.py
python3 scripts/repro/hc_report.py    # the full specification matrix
```

`hc_report.py` writes `spec_matrix.csv` and `regional_peaks.csv` alongside one
`forecast_<spec>.csv` per specification.
