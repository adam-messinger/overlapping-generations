"""Country -> nine-region mapping for the independent human-capital reproduction.

The brief names nine regions (US, OECD ex-US, China, India + South Asia, Latin
America, SE Asia + Pacific, Russia + CIS, MENA, Sub-Saharan Africa) but not
which country belongs to which.  This module is my own assignment, built on the
UN M49 subregion hierarchy with explicit overrides where the study's region
names cut across it.  Every override is listed so the choice can be audited --
region composition is one of the places a reproduction can legitimately differ.
"""

REGIONS = ["us", "oecd-ex-us", "china", "india", "latam", "seasia", "russia", "mena", "ssa"]

REGION_NAMES = {
    "us": "United States",
    "oecd-ex-us": "OECD ex-US",
    "china": "China",
    "india": "India + South Asia",
    "latam": "Latin America",
    "seasia": "SE Asia + Pacific",
    "russia": "Russia + CIS",
    "mena": "MENA",
    "ssa": "Sub-Saharan Africa",
}

# UN M49 subregion id -> default region.
_SUBREGION = {
    906: "china",       # Eastern Asia (overridden below for JPN/KOR/PRK/MNG)
    910: "ssa",         # Eastern Africa
    911: "ssa",         # Middle Africa
    912: "mena",        # Northern Africa (overridden below for SDN)
    913: "ssa",         # Southern Africa
    914: "ssa",         # Western Africa
    915: "latam",       # Caribbean
    916: "latam",       # Central America
    918: "oecd-ex-us",  # Northern America (overridden below for USA)
    920: "seasia",      # South-Eastern Asia
    922: "mena",        # Western Asia (overridden below for the Caucasus etc.)
    923: "oecd-ex-us",  # Eastern Europe (overridden below for the CIS members)
    924: "oecd-ex-us",  # Northern Europe
    925: "oecd-ex-us",  # Southern Europe
    926: "oecd-ex-us",  # Western Europe
    927: "oecd-ex-us",  # Australia / New Zealand
    928: "seasia",      # Melanesia
    931: "latam",       # South America
    954: "seasia",      # Micronesia
    957: "seasia",      # Polynesia
    5500: "russia",     # Central Asia (all five are CIS founding/associate states)
    5501: "india",      # Southern Asia (overridden below for Iran)
}

# ISO3 overrides, with the reason each one departs from its M49 subregion.
_OVERRIDE = {
    "USA": "us",         # the study breaks the US out of the OECD aggregate
    "JPN": "oecd-ex-us", # OECD member sitting in Eastern Asia
    "KOR": "oecd-ex-us", # OECD member sitting in Eastern Asia
    "PRK": "seasia",     # not China, not OECD: goes to the Asia-Pacific residual
    "MNG": "seasia",     # same
    "IRN": "mena",       # UN files it under Southern Asia; the study's MENA owns it
    "ISR": "oecd-ex-us", # OECD member sitting in Western Asia
    "CYP": "oecd-ex-us", # EU member sitting in Western Asia
    "TUR": "mena",       # OECD member, but the study's MENA is geographic
    "ARM": "russia",     # Caucasus CIS
    "AZE": "russia",     # Caucasus CIS
    "GEO": "russia",     # Caucasus (CIS until 2009)
    "RUS": "russia",
    "BLR": "russia",
    "UKR": "russia",
    "MDA": "russia",
    "SDN": "ssa",        # World Bank files Sudan under Sub-Saharan Africa
    "SSD": "ssa",
    "HKG": "china",
    "MAC": "china",
    "TWN": "china",
}

# Names that appear in Maddison / Barro-Lee but not with a WPP ISO3 code.
NAME_TO_ISO = {
    "Bolivia (Plurinational State of)": "BOL",
    "Bolivia": "BOL",
    "China, Hong Kong SAR": "HKG",
    "Hong Kong SAR, China": "HKG",
    "Hong Kong": "HKG",
    "China, Macao SAR": "MAC",
    "Macao": "MAC",
    "China, Taiwan Province of China": "TWN",
    "Taiwan": "TWN",
    "Dem. People's Republic of Korea": "PRK",
    "Republic of Korea": "KOR",
    "Korea, Republic of": "KOR",
    "South Korea": "KOR",
    "Iran (Islamic Republic of)": "IRN",
    "Iran, Islamic Rep.": "IRN",
    "Russian Federation": "RUS",
    "Republic of Moldova": "MDA",
    "Moldova": "MDA",
    "Syrian Arab Republic": "SYR",
    "United Republic of Tanzania": "TZA",
    "Tanzania": "TZA",
    "Venezuela (Bolivarian Republic of)": "VEN",
    "Venezuela": "VEN",
    "Viet Nam": "VNM",
    "Vietnam": "VNM",
    "United States of America": "USA",
    "United States": "USA",
    "United Kingdom": "GBR",
    "Lao People's Democratic Republic": "LAO",
    "Democratic Republic of the Congo": "COD",
    "Congo, Dem. Rep.": "COD",
    "Congo": "COG",
    "Cote d'Ivoire": "CIV",
    "Côte d'Ivoire": "CIV",
    "Czechia": "CZE",
    "Czech Republic": "CZE",
    "Slovakia": "SVK",
    "Slovak Republic": "SVK",
    "Turkiye": "TUR",
    "Türkiye": "TUR",
    "Turkey": "TUR",
    "Egypt": "EGY",
    "Gambia": "GMB",
    "Yemen": "YEM",
    "Eswatini": "SWZ",
    "Swaziland": "SWZ",
    "Cabo Verde": "CPV",
    "Cape Verde": "CPV",
    "Brunei Darussalam": "BRN",
    "State of Palestine": "PSE",
    "Myanmar": "MMR",
    "North Macedonia": "MKD",
    "Macedonia": "MKD",
    "Serbia": "SRB",
    "Former USSR": "RUS",
    "Former Yugoslavia": "SRB",
    "Sudan (Former)": "SDN",
    "USSR": "RUS",
}


def region_of(iso3: str, parent_id=None) -> str | None:
    """Region for an ISO3 code; parent_id is the UN M49 subregion when known."""
    if iso3 in _OVERRIDE:
        return _OVERRIDE[iso3]
    if parent_id is not None:
        try:
            return _SUBREGION.get(int(parent_id))
        except (TypeError, ValueError):
            return None
    return _ISO_FALLBACK.get(iso3)


# Built once from the WPP hierarchy so non-WPP sources can be mapped by ISO3
# alone.  Populated by hc_sources.py and cached to disk.
_ISO_FALLBACK: dict[str, str] = {}


def load_iso_fallback(mapping: dict[str, str]) -> None:
    _ISO_FALLBACK.clear()
    _ISO_FALLBACK.update(mapping)
