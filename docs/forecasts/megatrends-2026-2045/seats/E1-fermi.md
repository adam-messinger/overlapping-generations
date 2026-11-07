**BLUF:** The 2035 trade-to-GDP ratio probably comes in just under 2024. Lower fuel-trade value and the drift away from goods trade outweigh growth in digital services. Q4 and Q6-A lean YES because the US interest bill is the rate times the debt, and rates are already above the paths CBO assumed. China reaching 75% of US nominal GDP needs about 1.6%/yr of relative nominal-USD growth. That can only come from renminbi appreciation, and the 2026 oil shock works against China.

**Reasoning (Fermi decomposition, energy lens):**

**Q1 (no model input; the adapter refuses it).** The 2024 ratio is 56.8. The change to 2035 has four parts:
- **Fuels:** about 14% of merchandise trade value, roughly 6pp of the ratio. Lower volume (EVs, solar displacing LNG and coal, about 0.9x) times lower real price ($80 to about $70, about 0.88x) gives roughly 4.7pp, so **-1.3pp**.
- **Clean-tech and minerals goods: +0.4pp.**
- **Digital services:** about 9% of GDP (exports plus imports). It grows about 2.5%/yr faster than GDP, so x1.28, giving **+2.4pp**.
- **Goods ex-fuel:** the trend since 2008 is about -0.2pp/yr, plus fragmentation, giving **-2.1pp**.

Net is about -0.6pp. The spread is about 3.5pp; the commodity-price spike in 2022 alone took the ratio to 62.4. That gives P(below 2024) ≈ 0.57. Rounded up to 60 because price risk at the 2026 peak is skewed down by 2035.

**Q2 (no model input).** 2025 base is $5.26T. UNCTAD puts 10-year growth at 7.1%/yr ([UNCTAD](https://unctad.org/publication/global-trade-update-september-2026-services-are-reshaping-global-trade)).
- Median: 5.26 x 1.075^10 ≈ 10.8, about 10.7.
- P10 at 5%/yr: 8.6.
- P90 at 10%/yr, allowing for AI and upward revisions: 13.6.

**Q3.** I add up: r* 1.5 + term premium 0.6 + energy/AI capex pull +0.2 + fiscal +0.1 ≈ 2.4.
- Clean-energy capex is $2.2T of $3.4T energy investment ([IEA WEI 2026](https://www.iea.org/reports/world-energy-investment-2026)). That is about 7% of world fixed investment, and front-loading adds about 1% of GDP to desired investment.
- The model is directional only. Electrification fast versus slow moves the 2026-35 rate change by just +0.02pp; fiscal stress moves it by +0.7pp. So the pull comes from fiscal policy, not energy.

**Q4.** Net interest = debt (about 118% of GDP) x effective rate. CBO's baseline gives about 4.5% in 2035 ([CBO](https://www.cbo.gov/publication/62207)). Every 0.1pp on the effective rate adds 0.12pp of GDP. Today's TIPS yield of 2.9% plus about 2.4% inflation compensation is about 5.3% nominal, above CBO's path, and the oil shock adds inflation. Leans YES.

**Q5.** The ratio needs to rise from 0.65 to 0.75, a factor of 1.154, or 1.6%/yr. Components:
- Real growth gap: about +1.4pp/yr (the model's directional PPP leg is 3.66% vs 2.25%).
- Deflator gap: about -1.5pp/yr.
- Renminbi: must supply the remaining +1.6%/yr.

The Hormuz shock (Brent at [$100-117 in October 2026](https://www.aljazeera.com/economy/2026/10/30/oil-flows-are-up-as-iran-war-turmoil-eases-why-do-prices-keep-rising)) hurts China, a fuel importer, against the US, a net exporter.

**Q6.**
- **A:** CBO's long-term outlook has net interest at 5.7% in FY2046 ([AAF](https://www.americanactionforum.org/insight/interest-payments-on-the-national-debt-the-near-and-long-term-outlook/)). Reaching 6% needs only about +0.3pp on the effective rate at about 140% debt. P ≈ 0.40, plus about 0.04 for a G7 restructuring or IMF programme.
- **B:** The model's world growth for 2040-45 is 3.58 in baseline (below the 3.75 bar), 3.97 with fast electrification and 4.48 in net-zero. That is conditional on the run and on UN-WPP-low demography. The model runs above consensus because its energy elasticity is a heterodox 0.55, while IMF medium-term growth is about 3.1%. I do not take the model's level: P(growth ≥ 3.75%) ≈ 0.22, and B ≈ 15 after A comes first.
- **C:** P(TIPS ≤ 1%) ≈ 0.2, giving C ≈ 13.

**Extra model run:** spec `/tmp/claude-0/-home-user-overlapping-generations/9198d79d-6016-55eb-80d2-9521474b8288/scratchpad/panel/E1-a2/spec.json`. Variants:
- **Fossil price staying high** (oil and gas +3%/yr real): 2040-45 growth rose from 3.58 to 3.87.
- **Fossil price collapse:** growth fell to 3.31.
- **Faster learning plus a fossil shock:** growth was 3.88.

The 2026-2035 rate change, the debt risk premium and the China/US ratio barely moved. In the model, fossil prices act on growth only through how fast electrification happens.

```json
{
  "lens": "fermi",
  "bluf": "The 2035 trade-to-GDP ratio probably comes in just under 2024: lower fuel-trade value and the drift away from goods trade outweigh digital-services growth. Q4 and Q6-A lean YES because the US interest bill is the rate times the debt and rates are already above CBO's assumed paths. China reaching 75% of US nominal GDP needs about 1.6%/yr of relative nominal-USD growth that only renminbi appreciation can supply, and the 2026 oil shock works against China.",
  "q1": 60,
  "q2": {"p10": 8.6, "p50": 10.7, "p90": 13.6},
  "q3": {"p10": 1.3, "p50": 2.4, "p90": 3.4},
  "q4": 62,
  "q5": 19,
  "q6": {"A": 44, "B": 15, "C": 13, "D": 28},
  "key_drivers": ["fuels ~6pp of trade/GDP shrinking via EV/solar displacement and price normalization", "US net interest = ~118-140% debt x effective rate already above CBO path", "China/US nominal gap needs ~1.6%/yr renminbi appreciation; oil shock hurts importer", "model: electrification speed swings 2040-45 world growth across the 3.75% bar"],
  "sources": ["https://www.iea.org/reports/world-energy-investment-2026", "https://unctad.org/publication/global-trade-update-september-2026-services-are-reshaping-global-trade", "https://www.cbo.gov/publication/62207", "https://www.americanactionforum.org/insight/interest-payments-on-the-national-debt-the-near-and-long-term-outlook/", "https://www.aljazeera.com/economy/2026/10/30/oil-flows-are-up-as-iran-war-turmoil-eases-why-do-prices-keep-rising", "https://data.worldbank.org/indicator/TX.VAL.FUEL.ZS.UN"],
  "caveats": ["Model world growth is PPP 2017$ and tracks UN WPP LOW demography; the model's interest rate is a real lending rate, use changes only", "IEA $2.2T clean figure is reported via secondary coverage; sometimes described as 'clean energy and electrification'", "CBO FY2046 5.7% net-interest figure is via an AAF summary of the Feb 2026 long-term projections, not the CBO page itself"]
}
```