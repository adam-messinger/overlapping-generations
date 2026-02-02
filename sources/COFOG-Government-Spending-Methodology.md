# Methodology: Government Spending Classification (COFOG)

To accurately model government fiscal dynamics, we adopt the **Classification of the Functions of Government (COFOG)** standard, developed by the OECD and published by the United Nations. This is the global standard for national accounts.

## Core Categories for the Simulation

We propose aggregating the 10 COFOG divisions into 4 high-level simulation variables to balance detail with model simplicity.

### 1. Defense (Guns)
*   **COFOG Division:** 02
*   **Includes:** Military defense, civil defense, foreign military aid.
*   **Model Driver:** Geopolitical tension, relative power vs. rivals.
*   **Economic Effect:** Consumption of capital/labor without productive output (pure "overhead").

### 2. Public Order & Safety (Services)
*   **COFOG Division:** 03
*   **Includes:** Police services, Fire protection services, Law courts, Prisons.
*   **Model Driver:** Population size, inequality (potential feedback loop), urbanization.
*   **Economic Effect:** Essential "overhead" to maintain stability. If this is underfunded, `stability` parameter drops.

### 3. Social Transfers (Butter / Redistribution)
*   **COFOG Division:** 10 (Social Protection)
*   **Includes:**
    *   **Old Age:** Pensions (drivers: demography, dependency ratio).
    *   **Sickness/Disability:** Health transfers.
    *   **Unemployment:** Automatic stabilizers.
    *   **Family/Children:** Child support.
*   **Model Driver:** Demographics (Aging), Policy decisions (Replacement Rate).
*   **Economic Effect:** Redistributes income from workers/capital to non-workers. Maintains consumption but reduces savings/investment (if funded by debt).

### 4. Debt Interest (The Past)
*   **COFOG Division:** 01.7 (Public Debt Transactions)
*   **Includes:** Interest payments on government debt.
*   **Model Driver:** Accumulated Debt Stock $\times$ Interest Rate (Risk Free + Risk Premium).
*   **Economic Effect:** Pure drain on current revenue. Crowds out other spending or forces borrowing.

## Implementation Notes
*   **Tax Revenue** funds these pools in a specific order (usually Debt First, then Entitlements, then Discretionary).
*   **Deficit** occurs when Revenue < Sum(All Pools).
