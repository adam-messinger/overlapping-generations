# Feature Request: Granular Government Spending Module (COFOG Standard)

## Summary
The current model lacks a detailed government sector. To realistically model "Guns vs. Butter" trade-offs, debt crises, and the fiscal impact of aging, we need to implement a spending module based on the international **COFOG (Classification of the Functions of Government)** standard.

## Proposed Taxonomy
We will split the monolithic "Government" into four distinct distinct flows with different drivers and economic effects:

### 1. Defense (COFOG Div 02)
*   **Driver:** Geopolitical tension index (exogenous or derived from inequality between regions).
*   **Effect:** Consumes GDP. No direct return to capital stock (unlike infrastructure).

### 2. Public Order & Safety (COFOG Div 03)
*   **Driver:** Population size and urbanization rate.
*   **Effect:** Maintenance cost. If underfunded, the `stability` parameter (investment confidence) declines.

### 3. Social Transfers (COFOG Div 10)
*   **Driver:** **Demographics** (Old Age Dependency Ratio). This is the critical link to the existing population model.
*   **Effect:** Transfers wealth from tax revenue to households (consumption). Does not build capital.

### 4. Debt Service (COFOG Div 01.7)
*   **Driver:** Accumulated Debt $\times$ Interest Rate.
*   **Effect:** The "crowding out" mechanic. If interest payments consume 100% of revenue, the system collapses.

## Implementation Steps

1.  **Add State Variables:**
    *   `gov.defenseSpending`
    *   `gov.publicOrderSpending`
    *   `gov.socialTransfers`
    *   `gov.debtInterest`
    *   `gov.accumulatedDebt`

2.  **Define Parameter Functions:**
    *   `defense(t) = GDP(t) * baseRate * tensionMultiplier`
    *   `transfers(t) = GDP(t) * dependencyRatio * replacementRate`
    *   `debtInterest(t) = debt(t-1) * interestRate(t)`

3.  **Update Loop Logic:**
    *   Calculate Total Spending.
    *   Calculate Deficit (`Spending - TaxRevenue`).
    *   Update `accumulatedDebt`.
    *   Subtract Deficit from `NationalSavings` (Crowding Out investment).

## Success Criteria
*   The model should show a **"Fiscal Squeeze"** in the 2040s-2050s where aging (Transfers) + Debt Interest forces a reduction in either Defense or Investment.
