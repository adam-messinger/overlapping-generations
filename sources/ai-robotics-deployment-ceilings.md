# AI Compute & Robotics: What Bounds Deployment Through 2050?

Verified literature review (deep-research pass, 2026). Evidence base for the
model's two automation ceilings — `robotSaturation` (robots per 1,000 workers)
and `dataCenterSaturation` (AI/datacenter TWh/yr).

Provenance: 23 sources; 22 of 25 extracted claims survived 3-vote adversarial
verification (3 refuted, noted). **Coverage is deliberately asymmetric** — the
AI-energy evidence is strong and current; the robotics-fleet and
value-vs-cost evidence is thin or refuted. Confidence markers throughout.

---

## Headline

The ceiling on AI-compute and robotics is a **supply / economic** question, not
a demand-saturation one — but the credible forecast range is enormous (AI
datacenter energy forecasts for 2030 diverge **~40×**). The demand-side
*pull* (aging → automation → capital deepening) is the best-supported part of
the picture; the "feed themselves" cost-vs-value ceiling is intuitive but
**unconfirmed** (its one testable claim was refuted).

---

## 1. AI / datacenter energy — well-anchored

- **2024 baseline: ~415 TWh (~1.5% of global electricity)** (IEA *Energy and
  AI*, 2025). US is the measured leading indicator: **176 TWh in 2023 (4.4% of
  US electricity)**, up from ~60 TWh flat in 2014–2016, CAGR accelerating
  7%→18% (LBNL 2024). *(high)*
- **2030: IEA Base Case ~945 TWh (~3%)**; **2035: IEA scenario range
  700–1,700 TWh**. *(high)*
- **But 2030 forecasts diverge ~40× (200 to ~8,000 TWh)** and GW-capacity
  forecasts >13× (RAND ~327 GW vs Goldman ~24 GW vs McKinsey ~90 GW). The
  divergence turns on **whether exponential chip-supply-led growth persists** —
  a supply/persistence question, *not* demand saturation. *(high)*
- The **AI subset is the growth driver**: ~30–50 TWh in 2023 (10–15% of DC
  energy) → 200–900 TWh by 2030 (35–50%); AI datacenter power grew ~10× in three
  years (0.4 GW 2020 → 4.3 GW 2023). *(high)*
- **Do NOT assert a single physical bottleneck.** "Grid power is the hard
  constraint" was **refuted 0-3**; "GPU supply is the sole bounding variable"
  was **refuted 1-2**. The real bound is a blend of chips + capital + energy +
  grid. Materials limits (TSMC leading-edge, rare earths) and the
  over-forecasting critique (Jevons offsets, poor DC-forecast track record)
  produced **no surviving confirmed evidence** — treat both as open.

## 2. Robotics — empirically hollow

- Only *current* density survived verification: **global average 162 robots per
  10,000 manufacturing workers (2023)**, doubled from 74 in 2016; **Korea leads
  at 1,012** (only nation >1,000), Singapore 770 (IFR World Robotics 2024).
  *(high)*
- **The unit trap (critical for the model):** 162/10,000 *manufacturing* ≈ 16
  per 1,000 *manufacturing* workers, and manufacturing is ~10–15% of employment,
  so a whole-economy robots-per-1,000-*total*-workers figure is **~an order of
  magnitude lower** — even Korea's frontier is only ~15 robots per 1,000 *total*
  workers today.
- **No humanoid / general-purpose fleet projection survived verification** —
  Goldman, Morgan Stanley ($5T market by 2050), ARK, Tesla Optimus, Figure all
  failed or were absent as too hype-prone to confirm. The robot ceiling
  therefore **cannot be anchored to any 2035/2050 fleet forecast** from this
  evidence set; it is a scenario assumption.

## 3. The "feed themselves" / value-vs-cost ceiling — UNCONFIRMED

The intuition that deployment stops where marginal value ≤ marginal cost (an
EROI-like constraint on capital) is defensible as *structure* but has **no
verified empirical support here**. The one testable claim — that only ~23% of
AI-exposed tasks are profitably automatable (cost > benefit for the other 77%,
"Beyond AI Exposure") — was **refuted 1-2**. Implement value-vs-cost as a
*mechanism*, not a calibrated break-even.

## 4. The macro / surplus-dissipation angle — STRONGLY SUPPORTED

This is the best-supported part, and it is the defensible (economic) form of the
Maximum-Power-Principle intuition:

- **Aging *pulls* automation.** Acemoglu & Restrepo (2017, "Secular Stagnation?
  The Effect of Aging on Economic Growth in the Age of Automation"): faster-aging
  countries adopt *more* robots; the aging→growth relationship is **positive and
  significant (0.773)**; automation can fully neutralize or reverse the output
  loss from a shrinking workforce. *(high)*
- **The savings glut funds the capital deepening.**
  Eggertsson-Lancastre-Summers: aging raises savings, lowers the real rate, and
  deepens the capital stock (incl. AI capital) — **at positive rates**.
  Kopecky-Taylor ("The Savings Glut of the Old"): aging → rising wealth-income
  ratio, falling risk-free rate. A recent life-cycle GE model **formally frames
  the AI shock as a capital-*demand* disturbance and aging/longevity as a
  saving-*supply* disturbance** — i.e., the exact "surplus savings channel into
  AI capital" mechanism. *(high; one source non-peer-reviewed)*
- **Regime caveat:** the stimulative channel **reverses at the zero lower
  bound** — severe aging pushes the market-clearing rate below zero and capital
  deepening turns contractionary (post-2008 secular stagnation). So "aging funds
  AI" holds at positive rates only. *(high)*

---

## 5. Implications for the model

- **`dataCenterSaturation` (6,000 TWh)** — anchor the near term to IEA
  (415 today → 945 in 2030 → 700–1,700 in 2035-high). 6,000 is ~4× the 2035 high
  case: a *plausible-high 2050+* backstop, not a forecast — flag the **40×
  uncertainty**. Low stakes: this output is **GDP-neutral** in the model (a pure
  electricity sink; lifting it raises generation/WACC, not GDP).
- **`robotSaturation` (600 per 1,000 workers)** — the exposed one. It is
  **~600× today's global average (~1/1,000 all workers) and ~35× Korea's current
  whole-economy frontier (~15/1,000 all workers)** — a humanoids-saturate-all-
  sectors world, not manufacturing. No fleet forecast supports it. It is also a
  **top-2 GDP-level dial (1.5–2× GDP 2100)**, so late-century GDP is explicitly
  conditional on it. Keep as an explicit scenario assumption; band it widely
  (~100–1,000); disclose in `docs/SENSITIVITY.md`.
- **The structural fix — NOW IMPLEMENTED (2026-07):** both hard saturation caps
  were replaced with endogenous economic rules, exactly as this review
  recommended. Robots: deploy-while-profitable (MV = payoff × labour share ×
  GDP/worker vs MC = annualized capex at the lagged interest rate + energy,
  scaled by integration costs rising with density — `robotIntegrationExponent`);
  unprofitable fleets decay. Datacenters: LCOE/GDP demand braked by a
  willingness-to-pay ceiling on the electricity-bill share of GDP
  (`dataCenterPowerSpendCeiling`; equilibrium load = ceiling × GDP / LCOE).
  Implementation also surfaced and fixed a phantom-load artifact: CDR
  electricity was subtracted from productive energy without being demand the
  energy system served or priced. See `src/modules/demand.ts` (deployment
  rules), `docs/SENSITIVITY.md` (θ sweep), and the three commits
  "cdr: CDR electricity is real demand…", "demand: replace robot logistic
  ceiling…", "demand: replace datacenter TWh ceiling…".

---

## Sources

- IEA (2025), *Energy and AI* —
  https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai
- LBNL (2024), *United States Data Center Energy Usage Report* —
  https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report_1.pdf
- RAND (2025), AI datacenter power extrapolation —
  https://www.rand.org/content/dam/rand/pubs/research_reports/RRA3500/RRA3572-1/RAND_RRA3572-1.pdf
- IEA-4E (2025), *Data Centre Energy Use: Critical Review of Models and
  Results* —
  https://www.iea-4e.org/wp-content/uploads/2025/05/Data-Centre-Energy-Use-Critical-Review-of-Models-and-Results.pdf
- IFR (2024), *World Robotics 2024* / robot-density release —
  https://ifr.org/ifr-press-releases/news/global-robot-density-in-factories-doubled-in-seven-years
- Acemoglu & Restrepo (2017), *Secular Stagnation? The Effect of Aging on
  Economic Growth in the Age of Automation*, NBER/AER P&P —
  https://economics.mit.edu/sites/default/files/publications/Secular%20Stagnation%20-%20%20The%20Effect%20of%20Aging%20on%20Econo.pdf
- Eggertsson, Lancastre & Summers, *Aging, Output per Capita and Secular
  Stagnation* —
  https://www.ineteconomics.org/uploads/papers/Eggertsson-Lancastre-Summers-Aging-Output-per-Capita-and-Secular-Stagnation.pdf
- Kopecky & Taylor (2022), *The Savings Glut of the Old*, NBER w29944 —
  https://www.nber.org/system/files/working_papers/w29944.pdf
- Morgan Stanley (2025), humanoid market (secondary, unverified) —
  https://www.morganstanley.com/insights/articles/humanoid-robot-market-5-trillion-by-2050

**Refuted (did not survive verification):** grid-power-as-hard-bottleneck (0-3);
GPU-supply-as-sole-bound (1-2); the ~23%-profitably-automatable cost-vs-value
ceiling (1-2).
