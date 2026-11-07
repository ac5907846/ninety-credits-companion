"""Build data/*.json for the companion site from 02_analysis results, 01_raw_data and the manuscript sources. Every
number on the site comes from here; nothing is typed into the pages.

Rewritten 7 November 2026 for the article "Beyond Credit Hours: Accreditation, Curriculum Integration, and Content
Preservation in Professional Degrees" (RQ1 to RQ3; Figs. 1 to 4; Tables 1 and 2; Tables S1 to S7; Figures S1 and S2).
A number the article prints is filled by the manuscript builder from the article's own placeholder, so the site and the
article print the same string; a number a figure prints is formatted as its figure script formats it; the article's
tables come from its table functions. No program or institution is named outside the atlases (decisions 31 and 32).
The previous build is in _archive/before_beyond_credit_hours_2026-11-07/.
Run: python build_data.py   (from 05_web_app)
"""
import ast
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
A = ROOT / "02_analysis"
RAW = ROOT / "01_raw_data"
MS = ROOT / "03_manuscript" / "_source"
M14 = A / "14_state_groups" / "results"
M15 = A / "15_course_groups" / "results"
OUT = HERE / "data"
OUT.mkdir(exist_ok=True)

CLASS_LABEL = {"programs": "a reduced-credit program approved at a public university",
               "rule": "a rule or pilot policy, no public program found",
               "proposal": "a proposal, bill or study", "none": "no action found"}


def rcsv(p):
    with open(p, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def rjson(p):
    return json.load(open(p, encoding="utf-8"))


def num(v):
    if v in (None, "", "None"):
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return v
    return int(x) if x.is_integer() else round(x, 3)


def curly(s):
    """visible text uses the right single quote, never the straight apostrophe"""
    return s.replace("'", "’") if isinstance(s, str) else s


def clean(o):
    """drop control characters that some saved pages carried into the raw text"""
    if isinstance(o, str):
        return "".join(ch for ch in o if ch >= " " or ch in "\n\t")
    if isinstance(o, list):
        return [clean(x) for x in o]
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    return o


def dump(name, obj):
    json.dump(clean(obj), open(OUT / name, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"data/{name}: {(OUT / name).stat().st_size / 1024:.0f} KB")


def literal_from(path, name):
    """a dict or list literal assigned in a figure script, read without running the script (labels stay the figure's)"""
    for node in ast.parse(Path(path).read_text(encoding="utf-8")).body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise KeyError(f"{name} not in {path}")


def dec(v, nd):
    """house style as the figure scripts print it: .86, 7.8"""
    s = f"{v:.{nd}f}"
    return s[1:] if s.startswith("0.") else s


def pct_hu(s, places=0):
    """a share as a percent, rounded half up from its stored decimal value (Figure S1)"""
    q = Decimal(1).scaleb(-places) if places else Decimal(1)
    return f"{(Decimal(str(s)) * 100).quantize(q, rounding=ROUND_HALF_UP)}%"


def close(a, b):
    return abs(float(a) - float(b)) < 1e-9


# ---------------------------------------------------------------- the manuscript builder: values, placeholders, tables
def manuscript():
    sys.path.insert(0, str(MS))
    import _build_manuscript as B  # noqa: E402
    import _tables as T  # noqa: E402
    vals = B.load_values()
    for ln in (MS / "_content.md").read_text(encoding="utf-8").splitlines():  # the builder's pre-pass: Table and Fig. numbers
        if ln.startswith("[[TABLE:"):
            B.TABLE_NO.setdefault(ln.strip()[8:-2], sum(1 for v in B.TABLE_NO.values() if isinstance(v, int)) + 1)
        if ln.startswith("[[FIGURE:"):
            B.FIG_NO.setdefault(ln.strip()[9:-2].split("|")[0], len(B.FIG_NO) + 1)
    return B, T, vals


class Article:
    """F("key|filter") prints a value exactly as the article prints {{key|filter}}"""

    def __init__(self, B, T, vals):
        self.B, self.T, self.vals = B, T, vals

    def F(self, expr):
        out = self.B.fill("{{" + expr + "}}", self.vals)
        assert "{{" not in out, expr
        return out

    def fill(self, text):
        return self.B.fill(text, self.vals).strip()

    def table(self, name):
        title, rows, notes = self.T.TABLES[name](self.vals)
        return {"title": curly(re.sub(r"\s*<!--w [\d., ]+-->", "", title).strip()),
                "rows": [[curly(str(c)) for c in r] for r in rows], "notes": [curly(n) for n in notes]}


# ---------------------------------------------------------------- states: count, group, verified action
def state_table():
    st14 = {r["state"]: r for r in rcsv(M14 / "states.csv")}
    old = {r["state_abbr"]: r for r in rcsv(RAW / "policy/state_gen_ed.csv")}
    ver = {r["state_abbr"]: r for r in rcsv(RAW / "policy/state_reduced_credit_verified_2026-11-06.csv")}
    corr = {r["state_abbr"]: r for r in rcsv(RAW / "policy/state_gen_ed_corrections_2026-11-06.csv")}
    out = []
    for ab, s in sorted(st14.items()):
        o, v, c = old.get(ab, {}), ver.get(ab, {}), corr.get(ab, {})
        smin = num(s["state_min"])
        same = smin is not None and num(o.get("gen_ed_min_semester_credits")) == smin
        cls = s["reduced_credit_class"] or "none"
        out.append({"state": ab, "name": o.get("state", ab), "group": s["group"], "binding_count": num(s["binding_count"]),
                    "count_source": s["count_source"], "state_min": smin, "institutional_accreditor": s["institutional_accreditor"],
                    "accreditor_min": num(s["accreditor_min"]), "class": cls, "class_label": CLASS_LABEL[cls],
                    "construction_named": s["construction_named"] == "yes", "programs": num(s["programs_accredited_or_applicant"]),
                    "public": num(s["public"]), "modeled": num(s["modeled"]),
                    "action": curly(v.get("action", "")), "date": v.get("date", ""), "note": curly(v.get("note", "")),
                    "basis": curly(c.get("basis", "")), "overlap_rule": curly(c.get("overlap_rule", "")),
                    "url_gen_ed": (o.get("source_url_gen_ed", "") or "").split(" ; ")[0] if same else ""})
    return out, corr


# ---------------------------------------------------------------- Fig. 1 classes (as plot_geography.py builds them)
GEO_SCRIPT = A / "15_course_groups" / "plot_geography.py"


def fig1_classes():
    states = rcsv(M14 / "states.csv")
    S14 = rjson(M14 / "summary.json")
    S15 = rjson(M15 / "summary.json")
    geo_rows = rcsv(M15 / "geography.csv")
    geo = {r["group"]: r for r in geo_rows}
    HC = S14["high_count_groups"]
    NONE = "No state or accreditor count"
    HIGH = list(HC["groups"])

    def bounds(g):
        m = re.fullmatch(r"(\d+) or fewer", g)
        if m:
            return 0, int(m.group(1))
        m = re.fullmatch(r"(\d+) to (\d+)", g)
        if m:
            return int(m.group(1)), int(m.group(2))
        assert g == NONE, g
        return 10 ** 6, 10 ** 6

    merged = f"{min(bounds(g)[0] for g in HIGH)} to {max(bounds(g)[1] for g in HIGH)}"
    class_of = {g: (merged if g in HIGH else g) for g in S14["states_count_by_group"]}
    classes = sorted(set(class_of.values()), key=bounds)
    cls_of_state = {r["state"]: class_of[r["group"]] for r in states}
    over = next(int(m.group(1)) for k in HC for m in [re.fullmatch(r"fit_ACCE\|floor\|(\d+)", k)] if m and int(m.group(1)) > 0)
    sh_g = next(k for k in geo_rows[0] if k.startswith("share_graduates_"))
    sh_j = next(k for k in geo_rows[0] if k.startswith("share_construction_manager_jobs_"))
    rows = {}
    for c in classes:
        gs = [g for g in geo if class_of[g] == c]
        rows[c] = {"grad": round(sum(float(geo[g][sh_g]) for g in gs), 6), "jobs": round(sum(float(geo[g][sh_j]) for g in gs), 6),
                   "N": sum(int(geo[g]["modeled"]) for g in gs), "floor": sum(int(geo[g]["fit_acce_floor"]) for g in gs),
                   "over": sum(int(geo[g]["fit_acce_floor_overlap"]) for g in gs)}
    hi = rows[merged]
    assert hi["N"] == HC["programs"] and hi["floor"] == HC["fit_ACCE|floor|0"] and hi["over"] == HC[f"fit_ACCE|floor|{over}"], hi
    assert abs(hi["grad"] - S15["geography"]["high_count_share_graduates"]) < 1e-9
    assert sum(r["N"] for r in rows.values()) == S14["programs_modeled"]
    # the figure's own words (owner, 7 November 2026)
    leg = {c: (c.replace(" or fewer", " credits or fewer") if c.endswith("or fewer") else c.replace(" to ", "–") + " credits") for c in classes}
    leg[NONE] = "Institution-defined"

    def count_text(c):
        members = [s for s, k in cls_of_state.items() if k == c]
        n = len([s for s in members if s != "DC"])
        return f"{n} state{'s' if n != 1 else ''}" + (" and DC" if "DC" in members else "")

    out = [{"key": c, "label": leg[c], "states": count_text(c), "high": c == merged, "none": c == NONE,
            "grad": rows[c]["grad"], "jobs": rows[c]["jobs"], "grad_txt": f"{100 * rows[c]['grad']:.0f}%", "jobs_txt": f"{100 * rows[c]['jobs']:.0f}%",
            "N": rows[c]["N"], "floor": rows[c]["floor"], "over": rows[c]["over"]} for c in classes]
    return {"classes": out, "class_of_state": {s: classes.index(c) for s, c in cls_of_state.items()},
            "pos": literal_from(GEO_SCRIPT, "POS"), "overlap": over, "year_degrees": sh_g.rsplit("_", 1)[1], "year_jobs": sh_j.rsplit("_", 1)[1]}


# ---------------------------------------------------------------- the US atlas (the directory) and the state file
def us_atlas(fig1):
    atlas = rcsv(A / "05_bachelor_atlas/results/atlas_programs.csv")
    s5 = rjson(A / "05_bachelor_atlas/results/summary.json")
    states, corr = state_table()
    sidx = {s["state"]: s for s in states}
    m14p = {r["program_id"]: r for r in rcsv(M14 / "programs.csv")}
    hd = {}
    with open(RAW / "ipeds/extracted/HD2024.csv", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            hd[r["UNITID"]] = (num(r["LATITUDE"]), num(r["LONGITUD"]))
    types = {}
    for r in rcsv(A / "10_ai_curriculum/results/course_types.csv"):
        types[(r["program_id"], r["code"], r["title"])] = r["type"]
    cols = ["program_id", "unitid", "institution", "city", "state", "control", "program", "degree", "group", "catalog_year", "total_semester",
            "gen_ed", "major", "math_science", "business", "free_electives", "to_cut_for_90", "n_required_courses", "internship_required",
            "capstone_required", "online_option", "reduced_option", "acce", "acce_since", "abet_ansac", "abet_since", "accreditation_group",
            "state_gen_ed_min", "state_reduced_credit_status", "state_class", "binding_count", "modeled", "tuition_fees_in_state_2023_24",
            "tuition_fees_out_state_2023_24", "per_credit_in_state", "per_credit_out_state", "degrees_2024", "earn_1yr", "earn_4yr", "debt",
            "confidence", "url_catalog", "url_program", "url_ipeds", "url_scorecard", "url_acce", "url_abet", "url_state_gen_ed",
            "catalog_read_on", "lat", "lon"]
    text_cols = ("program_id", "unitid", "institution", "city", "state", "control", "program", "degree", "group", "catalog_year", "acce",
                 "accreditation_group", "state_reduced_credit_status", "confidence", "reduced_option", "online_option",
                 "internship_required", "capstone_required", "catalog_read_on")
    rows = []
    for r in atlas:
        lat, lon = hd.get(r["unitid"], (None, None))
        rec = {**r, "lat": lat, "lon": lon}
        # the state or system count for a reduced-credit degree as the article codes it (public universities, within the
        # system a rule names), and the state's verified action
        s = sidx.get(r["state"], {})
        smin = s.get("state_min")
        rx = corr.get(r["state"], {}).get("institution_rx") or ""
        if r["control"] != "public" or smin is None or (rx and not re.search(rx, r["institution"], re.I)):
            smin = None
        rec["state_gen_ed_min"] = smin
        rec["state_reduced_credit_status"] = s.get("class", "none")
        rec["url_state_gen_ed"] = s.get("url_gen_ed", "") if smin is not None else ""
        rec["state_class"] = fig1["class_of_state"].get(r["state"])
        m = m14p.get(r["program_id"])
        rec["binding_count"] = num(m["binding_count"]) if m else None
        rec["modeled"] = bool(m and m["modeled"] == "True")
        rec["abet_ansac"] = True if r["abet_ansac"] == "True" else False if r["abet_ansac"] == "False" else None
        rows.append([rec[c] if c in ("abet_ansac", "modeled", "state_class") else rec[c] if (c in text_cols or c.startswith("url")) else num(rec[c])
                     for c in cols])
    courses = {}
    for c in rcsv(A / "05_bachelor_atlas/results/atlas_courses.csv"):
        courses.setdefault(c["program_id"], []).append([c["code"], c["title"], num(c["credits"]), c["block"], types.get((c["program_id"], c["code"], c["title"]), "other")])
    dump("courses.json", courses)
    dump("atlas.json", {"columns": cols, "rows": rows,
                        "summary": {k: s5[k] for k in ("programs", "institutions", "programs_with_total", "by_accreditation", "by_group", "by_control",
                                                       "states_only", "territories", "read_on")}})
    S14 = rjson(M14 / "summary.json")
    dump("states.json", {"states": states, "class_label": CLASS_LABEL, "classes": fig1["classes"], "class_of_state": fig1["class_of_state"],
                         "pos": fig1["pos"], "summary": {k: S14[k] for k in ("states_count_by_class", "programs_accredited_or_applicant", "programs_modeled")}})


# ---------------------------------------------------------------- the study: title, questions, figure captions
def study(ar):
    lines = (MS / "_content.md").read_text(encoding="utf-8").splitlines()
    title = ar.fill(lines[0][2:])
    rqs = [{"id": m.group(1), "text": ar.fill(m.group(2))} for x in lines for m in [re.match(r"- (RQ\d)\. (.*)", x)] if m]
    kw = next((ar.fill(x) for x in lines if x.startswith("**Keywords:**")), "").replace("**Keywords:**", "").strip()
    figs = {}
    for x in lines:
        if x.startswith("[[FIGURE:"):
            stem, cap = x.strip()[9:-2].split("|", 1)
            figs[stem.split("/")[-1]] = {"number": ar.B.FIG_NO[stem], "caption": ar.fill(cap)}
    sup = {}
    for x in (MS / "_supplement.md").read_text(encoding="utf-8").splitlines():
        if x.startswith("[[FIGURE_S:"):
            lab, stem, cap = x.strip()[11:-2].split("|", 2)
            sup[lab] = {"caption": ar.fill(cap), "short": ar.fill(cap).split(":")[0]}
    return {"title": title, "short": title.split(":")[0], "subtitle": title.split(":", 1)[1].strip(), "rqs": rqs, "keywords": kw,
            "australia": (RAW / "international/au/au_programs.json").exists(),
            "figures": figs, "supplement_figures": sup}


# ---------------------------------------------------------------- RQ1: requirements
def rq1(ar, fig1):
    F = ar.F
    n = F("14_state_groups.programs_modeled")
    designs = [
        {"design": "ACCE credit minima", "detail": "50 construction and 12 business credits, with the outcomes",
         "fit": F("14_state_groups.all.ACCE|floor|0|binding.fit"), "median": F("14_state_groups.all.ACCE|floor|0|binding.median"),
         "internship": F("14_state_groups.all.ACCE|floor|0|binding.internship_dropped")},
        {"design": "ACCE outcomes, no credit minima", "detail": "outcomes and business topics identified from course titles",
         "fit": F("14_state_groups.acce_outcomes_only.0.fit"), "median": F("14_state_groups.acce_outcomes_only.0.median"),
         "internship": F("14_state_groups.acce_outcomes_only.0.internship_dropped"),
         "internship_b": F("19_description_census.model_b.outcomes_only_internship_dropped_b")},
        {"design": "ANSAC criteria", "detail": "topics and outcomes; no professional credit-hour minimum",
         "fit": F("14_state_groups.all.ANSAC|floor|0|binding.fit"), "median": F("14_state_groups.all.ANSAC|floor|0|binding.median"),
         "internship": F("14_state_groups.all.ANSAC|floor|0|binding.internship_dropped")}]
    assert F("14_state_groups.acce_outcomes_only.0.internship_listed") == F("14_state_groups.all.ANSAC|floor|0|binding.internship_listed")
    out = {
        "programs": n,
        "fig1": {"classes": fig1["classes"], "overlap": fig1["overlap"], "year_degrees": fig1["year_degrees"], "year_jobs": fig1["year_jobs"]},
        "floors": {"acce_professional": F("14_state_groups.rule_arithmetic.acce_professional"),
                   "titles": F("14_state_groups.outcome_floor.ACCE.hours_median"),
                   "descriptions": F("19_description_census.model_b.outcome_floor_b"),
                   "descriptions_strict": F("19_description_census.model_b.outcome_floor_bs")},
        "designs": designs, "internship_listed": F("14_state_groups.acce_outcomes_only.0.internship_listed"),
        "arithmetic": {"professional": F("14_state_groups.rule_arithmetic.acce_professional"),
                       "count": F("14_state_groups.rule_arithmetic.acce_threshold_count"),
                       "economics": F("14_state_groups.rule_arithmetic.economics_counted_twice"),
                       "typical_count": F("14_state_groups.typical.binding_count"), "typical_total": F("14_state_groups.typical.ACCE|floor|0.total"),
                       "highest_count": F("14_state_groups.typical.at_highest_count.count"),
                       "highest_total": F("14_state_groups.typical.at_highest_count.ACCE|floor|0.total"),
                       "added": F("15_course_groups.state_line_effect.credits_added_by_the_state_line")},
        "geography": {"fit_floor": F("14_state_groups.all.ACCE|floor|0|binding.fit"), "median_floor": F("14_state_groups.all.ACCE|floor|0|binding.median"),
                      "fit_overlap": F("14_state_groups.all.ACCE|floor|12|binding.fit"), "fit_today": F("18_robustness.runs.floor|today.fit_90"),
                      "fit_core": F("14_state_groups.all.ACCE|floor|0|core.fit")},
        "table1": ar.table("constraints_owner"), "tableS1": ar.table("door"),
    }
    return out


# ---------------------------------------------------------------- RQ2: integration (Figs. 2 to 4, Tables S3, S5, S6)
INTEGRATION_SCRIPT = A / "15_course_groups" / "plot_integration.py"


def fig2(ar):
    S15 = rjson(M15 / "summary.json")
    S14 = rjson(M14 / "summary.json")
    count = lambda v: None if v in ("", "None") else int(float(v))  # noqa: E731
    links = [{"merge": r["merge"], "kind": r["kind"], "one": count(r["programs_one_course"]), "sep": count(r["programs_separate"])}
             for r in rcsv(M15 / "merge_links.csv")]
    pot = S15["potential_integration"]
    pair_label = literal_from(INTEGRATION_SCRIPT, "PAIR_LABEL")
    gen_label = literal_from(INTEGRATION_SCRIPT, "GENED_LABEL")
    blk_label = literal_from(INTEGRATION_SCRIPT, "BLOCKED_LABEL")
    within = sorted([r for r in links if r["kind"] == "within construction"], key=lambda r: (-r["one"], -r["sep"]))
    gened = sorted([r for r in links if r["kind"] == "general education into construction"], key=lambda r: -r["one"])
    blocked = sorted([r for r in links if r["kind"].startswith("blocked")], key=lambda r: -r["sep"])
    assert {r["merge"]: r["one"] for r in gened} == S15["into_construction_programs"]
    assert {r["merge"]: r["sep"] for r in blocked} == S15["blocked_programs"]
    return {"programs": S14["programs_modeled"], "with_a_merge": S15["programs_with_a_merge"],
            "within": [{"label": pair_label[r["merge"]], "one": r["one"], "sep": r["sep"],
                        "could": pot[r["merge"]]["modeled_programs_teaching_apart_and_mergeable"]} for r in within],
            "gened": [{"label": gen_label[r["merge"]], "one": r["one"]} for r in gened],
            "blocked": [{"label": blk_label[r["merge"]], "sep": r["sep"]} for r in blocked],
            "head_gened": literal_from(INTEGRATION_SCRIPT, "HEAD_GENED"), "head_blocked": literal_from(INTEGRATION_SCRIPT, "HEAD_BLOCKED"),
            "saving_typical": ar.F("15_course_groups.merge_reduction_median"), "saving_median": ar.F("15_course_groups.merge_saving_median_where_any"),
            "saving_max": ar.F("15_course_groups.merge_saving_max")}


def fig3():
    """the cells of Fig. 3 as plot_scenarios.py reads them"""
    S14 = rjson(M14 / "summary.json")
    S15 = rjson(M15 / "summary.json")
    N = S14["programs_modeled"]
    ov = max(int(k) for k in S15["keep"])
    conds = ["0", str(ov)]

    def from14(key):
        return {c: S14["all"][f"{key}|{c}|binding"] for c in conds}

    cols = [("Retain all courses", S15["keep"], False), ("Retain all topics, allow merging", S15["keep_merge"], False),
            ("Meet ACCE minimum requirements", from14("ACCE|floor"), False),
            ("ACCE outcomes, no credit minima", S14["acce_outcomes_only"], True), ("ANSAC criteria, no credit minima", from14("ANSAC|floor"), True)]
    target = int(next(iter({k for v in S15["scenario_totals"].values() for k in v if k.startswith("fit_")})).split("_")[1])
    return {"programs": N, "target": target, "overlap": ov,
            "rows": [{"key": "0", "label": "Without major-credit overlap", "detail": ""},
                     {"key": str(ov), "label": "With major-credit overlap", "detail": f"(up to {ov} credits)"}],
            "cols": [{"label": lab, "check": chk, "cells": {c: {"fit": src[c]["fit"], "median": src[c]["median"]} for c in conds}}
                     for lab, src, chk in cols]}


def fig4():
    """the five rows of Fig. 4 as plot_redesign.py builds them (the typical program, never named)"""
    SUM = rjson(M15 / "summary.json")
    TD, STEPS = SUM["typical_decomposition"], SUM["typical_steps"]
    PATH, COURSES, GROUPS = rcsv(M15 / "typical_pathway.csv"), rcsv(M15 / "typical_courses.csv"), rcsv(M15 / "group_summary.csv")
    PART = {g["course_group"]: g["part"] for g in GROUPS}
    ADDED = "General education added to reach the count"
    D0, D12 = "every topic kept, merged, overlap 0", "every topic kept, merged, overlap 12"
    MS_GROUPS = {c["course_group"] for c in COURSES if c["part"] == "math_science"}
    ORDER = ["ms", "listed", "added", "business", "construction"]

    def parts_of(design, col):
        out = dict.fromkeys(ORDER, 0.0)
        for r in PATH:
            if r["design"] != design:
                continue
            g, h = r["course_group"], float(r[col])
            if g == ADDED:
                out["added"] += h
            elif g in MS_GROUPS:
                out["ms"] += h
            elif PART[g] == "general education":
                out["listed"] += h
            else:
                out[PART[g]] += h
        return out

    TODAY = parts_of(D0, "hours_today")
    MERGED0, MERGED12 = parts_of(D0, "hours_design"), parts_of(D12, "hours_design")
    SET = dict(TODAY, listed=0.0, added=MERGED0["added"])
    COURSE_PART = {"math_science": "ms", "business": "business", "construction": "construction"}
    FLOOR = dict.fromkeys(ORDER, 0.0)
    for c in COURSES:
        if c["acce_floor_overlap"] == "kept":
            FLOOR[COURSE_PART[c["part"]]] += float(c["hours"])
    FLOOR["added"] = float(STEPS["acce_floor_12_gen_ed_added"])
    rows = [TODAY, SET, MERGED0, MERGED12, FLOOR]
    totals = [TD["today"], TD["after_gen_ed_replaced"], TD["every_topic_merged_0"], TD["every_topic_merged_12"], TD["acce_floor_12"]]
    for parts, total in zip(rows, totals):
        assert close(sum(parts.values()), total), (parts, total)
    pairs = defaultdict(list)
    for c in COURSES:
        s = c["every_topic_merged_overlap"]
        if s.startswith("merged: "):
            pairs[s[len("merged: "):]].append(float(c["hours"]))
    save = sorted((min(v), p) for p, v in pairs.items())
    nm = lambda v: str(int(round(v, 1))) if round(v, 1) == int(round(v, 1)) else str(round(v, 1))  # noqa: E731
    pair_name = lambda p: " and ".join(w.title() for w in p.split(" + "))  # noqa: E731
    items = [f"{pair_name(p)} ({nm(s)} credits saved)" if i == 0 else f"{pair_name(p)} ({nm(s)})" for i, (s, p) in enumerate(save)]
    ov = float(STEPS["every_topic_merged_12_overlap"])
    counted, count = TD["counted_before_added"], TD["count"]
    dropped = sum(float(c["hours"]) for c in COURSES if c["part"] == "construction") - FLOOR["construction"]
    names = ["Current curriculum", "General education adjusted to state requirements", "Three course pairs merged, all topics retained",
             "Major credits counted toward general education, all topics retained", "Alternative: ACCE minimum requirements, some topics omitted"]
    steps = [f"Replace {nm(TODAY['listed'])} listed general education and elective credits with {nm(SET['added'])} additional credits. "
             f"Another {nm(counted)} credits already satisfy the {nm(count)}-credit requirement.",
             "Merge " + ", ".join(items[:-1]) + ", and " + items[-1] + ".",
             f"Count {nm(ov)} construction credits toward general education, reducing the additional general education requirement from "
             f"{nm(SET['added'])} to {nm(MERGED12['added'])} credit{'' if close(MERGED12['added'], 1) else 's'}.",
             f"Alternatively, retain ACCE’s 50-credit construction minimum by removing {nm(dropped)} original construction credits rather "
             f"than merging courses. Some topics are omitted."]
    deltas = [TD["gen_ed_replaced_net"], TD["merges_saved"], TD["overlap_saved"], TD["floor_cut_beyond_merged_12"]]
    key = [("ms", "Mathematics and science"), ("listed", "Listed general education and electives"), ("added", "Additional general education credits"),
           ("business", "Business courses"), ("construction", "Construction courses")]
    return {"rows": [{"name": nme, "parts": {k: round(v, 1) for k, v in r.items()}, "total": t, "overlap": ov if i in (3, 4) else 0,
                      "comparison": i == 4} for i, (nme, r, t) in enumerate(zip(names, rows, totals))],
            "steps": steps, "deltas": deltas, "key": key, "target": 90}


def rq2(ar):
    lev = ar.vals["18_robustness"]["levers"]
    return {"fig2": fig2(ar), "fig3": fig3(), "fig4": fig4(),
            "levers": {k: ar.F(f"18_robustness.levers.{k}") for k in ("neither", "merging_only", "overlap_only", "both", "fit_only_with_both",
                                                                         "median_gap_above_90_every_course_kept", "median_merging_saving")},
            "levers_raw": {k: lev[k] for k in ("neither", "merging_only", "overlap_only", "both")},
            "today_topics": ar.F("18_robustness.runs.base|today.fit_90"),
            "tableS3": ar.table("integration_s1"), "tableS5": ar.table("shift"), "tableS6": ar.table("robustness_s3")}


# ---------------------------------------------------------------- RQ3: documented content (Table 2, Table S4)
def rq3(ar):
    F = ar.F
    mb = rjson(A / "19_description_census/results/model_b_summary.json")
    a = mb["all"]
    scen = [("Current rules", "today"), ("No overlap", "none"), ("Nationwide overlap", "everywhere")]
    models = [{"label": "Model A, course titles", "values": [a[f"A_{k}"] for _, k in scen]},
              {"label": "Model B, documented concepts", "values": [a[f"B2_tau0.5_{k}"] for _, k in scen]}]
    taus = (.25, .75, 1.0)
    rng = [[min(a[f"B2_tau{t}_{k}"] for t in taus), max(a[f"B2_tau{t}_{k}"] for t in taus)] for _, k in scen]
    ret = rcsv(A / "19_description_census/results/retention.csv")
    pair_label = literal_from(INTEGRATION_SCRIPT, "PAIR_LABEL")  # Fig. 2's names of the pairs
    mbv = ar.vals["19_description_census"]["model_b"]
    pairs = []
    for pr in dict.fromkeys(r["pair"] for r in ret):
        rs = [r for r in ret if r["pair"] == pr]
        concepts = []
        for r in rs:
            key = f"{pr}: {r['topic']}: {r['concept']}"
            concepts.append({"topic": r["topic"], "concept": r["concept"],
                             "merged": float(r["rate_merged"]), "single": float(r["rate_single"]),
                             "merged_txt": F(f"19_description_census.model_b.retention.{key}.rate_merged|pct"),
                             "single_txt": F(f"19_description_census.model_b.retention.{key}.rate_single|pct"),
                             "single_courses": int(r["single_courses"]),
                             "dropped": r["kept_tau_0.5"] == "False", "significant": r["kept_sig"] == "False"})
        m = mbv["merges"].get(pr)
        pairs.append({"pair": pr, "label": pair_label.get(pr, pr), "merged_courses": mbv["merged_courses"][pr], "merges_a": m["a"] if m else None, "merges_b": m["b"] if m else None,
                      "concepts": concepts})
    return {"scenarios": [s for s, _ in scen], "models": models, "range": rng,
            "facts": {"a_overlap": F("19_description_census.model_b.a_overlap"), "b_overlap": F("19_description_census.model_b.b_overlap"),
                      "median_a": F("19_description_census.model_b.median_a_overlap"), "median_b": F("19_description_census.model_b.median_b_overlap"),
                      "concepts_dropped": F("19_description_census.model_b.concepts_dropped"), "concepts_read": F("19_description_census.model_b.concepts_read"),
                      "concepts_dropped_sig": F("19_description_census.model_b.concepts_dropped_sig"),
                      "observations_found": F("19_description_census.all.observations_found"), "observations": F("19_description_census.all.observations"),
                      "share_found": F("19_description_census.all.share_found|pct"),
                      "multi_topic_titles": F("19_description_census.titles_and_descriptions.multi_topic_titles"),
                      "renaming_lenient": F("19_description_census.titles_and_descriptions.renaming_share_lenient|pct"),
                      "renaming_strict": F("19_description_census.titles_and_descriptions.renaming_share_strict|pct"),
                      "plain_titles": F("19_description_census.titles_and_descriptions.plain_titles"),
                      "hidden_lenient": F("19_description_census.titles_and_descriptions.hidden_share_lenient|pct"),
                      "hidden_strict": F("19_description_census.titles_and_descriptions.hidden_share_strict|pct")},
            "pairs": pairs, "table2": ar.table("model_ab_owner"), "tableS4": ar.table("census_s4")}


# ---------------------------------------------------------------- beyond the curriculum (Tables S2 and S7, Figures S1 and S2)
def beyond(ar):
    R16 = A / "16_sensitivity" / "results"
    stu = rcsv(R16 / "student_summary.csv")
    ins = rcsv(R16 / "institution_summary.csv")
    s16 = rjson(R16 / "summary.json")
    name = {0.0: "no earlier graduation", .5: "half a year earlier", 1.0: "one year earlier"}

    def series(T, tuition):
        rows = sorted([r for r in stu if close(r["rate"], .03) and close(r["years_earlier"], T) and r["tuition"] == tuition], key=lambda r: float(r["penalty"]))
        return {"x": [float(r["penalty"]) for r in rows], "md": [float(r["net_median"]) for r in rows],
                "lo": [float(r["net_p25"]) for r in rows], "hi": [float(r["net_p75"]) for r in rows], "be": rows[0]["breakeven_penalty_median"]}
    students = [dict(series(T, "per credit"), name=name[T], years=T, be_txt=pct_hu(series(T, "per credit")["be"], 1)) for T in (0.0, .5, 1.0)]
    flat = dict(series(0.0, "flat per term"), name="no earlier, tuition charged per term")
    bases = ["tuition and appropriations", "tuition only"]
    inst = []
    for b in bases:
        rows = sorted([r for r in ins if r["basis"] == b], key=lambda r: -float(r["k"]))
        inst.append({"basis": b, "programs": int(rows[0]["programs"]), "with_break_even": int(rows[0]["programs_with_break_even"]),
                     "k": [float(r["k"]) for r in rows], "md": [float(r["break_even_median"]) for r in rows],
                     "lo": [float(r["break_even_p25"]) for r in rows], "hi": [float(r["break_even_p75"]) for r in rows],
                     "md_txt": [pct_hu(r["break_even_median"], 0) for r in rows]})
    S14 = rjson(M14 / "summary.json")
    con = [r for r in rcsv(M15 / "group_summary.csv") if r["part"] == "construction" and r["ai_exposure"].strip()]
    G = sorted([{"group": r["course_group"], "expo": float(r["ai_exposure"]), "today": float(r["mean_hours_all"])} for r in con],
               key=lambda g: (-g["expo"], -g["today"], g["group"]))
    for g in G:
        g["expo_txt"], g["today_txt"] = dec(g["expo"], 2), dec(g["today"], 1)
    return {"tableS2": ar.table("before_after"), "tableS7": ar.table("stakeholders_s3"),
            "figS1": {"programs": s16["programs"], "horizon": s16["horizon"], "students": students, "flat": flat, "institutions": inst},
            "figS2": {"programs": S14["programs_modeled"], "groups": G}}


# ---------------------------------------------------------------- sources: references the article and supplement cite
def sources(ar):
    B, T, vals = ar.B, ar.T, ar.vals
    body = (MS / "_content.md").read_text(encoding="utf-8")
    text = [B.fill(body, vals)]
    names = re.findall(r"^\[\[TABLE:([a-z_0-9]+)\]\]", body + "\n" + (MS / "_supplement.md").read_text(encoding="utf-8"), re.M)
    for nm in names:
        title, rows, notes = T.TABLES[nm](vals)
        text += [title] + [" ".join(map(str, r)) for r in rows] + list(notes)
    text.append(B.fill((MS / "_supplement.md").read_text(encoding="utf-8"), vals))
    text = "\n".join(text)
    refs = []
    for r in B.load_references():
        if B.is_cited(r["cite"], text):
            m = re.search(r"https?://\S+", r["apa"])
            refs.append({"apa": curly(r["apa"]), "url": m.group(0).rstrip(".") if m else ""})
    for m in json.load(open(MS / "masked_references.json", encoding="utf-8")):
        if ("{{M:" + m["key"] + "}}") in body:
            u = re.search(r"https?://\S+", m["apa"])
            refs.append({"apa": curly(m["apa"]), "url": u.group(0).rstrip(".") if u else ""})
    refs.sort(key=lambda r: re.sub(r"[^a-z0-9 ]", "", r["apa"].lower()))
    data = [
        {"what": "ACCE directory of accredited, applicant and candidate bachelor’s programs", "date": "29 October 2026", "url": "https://www.acce.edu/bachelor-programs"},
        {"what": "ACCE Document 103, Standards and Criteria (revision 2026.10.19)", "date": "19 October 2026", "url": "https://www.acce.edu/file-share"},
        {"what": "ABET Criteria for Accrediting Applied and Natural Science Programs, 2026-27", "date": "2026", "url": "https://www.abet.org/2026-2027_ansac_criteria"},
        {"what": "Institution catalogs and course descriptions (linked in each program card of the US Atlas)", "date": "29 October to 7 November 2026", "url": ""},
        {"what": "IPEDS Completions 2023-24 (provisional release, September 2025), Directory 2024 and Institutional Characteristics 2023-24 (NCES, 2025)", "date": "2025", "url": "https://nces.ed.gov/ipeds/use-the-data"},
        {"what": "Occupational Employment and Wage Statistics, May 2025 state estimates, construction managers (BLS, 2026)", "date": "2026", "url": "https://www.bls.gov/oes/tables.htm"},
        {"what": "College Scorecard, field of study and institution files", "date": "15 October 2026 release", "url": "https://collegescorecard.ed.gov/data/"},
        {"what": "State and university-system general education rules and each state’s action on degrees below 120 credits, checked against primary documents (Table S1; Fig. 1a)", "date": "29 October to 6 November 2026", "url": ""},
        {"what": "CIOB UK Accredited Institutions 2026; QAA FHEQ 2024 and Credit Framework 2021 (UK Atlas)", "date": "27 March 2026; 2024; 2021", "url": "https://www.ciob.org/learning-providers/education-framework"},
        {"what": "Hong Kong programme pages and curriculum documents (Hong Kong Atlas)", "date": "6 November 2026", "url": ""},
        {"what": "Task exposure ratings (Eloundou et al., 2024) for the tasks construction courses train (Figure S2)", "date": "2024", "url": "https://github.com/openai/GPTs-are-GPTs"},
        {"what": "Map points: OpenStreetMap Nominatim (data © OpenStreetMap contributors, ODbL)", "date": "6 and 7 November 2026", "url": "https://www.openstreetmap.org/copyright"},
    ]
    return {"references": refs, "data": data}


# ---------------------------------------------------------------- UK and Hong Kong atlases (directories)
def amount(v, key="amount"):
    """a fee field may be a number or {amount, currency, academic_year, note}"""
    if isinstance(v, dict):
        return num(v.get(key))
    return num(v)


def hk_fee(v):
    """Hong Kong local fee a year and how it was read (the same values Module 7 summarizes)"""
    if not isinstance(v, dict):
        return num(v), ""
    if v.get("amount_hkd") is not None:
        return num(v["amount_hkd"]), ""
    if v.get("annual_estimate_hkd_derived") is not None:
        return num(v["annual_estimate_hkd_derived"]), v.get("annual_estimate_note") or "derived from the published fee per credit"
    if v.get("average_per_year_hkd_derived") is not None:
        return num(v["average_per_year_hkd_derived"]), (f"average a year of the whole programme: stages 1 and 2 HK${int(v['stage_1_2_total_hkd']):,}, "
                                                         f"stages 3 and 4 HK${int(v['stage_3_4_total_hkd']):,}")
    if v.get("year_1_2_hkd") is not None:
        return num(v["year_1_2_hkd"]), f"years 1 and 2; years 3 and 4 HK${int(v['year_3_4_hkd']):,} a year"
    return None, ""


def uk_credits(r, mods):
    """credits of a UK honours degree: stated, else read from a full module list, else the national minimum (QAA 2024)"""
    years, place = {}, []
    for y, _code, _title, cr, ty in mods:
        if cr is None:
            continue
        if str(y).isdigit():
            d = years.setdefault(int(y), {"core": 0.0, "option": 0.0})
            d["option" if ty == "option" else "core"] += cr
        elif y == "placement":
            place.append((cr, ty))
    stated = num(r.get("total_credits"))
    full = (r.get("modules_status") == "full_with_credits" and years and all(v["core"] + v["option"] >= 120 for v in years.values()))
    if stated:
        total, source = stated, "stated"
    elif full:
        total, source = 120 * len(years), "list"
    else:
        total, source = (480 if r["country"] == "Scotland" else 360), "framework"
    pc = None
    if place:
        core = [c for c, t in place if t != "option"]
        pc = sum(core) if core else max(c for c, _ in place)
    return total, source, [[y, years[y]["core"], years[y]["option"]] for y in sorted(years)], pc


TYPES = ["technical", "judgment", "digital_tool", "field_procedure", "math_science", "breadth", "integrative", "other"]


def world():
    comp = {r["id"]: r for r in rcsv(A / "07_international/results/composition.csv")}
    U = rjson(RAW / "international/uk/uk_programs.json")
    cu = rjson(RAW / "international/uk/campus_coordinates_2026-11-06.json")
    uk = []
    for r in U:
        c = cu.get(f"{r['university']}|{r['campus'] or ''}", {})
        po = r.get("placement_option") or {}
        mods = [[m.get("year"), m.get("code") or "", m.get("title"), num(m.get("credits")), m.get("type")] for m in (r.get("modules") or [])]
        cd, csrc, cby, pcr = uk_credits(r, mods)
        fh, fi, fp = r.get("fee_home_per_year") or {}, r.get("fee_international_per_year") or {}, r.get("fee_placement_year") or {}
        uk.append({"id": r["id"], "university": r["university"], "campus": r["campus"] or "", "country": r["country"], "program": r["program_title"],
                   "award": r["award"], "ucas": r.get("ucas_code") or "", "years": num(r.get("duration_full_time_years")),
                   "placement": bool(po.get("available")), "placement_note": po.get("description") or "", "years_with_placement": num(po.get("duration_with_placement_years")),
                   "foundation": r.get("foundation_year_option"), "part_time": r.get("part_time_option") or "", "total_credits": num(r.get("total_credits")),
                   "credits_by_level": r.get("credits_by_level"), "accreditation": ", ".join(r.get("accreditations_stated") or []),
                   "credits_degree": cd, "credits_source": csrc, "credits_by_year": cby, "placement_credits": pcr,
                   "ciob_entry": r.get("ciob_list_entry") or "",
                   "fee_home": amount(fh), "fee_home_year": fh.get("academic_year", "") if isinstance(fh, dict) else "",
                   "fee_int": amount(fi), "fee_placement": amount(fp), "fee_placement_note": fp.get("note", "") if isinstance(fp, dict) else "",
                   "url": r.get("course_page_url") or "", "spec_url": r.get("programme_spec_url") or "",
                   "modules": mods, "modules_status": r.get("modules_status") or "", "notes": r.get("notes") or "", "read_on": r.get("read_on") or "",
                   "lat": c.get("lat"), "lon": c.get("lon"), "place": c.get("place", ""), "geo_query": c.get("query", ""),
                   "comp": {t: num(comp[r["id"]][t]) for t in TYPES} if r["id"] in comp else None})
    dump("uk.json", {"programs": uk, "frameworks": rjson(RAW / "international/uk/uk_frameworks.json"),
                     "summary": {k: v for k, v in rjson(A / "07_international/results/summary.json").items() if k.startswith("uk_")}})

    H = rjson(RAW / "international/hk/hk_programs.json")["programs"]
    chk = rjson(RAW / "international/hk/campus_coordinates_2026-11-06.json")
    hk = []
    for r in H:
        c = chk.get(r["id"], {})
        tl, tn = r.get("tuition_local") or {}, r.get("tuition_nonlocal") or {}
        hk.append({"id": r["id"], "institution": r["institution"], "funding": r.get("funding") or "", "department": r.get("department") or "",
                   "program": r["title"], "award": r.get("award") or "", "jupas": r.get("jupas_code") or "", "years": num(r.get("normal_duration_years")),
                   "credit_system": r.get("credit_system") or "", "total_credits": num(r.get("total_credits")), "gen_ed_credits": num(r.get("gen_ed_credits")),
                   "gen_ed_definition": r.get("gen_ed_definition") or "", "university_requirements": num(r.get("university_requirements_credits")),
                   "major_credits": num(r.get("major_credits")), "major_definition": r.get("major_definition") or "", "free_electives": num(r.get("free_elective_credits")),
                   "wie": r.get("wie_requirement") or "", "accreditation": r.get("accreditation") or "",
                   "fee_local": hk_fee(tl)[0], "fee_local_note": hk_fee(tl)[1], "fee_local_year": tl.get("year", "") if isinstance(tl, dict) else "",
                   "fee_nonlocal": amount(tn, "amount_hkd"), "url": r.get("programme_url") or "", "curriculum_url": r.get("curriculum_url") or "",
                   "curriculum_year": r.get("curriculum_year") or "", "history": r.get("history_note") or "",
                   "courses": [[m.get("year"), m.get("code") or "", m.get("title"), num(m.get("credits")), m.get("type"), m.get("note") or ""] for m in (r.get("courses") or [])],
                   "read_on": r.get("read_on") or "", "lat": c.get("lat"), "lon": c.get("lon"), "place": c.get("place", ""),
                   "comp": {t: num(comp[r["id"]][t]) for t in TYPES} if r["id"] in comp else None})
    s7 = rjson(A / "07_international/results/summary.json")
    dump("hk.json", {"programs": hk, "reform": s7.get("hku_reform"), "summary": {k: v for k, v in s7.items() if k.startswith("hk")}})


# ---------------------------------------------------------------- Australia atlas (7 November 2026), from 01_raw_data/international/au
def australia():
    """The Australia atlas (7 November 2026), from 01_raw_data/international/au as the UK atlas reads uk/. Records with
    include true and a public program page (url) only. No Australian page states notional hours, so credit points are
    shown in each university's own units and never converted. Values not stated print as "not stated", never as 0."""
    D = RAW / "international/au"
    P = D / "au_programs.json"
    if not P.exists():
        print("Australia: au_programs.json is not there yet; data/au.json not built")
        return False
    progs = rjson(P)
    coords = rjson(D / "campus_coordinates_2026-11-07.json")
    fw = rjson(D / "au_frameworks.json")
    NS = "not stated"

    def fee(v):
        v = v or {}
        amt = num(v.get("amount"))
        year = v.get("year")
        return {"amount": amt, "year": str(year) if year not in (None, "") else "", "basis": curly(v.get("basis") or ""), "note": curly(v.get("note") or "")}

    def work(w):
        w = w or {}
        if w.get("required") is True:
            short = w.get("quantity") or "required, quantity not stated"
        elif w.get("required") is False:
            short = "not required"
        else:
            short = NS
        return curly(short), curly(w.get("description") or ""), curly(w.get("quote") or "")

    out = []
    for r in progs:
        if not (r.get("include") and r.get("url")):
            continue
        c = coords.get(f"{r['university']}|{r['campus']}", {})
        system = r.get("credit_point_system") or ""
        wshort, wdesc, wquote = work(r.get("work_experience_requirement"))
        br = r.get("breadth_or_general_education")
        breadth = (f"{n_or(br.get('credit_points'))} credit points: {br.get('description')}" if isinstance(br, dict) else "")
        others = r.get("other_list_entries") or {}
        online = (r.get("campus") or "").lower().startswith("online")  # online only (CQU), not a campus that also teaches online
        map_note = (f"Taught online only; the map point is the university’s headquarters in Rockhampton ({c.get('place', '')})"
                    if online and "Rockhampton" in c.get("place", "") else ("Taught online only; the map point is the university’s headquarters" if online else ""))
        units = [[m.get("year_or_level") or "", m.get("code") or "", curly(m.get("title") or ""), num(m.get("credit_points")), m.get("type") or ""]
                 for m in (r.get("course_list") or []) if isinstance(m, dict)]
        out.append({"id": r["id"], "university": r["university"], "campus": r.get("campus") or "", "state": r.get("state") or "",
                    "program": curly(r.get("program_title") or ""), "award": r.get("award") or "", "cricos": r.get("cricos_code") or "",
                    "years": num(r.get("duration_full_time_years")), "honours": r.get("honours") or "",
                    "credit_points": num(r.get("total_credit_points")), "credit_unit": curly(system.split(";")[0].strip()), "credit_system": curly(system),
                    "units": num(r.get("units_count")), "work": wshort, "work_detail": wdesc, "work_quote": wquote,
                    "accreditation": ", ".join(r.get("accreditations_stated") or []), "aib_entry": curly(r.get("aib_list_entry") or ""),
                    "other_lists": "; ".join(f"{k}: {curly(v)}" for k, v in others.items()), "breadth": curly(breadth),
                    "fee_dom": fee(r.get("fee_domestic_per_year")), "fee_int": fee(r.get("fee_international_per_year")),
                    "url": r.get("url") or "", "handbook": r.get("handbook_url") or "", "course_list": units,
                    "course_list_complete": bool(r.get("course_list_complete")), "notes": curly(r.get("notes") or ""),
                    "confidence": r.get("confidence") or "", "read_on": r.get("read_on") or "",
                    "lat": c.get("lat"), "lon": c.get("lon"), "place": c.get("place", ""), "map_note": map_note})
    left_out = [r["id"] for r in progs if not (r.get("include") and r.get("url"))]
    # framework facts, short, each with its source (as read in au_frameworks.json)
    aqf = next(f for f in fw["credit_frameworks"] if f["id"].startswith("aqf"))
    aib_std = next(f for f in fw["professional_bodies"] if f["id"] == "aib_accreditation_academic_standards")
    aib_list = next(f for f in fw["professional_bodies"] if f["id"] == "aib_he_accredited_courses_june_2024")
    aiqs = next(f for f in fw["professional_bodies"] if f["id"].startswith("aiqs"))
    assert aib_std["sets_hours_or_credits"] is False and aqf["sets_hours_or_credits"] is False
    foot = next(s for s in aib_list["statements"] if s["location"].startswith("List footnote"))
    facts_aqf = [s["fact"] for s in aqf["statements"] if s.get("fact")][:2]
    unsw = next((r for r in progs if r["id"] == "unsw_cmp"), None)
    codes = re.findall(r"\b(\d{4})\b", unsw["aib_list_entry"]) if unsw else []
    facts = [{"text": "; ".join(facts_aqf) + ".", "source": f"{aqf['issuer']}, {aqf['title']}", "url": aqf.get("landing_page") or aqf["url"]},
             {"text": f"AIB list footnote: “{foot['quote'].split('  ')[-1].strip()}”", "source": f"{aib_list['issuer']}, {aib_list['title']}, {foot['location']}", "url": aib_list["url"]},
             {"text": (f"UNSW: the bachelor’s degree {codes[1]} takes {num(unsw['duration_full_time_years'])} years, with a separate one-year honours degree {codes[0]}; "
                       f"the AIB list’s “4 year program” entry is {codes[0]}, so its path is {num(unsw['duration_full_time_years'])} plus 1 years.") if unsw and len(codes) >= 2 else "",
              "source": "UNSW handbook and program page; AIB list, p. 1", "url": unsw["handbook_url"] if unsw else ""},
             {"text": "AIB’s academic standards set no minimum years, hours, credit points or days of industry experience; duration must be consistent with the course outcomes and comply with the AQF.",
              "source": f"{aib_std['issuer']}, {aib_std['title']}, 3.2", "url": aib_std["url"]}]
    sources = [{"what": "Higher Education AIB Accredited Courses, as at June 2024 (Australian Institute of Building)", "date": "June 2024", "url": aib_list["url"]},
               {"what": "Australian Qualifications Framework, second edition (AQF Council)", "date": "January 2013", "url": aqf.get("landing_page") or aqf["url"]},
               {"what": "Standards for the Accreditation of Degree Programs: Academic Standards (Australian Institute of Building)", "date": "read 7 November 2026", "url": aib_std["url"]},
               {"what": "Accredited Qualifications (Australian Institute of Quantity Surveyors)", "date": "read 7 November 2026", "url": aiqs["url"]},
               {"what": "University program pages and handbooks (linked in each program card of the Australia Atlas)", "date": "read 7 November 2026", "url": ""}]
    dump("au.json", {"programs": out, "facts": [f for f in facts if f["text"]], "left_out": left_out, "sources": sources})
    return True


def n_or(v):
    return "not stated" if v in (None, "") else (str(int(v)) if float(v).is_integer() else str(v))


def main():
    B, T, vals = manuscript()
    ar = Article(B, T, vals)
    f1 = fig1_classes()
    us_atlas(f1)
    dump("study.json", study(ar))
    dump("rq1.json", rq1(ar, f1))
    dump("rq2.json", rq2(ar))
    dump("rq3.json", rq3(ar))
    dump("beyond.json", beyond(ar))
    world()
    src = sources(ar)
    if australia():  # the Australia atlas sources join the list, as the UK and Hong Kong ones do
        src["data"][9:9] = [dict(d, what=d["what"] + " (Australia Atlas)") for d in rjson(OUT / "au.json")["sources"]]
    dump("sources.json", src)


if __name__ == "__main__":
    main()
