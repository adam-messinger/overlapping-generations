"""World capital aggregates from Penn World Table 10.01 (calibration check).

Reproduces the numbers behind capital.ts's depreciation default:
capital-weighted depreciation (delta x cn), K/Y, investment share at
current PPPs, and world capital growth at constant national prices
converted at 2017 PPPs.

Data: PWT 10.01 Stata file, https://dataverse.nl/api/access/datafile/354098
(Feenstra, Inklaar & Timmer 2015, AER 105(10); www.ggdc.net/pwt).

Usage: python3 scripts/pwt-capital-aggregates.py /path/to/pwt1001.dta
"""
import sys

import pandas as pd


def main(path: str) -> None:
    d = pd.read_stata(path)
    cols = ['countrycode', 'year', 'rgdpna', 'rnna', 'delta', 'csh_i', 'cn', 'cgdpo']
    d = d[cols].dropna()
    print('year  delta(cn-wtd)  K/Y(cn/cgdpo)  I/Y(csh_i)')
    for y in [1990, 1995, 2000, 2005, 2010, 2015, 2019]:
        s = d[d.year == y]
        delta = (s.delta * s.cn).sum() / s.cn.sum()
        ky = s.cn.sum() / s.cgdpo.sum()
        iy = (s.csh_i * s.cgdpo).sum() / s.cgdpo.sum()
        print(f'{y}  {delta:.4f}        {ky:.2f}           {iy:.3f}')
    base = d[d.year == 2017].set_index('countrycode')
    g = d.join((base.cn / base.rnna).rename('kconv'), on='countrycode')
    g = g.join((base.cgdpo / base.rgdpna).rename('yconv'), on='countrycode').dropna()
    agg = g.assign(K=g.rnna * g.kconv, Y=g.rgdpna * g.yconv).groupby('year')[['K', 'Y']].sum()
    for a, b in [(1990, 2000), (2000, 2010), (2010, 2019), (1990, 2019)]:
        kg = (agg.K[b] / agg.K[a]) ** (1 / (b - a)) - 1
        yg = (agg.Y[b] / agg.Y[a]) ** (1 / (b - a)) - 1
        print(f'{a}-{b}: K {kg * 100:.2f}%/yr, Y {yg * 100:.2f}%/yr')


if __name__ == '__main__':
    main(sys.argv[1])
