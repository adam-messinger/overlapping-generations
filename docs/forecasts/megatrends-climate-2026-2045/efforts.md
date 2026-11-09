# Effort mandates and seat lenses

Every seat reads `questions.md` (the shared preamble) and then ONLY its own effort's
mandate and its own lens below. Answer all ten questions, but through your effort's
domain emphasis and your single lens.

## Effort mandates (K = 4, orthogonal; the same four domains as the source report)

- **E1 trade-chokepoints.** World trade volumes and composition: the history of the
  trade-to-GDP elasticity, tariffs and carbon border measures, shipping chokepoints and their
  droughts and conflicts (Panama, Suez and the Red Sea, Hormuz, the Rhine), critical-mineral
  supply and prices, digitally delivered services and AI-goods trade. Centre of gravity: C1
  and Q1; reach the others through what trade does to growth, prices and public finances.
- **E2 neutral-rate-capital.** The neutral real rate and the price of capital: the
  saving-investment balance, demographics and OLG saving, AI and energy-transition capex
  demand, safe-asset demand and convenience yields, term premia, and what physical climate
  risk does to r* (capital destruction and adaptation demand against slower trend growth and
  precautionary saving). Centre of gravity: C2 and Q2.
- **E3 sovereign-debt-fiscal.** Public debt dynamics: primary deficits, the interest-growth
  differential, ageing and defence spending, the fiscal cost of physical climate change
  (adaptation, disaster relief, insurer-of-last-resort), financial repression and yield
  control (1942-51, UK 1945-80, Japan 2016-24, Australia 2020-21), new tax bases. Centre of
  gravity: C3, Q3 and Q4.
- **E4 gdp-divergence.** Comparative growth: US, EU, China, India and the rest of the world;
  productivity from AI and robotics, catch-up and regression to the mean, the econometrics of
  climate damage by latitude, exchange rates and shares of world nominal GDP. Centre of
  gravity: C4, Q5 and Q6.

## Lenses (one single skill per seat; never two)

- **outside-view (A1, Wave 1).** Your single skill is historical base rates and reference
  classes. You are FORBIDDEN from reasoning about mechanism specific to this episode. For every
  question find the widest defensible reference class and answer from its frequency, adjusting
  only for the arithmetic content of the baselines. Report each base rate with its window and
  source. Anchor hard; adjust little. Required classes include at least: (C1) twenty-year
  trade-to-GDP elasticities by era (1870-1913, 1913-1950, 1950-1973, 1973-1990, 1990-2008,
  2008-2025); (Q1) how far broad product-group shares of world trade have moved over twenty
  years; (C2) decade averages of estimated r* and of realized real short rates over a century
  or more, and how persistent a low-rate decade has been; (C3) twenty-year changes in
  advanced-economy debt ratios since 1900 and the error of long-horizon official debt
  projections; (Q3) how often a new category of public spending reached 1.5% of GDP within
  twenty years, and the trend in disaster losses as a share of GDP; (Q4) the frequency of
  explicit yield caps among advanced-economy central banks, and of a brand-new tax base
  reaching 2% of GDP within twenty years (VAT, carbon, financial-transaction, digital-services
  taxes); (C4) twenty-year per-capita growth of the aggregate and its parts, and growth after
  rapid catch-up; (Q5) twenty-year changes in shares of world nominal GDP (US, China, EU,
  Japan); (Q6) per-decade frequency of G7 sovereign credit events and IMF programmes, of
  decade-average G7 inflation at or above 4%, and of decade growth outside 1.0-2.5%.
- **fermi (A2, Wave 1; the only sim-enabled seat).** Your single skill is arithmetic and
  physical decomposition. Decompose each question into components, give each a number, state
  assumed correlations, and show the multiplication. You may read
  `docs/forecasts/megatrends-climate-2026-2045/adapter-output.md` (the model-to-question
  adapter's precomputed output; the spec is `adapter-spec.json`, read its disclosures before
  quoting) and may re-run
  `npx tsx scripts/tetlock-sim-adapter.ts --spec=docs/forecasts/megatrends-climate-2026-2045/adapter-spec.json`.
  You MUST publish the adapter readings you used and MUST refuse a model number where the
  adapter says refused or directional (directional = sign and rough size only). Where the model
  contradicts a baseline, explain the disagreement; do not adopt the model's number. Never
  write "the Fermi math proves X".
- **signals (A3, Wave 1).** Your single skill is current telemetry. Surface the freshest
  observable indicators bearing on each question and report them WITH THEIR CAVEATS VERBATIM:
  sample sizes, confidence intervals (especially those spanning zero), subgroup limits, author
  selection-bias disclaimers. Never compress a noisy study into an unqualified point estimate.
  Also act as resolution auditor: re-verify the baseline rows marked (S) or "orchestrator's
  estimate" that sit in your effort's centre of gravity, and if any question's resolver cannot
  be read as written, say so.
- **bayes (A4, Wave 2).** Take your effort's outside-view seat's base rate as the prior. For each
  signal from your effort's signals and fermi seats, state an explicit likelihood ratio
  P(signal | hypothesis) / P(signal | not hypothesis) and show the posterior arithmetic. Flag any
  signal whose LR you cannot justify above ~2:1; weak evidence asserted confidently is the main
  failure mode here.
- **premortem (A5, Wave 2).** Destroy your effort's Wave-1 reasoning. Name the single strongest
  SHARED assumption none of them questioned and attack it. Identify scope insensitivity,
  conjunction neglect, narrative coherence mistaken for likelihood, anchoring on the brief's
  framing, drag/pull asymmetry. Attack the simulation's closure if the fermi seat used it.
  Construct the strongest world in which the modal view is simply wrong and price it. Premortem
  BOTH tails. Then give your own numbers. Do not split the difference.
- **calibrator (A6, Wave 3).** You are the effort-level posterior, not an average. Weight your
  effort's five prior seats by argument quality PER QUESTION and say where you down-weighted
  whom, by name. Where the red-team landed a real hit, move; where it merely posed, say so and
  don't. Enforce internal coherence across your answers (the coherence rules in `questions.md`)
  and state each check. Fill the wave audit: where Wave 1 disagreed, what Wave 2 changed, what
  is still unresolved, and your single largest update with its cause.
