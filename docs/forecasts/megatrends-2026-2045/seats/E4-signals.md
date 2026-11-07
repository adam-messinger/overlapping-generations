**BLUF:** The latest readings point to a regime of high real yields and high term premia. The ACM term premium is at 0.98%, the highest since 2014, the 10y TIPS yield is about 2.9%, and US net interest is running near $1.05T. That pushes me above baseline on Q4 and on Q6-A. Q5 gets a modest lift from a yuan at its strongest since 2022, and Q1 leans No because nominal trade values are surging.

**Reasoning (signals lens)**

**Rates (Q3, Q6).**
- The 10y nominal yield hit 5.364% intraday on 7 Oct. The Treasury par-curve close was 5.31%, and the yield was about 5.0–5.03% after the October FOMC hold. Sources disagree on closing levels.
- The ACM term premium rose from 0.57% to 0.98% by 7 Oct. Over the same period the risk-neutral yield edged down from 4.43% to 4.39%, so the whole move is term premium rather than the expected Fed path (https://www.thewealthadvisor.com/article/surge-treasury-term-premium-warns-rising-bond-risks).
- DFII10 was 2.92% on 2 Oct. The September TIPS reopening cleared at 2.653%, the highest in nearly 18 years (https://tipswatch.com/2026/09/17/10-year-tips-reopening-gets-real-yield-of-2-653-highest-in-nearly-18-years/). I found no November print.
- The sell-off is synchronized across G7 markets. Japan's 30y JGB hit about 4.235% intraday on 5 Oct, and the UK 10y gilt reached 5.52% on 8 Oct, its highest since 2007. French CDS are at their highest since 2013, though spread estimates "vary widely by source" (https://www.tradeweb.com/newsroom/media-center/insights/blog/tradeweb-government-bond-update--october-2026/).

**Fiscal (Q4).**
- CBO's September Monthly Budget Review puts the FY2026 deficit at about $2.0T and net interest up $115B (11%), "reflecting a larger debt and higher long-term interest rates" (https://www.cbo.gov/system/files/2026-10/61985-MBR.pdf). That is about 3.4% of GDP.
- Customs revenue is also shrinking. After the Supreme Court struck down the IEEPA tariffs, Yale's estimate of the effective rate fell from 16.9% to 9.1% (https://budgetlab.yale.edu/research/state-tariffs-february-20-2026). The Section 122 surcharge then expired on 24 Jul, and Section 301 duties replaced it, leaving about 11.2% applied. That figure is one firm's estimate (https://www.thompsoncoburn.com/insights/81-july-9-2026-emerging-tariff-framework-post-section-122/).
- So rates are above CBO's February path and tariff revenue is below it. Both push FY2035 net interest past 4.5%.

**China (Q5).**
- USD/CNY reached 6.67 on 26 Oct, the strongest since June 2022 (https://tradingeconomics.com/china/currency/news/594800). Exports rose 16.4% in 9M-2026 and the trade surplus is near $1T.
- NBS put Q3 Q3 nominal GDP at ¥37.54T (https://www.stats.gov.cn/english/PressRelease/202610/t20261021_1965671.html). Against Q3-2025's ¥35.45T, that is about +5.9% nominal on +4.5% real, so the deflator may have turned positive. This is my own derivation from a preliminary release and is unconfirmed.

**Trade (Q1, Q2).**
- WTO's H1 trade value rose 15% while volume rose 3.5%, so price effects are lifting the trade/GDP numerator.
- Digitally delivered services rose about 10% in 2025, while WTO had projected only 6.1%. The WTO's own 2024 figure is $4.8T, and the $5.26T figure for 2025 comes via UNCTAD/JETRO, which is "not one series" (https://unctadstat.unctad.org/insights/theme/254).

**Resolution audit**
- **Q1:** "Volume" in the label is false; the series is nominal.
- **Q2:** The first WTO print for 2035 will be a preliminary nowcast, and these have historically been revised upward.
- **Q3:** DFII10 includes a TIPS liquidity premium, so it overstates r*.
- **Q4:** It is a knife-edge at CBO's own baseline.
- **Q5:** China's census benchmark revisions shift the level.
- **Q6-A:** It is unclear whether "IMF lending arrangement" includes precautionary lines.

```json
{
  "lens": "signals",
  "bluf": "Fresh telemetry shows a high-real-yield, high-term-premium regime (ACM TP 0.98%, highest since 2014; DFII10 ~2.9%; US net interest ~$1.05T), so I lean above baseline on Q4 and Q6-A; a yuan at its strongest since 2022 modestly lifts Q5, while surging nominal trade values lean Q1 No.",
  "q1": 38,
  "q2": {"p10": 8.3, "p50": 11.3, "p90": 15.5},
  "q3": {"p10": 1.4, "p50": 2.4, "p90": 3.4},
  "q4": 67,
  "q5": 36,
  "q6": {"A": 37, "B": 8, "C": 10, "D": 45},
  "key_drivers": ["ACM term premium 0.57->0.98% Sep-Oct 2026, risk-neutral yield flat", "FY2026 net interest +11%, deficit ~$2.0T; tariff revenue cut by SCOTUS IEEPA ruling", "CNY 6.67 (strongest since 2022), China exports +16.4% 9M-2026, deflator possibly positive", "synchronized G7 long-end sell-off (JGB 30y ~4.2%, gilt 10y 5.52%, French CDS high)"],
  "sources": ["https://www.cbo.gov/system/files/2026-10/61985-MBR.pdf", "https://tipswatch.com/2026/09/17/10-year-tips-reopening-gets-real-yield-of-2-653-highest-in-nearly-18-years/", "https://www.thewealthadvisor.com/article/surge-treasury-term-premium-warns-rising-bond-risks", "https://budgetlab.yale.edu/research/state-tariffs-february-20-2026", "https://www.thompsoncoburn.com/insights/81-july-9-2026-emerging-tariff-framework-post-section-122/", "https://tradingeconomics.com/china/currency/news/594800", "https://www.stats.gov.cn/english/PressRelease/202610/t20261021_1965671.html", "https://www.tradeweb.com/newsroom/media-center/insights/blog/tradeweb-government-bond-update--october-2026/", "https://unctadstat.unctad.org/insights/theme/254"],
  "caveats": ["Sources disagree on Oct-2026 closing yield levels (5.31% Treasury par close vs 5.364% intraday); no November DFII10 print located", "Effective tariff rate ~11.2% post-Section-122 is one firm's estimate; Yale gives 9.1-13.7% depending on substitution and timing; Section 122 legality still under appeal", "WTO 2024 $4.8T and UNCTAD-based $5.26T (2025) digitally delivered figures 'shouldn't be directly compared as one series'; China Q3-2026 positive deflator is my derivation from a preliminary NBS level"]
}
```