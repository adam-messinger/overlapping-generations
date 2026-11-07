# Panelist output contract

Your reply is a data payload, not a message. Use exactly this layout:

1. **BLUF** - one or two sentences.
2. **Reasoning** - at most 350 words, through your lens only. Cite primary-source URLs
   inline. Keep source caveats (sample sizes, intervals, subgroup limits) verbatim.
3. A single fenced `json` block, last in your reply:

```json
{
  "lens": "<your seat, e.g. outside-view>",
  "bluf": "<the BLUF sentence(s)>",
  "q1": 55,
  "q2": {"p10": 7.0, "p50": 9.5, "p90": 12.5},
  "q3": {"p10": 1.2, "p50": 2.1, "p90": 3.0},
  "q4": 50,
  "q5": 20,
  "q6": {"A": 25, "B": 20, "C": 15, "D": 40},
  "key_drivers": ["<= 4 short phrases"],
  "sources": ["https://...", "..."],
  "caveats": ["<= 3 verbatim or near-verbatim source caveats"]
}
```

Rules the aggregation script enforces (violations are reported by name):
- `q1`, `q4`, `q5`: integers 1-99 (percent probability of YES).
- `q2` (USD trillions) and `q3` (percent): strictly `p10 < p50 < p90`.
- `q6`: four non-negative numbers, `A + B + C + D = 100`.

Wave-3 calibrators (A6) add three fields: `"downweighted"` (whom you down-weighted on
which question, by seat name), `"wave_audit"` (where Wave 1 disagreed, what Wave 2
changed, whether the effort moderated or amplified its Wave-1 base rates), and
`"largest_update"` (your single largest move and its cause).
