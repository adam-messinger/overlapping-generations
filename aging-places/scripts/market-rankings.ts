/**
 * Within-market rankings — the primary product surface (step 2).
 *
 * Rationale (docs/MARKET_RANKINGS.md): the only score with validated local
 * rank signal is the mechanism scenario (market-backtest.ts: +0.156 equal-zone
 * Spearman over lagged population, bootstrap CI above zero); the national
 * historical-persistence score has almost none (equal-zone 0.023). So the
 * product question "who gains importance as this region ages" is answered
 * WITHIN commuting zones by mechanismScore, and the national lists remain
 * valuation/exposure screens only.
 *
 * Outputs:
 *   outputs/market-rankings.csv.gz — every modeled place in a zone with >=5
 *     modeled places: zone, zoneRank, zonePercentile, flags
 *   outputs/market-leaders.csv — top-3 places per zone (>=10 places, non-low
 *     confidence), the "Fukuoka list": projected relative winners per market
 */
import * as path from 'node:path';
import { DATA_DIR, OUT_DIR, ensureDirs, parseCsv, readCsvAuto, writeCsv } from './lib.js';

interface Row { [k: string]: string }

function load(file: string): Row[] {
  const rows = parseCsv(readCsvAuto(file));
  const header = rows[0];
  return rows.slice(1).filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

function main(): void {
  ensureDirs();
  const forecast = load(path.join(OUT_DIR, 'forecast-all.csv.gz'));
  const markets = new Map(load(path.join(DATA_DIR, 'place-markets.csv.gz'))
    .map((r) => [r.geoid, r]));
  const pop2000 = new Map(load(path.join(DATA_DIR, 'features2000.csv.gz'))
    .map((r) => [r.geoid, Number(r.pop) || null]));

  interface Unit {
    row: Row; zone: string; zoneName: string; mech: number; structural: number;
    pop: number; pop2000: number | null; flowContradiction: boolean;
  }
  const units: Unit[] = [];
  for (const row of forecast) {
    const market = markets.get(row.geoid);
    const mech = Number(row.mechanismScore);
    if (!market || !market.cz2020 || !Number.isFinite(mech)) continue;
    const pop = Number(row.pop) || 0;
    const p2000 = pop2000.get(row.geoid) ?? null;
    // Contradiction check: model says relative inflow, realized 2000->2023
    // headcount fell >2%. Not a veto — a disclosed disagreement with history.
    const flowContradiction = mech > 0.5 && p2000 !== null && p2000 > 0
      && Math.log(Math.max(1, pop) / p2000) < -0.02;
    units.push({
      row, zone: market.cz2020, zoneName: market.cz2020Name, mech,
      structural: Number(row.structuralScore) || 0, pop, pop2000: p2000, flowContradiction,
    });
  }

  const byZone = new Map<string, Unit[]>();
  for (const unit of units) {
    const list = byZone.get(unit.zone) ?? [];
    list.push(unit);
    byZone.set(unit.zone, list);
  }

  const header = [
    'geoid', 'name', 'state', 'pop', 'zone', 'zoneName', 'zonePlaces',
    'zoneRank', 'zonePercentile', 'structuralZoneRank',
    'mechanismScore', 'structuralScore', 'historicalPersistenceScore', 'valuationGap',
    'confidence', 'flowContradiction', 'tags',
  ];
  const rankingRows: (string | number | null)[][] = [];
  const leaderRows: (string | number | null)[][] = [];
  const zones = [...byZone.entries()].filter(([, list]) => list.length >= 5);
  for (const [zone, list] of zones) {
    const byMech = [...list].sort((a, b) => b.mech - a.mech);
    const byStructural = [...list].sort((a, b) => b.structural - a.structural);
    const structuralRank = new Map(byStructural.map((unit, i) => [unit.row.geoid, i + 1]));
    byMech.forEach((unit, i) => {
      rankingRows.push([
        unit.row.geoid, unit.row.name, unit.row.state, unit.pop, zone, unit.zoneName, list.length,
        i + 1, +(1 - i / Math.max(1, list.length - 1)).toFixed(3),
        structuralRank.get(unit.row.geoid) ?? null,
        unit.mech, unit.structural, Number(unit.row.historicalPersistenceScore) || null,
        unit.row.valuationGap === '' ? null : Number(unit.row.valuationGap),
        unit.row.confidence, unit.flowContradiction ? 1 : 0, unit.row.tags,
      ]);
    });
    if (list.length >= 10) {
      byMech.filter((unit) => unit.row.confidence !== 'low').slice(0, 3).forEach((unit, i) => {
        leaderRows.push([
          unit.row.geoid, unit.row.name, unit.row.state, unit.pop, zone, unit.zoneName, list.length,
          i + 1, null, structuralRank.get(unit.row.geoid) ?? null,
          unit.mech, unit.structural, Number(unit.row.historicalPersistenceScore) || null,
          unit.row.valuationGap === '' ? null : Number(unit.row.valuationGap),
          unit.row.confidence, unit.flowContradiction ? 1 : 0, unit.row.tags,
        ]);
      });
    }
  }
  // Leaders sorted by zone population (largest markets first)
  const zonePop = new Map<string, number>();
  for (const [zone, list] of zones) zonePop.set(zone, list.reduce((s, u) => s + u.pop, 0));
  leaderRows.sort((a, b) => (zonePop.get(String(b[4])) ?? 0) - (zonePop.get(String(a[4])) ?? 0)
    || Number(a[7]) - Number(b[7]));

  writeCsv(path.join(OUT_DIR, 'market-rankings.csv.gz'), header, rankingRows);
  writeCsv(path.join(OUT_DIR, 'market-leaders.csv'), header, leaderRows);
  const contradictions = rankingRows.filter((r) => r[15] === 1).length;
  console.log(`zones>=5: ${zones.length}; ranked places: ${rankingRows.length}; leaders: ${leaderRows.length}; flow contradictions: ${contradictions}`);
  // Spot-check: the gateway question (Maywood within LA) and a hinterland hub
  for (const probe of ['Maywood city', 'Rochester city', 'State College borough']) {
    const hit = rankingRows.find((r) => String(r[1]) === probe);
    if (hit) console.log(`  ${probe}, ${hit[2]}: zone ${hit[5]} rank ${hit[7]}/${hit[6]} (pctl ${hit[8]}) contradiction=${hit[15]}`);
  }
}

main();
