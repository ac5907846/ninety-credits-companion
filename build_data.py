"""Build data/*.json for the companion site from 02_analysis results and the raw files they cite. Every number on the
site comes from here; nothing is typed into the pages.

Rewritten 6 November 2026 (night, decision 31) with the article: no program or institution is named outside the US, UK
and Hong Kong atlases (the directories); the holders of the 120 credits, the state groups and the integer program of
Module 14 (02_analysis/14_state_groups) replace the five programs read course by course, the decision tree and the
routes by program. The earlier build is in _archive/before_state_groups_2026-11-06/.
Run: python build_data.py   (from 05_web_app)
"""
import csv
import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
A = ROOT / "02_analysis"
RAW = ROOT / "01_raw_data"
MS = ROOT / "03_manuscript" / "_source"
M14 = A / "14_state_groups" / "results"
OUT = HERE / "data"
OUT.mkdir(exist_ok=True)

GROUP_ORDER = ["30 or fewer", "31 to 36", "37 to 40", "41 to 43", "No state or accreditor count"]
CLASS_LABEL = {"programs": "a reduced-credit program approved at a public university",
               "rule": "a rule or pilot policy, no public program found",
               "proposal": "a proposal, bill or study", "none": "no action found"}
FAMILIES = ["estimating", "planning and control", "law and contracts", "safety", "materials and methods", "structures", "MEP systems",
            "soils and foundations", "surveying", "drawings and BIM", "other construction", "capstone", "internship", "business courses",
            "mathematics", "science"]


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
        return "".join(ch for ch in o if ch >= " " or ch in "\n\t").replace("admissions page (read 2026-11-06) says the programme ‘’; department news item (2023) says it ‘’", "the admissions page (read 6 November 2026) says the programme is seeking HKIS and HKICM accreditation; a 2023 department news item says it is accredited by HKIS and RICS")
    if isinstance(o, list):
        return [clean(x) for x in o]
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    return o


def dump(name, obj):
    json.dump(clean(obj), open(OUT / name, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"data/{name}: {(OUT / name).stat().st_size / 1024:.0f} KB")


def q(v, p):
    v = sorted(v)
    if not v:
        return None
    k = (len(v) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(v) - 1)
    return round(v[lo] + (v[hi] - v[lo]) * (k - lo), 1)


def manuscript_modules():
    """the manuscript builder and its tables, so that the site shows the article’s own rows and sentences"""
    sys.path.insert(0, str(MS))
    import _build_manuscript as B  # noqa: E402
    import _tables as T  # noqa: E402
    return B, T


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
                    "scope": "system institutions only" if c.get("institution_rx") else "",
                    "url_gen_ed": (o.get("source_url_gen_ed", "") or "").split(" ; ")[0] if same else ""})
    return out, corr


# ---------------------------------------------------------------- the atlas (the directory) and the shared files
def main():
    atlas = rcsv(A / "05_bachelor_atlas/results/atlas_programs.csv")
    s5 = rjson(A / "05_bachelor_atlas/results/summary.json")
    states, corr = state_table()
    sidx = {s["state"]: s for s in states}
    m14p = {r["program_id"]: r for r in rcsv(M14 / "programs.csv")}
    hd = {}
    with open(RAW / "ipeds/extracted/HD2024.csv", encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            hd[r["UNITID"]] = (num(r["LATITUDE"]), num(r["LONGITUD"]), r.get("WEBADDR", ""))
    types = {}
    for r in rcsv(A / "10_ai_curriculum/results/course_types.csv"):
        types[(r["program_id"], r["code"], r["title"])] = r["type"]
    ledger = {r["program_id"]: r for r in rcsv(A / "08_stakeholder_ledger/results/ledger_by_program.csv")}

    cols = ["program_id", "unitid", "institution", "city", "state", "control", "program", "degree", "group", "catalog_year", "total_semester",
            "gen_ed", "major", "math_science", "business", "free_electives", "to_cut_for_90", "n_required_courses", "internship_required",
            "capstone_required", "online_option", "reduced_option", "acce", "acce_since", "abet_ansac", "abet_since", "accreditation_group",
            "state_gen_ed_min", "state_reduced_credit_status", "binding_count", "state_group", "tuition_fees_in_state_2023_24", "tuition_fees_out_state_2023_24",
            "per_credit_in_state", "per_credit_out_state", "degrees_2024", "earn_1yr", "earn_4yr", "debt", "confidence",
            "url_catalog", "url_program", "url_ipeds", "url_scorecard", "url_acce", "url_abet", "url_state_gen_ed", "url_state_reduced_credit",
            "catalog_read_on", "lat", "lon", "s_total_gain", "s_tuition_saved", "s_earnings_earlier", "s_breakeven_discount_10yr", "i_net"]
    text_cols = ("program_id", "unitid", "institution", "city", "state", "control", "program", "degree", "group", "catalog_year", "acce",
                 "accreditation_group", "state_reduced_credit_status", "state_group", "confidence", "reduced_option", "online_option",
                 "internship_required", "capstone_required", "catalog_read_on")
    rows = []
    for r in atlas:
        lat, lon, web = hd.get(r["unitid"], (None, None, ""))
        L = ledger.get(r["program_id"], {})
        rec = {**r, "lat": lat, "lon": lon, **{k: L.get(k) for k in ("s_total_gain", "s_tuition_saved", "s_earnings_earlier", "s_breakeven_discount_10yr", "i_net")}}
        # the state or system count for a reduced-credit degree as the article codes it (public universities, within the
        # system a rule names), and the verified action of the state
        s = sidx.get(r["state"], {})
        smin = s.get("state_min")
        rx = corr.get(r["state"], {}).get("institution_rx") or ""
        if r["control"] != "public" or smin is None or (rx and not re.search(rx, r["institution"], re.I)):
            smin = None
        rec["state_gen_ed_min"] = smin
        rec["state_reduced_credit_status"] = s.get("class", "none")
        rec["url_state_gen_ed"] = s.get("url_gen_ed", "") if smin is not None else ""
        rec["url_state_reduced_credit"] = ""
        m = m14p.get(r["program_id"])
        rec["binding_count"] = num(m["binding_count"]) if m else None
        rec["state_group"] = m["group"] if m else ""
        if r["abet_ansac"] == "True":
            rec["abet_ansac"] = True
        elif r["abet_ansac"] == "False":
            rec["abet_ansac"] = False
        rows.append([rec[c] if c == "abet_ansac" else rec[c] if (c in text_cols or str(c).startswith("url")) else num(rec[c]) for c in cols])
    courses = {}
    for c in rcsv(A / "05_bachelor_atlas/results/atlas_courses.csv"):
        courses.setdefault(c["program_id"], []).append([c["code"], c["title"], num(c["credits"]), c["block"], types.get((c["program_id"], c["code"], c["title"]), "other")])
    dump("courses.json", courses)
    dump("atlas.json", {"columns": cols, "rows": rows,
                        "summary": {k: s5[k] for k in ("programs", "institutions", "programs_with_total", "by_accreditation", "by_group", "by_control", "total",
                                                       "total_below_120", "total_exactly_120", "total_above_120", "to_cut_for_90", "gen_ed", "free_electives",
                                                       "free_electives_zero", "free_electives_reported", "tuition_in_state", "per_credit_in_state_public",
                                                       "earn_1yr", "earn_4yr", "debt", "degrees_2024_sum", "states_with_programs", "states_only", "territories", "read_on")}})
    S14 = rjson(M14 / "summary.json")
    dump("states.json", {"states": states, "class_label": CLASS_LABEL, "group_order": GROUP_ORDER,
                         "summary": {k: S14[k] for k in ("states_count_by_group", "states_count_by_class", "programs_by_class", "programs_by_group",
                                                          "count_range_states", "core_median", "programs_accredited_or_applicant", "programs_modeled")}})

    # the programmatic accreditors’ texts and practice (all accredited programs; no program named)
    dump("rules.json", {"acce": rjson(RAW / "case_study_2026-11-05/rules.json")["acce"],
                        "criteria": rcsv(A / "06_abet_ansac/results/criteria_comparison.csv"),
                        "practice": rcsv(A / "06_abet_ansac/results/practice_comparison.csv")})

    s8 = rjson(A / "08_stakeholder_ledger/results/summary.json")
    dump("ledger.json", {"summary": rcsv(A / "08_stakeholder_ledger/results/ledger_summary.csv"), "employers": s8["employers"], "assumptions": s8["assumptions"]})

    s10 = rjson(A / "10_ai_curriculum/results/summary.json")
    dump("ai.json", {"ai_hours": [{k: (v if k == "accreditation_group" else num(v)) for k, v in r.items() if k not in ("program_id", "institution")}
                                  for r in rcsv(A / "10_ai_curriculum/results/program_type_hours.csv")],
                     "task_mix": rcsv(A / "10_ai_curriculum/results/task_mix.csv"),
                     "ai_summary": {k: v for k, v in s10.items() if k not in ("exposure", "case", "case_tool_courses")},
                     "exposure": s10["exposure"], "content_types": S14["content_types"], "programs_modeled": S14["programs_modeled"]})

    s7 = rjson(A / "07_international/results/summary.json")
    comp = rcsv(A / "07_international/results/composition.csv") if (A / "07_international/results/composition.csv").exists() else []
    s7_site = dict(s7)
    s7_site["composition_shares"] = [r for r in s7["composition_shares"] if not r["system"].startswith("United States")]  # the U.S. row was the five programs
    dump("abroad.json", {"programs": rcsv(A / "07_international/results/international_programs.csv"), "composition": comp, "summary": s7_site,
                         "frameworks": rjson(RAW / "international/uk/uk_frameworks.json"),
                         "hk_reform": rjson(RAW / "international/hk/hk_reform.json") if (RAW / "international/hk/hk_reform.json").exists() else None})

    sources = [
        {"what": "ACCE member directory (accredited, applicant and candidate programs)", "date": "29 October 2026", "url": "https://www.acce.edu/bachelor-programs"},
        {"what": "ACCE Document 103, Standards and Criteria (rev. 2026.10.19)", "date": "19 October 2026", "url": "https://www.acce.edu/"},
        {"what": "ABET accredited programs search (ANSAC, construction management criteria)", "date": "6 November 2026", "url": "https://amspub.abet.org/aps/name-search?searchType=program&keyword=construction%20management"},
        {"what": "ABET Criteria for Accrediting Applied and Natural Science Programs, 2026-27", "date": "2026", "url": "https://www.abet.org/2026-2027_ansac_criteria"},
        {"what": "Institution catalogs (one page per program, linked in each program card of the US Atlas)", "date": "29 October to 6 November 2026", "url": ""},
        {"what": "IPEDS Completions 2024, Institutional Characteristics 2023-24, Directory 2024 (NCES)", "date": "2024 releases", "url": "https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx"},
        {"what": "College Scorecard, field of study and institution files (institutional accreditor of each institution)", "date": "15 October 2026 release", "url": "https://collegescorecard.ed.gov/data/"},
        {"what": "BLS Employment Projections 2025-35", "date": "27 August 2026", "url": "https://www.bls.gov/emp/tables.htm"},
        {"what": "State and system general education rules for a reduced-credit bachelor’s degree, coded from their texts (Online Resource 2 of the article)", "date": "verified 6 November 2026", "url": ""},
        {"what": "State actions on bachelor’s degrees below 120 credits, verified against primary documents and news reports (Online Resource 1 of the article)", "date": "verified 6 November 2026", "url": ""},
        {"what": "Institutional accreditors’ reduced-credit rules: SACSCOC policy and guidelines, NECHE guidelines, HLC guidelines, NWCCU, MSCHE and WSCUC statements", "date": "2024 to 2026", "url": ""},
        {"what": "U.S. Department of Education final rule on the recognition of accrediting agencies (Federal Register 2026-22174)", "date": "30 October 2026", "url": "https://www.federalregister.gov/documents/2026/10/30/2026-22174/accreditation-innovation-and-modernization-the-secretarys-recognition-of-accrediting-agencies"},
        {"what": "34 CFR 600.2, definition of a credit hour", "date": "current", "url": "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-VI/part-600/subpart-A/section-600.2"},
        {"what": "CIOB UK Accredited Institutions 2026; QAA FHEQ 2024 and Credit Framework 2021", "date": "27 March 2026; 2024; 2021", "url": "https://www.ciob.org/learning-providers/education-framework"},
        {"what": "O*NET 31.0 tasks with AI exposure (Eloundou et al., 2024) for construction managers and cost estimators", "date": "30 October 2026", "url": "https://github.com/openai/GPTs-are-GPTs"},
    ]
    refs = cited_references()
    dump("sources.json", {"data": sources, "references": refs})
    paper(refs)
    balance()
    model()
    paths()
    world()


# ---------------------------------------------------------------- the article: references, sentences and tables
def cited_references():
    """every reference the manuscript cites, with its APA entry and first link"""
    B, _ = manuscript_modules()
    body = (MS / "_content.md").read_text(encoding="utf-8")
    out = []
    for r in B.load_references():
        if B.is_cited(r["cite"], body):
            m = re.search(r"https?://\S+", r["apa"])
            out.append({"cite": r["cite"], "apa": r["apa"], "url": m.group(0).rstrip(".") if m else ""})
    for m in json.load(open(MS / "masked_references.json", encoding="utf-8")):
        if ("{{M:" + m["key"] + "}}") in body:
            u = re.search(r"https?://\S+", m["apa"])
            out.append({"cite": m["cite"], "apa": m["apa"], "url": u.group(0).rstrip(".") if u else ""})
    out.sort(key=lambda r: re.sub(r"[^a-z0-9 ]", "", r["apa"].lower()))
    return out


def study_text(B, vals):
    """the title, abstract, questions, theory and hypotheses as the article prints them, numbers filled by the builder"""
    lines = (MS / "_content.md").read_text(encoding="utf-8").splitlines()
    for ln in lines:  # the builder’s own pre-pass, so that Table and Fig. numbers resolve
        if ln.startswith("[[TABLE:"):
            B.TABLE_NO.setdefault(ln.strip()[8:-2], sum(1 for v in B.TABLE_NO.values() if isinstance(v, int)) + 1)
        if ln.startswith("[[FIGURE:"):
            B.FIG_NO.setdefault(ln.strip()[9:-2].split("|")[0], len(B.FIG_NO) + 1)
    f = lambda s: B.fill(s, vals).strip()  # noqa: E731
    i = lines.index("## Abstract")
    abstract = next(f(x) for x in lines[i + 1:] if x.strip())
    kw = next((f(x) for x in lines if x.startswith("**Keywords:**")), "").replace("**Keywords:**", "").strip()
    j = next(k for k, x in enumerate(lines) if x.startswith("## 3 "))
    theory = []
    for x in lines[j + 1:]:
        if x.startswith("## "):
            break
        if x.strip() and not x.startswith("- "):
            theory.append(f(x))
    return {"title": f(lines[0][2:]), "abstract": abstract, "keywords": kw,
            "rqs": [f(x[2:]) for x in lines if x.startswith("- RQ")],
            "hypotheses": [f(x[2:]) for x in lines if re.match(r"- H\d\.", x)],
            "theory": theory, "theory_heading": lines[j][5:].strip()}


def paper(refs):
    B, T = manuscript_modules()
    vals = B.load_values()
    link = {r["cite"]: r["url"] for r in refs}

    def ev(text, cite):
        return {"text": text, "cite": cite, "url": link.get(cite, "")}

    s12 = rjson(A / "12_skills_at_risk/results/summary.json")
    inputs = []
    for r in rcsv(A / "08_stakeholder_ledger/results/ledger_by_program.csv"):
        g, e1, gr = num(r["s_total_gain"]), num(r["earn_1yr"]), num(r["growth_1_to_4"])
        if isinstance(g, (int, float)) and g and isinstance(e1, (int, float)) and e1 and isinstance(gr, (int, float)):
            inputs.append([e1, gr, g, r["accreditation_group"]])  # no program or institution names
    dump("skills.json", {"transfer": s12["transfer"], "internships": s12["internships"], "level_threshold": s12["level_threshold"],
                         "lifecycle_threshold": s12["lifecycle_threshold"], "thresholds_at_5pct": s12["thresholds_at_5pct"],
                         "england_in_us_credits": s12["england_in_us_credits"], "threshold_inputs": inputs,
                         "assumptions": rjson(A / "08_stakeholder_ledger/results/summary.json")["assumptions"]})

    s11 = rjson(A / "11_advisor_survey/results/summary.json")
    dump("survey.json", {"summary": s11, "counts": rcsv(A / "11_advisor_survey/results/answer_counts.csv"),
                         "note": "Anonymous five-question survey of the industry advisors of one accredited construction management program, October 2026; answer counts only."})

    ai_ev = [
        ev("Endoscopists’ adenoma detection rate in colonoscopies without AI fell from 28.4% to 22.4% after routine exposure to AI (1,443 patients)", "Budzyń et al., 2025"),
        ev("Outside the frontier of what AI does well, knowledge workers using it were correct about 19 percentage points less often; inside it they completed 12.2% more tasks", "Dell’Acqua et al., 2026"),
        ev("Knowledge workers with more confidence in AI reported less critical thinking (319 workers)", "Lee et al., 2025"),
        ev("Automation bias affects experts as well as novices, and training does not remove it", "Parasuraman & Manzey, 2010"),
        ev("Operators who only monitor automation lose the skill to take over when it fails", "Bainbridge, 1983"),
        ev("Three risks for learners: deskilling, the loss of previously acquired skills; mis-skilling, the reinforcement of incorrect behavior due to AI errors or bias; never-skilling, the failure to develop essential competencies", "Abdulnour et al., 2025"),
        ev("Students using ChatGPT improved essay scores without more knowledge gain or transfer", "Fan et al., 2025"),
        ev("AI raised productivity by 15% on average and by 30% for less skilled and less experienced workers", "Brynjolfsson et al., 2025"),
        ev("Intelligent tutoring systems raise test performance by a median .66 standard deviations across 50 evaluations", "Kulik & Fletcher, 2016"),
        ev("A tutor designed to give one step at a time rather than the full solution doubled learning gains in less time in a randomized crossover trial (median 49 minutes against a 60-minute class)", "Kestin et al., 2025"),
        ev("Open access to GPT-4 raised practice grades by 48% but lowered grades on an exam taken without AI by 17%; a tutor that gave teacher-designed hints removed that loss", "Bastani et al., 2025"),
        ev("ChatGPT produced construction schedules that were coherent but contained wrong tasks", "Prieto et al., 2023"),
        ev("Model-based estimating still leaves the estimator substantial work", "Abioye et al., 2021"),
        ev("Junior employment fell about 9% at firms adopting generative AI, through fewer hires (working paper)", "Hosseini & Lichtinger, 2025"),
    ]
    people = [
        ev("Only 53.5% of employers rate new graduates proficient in communication and 55.9% in critical thinking", "National Association of Colleges and Employers [NACE], 2025"),
        ev("The shortage contractors report is in experienced salaried roles such as superintendents and project managers", "Associated General Contractors of America & NCCER, 2026"),
        ev("Lower-division credits cost less to teach than upper-division ones ($188 against $275 per credit hour in Florida’s public universities; Johnson, 2009)", "Romano et al., 2010"),
        ev("High school graduates peak in 2025 and fall about 13% by 2041", "Lane et al., 2024"),
        ev("Adults with credit for prior learning completed credentials at 49% against 27%, and generated more tuition", "Klein-Collins et al., 2020"),
        ev("A department that embedded technical writing in five engineering courses ran it by co-teaching with a writing instructor", "McCall & Rayess, 2021"),
    ]
    # the site cites only what the article cites
    ai_ev = [e for e in ai_ev if e["cite"] in link]
    people = [e for e in people if e["cite"] in link]
    rows_of = lambda t: {"title": t[0].split("<!--")[0].strip(), "rows": t[1], "notes": t[2]}  # noqa: E731
    # the article’s tables, numbered as in the article: the order of their first appearance in the content file
    order = re.findall(r"^\[\[TABLE:([a-z_]+)\]\]", (MS / "_content.md").read_text(encoding="utf-8"), re.M)
    tables = {}
    for i, name in enumerate(order, 1):
        t = rows_of(T.TABLES[name](vals))
        t["title"] = re.sub(r"^Table \d+\.", f"Table {i}.", t["title"])
        t["number"] = i
        tables[name] = t
    if "ai_table" not in tables:  # no longer an article table (decision 34): shown unnumbered
        t = rows_of(T.TABLES["ai_table"](vals))
        t["title"] = re.sub(r"^Table \d+\.\s*", "", t["title"])
        tables["ai_table"] = t
    tables["actions"] = rows_of(T.TABLES["actions"](vals))
    dump("paper.json", {"study": study_text(B, vals), "tables": tables, "ai_evidence": ai_ev, "people": people})


# ---------------------------------------------------------------- where the balance turns (no program named)
def balance():
    s12 = rjson(A / "12_skills_at_risk/results/summary.json")
    led = {r["program_id"]: r for r in rcsv(A / "08_stakeholder_ledger/results/ledger_by_program.csv")}
    inst = []
    for r in rcsv(A / "12_skills_at_risk/results/institution_break_even.csv"):
        inst.append([led.get(r["program_id"], {}).get("accreditation_group", ""), num(r["credits_removed"]), num(r["institution_net_per_graduate"]),
                     num(r["net_margin_per_credit"]), num(r["break_even_new_share"]) if r["break_even_new_share"] else None])
    dump("balance.json", {"curves": [{k: num(v) for k, v in r.items()} for r in rcsv(A / "12_skills_at_risk/results/threshold_curves.csv")],
                          "institution_curve": [{k: num(v) for k, v in r.items()} for r in rcsv(A / "12_skills_at_risk/results/institution_curve.csv")],
                          "institution_programs": {"columns": ["accreditation", "credits_removed", "net_per_graduate", "net_margin_per_credit", "break_even_new_share"], "rows": inst},
                          "summary": {"institution_break_even": s12["institution_break_even"], "level_threshold": s12["level_threshold"],
                                      "lifecycle_threshold": s12["lifecycle_threshold"], "thresholds_at_5pct": s12["thresholds_at_5pct"]}})


# ---------------------------------------------------------------- Module 14: the holders and the integer program
def model():
    S = rjson(M14 / "summary.json")
    sys.path.insert(0, str(A / "14_state_groups"))
    sys.path.insert(0, str(A / "09_pathways"))
    import outcome_rules as R  # noqa: E402
    from ansac_rules import ANSAC  # noqa: E402

    gs = [{k: (v if k in ("group", "accreditor", "choice", "count") else num(v)) for k, v in r.items()} for r in rcsv(M14 / "group_summary.csv")]
    carry = [{"accreditor": r["accreditor"], "choice": r["choice"], "overlap": num(r["overlap"]), "count": num(r["count"]), "share_fit": num(r["share_fit"])}
             for r in rcsv(M14 / "carry_curves.csv")]
    # the check: ACCE’s outcomes and business topics without its hour floors (binding count only)
    ao_rows = rcsv(M14 / "acce_outcomes_only.csv")
    ao = []
    for ov in ("0", "12"):
        for grp in GROUP_ORDER + ["All"]:
            rs = [r for r in ao_rows if r["overlap"] == ov and (grp == "All" or r["group"] == grp)]
            if not rs:
                continue
            tot = [float(r["total"]) for r in rs]
            ao.append({"group": grp, "overlap": int(ov), "programs": len(rs), "fit_90": sum(r["fits_90"] == "True" for r in rs),
                       "total_median": q(tot, .5), "total_p25": q(tot, .25), "total_p75": q(tot, .75),
                       "mean_construction": round(sum(float(r["construction"]) for r in rs) / len(rs), 1),
                       "mean_business": round(sum(float(r["business"]) for r in rs) / len(rs), 1),
                       "mean_total": round(sum(tot) / len(rs), 1)})
    # which course family names each outcome in the 90-credit designs (share of the modeled programs), and how often
    # the titles name it at all
    n = S["programs_modeled"]
    share, named = defaultdict(set), defaultdict(set)
    for c in rcsv(M14 / "outcome_cover.csv"):
        key = (c["framework"], int(c["outcome"]))
        if c["family"] == "not named by a title":
            continue
        named[key].add(c["program_id"])
        share[(key, c["family"])].add(c["program_id"])
    blocks = [("ACCE", "ACCE: 17 student learning outcomes", [s[1] for s in R.ACCE_SLO]),
              ("ANSAC topic", "ABET ANSAC: 12 program-criteria topics", [a[0] for a in ANSAC]),
              ("ANSAC outcome", "ABET ANSAC: 6 student outcomes", [s[1] for s in R.ANSAC_SO])]
    cover = []
    for fw, title, labels in blocks:
        for k, lab in enumerate(labels, 1):
            cover.append({"framework": fw, "block": title, "outcome": k, "label": lab,
                          "named": round(len(named[(fw, k)]) / n, 3),
                          "families": [round(len(share[((fw, k), fam)]) / n, 3) for fam in FAMILIES]})
    progs = [r for r in rcsv(M14 / "programs.csv") if r["modeled"] == "True"]
    today = [float(r["construction_listed"]) + float(r["business_listed"]) for r in progs]
    ofl = rcsv(M14 / "outcome_floor.csv")
    hours = {"ACCE": [float(r["hours"]) for r in ofl if r["framework"] == "ACCE"], "ANSAC": [float(r["hours"]) for r in ofl if r["framework"] == "ANSAC"], "today": today}
    keep = ("programs_accredited_or_applicant", "programs_modeled", "modeled_by_group", "modeled_public", "count_range_states", "core_median",
            "carry_median", "fit_share_all", "fit_by_group", "outcome_floor", "slo_named_share", "ansac_topic_named_share", "today", "states_count_by_group",
            "states_count_by_class", "programs_by_class", "programs_by_group", "all", "rule_arithmetic", "holder_claims", "keep_professional_median",
            "acce_outcomes_only", "high_count_groups", "h3")
    dump("model.json", {"summary": {k: S[k] for k in keep if k in S}, "group_order": GROUP_ORDER, "group_summary": gs, "carry": carry,
                        "outcomes_only": ao, "families": FAMILIES, "cover": cover,
                        "hours": {k: {"median": q(v, .5), "p25": q(v, .25), "p75": q(v, .75), "programs": len(v)} for k, v in hours.items()},
                        "pairs": rcsv(A / "09_pathways/results/merge_pairs.csv"),
                        "pairs_programs": rjson(A / "09_pathways/results/summary.json").get("accredited_programs_coded")})


# ---------------------------------------------------------------- Module 15: course groups, merges, pathways (decision 34)
GEN_AREAS = {"communication", "mathematics", "natural science", "humanities and social science", "social science"}  # as plot_groups.py
PRACTICE_MIN = 5  # a merge fewer programs practice is a proposal (as plot_groups.py and Module 9)


def paths():
    M15 = A / "15_course_groups" / "results"
    S15 = rjson(M15 / "summary.json")
    S14 = rjson(M14 / "summary.json")
    sys.path.insert(0, str(A / "14_state_groups"))
    import outcome_rules as R  # noqa: E402

    cnt = lambda v: int(float(v)) if v not in ("", None) else None  # noqa: E731
    links = []
    for lk in rcsv(M15 / "merge_links.csv"):
        n1, nsep = cnt(lk["programs_one_course"]), cnt(lk["programs_separate"])
        if lk["kind"].startswith("blocked"):
            style = "blocked"
        elif lk["kind"] == "general education into construction":
            style = "gen" if (n1 or 0) >= PRACTICE_MIN else "proposal"
        else:
            style = "loop" if lk["group_a"] == lk["group_b"] else "con"
        links.append({"merge": lk["merge"], "kind": lk["kind"], "style": style, "a": lk["group_a"], "b": lk["group_b"], "one_course": n1, "separate": nsep,
                      "credits_saved": num(lk["credits_saved"]), "rule": lk["rule"], "ai_role": curly(lk["ai_role"])})
    ring = {lk["b"] for lk in links if lk["style"] == "gen"}
    groups = []
    for g in rcsv(M15 / "group_summary.csv"):
        parts = {p.strip() for p in g["serves"].split(";")}
        groups.append({"group": g["course_group"], "part": g["part"], "serves": g["serves"], "content_type": g["content_type"],
                       "gen": bool(parts & GEN_AREAS), "gen_overlap": g["course_group"] in ring, "bus": "ACCE business" in parts, "con": "ACCE construction" in parts,
                       "programs_with": num(g["programs_with"]), "share_programs": num(g["share_programs"]), "median_where_present": num(g["median_hours_where_present"]),
                       "mean_today": num(g["mean_hours_all"]), "mean_floor": num(g["mean_kept_acce_floor"]), "mean_merged_overlap": num(g["mean_kept_every_topic_merged_overlap"]),
                       "ai_exposure": num(g["ai_exposure"]), "slos": [int(x) for x in g["slos_named"].split("; ") if x.strip()],
                       "loops": [{"merge": lk["merge"], "one_course": lk["one_course"], "separate": lk["separate"]} for lk in links if lk["style"] == "loop" and lk["a"] == g["course_group"]]})
    # each modeled program’s fit along the pathways, without its id (sorted by state group, then by its total at ACCE’s floors)
    scen = defaultdict(dict)
    for s in rcsv(M14 / "scenarios.csv"):
        if s["count"] == "binding":
            scen[s["program_id"]][f"{s['accreditor']}|{s['choice']}|{s['overlap']}"] = (s["fits_90"] == "True", float(s["total"]))
    ao = defaultdict(dict)
    for r in rcsv(M14 / "acce_outcomes_only.csv"):
        ao[r["program_id"]][r["overlap"]] = r["fits_90"] == "True"
    prog = []
    for p in rcsv(M15 / "pathways.csv"):
        sc, pid = scen[p["program_id"]], p["program_id"]
        prog.append({"group": p["group"], "floor_total": sc["ACCE|floor|0"][1],
                     "fits": {"keep_0": float(p["keep_0"]) <= 90, "keep_12": float(p["keep_12"]) <= 90,
                              "merge_0": p["keep_merge_0_fits"] == "True", "merge_12": p["keep_merge_12_fits"] == "True",
                              "floor_0": sc["ACCE|floor|0"][0], "floor_12": sc["ACCE|floor|12"][0], "ansac_0": sc["ANSAC|floor|0"][0],
                              "outcomes_0": ao[pid]["0"], "outcomes_12": ao[pid]["12"]}})
    prog.sort(key=lambda x: (GROUP_ORDER.index(x["group"]), x["floor_total"]))
    keys = ["keep_0", "keep_12", "merge_0", "merge_12", "floor_0", "floor_12", "ansac_0", "outcomes_0", "outcomes_12"]
    programs = {"keys": keys, "rows": [[GROUP_ORDER.index(x["group"])] + [int(x["fits"][k]) for k in keys] for x in prog]}
    # the typical program, course group by course group (no program id, no course codes)
    tp = rcsv(M15 / "typical_pathway.csv")
    d0 = {r["course_group"]: r for r in tp if r["design"].endswith("overlap 0")}
    d12 = {r["course_group"]: r for r in tp if r["design"].endswith("overlap 12")}
    tc = rcsv(M15 / "typical_courses.csv")
    floor_kept, merged_in = defaultdict(float), defaultdict(set)
    for c in tc:
        if c["acce_floor_overlap"] == "kept":
            floor_kept[c["course_group"]] += float(c["hours"])
        if c["every_topic_merged_overlap"].startswith("merged: "):
            merged_in[c["course_group"]].add(c["every_topic_merged_overlap"][8:])
    part = {g["group"]: g["part"] for g in groups}
    ts = S15["typical_steps"]
    added = "General education added to reach the count"
    typical = []
    for name, r in d0.items():
        fl = ts["acce_floor_12_gen_ed_added"] if name == added else floor_kept.get(name, 0.0)
        typical.append({"group": name, "part": part.get(name, "general education"), "today": num(r["hours_today"]), "merged_0": num(r["hours_design"]),
                        "merged_12": num(d12[name]["hours_design"]), "floor_12": num(fl), "merges": sorted(merged_in.get(name, []))})
    # where AI touches the construction groups and ACCE’s outcomes
    con = sorted([g for g in groups if g["part"] == "construction" and g["ai_exposure"] is not None], key=lambda g: -g["ai_exposure"])
    gs = defaultdict(dict)
    for r in rcsv(M15 / "group_slo.csv"):
        gs[r["course_group"]][int(r["slo"])] = num(r["share_programs"])
    ai = {"groups": [{"group": g["group"], "ai_exposure": g["ai_exposure"], "mean_today": g["mean_today"], "shares": [gs[g["group"]].get(k, 0) for k in range(1, 18)]} for g in con],
          "slo_names": [s[1] for s in R.ACCE_SLO], "slo_named_share": [S14["slo_named_share"][str(k)] for k in range(1, 18)]}
    geo = [{"group": r["group"], "states": r["states"].split("; "), "programs": num(r["programs_accredited_or_applicant"]), "share_graduates": num(r["share_graduates_2024"]),
            "share_jobs": num(r["share_construction_manager_jobs_2025"]), "modeled": num(r["modeled"]), "fit_floor": num(r["fit_acce_floor"]),
            "fit_floor_overlap": num(r["fit_acce_floor_overlap"])} for r in rcsv(M15 / "geography.csv")]
    keep = ("programs", "groups", "merge_pairs_evidence", "programs_with_a_merge", "merge_pairs_per_program_median", "merge_saving_median_where_any",
            "merge_saving_max", "keep", "keep_merge", "general_education_added_mean", "geography", "state_line_effect", "typical_steps", "blocked_programs",
            "into_construction_programs", "typical")
    dump("paths.json", {"summary": {k: S15[k] for k in keep if k in S15}, "groups": groups, "links": links, "evidence": rcsv(M15 / "merge_evidence.csv"),
                        "programs": programs, "typical": typical, "ai": ai, "geography": geo, "group_order": GROUP_ORDER, "practice_min": PRACTICE_MIN})


# ---------------------------------------------------------------- 6 November 2026: UK and Hong Kong atlases (directories)
def amount(v, key="amount"):
    """a fee field may be a number or {amount, currency, academic_year, note}"""
    if isinstance(v, dict):
        return num(v.get(key))
    return num(v)


def hk_fee(v):
    """Hong Kong local fee a year and how it was read: the published annual amount, or the annual figure the collector
    derived from a fee per credit, a fee per stage or a fee for years 1 and 2 (the same values Module 7 summarizes)."""
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
    """Credits of a UK honours degree: stated on the page, else read from a full module list (120 credits for each taught
    year), else the national minimum (QAA 2024, Annex C: 360 in England, Wales and Northern Ireland, 480 in Scotland).
    Also the credits a year the module list shows (core and listed options) and the placement year’s credits (the
    largest single placement module where the list offers alternatives)."""
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
    by_year = [[y, years[y]["core"], years[y]["option"]] for y in sorted(years)]
    return total, source, by_year, pc


def world():
    TYPES = ["technical", "judgment", "digital_tool", "field_procedure", "math_science", "breadth", "integrative", "other"]
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
                   "modules": mods,
                   "modules_status": r.get("modules_status") or "", "notes": r.get("notes") or "", "read_on": r.get("read_on") or "",
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


if __name__ == "__main__":
    main()
