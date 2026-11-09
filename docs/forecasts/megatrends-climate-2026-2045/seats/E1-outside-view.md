# E1-outside-view (trade-chokepoints, historical base rates)

**BLUF.** History says the low trade elasticity mostly persists (C1 median 0.95; one era in six since 1870 was below 0.75) and that r* above 2%, a 1.5%-of-GDP climate line, three G7 yield caps and US+China above half of world GDP each have single-digit frequencies. Debt is the exception: twenty-year rises of 20-60 points are the rule since 1970.

## Reasoning (outside view only)

**C1.** Era ratios of trade growth to GDP growth. 1870-1913: 1.6 (exports 3.4%/yr, GDP 2.1%). Export share of GDP 7.9% (1913), 5.5% (1950), 10.5% (1973), 17.2% (1998) ([WTO WTR 2013, Table B.1](https://www.wto.org/english/res_e/booksp_e/wtr13-2b_e.pdf)); with Maddison's GDP rates recalled from memory (PPP, not market-rate) that is about 0.5, 1.6, 1.7. World Bank goods-plus-services volumes ([NE.EXP.GNFS.KD](https://api.worldbank.org/v2/country/WLD/indicator/NE.EXP.GNFS.KD?format=json)): 1973-90 1.47, 1990-2008 1.90, 2008-25 1.05; none of 36 rolling 20-year windows from 1970 fell below 1.18. Merchandise alone is lower: 0.85 for 2005-24 and 0.68 for 2008-24 on the UNCTAD-sourced index ([TX.QTY.MRCH.XD.WD](https://api.worldbank.org/v2/country/WLD/indicator/TX.QTY.MRCH.XD.WD?format=json), ends 2024); the WTO's own ratio is "0.9-to-1 on average" since 2010, "excluding the trade collapse and rebound of 2009-10" ([GTO April 2024](https://www.wto.org/english/res_e/booksp_e/trade_outlook24_e.pdf)). One era of six sat below 0.75. Anchor on the current regime (~0.9), revert a third toward the 155-year mean (~1.3), add the 2026-27 forecasts (1.5, 1.4): 0.60 / 0.95 / 1.40; P(E < 0.75) = 24%.

**Q1.** Broad shares move 5-10 points in one or two decades: manufactures 70% (1990), 75% (2000), 65% (2011); fuels and mining 14% to 23% (1990-2011), with "no clear trend in the post-Second World War period, as it rises and falls in step with oil prices" (same WTO report). A rise of 2-5 points in the composite: 40%, 45% given low E. 0.24 x 0.45 = 11.

**C2/Q2.** [HLW file](https://www.newyorkfed.org/medialibrary/media/research/economists/williams/data/Holston_Laubach_Williams_current_estimates.xlsx) ("All estimates are one-sided"): over 140 origin quarters 1972Q1-2006Q4, the change from the origin's composite R to its average 39-78 quarters later ran -2.43 to +0.15 (median -0.72); +1.27 is needed. These overlap: about three independent windows. Wider class, ex-post real short rates at the same weights ([JST R6](https://www.macrohistory.net/app/download/9834512569/JSTdatasetR6.xlsx), 1871-2020): 67 of 141 rolling decades averaged >= 2%, as did 15 of 41 decades beginning ten years after a decade <= 1%. HLW resolves; the realized rate is only the fallback. -0.5 / 0.55 / 1.85; Q2 = 8.

**C3.** JST public debt, 18 advanced economies, my PPP weights (not the IMF's general-government concept): 31% (1913), 131% (1946), 30% (1974), 129% (2020). Twenty-year changes, starts 1900-2000 (n=101, overlapping): P10 -37, median +24.5, P90 +46.5. All 31 starts from 1970 rose (+20 to +60); all seven starts above 90% (1943-49) fell 58-94. Official forecasts err low: realized debt "about 10% of GDP" above forecast "at the 5-year horizon" ([Estefania-Flores et al.](https://ideas.repec.org/p/cpr/ceprdp/16108.html), abstract). 92 / 132 / 158.

**Q3.** Catastrophe losses are 0.2-0.3% of world GDP, half insured. Swiss Re's insured-loss trend is "5-7% a year" real, exposure "explaining more than 80%" (press reports of [sigma 1/2026](https://www.swissre.com/dam/jcr%3A4b5669a3-b7e2-4682-bf96-a597085958a6/sigma-1-2026-natural-catastrophes-report.pdf), not read directly): under a doubling of the GDP share in twenty years, against the fivefold rise needed. 3.

**Q4.** Explicit caps: Fed 1942-51, BoJ 2016-24, RBA 2020-21 (memory, unverified); only Japan's met the 140% test; never two G7 countries in one twenty-year window. Of new tax bases only VAT passed 2% of GDP; carbon, transaction and digital taxes have not (memory). 2; coherent with C3, since three G7 debts above 140% are plausible but caps are rare.

**C4.** [Maddison 2020](https://www.rug.nl/ggdc/historicaldevelopment/maddison/data/mpd2020.xlsx), 32 OECD members with 1950 data plus China, to 2018: 20-year windows 1.89-3.15% (median 2.44). After 20 years at >= 5%/yr (39 episodes) the next 20 had median 3.0%; 2.7% for the 19 at 20-40% of US income (>= 4% in 3). China 3%, OECD 1.3% gives 2.0%. 1.4 / 2.1 / 2.75.

**Q5.** [World Bank current-dollar shares](https://api.worldbank.org/v2/country/USA;CHN;EUU;JPN;WLD/indicator/NY.GDP.MKTP.CD?format=json), 1960-2025: US+China never above 44.0%; 20-year gains >= 7.7 points in 10 of 46 windows (starts 1995-2005). The EU never lost the 36% of its share required (worst -33%). 0.12 x 0.38 = 4.

**Q6.** The C4 aggregate's decade growth was >= 2.5% in 9 of 29 windows starting 1980+ and never < 1.5%; after China's deceleration arithmetic P(g >= 2.5) = 15%. G7 decade inflation >= 4%: 47 of 141 rolling windows (JST, my weights), none starting after 1983. G7 IMF stand-bys ended 1977 (memory); no G7 default since 1953. C 11, A 13, B 76.

```json
{"c1": {"p10": 0.60, "p50": 0.95, "p90": 1.40},
 "q1": 11,
 "c2": {"p10": -0.5, "p50": 0.55, "p90": 1.85},
 "q2": 8,
 "c3": {"p10": 92, "p50": 132, "p90": 158},
 "q3": 3,
 "q4": 2,
 "c4": {"p10": 1.4, "p50": 2.1, "p90": 2.75},
 "q5": 4,
 "q6": {"A": 13, "B": 76, "C": 11}}
```
