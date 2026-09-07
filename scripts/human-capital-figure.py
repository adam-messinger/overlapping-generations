#!/usr/bin/env python3
"""Small-multiples figure for docs/HUMAN_CAPITAL_TRAJECTORY.md: constant-cost gross
human-capital stock (people x education at fixed 2025 regional unit costs), 2025 = 1,
1925-2025 from data/human-capital/backcast-regions.csv (scripts/human-capital-backcast.py)
and 2025-2100 from the model's regional gross stock deflated by GDP per capita
(the same index scripts/human-capital-trajectory.ts prints). Writes an SVG.

Usage: python3 scripts/human-capital-figure.py <model-gross-index.csv> <out.svg>
where the first argument is a year x region CSV of the model's index (2025 = 1)."""
import csv, math, sys
model_csv, out = sys.argv[1], sys.argv[2]
NAMES = {'world': 'World', 'us': 'United States', 'oecd-ex-us': 'OECD ex-US', 'china': 'China', 'india': 'India + South Asia',
         'latam': 'Latin America', 'seasia': 'SE Asia + Pacific', 'russia': 'Russia + CIS', 'mena': 'MENA', 'ssa': 'Sub-Saharan Africa'}
ORDER = ['world', 'us', 'oecd-ex-us', 'china', 'india', 'latam', 'seasia', 'russia', 'mena', 'ssa']
hist = {k: {} for k in ORDER}
for r in csv.DictReader(open('data/human-capital/backcast-regions.csv')):
    hist[r['region']][int(r['year'])] = float(r['gross_const'])
for r in csv.DictReader(open('data/human-capital/backcast-world.csv')):
    hist['world'][int(r['year'])] = float(r['gross_const'])
for k in ORDER:
    base = hist[k][2025]; hist[k] = {y: v / base for y, v in sorted(hist[k].items())}
proj = {k: {} for k in ORDER}
for r in csv.DictReader(open(model_csv)):
    for k in ORDER: proj[k][int(r['year'])] = float(r[k])

# layout: 2 rows x 5 panels, log y
W, H = 1040, 560; cols, rows = 5, 2; ml, mt, gx, gy = 44, 62, 22, 54
pw = (W - ml - 12 - gx * (cols - 1)) / cols; ph = (H - mt - 28 - gy * (rows - 1)) / rows
Y0, Y1 = 1925, 2100; LO, HI = 0.03, 5.0
ticks = [0.05, 0.1, 0.2, 0.5, 1, 2, 4]
def sx(x0, y): return x0 + (y - Y0) / (Y1 - Y0) * pw
def sy(y0, v): return y0 + ph - (math.log(v) - math.log(LO)) / (math.log(HI) - math.log(LO)) * ph
INK, INK2, GRID, HIST, PROJ, SURF = '#0b0b0b', '#52514e', '#e6e5e1', '#2a78d6', '#86b6ef', '#fcfcfb'
o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Helvetica, Arial, sans-serif" font-size="10">',
     f'<rect width="{W}" height="{H}" fill="{SURF}"/>',
     f'<text x="{ml}" y="14" font-size="12" font-weight="600" fill="{INK}">Human capital at constant cost, 2025 = 1 (log scale)</text>',
     f'<text x="{ml}" y="26" fill="{INK2}">People aged 25-64 x education, priced at each region\'s 2025 replacement cost. Dark line: reconstructed 1925-2025. Light line: model 2025-2100.</text>']
for i, k in enumerate(ORDER):
    c, r = i % cols, i // cols
    x0 = ml + c * (pw + gx); y0 = mt + r * (ph + gy)
    for t in ticks:
        yy = sy(y0, t); o.append(f'<line x1="{x0}" x2="{x0 + pw}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="{GRID}" stroke-width="1"/>')
        if c == 0: o.append(f'<text x="{x0 - 6}" y="{yy + 3:.1f}" text-anchor="end" fill="{INK2}">{t:g}</text>')
    x25 = sx(x0, 2025); o.append(f'<line x1="{x25:.1f}" x2="{x25:.1f}" y1="{y0}" y2="{y0 + ph}" stroke="{GRID}" stroke-width="1"/>')
    for yr in (1925, 1975, 2025, 2075):
        o.append(f'<text x="{sx(x0, yr):.1f}" y="{y0 + ph + 13}" text-anchor="middle" fill="{INK2}">{yr}</text>')
    o.append(f'<text x="{x0}" y="{y0 - 6}" font-size="11" font-weight="600" fill="{INK}">{NAMES[k]}</text>')
    hp = ' '.join(f'{sx(x0, y):.1f},{sy(y0, v):.1f}' for y, v in hist[k].items())
    pp = ' '.join(f'{sx(x0, y):.1f},{sy(y0, v):.1f}' for y, v in sorted(proj[k].items()))
    o.append(f'<polyline points="{pp}" fill="none" stroke="{PROJ}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')
    o.append(f'<polyline points="{hp}" fill="none" stroke="{HIST}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')
    v0, v1 = hist[k][1925], proj[k][2100]
    o.append(f'<text x="{sx(x0, 1925) + 2:.1f}" y="{sy(y0, v0) + 13:.1f}" fill="{INK2}">{v0:.2f}</text>')
    o.append(f'<text x="{sx(x0, 2100) - 2:.1f}" y="{sy(y0, v1) + (14 if v1 < 1 else -5):.1f}" text-anchor="end" fill="{INK2}">{v1:.2f}</text>')
o.append('</svg>')
open(out, 'w').write('\n'.join(o))
print('wrote', out)
