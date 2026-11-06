/* What 90 removes, AI, Strategies: the views added with the rebuilt paper (6 November 2026). */
window.Deep = (function () {
  const { load, $, esc, n, share, dec, median, table, plot } = window.U;
  const src = (e) => (e.cite ? (e.url ? ` <a class="cite" href="${esc(e.url)}" target="_blank" rel="noopener">(${esc(e.cite)})</a>` : ` <span class="cite">(${esc(e.cite)})</span>`) : "");
  const SOURCES = [["general education to the count", "general education cut to the binding count", "#EBCFE0", ""],
    ["general education taught inside the major", "general education taught inside major courses (overlap)", "#CC79A7", "/"],
    ["professional courses cut", "professional courses cut", "#0072B2", ""], ["free electives and orientation", "free electives and orientation", "#BFBFBF", ""],
    ["merges", "course pairs merged", "#9AD0EC", "."], ["tool courses folded", "tool courses folded", "#E69F00", ""]];
  const ORDERS = [["general education first", "general education first"], ["professional first", "professional courses first"]];
  const METHODS = [["redesign first", "merge and fold first"], ["cut only", "cut whole courses"]];
  const CODES = ["A", "B", "C", "D", "E"];

  /* ---------------------------------------------------------------- removes */
  async function removes() {
    const K = await load("skills");
    const N = K.names, BO = K.by_order, rng = K.general_education_share_range;
    const gef = BO["general education first"], prf = BO["professional first"];
    $("removes-lede").innerHTML = `Every program must find 30 hours to reach 90. Of the ${n(gef["redesign first"].total_hours)} hours the five programs read course by course would have to find, general education supplies <b>${share(rng.low)} to ${share(rng.high)}</b>, depending on whether professional courses or general education are cut first, and the standalone tool courses AI could take over supply <b>${n(gef["redesign first"].tool_hours)}</b>. No program reaches 90 without counting up to 12 hours of major courses toward general education. How a program cuts decides how much professional content survives: merging the course pairs peers already merge, and folding tool courses into the courses that use them, keeps hours that cutting whole courses removes.`;
    let order = "general education first", method = "redesign first";
    const chips = (id, opts, cur, on) => { $(id).innerHTML = opts.map(([v, l]) => `<span class="chip${v === cur ? " on" : ""}" data-v="${v}">${esc(l)}</span>`).join(""); $(id).querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { $(id).querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c)); on(c.dataset.v); })); };
    function draw() {
      const P = BO[order][method].programs;
      const ys = ["mean of the five", ...CODES.slice().reverse().map((c) => N[c].label)];
      const val = (c, kk) => (c === "mean" ? CODES.reduce((a, x) => a + (P[x][kk] || 0), 0) / 5 : P[c][kk] || 0);
      plot("rm-chart", SOURCES.map(([kk, lab, col, pat]) => ({ type: "bar", orientation: "h", name: lab, y: ys, x: ["mean", ...CODES.slice().reverse()].map((c) => val(c, kk)),
        marker: { color: col, line: { color: "#333", width: .5 }, pattern: pat ? { shape: pat, bgcolor: col, fgcolor: "rgba(40,40,40,.55)", size: 7, solidity: .18 } : undefined },
        text: ["mean", ...CODES.slice().reverse()].map((c) => { const v = val(c, kk); return v >= 2.4 ? (c === "mean" ? v.toFixed(1) : String(Math.round(v * 10) / 10)) : ""; }), textposition: "inside", insidetextanchor: "middle",
        hovertemplate: `%{y}<br>${lab}: %{x:.1f} h<extra></extra>` })),
        { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.34, font: { size: 11 } }, margin: { l: 150, r: 14, t: 6, b: 96 }, xaxis: { range: [0, 30.5], title: { text: "semester hours to reach exactly 90", standoff: 6 } } });
      const b = BO[order][method];
      $("rm-note").innerHTML = `${esc(ORDERS.find((o) => o[0] === order)[1])}, ${esc(METHODS.find((m) => m[0] === method)[1])}: general education ${share(b.general_education_share)} of ${n(b.total_hours)} hours, professional courses ${share(b.professional_share)}, tool courses ${n(b.tool_hours)} hours.`;
    }
    chips("rm-order", ORDERS, order, (v) => { order = v; draw(); });
    chips("rm-method", METHODS, method, (v) => { method = v; draw(); });
    draw();
    const cols = [["general education first", "redesign first"], ["general education first", "cut only"], ["professional first", "redesign first"], ["professional first", "cut only"]];
    $("rm-grid").innerHTML = `<thead><tr><th rowspan="2">Program</th><th colspan="2" class="c">general education cut first</th><th colspan="2" class="c">professional courses cut first</th></tr><tr><th class="n">merge and fold first</th><th class="n">cut whole courses</th><th class="n">merge and fold first</th><th class="n">cut whole courses</th></tr></thead><tbody>` +
      CODES.map((c) => `<tr><td>${esc(N[c].label)}</td>${cols.map(([o, v]) => `<td class="n">${n(BO[o][v].professional_hours[c], 1)}</td>`).join("")}</tr>`).join("") + "</tbody>";
    $("rm-grid-note").textContent = `Merging and folding first saves ${CODES.filter((c) => gef.redesign_saves[c] > 0).map((c) => `${n(gef.redesign_saves[c], 1)} h at ${N[c].short}`).join(", ")} with general education cut first. Northern Arizona has no course pair to merge and no standalone tool course; at UT Knoxville construction stands ${n(K.construction_above_floor.A)} hour above ACCE’s floor, so no merge can save an hour.`;
    $("rm-gened").innerHTML = `<thead><tr><th>Program</th><th class="n">Standalone (h)</th><th class="n">Leaves or moves (h)</th></tr></thead><tbody>` +
      CODES.map((c) => { const lo = prf["redesign first"].general_education_hours[c], hi = gef["redesign first"].general_education_hours[c]; return `<tr><td>${esc(N[c].label)}</td><td class="n">${n(K.gen_ed_course_hours[c], 1)}</td><td class="n">${lo === hi ? n(lo, 1) : `${n(lo, 1)} to ${n(hi, 1)}`}</td></tr>`; }).join("") + "</tbody>";
    $("rm-gened-note").textContent = "The range runs from professional courses cut first to general education cut first, both with merging and folding first. At UT Knoxville the regional accreditor’s 30 hours are largely met by mathematics, science and business courses the major already requires, so at most one of its nine general education courses survives as a standalone course.";
    let prog = "A", variant = "redesign first";
    const STEP = { S1: "1 electives out", S2: "2 merge", S3: "3 fold tool course", S4: "4 professional course cut", S5: "5 general education to the count", S6: "6 taught inside major courses", S7: "7 earth science" };
    function courses() {
      const M = K.moves.filter((m) => m[0] === prog && m[1] === variant);
      table("rm-courses", [{ key: "step", label: "Step" }, { key: "course", label: "Course" }, { key: "title", label: "Title" }, { key: "family", label: "Skill family" }, { key: "hours", label: "Hours", num: true, fmt: (v) => n(v, 1) }],
        M.map((m) => ({ step: STEP[m[2]] || m[2], course: m[5], title: m[6], family: m[4], hours: m[7] })));
    }
    chips("rm-prog", CODES.map((c) => [c, N[c].label]), prog, (v) => { prog = v; courses(); });
    chips("rm-var", METHODS, variant, (v) => { variant = v; courses(); });
    courses();
  }

  /* ---------------------------------------------------------------- ai */
  async function ai() {
    const [R, PA] = await Promise.all([load("routes"), load("paper")]);
    const A = R.ai_summary, X = PA.exposure, c = PA.ai_counts;
    const ex = (lab) => (X.find((e) => e.label === lab) || {}).cm_human_beta;
    $("ai-lede").innerHTML = `The common case for a shorter degree in the AI era runs from tasks to hours: machines do the procedural work, so students need fewer hours. The course lists do not support it. Standalone tool courses supply <b>${n(c.tool_hours)} of the ${n(c.total_hours)} hours</b> the five programs read course by course would have to find; accredited programs spend a median ${n(A.median_hours_accredited.digital_tool)} hours on digital tool operation against ${n(A.median_hours_accredited.judgment)} on professional judgment. The evidence on AI at work gives no reason to cut what remains, and one honest reason to count hours differently: if students reach the outcomes faster with well-designed tutoring, the outcomes should be assessed and the hours counted less.`;
    const T = [["technical", "technical foundations", "#BFBFBF"], ["judgment", "professional judgment", "#D4EBF2"], ["digital_tool", "digital tool operation", "#F4A582"], ["field_procedure", "field procedures", "#FDDBC7"], ["math_science", "mathematics and science", "#D9EAD3"], ["breadth", "communication and breadth", "#EAD1DC"], ["integrative", "capstone, work-integrated", "#FFF2CC"], ["other", "electives, other", "#FFFFFF"]];
    const grp = [["ACCE", ["ACCE", "ACCE and ABET"]], ["ABET ANSAC", ["ABET ANSAC", "ACCE and ABET"]], ["neither", ["neither", "ACCE applicant or candidate"]]];
    plot("ai-chart", T.map(([kk, lb, col]) => ({ type: "bar", orientation: "h", name: lb, y: grp.map((g) => g[0]), x: grp.map(([_, gs]) => median(R.ai_hours.filter((r) => gs.includes(r.accreditation_group)).map((r) => Number(r[kk])))),
      marker: { color: col, line: { color: "#333", width: .5 } }, hovertemplate: `%{y}<br>${lb}: %{x} hours (median)<extra></extra>` })),
      { barmode: "stack", showlegend: true, legend: { orientation: "h", y: -.35, font: { size: 10.5 } }, margin: { l: 90, r: 10, t: 6, b: 40 }, xaxis: { title: { text: "median hours of required courses, by content type" } } });
    const TT = { scheduling_estimating: "scheduling, estimating", documentation_writing: "documentation, writing", analysis_calculation: "analysis, calculation", communication_people: "communicating with people", other_management_planning: "managing, planning", field_supervision_physical: "field supervision" };
    const mix = R.task_mix.filter((r) => Number(r.share_importance_weighted) > 0);
    plot("task-chart", [["11-9021", "construction managers", "#E69F00"], ["13-1051", "cost estimators", "#8c510a"]].map(([soc, nm, col]) => { const M = mix.filter((r) => r.soc === soc);
      return { type: "bar", orientation: "h", name: nm, y: M.map((r) => TT[r.task_type] || r.task_type), x: M.map((r) => Number(r.share_importance_weighted)), marker: { color: col },
        text: M.map((r) => "AI exposure " + dec(r.human_beta)), textposition: "outside", hovertemplate: `${nm}<br>%{y}: %{x:.0%} of tasks; %{text}<extra></extra>` }; }),
      { barmode: "group", showlegend: true, legend: { orientation: "h", y: -.3, font: { size: 11 } }, margin: { l: 160, r: 70, t: 6, b: 40 }, xaxis: { tickformat: ".0%", range: [0, 1.05], title: { text: "share of the occupation’s tasks" } } });
    $("ai-note").innerHTML = `Exposure (human-rated, Eloundou et al., 2024) measures how much a language model could speed up a task, not whether the human skill becomes unnecessary: documentation and writing carries ${dec(ex("digital tool operation"))} for construction managers and is also the work whose output a graduate most often has to check; communicating with people carries ${dec(ex("communication and breadth"))} and field supervision ${dec(ex("field procedures"))}.`;
    $("ai-ev").innerHTML = PA.ai_evidence.map((e) => `<li>${esc(e.text)}${src(e)}</li>`).join("");
  }

  /* ---------------------------------------------------------------- strategies */
  async function strategies() {
    const PA = await load("paper");
    const S = PA.strategies;
    $("strat-lede").innerHTML = `The evidence supports five strategies, and their order matters. Institutions and regional accreditors should decide first whether general education can be counted inside co-taught major courses, because no program reaches 90 without it and counting without teaching only moves the loss. Programs should then merge and fold before they cut, and cut to 90 and no further. Transfer routes should be built as two plus one where general education does not bind. Every shortened degree should keep the skills AI does not supply. The first students offered a 90-credit degree should be those whose losses are smallest, with their formation after the degree arranged with employers rather than assumed.`;
    $("strat-table").innerHTML = `<thead><tr>${S.rows[0].map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${S.rows.slice(1).map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="strong"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  }
  return { removes, ai, strategies };
})();
