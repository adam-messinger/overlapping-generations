# Are We Building Up or Drawing Down Human Capital?

*Research note, September 2026. Projections generated with
`npm run human-capital:trajectory` (default parameters; scenario and sensitivity
runs noted where used); the 1925-2025 reconstruction with
`scripts/human-capital-backcast.py`.*

## Question

Treat people times education as a capital asset: capitalize what it costs to
rear and school each workforce entrant, and depreciate that cost over the
years the entrant is expected to spend in the workforce. Then ask, region by
region and year by year, whether the stock is growing or shrinking, and
whether the world (and the United States in particular) is spending more or
less on it than before.

The ledger is the `humanCapital` module documented in `docs/HUMAN_CAPITAL.md`:
a Kendrick-style cost-based account at current replacement cost, four
education bands, straight-line depreciation over an expected working life
that nets out death, disability, domestic-role, and retirement exits. It is
diagnostic: it reads demographics and GDP and feeds nothing back.

## One accounting point first

The ledger prices every entrant as a multiple of the region's current GDP per
capita, so its dollar stock rises with income even when the workforce it
prices is shrinking. On the default path the world net stock goes from $321T
in 2025 to $4,348T in 2100, a 13-fold rise that is almost entirely
revaluation. To answer "growing or shrinking" the note deflates each region's
stock by that region's own GDP-per-capita index (2025 = 1). The result is a
constant-cost quantity: how many 2025-dollars of rearing and schooling are
embodied in the people at work, at 2025 prices.

## World

| Year | Investment $T | Depreciation + write-offs $T | Net $T | Investment / GDP | Constant-cost net stock (2025 = 1) | Entrants (M) | Tertiary+ share of workforce |
|------|------|------|------|------|------|------|------|
| 2025 | 21.4 | 20.7 | +0.7 | 13.5% | 1.00 | 119.2 | 24% |
| 2030 | 24.3 | 23.0 | +1.3 | 13.8% | 1.05 | 119.6 | 27% |
| 2040 | 32.6 | 31.8 | +0.8 | 13.7% | 1.16 | 118.8 | 37% |
| 2050 | 44.6 | 46.2 | -1.6 | 13.2% | 1.24 | 116.3 | 45% |
| 2060 | 59.8 | 65.8 | -5.9 | 12.7% | 1.27 | 112.8 | 52% |
| 2075 | 89.3 | 103.7 | -14.5 | 12.1% | 1.26 | 106.7 | 59% |
| 2100 | 214.6 | 253.4 | -38.8 | 11.2% | 1.19 | 95.7 | 59% |

Three things stand out.

1. **The world is still building, but the build is ending.** The
   constant-cost stock grows about 1.1% a year through the early 2030s, half
   that by the 2040s, peaks in 2063 at 27% above 2025, and then drifts down
   about 0.2% a year to end 19% above 2025. Net investment at current cost
   turns negative in 2045; in constant-cost terms the turn comes in the
   2060s because the revaluation of the opening stock is not a charge.
2. **What is being built is education, not headcount.** Entrants fall from
   119M to 96M a year, but the tertiary-plus share of the in-service
   workforce goes from a quarter to three-fifths, and a tertiary entrant
   carries about 2.3 times the cost of a secondary one. Nearly all of the
   quantity growth to 2060 is composition; from the 2080s the tertiary
   headcount is itself falling.
3. **The spending share slips, not collapses.** Investment runs 13.5% of
   GDP now and 11.2% in 2100, because entrant cohorts shrink relative to GDP
   while per-entrant cost tracks income. Spending per entrant rises
   throughout; spending on entrants as a whole loses two points of GDP over
   the century.

## By region

Constant-cost net stock index (2025 = 1), the peak year of that index, the
first year own-cohort net investment is negative, the same including
migration transfers, and the change in annual entrants over the century.

| Region | 2030 | 2050 | 2075 | 2100 | Peak | Peak level | Net < 0 | Net + migration < 0 | Entrants 2100 / 2025 |
|--------|------|------|------|------|------|------|------|------|------|
| United States | 1.11 | 1.37 | 1.46 | 1.49 | 2100 | 1.49 | 2035 | 2065 | 0.95 |
| OECD ex-US | 1.05 | 1.27 | 1.40 | 1.44 | 2100 | 1.44 | 2025 | 2086 | 1.11 |
| China | 0.94 | 0.76 | 0.58 | 0.42 | 2025 | 1.00 | 2025 | 2025 | 0.36 |
| India + South Asia | 1.15 | 1.62 | 1.52 | 1.27 | 2057 | 1.65 | 2061 | 2057 | 0.56 |
| Latin America | 1.04 | 1.16 | 1.07 | 0.88 | 2055 | 1.16 | 2069 | 2053 | 0.56 |
| SE Asia + Pacific | 1.04 | 1.25 | 1.21 | 1.00 | 2059 | 1.28 | 2072 | 2058 | 0.61 |
| Russia + CIS | 0.98 | 0.95 | 0.85 | 0.71 | 2025 | 1.00 | 2025 | 2025 | 0.59 |
| MENA | 1.24 | 1.98 | 2.09 | 1.97 | 2066 | 2.11 | 2056 | 2063 | 0.84 |
| Sub-Saharan Africa | 1.38 | 2.99 | 3.90 | 4.17 | 2100 | 4.17 | never | never | 1.26 |
| World | 1.05 | 1.24 | 1.26 | 1.19 | 2063 | 1.27 | 2045 | | 0.80 |

The regions fall into four groups.

- **Drawing down from today: China, Russia + CIS.** China charges more
  depreciation than it capitalizes in every year of the run. Its entrant
  cohort falls by nearly two-thirds and its constant-cost stock by 58% by
  2100, even though the rising college share means each entrant embodies
  more. In current dollars the Chinese stock still rises about 12-fold, which is
  the revaluation trap: a shrinking, better-educated workforce repriced at
  higher income looks like accumulation. Russia + CIS follows the same shape
  at a gentler slope.
- **Building to the 2050s, then drawing down: India + South Asia, Latin
  America, SE Asia + Pacific, MENA.** These are the demographic-dividend
  regions. India peaks in 2057 at 1.65 times its 2025 stock and gives back
  a quarter of the gain by 2100. MENA doubles and holds. India, Latin
  America, and SE Asia are net exporters of trained people, and the outflow
  brings their turning points forward by 4 to 16 years; MENA is a small net
  receiver and its turn comes later once migration is counted.
- **Building throughout: Sub-Saharan Africa.** The only region whose
  entrant cohort is larger in 2100 than in 2025, and the only one whose
  own-cohort net investment never turns negative. Its stock quadruples,
  from a base that is 3% of the world total.
- **Building only through immigration: United States, OECD ex-US.** Both
  rich-region stocks rise through 2100, but own-cohort net investment is
  negative from 2025 in the OECD ex-US and from 2035 in the US. What keeps
  the stocks growing is the migration transfer: working-age arrivals booked
  at the destination's replacement cost. That transfer covers the own-cohort
  deficit until the mid-2060s (US) and the mid-2080s (OECD ex-US).

## The United States

| Year | Entrants (M) | Investment $T | Charge $T | Own-cohort net $T | Migration transfer $T | Net incl. migration $T | Investment / GDP |
|------|------|------|------|------|------|------|------|
| 2025 | 4.1 | 3.98 | 3.58 | +0.40 | 0.91 | +1.31 | 16.6% |
| 2035 | 4.0 | 4.64 | 4.69 | -0.05 | 1.14 | +1.09 | 15.6% |
| 2050 | 4.0 | 6.89 | 8.01 | -1.11 | 1.79 | +0.68 | 14.6% |
| 2075 | 3.9 | 13.02 | 16.52 | -3.50 | 3.43 | -0.07 | 13.6% |
| 2100 | 3.9 | 32.92 | 41.92 | -9.00 | 8.43 | -0.58 | 12.9% |

The US invests the largest share of GDP of any region in 2025 outside MENA
and Sub-Saharan Africa, because its entrants are expensive (a 42% college
share and the world's highest GDP per capita) rather than numerous. Its
entrant cohort is flat at about 4.0M a year for the whole century, held up by
a 1.4 fertility floor and net immigration of about 1.2M a year (UN WPP 2024
and CBO 2025 assumptions in `demographics.ts`). The own-cohort account turns
negative in 2035, when the large cohorts now in mid-career start to retire
faster than the flat entrant flow replaces them. Immigration is worth about a
fifth of gross additions throughout, and it is what keeps the US stock
growing. With migration switched off everywhere
(`--set=demographics.migrationMultiplier=0`, which also removes migrants'
children from future cohorts), US entrants fall by a third instead of 5%,
the US constant-cost stock peaks in 2049 at 1.10 and ends the century at
0.91, and the OECD ex-US stock declines from 2025 to 0.79 by 2100. The US
result is therefore an immigration-policy result at least as much as a
demographic one.

## The prior 100 years

The simulation starts in 2025 and cannot run backwards, so the century before
it is reconstructed from observed data and priced with the same ledger. The
stock is people aged 25-64 times their education (Lee and Lee's long-run
attainment series, 1870-2040, and Barro-Lee by age group), valued at the
ledger's replacement-cost multipliers; entrants are the population aged 20-24
divided by five, with the attainment mix of the cohort five years on. Costs
are multiples of GDP per capita (Maddison), so investment and stock relative
to GDP depend only on demographics and education, and the constant-cost stock
holds each region's 2025 unit cost fixed. Countries are grouped into the
model's nine regions so that the 2025 totals match the model's population
anchors within a few percent (Sub-Saharan Africa is the exception, at 12%
below). Lee-Lee and Barro-Lee count China's completed tertiary attainment at
about 3% of ages 25-64 in 2015, far below the census, so China's tertiary
shares from 2000 on are overridden with the NBS census communiqués (junior
college and above, rescaled to ages 25-64) and the Ministry of Education's
gross tertiary enrollment ratio for entrants, ending at the model's own 2025
anchor. Before 1950 the level follows each region's total population from
the 1950 age structure, with Lee-Lee supplying the education mix and the
change in age shares, because its pre-1950 country series sit on older
territories (British India, the USSR). The headline series is
gross (no age-based write-down) so that it can reach back to 1925; a net
series from the age structure is given below from 1950. Method and sources
are in the script header.

![Human capital at constant cost, 1925-2100, by region](human-capital-trajectory-figure.svg)

| Year | Population 25-64 (M) | Entrants (M/yr) | Tertiary share of 25-64 | Entrants / population | Investment / GDP | Gross stock / GDP | Constant-cost stock (2025 = 1) |
|---|---|---|---|---|---|---|---|
| 1925 | 816 | 37 | 1% | 1.9% | 11.9% | 2.8 | 0.17 |
| 1950 | 1,042 | 44 | 1% | 1.8% | 12.4% | 3.1 | 0.23 |
| 1975 | 1,575 | 72 | 3% | 1.8% | 14.8% | 3.4 | 0.37 |
| 2000 | 2,778 | 104 | 9% | 1.7% | 14.4% | 4.4 | 0.70 |
| 2010 | 3,342 | 124 | 12% | 1.8% | 15.7% | 4.7 | 0.85 |
| 2025 | 4,083 | 125 | 13% | 1.5% | 14.2% | 5.0 | 1.00 |

The world's stock of pre-workforce human capital grew about sixfold over the
century, 1.8% a year: 1.6 points of that is more people of working age and
0.2 points is more education per person. Growth accelerated through each
quarter-century, from 1.3% a year in 1925-1950 to a peak of 2.5% in
1975-2000, then slowed to 1.4% in 2000-2025 and 0.9% in the last decade. The model's 1.1% for the late
2020s, falling to zero by the 2060s, is the continuation of that
deceleration, not a break from it.

Constant-cost stock index (2025 = 1), reconstruction to 2025 and model after:

| Region | 1925 | 1950 | 1975 | 2000 | 2025 | 2050 | 2075 | 2100 | 1925-2025 (%/yr) | 2025-2100 (%/yr) |
|---|---|---|---|---|---|---|---|---|---|---|
| United States | 0.21 | 0.32 | 0.50 | 0.81 | 1.00 | 1.33 | 1.52 | 1.55 | +1.6 | +0.6 |
| OECD ex-US | 0.29 | 0.39 | 0.57 | 0.89 | 1.00 | 1.26 | 1.43 | 1.50 | +1.2 | +0.5 |
| China | 0.12 | 0.14 | 0.26 | 0.65 | 1.00 | 0.84 | 0.63 | 0.46 | +2.2 | -1.0 |
| India + South Asia | 0.09 | 0.12 | 0.21 | 0.51 | 1.00 | 1.37 | 1.53 | 1.31 | +2.4 | +0.4 |
| Latin America | 0.07 | 0.12 | 0.24 | 0.57 | 1.00 | 1.08 | 1.07 | 0.91 | +2.7 | -0.1 |
| SE Asia + Pacific | 0.07 | 0.11 | 0.21 | 0.51 | 1.00 | 1.14 | 1.20 | 1.03 | +2.7 | +0.0 |
| Russia + CIS | 0.22 | 0.30 | 0.56 | 0.89 | 1.00 | 0.96 | 0.88 | 0.75 | +1.5 | -0.4 |
| MENA | 0.05 | 0.08 | 0.14 | 0.41 | 1.00 | 1.64 | 2.09 | 2.03 | +2.9 | +0.9 |
| Sub-Saharan Africa | 0.07 | 0.10 | 0.19 | 0.43 | 1.00 | 2.33 | 3.68 | 4.12 | +2.7 | +1.9 |
| World | 0.17 | 0.23 | 0.37 | 0.70 | 1.00 | 1.19 | 1.29 | 1.24 | +1.8 | +0.3 |

Every region but one built human capital in every quarter-century of the
last hundred years; the exception is Russia + CIS, whose series falls in
1940-1945 and again after 2020. The century ahead
is the first in which any region draws down by choice of fertility rather
than by catastrophe. China's reversal is the sharpest in the table: from the
fastest builder of 1975-2000 (3.7% a year), and still 1.7% a year in
2000-2025, to a 1% a year decline. Russia + CIS has already stalled, with
its 2025 stock below 2015, and the OECD ex-US grew only 0.1% a year in the
last decade. The regions that grew fastest in the past century (MENA,
Latin America, SE Asia, Sub-Saharan Africa, all between 2.7% and 2.9% a
year) are the ones with the most building left, and only Sub-Saharan
Africa keeps anything like its historical pace.

The same splice on a net basis, with each age group written down
straight-line over its band's expected working life (Barro-Lee's 10-year
age groups from 1950, cohort-shifted after 2015), tracks the model's own
net stock:

| Region | 1950 | 1975 | 2000 | 2025 | 2050 | 2075 | 2100 | Net / gross 1950 | Net / gross 2025 |
|---|---|---|---|---|---|---|---|---|---|
| United States | 0.30 | 0.50 | 0.83 | 1.00 | 1.37 | 1.46 | 1.49 | 0.37 | 0.40 |
| OECD ex-US | 0.31 | 0.56 | 0.96 | 1.00 | 1.27 | 1.40 | 1.44 | 0.28 | 0.34 |
| China | 0.11 | 0.23 | 0.71 | 1.00 | 0.76 | 0.58 | 0.42 | 0.26 | 0.36 |
| India + South Asia | 0.09 | 0.16 | 0.48 | 1.00 | 1.62 | 1.52 | 1.27 | 0.28 | 0.38 |
| Latin America | 0.10 | 0.21 | 0.59 | 1.00 | 1.16 | 1.07 | 0.88 | 0.30 | 0.37 |
| SE Asia + Pacific | 0.09 | 0.19 | 0.51 | 1.00 | 1.25 | 1.21 | 1.00 | 0.30 | 0.36 |
| Russia + CIS | 0.23 | 0.50 | 0.90 | 1.00 | 0.95 | 0.85 | 0.71 | 0.30 | 0.39 |
| MENA | 0.05 | 0.11 | 0.40 | 1.00 | 1.98 | 2.09 | 1.97 | 0.27 | 0.39 |
| Sub-Saharan Africa | 0.08 | 0.15 | 0.39 | 1.00 | 2.99 | 3.90 | 4.17 | 0.28 | 0.38 |
| World | 0.19 | 0.35 | 0.73 | 1.00 | 1.24 | 1.26 | 1.19 | 0.30 | 0.37 |

The net stock grew faster than the gross one (2.2% a year for the world
since 1950 against 2.0%), because the book value of the workforce rose
from 30% to 37% of replacement cost as it filled with recent,
better-educated entrants; the OECD ex-US has been flat on a net basis
since 2000 and Russia + CIS nearly so. The model's net stock in 2025 is 45% of gross,
above the reconstruction's 37%, because it prices the in-service workforce
rather than everyone aged 25-64. The two series agree on direction and
turning points, so the splice does not depend on the gross/net choice.

## Are we spending more or less than we used to?

Investment in new entrants as a share of GDP, reconstructed:

| Region | 1925 | 1950 | 1975 | 2000 | 2010 | 2025 |
|---|---|---|---|---|---|---|
| United States | 14.1% | 13.9% | 18.6% | 15.2% | 16.4% | 15.4% |
| OECD ex-US | 12.3% | 12.1% | 13.7% | 13.2% | 12.5% | 11.4% |
| China | 8.9% | 11.0% | 15.6% | 14.0% | 18.6% | 13.3% |
| India + South Asia | 7.8% | 9.6% | 11.4% | 14.6% | 15.7% | 16.6% |
| Latin America | 10.7% | 10.9% | 13.1% | 15.5% | 15.9% | 15.6% |
| SE Asia + Pacific | 9.9% | 10.6% | 11.9% | 15.2% | 15.8% | 15.9% |
| Russia + CIS | 18.9% | 17.9% | 17.3% | 17.4% | 20.7% | 13.2% |
| MENA | 9.4% | 9.4% | 11.3% | 15.7% | 17.3% | 16.5% |
| Sub-Saharan Africa | 9.5% | 9.7% | 10.5% | 12.7% | 13.2% | 15.8% |
| World | 11.9% | 12.4% | 14.8% | 14.4% | 15.7% | 14.2% |

The world spends more of its output on new human capital than it did a
century ago, and less than it did fifteen years ago. The share rose from
about 12% of GDP in 1925 to a peak near 16% in 2010 as the education mix
upgraded faster than cohorts shrank, and has since fallen back to 14% as
the youth share of population dropped from 1.8% to 1.5%. Per entrant, the
world spends 1.7 times its 1925 multiple of GDP per capita on rearing and
schooling (5.7 to 9.8 times GDP per capita), and GDP per capita is itself
far higher. The model's 13.5% for
2025 sits within a point of the reconstruction, and its slow decline to 11%
by 2100 continues the post-2010 slide.

The United States:

| Year | Entrants (M/yr) | Entrants / population | Entrant tertiary share | Workforce 25-64 (M) | Tertiary share of 25-64 | Investment / GDP | Constant-cost stock (2025 = 1) |
|---|---|---|---|---|---|---|---|
| 1925 | 1.90 | 1.70% | 8% | 53 | 5% | 14.1% | 0.21 |
| 1940 | 2.17 | 1.67% | 10% | 65 | 6% | 14.9% | 0.27 |
| 1950 | 2.35 | 1.53% | 13% | 77 | 8% | 13.9% | 0.32 |
| 1960 | 2.22 | 1.23% | 16% | 84 | 10% | 11.8% | 0.37 |
| 1970 | 3.47 | 1.67% | 25% | 92 | 14% | 17.4% | 0.44 |
| 1980 | 4.35 | 1.89% | 32% | 110 | 22% | 20.5% | 0.57 |
| 1990 | 3.86 | 1.52% | 33% | 131 | 28% | 16.8% | 0.70 |
| 2000 | 3.89 | 1.38% | 33% | 148 | 29% | 15.2% | 0.81 |
| 2010 | 4.46 | 1.44% | 41% | 166 | 33% | 16.4% | 0.92 |
| 2020 | 4.45 | 1.31% | 40% | 178 | 33% | 15.0% | 1.00 |
| 2025 | 4.61 | 1.34% | 40% | 178 | 33% | 15.4% | 1.00 |

The US series has one large hump: the baby boom entering the workforce
with the first mass college cohorts, which took investment from under 12%
of GDP in 1960 to over 20% in 1980. Since then the share has drifted between
15% and 17%, more education per entrant offsetting a falling youth share.
The stock grew 1.6% a year over the century (1.2 points people, 0.4
education), but only 0.4% a year in the last decade, and the 25-64
population has been flat since 2020. The reconstruction reaches 2025 with
the US stock already at a plateau; the model's 1.1% a year growth to 2050
therefore rests on its immigration assumption and on entrants' college
share continuing to rise, as the previous section shows.

Outside data say the same. Total US education spending has held at about
5.4 to 5.6% of GDP in recent years, having peaked at 6.7% in 2009 (World
Bank/UIS series), while the US birth cohort fell from 4.32M in 2007 to 3.63M
in 2024 (NCHS). World government education spending was 4.16% of GDP in
2019 and 3.51% in 2023 (World Bank, from UNESCO UIS). The ledger's 14% is
not comparable to those 4 to 6% education shares: it also counts rearing to
entry age and students' foregone earnings. With rearing excluded the model's
2025 flow is 6.3% of GDP, close to the US total education share, and with
foregone earnings excluded it is 11.3%.

## Robustness

- **Energy and climate scenarios do not move the quantity path.** `ssp3-70`
  and `net-zero` produce identical constant-cost stocks, entrant flows, and
  regional peak years to the default run; only the dollar values differ,
  because those scenario files leave demographics untouched. The
  human-capital trajectory in this model is a demographic and education
  result, not an energy one.
- **Cost scope shifts levels and the world turning point, not the regional
  ordering.** Removing rearing raises every region's index (more of the cost
  is education, which is what is growing) and moves the world net-investment
  turn from 2045 to 2050; removing foregone earnings moves it to 2025.
  Peak years move by at most two years, except that Russia + CIS's flat
  stock becomes a slight rise to 2048 without rearing; the four regional
  groups are unchanged in both cases.

## What the result does not say

- Cost is not value. A lifetime-income (Jorgenson-Fraumeni) account would be
  several times larger and would respond to wage premia this ledger ignores.
- Post-entry training, learning on the job, and obsolescence are outside the
  ledger; a shrinking pre-workforce stock is compatible with rising skill if
  on-the-job investment grows.
- Immigrants are booked at the destination's full replacement cost with no
  under-employment discount, so the rich-region migration transfers are an
  upper bound.
- The reconstruction prices everyone aged 25-64, not the in-service
  workforce: the model nets out domestic-role and disability exits, the
  reconstruction cannot, because participation by age and education is not
  observed before the 1990s. That is a level difference (the net/gross
  ratios above), and where participation rose over the century, as women's
  did in the OECD after 1950, the in-service stock grew faster than the
  series shows. Migration is inside the population counts, so the stock is
  complete, but the flows are not split between births and arrivals.
- China's tertiary shares are census and enrollment based from 2000 on
  (see the method note), a correction to the source rather than an
  observation of attainment by age; the Barro-Lee age profile is scaled to
  the census total. Before 1950 the covered countries are scaled to regional
  population totals, which assumes uncovered countries had the covered
  average attainment; Russia + CIS and India before 1950 rest on Lee-Lee's
  Soviet-era and British-India series, used only as ratios, and should be
  read as rough.
- Demographics follow the UN WPP 2024 low variant, so entrant cohorts
  outside Sub-Saharan Africa shrink faster than a medium-variant path would
  give; the medium variant would delay every peak year but not remove the
  ordering.

## Sources

- World Bank, *Government expenditure on education, total (% of GDP)*
  (SE.XPD.TOTL.GD.ZS), from UNESCO Institute for Statistics: world 4.16%
  (2019), 3.51% (2023); United States series and the 2009 peak.
- NCHS, *Births in the United States, 2024* (Data Brief 535) and *National
  Vital Statistics Reports* 74(1): 4,316,233 births in 2007, 3,628,934 in
  2024, total fertility rate 1.63.
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
  group, medium variant; Maddison Project Database 2023 (GDP per capita,
  2011$) and Our World in Data population series (Gapminder/HYDE/UN).
- `docs/HUMAN_CAPITAL.md` for the ledger's method, calibration, and prior
  art (Kendrick 1976; Eisner 1985; Mallatt 2026; Eurostat duration of
  working life).
