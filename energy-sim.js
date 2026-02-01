/**
 * Overlapping Generations Energy Simulation
 * 
 * Standalone Node.js module extracted from energy-sim.html
 * Run headless simulations without browser dependencies.
 * 
 * Usage:
 *   const energySim = require('./energy-sim.js');
 *   energySim.config.quiet = true;
 *   const data = energySim.runSimulation({ carbonPrice: 35 });
 *   const metrics = energySim.runScenario({ carbonPrice: 100 });
 */

'use strict';

    // =============================================================================
    // PRIMITIVES - Core mathematical functions
    // =============================================================================

    /**
     * Compound growth: start × (1 + rate)^years
     */
    function compound(start, rate, years) {
        return start * Math.pow(1 + rate, years);
    }

    /**
     * Wright's Law learning curve: cost = cost₀ × cumulative^(-α)
     * As cumulative production doubles, cost falls by 2^(-α)
     * α=0.20 means 13% cost reduction per doubling (1 - 2^-0.2 ≈ 0.13)
     */
    function learningCurve(cost0, cumulative, alpha) {
        if (cumulative <= 0) return cost0;
        return cost0 * Math.pow(cumulative, -alpha);
    }

    /**
     * EROEI depletion: EROEI declines as resources are extracted
     * EROEI(t) = EROEI₀ × (remaining/initial)^β
     * Net energy = gross × (1 - 1/EROEI)
     */
    function depletion(reserves, extracted, eroei0, beta = 0.5) {
        const remaining = Math.max(reserves - extracted, 0.01);
        const fractionRemaining = remaining / reserves;
        const eroei = eroei0 * Math.pow(fractionRemaining, beta);
        return {
            eroei: Math.max(eroei, 1.1), // EROEI can't go below ~1
            netEnergyFraction: 1 - 1 / Math.max(eroei, 1.1),
            remaining
        };
    }

    /**
     * Logistic S-curve: models adoption/deployment
     * Returns value between 0 and ceiling
     */
    function logistic(start, ceiling, rate, years) {
        const k = rate;
        const midpoint = Math.log((ceiling - start) / start) / k;
        return ceiling / (1 + Math.exp(-k * (years - midpoint)));
    }

    /**
     * Poisson shock probability: P(at least one event) = 1 - e^(-λ)
     */
    function poissonShock(lambda, magnitude) {
        const prob = 1 - Math.exp(-lambda);
        return { probability: prob, magnitude };
    }

    // =============================================================================
    // ENERGY SOURCES - Parameters and cost models
    // =============================================================================

    /**
     * Energy source parameters (calibration constants)
     *
     * INPUTS (user-tuneable via sliders):
     * - solar.alpha: Learning rate (slider)
     * - solar.growthRate: Capacity growth (slider, passed to runSimulation)
     * - carbonPrice: Applied to gas/coal (slider, passed to runSimulation)
     *
     * INPUTS (calibration constants, not user-tuneable):
     * - cost0: 2025 baseline LCOE in $/MWh
     * - alpha: Wright's Law exponent (except solar, which is tuneable)
     * - capacity2025: Installed capacity in 2025
     * - growthRate: Annual capacity growth rate
     * - carbonIntensity: kg CO₂/MWh
     * - reserves, extractionRate, eroei0: Fossil fuel depletion
     *
     * OUTPUTS (computed by runSimulation):
     * - LCOE trajectories over time
     * - Crossover years between sources
     *
     * Learning rates calibrated to Farmer/Way (2022) and Naam (2020)
     * α: Wright's Law exponent. Learning rate = 1 - 2^(-α)
     * α=0.36 → 25% cost reduction per doubling
     * α=0.23 → 15% cost reduction per doubling
     */
    const energySources = {
        solar: {
            name: 'Solar PV',
            cost0: 35,           // $/MWh in 2025 (Naam: $30-40)
            alpha: 0.36,         // 25% learning rate (Naam: 30-40%, DOE: 24%)
            capacity2025: 1500,  // GW installed globally
            growthRate: 0.25,    // 25% annual growth (historical: 40%)
            carbonIntensity: 0,  // kg CO₂/MWh
            color: '#ffd60a'
        },
        wind: {
            name: 'Wind',
            cost0: 35,           // $/MWh in 2025
            alpha: 0.23,         // 15% learning rate (DOE/LBNL full-period)
            capacity2025: 1000,
            growthRate: 0.18,    // 18% annual growth (Farmer: 20-25%)
            carbonIntensity: 0,
            color: '#4cc9f0'
        },
        gas: {
            name: 'Natural Gas',
            cost0: 45,           // $/MWh in 2025 (slightly higher base)
            eroei0: 30,          // Starting EROEI
            reserves: 200,       // Arbitrary units
            extractionRate: 2,   // Units per year
            carbonIntensity: 400,// kg CO₂/MWh
            color: '#f77f00'
        },
        coal: {
            name: 'Coal',
            cost0: 40,           // $/MWh in 2025
            eroei0: 25,
            reserves: 500,
            extractionRate: 3,
            carbonIntensity: 900,
            color: '#6c757d'
        },
        nuclear: {
            name: 'Nuclear',
            cost0: 90,
            alpha: 0.0,          // No learning (regulatory/political stagnation)
            capacity2025: 400,
            growthRate: 0.02,
            carbonIntensity: 0,
            color: '#9d4edd'
        },
        hydro: {
            name: 'Hydroelectric',
            cost0: 40,           // $/MWh - cheap, mostly already built
            alpha: 0.0,          // No learning (mature technology)
            capacity2025: 1400,  // GW globally (IEA: ~1,400 GW)
            growthRate: 0.01,    // 1% growth (best sites already developed)
            carbonIntensity: 0,  // Zero operational emissions
            color: '#00b4d8'
        },
        battery: {
            name: 'Battery Storage',
            cost0: 140,          // $/kWh in 2025 (BloombergNEF: ~$130-150)
            alpha: 0.26,         // 18% learning rate (Naam: 20%, BNEF: 18%)
            capacity2025: 2000,  // GWh grid storage (BloombergNEF: ~2000 GWh cumulative by 2025)
            growthRate: 0.35,    // Rapid growth
            color: '#06d6a0'
        }
    };

    // =============================================================================
    // DISPATCH - Merit order dispatch parameters
    // =============================================================================

    /**
     * Dispatch parameters for source allocation
     *
     * INPUTS (calibration constants, not user-tuneable):
     * - capacityFactor: Fraction of nameplate capacity available (solar ~20%, nuclear ~90%)
     * - maxPenetration: Maximum share of generation (VRE limited without storage)
     *
     * Theoretical basis: Merit order dispatch - cheapest sources used first,
     * subject to capacity and penetration constraints.
     */
    const dispatchParams = {
        solar: { capacityFactor: 0.20, maxPenetration: 0.40 },
        wind: { capacityFactor: 0.30, maxPenetration: 0.35 },
        solarPlusBattery: { capacityFactor: 0.20, maxPenetration: 0.80 },
        hydro: { capacityFactor: 0.42, maxPenetration: 0.20 },  // ~16% of global electricity
        gas: { capacityFactor: 0.50, maxPenetration: 1.0 },
        coal: { capacityFactor: 0.60, maxPenetration: 1.0 },
        nuclear: { capacityFactor: 0.90, maxPenetration: 0.30 }
    };

    // =============================================================================
    // CLIMATE - Emissions and damage parameters
    // =============================================================================

    /**
     * Climate model parameters
     *
     * INPUTS (user-tuneable via slider):
     * - climSensitivity: Equilibrium climate sensitivity (2.0-4.5°C per CO₂ doubling)
     *
     * INPUTS (calibration constants):
     * - preindustrialCO2: 280 ppm baseline
     * - currentCO2: 420 ppm in 2025
     * - cumulativeCO2_2025: ~2400 Gt cumulative emissions since preindustrial
     * - airborneraction: 45% of emissions remain in atmosphere
     * - ppmPerGt: CO₂ ppm increase per Gt of emissions in atmosphere
     * - temperatureLag: Years for temperature to catch up to forcing
     * - damageCoeff: DICE-2023 quadratic damage coefficient
     * - regionalDamage: Multipliers by region (OECD lower, ROW higher)
     * - tippingThreshold: Temperature midpoint for S-curve tipping transition
     * - tippingSteepness: How sharp the S-curve is (higher = sharper transition)
     * - maxDamage: Cap on damage fraction (Weitzman bounded utility)
     *
     * Sources:
     * - DICE-2023 (Nordhaus/Barrage): damageCoeff, updated damage estimates
     * - Weitzman: Fat-tailed uncertainty, bounded damages
     * - IPCC AR6: Climate sensitivity range
     * - IEA: 2025 emissions calibration (~35 Gt total)
     */
    const climateParams = {
        preindustrialCO2: 280,          // ppm
        // CO2 in 2025 (~418 ppm) derived from: cumulativeCO2_2025 * airborneraction * ppmPerGt + preindustrialCO2
        // i.e., 2400 * 0.45 * 0.128 + 280 ≈ 418 ppm (close to observed 420 ppm)
        cumulativeCO2_2025: 2400,       // Gt cumulative since preindustrial
        airborneraction: 0.45,          // Fraction staying in atmosphere
        ppmPerGt: 0.128,                // ppm per Gt in atmosphere
        temperatureLag: 10,             // Years for temp to equilibrate
        climSensitivity: 3.0,           // °C per CO₂ doubling (slider: 2.0-4.5)
        currentTemp: 1.2,               // °C above preindustrial in 2025
        damageCoeff: 0.00236,           // DICE-2023 coefficient
        regionalDamage: {
            oecd: 0.8,                  // Richer countries more resilient
            china: 1.0,                 // Middle
            em: 1.3,                    // More vulnerable
            row: 1.8                    // Most vulnerable (Africa, etc.)
        },
        tippingThreshold: 2.5,          // °C midpoint for tipping transition
        tippingMultiplier: 1.25,        // Max damage multiplier from tipping
        tippingSteepness: 4.0,          // S-curve steepness (4.0 = transition over ~1°C)
        maxDamage: 0.30,                // Cap damages at 30% GDP
        nonElecEmissions2025: 25        // Gt CO₂ from non-electricity (transport, industry, etc.)
    };

    // =============================================================================
    // CAPITAL - Savings, investment, and automation
    // =============================================================================

    /**
     * Capital accumulation parameters
     *
     * INPUTS (calibration constants):
     * - alpha: Capital share in Cobb-Douglas production (standard ~0.33)
     * - depreciation: Annual capital depreciation rate
     * - savingsYoung/Working/Old: Lifecycle savings rates by cohort (OLG)
     * - savingsPremium: Regional adjustments to savings rate
     * - stabilityLambda: Sensitivity of investment to climate damages (Galbraith/Chen)
     * - automationShare2025: Initial fraction of capital that is "robots"
     * - automationGrowth: Annual growth rate of automation share
     * - robotsPerCapitalUnit: Scaling factor for robots per $T automation capital
     * - initialCapitalStock: Global capital stock in 2025 ($ trillions)
     *
     * OUTPUTS (computed by runCapitalModel):
     * - capital.stock: Total capital by year
     * - capital.investment: Annual investment
     * - capital.savingsRate: Demographic-weighted aggregate savings rate
     * - capital.stability: Galbraith/Chen stability factor (0-1)
     * - capital.interestRate: Marginal product of capital minus depreciation
     * - capital.robotsDensity: Robots per 1000 workers
     * - capital.kPerWorker: Capital per effective worker
     *
     * Sources:
     * - Penn World Table: K/Y ratio ~3.5
     * - McKinsey Global Institute: Global capital stock ~$350T
     * - World Bank: Global savings rate ~26%
     * - IMF: Real interest rate ~2%
     * - IFR World Robotics: Robot density data
     */
    const capitalParams = {
        // Production
        alpha: 0.33,              // Capital share (Cobb-Douglas)
        depreciation: 0.05,       // Annual depreciation rate

        // Savings by cohort (OLG lifecycle)
        // Note: These represent total savings including household, corporate, and government
        savingsYoung: 0.0,        // Ages 0-19: dependents
        savingsWorking: 0.45,     // Ages 20-64: prime savers (calibrated to ~22% global rate)
        savingsOld: -0.05,        // Ages 65+: dissaving

        // Regional savings premiums
        savingsPremium: {
            oecd: 0.0,            // Baseline
            china: 0.15,          // +15% higher savings
            em: -0.05,
            row: -0.08
        },

        // Galbraith/Chen stability
        stabilityLambda: 2.0,     // Sensitivity to damages (at 30% damages: 15% investment suppression)

        // Automation
        automationShare2025: 0.02,    // 2% of capital is "robots"
        automationGrowth: 0.03,       // Share grows 3%/year
        robotsPerCapitalUnit: 8.6,    // Robots per $1000 of automation capital per worker

        // Initial conditions (calibrated to 2025)
        initialCapitalStock: 420      // $420T global capital (Penn World Table, K/Y≈3.5)
    };

    // =============================================================================
    // JEVONS PARADOX / REBOUND EFFECT (Phase 7)
    // =============================================================================

    /**
     * Rebound effect parameters
     *
     * Implements two mechanisms that increase energy demand:
     * 1. Jevons/Price Rebound: Cheaper energy leads to more consumption
     * 2. Robot Energy Load: Automation consumes significant electricity
     *
     * THEORY:
     * - Odum Maximum Power Principle: Systems evolve to maximize energy throughput
     * - Galbraith/Chen Entropy Economics: Energy use correlates with complexity
     * - Historical Jevons: UK coal consumption grew despite efficiency gains
     *
     * CALIBRATION:
     * - Robot energy: 10 MWh/year ≈ 27 kWh/day (datacenter + physical robot average)
     * - Price threshold: $15/MWh is approximately "too cheap to meter" territory
     * - Elasticity: 2% per $1 is conservative; historical effects often higher
     */
    const reboundParams = {
        // Jevons/Price Rebound
        cheapEnergyThreshold: 15,      // $/MWh - below this, demand grows
        cheapEnergyElasticity: 0.02,   // 2% demand increase per $1 below threshold

        // Robot Energy Load
        // Calibration: Global datacenters ~250 TWh, industrial robots ~50 TWh in 2025
        // With 5B workers, 1 robot/1000 = ~50 TWh (conservative for 2025)
        // Growth accelerates as AI/automation scales exponentially
        energyPerRobotMWh: 10,         // MWh per robot-unit per year
        robotGrowthRate: 0.12,         // 12% annual growth (faster ramp-up)
        robotBaseline2025: 1,          // 1 robot per 1000 workers in 2025 (~50 TWh)
        robotCap: 500,                 // Max robots per 1000 workers

        // Rebound cap to prevent runaway
        maxReboundMultiplier: 2.0,     // Cap total rebound at 2x baseline

        // Infrastructure growth constraint
        // Historical global electricity growth ~2-3%/year
        // We can only build infrastructure so fast
        maxDemandGrowthRate: 0.025     // 2.5% max annual growth in total demand
    };

    // =============================================================================
    // CAPACITY STATE - State-machine architecture for energy capacity tracking
    // =============================================================================

    /**
     * Capacity state parameters
     *
     * ARCHITECTURE:
     * Instead of recalculating capacity from growth curves each year, track actual
     * installed capacity as state that propagates forward through timesteps:
     *   actualCapacity[t] = actualCapacity[t-1] + additions[t] - retirements[t]
     *
     * CONSTRAINTS ON ADDITIONS:
     * 1. Demand ceiling - Can't overbuild beyond useful capacity
     * 2. Growth rate cap - Manufacturing/supply chain limits
     * 3. Investment availability (Phase 2) - Need capital to build capacity
     *
     * FEEDBACK LOOP:
     * Constrained deployment → slower learning → higher LCOE
     * This creates proper feedback where early constraints affect long-term costs.
     *
     * Sources:
     * - IEA: Historical deployment rates
     * - IRENA: Renewable capacity additions
     */
    const capacityParams = {
        // Maximum annual growth rates (manufacturing/supply chain limits)
        maxGrowthRate: {
            solar: 0.30,      // 30% max annual growth (historical peak ~40%)
            wind: 0.20,       // 20% max
            battery: 0.40,    // 40% max (still ramping up manufacturing)
            nuclear: 0.05,    // 5% max (long lead times)
            hydro: 0.02,      // 2% max (site-limited)
            gas: 0.05,        // 5% max
            coal: 0.0         // No new coal (declining)
        },

        // Penetration limits for demand ceiling calculation
        // (Used to calculate max useful capacity)
        penetrationLimits: {
            solar: 0.80,      // 80% with battery backing
            wind: 0.35,       // 35% (intermittency)
            nuclear: 0.30,    // 30% (baseload)
            hydro: 0.20       // 20% (site-limited)
        },

        // Phase 2: CAPEX per GW (for converting investment $ to capacity)
        capex: {
            solar: 800,       // $M per GW (falling via learning)
            wind: 1200,       // $M per GW
            battery: 150,     // $M per GWh
            nuclear: 6000,    // $M per GW
            gas: 800,         // $M per GW
            coal: 2000        // $M per GW
        },

        // Phase 2: Asset lifetimes for retirement
        lifetime: {
            solar: 30,
            wind: 25,
            battery: 15,
            nuclear: 60,
            hydro: 80,
            gas: 40,
            coal: 45
        }
    };

    // =============================================================================
    // RESOURCES - Minerals, food, and land demand (Phase 6)
    // =============================================================================

    /**
     * Resource demand parameters
     *
     * INPUTS (calibration constants):
     * - minerals: intensity per unit capacity (kg per GW/GWh), learning rates, prices, reserves
     * - food: calories per capita, protein share dynamics, GLP-1 adoption
     * - land: farmland, urban area, yield growth
     *
     * OUTPUTS (computed by runResourceModel):
     * - minerals: demand, cumulative, intensity, reserveRatio per mineral
     * - food: totalCalories, proteinShare, grainEquivalent, glp1Effect
     * - land: farmland, urban, forest areas
     *
     * Sources:
     * - IEA Critical Minerals: Mineral intensity per technology
     * - ICSG: Global copper demand ~26 Mt/year (2024)
     * - Benchmark Minerals: Lithium demand ~0.8 Mt LCE/year
     * - FAO: Calories, protein shares, cropland, forest area
     * - World Bank: GDP per capita for Bennett's Law
     */
    const resourceParams = {
        // MINERALS - intensity per unit capacity (kg per unit)
        minerals: {
            copper: {
                perMW_solar: 2800,        // kg Cu per MW solar
                perMW_wind: 3500,         // kg Cu per MW wind
                perMWh_grid: 1200,        // kg Cu per MW transmission
                perGWh_battery: 800,      // kg Cu per GWh battery
                learningRate: 0.02,       // 2% annual intensity decline
                price2025: 9000,          // $/ton
                reserves: 880,            // Mt known reserves
                resources: 2100,          // Mt total resources
                recyclingBase: 0.15,      // 15% baseline recycling rate
                recyclingMax: 0.50,       // 50% max recycling rate
                recyclingHalfway: 500     // Mt stock-in-use at halfway to max recycling
            },
            lithium: {
                perGWh_battery: 600,      // kg Li (LCE) per GWh battery
                perEV: 8,                 // kg Li per EV (redundant if using battery)
                learningRate: 0.03,       // 3% decline (chemistry improvements)
                price2025: 25000,         // $/ton LCE
                reserves: 22,             // Mt LCE reserves
                resources: 89,            // Mt LCE resources
                recyclingBase: 0.05,      // 5% baseline (battery recycling nascent)
                recyclingMax: 0.30,       // 30% max recycling
                recyclingHalfway: 20      // Mt stock-in-use at halfway
            },
            rareEarths: {
                perMW_wind: 200,          // kg REE per MW wind (magnets)
                perEV: 1,                 // kg REE per EV motor
                learningRate: 0.01,       // slower improvement
                price2025: 50000,         // $/ton (basket)
                reserves: 130,            // Mt reserves
                resources: 400,           // Mt resources
                recyclingBase: 0.01,      // 1% (very low currently)
                recyclingMax: 0.20,       // 20% max
                recyclingHalfway: 10      // Mt stock-in-use at halfway
            },
            steel: {
                perMW_solar: 35000,       // kg steel per MW solar
                perMW_wind: 120000,       // kg steel per MW wind
                perMW_nuclear: 60000,     // kg steel per MW nuclear
                learningRate: 0.01,
                price2025: 800,           // $/ton
                reserves: null,           // Effectively unlimited via iron ore
                resources: null,
                recyclingBase: 0.35,      // 35% already recycled
                recyclingMax: 0.70,       // 70% max
                recyclingHalfway: 5000    // Mt stock-in-use
            }
        },

        // FOOD
        food: {
            caloriesPerCapita2025: 2800,  // kcal/day global average
            caloriesGrowthRate: 0.002,    // 0.2% annual growth (developing world catch-up)
            proteinShare2025: 0.11,       // 11% of calories from protein
            proteinShareMax: 0.16,        // 16% saturation (OECD level)
            proteinGDPHalfway: 15000,     // GDP/capita at halfway to max protein share
            glp1Adoption: {
                start: 2025,
                halfwayYear: 2040,
                maxPenetration: 0.15,     // 15% of population eventually
                calorieReduction: 0.20    // 20% calorie reduction per user
            },
            grainToProteinRatio: 6,       // kg grain per kg protein (feed conversion)
            caloriesPerKgGrain: 3400,     // kcal per kg grain
            proteinCaloriesPerKg: 4000    // kcal per kg protein (meat/dairy average)
        },

        // LAND
        land: {
            farmland2025: 4800,           // Mha (million hectares) cropland
            yieldGrowthRate: 0.01,        // 1% annual yield improvement
            yield2025: 4.0,               // tons grain per hectare global average
            nonFoodMultiplier: 4.9,       // Non-food crops (cotton, biofuels, etc.) expand grain-only to total cropland
            urbanPerCapita: 0.04,         // ha per person urban
            urban2025: 50,                // Mha urban area
            urbanWealthElasticity: 0.3,   // 10% richer → 3% more urban land
            forestArea2025: 4000,         // Mha forests
            forestLossRate: 0.002         // 0.2% annual loss baseline
        }
    };

    /**
     * Calculate recycling rate based on stock-in-use
     * Recycling increases as more material enters the circular economy
     * @param {Object} mineral - Mineral parameters
     * @param {number} stockInUse - Cumulative material in use (Mt)
     * @returns {number} Recycling rate (0-1)
     */
    function recyclingRate(mineral, stockInUse) {
        if (!mineral.recyclingMax) return 0;
        return mineral.recyclingBase +
               (mineral.recyclingMax - mineral.recyclingBase) *
               (1 - Math.exp(-stockInUse / mineral.recyclingHalfway));
    }

    /**
     * Calculate mineral demand for a given year
     * @param {Object} capacities - Current capacities from getCapacities
     * @param {Object} prevCapacities - Previous year capacities
     * @param {number} year - Simulation year
     * @param {string} mineralKey - Key in resourceParams.minerals
     * @param {number} cumulativeStock - Cumulative stock-in-use (for recycling)
     * @returns {Object} { demand, grossDemand, recycled, intensity }
     */
    function mineralDemand(capacities, prevCapacities, year, mineralKey, cumulativeStock = 0, maxCapacities = null) {
        const mineral = resourceParams.minerals[mineralKey];
        const t = year - 2025;
        const intensityFactor = Math.pow(1 - mineral.learningRate, t);

        // Apply capacity ceilings if provided (based on electricity demand)
        let solarCap = capacities.solar;
        let windCap = capacities.wind;
        let batteryCap = capacities.battery;
        let nuclearCap = capacities.nuclear;

        if (maxCapacities) {
            solarCap = Math.min(capacities.solar, maxCapacities.solar || capacities.solar);
            windCap = Math.min(capacities.wind, maxCapacities.wind || capacities.wind);
            batteryCap = Math.min(capacities.battery, maxCapacities.battery || capacities.battery);
            nuclearCap = Math.min(capacities.nuclear, maxCapacities.nuclear || capacities.nuclear);
        }

        // Capacity additions (delta from previous year) in GW
        const solarAdded = Math.max(0, solarCap - Math.min(prevCapacities.solar, solarCap));
        const windAdded = Math.max(0, windCap - Math.min(prevCapacities.wind, windCap));
        const nuclearAdded = Math.max(0, nuclearCap - Math.min(prevCapacities.nuclear, nuclearCap));
        // Battery in GWh (convert from GW × 4h)
        const batteryAdded = Math.max(0, (batteryCap - Math.min(prevCapacities.battery, batteryCap)) * 4);

        // Calculate gross demand (before recycling) in kg
        let grossDemandKg = 0;

        if (mineral.perMW_solar) {
            grossDemandKg += solarAdded * 1000 * mineral.perMW_solar * intensityFactor;
        }
        if (mineral.perMW_wind) {
            grossDemandKg += windAdded * 1000 * mineral.perMW_wind * intensityFactor;
        }
        if (mineral.perMW_nuclear) {
            grossDemandKg += nuclearAdded * 1000 * mineral.perMW_nuclear * intensityFactor;
        }
        if (mineral.perGWh_battery) {
            grossDemandKg += batteryAdded * mineral.perGWh_battery * intensityFactor;
        }

        // Convert to Mt (million tonnes)
        const grossDemand = grossDemandKg / 1e9;

        // Calculate recycling contribution
        const recycleRate = recyclingRate(mineral, cumulativeStock);
        const recycled = grossDemand * recycleRate;
        const netDemand = grossDemand - recycled;

        return {
            demand: Math.max(0, netDemand),  // Mt/year (net of recycling)
            grossDemand,                      // Mt/year (before recycling)
            recycled,                         // Mt/year recycled
            intensity: intensityFactor,       // Intensity factor (0-1)
            recyclingRate: recycleRate        // Current recycling rate
        };
    }

    /**
     * Calculate food demand following Bennett's Law + GLP-1 effects
     * @param {number} population - Global population
     * @param {number} gdpPerCapita - Global GDP per capita ($)
     * @param {number} year - Simulation year
     * @returns {Object} Food demand metrics
     */
    function foodDemand(population, gdpPerCapita, year) {
        const { food } = resourceParams;
        const t = year - 2025;

        // Base calories (developing world catch-up)
        const baseCalories = food.caloriesPerCapita2025 * Math.pow(1 + food.caloriesGrowthRate, t);

        // GLP-1 effect (logistic adoption curve)
        const yearsFromHalfway = year - food.glp1Adoption.halfwayYear;
        const glp1Adoption = food.glp1Adoption.maxPenetration /
                            (1 + Math.exp(-0.2 * yearsFromHalfway));
        const glp1Effect = glp1Adoption * food.glp1Adoption.calorieReduction;

        // Net calories per capita per day
        const netCalories = baseCalories * (1 - glp1Effect);

        // Protein share (Bennett's Law logistic curve)
        // Higher GDP → more protein consumption, saturating at proteinShareMax
        const proteinShare = food.proteinShare2025 +
            (food.proteinShareMax - food.proteinShare2025) *
            (gdpPerCapita / (gdpPerCapita + food.proteinGDPHalfway));

        // Total calories per year (Pcal = petacalories = 10^15 kcal)
        const totalCaloriesPcal = (population * netCalories * 365) / 1e15;

        // Protein calories per year
        const proteinCaloriesPcal = totalCaloriesPcal * proteinShare;

        // Convert to grain equivalent (Mt)
        // Direct grain: non-protein calories / caloriesPerKgGrain
        // Protein via livestock: protein calories / proteinCaloriesPerKg × grainToProteinRatio
        const directGrainMt = ((totalCaloriesPcal - proteinCaloriesPcal) * 1e15) /
                              food.caloriesPerKgGrain / 1e9;
        const proteinGrainMt = (proteinCaloriesPcal * 1e15) /
                               food.proteinCaloriesPerKg *
                               food.grainToProteinRatio / 1e9;
        const grainEquivalent = directGrainMt + proteinGrainMt;

        return {
            caloriesPerCapita: netCalories,           // kcal/person/day
            totalCalories: totalCaloriesPcal,         // Pcal/year
            proteinShare,                              // fraction (0-0.16)
            proteinCalories: proteinCaloriesPcal,     // Pcal/year
            grainEquivalent,                           // Mt/year
            glp1Adoption,                              // fraction of population
            glp1Effect                                 // fraction calorie reduction
        };
    }

    /**
     * Calculate land demand
     * @param {Object} foodData - Output from foodDemand()
     * @param {number} population - Global population
     * @param {number} gdpPerCapita - Global GDP per capita ($)
     * @param {number} gdpPerCapita2025 - Baseline GDP per capita for comparison
     * @param {number} year - Simulation year
     * @returns {Object} Land use in Mha
     */
    function landDemand(foodData, population, gdpPerCapita, gdpPerCapita2025, year) {
        const { land } = resourceParams;
        const t = year - 2025;

        // Yield improvement over time
        const currentYield = land.yield2025 * Math.pow(1 + land.yieldGrowthRate, t);

        // Farmland = grain demand / yield × non-food multiplier
        // grainEquivalent is in Mt (million tonnes), yield is in t/ha
        // Mt / (t/ha) = (10^6 t) / (t/ha) = 10^6 ha = Mha
        // Then multiply by nonFoodMultiplier to account for cotton, biofuels, etc.
        const grainFarmland = foodData.grainEquivalent / currentYield;
        const farmland = grainFarmland * land.nonFoodMultiplier;

        // Urban land = population × per-capita × wealth adjustment
        // urbanPerCapita is ha/person, population in persons, want Mha
        const wealthFactor = Math.pow(gdpPerCapita / gdpPerCapita2025, land.urbanWealthElasticity);
        const urban = (population * land.urbanPerCapita * wealthFactor) / 1e6; // ha → Mha

        // Forest area: baseline with gradual loss, slowing as pressure from farmland eases
        const farmlandPressure = Math.max(0, (farmland - land.farmland2025) / land.farmland2025);
        const adjustedLossRate = land.forestLossRate * (1 + farmlandPressure);
        const forest = land.forestArea2025 * Math.pow(1 - adjustedLossRate, t);

        return {
            farmland,                    // Mha
            urban,                       // Mha
            forest,                      // Mha
            yield: currentYield          // t/ha
        };
    }

    /**
     * Run full resource demand model
     * @param {Object} demographicsData - Output from runDemographics
     * @param {Object} demandData - Output from runDemandModel
     * @param {Object} dispatchData - Dispatch results { solar, wind, etc. arrays }
     * @param {Object} capacityState - Capacity state from runSimulation (actual installed capacity)
     * @returns {Object} Resource demand projections
     */
    function runResourceModel(demographicsData, demandData, dispatchData, capacityState) {
        const { years, global: demoGlobal } = demographicsData;

        // Initialize output structure
        const resources = {
            minerals: {
                copper: { demand: [], cumulative: [], grossDemand: [], recycled: [], intensity: [], reserveRatio: [] },
                lithium: { demand: [], cumulative: [], grossDemand: [], recycled: [], intensity: [], reserveRatio: [] },
                rareEarths: { demand: [], cumulative: [], grossDemand: [], recycled: [], intensity: [], reserveRatio: [] },
                steel: { demand: [], cumulative: [], grossDemand: [], recycled: [], intensity: [], reserveRatio: [] }
            },
            food: {
                caloriesPerCapita: [],    // kcal/person/day
                totalCalories: [],        // Pcal/year
                proteinShare: [],         // fraction
                grainEquivalent: [],      // Mt/year
                glp1Adoption: [],         // fraction
                glp1Effect: []            // fraction calorie reduction
            },
            land: {
                farmland: [],             // Mha
                urban: [],                // Mha
                forest: [],               // Mha
                yield: []                 // t/ha
            },
            metrics: {}
        };

        // Track cumulative mineral stocks
        const cumulativeStock = { copper: 0, lithium: 0, rareEarths: 0, steel: 0 };

        // Baseline GDP per capita for land model
        const gdpPerCapita2025 = (demandData.global.gdp[0] * 1e12) / demoGlobal.population[0];

        for (let i = 0; i < years.length; i++) {
            const year = years[i];
            const population = demoGlobal.population[i];
            const gdp = demandData.global.gdp[i];
            const gdpPerCapita = (gdp * 1e12) / population;

            // Get ACTUAL capacities from state (already constrained by demand ceiling + growth cap)
            const currentCapacities = {
                solar: capacityState.solar.installed[i],
                wind: capacityState.wind.installed[i],
                battery: capacityState.battery.installed[i],
                nuclear: capacityState.nuclear.installed[i]
            };

            // Get previous year capacities for delta calculation
            const prevCapacities = i > 0 ? {
                solar: capacityState.solar.installed[i - 1],
                wind: capacityState.wind.installed[i - 1],
                battery: capacityState.battery.installed[i - 1],
                nuclear: capacityState.nuclear.installed[i - 1]
            } : {
                // For year 0, use slightly lower values to ensure positive first-year additions
                solar: currentCapacities.solar * 0.8,
                wind: currentCapacities.wind * 0.85,
                battery: currentCapacities.battery * 0.7,
                nuclear: currentCapacities.nuclear * 0.98
            };

            // === MINERALS ===
            // Use actual capacities from state (already constrained)
            for (const mineralKey of ['copper', 'lithium', 'rareEarths', 'steel']) {
                const result = mineralDemand(currentCapacities, prevCapacities, year, mineralKey, cumulativeStock[mineralKey], null);

                resources.minerals[mineralKey].demand.push(result.demand);
                resources.minerals[mineralKey].grossDemand.push(result.grossDemand);
                resources.minerals[mineralKey].recycled.push(result.recycled);
                resources.minerals[mineralKey].intensity.push(result.intensity);

                // Update cumulative stock (stock-in-use grows by demand)
                cumulativeStock[mineralKey] += result.demand;
                resources.minerals[mineralKey].cumulative.push(cumulativeStock[mineralKey]);

                // Reserve ratio (cumulative / reserves)
                const mineral = resourceParams.minerals[mineralKey];
                const reserveRatio = mineral.reserves ?
                    cumulativeStock[mineralKey] / mineral.reserves : 0;
                resources.minerals[mineralKey].reserveRatio.push(reserveRatio);
            }

            // === FOOD ===
            const food = foodDemand(population, gdpPerCapita, year);
            resources.food.caloriesPerCapita.push(food.caloriesPerCapita);
            resources.food.totalCalories.push(food.totalCalories);
            resources.food.proteinShare.push(food.proteinShare);
            resources.food.grainEquivalent.push(food.grainEquivalent);
            resources.food.glp1Adoption.push(food.glp1Adoption);
            resources.food.glp1Effect.push(food.glp1Effect);

            // === LAND ===
            const land = landDemand(food, population, gdpPerCapita, gdpPerCapita2025, year);
            resources.land.farmland.push(land.farmland);
            resources.land.urban.push(land.urban);
            resources.land.forest.push(land.forest);
            resources.land.yield.push(land.yield);
        }

        // === METRICS ===
        const idx2050 = years.indexOf(2050);
        const idx2075 = years.indexOf(2075);
        const idx2100 = years.length - 1;

        // Find peak years for minerals (when annual demand peaks)
        const findPeakYear = (arr) => {
            let maxVal = 0, maxIdx = 0;
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] > maxVal) { maxVal = arr[i]; maxIdx = i; }
            }
            return { year: years[maxIdx], value: maxVal };
        };

        resources.metrics = {
            // Mineral peaks
            copperPeakYear: findPeakYear(resources.minerals.copper.demand).year,
            copperPeakDemand: findPeakYear(resources.minerals.copper.demand).value,
            lithiumPeakYear: findPeakYear(resources.minerals.lithium.demand).year,
            lithiumPeakDemand: findPeakYear(resources.minerals.lithium.demand).value,

            // Cumulative by 2050, 2100
            copperCumulative2050: resources.minerals.copper.cumulative[idx2050],
            copperCumulative2100: resources.minerals.copper.cumulative[idx2100],
            lithiumCumulative2050: resources.minerals.lithium.cumulative[idx2050],
            lithiumCumulative2100: resources.minerals.lithium.cumulative[idx2100],

            // Reserve warnings (>50% of reserves consumed)
            copperReserveRatio2050: resources.minerals.copper.reserveRatio[idx2050],
            copperReserveRatio2100: resources.minerals.copper.reserveRatio[idx2100],
            lithiumReserveRatio2050: resources.minerals.lithium.reserveRatio[idx2050],
            lithiumReserveRatio2100: resources.minerals.lithium.reserveRatio[idx2100],

            // Food metrics
            proteinShare2050: resources.food.proteinShare[idx2050],
            proteinShare2100: resources.food.proteinShare[idx2100],
            glp1Effect2050: resources.food.glp1Effect[idx2050],
            grainDemand2050: resources.food.grainEquivalent[idx2050],
            grainDemand2100: resources.food.grainEquivalent[idx2100],

            // Land metrics
            farmland2025: resources.land.farmland[0],
            farmland2050: resources.land.farmland[idx2050],
            farmland2100: resources.land.farmland[idx2100],
            farmlandChange: (resources.land.farmland[idx2100] - resources.land.farmland[0]) / resources.land.farmland[0],
            urban2050: resources.land.urban[idx2050],
            forest2100: resources.land.forest[idx2100],
            forestLoss: (resources.land.forest[0] - resources.land.forest[idx2100]) / resources.land.forest[0]
        };

        return resources;
    }

    /**
     * Calculate aggregate savings rate (demographic-weighted)
     * @param {Object} demoRegions - Demographics regions data from runDemographics
     * @param {number} yearIndex - Index into demographic arrays
     * @returns {Object} { regional: { oecd, china, em, row }, global }
     */
    function aggregateSavingsRate(demoRegions, yearIndex) {
        const { savingsYoung, savingsWorking, savingsOld, savingsPremium } = capitalParams;
        const regional = {};
        let totalPop = 0;
        let weightedRate = 0;

        for (const region of ['oecd', 'china', 'em', 'row']) {
            const data = demoRegions[region];
            const young = data.young[yearIndex];
            const working = data.working[yearIndex];
            const old = data.old[yearIndex];
            const pop = data.population[yearIndex];

            // Demographic-weighted base rate
            const baseRate = (young * savingsYoung +
                              working * savingsWorking +
                              old * savingsOld) / pop;

            // Add regional premium
            regional[region] = baseRate + savingsPremium[region];

            // Accumulate for global
            totalPop += pop;
            weightedRate += regional[region] * pop;
        }

        return {
            regional,
            global: weightedRate / totalPop
        };
    }

    /**
     * Galbraith/Chen stability factor
     * Investment depends on stability expectations - high damages create uncertainty
     * @param {number} damages - Damage as fraction (0.02 = 2% GDP)
     * @returns {number} Stability factor in (0, 1]
     */
    function stabilityFactor(damages) {
        // stability = 1 / (1 + λ × damages²)
        return 1 / (1 + capitalParams.stabilityLambda * damages * damages);
    }

    /**
     * Calculate investment
     * @param {number} gdp - GDP in $ trillions
     * @param {number} savingsRate - Aggregate savings rate
     * @param {number} stability - Stability factor (0-1)
     * @returns {number} Investment in $ trillions
     */
    function calculateInvestment(gdp, savingsRate, stability) {
        return gdp * savingsRate * stability;
    }

    /**
     * Update capital stock: K_{t+1} = (1-δ)K_t + I_t
     * @param {number} capital - Current capital stock
     * @param {number} investment - Investment this period
     * @returns {number} Next period capital stock
     */
    function updateCapital(capital, investment) {
        return (1 - capitalParams.depreciation) * capital + investment;
    }

    /**
     * Calculate interest rate (marginal product of capital)
     * r = α × Y/K - δ
     * @param {number} gdp - GDP in $ trillions
     * @param {number} capital - Capital stock in $ trillions
     * @returns {number} Real interest rate
     */
    function calculateInterestRate(gdp, capital) {
        if (capital <= 0) return 0.05; // Fallback
        return capitalParams.alpha * gdp / capital - capitalParams.depreciation;
    }

    /**
     * Calculate robots per 1000 workers
     * @param {number} capital - Capital stock in $ trillions
     * @param {number} workers - Effective workers (productivity-weighted)
     * @param {number} year - Simulation year
     * @returns {number} Robots per 1000 workers
     */
    function robotsDensity(capital, workers, year) {
        const t = year - 2025;
        // Automation share grows but is capped at 20%
        const autoShare = capitalParams.automationShare2025 * Math.pow(1 + capitalParams.automationGrowth, t);
        const cappedShare = Math.min(autoShare, 0.20);
        const automationCapitalT = capital * cappedShare;  // $ trillions
        // Convert to $ per worker (capital in $T, workers in absolute count)
        const dollarsPerWorker = (automationCapitalT * 1e12) / workers;
        // robotsPerCapitalUnit: robots per $1000 of automation capital per worker
        // At 2025: ~$1750/worker → ~15 robots/1000 workers (IFR-calibrated)
        return (dollarsPerWorker / 1000) * capitalParams.robotsPerCapitalUnit;
    }

    /**
     * Run capital model simulation
     * @param {Object} demographicsData - Output from runDemographics
     * @param {Object} demandData - Output from runDemandModel
     * @param {Object} climateData - Climate data with globalDamages
     * @returns {Object} Capital model data
     */
    function runCapitalModel(demographicsData, demandData, climateData) {
        const { years, regions: demoRegions, global: demoGlobal } = demographicsData;

        const capital = {
            stock: [],              // Total capital by year ($ trillions)
            investment: [],         // Annual investment ($ trillions)
            savingsRate: [],        // Aggregate savings rate
            regionalSavings: { oecd: [], china: [], em: [], row: [] },
            stability: [],          // Galbraith/Chen stability factor
            interestRate: [],       // Real interest rate
            robotsDensity: [],      // Robots per 1000 workers
            kPerWorker: []          // Capital per effective worker ($K)
        };

        // Initialize capital stock
        let currentCapital = capitalParams.initialCapitalStock;

        for (let i = 0; i < years.length; i++) {
            const year = years[i];

            // Get savings rates (demographic-weighted)
            const savings = aggregateSavingsRate(demoRegions, i);
            capital.savingsRate.push(savings.global);
            for (const region of ['oecd', 'china', 'em', 'row']) {
                capital.regionalSavings[region].push(savings.regional[region]);
            }

            // Get stability factor from climate damages
            // globalDamages is stored as percentage (0-30), convert to fraction
            const damagesFraction = climateData.globalDamages[i] / 100;
            const stability = stabilityFactor(damagesFraction);
            capital.stability.push(stability);

            // Store current capital stock
            capital.stock.push(currentCapital);

            // Get GDP for this year
            const gdp = demandData.global.gdp[i];

            // Calculate investment
            const invest = calculateInvestment(gdp, savings.global, stability);
            capital.investment.push(invest);

            // Calculate interest rate
            const r = calculateInterestRate(gdp, currentCapital);
            capital.interestRate.push(r);

            // Calculate robots density
            const effectiveWorkersCount = demoGlobal.effectiveWorkers[i];
            const robots = robotsDensity(currentCapital, effectiveWorkersCount, year);
            capital.robotsDensity.push(robots);

            // Calculate K per effective worker (in $K per person)
            const kPerW = (currentCapital * 1e12) / effectiveWorkersCount / 1000; // $K per person
            capital.kPerWorker.push(kPerW);

            // Update capital for next period (except last year)
            if (i < years.length - 1) {
                currentCapital = updateCapital(currentCapital, invest);
            }
        }

        // Add metrics
        const idx2025 = 0;
        const idx2050 = years.indexOf(2050);
        const idx2075 = years.indexOf(2075);
        const idx2100 = years.length - 1;

        capital.metrics = {
            kY2025: capital.stock[idx2025] / demandData.global.gdp[idx2025],
            kY2050: capital.stock[idx2050] / demandData.global.gdp[idx2050],
            interestRate2025: capital.interestRate[idx2025],
            interestRate2050: capital.interestRate[idx2050],
            robotsDensity2025: capital.robotsDensity[idx2025],
            robotsDensity2050: capital.robotsDensity[idx2050],
            robotsDensity2100: capital.robotsDensity[idx2100],
            savingsRate2025: capital.savingsRate[idx2025],
            savingsRate2075: capital.savingsRate[idx2075]
        };

        return capital;
    }

    // =============================================================================
    // SIMULATION DEFAULTS AND CONFIG
    // =============================================================================

    /**
     * Default simulation parameters (matches slider defaults)
     * Use energySim.defaults to see these without scanning the DOM
     */
    const defaults = {
        carbonPrice: 35,              // $/ton CO₂ (STEPS-aligned baseline)
        solarAlpha: 0.36,             // Wright's Law exponent (learning rate)
        solarGrowth: 0.25,            // 25% annual capacity growth
        electrificationTarget: 0.65,  // 65% of useful energy from electricity
        efficiencyMultiplier: 1.0,    // Multiplier on intensity decline rates
        climSensitivity: 3.0          // °C per CO₂ doubling
    };

    /**
     * Runtime configuration
     */
    const config = {
        quiet: false  // Set to true to suppress console warnings (e.g., dispatch shortfall)
    };

    // =============================================================================
    // DEMOGRAPHICS - Fernández-Villaverde-informed population model
    // =============================================================================

    /**
     * Regional demographic parameters (2025 baseline)
     *
     * INPUTS (calibration constants, not user-tuneable):
     * - pop2025: Starting population (UN data)
     * - fertility: 2025 TFR (total fertility rate)
     * - fertilityFloor: Long-term TFR convergence target
     * - fertilityDecay: Annual convergence rate toward floor
     * - lifeExpectancy: 2025 life expectancy at birth
     * - young/working/old: 2025 age cohort shares (must sum to 1)
     * - migrationRate: Net migration as fraction of population
     *
     * OUTPUTS (computed by runDemographics):
     * - Population trajectories per region
     * - Working-age population (used by demand model)
     * - Old-age dependency ratio (used by demand model)
     * - Fertility trajectories
     *
     * Theoretical basis: Fernández-Villaverde's thesis that global fertility
     * is converging faster than expected, with all regions trending toward
     * below-replacement rates.
     */
    const demographics = {
        oecd: {
            name: 'OECD',
            pop2025: 1.4e9,           // 1.4 billion
            fertility: 1.6,           // TFR (below replacement)
            fertilityFloor: 1.4,      // Long-term convergence target
            fertilityDecay: 0.005,    // Annual convergence rate
            lifeExpectancy: 82,
            young: 0.18,              // 0-19 share
            working: 0.59,            // 20-64 share
            old: 0.23,                // 65+ share (high, aging societies)
            migrationRate: 0.003,     // net immigration (helps offset aging)
            color: '#4cc9f0'
        },
        china: {
            name: 'China',
            pop2025: 1.4e9,
            fertility: 1.05,          // Very low TFR (lower than reported due to measurement issues)
            fertilityFloor: 0.85,     // Could go very low (South Korea at 0.7)
            fertilityDecay: 0.012,    // Faster decline
            lifeExpectancy: 78,
            young: 0.16,              // Already shrinking
            working: 0.68,            // Still large working-age cohort
            old: 0.16,                // Rising fast
            migrationRate: 0.0,
            color: '#f94144'
        },
        em: {  // Emerging Markets (India, Brazil, Indonesia, etc.)
            name: 'Emerging Markets',
            pop2025: 3.5e9,
            fertility: 2.1,           // Near replacement
            fertilityFloor: 1.4,      // Converging faster than expected
            fertilityDecay: 0.02,     // Faster convergence (Colombia at 1.06!)
            lifeExpectancy: 72,
            young: 0.27,
            working: 0.63,
            old: 0.10,                // Still relatively young
            migrationRate: -0.001,
            color: '#90be6d'
        },
        row: {  // Rest of World (Africa, etc.)
            name: 'Rest of World',
            pop2025: 2.0e9,
            fertility: 3.5,           // Still high but falling fast
            fertilityFloor: 1.6,      // Even Africa converging
            fertilityDecay: 0.03,     // Fast decline (Fernández-Villaverde: converging faster than expected)
            lifeExpectancy: 65,
            young: 0.40,              // Very young population
            working: 0.54,
            old: 0.06,
            migrationRate: -0.001,
            color: '#f9c74f'
        }
    };

    // =============================================================================
    // EDUCATION - Tertiary education and human capital
    // =============================================================================

    /**
     * Education parameters by region
     *
     * INPUTS (calibration constants):
     * - enrollmentRate2025: Current tertiary enrollment rate (World Bank)
     * - enrollmentTarget: Long-term convergence target
     * - enrollmentGrowth: Annual convergence rate (logistic)
     * - collegeShare2025: Current share of working-age with college degree
     * - wagePremium2025: College wage premium (OECD Education at a Glance)
     * - premiumTarget: Long-term wage premium convergence
     * - premiumDecay: Annual decay rate as supply increases
     * - lifeBonusCollege: Life expectancy bonus for college-educated (Chetty et al.)
     * - lifePenaltyNonCollege: Life expectancy penalty for non-college
     *
     * OUTPUTS (computed by runDemographics):
     * - workingCollege, workingNonCollege: Worker counts by education
     * - oldCollege, oldNonCollege: Elderly counts by education
     * - collegeShare: Fraction of workers with college degree
     * - effectiveWorkers: Productivity-weighted worker count
     *
     * Key insight: China's total workers peak ~2025, but college-educated workers
     * peak ~2040 due to 60% enrollment rate adding ~33M graduates/year.
     * This partially offsets demographic decline through productivity gains.
     */
    const educationParams = {
        oecd: {
            enrollmentRate2025: 0.55,     // 55% tertiary enrollment
            enrollmentTarget: 0.65,       // Long-term target
            enrollmentGrowth: 0.008,      // Slow growth (already high)
            collegeShare2025: 0.40,       // 40% of workers with degree
            wagePremium2025: 1.5,         // 50% wage premium
            premiumTarget: 1.4,           // Converging down as supply rises
            premiumDecay: 0.003,          // Slow decay
            lifeBonusCollege: 3,          // +3 years life expectancy
            lifePenaltyNonCollege: 3      // -3 years from base
        },
        china: {
            enrollmentRate2025: 0.60,     // 60% - higher than most realize
            enrollmentTarget: 0.70,
            enrollmentGrowth: 0.012,      // Moderate growth
            collegeShare2025: 0.22,       // 22% - still catching up
            wagePremium2025: 1.8,         // 80% premium (scarcity)
            premiumTarget: 1.5,           // Converging as graduates flood market
            premiumDecay: 0.004,
            lifeBonusCollege: 2,
            lifePenaltyNonCollege: 2
        },
        em: {
            enrollmentRate2025: 0.35,     // 35% - lower but growing fast
            enrollmentTarget: 0.55,
            enrollmentGrowth: 0.015,      // Fast growth
            collegeShare2025: 0.18,
            wagePremium2025: 2.0,         // 100% premium (high scarcity)
            premiumTarget: 1.6,
            premiumDecay: 0.005,
            lifeBonusCollege: 2,
            lifePenaltyNonCollege: 2
        },
        row: {
            enrollmentRate2025: 0.15,     // 15% - still low
            enrollmentTarget: 0.40,       // Long-term catch-up
            enrollmentGrowth: 0.020,      // Fast growth from low base
            collegeShare2025: 0.08,
            wagePremium2025: 2.2,         // Highest premium (extreme scarcity)
            premiumTarget: 1.7,
            premiumDecay: 0.006,
            lifeBonusCollege: 1,          // Smaller differential in ROW
            lifePenaltyNonCollege: 1
        }
    };

    /**
     * Project enrollment rate (logistic convergence to target)
     * enrollmentRate(t) = target - (target - rate2025) × e^(-growth × t)
     */
    function projectEnrollmentRate(params, yearsElapsed) {
        return params.enrollmentTarget -
               (params.enrollmentTarget - params.enrollmentRate2025) *
               Math.exp(-params.enrollmentGrowth * yearsElapsed);
    }

    /**
     * Project wage premium (exponential decay as supply increases)
     * wagePremium(t) = target + (premium2025 - target) × e^(-decay × t)
     */
    function projectWagePremium(params, yearsElapsed) {
        return params.premiumTarget +
               (params.wagePremium2025 - params.premiumTarget) *
               Math.exp(-params.premiumDecay * yearsElapsed);
    }

    /**
     * Calculate productivity-weighted effective workers
     * effectiveWorkers = nonCollege + college × wagePremium
     *
     * This captures the "China paradox": even as raw worker count declines,
     * effective labor supply can grow if college graduates increase faster.
     */
    function effectiveWorkers(workingCollege, workingNonCollege, wagePremium) {
        return workingNonCollege + workingCollege * wagePremium;
    }

    /**
     * Project fertility rate with convergence to floor
     * TFR(t) = TFR_floor + (TFR_0 - TFR_floor) × e^(-decay × t)
     */
    function projectFertility(tfr0, floor, decay, years) {
        return floor + (tfr0 - floor) * Math.exp(-decay * years);
    }

    /**
     * Calculate crude birth rate from TFR
     * CBR ≈ TFR × (women of childbearing age 15-49 as fraction of pop) / average age span
     * Calibrated to produce ~18 births per 1000 globally in 2025
     */
    function birthRateFromTFR(tfr, workingShare, youngShare) {
        // Women 15-49 are roughly split between young (15-19) and working (20-49) cohorts
        // Approximate: 0.25 of young + 0.65 of working are women 15-49
        const womenOfChildbearingAge = youngShare * 0.25 + workingShare * 0.65;
        // Divide by 2 (only women) and by 32 (average childbearing span)
        return (tfr * womenOfChildbearingAge * 0.5) / 32;
    }

    /**
     * Calculate crude death rate based on age structure and life expectancy
     * CDR ≈ 1/LE adjusted for age structure
     * Calibrated to produce ~8 deaths per 1000 globally in 2025
     */
    function deathRate(youngShare, workingShare, oldShare, lifeExpectancy) {
        // Age-specific mortality rates (approximate)
        // Young: very low mortality, Working: low mortality, Old: moderate (people live long in old cohort)
        const youngMortality = 0.001;  // 0.1% per year
        const workingMortality = 0.003; // 0.3% per year
        // Remaining life expectancy at 65 is about LE - 65 + 10 (selection effects)
        const remainingLEat65 = Math.max(15, lifeExpectancy - 55);
        const oldMortality = 1 / remainingLEat65;

        return youngShare * youngMortality +
               workingShare * workingMortality +
               oldShare * oldMortality;
    }

    /**
     * Age cohorts forward by one year
     * 3-cohort model: Young (0-19), Working (20-64), Old (65+)
     * Extended with education tracking: splits working and old by college/non-college
     *
     * @param {Object} region - Current demographic state
     * @param {number} tfr - Total fertility rate for this year
     * @param {number} year - Simulation year
     * @param {Object} eduState - Education state { workingCollege, workingNonCollege, oldCollege, oldNonCollege }
     * @param {Object} eduParams - Education parameters for this region
     * @returns {Object} Updated state including education splits
     */
    function ageCohorts(region, tfr, year, eduState, eduParams) {
        const { young, working, old, migrationRate, lifeExpectancy } = region;
        const pop = region.population;
        const t = year - 2025;

        // Calculate births and deaths using improved formulas
        const births = birthRateFromTFR(tfr, working, young) * pop;
        const deaths = deathRate(young, working, old, lifeExpectancy) * pop;

        // Aging transitions
        // Young cohort: 20 years, so 1/20 age out per year
        // Working cohort: 45 years (20-64), so 1/45 age out per year
        const agingOutOfYoung = (young * pop) / 20;
        const agingOutOfWorking = (working * pop) / 45;

        // Deaths by cohort (proportional to mortality rates)
        const youngDeaths = young * pop * 0.001;
        const workingDeaths = working * pop * 0.003; // Matches workingMortality in deathRate()
        const oldDeaths = deaths - youngDeaths - workingDeaths;

        // === EDUCATION TRACKING ===
        // Split new workers by enrollment rate (determined at age 18-22)
        const enrollRate = projectEnrollmentRate(eduParams, t);
        const newCollegeWorkers = agingOutOfYoung * enrollRate;
        const newNonCollegeWorkers = agingOutOfYoung * (1 - enrollRate);

        // Calculate aging out of working by education
        // Workers age out proportionally to their share of the working cohort
        const totalWorking = eduState.workingCollege + eduState.workingNonCollege;
        const collegeShareOfWorking = totalWorking > 0 ? eduState.workingCollege / totalWorking : 0.5;
        const agingOutCollegeWorkers = agingOutOfWorking * collegeShareOfWorking;
        const agingOutNonCollegeWorkers = agingOutOfWorking * (1 - collegeShareOfWorking);

        // Differential mortality: college-educated live longer (Chetty et al.)
        // Working deaths split by education share (similar mortality at working ages)
        const workingDeathsCollege = workingDeaths * collegeShareOfWorking;
        const workingDeathsNonCollege = workingDeaths * (1 - collegeShareOfWorking);

        // Old cohort deaths: differential mortality by education
        // College elderly have longer remaining life expectancy
        const totalOld = eduState.oldCollege + eduState.oldNonCollege;
        const collegeShareOfOld = totalOld > 0 ? eduState.oldCollege / totalOld : 0;

        // Remaining life expectancy at 65 differs by education
        const remainingLEat65Base = Math.max(15, lifeExpectancy - 55);
        const remainingLEat65College = remainingLEat65Base + eduParams.lifeBonusCollege * 0.5;
        const remainingLEat65NonCollege = Math.max(10, remainingLEat65Base - eduParams.lifePenaltyNonCollege * 0.5);

        // Old mortality rates by education
        const oldMortalityCollege = 1 / remainingLEat65College;
        const oldMortalityNonCollege = 1 / remainingLEat65NonCollege;

        // Deaths among elderly by education
        const oldDeathsCollege = Math.min(eduState.oldCollege * oldMortalityCollege, eduState.oldCollege);
        const oldDeathsNonCollege = Math.min(eduState.oldNonCollege * oldMortalityNonCollege, eduState.oldNonCollege);

        // Update education cohorts
        const newWorkingCollege = Math.max(0, eduState.workingCollege + newCollegeWorkers - agingOutCollegeWorkers - workingDeathsCollege);
        const newWorkingNonCollege = Math.max(0, eduState.workingNonCollege + newNonCollegeWorkers - agingOutNonCollegeWorkers - workingDeathsNonCollege);
        const newOldCollege = Math.max(0, eduState.oldCollege + agingOutCollegeWorkers - oldDeathsCollege);
        const newOldNonCollege = Math.max(0, eduState.oldNonCollege + agingOutNonCollegeWorkers - oldDeathsNonCollege);

        // === STANDARD COHORT UPDATES ===
        // New cohort sizes (total working/old derived from education splits)
        const newYoung = Math.max(0, young * pop + births - agingOutOfYoung - youngDeaths);
        const newWorking = newWorkingCollege + newWorkingNonCollege;
        const newOld = newOldCollege + newOldNonCollege;

        // Apply migration (to working-age primarily, assume 70% college for migrants)
        const migration = pop * migrationRate;
        const migrationCollege = migration * 0.8 * 0.70;  // 80% working-age, 70% college
        const migrationNonCollege = migration * 0.8 * 0.30;

        const adjustedWorkingCollege = newWorkingCollege + migrationCollege;
        const adjustedWorkingNonCollege = newWorkingNonCollege + migrationNonCollege;
        const adjustedWorking = adjustedWorkingCollege + adjustedWorkingNonCollege;
        const adjustedYoung = newYoung + migration * 0.15;
        const adjustedOld = newOld + migration * 0.05;
        const adjustedOldCollege = newOldCollege + migration * 0.05 * 0.5;
        const adjustedOldNonCollege = newOldNonCollege + migration * 0.05 * 0.5;

        const newPop = adjustedYoung + adjustedWorking + adjustedOld;

        // Calculate effective workers with wage premium
        const wagePremium = projectWagePremium(eduParams, t);
        const effWorkers = effectiveWorkers(adjustedWorkingCollege, adjustedWorkingNonCollege, wagePremium);

        return {
            population: newPop,
            young: adjustedYoung / newPop,
            working: adjustedWorking / newPop,
            old: adjustedOld / newPop,
            youngAbs: adjustedYoung,
            workingAbs: adjustedWorking,
            oldAbs: adjustedOld,
            // Education splits
            workingCollege: adjustedWorkingCollege,
            workingNonCollege: adjustedWorkingNonCollege,
            oldCollege: adjustedOldCollege,
            oldNonCollege: adjustedOldNonCollege,
            enrollmentRate: enrollRate,
            wagePremium: wagePremium,
            effectiveWorkers: effWorkers,
            collegeShare: adjustedWorking > 0 ? adjustedWorkingCollege / adjustedWorking : 0
        };
    }

    /**
     * Run full demographics simulation for 2025-2100
     * Returns yearly data by region and global aggregates
     * Includes education tracking: college/non-college splits and effective workers
     */
    function runDemographics() {
        const years = [];

        // Initialize region data structures with education arrays
        const createRegionData = () => ({
            population: [], young: [], working: [], old: [], fertility: [], dependency: [],
            // Education tracking
            workingCollege: [],
            workingNonCollege: [],
            oldCollege: [],
            oldNonCollege: [],
            collegeShare: [],
            enrollmentRate: [],
            wagePremium: [],
            effectiveWorkers: []
        });

        const regions = {
            oecd: createRegionData(),
            china: createRegionData(),
            em: createRegionData(),
            row: createRegionData()
        };

        const global = {
            population: [], young: [], working: [], old: [], dependency: [],
            // Education tracking
            workingCollege: [],
            workingNonCollege: [],
            oldCollege: [],
            oldNonCollege: [],
            collegeShare: [],
            effectiveWorkers: []
        };

        // Initialize current state for each region (including education)
        const currentState = {};
        const eduState = {};

        for (const [key, params] of Object.entries(demographics)) {
            const eduParams = educationParams[key];
            const workingPop = params.pop2025 * params.working;
            const oldPop = params.pop2025 * params.old;

            currentState[key] = {
                population: params.pop2025,
                young: params.young,
                working: params.working,
                old: params.old,
                lifeExpectancy: params.lifeExpectancy,
                migrationRate: params.migrationRate
            };

            // Initialize education state from 2025 baseline shares
            eduState[key] = {
                workingCollege: workingPop * eduParams.collegeShare2025,
                workingNonCollege: workingPop * (1 - eduParams.collegeShare2025),
                // Elderly college share starts lower (they got degrees decades ago)
                oldCollege: oldPop * eduParams.collegeShare2025 * 0.5,
                oldNonCollege: oldPop * (1 - eduParams.collegeShare2025 * 0.5)
            };
        }

        for (let year = 2025; year <= 2100; year++) {
            const t = year - 2025;
            years.push(year);

            let globalPop = 0, globalYoung = 0, globalWorking = 0, globalOld = 0;
            let globalWorkingCollege = 0, globalWorkingNonCollege = 0;
            let globalOldCollege = 0, globalOldNonCollege = 0;
            let globalEffectiveWorkers = 0;

            for (const [key, params] of Object.entries(demographics)) {
                const eduParams = educationParams[key];

                // Project fertility for this year
                const tfr = projectFertility(params.fertility, params.fertilityFloor, params.fertilityDecay, t);
                regions[key].fertility.push(tfr);

                // Store current values
                const state = currentState[key];
                const edu = eduState[key];

                regions[key].population.push(state.population);
                regions[key].young.push(state.young * state.population);
                regions[key].working.push(state.working * state.population);
                regions[key].old.push(state.old * state.population);
                regions[key].dependency.push(state.old / state.working);

                // Store education data
                regions[key].workingCollege.push(edu.workingCollege);
                regions[key].workingNonCollege.push(edu.workingNonCollege);
                regions[key].oldCollege.push(edu.oldCollege);
                regions[key].oldNonCollege.push(edu.oldNonCollege);

                const totalWorking = edu.workingCollege + edu.workingNonCollege;
                const collegeShare = totalWorking > 0 ? edu.workingCollege / totalWorking : 0;
                regions[key].collegeShare.push(collegeShare);

                const enrollRate = projectEnrollmentRate(eduParams, t);
                regions[key].enrollmentRate.push(enrollRate);

                const wagePremium = projectWagePremium(eduParams, t);
                regions[key].wagePremium.push(wagePremium);

                const effWorkers = effectiveWorkers(edu.workingCollege, edu.workingNonCollege, wagePremium);
                regions[key].effectiveWorkers.push(effWorkers);

                // Accumulate global totals
                globalPop += state.population;
                globalYoung += state.young * state.population;
                globalWorking += state.working * state.population;
                globalOld += state.old * state.population;
                globalWorkingCollege += edu.workingCollege;
                globalWorkingNonCollege += edu.workingNonCollege;
                globalOldCollege += edu.oldCollege;
                globalOldNonCollege += edu.oldNonCollege;
                globalEffectiveWorkers += effWorkers;

                // Age forward for next year (except last year)
                if (year < 2100) {
                    const nextState = ageCohorts(state, tfr, year, edu, eduParams);
                    currentState[key] = {
                        ...nextState,
                        lifeExpectancy: params.lifeExpectancy + t * 0.1, // Slow improvement
                        migrationRate: params.migrationRate
                    };
                    // Update education state from cohort aging
                    eduState[key] = {
                        workingCollege: nextState.workingCollege,
                        workingNonCollege: nextState.workingNonCollege,
                        oldCollege: nextState.oldCollege,
                        oldNonCollege: nextState.oldNonCollege
                    };
                }
            }

            // Store global aggregates
            global.population.push(globalPop);
            global.young.push(globalYoung);
            global.working.push(globalWorking);
            global.old.push(globalOld);
            global.dependency.push(globalOld / globalWorking);

            // Global education aggregates
            global.workingCollege.push(globalWorkingCollege);
            global.workingNonCollege.push(globalWorkingNonCollege);
            global.oldCollege.push(globalOldCollege);
            global.oldNonCollege.push(globalOldNonCollege);
            global.collegeShare.push(globalWorkingCollege / (globalWorkingCollege + globalWorkingNonCollege));
            global.effectiveWorkers.push(globalEffectiveWorkers);
        }

        return { years, regions, global };
    }

    /**
     * Find year of peak population
     */
    function findPopulationPeak(populationArray, years) {
        let maxPop = 0;
        let peakYear = years[0];
        for (let i = 0; i < populationArray.length; i++) {
            if (populationArray[i] > maxPop) {
                maxPop = populationArray[i];
                peakYear = years[i];
            }
        }
        return { year: peakYear, population: maxPop };
    }

    // =============================================================================
    // DEMAND MODEL - GDP, energy intensity, and electricity demand
    // =============================================================================

    /**
     * Regional economic parameters (2025 baseline)
     *
     * INPUTS (calibration constants, not user-tuneable):
     * - gdp2025: Regional GDP in trillions USD (World Bank data)
     * - tfpGrowth: Total factor productivity growth rate
     * - tfpDecay: Rate at which catch-up growth fades (convergence)
     * - energyIntensity: MWh per $1000 GDP (calibrated to 2025 electricity data)
     * - intensityDecline: Annual efficiency improvement rate
     *
     * Theoretical basis:
     * - Fernández-Villaverde: GDP per working-age adult as key metric
     * - Ole Peters: Ergodicity economics (time-average vs ensemble-average)
     * - Odum: Energy as basis of real wealth
     *
     * Energy intensity calibrated to match ~30,000 TWh global electricity in 2025:
     * - OECD: ~10,000 TWh, $58T GDP → 0.43 MWh/$1000 total energy, 40% electric
     * - China: ~9,000 TWh, $18T GDP → 1.25 MWh/$1000 total energy
     * - EM: ~8,000 TWh, $35T GDP → 0.57 MWh/$1000 total energy
     * - ROW: ~3,000 TWh, $8T GDP → 0.94 MWh/$1000 total energy
     */
    const economicParams = {
        oecd: {
            gdp2025: 58,              // $58T (World Bank)
            tfpGrowth: 0.015,         // 1.5% baseline TFP
            tfpDecay: 0.0,            // Mature economy - no convergence
            energyIntensity: 0.43,    // MWh per $1000 GDP (total energy)
            intensityDecline: 0.010   // 1.0%/year efficiency gains
        },
        china: {
            gdp2025: 18,              // $18T (World Bank)
            tfpGrowth: 0.035,         // 3.5% catch-up growth
            tfpDecay: 0.015,          // Converging toward OECD
            energyIntensity: 1.25,    // High - industrial economy
            intensityDecline: 0.020   // 2.0%/year (rapid improvement)
        },
        em: {
            gdp2025: 35,              // $35T (India, Brazil, Indonesia, etc.)
            tfpGrowth: 0.025,         // 2.5% baseline
            tfpDecay: 0.008,          // Slow convergence
            energyIntensity: 0.57,    // Mixed economies
            intensityDecline: 0.015   // 1.5%/year
        },
        row: {
            gdp2025: 8,               // $8T (Africa, etc.)
            tfpGrowth: 0.030,         // 3.0% demographic dividend
            tfpDecay: 0.010,          // Gradual convergence
            energyIntensity: 0.94,    // Lower efficiency
            intensityDecline: 0.012   // 1.2%/year
        }
    };

    /**
     * Global demand model parameters
     *
     * INPUTS (user-tuneable via sliders):
     * - electrificationTarget: Target electricity share (slider)
     * - efficiencyMultiplier: Scales intensity decline (slider, passed to runDemandModel)
     *
     * INPUTS (calibration constants):
     * - electrification2025: Current electricity share of useful energy (IEA)
     * - electrificationSpeed: Logistic convergence rate
     * - demographicFactor: How much dependency ratio affects GDP growth
     *
     * Note: baselineDependency is computed from demographics model output,
     * not hardcoded, ensuring consistency between models.
     */
    const demandParams = {
        electrification2025: 0.40,    // Current electricity share (IEA data)
        electrificationTarget: 0.65,  // 2050+ target (IEA Net Zero)
        electrificationSpeed: 0.08,   // Convergence rate
        demographicFactor: 0.015      // Dependency ratio impact on growth
    };

    /**
     * Run demand model simulation
     * Calculates GDP growth, energy intensity, and electricity demand by region
     *
     * INPUTS (from parameters):
     * - electrificationTarget: Target electricity share of useful energy (slider)
     * - efficiencyMultiplier: Scales intensity decline rates (slider)
     *
     * INPUTS (from demographicsData - computed by Phase 2):
     * - working-age population per region
     * - dependency ratios per region
     *
     * OUTPUTS:
     * - GDP trajectories per region
     * - Electricity demand per region (TWh)
     * - GDP per working-age adult
     * - kWh per working-age adult
     *
     * @param {Object} demographicsData - Output from runDemographics()
     * @param {Object} params - Optional overrides for electrification target, efficiency
     * @returns {Object} Demand data structure with regional and global projections
     */
    function runDemandModel(demographicsData, params = {}) {
        const { years, regions: demoRegions, global: demoGlobal } = demographicsData;
        const electTarget = params.electrificationTarget ?? demandParams.electrificationTarget;
        const efficiencyMult = params.efficiencyMultiplier ?? 1.0;

        // Compute baseline dependency from demographics model (not hardcoded)
        const baselineDependency = demoGlobal.dependency[0];

        const demand = {
            regions: {
                oecd: { gdp: [], growthRate: [], energyIntensity: [], electricityDemand: [], gdpPerWorking: [], electricityPerWorking: [] },
                china: { gdp: [], growthRate: [], energyIntensity: [], electricityDemand: [], gdpPerWorking: [], electricityPerWorking: [] },
                em: { gdp: [], growthRate: [], energyIntensity: [], electricityDemand: [], gdpPerWorking: [], electricityPerWorking: [] },
                row: { gdp: [], growthRate: [], energyIntensity: [], electricityDemand: [], gdpPerWorking: [], electricityPerWorking: [] }
            },
            global: {
                gdp: [],
                electricityDemand: [],
                electrificationRate: [],
                gdpPerWorking: [],
                electricityPerWorking: []
            },
            metrics: {
                elec2050: null,
                demandDoubling: null,
                asiaShare2050: null
            }
        };

        // Initialize state per region
        const state = {};
        for (const [key, econ] of Object.entries(economicParams)) {
            state[key] = {
                gdp: econ.gdp2025,
                intensity: econ.energyIntensity
            };
        }

        // Initial 2025 electricity demand (for doubling calculation)
        let initialGlobalElec = null;

        for (let i = 0; i < years.length; i++) {
            const t = i; // Years since 2025
            const year = years[i];

            // Calculate global electrification rate (logistic convergence)
            const electRate = electTarget - (electTarget - demandParams.electrification2025) *
                Math.exp(-demandParams.electrificationSpeed * t);
            demand.global.electrificationRate.push(electRate);

            let globalGdp = 0;
            let globalElec = 0;
            let globalWorking = 0;

            for (const [key, econ] of Object.entries(economicParams)) {
                const regionDemo = demoRegions[key];
                const currentState = state[key];

                // Get working-age population for this year
                const working = regionDemo.working[i];
                const workingPrev = i > 0 ? regionDemo.working[i - 1] : working;

                // Get effective workers (productivity-weighted by education)
                // This captures the "China paradox": raw workers decline but effective workers
                // can still grow if college graduates increase faster than overall decline
                const effective = regionDemo.effectiveWorkers[i];
                const effectivePrev = i > 0 ? regionDemo.effectiveWorkers[i - 1] : effective;

                // Get dependency ratio
                const dependency = regionDemo.dependency[i];

                // Calculate labor growth using effective workers (quality-adjusted)
                // Effective workers = nonCollege + college × wagePremium
                // This means labor growth captures both headcount and human capital
                const laborGrowth = i > 0 ? (effective - effectivePrev) / effectivePrev : 0;

                // Demographic adjustment (Fernández-Villaverde)
                // Higher dependency = lower growth
                const demographicAdj = demandParams.demographicFactor *
                    (baselineDependency - dependency);

                // TFP with decay (catch-up growth fades)
                const tfp = econ.tfpGrowth * Math.pow(1 - econ.tfpDecay, t);

                // Total growth rate: TFP + labor contribution + demographic adjustment
                // Labor share (1 - α) ≈ 0.65
                const growthRate = tfp + 0.65 * laborGrowth + demographicAdj;

                // Update GDP (first year is baseline)
                if (i > 0) {
                    currentState.gdp = currentState.gdp * (1 + growthRate);
                }
                demand.regions[key].gdp.push(currentState.gdp);
                demand.regions[key].growthRate.push(growthRate);

                // Energy intensity decline (efficiency improvements)
                if (i > 0) {
                    currentState.intensity = currentState.intensity *
                        (1 - econ.intensityDecline * efficiencyMult);
                }
                demand.regions[key].energyIntensity.push(currentState.intensity);

                // Calculate electricity demand
                // Total energy = GDP × intensity × 1000 (TWh)
                const totalEnergy = currentState.gdp * currentState.intensity * 1000;
                // Electricity = total energy × electrification rate
                const elecDemand = totalEnergy * electRate;
                demand.regions[key].electricityDemand.push(elecDemand);

                // Per working-age adult metrics (Peters-informed)
                const gdpPerWorking = (currentState.gdp * 1e12) / working;  // $ per person
                const elecPerWorking = (elecDemand * 1e9) / working;        // kWh per person
                demand.regions[key].gdpPerWorking.push(gdpPerWorking);
                demand.regions[key].electricityPerWorking.push(elecPerWorking);

                // Accumulate globals
                globalGdp += currentState.gdp;
                globalElec += elecDemand;
                globalWorking += working;
            }

            // Store global aggregates
            demand.global.gdp.push(globalGdp);
            demand.global.electricityDemand.push(globalElec);
            demand.global.gdpPerWorking.push((globalGdp * 1e12) / globalWorking);
            demand.global.electricityPerWorking.push((globalElec * 1e9) / globalWorking);

            // Track initial for doubling calculation
            if (i === 0) {
                initialGlobalElec = globalElec;
            }

            // Find doubling year
            if (demand.metrics.demandDoubling === null && globalElec >= initialGlobalElec * 2) {
                demand.metrics.demandDoubling = year;
            }
        }

        // Calculate metrics
        const idx2050 = years.indexOf(2050);
        if (idx2050 !== -1) {
            demand.metrics.elec2050 = demand.global.electricityDemand[idx2050];

            // Asia-Pacific share (China + ~60% of EM as proxy)
            const asiaElec = demand.regions.china.electricityDemand[idx2050] +
                demand.regions.em.electricityDemand[idx2050] * 0.6;
            demand.metrics.asiaShare2050 = asiaElec / demand.global.electricityDemand[idx2050];
        }

        return demand;
    }

    // =============================================================================
    // DISPATCH - Merit order source allocation
    // =============================================================================

    /**
     * Calculate generation capacity (GW) available for each source
     * Tracks installed capacity with growth rates
     *
     * @param {number} year - Simulation year
     * @param {number} solarGrowth - Solar capacity growth rate
     * @returns {Object} Capacity in GW for each source
     */
    function getCapacities(year, solarGrowth) {
        const t = year - 2025;
        return {
            solar: energySources.solar.capacity2025 * Math.pow(1 + solarGrowth, t),
            wind: energySources.wind.capacity2025 * Math.pow(1 + energySources.wind.growthRate, t),
            hydro: energySources.hydro.capacity2025 * Math.pow(1 + energySources.hydro.growthRate, t),
            gas: 2500 * Math.pow(1 + 0.01, t),       // ~2500 GW global gas capacity, slow growth
            coal: 2100 * Math.pow(1 - 0.02, t),     // ~2100 GW global coal, declining
            nuclear: energySources.nuclear.capacity2025 * Math.pow(1 + energySources.nuclear.growthRate, t),
            battery: energySources.battery.capacity2025 * Math.pow(1 + energySources.battery.growthRate, t) / 4 // GWh → GW (4h storage = divide by 4)
        };
    }

    /**
     * Initialize capacity state with 2025 baseline values
     *
     * Creates the state structure for tracking actual deployments over time.
     * This replaces the approach of recalculating from growth curves each year.
     *
     * @returns {Object} Capacity state with installed and additions arrays per source
     */
    function initializeCapacityState() {
        return {
            solar: {
                installed: [energySources.solar.capacity2025],  // GW
                additions: [0],  // First year has no additions (it's the baseline)
                retirements: [0]
            },
            wind: {
                installed: [energySources.wind.capacity2025],
                additions: [0],
                retirements: [0]
            },
            hydro: {
                installed: [energySources.hydro.capacity2025],
                additions: [0],
                retirements: [0]
            },
            nuclear: {
                installed: [energySources.nuclear.capacity2025],
                additions: [0],
                retirements: [0]
            },
            gas: {
                installed: [2500],  // ~2500 GW global gas capacity in 2025
                additions: [0],
                retirements: [0]
            },
            coal: {
                installed: [2100],  // ~2100 GW global coal capacity in 2025
                additions: [0],
                retirements: [0]
            },
            battery: {
                installed: [energySources.battery.capacity2025],  // GWh
                additions: [0],
                retirements: [0]
            }
        };
    }

    /**
     * Calculate max useful capacity for each source based on electricity demand
     *
     * @param {number} demandTWh - Total electricity demand in TWh
     * @returns {Object} Maximum useful capacity in GW (GWh for battery)
     */
    function calculateMaxUsefulCapacity(demandTWh) {
        const hoursPerYear = 8760;

        // Max capacity = demand × penetration / (capacityFactor × hours) × 1000
        // This is the capacity at which adding more doesn't serve additional demand
        return {
            solar: (demandTWh * capacityParams.penetrationLimits.solar / (dispatchParams.solar.capacityFactor * hoursPerYear)) * 1000,
            wind: (demandTWh * capacityParams.penetrationLimits.wind / (dispatchParams.wind.capacityFactor * hoursPerYear)) * 1000,
            nuclear: (demandTWh * capacityParams.penetrationLimits.nuclear / (dispatchParams.nuclear.capacityFactor * hoursPerYear)) * 1000,
            hydro: (demandTWh * capacityParams.penetrationLimits.hydro / (dispatchParams.hydro.capacityFactor * hoursPerYear)) * 1000,
            // Battery: ~50% of solar capacity for firming
            battery: (demandTWh * capacityParams.penetrationLimits.solar / (dispatchParams.solar.capacityFactor * hoursPerYear)) * 1000 * 0.5 * 4,  // Convert GW to GWh (4h storage)
            // Fossil: effectively unlimited (dispatchable backup)
            gas: Infinity,
            coal: 0  // No new coal allowed
        };
    }

    /**
     * Update capacity state for the next year
     *
     * Applies constraints:
     * 1. Demand ceiling - Can't overbuild beyond useful capacity
     * 2. Growth rate cap - Manufacturing/supply chain limits
     *
     * @param {Object} state - Current capacity state
     * @param {number} yearIndex - Index of year to update (state arrays will grow to this index)
     * @param {number} demandTWh - Electricity demand for demand ceiling calculation
     * @param {Object} params - Simulation parameters (solarGrowth, etc.)
     */
    /**
     * Calculate CAPEX-adjusted capacity that can be built with available investment
     *
     * @param {number} investment - Total investment available ($T)
     * @param {number} cleanEnergyShare - Share of investment going to clean energy
     * @param {number} year - Simulation year (for CAPEX learning)
     * @returns {Object} Max additions in GW/GWh per source
     */
    function calculateInvestmentCapacity(investment, cleanEnergyShare, year) {
        const t = year - 2025;
        const cleanBudget = investment * cleanEnergyShare * 1000;  // $T → $B

        // CAPEX declines with learning (simplified: 2% per year for solar/wind/battery)
        const capexLearningFactor = Math.pow(0.98, t);

        // Allocate budget across sources (simplified allocation)
        // In reality this would be based on LCOE-driven investment decisions
        const allocation = {
            solar: 0.40,      // 40% to solar
            wind: 0.25,       // 25% to wind
            battery: 0.20,    // 20% to battery
            nuclear: 0.10,    // 10% to nuclear
            hydro: 0.05       // 5% to hydro
        };

        const result = {};
        for (const source of ['solar', 'wind', 'battery', 'nuclear', 'hydro']) {
            const budget = cleanBudget * allocation[source];  // $B for this source
            let capex = capacityParams.capex[source];

            // Apply learning to solar, wind, battery
            if (source === 'solar' || source === 'wind' || source === 'battery') {
                capex *= capexLearningFactor;
            }

            // Budget ($B) / CAPEX ($M/GW) × 1000 = GW
            result[source] = (budget / capex) * 1000;
        }

        // Fossil sources: no new investment constraint (or negative for decline)
        result.gas = Infinity;
        result.coal = 0;

        return result;
    }

    /**
     * Calculate retirement (assets reaching end of life)
     *
     * @param {Object} state - Capacity state
     * @param {number} yearIndex - Current year index
     * @param {string} source - Source name
     * @returns {number} Capacity retiring this year (GW or GWh)
     */
    function calculateRetirement(state, yearIndex, source) {
        const lifetime = capacityParams.lifetime[source];
        if (!lifetime || yearIndex < lifetime) {
            return 0;  // No retirements yet
        }

        // Simplified: assume constant fraction retires each year
        // More accurate would be to track vintage-specific retirements
        const prevInstalled = state[source].installed[yearIndex - 1];
        return prevInstalled / lifetime;
    }

    function updateCapacityState(state, yearIndex, demandTWh, params, prevInvestment = null) {
        const solarGrowth = params.solarGrowth ?? 0.25;
        const year = 2025 + yearIndex;

        // Calculate max useful capacity for demand ceiling
        const maxUseful = calculateMaxUsefulCapacity(demandTWh);

        // Calculate investment-constrained capacity if investment data provided
        // Use previous year's investment (lag structure - economically realistic)
        let investmentCap = null;
        if (prevInvestment !== null) {
            // Clean energy share grows over time (15% in 2025 → 30% by 2050)
            const t = yearIndex;
            const cleanShare = 0.15 + 0.15 * Math.min(1, t / 25);
            investmentCap = calculateInvestmentCapacity(prevInvestment, cleanShare, year);
        }

        // For each source, calculate constrained additions
        const sources = ['solar', 'wind', 'hydro', 'nuclear', 'gas', 'coal', 'battery'];

        for (const source of sources) {
            const prevInstalled = state[source].installed[yearIndex - 1];

            // Calculate retirement
            const retirement = calculateRetirement(state, yearIndex, source);

            // Desired growth from baseline growth rates
            let desiredGrowth;
            if (source === 'solar') {
                desiredGrowth = prevInstalled * solarGrowth;
            } else if (source === 'wind') {
                desiredGrowth = prevInstalled * energySources.wind.growthRate;
            } else if (source === 'hydro') {
                desiredGrowth = prevInstalled * energySources.hydro.growthRate;
            } else if (source === 'nuclear') {
                desiredGrowth = prevInstalled * energySources.nuclear.growthRate;
            } else if (source === 'gas') {
                desiredGrowth = prevInstalled * 0.01;  // 1% growth
            } else if (source === 'coal') {
                // Coal is declining - negative growth (accelerated retirement)
                desiredGrowth = prevInstalled * (-0.02);  // -2% per year
            } else if (source === 'battery') {
                desiredGrowth = prevInstalled * energySources.battery.growthRate;
            }

            // Constraint 1: Growth rate cap (manufacturing/supply chain limits)
            const maxGrowthRate = capacityParams.maxGrowthRate[source];
            const growthCapped = Math.min(Math.abs(desiredGrowth), prevInstalled * maxGrowthRate);
            // Preserve sign for coal (negative growth)
            const growthWithSign = desiredGrowth < 0 ? -growthCapped : growthCapped;

            // Constraint 2: Demand ceiling (can't overbuild beyond useful capacity)
            const ceilingRoom = maxUseful[source] - prevInstalled;

            // Constraint 3: Investment constraint (if provided)
            let investmentRoom = Infinity;
            if (investmentCap && investmentCap[source] !== undefined) {
                investmentRoom = investmentCap[source];
            }

            // Apply constraints
            let additions;
            if (desiredGrowth < 0) {
                // Declining sources (coal): apply decline + retirement
                additions = growthWithSign;
            } else {
                // Growing sources: min of all constraints
                additions = Math.min(growthCapped, Math.max(0, ceilingRoom), investmentRoom);
            }

            // Net change = additions - retirements
            const netChange = additions - retirement;

            // Ensure non-negative installed capacity
            const newInstalled = Math.max(0, prevInstalled + netChange);

            state[source].installed.push(newInstalled);
            state[source].additions.push(additions);

            // Track retirement if we have an array for it
            if (!state[source].retirements) {
                state[source].retirements = [0];  // Initialize for year 0
            }
            state[source].retirements.push(retirement);
        }
    }

    /**
     * Get capacity snapshot from state for a given year index
     *
     * @param {Object} state - Capacity state
     * @param {number} yearIndex - Index into state arrays
     * @returns {Object} Capacity in GW for each source (GWh for battery), with GW battery for dispatch
     */
    function getCapacityFromState(state, yearIndex) {
        return {
            solar: state.solar.installed[yearIndex],
            wind: state.wind.installed[yearIndex],
            hydro: state.hydro.installed[yearIndex],
            nuclear: state.nuclear.installed[yearIndex],
            gas: state.gas.installed[yearIndex],
            coal: state.coal.installed[yearIndex],
            battery: state.battery.installed[yearIndex] / 4  // GWh → GW (4h storage)
        };
    }

    /**
     * Merit order dispatch - allocates demand to cheapest sources first
     * Respects capacity constraints and penetration limits
     *
     * Solar has two dispatch modes:
     * 1. Bare solar: capped at 40% penetration (intermittency limit)
     * 2. Solar+Battery: dispatchable, can push total solar to 80% penetration
     *    - Limited by battery capacity (how much solar it can firm)
     *    - Competes in merit order at combined LCOE
     *
     * @param {number} demandTWh - Total electricity demand in TWh
     * @param {Object} lcoes - LCOE for each source ($/MWh), including solarPlusBattery
     * @param {Object} capacities - Installed capacity (GW) for each source
     * @returns {Object} Generation (TWh) by source, plus grid intensity
     */
    function dispatch(demandTWh, lcoes, capacities) {
        const hoursPerYear = 8760;
        const result = {
            solar: 0,
            wind: 0,
            hydro: 0,
            gas: 0,
            coal: 0,
            nuclear: 0,
            solarPlusBattery: 0,
            total: 0
        };

        // Calculate max generation (TWh) each source can provide
        const maxGen = {
            solar: capacities.solar * dispatchParams.solar.capacityFactor * hoursPerYear / 1000,
            wind: capacities.wind * dispatchParams.wind.capacityFactor * hoursPerYear / 1000,
            hydro: capacities.hydro * dispatchParams.hydro.capacityFactor * hoursPerYear / 1000,
            gas: capacities.gas * dispatchParams.gas.capacityFactor * hoursPerYear / 1000,
            coal: capacities.coal * dispatchParams.coal.capacityFactor * hoursPerYear / 1000,
            nuclear: capacities.nuclear * dispatchParams.nuclear.capacityFactor * hoursPerYear / 1000
        };

        // Solar+Battery capacity limited by battery storage
        // Battery GWh can firm ~2x its capacity in solar (4h storage, solar produces for ~8h)
        // Then convert to TWh using same capacity factor
        const solarCapacityFirmable = capacities.battery * 2; // GW of solar that battery can firm
        maxGen.solarPlusBattery = Math.min(
            capacities.solar * 0.5, // At most half of solar can be battery-backed
            solarCapacityFirmable
        ) * dispatchParams.solarPlusBattery.capacityFactor * hoursPerYear / 1000;

        // Track total solar penetration (bare + battery-backed)
        let totalSolarAllocated = 0;
        const maxBareSolarPen = dispatchParams.solar.maxPenetration; // 40%
        const maxTotalSolarPen = dispatchParams.solarPlusBattery.maxPenetration; // 80%

        // Sort sources by LCOE (merit order)
        // solarPlusBattery competes separately from bare solar
        // Hydro has fixed LCOE (no learning, mature tech)
        const hydroLcoe = energySources.hydro.cost0;
        const sources = [
            { name: 'nuclear', lcoe: lcoes.nuclear, max: maxGen.nuclear, carbonIntensity: 0, isSolar: false },
            { name: 'hydro', lcoe: hydroLcoe, max: maxGen.hydro, carbonIntensity: 0, isSolar: false },
            { name: 'solar', lcoe: lcoes.solar, max: maxGen.solar, carbonIntensity: 0, isSolar: true, isBareSolar: true },
            { name: 'solarPlusBattery', lcoe: lcoes.solarPlusBattery, max: maxGen.solarPlusBattery, carbonIntensity: 0, isSolar: true, isBareSolar: false },
            { name: 'wind', lcoe: lcoes.wind, max: maxGen.wind, carbonIntensity: 0, isSolar: false },
            { name: 'gas', lcoe: lcoes.gas, max: maxGen.gas, carbonIntensity: energySources.gas.carbonIntensity, isSolar: false },
            { name: 'coal', lcoe: lcoes.coal, max: maxGen.coal, carbonIntensity: energySources.coal.carbonIntensity, isSolar: false }
        ];

        sources.sort((a, b) => a.lcoe - b.lcoe);

        // Dispatch in merit order
        let remaining = demandTWh;
        let totalWind = 0;
        const maxWindPen = dispatchParams.wind.maxPenetration;

        for (const source of sources) {
            if (remaining <= 0) break;

            // Calculate penetration limit based on source type
            let maxAllocation = source.max;

            if (source.isSolar) {
                // Solar sources share total solar penetration limit
                const totalSolarRoom = maxTotalSolarPen * demandTWh - totalSolarAllocated;

                if (source.isBareSolar) {
                    // Bare solar also limited by its own 40% cap
                    const bareSolarRoom = maxBareSolarPen * demandTWh - totalSolarAllocated;
                    maxAllocation = Math.min(maxAllocation, bareSolarRoom, totalSolarRoom);
                } else {
                    // solarPlusBattery only limited by total solar cap (80%)
                    maxAllocation = Math.min(maxAllocation, totalSolarRoom);
                }
            } else if (source.name === 'wind') {
                const windRoom = maxWindPen * demandTWh - totalWind;
                maxAllocation = Math.min(maxAllocation, windRoom);
            }

            const allocation = Math.min(remaining, Math.max(0, maxAllocation));

            if (allocation > 0) {
                result[source.name] = allocation;
                remaining -= allocation;

                if (source.isSolar) {
                    totalSolarAllocated += allocation;
                } else if (source.name === 'wind') {
                    totalWind += allocation;
                }
            }
        }

        // If demand not met (shouldn't happen with fossil backup), log warning
        if (remaining > 0.1 && !config.quiet) {
            console.warn(`Dispatch shortfall: ${remaining.toFixed(1)} TWh unmet`);
        }

        result.total = demandTWh - remaining;

        // Calculate grid carbon intensity (kg CO₂/MWh)
        const totalEmissions = result.gas * energySources.gas.carbonIntensity +
                               result.coal * energySources.coal.carbonIntensity;
        result.gridIntensity = result.total > 0 ? totalEmissions / result.total : 0;

        return result;
    }

    // =============================================================================
    // CLIMATE - Emissions and damage calculations
    // =============================================================================

    /**
     * Calculate total CO₂ emissions from dispatch and non-electric sectors
     *
     * @param {Object} dispatchResult - Generation (TWh) by source from dispatch()
     * @param {number} electrificationRate - Fraction of useful energy from electricity
     * @returns {Object} Emissions breakdown and total (Gt CO₂)
     */
    function calculateEmissions(dispatchResult, electrificationRate) {
        // Electricity emissions (Gt CO₂)
        const electricityEmissions = (
            dispatchResult.gas * energySources.gas.carbonIntensity +
            dispatchResult.coal * energySources.coal.carbonIntensity
        ) / 1e6; // kg → Gt

        // Non-electricity emissions decline with electrification
        // As electrification increases, transport/industry/heating shift to grid
        const nonElecBaseline = climateParams.nonElecEmissions2025;
        const electrificationGain = electrificationRate - 0.40; // Above 2025 baseline
        // electrificationGain is in decimal (0.10 = 10%), multiply by 20 to get 2 Gt per 10%
        const nonElecReduction = Math.max(0, electrificationGain * 20); // 2 Gt reduction per 10% electrification
        const nonElecEmissions = Math.max(5, nonElecBaseline - nonElecReduction);

        return {
            electricity: electricityEmissions,
            nonElectricity: nonElecEmissions,
            total: electricityEmissions + nonElecEmissions
        };
    }

    /**
     * Update climate state based on cumulative emissions
     *
     * @param {number} cumulativeEmissions - Total Gt CO₂ emitted since preindustrial
     * @param {number} previousTemp - Temperature from previous year (for lag)
     * @param {number} climSensitivity - Climate sensitivity (°C per CO₂ doubling)
     * @returns {Object} Updated CO₂ ppm and temperature
     */
    function updateClimate(cumulativeEmissions, previousTemp, climSensitivity) {
        // Calculate atmospheric CO₂ from cumulative emissions
        // This derived approach allows counterfactual analysis (e.g., different emission histories)
        const atmosphericCO2 = cumulativeEmissions * climateParams.airborneraction * climateParams.ppmPerGt;
        const co2ppm = climateParams.preindustrialCO2 + atmosphericCO2;

        // Equilibrium temperature from radiative forcing
        // T = S × log₂(CO₂/280)
        const equilibriumTemp = climSensitivity * Math.log2(co2ppm / climateParams.preindustrialCO2);

        // Temperature lags behind equilibrium (ocean thermal inertia)
        // Simple exponential approach: T(t) = T(t-1) + (T_eq - T(t-1)) / lag
        const lagFactor = 1 / climateParams.temperatureLag;
        const temperature = previousTemp + (equilibriumTemp - previousTemp) * lagFactor;

        return {
            co2ppm,
            equilibriumTemp,
            temperature
        };
    }

    /**
     * Calculate climate damages as fraction of GDP
     * Uses DICE-2023 quadratic damage function with regional variation
     *
     * @param {number} temperature - °C above preindustrial
     * @param {string} region - Region key (oecd, china, em, row)
     * @returns {number} Damage as fraction of GDP (0-0.30)
     */
    function climateDamages(temperature, region) {
        // Base quadratic damage: D = a × T²
        let damage = climateParams.damageCoeff * Math.pow(temperature, 2);

        // Regional multiplier
        const regionalMult = climateParams.regionalDamage[region] || 1.0;
        damage *= regionalMult;

        // Tipping point: smooth S-curve transition instead of binary switch
        // Steepness of 4.0 means transition happens mostly between 2.0°C and 3.0°C
        const tippingTransition = 1 / (1 + Math.exp(-climateParams.tippingSteepness * (temperature - climateParams.tippingThreshold)));
        // If T << 2.5, transition ≈ 0. If T >> 2.5, transition ≈ 1.
        damage *= (1 + (climateParams.tippingMultiplier - 1) * tippingTransition);

        // Cap damages (Weitzman bounded utility)
        return Math.min(damage, climateParams.maxDamage);
    }

    /**
     * Export demographics data as CSV
     */
    function exportDemographicsCSV(demographicsData) {
        const { years, regions, global } = demographicsData;
        let csv = 'Year,Region,Population,Young,Working,Old,TFR,Dependency\n';

        for (let i = 0; i < years.length; i++) {
            const year = years[i];

            for (const [key, data] of Object.entries(regions)) {
                csv += `${year},${demographics[key].name},${data.population[i].toFixed(0)},${data.young[i].toFixed(0)},${data.working[i].toFixed(0)},${data.old[i].toFixed(0)},${data.fertility[i].toFixed(2)},${(data.dependency[i] * 100).toFixed(1)}%\n`;
            }

            csv += `${year},Global,${global.population[i].toFixed(0)},${global.young[i].toFixed(0)},${global.working[i].toFixed(0)},${global.old[i].toFixed(0)},,${(global.dependency[i] * 100).toFixed(1)}%\n`;
        }

        return csv;
    }

    // =============================================================================
    // REBOUND DEMAND CALCULATION
    // =============================================================================

    /**
     * Calculate demand adjustment from Jevons rebound and robot energy load
     *
     * This function implements two mechanisms that increase energy demand:
     * 1. Price rebound (Jevons): When energy becomes cheap, people use more
     * 2. Robot energy: Automation consumes significant electricity
     *
     * @param {number} baseDemandTWh - Baseline electricity demand
     * @param {number} cheapestLCOE - Lowest LCOE among sources ($/MWh)
     * @param {number} year - Simulation year
     * @param {number} globalWorkers - Global working population
     * @returns {Object} { adjustedDemand, robotLoadTWh, priceMultiplier, robotsPer1000 }
     */
    function calculateReboundDemand(baseDemandTWh, cheapestLCOE, year, globalWorkers) {
        const t = year - 2025;

        // 1. Calculate projected robot density (deterministic from year)
        // Uses exponential growth from baseline to cap
        const robotsPer1000 = Math.min(
            reboundParams.robotBaseline2025 * Math.pow(1 + reboundParams.robotGrowthRate, t),
            reboundParams.robotCap
        );

        // Total robots globally
        const totalRobots = (robotsPer1000 / 1000) * globalWorkers;

        // Robot energy load (TWh)
        const robotLoadTWh = totalRobots * reboundParams.energyPerRobotMWh / 1e6;

        // 2. Calculate Jevons price rebound
        let priceMultiplier = 1.0;
        if (cheapestLCOE < reboundParams.cheapEnergyThreshold) {
            const delta = reboundParams.cheapEnergyThreshold - cheapestLCOE;
            priceMultiplier = 1 + (delta * reboundParams.cheapEnergyElasticity);
            priceMultiplier = Math.min(priceMultiplier, reboundParams.maxReboundMultiplier);
        }

        // 3. Combined adjustment: add robot load, then apply price multiplier
        const adjustedDemand = (baseDemandTWh + robotLoadTWh) * priceMultiplier;

        return {
            adjustedDemand,
            robotLoadTWh,
            priceMultiplier,
            robotsPer1000
        };
    }

    // =============================================================================
    // SIMULATION ENGINE
    // =============================================================================

    function runSimulation(params = {}) {
        const carbonPrice = params.carbonPrice ?? defaults.carbonPrice;
        const solarAlpha = params.solarAlpha ?? 0.36;  // Farmer/Naam calibrated
        const solarGrowth = params.solarGrowth ?? 0.25;
        const electrificationTarget = params.electrificationTarget ?? 0.65;
        const efficiencyMultiplier = params.efficiencyMultiplier ?? 1.0;
        const climSensitivity = params.climSensitivity ?? climateParams.climSensitivity;

        // Generate years array
        const years = [];
        for (let year = 2025; year <= 2100; year++) {
            years.push(year);
        }

        // Run demographics and demand models first (they don't depend on capacity state)
        const demographicsData = runDemographics();
        const demandData = runDemandModel(demographicsData, {
            electrificationTarget,
            efficiencyMultiplier
        });

        // =============================================================================
        // CAPACITY STATE INITIALIZATION
        // =============================================================================

        // Initialize capacity state with 2025 baseline values
        const capacityState = initializeCapacityState();

        // Results arrays (LCOEs)
        const results = {
            solar: [],
            wind: [],
            gas: [],
            coal: [],
            nuclear: [],
            battery: [],
            solarPlusBattery: []
        };

        // =============================================================================
        // CLIMATE MODULE - Dispatch, emissions, and damages
        // =============================================================================

        // Initialize climate tracking
        const climate = {
            emissions: [],              // Annual Gt CO₂
            electricityEmissions: [],   // Gt from electricity
            nonElecEmissions: [],       // Gt from non-electricity
            cumulative: [],             // Cumulative Gt CO₂
            co2ppm: [],                 // Atmospheric CO₂ concentration
            temperature: [],            // °C above preindustrial
            globalDamages: [],          // % GDP
            regionalDamages: { oecd: [], china: [], em: [], row: [] },
            netGdp: { global: [], oecd: [], china: [], em: [], row: [] }
        };

        // Dispatch results
        const dispatchData = {
            solar: [],
            solarPlusBattery: [],
            wind: [],
            hydro: [],
            gas: [],
            coal: [],
            nuclear: [],
            total: [],
            gridIntensity: [],
            // Rebound effect tracking
            robotLoadTWh: [],
            priceMultiplier: [],
            adjustedDemand: [],
            robotsPer1000: []
        };

        // Climate and EROEI state variables
        let cumulativeEmissions = climateParams.cumulativeCO2_2025;
        let currentTemp = climateParams.currentTemp;
        let peakEmissionsYear = 2025;
        let peakEmissionsValue = -Infinity;
        let gasExtracted = 0;
        let coalExtracted = 0;

        // Track previous year's demand for growth cap
        let prevAdjustedDemand = demandData.global.electricityDemand[0];

        // =============================================================================
        // MAIN SIMULATION LOOP - Year by year with state propagation
        // =============================================================================

        for (let i = 0; i < years.length; i++) {
            const year = years[i];

            // -----------------------------------------------------------------
            // 1. Get ACTUAL capacities from state (not projected from growth curves)
            // -----------------------------------------------------------------
            const capacities = getCapacityFromState(capacityState, i);

            // -----------------------------------------------------------------
            // 2. Calculate LCOEs using ACTUAL cumulative capacity
            //    This creates the key feedback loop: constrained deployment →
            //    slower learning → higher LCOE
            // -----------------------------------------------------------------

            // Solar: learning curve based on actual installed capacity
            const solarCumulative = capacityState.solar.installed[i] / energySources.solar.capacity2025;
            const solarLCOE = learningCurve(energySources.solar.cost0, solarCumulative, solarAlpha);
            results.solar.push(solarLCOE);

            // Wind: learning curve based on actual capacity
            const windCumulative = capacityState.wind.installed[i] / energySources.wind.capacity2025;
            const windLCOE = learningCurve(energySources.wind.cost0, windCumulative, energySources.wind.alpha);
            results.wind.push(windLCOE);

            // Gas: EROEI depletion + carbon price
            gasExtracted += energySources.gas.extractionRate;
            const gasDepletion = depletion(
                energySources.gas.reserves,
                gasExtracted,
                energySources.gas.eroei0
            );
            const gasBaseCost = energySources.gas.cost0 * (energySources.gas.eroei0 / gasDepletion.eroei);
            const gasCarbonCost = (energySources.gas.carbonIntensity / 1000) * carbonPrice;
            const gasLCOE = gasBaseCost + gasCarbonCost;
            results.gas.push(gasLCOE);

            // Coal: EROEI depletion + carbon price
            coalExtracted += energySources.coal.extractionRate;
            const coalDepletion = depletion(
                energySources.coal.reserves,
                coalExtracted,
                energySources.coal.eroei0
            );
            const coalBaseCost = energySources.coal.cost0 * (energySources.coal.eroei0 / coalDepletion.eroei);
            const coalCarbonCost = (energySources.coal.carbonIntensity / 1000) * carbonPrice;
            const coalLCOE = coalBaseCost + coalCarbonCost;
            results.coal.push(coalLCOE);

            // Nuclear: essentially flat (no learning in current environment)
            const nuclearCumulative = capacityState.nuclear.installed[i] / energySources.nuclear.capacity2025;
            const nuclearLCOE = learningCurve(energySources.nuclear.cost0, nuclearCumulative, energySources.nuclear.alpha);
            results.nuclear.push(nuclearLCOE);

            // Battery: learning curve based on actual capacity (GWh)
            const batteryCumulative = capacityState.battery.installed[i] / energySources.battery.capacity2025;
            const batteryCost = learningCurve(energySources.battery.cost0, batteryCumulative, energySources.battery.alpha);
            results.battery.push(batteryCost);

            // Solar + Battery: combined cost for dispatchable clean energy
            const batteryLCOE = (batteryCost * 4) / (365 * 15);
            results.solarPlusBattery.push(solarLCOE + batteryLCOE * 1000);

            // Build LCOE object for dispatch
            const lcoes = {
                solar: solarLCOE,
                solarPlusBattery: results.solarPlusBattery[i],
                wind: windLCOE,
                gas: gasLCOE,
                coal: coalLCOE,
                nuclear: nuclearLCOE
            };

            // -----------------------------------------------------------------
            // 3. Calculate rebound demand (Jevons + robot energy)
            // -----------------------------------------------------------------
            const baseDemandTWh = demandData.global.electricityDemand[i];
            const cheapestLCOE = Math.min(lcoes.solar, lcoes.wind);
            const globalWorkers = demographicsData.global.working[i];
            const rebound = calculateReboundDemand(baseDemandTWh, cheapestLCOE, year, globalWorkers);

            // Apply infrastructure growth cap
            const maxDemand = prevAdjustedDemand * (1 + reboundParams.maxDemandGrowthRate);
            const demandTWh = Math.min(rebound.adjustedDemand, maxDemand);
            prevAdjustedDemand = demandTWh;

            // -----------------------------------------------------------------
            // 4. Dispatch sources to meet demand
            // -----------------------------------------------------------------
            const dispatchResult = dispatch(demandTWh, lcoes, capacities);

            // Store dispatch results
            dispatchData.solar.push(dispatchResult.solar);
            dispatchData.solarPlusBattery.push(dispatchResult.solarPlusBattery);
            dispatchData.wind.push(dispatchResult.wind);
            dispatchData.hydro.push(dispatchResult.hydro);
            dispatchData.gas.push(dispatchResult.gas);
            dispatchData.coal.push(dispatchResult.coal);
            dispatchData.nuclear.push(dispatchResult.nuclear);
            dispatchData.total.push(dispatchResult.total);
            dispatchData.gridIntensity.push(dispatchResult.gridIntensity);

            // Store rebound metrics
            dispatchData.robotLoadTWh.push(rebound.robotLoadTWh);
            dispatchData.priceMultiplier.push(rebound.priceMultiplier);
            dispatchData.adjustedDemand.push(demandTWh);
            dispatchData.robotsPer1000.push(rebound.robotsPer1000);

            // -----------------------------------------------------------------
            // 5. Calculate emissions and update climate
            // -----------------------------------------------------------------
            const electrificationRate = demandData.global.electrificationRate[i];
            const emissionsResult = calculateEmissions(dispatchResult, electrificationRate);

            climate.emissions.push(emissionsResult.total);
            climate.electricityEmissions.push(emissionsResult.electricity);
            climate.nonElecEmissions.push(emissionsResult.nonElectricity);

            if (emissionsResult.total > peakEmissionsValue) {
                peakEmissionsValue = emissionsResult.total;
                peakEmissionsYear = year;
            }

            cumulativeEmissions += emissionsResult.total;
            climate.cumulative.push(cumulativeEmissions);

            const climateState = updateClimate(cumulativeEmissions, currentTemp, climSensitivity);
            currentTemp = climateState.temperature;

            climate.co2ppm.push(climateState.co2ppm);
            climate.temperature.push(climateState.temperature);

            // Calculate damages by region
            let globalGrosGdp = 0;
            let globalNetGdp = 0;

            for (const region of ['oecd', 'china', 'em', 'row']) {
                const damage = climateDamages(currentTemp, region);
                climate.regionalDamages[region].push(damage * 100);

                const grossGdp = demandData.regions[region].gdp[i];
                const netGdp = grossGdp * (1 - damage);
                climate.netGdp[region].push(netGdp);

                globalGrosGdp += grossGdp;
                globalNetGdp += netGdp;
            }

            const globalDamage = 1 - (globalNetGdp / globalGrosGdp);
            climate.globalDamages.push(globalDamage * 100);
            climate.netGdp.global.push(globalNetGdp);

            // -----------------------------------------------------------------
            // 6. Update capacity state for NEXT year
            // -----------------------------------------------------------------
            if (i < years.length - 1) {
                // Estimate investment from GDP for investment constraint
                // This is a simplified proxy: investment ≈ 22% of GDP × stability factor
                // Using current year's GDP as proxy for next year's investment (lag structure)
                const stabilityFactor = 1 / (1 + capitalParams.stabilityLambda * Math.pow(globalDamage, 2));
                const estimatedInvestment = demandData.global.gdp[i] * 0.22 * stabilityFactor;

                updateCapacityState(capacityState, i + 1, demandTWh, { solarGrowth }, estimatedInvestment);
            }
        }

        // Store climate metrics
        climate.metrics = {
            peakEmissionsYear,
            peakEmissionsValue,
            warming2100: climate.temperature[climate.temperature.length - 1],
            damages2075: climate.globalDamages[years.indexOf(2075)],
            gridIntensity2025: dispatchData.gridIntensity[0]
        };

        // =============================================================================
        // CAPITAL MODULE - Savings, investment, and automation
        // =============================================================================

        const capitalData = runCapitalModel(demographicsData, demandData, climate);

        // =============================================================================
        // RESOURCE MODULE - Minerals, food, and land demand
        // =============================================================================

        const resourceData = runResourceModel(demographicsData, demandData, dispatchData, capacityState);

        return {
            years,
            results,
            demographics: demographicsData,
            demand: demandData,
            climate,
            dispatch: dispatchData,
            capital: capitalData,
            resources: resourceData,
            capacityState  // NEW: Include capacity state in output
        };
    }

    function findCrossovers(years, results) {
        const crossovers = [];

        // Solar crosses gas
        for (let i = 1; i < years.length; i++) {
            if (results.solar[i] < results.gas[i] && results.solar[i-1] >= results.gas[i-1]) {
                crossovers.push({
                    year: years[i],
                    event: 'Solar LCOE falls below Gas',
                    detail: `Solar: $${results.solar[i].toFixed(0)}/MWh vs Gas: $${results.gas[i].toFixed(0)}/MWh`
                });
                break;
            }
        }

        // Solar+Battery crosses gas
        for (let i = 1; i < years.length; i++) {
            if (results.solarPlusBattery[i] < results.gas[i] && results.solarPlusBattery[i-1] >= results.gas[i-1]) {
                crossovers.push({
                    year: years[i],
                    event: 'Solar+Battery beats Gas (dispatchable clean)',
                    detail: `Solar+Batt: $${results.solarPlusBattery[i].toFixed(0)}/MWh vs Gas: $${results.gas[i].toFixed(0)}/MWh`
                });
                break;
            }
        }

        // Coal becomes uneconomic (more expensive than cheapest clean)
        for (let i = 1; i < years.length; i++) {
            const cheapestClean = Math.min(results.solar[i], results.wind[i]);
            const cheapestCleanPrev = Math.min(results.solar[i-1], results.wind[i-1]);
            if (results.coal[i] > cheapestClean && results.coal[i-1] <= cheapestCleanPrev) {
                crossovers.push({
                    year: years[i],
                    event: 'Coal becomes more expensive than cheapest clean',
                    detail: `Coal: $${results.coal[i].toFixed(0)}/MWh vs Clean: $${cheapestClean.toFixed(0)}/MWh`
                });
                break;
            }
        }

        // Wind crosses gas
        for (let i = 1; i < years.length; i++) {
            if (results.wind[i] < results.gas[i] && results.wind[i-1] >= results.gas[i-1]) {
                crossovers.push({
                    year: years[i],
                    event: 'Wind LCOE falls below Gas',
                    detail: `Wind: $${results.wind[i].toFixed(0)}/MWh vs Gas: $${results.gas[i].toFixed(0)}/MWh`
                });
                break;
            }
        }

        return crossovers;
    }

    /**
     * Run a scenario and return key metrics as a flat object
     * Convenience wrapper for headless/programmatic use
     *
     * @param {Object} params - Same as runSimulation params (uses defaults if omitted)
     * @returns {Object} Key metrics: crossovers, peakEmissions, warming2100, elec2050, etc.
     */
    function runScenario(params = {}) {
        const mergedParams = { ...defaults, ...params };
        const simData = runSimulation(mergedParams);
        const { years, results, demographics, demand, climate, dispatch, capital, resources } = simData;
        const crossovers = findCrossovers(years, results);
        const derived = computeDerivedSeries(simData);

        const idx2050 = years.indexOf(2050);
        const idx2075 = years.indexOf(2075);
        const idx2100 = years.length - 1;

        // Find regional crossovers
        const chinaElecCrossesOECD = query.crossover(simData,
            'demand.regions.china.electricityDemand',
            'demand.regions.oecd.electricityDemand'
        );
        const emElecCrossesChina = query.crossover(simData,
            'demand.regions.em.electricityDemand',
            'demand.regions.china.electricityDemand'
        );

        // Find per-capita crossovers (using crossoverArrays for derived series)
        const chinaPerCapCrossover = query.crossoverArrays(
            years,
            derived.perCapita.electricity.china,
            derived.perCapita.electricity.oecd
        );
        const chinaPerCapCrossesOECD = chinaPerCapCrossover?.year ?? null;

        // Grid intensity thresholds
        const gridBelow200 = query.gridIntensityBelow(simData, 200);
        const gridBelow100 = query.gridIntensityBelow(simData, 100);
        const gridBelow50 = query.gridIntensityBelow(simData, 50);

        return {
            // Input parameters used
            params: mergedParams,

            // Energy crossovers (LCOE)
            solarCrossesGas: crossovers.find(c => c.event.includes('Solar LCOE'))?.year ?? null,
            solarBatteryCrossesGas: crossovers.find(c => c.event.includes('Solar+Battery'))?.year ?? null,
            coalUneconomic: crossovers.find(c => c.event.includes('Coal'))?.year ?? null,
            windCrossesGas: crossovers.find(c => c.event.includes('Wind LCOE'))?.year ?? null,

            // Regional electricity crossovers
            chinaElecCrossesOECD: chinaElecCrossesOECD?.year ?? null,
            emElecCrossesChina: emElecCrossesChina?.year ?? null,

            // Per-capita crossovers
            chinaPerCapElecCrossesOECD: chinaPerCapCrossesOECD,

            // Grid intensity thresholds (year when grid falls below X kg CO₂/MWh)
            gridBelow200: gridBelow200,
            gridBelow100: gridBelow100,
            gridBelow50: gridBelow50,

            // Climate metrics
            peakEmissionsYear: climate.metrics.peakEmissionsYear,
            peakEmissionsGt: climate.metrics.peakEmissionsValue,
            warming2100: climate.metrics.warming2100,               // °C
            damages2075: climate.metrics.damages2075,               // % GDP
            damages2100: climate.globalDamages[idx2100],            // % GDP
            gridIntensity2025: climate.metrics.gridIntensity2025,   // kg CO₂/MWh
            gridIntensity2050: dispatch.gridIntensity[idx2050],     // kg CO₂/MWh
            gridIntensity2100: dispatch.gridIntensity[idx2100],     // kg CO₂/MWh
            emissions2025: climate.emissions[0],                    // Gt CO₂
            emissions2050: climate.emissions[idx2050],              // Gt CO₂
            emissions2100: climate.emissions[idx2100],              // Gt CO₂

            // Demand metrics
            elec2025: demand.global.electricityDemand[0],           // TWh
            elec2050: demand.global.electricityDemand[idx2050],     // TWh
            elec2100: demand.global.electricityDemand[idx2100],     // TWh
            electrification2050: demand.global.electrificationRate[idx2050], // fraction

            // Per-capita metrics (kWh/person)
            elecPerCapita2025: derived.global.electricityPerCapita[0],
            elecPerCapita2050: derived.global.electricityPerCapita[idx2050],
            elecPerCapita2100: derived.global.electricityPerCapita[idx2100],

            // Regional per-capita electricity 2050 (kWh/person)
            elecPerCapita2050_oecd: derived.perCapita.electricity.oecd[idx2050],
            elecPerCapita2050_china: derived.perCapita.electricity.china[idx2050],
            elecPerCapita2050_em: derived.perCapita.electricity.em[idx2050],
            elecPerCapita2050_row: derived.perCapita.electricity.row[idx2050],

            // Demographics metrics
            popPeakYear: findPopulationPeak(demographics.global.population, demographics.years).year,
            pop2100: demographics.global.population[idx2100],
            dependency2075: demographics.global.dependency[idx2075],

            // Education metrics
            chinaCollegePeakYear: findPopulationPeak(demographics.regions.china.workingCollege, demographics.years).year,
            collegeShare2025: demographics.global.collegeShare[0],
            collegeShare2050: demographics.global.collegeShare[idx2050],
            collegeShare2100: demographics.global.collegeShare[idx2100],
            chinaCollegeShare2025: demographics.regions.china.collegeShare[0],
            chinaCollegeShare2050: demographics.regions.china.collegeShare[idx2050],

            // Capital metrics
            kY2025: capital.metrics.kY2025,                             // K/Y ratio
            kY2050: capital.metrics.kY2050,
            interestRate2025: capital.metrics.interestRate2025,         // Real interest rate
            interestRate2050: capital.metrics.interestRate2050,
            robotsDensity2025: capital.metrics.robotsDensity2025,       // Robots per 1000 workers
            robotsDensity2050: capital.metrics.robotsDensity2050,
            robotsDensity2100: capital.metrics.robotsDensity2100,
            savingsRate2025: capital.metrics.savingsRate2025,           // Aggregate savings rate
            savingsRate2075: capital.metrics.savingsRate2075,
            capitalStock2025: capital.stock[0],                         // $ trillions
            capitalStock2100: capital.stock[idx2100],
            kPerWorker2025: capital.kPerWorker[0],                      // $K per effective worker
            kPerWorker2100: capital.kPerWorker[idx2100],

            // Rebound effect metrics (Jevons paradox)
            reboundMultiplier2050: dispatch.priceMultiplier[idx2050],   // Price rebound multiplier
            reboundMultiplier2100: dispatch.priceMultiplier[idx2100],
            robotLoadTWh2050: dispatch.robotLoadTWh[idx2050],           // Robot energy load (TWh)
            robotLoadTWh2100: dispatch.robotLoadTWh[idx2100],
            adjustedDemand2050: dispatch.adjustedDemand[idx2050],       // Demand with rebound (TWh)
            adjustedDemand2100: dispatch.adjustedDemand[idx2100],
            robotsPer10002050: dispatch.robotsPer1000[idx2050],         // Robots per 1000 workers
            robotsPer10002100: dispatch.robotsPer1000[idx2100],

            // Resource metrics - Minerals
            copperPeakYear: resources.metrics.copperPeakYear,
            copperPeakDemand: resources.metrics.copperPeakDemand,       // Mt/year
            copperCumulative2050: resources.metrics.copperCumulative2050, // Mt
            copperCumulative2100: resources.metrics.copperCumulative2100,
            copperReserveRatio2050: resources.metrics.copperReserveRatio2050,
            copperReserveRatio2100: resources.metrics.copperReserveRatio2100,
            lithiumPeakYear: resources.metrics.lithiumPeakYear,
            lithiumPeakDemand: resources.metrics.lithiumPeakDemand,     // Mt/year
            lithiumCumulative2050: resources.metrics.lithiumCumulative2050,
            lithiumCumulative2100: resources.metrics.lithiumCumulative2100,
            lithiumReserveRatio2050: resources.metrics.lithiumReserveRatio2050,
            lithiumReserveRatio2100: resources.metrics.lithiumReserveRatio2100,

            // Resource metrics - Food
            proteinShare2050: resources.metrics.proteinShare2050,       // fraction
            proteinShare2100: resources.metrics.proteinShare2100,
            glp1Effect2050: resources.metrics.glp1Effect2050,           // fraction calorie reduction
            grainDemand2050: resources.metrics.grainDemand2050,         // Mt/year
            grainDemand2100: resources.metrics.grainDemand2100,

            // Resource metrics - Land
            farmland2025: resources.metrics.farmland2025,               // Mha
            farmland2050: resources.metrics.farmland2050,
            farmland2100: resources.metrics.farmland2100,
            farmlandChange: resources.metrics.farmlandChange,           // fraction change
            urban2050: resources.metrics.urban2050,                     // Mha
            forest2100: resources.metrics.forest2100,                   // Mha
            forestLoss: resources.metrics.forestLoss,                   // fraction lost

            // Derived series (for further analysis)
            derived,

            // Full data (if needed for deeper analysis)
            _fullData: simData
        };
    }

    /**
     * Export full simulation data as JSON
     * @param {Object} params - Same as runSimulation params
     * @returns {string} JSON string of full simulation results
     */
    function exportJSON(params = {}) {
        const mergedParams = { ...defaults, ...params };
        const data = runSimulation(mergedParams);
        const crossovers = findCrossovers(data.years, data.results);

        return JSON.stringify({
            params: mergedParams,
            years: data.years,
            lcoe: data.results,
            demographics: {
                years: data.demographics.years,
                global: data.demographics.global,
                regions: data.demographics.regions
            },
            demand: {
                global: data.demand.global,
                regions: data.demand.regions,
                metrics: data.demand.metrics
            },
            climate: data.climate,
            dispatch: data.dispatch,
            capital: data.capital,
            resources: data.resources,
            crossovers
        }, null, 2);
    }

    // =============================================================================
    // UNITS MAP - Canonical unit definitions
    // =============================================================================

    /**
     * Units map for all simulation outputs
     * Use energySim.units to check units for any series
     */
    const units = {
        // Energy costs
        lcoe: { unit: '$/MWh', description: 'Levelized cost of energy' },
        batteryCost: { unit: '$/kWh', description: 'Battery storage cost' },

        // Electricity
        electricityDemand: { unit: 'TWh', description: 'Annual electricity demand' },
        electricityPerWorking: { unit: 'kWh/person', description: 'Electricity per working-age adult' },
        electricityPerCapita: { unit: 'kWh/person', description: 'Electricity per capita' },
        generation: { unit: 'TWh', description: 'Electricity generation by source' },

        // GDP
        gdp: { unit: '$ trillions', description: 'Regional GDP' },
        gdpPerWorking: { unit: '$/person', description: 'GDP per working-age adult' },
        gdpPerCapita: { unit: '$/person', description: 'GDP per capita' },

        // Population
        population: { unit: 'persons', description: 'Absolute population count' },

        // Climate
        emissions: { unit: 'Gt CO₂/year', description: 'Annual CO₂ emissions' },
        cumulative: { unit: 'Gt CO₂', description: 'Cumulative CO₂ since preindustrial' },
        gridIntensity: { unit: 'kg CO₂/MWh', description: 'Grid carbon intensity' },
        temperature: { unit: '°C', description: 'Temperature above preindustrial' },
        co2ppm: { unit: 'ppm', description: 'Atmospheric CO₂ concentration' },

        // Damages and rates
        damages: { unit: '% GDP', description: 'Climate damages as percent of GDP' },
        dependency: { unit: 'ratio', description: 'Old-age dependency ratio (65+/20-64)' },
        electrificationRate: { unit: 'fraction', description: 'Electricity share of useful energy' },
        energyIntensity: { unit: 'MWh/$1000 GDP', description: 'Energy intensity of economy' },
        fertility: { unit: 'TFR', description: 'Total fertility rate (children per woman)' },

        // Education
        collegeShare: { unit: 'fraction', description: 'Fraction of workers with college degree' },
        enrollmentRate: { unit: 'fraction', description: 'Tertiary education enrollment rate' },
        wagePremium: { unit: 'multiplier', description: 'College wage premium (1.5 = 50% higher wages)' },
        effectiveWorkers: { unit: 'persons', description: 'Productivity-weighted worker count (nonCollege + college × premium)' },
        workingCollege: { unit: 'persons', description: 'Working-age adults with college degree' },
        workingNonCollege: { unit: 'persons', description: 'Working-age adults without college degree' },

        // Capital
        capitalStock: { unit: '$ trillions', description: 'Total capital stock' },
        investment: { unit: '$ trillions', description: 'Annual investment' },
        savingsRate: { unit: 'fraction', description: 'Aggregate savings rate (demographic-weighted)' },
        stability: { unit: 'fraction', description: 'Galbraith/Chen stability factor (0-1)' },
        interestRate: { unit: 'fraction', description: 'Real interest rate (r = αY/K - δ)' },
        robotsDensity: { unit: 'robots/1000 workers', description: 'Robots per 1000 effective workers' },
        kPerWorker: { unit: '$K/person', description: 'Capital per effective worker (thousands of dollars)' },
        kYRatio: { unit: 'ratio', description: 'Capital-to-output ratio (K/Y)' },

        // Resources - Minerals
        mineralDemand: { unit: 'Mt/year', description: 'Annual mineral demand (net of recycling)' },
        mineralCumulative: { unit: 'Mt', description: 'Cumulative mineral extraction' },
        mineralIntensity: { unit: 'fraction', description: 'Intensity factor relative to 2025 (0-1)' },
        reserveRatio: { unit: 'fraction', description: 'Cumulative demand / known reserves' },
        recyclingRate: { unit: 'fraction', description: 'Recycling rate (0-1)' },

        // Resources - Food
        caloriesPerCapita: { unit: 'kcal/person/day', description: 'Daily calorie consumption per capita' },
        totalCalories: { unit: 'Pcal/year', description: 'Global annual calorie demand (petacalories)' },
        proteinShare: { unit: 'fraction', description: 'Fraction of calories from protein' },
        grainEquivalent: { unit: 'Mt/year', description: 'Grain equivalent demand (direct + feed)' },
        glp1Adoption: { unit: 'fraction', description: 'Population fraction using GLP-1 drugs' },
        glp1Effect: { unit: 'fraction', description: 'Aggregate calorie reduction from GLP-1' },

        // Resources - Land
        farmland: { unit: 'Mha', description: 'Cropland area (million hectares)' },
        urban: { unit: 'Mha', description: 'Urban land area' },
        forest: { unit: 'Mha', description: 'Forest area' },
        yield: { unit: 't/ha', description: 'Crop yield (tonnes per hectare)' }
    };

    // =============================================================================
    // QUERY HELPERS - Time series analysis utilities
    // =============================================================================

    /**
     * Get array from dot-notation path in simulation data
     * @param {Object} data - Simulation data object
     * @param {string} path - Dot-notation path (e.g., 'demand.regions.china.electricityDemand')
     * @returns {Array} The array at the specified path
     */
    function getSeriesFromPath(data, path) {
        const parts = path.split('.');
        let current = data;
        for (const part of parts) {
            if (current === undefined || current === null) return null;
            current = current[part];
        }
        return Array.isArray(current) ? current : null;
    }

    /**
     * Query helpers for time series analysis
     */
    const query = {
        /**
         * Find first year where condition is met
         * @param {Object} options
         * @param {Object} options.data - Simulation data (from runSimulation or runScenario._fullData)
         * @param {string} options.series - Dot-notation path to series
         * @param {string} [options.gt] - Path to series that must be less than main series
         * @param {string} [options.lt] - Path to series that must be greater than main series
         * @param {number} [options.above] - Threshold value that must be exceeded
         * @param {number} [options.below] - Threshold value that must not be exceeded
         * @returns {number|null} Year when condition first met, or null
         */
        firstYear(options) {
            const { data, series, gt, lt, above, below } = options;
            const years = data.years || data.demographics?.years;
            const mainSeries = getSeriesFromPath(data, series);

            if (!years || !mainSeries) return null;

            const compareSeries = gt ? getSeriesFromPath(data, gt) : lt ? getSeriesFromPath(data, lt) : null;

            for (let i = 0; i < years.length; i++) {
                const val = mainSeries[i];
                let conditionMet = true;

                if (gt && compareSeries) conditionMet = conditionMet && val > compareSeries[i];
                if (lt && compareSeries) conditionMet = conditionMet && val < compareSeries[i];
                if (above !== undefined) conditionMet = conditionMet && val > above;
                if (below !== undefined) conditionMet = conditionMet && val < below;

                if (conditionMet) return years[i];
            }
            return null;
        },

        /**
         * Find crossover year between two series
         * @param {Object} data - Simulation data
         * @param {string} series1 - Path to first series (the one crossing over)
         * @param {string} series2 - Path to second series (being crossed)
         * @returns {Object|null} { year, values: { series1, series2 } } or null
         */
        crossover(data, series1, series2) {
            const years = data.years || data.demographics?.years;
            const s1 = getSeriesFromPath(data, series1);
            const s2 = getSeriesFromPath(data, series2);

            if (!years || !s1 || !s2) return null;

            for (let i = 1; i < years.length; i++) {
                // series1 crosses above series2
                if (s1[i] > s2[i] && s1[i - 1] <= s2[i - 1]) {
                    return {
                        year: years[i],
                        direction: 'above',
                        values: { series1: s1[i], series2: s2[i] }
                    };
                }
                // series1 crosses below series2
                if (s1[i] < s2[i] && s1[i - 1] >= s2[i - 1]) {
                    return {
                        year: years[i],
                        direction: 'below',
                        values: { series1: s1[i], series2: s2[i] }
                    };
                }
            }
            return null;
        },

        /**
         * Get value at specific year
         * @param {Object} data - Simulation data
         * @param {string} series - Path to series
         * @param {number} year - Year to look up
         * @returns {number|null} Value at year or null
         */
        valueAt(data, series, year) {
            const years = data.years || data.demographics?.years;
            const s = getSeriesFromPath(data, series);
            if (!years || !s) return null;

            const idx = years.indexOf(year);
            return idx >= 0 ? s[idx] : null;
        },

        /**
         * Get per-capita series for a region
         * @param {Object} data - Simulation data
         * @param {string} region - Region key (oecd, china, em, row)
         * @param {string} metric - 'electricity' or 'gdp'
         * @returns {Array} Per-capita values
         */
        perCapita(data, region, metric = 'electricity') {
            const pop = getSeriesFromPath(data, `demographics.regions.${region}.population`);
            let values;

            if (metric === 'electricity') {
                values = getSeriesFromPath(data, `demand.regions.${region}.electricityDemand`);
                // Convert TWh to kWh: TWh × 1e9 / population
                return pop && values ? values.map((v, i) => (v * 1e9) / pop[i]) : null;
            } else if (metric === 'gdp') {
                values = getSeriesFromPath(data, `demand.regions.${region}.gdp`);
                // Convert $ trillions to $: $T × 1e12 / population
                return pop && values ? values.map((v, i) => (v * 1e12) / pop[i]) : null;
            }
            return null;
        },

        /**
         * Find year when grid intensity falls below threshold
         * @param {Object} data - Simulation data
         * @param {number} threshold - kg CO₂/MWh threshold (default: 100 for "clean grid")
         * @returns {number|null} Year when threshold crossed
         */
        gridIntensityBelow(data, threshold = 100) {
            return this.firstYear({
                data,
                series: 'dispatch.gridIntensity',
                below: threshold
            });
        },

        /**
         * Find all crossovers between regions for a metric
         * @param {Object} data - Simulation data
         * @param {string} metric - Path template with {region} placeholder
         * @param {string} region1 - First region
         * @param {string} region2 - Second region
         * @returns {Object|null} Crossover info or null
         */
        regionCrossover(data, metric, region1, region2) {
            const path1 = metric.replace('{region}', region1);
            const path2 = metric.replace('{region}', region2);
            return this.crossover(data, path1, path2);
        },

        /**
         * Find crossover year between two pre-computed arrays
         * Useful for derived series (e.g., per-capita data) that aren't in the main data object
         * @param {Array} years - Array of years
         * @param {Array} arr1 - First array (the one crossing over)
         * @param {Array} arr2 - Second array (being crossed)
         * @returns {Object|null} { year, direction, values: { arr1, arr2 } } or null
         */
        crossoverArrays(years, arr1, arr2) {
            if (!years || !arr1 || !arr2) return null;

            for (let i = 1; i < years.length; i++) {
                if (arr1[i] > arr2[i] && arr1[i - 1] <= arr2[i - 1]) {
                    return {
                        year: years[i],
                        direction: 'above',
                        values: { arr1: arr1[i], arr2: arr2[i] }
                    };
                }
                if (arr1[i] < arr2[i] && arr1[i - 1] >= arr2[i - 1]) {
                    return {
                        year: years[i],
                        direction: 'below',
                        values: { arr1: arr1[i], arr2: arr2[i] }
                    };
                }
            }
            return null;
        }
    };

    // =============================================================================
    // DERIVED SERIES - Pre-computed per-capita and other derived metrics
    // =============================================================================

    /**
     * Compute derived series (per-capita metrics, etc.)
     * @param {Object} simData - Output from runSimulation
     * @returns {Object} Derived series
     */
    function computeDerivedSeries(simData) {
        const { years, demographics, demand, climate, dispatch } = simData;
        const regions = ['oecd', 'china', 'em', 'row'];

        const derived = {
            years,
            perCapita: {
                electricity: {},  // kWh/person by region
                gdp: {}           // $/person by region
            },
            global: {
                electricityPerCapita: [],  // kWh/person
                gdpPerCapita: []           // $/person
            }
        };

        // Compute regional per-capita
        for (const region of regions) {
            const pop = demographics.regions[region].population;
            const elec = demand.regions[region].electricityDemand;
            const gdp = demand.regions[region].gdp;

            derived.perCapita.electricity[region] = elec.map((e, i) => (e * 1e9) / pop[i]);
            derived.perCapita.gdp[region] = gdp.map((g, i) => (g * 1e12) / pop[i]);
        }

        // Compute global per-capita
        for (let i = 0; i < years.length; i++) {
            const globalPop = demographics.global.population[i];
            const globalElec = demand.global.electricityDemand[i];
            const globalGdp = demand.global.gdp[i];

            derived.global.electricityPerCapita.push((globalElec * 1e9) / globalPop);
            derived.global.gdpPerCapita.push((globalGdp * 1e12) / globalPop);
        }

        return derived;
    }

    // =============================================================================
    // VISUALIZATION (Browser-only)

// =============================================================================
// MODULE EXPORTS
// =============================================================================

/**
 * Public API for programmatic access
 * See energySim.units for canonical unit definitions.
 */
const energySim = {
    // Primitives
    compound,
    learningCurve,
    depletion,
    logistic,
    poissonShock,

    // Simulation (full runs)
    runSimulation,        // Full simulation, returns { years, results, demographics, demand, climate, dispatch, capital, resources, capacityState }
    runScenario,          // Convenience wrapper, returns flat metrics object + derived series
    exportJSON,           // Export full run as JSON string

    // Query helpers (time series analysis)
    query,                // { firstYear, crossover, valueAt, perCapita, gridIntensityBelow, regionCrossover }
    computeDerivedSeries, // Compute per-capita and other derived metrics

    // Sub-models
    runDemographics,
    runDemandModel,
    findCrossovers,
    findPopulationPeak,
    exportDemographicsCSV,
    projectFertility,

    // Education functions
    projectEnrollmentRate,  // Enrollment rate by year
    projectWagePremium,     // Wage premium decay over time
    effectiveWorkers,       // Productivity-weighted worker count

    // Climate functions
    dispatch,             // Merit order dispatch
    getCapacities,        // GW capacity by year (projection, for backward compatibility)
    calculateEmissions,   // Returns { electricity, nonElectricity, total } in Gt CO₂
    updateClimate,        // Returns { co2ppm, equilibriumTemp, temperature }
    climateDamages,       // Returns damage fraction (0-0.30)

    // Capacity state functions (state-machine architecture)
    initializeCapacityState,  // Create initial state from 2025 values
    updateCapacityState,      // Update state for next year with constraints
    getCapacityFromState,     // Extract capacity snapshot from state
    calculateMaxUsefulCapacity, // Max useful capacity based on demand
    calculateInvestmentCapacity, // Max additions from investment budget
    calculateRetirement,      // Asset retirement based on lifetime

    // Capital functions
    runCapitalModel,      // Full capital model: { stock, investment, savingsRate, stability, interestRate, robotsDensity, kPerWorker }
    aggregateSavingsRate, // Demographic-weighted savings rate by region and global
    stabilityFactor,      // Galbraith/Chen stability factor (0-1)
    calculateInvestment,  // Investment = GDP × savingsRate × stability
    updateCapital,        // K_{t+1} = (1-δ)K_t + I_t
    calculateInterestRate,// r = αY/K - δ
    robotsDensity,        // Robots per 1000 workers

    // Resource functions
    runResourceModel,     // Full resource model: { minerals, food, land, metrics }
    mineralDemand,        // Calculate mineral demand for a year
    foodDemand,           // Calculate food demand with Bennett's Law + GLP-1
    landDemand,           // Calculate land use
    recyclingRate,        // Dynamic recycling rate based on stock-in-use

    // Parameters (read-only references)
    energySources,
    demographics,
    educationParams,      // Enrollment, college share, wage premiums, life expectancy differentials
    economicParams,
    demandParams,
    dispatchParams,
    climateParams,
    capitalParams,        // Production, savings, automation parameters
    resourceParams,       // Minerals, food, land parameters
    reboundParams,        // Jevons paradox, robot energy load parameters
    capacityParams,       // Capacity state: growth caps, penetration limits, CAPEX, lifetimes

    // Rebound functions
    calculateReboundDemand,  // Calculate demand adjustment from Jevons + robots

    // Units map
    units,                // Canonical unit definitions for all series

    // Defaults and config
    defaults,             // Default slider values
    config                // Runtime config (set config.quiet = true to suppress warnings)
};

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = energySim;
}

// Browser compatibility (if loaded via script tag)
if (typeof window !== 'undefined') {
    window.energySim = energySim;
}
