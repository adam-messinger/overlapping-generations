import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OBSERVED_MONTHS,
  SETTLEMENT_CHANNELS,
  defaultWarSettlementParams,
  warSettlementEvidence,
  warSettlementScenarios,
} from './data.js';
import {
  buildSettlementEnsemble,
  ensembleAxes,
  povertyHeadcount,
  simulateWarSettlement,
} from './model.js';
import {
  backcastValues,
  calibrateWarSettlement,
  marchLossAfterRerouting,
  warSettlementTargets,
} from './calibration.js';

const central = warSettlementScenarios['attrition-continues'];
const E = warSettlementEvidence;

test('every stock is non-negative and finite over the whole horizon', () => {
  for (const scenario of Object.values(warSettlementScenarios)) {
    const result = simulateWarSettlement(scenario);
    assert.equal(result.months.length, scenario.months);
    for (const m of result.months) {
      for (const [name, value] of Object.entries(m)) {
        if (typeof value === 'number') {
          assert.ok(Number.isFinite(value), `${scenario.id} ${name} month ${m.monthIndex}`);
        }
      }
      assert.ok(m.usSprMb >= 0, `${scenario.id} SPR month ${m.monthIndex}`);
      assert.ok(m.chinaReserveMb >= 0);
      assert.ok(m.iranMissileInventory >= 0);
      assert.ok(m.iranLaunchers >= 0);
      assert.ok(m.usHighEndInterceptors >= 0);
      assert.ok(m.usAreaInterceptors >= 0);
      assert.ok(m.usStandoffWeapons >= 0);
      assert.ok(m.brentUsdPerBarrel > 0);
    }
  }
});

test('survival is monotone and the settlement CDF is a probability', () => {
  const result = simulateWarSettlement(central);
  let previous = 1;
  for (const m of result.months) {
    assert.ok(m.cumulativeSettlement >= 0 && m.cumulativeSettlement <= 1);
    assert.ok(m.survival <= previous + 1e-12, `survival rose at month ${m.monthIndex}`);
    previous = m.survival;
  }
  const attribution = SETTLEMENT_CHANNELS.reduce(
    (sum, c) => sum + result.channelAttribution[c],
    0,
  );
  assert.ok(Math.abs(attribution - 1) < 1e-9, `attribution sums to ${attribution}`);
});

test('Iran can never fire more missiles than it holds', () => {
  for (const scenario of Object.values(warSettlementScenarios)) {
    const result = simulateWarSettlement(scenario);
    let stock = E.iranMunitions.prewarInventory - E.iranMunitions.openingSalvo;
    for (const m of result.months) {
      assert.ok(m.iranLaunches <= stock + 1e-9, `${scenario.id} month ${m.monthIndex}`);
      stock = m.iranMissileInventory;
    }
  }
});

test('the SPR release honours its 172 mb authorization and its operable floor', () => {
  const result = simulateWarSettlement(central);
  const start = E.reserves.usSprDec2025Mb;
  const lowest = Math.min(...result.months.map((m) => m.usSprMb));
  const released = start - lowest;
  assert.ok(
    released <= E.reserves.usSprAuthorizedReleaseMb + 1e-6,
    `released ${released} exceeds the authorization`,
  );
  assert.ok(lowest >= defaultWarSettlementParams.usSprMinimumOperableMb - 1e-6);
  // The reported post-release level is 243 mb; 415 - 172 must reproduce it.
  assert.ok(Math.abs(lowest - E.reserves.usSprPostReleaseMb) < 1);
});

test('the backcast reproduces the observed March-July record', () => {
  const values = backcastValues(simulateWarSettlement(central));
  for (const [name, target] of Object.entries(warSettlementTargets.development)) {
    const value = values[name];
    assert.ok(
      value >= target.min && value <= target.max,
      `${name} = ${value.toFixed(2)}, outside ${target.min}-${target.max}`,
    );
  }
});

test('the calibration search does not degrade the development fit', () => {
  const calibrated = calibrateWarSettlement();
  assert.equal(calibrated.development.meanLoss, 0);
  // China's import cover is the holdout that passes.
  const china = calibrated.holdout.components.find((c) => c.name === 'chinaDaysOfCoverJuly');
  assert.ok(china && china.loss === 0, 'China days-of-cover holdout should pass');
});

test('the World Bank supply-loss holdout misses low, and is bracketed', () => {
  // Pinned deliberately: the model does not match this anchor on the
  // after-draw definition, and the docs report it as a miss rather than
  // quietly reweighting the target.
  const result = simulateWarSettlement(central);
  const afterDraws = result.months[0].netDeficitMbd;
  const afterRerouting = marchLossAfterRerouting(result);
  assert.ok(afterDraws < E.oil.initialNetSupplyLossMbd, 'after-draw loss should sit below 10 mb/d');
  assert.ok(
    afterRerouting > E.oil.initialNetSupplyLossMbd,
    'before-draw loss should sit above 10 mb/d',
  );
});

test('the March closure is what the reported Q1 average requires', () => {
  // January and February ran close to normal, so the EIA's 14.6 mb/d Q1
  // average forces March to have been a near-total closure. If the scenario
  // path drifts away from that, the whole price backcast stops being anchored.
  const marchThroughput = central.hormuzThroughputPath[0];
  const q1Average = ((1.0 + 0.97 + marchThroughput) / 3) * E.oil.hormuzNormalFlowMbd;
  assert.ok(
    Math.abs(q1Average - E.oil.q1TrafficMbd) < 0.6,
    `implied Q1 average ${q1Average.toFixed(2)} vs reported ${E.oil.q1TrafficMbd}`,
  );
});

test('poverty headcount moves the right way and stays a share', () => {
  const prewar = 0.30;
  assert.ok(Math.abs(povertyHeadcount(1, prewar, 0.39) - prewar) < 1e-6);
  const poorer = povertyHeadcount(0.75, prewar, 0.39);
  const richer = povertyHeadcount(1.3, prewar, 0.39);
  assert.ok(poorer > prewar && poorer < 1);
  assert.ok(richer < prewar && richer > 0);
});

test('de-escalation settles later than escalation, and for different reasons', () => {
  const escalation = buildSettlementEnsemble(warSettlementScenarios.escalation);
  const pause = buildSettlementEnsemble(warSettlementScenarios['negotiated-pause']);
  const escalationMedian = escalation.conditionalQuantileMonths.p50;
  const pauseMedian = pause.conditionalQuantileMonths.p50;
  assert.ok(escalationMedian !== null, 'escalation should reach a median');
  assert.ok(
    pauseMedian === null || pauseMedian > escalationMedian,
    'a holding pause must not settle sooner than escalation',
  );
  // Closing the strait routes the pressure through the US price level: it is
  // the inflation channel, not the magazines, that escalation accelerates.
  assert.ok(
    escalation.channelAttribution.usInflation > pause.channelAttribution.usInflation,
    'closure should raise the share of settlements driven by US inflation',
  );
});

test('Iran running out of missiles is the weakest of the four channels', () => {
  // Iran meters its own firing rate, so the stock falls without ever forcing
  // the salvo below the credibility floor. If a change to the launcher or
  // production block flips this, the headline reading changes with it.
  for (const scenario of Object.values(warSettlementScenarios)) {
    const ensemble = buildSettlementEnsemble(scenario);
    const { iranMagazine, usMagazine } = ensemble.channelAttribution;
    assert.ok(
      iranMagazine < usMagazine,
      `${scenario.id}: Iran magazine ${iranMagazine.toFixed(3)} vs US ${usMagazine.toFixed(3)}`,
    );
  }
});

test('conditioning on the observed window pushes settlement later', () => {
  const ensemble = buildSettlementEnsemble(warSettlementScenarios['attrition-continues']);
  for (let t = 0; t < OBSERVED_MONTHS; t += 1) {
    assert.equal(ensemble.conditionalCumulative[t], 0, 'no settlement inside the observed window');
  }
  const unconditional = ensemble.quantileMonths.p50;
  const conditional = ensemble.conditionalQuantileMonths.p50;
  assert.ok(unconditional !== null && conditional !== null);
  assert.ok(conditional > unconditional, 'conditioning must not pull the median earlier');
});

test('reopening Hormuz stops the economic clocks but not the military ones', () => {
  const reopen = simulateWarSettlement(warSettlementScenarios['iran-capitulates-hormuz']);
  const late = reopen.months[reopen.months.length - 1];
  assert.ok(late.netDeficitMbd < 1e-6, 'a reopened strait should clear the shortfall');
  assert.ok(late.pressures.usInflation < 0.2, 'US inflation pressure should subside');
  assert.ok(late.pressures.usMagazine > 0, 'magazine pressure should persist');
});

test('the ensemble is a full deterministic factorial and is reproducible', () => {
  const first = buildSettlementEnsemble(central);
  const second = buildSettlementEnsemble(central);
  assert.equal(first.memberCount, Math.pow(3, ensembleAxes.length));
  assert.deepEqual(first.cumulative, second.cumulative);
  for (let i = 1; i < first.cumulative.length; i += 1) {
    assert.ok(first.cumulative[i] >= first.cumulative[i - 1] - 1e-12, 'CDF must be monotone');
  }
});

test('the observed window is the first five months of every scenario', () => {
  for (const scenario of Object.values(warSettlementScenarios)) {
    assert.equal(scenario.startYear, 2026);
    assert.equal(scenario.startMonth, 3);
    assert.deepEqual(
      scenario.hormuzThroughputPath.slice(0, OBSERVED_MONTHS),
      warSettlementScenarios['attrition-continues'].hormuzThroughputPath.slice(0, OBSERVED_MONTHS),
      `${scenario.id} must not rewrite the observed months`,
    );
  }
});
