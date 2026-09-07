#!/usr/bin/env python3
"""Human-capital backcast, 1925-2025, by model region.

Companion to docs/HUMAN_CAPITAL_TRAJECTORY.md. The simulation starts in 2025, so
the century before it is reconstructed from observed data and priced with the
humanCapital ledger's replacement-cost multipliers (rearing + schooling +
foregone earnings as multiples of GDP per capita: none 4.8, primary 6.0,
secondary 9.0, tertiary 13.6, advanced 18.1; src/modules/human-capital.ts).

Inputs (download into a directory and pass it as argv[1]):
  OUP_long_MF2564_v1.csv, OUP_long_MF1524_v1.csv   Lee and Lee (2016) attainment 1870-2010,
  OUP_proj_MF2564_v1.csv, OUP_proj_MF1524_v1.csv   and projections 2015-2040, ages 25-64 / 15-24
      https://barrolee.github.io/BarroLeeDataSet/OUP/<file>
  BL_v3_MF.csv                                      Barro-Lee v3 by 10-year age group, 1950-2015
      https://barrolee.github.io/BarroLeeDataSet/BLData/BL_v3_MF.csv
  wpp-age5.csv                                      UN WPP 2024 population by 5-year age group (medium)
      https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_PopulationByAge5GroupSex_Medium.csv.gz
  maddison.csv, population.csv                      Our World in Data grapher CSVs:
      https://ourworldindata.org/grapher/gdp-per-capita-maddison-project-database.csv?csvType=full&useColumnShortNames=true
      https://ourworldindata.org/grapher/population.csv?csvType=full&useColumnShortNames=true

Method: stock = population 25-64 x attainment mix (ages 25-64) x band cost; entrants =
population 20-24 / 5 with the attainment mix of ages 15-24 five years later (so tertiary
in progress counts as attained). Constant-cost stock holds each region's 2025 GDP per
capita fixed; investment/GDP and stock/GDP are GDP-level independent by construction.
Before 1950, Lee-Lee's covered countries are scaled to the region's total population.
Writes data/human-capital/backcast-regions.csv, backcast-world.csv, backcast-netratio.csv.
Requires pandas.
"""
import pandas as pd, numpy as np, json, sys
D = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'data/human-capital'
YEARS = list(range(1925, 2030, 5))
MULT = {'none': 4.8, 'primary': 6.0, 'secondary': 9.0, 'tertiary': 13.6, 'advanced': 18.1}
LIFE = {'none': 30, 'primary': 32, 'secondary': 37, 'tertiary': 39, 'advanced': 38}   # OECD expected working lives (docs/HUMAN_CAPITAL.md)
ENTRY = {'none': 16, 'primary': 16, 'secondary': 18, 'tertiary': 22, 'advanced': 26}
ADV_SHARE = {'us': .35, 'oecd-ex-us': .28, 'china': .15, 'india': .15, 'latam': .10, 'seasia': .10, 'russia': .25, 'mena': .12, 'ssa': .08}

R = {}
def m(region, codes):
    for c in codes.split(): R[c] = region
m('us', 'USA')
m('china', 'CHN HKG MAC TWN')
m('india', 'IND PAK BGD LKA NPL BTN MDV AFG')
m('russia', 'RUS UKR BLR MDA KAZ UZB TKM KGZ TJK ARM AZE GEO')
m('mena', 'DZA EGY LBY MAR TUN SDN IRN IRQ SYR JOR LBN SAU YEM OMN ARE QAT KWT BHR PSE ESH')
m('oecd-ex-us', 'AUS AUT BEL CAN CHL COL CRI CZE DNK EST FIN FRA DEU GRC HUN ISL IRL ISR ITA JPN KOR LVA LTU LUX MEX NLD NZL NOR POL PRT SVK SVN ESP SWE CHE TUR GBR '
     'ALB BIH BGR HRV CYP MLT MKD MNE ROU ROM SRB SER XKX AND LIE MCO SMR VAT GIB FRO GRL IMN JEY GGY OWID_KOS')
m('latam', 'ARG BOL BRA CUB DOM ECU GTM GUY HND HTI JAM NIC PAN PER PRY SLV TTO URY VEN BLZ BRB BHS SUR PRI ATG DMA GRD KNA LCA VCT ABW CUW SXM BMU CYM TCA VGB VIR AIA MSR GLP MTQ GUF BLM MAF SPM BES')
m('seasia', 'IDN MYS PHL SGP THA VNM KHM LAO MMR BRN TLS MNG PRK PNG FJI TON WSM SLB VUT KIR FSM MHL NRU PLW TUV NCL PYF GUM ASM MNP COK NIU TKL WLF')
m('ssa', 'AGO BDI BEN BFA BWA CAF CIV CMR COD COG COM CPV DJI ERI ETH GAB GHA GIN GMB GNB GNQ KEN LBR LSO MDG MLI MOZ MRT MUS MWI MYT NAM NER NGA REU RWA SEN SHN SLE SOM SSD STP SWZ SYC TCD TGO TZA UGA ZAF ZMB ZWE')
REGIONS = ['us', 'oecd-ex-us', 'china', 'india', 'latam', 'seasia', 'russia', 'mena', 'ssa']

# --- population (total, all years) and WPP by age (1950+)
pop = pd.read_csv(f'{D}/population.csv').dropna(subset=['code']); pop = pop[pop.code.isin(R)]
ppiv = pop.pivot(index='year', columns='code', values='population_historical').reindex(range(1900, 2026)).interpolate(limit_area='inside').ffill(limit=5)
pop = ppiv.stack().rename('population_historical').reset_index().rename(columns={'level_1': 'code'})
pop = pop[pop.year.isin(YEARS)].copy(); pop['region'] = pop.code.map(R)
unm = pd.read_csv(f'{D}/population.csv').dropna(subset=['code']); unm = unm[(unm.year == 2020) & ~unm.code.isin(R) & ~unm.code.str.startswith('OWID')]
print('unmapped codes (2020 pop):', unm[['code', 'population_historical']].sort_values('population_historical', ascending=False).head(12).values.tolist(), file=sys.stderr)
regpop = pop.groupby(['region', 'year']).population_historical.sum().unstack('year')

w = pd.read_csv(f'{D}/wpp-age5.csv', usecols=['ISO3_code', 'LocTypeID', 'Time', 'AgeGrpStart', 'PopTotal'], low_memory=False)
w = w[(w.LocTypeID == 4) & w.Time.isin(YEARS) & w.ISO3_code.isin(R)].copy(); w['region'] = w.ISO3_code.map(R)
def wsum(lo, hi):
    x = w[(w.AgeGrpStart >= lo) & (w.AgeGrpStart <= hi)]
    return x.groupby(['region', 'Time']).PopTotal.sum().unstack('Time') * 1e3
wpp2564 = wsum(25, 60); wpp2024 = wsum(20, 20); wpp_all = wsum(0, 100)
wpp_age = w[(w.AgeGrpStart >= 25) & (w.AgeGrpStart <= 60)].groupby(['region', 'Time', 'AgeGrpStart']).PopTotal.sum() * 1e3

# --- Lee-Lee / OUP long-run attainment (1870-2040, 5-yr), ages 25-64 and 15-24
def oup(ages):
    x = pd.concat([pd.read_csv(f'{D}/OUP_long_MF{ages}_v1.csv'), pd.read_csv(f'{D}/OUP_proj_MF{ages}_v1.csv')])
    x = x[x.WBcode.isin(R) & x.year.isin(range(1920, 2045, 5))].copy(); x['region'] = x.WBcode.map(R); return x
o64 = oup('2564'); o24 = oup('1524')
def bands_from(row_or_df, tert_col='lhc'):
    """attainment shares (%) -> band shares. lu none, lp primary, ls secondary (+ incomplete tertiary), tertiary = tert_col"""
    d = row_or_df
    tert = d[tert_col] / 100
    sec = (d.ls + (d.lh - d[tert_col] if tert_col == 'lhc' else 0)) / 100
    return pd.DataFrame({'none': d.lu / 100, 'primary': d.lp / 100, 'secondary': sec, 'tertiary_all': tert})
def region_shares(x, tert_col):
    b = bands_from(x, tert_col); cols = ['none', 'primary', 'secondary', 'tertiary_all']
    b = b.mul(x['pop'].values, axis=0); b['w'] = x['pop'].values; b['region'] = x.region.values; b['year'] = x.year.values
    g = b.groupby(['region', 'year']).sum(numeric_only=True)
    return g[cols].div(g['w'], axis=0)
stock_sh = region_shares(o64, 'lhc')           # 25-64 attainment, completed tertiary
entr_sh = region_shares(o24, 'lh')             # 15-24 attainment, any tertiary (in progress counts) -> used at t+5 for entrants at t
cov64 = o64.groupby(['region', 'year'])['pop'].sum().unstack('year') * 1e3   # covered pop 25-64
cov24 = o24.groupby(['region', 'year'])['pop'].sum().unstack('year') * 1e3
covtot = pop[pop.code.isin(set(o64.WBcode))].groupby(['region', 'year']).population_historical.sum().unstack('year')

# --- Barro-Lee v3 by 10-yr age group (1950-2015) for net stock and a cross-check of the entrant mix
bl = pd.read_csv(f'{D}/BL_v3_MF.csv'); bl = bl[bl.WBcode.isin(R)].copy(); bl['region'] = bl.WBcode.map(R)

# --- GDP per capita (Maddison, 2011$) by region: pop-weighted over countries with data
md = pd.read_csv(f'{D}/maddison.csv').dropna(subset=['code']); md = md[md.code.isin(R)]
# log-linear interpolation within each country's observed range (Maddison benchmark years are sparse before 1950)
piv = md.pivot(index='year', columns='code', values='gdp_per_capita').reindex(range(1900, 2026))
piv = np.exp(np.log(piv).interpolate(limit_area='inside')); piv = piv.ffill(limit=3)   # hold 2022 for 2023-25
md = piv.stack().rename('gdp_per_capita').reset_index().rename(columns={'level_1': 'code'})
md = md.merge(pop[['code', 'year', 'population_historical']], on=['code', 'year'])
md['gdp'] = md.gdp_per_capita * md.population_historical; md['region'] = md.code.map(R)
g = md.groupby(['region', 'year']); gdppc = (g.gdp.sum() / g.population_historical.sum()).unstack('year')[YEARS]
print('gdppc coverage 1925 (share of region pop with data):', (g.population_historical.sum().unstack('year')[1925] / regpop[1925]).round(2).to_dict(), file=sys.stderr)

# --- assemble
rows = []
for r in REGIONS:
    for y in YEARS:
        total = regpop.loc[r, y]
        if y >= 1950:
            p2564 = wpp2564.loc[r, y]; ent = wpp2024.loc[r, y] / 5
        else:  # scale Lee-Lee covered age groups by total-population coverage
            scale = total / covtot.loc[r, y]
            p2564 = cov64.loc[r, y] * scale; ent = cov24.loc[r, y] * scale / 10
        s = stock_sh.loc[(r, y)]; e = entr_sh.loc[(r, min(y + 5, 2040))]
        def split(sh):
            d = dict(sh); ta = d.pop('tertiary_all'); d['advanced'] = ta * ADV_SHARE[r]; d['tertiary'] = ta * (1 - ADV_SHARE[r]); return d
        s, e = split(s), split(e)
        mult_s = sum(s[b] * MULT[b] for b in MULT); mult_e = sum(e[b] * MULT[b] for b in MULT)
        rows.append(dict(region=r, year=y, pop=total, pop2564=p2564, entrants=ent, gdppc=gdppc.loc[r, y],
                         mult_stock=mult_s, mult_entrant=mult_e, tert_stock=s['tertiary'] + s['advanced'], tert_entr=e['tertiary'] + e['advanced'],
                         none_stock=s['none'], sec_stock=s['secondary'],
                         gross_const=p2564 * mult_s * gdppc.loc[r, 2025],          # constant 2025 regional cost
                         gross_cur=p2564 * mult_s * gdppc.loc[r, y],
                         inv_cur=ent * mult_e * gdppc.loc[r, y], gdp=total * gdppc.loc[r, y]))
df = pd.DataFrame(rows)
df['inv_gdp'] = df.inv_cur / df.gdp; df['stock_gdp'] = df.gross_cur / df.gdp; df['entrant_share'] = df.entrants / df['pop']
df['dep_cur'] = df.gross_cur / 36.5   # straight-line over ~36.5 yr avg expected working life (gross/L approximates steady-state depreciation)
df.to_csv(f'{OUT}/backcast-regions.csv', index=False)

# net stock 1950-2015 from BL v3 10-year groups (book value = 1 - yearsSinceEntry / life)
net_rows = []
for (r, y), grp in bl.groupby(['region', 'year']):
    net = gross = 0.0
    for _, a in grp.iterrows():
        if a.agefrom < 25: continue
        mid = (a.agefrom + a.ageto + 1) / 2
        ta = a.lhc / 100; d = {'none': a.lu / 100, 'primary': a.lp / 100, 'secondary': (a.ls + a.lh - a.lhc) / 100, 'advanced': ta * ADV_SHARE[r], 'tertiary': ta * (1 - ADV_SHARE[r])}
        for b, sh in d.items():
            v = a['pop'] * 1e3 * sh * MULT[b]; gross += v; net += v * max(0.0, 1 - (mid - ENTRY[b]) / LIFE[b])
    net_rows.append(dict(region=r, year=y, net_over_gross=net / gross, bl_pop2564=grp[grp.agefrom >= 25]['pop'].sum() * 1e3))
nd = pd.DataFrame(net_rows); nd.to_csv(f'{OUT}/backcast-netratio.csv', index=False)

# world
wd = df.groupby('year').agg(pop=('pop', 'sum'), pop2564=('pop2564', 'sum'), entrants=('entrants', 'sum'), gross_const=('gross_const', 'sum'), gross_cur=('gross_cur', 'sum'), inv_cur=('inv_cur', 'sum'), gdp=('gdp', 'sum'), dep_cur=('dep_cur', 'sum'))
wd['inv_gdp'] = wd.inv_cur / wd.gdp; wd['stock_gdp'] = wd.gross_cur / wd.gdp; wd['entrant_share'] = wd.entrants / wd['pop']
wd['tert_stock'] = (df.tert_stock * df.pop2564).groupby(df.year).sum() / wd.pop2564
wd.to_csv(f'{OUT}/backcast-world.csv')
pd.set_option('display.width', 250); pd.set_option('display.max_columns', 30); pd.set_option('display.float_format', lambda v: f'{v:,.3f}')
print('\nWORLD'); print(wd.assign(idx=wd.gross_const / wd.gross_const[2025], pop2564_idx=wd.pop2564 / wd.pop2564[2025])[['pop2564', 'pop2564_idx', 'idx', 'tert_stock', 'entrant_share', 'inv_gdp', 'stock_gdp', 'entrants']])
for r in REGIONS:
    x = df[df.region == r].set_index('year')
    print(f'\n{r}'); print(x.assign(idx=x.gross_const / x.gross_const[2025], pop_idx=x.pop2564 / x.pop2564[2025])[['pop2564', 'pop_idx', 'idx', 'mult_stock', 'tert_stock', 'none_stock', 'tert_entr', 'entrant_share', 'inv_gdp', 'stock_gdp', 'gdppc']])
print('\nNET/GROSS (BL v3 age structure)'); print(nd.pivot(index='year', columns='region', values='net_over_gross').round(3))
