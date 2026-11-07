**BLUF:** The base rates point to slow reversion, not to any regime break. World trade/GDP in 2035 is about a coin flip against its 2024 value (48). US 2035 net interest at or above 4.5% of GDP is less likely than CBO's straddling baseline suggests (30), because CBO has "almost always overestimated" net interest. China reaching 75% of US GDP in 2035 is a long shot (11): no ageing large economy has regained its USD-GDP peak against the US.

**Reasoning (outside view only):**

- **Q1.** World trade/GDP (WDI) rose from ~24% in 1960 to ~61% in 2008. Before 2008, roughly 1 in 5 of the 11-year windows since 1960 ended lower. Since 2008 the series is a plateau, and about 4 of the 6 windows ending 2019-2024 ended lower. Countries past their working-age peak did not close up: Japan's openness after 1995 and Germany's after 2000 both rose. The 2024 base (56.76) already sits a little below its 2009-2024 average, which makes "below" slightly harder. Answer: 48.
- **Q2.** The WTO puts digitally delivered services at ~$3.8T in 2022, "growing roughly 8.1% a year on average from 2005 to 2022", nearly fourfold since 2005 ([The National/WTO](https://thenationalnews.com/business/economy/2023/04/09/exports-of-digitally-delivered-services-surged-to-38tn-in-2022-wto-says)). Their share of services exports has barely moved (54% in 2022, ~55% in 2025), so growth is converging on the services total.
  - Ten years from $5.26T at 7.5% gives ~$10.8T.
  - A weak decade like 2008-16 (~4%/yr) gives ~$7.8T.
  - The 2020-25 pace (~10%) plus upward vintage revisions gives ~$14.5T.
- **Q3.** Annual DFII10 averages for 2003-2025 have a median of ~0.6%. The 1997-2002 TIPS yields ran ~3.5-4%. Real yields are close to a random walk over 9 years, with a standard deviation of ~1.3pp. In Japan and Germany, real yields fell below 1% within about 15 years of the working-age peak. A half-and-half blend of persistence from ~2.9% and reversion to ~1.5% gives a median of 2.2.
- **Q4.** CBO reports US net interest at 3.2% of GDP in FY2025 as the record in the 1940-2025 history, so 4.5% has never been reached. CBO's baseline reaches 4.6% only in 2036 ([CRFB](https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook)), so 2035 sits near the threshold. CBO's evaluation says net interest was its least accurate outlay projection, "which it has almost always overestimated", with the 2023 underestimate as the exception ([CBO](https://www.cbo.gov/publication/53328), [CBO testimony](https://www.cbo.gov/system/files/2024-01/59905-Testimony.pdf)). Answer: 30.
- **Q5.** Japan/US peaked at ~71% in 1995, near Japan's working-age peak, then fell to ~37% by 2005. The euro area has not regained its 2008 ratio. That is 0 of about 4 ageing cases regaining the peak, and China would need roughly 1.6%/yr of USD outperformance for 9 years. Answer: 11.
- **Q6.** Taken in the lexical order:
  - **A (22).** The G7 IMF programmes cluster in the 1970s (UK 1976, Italy 1974/77) and there have been none since 1980, about 10% per decade. Add ~13% for US net interest reaching 6% of GDP.
  - **B (12).** World growth averaged at least 3.75% in about 3-4 of the 9 five-year blocks since 1980, and in neither block since 2015.
  - **C (24).** DFII10 averaged 1% or less in about two-thirds of the 5-year windows of the TIPS era, but not before 2008.
  - **D (42).** The residual.

```json
{
  "lens": "outside-view",
  "bluf": "The base rates point to slow reversion, not to any regime break. World trade/GDP in 2035 is about a coin flip against its 2024 value (48). US 2035 net interest at or above 4.5% of GDP is less likely than CBO's straddling baseline suggests (30), because CBO has almost always overestimated net interest. China reaching 75% of US GDP in 2035 is a long shot (11): no ageing large economy has regained its USD-GDP peak against the US.",
  "q1": 48,
  "q2": {"p10": 7.8, "p50": 10.8, "p90": 14.5},
  "q3": {"p10": 0.7, "p50": 2.2, "p90": 3.5},
  "q4": 30,
  "q5": 11,
  "q6": {"A": 22, "B": 12, "C": 24, "D": 42},
  "key_drivers": ["post-2008 trade/GDP plateau", "CBO net-interest overestimation bias", "ageing economies never regained USD-GDP peak vs US (Japan 1995)", "near-random-walk real yields blended with long-run mean"],
  "sources": ["https://thenationalnews.com/business/economy/2023/04/09/exports-of-digitally-delivered-services-surged-to-38tn-in-2022-wto-says", "https://www.crfb.org/papers/cbos-february-2026-budget-and-economic-outlook", "https://www.cbo.gov/publication/53328", "https://www.cbo.gov/system/files/2024-01/59905-Testimony.pdf"],
  "caveats": ["CBO: net interest outlays were its least accurate projections, which it has almost always overestimated (driven by interest-rate overestimates); the FY2023 cycle reversed this", "WTO average digital-services growth is 8.1% for 2005-2022; a later WTO-linked report says 8.5% with an unstated end year", "Pre-1997 US real 10y yields and some historical aggregates are recalled from memory, not re-verified in this run"]
}
```