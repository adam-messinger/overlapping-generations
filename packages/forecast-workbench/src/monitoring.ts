import {
  assertFiniteJson,
  requireIsoTimestamp,
  requireText,
} from './canonical.js';

export type TriggerOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'changed';

export interface TriggerDefinition {
  schemaVersion: 'forecast-workbench.trigger/v1';
  id: string;
  version: string;
  questionHash: string;
  sourceProfileId: string;
  schedule: string;
  description: string;
  valuePath: string;
  operator: TriggerOperator;
  threshold?: number | string | boolean;
  cooldownMs?: number;
  notificationPolicy: 'neutral-availability' | 'magnitude-bearing';
}

export interface MonitorCheck {
  schemaVersion: 'forecast-workbench.monitor-check/v1';
  id: string;
  triggerId: string;
  scheduledFor: string;
  checkedAt: string;
  acquisitionReceiptId: string;
  evidencePacketId: string;
  priorValue?: unknown;
  currentValue?: unknown;
  matched: boolean;
  materialChange: boolean;
  notificationPolicy: TriggerDefinition['notificationPolicy'];
}

function valueAtPath(value: unknown, path: string): unknown {
  return path.split('.').filter(Boolean).reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

export function validateTrigger(trigger: TriggerDefinition): void {
  if (trigger.schemaVersion !== 'forecast-workbench.trigger/v1') {
    throw new Error(`Unsupported trigger schema '${String(trigger.schemaVersion)}'`);
  }
  requireText(trigger.id, 'trigger.id');
  requireText(trigger.version, 'trigger.version');
  requireText(trigger.questionHash, 'trigger.questionHash');
  requireText(trigger.sourceProfileId, 'trigger.sourceProfileId');
  requireText(trigger.schedule, 'trigger.schedule');
  requireText(trigger.description, 'trigger.description');
  requireText(trigger.valuePath, 'trigger.valuePath');
  if (!['gt', 'gte', 'lt', 'lte', 'eq', 'changed'].includes(trigger.operator)) {
    throw new Error(`Invalid trigger operator '${String(trigger.operator)}'`);
  }
  if (
    !['neutral-availability', 'magnitude-bearing'].includes(
      trigger.notificationPolicy,
    )
  ) {
    throw new Error(
      `Invalid trigger notification policy '${String(trigger.notificationPolicy)}'`,
    );
  }
  if (trigger.operator !== 'changed' && trigger.threshold === undefined) {
    throw new Error(`Trigger '${trigger.id}' operator requires a threshold`);
  }
  if (trigger.cooldownMs !== undefined &&
      (!Number.isFinite(trigger.cooldownMs) || trigger.cooldownMs < 0)) {
    throw new Error(`Trigger '${trigger.id}' cooldown must be non-negative`);
  }
  if (trigger.threshold !== undefined) {
    assertFiniteJson(trigger.threshold, `trigger '${trigger.id}' threshold`);
  }
}

export function validateMonitorCheck(check: MonitorCheck): void {
  if (check.schemaVersion !== 'forecast-workbench.monitor-check/v1') {
    throw new Error(`Unsupported monitor-check schema '${String(check.schemaVersion)}'`);
  }
  requireText(check.id, 'monitorCheck.id');
  requireText(check.triggerId, 'monitorCheck.triggerId');
  requireIsoTimestamp(check.scheduledFor, 'monitorCheck.scheduledFor');
  requireIsoTimestamp(check.checkedAt, 'monitorCheck.checkedAt');
  requireText(check.acquisitionReceiptId, 'monitorCheck.acquisitionReceiptId');
  requireText(check.evidencePacketId, 'monitorCheck.evidencePacketId');
  if (
    !['neutral-availability', 'magnitude-bearing'].includes(
      check.notificationPolicy,
    )
  ) {
    throw new Error(
      `Invalid monitor notification policy '${String(check.notificationPolicy)}'`,
    );
  }
  if (typeof check.matched !== 'boolean' ||
      typeof check.materialChange !== 'boolean') {
    throw new Error('Monitor matched and materialChange fields must be boolean');
  }
  if (check.priorValue !== undefined) {
    assertFiniteJson(check.priorValue, 'monitorCheck.priorValue');
  }
  if (check.currentValue !== undefined) {
    assertFiniteJson(check.currentValue, 'monitorCheck.currentValue');
  }
}

export function evaluateTrigger(options: {
  trigger: TriggerDefinition;
  scheduledFor: string;
  checkedAt: string;
  acquisitionReceiptId: string;
  evidencePacketId: string;
  current: unknown;
  prior?: unknown;
}): MonitorCheck {
  validateTrigger(options.trigger);
  requireIsoTimestamp(options.scheduledFor, 'monitor scheduledFor');
  requireIsoTimestamp(options.checkedAt, 'monitor checkedAt');
  const currentValue = valueAtPath(options.current, options.trigger.valuePath);
  const priorValue = valueAtPath(options.prior, options.trigger.valuePath);
  const threshold = options.trigger.threshold;
  let matched: boolean;
  if (options.trigger.operator === 'changed') {
    matched = JSON.stringify(currentValue) !== JSON.stringify(priorValue);
  } else if (options.trigger.operator === 'eq') {
    matched = currentValue === threshold;
  } else {
    if (typeof currentValue !== 'number' || typeof threshold !== 'number') {
      throw new Error(`Trigger '${options.trigger.id}' comparison requires numeric values`);
    }
    if (options.trigger.operator === 'gt') matched = currentValue > threshold;
    else if (options.trigger.operator === 'gte') matched = currentValue >= threshold;
    else if (options.trigger.operator === 'lt') matched = currentValue < threshold;
    else matched = currentValue <= threshold;
  }
  return {
    schemaVersion: 'forecast-workbench.monitor-check/v1',
    id: `${options.trigger.id}:${options.scheduledFor}`,
    triggerId: options.trigger.id,
    scheduledFor: options.scheduledFor,
    checkedAt: options.checkedAt,
    acquisitionReceiptId: options.acquisitionReceiptId,
    evidencePacketId: options.evidencePacketId,
    ...(priorValue === undefined ? {} : { priorValue }),
    ...(currentValue === undefined ? {} : { currentValue }),
    matched,
    materialChange: matched,
    notificationPolicy: options.trigger.notificationPolicy,
  };
}
