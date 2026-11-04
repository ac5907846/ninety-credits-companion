"""Build the JSON files the companion web app reads (05_web_app/data/) from the saved results in 02_analysis/.
No number is typed here: every value is read from a results file. Run after any module rerun."""
import gzip
import json
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
A = HERE.parent / "02_analysis"
OUT = HERE / "data"
OUT.mkdir(exist_ok=True)
SHORT = {"Polytechnic University of Puerto Rico-Orlando": "Polytechnic PR, Orlando", "University of North Florida": "North Florida",
         "University of Central Florida": "Central Florida", "Florida Gulf Coast University": "Florida Gulf Coast",
         "Florida Institute of Technology": "Florida Tech", "University of Miami": "Miami",
         "Florida Agricultural and Mechanical University": "Florida A&M", "Florida Atlantic University": "Florida Atlantic",
         "Florida International University": "Florida International", "Florida State University": "Florida State",
         "University of Florida": "Florida", "University of South Florida": "South Florida", "University of West Florida": "West Florida",
         "Everglades University": "Everglades", "Seminole State College of Florida": "Seminole State"}
FIELD = {"construction management": "CM", "civil": "Civil", "construction technology": "CET"}


def summary(m):
    return json.load(open(A / m / "results/summary.json", encoding="utf-8"))


def dump(name, obj):
    s = json.dumps(obj, separators=(",", ":"), ensure_ascii=False, default=lambda x: None if (isinstance(x, float) and np.isnan(x)) else (x.item() if hasattr(x, "item") else str(x)))
    (OUT / name).write_text(s, encoding="utf-8")
    print(f"{name:16s} {len(s) / 1024:7.0f} KB")


def clean(v):
    if isinstance(v, float) and np.isnan(v):
        return None
    return v


def records(df, cols):
    return [[clean(x) for x in row] for row in df[cols].itertuples(index=False, name=None)]


# ---------------------------------------------------------------- headline numbers
s15, s16, s17, s18, s22, s23, s24 = (summary(m) for m in ["15_curriculum_milp", "16_student_rdm", "17_system_rdm", "18_ai_futures", "22_policy_scenarios", "23_scenario_atlas", "24_gen_ed_overlap"])
s01, s06, s10, s08, s14 = (summary(m) for m in ["01_program_universe", "06_catalog_credits", "10_civil_catalog_and_ledger", "08_stakeholder_ledger", "14_policy_and_debate"])
head = {
    "built": "4 November 2026",
    "institutions": s01["institutions"], "acce_institutions": s01["institutions_acce_bachelors"],
    "civil_institutions": summary("07_civil_universe_outcomes")["institutions"],
    "catalog_programs_with_total": s06.get("institutions_with_total"), "exactly_120": s06.get("share_exactly_120"), "median_to_cut": s06["median_to_cut"],
    "civil_with_total": s10["with_total"], "civil_median_to_cut": s10["median_to_cut"], "civil_total_median": s10["total_median"],
    "gen_ed_median": s06["gen_ed_median"], "free_electives_median": s06["free_electives_median"],
    "m15": s15["ms"], "m16": {k: s16[k] for k in ["construction", "civil"]}, "m16_ranges": s16.get("ranges"),
    "m17": {k: s17[k] for k in ["us_construction", "fl_construction", "us_civil", "fl_civil"]},
    "m18": s18["ms"], "m22": {k: v for k, v in s22["ms"].items() if not k.startswith("grid_")}, "m23": {k: v for k, v in s23["ms"].items() if not k.startswith("cell_")},
    "m24": s24["ms"], "news_relevant": s14.get("news_relevant"), "news_2026": s14.get("news_2026"),
}
dump("headline.json", head)

# ---------------------------------------------------------------- Module 15: Florida floors and state floors
d = pd.read_csv(A / "15_curriculum_milp/results/milp_florida_programs.csv")
d = d[d.feasible]
d["short"] = d.institution.map(SHORT).fillna(d.institution)
d["fld"] = d.field.map(FIELD)
d["struct"] = d.gen_ed_structure.map({"typical university": "typical", "Florida legal minimum": "minimum"})
floors = {"programs": records(d, ["UNITID", "short", "institution", "fld", "group", "published_total", "design", "gen_ed", "struct", "college_ready", "min_credits", "terms_load15", "in_3_years_load15", "in_3_years_load18"]),
          "columns": ["unitid", "short", "institution", "field", "group", "published", "design", "gen_ed", "structure", "ready", "credits", "terms15", "three_years_15", "three_years_18"]}
st = pd.read_csv(A / "24_gen_ed_overlap/results/state_floors_business_counted.csv")
nat = pd.read_csv(A / "15_curriculum_milp/results/national_cm_floor.csv")
nprog = nat.groupby("STABBR").size()
st["programs"] = st.state_abbr.map(nprog).fillna(0).astype(int)
floors["states"] = records(st, ["state", "state_abbr", "G", "G_used", "floor_cm", "floor_cm_business_counted", "floor_cm_louisiana", "floor_civil_min", "floor_civil_typical", "reduced_credit_status", "programs"])
floors["state_columns"] = ["state", "abbr", "gen_ed", "gen_ed_used", "floor_cm", "floor_cm_business", "floor_cm_louisiana", "floor_civil_min", "floor_civil_typical", "status", "programs"]
bind = pd.read_csv(A / "15_curriculum_milp/results/milp_binding_rules.csv")
bind["short"] = bind.UNITID.map(d.drop_duplicates("UNITID").set_index("UNITID").short)
floors["binding"] = records(bind, ["UNITID", "short", "field", "floor", "without_gen_ed", "without_accreditor_floors", "not_ready_entrant"])
dump("floors.json", floors)

# ---------------------------------------------------------------- Module 24: overlap and the lever
led = pd.read_csv(A / "24_gen_ed_overlap/results/overlap_by_program.csv")
led["short"] = led.institution.map(SHORT).fillna(led.institution)
led["fld"] = led.field.map(FIELD)
lev = pd.read_csv(A / "24_gen_ed_overlap/results/lever_business_as_gen_ed.csv")
dif = pd.read_csv(A / "24_gen_ed_overlap/results/list_versus_rule.csv")
crs = pd.read_csv(A / "24_gen_ed_overlap/results/overlap_courses.csv")
crs = crs[crs.counted_in_keep_solution | (crs.on_official_list == True)]  # noqa: E712
overlap = {"ledger": records(led, ["UNITID", "short", "fld", "group", "official_list", "gen_ed_credits", "mathematics and science", "economics or business", "communication", "other required course", "general education only", "from_required_total", "shared_with_accreditor_floor", "required_on_list", "required_on_list_credits"]),
           "ledger_columns": ["unitid", "short", "field", "group", "official", "counted", "math_science", "econ_business", "communication", "other", "ge_only", "from_required", "shared_floor", "on_list_n", "on_list_credits"],
           "lever": records(lev, ["UNITID", "field", "gen_ed", "regime", "min_credits", "counted_as_gen_ed"]),
           "differences": records(dif, ["institution", "field", "code", "title", "credits", "change", "rule_area", "list_area"]),
           "courses": records(crs, ["UNITID", "field", "code", "title", "credits", "kind", "list_area", "state_core", "counted_in_keep_solution"])}
lists = pd.concat([pd.read_csv(f, dtype=str) for f in sorted((HERE.parent / "01_raw_data/policy").glob("gen_ed_lists_*_2026-27.csv"))]).fillna("")
overlap["list_counts"] = lists.groupby(["university", "area"]).size().reset_index(name="n").values.tolist()
overlap["business_on_lists"] = lists[lists.prefix.isin(["ACG", "FIN", "MAN", "BUL", "GEB", "MAR", "QMB", "ENT", "ECO"])][["university", "code", "title", "area", "state_core_area"]].values.tolist()
dump("overlap.json", overlap)

# ---------------------------------------------------------------- Module 22: the policy grid and FGCU money
sc = pd.read_csv(A / "22_policy_scenarios/results/scenario_results.csv")
sc = sc[sc.feasible]
sc["short"] = sc.institution.map(SHORT).fillna(sc.institution)
sc["fld"] = sc.field.map(FIELD)
sc["rec"] = sc.recognition.astype(int)
policy = {"columns": ["unitid", "short", "field", "published", "design", "merge", "recognition", "gen_ed", "major_cap", "floor_share", "credits"],
          "rows": records(sc, ["UNITID", "short", "fld", "published", "design", "merge", "rec", "gen_ed", "major_as_gen_ed_cap", "floor_share", "min_credits"])}
lg = pd.read_csv(A / "22_policy_scenarios/results/ledger_per_graduate.csv")
lg = lg[(lg.UNITID == 433660) & lg.feasible]
lg["fld"] = lg.field.map(FIELD)
lg["rec"] = lg.recognition.astype(int)
policy["fgcu_money_columns"] = ["field", "design", "merge", "recognition", "gen_ed", "major_cap", "floor_share", "credits", "pricing", "funding", "student", "institution", "state"]
policy["fgcu_money"] = records(lg, ["fld", "design", "merge", "rec", "gen_ed", "major_as_gen_ed_cap", "floor_share", "min_credits", "pricing", "state_funding", "student", "institution", "state"])
policy["gen_ed_levels"] = json.load(open(A / "22_policy_scenarios/parameters.json", encoding="utf-8"))["gen_ed"]
lm = pd.read_csv(A / "22_policy_scenarios/results/lever_main_effects.csv")
policy["lever_main_effects"] = records(lm, ["field", "lever", "level", "share_reaching_90", "runs"])
dump("policy.json", policy)

# ---------------------------------------------------------------- Module 23: atlas
rc = pd.read_csv(A / "23_scenario_atlas/results/reach_by_cell.csv")
rc["fld"] = rc.field.map(FIELD)
rc["state_rec"] = rc.state_rec.astype(int)
stt = pd.read_csv(A / "23_scenario_atlas/results/story_table.csv")
money = pd.read_csv(A / "23_scenario_atlas/results/story_money_all_rules.csv")
money["fld"] = money.field.map(FIELD)
atlas = {"cells_columns": ["field", "merge", "ai", "ai_literacy", "state", "state_rec", "accreditor", "programs", "reach_90", "median_credits"],
         "cells": records(rc, ["fld", "merge", "ai", "ai_literacy", "state", "state_rec", "accreditor", "programs", "reach_90", "median_credits"]),
         "stories": stt.to_dict("records"),
         "story_money_columns": ["story", "field", "pricing", "funding", "credits_cut", "student", "institution", "state"],
         "story_money": records(money, ["story", "fld", "pricing", "state_funding", "credits_cut", "student", "institution", "state"]),
         "lever_main_effects": records(pd.read_csv(A / "23_scenario_atlas/results/lever_main_effects.csv"), ["field", "lever", "level", "share_reaching_90", "runs"]) if "field" in pd.read_csv(A / "23_scenario_atlas/results/lever_main_effects.csv").columns else []}
dump("atlas.json", atlas)

# ---------------------------------------------------------------- Module 16: the student
student = {}
for fld in ["construction", "civil"]:
    f = pd.read_csv(gzip.open(A / f"16_student_rdm/results/futures_{fld}.csv.gz", "rt"))
    g = f.median_gain_per_graduate
    edges = np.linspace(np.floor(g.quantile(.002) / 10000) * 10000, np.ceil(g.quantile(.998) / 10000) * 10000, 61)
    hist, _ = np.histogram(g, bins=edges)
    # gain conditional on the entry penalty, in 25 bins
    pen_edges = np.linspace(f.entry_penalty.min(), f.entry_penalty.max(), 26)
    f["pbin"] = pd.cut(f.entry_penalty, pen_edges, labels=False, include_lowest=True)
    cond = f.groupby("pbin").median_gain_per_graduate.agg(["median", lambda x: x.quantile(.1), lambda x: x.quantile(.9), lambda x: float((x < 0).mean())])
    cond.columns = ["median", "p10", "p90", "share_lose"]
    fade_edges = np.linspace(f.penalty_fade.min(), f.penalty_fade.max(), 13)
    f["fbin"] = pd.cut(f.penalty_fade, fade_edges, labels=False, include_lowest=True)
    grid = f.groupby(["pbin", "fbin"]).median_gain_per_graduate.apply(lambda x: float((x < 0).mean())).unstack().values
    prog = pd.read_csv(A / f"16_student_rdm/results/programs_{fld}.csv")
    student[fld] = {"summary": s16[fld], "hist_edges": edges.round(0).tolist(), "hist": hist.tolist(),
                    "penalty_edges": pen_edges.round(4).tolist(), "conditional": cond.round(1).values.tolist(),
                    "fade_edges": fade_edges.round(4).tolist(), "lose_grid": np.round(grid, 3).tolist(),
                    "programs_columns": ["unitid", "name", "state", "total", "credits_cut", "earn_1yr", "per_credit", "grads", "gain_p10", "gain_median", "gain_p90", "share_lose"],
                    "programs": records(prog, ["UNITID", "INSTNM", "STABBR", "total_semester", "k", "earn_1yr", "per_credit_in_state", "grads", "gain_p10", "gain_median", "gain_p90", "share_futures_lose"])}
student["ranges"] = s16.get("ranges")
dump("student.json", student)

# ---------------------------------------------------------------- Module 17: the system
yb = pd.read_csv(A / "17_system_rdm/results/yearly_bands.csv")
system = {"bands_columns": ["region", "field", "series", "year", "p10", "p50", "p90"], "bands": records(yb, ["region", "field", "series", "year", "p10", "p50", "p90"]),
          "summary": {k: s17[k] for k in ["us_construction", "fl_construction", "us_civil", "fl_civil"]}, "ranges": s17.get("ranges")}
dump("system.json", system)

# ---------------------------------------------------------------- Module 18: AI
caf = pd.read_csv(A / "18_ai_futures/results/curriculum_ai_floors.csv")
caf["short"] = caf.institution.map(SHORT).fillna(caf.institution)
caf["fld"] = caf.field.map(FIELD)
ai = {"ms": s18["ms"], "ranges": s18.get("ranges"), "credit_share_by_type": s18.get("credit_share_by_type"), "curriculum": s18.get("curriculum"),
      "ledger": {k: v for k, v in s18.items() if "|" in k},
      "floors_columns": ["unitid", "short", "field", "scope", "recognition", "floor", "gen_ed", "p10", "median", "p90", "share_le90"],
      "floors": records(caf, ["UNITID", "short", "fld", "scope", "recognition", "floor", "gen_ed", "ai_floor_p10", "ai_floor_median", "ai_floor_p90", "share_futures_at_or_below_90"])}
dump("ai.json", ai)

# ---------------------------------------------------------------- programs on the map (longitude and latitude from IPEDS)
pu = pd.read_csv(A / "01_program_universe/results/program_universe.csv", dtype={"UNITID": int})
mp = pd.read_csv(A / "09_program_map/results/map_points.csv")
lon = next((c for c in pu.columns if c.upper().startswith("LONGITUD")), None)
lat = next((c for c in pu.columns if c.upper().startswith("LATITUDE")), None)
if lon and lat:
    mp = mp.merge(pu[["UNITID", lon, lat]].drop_duplicates("UNITID"), on="UNITID", how="left").rename(columns={lon: "lon", lat: "lat"})
    nat2 = nat[["UNITID", "floor_cm"]]
    mp = mp.merge(nat2, on="UNITID", how="left")
    dump("programs.json", {"columns": ["unitid", "name", "state", "program", "group", "acce", "total", "grads_2024", "lon", "lat", "floor_cm"],
                           "rows": records(mp, ["UNITID", "INSTNM", "STABBR", "program", "program_group", "acce_bachelors", "total_semester", "grads_2024", "lon", "lat", "floor_cm"])})
else:
    print("no coordinates found; programs.json not written")

# ---------------------------------------------------------------- hero tour: the 20 atlas programs through the twelve stories
ar = pd.read_csv(A / "23_scenario_atlas/results/atlas_results.csv.gz")
ar["state"] = ar.state.astype(str)
ar["state_rec"] = ar.state_rec.astype(str).str.lower() == "true"
stt = pd.read_csv(A / "23_scenario_atlas/results/story_table.csv")
m15 = pd.read_csv(A / "15_curriculum_milp/results/milp_florida_programs.csv")
progs = ar[["UNITID", "institution", "field", "published"]].drop_duplicates().sort_values(["field", "institution"]).reset_index(drop=True)
progs["short"] = progs.institution.map(SHORT).fillna(progs.institution)
progs["fld"] = progs.field.map(FIELD)
keep = m15[(m15.design == "KEEP") & (m15.gen_ed == 36) & (m15.gen_ed_structure == "typical university") & m15.college_ready]
keep_of = {(r.UNITID, r.field): r.min_credits for r in keep.itertuples()}
stages = [{"key": "published", "title": "Published today", "sub": "The 20 Florida programs as their 2025 to 2027 catalogs print them", "credits": [clean(x) for x in progs.published]},
          {"key": "keep", "title": "Required core kept", "sub": "Every required course stays, electives go, 36 credits of general education filled with the cheapest eligible courses (Module 15)",
           "credits": [clean(keep_of.get((r.UNITID, r.field))) for r in progs.itertuples()]}]
for s in stt.itertuples():
    sub = ar[(ar.state == str(s.state)) & (ar.state_rec == bool(s.state_rec)) & (ar.accreditor == s.accreditor) & (ar["merge"] == s.merge) & (ar.ai == s.ai) & (ar.ai_literacy == int(s.ai_literacy))]
    of = {(r.UNITID, r.field): (r.min_credits if r.feasible else None) for r in sub.itertuples()}
    stages.append({"key": "story:" + s.story, "title": s.story, "state": str(s.state), "state_rec": bool(s.state_rec), "accreditor": s.accreditor, "merge": s.merge, "ai": s.ai, "ai_literacy": int(s.ai_literacy),
                   "credits": [clean(of.get((r.UNITID, r.field))) for r in progs.itertuples()]})
dump("hero.json", {"programs": records(progs, ["UNITID", "short", "fld", "published"]), "program_columns": ["unitid", "short", "field", "published"], "stages": stages})

# ---------------------------------------------------------------- sources: the verified references of the manuscript, with their links
refs = []
for f in sorted((HERE.parent / "03_manuscript/_source").glob("references_*.json")):
    for r in json.load(open(f, encoding="utf-8")):
        if r.get("in_list", True):
            refs.append({"cite": r["cite"], "apa": r["apa"].replace("*", ""), "url": r.get("url", ""), "type": r.get("type", ""), "group": f.stem.replace("references_", ""), "checks": len(r.get("checks", []))})
refs.sort(key=lambda r: r["apa"].lower())
dump("sources.json", {"references": refs, "note": "Every reference was verified two or three times against the source before it was cited (checks counted per entry)."})

# ---------------------------------------------------------------- result files copied beside the page, so every chart can be traced to its module
import shutil
RES = OUT / "results"
RES.mkdir(exist_ok=True)
COPY = [("15_curriculum_milp", ["summary.json", "milp_florida_programs.csv", "milp_binding_rules.csv", "state_floors.csv", "national_cm_floor.csv", "national_civil_floor.csv", "milp_plans_ge36.csv"]),
        ("24_gen_ed_overlap", ["summary.json", "overlap_by_program.csv", "overlap_courses.csv", "list_versus_rule.csv", "lever_business_as_gen_ed.csv", "state_floors_business_counted.csv"]),
        ("22_policy_scenarios", ["summary.json", "lever_main_effects.csv", "threshold_by_program.csv", "fgcu_syllabus_repetition.csv"]),
        ("23_scenario_atlas", ["summary.json", "story_table.csv", "story_money_all_rules.csv", "reach_by_cell.csv", "lever_main_effects.csv", "atlas_results.csv.gz"]),
        ("16_student_rdm", ["summary.json", "programs_used.csv", "sobol_construction_median_gain.csv", "sobol_civil_median_gain.csv"]),
        ("17_system_rdm", ["summary.json", "yearly_bands.csv", "yearly_change_by_accreditor_year.csv"]),
        ("18_ai_futures", ["summary.json", "curriculum_ai_floors.csv", "credit_share_by_type.csv", "floor_plans_typed.csv"])]
manifest = []
for m, files in COPY:
    (RES / m).mkdir(exist_ok=True)
    for fn in files:
        src = A / m / "results" / fn
        if src.exists():
            shutil.copy2(src, RES / m / fn)
            manifest.append({"module": m, "file": fn, "path": f"data/results/{m}/{fn}", "bytes": src.stat().st_size})
for fn in ["gen_ed_lists_sus_2026-27.csv", "gen_ed_lists_fcs_2026-27.csv"]:
    src = HERE.parent / "01_raw_data/policy" / fn
    (RES / "policy").mkdir(exist_ok=True)
    shutil.copy2(src, RES / "policy" / fn)
    manifest.append({"module": "01_raw_data/policy", "file": fn, "path": f"data/results/policy/{fn}", "bytes": src.stat().st_size})
dump("files.json", {"files": manifest, "data_files": ["headline", "hero", "floors", "overlap", "policy", "atlas", "student", "system", "ai", "programs", "sources", "files"]})

# ---------------------------------------------------------------- study.json: the data behind the study (descriptive statistics) and how the models are set up
s01b, s06b, s07b, s10b, s14b = (summary(m) for m in ["01_program_universe", "06_catalog_credits", "07_civil_universe_outcomes", "10_civil_catalog_and_ledger", "14_policy_and_debate"])
ip = pd.read_csv(A / "01_program_universe/results/ipeds_construction_bachelors_2014_2024.csv")
ip_year = ip.groupby("year").CTOTALT.sum().reset_index()
cv_year = pd.read_csv(A / "07_civil_universe_outcomes/results/civil_national_by_year.csv")
pu = pd.read_csv(A / "01_program_universe/results/program_universe.csv")
by_state = pu.groupby("STABBR").agg(institutions=("UNITID", "nunique"), grads_2024=("grads_2024", "sum"), acce=("acce_bachelors", lambda x: int(x.fillna(False).astype(bool).sum()))).reset_index().sort_values("institutions", ascending=False)
cat = pd.read_csv(A / "06_catalog_credits/results/catalog_programs.csv")
cat_cols = [c for c in ["INSTNM", "STABBR", "program", "program_group", "catalog_year", "total_semester", "gen_ed", "math_science", "business", "major", "free_electives", "acce_bachelors", "confidence"] if c in cat.columns]
tot = cat[cat.total_semester.notna()] if "total_semester" in cat.columns else cat
bind = pd.read_csv(A / "15_curriculum_milp/results/milp_binding_rules.csv")
m15 = pd.read_csv(A / "15_curriculum_milp/results/milp_florida_programs.csv")
comp = m15[(m15.gen_ed == 36) & (m15.gen_ed_structure == "typical university") & m15.college_ready]
comp = comp.assign(short=comp.institution.map(SHORT).fillna(comp.institution), fld=comp.field.map(FIELD))
params = {}
for m in ["16_student_rdm", "17_system_rdm", "18_ai_futures"]:
    p = json.load(open(A / m / "parameters.json", encoding="utf-8"))
    params[m] = {"n_futures": p.get("n_futures"), "n_sobol_base": p.get("n_sobol_base"), "ranges": p.get("ranges"), "sources": p.get("sources"), "neutral": p.get("neutral"), "status": p.get("status")}
study = {
    "universe": {"institutions": s01b["institutions"], "acce_bachelors": s01b["institutions_acce_bachelors"], "programs_by_cip": s01b["programs_by_cip"], "by_state_top": s01b["institutions_by_state_top"],
                 "by_state": records(by_state, ["STABBR", "institutions", "grads_2024", "acce"]), "by_state_columns": ["state", "institutions", "grads_2024", "acce"],
                 "cm_grads_by_year": records(ip_year, ["year", "CTOTALT"]), "civil_grads_by_year": records(cv_year, ["year", "CTOTALT", "women_share"]),
                 "civil": {k: s07b.get(k) for k in ["institutions", "grads_2014", "grads_2024", "change_pct_2014_2024", "women_share_2024", "earn_1yr", "debt", "median_program_size_2024"]}},
    "catalogs": {"cm": {k: s06b.get(k) for k in ["programs", "institutions_with_total", "total_median", "total_p10", "total_p90", "total_min", "total_max", "share_over_120", "share_exactly_120", "median_to_cut", "gen_ed_median", "math_science_median", "business_median", "major_median", "free_electives_median", "share_with_free_electives", "acce_total_median", "nonacce_total_median", "confidence", "credit_systems", "programs_with_total_count", "over_120_count", "exactly_120_count"]},
                 "cm_totals_distribution": pd.read_csv(A / "06_catalog_credits/results/totals_distribution.csv").to_dict("records"),
                 "cm_by_group": pd.read_csv(A / "06_catalog_credits/results/by_program_group.csv").to_dict("records"),
                 "cm_blocks": pd.read_csv(A / "06_catalog_credits/results/blocks.csv").to_dict("records"),
                 "cm_programs": records(tot, cat_cols), "cm_program_columns": cat_cols,
                 "civil": {k: s10b.get(k) for k in ["institutions", "with_total", "total_median", "total_p10", "total_p90", "exactly_120_count", "over_120_count", "below_120_count", "share_over_120", "median_to_cut", "distribution", "gen_ed_median", "math_science_median", "engineering_median", "three_year_mentions"]},
                 "civil_blocks": pd.read_csv(A / "10_civil_catalog_and_ledger/results/civil_blocks.csv").to_dict("records")},
    "discourse": {"news_by_year": pd.read_csv(A / "14_policy_and_debate/results/news_by_year_stance.csv").to_dict("records"),
                  "state_status": pd.read_csv(A / "14_policy_and_debate/results/state_policy_status.csv").to_dict("records"),
                  "voices": pd.read_csv(A / "14_policy_and_debate/results/voices_by_type_stance.csv").to_dict("records"),
                  "actors": s14b.get("news_actor_2024_2026"), "news_relevant": s14b.get("news_relevant"), "news_2026": s14b.get("news_2026"), "peak_month": s14b.get("news_peak_month"), "peak_count": s14b.get("news_peak_count"),
                  "states_with_statewide_gen_ed": s14b.get("states_with_statewide_gen_ed"), "gen_ed_median": s14b.get("gen_ed_median"), "events_total": s14b.get("events_total"), "events_2026": s14b.get("events_2026")},
    "florida_model": {"programs": s15.get("programs"), "construction_programs": s15.get("construction_programs"), "civil_programs": s15.get("civil_programs"),
                      "binding": records(bind, list(bind.columns)), "binding_columns": list(bind.columns),
                      "composition": records(comp, ["UNITID", "short", "fld", "design", "published_total", "min_credits", "gen_ed_only", "ms", "eng", "con", "bm", "topics_kept", "courses"]),
                      "composition_columns": ["unitid", "short", "field", "design", "published", "credits", "gen_ed_only", "math_science", "engineering", "construction", "business", "topics_kept", "courses"],
                      "policy_grid": {k: s22["ms"].get(k) for k in ["programs", "solves"]}, "atlas": {k: s23["ms"].get(k) for k in ["programs", "solves", "combinations", "rows"]}},
    "parameters": params,
}
dump("study.json", study)
