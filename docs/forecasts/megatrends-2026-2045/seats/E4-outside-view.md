**BLUF:** Base rates put the answers near even or below on the "fragmentation shock" outcomes. Under the post-2008 slowbalization reference class, world trade/GDP falling below its 2024 trough-like level is roughly a coin flip (47%). Digitally delivered services keep compounding at about 8%, for a 2035 median near $10.8T. Real yields mean-revert toward about 1.8%. CBO's record of over-projecting net interest puts 4.5% of GDP in FY2035 at 30%. China re-catching the US is 13%: no rival that peaked and retreated has ever regained its peak. The residual regime D leads Q6.

**Reasoning (outside view only)**

I could not reach www.cbo.gov or macrotrends from this session, so some of the series values below are from memory and secondary pages.

- **Q1.** WDI world trade/GDP was about 25% in 1970, about 38% in 1985 and 60.99% at the 2008 peak, then 56.3% in 2019 and 51.6% in 2020 (https://data.worldbank.org/indicator/NE.TRD.GNFS.ZS; https://www.indexmundi.com/facts/world/trade).
  - Across all 11-year windows since 1970, only about 10-13% show a decline, mostly the flat managed-trade windows of 1980-93.
  - In windows starting after 2008, the ratio fell in about 4 of 6.
  - In the 1913-38 protectionist era it fell in every window.
  - The 2024 baseline (56.76) sits slightly below the post-2008 mean of about 57.5, which works against a decline. Blended result: 47.
- **Q2.** WTO: exports grew "8.1 per cent annually on average from 2005 to 2022", to US$3.82T (https://www.wto.org/english/res_e/booksp_e/trade_in_serv_devpt_intro_e.pdf). One secondary chart gives 8.2% for 2005-23 (https://data.wto.org/en/dataset/dideliveredservices).
  - Ten-year compound rates have ranged from about 4-5% (windows that include the global financial crisis) to about 9%.
  - Applied to the 2025 value of $5.26T, that range gives 7.8 / 10.8 / 14.5. The upper tail is widened because past vintages have been revised upward.
- **Q3.** DFII10 annual averages since 2003 range from about -1% to about 2.3%, with a mean of about 1% (https://fred.stlouisfed.org/series/DFII10). The long-run US real 10y yield is about 2%.
  - The 2026 level of about 2.9% is at the series' top tail. Over 9-year horizons, past excursions like this reverted by more than half (2007-08 at about 2% fell to about 0.4% by 2016-17).
- **Q4.** Two reference classes:
  - Net interest/GDP has never been at or above 4.5% since 1940; the peak was 3.2% in 1991.
  - CBO: net interest is its "least accurate" outlay projection, "almost always overestimated" over 1984-2021 (https://www.cbo.gov/publication/59110). That is a secondary summary; I could not fetch the page itself.
  - The threshold roughly equals the baseline, so the historical bias points below it: 30.
- **Q5.** Rivals whose ratio to US GDP peaked then fell by 10pp or more: Japan (0.71 in 1995, about 0.35 by 2005), the USSR, and the EU/eurozone after 2008. None regained its peak within 14 years, so Laplace (0+1)/(3+2) ≈ 17%. Reaching 0.75 from 0.65 needs a 15% relative gain: 13.
- **Q6.**
  - **A: 22.** G7 IMF arrangements were common under Bretton Woods (UK 1976, Italy 1974 and 1977) and zero since about 1980. Laplace over about 4.5 decades gives about 15%. US net interest has never reached 6% of GDP; adding that clause brings A to 22.
  - **B: 15.** World growth at PPP averaged 3.75% or more in about 4 of 9 five-year windows from 1980 to 2024 (https://www.imf.org/en/Publications/WEO), but in none of the last two.
  - **C: 25.** DFII10 averaged 1% or less in 3 of 5 five-year windows since 2003.
  - **D: 38.** The residual.

```json
{
  "lens": "outside-view",
  "bluf": "Base rates put the answers near even or below on the fragmentation-shock outcomes: trade/GDP below its 2024 level is roughly a coin flip (47%); digitally delivered services compound at about 8% to a 2035 median near $10.8T; real yields mean-revert toward about 1.8%; CBO's record of over-projecting interest gives 30% on 4.5% of GDP in FY2035; China re-catching the US is 13% since no peaked-and-retreated rival has regained its peak; the residual regime D leads Q6.",
  "q1": 47,
  "q2": {"p10": 7.8, "p50": 10.8, "p90": 14.5},
  "q3": {"p10": 0.5, "p50": 1.8, "p90": 3.0},
  "q4": 30,
  "q5": 13,
  "q6": {"A": 22, "B": 15, "C": 25, "D": 38},
  "key_drivers": ["post-2008 slowbalization: trade/GDP down in ~4 of 6 eleven-year windows", "digital services CAGR 8.1% 2005-2022", "CBO net interest almost always over-projected 1984-2021", "no peaked-and-retreated rival (Japan, USSR, EU) regained its peak within 14 years"],
  "sources": ["https://data.worldbank.org/indicator/NE.TRD.GNFS.ZS", "https://www.indexmundi.com/facts/world/trade", "https://www.wto.org/english/res_e/booksp_e/trade_in_serv_devpt_intro_e.pdf", "https://data.wto.org/en/dataset/dideliveredservices", "https://www.cbo.gov/publication/59110", "https://fred.stlouisfed.org/series/DFII10", "https://www.imf.org/en/Publications/WEO"],
  "caveats": ["CBO: net interest projections 'almost always overestimated', driven by overestimates of interest rates (1984-2021 sample; read via a secondary summary, cbo.gov unreachable from this session)", "The $1.0T 2005 digital-services start value comes from a secondary chart; WTO's own figures give 8.1%/yr for 2005-2022", "World trade/GDP values are from secondary sites (Index Mundi) and differ slightly by WDI vintage"]
}
```