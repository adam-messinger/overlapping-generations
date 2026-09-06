# Human-Capital Ledger

The `humanCapital` module is a diagnostic accounting layer over demographics
and the regional GDP path. Each year it answers two questions:

1. How much pre-workforce investment (room, board, care, and schooling) is
   embodied in the people who join the workforce this year, valued at what it
   would cost to produce them today?
2. How much of the workforce's embodied investment is used up this year, if
   each worker's human capital is written down straight-line over the time
   they are expected to actually spend in the workforce, again at today's
   replacement cost?

Both answers are banded by four education levels, because more education means
more years of upkeep before entry, more schooling stages, and a longer and
less interrupted career.

The module does **not** feed back into GDP, labor, capital, or demographics.
Changing its parameters changes the ledger, not the macro path (pinned in
`src/simulation.test.ts`). It is cost-based accounting in the tradition of
Kendrick (1976) and Eisner (1985), not the lifetime-income valuation of
Jorgenson and Fraumeni; see "Prior art" below for how it sits in that
literature.

Run the report:

```bash
npm run human-capital                      # default parameters
npm run human-capital -- --scenario=ssp3-70 --years=2025,2050,2100
```

## Education bands

| Band        | Meaning at workforce entry                          | Entry age | Schooling stage priced   | Retirement age (2025) | OECD expected working years |
|-------------|-----------------------------------------------------|-----------|--------------------------|-----------------------|-----------------------------|
| `primary`   | primary schooling only (ISCED 0-2)                  | 16        | 6 yr at 0.20 GDP/capita  | 61                    | ~32 |
| `secondary` | completed upper secondary or vocational (ISCED 3-4) | 18        | +6 yr at 0.25            | 63                    | ~37 |
| `tertiary`  | bachelor's-level degree (ISCED 5-6)                 | 22        | +4 yr at 0.40            | 66                    | ~39 |
| `advanced`  | master's, professional, or doctoral (ISCED 7-8)     | 26        | +3 yr at 0.50            | 68                    | ~38 |

Bands are ordered: a band completes every schooling stage below it, so the
schooling cost of a band is a prefix sum over stages.

Entrants come from demographics: the 1/20 of the young cohort that ages into
working age each year, split by the tertiary enrollment projection demographics
already carries. The non-college flow is split into `primary` and `secondary`
by a regional upper-secondary completion share that converges toward a
regional target; the college flow is split into `tertiary` and `advanced` by a
regional postgraduate share.

## Replacement cost of one entrant

```text
unitCost[region][band] = GDP per capita[region]
                         x ( rearingCostShare x entryAge[band]
                           + sum over stages <= band of stageYears x stageCostShare )
```

`rearingCostShare` (0.30) prices room, board, and care per child-year as a
fraction of GDP per capita. The USDA's out-of-pocket estimate for a
middle-income US family is about 0.23 of GDP per capita; National Transfer
Accounts child consumption including public education is about 0.45-0.50. The
default sits between them because schooling is priced separately.

Per-student schooling costs use total (public plus private) spending per
student as a fraction of GDP per capita from OECD Education at a Glance 2023
(primary 0.21, secondary 0.25, tertiary 0.38) and UNESCO UIS; the advanced
stage is set above the tertiary average for research-intensive per-student
costs.

Because every cost is a multiple of current GDP per capita, the ledger is a
**current-cost** (replacement-cost) account: the opening stock is revalued
each year as GDP per capita moves, and the closure identity holds on the
revalued stock.

## Useful life: expected time in the workforce

The useful life of an entrant's human capital is **not** retirement age minus
entry age. It is the expected number of years the entrant will actually spend
in the workforce before leaving for any cause. The module builds a workforce
survival curve from four exit channels and integrates it:

```text
S(0) = 1
S(t+1) = S(t) x (1 - death(t) - disability(t) - domestic(t))
L = sum over t < retirementAge - entryAge of S(t)
```

| Exit channel | Hazard | Calibration |
|--------------|--------|-------------|
| death | `mortalityBase x exp(0.08 x (age - 40)) x exp(0.06 x (75 - LE)) x band multiplier` | 0.2%/yr at 40 in a LE-75 population, ~1%/yr at 60 (HMD life tables); SSA/OECD working-age mortality ratio ~3x (WHO GHE 2021); education gradient ~1.5x (Case and Deaton 2021) |
| disability | `disabilityBase x exp(0.06 x (age - 40)) x band multiplier` | SSA disability awards ~2-3 per 1,000 at 40 rising to ~15 at 60; a 20-year-old has ~25% chance of a disability spell before retirement; 2-3x for the least educated |
| domestic / non-participation | constant hazard over the first 15 years after entry that removes `domesticExitShare x band multiplier` of the vintage | half the male-female participation gap relative to male participation (ILOSTAT 2023): OECD 0.12, China 0.09, India 0.29, LatAm 0.15, SE Asia 0.13, Russia+CIS 0.11, MENA 0.36, SSA 0.08; falls steeply with attainment |
| retirement | everyone still active exits at the band's effective retirement age | OECD effective exit age ~64 (Pensions at a Glance 2023); college/non-college gap 2-3 yr (Rutledge 2018); extends with life expectancy under capital's `retirementAgeResponse` |

With the default hazards the OECD expected working lives are about 32, 37,
39, and 38 years by band, against Eurostat's duration-of-working-life
indicator by attainment (EU-27, 2023: ISCED 0-2 about 31 years, ISCED 3-4
about 36, ISCED 5-8 about 40). India and MENA are much lower for the primary
and secondary bands because the domestic-role exit is large there.

The retirement age rule is read from the capital module's parameters so the
pension block and this ledger never disagree about working life.

## Depreciation and write-offs

Each region-band keeps an entry-year vintage ledger. For a vintage `age` years
after entry, headcount `n`, unit cost `c`, and useful life `L`:

```text
book value before   = c x max(0, 1 - age/L)
exits               = n x (death + disability + domestic)
write-off           = exits x book value before
depreciation slice  = min(c/L, book value before) on survivors   (straight line)
book value after    = c x max(0, 1 - (age+1)/L)
retirement          = all survivors leave at the effective retirement age
```

A vintage that outlives its expected working life is fully depreciated but
stays in service at zero book value until it retires, exactly like a fully
depreciated machine still on the floor. Gross stock is the replacement cost
of every in-service vintage; net stock is their remaining book value.

The 2025 ledger is seeded from demographics' education-split working stock by
assuming a uniform age distribution over the 45-year working cohort (the same
assumption demographics makes when it ages 1/45 of the cohort out each year),
thinned by the survival curve, so the seeded ledger starts in its steady
state.

## Closure identities (tested)

```text
netStock_t = netStock_{t-1} x (c_t / c_{t-1}) + investment - depreciation - writeOffs
steady state (constant entrants, cost, life):
    depreciation + writeOffs = investment
    exits                    = entrants
    with no exit hazards:  netStock = grossStock / 2,  in service = entrants x (L - 1)
```

## Outputs

| Output | Unit | Meaning |
|--------|------|---------|
| `humanCapitalInvestment` | $T/yr | pre-workforce cost embodied in this year's entrants |
| `humanCapitalDepreciation` | $T/yr | straight-line write-down of in-service human capital |
| `humanCapitalWriteOffs` | $T/yr | book value of pre-retirement exits (death, disability, domestic role) |
| `humanCapitalNetInvestment` | $T/yr | investment - depreciation - write-offs |
| `humanCapitalGrossStock`, `humanCapitalNetStock` | $T | end-of-year replacement cost / book value |
| `humanCapitalInvestmentGdpShare`, `humanCapitalDepreciationGdpShare` | fraction | flows relative to GDP |
| `humanCapitalNetStockToPhysical` | ratio | net human-capital stock / physical capital stock |
| `workforceEntrants`, `workforceExits` | people/yr | global entrants; exits for all causes including retirement |
| `humanCapitalByBand` | record | per band: entrants, unit cost, useful life, flows, stocks, workers in service, exits by cause |
| `regionalHumanCapital` | record | per region: entrants, flows, stocks, investment/GDP |

## What the default path shows

With default parameters the 2025 ledger capitalizes about 11% of world GDP a
year in new entrants and charges about the same in depreciation plus
write-offs. The flows diverge by region in the way the age structure implies:
Sub-Saharan Africa, MENA, and India invest well above depreciation (a growing,
younger workforce), while China and the OECD already charge more than they
add. Globally the tertiary band overtakes the secondary band as the largest
investment flow by the 2030s, and by 2100 the ledger runs a net disinvestment
as entrant cohorts shrink while the in-service stock ages.

## Prior art and method alignment

A September 2026 literature scan found no single paper that does exactly
this: an education-banded, cost-based ledger that capitalizes rearing plus
schooling at current replacement cost and depreciates it straight-line over an
expected working life estimated from all-cause workforce exit, projected by
world region to 2100. Every component, however, has a precedent, and the
choices below are either standard practice or a documented departure from it.

**Closest precedents.**

- Mallatt, J. (2026), *An Accounting Framework for Human Capital*, BEA
  Working Paper 2026-6. A US cost-based and income-based account for
  1994-2023. Cost-based investment (direct education spending plus student
  and parent time) averages 10% of adjusted GDP; the stock uses a perpetual
  inventory with a geometric rate derived from a 40-45 year cohort service
  life (4.4-7.5%/yr), while noting that a declining-balance path "may not be
  right" for human skills, that earlier methods over-depreciate, and that
  education-specific mortality (Case and Deaton) is a desirable extension.
- Kendrick (1976). Rearing costs to age 14, education, half of health and
  safety spending, mobility, and students' foregone earnings, accumulated by
  perpetual inventory and depreciated by modified double-declining balance.
  Graham and Webb (1979) showed lifetime-income profiles appreciate until
  mid-career and then decline almost straight-line, and concluded Kendrick
  over-depreciated.
- Eisner (1978, 1985, 1989), Total Incomes System of Accounts. Straight-line
  depreciation over a 50-year life; excluded rearing but valued non-market
  household inputs. The straight-line choice here follows Eisner.
- Judson (2002). Weights educational attainment by current spending per
  student by level, i.e. a replacement-cost gross stock by education level.
- Lisbon Council, *European Human Capital Index* (Ederer 2006). A cost-based
  "human capital endowment" (parental education, schooling, university, adult
  education, learning on the job) depreciated for obsolescence and
  forgetting, with a separate utilisation ratio for the share in work.
- Income-based accounts: Jorgenson and Fraumeni (1989, 1992); Christian
  (2010, 2012) for the BEA; Gu and Wong (2010) for Statistics Canada; the
  World Bank *Changing Wealth of Nations* (2021). These back depreciation out
  of aging, survival tables, participation, and a retirement age (75 in
  Jorgenson-Fraumeni, 74 or 80 in later accounts), and decompose the change
  in the stock into births, education, migration, aging, and deaths.
- Method reviews: Le, Gibson and Oxley (2003); Boarini, Mira d'Ercole and
  Liu (OECD 2012), which also records national cost-based applications
  (Kokkinen for Finland, Ewerhart for Germany, Dutch firm-specific capital);
  the UNECE *Guide on Measuring Human Capital* (2016); Abraham (2022).

**Where the ledger follows accepted practice.**

- Perpetual inventory at current (replacement) cost is the cost-based
  standard; Kendrick argued current-price net stocks approximate market
  value, and BEA fixed-asset accounts are current-cost.
- Straight-line over a working life is Eisner's convention and is better
  supported than Kendrick's accelerated schedule given Graham and Webb (1979)
  and Mallatt (2026).
- Survival tables, participation, and a retirement age determine working
  life in every income-based account; the ledger imports that machinery into
  a cost-based stock, which the cost-based literature has not done. The
  resulting band lives (about 32/37/39/38 years for the OECD) are shorter
  than Mallatt's 40-45 year cohort service life because they net out
  participation exits, and they match Eurostat's duration-of-working-life
  indicator by attainment.
- Education-specific mortality is included, which Mallatt lists as future
  work.
- The decomposition into investment, depreciation, write-offs by cause, and
  retirements mirrors the births/education/aging/deaths decomposition of the
  income-based accounts, in cost rather than value terms.

**Where the ledger departs, and what a refinement would change.**

1. *Rearing scope.* Kendrick capitalized necessities to age 14; Eisner and
   Mallatt exclude rearing; Bowman (1962) objected to capitalizing it at all.
   The ledger capitalizes room, board, and care through the band's entry age
   (16-26), the inclusive end of the range. A `rearingEndAge` cap would give a
   Kendrick-style sensitivity; with rearing removed, the 2025 investment
   flow falls from about 11% to about 4% of world GDP.
2. *Foregone earnings and parental time.* Kendrick, Eisner, Abraham, and
   Mallatt all count students' foregone earnings and (Mallatt) parental time.
   The ledger prices only explicit outlays, so its tertiary and advanced unit
   costs are understated by roughly the entrant-age wage times years in
   school (2-3 GDP per capita). This is the most defensible next addition.
3. *Post-entry investment.* Kendrick and the Lisbon Council capitalize
   training and learning on the job, and the income evidence shows human
   capital appreciating to mid-career. The ledger is deliberately a
   pre-workforce ledger, so its stock must not be read as total human
   capital; a post-entry training line would be a separate asset.
4. *Obsolescence.* Wage-based estimates put net skill depreciation at about
   1-1.5%/yr, lower for more educated workers (Arrazola and de Hevia 2004;
   Weber 2014); the Lisbon Council applies an obsolescence deduction. The
   ledger's depreciation is purely time-based. A geometric obsolescence term
   by band would be a small change but would make the schedule non-linear,
   so it is left as an explicit scenario choice rather than a default.
5. *Magnitude check.* Mallatt's US cost-based investment is about 10% of
   GDP for education alone including time costs; this ledger's 11% of world
   GDP is rearing plus explicit schooling with no time costs. Adding item 2
   would move the schooling component toward the BEA figure.

The recommendation is to keep the current structure (it is the cost-based
perpetual inventory with the income-based school's treatment of working
life), add foregone earnings as an optional stage cost, and expose rearing
scope and obsolescence as sensitivity dials rather than change the defaults.

## Interpretation limits

- **Cost, not value.** Replacement cost says nothing about the productivity or
  earnings of a worker. The income-based (Jorgenson-Fraumeni) value of the
  same workforce would be several times larger and would respond to wage
  premia, which this ledger ignores.
- **No foregone earnings.** Kendrick also counted the earnings students give
  up while in school; this ledger prices only explicit rearing and schooling.
- **Parental time is excluded.** Rearing cost is priced as consumption, not as
  the opportunity cost of caregivers' time.
- **Exits are permanent.** A worker who leaves for a domestic role or a
  disability spell does not return; the investment is written off, even
  though unpaid domestic production is real output outside the market
  workforce. Re-entry would lengthen useful lives, especially in the
  secondary and tertiary bands.
- **Hazards are stylized.** Age slopes and education gradients are single
  global shapes scaled by region only through life expectancy and the
  participation gap; there is no regional disability data behind them.
- **Entry timing.** All bands enter the ledger when demographics moves them
  into the working cohort at age 20; entry age differentiates cost and the
  age at which hazards apply, not the ledger's timing.
- **Regional stocks drift from demographics.** Migrants arrive in a region's
  working cohort without passing through its ledger, so regional (not global)
  in-service headcounts differ from demographics' working stocks.
- **No obsolescence or retraining.** Depreciation is purely time-based;
  skills do not become obsolete faster in some bands than others.

## Sources

- Kendrick, J. W. (1976). *The Formation and Stocks of Total Capital.* NBER.
  Cost-based human-capital accounting: rearing plus education, depreciated
  over working life.
- Eisner, R. (1985, 1989). *The Total Incomes System of Accounts.* Straight-
  line depreciation of human capital over a 50-year life.
- Graham, J. W. and Webb, R. H. (1979). "Stocks and Depreciation of Human
  Capital: New Evidence from a Present-Value Perspective." *Review of Income
  and Wealth* 25(2). Appreciation to mid-career, then near-straight-line
  decline; Kendrick over-depreciates.
- Mallatt, J. (2026). "An Accounting Framework for Human Capital." BEA
  Working Paper 2026-6. Cost-based and income-based US accounts, 1994-2023.
- Jorgenson, D. W. and Fraumeni, B. M. (1989). "The Accumulation of Human and
  Nonhuman Capital, 1948-84." The lifetime-income alternative this ledger
  deliberately does not implement.
- Abraham, K. G. (2010). "Accounting for Investments in Formal Education."
  *Survey of Current Business.* Education investment at 7-9% of US GDP.
- Abraham, K. G. (2022). "Measuring Human Capital." NBER Working Paper 30136.
- Judson, R. (2002). "Measuring Human Capital Like Physical Capital: What
  Does It Tell Us?" *Bulletin of Economic Research* 54(3).
- Le, T., Gibson, J. and Oxley, L. (2003). "Cost- and Income-based Measures
  of Human Capital." *Journal of Economic Surveys* 17(3).
- Boarini, R., Mira d'Ercole, M. and Liu, G. (2012). "Approaches to Measuring
  the Stock of Human Capital: A Review of Country Practices." OECD Statistics
  Working Paper 2012/04.
- UNECE (2016). *Guide on Measuring Human Capital.*
- Christian, M. S. (2012). "Human Capital Accounting in the United States:
  Context, Measurement, and Application." NBER/CRIW.
- Gu, W. and Wong, A. (2010). "Estimates of Human Capital in Canada: The
  Lifetime Income Approach." Statistics Canada 11F0027M no. 062.
- Ederer, P. (2006). *Innovation at Work: The European Human Capital Index.*
  Lisbon Council.
- Arrazola, M. and de Hevia, J. (2004). "More on the estimation of the human
  capital depreciation rate." *Applied Economics Letters* 11(3); Weber, S.
  (2014). "Human capital depreciation and education level." *International
  Journal of Manpower* 35(5).
- USDA (2017). *Expenditures on Children by Families, 2015.*
- Lee, R. and Mason, A. (2011). *Population Aging and the Generational
  Economy.* National Transfer Accounts child consumption profiles.
- OECD (2023). *Education at a Glance 2023*, Tables A1.1, B, C1.1; *Pensions
  at a Glance 2023*, effective labour-market exit ages.
- UNESCO UIS (2022). Upper-secondary completion rates; spending per student.
- Eurostat (2023). *Duration of working life by educational attainment*
  (`lfsi_dwl_a`).
- ILO ILOSTAT (2023). Labour force participation by sex and by educational
  attainment.
- US Social Security Administration (2022). *Annual Statistical Report on the
  Social Security Disability Insurance Program*; disability incidence by age
  and education.
- Case, A. and Deaton, A. (2021). "Life expectancy in adulthood is falling
  for those without a BA degree." *PNAS.*
- WHO (2021). *Global Health Estimates*, adult mortality by region.
- Rutledge, M. S. (2018). "What Explains the Widening Gap in Retirement Ages
  by Education?" Center for Retirement Research, Boston College.
