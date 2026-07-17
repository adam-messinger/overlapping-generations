# Data and calibration references

This page records the primary sources used by the current pipeline and distinguishes source data
from model judgment. Access and vintage were last reviewed on 2026-07-16.

## US municipal data

- US Census Bureau, [2023 Gazetteer Files](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2023.html): place identifiers, land area, and representative coordinates.
- US Census Bureau, [2020 geographic code files](https://www2.census.gov/geo/docs/reference/codes2020/): place-by-county crosswalk.
- US Census Bureau, [Census Data API](https://www.census.gov/data/developers/data-sets.html): Census 2000 SF1/SF3 and ACS 2019–2023 tables. Exact table and variable IDs are enumerated in `scripts/fetch-census.ts`.
- US Census Bureau, [ACS 2023 B26001 metadata](https://api.census.gov/data/2023/acs/acs5/groups/B26001.html): group-quarters population.
- Zillow Research, [Housing Data](https://www.zillow.com/research/data/) and [ZHVI User Guide](https://www.zillow.com/research/zhvi-user-guide/): city-level, all-homes, middle-tier, smoothed and seasonally adjusted ZHVI. Zillow calls this a typical home value, not a median.
- NCES, [IPEDS complete data files](https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx): HD2023, EFFY2023_DIST, FA2000HD, and EF2000A.
- NCES, [Distance Education in IPEDS](https://nces.ed.gov/ipeds/use-the-data/distance-education-in-ipeds): definitions used to remove exclusively online students from the current spatial enrollment measure.
- USDA Economic Research Service, [Commuting Zones and Labor Market Areas](https://www.ers.usda.gov/data-products/commuting-zones-and-labor-market-areas): county membership for the start-period 2000 commuting zones and the 2020 sensitivity geography.
- US Census Bureau, [1990–2000 Subcounty Population Estimates](https://www2.census.gov/programs-surveys/popest/tables/1990-2000/2000-subcounties-evaluation-estimates/): April 1990 population restated on January 2000 boundaries and April 2000 Census population, used for the lagged population-trend baseline and multi-county place assignment.

## National demographic scenario

- CDC/NCHS, [Births: Final Data for 2024](https://www.cdc.gov/nchs/data/nvsr/nvsr75/nvsr75-02.pdf): final 2024 total fertility rate of 1,599.5 births per 1,000 women.
- Congressional Budget Office, [The Demographic Outlook: 2026 to 2056](https://www.cbo.gov/publication/61994): current fertility and net-immigration outlook. The model simplifies the published path to linear convergence from 0.41 million net immigrants in 2025 to 1.2 million in 2035 and TFR 1.5995 to 1.53.
- Social Security Administration, [2021 Period Life Tables](https://www.ssa.gov/oact/HistEst/PerLifeTables/2021/PerLifeTables2021.html): mortality reference. The model uses coarse bracket survival approximations rather than the full age-sex tables.

## Housing mechanisms

- Albert Saiz, [The Geographic Determinants of Housing Supply](https://doi.org/10.1162/qjec.2010.125.3.1253), *Quarterly Journal of Economics* 125(3), 2010: conceptual motivation for heterogeneous supply responsiveness. The implementation does not reproduce Saiz's estimated metro elasticities.
- Aida Caldera Sánchez and Åsa Johansson, [The Price Responsiveness of Housing Supply in OECD Countries](https://www.oecd.org/content/dam/oecd/en/publications/reports/2011/05/the-price-responsiveness-of-housing-supply-in-oecd-countries_g17a1f3a/5kgk9qhrnn33-en.pdf), OECD Economics Department Working Paper 837, 2011: comparative supply-response context.

The following are **model judgments**, not estimates taken from those papers: the 3.6 price/income
anchor, 2.5% annual error correction, 1.2% real price drift, 1% real income growth, internal mover
rates, attraction weights, spatial enrollment cap, and confidence thresholds.

## International context

- Statistics Bureau of Japan, [Population Census](https://www.stat.go.jp/english/data/kokusei/index.html) via [e-Stat](https://www.e-stat.go.jp/en): official 2010, 2015, and 2020 municipal population, five-year age, household, and origin-destination commuting tables used by the development panel. Exact table identifiers, URLs, byte counts, and SHA-256 hashes are committed under `japan/data/*-sources.json`.
- Statistics Bureau of Japan, [2023 Housing and Land Survey](https://www.stat.go.jp/english/data/jyutaku/index.html) and [2024 results notice](https://www.stat.go.jp/english/info/news/20241030.html): official housing and vacancy evidence.
- Eurostat, [Housing Price Statistics](https://ec.europa.eu/eurostat/web/housing-price-statistics) and [methodology](https://ec.europa.eu/eurostat/web/housing-price-statistics/methodology): harmonized national house-price indices for EU comparisons.

The Japan/Korea and Italy/Spain/Germany notes are contextual hypothesis documents. They are not
statistical validation sets and do not justify importing local coefficients into the US model.
