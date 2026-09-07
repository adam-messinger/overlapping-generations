# Are We Building Up or Drawing Down Human Capital?

*Research note, September 2026. Generated with `npm run human-capital:trajectory`
(default parameters; scenario and sensitivity runs noted where used).*

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

## Are we spending more or less than we used to?

The simulation starts in 2025 and cannot backcast this ledger, so the
history is outside the model. The pattern it projects forward, though, is the
one already visible in the data.

- Per child, spending is up. Total US education spending has held at about
  5.4 to 5.6% of GDP in recent years, having peaked at 6.7% in 2009 (World
  Bank/UIS series), while the US birth cohort fell from 4.32M in 2007 to
  3.63M in 2024 (NCHS). Fewer children, roughly the same share of a larger
  economy: more per child, less in aggregate relative to output.
- As a share of GDP, the world is spending less. World government education
  spending was 4.16% of GDP in 2019 and 3.51% in 2023 (World Bank, from
  UNESCO UIS).

The ledger's 13.5% of GDP is not comparable to those 4 to 6% education
shares: it also counts rearing to entry age and students' foregone earnings.
With rearing excluded the 2025 flow is 6.3% of GDP, close to the US total
education share, and with foregone earnings excluded it is 11.3%.

The model's forward answer is the same at every scope: the world spends a
slowly falling share of GDP on new human capital, spends more on each unit,
and from the 2040s (2050 without rearing, 2025 without foregone earnings)
charges more depreciation than it capitalizes.

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
- `docs/HUMAN_CAPITAL.md` for the ledger's method, calibration, and prior
  art (Kendrick 1976; Eisner 1985; Mallatt 2026; Eurostat duration of
  working life).
