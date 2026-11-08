#!/usr/bin/env python3
"""Panel bookkeeping for the Commanding Heights Tetlock run (rebuilds bundle.json from seats/).

  build_panel.py check                 -> parse every saved reply, report schema problems
  build_panel.py packet <E> <wave>     -> write panel/E<E>-wave<wave>-packet.md (own effort only)
  build_panel.py bundle <out.json>     -> assemble the aggregator bundle
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PANEL = os.path.join(HERE, "seats")
EFFORTS = {1: "ai-capital-cycle", 2: "compute-geopolitics", 3: "dollar-monetary", 4: "labor-distribution"}
WAVE1 = ["outside-view", "fermi", "signals"]
WAVE2 = ["bayes", "premortem"]
WAVE3 = ["calibrator"]

QUESTIONS = [
    {"id": "q1", "type": "regimes", "label": "Big-4 capex 2030 / 2026",
     "options": [{"id": "A", "label": "Line broken (<1x)"},
                 {"id": "B", "label": "Plateau (1-2x)"},
                 {"id": "C", "label": "Sustained growth (2-4x)"},
                 {"id": "D", "label": "The essay's line (>=4x)"}]},
    {"id": "q2", "type": "binary", "label": "Epoch: >=$10B training run by end-2028"},
    {"id": "q3", "type": "binary", "label": "LMArena top-10 orgs all US/China, end-2028"},
    {"id": "q4", "type": "continuous", "label": "Stablecoin supply, 31 Dec 2028", "unit": "USD bn"},
    {"id": "q5", "type": "binary", "label": "Fed/Treasury yield cap announced before 2031"},
    {"id": "q6", "type": "continuous", "label": "BLS nonfarm labor share, 2030 average", "unit": "%"},
    {"id": "q7", "type": "binary", "label": "Indian IT big-5 headcount -10% (Mar 2026 -> Mar 2029)"},
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
    for q in ("q2", "q3", "q5", "q7"):
        v = d.get(q)
        if not isinstance(v, (int, float)) or not 1 <= v <= 99:
            out.append(f"{q}={v}")
    for q in ("q4", "q6"):
        v = d.get(q) or {}
        if not all(k in v for k in ("p10", "p50", "p90")) or not v["p10"] < v["p50"] < v["p90"]:
            out.append(f"{q}={v}")
    v = d.get("q1") or {}
    if set(v) != {"A", "B", "C", "D"} or any(x < 0 for x in v.values()) or abs(sum(v.values()) - 100) > 0.51:
        out.append(f"q1={v}")
    return out


def numbers(d):
    return " | ".join(f"{q}={d.get(q)}" for q in ("q1", "q2", "q3", "q4", "q5", "q6", "q7"))


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
    bundle = {"title": "The Commanding Heights 2026-2031", "forecast_origin": "2026-11-08",
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
