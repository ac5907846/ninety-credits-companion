"""Build data/regions.json: the regions drawn under the UK, Hong Kong and Australia atlases (20 November 2026).

Reads (01_raw_data/international/boundaries_2026-11-20/, README there; read as data, nothing in them is run)
  ITL1_JAN_2025_UK_BUC.geojson                 the 12 International Territorial Level 1 regions of the UK, January 2025,
                                               ultra generalised (Office for National Statistics, Open Geography Portal)
  geoBoundaries-AUS-ADM1_simplified.geojson    the states and territories of Australia (Australian Bureau of Statistics,
                                               2021, through geoBoundaries)
  hksar_18_district_boundary.json              the 18 districts of Hong Kong (Home Affairs Department, through DATA.GOV.HK)
and the campus points of data/uk.json, data/au.json and data/hk.json.

Writes data/regions.json: for each atlas the region outlines, thinned for a web map, and the region each program's
campus point falls in, so that the site can count the programs shown in each region. Thinning: shared borders are
simplified together, so neighbors still meet; islands below a small area are left out of the drawing (they stay in the
test of which region a point falls in). A point outside every region (a campus on reclaimed land or a pier) takes the
nearest region within 3 km.

Checks: every UK program's region lies in the country its record states; every Australian program's region is the
state its record states.
Run: python -I build_regions.py   (from 05_web_app)
"""
import json
import sys
from pathlib import Path

import shapely
from shapely.geometry import Point, mapping, shape

HERE = Path(__file__).resolve().parent
RAW = HERE.parent / "01_raw_data" / "international" / "boundaries_2026-11-20"
OUT = HERE / "data"

SETS = {
    "uk": dict(file="ITL1_JAN_2025_UK_BUC.geojson", name="ITL125NM", tol=.004, min_km2=4, digits=3, unit="region",
               source="Regions: International Territorial Level 1, January 2025, generalised. Source: Office for National Statistics licensed under the Open Government Licence v.3.0. Contains OS data © Crown copyright and database right 2025.",
               url="https://geoportal.statistics.gov.uk/"),
    "au": dict(file="geoBoundaries-AUS-ADM1_simplified.geojson", name="shapeName", tol=.012, min_km2=60, digits=3, unit="state or territory",
               drop={"Other Territories"},
               source="States and territories: Australian Bureau of Statistics, 2021, through geoBoundaries (CC BY 4.0).",
               url="https://www.geoboundaries.org/"),
    "hk": dict(file="hksar_18_district_boundary.json", name="District", tol=.0004, min_km2=.05, digits=4, unit="district",
               source="Districts: Home Affairs Department, Hong Kong SAR Government, Administrative District Boundary, through DATA.GOV.HK.",
               url="https://data.gov.hk/en-data/dataset/hk-had-json1-hong-kong-administrative-boundaries"),
}
UK_COUNTRY = {"Scotland": "Scotland", "Wales": "Wales", "Northern Ireland": "Northern Ireland"}      # every other region is in England
AU_STATE = {"New South Wales": "NSW", "Victoria": "VIC", "Queensland": "QLD", "South Australia": "SA", "Western Australia": "WA",
            "Tasmania": "TAS", "Northern Territory": "NT", "Australian Capital Territory": "ACT"}
KM_PER_DEG = 111.32


def km2(poly):
    """area of a polygon in square kilometers, near enough for a threshold (degrees scaled at the polygon's latitude)"""
    import math
    return poly.area * KM_PER_DEG ** 2 * math.cos(math.radians(poly.centroid.y))


def thin(geoms, tol, min_km2):
    try:
        out = list(shapely.coverage_simplify(geoms, tol))
        how = "shared borders simplified together"
    except Exception as e:      # the regions do not form a clean coverage: simplify each alone
        out = [g.simplify(tol, preserve_topology=True) for g in geoms]
        how = f"each region simplified alone ({type(e).__name__})"
    kept = []
    for g in out:
        parts = [p for p in (g.geoms if g.geom_type == "MultiPolygon" else [g]) if not p.is_empty]
        big = [p for p in parts if km2(p) >= min_km2] or [max(parts, key=lambda p: p.area)]
        kept.append(shapely.MultiPolygon(big) if len(big) > 1 else big[0])
    return kept, how


def rounded(geom, digits):
    def r(c):
        return [round(c[0], digits), round(c[1], digits)] if isinstance(c[0], (int, float)) else [r(x) for x in c]
    m = mapping(geom)
    return {"type": m["type"], "coordinates": r(json.loads(json.dumps(m["coordinates"])))}


out = {}
for key, cfg in SETS.items():
    src = json.load(open(RAW / cfg["file"], encoding="utf-8"))
    feats = [f for f in src["features"] if f["properties"][cfg["name"]] not in cfg.get("drop", set())]
    names = [f["properties"][cfg["name"]].replace(" (England)", "").replace(" District", "") for f in feats]
    full = [shapely.make_valid(shape(f["geometry"])) for f in feats]
    thinned, how = thin(full, cfg["tol"], cfg["min_km2"])
    order = sorted(range(len(names)), key=lambda i: names[i])
    names, full, thinned = [names[i] for i in order], [full[i] for i in order], [thinned[i] for i in order]

    programs = json.load(open(OUT / f"{key}.json", encoding="utf-8"))["programs"]
    assign, far = {}, []
    for p in programs:
        if p.get("lat") is None:
            continue
        pt = Point(p["lon"], p["lat"])
        hit = [i for i, g in enumerate(full) if g.covers(pt)]
        if not hit:
            d = [g.distance(pt) * KM_PER_DEG for g in full]
            i = min(range(len(d)), key=d.__getitem__)
            if d[i] > 3:
                far.append((p["id"], round(d[i], 1)))
                continue
            hit = [i]
        assign[p["id"]] = hit[0]
        if key == "uk":
            assert UK_COUNTRY.get(names[hit[0]], "England") == p["country"], (p["id"], names[hit[0]], p["country"])
        if key == "au":
            assert AU_STATE[names[hit[0]]] == p["state"], (p["id"], names[hit[0]], p["state"])
    if far:
        sys.exit(f"{key}: campus points more than 3 km from every region: {far}")
    out[key] = {"unit": cfg["unit"], "source": cfg["source"], "url": cfg["url"], "names": names, "assign": assign,
                "geojson": {"type": "FeatureCollection", "features": [
                    {"type": "Feature", "id": i, "properties": {"name": nm}, "geometry": rounded(g, cfg["digits"])}
                    for i, (nm, g) in enumerate(zip(names, thinned))]}}
    print(f"{key}: {len(names)} {cfg['unit']} outlines, {how}; {len(assign)} of {len(programs)} programs placed"
          f" ({len(programs) - len(assign)} without a campus point); regions with a program: {len(set(assign.values()))}")

json.dump(out, open(OUT / "regions.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"data/regions.json: {(OUT / 'regions.json').stat().st_size / 1024:.0f} KB")
