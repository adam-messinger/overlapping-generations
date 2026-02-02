import { runWithScenario } from '../src/index.js';

const scenarios = [
  { name: 'ssp1-19', file: 'scenarios/ssp1-19.json' },
  { name: 'ssp1-26', file: 'scenarios/ssp1-26.json' },
  { name: 'baseline', file: 'scenarios/baseline.json' },
  { name: 'ssp3-70', file: 'scenarios/ssp3-70.json' },
  { name: 'ssp5-85', file: 'scenarios/ssp5-85.json' },
];

async function main() {
  console.log('\n=== Model vs IPCC AR6 Comparison ===\n');

  const data: any[] = [];

  for (const s of scenarios) {
    try {
      const { result } = await runWithScenario(s.file);
      const r2050 = result.results[25];
      const r2100 = result.results[result.results.length - 1];
      const m = result.metrics;

      data.push({
        name: s.name,
        temp2050: r2050.temperature,
        temp2100: m.warming2100,
        co2_2050: r2050.co2ppm,
        co2_2100: r2100.co2ppm,
        peakGt: m.peakEmissions,
        peakYear: m.peakEmissionsYear,
        cumulative: r2100.cumulativeEmissions,
        fossil2050: r2050.fossilShare,
      });
    } catch (e) {
      console.log('Error:', s.name);
    }
  }

  // Print comparison table
  console.log('METRIC              SSP1-1.9    SSP1-2.6    BASELINE    SSP3-7.0    SSP5-8.5');
  console.log('                    (Model/IPCC)');
  console.log('─'.repeat(85));

  const ipcc = {
    temp2100: [1.4, 1.8, 2.7, 3.6, 4.4],
    co2_2100: [393, 450, 600, 850, 1135],
    peakYear: [2025, 2025, 2040, 2080, 2100],
    netZero: ['2050', '2070', 'never', 'never', 'never'],
  };

  // Temperature 2100
  console.log('Temp 2100 (°C)');
  let row = '  Model:            ';
  for (const d of data) row += d.temp2100.toFixed(2).padStart(8) + '    ';
  console.log(row);
  row = '  IPCC:             ';
  for (const t of ipcc.temp2100) row += t.toFixed(1).padStart(8) + '    ';
  console.log(row);
  row = '  Delta:            ';
  for (let i = 0; i < data.length; i++) row += (data[i].temp2100 - ipcc.temp2100[i] > 0 ? '+' : '') + (data[i].temp2100 - ipcc.temp2100[i]).toFixed(2).padStart(7) + '    ';
  console.log(row);

  console.log('');

  // CO2 ppm 2100
  console.log('CO2 2100 (ppm)');
  row = '  Model:            ';
  for (const d of data) row += d.co2_2100.toFixed(0).padStart(8) + '    ';
  console.log(row);
  row = '  IPCC:             ';
  for (const c of ipcc.co2_2100) row += c.toString().padStart(8) + '    ';
  console.log(row);

  console.log('');

  // Peak emissions year
  console.log('Peak Emissions Year');
  row = '  Model:            ';
  for (const d of data) row += d.peakYear.toString().padStart(8) + '    ';
  console.log(row);
  row = '  IPCC:             ';
  for (const y of ipcc.peakYear) row += y.toString().padStart(8) + '    ';
  console.log(row);

  console.log('');

  // Peak emissions Gt
  console.log('Peak Emissions (Gt)');
  row = '  Model:            ';
  for (const d of data) row += d.peakGt.toFixed(1).padStart(8) + '    ';
  console.log(row);
  row = '  IPCC:             ';
  console.log('  IPCC:                ~35         ~35         ~40         ~55         ~75');

  console.log('');

  // Cumulative CO2
  console.log('Cumulative CO2 (Gt)');
  row = '  Model:            ';
  for (const d of data) row += d.cumulative.toFixed(0).padStart(8) + '    ';
  console.log(row);
  console.log('  IPCC 1.5°C budget:   510 Gt (330-710)');
  console.log('  IPCC 2°C budget:     890 Gt (640-1160)');

  console.log('\n' + '─'.repeat(85));
  console.log('\n=== Assessment ===\n');

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const tempDelta = d.temp2100 - ipcc.temp2100[i];
    const status = Math.abs(tempDelta) < 0.4 ? '✓ Good match' :
                   tempDelta > 0 ? '⚠ Runs hot' : '⚠ Runs cool';
    console.log(`${d.name.toUpperCase().padEnd(12)} ${status} (${tempDelta > 0 ? '+' : ''}${tempDelta.toFixed(2)}°C vs IPCC)`);
  }
}

main().catch(console.error);
