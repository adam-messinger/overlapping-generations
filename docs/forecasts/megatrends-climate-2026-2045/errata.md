# Errata and resolver readings, issued after Wave 1

Issued by the orchestrator on 2026-11-09 from the four signals seats' resolution audits.
It holds facts and readings only, no forecasts. Every Wave-2 and Wave-3 seat receives it;
the twelve Wave-1 seats answered without it. `questions.md` itself is unchanged: the
questions stay frozen as the panel first saw them, with the defects below disclosed.

## Baseline corrections (read by the orchestrator from the primary source)

IMF `GGXWDG_NGDP` (general government gross debt, % of GDP), DataMapper, October 2026 vintage:

| | 2024 | 2025 | 2026 | 2027 | 2030 | 2031 |
|---|---|---|---|---|---|---|
| Advanced economies | 107.4 | 108.2 | 107.8 | 108.5 | 113.5 | 115.2 |
| United States | 122.3 | 124.4 | 126.8 | 128.7 | 140.7 | 145.0 |
| Japan | 213.6 | 204.8 | 199.4 | 196.4 | 190.1 | 188.9 |
| Italy | 134.7 | 137.1 | 137.9 | 137.6 | 135.8 | 135.6 |
| France | 112.6 | 115.5 | 118.5 | 120.4 | 123.2 | 123.6 |
| United Kingdom | 99.4 | 102.1 | 102.0 | 102.5 | 100.9 | 100.2 |
| Canada | 110.0 | 113.6 | 115.6 | 113.4 | 108.8 | 107.0 |
| Germany | 61.4 | 62.7 | 64.6 | 66.9 | 73.6 | 75.6 |

- The preamble's advanced-economy row (110.1% in 2025, 110.9% in 2026) was the October 2025
  vintage. Within the current vintage the group rises 7.0 points from 2025 to 2031, not 5.1.
- The preamble's "US 123.9% (2025)" is wrong; the US is 124.4% in 2025. Canada is 113.6-115.6%,
  not "about 110"; the UK is about 102%; Germany about 63-65%.
- The EU-27 estimate holds: the IMF's EU aggregate is $22.81T in 2026, 17.8% of world GDP.
  The world, US and China figures match the IMF series.
- The yields row is stale. The US 10-year peaked near 5.3% in early October 2026 and was about
  4.85% in the first week of November.

## Resolver readings (where the lock could be read two ways)

- **Q1(ii), AI-enabling goods.** The WTO used two aggregates in 2026. The March 2026 Outlook's
  is the broad one ($4.18T in 2025, "about one-sixth of global trade"); the October 2026
  Outlook's is narrower (14.8% of merchandise trade in H1 2026, up from 7-8%). **The broad March
  2026 aggregate is the one meant**: the preamble's 37-40% composite was built on it. On the
  narrow aggregate the 2025 composite would be nearer 34-35%. All three components are measured
  against world exports of goods plus commercial services. The fuels-and-mining share is still
  unverified.
- **Q2.** R is rounded to two decimals before the 2.00 test.
- **C2/Q2 fallback.** For the euro area, the 3-month spot rate on the ECB's euro-area yield
  curve for AAA-rated government bonds. The resolver must read the HLW file, not the
  Laubach-Williams one; press "New York Fed r*" figures (such as 1.65% for 2026Q2) are usually LW.
- **Q3.** F is the gross level of outlays and revenue losses in categories (i)-(iv) during
  2040-2045, as a share of GDP. It is not an increment over 2025 and not a difference from a
  no-warming counterfactual. No official estimate under this accounting exists today, and
  cancellation is a real possibility. A cancelled question is not scored: forecast the
  quantity, not the chance of cancellation.
- **Q4(b).** The 140% gate is tested on the latest IMF WEO or Fiscal Monitor figure published
  before the announcement. A euro-area-wide numerical yield cap counts for each of Germany,
  France and Italy whose bonds it covers and whose own debt exceeds 140%.
- **Q5.** EU-27 is summed country by country over the 2026 membership.
- **Q6-C, read as written.** Only an IMF Stand-By or Extended arrangement counts. A rescue of
  a euro-area G7 member by the ESM alone, with no default or restructuring, does not resolve C.
  This is a disclosed defect of the lock, not a reading to be repaired.
- **C4 and g.** The lock's country-by-country sum equals the World Bank `OED` aggregate today.
  The PPP series is in constant 2021 international dollars; a later ICP rebasing would change
  China's weight, so the growth rate is vintage-dependent even under the one-vintage rule.
