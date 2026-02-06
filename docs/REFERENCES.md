# Physical Grounding: Academic References

Literature supporting each iteration of the physical grounding improvements.
Papers with PDFs in this directory are marked with `[PDF]`.

---

## Iteration 1: Two-Box Climate Model

Replaces single exponential temperature lag with Geoffroy et al. (2013) two-layer energy balance model. Surface + mixed ocean layer coupled to deep ocean, capturing both fast (~4yr) and slow (~200yr) response timescales.

### Primary References

1. **Geoffroy et al. (2013a)**
   Geoffroy, O., Saint-Martin, D., Olivie, D.J.L., Voldoire, A., Bellon, G., & Tyteca, S. (2013). "Transient Climate Response in a Two-Layer Energy-Balance Model. Part I: Analytical Solution and Parameter Calibration Using CMIP5 AOGCM Experiments." *Journal of Climate*, 26(6), 1841-1857. DOI: 10.1175/JCLI-D-12-00195.1

   The canonical reference. Derives the analytical solution for the two-layer system, calibrates parameters against 16 CMIP5 AOGCMs using abrupt4xCO2 experiments.

2. **Geoffroy et al. (2013b)** `[PDF: geoffroy-2013-part2.pdf]`
   Geoffroy, O., Saint-Martin, D., Bellon, G., Voldoire, A., Olivie, D.J.L., & Tyteca, S. (2013). "Transient Climate Response in a Two-Layer Energy-Balance Model. Part II: Representation of the Efficacy of Deep-Ocean Heat Uptake and Validation for CMIP5 AOGCMs." *Journal of Climate*, 26(6), 1859-1876. DOI: 10.1175/JCLI-D-12-00196.1

   Extends Part I with efficacy factor for deep-ocean heat uptake. Validates against 1%/yr CO2 ramp experiments.

3. **Held et al. (2010)**
   Held, I.M., Winton, M., Takahashi, K., Delworth, T., Zeng, F., & Vallis, G.K. (2010). "Probing the Fast and Slow Components of Global Warming by Returning Abruptly to Preindustrial Forcing." *Journal of Climate*, 23(9), 2418-2427. DOI: 10.1175/2009JCLI3466.1

   Physical motivation for two-timescale decomposition. Shows temperature response decomposes into fast (~4yr) and slow (centuries) components via GCM switch-off experiments.

### Supporting References

4. **Nicholls et al. (2021)** `[PDF: nicholls-2021-openscm.pdf]`
   Nicholls, Z., Meinshausen, M., Lewis, J., et al. (2021). "OpenSCM Two Layer Model: A Python implementation of the two-layer climate model." *Journal of Open Source Software*, 6(62), 2766. DOI: 10.21105/joss.02766

   Reference implementation in Python. Useful for validating our TypeScript implementation. Code: https://github.com/openscm/openscm-twolayermodel

5. **Gregory et al. (2004)** `[PDF: gregory-2004.pdf]`
   Gregory, J.M., Stouffer, R.J., Raper, S.C.B., Stott, P.A., & Rayner, N.A. (2004). "A new method for diagnosing radiative forcing and climate sensitivity." *Geophysical Research Letters*, 31, L03205. DOI: 10.1029/2003GL018747

   Introduces the "Gregory plot" method (N vs T regression) used to calibrate two-layer model parameters from GCM output.

---

## Iteration 2: Endogenize TFP

Replaces exogenous TFP residual with physically grounded efficiency factors: end-use thermodynamic efficiency (Wright's Law on demand side) and organizational efficiency (education-driven).

### Primary References

1. **Ayres & Warr (2005)**
   Ayres, R.U. & Warr, B. (2005). "Accounting for growth: the role of physical work." *Structural Change and Economic Dynamics*, 16(2), 181-209. DOI: 10.1016/j.strueco.2004.10.002

   The seminal paper. Replaces raw energy with "useful work" (thermodynamic output after conversion losses) as a factor of production. Three-factor production function (K, L, useful work) largely eliminates the Solow residual for US 1900-1975.

2. **Ayres et al. (2013)** `[PDF: ayres-2013-underestimated.pdf]`
   Ayres, R.U., van den Bergh, J.C.J.M., Lindenberger, D., & Warr, B. (2013). "The underestimated contribution of energy to economic growth." *Structural Change and Economic Dynamics*, 27, 79-88. DOI: 10.1016/j.strueco.2013.07.004

   Review arguing energy's output elasticity far exceeds its ~5% cost share when physical substitution constraints are properly modeled.

3. **Kummel, Ayres & Lindenberger (2010)**
   Kummel, R., Ayres, R.U., & Lindenberger, D. (2010). "Thermodynamic laws, economic methods and the productive power of energy." *Journal of Non-Equilibrium Thermodynamics*, 35(2), 145-179. DOI: 10.1515/jnetdy.2010.009

   Shows that when technological constraints on K/L/E combinations are properly accounted for, the standard result that output elasticities equal cost shares breaks down. Theoretical justification for energy elasticity of 0.40-0.60.

4. **Santos et al. (2018)**
   Santos, J., Domingos, T., Sousa, T., & St. Aubyn, M. (2018). "Useful Exergy Is Key in Obtaining Plausible Aggregate Production Functions and Recognizing the Role of Energy in Economic Growth: Portugal 1960-2009." *Ecological Economics*, 148, 103-120. DOI: 10.1016/j.ecolecon.2018.03.008

   Rigorous cointegration test. With quality-adjusted K, L, and useful exergy, virtually all long-term growth is explained by measurable inputs. Also shows aggregate energy efficiency Granger-causes TFP.

### Demand-Side Learning Curves

5. **Weiss et al. (2010)**
   Weiss, M., Junginger, M., Patel, M.K., & Blok, K. (2010). "A review of experience curve analyses for energy demand technologies." *Technological Forecasting and Social Change*, 77(3), 411-428. DOI: 10.1016/j.techfore.2009.10.009

   First comprehensive review of experience curves for demand-side technologies. Average learning rate of 18 +/- 9%. Direct evidence that Wright's Law applies to end-use efficiency.

### Supporting References

6. **Brockway et al. (2018)** `[PDF: brockway-2018-exergy-economics.pdf]`
   Brockway, P.E., Sorrell, S., Foxon, T.J., & Miller, J. (2018). "Exergy economics: New insights into energy consumption and economic growth." Chapter 8 in *Routledge Handbook of the Resource Nexus*.

   Overview of the "exergy economics" field. Good entry point.

7. **Brockway et al. (2014)**
   Brockway, P.E., Barrett, J.R., Foxon, T.J., & Steinberger, J.K. (2014). "Divergence of Trends in US and UK Aggregate Exergy Efficiencies 1960-2010." *Environmental Science & Technology*, 48(16), 9874-9881. DOI: 10.1021/es501217t

   US exergy efficiency stagnates at ~11% while UK rises. Warns that aggregate efficiency can plateau due to structural shifts -- important for calibrating efficiency ceiling.

---

## Iteration 3: Net Energy Accounting

Tracks the energy cost of building and maintaining the energy system itself. Enables "energy trap" predictions during rapid renewable buildout.

### Primary References

1. **Brockway et al. (2019)**
   Brockway, P.E., Owen, A., Brand-Correa, L.I., & Hardt, L. (2019). "Estimation of global final-stage energy-return-on-investment for fossil fuels with comparison to renewable energy sources." *Nature Energy*, 4(7), 612-621. DOI: 10.1038/s41560-019-0425-z

   Calculates global EROI at the final energy stage (not primary). Fossil fuel final-stage EROI is ~6:1 and declining. This is the right comparison point for renewables since both deliver final energy.

2. **Fizaine & Court (2016)**
   Fizaine, F. & Court, V. (2016). "Energy expenditure, economic growth, and the minimum EROI of society." *Energy Policy*, 95, 172-186. DOI: 10.1016/j.enpol.2016.04.039

   Estimates the minimum societal EROI needed for economic growth at ~11:1. Below this, energy expenditure consumes too much of GDP.

3. **Carbajales-Dale et al. (2013)**
   Carbajales-Dale, M., Barnhart, C.J., Brandt, A.R., & Benson, S.M. (2013). "Energy Balance of the Global Photovoltaic (PV) Industry -- Is the PV Industry a Net Electricity Producer?" *Environmental Science & Technology*, 47(7), 3482-3489. DOI: 10.1021/es3038824

   Dynamic net energy analysis of the global PV industry. Develops model tracking energetic costs of manufacturing/installing PV including balance-of-system. Found PV became a net energy producer around 2012.

### Supporting References

4. **Palmer & Floyd (2020)**
   Palmer, G. & Floyd, J. (2020). "Implications of Trends in Energy Return on Energy Invested (EROI) for Transitioning to Renewable Electricity." *Ecological Economics*, 176, 106726. DOI: 10.1016/j.ecolecon.2019.106543

   Argues renewable EROIs (>10:1) are sufficient, countering pessimistic claims. Storage impacts on system EROI depend on quantities and types adopted.

5. **King (2020)**
   King, C.W. (2020). *The Economic Superorganism: Beyond the Competing Narratives on Energy, Growth, and Policy*. Springer. DOI: 10.1007/978-3-030-50295-9

   Book-length treatment of the biophysical economics framework. Argues the economy must be understood as an energy-dissipating system.

---

## Iteration 4: Material Constraints on Energy Transition

Closes the mineral loop: copper/lithium/steel availability gates capacity growth via supply curves and mining capacity dynamics.

### Primary References

1. **IEA (2021)** `[PDF: iea-2021-critical-minerals.pdf]`
   International Energy Agency (2021). *The Role of Critical Minerals in Clean Energy Transitions*. World Energy Outlook Special Report. Paris: IEA.

   The most authoritative institutional analysis. Key numbers: onshore wind requires 9x more minerals than gas; EVs require 6x mineral inputs of conventional cars. Under NZE, mineral demand increases 6x by 2040.

2. **Watari et al. (2019)**
   Watari, T., McLellan, B.C., Giurco, D., Dominish, E., Yamasue, E., & Nansai, K. (2019). "Total material requirement for the global energy transition to 2050: A focus on transport and electricity." *Resources, Conservation and Recycling*, 148, 91-103. DOI: 10.1016/j.resconrec.2019.05.015

   Stock-flow dynamics model with Total Material Requirement (TMR). Applied to IEA scenarios across 15 electricity and 5 transport technologies. TMR flows increase 200-900% by 2050.

3. **Vidal, Goffe & Arndt (2013)**
   Vidal, O., Goffe, B., & Arndt, N. (2013). "Metals for a low-carbon society." *Nature Geoscience*, 6(11), 894-896. DOI: 10.1038/ngeo1993

   Frames the central tension: renewable infrastructure demands vast quantities of metals while ore grades decline and extraction energy-intensity rises.

4. **Wang et al. (2023)**
   Wang, S., Hausfather, Z., Davis, S., et al. (2023). "Future demand for electricity generation materials under different climate mitigation scenarios." *Joule*, 7(2), 309-332. DOI: 10.1016/j.joule.2023.01.001

   Evaluates 75 climate/energy models. More optimistic: cumulative demands don't exceed reserves for most minerals. But identifies rate-of-scaling bottlenecks for neodymium, dysprosium, tellurium.

### Supporting References

5. **Hertwich et al. (2015)**
   Hertwich, E.G., et al. (2015). "Integrated life-cycle assessment of electricity-supply scenarios confirms global environmental benefit of low-carbon technologies." *PNAS*, 112(20), 6277-6282. DOI: 10.1073/pnas.1312753111

   Low-carbon electricity requires 11-40x more copper per unit generation than fossil fuels, but total material needs are "manageable."

6. **Sovacool et al. (2020)**
   Sovacool, B.K., Ali, S.H., Bazilian, M., et al. (2020). "Sustainable minerals and metals for a low-carbon future." *Science*, 367(6473), 30-33. DOI: 10.1126/science.aaz6003

   Addresses geopolitical and social dimensions of mineral constraints. Supply chain concentration creates vulnerabilities.

7. **Prior et al. (2012)**
   Prior, T., Giurco, D., Mudd, G., Mason, L., & Behrisch, J. (2012). "Resource depletion, peak minerals and the implications for sustainable resource management." *Global Environmental Change*, 22(3), 577-587. DOI: 10.1016/j.gloenvcha.2011.08.009

   "Peak minerals" framework: social and environmental constraints limit production well before geological depletion.

---

## Iteration 5: Heat Stress on Labor

Adds wet-bulb temperature effects on outdoor labor productivity, with severe impacts in tropical regions at 3-4C warming.

### Primary References

1. **Sherwood & Huber (2010)**
   Sherwood, S.C. & Huber, M. (2010). "An adaptability limit to climate change due to heat stress." *Proceedings of the National Academy of Sciences*, 107(21), 9552-9555. DOI: 10.1073/pnas.0913352107

   Establishes the fundamental physical limit: wet-bulb temperature of 35C is lethal for sustained human activity regardless of adaptation. At ~7C global warming, this becomes widespread.

2. **Dunne et al. (2013)**
   Dunne, J.P., Stouffer, R.J., & John, J.G. (2013). "Reductions in labour capacity from heat stress under climate warming." *Nature Climate Change*, 3, 563-566. DOI: 10.1038/nclimate1827

   Quantifies labor capacity reduction as a function of wet-bulb globe temperature. Projects 2-12% peak-month labor capacity loss by 2050 under RCP scenarios. Provides the transfer function we implement.

3. **Burke, Hsiang & Miguel (2015)** `[PDF: burke-hsiang-miguel-2015.pdf]`
   Burke, M., Hsiang, S.M., & Miguel, E. (2015). "Global non-linear effect of temperature on economic production." *Nature*, 527(7577), 235-239. DOI: 10.1038/nature15725

   Economic productivity peaks at 13C annual average temperature and declines strongly at higher temperatures. Non-linear relationship is globally generalizable across 166 countries.

### Supporting References

4. **Coffel, Horton & de Sherbinin (2018)**
   Coffel, E.D., Horton, R., & de Sherbinin, A. (2018). "Temperature and humidity based projections of a rapid rise in global heat stress exposure during the 21st century." *Environmental Research Letters*, 13(1), 014001. DOI: 10.1088/1748-9326/aaa00e

   Projects wet-bulb temperatures approaching theoretical human tolerance limits by mid-to-late century in densely populated tropical regions. Open access (CC-BY 3.0).

5. **Hsiang (2010)**
   Hsiang, S.M. (2010). "Temperatures and cyclones strongly associated with economic production in the Caribbean and Central America." *PNAS*, 107(35), 15367-15372. DOI: 10.1073/pnas.1009510107

   Shows economic output response to temperature is structurally similar to labor productivity response. Links temperature to GDP through labor channel.

6. **Zhao et al. (2021)**
   Zhao, M., et al. (2021). "Assessment of the economic impact of heat-related labor productivity loss: a systematic review." *Climatic Change*, 167(1). DOI: 10.1007/s10584-021-03160-7

   Systematic review: global economic losses from heat-related labor productivity projected at 0.31-2.6% of GDP in 2100 depending on scenario.

---

## Iteration 6: Infrastructure Lock-In

Tracks installed fossil end-use equipment stocks with physical retirement rates, creating a floor on non-electric energy demand.

### Primary References

1. **Tong et al. (2019)**
   Tong, D., Zhang, Q., Zheng, Y., et al. (2019). "Committed emissions from existing energy infrastructure jeopardize 1.5C climate target." *Nature*, 572, 373-377. DOI: 10.1038/s41586-019-1364-3

   If operated as historically, existing infrastructure will cumulatively emit ~658 GtCO2. More than half from the electricity sector. Committed + proposed emissions exceed the 1.5C budget.

2. **Davis, Caldeira & Matthews (2010)**
   Davis, S.J., Caldeira, K., & Matthews, H.D. (2010). "Future CO2 emissions and climate change from existing energy infrastructure." *Science*, 329(5997), 1330-1333. DOI: 10.1126/science.1188566

   Foundational quantification of "committed emissions" -- the CO2 that will be emitted if existing infrastructure operates to end of life.

3. **Seto et al. (2016)** `[PDF: seto-2016-carbon-lock-in.pdf]`
   Seto, K.C., Davis, S.J., Mitchell, R.B., Stokes, E.C., Unruh, G., & Urge-Vorsatz, D. (2016). "Carbon Lock-In: Types, Causes, and Policy Implications." *Annual Review of Environment and Resources*, 41, 425-452. DOI: 10.1146/annurev-environ-110615-085934

   Comprehensive taxonomy of lock-in: infrastructural (physical capital), institutional (regulatory), and behavioral (habits). Physical lifetimes of 15-50 years create irreversible commitment.

### Supporting References

4. **Unruh (2000)**
   Unruh, G.C. (2000). "Understanding carbon lock-in." *Energy Policy*, 28(12), 817-830. DOI: 10.1016/S0301-4215(00)00070-7

   Coined "carbon lock-in." Technological systems create a self-reinforcing feedback through co-evolution of technology, institutions, and social norms.

5. **Grubler, Wilson & Nemet (2016)**
   Grubler, A., Wilson, C., & Nemet, G.F. (2016). "Apples, oranges, and consistent comparisons of the temporal dynamics of energy transitions." *Energy Research & Social Science*, 22, 18-25. DOI: 10.1016/j.erss.2016.08.015

   Argues observed contrasts in transition speeds are partly artifacts of inconsistent measurement. Important for calibrating realistic transition timelines.

---

## Iteration 7: Water Stress

Adds water sub-model to resources module: climate-driven precipitation changes affect agricultural yields and thermal power plant cooling capacity.

### Primary References

1. **Schewe et al. (2014)** `[PDF: schewe-2014.pdf]`
   Schewe, J., Heinke, J., Gerten, D., et al. (2014). "Multimodel assessment of water scarcity under climate change." *PNAS*, 111(9), 3245-3250. DOI: 10.1073/pnas.1222460110

   Canonical warming-to-water-stress transfer function using an ensemble of global hydrological models. 2C warming exposes ~15% additional population to severe water decline.

2. **van Vliet et al. (2016)**
   van Vliet, M.T.H., Wiberg, D., Leduc, S., & Riahi, K. (2016). "Power-generation system vulnerability and adaptation to changes in climate and water resources." *Nature Climate Change*, 6, 375-381. DOI: 10.1038/nclimate2903

   Key energy-water coupling paper. Reductions in usable capacity for 61-74% of hydropower plants after 2040. Thermal plant cooling constraints. Informs dispatch module feedback.

3. **Hejazi et al. (2014)**
   Hejazi, M.I., et al. (2014). "Long-term global water projections using six socioeconomic scenarios in an integrated assessment modeling framework." *Technological Forecasting and Social Change*, 81, 205-226. DOI: 10.1016/j.techfore.2013.05.006

   GCAM-based integrated water projections. Global water demand increases 67-134% by 2050. Template for simplified water sub-model structure.

### Supporting References

4. **Vorosmarty et al. (2000)**
   Vorosmarty, C.J., Green, P., Salisbury, J., & Lammers, R.B. (2000). "Global water resources: vulnerability from climate change and population growth." *Science*, 289(5477), 284-288. DOI: 10.1126/science.289.5477.284

   Foundational: population growth and demand dominate over climate in determining near-term water stress.

5. **D'Odorico et al. (2018)**
   D'Odorico, P., et al. (2018). "The global food-energy-water nexus." *Reviews of Geophysics*, 56(3), 456-531. DOI: 10.1029/2017RG000591

   75-page comprehensive review of food-energy-water interdependencies. Covers virtual water trade, groundwater depletion, and climate-nexus feedbacks.

6. **Porkka et al. (2016)**
   Porkka, M., Gerten, D., Schaphoff, S., Siebert, S., & Kummu, M. (2016). "Causes and trends of water scarcity in food production." *Environmental Research Letters*, 11(1), 015001. DOI: 10.1088/1748-9326/11/1/015001

   2.2 billion people (34%) in food production units affected by green-blue water scarcity by 2005. Provides empirical basis for water-yield multiplier.

7. **Pastor et al. (2014)** `[PDF: pastor-2014.pdf]`
   Pastor, A.V., Ludwig, F., Biemans, H., Hoff, H., & Kabat, P. (2014). "Accounting for environmental flow requirements in global water assessments." *Hydrology and Earth System Sciences*, 18(12), 5041-5059. DOI: 10.5194/hess-18-5041-2014

   Environmental flow requirements = 25-46% of mean annual flow. Must discount supply by ~35% before computing available water.
