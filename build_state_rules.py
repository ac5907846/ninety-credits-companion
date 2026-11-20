"""Build data/state_rules.json: what the Requirements view shows when a state is opened (20 November 2026).

For each state and DC: the general education count a reduced-credit bachelor's degree must carry at a public university,
where the count comes from, the state's framework and its documents, the institutional accreditor's rule, and the
state's action on degrees below 120 credits.

Reads
  data/states.json                                                   the counts and classes the site already shows (Module 14)
  01_raw_data/policy/state_gen_ed.csv                                the first reading of each state's rules, 29 October 2026,
                                                                     with the addresses of the documents read
  01_raw_data/policy/state_gen_ed_corrections_2026-11-06.csv         the check of 6 November 2026: the count and its basis
  01_raw_data/policy/state_reduced_credit_verified_2026-11-06.csv    each state's verified action on degrees below 120 credits
  01_raw_data/policy/regional_reduced_credit_rules_2026-11-06.json   what each institutional accreditor asks of such a degree

The count and its basis are those of the check; the framework, the citations and the document addresses are those of
the first reading. Where the first reading coded another count, the file says so, so that a reader does not take the
older number for the rule. Working notes of the readings are not copied. The build stops if a word the article's
builder refuses is left in the file.
Run: python build_state_rules.py   (from 05_web_app)
"""
import ast
import csv
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
POL = ROOT / "01_raw_data" / "policy"
OUT = HERE / "data"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
SOURCE_OF = {"state": "a state or system rule", "accreditor": "the institutional accreditor", "institution": "each institution"}


def rcsv(p):
    with open(p, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def text(s):
    """house style for the site's own wording: the right single quote, and the hyphen for every dash"""
    s = re.sub(r"\s*\(hint: [^)]*\)", "", (s or "").strip()).replace("'", "’")   # a working remark of the first reading is not copied
    for d in ("‒", "–", "—", "―", "−"):
        s = s.replace(d, "-")
    return "".join(ch for ch in s if ch >= " ")


def date_text(iso):
    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", iso or "")
    if m:
        return f"{int(m.group(3))} {MONTHS[int(m.group(2)) - 1]} {m.group(1)}"
    m = re.fullmatch(r"(\d{4})-(\d{2})", iso or "")
    if m:
        return f"{MONTHS[int(m.group(2)) - 1]} {m.group(1)}"
    return text(iso)


def urls(*fields):
    out = []
    for f in fields:
        for u in (f or "").split(";"):
            u = u.strip()
            if u.startswith("http") and u not in out:
                out.append(u)
    return out


def whole(v):
    if v in ("", None):
        return None
    x = float(v)
    return int(x) if x.is_integer() else x


S = json.load(open(OUT / "states.json", encoding="utf-8"))
first = {r["state_abbr"]: r for r in rcsv(POL / "state_gen_ed.csv")}
corr = {r["state_abbr"]: r for r in rcsv(POL / "state_gen_ed_corrections_2026-11-06.csv")}
ver = {r["state_abbr"]: r for r in rcsv(POL / "state_reduced_credit_verified_2026-11-06.csv")}
reg = json.load(open(POL / "regional_reduced_credit_rules_2026-11-06.json", encoding="utf-8"))
accr = {v["short"]: dict(v, name=k) for k, v in reg["accreditors"].items()}
assert len(S["states"]) == 51

out = {"read_on": {"first": "29 October 2026", "check": "6 November 2026", "accreditors": date_text(reg["read_on"])}, "states": {}}
for s in S["states"]:
    ab = s["state"]
    f, c, v = first[ab], corr[ab], ver[ab]
    assert f["retrieved"] == "2026-10-29", (ab, f["retrieved"])
    old = whole(f["gen_ed_min_semester_credits"])
    a = accr.get(s["institutional_accreditor"])
    assert a or not s["institutional_accreditor"], (ab, s["institutional_accreditor"])
    if a and s["accreditor_min"] is not None:
        assert a["general_education_min"] == s["accreditor_min"], ab
    out["states"][ab] = {
        "name": s["name"], "class": S["class_of_state"][ab], "count": s["binding_count"], "count_from": SOURCE_OF[s["count_source"]],
        "state_min": s["state_min"], "basis": text(c["basis"]), "overlap_rule": text(c["overlap_rule"]),
        "earlier_count": old if old is not None and old != s["state_min"] else None,
        "scope": text(f["scope"]), "framework": text(f["gen_ed_framework"]), "legal_basis": text(f["gen_ed_legal_basis"]),
        "credit_rule": text(f["credit_cap_or_min_rule"]), "credit_citation": text(f["credit_rule_citation"]),
        "documents": urls(f["source_url_gen_ed"], f["source_url_credit_rule"]),
        "accreditor": None if not a else {"short": a["short"], "name": a["name"], "min": a["general_education_min"], "route": text(a["route"]), "basis": text(a["basis"])},
        "action_class": s["class"], "action_label": s["class_label"], "action": text(v["action"]), "action_date": date_text(v["date"]),
        "action_note": text(v["note"]), "action_documents": urls(f["source_url_reduced_credit"]),
        "programs": s["programs"], "public": s["public"],
    }

blob = json.dumps(out, ensure_ascii=False)
bad = []
MSB = ROOT / "03_manuscript" / "_source" / "_build_manuscript.py"   # the article's builder holds the words no shared file may carry
if MSB.exists():
    for node in ast.parse(MSB.read_text(encoding="utf-8")).body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", "") == "CONFIDENTIAL" for t in node.targets):
            if re.search(node.value.args[0].value, blob, re.I):
                bad.append("a word the article's builder refuses")
            break
    else:
        sys.exit("refused: the article's builder no longer names its refused words; check before building")
worded = re.sub(r'https?://[^"\s]+', "", blob)        # an address stays as its site wrote it
for m in re.finditer("[‒–—―−']", worded):
    bad.append("a dash other than the hyphen, or a straight apostrophe: " + ascii(worded[max(0, m.start() - 50):m.end() + 20]))
if bad:
    sys.exit("refused: " + "; ".join(bad))
json.dump(out, open(OUT / "state_rules.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
st = out["states"].values()
print(f"data/state_rules.json: {(OUT / 'state_rules.json').stat().st_size / 1024:.0f} KB; {len(out['states'])} states; "
      f"with a count {sum(1 for x in st if x['count'] is not None)}; with rule documents {sum(1 for x in st if x['documents'])}; "
      f"with action documents {sum(1 for x in st if x['action_documents'])}; earlier count differs in {sum(1 for x in st if x['earlier_count'] is not None)}")
