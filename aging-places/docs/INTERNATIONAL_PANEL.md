# International municipal panel: frozen protocol

Status: **pre-registered before acquisition of any post-2020 Japanese municipal outcome file**.
The repository already contained national-level Japanese facts and qualitative hypotheses. No
municipality-level Japanese price, vacancy, population, or household outcome after 2020 was opened
while writing this protocol.

This document freezes the first international test of the aging-places mechanism. Its purpose is
to prevent the Japan exercise from becoming a search for examples that make the US model look
right. A later commit may add source table identifiers and translations, but changes to a frozen
choice below must be recorded in the deviation log before the affected outcome is opened.

## 1. Question and allowed claim

The primary question is:

> Given an origin-year municipal age structure and place characteristics, does the frozen
> demographic-attraction mechanism predict where working-age people and households subsequently
> concentrate within Japanese functional markets better than simple trend baselines?

Japan is an external regime test because municipal aging, household contraction, and vacant stock
are already observable at a scale the US projection has not yet experienced. It is not assumed to
share US coefficients or institutions.

Passing this protocol permits the phrase **internationally validated resilience signal** for the
channels that pass. Failure leaves the mechanism labeled **scenario tooling**. Land-price results
alone cannot earn the validation label if the population and household chain fails.

## 2. Frozen analysis geography

- Unit: Japanese municipality harmonized to boundaries in force at the 2020 Population Census.
- Earlier municipalities are summed through official municipality-code succession records. No
  historical value is split using a later outcome. If an exact aggregation is impossible, the unit
  is flagged and excluded from the primary common sample.
- Wards of ordinance-designated cities are aggregated to their parent city. Tokyo's 23 special
  wards remain separate municipalities because they are independent local governments.
- Municipal changes after October 2020 are mapped back to the frozen 2020 unit.
- Primary universe: origin population at least 10,000. A population-at-least-15,000 common sample
  is used for Housing and Land Survey comparisons because official municipal publication is
  coverage-limited.
- Evacuated Fukushima municipalities remain in the primary data with a pre-outcome disaster flag.
  A sensitivity excluding municipalities subject to mandatory evacuation may be reported, but it
  cannot replace the primary result.
- Northern Territories and records without a standard municipality code are excluded.

Boundary processing must produce a row-level audit file with source code, target code, operation
(`unchanged`, `aggregate`, or `excluded`), and reason. Aggregate population and household totals
must reconcile to published prefectural totals within rounding error.

## 3. Functional markets

Functional markets are derived from origin-year Population Census municipality-to-municipality
commuting flows, not from prefectural borders or end-period prices.

The frozen algorithm is:

1. For each municipality, find the external municipality receiving the largest number of its
   resident workers.
2. Link to that destination only when the flow is at least 10% of employed residents; otherwise the
   municipality links to itself.
3. Follow links to a self-linked municipality or a directed cycle. All municipalities ending at
   the same sink or cycle form one commuting basin; every member of a cycle is one joint sink.
4. Apply the 2020-boundary crosswalk before calculating basin metrics.

Tokyo's official 2010 matrix publishes the 23 special wards as one origin (`13100`). Per the
deviation logged below, the ward outcomes remain separate, while all 23 receive the basin derived
from that aggregate origin and are explicitly flagged in the market crosswalk.

The primary within-market metric requires at least five eligible municipalities in a basin. Smaller
basins remain in national absolute-error metrics. Five validation folds hold out whole basins;
fold assignment is a frozen hash of the origin year and basin identifier. Prefecture-grouped folds
are a leakage sensitivity, not the primary product geography.

## 4. Windows and sealed holdout

### Development data

Development may use endpoints no later than 2020:

- repeated five-year Population Census panels: 2000–2005, 2005–2010, 2010–2015, and 2015–2020;
- a long-horizon 2000–2020 diagnostic;
- Housing and Land Survey panels ending no later than 2018; and
- residential standard-site land-price panels ending no later than 2020.

Repeated windows are reported separately as well as pooled with window fixed effects. A model may
not be called stable if its sign reverses across adjacent windows, even if the pooled statistic is
positive.

### Sealed outcomes

Until the development pipeline and `japan-model-v1.json` are committed, do not open or summarize:

- municipality-level Population Census or official resident-register outcomes after 2020;
- 2021–2025 MLIT standard-site land-price observations; or
- municipality-level 2023 Housing and Land Survey outcomes.

The temporal holdouts are 2020–2025 for population, households, and residential land prices, and
2018–2023 for vacancy. If final 2025 Population Census municipal tables are not available when the
holdout is opened, that outcome remains sealed. It is not replaced opportunistically. An official
Basic Resident Registration panel may be added only as a separately labeled outcome using the
same source and population concept at both endpoints.

The holdout is opened once. The raw archive hash, retrieval time, table identifiers, and the commit
containing the frozen model are written to `japan/HOLDOUT_OPEN.md` before any result is run. No
parameter, feature direction, exclusion, or transformation changes after that point belong to v1.

## 5. Equivalent constructs, not identical columns

All origin features are computed without endpoint information and standardized within the Japanese
origin-year cross-section. Directional expectations are frozen below.

| US mechanism construct | Japanese operational construct | Expected direction |
|---|---|---:|
| replacement ratio | population age 25–44 / population age 65+ | positive |
| young adult share | population age 20–34 / total | positive |
| synchronous-aging exposure | population age 45–64 / total | negative beyond other age terms |
| human capital | university/college graduates among age 25+ where consistently available | positive |
| university throughput | on-site tertiary enrollment within 15 km and 60 km | positive |
| education employment | employed residents/workers in education | positive |
| health employment | employed residents/workers in health and welfare | positive |
| government anchor | public-administration employment | positive |
| professional economy | information, finance, professional/scientific employment | positive |
| international gateway | non-Japanese-resident share | positive for inflow, not necessarily price |
| educated international inflow | foreign residents with tertiary education, if consistently observed | positive |
| other international inflow | residual foreign-resident inflow | estimated separately, no forced sign |
| market access | origin population within 60 km and 120 km | positive |
| density | residents per land square kilometer | ambiguous supply/demand control |
| recent supply | dwellings built in the prior decade / dwelling stock | negative price pressure, positive capacity |
| seasonal/external demand | secondary or vacation dwellings / dwelling stock | positive amenity-demand proxy |
| distress vacancy | vacant dwellings other than secondary/vacation units / stock | negative |
| income support | taxable income or household-income proxy, source-consistent within window | positive |

The educated/other foreign channels are kept separate only if the same education construct exists
for at least 80% of the primary development and holdout common samples. Otherwise they remain a
pre-specified missing-data extension and the v1 model uses total non-Japanese share; it may not
infer education from nationality.

Institution presence and throughput are distinct. A campus count is not substituted for enrollment.
Distance-only or system-wide students are not assigned wholesale to a headquarters municipality.

## 6. Source hierarchy

Only official or explicitly documented research geography sources are allowed in v1:

1. Statistics Bureau / e-Stat Population Census for age, nationality, households, employment,
   education, and commuting. The 2020 system publishes municipality tables and historical-area
   views, including [five-year age groups](https://www.e-stat.go.jp/en/stat-search/database?layout=datalist&statdisp_id=0003445162&tclass1=000001136466&tclass2val=0&toukei=00200521&tstat=000001136464)
   and [commuting tabulations](https://www.e-stat.go.jp/index.php/en/dbview?sid=0003454521).
2. Statistics Bureau [Housing and Land Survey](https://www.stat.go.jp/english/data/jyutaku/results.html)
   for dwelling stock, secondary dwellings, and vacancy. Municipal results are used only where the
   survey publishes them.
3. MLIT Land Market Value Publication for appraised standard-site prices. The publication reports
   values per square meter as of January 1; machine-readable point data and field definitions are
   available through the [National Land Numerical Information service](https://nlftp.mlit.go.jp/ksj/old/type/L01/L01-2025P/L01-2025P-07-01.0a.html).
4. MEXT School Basic Survey for institution-level on-site enrollment. It is an annual complete
   enumeration as described in the [official survey outline](https://www.mext.go.jp/b_menu/toukei/chousa01/kihon/gaiyou/chousa/1267968.htm).
5. e-Stat System of Social and Demographic Statistics / Statistical Observations of Municipalities
   for documented municipal income, health, housing, and administrative fields.

If two official tables disagree, the domain-specific source above takes priority over the omnibus
municipal compilation. Every raw file gets a URL, table ID, survey/reference date, retrieval date,
SHA-256 hash, and a short population-concept note.

Development acquisition now includes Census table 00520 / e-Stat dataset `0003052127` for 2010
industry employment, table 00630 / `0003175084` for 2015 industry employment, table 04100 /
`0003038639` for 2010 foreign residents, and table 03800 / `0003148596` for 2015 foreign residents.
The exact category selections, raw-response hashes, and normalized-source hashes are recorded in
`japan/data/origin-feature-sources.json`. These are origin features only and do not open the sealed
post-2020 outcome.

## 7. Outcomes and ordering

The claim hierarchy is fixed:

1. **Migration-stage primary:** annualized log change in population age 20–64.
2. **Housing-demand primary:** annualized log change in private households.
3. **Secondary intermediate:** change in distress-vacancy share.
4. **Secondary market outcome:** annualized log change in residential land value.

Age 20–64 is assembled from five-year census groups. Household definitions must be source-consistent
within a window. Vacancy uses “other” vacant dwellings separately from secondary/vacation dwellings.

Land prices use residential-use standard sites only. The primary municipal price outcome is the
median log change of sites observed at both endpoints; at least three matched sites are required.
Site identity is matched by official identifier, with coordinate-and-address agreement used only
to document official identifier changes. Unmatched changing samples are not converted into a
simple municipal mean. Price results are reported in nominal and national-residential-demeaned
form; local ranks use the latter.

## 8. Frozen models and baselines

### Mechanism runs

- **Conditional allocation hindcast:** use realized national cohort totals for each development
  endpoint, then test only their municipal allocation. This is not described as a national forecast.
- **Origin-information run:** use only demographic inputs and official projections available at
  the origin. The 2020–2025 holdout uses the archived projection selected before opening outcomes.
- US attraction weights and signs are frozen before Japanese outcomes are read. Japanese variables
  are percentile-standardized at each origin; no outcome-based sign orientation is allowed.
- Origin households anchor headship. Population conservation, nonnegative cohorts, and unmet-flow
  diagnostics are mandatory, as in the US simulation.

### Comparators

- no-migration cohort-aging projection;
- lagged five-year municipal population and household trend, on an exact common sample;
- origin age structure alone;
- origin non-Japanese share alone;
- origin market access alone; and
- a regularized ridge using the equivalent origin constructs, trained only in development folds.

The lagged-trend baseline is the primary kill comparator. Results against weaker single-feature
baselines cannot substitute for it.

## 9. Metrics, uncertainty, and decision rules

Absolute national metrics are MAE in annualized log change and MAE in endpoint age/household share.
Local-capture metrics are:

- pooled Spearman after centering prediction and outcome within commuting basin;
- equal-basin mean and median within-basin Spearman; and
- equal-basin pairwise ordering accuracy.

The primary local metric is equal-basin mean Spearman on the exact lagged-trend common sample.
Uncertainty is a 4,000-draw basin bootstrap. Small basins are never silently pooled into a nearby
market; they are omitted from local metrics under the frozen five-place rule.

The mechanism earns the international validation label only if all of the following hold in the
sealed holdout:

1. it beats no-migration aging on working-age absolute error;
2. its mean within-market Spearman exceeds lagged population trend for working-age change, with a
   95% bootstrap interval for the difference above zero;
3. it beats the lagged household trend on household absolute error and within-market Spearman point
   estimates; and
4. neither primary channel reverses sign in the 2020-boundary, prefecture-fold, or population-15k
   sensitivity.

If development fails these rules, the holdout is still opened and reported after the pipeline is
frozen; development failure is not a reason to redesign the test. Vacancy and land price are
secondary and cannot overturn a primary failure. All four outcome families are published even when
unfavorable.

## 10. Development freedom that remains

Before the holdout opens, development may correct parsing, official code mappings, unit conversion,
and translations; add invariant tests; and select a regularization strength by basin-grouped
development cross-validation. It may not change expected feature directions, primary outcomes,
market construction, minimum sample sizes, comparators, or pass criteria without logging the change
below and versioning the protocol.

Missingness is handled by training-origin median imputation plus explicit missingness rates. No
municipality is dropped because its observed outcome looks implausible. Winsorization, if needed
for a documented source code or unit error, is fixed from origin distributions and reported both
with and without the affected rows.

## 11. Italy replication

Italy remains untouched while Japan v1 is developed and opened. Its protocol will be written from
this template before Italian municipal outcomes are acquired. Japan-specific choices may not be
changed after seeing Italy. Italy is the replication; it is not an extra development sample.

## 12. Deviation log

| Date | Commit before change | Frozen choice affected | Change and reason | Outcome already opened? |
|---|---|---|---|---|
| 2026-07-16 | `ec2869b` | Origin-year functional market for Tokyo's 23 special wards | The official 2010 origin-destination table reports the ward area as aggregate origin `13100`, not 23 ward origins. Retain all 23 wards as outcome units, exclude `13100` from outcomes, assign the common basin derived from `13100`, and flag those rows. This uses no endpoint outcome to infer a split. | Development census through 2020 only; no post-2020 holdout |
