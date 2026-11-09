#!/usr/bin/env python3
"""Panel bookkeeping for the five-megatrends (climate) Tetlock run (rebuilds bundle.json from seats/).

  build_bundle.py check                 -> parse every saved reply, report schema and coherence problems
  build_bundle.py packet <E> <wave>     -> write seats/E<E>-wave<wave>-packet.md (own effort only)
  build_bundle.py bundle <out.json>     -> assemble the aggregator bundle
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PANEL = os.path.join(HERE, "seats")
EFFORTS = {1: "trade-chokepoints", 2: "neutral-rate-capital", 3: "sovereign-debt-fiscal", 4: "gdp-divergence"}
WAVE1 = ["outside-view", "fermi", "signals"]
WAVE2 = ["bayes", "premortem"]
WAVE3 = ["calibrator"]

QUESTIONS = [
    {"id": "c1", "type": "continuous", "label": "C1 World trade/GDP volume elasticity, 2026-2045", "unit": "x"},
    {"id": "q1", "type": "binary", "label": "Q1 Elasticity < 0.75 and digital + AI goods + minerals > 42% of trade"},
    {"id": "c2", "type": "continuous", "label": "C2 HLW r* composite (US, euro area, Canada), 2036-2045 avg", "unit": "%"},
    {"id": "q2", "type": "binary", "label": "Q2 r* composite >= 2.00%, 2036-2045"},
    {"id": "c3", "type": "continuous", "label": "C3 IMF advanced-economy gross debt, 2045", "unit": "% GDP"},
    {"id": "q3", "type": "binary", "label": "Q3 G7 climate fiscal cost >= 1.5% GDP/yr, 2040-2045"},
    {"id": "q4", "type": "binary", "label": "Q4 >= 3 G7: automation tax >= 2% GDP or formal YCC, by 2045"},
    {"id": "c4", "type": "continuous", "label": "C4 OECD + China real GDP per capita CAGR, 2026-2045", "unit": "%/yr"},
    {"id": "q5", "type": "binary", "label": "Q5 US + China > 50% and EU-27 < 11.5% of world nominal GDP, 2045"},
    {"id": "q6", "type": "regimes", "label": "Q6 2045 end-state (lexical priority C, A, B)",
     "options": [{"id": "A", "label": "High-productivity techno-abundance"},
                 {"id": "B", "label": "Bifurcated bloc capitalism and repression (residual)"},
                 {"id": "C", "label": "Stagflationary climate-debt crisis"}]},
]
BINARY = [q["id"] for q in QUESTIONS if q["type"] == "binary"]
CONTINUOUS = [q["id"] for q in QUESTIONS if q["type"] == "continuous"]
ORDER = [q["id"] for q in QUESTIONS]


def path(e, lens):
    return os.path.join(PANEL, f"E{e}-{lens}.md")


def parse(e, lens):
    p = path(e, lens)
    if not os.path.exists(p):
        return None, None
    text = open(p, encoding="utf-8").read()
    blocks = re.findall(r"```json\s*(\{.*?\})\s*```", text, re.S)
    if not blocks:
        return text, {"_error": "no json block"}
    try:
        return text, json.loads(blocks[-1])
    except json.JSONDecodeError as err:
        return text, {"_error": f"bad json: {err}"}


def problems(d):
    """Schema violations (block the bundle) and coherence warnings (reported, never repaired)."""
    out = []
    if "_error" in d:
        return [d["_error"]]
    for q in BINARY:
        v = d.get(q)
        if not isinstance(v, (int, float)) or not 1 <= v <= 99:
            out.append(f"{q}={v}")
    for q in CONTINUOUS:
        v = d.get(q) or {}
        if not all(k in v for k in ("p10", "p50", "p90")) or not v["p10"] < v["p50"] < v["p90"]:
            out.append(f"{q}={v}")
    v = d.get("q6") or {}
    if set(v) != {"A", "B", "C"} or any(x < 0 for x in v.values()) or abs(sum(v.values()) - 100) > 0.51:
        out.append(f"q6={v}")
    if out:
        return out
    # Coherence rules from questions.md (necessary conditions only).
    c1, c2 = d["c1"], d["c2"]
    if c1["p10"] >= 0.75 and d["q1"] > 10:
        out.append(f"coherence: q1={d['q1']} but C1 P10={c1['p10']} >= 0.75")
    if c1["p50"] >= 0.75 and d["q1"] > 50:
        out.append(f"coherence: q1={d['q1']} but C1 P50={c1['p50']} >= 0.75")
    if c2["p90"] < 2.0 and d["q2"] >= 10:
        out.append(f"coherence: q2={d['q2']} but C2 P90={c2['p90']} < 2.00")
    if c2["p50"] >= 2.0 and d["q2"] < 50:
        out.append(f"coherence: q2={d['q2']} but C2 P50={c2['p50']} >= 2.00")
    if c2["p10"] >= 2.0 and d["q2"] < 90:
        out.append(f"coherence: q2={d['q2']} but C2 P10={c2['p10']} >= 2.00")
    return out


def numbers(d):
    return " | ".join(f"{q}={d.get(q)}" for q in ORDER)


def body(text):
    """Reply without its trailing json block (the numbers are restated compactly)."""
    return re.sub(r"```json\s*\{.*?\}\s*```", "", text, flags=re.S).strip()


def cmd_check():
    for e in EFFORTS:
        for lens in WAVE1 + WAVE2 + WAVE3:
            text, d = parse(e, lens)
            if d is None:
                continue
            pr = problems(d)
            print(f"E{e}-{lens}: {'OK' if not pr else 'PROBLEMS ' + '; '.join(pr)}")


def cmd_packet(e, wave):
    seats = WAVE1 if wave == 1 else WAVE1 + WAVE2
    L = [f"# Effort {e} ({EFFORTS[e]}) - Wave-{wave} handoff packet",
         "", "Your own effort's earlier seats only. Other efforts are deliberately withheld.", ""]
    for lens in seats:
        text, d = parse(e, lens)
        if d is None:
            raise SystemExit(f"missing E{e}-{lens}")
        L += [f"## Seat: {lens}", "", f"**Numbers:** {numbers(d)}", "", body(text), ""]
    out = os.path.join(PANEL, f"E{e}-wave{wave}-packet.md")
    open(out, "w", encoding="utf-8").write("\n".join(L))
    print(out, len(" ".join(L).split()), "words")


def cmd_bundle(out):
    efforts = []
    for e, key in EFFORTS.items():
        eff = {"effort_id": e, "effort_key": key, "wave1": [], "wave2": []}
        for wave, seats in ((1, WAVE1), (2, WAVE2)):
            for lens in seats:
                _t, d = parse(e, lens)
                if d and "_error" not in d:
                    d["lens"] = lens
                    eff[f"wave{wave}"].append(d)
        _t, d = parse(e, "calibrator")
        if d and "_error" not in d:
            d["lens"] = "calibrator"
            eff["wave3"] = d
        efforts.append(eff)
    bundle = {"title": "Five megatrends incl. physical climate change, 2026-2045",
              "forecast_origin": "2026-11-09",
              "expected_efforts": 4, "expected_per_effort": 6,
              "questions": QUESTIONS, "efforts": efforts}
    json.dump(bundle, open(out, "w", encoding="utf-8"), indent=2)
    print("wrote", out)


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "check":
        cmd_check()
    elif c == "packet":
        cmd_packet(int(sys.argv[2]), int(sys.argv[3]))
    elif c == "bundle":
        cmd_bundle(sys.argv[2])
