**BLUF:** The 2025-26 data mostly points one way. Fertility has collapsed in China, US immigration has fallen, and the US trust funds now run out in 2032-33. Meanwhile real yields are 2.9%, above CBO's path. Together these make Q4 yes more likely than not, put Q5 deep in no territory, and give Regime A the most weight in Q6. Demographic downward pressure on r* is real but has no tight estimate, and fiscal forces are currently stronger.

**Reasoning (signals lens):**

China:
- 2025 births were 7.92M, down 17%. The population fell 3.39M, a fourth straight year of decline (https://www.caixinglobal.com/2026-01-19/chinas-population-decline-accelerates-as-births-hit-modern-era-low-in-2025-102405520.html).
- The "TFR ~0.96" figure is a non-NBS estimate by demographer Huang Wenzheng.
- An IMF working paper projects working-age people (20-60) falling from 840M to 614M by 2050. It projects the household saving rate falling from 28% (2024) to 14% (2050), but that is a projection, not an observation (https://www.imf.org/en/publications/wp/issues/2025/12/12/reforms-to-reduce-chinas-high-household-savings-572507/index.md).
- Q5 needs China's dollar GDP to grow about 1.6 percentage points a year faster than the US for nine years. With deflation and a shrinking labour force, that leaves revaluation of the renminbi as the only realistic route.

US:
- Provisional 2025 general fertility rate was 53.1, from data covering "more than 99% of registered births" (https://cdc.gov/nchs/pressroom/releases/20260409.html). The TFR of 1.57 is a WSJ calculation, not a CDC figure.
- Census puts 2025 net international migration at +1.3M and projects 321k for 2026. The "negative" figure (-10k to -295k) is a Brookings estimate, not Census.
- CBO calls its projections "highly uncertain". It has TFR at 1.58, falling to 1.53, and deaths exceeding births from 2030 (https://www.cbo.gov/system/files/2026-01/61879-Demographic-Outlook.pdf).
- The 2026 Trustees put retirement (OASI) fund depletion in Q4 2032 and Medicare hospital (HI) fund depletion in Q2 2033 (https://www.ssa.gov/oact/TRSUM/).
- CBO's net interest path rises from 3.3% to 4.6% of GDP by 2036 (https://www.cbo.gov/publication/62207), while the nominal 10-year yield is about 4.95%, above the baseline.

r*:
- Carvalho et al. find demographics explain most of the 1990-2019 fall in real rates. They say the downward pressure "has declined" since then, fiscal pressure is pushing rates up, and aging "could, in principle, put either downward or upward pressure on r-star" (https://frbsf.org/wp-content/uploads/el2025-10.pdf).
- Auclert, Malmberg, Rognlie and Straub (AMRS) find aging adds about 200% of GDP to asset demand by 2100. Their "250% debt without higher rates" result is a conditional scenario, not a forecast (https://www.kansascityfed.org/documents/11206/AMRS_Jackson_Hole_Final.pdf).
- I found no published confidence interval for the US demographic r* effect, so treat it as unquantified.

**Resolution audit:**
- **Q1:** The 2024 baseline is itself revised in later vintages.
- **Q2:** The first WTO figure for 2035 will be a preliminary nowcast, which has historically been revised upward later.
- **Q4:** CBO's own 2035 value sits right at the 4.5% threshold, so the question is close to a coin-flip by construction.
- **Q5:** China's economic censuses (2028, 2033) can raise the GDP level by several percent in one step.
- **Q6-A:** "IMF lending arrangement" is undefined. It is unclear whether precautionary credit lines count.

I could not fetch the full text of crfb.org or frbsf.org pages; those figures come from search snippets and PDFs found in search.

```json
{
  "lens": "signals",
  "bluf": "The 2025-26 data mostly points one way. Fertility has collapsed in China, US immigration has fallen, and the US trust funds now run out in 2032-33. Meanwhile real yields are 2.9%, above CBO's path. Together these make Q4 yes more likely than not, put Q5 deep in no territory, and give Regime A the most weight in Q6. Demographic downward pressure on r* is real but has no tight estimate, and fiscal forces are currently stronger.",
  "q1": 55,
  "q2": {"p10": 8.3, "p50": 10.8, "p90": 14.2},
  "q3": {"p10": 1.0, "p50": 2.3, "p90": 3.3},
  "q4": 61,
  "q5": 10,
  "q6": {"A": 36, "B": 8, "C": 20, "D": 36},
  "key_drivers": ["China 2025 births -17%, workforce -1.2%/yr to 2050 (IMF)", "OASI depletion Q4 2032, HI Q2 2033", "10y nominal ~4.95% above CBO baseline path", "aging raises asset demand but fiscal supply racing ahead (AMRS)"],
  "sources": ["https://www.caixinglobal.com/2026-01-19/chinas-population-decline-accelerates-as-births-hit-modern-era-low-in-2025-102405520.html", "https://cdc.gov/nchs/pressroom/releases/20260409.html", "https://www.cbo.gov/system/files/2026-01/61879-Demographic-Outlook.pdf", "https://www.ssa.gov/oact/TRSUM/", "https://www.cbo.gov/publication/62207", "https://frbsf.org/wp-content/uploads/el2025-10.pdf", "https://www.kansascityfed.org/documents/11206/AMRS_Jackson_Hole_Final.pdf", "https://www.imf.org/en/publications/wp/issues/2025/12/12/reforms-to-reduce-chinas-high-household-savings-572507/index.md", "https://tipswatch.com/2026/09/17/10-year-tips-reopening-gets-real-yield-of-2-653-highest-in-nearly-18-years/"],
  "caveats": ["China TFR ~0.96 is a non-NBS estimate (Huang Wenzheng); US 2025 births provisional, TFR 1.57 is a WSJ calculation", "Carvalho et al.: aging 'could, in principle, put either downward or upward pressure on r-star'; no CI found for the US demographic effect", "Census net migration +1.3M (2025) vs Brookings -10k to -295k; CBO calls its demographic projections 'highly uncertain'"]
}
```