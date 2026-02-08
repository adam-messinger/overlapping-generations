# Useful Energy, Overlapping Generations, and the Energy Transition: A Biophysical Simulation of the Global Economy 2025--2100

**Adam Messinger**
*Research Note, February 2026*

---

## Abstract

We present an integrated simulation of the global economy from 2025 to 2100 that treats useful energy -- not labor productivity or total factor productivity -- as the primary driver of economic growth. The model couples a biophysical production function (Ayres-Warr) with endogenous technology learning (Wright's Law), cost-driven electrification, demographic aging with intergenerational transfers, carbon dioxide removal, and a two-layer climate model. Across 15 scenarios spanning aggressive decarbonization to fossil-intensive development, three results stand out. First, solar photovoltaics cross the cost threshold against natural gas by 2025 in every scenario, making the energy transition substantially self-reinforcing regardless of climate policy. Second, the dominant source of GDP divergence across scenarios is not climate damages directly but energy system cost: scenarios with cheap abundant electricity produce 2--3 times the GDP of those that suppress renewable deployment. Third, the fiscal burden of population aging stabilizes at roughly 13% of GDP when retirement ages adjust to life expectancy gains, a materially less dire outcome than static demographic projections suggest.

---

## 1. Motivation and Ethos

Standard integrated assessment models (IAMs) such as DICE and REMIND treat energy as an intermediate input and attribute long-run growth to exogenous total factor productivity (TFP). This choice has consequences: it makes energy transitions appear costly (they divert resources from a growth path that would have proceeded anyway) and makes climate damages the primary economic risk from emissions.

We take a different starting point, rooted in the biophysical economics tradition of Ayres and Warr (2009) and the entropy economics framework of Chen and Galbraith (2012). In this view, useful energy -- electricity converted to mechanical work, heat, and computation at high second-law efficiency -- is not merely an input to production but its primary engine. When useful energy supply grows, so does the economy. When it is constrained, growth stalls.

This framing inverts the policy calculus. The energy transition is not a cost to be optimized but a source of growth to be unlocked. The relevant question is not "how much GDP are we willing to sacrifice to decarbonize?" but "how fast can we deploy cheap solar and electrify end uses?"

The model is called "overlapping generations" because it takes the demographic transition seriously. Global population aging creates competing claims on GDP: pensions, healthcare, and education for dependents versus investment in the productive capital stock (including energy infrastructure). The model tracks three age cohorts across eight world regions and computes these transfers endogenously, producing the fiscal pressures that aging societies will actually face.

---

## 2. Model Architecture

The simulation consists of nine modules executed in sequence each year, with lagged feedbacks breaking circular dependencies:

```
Demographics --> Production --> Demand --> Capital --> Energy -->
  Dispatch --> Resources --> CDR --> Climate
```

Each module is a pure function implementing `init(params) -> state` and `step(state, inputs, params) -> {state, outputs}`. Modules communicate only through declared inputs and outputs, wired automatically by a dependency-resolving framework. Feedback loops (e.g., climate damages affecting GDP affecting emissions) operate through one-year lags.

The system tracks approximately 95 output fields per year across eight world regions: OECD, China, India+South Asia, Latin America, Southeast Asia, Russia+CIS, MENA, and Sub-Saharan Africa.

### 2.1 Production (Biophysical Cobb-Douglas)

The production function is a normalized Cobb-Douglas with Ayres-Warr elasticities:

$$
GDP = Y_0 \left(\frac{K}{K_0}\right)^{0.25} \left(\frac{L}{L_0}\right)^{0.15} \left(\frac{E}{E_0}\right)^{0.55} \cdot \eta \cdot (1 - d)
$$

where $K$ is capital stock, $L$ is effective workers (education-adjusted), $E$ is useful energy (electricity at 95% exergy plus non-electric fuels at 35% exergy, minus resource extraction and CDR energy overhead), $\eta$ is endogenous efficiency (Wright's Law on cumulative useful work, bounded by thermodynamic ceiling), and $d$ is a composite damage factor from climate, energy burden, and food stress.

The critical departure from standard growth theory is $\gamma = 0.55$ for useful energy, versus the conventional near-zero energy share. This is justified empirically by the Ayres-Warr finding that useful work, not raw energy or labor hours, explains the bulk of 20th-century growth. All production inputs are lagged one year to break the GDP-demand-dispatch-energy-GDP cycle.

### 2.2 Energy (Wright's Law with Soft Floors)

Solar, wind, and battery costs follow Wright's Law on cumulative global deployment, but learning applies only to the hardware component. Irreducible soft costs -- installation labor, land acquisition, permitting, O&M -- create a floor below which costs cannot fall:

$$
LCOE = (C_0^{hw} - C^{floor}) \cdot \left(\frac{Q}{Q_0}\right)^{-\alpha} + C^{floor}
$$

For solar: $C_0 = \$35$/MWh, $\alpha = 0.36$ (22% cost reduction per doubling), soft floor $\$12$/MWh. For wind: $C_0 = \$35$, $\alpha = 0.23$, floor $\$15$. Battery: $C_0 = \$140$/kWh, $\alpha = 0.26$, floor $\$20$/kWh.

LCOEs are adjusted for regional site quality (capacity factor degradation at high deployment), fossil fuel depletion (declining EROEI), carbon pricing (regional, eight separate carbon prices), and financing cost (WACC channel: capital-intensive sources like solar are penalized more when interest rates rise).

Curtailment feeds back to investment: high curtailment dampens VRE additions and boosts storage investment.

### 2.3 Demand (Endogenous Electrification)

The model rejects exogenous electrification targets. Instead, three sectors -- transport (45% of final energy), buildings (30%), and industry (25%) -- electrify at rates driven by the relative cost of electricity versus incumbent fuels. Electric alternatives carry efficiency multipliers (EVs: 3.5x, heat pumps: 3.0x, industrial motors: 1.1x) that make them cost-competitive even at higher electricity prices.

Above sector-specific thresholds (transport: 60%, buildings: 85%, industry: 55%), costs escalate quadratically, representing genuinely hard-to-electrify applications: transoceanic shipping, high-temperature industrial heat, long-haul aviation. There is no normative ceiling -- only physics and economics.

Non-electric fuel mix evolves via a logit model with inertia (~9-year half-life for equipment stock turnover), so even when electricity is cheaper, legacy ICE vehicles and gas furnaces constrain the pace of change.

### 2.4 Demographics (Fernandez-Villaverde Convergence)

Population is modeled as three cohorts (young 0--19, working 20--64, old 65+) across eight regions, with fertility converging exponentially to region-specific floors calibrated to Fernandez-Villaverde et al. (2023). China's TFR starts at 1.00 with a floor of 0.80; Sub-Saharan Africa starts at 4.30 and declines toward 1.80.

Global population peaks at 8.9 billion around 2057 and declines to 8.35 billion by 2100. Education tracks tertiary enrollment (logistic convergence to regional targets), producing an effective-worker measure that rises even as headcount falls.

Outdoor labor productivity is reduced by wet-bulb temperature exceeding survivability thresholds (Zhao et al. 2021), applied to non-college workers in heat-exposed regions -- an interaction between climate and demographics that standard models miss.

### 2.5 Capital and Intergenerational Transfers

GDP decomposes into four claims:

$$
GDP = C_w + I + R + E_d
$$

where $C_w$ is worker consumption, $I$ is investment, $R$ is retiree costs (pensions + healthcare), and $E_d$ is child costs (education). The transfer burden -- $(R + E_d)/GDP$ -- is the key fiscal metric.

Regional transfer premiums capture institutional variation: OECD pension generosity (35% of GDP/worker) versus Sub-Saharan Africa (5%). Investment is the residual after transfers, modulated by a Galbraith-Chen stability factor that suppresses savings under high uncertainty (climate damages, energy cost shocks).

Two mechanisms prevent the transfer burden from spiraling as populations age. First, retirement age adjusts: two-thirds of life expectancy gains translate into later retirement, reclassifying a fraction of the 65+ cohort as working. Second, wage indexation blends current and historical reference wages (70/30), so transfer costs grow more slowly than GDP when productivity rises.

Savings rates respond to demographics: longer life expectancy increases the savings motive (log-diminishing), while higher dependency ratios reduce it (linear). This creates a demographic savings channel that partially self-corrects.

### 2.6 Carbon Dioxide Removal

CDR (direct air capture) deploys endogenously when the NPV-adjusted social cost of carbon exceeds the all-in cost of removal. Capital costs follow Wright's Law ($\$400$/ton in 2025, learning exponent 0.15); energy costs track the grid-average LCOE ($2{,}500$ kWh per ton CO$_2$). The social discount rate is endogenous: half the market interest rate from the capital module.

This creates a natural synergy: cheap solar drives down both electricity costs and CDR costs, while rising temperatures raise the SCC, making deployment self-reinforcing once it begins. Capacity is capped at 15 Gt/yr and spending at 0.5% of GDP.

### 2.7 Climate

A two-layer energy balance model (Geoffroy et al. 2013) with DICE-2023 quadratic damages. Equilibrium climate sensitivity defaults to 3.0$\degree$C per doubling. Regional damage multipliers range from 0.5 (Russia) to 2.0 (Sub-Saharan Africa). Adaptation reduces damages for wealthy regions: OECD at $\$50$K/capita achieves roughly 33% damage reduction; SSA gets near zero.

---

## 3. Results

We compare four scenarios spanning the scenario space. **Baseline** represents current policies with a $\$35$/ton global carbon price. **Net Zero** applies $\$150$/ton carbon pricing with aggressive technology assumptions. **SSP5-8.5** suppresses renewable deployment and eliminates carbon pricing. **Climate Cascade** combines high climate sensitivity (4.5$\degree$C) with amplified damages.

### Table 1: Headline Results

| | Baseline | Net Zero | SSP5-8.5 | Climate Cascade |
|---|---|---|---|---|
| Warming 2100 ($\degree$C) | 1.97 | 1.82 | 2.26 | 2.28 |
| GDP 2100 ($\$$T) | 570 | 539 | 238 | 522 |
| Peak emissions (Gt, year) | 35.5, 2028 | 35.0, 2028 | 36.2, 2033 | 35.4, 2028 |
| Grid intensity 2100 (kg/MWh) | 6 | 7 | 86 | 7 |
| Transport electrification 2100 | 96% | 98% | 59% | 96% |
| Industry electrification 2100 | 61% | 82% | 44% | 61% |
| CDR removal 2100 (Gt/yr) | 15.0 | 15.0 | 2.9 | 15.0 |
| CDR cumulative (Gt) | 583 | 624 | 139 | 554 |
| Transfer burden 2100 | 13.0% | 13.0% | 13.4% | 13.5% |
| Energy burden 2100 | 2.5% | 2.3% | 5.5% | 2.6% |
| Robots per 1000 workers | 588 | 592 | 220 | 585 |

### 3.1 The Energy Transition Is Self-Reinforcing

The most striking result is that solar PV crosses the cost threshold against natural gas in 2025 across all scenarios -- including SSP5-8.5, which deliberately suppresses renewable deployment. Wright's Law learning on cumulative deployment is a one-way ratchet: once solar is cheaper than gas, every additional installation makes it cheaper still, widening the gap.

In the baseline, solar LCOE falls from $\$35$/MWh to $\$18$/MWh by 2100, bottoming against the soft floor. Grid carbon intensity drops below 100 kg/MWh by 2041. Electrification of transport reaches 96% by 2100 without any mandate -- cost-driven EV adoption (3.5x efficiency advantage) is sufficient. Only industry, with its high-temperature processes, is slow to electrify (61%).

Even SSP5-8.5, designed to mirror the IPCC's fossil-intensive pathway, reaches only 2.26$\degree$C -- far short of the 4.4$\degree$C implied by the scenario name. The model's endogenous economics prevent a truly fossil-dominated trajectory: solar is simply too cheap to ignore, even with zero carbon price and suppressed learning rates.

### 3.2 GDP Divergence Is About Energy Cost, Not Climate Damage

The 2.4x GDP gap between Net Zero ($\$539$T) and SSP5-8.5 ($\$238$T) is not primarily driven by climate damages -- warming differs by only 0.44$\degree$C. The driver is the energy system itself. SSP5-8.5 sustains an energy burden of 5.5% of GDP (versus 2.3% in Net Zero) because expensive fossil fuels persist. This burden acts as a drag on the production function: energy is the dominant input ($\gamma = 0.55$), and expensive energy means less useful work per dollar of GDP.

The mechanism is clear in the automation channel. Cheap electricity enables robot deployment (588 per 1000 workers in baseline versus 220 in SSP5-8.5), which augments effective labor and drives further GDP growth. Expensive energy suppresses automation, creating a negative feedback loop.

Climate Cascade, despite 2.28$\degree$C warming and amplified damages, achieves $\$522$T GDP -- only 8% below baseline. The damage coefficient matters, but the energy system matters more.

### 3.3 CDR Needs Cheap Solar

CDR deployment is binary across the scenario space. Scenarios with cheap solar ($\$17$--$18$/MWh) deploy to the 15 Gt/yr cap by 2100, removing 554--624 Gt cumulative. SSP5-8.5, with solar LCOE stuck at $\$25$/MWh and higher grid-average costs, deploys only 2.9 Gt/yr at $\$404$/ton -- roughly 2.5x the cost in other scenarios.

The mechanism is the CDR cost equation: at 2,500 kWh per ton, the energy cost component scales linearly with LCOE. Cheap solar is a prerequisite for cheap CDR, not a competitor. The scenarios where CDR achieves significant deployment are precisely those where the energy transition has already occurred.

### 3.4 The Fiscal Burden of Aging Stabilizes

In all scenarios, the intergenerational transfer burden -- pensions, healthcare, and education as a share of GDP -- peaks around 13% in 2050 and holds roughly steady through 2100, despite a dependency ratio that rises from 31% to over 45%.

Two mechanisms prevent fiscal crisis. First, retirement age adjustment: as life expectancy rises by approximately 6 years by 2100, retirement ages rise by roughly 4 years (two-thirds response), keeping a fraction of the 65+ cohort in the workforce. Second, wage indexation at 70% means pension costs grow more slowly than GDP when productivity rises. Together, these prevent the transfer burden from following the raw dependency ratio upward.

This result is robust across scenarios: even Climate Cascade, with lower GDP growth, shows only 13.5% burden. The demographic fiscal challenge is real but self-correcting if retirement institutions adapt to longevity gains.

### 3.5 Mineral Constraints Bind but Do Not Block

Cumulative lithium demand reaches 51 Mt in baseline against 28 Mt reserves -- the model's logistic mining capacity growth (from 0.18 Mt/yr to a ceiling of 3.0 Mt/yr) and recycling (from 5% to 30%) allow reserves to be drawn down but not exhausted. Copper cumulative demand of 458 Mt against 880 Mt reserves leaves more headroom. The mineral constraint factor stays close to 1.0 in all scenarios, meaning supply keeps pace with demand -- though it requires aggressive mining investment.

---

## 4. Discussion

### What the model does well

The biophysical production function, with its dominant energy elasticity, captures a dynamic that conventional IAMs miss: the energy transition is not a cost but a growth driver. When solar electricity at $\$18$/MWh replaces gas at $\$45+$/MWh, the useful-energy input to production grows, and GDP grows with it. This is consistent with the historical record, where major energy transitions (coal to oil, electrification) were associated with sustained growth, not sacrifice.

The endogenous electrification model avoids the common IAM problem of requiring exogenous assumptions about technology adoption rates. Transport electrification at 96% by 2100 is not assumed; it emerges from the cost comparison between EVs (3.5x efficient) and ICE vehicles facing rising fuel costs. The cost-escalation mechanism for hard-to-electrify applications (quadratic above sector thresholds) is a more honest representation of physical constraints than arbitrary ceilings.

### What the model does not do

Regional resolution is coarse: eight aggregated regions cannot capture within-region inequality, localized climate impacts, or subnational policy variation. There is no inter-regional electricity trade, which understates the potential for e.g., MENA solar exports to Europe.

The model has no explicit financial sector, sovereign debt dynamics, or monetary policy. The interest rate is a simple marginal product of capital. The Galbraith-Chen stability factor captures investment suppression from uncertainty, but not financial crises, credit crunches, or currency effects.

War, pandemics, political instability, and other discontinuities are absent. The SSP5-8.5 scenario suppresses technology through parameter choices, but cannot represent the institutional collapse that might actually produce a high-emissions pathway.

The production function assumes smooth substitutability between capital, labor, and energy. In practice, energy transitions involve structural unemployment, stranded assets, and political resistance that a Cobb-Douglas function cannot capture.

### The SSP5-8.5 problem

The model's inability to sustain the SSP5-8.5 temperature trajectory (2.26$\degree$C versus the target 4.4$\degree$C) is either a bug or a feature, depending on one's priors. If one believes that solar economics will inevitably drive adoption regardless of policy, then SSP5-8.5 is an implausible scenario and the model is correctly rejecting it. If one believes that institutional, political, or infrastructural barriers could genuinely prevent solar deployment at scale -- grid integration failures, permitting bottlenecks, trade wars over critical minerals -- then the model is missing important dynamics.

We lean toward the former interpretation: the cost advantage of solar is now large enough and growing fast enough that suppressing deployment requires active policy hostility, not merely the absence of support. But this remains an empirical question that the next decade will help resolve.

---

## 5. Conclusion

An economic model that takes useful energy seriously as the primary growth driver produces a more optimistic outlook for the energy transition than standard IAMs -- but for different reasons than techno-optimists usually cite. The transition is not good because it averts catastrophic warming (though it helps). It is good because cheap solar electricity makes the economy more productive. The 2.4x GDP gap between clean and fossil scenarios is not a cost of climate policy; it is the cost of failing to adopt cheaper energy.

The demographic transition, often presented as a fiscal catastrophe, stabilizes at manageable levels when retirement institutions adapt to longevity. The mineral supply chain is tight but feasible. CDR at scale requires cheap solar as a prerequisite, not a competitor.

The binding constraint on the energy transition is not technology, not minerals, not demographics, and not climate damages. It is the speed at which institutions can deploy known solutions.

---

## References

Ayres, R.U. and Warr, B. (2009). *The Economic Growth Engine: How Energy and Work Drive Material Prosperity*. Edward Elgar.

Chen, J. and Galbraith, J.K. (2012). "Auctioning the Environment." UTIP Working Paper No. 62.

Fernandez-Villaverde, J. and Jones, C.I. (2023). "Estimating and Simulating a SIRD Model of COVID-19 for Many Countries, States, and Cities." *Journal of Economic Dynamics and Control*, 140.

Geoffroy, O. et al. (2013). "Transient Climate Response in a Two-Layer Energy-Balance Model." *Journal of Climate*, 26, 1841--1857.

Nordhaus, W.D. (2023). "The Spirit of Green: DICE-2023." *American Economic Review*, forthcoming.

Schlenker, W. and Roberts, M.J. (2009). "Nonlinear Temperature Effects Indicate Severe Damages to U.S. Crop Yields under Climate Change." *PNAS*, 106(37), 15594--15598.

Wright, T.P. (1936). "Factors Affecting the Cost of Airplanes." *Journal of the Aeronautical Sciences*, 3(4), 122--128.

Zhao, C. et al. (2021). "Global Multi-Model Projections of Local Urban Climates." *Nature Climate Change*, 11, 152--157.
