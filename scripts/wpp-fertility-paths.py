#!/usr/bin/env python3
"""Regional fertility paths under UN WPP 2024 variants, aggregated to the model's regions.

Used to calibrate demographics.ts:
  - the DEFAULT fertility path to the WPP "Low" variant, which Fernandez-Villaverde
    and Norrick (2026, "Terra Incognita", NBER w35809, Supplemental Material B)
    say matches their reading "much better than its Medium Variant" (Low: world
    peak 8.949B in 2053; theirs: ~9B circa 2056, with births since WPP 2024
    "falling even below the Low Variant");
  - the opt-in scenarios/un-wpp-medium.json to the WPP "Medium" variant.

A regional TFR is births-weighted: TFR_region = sum(births) / sum(births / TFR),
since births / TFR is proportional to the country's effective women 15-49.

Inputs (download from population.un.org, CSV_FILES):
  WPP2024_Demographic_Indicators_Medium.csv.gz
  WPP2024_Demographic_Indicators_OtherVariants.csv.gz   (contains "Low")

Usage:
  python3 -I scripts/wpp-fertility-paths.py <Medium.csv.gz> <OtherVariants.csv.gz> [out.json]

Stdlib only. The ISO3 -> region map is shared with scripts/wpp-age-structure.py.
"""
import csv
import gzip
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('wpp_age', os.path.join(HERE, 'wpp-age-structure.py'))
_age = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_age)
R, REGIONS = _age.R, _age.REGIONS

VARIANTS = ('Medium', 'Low')
YEARS = range(2024, 2101)


def accumulate(path, acc):
    with gzip.open(path, 'rt', encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh):
            v = row['Variant']
            if v not in VARIANTS or row['LocTypeID'] != '4':
                continue
            year = int(row['Time'])
            if year not in YEARS:
                continue
            region = R.get(row['ISO3_code'])
            if region is None:
                continue
            try:
                births = float(row['Births'])       # thousands
                tfr = float(row['TFR'])
                pop = float(row['TPopulation1July'])  # thousands
            except ValueError:
                continue
            cell = acc.setdefault(v, {}).setdefault(region, {}).setdefault(year, [0.0, 0.0, 0.0])
            cell[0] += births
            cell[1] += births / tfr if tfr > 0 else 0.0
            cell[2] += pop


def main(medium, other, out):
    acc = {}
    accumulate(medium, acc)
    accumulate(other, acc)
    result = {'source': 'UN WPP 2024 Demographic Indicators, Medium and Low variants, aggregated to model regions',
              'variants': {}}
    for v in VARIANTS:
        regions = {}
        world_pop = {}
        for r in REGIONS:
            series = acc[v][r]
            regions[r] = {str(y): series[y][0] / series[y][1] for y in YEARS if series[y][1] > 0}
            for y in YEARS:
                world_pop[y] = world_pop.get(y, 0.0) + series[y][2] * 1000.0
        peak_year = max(world_pop, key=world_pop.get)
        result['variants'][v] = {
            'tfr': regions,
            'worldPopulation': {str(y): world_pop[y] for y in YEARS},
            'peak': {'year': peak_year, 'population': world_pop[peak_year]},
        }
        print(f'{v}: world peak {world_pop[peak_year] / 1e9:.3f}B in {peak_year}; 2100 {world_pop[2100] / 1e9:.3f}B')
        print(f'  {"region":12s} ' + ' '.join(f'{y:>6d}' for y in (2025, 2035, 2050, 2075, 2100)))
        for r in REGIONS:
            print(f'  {r:12s} ' + ' '.join(f'{regions[r][str(y)]:6.2f}' for y in (2025, 2035, 2050, 2075, 2100)))
    if out:
        with open(out, 'w', encoding='utf-8') as fh:
            json.dump(result, fh, indent=1)
        print('wrote', out)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
