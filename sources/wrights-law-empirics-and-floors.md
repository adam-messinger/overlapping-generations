# Wright's Law: Empirical Basis, Learning-Rate Stability, and Cost Floors

Verified literature review (deep-research pass, 2026). Companion to
`energy-learning-rates.md` (which calibrates the model's α values); this doc
covers the **empirical robustness of Wright's Law, the stability of learning
rates, and the saturation / cost-floor question** — the evidence base for the
model's `softFloor` parameters.

Provenance: 17 primary/peer-reviewed sources; 24 of 25 extracted claims survived
3-vote adversarial verification (one refuted, noted below). Every quantitative
claim here carries a confidence marker.

---

## 1. Wright's Law is robust as a *direction*, noisy as a *number*

- **Nagy, Farmer, Bui & Trancik (2013, PLoS ONE e52669)** tested six
  postulated progress "laws" on 62 technologies. Wright's Law (cost falls with
  cumulative production) gave the best out-of-sample forecasts — **but only
  marginally beats Moore's law** (cost falls with time); the two are nearly
  indistinguishable because production grows roughly exponentially (Sahal's
  relation). Technological progress is statistically forecastable, with
  square-root log-error growing ~2.5%/yr per forecast horizon. This paper
  grounds the MIT/Santa Fe Performance Curve Database. *(high confidence)*

- **Measured learning rates (per doubling of cumulative production):**
  - Li-ion cells **~20% (all types) to ~24% (cylindrical)**, i.e. ~13%/yr, and
    ~97% cumulative decline since 1991 — Ziegler & Trancik (2021, *Energy &
    Environmental Science* 14:1635; arXiv:2007.13920). This *replaced* a prior
    "wide, ambiguous" literature (annual declines 8.8–29%, LR 14–30%). *(high)*
  - Solar PV modules **~20%** (~15%/yr over 2010–2020). *(high)*
  - Solar/wind/batteries together have fallen **~10%/yr for decades**
    (Way et al. 2022). *(high)*
  - Current price anchors: BNEF battery packs **$108/kWh (2025, record low,
    −8% y/y despite rising metal prices)**, BEV packs $99/kWh; IRENA utility
    solar installed cost down ~87% since 2010. *(supporting, from fetched
    sources; not in the adversarially-verified top set)*

- **But the rates are unstable.** Carlino/Wongel et al. (2025, *Advances in
  Applied Energy*, "Variability of Technology Learning Rates") analysed 87
  technologies: reported LRs vary by **up to an order of magnitude** across
  studies (not explained by time interval, geography, or variable choice);
  rates change over time for ~⅔ of technologies; **"past learning rates are not
  good predictors of future learning rates."** Stepwise (time-varying) models
  fit 58 of 87 technologies better than a constant rate. Wind is the worst
  case: meta-analysis estimates span **>30% to negative** per doubling
  (Lindman & Söderholm 2012). *(high)*

---

## 2. Farmer's forecasting method and the IAM indictment

- **Way, Ives, Mealy & Farmer (2022, Joule 6(9):2057–2082)** — the central
  paper. Method: a **stochastic** generalization of Wright's Law that forecasts
  a *probability distribution* of future cost, using autocorrelated noise
  *precisely because* the point learning rate is unstable. Backtested on ~50
  technologies / ~6,000 forecasts to 20-year horizons; accuracy matched
  a-priori estimates (lineage: Farmer & Lafond 2016). *(high)*
- Central result: a **fast green transition is likely the cheapest path** —
  expected net saving **~$14T**, median **~$26T** at Stern's 1.4% discount
  rate, *before* climate damages (INET press rounds this to ~$12T). *(high)*
- IAM indictment: across **2,905 IAM scenarios**, mean projected solar cost
  decline was **2.6%/yr (all under 6%) vs ~15%/yr actual** — models "have
  consistently failed to produce results in line with past trends." Corroborated
  by 2025 ex-post analyses of IEA WEO projections. *(high)*

---

## 3. The saturation / cost-floor question (evidence base for `softFloor`)

**The evidence is genuinely split, and no defensible numeric 2050 floor
survived verification.**

- **Farmer / Oxford camp — no floor.** Way et al. (2022) state past IAM floor
  costs **"have repeatedly been violated,"** declare **"we know of no good
  empirical evidence supporting floor costs and do not impose them,"** and run
  their forecasts with no floor. Imposing a floor is identified as a *reason*
  IAMs overestimated future costs. *(high)*
- **Variability / OIES camp — the floor is real but sits in soft/BOS costs.**
  Grafström & Poudineh (OIES EL-43, 2021): the solar **module is now only ~13%
  of installed cost (was 36% in 2010)**, so a 10% module-cost drop cuts total
  system cost by only ~1.3%. **Balance-of-system (BOS) costs learn far slower —
  ~11%/doubling vs ~20% for modules** — and subcomponents decline erratically
  (inverters and installation/soft-labor costs have *risen* in some years). So
  an *effective* floor exists, but it lives in BOS/soft costs and its **level is
  empirically undetermined**. *(high)*
- **The one hard-physical-saturation claim was REFUTED.** A claim that solar's
  polysilicon learning rate collapses from ~29.3% to ~7.6% past ~3 TW cumulative
  installs (Hallam et al.) **failed adversarial verification 0-3.** There is no
  verified evidence that solar learning hits a hard materials/thermodynamic wall
  in the relevant range.

**Net:** a cost floor is defensible only as a **BOS/soft-cost proxy**, its level
is contested and unquantified, and the directional bias of the literature is
that assumed floors have been **too high** (repeatedly beaten).

---

## 4. Methodological critiques

- **Endogeneity / omitted-variable bias.** Single-factor experience curves
  conflate learning-by-doing with economies of scale, R&D, and *input-price
  movements*. Apparent "negative learning" can simply reflect commodity spikes
  (e.g. iron ore $40→$160/dmt raising turbine-structure cost) rather than
  genuine anti-learning (Grafström & Poudineh 2021; Nemet 2006;
  Söderholm & Sundqvist 2007; Nordhaus 2014). *(high)*
- **Recent cost bumps.** The pre-2020 datasets underlying the ~10%/yr / ~20% LR
  figures do not capture the 2021–2022 lithium/polysilicon spikes that raised
  battery, wind, and solar-input costs — reinforcing the endogeneity critique.

---

## 5. Implications for this model

- **Learning exponents (α) are defensible.** Solar α=0.36 ⇒ **~22% LR**; wind
  α=0.23 ⇒ **~15% LR** (LR = 1 − 2^−α). Solar ≈ measured module rate; wind sits
  inside the (very wide, unreliable) wind range. Battery α=0.18 ⇒ ~12% LR, at
  the low end but reasonable. See `energy-learning-rates.md` for the α
  calibration. No change indicated.
- **The `softFloor`s are the real exposure.** The model's solar `softFloor`
  ($12/MWh) sets the terminal 2100 solar LCOE **~1:1** (sweep: floor 6/12/24 →
  LCOE 11.8/18.0/30.1). Per §3, this is defensible only as a BOS/soft-cost
  proxy, its level is contested, and the literature bias says it is more likely
  **too high** than too low — meaning the model, if anything, *understates* how
  cheap clean energy gets and how robust the transition is. Treat `softFloor` as
  a **wide-uncertainty band**, sensitivity-test it **downward**, and read it as
  a soft parameter, not a known quantity (see `docs/SENSITIVITY.md`). The
  battery `softFloor` is inert on the baseline transition (never binds).
- **Methodological gap.** The model uses a *fixed* α; Farmer uses a *stochastic*
  one *because* fixed rates are unreliable (§1). A distribution over α would be
  more honest; this is an architectural change, not a tweak.
- **"Does the robust core soften if learning saturates?"** The evidence says
  **no** — saturation is the weaker side of the debate (no floor survives; every
  model that assumed one under-predicted). The *direction* (learning continues →
  transition robust) is well-supported and the model is, if anything,
  conservative. What is *not* supported is the *precision* — a single 22% rate
  down to a fixed $12 floor. Trust the transition; band the terminal cost.

---

## Sources

- Nagy, Farmer, Bui & Trancik (2013), *A Statistical Basis for Predicting
  Technological Progress*, PLoS ONE 8(2):e52669 —
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0052669
- Way, Ives, Mealy & Farmer (2022), *Empirically grounded technology forecasts
  and the energy transition*, Joule 6(9):2057–2082 —
  https://www.cell.com/joule/fulltext/S2542-4351(22)00410-X
  (INET working paper:
  https://oms-inet.files.svdcdn.com/staging/files/energy_transition_paper-INET-working-paper.pdf)
- Ziegler & Trancik (2021), *Re-examining rates of lithium-ion battery
  technology improvement and cost decline*, Energy & Environmental Science
  14(4):1635 — https://arxiv.org/pdf/2007.13920
- Carlino / Wongel et al. (2025), *Variability of Technology Learning Rates*,
  Advances in Applied Energy —
  https://www.sciencedirect.com/science/article/pii/S2666792425000460
- Grafström & Poudineh (2021), *A critical assessment of learning curves for
  solar and wind power technologies*, OIES EL-43 —
  https://www.oxfordenergy.org/wpcms/wp-content/uploads/2021/02/A-critical-assessment-of-learning-curves-for-solar-and-wind-power-technologies-EL-43.pdf
- Lindman & Söderholm (2012), wind-power learning meta-analysis, Energy
  Economics; Nemet (2006); Söderholm & Sundqvist (2007); Nordhaus (2014) —
  endogeneity / two-factor critiques.
- BloombergNEF (2025), battery pack price survey —
  https://about.bnef.com/insights/clean-transport/lithium-ion-battery-pack-prices-fall-to-108-per-kilowatt-hour-despite-rising-metal-prices-bloombergnef/

**Refuted (did not survive verification):** Hallam et al. polysilicon-saturation
claim (LR 29.3%→7.6% past ~3 TW), 0-3 —
https://onlinelibrary.wiley.com/doi/10.1002/solr.202200458
