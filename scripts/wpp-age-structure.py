#!/usr/bin/env python3
"""Derive the model's 2025 regional age structure from UN WPP 2024.

The demographics module ages its young (0-19) and working (20-64) cohorts
through 5-year age bands. This script produces the seeds: for each of the
model's nine regions, 2025 population in each 5-year band 0-4 ... 60-64 plus
65+, and the shares the module reads (young / working / old, and each band's
share of its cohort).

WPP is used here only for the CURRENT age structure (people already born).
The model's fertility path is calibrated separately, to Fernandez-Villaverde
and Norrick (2026), not to any UN projection variant.

Input (download, then pass the path):
  https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_PopulationByAge5GroupSex_Medium.csv.gz
  2025 sits two years past WPP 2024's last estimate year (2023), so it is
  close to the same in every variant: the 2025 cohorts are already born.

Usage:
  python3 -I scripts/wpp-age-structure.py <WPP2024_PopulationByAge5GroupSex_Medium.csv.gz> [out.json]

Stdlib only. The ISO3 -> region map mirrors scripts/human-capital-backcast.py;
keep the two in step.
"""
import csv
import gzip
import json
import sys

YEAR = 2025
YOUNG_BANDS = [0, 5, 10, 15]                          # 0-4 ... 15-19
WORKING_BANDS = [20, 25, 30, 35, 40, 45, 50, 55, 60]  # 20-24 ... 60-64
REGIONS = ['us', 'oecd-ex-us', 'china', 'india', 'latam', 'seasia', 'russia', 'mena', 'ssa']

R = {}
def m(region, codes):
    for c in codes.split():
        R[c] = region
m('us', 'USA')
m('china', 'CHN HKG MAC TWN')
m('india', 'IND PAK BGD LKA NPL BTN MDV AFG')
m('russia', 'RUS UKR BLR MDA KAZ UZB TKM KGZ TJK ARM AZE GEO')
m('mena', 'DZA EGY LBY MAR TUN SDN IRN IRQ SYR JOR LBN SAU YEM OMN ARE QAT KWT BHR PSE ESH TUR')
m('oecd-ex-us', 'AUS AUT BEL CAN CZE DNK EST FIN FRA DEU GRC HUN ISL IRL ISR ITA JPN KOR LVA LTU LUX NLD NZL NOR POL PRT SVK SVN ESP SWE CHE GBR '
     'ALB BIH BGR HRV CYP MLT MKD MNE ROU ROM SRB SER XKX AND LIE MCO SMR VAT GIB FRO GRL IMN JEY GGY OWID_KOS')
m('latam', 'MEX CHL COL CRI ARG BOL BRA CUB DOM ECU GTM GUY HND HTI JAM NIC PAN PER PRY SLV TTO URY VEN BLZ BRB BHS SUR PRI ATG DMA GRD KNA LCA VCT ABW CUW SXM BMU CYM TCA VGB VIR AIA MSR GLP MTQ GUF BLM MAF SPM BES')
m('seasia', 'IDN MYS PHL SGP THA VNM KHM LAO MMR BRN TLS MNG PRK PNG FJI TON WSM SLB VUT KIR FSM MHL NRU PLW TUV NCL PYF GUM ASM MNP COK NIU TKL WLF')
m('ssa', 'AGO BDI BEN BFA BWA CAF CIV CMR COD COG COM CPV DJI ERI ETH GAB GHA GIN GMB GNB GNQ KEN LBR LSO MDG MLI MOZ MRT MUS MWI MYT NAM NER NGA REU RWA SEN SHN SLE SOM SSD STP SWZ SYC TCD TGO TZA UGA ZAF ZMB ZWE')


def main(src, out):
    pop = {r: {} for r in REGIONS}           # region -> age start -> persons
    world = {}
    unmapped = {}
    with gzip.open(src, 'rt', encoding='utf-8-sig') as fh:
        for row in csv.DictReader(fh):
            if row['Time'] != str(YEAR) or row['LocTypeID'] != '4':   # 4 = country/area
                continue
            age = int(float(row['AgeGrpStart']))
            persons = float(row['PopTotal']) * 1000.0                 # WPP reports thousands
            band = min(age, 65)                                        # fold 65+ into one bucket
            world[band] = world.get(band, 0.0) + persons
            region = R.get(row['ISO3_code'])
            if region is None:
                unmapped[row['ISO3_code']] = unmapped.get(row['ISO3_code'], 0.0) + persons
                continue
            pop[region][band] = pop[region].get(band, 0.0) + persons

    result = {'source': 'UN WPP 2024, population by 5-year age group, medium variant, year 2025',
              'year': YEAR, 'regions': {}}
    for r in REGIONS:
        p = pop[r]
        young = sum(p.get(a, 0.0) for a in YOUNG_BANDS)
        working = sum(p.get(a, 0.0) for a in WORKING_BANDS)
        old = p.get(65, 0.0)
        total = young + working + old
        result['regions'][r] = {
            'population': total,
            'young': young / total, 'working': working / total, 'old': old / total,
            'youngBandShares': [p.get(a, 0.0) / young for a in YOUNG_BANDS],
            'workingBandShares': [p.get(a, 0.0) / working for a in WORKING_BANDS],
            'personsByBand': {f'{a}-{a + 4}' if a < 65 else '65+': p.get(a, 0.0) for a in YOUNG_BANDS + WORKING_BANDS + [65]},
        }
    mapped_total = sum(v['population'] for v in result['regions'].values())
    world_total = sum(world.values())
    result['coverage'] = mapped_total / world_total
    result['largestUnmapped'] = sorted(unmapped.items(), key=lambda kv: -kv[1])[:8]

    print(f'coverage of world population: {result["coverage"]:.4f}')
    print('largest unmapped (persons):', [(k, round(v)) for k, v in result['largestUnmapped']])
    print(f'{"region":12s} {"pop(B)":>7s} {"young":>6s} {"work":>6s} {"old":>6s}  working-band shares 20-24..60-64')
    for r, v in result['regions'].items():
        bands = ' '.join(f'{x:.3f}' for x in v['workingBandShares'])
        print(f'{r:12s} {v["population"] / 1e9:7.3f} {v["young"]:6.3f} {v["working"]:6.3f} {v["old"]:6.3f}  {bands}')
    if out:
        with open(out, 'w', encoding='utf-8') as fh:
            json.dump(result, fh, indent=1)
        print('wrote', out)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
