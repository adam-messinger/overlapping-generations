import { SIMULATION_MODELS } from './registry.js';

export type Applicability = 'implemented' | 'high' | 'medium' | 'low' | 'none';
export type EnergyApplicability = Applicability | 'direct' | 'indirect';
export type AccountingTool =
  | 'godley'
  | 'physical-conservation'
  | 'input-output-balance'
  | 'none';

export interface ModelAccountingApplicability {
  modelId: string;
  scope: 'global-core' | 'registry' | 'news-experiment';
  accountingTool: AccountingTool;
  stockFlowFit: Applicability;
  nonlinearStabilityFit: Applicability;
  energyEssentialFit: EnergyApplicability;
  priority: 'done' | 'now' | 'next' | 'later' | 'none';
  recommendation: string;
}

/**
 * Explicit audit rather than keyword inference: the same word "flow" can
 * denote money, inventory, people, energy, or traffic, and those require
 * different ledgers.
 */
export const MODEL_ACCOUNTING_APPLICABILITY: readonly ModelAccountingApplicability[] = [
  {
    modelId: 'global-olg',
    scope: 'global-core',
    accountingTool: 'godley',
    stockFlowFit: 'implemented',
    nonlinearStabilityFit: 'implemented',
    energyEssentialFit: 'implemented',
    priority: 'done',
    recommendation:
      'Keep the profit-led monetary circuit, consolidated bank/firm/household/government ledger, quarterly debt map, and Ayres-Warr versus Keen production challenger under regression tests.',
  },
  {
    modelId: 'acute-heat-event',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'low',
    nonlinearStabilityFit: 'medium',
    energyEssentialFit: 'indirect',
    priority: 'later',
    recommendation:
      'Use energy and mortality conservation checks plus threshold sensitivity; a monetary Godley table would add ceremony without a financing balance sheet.',
  },
  {
    modelId: 'generic-drug-economics',
    scope: 'registry',
    accountingTool: 'godley',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'medium',
    energyEssentialFit: 'none',
    priority: 'next',
    recommendation:
      'Add manufacturer, wholesaler, hospital, and lender counterparties so inventory purchases, working capital, losses, and patient service reconcile monthly.',
  },
  {
    modelId: 'generic-drug-tariff-transition',
    scope: 'registry',
    accountingTool: 'godley',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'none',
    priority: 'next',
    recommendation:
      'Reconcile tariff revenue, supplier cash, inventory valuation, capacity finance, and shortages; scan the inventory-margin feedback for collapse thresholds.',
  },
  {
    modelId: 'data-center-grid-cost-allocation',
    scope: 'registry',
    accountingTool: 'godley',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'indirect',
    priority: 'now',
    recommendation:
      'Track developer, utility, ratepayer, and creditor claims around capex and stranded assets, then test reliability/load feedback and useful-energy constraints.',
  },
  {
    modelId: 'energy-inflation-policy',
    scope: 'registry',
    accountingTool: 'input-output-balance',
    stockFlowFit: 'medium',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'indirect',
    priority: 'next',
    recommendation:
      'Preserve input-output price propagation, add fiscal and interest-income counterparties only if policy transfers enter, and map policy-rule oscillation regions.',
  },
  {
    modelId: 'hormuz-weber-inflation',
    scope: 'registry',
    accountingTool: 'input-output-balance',
    stockFlowFit: 'medium',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'indirect',
    priority: 'next',
    recommendation:
      'Retain the Weber total-requirements identity, expose pass-through residuals, and test whether monthly rate and energy-price feedback is timestep-sensitive.',
  },
  {
    modelId: 'ai-capital-cycle',
    scope: 'registry',
    accountingTool: 'godley',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'high',
    priority: 'now',
    recommendation:
      'Give debt, cash, capex, depreciation, equity issuance, and defaults explicit counterparties; couple returns to delivered useful energy and map leverage basins.',
  },
  {
    modelId: 'coral-bleaching-exposure',
    scope: 'registry',
    accountingTool: 'none',
    stockFlowFit: 'low',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'none',
    priority: 'next',
    recommendation:
      'Skip financial accounting and concentrate on hysteresis, recovery-versus-collapse basins, threshold uncertainty, and timestep convergence around bleaching events.',
  },
  {
    modelId: 'bilateral-tariff-io',
    scope: 'registry',
    accountingTool: 'input-output-balance',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'low',
    energyEssentialFit: 'none',
    priority: 'later',
    recommendation:
      'Make tax, import, and sector price identities exact; because the central solve is static and linear, residual diagnostics matter more than Jacobian basins.',
  },
  {
    modelId: 'trade-network-tariff',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'none',
    priority: 'next',
    recommendation:
      'Reconcile product shipments, supplier capacity, unmet demand, and tariff cash separately, then scan supplier-switching and capacity-ramp path dependence.',
  },
  {
    modelId: 'critical-material-price-network',
    scope: 'registry',
    accountingTool: 'input-output-balance',
    stockFlowFit: 'medium',
    nonlinearStabilityFit: 'low',
    energyEssentialFit: 'indirect',
    priority: 'later',
    recommendation:
      'Use exact input-output column and price residuals; only add dynamic stability machinery if inventories, substitution, or investment feedback are introduced.',
  },
  {
    modelId: 'critical-material-flow-network',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'indirect',
    priority: 'now',
    recommendation:
      'Promote inventories, deliveries, substitution, and bottleneck losses into one conservation ledger and map monthly shortage-recovery basins.',
  },
  {
    modelId: 'sovereign-nbfi-contagion',
    scope: 'registry',
    accountingTool: 'godley',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'none',
    priority: 'now',
    recommendation:
      'Build a full security-holder/issuer/repo/equity matrix so forced sales and haircuts destroy the correct net worth, then map fire-sale escape basins.',
  },
  {
    modelId: 'multi-chokepoint-maritime',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'indirect',
    priority: 'now',
    recommendation:
      'Use cargo-in-transit conservation rather than a financial Godley table, and test queue spillback, rerouting hysteresis, and monthly-versus-weekly convergence.',
  },
  {
    modelId: 'defense-magnet-sourcing',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'medium',
    energyEssentialFit: 'none',
    priority: 'next',
    recommendation:
      'Reconcile stockpiles, qualified output, waivers, work in process, and commissioned capacity; add cash counterparties only for procurement-finance questions.',
  },
  {
    modelId: 'hormuz-stock-flow',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'indirect',
    priority: 'now',
    recommendation:
      'Keep oil, LNG, fertilizer, storage, and delayed cargo in a unified physical ledger and map depletion, price, rerouting, and replenishment feedback basins.',
  },
  {
    modelId: 'war-settlement-reserves',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'direct',
    priority: 'now',
    recommendation:
      'Hold crude reserves and both munitions magazines in one physical ledger with explicit ' +
      'operational floors, then treat the settlement hazard as a separate, uncalibrated layer ' +
      'that reads the ledger rather than a conserved quantity in it.',
  },
  {
    modelId: 'outbreak-preparedness',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'none',
    priority: 'next',
    recommendation:
      'Use population conservation across SEIR and care states, then analyze reproduction-number thresholds, intervention hysteresis, and numerical timestep convergence.',
  },
  {
    modelId: 'outbreak-probabilistic-forecast',
    scope: 'registry',
    accountingTool: 'none',
    stockFlowFit: 'none',
    nonlinearStabilityFit: 'low',
    energyEssentialFit: 'none',
    priority: 'none',
    recommendation:
      'Keep leakage-safe forecast calibration and proper scoring as the governing tools; balance-sheet and basin machinery do not address this model’s estimand.',
  },
  {
    modelId: 'war-ai-factorial',
    scope: 'registry',
    accountingTool: 'godley',
    stockFlowFit: 'implemented',
    nonlinearStabilityFit: 'implemented',
    energyEssentialFit: 'implemented',
    priority: 'done',
    recommendation:
      'It inherits the global OLG accounting and challenger outputs; expose those diagnostics in the four factorial paths and compare interaction signs across equations.',
  },
  {
    modelId: 'aviation-infrastructure-traffic',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'medium',
    energyEssentialFit: 'indirect',
    priority: 'next',
    recommendation:
      'Reconcile aircraft movements, facility operations, capacity vintages, and unmet traffic; add project-finance counterparties only for funding allocation.',
  },
  {
    modelId: 'e-bike-motor-market',
    scope: 'registry',
    accountingTool: 'physical-conservation',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'medium',
    energyEssentialFit: 'none',
    priority: 'next',
    recommendation:
      'Reconcile bike, drive-unit, supplier, replacement, and inventory vintages before adding cash; test saturation and supplier-capacity feedback sensitivity.',
  },
  {
    modelId: 'news-2026-07-27-oil-pause-inflation',
    scope: 'news-experiment',
    accountingTool: 'input-output-balance',
    stockFlowFit: 'medium',
    nonlinearStabilityFit: 'medium',
    energyEssentialFit: 'indirect',
    priority: 'next',
    recommendation:
      'Keep the revised monthly pass-through path, add exact energy-expenditure and policy-income flows if fiscal relief is modeled, and test persistence rather than the spot-price shortcut.',
  },
  {
    modelId: 'news-2026-07-27-china-industrial-profits',
    scope: 'news-experiment',
    accountingTool: 'godley',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'low',
    energyEssentialFit: 'indirect',
    priority: 'next',
    recommendation:
      'Extend the revenue-times-margin identity into inventories, receivables, wages, taxes, debt, and cash; use energy only where sector production volumes are explicitly modeled.',
  },
  {
    modelId: 'news-2026-07-27-hurricane-insurance-risk',
    scope: 'news-experiment',
    accountingTool: 'godley',
    stockFlowFit: 'high',
    nonlinearStabilityFit: 'high',
    energyEssentialFit: 'none',
    priority: 'now',
    recommendation:
      'Add policyholder, insurer, reinsurer, reserve, and capital counterparties so catastrophe payments and insolvency cannot disappear, then map tail-loss solvency basins.',
  },
] as const;

export function assertCompleteAccountingApplicability(): void {
  const registered = new Set(SIMULATION_MODELS.map((model) => model.id));
  const audited = MODEL_ACCOUNTING_APPLICABILITY.filter(
    (entry) => entry.scope === 'registry',
  );
  const seen = new Set<string>();
  for (const entry of audited) {
    if (seen.has(entry.modelId)) throw new Error(`Duplicate applicability row '${entry.modelId}'`);
    seen.add(entry.modelId);
    if (!registered.has(entry.modelId)) {
      throw new Error(`Applicability row references unknown model '${entry.modelId}'`);
    }
  }
  const missing = [...registered].filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new Error(`Accounting applicability audit is missing: ${missing.join(', ')}`);
  }
}

export function renderAccountingApplicabilityMarkdown(): string {
  assertCompleteAccountingApplicability();
  const headers = [
    'Model',
    'Primary ledger',
    'Stock-flow fit',
    'Stability fit',
    'Energy-essential fit',
    'Priority',
    'Recommendation',
  ];
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...MODEL_ACCOUNTING_APPLICABILITY.map((entry) =>
      `| ${[
        entry.modelId,
        entry.accountingTool,
        entry.stockFlowFit,
        entry.nonlinearStabilityFit,
        entry.energyEssentialFit,
        entry.priority,
        entry.recommendation.replaceAll('|', '\\|'),
      ].join(' | ')} |`),
  ].join('\n');
}
