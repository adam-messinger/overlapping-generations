"""Ledger core for the independent human-capital reproduction.

Everything here is written from the brief alone: five cost bands (the four the
brief names plus the "no schooling" band the attainment data forces us to
price), replacement-cost multipliers, the four-hazard survival curve, and the
expected years in the workforce it implies.
"""
from __future__ import annotations

from dataclasses import dataclass

REGIONS = ["us", "oecd-ex-us", "china", "india", "latam", "seasia", "russia", "mena", "ssa"]

# --- cost scope ------------------------------------------------------------
REARING_SHARE = 0.23        # USDA out-of-pocket share of GDP per capita per child-year
FOREGONE_SHARE = 0.0        # brief: "No foregone earnings"
FOREGONE_FROM_AGE = 16      # only used when FOREGONE_SHARE > 0

# band -> (entry age, retirement age, schooling years added, cost per school year)
BAND_SPEC = {
    "none":      (16, 61, 0, 0.00),
    "primary":   (16, 61, 6, 0.20),
    "secondary": (18, 63, 6, 0.25),
    "tertiary":  (22, 66, 4, 0.40),
    "advanced":  (26, 68, 3, 0.50),
}
BANDS = list(BAND_SPEC)
LADDER = ["primary", "secondary", "tertiary", "advanced"]

# hazard multipliers stated in the brief (1.0 where the brief is silent)
DEATH_MULT = {"none": 1.5, "primary": 1.5, "secondary": 1.0, "tertiary": 1.0, "advanced": 0.7}
DISAB_MULT = {"none": 2.2, "primary": 2.2, "secondary": 1.0, "tertiary": 1.0, "advanced": 0.5}
DOMESTIC_MULT = {"none": 1.0, "primary": 1.0, "secondary": 1.0, "tertiary": 0.55, "advanced": 0.55}

# Domestic-role exit = half the male-female participation gap, read as
# 0.5 * (1 - female/male LFP ratio).  The brief pins US 0.11, India 0.29,
# MENA 0.36; the other six come from ILO modelled female-to-male LFP ratios
# (15+, 2023) through the same formula.
DOMESTIC_EXIT = {
    "us": 0.11,          # F/M 0.78
    "oecd-ex-us": 0.10,  # F/M 0.80
    "china": 0.085,      # F/M 0.83
    "india": 0.29,       # F/M 0.42  (brief)
    "latam": 0.15,       # F/M 0.70
    "seasia": 0.135,     # F/M 0.73
    "russia": 0.10,      # F/M 0.80
    "mena": 0.36,        # F/M 0.28  (brief)
    "ssa": 0.075,        # F/M 0.85
}

# survival-curve constants
DEATH_BASE = 0.002        # per year at age 40 when life expectancy is 75
DEATH_REF_LE = 75.0
DEATH_DOUBLE = 9.0        # doubling time in years
DISAB_BASE = 0.0035       # per year at age 40
DISAB_SLOPE = 0.0006      # per year of age
DOMESTIC_WINDOW = 15      # years over which the domestic-role share exits

# Share of life-expectancy gains passed into the retirement age.
RETIREMENT_LE_SHARE = 2.0 / 3.0

# Optional per-band scaling of the death+disability hazards.  1.0 everywhere is
# the literal brief; hc_report.py also runs the "eurostat" calibration that
# makes the OECD working lives hit the ~32/37/39/38 the brief cites.
HAZARD_SCALE_LITERAL = {b: 1.0 for b in BANDS}
HAZARD_SCALE_EUROSTAT = {
    "none": 2.57, "primary": 2.57, "secondary": 1.64, "tertiary": 0.79, "advanced": 0.78,
}


def multiplier(band: str, rearing_share: float = REARING_SHARE,
               foregone_share: float = FOREGONE_SHARE) -> float:
    """Unit cost of a band as a multiple of GDP per capita."""
    entry, _, _, _ = BAND_SPEC[band]
    cost = rearing_share * entry
    for step in LADDER:
        _, _, years, per_year = BAND_SPEC[step]
        cost += years * per_year
        if step == band:
            break
    if band == "none":
        cost = rearing_share * entry
    if foregone_share > 0:
        cost += foregone_share * max(0, entry - FOREGONE_FROM_AGE)
    return cost


def retirement_age(band: str, life_expectancy: float, base_le: float) -> float:
    _, retire, _, _ = BAND_SPEC[band]
    return retire + RETIREMENT_LE_SHARE * (life_expectancy - base_le)


def hazard(band: str, age: float, years_in: float, region: str,
           life_expectancy: float, scale=None) -> float:
    """Annual probability of leaving the workforce for a non-retirement reason."""
    sc = (scale or HAZARD_SCALE_LITERAL)[band]
    death = (DEATH_BASE
             * 2.0 ** ((age - 40.0 - (life_expectancy - DEATH_REF_LE)) / DEATH_DOUBLE)
             * DEATH_MULT[band] * sc)
    disab = max(0.0, DISAB_BASE + DISAB_SLOPE * (age - 40.0)) * DISAB_MULT[band] * sc
    dom = 0.0
    if years_in < DOMESTIC_WINDOW:
        dom = DOMESTIC_EXIT[region] * DOMESTIC_MULT[band] / DOMESTIC_WINDOW
    return min(0.99, death + disab + dom)


def survival_curve(band: str, region: str, life_expectancy: float,
                   base_le: float, scale=None) -> list[float]:
    """S[k] = share of a cohort still in the workforce k years after entry."""
    entry, _, _, _ = BAND_SPEC[band]
    retire = retirement_age(band, life_expectancy, base_le)
    n = max(0, int(round(retire - entry)))
    S, out = 1.0, []
    for k in range(n):
        out.append(S)
        S *= 1.0 - hazard(band, entry + k, k, region, life_expectancy, scale)
    return out


def working_life(band: str, region: str, life_expectancy: float,
                 base_le: float, scale=None) -> float:
    """Expected years in the workforce: the area under the survival curve."""
    S = survival_curve(band, region, life_expectancy, base_le, scale)
    if not S:
        return 0.0
    # mid-year convention: each year k contributes S[k] adjusted for exits within it
    total = 0.0
    for k, s in enumerate(S):
        h = hazard(band, BAND_SPEC[band][0] + k, k, region, life_expectancy, scale)
        total += s * (1.0 - h / 2.0)
    return total


@dataclass(frozen=True)
class BandCosts:
    """Unit costs and useful lives for one region-year."""
    unit_cost: dict          # band -> $ per entrant
    useful_life: dict        # band -> expected years in the workforce
    retire: dict             # band -> retirement age


def band_costs(region: str, gdppc: float, life_expectancy: float, base_le: float,
               rearing_share: float = REARING_SHARE,
               foregone_share: float = FOREGONE_SHARE, scale=None) -> BandCosts:
    return BandCosts(
        unit_cost={b: gdppc * multiplier(b, rearing_share, foregone_share) for b in BANDS},
        useful_life={b: working_life(b, region, life_expectancy, base_le, scale) for b in BANDS},
        retire={b: retirement_age(b, life_expectancy, base_le) for b in BANDS},
    )


def split_attainment(lu: float, lp: float, ls: float, lh: float,
                     advanced_share: float) -> dict:
    """Barro-Lee / Lee-Lee highest-level shares -> the five cost bands."""
    tot = lu + lp + ls + lh
    if tot <= 0:
        return {b: 0.0 for b in BANDS}
    f = 100.0 / tot
    return {
        "none": lu * f / 100.0,
        "primary": lp * f / 100.0,
        "secondary": ls * f / 100.0,
        "tertiary": lh * f * (1.0 - advanced_share) / 100.0,
        "advanced": lh * f * advanced_share / 100.0,
    }


# Share of tertiary-attained adults holding a master's-or-above (ISCED 7-8 as a
# share of ISCED 5-8).  The brief does not give this split; these are my own
# figures from OECD Education at a Glance 2023 (A1.1) and UIS for non-OECD.
ADVANCED_SHARE = {
    "us": 0.36, "oecd-ex-us": 0.30, "china": 0.09, "india": 0.13, "latam": 0.09,
    "seasia": 0.09, "russia": 0.20, "mena": 0.12, "ssa": 0.09,
}
