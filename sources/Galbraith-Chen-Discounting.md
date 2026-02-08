# Chen & Galbraith: Biophysical Production Theory

## Source
*   **Chen, J. & Galbraith, J.K. (2022).** "Economics: A Biophysical Theory." SSRN 4059583. Derives a complete production theory from thermodynamic principles using the Feynman-Kac formula.

## Mathematical Core

### The Variable Cost Formula
Living systems are non-equilibrium thermodynamic systems that must extract low-entropy resources to compensate for continuous dissipation (Schrodinger, 1944). This can be represented by a lognormal process:

**dS/S = r dt + sigma dz** &nbsp;&nbsp;&nbsp; (1)

where S = resource quantity or product value, r = extraction/growth rate, sigma = dissipation/uncertainty rate.

Via the **Feynman-Kac formula** (mapping stochastic processes to PDEs), setting the discount rate q = r (biological steady-state: growth rate = death rate), and using the initial condition C(0,S) = max(S - K, 0), the expected **variable cost** is:

**C = S N(d1) - K e^{-rT} N(d2)** &nbsp;&nbsp;&nbsp; (10)

where:
*   S = product value, K = fixed cost, sigma = uncertainty, T = project duration, r = discount rate
*   d1 = [ln(S/K) + (r + sigma^2/2)T] / (sigma sqrt(T))
*   d2 = d1 - sigma sqrt(T)
*   N(x) = cumulative standard normal distribution

This takes the same form as the **Black-Scholes formula**, but with reversed time direction: Black-Scholes solves current price from future payoff (reverse thermodynamic); this solves future variable cost from current fixed cost (thermodynamic process).

### Key Properties of the Formula
1.  When K > 0, variable cost C is always less than product value S
2.  When K = 0, C = S — **you must invest in fixed cost before earning any return**
3.  Higher K --> lower C (the fundamental fixed/variable cost tradeoff)
4.  Longer T --> higher C (investment depreciates with time)
5.  Higher sigma --> higher C (uncertainty raises costs)
6.  Lower r --> lower C (cheaper borrowing reduces costs)

### Return Calculations
Net present value: **NPV = T(S - C) - K** &nbsp;&nbsp;&nbsp; (14)

Rate of return: **TS / (K + TC) - 1** &nbsp;&nbsp;&nbsp; (15)

## Major Results

### 1. Fixed Cost and Uncertainty (Figure 1)
In **low uncertainty** environments, increasing fixed cost rapidly reduces variable cost. In **high uncertainty** environments, variable cost barely changes with fixed cost. Therefore:
*   **High fixed cost systems** are effective in stable environments (mature industries, large firms)
*   **Low fixed cost systems** are flexible in volatile environments (startups, innovation)
*   This explains why Microsoft, Apple, Google etc. were started by individuals despite large firms' resources

### 2. Fixed Cost and Market Size (Figure 2)
Higher fixed-cost projects need **larger markets to break even** but earn **higher returns** in large markets. Low fixed-cost projects break even quickly but have flatter return curves. This is the economy of scale.

### 3. Optimal Fixed Cost and Duration (Figures 3, 4)
Both fixed cost and project duration have **inverted-U** relationships with NPV:
*   Too little fixed cost --> high variable cost, low return
*   Too much fixed cost --> can't recoup investment
*   Too short duration --> can't amortize fixed cost
*   Too long duration --> variable/maintenance costs overwhelm returns

**This explains why individual life is finite** — it is higher return to have a finite lifespan and produce offspring than to live forever. Higher fixed-cost systems (larger animals, larger projects) require and tend to have **longer lifespans** (empirical: body size correlates with longevity).

### 4. Intergenerational Resource Transfer
Since project/organism life cannot be infinite, **resource transfer from old to young is a universal necessity**:
*   Old organisms must transfer resources as "seed capital" before the young can earn positive returns
*   "Higher" animals provide more per-offspring investment than "lower" animals
*   Wealthy societies invest more in children before they compete in the market
*   New business projects are subsidized by mature projects' cash flows
*   **The amount and method of resource transfer define the characteristics of a species or society**

### 5. Fixed Cost and Discount Rate (Figure 5)
When discount rates decrease, **high fixed-cost systems benefit more** than low fixed-cost systems. This explains:
*   Poor countries have high lending rates; wealthy countries have low lending rates
*   Wealthy (high fixed-cost) societies invest in expensive credit/legal institutions to maintain low rates
*   The secular decline in interest rates over centuries accompanies rising living standards
*   The **"magnitude effect"** in psychology: small outcomes discounted more than large ones (Thaler, 1981)

### 6. Discount Rate and Duration — Hyperbolic Discounting (Figure 7)
Longer-duration projects require **lower discount rates** to break even. This provides a biophysical explanation for **hyperbolic discounting**: the human mind (and other animals) discount long-duration events at lower rates because that's what's required for long projects to be viable.

### 7. Discount Rate and Uncertainty — "Pushing on a String" (Figure 8)
Reducing discount rates is **much more effective in low-uncertainty environments**. In high-uncertainty environments, variable costs are insensitive to the discount rate. This explains why **low interest rates during crises have little stimulative effect** — "pushing on a string."

### 8. Stability Is Destabilizing (Minsky Formalized)
In a **stable, low-uncertainty** environment, optimal strategy is high fixed cost + long duration. But if uncertainty then spikes (crisis), these systems suffer catastrophic losses because:
*   Their high fixed cost is already committed and cannot be reduced
*   Their long duration locks them into an environment that no longer exists

**Quantitative example (Table 2):** Country A (sigma=30%) optimally invests K=5.8B, T=25 years, NPV=8.5B. Country B (sigma=55%) invests K=2.1B, T=12 years, NPV=2.3B. If sigma jumps to 80% in both: A loses 4.4B, B breaks even. **The formerly stable country suffers more.**

Low interest rate policies amplify this: they encourage high fixed-cost investment that becomes fragile when conditions change (Table 1).

## Relations Among Parameters

### Economy of Scale + Diminishing Returns
Setting sigma = sigma_0 + l*Q (uncertainty increases with output volume due to coordination complexity): return first **increases** with scale (economy of scale), then **decreases** (diminishing returns). Both emerge naturally from a single model.

### Fixed Cost Reducing Uncertainty
Setting sigma = sigma_0 + e^{-lK} (fixed cost can reduce uncertainty — armor, insurance, regulation): return first increases with fixed cost investment, then declines. Applies to unemployment insurance, medical insurance, government guarantees.

### Resource Abundance
Resource quality modeled via uncertainty: sigma = sigma_0 + l*Q, where l represents scarcity. When l is small (abundant cheap resources), optimal strategy is high fixed cost + large output. As resources deplete (l rises), the same high-fixed-cost system's returns decline and eventually turn negative. **Institutional restructuring (lower fixed cost, smaller scale) is then required** — but institutional change is slow, creating the danger of collapse.

## Critique of Neoclassical Theory

### Taxes Are Societal Fixed Cost
Mainstream economics treats taxes as "distortions." Chen & Galbraith: taxes are **the fixed cost of society** — the shared investment that enables positive returns. A society with zero taxes has zero fixed cost investment and therefore zero return (C = S when K = 0). Montesquieu (1748): "In moderate states, there is a compensation for heavy taxes; it is liberty."

### Regulation as Internal Environment Maintenance
Regulation is like body temperature regulation — a **compromise between different parts of the organism**. When a sector escapes regulation ("free market"), it grows rapidly and drains resources from the whole system. "This is what we witnessed in the 2007-2009 financial crisis." Unregulated growth in an organism = cancer.

### Markets Are Concrete, Not Abstract
In this theory, markets have **observable parameters** (size, structure, fixed cost). Small markets have simple structures (village); large markets have sophisticated structures (NYSE). Whether a market "survives" depends on whether it yields positive returns — not on whether it is "efficient" in an abstract sense.

### Cobb-Douglas Rejected
The Cobb-Douglas production function Y = AK^alpha L^{1-alpha}:
*   A (TFP) is "the measure of our ignorance" (Blaug)
*   When alpha -> 0 or 1, output maximizes — implying pure labor or pure capital is optimal (empirically false)
*   Capital K is retained period to period yet treated as consumed in production each period
*   A meta-analysis "emphatically rejects the Cobb-Douglas specification" (Gechert et al., 2021)

### Optimality vs. Tradeoff
There is **no universal measure of fitness or optimality**. High fixed-cost systems win in stability; low fixed-cost systems win in volatility. Since fixed cost is committed upfront while conditions change, **short-term optimization is inconsistent with long-term survival**.

## Implications for the Energy Transition
*   **Solar/Wind** = High Fixed Cost / Low Variable Cost: highly sensitive to discount rate and uncertainty
*   **Fossil Fuels** = Low Fixed Cost / High Variable Cost: less sensitive to discount rate
*   **The Climate Catch-22:** If climate change raises systemic uncertainty, discount rates rise, making renewables *harder to finance* just when they're most needed
*   A dynamic, damage-driven discount rate in LCOE calculations would capture this feedback:
    *   LCOE_solar ~ Capex * r / (1 - (1+r)^{-n})
    *   If r jumps 5% -> 10% due to climate chaos, solar LCOE explodes while gas LCOE rises modestly
*   **Jevons Paradox applies:** if renewables make energy very cheap (low variable cost), the economy will expand to consume the surplus (see Entropy-Economics.md)
