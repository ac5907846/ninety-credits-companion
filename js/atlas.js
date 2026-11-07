/* Page 1: the atlas of U.S. construction bachelor's programs. */
window.Atlas = (function () {
  const { load, $, esc, n, money, k, share, dec, median, rows, table, plot, ACC, accTag, isNum } = window.U;
  // the state’s verified action on bachelor’s degrees below 120 credits, 6 November 2026 (Table S1 of the article)
  const STATUS = { programs: ["a reduced-credit program approved at a public university", "#3182BD"], rule: ["a rule or pilot policy, no public program found", "#9ECAE1"],
                   proposal: ["a proposal, bill or study", "#EFF3FF"], none: ["no action found", "#FFFFFF"] };
  const TYPE_LABEL = { technical: "technical foundations", judgment: "professional judgment", digital_tool: "digital tool operation", field_procedure: "field procedures",
                       math_science: "mathematics and science", breadth: "communication and breadth", integrative: "capstone or work-integrated", other: "elective or other" };
  let P = [], S = [], C = null, CLS = [], NMOD = 0, sel = { acc: new Set(), group: new Set(), control: new Set(), state: "", q: "" }, stateIdx = {};

  function chips(el, values, set, colorOf) {
    $(el).innerHTML = values.map(([v, lab, col]) => `<span class="chip" data-v="${esc(v)}">${col ? `<span class="dot" style="background:${col}"></span>` : ""}${esc(lab)}</span>`).join("");
    $(el).querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { const v = c.dataset.v; set.has(v) ? set.delete(v) : set.add(v); c.classList.toggle("on"); update(); }));
  }
  function filtered() {
    const q = sel.q.trim().toLowerCase();
    return P.filter((p) => (!sel.acc.size || sel.acc.has(p.accreditation_group)) && (!sel.group.size || sel.group.has(p.group)) && (!sel.control.size || sel.control.has(p.control))
      && (!sel.state || p.state === sel.state) && (!q || `${p.institution} ${p.program} ${p.city}`.toLowerCase().includes(q)));
  }
  function tiles(F) {
    const tot = F.map((p) => p.total_semester).filter(isNum);
    const t = [
      [n(F.length), `programs at ${n(new Set(F.map((p) => p.unitid)).size)} institutions`],
      [tot.length ? n(Math.min(...tot)) : "", `fewest credits asked (${n(tot.length)} with a total)`],
      [n(median(tot)), "median total credits"],
      [n(median(F.map((p) => p.gen_ed))), `median general education block (${n(F.filter((p) => isNum(p.gen_ed)).length)} report it)`],
      [money(median(F.filter((p) => p.control === "public").map((p) => p.tuition_fees_in_state_2023_24))), "median in-state tuition and fees, public, 2023-24"],
      [money(median(F.map((p) => p.earn_1yr))), "median earnings a year after completion"],
    ];
    $("tiles").innerHTML = t.map(([v, kk]) => `<div class="tile"><div class="v">${v || "n/a"}</div><div class="k">${kk}</div></div>`).join("");
  }
  function map(F) {
    const z = S.map((s) => Object.keys(STATUS).indexOf(s.class));
    const scale = Object.values(STATUS).map((v, i, a) => [[i / a.length, v[1]], [(i + 1) / a.length, v[1]]]).flat();
    const choro = { type: "choropleth", locationmode: "USA-states", locations: S.map((s) => s.state), z, zmin: 0, zmax: Object.keys(STATUS).length,
      colorscale: scale, showscale: false, marker: { line: { color: "#7a7a7a", width: .6 } },
      text: S.map((s) => `<b>${esc(s.name)}</b><br>Verified action: ${esc(STATUS[s.class][0])}<br>Count a public reduced-credit degree must carry: ${s.binding_count != null ? n(s.binding_count) + " semester hours" : "none"} (${esc(s.count_source)})<br>Accredited or applicant programs: ${s.programs} (${s.modeled} modeled)`),
      hovertemplate: "%{text}<extra></extra>" };
    $("atlas-map-legend").innerHTML = Object.values(STATUS).map(([lab, col]) => `<span class="lg"><span class="sw" style="background:${col}"></span>${esc(lab)}</span>`).join("");
    const pts = ACC.map(([g, lab, col]) => {
      const G = F.filter((p) => p.accreditation_group === g && isNum(p.lat));
      return { type: "scattergeo", locationmode: "USA-states", lat: G.map((p) => p.lat), lon: G.map((p) => p.lon), mode: "markers", name: lab,
        marker: { size: G.map((p) => 5 + Math.sqrt(p.degrees_2024 || 4)), color: col, line: { color: "#222", width: .6 }, opacity: .92 },
        text: G.map((p) => `<b>${esc(p.institution)}</b><br>${esc(p.program)}<br>Total: ${p.total_semester != null ? p.total_semester + " semester credits" : "not published"}<br>Accreditation: ${esc(lab)}<br>Bachelor’s degrees in 2024: ${p.degrees_2024 ?? "not separately reported"}`),
        customdata: G.map((p) => p.program_id), hovertemplate: "%{text}<extra></extra>" };
    });
    plot("atlas-map", [choro, ...pts], { geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: false, bgcolor: "white" }, margin: { l: 0, r: 0, t: 0, b: 0 },
      showlegend: true, legend: { orientation: "h", y: -.02, x: 0, font: { size: 11 } } });
    const el = $("atlas-map");
    el.removeAllListeners && el.removeAllListeners("plotly_click");
    el.on("plotly_click", (e) => { const id = e.points[0].customdata; if (id) card(P.find((p) => p.program_id === id)); });
  }
  function hist(F) {
    const xs = Array.from(new Set(F.map((p) => isNum(p.total_semester) ? Math.round(p.total_semester) : null).filter((x) => x != null))).sort((a, b) => a - b);
    const tr = ACC.map(([g, lab, col]) => ({ type: "bar", name: lab, x: xs, y: xs.map((x) => F.filter((p) => p.accreditation_group === g && Math.round(p.total_semester) === x).length), marker: { color: col, line: { color: "#333", width: .4 } }, hovertemplate: `${lab}: %{y} programs at %{x} credits<extra></extra>` }));
    plot("atlas-hist", tr, { barmode: "stack", xaxis: { title: { text: "semester credit hours" }, range: [88, 138], dtick: 10 }, yaxis: { title: { text: "programs" } },
      shapes: [{ type: "line", x0: 90, x1: 90, yref: "paper", y0: 0, y1: 1, line: { dash: "dot", color: "#000", width: 1.2 } }],
      annotations: [{ x: 90, yref: "paper", y: 1, text: "90", showarrow: false, xanchor: "left", font: { size: 11 } }] });
  }
  function blocks(F) {
    const B = [["free_electives", "free electives"], ["business", "business"], ["math_science", "mathematics and science"], ["major", "major"], ["gen_ed", "general education"]];
    plot("atlas-blocks", B.map(([kk, lab]) => { const G = F.filter((p) => isNum(p[kk])); return { type: "box", x: G.map((p) => p[kk]), text: G.map((p) => esc(p.institution)), name: lab, boxpoints: "all", jitter: .45, pointpos: 0, orientation: "h", hoveron: "points",
      marker: { size: 3, color: "#555", opacity: .55 }, line: { color: "#333", width: 1 }, fillcolor: "#eef1f3", hovertemplate: `<b>%{text}</b><br>${lab[0].toUpperCase() + lab.slice(1)}: %{x} credits<extra></extra>` }; }),
      { margin: { l: 150, r: 14, t: 6, b: 34 }, xaxis: { title: { text: "credits in the block, as published" }, range: [-2, 82] } });
  }
  function tbl(F) {
    $("table-count").textContent = `(${F.length} shown)`;
    table("atlas-table", [
      { key: "institution", label: "Institution", tip: "The institution that awards the degree, as named in IPEDS." },
      { key: "state", label: "State", tip: "State of the campus, as a two-letter postal code." },
      { key: "program", label: "Program", tip: "The bachelor’s degree program as the catalog names it." },
      { key: "accreditation_group", label: "Accreditation", fmt: (v) => accTag(v), tip: "Programmatic accreditation: ACCE (American Council for Construction Education), ABET ANSAC (ABET’s Applied and Natural Science Accreditation Commission), both, an ACCE applicant or candidate, or neither. ACCE directory of 29 October 2026; ABET list of 6 November 2026." },
      { key: "total_semester", label: "Total credits", num: true, fmt: (v) => n(v, 1), tip: "Total semester credit hours the catalog requires for the degree. Quarter-hour catalogs are converted at two thirds. Blank where the catalog states no total." },
      { key: "gen_ed", label: "General education", num: true, fmt: (v) => n(v), tip: "Semester hours of general education (the institution’s core curriculum of writing, mathematics, science, humanities and social sciences) as the catalog publishes the block. Blank where the catalog does not state it." },
      { key: "major", label: "Major", num: true, fmt: (v) => n(v), tip: "Semester hours of the major or professional block as the catalog publishes it: construction, business and other required courses of the program. Blank where the catalog does not state it." },
      { key: "free_electives", label: "Free electives", num: true, fmt: (v) => n(v), tip: "Semester hours the student may take in any subject, as the catalog publishes them. Zero means the plan has no free electives." },
      { key: "state_gen_ed_min", label: "State or system count", num: true, fmt: (v) => n(v), tip: "The semester hours of general education a state or university system asks of a public reduced-credit bachelor’s degree at this institution, as the article codes it (verified 6 November 2026). Transfer blocks are not bachelor’s minimums. Blank for private institutions and where no state or system count applies." },
      { key: "binding_count", label: "Binding count", num: true, fmt: (v) => n(v), tip: "For accredited and applicant programs: the general education count a reduced-credit degree must carry here, the larger of the state or system count and the institutional accreditor’s, or the institution’s own core where neither applies, as the article codes it." },
      { key: "state_class", label: "State group, Fig. 1a", fmt: (v) => (v == null || !CLS[v] ? "" : esc(CLS[v].label)), tip: "The general education minimum that binds the state’s public universities, in the four groups of Fig. 1a of the article; institution-defined: no state or accreditor minimum." },
      { key: "modeled", label: "Modeled", fmt: (v) => (v ? "yes" : ""), tip: "An accredited or applicant program whose course list was complete enough for the integer program of the article." },
      { key: "degrees_2024", label: "Bachelor’s degrees, 2023-24", num: true, fmt: (v) => n(v), tip: "Bachelor’s degrees the program conferred in 2023-24 (IPEDS Completions), under its classification codes." },
    ], F, { onRow: card, sortKey: "institution" });
  }
  function update() { const F = filtered(); tiles(F); map(F); hist(F); blocks(F); tbl(F); }

  async function card(p) {
    if (!p) return;
    if (!C) C = await load("courses");
    const s = stateIdx[p.state] || {};
    const cs = C[p.program_id] || [];
    const link = (u, lab) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${lab}</a>` : "";
    const yes = (v) => v === "True" || v === true ? "yes" : v === "False" || v === false ? "no" : (v || "not stated");
    $("card").innerHTML = `<button class="close" id="card-close" type="button">Close</button>
      <h2>${esc(p.institution)}</h2><div class="muted">${esc(p.program)} (${esc(p.degree || "bachelor’s")}), ${esc(p.city)}, ${esc(p.state)}; ${esc(p.control)}; catalog ${esc(p.catalog_year || "")}</div>
      <div style="margin-top:6px">${accTag(p.accreditation_group)} ${p.acce_since ? `<span class="muted">ACCE since ${esc(p.acce_since)}</span>` : ""} ${p.abet_since ? `<span class="muted">ANSAC since ${esc(p.abet_since)}</span>` : ""}</div>
      <h4>Credits</h4><dl>
        <dt>Published total</dt><dd>${p.total_semester != null ? n(p.total_semester, 1) + " semester hours" : "not published"}${p.to_cut_for_90 != null ? `; ${n(p.to_cut_for_90, 1)} above 90` : ""}</dd>
        <dt>Blocks as published</dt><dd>general education ${p.gen_ed ?? "n/a"}; major ${p.major ?? "n/a"}; mathematics and science ${p.math_science ?? "n/a"}; business ${p.business ?? "n/a"}; free electives ${p.free_electives ?? "n/a"}</dd>
        <dt>Internship required</dt><dd>${yes(p.internship_required)}</dd><dt>Capstone required</dt><dd>${yes(p.capstone_required)}</dd>
        ${p.reduced_option ? `<dt>Shorter route mentioned</dt><dd>${esc(p.reduced_option)}</dd>` : ""}
      </dl>
      <h4>State rule (${esc(s.name || p.state)})</h4><dl>
        <dt>State group, Fig. 1a</dt><dd>${CLS[p.state_class] ? esc(CLS[p.state_class].label) : "not grouped"}</dd>
        <dt>In the integer program</dt><dd>${p.modeled ? "yes, one of the " + n(NMOD) + " modeled programs" : "no"}</dd>
        <dt>State or system count for a reduced-credit degree here</dt><dd>${p.state_gen_ed_min != null ? n(p.state_gen_ed_min) + " semester hours" : "none applies at this institution"}${s.basis ? `; ${esc(s.basis)}` : ""}</dd>
        ${p.binding_count != null ? `<dt>Count that binds this program</dt><dd>${n(p.binding_count)} semester hours; state group ${esc(p.state_group)}</dd>` : ""}
        <dt>Verified action, 6 November 2026</dt><dd>${esc(STATUS[s.class] ? STATUS[s.class][0] : "no action found")}${s.action ? `: ${esc(s.action)}` : ""}</dd></dl>
      <h4>Cost and outcomes</h4><dl>
        <dt>Tuition and fees, 2023-24</dt><dd>in-state ${money(p.tuition_fees_in_state_2023_24) || "n/a"}; out-of-state ${money(p.tuition_fees_out_state_2023_24) || "n/a"}</dd>
        <dt>Per-credit charge</dt><dd>in-state ${money(p.per_credit_in_state) || "n/a"}; out-of-state ${money(p.per_credit_out_state) || "n/a"}</dd>
        <dt>Bachelor’s degrees, 2024</dt><dd>${p.degrees_2024 ?? "not separately reported"}</dd>
        <dt>Median earnings</dt><dd>1 year ${money(p.earn_1yr) || "n/a"}; 4 years ${money(p.earn_4yr) || "n/a"}; median debt ${money(p.debt) || "n/a"}</dd>
</dl>
      <h4>Sources</h4><div class="links">${link(p.url_catalog, "Catalog page")} ${link(p.url_program, "Program page")} ${link(p.url_ipeds, "IPEDS College Navigator")} ${link(p.url_scorecard, "College Scorecard")} ${link(p.url_acce, "ACCE")} ${link(p.url_abet, "ABET")} ${link(p.url_state_gen_ed, "State general education rule")}</div>
      <p class="note">Catalog read ${esc(p.catalog_read_on || "29 October 2026")}; confidence ${esc(p.confidence || "")}.</p>
      <h4>Required courses (${cs.length})</h4><div class="tablewrap" style="max-height:none"><table class="data" id="card-courses"></table></div>`;
    table("card-courses", [{ key: "code", label: "Code" }, { key: "title", label: "Title" }, { key: "credits", label: "Credits", num: true, fmt: (v) => n(v, 1) },
      { key: "block", label: "Block" }, { key: "type", label: "Content type", fmt: (v) => esc(TYPE_LABEL[v] || v) }],
      cs.map(([code, title, credits, block, type]) => ({ code, title, credits, block, type })));
    $("card-back").hidden = false;
    $("card-close").onclick = () => { $("card-back").hidden = true; };
  }

  async function init() {
    const [A, ST] = await Promise.all([load("atlas"), load("states")]);
    P = rows(A); S = ST.states; S.forEach((s) => { stateIdx[s.state] = s; });
    const sm = A.summary;
    CLS = ST.classes; NMOD = ST.summary.programs_modeled;
    $("atlas-lede").innerHTML = `${n(sm.programs)} bachelor’s programs at ${n(sm.institutions)} institutions in ${n(sm.states_only)} states${sm.territories.includes("PR") ? " and Puerto Rico" : ""}; ${n(ST.summary.programs_accredited_or_applicant)} accredited or applicant programs, ${n(NMOD)} of them modeled.`;
    chips("f-acc", ACC.map(([g, lab, col]) => [g, lab, col]), sel.acc);
    chips("f-group", Object.keys(sm.by_group).map((g) => [g, g]), sel.group);
    chips("f-control", ["public", "private nonprofit", "private for-profit"].map((g) => [g, g]), sel.control);
    $("f-state").innerHTML += Array.from(new Set(P.map((p) => p.state))).sort().map((s) => `<option value="${s}">${s}</option>`).join("");
    $("f-state").onchange = (e) => { sel.state = e.target.value; update(); };
    $("f-q").oninput = (e) => { sel.q = e.target.value; update(); };
    $("f-reset").onclick = () => { sel = { acc: new Set(), group: new Set(), control: new Set(), state: "", q: "" }; document.querySelectorAll(".chip.on").forEach((c) => c.classList.remove("on")); $("f-state").value = ""; $("f-q").value = ""; init.rebind(); update(); };
    init.rebind = () => { chips("f-acc", ACC.map(([g, lab, col]) => [g, lab, col]), sel.acc); chips("f-group", Object.keys(sm.by_group).map((g) => [g, g]), sel.group); chips("f-control", ["public", "private nonprofit", "private for-profit"].map((g) => [g, g]), sel.control); };
    $("card-back").addEventListener("click", (e) => { if (e.target.id === "card-back") $("card-back").hidden = true; });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("card-back").hidden = true; });
    update();
  }
  return { init, card };
})();
