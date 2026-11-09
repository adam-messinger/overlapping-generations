# Seat E2-signals (neutral-rate-capital, lens: signals)

## BLUF

The resolver's own telemetry has not heard the bond rout: HLW composite R is 0.73% at 2026Q2 and is lower than in 2021, while the 10-year TIPS yield rose from 1.72% to a 2.95% peak this year. I put R for 2036-2045 near 1.0% and Q2 at 8%; the market and fiscal telemetry moves C3 up, not C2.

## Reasoning (current telemetry only)

**C2/Q2.** Resolver file: "Final data point: 2026Q2", "All estimates are one-sided"; US 1.01, euro area 0.09, Canada 1.76, so R = 0.73 (six-quarter range 0.66-0.81; 1.29 in 2021Q4). Its own "S.E. (final obs.)" for r* is 1.53 (US), 1.97 (Canada) and 4.79 (euro area) percentage points (https://www.newyorkfed.org/research/policy/rstar). ECB staff on the same model: "Given uncertainty bands as large as +/- 10 percentage points, it is not clear whether the HLW estimate is ever different from 0%"; their non-HLW real range is -½% to +½%, and "such ranges should be viewed as merely indicative" (https://www.ecb.europa.eu/press/economic-bulletin/focus/2025/html/ecb.ebbox202501_08~3be5a005f9.en.html).

Hot signals: 10-year TIPS 2.60% on 2026-11-05, against 1.93% at end-2025 (https://fred.stlouisfed.org/data/DFII10); 5y5y real forward about 2.87% (my arithmetic, with https://fred.stlouisfed.org/data/DFII5 at 2.33%); Kim-Wright 10-year term premium 0.91% against 0.57% (https://fred.stlouisfed.org/data/THREEFYTP10); FOMC longer-run funds rate median 3.2% (June: 3.1%), range 2.9-3.9%, eighteen participants (https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20260916.htm). St. Louis Fed: six-model "alternative r-star" 1.43% in 2025Q4, HLW the lowest, the 10Y10Y TIPS forward "a little more than 3%"; "Various models and market measures give very different r-star estimates" and "there are various risk premiums embedded within the yields" (https://www.stlouisfed.org/on-the-economy/2026/may/comparing-fomc-estimate-r-star-alternative-estimates). New York Fed: the real-time 95% band on investors' perceived r-star is ±170 basis points, on a sample ending 2022Q4 (https://libertystreeteconomics.newyorkfed.org/2026/08/a-window-into-bond-investors-uncertainty-about-r-star/).

Reading: the rise sits in term premia and forwards, which HLW does not take as input; its 2026Q2 inputs put the US real funds rate at 0.4%, below r*. Capex demand is live (press tallies: about $800B of hyperscaler capex and $326B of five-company debt in 2026; secondary and conflicting, filings not opened), but the IMF warns "A reassessment of AI-related profitability and productivity prospects could sharply reduce investment" (https://www.imf.org/-/media/files/publications/weo/2026/october/english/execsum.pdf.md).

**C3.** 10-year nominal 4.84% on 11-05, 5.31% peak on 10-05, 3.97% on 02-27 (https://fred.stlouisfed.org/data/DGS10). The real yield (2.6%) now exceeds HLW's US trend growth (2.41%). The IMF's 2031 path rose between April and October (114.8 to 115.2; US 142.1 to 145; press only). WEO: "stabilizing debt-to-GDP ratios at 2025 levels would require greater fiscal consolidation than currently envisaged" (https://www.imf.org/-/media/files/publications/weo/2026/october/english/ch1.pdf.md). P50 136.

**Q3.** No official estimate under the lock's accounting exists. Live markers sit far below 1.5%: Spain's flood reconstruction is reported at 0.7 points of output spread over 2024-2026 (one event; Reuters, https://www.thestar.com.my/news/world/2026/08/18/analysis-climate-damage-the-next-hit-to-europe039s-public-finances); NEF's +58 points of EU debt by 2050 includes mitigation, excluded here (https://neweconomics.org/2026/03/the-climate-fiscal-timebomb). 2.

**Q4.** Under the worst long-end stress since 2002 the Fed raised rates (to 3.75-4.00%), and Treasury buybacks carry no stated yield level (commentary). Bloomberg Government reported in May 2026 that no AI-tax bill had been introduced in Congress; later bills are unscored. Neither limb is live in any G7 country. 3.

**C1/Q1.** The WTO's 2026-27 forecasts imply annual ratios of 1.5 and 1.4, with AI-enabling goods 47% of first-half growth (baseline rows): a capex-cycle reading covering two years of twenty. P50 1.0; P(E < 0.75) 10%. Composite above 42%: 65% conditional (near 40% already, oil at $96), correlation mildly positive. Q1 6.

**C4/Q6.** WEO per-capita growth for 2026/27: advanced economies 1.9%/1.7%, China 4.7%/4.2%; the medium term "remains lackluster by historical standards and uneven across countries". The aggregate runs near 2.6% now and slows with China: C4 P50 2.3; g for 2036-45 median 2.1, P(g >= 2.5) 24%. C at 11% reflects live sovereign stress (UK 30-year above 6%, JGB 10-year above 3%; press).

**Q5.** US plus China 42.3%, flat since 2021; EU about 17.5%. Current nominal telemetry shows neither conjunct moving. 2.

## Resolution audit

Re-verified from the primary New York Fed file (downloaded 2026-11-09): the 2026Q2 HLW values, composite 0.732, decade averages 2.751 / 1.284 / 0.925, and 30 of 45 ten-year windows at or above 2.0 with none starting after 2001; R was last at or above 1.5 in 2008Q3. Yields row (S): confirmed on FRED, but stale. The 10-year closed at its 5.31% high on 5 October (5.34% intraday on 1 October in press), not on 13 October, and was 4.84% on 5 November; the rise from 27 February to the peak is 134 bp for the US 10-year. Debt row (S): the 115.2% figure for 2031 appears only in secondary press (https://greekcitytimes.com/2026/10/14/imf-forecasts-greek-public-debt-to-fall-to-111-1-of-gdp/); I could not open the October 2026 Fiscal Monitor itself. Resolvers: C2's main clause reads as written, with two cautions. The next HLW release is 27 November 2026 and each release re-estimates the whole history, so only the 2046 vintage counts. The fallback cannot be read as written for the euro area, which has no single "3-month government bill"; the issuer or a GDP-weighted basket must be named. The fallback also swaps an estimate for a realized rate. Q3 has no existing resolver and will probably be cancelled. Q2 does not say how many decimals R is rounded to before the 2.00 test.

```json
{"c1": {"p10": 0.75, "p50": 1.0, "p90": 1.3},
 "q1": 6,
 "c2": {"p10": 0.25, "p50": 1.0, "p90": 1.9},
 "q2": 8,
 "c3": {"p10": 120, "p50": 136, "p90": 158},
 "q3": 2,
 "q4": 3,
 "c4": {"p10": 1.7, "p50": 2.3, "p90": 2.9},
 "q5": 2,
 "q6": {"A": 22, "B": 67, "C": 11}}
```
