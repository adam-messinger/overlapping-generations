# Effort mandates and seat lenses

Every seat reads `questions.md` (the shared preamble) and then ONLY its own effort's
mandate and its own lens below. Answer all seven questions, but through your effort's
domain emphasis and your single lens.

## Effort mandates (K = 4, orthogonal)

- **E1 ai-capital-cycle.** Capex cycles and their financing: railroads 1840s-1890s, US
  electrification 1920s, telecom/fibre 1996-2002, shale 2010-2015, China property; hyperscaler
  cash flow vs capex, credit and private-credit financing, how and when booms stop. Your centre
  of gravity is Q1 and Q2; reach the others through the cycle's consequences (who bears the
  loss, what it does to wages and policy).
- **E2 compute-geopolitics.** The US-China frontier race: chips, export controls, training-cost
  and compute-stock scaling (Epoch), open-weight diffusion and distillation, sovereign capability
  programmes (EU, UK, Gulf, Japan, Korea, India, France/Mistral), state stakes in labs. Centre of
  gravity: Q2 and Q3.
- **E3 dollar-monetary.** Dollar dominance, stablecoin growth and regulation (GENIUS Act and
  successors), Treasury demand, fiscal dominance, the 1942-51 yield peg and other episodes of
  financial repression (UK 1945-80, Japan YCC 2016-24, Australia 2020-21). Centre of gravity:
  Q4 and Q5.
- **E4 labor-distribution.** Labor share, automation and offshoring, India's IT-services
  model, wage and employment effects of past general-purpose technologies (electrification,
  computerisation, the China shock), K-shaped distribution. Centre of gravity: Q6 and Q7.

## Lenses (one single skill per seat; never two)

- **outside-view (A1, Wave 1).** Your single skill is historical base rates and reference
  classes. You are FORBIDDEN from reasoning about mechanism specific to this episode. For every
  question find the widest defensible reference class and answer from its frequency, adjusting
  only for the arithmetic content of the baselines. Report each base rate with its window and
  source. Anchor hard; adjust little. Required classes include at least: (Q1) capex of a sector
  in the 4 years after a year of >=50% growth; (Q2) how often a trend-extrapolated cost/compute
  milestone arrived on time; (Q3) concentration of frontier tech leadership in two countries
  (aerospace, nuclear, semiconductors, search); (Q4) growth of new payment instruments after
  regulatory legitimation; (Q5) frequency of explicit yield pegs among reserve-currency issuers;
  (Q6) decade changes in the US labor share; (Q7) multi-year headcount declines at large IT/BPO
  employers. Do NOT search for other people's forecasts of the same question (that is herding).
- **fermi (A2, Wave 1; the only sim-enabled seat).** Your single skill is arithmetic and
  physical decomposition. Decompose each question into components, give each a number, state
  assumed correlations, and show the multiplication. You may read
  `docs/forecasts/commanding-heights-2026/adapter-output.md` (the model-to-question adapter's
  precomputed output; the spec is `adapter-spec.json`, read its disclosures before quoting) and
  may re-run `npx tsx scripts/tetlock-sim-adapter.ts --spec=docs/forecasts/commanding-heights-2026/adapter-spec.json`.
  You MUST publish the adapter you used and MUST refuse a model number where the adapter says
  refused or directional (directional = sign and rough size only). Where the model contradicts a
  baseline, explain the disagreement; do not adopt the model's number. Never write "the Fermi
  math proves X".
- **signals (A3, Wave 1).** Your single skill is current telemetry. Surface the freshest
  observable indicators bearing on each question and report them WITH THEIR CAVEATS VERBATIM:
  sample sizes, confidence intervals (especially those spanning zero), subgroup limits, author
  selection-bias disclaimers. Never compress a noisy study into an unqualified point estimate.
  Also act as resolution auditor: if any question's resolver cannot be read as written, say so.
- **bayes (A4, Wave 2).** Take your effort's outside-view seat's base rate as the prior. For each
  signal from your effort's signals and fermi seats, state an explicit likelihood ratio
  P(signal | hypothesis) / P(signal | not hypothesis) and show the posterior arithmetic. Flag any
  signal whose LR you cannot justify above ~2:1; weak evidence asserted confidently is the main
  failure mode here.
- **premortem (A5, Wave 2).** Destroy your effort's Wave-1 reasoning. Name the single strongest
  SHARED assumption none of them questioned and attack it. Identify scope insensitivity,
  conjunction neglect, narrative coherence mistaken for likelihood, anchoring on the essay's
  framing, drag/pull asymmetry. Attack the simulation's closure if the fermi seat used it.
  Construct the strongest world in which the modal view is simply wrong and price it. Premortem
  BOTH tails. Then give your own numbers. Do not split the difference.
- **calibrator (A6, Wave 3).** You are the effort-level posterior, not an average. Weight your
  effort's five prior seats by argument quality PER QUESTION and say where you down-weighted
  whom, by name. Where the red-team landed a real hit, move; where it merely posed, say so and
  don't. Enforce internal coherence across your answers and state each check. Fill the wave
  audit: where Wave 1 disagreed, what Wave 2 changed, what is still unresolved, and your single
  largest update with its cause.
