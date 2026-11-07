#!/usr/bin/env python3
"""Regional life expectancy at birth and at 65 from UN WPP 2024, aggregated to the model's regions.

capital.ts reclassifies part of the 65+ population as still working as
retirement ages follow life expectancy. Two things need life expectancy AT
65 (e65), not at birth: the OECD-style link of retirement ages to gains in
longevity is a link to e65 gains, and the share of the 65+ population inside
the first x years past 65 is ~x / e65. At-birth gains in low-LE regions are
mostly child survival, which neither lengthens retirement nor moves anyone's
pension age.

This prints, per region, 2025 e0 and e65, and the ratio of e65 gains to e0
gains along the WPP Medium path (2025-2050 and 2025-2075). capital.ts holds
the 2025 e65 table and maps the demographics module's e0 path onto e65 with
the 2025-2075 ratio.

Regions are population-weighted (TPopulation1July). The 65+ population would
be the better weight for e65; total population is what this file carries, and
the two differ little inside each model region.

Input (download, then pass the path):
  https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_Demographic_Indicators_Medium.csv.gz

Usage:
  python3 -I scripts/wpp-life-expectancy-65.py <WPP2024_Demographic_Indicators_Medium.csv.gz>

Stdlib only. The ISO3 -> region map is shared with scripts/wpp-age-structure.py.
"""
import csv
import gzip
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('wpp_age', os.path.join(HERE, 'wpp-age-structure.py'))
_age = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_age)
R, REGIONS = _age.R, _age.REGIONS

YEARS = (2025, 2050, 2075)


def main(path):
    acc = {}  # region -> year -> [pop, pop*e0, pop*e65]
    with gzip.open(path, 'rt', encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh):
            if row['Variant'] != 'Medium' or row['LocTypeID'] != '4':
                continue
            region = R.get(row['ISO3_code'])
            year = int(row['Time'])
            if region is None or year not in YEARS:
                continue
            try:
                pop = float(row['TPopulation1July'])
                e0 = float(row['LEx'])
                e65 = float(row['LE65'])
            except ValueError:
                continue
            cell = acc.setdefault(region, {}).setdefault(year, [0.0, 0.0, 0.0])
            cell[0] += pop
            cell[1] += pop * e0
            cell[2] += pop * e65
    print(f'{"region":12s} {"e0 2025":>8s} {"e65 2025":>9s} {"de65/de0 2050":>14s} {"de65/de0 2075":>14s}')
    for r in REGIONS:
        v = {y: (c[1] / c[0], c[2] / c[0]) for y, c in acc[r].items()}
        e0, e65 = v[2025]
        ratios = []
        for y in (2050, 2075):
            d0 = v[y][0] - e0
            ratios.append((v[y][1] - e65) / d0 if d0 > 0 else float('nan'))
        print(f'{r:12s} {e0:8.1f} {e65:9.1f} {ratios[0]:14.2f} {ratios[1]:14.2f}')


if __name__ == '__main__':
    main(sys.argv[1])
