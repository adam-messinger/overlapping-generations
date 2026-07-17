# Hypotheses about aging-society geography

This document states the conceptual priors behind the mechanism simulation. They are hypotheses,
not conclusions established by the US backtest. The international notes supply context, while the
historical-persistence model is empirical and may disagree with these priors.

## Central hypothesis

Aging changes the composition and location of housing demand. Slower household formation can make
local migration, institutional demand, immigrant settlement, access, and accumulated wealth more
important for relative outcomes. Because those forces are geographically concentrated, municipal
outcomes may diverge even when national population changes slowly.

## Structural channels

### Institutional capacity

Universities, medical centers, government, and military facilities can attract students, workers,
patients, and assigned personnel. The implemented proxies are enrollment and employment stocks,
not actual annual inflow, retention, budgets, or closure risk. An institution is therefore an
imperfect indicator of replacement capacity rather than a guaranteed anchor.

### Demographic replacement

The 25–44/65+ ratio and young-adult share describe current age structure. They may indicate a
place's capacity to replace residents aging out of working and household-forming years. The
simulation applies one national fertility path to every municipality; it does **not** model local
fertility differences or identify “fertility enclaves.”

### Access and human capital

Nearby population, education, and skilled employment can connect a municipality to a broader labor
and housing market. Straight-line access bands are only rough proxies. The model includes an
explicit institution-by-regional-dominance interaction for service hubs outside major metros.

### Amenity, health, and accumulated wealth

Seasonal housing and arts/recreation employment proxy amenity demand; health employment proxies
medical capacity. These channels may attract older or external purchasers, but climate risk,
insurance costs, and wealth distribution are absent. Remote, low-income amenity scores are damped
to avoid treating scenic vacancy as prestige demand.

### Supply and distress

Density and recent construction proxy the housing supply response. Vacancy proxies distress.
Supply can amplify or absorb demand shifts, but the model does not observe zoning law, permitting
delay, buildable land, construction cost, or housing quality directly.

## Interactions versus implementation

Conceptually, a place with two mutually reinforcing channels may be more resilient than a place
with one. The code does **not** multiply four “capitals.” It uses additive pillar scores, one
institution-by-dominance interaction, an amenity gate, affordability feedback, and a nonlinear
housing-market response. Documentation should therefore describe the implemented model as
additive with selected interactions, not generally multiplicative.

## Testable propositions

- Age replacement and institutional proxies should predict relative housing outcomes after
  controlling for broad geography.
- Amenity should be more durable when paired with access, income, or constrained supply.
- High vacancy and recent construction should be adverse when household demand weakens.
- Internal migration must redistribute people rather than create them; international migration is
  the open demographic flow.
- Group-quarters population should affect cohorts without being mistaken for ordinary household
  housing demand.

The corrected validation supports only a limited version of the first proposition. The historical
logistic index has mean held-out-state AUC 0.667, but the foreign-born-share baseline alone reaches
0.629. The mechanism's raw national hindcast is weak (AUC 0.567 and Spearman 0.082); its corrected
mean within-held-out-state Spearman diagnostic is 0.182. It does beat lagged population within
start-period commuting zones, although a fitted local ridge is better. The remaining propositions
are model structure and research questions, not empirically confirmed findings.

## US scenario, not forecast law

Under the current scenario, fertility remains below replacement and net immigration becomes an
increasingly important source of population growth. Places compete for internal movers while
receiving different shares of international inflow. Housing stocks respond slowly and prices react
to household demand, supply, income, and error correction.

Different migration policy, institutional change, local fertility, climate/insurance conditions,
or supply behavior can reverse locality results. Scenario sensitivity is therefore a more
appropriate use of this theory than a single deterministic 2065 ranking.
