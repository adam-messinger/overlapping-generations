# Five-Year Generational Accounts

The `generations` module is a diagnostic accounting layer over the existing
demographics and capital modules. It answers two questions that the original
three-age-group model could not:

1. Which birth cohorts own productive capital, owe private debt, pay current
   transfers, and receive pensions, education, or bequests?
2. Which cohorts cannot fund a transparent desired acquisition of capital, and
   is the gap caused by an income-based borrowing limit or scarce credit?

The module does **not** feed back into GDP, capital accumulation, demographics,
or energy. Changing its parameters changes the diagnostic allocation, not the
macro path. This separation prevents an uncalibrated distributional overlay
from silently changing the established simulation.

## Cohorts and population

Accounts use five-year birth bins such as `1995-1999`. Each annual step maps the
regional young (0-19), working (20-64), and old (65+) stocks into birth bins.
The allocation exactly reconciles to all three demographic stocks in every
region. Old-age bins use a declining survival weight so the 65+ stock is not
spread uniformly through age 105.

Each regional cohort ledger carries:

- productive-capital assets and private liabilities;
- labor income and worker-financed taxes;
- education and pension/healthcare transfers;
- gross bequests given and received;
- own funds, allocated credit, desired capital, and funding gaps;
- cumulative taxes, transfers, bequests, and unfunded capital acquisition.

Global cohort accounts are sums of the eight regional accounts. Regional
accounts remain available because a globally aggregated birth cohort can hide
very different balance sheets and constraints.

## Flow incidence

The capital module does not contain an explicit tax system. The cohort layer
therefore uses a visible incidence convention:

```text
regional labor income = laborIncomeShare * regional GDP
worker taxes = retiree cost + child cost + allocated public debt service
```

Taxes are distributed across working cohorts in proportion to labor income.
Pension and healthcare spending goes to old cohorts; education goes to young
cohorts. These allocations reconcile exactly to the capital module's regional
and global flows.

## Productive assets, debt, and bequests

Initial productive-capital ownership and initial private liabilities each use
four explicit, scale-free age weights calibrated against pre-2013 Federal
Reserve DFA data, with ages 40–54 normalized to one. Assets: `0.241` for ages
20–39, `1.000` for 40–54, `1.182` for 55–69, and `1.202` for 70+. Liabilities:
`0.579`, `1.000`, `0.487`, and `0.198` on the same bands. Both distributions
are also scaled by regional income. All eight weights are scenario parameters;
each side's common scale is irrelevant because it allocates a fixed aggregate
stock.

Thereafter, ownership shares persist. Every step reconciles cohort assets and
liabilities to the capital module's exact beginning stocks. Mortality transfers
productive assets to working-age heirs, primarily ages 30-54. Only
`newCapitalFunderShare` (calibrated to `0.255`) of new general investment is
owned by its current cohort funders; the remainder accrues pro rata to
incumbent owners, reflecting ownership through retained corporate earnings,
pension claims, and revalued existing assets rather than direct purchase from
labor income. End-of-period ledgers reconcile exactly to `nextCapitalStock`
and `nextPrivateDebtStock`.
The capital module's aggregate debt transition applies amortization once.
Retained liabilities then preserve existing cohort shares, while newly issued
credit is allocated separately to cohorts with demand and borrowing headroom.

Bequests are currently gross transfers of productive-asset ownership. Estate
taxes, creditor seniority, trusts, and cross-border inheritance are not modeled.

## Desired and funded capital

Desired aggregate capital formation is deliberately simple and inspectable:

```text
implied depreciation = (K + general investment - next K) / K
desired capital = K * (implied depreciation + desiredNetCapitalGrowth)
```

The default desired net growth rate is 2% per year. Desired acquisition is
allocated toward younger working cohorts, which have the largest seed-capital,
housing, and business-investment needs. Own funds are allocated using the
capital module's regional saving rates and a lifecycle saving profile.

For each regional birth cohort:

```text
desired borrowing = max(0, desired capital - own funds)
borrowing headroom = max(0, income multiple * labor income - liabilities)
eligible credit = min(desired borrowing, borrowing headroom)
funded capital = min(desired capital, own funds + allocated credit)
funding gap = desired capital - funded capital
```

The default borrowing limit is four times annual labor income. Available macro
credit is allocated among cohorts with eligible demand.

Two gaps are reported:

- `cohortBorrowingLimitGap`: desired borrowing beyond the cohort's limit;
- `cohortCreditRationingGap`: borrowing within the limit that is not supplied
  because aggregate credit is scarce.

`aggregateCapitalFundingGap` is different: it compares total general investment
with replacement plus the 2% net-growth target. The cohort gap can be positive
even when the aggregate gap is zero, because older savers can own newly formed
capital while younger cohorts lack enough credit to acquire it themselves.

## Interpretation limits

These accounts identify model-implied exposure and access gaps; they are not a
solved heterogeneous-agent OLG equilibrium. In particular, the module has no:

- utility function, Euler equation, or endogenous desired consumption;
- wages by skill, employment risk, housing, or asset prices;
- explicit lenders, equity contracts, bankruptcy, or private interest service;
- government generational budget constraint or public-debt ownership;
- endogenous behavioral response to inheritance or a binding constraint.

Moreover, `assets` currently means the macro productive-capital stock, not a
survey concept of household wealth, and `liabilities` allocates the macro
private-debt stock (including corporate debt) to cohorts. Housing, land,
consumer durables, public bonds, and foreign positions are absent. The levels
therefore require external calibration before being compared with household
wealth surveys; the lifecycle and scenario differences are the useful signal.

The most defensible use is comparative: identify which cohorts bear flows and
how constraint measures change across savings, credit, debt, demographic, and
policy scenarios. A later version can feed calibrated cohort behavior back into
capital accumulation once these diagnostics are validated against household
wealth and debt data.

The first conditional historical replay and its reproducible data procedure are
in [GENERATIONAL_BACKCAST.md](GENERATIONAL_BACKCAST.md).
