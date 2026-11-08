"""Aggregate IMF World Economic Outlook country data to the model's nine regions.

Writes data/fiscal/imf-weo-regions.csv: per region, 2025 GDP at market exchange
rates (NGDPD, current USD bn) and at PPP (PPPGDP, current intl $ bn), general
government gross debt (GGXWDG_NGDP x NGDPD) and overall balance (GGXCNL_NGDP),
plus the IMF's own world aggregates for 2025 and 2031 as a check.

Source: IMF DataMapper API (https://www.imf.org/external/datamapper/api/v1/),
dataset "World Economic Outlook (October 2026)". Country-to-region mapping is
the one in scripts/wpp-age-structure.py (same nine regions as domain-types.ts).

Usage: python3 scripts/imf-fiscal-regions.py [cache_dir]
  cache_dir: optional directory holding imf_<INDICATOR>.json downloads; fetched if absent.
"""
import csv, json, os, sys, urllib.request

REGIONS = ['us', 'oecd-ex-us', 'china', 'india', 'latam', 'seasia', 'russia', 'mena', 'ssa']
R = {}
def m(region, codes):
    for c in codes.split():
        R[c] = region
# Same mapping as scripts/wpp-age-structure.py
m('us', 'USA')
m('china', 'CHN HKG MAC TWN')
m('india', 'IND PAK BGD LKA NPL BTN MDV AFG')
m('russia', 'RUS UKR BLR MDA KAZ UZB TKM KGZ TJK ARM AZE GEO')
m('mena', 'DZA EGY LBY MAR TUN SDN IRN IRQ SYR JOR LBN SAU YEM OMN ARE QAT KWT BHR PSE ESH TUR')
m('oecd-ex-us', 'AUS AUT BEL CAN CZE DNK EST FIN FRA DEU GRC HUN ISL IRL ISR ITA JPN KOR LVA LTU LUX NLD NZL NOR POL PRT SVK SVN ESP SWE CHE GBR '
     'ALB BIH BGR HRV CYP MLT MKD MNE ROU SRB XKX AND SMR')
m('latam', 'MEX CHL COL CRI ARG BOL BRA CUB DOM ECU GTM GUY HND HTI JAM NIC PAN PER PRY SLV TTO URY VEN BLZ BRB BHS SUR PRI ATG DMA GRD KNA LCA VCT ABW')
m('seasia', 'IDN MYS PHL SGP THA VNM KHM LAO MMR BRN TLS MNG PRK PNG FJI TON WSM SLB VUT KIR FSM MHL NRU PLW TUV')
m('ssa', 'AGO BDI BEN BFA BWA CAF CIV CMR COD COG COM CPV DJI ERI ETH GAB GHA GIN GMB GNB GNQ KEN LBR LSO MDG MLI MOZ MRT MUS MWI NAM NER NGA RWA SEN SLE SOM SSD STP SWZ SYC TCD TGO TZA UGA ZAF ZMB ZWE')

INDICATORS = ['NGDPD', 'PPPGDP', 'GGXWDG_NGDP', 'GGXCNL_NGDP']
cache = sys.argv[1] if len(sys.argv) > 1 else None

def load(ind):
    path = os.path.join(cache, f'imf_{ind}.json') if cache else None
    if path and os.path.exists(path):
        return json.load(open(path))['values'][ind]
    url = f'https://www.imf.org/external/datamapper/api/v1/{ind}?periods=2025,2026,2031'
    with urllib.request.urlopen(url, timeout=60) as r:
        d = json.load(r)
    if path:
        json.dump(d, open(path, 'w'))
    return d['values'][ind]

V = {ind: load(ind) for ind in INDICATORS}
def get(ind, iso, y):
    return V[ind].get(iso, {}).get(str(y))

agg = {r: dict(ngdpd=0.0, ppp=0.0, debt=0.0, bal=0.0, gdp_debt=0.0, gdp_bal=0.0) for r in REGIONS}
missing = []
for iso, region in R.items():
    gdp, ppp = get('NGDPD', iso, 2025), get('PPPGDP', iso, 2025)
    if gdp is None or ppp is None:
        continue
    a = agg[region]
    a['ngdpd'] += gdp
    a['ppp'] += ppp
    debt = get('GGXWDG_NGDP', iso, 2025)
    if debt is not None:
        a['debt'] += debt / 100 * gdp
        a['gdp_debt'] += gdp
    else:
        missing.append(iso)
    bal = get('GGXCNL_NGDP', iso, 2025)
    if bal is not None:
        a['bal'] += bal / 100 * gdp
        a['gdp_bal'] += gdp

out = os.path.join(os.path.dirname(__file__), '..', 'data', 'fiscal', 'imf-weo-regions.csv')
tot_n = sum(a['ngdpd'] for a in agg.values()); tot_p = sum(a['ppp'] for a in agg.values())
tot_d = sum(a['debt'] for a in agg.values()); tot_dg = sum(a['gdp_debt'] for a in agg.values())
with open(out, 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['region', 'gdp_usd_bn_2025', 'gdp_ppp_bn_2025', 'market_to_ppp_ratio', 'share_world_gdp_market',
                'share_world_gdp_ppp', 'gross_debt_pct_gdp_2025', 'share_world_debt', 'overall_balance_pct_gdp_2025'])
    for r in REGIONS:
        a = agg[r]
        debt_ratio = a['debt'] / a['gdp_debt'] if a['gdp_debt'] else float('nan')
        bal = a['bal'] / a['gdp_bal'] if a['gdp_bal'] else float('nan')
        w.writerow([r, round(a['ngdpd'], 1), round(a['ppp'], 1), round(a['ngdpd'] / a['ppp'], 4),
                    round(a['ngdpd'] / tot_n, 4), round(a['ppp'] / tot_p, 4), round(100 * debt_ratio, 1),
                    round(a['debt'] / tot_d, 4), round(100 * bal, 2)])
print(open(out).read())
print(f'world (sum of mapped): GDP ${tot_n/1000:.1f}T market, ${tot_p/1000:.1f}T PPP; debt/GDP {100*tot_d/tot_dg:.1f}%')
for code in ['WEOWORLD', 'ADVEC', 'OEMDC']:
    print(code, 'debt', {y: get('GGXWDG_NGDP', code, y) for y in (2025, 2026, 2031)},
          'balance', {y: get('GGXCNL_NGDP', code, y) for y in (2025, 2031)})
print('no 2025 debt figure:', ' '.join(sorted(missing)))
