"""Build data/*.json for the version 2 companion site (construction bachelor's degrees only) from 02_analysis results
and the raw files they cite. Every number on the site comes from here; nothing is typed into the pages.
Run: python build_data.py   (from 05_web_app)
"""
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
A = ROOT / "02_analysis"
RAW = ROOT / "01_raw_data"
OUT = HERE / "data"
OUT.mkdir(exist_ok=True)


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


def main():
    atlas = rcsv(A / "05_bachelor_atlas/results/atlas_programs.csv")
    s5 = rjson(A / "05_bachelor_atlas/results/summary.json")
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
            "state_gen_ed_min", "state_reduced_credit_status", "tuition_fees_in_state_2023_24", "tuition_fees_out_state_2023_24",
            "per_credit_in_state", "per_credit_out_state", "degrees_2024", "earn_1yr", "earn_4yr", "debt", "confidence",
            "url_catalog", "url_program", "url_ipeds", "url_scorecard", "url_acce", "url_abet", "url_state_gen_ed", "url_state_reduced_credit",
            "catalog_read_on", "lat", "lon", "s_total_gain", "s_tuition_saved", "s_earnings_earlier", "s_breakeven_discount_10yr", "i_net"]
    rows = []
    for r in atlas:
        lat, lon, web = hd.get(r["unitid"], (None, None, ""))
        L = ledger.get(r["program_id"], {})
        rec = {**r, "lat": lat, "lon": lon, **{k: L.get(k) for k in ("s_total_gain", "s_tuition_saved", "s_earnings_earlier", "s_breakeven_discount_10yr", "i_net")}}
        if r["abet_ansac"] == "True":
            rec["abet_ansac"] = True
        elif r["abet_ansac"] == "False":
            rec["abet_ansac"] = False
        rows.append([rec[c] if c in ("abet_ansac",) else num(rec[c]) if c not in ("program_id", "unitid", "institution", "city", "state", "control", "program", "degree", "group", "catalog_year", "acce", "accreditation_group", "state_reduced_credit_status", "confidence", "reduced_option", "online_option", "internship_required", "capstone_required") and not str(c).startswith("url") and c != "catalog_read_on" else rec[c] for c in cols])
    courses = {}
    for c in rcsv(A / "05_bachelor_atlas/results/atlas_courses.csv"):
        courses.setdefault(c["program_id"], []).append([c["code"], c["title"], num(c["credits"]), c["block"], types.get((c["program_id"], c["code"], c["title"]), "other")])
    dump("courses.json", courses)
    dump("atlas.json", {"columns": cols, "rows": rows,
                        "summary": {k: s5[k] for k in ("programs", "institutions", "programs_with_total", "by_accreditation", "by_group", "by_control", "total",
                                                       "total_below_120", "total_exactly_120", "total_above_120", "to_cut_for_90", "gen_ed", "free_electives",
                                                       "free_electives_zero", "free_electives_reported", "tuition_in_state", "per_credit_in_state_public",
                                                       "earn_1yr", "earn_4yr", "debt", "degrees_2024_sum", "states_with_programs", "states_only", "territories", "read_on")}})

    # states
    st4 = rcsv(A / "04_national_landscape/results/states.csv")
    stt = {r["state_abbr"]: r for r in rcsv(RAW / "policy/state_gen_ed.csv")}
    for o in rcsv(RAW / "case_study_2026-11-05/state_status_overlay_2026-11-05.csv"):
        stt[o["state_abbr"]].update({"reduced_credit_action": o["reduced_credit_action"], "source_url_reduced_credit": o["source_url_reduced_credit"], "retrieved": o["retrieved"]})
    states = []
    for r in st4:
        s = stt.get(r["state"], {})
        states.append({"state": r["state"], "name": r["state_name"], "status": r["reduced_credit_status"], "label": r["status_label"],
                       "gen_ed_min": num(r["gen_ed_min_semester_credits"]), "acce": num(r["acce_bachelors_accredited"]),
                       "applicant": num(r["acce_applicant"]) + num(r["acce_candidate"]), "ansac": num(r.get("abet_ansac_cm")),
                       "action": s.get("reduced_credit_action", ""), "framework": s.get("gen_ed_framework", ""),
                       "url_gen_ed": s.get("source_url_gen_ed", ""), "url_reduced": (s.get("source_url_reduced_credit", "") or "").split(" ; ")[0], "retrieved": s.get("retrieved", "")})
    dump("states.json", {"states": states, "events": rcsv(A / "04_national_landscape/results/events.csv"), "summary": rjson(A / "04_national_landscape/results/summary.json")})

    # rules, case, budget calculator
    progs = {}
    names = rjson(A / "01_case_and_peers_floors/results/program_names.json")
    for fp in sorted((RAW / "case_study_2026-11-05/programs").glob("*.json")):
        p = rjson(fp)
        progs[p["code"]] = {"label": names[p["code"]]["label"], "institution": p["institution"], "program": p["program_name"], "catalog_url": p["catalog_url"],
                            "gen_ed_core": p["general_education_min_hours_estimate"],
                            "courses": [[c["code"], c["title"], c["credits"], c["category"], bool(c.get("gen_ed_flag")), bool(c.get("earth_science"))] for c in p["courses"]]}
    dump("rules.json", {"acce": rjson(RAW / "case_study_2026-11-05/rules.json")["acce"],
                        "criteria": rcsv(A / "06_abet_ansac/results/criteria_comparison.csv"),
                        "practice": rcsv(A / "06_abet_ansac/results/practice_comparison.csv"),
                        "floors": rjson(A / "01_case_and_peers_floors/results/summary.json"),
                        "budget": rjson(A / "02_whole_course_ledger/results/summary.json")["headline"],
                        "programs": progs})

    # ledger
    s8 = rjson(A / "08_stakeholder_ledger/results/summary.json")
    dump("ledger.json", {"summary": rcsv(A / "08_stakeholder_ledger/results/ledger_summary.csv"), "case": s8["case"], "employers": s8["employers"], "assumptions": s8["assumptions"]})

    # routes and AI
    dump("routes.json", {"ladder": rcsv(A / "09_pathways/results/ladder.csv"), "pairs": rcsv(A / "09_pathways/results/merge_pairs.csv"),
                         "national": rcsv(A / "09_pathways/results/national_levers.csv"), "summary": rjson(A / "09_pathways/results/summary.json"),
                         "ai_hours": rcsv(A / "10_ai_curriculum/results/program_type_hours.csv"), "task_mix": rcsv(A / "10_ai_curriculum/results/task_mix.csv"),
                         "ai_summary": {k: v for k, v in rjson(A / "10_ai_curriculum/results/summary.json").items() if k != "exposure"}})

    # abroad
    s7 = rjson(A / "07_international/results/summary.json")
    comp = rcsv(A / "07_international/results/composition.csv") if (A / "07_international/results/composition.csv").exists() else []
    dump("abroad.json", {"programs": rcsv(A / "07_international/results/international_programs.csv"), "composition": comp, "summary": s7,
                         "frameworks": rjson(RAW / "international/uk/uk_frameworks.json"),
                         "hk_reform": rjson(RAW / "international/hk/hk_reform.json") if (RAW / "international/hk/hk_reform.json").exists() else None})

    # sources
    sources = [
        {"what": "ACCE member directory (accredited, applicant and candidate programs)", "date": "29 October 2026", "url": "https://www.acce.edu/bachelor-programs"},
        {"what": "ACCE Document 103, Standards and Criteria (rev. 2026.10.19)", "date": "19 October 2026", "url": "https://www.acce.edu/"},
        {"what": "ACCE notices of accreditation actions, 2026 Midyear and Annual", "date": "28 February and 24 July 2026", "url": "https://www.acce.edu/notice-of-accreditation"},
        {"what": "ABET accredited programs search (ANSAC, construction management criteria)", "date": "6 November 2026", "url": "https://amspub.abet.org/aps/name-search?searchType=program&keyword=construction%20management"},
        {"what": "ABET Criteria for Accrediting Applied and Natural Science Programs, 2026-27", "date": "2026", "url": "https://www.abet.org/2026-2027_ansac_criteria"},
        {"what": "Institution catalogs (one page per program, linked in each program card)", "date": "29 October to 6 November 2026", "url": ""},
        {"what": "IPEDS Completions 2024, Institutional Characteristics 2023-24, Directory 2024 (NCES)", "date": "2024 releases", "url": "https://nces.ed.gov/ipeds/datacenter/DataFiles.aspx"},
        {"what": "College Scorecard, field of study and institution files", "date": "15 October 2026 release", "url": "https://collegescorecard.ed.gov/data/"},
        {"what": "BLS Employment Projections 2025-35", "date": "27 August 2026", "url": "https://www.bls.gov/emp/tables.htm"},
        {"what": "State general education and reduced-credit rules (one source per state in the map)", "date": "29 October and 5 November 2026", "url": ""},
        {"what": "U.S. Department of Education proposed rule on accreditation (Federal Register 2026-17001)", "date": "20 August 2026", "url": "https://www.federalregister.gov/documents/2026/08/20/2026-17001/accreditation-innovation-and-modernization-the-secretarys-recognition-of-accrediting-agencies"},
        {"what": "34 CFR 600.2, definition of a credit hour", "date": "current", "url": "https://www.ecfr.gov/current/title-34/subtitle-B/chapter-VI/part-600/subpart-A/section-600.2"},
        {"what": "CIOB UK Accredited Institutions 2026; QAA FHEQ 2024 and Credit Framework 2021", "date": "27 March 2026; 2024; 2021", "url": "https://www.ciob.org/learning-providers/education-framework"},
        {"what": "O*NET 31.0 tasks with AI exposure (Eloundou et al., 2024) for construction managers and cost estimators", "date": "30 October 2026", "url": "https://github.com/openai/GPTs-are-GPTs"},
    ]
    refs = cited_references()
    dump("sources.json", {"data": sources, "references": refs})
    dump("headline.json", {"atlas": {k: s5[k] for k in ("programs", "institutions", "programs_with_total", "total_below_120", "total_exactly_120", "to_cut_for_90")},
                           "acce_accredited": s5["acce_accredited_bachelors_in_atlas"], "ansac": s5["abet_ansac_in_atlas"],
                           "states_any_action": rjson(A / "04_national_landscape/results/summary.json")["states_any_action"],
                           "budget_min": rjson(A / "02_whole_course_ledger/results/summary.json")["headline"]["budget_min"],
                           "budget_max": rjson(A / "02_whole_course_ledger/results/summary.json")["headline"]["budget_max"]})
    deep(refs)
    world()


# ---------------------------------------------------------------- 6 November 2026: UK and Hong Kong atlases
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
    Also the credits a year the module list shows (core and listed options) and the placement year's credits (the
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


# ---------------------------------------------------------------- 6 November 2026: the rebuilt paper (Modules 11 and 12)
MS = ROOT / "03_manuscript" / "_source"


def manuscript_modules():
    """the manuscript builder and its tables, so that the site shows the paper's own rows"""
    import sys
    sys.path.insert(0, str(MS))
    import _build_manuscript as B  # noqa: E402
    import _tables as T  # noqa: E402
    return B, T


def cited_references():
    """every reference the manuscript cites, with its APA entry and first link"""
    import re
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


def deep(refs):
    B, T = manuscript_modules()
    vals = B.load_values()
    link = {r["cite"]: r["url"] for r in refs}

    def ev(text, cite):
        return {"text": text, "cite": cite, "url": link.get(cite, "")}

    s12 = rjson(A / "12_skills_at_risk/results/summary.json")
    names = rjson(A / "01_case_and_peers_floors/results/program_names.json")
    moves = [r for r in rcsv(A / "12_skills_at_risk/results/moves_named.csv")]
    inputs = []
    for r in rcsv(A / "08_stakeholder_ledger/results/ledger_by_program.csv"):
        g, e1, gr = num(r["s_total_gain"]), num(r["earn_1yr"]), num(r["growth_1_to_4"])
        if isinstance(g, (int, float)) and g and isinstance(e1, (int, float)) and e1 and isinstance(gr, (int, float)):
            inputs.append([r["program_id"], e1, gr, g, r["institution"], r["program"], r["accreditation_group"]])
    dump("skills.json", {"by_order": s12["by_order"], "general_education_share_range": s12["general_education_share_range"],
                         "gen_ed_course_hours": s12["gen_ed_course_hours"], "transfer": s12["transfer"], "internships": s12["internships"],
                         "level_threshold": s12["level_threshold"], "lifecycle_threshold": s12["lifecycle_threshold"],
                         "thresholds_at_5pct": s12["thresholds_at_5pct"], "england_in_us_credits": s12["england_in_us_credits"],
                         "kept_by_redesign": s12["kept_by_redesign"], "first_step_at_or_under_90": s12["first_step_at_or_under_90"],
                         "names": names, "moves": [[m["code"], m["variant"], m["step"], m["action"], m["family"], m["course"], m["title"], num(m["hours"])] for m in moves],
                         "threshold_inputs": inputs, "assumptions": rjson(A / "08_stakeholder_ledger/results/summary.json")["assumptions"],
                         "construction_above_floor": rjson(A / "01_case_and_peers_floors/results/summary.json")["headline"]["construction_above_floor"]})

    s11 = rjson(A / "11_advisor_survey/results/summary.json")
    dump("survey.json", {"summary": s11, "counts": rcsv(A / "11_advisor_survey/results/answer_counts.csv"),
                         "note": "Anonymous five-question survey of the industry advisors of one accredited construction management program, October 2026; answer counts only."})

    s7 = rjson(A / "07_international/results/summary.json")
    ee = s12["england_in_us_credits"]
    abroad_ctx = [
        {"system": "England, Wales and Northern Ireland",
         "before": [ev("Compulsory schooling ends at 16; students then study a narrow range of subjects, normally three or four, an outlier internationally", "Hodgen et al., 2010")],
         "during": [ev(f"360 credits in three years; {s7['uk_three_year']} of {s7['uk_records']} CIOB-accredited construction programs take three years and {s7['uk_placement_available']} offer a placement year", "CIOB, 2026"),
                    {"text": f"On paper, discipline modules and projects come to about {round(ee['discipline_and_projects'])} U.S.-credit equivalents of learning hours (10 notional hours a UK credit, 45 a U.S. credit)", "cite": "", "url": ""}],
         "after": [ev("RICS: with less than five years of experience, 24 months (400 days) of structured training before the final assessment", "Royal Institution of Chartered Surveyors [RICS], 2026"),
                   ev("CIOB chartership: at least three years of relevant experience after a built-environment degree", "Chartered Institute of Building [CIOB], n.d.")]},
        {"system": "Continental Europe (Bologna)",
         "before": [],
         "during": [ev("180 ECTS (three years) is the most widespread first-cycle workload", "European Commission et al., 2024")],
         "after": [ev("In Bavaria 81% of university bachelor’s graduates go on to a master’s", "Bayerisches Staatsinstitut für Hochschulforschung und Hochschulplanung [IHF], 2017"),
                   ev("In the Netherlands 11% of graduates left with a university bachelor’s as the final award", "Centraal Bureau voor de Statistiek [CBS], 2019")]},
        {"system": "Hong Kong",
         "before": [ev("Under the old structure only about a third of students reached the last two school years; since 2012 all receive six years of secondary schooling", "Education and Manpower Bureau, 2005")],
         "during": [ev(f"The University of Hong Kong’s BSc in Surveying grew from {s7['hku_reform']['three_year_credits']} to {s7['hku_reform']['four_year_credits']} credits: {s7['hku_reform']['added_common_core']} Common Core, {s7['hku_reform']['added_language']} language, {s7['hku_reform']['added_professional']} professional", "University of Hong Kong, 2012"),
                    ev("In 2026-27 the same degree requires six credits of AI literacy beside 36 of Common Core", "University of Hong Kong, 2026")],
         "after": []},
        {"system": "United States",
         "before": [ev("Nearly 2.5 million high school students took a dual enrollment course in 2022-23; Black students were 8% of dual enrollment against 13% of undergraduates", "Fink, 2024")],
         "during": [{"text": "120 credits in four years for every construction program read, general education inside the degree", "cite": "", "url": ""},
                    ev("Earlier three-year paths, mostly 120 credits compressed into three years, drew 2% to 19% of students", "Weinstein, 2018")],
         "after": [ev("Certified Construction Manager: no degree required; an accredited construction degree accompanies 48 months of responsible-in-charge experience, any other four-year degree 72", "Construction Manager Certification Institute [CMCI], 2026"),
                   ev("Graduate admissions officers almost unanimously would not take domestic applicants with fewer than 120 credits, though most were reconsidering; most employers in one university’s survey would treat three-year degrees as equal", "Marcus, 2026")]},
    ]
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
        ev("Texas construction employers ranked ethics, teamwork, accountability, written and oral communication as graduates’ top five competencies", "Bigelow et al., 2015"),
        ev("Recruiters in a national survey rated ethics highest and communication near the bottom of 14 competencies", "Ahn et al., 2012"),
        ev("The shortage contractors report is in experienced salaried roles such as superintendents and project managers", "Associated General Contractors of America & NCCER, 2026"),
        ev("Lower-division credits cost less to teach than upper-division ones ($188 against $275 per credit hour in Florida’s public universities; Johnson, 2009)", "Romano et al., 2010"),
        ev("Instructional cost per credit ranges from mathematics at 25% below English to electrical engineering at 90% above", "Hemelt et al., 2021"),
        ev("High school graduates peak in 2025 and fall about 13% by 2041", "Lane et al., 2024"),
        ev("Adults with credit for prior learning completed credentials at 49% against 27%, and generated more tuition", "Klein-Collins et al., 2020"),
        ev("A department that embedded technical writing in five engineering courses ran it by co-teaching with a writing instructor", "McCall & Rayess, 2021"),
    ]
    rows_of = lambda t: {"title": t[0].split("<!--")[0].strip(), "rows": t[1], "notes": t[2]}
    dump("paper.json", {"abroad": abroad_ctx, "ai_evidence": ai_ev, "people": people,
                        "strategies": rows_of(T.TABLES["recommendations"](vals)), "ledger_table": rows_of(T.TABLES["ledger"](vals)),
                        "ai_counts": {"tool_hours": s12["by_order"]["general education first"]["redesign first"]["tool_hours"],
                                      "total_hours": s12["by_order"]["general education first"]["redesign first"]["total_hours"]},
                        "exposure": rjson(A / "10_ai_curriculum/results/summary.json")["exposure"]})


if __name__ == "__main__":
    main()
