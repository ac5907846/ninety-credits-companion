/* Companion web app: every number is read from data/*.json, written by build_data.py from the analysis results. */
(function () {
  "use strict";
  const C = { navy: "#0072B2", orange: "#E69F00", green: "#3B7A2A", greenLight: "#E3F0DD", red: "#C0504D", grey: "#9A9A9A", ink: "#1f2a37",
              blue: "#D4EBF2", pink: "#EAD1DC", mint: "#D9EAD3", gray: "#BFBFBF" };
  const FONT = { family: "Segoe UI, system-ui, Helvetica, Arial, sans-serif", size: 13, color: C.ink };
  const CFG = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"] };
  const cache = {};
  const $ = (id) => document.getElementById(id);
  const fmtK = (v) => (v == null ? "" : (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : (v / 1e3).toFixed(0) + "k"));
  const money = (v) => (v == null ? "" : (v < 0 ? "−" : "") + "$" + fmtK(Math.abs(v)));
  const pct = (v, d = 0) => (v == null ? "" : (100 * v).toFixed(d) + "%");
  const num = (v, d = 0) => (v == null ? "" : Number(v).toLocaleString("en-US", { maximumFractionDigits: d }));
  const base = (over) => Object.assign({ font: FONT, paper_bgcolor: "white", plot_bgcolor: "white", margin: { l: 60, r: 20, t: 30, b: 50 }, hoverlabel: { font: FONT } }, over);

  function load(name) {
    if (!cache[name]) cache[name] = fetch("data/" + name).then((r) => r.json());
    return cache[name];
  }
  function toObjects(rows, cols) { return rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]]))); }
  function table(el, head, rows, opts = {}) {
    const h = "<thead><tr>" + head.map((c, i) => `<th class="${opts.num && opts.num.includes(i) ? "n" : ""}">${c}</th>`).join("") + "</tr></thead>";
    const b = "<tbody>" + rows.map((r) => `<tr class="${r.hit ? "hit" : ""}">` + r.cells.map((c, i) => `<td class="${opts.num && opts.num.includes(i) ? "n" : ""}">${c == null ? "" : c}</td>`).join("") + "</tr>").join("") + "</tbody>";
    el.innerHTML = h + b;
  }
  const GROUP_ORDER = { "Construction management": 0, "Construction engineering technology": 1, "Civil engineering": 2 };
  const GROUP_LABEL = { "Construction management": "Construction management (ACCE)", "Construction engineering technology": "Construction engineering technology (ABET ETAC)", "Civil engineering": "Civil engineering (ABET EAC)" };

  // ---------------------------------------------------------------- hero tiles
  async function hero() {
    const h = await load("headline.json");
    const m15 = h.m15, m16 = h.m16, m17 = h.m17, m23 = h.m23, m24 = h.m24;
    const tiles = [
      [`${m23.story1_cm_reach_90} of 8`, "Florida construction management programs that fit 90 credits under today’s rules", "warn"],
      [`${m23.story1_cv_reach_90} of 12`, "Florida civil engineering programs that fit 90 credits under today’s rules", "warn"],
      [`${num(m24.fgcu_cm_from_required_total)} of 36`, "general education credits FGCU’s construction program fills with courses it requires anyway", ""],
      [money(m16.construction.zero_penalty_median_gain), "lifetime gain of the median construction graduate if employers pay no less", "good"],
      [pct(m17.us_construction.share_futures_institutions_lose), "of 20,000 futures in which institutions lose money (U.S. construction)", "warn"],
      [`${m15.states_cm_floor_le90} of 51`, "states whose construction management floor is 90 credits or fewer", ""],
    ];
    $("tiles").innerHTML = tiles.map(([v, l, k]) => `<div class="tile"><div class="v ${k}">${v}</div><div class="l">${l}</div></div>`).join("");
    $("built").textContent = h.built;
    const files = ["headline", "floors", "overlap", "policy", "atlas", "student", "system", "ai", "programs"];
    $("files").innerHTML = files.map((f) => `<li><a href="data/${f}.json">data/${f}.json</a></li>`).join("");
  }

  // ---------------------------------------------------------------- 1. can it fit
  async function fit() {
    const F = await load("floors.json");
    const P = toObjects(F.programs, F.columns);
    const draw = () => {
      const design = $("fit-design").value, ge = +$("fit-ge").value, struct = $("fit-struct").value, ready = $("fit-ready").value === "true";
      let rows = P.filter((r) => r.design === design && r.gen_ed === ge && r.structure === struct && r.ready === ready);
      const other = P.filter((r) => r.design === (design === "FLOOR" ? "KEEP" : "FLOOR") && r.gen_ed === ge && r.structure === struct && r.ready === ready);
      rows.sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || b.credits - a.credits);
      const y = rows.map((r) => `${r.short} (${r.field})`);
      const otherOf = (r) => { const o = other.find((x) => x.unitid === r.unitid && x.field === r.field); return o ? o.credits : null; };
      const traces = [
        { type: "scatter", mode: "markers", x: rows.map((r) => r.published), y, name: "Published total", marker: { symbol: "diamond", color: "black", size: 9 }, hovertemplate: "%{y}<br>published %{x} credits<extra></extra>" },
        { type: "scatter", mode: "markers", x: rows.map(otherOf), y, name: design === "FLOOR" ? "Required core kept" : "Accreditor floor", marker: { color: design === "FLOOR" ? C.orange : C.navy, size: 9, line: { color: "black", width: .5 } }, hovertemplate: "%{y}<br>%{x} credits<extra></extra>" },
        { type: "scatter", mode: "markers", x: rows.map((r) => r.credits), y, name: design === "FLOOR" ? "Accreditor floor" : "Required core kept", marker: { color: design === "FLOOR" ? C.navy : C.orange, size: 11, line: { color: "black", width: .5 } },
          text: rows.map((r) => `${r.terms15 ? r.terms15 + " regular terms at 15 credits; " : ""}three years at 15: ${r.three_years_15 ? "yes" : "no"}, at 18: ${r.three_years_18 ? "yes" : "no"}`), hovertemplate: "%{y}<br><b>%{x} credits</b><br>%{text}<extra></extra>" },
      ];
      const shapes = rows.map((r, i) => ({ type: "line", x0: Math.min(r.credits, r.published, otherOf(r) || r.credits), x1: Math.max(r.credits, r.published, otherOf(r) || r.credits), y0: y[i], y1: y[i], line: { color: C.grey, width: 1 } }));
      shapes.push({ type: "rect", x0: 40, x1: 90, y0: -1, y1: rows.length, yref: "y", fillcolor: C.greenLight, line: { width: 0 }, layer: "below" });
      shapes.push({ type: "line", x0: 90, x1: 90, y0: -1, y1: rows.length, line: { color: C.green, width: 1.5 } });
      Plotly.react("fit-chart", traces, base({ height: 640, xaxis: { title: "Semester credits", range: [40, 150], dtick: 10 }, yaxis: { autorange: "reversed", automargin: true, tickfont: { size: 12 } }, shapes, legend: { orientation: "h", y: -0.08 }, margin: { l: 10, r: 20, t: 20, b: 60 } }), CFG);
      const le90 = rows.filter((r) => r.credits <= 90);
      const byField = {};
      rows.forEach((r) => { byField[r.field] = byField[r.field] || [0, 0]; byField[r.field][1]++; if (r.credits <= 90) byField[r.field][0]++; });
      $("fit-note").textContent = `${design === "FLOOR" ? "At the accreditor floor" : "With the required core kept"}, ${ge} credits of general education, ${struct === "typical" ? "typical areas" : "Florida’s minimum areas"}, ${ready ? "college-ready" : "not-ready"} entrant: ` +
        Object.entries(byField).map(([f, [a, b]]) => `${a} of ${b} ${f} programs reach 90`).join("; ") + ". The 36-credit rule binds public institutions; Florida Tech, Miami, Everglades and the Polytechnic University of Puerto Rico are private.";
    };
    ["fit-design", "fit-ge", "fit-struct", "fit-ready"].forEach((id) => $(id).addEventListener("change", draw));
    draw();
    // the map
    const S = toObjects(F.states, F.state_columns);
    let pts = null;
    try { const G = await load("programs.json"); pts = toObjects(G.rows, G.columns).filter((p) => p.group === "Construction management" && p.lon != null); } catch (e) { pts = null; }
    const drawMap = () => {
      const rule = $("map-rule").value;
      const vals = S.map((s) => s[rule]);
      const traces = [{ type: "choropleth", locationmode: "USA-states", locations: S.map((s) => s.abbr), z: vals, zmin: 80, zmax: 105,
        colorscale: [[0, "#2E7D32"], [0.2, "#A5D6A7"], [0.4, "#FFE0B2"], [0.6, "#F4A261"], [0.8, "#C0504D"], [1, "#8B2E2B"]],
        text: S.map((s) => `${s.state}: general education ${s.gen_ed == null ? "no statewide number (counted at 30)" : s.gen_ed + " credits"}<br>${s.programs} construction management program${s.programs === 1 ? "" : "s"}<br>status: ${s.status}`),
        hovertemplate: "<b>%{location}</b> floor %{z} credits<br>%{text}<extra></extra>", colorbar: { title: "Floor", thickness: 12, len: .6 }, marker: { line: { color: "white", width: .5 } } }];
      if (pts && $("map-points").checked) traces.push({ type: "scattergeo", locationmode: "USA-states", lon: pts.map((p) => p.lon), lat: pts.map((p) => p.lat), mode: "markers", marker: { size: 5, color: "black", opacity: .8 },
        text: pts.map((p) => `${p.name} (${p.state})<br>${p.program}, ${p.total ? p.total + " credits" : "total not stated"}${p.acce ? ", ACCE accredited" : ""}<br>${p.grads_2024 || 0} graduates in 2024`), hovertemplate: "%{text}<extra></extra>", name: "Programs" });
      Plotly.react("map-chart", traces, base({ height: 420, geo: { scope: "usa", showlakes: false, bgcolor: "white" }, margin: { l: 0, r: 0, t: 10, b: 0 }, showlegend: false }), CFG);
      const n = S.filter((s) => s[rule] <= 90).length, np_ = S.filter((s) => s[rule] <= 90).reduce((a, s) => a + s.programs, 0);
      $("map-note").textContent = `${n} of 51 states at or below 90 credits under this rule, holding ${np_} of ${S.reduce((a, s) => a + s.programs, 0)} construction management programs with a stated total in the 50 states and the District of Columbia (Puerto Rico’s program is not drawn).`;
    };
    $("map-rule").addEventListener("change", drawMap);
    $("map-points").addEventListener("change", drawMap);
    drawMap();
  }

  // ---------------------------------------------------------------- 2. the overlap
  async function overlap() {
    const O = await load("overlap.json");
    const L = toObjects(O.ledger, O.ledger_columns);
    L.sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || a.from_required - b.from_required);
    const y = L.map((r) => `${r.short}${r.official ? "" : "*"} (${r.field})`);
    const seg = [["ge_only", "Taken for general education only", "white"], ["other", "Other required course", C.gray], ["communication", "Communication", C.mint], ["econ_business", "Economics or business", C.pink], ["math_science", "Mathematics and science", C.blue]];
    const traces = seg.map(([k, name, col]) => ({ type: "bar", orientation: "h", y, x: L.map((r) => r[k]), name, marker: { color: col, line: { color: "black", width: .5 } }, hovertemplate: "%{y}<br>" + name + ": %{x} credits<extra></extra>" }));
    Plotly.react("overlap-chart", traces, base({ barmode: "stack", height: 620, xaxis: { title: "Semester credits eligible for general education (white: added to reach 36)", dtick: 10 }, yaxis: { autorange: "reversed", automargin: true, tickfont: { size: 12 } },
      shapes: [{ type: "line", x0: 36, x1: 36, y0: -1, y1: L.length, line: { color: "black", width: 1, dash: "dash" } }], legend: { orientation: "h", y: -0.1 }, margin: { l: 10, r: 20, t: 20, b: 70 } }), CFG);
    const h = await load("headline.json");
    $("overlap-note").textContent = `Bars longer than 36 show required courses eligible beyond what the areas absorb. Construction management programs require a median of ${num(h.m24.cm_overlap_med)} eligible credits, civil programs ${num(h.m24.cv_overlap_med)}. Asterisks: private institutions and Seminole State College, where course prefix and level decide eligibility because the Board of Governors does not approve their lists.`;
    // the lever
    const lev = O.lever.map((r) => ({ unitid: r[0], field: r[1], ge: r[2], regime: r[3], credits: r[4] }));
    const cm = L.filter((r) => r.field === "CM");
    const regimes = [["today", "Today’s lists", "black"], ["business foundations count", "Business foundations count", C.orange], ["any 12 major credits (Louisiana)", "Any 12 major credits", C.navy]];
    const lt = regimes.map(([rg, name, col]) => ({ type: "scatter", mode: "markers", name, marker: { color: col, size: 10, line: { color: "black", width: .4 } },
      y: cm.map((r) => r.short), x: cm.map((r) => { const z = lev.find((l) => l.unitid === r.unitid && l.field === "construction management" && l.ge === 36 && l.regime === rg); return z ? z.credits : null; }), hovertemplate: "%{y}<br>" + name + ": %{x} credits<extra></extra>" }));
    Plotly.react("lever-chart", lt, base({ height: 360, xaxis: { title: "Floor, semester credits (36 credits of general education)", range: [80, 115] }, yaxis: { automargin: true },
      shapes: [{ type: "rect", x0: 80, x1: 90, y0: -1, y1: cm.length, fillcolor: C.greenLight, line: { width: 0 }, layer: "below" }, { type: "line", x0: 90, x1: 90, y0: -1, y1: cm.length, line: { color: C.green, width: 1.5 } }], legend: { orientation: "h", y: -0.2 }, margin: { l: 10, r: 10, t: 10, b: 70 } }), CFG);
    // list against rule
    table($("diff-table"), ["Program", "Course", "Credits", "Change", "Area"], O.differences.map((d) => ({ cells: [`${d[0].replace("University of ", "").replace(" University", "")} (${d[1] === "civil" ? "Civil" : "CM"})`, `${d[2]} ${d[3]}`, d[4], d[5], d[7] || d[6]] })), { num: [2] });
    // courses by program
    const sel = $("courses-program");
    sel.innerHTML = L.map((r) => `<option value="${r.unitid}|${r.field}">${r.short} (${r.field})</option>`).join("");
    const fieldName = { CM: "construction management", Civil: "civil", CET: "construction technology" };
    const drawCourses = () => {
      const [u, f] = sel.value.split("|");
      const rows = O.courses.filter((c) => String(c[0]) === u && c[1] === fieldName[f]).sort((a, b) => (b[6] ? 1 : 0) - (a[6] ? 1 : 0) || a[2].localeCompare(b[2]));
      table($("courses-table"), ["Course", "Credits", "Kind", "General education area on the list", "State core option", "Counted in the solution that keeps the core"], rows.map((c) => ({ hit: !!c[8], cells: [`${c[2]} ${c[3]}`, c[4], c[5], c[6] || "", c[7] === true || c[7] === "True" ? "yes" : "", c[8] ? "yes" : ""] })), { num: [1] });
    };
    sel.addEventListener("change", drawCourses);
    sel.value = "433660|CM";
    drawCourses();
  }

  // ---------------------------------------------------------------- 3. the floor finder
  async function finder() {
    const P = await load("policy.json");
    const rows = toObjects(P.rows, P.columns);
    const idx = {};
    rows.forEach((r) => { const k = [r.field, r.design, r.merge, r.recognition, r.gen_ed, r.major_cap, r.floor_share].join("|"); (idx[k] = idx[k] || []).push(r); });
    const money = toObjects(P.fgcu_money, P.fgcu_money_columns);
    const midx = {};
    money.forEach((r) => { midx[[r.field, r.design, r.merge, r.recognition, r.gen_ed, r.major_cap, r.floor_share, r.pricing, r.funding].join("|")] = r; });
    const draw = () => {
      const field = $("f-field").value, design = $("f-design").value, ge = +$("f-ge").value, cap = +$("f-cap").value, share = +$("f-share").value, merge = $("f-merge").value, rec = +$("f-rec").value;
      let key = [field, design, merge, rec, ge, cap, share].join("|");
      let found = idx[key] || [];
      let note = "";
      if (merge === "none" && rec === 1) { found = idx[[field, design, merge, 0, ge, cap, share].join("|")] || []; note = "With no merging there is nothing to recognize; results shown for credits counted. "; }
      if (merge === "syllabus") note += "Syllabus-based merging was read only at FGCU; other programs show no result. ";
      if (!found.length) { $("finder-result").innerHTML = `<span class="no">No solved combination.</span> ${note}`; Plotly.purge("finder-chart"); return; }
      found.sort((a, b) => a.credits - b.credits);
      const n90 = found.filter((r) => r.credits <= 90).length;
      const med = found.map((r) => r.credits).sort((a, b) => a - b)[Math.floor(found.length / 2)];
      const [pricing, funding] = $("f-money").value.split("|");
      const mk = midx[[field, design, merge, merge === "none" ? 0 : rec, ge, cap, share, pricing, funding].join("|")];
      const fg = found.find((r) => r.unitid === 433660);
      let moneyText = "";
      if (mk) moneyText = ` At FGCU (${fg ? fg.credits : "?"} credits) the money per graduate is <b>${money_(mk.student)}</b> to the student, <b>${money_(mk.institution)}</b> to the university and <b>${money_(mk.state)}</b> to the state under this pricing and funding rule.`;
      $("finder-result").innerHTML = `<span class="${n90 ? "ok" : "no"}">${n90} of ${found.length} ${field === "CM" ? "construction management" : "civil"} programs reach 90 credits</span> (median ${med}).${moneyText} ${note}`;
      const y = found.map((r) => r.short);
      Plotly.react("finder-chart", [
        { type: "bar", orientation: "h", y, x: found.map((r) => r.credits), marker: { color: found.map((r) => (r.credits <= 90 ? C.green : C.navy)), line: { color: "black", width: .4 } }, text: found.map((r) => r.credits), textposition: "outside", hovertemplate: "%{y}: %{x} credits (published %{customdata})<extra></extra>", customdata: found.map((r) => r.published) },
      ], base({ height: 80 + 26 * found.length, xaxis: { title: "Fewest credits that meet every rule", range: [0, 130] }, yaxis: { autorange: "reversed", automargin: true }, shapes: [{ type: "line", x0: 90, x1: 90, y0: -1, y1: found.length, line: { color: C.green, width: 1.5, dash: "dash" } }], margin: { l: 10, r: 30, t: 10, b: 50 } }), CFG);
    };
    const money_ = (v) => (v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-US");
    ["f-field", "f-design", "f-ge", "f-cap", "f-share", "f-merge", "f-rec", "f-money"].forEach((id) => $(id).addEventListener("change", draw));
    draw();
    const stateCalc = () => {
      const G = +$("s-ge").value, cap = +$("s-cap").value, bus = $("s-bus").checked;
      const floor = 50 + (bus ? 0 : 9) + Math.max(G - cap, 0);
      $("state-result").innerHTML = `Construction management floor: <b>${floor} credits</b> ${floor <= 90 ? '<span class="ok">at or below 90</span>' : '<span class="no">above 90</span>'} (50 construction + ${bus ? 0 : 9} business outside general education + ${Math.max(G - cap, 0)} general education). Civil engineering: 75 credits of mathematics, science and engineering plus the general education that mathematics and science cannot fill, 87 to 93 in every state.`;
    };
    ["s-ge", "s-cap", "s-bus"].forEach((id) => $(id).addEventListener("input", stateCalc));
    stateCalc();
  }

  // ---------------------------------------------------------------- 4. who has to agree
  async function agree() {
    const A = await load("atlas.json");
    const cells = toObjects(A.cells, A.cells_columns);
    const STATES = [["36", "Keeps 36"], ["36_major12", "36, 12 major credits count"], ["30", "Lowers to 30"], ["21", "Area minimums only (21)"], ["15", "State core only (15)"]];
    const ACC = [["none", "No change"], ["minus20", "Number 20% lower"], ["half", "Number halved"], ["competence", "Counts competence"], ["minus20_competence", "20% lower, counts competence"], ["leave", "Program leaves"]];
    const draw = () => {
      const ai = $("a-ai").value, merge = $("a-merge").value, lit = +$("a-lit").value, srec = +$("a-srec").value;
      [["CM", "atlas-cm", "Construction management, 8 programs"], ["Civil", "atlas-cv", "Civil engineering, 12 programs"]].forEach(([f, id, title]) => {
        const z = STATES.map(([s]) => ACC.map(([a]) => { const c = cells.find((x) => x.field === f && x.ai === ai && x.merge === merge && x.ai_literacy === lit && x.state_rec === srec && x.state === s && x.accreditor === a); return c ? c.reach_90 : null; }));
        const med = STATES.map(([s]) => ACC.map(([a]) => { const c = cells.find((x) => x.field === f && x.ai === ai && x.merge === merge && x.ai_literacy === lit && x.state_rec === srec && x.state === s && x.accreditor === a); return c ? c.median_credits : null; }));
        const n = f === "CM" ? 8 : 12;
        Plotly.react(id, [{ type: "heatmap", z, x: ACC.map((a) => a[1]), y: STATES.map((s) => s[1]), zmin: 0, zmax: n, colorscale: [[0, "#f2f2f2"], [1, "#1f5f8b"]], showscale: false, text: z, texttemplate: "%{text}", customdata: med, hovertemplate: "State: %{y}<br>Accreditor: %{x}<br><b>%{z} of " + n + " reach 90</b>, median %{customdata} credits<extra></extra>", xgap: 2, ygap: 2 }],
          base({ title: { text: title, font: { size: 14 } }, height: 380, xaxis: { tickfont: { size: 11 }, automargin: true }, yaxis: { autorange: "reversed", tickfont: { size: 11 }, automargin: true }, margin: { l: 10, r: 10, t: 40, b: 10 } }), CFG);
      });
    };
    ["a-ai", "a-merge", "a-lit", "a-srec"].forEach((id) => $(id).addEventListener("change", draw));
    draw();
    const st = A.stories;
    const y = st.map((s) => s.story);
    Plotly.react("story-chart", [
      { type: "scatter", mode: "markers+text", name: "FGCU construction management", y, x: st.map((s) => s.fgcu_cm_credits), marker: { symbol: "square", color: C.orange, size: 11 }, text: st.map((s) => s.fgcu_cm_credits), textposition: "middle left", textfont: { color: C.orange, size: 11 }, customdata: st.map((s) => `${s.cm_reach_90} of ${s.cm_programs} construction programs reach 90`), hovertemplate: "%{y}<br>FGCU construction %{x} credits<br>%{customdata}<extra></extra>" },
      { type: "scatter", mode: "markers+text", name: "FGCU civil engineering", y, x: st.map((s) => s.fgcu_cv_credits), marker: { color: C.navy, size: 11 }, text: st.map((s) => s.fgcu_cv_credits), textposition: "middle right", textfont: { color: C.navy, size: 11 }, customdata: st.map((s) => `${s.cv_reach_90} of ${s.cv_programs} civil programs reach 90`), hovertemplate: "%{y}<br>FGCU civil %{x} credits<br>%{customdata}<extra></extra>" },
    ], base({ height: 420, xaxis: { title: "FGCU, fewest credits that meet every rule", range: [45, 110] }, yaxis: { autorange: "reversed", automargin: true }, shapes: [{ type: "line", x0: 90, x1: 90, y0: -1, y1: st.length, line: { color: "black", width: 1, dash: "dash" } }], legend: { orientation: "h", y: -0.12 }, margin: { l: 10, r: 10, t: 10, b: 60 } }), CFG);
    table($("story-table"), ["Story", "State", "Accreditor", "Merging", "AI future", "CM at 90", "Civil at 90", "FGCU CM credits", "Student", "University", "State budget"],
      st.map((s) => ({ cells: [s.story, s.state.replace("_major12", " + 12 major"), s.accreditor, s.merge, s.ai + (s.ai_literacy ? ", AI course" : ""), `${s.cm_reach_90} of ${s.cm_programs}`, `${s.cv_reach_90} of ${s.cv_programs}`, s.fgcu_cm_credits, money(s.fgcu_cm_student), money(s.fgcu_cm_institution), money(s.fgcu_cm_state)] })), { num: [7, 8, 9, 10] });
  }

  // ---------------------------------------------------------------- 5. the student
  async function student() {
    const S = await load("student.json");
    const draw = () => {
      const f = $("st-field").value, d = S[f], s = d.summary;
      const pen = +$("st-pen").value;
      $("st-pen-val").textContent = pct(pen, 1);
      const edges = d.penalty_edges;
      let bi = edges.findIndex((e, i) => i < edges.length - 1 && pen >= e && pen < edges[i + 1]);
      if (bi < 0) bi = pen >= edges[edges.length - 1] ? d.conditional.length - 1 : 0;
      const c = d.conditional[Math.min(bi, d.conditional.length - 1)];
      $("st-result").innerHTML = `With an entry penalty near ${pct(pen, 1)}, the median ${f} graduate gains <b>${money(c[0])}</b> (10th to 90th percentile ${money(c[1])} to ${money(c[2])}) and loses in <span class="${c[3] > .5 ? "no" : "ok"}">${pct(c[3])}</span> of those futures. Over all futures the median graduate loses in ${pct(s.share_futures_median_graduate_loses)}; the central future breaks even at a penalty of ${pct(s.breakeven_entry_penalty_central, 1)}; with no penalty the gain is ${money(s.zero_penalty_median_gain)}.`;
      const mids = d.hist_edges.slice(0, -1).map((e, i) => (e + d.hist_edges[i + 1]) / 2);
      Plotly.react("st-hist", [{ type: "bar", x: mids, y: d.hist, marker: { color: mids.map((m) => (m < 0 ? C.red : C.navy)) }, hovertemplate: "gain near %{x:$,.0f}: %{y} futures<extra></extra>" }],
        base({ title: { text: "Median graduate’s gain across 20,000 futures", font: { size: 14 } }, height: 340, xaxis: { title: "Present value at graduation", tickprefix: "$", tickformat: ",.0f" }, yaxis: { title: "Futures" }, bargap: .05, margin: { l: 60, r: 10, t: 40, b: 50 } }), CFG);
      const px = edges.slice(0, -1).map((e, i) => (e + edges[i + 1]) / 2);
      Plotly.react("st-cond", [
        { type: "scatter", x: px, y: d.conditional.map((r) => r[2]), mode: "lines", line: { width: 0 }, showlegend: false, hoverinfo: "skip" },
        { type: "scatter", x: px, y: d.conditional.map((r) => r[1]), mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: "rgba(0,114,178,.15)", name: "10th to 90th percentile", hoverinfo: "skip" },
        { type: "scatter", x: px, y: d.conditional.map((r) => r[0]), mode: "lines", line: { color: C.navy, width: 2 }, name: "Median", hovertemplate: "penalty %{x:.1%}: median gain %{y:$,.0f}<extra></extra>" },
        { type: "scatter", x: [pen], y: [c[0]], mode: "markers", marker: { color: C.orange, size: 12, line: { color: "black", width: .5 } }, name: "Your penalty", hoverinfo: "skip" },
      ], base({ title: { text: "Gain by the entry earnings penalty", font: { size: 14 } }, height: 340, xaxis: { title: "Entry earnings penalty", tickformat: ".0%" }, yaxis: { title: "Median graduate’s gain", tickprefix: "$", tickformat: ",.0f" }, shapes: [{ type: "line", x0: 0, x1: edges[edges.length - 1], y0: 0, y1: 0, line: { color: "black", width: 1 } }], legend: { orientation: "h", y: -0.25 }, margin: { l: 70, r: 10, t: 40, b: 60 } }), CFG);
      const fx = d.fade_edges.slice(0, -1).map((e, i) => (e + d.fade_edges[i + 1]) / 2);
      Plotly.react("st-grid", [{ type: "heatmap", z: d.lose_grid, x: fx, y: px, colorscale: [[0, "#f7fbff"], [0.5, "#f4a261"], [1, "#8B2E2B"]], zmin: 0, zmax: 1, colorbar: { title: "Share losing", tickformat: ".0%", thickness: 12 }, hovertemplate: "penalty %{y:.1%}, fade %{x:.1%} a year: %{z:.0%} of futures lose<extra></extra>" }],
        base({ title: { text: "Where the median graduate loses: penalty against its yearly fade", font: { size: 14 } }, height: 340, xaxis: { title: "Yearly fade of the penalty", tickformat: ".0%" }, yaxis: { title: "Entry earnings penalty", tickformat: ".0%" }, margin: { l: 70, r: 10, t: 40, b: 50 } }), CFG);
      const sob = s.sobol_median_gain.slice().sort((a, b) => b.ST - a.ST);
      Plotly.react("st-sobol", [{ type: "bar", orientation: "h", y: sob.map((r) => r.factor.replace(/_/g, " ")), x: sob.map((r) => r.ST), marker: { color: C.navy }, error_x: { type: "data", array: sob.map((r) => r.ST_conf), color: "black", thickness: 1 }, hovertemplate: "%{y}: total index %{x:.2f}<extra></extra>" }],
        base({ title: { text: "Which unknown decides: Sobol total index", font: { size: 14 } }, height: 340, xaxis: { title: "Share of the variance of the median gain", range: [0, 1] }, yaxis: { autorange: "reversed", automargin: true }, margin: { l: 10, r: 10, t: 40, b: 50 } }), CFG);
      const box = s.prim && s.prim[0] && s.prim[0].box ? Object.entries(s.prim[0].box).map(([k, v]) => `${k.replace(/_/g, " ")} ${k === "career_years" ? v[0].toFixed(0) + " to " + v[1].toFixed(0) : pct(v[0], 1) + " to " + pct(v[1], 1)}`).join("; ") : "";
      $("st-note").textContent = `Scenario discovery (PRIM): the futures in which the median graduate loses sit in one box, ${box} (coverage ${pct(s.prim[0].coverage)}, density ${pct(s.prim[0].density)}). ${s.programs} programs, ${num(s.graduates_2024)} graduates in 2024, a median of ${s.median_credits_removed} credits removed.`;
    };
    $("st-field").addEventListener("change", draw);
    $("st-pen").addEventListener("input", draw);
    draw();
  }

  // ---------------------------------------------------------------- 6. the system
  async function system() {
    const Y = await load("system.json");
    const B = toObjects(Y.bands, Y.bands_columns);
    const key = { "United States|construction": "us_construction", "Florida|construction": "fl_construction", "United States|civil": "us_civil", "Florida|civil": "fl_civil" };
    const band = (rows, name, color, fmt) => {
      const x = rows.map((r) => r.year);
      return [
        { type: "scatter", x, y: rows.map((r) => r.p90), mode: "lines", line: { width: 0 }, showlegend: false, hoverinfo: "skip" },
        { type: "scatter", x, y: rows.map((r) => r.p10), mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: color.replace(")", ",.18)").replace("rgb", "rgba"), showlegend: false, hoverinfo: "skip" },
        { type: "scatter", x, y: rows.map((r) => r.p50), mode: "lines", line: { color, width: 2 }, name, hovertemplate: "%{x}: " + fmt + "<extra>" + name + "</extra>" },
      ];
    };
    const draw = () => {
      const region = $("sy-region").value, field = $("sy-field").value;
      const of = (s) => B.filter((r) => r.region === region && r.field === field && r.series === s).sort((a, b) => a.year - b.year);
      Plotly.react("sy-adopt", [...band(of("adopt"), "Programs offering a 90-credit option", "rgb(0,114,178)", "%{y:.0%}"), ...band(of("s90"), "Entrants on the 90-credit track", "rgb(230,159,0)", "%{y:.0%}")],
        base({ title: { text: "Adoption, median and 10th to 90th percentile", font: { size: 14 } }, height: 340, xaxis: { title: "Year" }, yaxis: { tickformat: ".0%", rangemode: "tozero" }, legend: { orientation: "h", y: -0.2 }, margin: { l: 50, r: 10, t: 40, b: 60 } }), CFG);
      Plotly.react("sy-grads", [...band(of("G_base"), "Graduates without the option", "rgb(154,154,154)", "%{y:,.0f}"), ...band(of("G"), "Graduates with the option", "rgb(59,122,42)", "%{y:,.0f}")],
        base({ title: { text: "Bachelor’s graduates a year", font: { size: 14 } }, height: 340, xaxis: { title: "Year" }, yaxis: { rangemode: "tozero", tickformat: ",.0f" }, legend: { orientation: "h", y: -0.2 }, margin: { l: 60, r: 10, t: 40, b: 60 } }), CFG);
      const s = Y.summary[key[region + "|" + field]];
      const b = (d, f) => `${f(d.median)} (${f(d.p10)} to ${f(d.p90)})`;
      table($("sy-table"), ["Outcome: median (10th to 90th percentile)", region + ", " + field], [
        ["Programs offering a 90-credit option, 2035", b(s.adoption_2035, (v) => pct(v))], ["Entrants on the 90-credit track, 2035", b(s.share_90_track_2035, (v) => pct(v))],
        ["Extra graduates, 2027 to 2040", b(s.extra_graduates_2027_2040, (v) => num(v))], ["Largest one-year rise in graduates", b(s.peak_surge_share, (v) => pct(v, 1))],
        ["Change in student-years, 2027 to 2050", b(s.student_years_change_share_2027_2050, (v) => pct(v, 1))], ["Institutions’ net revenue, present value 2027 to 2050", b(s.institution_net_pv, money)],
        ["State appropriations saved, present value 2027 to 2050", b(s.state_savings_pv, money)], ["Graduates per opening in 2035, without and with the option", `${s.graduates_per_opening_2035_base.median.toFixed(2)} and ${s.graduates_per_opening_2035.median.toFixed(2)}`],
        ["Futures in which institutions lose", pct(s.share_futures_institutions_lose)],
      ].map((r) => ({ cells: r })));
    };
    ["sy-region", "sy-field"].forEach((id) => $(id).addEventListener("change", draw));
    draw();
  }

  // ---------------------------------------------------------------- 7. AI
  async function ai() {
    const A = await load("ai.json");
    const F = toObjects(A.floors, A.floors_columns);
    const draw = () => {
      const field = $("ai-field").value, region = $("ai-region").value;
      const cases = [["no_ai", "Without AI", C.gray], ["ai", "With AI", "#5DADE2"], ["ai_wil", "With AI and a paid work-integrated year", "#58B368"]];
      const groups = [["students", "Students"], ["industry", "Industry"], ["states", "States"], ["institutions", "Institutions"]];
      const traces = cases.map(([k, name, col]) => { const L = A.ledger[`${region}|${field}|${k}`]; if (!L) return null; return { type: "bar", name, x: groups.map((g) => g[1]), y: groups.map(([g]) => L[g].median / 1e6), marker: { color: col, line: { color: "black", width: .4 } }, customdata: groups.map(([g]) => pct(L[g].share_positive)), hovertemplate: "%{x}, " + name + "<br>median %{y:$,.0f}M, gains in %{customdata} of futures<extra></extra>" }; }).filter(Boolean);
      Plotly.react("ai-ledger", traces, base({ title: { text: `Who gains and who loses, ${region} ${field}, present value 2027 to 2050 (million USD)`, font: { size: 14 } }, barmode: "group", height: 380, yaxis: { title: "Million USD", tickprefix: "$", zeroline: true }, legend: { orientation: "h", y: -0.15 }, margin: { l: 60, r: 10, t: 40, b: 70 } }), CFG);
      const fld = field === "construction" ? "CM" : "Civil";
      const rows = F.filter((r) => r.field === fld && r.scope === "accreditor content" && r.recognition === "sampled recognition").sort((a, b) => b.floor - a.floor);
      Plotly.react("ai-floors", [
        { type: "scatter", mode: "markers", name: "Floor without AI", y: rows.map((r) => r.short), x: rows.map((r) => r.floor), marker: { color: "black", size: 9 }, hovertemplate: "%{y}: %{x} credits<extra>without AI</extra>" },
        { type: "scatter", mode: "markers", name: "With guarded AI tutoring, median of futures", y: rows.map((r) => r.short), x: rows.map((r) => r.median), error_x: { type: "data", symmetric: false, array: rows.map((r) => r.p90 - r.median), arrayminus: rows.map((r) => r.median - r.p10), color: C.navy, thickness: 1 }, marker: { color: C.navy, size: 9 }, customdata: rows.map((r) => pct(r.share_le90)), hovertemplate: "%{y}: %{x:.1f} credits, at or below 90 in %{customdata} of futures<extra>with AI</extra>" },
      ], base({ title: { text: "Floors with the study time AI saves, on the evidence from trials", font: { size: 14 } }, height: 380, xaxis: { title: "Credits", range: [40, 120] }, yaxis: { automargin: true, autorange: "reversed" }, shapes: [{ type: "line", x0: 90, x1: 90, y0: -1, y1: rows.length, line: { color: C.green, width: 1.5 } }], legend: { orientation: "h", y: -0.15 }, margin: { l: 10, r: 10, t: 40, b: 70 } }), CFG);
      const ms = A.ms;
      $("ai-note").textContent = `On the evidence from trials the median Florida floor is ${num(ms.cm_content_sampled_floor)} credits in construction management and ${num(ms.cv_content_sampled_floor)} in civil engineering; ${ms.states_le90_without_ai} states would have a construction floor of 90 or fewer, and a required 3-credit AI literacy course would lift ${ms.states_pushed_over_90_by_3_literacy} of them above 90. The median construction graduate gains ${money(ms.construction_ai_gain_per_graduate)} with AI and ${money(ms.construction_ai_wil_gain_per_graduate)} with a paid work year.`;
    };
    ["ai-field", "ai-region"].forEach((id) => $(id).addEventListener("change", draw));
    draw();
  }

  // ---------------------------------------------------------------- navigation highlight
  function navWatch() {
    const links = Array.from(document.querySelectorAll("#nav a"));
    const secs = links.map((a) => document.querySelector(a.getAttribute("href")));
    const on = () => { let cur = 0; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= 120) cur = i; }); links.forEach((a, i) => a.classList.toggle("on", i === cur)); };
    document.addEventListener("scroll", on, { passive: true });
    on();
  }

  document.addEventListener("DOMContentLoaded", () => {
    navWatch();
    hero().catch(console.error);
    fit().catch(console.error);
    overlap().catch(console.error);
    agree().catch(console.error);
    student().catch(console.error);
    system().catch(console.error);
    ai().catch(console.error);
    // the finder reads the largest file: load it once the rest is drawn
    setTimeout(() => finder().catch(console.error), 300);
  });
})();
