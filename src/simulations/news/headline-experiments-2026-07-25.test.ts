import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateAlphabetCapex,
  evaluateForcedLaborTariffs,
  evaluateOilBuffers,
} from './headline-experiments-2026-07-25.js';

test('Alphabet revision turns cash burn into an attribution fork', () => {
  const result = evaluateAlphabetCapex();

  assert.ok(result.naiveHeadline.cloudProfitToFullCapitalCharge < 1);
  assert.ok(result.backcast2025.capitalChargeCoverage > 1);
  assert.ok(result.currentCentral.capitalChargeCoverage > 1);
  assert.ok(result.currentCentral.requiredBenefitAttribution > 0.5);
  assert.ok(result.currentCentral.requiredBenefitAttribution < 1);
  assert.ok(
    result.backcastProductivityProjection.capitalChargeCoverage > 2,
  );
  assert.ok(
    result.backcastProductivityProjection.halfProductivityCoverage > 1,
  );
  assert.ok(result.attributionDownside.capitalChargeCoverage < 1);
  assert.ok(result.attributionDownside.otherBusinessBenefitNeededBillion > 0);
});

test('tariff revision distinguishes the gross tariff from the overnight change', () => {
  const result = evaluateForcedLaborTariffs();

  assert.ok(
    result.naiveFromZero.consumerPriceLevelIncrease >
      result.incrementalFromExpiringTariff.consumerPriceLevelIncrease * 8,
  );
  assert.ok(
    result.incrementalFromExpiringTariff.consumerPriceLevelIncrease < 0.002,
  );
  assert.ok(
    result.forcedLaborMechanism.highRateCountryRelativeVolumeDecline < 0.05,
  );
  assert.equal(
    result.forcedLaborMechanism.withinCountryForcedLaborRelativePriceChange,
    0,
  );
  assert.ok(
    result.forcedLaborMechanism
      .representativeAnnualSavingsFromComplianceMillion > 100,
  );
});

test('oil revision matches the price only with renewed severe route impairment', () => {
  const result = evaluateOilBuffers();

  assert.ok(result.naiveNoBuffer.pricePerBarrel > 105);
  assert.ok(result.stockFlowRevision.impliedCurrentThroughput < 0.2);
  assert.ok(
    result.throughputSensitivity.every(
      (row) => row.impliedCurrentThroughput < 0.1,
    ),
  );
  assert.ok(
    Math.abs(
      result.stockFlowRevision.modeledCurrentPricePerBarrel -
        result.case.currentOilPricePerBarrel,
    ) < 0.25,
  );
  assert.ok(result.chinaBuffer.stockDrawShareOfImportReduction > 0.2);
  assert.ok(result.chinaBuffer.stockDrawShareOfImportReduction < 0.5);
  assert.equal(result.usRefineryRunway[0]?.commercialBufferDays, null);
  assert.ok((result.usRefineryRunway[2]?.commercialBufferDays ?? 0) > 20);
  assert.ok(
    Math.min(
      ...result.usOperationalFloorSensitivity.map(
        (row) => row.commercialBufferDays,
      ),
    ) < 10,
  );
  assert.ok(result.productBottleneck.productScarcityPriceMultiple > 1.1);
});
