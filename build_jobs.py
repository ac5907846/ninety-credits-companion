"""Build data/jobs.json for the Jobs view of the companion site (20 November 2026).

Reads results files only, and writes nothing else:
  02_analysis/25_posting_descriptives/results/postings_described.csv   one row per unique U.S. posting (Module 25)
  02_analysis/25_posting_descriptives/results/summary.json             the counts the article prints
  02_analysis/25_posting_descriptives/results/sources_by_list.csv      the public lists the employers were drawn from
  02_analysis/25_posting_descriptives/results/sources_by_system.csv    the career-site systems read
  02_analysis/25_posting_descriptives/description_rules.json           role family and level labels, collection date
  02_analysis/20_job_postings/results/postings_clean.csv               the address of every posting (url)
  01_raw_data/job_postings_2026-11/frame/frame_*.csv                   each employer's career site and list address
  01_raw_data/job_postings_2026-11/raw/<system>/<employer>/manifest.csv  when each posting was read, and the SHA-256 of its saved copy

Every posting keeps the address it was read from, so a row on the site leads back to its source. No posting text is
copied to the site: the title, the employer, the state, the dates and the coded fields only.

No university is named outside the atlases (decisions 31 and 32; Table S1 of the supplement follows the same rule): a
university capital projects office appears under a neutral label and its addresses are withheld; its list and its
career-site system still show, and its posting titles are withheld too, because several of them name the
university. The build stops if a word the article's builder refuses, or a university name, is left in the
file.

build_data.py is not touched and not run: it rebuilds the other views from the manuscript source, which now holds a
later version of the article than the site shows.
Run: python build_jobs.py   (from 05_web_app)
"""
import ast
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

csv.field_size_limit(10 ** 9)
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
R20 = ROOT / "02_analysis" / "20_job_postings" / "results"
M25 = ROOT / "02_analysis" / "25_posting_descriptives"
R25 = M25 / "results"
FRAME = ROOT / "01_raw_data" / "job_postings_2026-11" / "frame"
OUT = HERE / "data"

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
UNIVERSITY = re.compile(r"\b(University|College)\b")
MASK = "A public university’s capital projects office"
TYPE_ORDER = ["Builder", "Design or EPC firm", "CM consultancy", "Public owner", "Developer"]
REGION_ORDER = ["Northeast", "Midwest", "South", "West", "Not stated"]
# the public lists, as Module 25 names them (describe.py LISTS): a part of the list address, the label
LISTS = [("bdcnetwork.com/home/news/55316393", "BD+C Top 150 contractors, 2025"),
         ("bdcnetwork.com/home/news/55332428", "BD+C Top 80 construction management firms, 2025"),
         ("Construction_and_civil_engineering_companies", "Wikipedia category of U.S. construction and civil engineering companies"),
         ("2026-Top-50-Program-Management", "ENR Top 50 program management firms, 2026 preview"),
         ("2026-Top-400-Contractors", "ENR Top 400 contractors, 2026 preview"),
         ("2025-Top-600-Specialty", "ENR Top 600 specialty contractors, 2025 preview"),
         ("2025-Top-400-Contractors", "ENR Top 400 contractors, 2025 preview"),
         ("2025-Top-100-Construction-Management-for-Fee", "ENR Top 100 construction-management-for-fee firms, 2025 preview"),
         ("builderonline.com/builder-100", "Builder 100 homebuilders"),
         ("nmhc.org", "NMHC top 25 apartment developers"),
         ("transportation.org", "State transportation departments (AASHTO members)"),
         ("apta.com", "Public transit agencies (APTA members)"),
         ("aapa-ports.org", "Port authorities (AAPA members)"),
         ("aci-na.org", "Airports (ACI-NA members)"),
         ("amwa.net", "Water utilities (AMWA members)"),
         ("usajobs.gov", "Federal construction agencies (USAJOBS)"),
         ("nces.ed.gov/programs/digest", "Large public school districts (NCES Digest)"),
         ("nces.ed.gov/ipeds", "Public university systems (IPEDS)")]


def rcsv(p):
    with open(p, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def curly(s):
    return s.replace("'", "’") if isinstance(s, str) else s


def clean(s):
    return "".join(ch for ch in (s or "") if ch >= " ").strip()


def date_text(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {MONTHS[m - 1]} {y}"


def intish(v):
    return None if v in ("", None) else int(round(float(v)))


def amount(v):
    """pay as the results file holds it, with its decimals, so that a median on the site is rounded once"""
    if v in ("", None):
        return None
    x = round(float(v), 2)
    return int(x) if x.is_integer() else x


def list_of(url):
    for key, lab in LISTS:
        if key in (url or ""):
            return lab
    raise SystemExit(f"a list address without a label: {url!r}")


rules = json.loads((M25 / "description_rules.json").read_text(encoding="utf-8"))
summ = json.loads((R25 / "summary.json").read_text(encoding="utf-8"))
P = rcsv(R25 / "postings_described.csv")
url_of = {r["posting_id"]: r["url"] for r in rcsv(R20 / "postings_clean.csv")}
frame = {}
for f in rcsv(FRAME / "frame_A_general_contractors.csv") + rcsv(FRAME / "frame_B_other_segments.csv"):
    frame.setdefault(f["employer"], f)

assert len(P) == summ["unique"], (len(P), summ["unique"])
assert all(url_of.get(r["posting_id"], "").startswith("http") for r in P), "a posting without its address"
assert sum(r["in_entry_level"] == "1" for r in P) == summ["entry"]
assert sum(r["in_analysis_set"] == "1" for r in P) == summ["analysis"]
assert all(r["employer"] in frame for r in P), sorted({r["employer"] for r in P} - set(frame))[:5]

# ---------------------------------------------------------------- the saved copy of each posting: time read and fingerprint
RAWP = ROOT / "01_raw_data" / "job_postings_2026-11" / "raw"
saved = {}
for m in sorted(RAWP.glob("*/*/manifest.csv")):
    for r in rcsv(m):
        saved[f"{m.parent.parent.name}:{m.parent.name}:{r['posting_id']}"] = r
DAY = rules["days_since_posted"]["collection_date"]
for r in P:
    s = saved.get(r["posting_id"])
    assert s and s["url"] == url_of[r["posting_id"]], r["posting_id"]
    assert len(s["sha256"]) == 64 and s["fetched_utc"].startswith(DAY + "T") and s["fetched_utc"].endswith("Z"), r["posting_id"]

# ---------------------------------------------------------------- labels, in the order of the article's tables
FAMS = rules["role_families"]["families"]
FORDER = ["R_PE", "R_APM", "R_SUPER", "R_EST", "R_SCHED", "R_VDC", "R_SAFETY", "R_INTERN", "R_OTHER",
          "X_PM", "X_SUPER", "X_EXEC", "X_QUALITY", "X_ADMIN", "D_DESIGN", "X_TECH", "X_OUTSIDE", "X_OTHER"]
flabel = {f["id"]: f["label"] for f in FAMS}
fgroup = {f["id"]: f["group"] for f in FAMS}
assert set(FORDER) == set(flabel) == {r["role_family"] for r in P}
roles = [{"id": k, "label": curly(flabel[k]), "group": curly(fgroup[k])} for k in FORDER]
# the level rules of description_rules.json, worded for a reader who has not seen the rule file
SITE_RULE = {"L_ENTRY_TITLE": "entry level because a title rule fired",
             "L_ENTRY_EXP": "entry level because the text asks 0 to 3 years of experience and names a bachelor’s degree, and the title carries a construction word",
             "L_SENIOR": "not entry level; the title carries a senior word such as senior, lead, principal, director or project executive",
             "L_0_3": "not entry level and no senior title; the lowest years of experience the text asks are 0 to 3",
             "L_4_7": "the lowest years of experience the text asks are 4 to 7",
             "L_8_UP": "the lowest years of experience the text asks are 8 or more",
             "L_NA": "the text states no years of experience"}
assert set(SITE_RULE) == {o["id"] for o in rules["levels"]["order"]}
levels = [{"id": o["id"], "label": curly(o["label"]), "rule": SITE_RULE[o["id"]]} for o in rules["levels"]["order"]]
assert {o["id"] for o in levels} == {r["level"] for r in P}
assert {r["employer_type"] for r in P} <= set(TYPE_ORDER) and {r["region"] for r in P} <= set(REGION_ORDER)

systems_rows = rcsv(R25 / "sources_by_system.csv")
sys_label = {r["system_key"]: curly(r["system"]) for r in systems_rows if r["system_key"]}
vendors = sorted({r["vendor"] for r in P}, key=lambda v: -sum(1 for r in P if r["vendor"] == v))
assert set(vendors) <= set(sys_label), set(vendors) - set(sys_label)

# ---------------------------------------------------------------- lists and employers
list_url = {}
for f in frame.values():
    list_url.setdefault(list_of(f["list_source_url"]), f["list_source_url"])
lists = []
for r in rcsv(R25 / "sources_by_list.csv"):
    assert r["list"] in list_url, r["list"]
    lists.append({"list": curly(r["list"]), "url": list_url[r["list"]], "in_frame": int(r["employers_in_frame"]), "read": int(r["employers_read"]),
                  "with_postings": int(r["employers_with_postings"]), "unique": int(r["unique"]), "entry": int(r["entry"]),
                  "analysis": int(r["analysis"])})
list_idx = {l["list"]: i for i, l in enumerate(lists)}
assert sum(l["unique"] for l in lists) == summ["unique"] and sum(l["analysis"] for l in lists) == summ["analysis"]

n_by_emp = Counter(r["employer"] for r in P)
type_of = {r["employer"]: r["employer_type"] for r in P}
emp_names = sorted(n_by_emp, key=lambda e: (-n_by_emp[e], e))
employers, emp_idx, masked = [], {}, set()
for e in emp_names:
    f = frame[e]
    hide = bool(UNIVERSITY.search(e))
    if hide:
        masked.add(e)
    emp_idx[e] = len(employers)
    employers.append({"name": MASK if hide else curly(e), "type": type_of[e], "careers": "" if hide else clean(f["careers_url"]),
                      "list": list_idx[curly(list_of(f["list_source_url"]))], "masked": hide})

# ---------------------------------------------------------------- postings
COLS = ["title", "employer", "state", "role", "level", "posted", "days", "pay_low", "pay_high", "set", "system", "url", "id", "read"]
role_idx = {k: i for i, k in enumerate(FORDER)}
level_idx = {o["id"]: i for i, o in enumerate(levels)}
vendor_idx = {v: i for i, v in enumerate(vendors)}
rows = []
for r in P:
    hide = r["employer"] in masked
    s = 2 if r["in_analysis_set"] == "1" else 1 if r["in_entry_level"] == "1" else 0
    rows.append(["" if hide else clean(r["title"]), emp_idx[r["employer"]], r["state"], role_idx[r["role_family"]], level_idx[r["level"]],
                 r["posted_date"], intish(r["days_since_posted"]), amount(r["pay_low"]), amount(r["pay_high"]), s,
                 vendor_idx[r["vendor"]], "" if hide else url_of[r["posting_id"]], "" if hide else r["posting_id"],
                 saved[r["posting_id"]]["fetched_utc"][11:19]])   # the time of day, UTC, on the collection date
assert sum(1 for r in rows if r[9] == 2) == summ["analysis"] and sum(1 for r in rows if r[9] >= 1) == summ["entry"]

systems = [{"system": curly(r["system"]), "group": curly(r["group"]), "read": r["read"] == "1",
            "employers": intish(r["employers_read"]) if r["read"] == "1" else intish(r["employers_in_frame"]),
            "with_postings": intish(r["employers_with_postings"]), "listed": intish(r["listed"]), "fetched": intish(r["fetched"]),
            "unique": intish(r["unique"]), "entry": intish(r["entry"]), "analysis": intish(r["analysis"])} for r in systems_rows]

out = {
    "collected": date_text(rules["days_since_posted"]["collection_date"]),
    "collected_iso": DAY,
    "summary": {k: summ[k] for k in ("frame_employers", "employers_read", "employers_with_postings", "listed", "fetched", "unique", "entry",
                                     "analysis", "analysis_employers", "unique_states", "listing_systems")},
    "roles": roles, "levels": levels, "types": TYPE_ORDER, "regions": REGION_ORDER,
    "systems": [sys_label[v] for v in vendors], "lists": lists, "systems_table": systems, "employers": employers,
    "masked_postings": sum(n_by_emp[e] for e in masked), "masked_employers": len(masked),
    "columns": COLS, "rows": rows,
}

# ---------------------------------------------------------------- refusals
text = json.dumps(out, ensure_ascii=False)
labels = json.dumps({k: v for k, v in out.items() if k != "rows"}, ensure_ascii=False)   # what this build words itself
bad = []
MSB = ROOT / "03_manuscript" / "_source" / "_build_manuscript.py"   # the article's builder holds the words no shared file may carry
if MSB.exists():
    for node in ast.parse(MSB.read_text(encoding="utf-8")).body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "CONFIDENTIAL" for t in node.targets):
            if re.search(node.value.args[0].value, text, re.I):
                bad.append("a word the article's builder refuses")
            break
    else:
        sys.exit("refused: the article's builder no longer names its refused words; check before building")
for e in masked:   # a masked employer must leave no trace: its name, its site, its posting addresses
    host = re.sub(r"^https?://(www\.)?", "", frame[e]["careers_url"]).split("/")[0]
    if e in text or (host and host in text):
        bad.append(f"masked employer left in the file: {e}")
if any(UNIVERSITY.search(x["name"].replace(MASK, "")) for x in employers):
    bad.append("a university name among the employers")
if re.search("[\u2012\u2013\u2014\u2015\u2212]", labels):   # posting titles are source text and stay as read
    bad.append("a dash other than the hyphen in the labels")
if "'" in labels:
    bad.append("a straight apostrophe in the labels")
if bad:
    sys.exit("refused: " + "; ".join(bad))

json.dump(out, open(OUT / "jobs.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
# the fingerprints sit in a file of their own, in the order of the rows, read only when a record or the table is asked for
prints = {"algorithm": "SHA-256", "of": "the saved copy of each posting, as fetched", "rows": [saved[r["posting_id"]]["sha256"] for r in P]}
assert len(prints["rows"]) == len(rows)
json.dump(prints, open(OUT / "jobs_fingerprints.json", "w", encoding="utf-8"), separators=(",", ":"))
print(f"data/jobs_fingerprints.json: {(OUT / 'jobs_fingerprints.json').stat().st_size / 1024:.0f} KB")
print(f"data/jobs.json: {(OUT / 'jobs.json').stat().st_size / 1024:.0f} KB; {len(rows):,} postings, {len(employers)} employers, "
      f"{len(lists)} lists, {len(vendors)} systems; {out['masked_postings']} postings of {len(masked)} university offices without addresses")
print("titles of other employers that name a university or college, kept as read (career fairs, new college graduates):",
      sum(1 for r in rows if UNIVERSITY.search(r[0])))
