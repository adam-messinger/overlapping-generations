#!/usr/bin/env python3
"""Panel bookkeeping for the megatrends Tetlock run (rebuilds bundle.json from seats/).

  build_panel.py check                 -> parse every saved reply, report schema problems
  build_panel.py packet <E> <wave>     -> write panel/E<E>-wave<wave>-packet.md (own effort only)
  build_panel.py bundle <out.json>     -> assemble the aggregator bundle
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PANEL = os.path.join(HERE, "seats")
EFFORTS = {1: "energy-electrification", 2: "ai-robotics", 3: "demography-olg", 4: "fragmentation-fiscal"}
WAVE1 = ["outside-view", "fermi", "signals"]
WAVE2 = ["bayes", "premortem"]
WAVE3 = ["calibrator"]

QUESTIONS = [
    {"id": "q1", "type": "binary", "label": "World trade/GDP 2035 below 2024"},
    {"id": "q2", "type": "continuous", "label": "Digital services exports 2035", "unit": "USD tn"},
    {"id": "q3", "type": "continuous", "label": "US 10y TIPS, 2035 average", "unit": "%"},
    {"id": "q4", "type": "binary", "label": "US net interest >= 4.5% GDP, FY2035"},
    {"id": "q5", "type": "binary", "label": "China >= 75% of US nominal GDP, 2035"},
    {"id": "q6", "type": "regimes", "label": "2045 end-state (lexical priority)",
     "options": [{"id": "A", "label": "Fiscal dominance"},
                 {"id": "B", "label": "Capex-led abundance"},
                 {"id": "C", "label": "Secular stagnation returns"},
                 {"id": "D", "label": "Fragmented middle (residual)"}]},
]


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
    out = []
    if "_error" in d:
        return [d["_error"]]
    for q in ("q1", "q4", "q5"):
        v = d.get(q)
        if not isinstance(v, (int, float)) or not 1 <= v <= 99:
            out.append(f"{q}={v}")
    for q in ("q2", "q3"):
        v = d.get(q) or {}
        if not all(k in v for k in ("p10", "p50", "p90")) or not v["p10"] < v["p50"] < v["p90"]:
            out.append(f"{q}={v}")
    v = d.get("q6") or {}
    if set(v) != {"A", "B", "C", "D"} or any(x < 0 for x in v.values()) or abs(sum(v.values()) - 100) > 0.51:
        out.append(f"q6={v}")
    return out


def numbers(d):
    return (f"q1={d.get('q1')} | q2={d.get('q2')} | q3={d.get('q3')} | q4={d.get('q4')} | "
            f"q5={d.get('q5')} | q6={d.get('q6')}")


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
    bundle = {"title": "Four megatrends 2026-2045", "forecast_origin": "2026-11-07",
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
