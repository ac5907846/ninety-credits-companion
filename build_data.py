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
    dump("sources.json", sources)
    dump("headline.json", {"atlas": {k: s5[k] for k in ("programs", "institutions", "programs_with_total", "total_below_120", "total_exactly_120", "to_cut_for_90")},
                           "acce_accredited": s5["acce_accredited_bachelors_in_atlas"], "ansac": s5["abet_ansac_in_atlas"],
                           "states_any_action": rjson(A / "04_national_landscape/results/summary.json")["states_any_action"],
                           "budget_min": rjson(A / "02_whole_course_ledger/results/summary.json")["headline"]["budget_min"],
                           "budget_max": rjson(A / "02_whole_course_ledger/results/summary.json")["headline"]["budget_max"]})


if __name__ == "__main__":
    main()
