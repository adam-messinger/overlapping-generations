#!/usr/bin/env python3
"""Backcast the safe-rate equation in capital.ts against advanced-economy history.

capital.safeRate = neutralSafeRate
                 + c * (trendGrowth - anchor)           # safeRateGrowthPassThrough
                 + s * (publicDebt/GDP - 2025 level)    # safeRateDebtSensitivity
with trendGrowth a 10-year exponential smoother of realized growth
(trendGrowthSmoothingYears). The model anchors the level at 2025 and runs
forward. This script anchors the same equation at 2019 (the last clean year of
the panel) and runs it BACKWARD, scoring each (c, N, s) by RMSE and bias
against realized real long rates. It also runs plain regressions (levels,
10-year changes, country and year fixed effects), a demographic alternative,
and a 2019 -> 2024-26 US out-of-sample check.

Inputs (download, then pass the directory holding them):
  JSTdatasetR6.dta   Jorda-Schularick-Taylor Macrohistory Database R6
                     https://www.macrohistory.net/app/download/9834512469/JSTdatasetR6.xlsx
                     (served as a Stata file despite the .xlsx name; save as .dta)
  wdi_dep.json       WDI old-age dependency (65+/15-64), high income + world
                     https://api.worldbank.org/v2/country/HIC;WLD/indicator/SP.POP.DPND.OL?format=json&per_page=400
  REAINTRATREARAT10Y.csv, GDPC1.csv, GFDEGDQ188S.csv
                     https://fred.stlouisfed.org/graph/fredgraph.csv?id=<series>
                     (Cleveland Fed 10y real rate; US real GDP; US federal debt % GDP)

Usage:
  python3 -I scripts/safe-rate-backcast.py <download-dir> [out.csv]

Definitions: real long rate = JST ltrate less trailing 3-year CPI inflation
(adaptive expectations; --expost uses the next 3 years instead). Aggregate =
PPP-weighted (Maddison rgdpmad x pop) mean over the 18 JST economies; JST's
nominal `gdp` is in mixed units across countries and cannot weight. Debt is
JST debtgdp (central/general government, as JST reports it).
"""
import itertools
import json
import os
import sys

import numpy as np
import pandas as pd

ANCHOR = 2019


def smooth(s, n):
    out, t = [], np.nan
    for v in s.values:
        if np.isnan(t):
            t = v
        elif not np.isnan(v):
            t = t + (v - t) / n
        out.append(t)
    return pd.Series(out, index=s.index)


def ols(y, cols):
    x = np.column_stack([np.ones(len(y))] + cols)
    b, *_ = np.linalg.lstsq(x, y, rcond=None)
    res = y - x @ b
    s2 = res @ res / (len(y) - x.shape[1])
    se = np.sqrt(np.diag(s2 * np.linalg.inv(x.T @ x)))
    return b, se, np.sqrt(np.mean(res ** 2)), 1 - res.var() / y.var()


def load_panel(path, expost):
    d = pd.read_stata(path).sort_values(['country', 'year'])
    g = d.groupby('country')
    d['g'] = g['rgdpbarro'].transform(lambda s: s) * d['pop']
    d['g'] = d.groupby('country')['g'].pct_change()
    infl = g['cpi'].pct_change()
    d['infl'] = infl
    roll = d.groupby('country')['infl'].transform(lambda s: s.rolling(3).mean())
    d['exp_infl'] = d.groupby('country')['infl'].transform(lambda s: s.rolling(3).mean().shift(-3)) if expost else roll
    d['r_long'] = d['ltrate'] / 100 - d['exp_infl']
    d['w'] = d['rgdpmad'] * d['pop']
    for n in (5, 10, 20):
        d[f'T{n}'] = d.groupby('country')['g'].transform(lambda s, n=n: smooth(s, n))
    return d


def aggregate(d, cols):
    rows = {}
    for yr, x in d[d['w'].notna()].groupby('year'):
        rows[yr] = {c: np.average(x[c][x[c].notna()], weights=x['w'][x[c].notna()]) if x[c].notna().any() else np.nan
                    for c in cols}
    return pd.DataFrame.from_dict(rows, orient='index')


def main():
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    expost = '--expost' in sys.argv
    d = load_panel(os.path.join(src, 'JSTdatasetR6.dta'), expost)
    a = aggregate(d, ['r_long', 'g', 'T5', 'T10', 'T20', 'debtgdp'])
    dep = json.load(open(os.path.join(src, 'wdi_dep.json')))[1]
    a['dep'] = pd.Series({int(x['date']): x['value'] / 100 for x in dep
                          if x['country']['id'] == 'XD' and x['value'] is not None})
    if out:
        a.round(5).to_csv(out, index_label='year')

    print(f"Real long rate, inflation expectations: {'ex-post next 3y' if expost else 'trailing 3y'}\n")
    print('1. Decade averages, 18-economy PPP-weighted aggregate (%; debt ratio)')
    dec = a.loc[1950:2019].groupby((a.loc[1950:2019].index // 10) * 10).mean()
    print((dec[['r_long', 'g', 'T10']] * 100).round(2).assign(debt=dec['debtgdp'].round(2)).to_string(), '\n')

    print('2. Levels regressions on the aggregate (coef (se); RMSE pp)')
    for lo in (1960, 1980):
        x = a.loc[lo:ANCHOR].dropna(subset=['r_long', 'T10', 'debtgdp', 'dep'])
        for lab, cols in [('growth', ['T10']), ('growth+debt', ['T10', 'debtgdp']),
                          ('ageing', ['dep']), ('growth+ageing+debt', ['T10', 'dep', 'debtgdp'])]:
            b, se, rmse, r2 = ols(x['r_long'].values, [x[c].values for c in cols])
            terms = '  '.join(f'{c}={b[i + 1]:+.2f}({se[i + 1]:.2f})' for i, c in enumerate(cols))
            print(f'  {lo}-{ANCHOR} {lab:19s} {terms:52s} RMSE {rmse * 100:.2f} R2 {r2:.2f}')
    x = a.loc[1980:ANCHOR].dropna(subset=['r_long', 'T10'])
    b, *_ = ols(x['r_long'].values, [x['T10'].values])
    res = x['r_long'].values - (b[0] + b[1] * x['T10'].values)
    print(f'  residual lag-1 autocorrelation (growth only, 1980-{ANCHOR}): {np.corrcoef(res[1:], res[:-1])[0, 1]:.2f}'
          ' -> standard errors overstate precision\n')

    print('3. Panel with country fixed effects (1,000+ country-years): does a country\'s OWN growth move its rate?')
    p = d[(d['year'] >= 1950) & (d['year'] <= ANCHOR)].dropna(subset=['r_long', 'T10', 'debtgdp'])
    for lab, q in [(f'1950-{ANCHOR}', p), (f'1980-{ANCHOR}', p[p['year'] >= 1980])]:
        cols = ['r_long', 'T10', 'debtgdp']
        dm = q[cols] - q.groupby('country')[cols].transform('mean')
        b1, se1, *_ = ols(dm['r_long'].values, [dm['T10'].values, dm['debtgdp'].values])
        dy = dm - dm.groupby(q['year']).transform('mean')
        b2, se2, *_ = ols(dy['r_long'].values, [dy['T10'].values, dy['debtgdp'].values])
        print(f'  {lab}: country FE c={b1[1]:+.2f}({se1[1]:.2f}) | country+year FE c={b2[1]:+.2f}({se2[1]:.2f})'
              f'  s={b2[2] * 100:+.1f}bp/pp  n={len(q)}')
    print()

    print(f'4. The model equation, anchored at {ANCHOR} and run backward (RMSE / bias pp; bias = predicted - actual)')
    r0 = a.loc[ANCHOR - 2:ANCHOR, 'r_long'].mean()
    rows = []
    for c, n, s in itertools.product([0, 0.5, 1.0, 1.5, 2.0, 3.0], [5, 10, 20], [0, 0.03, 0.065, 0.10]):
        pred = r0 + c * (a[f'T{n}'] - a.loc[ANCHOR, f'T{n}']) + s * (a['debtgdp'] - a.loc[ANCHOR, 'debtgdp'])
        for lo in (1960, 1980, 1990):
            e = (pred - a['r_long']).loc[lo:ANCHOR].dropna()
            rows.append(dict(c=c, N=n, s=s, window=f'{lo}-{ANCHOR}', rmse=np.sqrt((e ** 2).mean()) * 100, bias=e.mean() * 100))
    g = pd.DataFrame(rows)
    print('  RMSE by pass-through c (N=10, s=0.03, the model default s):')
    print(g[(g['N'] == 10) & (g['s'] == 0.03)].pivot(index='c', columns='window', values='rmse').round(2).to_string())
    print('  Best five per window:')
    for w in sorted(g['window'].unique()):
        print(g[g['window'] == w].sort_values('rmse').head(5).to_string(index=False, float_format='%.2f'))
    print()

    print('5. US out of sample, 2019 -> 2024-26 average (Cleveland Fed 10y real rate)')
    fred = lambda s: pd.read_csv(os.path.join(src, f'{s}.csv'), parse_dates=[0], index_col=0, na_values='.').iloc[:, 0]
    r = fred('REAINTRATREARAT10Y'); r = r.groupby(r.index.year).mean() / 100
    y = fred('GDPC1'); y = y.groupby(y.index.year).mean()
    debt = fred('GFDEGDQ188S'); debt = debt.groupby(debt.index.year).mean() / 100
    t10 = smooth(y.pct_change().dropna(), 10)
    us = pd.DataFrame({'r': r, 'T10': t10, 'debt': debt}).loc[1982:2026]
    act = (us['r'].loc[2024:2026].mean() - us['r'].loc[ANCHOR]) * 100
    dt = us['T10'].loc[2024:2026].mean() - us['T10'].loc[ANCHOR]
    dd = us['debt'].loc[2024:2026].mean() - us['debt'].loc[ANCHOR]
    print(f'  actual change {act:+.2f}pp; trend growth moved {dt * 100:+.2f}pp, federal debt {dd * 100:+.0f}pp of GDP')
    for c, s in [(1, 0.03), (0, 0.03), (2.5, 0), (1, 0.065), (0, 0.10)]:
        print(f'  c={c:<3} s={s * 100:>4.1f}bp/pp -> predicted {(c * dt + s * dd) * 100:+.2f}pp')
    print(f'  debt sensitivity that alone matches: {act / (dd * 100) * 100:.1f}bp per pp of debt/GDP')


if __name__ == '__main__':
    main()
