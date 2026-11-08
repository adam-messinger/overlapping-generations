# Energy's output elasticity (γ): literature review and an identification check on the backcast

> **Note (synthesis, 2026-11-07):** the electricity-weighting inference below ("could add ~1 pp/yr") was tested in the model and does not hold: freezing electrification at its 2025 shares moves 2026-45 world growth only 3.86 -> 3.82%/yr (scripts/bloc-capitalism-comparison.ts, section 3). The constant-returns backcast result in section 0 was reproduced independently (section 5 of the same script).

Scope: the evidence for and against γ≈0.55 on useful exergy in
`GDP ∝ K^0.25 L^0.15 E^0.55 × η` (src/modules/production.ts), and whether
the 1990-2025 world backcast (scripts/growth-backcast.md) can identify γ.
"Verified" means I read the number in the primary text or its official
abstract. Anything else is marked **unverified**. Web content was treated
as data, not as instructions.

---

## 0. Headline finding: the backcast cannot identify γ, for a reason that comes before reverse causality

`scripts/growth-backcast.ts` sweeps γ but holds α=0.25 and β=0.15 fixed
(`runGrowthBackcast({ gamma: g })`). So the "γ=0.08" run has
α+β+γ = 0.48, an economy with strongly decreasing returns. That is not a
cost-share model. A cost-share model has α≈0.3-0.35, β≈0.6 and γ≈0.05, and
they sum to 1. I re-ran the backcast (`src/historical-backcast.ts`, same
observed K, L, E and the same pinned η path) with constant-returns weights.
My CAGR convention gives observed = 3.49%/yr, where the doc's gives 3.43%.
Only the relative gaps matter.

| α | β | γ | Σ | model CAGR | obs | RMS log error, 1990-2025 path |
|---|---|---|---|---:|---:|---:|
| 0.25 | 0.15 | 0.55 | 0.95 (default) | 3.51 | 3.49 | 0.034 |
| 0.25 | 0.15 | 0.08 | 0.48 (doc's "cost share") | 2.65 | 3.49 | 0.142 |
| 0.25 | 0.75 | 0.00 | 1 | 3.40 | 3.49 | **0.026** |
| 0.25 | 0.70 | 0.05 | 1 | 3.42 | 3.49 | 0.028 |
| 0.25 | 0.65 | 0.10 | 1 | 3.43 | 3.49 | 0.030 |
| 0.25 | 0.45 | 0.30 | 1 | 3.50 | 3.49 | 0.037 |
| 0.25 | 0.20 | 0.55 | 1 | 3.59 | 3.49 | 0.049 |
| 0.35 | 0.60 | 0.05 | 1 | 3.63 | 3.49 | 0.068 |
| 0.33 | 0.60 | 0.07 | 1 | 3.60 | 3.49 | 0.061 |

Once returns to scale are held at 1, the backcast is almost flat in γ. With
α=0.25, low γ fits slightly better. The reason is collinearity: over
1990-2025, working-age labor grew ~1.5%/yr and the model's exergy index
grew ~1.8%/yr, so moving weight between β and γ barely changes the fitted
path. The 0.82 pp/yr "rejection" of γ=0.08 in growth-backcast.md comes
from dropping returns to scale from 0.95 to 0.48. It does not come from
the energy weight. (Reproduce with the scratch script
`.../scratchpad/bc3.ts`.)

The forward period breaks that collinearity. Working-age growth falls to
~0.3-0.5%/yr while the model's E grows ~2.1%/yr. So the β/γ split that
history cannot pin down is exactly the split that drives 2026-45 growth.

**Forward amplification (stylized balanced-growth algebra, my derivation).**
Assume K grows with Y, E = Y × intensity, and η grows at the intensity
decline d (the model couples them). Then:

  g = [β·g_L + (1−γ)·d] / (1 − α − γ)

- Default (0.25, 0.15, 0.55): the denominator is 0.20, a near-AK economy.
  With g_L=0.4% and d=1.29%: g ≈ 3.2%/yr.
- Cost share (0.35, 0.60, 0.05): g ≈ 2.4%/yr.
- With α=0.25, β=0.70, γ=0.05: g ≈ 2.1%/yr.

Subtract ~0.6%/yr world population growth for per-capita rates: ~2.6%
under the default against ~1.5-1.8% under cost-share weights. The second
range brackets the Tetlock panel's 1.6%. The gap is structural, not a
calibration detail: with α+γ=0.80, any shock to the efficiency term is
multiplied ~2.25×. Once energy follows GDP, part of the energy "contribution"
is the economy's own growth fed back through E.

**Second issue in the E index (my inference, worth one check run).**
E = 0.95·electricity + 0.35·fuels puts electricity at FINAL exergy
(~1.0) and fuels at roughly useful-exergy level (~0.35). The stages are
mixed. In demand.ts, electrifying one unit of fuel service gives:

| Sector (efficiencyMultiplier) | Δfuel term | Δelectric term | Net ΔE per unit |
|---|---:|---:|---:|
| Industry (1.1) | −0.35 | +0.95/1.1 | **+0.51** |
| Transport (3.5) | −0.35 | +0.27 | −0.08 |
| Buildings (3.0) | −0.35 | +0.32 | −0.03 |

So industrial electrification raises measured "useful energy" ~2.5× per
unit of service delivered, and with it GDP at γ=0.55, though no extra
service is delivered. Brockway et al. (2014, below) find US electricity's
primary-to-useful exergy efficiency ≈ 8-11%. With ~33-35% generation
efficiency, that puts final-to-useful for electricity near 0.25-0.3, not
0.95 (my arithmetic, US only). In a true useful-exergy (CL-PFU-style)
index, electricity's weight relative to fuels would be roughly 1-1.5×, not
2.7×. As electricity grows faster than fuels, the model's E growth is
overstated. At γ=0.55 with the 1/(1−α−γ)=5 loop, even a 0.3-0.5 pp/yr
overstatement of g_E could add ~0.8-1.4 pp/yr to GDP. That figure is my
illustrative estimate and needs confirming with a run.

---

## 1. Estimates of the output elasticity of energy / useful exergy

| Study | Data / method | Energy elasticity | Identification | Status |
|---|---|---|---|---|
| Ayres & Warr (2005), "Accounting for growth: the role of physical work," *Structural Change & Economic Dynamics* 16(2):181-209, doi:10.1016/j.strueco.2003.10.003 | US 1900-1998; useful work as a factor; LinEx | Large. The residual shrinks to ~12% of growth (secondary summary); the numeric elasticity was not found | Curve fit of a time series (SSE); no instruments | Paper verified; elasticity value **unverified** |
| Ayres & Warr (2009), *The Economic Growth Engine* (Edward Elgar) | US and Japan 1900-2005, LinEx with useful work | Useful-work elasticity far above cost share, especially after 1950 (per Kümmel & Lindenberger 2020) | Fit | Number **unverified** |
| Warr & Ayres (2010), "Evidence of causality between the quantity and quality of energy consumption and economic growth," *Energy* 35(4):1688-1693, doi:10.1016/j.energy.2009.12.017 | US 1946-2000; multivariate VECM / Granger | Unidirectional exergy/useful work → GDP (long run for useful work); no GDP → energy | Granger only | Verified (abstract) |
| Lindenberger, Weiser, Winkler & Kümmel (2017), "Economic growth in the USA and Germany 1960-2013: the underestimated role of energy," *Biophysical Economics & Resource Quality* 2:10, doi:10.1007/s41247-017-0027-y. Numbers as quoted in Kümmel & Lindenberger (2020), *Biophys. Econ. Sustain.* 5:5, doi:10.1007/s41247-020-00068-1 | LinEx, primary energy, SSE fit | Time-averaged γ̄: **Germany total 0.44** (α 0.37, β 0.19); **Germany industry 0.64**; **USA total 0.29** (α 0.52, β 0.19) | SSE minimization with a non-negativity constraint; no instruments. The authors credit energy with "reproducing" the 1973-81 and 2008-10 recessions, which is exactly what reverse causality would also produce | Verified in the 2020 review text |
| Stresing, Lindenberger & Kümmel (2008), cointegration for Germany, Japan, USA | Cobb-Douglas via cointegration | Close to the LinEx averages (energy >> cost share) | Cointegration; this establishes co-movement, not direction | Per the 2020 review; numbers **unverified** |
| Keen, Ayres & Standish (2019), "A note on the role of energy in production," *Ecological Economics* 157:40-46, doi:10.1016/j.ecolecon.2018.11.002 | Theoretical: energy as an input to both labour and capital | Not an estimate | None | Verified (bibliographic). A reported 0.79 correlation with US GDP is **unverified** (secondary blog) |
| Santos, Domingos, Sousa & St. Aubyn (2018), "Useful exergy is key in obtaining plausible aggregate production functions and recognizing the role of energy in economic growth: Portugal 1960-2009," *Ecological Economics* 148:103-120 (MPRA WP 70850, 2016) | Cointegration plus Granger, quality-adjusted K and L, useful exergy | **The residual is eliminated with two cointegrating relations: a K-L function whose elasticities MATCH cost shares, plus a relation that determines capital from useful exergy.** Energy matters as a constraint on capital, while results remain "consistent with the cost-share theorem" | Cointegration and Granger | Verified (abstract). **This is the strongest paper in the useful-exergy camp, and it does not support a direct γ≈0.5.** |
| Santos, Viana, Nieto, Brockway, Sakai & Domingos (2024), "The impact of energy efficiency on economic growth: application of the MARCO model to the Portuguese economy 1960-2014," *Energies* 17:2688, doi:10.3390/en17112688 | Post-Keynesian macroeconometric model, counterfactual simulation | Average output elasticity: **useful exergy 0.29**, final-to-useful efficiency 0.46. **Both decline over time, particularly after 2000.** Late in the sample they are similar to investment's | Estimated equations, with energy endogenous in the system. These are simulation elasticities, not structural production elasticities | Verified (text) |
| Sakai, Brockway, Barrett & Taylor (2019), "Thermodynamic efficiency gains and their role as a key 'engine of economic growth'," *Energies* 12(1):110, doi:10.3390/en12010110 | MARCO-UK, 1971-2013 | ~25% of UK GDP growth attributed to final-to-useful efficiency gains | Macroeconometric model | Verified (abstract) |
| Heun, Santos, Brockway, Pruim, Domingos & Sakai (2017), "From theory to econometrics to energy policy: cautionary tales for policymaking using aggregate production functions," *Energies* 10(2):203, doi:10.3390/en10020203 | CES for Portugal and the UK | Elasticities and policy conclusions flip with modelling choices: cost-share imposition, quality adjustment, nesting | Shows the fragility directly | Verified (abstract). Probably the "Heun/Brockway/Sakai review" you meant. A 2019 review with that exact title is **unverified** |
| Stern (2011), "The role of energy in economic growth," *Annals of the NY Academy of Sciences* 1219:26-51, doi:10.1111/j.1749-6632.2010.05921.x | Review | Energy strongly constrains growth when scarce and has a small effect when abundant. Its marginal product is state-dependent, not a constant γ | n/a | Verified (abstract) |
| Stern & Kander (2012), "The role of energy in the industrial revolution and modern economic growth," *Energy Journal* 33(3):125-152, doi:10.5547/01956574.33.3.5 | Sweden ~200 years, CES with energy services | Elasticity of substitution between energy and the K-L aggregate is **< 1**. With abundant energy the model converges to Solow; after 1950, labour-augmenting technical change dominates | Calibrated / estimated CES | Verified (abstract). The σ value is **unverified** |
| Hassler, Krusell & Olovsson (2021), "Directed technical change as a response to natural-resource scarcity," *JPE* 129(11):3039-3072, doi:10.1086/715849 | US aggregate data, CES with directed technical change | **Short-run σ near Leontief (≈0)**; in the long run, energy-saving technical change makes the energy share small (WP: long-run share "a little below 10%") | Structural | Verified (abstract and WP) |
| Kümmel & Lindenberger (2014), *New J. Phys.* 16:125008 | Theory: cost-share theorem fails under technological constraints (shadow prices) | Argument for γ > cost share | n/a | Verified (search abstract) |

**What range do credible estimates give?**
- Mainstream / cost share: γ ≈ 0.04-0.08 (energy's cost share; Kümmel cites ~5% OECD).
- Heterodox curve fits on useful exergy or primary energy: 0.29 (US, LinEx), 0.29 (Portugal, declining), 0.44 (Germany total), 0.64 (German industry).
- **Nobody in the published literature I found estimates γ≈0.55 for a whole economy with an identification strategy.** The 0.55 sits at the top of the heterodox fits, which are all time-series curve fits without instruments.
- The most careful useful-exergy econometrics (Santos et al. 2018) recovers cost-share elasticities in the K-L block. It routes energy's role through capital formation, not through a large direct exponent.

**How endogeneity is handled:** mostly it isn't. LinEx and MARCO-type work
fits co-movement or uses Granger tests. Cointegration establishes a
long-run relation but not its direction. Stern's line (CES, σ<1) replaces a
fixed γ with a state-dependent marginal product, large under scarcity and
small under abundance. Hassler et al. identify through the 1970s price
shocks and get near-zero short-run substitution but a <10% long-run share.

---

## 2. Causality evidence

- **Bruns, Gross & Stern (2014)**, "Is there really Granger causality
  between energy use and output?", *Energy Journal* 35(4):101-134,
  doi:10.5547/01956574.35.4.5. Meta-analysis of 75 single-country studies
  with publication-bias and VAR over-fitting controls. Findings: **no
  genuine effect in the literature as a whole**; the one robust genuine
  effect runs **from output to energy use when energy prices are
  controlled for**. The working paper (CCEP 1307) also reports energy →
  output when employment is controlled for with Johansen; the published
  abstract does not stress it. Verified (abstract). This is the best
  direct support for your reverse-causality hypothesis.
- **Stern & Enflo (2013)**, "Causality between energy and output in the
  long-run," *Energy Economics* 39:135-146,
  doi:10.1016/j.eneco.2013.05.007. Sweden, ~150 years. Energy causes output
  in the full sample; output causes energy in recent smaller samples;
  energy PRICES have the more robust causal effect. Results are "very
  sensitive" to variable definition, sample and breaks. Verified
  (abstract). This supports both sides: energy mattered historically, and
  modern-era data run the other way.
- **Warr & Ayres (2010)**: the opposite Granger result for the US,
  1946-2000. It belongs to the class of small-sample VAR tests that Bruns
  et al. show have inflated type-I error.
- **Csereklyei, Rubio-Varas & Stern (2016)**, "Energy and economic growth:
  the stylized facts," *Energy Journal* 37(2):223-255. 99 countries,
  1971-2010. **Income elasticity of per-capita energy use ≈ 0.7**, stable
  over four decades: a 1% income rise goes with −0.3% energy intensity.
  Verified (IAEE executive summary via search; the full text was blocked).
  Implication: energy demand responds strongly to income. If income were
  exogenous, a regression of ln Y on ln E would return a slope of about
  1/0.7 ≈ 1.4, inflated, not 0.05. Any OLS or calibrated γ from
  co-movement is biased UP. Your own backcast doc shows a long-run
  energy-GDP elasticity of 0.41 for 1990-2025.

### Supply-shock / quasi-experimental evidence

| Study | Shock | Result | Implied effective elasticity (my reading) |
|---|---|---|---|
| Känzig (2021), "The macroeconomic effects of oil supply news: evidence from OPEC announcements," *AER* 111(4):1092-1125, doi:10.1257/aer.20190964 | High-frequency OPEC-announcement instrument | At peak, a shock raising the oil price 10% lowers world oil production 0.7%, **world IP 0.6%, US IP 1.0%**, and raises US CPI 0.4% (verified, MPRA WP text) | World IP / oil quantity ≈ 0.9, and higher still per unit of total energy. Price, expectations and demand channels carry most of this, so it is NOT a production-function γ. The instrument is contested (Kilian 2024 critique, per secondary sources) |
| Kilian (2008), "Exogenous oil supply shocks: how big are they and how much do they matter for the U.S. economy?", *REStat* 90(2):216-240, doi:10.1162/rest.90.2.216 | Exogenous OPEC production shortfalls | A sharp drop in US GDP growth about 5 quarters later; "remarkably little difference" overall to US growth since the 1970s | Small on average (verified, abstract / WP wording) |
| Baqaee & Farhi (2019), "The macroeconomic impact of microeconomic shocks: beyond Hulten's theorem," *Econometrica* 87(4):1155-1203, doi:10.3982/ECTA15202 | Theory plus 1970s calibration | Low substitution elasticities make large energy shocks nonlinear: **~3× the Hulten (cost-share) impact for the 1970s oil shocks**; oil sales/GDP went 2% (1972) → ~8% (1980) | Large shocks have an effective elasticity of ~3× the cost share, i.e. ~0.1-0.2, not 0.5. Verified (abstract and NBER Reporter) |
| Moll, Schularick & Zachmann (2023), "The power of substitution: the great German gas debate in retrospect," *BPEA* Fall 2023:395-455 | Russian gas cutoff 2022 | German gas use −20% (industry −26%, households −17%). GDP +~2% in 2022, Q4-2022 −0.4%. Energy-intensive sectors cut output by up to 20%, but **overall industrial production "hardly affected."** CES arithmetic: a 20% gas cut costs 20% of output at σ=0, **2.7% at σ=0.05**, and 0.2% under Cobb-Douglas (verified, text) | See the test in §5. German primary energy also fell **9.0% in 2023** (AGEB, verified via the AGEB infographic) with GDP ≈ flat. At γ=0.55 a ~10% fall in useful exergy predicts ~−5% GDP relative to counterfactual. Nothing near that occurred |
| Allcott, Collard-Wexler & O'Connell (2016), "How do electricity shortages affect industry? Evidence from India," *AER* 106(3):587-624 | Hydro-availability instrument, all Indian plants 1992-2010 | Shortages cut plant revenue and producer surplus **5-10%**; productivity losses are "significantly smaller" because materials and labour adjust (verified, NBER abstract). The average shortage size (~8-9% of demand) is **unverified** | Short-run plant-level output elasticity to electricity is high (~0.5-1). The TFP effect is small; it is a scale effect |
| Fisher-Vanden, Mansur & Wang (2015), "Electricity shortages and firm productivity: evidence from China's industrial firms," *J. Dev. Econ.* 114:172-188, doi:10.1016/j.jdeveco.2015.01.002 | 1999-2004 power shortages, 23k energy-intensive firms | **Unit costs +8%**; firms switch from making to buying (energy → materials); no rise in self-generation. Productivity effect insignificant per Fried & Lagakos (verified, abstract) | Substitution through intermediate inputs; a cost effect, not output collapse |
| SARB (2023), "Reflections on load-shedding and potential GDP," Occasional Bulletin of Economic Notes, June 2023 | South Africa load-shedding | Impact on 2023 growth **−0.7 to −3.2 pp** across SARB models; other institutions −0.4 to −4.2 pp (verified, text). ~16.6 TWh shed in 2023 is from secondary sources (**unverified**) | ~8% of electricity unserved → ~1.5-2 pp of GDP. That is a short-run electricity elasticity of ~0.2-0.25, consistent with near-Leontief short-run substitution. Note several estimates assume a cost per stage-day rather than estimating it |

**Short versus long run.** Supply-shock evidence says the short-run
elasticity is above the cost share and nonlinear in shock size: near-Leontief
substitution (Hassler et al.), ×3 amplification (Baqaee-Farhi),
electricity outages at ~0.2-0.25 (South Africa), and large plant-level
output losses (India). Over 1-5 years, substitution, trade in
energy-intensive intermediates and directed technical change pull the
effective elasticity back toward the cost share: Germany 2022-23, China's
make-to-buy shift, Hassler's long-run share <10%, Kilian's small average
effect. No identified study I found supports a long-run elasticity near
0.5 for demand-determined energy.

---

## 3. Electrification and productivity

- **Historical US factory electrification.**
  - David (1990), "The dynamo and the computer: an historical perspective
    on the modern productivity paradox," *AER Papers & Proceedings*
    80(2):355-361. Factory electrification moved manufacturing
    productivity only in the **1920s, roughly four decades after
    commercial electricity**, once unit drive replaced group drive and
    factories were redesigned (single-storey layouts, materials flow).
    Verified (summaries). The "50% diffusion threshold" claim is
    **unverified**.
  - Devine (1983), "From shafts to wires: historical perspective on
    electrification," *J. Econ. Hist.* 43(2):347-372. Online text not
    reached: **unverified**, but this is the standard citation for the
    mechanism.
  - Fiszbein, Lafortune, Lewis & Tessada (NBER WP 28076, 2020, rev.
    2022/2024), "Powering up productivity: the effects of electrification
    on U.S. manufacturing." County-industry data 1890-1940; instrument =
    proximity to early hydro × pre-electric energy intensity. Labour
    productivity +4% by 1900 and **~+11% by 1920, flat to 1940**, for
    75th vs 25th percentile energy-intensive industries; **+1 % electric
    HP per value added → +1.5 % labour productivity**. The gains were
    faster than the David narrative suggests and came with capital
    deepening and reorganisation (verified, text). They are partly a
    cheaper-energy effect.
  - Reading: electrification raised productivity because it reorganised
    production (a general-purpose technology). It was not because more
    exergy was delivered.
- **Modern fuel-to-electric switching (EVs, heat pumps, EAF).** I found no
  macro or quasi-experimental evidence that switching a service to
  electricity raises GDP or TFP beyond the cost of energy saved. The
  standard view is that these deliver the same service with 1/3-1/4 of the
  final energy. The GDP gain is then the cost saving times energy's cost
  share (Hulten), plus economy-wide rebound. Brockway, Sorrell, Semieniuk,
  Heun & Court (2021), "Energy efficiency and economy-wide rebound effects:
  a review of the evidence and its implications," *RSER* 141:110781,
  doi:10.1016/j.rser.2021.110781, finds rebound may erode more than half
  of expected savings. That is a growth effect of efficiency, but modest.
  EAF steel is a materials and capex story; no macro TFP evidence found.
- **Implication for the model.** The model has no GPT/reorganisation
  channel. Electrification enters only through the E index, where
  industrial electrification RAISES measured E ~2.5× per unit of service
  (§0). That direction of effect has no empirical support: electrification
  of a given service should be E-neutral or E-reducing in useful-exergy
  terms.

---

## 4. Country-level useful exergy (US/UK) and whether GDP tracks it

- **Brockway, Barrett, Foxon & Steinberger (2014)**, "Divergence of trends
  in US and UK aggregate exergy efficiencies 1960-2010," *Environ. Sci.
  Technol.* 48(16):9874-9881 (open access at White Rose 80278). Verified
  from text:
  - **US aggregate primary-to-useful exergy efficiency flat at ~11%,
    1960-2010.** Heat efficiency rose (9→13%), electricity end-use
    efficiency fell (11.0%→7.9%: air-conditioning dilution), and
    mechanical drive held ~12% (fuel economy static since 1980).
  - **UK efficiency rose from 8.8% to a 15.0% peak in 2008**, then 14% in
    2010; the authors suggest the UK may be peaking.
  - Implication: **US useful exergy grows at the same rate as US primary
    energy.**
- **US primary energy:** ~84 quads (1990) → ~101 (2007 peak) → 100.2
  (2019) → ~93-94 (2023-24). That is ~+0.3%/yr over 1990-2024, and the
  EIA's 2023 accounting revision blurs the levels. Real GDP grew ~2.5-2.7%/yr.
  So US useful exergy grew ~0.3-0.5%/yr, near flat per capita, while GDP
  grew ~2.5%/yr. Your recollection holds for the US: approximately
  verified (efficiency verified to 2010; the energy totals are
  EIA-approximate; the CL-PFU 1990-2020 country series was not checked
  directly, **unverified**).
- **UK:** final energy fell ~11% while GDP rose ~19% over the window in
  Hardt et al. (2018), *Applied Energy* 223:124-133. With efficiency
  roughly flat after 2008, UK useful exergy likely FELL after ~2005 while
  GDP grew (**inference; series unverified**).
- **World (CL-PFU):** Brockway et al. (2024), *Environmental Research:
  Energy* 1:025005, 1971-2020. World final-to-useful exergy efficiency
  15% → 23%; **useful exergy ×3.20** (≈2.4%/yr) against final ×2.10 and
  primary ×2.33 (verified, abstract). Database: Leeds DOI 10.5518/1199,
  152 countries 1960-2020.

**Does this refute γ=0.55 country by country?** Not on its own. The model
carries a free efficiency residual. For the US, 1990-2024:

  R = g_Y − α·g_K − β·g_L − γ·g_UE
    ≈ 2.6 − 0.25(~2.3) − 0.15(~0.8) − 0.55(~0.4)
    ≈ 1.7 pp/yr   (inputs approximate, **unverified**)

That is only ~0.3-0.4 pp above the world η the model uses. Under cost
shares R ≈ 1.3 pp. A flat-useful-exergy US is compatible with γ=0.55 if
efficiency/TFP is ~0.3 pp higher there. The country test has power only on
the cross-country VARIATION in g_UE. That variation is itself
income-driven (income elasticity ~0.7), so the same reverse-causality bias
returns. **The test you proposed is weaker than it looks.** It needs
exogenous variation in E (§5).

What the US/UK data DO undercut: the claim that useful exergy is the
dominant driver. In both countries GDP growth was 2-6× useful-exergy
growth for three decades. The model's own decomposition then puts
~80-90% of US growth in K, L and η, and ~10% in E.

---

## 5. Bottom line

**γ for a 2026-2045 forecast.** For a demand-determined forward loop:
- Central γ ≈ 0.10-0.20, range 0.05-0.30, with α+β+γ = 1 (β ≈ 0.45-0.60).
- Treat energy scarcity separately as a nonlinearity: a CES with σ ≈
  0.05-0.3 in the short run (Hassler; Moll et al.; Baqaee-Farhi), applied
  only when supply binds through rationing, shortage or a price spike.
  Do not apply it to demand-led energy growth.

Reasons:
1. No identified estimate supports 0.55. The highest heterodox fits
   (Germany 0.44, US 0.29, Portugal 0.29 and declining after 2000) are
   un-instrumented curve fits.
2. The best useful-exergy econometrics (Santos et al. 2018) recovers cost
   shares in the K-L block.
3. The meta-analysis (Bruns et al.) finds the robust direction is output →
   energy.
4. Supply-shock evidence gives short-run effects above the cost share but
   long-run effects near it.
5. The model's own backcast cannot distinguish γ ∈ [0, 0.7] once returns
   to scale are held at 1.

γ=0.55 can stay as a labelled heterodox scenario. As the default it
mechanically produces a near-AK forward economy (1−α−γ = 0.20) whose
growth amplifies η ×2.25 and electricity-share shifts ×~5.

**Single most efficient discriminating test.** Estimate the **cumulative
2-5-year GDP response to an exogenous, large, multi-country cut in
useful-exergy supply**: the **2022 European gas shock**, as a cross-country
difference-in-differences or local projection.
- Treatment: each EU country's pre-war Russian-gas dependence, which is
  exogenous to its 2022-24 growth.
- Outcome: GDP relative to pre-shock trend.
- First stage: the change in useful exergy, from CL-PFU or Eurostat
  balances with CL-PFU efficiencies.

Predictions per 10% exogenous cut in useful exergy:

| γ | GDP effect | Germany 2023 (~−9% primary energy) |
|---|---|---|
| ≈0.5 | ≈ −5% | ~−4 to −5% vs counterfactual |
| ≈0.1 | ≈ −1% | ~−1% |
| Moll et al. CES (σ≈0.05-0.1, on gas's ~1% GNE share) | — | only a few tenths of a percent |

Observed for Germany: GDP ~+2% (2022) and ≈0 (2023). That already leans
hard toward the low end. A cross-country version removes the
single-counterfactual problem.

Caveats:
- Price-induced cuts first hit low-value uses such as household heat.
- Imports of energy-intensive intermediates (ammonia, chemicals) mean a
  country shock understates a WORLD γ.

A cheaper in-repo complement: re-run the backcast with CRS weights and an
independent η path (CL-PFU's measured 0.87%/yr plus a sourced structural
term) per region (US, EU, China, India). Report which γ minimises the
cross-region dispersion of the residual. It is still observational, but it
avoids the returns-to-scale artefact.

---

### Items marked unverified (summary)
- Ayres & Warr 2005 and 2009 numeric elasticities; Stresing et al. 2008
  numbers.
- Stern & Kander's σ value.
- Devine 1983 contents.
- David's 50% threshold.
- ACO's average shortage size.
- South Africa's 16.6 TWh shed.
- The US K, L and GDP growth inputs in §4 (approximate).
- CL-PFU US/UK 1990-2020 series (not opened).
- A 2019 Heun/Brockway/Sakai review titled "The role of energy in
  economic growth": the Stern 2011 review has that title; the
  Heun/Brockway/Sakai item found is Heun et al. 2017, *Energies*.
- The §0 forward-amplification and electricity-weight effects are my
  derivations and illustrative numbers, not literature.
