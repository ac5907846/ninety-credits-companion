/* Companion web app. Every number is read from data/*.json, written by build_data.py from the analysis results.
   Views are real tabs (hash router); each view draws when first opened. */
(function () {
  "use strict";
  const C = { navy: "#0072B2", orange: "#E69F00", green: "#3B7A2A", greenLight: "#E3F0DD", red: "#C0504D", grey: "#9A9A9A", ink: "#1f2a37", line: "#d9dee3",
              blue: "#D4EBF2", pink: "#EAD1DC", mint: "#D9EAD3", gray: "#BFBFBF", lightOrange: "#F9E2B8" };
  const FONT = { family: "Segoe UI, system-ui, Helvetica, Arial, sans-serif", size: 13, color: C.ink };
  const CFG = { responsive: true, displaylogo: false, displayModeBar: false };
  const cache = {};
  const $ = (id) => document.getElementById(id);
  const fmtK = (v) => (Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : (v / 1e3).toFixed(0) + "k");
  const money = (v) => (v == null ? "" : (v < 0 ? "−" : "") + "$" + fmtK(Math.abs(v)));
  const moneyFull = (v) => (v == null ? "" : (v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-US"));
  const pct = (v, d = 0) => (v == null ? "" : (100 * v).toFixed(d) + "%");
  const num = (v, d = 0) => (v == null ? "" : Number(v).toLocaleString("en-US", { maximumFractionDigits: d }));
  const base = (over) => {
    const L = Object.assign({ font: FONT, paper_bgcolor: "white", plot_bgcolor: "white",
      hoverlabel: { bgcolor: "white", bordercolor: C.line, font: { family: FONT.family, size: 12, color: C.ink } },
      legend: { orientation: "h", x: 0, y: 1, yanchor: "bottom", font: { size: 12 } } }, over);
    L.margin = Object.assign({ l: 60, r: 20, t: 30, b: 50 }, over.margin || {});
    const hasTitle = !!L.title, hasLegend = L.showlegend !== false;
    L.margin.t = Math.max(L.margin.t, hasTitle && hasLegend ? 82 : hasTitle ? 52 : hasLegend ? 42 : 20);
    return L;
  };
  const title = (t) => ({ text: t, font: { size: 14 }, x: 0, xanchor: "left", y: 1, yanchor: "top", yref: "container", pad: { t: 10 } });
  const vline = (x, n, color = C.green, dash = "solid") => ({ type: "line", x0: x, x1: x, y0: -0.5, y1: n - 0.5, line: { color, width: 1.5, dash } });
  const shade90 = (lo, n) => ({ type: "rect", x0: lo, x1: 90, y0: -0.5, y1: n - 0.5, fillcolor: C.greenLight, line: { width: 0 }, layer: "below" });
  const median = (a) => { const v = a.filter((x) => x != null && !isNaN(x)).sort((x, y) => x - y); if (!v.length) return null; return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2; };
  const link = (path, label) => `<a href="${path}" target="_blank" rel="noopener">${label || path.split("/").pop()}</a>`;
  const res = (m, f) => link(`data/results/${m}/${f}`, f);

  function load(name) {
    if (!cache[name]) cache[name] = fetch("data/" + name + ".json").then((r) => { if (!r.ok) throw new Error(name + " " + r.status); return r.json(); });
    return cache[name];
  }
  function toObjects(rows, cols) { return rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]]))); }
  function table(el, head, rows, opts = {}) {
    const h = "<thead><tr>" + head.map((c, i) => `<th class="${opts.num && opts.num.includes(i) ? "n" : ""}">${c}</th>`).join("") + "</tr></thead>";
    const b = "<tbody>" + rows.map((r) => `<tr class="${r.hit ? "hit" : ""}">` + r.cells.map((c, i) => `<td class="${opts.num && opts.num.includes(i) ? "n" : ""}">${c == null ? "" : c}</td>`).join("") + "</tr>").join("") + "</tbody>";
    el.innerHTML = h + b;
  }
  function trace(id, html) { const el = $(id); if (el) el.innerHTML = html; }
  function keys(el, items, onPick, current) {
    el.innerHTML = items.map((it, i) => `<button type="button" class="key-btn tour-keep ${i === current ? "on" : ""}">${it}</button>`).join("");
    el.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => onPick(i)));
  }
  const GROUP_ORDER = { "Construction management": 0, "Construction engineering technology": 1, "Civil engineering": 2 };
  const FIELD_NAME = { CM: "construction management", Civil: "civil", CET: "construction technology" };

  // ================================================================ router
  const inited = {};
  const VIEWS = { overview, data, model, florida, futures, states, sources };
  function show(name) {
    if (!VIEWS[name]) name = "overview";
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("on", v.id === "v-" + name));
    document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.view === name));
    window.scrollTo(0, 0);
    if (!inited[name]) { inited[name] = true; VIEWS[name]().catch((e) => console.error(name, e)); }
    else document.querySelectorAll("#v-" + name + " .js-plotly-plot").forEach((p) => Plotly.Plots.resize(p));
  }
  window.addEventListener("hashchange", () => show(location.hash.replace("#", "")));

  // ================================================================ overview
  async function overview() {
    const [h, H, S] = await Promise.all([load("headline"), load("hero"), load("study")]);
    const m15 = h.m15, m16 = h.m16, m23 = h.m23, m24 = h.m24;
    // the opening picture
    const readout = { kicker: $("hr-kicker"), title: $("hr-title"), sub: $("hr-sub"), cm: $("hr-cm"), cv: $("hr-cv"), fgcu: $("hr-fgcu"), med: $("hr-med"), steps: $("hr-steps") };
    readout.steps.innerHTML = H.stages.map((s, i) => `<button type="button" class="tour-keep" title="${s.title}">${i + 1}</button>`).join("");
    const hero = Hero.build($("hero-stage"), H, readout);
    const tour = Tour({ host: $("hero-fig"), steps: H.stages.length, show: (i, cause) => hero.morph(i, cause), every: 4200, label: "opening tour", stopOn: ".hero-stage" });
    readout.steps.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => tour.go(i)));
    // tiles: construction management in Florida first
    const arith = 50 + 9 + 36;
    const tiles = [
      [`${arith}`, "credits a Florida construction management degree needs by arithmetic: 50 construction, 9 business outside general education, 36 general education", "warn"],
      [`${m23.story3_cm_reach_90} of 8`, "Florida construction management programs at or below 90 if the state lets 12 major credits count toward general education, as Louisiana does", "good"],
      [`${m15.states_cm_floor_le90} of 51`, "states whose construction management floor is already 90 credits or fewer", ""],
      [`${num(m24.fgcu_cm_from_required_total)} of 36`, "general education credits FGCU’s construction program fills with courses it requires anyway", ""],
      [money(m16.construction.zero_penalty_median_gain), "lifetime gain of the median construction graduate if employers pay no less", "good"],
      [pct(m16.construction.share_futures_median_graduate_loses), "of 20,000 futures in which the median construction graduate loses", "warn"],
    ];
    $("tiles").innerHTML = tiles.map(([v, l, k]) => `<div class="tile"><div class="v ${k}">${v}</div><div class="l">${l}</div></div>`).join("");
    const cmMin = m15.cm_floor_36_typ_min, cmMax = m15.cm_floor_36_typ_max, cvMin = m15.cv_floor_36_typ_min ?? m15.civil_floor_36_typ_min, cvMax = m15.cv_floor_36_typ_max ?? m15.civil_floor_36_typ_max;
    $("why").innerHTML = `Why construction management is the harder case in Florida and the easier one elsewhere: ABET lets a civil program’s 30 credits of mathematics and science stand in the state’s general education, while ACCE’s construction and business content stands in none of it. Under Florida’s 36-credit rule the construction management floor is therefore ${num(cmMin)} to ${num(cmMax)} credits${cvMin != null ? ` against ${num(cvMin)} to ${num(cvMax)} for civil engineering` : ""}; where the state asks less, or lets major credits count, the construction floor falls first: ${m15.states_cm_floor_le90} states sit at or below 90 today and ${m23.story3_cm_reach_90} of Florida’s 8 programs reach it with Louisiana’s rule.`;
    // the study at a glance
    const U = S.universe, K = S.catalogs, D = S.discourse, FM = S.florida_model, P = S.parameters;
    const nodes = [
      { kind: "data", k: "Programs", v: num(U.institutions), l: `institutions with a construction bachelor’s, ${U.acce_bachelors} ACCE accredited; ${num(U.civil.institutions)} civil for comparison`, what: "IPEDS completions 2014 to 2024 joined with the ACCE directory define the universe; civil engineering (CIP 14.0801) is the ABET sibling read the same way.", inp: "IPEDS, ACCE directory, College Scorecard", out: "program_universe.csv, civil_universe.csv", feeds: "Data tab; Figure 1", files: [res("15_curriculum_milp", "national_cm_floor.csv")] },
      { kind: "data", k: "Catalogs", v: num(K.cm.programs_with_total_count || K.cm.institutions_with_total), l: `construction programs with a stated total (median ${num(K.cm.total_median)} credits); ${num(K.civil.with_total)} civil`, what: "Every catalog was saved under a written protocol and its credit blocks read: total, general education, mathematics and science, business, major, free electives.", inp: "180 construction and 294 civil catalogs", out: "catalog_programs.csv, civil_catalog_programs.csv", feeds: "Data tab; Tables 4 to 8", files: [] },
      { kind: "data", k: "Florida course lists", v: num(FM.programs), l: "Florida programs whose every course and prerequisite chain was read", what: "For the 21 Florida construction and civil programs the full course list, credits, prerequisites and the topics each course covers were read from the catalogs and syllabi.", inp: "21 Florida catalogs, FGCU syllabi", out: "01_raw_data/prerequisites/*.csv", feeds: "Module A", files: [] },
      { kind: "data", k: "Rules", v: num(m24.list_rows), l: "entries on the 2026-27 general education lists of 11 Florida institutions; ACCE Document 103; ABET criteria; 50 state minimums", what: "Which courses count toward general education is read from the lists the Board of Governors approved for each university and from Seminole State’s catalog; accreditor floors from ACCE Document 103 (19 October 2026) and ABET’s criteria; every state’s general education minimum from its policy.", inp: "Board of Governors lists, ACCE, ABET, state policies", out: "gen_ed_lists_sus_2026-27.csv, gen_ed_lists_fcs_2026-27.csv, state_floors.csv", feeds: "Modules A and 24; Other states tab", files: [res("policy", "gen_ed_lists_sus_2026-27.csv"), res("policy", "gen_ed_lists_fcs_2026-27.csv")] },
      { kind: "data", k: "Debate", v: num(D.news_relevant), l: `news items on reduced-credit degrees, ${num(D.news_2026)} in 2026; ${num(D.events_total)} policy events`, what: "Google News and Hacker News feeds for 32 queries, screened and coded by written rules; state policy status for all 50 states.", inp: "news feeds, state documents, futurists’ and leaders’ statements", out: "news_by_year_stance.csv, state_policy_status.csv", feeds: "Data tab", files: [] },
      { kind: "model", k: "Module A", v: "504", l: "curriculum solves: 21 programs, 2 designs, 3 general education totals, 2 area structures, 2 entrants", what: "A mixed-integer program (scipy HiGHS) chooses the fewest credits that meet the accreditor floors, the state rule, the topics the program covers and every prerequisite chain; a second program places courses in terms.", inp: "course lists, rules", out: "milp_florida_programs.csv, state_floors.csv", feeds: "Florida results; Figure 3", files: [res("15_curriculum_milp", "milp_florida_programs.csv"), res("15_curriculum_milp", "summary.json")] },
      { kind: "model", k: "Module 24", v: num(m24.cm_overlap_med), l: "median credits a construction program already fills of the state’s 36 (overlap ledger and the business-foundations lever)", what: "For every program, which required courses stand on its general education list; what the lists changed against the old prefix rule; the floor if the state counted ACCE’s business foundations or any 12 major credits.", inp: "Module A plans, the lists", out: "overlap_by_program.csv, lever_business_as_gen_ed.csv", feeds: "Florida results; Figure 4, Table 23", files: [res("24_gen_ed_overlap", "overlap_by_program.csv")] },
      { kind: "model", k: "Module B", v: num(P["16_student_rdm"].n_futures), l: "futures for the graduate: entry penalty, its fade, time saved, tuition, discount rate, career, completion", what: "Robust Decision Making: a Latin hypercube over the unknowns, one model run per future, PRIM to find where the graduate loses, Sobol indices for which unknown matters.", inp: "earnings by education (PUMS), Scorecard, tuition", out: "futures_construction.csv.gz, summary.json", feeds: "Student and system tab; Figure 5", files: [res("16_student_rdm", "summary.json")] },
      { kind: "model", k: "Module C", v: num(P["17_system_rdm"].n_futures), l: "futures for the system: adoption timing, accreditor year, cohorts, graduates, institutions’ and states’ money, 2015 to 2050", what: "A stock-flow model of entering cohorts; programs adopt along a diffusion curve that starts when the state allows and waits for the accreditor; outcomes per future.", inp: "IPEDS cohorts, SHEF, BLS projections", out: "yearly_bands.csv, summary.json", feeds: "Student and system tab; Figure 6", files: [res("17_system_rdm", "yearly_bands.csv")] },
      { kind: "model", k: "Module 18", v: "24", l: "AI and workforce unknowns added to the same futures, with five futurists’ futures", what: "Study time a guarded AI tutor saves by course type, whether compressed learning earns credit, junior hiring, training cost; the floors re-solved with the saved time; the ledger for students, industry, states and institutions.", inp: "trials and evidence in 01_raw_data/ai", out: "curriculum_ai_floors.csv, summary.json", feeds: "Student and system tab; Figures 9 and 10", files: [res("18_ai_futures", "curriculum_ai_floors.csv")] },
      { kind: "result", k: "Module 22", v: num(FM.policy_grid.solves), l: "solves of the policy grid: state general education, major credits counted, accreditor share, merging, recognition, money rules", what: "A full factorial of the levers each party holds, solved for every Florida program; money per graduate for FGCU under four pricing and funding rules.", inp: "Module A model, FGCU syllabi, peer course lists", out: "scenario_results.csv, ledger_per_graduate.csv", feeds: "Floor finder; Figure 11", files: [res("22_policy_scenarios", "summary.json")] },
      { kind: "result", k: "Module 23", v: num(FM.atlas.solves), l: `solves of the scenario atlas: ${num(FM.atlas.combinations)} combinations of state, accreditor, seven AI futures, merging and an AI course for 20 programs`, what: "Every combination of what the state does, what the accreditor does, the AI future, merging and a required AI course; twelve stories read at FGCU; the central case is a stated choice and every alternative is solved.", inp: "Modules A, 18, 22", out: "atlas_results.csv.gz, story_table.csv", feeds: "Who has to agree; Figure 12", files: [res("23_scenario_atlas", "story_table.csv"), res("23_scenario_atlas", "reach_by_cell.csv")] },
    ];
    const flow = $("flow");
    flow.innerHTML = nodes.map((n, i) => `<div class="node ${n.kind} tour-keep" data-i="${i}"><div class="k">${n.k}</div><div class="v">${n.v}</div><div class="l">${n.l}</div></div>`).join("");
    const detail = $("flow-detail");
    const showNode = (i) => {
      const n = nodes[i];
      flow.querySelectorAll(".node").forEach((el, k) => el.classList.toggle("on", k === i));
      detail.innerHTML = `<h4>${n.k}: ${n.v} ${n.l}</h4><p>${n.what}</p><div class="io"><div><b>Reads</b>${n.inp}</div><div><b>Writes</b>${n.out}</div><div><b>Feeds</b>${n.feeds}${n.files.length ? "<br>" + n.files.join(", ") : ""}</div></div>`;
    };
    const ftour = Tour({ host: flow, steps: nodes.length, show: showNode, every: 3800, label: "study overview", stopOn: ".nothing" });
    flow.querySelectorAll(".node").forEach((el) => el.addEventListener("click", () => ftour.go(+el.dataset.i)));
    trace("trace-flow", `Counts read from the modules’ summary files (${["15_curriculum_milp", "24_gen_ed_overlap", "22_policy_scenarios", "23_scenario_atlas"].map((m) => link(`data/results/${m}/summary.json`, m)).join(", ")}) and ${link("data/study.json", "study.json")}.`);
  }

  // ================================================================ data
  async function data() {
    const [S, F, h] = await Promise.all([load("study"), load("floors"), load("headline")]);
    const U = S.universe, K = S.catalogs, D = S.discourse;
    const tiles = [
      [num(U.institutions), "institutions with a construction bachelor’s program (IPEDS 2014 to 2024)", ""],
      [num(U.acce_bachelors), "of them ACCE accredited", ""],
      [num(K.cm.programs_with_total_count || K.cm.institutions_with_total), "construction programs with a stated total in their catalog", ""],
      [num(K.cm.total_median), "median published total, credits", ""],
      [pct(K.cm.share_exactly_120), "of construction programs publish exactly 120", ""],
      [num(K.cm.median_to_cut), "credits the median program would cut to reach 90", "warn"],
      [num(U.civil.institutions), "civil engineering institutions read for comparison; median total " + num(S.catalogs.civil.total_median), ""],
    ];
    $("data-tiles").innerHTML = tiles.map(([v, l, k]) => `<div class="tile"><div class="v ${k}">${v}</div><div class="l">${l}</div></div>`).join("");
    const CIP = { "52.2001": "Construction management (52.2001)", "15.1001": "Construction engineering technology (15.1001)", "14.3301": "Construction engineering (14.3301)", "46.0412": "Building construction management (46.0412)", other: "Other codes" };
    const cips = U.programs_by_cip.slice().sort((a, b) => b.n - a.n);
    Plotly.react("d-cip", [
      { type: "bar", orientation: "h", y: cips.map((c) => CIP[c.CIPCODE] || c.CIPCODE), x: cips.map((c) => c.n), name: "Programs", marker: { color: C.gray, line: { color: "black", width: .5 } }, hovertemplate: "%{y}: %{x} programs<extra></extra>" },
      { type: "bar", orientation: "h", y: cips.map((c) => CIP[c.CIPCODE] || c.CIPCODE), x: cips.map((c) => c.acce), name: "ACCE accredited", marker: { color: C.mint, line: { color: "black", width: .5 } }, hovertemplate: "%{y}: %{x} ACCE accredited<extra></extra>" },
    ], base({ title: title("Programs by classification code, and how many are ACCE accredited"), barmode: "group", height: 320, xaxis: { title: "Programs" }, yaxis: { autorange: "reversed", automargin: true }, margin: { l: 10, r: 10, t: 60, b: 50 } }), CFG);
    const st = toObjects(U.by_state, U.by_state_columns).slice(0, 15);
    Plotly.react("d-states", [
      { type: "bar", x: st.map((s) => s.state), y: st.map((s) => s.institutions), name: "Institutions", marker: { color: C.blue, line: { color: "black", width: .5 } }, hovertemplate: "%{x}: %{y} institutions<extra></extra>" },
      { type: "bar", x: st.map((s) => s.state), y: st.map((s) => s.acce), name: "ACCE accredited", marker: { color: C.mint, line: { color: "black", width: .5 } }, hovertemplate: "%{x}: %{y} ACCE<extra></extra>" },
    ], base({ title: title("The fifteen states with most construction programs"), barmode: "group", height: 320, yaxis: { title: "Institutions" }, margin: { l: 50, r: 10, t: 60, b: 40 } }), CFG);
    const gy = toObjects(U.cm_grads_by_year, ["year", "grads"]);
    Plotly.react("d-grads", [{ type: "scatter", mode: "lines+markers", x: gy.map((r) => r.year), y: gy.map((r) => r.grads), line: { color: C.orange, width: 2.5 }, marker: { color: C.orange, size: 7, line: { color: "black", width: .5 } }, hovertemplate: "%{x}: %{y:,} graduates<extra></extra>" }],
      base({ title: title("Construction bachelor’s graduates a year, United States (IPEDS)"), height: 300, yaxis: { rangemode: "tozero", tickformat: "," }, xaxis: { dtick: 2 }, margin: { l: 60, r: 10, t: 60, b: 40 }, showlegend: false }), CFG);
    const cy = toObjects(U.civil_grads_by_year, ["year", "grads", "women"]);
    Plotly.react("d-civil-grads", [{ type: "scatter", mode: "lines+markers", x: cy.map((r) => r.year), y: cy.map((r) => r.grads), line: { color: C.navy, width: 2.5 }, marker: { color: C.navy, size: 7, line: { color: "black", width: .5 } }, customdata: cy.map((r) => pct(r.women)), hovertemplate: "%{x}: %{y:,} graduates, %{customdata} women<extra></extra>" }],
      base({ title: title("Civil engineering graduates a year, for comparison"), height: 300, yaxis: { rangemode: "tozero", tickformat: "," }, xaxis: { dtick: 2 }, margin: { l: 60, r: 10, t: 60, b: 40 }, showlegend: false }), CFG);
    trace("trace-universe", `Module 01 (program universe) and Module 07 (civil): counts in ${link("data/study.json", "study.json")}; the universe file travels with Module 15’s ${res("15_curriculum_milp", "national_cm_floor.csv")}.`);
    // catalogs
    const td = K.cm_totals_distribution.filter((r) => !["All", "not stated"].includes(String(r.total_semester)));
    const cvd = K.civil.distribution || {};
    const cats = td.map((r) => String(r.total_semester));
    Plotly.react("d-totals", [
      { type: "bar", x: cats, y: td.map((r) => r["ACCE accredited"]), name: "Construction, ACCE accredited", marker: { color: C.mint, line: { color: "black", width: .5 } } },
      { type: "bar", x: cats, y: td.map((r) => r["Not ACCE accredited"]), name: "Construction, not accredited", marker: { color: C.gray, line: { color: "black", width: .5 } } },
      { type: "scatter", mode: "markers", x: cats, y: cats.map((c) => cvd[c] ?? null), name: "Civil engineering (comparison)", marker: { color: C.navy, size: 10, symbol: "diamond" }, hovertemplate: "%{x} credits: %{y} civil programs<extra></extra>" },
    ], base({ title: title("Published totals: how many programs print 120, and how many more"), barmode: "stack", height: 340, xaxis: { title: "Published total, semester credits" }, yaxis: { title: "Programs" }, margin: { l: 50, r: 10, t: 70, b: 50 } }), CFG);
    const bl = K.cm_blocks.map((b) => ({ ...b, who: "Construction" })).concat(K.civil_blocks.map((b) => ({ ...b, who: "Civil" })));
    const yb = bl.map((b) => `${b.who}: ${b.block} (n = ${b.n})`);
    Plotly.react("d-blocks", [
      { type: "scatter", mode: "markers", y: yb, x: bl.map((b) => b.p25), name: "25th percentile", marker: { color: "white", size: 8, line: { color: "black", width: 1 } }, hovertemplate: "%{y}<br>p25 %{x}<extra></extra>" },
      { type: "scatter", mode: "markers", y: yb, x: bl.map((b) => b.p75), name: "75th percentile", marker: { color: "white", size: 8, line: { color: "black", width: 1 } }, hovertemplate: "%{y}<br>p75 %{x}<extra></extra>" },
      { type: "scatter", mode: "markers", y: yb, x: bl.map((b) => b.median), name: "Median", marker: { color: bl.map((b) => (b.who === "Civil" ? C.navy : C.orange)), size: 11, line: { color: "black", width: .5 } }, hovertemplate: "%{y}<br>median %{x} credits<extra></extra>" },
    ], base({ title: title("Credit blocks in the catalogs: median, 25th to 75th percentile"), height: 340, xaxis: { title: "Semester credits" }, yaxis: { autorange: "reversed", automargin: true, tickfont: { size: 11 } },
      shapes: bl.map((b, i) => ({ type: "line", x0: b.p25, x1: b.p75, y0: yb[i], y1: yb[i], line: { color: C.grey, width: 2 } })), margin: { l: 10, r: 10, t: 70, b: 50 } }), CFG);
    $("d-catalog-note").textContent = `Construction: ${num(K.cm.over_120_count)} programs print more than 120 and ${num(K.cm.exactly_120_count)} exactly 120; median general education ${num(K.cm.gen_ed_median)}, mathematics and science ${num(K.cm.math_science_median)}, business ${num(K.cm.business_median)}, major ${num(K.cm.major_median)}, free electives ${num(K.cm.free_electives_median, 1)}; ACCE programs publish a median of ${num(K.cm.acce_total_median)} credits, the others ${num(K.cm.nonacce_total_median)}. Civil engineering (comparison): median ${num(K.civil.total_median)} credits, ${num(K.civil.over_120_count)} of ${num(K.civil.with_total)} above 120, a median of ${num(K.civil.median_to_cut)} credits to cut.`;
    trace("trace-catalog", `Modules 06 (construction catalogs) and 10 (civil catalogs): distributions and blocks in ${link("data/study.json", "study.json")}; reading confidence per catalog is in the table below.`);
    const cp = toObjects(K.cm_programs, K.cm_program_columns);
    const groups = Array.from(new Set(cp.map((r) => r.program_group).filter(Boolean))).sort();
    const states = Array.from(new Set(cp.map((r) => r.STABBR).filter(Boolean))).sort();
    $("d-group").innerHTML += groups.map((g) => `<option>${g}</option>`).join("");
    $("d-state").innerHTML += states.map((g) => `<option>${g}</option>`).join("");
    const drawPrograms = () => {
      const g = $("d-group").value, s = $("d-state").value;
      const rows = cp.filter((r) => (!g || r.program_group === g) && (!s || r.STABBR === s)).sort((a, b) => (b.total_semester || 0) - (a.total_semester || 0));
      table($("d-programs"), ["Institution", "State", "Program", "Group", "Catalog", "Total", "General education", "Mathematics and science", "Business", "Major", "Free electives", "ACCE", "Reading confidence"],
        rows.map((r) => ({ cells: [r.INSTNM, r.STABBR, r.program, r.program_group, r.catalog_year, num(r.total_semester), num(r.gen_ed), num(r.math_science), num(r.business), num(r.major), num(r.free_electives), r.acce_bachelors === true || r.acce_bachelors === "True" ? "yes" : "", r.confidence] })), { num: [5, 6, 7, 8, 9, 10] });
    };
    ["d-group", "d-state"].forEach((id) => $(id).addEventListener("change", drawPrograms));
    drawPrograms();
    // Florida programs
    const P = toObjects(F.programs, F.columns);
    const fl = P.filter((r) => r.design === "FLOOR" && r.gen_ed === 36 && r.structure === "typical" && r.ready === true).sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || a.short.localeCompare(b.short));
    const keepOf = (r) => { const k = P.find((x) => x.unitid === r.unitid && x.field === r.field && x.design === "KEEP" && x.gen_ed === 36 && x.structure === "typical" && x.ready === true); return k ? k.credits : null; };
    const comp = toObjects(S.florida_model.composition, S.florida_model.composition_columns);
    table($("d-florida"), ["Institution", "Field", "Published total", "Courses read", "Required core kept (36 general education)", "Accreditor floor (36)", "Construction or engineering credits in the floor", "Business", "Mathematics and science", "General education only"],
      fl.map((r) => { const c = comp.find((x) => x.unitid === r.unitid && x.field === r.field && x.design === "FLOOR") || {}; return { hit: r.credits <= 90, cells: [r.short, r.group, num(r.published), num(c.courses), num(keepOf(r)), num(r.credits), num((c.construction || 0) + (c.engineering || 0)), num(c.business), num(c.math_science), num(c.gen_ed_only)] }; }), { num: [2, 3, 4, 5, 6, 7, 8, 9] });
    trace("trace-florida-data", `Module 15: ${res("15_curriculum_milp", "milp_florida_programs.csv")} (one row per program, design, general education total, area structure and entrant). Course lists: 01_raw_data/prerequisites.`);
    // the debate
    const ny = D.news_by_year;
    const stances = [["supportive", "Supportive", C.mint], ["mixed", "Mixed", C.lightOrange], ["neutral-report", "Neutral report", C.gray], ["critical", "Critical", C.pink]];
    Plotly.react("d-news", stances.map(([k, name, col]) => ({ type: "bar", x: ny.map((r) => String(r.year)), y: ny.map((r) => r[k]), name, marker: { color: col, line: { color: "black", width: .5 } } })),
      base({ title: title(`News items on reduced-credit degrees by year and stance (${num(D.news_relevant)} items; peak ${D.peak_month} with ${D.peak_count})`), barmode: "stack", height: 320, yaxis: { title: "Items" }, margin: { l: 50, r: 10, t: 70, b: 40 } }), CFG);
    const ac = Object.entries(D.actors || {}).sort((a, b) => b[1] - a[1]);
    Plotly.react("d-actors", [{ type: "bar", orientation: "h", y: ac.map((a) => a[0]), x: ac.map((a) => a[1]), marker: { color: C.blue, line: { color: "black", width: .5 } }, hovertemplate: "%{y}: %{x} items<extra></extra>" }],
      base({ title: title("Who drives the news, 2024 to 2026"), height: 320, xaxis: { title: "Items" }, yaxis: { autorange: "reversed", automargin: true }, margin: { l: 10, r: 10, t: 60, b: 50 }, showlegend: false }), CFG);
    const ssl = { none_found: "No action found", programs_approved: "Programs approved", board_policy_adopted: "Board policy adopted", proposed_or_study: "Proposed or under study", enacted_law: "Law enacted", pilot: "Pilot" };
    const ss = D.state_status.slice().sort((a, b) => b.count - a.count);
    Plotly.react("d-status", [{ type: "bar", orientation: "h", y: ss.map((r) => ssl[r.reduced_credit_status] || r.reduced_credit_status), x: ss.map((r) => r.count), marker: { color: C.mint, line: { color: "black", width: .5 } }, hovertemplate: "%{y}: %{x} states<extra></extra>" }],
      base({ title: title("Where the states stand on reduced-credit degrees"), height: 300, xaxis: { title: "States" }, yaxis: { autorange: "reversed", automargin: true }, margin: { l: 10, r: 10, t: 60, b: 50 }, showlegend: false }), CFG);
    const vo = D.voices.slice().sort((a, b) => b.total - a.total);
    Plotly.react("d-voices", [["supportive", "Supportive", C.mint], ["mixed", "Mixed", C.lightOrange], ["critical", "Critical", C.pink]].map(([k, name, col]) => ({ type: "bar", orientation: "h", y: vo.map((r) => r.speaker_type), x: vo.map((r) => r[k]), name, marker: { color: col, line: { color: "black", width: .5 } } })),
      base({ title: title("Who speaks, and with what stance"), barmode: "stack", height: 300, xaxis: { title: "Speakers" }, yaxis: { autorange: "reversed", automargin: true }, margin: { l: 10, r: 10, t: 70, b: 50 } }), CFG);
    trace("trace-news", `Module 14 (policy and debate): coding rules in 01_raw_data/discourse/coded/CODING_RULES.md; counts in ${link("data/study.json", "study.json")}.`);
  }

  // ================================================================ models
  async function model() {
    const [S, ST, SY, h] = await Promise.all([load("study"), load("student"), load("system"), load("headline")]);
    const FM = S.florida_model, P = S.parameters;
    const comp = toObjects(FM.composition, FM.composition_columns);
    // the FGCU ledger
    const host = $("m15-ledger");
    const SEG = [["construction", "Construction (ACCE asks 50)", C.orange], ["business", "Business (ACCE asks 12; economics also general education)", C.pink], ["math_science", "Mathematics and science (count toward general education)", C.blue], ["engineering", "Engineering", C.gray], ["gen_ed_only", "General education taken for itself", "white"]];
    const drawLedger = (replay) => {
      const design = $("m15-design").value;
      const r = comp.find((x) => x.unitid === 433660 && x.field === "CM" && x.design === design);
      if (!r) return;
      const total = r.credits, scale = 130;
      host.innerHTML = `<div class="ledger"><div class="track"><div class="mark" style="left:${(90 / scale) * 100}%"><span>90</span></div><div class="mark pub" style="left:${(r.published / scale) * 100}%"><span>published ${num(r.published)}</span></div>${SEG.map(([k, name, col]) => `<div class="seg" data-k="${k}" style="background:${col}" title="${name}"><span></span></div>`).join("")}</div><div class="total"><span class="v" id="m15-total"></span> credits</div><div class="legend">${SEG.map(([k, name, col]) => `<span><i style="background:${col}"></i>${name}: ${num(r[k])}</span>`).join("")}</div></div>`;
      const segs = Array.from(host.querySelectorAll(".seg"));
      const totalEl = $("m15-total");
      M.carry(totalEl, 0);
      let acc = 0;
      segs.forEach((el, i) => {
        const k = el.dataset.k, v = r[k] || 0, start = acc; acc += v;
        el.style.width = "0%";
        setTimeout(() => { el.style.width = (v / scale) * 100 + "%"; el.querySelector("span").textContent = v ? num(v) : ""; M.count(totalEl, start + v, (x) => num(x), 700); }, M.reduced ? 0 : 150 + i * 750);
      });
      $("m15-note").textContent = `${design === "FLOOR" ? "Accreditor floor" : "Required core kept"}: ${num(total)} credits, ${num(r.topics_kept)} topics kept, ${num(r.courses)} courses; general education counted ${num(r.math_science + (r.business ? 3 : 0) + r.gen_ed_only)} of 36 (mathematics and science, economics, and ${num(r.gen_ed_only)} taken for itself).`;
    };
    $("m15-design").addEventListener("change", () => drawLedger(true));
    const card = $("m15-card");
    const replay = document.createElement("button"); replay.type = "button"; replay.className = "tour-pill"; replay.textContent = "Replay"; card.appendChild(replay);
    replay.addEventListener("click", () => drawLedger(true));
    drawLedger(false);
    // what binds
    const B = toObjects(FM.binding, FM.binding_columns);
    const nameOf = (u, f) => { const c = comp.find((x) => x.unitid === u && FIELD_NAME[x.field] === f); return c ? c.short : String(u); };
    const bcm = B.filter((b) => b.field === "construction management").sort((a, b) => a.floor - b.floor), bcv = B.filter((b) => b.field === "civil").sort((a, b) => a.floor - b.floor);
    const rowsB = bcm.concat(bcv);
    const yB = rowsB.map((b) => `${nameOf(b.UNITID, b.field)} (${b.field === "civil" ? "Civil" : "CM"})`);
    Plotly.react("m15-binding", [
      { type: "scatter", mode: "markers", y: yB, x: rowsB.map((b) => b.without_gen_ed), name: "Without the general education rule", marker: { color: "white", size: 9, line: { color: "black", width: 1 } }, hovertemplate: "%{y}: %{x} credits without general education<extra></extra>" },
      { type: "scatter", mode: "markers", y: yB, x: rowsB.map((b) => b.floor), name: "Floor, every rule", marker: { color: rowsB.map((b) => (b.field === "civil" ? C.navy : C.orange)), size: 11, line: { color: "black", width: .5 } }, customdata: rowsB.map((b) => `general education adds ${num(b.gen_ed_burden)}, accreditor ${num(b.accreditor_burden)}, placement ${num(b.placement_burden)}`), hovertemplate: "%{y}: <b>%{x}</b><br>%{customdata}<extra></extra>" },
    ], base({ height: 120 + 22 * rowsB.length, xaxis: { title: "Semester credits", range: [30, 125] }, yaxis: { autorange: "reversed", automargin: true, tickfont: { size: 11 } },
      shapes: [shade90(30, rowsB.length), vline(90, rowsB.length), ...rowsB.map((b, i) => ({ type: "line", x0: b.without_gen_ed, x1: b.floor, y0: yB[i], y1: yB[i], line: { color: C.grey, width: 1.5 } }))], margin: { l: 10, r: 10, t: 40, b: 50 } }), CFG);
    const gb = (f) => median(B.filter((b) => b.field === f).map((b) => b.gen_ed_burden)), ab = (f) => median(B.filter((b) => b.field === f).map((b) => b.accreditor_burden));
    $("m15-why").textContent = `Read against the chart: the general education rule adds a median of ${num(gb("construction management"))} credits to a construction management program and ${num(gb("civil"))} to a civil program, because civil mathematics and science already stand in the state’s areas; the accreditor adds ${num(ab("construction management"))} and ${num(ab("civil"))}. The construction floor is the state’s rule more than ACCE’s.`;
    trace("trace-m15", `Module 15: ${res("15_curriculum_milp", "milp_florida_programs.csv")}, ${res("15_curriculum_milp", "milp_binding_rules.csv")}, ${res("15_curriculum_milp", "milp_plans_ge36.csv")} (the chosen courses), ${res("15_curriculum_milp", "summary.json")}; manuscript Figure 3 and Table 22.`);
    // Module B run
    const d = ST.construction;
    const mids = d.hist_edges.slice(0, -1).map((e, i) => (e + d.hist_edges[i + 1]) / 2);
    const totalF = d.hist.reduce((a, b) => a + b, 0);
    const runB = () => {
      const n = d.hist.length;
      M.tween(2600, (p) => {
        const y = d.hist.map((v, i) => { const q = Math.max(0, Math.min(1, (p - (i / n) * 0.35) / 0.65)); return v * q; });
        const drawn = Math.round(y.reduce((a, b) => a + b, 0));
        Plotly.react("m16-run", [{ type: "bar", x: mids, y, marker: { color: mids.map((m) => (m < 0 ? C.red : C.navy)) }, hovertemplate: "gain near %{x:$,.0f}: %{y:.0f} futures<extra></extra>" }],
          base({ title: title(`Futures drawn: ${num(drawn)} of ${num(totalF)}; median graduate’s lifetime gain`), height: 280, xaxis: { title: "Present value at graduation", tickprefix: "$", tickformat: ",.0f" }, yaxis: { title: "Futures", range: [0, Math.max(...d.hist) * 1.05] }, bargap: .05, margin: { l: 55, r: 10, t: 50, b: 45 }, showlegend: false }), CFG);
      }, M.easeOut);
    };
    const bpill = document.createElement("button"); bpill.type = "button"; bpill.className = "tour-pill"; bpill.textContent = "Run again"; $("m16-card").appendChild(bpill); bpill.addEventListener("click", runB);
    runB();
    const s16 = d.summary;
    $("m16-note").textContent = `${num(P["16_student_rdm"].n_futures)} futures per field; the median graduate loses in ${pct(s16.share_futures_median_graduate_loses)} of them; the central future breaks even at an entry penalty of ${pct(s16.breakeven_entry_penalty_central, 1)}.`;
    const pr = P["16_student_rdm"].ranges.construction, src = P["16_student_rdm"].sources || {};
    const fmtR = (k, v) => (Array.isArray(v) ? (Math.abs(v[1]) <= 1 && k !== "career_years" && k !== "pe_delay_years" ? `${pct(v[0], 1)} to ${pct(v[1], 1)}` : `${num(v[0], 2)} to ${num(v[1], 2)}`) : String(v));
    table($("m16-params"), ["Unknown", "Range drawn", "Where the range comes from"], Object.entries(pr).map(([k, v]) => ({ cells: [k.replace(/_/g, " "), fmtR(k, v), src[k] || src[k.replace(/_\w+$/, "_*")] || ""] })));
    // Module C run
    const Bands = toObjects(SY.bands, SY.bands_columns);
    const of = (s) => Bands.filter((r) => r.region === "United States" && r.field === "construction" && r.series === s).sort((a, b) => a.year - b.year);
    const ad = of("adopt"), s90 = of("s90");
    const runC = () => {
      const n = ad.length;
      M.tween(2800, (p) => {
        const k = Math.max(2, Math.round(n * p));
        const sl = (rows) => rows.slice(0, k);
        const band = (rows, name, color, fill) => [
          { type: "scatter", x: sl(rows).map((r) => r.year), y: sl(rows).map((r) => r.p90), mode: "lines", line: { width: 0 }, showlegend: false, hoverinfo: "skip" },
          { type: "scatter", x: sl(rows).map((r) => r.year), y: sl(rows).map((r) => r.p10), mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: fill, showlegend: false, hoverinfo: "skip" },
          { type: "scatter", x: sl(rows).map((r) => r.year), y: sl(rows).map((r) => r.p50), mode: "lines", line: { color, width: 2.5 }, name, hovertemplate: "%{x}: %{y:.0%}<extra>" + name + "</extra>" }];
        Plotly.react("m17-run", [...band(ad, "Programs offering a 90-credit option", C.navy, "rgba(0,114,178,.15)"), ...band(s90, "Entrants on the 90-credit track", C.orange, "rgba(230,159,0,.18)")],
          base({ title: title(`Adoption, median and 10th to 90th percentile, to ${sl(ad)[sl(ad).length - 1].year}`), height: 280, xaxis: { range: [ad[0].year, ad[n - 1].year] }, yaxis: { tickformat: ".0%", range: [0, 1] }, margin: { l: 50, r: 10, t: 70, b: 40 } }), CFG);
      }, M.easeInOut);
    };
    const cpill = document.createElement("button"); cpill.type = "button"; cpill.className = "tour-pill"; cpill.textContent = "Run again"; $("m17-card").appendChild(cpill); cpill.addEventListener("click", runC);
    runC();
    const s17 = SY.summary.us_construction;
    $("m17-note").textContent = `${num(P["17_system_rdm"].n_futures)} futures; by 2035 a median of ${pct(s17.adoption_2035.median)} of programs offer the option and ${pct(s17.share_90_track_2035.median)} of entrants take it; institutions lose money in ${pct(s17.share_futures_institutions_lose)} of futures.`;
    const pr17 = P["17_system_rdm"].ranges, src17 = P["17_system_rdm"].sources || {};
    table($("m17-params"), ["Unknown", "Range drawn", "Where the range comes from"], Object.entries(pr17).map(([k, v]) => ({ cells: [k.replace(/_/g, " "), Array.isArray(v) ? `${num(v[0], 2)} to ${num(v[1], 2)}` : String(v), src17[k] || ""] })));
    trace("trace-rdm", `Modules 16 and 17: ranges in each module’s parameters.json (copied into ${link("data/study.json", "study.json")}); results ${res("16_student_rdm", "summary.json")}, ${res("17_system_rdm", "yearly_bands.csv")}, ${res("17_system_rdm", "summary.json")}; manuscript Figures 5 and 6.`);
    // AI unknowns, grid, atlas
    const pr18 = P["18_ai_futures"].ranges, ne = P["18_ai_futures"].neutral || {}, src18 = P["18_ai_futures"].sources || {};
    const srcOf = (k) => src18[k] || Object.entries(src18).find(([s]) => s.endsWith("*") && k.startsWith(s.slice(0, -1)))?.[1] || "";
    table($("m18-params"), ["Unknown", "Range drawn", "Neutral value", "Evidence"], Object.entries(pr18).map(([k, v]) => ({ cells: [k.replace(/_/g, " "), Array.isArray(v) ? `${num(v[0], 2)} to ${num(v[1], 2)}` : String(v), ne[k] == null ? "" : num(ne[k], 2), srcOf(k)] })));
    $("grid-text").innerHTML = `<p><b>Policy grid (Module 22).</b> ${num(FM.policy_grid.programs)} Florida programs solved ${num(FM.policy_grid.solves)} times: state general education 36, 30, 24, 21 or 15 credits; 0 or 12 major credits counted toward it; the accreditor’s numbers held at 100% down to 50% or given up; courses as published, merged as the leanest quarter of accredited programs, merged with AI support (35% fewer credits) or, at FGCU, merged where syllabi repeat; merged credits counted or competence recognized; four pricing and funding rules for the money per graduate.</p>
      <p><b>Scenario atlas (Module 23).</b> ${num(FM.atlas.programs)} programs, ${num(FM.atlas.combinations)} combinations, ${num(FM.atlas.solves)} solves: what the state does (five choices), what the accreditor does (six), seven AI futures, merging, a required AI course and state recognition of competence. Twelve stories are read at FGCU; the central case (Louisiana’s rule for the state, an accreditor that counts competence, tuition per credit, funding by enrollment) is the authors’ choice, and every alternative is solved.</p>
      <p>Files: ${res("22_policy_scenarios", "summary.json")}, ${res("22_policy_scenarios", "threshold_by_program.csv")}, ${res("23_scenario_atlas", "atlas_results.csv.gz")}, ${res("23_scenario_atlas", "story_table.csv")}.</p>`;
    trace("trace-grid", `Module 18: ${res("18_ai_futures", "curriculum_ai_floors.csv")}, ${res("18_ai_futures", "credit_share_by_type.csv")}, ${res("18_ai_futures", "summary.json")}; manuscript Figures 9 to 12, Tables 25 and 26.`);
  }

  // ================================================================ florida results
  async function florida() {
    const [F, O, h, A] = await Promise.all([load("floors"), load("overlap"), load("headline"), load("atlas")]);
    const P = toObjects(F.programs, F.columns);
    // fit
    const drawFit = () => {
      const fld = $("fit-field").value, design = $("fit-design").value, ge = +$("fit-ge").value, struct = $("fit-struct").value, ready = $("fit-ready").value === "true";
      let rows = P.filter((r) => r.design === design && r.gen_ed === ge && r.structure === struct && r.ready === ready && (fld === "all" || r.field === "CM"));
      const other = P.filter((r) => r.design === (design === "FLOOR" ? "KEEP" : "FLOOR") && r.gen_ed === ge && r.structure === struct && r.ready === ready);
      rows.sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || b.credits - a.credits);
      const y = rows.map((r) => `${r.short} (${r.field})`);
      const otherOf = (r) => { const o = other.find((x) => x.unitid === r.unitid && x.field === r.field); return o ? o.credits : null; };
      const xmax = Math.max(150, ...rows.map((r) => Math.max(r.published || 0, r.credits || 0, otherOf(r) || 0))) + 5;
      const traces = [
        { type: "scatter", mode: "markers", x: rows.map((r) => r.published), y, name: "Published total", marker: { symbol: "diamond", color: "black", size: 9 }, hovertemplate: "%{y}<br>published %{x} credits<extra></extra>" },
        { type: "scatter", mode: "markers", x: rows.map(otherOf), y, name: design === "FLOOR" ? "Required core kept" : "Accreditor floor", marker: { color: design === "FLOOR" ? C.lightOrange : C.blue, size: 9, line: { color: "black", width: .5 } }, hovertemplate: "%{y}<br>%{x} credits<extra></extra>" },
        { type: "scatter", mode: "markers", x: rows.map((r) => r.credits), y, name: design === "FLOOR" ? "Accreditor floor" : "Required core kept", marker: { color: rows.map((r) => (r.field === "CM" ? C.orange : r.field === "CET" ? C.grey : C.navy)), size: 12, line: { color: "black", width: .6 } },
          text: rows.map((r) => `${r.terms15 ? r.terms15 + " regular terms at 15 credits; " : ""}three years at 15: ${r.three_years_15 ? "yes" : "no"}, at 18: ${r.three_years_18 ? "yes" : "no"}`), hovertemplate: "%{y}<br><b>%{x} credits</b><br>%{text}<extra></extra>" },
      ];
      const shapes = rows.map((r, i) => ({ type: "line", x0: Math.min(r.credits, r.published, otherOf(r) || r.credits), x1: Math.max(r.credits, r.published, otherOf(r) || r.credits), y0: y[i], y1: y[i], line: { color: C.grey, width: 1 } }));
      shapes.push(shade90(40, rows.length), vline(90, rows.length));
      Plotly.react("fit-chart", traces, base({ height: 120 + 26 * rows.length, xaxis: { title: "Semester credits", range: [40, xmax], dtick: 10 }, yaxis: { autorange: "reversed", automargin: true, tickfont: { size: 12 } }, shapes, margin: { l: 10, r: 20, t: 40, b: 50 } }), CFG);
      const byField = {};
      rows.forEach((r) => { byField[r.field] = byField[r.field] || [0, 0]; byField[r.field][1]++; if (r.credits <= 90) byField[r.field][0]++; });
      $("fit-note").textContent = `${design === "FLOOR" ? "At the accreditor floor" : "With the required core kept"}, ${ge} credits of general education, ${struct === "typical" ? "typical areas" : "Florida’s minimum areas"}, ${ready ? "college-ready" : "not-ready"} entrant: ` +
        Object.entries(byField).map(([f, [a, b]]) => `${a} of ${b} ${f === "CM" ? "construction management" : f === "Civil" ? "civil" : "construction technology"} programs reach 90`).join("; ") + ". Florida Tech, Miami, Everglades and the Polytechnic University of Puerto Rico are private and not bound by the 36-credit rule; they are solved under it for comparison.";
    };
    ["fit-field", "fit-design", "fit-ge", "fit-struct", "fit-ready"].forEach((id) => $(id).addEventListener("change", drawFit));
    drawFit();
    trace("trace-fit", `Module 15: ${res("15_curriculum_milp", "milp_florida_programs.csv")}, ${res("15_curriculum_milp", "summary.json")}; manuscript Figure 3a, Table 22.`);
    // overlap
    const L = toObjects(O.ledger, O.ledger_columns);
    const drawOverlap = () => {
      const fld = $("ov-field").value;
      const rows = L.filter((r) => fld === "all" || r.field === "CM").sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || a.from_required - b.from_required);
      const y = rows.map((r) => `${r.short}${r.official ? "" : "*"} (${r.field})`);
      const seg = [["ge_only", "Taken for general education only", "white"], ["other", "Other required course", C.gray], ["communication", "Communication", C.mint], ["econ_business", "Economics or business", C.pink], ["math_science", "Mathematics and science", C.blue]];
      Plotly.react("overlap-chart", seg.map(([k, name, col]) => ({ type: "bar", orientation: "h", y, x: rows.map((r) => r[k]), name, marker: { color: col, line: { color: "black", width: .5 } }, hovertemplate: "%{y}<br>" + name + ": %{x} credits<extra></extra>" })),
        base({ barmode: "stack", height: 140 + 26 * rows.length, xaxis: { title: "Semester credits eligible for general education (white: added to reach 36)", dtick: 6 }, yaxis: { autorange: "reversed", automargin: true, tickfont: { size: 12 } }, shapes: [vline(36, rows.length, "black", "dash")], margin: { l: 10, r: 20, t: 60, b: 50 } }), CFG);
      $("overlap-note").textContent = `Bars longer than 36 show required courses eligible beyond what the areas absorb. Construction management programs require a median of ${num(h.m24.cm_overlap_med)} eligible credits${fld === "all" ? `, civil programs ${num(h.m24.cv_overlap_med)}` : ""}. Asterisk: private institution, where course prefix and level decide eligibility because the Board of Governors approves no list; Seminole State’s list is its 2026-27 catalog.`;
    };
    $("ov-field").addEventListener("change", drawOverlap);
    drawOverlap();
    const lev = O.lever.map((r) => ({ unitid: r[0], field: r[1], ge: r[2], regime: r[3], credits: r[4] }));
    const cm = L.filter((r) => r.field === "CM").sort((a, b) => a.short.localeCompare(b.short));
    const regimes = [["today", "Today’s lists", "black"], ["business foundations count", "Business foundations count", C.orange], ["any 12 major credits (Louisiana)", "Any 12 major credits", C.navy]];
    const levOf = (r, rg) => { const z = lev.find((l) => l.unitid === r.unitid && l.field === "construction management" && l.ge === 36 && l.regime === rg); return z ? z.credits : null; };
    const lmax = Math.max(...cm.map((r) => Math.max(...regimes.map(([rg]) => levOf(r, rg) || 0)))) + 3;
    Plotly.react("lever-chart", regimes.map(([rg, name, col]) => ({ type: "scatter", mode: "markers", name, marker: { color: col, size: 10, line: { color: "black", width: .4 } }, y: cm.map((r) => r.short), x: cm.map((r) => levOf(r, rg)), hovertemplate: "%{y}<br>" + name + ": %{x} credits<extra></extra>" })),
      base({ height: 360, xaxis: { title: "Floor, semester credits, 36 credits of general education", range: [78, lmax] }, yaxis: { automargin: true }, shapes: [shade90(78, cm.length), vline(90, cm.length)], margin: { l: 10, r: 10, t: 50, b: 50 } }), CFG);
    table($("diff-table"), ["Program", "Course", "Credits", "Change", "Area"], O.differences.map((d) => ({ cells: [`${d[0].replace("University of ", "").replace(" University", "")} (${d[1] === "civil" ? "Civil" : "CM"})`, `${d[2]} ${d[3]}`, d[4], d[5], d[7] || d[6]] })), { num: [2] });
    const sel = $("courses-program");
    sel.innerHTML = L.slice().sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || a.short.localeCompare(b.short)).map((r) => `<option value="${r.unitid}|${r.field}">${r.short} (${r.field})</option>`).join("");
    const drawCourses = () => {
      const [u, f] = sel.value.split("|");
      const rows = O.courses.filter((c) => String(c[0]) === u && c[1] === FIELD_NAME[f]).sort((a, b) => (b[6] ? 1 : 0) - (a[6] ? 1 : 0) || a[2].localeCompare(b[2]));
      table($("courses-table"), ["Course", "Credits", "Kind", "General education area on the list", "State core option", "Counted in the solution that keeps the core"], rows.map((c) => ({ hit: !!c[8], cells: [`${c[2]} ${c[3]}`, c[4], c[5], c[6] || "", c[7] === true || c[7] === "True" ? "yes" : "", c[8] ? "yes" : ""] })), { num: [1] });
    };
    sel.addEventListener("change", drawCourses);
    sel.value = "433660|CM";
    drawCourses();
    trace("trace-overlap", `Module 24: ${res("24_gen_ed_overlap", "overlap_by_program.csv")}, ${res("24_gen_ed_overlap", "overlap_courses.csv")}, ${res("24_gen_ed_overlap", "list_versus_rule.csv")}, ${res("24_gen_ed_overlap", "lever_business_as_gen_ed.csv")}; lists ${res("policy", "gen_ed_lists_sus_2026-27.csv")}, ${res("policy", "gen_ed_lists_fcs_2026-27.csv")}; manuscript Figure 4, Table 23.`);
    // finder (largest file, loaded here)
    finder().catch(console.error);
    // atlas
    const cells = toObjects(A.cells, A.cells_columns);
    const STATES = [["36", "Keeps 36"], ["36_major12", "36, 12 major<br>credits count"], ["30", "Lowers to 30"], ["21", "Area minimums<br>only (21)"], ["15", "State core<br>only (15)"]];
    const ACC = [["none", "No<br>change"], ["minus20", "Number<br>20% lower"], ["half", "Number<br>halved"], ["competence", "Counts<br>competence"], ["minus20_competence", "20% lower,<br>competence"], ["leave", "Program<br>leaves"]];
    const AIS = ["none", "F3", "F2", "F5", "F4", "F1", "ceiling"];
    const drawAtlas = () => {
      const ai = $("a-ai").value, merge = $("a-merge").value, lit = +$("a-lit").value, srec = +$("a-srec").value;
      [["CM", "atlas-cm", "Construction management, 8 programs", 330], ["Civil", "atlas-cv", "Civil engineering, 12 programs (comparison)", 330]].forEach(([f, id, t, hgt]) => {
        const find = (s, a) => cells.find((x) => x.field === f && x.ai === ai && x.merge === merge && x.ai_literacy === lit && x.state_rec === srec && x.state === s && x.accreditor === a);
        const z = STATES.map(([s]) => ACC.map(([a]) => { const c = find(s, a); return c ? c.reach_90 : null; }));
        const med = STATES.map(([s]) => ACC.map(([a]) => { const c = find(s, a); return c ? c.median_credits : null; }));
        const n = f === "CM" ? 8 : 12;
        Plotly.react(id, [{ type: "heatmap", z, x: ACC.map((a) => a[1]), y: STATES.map((s) => s[1]), zmin: 0, zmax: n, colorscale: [[0, "#f4f6f4"], [0.5, "#9ccf8f"], [1, "#2E7D32"]], showscale: false, text: z, texttemplate: "%{text}", textfont: { color: "black", size: 13 }, customdata: med, hovertemplate: "State: %{y}<br>Accreditor: %{x}<br><b>%{z} of " + n + " reach 90</b>, median %{customdata} credits<extra></extra>", xgap: 3, ygap: 3 }],
          base({ title: title(t), height: hgt, xaxis: { tickfont: { size: 10 }, tickangle: 0, automargin: true, side: "bottom" }, yaxis: { autorange: "reversed", tickfont: { size: 10 }, automargin: true }, margin: { l: 10, r: 10, t: 40, b: 10 } }), CFG);
      });
    };
    ["a-ai", "a-merge", "a-lit", "a-srec"].forEach((id) => $(id).addEventListener("change", drawAtlas));
    const atour = Tour({ host: $("atlas-host"), steps: AIS.length, show: (i) => { $("a-ai").value = AIS[i]; drawAtlas(); }, every: 3600, label: "AI futures", stopOn: ".chart" });
    $("a-ai").addEventListener("change", () => atour.go(AIS.indexOf($("a-ai").value)));
    const st = A.stories;
    const y = st.map((s) => s.story);
    const smin = Math.min(...st.map((s) => Math.min(s.fgcu_cm_credits, s.fgcu_cv_credits))) - 8;
    Plotly.react("story-chart", [
      { type: "scatter", mode: "markers+text", name: "FGCU construction management", y, x: st.map((s) => s.fgcu_cm_credits), marker: { symbol: "square", color: C.orange, size: 12, line: { color: "black", width: .5 } }, text: st.map((s) => s.fgcu_cm_credits), textposition: "middle left", textfont: { color: C.ink, size: 11 }, customdata: st.map((s) => `${s.cm_reach_90} of ${s.cm_programs} construction programs reach 90`), hovertemplate: "%{y}<br>FGCU construction %{x} credits<br>%{customdata}<extra></extra>" },
      { type: "scatter", mode: "markers+text", name: "FGCU civil engineering (comparison)", y, x: st.map((s) => s.fgcu_cv_credits), marker: { color: C.navy, size: 11, line: { color: "black", width: .5 } }, text: st.map((s) => s.fgcu_cv_credits), textposition: "middle right", textfont: { color: C.ink, size: 11 }, customdata: st.map((s) => `${s.cv_reach_90} of ${s.cv_programs} civil programs reach 90`), hovertemplate: "%{y}<br>FGCU civil %{x} credits<br>%{customdata}<extra></extra>" },
    ], base({ height: 440, xaxis: { title: "FGCU, fewest credits that meet every rule", range: [smin, 112] }, yaxis: { autorange: "reversed", automargin: true }, shapes: [shade90(smin, st.length), vline(90, st.length)], margin: { l: 10, r: 10, t: 50, b: 50 } }), CFG);
    const STL = { "36": "keeps 36", "36_major12": "12 major credits count", "30": "lowers to 30", "21": "area minimums", "15": "core only" };
    table($("story-table"), ["Story", "State", "Accreditor", "Merging", "AI future", "Construction at 90", "Civil at 90", "FGCU construction credits", "Student", "University", "State budget"],
      st.map((s) => ({ hit: s.cm_reach_90 >= 4, cells: [s.story, STL[String(s.state)] || s.state, s.accreditor.replace("_", ", "), s.merge === "none" ? "as published" : "as peers do", s.ai + (s.ai_literacy ? ", AI course" : ""), `${s.cm_reach_90} of ${s.cm_programs}`, `${s.cv_reach_90} of ${s.cv_programs}`, s.fgcu_cm_credits, money(s.fgcu_cm_student), money(s.fgcu_cm_institution), money(s.fgcu_cm_state)] })), { num: [7, 8, 9, 10] });
    trace("trace-atlas", `Module 23: ${res("23_scenario_atlas", "reach_by_cell.csv")}, ${res("23_scenario_atlas", "story_table.csv")}, ${res("23_scenario_atlas", "story_money_all_rules.csv")}; manuscript Figure 12, Section 4.7.`);
  }

  async function finder() {
    const P = await load("policy");
    const rows = toObjects(P.rows, P.columns);
    const idx = {};
    rows.forEach((r) => { const k = [r.field, r.design, r.merge, r.recognition, r.gen_ed, r.major_cap, r.floor_share].join("|"); (idx[k] = idx[k] || []).push(r); });
    const mon = toObjects(P.fgcu_money, P.fgcu_money_columns);
    const midx = {};
    mon.forEach((r) => { midx[[r.field, r.design, r.merge, r.recognition, r.gen_ed, r.major_cap, r.floor_share, r.pricing, r.funding].join("|")] = r; });
    const draw = () => {
      const field = $("f-field").value, design = $("f-design").value, ge = +$("f-ge").value, cap = +$("f-cap").value, share = +$("f-share").value, merge = $("f-merge").value, rec = +$("f-rec").value;
      let found = idx[[field, design, merge, rec, ge, cap, share].join("|")] || [];
      let note = "";
      if (merge === "none" && rec === 1) { found = idx[[field, design, merge, 0, ge, cap, share].join("|")] || []; note = "With no merging there is nothing to recognize; results shown for credits counted. "; }
      if (merge === "syllabus") note += "Syllabus-based merging was read only at FGCU; other programs show no result. ";
      if (!found.length) { $("finder-result").innerHTML = `<span class="no">No solved combination.</span> ${note}`; Plotly.purge("finder-chart"); return; }
      found.sort((a, b) => a.credits - b.credits);
      const n90 = found.filter((r) => r.credits <= 90).length;
      const [pricing, funding] = $("f-money").value.split("|");
      const mk = midx[[field, design, merge, merge === "none" ? 0 : rec, ge, cap, share, pricing, funding].join("|")];
      const fg = found.find((r) => r.unitid === 433660);
      const moneyText = mk ? ` At FGCU (${fg ? fg.credits : "?"} credits) the money per graduate is <b>${moneyFull(mk.student)}</b> to the student, <b>${moneyFull(mk.institution)}</b> to the university and <b>${moneyFull(mk.state)}</b> to the state under this pricing and funding rule.` : "";
      $("finder-result").innerHTML = `<span class="${n90 ? "ok" : "no"}">${n90} of ${found.length} ${field === "CM" ? "construction management" : "civil"} programs reach 90 credits</span> (median ${median(found.map((r) => r.credits))}).${moneyText} ${note}`;
      Plotly.react("finder-chart", [{ type: "bar", orientation: "h", y: found.map((r) => r.short), x: found.map((r) => r.credits), marker: { color: found.map((r) => (r.credits <= 90 ? C.green : field === "CM" ? C.orange : C.navy)), line: { color: "black", width: .4 } }, text: found.map((r) => r.credits), textposition: "outside", textfont: { color: C.ink }, hovertemplate: "%{y}: %{x} credits (published %{customdata})<extra></extra>", customdata: found.map((r) => r.published) }],
        base({ height: 80 + 26 * found.length, xaxis: { title: "Fewest credits that meet every rule", range: [0, 135] }, yaxis: { autorange: "reversed", automargin: true }, shapes: [vline(90, found.length, C.green, "dash")], margin: { l: 10, r: 30, t: 10, b: 50 }, showlegend: false }), CFG);
    };
    ["f-field", "f-design", "f-ge", "f-cap", "f-share", "f-merge", "f-rec", "f-money"].forEach((id) => $(id).addEventListener("change", draw));
    draw();
    trace("trace-finder", `Module 22: scenario_results.csv (${num(rows.length)} rows carried in ${link("data/policy.json", "policy.json")}), ${res("22_policy_scenarios", "summary.json")}, ${res("22_policy_scenarios", "threshold_by_program.csv")}; manuscript Figure 11, Section 4.6.`);
  }

  // ================================================================ futures
  async function futures() {
    const [S, Y, A, h] = await Promise.all([load("student"), load("system"), load("ai"), load("headline")]);
    // student
    const drawStudent = () => {
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
        base({ title: title("Median graduate’s gain across 20,000 futures"), height: 340, xaxis: { title: "Present value at graduation", tickprefix: "$", tickformat: ",.0f" }, yaxis: { title: "Futures" }, bargap: .05, margin: { l: 60, r: 10, t: 50, b: 50 }, showlegend: false }), CFG);
      const px = edges.slice(0, -1).map((e, i) => (e + edges[i + 1]) / 2);
      Plotly.react("st-cond", [
        { type: "scatter", x: px, y: d.conditional.map((r) => r[2]), mode: "lines", line: { width: 0 }, showlegend: false, hoverinfo: "skip" },
        { type: "scatter", x: px, y: d.conditional.map((r) => r[1]), mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: "rgba(0,114,178,.15)", name: "10th to 90th percentile", hoverinfo: "skip" },
        { type: "scatter", x: px, y: d.conditional.map((r) => r[0]), mode: "lines", line: { color: C.navy, width: 2 }, name: "Median", hovertemplate: "penalty %{x:.1%}: median gain %{y:$,.0f}<extra></extra>" },
        { type: "scatter", x: [pen], y: [c[0]], mode: "markers", marker: { color: C.orange, size: 12, line: { color: "black", width: .5 } }, name: "Chosen penalty", hoverinfo: "skip" },
      ], base({ title: title("Gain by the entry earnings penalty"), height: 340, xaxis: { title: "Entry earnings penalty", tickformat: ".0%" }, yaxis: { title: "Median graduate’s gain", tickprefix: "$", tickformat: ",.0f" }, shapes: [{ type: "line", x0: 0, x1: edges[edges.length - 1], y0: 0, y1: 0, line: { color: "black", width: 1 } }], margin: { l: 70, r: 10, t: 70, b: 50 } }), CFG);
      const fx = d.fade_edges.slice(0, -1).map((e, i) => (e + d.fade_edges[i + 1]) / 2);
      Plotly.react("st-grid", [{ type: "heatmap", z: d.lose_grid, x: fx, y: px, colorscale: [[0, "#f7fbff"], [0.5, "#f4a261"], [1, "#8B2E2B"]], zmin: 0, zmax: 1, colorbar: { title: { text: "Share<br>losing", side: "top" }, tickformat: ".0%", thickness: 12, len: .8 }, hovertemplate: "penalty %{y:.1%}, fade %{x:.1%} a year: %{z:.0%} of futures lose<extra></extra>" }],
        base({ title: title("Where the median graduate loses: penalty against its yearly fade"), height: 340, xaxis: { title: "Yearly fade of the penalty", tickformat: ".0%" }, yaxis: { title: "Entry earnings penalty", tickformat: ".0%" }, margin: { l: 70, r: 10, t: 50, b: 50 } }), CFG);
      const sob = s.sobol_median_gain.slice().sort((a, b) => b.ST - a.ST);
      Plotly.react("st-sobol", [{ type: "bar", orientation: "h", y: sob.map((r) => r.factor.replace(/_/g, " ")), x: sob.map((r) => r.ST), marker: { color: C.navy }, error_x: { type: "data", array: sob.map((r) => r.ST_conf), color: "black", thickness: 1 }, hovertemplate: "%{y}: total index %{x:.2f}<extra></extra>" }],
        base({ title: title("Which unknown decides: Sobol total index"), height: 340, xaxis: { title: "Share of the variance of the median gain", range: [0, 1] }, yaxis: { autorange: "reversed", automargin: true }, margin: { l: 160, r: 10, t: 50, b: 50 }, showlegend: false }), CFG);
      const box = s.prim && s.prim[0] && s.prim[0].box ? Object.entries(s.prim[0].box).map(([k, v]) => `${k.replace(/_/g, " ")} ${k === "career_years" ? v[0].toFixed(0) + " to " + v[1].toFixed(0) : pct(v[0], 1) + " to " + pct(v[1], 1)}`).join("; ") : "";
      $("st-note").textContent = `Scenario discovery (PRIM): the futures in which the median graduate loses sit in one box, ${box} (coverage ${pct(s.prim[0].coverage)}, density ${pct(s.prim[0].density)}). ${s.programs} programs, ${num(s.graduates_2024)} graduates in 2024, a median of ${s.median_credits_removed} credits removed.`;
    };
    $("st-field").addEventListener("change", drawStudent);
    $("st-pen").addEventListener("input", drawStudent);
    drawStudent();
    trace("trace-student", `Module 16: ${res("16_student_rdm", "summary.json")}, ${res("16_student_rdm", "programs_used.csv")}, ${res("16_student_rdm", "sobol_construction_median_gain.csv")}; manuscript Figure 5, Section 4.3.`);
    // system
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
    const drawSystem = () => {
      const region = $("sy-region").value, field = $("sy-field").value;
      const of = (s) => B.filter((r) => r.region === region && r.field === field && r.series === s).sort((a, b) => a.year - b.year);
      Plotly.react("sy-adopt", [...band(of("adopt"), "Programs offering a 90-credit option", "rgb(0,114,178)", "%{y:.0%}"), ...band(of("s90"), "Entrants on the 90-credit track", "rgb(230,159,0)", "%{y:.0%}")],
        base({ title: title("Adoption, median and 10th to 90th percentile"), height: 340, xaxis: { title: "Year" }, yaxis: { tickformat: ".0%", rangemode: "tozero" }, margin: { l: 50, r: 10, t: 80, b: 50 } }), CFG);
      Plotly.react("sy-grads", [...band(of("G_base"), "Graduates without the option", "rgb(154,154,154)", "%{y:,.0f}"), ...band(of("G"), "Graduates with the option", "rgb(59,122,42)", "%{y:,.0f}")],
        base({ title: title("Bachelor’s graduates a year"), height: 340, xaxis: { title: "Year" }, yaxis: { rangemode: "tozero", tickformat: ",.0f" }, margin: { l: 60, r: 10, t: 80, b: 50 } }), CFG);
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
    ["sy-region", "sy-field"].forEach((id) => $(id).addEventListener("change", drawSystem));
    drawSystem();
    trace("trace-system", `Module 17: ${res("17_system_rdm", "yearly_bands.csv")}, ${res("17_system_rdm", "summary.json")}; manuscript Figure 6, Section 4.4.`);
    // AI
    const Fl = toObjects(A.floors, A.floors_columns);
    const drawAI = () => {
      const field = $("ai-field").value, region = $("ai-region").value;
      const cases = [["no_ai", "Without AI", C.gray], ["ai", "With AI", "#5DADE2"], ["ai_wil", "With AI and a paid work-integrated year", "#58B368"]];
      const groups = [["students", "Students"], ["industry", "Industry"], ["states", "States"], ["institutions", "Institutions"]];
      const traces = cases.map(([k, name, col]) => { const L = A.ledger[`${region}|${field}|${k}`]; if (!L) return null; return { type: "bar", name, x: groups.map((g) => g[1]), y: groups.map(([g]) => L[g].median / 1e6), marker: { color: col, line: { color: "black", width: .4 } }, customdata: groups.map(([g]) => pct(L[g].share_positive)), hovertemplate: "%{x}, " + name + "<br>median %{y:$,.1f}M, gains in %{customdata} of futures<extra></extra>" }; }).filter(Boolean);
      Plotly.react("ai-ledger", traces, base({ title: title(`Who gains and who loses, ${region} ${field}, present value 2027 to 2050`), barmode: "group", height: 380, yaxis: { title: "Million USD", tickprefix: "$", zeroline: true }, margin: { l: 60, r: 10, t: 80, b: 50 } }), CFG);
      const fld = field === "construction" ? "CM" : "Civil";
      const rows = Fl.filter((r) => r.field === fld && r.scope === "accreditor content" && r.recognition === "sampled recognition").sort((a, b) => b.floor - a.floor);
      Plotly.react("ai-floors", [
        { type: "scatter", mode: "markers", name: "Floor without AI", y: rows.map((r) => r.short), x: rows.map((r) => r.floor), marker: { color: "black", size: 9 }, hovertemplate: "%{y}: %{x} credits<extra>without AI</extra>" },
        { type: "scatter", mode: "markers", name: "With guarded AI tutoring, median of futures", y: rows.map((r) => r.short), x: rows.map((r) => r.median), error_x: { type: "data", symmetric: false, array: rows.map((r) => r.p90 - r.median), arrayminus: rows.map((r) => r.median - r.p10), color: C.navy, thickness: 1 }, marker: { color: fld === "CM" ? C.orange : C.navy, size: 10, line: { color: "black", width: .5 } }, customdata: rows.map((r) => pct(r.share_le90)), hovertemplate: "%{y}: %{x:.1f} credits, at or below 90 in %{customdata} of futures<extra>with AI</extra>" },
      ], base({ title: title("Floors with the study time AI saves, on the evidence from trials"), height: 380, xaxis: { title: "Credits", range: [40, 125] }, yaxis: { automargin: true, autorange: "reversed" }, shapes: [shade90(40, rows.length), vline(90, rows.length)], margin: { l: 10, r: 10, t: 80, b: 50 } }), CFG);
      const ms = A.ms;
      $("ai-note").textContent = `On the evidence from trials the median Florida floor is ${num(ms.cm_content_sampled_floor)} credits in construction management and ${num(ms.cv_content_sampled_floor)} in civil engineering; ${ms.states_le90_without_ai} states would have a construction floor of 90 or fewer, and a required 3-credit AI literacy course would lift ${ms.states_pushed_over_90_by_3_literacy} of them above 90. The median construction graduate gains ${money(ms.construction_ai_gain_per_graduate)} with AI and ${money(ms.construction_ai_wil_gain_per_graduate)} with a paid work year.`;
    };
    ["ai-field", "ai-region"].forEach((id) => $(id).addEventListener("change", drawAI));
    drawAI();
    trace("trace-ai", `Module 18: ${res("18_ai_futures", "curriculum_ai_floors.csv")}, ${res("18_ai_futures", "summary.json")}; manuscript Figures 9 and 10, Tables 25 and 26.`);
  }

  // ================================================================ other states
  async function states() {
    const [F, h] = await Promise.all([load("floors"), load("headline")]);
    const S = toObjects(F.states, F.state_columns);
    let pts = null;
    try { const G = await load("programs"); pts = toObjects(G.rows, G.columns).filter((p) => p.group === "Construction management" && p.lon != null); } catch (e) { pts = null; }
    const RULES = ["floor_cm", "floor_cm_business", "floor_cm_louisiana"];
    const noteEl = $("map-note");
    const drawMap = () => {
      const rule = $("map-rule").value;
      const vals = S.map((s) => s[rule]);
      const traces = [{ type: "choropleth", locationmode: "USA-states", locations: S.map((s) => s.abbr), z: vals, zmin: 80, zmax: 105,
        colorscale: [[0, "#2E7D32"], [0.2, "#A5D6A7"], [0.4, "#FFE0B2"], [0.6, "#F4A261"], [0.8, "#C0504D"], [1, "#8B2E2B"]],
        text: S.map((s) => `${s.state}: general education ${s.gen_ed == null ? "no statewide number (counted at 30)" : s.gen_ed + " credits"}<br>${s.programs} construction management program${s.programs === 1 ? "" : "s"}<br>status: ${s.status}`),
        hovertemplate: "<b>%{location}</b> floor %{z} credits<br>%{text}<extra></extra>", colorbar: { title: { text: "Floor" }, thickness: 12, len: .6 }, marker: { line: { color: "white", width: .5 } } }];
      if (pts && $("map-points").checked) traces.push({ type: "scattergeo", locationmode: "USA-states", lon: pts.map((p) => p.lon), lat: pts.map((p) => p.lat), mode: "markers", marker: { size: 5, color: "black", opacity: .8 },
        text: pts.map((p) => `${p.name} (${p.state})<br>${p.program}, ${p.total ? p.total + " credits" : "total not stated"}${p.acce ? ", ACCE accredited" : ""}<br>${p.grads_2024 || 0} graduates in 2024`), hovertemplate: "%{text}<extra></extra>", name: "Programs" });
      Plotly.react("map-chart", traces, base({ height: 440, geo: { scope: "usa", showlakes: false, bgcolor: "white" }, margin: { l: 0, r: 0, t: 10, b: 0 }, showlegend: false }), CFG);
      const n = S.filter((s) => s[rule] <= 90).length, np_ = S.filter((s) => s[rule] <= 90).reduce((a, s) => a + s.programs, 0), tot = S.reduce((a, s) => a + s.programs, 0);
      noteEl.innerHTML = `<b><span id="map-n"></span> of 51</b> states at or below 90 credits under this rule, holding ${np_} of ${tot} construction management programs with a stated total in the 50 states and the District of Columbia. Florida: ${S.find((s) => s.abbr === "FL")[rule]} credits.`;
      M.count($("map-n"), n, (v) => String(Math.round(v)), 700);
      const buckets = [["85 or fewer", (v) => v <= 85], ["86 to 90", (v) => v > 85 && v <= 90], ["91 to 95", (v) => v > 90 && v <= 95], ["96 to 100", (v) => v > 95 && v <= 100], ["Over 100", (v) => v > 100]];
      Plotly.react("map-hist", [{ type: "bar", x: buckets.map((b) => b[0]), y: buckets.map(([, f]) => S.filter((s) => f(s[rule])).length), marker: { color: ["#2E7D32", "#A5D6A7", "#FFE0B2", "#F4A261", "#C0504D"], line: { color: "black", width: .5 } }, text: buckets.map(([, f]) => S.filter((s) => f(s[rule])).reduce((a, s) => a + s.programs, 0) + " programs"), textposition: "outside", textfont: { color: C.ink, size: 11 }, hovertemplate: "%{x}: %{y} states, %{text}<extra></extra>" }],
        base({ title: title("States by construction management floor under this rule"), height: 320, yaxis: { title: "States", range: [0, 40] }, margin: { l: 50, r: 10, t: 50, b: 40 }, showlegend: false }), CFG);
    };
    $("map-rule").addEventListener("change", drawMap);
    $("map-points").addEventListener("change", drawMap);
    const mtour = Tour({ host: $("map-host"), steps: RULES.length, show: (i) => { $("map-rule").value = RULES[i]; drawMap(); }, every: 5000, label: "counting rules", stopOn: ".chart" });
    $("map-rule").addEventListener("change", () => mtour.go(RULES.indexOf($("map-rule").value)));
    const stateCalc = () => {
      const G = +$("s-ge").value, cap = +$("s-cap").value, bus = $("s-bus").checked;
      const floor = 50 + (bus ? 0 : 9) + Math.max(G - cap, 0);
      $("state-result").innerHTML = `Construction management floor: <b>${floor} credits</b> ${floor <= 90 ? '<span class="ok">at or below 90</span>' : '<span class="no">above 90</span>'} (50 construction + ${bus ? 0 : 9} business outside general education + ${Math.max(G - cap, 0)} general education). Civil engineering, for comparison: 75 credits of mathematics, science and engineering plus the general education that mathematics and science cannot fill, 87 to 93 in every state.`;
    };
    ["s-ge", "s-cap", "s-bus"].forEach((id) => $(id).addEventListener("input", stateCalc));
    stateCalc();
    table($("state-table"), ["State", "General education minimum", "Floor today", "Business foundations count", "Any 12 major credits", "Construction management programs", "Policy status"],
      S.slice().sort((a, b) => a.floor_cm - b.floor_cm || a.state.localeCompare(b.state)).map((s) => ({ hit: s.floor_cm <= 90, cells: [s.state, s.gen_ed == null ? "none (30 assumed)" : num(s.gen_ed), num(s.floor_cm), num(s.floor_cm_business), num(s.floor_cm_louisiana), num(s.programs), s.status] })), { num: [1, 2, 3, 4, 5] });
    trace("trace-states", `Module 15: ${res("15_curriculum_milp", "state_floors.csv")}, ${res("15_curriculum_milp", "national_cm_floor.csv")}; Module 24: ${res("24_gen_ed_overlap", "state_floors_business_counted.csv")}; manuscript Figure 3b.`);
  }

  // ================================================================ sources and checks
  async function sources() {
    const [h, F, O, A, H, Y, FI, R] = await Promise.all([load("headline"), load("floors"), load("overlap"), load("atlas"), load("hero"), load("system"), load("files"), load("sources")]);
    const checks = [];
    const add = (label, computed, published, tol = 0) => { if (published == null || computed == null) return; checks.push({ label, computed, published, ok: Math.abs(computed - published) <= tol }); };
    const P = toObjects(F.programs, F.columns);
    [["CM", "cm"], ["Civil", "cv"]].forEach(([f, tag]) => ["FLOOR", "KEEP"].forEach((design) => [36, 30, 24].forEach((ge) => [["typical", "typ"], ["minimum", "min"]].forEach(([st, stg]) => {
      const rows = P.filter((r) => r.field === f && r.design === design && r.gen_ed === ge && r.structure === st && r.ready === true).map((r) => r.credits);
      const k = `${tag}_${design.toLowerCase()}_${ge}_${stg}`;
      add(`${f} ${design} ${ge} ${st}: programs`, rows.length, h.m15[k + "_n"]);
      add(`${f} ${design} ${ge} ${st}: lowest floor`, Math.min(...rows), h.m15[k + "_min"]);
      add(`${f} ${design} ${ge} ${st}: median floor`, median(rows), h.m15[k + "_med"]);
      add(`${f} ${design} ${ge} ${st}: highest floor`, Math.max(...rows), h.m15[k + "_max"]);
      add(`${f} ${design} ${ge} ${st}: programs at or below 90`, rows.filter((x) => x <= 90).length, h.m15[k + "_le90"]);
    }))));
    const S = toObjects(F.states, F.state_columns);
    add("States at or below 90, today", S.filter((s) => s.floor_cm <= 90).length, h.m15.states_cm_floor_le90);
    add("States at or below 90, business foundations count", S.filter((s) => s.floor_cm_business <= 90).length, h.m24.states_cm_floor_le90_business);
    add("States at or below 90, any 12 major credits", S.filter((s) => s.floor_cm_louisiana <= 90).length, h.m24.states_cm_floor_le90_louisiana);
    const L = toObjects(O.ledger, O.ledger_columns);
    add("Median overlap, construction management", median(L.filter((r) => r.field === "CM").map((r) => r.from_required)), h.m24.cm_overlap_med, .5);
    add("Median overlap, civil", median(L.filter((r) => r.field === "Civil").map((r) => r.from_required)), h.m24.cv_overlap_med, .5);
    add("FGCU construction: general education from required courses", (L.find((r) => r.unitid === 433660 && r.field === "CM") || {}).from_required, h.m24.fgcu_cm_from_required_total);
    const lev = O.lever.map((r) => ({ unitid: r[0], field: r[1], ge: r[2], regime: r[3], credits: r[4] }));
    add("Construction programs at or below 90 if business foundations count", lev.filter((l) => l.field === "construction management" && l.ge === 36 && l.regime === "business foundations count" && l.credits <= 90).length, h.m24.lever_cm_36_bus_le90);
    const progs = H.programs.map((r) => ({ unitid: r[0], field: r[2] }));
    H.stages.filter((s) => s.key.startsWith("story:")).forEach((s) => {
      const st = A.stories.find((x) => x.story === s.title);
      if (!st) return;
      add(`Story “${s.title}”: construction programs at 90`, progs.reduce((n, p, i) => n + (p.field === "CM" && s.credits[i] != null && s.credits[i] <= 90 ? 1 : 0), 0), st.cm_reach_90);
      add(`Story “${s.title}”: civil programs at 90`, progs.reduce((n, p, i) => n + (p.field === "Civil" && s.credits[i] != null && s.credits[i] <= 90 ? 1 : 0), 0), st.cv_reach_90);
      add(`Story “${s.title}”: FGCU construction credits`, s.credits[progs.findIndex((p) => p.unitid === 433660 && p.field === "CM")], st.fgcu_cm_credits);
      const cell = toObjects(A.cells, A.cells_columns).find((c) => c.field === "CM" && c.state === String(st.state) && c.state_rec === (st.state_rec ? 1 : 0) && c.accreditor === st.accreditor && c.merge === st.merge && c.ai === st.ai && c.ai_literacy === st.ai_literacy);
      if (cell) add(`Story “${s.title}”: atlas cell count`, cell.reach_90, st.cm_reach_90);
    });
    const B = toObjects(Y.bands, Y.bands_columns);
    Object.entries({ "United States|construction": "us_construction", "Florida|construction": "fl_construction", "United States|civil": "us_civil", "Florida|civil": "fl_civil" }).forEach(([k, sk]) => {
      const [region, field] = k.split("|");
      const r = B.find((x) => x.region === region && x.field === field && x.series === "adopt" && x.year === 2035);
      if (r) add(`Adoption in 2035, ${k.replace("|", ", ")}`, r.p50, Y.summary[sk].adoption_2035.median, 1e-6);
    });
    const ok = checks.filter((c) => c.ok).length;
    $("check-result").innerHTML = `<span class="${ok === checks.length ? "ok" : "no"}">${ok} of ${checks.length} published numbers reproduced from the row-level files</span> (floors by design, general education total and area structure; state counts; overlap medians; the twelve stories against the per-program solves and the atlas cells; adoption in 2035 against the yearly bands).`;
    table($("check-table"), ["Number", "Recomputed here", "Written by the module", "Agree"], checks.map((c) => ({ hit: c.ok, cells: [c.label, num(c.computed, 3), num(c.published, 3), c.ok ? "yes" : "no"] })), { num: [1, 2] });
    $("built").textContent = h.built;
    $("files-json").innerHTML = FI.data_files.map((f) => `<li>${link("data/" + f + ".json")}</li>`).join("");
    const byMod = {};
    FI.files.forEach((f) => (byMod[f.module] = byMod[f.module] || []).push(f));
    $("files-results").innerHTML = Object.entries(byMod).map(([m, fs]) => `<li><b>${m}</b>: ${fs.map((f) => link(f.path, `${f.file} (${(f.bytes / 1024).toFixed(0)} KB)`)).join(", ")}</li>`).join("");
    $("refs-note").textContent = `${R.references.length} references cited in the study. ${R.note}`;
    const drawRefs = () => {
      const g = $("ref-group").value;
      $("refs").innerHTML = R.references.filter((r) => !g || r.group === g).map((r) => `<li>${r.apa.replace(/https?:\/\/\S+/, "")}${r.url ? ` ${link(r.url, "link")}` : ""}<span class="small"> (${r.checks} check${r.checks === 1 ? "" : "s"})</span></li>`).join("");
    };
    $("ref-group").addEventListener("change", drawRefs);
    drawRefs();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#nav a").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); location.hash = a.dataset.view; }));
    show(location.hash.replace("#", "") || "overview");
  });
})();
