# The Century of Building Human Capital Is Over

*Research note, September 2026. The 1925-2025 reconstruction is produced by
`scripts/human-capital-backcast.py`; the 2025-2100 projection by
`npm run human-capital:trajectory` on the model's default parameters. The
projection was regenerated in September 2026 after the demographics module was
rewritten onto five-year age groups and calibrated to the UN WPP 2024
low-fertility variant; it had been running a medium-variant fertility path on
cohorts far too coarse to track an age pyramid, and both changes moved every
forecast number in this note. The module now holds world population within 2% of
WPP low for the whole century (peak 8.88bn in 2049 against WPP low's 8.95bn in
2052; 6.93bn in 2100 against 6.97bn). The reconstruction is
data-driven and unchanged. An independent reproduction of the whole exercise,
written from the specification against separately fetched sources, is in
`docs/HUMAN_CAPITAL_REPRODUCTION.md`.*

## Abstract

The world built human capital without interruption for a hundred years and
has now stopped. That is the result of pricing people times education as a
capital asset: capitalize what it costs to rear and school each workforce
entrant, at today's cost, and depreciate it over the years the entrant is
expected to spend at work. Between 1925 and 2025 the stock embodied in the
working-age population grew between five- and sixfold, 1.7% a year, of which
1.6 points was more people of working age and 0.1 was more education per
person. The growth accelerated to 2.5% a year in 1975-2000, slowed to 1.4% in 2000-2025,
and to 0.8% in the last decade. In 2025 the ledger still capitalizes
more than it charges: $17.7T of new entrants against $14.9T of depreciation and
write-offs, 11.2% of world GDP going in. That lasts about fifteen more years.

From here the model's demographics, recalibrated to the UN WPP 2024
low-fertility variant, take net investment negative from 2041 and to -$46T a
year by 2100. The stock of people-times-education rises 20% to a peak in 2041,
but much of that is not new human capital: through 2050 the gain is $41T at 2025
cost, of which $14T is net investment, $17T is migrants re-priced at their
destination's higher replacement cost, and $10T is the longer working lives of
people already at work. With migration switched off the world stock peaks 16% up
around 2040 and ends the century 40% below today. What is being built is
education rather than headcount: entrants fall from 132M to 63M a year while the
tertiary share of the workforce goes from just under a quarter to nearly
three-fifths.

The regions divide four ways. China turns first, in 2034, and is down 77% by
2100. India, Latin America, and South-East Asia build to the 2040s and early
2050s and give it back; the Middle East peaks in 2054 and holds. Sub-Saharan
Africa builds to 2076. The United States and the rest of the OECD grow only
through immigration: the US stops covering the wear on its own cohorts (its own
births, not immigrants) in 2038, and the immigrants it books on top become a
quarter of its workforce by 2100, at which point their own depreciation absorbs
the inflow. Spending on new entrants starts at 11.2% of GDP, above where it has
been for a century, and slips to 5.8% by 2100. The ledger
is cost, not value; it says nothing about what the people can do, only what it
took to make them.

## Backcast, 1925-2025

### The ledger

The account is the `humanCapital` module documented in `docs/HUMAN_CAPITAL.md`:
a Kendrick-style cost-based ledger at current replacement cost. Entrants
are sorted into four education bands (primary, secondary, tertiary,
advanced), each with its own entry age, and priced as a multiple of the
region's GDP per capita: rearing at the USDA out-of-pocket share (23% of
GDP per capita a year through the band's entry age) plus OECD spending per
student for each schooling stage. This is the explicit-outlay scope;
students' foregone earnings are out of it by default and are a sensitivity
below. Depreciation is straight-line over the expected time in the
workforce, from a survival curve that nets out death, disability,
domestic-role, and retirement exits; workers who leave early are written
off at remaining book value. Depreciation plus write-offs is the year's
charge, and the people still on the books are the in-service workforce.
The ledger is diagnostic: it reads demographics and GDP and feeds nothing
back.

Because unit costs track income, the dollar stock rises with GDP per capita
even when the workforce it prices is shrinking; on the default path the
world net stock goes from $233T in 2025 to $2,909T in 2100, a 12-fold rise
that is almost entirely revaluation. Every "growing or shrinking" statement
in this note therefore deflates each region's stock by that region's own
GDP-per-capita index (2025 = 1): a constant-cost quantity, how many
2025-dollars of rearing and schooling are embodied in the people at work.

The simulation starts in 2025 and cannot run backwards, so the century
before it is reconstructed from observed data and priced with the same
multipliers. The stock is people aged 25-64 times their education (Lee and
Lee's long-run attainment series, 1870-2040, and Barro-Lee by age group);
entrants are the population aged 20-24 divided by five, with the attainment
mix of the cohort five years on. Costs are multiples of GDP per capita
(Maddison), so investment and stock relative to GDP depend only on
demographics and education, and the constant-cost stock holds each region's
2025 unit cost fixed. Countries are grouped into the model's nine regions so
that the 2025 totals match the model's population anchors within a few
percent (Sub-Saharan Africa is the exception, at 12% below). Lee-Lee and
Barro-Lee count China's completed tertiary attainment at about 3% of ages
25-64 in 2015, far below the census, so China's tertiary shares from 2000 on
are overridden with the NBS census communiqués (junior college and above,
rescaled to ages 25-64) and the Ministry of Education's gross tertiary
enrollment ratio for entrants, ending at the model's own 2025 anchor. Before
1950 the level follows each region's total population from the 1950 age
structure, with Lee-Lee supplying the education mix and the change in age
shares, because its pre-1950 country series sit on older territories
(British India, the USSR). The headline series is gross (no age-based
write-down) so that it can reach back to 1925; a net series from the age
structure is given from 1950. The reconstruction is spliced to the model's
projection at 2025, where both are indexed to 1. Method and sources are in
the script header.

![Human capital at constant cost, 1925-2100, by region](human-capital-trajectory-figure.svg)

### World

| Year | Population 25-64 (M) | Entrants (M/yr) | Tertiary share of 25-64 | Entrants / population | Investment / GDP | Gross stock / GDP | Constant-cost stock (2025 = 1) |
|---|---|---|---|---|---|---|---|
| 1925 | 816 | 37 | 1% | 1.9% | 9.3% | 2.2 | 0.18 |
| 1950 | 1,042 | 44 | 1% | 1.8% | 9.5% | 2.4 | 0.24 |
| 1975 | 1,575 | 72 | 3% | 1.8% | 11.1% | 2.6 | 0.39 |
| 2000 | 2,778 | 104 | 9% | 1.7% | 10.7% | 3.3 | 0.71 |
| 2010 | 3,342 | 124 | 12% | 1.8% | 11.5% | 3.5 | 0.86 |
| 2025 | 4,083 | 125 | 13% | 1.5% | 10.3% | 3.7 | 1.00 |

The world's stock of pre-workforce human capital grew between five- and
sixfold over the century, 1.7% a year: 1.6 points of that is more people of
working age and 0.1 points is more education per person. Growth accelerated
through each quarter-century, from 1.3% a year in 1925-1950 to a peak of
2.5% in 1975-2000, then slowed to 1.4% in 2000-2025 and 0.8% in the last
decade. On a net basis, with each age group written down straight-line over
its band's expected working life, the stock grew faster still (2.1% a year
since 1950 against 1.9% gross), because the book value of the workforce
rose from 30% to 35% of replacement cost as it filled with recent,
better-educated entrants.

### Regions

Constant-cost stock index (2025 = 1), gross, with the model's projection
alongside so the whole 175 years can be read in one row (the 2050-2100
columns preview the forecast section):

| Region | 1925 | 1950 | 1975 | 2000 | 2025 | 2050 | 2075 | 2100 | 1925-2025 (%/yr) | 2025-2100 (%/yr) |
|---|---|---|---|---|---|---|---|---|---|---|
| United States | 0.23 | 0.34 | 0.51 | 0.81 | 1.00 | 1.30 | 1.46 | 1.50 | +1.5 | +0.5 |
| OECD ex-US | 0.31 | 0.42 | 0.60 | 0.90 | 1.00 | 1.22 | 1.38 | 1.44 | +1.2 | +0.5 |
| China | 0.12 | 0.15 | 0.27 | 0.68 | 1.00 | 0.81 | 0.59 | 0.43 | +2.1 | -1.1 |
| India + South Asia | 0.10 | 0.12 | 0.21 | 0.51 | 1.00 | 1.31 | 1.44 | 1.23 | +2.3 | +0.3 |
| Latin America | 0.07 | 0.12 | 0.25 | 0.57 | 1.00 | 1.05 | 1.02 | 0.86 | +2.7 | -0.2 |
| SE Asia + Pacific | 0.07 | 0.11 | 0.22 | 0.53 | 1.00 | 1.10 | 1.13 | 0.97 | +2.7 | -0.0 |
| Russia + CIS | 0.24 | 0.33 | 0.59 | 0.90 | 1.00 | 0.94 | 0.84 | 0.72 | +1.4 | -0.4 |
| MENA | 0.06 | 0.08 | 0.15 | 0.42 | 1.00 | 1.58 | 1.99 | 1.94 | +2.9 | +0.9 |
| Sub-Saharan Africa | 0.07 | 0.10 | 0.19 | 0.43 | 1.00 | 2.22 | 3.45 | 3.84 | +2.7 | +1.8 |
| World | 0.18 | 0.24 | 0.39 | 0.71 | 1.00 | 1.16 | 1.23 | 1.18 | +1.7 | +0.2 |

Every region but one built human capital in every quarter-century of the
last hundred years; the exception is Russia + CIS, whose series falls in
1940-1945 and again after 2020. China's reversal is the sharpest in the
table: from 3.7% a year in 1975-2000 (second only to MENA's 4.2%), and
still 1.5% a year in 2000-2025, to a 1.1% a year decline. Russia + CIS has
already stalled, with its 2025 stock below 2015, and the OECD ex-US has
been flat for a decade. The regions that grew fastest in the past century
(MENA, Latin America, SE Asia, Sub-Saharan Africa, all between 2.7% and
2.9% a year) are the ones with the most building left, and only Sub-Saharan
Africa keeps anything like its historical pace.

The same splice on a net basis (Barro-Lee's 10-year age groups from 1950,
cohort-shifted after 2015) tracks the model's own net stock:

| Region | 1950 | 1975 | 2000 | 2025 | 2050 | 2075 | 2100 | Net / gross 1950 | Net / gross 2025 |
|---|---|---|---|---|---|---|---|---|---|
| United States | 0.31 | 0.51 | 0.84 | 1.00 | 1.33 | 1.41 | 1.43 | 0.35 | 0.38 |
| OECD ex-US | 0.34 | 0.59 | 0.98 | 1.00 | 1.23 | 1.35 | 1.39 | 0.27 | 0.33 |
| China | 0.12 | 0.26 | 0.75 | 1.00 | 0.72 | 0.54 | 0.39 | 0.28 | 0.34 |
| India + South Asia | 0.10 | 0.17 | 0.49 | 1.00 | 1.53 | 1.43 | 1.20 | 0.30 | 0.37 |
| Latin America | 0.10 | 0.22 | 0.60 | 1.00 | 1.10 | 1.01 | 0.84 | 0.31 | 0.35 |
| SE Asia + Pacific | 0.10 | 0.21 | 0.54 | 1.00 | 1.19 | 1.14 | 0.94 | 0.31 | 0.35 |
| Russia + CIS | 0.26 | 0.53 | 0.91 | 1.00 | 0.92 | 0.82 | 0.68 | 0.30 | 0.38 |
| MENA | 0.06 | 0.12 | 0.42 | 1.00 | 1.89 | 2.00 | 1.89 | 0.29 | 0.38 |
| Sub-Saharan Africa | 0.08 | 0.15 | 0.40 | 1.00 | 2.82 | 3.64 | 3.89 | 0.30 | 0.38 |
| World | 0.20 | 0.37 | 0.75 | 1.00 | 1.19 | 1.20 | 1.14 | 0.30 | 0.35 |

The OECD ex-US has been flat on a net basis since 2000 and Russia + CIS
nearly so. The model's net stock in 2025 is 44% of gross, above the
reconstruction's 35%, because it prices the in-service workforce rather
than everyone aged 25-64. The two series agree on direction and turning
points, so the splice does not depend on the gross/net choice.

### The United States

| Year | Entrants (M/yr) | Entrants / population | Entrant tertiary share | Workforce 25-64 (M) | Tertiary share of 25-64 | Investment / GDP | Constant-cost stock (2025 = 1) |
|---|---|---|---|---|---|---|---|
| 1925 | 1.90 | 1.70% | 8% | 53 | 5% | 10.7% | 0.23 |
| 1940 | 2.17 | 1.67% | 10% | 65 | 6% | 11.2% | 0.28 |
| 1950 | 2.35 | 1.53% | 13% | 77 | 8% | 10.4% | 0.34 |
| 1960 | 2.22 | 1.23% | 16% | 84 | 10% | 8.8% | 0.39 |
| 1970 | 3.47 | 1.67% | 25% | 92 | 14% | 12.7% | 0.45 |
| 1980 | 4.35 | 1.89% | 32% | 110 | 22% | 14.8% | 0.58 |
| 1990 | 3.86 | 1.52% | 33% | 131 | 28% | 12.1% | 0.71 |
| 2000 | 3.89 | 1.38% | 33% | 148 | 29% | 10.9% | 0.81 |
| 2010 | 4.46 | 1.44% | 41% | 166 | 33% | 11.7% | 0.93 |
| 2020 | 4.45 | 1.31% | 40% | 178 | 33% | 10.7% | 1.00 |
| 2025 | 4.61 | 1.34% | 40% | 178 | 33% | 11.0% | 1.00 |

The US series has one large hump: the baby boom entering the workforce with
the first mass college cohorts, which took investment from under 9% of GDP
in 1960 to nearly 15% in 1980. Since then the share has drifted around 11 to
12%, more education per entrant offsetting a falling youth share. The
stock grew 1.5% a year over the century (1.2 points people, 0.3 education),
but only 0.3% a year over 2015-2025, and the 25-64 population has been
flat since 2020. The reconstruction reaches 2025 with the US stock already
at a plateau.

### Spending

Investment in new entrants as a share of GDP:

| Region | 1925 | 1950 | 1975 | 2000 | 2010 | 2025 |
|---|---|---|---|---|---|---|
| United States | 10.7% | 10.4% | 13.6% | 10.9% | 11.7% | 11.0% |
| OECD ex-US | 9.8% | 9.4% | 10.4% | 9.8% | 9.2% | 8.3% |
| China | 6.8% | 8.6% | 12.1% | 10.5% | 13.6% | 9.4% |
| India + South Asia | 6.1% | 7.5% | 8.7% | 11.1% | 12.0% | 12.5% |
| Latin America | 8.3% | 8.6% | 10.1% | 11.8% | 12.0% | 11.5% |
| SE Asia + Pacific | 7.7% | 8.3% | 9.3% | 11.6% | 11.9% | 11.6% |
| Russia + CIS | 14.6% | 13.8% | 12.8% | 12.5% | 14.7% | 9.4% |
| MENA | 7.2% | 7.2% | 8.7% | 11.9% | 13.0% | 12.0% |
| Sub-Saharan Africa | 7.4% | 7.6% | 8.2% | 9.8% | 10.3% | 12.1% |
| World | 9.3% | 9.5% | 11.1% | 10.7% | 11.5% | 10.3% |

The world spends slightly more of its output on new human capital than it
did a century ago, and less than it did fifteen years ago. The share rose
from about 9% of GDP in 1925 to a peak of 11.7% in 1980-85 as the baby-boom
cohorts entered with the first mass tertiary intakes, stayed near 11% through
2010 as the education mix upgraded faster than cohorts shrank, and has since fallen back to about 10% as the youth share of
population dropped from 1.8% to 1.5%. Per entrant, the world spends 1.6
times its 1925 multiple of GDP per capita on rearing and schooling (4.4 to
7.2 times GDP per capita), and GDP per capita is itself far higher.

Outside data say the same. Total US education spending has held at about
5.4 to 5.6% of GDP in recent years, having peaked at 6.7% in 2009 (World
Bank/UIS series), while the US birth cohort fell from 4.32M in 2007 to 3.63M
in 2024 (NCHS). World government education spending was 4.16% of GDP in
2019 and 3.51% in 2023 (World Bank, from UNESCO UIS). The ledger's 10% is
not comparable to those 4 to 6% education shares: it also counts rearing to
entry age. With rearing excluded the model's 2025 flow is 4.1% of GDP,
close to the world education share.

### Joining the series

The two series join at 2025 with one visible seam: the reconstruction's
entrants are the cohort now aged 20-24 (125M worldwide, 4.6M in the US),
while the model's entrant flow is the cohort aged 0-19 divided by 20 (119M
and 4.1M). The model's figure is the average of the next twenty years of
entrants and is the right one for the projection; the reconstruction's is
the right one for the present. Where births have been falling, as in the US
since 2007, the two differ by the amount of that decline, which is why the
reconstruction's 2025 investment share (10.3% of world GDP, 11.0% for the
US) sits above the model's (9.6% and 11.4%). The tertiary shares differ for
a reason met already in China: the reconstruction's 13% is completed
tertiary attainment among everyone aged 25-64 from Lee-Lee, while the
model's 24% is the tertiary-plus share of the in-service workforce from
national college-attainment statistics.

## Forecast, 2025-2100

### Two nets

The projection needs one more definition. Each region books immigrants at
its own replacement cost on arrival (the migration transfer) and then
depreciates them alongside everyone else; the origin writes them down at its
own, lower cost. So a region's investment less its total charge is not an
own-cohort measure: a steady receiver drifts into deficit simply because
its immigrant stock accumulates and wears down. The ledger tracks post-2025
arrivals as a subset of each region's workforce and reports two nets:
**own-cohort net**, investment less the charge on the region's own cohorts,
and **total net**, which adds the migration transfer and subtracts the
charge on immigrants. At the world level the two coincide (every migrant is
somebody's own cohort), and the gap between the regional sums is the
transfer itself: the same people re-priced at destination cost.

### World

| Year | Investment $T | Depreciation + write-offs $T | Net $T | Investment / GDP | Constant-cost net stock (2025 = 1) | Entrants (M) | Tertiary+ share of workforce |
|------|------|------|------|------|------|------|------|
| 2025 | 17.7 | 14.9 | +2.8 | 11.2% | 1.00 | 131.8 | 23% |
| 2030 | 20.3 | 17.2 | +3.2 | 11.4% | 1.09 | 134.2 | 28% |
| 2040 | 24.4 | 24.7 | -0.3 | 9.9% | 1.20 | 123.3 | 38% |
| 2050 | 29.5 | 35.6 | -6.1 | 8.4% | 1.18 | 109.6 | 46% |
| 2060 | 36.7 | 49.0 | -12.3 | 7.5% | 1.10 | 99.4 | 52% |
| 2075 | 48.9 | 69.0 | -20.1 | 6.7% | 0.93 | 85.0 | 59% |
| 2100 | 106.8 | 153.0 | -46.2 | 5.8% | 0.71 | 63.1 | 58% |

The constant-cost stock rises for fifteen years while net investment is turning
negative, and it is worth being exact about why. Its change from 2025 splits
into three lines, each deflated by its region's cost index, and they sum to the
change without residual:

| Cumulative since 2025, $T at 2025 cost | 2030 | 2040 | 2050 | 2060 | 2075 | 2100 |
|---|---|---|---|---|---|---|
| Net investment (investment less all charges) | +14.7 | +29.0 | +14.1 | -17.1 | -73.1 | -149.7 |
| Migration transfers (movers re-booked at destination cost) | +3.2 | +9.9 | +17.2 | +24.8 | +36.2 | +54.0 |
| Useful-life revaluation (longer working lives raise remaining book value) | +1.9 | +5.8 | +9.9 | +14.3 | +20.9 | +29.4 |
| Change in the constant-cost stock | +19.7 | +44.7 | +41.3 | +22.0 | -16.0 | -66.3 |

Three things stand out.

1. **The build is ending, and it ends in the 2040s.** At current cost the ledger
   capitalizes $2.8T more than it charges in 2025, closes that gap over the
   2030s, and first runs a sustained deficit in 2041, widening to -$46T a year by
   2100. The constant-cost stock rises about 1.5% a year through the 2030s, peaks
   in 2041 at 1.20, and then falls about 0.7% a year to end 29% below 2025. Much
   of the rise is not new human capital: the table above puts $17T of the $41T
   gain to 2050 in migration transfers and $10T in lengthening working lives,
   against $14T of net investment. The migration line is the same people
   re-priced: a graduate who moves from India to the OECD is written down at
   Indian cost and written up at OECD cost, and the world stock rises by the
   difference. With migration switched off the world constant-cost stock peaks at
   1.16 around 2040 and ends the century at 0.60.
2. **What is being built is education, not headcount.** Entrants fall from 132M
   to 63M a year -- a 52% decline -- while the tertiary-plus share of the
   in-service workforce goes from just under a quarter to nearly three-fifths. A
   tertiary entrant carries about twice the cost of a secondary one in the world
   average, because tertiary entrants are concentrated in richer regions.
   Composition is doing all the work: by the 2070s the tertiary headcount is
   itself falling.
3. **The spending share slides, and steeply.** Investment runs 11.2% of GDP now
   and 5.8% in 2100. Entrant cohorts shrink faster than GDP while per-entrant
   cost tracks income, so spending on entrants loses more than five points of GDP
   over the century -- far steeper than the reconstruction's post-2010 drift, and
   the clearest single statement that the century of building is over.

### Regions

Constant-cost net stock index (2025 = 1), the peak year of that index, the
first years own-cohort and total net investment are negative, and the change
in annual entrants over the century. The world is in surplus in 2025 (+$2.8T)
and first runs a sustained deficit in 2041; at the world level the two nets
coincide.

| Region | 2030 | 2050 | 2075 | 2100 | Peak | Peak level | Own cohorts < 0 | Total < 0 | Entrants 2100 / 2025 |
|--------|------|------|------|------|------|------|------|------|------|
| United States | 1.10 | 1.20 | 1.03 | 0.89 | 2045 | 1.21 | 2038 | 2043 | 0.45 |
| OECD ex-US | 1.03 | 0.96 | 0.72 | 0.54 | 2036 | 1.04 | 2025 | 2035 | 0.31 |
| China | 1.02 | 0.84 | 0.44 | 0.23 | 2034 | 1.03 | 2034 | 2034 | 0.11 |
| India + South Asia | 1.22 | 1.74 | 1.48 | 1.11 | 2053 | 1.75 | 2055 | 2053 | 0.40 |
| Latin America | 1.13 | 1.28 | 0.94 | 0.63 | 2045 | 1.30 | 2046 | 2044 | 0.28 |
| SE Asia + Pacific | 1.13 | 1.37 | 1.07 | 0.76 | 2047 | 1.37 | 2047 | 2047 | 0.33 |
| Russia + CIS | 1.08 | 1.21 | 0.99 | 0.79 | 2045 | 1.22 | 2044 | 2045 | 0.46 |
| MENA | 1.23 | 1.84 | 1.63 | 1.25 | 2054 | 1.86 | 2055 | 2054 | 0.50 |
| Sub-Saharan Africa | 1.39 | 3.01 | 3.69 | 3.44 | 2076 | 3.69 | 2076 | 2074 | 0.98 |
| World | 1.09 | 1.18 | 0.93 | 0.71 | 2041 | 1.20 | 2041 | 2041 | 0.48 |

The regions fall into three groups.

- **Turning first: China, OECD ex-US.** China peaks in 2034, barely above its
  2025 level, and then falls hard: its entrant cohort ends the century at a ninth
  of today's and its constant-cost stock 77% below. In current dollars the
  Chinese stock still rises several-fold, which is the revaluation trap: a
  shrinking, better-educated workforce repriced at higher income looks like
  accumulation. The OECD ex-US is in own-cohort deficit from the start, peaks in
  2036 on immigration alone, and ends at 0.54. The century ahead is the first in
  which any region draws down by choice of fertility rather than by catastrophe.
- **Building to the 2040s and mid-2050s, then drawing down: India + South Asia,
  MENA, SE Asia + Pacific, Latin America, Russia + CIS, the United States.** The
  demographic-dividend regions peak between 2045 and 2055 and give most of it
  back. India peaks in 2053 at 1.75 times its 2025 stock and ends at 1.11; MENA
  peaks highest outside Africa at 1.86 in 2054 and still holds 1.25 in 2100.
  India, Latin America, and SE Asia are net exporters of trained people, written
  down at origin cost as they leave. The United States belongs here only because
  of immigration: on its own cohorts it turns in 2038.
- **Building longest: Sub-Saharan Africa.** Its stock nearly quadruples to a 2076
  peak and is still 3.4 times its 2025 level in 2100, from a base that is 3% of
  the world total. It is the last region to turn, in 2076, and the only one whose
  entrant flow in 2100 is essentially unchanged from today's (0.98).

### The United States

| Year | Entrants (M) | Investment $T | Charge $T | of which on post-2025 immigrants | Own-cohort net $T | Migration transfer $T | Total net $T | Investment / GDP |
|------|------|------|------|------|------|------|------|------|
| 2025 | 4.6 | 2.99 | 2.53 | 0.02 | +0.48 | 0.41 | +0.87 | 12.5% |
| 2030 | 4.3 | 3.10 | 2.88 | 0.10 | +0.33 | 0.47 | +0.69 | 11.7% |
| 2040 | 3.7 | 3.55 | 4.04 | 0.35 | -0.14 | 0.68 | +0.19 | 10.0% |
| 2050 | 3.2 | 4.24 | 5.70 | 0.75 | -0.71 | 1.00 | -0.46 | 8.7% |
| 2060 | 2.9 | 5.07 | 7.49 | 1.26 | -1.16 | 1.38 | -1.04 | 7.9% |
| 2075 | 2.5 | 6.71 | 10.29 | 2.07 | -1.50 | 2.11 | -1.47 | 7.2% |
| 2100 | 2.0 | 15.89 | 24.77 | 6.01 | -2.87 | 5.65 | -3.23 | 6.5% |

The US invests a larger share of GDP than any region in 2025 except MENA and
Sub-Saharan Africa, because its entrants are expensive (a college share above
40% and the world's highest GDP per capita) rather than numerous. Its entrant
cohort falls by more than half over the century, from 4.6M to 2.0M a year.

The US covers the charge on its own cohorts with a surplus of $0.48T in 2025,
and that surplus is gone by 2038. What follows is a widening own-cohort deficit
against a stock whose depreciation rises with income. The migration transfer is
worth about a fifth of gross additions throughout, and it keeps total net
positive for another five years, to 2043. It also builds a stock that has to be
written down: the charge on post-2025 immigrants goes from $0.02T in 2025 to
$2.1T in 2075 and $6.0T in 2100, by which point it exceeds the $5.7T transfer
that brought them in. With migration switched off everywhere, which also removes
migrants' children from future cohorts
(`--set=demographics.migrationMultiplier=0`), US entrants fall by 73% instead of
55%, own-cohort net turns negative in 2037, and the US constant-cost stock peaks
in 2037 at 1.08 and ends the century at 0.72 instead of 0.89.

The US result is therefore an immigration-policy result more than a demographic
one: on its own children the US is drawing down from the late 2030s, and
everything that keeps its stock above its 2025 level into the 2050s is
immigration and immigrants' children.

The size of that immigration assumption deserves stating. The demographics
module's US migration rate is calibrated to net immigration of about 1.2M a year
(UN WPP 2024 and CBO 2025), but the model closes the world's migration by
scaling every receiver's inflow to the emigration budget, so the flow the ledger
actually books is larger; the rich-region transfers above are an upper bound.

### Human capital as an import

The migration transfer can be read as a trade account, and it is worth doing
explicitly, because the price gap it rests on is the largest single number in
this note. The ledger books an arriving worker at the **destination's**
replacement cost and writes it off at the **origin's**. That is an import of
embodied human capital: the destination acquires an asset it did not pay to
build.

At the model's own 2025 unit costs, rearing and schooling one worker to the
education mix that actually arrives (70% college) costs:

| | Build at home | What the origins paid | Discount |
|---|---|---|---|
| United States | $614k | $96k | **84%** |
| OECD ex-US | $418k | $96k | **77%** |

The world's emigrant pool is supplied overwhelmingly by the two poorest
suppliers: India + South Asia and Sub-Saharan Africa together account for about
three-quarters of it, building a worker for $71k and $47k respectively against
the $614k it would cost in the United States.

Three things follow, and one does not.

- **The rising import share is a collapsing denominator.** US arrivals stay near
  1M working-age people a year for the whole century. What rises is their share:
  post-2025 immigrants go from 0.5% of the US workforce to 25% by 2100, and the
  migration transfer goes from a fifth of gross additions to more than the whole
  of net additions. On these numbers the US is not importing more; it is
  producing less.
- **The world gain is a re-pricing, not new human capital.** The $54T that
  migration adds to the world constant-cost stock by 2100 is the same people
  standing in a richer labour market. Nobody was reared or schooled twice.
- **The origin side is a real write-off**, and it falls on the suppliers least
  able to carry it. It brings India's, Latin America's and SE Asia's turning
  points forward.
- **What this cannot show is that the price gap causes the flow.** Migration is
  exogenous here, read off UN WPP and rescaled to close the world; it does not
  respond to the cost differential. An 84% discount would, in any model where
  migration answered to price, produce a much stronger pull than the one
  assumed. Making `migrationRate` respond to the destination/origin replacement-
  cost ratio is the obvious next step and is not in this model.

A caution on reading any of it as welfare. This is capital accounting. The
migrant captures most of the return through wages, so an 84% discount on the
build cost is not 84% of the asset's value accruing to the destination.

### Robustness

- **Energy and climate scenarios do not move the quantity path.** `ssp3-70` and
  `net-zero` produce identical constant-cost stocks, entrant flows, and regional
  peak years to the default run; only the dollar values differ, because those
  scenario files leave demographics untouched. The human-capital trajectory in
  this model is a demographic and education result, not an energy one.
- **Demographics move everything.** This is the sensitivity the first version of
  this note did not report, because it did not know it had one. The module has
  since been rewritten twice: from a medium-variant fertility path on a single
  20-64 cohort, to WPP-low fertility on two working bands, to WPP-low fertility
  on five-year age groups. Those changes moved the world peak from 1.22 in 2063,
  to 1.11 across 2039-2046, to **1.20 in 2041**; the 2100 index from 1.14 to 0.73
  to **0.71**; and the US own-cohort turn from 2064 to 2032 to **2038**. No
  cost-scope or scenario assumption in this note comes within an order of
  magnitude of that. The projection's conclusions rest on the demographic input
  at least as much as on the accounting method.
- **Cost scope shifts levels and the world peak level, not the regional
  ordering.** Adding students' foregone earnings at the Kendrick/BEA share
  (`foregoneEarningsShare` 0.45) raises the 2025 flow to 13.8% of GDP and the
  world peak to 1.25; pricing rearing at the National Transfer Accounts midpoint
  (0.30) gives 13.2% and a 1.19 peak; removing rearing gives 4.8% and a 1.29 peak
  that arrives in 2050 rather than 2040. Regional peak years move by at most
  three years in every case (Sub-Saharan Africa, 2076 to 2078 with rearing
  removed), the regional grouping is unchanged, and the US own-cohort turn stays
  within 2038-2040.

## Conclusion

The world spent a century building human capital at an accelerating pace and has
now stopped. The reconstruction shows the stock of people times education
growing in every quarter-century since 1925 in every region but one, fastest in
1975-2000, and slowing since; the projection shows the ledger in modest
surplus in 2025, net investment negative from 2041, and a constant-cost stock
that peaks in 2041 and gives back more than all of its gain by 2100, with much
of the rise to that peak being the re-pricing of migrants and the lengthening of
working lives rather than new human capital. The result is demographic and
educational, not energy or climate related: the energy scenarios leave it
untouched, and the cost-scope sensitivities move levels, not turning points or
ordering. It is, however, highly sensitive to the demographic input, which is
the main lesson of the September 2026 revisions.

Three readings follow.

- **Composition is doing the work, and it runs out.** Entrants fall by more
  than half while the tertiary share of the workforce more than doubles, so the
  stock holds its value on fewer, costlier people to 2041 and then loses it. Any policy question about "investing in human capital" is, on this
  measure, a question about education per entrant, because the number of
  entrants is already set by births that have happened.
- **The rich regions do not grow; they import.** The US draws down on its own
  cohorts from 2038 and stays above its 2025 level into the 2050s only because it
  books working-age arrivals at its own replacement cost -- about $614k a worker
  against the $96k the origins paid. The OECD ex-US does the same
  on a larger flow and still declines. The source regions write the same people
  down at their own cost, and the world's reported gain is the price difference,
  not new human capital.
- **Spending is the thing that is actually falling.** The world put 9 to 12% of
  GDP into new entrants for a hundred years; the projection takes it to 5.8%.
  That is entrant cohorts shrinking relative to output, with spending per entrant
  rising throughout -- so it is not a policy retreat, and it is not reversible by
  spending more per head.

What the result does not say:

- Cost is not value. A lifetime-income (Jorgenson-Fraumeni) account would be
  several times larger and would respond to wage premia this ledger ignores.
- Post-entry training, learning on the job, and obsolescence are outside the
  ledger; a shrinking pre-workforce stock is compatible with rising skill if
  on-the-job investment grows.
- The 2025 workforce is seeded, not observed. The ledger starts each region
  from demographics' working-age headcount spread uniformly over the 45
  working ages and thinned by the survival curve, because the model carries
  no age structure inside the working cohort. That seed sets every region's
  2025 charge and the timing of its own-cohort turn: the OECD ex-US and
  China start in deficit because their seeded vintages (10.3M and 21M a
  year) are larger than their entrant flows (7.2M and 12M), and the US
  starts in slight surplus because its seed is close to its flow (4.1M).
  Real age structures are lumpier (the 1960s cohorts now retiring in the
  OECD, China's 1960s-80s cohorts), so the direction is right and the timing
  is approximate.
- Immigrants are booked at the destination's replacement cost written down
  for tenure (about three-quarters of full cost), with no under-employment
  discount and a 70% college share, so the rich-region migration transfers
  are an upper bound; the appendix sizes the difference. The immigrant subset the ledger tracks starts empty
  in 2025: people who arrived before the run are own cohorts to it, so
  "own-cohort" means post-2025 births, not nativity.
- Longer working lives raise the book value of everyone already at work.
  The ledger books that revaluation on its own line so the accounts close;
  it is a schedule change, not investment.
- The reconstruction prices everyone aged 25-64, not the in-service
  workforce: the model nets out domestic-role and disability exits, the
  reconstruction cannot, because participation by age and education is not
  observed before the 1990s. That is a level difference (the net/gross
  ratios above), and where participation rose over the century, as women's
  did in the OECD after 1950, the in-service stock grew faster than the
  series shows. Migration is inside the population counts, so the stock is
  complete, but the flows are not split between births and arrivals.
- China's tertiary shares are census and enrollment based from 2000 on, a
  correction to the source rather than an observation of attainment by age;
  the Barro-Lee age profile is scaled to the census total. Before 1950 the
  covered countries are scaled to regional population totals, which assumes
  uncovered countries had the covered average attainment; Russia + CIS and
  India before 1950 rest on Lee-Lee's Soviet-era and British-India series,
  used only as ratios, and should be read as rough.
- Demographics follow the UN WPP 2024 low variant, and after the September 2026
  rewrite onto five-year age groups they follow it closely: world population, the 0-19, 20-64 and
  65+ cohorts, and the entrant flow all stay within a few percent of WPP low for
  the whole century, and the population peak lands in 2049 against WPP low's
  2052. China remains the one to read with care -- WPP low takes it to 0.41bn by
  2100 and the module reaches 0.49bn, so China's late-century stock here is still
  a modest upper bound. A medium-variant
  path would delay every peak year and lift every level, but not change the
  ordering; the projection is a low-variant result and should be read as one.

## Appendix: cross-check against the G7-BRIC spreadsheet

The G7-BRIC human-capital model (v4, 4 September 2026) is a single-year
2025 account for eleven countries in billions of 2024 PPP dollars, with five
or six education bands per country. It capitalizes paid care and schooling
only (no student opportunity cost, no unpaid care), applies participation at
entry, amortizes straight-line over effective exit age minus entry age
(41-45 years in the G7, 32-42 in the BRICs) with WHO age-specific mortality
and no other pre-retirement exits, and values migrants at remaining book
value at age 32 with the domestic education mix. The ledger's default cost
scope matches it (its US care cost through 18 is 23% of GDP per capita, the
USDA figure the ledger uses). The two models agree on every sign and on the
ordering of countries; what remains between them is the participation
filter, the treatment of working life, and migration.

2025 flows in $T at current cost, and the end-2025 net stock. Model regions
are wider than the spreadsheet's countries: India + South Asia, Russia +
CIS, and OECD ex-US (all Europe, Japan, Korea, Canada, Australia, New
Zealand, Israel) against India, Russia, and the six non-US G7 members.

| | Entrants (M) | Investment | Depreciation + write-offs | Own-cohort net | Migration | Net incl. migration | Net stock |
|---|---|---|---|---|---|---|---|
| **United States**: spreadsheet | 3.64 | 2.41 | 2.42 | -0.01 | +0.36 | +0.35 | 55.7 |
| model, default | 4.08 | 2.72 | 2.54 | +0.20 | +0.63 | +0.81 | 42.9 |
| model, life = exit minus entry | 4.08 | 2.72 | 2.54 | +0.20 | +0.65 | +0.83 | 55.0 |
| **China**: spreadsheet | 11.97 | 1.80 | 1.90 | -0.10 | -0.01 | -0.11 | 38.0 |
| model, default | 11.99 | 2.34 | 3.32 | -0.98 | -0.04 | -1.01 | 54.2 |
| model, life = exit minus entry | 11.99 | 2.34 | 3.34 | -1.00 | -0.04 | -1.04 | 72.1 |
| **India**: spreadsheet | 17.0 | 0.87 | 0.70 | +0.17 | -0.01 | +0.16 | 13.6 |
| model (India + South Asia), default | 31.5 | 1.78 | 1.35 | +0.43 | -0.09 | +0.35 | 14.8 |
| model, life = exit minus entry | 31.5 | 1.78 | 1.34 | +0.44 | -0.09 | +0.35 | 29.5 |
| **Russia**: spreadsheet | 1.31 | 0.30 | 0.42 | -0.12 | -0.02 | -0.14 | 7.5 |
| model (Russia + CIS), default | 3.19 | 0.68 | 0.74 | -0.06 | -0.04 | -0.10 | 12.1 |
| model, life = exit minus entry | 3.19 | 0.68 | 0.74 | -0.06 | -0.04 | -0.10 | 16.1 |
| **G7 ex-US**: spreadsheet (six countries) | 3.96 | 1.69 | 2.08 | -0.39 | +0.19 | -0.20 | 44.2 |
| model (OECD ex-US), default | 7.20 | 3.08 | 3.80 | -0.67 | +1.10 | +0.39 | 61.5 |
| model, life = exit minus entry | 7.20 | 3.08 | 3.80 | -0.69 | +1.15 | +0.43 | 82.1 |

"Life = exit minus entry" is the model rerun with
`npm run human-capital:trajectory -- --no-exit-hazards`, which switches off
death, disability, and domestic-role exits so that useful life is retirement
age minus entry age and there are no write-offs, as in the spreadsheet. In
2025 the model's own-cohort net excludes only the one-year charge on that
year's arrivals ($0.03T for the US), so it is comparable to the
spreadsheet's net before migration.

The model's $2.72T of 2025 US investment becomes the spreadsheet's $2.41T
in one step: the spreadsheet applies participation at entry (3.64M
effective entrants against the model's 4.08M), which the model handles
instead through exit hazards and write-offs over the career. Depreciation
matches at $2.5T against $2.4T. The net stock matches at $55T once working
life is defined the same way; on the model's own shorter expected working
lives the US stock is $43T. Both accounts put the US at about break-even on
its own children in 2025 (+$0.20T against -$0.01T) and clearly positive only
because of immigration. China, Russia and the non-US G7 are net disinvestors
on their own cohorts in both; India is a net investor in both. The China
entrant count is identical (12.0M), because both take the cohort turning 20
from the same UN age structure, and the spreadsheet's entrant tertiary share
for China (55%) is close to the model's 61%, both far above the Lee-Lee
figure the reconstruction had to override.

Where they differ:

1. *Care cost outside the US.* The spreadsheet scales care by household
   consumption relative to the US rather than by GDP per capita, which
   roughly halves it for China (China's consumption share of GDP is about
   38% against the US's 68%); this is most of the gap in China's investment
   ($1.8T against $2.3T) and stock ($38T against $54T).
2. *Useful life and exits.* The spreadsheet amortizes over 41-45 years and
   charges only mortality. The model's expected working lives are 28-39
   years because they net out disability and domestic-role exits, which it
   writes off at book value. That is why the model's charge exceeds the
   spreadsheet's by more than its investment does, and why its own-cohort
   net is more negative for China (-$1.0T against -$0.1T). The spreadsheet's
   note that net "still excludes unestimated disability and unscheduled
   retirement" and its break-even sensitivity (a 0.16% annual non-fatal loss
   would erase the G7's net) point at the same mechanism from the other
   side. A third candidate for the China gap is the model's opening age
   structure (see the conclusion's limits), which the spreadsheet takes from observed
   cohorts.
3. *Migration.* This is the one substantive disagreement. The spreadsheet's
   G7 ex-US is a net disinvestor even after migration (-$0.20T); the model's
   OECD ex-US turns positive (+$0.39T). Two assumptions drive it. The
   model's demographics move 3.4M net working-age migrants a year into the
   OECD ex-US and 1.27M into the US, against the spreadsheet's 1.1M and
   0.73M effective (1.3M times a 70% working-age share and 80%
   participation). And the model books migrants with a 70% college share at
   the destination's replacement cost written down for about ten years of
   tenure, about $500k each for the US, against the spreadsheet's domestic
   mix at remaining value at age 32, about $500k on its lower unit costs but
   for far fewer people. Together they make the model's migration transfer
   1.8 times the spreadsheet's for the US and 6 times for the OECD ex-US.
   The spreadsheet's treatment is the more conservative and the better
   documented; the model's migration flow and college-share assumptions are
   the two places in this note where the reader should discount.
4. *Scope of the regions.* The model's India + South Asia has 1.9 times the
   spreadsheet's Indian entrants, and Russia + CIS 2.4 times Russia's,
   because Pakistan, Bangladesh and Central Asia are young; the regional
   Russia net is less negative than the spreadsheet's Russia. The spreadsheet's country figures are the better read of Russia
   itself.

None of the note's conclusions turn on the level. The peak years, the
regional ordering, and the US dependence on immigration come from
demographics and the education mix, which the two models share. What the
spreadsheet changes is the size of the immigration offset for the rich
regions: on its conventions, the US stays marginally positive and the rest
of the G7 does not.

## Sources

- World Bank, *Government expenditure on education, total (% of GDP)*
  (SE.XPD.TOTL.GD.ZS), from UNESCO Institute for Statistics: world 4.16%
  (2019), 3.51% (2023); United States series and the 2009 peak.
- NCHS, *Births in the United States, 2024* (Data Brief 535) and *National
  Vital Statistics Reports* 74(1): 4,316,233 births in 2007, 3,628,934 in
  2024, total fertility rate 1.63.
- USDA (2017). *Expenditures on Children by Families, 2015*: $233,610
  through age 17 for a middle-income married-couple family, the 23% of GDP
  per capita rearing share.
- Lee, J.-W. and Lee, H. (2016). "Human Capital in the Long Run." *Journal
  of Development Economics* 122: attainment by level for ages 15-24 and
  25-64, 1870-2010, with projections to 2040 (OUP long-run files); Barro, R.
  and Lee, J.-W. (2013), v3 dataset by 10-year age group, 1950-2015.
- National Bureau of Statistics of China, *Communiqués of the Fifth, Sixth
  and Seventh National Population Censuses* (2000, 2010, 2020): persons with
  junior college and above per 100,000 (3,611; 8,930; 15,467); Ministry of
  Education statistical bulletins, gross tertiary enrollment ratio
  (1990-2023).
- UN DESA, *World Population Prospects 2024*, population by 5-year age
  group, medium variant (the reconstruction's age data; the projection's
  fertility path follows the low variant); Maddison Project Database 2023 (GDP per capita,
  2011$) and Our World in Data population series (Gapminder/HYDE/UN).
- *G7-BRIC human-capital model v4* (Google Sheets, 4 September 2026):
  2025 flows for the G7 and BRICs from World Bank cohorts, OECD Education
  and Pensions at a Glance, WHO life tables, and national migration
  statistics.
- `docs/HUMAN_CAPITAL.md` for the ledger's method, calibration, and prior
  art (Kendrick 1976; Eisner 1985; Mallatt 2026; Eurostat duration of
  working life).
