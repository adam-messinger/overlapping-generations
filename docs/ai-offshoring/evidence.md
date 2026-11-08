# AI geography and offshored-service displacement: data for the nine-region model

Compiled 2026-11-08. The regions follow `scripts/wpp-age-structure.py`. Japan, Korea, Canada, Australia, New Zealand and Israel are in `oecd-ex-us`. Turkey is in `mena`, Ukraine and Belarus are in `russia`, and Taiwan and Hong Kong are in `china`.

How sources are marked:
- **[P]**: I read the number in the primary document (PDF or official page) during this session.
- **[S]**: I read it in secondary reporting (press or trade media) that quotes the primary source.
- **[unverified]**: I did not confirm it in any source text this session.
- **[est]**: my own arithmetic or allocation, with the method stated.

---

## 1. Datacentre electricity by region

### Primary numbers

**IEA (2025), *Energy and AI*, WEO Special Report, April 2025.** [P] Source PDF: iea.blob.core.windows.net/assets/de9dea13-b07d-42c5-a398-d1b3ae17d866/EnergyandAI.pdf

- World, 2024: "around 415 TWh", about 1.5% of world electricity. US, Europe and China together are "around 85%" (p.57).
- US: "around 180 TWh … in 2024 … nearly 45% of the global total and more than 4% of US electricity consumption" (p.57).
- China: "approximately 100 TWh … around 25% of global data centre electricity consumption"
- Europe: "an estimated 70 TWh in 2024 … slightly above 15%" (p.58).
- Japan: "less than 20 TWh" (about 2% of national consumption).
- India: "around 9 TWh … or about 0.5% of total consumption"
- Africa: "less than 1 kWh … per capita in 2024, rising to slightly less than 2 kWh per capita by the end of the decade." South Africa is above 25 kWh per capita by 2030.
- Per-capita data centre use, 2024: US ~540 kWh, China ~70 kWh, Europe slightly under 100 kWh. For 2030: US >1,200, Japan 270, China ~200, Europe 165, India ~15 kWh (p.64).
- Base Case 2030: ~945 TWh. Increments from 2024: US +240 TWh (+130%), China +175 TWh (+170%), Europe +45 TWh (+70%), Japan +15 TWh (+80%). US and China make up "nearly 80% of global growth to 2030". Southeast Asia "more than double[s] by 2030" (Singapore and Johor hub).
- 2035: Base Case "around 1 200 TWh"; Lift-Off >1,700 TWh; High Efficiency ~970 TWh; Headwinds ~700 TWh. Range for 2030: Headwinds ~670, High Efficiency ~800, Lift-Off >1,260 TWh. **The report gives no regional numbers for 2035.**
- Figure 2.6 and Figure 2.12 regions: US, China, Europe, "Asia-Pacific excl. China" or "Asia excl. China", and Rest of world. These are charts only, with no table in the text.

**IEA (2026), *Key Questions on Energy and AI*, WEO Special Report.** [P] Source PDF: iea.blob.core.windows.net/assets/3179f7f8-01f6-4dd6-bffa-c9f7b73f1dc9/KeyQuestionsonEnergyandAI.pdf

- "consumption from data centres roughly doubling from 485 TWh in 2025 to 950 TWh in 2030". 2024 to 2025 growth was ">15% … adding around 70 TWh". AI-focused datacentres reach ~465 TWh by 2030, more than triple.
- US: "accounting for about half of total global installed capacity as well as announced global capacity additions"
- Middle East pipeline: "almost 10 GW"
- **This update gives no regional TWh split.** The 2025 regional split is still the latest one available.

### Mapping to nine regions [est]

How I built the mapping:
- US, China (mainland), Europe, Japan and India come from the IEA numbers above.
- IEA "Europe" includes Turkey, Ukraine and the Balkans, as in the WEO convention. That convention is [unverified for this report]. I moved ~1.5 TWh in 2024 (~3 TWh in 2030) from Europe to `mena` (Turkey) and `russia` (Ukraine).
- The unexplained remainder is my judgment, not IEA data:
  - 2024 remainder: 415 − 180 − 100 − 70 − 19 − 9 = **~37 TWh**
  - 2030 remainder: 945 − 420 − 275 − 115 − 34 − ~22 (India ≈ 15 kWh/cap × ~1.47 bn) = **~79 TWh**
- I split each remainder across:
  - Korea, Canada, Australia/NZ and Israel (`oecd-ex-us`)
  - Taiwan and Hong Kong (`china`)
  - Singapore, Malaysia and the rest of SE Asia (`seasia`)
  - Brazil and Mexico (`latam`)
  - the Gulf plus Turkey (`mena`)
  - Russia (`russia`)
  - SSA, bounded by IEA's Africa per-capita figure (<1.5 TWh in 2024, ~3 TWh in 2030)

| Region | 2024 TWh | 2024 share | 2030 TWh (Base) | 2030 share | Basis |
|---|---|---|---|---|---|
| us | 180 | 0.434 | 420 | 0.444 | IEA [P] |
| china (+TW, HK) | 103 | 0.248 | 282 | 0.298 | IEA 100 / 275 [P] + TW/HK 3 / 7 [est] |
| oecd-ex-us | 103 | 0.248 | 174 | 0.184 | Europe 68.5 / 112 + Japan 19 / 34 [P-derived] + Korea, Canada, ANZ, Israel ~15.5 / 28 [est] |
| india (+S. Asia) | 9.5 | 0.023 | 23 | 0.024 | IEA India 9 [P]; 2030 from 15 kWh/cap [P-derived] |
| seasia | 7 | 0.017 | 17 | 0.018 | IEA "more than double" [P]; level [est] |
| latam | 4 | 0.010 | 9 | 0.010 | [est] |
| mena (+TUR) | 4 | 0.010 | 12 | 0.013 | [est]; the Gulf ~10 GW pipeline [P] argues for upside |
| russia (+CIS, UKR) | 3.5 | 0.008 | 6 | 0.006 | [est] |
| ssa | 1.5 | 0.004 | 3 | 0.003 | IEA Africa per capita [P-derived] |
| **world** | **415** | **1.00** | **945** | **1.00** | |

For 2025, use 485 TWh (IEA 2026) with the 2024 shares. For 2035 (~1,200 TWh Base, no regional split published), carrying the 2030 shares forward is a defensible default.

**Weak points**
- About 9% of 2024 and 8% of 2030 consumption is allocated by judgment.
- IEA itself warns that "substantial data gaps make it challenging to accurately estimate China's data centre electricity consumption".

---

## 2. Industrial robot operational stock

### Primary numbers (IFR *World Robotics 2025*, data year 2024)

Sources:
- IFR Executive Summary WR 2025 [P]: ifr.org/img/worldrobotics/Executive_Summary_WR_2025_Industrial_Robots.pdf
- IFR Foreword WR 2025 [P]
- IFR Americas press release, 25 Sep 2025 [P]

Stock figures:
- World stock 2024: **4,663,698 units** (+9%). The Foreword says 4,663,773, +8.9%.
- China: **2,027,190** (43%). Japan: **450,530** (10%).
- Europe: **821,384**. Americas: **542,464**.
- Shares from the Foreword: "China (43.5%), Japan (9.7%), United States (8.4%), Republic of Korea (8.4%) and Germany (6.0%)".
- US: "393,700 units" (Americas press release).
- Korea: 8.4% × 4.664 M ≈ **~392,000** [est from the IFR share]. Germany: 6.0% ≈ **~280,000** [est from the IFR share].

Installations, 2024:
- World 542,000. China 295,045, Japan 44,453, US 34,164, Korea 30,596, Germany 26,982, Italy 8,783, India 9,100.
- Mexico 5,594, Canada 3,787. Europe 85,006.

**WR 2026 (data year 2025)** [S, IFR news page "Five million robots now operate in factories globally", Sep 2026]:
- World stock "surged 9% to a record 5 million units in 2025". Installations >600,000 (+11%).
- China 354,000 installs (59% of world). US ~38,500 (+12%; the US passed Japan as the #2 market). Japan 36,219 (−19%). Korea 30,000. Germany <25,000. India ~10,500.
- Forecast: 655,000 installs in 2026 and 806,000 in 2029.
- **Country stocks for 2025 are not public (paywalled).** Scaling the 2024 shares to 5.0 M, with China's share edging up, is the best available proxy.

### Mapping to nine regions (2024) [est]

Method:
- Anchors are the IFR figures above. Inside the IFR blocks I allocated by judgment from installation flows.
- The Americas block (542,464) minus the US leaves 148.8k. I split that as Canada ~45k, with `latam` getting the remainder (~104k: Mexico, Brazil, Argentina).
- The Europe block (821,384) minus Turkey ~30k and Russia/CIS ~10k leaves ~781k for `oecd-ex-us`.
- The Asia/Australia remainder after China, Japan and Korea is ~416k. I split it as:
  - Taiwan ~100k → `china`
  - India ~70k
  - SE Asia ~160k (Thailand, Singapore, Vietnam, Malaysia, Indonesia)
  - Australia/NZ ~20k → `oecd-ex-us`
  - ~66k unallocated, spread pro rata
- The per-country stock table (WR 2025 ch. 2) was not accessible.

| Region | Stock 2024 (k units) | Share |
|---|---|---|
| china (+TW) | ~2,127 | 0.462 |
| oecd-ex-us | ~1,688 (Japan 450.5, Korea ~392, Europe-ex-TUR/RUS ~781, Canada ~45, ANZ ~20) | 0.366 |
| us | 393.7 | 0.085 |
| seasia | ~160 | 0.035 |
| latam | ~104 | 0.023 |
| india | ~70 | 0.015 |
| mena (+TUR) | ~40 | 0.009 |
| russia | ~13 | 0.003 |
| ssa | ~10 | 0.002 |

China, Japan, US and Korea are firm, about 71% of the stock. The other ~29% splits fairly firmly between `oecd-ex-us` (Europe and Canada) and `latam`, but the small-region shares carry ±50% uncertainty.

---

## 3. Offshorable / AI-exposed service exports by region

### Philippines (`seasia`)

**IBPAP Research, *The Philippine IT-BPM Industry Overview* (2026).** [P] Source: admin.ibpap.org/storage/hub-resources/7Hv9U2uoLJVx2kxyRMObNm6W6L0MR57l9dZfrez7.pdf

- Revenue: **US$40.3 bn (2025)**. Earlier years: 38.0 (2024), 35.5 (2023), 32.5 (2022), 29.5 (2021), 26.5 (2020). 2026F: 42.3.
- Headcount: **1.89 M FTE (2025)**. Earlier years: 1.82 (2024), 1.70 (2023), 1.57 (2022), 1.45 (2021), 1.32 (2020). 2026F: 1.94.
- "17% share of global IT-BPM services headcount in 2025, up from 15% in 2022". This implies a global IT-BPM services headcount of about **11.1 M** [est = 1.89/0.17].
- Segment breakdown. The segments overlap: GCC and healthcare FTEs sit partly inside the other rows, since they sum to 2.34 M against 1.89 M total.

| Segment | FTE | Revenue | Revenue per FTE |
|---|---|---|---|
| Contact centre & business process services | 1.68 M | $33.9 bn | **$20.1k** |
| IT & digital | 190k | $6.1 bn | $33.3k |
| Healthcare services | 200k | $4.5 bn | $22.4k |
| GCCs | 270k | $8.7 bn | $32.3k |

- Buyers: 65–70% North America, 15–20% Europe, 15% rest of APAC. 75–80% service providers, 20–25% GCCs.
- Share of GDP: IBPAP says ">8%" [S: Philstar, Inquirer, Jan 2026].

**IMF WP/25/043** (Cucio & Hennig, 21 Feb 2025) [P]:
- "BPO employs 1.7 million people, or 3.4% of the labor force in 2023"
- BPO revenue was 7.4% of GDP in the summary but 8.1% in section B (the paper does not reconcile the two).

Share of employment [est]:
- PSA, Dec 2025: employed 49.43 M, unemployment 4.4%, underemployment 8.0% [S: GMA, Payroll Solutions]. Underemployment was 13.1% in May 2025.
- 1.89/49.4 → **~3.8% of employment**.

Value added per worker:
- Not published. Revenue per FTE is $20.1k (contact centre) to $33k (IT).
- Philippine GDP per employed person is ≈ $10k [est, from GDP ≈ US$490 bn, which is unverified]. BPO revenue per worker is therefore about 2× the economy average.

IBPAP revised its 2028 roadmap in July 2026 [S: GMA News, 14 Jul 2026, J.V. Cabuenas]:
- Downside: **$43.3 bn / 1.85 M FTE**. That is *below* 2025 headcount.
- Best case: **$50.5 bn / 2.14 M FTE**.
- Previous targets (2022 roadmap): $59 bn / 2.5 M. Risks named: AI, buyer behaviour and competition.

### Other `seasia`

- **Malaysia:** GBS revenue projected at RM28.14 bn (~US$6.5 bn) for 2025, with "over 36,000 high-value jobs" created since 2021 [S: GBS Malaysia mid-term report, via search snippet; unverified]. Total GBS headcount was not found.
- **Vietnam:** IT/ITeS exports ~$7.5 bn (2025), attributed to MIC/VINASA [unverified, aggregator]. Headcount not found.
- Regional total [est]: **~2.0–2.3 M persons and ~$48–55 bn exports**, of which the Philippines is ~85% of workers. Against SE Asia employment of ~340 M [est], that is **~0.6–0.7%** of regional employment.

### India (`india`)

**NASSCOM, Annual Strategic Review 2026 press release, 24 Feb 2026.** [P]

- Industry revenue: **$315 bn FY26E** ($297 bn FY25E).
  - IT services $149 bn
  - **BPM $59 bn**
  - ER&D $63 bn
  - software products $23 bn
  - hardware $21 bn
- **Exports $246 bn**.
- Headcount growth ~2.3% (net). AI revenue $10–12 bn.
- Headcount level: FY25 5.8 M, FY26 ≈ 5.95 M (+~135k) [S: outsourceaccelerator, bizzbuzz].
- **The BPM-only headcount is not in the release.** The 1.2–1.5 M figure in circulation comes from an aggregator [unverified]. At $35–40k per FTE, the BPM revenue implies ~1.5–1.7 M BPM workers [est].
- Revenue per employee across the industry: ~$53k [est = 315/5.95].
- Share of employment: ~6 M against India's ~600 M workforce is ~1.0% (IT-BPM total) and ~0.25% (BPM) [est, workforce figure unverified]. The IT-BPM figure is lower against the full `india` region.
- IEA quotes Indian IT exports at ">USD 200 billion in 2024" [P].
- Pakistan and Bangladesh: not sourced.
- Hiring: net additions for H1 FY27 projected at <70k, down from ~95k a year earlier [S: Han Digital via cxotoday/outsourceaccelerator].

### `latam`

- **Colombia:** BPO/KPO exports **US$2.93 bn** (2025, or possibly 2024; sources disagree), 60% to the US [S: valoraanalitik, noticiasrcn]. Employment **>754k direct** (COLCOB 2024) to ~790k (2025, possibly direct + indirect) [S]. This includes the domestic market.
- **Mexico:** contact-centre employment 400k–800k [unverified: Deloitte or AMITI/Everest attributions not confirmed]. Outsourced contact-centre revenue ~$2.4 bn [unverified].
- Regional exported-services workforce [est, weak]: **~0.6–1.0 M persons** and **~$8–15 bn** in exports. That is ~0.2–0.3% of ~300 M employed.

### `oecd-ex-us` (Central and Eastern Europe nearshore)

- **Poland:** ABSL, 2025 [S, via ABSL news pages and absl.pl/en/sector-in-numbers]:
  - **500,500 employed** in 2,179 business-service centres
  - exports **$48.4 bn (2025)**; $42.3 bn in 2024, ~25% of Poland's commercial-services exports
  - **$64.3k export value per employee**
  - 84.3% of employment foreign-owned; sector at 6.1% of GDP
- Other CEE countries (Romania, Bulgaria, Czechia, Hungary): not sourced.
- This work is higher value (finance and accounting, IT, R&D) than Philippine voice work, so its AI-substitution rate is probably lower per task, but its revenue at stake per worker is about 3× higher.

### `mena`

- **Egypt:** digital offshoring exports **$4.8 bn (2024)** [S: ITIDA press release title]. $5.2 bn in FY2025/26 with **~195.3k** employed in the exporting industry, end-June 2026 [S: Enterprise, ITIDA's El-Zaher]. 55 firms pledged 70k jobs over three years (Nov 2025).
- **Morocco:** offshoring **148,500 employed**, exports **MAD 26.22 bn (~$2.7 bn)**, end-2024 [S]. Target: 270k jobs and ~MAD 40 bn by 2030.
- Regional [est]: **~0.35–0.45 M persons, ~$8–10 bn** (Turkey and the Gulf not counted).

### `ssa`

- **South Africa (BPESA):** +26,346 international jobs in 2025, the highest since 2018. 2024: +20,518 jobs and export revenue of ~R6 bn (~$328 M) [S]. The total international headcount was not found [unverified; commonly cited at ~70–100k for offshore delivery].
- **Kenya:** ">40,000" BPO/GBS jobs [S: Xinhua, Jan 2025]; 19,650 jobs created in 2025 [S, Ministry of ICT].
- Regional [est, weak]: **~0.15–0.25 M persons, ~$1–2 bn**.

### `china`

- Offshore service-outsourcing execution value, 2025: **RMB 1,168.88 bn (~$163 bn)**, with KPO 42.8% [S: *China Digital Services & Service Outsourcing Development Report 2026*, via news.cn and gmw.cn].
- Jan–Oct 2025 (MOFCOM): RMB 785.36 bn offshore (+3%).
- 2023: $151.4 bn, ~40% of China's services exports [S].
- "Employment" of 17.66 M is a **cumulative count over 20 years**, not a stock. Do not use it.
- Most of this is IT, R&D and design outsourcing (largely for Asian and US clients). Contact-centre export work is small because of language. AI-exposed exported labour in the PH/India sense is probably small; quantity not found.

### `russia`

- Ukraine and Belarus IT exports: not sourced in this session [unverified]. Treat the region's exposure as small.

### `us` (importer side)

- Customer service representatives: **2,814,000 (2024)**. BLS projects **−5% for 2024–34** (−153,700), with 341,700 openings a year [P-ish: BLS OOH via search snippet].

### World totals

- Global IT-BPM services headcount: **~11.1 M** (2025) [est from IBPAP's 17% share].
- Global contact-centre agents: about **17 M** [S, Gartner 31 Aug 2022 release as reported; The Register paraphrased it as "17 million contact centers", which is likely a misquote; unverified].

### Summary table: AI-exposed exported services

| Region | Persons in exported AI-exposed services | Export value | Revenue per worker | Share of regional employment | Quality |
|---|---|---|---|---|---|
| seasia | 2.0–2.3 M (PH 1.89 M) | $48–55 bn (PH 40.3) | PH $20–33k | 0.6–0.7% (PH 3.8%) | PH strong; rest weak |
| india | ~6.0 M IT-BPM (BPM ~1.5–1.7 M est) | $246 bn (IT-BPM exports) | ~$53k | ~1% (BPM ~0.25%) | strong totals, weak BPM split |
| latam | 0.6–1.0 M | $8–15 bn | ~$4–10k exports per worker | 0.2–0.3% | weak |
| oecd-ex-us (CEE) | Poland 0.50 M (+other CEE) | Poland $48.4 bn | $64k | <0.5% of region | Poland moderate |
| mena | 0.35–0.45 M | $8–10 bn | ~$20–25k | ~0.2% | moderate (Egypt, Morocco) |
| ssa | 0.15–0.25 M | $1–2 bn | ~$5–10k | <0.1% | weak |
| china | n/a for CX-type work | $163 bn offshore outsourcing (broad) | n/a | n/a | definitional mismatch |
| russia | small | small | n/a | n/a | not sourced |
| us | importer (2.81 M domestic CSRs) | — | — | — | — |

---

## 4. AI exposure and substitution of these occupations

### Exposure indices

**ILO WP 140 (2025):** Gmyrek, Berg, Kamiński, Konopczyński, Ładna, Rosłaniec, Troszyński, "Generative AI and Jobs: A Refined Global Index of Occupational Exposure" [P, HTML version]
- "one in four workers are in an occupation with some GenAI exposure". 3.3% of global employment is in Gradient 4, the highest (women 4.7%, men 2.4%; in high-income countries, 9.6% of women vs 3.5% of men).
- Overall exposure is 11% of employment in low-income countries vs 34% in high-income countries.
- Occupation scores (task mean; Gradient) from the Annex:
  - **4222 Contact Centre Information Clerks: 0.58 (Gradient 3)**
  - **5244 Contact Centre Salespersons: 0.61 (Gradient 4)**
  - 4223 Telephone Switchboard Operators: 0.54 (G3)
  - 4110 General Office Clerks: 0.60 (G4)
  - 4313 Payroll Clerks: 0.61 (G4)
  - 2514 Applications Programmers: 0.57 (G3)
  - 2512 Software Developers: 0.53 (G3)
- "transformation of jobs is the most likely impact of GenAI"

The 2023 predecessor (Gmyrek, Berg & Bescond, ILO WP 96) is cited in WP140 as the base method. I did not re-read its headline shares this session; from memory they are ~2.3% automation potential and ~13% augmentation [unverified].

**IMF SDN/2024/001** (Cazzaniga, Jaumotte, Li, Melina, Panton, Pizzinelli, Rockall, Mendes Tavares, 14 Jan 2024) [P]:
- "Almost 40 percent of global employment is exposed to AI"
- Advanced economies ~60%, emerging markets 40%, low-income countries 26%
- Advanced economies: 27% high exposure / high complementarity; "about half may be negatively affected"
- High-exposure employment: India 26%, Brazil 41%, US ~60%

**IMF WP/25/043** (Cucio & Hennig, Feb 2025), Philippines [P]:
- ~one third of workers highly exposed; ~61% of those are high-complementarity
- **14% of the workforce is high-exposure / low-complementarity**
- "BPO is identified as the sector with the highest proportion of jobs at risk"

**World Bank, *World Development Report 2026*** (4 Aug 2026) [S: Manila Bulletin, Outsource Accelerator]:
- 4.5% of jobs in low- and middle-income countries face high automation risk, vs 14.2% in high-income economies. 16.2% vs 18.7% could see productivity gains.
- The Philippines is flagged among the most exposed because of BPO.
- "Outsourced jobs flowing to developing economies declined 39% in 2025" comes from online freelance-platform data. **Its attribution to the WDR or to a platform is unverified.**

A World Bank report from Dec 2025 cites 1.82 M BPO workers, 1.6 M of them in contact centres, and a "higher-than-expected" displacement risk [S; title and numbers unverified].

### Observed evidence, 2023–26

**Brynjolfsson, Li & Raymond, "Generative AI at Work", *QJE* 140(2), 2025** [S]
- A Fortune-500 customer-support deployment raised issues resolved per hour by **14%** (15% in the QJE press release), and by **34%** for novice and low-skill agents.
- This is augmentation, not headcount data.

**Klarna press release, 27 Feb 2024** [P]
- 2.3 M conversations, "two-thirds of Klarna's customer service chats". "Equivalent work of 700 full-time agents".
- Resolution time under 2 min vs 11 min; repeat inquiries −25%; "$40 million USD in profit improvement" (2024 estimate).
- By May 2025 Klarna was rehiring humans for complex cases after quality complaints [S: Entrepreneur, CX Dive].
- Lesson: chat deflection of ~2/3 is feasible fast, but the full-substitution ceiling is lower.

**Brynjolfsson, Chandar & Chen, "Canaries in the Coal Mine"** (Stanford Digital Economy Lab; Aug/Nov 2025) [S]
- Ages 22–25 in the most AI-exposed US occupations: **−13%** relative employment (−16% in the Nov 2025 version as reported).
- ADP: early-career customer-service employment down ~11% from its Nov 2022 peak by Jul 2025 [S].

**Demirci, Hannane & Zhu, *Management Science* 71(10), 2025** [S]
- On an online freelancing platform, posts for automation-prone writing and coding jobs fell **21%** within ~8 months of ChatGPT. Image-generation jobs fell 17%.

**Industry headcounts**
- IBPAP's 2028 downside implies flat-to-falling Philippine headcount (1.89 → 1.85 M) while revenue still grows [S].
- NASSCOM FY26: revenue +6.1% vs headcount +2.3% [P].
- TCS: >12,000 layoffs in 2025 [S, Reuters 21 Aug 2026].
- Teleperformance: 485,606 employees at end-2025 vs 489,488 at end-2024 (−0.8%) [S, Tracenable citing the 2025 Universal Registration Document]. Revelio's modelled estimates show −12% for both TP and Concentrix [S, model-based].

**Forecasts**
- Gartner (31 Aug 2022) [S]: conversational AI cuts contact-centre agent labour costs by **$80 bn in 2026**; ~1.6% of interactions automated in 2022 → ~10% by 2026.
- Gartner (5 Mar 2025) [S]: agentic AI will resolve **80% of *common* issues** without humans by 2029, cutting operating costs ~30%.
- Gartner (26 Jan 2026) [S]: GenAI cost per resolution will **exceed $3 by 2030, "higher than many B2C offshore human agents"**.
- BLS: US customer service representatives −5% over 2024–34 [P-ish].

### Defensible ranges [est]

These are synthesised from the exposure scores (~0.55–0.6 mean task automation potential for contact-centre occupations), the observed slow headcount response (≤ a few % by 2026), and the forecasts above.

| | Technical task exposure (now) | Labour substituted, 2030 | Labour substituted, 2040 |
|---|---|---|---|
| Contact centre (voice/chat CX) | 55–60% of task content (ILO 0.58–0.61) | **15–30%, central 20%** | **40–65%, central 50%** |
| Back-office BPS (F&A, data entry, claims) | ~60% (ILO 0.60–0.63 clerical) | 15–30%, central 20% | 45–70%, central 55% |
| IT services / ADM | ~53–57% | 10–20% (shows up as price deflation of 3–5%/yr) | 30–50% |

How adoption behaves:
- Logistic, with the midpoint ~2032–35.
- 2025–26 shows up as a hiring slowdown, not layoffs: PH headcount growth fell from ~8%/yr (2021–23) to 4% (2025), and the 2028 downside path is about −1%/yr.
- Demand elasticity partly offsets substitution: cheaper contacts mean more contacts, and the Klarna rehiring shows the quality limit.
- A plausible annual displacement rate for CX headcount: 0–1%/yr through 2027, rising to 4–7%/yr in the early 2030s.

**Weak points**
- No source gives a direct time path of substituted share. All of these are judgments built on the exposure scores.

---

## 5. Labour-market reabsorption of displaced workers

**United States**
- BLS Displaced Worker Survey (USDL-24-1777, 29 Aug 2024) [S]: of 2.6 M long-tenured workers displaced in 2021–23, **65.7% were reemployed** in Jan 2024, 16.1% unemployed and 18.2% out of the labour force. Jan 2026 (2023–25 displacements): 66.1%. Displacements are spread over a ~3-year window, so this implies an annual reemployment hazard of roughly **40–55%** [est].
- Jacobson, LaLonde & Sullivan (1993, AER 83(4)) [S, Chicago Fed summary]: high-tenure displaced workers lose **~25% of earnings per year**, persisting 5+ years.
- Davis & von Wachter (2011, BPEA) [S]: present-value losses of **1.4 years** of pre-displacement earnings when unemployment is below 6%, and **2.8 years** when it is above 8% (men, 3+ years tenure, 5% discount rate, 20 years).

**Mexico**
- Arias & Lederman (2025), World Bank PRWP 11116 [P]: plant closings cut hourly wages by **10.8% one year after** and **7.5% on average over nine years**. Displaced workers work +1.4 to +2.8 hours/week more. The probability of formal employment falls by 2.1pp in the year of closure. Stigma explains 30.8% of losses and lost firm-specific human capital 69.2%.

**Brazil**
- A formal-to-informal switch costs ~0.28 log points of net earnings in a year [S, snippet; paper not identified; unverified].

**Labour flows and development**
- Donovan, Lu & Schoellman (QJE 138(4), 2023) [S]: job-finding, employment-exit and job-to-job rates are **2–3× higher in the poorest countries** than the richest. This is a "slippery job ladder" of frequent moves into and out of marginal employment.

**Philippines**
- PSA, Dec 2025 [S]: unemployment 4.4% (2.26 M), underemployment 8.0% (May 2025: 13.1%), employed 49.43 M.
- Implication: displaced BPO workers are likely to be re-absorbed quickly into *some* work (informal, own-account, underemployed), not into comparable jobs.

### Defensible model parameters [est]

| Parameter | EM (PH, India, latam, mena, ssa) | US / oecd-ex-us |
|---|---|---|
| Annual reabsorption into any employment | **50–70%/yr** (high EM flows; low open unemployment) | 40–55%/yr |
| Annual reabsorption into comparable formal / skilled jobs | **15–25%/yr** | 30–40%/yr |
| Long-run earnings loss on re-employment | **35–50%** for BPO workers (PH BPO revenue per FTE ≈ 2× GDP per worker; Mexico-style 8–11% only within similar formal jobs) | 15–25% (JLS; PV 1.4–2.8 yrs) |

The 35–50% EM earnings loss is a composition argument [est]: BPO pays a premium over the economy average, and re-employment lands nearer the average. **No direct study of displaced BPO workers was found.** That is the main gap.

---

## 6. How the value of displaced offshored work splits

### Human cost per hour and per contact

- IBPAP contact-centre revenue per FTE is **$20.1k/yr**, about **$10 per billed hour** at ~2,000 h [est].
- Vendor billing rates [S, vendor blogs, weak]:
  - Philippines $7.50–19/h (premium $12–18)
  - India $9–12/h
  - US onshore $25–45/h
  - LatAm $14–20/h and Eastern Europe $18–26/h (2022 figures)
- Gartner median cost per contact [S, Gartner Insights abstract, Feb 2024]: **$13.50 assisted vs $1.84 self-service**. The 2019 figures were $8.01 vs $0.10 [S].
- Offshore cost per contact [est]: at $10/h and 6–10 contacts per hour, **~$1–2 per contact**.

### AI prices

- Intercom Fin **$0.99 per resolution** [S, vendor pages].
- Salesforce Agentforce **$2 per conversation**, or $0.10 per action under Flex Credits [S].
- Zendesk ~$1.50–2.00 per automated resolution [S].
- Voice (OpenAI gpt-realtime family) [S, third-party conversions of OpenAI's token prices]:
  - list prices $32 / $64 per million audio input/output tokens
  - ≈ $0.02/min heard + $0.08/min spoken
  - $0.07–0.43/min all-in depending on caching
- Gartner (Jan 2026) [S]: **GenAI total cost per resolution will exceed $3 by 2030**, above many B2C offshore agents, once talent, integration and usage overruns are counted.

### Who captures the value

- India [S, Reuters 21 Aug 2026]: clients demand "25% to 30% less" for the same work (Persistent). HCLTech puts industry price deflation at 3–5%/yr, Everest ~5% (vs ~2% historically). TCS has ~80% of BPS contracts on outcome pricing.
- **No source estimates the split directly.**
- My inference [est, weak]: against *offshore* labour at ~$1–2 per contact, AI per-resolution list prices of $1–2 and Gartner's >$3 all-in cost mean AI vendors would capture a *large* share of the displaced spend, and importer savings would be thin. Against *onshore* labour at ~$13.50, AI captures ~10–20%.

### Suggested model split of displaced offshore BPO revenue [est]

| Destination | Central | Range |
|---|---|---|
| AI provider revenue (software, inference, cloud) | 35% | 20–60% |
| Importing-firm cost savings (profits, prices) in the importer region (US ~65–70%, oecd-ex-us ~20–30% per IBPAP buyer split) | 55% | 30–70% |
| Retained by the exporter's own providers selling AI-augmented services (e.g. Indian AI revenue $10–12 bn, PH "AI-enabled" roadmap) | 10% | 0–20% |

Where AI-provider revenue lands [est]:
- By headquarters: **~75–85% US, ~5–15% China, ~5–10% Europe**.
- The compute/electricity footprint follows the Section 1 datacentre shares instead: US ~44%, China ~25–30%, oecd-ex-us ~18–25%.

---

## Biggest evidence gaps

1. Regional datacentre TWh outside the US, China, Europe, Japan and India (~9% of the world total) is allocated by judgment. IEA has published no 2035 regional split.
2. IFR country stocks outside the top five are not public. The small-region robot shares are estimates.
3. Headcounts for India BPM, Mexico, Vietnam, South Africa (total) and Kenya are weak or unverified. China's "service outsourcing" is definitionally different from CX/BPO work.
4. No time series of the substituted share exists. The 2030/2040 ranges are judgment built on the ILO and IMF exposure indices and early headcount signals.
5. No study follows displaced BPO workers in an emerging market. The reabsorption and earnings-loss parameters are borrowed from the US and from Mexico plant closings.
6. No source estimates the AI-vendor vs importer split of displaced offshore spend. Gartner's 2030 cost-per-resolution forecast suggests AI captures a large share when the displaced labour is offshore.
