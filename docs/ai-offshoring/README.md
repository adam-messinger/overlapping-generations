# AI offshoring overlay: "AI call centres cause unemployment in the Philippines"

An overlay on the main simulation, **not part of it** (nothing in `src/modules` changes).
Code: `scripts/ai-offshoring/` (`model.ts` ledger, `data.ts` inputs, `run.ts` runner).
Evidence and source tags: `evidence.md`. Full output: `results.md`
(`npx tsx scripts/ai-offshoring/run.ts`).

## How it works

1. Run the main model; take each region's GDP path.
2. Offshored, AI-exposed service jobs per exporter (contact centres, back office, IT) would
   grow with their buyers' GDP (US + OECD-ex-US, elasticity 1).
3. AI does a rising share of those tasks: logistic adoption fitted to the evidence ranges
   (central 18% by 2030, 52% by 2040; slow 10/38%; fast 27/66%). IT work has half the exposure.
4. Displaced workers enter an unemployment pool (60%/yr back into some work in emerging markets)
   and a "not back in comparable formal work" pool (20%/yr), re-employed at 40% lower pay.
5. The exporter loses the work's value-added (less 10% kept by its own AI-using firms and the
   re-employed workers' new output); AI providers receive 35% of the displaced work's value
   (80% US, 10% China, 10% OECD-ex-US by headquarters); the rest is a cost saving to buyers.
6. Those flows go back into the main model as regional output factors
   (`demand.commodityShocks[].regionalOutputFactors`), iterated to a fixed point.

## What it shows (central adoption unless stated)

**Philippines: a fast, concentrated shock that shows up more in income than in unemployment.**
Contact-centre and business-process jobs fall from 1.68M (2025) to about 1.13M by 2035, against
2.17M without AI: about 1.0M displaced, 0.55M fewer jobs in absolute terms. Most of it happens
in 2028-35.

| Labour-market assumption | Peak unemployment rise (central / fast) | Peak GDP loss (central / fast) |
|---|---|---|
| 60%/yr back into any work, 40% pay cut (central) | +0.5pp / +0.8pp (2032) | 0.8% / 1.1% |
| 45%/yr, 25% pay cut (US-like) | +0.7pp / +0.9pp | 0.7% / 1.0% |
| 30%/yr | +0.9pp / +1.2pp | 1.0% / 1.4% |
| 15%/yr | +1.3pp / +1.7pp | 1.3% / 1.7% |

Unemployment was 4.4% in December 2025 (PSA). So the open-unemployment effect is a visible but
transitional bump (roughly 4.4% -> 5-6%), fading by 2040 as people find other work. The durable
effect is income and formality: about 0.5M people (1% of employment) are out of comparable formal
work at the peak, and displaced workers lose about $7bn a year of earnings by 2035 (about 1% of
GDP), because BPO pay is roughly twice the Philippine average.

**The Philippines is the most exposed large economy, by far.** India displaces more people
(about 2.4M across BPM and IT services by 2035) but they are under 0.5% of its workforce: peak
unemployment +0.06pp, GDP loss ~0.3%. Poland's shared-service centres lose ~0.3% of GDP; Egypt
and Morocco ~0.2%; LatAm nearshore and Kenya/South Africa ~0.0-0.1%.

**Regionally it is a transfer, not a loss.** World GDP is unchanged (by construction: AI does the
work; the main model's AI productivity channel is off by default). In the main model the US
gains about 0.13% of GDP, India loses about 0.3%, SE Asia only ~0.08% because the Philippines is
about a ninth of that region's market-rate GDP. AI providers earn ~$41bn a year from displaced
work by 2040, ~80% in the US.

**Jobs recover after adoption plateaus, which is an assumption.** With a fixed AI ceiling, demand
growth brings remaining human work back (1.46M by 2050). If AI capability keeps rising past the
evidence ranges, there is no recovery.

## What it teaches about the main model

- **Country shocks need country resolution.** A 1% of GDP shock in the Philippines is 0.08% of
  the SE Asia region; the nine-region model cannot see this dynamic without an overlay.
- **SSA is fragile to tiny perturbations.** A 0.01% nudge to US output moves SSA's GDP by up to
  -0.54% in 2038-50 (and back to ~0 by 2055). Regional effects below ~0.5% in SSA are noise.
- **The model has no unemployment, no services trade and no regional AI location**; the overlay
  supplies them outside it.

## Not modelled

Local multipliers (BPO spending in Manila/Cebu retail and property), tax-revenue loss, the peso,
migration, AI-enabled new service exports from the same countries (beyond the 10% retained share),
the importers' cost savings (55%: no region is credited directly; the allocator renormalises),
and AI's world productivity gains.
